/**
 * Korean Mail MCP — 계정 설정 CLI (v3)
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  보안 원칙                                           │
 * │  • 이 설치본만의 고유 .master.key 로 암호화         │
 * │  • 이메일 주소 + 비밀번호 모두 AES-256-GCM 암호화  │
 * │  • 다른 설치본의 key 로는 복호화 불가 (격리)        │
 * │  • 평문 정보는 메모리에만 존재, 파일엔 일체 없음    │
 * └─────────────────────────────────────────────────────┘
 *
 * 사용법:  node setup.js        대화형 메뉴
 *          node setup.js list   계정 목록만 출력
 */

import crypto   from "crypto";
import fs       from "fs";
import path     from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const ACCOUNTS_FILE  = path.join(__dirname, "accounts.enc.json");
const KEY_FILE       = path.join(__dirname, ".master.key");
const META_FILE      = path.join(__dirname, ".instance.json"); // 인스턴스 고유 ID

// ══════════════════════════════════════════════════════
//  인스턴스 초기화 — 최초 1회, 이 설치본 고유 ID + 키 생성
// ══════════════════════════════════════════════════════
function initInstance() {
  // 인스턴스 메타 (키 아님 — 식별용)
  if (!fs.existsSync(META_FILE)) {
    const meta = {
      instanceId:  crypto.randomUUID(),
      createdAt:   new Date().toISOString(),
      description: "이 파일은 MCP 인스턴스 식별자입니다. 키가 아니므로 공유해도 무방합니다.",
    };
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
    console.log(`\n🆕 새 인스턴스 생성: ${meta.instanceId}`);
  }

  // 마스터 키 — 이 설치본에만 존재
  if (!fs.existsSync(KEY_FILE)) {
    const key = crypto.randomBytes(32).toString("hex"); // 256-bit
    fs.writeFileSync(KEY_FILE, key, { mode: 0o600 });   // 소유자 읽기 전용
    console.log("🔑 마스터 키 생성 완료 (.master.key)");
    console.log("   ⚠️  이 키 없이는 저장된 데이터를 복호화할 수 없습니다.");
    console.log("   ⚠️  다른 PC/설치본으로 이전 시 키 파일도 함께 이전하세요.\n");
  }
}

// ══════════════════════════════════════════════════════
//  AES-256-GCM 암호화 / 복호화
// ══════════════════════════════════════════════════════
function loadKeyBuf() {
  if (!fs.existsSync(KEY_FILE))
    throw new Error("마스터 키 없음. node setup.js 를 먼저 실행하세요.");
  return Buffer.from(fs.readFileSync(KEY_FILE, "utf-8").trim(), "hex");
}

function encrypt(plaintext, keyBuf) {
  const iv      = crypto.randomBytes(12);                        // 96-bit IV (GCM 권장)
  const cipher  = crypto.createCipheriv("aes-256-gcm", keyBuf, iv);
  const enc     = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  return {
    iv:         iv.toString("hex"),
    authTag:    cipher.getAuthTag().toString("hex"),            // 위변조 감지 태그
    ciphertext: enc.toString("hex"),
  };
}

function decrypt(encObj, keyBuf) {
  const dec = crypto.createDecipheriv(
    "aes-256-gcm", keyBuf, Buffer.from(encObj.iv, "hex")
  );
  dec.setAuthTag(Buffer.from(encObj.authTag, "hex"));
  return Buffer.concat([
    dec.update(Buffer.from(encObj.ciphertext, "hex")),
    dec.final(),
  ]).toString("utf-8");
}

// ══════════════════════════════════════════════════════
//  계정 파일 I/O
// ══════════════════════════════════════════════════════
function loadRaw() {
  if (!fs.existsSync(ACCOUNTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
}

function saveRaw(accounts) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), { mode: 0o600 });
}

/** 복호화된 계정 목록 반환 (display / 내부 로직용) */
function loadDecrypted() {
  const keyBuf = loadKeyBuf();
  return loadRaw().map((a) => ({
    ...a,
    user: decrypt(a.encUser, keyBuf),  // 이메일 복호화
    pass: decrypt(a.encPass, keyBuf),  // 비밀번호 복호화 (메모리만)
  }));
}

// ══════════════════════════════════════════════════════
//  readline 헬퍼
// ══════════════════════════════════════════════════════
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));



// ══════════════════════════════════════════════════════
//  메뉴 기능
// ══════════════════════════════════════════════════════
const SERVICES = { "1": "naver", "2": "daum", "3": "gmail" };
const SVC_LABEL = { naver: "네이버", daum: "다음/카카오", gmail: "Gmail" };

async function addOrUpdateAccount(keyBuf) {
  console.log("\n── 계정 추가 / 수정 ────────────────────────────");
  console.log("  1) 네이버  2) 다음/카카오  3) Gmail");
  const svcNum  = (await ask("  서비스 선택: ")).trim();
  const service = SERVICES[svcNum];
  if (!service) { console.log("❌ 잘못된 선택"); return; }

  // 이메일 주소 — 평문 입력 (저장 시 암호화)
  const userRaw = (await ask("  이메일 주소: ")).trim();
  if (!userRaw.includes("@")) { console.log("❌ 올바른 이메일 형식이 아닙니다"); return; }

  // 앱 비밀번호 — 평문 입력 후 암호화 저장 (입력 후 Claude가 암호화)
  const passRaw = (await ask("  앱 비밀번호 (입력 후 자동 암호화 저장): ")).trim();
  if (passRaw.length < 4)     { console.log("❌ 비밀번호가 너무 짧습니다"); return; }

  const label = (await ask("  별칭 (예: 다음개인, 회사메일): ")).trim() || userRaw.split("@")[0];

  // 양쪽 모두 암호화
  const encUser = encrypt(userRaw.trim(), keyBuf);
  const encPass = encrypt(passRaw,        keyBuf);

  const accounts = loadRaw();
  // label 중복 확인 (같은 label이면 업데이트)
  const existIdx = accounts.findIndex((a) => a.label === label);

  const entry = {
    id:       existIdx >= 0 ? accounts[existIdx].id : crypto.randomUUID(),
    service,
    label,
    encUser,  // ← 암호화된 이메일
    encPass,  // ← 암호화된 비밀번호
    updatedAt: new Date().toISOString(),
  };

  if (existIdx >= 0) {
    accounts[existIdx] = entry;
    console.log(`\n✅ 계정 업데이트: [${SVC_LABEL[service]}] ${label}`);
  } else {
    accounts.push(entry);
    console.log(`\n✅ 계정 추가 완료: [${SVC_LABEL[service]}] ${label}`);
  }

  saveRaw(accounts);
  console.log("   이메일 주소 + 비밀번호가 AES-256-GCM으로 암호화되어 저장되었습니다.");
}

function listAccounts(keyBuf) {
  console.log("\n── 등록된 계정 ─────────────────────────────────");
  const raw = loadRaw();
  if (!raw.length) { console.log("  (없음)"); return; }
  raw.forEach((a, i) => {
    let userDisplay = "(복호화 실패)";
    try { userDisplay = decrypt(a.encUser, keyBuf); } catch {}
    console.log(`  ${i + 1}. [${SVC_LABEL[a.service] || a.service}] ${a.label} — ${userDisplay}`);
    console.log(`     업데이트: ${a.updatedAt || "-"}`);
  });
}

async function removeAccount(keyBuf) {
  listAccounts(keyBuf);
  const raw = loadRaw();
  if (!raw.length) return;
  const idx = parseInt((await ask("\n  삭제할 번호: ")).trim()) - 1;
  if (idx < 0 || idx >= raw.length) { console.log("❌ 잘못된 번호"); return; }
  const [removed] = raw.splice(idx, 1);
  saveRaw(raw);
  console.log(`🗑️  삭제 완료: ${removed.label}`);
}

async function verifyAccount(keyBuf) {
  listAccounts(keyBuf);
  const raw = loadRaw();
  if (!raw.length) return;
  const idx = parseInt((await ask("\n  테스트할 번호: ")).trim()) - 1;
  const acc = raw[idx];
  if (!acc) { console.log("❌ 잘못된 번호"); return; }
  try {
    const user = decrypt(acc.encUser, keyBuf);
    const pass = decrypt(acc.encPass, keyBuf);
    console.log(`\n🔓 복호화 성공`);
    console.log(`   이메일: ${user}`);
    console.log(`   비밀번호 길이: ${pass.length}자 (내용 미표시)`);
    console.log(`   ※ 실제 IMAP 연결 테스트는 MCP 서버 실행 후 list_mailboxes 로 확인`);
  } catch (e) {
    console.log(`❌ 복호화 실패: ${e.message}`);
    console.log("   이 계정이 다른 설치본에서 생성된 것은 아닌지 확인하세요.");
  }
}

// ══════════════════════════════════════════════════════
//  메인
// ══════════════════════════════════════════════════════
async function main() {
  initInstance();

  const meta   = JSON.parse(fs.readFileSync(META_FILE, "utf-8"));
  const keyBuf = loadKeyBuf();

  console.log("═══════════════════════════════════════════════");
  console.log("  Korean Mail MCP — 계정 설정");
  console.log(`  인스턴스: ${meta.instanceId.slice(0, 8)}...`);
  console.log("═══════════════════════════════════════════════");
  console.log("  ※ 이 인스턴스의 암호화 키는 다른 설치본과 공유되지 않습니다.");

  if (process.argv[2] === "list") {
    listAccounts(keyBuf);
    process.exit(0);
  }

  let running = true;
  while (running) {
    console.log("\n  1) 계정 추가 / 수정");
    console.log("  2) 계정 목록");
    console.log("  3) 계정 삭제");
    console.log("  4) 복호화 검증");
    console.log("  5) 종료");
    const choice = (await ask("\n  선택: ")).trim();

    switch (choice) {
      case "1": await addOrUpdateAccount(keyBuf); break;
      case "2": listAccounts(keyBuf);             break;
      case "3": await removeAccount(keyBuf);      break;
      case "4": await verifyAccount(keyBuf);      break;
      case "5": running = false;                  break;
      default:  console.log("❌ 잘못된 선택");
    }
  }

  rl.close();
  console.log("\n👋 종료\n");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
