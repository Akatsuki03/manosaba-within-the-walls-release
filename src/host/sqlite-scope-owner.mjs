import { randomUUID } from 'node:crypto';
import { DatabaseSync, constants } from 'node:sqlite';

// HOST-internal executor. Actual connection identity is retained; this is not
// a DB proxy, JSON authority, statement cache or application callback hook.
const owners = new WeakMap();
const nativeExec = DatabaseSync.prototype.exec;
const nativeAuthorizer = DatabaseSync.prototype.setAuthorizer;
const denied = () => { throw Object.assign(new Error('记忆通道的原始事务作用域已失效。'), {
  code: 'MAGIC_HOST_RULE_GATED', requiredHook: 'domain-private-memory-transaction-authority',
  disposition: 'pause-without-world-commit' }); };
const sync = result => { if (result && typeof result.then === 'function') denied(); return result; };

/** Internal repository scope. No raw name or native StatementSync escapes.
 * Outside a closed interval retains the existing raw SAVEPOINT behavior. */
export function openSqliteScope(db, name) {
  const owner = owners.get(db);
  if (owner) return owner.open();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/u.test(name)) denied();
  nativeExec.call(db, `SAVEPOINT ${name}`);
  let active = true;
  return Object.freeze({
    release() { if (!active) denied(); nativeExec.call(db, `RELEASE ${name}`); active = false; },
    rollback() { if (!active) denied(); nativeExec.call(db, `ROLLBACK TO ${name}; RELEASE ${name}`); active = false; },
  });
}

export function assertSqliteScopeOwner(db) {
  const owner = owners.get(db);
  if (!owner) denied();
  owner.assert();
}

/** Explicit closed raw-control interval. Prior policy ownership must be supplied
 * by trusted HOST because node:sqlite has no getter. A supplied callback is
 * composed without changing DENY/IGNORE, then restored in finally.
 * Ordinary controls never compile, so no authorized cached control VM exists.
 * Deliberate native authorizer replacement remains outside this HOST contract. */
export function withSqliteScopeOwner(db, prior, work) {
  if (owners.has(db) || !db.isTransaction || typeof work !== 'function'
    || prior !== null && typeof prior !== 'function') denied();
  const guard = `memory_guard_${randomUUID().replaceAll('-', '')}`;
  let active = true; let violated = false; let permit = null; let inPolicy = false; let guardReady = false;
  const stack = [];
  const assert = () => { if (!active || violated || inPolicy || !db.isTransaction) { violated = true; denied(); } };
  const control = (operation, name, cleanup = false) => {
    if ((!cleanup && violated) || !active || inPolicy || permit || !db.isTransaction) { violated = true; denied(); }
    const expected = { operation, name, consumed: false };
    permit = expected;
    try {
      // Exactly ONE fresh native exec, never prepare(), never callback/work.
      nativeExec.call(db, `${operation === 'BEGIN' ? 'SAVEPOINT' : operation === 'ROLLBACK' ? 'ROLLBACK TO' : 'RELEASE'} ${name}`);
      if (!expected.consumed) { violated = true; denied(); }
    } finally { permit = null; }
  };
  const authorizer = (action, operation, name, database, origin) => {
    const isControl = action === constants.SQLITE_TRANSACTION || action === constants.SQLITE_SAVEPOINT;
    if (isControl) {
      // Consume BEFORE calling prior policy: reentrant SQL cannot borrow this
      // one-shot permit, even for the exact private name currently authorized.
      if (inPolicy || action !== constants.SQLITE_SAVEPOINT || !permit || permit.consumed
        || operation !== permit.operation || name !== permit.name) {
        violated = true; return constants.SQLITE_DENY;
      }
      permit.consumed = true;
    }
    if (!prior) return constants.SQLITE_OK;
    if (inPolicy) { violated = true; return constants.SQLITE_DENY; }
    inPolicy = true;
    try {
      const decision = prior(action, operation, name, database, origin);
      // IGNORE on control may silently skip the statement: never treat a
      // consumed permit as proof the savepoint was actually established.
      // Preserve READ IGNORE, but conservatively DENY non-OK scope control.
      if (isControl && decision !== constants.SQLITE_OK) { violated = true; return constants.SQLITE_DENY; }
      return decision;
    } finally { inPolicy = false; }
  };
  const open = () => {
    assert(); if (stack.length >= 64) { violated = true; denied(); }
    const name = `owned_scope_${randomUUID().replaceAll('-', '')}`;
    control('BEGIN', name); assert();
    const token = {};
    stack.push(token);
    let closed = false;
    const close = rollback => {
      assert();
      if (closed || stack.at(-1) !== token) { violated = true; denied(); }
      if (rollback) control('ROLLBACK', name);
      control('RELEASE', name); closed = true; stack.pop(); assert();
    };
    return Object.freeze({ release: () => close(false), rollback: () => close(true) });
  };
  const api = Object.freeze({ withSavepoint(callback) {
    if (typeof callback !== 'function') { violated = true; denied(); }
    const scope = open();
    try { const result = sync(callback()); scope.release(); return result; }
    catch (error) { try { scope.rollback(); } catch { /* Outer original guard owns abort. */ } throw error; }
  } });
  owners.set(db, { assert, open });
  try {
    nativeAuthorizer.call(db, authorizer);
    control('BEGIN', guard); guardReady = true; assert();
    const result = sync(work(api)); assert();
    if (stack.length) { violated = true; denied(); }
    control('RELEASE', guard); return result;
  } catch (error) {
    if (!db.isTransaction) violated = true; // Automatic ON CONFLICT ROLLBACK.
    if (db.isTransaction && guardReady) {
      try { control('ROLLBACK', guard, true); control('RELEASE', guard, true); }
      catch { violated = true; }
    }
    if (violated) denied();
    throw error;
  } finally {
    active = false; owners.delete(db);
    nativeAuthorizer.call(db, prior);
  }
}
