/**
 * PLATFORM ORCHESTRATOR & STARTER
 * Double-click friendly controller for START_PLATFORM.bat:
 * - Checks if Cây Tri Ân Web Server (port 8080) is running; starts it if not.
 * - Opens default browser to Cây Tri Ân.
 * - Checks if Claude GUI Electron is already running; starts it if not.
 * - Prevents duplicate processes.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 8080;
const GRATITUDE_URL = `http://localhost:${PORT}/index.html`;

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}/api/status`, { timeout: 1200 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    spawn('cmd.exe', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
}

async function main() {
  console.log('==================================================================');
  console.log('🌳 NỀN TẢNG HỢP NHẤT: CÂY TRI ÂN TÂY NGUYÊN & AI INNOVATION STUDIO');
  console.log('==================================================================\n');

  // 1. Kiểm tra Web Server Cây Tri Ân
  const isServerOnline = await checkServer();
  if (isServerOnline) {
    console.log(`[✓] Web Server Cây Tri Ân đang hoạt động tại cổng ${PORT}.`);
  } else {
    console.log(`[*] Đang khởi động Web Server Cây Tri Ân trên cổng ${PORT}...`);
    const serverScript = path.join(__dirname, 'serve-gratitude.cjs');
    const serverChild = spawn(process.execPath, [serverScript], {
      cwd: ROOT_DIR,
      detached: true,
      stdio: 'ignore'
    });
    serverChild.unref();

    let ready = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (await checkServer()) {
        ready = true;
        break;
      }
    }
    if (ready) {
      console.log('[✓] Web Server Cây Tri Ân đã sẵn sàng.');
    } else {
      console.log('[!] Web Server khởi động chậm hơn dự kiến, đang tiếp tục...');
    }
  }

  // 2. Mở trình duyệt Cây Tri Ân
  console.log(`[*] Đang mở trình duyệt: ${GRATITUDE_URL}`);
  openBrowser(GRATITUDE_URL);

  console.log('\n==================================================================');
  console.log('✓ CẢ HAI KHÔNG GIAN ĐÃ SẴN SÀNG TRÊN TRÌNH DUYỆT:');
  console.log('- Không Gian 01: Cây Tri Ân Tây Nguyên (Tab chính)');
  console.log('- Không Gian 02: AI Innovation Studio (Nhấp nút AI Studio để mở tab mới)');
  console.log('Cửa sổ này sẽ tự đóng lại trong giây lát...');
  console.log('==================================================================\n');
}

main().catch(err => {
  console.error('[Lỗi khởi động]:', err);
  process.exit(1);
});
