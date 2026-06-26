const http = require('http');
const { spawn } = require('child_process');

const child = spawn(process.execPath, ['app.js'], {
  cwd: 'C:\Users\AK\Documents\fifthapp',
  stdio: ['ignore', 'inherit', 'inherit'],
  shell: false,
  windowsHide: false,
});

const healthPath = 'http://127.0.0.1:3100/healthz';
const port = 3101;
const attempts = 15;
const delayMs = 1500;
let keepAlive = null;
let closed = false;
const close = (code) => {
  if (closed) return;
  closed = true;
  try { keepAlive?.close(); } catch {}
  child.kill('SIGTERM');
  setTimeout(() => process.exit(code ?? 0), 120);
};

keepAlive = http.createServer((_, res) => res.end('watchdog-ok'));
keepAlive.listen(port, async () => {
  console.log(`[watchdog] health probe server on http://127.0.0.1:${port}`);
  child.stdout?.pipe(process.stdout);
  child.stderr?.pipe(process.stderr);

  for (let i = 0; i < attempts; i += 1) {
    const ok = await new Promise((resolve) => {
      http.get(healthPath, (res) => {
        console.log(`[watchdog] probe ${i + 1}/${attempts}: ${res.statusCode}`);
        resolve(true);
      }).on('error', (err) => {
        console.log(`[watchdog] probe ${i + 1}/${attempts}: ${err.code}`);
        resolve(false);
      });
    });
    if (!ok && i >= 2) {
      console.log('[watchdog] healthz not reachable after retries');
      close(1);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  console.log('[watchdog] finished probes; exiting');
  close(0);
});
