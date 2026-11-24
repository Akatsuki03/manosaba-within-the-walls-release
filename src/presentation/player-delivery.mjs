import { createHash } from 'node:crypto';
import { types } from 'node:util';

const MESSAGES = Object.freeze({
  INVALID_DELIVERY_OPTIONS: '反馈交付参数无效。',
  INVALID_DELIVERY_STATE: '本机反馈交付记录无效，未修改世界进度。',
  STALE_DELIVERY_LEASE: '反馈交付租约已失效，未采纳旧任务结果。',
  DELIVERY_NOT_READY: '反馈投影尚未就绪，可从当前安全视图读取。',
  UNSUPPORTED_DELIVERY_VERSION: '本机反馈交付格式暂不受支持。',
});
export class PlayerDeliveryError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(MESSAGES, code) ? code : 'INVALID_DELIVERY_STATE';
    super(MESSAGES[safeCode]); this.name = 'PlayerDeliveryError'; this.code = safeCode;
  }
}
const fail = code => { throw new PlayerDeliveryError(code); };
const hash = value => createHash('sha256').update(value).digest('hex');
const integer = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum;
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(value);
const plain = value => value !== null && typeof value === 'object' && !types.isProxy(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const own = (value, key) => Object.getOwnPropertyDescriptor(value, key)?.value;
function fields(value, allowed, code = 'INVALID_DELIVERY_OPTIONS') {
  if (!plain(value) || Reflect.ownKeys(value).some(key => !allowed.includes(key)
    || !Object.getOwnPropertyDescriptor(value, key).enumerable
    || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'))) fail(code);
}
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function snapshot(row) {
  if (typeof row.payload !== 'string' || typeof row.payload_hash !== 'string'
    || hash(row.payload) !== row.payload_hash) fail('INVALID_DELIVERY_STATE');
  let view;
  try { view = JSON.parse(row.payload); } catch { fail('INVALID_DELIVERY_STATE'); }
  if (!plain(view) || view.generation !== row.generation || view.revision !== row.revision
    || Object.hasOwn(view, 'saveSlots')) fail('INVALID_DELIVERY_STATE');
  return view;
}
function leaseFields(lease) {
  fields(lease, ['jobId', 'generation', 'revision', 'attempt', 'fencingToken', 'leaseOwner', 'leaseExpiresAt', 'view']);
  if (!integer(lease.jobId, 1) || !integer(lease.generation, 1) || !integer(lease.revision)
    || !integer(lease.attempt, 1) || !integer(lease.fencingToken, 1)
    || !identifier(lease.leaseOwner) || !integer(lease.leaseExpiresAt, 1)) fail('INVALID_DELIVERY_OPTIONS');
}
function matches(row, lease) {
  return row && row.id === lease.jobId && row.generation === lease.generation && row.revision === lease.revision
    && row.attempt === lease.attempt && row.fencing_token === lease.fencingToken
    && row.lease_owner === lease.leaseOwner && row.lease_expires_at === lease.leaseExpiresAt;
}
const receipt = row => Object.freeze({ jobId: row.id, generation: row.generation, revision: row.revision, status: 'delivered' });

/** Host-only repository for one concrete consumer: the cropped player-view
 * projection. The engine owns the SQLite transaction around every operation.
 * This is NOT a generic job executor, NPC perception, model output acceptance,
 * or an acknowledgement that a browser/user has read the text.
 */
export class PlayerDeliveryOutbox {
  #db;
  #clock;
  constructor(db, { clock = Date.now } = {}) {
    if (typeof clock !== 'function') fail('INVALID_DELIVERY_OPTIONS');
    this.#db = db; this.#clock = clock;
  }
  initialize() {
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS prologue_delivery_schema (
        id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL
      );
      INSERT INTO prologue_delivery_schema(id,version) VALUES(1,1) ON CONFLICT(id) DO NOTHING;
    `);
    if (this.#db.prepare('SELECT version FROM prologue_delivery_schema WHERE id=1').get()?.version !== 1) fail('UNSUPPORTED_DELIVERY_VERSION');
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS prologue_delivery_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        generation INTEGER NOT NULL CHECK(typeof(generation)='integer' AND generation>0),
        revision INTEGER NOT NULL CHECK(typeof(revision)='integer' AND revision>=0),
        kind TEXT NOT NULL CHECK(kind='player_view'),
        payload TEXT NOT NULL, payload_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','delivered','cancelled')),
        attempt INTEGER NOT NULL DEFAULT 0 CHECK(typeof(attempt)='integer' AND attempt>=0),
        fencing_token INTEGER NOT NULL DEFAULT 0 CHECK(typeof(fencing_token)='integer' AND fencing_token>=0),
        lease_owner TEXT, lease_expires_at INTEGER,
        UNIQUE(generation,revision,kind),
        CHECK(status<>'running' OR (lease_owner IS NOT NULL AND typeof(lease_expires_at)='integer')),
        CHECK(status NOT IN ('pending','cancelled') OR (lease_owner IS NULL AND lease_expires_at IS NULL))
      );
      CREATE INDEX IF NOT EXISTS prologue_delivery_pending ON prologue_delivery_outbox(generation,revision,status);
      CREATE TABLE IF NOT EXISTS prologue_player_projection (
        id INTEGER PRIMARY KEY CHECK(id=1),
        generation INTEGER NOT NULL, revision INTEGER NOT NULL,
        job_id INTEGER NOT NULL UNIQUE, payload TEXT NOT NULL, payload_hash TEXT NOT NULL
      );
    `);
  }
  #now() {
    let now;
    try { now = this.#clock(); } catch { fail('INVALID_DELIVERY_OPTIONS'); }
    if (!integer(now)) fail('INVALID_DELIVERY_OPTIONS');
    return now;
  }
  resetAfterPathMigration() {
    // Only the authoritative engine migration can request this. These are
    // rebuildable views of obsolete anchor IDs, not NPC memories/world facts.
    // AUTOINCREMENT is NOT reset, so an old lease cannot match a rebuilt row.
    this.#db.exec('DELETE FROM prologue_player_projection; DELETE FROM prologue_delivery_outbox');
  }
  ensureBaseline(view) {
    const exists = this.#db.prepare("SELECT id FROM prologue_delivery_outbox WHERE generation=? AND revision=? AND kind='player_view'")
      .get(view.generation, view.revision);
    // Opening an existing world is not permission to rewrite a published
    // payload. A damaged derived row is detected on delivery; reads can fall
    // back to the authoritative cropped view without blocking offline startup.
    if (!exists) this.stage(view);
  }
  /** Called in the SAME transaction as the head/event/turn/receipt changes.
   * Only an already cropped engine view is allowed here; never a world state.
   * Save cards have an independent version and must not be cached at this watermark.
   */
  stage(view) {
    const { saveSlots, ...visible } = view;
    const payload = JSON.stringify(visible); const digest = hash(payload);
    this.#db.prepare(`UPDATE prologue_delivery_outbox SET status='cancelled',lease_owner=NULL,lease_expires_at=NULL
      WHERE generation<>? AND status IN ('pending','running')`).run(view.generation);
    this.#db.prepare('DELETE FROM prologue_player_projection WHERE generation<>?').run(view.generation);
    this.#db.prepare(`INSERT INTO prologue_delivery_outbox(generation,revision,kind,payload,payload_hash)
      VALUES(?,?,'player_view',?,?) ON CONFLICT(generation,revision,kind) DO NOTHING`)
      .run(view.generation, view.revision, payload, digest);
    const row = this.#db.prepare("SELECT * FROM prologue_delivery_outbox WHERE generation=? AND revision=? AND kind='player_view'")
      .get(view.generation, view.revision);
    if (!row || row.payload_hash !== digest || row.payload !== payload || row.status === 'cancelled') fail('INVALID_DELIVERY_STATE');
  }
  claim(scope, options = {}) {
    fields(options, ['workerId', 'leaseMs']);
    const workerId = own(options, 'workerId');
    const leaseMs = own(options, 'leaseMs') === undefined ? 30000 : own(options, 'leaseMs');
    if (!identifier(workerId) || !integer(leaseMs, 1) || leaseMs > 120000) fail('INVALID_DELIVERY_OPTIONS');
    const now = this.#now(); const expires = now + leaseMs;
    if (!integer(expires, 1)) fail('INVALID_DELIVERY_OPTIONS');
    // A live lease at the front of the stream is a barrier, not an invitation
    // to publish a later snapshot first. Expired leases are reclaimed in place.
    const row = this.#db.prepare(`SELECT * FROM prologue_delivery_outbox
      WHERE generation=? AND status IN ('pending','running') ORDER BY revision,id LIMIT 1`).get(scope.generation);
    if (!row) return null;
    if (row.revision > scope.revision) fail('INVALID_DELIVERY_STATE');
    if (row.status === 'running' && row.lease_expires_at > now) return null;
    if (!integer(row.attempt + 1, 1) || !integer(row.fencing_token + 1, 1)) fail('INVALID_DELIVERY_STATE');
    const view = snapshot(row);
    const attempt = row.attempt + 1; const fencingToken = row.fencing_token + 1;
    this.#db.prepare(`UPDATE prologue_delivery_outbox SET status='running',attempt=?,fencing_token=?,lease_owner=?,lease_expires_at=?
      WHERE id=?`).run(attempt, fencingToken, workerId, expires, row.id);
    return freeze({ jobId: row.id, generation: row.generation, revision: row.revision,
      attempt, fencingToken, leaseOwner: workerId, leaseExpiresAt: expires, view });
  }
  #leased(scope, lease) {
    leaseFields(lease);
    if (lease.generation !== scope.generation || lease.revision > scope.revision) fail('STALE_DELIVERY_LEASE');
    const row = this.#db.prepare('SELECT * FROM prologue_delivery_outbox WHERE id=?').get(lease.jobId);
    if (!matches(row, lease)) fail('STALE_DELIVERY_LEASE');
    return row;
  }
  complete(scope, lease) {
    const row = this.#leased(scope, lease);
    // Duplicate acknowledgements are harmless, even after the original lease
    // deadline. They cannot republish an old snapshot over a newer projection.
    if (row.status === 'delivered') return receipt(row);
    if (row.status !== 'running' || row.lease_expires_at <= this.#now()) fail('STALE_DELIVERY_LEASE');
    const first = this.#db.prepare(`SELECT id FROM prologue_delivery_outbox
      WHERE generation=? AND status IN ('pending','running') ORDER BY revision,id LIMIT 1`).get(scope.generation);
    if (first?.id !== row.id) fail('STALE_DELIVERY_LEASE');
    snapshot(row);
    const projection = this.#db.prepare('SELECT generation,revision FROM prologue_player_projection WHERE id=1').get();
    if (projection && (projection.generation !== row.generation || projection.revision >= row.revision)) fail('INVALID_DELIVERY_STATE');
    // Publish the durable payload, NOT a worker-supplied view/result. Projection
    // and acknowledgement either both commit or neither does.
    this.#db.prepare(`INSERT INTO prologue_player_projection(id,generation,revision,job_id,payload,payload_hash)
      VALUES(1,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET generation=excluded.generation,revision=excluded.revision,
      job_id=excluded.job_id,payload=excluded.payload,payload_hash=excluded.payload_hash`)
      .run(row.generation, row.revision, row.id, row.payload, row.payload_hash);
    this.#db.prepare("UPDATE prologue_delivery_outbox SET status='delivered' WHERE id=?").run(row.id);
    return receipt(row);
  }
  release(scope, lease) {
    const row = this.#leased(scope, lease);
    if (row.status !== 'running' || row.lease_expires_at <= this.#now()) fail('STALE_DELIVERY_LEASE');
    this.#db.prepare("UPDATE prologue_delivery_outbox SET status='pending',lease_owner=NULL,lease_expires_at=NULL WHERE id=?").run(row.id);
    return Object.freeze({ jobId: row.id, generation: row.generation, revision: row.revision, status: 'pending' });
  }
  nextDelay(scope) {
    const row = this.#db.prepare(`SELECT revision,status,lease_expires_at FROM prologue_delivery_outbox
      WHERE generation=? AND status IN ('pending','running') ORDER BY revision,id LIMIT 1`).get(scope.generation);
    if (!row) return null;
    if (row.revision > scope.revision) fail('INVALID_DELIVERY_STATE');
    if (row.status === 'pending') return 0;
    if (!integer(row.lease_expires_at, 1)) fail('INVALID_DELIVERY_STATE');
    return Math.max(0, row.lease_expires_at - this.#now());
  }
  read(scope) {
    const row = this.#db.prepare('SELECT * FROM prologue_player_projection WHERE id=1').get();
    if (!row || row.generation !== scope.generation || row.revision !== scope.revision) fail('DELIVERY_NOT_READY');
    return snapshot(row);
  }
}
