# K-Mail-MCP Installer — PowerShell (Node.js 불필요)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$isKorean  = (Get-Culture).Name -like "ko*"
function T($ko, $en) { if ($isKorean) { $ko } else { $en } }

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   K-Mail-MCP Auto Installer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Node.js 확인
try {
    $nodeVer = & node --version 2>&1
    # 버전 숫자 추출 (v20.1.0 → 20)
    $verNum = [int]($nodeVer -replace "v(\d+)\..*", '$1')
    if ($verNum -lt 18) {
        Write-Host "[ERROR] Node.js $nodeVer is too old. Please install v18 or later from https://nodejs.org" -ForegroundColor Red
        Read-Host ""; exit 1
    }
    Write-Host "[OK] Node.js $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    Read-Host ""; exit 1
}

# npm install
Write-Host ""
Write-Host "[1/3] $(T "패키지 설치 중..." "Installing packages...")" -ForegroundColor Yellow
Set-Location $ScriptDir
& npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed" -ForegroundColor Red
    Read-Host ""; exit 1
}
Write-Host "[OK] $(T "패키지 설치 완료" "Packages installed")" -ForegroundColor Green

# Claude Desktop config 경로 탐색
Write-Host ""
Write-Host "[2/3] $(T "Claude Desktop 설정 파일 탐색 중..." "Finding Claude Desktop config...")" -ForegroundColor Yellow

$candidates = @(
    "$env:APPDATA\Claude",
    "$env:LOCALAPPDATA\Claude",
    "$env:APPDATA\Anthropic\Claude"
)
$configDir = $null
foreach ($dir in $candidates) {
    if (Test-Path $dir) { $configDir = $dir; break }
}
if (-not $configDir) {
    $configDir = "$env:APPDATA\Claude"
    New-Item -Path $configDir -ItemType Directory -Force | Out-Null
    Write-Host "[CREATED] $configDir" -ForegroundColor Yellow
}
$configFile = Join-Path $configDir "claude_desktop_config.json"
Write-Host "[OK] Config: $configFile" -ForegroundColor Green

# PowerShell 내장 JSON으로 config 업데이트 (Node.js 불필요)
Write-Host ""
Write-Host "[3/3] $(T "Claude Desktop 설정 업데이트 중..." "Updating Claude Desktop config...")" -ForegroundColor Yellow

$indexPath = Join-Path $ScriptDir "index.js"

if (Test-Path $configFile) {
    try {
        $config = Get-Content $configFile -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        $config = [PSCustomObject]@{}
    }
} else {
    $config = [PSCustomObject]@{}
}

if (-not $config.PSObject.Properties["mcpServers"]) {
    $config | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue ([PSCustomObject]@{}) -Force
}

$serverEntry = [PSCustomObject]@{
    command = "node"
    args    = @($indexPath)
}
$config.mcpServers | Add-Member -NotePropertyName "k-mail-mcp" -NotePropertyValue $serverEntry -Force

$config | ConvertTo-Json -Depth 10 | Set-Content -Path $configFile -Encoding UTF8

Write-Host "[OK] Config updated: $configFile" -ForegroundColor Green

# 완료
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   $(T "설치 완료!" "Install Complete!")" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "" -ForegroundColor White
Write-Host "  1. Register mail account:" -ForegroundColor White
Write-Host "     $(T "     계정 등록:" "     Register account:")" -ForegroundColor Cyan
Write-Host "     setup.bat (Windows) / ./setup.sh (macOS/Linux)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. $(T "Claude Desktop 완전 종료 후 재시작" "Fully close and restart Claude Desktop")" -ForegroundColor White
Write-Host ""
Write-Host "  3. Ask Claude:" -ForegroundColor White
Write-Host "     Ask: new emails, summarize, unread mail..." -ForegroundColor Cyan
Write-Host ""
Read-Host ""
