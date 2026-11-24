import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const PREFIX = 'dpapi-current-user:v1:';
const MAX_OUTPUT = 64 * 1024;
const ERROR = '无法安全处理 API Key：需要当前 Windows 账户的 DPAPI 加密服务，禁止退化为明文存储。';
// This script is constant. Secrets travel exclusively through the child's stdin/stdout,
// never command arguments, environment variables, temporary files, or diagnostics.
const SCRIPT = `
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName System.Security
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
  $bytes = [Convert]::FromBase64String($request.data)
  if ($request.operation -eq 'protect') {
    $result = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  } elseif ($request.operation -eq 'unprotect') {
    $result = [Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  } else { exit 1 }
  [Console]::Out.Write([Convert]::ToBase64String($result))
} catch { exit 1 }
`;
const ENCODED_SCRIPT = Buffer.from(SCRIPT, 'utf16le').toString('base64');
function fail() { throw new Error(ERROR); }
function base64(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_OUTPUT
    && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value);
}
export function hasSecureBackend() { return process.platform === 'win32'; }
function transform(operation, data) {
  if (!hasSecureBackend()) fail();
  try {
    const executable = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const result = spawnSync(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', ENCODED_SCRIPT], {
      input: JSON.stringify({ operation, data }), encoding: 'utf8', windowsHide: true,
      timeout: 10_000, maxBuffer: MAX_OUTPUT,
    });
    if (result.error || result.signal || result.status !== 0 || !base64(result.stdout)) fail();
    return result.stdout;
  } catch { fail(); }
}
export function encryptSecret(secret) {
  if (secret === '') return '';
  if (typeof secret !== 'string' || secret.length > 8192 || /[\u0000-\u001f\u007f]/u.test(secret)) fail();
  return PREFIX + transform('protect', Buffer.from(secret, 'utf8').toString('base64'));
}
export function decryptSecret(cipher) {
  if (cipher === '') return '';
  if (typeof cipher !== 'string' || !cipher.startsWith(PREFIX) || !base64(cipher.slice(PREFIX.length))) fail();
  try {
    const secret = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(transform('unprotect', cipher.slice(PREFIX.length)), 'base64'));
    if (!secret || secret.length > 8192 || /[\u0000-\u001f\u007f]/u.test(secret)) fail();
    return secret;
  } catch { fail(); }
}
