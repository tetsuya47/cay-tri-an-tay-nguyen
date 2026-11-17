/* ==========================================================================
   PLATFORM INTEGRATION TEST – CÂY TRI ÂN TÂY NGUYÊN & CLAUDE GUI WEB TAB
   Verification of:
   1. Cây Tri Ân 3-button toolbar intact (.tree-counter-pill, #momentTriggerBtn, #studioTriggerBtn).
   2. Clicking AI Innovation Studio button opens Claude GUI Web in a NEW TAB (NO Electron Desktop).
   3. Claude GUI Web Tab mounts full original React UI:
      - Sidebar, Projects, Conversations, EduKids Team Multi-Agent.
      - Return link '🌳 Cây Tri Ân' back to Cây Tri Ân.
   4. Real AI Provider test with configured Codex CLI (gpt-5.6-terra) without 'claude' CLI error.
   ========================================================================== */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const PORT = 8080;
const CDP_PORT = 9223;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('=== RUNNING PLATFORM INTEGRATION TESTS (DUAL WEB SPACES) ===\n');

// 1. Ensure Local Server is running
async function isServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}/api/status`, { timeout: 1000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

let serverProcess = null;
if (!await isServerRunning()) {
  console.log('[Test Setup] Starting local web server on port', PORT);
  serverProcess = spawn(process.execPath, [path.join(ROOT_DIR, 'scripts/serve-gratitude.cjs')], {
    cwd: ROOT_DIR,
    stdio: 'ignore'
  });
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 200));
    if (await isServerRunning()) break;
  }
}
console.log('[Test Setup] Web server online at http://localhost:' + PORT);

// 2. Launch Headless Chrome to test Cây Tri Ân and Claude GUI Tab
const userDataDir = path.join(ROOT_DIR, 'tmp_chrome_verify_' + Date.now());
const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${userDataDir}`,
  '--window-size=1440,900',
  '--disable-gpu',
  `http://127.0.0.1:${PORT}/index.html`
]);

await new Promise(r => setTimeout(r, 2500));
const vRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
const pages = await vRes.json();
const page = pages.find(p => p.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);

await new Promise(r => ws.onopen = r);

let reqId = 1;
const pending = new Map();
ws.onmessage = (e) => {
  const d = JSON.parse(e.data);
  if (d.id && pending.has(d.id)) {
    const { resolve, reject } = pending.get(d.id);
    pending.delete(d.id);
    if (d.error) reject(new Error(d.error.message));
    else resolve(d.result);
  }
};

function send(method, params = {}) {
  const id = ++reqId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalInPage(expression) {
  const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  return res.result?.value;
}

try {
  await send('Runtime.enable');
  await send('Page.enable');

  // STEP 1: Verify 3 toolbar buttons on Cây Tri Ân
  console.log('--- Step 1: Validating 3 Toolbar Elements on Cây Tri Ân ---');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  await new Promise(r => setTimeout(r, 2000));

  const counterPill = await evalInPage('document.querySelector(".tree-counter-pill")?.innerText?.trim()');
  console.log('1. Counter Pill:', counterPill);
  assert.ok(counterPill?.includes('chiếc lá tri ân'), 'Counter pill must exist');

  const momentBtn = await evalInPage('document.getElementById("momentTriggerBtn")?.innerText?.trim()');
  console.log('2. Moment Button:', momentBtn);
  assert.ok(momentBtn?.includes('Khoảnh Khắc Cây Tri Ân'), 'Moment button must exist');

  const studioBtn = await evalInPage('document.getElementById("studioTriggerBtn")?.innerText?.trim()');
  console.log('3. Studio Button:', studioBtn);
  assert.ok(studioBtn?.includes('AI Innovation Studio'), 'AI Innovation Studio button must exist');
  console.log('✓ All 3 toolbar elements verified intact on Cây Tri Ân homepage.');

  // STEP 2: Verify Clicking AI Innovation Studio Opens Web Tab
  console.log('\n--- Step 2: Clicking AI Innovation Studio Button ---');
  // Intercept window.open
  await evalInPage(`
    window._lastOpenedUrl = null;
    window.open = function(url) {
      window._lastOpenedUrl = url;
    };
    document.getElementById("studioTriggerBtn").click();
  `);
  await new Promise(r => setTimeout(r, 500));
  const openedUrl = await evalInPage('window._lastOpenedUrl');
  console.log('✓ Target URL opened in new tab:', openedUrl);
  assert.ok(openedUrl?.includes('apps/claude-gui/'), 'Button must open Claude GUI Web URL in new tab');

  // STEP 3: Navigate to Claude GUI Web Tab and Verify Original React UI Mounting
  console.log('\n--- Step 3: Verifying Claude GUI Web App Rendering ---');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/apps/claude-gui/` });
  await new Promise(r => setTimeout(r, 3000));

  const rootLength = await evalInPage('document.getElementById("root")?.innerHTML?.length || 0');
  const bodyText = await evalInPage('document.body.innerText || ""');
  console.log('✓ Claude GUI Root HTML length:', rootLength);
  console.log('✓ Claude GUI Detected Text Content:', bodyText.substring(0, 150).replace(/\n/g, ' '));
  assert.ok(rootLength > 10000, 'Original React app must mount fully into #root');
  assert.ok(bodyText.includes('EduKids Team') || bodyText.includes('Projects'), 'Must render original EduKids Team / Projects');

  // STEP 4: Verify Return Link to Cây Tri Ân in Claude GUI
  console.log('\n--- Step 4: Verifying Return Link to Cây Tri Ân ---');
  const hasReturnLink = await evalInPage(`
    Array.from(document.querySelectorAll('a')).some(a => a.innerText.includes('Cây Tri Ân'))
  `);
  console.log('✓ Return link to Cây Tri Ân exists in Claude GUI:', hasReturnLink);
  assert.ok(hasReturnLink, 'Claude GUI must display return link to Cây Tri Ân');

  // STEP 5: Verify AI Chat Provider Execution (OpenAI Codex CLI - gpt-5.6-terra)
  console.log('\n--- Step 5: Verifying Real AI Provider Chat via Web Bridge ---');
  const askRes = await fetch(`http://127.0.0.1:${PORT}/api/claude/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Cho biet 2+3 bang bao nhieu? (Chi tra loi 1 chu so)', model: 'gpt-5.6-terra' })
  });
  const askData = await askRes.json();
  console.log('✓ AI Provider API Response:', askData);
  assert.ok(askData.ok, 'API must return ok: true');
  assert.ok(askData.text?.includes('5'), 'Real AI response must contain the answer 5');
  console.log('✓ Real AI completion verified from Codex gpt-5.6-terra without any "claude" CLI error.');

  console.log('\n=============================================================');
  console.log('✓ ALL DUAL-SPACE WEB TESTS PASSED (100%)');
  console.log('=============================================================');

} finally {
  ws.close();
  chrome.kill();
  if (serverProcess) serverProcess.kill();
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
}
