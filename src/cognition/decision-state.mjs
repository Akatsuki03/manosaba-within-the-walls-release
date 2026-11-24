import { createHash, randomUUID } from 'node:crypto';
import { RELATIONSHIP_RUNTIME_REVISION, RELATIONSHIP_GOAL_CHARS, relationshipContextPin, isRelationshipRuntime, hasSoftRuntime } from '../content/relationship-context-policy.mjs';
import { relationshipRootForRows } from '../creation/player-setup.mjs';
import { relationshipOwnerBlueprint } from '../creation/relationship-setup.mjs';
import { openSqliteScope } from '../host/sqlite-scope-owner.mjs';
import { COGNITION_HISTORY_SQL, DECISION_AUTHORIZED_SQL } from './cognition-access-policy.mjs';
import { isProxy } from 'node:util/types';
import { agentActor } from '../content/agent-scenario.mjs';
import { runtimeRevisionForState } from '../content/content-revisions.mjs';
import { psychologySeedBlueprint } from './psychology-profile.mjs';
import { bunkPsychologyBlueprint } from '../world/prison-bunks.mjs';
import { actorObservationId } from '../characters/observation-identity.mjs';
import { initialConversationState, validateConversationState, applyConversationEvent, advanceConversationState } from './conversation-state.mjs';

export const DECISION_STATE_VERSION = 1;
// Host-authored, never supplied by a proposal. Render this label alongside the
// summary; these records cannot authorize observations, world facts or minds.
export const DECISION_SUBJECTIVE_LABEL = '未核实的本人主观判断；不是观察事实，也不代表他人内心。';
const LIMITS = Object.freeze({ goals: 3, beliefs: 8, relationships: 16, sources: 8, updates: 6 });
// Exact old records, not synthetic summaries. These are a bounded working cache;
// every committed snapshot remains immutable in SQLite after cache release.
const ARCHIVE_LIMITS = Object.freeze({ goals: 6, beliefs: 16, relationships: 32 });
export const DECISION_LIFECYCLE_POLICY = 'source-backed-lifecycle@1';
// The runtime policy pins this closed authoring registry. Neither a model's
// text nor an arbitrary policy object can add another motive or template.
export const SITUATIONAL_GOAL_TEMPLATE_POLICY = 'pending-social-request@1';
const SITUATIONAL_GOAL_TEMPLATES = Object.freeze([
  Object.freeze({ templateId: 'consider-ask@1', kind: 'ask',
    summary: '我想先考虑如何回应眼前收到的询问，再决定是否作答。' }),
  Object.freeze({ templateId: 'consider-invite@1', kind: 'invite',
    summary: '我想先考虑眼前收到的邀请，再决定是否接受、拒绝或暂缓。' }),
]);
const MAX_GOAL_TEMPLATES = 4;
const GOAL_FILTER_BYTES = 512;
const MAX_ANCESTORS = 4096;
const MAX_STATE_BYTES = 64 * 1024;
const MAX_OBSERVATION_BYTES = 4 * 1024 * 1024;
const owners = new WeakMap();
const DIAGNOSTICS = new WeakMap();
const DIAGNOSTIC_ISSUES = new Set([
  'scene_action_mismatch', 'scene_job_mismatch', 'scene_plan_mismatch', 'scene_base_mismatch',
  'scene_scheduling_mismatch', 'scene_journal_mismatch', 'scene_task_result_mismatch',
  'scene_task_frame_mismatch', 'scene_task_scope_mismatch', 'scene_source_visibility',
  'scene_delivery_mismatch', 'scene_social_requests_mismatch', 'scene_goal_templates_mismatch',
  'scene_baseline_missing', 'scene_state_mismatch',
]);
export const DECISION_STATE_FAILURE_ISSUES = Object.freeze([...DIAGNOSTIC_ISSUES]);
// Identity-only lookup: never inspect arbitrary errors, accessors, proxies or causes.
export const decisionStateDiagnostic = error => DIAGNOSTICS.get(error) ?? null;
const fail = issue => {
  const error = Object.assign(new Error('无法安全校验或保存主观决策状态。'), { code: 'ERR_DECISION_STATE' });
  const diagnostic = typeof issue === 'string' && DIAGNOSTIC_ISSUES.has(issue) ? Object.freeze({ issue }) : null;
  DIAGNOSTICS.set(error, diagnostic);
  throw error;
};
function safely(operation, issue) {
  try { return operation(); }
  // Only a module-authored issue survives wrapping; never retain the raw cause.
  catch (error) { fail(decisionStateDiagnostic(error)?.issue ?? issue); }
}
function plain(value) {
  return value !== null && typeof value === 'object' && !isProxy(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
function field(value, key) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) return undefined;
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail();
  return descriptor.value;
}
function object(value, fields, required = fields) {
  if (!plain(value) || Reflect.ownKeys(value).some(key => typeof key !== 'string' || !fields.includes(key))) fail();
  const result = {};
  for (const key of fields) {
    if (!Object.hasOwn(value, key)) { if (required.includes(key)) fail(); continue; }
    const entry = field(value, key);
    if (entry === undefined) fail();
    result[key] = entry;
  }
  return result;
}
function list(value, maximum, nonempty = false) {
  if (isProxy(value) || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail();
  const length = Object.getOwnPropertyDescriptor(value, 'length').value;
  if (length > maximum || (nonempty && !length) || Reflect.ownKeys(value).length !== length + 1) fail();
  const result = [];
  for (let index = 0; index < length; index++) {
    if (!Object.hasOwn(value, String(index))) fail();
    const entry = field(value, String(index));
    if (entry === undefined) fail();
    result.push(entry);
  }
  return result;
}
function identifier(value) {
  if (typeof value !== 'string' || !value.length || value.length > 128 || value.trim() !== value
    || !value.isWellFormed() || /[\u0000-\u001f\u007f]/u.test(value)) fail();
  return value;
}
function text(value, maximum = 400) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || !value.isWellFormed()
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) fail();
  return value;
}
function integer(value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) fail();
  return value;
}
function time(value) { if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) fail(); return value; }
function worldTime(value) { time(value); if (value > Number.MAX_SAFE_INTEGER - 3600) fail(); return value; }
function unique(entries, key = value => value) {
  if (new Set(entries.map(key)).size !== entries.length) fail();
  return entries;
}
const sources = value => unique(list(value, LIMITS.sources, true).map(identifier)).sort();
const confidence = value => { if (!['uncertain', 'likely'].includes(value)) fail(); return value; };
const status = value => { if (!['active', 'paused', 'completed'].includes(value)) fail(); return value; };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);
const beliefId = row => `belief-${digest([row.summary, row.confidence, row.sourceObservationIds, row.contradicts ?? null])}`;
const relationshipId = row => `relationship-${digest([row.targetHandle, row.subjectiveSummary, row.confidence,
  row.distance, row.sourceObservationIds, row.previousId ?? null])}`;
const recordKinds = ['goals', 'beliefs', 'relationships'];
const recordsOf = (state, key) => [...(state.archive?.[key] ?? []), ...state[key]];
const allRecords = (state, includeArchive = true) => recordKinds.flatMap(key => includeArchive ? recordsOf(state, key) : state[key]);
const allSources = (state, includeArchive = true) => [...new Set(allRecords(state, includeArchive).flatMap(row => row.sourceObservationIds))].sort();
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
function sealedJSON(json, hash, maximum = MAX_OBSERVATION_BYTES) {
  if (typeof json !== 'string' || Buffer.byteLength(json, 'utf8') > maximum
    || typeof hash !== 'string' || createHash('sha256').update(json).digest('hex') !== hash) fail();
  return JSON.parse(json);
}
function goalValue(goal, ownerId) {
  const value = goal.summary.match(/^我想在眼前的选择中顾及：([\s\S]+)。$/u)?.[1];
  return value !== undefined && goal.id === `goal-${digest([ownerId, value])}` ? value : undefined;
}
const situationalGoalId = (ownerId, templateId, sourceId) =>
  `goal-${digest([SITUATIONAL_GOAL_TEMPLATE_POLICY, ownerId, templateId, sourceId])}`;
function situationalGoalIdentity(goal, ownerId) {
  for (const template of SITUATIONAL_GOAL_TEMPLATES) {
    if (goal.summary !== template.summary) continue;
    const sourceId = goal.sourceObservationIds.find(id => goal.id === situationalGoalId(ownerId, template.templateId, id));
    if (sourceId !== undefined) return { template, sourceId };
  }
}
function goalTemplate(entry, ownerId) {
  const row = object(entry, ['id', 'summary', 'sourceObservationIds', 'templateId'], ['id', 'summary', 'sourceObservationIds']);
  const result = { id: identifier(row.id), summary: text(row.summary), sourceObservationIds: sources(row.sourceObservationIds),
    ...(row.templateId === undefined ? {} : { templateId: identifier(row.templateId) }) };
  const template = SITUATIONAL_GOAL_TEMPLATES.find(row => row.summary === result.summary);
  if (result.sourceObservationIds.length !== 1 || !template
    || (ownerId !== undefined && !situationalGoalIdentity(result, ownerId))
    || (result.templateId !== undefined && result.templateId !== template.templateId)) fail();
  return result;
}
const goalTemplates = (input, ownerId) =>
  unique(list(input, MAX_GOAL_TEMPLATES).map(row => goalTemplate(row, ownerId)), row => row.id);
function goalFilterSlots(id) {
  const hash = createHash('sha256').update(id).digest();
  return [0, 4, 8, 12].map(offset => hash.readUInt32BE(offset) % (GOAL_FILTER_BYTES * 8));
}
function retiredGoal(state, id) {
  if (!state.lifecycle?.retiredGoalIds) return false;
  const bytes = Buffer.from(state.lifecycle.retiredGoalIds, 'hex');
  return goalFilterSlots(id).every(slot => (bytes[slot >>> 3] & (1 << (slot & 7))) !== 0);
}
function retireGoal(state, id) {
  const bytes = state.lifecycle.retiredGoalIds ? Buffer.from(state.lifecycle.retiredGoalIds, 'hex') : Buffer.alloc(GOAL_FILTER_BYTES);
  for (const slot of goalFilterSlots(id)) bytes[slot >>> 3] |= 1 << (slot & 7);
  state.lifecycle.retiredGoalIds = bytes.toString('hex');
}
function socialRequest(entry) {
  const row = object(entry, ['id', 'kind', 'sourceObservationId', 'senderHandle', 'status', 'reviewAt', 'expiresAt']);
  if (!['ask', 'invite'].includes(row.kind) || !['pending', 'deferred', 'accepted'].includes(row.status)) fail();
  return { id: identifier(row.id), kind: row.kind, sourceObservationId: identifier(row.sourceObservationId),
    senderHandle: identifier(row.senderHandle), status: row.status, reviewAt: integer(row.reviewAt), expiresAt: integer(row.expiresAt) };
}
/** Host authoring channel, not a model proposal or a prose classifier. Only a
 * due, live, explicitly pending request with a full acquired owner observation
 * can instantiate one of the pinned registry's exact, noncommittal motives.
 * The caller must supply authentic host social metadata. SQL derives it again.
 */
export function deriveSituationalGoalTemplates(input) {
  return safely(() => {
    const args = object(input, ['ownerId', 'policy', 'observations', 'socialRequests', 'worldTime']);
    const ownerId = identifier(args.ownerId); const now = worldTime(integer(args.worldTime));
    if (!plain(args.policy)) fail();
    if (field(args.policy, 'situationalGoalTemplates') !== SITUATIONAL_GOAL_TEMPLATE_POLICY) return [];
    const context = sceneObservationContext(args.observations, now, ownerId,
      { version: DECISION_STATE_VERSION, goals: [], beliefs: [], relationships: [] });
    const requests = unique(list(args.socialRequests, 32).map(socialRequest), row => row.id);
    const candidates = [];
    for (const request of requests) {
      if (request.status !== 'pending' || request.reviewAt > now || request.expiresAt <= now
        || !['hearing', 'reading'].includes(context.observations.get(request.sourceObservationId)?.channel)) continue;
      const template = SITUATIONAL_GOAL_TEMPLATES.find(row => row.kind === request.kind);
      const candidate = { id: situationalGoalId(ownerId, template.templateId, request.sourceObservationId),
        summary: template.summary, sourceObservationIds: [request.sourceObservationId], templateId: template.templateId };
      if (!candidates.some(row => row.id === candidate.id)) candidates.push(candidate);
      if (candidates.length === MAX_GOAL_TEMPLATES) break;
    }
    return candidates;
  });
}
function future(value, worldTime) { time(value); return value >= worldTime + 1 && value <= worldTime + 3600; }
function boundedState(state) {
  if (Buffer.byteLength(JSON.stringify(state), 'utf8') > MAX_STATE_BYTES) fail();
  return state;
}
function goalRecord(entry, maximum = 400) {
  const row = object(entry, ['id', 'summary', 'priority', 'status', 'reviewAt', 'sourceObservationIds']);
  return { id: identifier(row.id), summary: text(row.summary, maximum), priority: integer(row.priority, 1, 3),
    status: status(row.status), reviewAt: time(row.reviewAt), sourceObservationIds: sources(row.sourceObservationIds) };
}
function beliefRecord(entry) {
  const row = object(entry, ['id', 'summary', 'confidence', 'sourceObservationIds', 'label', 'contradicts'],
    ['id', 'summary', 'confidence', 'sourceObservationIds', 'label']);
  if (row.label !== DECISION_SUBJECTIVE_LABEL) fail();
  const result = { id: identifier(row.id), summary: text(row.summary), confidence: confidence(row.confidence),
    sourceObservationIds: sources(row.sourceObservationIds), label: DECISION_SUBJECTIVE_LABEL,
    ...(row.contradicts === undefined ? {} : { contradicts: identifier(row.contradicts) }) };
  if (result.id !== beliefId(result) || result.contradicts === result.id || !subjective(result.summary)) fail();
  return result;
}
function relationshipRecord(entry) {
  const row = object(entry, ['id', 'targetHandle', 'subjectiveSummary', 'confidence', 'distance', 'sourceObservationIds', 'label', 'previousId'],
    ['id', 'targetHandle', 'subjectiveSummary', 'confidence', 'distance', 'sourceObservationIds', 'label']);
  if (row.label !== DECISION_SUBJECTIVE_LABEL) fail();
  const result = { id: identifier(row.id), targetHandle: identifier(row.targetHandle), subjectiveSummary: text(row.subjectiveSummary),
    confidence: confidence(row.confidence), distance: integer(row.distance, -3, 3), sourceObservationIds: sources(row.sourceObservationIds),
    label: DECISION_SUBJECTIVE_LABEL, ...(row.previousId === undefined ? {} : { previousId: identifier(row.previousId) }) };
  if (result.id !== relationshipId(result) || result.previousId === result.id || !subjective(result.subjectiveSummary)) fail();
  return result;
}
const recordParsers = { goals: goalRecord, beliefs: beliefRecord, relationships: relationshipRecord };
function lifecycleEvent(entry, maximum = 400) {
  if (!plain(entry)) fail();
  if (field(entry, 'kind') === 'goal') {
    const row = object(entry, ['kind', 'id', 'status', 'priority', 'reviewAt', 'sourceObservationIds', 'previous']);
    const { previous, ...update } = row;
    return { ...proposal(update), previous: previous === null ? null : goalRecord(previous, maximum) };
  }
  const row = object(entry, ['kind', 'id']);
  if (!['belief', 'relationship'].includes(row.kind)) fail();
  return { kind: row.kind, id: identifier(row.id) };
}
function parseState(value) {
  const input = object(value, ['version', 'goals', 'beliefs', 'relationships', 'archive', 'lifecycle', 'relationshipContextVersion'],
    ['version', 'goals', 'beliefs', 'relationships']);
  if (input.version !== DECISION_STATE_VERSION) fail();
  const pin = relationshipContextPin(input), maximum = pin.relationshipContextVersion === 1 ? RELATIONSHIP_GOAL_CHARS : 400;
  const state = { version: DECISION_STATE_VERSION, ...pin };
  const parseRecord = key => row => key === 'goals' ? goalRecord(row, maximum) : recordParsers[key](row);
  for (const key of recordKinds) state[key] = unique(list(input[key], LIMITS[key]).map(parseRecord(key)), row => row.id);
  if (input.archive !== undefined) {
    const archive = object(input.archive, recordKinds);
    if (input.lifecycle === undefined) fail();
    state.archive = {};
    for (const key of recordKinds) state.archive[key] = unique(list(archive[key], ARCHIVE_LIMITS[key]).map(parseRecord(key)),
      key === 'goals' ? row => digest(row) : row => row.id);
  }
  if (input.lifecycle !== undefined) {
    const row = object(input.lifecycle, ['policy', 'sequence', 'events', 'retiredGoalIds'], ['policy', 'sequence', 'events']);
    if (row.policy !== DECISION_LIFECYCLE_POLICY) fail();
    const events = list(row.events, LIMITS.updates, true).map(entry => lifecycleEvent(entry, maximum));
    const sequence = integer(row.sequence, 1);
    if (events.length !== Math.min(sequence, LIMITS.updates)) fail();
    if (row.retiredGoalIds !== undefined && (typeof row.retiredGoalIds !== 'string'
      || row.retiredGoalIds.length !== GOAL_FILTER_BYTES * 2 || !/^[0-9a-f]+$/u.test(row.retiredGoalIds))) fail();
    state.lifecycle = { policy: DECISION_LIFECYCLE_POLICY, sequence, events,
      ...(row.retiredGoalIds === undefined ? {} : { retiredGoalIds: row.retiredGoalIds }) };
  }
  unique([...state.goals, ...recordsOf(state, 'beliefs'), ...recordsOf(state, 'relationships')], row => row.id);
  // Archived goal revisions may share an authored ID, never impersonate another
  // record kind or change that goal's immutable text.
  const goalTexts = new Map(state.goals.map(row => [row.id, row.summary]));
  const assessments = new Set([...recordsOf(state, 'beliefs'), ...recordsOf(state, 'relationships')].map(row => row.id));
  for (const row of state.archive?.goals ?? []) {
    if (assessments.has(row.id) || (goalTexts.has(row.id) && goalTexts.get(row.id) !== row.summary)) fail();
    goalTexts.set(row.id, row.summary);
  }
  return boundedState(state);
}

/** Detached exact v1 packet projection. Archive/journal are host-only data. */
export function decisionWorkingState(current) {
  return safely(() => {
    const state = parseState(current);
    const working = { version: DECISION_STATE_VERSION, ...relationshipContextPin(state), goals: state.goals, beliefs: state.beliefs, relationships: state.relationships };
    if (owners.has(current)) owners.set(working, owners.get(current));
    return working;
  });
}
/** Exact observation closure; archive bodies are opt-in, never packet defaults. */
export function decisionStateSourceIds(current, options = {}) {
  return safely(() => {
    const args = object(options, ['includeArchive'], []);
    if (args.includeArchive !== undefined && typeof args.includeArchive !== 'boolean') fail();
    return allSources(parseState(current), args.includeArchive ?? false);
  });
}
function ownerOf(row) {
  if (!plain(row)) fail();
  const actorId = field(row, 'actorId'); const ownerId = field(row, 'ownerId');
  if (actorId === undefined && ownerId === undefined) fail();
  if (actorId !== undefined) identifier(actorId);
  if (ownerId !== undefined) identifier(ownerId);
  if (actorId !== undefined && ownerId !== undefined && actorId !== ownerId) fail();
  return actorId ?? ownerId;
}
// Only full, host-authorized observations belong here, NOT recall-source stubs
// or summarized cognition. Persisted authorization is checked again in SQL.
function observationContext(input, worldTime, ownerHint = undefined, current = undefined, allowSituational = false) {
  const rows = list(input, 4096).map(row => ({ row, ownerId: ownerOf(row) }));
  if (ownerHint === undefined && current) {
    const cited = new Set(allSources(current));
    const candidates = new Set(rows.filter(({ row }) => cited.has(field(row, 'id'))).map(row => row.ownerId));
    if (candidates.size > 1) fail();
    ownerHint = [...candidates][0];
  }
  if (ownerHint === undefined) {
    const candidates = new Set(rows.map(row => row.ownerId));
    if (current && allRecords(current).length) {
      // A detached clone may omit old source bodies. Its authored goal IDs
      // still bind candidate owners; never guess a foreign owner in that case.
      const goals = recordsOf(current, 'goals');
      const matching = [...candidates].filter(candidate => goals.length
        && goals.every(goal => goalValue(goal, candidate) !== undefined
          || (allowSituational && situationalGoalIdentity(goal, candidate) !== undefined)));
      if (matching.length > 1) fail();
      if (!matching.length) return { observations: new Map(), ownerId: undefined };
      ownerHint = matching[0];
    } else {
      if (candidates.size > 1) fail();
      ownerHint = [...candidates][0];
    }
  }
  if (current && recordsOf(current, 'goals').some(goal => goalValue(goal, ownerHint) === undefined
    && !(allowSituational && situationalGoalIdentity(goal, ownerHint) !== undefined))) fail();
  const result = new Map(); const seen = new Set(); let bytes = 0; let boundary;
  for (const { row: original, ownerId } of rows) {
    // Do not inspect another owner's text/accessors even when handed mixed input.
    if (ownerId !== ownerHint) continue;
    const row = object(original, ['id', 'text', 'channel', 'actorId', 'ownerId', 'branchId', 'generation', 'revision', 'occurredAt', 'learnedAt', 'sourceActorHandle', 'sourceRelation'],
      ['id', 'text', 'channel', 'occurredAt', 'learnedAt']);
    const id = identifier(row.id); const body = text(row.text, 4000); const channel = identifier(row.channel);
    if ((row.sourceActorHandle === undefined) !== (row.sourceRelation === undefined)
      || row.sourceRelation !== undefined && !['self', 'other'].includes(row.sourceRelation)) fail();
    if (row.sourceActorHandle !== undefined && (typeof row.sourceActorHandle !== 'string'
      || !/^person-[a-f0-9]{16}$/u.test(row.sourceActorHandle))) fail();
    const occurredAt = time(row.occurredAt); const learnedAt = time(row.learnedAt);
    if (occurredAt > learnedAt || seen.has(id)) fail();
    seen.add(id);
    const scopeFields = ['branchId', 'generation', 'revision'].filter(key => row[key] !== undefined);
    if (scopeFields.length && scopeFields.length !== 3) fail();
    if (scopeFields.length) {
      identifier(row.branchId); integer(row.generation, 1); integer(row.revision);
      const scope = JSON.stringify([row.branchId, row.generation]);
      if (boundary !== undefined && boundary !== scope) fail();
      boundary = scope;
    }
    bytes += Buffer.byteLength(body, 'utf8') + 512;
    if (bytes > MAX_OBSERVATION_BYTES) fail();
    if (learnedAt <= worldTime) result.set(id, { id, text: body, channel });
  }
  return { observations: result, ownerId: ownerHint };
}
function ownValues(actor, ownerId) {
  // Canon IDs always use the immutable authored persona, never a model-altered
  // copy or a biography/initialKnowledge field containing later revelations.
  const canonical = agentActor(ownerId);
  if (canonical) return canonical.persona.values;
  const persona = field(actor, 'persona');
  if (!plain(persona)) fail();
  const values = field(persona, 'values');
  return typeof values === 'string' ? [text(values, 320)] : unique(list(values, 32).map(value => text(value, 320)));
}

/** Stable own motives from authored persona.values; no recollection => no goal. */
export function initialDecisionState(actor, observations, options = {}) {
  return safely(() => {
    if (!plain(actor)) fail();
    const ownerId = identifier(field(actor, 'id'));
    const args = object(options, ['worldTime'], []); const now = worldTime(args.worldTime ?? 0);
    const context = observationContext(observations, now, ownerId);
    const sourceObservationIds = [...context.observations.values()].filter(row => row.channel === 'private_recollection')
      .map(row => row.id).sort().slice(0, LIMITS.sources);
    const values = ownValues(actor, ownerId);
    const goals = sourceObservationIds.length ? values.slice(0, LIMITS.goals).map((value, index) => ({
      id: `goal-${digest([ownerId, value])}`, summary: text(`我想在眼前的选择中顾及：${value}。`),
      priority: 3 - index, status: 'active', reviewAt: now + 300 * (index + 1), sourceObservationIds: [...sourceObservationIds],
    })) : [];
    const state = boundedState({ version: DECISION_STATE_VERSION, goals, beliefs: [], relationships: [] });
    owners.set(state, ownerId);
    return state;
  });
}

/** Root-only authored seed channel. This does not relax ordinary proposal
 * budgets, distance deltas, inference checks or first-write baseline checks.
 * Persistence independently rebuilds the blueprint from its sealed root.
 */
export function authoredInitialDecisionState(actor, blueprint, { worldTime: now = 0 } = {}) {
  return safely(() => {
    const ownerId = identifier(actor.id); worldTime(now);
    const pin = blueprint.root ? { relationshipContextVersion: 1 } : {};
    const maximum = blueprint.root ? RELATIONSHIP_GOAL_CHARS : 400;
    const observations = blueprint.observations.map(row => ({ id: row.id, actorId: row.ownerId, text: row.text,
      channel: 'private_recollection', occurredAt: 0, learnedAt: 0 }));
    const context = observationContext(observations, now, ownerId);
    const authorized = ids => sources(ids).every(id => context.observations.has(id));
    const goals = blueprint.goals.map((goal, index) => {
      if (index >= LIMITS.goals || !authorized(goal.sourceObservationIds)) fail();
      return { id: `goal-${digest([ownerId, goal.value])}`, summary: text(`我想在眼前的选择中顾及：${goal.value}。`, maximum),
        priority: 3 - index, status: 'active', reviewAt: now + 300 * (index + 1),
        sourceObservationIds: sources(goal.sourceObservationIds) };
    });
    const beliefs = blueprint.beliefs.map(belief => {
      if (!authorized(belief.sourceObservationIds)
        || !supported(belief.summary, belief.sourceObservationIds.map(id => context.observations.get(id)))) fail();
      const row = { summary: belief.summary, confidence: 'likely', sourceObservationIds: sources(belief.sourceObservationIds),
        label: DECISION_SUBJECTIVE_LABEL };
      return { id: beliefId(row), ...row };
    });
    const relationships = blueprint.relationships.map(relationship => {
      if (!authorized(relationship.sourceObservationIds)
        || !supported(relationship.summary, relationship.sourceObservationIds.map(id => context.observations.get(id)))) fail();
      const row = { targetHandle: relationship.targetHandle, subjectiveSummary: relationship.summary, confidence: 'likely',
        distance: relationship.distance, sourceObservationIds: sources(relationship.sourceObservationIds), label: DECISION_SUBJECTIVE_LABEL };
      return { id: relationshipId(row), ...row };
    });
    const state = parseState({ version: DECISION_STATE_VERSION, ...pin, goals, beliefs, relationships });
    owners.set(state, ownerId); return state;
  });
}

/* Exact proposal schemas (no extra keys, source arrays always nonempty):
 * goal: {kind:'goal', id, status, priority:1..3, reviewAt, sourceObservationIds}
 * belief: {kind:'belief', summary, confidence:'uncertain'|'likely', sourceObservationIds, contradicts?}
 * relationship: {kind:'relationship', targetHandle, subjectiveSummary,
 *                confidence:'uncertain'|'likely', distanceChange:-1|0|1, sourceObservationIds}
 * Goal text/persona cannot be changed. Exact assessments append to working
 * memory, then archive under pressure; links and sources are never rewritten.
 * Bounded archive cache release never deletes historic committed snapshots.
 */
function proposal(input) {
  if (!plain(input)) fail();
  const kind = field(input, 'kind');
  if (kind === 'goal') {
    const row = object(input, ['kind', 'id', 'status', 'priority', 'reviewAt', 'sourceObservationIds']);
    return { kind, id: identifier(row.id), status: status(row.status), priority: integer(row.priority, 1, 3),
      reviewAt: time(row.reviewAt), sourceObservationIds: sources(row.sourceObservationIds) };
  }
  if (kind === 'belief') {
    const row = object(input, ['kind', 'summary', 'confidence', 'sourceObservationIds', 'contradicts'],
      ['kind', 'summary', 'confidence', 'sourceObservationIds']);
    return { kind, summary: text(row.summary), confidence: confidence(row.confidence), sourceObservationIds: sources(row.sourceObservationIds),
      ...(row.contradicts === undefined ? {} : { contradicts: identifier(row.contradicts) }) };
  }
  if (kind === 'relationship') {
    const row = object(input, ['kind', 'targetHandle', 'subjectiveSummary', 'confidence', 'distanceChange', 'sourceObservationIds']);
    return { kind, targetHandle: identifier(row.targetHandle), subjectiveSummary: text(row.subjectiveSummary),
      confidence: confidence(row.confidence), distanceChange: integer(row.distanceChange, -1, 1), sourceObservationIds: sources(row.sourceObservationIds) };
  }
  fail();
}
// A deliberately conservative screen, not an entailment engine. A citation is
// necessary but not sufficient: reject asserted certainty, mind-reading and
// foretold outcomes. Every admitted entry still carries the host's warning.
const SELF = /^(?:我(?:暂时|目前|仍然|仍|还|也|个人|有些|不|更|愿意|倾向|希望|想|觉得|认为|怀疑|担心|感到|感觉|相信|对)|对我而言|在我看来|I\s+(?:(?:currently|still|tentatively)\s+)?(?:think|suspect|feel|worry|hope|want|prefer|remain|am|do\s+not)|To\s+me\b|In\s+my\s+view\b)/iu;
const CERTAIN = /(?<!不)确定|(?<!不)肯定|必定|必然|一定会|毫无疑问|已证实|客观(?:事实|真相)|事实证明|事实就是|真正的凶手|凶手就是|已经和解|已经原谅|将会|未来(?:案件|凶手|结局)|下一(?:起|个)案件|\b(?:certain(?:ly|ty)?|definitely|guaranteed|objectively|proven|omniscient)\b|\bwill\s+(?:die|kill|murder)\b/iu;
const OTHER_MIND = /(?:她们|他们|她|他|对方|别人|所有人|大家)(?:的(?:内心|心里))?(?:其实|已经|一定|必然|真的|仍然|仍|也|都|不|很|可能|也许|会|正|在|并|完全|早就|总是|从来|愿意|不愿意|\s)*(?:想|认为|相信|知道|原谅|信任|爱|恨|喜欢|讨厌|害怕|打算|决定|感到|愿意)|\b(?:she|he|they|everyone|someone|the\s+other\s+person)\s+(?:(?:already|really|secretly|probably|may|might|must|does\s+not|do\s+not)\s+)*(?:thinks?|believes?|knows?|forgives?|trusts?|loves?|hates?|wants?|feels?|intends?)\b/iu;
const STOP = new Set(['我想', '觉得', '我觉', '认为', '我认', '怀疑', '我怀', '可能', '也许', '暂时', '目前', '在我', '看来', '自己', '对方', '仍然', '眼前', '个人', '担心', '我担', '愿意', '不愿', '我对', '对我', '而言', '感觉', '我感', 'think', 'suspect', 'feel', 'maybe', 'perhaps', 'likely', 'uncertain', 'currently', 'still', 'this', 'that', 'with', 'have', 'from', 'about', 'would', 'could', 'should', 'there', 'their']);
function grounded(summary, observations) {
  const corpus = observations.map(row => row.text.toLowerCase()).join('\n');
  const words = summary.toLowerCase().match(/[a-z]{3,}|[\p{Script=Han}]+/gu) ?? [];
  return words.some(word => /^[a-z]/u.test(word) ? !STOP.has(word) && corpus.includes(word)
    : [...word].some((_, index, letters) => index + 1 < letters.length && !STOP.has(letters[index] + letters[index + 1])
      && corpus.includes(letters[index] + letters[index + 1])));
}
const NAMED_MIND = /(?:艾玛|希罗|安安|诺亚|蕾雅|米莉亚|玛格|奈叶香|亚里沙|雪莉|汉娜|可可|梅露露|典狱长|\b[A-Z][a-z]{1,40}\b)(?:其实|已经|仍然|可能|也许|\s)*(?:想|认为|相信|知道|原谅|信任|爱|恨|喜欢|讨厌|害怕|打算|决定|感到|\s+(?:thinks?|believes?|knows?|forgives?|trusts?|loves?|hates?|wants?|feels?|intends?)\b)|(?:相信|信任|原谅|喜欢|讨厌|恨|爱)我|\b(?:trusts?|likes?|loves?|hates?|forgives?|believes?)\s+(?:me|us)\b/u;
function subjective(summary) { return SELF.test(summary) && !CERTAIN.test(summary) && !OTHER_MIND.test(summary) && !NAMED_MIND.test(summary); }
function supported(summary, observations) { return subjective(summary) && grounded(summary, observations); }

const emptyCounts = () => ({ goals: 0, beliefs: 0, relationships: 0 });
const stateBytes = state => Buffer.byteLength(JSON.stringify(state), 'utf8');
const latestRelationship = (state, target) => state.relationships.findLast(row => row.targetHandle === target)
  ?? state.archive?.relationships.findLast(row => row.targetHandle === target);
function archiveRecord(state, key, row, effects) {
  state.archive ??= { goals: [], beliefs: [], relationships: [] };
  if (!state.archive[key].some(old => same(old, row))) {
    state.archive[key].push(row); effects.archived[key]++;
  }
}
function workingVictim(state, key) {
  if (key === 'relationships') {
    // History never crowds out a target's latest one-way attitude. Only if all
    // slots represent different targets does the oldest target leave working
    // memory; its exact current attitude stays pinned in the archive.
    const superseded = state.relationships.findIndex((row, index, rows) => rows.slice(index + 1).some(next => next.targetHandle === row.targetHandle));
    return superseded < 0 ? 0 : superseded;
  }
  const contrary = new Set(recordsOf(state, 'beliefs').map(row => row.contradicts));
  const unfinished = new Set(state.goals.filter(row => row.status !== 'completed').flatMap(row => row.sourceObservationIds));
  const candidates = state.beliefs.slice(0, -1).map((row, index) => ({ index,
    rank: contrary.has(row.id) ? 0 : row.sourceObservationIds.some(id => unfinished.has(id)) ? 2 : 1 }));
  return candidates.sort((a, b) => a.rank - b.rank || a.index - b.index)[0].index;
}
function archiveCandidates(state, key) {
  const rows = state.archive?.[key] ?? [];
  const journal = new Set((state.lifecycle?.events ?? []).filter(row => row.kind !== 'goal').map(row => row.id));
  const activeTargets = new Set(state.relationships.map(row => row.targetHandle));
  const direct = new Set([...state.beliefs.map(row => row.contradicts), ...state.relationships.map(row => row.previousId)]);
  return rows.map((row, index) => {
    const currentTarget = key === 'relationships' && !activeTargets.has(row.targetHandle)
      && rows.findLast(entry => entry.targetHandle === row.targetHandle).id === row.id;
    const anchor = key === 'relationships' && rows.find(entry => entry.targetHandle === row.targetHandle).id === row.id;
    return { key, index, rank: direct.has(row.id) ? 2 : anchor ? 1 : 0,
      pinned: key !== 'goals' && (currentTarget || journal.has(row.id)) };
  }).filter(row => !row.pinned).sort((a, b) => a.rank - b.rank || a.index - b.index);
}
function trimArchive(state, effects) {
  for (const key of recordKinds) {
    while ((state.archive?.[key].length ?? 0) > ARCHIVE_LIMITS[key]) {
      const candidate = archiveCandidates(state, key)[0];
      if (!candidate) return 'archive_capacity';
      state.archive[key].splice(candidate.index, 1); effects.released[key]++;
    }
  }
  while (stateBytes(state) > MAX_STATE_BYTES) {
    const candidate = recordKinds.flatMap(key => archiveCandidates(state, key))
      .sort((a, b) => a.rank - b.rank || recordKinds.indexOf(a.key) - recordKinds.indexOf(b.key) || a.index - b.index)[0];
    if (!candidate) return 'state_capacity';
    state.archive[candidate.key].splice(candidate.index, 1); effects.released[candidate.key]++;
  }
}
// All semantic admission checks precede cloning, archiving, source rotation or
// distance spending. A rejected proposal cannot age, release or reorder memory.
function applyProposal(state, update, { now, context, targets, distanceSpent, templates }) {
  const evidence = update.sourceObservationIds.map(id => context.observations.get(id));
  if (evidence.some(row => !row)) return { reason: 'sources_unavailable' };
  let previous; let spent; let row; let id; let candidate; let victim = -1;
  if (update.kind === 'goal') {
    previous = state.goals.find(row => row.id === update.id);
    if (!previous) {
      candidate = templates?.get(update.id);
      if (!candidate) return { reason: 'unknown_goal' };
      if (retiredGoal(state, update.id) || recordsOf(state, 'goals').some(goal => goal.id === update.id)) return { reason: 'completed_goal' };
      if (candidate.sourceObservationIds.some(sourceId => !context.observations.has(sourceId)
        || !update.sourceObservationIds.includes(sourceId))) return { reason: 'sources_unavailable' };
      const contextual = state.goals.findIndex(goal => situationalGoalIdentity(goal, context.ownerId));
      if (contextual >= 0) {
        if (state.goals[contextual].status !== 'completed') return { reason: 'situational_goal_limit' };
        victim = contextual;
      } else if (state.goals.length >= LIMITS.goals) {
        // Keep stable persona values distinct from the single contextual slot.
        // Only a terminal working record may leave; preserve it exactly.
        victim = state.goals.findLastIndex(goal => goal.status === 'completed');
        if (victim < 0) return { reason: 'goal_capacity' };
      }
    }
    if (!future(update.reviewAt, now)) return { reason: 'review_window' };
    if (previous?.status === 'completed' && update.status !== 'completed') return { reason: 'completed_goal' };
    id = update.id;
  } else {
    const summary = update.kind === 'belief' ? update.summary : update.subjectiveSummary;
    if (!supported(summary, evidence)) return { reason: 'unsupported_inference' };
    if (update.kind === 'belief') {
      if (update.contradicts !== undefined && !recordsOf(state, 'beliefs').some(row => row.id === update.contradicts)) return { reason: 'unknown_contradiction' };
      row = { summary: update.summary, confidence: update.confidence, sourceObservationIds: [...update.sourceObservationIds],
        label: DECISION_SUBJECTIVE_LABEL, ...(update.contradicts === undefined ? {} : { contradicts: update.contradicts }) };
      id = beliefId(row);
      if (recordsOf(state, 'beliefs').some(entry => entry.id === id)) return { reason: 'duplicate' };
    } else {
      if (!targets.has(update.targetHandle) || update.targetHandle === context.ownerId) return { reason: 'target_unavailable' };
      previous = latestRelationship(state, update.targetHandle);
      spent = (distanceSpent.get(update.targetHandle) ?? 0) + Math.abs(update.distanceChange);
      const distance = (previous?.distance ?? 0) + update.distanceChange;
      if (spent > 1 || distance < -3 || distance > 3) return { reason: 'distance_budget' };
      if (previous && previous.subjectiveSummary === update.subjectiveSummary && previous.confidence === update.confidence
        && previous.distance === distance && same(previous.sourceObservationIds, update.sourceObservationIds)) return { reason: 'duplicate' };
      row = { targetHandle: update.targetHandle, subjectiveSummary: update.subjectiveSummary, confidence: update.confidence,
        distance, sourceObservationIds: [...update.sourceObservationIds], label: DECISION_SUBJECTIVE_LABEL,
        ...(previous ? { previousId: previous.id } : {}) };
      id = relationshipId(row);
    }
  }
  const next = structuredClone(state);
  const effects = { archived: emptyCounts(), released: emptyCounts(), consolidatedGoals: 0, restoredRelationships: 0 };
  if (update.kind === 'goal') {
    if (candidate) {
      if (victim >= 0) archiveRecord(next, 'goals', next.goals.splice(victim, 1)[0], effects);
      next.goals.push({ id, summary: candidate.summary, priority: update.priority, status: update.status,
        reviewAt: update.reviewAt, sourceObservationIds: [...update.sourceObservationIds] });
    } else {
      const goal = next.goals.find(row => row.id === id);
      let combined = [...new Set([...goal.sourceObservationIds, ...update.sourceObservationIds])].sort();
      if (combined.length > LIMITS.sources) {
        archiveRecord(next, 'goals', structuredClone(goal), effects);
        // Prefer the newly grounded decision evidence, then stable old IDs.
        // The old complete revision is retained, never silently source-stripped.
        combined = [...update.sourceObservationIds, ...goal.sourceObservationIds.filter(id => !update.sourceObservationIds.includes(id))]
          .slice(0, LIMITS.sources).sort();
        // A contextual ID binds its original request forever; source rotation
        // may not sever that immutable link, even after many later reviews.
        const bound = situationalGoalIdentity(goal, context.ownerId)?.sourceId;
        if (bound !== undefined && !combined.includes(bound)) return { reason: 'goal_source_capacity' };
        effects.consolidatedGoals++;
      }
      Object.assign(goal, { status: update.status, priority: update.priority, reviewAt: update.reviewAt, sourceObservationIds: combined });
    }
  } else {
    const key = update.kind === 'belief' ? 'beliefs' : 'relationships';
    if (key === 'relationships' && previous && !state.relationships.some(row => row.id === previous.id)) effects.restoredRelationships++;
    next[key].push({ id, ...row });
    while (next[key].length > LIMITS[key]) archiveRecord(next, key, next[key].splice(workingVictim(next, key), 1)[0], effects);
  }
  const event = update.kind === 'goal' ? { ...structuredClone(update), previous: candidate ? null : structuredClone(previous) } : { kind: update.kind, id };
  next.lifecycle = { policy: DECISION_LIFECYCLE_POLICY, sequence: integer((state.lifecycle?.sequence ?? 0) + 1),
    events: [...(state.lifecycle?.events ?? []), event].slice(-LIMITS.updates),
    ...(state.lifecycle?.retiredGoalIds === undefined ? {} : { retiredGoalIds: state.lifecycle.retiredGoalIds }) };
  // Bounded monotone tombstones survive exact archive-cache release. False
  // positives safely defer a novel request; a completed contextual ID can never
  // become novel again when its old body ages out of working/archive memory.
  if (update.kind === 'goal' && update.status === 'completed'
    && situationalGoalIdentity(next.goals.find(goal => goal.id === id), context.ownerId)) retireGoal(next, id);
  const capacity = trimArchive(next, effects);
  if (capacity) return { reason: capacity };
  if (candidate && victim >= 0 && !next.archive?.goals.some(goal => same(goal, state.goals[victim]))) {
    return { reason: 'archive_capacity' };
  }
  if (update.kind === 'relationship') distanceSpent.set(update.targetHandle, spent);
  const reason = effects.consolidatedGoals ? 'sources_consolidated' : effects.restoredRelationships ? 'archived_target_revisited'
    : Object.values(effects.archived).some(Boolean) ? 'history_archived' : 'adopted';
  return { state: parseState(next), id, reason, effects };
}
function lifecycleSummary(state, effects) {
  return { policy: DECISION_LIFECYCLE_POLICY, ...effects,
    working: Object.fromEntries(recordKinds.map(key => [key, state[key].length])),
    archive: Object.fromEntries(recordKinds.map(key => [key, state.archive?.[key].length ?? 0])), stateBytes: stateBytes(state) };
}
/** Detached result; all reasons/counters are safe, host-authored trace metadata. */
export function reviewDecisionState(current, updates, options) {
  return safely(() => {
    let state = parseState(current);
    const args = object(options, ['observations', 'worldTime', 'allowedTargets'], ['observations', 'worldTime']);
    const now = worldTime(args.worldTime);
    const targets = new Set(unique(list(args.allowedTargets ?? [], 128).map(identifier)));
    const context = observationContext(args.observations, now, owners.get(current), state);
    // Validate the ENTIRE proposal batch before adopting anything.
    const proposals = list(updates, LIMITS.updates).map(proposal);
    const adopted = []; const deferred = []; const distanceSpent = new Map();
    const effects = { archived: emptyCounts(), released: emptyCounts(), consolidatedGoals: 0, restoredRelationships: 0 };
    for (const [index, update] of proposals.entries()) {
      const result = applyProposal(state, update, { now, context, targets, distanceSpent });
      if (!result.state) { deferred.push({ index, kind: update.kind, reason: result.reason }); continue; }
      state = result.state;
      for (const key of recordKinds) {
        effects.archived[key] += result.effects.archived[key]; effects.released[key] += result.effects.released[key];
      }
      effects.consolidatedGoals += result.effects.consolidatedGoals; effects.restoredRelationships += result.effects.restoredRelationships;
      adopted.push({ index, kind: update.kind, id: result.id, reason: result.reason });
    }
    if (context.ownerId !== undefined) owners.set(state, context.ownerId);
    return { state, adopted, deferred, lifecycle: lifecycleSummary(state, effects) };
  });
}

// Scene journals are host-owned delivery receipts, not an alternative proposal
// schema. Validate the complete receipt before any adoption and never carry a
// per-beat reset of the update or one-way relationship-distance budgets.
function sceneJournal(input) {
  let previousBeat = 0; let previousTime = 0;
  return list(input, 2).map(entry => {
    const row = object(entry, ['beat', 'worldTime', 'allowedTargets', 'updates', 'sourceObservationIds', 'goalTemplates'],
      ['beat', 'worldTime', 'allowedTargets', 'updates', 'sourceObservationIds']);
    const beat = integer(row.beat, 1, 3); const now = worldTime(integer(row.worldTime));
    if (beat <= previousBeat || now < previousTime) fail();
    previousBeat = beat; previousTime = now;
    return { beat, worldTime: now,
      allowedTargets: unique(list(row.allowedTargets, 128).map(identifier)),
      updates: list(row.updates, LIMITS.updates).map(proposal),
      sourceObservationIds: unique(list(row.sourceObservationIds, 4096).map(identifier)),
      ...(row.goalTemplates === undefined ? {} : { goalTemplates: goalTemplates(row.goalTemplates) }) };
  });
}
function sceneObservationContext(input, now, ownerHint, state) {
  const context = observationContext(input, now, ownerHint, state, true);
  // Scene evidence is a complete owner-local execution timeline. Unlike the
  // legacy reducer, scene calls require explicit execution/acquisition scope.
  for (const row of list(input, 4096)) {
    if (ownerOf(row) !== context.ownerId) continue;
    identifier(field(row, 'branchId')); integer(field(row, 'generation'), 1); integer(field(row, 'revision'));
    integer(field(row, 'occurredAt')); integer(field(row, 'learnedAt'));
  }
  if (allSources(state).some(id => !context.observations.has(id))
    || state.goals.filter(goal => situationalGoalIdentity(goal, context.ownerId)).length > 1) fail();
  return context;
}
/** Replay one owner's complete scene receipt from its original baseline.
 * Retained working/archive evidence remains in the host timeline, but only a
 * beat's explicitly delivered full IDs can ground that beat's new proposals.
 * Optional goalTemplates are host-authorized candidates, never proposal text.
 * A per-entry list fences authorization to that beat; options.goalTemplates is
 * a convenience fallback for a host replay without a per-entry list. No due-
 * goal scheduling or action permission is granted by this reducer.
 */
export function reviewSceneDecisionState(initial, journal, options) {
  return safely(() => {
    let state = parseState(initial);
    const args = object(options, ['ownerId', 'observations', 'goalTemplates'], ['observations']);
    const ownerId = args.ownerId === undefined ? owners.get(initial) : identifier(args.ownerId);
    if (owners.has(initial) && ownerId !== owners.get(initial)) fail();
    const entries = sceneJournal(journal);
    const now = entries[0]?.worldTime ?? Number.MAX_SAFE_INTEGER;
    const timeline = sceneObservationContext(args.observations, Number.MAX_SAFE_INTEGER, ownerId, state);
    const fallbackTemplates = args.goalTemplates === undefined ? [] : goalTemplates(args.goalTemplates, timeline.ownerId);
    const entryTemplates = new Map(entries.map(entry => [entry.beat, goalTemplates(entry.goalTemplates ?? fallbackTemplates, timeline.ownerId)]));
    // Retained cognition must predate this scene, not acquire future authority
    // just because its source will be present in the final SQL commit.
    const baseline = observationContext(args.observations, now, timeline.ownerId, state, true);
    if (allSources(state).some(id => !baseline.observations.has(id))) fail();
    const adopted = []; const deferred = []; const distanceSpent = new Map();
    const allTargets = new Set(entries.flatMap(entry => entry.allowedTargets));
    for (const entry of entries) {
      const available = observationContext(args.observations, entry.worldTime, timeline.ownerId, state, true);
      const delivered = new Set(entry.sourceObservationIds);
      const context = { ownerId: timeline.ownerId,
        observations: new Map([...available.observations].filter(([id]) => delivered.has(id))) };
      const targets = new Set(entry.allowedTargets);
      for (const [index, update] of entry.updates.entries()) {
        if (adopted.length >= LIMITS.updates) {
          deferred.push({ beat: entry.beat, index, kind: update.kind, reason: 'update_budget' }); continue;
        }
        const result = applyProposal(state, update, { now: entry.worldTime, context, targets, distanceSpent,
          templates: new Map(entryTemplates.get(entry.beat).map(row => [row.id, row])) });
        if (!result.state) { deferred.push({ beat: entry.beat, index, kind: update.kind, reason: result.reason }); continue; }
        state = result.state;
        adopted.push({ beat: entry.beat, index, kind: update.kind, id: result.id, reason: result.reason });
      }
    }
    if (timeline.ownerId !== undefined) owners.set(state, timeline.ownerId);
    return { state, adopted, deferred, budget: { updatesRemaining: LIMITS.updates - adopted.length,
      relationshipRemaining: [...allTargets].sort().map(targetHandle => ({ targetHandle,
        remaining: 1 - (distanceSpent.get(targetHandle) ?? 0) })) } };
  });
}

const TABLES = {
  decision_state_schema: ['version'],
  cognition_decision_states: ['id', 'run_id', 'origin_branch_id', 'commit_ref', 'owner_id', 'state_json', 'world_time', 'revision', 'origin_generation', 'schema_version'],
};
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS decision_state_schema (version INTEGER NOT NULL) STRICT;
  CREATE TABLE IF NOT EXISTS cognition_decision_states (
    id TEXT PRIMARY KEY, run_id TEXT NOT NULL, origin_branch_id TEXT NOT NULL,
    commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref), owner_id TEXT NOT NULL,
    state_json TEXT NOT NULL CHECK(json_valid(state_json) AND length(CAST(state_json AS BLOB)) <= ${MAX_STATE_BYTES}),
    world_time INTEGER NOT NULL CHECK(world_time >= 0), revision INTEGER NOT NULL CHECK(revision >= 0),
    origin_generation INTEGER NOT NULL CHECK(origin_generation >= 1), schema_version INTEGER NOT NULL CHECK(schema_version = 1),
    UNIQUE(commit_ref, owner_id)
  ) STRICT;
  CREATE INDEX IF NOT EXISTS cognition_decision_states_owner ON cognition_decision_states(run_id, owner_id, commit_ref);
`;
// parent_commit_ref is the EFFECTIVE narrative parent on loads/rewinds. The
// abandoned execution head (previous_execution_ref) is deliberately never read.
const HISTORY = COGNITION_HISTORY_SQL;
const AUTHORIZED = DECISION_AUTHORIZED_SQL;
function validateLegacyTransition(previous, next, worldTime) {
  const baseline = previous ?? { version: DECISION_STATE_VERSION, goals: [], beliefs: [], relationships: [] };
  for (const key of ['goals', 'beliefs', 'relationships']) {
    if (key !== 'goals' && !same(next[key].slice(0, baseline[key].length), baseline[key])) fail();
    if (previous && key === 'goals' && !same(next.goals.map(row => row.id), baseline.goals.map(row => row.id))) fail();
    for (const old of baseline[key]) {
      const row = next[key].find(entry => entry.id === old.id);
      if (!row) fail(); // No quiet removal/overwriting of counterevidence.
      if (key !== 'goals') { if (!same(row, old)) fail(); continue; }
      if (row.summary !== old.summary || old.sourceObservationIds.some(id => !row.sourceObservationIds.includes(id))
        || (old.status === 'completed' && row.status !== 'completed')) fail();
      if (!same(row, old) && !future(row.reviewAt, worldTime)) fail();
    }
  }
  if (previous && next.goals.some(row => !previous.goals.some(old => old.id === row.id))) fail();
  for (const row of next.goals) if (!baseline.goals.some(old => old.id === row.id) && !future(row.reviewAt, worldTime)) fail();
  let changes = 0;
  for (const row of next.goals) if (!baseline.goals.some(old => same(old, row))) changes++;
  const knownBeliefs = new Set(baseline.beliefs.map(row => row.id));
  for (const row of next.beliefs) {
    if (knownBeliefs.has(row.id)) continue;
    if (row.contradicts !== undefined && !knownBeliefs.has(row.contradicts)) fail();
    knownBeliefs.add(row.id); changes++;
  }
  const latest = new Map(); const spent = new Map();
  for (const row of baseline.relationships) latest.set(row.targetHandle, row);
  const oldRelations = new Set(baseline.relationships.map(row => row.id));
  for (const row of next.relationships) {
    if (oldRelations.has(row.id)) continue;
    const old = latest.get(row.targetHandle);
    if (row.previousId !== old?.id) fail();
    const delta = Math.abs(row.distance - (old?.distance ?? 0));
    const total = (spent.get(row.targetHandle) ?? 0) + delta;
    if (total > 1) fail();
    spent.set(row.targetHandle, total); latest.set(row.targetHandle, row); changes++;
  }
  // Initial authored goals are not proposals; at most six subsequent changes.
  if (changes - (previous ? 0 : next.goals.length) > LIMITS.updates) fail();
}
function validateTransition(previous, next, now, observations, ownerId) {
  if (!next.lifecycle) {
    if (previous?.lifecycle) fail(); // A packet projection is never persistent authority.
    validateLegacyTransition(previous, next, now);
    return;
  }
  const sequence = previous?.lifecycle?.sequence ?? 0;
  const changes = next.lifecycle.sequence - sequence;
  if (changes < 0 || changes > LIMITS.updates || changes > next.lifecycle.events.length) fail();
  const events = next.lifecycle.events.slice(next.lifecycle.events.length - changes);
  const goals = structuredClone(next.goals); const seeded = new Set();
  if (!previous) for (const event of events) if (event.kind === 'goal' && !seeded.has(event.id)) {
    const index = goals.findIndex(goal => goal.id === event.id);
    if (index < 0 || event.previous.id !== event.id) fail();
    goals[index] = structuredClone(event.previous); seeded.add(event.id);
  }
  const baseline = previous ?? { version: DECISION_STATE_VERSION, goals, beliefs: [], relationships: [] };
  const retained = [...(baseline.lifecycle?.events ?? []), ...events].slice(-LIMITS.updates);
  if (!same(retained, next.lifecycle.events)) fail();
  const context = observationContext(observations, now, ownerId, baseline);
  const distanceSpent = new Map(); let replay = structuredClone(baseline);
  for (const event of events) {
    let update;
    if (event.kind === 'goal') {
      const { previous: old, ...proposed } = event;
      if (!same(replay.goals.find(row => row.id === event.id), old)) fail();
      update = proposed;
    } else {
      const key = event.kind === 'belief' ? 'beliefs' : 'relationships';
      const row = recordsOf(next, key).find(row => row.id === event.id);
      if (!row) fail();
      update = event.kind === 'belief' ? { kind: 'belief', summary: row.summary, confidence: row.confidence,
        sourceObservationIds: row.sourceObservationIds, ...(row.contradicts === undefined ? {} : { contradicts: row.contradicts }) }
        : { kind: 'relationship', targetHandle: row.targetHandle, subjectiveSummary: row.subjectiveSummary,
          confidence: row.confidence, distanceChange: row.distance - (latestRelationship(replay, row.targetHandle)?.distance ?? 0),
          sourceObservationIds: row.sourceObservationIds };
      update = proposal(update);
    }
    const result = applyProposal(replay, update, { now, context,
      // Perception handles are checked at review/operation boundaries. Persistence
      // independently checks owner, evidence, distance and exact prior linkage.
      targets: new Set(update.kind === 'relationship' ? [update.targetHandle] : []), distanceSpent });
    if (!result.state || (event.kind !== 'goal' && result.id !== event.id)) fail();
    replay = result.state;
  }
  if (!previous) for (const goal of replay.goals) if (!future(goal.reviewAt, now)) fail();
  // The existing host scheduler may defer a due review without proposing new
  // prose. Permit only that field, within the same existing review window.
  for (const goal of replay.goals) {
    const actual = next.goals.find(row => row.id === goal.id);
    if (actual && actual.reviewAt !== goal.reviewAt && goal.reviewAt <= now && future(actual.reviewAt, now)) goal.reviewAt = actual.reviewAt;
  }
  if (!same(replay, next)) fail(); // Exact replay prevents quiet pruning or reset.
  return baseline;
}

/** Host-only append-only snapshots. Constructor performs no database I/O. */
export class DecisionStateStore {
  #db;
  #cacheLatest = false;
  #statements = new Map();
  constructor(db, { cacheLatest = false } = {}) {
    safely(() => {
      if (!db || typeof db.prepare !== 'function' || typeof db.exec !== 'function' || typeof db.isTransaction !== 'boolean'
        || typeof cacheLatest !== 'boolean') fail();
      this.#db = db; this.#cacheLatest = cacheLatest;
    });
  }
  // HOST-only opt-in for the owning private connection: reuse at most the two
  // known #latest templates. Every read still executes with fresh complete
  // bindings; no result, lease or authorization decision is cached.
  #latestStatement(sql, key) {
    if (!this.#cacheLatest) return this.#db.prepare(sql);
    const cached = this.#statements.get(key);
    if (cached) return cached;
    if (this.#statements.size >= 2) fail();
    const statement = this.#db.prepare(sql); this.#statements.set(key, statement); return statement;
  }
  #operation(mutation, operation) {
    return safely(() => {
      if (mutation && !this.#db.isTransaction) fail();
      const savepoint = `decision_${randomUUID().replaceAll('-', '')}`;
      const sqlScope = openSqliteScope(this.#db, savepoint);
      try {
        const result = operation(); sqlScope.release(); return result;
      } catch (error) {
        try { sqlScope.rollback(); } catch { /* Preserve a safe failure. */ }
        throw error;
      }
    });
  }
  #version() {
    const entry = this.#db.prepare("SELECT type FROM sqlite_schema WHERE name = 'decision_state_schema'").get();
    if (!entry) return false;
    if (entry.type !== 'table') fail();
    const rows = this.#db.prepare('SELECT version FROM decision_state_schema LIMIT 2').all();
    if (rows.length !== 1 || rows[0].version !== DECISION_STATE_VERSION) fail();
    return true;
  }
  #ready() { if (!this.#version()) fail(); }
  /** Caller must initialize and append in its own domain transaction. */
  initialize() {
    return this.#operation(true, () => {
      this.#statements.clear();
      const existing = this.#version(); // Reject unknown versions before edits.
      if (existing) {
        for (const [table, expected] of Object.entries(TABLES)) {
          const entry = this.#db.prepare('SELECT type FROM sqlite_schema WHERE name = ?').get(table);
          const actual = this.#db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name);
          if (entry?.type !== 'table' || !same(actual, expected)) fail();
        }
      } else if (this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE name GLOB 'decision_state_*' OR name GLOB 'cognition_decision_states*' LIMIT 1").get()) fail();
      this.#db.prepare('SELECT commit_ref, run_id, branch_id, parent_commit_ref, sequence, generation, revision, world_time FROM domain_commits LIMIT 0').all();
      this.#db.prepare(`SELECT id, run_id, origin_branch_id, commit_ref, owner_id, channel, occurred_at, learned_at,
        revision, origin_generation, schema_version FROM cognition_observations LIMIT 0`).all();
      this.#db.prepare('SELECT run_id, origin_branch_id, commit_ref, owner_id, observation_id FROM cognition_revocations LIMIT 0').all();
      this.#db.exec(SCHEMA);
      for (const table of Object.keys(TABLES)) {
        for (const action of ['UPDATE', 'DELETE']) this.#db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_immutable_${action.toLowerCase()}
          BEFORE ${action} ON ${table} BEGIN SELECT RAISE(ABORT, 'immutable decision state'); END`);
        const conflict = table === 'decision_state_schema' ? '1' : 'id = NEW.id OR (commit_ref = NEW.commit_ref AND owner_id = NEW.owner_id)';
        this.#db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_immutable_replace BEFORE INSERT ON ${table}
          WHEN EXISTS (SELECT 1 FROM ${table} WHERE ${conflict}) BEGIN SELECT RAISE(ABORT, 'immutable decision state'); END`);
      }
      if (!existing) this.#db.prepare('INSERT INTO decision_state_schema(version) VALUES(?)').run(DECISION_STATE_VERSION);
      return { schemaVersion: DECISION_STATE_VERSION };
    });
  }
  #head(commitRef) {
    identifier(commitRef);
    const head = this.#db.prepare(`SELECT commit_ref, run_id, branch_id, parent_commit_ref, sequence,
      generation, revision, world_time FROM domain_commits WHERE commit_ref = ?`).get(commitRef);
    if (!head) fail();
    const scope = { commitRef, runId: identifier(head.run_id), branchId: identifier(head.branch_id),
      generation: integer(head.generation, 1), revision: integer(head.revision), worldTime: integer(head.world_time) };
    worldTime(scope.worldTime);
    const history = this.#db.prepare(`${HISTORY} SELECT * FROM history ORDER BY depth`).all({ $commitRef: commitRef, $runId: scope.runId });
    if (!history.length || history.length > MAX_ANCESTORS) fail();
    const seen = new Set();
    for (const [index, row] of history.entries()) {
      identifier(row.commit_ref); identifier(row.branch_id); integer(row.sequence); integer(row.generation, 1);
      integer(row.revision); integer(row.world_time);
      if (seen.has(row.commit_ref) || row.run_id !== scope.runId || row.parent_commit_ref !== (history[index + 1]?.commit_ref ?? null)) fail();
      seen.add(row.commit_ref);
    }
    return scope;
  }
  #bindings(scope) { return { $commitRef: scope.commitRef, $runId: scope.runId, $actorId: scope.actorId, $worldTime: scope.worldTime }; }
  #visibleSources(scope, ids) {
    if (!ids.length) return new Set();
    const rows = this.#db.prepare(`${AUTHORIZED} SELECT id FROM visible_observations
      WHERE id IN (SELECT value FROM json_each($ids))`).all({ ...this.#bindings(scope), $ids: JSON.stringify(ids) });
    return new Set(rows.map(row => row.id));
  }
  #sourceObservations(scope, ids) {
    if (!ids.length) return [];
    // JSON/source text is read only after the same owner, narrative ancestry,
    // revocation and watermark predicates used for persistent authorization.
    const rows = this.#db.prepare(`${AUTHORIZED} SELECT o.id, o.text, o.channel, o.occurred_at, o.learned_at,
      p.source_actor_handle, p.source_relation
      FROM cognition_observations o JOIN visible_observations v ON v.id = o.id
      LEFT JOIN cognition_observation_performers p ON p.observation_id = o.id
      WHERE o.run_id = $runId AND o.owner_id = $actorId AND o.id IN (SELECT value FROM json_each($ids))
      ORDER BY o.id COLLATE BINARY`).all({ ...this.#bindings(scope), $ids: JSON.stringify(ids) });
    const observations = rows.map(row => ({ id: row.id, text: row.text, channel: row.channel,
      ...(row.source_actor_handle ? { sourceActorHandle: row.source_actor_handle, sourceRelation: row.source_relation } : {}),
      actorId: scope.actorId, branchId: scope.branchId, generation: scope.generation, revision: scope.revision,
      occurredAt: row.occurred_at, learnedAt: row.learned_at }));
    observationContext(observations, scope.worldTime, scope.actorId);
    return observations;
  }
  #latest(scope, excludeCurrent = false) {
    // A revoked source is valid historical evidence, unlike a missing/foreign
    // or forged reference. Validate that distinction before projecting prose.
    const entries = (kind, archive = false) => `json((SELECT coalesce(json_group_array(json(entry)),'[]') FROM (
      SELECT w.entry FROM working_entries w WHERE w.kind='${kind}' AND w.ordinal${archive ? '<' : '>='}1000
        AND NOT EXISTS(SELECT 1 FROM blocked_entries b WHERE b.kind=w.kind AND b.ordinal=w.ordinal)
        ${kind === 'relationships' ? "AND NOT EXISTS(SELECT 1 FROM blocked_targets t WHERE t.target=json_extract(w.entry,'$.targetHandle'))" : ''}
      ORDER BY w.ordinal)))`;
    // Run, owner, narrative ancestry and original commit watermarks are SQL
    // predicates BEFORE state_json can enter JavaScript. No other payload read.
    const sql = `${AUTHORIZED}, latest_snapshot AS MATERIALIZED (
      SELECT s.state_json,s.schema_version,s.world_time,h.depth FROM cognition_decision_states s JOIN history h
        ON h.commit_ref=s.commit_ref AND h.run_id=s.run_id AND h.branch_id=s.origin_branch_id
      WHERE s.run_id = $runId AND s.owner_id = $actorId AND s.world_time<=$worldTime
        AND s.world_time=h.world_time AND s.revision=h.revision AND s.origin_generation=h.generation
        ${excludeCurrent ? 'AND h.depth>0' : ''} ORDER BY h.depth LIMIT 1
    ), working_entries AS MATERIALIZED (
      SELECT 'goals' AS kind,j.value AS entry,j.key+1000 AS ordinal FROM latest_snapshot s,json_each(s.state_json,'$.goals') j
      UNION ALL SELECT 'beliefs',j.value,j.key+1000 FROM latest_snapshot s,json_each(s.state_json,'$.beliefs') j
      UNION ALL SELECT 'relationships',j.value,j.key+1000 FROM latest_snapshot s,json_each(s.state_json,'$.relationships') j
      UNION ALL SELECT 'goals',j.value,j.key FROM latest_snapshot s,json_each(s.state_json,'$.archive.goals') j
      UNION ALL SELECT 'beliefs',j.value,j.key FROM latest_snapshot s,json_each(s.state_json,'$.archive.beliefs') j
      UNION ALL SELECT 'relationships',j.value,j.key FROM latest_snapshot s,json_each(s.state_json,'$.archive.relationships') j
      UNION ALL SELECT 'lifecycle',json_extract(j.value,'$.previous'),j.key FROM latest_snapshot s,json_each(s.state_json,'$.lifecycle.events') j
        WHERE json_type(j.value,'$.previous')='object'
    ), source_entries AS MATERIALIZED (
      SELECT entry FROM working_entries
      UNION ALL SELECT j.value FROM latest_snapshot s,json_each(s.state_json,'$.lifecycle.events') j
        WHERE json_extract(j.value,'$.kind')='goal'
    ), invalid_sources AS MATERIALIZED (
      SELECT 1 FROM source_entries e WHERE json_type(e.entry,'$.sourceObservationIds') IS NOT 'array'
        OR json_array_length(e.entry,'$.sourceObservationIds') NOT BETWEEN 1 AND ${LIMITS.sources}
        OR (SELECT count(*) FROM json_each(e.entry,'$.sourceObservationIds'))<>
          (SELECT count(DISTINCT value) FROM json_each(e.entry,'$.sourceObservationIds'))
        OR EXISTS(SELECT 1 FROM json_each(e.entry,'$.sourceObservationIds') ref WHERE ref.type<>'text'
          OR NOT EXISTS(SELECT 1 FROM acquired_observations a JOIN cognition_observations o ON o.id=a.id
            JOIN history h ON h.commit_ref=o.commit_ref CROSS JOIN latest_snapshot s
            WHERE a.id=ref.value AND h.depth>=s.depth AND o.learned_at<=s.world_time))
    ), blocked_entries AS MATERIALIZED (
      SELECT w.kind,w.ordinal,
        EXISTS(SELECT 1 FROM json_each(w.entry,'$.sourceObservationIds') ref JOIN known_observations known ON known.id=ref.value
          WHERE NOT EXISTS(SELECT 1 FROM visible_observations v WHERE v.id=ref.value)) AS magic_blocked
      FROM working_entries w WHERE EXISTS(SELECT 1 FROM json_each(w.entry,'$.sourceObservationIds') ref
        JOIN acquired_observations acquired ON acquired.id=ref.value
        WHERE NOT EXISTS(SELECT 1 FROM visible_observations v WHERE v.id=ref.value))
    ), blocked_targets AS MATERIALIZED (
      SELECT json_extract(w.entry,'$.targetHandle') AS target FROM working_entries w
      JOIN blocked_entries b ON b.kind=w.kind AND b.ordinal=w.ordinal WHERE w.kind='relationships'
        AND NOT EXISTS(SELECT 1 FROM working_entries newer WHERE newer.kind='relationships'
          AND json_extract(newer.entry,'$.targetHandle')=json_extract(w.entry,'$.targetHandle') AND newer.ordinal>w.ordinal)
    ), projected_snapshot AS MATERIALIZED (
      SELECT schema_version,state_json,CASE WHEN EXISTS(SELECT 1 FROM invalid_sources) THEN NULL
        WHEN EXISTS(SELECT 1 FROM blocked_entries WHERE magic_blocked=1) THEN
          json_object('version',json_extract(state_json,'$.version'),
            'goals',${entries('goals')},'beliefs',${entries('beliefs')},'relationships',${entries('relationships')})
        WHEN EXISTS(SELECT 1 FROM blocked_entries) THEN
          json_set(CASE WHEN json_type(state_json,'$.archive')='object' THEN
            json_set(state_json,'$.archive.goals',${entries('goals', true)},
              '$.archive.beliefs',${entries('beliefs', true)},'$.archive.relationships',${entries('relationships', true)}) ELSE state_json END,
            '$.goals',${entries('goals')},'$.beliefs',${entries('beliefs')},'$.relationships',${entries('relationships')})
        ELSE state_json END AS projected_json FROM latest_snapshot
    ) SELECT schema_version,json_extract(state_json,'$.relationshipContextVersion') AS relationship_context_version,CASE WHEN EXISTS(SELECT 1 FROM blocked_entries WHERE kind='lifecycle')
        AND NOT EXISTS(SELECT 1 FROM blocked_entries WHERE magic_blocked=1) THEN
      json_set(projected_json,'$.lifecycle.events',json((SELECT coalesce(json_group_array(json(entry)),'[]') FROM (
        SELECT CASE WHEN EXISTS(SELECT 1 FROM blocked_entries b WHERE b.kind='lifecycle' AND b.ordinal=j.key) THEN
          json_object('kind','goal','id',json_extract(j.value,'$.id'),'status',json_extract(j.value,'$.status'),
            'priority',json_extract(j.value,'$.priority'),'reviewAt',json_extract(j.value,'$.reviewAt'),
            'sourceObservationIds',json(json_extract(j.value,'$.sourceObservationIds')),'previous',NULL)
          ELSE j.value END AS entry FROM json_each(state_json,'$.lifecycle.events') j ORDER BY j.key))))
      ELSE projected_json END AS state_json FROM projected_snapshot`;
    const row = this.#latestStatement(sql, excludeCurrent ? 'exclude-current' : 'latest').get(this.#bindings(scope));
    if (!row) return null;
    // SQL suppresses whole assessments and superseded target attitudes before
    // any prose leaves SQLite. Permanent revocation preserves the safe archive
    // and journal metadata, replacing only hidden previous-goal bodies by null;
    // temporary magic retains its existing working-only projection. Neither
    // path rewrites the immutable original snapshot or strips record sources.
    if (row.schema_version !== DECISION_STATE_VERSION || typeof row.state_json !== 'string'
      || Buffer.byteLength(row.state_json, 'utf8') > MAX_STATE_BYTES) fail();
    const wire = JSON.parse(row.state_json);
    if (row.relationship_context_version === 1 && !Object.hasOwn(wire, 'relationshipContextVersion')) wire.relationshipContextVersion = 1;
    const state = parseState(wire);
    this.#assertContextPolicy(scope, state);
    const ids = allSources(state);
    // Defense in depth is rejection, never a second silent JS filter that
    // could disguise an unauthorized body already crossing the SQL boundary.
    if (this.#visibleSources(scope, ids).size !== ids.length) fail();
    owners.set(state, scope.actorId);
    return state;
  }
  #seedGoals(scope, previous, state, baseline) {
    const canonical = agentActor(scope.actorId);
    const authored = canonical?.persona.values;
    const fresh = (baseline?.goals ?? state.goals).filter(goal => !previous?.goals.some(old => old.id === goal.id));
    for (const goal of recordsOf(state, 'goals')) {
      const value = goalValue(goal, scope.actorId);
      if (value === undefined || (authored && !authored.slice(0, LIMITS.goals).includes(value))) fail();
    }
    const ids = [...new Set(fresh.flatMap(goal => goal.sourceObservationIds))];
    if (!ids.length) return;
    const rows = this.#db.prepare(`${AUTHORIZED} SELECT o.id FROM cognition_observations o JOIN visible_observations v ON v.id = o.id
      WHERE o.run_id = $runId AND o.owner_id = $actorId AND o.channel = 'private_recollection'
        AND o.id IN (SELECT value FROM json_each($ids))`).all({ ...this.#bindings(scope), $ids: JSON.stringify(ids) });
    if (rows.length !== ids.length) fail();
  }
  #relationshipRoot(scope) {
    const run = this.#db.prepare('SELECT * FROM domain_runs WHERE run_id=?').get(scope.runId);
    const root = this.#db.prepare(`${HISTORY} SELECT c.* FROM history h JOIN domain_commits c USING(commit_ref)
      WHERE h.parent_commit_ref IS NULL AND h.sequence=0`).get({ $commitRef: scope.commitRef, $runId: scope.runId });
    const setup = run && this.#db.prepare('SELECT * FROM domain_setups WHERE setup_ref=? AND run_id=?').get(run.initial_setup_ref, scope.runId);
    return relationshipRootForRows({ run, root, setup });
  }
  #assertContextPolicy(scope, state) {
    const exists = this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='domain_setups'").get();
    const policy = exists && this.#db.prepare(`SELECT json_extract(s.manifest,'$.executionRevision.revisionId') AS revision_id
      FROM domain_runs r JOIN domain_setups s ON s.setup_ref=r.initial_setup_ref AND s.run_id=r.run_id WHERE r.run_id=?`).get(scope.runId);
    const expected = isRelationshipRuntime(policy?.revision_id) ? 1 : undefined;
    if (state.relationshipContextVersion !== expected) fail();
    if (expected === 1 && !this.#relationshipRoot(scope).setup.actors.some(actor => actor.id === scope.actorId)) fail();
  }
  /** Explicit root-only host entry; ordinary legacy append never reads world JSON. */
  appendInitial(input) {
    return this.#operation(true, () => {
      this.#ready();
      const args = object(input, ['commitRef', 'ownerId']);
      const ownerId = identifier(args.ownerId); const scope = this.#head(args.commitRef);
      const head = this.#db.prepare('SELECT parent_commit_ref,sequence,snapshot_json FROM domain_commits WHERE commit_ref=?').get(scope.commitRef);
      if (head.parent_commit_ref !== null || head.sequence !== 0) fail();
      const snapshot = JSON.parse(head.snapshot_json);
      if (snapshot.exampleId !== 'agent') fail();
      const runtime = runtimeRevisionForState(snapshot);
      const actor = runtime.actors.find(row => row.id === ownerId)
        ?? (ownerId === 'player' && snapshot.creation?.playerMode === 'custom'
          ? { id: 'player', persona: { values: snapshot.creation.character.desire ? [snapshot.creation.character.desire] : [] } } : undefined);
      if (!actor) fail();
      const verified = isRelationshipRuntime(runtime) ? this.#relationshipRoot({ ...scope, actorId: ownerId }) : null;
      const blueprint = verified ? relationshipOwnerBlueprint(verified.setup, ownerId, verified.context)
        : bunkPsychologyBlueprint(snapshot, psychologySeedBlueprint(runtime, actor, scope.commitRef));
      // Authored recollections still originate at zero; review deadlines begin
      // at the actual root handoff after any canonical source prologue.
      return this.#append({ commitRef: scope.commitRef, ownerId,
        state: authoredInitialDecisionState(verified?.setup.actors.find(row => row.id === ownerId) ?? actor, blueprint, { worldTime: scope.worldTime }) }, blueprint);
    });
  }
  #sceneSocialRequests(scope, job, base, snapshot, entry, runtime) {
    return safely(() => {
      // The sealed task's social projection is not itself proof that a request
      // exists. Rebuild host metadata from the effective base plus sealed prefix
      // events; neither packet prose nor templateId can manufacture a request.
      if (runtime.policy.conversationVersion !== 1) return [];
      const baseRow = this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE commit_ref=?').get(base.commit_ref);
      const baseState = JSON.parse(baseRow.snapshot_json);
      if (runtimeRevisionForState(baseState).id !== runtime.id) fail();
      let conversation = validateConversationState(baseState.agentAutonomy?.conversation ?? initialConversationState());
      if (this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='agent_turn_stages'").get()) {
        const stages = this.#db.prepare(`SELECT stage,base_commit_ref,receipt_json,receipt_hash,previous_hash
          FROM agent_turn_stages WHERE job_id=? AND branch_id=? AND generation=? AND base_revision=? AND stage<? ORDER BY stage`)
          .all(job.job_id, job.branch_id, job.generation, job.base_revision, entry.beat);
        if (stages.length !== entry.beat) fail();
        let previousHash = null;
        for (const [index, stage] of stages.entries()) {
          const receipt = sealedJSON(stage.receipt_json, stage.receipt_hash);
          if (stage.stage !== index || stage.base_commit_ref !== base.commit_ref || stage.previous_hash !== previousHash
            || receipt.stage !== index || receipt.baseCommitRef !== base.commit_ref || receipt.previousHash !== previousHash
            || receipt.contentFingerprint !== runtime.content.fingerprint || !same(receipt.executionRevision, runtime.executionRevision)) fail();
          previousHash = stage.receipt_hash;
          const eventClockVersion = receipt.conversationEventClockVersion === 1 ? 1 : undefined;
          for (const event of list(receipt.events, 128)) {
            if (!plain(event)) fail();
            if (!['speech', 'writing'].includes(field(event, 'delivery'))
              || field(event, 'observationKey') === undefined || field(event, 'speakerId') === undefined) continue;
            const eventId = identifier(field(event, 'observationKey')); const speakerId = identifier(field(event, 'speakerId'));
            const audience = unique(list(field(event, 'audienceIds'), 16).map(identifier));
            const addressees = unique(list(field(event, 'addresseeIds') ?? [], 16).map(identifier)).filter(id => audience.includes(id));
            const communication = field(event, 'communication') ?? { kind: 'statement' };
            if (!plain(communication)) fail();
            const occurredAt = integer(field(event, 'occurredAt'));
            const learnedAt = integer(field(event, 'learnedAt') ?? occurredAt);
            if (occurredAt > learnedAt || learnedAt > entry.worldTime) fail();
            conversation = applyConversationEvent(conversation, { id: eventId, speakerId, addresseeIds: addressees,
              audienceIds: audience, observationIdsByActor: Object.fromEntries(audience.map(ownerId =>
                [ownerId, actorObservationId(snapshot, eventId, ownerId)])), occurredAt, kind: field(communication, 'kind'),
              ...(field(communication, 'replyToObservationId') === undefined ? {} : { replyToObservationId: field(communication, 'replyToObservationId') }) },
            { worldTime: eventClockVersion === 1 ? occurredAt : Math.max(conversation.worldTime ?? 0, learnedAt) }).state;
          }
        }
      } else if (entry.beat !== 1) fail();
      conversation = advanceConversationState(conversation, { worldTime: entry.worldTime }).state;
      return conversation.requests.filter(request => request.recipientId === scope.actorId
        // Match the live social projection, including accepted commitments.
        // Template derivation separately restricts new goals to pending requests.
        && ['pending', 'deferred', 'accepted'].includes(request.status) && request.expiresAt > entry.worldTime).slice(0, MAX_GOAL_TEMPLATES)
        .map(request => ({ id: request.id, kind: request.kind, sourceObservationId: request.sourceObservationId,
          senderHandle: `person-${createHash('sha256').update(JSON.stringify(['actor-view@1', scope.actorId, request.senderId])).digest('hex').slice(0, 16)}`,
          status: request.status, reviewAt: request.reviewAt, expiresAt: request.expiresAt }));
    }, 'scene_social_requests_mismatch');
  }
  #sceneTasks(scope, journal) {
    // Only this explicit scene entry reads the committed action and sealed job.
    // Ordinary append/read retain their original no-world-payload behavior.
    const row = this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE commit_ref=?').get(scope.commitRef);
    const snapshot = JSON.parse(row.snapshot_json); const runtime = runtimeRevisionForState(snapshot);
    const action = snapshot.agentActions?.at(-1);
    if (runtime.policy.sceneBeatVersion !== 1 || action?.type !== 'scene' || action.sceneBeatVersion !== 1
      || snapshot.worldTime !== scope.worldTime) fail('scene_action_mismatch');
    const jobId = identifier(action.jobId);
    const job = this.#db.prepare(`SELECT job_id,branch_id,generation,base_revision,status,context_json,context_hash
      FROM agent_turn_jobs WHERE job_id=? AND status IN ('running','committed')`).get(jobId);
    if (!job) fail('scene_job_mismatch');
    const plan = safely(() => sealedJSON(job.context_json, job.context_hash), 'scene_plan_mismatch');
    if (plan.version !== (hasSoftRuntime(runtime.id) ? 7 : 6) || plan.jobId !== jobId || !same(plan.executionRevision, runtime.executionRevision)
      || plan.contentFingerprint !== runtime.content.fingerprint) fail('scene_plan_mismatch');
    const origin = plan.regeneration?.checkpoint;
    if (origin && runtimeRevisionForState(origin).id !== runtime.id) fail('scene_base_mismatch');
    const baseGeneration = integer(origin?.generation ?? job.generation, 1);
    const baseRevision = integer(origin?.revision ?? job.base_revision);
    const base = this.#db.prepare(`${HISTORY} SELECT commit_ref FROM history WHERE ${origin ? 'depth>0' : 'depth=1'}
      AND generation=$generation AND revision=$revision ${origin ? '' : 'AND branch_id=$branchId'} LIMIT 1`)
      .get({ $commitRef: scope.commitRef, $runId: scope.runId, $generation: baseGeneration, $revision: baseRevision,
        ...(origin ? {} : { $branchId: identifier(job.branch_id) }) });
    if (!base) fail('scene_base_mismatch');
    const scheduling = plan.schedulingVersion === 1;
    if ((plan.schedulingVersion !== undefined && !scheduling)
      || (scheduling ? action.schedulingVersion !== 1
        : action.schedulingVersion !== undefined || action.schedulingBeats !== undefined || action.schedulingEnd !== undefined)) fail('scene_scheduling_mismatch');
    if ((plan.decisionAuditVersion !== undefined && (plan.decisionAuditVersion !== 1 || !scheduling))
      || (plan.decisionAuditVersion === 1 ? action.decisionAuditVersion !== 1 : action.decisionAuditVersion !== undefined)) fail('scene_scheduling_mismatch');
    let previousBeat = 0; let decisions = 0; const calls = new Map(); const actionBeats = new Map();
    const schedulingByBeat = new Map();
    if (scheduling) {
      const frames = safely(() => list(action.schedulingBeats, 3), 'scene_scheduling_mismatch');
      if (frames.length !== list(action.beats, 3).length || !plain(action.schedulingEnd)) fail('scene_scheduling_mismatch');
      frames.forEach((frame, index) => {
        if (!plain(frame) || frame.beat !== index + 1) fail('scene_scheduling_mismatch');
        schedulingByBeat.set(frame.beat, frame);
      });
    }
    const budget = runtime.policy.sceneBudget;
    for (const raw of list(action.beats, 3)) {
      const beat = object(raw, ['beat', 'phase', 'decisions'], ['beat', 'decisions']);
      const number = integer(beat.beat, 1, 3);
      if (number <= previousBeat || (beat.phase !== undefined && !['reaction', 'npc'].includes(beat.phase))) fail('scene_action_mismatch');
      previousBeat = number;
      const entries = unique(list(beat.decisions, 3).map(value => object(value, ['actorId', 'proposal'])), value => identifier(value.actorId));
      for (const entry of entries) {
        calls.set(entry.actorId, (calls.get(entry.actorId) ?? 0) + 1);
        if (++decisions > budget.decisions || calls.size > budget.actors || calls.get(entry.actorId) > budget.perActor) fail('scene_action_mismatch');
      }
      actionBeats.set(number, entries);
    }
    const stored = this.#db.prepare(`SELECT slot FROM agent_turn_tasks
      WHERE job_id=? AND actor_id=? AND role='roleplay' AND slot GLOB 'npc:*' LIMIT 3`).all(jobId, scope.actorId);
    if (stored.length > 2) fail('scene_task_result_mismatch');
    // Interrupted batches may contain unused sibling results. The committed
    // scheduler ledger, relative to this sealed base, identifies actual calls;
    // an omitted earlier completion cannot be hidden to revive a goal later.
    const considered = this.#db.prepare(`SELECT json_extract(d.value,'$.sceneBeat') AS beat
      FROM domain_commits c, json_each(c.snapshot_json,'$.agentAutonomy.decisions') d
      WHERE c.commit_ref=$commitRef AND json_extract(d.value,'$.actorId')=$actorId
        AND CAST(d.key AS INTEGER)>=COALESCE((SELECT json_array_length(snapshot_json,'$.agentAutonomy.decisions')
          FROM domain_commits WHERE commit_ref=$baseRef),0)
      ORDER BY CAST(d.key AS INTEGER) LIMIT 3`)
      .all({ $commitRef: scope.commitRef, $actorId: scope.actorId, $baseRef: base.commit_ref });
    const consideredBeats = unique(considered.map(value => integer(value.beat, 1, 3)));
    const expectedBeats = [...actionBeats].filter(([beat, entries]) => consideredBeats.includes(beat)
      && entries.some(entry => entry.actorId === scope.actorId)).map(([beat]) => beat);
    if (consideredBeats.length > 2 || consideredBeats.length !== expectedBeats.length
      || !same(journal.map(entry => entry.beat), expectedBeats)) fail('scene_journal_mismatch');
    const templateContexts = new Map();
    for (const entry of journal) {
      if (entry.worldTime > scope.worldTime) fail('scene_journal_mismatch');
      const decision = actionBeats.get(entry.beat)?.find(value => value.actorId === scope.actorId);
      if (!decision) fail('scene_journal_mismatch');
      const slot = `npc:${entry.beat}:${scope.actorId}`;
      const taskRow = this.#db.prepare(`SELECT input_json,input_hash,result_json,result_hash FROM agent_turn_tasks
        WHERE job_id=? AND actor_id=? AND role='roleplay' AND slot=?`).get(jobId, scope.actorId, slot);
      if (!taskRow) fail('scene_task_result_mismatch');
      const task = safely(() => sealedJSON(taskRow.input_json, taskRow.input_hash, MAX_OBSERVATION_BYTES), 'scene_task_result_mismatch');
      const result = safely(() => sealedJSON(taskRow.result_json, taskRow.result_hash, MAX_STATE_BYTES), 'scene_task_result_mismatch');
      safely(() => {
        if (task.id !== slot || task.role !== 'roleplay' || task.actorId !== scope.actorId
          || !same(decision.proposal, result) || !plain(result)
          || !same(entry.updates, list(result.stateUpdates ?? [], LIMITS.updates).map(proposal))) fail();
      }, 'scene_task_result_mismatch');
      if (scheduling && (task.sceneFrame === undefined || !same(task.scheduling, schedulingByBeat.get(entry.beat)))) fail('scene_scheduling_mismatch');
      if (task.sceneFrame !== undefined) {
        const frame = safely(() => object(task.sceneFrame, ['beat', 'worldTime', 'prefixHash']), 'scene_task_frame_mismatch');
        if (frame.beat !== entry.beat || frame.worldTime !== entry.worldTime
          || typeof frame.prefixHash !== 'string' || !/^[a-f0-9]{64}$/u.test(frame.prefixHash)) fail('scene_task_frame_mismatch');
        if (this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='agent_turn_stages'").get()) {
          const stage = this.#db.prepare(`SELECT receipt_hash FROM agent_turn_stages WHERE job_id=? AND stage=?
            AND branch_id=? AND generation=? AND base_revision=? AND base_commit_ref=?`)
            .get(jobId, entry.beat - 1, job.branch_id, job.generation, job.base_revision, base.commit_ref);
          if (!stage || stage.receipt_hash !== frame.prefixHash) fail('scene_task_frame_mismatch');
        }
      }
      if (!plain(task.context)) fail('scene_task_scope_mismatch');
      const execution = safely(() => object(task.context.scope, ['actorId', 'branchId', 'generation', 'revision']), 'scene_task_scope_mismatch');
      if (execution.actorId !== scope.actorId || execution.branchId !== job.branch_id
        || execution.generation !== job.generation || execution.revision !== job.base_revision) fail('scene_task_scope_mismatch');
      const delivered = safely(() => {
        const ids = unique(list(task.context.observations, 4096).map(observation => {
          if (ownerOf(observation) !== scope.actorId || field(observation, 'branchId') !== execution.branchId
            || field(observation, 'generation') !== execution.generation
            || integer(field(observation, 'revision')) > execution.revision) fail();
          return identifier(field(observation, 'id'));
        }));
        sceneObservationContext(task.context.observations, entry.worldTime, scope.actorId,
          { version: DECISION_STATE_VERSION, goals: [], beliefs: [], relationships: [] });
        return ids;
      }, 'scene_source_visibility');
      safely(() => {
        if (!same([...entry.sourceObservationIds].sort(), [...delivered].sort())
          || !plain(task.context.situation)
          || !same([...entry.allowedTargets].sort(), unique(list(task.context.situation.perceivedParticipants ?? [], 128).map(identifier)).sort())) fail();
        if (task.trace !== undefined && (!plain(task.trace)
          || task.trace.contextHash !== createHash('sha256').update(JSON.stringify(task.context)).digest('hex')
          || !same([...delivered].sort(), unique(list(task.trace.deliveredObservationIds, 4096).map(identifier)).sort()))) fail();
      }, 'scene_delivery_mismatch');
      // Even unused delivered IDs must be owner-local and already acquired.
      // Read metadata, not all delivered private bodies, to establish that fact.
      if (this.#visibleSources({ ...scope, worldTime: entry.worldTime }, delivered).size !== delivered.length) fail('scene_source_visibility');
      const advertised = field(task.context, 'goalTemplates');
      if (entry.goalTemplates !== undefined || advertised !== undefined) {
        if (entry.goalTemplates === undefined || advertised === undefined
          || runtime.policy.situationalGoalTemplates !== SITUATIONAL_GOAL_TEMPLATE_POLICY
          || !plain(task.context.decisionPolicy) || field(task.context.decisionPolicy, 'version') !== 2) fail('scene_goal_templates_mismatch');
        const candidates = safely(() => {
          const candidates = goalTemplates(advertised, scope.actorId);
          if (!same(candidates, goalTemplates(entry.goalTemplates, scope.actorId))) fail();
          return candidates;
        }, 'scene_goal_templates_mismatch');
        const requests = this.#sceneSocialRequests(scope, job, base, snapshot, entry, runtime);
        safely(() => {
          if (!same(requests, list(task.context.situation.socialRequests ?? [], 32).map(socialRequest))) fail();
        }, 'scene_social_requests_mismatch');
        templateContexts.set(entry.beat, { policy: runtime.policy, requests, candidates,
          observations: task.context.observations });
      }
    }
    return templateContexts;
  }
  /** Host-only cumulative scene snapshot; never pass through final-now legacy
   * validation, which would invalidate legitimate earlier-beat review windows.
   */
  appendSceneTransition(input) {
    return this.#operation(true, () => {
      this.#ready();
      const args = object(input, ['commitRef', 'ownerId', 'journal', 'state']);
      const scope = { ...this.#head(args.commitRef), actorId: identifier(args.ownerId) };
      const state = safely(() => parseState(args.state), 'scene_state_mismatch');
      const journal = safely(() => sceneJournal(args.journal), 'scene_journal_mismatch');
      const templateContexts = this.#sceneTasks(scope, journal);
      // A scene cannot be a lazy first write. In the authored runtime every
      // owner must already have its sealed root, even if a later snapshot exists.
      const root = this.#db.prepare(`${HISTORY} SELECT 1 FROM cognition_decision_states s JOIN history h
        ON h.commit_ref=s.commit_ref AND h.run_id=s.run_id AND h.branch_id=s.origin_branch_id
        WHERE h.depth>0 AND h.parent_commit_ref IS NULL AND h.sequence=0 AND s.world_time=h.world_time
          AND s.run_id=$runId AND s.owner_id=$actorId AND s.schema_version=1
          AND s.revision=h.revision AND s.origin_generation=h.generation LIMIT 1`)
        .get({ $commitRef: scope.commitRef, $runId: scope.runId, $actorId: scope.actorId });
      const previous = this.#latest(scope, true);
      if (!root || !previous) fail('scene_baseline_missing');
      const ids = allSources(state);
      if (this.#visibleSources(scope, ids).size !== ids.length) fail('scene_source_visibility');
      const validationIds = [...new Set([...allSources(previous), ...ids,
        ...journal.flatMap(entry => entry.updates.flatMap(update => update.sourceObservationIds
          .filter(id => entry.sourceObservationIds.includes(id)))),
        ...[...templateContexts.values()].flatMap(context => context.requests.map(request => request.sourceObservationId)
          .filter(id => context.observations.some(observation => observation.id === id)))])];
      list(validationIds, 4096);
      const observations = this.#sourceObservations(scope, validationIds);
      if (observations.length !== validationIds.length) fail('scene_source_visibility');
      const verifiedJournal = journal.map(entry => {
        const context = templateContexts.get(entry.beat);
        if (!context) return entry;
        const full = observations.filter(observation => entry.sourceObservationIds.includes(observation.id));
        const candidates = deriveSituationalGoalTemplates({ ownerId: scope.actorId, policy: context.policy,
          observations: full, socialRequests: context.requests, worldTime: entry.worldTime });
        // Check SQL bodies AND source metadata, not just task/receipt hashes.
        // Host packets may rebind execution watermarks, never these facts.
        for (const id of new Set([...candidates, ...context.candidates].flatMap(candidate => candidate.sourceObservationIds))) {
          const actual = full.find(observation => observation.id === id);
          const delivered = context.observations.find(observation => observation.id === id);
          if (!actual || !delivered || ['text', 'channel', 'occurredAt', 'learnedAt'].some(key => actual[key] !== delivered[key])) fail('scene_source_visibility');
        }
        if (candidates.length !== context.candidates.length || candidates.some((candidate, index) => {
          const advertised = context.candidates[index];
          return candidate.id !== advertised.id || candidate.summary !== advertised.summary
            || !same(candidate.sourceObservationIds, advertised.sourceObservationIds)
            || (advertised.templateId !== undefined && candidate.templateId !== advertised.templateId);
        })) fail('scene_goal_templates_mismatch');
        return { ...entry, goalTemplates: candidates };
      });
      const reviewed = reviewSceneDecisionState(previous, verifiedJournal, { ownerId: scope.actorId, observations });
      if (!same(reviewed.state, state)) fail('scene_state_mismatch');
      return this.#insertSnapshot(scope, state);
    });
  }
  #insertSnapshot(scope, state) {
    this.#assertContextPolicy(scope, state);
    this.#db.prepare(`INSERT INTO cognition_decision_states
      (id, run_id, origin_branch_id, commit_ref, owner_id, state_json, world_time, revision, origin_generation, schema_version)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(randomUUID(), scope.runId, scope.branchId, scope.commitRef,
      scope.actorId, JSON.stringify(state), scope.worldTime, scope.revision, scope.generation);
    owners.set(state, scope.actorId);
    return state;
  }
  append(input) { return this.#append(input); }
  #append(input, initialBlueprint) {
    return this.#operation(true, () => {
      this.#ready();
      const args = object(input, ['commitRef', 'ownerId', 'state']); const ownerId = identifier(args.ownerId);
      const state = parseState(args.state); const scope = { ...this.#head(args.commitRef), actorId: ownerId };
      const ids = allSources(state); const allowed = this.#visibleSources(scope, ids);
      if (allowed.size !== ids.length) fail();
      const previous = this.#latest(scope);
      // Metadata authorizes the full retained cache above. Only the bounded
      // journal's proposal evidence needs full bodies for independent grounding;
      // reading every archived body here would recreate a long-history freeze.
      const validationIds = [...new Set((state.lifecycle?.events ?? []).flatMap(event => {
        if (event.kind === 'goal') return event.sourceObservationIds;
        return recordsOf(state, event.kind === 'belief' ? 'beliefs' : 'relationships')
          .find(row => row.id === event.id)?.sourceObservationIds ?? [];
      }))];
      const observations = state.lifecycle ? this.#sourceObservations(scope, validationIds) : [];
      if (initialBlueprint) {
        // appendInitial already proved this is a player-action-free root.
        if (previous) fail();
        const actualSources = this.#sourceObservations(scope, initialBlueprint.observations.map(row => row.id));
        if (actualSources.length !== initialBlueprint.observations.length || initialBlueprint.observations.some(expected =>
          !actualSources.some(actual => actual.id === expected.id && actual.text === expected.text
            && actual.channel === 'private_recollection' && actual.learnedAt === 0 && actual.occurredAt === 0))) fail();
      } else {
        const baseline = validateTransition(previous, state, scope.worldTime, observations, ownerId);
        this.#seedGoals(scope, previous, state, baseline);
      }
      return this.#insertSnapshot(scope, state);
    });
  }
  #readScope(input) {
    this.#ready();
    const args = object(input, ['commitRef', 'actorId', 'generation', 'revision']);
    const scope = { ...this.#head(args.commitRef), actorId: identifier(args.actorId) };
    if (integer(args.generation, 1) !== scope.generation || integer(args.revision) !== scope.revision) fail();
    return scope;
  }
  /** Full source closure for retained working records; archive is host opt-in. */
  readSourceObservations(input, options = {}) {
    return this.#operation(false, () => {
      const scope = this.#readScope(input);
      const args = object(options, ['includeArchive'], []);
      if (args.includeArchive !== undefined && typeof args.includeArchive !== 'boolean') fail();
      const state = this.#latest(scope);
      return state ? this.#sourceObservations(scope, allSources(state, args.includeArchive ?? false)) : [];
    });
  }
  read(input) {
    return this.#operation(false, () => this.#latest(this.#readScope(input)));
  }
}
