# K-Mail-MCP Account Setup (PowerShell)
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding            = [System.Text.Encoding]::UTF8
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── 로케일 감지 → 언어 변수 일괄 정의 ────────────────────────────
if ((Get-Culture).Name -like "ko*") {
    $L_TITLE   = "한국 메일 MCP - 계정 설정"
    $L_MENU1   = "  1) 계정 추가 / 수정"
    $L_MENU2   = "  2) 계정 목록"
    $L_MENU3   = "  3) 계정 삭제"
    $L_MENU4   = "  4) 종료"
    $L_ADD_HDR = "-- 계정 추가 / 수정 --"
    $L_SVC     = "  서비스"
    $L_EMAIL   = "  이메일 주소"
    $L_PASS    = "  계정 비밀번호"
    $L_CONF    = "  비밀번호 확인"
    $L_NOTE    = "  [안내] 2단계 인증 사용 시: 보안 설정의 앱 비밀번호 입력"
    $L_LABEL   = "  라벨 (예: 다음개인)"
    $L_MISMATCH= "  [ERROR] 비밀번호가 일치하지 않습니다. 다시 입력해주세요."
    $L_SHORT   = "  [ERROR] 비밀번호가 너무 짧습니다."
    $L_INV_EMAIL="[ERROR] 올바른 이메일 형식이 아닙니다"
    $L_LIST_HDR= "-- 등록된 계정 --"
    $L_DEL_NUM = "  삭제할 번호"
    $L_SELECT  = "  선택"
    $L_INVALID = "잘못된 선택입니다."
    $L_BYE     = "종료합니다."
} else {
    $L_TITLE   = "Korean Mail MCP - Account Setup"
    $L_MENU1   = "  1) Add / Update account"
    $L_MENU2   = "  2) List accounts"
    $L_MENU3   = "  3) Delete account"
    $L_MENU4   = "  4) Exit"
    $L_ADD_HDR = "-- Add / Update Account --"
    $L_SVC     = "  Service"
    $L_EMAIL   = "  Email address"
    $L_PASS    = "  Account password"
    $L_CONF    = "  Confirm password"
    $L_NOTE    = "  [Note] If 2FA is enabled: use the app password from security settings"
    $L_LABEL   = "  Label (e.g. daum-personal)"
    $L_MISMATCH= "  [ERROR] Passwords do not match. Please try again."
    $L_SHORT   = "  [ERROR] Password too short."
    $L_INV_EMAIL="[ERROR] Invalid email format"
    $L_LIST_HDR= "-- Registered Accounts --"
    $L_DEL_NUM = "  Number to delete"
    $L_SELECT  = "  Select"
    $L_INVALID = "Invalid selection"
    $L_BYE     = "Goodbye!"
}

function Show-Header {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "   $L_TITLE" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
}

function Show-Menu {
    Write-Host ""
    Write-Host $L_MENU1
    Write-Host $L_MENU2
    Write-Host $L_MENU3
    Write-Host $L_MENU4
    Write-Host ""
}

function Get-PlainText($secureString) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureString)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Invoke-Worker($action, $data) {
    $json = $data | ConvertTo-Json -Compress
    $env:KMAIL_INPUT = $json
    $result = & node "$ScriptDir\setup-worker.js" $action
    $env:KMAIL_INPUT = $null
    return $result
}

function Add-Account {
    Write-Host ""
    Write-Host $L_ADD_HDR -ForegroundColor Yellow
    Write-Host "  1) Naver  2) Daum/Kakao  3) Gmail  4) Nate  5) Yahoo  6) iCloud"
    $svc = Read-Host $L_SVC

    $email = Read-Host $L_EMAIL
    if (-not $email.Contains("@")) {
        Write-Host $L_INV_EMAIL -ForegroundColor Red
        return
    }

    Write-Host $L_NOTE -ForegroundColor DarkGray
    $matched = $false
    $pass = ""
    while (-not $matched) {
        $secPass1 = Read-Host $L_PASS -AsSecureString
        $secPass2 = Read-Host $L_CONF -AsSecureString
        $p1 = Get-PlainText $secPass1
        $p2 = Get-PlainText $secPass2
        if ($p1 -ne $p2) {
            Write-Host $L_MISMATCH -ForegroundColor Red
        } elseif ($p1.Length -lt 4) {
            Write-Host $L_SHORT -ForegroundColor Red
        } else {
            $pass = $p1
            $matched = $true
        }
        $p1 = $null; $p2 = $null
    }

    $label = Read-Host $L_LABEL
    if (-not $label) { $label = $email.Split("@")[0] }

    $data = @{ action="add"; service=$svc; email=$email; pass=$pass; label=$label }
    $result = Invoke-Worker "add" $data
    $pass = $null
    [GC]::Collect()
    Write-Host $result -ForegroundColor Green
}

function List-Accounts {
    $result = Invoke-Worker "list" @{}
    Write-Host ""
    Write-Host $L_LIST_HDR -ForegroundColor Yellow
    Write-Host $result
}

function Remove-Account {
    List-Accounts
    $idx = Read-Host $L_DEL_NUM
    $data = @{ index=[int]$idx }
    $result = Invoke-Worker "delete" $data
    Write-Host $result -ForegroundColor Yellow
}

# ── Main ──────────────────────────────────────────────────────────
Show-Header

$running = $true
while ($running) {
    Show-Menu
    $choice = Read-Host $L_SELECT
    switch ($choice.Trim()) {
        "1" { Add-Account }
        "2" { List-Accounts }
        "3" { Remove-Account }
        "4" { $running = $false }
        default { Write-Host $L_INVALID -ForegroundColor Red }
    }
}

Write-Host ""
Write-Host $L_BYE -ForegroundColor Cyan
Write-Host ""
