/**
 * k-mail-mcp OAuth 2.0 Provider (v1.4.0)
 *
 * "API key = 비밀번호" 패턴:
 *   - 단일 인스턴스, 단일 사용자
 *   - MCP_API_KEY 환경변수 값이 비밀번호 역할
 *   - Dynamic client registration 지원 (claude.ai custom connector 필수)
 *   - PKCE (S256) 지원
 *   - 인메모리 토큰 저장 (재시작 시 초기화 — 재로그인 필요)
 */

import crypto from "node:crypto";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일
const CODE_TTL_MS  =  5 * 60 * 1000;       // 5min

// ══════════════════════════════════════════════════════
// Clients Store — 동적 클라이언트 등록 (인메모리)
// ══════════════════════════════════════════════════════
export class InMemoryClientsStore {
  #clients = new Map();

  async getClient(clientId) {
    return this.#clients.get(clientId) ?? undefined;
  }

  async registerClient(metadata) {
    const clientId = crypto.randomUUID();
    const client = {
      ...metadata,
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
    this.#clients.set(clientId, client);
    console.error(`[oauth] 클라이언트 등록: ${clientId} (${metadata.client_name || "unnamed"})`);
    return client;
  }
}

// ══════════════════════════════════════════════════════
// OAuth Provider
// ══════════════════════════════════════════════════════
export class KMailOAuthProvider {
  #apiKey;
  #codes  = new Map(); // code → { clientId, codeChallenge, redirectUri, scopes, expiresAt }
  #tokens = new Map(); // token → { clientId, scopes, expiresAt }

  constructor(apiKey) {
    this.#apiKey = apiKey;
    this.clientsStore = new InMemoryClientsStore();

    // 만료된 코드/토큰 정리 (30분마다)
    setInterval(() => this.#cleanup(), 30 * 60 * 1000).unref();
  }

  #cleanup() {
    const now = Date.now();
    for (const [k, v] of this.#codes)  { if (v.expiresAt < now) this.#codes.delete(k); }
    for (const [k, v] of this.#tokens) { if (v.expiresAt < now) this.#tokens.delete(k); }
  }

  // ── OAuthServerProvider 구현 ──────────────────────────

  /**
   * GET /authorize 처리 — API 키 입력 폼 렌더링
   */
  async authorize(client, params, res) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(loginPage({
      clientName:    client.client_name || "MCP 클라이언트",
      redirectUri:   params.redirectUri,
      state:         params.state ?? "",
      codeChallenge: params.codeChallenge,
      clientId:      client.client_id,
    }));
  }

  /**
   * POST /oauth/submit-key 에서 호출 (폼 제출 처리)
   * 성공: auth code 생성 → redirect URI 반환
   * 실패: Error throw
   */
  async handleKeySubmit({ clientId, redirectUri, state, codeChallenge, providedKey }) {
    // [SECURITY] API 키 타이밍 공격 방지 — crypto.timingSafeEqual 사용
    if (this.#apiKey) {
      const expected = Buffer.alloc(64); // 고정 64바이트 — UUID/토큰 길이 충분
      const provided = Buffer.alloc(64);
      Buffer.from(this.#apiKey, "utf-8").copy(expected);
      Buffer.from(String(providedKey ?? ""), "utf-8").copy(provided);
      if (!crypto.timingSafeEqual(expected, provided)) {
        throw new Error("잘못된 API 키입니다.");
      }
    }
    if (!codeChallenge) {
      throw new Error("code_challenge 누락 — PKCE 필수");
    }

    const client = await this.clientsStore.getClient(clientId);
    if (!client) throw new Error("등록되지 않은 클라이언트");

    // [SECURITY] Open Redirect 방지 — redirect_uri를 등록된 URI 목록에서 재검증
    // GET /authorize의 SDK 검증을 우회한 직접 POST 공격 차단
    if (!Array.isArray(client.redirect_uris) || !client.redirect_uris.includes(redirectUri)) {
      throw new Error("등록되지 않은 redirect_uri");
    }

    const code = crypto.randomUUID();
    this.#codes.set(code, {
      clientId,
      codeChallenge,
      redirectUri,
      scopes:    [],
      expiresAt: Date.now() + CODE_TTL_MS,
    });

    const target = new URL(redirectUri);
    target.searchParams.set("code", code);
    if (state) target.searchParams.set("state", state);
    return target.toString();
  }

  /**
   * SDK가 PKCE 검증 시 호출 — 저장된 codeChallenge 반환
   */
  async challengeForAuthorizationCode(client, authorizationCode) {
    const data = this.#codes.get(authorizationCode);
    if (!data || data.expiresAt < Date.now()) {
      throw new Error("유효하지 않거나 만료된 인증 코드");
    }
    return data.codeChallenge;
  }

  /**
   * 인증 코드 → 액세스 토큰 교환
   */
  async exchangeAuthorizationCode(client, authorizationCode, _codeVerifier) {
    const data = this.#codes.get(authorizationCode);
    if (!data || data.expiresAt < Date.now()) {
      throw new Error("유효하지 않거나 만료된 인증 코드");
    }
    if (data.clientId !== client.client_id) {
      throw new Error("인증 코드가 이 클라이언트에 발급되지 않았습니다");
    }

    this.#codes.delete(authorizationCode);

    const token = crypto.randomUUID();
    this.#tokens.set(token, {
      clientId:  client.client_id,
      scopes:    data.scopes || [],
      expiresAt: Date.now() + TOKEN_TTL_MS,
    });
    console.error(`[oauth] 토큰 발급: client=${client.client_id}`);

    return {
      access_token: token,
      token_type:   "bearer",
      expires_in:   Math.floor(TOKEN_TTL_MS / 1000),
    };
  }

  /**
   * Refresh token 미지원 — 만료 시 재인증 필요
   */
  async exchangeRefreshToken(_client, _refreshToken) {
    throw new Error("refresh_token 미지원 — 토큰 만료 시 재로그인 필요");
  }

  /**
   * Bearer 토큰 검증 (requireBearerAuth 미들웨어에서 호출)
   */
  async verifyAccessToken(token) {
    const data = this.#tokens.get(token);
    if (!data || data.expiresAt < Date.now()) {
      throw new Error("유효하지 않거나 만료된 토큰");
    }
    return {
      token,
      clientId:  data.clientId,
      scopes:    data.scopes,
      expiresAt: Math.floor(data.expiresAt / 1000),
    };
  }

  /**
   * 토큰 폐기
   */
  async revokeToken(_client, { token }) {
    this.#tokens.delete(token);
  }
}

// ══════════════════════════════════════════════════════
// HTML 페이지
// ══════════════════════════════════════════════════════
function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function loginPage({ clientName, redirectUri, state, codeChallenge, clientId }) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>k-mail-mcp 연결</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif;
      background: #f0f2f5;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 44px 40px;
      width: 380px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.10);
    }
    .icon { font-size: 36px; margin-bottom: 12px; }
    h1 { font-size: 22px; font-weight: 700; color: #111; margin-bottom: 6px; }
    .subtitle { font-size: 14px; color: #555; margin-bottom: 32px; line-height: 1.5; }
    .app-name { color: #0070f3; font-weight: 600; }
    label {
      display: block;
      font-size: 13px; font-weight: 600; color: #333;
      margin-bottom: 8px;
    }
    input[type="password"] {
      width: 100%;
      padding: 12px 14px;
      border: 1.5px solid #ddd;
      border-radius: 10px;
      font-size: 15px;
      outline: none;
      transition: border-color .15s, box-shadow .15s;
    }
    input[type="password"]:focus {
      border-color: #0070f3;
      box-shadow: 0 0 0 3px rgba(0,112,243,0.15);
    }
    button[type="submit"] {
      width: 100%;
      padding: 13px;
      background: #0070f3;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 15px; font-weight: 700;
      cursor: pointer;
      margin-top: 18px;
      transition: background .15s, transform .1s;
    }
    button[type="submit"]:hover  { background: #0060df; }
    button[type="submit"]:active { transform: scale(0.98); }
    .note {
      font-size: 12px; color: #888;
      margin-top: 16px; text-align: center; line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📧</div>
    <h1>k-mail-mcp 연결</h1>
    <p class="subtitle">
      <span class="app-name">${escHtml(clientName)}</span>이(가)<br>
      이 메일 서버에 접근을 요청합니다.
    </p>
    <form method="POST" action="/oauth/submit-key">
      <input type="hidden" name="redirect_uri"    value="${escHtml(redirectUri)}">
      <input type="hidden" name="state"            value="${escHtml(state)}">
      <input type="hidden" name="code_challenge"   value="${escHtml(codeChallenge)}">
      <input type="hidden" name="client_id"        value="${escHtml(clientId)}">
      <label for="api_key">API 키</label>
      <input
        type="password"
        id="api_key"
        name="api_key"
        placeholder="API 키를 입력하세요"
        autofocus
        required
        autocomplete="current-password"
      >
      <button type="submit">연결 허용</button>
    </form>
    <p class="note">이 연결은 30일간 유효합니다.<br>API 키는 서버에 저장되지 않습니다.</p>
  </div>
</body>
</html>`;
}

export function errorPage(message) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>연결 오류 — k-mail-mcp</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f0f2f5;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #fff; border-radius: 16px; padding: 44px 40px;
      width: 380px; box-shadow: 0 4px 32px rgba(0,0,0,0.10); text-align: center;
    }
    .icon { font-size: 36px; margin-bottom: 12px; }
    h1 { font-size: 20px; font-weight: 700; color: #111; margin-bottom: 10px; }
    p { font-size: 14px; color: #555; margin-bottom: 24px; line-height: 1.5; }
    a {
      display: inline-block; padding: 11px 28px;
      background: #0070f3; color: #fff; border-radius: 8px;
      text-decoration: none; font-weight: 600; font-size: 14px;
    }
    a:hover { background: #0060df; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>연결 실패</h1>
    <p>${escHtml(message)}</p>
    <a href="javascript:history.back()">다시 시도</a>
  </div>
</body>
</html>`;
}
