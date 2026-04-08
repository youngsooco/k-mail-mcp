// .github/scripts/issue-response.js
// K-Mail-MCP — 이슈 자동 응답 스크립트

const https = require("https");

const {
  ANTHROPIC_API_KEY,
  GITHUB_TOKEN,
  ISSUE_TITLE,
  ISSUE_BODY,
  ISSUE_NUMBER,
  ISSUE_AUTHOR,
  REPO_OWNER,
  REPO_NAME,
} = process.env;

// ── Claude API 호출 ────────────────────────────────────────────────────────
async function callClaude(systemPrompt, userPrompt) {
  const body = JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
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
          resolve(parsed.content?.[0]?.text || "응답을 생성할 수 없었습니다.");
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── GitHub API 호출 ───────────────────────────────────────────────────────
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

// ── 메인 ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`이슈 #${ISSUE_NUMBER} 응답 생성 중...`);

  const systemPrompt = `You are a helpful maintainer assistant for K-Mail-MCP, an open-source MCP plugin that connects Korean mail services (Naver, Daum/Kakao, Gmail) to Claude AI via IMAP.

Project context:
- MCP server written in Node.js (ES modules)
- Uses IMAP protocol to connect Naver, Daum, Gmail
- AES-256-GCM encryption for stored credentials (email + password)
- Tools: check_new_mails, list_accounts, read_email, reset_last_run, list_mailboxes
- Runs as Claude Desktop plugin (stdio transport)
- Supports Windows, macOS, Linux (iOS/Android: not yet)

Common issues:
- IMAP auth errors: usually wrong app password or IMAP not enabled in mail settings
- MCP not showing in Claude Desktop: wrong path in claude_desktop_config.json or not restarted
- .master.key missing: need to run node setup.js first
- Daum mail folder name: auto-detected but may need list_mailboxes to verify
- Windows path requires double backslash in JSON config

When responding:
1. Write in Korean
2. Be friendly and specific with concrete steps
3. If bug report: acknowledge and ask for OS, Node.js version, error message
4. If feature request: evaluate feasibility against IMAP-based architecture
5. If question: answer directly with numbered steps
6. End with: 추가로 궁금한 점이 있으면 편하게 댓글 달아주세요 🙏
7. Keep response under 400 words
8. Do NOT say you are an AI`;

  const userPrompt = `New GitHub issue from @${ISSUE_AUTHOR}:

Title: ${ISSUE_TITLE}

Body:
${ISSUE_BODY || "(본문 없음)"}

Please respond helpfully to this issue.`;

  const reply = await callClaude(systemPrompt, userPrompt);

  const comment = `${reply}\n\n---\n*🤖 이 답변은 AI 메인테이너가 자동으로 작성했습니다. 답변이 부정확하면 댓글로 알려주세요.*`;

  // 이슈에 코멘트 달기
  const commentResult = await githubRequest(
    "POST",
    `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_NUMBER}/comments`,
    { body: comment }
  );
  console.log(`코멘트 등록: ${commentResult.status}`);

  // 라벨 추가 (없으면 무시)
  const labelResult = await githubRequest(
    "POST",
    `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_NUMBER}/labels`,
    { labels: ["needs-triage"] }
  );
  console.log(`라벨 추가: ${labelResult.status}`);

  console.log(`이슈 #${ISSUE_NUMBER} 응답 완료`);
}

main().catch((err) => {
  console.error("오류:", err.message);
  process.exit(1);
});
