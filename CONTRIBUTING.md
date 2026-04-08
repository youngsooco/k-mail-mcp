> 🤖 **이 프로젝트는 Claude AI와 함께 유지됩니다.**
> 이슈를 등록하면 Claude AI가 자동으로 한국어로 답변합니다.
> PR을 올리면 Claude AI가 보안·버그·성능 관점에서 코드를 리뷰합니다.
> v1.2.0부터 4단계 스팸 탐지(패턴/DNSBL/SPF·DKIM·DMARC/Haiku AI) + 맞춤 카테고리(`categories.json`)를 포함합니다.
> 최종 머지 결정은 메인테이너(dadfkim)가 합니다.

# K-Mail-MCP 기여 가이드

K-Mail-MCP에 관심을 가져주셔서 감사합니다.  
버그 리포트, 새 메일 서비스 추가, 카테고리 기여, 문서 개선 등 모든 형태의 기여를 환영합니다.

---

## 기여 방법

### 버그 리포트

[GitHub Issues](https://github.com/youngsooco/k-mail-mcp/issues)에 등록해주세요.  
아래 정보를 포함하면 빠르게 도움 드릴 수 있습니다:

- 운영체제 (Windows 11, macOS 14 등)
- Node.js 버전 (`node --version`)
- 어떤 메일 서비스에서 발생했는지
- 오류 메시지 전체 (비밀번호, 이메일 주소는 제외하고 공유)

---

### 카테고리 기여 (`categories.json`)

기본 카테고리 규칙이 부족하다면 `categories.json`에 새 카테고리를 추가해 PR을 보내주세요.

**형식:**

```json
[
  {
    "name": "🏥 의료/헬스케어",
    "keywords": ["병원", "처방", "진료", "약국", "건강검진", "clinic", "hospital"],
    "newsletterOnly": false
  },
  {
    "name": "📚 교육/학습",
    "keywords": ["강의", "수강", "학습", "교육", "coursera", "udemy", "인프런"],
    "newsletterOnly": false
  },
  {
    "name": "📰 뉴스레터",
    "keywords": ["newsletter", "weekly", "digest", "브리핑"],
    "newsletterOnly": true
  }
]
```

**필드 설명:**
- `name`: 이모지 1개 + 카테고리명 (예: `"🏥 의료/헬스케어"`)
- `keywords`: from(발신자) + subject(제목)에서 검색할 키워드 목록 (소문자, 대소문자 무시)
- `newsletterOnly`: `true`이면 List-Unsubscribe 헤더가 있는 뉴스레터 메일에만 적용

> 💡 `generate_categories` 툴을 사용하면 자신의 메일 패턴을 분석해 카테고리를 자동 생성할 수 있습니다.

---

### 새 메일 서비스 추가

IMAP을 지원하는 메일 서비스라면 누구나 추가할 수 있습니다.

**`index.js`의 `PRESETS` 객체에 추가:**

```javascript
const PRESETS = {
  naver:   { host: "imap.naver.com",          port: 993, tls: true },
  daum:    { host: "imap.daum.net",            port: 993, tls: true },
  gmail:   { host: "imap.gmail.com",           port: 993, tls: true },
  // 여기에 추가
  outlook: { host: "outlook.office365.com",    port: 993, tls: true },
  yahoo:   { host: "imap.mail.yahoo.com",      port: 993, tls: true },
  icloud:  { host: "imap.mail.me.com",         port: 993, tls: true },
  works:   { host: "imap.worksmobile.com",     port: 993, tls: true },
};
```

**`setup-worker.js`의 서비스 매핑에도 추가:**

```javascript
const SVC_MAP = {
  "1": "naver", "2": "daum",  "3": "gmail",
  "4": "nate",  "5": "yahoo", "6": "icloud",
  "7": "outlook",  // 추가 예시
};

const SVC_LABEL = {
  naver:   "Naver",
  daum:    "Daum/Kakao",
  gmail:   "Gmail",
  nate:    "Nate",
  yahoo:   "Yahoo",
  icloud:  "iCloud",
  outlook: "Outlook/Hotmail",
};
```

> setup.ps1 / setup.sh 의 메뉴 문자열도 함께 업데이트하세요.

**딥링크 지원 시 `buildWebLink` 함수에도 추가:**

```javascript
function buildWebLink(service, messageId) {
  if (service === "gmail" && messageId) {
    return `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(messageId)}`;
  }
  if (service === "outlook" && messageId) {
    return `https://outlook.live.com/mail/0/search/id/${encodeURIComponent(messageId)}`;
  }
  // ...
}
```

---

### macOS / Linux 검증 기여

현재 `install.sh` / `setup.sh`는 macOS / Linux 환경에서 충분히 검증되지 않았습니다.  
실제로 설치해보고 문제가 있으면 Issues에 알려주세요. 수정 PR도 환영합니다.

테스트 시 아래 항목을 확인해주세요:
- `stty -echo` 입력 마스킹이 정상 작동하는지
- Claude Desktop config 경로 탐지가 올바른지 (`~/Library/Application Support/Claude/`)
- Node.js 버전 체크가 작동하는지

---

### Pull Request 절차

1. 저장소 Fork
2. 기능 브랜치 생성: `git checkout -b feat/add-outlook-support`
3. 변경 후 커밋: `git commit -m "feat: add Outlook IMAP support"`
4. Push: `git push origin feat/add-outlook-support`
5. Pull Request 생성

**커밋 메시지 형식:**

```
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
```

---

### 문서 기여

설치 중 막혔던 부분, 이해가 어려웠던 부분이 있으면  
`INSTALL_GUIDE.md`나 `README.md`에 Q&A를 추가하는 PR도 환영합니다.

---

## 지켜야 할 원칙

- 비밀번호, 이메일 주소 등 개인정보를 코드나 이슈에 포함하지 마세요
- `.master.key`, `accounts.enc.json`, `settings.enc.json`은 절대 커밋하지 마세요 (`.gitignore`에 포함)
- API 키(`ANTHROPIC_API_KEY`)는 코드나 이슈에 포함하지 마세요 — `setup.bat` 4번 메뉴로만 등록
- 보안에 영향을 주는 변경은 Issue에서 먼저 논의해주세요

---

## 기여자

모든 기여자는 README.md의 기여자 목록에 추가됩니다.  
감사합니다 🙏
