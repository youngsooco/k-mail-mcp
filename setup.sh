#!/bin/bash
# K-Mail-MCP Account Setup (macOS / Linux)
# stty -echo 로 패스워드 마스킹

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── 로케일 감지 ────────────────────────────────────────
IS_KOREAN=false
[[ "$LANG" == ko_* || "$LANGUAGE" == ko* ]] && IS_KOREAN=true
T() { if $IS_KOREAN; then echo "$1"; else echo "$2"; fi }

# ── 컬러 ───────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m';  RED='\033[0;31m'; GRAY='\033[0;90m'; NC='\033[0m'

# ── 헬퍼 ───────────────────────────────────────────────
print_header() {
  echo ""
  echo -e "${CYAN}============================================${NC}"
  echo -e "${CYAN}   $(T "한국 메일 MCP - 계정 설정" "Korean Mail MCP - Account Setup")${NC}"
  echo -e "${CYAN}============================================${NC}"
}

read_password() {
  local prompt="$1"
  local pass1 pass2
  while true; do
    printf "%s" "$prompt"
    stty -echo; read -r pass1; stty echo; echo ""
    printf "  $(T "비밀번호 확인: " "Confirm password: ")"
    stty -echo; read -r pass2; stty echo; echo ""
    if [ "$pass1" != "$pass2" ]; then
      echo -e "${RED}  $(T "[ERROR] 비밀번호가 일치하지 않습니다." "[ERROR] Passwords do not match.")${NC}"
    elif [ ${#pass1} -lt 4 ]; then
      echo -e "${RED}  $(T "[ERROR] 비밀번호가 너무 짧습니다." "[ERROR] Password too short.")${NC}"
    else
      REPLY="$pass1"; break
    fi
  done
}

# setup-worker.js 호출 (환경변수로 JSON 전달)
call_worker() {
  local action="$1"
  local json="$2"
  KMAIL_INPUT="$json" node "$SCRIPT_DIR/setup-worker.js" "$action"
}

# ── 계정 추가 / 수정 ───────────────────────────────────
add_account() {
  echo ""
  echo -e "${YELLOW}-- $(T "계정 추가 / 수정" "Add / Update Account") --${NC}"
  echo "  1) Naver  2) Daum/Kakao  3) Gmail  4) Nate  5) Yahoo  6) iCloud"
  printf "  $(T "서비스: " "Service: ")"; read -r svc

  printf "  $(T "이메일 주소: " "Email address: ")"; read -r email
  if [[ "$email" != *"@"* ]]; then
    echo -e "${RED}  $(T "[ERROR] 올바른 이메일 형식이 아닙니다." "[ERROR] Invalid email format.")${NC}"
    return
  fi

  echo -e "  ${YELLOW}$(T "[안내] 앱 비밀번호 입력 (일반 로그인 비밀번호 아님)" "[Note] Use app password, not your login password")${NC}"
  read_password "  $(T "계정 비밀번호: " "Account password: ")"
  local pass="$REPLY"

  printf "  $(T "라벨 (예: 다음개인): " "Label (e.g. daum-personal): ")"; read -r label
  [ -z "$label" ] && label="${email%%@*}"

  local json="{\"action\":\"add\",\"service\":\"$svc\",\"email\":\"$email\",\"pass\":\"$pass\",\"label\":\"$label\"}"
  result=$(call_worker "add" "$json")
  echo -e "${GREEN}$result${NC}"
  pass=""; unset pass
}

# ── 계정 목록 ───────────────────────────────────────────
list_accounts() {
  echo ""
  echo -e "${YELLOW}-- $(T "등록된 계정" "Registered Accounts") --${NC}"
  call_worker "list" "{}"

  # API 키 상태도 함께 표시
  local api_status
  api_status=$(call_worker "get-api-key-status" "{}" 2>/dev/null)
  if [ -n "$api_status" ]; then
    echo ""
    if [[ "$api_status" == *"활성"* || "$api_status" == *"active"* ]]; then
      echo -e "  $(T "AI 스팸 필터:" "AI Spam Filter:") ${GREEN}${api_status}${NC}"
    else
      echo -e "  $(T "AI 스팸 필터:" "AI Spam Filter:") ${GRAY}${api_status}${NC}"
    fi
  fi
}

# ── 계정 삭제 ───────────────────────────────────────────
remove_account() {
  list_accounts
  printf "  $(T "삭제할 번호: " "Number to delete: ")"; read -r idx
  result=$(call_worker "delete" "{\"index\":$idx}")
  echo -e "${YELLOW}$result${NC}"
}

# ── AI 스팸 필터 (API 키) ───────────────────────────────
set_api_key() {
  echo ""
  echo -e "${YELLOW}-- $(T "AI 스팸 필터 설정 (Claude Haiku)" "AI Spam Filter Setup (Claude Haiku)") --${NC}"
  echo -e "  ${GRAY}$(T \
    "[안내] API 키는 AES-256-GCM으로 암호화되어 settings.enc.json에 저장됩니다." \
    "[Note] API key is AES-256-GCM encrypted and stored in settings.enc.json.")${NC}"
  echo -e "  ${GRAY}$(T \
    "         GitHub에 올라가지 않으며, claude_desktop_config.json에 평문 저장 안 함." \
    "         Not uploaded to GitHub. Not stored in plain text in config.")${NC}"

  # 현재 상태 조회
  local status
  status=$(call_worker "get-api-key-status" "{}" 2>/dev/null)
  if [[ "$status" == *"활성"* || "$status" == *"active"* ]]; then
    echo -e "  $(T "현재 상태:" "Current status:") ${GREEN}${status}${NC}"
  else
    echo -e "  $(T "현재 상태:" "Current status:") ${GRAY}$(T "[비활성 — Haiku 판단 꺼짐]" "[disabled]")${NC}"
  fi

  # 키 입력 (숨김)
  printf "  $(T "API 키 입력 (비워두면 비활성화): " "API Key (leave blank to disable): ")"
  stty -echo; read -r NEW_KEY; stty echo; echo ""

  # setup-worker.js 통해 암호화 저장
  local json="{\"key\":\"$NEW_KEY\"}"
  result=$(call_worker "set-api-key" "$json")
  if [[ "$result" == *"[OK]"* ]]; then
    echo -e "${GREEN}  $result${NC}"
  else
    echo -e "${YELLOW}  $result${NC}"
  fi

  NEW_KEY=""; unset NEW_KEY
}

# ── 메인 루프 ───────────────────────────────────────────
print_header

while true; do
  # API 키 상태 실시간 조회 (메뉴 옆에 표기)
  api_status=$(call_worker "get-api-key-status" "{}" 2>/dev/null)
  if [[ "$api_status" == *"활성"* || "$api_status" == *"active"* ]]; then
    api_suffix="  ${GREEN}(${api_status})${NC}"
    api_color="$GREEN"
  else
    api_suffix="  ${GRAY}($(T "미등록" "not set"))${NC}"
    api_color="$GRAY"
  fi

  echo ""
  echo "  $(T "1) 계정 추가 / 수정" "1) Add / Update account")"
  echo "  $(T "2) 계정 목록" "2) List accounts")"
  echo "  $(T "3) 계정 삭제" "3) Delete account")"
  printf "  $(T "4) AI 스팸 필터 설정 (Claude Haiku API 키)" "4) AI Spam Filter (Claude Haiku API Key)")"
  echo -e "$api_suffix"
  echo "  $(T "5) 종료" "5) Exit")"
  echo ""

  printf "  $(T "선택: " "Select: ")"; read -r choice

  case "$choice" in
    1) add_account ;;
    2) list_accounts ;;
    3) remove_account ;;
    4) set_api_key ;;
    5) echo ""; echo -e "${CYAN}$(T "종료합니다." "Goodbye!")${NC}"; echo ""; break ;;
    *) echo -e "${RED}$(T "잘못된 선택입니다." "Invalid selection")${NC}" ;;
  esac
done