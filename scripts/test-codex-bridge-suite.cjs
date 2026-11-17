const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { WebSocket } = require('ws');

const TEST_PORT = 8089;
const SERVER_URL = `http://127.0.0.1:${TEST_PORT}`;
const BRIDGE_SECRET_TOKEN = 'test-token-bridge-xyz-123';
const BRIDGE_PASSPHRASE = 'secret-pass-2026';

let serverProc = null;
let bridgeProc = null;

const results = {};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function httpGet(urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath, SERVER_URL);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function httpPost(urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath, SERVER_URL);
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(45000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload);
    req.end();
  });
}

function httpPostStream(urlPath, body, headers = {}, onChunk = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath, SERVER_URL);
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    }, (res) => {
      let rawData = '';
      let chunks = [];
      res.on('data', chunk => {
        const text = chunk.toString();
        rawData += text;
        if (onChunk) onChunk(text);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) chunks.push(delta);
            } catch (_e) {}
          }
        }
      });
      res.on('end', () => resolve({ statusCode: res.statusCode, raw: rawData, fullText: chunks.join('') }));
    });
    req.on('error', reject);
    req.setTimeout(45000, () => { req.destroy(); reject(new Error('Stream Timeout')); });
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log(' AI ACADEMY SUPPORT - CODEX BRIDGE VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  // Step 1: Start Server with custom bridge token and passphrase
  console.log('[1/7] Starting test server on port', TEST_PORT, '...');
  serverProc = spawn('node', ['scripts/serve-gratitude.cjs'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: TEST_PORT.toString(),
      BRIDGE_SECRET_TOKEN,
      BRIDGE_ACCESS_PASSPHRASE: BRIDGE_PASSPHRASE,
      REQUIRE_REMOTE_BRIDGE: 'true' // strictly forces bridge path or offline
    },
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  serverProc.stdout.on('data', d => console.log('  [Server]', d.toString().trim()));
  serverProc.stderr.on('data', d => console.error('  [Server ERR]', d.toString().trim()));

  await sleep(2500);

  // Test G: Website Integrity Check
  console.log('\n--- TEST G: Website & Static Files Integrity ---');
  try {
    const resHome = await httpGet('/index.html');
    const resStudio = await httpGet('/apps/claude-gui/index.html');
    const resStatus = await httpGet('/api/status');
    const statusData = JSON.parse(resStatus.body);

    const passG = resHome.statusCode === 200 &&
                  resStudio.statusCode === 200 &&
                  statusData.ok === true &&
                  statusData.spaces.studio.name.includes('AI Academy Support');

    results['TEST_G'] = {
      pass: passG,
      details: `Home: HTTP ${resHome.statusCode}, Studio: HTTP ${resStudio.statusCode}, Platform: ${statusData.spaces?.studio?.name}`
    };
    console.log('Result TEST G:', passG ? 'PASS' : 'FAIL', results['TEST_G'].details);
  } catch (err) {
    results['TEST_G'] = { pass: false, error: err.message };
    console.error('Result TEST G: FAIL', err.message);
  }

  // Test F-1: Bridge Handshake Security (Unauthorized Token Rejection)
  console.log('\n--- TEST F-1: Bridge Security (Invalid Token Rejection) ---');
  try {
    let wsRejected = false;
    await new Promise((resolve) => {
      const badWs = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/bridge-ws?token=wrong-token`, {
        headers: { 'X-Bridge-Token': 'wrong-token' }
      });
      badWs.on('error', (err) => {
        if (err.message.includes('401') || err.message.includes('Unexpected server response: 401')) {
          wsRejected = true;
        }
        resolve();
      });
      badWs.on('open', () => {
        badWs.close();
        resolve();
      });
    });

    results['TEST_F_TOKEN'] = { pass: wsRejected, details: wsRejected ? 'Rejected with HTTP 401' : 'Was not rejected' };
    console.log('Result TEST F (Token):', wsRejected ? 'PASS' : 'FAIL');
  } catch (err) {
    results['TEST_F_TOKEN'] = { pass: false, error: err.message };
    console.error('Result TEST F (Token): FAIL', err.message);
  }

  // Test E-1: Bridge Offline Notice
  console.log('\n--- TEST E-1: Offline Detection & Polite Fallback Notice ---');
  try {
    const resOffline = await httpPostStream('/api/chat/stream', {
      provider: 'openai',
      model: 'gpt-5.6-terra',
      prompt: 'Xin chào',
      memberName: 'Hồng Lĩnh AI',
      passphrase: BRIDGE_PASSPHRASE
    });

    const isOfflineHandled = resOffline.statusCode === 200 &&
                             resOffline.fullText.includes('Offline') &&
                             resOffline.fullText.includes('START_BRIDGE.bat');

    results['TEST_E_OFFLINE'] = {
      pass: isOfflineHandled,
      details: resOffline.fullText.slice(0, 120).replace(/\n/g, ' ')
    };
    console.log('Result TEST E (Offline):', isOfflineHandled ? 'PASS' : 'FAIL', results['TEST_E_OFFLINE'].details);
  } catch (err) {
    results['TEST_E_OFFLINE'] = { pass: false, error: err.message };
    console.error('Result TEST E (Offline): FAIL', err.message);
  }

  // Step 2: Start Bridge Client with valid secret token
  console.log('\n[2/7] Starting Windows Bridge Client...');
  bridgeProc = spawn('node', ['scripts/codex-bridge-client.cjs'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      BRIDGE_SERVER_URL: SERVER_URL,
      BRIDGE_SECRET_TOKEN
    },
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  bridgeProc.stdout.on('data', d => console.log('  [Bridge]', d.toString().trim()));
  bridgeProc.stderr.on('data', d => console.error('  [Bridge ERR]', d.toString().trim()));

  await sleep(3500);

  // Test A: Bridge Status Check
  console.log('\n--- TEST A: WebSocket Connection & Handshake Status ---');
  try {
    const resStatus = await httpGet('/api/bridge/status');
    const statusObj = JSON.parse(resStatus.body);
    const isOnline = statusObj.ok === true && statusObj.bridge?.online === true;

    results['TEST_A'] = {
      pass: isOnline,
      details: `Bridge Online: ${statusObj.bridge?.online}, Model: ${statusObj.bridge?.model}, Passphrase Req: ${statusObj.bridge?.requiresPassphrase}`
    };
    console.log('Result TEST A:', isOnline ? 'PASS' : 'FAIL', results['TEST_A'].details);
  } catch (err) {
    results['TEST_A'] = { pass: false, error: err.message };
    console.error('Result TEST A: FAIL', err.message);
  }

  // Test F-2: User Passphrase Verification (Reject invalid and missing passphrase)
  console.log('\n--- TEST F-2: User Authorization (Passphrase Enforcement) ---');
  try {
    const resBadPass = await httpPost('/api/chat/stream', {
      provider: 'openai',
      model: 'gpt-5.6-terra',
      prompt: 'Test prompt with wrong pass',
      passphrase: 'wrong-passphrase'
    });

    const resMissingPass = await httpPost('/api/chat/stream', {
      provider: 'openai',
      model: 'gpt-5.6-terra',
      prompt: 'Test prompt without pass'
      // passphrase omitted entirely
    });

    const isRejectedWrong403 = resBadPass.statusCode === 403;
    const isRejectedMissing403 = resMissingPass.statusCode === 403;
    const passF2 = isRejectedWrong403 && isRejectedMissing403;

    results['TEST_F_PASSPHRASE'] = {
      pass: passF2,
      details: `Wrong pass HTTP ${resBadPass.statusCode}, Missing pass HTTP ${resMissingPass.statusCode}`
    };
    console.log('Result TEST F (Passphrase):', passF2 ? 'PASS' : 'FAIL', results['TEST_F_PASSPHRASE'].details);
  } catch (err) {
    results['TEST_F_PASSPHRASE'] = { pass: false, error: err.message };
    console.error('Result TEST F (Passphrase): FAIL', err.message);
  }

  // Test B & C: End-to-end Streaming Turn via Bridge & Native Codex CLI (gpt-5.6-terra)
  console.log('\n--- TEST B & C: End-to-end Chat Turn via Bridge (gpt-5.6-terra) ---');
  try {
    console.log('Sending prompt to Hồng Lĩnh AI: "Chào bạn, hãy giới thiệu 1 câu ngắn gọn về AI Academy Support"...');
    let chunkCount = 0;
    const resChat = await httpPostStream('/api/chat/stream', {
      provider: 'openai',
      model: 'gpt-5.6-terra',
      prompt: 'Chào bạn, hãy giới thiệu 1 câu ngắn gọn về AI Academy Support',
      systemPrompt: 'Bạn là Hồng Lĩnh AI, Điều phối viên & Trợ lý học tập tổng hợp của AI Academy Support.',
      memberName: 'Hồng Lĩnh AI',
      passphrase: BRIDGE_PASSPHRASE
    }, {}, () => { chunkCount++; });

    const passBC = resChat.statusCode === 200 && resChat.fullText.length > 10;
    results['TEST_BC'] = {
      pass: passBC,
      details: `Status: ${resChat.statusCode}, Chunks: ${chunkCount}, Length: ${resChat.fullText.length}, Content: "${resChat.fullText.slice(0, 150).replace(/\n/g, ' ')}..."`
    };
    console.log('Result TEST B & C:', passBC ? 'PASS' : 'FAIL');
    console.log('Details:', results['TEST_BC'].details);
  } catch (err) {
    results['TEST_BC'] = { pass: false, error: err.message };
    console.error('Result TEST B & C: FAIL', err.message);
  }

  // Test D: Roundtable Multi-Agent Test (Hồng Lĩnh AI, Minh Tuệ, Bảo Ngọc)
  console.log('\n--- TEST D: Roundtable Verification (Solo vs Roundtable Passphrase & Roles) ---');
  try {
    // 1. Verify Roundtable turn rejected if passphrase missing
    const resRoundtableNoPass = await httpPost('/api/chat/stream', {
      provider: 'openai',
      model: 'gpt-5.6-terra',
      prompt: 'Thảo luận kế hoạch học tập',
      systemPrompt: '[HỘI ĐỒNG AI ACADEMY SUPPORT - VAI TRÒ CHUYÊN MÔN]:\nBạn là Minh Tuệ với vai trò Cố vấn Tư duy logic & Khoa học.',
      memberName: 'Minh Tuệ'
      // no passphrase provided
    });
    const isRoundtableRejected403 = resRoundtableNoPass.statusCode === 403;
    console.log('Roundtable missing passphrase rejected 403:', isRoundtableRejected403 ? 'PASS' : 'FAIL');

    // 2. Roundtable turn with valid user passphrase
    console.log('Testing Roundtable Agent: Minh Tuệ (with user passphrase)...');
    const resMinhTue = await httpPostStream('/api/chat/stream', {
      provider: 'openai',
      model: 'gpt-5.6-terra',
      prompt: '1 + 1 bằng mấy?',
      systemPrompt: '[HỘI ĐỒNG AI ACADEMY SUPPORT - VAI TRÒ CHUYÊN MÔN]:\nBạn là Minh Tuệ với vai trò Cố vấn Tư duy logic & Khoa học của AI Academy Support. Trả lời cực ngắn.',
      memberName: 'Minh Tuệ',
      passphrase: BRIDGE_PASSPHRASE
    });

    console.log('Testing Roundtable Agent: Bảo Ngọc (with user passphrase)...');
    const resBaoNgoc = await httpPostStream('/api/chat/stream', {
      provider: 'openai',
      model: 'gpt-5.6-terra',
      prompt: 'Hãy nói 1 từ tích cực.',
      systemPrompt: '[HỘI ĐỒNG AI ACADEMY SUPPORT - VAI TRÒ CHUYÊN MÔN]:\nBạn là Bảo Ngọc với vai trò Trợ lý Ngôn ngữ & Sáng tạo của AI Academy Support. Trả lời cực ngắn.',
      memberName: 'Bảo Ngọc',
      passphrase: BRIDGE_PASSPHRASE
    });

    const passD = isRoundtableRejected403 && resMinhTue.fullText.length > 0 && resBaoNgoc.fullText.length > 0;
    results['TEST_D_ROUNDTABLE'] = {
      pass: passD,
      details: `Roundtable Auth Check: ${isRoundtableRejected403 ? 'PASS (403)' : 'FAIL'}, Minh Tuệ: "${resMinhTue.fullText.trim()}", Bảo Ngọc: "${resBaoNgoc.fullText.trim()}"`
    };
    console.log('Result TEST D (Roundtable):', passD ? 'PASS' : 'FAIL', results['TEST_D_ROUNDTABLE'].details);
  } catch (err) {
    results['TEST_D_ROUNDTABLE'] = { pass: false, error: err.message };
    console.error('Result TEST D (Roundtable): FAIL', err.message);
  }

  // Test Cancel: Client Cancellation / Stop stream
  console.log('\n--- TEST CANCEL: Process Cancellation via Stop Endpoint ---');
  try {
    const testConvId = `conv_test_cancel_${Date.now()}`;
    const payload = JSON.stringify({
      conversationId: testConvId,
      provider: 'openai',
      model: 'gpt-5.6-terra',
      prompt: 'Viết một bài luận 500 từ về lịch sử trí tuệ nhân tạo.',
      passphrase: BRIDGE_PASSPHRASE
    });

    const u = new URL('/api/chat/stream', SERVER_URL);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    });
    req.on('error', () => {}); // Ignore expected client destroy error

    let receivedAny = false;
    req.on('response', (res) => {
      res.on('data', () => { receivedAny = true; });
    });
    req.write(payload);

    await sleep(800); // Allow bridge to start processing

    // Call /api/chat/stop
    const resStop = await httpPost('/api/chat/stop', { conversationId: testConvId });
    const stopJson = JSON.parse(resStop.body);
    req.destroy();

    const passCancel = resStop.statusCode === 200 && stopJson.ok === true;
    results['TEST_CANCEL'] = {
      pass: passCancel,
      details: `Stop endpoint returned: ${resStop.body}`
    };
    console.log('Result TEST CANCEL:', passCancel ? 'PASS' : 'FAIL', results['TEST_CANCEL'].details);
  } catch (err) {
    results['TEST_CANCEL'] = { pass: false, error: err.message };
    console.error('Result TEST CANCEL: FAIL', err.message);
  }

  // Test E-2: Recovery Test (Kill bridge, check offline, restart bridge, check recovery)
  console.log('\n--- TEST E-2: Auto-reconnect & Recovery Test ---');
  try {
    console.log('Terminating bridge client...');
    bridgeProc.kill('SIGTERM');
    await sleep(2000);

    const resCheckOffline = await httpGet('/api/bridge/status');
    const statusOffline = JSON.parse(resCheckOffline.body);
    const verifiedOffline = statusOffline.bridge?.online === false;

    console.log('Restarting bridge client...');
    bridgeProc = spawn('node', ['scripts/codex-bridge-client.cjs'], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        BRIDGE_SERVER_URL: SERVER_URL,
        BRIDGE_SECRET_TOKEN
      },
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    await sleep(3500);

    const resCheckOnline = await httpGet('/api/bridge/status');
    const statusOnline = JSON.parse(resCheckOnline.body);
    const verifiedOnline = statusOnline.bridge?.online === true;

    const passE2 = verifiedOffline && verifiedOnline;
    results['TEST_E_RECOVERY'] = {
      pass: passE2,
      details: `Offline verified: ${verifiedOffline}, Online re-established: ${verifiedOnline}`
    };
    console.log('Result TEST E-2 (Recovery):', passE2 ? 'PASS' : 'FAIL', results['TEST_E_RECOVERY'].details);
  } catch (err) {
    results['TEST_E_RECOVERY'] = { pass: false, error: err.message };
    console.error('Result TEST E-2 (Recovery): FAIL', err.message);
  }

  // Summary
  console.log('\n================================================================');
  console.log(' FINAL TEST REPORT SUMMARY');
  console.log('================================================================');
  console.log(JSON.stringify(results, null, 2));

  // Cleanup
  console.log('\nCleaning up test processes...');
  if (bridgeProc) try { bridgeProc.kill('SIGTERM'); } catch (_e) {}
  if (serverProc) try { serverProc.kill('SIGTERM'); } catch (_e) {}
  await sleep(1500);
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  if (bridgeProc) try { bridgeProc.kill('SIGTERM'); } catch (_e) {}
  if (serverProc) try { serverProc.kill('SIGTERM'); } catch (_e) {}
  process.exit(1);
});
