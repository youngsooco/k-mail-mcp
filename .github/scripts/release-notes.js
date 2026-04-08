// .github/scripts/release-notes.js — ES Module
import https from "https";
import fs   from "fs";

const {
  ANTHROPIC_API_KEY, GITHUB_TOKEN,
  CURRENT_TAG, PREV_TAG, REPO_OWNER, REPO_NAME,
} = process.env;

function post(hostname, path, headers, body) {
  const payload = JSON.stringify(body);
  return new Promise((res, rej) => {
    const req = https.request({
      hostname, path, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), ...headers },
    }, (r) => {
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => res({ status: r.statusCode, body: d }));
    });
    req.on("error", rej);
    req.write(payload);
    req.end();
  });
}

async function callClaude(system, user) {
  const r = await post("api.anthropic.com", "/v1/messages",
    { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    { model: "claude-sonnet-4-20250514", max_tokens: 1024, system, messages: [{ role: "user", content: user }] }
  );
  if (r.status !== 200) throw new Error(`Claude API ${r.status}: ${r.body}`);
  return JSON.parse(r.body).content?.[0]?.text || "생성 실패";
}

async function githubPost(path, body) {
  return post("api.github.com", path,
    { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "k-mail-mcp-bot", Accept: "application/vnd.github+json" },
    body
  );
}

async function main() {
  const prevTag = PREV_TAG || "첫 릴리즈";
  const commits = fs.existsSync("/tmp/commits.txt") ? fs.readFileSync("/tmp/commits.txt", "utf-8").trim() : "(없음)";
  console.log(`릴리즈 노트: ${CURRENT_TAG}`);

  const system = `Write Korean release notes for K-Mail-MCP.
Format: ## 변경사항 with ### ✨ 새 기능 / 🐛 버그 수정 / 🔐 보안 / 📖 문서 (skip empty). Max 300 words.`;
  const user   = `Release: ${CURRENT_TAG} (from ${prevTag})\nCommits:\n${commits}`;
  const notes  = await callClaude(system, user);

  const compare = PREV_TAG
    ? `https://github.com/${REPO_OWNER}/${REPO_NAME}/compare/${PREV_TAG}...${CURRENT_TAG}`
    : `https://github.com/${REPO_OWNER}/${REPO_NAME}/commits/${CURRENT_TAG}`;

  const r = await githubPost(
    `/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
    {
      tag_name: CURRENT_TAG,
      name: `K-Mail-MCP ${CURRENT_TAG}`,
      body: `${notes}\n\n---\n**설치:** [INSTALL_GUIDE.md](https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/INSTALL_GUIDE.md)\n**전체 변경사항:** [${prevTag}...${CURRENT_TAG}](${compare})`,
      draft: false,
      prerelease: CURRENT_TAG.includes("-"),
    }
  );
  console.log(`릴리즈 생성: HTTP ${r.status}`);
}

main().catch(e => { console.error("오류:", e.message); process.exit(1); });
