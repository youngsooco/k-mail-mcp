// .github/scripts/release-notes.js
const https = require("https");
const fs    = require("fs");

const {
  ANTHROPIC_API_KEY,
  GITHUB_TOKEN,
  CURRENT_TAG,
  PREV_TAG,
  REPO_OWNER,
  REPO_NAME,
} = process.env;

function callClaude(system, user) {
  const body = JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: user }],
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        if (res.statusCode !== 200) { reject(new Error(`Claude API ${res.statusCode}: ${data}`)); return; }
        resolve(JSON.parse(data).content?.[0]?.text || "릴리즈 노트 생성 실패");
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function githubPost(path, body) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.github.com",
      path,
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "k-mail-mcp-bot",
        Accept: "application/vnd.github+json",
        "Content-Length": Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const prevTag = PREV_TAG || "첫 릴리즈";
  const commits = fs.existsSync("/tmp/commits.txt")
    ? fs.readFileSync("/tmp/commits.txt", "utf-8").trim() : "(없음)";

  console.log(`릴리즈 노트 생성: ${CURRENT_TAG}`);

  const system = `Write release notes in Korean for K-Mail-MCP based on git commits.

Format:
## 변경사항
### ✨ 새 기능
### 🐛 버그 수정
### 🔐 보안
### 📖 문서
(빈 섹션 생략)

Rules: user-facing descriptions, not raw commit messages. Max 300 words.`;

  const user = `Release: ${CURRENT_TAG} (from ${prevTag})\nCommits:\n${commits}`;

  const notes  = await callClaude(system, user);
  const compare = PREV_TAG
    ? `https://github.com/${REPO_OWNER}/${REPO_NAME}/compare/${PREV_TAG}...${CURRENT_TAG}`
    : `https://github.com/${REPO_OWNER}/${REPO_NAME}/commits/${CURRENT_TAG}`;

  const releaseBody = `${notes}\n\n---\n**설치:** [INSTALL_GUIDE.md](https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/INSTALL_GUIDE.md)\n**전체 변경사항:** [${prevTag}...${CURRENT_TAG}](${compare})`;

  const r = await githubPost(
    `/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
    {
      tag_name:   CURRENT_TAG,
      name:       `K-Mail-MCP ${CURRENT_TAG}`,
      body:       releaseBody,
      draft:      false,
      prerelease: CURRENT_TAG.includes("-"),
    }
  );
  console.log(`릴리즈 생성: HTTP ${r.status}`);
}

main().catch(e => { console.error("오류:", e.message); process.exit(1); });
