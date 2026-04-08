# K-Mail-MCP 기여 가이드

K-Mail-MCP에 관심을 가져주셔서 감사합니다.  
버그 리포트, 새 메일 서비스 추가, 문서 개선 등 모든 형태의 기여를 환영합니다.

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

**`setup.js`의 서비스 선택 메뉴에도 추가:**

```javascript
const SERVICES = {
  "1": "naver",
  "2": "daum",
  "3": "gmail",
  "4": "outlook",  // 추가
  "5": "yahoo",    // 추가
};

const SVC_LABEL = {
  naver:   "네이버",
  daum:    "다음/카카오",
  gmail:   "Gmail",
  outlook: "Outlook/Hotmail",  // 추가
  yahoo:   "Yahoo Mail",       // 추가
};
```

**딥링크 지원 시 `buildWebLink` 함수에도 추가:**

```javascript
function buildWebLink(service, messageId) {
  if (service === "gmail" && messageId) {
    return `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(messageId)}`;
  }
  // Outlook 딥링크 예시
  if (service === "outlook" && messageId) {
    return `https://outlook.live.com/mail/0/search/id/${encodeURIComponent(messageId)}`;
  }
  if (service === "naver")   return "https://mail.naver.com/";
  if (service === "daum")    return "https://mail.daum.net/";
  if (service === "outlook") return "https://outlook.live.com/mail/0/inbox";
  if (service === "yahoo")   return "https://mail.yahoo.com/";
  return null;
}
```

---

### Pull Request 절차

1. 저장소 Fork
2. 기능 브랜치 생성: `git checkout -b feature/add-outlook-support`
3. 변경 후 커밋: `git commit -m "feat: add Outlook IMAP support"`
4. Push: `git push origin feature/add-outlook-support`
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
- `.master.key`, `accounts.enc.json`은 절대 커밋하지 마세요 (`.gitignore`에 이미 포함)
- 보안에 영향을 주는 변경은 Issue에서 먼저 논의해주세요

---

## 기여자

모든 기여자는 README.md의 기여자 목록에 추가됩니다.  
감사합니다 🙏
