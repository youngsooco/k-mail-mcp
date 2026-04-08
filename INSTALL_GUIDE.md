# 설치 가이드 — K-Mail-MCP v1.2.0

플랫폼별 단계별 상세 가이드입니다.  
막히는 부분이 있으면 [자주 겪는 문제](#자주-겪는-문제) 섹션을 먼저 확인해주세요.

---

## 목차

- [Windows 설치](#windows-설치)
- [macOS 설치](#macos-설치)
- [iOS / Android](#ios--android)
- [서비스별 앱 비밀번호 발급 방법](#서비스별-앱-비밀번호-발급-방법)
- [자주 겪는 문제](#자주-겪는-문제)

---

## Windows 설치

### Step 1 — Node.js 설치

1. [https://nodejs.org](https://nodejs.org) 접속
2. **LTS** 버전 다운로드 (v22 LTS 권장 / 최소 v20 이상)
3. 설치 마법사 실행 — 모든 옵션 기본값 유지, `Next` 계속 클릭
4. 설치 완료 후 확인:

```powershell
# 윈도우 키 + R → cmd 입력 → 확인
node --version
# v20.x.x 이상이면 성공 (v22 LTS 권장)
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

```
============================================
   한국 메일 MCP - 계정 설정
============================================

  1) 계정 추가 / 수정
  2) 계정 목록
  3) 계정 삭제
  4) AI 스팸 필터 설정 (Claude Haiku API 키)  (미등록)
  5) 종료
```

`1`을 눌러 계정을 추가합니다.

```
서비스 선택:
  1) 네이버    2) 다음/카카오    3) Gmail
  4) 네이트    5) Yahoo         6) iCloud
```

- 서비스 번호 선택 후 이메일 주소, 앱 비밀번호, 별칭(예: `다음개인`) 순서로 입력
- 비밀번호는 `***`로 마스킹되어 표시됩니다
- [서비스별 앱 비밀번호 발급 방법](#서비스별-앱-비밀번호-발급-방법) 참고

> Haiku AI 스팸 판단을 활성화하려면 `4`번 메뉴에서 Anthropic API 키를 등록하세요.  
> API 키 없이도 1~3단계 스팸 탐지는 자동으로 작동합니다.

---

### Step 6 — Claude Desktop 재시작

1. 시스템 트레이(오른쪽 하단)에서 Claude 아이콘 우클릭 → 종료
2. Claude Desktop 다시 실행
3. 설정 → 개발자 탭에서 `k-mail-mcp` 상태 확인 (connected 표시)
4. 새 대화창에서 확인:

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

설정 파일 위치:
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

---

## macOS 설치

> ⚠️ **macOS 검증 현황:** `index.js` (MCP 서버 본체)는 Node.js 표준 모듈만 사용해 크로스플랫폼으로 동작합니다.  
> 단, `install.sh` / `setup.sh`의 Claude Desktop 경로 탐지 및 터미널 입력 마스킹(`stty`)은  
> macOS 환경에서 아직 충분히 검증되지 않았습니다. 문제가 발생하면 [수동 설치 방법](#수동-설치-macos)을 참고하거나  
> [Issues](https://github.com/youngsooco/k-mail-mcp/issues)에 알려주세요.

### Step 1 — Node.js 설치

**방법 A — Homebrew 사용 (권장)**

```bash
# Homebrew가 없으면 먼저 설치
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js 설치
brew install node
node --version  # v20 이상 확인
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
```

---

### Step 4 — 자동 설치 시도

```bash
chmod +x install.sh && ./install.sh
```

스크립트가 자동으로 `npm install` 및 Claude Desktop config 업데이트를 시도합니다.  
정상 완료되면 Step 6으로 건너뛰세요.

> 실패하거나 config가 제대로 등록되지 않으면 [수동 설치 방법](#수동-설치-macos)을 진행하세요.

---

### Step 5 — 계정 등록

```bash
chmod +x setup.sh && ./setup.sh
```

메뉴가 뜨면 `1`을 눌러 계정을 추가합니다.  
서비스 선택 → 이메일 → 앱 비밀번호 → 별칭 순서로 입력하면 됩니다.

> setup.sh의 비밀번호 마스킹(`stty`)이 동작하지 않으면  
> `node setup-worker.js`를 직접 실행해보세요.

---

### Step 6 — Claude Desktop 재시작

```bash
osascript -e 'quit app "Claude"'
open -a Claude
```

또는 Dock에서 Claude 우클릭 → 종료 후 다시 실행.

---

## 수동 설치 (macOS)

`install.sh` 자동 설치가 실패한 경우:

**Step A — 패키지 설치**

```bash
cd ~/Documents/k-mail-mcp
npm install
```

**Step B — claude_desktop_config.json 수정**

```bash
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

VS Code가 설치되어 있다면:
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

---

## iOS / Android

**현재 지원하지 않습니다.**

Claude iOS/Android 앱은 MCP 서버 연결을 지원하지 않습니다.  
Claude 앱의 MCP 지원이 추가되면 업데이트할 예정입니다.

---

## 카테고리 커스터마이징 (v1.2.0)

설치 완료 후 메일 분류 카테고리를 나만의 패턴으로 바꿀 수 있습니다.

**AI 자동 생성 (권장):**

```
Claude Desktop에서: "내 메일 패턴 보고 카테고리 자동으로 만들어줘"
```

`generate_categories` 툴이 실제 메일을 분석해 `categories.json`을 생성합니다.  
Anthropic API 키(setup 4번 메뉴)가 등록되어 있어야 합니다.

**직접 편집:**

프로젝트 폴더의 `categories.json`을 수정하면 됩니다. Claude Desktop 재시작 없이 즉시 적용됩니다.

---

## 서비스별 앱 비밀번호 발급 방법

> ⚠️ **반드시 앱 비밀번호를 사용해야 해요.** 로그인 비밀번호로는 IMAP 연결이 거부됩니다.

### 네이버 메일

> 2단계 인증이 **반드시 먼저** 활성화되어야 합니다.

1. [https://nid.naver.com](https://nid.naver.com) 로그인 → 프로필 → 내 정보 → 보안 설정
2. `2단계 인증` 활성화
3. `애플리케이션 비밀번호` → `애플리케이션 추가` → 이름 입력 (예: `Claude`) → 추가
4. **표시된 비밀번호를 바로 복사** (페이지를 벗어나면 다시 볼 수 없음)
5. 네이버 메일 → 환경설정 → `IMAP/SMTP 설정` → **사용함** → 저장

---

### 다음/카카오 메일

다음 메일은 별도 앱 비밀번호 생성이 아닌, IMAP 전용 비밀번호를 메일 설정에서 확인하는 방식입니다.

1. [https://mail.daum.net](https://mail.daum.net) 로그인
2. 오른쪽 상단 `환경설정` (톱니바퀴 아이콘) → `외부 메일 앱 연결` 탭
3. `IMAP 사용` → **켜기** → 저장
4. `[비밀번호 확인하기]` 클릭 → 카카오 인증 → IMAP 전용 비밀번호 **복사**
5. `setup.bat` / `./setup.sh` → 다음/카카오 선택 → 복사한 비밀번호 입력

> 카카오 계정의 일반 로그인 비밀번호와 다릅니다. 반드시 위 4번 단계의 IMAP 전용 비밀번호를 사용하세요.

---

### Gmail

1. [https://myaccount.google.com](https://myaccount.google.com) → `보안`
2. `2단계 인증` 활성화
3. 검색창에 `앱 비밀번호` 검색 → 클릭
4. 앱 이름 입력 (예: `Claude`) → `만들기`
5. 16자리 비밀번호 복사
6. `setup.bat` / `./setup.sh` → Gmail 선택 → 복사한 비밀번호 입력

---

### 네이트 메일

1. [https://mail.nate.com](https://mail.nate.com) → 설정 → 외부 메일 앱 연결 → IMAP 활성화
2. 2단계 인증 미사용: 로그인 비밀번호 그대로 입력
3. 2단계 인증 사용 중: 보안 설정에서 앱 비밀번호 발급

---

### Yahoo 메일

1. [Yahoo 계정 보안](https://login.yahoo.com/account/security) → `앱 비밀번호 생성`
2. 앱 이름 입력 → 생성 → 16자리 비밀번호 복사
3. `setup.bat` / `./setup.sh` → Yahoo 선택 → 복사한 비밀번호 입력

---

### iCloud 메일

1. [https://appleid.apple.com](https://appleid.apple.com) → `로그인 및 보안` → `앱 전용 암호` → `암호 생성`
2. 이름 입력 (예: `Claude`) → 생성 → 비밀번호 복사
3. `setup.bat` / `./setup.sh` → iCloud 선택 → 복사한 비밀번호 입력

> iCloud는 2단계 인증이 항상 켜져 있어 앱 비밀번호가 **필수**입니다.

---

## 자주 겪는 문제

### Windows MSIX 설치 버전 — MCP가 로드되지 않는 문제

**현상:** install.bat 실행 후 Claude Desktop 재시작해도 k-mail-mcp 도구가 보이지 않음

**원인:** Windows Store(MSIX) 방식 Claude Desktop은 가상화된 경로를 사용해 config 파일이 두 곳에 존재함

| 파일 | 경로 |
|---|---|
| Claude Desktop이 실제 읽는 파일 | `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json` |
| install.bat이 기본으로 쓰는 파일 | `%LOCALAPPDATA%\Claude\claude_desktop_config.json` (다른 파일!) |

**해결 방법 1 — install.bat 재실행 (권장)**

v1.0.2부터 MSIX 경로 자동 탐지. `install.bat`을 다시 실행하면 해결됩니다.

**해결 방법 2 — 수동 추가**

```powershell
$p = "$env:LOCALAPPDATA\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json"
$cfg = Get-Content $p -Raw | ConvertFrom-Json
$mcp = @{ "k-mail-mcp" = @{ command = "node"; args = @("C:\workspace\k-mail-mcp\index.js") } }
$cfg | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue $mcp -Force
[System.IO.File]::WriteAllText($p, ($cfg | ConvertTo-Json -Depth 10), (New-Object System.Text.UTF8Encoding $false))
```

> 경로의 `Claude_pzs8sxrjxfjjc` 부분은 설치 버전마다 다를 수 있습니다.  
> `dir "%LOCALAPPDATA%\Packages\Claude_*"` 로 실제 폴더명 확인하세요.

---

### `node: command not found` 또는 `'node'은(는) 내부 또는 외부 명령이 아닙니다`

- `node --version`으로 버전 확인 (v20 이상 필요)
- v20 미만이면 [nodejs.org](https://nodejs.org)에서 LTS 버전 재설치
- 설치 후 터미널/CMD를 완전히 닫고 새로 열기

---

### `npm install` 중 에러 발생

```powershell
npm install --legacy-peer-deps
```

---

### setup.bat 실행 시 메뉴가 안 뜸 (Windows)

```powershell
cd C:\Users\사용자명\k-mail-mcp
powershell -ExecutionPolicy Bypass -File setup.ps1
```

---

### Claude Desktop에서 MCP가 보이지 않음

1. `install.bat`(Windows) / `install.sh`(macOS)를 다시 실행
2. 설정 파일 수동 확인: Windows 탐색기 `%APPDATA%\Claude` → `claude_desktop_config.json`
3. 파일 내 경로가 올바른지 확인 (Windows는 `\\` 이중 슬래시)
4. Claude Desktop 시스템 트레이에서 완전 종료 후 재시작

---

### IMAP 인증 오류

- 로그인 비밀번호가 아닌 **앱 비밀번호**를 사용했는지 확인
- 각 서비스 메일 설정에서 IMAP이 활성화되어 있는지 확인
- `setup.bat` → `1` 계정 수정으로 비밀번호 재입력

---

### `복호화 실패` 오류

`.master.key` 파일이 없거나 손상된 경우입니다.

```bash
# 기존 데이터 삭제 후 재등록
rm accounts.enc.json .master.key .instance.json  # macOS/Linux
# Windows: 탐색기에서 세 파일 삭제

# 계정 재등록
setup.bat        # Windows
./setup.sh       # macOS/Linux
```

---

### 메일이 하나도 안 뜸

마지막 실행 시각 이후 메일만 가져옵니다. 기준 시각을 초기화하세요:

```
Claude Desktop에서: "last_run을 24시간 전으로 초기화해줘"
```

또는 `last_run.json` 파일을 직접 삭제하세요.

---

### 도움이 필요한 경우

[GitHub Issues](https://github.com/youngsooco/k-mail-mcp/issues)에 문제를 등록해주세요.  
비밀번호나 `.master.key`는 절대 공유하지 마세요.
