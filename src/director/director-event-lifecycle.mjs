import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { effectiveAssemblyAllowed } from '../content/effective-run-boundary.mjs';
import { captureEffectiveDirectorEventPin, DIRECTOR_ASSEMBLY_EFFECT, DIRECTOR_PRINCIPAL, isDirectorEventExtension, validateDirectorOutput } from './director-effective-contract.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from './director-event-runtime.mjs';
import { directorEventMayReviewIntent } from './director-event-source.mjs';
import { createdPlayerId } from '../creation/player-setup.mjs';
import { runtimeActive, runtimeRoom } from '../case-runtime.mjs';
import { activeProcedure } from '../cases/case-procedure.mjs';
import { guardDetained, guardProtected } from '../world/guard-reaction.mjs';
import { hasPrisonWorld, prisonClock } from '../world/prison-activity.mjs';
import { CARD_ASSEMBLY_TEXT } from '../content/card-world.mjs';
import { actorObservationId } from '../characters/observation-identity.mjs';
import { modelSystemPolicySeal } from '../agents/model-gateway.mjs';

const digest = text => createHash('sha256').update(text).digest('hex');
const hash = value => digest(JSON.stringify(value));
const fail = () => { throw Object.assign(new Error('公共导演计划与原始剧情来源或封存任务不一致。'), { code: 'INVALID_AGENT_JOB' }); };
const sealRef = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const commitRef = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(value);
const id = value => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/u.test(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const cell = value => typeof value === 'string' && /^(?:cell|cell\d+|playercell)$/u.test(value);
const exact = (value, keys) => value && Object.getPrototypeOf(value) === Object.prototype
  && Reflect.ownKeys(value).length === keys.length && keys.every(key => {
    const d = Object.getOwnPropertyDescriptor(value, key); return d?.enumerable && Object.hasOwn(d, 'value');
  });
const scopeMatches = (plan, commit) => commit && plan.runId === commit.run_id && plan.branchId === commit.branch_id
  && plan.generation === commit.generation;
const statuses = ['registered', 'occurred', 'cancelled', 'expired'];
const decode = (json, seal) => {
  if (typeof json !== 'string' || digest(json) !== seal) fail();
  try { return JSON.parse(json); } catch { fail(); }
};
export const directorAssemblyKey = permit => `broadcast:${hash([DIRECTOR_ASSEMBLY_EFFECT, permit.planId, permit.branchId, permit.generation])}:assembly`;

// Only the already released first morning, a real cell screen, and the fixed
// Warden notice. The Warden is screen-only, not a physical room occupant.
export function directorAssemblyRoom(state) {
  if (state?.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION || !state.creation?.cellSetup
    || state.creation.version !== 2 || state.creation.scenarioId || state.creation.storyArcId || state.customAbilitySetup
    || state.agentOpening || state.fixtureBranch || state.completed || state.caseRuntime?.occupiedBody || activeProcedure(state)
    || !hasPrisonWorld(state) || state.agentWorld.broadcasts.length || !state.agentWorld.lockReleased || !state.agentDoorOpen
    || state.guardReaction?.pending || guardProtected(state) || guardDetained(state)) return null;
  const clock = prisonClock(state);
  if (clock.day !== 1 || clock.hour < 6 || clock.hour >= 10 || !clock.free) return null;
  const player = createdPlayerId(state); const room = runtimeRoom(state, player);
  return runtimeActive(state, player) && cell(room) ? room : null;
}

const DUE_KEYS = ['version', 'planId', 'windowKey', 'effectRef', 'runId', 'branchId', 'generation', 'baseRevision',
  'baseCommitRef', 'registerCommitRef', 'jobId', 'roomId', 'notBefore', 'expiresAt'];
export function assertDirectorAssemblyPermit(due, state, jobId) {
  if (state.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION || !exact(due, DUE_KEYS) || due.version !== 1
    || ![due.planId, due.windowKey].every(sealRef) || ![due.baseCommitRef, due.registerCommitRef].every(commitRef)
    || due.effectRef !== DIRECTOR_ASSEMBLY_EFFECT
    || ![due.runId, due.branchId, due.jobId].every(id) || due.jobId !== jobId || due.generation !== state.generation || due.baseRevision !== state.revision
    || !cell(due.roomId) || !count(due.notBefore) || !count(due.expiresAt) || due.notBefore >= due.expiresAt) fail();
}
export function directorAssemblyMayAdvance(action, prefix) {
  return action.directorEventDue && !prefix.beats.length && !prefix.interrupted && action.playerIntentPlan?.steps.length === 1
    && ['look', 'act', 'wait', 'read', 'conversation'].includes(action.intent.type)
    && ['look', 'act', 'wait', 'read', 'conversation'].includes(action.playerIntentPlan.steps[0].intent.type)
    && !action.intent.magic && directorAssemblyRoom(prefix.draft) === action.directorEventDue.roomId;
}

// Metadata under the existing DirectorPlanningStore and its Domain transaction.
// No world effect is executed here. Each row is an immutable commit consequence.
export function initializeDirectorLifecycle(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS director_event_transitions_v4(
    commit_ref TEXT PRIMARY KEY REFERENCES domain_commits(commit_ref),
    parent_commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),
    job_id TEXT REFERENCES agent_turn_jobs(job_id), input_hash TEXT NOT NULL CHECK(length(input_hash)=64),
    payload_json TEXT NOT NULL, payload_hash TEXT NOT NULL CHECK(length(payload_hash)=64));
    CREATE TRIGGER IF NOT EXISTS director_event_v4_no_update BEFORE UPDATE ON director_event_transitions_v4
      BEGIN SELECT RAISE(ABORT,'immutable director event transition'); END;
    CREATE TRIGGER IF NOT EXISTS director_event_v4_no_delete BEFORE DELETE ON director_event_transitions_v4
      BEGIN SELECT RAISE(ABORT,'immutable director event transition'); END;
    CREATE TRIGGER IF NOT EXISTS director_event_v4_no_replace BEFORE INSERT ON director_event_transitions_v4
      WHEN EXISTS(SELECT 1 FROM director_event_transitions_v4 WHERE commit_ref=NEW.commit_ref)
      BEGIN SELECT RAISE(ABORT,'immutable director event transition'); END;`);
}
function lastTransition(db, commitRef) {
  if (!commitRef) return null;
  const row = db.prepare(`WITH RECURSIVE lineage(commit_ref,parent_commit_ref,depth) AS (
    SELECT commit_ref,parent_commit_ref,0 FROM domain_commits WHERE commit_ref=?
    UNION ALL SELECT c.commit_ref,c.parent_commit_ref,h.depth+1 FROM domain_commits c JOIN lineage h ON c.commit_ref=h.parent_commit_ref WHERE h.depth<8191)
    SELECT e.* FROM lineage h JOIN director_event_transitions_v4 e USING(commit_ref) ORDER BY h.depth LIMIT 1`).get(commitRef);
  if (!row) return null;
  const value = decode(row.payload_json, row.payload_hash);
  if (value?.version !== 1 || !statuses.includes(value.status) || !sealRef(value.planId)) fail();
  return value;
}
function makeDue(record, base, jobId) {
  if (record?.status !== 'registered' || !scopeMatches(record, base)) return null;
  return { version: 1, planId: record.planId, windowKey: record.windowKey, effectRef: record.effectRef, runId: record.runId,
    branchId: record.branchId, generation: record.generation, baseRevision: base.revision, baseCommitRef: base.commit_ref,
    registerCommitRef: record.registerCommitRef, jobId, roomId: record.roomId, notBefore: record.notBefore, expiresAt: record.expiresAt };
}
export function captureDirectorLifecycleJob(db, scope, jobId) {
  const base = db.prepare('SELECT commit_ref,run_id,branch_id,generation,revision FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
    .get(scope.branchId, scope.generation, scope.revision);
  if (!base || !id(jobId)) fail();
  return { version: 1, due: makeDue(lastTransition(db, base.commit_ref), base, jobId) };
}

function jobFor(db, base, commit, actionJob, publishing) {
  if (!actionJob) return null;
  const row = db.prepare('SELECT * FROM agent_turn_jobs WHERE job_id=?').get(actionJob);
  if (!row || !(publishing ? row.status === 'running' : ['running', 'committed'].includes(row.status))) fail();
  const plan = decode(row.context_json, row.context_hash);
  if (!Object.hasOwn(plan, 'directorEventLifecycle')) return null; // exact .2.1 jobs stay proposal-only
  if (plan.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION || plan.version !== 7 || plan.regeneration
    || plan.jobId !== row.job_id || row.branch_id !== base.branch_id || row.generation !== base.generation
    || row.base_revision !== base.revision || commit.parent_commit_ref !== base.commit_ref || commit.kind !== 'act') fail();
  return { row, plan };
}
function registered(db, commit, before, state, job) {
  const { row, plan } = job;
  if (!isDirectorEventExtension(plan.directorExtension) || state.worldTime <= before.worldTime) return null;
  const action = state.agentActions.at(-1);
  if (action.intent?.type !== 'look' || action.actionOutcome?.kind !== 'completed'
    || action.actionOutcome.steps?.length !== 1 || action.actionOutcome.steps[0].status !== 'completed') return null;
  const room = directorAssemblyRoom(before);
  if (!room || directorAssemblyRoom(state) !== room || !scopeMatches({ runId: commit.run_id, branchId: row.branch_id, generation: row.generation }, commit)) return null;
  const pin = captureEffectiveDirectorEventPin(db, { branchId: row.branch_id, generation: row.generation, revision: row.base_revision,
    jobId: row.job_id, initialRunPolicy: plan.initialRunPolicy, executionRevision: plan.executionRevision,
     effectiveRunPolicy: plan.runPolicyConsumersVersion === 1 ? plan.effectiveRunPolicy : undefined }, before);
  if (!pin || !isDeepStrictEqual(pin, plan.directorEventPin)) fail();
  const task = db.prepare("SELECT * FROM agent_turn_tasks WHERE job_id=? AND slot='director'").get(row.job_id);
  if (!task || task.result_json === null) return null;
  const intent = db.prepare("SELECT result_json,result_hash FROM agent_turn_tasks WHERE job_id=? AND slot='intent'").get(row.job_id);
  if (!intent || !directorEventMayReviewIntent(decode(intent.result_json, intent.result_hash))) fail();
  const input = decode(task.input_json, task.input_hash);
  if (task.role !== 'director' || task.actor_id !== DIRECTOR_PRINCIPAL || input.id !== 'director' || input.role !== 'director'
    || input.actorId !== DIRECTOR_PRINCIPAL || input.maxBytes !== 16000 || input.behaviorPrompt !== ''
    || !isDeepStrictEqual(input.context, pin.packet) || !isDeepStrictEqual(input.directorSystemSeal, modelSystemPolicySeal(pin.packet))) fail();
  const result = validateDirectorOutput(pin.packet, decode(task.result_json, task.result_hash), pin.packet.scope);
  if (result.operation !== 'plan') return null;
  const { windowKey, sourceCommitRef } = pin.source; const { effectRef, expiresAt, sourceToken } = pin.packet.data.offers[0];
  if (state.worldTime + 1 >= expiresAt) return null;
  const planId = hash([commit.run_id, windowKey, effectRef, row.job_id]);
  return { version: 1, planId, windowKey, effectRef, sourceToken, runId: commit.run_id, branchId: commit.branch_id,
    generation: commit.generation, sourceCommitRef, registerCommitRef: commit.commit_ref, roomId: room,
    registeredAt: state.worldTime, notBefore: state.worldTime + 1, expiresAt, deferrals: 0, status: 'registered', reason: null, eventRef: null };
}

function expectedTransition(db, current, parent, previous, jobId, publishing) {
  const { commit, state } = current;
  if (state.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION || !parent) return null;
  const before = parent.state; const action = jobId ? state.agentActions.at(-1) : null;
  const job = jobFor(db, parent.commit, commit, jobId, publishing);
  const due = job ? makeDue(previous, parent.commit, jobId) : null;
  if (job && !isDeepStrictEqual(job.plan.directorEventLifecycle, { version: 1, due })) fail();
  if (previous?.status === 'registered' && jobId && !job && scopeMatches(previous, parent.commit)) fail();
  if (due ? !isDeepStrictEqual(action.directorEventDue, due) : Object.hasOwn(action || {}, 'directorEventDue')) fail();
  if (previous?.status === 'registered' && !scopeMatches(previous, commit))
    return { ...previous, status: 'cancelled', reason: 'scope_change' };
  if (previous?.status === 'registered' && !due) {
    if (state.worldTime >= previous.expiresAt) return { ...previous, status: 'expired', reason: 'deadline' };
    if (state.worldTime > before.worldTime) return { ...previous, status: 'cancelled', reason: 'not_lawfully_reached' };
  }
  if (due) {
    const notices = state.agentWorld.broadcasts.slice(before.agentWorld.broadcasts.length);
    const own = notices.find(row => row.id === directorAssemblyKey(due));
    if (own) {
      if (!effectiveAssemblyAllowed(job.plan.effectiveRunPolicy, own.text)) fail();
      const line = state.entries.slice(before.entries.length).filter(row => row.observationKey === own.id);
      if (notices.length !== 1 || own.text !== CARD_ASSEMBLY_TEXT || before.agentWorld.broadcasts.length || !before.agentWorld.lockReleased
        || directorAssemblyRoom(before) !== due.roomId || !state.agentWorld.lockReleased
        || own.occurredAt !== Math.max(due.notBefore, before.worldTime + 1) || own.occurredAt >= due.expiresAt || own.occurredAt > state.worldTime
        || line.length !== 1 || line[0].speakerId !== 'warden' || line[0].delivery !== 'speech' || line[0].text !== own.text
        || line[0].occurredAt !== own.occurredAt || !own.audienceIds.includes(createdPlayerId(state)) || own.audienceIds.includes('warden')
        || !isDeepStrictEqual(line[0].audienceIds, own.audienceIds)) fail();
      const entry = line[0];
      const events = db.prepare("SELECT event_ref,payload,payload_hash FROM domain_world_events WHERE commit_ref=? AND kind='statement' AND json_extract(payload,'$.sourceEntryRef')=?")
        .all(commit.commit_ref, entry.id);
      if (events.length !== 1) fail();
      const payload = decode(events[0].payload, events[0].payload_hash);
      if (payload.speakerId !== 'warden' || payload.delivery !== 'speech' || payload.text !== own.text
        || !isDeepStrictEqual(payload.audienceIds, own.audienceIds)) fail();
      const hearings = db.prepare('SELECT id,owner_id,channel,text,occurred_at,learned_at FROM cognition_observations WHERE event_ref=? AND commit_ref=? ORDER BY owner_id')
        .all(events[0].event_ref, commit.commit_ref);
      if (!isDeepStrictEqual(hearings.map(row => row.owner_id), [...own.audienceIds].sort())
        || hearings.some(row => row.channel !== 'hearing' || row.text !== own.text || row.occurred_at !== own.occurredAt
          || row.learned_at !== own.occurredAt || row.id !== actorObservationId(state, own.id, row.owner_id))) fail();
      return { ...previous, status: 'occurred', eventRef: events[0].event_ref };
    }
    if (state.agentWorld.broadcasts.length) return { ...previous, status: 'cancelled', reason: 'superseded' };
    if (state.worldTime >= due.expiresAt) return { ...previous, status: 'expired', reason: 'deadline' };
    if (state.worldTime > before.worldTime || directorAssemblyRoom(state) !== due.roomId)
      return { ...previous, status: 'cancelled', reason: 'not_lawfully_reached' };
    return null;
  }
  return job && !previous ? registered(db, commit, before, state, job) : null;
}

export function settleDirectorLifecycleCommit(db, current, parent, previous, jobId, { publishing = false } = {}) {
  if (current.state.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION) return null;
  const { commit } = current;
  if (previous === undefined) previous = lastTransition(db, commit.parent_commit_ref);
  const next = expectedTransition(db, current, parent, previous, jobId, publishing);
  const row = db.prepare('SELECT * FROM director_event_transitions_v4 WHERE commit_ref=?').get(commit.commit_ref);
  if (!next) { if (row) fail(); return previous; }
  const inputHash = hash([1, commit.commit_ref, commit.parent_commit_ref, commit.snapshot_hash, jobId, previous]);
  if (row) {
    if (row.parent_commit_ref !== commit.parent_commit_ref || row.job_id !== jobId || row.input_hash !== inputHash
      || !isDeepStrictEqual(decode(row.payload_json, row.payload_hash), next)) fail();
  } else {
    if (!publishing || !db.isTransaction) fail();
    db.prepare('INSERT INTO director_event_transitions_v4 VALUES(?,?,?,?,?,?)')
      .run(commit.commit_ref, commit.parent_commit_ref, jobId, inputHash, JSON.stringify(next), hash(next));
  }
  return next;
}
