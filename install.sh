#!/bin/bash
# K-Mail-MCP 자동 설치 스크립트 (macOS / Linux)

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║      K-Mail-MCP 자동 설치 프로그램       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Node.js 확인 ──────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
    echo "[오류] Node.js가 설치되어 있지 않습니다."
    echo "       https://nodejs.org 에서 LTS 버전을 설치하거나"
    echo "       brew install node 를 실행하세요."
    exit 1
fi
echo "[OK] Node.js $(node --version) 확인"

# ── npm install ───────────────────────────────────────────────────
echo ""
echo "[1/3] 의존성 패키지 설치 중..."
npm install --silent
echo "[OK] 패키지 설치 완료"

# ── Claude Desktop 설정 파일 경로 탐색 ───────────────────────────
echo ""
echo "[2/3] Claude Desktop 설정 파일 탐색 중..."

# macOS / Linux 경로 후보
CONFIG_DIR=""
CANDIDATES=(
    "$HOME/Library/Application Support/Claude"
    "$HOME/.config/Claude"
    "$HOME/.config/anthropic/claude"
)

for DIR in "${CANDIDATES[@]}"; do
    if [ -d "$DIR" ]; then
        CONFIG_DIR="$DIR"
        break
    fi
done

# 없으면 macOS 기본 경로에 생성
if [ -z "$CONFIG_DIR" ]; then
    CONFIG_DIR="$HOME/Library/Application Support/Claude"
    mkdir -p "$CONFIG_DIR"
    echo "[생성] 설정 폴더 생성: $CONFIG_DIR"
fi

CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
echo "[OK] 설정 경로: $CONFIG_FILE"

# ── claude_desktop_config.json 업데이트 ───────────────────────────
echo ""
echo "[3/3] Claude Desktop 설정 업데이트 중..."

CURRENT_DIR="$(cd "$(dirname "$0")" && pwd)"
INDEX_PATH="$CURRENT_DIR/index.js"

node -e "
const fs = require('fs');
const configPath = '$CONFIG_FILE';
const indexPath  = '$INDEX_PATH';

let config = {};
if (fs.existsSync(configPath)) {
    try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
    catch(e) { config = {}; }
}
if (!config.mcpServers) config.mcpServers = {};
config.mcpServers['k-mail-mcp'] = {
    command: 'node',
    args: [indexPath]
};
fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
console.log('[OK] 설정 업데이트 완료');
"

# ── 완료 안내 ─────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║            설치 완료!                    ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "다음 단계:"
echo "  1. 메일 계정 등록:"
echo "     node setup.js"
echo ""
echo "  2. Claude Desktop을 완전히 종료 후 재시작"
echo ""
echo "  3. Claude에게 말해보세요:"
echo "     새 메일 확인해줘"
echo ""
