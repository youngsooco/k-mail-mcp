# K-Mail-MCP Account Setup (PowerShell)
# Read-Host -AsSecureString 으로 패스워드 완전 마스킹
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Show-Header {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "   Korean Mail MCP - Account Setup" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
}

function Show-Menu {
    Write-Host ""
    Write-Host "  1) Add / Update account"
    Write-Host "  2) List accounts"
    Write-Host "  3) Delete account"
    Write-Host "  4) Exit"
    Write-Host ""
}

function Get-PlainText($secureString) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureString)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Invoke-Worker($action, $data) {
    $json = $data | ConvertTo-Json -Compress
    $result = $json | & node "$ScriptDir\setup-worker.js" $action 2>&1
    return $result
}

function Add-Account {
    Write-Host ""
    Write-Host "-- Add / Update Account --" -ForegroundColor Yellow
    Write-Host "  1) Naver  2) Daum/Kakao  3) Gmail  4) Nate  5) Yahoo  6) iCloud"
    $svc = Read-Host "  Service"

    $email = Read-Host "  Email address"
    if (-not $email.Contains("@")) {
        Write-Host "[ERROR] Invalid email format" -ForegroundColor Red
        return
    }

    Write-Host "  [안내] 2단계 인증 사용 시: 보안 설정에서 별도 발급한 앱 비밀번호 입력" -ForegroundColor DarkGray
    # 패스워드 2회 입력으로 오타 방지 (*** 완전 마스킹)
    $matched = $false
    $pass = ""
    while (-not $matched) {
        $secPass1 = Read-Host "  계정 비밀번호" -AsSecureString
        $secPass2 = Read-Host "  계정 비밀번호 확인 (동일하게 입력)" -AsSecureString
        $p1 = Get-PlainText $secPass1
        $p2 = Get-PlainText $secPass2
        if ($p1 -ne $p2) {
            Write-Host "  [ERROR] Passwords do not match. Please try again." -ForegroundColor Red
        } elseif ($p1.Length -lt 4) {
            Write-Host "  [ERROR] Password too short." -ForegroundColor Red
        } else {
            $pass = $p1
            $matched = $true
        }
        $p1 = $null; $p2 = $null
    }

    $label = Read-Host "  Label (e.g. daum-personal)"
    if (-not $label) { $label = $email.Split("@")[0] }

    $data = @{ action="add"; service=$svc; email=$email; pass=$pass; label=$label }
    $result = Invoke-Worker "add" $data

    # 패스워드 메모리에서 즉시 제거
    $pass = $null
    [GC]::Collect()

    Write-Host $result -ForegroundColor Green
}

function List-Accounts {
    $result = Invoke-Worker "list" @{}
    Write-Host ""
    Write-Host "-- Registered Accounts --" -ForegroundColor Yellow
    Write-Host $result
}

function Remove-Account {
    List-Accounts
    $idx = Read-Host "  Number to delete"
    $data = @{ index=[int]$idx }
    $result = Invoke-Worker "delete" $data
    Write-Host $result -ForegroundColor Yellow
}

# ── Main ──────────────────────────────────────────────
Show-Header

$running = $true
while ($running) {
    Show-Menu
    $choice = Read-Host "  Select"
    switch ($choice.Trim()) {
        "1" { Add-Account }
        "2" { List-Accounts }
        "3" { Remove-Account }
        "4" { $running = $false }
        default { Write-Host "Invalid selection" -ForegroundColor Red }
    }
}

Write-Host ""
Write-Host "Goodbye!" -ForegroundColor Cyan
Write-Host ""
