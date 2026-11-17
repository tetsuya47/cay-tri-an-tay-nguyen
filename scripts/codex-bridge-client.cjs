/**
 * AI ACADEMY SUPPORT - SELF-HOSTED CODEX BRIDGE CLIENT (WINDOWS)
 * Runs locally on the user's Windows PC.
 * Connects outbound to Render (or local dev server) via secure WebSocket.
 * Executes turns through local Codex CLI using existing ChatGPT OAuth session.
 * 
 * NEVER transmits auth.json, cookies, or secrets to the cloud.
 */
const { WebSocket } = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER_URL = process.env.BRIDGE_SERVER_URL || process.env.SERVER_URL || 'http://localhost:8080';
const BRIDGE_TOKEN = process.env.BRIDGE_SECRET_TOKEN || 'cay-tri-an-codex-bridge-secret-2026';

// ── Native Codex CLI binary resolution ──────────────────────────────────────
function resolveCodexCli() {
  const nativeWinExe = path.join(
    process.env.APPDATA || 'C:\\Users\\Admin\\AppData\\Roaming',
    'npm\\node_modules\\@openai\\codex\\node_modules\\@openai\\codex-win32-x64\\vendor\\x86_64-pc-windows-msvc\\bin\\codex.exe'
  );
  if (fs.existsSync(nativeWinExe)) {
    return { command: nativeWinExe, useShell: false, native: true };
  }
  return { command: 'codex', useShell: true, native: false };
}

const activeJobs = new Map();
let ws = null;
let reconnectAttempts = 0;
let isShuttingDown = false;

function getWsUrl(httpUrl) {
  const u = new URL(httpUrl);
  const protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${u.host}/bridge-ws?token=${encodeURIComponent(BRIDGE_TOKEN)}`;
}

function connect() {
  if (isShuttingDown) return;

  const wsUrl = getWsUrl(SERVER_URL);
  console.log(`\n[Codex Bridge] Đang kết nối đến máy chủ: ${SERVER_URL} ...`);

  ws = new WebSocket(wsUrl, {
    headers: {
      'X-Bridge-Token': BRIDGE_TOKEN
    }
  });

  ws.on('open', () => {
    reconnectAttempts = 0;
    console.log('==================================================================');
    console.log(' [✓] KẾT NỐI BRIDGE THÀNH CÔNG!');
    console.log(` - Máy chủ đích: ${SERVER_URL}`);
    const cliInfo = resolveCodexCli();
    console.log(` - Trình thực thi: ${cliInfo.command} (Native: ${cliInfo.native})`);
    console.log(' - Trạng thái: Đang sẵn sàng nhận yêu cầu từ AI Academy Support');
    console.log('==================================================================\n');
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleServerMessage(msg);
    } catch (err) {
      console.error('[Codex Bridge] Lỗi đọc gói tin từ server:', err.message);
    }
  });

  ws.on('close', (code, reason) => {
    const reasonStr = reason ? reason.toString() : '';
    console.log(`[Codex Bridge] Mất kết nối tới server (Mã: ${code}, Lý do: ${reasonStr || 'Không xác định'})`);
    killAllJobs();
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    console.error(`[Codex Bridge] Lỗi kết nối WebSocket: ${err.message}`);
  });
}

function scheduleReconnect() {
  if (isShuttingDown) return;
  reconnectAttempts++;
  const delaySec = Math.min(Math.pow(1.5, reconnectAttempts), 20);
  console.log(`[*] Tự động kết nối lại sau ${delaySec.toFixed(1)} giây (Lần thử ${reconnectAttempts})...`);
  setTimeout(connect, delaySec * 1000);
}

function handleServerMessage(msg) {
  if (msg.type === 'welcome') {
    console.log(`[Codex Bridge Server Info]: ${msg.message} [${msg.serverTime}]`);
    return;
  }

  if (msg.type === 'pong') {
    return;
  }

  if (msg.type === 'cancel') {
    const jobId = msg.id;
    if (activeJobs.has(jobId)) {
      console.log(`[Codex Bridge] Hủy tiến trình theo yêu cầu từ client [ID: ${jobId}]`);
      const child = activeJobs.get(jobId);
      try { child.kill('SIGTERM'); } catch (_e) {}
      activeJobs.delete(jobId);
    }
    return;
  }

  if (msg.type === 'exec') {
    executeCodexJob(msg);
    return;
  }
}

function executeCodexJob(job) {
  const { id, model, prompt, memberName } = job;
  console.log(`[Codex Bridge] [ID: ${id}] Bắt đầu xử lý lượt chat: ${memberName || 'Agent'} (Model: ${model || 'gpt-5.6-terra'})`);

  const { command, useShell } = resolveCodexCli();
  const finalModel = model || 'gpt-5.6-terra';

  const child = spawn(command, [
    'exec',
    '--json',
    '--skip-git-repo-check',
    '--ephemeral',
    '--ignore-user-config',
    '--ignore-rules',
    '--sandbox',
    'read-only',
    '--disable',
    'shell_tool',
    '--disable',
    'unified_exec',
    '-m',
    finalModel,
    '-'
  ], {
    shell: useShell,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  activeJobs.set(id, child);

  let streamError = '';
  let tokenCount = 0;

  child.stdout.on('data', (d) => {
    const lines = d.toString().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'item.completed' && parsed.item?.type === 'agent_message' && parsed.item?.text) {
          const textChunk = parsed.item.text;
          tokenCount++;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'delta', id, text: textChunk }));
          }
        }
      } catch (_e) {}
    }
  });

  child.stderr.on('data', (d) => {
    streamError += d.toString();
  });

  child.stdin.end(prompt);

  child.on('close', (code) => {
    activeJobs.delete(id);
    console.log(`[Codex Bridge] [ID: ${id}] Hoàn thành (Mã thoát: ${code}, Chunks: ${tokenCount})`);
    
    if (code !== 0 && streamError) {
      console.error(`[Codex Bridge Error]: ${streamError.trim()}`);
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      if (code !== 0 && tokenCount === 0) {
        ws.send(JSON.stringify({
          type: 'error',
          id,
          error: streamError.trim() || `Codex CLI exited with code ${code}`
        }));
      } else {
        ws.send(JSON.stringify({ type: 'done', id }));
      }
    }
  });

  child.on('error', (err) => {
    activeJobs.delete(id);
    console.error(`[Codex Bridge] Lỗi spawn tiến trình [ID: ${id}]:`, err.message);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'error', id, error: err.message }));
    }
  });
}

function killAllJobs() {
  for (const [id, child] of activeJobs.entries()) {
    try { child.kill('SIGTERM'); } catch (_e) {}
  }
  activeJobs.clear();
}

process.on('SIGINT', () => {
  console.log('\n[Codex Bridge] Đang dừng trạm xử lý theo yêu cầu...');
  isShuttingDown = true;
  killAllJobs();
  if (ws) ws.close(1000, 'Client shutdown');
  process.exit(0);
});

process.on('SIGTERM', () => {
  isShuttingDown = true;
  killAllJobs();
  if (ws) ws.close(1000, 'Client shutdown');
  process.exit(0);
});

connect();
