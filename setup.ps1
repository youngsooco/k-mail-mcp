# K-Mail-MCP Account Setup (PowerShell)
# Password input with masking via Read-Host -AsSecureString
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding            = [System.Text.Encoding]::UTF8
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$isKorean  = (Get-Culture).Name -like "ko*"
function T($ko, $en) { if ($isKorean) { $ko } else { $en } }

function Show-Header {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "   $(T \"한국 메일 MCP - 계정 설정\" \"Korean Mail MCP - Account Setup\")" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
}

function Show-Menu {
    Write-Host ""
    Write-Host "  1) $(T \"계정 추가 / 수정\" \"Add / Update account\")"
    Write-Host "  2) $(T \"계정 목록\" \"List accounts\")"
    Write-Host "  3) $(T \"계정 삭제\" \"Delete account\")"
    Write-Host "  4) $(T \"종료\" \"Exit\")"
    Write-Host ""
}

function Get-PlainText($secureString) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureString)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Invoke-Worker($action, $data) {
    $json = $data | ConvertTo-Json -Compress
    # 환경변수로 전달 (파일/파이프 인코딩 문제 완전 우회)
    $env:KMAIL_INPUT = $json
    $result = & node "$ScriptDir\setup-worker.js" $action
    $env:KMAIL_INPUT = $null
    return $result
}

function Add-Account {
    Write-Host ""
    Write-Host "-- $(T \"계정 추가 / 수정\" \"Add / Update Account\") --" -ForegroundColor Yellow
    Write-Host "  1) Naver  2) Daum/Kakao  3) Gmail  4) Nate  5) Yahoo  6) iCloud"
    $svc = Read-Host "  $(T \"서비스\" \"Service\")"

    $email = Read-Host "  $(T \"이메일 주소\" \"Email address\")"
    if (-not $email.Contains("@")) {
        Write-Host "[ERROR] $(T \"올바른 이메일 형식이 아닙니다\" \"Invalid email format\")" -ForegroundColor Red
        return
    }

    Write-Host "  [Note] If 2FA is enabled: use the app password from security settings, not your login password" -ForegroundColor DarkGray
    # 2-step password input to prevent typos (*** masking)
    $matched = $false
    $pass = ""
    while (-not $matched) {
        $secPass1 = Read-Host "  $(T \"계정 비밀번호\" \"Account password\")" -AsSecureString
        $secPass2 = Read-Host "  $(T "비밀번호 확인" "Confirm password")" -AsSecureString
        $p1 = Get-PlainText $secPass1
        $p2 = Get-PlainText $secPass2
        if ($p1 -ne $p2) {
            Write-Host "  [ERROR] $(T "비밀번호가 일치하지 않습니다." "Passwords do not match.")" -ForegroundColor Red
        } elseif ($p1.Length -lt 4) {
            Write-Host "  [ERROR] $(T "비밀번호가 너무 짧습니다." "Password too short.")" -ForegroundColor Red
        } else {
            $pass = $p1
            $matched = $true
        }
        $p1 = $null; $p2 = $null
    }

    $label = Read-Host "  $(T \"라벨 (예: 다음개인)\" \"Label (e.g. daum-personal)\")"
    if (-not $label) { $label = $email.Split("@")[0] }

    $data = @{ action="add"; service=$svc; email=$email; pass=$pass; label=$label }
    $result = Invoke-Worker "add" $data

    # Immediately clear password from memory
    $pass = $null
    [GC]::Collect()

    Write-Host $result -ForegroundColor Green
}

function List-Accounts {
    $result = Invoke-Worker "list" @{}
    Write-Host ""
    Write-Host "-- $(T \"등록된 계정\" \"Registered Accounts\") --" -ForegroundColor Yellow
    Write-Host $result
}

function Remove-Account {
    List-Accounts
    $idx = Read-Host "  $(T \"삭제할 번호\" \"Number to delete\")"
    $data = @{ index=[int]$idx }
    $result = Invoke-Worker "delete" $data
    Write-Host $result -ForegroundColor Yellow
}

# Main
Show-Header

$running = $true
while ($running) {
    Show-Menu
    $choice = Read-Host "  $(T \"선택\" \"Select\")"
    switch ($choice.Trim()) {
        "1" { Add-Account }
        "2" { List-Accounts }
        "3" { Remove-Account }
        "4" { $running = $false }
        default { Write-Host "$(T \"잘못된 선택입니다.\" \"Invalid selection\")" -ForegroundColor Red }
    }
}

Write-Host ""
Write-Host "$(T \"종료합니다.\" \"Goodbye!\")" -ForegroundColor Cyan
Write-Host ""
