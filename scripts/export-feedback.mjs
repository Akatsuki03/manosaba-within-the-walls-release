import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { shareableOperation } from '../src/host/diagnostics.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = ['operations.3.jsonl', 'operations.2.jsonl', 'operations.1.jsonl', 'operations.jsonl'];
const idFormat = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;
const limit = 200;
const windowMs = 120_000;
const maxLogRead = 1024 * 1024;
const errors = {
  arguments: '参数无效。用 --help 查看用法。',
  empty: '没有找到可导出的操作记录。请确认使用的是本次游玩的资料目录；如果启动即退出，附上启动器显示的报错和发生时间。',
  notFound: '没有在保留的操作日志里找到这个编号。请核对编号和资料目录；若日志已轮转，可重新运行并留空编号，导出近期记录。',
  io: '读取操作日志或保存报告失败。请检查资料目录和输出目录权限。原日志未修改。',
};
const fail = code => Object.assign(new Error(errors[code]), { code });

// Never enumerate a user directory, and never open raw debug traffic, saves or
// settings. The game rotates the four fixed files at 1 MiB per file.
async function readLog(path) {
  let info;
  try { info = await lstat(path); }
  catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
  if (!info.isFile() || info.nlink !== 1) return '';
  let handle;
  try { handle = await open(path, 'r'); }
  catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
  try {
    const size = (await handle.stat()).size;
    const offset = Math.max(0, size - maxLogRead);
    const bytes = Buffer.alloc(size - offset);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, offset);
    const text = bytes.subarray(0, bytesRead).toString('utf8');
    const firstNewline = text.indexOf('\n');
    return offset ? (firstNewline < 0 ? '' : text.slice(firstNewline + 1)) : text;
  } finally { await handle.close(); }
}

async function buildIdentity() {
  const result = { node: process.versions.node, platform: process.platform, arch: process.arch };
  try {
    const version = JSON.parse(await readLog(join(root, 'package.json'))).version;
    if (typeof version === 'string' && /^\d{1,6}(?:\.\d{1,6}){2}(?:-hotfix)?$/u.test(version)) result.productVersion = version;
  } catch { /* The operation records still identify the failure. */ }
  // Hash the installed manifest, not the profile, and never export its contents.
  try {
    const path = join(root, 'release-manifest.json');
    const manifest = await readLog(path);
    if (manifest && JSON.parse(manifest).complete === true)
      result.releaseManifestSha256 = createHash('sha256').update(manifest).digest('hex');
  } catch { /* Source checkout or incomplete installation. */ }
  return result;
}

export async function exportFeedback({ dataDir, outputDir, correlationId } = {}) {
  if (correlationId !== undefined && (typeof correlationId !== 'string' || !idFormat.test(correlationId))) throw fail('arguments');
  const profile = resolve(dataDir || process.env.MANOSABA_DATA_DIR || join(homedir(), '.manosaba', 'llm-test-v1'));
  const rows = new Map();
  for (const name of files) {
    const text = await readLog(join(profile, 'logs', name));
    for (const line of text.split('\n')) {
      if (!line || line.length > 16_384) continue;
      let raw;
      try { raw = JSON.parse(line); } catch { continue; } // A concurrent write can leave a partial last line.
      const row = shareableOperation(raw);
      if (row) rows.set(JSON.stringify(row), row);
    }
  }
  const sorted = [...rows.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  let selected = sorted.slice(-limit);
  if (correlationId) {
    correlationId = correlationId.toLowerCase();
    const anchors = sorted.filter(row => row.event === 'http.operation' && row.fields.correlationId === correlationId);
    if (!anchors.length) throw fail('notFound');
    const anchor = anchors.at(-1);
    const time = Date.parse(anchor.timestamp);
    const matching = new Set(anchors.slice(-limit));
    const neighbors = sorted.filter(row => !matching.has(row) && row.sessionId === anchor.sessionId
      && Math.abs(Date.parse(row.timestamp) - time) <= windowMs);
    neighbors.sort((a, b) => Math.abs(Date.parse(a.timestamp) - time) - Math.abs(Date.parse(b.timestamp) - time));
    for (const row of neighbors.slice(0, limit - matching.size)) matching.add(row);
    selected = sorted.filter(row => matching.has(row));
  }
  if (!selected.length) throw fail('empty');
  const info = { format: 'manosaba-feedback-v1', exportedAt: new Date().toISOString(), toolBuild: await buildIdentity(),
    scope: correlationId ? { correlationId, contextSeconds: windowMs / 1000 } : { recentLimit: limit }, count: selected.length,
    // Neighboring model usage has no request ID: it is not billing or proof of a particular call.
    source: 'operation metadata only; nearby model usage is not assigned to the selected request' };
  const directory = resolve(outputDir || join(profile, 'feedback'));
  await mkdir(directory, { recursive: true });
  const stamp = info.exportedAt.replace(/[:.]/gu, '-');
  const path = join(directory, `Manosaba-feedback-${stamp}-${randomUUID().slice(0, 8)}.txt`);
  await writeFile(path, [JSON.stringify(info), ...selected.map(row => JSON.stringify(row)), ''].join('\n'), { encoding: 'utf8', flag: 'wx' });
  return { path, count: selected.length };
}

async function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('node scripts/export-feedback.mjs [--correlation-id 日志编号] [--data-dir 资料目录] [--output-dir 输出目录]');
    return;
  }
  const options = {};
  let interactive = false;
  const keys = { '--correlation-id': 'correlationId', '--data-dir': 'dataDir', '--output-dir': 'outputDir' };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--interactive' && !interactive) { interactive = true; continue; }
    const key = Object.hasOwn(keys, args[i]) && keys[args[i]];
    if (!key || Object.hasOwn(options, key) || !args[i + 1] || args[i + 1].startsWith('--')) throw fail('arguments');
    options[key] = args[++i];
  }
  if (interactive && options.correlationId === undefined && process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try { options.correlationId = (await rl.question('粘贴游戏提示里的日志编号，或直接回车导出近期记录：')).trim() || undefined; }
    finally { rl.close(); }
  }
  const result = await exportFeedback(options);
  console.log(`已提取 ${result.count} 条操作记录：\n${result.path}\n请先预览这个 .txt，再把它拖入项目 GitHub Issue 的正文或评论。工具不会自动上传。`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch(error => {
    console.error(Object.hasOwn(errors, error?.code) ? errors[error.code] : errors.io);
    process.exitCode = 1;
  });
}
