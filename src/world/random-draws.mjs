import { createHash, createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { types } from 'node:util';

export const RNG_VERSION = 'hmac-sha256-json-v1';
export const RANDOM_DRAW_SCHEMA_VERSION = 1;

const MESSAGES = Object.freeze({
  INVALID_RANDOM_OPTIONS: 'Random draw options are invalid.',
  INVALID_RANDOM_JSON: 'Random draw canonical JSON is invalid.',
  INVALID_RANDOM_TRANSACTION: 'Random draw writes require a caller-owned transaction.',
  INVALID_RANDOM_RUN: 'The random draw run is missing or invalid.',
  INVALID_RANDOM_SCHEMA: 'The random draw ledger schema is invalid or unsupported.',
  INVALID_RANDOM_STATE: 'The persisted random draw could not be safely used.',
  UNSUPPORTED_RNG_VERSION: 'The random draw algorithm version is unsupported.',
  RANDOM_DRAW_CONFLICT: 'The random draw identity already has a different distribution.',
});

export class RandomDrawError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(MESSAGES, code) ? code : 'INVALID_RANDOM_STATE';
    super(MESSAGES[safeCode]); this.name = 'RandomDrawError'; this.code = safeCode;
  }
}
const fail = code => { throw new RandomDrawError(code); };
const hex256 = value => typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
const sha256 = value => createHash('sha256').update(value, 'utf8').digest('hex');
const safeInteger = value => typeof value === 'number' && Number.isSafeInteger(value);
const plain = value => value !== null && typeof value === 'object' && !types.isProxy(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const reference = value => typeof value === 'string' && value.length > 0
  && value.length <= 1024 && value.isWellFormed() && !/[\u0000-\u001f\u007f]/u.test(value);
const DOMAINS = new Set(['initial_setup', 'event_opportunity', 'rule_check', 'presentation_variant']);
const COLUMNS = Object.freeze({
  schema_version: 'INTEGER', draw_id: 'TEXT', run_id: 'TEXT', lineage_ref: 'TEXT',
  domain: 'TEXT', semantic_key_hash: 'TEXT', ordinal: 'INTEGER', distribution_ref: 'TEXT',
  input_fingerprint: 'TEXT', raw_value: 'TEXT', mapped_result: 'INTEGER', rng_version: 'TEXT',
});
const IDENTITY_COLUMNS = Object.freeze(['run_id', 'lineage_ref', 'domain', 'semantic_key_hash', 'ordinal']);
const TRIGGERS = Object.freeze({
  domain_random_draws_no_update: `CREATE TRIGGER IF NOT EXISTS domain_random_draws_no_update
    BEFORE UPDATE ON domain_random_draws BEGIN SELECT RAISE(ABORT,'RANDOM_DRAW_IMMUTABLE'); END`,
  domain_random_draws_no_delete: `CREATE TRIGGER IF NOT EXISTS domain_random_draws_no_delete
    BEFORE DELETE ON domain_random_draws BEGIN SELECT RAISE(ABORT,'RANDOM_DRAW_IMMUTABLE'); END`,
  // SQLite REPLACE bypasses delete triggers when recursive_triggers is off.
  // Reject duplicate insertions too, independently of that connection pragma.
  domain_random_draws_no_replace: `CREATE TRIGGER IF NOT EXISTS domain_random_draws_no_replace
    BEFORE INSERT ON domain_random_draws WHEN EXISTS (
      SELECT 1 FROM domain_random_draws WHERE draw_id=NEW.draw_id OR
        (run_id=NEW.run_id AND lineage_ref=NEW.lineage_ref AND domain=NEW.domain
         AND semantic_key_hash=NEW.semantic_key_hash AND ordinal=NEW.ordinal)
    ) BEGIN SELECT RAISE(ABORT,'RANDOM_DRAW_CONFLICT'); END`,
});
const normalizedSql = value => value.replace(/\bIF\s+NOT\s+EXISTS\s+/giu, '')
  .replace(/\s+/gu, ' ').trim();

function encode(value, ancestors, code) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) fail(code);
    return JSON.stringify(value);
  }
  if (typeof value !== 'object' || types.isProxy(value)) fail(code);
  const array = Array.isArray(value);
  if (array ? Object.getPrototypeOf(value) !== Array.prototype : !plain(value)) fail(code);
  if (ancestors.has(value)) fail(code);
  ancestors.add(value);
  try {
    const keys = Reflect.ownKeys(value);
    if (array) {
      const length = Object.getOwnPropertyDescriptor(value, 'length').value;
      if (keys.length !== length + 1) fail(code);
      const entries = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail(code);
        entries.push(encode(descriptor.value, ancestors, code));
      }
      return `[${entries.join(',')}]`;
    }
    if (keys.some(key => typeof key !== 'string')) fail(code);
    const entries = [];
    for (const key of keys.sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail(code);
      entries.push(`${JSON.stringify(key)}:${encode(descriptor.value, ancestors, code)}`);
    }
    return `{${entries.join(',')}}`;
  } finally { ancestors.delete(value); }
}

function canonical(value, code) {
  try { return encode(value, new WeakSet(), code); }
  catch (error) {
    if (error instanceof RandomDrawError) throw error;
    fail(code);
  }
}

/** UTF-8 JSON; object keys sort by UTF-16 code units, arrays retain order,
 * finite fractional numbers use JSON number spelling, and -0 becomes 0.
 * Only plain/null-prototype records and dense, ordinary arrays are accepted.
 * Symbols, hidden properties, proxies, accessors, toJSON functions, undefined,
 * cycles, non-finite numbers and unsafe integers are rejected without invoking
 * user code. Unicode is not normalized. Shared, acyclic subobjects are allowed.
 */
export const canonicalJson = value => canonical(value, 'INVALID_RANDOM_JSON');
export const canonicalHash = value => sha256(canonicalJson(value));

function fields(value, allowed, required = allowed) {
  if (!plain(value) || Object.keys(value).some(key => !allowed.includes(key))
    || required.some(key => !Object.hasOwn(value, key))) fail('INVALID_RANDOM_OPTIONS');
}

function optionsSnapshot(options) {
  // Validate/snapshot once, without getters, toJSON or proxy traps; no caller
  // object can change the identity between validation, hashing and insertion.
  const value = JSON.parse(canonical(options, 'INVALID_RANDOM_OPTIONS'));
  fields(value, ['runId', 'lineageRef', 'domain', 'semanticKey', 'ordinal', 'distribution'],
    ['runId', 'lineageRef', 'domain', 'semanticKey', 'distribution']);
  const ordinal = Object.hasOwn(value, 'ordinal') ? value.ordinal : 0;
  if (!reference(value.runId) || !reference(value.lineageRef) || !DOMAINS.has(value.domain)
    || !safeInteger(ordinal) || ordinal < 0) fail('INVALID_RANDOM_OPTIONS');
  fields(value.distribution, ['kind', 'minimum', 'maximum']);
  const { kind, minimum, maximum } = value.distribution;
  if (kind !== 'integer' || !safeInteger(minimum) || !safeInteger(maximum) || minimum > maximum) {
    fail('INVALID_RANDOM_OPTIONS');
  }
  return { ...value, ordinal };
}

function mapping(distribution) {
  const minimum = BigInt(distribution.minimum);
  const width = BigInt(distribution.maximum) - minimum + 1n;
  let space = 1n;
  while (space < width) space <<= 1n;
  return { minimum, width, mask: space - 1n };
}

function mapped(raw, range) {
  // Interpret the digest as unsigned big-endian, keeping the least significant
  // ceil(log2(width)) bits. Reject rather than taking a biased remainder.
  const candidate = BigInt(`0x${raw}`) & range.mask;
  return candidate < range.width ? Number(range.minimum + candidate) : undefined;
}

function identityFor(options, run) {
  const semanticKeyHash = canonicalHash(options.semanticKey);
  const identity = {
    run_id: options.runId, lineage_ref: options.lineageRef, domain: options.domain,
    semantic_key_hash: semanticKeyHash, ordinal: options.ordinal,
  };
  const distributionRef = canonicalJson({ ...options.distribution, version: 'integer-inclusive-v1' });
  return {
    schema_version: RANDOM_DRAW_SCHEMA_VERSION,
    draw_id: `draw:${canonicalHash({ format: 'manosaba.random-draw.identity.v1', ...identity })}`,
    ...identity,
    distribution_ref: distributionRef,
    input_fingerprint: canonicalHash({
      format: 'manosaba.random-draw.input.v1', ...identity,
      distribution_ref: distributionRef, root_seed: run.root_seed, rng_version: run.rng_version,
    }),
    rng_version: run.rng_version,
  };
}

function sample(row, rootSeed, range) {
  const key = Buffer.from(rootSeed, 'hex');
  // run_id is deliberately absent: identical seed/content/lineage/semantic
  // inputs reproduce across new runs. It remains part of the ledger identity.
  const input = {
    format: 'manosaba.random-draw.sample.v1', rng_version: row.rng_version,
    lineage_ref: row.lineage_ref, domain: row.domain, semantic_key_hash: row.semantic_key_hash,
    ordinal: row.ordinal, distribution_ref: row.distribution_ref,
  };
  for (let counter = 0; Number.isSafeInteger(counter); counter += 1) {
    const raw = createHmac('sha256', key)
      .update(canonicalJson({ ...input, rejection_counter: counter }), 'utf8').digest('hex');
    const result = mapped(raw, range);
    if (result !== undefined) return { raw_value: raw, mapped_result: result };
  }
  fail('INVALID_RANDOM_STATE');
}

function validateStored(row, expected, range) {
  if (row.schema_version !== RANDOM_DRAW_SCHEMA_VERSION) fail('INVALID_RANDOM_SCHEMA');
  if (row.rng_version !== RNG_VERSION) fail('UNSUPPORTED_RNG_VERSION');
  for (const key of ['draw_id', 'run_id', 'lineage_ref', 'domain', 'semantic_key_hash', 'ordinal', 'rng_version']) {
    if (row[key] !== expected[key]) fail('INVALID_RANDOM_STATE');
  }
  if (row.distribution_ref !== expected.distribution_ref) fail('RANDOM_DRAW_CONFLICT');
  if (row.input_fingerprint !== expected.input_fingerprint || !hex256(row.raw_value)
    || !safeInteger(row.mapped_result) || mapped(row.raw_value, range) !== row.mapped_result) {
    fail('INVALID_RANDOM_STATE');
  }
}

function receipt(row) {
  return Object.freeze({
    schemaVersion: row.schema_version, drawId: row.draw_id, runId: row.run_id,
    lineageRef: row.lineage_ref, domain: row.domain, semanticKeyHash: row.semantic_key_hash,
    ordinal: row.ordinal, distributionRef: row.distribution_ref, inputFingerprint: row.input_fingerprint,
    rawValue: row.raw_value, mappedResult: row.mapped_result, rngVersion: row.rng_version,
  });
}

/** Host-only immutable random draw repository (architecture section 16AA).
 *
 * API: new RandomDrawLedger(DatabaseSync); initialize() -> this;
 * draw({ runId, lineageRef, domain, semanticKey, ordinal = 0,
 *        distribution: { kind: 'integer', minimum, maximum } }) -> frozen receipt.
 * Bounds are inclusive safe integers; semanticKey is host-provided plain JSON.
 * runId/lineageRef are well-formed, nonempty strings of <=1024 UTF-16 code units
 * without ASCII controls. Receipt fields camelCase the twelve persisted columns.
 * distributionRef is canonical {kind,minimum,maximum,version} JSON; mappedResult
 * is a Number. The fingerprint binds the run seed without persisting it here.
 *
 * The caller creates domain_runs(run_id, root_seed, rng_version); root_seed is
 * exactly 64 lowercase hex characters. Only RNG_VERSION is currently supported.
 * initialize and first insertion require db.isTransaction === true. Existing
 * draws may be read without a transaction, never rewritten or sampled again;
 * stored inputs, raw/result shape and mapping are checked. This is not an
 * authentication mechanism for a maliciously rewritten database file.
 *
 * The caller owns BEGIN/COMMIT/ROLLBACK, including the draw, its world result,
 * events and outbox. No in-memory cursor/cache survives a rollback or reopen.
 * Failed caller transactions MUST be rolled back by the caller.
 *
 * CRITICAL IDENTITY BOUNDARY: the host must construct stable causal lineage and
 * semantic keys (scenario/entity/rule versions, material conditions, legitimate
 * attempt ordinal). This service cannot infer causal identity or detect a UUID,
 * request ID, branch ID, generation, revision, wall clock or model wording hidden
 * inside an otherwise valid key. Never use those as gameplay randomness inputs.
 * Loads, technical retries and branch generations do not participate implicitly.
 * Presentation uses a separate domain and no shared rejection counter exists.
 * Fixed prologue content must not call this service just to add randomness.
 * Seeds/raw draws/future parameters are host audit data, not player/NPC output.
 */
export class RandomDrawLedger {
  #db;
  constructor(db) {
    if (!db || types.isProxy(db) || !(db instanceof DatabaseSync)) fail('INVALID_RANDOM_OPTIONS');
    this.#db = db;
  }

  #transaction() {
    if (this.#db.isTransaction !== true) fail('INVALID_RANDOM_TRANSACTION');
  }

  initialize() {
    try {
      this.#transaction();
      this.#db.exec(`
        CREATE TABLE IF NOT EXISTS domain_random_draws (
          schema_version INTEGER NOT NULL CHECK(schema_version=1),
          draw_id TEXT PRIMARY KEY NOT NULL,
          run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
          lineage_ref TEXT NOT NULL CHECK(length(lineage_ref)>0),
          domain TEXT NOT NULL CHECK(domain IN ('initial_setup','event_opportunity','rule_check','presentation_variant')),
          semantic_key_hash TEXT NOT NULL CHECK(length(semantic_key_hash)=64 AND semantic_key_hash NOT GLOB '*[^0-9a-f]*'),
          ordinal INTEGER NOT NULL CHECK(ordinal>=0 AND ordinal<=9007199254740991),
          distribution_ref TEXT NOT NULL,
          input_fingerprint TEXT NOT NULL CHECK(length(input_fingerprint)=64 AND input_fingerprint NOT GLOB '*[^0-9a-f]*'),
          raw_value TEXT NOT NULL CHECK(length(raw_value)=64 AND raw_value NOT GLOB '*[^0-9a-f]*'),
          mapped_result INTEGER NOT NULL CHECK(mapped_result BETWEEN -9007199254740991 AND 9007199254740991),
          rng_version TEXT NOT NULL
        ) STRICT;
      `);
      const columns = this.#db.prepare('PRAGMA main.table_xinfo(domain_random_draws)').all();
      const table = this.#db.prepare('PRAGMA main.table_list(domain_random_draws)').get();
      const foreignKeys = this.#db.prepare('PRAGMA main.foreign_key_list(domain_random_draws)').all();
      if (!table || table.type !== 'table' || table.strict !== 1
        || columns.length !== Object.keys(COLUMNS).length || columns.some(column =>
          !Object.hasOwn(COLUMNS, column.name) || column.type !== COLUMNS[column.name]
          || column.notnull !== 1 || column.hidden !== 0 || column.pk !== (column.name === 'draw_id' ? 1 : 0))
        || foreignKeys.length !== 1 || foreignKeys[0].table !== 'domain_runs'
        || foreignKeys[0].from !== 'run_id' || foreignKeys[0].to !== 'run_id'
        || this.#db.prepare('SELECT 1 FROM domain_random_draws WHERE schema_version IS NOT 1 LIMIT 1').get()) {
        fail('INVALID_RANDOM_SCHEMA');
      }
      this.#db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS domain_random_draws_identity
        ON domain_random_draws(run_id,lineage_ref,domain,semantic_key_hash,ordinal)`);
      const index = this.#db.prepare('PRAGMA main.index_list(domain_random_draws)').all()
        .find(entry => entry.name === 'domain_random_draws_identity');
      const indexColumns = this.#db.prepare('PRAGMA main.index_xinfo(domain_random_draws_identity)').all()
        .filter(entry => entry.key === 1);
      if (!index || index.unique !== 1 || index.partial !== 0 || indexColumns.length !== IDENTITY_COLUMNS.length
        || indexColumns.some((entry, position) => entry.name !== IDENTITY_COLUMNS[position]
          || entry.coll !== 'BINARY' || entry.desc !== 0)) fail('INVALID_RANDOM_SCHEMA');
      for (const [name, sql] of Object.entries(TRIGGERS)) {
        this.#db.exec(sql);
        const stored = this.#db.prepare("SELECT sql FROM main.sqlite_schema WHERE type='trigger' AND name=?").get(name);
        if (!stored || normalizedSql(stored.sql) !== normalizedSql(sql)) fail('INVALID_RANDOM_SCHEMA');
      }
      return this;
    } catch (error) {
      if (error instanceof RandomDrawError) throw error;
      fail('INVALID_RANDOM_SCHEMA');
    }
  }

  draw(options) {
    try {
      const input = optionsSnapshot(options);
      const run = this.#db.prepare('SELECT root_seed,rng_version FROM domain_runs WHERE run_id=?').get(input.runId);
      if (!run || !hex256(run.root_seed)) fail('INVALID_RANDOM_RUN');
      if (run.rng_version !== RNG_VERSION) fail('UNSUPPORTED_RNG_VERSION');
      const expected = identityFor(input, run);
      const range = mapping(input.distribution);
      const stored = this.#db.prepare(`SELECT * FROM domain_random_draws
        WHERE run_id=? AND lineage_ref=? AND domain=? AND semantic_key_hash=? AND ordinal=?`)
        .get(input.runId, input.lineageRef, input.domain, expected.semantic_key_hash, input.ordinal);
      if (stored) {
        validateStored(stored, expected, range);
        return receipt(stored);
      }
      this.#transaction();
      const row = { ...expected, ...sample(expected, run.root_seed, range) };
      this.#db.prepare(`INSERT INTO domain_random_draws
        (schema_version,draw_id,run_id,lineage_ref,domain,semantic_key_hash,ordinal,
         distribution_ref,input_fingerprint,raw_value,mapped_result,rng_version)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(...Object.keys(COLUMNS).map(key => row[key]));
      return receipt(row);
    } catch (error) {
      if (error instanceof RandomDrawError) throw error;
      // Never leak driver errors, bound parameters, seeds or trigger messages.
      fail('INVALID_RANDOM_STATE');
    }
  }
}
