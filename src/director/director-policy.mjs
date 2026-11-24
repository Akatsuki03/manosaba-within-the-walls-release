import { createHash } from 'node:crypto';
import { initializeDirectorLifecycle, captureDirectorLifecycleJob, settleDirectorLifecycleCommit } from './director-event-lifecycle.mjs';
import { openSqliteScope } from '../host/sqlite-scope-owner.mjs';
import { isDeepStrictEqual } from 'node:util';
import { isProxy } from 'node:util/types';
import { DIRECTOR_BLUEPRINT_DESCRIPTIONS, DIRECTOR_PLANNING_EXTENSION, DIRECTOR_PLANNING_POLICY,
  DIRECTOR_PLAN_BLUEPRINTS, DIRECTOR_PLAN_LIMITS, DIRECTOR_PRINCIPAL, buildDirectorContext,
  validateDirectorOutput, directorBoundary, directorSnapshotHash } from './director-boundaries.mjs';
import { isDirectorExtension } from './director-effective-private-contract.mjs';
import { actorHandle, actorRoom, actorPerception, readableMaterials } from '../characters/actor-perception.mjs';
import { runtimeActive } from '../case-runtime.mjs';
import { actorsForState, createdPlayerId } from '../creation/player-setup.mjs';
import { beginCausalScene, settlePlayerBoundary, applyCausalNpcBeat, sceneBeatsDraft } from '../scenes/scene-beats.mjs';
import { validateSceneScheduling } from '../scenes/scene-scheduling.mjs';
import { attachNpcMagicProjection } from '../world/magic/magic-host.mjs';
import { DomainStore } from '../world/domain-store.mjs';
import { MagicRepository } from '../world/magic/ability-runtime.mjs';

export const DIRECTOR_CANDIDATE_POLICY = 'source-opportunity-lifecycle@1';
export const DIRECTOR_CANDIDATE_LIMIT = 3;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = () => { throw Object.assign(new Error('导演候选的分支来源或生命周期无效。'), { code: 'INVALID_AGENT_JOB' }); };
export const candidateKey = opportunity => [opportunity.blueprint, opportunity.roomId, opportunity.entityId].join(':');
export const opportunityDescription = blueprint => DIRECTOR_BLUEPRINT_DESCRIPTIONS[blueprint];
export function candidateTarget(state, opportunity) {
  if (opportunity.blueprint !== 'existing_social_contact') return null;
  const owner = createdPlayerId(state);
  return actorsForState(state).find(actor => actor.id !== owner && actor.id !== 'warden'
    && (actor.id === opportunity.entityId || actorHandle(owner, actor.id) === opportunity.entityId)
    && actorRoom(state, actor.id) === opportunity.roomId)?.id ?? null;
}
export function candidateStatus(candidate, state) {
  if (state.worldTime >= candidate.expiresAt || state.agentActions.length >= candidate.expiresAfterAction) return 'expired';
  if (state.completed || actorRoom(state, createdPlayerId(state)) !== candidate.opportunity.roomId
    || (state.caseRuntime?.procedure?.stage || state.caseOne?.stage || null) !== candidate.stage) return 'invalidated';
  const opportunity = candidate.opportunity;
  if (opportunity.blueprint === 'read_existing_material' && !readableMaterials(state).some(row => row.id === opportunity.entityId)) return 'invalidated';
  if (opportunity.blueprint === 'existing_social_contact'
    && (!candidate.targetActorId || actorRoom(state, candidate.targetActorId) !== opportunity.roomId
      || !runtimeActive(state, candidate.targetActorId))) return 'invalidated';
  return 'focused';
}
export const directorCandidateView = candidate => ({ candidateId: candidate.id, ...candidate.opportunity,
  description: opportunityDescription(candidate.opportunity.blueprint) });

/** Match only enacted host receipts, never proposals or narrative claims. A
 * candidate created by this job is prospective and cannot activate retroactively. */
export function candidateActivation(candidate, before, after, action, jobId) {
  if (!action || candidate.createdJobId === jobId || candidateStatus(candidate, before) !== 'focused'
    || actorRoom(before, createdPlayerId(before)) !== candidate.opportunity.roomId) return null;
  const owner = createdPlayerId(before); const opportunity = candidate.opportunity;
  const newEntries = after.entries.slice(before.entries.length);
  const accepted = (after.agentAutonomy?.decisions || []).filter(row => row.sceneRevision === after.revision && row.accepted && row.operation);
  if (opportunity.blueprint === 'inspect_existing_scene' && action.intent.type === 'look'
    && after.worldTime >= before.worldTime + 5 && after.worldTime < candidate.expiresAt && actorRoom(after, owner) === opportunity.roomId) return { actorId: owner, operation: 'look' };
  if (opportunity.blueprint === 'read_existing_material') {
    if (action.intent.type === 'read' && action.intent.subjectId === opportunity.entityId
      && newEntries.some(row => row.delivery === 'reading' && row.audienceIds?.includes(owner)
        && row.observationKey === `read:${jobId}:${owner}` && row.occurredAt < candidate.expiresAt)) return { actorId: owner, operation: 'read' };
    const reader = accepted.find(row => row.operation.type === 'read' && row.operation.subjectId === opportunity.entityId
      && actorRoom(after, row.actorId) === opportunity.roomId
      && newEntries.some(entry => entry.delivery === 'reading' && entry.audienceIds?.includes(row.actorId)
        && entry.occurredAt < candidate.expiresAt && entry.observationKey?.startsWith(`read:${jobId}:beat:`) && entry.observationKey.endsWith(`:${row.actorId}`)));
    if (reader) return { actorId: reader.actorId, operation: 'read' };
  }
  if (opportunity.blueprint === 'existing_social_contact') {
    const target = candidate.targetActorId;
    const delivered = newEntries.find(row => row.occurredAt < candidate.expiresAt && ['speech', 'writing'].includes(row.delivery)
      && ((row.speakerId === owner && row.audienceIds?.includes(target) && row.addresseeIds?.includes(target))
        || (row.speakerId === target && row.audienceIds?.includes(owner) && row.addresseeIds?.includes(owner))));
    if (delivered) return { actorId: delivered.speakerId, operation: delivered.delivery === 'writing' ? 'write' : 'speak' };
  }
  return null;
}

/** Same SQLite connection/transaction as the world. All events are anchored to
 * immutable domain commits; parent_commit_ref (never execution order) is the
 * only visibility relation. No public/model endpoint exposes this repository. */
export class DirectorCandidateStore {
  #db;
  constructor(db) { this.#db = db; }
  initialize() {
    if (!this.#db.isTransaction) fail();
    this.#db.exec(`CREATE TABLE IF NOT EXISTS director_candidate_events(
      commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref), candidate_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('focused','withdrawn','expired','invalidated','activated','ranking_used')),
      job_id TEXT REFERENCES agent_turn_jobs(job_id), payload_json TEXT NOT NULL, payload_hash TEXT NOT NULL,
      PRIMARY KEY(commit_ref,candidate_id,ordinal));
      CREATE TRIGGER IF NOT EXISTS director_event_no_update BEFORE UPDATE ON director_candidate_events
      BEGIN SELECT RAISE(ABORT,'immutable director candidate'); END;
      CREATE TRIGGER IF NOT EXISTS director_event_no_delete BEFORE DELETE ON director_candidate_events
      BEGIN SELECT RAISE(ABORT,'immutable director candidate'); END;
      CREATE TRIGGER IF NOT EXISTS director_event_no_replace BEFORE INSERT ON director_candidate_events
      WHEN EXISTS(SELECT 1 FROM director_candidate_events WHERE commit_ref=NEW.commit_ref AND candidate_id=NEW.candidate_id AND ordinal=NEW.ordinal)
      BEGIN SELECT RAISE(ABORT,'immutable director candidate'); END;`);
  }
  read(commitRef) {
    if (!this.#db.prepare('SELECT 1 FROM domain_commits WHERE commit_ref=?').get(commitRef)) fail();
    const rows = this.#db.prepare(`WITH RECURSIVE history(commit_ref,parent_commit_ref,depth) AS (
      SELECT commit_ref,parent_commit_ref,0 FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref,h.depth+1 FROM domain_commits c JOIN history h ON c.commit_ref=h.parent_commit_ref
    ), ranked AS (SELECT e.*, row_number() OVER(PARTITION BY candidate_id ORDER BY h.depth,ordinal DESC) latest
      FROM director_candidate_events e JOIN history h ON e.commit_ref=h.commit_ref)
      SELECT * FROM ranked WHERE latest=1 AND kind IN ('focused','ranking_used') ORDER BY candidate_id LIMIT 4`).all(commitRef);
    if (rows.length > DIRECTOR_CANDIDATE_LIMIT) fail();
    return rows.map(row => {
      let value; try { value = JSON.parse(row.payload_json); } catch { fail(); }
      if (hash(value) !== row.payload_hash || value.id !== row.candidate_id || value.policy !== DIRECTOR_CANDIDATE_POLICY) fail();
      return value;
    });
  }
  #append(scope, candidate, kind, jobId = null, activation = null) {
    if (!this.#db.isTransaction) fail();
    const commit = this.#db.prepare('SELECT branch_id,generation,revision FROM domain_commits WHERE commit_ref=?').get(scope.commitRef);
    if (!commit || commit.branch_id !== scope.branchId || commit.generation !== scope.generation || commit.revision !== scope.revision) fail();
    const ordinal = this.#db.prepare('SELECT count(*) n FROM director_candidate_events WHERE commit_ref=? AND candidate_id=?').get(scope.commitRef, candidate.id).n;
    const payload = { ...candidate, ...(activation ? { activation } : {}) };
    this.#db.prepare('INSERT INTO director_candidate_events VALUES(?,?,?,?,?,?,?)')
      .run(scope.commitRef, candidate.id, ordinal, kind, jobId, JSON.stringify(payload), hash(payload));
  }
  publish(scope, state, { before, action, jobId = null, captured, opportunity, output, rankingUsedIds = [] } = {}) {
    if (!this.#db.isTransaction) fail();
    const parent = this.#db.prepare('SELECT parent_commit_ref FROM domain_commits WHERE commit_ref=?').get(scope.commitRef)?.parent_commit_ref;
    const inherited = parent ? this.read(parent) : [];
    if (captured && !isDeepStrictEqual(inherited, captured)) fail();
    if (output && (!jobId || !this.#db.prepare("SELECT 1 FROM agent_turn_jobs WHERE job_id=? AND status='running'").get(jobId))) fail();
    const live = [];
    for (let candidate of inherited) {
      const withdrawn = output?.operation === 'withdraw' && candidate.opportunity.id === output.opportunityId && candidate.opportunity.sourceRef === output.sourceRef;
      const activation = !withdrawn && before ? candidateActivation(candidate, before, state, action, jobId) : null;
      const status = candidateStatus(candidate, state);
      if (withdrawn) this.#append(scope, candidate, 'withdrawn', jobId);
      else if (activation) this.#append(scope, candidate, 'activated', jobId, activation);
      else if (status !== 'focused') this.#append(scope, candidate, status, jobId);
      else {
        if (rankingUsedIds.includes(candidate.id) && !candidate.rankingUsed) {
          candidate = { ...candidate, rankingUsed: true }; this.#append(scope, candidate, 'ranking_used', jobId);
        }
        live.push(candidate);
      }
    }
    if (output?.operation === 'focus') {
      if (!opportunity || opportunity.id !== output.opportunityId || opportunity.sourceRef !== output.sourceRef) fail();
      const targetActorId = candidateTarget(before, opportunity);
      const candidate = { policy: DIRECTOR_CANDIDATE_POLICY, id: hash([jobId, opportunity.sourceRef]), opportunity,
        targetActorId, createdJobId: jobId, createdAt: before.worldTime, expiresAt: before.worldTime + 3600,
        expiresAfterAction: before.agentActions.length + 5, stage: before.caseRuntime?.procedure?.stage || before.caseOne?.stage || null,
        rankingUsed: false };
      if (opportunity.blueprint === 'existing_social_contact' && !targetActorId) fail();
      const duplicate = live.find(row => candidateKey(row.opportunity) === candidateKey(opportunity));
      // Repeated focus does not reset expiry or the one-use fairness budget.
      if (!duplicate && live.length < DIRECTOR_CANDIDATE_LIMIT) {
        this.#append(scope, candidate, 'focused', jobId);
        const status = candidateStatus(candidate, state);
        if (status !== 'focused') this.#append(scope, candidate, status, jobId);
      }
    }
  }
}

// V3 is an additive host-only planner. The v1/v2 store and its CHECK remain
// sealed: neither an install nor a read upgrades historical candidates.
const planActive = plan => plan.status === 'active';
const planId = value => typeof value === 'string' && value.length > 0 && value.length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value);
const planDigest = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const planInt = value => Number.isSafeInteger(value) && value >= 0;
const stageOf = state => state.caseRuntime?.procedure?.stage || state.caseOne?.stage || null;
function planExact(value, fields) {
  if (!value || typeof value !== 'object' || isProxy(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Reflect.ownKeys(value).length !== fields.length || fields.some(key => {
      const d = Object.getOwnPropertyDescriptor(value, key); return !d?.enumerable || !Object.hasOwn(d, 'value');
    })) fail();
}
function planArray(value, limit) {
  if (!Array.isArray(value) || isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype
    || value.length > limit || Reflect.ownKeys(value).length !== value.length + 1) fail();
  for (let i = 0; i < value.length; i++) {
    const d = Object.getOwnPropertyDescriptor(value, String(i)); if (!d?.enumerable || !Object.hasOwn(d, 'value')) fail();
  }
  return value;
}
const materialHash = material => hash([material.id, material.name, material.text, material.carrier ?? null]);
function sourceHost(state, blueprint, materialId, targetActorId) {
  const ownerId = createdPlayerId(state); const roomId = actorRoom(state, ownerId);
  const material = materialId === null ? null : readableMaterials(state, ownerId).find(row => row.id === materialId);
  if (state.completed || !runtimeActive(state, ownerId) || !planId(roomId) || roomId === 'unavailable'
    || ['ballot', 'execution_ready', 'outcome_pending', 'ending'].includes(stageOf(state))
    || materialId !== null && !material || targetActorId !== null && (!runtimeActive(state, targetActorId)
      || targetActorId === ownerId || targetActorId === 'warden' || actorRoom(state, targetActorId) !== roomId)) return null;
  const scene = actorPerception(state, ownerId);
  if (materialId !== null && !scene.readable.some(row => row.id === materialId)
    || targetActorId !== null && !scene.nearby.some(row => row.id === actorHandle(ownerId, targetActorId))) return null;
  // No resource text, other actor cognition, raw input or reflection crosses
  // this private fingerprint boundary. Rule/profile bodies are never hints.
  return { ownerId, roomId, materialId, targetActorId, resourceHash: material ? materialHash(material) : null, stage: stageOf(state) };
}
// Durable terminal suppression is by factual opportunity, not fresh snapshot
// hash or phase. A read/withdraw/expiry cannot respawn the same plan forever.
// A genuinely changed resource/procedure is a different source, not renewal.
const planningWindowKey = (blueprint, host) => hash([DIRECTOR_PLANNING_POLICY, blueprint, host]);
function offerFrom(state, sourceCommitRef, blueprint, materialId = null, targetActorId = null) {
  const host = sourceHost(state, blueprint, materialId, targetActorId); if (!host) return null;
  const definition = DIRECTOR_PLAN_BLUEPRINTS[blueprint];
  const source = { commitRef: sourceCommitRef, snapshotHash: directorSnapshotHash(state), blueprintSource: definition.source, host };
  const windowKey = planningWindowKey(blueprint, host);
  const opportunity = { id: `opportunity:${windowKey}`, blueprint, sourceRef: hash([DIRECTOR_PLANNING_POLICY, source, blueprint]),
    roomId: host.roomId, steps: definition.steps.map((kind, index) => ({ kind,
      entityId: kind === 'inspect_existing_scene' ? host.roomId : kind === 'read_existing_material' ? materialId : actorHandle(host.ownerId, targetActorId),
      dependsOn: index === 0 ? null : index - 1 })), description: definition.description };
  return { opportunity, source, windowKey };
}
/** Current implemented facts only. This registry does not accept caller/model
 * blueprints or generic authored patches. New lore needs a new known policy. */
export function directorPlanningOffers(state, sourceCommitRef) {
  if (!planId(sourceCommitRef) || !planInt(state?.worldTime) || !Array.isArray(state.agentActions)) fail();
  const owner = createdPlayerId(state);
  if (state.completed || !runtimeActive(state, owner)) return [];
  const scene = actorPerception(state, owner);
  const materials = scene.readable.slice(0, 3).map(row => row.id);
  const contacts = actorsForState(state).filter(actor => actor.id !== owner && actor.id !== 'warden' && runtimeActive(state, actor.id)
    && scene.nearby.some(row => row.id === actorHandle(owner, actor.id))).slice(0, 2).map(actor => actor.id);
  return [
    ...materials.map(id => offerFrom(state, sourceCommitRef, 'orient_then_read', id)),
    ...contacts.map(id => offerFrom(state, sourceCommitRef, 'orient_then_contact', null, id)),
    ...contacts.slice(0, 1).flatMap(id => materials.slice(0, 2).map(material => offerFrom(state, sourceCommitRef, 'read_then_contact', material, id))),
  ].filter(Boolean).slice(0, DIRECTOR_PLAN_LIMITS.offers);
}
export function directorPlanStatus(plan, state) {
  if (!planActive(plan)) return plan.status;
  if (state.worldTime >= plan.expiresAt || state.agentActions.length >= plan.expiresAfterAction) return 'expired';
  const { host } = plan.source;
  const current = sourceHost(state, plan.opportunity.blueprint, host.materialId, host.targetActorId);
  return current && isDeepStrictEqual(current, host) ? 'active' : 'invalidated';
}
export const directorPlanView = plan => ({ planId: plan.id, opportunity: structuredClone(plan.opportunity),
  nextStep: plan.nextStep, expiresAt: plan.expiresAt, expiresAfterAction: plan.expiresAfterAction });
export function directorPlanningBoundary(state, beforeLastTurn, plans = []) {
  const legacy = directorBoundary(state, beforeLastTurn); if (legacy) return legacy;
  if (plans.some(plan => planActive(plan) && directorPlanStatus(plan, state) !== 'active')) return 'candidate_invalidated';
  if (beforeLastTurn && state.entries.slice(beforeLastTurn.entries.length).some(entry =>
    ['speech', 'writing'].includes(entry.delivery) && ['accept', 'decline', 'close'].includes(entry.communication?.kind)
    && entry.speakerId && entry.addresseeIds?.some(id => entry.audienceIds?.includes(id)))) return 'social_changed';
  if (plans.some(plan => planActive(plan) && state.worldTime >= plan.reviewAt)) return 'candidate_review_due';
  return null;
}
function validatePlanningAction(before, after, action) {
  if (!committedAction(before, after, action) || action.sceneBeatVersion !== 1) fail();
  const replay = sceneBeatsDraft(before, action).draft;
  const eventMetadata = rows => rows.filter(row => row.delivery !== 'narration')
    .map(({ id, text, ...entry }) => entry).sort((a, b) => (a.observationKey || '').localeCompare(b.observationKey || ''));
  const receiptState = value => ({ worldTime: value.worldTime, actions: value.agentActions,
    entries: eventMetadata(value.entries),
    privateEvents: eventMetadata(value.agentAutonomy?.events || []),
    decisions: value.agentAutonomy?.decisions || [],
    rooms: actorsForState(value).map(actor => [actor.id, actorRoom(value, actor.id), runtimeActive(value, actor.id)]),
    completed: value.completed, stage: stageOf(value) });
  // Composition may reorder presentation/add narration and renumber entries;
  // it cannot change the non-narration receipt multiset or causal fields.
  // Replay proves that a matching string/key wasn't fabricated.
  if (!isDeepStrictEqual(receiptState(replay), receiptState(after))) fail();
}
function committedAction(before, after, action) {
  return action?.type === 'scene' && planId(action.jobId) && after.agentActions.length === before.agentActions.length + 1
    && isDeepStrictEqual(after.agentActions.slice(0, -1), before.agentActions) && isDeepStrictEqual(after.agentActions.at(-1), action)
    && after.entries.length >= before.entries.length && isDeepStrictEqual(after.entries.slice(0, before.entries.length), before.entries)
    && after.worldTime >= before.worldTime;
}
/** Detached receipt projection. Persisted publication additionally verifies the
 * immutable world snapshot and sealed job action. Never accepts an event list
 * supplied by the model, a narrative sentence or an unexecuted proposal. */
export function directorPlanReceipt(plan, before, after, action) {
  if (!committedAction(before, after, action) || plan.createdJobId === action.jobId || directorPlanStatus(plan, before) !== 'active') return null;
  const { ownerId, targetActorId } = plan.source.host; const step = plan.opportunity.steps[plan.nextStep];
  const entries = after.entries.slice(before.entries.length).filter(row => Number.isSafeInteger(row.occurredAt)
    && row.occurredAt >= before.worldTime && row.occurredAt < plan.expiresAt && row.occurredAt <= after.worldTime);
  const receipt = (entry, operation, outcome = 'enacted') => ({ actorId: entry.speakerId, operation,
    eventRef: entry.observationKey, at: entry.occurredAt, outcome });
  if (step.kind === 'inspect_existing_scene' && action.intent.type === 'look' && after.worldTime >= before.worldTime + 5) {
    const entry = entries.find(row => row.delivery === 'action' && row.speakerId === ownerId
      && row.audienceIds?.includes(ownerId) && row.observationKey === `gesture:${action.jobId}`);
    if (entry && before.worldTime + 5 < plan.expiresAt) return { ...receipt(entry, 'look'), at: before.worldTime + 5 };
  }
  if (step.kind === 'read_existing_material' && action.intent.type === 'read' && action.intent.subjectId === step.entityId) {
    const entry = entries.find(row => row.delivery === 'reading' && row.speakerId === ownerId
      && row.audienceIds?.includes(ownerId) && row.observationKey === `read:${action.jobId}:${ownerId}`);
    if (entry) return receipt(entry, 'read');
  }
  if (step.kind === 'existing_social_contact') {
    const entry = entries.find(row => ['speech', 'writing'].includes(row.delivery) && row.audienceIds?.includes(ownerId)
      && row.audienceIds?.includes(targetActorId) && (row.speakerId === ownerId && row.addresseeIds?.includes(targetActorId)
        && action.intent.type === 'conversation' && action.intent.targetId === targetActorId && row.observationKey === action.questionKey
        || row.speakerId === targetActorId && row.addresseeIds?.includes(ownerId)
        && (after.agentAutonomy?.decisions || []).some(decision => decision.sceneRevision === after.revision && decision.actorId === targetActorId
          && decision.accepted && decision.operation && ['speak', 'write', 'wait'].includes(decision.operation.type)
          && [1, 2, 3].some(beat => row.observationKey === `npc:${action.jobId}:beat:${beat}:${targetActorId}`))));
    if (entry) return receipt(entry, entry.delivery === 'writing' ? 'write' : 'speak',
      ['decline', 'close'].includes(entry.communication?.kind) ? 'declined' : 'enacted');
  }
  return null;
}
/** HOST-only scheduler adapter. The scheduler still performs its normal
 * eligibility, mandatory-reaction, fairness and same-call-budget checks. */
export function directorPlanningInterest(plans, state, { output, appliedActorIds = [] } = {}) {
  return [...new Set(plans.filter(plan => directorPlanStatus(plan, state) === 'active' && !plan.rankingUsed
    && plan.opportunity.steps[plan.nextStep]?.kind === 'existing_social_contact' && plan.source.host.targetActorId
    && !appliedActorIds.includes(plan.source.host.targetActorId)
    && !(output?.operation === 'withdraw' && output.planId === plan.id && output.sourceRef === plan.opportunity.sourceRef))
    .map(plan => plan.source.host.targetActorId))].slice(0, DIRECTOR_PLAN_LIMITS.plans);
}
/** Optional per-actor view; NOT a wake request, observation, memory or evidence.
 * Re-derive the entity from THAT actor's current perception. Never copy a
 * player handle, a plan id, private host reason, material content or source. */
export function directorPlanningHints(plans, state, actorId, { selectedActorIds = [] } = {}) {
  if (!selectedActorIds.includes(actorId) || !actorsForState(state).some(actor => actor.id === actorId && runtimeActive(state, actor.id))) return [];
  const scene = actorPerception(state, actorId); const hints = [];
  for (const plan of plans) {
    if (directorPlanStatus(plan, state) !== 'active' || plan.opportunity.roomId !== scene.roomId) continue;
    const step = plan.opportunity.steps[plan.nextStep]; const host = plan.source.host;
    if (step.kind === 'read_existing_material' && actorId === host.ownerId && scene.readable.some(row => row.id === step.entityId))
      hints.push({ kind: 'read_existing_material', entityId: step.entityId, optional: true });
    else if (step.kind === 'inspect_existing_scene' && actorId === host.ownerId)
      hints.push({ kind: 'inspect_existing_scene', entityId: scene.roomId, optional: true });
    else if (step.kind === 'existing_social_contact' && [host.ownerId, host.targetActorId].includes(actorId)) {
      const other = actorId === host.ownerId ? host.targetActorId : host.ownerId;
      const perceived = scene.nearby.find(row => row.id === actorHandle(actorId, other));
      if (perceived) hints.push({ kind: 'existing_social_contact', entityId: perceived.id, optional: true });
    }
  }
  return hints.slice(0, DIRECTOR_PLAN_LIMITS.plans);
}

function validatePlanningPin(value) {
  planExact(value, ['extension', 'sourceCommitRef', 'snapshotHash', 'scope', 'provenance', 'boundary', 'plans', 'opportunities']);
  planExact(value.provenance, ['version', 'executionCommitRef', 'previousTurnCommitRef']);
  if (value.provenance.version !== 1 || !planId(value.provenance.executionCommitRef)
    || value.provenance.previousTurnCommitRef !== null && !planId(value.provenance.previousTurnCommitRef)) fail();
  planExact(value.extension, ['id', 'mode']);
  if (!isDeepStrictEqual(value.extension, DIRECTOR_PLANNING_EXTENSION) || !planId(value.sourceCommitRef) || !planDigest(value.snapshotHash)) fail();
  planExact(value.scope, ['actorId', 'branchId', 'generation', 'revision']);
  if (value.scope.actorId !== DIRECTOR_PRINCIPAL || !planId(value.scope.branchId) || !planInt(value.scope.generation)
    || value.scope.generation < 1 || !planInt(value.scope.revision)) fail();
  planArray(value.plans, DIRECTOR_PLAN_LIMITS.plans); planArray(value.opportunities, DIRECTOR_PLAN_LIMITS.offers);
  return value;
}
/** Called by the immutable job validator as well as by publication. It never
 * defaults a missing/old pin to the new policy. */
export function validateDirectorPlanningPin(pin) {
  validatePlanningPin(pin);
  const packet = { role: 'director', scope: pin.scope, data: { version: 3, extension: pin.extension, snapshotHash: pin.snapshotHash,
    boundary: pin.boundary || 'major_completed', opportunities: pin.opportunities.map(row => {
      planExact(row, ['opportunity', 'source', 'windowKey']);
      planExact(row.source, ['commitRef', 'snapshotHash', 'blueprintSource', 'host']);
      planExact(row.source.host, ['ownerId', 'roomId', 'materialId', 'targetActorId', 'resourceHash', 'stage']);
      if (row.source.commitRef !== pin.sourceCommitRef || row.source.snapshotHash !== pin.snapshotHash || !planDigest(row.windowKey)) fail();
      return row.opportunity;
    }), activePlans: pin.plans.map(plan => {
      planExact(plan, ['policy', 'id', 'windowKey', 'opportunity', 'source', 'createdJobId', 'createdAt', 'expiresAt',
        'expiresAfterAction', 'nextStep', 'status', 'reviewAt', 'rankingUsed', 'receipts']);
      if (plan.policy !== DIRECTOR_PLANNING_POLICY || plan.status !== 'active') fail();
      return directorPlanView(plan);
    }) } };
  if (pin.boundary !== null && !['player_started_phase', 'major_completed', 'social_changed', 'candidate_invalidated', 'candidate_review_due'].includes(pin.boundary)) fail();
  buildDirectorContext(packet);
  if (Buffer.byteLength(JSON.stringify(pin)) > 32000) fail();
  return structuredClone(pin);
}
function planningPacket(pin, state) {
  validatePlanningPin(pin);
  if (!pin.boundary) return null;
  return buildDirectorContext({ role: 'director', scope: pin.scope, data: { version: 3, extension: DIRECTOR_PLANNING_EXTENSION,
    snapshotHash: pin.snapshotHash, boundary: pin.boundary, opportunities: pin.opportunities.map(row => row.opportunity),
    activePlans: pin.plans.filter(plan => directorPlanStatus(plan, state) === 'active').map(directorPlanView) } });
}
/** Save/load/rewind use the requested narrative ancestry; no latest-branch or
 * previous_execution lookup. This sidecar seals ONE batch per world commit,
 * including an empty/no_change batch, so repeat publication cannot append a
 * different history to an already acknowledged checkpoint. */
export class DirectorPlanningStore {
  #db;
  #baselineMagic;
  constructor(db, { baselineMagic } = {}) { this.#db = db; this.#baselineMagic = baselineMagic; }
  initialize() {
    if (!this.#db.isTransaction) fail();
    this.#db.exec(`CREATE TABLE IF NOT EXISTS director_plan_batches_v3(
      commit_ref TEXT PRIMARY KEY REFERENCES domain_commits(commit_ref), parent_commit_ref TEXT REFERENCES domain_commits(commit_ref),
      job_id TEXT REFERENCES agent_turn_jobs(job_id), input_hash TEXT NOT NULL CHECK(length(input_hash)=64),
      event_count INTEGER NOT NULL CHECK(event_count BETWEEN 0 AND 3), payload_hash TEXT NOT NULL CHECK(length(payload_hash)=64),
      policy TEXT NOT NULL CHECK(policy='source-opportunity-plan@1'));
      CREATE TABLE IF NOT EXISTS director_plan_events_v3(
      commit_ref TEXT NOT NULL REFERENCES director_plan_batches_v3(commit_ref), ordinal INTEGER NOT NULL CHECK(ordinal BETWEEN 0 AND 2),
      plan_id TEXT NOT NULL CHECK(length(plan_id)=64), kind TEXT NOT NULL CHECK(kind IN
        ('planned','advanced','completed','withdrawn','expired','invalidated','declined','revalidated','ranking_used')),
      payload_json TEXT NOT NULL, payload_hash TEXT NOT NULL CHECK(length(payload_hash)=64), PRIMARY KEY(commit_ref,ordinal));`);
    for (const name of ['director_plan_batches_v3', 'director_plan_events_v3']) {
      this.#db.exec(`CREATE TRIGGER IF NOT EXISTS ${name}_no_update BEFORE UPDATE ON ${name}
        BEGIN SELECT RAISE(ABORT,'immutable director planning'); END;
        CREATE TRIGGER IF NOT EXISTS ${name}_no_delete BEFORE DELETE ON ${name}
        BEGIN SELECT RAISE(ABORT,'immutable director planning'); END;`);
    }
    this.#db.exec(`CREATE TRIGGER IF NOT EXISTS director_plan_batches_v3_no_replace BEFORE INSERT ON director_plan_batches_v3
      WHEN EXISTS(SELECT 1 FROM director_plan_batches_v3 WHERE commit_ref=NEW.commit_ref)
      BEGIN SELECT RAISE(ABORT,'immutable director planning'); END;
      CREATE TRIGGER IF NOT EXISTS director_plan_events_v3_append BEFORE INSERT ON director_plan_events_v3
      WHEN NEW.ordinal<>(SELECT count(*) FROM director_plan_events_v3 WHERE commit_ref=NEW.commit_ref)
        OR NEW.ordinal>=(SELECT event_count FROM director_plan_batches_v3 WHERE commit_ref=NEW.commit_ref)
        OR EXISTS(SELECT 1 FROM director_plan_events_v3 WHERE commit_ref=NEW.commit_ref AND plan_id=NEW.plan_id)
      BEGIN SELECT RAISE(ABORT,'invalid director planning append'); END;`);
    initializeDirectorLifecycle(this.#db);
  }
  eventJobPin(scope, jobId) { return captureDirectorLifecycleJob(this.#db, scope, jobId); }
  #commit(ref) {
    const commit = this.#db.prepare('SELECT * FROM domain_commits WHERE commit_ref=?').get(ref);
    if (!commit || createHash('sha256').update(commit.snapshot_json).digest('hex') !== commit.snapshot_hash) fail();
    let state; try { state = JSON.parse(commit.snapshot_json); } catch { fail(); }
    return { commit, state };
  }
  #history(ref) {
    this.#commit(ref);
    const rows = this.#db.prepare(`WITH RECURSIVE history(commit_ref,parent_commit_ref,depth) AS (
      SELECT commit_ref,parent_commit_ref,0 FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref,h.depth+1 FROM domain_commits c JOIN history h ON c.commit_ref=h.parent_commit_ref
      WHERE h.depth<8191) SELECT * FROM history ORDER BY depth DESC`).all(ref);
    if (rows[0]?.parent_commit_ref !== null) fail();
    return rows;
  }
  #readAll(ref) {
    const history = this.#history(ref); const latest = new Map(); const checkpoints = new Map();
    const resolve = key => { const value = checkpoints.get(key); if (!value) fail(); return value; };
    let parent = null; let eventPlan = null;
    for (const entry of history) {
      const current = this.#commit(entry.commit_ref);
      const all = [...latest.values()].sort((a, b) => a.id.localeCompare(b.id));
      const jobId = this.#actionJob(current.commit, current.state, parent);
      eventPlan = settleDirectorLifecycleCommit(this.#db, current, parent, eventPlan, jobId);
      const expected = this.#transition(current.commit, current.state, parent, all, jobId, resolve);
      const batch = this.#db.prepare('SELECT * FROM director_plan_batches_v3 WHERE commit_ref=?').get(entry.commit_ref);
      if (Boolean(batch) !== expected.required) fail();
      if (batch) this.#assertBatch(batch, current.commit, jobId, expected.events);
      for (const { plan } of expected.events) latest.set(plan.id, plan);
      checkpoints.set(entry.commit_ref, { all: [...latest.values()].sort((a, b) => a.id.localeCompare(b.id)), events: expected.events });
      parent = current;
    }
    return structuredClone([...latest.values()].sort((a, b) => a.id.localeCompare(b.id)));
  }
  #actionJob(commit, state, parent) {
    const action = state.agentActions.at(-1);
    return commit.kind === 'act' && parent && state.agentActions.length !== parent.state.agentActions.length
      && action?.type === 'scene' ? action.jobId : null;
  }
  #inputHash(commit, jobId) {
    return hash([DIRECTOR_PLANNING_POLICY, commit.commit_ref, commit.parent_commit_ref, commit.snapshot_hash, jobId]);
  }
  #assertBatch(batch, commit, jobId, events) {
    const rows = this.#db.prepare('SELECT * FROM director_plan_events_v3 WHERE commit_ref=? ORDER BY ordinal').all(commit.commit_ref);
    if (batch.policy !== DIRECTOR_PLANNING_POLICY || batch.parent_commit_ref !== commit.parent_commit_ref
      || batch.job_id !== jobId || batch.input_hash !== this.#inputHash(commit, jobId)
      || batch.event_count !== events.length || rows.length !== events.length
      || batch.payload_hash !== hash(events.map(({ plan, kind }) => [plan.id, kind, hash(plan)]))) fail();
    for (const [ordinal, { plan, kind }] of events.entries()) {
      const row = rows[ordinal]; let payload;
      try { payload = JSON.parse(row.payload_json); } catch { fail(); }
      if (row.ordinal !== ordinal || row.plan_id !== plan.id || row.kind !== kind || row.payload_hash !== hash(plan)
        || hash(payload) !== row.payload_hash || !isDeepStrictEqual(payload, plan)) fail();
    }
  }
  #sourceEvidence(sourceCommitRef) {
    const history = this.#history(sourceCommitRef);
    for (let index = history.length - 1; index > 0; index--) {
      const current = this.#commit(history[index].commit_ref); const prior = this.#commit(history[index - 1].commit_ref);
      if (current.commit.kind === 'act' && current.state.agentActions.length > prior.state.agentActions.length)
        return { previousTurnCommitRef: prior.commit.commit_ref, beforeLastTurn: prior.state };
    }
    return { previousTurnCommitRef: null, beforeLastTurn: null };
  }
  #boundary(state, evidence, checkpoint) {
    return directorPlanningBoundary(state, evidence.beforeLastTurn, checkpoint.all.filter(planActive))
      || (checkpoint.events.some(({ kind }) => ['invalidated', 'expired', 'declined'].includes(kind)) ? 'candidate_invalidated'
        : checkpoint.events.some(({ kind }) => kind === 'completed') ? 'major_completed' : null);
  }
  read(commitRef) {
    const plans = this.#readAll(commitRef).filter(planActive);
    if (plans.length > DIRECTOR_PLAN_LIMITS.plans) fail();
    return structuredClone(plans);
  }
  /** scope is the job execution fence; sourceCommitRef is its actual knowledge
   * checkpoint (which can differ on regeneration). Private pin lives in plan,
   * not in scene-composer / character packets or action narrative. */
  capture({ extension, sourceCommitRef, state, scope, beforeLastTurn = null }) {
    if (!isDeepStrictEqual(extension, DIRECTOR_PLANNING_EXTENSION)) fail();
    const source = this.#commit(sourceCommitRef);
    if (!isDeepStrictEqual(source.state, state)) fail();
    const all = this.#readAll(sourceCommitRef); const plans = all.filter(planActive);
    if (plans.length > DIRECTOR_PLAN_LIMITS.plans) fail();
    const used = new Set(all.map(plan => plan.windowKey));
    const evidence = this.#sourceEvidence(sourceCommitRef);
    if (beforeLastTurn !== null && !isDeepStrictEqual(beforeLastTurn, evidence.beforeLastTurn)) fail();
    const executions = this.#db.prepare('SELECT commit_ref FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
      .all(scope.branchId, scope.generation, scope.revision);
    if (executions.length !== 1 || !this.#history(executions[0].commit_ref).some(row => row.commit_ref === sourceCommitRef)) fail();
    const events = this.#db.prepare('SELECT kind FROM director_plan_events_v3 WHERE commit_ref=?').all(sourceCommitRef);
    const boundary = this.#boundary(state, evidence, { all, events });
    const pin = { extension: DIRECTOR_PLANNING_EXTENSION, sourceCommitRef, snapshotHash: directorSnapshotHash(state),
      scope: { actorId: DIRECTOR_PRINCIPAL, branchId: scope.branchId, generation: scope.generation, revision: scope.revision },
      provenance: { version: 1, executionCommitRef: executions[0].commit_ref, previousTurnCommitRef: evidence.previousTurnCommitRef },
      boundary, plans,
      opportunities: directorPlanningOffers(state, sourceCommitRef).filter(row => !used.has(row.windowKey)) };
    validateDirectorPlanningPin(pin); planningPacket(pin, state); return structuredClone(pin);
  }
  packet(pin) {
    const { state } = this.#commit(pin.sourceCommitRef); this.#validatePinSource(pin, state);
    return planningPacket(pin, state);
  }
  #validatePinSource(pin, state, resolve) {
    validateDirectorPlanningPin(pin);
    const execution = this.#commit(pin.provenance.executionCommitRef).commit;
    if (!isDeepStrictEqual(pin.scope, { actorId: DIRECTOR_PRINCIPAL, branchId: execution.branch_id,
      generation: execution.generation, revision: execution.revision })
      || !this.#history(execution.commit_ref).some(row => row.commit_ref === pin.sourceCommitRef)) fail();
    const all = resolve ? resolve(pin.sourceCommitRef).all : this.#readAll(pin.sourceCommitRef);
    const events = resolve ? resolve(pin.sourceCommitRef).events
      : this.#db.prepare('SELECT kind FROM director_plan_events_v3 WHERE commit_ref=?').all(pin.sourceCommitRef);
    const evidence = this.#sourceEvidence(pin.sourceCommitRef);
    if (pin.provenance.previousTurnCommitRef !== evidence.previousTurnCommitRef
      || pin.boundary !== this.#boundary(state, evidence, { all, events })
      || pin.snapshotHash !== directorSnapshotHash(state) || !isDeepStrictEqual(pin.plans, all.filter(planActive))) fail();
    const used = new Set(all.map(plan => plan.windowKey));
    if (!isDeepStrictEqual(pin.opportunities, directorPlanningOffers(state, pin.sourceCommitRef).filter(row => !used.has(row.windowKey)))) fail();
  }
  #assertAcceptedScene(row, job, before, action) {
    // Domain snapshots supply the accepted action; when the durable stage
    // repository is installed, also bind it to the sealed task/prefix chain.
    // The isolated core harness has no AgentTurnStore stage repository.
    if (!this.#db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='agent_turn_stages'").get()) return;
    const decode = (json, digest) => {
      if (typeof json !== 'string' || createHash('sha256').update(json).digest('hex') !== digest) fail();
      try { return JSON.parse(json); } catch { fail(); }
    };
    const tasks = this.#db.prepare('SELECT * FROM agent_turn_tasks WHERE job_id=? ORDER BY rowid').all(row.job_id)
      .map(task => {
        const input = decode(task.input_json, task.input_hash);
        if (input.id !== task.slot || input.role !== task.role || input.actorId !== task.actor_id) fail();
        return { ...input, ...(task.result_json === null ? {} : { result: decode(task.result_json, task.result_hash) }) };
      });
    const performance = tasks.find(task => task.id === 'performance');
    if (!performance || !isDeepStrictEqual(performance.result, action.performance)) fail();
    const stages = this.#db.prepare('SELECT * FROM agent_turn_stages WHERE job_id=? ORDER BY stage').all(row.job_id);
    if (tasks.length > 20 || stages.length !== action.beats.length + 1) fail();
    if (row.text !== undefined && row.text !== action.rawInput || job.questionKey !== undefined && job.questionKey !== action.questionKey
      || job.answerKey !== undefined && job.answerKey !== action.answerKey) fail();
    const base = job.regeneration?.checkpoint || before;
    const sources = this.#db.prepare('SELECT commit_ref FROM domain_commits WHERE generation=? AND revision=?').all(base.generation, base.revision);
    if (sources.length !== 1 || !isDeepStrictEqual(this.#commit(sources[0].commit_ref).state, base)) fail();
    const { beats, document, schedulingBeats, schedulingEnd, ...root } = action;
    const sceneBase = job.npcMagicCastVersion === 1 ? structuredClone(base) : base;
    const domainStore = sceneBase === base ? undefined : new DomainStore(this.#db);
    if (domainStore && !attachNpcMagicProjection(sceneBase, job, domainStore, new MagicRepository(this.#db)) && !sceneBase.magic) {
      const baseline = this.#baselineMagic?.(base);
      if (baseline) sceneBase.magic = baseline;
    }
    const stageClock = stage => {
      const saved = stages[stage]; if (!saved) fail();
      const version = decode(saved.receipt_json, saved.receipt_hash).conversationEventClockVersion;
      if (version !== undefined && version !== 1) fail();
      return version;
    };
    let prefix = beginCausalScene(sceneBase, { ...root, beats: [], ...(action.schedulingVersion === 1 ? { schedulingBeats: [] } : {}) },
      { conversationEventClockVersion: stageClock(0) });
    if (prefix.phase !== 'reaction') prefix = settlePlayerBoundary(prefix);
    let previousHash = null;
    const check = (stage, input) => {
      const saved = stages[stage]; const receipt = decode(saved.receipt_json, saved.receipt_hash);
      if (saved.stage !== stage || saved.branch_id !== row.branch_id || saved.generation !== row.generation
        || saved.base_revision !== row.base_revision || saved.base_commit_ref !== sources[0].commit_ref
        || saved.previous_hash !== previousHash || receipt.previousHash !== previousHash || receipt.stage !== stage
        || receipt.kind !== (stage === 0 ? 'root' : 'beat') || receipt.baseCommitRef !== sources[0].commit_ref
        || receipt.inputHash !== hash(input) || receipt.stateHash !== hash(prefix)
        || !isDeepStrictEqual(receipt.executionRevision, job.executionRevision) || receipt.contentFingerprint !== job.contentFingerprint) fail();
      previousHash = saved.receipt_hash;
    };
    check(0, { intent: action.intent, performance: action.performance, ballots: action.ballots || null });
    for (const [index, beat] of beats.entries()) {
      const own = tasks.filter(task => task.id.startsWith(`npc:${beat.beat}:`));
      if (!isDeepStrictEqual(own.map(task => ({ actorId: task.actorId, proposal: task.result })), beat.decisions)
        || own.some(task => task.sceneFrame?.beat !== beat.beat || task.sceneFrame.worldTime !== prefix.draft.worldTime
          || task.sceneFrame.prefixHash !== previousHash || !isDeepStrictEqual(task.scheduling, schedulingBeats?.[index]))) fail();
      prefix = applyCausalNpcBeat(prefix, beat, schedulingBeats?.[index], {
        ...(domainStore ? { domainStore, magicSourceState: base } : {}), conversationEventClockVersion: stageClock(beat.beat),
      });
      if (beat.phase === 'reaction' && prefix.phase !== 'reaction') prefix = settlePlayerBoundary(prefix);
      check(beat.beat, { tasks: own, input: beat });
    }
  }
  #savedOutput(jobId, pin, state) {
    const task = this.#db.prepare("SELECT * FROM agent_turn_tasks WHERE job_id=? AND slot='director'").get(jobId);
    if (!task) { if (pin.boundary) fail(); return undefined; }
    if (!pin.boundary || task.role !== 'director' || task.actor_id !== DIRECTOR_PRINCIPAL
      || createHash('sha256').update(task.input_json).digest('hex') !== task.input_hash) fail();
    let input; try { input = JSON.parse(task.input_json); } catch { fail(); }
    const packet = planningPacket(pin, state);
    if (input.id !== 'director' || input.role !== 'director' || input.actorId !== DIRECTOR_PRINCIPAL
      || !isDeepStrictEqual(input.context, packet)) fail();
    if (task.result_json === null) {
      if (!this.#db.prepare('SELECT 1 FROM agent_turn_optional_terminals WHERE job_id=? AND slot=?').get(jobId, 'director')) fail();
      return undefined;
    }
    if (createHash('sha256').update(task.result_json).digest('hex') !== task.result_hash) fail();
    return validateDirectorOutput(packet, JSON.parse(task.result_json), pin.scope);
  }
  /** Invoke after canonical world validation on the SAME open transaction.
   * The job's directorPlanning pin and saved optional result are read, not
   * accepted as caller-supplied replacements. Non-scene commits only cancel /
   * expire existing plans; they never generate offers or adopt past events. */
  publish(scope, state, options = {}) {
    if (!this.#db.isTransaction) fail();
    const sqlScope = openSqliteScope(this.#db, 'director_planning_publish');
    try {
      const result = this.#publish(scope, state, options);
      sqlScope.release(); return result;
    } catch (error) {
      sqlScope.rollback(); throw error;
    }
  }
  #publish(scope, state, { jobId = null } = {}) {
    const { commit, state: committed } = this.#commit(scope.commitRef);
    if (commit.branch_id !== scope.branchId || commit.generation !== scope.generation || commit.revision !== scope.revision
      || !isDeepStrictEqual(committed, state)) fail();
    const parentRef = commit.parent_commit_ref; const parent = parentRef ? this.#commit(parentRef) : null;
    if (jobId !== this.#actionJob(commit, state, parent)) fail();
    const prior = this.#db.prepare('SELECT * FROM director_plan_batches_v3 WHERE commit_ref=?').get(scope.commitRef);
    if (prior) return this.read(scope.commitRef);
    if (this.#db.prepare('SELECT commit_ref FROM domain_head WHERE id=1').get()?.commit_ref !== scope.commitRef) fail();
    const all = parentRef ? this.#readAll(parentRef) : [];
    const resolve = ref => ({ all: this.#readAll(ref),
      events: this.#db.prepare('SELECT kind FROM director_plan_events_v3 WHERE commit_ref=?').all(ref) });
    const expected = this.#transition(commit, state, parent, all, jobId, resolve, true);
    settleDirectorLifecycleCommit(this.#db, { commit, state }, parent, undefined, jobId, { publishing: true });
    if (!expected.required) return [];
    const rows = expected.events;
    this.#db.prepare('INSERT INTO director_plan_batches_v3 VALUES(?,?,?,?,?,?,?)').run(scope.commitRef, parentRef,
      jobId, this.#inputHash(commit, jobId), rows.length, hash(rows.map(({ plan, kind }) => [plan.id, kind, hash(plan)])), DIRECTOR_PLANNING_POLICY);
    for (const [ordinal, { plan, kind }] of rows.entries()) this.#db.prepare('INSERT INTO director_plan_events_v3 VALUES(?,?,?,?,?,?)')
      .run(scope.commitRef, ordinal, plan.id, kind, JSON.stringify(plan), hash(plan));
    return this.read(scope.commitRef);
  }
  /** A single canonical transition oracle for writes, reads and saved retries.
   * Sidecar rows are compared with its entire output, never used as evidence. */
  #transition(commit, state, parent, all, jobId, resolve, publishing = false) {
    const parentRef = commit.parent_commit_ref; const inherited = all.filter(planActive); const events = [];
    let pin; let output; let action; let packetState; let rankingActors = [];
    if (jobId !== null) {
      if (commit.kind !== 'act') fail();
      const row = this.#db.prepare('SELECT * FROM agent_turn_jobs WHERE job_id=?').get(jobId);
      if (!row || !(publishing ? row.status === 'running' : ['running', 'committed'].includes(row.status))
        || createHash('sha256').update(row.context_json).digest('hex') !== row.context_hash) fail();
      const job = JSON.parse(row.context_json);
      if (job.directorExtension !== undefined && !isDirectorExtension(job.directorExtension)) fail();
      if (!isDeepStrictEqual(job.directorExtension, DIRECTOR_PLANNING_EXTENSION) && job.directorPlanning !== undefined) fail();
      // An old pending job must stay old, even if the caller now supports v3.
      if (isDeepStrictEqual(job.directorExtension, DIRECTOR_PLANNING_EXTENSION)) {
        if (job.version !== 6) fail();
        pin = job.directorPlanning; validatePlanningPin(pin);
        if (!isDeepStrictEqual(pin.scope, { actorId: DIRECTOR_PRINCIPAL, branchId: row.branch_id, generation: row.generation, revision: row.base_revision })) fail();
        packetState = this.#commit(pin.sourceCommitRef).state;
        if (!this.#history(parentRef).some(entry => entry.commit_ref === pin.sourceCommitRef)) fail();
        this.#validatePinSource(pin, packetState, resolve);
        const execution = this.#commit(pin.provenance.executionCommitRef).commit;
        if (parentRef !== execution.commit_ref && (parent.commit.kind !== 'rewind'
          || parent.commit.previous_execution_ref !== execution.commit_ref || parentRef === pin.sourceCommitRef)) fail();
        if (job.directorBoundary !== undefined && job.directorBoundary !== pin.boundary
          || job.directorSnapshotHash !== undefined && job.directorSnapshotHash !== pin.snapshotHash) fail();
        if (!isDeepStrictEqual(inherited, pin.plans)) fail();
        // Restoration may change only the execution envelope/avatar. The
        // source snapshot is still the exact original planning checkpoint.
        const envelope = value => {
          const { generation, revision, restoredFrom, playerAvatarId, ...body } = value; return body;
        };
        if (!isDeepStrictEqual(envelope(parent.state), envelope(packetState))) fail();
        output = this.#savedOutput(jobId, pin, packetState);
      }
      action = state.agentActions.at(-1);
      if (!parent || action?.jobId !== jobId || !committedAction(parent.state, state, action)) fail();
      if (pin || inherited.length) {
        validatePlanningAction(parent.state, state, action);
        this.#assertAcceptedScene(row, job, parent.state, action);
      }
      const rankingUses = (action.schedulingBeats || []).flatMap(frame => frame.advisory?.appliedActorIds || []);
      rankingActors = [...new Set(rankingUses)];
      const permitted = pin ? directorPlanningInterest(pin.plans, parent.state, { output }) : [];
      if (rankingUses.length > DIRECTOR_PLAN_LIMITS.ranking || rankingActors.some(id => !permitted.includes(id))) {
        // v2 ranking belongs to its own unchanged repository.
        if (pin) fail(); else rankingActors = [];
      }
      if (pin && rankingActors.length) {
        let prefix = beginCausalScene(parent.state, action);
        if (prefix.phase !== 'reaction') prefix = settlePlayerBoundary(prefix);
        for (let i = 0; i < action.beats.length; i++) {
          const beat = action.beats[i]; const frame = action.schedulingBeats[i];
          validateSceneScheduling(prefix, frame, beat.decisions.map(row => row.actorId));
          if (frame.advisory?.appliedActorIds?.length && (i !== 0 || beat.phase === 'reaction'
            || frame.advisory.appliedActorIds.some(id => !directorPlanningInterest(pin.plans, prefix.draft, { output }).includes(id)))) fail();
          prefix = applyCausalNpcBeat(prefix, beat, frame);
        }
      }
    }
    for (const old of inherited) {
      let plan = structuredClone(old); let kind;
      const status = directorPlanStatus(plan, state);
      if (output?.operation === 'withdraw' && output.planId === plan.id && output.sourceRef === plan.opportunity.sourceRef) {
        plan.status = 'withdrawn'; kind = 'withdrawn';
      } else if (status !== 'active') { plan.status = status; kind = status; }
      else {
        const receipt = action ? directorPlanReceipt(plan, parent.state, state, action) : null;
        if (receipt) {
          plan.receipts.push({ commitRef: commit.commit_ref, ...receipt });
          if (receipt.outcome === 'declined') { plan.status = 'declined'; kind = 'declined'; }
          else { plan.nextStep += 1; plan.status = plan.nextStep === plan.opportunity.steps.length ? 'completed' : 'active'; kind = plan.status === 'completed' ? 'completed' : 'advanced'; }
        }
        if (!plan.rankingUsed && rankingActors.includes(plan.source.host.targetActorId)) { plan.rankingUsed = true; kind ||= 'ranking_used'; }
        if (pin?.boundary) { plan.reviewAt = Math.min(state.worldTime + 600, plan.expiresAt); kind ||= 'revalidated'; }
      }
      if (kind) events.push({ plan, kind });
    }
    if (output?.operation === 'plan') {
      const offer = pin.opportunities.find(row => row.opportunity.id === output.opportunityId && row.opportunity.sourceRef === output.sourceRef);
      if (!offer) fail();
      const active = inherited.map(plan => events.find(row => row.plan.id === plan.id)?.plan || plan).filter(planActive);
      const used = new Set(all.map(plan => plan.windowKey));
      if (active.length < DIRECTOR_PLAN_LIMITS.plans && !used.has(offer.windowKey)) {
        const plan = { policy: DIRECTOR_PLANNING_POLICY, id: hash([DIRECTOR_PLANNING_POLICY, jobId, offer.opportunity.sourceRef]),
          windowKey: offer.windowKey, opportunity: offer.opportunity, source: offer.source, createdJobId: jobId,
          createdAt: packetState.worldTime, expiresAt: packetState.worldTime + DIRECTOR_PLAN_LIMITS.seconds,
          expiresAfterAction: packetState.agentActions.length + DIRECTOR_PLAN_LIMITS.actions, nextStep: 0, status: 'active',
          reviewAt: Math.min(state.worldTime + 600, packetState.worldTime + DIRECTOR_PLAN_LIMITS.seconds), rankingUsed: false, receipts: [] };
        const status = directorPlanStatus(plan, state); if (status !== 'active') plan.status = status;
        events.push({ plan, kind: status === 'active' ? 'planned' : status });
      }
    }
    // Empty batches matter while plans are live; absence after a terminal is
    // not a license to replay its factual source as a new plan.
    const required = Boolean(pin || inherited.length);
    if (events.length > DIRECTOR_PLAN_LIMITS.plans) fail();
    return { required, events };
  }
}
