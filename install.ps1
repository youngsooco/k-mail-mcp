# K-Mail-MCP Installer
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   K-Mail-MCP Auto Installer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Node.js 확인
try {
    $nodeVer = & node --version 2>&1
    Write-Host "[OK] Node.js $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found." -ForegroundColor Red
    Write-Host "        Please install from https://nodejs.org"
    Read-Host "Press Enter to exit"
    exit 1
}

# npm install
Write-Host ""
Write-Host "[1/3] Installing packages..." -ForegroundColor Yellow
Set-Location $ScriptDir
& npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Packages installed" -ForegroundColor Green

# Claude Desktop config 탐색
Write-Host ""
Write-Host "[2/3] Finding Claude Desktop config..." -ForegroundColor Yellow

$candidates = @(
    "$env:APPDATA\Claude",
    "$env:LOCALAPPDATA\Claude",
    "$env:APPDATA\Anthropic\Claude"
)

$configDir = $null
foreach ($dir in $candidates) {
    if (Test-Path $dir) {
        $configDir = $dir
        break
    }
}

if (-not $configDir) {
    $configDir = "$env:APPDATA\Claude"
    New-Item -Path $configDir -ItemType Directory -Force | Out-Null
    Write-Host "[CREATED] $configDir" -ForegroundColor Yellow
}

$configFile = "$configDir\claude_desktop_config.json"
Write-Host "[OK] Config path: $configFile" -ForegroundColor Green

# JS 파일로 config 업데이트 (인라인 코드 충돌 방지)
Write-Host ""
Write-Host "[3/3] Updating Claude Desktop config..." -ForegroundColor Yellow

$indexPath  = Join-Path $ScriptDir "index.js"
$tmpScript  = Join-Path $env:TEMP "kmailmcp_setup.js"

$jsContent = @"
const fs = require('fs');
const configFile = String.raw`$configFile`.replace(/\\/g, '\\\\');
const indexPath  = String.raw`$indexPath`.replace(/\\/g, '\\\\');

let config = {};
if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch(e) { config = {}; }
}
if (!config.mcpServers) config.mcpServers = {};
config.mcpServers['k-mail-mcp'] = { command: 'node', args: [indexPath] };
fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');
console.log('[OK] Config updated: ' + configFile);
"@

# UTF-8 BOM 없이 저장
[System.IO.File]::WriteAllText($tmpScript, $jsContent, [System.Text.Encoding]::UTF8)

& node $tmpScript
$exitCode = $LASTEXITCODE

Remove-Item $tmpScript -Force -ErrorAction SilentlyContinue

if ($exitCode -ne 0) {
    Write-Host "[ERROR] Config update failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 완료
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   Install Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Register mail account:" -ForegroundColor White
Write-Host "     node setup.js" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Fully close and restart Claude Desktop" -ForegroundColor White
Write-Host ""
Write-Host "  3. Ask Claude:" -ForegroundColor White
Write-Host "     새 메일 확인해줘" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
