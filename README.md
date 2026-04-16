# K-Mail-MCP

> **Korean Mail MCP Server** — 네이버·다음·Gmail·네이트·Yahoo·iCloud를 Claude AI에 연결하는 MCP 플러그인

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)
[![Version](https://img.shields.io/badge/version-1.4.5-brightgreen.svg)](https://github.com/youngsooco/k-mail-mcp/releases)

**English summary:** K-Mail-MCP is an MCP (Model Context Protocol) server that connects 6 mail services — Naver, Daum/Kakao, Gmail, Nate, Yahoo, and iCloud — to Claude AI. It enables AI-powered email summarization, translation, spam detection, and unified inbox management — all with AES-256-GCM encrypted credentials.

---

## 왜 만들었나요?

Gmail은 공식 MCP가 있지만, 한국에서 주로 사용하는 네이버·다음 메일은 아무것도 없었습니다. 메일을 확인하기 위해 여러 메일 서비스에 일일이 로그인하는 건 번거로운 일이라, **한 번에 요약하고 볼 수 있도록** Claude AI와 함께 만들었습니다.

→ 자세한 이야기는 [PHILOSOPHY.md](PHILOSOPHY.md)를 읽어주세요.

---

## 어떻게 사용하나요? — 먼저 이것만 결정하세요

> 아래 질문 하나에 답하면 필요한 설치 경로가 정해집니다.

```
"Claude Desktop 앱에서만 쓸 건가요?" → A. 로컬 설치 (가장 쉬움)
"claude.ai 웹/모바일에서도 쓸 건가요?" → B. 원격 서버 설치 (고급)
```

| | A. 로컬 설치 (Claude Desktop) | B. 원격 서버 (claude.ai 웹/앱) |
|---|---|---|
| **난이도** | ⭐ 쉬움 (5분) | ⭐⭐⭐ 어려움 (서버 필요) |
| **필요한 것** | PC + Claude Desktop | 외부 접근 가능한 서버 |
| **인증** | 없음 (로컬 프로세스) | OAuth 2.0 로그인 |
| **시작** | [👇 A 섹션으로 이동](#a-로컬-설치-claude-desktop--5분) | [👇 B 섹션으로 이동](#b-원격-서버-설치-claudeai-웹앱) |

---

## A. 로컬 설치 (Claude Desktop) — 5분

### 1단계: 사전 요구사항 확인

- **Node.js v20 이상** 설치 확인: 터미널에서 `node --version` 실행
  - `v20.x.x` 이상이면 통과. 아니면 [nodejs.org](https://nodejs.org)에서 LTS 버전 설치
- **Claude Desktop** 설치: [claude.ai/download](https://claude.ai/download)

### 2단계: 다운로드 및 설치

```bash
git clone https://github.com/youngsooco/k-mail-mcp.git
cd k-mail-mcp
```

또는 [Releases](https://github.com/youngsooco/k-mail-mcp/releases)에서 ZIP 다운로드 후 압축 해제.

**Windows:**
```
install.bat  파일을 더블클릭
```

**macOS/Linux:**
```bash
chmod +x install.sh && ./install.sh
```

설치 스크립트가 자동으로 패키지 설치 + Claude Desktop 설정 파일 연결까지 완료합니다.

### 3단계: 메일 계정 등록

> ⚠️ **앱 비밀번호**가 필요합니다 — 로그인 비밀번호와 다릅니다.
> [서비스별 발급 방법](#서비스별-앱-비밀번호-발급-방법) 섹션을 먼저 확인하세요.

**Windows:**
```
setup.bat  파일을 더블클릭
```

**macOS/Linux:**
```bash
chmod +x setup.sh && ./setup.sh
```

대화형 메뉴가 열립니다:
```
============================================
한국 메일 MCP - 계정 설정
============================================
1) 계정 추가 / 수정
2) 계정 목록
3) 계정 삭제
4) AI 스팸 필터 설정 (Claude Haiku API 키) (미등록)
5) 종료
```

`1`을 선택 → 서비스·이메일·앱 비밀번호·별칭 입력. 입력값은 **AES-256-GCM으로 암호화**되어 저장됩니다.

### 4단계: Claude Desktop 재시작

Claude Desktop을 트레이에서 완전히 종료 후 다시 실행. 좌측 도구 메뉴에서 `k-mail-mcp`가 보이면 완료입니다.

**이제 Claude에서 말을 걸어보세요:**
```
"새 메일 확인해줘"
"오늘 받은 메일 요약해줘"
"영문 메일 번역해줘"
```

---

## 서비스별 앱 비밀번호 발급 방법

> 앱 비밀번호 = IMAP 전용 별도 비밀번호. 로그인 비밀번호로는 연결이 거부됩니다.

### 네이버 메일

1. [네이버 보안설정](https://nid.naver.com/user2/help/myInfoV2?m=viewSecurity&lang=ko_KR) 접속
2. `2단계 인증` → 활성화 (미활성 시 앱 비밀번호 발급 불가)
3. `애플리케이션 비밀번호` → `추가` → 이름 입력 (예: Claude) → **발급**
4. 생성된 비밀번호 **복사** ← 창 닫으면 다시 볼 수 없음
5. 네이버 메일 → 환경설정 → `IMAP/SMTP 설정` → **사용함** 체크
6. `setup.bat` 실행 → 네이버 계정 등록 시 복사한 비밀번호 입력

### 다음/카카오 메일

1. [다음 메일](https://mail.daum.net) → 설정 → `IMAP/POP3` 탭
2. IMAP 사용 → **사용함** 선택
3. `[비밀번호 확인하기]` 클릭 → 카카오 인증 → 표시된 비밀번호 **복사**
4. `setup.bat` 실행 → 다음 계정 등록 시 복사한 비밀번호 입력

> 다음은 별도 발급이 아니라, 위 화면에서 이미 생성된 전용 비밀번호를 확인하는 방식입니다.

### Gmail

1. [Google 계정](https://myaccount.google.com) → `보안` 탭
2. `2단계 인증` 활성화 (미활성 시 앱 비밀번호 발급 불가)
3. 검색창에 `앱 비밀번호` 검색 → 클릭
4. 앱 이름 입력 (예: Claude) → `만들기`
5. 생성된 16자리 비밀번호 **복사** ← 창 닫으면 다시 볼 수 없음
6. `setup.bat` 실행 → Gmail 계정 등록 시 복사한 비밀번호 입력

### 네이트

1. [네이트 메일](https://mail.nate.com) → 설정 → 외부 메일 앱 연결
2. IMAP 사용 → 활성화
3. 2단계 인증 미사용 시 로그인 비밀번호 그대로 사용 가능
4. 2단계 인증 사용 중이면 보안 설정에서 앱 비밀번호 발급

> ⚠️ 미검증 서비스: 충분히 테스트되지 않았습니다.

### Yahoo

1. [Yahoo 계정 보안](https://login.yahoo.com/account/security) 접속
2. `앱 비밀번호 생성` → 앱 이름 입력 → 16자리 비밀번호 **복사**
3. `setup.bat` 실행 → Yahoo 계정 등록 시 복사한 비밀번호 입력

> ⚠️ 미검증 서비스: 충분히 테스트되지 않았습니다.

### iCloud

1. [Apple ID](https://appleid.apple.com) → `로그인 및 보안`
2. `앱 전용 암호` → `암호 생성` → 이름 입력 → 비밀번호 **복사**
3. `setup.bat` 실행 → iCloud 계정 등록 시 복사한 비밀번호 입력

> iCloud는 2단계 인증이 항상 켜져 있어 앱 전용 암호가 **필수**입니다.
> ⚠️ 미검증 서비스: 충분히 테스트되지 않았습니다.

---

## B. 원격 서버 설치 (claude.ai 웹/앱)

> **이 섹션은 claude.ai 웹 또는 모바일 앱에서 직접 K-Mail-MCP를 사용하고 싶을 때만 필요합니다.**
> Claude Desktop만 사용한다면 위의 A 섹션만으로 충분합니다.

### 작동 방식

```
claude.ai (Anthropic 클라우드)
    ↓ 자동 탐색: GET /.well-known/oauth-authorization-server
    ↓ 자동 등록: POST /register
    ↓ 사용자 브라우저: GET /authorize → API 키 입력 페이지
    ↓ 인증 완료: POST /token → access token 발급
    ↓ MCP 연결: POST /mcp + Bearer token
내 서버 (공인 IP 또는 Tunnel)
```

### 사전 요구사항

- **외부에서 접근 가능한 서버** (공인 IP, Cloudflare Tunnel, Tailscale Funnel 등)
- Node.js v20+
- `MCP_API_KEY` 환경변수 (이 값이 OAuth 로그인 비밀번호)

### 서버 시작

```bash
export MAIL_MCP_HTTP_PORT=8766
export MCP_API_KEY="원하는-비밀키"                 # 로그인 시 입력할 값
export MAIL_MCP_BASE_URL="https://your-domain.com"  # 외부 접근 가능한 URL (/ 없이)

node index.js
```

정상 시작 로그:
```
[k-mail-mcp] v1.4.5 OAuth2 MCP 서버 시작 — port 8766
  issuer:   https://your-domain.com
  MCP:      https://your-domain.com/mcp
  metadata: https://your-domain.com/.well-known/oauth-authorization-server
```

### Cloudflare Tunnel로 외부 노출 (고정 IP 없을 때)

```bash
# cloudflared 설치: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

# 임시 터널 (URL 매번 변경)
cloudflared tunnel --url http://localhost:8766

# 출력된 URL을 MAIL_MCP_BASE_URL에 사용
```

> CF Tunnel 무료 플랜은 커스텀 도메인 없이도 사용 가능합니다.
> 단, 랜덤 URL이 재시작마다 변경됩니다. 고정 URL이 필요하면 Cloudflare 계정 연결 후 커스텀 도메인을 설정하세요.

### claude.ai에서 연결하기

1. claude.ai → **설정(Settings)** → **연결(Connections)**
2. **MCP 서버 추가(Add MCP Server)** 클릭
3. 입력:

| 항목 | 값 |
|------|-----|
| **이름** | `k-mail-mcp` (원하는 이름) |
| **URL** | `https://your-domain.com/mcp` |
| **OAuth 클라이언트 ID** | 비워두기 (자동 등록) |
| **OAuth 클라이언트 시크릿** | 비워두기 (PKCE 전용) |

4. **저장** → **연결** 클릭
5. 브라우저에 로그인 페이지 표시 → `MCP_API_KEY` 값 입력 → **연결 허용**
6. 완료 — claude.ai에서 k-mail-mcp 툴 사용 가능

### 토큰 유효 기간

- 액세스 토큰: **30일** (재로그인 불필요)
- 서버 재시작 시 모든 토큰 초기화 → 재로그인 필요
- 만료 시 claude.ai가 자동으로 재인증 페이지 표시

---

## 주요 기능

- **멀티 계정 통합** — 네이버, 다음/카카오, Gmail 계정을 하나의 MCP로 연결
- **전체 폴더 순회** — INBOX뿐 아니라 모든 IMAP 폴더를 자동 발견하여 순회
- **증분 수집** — 마지막 확인 이후 읽지 않은 메일만 가져옴
- **AI 자동 분류** — 맞춤형 카테고리로 자동 분류 (`categories.json`으로 커스터마이징)
- **카테고리 자동 생성** — 실제 메일 패턴을 AI가 분석해 나만의 카테고리 규칙 생성
- **영문 메일 번역** — 영문 메일 자동 감지 후 Claude가 한국어로 번역·요약
- **메일 링크** — Gmail은 해당 메일 딥링크, 네이버·다음은 받은편지함 링크 제공
- **완전 암호화** — 이메일 주소 + 비밀번호 + API 키 모두 AES-256-GCM 암호화 저장
- **인스턴스 격리** — 설치본마다 고유 키 생성, 다른 PC와 데이터 공유 불가
- **OAuth 2.0 원격 접속** — claude.ai custom connector로 원격 연결 (v1.4.0+)

---

## 사용 방법

Claude에서 자연어로 말하면 됩니다:

```
"새 메일 확인해줘"
"오늘 받은 메일 카테고리별로 정리해줘"
"영문 메일만 번역해서 요약해줘"
"다음 계정에서 읽지 않은 메일 보여줘"
"AI 관련 메일만 찾아줘"
"저번에 확인한 이후로 새 메일 있어?"
"내 메일 패턴 보고 카테고리 자동으로 만들어줘"
"어떤 폴더들을 스캔하고 있어?"
"카페편지함은 스캔에서 빼줘"
```

### MCP Tool 목록

| Tool | 설명 |
|------|------|
| `check_new_mails` | 읽지 않은 메일 수집, 전체 폴더 순회, 4단계 스팸 탐지 포함 |
| `list_accounts` | 등록된 계정 목록 및 폴더 스캔 현황 확인 |
| `read_email` | 특정 메일 전체 본문 읽기 (`max_chars`로 길이 제한 가능) |
| `reset_last_run` | 마지막 실행 시각 초기화 (계정별 / 날짜 지정 가능) |
| `list_mailboxes` | IMAP 폴더 목록 및 발견/제외/유효 현황 확인 |
| `generate_categories` | 메일 패턴 AI 분석 → 맞춤 카테고리 자동 생성 |
| `get_watched_mailboxes` | 계정별 폴더 발견/제외/유효 스캔 현황 조회 |
| `set_watched_mailboxes` | 스캔 제외 폴더 관리 (추가 / 제거 / 초기화) |

---

## 지원 메일 서비스

| 서비스 | 이메일 도메인 | IMAP 주소 | 검증 상태 |
|--------|-------------|-----------|----------|
| 네이버 | @naver.com | imap.naver.com | ✅ 검증완료 |
| 다음/카카오 | @daum.net @kakao.com | imap.daum.net | ✅ 검증완료 |
| Gmail | @gmail.com | imap.gmail.com | ✅ 검증완료 |
| 네이트 | @nate.com | imap.nate.com | ⚠️ 미검증 |
| Yahoo | @yahoo.com | imap.mail.yahoo.com | ⚠️ 미검증 |
| iCloud | @icloud.com @me.com | imap.mail.me.com | ⚠️ 미검증 |

> ⚠️ **미검증 서비스 사용자 분들께**: 동작 여부(성공·실패·오류 메시지)를 [GitHub Issues](https://github.com/youngsooco/k-mail-mcp/issues)에 알려주시면 빠르게 반영하겠습니다.

### 지원하지 않는 서비스

| 서비스 | 이유 |
|---|---|
| Outlook.com / Microsoft 365 | OAuth 2.0 인증 필수 (앱 비밀번호 방식 차단) |
| 네이버 웍스 | B2B 전용, IMAP 설정 비공개 |
| 카카오 엔터프라이즈 | 기업 계약 필요 |
| 사내 메일 | IMAP 활성화 여부 회사 정책에 따라 다름 |

> IMAP 설정을 아는 경우 `index.js`의 `PRESETS` 객체에 직접 추가 가능합니다. [CONTRIBUTING.md](CONTRIBUTING.md) 참고

---

## 지원 플랫폼

| 플랫폼 | 지원 여부 | 비고 |
|--------|----------|------|
| Windows 10/11 | ✅ | 권장 환경, 설치 스크립트 검증완료 |
| macOS | ✅ | Node.js 설치 필요, install.sh 미검증 |
| Linux | ✅ | install.sh 미검증 |
| iOS / Android | ❌ | Claude 앱 MCP 미지원 |

> ⚠️ **macOS / Linux 사용자 분들께**: `install.sh` / `setup.sh`는 충분히 검증되지 않았습니다. 동작 여부를 [GitHub Issues](https://github.com/youngsooco/k-mail-mcp/issues)에 알려주시면 빠르게 반영하겠습니다.

---

## 카테고리 커스터마이징

### 방법 1: AI 자동 생성 (권장)

```
Claude: "내 메일 패턴 보고 카테고리 자동으로 만들어줘"
→ generate_categories 툴 실행
→ 미리보기 확인 후 "저장해줘" 요청
```

### 방법 2: 직접 편집

`categories.json` 파일을 수정하면 됩니다 (Claude Desktop 재시작 불필요):

```json
[
  {
    "name": "🏥 의료/헬스케어",
    "keywords": ["병원", "처방", "진료", "약국", "건강검진", "clinic", "hospital"]
  },
  {
    "name": "📚 교육/학습",
    "keywords": ["강의", "수강", "coursera", "udemy", "인프런", "수료"]
  }
]
```

- `name`: 이모지 + 카테고리명
- `keywords`: from(발신자) + subject(제목)에서 검색할 키워드 (대소문자 무시)
- `newsletterOnly`: `true`이면 List-Unsubscribe 헤더 있는 메일에만 적용
- `categories.json` 없거나 비어있으면 기본 9개 카테고리 자동 사용

---

## 스팸 탐지 — 4단계 필터링

| 단계 | 방법 | 필요 조건 |
|---|---|---|
| 1️⃣ | 키워드 패턴 매칭 | 없음 (기본 동작) |
| 2️⃣ | Spamhaus DNSBL | 없음 (DNS 쿼리) |
| 3️⃣ | SPF / DKIM / DMARC | 없음 (헤더 파싱) |
| 4️⃣ | Claude Haiku AI 판단 | Anthropic API 키 (선택) |

1~3단계는 별도 설정 없이 자동 동작. 4단계는 `setup.bat` → 4번 메뉴로 API 키 등록 시 활성화.

```
spamScore = 패턴점수 + DNSBL점수 + 인증점수(SPF/DKIM/DMARC) ± AI조정
isSpam = spamScore >= 70
```

---

## 데이터 흐름 및 보안

```
사용자 입력 (setup.bat / setup.sh)
├─ 이메일 주소 + 앱 비밀번호
│   ↓ AES-256-GCM 암호화
│   accounts.enc.json
│
└─ Anthropic API 키 (선택)
    ↓ AES-256-GCM 암호화
    settings.enc.json

.master.key ← 이 설치본 전용 256-bit 키 (자동 생성)
    ↓
MCP 서버 실행 시 → 메모리에서만 복호화 → IMAP 연결 / Haiku API 호출
    ↓
서버 종료 → 평문 완전 소멸
```

- 비밀번호·API 키는 파일에 **절대 평문으로 저장되지 않습니다**
- `.master.key`는 이 PC에만 존재합니다
- Claude (Anthropic) 서버로 비밀번호가 전송되지 않습니다

### OAuth 2.0 보안 설계 (v1.4.0+)

| 항목 | 구현 |
|------|------|
| PKCE (S256) | 필수 — 인가 코드 탈취 공격 방어 |
| API 키 비교 | `crypto.timingSafeEqual` — 타이밍 공격 방어 |
| Open Redirect 방어 | 폼 제출 시 `redirect_uri`를 등록된 목록에서 재검증 |
| auth code TTL | 5분 |
| access token TTL | **30일** (서버 재시작 시 초기화) |
| 토큰 저장 | 서버 인메모리 — 파일·DB 미기록 |
| 동적 클라이언트 등록 | RFC 7591 지원 — 사전 등록 불필요 |
| HTML 인젝션 방어 | 로그인 페이지 `escHtml()` 전 처리 |

### 보안 패치 이력

| 버전 | 내용 |
|------|------|
| v1.2.1 | 프롬프트 인젝션 방어, TLS 강제(`rejectUnauthorized: true`), 파일 권한 0o600 |
| v1.3.0 | GitHub Actions 워크플로우 hardening |
| v1.4.0 | OAuth 2.0, `timingSafeEqual` API 키 비교, Open Redirect 방어, PKCE S256 강제 |
| v1.4.5 | Stateless transport (CAI 로드밸런싱 대응), express trust proxy 설정 |

---

## 자주 묻는 질문

### Claude Desktop (로컬 모드)

**Q. `setup.bat`을 실행했는데 아무것도 안 뜹니다.**
A. `node --version`으로 Node.js 버전 확인. v20 미만이면 [nodejs.org](https://nodejs.org)에서 LTS 설치 후 `install.bat` 먼저 실행.

**Q. Claude Desktop에서 k-mail-mcp가 보이지 않습니다.**
A. `install.bat` 재실행 → Claude Desktop 트레이에서 완전 종료 → 재시작.

**Q. Claude Desktop 업데이트 후 MCP가 사라졌습니다.**
A. `install.bat`을 다시 실행하세요.

**Q. `claude_desktop_config.json` 파일이 어디 있나요?**
A. Windows 탐색기 주소창에 `%APPDATA%\Claude` 입력.

**Q. 네이버 IMAP 연결 오류가 납니다.**
A. ① 2단계 인증 활성화 ② 앱 비밀번호 재발급 ③ 네이버 메일 → IMAP/SMTP 설정 → 사용 켜기

**Q. 다음 메일 연결이 안 됩니다.**
A. 다음 메일 웹 → 환경설정 → 외부 메일 앱 연결 → IMAP 사용 켜기.

### claude.ai 원격 MCP (OAuth 모드)

**Q. "MCP 서버를 찾을 수 없습니다" 오류가 납니다.**
A. 브라우저에서 `https://your-domain.com/.well-known/oauth-authorization-server`를 직접 열어 JSON이 반환되는지 확인.

**Q. OAuth 클라이언트 ID / 시크릿에 뭘 입력해야 하나요?**
A. **비워두세요.** 동적 클라이언트 등록(RFC 7591)으로 자동 처리됩니다.

**Q. 서버 재시작 후 다시 로그인하라고 합니다.**
A. 정상입니다. 토큰이 인메모리에만 저장되므로 재시작 시 초기화됩니다.

**Q. API 키는 무엇인가요?**
A. `MCP_API_KEY` 환경변수로 설정한 값입니다. OAuth 로그인 페이지에서 이 값을 입력합니다.

### 공통

**Q. `.master.key`를 실수로 삭제했습니다.**
A. 복구 불가. `accounts.enc.json`, `.instance.json` 삭제 후 `setup.bat`으로 계정 재등록.

**Q. 여러 PC에서 같은 계정을 쓰고 싶습니다.**
A. 각 PC에서 독립적으로 `setup.bat` 실행. `.master.key`는 복사하지 마세요.

**Q. iOS/Android에서 사용할 수 있나요?**
A. 현재 Claude 앱은 MCP를 지원하지 않아 불가합니다.

**Q. 다른 메일 서비스를 추가할 수 있나요?**
A. IMAP을 지원하는 모든 서비스는 `index.js`의 `PRESETS` 객체에 추가 가능. [CONTRIBUTING.md](CONTRIBUTING.md) 참고.

**Q. `watched_mailboxes.json`이 git에 올라갑니다.**
A. v1.3.0부터 `.gitignore`에 자동 포함. 이미 올라간 경우: `git rm --cached watched_mailboxes.json`.

---

## 파일 구조

```
k-mail-mcp/
├── index.js             MCP 서버 본체 — stdio / HTTP+OAuth2 듀얼 모드
├── oauth.js             OAuth 2.0 Provider
├── categories.json      카테고리 규칙 (사용자 정의 가능)
├── install.bat          Windows 설치 (더블클릭)
├── install.ps1          설치 로직 (PowerShell)
├── install.sh           macOS/Linux 설치
├── setup.bat            Windows 계정·설정 관리 (더블클릭)
├── setup.ps1            계정·설정 관리 UI (PowerShell)
├── setup.sh             macOS/Linux 계정·설정 관리
├── setup-worker.js      암호화/저장 코어
├── package.json
├── INSTALL_GUIDE.md     플랫폼별 상세 설치 가이드
├── CONTRIBUTING.md
├── PHILOSOPHY.md
└── ROADMAP.md
```

**자동 생성 파일 (공유 금지):**

```
accounts.enc.json        계정 정보 (AES-256-GCM 암호화)
settings.enc.json        API 키 등 설정 (AES-256-GCM 암호화)
.master.key              256-bit 암호화 키 (절대 공유·백업 금지)
.instance.json           인스턴스 식별자
last_run.json            마지막 실행 시각
watched_mailboxes.json   폴더 발견 캐시 (이 PC 전용)
```

---

## AI와 함께 만들고 유지합니다

이 프로젝트는 **Claude AI (Anthropic)와 함께** 설계·개발·문서화됐습니다.

| 역할 | 담당 |
|---|---|
| 아이디어 / 방향 결정 | dadfkim |
| 코드 작성 / 구조 설계 | Claude AI + dadfkim |
| 문서 작성 / 유지보수 | Claude AI + dadfkim |
| 이슈 자동 응답 | Claude AI (GitHub Actions) |
| PR 코드 리뷰 | Claude AI (GitHub Actions) |
| 릴리즈 노트 자동 생성 | Claude AI (GitHub Actions) |

> GitHub에서 이슈를 등록하거나 PR을 올리면 Claude AI가 자동으로 검토·답변합니다.
> 최종 결정은 항상 사람(메인테이너)이 합니다.

## 기여자

- **dadfkim** — [dadfkim@hanmail.net](mailto:dadfkim@hanmail.net) · [GitHub](https://github.com/youngsooco/k-mail-mcp) · [LinkedIn](https://www.linkedin.com/in/kyskaritaslife/)
- **Claude Sonnet (Anthropic)** — AI 공동 개발자 · 자동화 유지보수

기여를 원하시면 [CONTRIBUTING.md](CONTRIBUTING.md)를 읽어주세요.

---

## 라이선스

[MIT License](LICENSE) © 2026 dadfkim
