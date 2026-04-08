// .github/scripts/issue-response.js
// GITHUB_EVENT_PATH 로 이벤트 전체를 읽어 특수문자 문제 방지

const https = require("https");
const fs    = require("fs");

const {
  ANTHROPIC_API_KEY,
  GITHUB_TOKEN,
  GITHUB_EVENT_PATH,  // GitHub이 자동 제공하는 이벤트 JSON 파일 경로
  REPO_OWNER,
  REPO_NAME,
} = process.env;

// 이벤트 페이로드 파일에서 직접 읽기 (env var 특수문자 문제 없음)
const event        = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, "utf-8"));
const issueTitle   = event.issue?.title   || "";
const issueBody    = event.issue?.body    || "(본문 없음)";
const issueNumber  = event.issue?.number;
const issueAuthor  = event.issue?.user?.login || "unknown";

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
        resolve(JSON.parse(data).content?.[0]?.text || "응답 생성 실패");
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
  console.log(`이슈 #${issueNumber} 처리 중 (by @${issueAuthor})`);

  const system = `You are a helpful maintainer assistant for K-Mail-MCP, an open-source MCP plugin that connects Korean mail services (Naver, Daum/Kakao, Gmail) to Claude AI via IMAP.

Project context:
- Node.js MCP server using IMAP protocol
- AES-256-GCM encryption for credentials (email address + password both encrypted)
- Tools: check_new_mails, list_accounts, read_email, reset_last_run, list_mailboxes
- Claude Desktop plugin (stdio transport)
- Supports Windows, macOS, Linux. iOS/Android: not yet supported

Common issues and solutions:
- IMAP auth error: wrong app password or IMAP not enabled in mail settings
- MCP not in Claude Desktop: wrong path in claude_desktop_config.json or app not restarted
- .master.key missing: run node setup.js first
- Daum folder name: auto-detected, use list_mailboxes to verify
- Windows path: double backslash required in JSON

Rules:
- Write in Korean
- Be friendly and specific with numbered steps
- Bug report: ask for OS, Node.js version, full error message
- Feature request: evaluate against IMAP architecture
- End with: 추가로 궁금한 점이 있으면 편하게 댓글 달아주세요 🙏
- Max 400 words
- Do NOT mention being an AI`;

  const user = `New GitHub issue from @${issueAuthor}:

Title: ${issueTitle}

Body:
${issueBody}

Please respond helpfully.`;

  const reply = await callClaude(system, user);
  const comment = `${reply}\n\n---\n*🤖 이 답변은 AI 메인테이너가 자동으로 작성했습니다. 부정확하면 댓글로 알려주세요.*`;

  const r = await githubPost(
    `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`,
    { body: comment }
  );
  console.log(`코멘트 등록: HTTP ${r.status}`);

  // 라벨 추가 (없으면 무시)
  try {
    await githubPost(
      `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/labels`,
      { labels: ["needs-triage"] }
    );
  } catch {}

  console.log(`이슈 #${issueNumber} 완료`);
}

main().catch(e => { console.error("오류:", e.message); process.exit(1); });
