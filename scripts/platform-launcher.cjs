/**
 * UNIFIED PLATFORM LAUNCHER
 * Coordinates the dual-space runtime:
 * Space 01: Cây Tri Ân Tây Nguyên (Web Runtime on http://localhost:8080)
 * Space 02: AI Innovation Studio (Claude GUI Electron Native Desktop)
 */
const path = require('path');
const { spawn } = require('child_process');
const { server, launchStudioNative } = require('./serve-gratitude.cjs');

const PORT = process.env.PORT || 8080;
const GRATITUDE_URL = `http://localhost:${PORT}/index.html`;

console.log('\n[Platform Launcher] Khởi động Nền tảng Hợp nhất Cây Tri Ân Tây Nguyên...\n');

// 1. Open Gratitude Space in default browser
function openBrowser(url) {
  const startCmd = process.platform === 'win32' ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
  spawn(startCmd, [url], { shell: true, detached: true, stdio: 'ignore' }).unref();
}

setTimeout(() => {
  console.log(`[Platform Launcher] Đang mở Không Gian Cây Tri Ân: ${GRATITUDE_URL}`);
  openBrowser(GRATITUDE_URL);

  // 2. Launch Claude GUI Desktop Studio Native
  console.log('[Platform Launcher] Đang mở Không Gian Sáng Tạo AI (Claude GUI Desktop)...');
  const studioPid = launchStudioNative();
  console.log(`[Platform Launcher] Claude GUI Desktop đã chạy với PID: ${studioPid}`);
  console.log('\n✓ CẢ HAI KHÔNG GIAN ĐÃ HOẠT ĐỘNG ĐỒNG BỘ TRÊN HỆ THỐNG.\n');
}, 1000);
