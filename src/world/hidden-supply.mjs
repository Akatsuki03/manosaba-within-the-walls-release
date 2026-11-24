import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { settleDirectorLifecycleCommit } from '../director/director-event-lifecycle.mjs';
import { buildDirectorContext, validateDirectorOutput, PRIVATE_SUPPLY_EXTENSION, PRIVATE_SUPPLY_OFFER, PRIVATE_SUPPLY_WIRE, DIRECTOR_PRINCIPAL, EFFECTIVE_PRIVATE_SUPPLY_EXTENSION, EFFECTIVE_PRIVATE_SUPPLY_WIRE, PUBLIC_ASSEMBLY_CATEGORY } from '../director/director-effective-private-contract.mjs';
import { directorEventMayReviewIntent } from '../director/director-event-source.mjs';
import { modelSystemPolicySeal } from '../agents/model-gateway.mjs';
import { DIRECTOR_ASSEMBLY_EFFECT } from '../director/director-boundaries.mjs';
import { createdPlayerId, actorsForState } from '../creation/player-setup.mjs';
import { runtimeActive } from '../case-runtime.mjs';
import { activeProcedure } from '../cases/case-procedure.mjs';
import { guardDetained, guardProtected } from './guard-reaction.mjs';
import { hasPrisonWorld, prisonClock } from './prison-activity.mjs';
import { PRIVATE_SUPPLY_CHANNEL, PRIVATE_SUPPLY_OBSERVATION_EVENT, privateSupplyObservationId } from '../cognition/private-supply-observation.mjs';
import { activeRunPolicyCase } from './run-policy-authority.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
const seal = value => hash(JSON.stringify(value));
const fail = () => { throw Object.assign(new Error('私有补给事务校验失败。'), { code: 'INVALID_DOMAIN_STATE' }); };
const decode = (json, digest) => { if (typeof json !== 'string' || hash(json) !== digest) fail(); try { return JSON.parse(json); } catch { fail(); } };

// Explicit fictional adaptation, not a card fact. No consumer takes arbitrary
// definitions, goods, quantities, route, prose, authority or recipients.
export const HIDDEN_SUPPLY_DEFINITION = Object.freeze({ version: 1, ref: 'prison:sealed-bandage-transfer@1',
  itemRef: 'ordinary-bandages:sealed-crate', quantity: 1, source: 'warden:controlled-stock', destination: 'infirmary',
  carrier: 'warden', receiptOwner: 'meruru', trigger: DIRECTOR_ASSEMBLY_EFFECT, deadline: 'day-one-morning' });
const definition = HIDDEN_SUPPLY_DEFINITION;
const definitionFingerprint = seal(definition);
const handoverText = '我已把官方库房的一箱密封普通绷带移交医务室。';
const receiptText = '给梅露露的内部收据：医务室已收到一箱来自官方库房的密封普通绷带。';

export function hiddenSupplyRootEligible(state) {
  return state?.exampleId === 'agent' && state.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION
    && state.creation?.version === 2 && Boolean(state.creation.cellSetup) && !state.creation.scenarioId && !state.creation.storyArcId
    && !state.customAbilitySetup && !state.agentOpening && !state.fixtureBranch && !state.completed
    && !['warden', 'meruru'].includes(createdPlayerId(state))
    && ['warden', 'meruru'].every(id => actorsForState(state).some(actor => actor.id === id));
}

export function initializeHiddenSupply(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS domain_hidden_supply_roots_v1 (
    run_id TEXT PRIMARY KEY REFERENCES domain_runs(run_id), root_commit_ref TEXT NOT NULL UNIQUE REFERENCES domain_commits(commit_ref),
    source_stock INTEGER NOT NULL CHECK(source_stock=1), definition_hash TEXT NOT NULL CHECK(length(definition_hash)=64));
    CREATE TABLE IF NOT EXISTS domain_hidden_supply_choice_roots_v2 (
      root_commit_ref TEXT PRIMARY KEY REFERENCES domain_hidden_supply_roots_v1(root_commit_ref),
      version INTEGER NOT NULL CHECK(version=2));
    CREATE TABLE IF NOT EXISTS domain_hidden_supply_lifecycle_roots_v3 (
      root_commit_ref TEXT PRIMARY KEY REFERENCES domain_hidden_supply_choice_roots_v2(root_commit_ref),
      version INTEGER NOT NULL CHECK(version=1));
    CREATE TABLE IF NOT EXISTS domain_hidden_supply_awareness_roots_v4 (
      root_commit_ref TEXT PRIMARY KEY REFERENCES domain_hidden_supply_lifecycle_roots_v3(root_commit_ref),
      version INTEGER NOT NULL CHECK(version=1));
    CREATE TABLE IF NOT EXISTS domain_hidden_supply_style_roots_v5 (
      root_commit_ref TEXT PRIMARY KEY REFERENCES domain_hidden_supply_awareness_roots_v4(root_commit_ref),
      version INTEGER NOT NULL CHECK(version=1));
    CREATE TABLE IF NOT EXISTS domain_hidden_supply_a2_v4 (
      run_id TEXT PRIMARY KEY REFERENCES domain_hidden_supply_roots_v1(run_id),
      commit_ref TEXT NOT NULL UNIQUE REFERENCES domain_commits(commit_ref),
      payload_json TEXT NOT NULL, payload_hash TEXT NOT NULL CHECK(length(payload_hash)=64));
    CREATE TABLE IF NOT EXISTS domain_hidden_supply_terminals_v3 (
      run_id TEXT PRIMARY KEY REFERENCES domain_hidden_supply_roots_v1(run_id),
      commit_ref TEXT NOT NULL UNIQUE REFERENCES domain_commits(commit_ref),
      payload_json TEXT NOT NULL, payload_hash TEXT NOT NULL CHECK(length(payload_hash)=64));
    CREATE TABLE IF NOT EXISTS domain_hidden_supply_transfers_v1 (
    run_id TEXT PRIMARY KEY REFERENCES domain_hidden_supply_roots_v1(run_id), commit_ref TEXT NOT NULL UNIQUE REFERENCES domain_commits(commit_ref),
    assembly_commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref), job_id TEXT NOT NULL UNIQUE REFERENCES agent_turn_jobs(job_id),
    source_delta INTEGER NOT NULL CHECK(source_delta=-1), infirmary_delta INTEGER NOT NULL CHECK(infirmary_delta=1),
    payload_json TEXT NOT NULL, payload_hash TEXT NOT NULL CHECK(length(payload_hash)=64));
    CREATE TABLE IF NOT EXISTS domain_hidden_supply_receipts_v1 (
    transfer_commit_ref TEXT NOT NULL REFERENCES domain_hidden_supply_transfers_v1(commit_ref),
    owner_id TEXT NOT NULL CHECK(owner_id IN ('warden','meruru')), payload_json TEXT NOT NULL, payload_hash TEXT NOT NULL CHECK(length(payload_hash)=64),
    PRIMARY KEY(transfer_commit_ref,owner_id));`);
  for (const [table, keys] of [
    ['domain_hidden_supply_roots_v1', 'run_id=NEW.run_id OR root_commit_ref=NEW.root_commit_ref'],
    ['domain_hidden_supply_choice_roots_v2', 'root_commit_ref=NEW.root_commit_ref'],
    ['domain_hidden_supply_lifecycle_roots_v3', 'root_commit_ref=NEW.root_commit_ref'],
    ['domain_hidden_supply_terminals_v3', 'run_id=NEW.run_id OR commit_ref=NEW.commit_ref'],
    ['domain_hidden_supply_awareness_roots_v4', 'root_commit_ref=NEW.root_commit_ref'],
    ['domain_hidden_supply_style_roots_v5', 'root_commit_ref=NEW.root_commit_ref'],
    ['domain_hidden_supply_a2_v4', 'run_id=NEW.run_id OR commit_ref=NEW.commit_ref'],
    ['domain_hidden_supply_transfers_v1', 'run_id=NEW.run_id OR commit_ref=NEW.commit_ref OR job_id=NEW.job_id'],
    ['domain_hidden_supply_receipts_v1', 'transfer_commit_ref=NEW.transfer_commit_ref AND owner_id=NEW.owner_id'],
  ]) db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_no_update BEFORE UPDATE ON ${table}
    BEGIN SELECT RAISE(ABORT,'immutable private supply'); END;
    CREATE TRIGGER IF NOT EXISTS ${table}_no_delete BEFORE DELETE ON ${table}
    BEGIN SELECT RAISE(ABORT,'immutable private supply'); END;
    CREATE TRIGGER IF NOT EXISTS ${table}_no_replace BEFORE INSERT ON ${table} WHEN EXISTS(SELECT 1 FROM ${table} WHERE ${keys})
    BEGIN SELECT RAISE(ABORT,'immutable private supply'); END;`);
  for (const [table, column] of [['domain_hidden_supply_roots_v1','root_commit_ref'], ['domain_hidden_supply_choice_roots_v2','root_commit_ref'], ['domain_hidden_supply_lifecycle_roots_v3','root_commit_ref'],
    ['domain_hidden_supply_terminals_v3','commit_ref'], ['domain_hidden_supply_awareness_roots_v4','root_commit_ref'], ['domain_hidden_supply_style_roots_v5','root_commit_ref'],
    ['domain_hidden_supply_a2_v4','commit_ref'], ['domain_hidden_supply_transfers_v1','commit_ref'],
    ['domain_hidden_supply_receipts_v1','transfer_commit_ref']]) db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_sealed BEFORE INSERT ON ${table}
    WHEN EXISTS(SELECT 1 FROM domain_save_anchors WHERE commit_ref=NEW.${column})
    BEGIN SELECT RAISE(ABORT,'sealed private supply commit'); END;`);
}

export function registerHiddenSupplyRoot(db, commit, state) {
  if (!db.isTransaction || commit.kind !== 'new_game' || commit.parent_commit_ref !== null || commit.world_time !== 0
    || !hiddenSupplyRootEligible(state)) fail();
  db.prepare('INSERT INTO domain_hidden_supply_roots_v1 VALUES(?,?,?,?)').run(commit.run_id, commit.commit_ref, definition.quantity, definitionFingerprint);
  db.prepare('INSERT INTO domain_hidden_supply_choice_roots_v2 VALUES(?,2)').run(commit.commit_ref);
  db.prepare('INSERT INTO domain_hidden_supply_lifecycle_roots_v3 VALUES(?,1)').run(commit.commit_ref);
  db.prepare('INSERT INTO domain_hidden_supply_awareness_roots_v4 VALUES(?,1)').run(commit.commit_ref);
  db.prepare('INSERT INTO domain_hidden_supply_style_roots_v5 VALUES(?,1)').run(commit.commit_ref);
}
const sameScope = (a, b) => a.run_id === b.run_id && a.branch_id === b.branch_id && a.generation === b.generation;
function capability(db, commit, readCommit, isAncestor) {
  const row = db.prepare('SELECT * FROM domain_hidden_supply_roots_v1 WHERE run_id=?').get(commit.run_id);
  if (!row) return null;
  const root = readCommit(row.root_commit_ref);
  if (row.source_stock !== 1 || row.definition_hash !== definitionFingerprint || root.run_id !== row.run_id || root.kind !== 'new_game'
    || root.parent_commit_ref !== null || root.world_time !== 0 || !hiddenSupplyRootEligible(JSON.parse(root.snapshot_json))
    || !isAncestor(commit.commit_ref, root.commit_ref)) fail();
  const choice = db.prepare('SELECT version FROM domain_hidden_supply_choice_roots_v2 WHERE root_commit_ref=?').get(root.commit_ref);
  const lifecycle = db.prepare('SELECT version FROM domain_hidden_supply_lifecycle_roots_v3 WHERE root_commit_ref=?').get(root.commit_ref);
  if (choice && choice.version !== 2 || lifecycle && (!choice || lifecycle.version !== 1)) fail();
  const awareness = db.prepare('SELECT version FROM domain_hidden_supply_awareness_roots_v4 WHERE root_commit_ref=?').get(root.commit_ref);
  if (awareness && (!lifecycle || awareness.version !== 1)) fail();
  return { root, row, version: choice ? 2 : 1, lifecycle: lifecycle?.version, awareness: awareness?.version };
}
export function hiddenSupplyJobPin(db, commit, readCommit, isAncestor) {
  const source = capability(db, commit, readCommit, isAncestor);
  if (!source || !sameScope(source.root, commit)) return null;
  return { version: source.version, definitionFingerprint, rootCommitRef: source.root.commit_ref, baseCommitRef: commit.commit_ref,
    ...(source.lifecycle === 1 ? { lifecycle: 1 } : {}), ...(source.awareness === 1 ? { awareness: 1 } : {}) };
}
function lawfulState(state) {
  if (!hiddenSupplyRootEligible(state) || !hasPrisonWorld(state) || !state.agentWorld.lockReleased || !state.agentDoorOpen
    || state.caseRuntime?.occupiedBody || activeRunPolicyCase(state) || activeProcedure(state)
    || state.guardReaction?.pending || guardProtected(state) || guardDetained(state)
    || !runtimeActive(state, createdPlayerId(state)) || !runtimeActive(state, 'meruru')) return false;
  const clock = prisonClock(state);
  return clock.day === 1 && clock.hour >= 6 && clock.hour < 10 && clock.free;
}
function boundaryAllows(policy) {
  if (!policy) return false;
  // A hidden act cannot be sent to the public reviewer for consent. Literal
  // constraints are mechanically checked; any unevaluated prose fails closed.
  return policy.playPolicy.boundaries.every(boundary => {
    const literal = /^不要出现字面文本「([^「」\r\n]{1,32})」$/u.exec(boundary.trim().replace(/[。！!]$/u, ''))?.[1];
    return literal !== undefined && !`${handoverText}\n${receiptText}`.includes(literal);
  });
}
function verifiedAssembly(db, before, readCommit, isAncestor, inheritedRow) {
  const row = inheritedRow ?? db.prepare(`SELECT e.* FROM director_event_transitions_v4 e JOIN domain_commits c USING(commit_ref)
    WHERE c.run_id=? AND c.branch_id=? AND c.generation=? AND c.revision<=?
      AND json_extract(payload_json,'$.status')='occurred' AND json_extract(payload_json,'$.effectRef')=? ORDER BY c.revision LIMIT 1`)
    .get(before.run_id, before.branch_id, before.generation, before.revision, definition.trigger);
  if (!row) return null;
  const result = decode(row.payload_json, row.payload_hash);
  const commit = readCommit(row.commit_ref), parent = readCommit(commit.parent_commit_ref);
  if (!isAncestor(before.commit_ref, commit.commit_ref) || (!inheritedRow && !sameScope(commit, before))) fail();
  const restored = settleDirectorLifecycleCommit(db, { commit, state: JSON.parse(commit.snapshot_json) },
    { commit: parent, state: JSON.parse(parent.snapshot_json) }, undefined, row.job_id);
  if (!isDeepStrictEqual(restored, result) || result.status !== 'occurred' || !result.eventRef) fail();
  const registered = readCommit(result.registerCommitRef), registerParent = readCommit(registered.parent_commit_ref);
  const provenance = db.prepare('SELECT job_id FROM director_event_transitions_v4 WHERE commit_ref=?').get(registered.commit_ref);
  const plan = provenance?.job_id && settleDirectorLifecycleCommit(db, { commit: registered, state: JSON.parse(registered.snapshot_json) },
    { commit: registerParent, state: JSON.parse(registerParent.snapshot_json) }, undefined, provenance.job_id);
  if (plan?.status !== 'registered' || plan.planId !== result.planId || !isAncestor(commit.commit_ref, registered.commit_ref)) fail();
  return { commit, result };
}
// Host presentation only. Validate the original occurrence and exact hearing
// even when presenting through an inherited save branch. No plan state is read
// by the frontend, and no bare text or quote can stand in for actual delivery.
export function playerAssemblyOccurrence(db, head, ownerId, readCommit, isAncestor) {
  const row = db.prepare(`WITH RECURSIVE history(commit_ref,parent_commit_ref) AS (
      SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN history h ON c.commit_ref=h.parent_commit_ref
    ) SELECT e.* FROM history h JOIN director_event_transitions_v4 e USING(commit_ref)
      WHERE json_extract(e.payload_json,'$.status')='occurred' AND json_extract(e.payload_json,'$.effectRef')=? LIMIT 1`)
    .get(head.commit_ref, definition.trigger);
  if (!row) return null;
  const { result, commit } = verifiedAssembly(db, head, readCommit, isAncestor, row);
  const event = db.prepare("SELECT payload,payload_hash FROM domain_world_events WHERE event_ref=? AND commit_ref=? AND kind='statement'")
    .get(result.eventRef, commit.commit_ref);
  const payload = event && decode(event.payload, event.payload_hash);
  if (!payload?.audienceIds.includes(ownerId)) return null;
  const hearing = db.prepare("SELECT 1 FROM cognition_observations WHERE event_ref=? AND commit_ref=? AND owner_id=? AND channel='hearing'")
    .get(result.eventRef, commit.commit_ref, ownerId);
  if (!hearing) fail();
  return payload.sourceEntryRef;
}
export const isHiddenSupplyMode = value => ['active', 'paused', 'off'].includes(value);
const safeProgression = intent => intent && !intent.operation && !intent.magic && !intent.ordinaryAttempt
  && (['look', 'wait', 'read', 'conversation'].includes(intent.type)
    || intent.type === 'move' && typeof intent.destination === 'string' && intent.destination !== 'court');
export function hiddenSupplyIntent(classified, lifecycle) {
  if (lifecycle !== 1) return directorEventMayReviewIntent(classified);
  if (classified?.route !== 'steps' || classified.steps.length !== 1 || classified.activitySelection?.kind !== 'ordinary') return false;
  const { condition, intent } = classified.steps[0];
  return safeProgression(intent) && (condition === 'always' || condition === 'passage_permitted' && intent.type === 'move');
}
export function hiddenSupplyProgressed(before, after, action, outcome, lifecycle) {
  return after.worldTime > before.worldTime && !action.softResult && !action.directorEventDue
    && action.playerIntentPlan?.steps.length === 1 && outcome?.kind === 'completed' && outcome.steps?.length === 1
    && outcome.steps[0].status === 'completed' && (lifecycle === 1
      ? safeProgression(action.intent) && (action.intent.type !== 'move' || before.location !== after.location)
      : !action.intent?.magic && ['look', 'wait', 'read', 'conversation'].includes(action.intent?.type));
}
export function hiddenSupplyAdmits(before, after, action, outcome) {
  return lawfulState(before) && lawfulState(after) && hiddenSupplyProgressed(before, after, action, outcome, 1);
}
const terminalAt = (db, runId) => db.prepare('SELECT * FROM domain_hidden_supply_terminals_v3 WHERE run_id=?').get(runId);
function priorSlot(db, before, assembly, jobId) {
  return db.prepare(`SELECT j.job_id,t.input_hash,t.result_hash FROM agent_turn_jobs j
    JOIN agent_turn_tasks t ON t.job_id=j.job_id AND t.slot='director'
    WHERE j.branch_id=? AND j.generation=? AND j.base_revision>=? AND j.base_revision<=? AND j.job_id<>?
      AND json_extract(t.input_json,'$.context.data.version') IN (6,7)
      AND j.rowid<COALESCE((SELECT rowid FROM agent_turn_jobs WHERE job_id=?),9223372036854775807)
      ORDER BY j.rowid LIMIT 1`).get(before.branch_id, before.generation, assembly.commit.revision, before.revision, jobId, jobId);
}
// One offer per verified assembly on this execution branch. A sealed slot
// (including decline, invalid result or budget skip) consumes the aperture.
export function captureHiddenSupplyChoice(db, before, state, jobId, readCommit, isAncestor, policyAt) {
  const cap = hiddenSupplyJobPin(db, before, readCommit, isAncestor);
  if (cap?.version !== 2 || !lawfulState(state)) return null;
  const policy = policyAt(state);
  if (!boundaryAllows(policy)) return null;
  const assembly = verifiedAssembly(db, before, readCommit, isAncestor);
  if (!assembly) return null;
  const terminal = cap.lifecycle === 1 && terminalAt(db, before.run_id);
  if (terminal && isAncestor(before.commit_ref, terminal.commit_ref) || priorSlot(db, before, assembly, jobId)) return null;
  const scope = { actorId: DIRECTOR_PRINCIPAL, branchId: before.branch_id, generation: before.generation, revision: before.revision };
  const source = { ...cap, assemblyCommitRef: assembly.commit.commit_ref, assemblyEventRef: assembly.result.eventRef,
    snapshotHash: before.snapshot_hash, policyFingerprint: policy.fingerprint, jobId };
  // Marker is deliberately absent from the old capability/pin shape. Only an
  // authenticated in-scope adopted ancestor can affect the new style wire.
  const marker = db.prepare('SELECT version FROM domain_hidden_supply_style_roots_v5 WHERE root_commit_ref=?').get(cap.rootCommitRef);
  if (marker && (marker.version !== 1 || cap.awareness !== 1)) fail();
  const adopted = marker && policy.source.adoptedCommitRef ? readCommit(policy.source.adoptedCommitRef) : null;
  if (adopted && (adopted.kind !== 'run_policy' || !sameScope(adopted, before) || policy.source.rootCommitRef !== cap.rootCommitRef
    || !isAncestor(before.commit_ref, adopted.commit_ref))) fail();
  if (adopted) {
    const extension = EFFECTIVE_PRIVATE_SUPPLY_EXTENSION;
    const preference = { version: 1, fingerprint: policy.fingerprint, directorPreferences: policy.directorPreferences };
    const resolvedFact = PUBLIC_ASSEMBLY_CATEGORY;
    const styleSource = { ...source, adoptedCommitRef: adopted.commit_ref };
    const sourceToken = seal([extension, styleSource, scope, PRIVATE_SUPPLY_OFFER, resolvedFact, preference]);
    const packet = buildDirectorContext({ role: 'director', scope, data: { version: EFFECTIVE_PRIVATE_SUPPLY_WIRE, extension,
      offer: { offerId: PRIVATE_SUPPLY_OFFER, sourceToken }, resolvedFact, preference } });
    return { version: 2, source: styleSource, packet };
  }
  const sourceToken = seal([PRIVATE_SUPPLY_EXTENSION, source, scope, PRIVATE_SUPPLY_OFFER]);
  const packet = buildDirectorContext({ role: 'director', scope, data: { version: PRIVATE_SUPPLY_WIRE, extension: PRIVATE_SUPPLY_EXTENSION,
    offer: { offerId: PRIVATE_SUPPLY_OFFER, sourceToken } } });
  return { version: 1, source, packet };
}
function sealedChoice(db, before, previous, row, plan, readCommit, isAncestor, policyAt) {
  const choice = captureHiddenSupplyChoice(db, before, previous, row.job_id, readCommit, isAncestor, policyAt);
  if (!choice || !isDeepStrictEqual(plan.hiddenSupplyChoice, choice)) return null;
  const task = db.prepare("SELECT * FROM agent_turn_tasks WHERE job_id=? AND slot='director'").get(row.job_id);
  if (!task) return null;
  const intent = db.prepare("SELECT result_json,result_hash FROM agent_turn_tasks WHERE job_id=? AND slot='intent'").get(row.job_id);
  const input = decode(task.input_json, task.input_hash);
  if (!intent?.result_json || !hiddenSupplyIntent(decode(intent.result_json, intent.result_hash), plan.hiddenSupplyCapability.lifecycle)
    || task.role !== 'director' || task.actor_id !== DIRECTOR_PRINCIPAL || input.id !== 'director' || input.role !== 'director'
    || input.actorId !== DIRECTOR_PRINCIPAL || input.maxBytes !== 16000 || input.behaviorPrompt !== ''
    || !isDeepStrictEqual(input.context, choice.packet) || !isDeepStrictEqual(input.directorSystemSeal, modelSystemPolicySeal(choice.packet))) fail();
  if (task.result_json === null) {
    const terminal = db.prepare("SELECT * FROM agent_turn_optional_terminals WHERE job_id=? AND slot='director'").get(row.job_id);
    if (!terminal) return null;
    const details = decode(terminal.details_json, terminal.details_hash);
    const status = details.failureClock?.check === 'director-optional-reserve' ? 'budget-skipped'
      : terminal.status === 'skipped_optional' ? 'optional-skipped'
        : details.stage === 'validation' ? 'invalid-result' : 'optional-failed';
    return { status, seal: { inputHash: task.input_hash, terminalHash: terminal.details_hash } };
  }
  const output = validateDirectorOutput(choice.packet, decode(task.result_json, task.result_hash), choice.packet.scope);
  const entries = db.prepare(`SELECT sequence,kind,details_json,details_hash FROM agent_turn_trace
    WHERE job_id=? AND slot='director' AND kind IN ('attempt_started','validated') ORDER BY sequence`).all(row.job_id);
  if (entries.length !== 2 || entries[0].kind !== 'attempt_started' || entries[1].kind !== 'validated') return null;
  const attempt = decode(entries[0].details_json, entries[0].details_hash);
  if (attempt.version !== 1 || attempt.slotOrdinal !== 1 || attempt.inputHash !== task.input_hash
    || attempt.baseCommitRef !== before.commit_ref) fail();
  const accepted = decode(entries[1].details_json, entries[1].details_hash);
  if (!accepted || typeof accepted !== 'object' || Array.isArray(accepted)) fail();
  return { status: output.operation === 'plan' ? 'selected' : 'declined', seal: {
    ...(output.operation === 'plan' ? { token: output.sourceToken } : {}), resultHash: task.result_hash, inputHash: task.input_hash,
    attemptSeal: entries[0].details_hash, validationSeal: entries[1].details_hash } };
}
function sceneJob(db, commit, before, state, previous, publishing, lifecycle) {
  if (commit.kind !== 'act' || commit.parent_commit_ref !== before.commit_ref || commit.previous_execution_ref !== before.commit_ref
    || commit.world_time <= before.world_time || !sameScope(commit, before)) return null;
  const action = state.agentActions?.at(-1);
  if (action?.type !== 'scene' || !action.jobId || !hiddenSupplyProgressed(previous, state, action, action.actionOutcome, lifecycle)) return null;
  const row = db.prepare('SELECT * FROM agent_turn_jobs WHERE job_id=?').get(action.jobId);
  if (!row || !['committed', ...(publishing ? ['running'] : [])].includes(row.status)
    || row.branch_id !== before.branch_id || row.generation !== before.generation || row.base_revision !== before.revision) fail();
  const plan = decode(row.context_json, row.context_hash);
  if (plan.version !== 7 || plan.jobId !== row.job_id || plan.regeneration || plan.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION) return null;
  return { row, plan };
}
// A delivered NPC question can end the scene after the player step completed.
// An unissued private choice is not consumed. At publication and historical
// verification use only the authenticated staged facts, never model prose.
function stoppedByPlayerAskBeforeIssue(db, row, plan, before, action) {
  if (plan.privateUnissuedAskVersion !== 1 || plan.hiddenSupplyChoice?.packet?.data?.version !== EFFECTIVE_PRIVATE_SUPPLY_WIRE
    || !action?.beats?.length) return false;
  const director = db.prepare("SELECT 1 FROM agent_turn_tasks WHERE job_id=? AND slot='director'").get(row.job_id);
  const attempted = db.prepare("SELECT 1 FROM agent_turn_trace WHERE job_id=? AND slot='director' AND kind='attempt_started' LIMIT 1").get(row.job_id);
  const optional = db.prepare("SELECT 1 FROM agent_turn_optional_terminals WHERE job_id=? AND slot='director'").get(row.job_id);
  if (director || attempted || optional) return false;
  const stages = db.prepare('SELECT * FROM agent_turn_stages WHERE job_id=? ORDER BY stage').all(row.job_id);
  if (stages.length !== action.beats.length + 1) return false;
  let previousHash = null, last;
  for (const [index, record] of stages.entries()) {
    const r = decode(record.receipt_json, record.receipt_hash);
    if (index !== record.stage || r.stage !== index || r.kind !== (index ? 'beat' : 'root')
      || record.branch_id !== row.branch_id || record.generation !== row.generation || record.base_revision !== row.base_revision
      || record.base_commit_ref !== before.commit_ref || r.baseCommitRef !== before.commit_ref
      || record.previous_hash !== previousHash || r.previousHash !== previousHash
      || record.content_fingerprint !== plan.contentFingerprint || r.contentFingerprint !== plan.contentFingerprint
      || !isDeepStrictEqual(r.executionRevision, plan.executionRevision)) fail();
    previousHash = record.receipt_hash; last = r;
  }
  return last.stopReason === 'player_ask';
}
function derive(db, source, commit, before, state, previous, readCommit, isAncestor, policyAt, publishing, mode) {
  const { root } = source;
  if (!sameScope(root, commit) || !lawfulState(previous) || !lawfulState(state)) return null;
  const job = sceneJob(db, commit, before, state, previous, publishing, source.lifecycle);
  if (!job || !Object.hasOwn(job.plan, 'hiddenSupplyCapability')) return null;
  const { row, plan } = job;
  if (!isDeepStrictEqual(plan.hiddenSupplyCapability, hiddenSupplyJobPin(db, before, readCommit, isAncestor))) fail();
  const assembly = verifiedAssembly(db, before, readCommit, isAncestor);
  if (!assembly) return null;
  const policy = policyAt(previous), allowed = boundaryAllows(policy);
  const choice = allowed && source.version === 2 ? sealedChoice(db, before, previous, row, plan, readCommit, isAncestor, policyAt) : null;
  let terminal = null;
  if (source.lifecycle === 1) {
    const intent = db.prepare("SELECT result_json,result_hash FROM agent_turn_tasks WHERE job_id=? AND slot='intent'").get(row.job_id);
    if (!intent?.result_json || !hiddenSupplyIntent(decode(intent.result_json, intent.result_hash), 1)) return null;
    if (!isHiddenSupplyMode(mode) || !isHiddenSupplyMode(plan.hiddenSupplyMode)) fail();
    const prior = !choice && priorSlot(db, before, assembly, row.job_id);
    const blockedMode = mode !== 'active' ? mode : plan.hiddenSupplyMode !== 'active' ? plan.hiddenSupplyMode : null;
    const status = !allowed ? 'boundary-denied' : blockedMode ? `host-${blockedMode}`
      : choice?.status === 'selected' ? 'transferred' : choice?.status ?? (prior ? 'prior-slot-closed' : 'decision-unavailable');
    if (status === 'decision-unavailable' && stoppedByPlayerAskBeforeIssue(db, row, plan, before, state.agentActions.at(-1))) return null;
    terminal = { version: 1, status, mode, initialMode: plan.hiddenSupplyMode, rootCommitRef: root.commit_ref,
      assemblyCommitRef: assembly.commit.commit_ref, assemblyEventRef: assembly.result.eventRef,
      commitRef: commit.commit_ref, sourceCommitRef: before.commit_ref, jobId: row.job_id, intentHash: intent.result_hash,
      effectiveFingerprint: policy?.fingerprint ?? null, occurredAt: commit.world_time,
      ...((choice || prior) ? { decisionSeal: choice?.seal ?? prior } : {}) };
    if (status !== 'transferred') return { terminal, effect: null };
  } else if (!allowed || source.version === 2 && choice?.status !== 'selected') return null;
  const effect = { version: source.version, definitionFingerprint, itemRef: definition.itemRef, quantity: definition.quantity, source: definition.source,
    destination: definition.destination, carrier: definition.carrier, runId: commit.run_id, branchId: commit.branch_id,
    generation: commit.generation, rootCommitRef: root.commit_ref, assemblyCommitRef: assembly.commit.commit_ref,
    assemblyEventRef: assembly.result.eventRef, commitRef: commit.commit_ref, sourceCommitRef: before.commit_ref,
    jobId: row.job_id, occurredAt: commit.world_time, ...(choice ? { privateDecision: choice.seal } : {}) };
  return { terminal, effect };
}
const receipt = (transfer, owner) => ({ version: 1, ownerId: owner, transferCommitRef: transfer.commitRef, occurredAt: transfer.occurredAt,
  kind: owner === 'warden' ? 'performed-handover' : 'addressed-internal-receipt', text: owner === 'warden' ? handoverText : receiptText });

// Called before the existing Domain anchor seals THIS action transaction. The
// ledger is the authoritative custody of this specific unit, not UI inventory.
export function publishHiddenSupply(db, commit, before, state, previous, readCommit, isAncestor, policyAt, mode) {
  if (!db.isTransaction) fail();
  const source = capability(db, before, readCommit, isAncestor);
  if (source?.version !== 2 || source.lifecycle !== 1 && mode !== 'active'
    || terminalAt(db, commit.run_id) || db.prepare('SELECT 1 FROM domain_hidden_supply_transfers_v1 WHERE run_id=?').get(commit.run_id)) return;
  const settlement = derive(db, source, commit, before, state, previous, readCommit, isAncestor, policyAt, true, mode);
  if (!settlement) return;
  const { terminal, effect } = settlement;
  if (terminal) {
    const json = JSON.stringify(terminal);
    db.prepare('INSERT INTO domain_hidden_supply_terminals_v3 VALUES(?,?,?,?)').run(commit.run_id, commit.commit_ref, json, hash(json));
  }
  if (!effect) return;
  const json = JSON.stringify(effect);
  db.prepare('INSERT INTO domain_hidden_supply_transfers_v1 VALUES(?,?,?,?,?,?,?,?)')
    .run(effect.runId, effect.commitRef, effect.assemblyCommitRef, effect.jobId, -1, 1, json, hash(json));
  const ownerSources = [];
  for (const owner of [definition.carrier, definition.receiptOwner]) {
    const acquired = receipt(effect, owner), entry = JSON.stringify(acquired), receiptHash = hash(entry);
    db.prepare('INSERT INTO domain_hidden_supply_receipts_v1 VALUES(?,?,?,?)').run(effect.commitRef, owner, entry, receiptHash);
    if (source.awareness === 1) ownerSources.push(ownerSource(acquired, receiptHash));
  }
  return ownerSources;
}

function ownerSource(acquired, receiptHash) {
  return { id: privateSupplyObservationId(acquired.transferCommitRef, acquired.ownerId), ownerId: acquired.ownerId,
    text: acquired.text, channel: PRIVATE_SUPPLY_CHANNEL, occurredAt: acquired.occurredAt, learnedAt: acquired.occurredAt,
    binding: { version: 1, ownerId: acquired.ownerId, transferCommitRef: acquired.transferCommitRef, receiptHash, kind: acquired.kind } };
}
function checkOwnerSources(db, at, receipts, enabled) {
  const rows = db.prepare(`SELECT o.*,e.kind,e.payload,e.payload_hash FROM cognition_observations o
    JOIN domain_world_events e USING(event_ref) WHERE o.commit_ref=? AND o.channel=? ORDER BY o.owner_id`).all(at.commit_ref, PRIVATE_SUPPLY_CHANNEL);
  if (rows.length !== (enabled ? 2 : 0)) fail();
  return rows.map((row, index) => {
    const expected = ownerSource(decode(receipts[index].payload_json, receipts[index].payload_hash), receipts[index].payload_hash);
    if (row.id !== expected.id || row.owner_id !== expected.ownerId || row.text !== expected.text || row.run_id !== at.run_id
      || row.origin_branch_id !== at.branch_id || row.origin_generation !== at.generation || row.revision !== at.revision
      || row.occurred_at !== expected.occurredAt || row.learned_at !== expected.learnedAt || row.kind !== PRIVATE_SUPPLY_OBSERVATION_EVENT
      || !isDeepStrictEqual(decode(row.payload, row.payload_hash), expected.binding)) fail();
    return expected;
  });
}
const consideredA2 = (db, runId) => db.prepare('SELECT * FROM domain_hidden_supply_a2_v4 WHERE run_id=?').get(runId);
export function hiddenSupplyA2Source(db, before, state, readCommit, isAncestor, policyAt) {
  const cap = hiddenSupplyJobPin(db, before, readCommit, isAncestor);
  if (cap?.awareness !== 1 || !lawfulState(state)) return null;
  const used = consideredA2(db, before.run_id);
  if (used && isAncestor(before.commit_ref, used.commit_ref)) return null;
  const owner = readHiddenSupply(db, before, readCommit, isAncestor, policyAt)?.ownerSources?.find(row => row.ownerId === 'meruru');
  return owner ? { actorId: owner.ownerId, observationId: owner.id } : null;
}
function consideredA2Fact(db, commit, before, state, previous, available, publishing) {
  const action = state.agentActions?.at(-1);
  const frame = action?.schedulingBeats?.[0];
  if (!frame?.ownerPerception) return null;
  if (commit.kind !== 'act' || !sameScope(commit, before) || commit.parent_commit_ref !== before.commit_ref
    || !available || !isDeepStrictEqual(frame.ownerPerception, available) || frame.beat !== 1) fail();
  if (!frame.selected.includes('meruru')) return null;
  const decisions = state.agentAutonomy.decisions.slice(previous.agentAutonomy.decisions.length);
  if (!decisions.some(row => row.actorId === 'meruru' && row.sceneBeat === 1)) return null;
  const row = db.prepare(`SELECT t.*,j.branch_id,j.base_revision,j.generation,j.status FROM agent_turn_tasks t
    JOIN agent_turn_jobs j USING(job_id) WHERE t.job_id=? AND t.slot='npc:1:meruru'`).get(action.jobId);
  if (!row || !['committed', ...(publishing ? ['running'] : [])].includes(row.status) || row.role !== 'roleplay' || row.actor_id !== 'meruru'
    || row.branch_id !== before.branch_id || row.generation !== before.generation || row.base_revision !== before.revision) fail();
  const task = decode(row.input_json, row.input_hash), output = decode(row.result_json, row.result_hash);
  const source = db.prepare('SELECT text,channel,occurred_at,learned_at FROM cognition_observations WHERE id=? AND run_id=? AND owner_id=?')
    .get(available.observationId, before.run_id, 'meruru');
  const delivered = task.context.observations.find(value => value.id === available.observationId && value.actorId === 'meruru');
  const prefix = db.prepare('SELECT receipt_hash FROM agent_turn_stages WHERE job_id=? AND stage=0 AND base_commit_ref=?')
    .get(action.jobId, before.commit_ref);
  if (!isDeepStrictEqual(task.scheduling, frame) || !isDeepStrictEqual(action.beats[0].decisions.find(value => value.actorId === 'meruru')?.proposal, output)
    || task.sceneFrame?.beat !== 1 || task.sceneFrame.prefixHash !== prefix?.receipt_hash
    || !source || !delivered || delivered.channel !== PRIVATE_SUPPLY_CHANNEL || delivered.channel !== source.channel
    || delivered.text !== source.text || delivered.occurredAt !== source.occurred_at || delivered.learnedAt !== source.learned_at) fail();
  return { version: 1, commitRef: commit.commit_ref, sourceCommitRef: before.commit_ref, jobId: action.jobId,
    observationId: available.observationId, prefixHash: task.sceneFrame.prefixHash, inputHash: row.input_hash, resultHash: row.result_hash };
}
export function publishHiddenSupplyA2(db, commit, before, state, previous, readCommit, isAncestor, policyAt) {
  const current = state.agentActions?.at(-1);
  if (!current?.schedulingBeats?.[0]?.ownerPerception || current.jobId === previous.agentActions?.at(-1)?.jobId) return;
  if (!db.isTransaction) fail();
  const available = hiddenSupplyA2Source(db, before, previous, readCommit, isAncestor, policyAt);
  const fact = consideredA2Fact(db, commit, before, state, previous, available, true);
  if (!fact) return;
  const json = JSON.stringify(fact);
  db.prepare('INSERT INTO domain_hidden_supply_a2_v4 VALUES(?,?,?,?)').run(commit.run_id, commit.commit_ref, json, hash(json));
}

export function readHiddenSupply(db, commit, readCommit, isAncestor, policyAt) {
  const source = capability(db, commit, readCommit, isAncestor);
  if (!source) return null;
  const row = db.prepare('SELECT * FROM domain_hidden_supply_transfers_v1 WHERE run_id=?').get(commit.run_id);
  const terminal = source.lifecycle === 1 ? terminalAt(db, commit.run_id) : null;
  const visible = terminal && isAncestor(commit.commit_ref, terminal.commit_ref);
  let settlement;
  if (visible) {
    const at = readCommit(terminal.commit_ref), before = readCommit(at.parent_commit_ref);
    const payload = decode(terminal.payload_json, terminal.payload_hash);
    settlement = derive(db, source, at, before, JSON.parse(at.snapshot_json), JSON.parse(before.snapshot_json), readCommit, isAncestor, policyAt, false, payload.mode);
    if (!isDeepStrictEqual(settlement?.terminal, payload) || (settlement.effect ? row?.commit_ref !== at.commit_ref : Boolean(row))) fail();
  }
  if (!row || !isAncestor(commit.commit_ref, row.commit_ref)) return { source: 1, infirmary: 0, receipts: [] };
  if (source.lifecycle === 1 && !visible) fail();
  const at = readCommit(row.commit_ref), before = readCommit(at.parent_commit_ref);
  const expected = (settlement ?? derive(db, source, at, before, JSON.parse(at.snapshot_json), JSON.parse(before.snapshot_json), readCommit, isAncestor, policyAt, false))?.effect;
  if (!expected || row.assembly_commit_ref !== expected.assemblyCommitRef || row.job_id !== expected.jobId
    || row.source_delta !== -1 || row.infirmary_delta !== 1 || !isDeepStrictEqual(expected, decode(row.payload_json, row.payload_hash))) fail();
  const receipts = db.prepare('SELECT * FROM domain_hidden_supply_receipts_v1 WHERE transfer_commit_ref=? ORDER BY owner_id').all(at.commit_ref);
  if (!isDeepStrictEqual(receipts.map(entry => entry.owner_id), ['meruru', 'warden'])) fail();
  for (const row of receipts) if (!isDeepStrictEqual(receipt(expected, row.owner_id), decode(row.payload_json, row.payload_hash))) fail();
  const ownerSources = checkOwnerSources(db, at, receipts, source.awareness === 1);
  const a2 = source.awareness === 1 ? consideredA2(db, commit.run_id) : null;
  if (a2 && isAncestor(commit.commit_ref, a2.commit_ref)) {
    const acquired = ownerSources.find(value => value.ownerId === 'meruru');
    const settled = readCommit(a2.commit_ref), parent = readCommit(settled.parent_commit_ref);
    if (!acquired || !isAncestor(parent.commit_ref, at.commit_ref)) fail();
    const verified = consideredA2Fact(db, settled, parent, JSON.parse(settled.snapshot_json), JSON.parse(parent.snapshot_json),
      { actorId: acquired.ownerId, observationId: acquired.id }, false);
    if (!isDeepStrictEqual(decode(a2.payload_json, a2.payload_hash), verified)) fail();
  }
  return { source: source.row.source_stock + row.source_delta, infirmary: row.infirmary_delta, ownerSources,
    receipts: receipts.map(row => decode(row.payload_json, row.payload_hash)) };
}
