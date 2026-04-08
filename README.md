# K-Mail-MCP

> **Korean Mail MCP Server** — 네이버·다음·Gmail·네이트·Yahoo·iCloud를 Claude AI에 연결하는 MCP 플러그인

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

**English summary:** K-Mail-MCP is an MCP (Model Context Protocol) server that connects 6 mail services — Naver, Daum/Kakao, Gmail, Nate, Yahoo, and iCloud — to Claude AI. It enables AI-powered email summarization, translation, and unified inbox management — all with AES-256-GCM encrypted credentials.

---

## 왜 만들었나요?

Gmail은 공식 MCP가 있지만, 한국에서 주로 사용하는 네이버·다음 메일은 아무것도 없었습니다.  
메일을 확인하기 위해 여러 메일 서비스에 일일이 로그인하는 건 번거로운 일이라,  
**한 번에 요약하고 볼 수 있도록** Claude AI와 함께 만들었습니다.

→ 자세한 이야기는 [PHILOSOPHY.md](PHILOSOPHY.md)를 읽어주세요.

---

## 주요 기능

- **멀티 계정 통합** — 네이버, 다음/카카오, Gmail 계정을 하나의 MCP로 연결
- **증분 수집** — 마지막 확인 이후 읽지 않은 메일만 가져옴
- **AI 자동 분류** — 뉴스/미디어, 개발/기술, 금융, 쇼핑 등 9개 카테고리 자동 분류
- **영문 메일 번역** — 영문 메일 자동 감지 후 Claude가 한국어로 번역·요약
- **메일 링크** — Gmail은 해당 메일 딥링크, 네이버·다음은 받은편지함 링크 제공
- **완전 암호화** — 이메일 주소 + 비밀번호 모두 AES-256-GCM 암호화 저장
- **인스턴스 격리** — 설치본마다 고유 키 생성, 다른 PC와 데이터 공유 불가

---

## 지원 플랫폼

| 플랫폼 | 지원 여부 | 비고 |
|--------|----------|------|
| Windows 10/11 | ✅ | 권장 환경 |
| macOS | ✅ | Node.js 설치 필요 |
| Linux | ✅ | |
| iOS / Android | ❌ | Claude 앱 MCP 미지원 (추후 지원 예정) |

## 지원 메일 서비스

| 서비스 | 이메일 도메인 | IMAP 주소 | 비고 |
|---|---|---|---|
| 네이버 | @naver.com | imap.naver.com | 국내 1위 |
| 다음/카카오 | @daum.net @kakao.com | imap.daum.net | 국내 2위 |
| Gmail | @gmail.com | imap.gmail.com | 글로벌 1위 |
| 네이트 | @nate.com | imap.nate.com | 국내 SK |
| Yahoo | @yahoo.com | imap.mail.yahoo.com | 글로벌 |
| iCloud | @icloud.com @me.com | imap.mail.me.com | Apple |

## 지원하지 않는 메일 서비스

아래 서비스는 현재 기본 지원이 어렵습니다:

| 서비스 | 이유 | 대안 |
|---|---|---|
| Outlook.com / Microsoft 365 | OAuth 2.0 인증 필수 (앱 비밀번호 방식 차단) | 사용자 지정 IMAP 설정으로 직접 추가 가능 |
| 네이버 웍스 | B2B 전용, IMAP 설정 비공개 | IT 관리자 문의 필요 |
| 카카오 엔터프라이즈 | 기업 계약 필요 | IT 관리자 문의 필요 |
| 회사 메일 (Google Workspace 등) | IMAP 활성화 여부 회사 정책에 따라 다름 | IT 관리자에게 IMAP 설정값 문의 |

> IMAP 설정을 아는 경우 `index.js`의 `PRESETS` 객체에 직접 추가할 수 있습니다. [CONTRIBUTING.md](CONTRIBUTING.md) 참고

## 지원 Claude 클라이언트

| 클라이언트 | 지원 여부 | MCP 방식 | 비고 |
|---|---|---|---|
| **Claude Desktop** | ✅ 완전 지원 | 로컬 stdio | K-Mail-MCP 전용, 커스텀 출력 포맷 |
| Claude Code | ✅ 지원 가능 | stdio | `claude mcp add` 명령으로 연결 |
| Claude.ai (웹) | ⚠️ 부분 지원 | 웹 MCP (Gmail만) | 공식 Gmail MCP 사용, Naver/Daum 불가 |
| Claude Cowork | ❓ 미확인 | stdio 여부 미정 | 추후 확인 예정 |
| iOS / Android 앱 | ❌ 미지원 | MCP 미지원 | 추후 지원 예정 |

> **Claude Desktop vs Claude.ai 차이:**
> Claude Desktop은 K-Mail-MCP(로컬)를 사용해 Naver/Daum/Gmail을 지원하고 스팸 감지·커스텀 요약 등 모든 기능을 사용할 수 있습니다.
> Claude.ai(웹)는 Anthropic 공식 Gmail MCP만 연결되어 Gmail만 접근 가능하며 커스텀 기능은 사용 불가합니다.

---

## 사전 요구사항

- [Node.js](https://nodejs.org) **v20 이상** (v22 LTS 권장 / 최소 v18 이상)
- [Claude Desktop](https://claude.ai/download) 설치
- 각 메일 서비스의 **앱 비밀번호** (서비스별로 별도 발급 필요)
  > ⚠️ **중요**: 평소 로그인 비밀번호가 아닌 각 서비스 보안 설정에서 **별도로 발급받은 앱 비밀번호**를 사용해야 해요.
  > 로그인 비밀번호로는 IMAP 연결이 거부됩니다. 아래 서비스별 발급 방법을 참고하세요.

---

## 설치

### 1. 저장소 클론 또는 ZIP 다운로드

```bash
git clone https://github.com/youngsooco/k-mail-mcp.git
cd k-mail-mcp
```

또는 [Releases](https://github.com/youngsooco/k-mail-mcp/releases)에서 ZIP 다운로드 후 압축 해제.

### 2. 자동 설치 (권장)

**Windows** — `install.bat` 더블클릭

**macOS** — 터미널에서:
```bash
chmod +x install.sh && ./install.sh
```

설치 스크립트가 자동으로:
- 패키지 설치 (`npm install`)
- Claude Desktop 설정 파일 위치 탐색 및 자동 업데이트
- 설치 완료 안내

### 3. 계정 등록 (최초 1회)

**Windows** — `setup.bat` 더블클릭

**macOS/Linux** — 터미널에서:
```bash
chmod +x setup.sh && ./setup.sh
```

실행하면 대화형 메뉴가 뜹니다:

```
============================================
   Korean Mail MCP - Account Setup
============================================

  1) Add / Update account
  2) List accounts
  3) Delete account
  4) Exit
```

`1`을 선택하고 서비스, 이메일, 계정 비밀번호, 별칭을 입력합니다.
이메일과 비밀번호 입력 시 `***`로 마스킹되며, **AES-256-GCM으로 암호화되어 저장**됩니다.

### 4. Claude Desktop 재시작

Claude Desktop을 완전히 종료하고 다시 실행합니다.
좌측 하단 또는 도구 메뉴에서 `k-mail-mcp` MCP가 연결된 것을 확인하세요.

> ℹ️ `install.bat` / `install.sh`이 `claude_desktop_config.json`을 자동으로 찾아 업데이트해요.
> 수동 설정이 필요한 경우 [INSTALL_GUIDE.md](INSTALL_GUIDE.md)를 참고하세요.

---

## 서비스별 앱 비밀번호 발급 방법

> ⚠️ **로그인 비밀번호가 아닌 앱 비밀번호를 입력해야 해요.**
> 앱 이름(예: "Claude", "K-Mail")은 식별용 명칭으로 아무 이름이나 입력해도 됩니다.

### 네이버 메일

1. [네이버 보안설정](https://nid.naver.com/security) 접속
2. `2단계 인증` → 활성화 (미활성 시 앱 비밀번호 발급 불가)
3. `애플리케이션 비밀번호` → `추가` → 이름 입력 (예: Claude) → 발급
4. 생성된 비밀번호 **복사** (창 닫으면 다시 볼 수 없음)
5. 네이버 메일 → 환경설정 → `IMAP/SMTP 설정` → **사용함** 체크
6. `setup.bat` 실행 → 네이버 계정 등록 시 복사한 비밀번호 입력

### 다음/카카오 메일

1. [다음 메일](https://mail.daum.net) 접속 → 설정 → `IMAP/POP3` 탭
2. IMAP 사용 → **사용함** 선택
3. `[비밀번호 확인하기]` 클릭 → 카카오 인증 → IMAP 전용 비밀번호 **복사**
4. `setup.bat` 실행 → 다음 계정 등록 시 복사한 비밀번호 입력

> 다음은 별도로 앱 비밀번호를 만드는 게 아니라, 위 화면에서 이미 생성된 전용 비밀번호를 확인하는 방식이에요.

### Gmail

1. [Google 계정](https://myaccount.google.com) → `보안` 탭
2. `2단계 인증` 활성화 (미활성 시 앱 비밀번호 발급 불가)
3. 검색창에 `앱 비밀번호` 검색 → 클릭
4. 앱 이름 입력 (예: Claude) → `만들기`
5. 생성된 16자리 비밀번호 **복사** (창 닫으면 다시 볼 수 없음)
6. `setup.bat` 실행 → Gmail 계정 등록 시 복사한 비밀번호 입력

### 네이트

1. [네이트 메일](https://mail.nate.com) → 설정 → 외부 메일 앱 연결
2. IMAP 사용 → 활성화
3. 로그인 비밀번호 그대로 사용 (2단계 인증 미사용 시)
4. 2단계 인증 사용 중이면 보안 설정에서 앱 비밀번호 발급

### Yahoo

1. [Yahoo 계정 보안](https://login.yahoo.com/account/security) 접속
2. `앱 비밀번호 생성` 클릭
3. 앱 이름 입력 → 생성 → 16자리 비밀번호 **복사**
4. `setup.bat` 실행 → Yahoo 계정 등록 시 복사한 비밀번호 입력

### iCloud

1. [Apple ID](https://appleid.apple.com) 접속 → `로그인 및 보안`
2. `앱 전용 암호` → `암호 생성`
3. 이름 입력 (예: Claude) → 생성 → 비밀번호 **복사**
4. `setup.bat` 실행 → iCloud 계정 등록 시 복사한 비밀번호 입력

> iCloud는 2단계 인증이 항상 켜져 있어 앱 전용 암호가 **필수**예요.

---

## 사용 방법

Claude Desktop에서 자연어로 요청하면 됩니다:

```
"새 메일 확인해줘"
"오늘 받은 메일 카테고리별로 정리해줘"
"영문 메일만 번역해서 요약해줘"
"다음 계정에서 읽지 않은 메일 보여줘"
"AI 관련 메일만 찾아줘"
"저번에 확인한 이후로 새 메일 있어?"
```

### 제공하는 MCP Tool 목록

| Tool | 설명 |
|------|------|
| `check_new_mails` | 마지막 실행 이후 읽지 않은 메일 수집 (핵심) |
| `list_accounts` | 등록된 계정 목록 확인 |
| `read_email` | 특정 메일 전체 본문 읽기 |
| `reset_last_run` | 마지막 실행 시각 초기화 |
| `list_mailboxes` | IMAP 폴더 목록 확인 |

---

## 데이터 흐름 및 보안

```
사용자 입력 (setup.bat / setup.sh)
    ↓ 이메일 주소 + 비밀번호 → AES-256-GCM 암호화
accounts.enc.json  ← 암호화된 데이터만 저장
.master.key        ← 이 설치본 전용 256-bit 키 (자동 생성)
    ↓
MCP 서버 실행 시 → 메모리에서만 복호화 → IMAP 연결
    ↓ 서버 종료 → 평문 완전 소멸
```

- 비밀번호는 파일에 **절대 평문으로 저장되지 않습니다**
- `.master.key`는 이 PC에만 존재합니다
- 다른 설치본의 키로는 데이터를 복호화할 수 없습니다
- Claude (Anthropic)로 비밀번호가 전송되지 않습니다 — IMAP 연결은 로컬에서만 처리

---

## 파일 구조

```
k-mail-mcp/
├── index.js           MCP 서버 본체
├── setup.bat          계정 등록 (Windows 더블클릭)
├── setup.ps1          계정 등록 UI (Windows PowerShell)
├── setup.sh           계정 등록 (macOS/Linux)
└── setup-worker.js    암호화/저장 코어 (공통)
├── package.json
├── accounts.enc.json  암호화된 계정 정보 (자동 생성, git 제외)
├── .master.key        암호화 키 (자동 생성, git 제외, 절대 공유 금지)
├── .instance.json     인스턴스 식별자 (키 아님)
├── last_run.json      마지막 실행 시각 (자동 관리)
├── LICENSE
├── README.md
├── PHILOSOPHY.md
├── INSTALL_GUIDE.md   플랫폼별 상세 설치 가이드
└── CONTRIBUTING.md
```

---

## 자주 묻는 질문 (Q&A)

**Q. `setup.bat`을 실행했는데 아무것도 안 뜹니다.**
A. Node.js가 설치되어 있는지 확인하세요: `node --version`. v20 미만이면 [nodejs.org](https://nodejs.org)에서 LTS 버전(v22 권장)을 설치하세요. Node.js 확인 후 `install.bat`을 먼저 실행하세요.

**Q. Claude Desktop에서 k-mail-mcp가 보이지 않습니다.**
A. `install.bat`(Windows) 또는 `install.sh`(macOS)를 다시 실행해보세요. 자동으로 설정 파일을 찾아 업데이트합니다. 그래도 안 되면 Claude Desktop을 완전히 종료 후 재시작하세요.

**Q. claude_desktop_config.json 파일이 어디 있나요?**
A. `install.bat` 실행 시 완료 메시지에 실제 경로가 표시됩니다. 수동으로 찾으려면 Windows 탐색기 주소창에 `%APPDATA%\Claude`를 입력하세요. 파일이 없으면 `install.bat`이 자동으로 생성합니다.

**Q. Claude Desktop 업데이트 후 MCP가 사라졌습니다.**
A. `install.bat`을 다시 실행하세요. 설정 파일은 앱 업데이트와 별개로 유지되지만, 드물게 경로가 바뀔 수 있습니다. 스크립트가 새 경로를 자동 탐색합니다.

**Q. 네이버 IMAP 연결 오류가 납니다.**  
A. ① 2단계 인증 활성화 여부 확인 ② 계정 비밀번호 재발급 (보안 설정 → 앱 비밀번호) ③ 네이버 메일 설정 → `IMAP/SMTP 설정` → 사용 켜기

**Q. 다음 메일 연결이 안 됩니다.**  
A. 다음 메일 웹에서 `환경설정` → `외부 메일 앱 연결` → IMAP 사용을 켜야 합니다. 계정 비밀번호(카카오 보안 설정 → 앱 비밀번호)도 재발급해보세요.

**Q. `.master.key`를 실수로 삭제했습니다.**
A. 복구 불가합니다. 이는 **정상적인 처리 방법**이에요. 아래 순서로 새로 생성하세요:
```
1. accounts.enc.json 삭제
2. .master.key 삭제 (이미 없음)
3. .instance.json 삭제
4. setup.bat 실행 → 계정 재등록
```
새 키로 새 계정을 등록하면 정상 동작합니다. `.master.key`는 백업하지 마세요 — 유실 시 새로 만드는 것이 올바른 처리입니다.

**Q. 여러 PC에서 같은 계정을 쓰고 싶습니다.**  
A. 각 PC에서 독립적으로 `setup.bat`(Windows) 또는 `./setup.sh`(macOS)를 실행해 계정을 등록하세요. `.master.key`는 복사하지 마세요 — 각 PC에서 독립적으로 생성하는 것이 올바른 방법입니다.

**Q. iOS에서 사용할 수 있나요?**  
A. 현재 Claude iOS 앱은 MCP를 지원하지 않아 사용 불가합니다. 추후 Claude 앱의 MCP 지원이 추가되면 업데이트 예정입니다.

**Q. 다른 메일 서비스를 추가할 수 있나요?**  
A. IMAP을 지원하는 모든 메일 서비스는 `index.js`의 `PRESETS` 객체에 추가하면 됩니다. Outlook, 사내 Exchange 메일 등이 가능합니다. [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

---

## 확장 가능한 메일 서비스

IMAP 표준을 지원하는 메일이라면 프리셋 추가만으로 연결 가능합니다:

| 서비스 | IMAP 주소 | 포트 | 비고 |
|--------|-----------|------|------|
| Outlook/Hotmail | `outlook.office365.com` | 993 | OAuth 필요, 직접 추가 |
| 네이버 웍스 | `imap.worksmobile.com` | 993 | B2B 전용 |
| Zoho Mail | `imap.zoho.com` | 993 | 직접 추가 가능 |
| 사내 Exchange | 관리자 문의 | 993 | IT 관리자 문의 |

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