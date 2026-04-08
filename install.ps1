# K-Mail-MCP Installer - PowerShell
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding            = [System.Text.Encoding]::UTF8
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── 로케일 감지 → 언어 변수 일괄 정의 ────────────────────────────
if ((Get-Culture).Name -like "ko*") {
    $L_TITLE    = "K-Mail-MCP 자동 설치"
    $L_OK_NODE  = "[OK] Node.js"
    $L_ERR_NODE = "[ERROR] Node.js가 설치되어 있지 않습니다. https://nodejs.org 에서 v20 이상을 설치하세요."
    $L_OLD_NODE = "[ERROR] Node.js 버전이 너무 낮습니다. v18 이상이 필요합니다. https://nodejs.org"
    $L_STEP1    = "[1/3] 패키지 설치 중..."
    $L_OK1      = "[OK] 패키지 설치 완료"
    $L_STEP2    = "[2/3] Claude Desktop 설정 파일 탐색 중..."
    $L_STEP3    = "[3/3] Claude Desktop 설정 업데이트 중..."
    $L_DONE     = "설치 완료!"
    $L_NEXT1    = "  1. 메일 계정 등록:"
    $L_NEXT1B   = "     setup.bat"
    $L_NEXT1C   = "     (5번 메뉴: AI 스팸 필터 API 키 설정 선택 가능)"
    $L_NEXT2    = "  2. Claude Desktop 완전 종료 후 재시작"
    $L_NEXT3    = "  3. Claude에게 말해보세요:"
    $L_NEXT3B   = '     "새 메일 확인해줘"'
    $L_ENTER    = "Enter 키를 눌러 종료"
    $L_ERR_CFG  = "[ERROR] Claude Desktop 설정 파일을 찾을 수 없습니다. Claude Desktop이 설치되어 있는지 확인하세요."
} else {
    $L_TITLE    = "K-Mail-MCP Auto Installer"
    $L_OK_NODE  = "[OK] Node.js"
    $L_ERR_NODE = "[ERROR] Node.js not found. Install v20+ from https://nodejs.org"
    $L_OLD_NODE = "[ERROR] Node.js version too old. v18+ required. https://nodejs.org"
    $L_STEP1    = "[1/3] Installing packages..."
    $L_OK1      = "[OK] Packages installed"
    $L_STEP2    = "[2/3] Finding Claude Desktop config..."
    $L_STEP3    = "[3/3] Updating Claude Desktop config..."
    $L_DONE     = "Install Complete!"
    $L_NEXT1    = "  1. Register mail account:"
    $L_NEXT1B   = "     setup.bat"
    $L_NEXT1C   = "     (Option 5: Configure AI spam filter API key)"
    $L_NEXT2    = "  2. Fully close and restart Claude Desktop"
    $L_NEXT3    = "  3. Ask Claude:"
    $L_NEXT3B   = '     "Check my new emails"'
    $L_ENTER    = "Press Enter to exit"
    $L_ERR_CFG  = "[ERROR] Claude Desktop config not found. Make sure Claude Desktop is installed."
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   $L_TITLE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Node.js 확인
try {
    $nodeVer = & node --version 2>&1
    $verNum  = [int]($nodeVer -replace "v(\d+)\..*", '$1')
    if ($verNum -lt 18) {
        Write-Host $L_OLD_NODE -ForegroundColor Red
        Read-Host $L_ENTER
        exit 1
    }
    Write-Host "$L_OK_NODE $nodeVer" -ForegroundColor Green
} catch {
    Write-Host $L_ERR_NODE -ForegroundColor Red
    Read-Host $L_ENTER
    exit 1
}

# 패키지 설치
Write-Host $L_STEP1
Set-Location $ScriptDir
& npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed" -ForegroundColor Red
    Read-Host $L_ENTER
    exit 1
}
Write-Host $L_OK1 -ForegroundColor Green

# Claude Desktop 설정 탐색
Write-Host $L_STEP2
$configPaths = @(
    # MSIX 설치 버전 (Microsoft Store / 최신 설치) - 우선 탐색
    "$env:LOCALAPPDATA\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json",
    # 일반 설치 버전
    "$env:APPDATA\Claude\claude_desktop_config.json",
    "$env:LOCALAPPDATA\Claude\claude_desktop_config.json",
    "$env:USERPROFILE\AppData\Roaming\Claude\claude_desktop_config.json"
)
$configPath = $configPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $configPath) {
    $configPath = "$env:APPDATA\Claude\claude_desktop_config.json"
    $configDir  = Split-Path $configPath
    if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Path $configDir | Out-Null }
}
Write-Host "[OK] Config: $configPath" -ForegroundColor Green

# 설정 업데이트
Write-Host $L_STEP3
$indexPath = Join-Path $ScriptDir "index.js"
$mcpEntry  = @{
    command = "node"
    args    = @($indexPath)
}

if (Test-Path $configPath) {
    $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
} else {
    $cfg = [PSCustomObject]@{}
}

if (-not $cfg.PSObject.Properties["mcpServers"]) {
    $cfg | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value ([PSCustomObject]@{})
}
$cfg.mcpServers | Add-Member -MemberType NoteProperty -Name "k-mail-mcp" -Value $mcpEntry -Force

$json = $cfg | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($configPath, $json, (New-Object System.Text.UTF8Encoding $false))
Write-Host "[OK] Config updated: $configPath" -ForegroundColor Green

# 완료
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   $L_DONE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host $L_NEXT1
Write-Host $L_NEXT1B -ForegroundColor Yellow
Write-Host $L_NEXT1C -ForegroundColor DarkGray
Write-Host $L_NEXT2
Write-Host $L_NEXT3
Write-Host $L_NEXT3B -ForegroundColor Yellow
Write-Host ""
Read-Host $L_ENTER