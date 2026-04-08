#!/bin/bash
# K-Mail-MCP Account Setup (macOS / Linux)
# stty -echo 로 패스워드 마스킹

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 로케일 감지
IS_KOREAN=false
[[ "$LANG" == ko_* || "$LANGUAGE" == ko* ]] && IS_KOREAN=true
T() { if $IS_KOREAN; then echo "$1"; else echo "$2"; fi }

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
  printf "$(T "  서비스: " "  Service: ")"
  read -r svc

  printf "$(T "  이메일 주소: " "  Email address: ")"
  read -r email

  if [[ "$email" != *"@"* ]]; then
    echo -e "${RED}[ERROR] Invalid email format${NC}"
    return
  fi

  echo -e "  ${YELLOW}[안내] 2단계 인증 사용 시: 보안 설정에서 별도 발급한 앱 비밀번호 입력${NC}"
  read_password "  계정 비밀번호: "
  local pass="$REPLY"

  printf "$(T "  라벨 (예: 다음개인): " "  Label (e.g. daum-personal): ")"
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
  printf "$(T "  삭제할 번호: " "  Number to delete: ")"
  read -r idx
  local json="{\"index\":$idx}"
  result=$(call_worker "delete" "$json")
  echo -e "${YELLOW}$result${NC}"
}

# ── 메인 루프 ──────────────────────────────────────────
print_header

while true; do
  echo ""
  echo "$(T "  1) 계정 추가 / 수정" "  1) Add / Update account")"
  echo "$(T "  2) 계정 목록" "  2) List accounts")"
  echo "$(T "  3) 계정 삭제" "  3) Delete account")"
  echo "$(T "  4) 종료" "  4) Exit")"
  echo ""
  printf "$(T "  선택: " "  Select: ")"
  read -r choice

  case "$choice" in
    1) add_account ;;
    2) list_accounts ;;
    3) remove_account ;;
    4) echo ""; echo -e "${CYAN}Goodbye!${NC}"; echo ""; break ;;
    *) echo -e "${RED}Invalid selection${NC}" ;;
  esac
done

# ── API 키 관리 ────────────────────────────────────────────────────
find_config() {
  local candidates=(
    "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    "$HOME/.config/Claude/claude_desktop_config.json"
  )
  for p in "${candidates[@]}"; do
    [ -f "$p" ] && echo "$p" && return
  done
  echo ""
}

set_api_key() {
  echo ""
  if [ "$LANG_KO" = "1" ]; then
    echo "-- AI 스팸 필터 설정 (Claude Haiku) --"
    echo "  [안내] API 키는 외부에 공유하지 마세요. config 파일에만 저장됩니다."
  else
    echo "-- AI Spam Filter (Claude Haiku API Key) --"
    echo "  [Note] Keep your API key private. Stored only in the config file."
  fi

  CFG=$(find_config)
  if [ -z "$CFG" ]; then
    [ "$LANG_KO" = "1" ] && echo "  [ERROR] claude_desktop_config.json 없음. install.sh 먼저 실행하세요." \
                          || echo "  [ERROR] config not found. Run install.sh first."
    return
  fi

  # 현재 키 상태 출력
  CURRENT_KEY=$(node -e "
    const c = JSON.parse(require('fs').readFileSync('$CFG','utf-8'));
    const k = c?.mcpServers?.['k-mail-mcp']?.env?.ANTHROPIC_API_KEY || '';
    console.log(k);
  " 2>/dev/null)

  if [ -n "$CURRENT_KEY" ]; then
    MASKED="${CURRENT_KEY:0:12}****"
    [ "$LANG_KO" = "1" ] && echo "  현재 상태: [활성] $MASKED" || echo "  Status: [active] $MASKED"
  else
    [ "$LANG_KO" = "1" ] && echo "  현재 상태: [비활성 — Haiku 판단 꺼짐]" || echo "  Status: [disabled]"
  fi

  # 키 입력 (숨김)
  [ "$LANG_KO" = "1" ] && PROMPT="  API 키 입력 (비워두면 비활성화): " || PROMPT="  API Key (blank to disable): "
  read -rsp "$PROMPT" NEW_KEY
  echo ""

  # Node로 config 업데이트
  node << JSEOF
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('$CFG', 'utf-8'));
if (!cfg.mcpServers?.['k-mail-mcp']) {
  console.error('k-mail-mcp not found in config. Run install.sh first.');
  process.exit(1);
}
const mcp = cfg.mcpServers['k-mail-mcp'];
if (!mcp.env) mcp.env = {};
const key = '${NEW_KEY}'.trim();
if (key) {
  mcp.env.ANTHROPIC_API_KEY = key;
  console.log('[OK] API key saved. Restart Claude Desktop.');
} else {
  delete mcp.env.ANTHROPIC_API_KEY;
  console.log('[OK] API key removed.');
}
fs.writeFileSync('$CFG', JSON.stringify(cfg, null, 2), 'utf-8');
JSEOF
}