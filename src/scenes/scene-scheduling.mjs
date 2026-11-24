import { isPrivateSupplyObservationId } from '../cognition/private-supply-observation.mjs';
import { usesOrdinaryAdmission32 } from '../director/director-event-runtime.mjs';
import { INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, hasIntentRuntime } from '../content/relationship-context-policy.mjs';
import { isDeepStrictEqual } from 'node:util';
import { runtimeCapabilityId } from '../content/runtime-capabilities.mjs';
import { isProxy } from 'node:util/types';
import { actorsForState, createdPlayerId } from '../creation/player-setup.mjs';
import { actorRoom } from '../characters/actor-perception.mjs';
import { pendingReactionActors, pendingSocialRequests, pendingAssemblyDeparture, receivedEnactmentCount, NPC_REJECTION_REASONS } from '../agents/agent-autonomy.mjs';
import { runtimeActive, runtimePendingItemRecipients } from '../case-runtime.mjs';
import { activeProcedure } from '../cases/case-procedure.mjs';
import { runtimeRevisionForState } from '../content/content-revisions.mjs';
import { SCENE_BUDGET } from './scene-document.mjs';

export const SCHEDULING_HISTORY_LIMIT = 24;
export const SCHEDULING_ROW_LIMIT = 16;
export const SCHEDULING_RECORD_BYTES = 12 * 1024;
export const SCHEDULING_SELECTION_REASONS = Object.freeze(['reaction', 'direct_target', 'request_due', 'runtime_pending',
  'broadcast_received', 'new_perception', 'goal_review_due', 'public_clock', 'local_trigger', 'review_resumed', 'prior_reply']);
export const SCHEDULING_BLOCK_REASONS = Object.freeze(['inactive', 'procedure_blocked', 'not_reaction', 'no_trigger',
  'review_cooldown', 'rotation_limit', 'no_continuation', 'per_actor_budget', 'scene_actor_budget', 'decision_budget',
  'beat_budget', 'execution_budget', 'public_event_budget', 'scene_stop', 'ballot']);
const fail = () => { throw Object.assign(new Error('宿主调度记录与场景前缀或预算不一致。'), { code: 'INVALID_AGENT_STATE' }); };
const exact = (value, keys) => value && typeof value === 'object' && !isProxy(value)
  && Object.getPrototypeOf(value) === Object.prototype && Reflect.ownKeys(value).length === keys.length
  && keys.every(key => { const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable && Object.hasOwn(descriptor, 'value'); });
const list = (value, maximum) => Array.isArray(value) && !isProxy(value) && Object.getPrototypeOf(value) === Array.prototype
  && value.length <= maximum && Reflect.ownKeys(value).length === value.length + 1
  && Array.from({ length: value.length }, (_, index) => Object.getOwnPropertyDescriptor(value, String(index)))
    .every(descriptor => descriptor?.enumerable && Object.hasOwn(descriptor, 'value'));
const enumList = (value, choices) => list(value, choices.length) && new Set(value).size === value.length
  && value.every(item => choices.includes(item));
const rosterFor = state => actorsForState(state).filter(actor => ![createdPlayerId(state), 'warden'].includes(actor.id));
function policy(prefix) {
  const runtime = runtimeRevisionForState(prefix.draft);
  if (!['agent-prison-runtime@2', 'agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(runtime.id))
    || runtime.policy.sceneBeatVersion !== 1) fail();
  return runtime.policy.sceneBudget;
}
function usage(prefix) {
  const calls = prefix.beats.flatMap(beat => beat.decisions);
  const counts = new Map();
  for (const { actorId } of calls) counts.set(actorId, (counts.get(actorId) || 0) + 1);
  return { counts, actors: new Set(counts.keys()), used: { beats: prefix.beats.length,
    decisions: calls.length, actors: counts.size } };
}
function gateFor(prefix, admissionClosed, budget, used) {
  if (prefix.action.intent.operation === 'vote') return 'ballot';
  if (prefix.interrupted || prefix.stopReason) return 'scene_stop';
  if (used.beats >= budget.beats) return 'beat_budget';
  if (used.decisions >= budget.decisions) return 'decision_budget';
  if (admissionClosed) return 'execution_budget';
  const publicRows = prefix.draft.entries.slice(prefix.rootEntryCount).filter(row => row.delivery !== 'narration');
  if (!(publicRows.length + 6 < SCENE_BUDGET.maxBlocks
    && publicRows.reduce((sum, row) => sum + row.text.length, 0)
      + budget.utteranceChars * 2 + budget.actionChars * 2 < budget.publicEventChars)) return 'public_event_budget';
  return null;
}

// Version one is the v6 admission algorithm, not a retrospective explanation of
// selectDecisionActors(). Owner cognition contributes ONLY these captured facts.
// The same pre-beat world and facts validate/replay the recorded selection; the
// developer observer never calls this code or reads a later subjective state.
function derive(prefix, facts, admissionClosed, advisory, ownerPerception) {
  const state = prefix.draft; const runtime = runtimeRevisionForState(state); const budget = policy(prefix);
  const roster = rosterFor(state);
  const itemRecipients = hasIntentRuntime(runtime.id) ? runtimePendingItemRecipients(state) : [];
  if (roster.length > SCHEDULING_ROW_LIMIT || facts.length !== roster.length) fail();
  const { counts, actors: usedActors, used } = usage(prefix);
  const phase = prefix.phase === 'reaction' ? 'reaction' : 'npc';
  const admitted32 = usesOrdinaryAdmission32(runtime.id);
  if (ownerPerception && (!admitted32 || phase !== 'npc' || prefix.beats.length || advisory
    || !exact(ownerPerception, ['actorId', 'observationId']) || ownerPerception.actorId !== 'meruru'
    || !isPrivateSupplyObservationId(ownerPerception.observationId))) fail();
  const playerRoom = actorRoom(state, createdPlayerId(state));
  const first = prefix.action.playerIntentPlan?.steps;
  const target = prefix.action.intent.targetId;
  // A required reaction may precede the direct offer. Never promote a later
  // follow-up, someone no longer present, or a target without actual delivery.
  const requiredTarget = admitted32 && phase === 'npc' && target && !prefix.beats.some(beat => beat.phase === 'npc') && first?.length === 1
    && first[0].condition === 'always' && first[0].intent.ordinaryAttempt && actorRoom(state, target) === playerRoom
    && state.entries.slice(prefix.rootEntryCount).some(entry => entry.observationKey === prefix.action.questionKey
      && entry.delivery === 'speech' && entry.audienceIds?.includes(target) && entry.addresseeIds?.includes(target)) ? target : undefined;
  const requiredReaction = admitted32 && phase === 'reaction';
  const gate = gateFor(prefix, admissionClosed && !requiredReaction && !requiredTarget, budget, used);
  const reactions = phase === 'reaction' ? pendingReactionActors(state) : [];
  const blockedProcedure = ['ballot', 'execution_ready', 'ending', 'assembly'].includes(activeProcedure(state)?.stage);
  const ledger = state.agentAutonomy;
  const targetId = requiredTarget || (prefix.beats.length ? undefined : target);
  const notice = state.agentWorld?.broadcasts.at(-1);
  const rows = roster.map((actor, index) => {
    const fact = facts[index];
    if (fact.actorId !== actor.id) fail();
    const active = runtimeActive(state, actor.id) && !['unavailable', undefined].includes(actorRoom(state, actor.id));
    const last = ledger?.considered?.[actor.id] ?? -1;
    const due = fact.goalDue && (ledger?.reviewAtByActor?.[actor.id] ?? 0) <= state.worldTime;
    const triggers = [];
    if (phase === 'reaction') { if (reactions.includes(actor.id)) triggers.push('reaction'); }
    else {
      if (actor.id === targetId) triggers.push('direct_target');
      if (pendingSocialRequests(state, actor.id).some(request => request.reviewAt <= state.worldTime)) triggers.push('request_due');
      if (state.caseRuntime.pendingActorIds.includes(actor.id) || itemRecipients.includes(actor.id)) triggers.push('runtime_pending');
      if (notice?.audienceIds.includes(actor.id) && (notice.occurredAt > last
        || (['corridor', 'reception'].includes(playerRoom) && pendingAssemblyDeparture(state, actor.id, prefix.action)))) triggers.push('broadcast_received');
      if (ownerPerception?.actorId === actor.id || receivedEnactmentCount(state, actor.id) > (ledger?.receivedCounts?.[actor.id] || 0)) triggers.push('new_perception');
      if (due) triggers.push('goal_review_due');
      if (ledger && state.worldTime - last >= 60) triggers.push('public_clock');
      if (!prefix.beats.length && actorRoom(state, actor.id) === playerRoom
        && (['act', 'follow', 'conversation'].includes(prefix.action.intent.type) || prefix.action.performance.utterance)) triggers.push('local_trigger');
      if (prefix.beats.length && fact.reviewContinuation) triggers.push('review_resumed');
      if (prefix.beats.length && fact.replyReceived) triggers.push('prior_reply');
    }
    const blockers = [];
    if (gate) blockers.push(gate);
    else if (admitted32 && admissionClosed && !requiredReaction && actor.id !== requiredTarget) blockers.push('execution_budget');
    if (!active) blockers.push('inactive');
    else if (phase !== 'reaction' && blockedProcedure) blockers.push('procedure_blocked');
    else if (phase === 'reaction' && !reactions.includes(actor.id)) blockers.push('not_reaction');
    if ((counts.get(actor.id) || 0) >= budget.perActor) blockers.push('per_actor_budget');
    if (!usedActors.has(actor.id) && usedActors.size >= budget.actors) blockers.push('scene_actor_budget');
    return { actorId: actor.id, goalDue: fact.goalDue, reviewContinuation: fact.reviewContinuation,
      replyReceived: fact.replyReceived, triggers, blockers, reason: null, active };
  });
  const available = rows.filter(row => row.active);
  const cursor = (ledger?.cursor || 0) % Math.max(available.length, 1);
  const ordered = [...available.slice(cursor), ...available.slice(0, cursor)];
  const ensemble = runtime.policy.schedulingPolicy === 'ensemble-rotation@1';
  const continuable = row => itemRecipients.includes(row.actorId) || pendingSocialRequests(state, row.actorId)
    .some(request => request.status === 'pending' && request.reviewAt <= state.worldTime)
    || row.replyReceived || row.reviewContinuation
    || (ensemble && !usedActors.has(row.actorId)
      && ((['corridor', 'reception'].includes(playerRoom)
          && row.triggers.includes('broadcast_received') && pendingAssemblyDeparture(state, row.actorId, prefix.action))
        || (actorRoom(state, row.actorId) === playerRoom && row.triggers.includes('new_perception'))));
  // The original @2 selector admits only its first three, BEFORE continuation
  // and scene caps. @3 prioritizes scene-active triggers on beat 1 and lets
  // eligible continuations/new entrants use later beats without dead-slot blocking.
  const ordinary = ordered.filter(row => row.triggers.some(reason => !['review_resumed', 'prior_reply'].includes(reason)));
  const liveGazeOwner = actorId => {
    const plan = state.caseRuntime?.plans?.findLast(row => row.ownerId === actorId);
    const gaze = plan?.preparation?.gaze;
    return Boolean(gaze && !gaze.broken && ['adopted', 'preparing'].includes(plan.status) && gaze.until >= state.worldTime + 30);
  };
  const withLiveGaze = ids => prefix.beats.length ? [...new Set(ids)]
    : [...new Set([...ordinary.filter(row => liveGazeOwner(row.actorId)).map(row => row.actorId), ...ids])];
  const activeTriggers = ensemble
    ? ordinary.filter(row => row.triggers.some(reason => ['runtime_pending', 'broadcast_received', 'new_perception', 'local_trigger'].includes(reason))).map(row => row.actorId)
    : [];
  let candidates;
  if (phase === 'reaction') candidates = reactions;
  else if (blockedProcedure) candidates = [];
  else if (ensemble && prefix.beats.length) {
    const resumed = prefix.beats.flatMap(beat => beat.decisions).map(decision => decision.actorId)
      .filter(id => rows.some(row => row.actorId === id && row.reviewContinuation && !row.blockers.length));
    const eligible = ordered.filter(row => !row.blockers.length && continuable(row));
    const urgent = eligible.filter(row => pendingSocialRequests(state, row.actorId)
      .some(request => request.status === 'pending' && request.reviewAt <= state.worldTime) || row.replyReceived).map(row => row.actorId);
    candidates = withLiveGaze([...urgent, ...resumed, ...eligible.map(row => row.actorId)]).slice(0, 3);
  } else {
    candidates = withLiveGaze([
      ...(ordinary.some(row => row.actorId === targetId) ? [targetId] : []),
      ...ordinary.filter(row => row.triggers.includes('request_due')).map(row => row.actorId),
      ...activeTriggers, ...ordinary.map(row => row.actorId),
    ]).slice(0, 3);
    if (prefix.beats.length) candidates = [...new Set([...candidates,
      ...prefix.beats.flatMap(beat => beat.decisions).map(decision => decision.actorId)
        .filter(id => rows.some(row => row.actorId === id && row.reviewContinuation && row.active))])];
  }
  if (admitted32 && admissionClosed && requiredTarget && !blockedProcedure && phase === 'npc') candidates = [requiredTarget];
  if (phase === 'npc' && !blockedProcedure && itemRecipients.length) {
    const eligible = itemRecipients.filter(id => rows.some(row => row.actorId === id && row.active && !row.blockers.length));
    candidates = [...new Set([...eligible, ...candidates])].slice(0, 3);
  }
  const candidateSet = new Set(candidates);
  for (const row of rows) if (row.active && !(phase !== 'reaction' && blockedProcedure) && phase !== 'reaction') {
    if (ensemble && prefix.beats.length) {
      if (!continuable(row)) row.blockers.push(row.triggers.length ? 'no_continuation' : row.goalDue ? 'review_cooldown' : 'no_trigger');
      else if (!candidateSet.has(row.actorId) && !row.blockers.length) row.blockers.push('rotation_limit');
    } else if (!candidateSet.has(row.actorId)) row.blockers.push(row.triggers.length ? 'rotation_limit'
      : row.goalDue ? 'review_cooldown' : 'no_trigger');
    else if (prefix.beats.length && !continuable(row)) row.blockers.push('no_continuation');
  }
  const admitted = []; const admittedActors = new Set(usedActors);
  for (const actorId of candidates) {
    const row = rows.find(row => row.actorId === actorId);
    if (!row || row.blockers.length) continue;
    if (!admittedActors.has(actorId) && admittedActors.size >= budget.actors) row.blockers.push('scene_actor_budget');
    else if (admitted.length >= Math.min(3, budget.decisions - used.decisions)) row.blockers.push('decision_budget');
    else { admitted.push(actorId); admittedActors.add(actorId); }
  }
  // Preserve historical selection and roster settlement unless ONE selected,
  // nonmandatory actor has a still-unused source-bound interest. Never add a
  // trigger/member or move reaction/mandatory actors. A skipped sibling from
  // the prior scene is aged/protected against another advisory deferral.
  const executionOrder = [...admitted].sort((left, right) => roster.findIndex(actor => actor.id === left) - roster.findIndex(actor => actor.id === right));
  const appliedActorIds = [];
  if (advisory && phase !== 'reaction' && !prefix.beats.length && !gate && !blockedProcedure) {
    const mandatory = id => {
      const triggers = rows.find(row => row.actorId === id)?.triggers || [];
      return triggers.some(trigger => ['direct_target', 'request_due', 'broadcast_received'].includes(trigger))
        || triggers.includes('runtime_pending') && !triggers.some(trigger => ['new_perception', 'goal_review_due', 'local_trigger'].includes(trigger));
    };
    const previousFrames = ledger?.scheduling?.entries || [];
    const previousScene = previousFrames.at(-1)?.sceneRevision;
    const protectedIds = new Set(previousFrames.filter(frame => !frame.terminal && frame.sceneRevision === previousScene)
      .flatMap(frame => frame.actors.filter(row => row.selected && row.execution === 'not_executed').map(row => row.actorId)));
    const interested = advisory.interestActorIds.find(id => admitted.includes(id) && !mandatory(id)
      && actorRoom(state, id) === playerRoom && rows.find(row => row.actorId === id)?.triggers.some(trigger =>
        ['new_perception', 'goal_review_due', 'local_trigger'].includes(trigger)));
    const index = executionOrder.indexOf(interested);
    if (index > 0 && !mandatory(executionOrder[index - 1]) && !protectedIds.has(executionOrder[index - 1])) {
      [executionOrder[index - 1], executionOrder[index]] = [executionOrder[index], executionOrder[index - 1]];
      appliedActorIds.push(interested);
    }
  }
  for (const row of rows) {
    delete row.active;
    row.blockers = [...new Set(row.blockers)];
    row.reason = admitted.includes(row.actorId) ? row.triggers[0] : row.blockers[0];
    if (!row.reason) fail();
  }
  return { version: ownerPerception ? 3 : advisory ? 2 : 1, beat: prefix.beats.length + 1, phase, at: state.worldTime, admissionClosed, gate,
    used, selected: admitted, actors: rows, ...(ownerPerception ? { ownerPerception } : {}), ...(advisory ? { advisory: { version: 1,
      interestActorIds: [...advisory.interestActorIds], appliedActorIds, executionOrder } } : {}) };
}

/** Called only at actual admission, before freezing tasks, never by observers.
 * No proposal/provider text is accepted. Repeated slots reuse this exact record. */
export function captureSceneScheduling(prefix, { decisionStates = {}, reviewContinuationIds = [], previousEvents = [],
  admissionClosed = false, advisory, ownerPerception } = {}) {
  if (advisory && (!exact(advisory, ['interestActorIds']) || !list(advisory.interestActorIds, 3)
    || new Set(advisory.interestActorIds).size !== advisory.interestActorIds.length
    || !advisory.interestActorIds.every(id => rosterFor(prefix.draft).some(actor => actor.id === id)))) fail();
  const facts = rosterFor(prefix.draft).map(actor => ({ actorId: actor.id,
    goalDue: Boolean(decisionStates[actor.id]?.goals.some(goal => goal.status !== 'completed' && goal.reviewAt <= prefix.draft.worldTime)),
    reviewContinuation: reviewContinuationIds.includes(actor.id),
    replyReceived: previousEvents.some(event => event.speakerId !== actor.id && ['speech', 'writing'].includes(event.delivery)
      && event.addresseeIds?.includes(actor.id) && event.audienceIds?.includes(actor.id)) }));
  return derive(prefix, facts, admissionClosed, advisory, ownerPerception);
}

/** Validate exact bounded host facts, world timing, roster, caps and admission
 * order. Cognition facts are bound to immutable private task inputs by the job
 * store; no current cognition, model output or guessed history is consulted. */
export function validateSceneScheduling(prefix, value, selectedIds, { exactDerivation = false } = {}) {
  const budget = policy(prefix);
  const version = value && typeof value === 'object' && !isProxy(value)
    ? Object.getOwnPropertyDescriptor(value, 'version')?.value : undefined;
  if (!exact(value, ['version', 'beat', 'phase', 'at', 'admissionClosed', 'gate', 'used', 'selected', 'actors', ...(version === 2 ? ['advisory'] : version === 3 ? ['ownerPerception'] : [])])
    || ![1, 2, 3].includes(value.version) || !Number.isSafeInteger(value.beat) || value.beat < 1 || value.beat > 4
    || !['reaction', 'npc'].includes(value.phase) || !Number.isSafeInteger(value.at) || value.at < 0
    || typeof value.admissionClosed !== 'boolean' || !(value.gate === null || SCHEDULING_BLOCK_REASONS.includes(value.gate))
    || !exact(value.used, ['beats', 'decisions', 'actors'])
    || !['beats', 'decisions', 'actors'].every(key => Number.isSafeInteger(value.used[key]) && value.used[key] >= 0 && value.used[key] <= budget[key])
    || !list(value.selected, 3)
    || !value.selected.every(id => typeof id === 'string' && id.length <= 128)
    || new Set(value.selected).size !== value.selected.length || !list(value.actors, SCHEDULING_ROW_LIMIT)) fail();
  for (const row of value.actors) if (!exact(row, ['actorId', 'goalDue', 'reviewContinuation', 'replyReceived', 'triggers', 'blockers', 'reason'])
    || typeof row.actorId !== 'string' || row.actorId.length > 128
    || !['goalDue', 'reviewContinuation', 'replyReceived'].every(key => typeof row[key] === 'boolean')
    || !enumList(row.triggers, SCHEDULING_SELECTION_REASONS) || !enumList(row.blockers, SCHEDULING_BLOCK_REASONS)
    || ![...SCHEDULING_SELECTION_REASONS, ...SCHEDULING_BLOCK_REASONS].includes(row.reason)) fail();
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > SCHEDULING_RECORD_BYTES) fail();
  if (value.version === 2 && (!exact(value.advisory, ['version', 'interestActorIds', 'appliedActorIds', 'executionOrder'])
    || value.advisory.version !== 1 || !list(value.advisory.interestActorIds, 3) || !list(value.advisory.appliedActorIds, 1)
    || !list(value.advisory.executionOrder, 3)
    || new Set(value.advisory.interestActorIds).size !== value.advisory.interestActorIds.length
    || !value.advisory.interestActorIds.every(id => rosterFor(prefix.draft).some(actor => actor.id === id)))) fail();
  const replayed = derive(prefix, value.actors, value.admissionClosed, value.version === 2 ? value.advisory : undefined,
    value.version === 3 ? value.ownerPerception : undefined);
  // Historical action replay (`sceneBeatsDraft`) may encounter a frame recorded
  // before a heuristic refinement. Verify its schema, timing, counters, roster,
  // cognition facts, and exact selectedIds without requiring heuristic triggers
  // or gates to match today's code. Direct callers and live turn execution still
  // enforce `isDeepStrictEqual(value, replayed)`.
  if (exactDerivation && value.version === 1) {
    if (value.beat !== replayed.beat || value.phase !== replayed.phase || value.at !== replayed.at
      || value.admissionClosed !== replayed.admissionClosed || !isDeepStrictEqual(value.used, replayed.used)
      || !isDeepStrictEqual(value.selected, selectedIds)
      || value.actors.length !== replayed.actors.length
      || value.actors.some((actor, index) => actor.actorId !== replayed.actors[index].actorId
        || actor.goalDue !== replayed.actors[index].goalDue
        || actor.reviewContinuation !== replayed.actors[index].reviewContinuation
        || actor.replyReceived !== replayed.actors[index].replyReceived
        || (selectedIds.includes(actor.actorId) ? !SCHEDULING_SELECTION_REASONS.includes(actor.reason)
          : !SCHEDULING_BLOCK_REASONS.includes(actor.reason)))) fail();
    return value;
  }
  if (!isDeepStrictEqual(value, replayed) || !isDeepStrictEqual(value.selected, selectedIds)) fail();
  return value;
}

/** Publish only with the final world. Selected siblings without an actual
 * decision receipt remain not_executed, even when their model slots completed. */
export function commitSceneScheduling(prefix, draft, action) {
  if (action.schedulingVersion !== 1) return;
  const budget = policy(prefix); const previous = draft.agentAutonomy.scheduling;
  if (previous && (!exact(previous, ['version', 'dropped', 'entries']) || previous.version !== 1
    || !Number.isSafeInteger(previous.dropped) || previous.dropped < 0 || !list(previous.entries, SCHEDULING_HISTORY_LIMIT))) fail();
  const frames = [...action.schedulingBeats, action.schedulingEnd];
  const decisions = draft.agentAutonomy.decisions.filter(row => row.sceneRevision === prefix.rootRevision + 1);
    const entries = frames.map(frame => ({ sceneRevision: prefix.rootRevision + 1, beat: frame.beat, phase: frame.phase,
      at: frame.at, terminal: frame.selected.length === 0, gate: frame.gate, used: structuredClone(frame.used),
      limits: { beats: budget.beats, actors: budget.actors, decisions: budget.decisions, perActor: budget.perActor },
      stopReason: prefix.stopReason || (prefix.interrupted ? 'world_interrupt' : null)
        || (frame === action.schedulingEnd && frame.gate === 'scene_stop' ? 'departure' : null),
    actors: frame.actors.map(row => {
      const selected = frame.selected.includes(row.actorId);
      const decision = selected ? decisions.find(decision => decision.actorId === row.actorId && decision.sceneBeat === frame.beat) : undefined;
      if (action.decisionAuditVersion === 1 && decision && (decision.auditVersion !== 1
        || (decision.accepted ? decision.rejectionReason !== null : !NPC_REJECTION_REASONS.includes(decision.rejectionReason)))) fail();
      return { actorId: row.actorId, selected, reason: row.reason, triggers: [...row.triggers], blockers: [...row.blockers],
        actorDecisions: action.beats.slice(0, frame.beat - 1).flatMap(beat => beat.decisions).filter(decision => decision.actorId === row.actorId).length,
        execution: !selected ? 'not_selected' : decision ? decision.accepted ? 'accepted' : 'rejected' : 'not_executed',
        decisionAt: decision?.at ?? null,
        ...(action.decisionAuditVersion === 1 && decision ? { operationAuditVersion: 1, rejectionReason: decision.rejectionReason } : {}) };
    }) }));
  const all = [...(previous?.entries || []), ...entries]; const dropped = Math.max(0, all.length - SCHEDULING_HISTORY_LIMIT);
  draft.agentAutonomy.scheduling = { version: 1, dropped: (previous?.dropped || 0) + dropped,
    entries: all.slice(-SCHEDULING_HISTORY_LIMIT) };
}
