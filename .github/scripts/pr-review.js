// .github/scripts/pr-review.js
const https = require("https");
const fs    = require("fs");

const {
  ANTHROPIC_API_KEY,
  GITHUB_TOKEN,
  GITHUB_EVENT_PATH,
  REPO_OWNER,
  REPO_NAME,
} = process.env;

const event     = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, "utf-8"));
const prNumber  = event.pull_request?.number;
const prTitle   = event.pull_request?.title   || "";
const prBody    = event.pull_request?.body    || "(없음)";
const prAuthor  = event.pull_request?.user?.login || "unknown";

function callClaude(system, user) {
  const body = JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
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
        resolve(JSON.parse(data).content?.[0]?.text || "리뷰 생성 실패");
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
  console.log(`PR #${prNumber} 리뷰 생성 중`);

  const changedFiles = fs.existsSync("/tmp/changed_files.txt")
    ? fs.readFileSync("/tmp/changed_files.txt", "utf-8").trim() : "(없음)";
  const diff = fs.existsSync("/tmp/pr_diff.txt")
    ? fs.readFileSync("/tmp/pr_diff.txt", "utf-8").trim() : "(없음)";

  const system = `You are a senior code reviewer for K-Mail-MCP, a Node.js MCP plugin for Korean mail services.

Review priorities:
1. SECURITY: credential handling, encryption, key exposure, plaintext leaks
2. BUGS: IMAP connection leaks, unhandled rejections, edge cases
3. PERFORMANCE: unnecessary fetches, missing cleanup
4. READABILITY and CORRECTNESS

Output format (Korean):
- Brief overall assessment
- Findings: 🔐 보안 / 🐛 버그 / ⚡ 성능 / 📖 가독성
- End with: LGTM ✅ / 수정 후 머지 가능 ⚠️ / 수정 필요 ❌
- Max 600 words`;

  const user = `PR #${prNumber} by @${prAuthor}: "${prTitle}"
Description: ${prBody}
Changed: ${changedFiles}
Diff:
${diff}`;

  const review = await callClaude(system, user);
  const reviewBody = `## 🤖 AI 코드 리뷰\n\n${review}\n\n---\n*Claude Sonnet 자동 검토. 메인테이너 최종 승인 필요.*`;

  const r = await githubPost(
    `/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}/reviews`,
    { event: "COMMENT", body: reviewBody }
  );
  console.log(`PR 리뷰 등록: HTTP ${r.status}`);
}

main().catch(e => { console.error("오류:", e.message); process.exit(1); });
