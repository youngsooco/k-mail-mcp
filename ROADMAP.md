# K-Mail-MCP Roadmap

이 문서는 K-Mail-MCP의 공개 로드맵입니다. 구체적인 구현 일정은 GitHub Issues를 통해 관리됩니다.

---

## v1.0 (완료)
- ✅ 네이버 / 다음 / Gmail IMAP 연결
- ✅ AES-256-GCM 계정 암호화 (이메일 + 비밀번호)
- ✅ 스팸 감지 (spamScore / isSpam)
- ✅ AI 카테고리 분류 (9개 카테고리)
- ✅ 다이제스트 요약 출력 포맷
- ✅ Windows / macOS / Linux 설치 스크립트
- ✅ GitHub Actions (이슈 자동응답, PR 리뷰, 릴리즈 노트)

## v1.1 (완료)
- ✅ 네이트 / Yahoo / iCloud 프리셋 추가 (총 6개 서비스)
- ✅ 한글 계정 라벨 인코딩 수정 (환경변수 방식)
- ✅ CLI 로케일 자동 감지 (한국어 / 영어)
- ✅ Node.js v20+ 버전 체크 강화
- ✅ 스팸 탐지 고도화 — DNSBL(Spamhaus DBL) + SPF/DKIM/DMARC 헤더 인증
- ✅ Claude Haiku AI 스팸 판단 (경계 구간 15~75점)
- ✅ Anthropic API 키 암호화 저장 (settings.enc.json)

## v1.2 (완료)
- ✅ check_new_mails 반환 필드 보강 — `from_domain`, `reply_to`, `reply_to_differs`, `has_tracking_pixel`, `korean_spam_signals`
- ✅ read_email `max_chars` 파라미터 추가 (기본 5000자, -1이면 전체)
- ✅ 카테고리 커스터마이징 — `categories.json` 외부화, 사용자 정의 가능
- ✅ `generate_categories` 툴 — 실제 메일 패턴 분석 후 Haiku AI로 맞춤 카테고리 자동 생성
- ✅ 플랫폼 검증 현황 문서화 (macOS/Linux shell 스크립트 미검증 명시)
- ✅ `zod` 의존성 package.json 명시

## v1.3 (완료)
- ✅ 전체 폴더 동적 순회 — INBOX 단독 스캔에서 전체 폴더 자동 발견 및 순회로 전환
- ✅ `discovered` 누적 로그 방식 — 발견 폴더 추가 전용, 최대 100개 슬라이딩 윈도우
- ✅ 매 실행마다 IMAP 폴더 변경 자동 감지 (추가 / 삭제)
- ✅ 삭제 시그널 처리 — NONEXISTENT 오류 또는 IMAP 목록 미존재 시 자동 제거
- ✅ 메일 없음은 삭제 사유 아님 (discovered 유지)
- ✅ 첫 등록 시 시스템 기본 제외 폴더 자동 적용 (발신함 / 스팸 / 임시 등)
- ✅ `get_watched_mailboxes` 툴 — 발견 / 제외 / 유효 폴더 현황 조회
- ✅ `set_watched_mailboxes` 툴 — 제외 폴더 관리 (add / remove / reset)
- ✅ `watched_mailboxes.json` 런타임 캐시 (.gitignore 추가)
- ✅ `processMailBatch()` 분리 (imapflow 마이그레이션 교체 포인트 확보)

---

## v1.x (단기)
- 📬 Outlook 프리셋 (OAuth 방식 별도 구현 필요)
- 🔗 다음 메일 개별 메일 딥링크
- 🔒 IMAP 패키지 보안 업데이트 (imapflow 마이그레이션)
- 🧪 macOS / Linux install.sh · setup.sh 검증 및 수정

---

## v2.0 (장기)
- 📡 Claude.ai 웹 지원 (원격 서버 배포)
- 📱 모바일 클라이언트 지원 (Claude 앱 MCP 지원 시)
- ✉️ 메일 전송 (SMTP) 기능
- 🤖 서버사이드 Haiku 스팸 필터링 (원격 배포 전환 시 B안→A안)

---

## 기여하기

기능 제안 또는 버그 리포트는 [GitHub Issues](https://github.com/youngsooco/k-mail-mcp/issues)를 이용해주세요.
자세한 기여 방법은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
