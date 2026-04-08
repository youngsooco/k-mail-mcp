// .github/scripts/pr-review.js — ES Module
import https from "https";
import fs   from "fs";

const {
  ANTHROPIC_API_KEY, GITHUB_TOKEN,
  GITHUB_EVENT_PATH, REPO_OWNER, REPO_NAME,
} = process.env;

const event    = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, "utf-8"));
const prNumber = event.pull_request?.number;
const prTitle  = event.pull_request?.title        || "";
const prBody   = event.pull_request?.body         || "(없음)";
const prAuthor = event.pull_request?.user?.login  || "unknown";

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
    { model: "claude-sonnet-4-20250514", max_tokens: 2000, system, messages: [{ role: "user", content: user }] }
  );
  if (r.status !== 200) throw new Error(`Claude API ${r.status}: ${r.body}`);
  return JSON.parse(r.body).content?.[0]?.text || "리뷰 생성 실패";
}

async function githubPost(path, body) {
  return post("api.github.com", path,
    { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "k-mail-mcp-bot", Accept: "application/vnd.github+json" },
    body
  );
}

async function main() {
  console.log(`PR #${prNumber} 리뷰 중`);

  const changedFiles = fs.existsSync("/tmp/changed_files.txt") ? fs.readFileSync("/tmp/changed_files.txt", "utf-8").trim() : "(없음)";
  const diff         = fs.existsSync("/tmp/pr_diff.txt")       ? fs.readFileSync("/tmp/pr_diff.txt",       "utf-8").trim() : "(없음)";

  const system = `Senior code reviewer for K-Mail-MCP (Node.js ES module MCP plugin for Korean mail).
Review: 🔐 Security first, 🐛 bugs, ⚡ performance, 📖 readability.
Output Korean. End with LGTM ✅ / 수정 후 머지 가능 ⚠️ / 수정 필요 ❌. Max 600 words.`;

  const user = `PR #${prNumber} by @${prAuthor}: "${prTitle}"\n${prBody}\nFiles: ${changedFiles}\nDiff:\n${diff}`;
  const review = await callClaude(system, user);

  const r = await githubPost(
    `/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}/reviews`,
    { event: "COMMENT", body: `## 🤖 AI 코드 리뷰\n\n${review}\n\n---\n*Claude Sonnet 자동 검토. 메인테이너 최종 승인 필요.*` }
  );
  console.log(`리뷰 등록: HTTP ${r.status}`);
}

main().catch(e => { console.error("오류:", e.message); process.exit(1); });
