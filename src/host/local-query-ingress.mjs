import { createServer, request } from 'node:http';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { openLocalAgentObserver } from '../prologue.mjs';

export const INTERNAL_QUERY_INGRESS = 'x-manosaba-internal-ingress';
export const validLocalHost = (host, port) => host === '127.0.0.1:' + port || host === 'localhost:' + port;
export function configureLocalHttpResponse(res, correlationId = randomUUID()) {
  res.setHeader('X-Manosaba-Request-Id', correlationId);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; media-src 'self'; img-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
}

// Both handlers use the same request parser. A legacy root returns null from
// the observer and must use the existing Host handler, not a stale DTO.
export function serveAgentObservation(req, json, observer) {
  const path = req.url;
  if (req.method !== 'GET' || typeof path !== 'string') return false;
  if (path === '/api/agent-status') {
    const dto = observer.status();
    if (dto === null) return false;
    json(200, dto); return true;
  }
  if (path !== '/api/agent-progress' && !path.startsWith('/api/agent-progress?')) return false;
  if ((req.headers.origin && req.headers.origin !== 'http://' + req.headers.host)
      || ['cross-site', 'same-site'].includes(req.headers['sec-fetch-site'])) {
    json(403, { code: 'INVALID_ORIGIN', error: '不接受跨站请求。' }); return true;
  }
  const query = new URL(path, 'http://' + req.headers.host).searchParams, options = {};
  for (const key of query.keys()) {
    const value = query.get(key);
    if (!['after', 'generation', 'jobRef'].includes(key) || query.getAll(key).length !== 1
        || (key !== 'jobRef' && !/^(?:0|[1-9][0-9]{0,15})$/u.test(value))
        || (key === 'jobRef' && !/^[a-f0-9]{64}$/u.test(value))) {
      json(400, { code: 'INVALID_AGENT_PROGRESS', error: '进度游标格式无效。' }); return true;
    }
    options[key] = key === 'jobRef' ? value : Number(value);
  }
  const dto = observer.progress(options);
  if (dto === null) return false;
  json(200, dto); return true;
}

const fixedHopHeaders = new Set(['connection', 'keep-alive', 'proxy-connection', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', INTERNAL_QUERY_INGRESS]);
const nominatedHeaders = headers => String(headers.connection ?? '').toLowerCase().split(',').map(x => x.trim());
function withoutHopHeaders(headers) {
  const result = { ...headers };
  for (const key of [...fixedHopHeaders, ...nominatedHeaders(headers)]) delete result[key];
  return result;
}

// Only the two read-only projections execute on the listener's thread. The
// original Host still owns every mutation and every other route. It receives
// the same browser Host/Origin and CSRF/Version fields; the private upstream
// destination is never supplied by the client. No additional browser origin.
if (!isMainThread && workerData?.kind === 'local-query-ingress@1') {
  const observer = openLocalAgentObserver(workerData.dbPath);
  const front = createServer((req, res) => {
    configureLocalHttpResponse(res);
    const json = (status, dto) => res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(dto));
    if (!validLocalHost(req.headers.host, front.address().port)) return json(403, { code: 'INVALID_HOST', error: '只允许本机地址访问。' });
    try { if (serveAgentObservation(req, json, observer)) return; }
    catch (error) {
      if (req.url === '/api/agent-status') return json(503, { code: 'AGENT_STATUS_UNAVAILABLE', error: '角色状态暂不可用，请稍后重试。' });
      const invalid = error?.code === 'INVALID_AGENT_PROGRESS';
      return json(invalid ? 400 : 503, { code: invalid ? 'INVALID_AGENT_PROGRESS' : 'AGENT_PROGRESS_UNAVAILABLE', error: '进度资料暂不可用，请确认游标后手动刷新。' });
    }
    // Refuse requests that would lose end-to-end Host authorization or
    // version metadata when removing nominated connection-local headers.
    if (nominatedHeaders(req.headers).some(key => Object.hasOwn(req.headers, key) && !fixedHopHeaders.has(key)))
      return json(400, { code: 'INVALID_CONNECTION_HEADERS', error: '请求头格式无效。' });
    const headers = withoutHopHeaders(req.headers);
    headers.host = req.headers.host; headers[INTERNAL_QUERY_INGRESS] = workerData.key;
    const upstream = request({ host: '127.0.0.1', port: workerData.backendPort, path: req.url, method: req.method, headers }, incoming => {
      res.writeHead(incoming.statusCode, withoutHopHeaders(incoming.headers));
      incoming.once('error', () => res.destroy());
      incoming.pipe(res);
    });
    upstream.once('error', () => {
      if (!res.headersSent) json(503, { code: 'LOCAL_HOST_UNAVAILABLE', error: '本机游戏服务暂不可用。' });
      else res.destroy();
    });
    req.once('aborted', () => upstream.destroy());
    req.once('error', () => upstream.destroy());
    res.once('close', () => { if (!res.writableEnded) upstream.destroy(); });
    req.pipe(upstream);
  });
  front.listen(workerData.port, '127.0.0.1', () => parentPort.postMessage({ op: 'listening', address: front.address() }));
  parentPort.on('message', op => {
    if (op === 'close-connections') front.closeAllConnections();
    if (op === 'close') {
      front.close(() => { observer.close(); parentPort.close(); });
      front.closeAllConnections();
    }
  });
}

// The existing launchers/carriers use listening, address and connection close
// events. Do not expose the private upstream address through this handle.
export class LocalQueryIngress extends EventEmitter {
  #backend; #options; #worker; #address = null; #closing; #stopping = false;
  constructor({ backend, ...options }) { super(); this.#backend = backend; this.#options = options; }
  get listening() { return this.#address !== null; }
  address() { return this.#address; }
  start() {
    this.#backend.listen(0, '127.0.0.1', () => {
      if (this.#stopping) return;
      const args = process.execArgv.filter(x => x.startsWith('--import='));
      this.#worker = new Worker(new URL(import.meta.url), { execArgv: args,
        workerData: { kind: 'local-query-ingress@1', ...this.#options, backendPort: this.#backend.address().port } });
      this.#worker.on('message', message => {
        if (message.op !== 'listening' || this.#stopping) return;
        this.#address = message.address; this.emit('listening');
      });
      this.#worker.once('error', error => { if (!this.#stopping) this.emit('error', error); });
      this.#worker.once('exit', code => {
        this.#address = null;
        if (!this.#stopping && code === 0) this.emit('error', new Error('Local query ingress stopped unexpectedly.'));
      });
    });
  }
  closeAllConnections() { this.#worker?.postMessage('close-connections'); this.#backend.closeAllConnections(); }
  close() {
    if (this.#closing) return this.#closing;
    this.#stopping = true;
    this.#closing = (async () => {
      const worker = this.#worker;
      if (worker && worker.threadId !== -1) await new Promise(done => { worker.once('exit', done); worker.postMessage('close'); });
      this.#address = null;
      await new Promise(done => { this.#backend.close(done); this.#backend.closeAllConnections(); });
      this.emit('close');
    })();
    return this.#closing;
  }
}
