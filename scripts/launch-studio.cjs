const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const PID_FILE = path.join(ROOT_DIR, 'scripts/.studio.pid');
const appDir = path.resolve(ROOT_DIR, 'apps/claude-gui');
const electronExe = path.resolve(appDir, 'node_modules/electron/dist/electron.exe');

// Kiểm tra xem đã có tiến trình đang chạy chưa
if (fs.existsSync(PID_FILE)) {
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    if (pid && !isNaN(pid)) {
      process.kill(pid, 0);
      console.log(`[Claude GUI Desktop] Tiến trình đã đang chạy với PID: ${pid}`);
      process.exit(0);
    }
  } catch (e) {
    // Không còn chạy
  }
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

console.log('[Claude GUI Desktop] Khởi chạy ứng dụng Electron từ:', appDir);

const child = spawn(electronExe, ['.'], {
  cwd: appDir,
  env,
  stdio: 'inherit'
});

try {
  fs.writeFileSync(PID_FILE, String(child.pid), 'utf8');
} catch (e) {}

child.on('exit', (code) => {
  try {
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
  } catch (e) {}
  process.exit(code || 0);
});
