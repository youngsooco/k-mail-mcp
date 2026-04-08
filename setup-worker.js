/**
 * setup-worker.js
 * setup.ps1 에서 stdin으로 JSON을 받아 암호화/저장만 처리
 * 직접 실행하지 말 것 — setup.bat 을 사용하세요
 */

import crypto from "crypto";
import fs     from "fs";
import path   from "path";
import { fileURLToPath } from "url";

const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const ACCOUNTS_FILE  = path.join(__dirname, "accounts.enc.json");
const KEY_FILE       = path.join(__dirname, ".master.key");
const META_FILE      = path.join(__dirname, ".instance.json");
const SETTINGS_FILE  = path.join(__dirname, "settings.enc.json");

// ── 로케일 감지 ──────────────────────────────────────────────────
function detectKorean() {
  const lang = process.env.LANG || process.env.LANGUAGE || "";
  if (lang.startsWith("ko")) return true;
  try { return new Intl.DateTimeFormat().resolvedOptions().locale.startsWith("ko"); }
  catch { return false; }
}
const isKorean = detectKorean();
const T = (ko, en) => isKorean ? ko : en;

// ── 인스턴스 초기화 ───────────────────────────────────
function initInstance() {
  if (!fs.existsSync(META_FILE)) {
    const meta = { instanceId: crypto.randomUUID(), createdAt: new Date().toISOString() };
    // [SECURITY] 인스턴스 메타 파일 권한 0o600 (CVE-008)
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), { mode: 0o600 });
  }
  if (!fs.existsSync(KEY_FILE)) {
    const key = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(KEY_FILE, key, { mode: 0o600 });
  }
}

// ── 암호화 ────────────────────────────────────────────
function loadKeyBuf() {
  return Buffer.from(fs.readFileSync(KEY_FILE, "utf-8").trim(), "hex");
}

function encrypt(plaintext, keyBuf) {
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuf, iv);
  const enc    = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  return { iv: iv.toString("hex"), authTag: cipher.getAuthTag().toString("hex"), ciphertext: enc.toString("hex") };
}

function decrypt(encObj, keyBuf) {
  const d = crypto.createDecipheriv("aes-256-gcm", keyBuf, Buffer.from(encObj.iv, "hex"));
  d.setAuthTag(Buffer.from(encObj.authTag, "hex"));
  return Buffer.concat([d.update(Buffer.from(encObj.ciphertext, "hex")), d.final()]).toString("utf-8");
}

// ── 계정 파일 I/O ─────────────────────────────────────
function loadRaw() {
  if (!fs.existsSync(ACCOUNTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
}

function saveRaw(accounts) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), { mode: 0o600 });
}

// ── 서비스명 매핑 ─────────────────────────────────────
const SVC_MAP   = { "1": "naver", "2": "daum", "3": "gmail", "4": "nate", "5": "yahoo", "6": "icloud" };
const SVC_LABEL = { naver: "Naver", daum: "Daum/Kakao", gmail: "Gmail", nate: "Nate", yahoo: "Yahoo", icloud: "iCloud" };

// ── 입력 읽기: 환경변수(Windows) 또는 stdin(macOS/Linux) ─────
async function readInput() {
  // setup.ps1이 환경변수로 전달 (인코딩 문제 완전 우회)
  if (process.env.KMAIL_INPUT) {
    try { return JSON.parse(process.env.KMAIL_INPUT); }
    catch(e) { console.error("[ERROR] JSON parse failed:", e.message); return {}; }
  }
  // fallback: stdin (setup.sh 등)
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
  });
}

// ── 액션 처리 ─────────────────────────────────────────
async function main() {
  initInstance();
  const action = process.argv[2] || "list";
  const input  = await readInput();
  const keyBuf = loadKeyBuf();

  if (action === "add") {
    const service = SVC_MAP[input.service] || "daum";
    const label   = (input.label || input.email.split("@")[0]).trim();
    const encUser = encrypt(input.email.trim(), keyBuf);
    const encPass = encrypt(input.pass,         keyBuf);

    const accounts = loadRaw();
    const existIdx = accounts.findIndex((a) => a.label === label);
    const entry = {
      id:        existIdx >= 0 ? accounts[existIdx].id : crypto.randomUUID(),
      service,
      label,
      encUser,
      encPass,
      updatedAt: new Date().toISOString(),
    };

    if (existIdx >= 0) {
      accounts[existIdx] = entry;
      console.log(`[OK] ${T('업데이트:', 'Updated:')} [${SVC_LABEL[service]}] ${label}`);
    } else {
      accounts.push(entry);
      console.log(`[OK] ${T('추가됨:', 'Added:')} [${SVC_LABEL[service]}] ${label}`);
    }
    console.log(`     Email + password encrypted with AES-256-GCM`);
    saveRaw(accounts);

  } else if (action === "list") {
    const raw = loadRaw();
    if (!raw.length) { console.log("  (" + T("없음", "none") + ")"); return; }
    raw.forEach((a, i) => {
      let userDisplay = "(decrypt failed)";
      try { userDisplay = decrypt(a.encUser, keyBuf); } catch {}
      console.log(`  ${i + 1}. [${SVC_LABEL[a.service] || a.service}] ${a.label} — ${userDisplay}`);
    });

  } else if (action === "delete") {
    const accounts = loadRaw();
    const n = (input.index || 1) - 1;
    if (n < 0 || n >= accounts.length) { console.log(T("[ERROR] 잘못된 번호입니다", "[ERROR] Invalid number")); return; }
    const removed = accounts.splice(n, 1)[0];
    saveRaw(accounts);
    console.log(`[${T('삭제됨', 'DELETED')}] ${removed.label}`);

  } else if (action === "set-api-key") {
    // API 키를 AES-256-GCM 으로 암호화해 settings.enc.json 에 저장
    const settings = fs.existsSync(SETTINGS_FILE)
      ? JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"))
      : {};

    if (input.key && input.key.trim()) {
      settings.encApiKey = encrypt(input.key.trim(), keyBuf);
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), { mode: 0o600 });
      console.log(T(
        "[OK] API 키가 암호화되어 settings.enc.json 에 저장됐습니다.",
        "[OK] API key encrypted and saved to settings.enc.json"
      ));
    } else {
      delete settings.encApiKey;
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), { mode: 0o600 });
      console.log(T(
        "[OK] API 키가 제거됐습니다. Claude Haiku 판단이 비활성화됩니다.",
        "[OK] API key removed. Claude Haiku judgment disabled."
      ));
    }

  } else if (action === "get-api-key-status") {
    // 키 등록 여부만 확인 (복호화 안 함)
    const settings = fs.existsSync(SETTINGS_FILE)
      ? JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"))
      : {};
    if (settings.encApiKey) {
      console.log(T("[활성]", "[active]"));
    } else {
      console.log(T("[비활성]", "[disabled]"));
    }
  }
}

main().catch((e) => { console.error("[ERROR]", e.message); process.exit(1); });
