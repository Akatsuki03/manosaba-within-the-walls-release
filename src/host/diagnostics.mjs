import fs from 'node:fs';
import { isProxy } from 'node:util/types';
import { createHash, randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { traceFailure } from '../agents/turn-trace.mjs';

const MAX_OPTIONS_BYTES = 4096;
const MAX_LOG_BYTES = 1024 * 1024;
const ROTATIONS = 3;
const MAX_DEBUG_LOG_BYTES = 16 * 1024 * 1024;
const TRAFFIC_CHUNK_CHARS = 64 * 1024;
const CREDENTIAL_FIELD = /^(?:authorization|proxy-authorization|x-api-key|api[-_]?key|key|keyCipher|csrfToken|token|access[-_]?token|refresh[-_]?token|password|secret|cookie|set-cookie)$/iu;

// Only this explicit host-only path accepts private content. Ordinary event
// whitelists and browser-submitted diagnostic events remain content-free.
function redactTraffic(input, secrets) {
  const values = new Set(secrets.filter(value => typeof value === 'string' && value));
  const ancestors = new Set();
  const copy = (value, depth = 0) => {
    if (depth > 100 || isProxy(value)) throw new TypeError('Invalid traffic data');
    if (value === null || ['string', 'boolean', 'number'].includes(typeof value)) return value;
    if (value === undefined) return null;
    if (typeof value !== 'object' || ancestors.has(value)
      || (!Array.isArray(value) && !object(value))) throw new TypeError('Invalid traffic data');
    ancestors.add(value);
    const result = Array.isArray(value) ? [] : Object.create(null);
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError('Invalid traffic data');
      if (CREDENTIAL_FIELD.test(key)) {
        if (typeof descriptor.value === 'string' && descriptor.value) values.add(descriptor.value);
        result[key] = '[REDACTED]';
      } else result[key] = copy(descriptor.value, depth + 1);
    }
    ancestors.delete(value);
    return result;
  };
  const data = copy(input);
  const ordered = [...values].sort((a, b) => b.length - a.length);
  const scrub = value => {
    if (typeof value === 'string') {
      for (const secret of ordered) value = value.split(secret).join('[REDACTED]');
      return value.replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/giu, 'Bearer [REDACTED]');
    }
    if (value && typeof value === 'object') {
      const result = Array.isArray(value) ? [] : Object.create(null);
      for (const [key, child] of Object.entries(value)) result[scrub(key)] = scrub(child);
      return result;
    }
    return value;
  };
  return scrub(data);
}
const MAX_CLIENT_EVENTS = 20;
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;
const MAX_LENGTH = 1024 * 1024;
const EVENTS = new Set(['server.start', 'server.stop', 'delivery.deferred', 'http.operation', 'preferences.updated', 'client.ui', 'model.usage']);
const MODEL_ROLES = new Set(['roleplay', 'character_data', 'intent_parser', 'player_performance', 'narrator', 'scene_composer', 'director']);
const PATHS = new Set([
  '/api/magic', '/api/magic/activate', '/api/magic/cast',
  '/api/view', '/api/dice', '/api/dice/roll', '/api/guard-rules', '/api/guard-rules/activate', '/api/case-item-rules', '/api/case-item-rules/activate', '/api/ability-rules', '/api/ability-rules/activate', '/api/act', '/api/regenerate', '/api/case-execution', '/api/save', '/api/saves/rename', '/api/saves/delete', '/api/load', '/api/rewind', '/api/new-game', '/api/player/avatar',
  '/api/creation/catalog', '/api/creation/presets', '/api/creation/presets/read', '/api/creation/presets/save', '/api/creation/presets/delete', '/api/creation/complete',
  '/api/options', '/api/diagnostics/events', '/api/settings', '/api/settings/save',
  '/api/settings/activate', '/api/settings/delete', '/api/settings/models', '/api/prompts', '/api/prompts/update',
]);
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const RESULTS = new Set(['ok', 'success', 'error', 'accepted', 'rejected', 'needs_clarification', 'conflict', 'not_found', 'cancelled', 'completed']);
const ACTIONS = new Set([
  'suggestion.select', 'action.submit', 'save.select', 'save.confirm', 'save.cancel', 'save.delete',
  'save.overwrite', 'save.rename', 'menu.open', 'dialog.close', 'preferences.change', 'client.error',
]);
const SOURCES = new Set(['button', 'enter', 'suggestion', 'keyboard', 'pointer']);
// Fixed codes, not merely an uppercase regex: a credential can also be uppercase.
const CODES = new Set([
  'INVALID_HOST', 'INVALID_ORIGIN', 'INVALID_TOKEN', 'INVALID_CONTENT_TYPE', 'INVALID_BODY_SIZE',
  'INVALID_BODY', 'INVALID_JSON', 'INTERNAL_ERROR', 'INVALID_OPTIONS', 'INVALID_CLIENT_EVENTS',
  'OPTIONS_READ_FAILED', 'OPTIONS_WRITE_FAILED', 'INVALID_STATE', 'INVALID_TURN', 'INVALID_GENERATION',
  'INVALID_REVISION', 'INVALID_REQUEST_ID', 'INVALID_REGENERATION', 'INVALID_CASE_EXECUTION', 'INVALID_VERDICT', 'INVALID_TEXT', 'INVALID_SAVE_NAME', 'INVALID_SAVE',
  'INVALID_SAVE_OPTIONS', 'INVALID_SAVE_VERSION', 'INVALID_COLOR', 'INVALID_EXAMPLE', 'INVALID_AVATAR',
  'INVALID_CUSTOM_STATE', 'INVALID_CUSTOM_MARKERS', 'INVALID_CUSTOM_SOURCE', 'INVALID_CUSTOM_DIALOGUE',
  'INVALID_PROTOTYPE_STATE', 'INVALID_PROTOTYPE_ACTION', 'UNSUPPORTED_PROTOTYPE_VERSION',
  'STALE_GENERATION', 'STALE_REVISION', 'STALE_SAVE', 'STALE_PREPARATION', 'INVALID_PREPARATION',
  'SETTINGS_UNAVAILABLE', 'IDEMPOTENCY_CONFLICT', 'SAVE_NOT_FOUND',
  'LLM_NOT_CONFIGURED', 'ERR_LLM_TURN_FAILED', 'AGENT_TIMEOUT', 'AGENT_BATCH_CANCELLED', 'LLM_REQUIRED', 'STALE_AGENT_TURN',
  'ERR_MODEL_CONFIG', 'ERR_MODEL_PACKET', 'ERR_MODEL_REQUEST', 'ERR_MODEL_RESPONSE', 'ERR_MODEL_TIMEOUT', 'ERR_MODEL_CANCELLED',
  'INVALID_CASE_ITEM_REQUEST', 'INVALID_CASE_ITEM_PENDING', 'INVALID_AGENT_STATE', 'INVALID_AGENT_JOB', 'INVALID_AGENT_OUTPUT', 'INVALID_AGENT_ACTOR', 'INVALID_NARRATIVE_OUTPUT', 'INVALID_PROMPT', 'STALE_PROMPT',
  'INVALID_DELIVERY_OPTIONS', 'INVALID_DELIVERY_STATE', 'STALE_DELIVERY_LEASE', 'DELIVERY_NOT_READY', 'UNSUPPORTED_DELIVERY_VERSION',
  'SOURCE_VERSION_MISMATCH', 'UNSUPPORTED_STATE_VERSION', 'UNSUPPORTED_CUSTOM_FORMAT_VERSION',
  'LEGACY_LINEAGE_UNRESOLVED', 'CUSTOM_COMPLETED', 'CLOSED',
  'INVALID_DICE_REQUEST', 'INVALID_DICE_STATE', 'INVALID_DICE_OPTION', 'INVALID_DICE_PENDING', 'INVALID_DICE_REACTION',
  'INVALID_GUARD_REQUEST', 'INVALID_GUARD_PENDING', 'INVALID_GUARD_STATE', 'INVALID_GUARD_DICE_RESULT',
  'INVALID_ABILITY_REQUEST', 'INVALID_ABILITY_PENDING', 'INVALID_ABILITY_STATE', 'INVALID_ABILITY_GRANT', 'MAGIC_HOST_RULE_GATED',
  'INVALID_SPATIAL_DESTINATION', 'INVALID_SPATIAL_CHOICE', 'UNWITNESSED_SPATIAL_DESTINATION',
  'GUARD_REACTION_PENDING', 'GUARD_DETAINED', 'GUARD_DETENTION_RESUME_REQUIRED', 'GUARD_DETENTION_NOT_DUE',
  'GUARD_DETENTION_NOT_WAITING', 'GUARD_CASE_BOUNDARY', 'GUARD_RULES_UNSUPPORTED', 'GUARD_RULES_ALREADY_ACTIVE', 'GUARD_RULES_DISABLED',
]);
const MESSAGES = Object.freeze({
  INVALID_OPTIONS: '运行偏好格式无效：仅支持 directSendSuggestions、debug 和 developerMode 布尔值，0 到 10 的 llmRetryCount 整数，以及 off 或 advisory 的 directorMode。',
  OPTIONS_READ_FAILED: '无法读取本机运行偏好，当前使用安全默认值。请修复或移走配置文件后重启；原文件未更改。',
  OPTIONS_WRITE_FAILED: '无法保存本机运行偏好，原配置未更改。请检查目录权限后重试。',
  INVALID_CLIENT_EVENTS: '客户端诊断格式无效：需要至多 20 条事件。',
});
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;
const WATERMARKS = [
  'generation', 'revision', 'expectedGeneration', 'expectedRevision', 'beforeGeneration', 'beforeRevision',
  'afterGeneration', 'afterRevision', 'expectedSaveVersion', 'saveVersion', 'expected', 'before', 'after',
];

/** Safe, fixed messages only; never include an underlying filesystem error or input. */
export class DiagnosticsError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(MESSAGES, code) ? code : 'INVALID_OPTIONS';
    super(MESSAGES[safeCode]);
    this.name = 'DiagnosticsError';
    this.code = safeCode;
  }
}

function object(value) {
  return value !== null && typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
function own(value, key) {
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}
function strictFields(value, allowed) {
  return object(value) && Reflect.ownKeys(value).every(key => allowed.includes(key)
    && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
}
function integer(value, max = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= 0 && value <= max;
}
function missing(error) {
  return error?.code === 'ENOENT';
}
function safeId(value) {
  if (typeof value !== 'string' || value.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u.test(value)) return undefined;
  if (UUID.test(value)) return value.toLowerCase();
  // Engine request IDs may be user-chosen. Hash them instead of retaining possible
  // labels/credentials disguised as syntactically valid identifiers.
  return `sha256:${createHash('sha256').update(value).digest('hex').slice(0, 32)}`;
}
function sanitize(event, input, debugEnabled, detailedOperation = false) {
  const fields = {};
  if (!object(input)) return event === 'client.ui' ? null : fields;
  if (event === 'client.ui') {
    const action = own(input, 'action');
    const source = own(input, 'source');
    if (!ACTIONS.has(action) || (source !== undefined && !SOURCES.has(source))) return null;
    fields.action = action;
    if (source !== undefined) fields.source = source;
    for (const key of ['generation', 'revision', 'count', 'length']) {
      const value = own(input, key);
      if (integer(value, key === 'count' || key === 'length' ? MAX_LENGTH : Number.MAX_SAFE_INTEGER)) fields[key] = value;
    }
  } else if (event === 'model.usage') {
    const role = own(input, 'role'); const protocol = own(input, 'protocol'); const cacheStatus = own(input, 'cacheStatus');
    if (MODEL_ROLES.has(role)) fields.role = role;
    if (['openai', 'anthropic'].includes(protocol)) fields.protocol = protocol;
    if (['unknown', 'hit', 'miss'].includes(cacheStatus)) fields.cacheStatus = cacheStatus;
    for (const key of ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'requestBytes', 'packetBytes', 'compactSourceCount']) {
      const value = own(input, key);
      if (integer(value, 1_000_000_000)) fields[key] = value;
    }
    const duration = own(input, 'durationMs');
    if (typeof duration === 'number' && Number.isFinite(duration) && duration >= 0 && duration <= MAX_DURATION_MS) fields.durationMs = Math.round(duration * 1000) / 1000;
  } else if (event === 'preferences.updated') {
    for (const key of ['directSendSuggestions', 'debug', 'developerMode']) {
      const value = own(input, key);
      if (typeof value === 'boolean') fields[key] = value;
    }
    const retries = own(input, 'llmRetryCount');
    if (integer(retries, 10)) fields.llmRetryCount = retries;
    const directorMode = own(input, 'directorMode');
    if (['off', 'advisory'].includes(directorMode)) fields.directorMode = directorMode;
  } else if (event === 'http.operation') {
    const path = own(input, 'path');
    const method = own(input, 'method');
    const status = own(input, 'status');
    const result = own(input, 'result');
    const accepted = own(input, 'accepted');
    const code = own(input, 'code');
    const textLength = own(input, 'textLength');
    if (PATHS.has(path)) fields.path = path;
    if (METHODS.has(method)) fields.method = method;
    if ((integer(status, 599) && status >= 100) || RESULTS.has(status)) fields.status = status;
    if (RESULTS.has(result)) fields.result = result;
    if (typeof accepted === 'boolean') fields.accepted = accepted;
    if (CODES.has(code)) fields.code = code;
    // Root cause is essential metadata, not a debug-only payload. Re-project
    // even trusted callers so getters, task identities and messages stay out.
    const failure = traceFailure(own(input, 'failure'), { developer: detailedOperation });
    if (failure && Object.keys(failure).length) fields.failure = failure;
    if (integer(textLength, MAX_LENGTH)) fields.textLength = textLength;
    for (const key of WATERMARKS) {
      const value = own(input, key);
      if (integer(value)) fields[key] = value;
    }
    for (const key of ['requestId', 'correlationId']) {
      const value = safeId(own(input, key));
      if (value !== undefined) fields[key] = value;
    }
  }
  if (debugEnabled && (event === 'http.operation' || event === 'client.ui')) {
    const duration = own(input, 'durationMs');
    if (typeof duration === 'number' && Number.isFinite(duration) && duration >= 0 && duration <= MAX_DURATION_MS) {
      fields.durationMs = Math.round(duration * 1000) / 1000;
    }
  }
  return fields;
}

/** Re-project on export instead of trusting a file just because of its name.
 * Stored operation IDs have already been hashed; keep only their canonical
 * forms so a GitHub report can still be correlated with the in-game error. */
export function shareableOperation(row) {
  if (!object(row) || !EVENTS.has(row.event) || !object(row.fields)
    || typeof row.timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(row.timestamp)) return null;
  const date = new Date(row.timestamp);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== row.timestamp) return null;
  const fields = sanitize(row.event, row.fields, row.debug === true, row.debug === true);
  if (!fields) return null;
  for (const key of ['requestId', 'correlationId']) {
    delete fields[key];
    const id = row.fields[key];
    if (row.event === 'http.operation' && typeof id === 'string'
      && (UUID.test(id) || /^sha256:[a-f0-9]{32}$/u.test(id))) fields[key] = id.toLowerCase();
  }
  return { timestamp: row.timestamp, ...(typeof row.sessionId === 'string' && UUID.test(row.sessionId)
    ? { sessionId: row.sessionId.toLowerCase() } : {}), event: row.event, fields };
}

/** Runtime preferences and local diagnostics only; never opens the game database.
 * constructor(dataDir, fileSystem = fs) accepts a synchronous node:fs-compatible
 * adapter for testing. No server/HTTP operations are recorded implicitly.
 *
 * A corrupt/unreadable options file uses defaults without blocking startup. It
 * remains untouched, and update() throws OPTIONS_READ_FAILED until repaired and
 * the instance is recreated. Legacy version-1 files without developerMode keep
 * developer inspection disabled until explicitly enabled; loading never rewrites
 * preferences, and subsequent changes persist all current preference fields.
 * Log failures instead open a per-instance circuit breaker: record() returns
 * false, view().logAvailable becomes false, and only one safe warning is emitted.
 */
export class Diagnostics {
  #fs;
  #directory;
  #file;
  #logDirectory;
  #logFile;
  #state = { directSendSuggestions: false, debug: false, developerMode: false, llmRetryCount: 3, directorMode: 'off' };
  #optionsBlocked = false;
  #logAvailable = true;
  #warned = new Set();
  #sessionId = randomUUID();

  constructor(dataDir, fileSystem = fs) {
    this.#fs = fileSystem;
    this.#directory = resolve(dataDir);
    this.#file = join(this.#directory, 'runtime-options.json');
    this.#logDirectory = join(this.#directory, 'logs');
    this.#logFile = join(this.#logDirectory, 'operations.jsonl');
    this.#load();
    try {
      this.#fs.mkdirSync(this.#logDirectory, { recursive: true, mode: 0o700 });
      // Discard oversized legacy log files rather than retaining unbounded data.
      for (let index = 0; index <= ROTATIONS; index++) {
        const file = index === 0 ? this.#logFile : this.#rotation(index);
        const size = this.#size(file);
        if (size > MAX_LOG_BYTES) this.#fs.unlinkSync(file);
      }
      const fd = this.#fs.openSync(this.#logFile, 'a', 0o600);
      this.#fs.closeSync(fd);
    } catch { this.#disableLog(); }
  }

  view() {
    return { ...this.#state, logDirectory: this.#logDirectory, logAvailable: this.#logAvailable };
  }

  #warn(code) {
    if (this.#warned.has(code)) return;
    this.#warned.add(code);
    try {
      console.warn(code === 'OPTIONS_READ_FAILED'
        ? 'Manosaba runtime preferences unavailable; using safe defaults [OPTIONS_READ_FAILED].'
        : 'Manosaba diagnostic log unavailable [LOG_UNAVAILABLE].');
    } catch { /* A console failure must not affect an accepted operation either. */ }
  }

  #disableLog() {
    this.#logAvailable = false;
    this.#warn('LOG_UNAVAILABLE');
    return false;
  }

  #load() {
    try {
      this.#fs.mkdirSync(this.#directory, { recursive: true, mode: 0o700 });
      let size;
      try { size = this.#fs.statSync(this.#file).size; }
      catch (error) { if (missing(error)) return; throw error; }
      if (!integer(size, MAX_OPTIONS_BYTES)) throw new DiagnosticsError('OPTIONS_READ_FAILED');
      const saved = JSON.parse(this.#fs.readFileSync(this.#file, 'utf8'));
      if (!strictFields(saved, ['version', 'directSendSuggestions', 'debug', 'developerMode', 'llmRetryCount', 'directorMode']) || saved.version !== 1
        || typeof saved.directSendSuggestions !== 'boolean' || typeof saved.debug !== 'boolean'
        || (Object.hasOwn(saved, 'developerMode') && typeof saved.developerMode !== 'boolean')
        || (Object.hasOwn(saved, 'llmRetryCount') && !integer(saved.llmRetryCount, 10))
        || (Object.hasOwn(saved, 'directorMode') && !['off', 'advisory'].includes(saved.directorMode))) {
        throw new DiagnosticsError('OPTIONS_READ_FAILED');
      }
      this.#state = {
        directSendSuggestions: saved.directSendSuggestions,
        debug: saved.debug,
        developerMode: Object.hasOwn(saved, 'developerMode') ? saved.developerMode : false,
        // Missing on older files: three automatic model retries, without rewriting
        // the file until the next explicit preference change.
        llmRetryCount: Object.hasOwn(saved, 'llmRetryCount') ? saved.llmRetryCount : 3,
        directorMode: saved.directorMode ?? 'off',
      };
    } catch {
      this.#optionsBlocked = true;
      this.#warn('OPTIONS_READ_FAILED');
    }
  }

  update(input) {
    let patch;
    try {
      if (!strictFields(input, ['directSendSuggestions', 'debug', 'developerMode', 'llmRetryCount', 'directorMode'])) throw new DiagnosticsError('INVALID_OPTIONS');
      patch = {};
      for (const key of Reflect.ownKeys(input)) {
        const value = own(input, key);
        if (key === 'llmRetryCount') {
          if (!integer(value, 10)) throw new DiagnosticsError('INVALID_OPTIONS');
        } else if (key === 'directorMode') {
          if (!['off', 'advisory'].includes(value)) throw new DiagnosticsError('INVALID_OPTIONS');
        } else if (typeof value !== 'boolean') throw new DiagnosticsError('INVALID_OPTIONS');
        patch[key] = value;
      }
    } catch { throw new DiagnosticsError('INVALID_OPTIONS'); }
    if (this.#optionsBlocked) throw new DiagnosticsError('OPTIONS_READ_FAILED');
    const next = { ...this.#state, ...patch };
    if (next.directSendSuggestions === this.#state.directSendSuggestions && next.debug === this.#state.debug
      && next.developerMode === this.#state.developerMode && next.llmRetryCount === this.#state.llmRetryCount
      && next.directorMode === this.#state.directorMode) return this.view();
    const temporary = `${this.#file}.${randomUUID()}.tmp`;
    let fd;
    try {
      this.#fs.mkdirSync(this.#directory, { recursive: true, mode: 0o700 });
      fd = this.#fs.openSync(temporary, 'wx', 0o600);
      this.#fs.writeFileSync(fd, `${JSON.stringify({ version: 1, ...next }, null, 2)}\n`, 'utf8');
      this.#fs.fsyncSync(fd);
      this.#fs.closeSync(fd);
      fd = undefined;
      this.#fs.renameSync(temporary, this.#file);
    } catch {
      if (fd !== undefined) { try { this.#fs.closeSync(fd); } catch {} }
      try { this.#fs.unlinkSync(temporary); } catch {}
      throw new DiagnosticsError('OPTIONS_WRITE_FAILED');
    }
    this.#state = next;
    this.record('preferences.updated', next);
    return this.view();
  }

  #rotation(index) {
    return join(this.#logDirectory, `operations.${index}.jsonl`);
  }

  #size(file) {
    try { return this.#fs.statSync(file).size; }
    catch (error) { if (missing(error)) return 0; throw error; }
  }

  #rotate(bytes) {
    if (this.#size(this.#logFile) + bytes <= MAX_LOG_BYTES) return;
    try { this.#fs.unlinkSync(this.#rotation(ROTATIONS)); }
    catch (error) { if (!missing(error)) throw error; }
    for (let index = ROTATIONS - 1; index >= 0; index--) {
      const source = index === 0 ? this.#logFile : this.#rotation(index);
      try { this.#fs.renameSync(source, this.#rotation(index + 1)); }
      catch (error) { if (!missing(error)) throw error; }
    }
  }

  /** Returns whether a safe JSON line was actually appended; never throws. */
  record(event, fields = {}, options = {}) {
    if (!this.#logAvailable || !EVENTS.has(event)) return false;
    let debug;
    let sanitized;
    try {
      debug = object(options) ? own(options, 'debug') : undefined;
      if (debug !== undefined && typeof debug !== 'boolean') return false;
      if ((debug || event === 'client.ui') && !this.#state.debug) return false;
      sanitized = sanitize(event, fields, this.#state.debug, debug === true);
    } catch { return false; }
    if (sanitized === null) return false;
    try {
      const line = `${JSON.stringify({
        timestamp: new Date().toISOString(), sessionId: this.#sessionId, event,
        debug: debug === true || event === 'client.ui', fields: sanitized,
      })}\n`;
      const bytes = Buffer.byteLength(line, 'utf8');
      if (bytes > MAX_LOG_BYTES) return false;
      this.#rotate(bytes);
      this.#fs.appendFileSync(this.#logFile, line, { encoding: 'utf8', mode: 0o600, flag: 'a' });
      return true;
    } catch { return this.#disableLog(); }
  }

  /** Private local debug traffic, never exposed through HTTP or ordinary logs.
   * Large JSON payloads are losslessly chunked, not silently truncated. As with
   * operation logs, bounded rotation can discard old records over time.
   */
  recordTraffic(event, fields, secrets = []) {
    if (!this.#state.debug || !this.#logAvailable
      || !['http.exchange', 'model.request', 'model.response'].includes(event)) return false;
    let serialized;
    try { serialized = JSON.stringify(redactTraffic(fields, secrets)); }
    catch { return false; }
    try {
      const file = join(this.#logDirectory, 'debug-traffic.jsonl');
      const rotation = index => join(this.#logDirectory, `debug-traffic.${index}.jsonl`);
      const trafficId = randomUUID();
      const count = Math.ceil(serialized.length / TRAFFIC_CHUNK_CHARS) || 1;
      for (let index = 0; index < count; index++) {
        const line = `${JSON.stringify({ timestamp: new Date().toISOString(), sessionId: this.#sessionId,
          event, debug: true, visibility: 'HOST_ONLY', trafficId,
          ...(count === 1 ? { fields: JSON.parse(serialized) } : {
            encoding: 'json-chunks', chunkIndex: index, chunkCount: count,
            chunk: serialized.slice(index * TRAFFIC_CHUNK_CHARS, (index + 1) * TRAFFIC_CHUNK_CHARS),
          }) })}\n`;
        if (this.#size(file) + Buffer.byteLength(line, 'utf8') > MAX_DEBUG_LOG_BYTES) {
          try { this.#fs.unlinkSync(rotation(ROTATIONS)); }
          catch (error) { if (!missing(error)) throw error; }
          for (let part = ROTATIONS - 1; part >= 0; part--) {
            try { this.#fs.renameSync(part === 0 ? file : rotation(part), rotation(part + 1)); }
            catch (error) { if (!missing(error)) throw error; }
          }
        }
        this.#fs.appendFileSync(file, line, { encoding: 'utf8', mode: 0o600, flag: 'a' });
      }
      return true;
    } catch { return this.#disableLog(); }
  }

  /** Client input cannot supply event names, timestamps, sessions or server IDs. */
  clientEvents(input) {
    if (!this.#state.debug || !this.#logAvailable) return { recorded: 0 };
    let events;
    let count;
    try {
      if (!strictFields(input, ['events'])) throw new DiagnosticsError('INVALID_CLIENT_EVENTS');
      events = own(input, 'events');
      if (!Array.isArray(events)) throw new DiagnosticsError('INVALID_CLIENT_EVENTS');
      count = own(events, 'length');
      if (!integer(count, MAX_CLIENT_EVENTS)) throw new DiagnosticsError('INVALID_CLIENT_EVENTS');
    } catch { throw new DiagnosticsError('INVALID_CLIENT_EVENTS'); }
    let recorded = 0;
    for (let index = 0; index < count; index++) {
      try {
        const item = own(events, String(index));
        if (!object(item)) continue;
        if (this.record('client.ui', item, { debug: true })) recorded++;
      } catch { /* Malformed individual events are dropped, never echoed. */ }
    }
    return { recorded };
  }
}
