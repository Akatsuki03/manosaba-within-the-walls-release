import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const port = process.env.PORT || '3211';
const args = process.argv.slice(2);
const prepareOnly = args.length === 1 && args[0] === '--prepare-only';
const dataDir = resolve(process.env.MANOSABA_DATA_DIR || join(homedir(), '.manosaba', 'llm-test-v1'));
if ((args.length > 0 && !prepareOnly) || !/^\d+$/u.test(port) || Number(port) < 1 || Number(port) > 65535) {
  console.error('Invalid launch arguments or PORT. Configure MANOSABA_DATA_DIR and PORT through the environment.'); process.exitCode = 1;
} else if (prepareOnly) {
  // Windows launcher readiness phase: no server, database, key import or model
  // request. Existing settings and saves remain untouched.
  try { mkdirSync(dataDir, { recursive: true, mode: 0o700 }); }
  catch { console.error('The LLM data directory could not be prepared.'); process.exitCode = 1; }
} else {
  const child = spawn(process.execPath, ['src/server.mjs'], { cwd: root, stdio: 'inherit', shell: false,
    env: { ...process.env, MANOSABA_EDITION: 'llm', PORT: String(Number(port)),
      MANOSABA_DATA_DIR: dataDir, MANOSABA_LOCAL_RELEASE_PROFILE: 'local0.1.0' } });
  const handlers = new Map();
  const cleanup = () => { for (const [signal, handler] of handlers) process.removeListener(signal, handler); };
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    const handler = () => { if (child.exitCode === null && !child.killed) { try { child.kill(signal); } catch {} } };
    handlers.set(signal, handler); process.on(signal, handler);
  }
  child.once('error', () => { cleanup(); console.error('LLM service could not be started.'); process.exitCode = 1; });
  child.once('close', (code, signal) => { cleanup(); process.exitCode = code ?? ({ SIGINT: 130, SIGTERM: 143, SIGHUP: 129 }[signal] || 1); });
}
