// .github/scripts/release-notes.js
// K-Mail-MCP — 자동 릴리즈 노트 생성 스크립트

const https = require("https");
const fs    = require("fs");

const {
  ANTHROPIC_API_KEY,
  GITHUB_TOKEN,
  CURRENT_TAG,
  PREV_TAG,
  REPO_OWNER,
  REPO_NAME,
  COMMITS_PATH,
} = process.env;

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
          resolve(parsed.content?.[0]?.text || "릴리즈 노트를 생성할 수 없었습니다.");
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
  console.log(`릴리즈 노트 생성 중: ${CURRENT_TAG}`);

  const commits = fs.existsSync(COMMITS_PATH)
    ? fs.readFileSync(COMMITS_PATH, "utf-8").trim()
    : "(커밋 없음)";

  const prevTag = PREV_TAG || "첫 릴리즈";

  const systemPrompt = `You are a release notes writer for K-Mail-MCP.

Write professional release notes in Korean based on git commits.

Format:
## 변경사항

### 새 기능
- ...

### 버그 수정
- ...

### 보안
- ...

### 문서
- ...

### 기타
- ...

Rules:
- Skip empty sections
- Each bullet: clear user-facing description (not raw commit message)
- Group related commits into one bullet if needed
- Keep under 300 words`;

  const userPrompt = `New release: ${CURRENT_TAG} (from ${prevTag})

Git commits:
${commits}

Write release notes for this version.`;

  const notes = await callClaude(systemPrompt, userPrompt);

  const compareUrl = PREV_TAG
    ? `https://github.com/${REPO_OWNER}/${REPO_NAME}/compare/${PREV_TAG}...${CURRENT_TAG}`
    : `https://github.com/${REPO_OWNER}/${REPO_NAME}/commits/${CURRENT_TAG}`;

  const releaseBody = `${notes}\n\n---\n**설치:** [INSTALL_GUIDE.md](https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/INSTALL_GUIDE.md)\n**전체 변경사항:** [${prevTag}...${CURRENT_TAG}](${compareUrl})`;

  const result = await githubRequest(
    "POST",
    `/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
    {
      tag_name:   CURRENT_TAG,
      name:       `K-Mail-MCP ${CURRENT_TAG}`,
      body:       releaseBody,
      draft:      false,
      prerelease: CURRENT_TAG.includes("-"),
    }
  );

  console.log(`릴리즈 생성: ${result.status}`);
  console.log(`${CURRENT_TAG} 릴리즈 완료`);
}

main().catch((err) => {
  console.error("오류:", err.message);
  process.exit(1);
});
