const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { WebSocketServer, WebSocket } = require('ws');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 8080;
const BRIDGE_SECRET_TOKEN = process.env.BRIDGE_SECRET_TOKEN || 'cay-tri-an-codex-bridge-secret-2026';
const BRIDGE_ACCESS_PASSPHRASE = process.env.BRIDGE_ACCESS_PASSPHRASE || '';

// Codex Bridge WebSocket connection state
let activeBridgeSocket = null;
let bridgeInfo = {
  connected: false,
  connectedAt: null,
  remoteAddress: null,
  model: 'gpt-5.6-terra'
};
const pendingBridgeRequests = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

const PID_FILE = path.join(ROOT_DIR, 'scripts/.studio.pid');

// In-memory provider configs (populated by /api/providers/set)
const providerConfigs = {};

// ── Codex CLI binary resolver (supports direct exe with windowsHide) ────────
function resolveCodexCli() {
  const nativeWinExe = path.join(
    process.env.APPDATA || 'C:\\Users\\Admin\\AppData\\Roaming',
    'npm\\node_modules\\@openai\\codex\\node_modules\\@openai\\codex-win32-x64\\vendor\\x86_64-pc-windows-msvc\\bin\\codex.exe'
  );
  if (fs.existsSync(nativeWinExe)) {
    return { command: nativeWinExe, useShell: false };
  }
  return { command: 'codex', useShell: true };
}

// Map to track active spawned child processes per conversationId for clean Stop cancellation
const activeChatProcesses = new Map();

function isStudioRunning() {
  if (fs.existsSync(PID_FILE)) {
    try {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
      if (pid && !isNaN(pid)) {
        process.kill(pid, 0);
        return pid;
      }
    } catch (e) {
      // Process is not active
    }
  }
  return null;
}

function launchStudioNative() {
  if (process.platform === 'linux' && !process.env.DISPLAY) {
    throw new Error('Desktop Electron GUI cannot run in headless Linux cloud environment (Render). The web runtime is available at /apps/claude-gui/');
  }

  const existingPid = isStudioRunning();
  if (existingPid) {
    console.log('[Platform] Claude GUI Desktop is already running with PID:', existingPid);
    return existingPid;
  }

  const electronExe = path.resolve(ROOT_DIR, 'apps/claude-gui/node_modules/electron/dist/electron.exe');
  const appDir = path.resolve(ROOT_DIR, 'apps/claude-gui');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  console.log('[Platform] Spawning Claude GUI Desktop Native from:', appDir);
  const child = spawn(electronExe, ['.'], {
    cwd: appDir,
    env,
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  try {
    fs.writeFileSync(PID_FILE, String(child.pid), 'utf8');
  } catch (e) {}

  return child.pid;
}

// ── CORS helper ──────────────────────────────────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ── OpenAI-compatible chat completion (streaming SSE) ────────────────────────
function buildOpenAIMessages(systemPrompt, userPrompt) {
  const msgs = [];
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
  msgs.push({ role: 'user', content: userPrompt });
  return msgs;
}

function getBaseUrl(provider, customBaseUrl) {
  if (customBaseUrl && customBaseUrl.trim()) return customBaseUrl.trim().replace(/\/$/, '');
  const defaults = {
    openai:     'https://api.openai.com/v1',
    anthropic:  'https://api.anthropic.com/v1',
    xai:        'https://api.x.ai/v1',
    gemini:     'https://generativelanguage.googleapis.com/v1beta/openai',
    deepseek:   'https://api.deepseek.com/v1',
    ollama:     'http://localhost:11434/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    opencode:   'https://api.openai.com/v1'
  };
  return defaults[provider] || defaults.openai;
}

function proxyStreamChat(res, { provider, apiKey, baseUrl, model, messages }) {
  const base = getBaseUrl(provider, baseUrl);
  const urlObj = new URL(base + '/chat/completions');
  const isHttps = urlObj.protocol === 'https:';
  const transport = isHttps ? https : http;

  const body = JSON.stringify({ model, messages, stream: true, max_tokens: 2048 });
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'http://localhost:8080';
    headers['X-Title'] = 'AI Innovation Studio';
  }

  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || (isHttps ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method: 'POST',
    headers
  };

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const proxyReq = transport.request(options, (proxyRes) => {
    if (proxyRes.statusCode >= 400) {
      let errBody = '';
      proxyRes.on('data', (chunk) => { errBody += chunk; });
      proxyRes.on('end', () => {
        let msg = `HTTP ${proxyRes.statusCode}`;
        try {
          const parsed = JSON.parse(errBody);
          if (parsed.error?.message) {
            msg = `[${provider.toUpperCase()} ${proxyRes.statusCode}]: ${parsed.error.message}`;
          }
        } catch (_e) {
          msg = `[${provider.toUpperCase()} ${proxyRes.statusCode}]: ${errBody.slice(0, 250)}`;
        }
        console.error(`[Chat Stream Error] ${msg}`);
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: msg } }], text: msg, error: msg })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      });
      return;
    }

    proxyRes.on('data', (chunk) => {
      res.write(chunk);
    });
    proxyRes.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });
  });

  proxyReq.on('error', (err) => {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  });

  proxyReq.write(body);
  proxyReq.end();
}

// ── Test provider connection ──────────────────────────────────────────────────
async function testProviderConnection(provider, apiKey, baseUrl) {
  return new Promise((resolve) => {
    const base = getBaseUrl(provider, baseUrl);
    let testUrl;
    try {
      testUrl = new URL(base + '/models');
    } catch (e) {
      return resolve({ ok: false, error: 'Invalid base URL: ' + base });
    }

    const isHttps = testUrl.protocol === 'https:';
    const transport = isHttps ? https : http;
    const headers = { 'Authorization': apiKey ? `Bearer ${apiKey}` : '' };

    const req = transport.request({
      hostname: testUrl.hostname,
      port: testUrl.port || (isHttps ? 443 : 80),
      path: testUrl.pathname,
      method: 'GET',
      headers
    }, (res2) => {
      let data = '';
      res2.on('data', c => { data += c; });
      res2.on('end', () => {
        resolve(res2.statusCode < 400
          ? { ok: true }
          : { ok: false, error: `HTTP ${res2.statusCode}` });
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ ok: false, error: 'Timeout' }); });
    req.end();
  });
}

// ── Fetch models list from provider ──────────────────────────────────────────
async function fetchProviderModels(provider, apiKey, baseUrl) {
  // If OpenAI and no custom apiKey, query Codex CLI models dynamically (original EduKids behavior)
  if (provider === 'openai' && !apiKey) {
    try {
      const { execSync } = require('child_process');
      const stdout = execSync('codex debug models', { timeout: 8000 }).toString();
      const parsed = JSON.parse(stdout);
      if (Array.isArray(parsed?.models)) {
        const codexModels = parsed.models
          .filter(m => m.visibility === 'list' && typeof m.slug === 'string')
          .map(m => ({
            id: m.slug,
            name: (m.display_name || m.slug) + ' (Codex CLI)',
            free: true,
            reasoning: true,
            provider: 'openai'
          }));
        if (codexModels.length > 0) return codexModels;
      }
    } catch (_e) {
      // Fallback if codex command fails or in restricted environment
      return [
        { id: 'gpt-5.6-terra', name: 'GPT-5.6-Terra (Codex CLI)', free: true, reasoning: true, provider: 'openai' },
        { id: 'gpt-5-preview', name: 'GPT-5 Preview (Codex CLI)', free: true, reasoning: true, provider: 'openai' },
        { id: 'gpt-4o', name: 'GPT-4o (OpenAI API)', provider: 'openai' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (OpenAI API)', provider: 'openai' }
      ];
    }
  }

  return new Promise((resolve) => {
    const base = getBaseUrl(provider, baseUrl);
    let modelsUrl;
    try {
      modelsUrl = new URL(base + '/models');
    } catch (e) {
      return resolve([]);
    }

    const isHttps = modelsUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const req = transport.request({
      hostname: modelsUrl.hostname,
      port: modelsUrl.port || (isHttps ? 443 : 80),
      path: modelsUrl.pathname,
      method: 'GET',
      headers: { 'Authorization': apiKey ? `Bearer ${apiKey}` : '' }
    }, (res2) => {
      let data = '';
      res2.on('data', c => { data += c; });
      res2.on('end', () => {
        try {
          const json = JSON.parse(data);
          const models = (json.data || json.models || []).map(m => ({
            id: m.id || m.name,
            name: m.id || m.name,
            provider
          }));
          resolve(models);
        } catch (e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(5000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

// ── Read request body ─────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // ── API: launch studio (Electron native) ────────────────────────────────
  if (pathname === '/api/launch-studio') {
    try {
      const wasRunning = isStudioRunning();
      const pid = launchStudioNative();
      setCors(res);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        message: wasRunning ? 'Claude GUI Desktop đang hoạt động' : 'Đã khởi chạy Claude GUI Desktop',
        alreadyRunning: Boolean(wasRunning),
        pid
      }));
    } catch (err) {
      setCors(res);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // ── Health Check (Render, K8s, uptime monitors) ────────────────────────
  if (pathname === '/health' || pathname === '/healthz') {
    setCors(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }));
    return;
  }

  // ── API: bridge status ──────────────────────────────────────────────────
  if (pathname === '/api/bridge/status') {
    setCors(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      bridge: {
        online: Boolean(activeBridgeSocket && activeBridgeSocket.readyState === WebSocket.OPEN),
        connectedAt: bridgeInfo.connectedAt,
        remoteAddress: bridgeInfo.remoteAddress,
        model: 'gpt-5.6-terra',
        requiresPassphrase: Boolean(BRIDGE_ACCESS_PASSPHRASE)
      }
    }));
    return;
  }

  // ── API: platform status ────────────────────────────────────────────────
  if (pathname === '/api/status') {
    setCors(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      platform: 'Cây Tri Ân Tây Nguyên Platform',
      spaces: {
        gratitude: { name: 'Cây Tri Ân Tây Nguyên', runtime: 'Web', status: 'online' },
        studio: { name: 'AI Academy Support (Lớp học AI đồng hành và sáng tạo)', runtime: 'Web Runtime (React 19 + Three.js)', status: 'ready' }
      }
    }));
    return;
  }

  // ── API: save provider config (server-side cache for proxy) ────────────
  if (pathname === '/api/providers/set' && req.method === 'POST') {
    const payload = await readBody(req);
    if (payload.id) {
      providerConfigs[payload.id] = payload;
      console.log(`[Providers] Saved config for: ${payload.id}`);
    }
    setCors(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ── API: test provider connection ──────────────────────────────────────
  if (pathname === '/api/providers/test' && req.method === 'POST') {
    const payload = await readBody(req);
    const { id, apiKey, baseUrl } = payload;
    const result = await testProviderConnection(id, apiKey, baseUrl);
    setCors(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // ── API: list models from provider ─────────────────────────────────────
  if (pathname === '/api/providers/models' && req.method === 'POST') {
    const payload = await readBody(req);
    const { provider, apiKey, baseUrl } = payload;
    const models = await fetchProviderModels(provider, apiKey, baseUrl);
    setCors(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, models }));
    return;
  }

  // ── API: streaming chat completion (SSE proxy to Codex Bridge, local Codex CLI, or Provider)
  if (pathname === '/api/chat/stream' && req.method === 'POST') {
    const payload = await readBody(req);
    const { prompt, provider, apiKey, baseUrl, model, systemPrompt, memberName, conversationId, passphrase } = payload;

    // Optional Access Passphrase check
    if (BRIDGE_ACCESS_PASSPHRASE) {
      const clientPassphrase = req.headers['x-bridge-passphrase'] || passphrase;
      if (clientPassphrase !== BRIDGE_ACCESS_PASSPHRASE) {
        setCors(res);
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          ok: false,
          error: 'Mật mã truy cập (Passphrase) không chính xác. Vui lòng kiểm tra lại quyền truy cập.'
        }));
        return;
      }
    }

    // Use client-provided key, server-cached key, or server environment variable (e.g. Render config)
    const cached = providerConfigs[provider] || {};
    const envKey = (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env[`${provider?.toUpperCase() || 'OPENAI'}_API_KEY`]) || '';
    const finalApiKey = apiKey || cached.apiKey || envKey;
    const finalBaseUrl = baseUrl || cached.baseUrl || '';
    const finalModel = model || 'gpt-5.6-terra';
    const activeConvId = conversationId || `conv_${Date.now()}`;
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    // Route 1: If provider is OpenAI and NO custom API key, route to Codex (Bridge WebSocket or local fallback)
    if (provider === 'openai' && !finalApiKey) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Sub-route 1A: Outbound Codex Bridge connected (Remote Windows PC)
      if (activeBridgeSocket && activeBridgeSocket.readyState === WebSocket.OPEN) {
        console.log(`[Chat] Routing OpenAI turn to Codex Bridge (${finalModel}) conv=${activeConvId} id=${jobId}`);
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });

        let completed = false;
        const cleanup = () => {
          pendingBridgeRequests.delete(jobId);
          activeChatProcesses.delete(activeConvId);
        };

        pendingBridgeRequests.set(jobId, {
          onDelta: (chunk) => {
            if (completed || res.writableEnded) return;
            const sseData = JSON.stringify({
              choices: [{ delta: { content: chunk } }],
              model: finalModel
            });
            res.write(`data: ${sseData}\n\n`);
          },
          onDone: () => {
            if (completed || res.writableEnded) return;
            completed = true;
            cleanup();
            res.write('data: [DONE]\n\n');
            res.end();
          },
          onError: (err) => {
            if (completed || res.writableEnded) return;
            completed = true;
            cleanup();
            console.error(`[Bridge Job Error ${jobId}]:`, err);
            const sseData = JSON.stringify({
              choices: [{ delta: { content: `\n\n*(Lỗi xử lý từ Codex Bridge: ${err})*` } }],
              model: finalModel
            });
            res.write(`data: ${sseData}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
          }
        });

        activeChatProcesses.set(activeConvId, {
          kill: () => {
            if (activeBridgeSocket && activeBridgeSocket.readyState === WebSocket.OPEN) {
              try { activeBridgeSocket.send(JSON.stringify({ type: 'cancel', id: jobId })); } catch (_e) {}
            }
          }
        });

        req.on('close', () => {
          if (!completed) {
            completed = true;
            if (activeBridgeSocket && activeBridgeSocket.readyState === WebSocket.OPEN) {
              try { activeBridgeSocket.send(JSON.stringify({ type: 'cancel', id: jobId })); } catch (_e) {}
            }
            cleanup();
          }
        });

        try {
          activeBridgeSocket.send(JSON.stringify({
            type: 'exec',
            id: jobId,
            model: finalModel,
            prompt: fullPrompt,
            memberName
          }));
        } catch (err) {
          cleanup();
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }

        setTimeout(() => {
          if (!completed && !res.writableEnded) {
            completed = true;
            if (activeBridgeSocket && activeBridgeSocket.readyState === WebSocket.OPEN) {
              try { activeBridgeSocket.send(JSON.stringify({ type: 'cancel', id: jobId })); } catch (_e) {}
            }
            cleanup();
            res.write('data: [DONE]\n\n');
            res.end();
          }
        }, 45000);
        return;
      }

      // Sub-route 1B: Local native Codex CLI fallback (when running directly on Windows dev machine without Bridge client)
      const { command, useShell } = resolveCodexCli();
      const hasLocalCodex = process.platform === 'win32' && fs.existsSync(command);
      if (hasLocalCodex && process.env.REQUIRE_REMOTE_BRIDGE !== 'true') {
        console.log(`[Chat] Routing OpenAI turn to local native Codex CLI (${finalModel}) conv=${activeConvId}`);
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });

        const child = spawn(command, [
          'exec', '--json', '--skip-git-repo-check', '--ephemeral',
          '-m', finalModel, '-'
        ], {
          shell: useShell,
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        activeChatProcesses.set(activeConvId, child);

        req.on('close', () => {
          if (!child.killed) {
            try { child.kill('SIGTERM'); } catch (_e) {}
          }
          activeChatProcesses.delete(activeConvId);
        });

        let streamError = '';
        child.stdout.on('data', (d) => {
          const lines = d.toString().split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'item.completed' && parsed.item?.type === 'agent_message' && parsed.item?.text) {
                const sseData = JSON.stringify({
                  choices: [{ delta: { content: parsed.item.text } }],
                  model: finalModel
                });
                res.write(`data: ${sseData}\n\n`);
              }
            } catch (_e) {}
          }
        });

        child.stderr.on('data', (d) => { streamError += d.toString(); });
        child.stdin.end(fullPrompt);

        child.on('close', (code) => {
          activeChatProcesses.delete(activeConvId);
          if (code !== 0 && !res.writableEnded) {
            console.error(`[Codex CLI] exited with code ${code}: ${streamError}`);
          }
          if (!res.writableEnded) {
            res.write('data: [DONE]\n\n');
            res.end();
          }
        });

        child.on('error', (err) => {
          activeChatProcesses.delete(activeConvId);
          console.error(`[Codex CLI] spawn error: ${err.message}`);
          if (!res.writableEnded) {
            res.write('data: [DONE]\n\n');
            res.end();
          }
        });

        setTimeout(() => {
          if (!res.writableEnded) {
            if (!child.killed) child.kill();
            activeChatProcesses.delete(activeConvId);
            res.write('data: [DONE]\n\n');
            res.end();
          }
        }, 35000);
        return;
      }

      // Sub-route 1C: Bridge is OFFLINE and no local Codex executable (Render Linux production behavior)
      console.log(`[Chat] Codex Bridge is OFFLINE for ${memberName || 'Agent'} (${finalModel}) conv=${activeConvId}`);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      const offlineNotice = `*(Thông báo từ ${memberName || 'Trợ lý AI'} / ${finalModel})*:\n\n` +
        `Trạm xử lý AI Academy Support tại máy tính cá nhân hiện đang **Offline**.\n\n` +
        `Để tiếp tục sử dụng model **${finalModel}** qua phiên ChatGPT OAuth:\n` +
        `1. Hãy khởi động file \`START_BRIDGE.bat\` trên máy tính cá nhân của bạn.\n` +
        `2. Sau khi trạm kết nối thành công, bạn có thể gửi lại câu hỏi.\n\n` +
        `*(Nếu muốn sử dụng trực tiếp trên Cloud không qua máy cá nhân, bạn có thể cấu hình OpenAI API Key trong Cài đặt Provider).*`;

      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: offlineNotice } }], model: finalModel })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // Route 2: Custom API Key configured or other providers (Anthropic, Gemini, DeepSeek, xAI, etc.)
    const messages = buildOpenAIMessages(systemPrompt, prompt);
    console.log(`[Chat] Streaming ${provider}/${finalModel} conv=${activeConvId}`);
    proxyStreamChat(res, {
      provider,
      apiKey: finalApiKey,
      baseUrl: finalBaseUrl,
      model: finalModel,
      messages
    });
    return;
  }

  // ── API: cancel/stop active chat streaming ────────────────────────────
  if (pathname === '/api/chat/stop' && req.method === 'POST') {
    const payload = await readBody(req);
    const { conversationId } = payload;
    if (conversationId && activeChatProcesses.has(conversationId)) {
      const proc = activeChatProcesses.get(conversationId);
      try {
        if (typeof proc.kill === 'function') proc.kill('SIGTERM');
      } catch (_e) {}
      activeChatProcesses.delete(conversationId);
      console.log(`[Chat] Canceled active chat process for conv=${conversationId}`);
    }
    setCors(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ── API: legacy claude/ask (non-streaming, Codex CLI) ──────────────────
  if (pathname === '/api/claude/ask') {
    if (req.method === 'OPTIONS') {
      setCors(res);
      res.writeHead(204);
      res.end();
      return;
    }

    const payload = await readBody(req);
    const userPrompt = payload.prompt || 'Xin chào';
    const model = payload.model || 'gpt-5.6-terra';

    const { command, useShell } = resolveCodexCli();
    const child = spawn(command, [
      'exec', '--json', '--skip-git-repo-check', '--ephemeral',
      '-m', model, '-'
    ], {
      shell: useShell,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let outputText = '';

    child.stdout.on('data', (d) => {
      d.toString().split('\n').forEach(line => {
        if (!line.trim()) return;
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'item.completed' && parsed.item?.text) {
            outputText += parsed.item.text;
          }
        } catch (e) {}
      });
    });

    child.stdin.end(userPrompt);

    child.on('close', () => {
      const finalReply = outputText.trim() || '';
      setCors(res);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, text: finalReply, response: finalReply, provider: 'codex', model }));
    });

    setTimeout(() => {
      if (!res.writableEnded) {
        child.kill();
        setCors(res);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, text: outputText.trim() || '', response: outputText.trim() || '' }));
      }
    }, 20000);
    return;
  }

  // ── Static file server ─────────────────────────────────────────────────
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Chống Path Traversal: Từ chối mọi chuỗi chứa '..'
  if (pathname.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Access Denied');
    return;
  }

  const relPath = pathname.replace(/^[\/\\]+/, '');
  let filePath = path.resolve(ROOT_DIR, relPath);

  // Bảo vệ giới hạn ROOT_DIR
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>404 - Không tìm thấy trang</h1><p>${pathname}</p>`);
      return;
    }

    // Nếu đường dẫn là thư mục, tự động kiểm tra và phục vụ index.html bên trong thư mục đó
    if (stats.isDirectory()) {
      const candidateIndex = path.join(filePath, 'index.html');
      try {
        const indexStats = fs.statSync(candidateIndex);
        if (indexStats.isFile()) {
          filePath = candidateIndex;
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>404 - Không tìm thấy trang</h1><p>${pathname}</p>`);
          return;
        }
      } catch (e) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>404 - Không tìm thấy trang</h1><p>${pathname}</p>`);
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    setCors(res);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

// ── WebSocket Server for Codex Bridge ───────────────────────────────────────
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  if (activeBridgeSocket && activeBridgeSocket.readyState === WebSocket.OPEN) {
    try {
      activeBridgeSocket.close(4000, 'Replaced by newer bridge connection');
    } catch (_e) {}
  }
  activeBridgeSocket = ws;
  bridgeInfo.connected = true;
  bridgeInfo.connectedAt = new Date().toISOString();
  bridgeInfo.remoteAddress = req.socket.remoteAddress;

  console.log(`[Bridge WS] Windows Codex Bridge connected from ${bridgeInfo.remoteAddress} at ${bridgeInfo.connectedAt}`);

  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'AI Academy Support Codex Bridge Gateway Connected',
    serverTime: bridgeInfo.connectedAt
  }));

  // Ping interval to keep connection alive through any NAT/proxy/Cloudflare
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 15000);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'delta' || msg.type === 'done' || msg.type === 'error') {
        const handler = pendingBridgeRequests.get(msg.id);
        if (handler) {
          if (msg.type === 'delta' && handler.onDelta) handler.onDelta(msg.text);
          if (msg.type === 'done' && handler.onDone) handler.onDone();
          if (msg.type === 'error' && handler.onError) handler.onError(msg.error);
        }
      }
    } catch (err) {
      console.error('[Bridge WS] Message parse error:', err.message);
    }
  });

  ws.on('close', (code, reason) => {
    clearInterval(pingInterval);
    if (activeBridgeSocket === ws) {
      activeBridgeSocket = null;
      bridgeInfo.connected = false;
      const reasonStr = reason ? reason.toString() : '';
      console.log(`[Bridge WS] Windows Codex Bridge disconnected (Code: ${code}, Reason: ${reasonStr})`);
      for (const [id, handler] of pendingBridgeRequests.entries()) {
        try {
          if (handler.onError) handler.onError('Bridge disconnected during processing');
        } catch (_e) {}
      }
      pendingBridgeRequests.clear();
    }
  });

  ws.on('error', (err) => {
    console.error('[Bridge WS] Socket error:', err.message);
  });
});

// Handle HTTP Upgrade to WebSocket for /bridge-ws
server.on('upgrade', (req, socket, head) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (reqUrl.pathname === '/bridge-ws') {
    const tokenHeader = req.headers['x-bridge-token'];
    const tokenQuery = reqUrl.searchParams.get('token');
    const clientToken = tokenHeader || tokenQuery;

    if (!clientToken || clientToken !== BRIDGE_SECRET_TOKEN) {
      console.warn(`[Bridge WS] Unauthorized connection attempt rejected from ${socket.remoteAddress}`);
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

if (require.main === module) {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[Server] Cổng ${PORT} đã được sử dụng. Máy chủ Cây Tri Ân đang chạy.`);
    } else {
      console.error('[Server Error]:', err);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🌳 CÂY TRI ÂN TÂY NGUYÊN - GRATITUDE SPACE WEB SERVER`);
    console.log(`- Web URL:       http://localhost:${PORT}/index.html`);
    console.log(`- Admin URL:     http://localhost:${PORT}/admin.html`);
    console.log(`- QR Page:       http://localhost:${PORT}/qr.html`);
    console.log(`- AI Studio:     http://localhost:${PORT}/apps/claude-gui/`);
    console.log(`- Chat Stream:   http://localhost:${PORT}/api/chat/stream`);
    console.log(`- Provider Test: http://localhost:${PORT}/api/providers/test`);
    console.log(`=======================================================`);
  });
}

module.exports = { server, launchStudioNative };
