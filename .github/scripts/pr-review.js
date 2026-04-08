// .github/scripts/pr-review.js
// K-Mail-MCP — PR 자동 코드 리뷰 스크립트

const https = require("https");
const fs    = require("fs");

const {
  ANTHROPIC_API_KEY,
  GITHUB_TOKEN,
  PR_NUMBER,
  PR_TITLE,
  PR_BODY,
  PR_AUTHOR,
  REPO_OWNER,
  REPO_NAME,
  CHANGED_FILES_PATH,
  DIFF_PATH,
} = process.env;

async function callClaude(systemPrompt, userPrompt) {
  const body = JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Anthropic API error ${res.statusCode}: ${data}`));
            return;
          }
          const parsed = JSON.parse(data);
          resolve(parsed.content?.[0]?.text || "리뷰를 생성할 수 없었습니다.");
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function githubRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname: "api.github.com",
        path,
        method,
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "k-mail-mcp-bot",
          Accept: "application/vnd.github+json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log(`PR #${PR_NUMBER} 리뷰 생성 중...`);

  const changedFiles = fs.existsSync(CHANGED_FILES_PATH)
    ? fs.readFileSync(CHANGED_FILES_PATH, "utf-8").trim()
    : "(파일 목록 없음)";

  const diff = fs.existsSync(DIFF_PATH)
    ? fs.readFileSync(DIFF_PATH, "utf-8").trim()
    : "(diff 없음)";

  const systemPrompt = `You are a senior code reviewer for K-Mail-MCP, a Node.js MCP plugin for Korean mail services.

Architecture:
- index.js: MCP server with 5 tools (check_new_mails, list_accounts, read_email, reset_last_run, list_mailboxes)
- setup.js: CLI for account registration with AES-256-GCM encryption
- Both email address (encUser) and password (encPass) are encrypted
- .master.key: 256-bit key, instance-specific, never committed
- IMAP connections are per-request, always closed in finally blocks

Review priorities:
1. SECURITY: credential handling, encryption, key exposure, plaintext leaks
2. BUGS: IMAP connection leaks, unhandled rejections, edge cases
3. PERFORMANCE: unnecessary full-body fetches, missing connection cleanup
4. READABILITY: naming, comments, consistency
5. CORRECTNESS: IMAP protocol usage, date filtering, MCP tool schemas

Output format (Korean):
- Brief overall assessment (1-2 sentences)
- Findings with emoji: 🔐 보안 / 🐛 버그 / 성능 / 📖 가독성 / 일반
- Each finding: issue description + concrete suggestion
- End with: LGTM / 수정 후 머지 가능 / 수정 필요
- Under 600 words`;

  const userPrompt = `PR #${PR_NUMBER} by @${PR_AUTHOR}: "${PR_TITLE}"

Description: ${PR_BODY || "(없음)"}

Changed files:
${changedFiles}

Diff:
${diff || "(문서 변경만 포함)"}

Please review focusing on security, correctness, and code quality.`;

  const review = await callClaude(systemPrompt, userPrompt);

  const reviewBody = `## 🤖 AI 코드 리뷰\n\n${review}\n\n---\n*Claude Sonnet이 자동으로 검토했습니다. 메인테이너의 최종 승인이 필요합니다.*`;

  const result = await githubRequest(
    "POST",
    `/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${PR_NUMBER}/reviews`,
    { event: "COMMENT", body: reviewBody }
  );
  console.log(`PR 리뷰 등록: ${result.status}`);
  console.log(`PR #${PR_NUMBER} 리뷰 완료`);
}

main().catch((err) => {
  console.error("오류:", err.message);
  process.exit(1);
});
