import { DECISION_SUBJECTIVE_LABEL } from '../cognition/decision-state.mjs';
import { runtimeCapabilityId } from '../content/runtime-capabilities.mjs';
import { NPC_REJECTION_REASONS } from '../agents/agent-autonomy.mjs';

const MAX_ACTORS = 16;
const MAX_ACTIONS = 12;
const MAX_RELATIONSHIPS = 16;
const MAX_SOCIAL_REQUESTS = 8;
const MAX_SOURCE_IDS = 8;
const MAX_REVIEW_TRIGGERS = MAX_SOCIAL_REQUESTS + 3;
const PSYCHOLOGY_RUNTIME = 'agent-prison-runtime@2';
const MAX_ACTOR_BYTES = 14 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const ROOM_LABELS = Object.freeze({
  cell: '牢房', cell01: '一号牢房', cell02: '二号牢房', cell04: '四号牢房',
  cell05: '五号牢房', cell06: '六号牢房', cell07: '七号牢房', playercell: '八号牢房',
  corridor: '走廊', reception: '会客厅', hall: '玄关大厅', cafeteria: '食堂', kitchen: '厨房',
  courtyard: '庭院', lake: '湖边', infirmary: '医务室', court: '审判庭',
});
const OPERATIONS = Object.freeze({
  wait: '等待', speak: '交谈', write: '书写交流', gesture: '做出可见动作',
  move: '移动', read: '阅读', inspect: '检查', present: '出示材料',
  case_step: '执行已选择的案件步骤', report: '通报发现',
});
const fail = () => { throw Object.assign(new Error('角色观察资料暂不可用。'), { code: 'ERR_DEVELOPER_VIEW' }); };
const bounded = (value, maximum = 400) => typeof value === 'string' ? value.slice(0, maximum) : '';
const time = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
const rows = value => Array.isArray(value) ? value : [];
const bytes = value => Buffer.byteLength(JSON.stringify(value), 'utf8');
const roomLabel = value => {
  if (typeof value !== 'string' || !value || value === 'unavailable') return null;
  const key = value.toLowerCase().replaceAll('_', '');
  return Object.hasOwn(ROOM_LABELS, key) ? ROOM_LABELS[key] : bounded(value, 80);
};

// Read only bounded tails of committed ledgers. Candidates, provider responses,
// agentActions proposals, persona prompts and pending jobs are never consulted.
function tail(source, actorId, worldTime, identify, project) {
  const result = [];
  for (let index = source.length - 1; index >= 0; index--) {
    const row = source[index];
    if (!row || identify(row) !== actorId) continue;
    const entry = project(row);
    if (!entry || !time(entry.at) || entry.at > worldTime) continue;
    result.push(entry);
    if (result.length > MAX_ACTIONS) break;
  }
  return result;
}

function actionChain(state, actorId, actors, handleFor) {
  const operationSummary = operation => {
    if (!operation || !Object.hasOwn(OPERATIONS, operation.type)) return '行动目标或条件不可用';
    let summary = OPERATIONS[operation.type];
    if (operation.type === 'move') {
      const destination = roomLabel(operation.destination);
      if (destination) summary += ` → ${destination}`;
    }
    if (operation.targetHandle) {
      const target = actors.find(actor => handleFor(actorId, actor.id) === operation.targetHandle);
      if (target) summary += ` · 对象：${bounded(target.name, 128)}`;
    }
    return bounded(summary);
  };
  const decisions = tail(rows(state.agentAutonomy?.decisions), actorId, state.worldTime, row => row.actorId,
    row => typeof row.accepted !== 'boolean' ? null : ({ at: row.at, kind: 'decision', accepted: row.accepted,
      summary: operationSummary(row.operation) }));
  const enactment = row => ['action', 'speech', 'writing', 'reading'].includes(row.delivery) && typeof row.text === 'string'
    ? { at: row.occurredAt, kind: 'enactment', accepted: null, summary: bounded(row.text) } : null;
  const entries = tail(rows(state.entries), actorId, state.worldTime, row => row.speakerId, enactment);
  const offscreen = tail(rows(state.agentAutonomy?.events), actorId, state.worldTime, row => row.speakerId, enactment);
  const movements = tail(rows(state.agentWorld?.activityLog), actorId, state.worldTime, row => row.actorId,
    row => typeof row.text === 'string' ? { at: row.occurredAt, kind: 'movement', accepted: null, summary: bounded(row.text) } : null);
  // Preserve distinct repeated decisions. Enactment ledgers are disjoint; a
  // decision is an accepted attempt, while an enactment records its actual text.
  const all = [...decisions.reverse(), ...entries.reverse(), ...offscreen.reverse(), ...movements.reverse()]
    .sort((left, right) => left.at - right.at);
  return { chain: all.slice(-MAX_ACTIONS), truncated: all.length > MAX_ACTIONS };
}

function psychologyRuntime(state, supported, runtime) {
  if (!supported || ![PSYCHOLOGY_RUNTIME, 'agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(state.agentRuntimeRevision)) || runtime === undefined) return null;
  if (runtime?.id !== state.agentRuntimeRevision || typeof runtime.policy?.ref !== 'string'
    || runtime.policy.psychologicalInitialization !== 1) fail();
  return { id: bounded(runtime.id, 128), policyRef: bounded(runtime.policy.ref, 128), psychologicalInitialization: 1 };
}
function sourceIds(value) {
  return [...new Set(Array.from(rows(value).slice(0, MAX_SOURCE_IDS), source => {
    if (typeof source !== 'string' || !source.trim()) fail();
    return bounded(source, 128);
  }))];
}
function targetName(actorId, targetHandle, actors, handleFor) {
  const target = actors.find(actor => handleFor(actorId, actor.id) === targetHandle);
  return target ? bounded(target.name, 128) : null;
}
function currentRelationships(subjective, actorId, actors, handleFor) {
  const result = []; const seen = new Set(); let truncated = false;
  // Working entries supersede archived history. A target whose current entry
  // is only in the committed archive is still a one-way attitude, not a blank.
  for (const source of [rows(subjective?.relationships), rows(subjective?.archive?.relationships)]) {
    for (let index = source.length - 1; index >= 0; index--) {
      const row = source[index];
      if (!row || typeof row.targetHandle !== 'string' || !row.targetHandle.trim()) fail();
      if (seen.has(row.targetHandle)) continue;
      if (result.length === MAX_RELATIONSHIPS) return { relationships: result, truncated: true };
      seen.add(row.targetHandle);
      if (!Number.isInteger(row.distance) || row.distance < -3 || row.distance > 3) fail();
      result.push({ id: bounded(row.id, 128), targetHandle: bounded(row.targetHandle, 128),
        targetName: targetName(actorId, row.targetHandle, actors, handleFor), summary: bounded(row.subjectiveSummary),
        confidence: row.confidence === 'likely' ? 'likely' : 'uncertain', distance: row.distance,
        sourceObservationIds: sourceIds(row.sourceObservationIds),
        ...(typeof row.previousId === 'string' ? { previousId: bounded(row.previousId, 128) } : {}) });
      truncated ||= rows(row.sourceObservationIds).length > MAX_SOURCE_IDS;
    }
  }
  return { relationships: result, truncated };
}
function socialRequests(value, actorId, actors, handleFor) {
  const source = rows(value);
  return { socialRequests: source.slice(-MAX_SOCIAL_REQUESTS).map(row => {
    if (!row || typeof row.senderHandle !== 'string' || !row.senderHandle.trim()
      || !['pending', 'deferred', 'accepted', 'answered', 'declined', 'expired', 'cancelled', 'closed', 'fulfilled', 'superseded'].includes(row.status)
      || !time(row.deadline)) fail();
    const sources = row.sourceObservationIds === undefined ? [row.sourceObservationId] : row.sourceObservationIds;
    return { id: bounded(row.id, 128), senderHandle: bounded(row.senderHandle, 128),
      senderName: targetName(actorId, row.senderHandle, actors, handleFor), status: row.status, deadline: row.deadline,
      sourceObservationIds: sourceIds(sources) };
  }), truncated: source.length > MAX_SOCIAL_REQUESTS
    || source.slice(-MAX_SOCIAL_REQUESTS).some(row => rows(row.sourceObservationIds).length > MAX_SOURCE_IDS) };
}

function sceneActivity(state, actorId, runtime) {
  let committedBeatCount = 0; let acceptedBeatCount = 0;
  let sceneRecorded = false; let sceneDecisions = 0; let actorDecisions = 0;
  const recentBeats = []; const sceneBeats = new Set();
  const decisions = rows(state.agentAutonomy?.decisions);
  for (let index = decisions.length - 1; index >= 0; index--) {
    const row = decisions[index];
    if (!row || !time(row.at) || row.at > state.worldTime || typeof row.accepted !== 'boolean'
      || !Number.isInteger(row.sceneBeat) || row.sceneBeat < 1 || row.sceneBeat > 3) continue;
    if (row.sceneRevision !== undefined) {
      if (!Number.isSafeInteger(row.sceneRevision) || row.sceneRevision < 1 || row.sceneRevision > state.revision) continue;
      sceneRecorded = true;
      if (row.sceneRevision === state.revision) {
        sceneBeats.add(row.sceneBeat); sceneDecisions++; actorDecisions += Number(row.actorId === actorId);
      }
    }
    if (row.actorId !== actorId) continue;
    committedBeatCount++; acceptedBeatCount += Number(row.accepted);
    if (recentBeats.length < MAX_ACTIONS) recentBeats.push({ at: row.at, sceneBeat: row.sceneBeat, accepted: row.accepted,
      ...(row.sceneRevision === undefined ? {} : { sceneRevision: row.sceneRevision }) });
  }
  const considered = state.agentAutonomy?.considered?.[actorId];
  const result = { committedBeatCount, acceptedBeatCount,
    lastConsideredAt: time(considered) && considered <= state.worldTime ? considered : null,
    recentBeats: recentBeats.reverse() };
  const budget = runtime.policy.sceneBudget;
  const maxDecisions = ['agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(runtime.id)) ? 8 : 6;
  if (budget !== undefined) {
    if (!Number.isSafeInteger(budget?.beats) || budget.beats < 1 || budget.beats > 3
      || !Number.isSafeInteger(budget.decisions) || budget.decisions < 1 || budget.decisions > maxDecisions
      || !Number.isSafeInteger(budget.perActor) || budget.perActor < 1 || budget.perActor > 2
      || sceneDecisions > budget.decisions || actorDecisions > budget.perActor) fail();
    // Never infer scene boundaries from timestamps, operation bodies or pending
    // task data. Older committed receipts without the boundary stay unknown.
    result.perSceneBudget = { beats: budget.beats, decisions: budget.decisions, perActor: budget.perActor,
      used: sceneRecorded ? { revision: state.revision, beats: sceneBeats.size, decisions: sceneDecisions, actorDecisions } : null };
  }
  return { sceneActivity: result, truncated: committedBeatCount > MAX_ACTIONS };
}

const SELECTION_REASONS = ['reaction', 'direct_target', 'request_due', 'runtime_pending', 'broadcast_received',
  'new_perception', 'goal_review_due', 'public_clock', 'local_trigger', 'review_resumed', 'prior_reply'];
const BLOCK_REASONS = ['inactive', 'procedure_blocked', 'not_reaction', 'no_trigger', 'review_cooldown', 'rotation_limit',
  'no_continuation', 'per_actor_budget', 'scene_actor_budget', 'decision_budget', 'beat_budget', 'execution_budget',
  'public_event_budget', 'scene_stop', 'ballot'];
const STOP_REASONS = ['phase_transition', 'world_interrupt', 'departure', 'threat', 'player_ask'];
function recordedRejectionReason(row, marker, accepted) {
  const version = Object.getOwnPropertyDescriptor(row, marker);
  // Legacy receipts have no audit authority. Do not even inspect their old
  // rejectionReason, reason, operation or other explanatory/private fields.
  if (!version) return undefined;
  if (!Object.hasOwn(version, 'value') || version.value !== 1 || typeof accepted !== 'boolean') fail();
  const reason = Object.getOwnPropertyDescriptor(row, 'rejectionReason');
  if (!reason || !Object.hasOwn(reason, 'value')
    || (accepted ? reason.value !== null : !NPC_REJECTION_REASONS.includes(reason.value))) fail();
  return reason.value;
}
// Only this small committed ledger is read. Never inspect agentActions, tasks,
// uncommitted receipts or re-run selection against today's psychology/world.
function recordedScheduling(state, actorId) {
  const ledger = state.agentAutonomy?.scheduling;
  if (ledger === undefined) return null;
  if (ledger?.version !== 1 || !Number.isSafeInteger(ledger.dropped) || ledger.dropped < 0
    || !Array.isArray(ledger.entries) || ledger.entries.length > 24) fail();
  const result = [];
  const reasons = (value, allowed) => {
    if (!Array.isArray(value) || value.length > allowed.length || new Set(value).size !== value.length
      || value.some(reason => !allowed.includes(reason))) fail();
    return [...value];
  };
  for (const frame of ledger.entries) {
    if (!frame || !time(frame.at) || frame.at > state.worldTime || !Number.isSafeInteger(frame.sceneRevision)
      || frame.sceneRevision < 1 || frame.sceneRevision > state.revision) continue;
    if (!Number.isSafeInteger(frame.beat) || frame.beat < 1 || frame.beat > 4
      || !['reaction', 'npc'].includes(frame.phase) || typeof frame.terminal !== 'boolean'
      || !(frame.gate === null || BLOCK_REASONS.includes(frame.gate))
      || !(frame.stopReason === null || STOP_REASONS.includes(frame.stopReason))
      || !Array.isArray(frame.actors) || frame.actors.length > MAX_ACTORS) fail();
    const row = frame.actors.find(row => row.actorId === actorId);
    if (!row) continue;
    const limits = frame.limits; const used = frame.used;
    if (!limits || !used || !Number.isSafeInteger(limits.beats) || limits.beats < 1 || limits.beats > 3
      || !Number.isSafeInteger(limits.actors) || limits.actors < 1 || limits.actors > 4
      || !Number.isSafeInteger(limits.decisions) || limits.decisions < 1 || limits.decisions > 8
      || !Number.isSafeInteger(limits.perActor) || limits.perActor < 1 || limits.perActor > 2
      || !['beats', 'actors', 'decisions'].every(key => Number.isSafeInteger(used[key]) && used[key] >= 0 && used[key] <= limits[key])
      || !Number.isSafeInteger(row.actorDecisions) || row.actorDecisions < 0 || row.actorDecisions > limits.perActor
      || typeof row.selected !== 'boolean' || !(row.selected ? SELECTION_REASONS : BLOCK_REASONS).includes(row.reason)
      || !['accepted', 'rejected', 'not_executed', 'not_selected'].includes(row.execution)
      || (row.selected === (row.execution === 'not_selected'))
      || (['accepted', 'rejected'].includes(row.execution) ? !time(row.decisionAt) || row.decisionAt < frame.at
        || row.decisionAt > state.worldTime : row.decisionAt !== null)) fail();
    const triggers = reasons(row.triggers, SELECTION_REASONS); const blockers = reasons(row.blockers, BLOCK_REASONS);
    if (row.selected ? blockers.length > 0 || !triggers.includes(row.reason) : !blockers.includes(row.reason)) fail();
    const rejectionReason = recordedRejectionReason(row, 'operationAuditVersion',
      row.execution === 'accepted' ? true : row.execution === 'rejected' ? false : undefined);
    result.push({ at: frame.at, sceneRevision: frame.sceneRevision, beat: frame.beat, phase: frame.phase,
      terminal: frame.terminal, selected: row.selected, reason: row.reason, triggers, blockers, execution: row.execution,
      ...(row.execution === 'rejected' && rejectionReason !== undefined ? { rejectionReason } : {}),
      decisionAt: row.decisionAt, stopReason: frame.stopReason,
      budget: { beats: limits.beats, actors: limits.actors, decisions: limits.decisions, perActor: limits.perActor,
        used: { beats: used.beats, actors: used.actors, decisions: used.decisions, actorDecisions: row.actorDecisions } } });
  }
  return { recent: result.slice(-MAX_ACTIONS), truncated: ledger.dropped > 0 || result.length > MAX_ACTIONS };
}

// Missing historical admission/operation causes remain unrecorded. Current
// goal/request clocks are review hints, never historical selection evidence.
function schedulerDiagnostics(state, actorId, goals, requests, activity, truncated) {
  const recorded = recordedScheduling(state, actorId);
  let latestRow;
  let latestDecision = null;
  const decisions = rows(state.agentAutonomy?.decisions);
  for (let index = decisions.length - 1; index >= 0; index--) {
    const row = decisions[index];
    if (!row || row.actorId !== actorId || !time(row.at) || row.at > state.worldTime) continue;
    if (latestDecision && !Object.hasOwn(row, 'auditVersion')) continue;
    if (row.sceneRevision !== undefined && (!Number.isSafeInteger(row.sceneRevision)
      || row.sceneRevision < 1 || row.sceneRevision > state.revision)) continue;
    const rejectionReason = recordedRejectionReason(row, 'auditVersion', row.accepted);
    if (typeof row.accepted !== 'boolean' || latestDecision) continue;
    latestDecision = { at: row.at, accepted: row.accepted,
      reason: row.accepted === false && rejectionReason !== undefined ? rejectionReason : 'unrecorded' }; latestRow = row;
  }
  if (latestDecision && recorded) {
    const evidence = recorded.recent.findLast(row => row.sceneRevision === latestRow.sceneRevision
      && row.beat === latestRow.sceneBeat && row.decisionAt === latestDecision.at
      && row.execution === (latestDecision.accepted ? 'accepted' : 'rejected'));
    if (evidence) latestDecision.selectionReason = evidence.reason;
  }
  const reviewTriggers = [];
  for (const goal of goals) if (goal.status !== 'completed' && goal.reviewAt <= state.worldTime) {
    reviewTriggers.push({ kind: 'goal-review-due', goalId: goal.id, status: goal.status, reviewAt: goal.reviewAt });
  }
  for (const request of requests) if (['pending', 'deferred'].includes(request.status) && request.deadline > state.worldTime) {
    // The existing owner-local callback supplies expiry but not reviewAt.
    // Pending/deferral is evidence of an open request, not that it is due now.
    reviewTriggers.push({ kind: 'social-request-open', requestId: request.id, status: request.status,
      deadline: request.deadline, reviewAt: null });
  }
  const seen = new Set();
  const uniqueTriggers = reviewTriggers.filter(row => {
    const key = `${row.kind}:${row.goalId ?? row.requestId}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  return { version: 1, history: { lastConsideredAt: activity.lastConsideredAt, latestDecision,
    selectionReason: recorded?.recent.findLast(row => row.selected)?.reason ?? 'unrecorded',
    nonSelectionReason: recorded?.recent.findLast(row => !row.selected)?.reason ?? 'unrecorded',
    ...(recorded ? { recent: recorded.recent, truncated: recorded.truncated } : {}) },
  current: { eligibility: 'unknown', coverage: 'partial', reviewTriggers: uniqueTriggers.slice(0, MAX_REVIEW_TRIGGERS),
    truncated: truncated || uniqueTriggers.length !== reviewTriggers.length || uniqueTriggers.length > MAX_REVIEW_TRIGGERS } };
}
function freezeDiagnostic(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeDiagnostic(child);
    Object.freeze(value);
  }
  return value;
}

/** Allowlisted, detached developer DTO. All dependencies read the SAME committed
 * host snapshot inside the engine's read transaction. No state is initialized,
 * decisions reviewed, routes created, model invoked or durable data written.
 */
export function projectDeveloperActors({ state, actors, playerId, readDecisionState, locationOf, handleFor,
  runtimeRevision, readSocialRequests = () => [] }) {
  if (!state || !Number.isSafeInteger(state.generation) || state.generation < 1
    || !Number.isSafeInteger(state.revision) || state.revision < 0 || !time(state.worldTime)
    || !Array.isArray(actors) || actors.length > MAX_ACTORS || new Set(actors.map(actor => actor.id)).size !== actors.length) fail();
  const supported = state.exampleId === 'agent';
  const runtime = psychologyRuntime(state, supported, runtimeRevision);
  const result = { version: 1, audience: 'developer-only', committedOnly: true,
    generation: state.generation, revision: state.revision, worldTime: state.worldTime,
    supported, subjectiveLabel: DECISION_SUBJECTIVE_LABEL, actors: [],
    ...(runtime ? { runtimeRevision: runtime } : {}) };
  for (const actor of actors) {
    if (typeof actor.id !== 'string' || !actor.id || actor.id.length > 128 || typeof actor.name !== 'string') fail();
    const isPlayer = actor.id === playerId;
    // Do not synthesize initialDecisionState() for an observer, and do not
    // reinterpret unexpressed player choices as autonomous character thoughts.
    const subjective = supported && !isPlayer ? readDecisionState(actor.id) : null;
    const history = supported ? actionChain(state, actor.id, actors, handleFor) : { chain: [], truncated: false };
    const beliefs = rows(subjective?.beliefs);
    const relationships = rows(subjective?.relationships).filter(row => row.targetHandle === handleFor(actor.id, playerId));
    const attitude = relationships.at(-1);
    if (attitude && (!Number.isInteger(attitude.distance) || attitude.distance < -3 || attitude.distance > 3)) fail();
    const goals = rows(subjective?.goals);
    const planned = supported && !isPlayer ? rows(state.agentWorld?.routes).filter(route => route.actorId === actor.id)
      .flatMap(route => rows(route.steps)).filter(step => time(step.at) && step.at > state.worldTime && roomLabel(step.to))
      .sort((left, right) => left.at - right.at) : [];
    const projection = {
      id: actor.id, name: bounded(actor.name, 128), isPlayer,
      location: supported ? roomLabel(locationOf(actor.id)) : null,
      subjectiveStatus: !supported ? 'unsupported' : subjective ? 'available' : 'not-recorded',
      actionChain: history.chain,
      assessments: beliefs.slice(-8).reverse().map(row => ({
        id: bounded(row.id, 128), summary: bounded(row.summary), confidence: row.confidence === 'likely' ? 'likely' : 'uncertain',
        ...(typeof row.contradicts === 'string' ? { contradicts: bounded(row.contradicts, 128) } : {}),
      })),
      attitudeTowardPlayer: attitude ? {
        id: bounded(attitude.id, 128), summary: bounded(attitude.subjectiveSummary),
        confidence: attitude.confidence === 'likely' ? 'likely' : 'uncertain',
        distance: attitude.distance,
        ...(typeof attitude.previousId === 'string' ? { previousId: bounded(attitude.previousId, 128) } : {}),
      } : null,
      goals: goals.slice(0, 3).map(row => {
        if (!Number.isInteger(row.priority) || row.priority < 1 || row.priority > 3
          || !['active', 'paused', 'completed'].includes(row.status) || !time(row.reviewAt)) fail();
        return { id: bounded(row.id, 128), summary: bounded(row.summary),
          priority: row.priority, status: row.status, reviewAt: row.reviewAt };
      }),
      nextSteps: planned.slice(0, 4).map(step => ({ at: step.at, destination: roomLabel(step.to) })),
      truncated: history.truncated || beliefs.length > 8 || goals.length > 3 || planned.length > 4,
    };
    if (runtime) {
      if (!isPlayer) projection.causalInitialization = { revision: runtime.id, seeded: subjective !== null && subjective !== undefined };
      const relations = currentRelationships(subjective, actor.id, actors, handleFor);
      const requests = socialRequests(readSocialRequests(actor.id), actor.id, actors, handleFor);
      const activity = sceneActivity(state, actor.id, runtimeRevision);
      projection.relationships = relations.relationships;
      projection.socialRequests = requests.socialRequests;
      projection.sceneActivity = activity.sceneActivity;
      if (!isPlayer) projection.scheduling = schedulerDiagnostics(state, actor.id, projection.goals, requests.socialRequests,
        activity.sceneActivity, goals.length > 3 || requests.truncated);
      projection.truncated ||= relations.truncated || requests.truncated || activity.truncated;
    }
    // Bound the complete payload, not just individual strings. Keep every actor
    // in the roster; remove older details first and disclose the truncation.
    while (bytes(projection) > MAX_ACTOR_BYTES) {
      projection.truncated = true;
      if (projection.actionChain.length) projection.actionChain.shift();
      else if (projection.assessments.length) projection.assessments.pop();
      else if (projection.relationships?.length) projection.relationships.pop();
      else if (projection.socialRequests?.length) {
        const removed = projection.socialRequests.shift();
        const current = projection.scheduling?.current;
        if (current) {
          current.reviewTriggers = current.reviewTriggers.filter(row => row.kind !== 'social-request-open' || row.requestId !== removed.id);
          current.truncated = true;
        }
      }
      else if (projection.sceneActivity?.recentBeats.length) projection.sceneActivity.recentBeats.shift();
      else if (projection.scheduling?.current.reviewTriggers.length) {
        projection.scheduling.current.reviewTriggers.pop(); projection.scheduling.current.truncated = true;
      } else if (projection.scheduling?.history.recent?.length) {
        const history = projection.scheduling.history;
        history.recent.shift(); history.truncated = true;
        history.selectionReason = history.recent.findLast(row => row.selected)?.reason ?? 'unrecorded';
        history.nonSelectionReason = history.recent.findLast(row => !row.selected)?.reason ?? 'unrecorded';
        if (history.latestDecision?.selectionReason && !history.recent.some(row => row.selected
          && row.decisionAt === history.latestDecision.at && ['accepted', 'rejected'].includes(row.execution))) delete history.latestDecision.selectionReason;
      } else fail();
    }
    if (projection.scheduling) freezeDiagnostic(projection.scheduling);
    result.actors.push(projection);
  }
  if (bytes(result) > MAX_RESPONSE_BYTES) fail();
  return result;
}
