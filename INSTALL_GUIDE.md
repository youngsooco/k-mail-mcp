# 설치 가이드 — K-Mail-MCP

플랫폼별 단계별 상세 가이드입니다.  
막히는 부분이 있으면 [Q&A 섹션](#자주-겪는-문제)을 먼저 확인해주세요.

---

## 목차

- [Windows 설치](#windows-설치)
- [macOS 설치](#macos-설치)
- [iOS / Android](#ios--android)
- [계정 비밀번호 발급 상세](#앱-비밀번호-발급-상세)
- [자주 겪는 문제](#자주-겪는-문제)

---

## Windows 설치

### Step 1 — Node.js 설치

1. [https://nodejs.org](https://nodejs.org) 접속
2. **LTS** 버전 다운로드 (**v18 이상 필수**, v20+ LTS 권장)
3. 설치 마법사 실행 — 모든 옵션 기본값 유지, `Next` 계속 클릭
4. 설치 완료 후 확인:

```powershell
# 윈도우 키 + R → cmd 입력 → 확인
node --version
# v18.x.x 이상이면 성공 (v20, v22도 정상)
```

> Node.js가 이미 설치되어 있다면 이 단계 건너뛰세요.

---

### Step 2 — Claude Desktop 설치

1. [https://claude.ai/download](https://claude.ai/download) 접속
2. Windows 버전 다운로드 및 설치
3. Claude 계정으로 로그인

---

### Step 3 — K-Mail-MCP 다운로드

**방법 A — Git 사용 (권장)**

```powershell
# 저장소를 클론할 위치로 이동 (예: C:\Users\사용자명\)
cd C:\Users\사용자명
git clone https://github.com/youngsooco/k-mail-mcp.git
cd k-mail-mcp
```

**방법 B — ZIP 다운로드**

1. GitHub 페이지에서 `Code` → `Download ZIP` 클릭
2. 원하는 위치에 압축 해제 (예: `C:\Users\사용자명\k-mail-mcp`)
3. 압축 해제된 폴더 안에 `index.js`, `setup.bat`이 있는지 확인

---

### Step 4 — 자동 설치 (권장)

폴더 안의 `install.bat`을 **더블클릭**하세요.

스크립트가 자동으로:
- 패키지 설치 (`npm install`)
- Claude Desktop 설정 파일 위치 탐색
- `claude_desktop_config.json` 자동 업데이트

완료 메시지에 **실제 설정 파일 경로**가 표시됩니다.

> ℹ️ 수동 설치가 필요한 경우 [수동 설치 방법](#수동-설치-windows)을 참고하세요.

---

### Step 5 — 계정 등록

`setup.bat`을 더블클릭하면 계정 등록 메뉴가 나타납니다.

메뉴가 뜨면 `1`을 눌러 계정을 추가합니다.

- 서비스 선택: `1` 네이버, `2` 다음/카카오, `3` Gmail
- 이메일 주소 입력 (화면에 `***`로 표시됨)
- 계정 비밀번호 입력 (화면에 `***`로 표시됨) — [발급 방법 보기](#imap-전용-비밀번호-발급-상세)
- 별칭 입력 (예: `다음개인`, `네이버메일`)

---

### Step 6 — Claude Desktop 재시작

1. 시스템 트레이(오른쪽 하단 시계 옆)에서 Claude 아이콘 우클릭 → 종료
2. Claude Desktop 다시 실행
3. 새 대화창에서 확인:

```
"새 메일 확인해줘"
```

메일 목록이 뜨면 설치 완료입니다! 🎉

---

## 수동 설치 (Windows)

`install.bat`이 동작하지 않는 경우 아래 방법으로 수동 설정하세요.

**Step A — 패키지 설치**

```powershell
cd C:\Users\사용자명\k-mail-mcp
npm install
```

**Step B — claude_desktop_config.json 수정**

설정 파일 위치 탐색:
```powershell
# 탐색기 주소창에 입력
%APPDATA%\Claude
```

파일이 없으면 PowerShell로 생성:
```powershell
New-Item -Path "$env:APPDATA\Claude" -ItemType Directory -Force
notepad "$env:APPDATA\Claude\claude_desktop_config.json"
```

내용 입력 (경로는 실제 경로로 수정):
```json
{
  "mcpServers": {
    "k-mail-mcp": {
      "command": "node",
      "args": ["C:\\Users\\사용자명\\k-mail-mcp\\index.js"]
    }
  }
}
```

> ⚠️ Windows 경로는 백슬래시를 반드시 두 번(`\\`) 써야 합니다.

> ℹ️ **버전 업 시 주의**: Claude Desktop 업데이트 후 MCP가 사라지면 `install.bat`을 다시 실행하거나 위 파일 경로를 확인하세요. 설정 파일은 앱 업데이트와 별개로 유지됩니다.

---

## macOS 설치

### Step 1 — Node.js 설치

**방법 A — Homebrew 사용 (권장)**

```bash
# Homebrew가 없으면 먼저 설치
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js 설치
brew install node
node --version  # 확인
```

**방법 B — 공식 설치 파일**

1. [https://nodejs.org](https://nodejs.org) → LTS 버전 → macOS `.pkg` 다운로드
2. 설치 파일 실행

---

### Step 2 — Claude Desktop 설치

1. [https://claude.ai/download](https://claude.ai/download) → macOS 버전 다운로드
2. `.dmg` 파일 실행 → Applications 폴더로 드래그

---

### Step 3 — K-Mail-MCP 다운로드

```bash
cd ~/Documents  # 또는 원하는 위치
git clone https://github.com/youngsooco/k-mail-mcp.git
cd k-mail-mcp
npm install
```

---

### Step 4 — 계정 등록

```bash
chmod +x setup.sh && ./setup.sh
```

메뉴가 뜨면 `1`을 눌러 계정을 추가합니다.

---

### Step 5 — Claude Desktop 설정 파일 수정

```bash
# 설정 파일 열기 (없으면 자동 생성됨)
mkdir -p ~/Library/Application\ Support/Claude
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

아래 내용 입력 (**경로는 본인 경로로 수정**):

```json
{
  "mcpServers": {
    "k-mail-mcp": {
      "command": "node",
      "args": ["/Users/사용자명/Documents/k-mail-mcp/index.js"]
    }
  }
}
```

> `nano` 에디터: 입력 후 `Ctrl+O` → Enter (저장) → `Ctrl+X` (종료)

또는 VS Code가 설치되어 있다면:

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

---

### Step 6 — Claude Desktop 재시작

```bash
# 앱 완전 종료 후 재시작
osascript -e 'quit app "Claude"'
open -a Claude
```

또는 Dock에서 Claude 우클릭 → 종료 후 다시 실행.

---

## iOS / Android

**현재 지원하지 않습니다.**

Claude iOS/Android 앱은 MCP 서버 연결을 지원하지 않습니다.  
Claude 앱의 MCP 지원이 추가되면 업데이트할 예정입니다.

모바일에서 사용하고 싶다면:
- 집/사무실 PC에 K-Mail-MCP를 설치하고
- PC에서 Claude Desktop으로 메일을 확인하는 방식을 권장합니다.

---

## 계정 비밀번호 안내

**대부분의 경우 평소 로그인 비밀번호를 그대로 입력하면 됩니다.**

2단계 인증(2FA) 사용 중인 경우에만 아래 절차로 앱 비밀번호를 별도 발급받아 입력하세요.

### 2단계 인증 사용 중인 경우 — 앱 비밀번호 발급 방법

### 네이버 메일

> 2단계 인증이 **반드시 먼저** 활성화되어야 합니다.

1. [https://nid.naver.com](https://nid.naver.com) 로그인
2. 오른쪽 상단 프로필 → `내 정보`
3. 왼쪽 메뉴 → `보안 설정`
4. `2단계 인증` 섹션 → 활성화 (이미 켜져 있으면 다음 단계)
5. 같은 페이지 → `애플리케이션 비밀번호` → `애플리케이션 추가`
6. 이름 입력 (예: `Claude`) → 추가
7. **표시된 비밀번호를 바로 복사** (페이지를 벗어나면 다시 볼 수 없음)
8. `setup.bat`(Windows) 또는 `./setup.sh`(macOS) 실행 → 네이버 선택 → 계정 비밀번호 입력

**네이버 IMAP 확인:**
- [https://mail.naver.com](https://mail.naver.com) → 오른쪽 상단 `환경설정`
- `POP3/IMAP 설정` → `IMAP/SMTP 설정` → **사용함** 선택 → 저장

---

### 다음/카카오 메일

1. [https://accounts.kakao.com](https://accounts.kakao.com) 로그인
2. 상단 `보안` 탭
3. `앱 비밀번호` → `앱 추가`
4. 기기명 입력 (예: `Claude`) → 확인
5. 표시된 비밀번호 복사
6. `setup.bat`(Windows) 또는 `./setup.sh`(macOS) 실행 → 다음/카카오 선택 → 계정 비밀번호 입력

**다음 IMAP 활성화 (필수):**
- [https://mail.daum.net](https://mail.daum.net) 로그인
- 오른쪽 상단 `환경설정` (톱니바퀴 아이콘)
- `외부 메일 앱 연결` → `IMAP 사용` → **켜기** → 저장

---

### Gmail

1. [https://myaccount.google.com](https://myaccount.google.com) → `보안`
2. `2단계 인증` 활성화
3. 검색창에 `앱 비밀번호` 검색 → 클릭
4. 앱 이름 입력 (예: `Claude`) → `만들기`
5. 16자리 비밀번호 복사
6. `setup.bat`(Windows) 또는 `./setup.sh`(macOS) 실행 → Gmail 선택 → 계정 비밀번호 입력

---

## 네이트 / Yahoo / iCloud 계정 비밀번호

### 네이트 메일
1. 네이트 로그인 → 계정 설정 → 보안
2. 2단계 인증 사용 중이라면: 앱 비밀번호 발급
3. 2단계 인증 미사용: 로그인 비밀번호 그대로 입력

### Yahoo 메일
1. Yahoo 보안 설정 → 앱 비밀번호 생성
2. 2단계 인증이 켜져 있는 경우 필수
3. 2단계 인증 미사용: 로그인 비밀번호 그대로 입력

> Yahoo IMAP 설정: `imap.mail.yahoo.com` / 포트 993 / SSL

### iCloud 메일
1. appleid.apple.com 로그인 → 로그인 및 보안
2. 앱 전용 암호 → 암호 생성
3. iCloud는 2단계 인증이 항상 켜져 있어 **앱 비밀번호 필수**

> iCloud IMAP 설정: `imap.mail.me.com` / 포트 993 / SSL

---

## 자주 겪는 문제

### `node: command not found` 또는 `'node'은(는) 내부 또는 외부 명령이 아닙니다`

Node.js가 설치되지 않았거나 환경변수가 설정되지 않은 상태입니다.

Node.js 버전이 v18 미만인 경우도 동일한 오류가 발생할 수 있습니다.

- `node --version`으로 버전 확인 (v18 이상이어야 함)
- v18 미만이면 [nodejs.org](https://nodejs.org)에서 LTS 버전 재설치
- 설치 후 터미널/CMD 재시작 필요
- 설치 후 터미널(cmd) 완전히 닫고 새로 열기
- 재확인: `node --version`

---

### `npm install` 중 에러 발생

```powershell
# 관리자 권한으로 PowerShell 열고 실행
npm install --legacy-peer-deps
```

---

### setup.bat 실행 시 메뉴가 안 뜸 (Windows)

`setup.bat`을 더블클릭해도 반응이 없으면 PowerShell에서 직접 실행하세요:

```powershell
cd C:\Users\사용자명\k-mail-mcp
powershell -ExecutionPolicy Bypass -File setup.ps1
```

---

### Claude Desktop에서 MCP가 보이지 않음

**Step 1 — install.bat 재실행 (가장 빠름)**

`install.bat`을 다시 더블클릭하면 설정 파일을 자동으로 찾아 업데이트합니다.

**Step 2 — 그래도 안 되면 수동 확인**

1. 설정 파일 경로 확인:
   - Windows 탐색기 주소창에 `%APPDATA%\Claude` 입력
   - `claude_desktop_config.json` 파일 존재 여부 확인

2. 파일 내용 확인 (메모장으로 열기):
   ```json
   {
     "mcpServers": {
       "k-mail-mcp": {
         "command": "node",
         "args": ["C:\\Users\\영수\\k-mail-mcp\\index.js"]
       }
     }
   }
   ```
   Windows 경로는 백슬래시를 `\\` 두 번 써야 합니다.

3. Claude Desktop 완전 종료 후 재시작 (시스템 트레이에서 종료)

**Claude Desktop 업데이트 후 MCP 사라진 경우**

`install.bat` 재실행으로 해결됩니다. 설정 파일(`claude_desktop_config.json`)은 앱 업데이트와 별개로 유지되지만 드물게 경로가 바뀔 수 있습니다. 스크립트가 새 경로를 자동 탐색합니다.

---

### IMAP 인증 오류 (인증 실패, 연결 거부 등)

- 일반 로그인 비밀번호가 아닌 **계정 비밀번호**를 사용했는지 확인
  (보안 설정 → 앱 비밀번호 메뉴에서 새로 발급한 비밀번호여야 함)
- 각 서비스에서 IMAP이 활성화되어 있는지 확인
- 계정 비밀번호를 재발급하고 `setup.bat`(Windows) 또는 `./setup.sh`(macOS) → 계정 수정으로 업데이트

---

### `복호화 실패` 오류

`.master.key` 파일이 없거나 손상된 경우입니다.

```bash
# 기존 데이터 삭제 후 재등록
rm accounts.enc.json .master.key  # macOS/Linux
# Windows: 탐색기에서 두 파일 삭제

setup.bat  # 계정 재등록 (Windows)
./setup.sh  # 계정 재등록 (macOS/Linux)
```

---

### 메일이 하나도 안 뜸 (새 메일이 있는데도)

마지막 실행 시각 이후 메일만 가져옵니다. 기준 시각을 초기화해보세요:

Claude에게 요청:
```
"last_run을 24시간 전으로 초기화해줘"
```

또는 직접:
```bash
# last_run.json 파일 삭제
rm last_run.json
```

---

### 도움이 필요한 경우

- [GitHub Issues](https://github.com/youngsooco/k-mail-mcp/issues)에 문제를 등록해주세요
- 로그와 함께 올려주시면 빠르게 도움 드릴 수 있습니다
- 비밀번호나 `.master.key`는 절대 공유하지 마세요
