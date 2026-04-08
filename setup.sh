#!/bin/bash
# K-Mail-MCP Account Setup (macOS / Linux)
# stty -echo 로 패스워드 마스킹

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── 컬러 출력 ─────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m';  RED='\033[0;31m'; NC='\033[0m'

# ── 헬퍼 ──────────────────────────────────────────────
print_header() {
  echo ""
  echo -e "${CYAN}============================================${NC}"
  echo -e "${CYAN}   Korean Mail MCP - Account Setup${NC}"
  echo -e "${CYAN}============================================${NC}"
  echo ""
}

# 패스워드 2회 입력 (마스킹) + 일치 확인
read_password() {
  local prompt="$1"
  local pass1 pass2
  while true; do
    printf "%s" "$prompt"
    stty -echo
    read -r pass1
    stty echo
    echo ""

    printf "  Confirm password: "
    stty -echo
    read -r pass2
    stty echo
    echo ""

    if [ "$pass1" != "$pass2" ]; then
      echo -e "${RED}  [ERROR] Passwords do not match. Please try again.${NC}"
    elif [ ${#pass1} -lt 4 ]; then
      echo -e "${RED}  [ERROR] Password too short.${NC}"
    else
      REPLY="$pass1"
      break
    fi
  done
}

# setup-worker.js 호출 (stdin으로 JSON 전달)
call_worker() {
  local action="$1"
  local json="$2"
  echo "$json" | node "$SCRIPT_DIR/setup-worker.js" "$action"
}

# ── 계정 추가 ──────────────────────────────────────────
add_account() {
  echo ""
  echo -e "${YELLOW}-- Add / Update Account --${NC}"
  echo "  1) Naver  2) Daum/Kakao  3) Gmail  4) Nate  5) Yahoo  6) iCloud"
  printf "  Service: "
  read -r svc

  printf "  Email address: "
  read -r email

  if [[ "$email" != *"@"* ]]; then
    echo -e "${RED}[ERROR] Invalid email format${NC}"
    return
  fi

  echo -e "  ${YELLOW}[안내] 2단계 인증 사용 시: 보안 설정에서 별도 발급한 앱 비밀번호 입력${NC}"
  read_password "  계정 비밀번호: "
  local pass="$REPLY"

  printf "  Label (e.g. daum-personal): "
  read -r label
  [ -z "$label" ] && label="${email%%@*}"

  local json="{\"action\":\"add\",\"service\":\"$svc\",\"email\":\"$email\",\"pass\":\"$pass\",\"label\":\"$label\"}"
  result=$(call_worker "add" "$json")
  echo -e "${GREEN}$result${NC}"

  # 패스워드 변수 즉시 초기화
  pass=""
  unset pass
}

# ── 계정 목록 ──────────────────────────────────────────
list_accounts() {
  echo ""
  echo -e "${YELLOW}-- Registered Accounts --${NC}"
  call_worker "list" "{}"
}

# ── 계정 삭제 ──────────────────────────────────────────
remove_account() {
  list_accounts
  printf "  Number to delete: "
  read -r idx
  local json="{\"index\":$idx}"
  result=$(call_worker "delete" "$json")
  echo -e "${YELLOW}$result${NC}"
}

# ── 메인 루프 ──────────────────────────────────────────
print_header

while true; do
  echo ""
  echo "  1) Add / Update account"
  echo "  2) List accounts"
  echo "  3) Delete account"
  echo "  4) Exit"
  echo ""
  printf "  Select: "
  read -r choice

  case "$choice" in
    1) add_account ;;
    2) list_accounts ;;
    3) remove_account ;;
    4) echo ""; echo -e "${CYAN}Goodbye!${NC}"; echo ""; break ;;
    *) echo -e "${RED}Invalid selection${NC}" ;;
  esac
done
