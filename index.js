/**
 * Korean Mail MCP Server v1.2.0
 *
 * 지원: 네이버 / 다음 / Gmail / 네이트 / Yahoo / iCloud
 * 스팸 탐지 4단계:
 *   1) 패턴 매칭 (regex)
 *   2) DNSBL (Spamhaus DBL — 도메인 평판)
 *   3) SPF / DKIM / DMARC 헤더 인증
 *   4) Claude Haiku AI 판단 (경계 구간만)
 *
 * v1.2.0 변경사항:
 *   - check_new_mails 반환 필드 추가: from_domain, reply_to, reply_to_differs,
 *     has_tracking_pixel, korean_spam_signals
 *   - read_email max_chars 파라미터 추가 (기본 5000, -1이면 전체)
 *   - check_new_mails description 신규 필드 안내 추가
 */

import { McpServer }            from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z }                    from "zod";
import Imap                     from "imap";
import { simpleParser }         from "mailparser";
import crypto                   from "crypto";
import dns                      from "dns";
import fs                       from "fs";
import path                     from "path";
import { fileURLToPath }        from "url";

const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const ACCOUNTS_FILE  = path.join(__dirname, "accounts.enc.json");
const KEY_FILE       = path.join(__dirname, ".master.key");
const META_FILE      = path.join(__dirname, ".instance.json");
const LAST_RUN_FILE  = path.join(__dirname, "last_run.json");
const SETTINGS_FILE  = path.join(__dirname, "settings.enc.json");

// ══════════════════════════════════════════════════════
//  인스턴스 / 키 / 계정
// ══════════════════════════════════════════════════════
function getInstanceId() {
  if (!fs.existsSync(META_FILE)) return "unknown";
  try { return JSON.parse(fs.readFileSync(META_FILE, "utf-8")).instanceId; }
  catch { return "unknown"; }
}

function loadKeyBuf() {
  if (!fs.existsSync(KEY_FILE))
    throw new Error("마스터 키(.master.key) 없음 — setup.bat(Windows) 또는 ./setup.sh(macOS) 먼저 실행");
  return Buffer.from(fs.readFileSync(KEY_FILE, "utf-8").trim(), "hex");
}

function decrypt(enc, keyBuf) {
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", keyBuf, Buffer.from(enc.iv, "hex"));
    d.setAuthTag(Buffer.from(enc.authTag, "hex"));
    return Buffer.concat([d.update(Buffer.from(enc.ciphertext, "hex")), d.final()]).toString("utf-8");
  } catch {
    throw new Error("복호화 실패");
  }
}


// ══════════════════════════════════════════════════════
//  API 키 로드 (settings.enc.json 우선, 없으면 env 폴백)
// ══════════════════════════════════════════════════════
function loadApiKey() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const keyBuf  = loadKeyBuf();
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      if (settings.encApiKey) {
        return decrypt(settings.encApiKey, keyBuf).trim();
      }
    }
  } catch {}
  return process.env.ANTHROPIC_API_KEY || "";
}

function loadAccounts() {
  if (!fs.existsSync(ACCOUNTS_FILE)) return [];
  const keyBuf = loadKeyBuf();
  return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8")).map((a) => ({
    id: a.id, service: a.service, label: a.label,
    user: decrypt(a.encUser, keyBuf).trim(),
    pass: decrypt(a.encPass, keyBuf).replace(/\s+/g, ""),
  }));
}

// ══════════════════════════════════════════════════════
//  last_run
// ══════════════════════════════════════════════════════
function loadLastRun()     { try { return JSON.parse(fs.readFileSync(LAST_RUN_FILE, "utf-8")); } catch { return {}; } }
function saveLastRun(data) { fs.writeFileSync(LAST_RUN_FILE, JSON.stringify(data, null, 2)); }

function getLastRunFor(id) {
  const d = loadLastRun()[id];
  if (d) return new Date(d);
  const t = new Date(); t.setDate(t.getDate() - 7); return t;
}

function updateLastRunFor(id, ts = new Date()) {
  const d = loadLastRun(); d[id] = ts.toISOString(); saveLastRun(d);
}

// ══════════════════════════════════════════════════════
//  IMAP 프리셋
// ══════════════════════════════════════════════════════
const PRESETS = {
  naver:  { host: "imap.naver.com",      port: 993, tls: true },
  daum:   { host: "imap.daum.net",       port: 993, tls: true },
  gmail:  { host: "imap.gmail.com",      port: 993, tls: true },
  nate:   { host: "imap.nate.com",       port: 993, tls: true },
  yahoo:  { host: "imap.mail.yahoo.com", port: 993, tls: true },
  icloud: { host: "imap.mail.me.com",    port: 993, tls: true },
};
const DAUM_INBOX_CANDIDATES = ["INBOX", "받은메일함", "전체메일"];

function makeImap(account) {
  const p = PRESETS[account.service] || PRESETS.naver;
  return new Imap({
    user: account.user, password: account.pass,
    host: p.host, port: p.port, tls: p.tls,
    tlsOptions: { rejectUnauthorized: false },
    connTimeout: 30000, authTimeout: 15000,
  });
}

function imapConnect(imap) {
  return new Promise((res, rej) => {
    const onReady = () => { imap.removeListener("error", onErr); res(); };
    const onErr   = (e) => { imap.removeListener("ready", onReady); rej(e); };
    imap.once("ready", onReady);
    imap.once("error", onErr);
    imap.connect();
  });
}
function openBox(imap, name) {
  return new Promise((res, rej) => imap.openBox(name, true, (e, b) => e ? rej(e) : res(b)));
}
function listBoxes(imap) {
  return new Promise((res, rej) => imap.getBoxes((e, b) => e ? rej(e) : res(Object.keys(b))));
}
function searchImap(imap, criteria) {
  return new Promise((res, rej) => imap.search(criteria, (e, u) => e ? rej(e) : res(u || [])));
}

// ══════════════════════════════════════════════════════
//  Fetch
// ══════════════════════════════════════════════════════
const HEADER_FIELDS = "HEADER.FIELDS (FROM SUBJECT DATE LIST-UNSUBSCRIBE MESSAGE-ID X-ORIGINAL-TO)";

function fetchHeadersAndSnippets(imap, seqnos) {
  return new Promise((res, rej) => {
    if (!seqnos.length) { res([]); return; }
    const bag = new Map();
    const f = imap.fetch(seqnos, { bodies: [""], struct: false });

    f.on("message", (msg, seqno) => {
      const parts = {}; let attrs = {};
      msg.on("body", (stream, info) => {
        const chunks = [];
        stream.on("data", (c) => chunks.push(c));
        stream.on("end",  ()  => { parts[info.which] = Buffer.concat(chunks); });
      });
      msg.once("attributes", (a) => { attrs = a; });
      msg.once("end", () => bag.set(seqno, { parts, attrs }));
    });

    f.on("error", (e) => console.error("[FETCH warn]", e.message));

    f.once("end", async () => {
      try {
        const results = [];
        for (const [seqno, item] of bag) {
          try {
            const raw = item.parts[""] || Buffer.alloc(0);
            const m   = await simpleParser(raw);
            const textBody = m.text || (m.html ? m.html.replace(/<[^>]{0,500}>/g, " ") : "");
            const snippet  = textBody.replace(/\s+/g, " ").trim().substring(0, 400);
            results.push({
              seqno, m,
              flags:     item.attrs.flags || [],
              snippet,
              messageId: (m.messageId || "").replace(/[<>]/g, "").trim(),
            });
          } catch (e) { console.error("[msg parse]", seqno, e.message); }
        }
        res(results);
      } catch (e) { rej(e); }
    });
  });
}

function fetchFullBody(imap, uid) {
  return new Promise((res, rej) => {
    const chunks = [];
    const f = imap.fetch([uid], { bodies: "", struct: false });
    f.on("message", (msg) => msg.on("body", (s) => s.on("data", (c) => chunks.push(c))));
    f.once("error", (e) => rej(e));
    f.once("end", async () => {
      if (!chunks.length) { rej(new Error("메일을 찾을 수 없습니다")); return; }
      try { res(await simpleParser(Buffer.concat(chunks))); } catch (e) { rej(e); }
    });
  });
}

function toImapDate(d) {
  const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()}-${M[d.getMonth()]}-${d.getFullYear()}`;
}

function buildWebLink(service, messageId) {
  if (service === "gmail" && messageId)
    return `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(messageId)}`;
  const links = { naver:"https://mail.naver.com/", daum:"https://mail.daum.net/",
    nate:"https://mail.nate.com/", yahoo:"https://mail.yahoo.com/", icloud:"https://www.icloud.com/mail/" };
  return links[service] || null;
}

// ══════════════════════════════════════════════════════
//  카테고리 분류
// ══════════════════════════════════════════════════════
const CATEGORY_RULES = [
  { name: "🤖 AI/머신러닝",   test: (f,s)    => /openai|anthropic|gemini|claude|gpt|llm|ai |인공지능|머신러닝|딥러닝|hugging/i.test(f+s) },
  { name: "💻 개발/기술",     test: (f,s)    => /github|gitlab|npm|docker|kubernetes|aws|gcp|azure|bytebytego|devops|deploy|release|개발|엔지니어/i.test(f+s) },
  { name: "📰 뉴스/미디어",   test: (f,s,nl) => nl && /뉴스|news|daily|weekly|digest|newsletter|브리핑|roundup|techcrunch|mit tech/i.test(f+s) },
  { name: "💰 금융/결제",     test: (f,s)    => /입금|출금|결제|거래|카드|계좌|은행|증권|투자|주식|코인|환급|세금|보험/i.test(f+s) },
  { name: "🛒 쇼핑/이커머스", test: (f,s)    => /주문|배송|도착|쿠팡|네이버쇼핑|11번가|지마켓|올리브영|order|shipped|tracking|구매확인/i.test(f+s) },
  { name: "📣 광고/프로모션", test: (f,s)    => /할인|쿠폰|이벤트|특가|혜택|포인트|적립|sale|promotion|offer|한정|선착순/i.test(f+s) },
  { name: "💼 업무/비즈니스", test: (f,s)    => /invoice|견적|계약|미팅|회의|프로젝트|업무|협업|slack|notion|jira|zoom|meet/i.test(f+s) },
  { name: "🔐 보안/인증",     test: (f,s)    => /인증|로그인|비밀번호|보안|otp|verify|password|security|alert|unauthorized/i.test(f+s) },
  { name: "👥 소셜/커뮤니티", test: (f,s)    => /linkedin|facebook|instagram|twitter|youtube|카카오|라인|텔레그램|커뮤니티/i.test(f+s) },
];

function classifyEmail(from, subject, isNewsletter) {
  for (const r of CATEGORY_RULES) if (r.test(from, subject, isNewsletter)) return r.name;
  return isNewsletter ? "📰 뉴스/미디어" : "📂 기타";
}

// ══════════════════════════════════════════════════════
//  ① 패턴 기반 스팸 점수
// ══════════════════════════════════════════════════════
const SPAM_PATTERNS = [
  { re: /당첨|무료\s*증정|사은품|경품\s*당첨|축하.*당첨/i,      score: 40 },
  { re: /대출|신용\s*대출|급전|당일\s*대출|저금리.*대출/i,       score: 50 },
  { re: /비아그라|발기|남성\s*강화/i,                             score: 70 },
  { re: /선착순.*무료|무료.*체험.*신청/i,                          score: 35 },
  { re: /you.*won|claim.*prize|free.*gift/i,                      score: 45 },
  { re: /click.*here.*now|act.*now.*limited|urgent.*reply/i,      score: 40 },
  { re: /nigerian|inheritance.*million|wire.*transfer.*urgent/i,  score: 80 },
  { re: /계정.*정지|계정.*차단|비밀번호.*재설정.*요청.*발생/i,     score: 55 },
  { re: /account.*suspended.*verify|password.*reset.*required/i,  score: 55 },
  { re: /카드.*정보.*유출|개인정보.*유출.*확인/i,                  score: 60 },
];

// [v1.2.0] 한국어 스팸 시그널 키워드 목록 (개별 감지 반환용)
const KO_SPAM_SIGNAL_KEYWORDS = [
  '무료', '당첨', '대출', '이벤트 당첨', '긴급', '즉시',
  '클릭하세요', '지금 바로', '할인쿠폰', '사은품', '0원',
];

function calcPatternScore(from, subject, snippet) {
  let score = 0;
  const text = `${from} ${subject} ${snippet}`;
  for (const { re, score: s } of SPAM_PATTERNS) if (re.test(text)) score += s;
  if ((subject.match(/[!！★◆●▶♠♣]/g) || []).length > 2) score += 20;
  if (/no-?reply|noreply/i.test(from) && /할인|쿠폰|이벤트|무료|당첨/i.test(subject)) score += 25;
  return Math.min(score, 100);
}

// ══════════════════════════════════════════════════════
//  ② DNSBL — Spamhaus DBL
// ══════════════════════════════════════════════════════
const dnsblCache = new Map();

function extractSenderDomain(from) {
  const m = from.match(/@([\w.-]+)/);
  return m ? m[1].toLowerCase().replace(/[^\w.-]/g, "") : "";
}

async function checkDNSBL(domain) {
  if (!domain || domain.length > 100 || !domain.includes(".")) return 0;
  if (dnsblCache.has(domain)) return dnsblCache.get(domain);

  const lookup = (host) => new Promise((res) => {
    const timer = setTimeout(() => res([]), 3000);
    dns.resolve4(host, (err, addrs) => {
      clearTimeout(timer);
      res(err ? [] : (addrs || []));
    });
  });

  const dblAddrs = await lookup(`${domain}.dbl.spamhaus.org`);
  const onDBL = dblAddrs.some(a => /^127\.0\.1\.[2-9]$/.test(a));

  const score = onDBL ? 60 : 0;
  dnsblCache.set(domain, score);
  return score;
}

// ══════════════════════════════════════════════════════
//  ③ SPF / DKIM / DMARC 헤더 인증
// ══════════════════════════════════════════════════════
function parseAuthResults(m) {
  let raw = m.headers?.get("authentication-results") || "";
  if (Array.isArray(raw)) raw = raw[0] || "";
  const h = (typeof raw === "object" ? raw.value || raw.text || "" : String(raw)).toLowerCase();

  const get = (key) => {
    const m = h.match(new RegExp(`\\b${key}=(pass|fail|softfail|none|neutral|temperror|permerror|bestguesspass)\\b`));
    return m ? m[1] : null;
  };

  return {
    spf:   get("spf"),
    dkim:  get("dkim"),
    dmarc: get("dmarc"),
  };
}

function calcAuthScore(auth) {
  let score = 0;
  if (auth.spf === "fail")          score += 35;
  else if (auth.spf === "softfail") score += 15;
  if (auth.dkim === "fail")         score += 30;
  if (auth.dmarc === "fail")        score += 25;
  return Math.min(score, 70);
}

function authLabel(auth) {
  const parts = [];
  if (auth.spf)   parts.push(`SPF:${auth.spf}`);
  if (auth.dkim)  parts.push(`DKIM:${auth.dkim}`);
  if (auth.dmarc) parts.push(`DMARC:${auth.dmarc}`);
  return parts.join(" | ") || "인증정보없음";
}

// ══════════════════════════════════════════════════════
//  ④ Claude Haiku AI 스팸 판단 (경계 구간만)
// ══════════════════════════════════════════════════════
async function claudeHaikuJudge(from, subject, snippet) {
  const apiKey = loadApiKey();
  if (apiKey.length <= 10) return null;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 120,
        system: "You are an email spam classifier. Respond with JSON only, no markdown, no extra text.",
        messages: [{
          role: "user",
          content: `이 이메일이 스팸/피싱인지 판단해줘.
JSON으로만 응답: {"isSpam": true/false, "confidence": 0-100, "reason": "한줄이유"}

발신: ${from}
제목: ${subject}
내용 미리보기: ${snippet.substring(0, 250)}`,
        }],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = (data.content?.[0]?.text || "").trim();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════
//  통합 스팸 점수 계산
// ══════════════════════════════════════════════════════
function buildSpamSignals(patternScore, authScore, dnsblScore, aiResult) {
  return {
    pattern: patternScore,
    auth:    authScore,
    dnsbl:   dnsblScore,
    ai:      aiResult ? {
      isSpam:     aiResult.isSpam,
      confidence: aiResult.confidence,
      reason:     aiResult.reason,
    } : null,
  };
}

function calcFinalSpamScore(patternScore, authScore, dnsblScore, aiResult) {
  let score = Math.min(patternScore + authScore + dnsblScore, 100);

  if (aiResult) {
    if (aiResult.isSpam && aiResult.confidence > 60) {
      score = Math.min(score + Math.round(aiResult.confidence * 0.25), 100);
    } else if (!aiResult.isSpam && aiResult.confidence > 70) {
      score = Math.max(score - 20, 0);
    }
  }

  return score;
}

// ══════════════════════════════════════════════════════
//  단일 계정 메일 수집
// ══════════════════════════════════════════════════════
const MAX_FETCH = 50;

async function collectNewMails(account, sinceTime) {
  const result = {
    accountId: account.id, accountLabel: account.label,
    service: account.service, mailbox: null, mails: [], error: null,
  };

  const imap = makeImap(account);
  try {
    await imapConnect(imap);

    let mailboxName = "INBOX";
    if (account.service === "daum") {
      const boxes = await listBoxes(imap);
      for (const c of DAUM_INBOX_CANDIDATES)
        if (boxes.includes(c)) { mailboxName = c; break; }
    }
    result.mailbox = mailboxName;
    await openBox(imap, mailboxName);

    const seqnos = (
      await searchImap(imap, ["UNSEEN", ["SINCE", toImapDate(sinceTime)]])
    ).slice(-MAX_FETCH);

    if (!seqnos.length) return result;

    const items = await fetchHeadersAndSnippets(imap, seqnos);

    // ── 1단계: 기본 필드 추출 (동기) ─────────────────
    const mailData = items.map(({ seqno, m, flags, snippet, messageId }) => {
      const mailDate = m.date ? new Date(m.date) : null;
      if (mailDate && mailDate <= sinceTime) return null;
      if (flags.includes("\\Seen")) return null;

      const from         = m.from?.text || "";
      const subject      = m.subject   || "(제목 없음)";
      const isNewsletter = !!(m.headers?.get("list-unsubscribe"));
      const originalTo   = m.headers?.get("x-original-to")?.[0] || "";
      const isEnglish    = snippet.length > 20 &&
        (snippet.match(/[a-zA-Z]/g) || []).length / snippet.length > 0.6;

      const auth         = parseAuthResults(m);
      const patternScore = calcPatternScore(from, subject, snippet);
      const authScore    = calcAuthScore(auth);
      const domain       = extractSenderDomain(from);

      // [v1.2.0] reply-to 추출 및 발신자 도용 감지
      const replyToAddr    = m.replyTo?.value?.[0]?.address || "";
      const replyToDomain  = replyToAddr ? replyToAddr.split("@")[1]?.toLowerCase() : "";
      const replyToDiffers = !!(replyToAddr && replyToDomain && replyToDomain !== domain);

      // [v1.2.0] 트래킹 픽셀 감지 (1x1 이미지)
      const htmlBody = m.html || "";
      const hasTrackingPixel =
        /width=["']?1["']?[^>]*height=["']?1["']?/i.test(htmlBody) ||
        /height=["']?1["']?[^>]*width=["']?1["']?/i.test(htmlBody);

      // [v1.2.0] 한국어 스팸 시그널 — 매칭된 키워드 목록 반환
      const koreanSpamSignals = KO_SPAM_SIGNAL_KEYWORDS.filter(kw =>
        subject.includes(kw) || snippet.slice(0, 300).includes(kw)
      );

      return {
        seqno, mailDate, from, subject, snippet, messageId,
        isNewsletter, originalTo, isEnglish, auth, patternScore, authScore, domain,
        // v1.2.0 추가 필드
        replyTo: replyToAddr, replyToDiffers, hasTrackingPixel, koreanSpamSignals,
      };
    }).filter(Boolean);

    // ── 2단계: DNSBL 병렬 조회 ───────────────────────
    const dnsblResults = await Promise.all(
      mailData.map(d => checkDNSBL(d.domain))
    );

    // ── 3단계: pre-AI 점수 계산 → 경계구간 식별 ──────
    const preScores = mailData.map((d, i) =>
      Math.min(d.patternScore + d.authScore + dnsblResults[i], 100)
    );

    // ── 4단계: Claude Haiku 병렬 호출 (경계구간만) ───
    const haikuResults = await Promise.all(
      mailData.map((d, i) => {
        const pre = preScores[i];
        return (pre >= 15 && pre < 75)
          ? claudeHaikuJudge(d.from, d.subject, d.snippet)
          : Promise.resolve(null);
      })
    );

    // ── 5단계: 최종 점수 합산 → 결과 저장 ───────────
    for (let i = 0; i < mailData.length; i++) {
      const d          = mailData[i];
      const dnsblScore = dnsblResults[i];
      const aiResult   = haikuResults[i];

      const spamScore  = calcFinalSpamScore(d.patternScore, d.authScore, dnsblScore, aiResult);
      const signals    = buildSpamSignals(d.patternScore, d.authScore, dnsblScore, aiResult);

      result.mails.push({
        uid:         d.seqno,
        from:        d.from,
        subject:     d.subject,
        date:        d.mailDate?.toISOString() || "",
        snippet:     d.snippet,
        isEnglish:   d.isEnglish,
        aiCategory:  classifyEmail(d.from, d.subject, d.isNewsletter),
        mailRef:     mailboxName + (d.originalTo ? ` → ${d.originalTo}` : ""),
        isNewsletter: d.isNewsletter,
        webLink:     buildWebLink(account.service, d.messageId),
        spamScore,
        isSpam:      spamScore >= 70,
        spamSignals: signals,
        authLabel:   authLabel(d.auth),
        // [v1.2.0] 신규 필드
        from_domain:          d.domain,
        reply_to:             d.replyTo,
        reply_to_differs:     d.replyToDiffers,
        has_tracking_pixel:   d.hasTrackingPixel,
        korean_spam_signals:  d.koreanSpamSignals,
      });
    }

    result.mails.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
  } catch (e) {
    result.error = e.message;
  } finally {
    try { imap.end(); } catch {}
  }

  return result;
}

// ══════════════════════════════════════════════════════
//  MCP 서버
// ══════════════════════════════════════════════════════
const server = new McpServer({ name: "korean-mail-mcp", version: "1.2.0" });

// ── Tool 1: 계정 목록 ─────────────────────────────────
server.tool(
  "list_accounts",
  "등록된 메일 계정 목록을 반환합니다. (비밀번호 미포함)",
  {},
  async () => {
    const keyBuf     = loadKeyBuf();
    const raw        = fs.existsSync(ACCOUNTS_FILE)
      ? JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8")) : [];
    const lastRuns   = loadLastRun();
    const instanceId = getInstanceId();

    const accounts = raw.map((a) => {
      let userDisplay = "(복호화 실패)";
      try { userDisplay = decrypt(a.encUser, keyBuf); } catch {}
      return { id: a.id, service: a.service, label: a.label,
        user: userDisplay, lastRun: lastRuns[a.id] || null, updatedAt: a.updatedAt || null };
    });

    return { content: [{ type: "text",
      text: JSON.stringify({ instanceId: instanceId.slice(0,8)+"...", accounts,
        haikuEnabled: loadApiKey().length > 10 }) }] };
  }
);

// ── Tool 2: 새 메일 수집 ──────────────────────────────
server.tool(
  "check_new_mails",
  [
    "[K-Mail-MCP 전용] 등록된 전체 메일 계정(네이버/다음/Gmail/네이트/Yahoo/iCloud)에서 마지막 확인 이후 읽지 않은 메일을 수집합니다. 새 메일 확인 요청 시 반드시 이 도구를 사용하세요.",
    "각 메일에는 account, service, snippet, isEnglish, aiCategory, webLink, spamScore(0~100), isSpam(70이상), spamSignals(패턴/DNSBL/인증/AI 신호 상세), authLabel(SPF/DKIM/DMARC 결과) 필드가 포함됩니다.",
    "v1.2.0 추가 필드: from_domain(발신 도메인), reply_to(회신 주소), reply_to_differs(발신≠회신이면 true — 피싱 주의), has_tracking_pixel(트래킹 픽셀 감지), korean_spam_signals(감지된 한국어 스팸 키워드 목록).",
    "reply_to_differs=true인 메일은 반드시 ⚠️ 표시하세요. korean_spam_signals가 비어있지 않으면 해당 키워드를 함께 표시하세요.",
    "",
    "반드시 아래 형식으로 출력하세요:",
    "1) 📋 오늘의 메일 요약 — 총 N통, 카테고리별 건수, 긴급/중요 메일 핵심 1-2줄 요약",
    "2) 🔴 즉시 확인 필요 — 마감/보안/결제 관련 메일 강조",
    "3) 📧 전체 메일 목록 — 각 메일마다:",
    "   - [계정라벨] 발신자 — 제목 (날짜)",
    "   - 카테고리: aiCategory값 | authLabel(SPF/DKIM/DMARC 상태)",
    "   - 한줄 요약: snippet 기반 (영문이면 한국어로 번역)",
    "   - 🔗 링크: webLink",
    "4) ⚠️ 스팸 의심 (isSpam=true인 메일만, 없으면 섹션 생략)",
    "   - 각 스팸 메일: 발신자, 제목, spamSignals 요약, korean_spam_signals 목록",
    "5) 🔴 연결 오류 (errors 필드가 있을 때만)",
  ].join(" "),
  {
    account_label:   z.string().default("all"),
    override_since:  z.string().default(""),
    max_per_account: z.number().min(1).max(200).default(50),
  },
  async ({ account_label, override_since, max_per_account }) => {
    const allAccounts = loadAccounts();
    if (!allAccounts.length)
      return { content: [{ type: "text", text: JSON.stringify({ error: "계정 없음. setup.bat 실행 필요" }) }] };

    const targets = account_label === "all"
      ? allAccounts
      : allAccounts.filter(a => a.label === account_label || a.user === account_label);
    if (!targets.length)
      return { content: [{ type: "text", text: JSON.stringify({ error: `계정 '${account_label}' 없음` }) }] };

    const runAt = new Date();
    const settled = await Promise.allSettled(
      targets.map(acc => {
        const sinceTime = override_since ? new Date(override_since) : getLastRunFor(acc.id);
        return collectNewMails(acc, sinceTime).then(r => {
          if (!r.error) updateLastRunFor(acc.id, runAt);
          return r;
        });
      })
    );

    const results = settled.map((s, i) =>
      s.status === "fulfilled" ? s.value
        : { accountLabel: targets[i].label, error: s.reason?.message, mails: [] }
    );

    const allMails = results
      .flatMap(r => r.mails.slice(0, max_per_account).map(m => ({ ...m, account: r.accountLabel, mailbox: r.mailbox })))
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      });

    const categorySummary = allMails.reduce((acc, m) => {
      acc[m.aiCategory] = (acc[m.aiCategory] || 0) + 1; return acc;
    }, {});

    const spamCount = allMails.filter(m => m.isSpam).length;
    const errors = results.filter(r => r.error).map(r => ({ account: r.accountLabel, error: r.error }));

    return { content: [{ type: "text", text: JSON.stringify({
      runAt:           runAt.toISOString(),
      totalMails:      allMails.length,
      englishMails:    allMails.filter(m => m.isEnglish).length,
      spamCount,
      categorySummary,
      haikuEnabled:    loadApiKey().length > 10,
      mails:           allMails,
      errors:          errors.length ? errors : undefined,
    }, null, 2) }] };
  }
);

// ── Tool 3: 메일 본문 전체 읽기 ───────────────────────
server.tool(
  "read_email",
  "특정 메일의 전체 본문을 읽습니다. 영문 메일인 경우 번역·요약해서 제공하고, webLink로 원본 확인 링크도 함께 표시하세요. max_chars로 본문 길이를 제한할 수 있습니다 (기본 5000자, -1이면 전체).",
  {
    account_label: z.string(),
    uid:           z.number(),
    mailbox:       z.string().default("INBOX"),
    // [v1.2.0] 본문 최대 길이 파라미터
    max_chars:     z.number().default(5000).describe("본문 최대 길이 (기본: 5000 / 전체: -1)"),
  },
  async ({ account_label, uid, mailbox, max_chars }) => {
    const acc = loadAccounts().find(a => a.label === account_label || a.user === account_label);
    if (!acc) return { content: [{ type: "text", text: JSON.stringify({ error: "계정 없음" }) }] };

    const imap = makeImap(acc);
    try {
      await imapConnect(imap);
      let mailboxName = mailbox;
      if (acc.service === "daum" && mailbox === "INBOX") {
        const boxes = await listBoxes(imap);
        for (const c of DAUM_INBOX_CANDIDATES)
          if (boxes.includes(c)) { mailboxName = c; break; }
      }
      await openBox(imap, mailboxName);
      const msg = await fetchFullBody(imap, uid);
      const fullBody = msg.text || (msg.html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "(본문 없음)";

      // [v1.2.0] max_chars 적용
      const body = (max_chars === -1 || fullBody.length <= max_chars)
        ? fullBody
        : fullBody.substring(0, max_chars) +
          `\n\n...[이하 ${fullBody.length - max_chars}자 생략. max_chars=-1로 재요청하면 전체 본문을 볼 수 있습니다.]`;

      const messageId = (msg.messageId || "").replace(/[<>]/g, "").trim();
      const isEnglish = fullBody.length > 20 &&
        (fullBody.match(/[a-zA-Z]/g) || []).length / Math.min(fullBody.length, 500) > 0.6;

      return { content: [{ type: "text", text: JSON.stringify({
        account: acc.label, uid,
        from: msg.from?.text || "", subject: msg.subject || "",
        date: msg.date?.toISOString() || "",
        isEnglish, body,
        total_chars: fullBody.length,
        webLink: buildWebLink(acc.service, messageId),
      }) }] };
    } finally {
      try { imap.end(); } catch {}
    }
  }
);

// ── Tool 4: last_run 리셋 ─────────────────────────────
server.tool(
  "reset_last_run",
  "마지막 실행 시각 초기화 또는 특정 시각으로 설정합니다.",
  { account_label: z.string().default("all"), set_to: z.string().default("").describe("ISO 8601. 비우면 7일 전") },
  async ({ account_label, set_to }) => {
    const accounts = loadAccounts();
    const targets  = account_label === "all" ? accounts
      : accounts.filter(a => a.label === account_label || a.user === account_label);
    const ts = set_to ? new Date(set_to) : (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })();
    targets.forEach(a => updateLastRunFor(a.id, ts));
    return { content: [{ type: "text", text: JSON.stringify({ updated: targets.map(a => a.label), setTo: ts.toISOString() }) }] };
  }
);

// ── Tool 5: 메일함 목록 ───────────────────────────────
server.tool(
  "list_mailboxes",
  "IMAP 폴더 목록을 반환합니다.",
  { account_label: z.string() },
  async ({ account_label }) => {
    const acc = loadAccounts().find(a => a.label === account_label || a.user === account_label);
    if (!acc) return { content: [{ type: "text", text: JSON.stringify({ error: "계정 없음" }) }] };
    const imap = makeImap(acc);
    try {
      await imapConnect(imap);
      const boxes = await listBoxes(imap);
      return { content: [{ type: "text", text: JSON.stringify({ mailboxes: boxes }) }] };
    } finally {
      try { imap.end(); } catch {}
    }
  }
);

// ══════════════════════════════════════════════════════
//  실행
// ══════════════════════════════════════════════════════
const transport = new StdioServerTransport();
await server.connect(transport);
