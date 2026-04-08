// .github/scripts/issue-response.js — ES Module
import https from "https";
import fs   from "fs";

const {
  ANTHROPIC_API_KEY, GITHUB_TOKEN,
  GITHUB_EVENT_PATH, REPO_OWNER, REPO_NAME,
} = process.env;

const event       = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, "utf-8"));
const issueTitle  = event.issue?.title        || "";
const issueBody   = event.issue?.body         || "(본문 없음)";
const issueNumber = event.issue?.number;
const issueAuthor = event.issue?.user?.login  || "unknown";

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
  return JSON.parse(r.body).content?.[0]?.text || "응답 생성 실패";
}

async function githubPost(path, body) {
  return post("api.github.com", path,
    { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "k-mail-mcp-bot", Accept: "application/vnd.github+json" },
    body
  );
}

async function main() {
  console.log(`이슈 #${issueNumber} 처리 중 (@${issueAuthor})`);

  const system = `You are a helpful maintainer assistant for K-Mail-MCP, an open-source MCP plugin connecting Korean mail services (Naver, Daum/Kakao, Gmail) to Claude AI via IMAP.

Project: Node.js ES module MCP server, AES-256-GCM encrypted credentials, Claude Desktop plugin.
Tools: check_new_mails, list_accounts, read_email, reset_last_run, list_mailboxes.
Supports: Windows, macOS, Linux. iOS/Android: not yet.

Common issues:
- IMAP auth error → wrong app password or IMAP not enabled
- MCP missing in Claude Desktop → wrong path in config.json or not restarted
- .master.key missing → run node setup.js first
- Windows path → double backslash in JSON required

Rules: Korean only. Friendly, specific, numbered steps. Bug report: ask OS/Node.js version/error. Max 400 words. Do NOT say you are an AI.
End with: 추가로 궁금한 점이 있으면 편하게 댓글 달아주세요 🙏`;

  const user = `Issue from @${issueAuthor}:\nTitle: ${issueTitle}\nBody:\n${issueBody}`;
  const reply = await callClaude(system, user);

  const r = await githubPost(
    `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`,
    { body: `${reply}\n\n---\n*🤖 AI 메인테이너 자동 답변입니다. 부정확하면 댓글로 알려주세요.*` }
  );
  console.log(`코멘트 등록: HTTP ${r.status}`);

  try {
    await githubPost(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/labels`, { labels: ["needs-triage"] });
  } catch {}
  console.log("완료");
}

main().catch(e => { console.error("오류:", e.message); process.exit(1); });
