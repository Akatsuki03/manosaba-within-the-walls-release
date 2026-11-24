import { randomUUID } from 'node:crypto';
import { RandomDrawLedger, canonicalHash, canonicalJson } from './random-draws.mjs';
import { DICE_RULES, DICE_FINGERPRINT, diceFailure, validateDiceOpportunity,
  checkSpecification, evaluateD20 } from './dice-core.mjs';

const encoded = value => canonicalJson(value);
const parse = value => { try { return JSON.parse(value); } catch { diceFailure('INVALID_DICE_STATE'); } };
const empty = () => ({ serial: 0, history: [], opportunities: [] });
const clone = value => structuredClone(value);
/** Sidecar state: never adds fields to historical gameplay snapshots. Save/turn
 * anchors capture dice state in the SAME transaction as the existing anchor.
 * A load/rewind creates a fresh dice-only epoch; patrol/game RNG is unchanged. */
export class DiceStore {
  #db;
  #random;
  constructor(db) { this.#db = db; this.#random = new RandomDrawLedger(db); }
  #exists() {
    const exists = Boolean(this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='dice_heads'").get());
    if (!exists) return false;
    try {
      const schema = this.#db.prepare('SELECT version,policy_fingerprint FROM dice_schema WHERE id=1').get();
      if (!schema || schema.version !== 1 || schema.policy_fingerprint !== DICE_FINGERPRINT) diceFailure('INVALID_DICE_STATE');
      for (const table of ['dice_results', 'dice_requests', 'dice_save_anchors', 'dice_turn_anchors']) {
        if (!this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name=?").get(table)) diceFailure('INVALID_DICE_STATE');
      }
    } catch { diceFailure('INVALID_DICE_STATE'); }
    return true;
  }
  #transaction() { if (!this.#db.isTransaction) diceFailure('INVALID_DICE_TRANSACTION'); }
  #initialize() {
    this.#transaction();
    this.#db.exec(`CREATE TABLE IF NOT EXISTS dice_schema (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL, policy_fingerprint TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS dice_heads (
      branch_id TEXT PRIMARY KEY REFERENCES domain_branches(branch_id), run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
      epoch_id TEXT NOT NULL, state_json TEXT NOT NULL, state_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS dice_results (
      result_id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES domain_runs(run_id), branch_id TEXT NOT NULL REFERENCES domain_branches(branch_id),
      commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref), epoch_id TEXT NOT NULL, ordinal INTEGER NOT NULL,
      draw_id TEXT NOT NULL UNIQUE REFERENCES domain_random_draws(draw_id), opportunity_id TEXT,
      result_json TEXT NOT NULL, result_hash TEXT NOT NULL, UNIQUE(epoch_id,ordinal));
      CREATE TABLE IF NOT EXISTS dice_requests (
      request_id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES domain_runs(run_id), branch_id TEXT NOT NULL REFERENCES domain_branches(branch_id),
      generation INTEGER NOT NULL, input_json TEXT NOT NULL, input_hash TEXT NOT NULL, result_id TEXT NOT NULL REFERENCES dice_results(result_id));
      CREATE TABLE IF NOT EXISTS dice_save_anchors (
      slot_id TEXT PRIMARY KEY, slot_version INTEGER NOT NULL, run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
      snapshot_json TEXT NOT NULL, snapshot_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS dice_turn_anchors (
      turn_id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES domain_runs(run_id), snapshot_json TEXT NOT NULL, snapshot_hash TEXT NOT NULL);`);
    this.#db.prepare('INSERT INTO dice_schema VALUES(1,1,?) ON CONFLICT(id) DO NOTHING').run(DICE_FINGERPRINT);
    for (const table of ['dice_results', 'dice_requests', 'dice_turn_anchors']) {
      const key = table === 'dice_results' ? 'result_id' : table === 'dice_requests' ? 'request_id' : 'turn_id';
      const collision = table === 'dice_results' ? `${key}=NEW.${key} OR draw_id=NEW.draw_id OR (epoch_id=NEW.epoch_id AND ordinal=NEW.ordinal)`
        : `${key}=NEW.${key}`;
      this.#db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_no_update BEFORE UPDATE ON ${table}
        BEGIN SELECT RAISE(ABORT,'immutable dice record'); END;
        CREATE TRIGGER IF NOT EXISTS ${table}_no_delete BEFORE DELETE ON ${table}
        BEGIN SELECT RAISE(ABORT,'immutable dice record'); END;
        CREATE TRIGGER IF NOT EXISTS ${table}_no_replace BEFORE INSERT ON ${table}
        WHEN EXISTS(SELECT 1 FROM ${table} WHERE ${collision})
        BEGIN SELECT RAISE(ABORT,'immutable dice record'); END;`);
    }
  }
  #head(scope, { create = false } = {}) {
    if (!this.#exists()) { if (!create) return null; this.#initialize(); }
    const row = this.#db.prepare('SELECT * FROM dice_heads WHERE branch_id=?').get(scope.branchId);
    if (row) {
      if (row.run_id !== scope.runId) diceFailure('INVALID_DICE_STATE');
      const state = parse(row.state_json);
      if (canonicalHash(state) !== row.state_hash || !Number.isSafeInteger(state.serial) || state.serial < 0
        || !Array.isArray(state.history) || state.history.length > DICE_RULES.maxHistory
        || new Set(state.history).size !== state.history.length || state.history.some(id => typeof id !== 'string')
        || !Array.isArray(state.opportunities) || state.opportunities.length > DICE_RULES.maxOpportunities) diceFailure('INVALID_DICE_STATE');
      return { epoch: row.epoch_id, state };
    }
    if (!create) return null;
    const head = { epoch: randomUUID(), state: empty() };
    this.#saveHead(scope, head); return head;
  }
  #saveHead(scope, head) {
    this.#transaction();
    this.#db.prepare(`INSERT INTO dice_heads VALUES(?,?,?,?,?) ON CONFLICT(branch_id)
      DO UPDATE SET epoch_id=excluded.epoch_id,state_json=excluded.state_json,state_hash=excluded.state_hash`)
      .run(scope.branchId, scope.runId, head.epoch, encoded(head.state), canonicalHash(head.state));
  }
  #variants({ create = false } = {}) {
    const exists = Boolean(this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='dice_check_variants'").get());
    if (!exists && create) {
      this.#transaction();
      // Keep the original (epoch, ordinal) face and all v1 foreign keys intact.
      // A different legal check after prose regeneration evaluates that SAME
      // face; it is not a second draw and must not replace an immutable result.
      this.#db.exec(`CREATE TABLE dice_check_variants (
        result_id TEXT PRIMARY KEY, base_result_id TEXT NOT NULL REFERENCES dice_results(result_id),
        specification_hash TEXT NOT NULL, result_json TEXT NOT NULL, result_hash TEXT NOT NULL,
        schema_version INTEGER NOT NULL CHECK(schema_version=2), UNIQUE(base_result_id,specification_hash));
        CREATE TRIGGER dice_check_variants_no_update BEFORE UPDATE ON dice_check_variants
        BEGIN SELECT RAISE(ABORT,'immutable dice record'); END;
        CREATE TRIGGER dice_check_variants_no_delete BEFORE DELETE ON dice_check_variants
        BEGIN SELECT RAISE(ABORT,'immutable dice record'); END;
        CREATE TRIGGER dice_check_variants_no_replace BEFORE INSERT ON dice_check_variants
        WHEN EXISTS(SELECT 1 FROM dice_check_variants WHERE result_id=NEW.result_id
          OR (base_result_id=NEW.base_result_id AND specification_hash=NEW.specification_hash))
        BEGIN SELECT RAISE(ABORT,'immutable dice record'); END;`);
    }
    return exists || create;
  }
  #resultRow(id, runId) {
    const base = this.#db.prepare('SELECT * FROM dice_results WHERE result_id=? AND run_id=?').get(id, runId);
    if (base) return { row: base, base };
    const variant = this.#variants() && this.#db.prepare(`SELECT v.* FROM dice_check_variants v
      JOIN dice_results b ON b.result_id=v.base_result_id WHERE v.result_id=? AND b.run_id=?`).get(id, runId);
    if (!variant || variant.schema_version !== 2) diceFailure('INVALID_DICE_STATE');
    const original = this.#db.prepare('SELECT * FROM dice_results WHERE result_id=? AND run_id=?').get(variant.base_result_id, runId);
    if (!original) diceFailure('INVALID_DICE_STATE');
    return { row: variant, base: original };
  }
  #result(id, runId) {
    const { row, base } = this.#resultRow(id, runId);
    if (row !== base) this.#result(base.result_id, runId);
    const result = parse(row.result_json);
    if (canonicalHash(result) !== row.result_hash || result.id !== id) diceFailure('INVALID_DICE_STATE');
    const { id: _id, die, total, success, formula, ...specification } = result;
    if (encoded({ ...evaluateD20(specification, die), id }) !== encoded(result)
      || (row !== base && row.specification_hash !== canonicalHash(specification))) diceFailure('INVALID_DICE_STATE');
    const receipt = this.#db.prepare('SELECT mapped_result FROM domain_random_draws WHERE draw_id=? AND run_id=?').get(base.draw_id, runId);
    if (!receipt || receipt.mapped_result !== die) diceFailure('INVALID_DICE_STATE');
    return result;
  }
  #snapshot(scope) {
    const head = this.#head(scope);
    if (!head) return empty();
    return { ...clone(head.state), opportunities: head.state.opportunities
      .filter(row => row.commitRef === scope.commitRef && row.generation === scope.generation).map(clone) };
  }
  assertResult(scope, result, opportunityId) {
    if (!this.#exists() || !result?.id || encoded(this.#result(result.id, scope.runId)) !== encoded(result)) diceFailure('INVALID_DICE_STATE');
    if (opportunityId && this.#resultRow(result.id, scope.runId).base.opportunity_id !== opportunityId) diceFailure('INVALID_DICE_STATE');
  }
  hasRequest(requestId) {
    return this.#exists() && Boolean(this.#db.prepare('SELECT 1 FROM dice_requests WHERE request_id=?').get(requestId));
  }
  prior(scope, input) {
    if (!this.#exists()) return null;
    const row = this.#db.prepare('SELECT * FROM dice_requests WHERE request_id=?').get(input.requestId);
    if (!row) return null;
    const stored = parse(row.input_json);
    const command = stored.diceResolution ? stored.command : stored;
    if (row.input_hash !== canonicalHash(stored)) diceFailure('INVALID_DICE_STATE');
    if (row.run_id !== scope.runId || row.branch_id !== scope.branchId || row.generation !== scope.generation
      || encoded(command) !== encoded(input)) {
      diceFailure('IDEMPOTENCY_CONFLICT', '同一请求编号不能用于另一项掷骰。');
    }
    return this.#result(this.#resolvedRequestId(row, input), scope.runId);
  }
  #resolvedRequestId(row, input) {
    const stored = parse(row.input_json);
    if (!stored.diceResolution) return row.result_id;
    if (stored.diceResolution.version !== 2 || stored.diceResolution.commandHash !== canonicalHash(input)
      || typeof stored.diceResolution.resultId !== 'string') diceFailure('INVALID_DICE_STATE');
    const resultId = stored.diceResolution.resultId;
    const { base } = this.#resultRow(resultId, row.run_id);
    if (base.result_id !== row.result_id) diceFailure('INVALID_DICE_STATE');
    return resultId;
  }
  #request(scope, input, resultId) {
    const { base } = this.#resultRow(resultId, scope.runId);
    const value = base.result_id === resultId ? input : { diceResolution: {
      version: 2, commandHash: canonicalHash(input), resultId }, command: input };
    this.#db.prepare('INSERT INTO dice_requests VALUES(?,?,?,?,?,?,?)')
      .run(input.requestId, scope.runId, scope.branchId, scope.generation, encoded(value), canonicalHash(value), base.result_id);
  }
  view(scope, character) {
    const head = this.#head(scope); const current = head?.state || empty();
    return {
      history: current.history.slice(-DICE_RULES.maxHistory).reverse().map(id => this.#result(id, scope.runId)),
      opportunities: current.opportunities.filter(row => row.commitRef === scope.commitRef && row.generation === scope.generation && !row.resultId)
        .map(row => ({ id: row.definition.id, label: row.definition.label,
          options: row.definition.options.map(option => ({ id: option.id, label: option.label,
            ability: option.ability, abilityLabel: character.abilities.find(item => item.id === option.ability).label,
            modifier: character.modifiers[option.ability], environmentModifier: option.environmentModifier,
            environmentReason: option.environmentReason, dc: option.dc })) })),
    };
  }
  offer(scope, definition, actorId) {
    this.#transaction(); const value = validateDiceOpportunity(definition);
    if (value.actorId !== actorId) diceFailure('INVALID_DICE_OPTION', '检定机会不属于当前玩家。');
    const head = this.#head(scope, { create: true });
    const previous = head.state.opportunities.find(row => row.definition.id === value.id);
    if (previous) {
      if (encoded(previous.definition) !== encoded(value) || previous.commitRef !== scope.commitRef || previous.generation !== scope.generation)
        diceFailure('INVALID_DICE_OPTION', '已封存的机会不能被更改或复用。');
      return value.id;
    }
    head.state.opportunities = head.state.opportunities.filter(row => row.commitRef === scope.commitRef && row.generation === scope.generation);
    if (head.state.opportunities.length >= DICE_RULES.maxOpportunities) diceFailure('INVALID_DICE_OPTION', '当前待决检定过多。');
    head.state.opportunities.push({ definition: value, commitRef: scope.commitRef, generation: scope.generation, resultId: null, optionId: null });
    this.#saveHead(scope, head); return value.id;
  }
  roll(scope, input, character) {
    this.#transaction();
    const previous = this.prior(scope, input); if (previous) return previous;
    const head = this.#head(scope, { create: true });
    let opportunity;
    if (input.mode === 'opportunity') {
      opportunity = head.state.opportunities.find(row => row.definition.id === input.opportunityId
        && row.commitRef === scope.commitRef && row.generation === scope.generation);
      if (!opportunity) diceFailure('INVALID_DICE_OPTION', '当前没有这个已交付的反应机会。');
      if (opportunity.resultId) {
        if (opportunity.optionId !== input.optionId) diceFailure('INVALID_DICE_OPTION', '同一次反应不能换选项重复掷骰；可读取检定前存档重试。');
        this.#request(scope, input, opportunity.resultId); return this.#result(opportunity.resultId, scope.runId);
      }
    }
    if (input.mode === 'practice' && head.state.opportunities.some(row => row.commitRef === scope.commitRef && row.generation === scope.generation && !row.resultId))
      diceFailure('INVALID_DICE_PENDING', '请先处理当前宿主反应机会，不能用试掷代替。');
    const specification = checkSpecification(character, { ...input, opportunity: opportunity?.definition });
    const ordinal = head.state.serial;
    if (!Number.isSafeInteger(ordinal + 1)) diceFailure('INVALID_DICE_STATE');
    const occupied = this.#db.prepare('SELECT result_id,run_id,opportunity_id FROM dice_results WHERE epoch_id=? AND ordinal=?').get(head.epoch, ordinal);
    let result;
    if (occupied) {
      if (occupied.run_id !== scope.runId) diceFailure('INVALID_DICE_STATE');
      if (occupied.opportunity_id !== (input.opportunityId || null))
        diceFailure('INVALID_DICE_OPTION', '该技术重生成位置已有不同用途的检定；请读取检定前存档开始新的骰子支线。');
      const original = this.#result(occupied.result_id, scope.runId);
      const evaluated = evaluateD20(specification, original.die);
      const { id: _id, ...originalCheck } = original;
      if (encoded(originalCheck) === encoded(evaluated)) result = original;
      else {
        this.#variants({ create: true });
        const specificationHash = canonicalHash(specification);
        const previous = this.#db.prepare('SELECT result_id FROM dice_check_variants WHERE base_result_id=? AND specification_hash=?')
          .get(occupied.result_id, specificationHash);
        result = previous ? this.#result(previous.result_id, scope.runId) : { id: `roll-${randomUUID()}`, ...evaluated };
        if (!previous) this.#db.prepare('INSERT INTO dice_check_variants VALUES(?,?,?,?,?,2)')
          .run(result.id, occupied.result_id, specificationHash, encoded(result), canonicalHash(result));
      }
    } else {
      const receipt = this.#random.draw({ runId: scope.runId, lineageRef: `dice-sl@1:${head.epoch}`, domain: 'rule_check',
        semanticKey: { policy: DICE_FINGERPRINT, purpose: input.mode, actorId: character.actorId,
          opportunityId: opportunity?.definition.id || null, sourceKey: opportunity?.definition.sourceKey || null,
          optionId: input.optionId || null, specification }, ordinal,
        distribution: { kind: 'integer', minimum: 1, maximum: 20 } });
      result = { id: `roll-${randomUUID()}`, ...evaluateD20(specification, receipt.mappedResult) };
      this.#db.prepare('INSERT INTO dice_results VALUES(?,?,?,?,?,?,?,?,?,?)').run(result.id, scope.runId, scope.branchId,
        scope.commitRef, head.epoch, ordinal, receipt.drawId, input.opportunityId || null, encoded(result), canonicalHash(result));
    }
    head.state.serial++; head.state.history.push(result.id);
    head.state.history = head.state.history.slice(-DICE_RULES.maxHistory);
    if (opportunity) { opportunity.resultId = result.id; opportunity.optionId = input.optionId; }
    this.#saveHead(scope, head); this.#request(scope, input, result.id);
    return result;
  }
  bindSave(slotId, slotVersion, scope) {
    if (!this.#exists()) return;
    this.#transaction(); const snapshot = this.#snapshot(scope);
    this.#db.prepare(`INSERT INTO dice_save_anchors VALUES(?,?,?,?,?) ON CONFLICT(slot_id)
      DO UPDATE SET slot_version=excluded.slot_version,run_id=excluded.run_id,snapshot_json=excluded.snapshot_json,snapshot_hash=excluded.snapshot_hash`)
      .run(slotId, slotVersion, scope.runId, encoded(snapshot), canonicalHash(snapshot));
  }
  renameSave(slotId, version) {
    if (!this.#exists()) return;
    this.#transaction(); this.#db.prepare('UPDATE dice_save_anchors SET slot_version=? WHERE slot_id=?').run(version, slotId);
  }
  deleteSave(slotId) {
    if (!this.#exists()) return;
    this.#transaction(); this.#db.prepare('DELETE FROM dice_save_anchors WHERE slot_id=?').run(slotId);
  }
  bindTurn(turnId, scope) {
    if (!this.#exists()) return;
    this.#transaction(); const snapshot = this.#snapshot(scope);
    this.#db.prepare('INSERT INTO dice_turn_anchors VALUES(?,?,?,?)').run(turnId, scope.runId,
      encoded({ ...snapshot, preservedEpoch: this.#head(scope)?.epoch || null }),
      canonicalHash({ ...snapshot, preservedEpoch: this.#head(scope)?.epoch || null }));
  }
  #restore(scope, row, { reroll = true } = {}) {
    this.#transaction();
    const state = row ? parse(row.snapshot_json) : empty();
    if (row && (row.run_id !== scope.runId || canonicalHash(state) !== row.snapshot_hash)) diceFailure('INVALID_DICE_STATE');
    if (!reroll && !state.preservedEpoch) {
      // A story turn may predate the very first use of dice. Recover the dice
      // epoch attached to its source execution branch without importing any
      // later roll/history into the checkpoint. Technical prose regeneration
      // must not become another way to get a fresh SL epoch.
      const parent = this.#db.prepare(`SELECT p.branch_id FROM domain_commits c JOIN domain_commits p ON p.commit_ref=c.previous_execution_ref
        WHERE c.commit_ref=?`).get(scope.commitRef);
      const previous = parent && this.#db.prepare('SELECT epoch_id FROM dice_heads WHERE branch_id=? AND run_id=?').get(parent.branch_id, scope.runId);
      if (previous) state.preservedEpoch = previous.epoch_id;
    }
    for (const id of state.history) this.#result(id, scope.runId);
    // Inherit the saved outcomes, not their abandoned future; only the new
    // dice epoch changes. No game/patrol random lineage is ever rewritten.
    const { preservedEpoch, ...savedState } = state;
    const head = { epoch: !reroll && preservedEpoch ? preservedEpoch : randomUUID(), state: { ...savedState,
      serial: !reroll && preservedEpoch ? savedState.serial : 0,
      opportunities: state.opportunities.map(opportunity => ({ ...opportunity, commitRef: scope.commitRef, generation: scope.generation })) } };
    this.#saveHead(scope, head);
  }
  restoreSave(slotId, version, scope) {
    if (!this.#exists()) return;
    const row = this.#db.prepare('SELECT * FROM dice_save_anchors WHERE slot_id=?').get(slotId);
    if (row && row.slot_version !== version) diceFailure('INVALID_DICE_STATE');
    this.#restore(scope, row);
  }
  restoreTurn(turnId, scope, options) {
    if (!this.#exists()) return;
    this.#restore(scope, this.#db.prepare('SELECT * FROM dice_turn_anchors WHERE turn_id=?').get(turnId), options);
  }
  resolution(scope, opportunityId) {
    const head = this.#head(scope);
    const row = head?.state.opportunities.find(item => item.definition.id === opportunityId
      && item.commitRef === scope.commitRef && item.generation === scope.generation && item.resultId);
    if (!row) diceFailure('INVALID_DICE_OPTION', '当前机会没有已结算的宿主结果。');
    const { base } = this.#resultRow(row.resultId, scope.runId);
    if (base.opportunity_id !== opportunityId) diceFailure('INVALID_DICE_STATE');
    return { opportunity: clone(row.definition), optionId: row.optionId, result: clone(this.#result(row.resultId, scope.runId)) };
  }
  result(scope, resultId) {
    const head = this.#head(scope);
    if (!head?.state.history.includes(resultId)) diceFailure('INVALID_DICE_OPTION', '该结果不属于当前骰子支线。');
    return clone(this.#result(resultId, scope.runId));
  }
}
