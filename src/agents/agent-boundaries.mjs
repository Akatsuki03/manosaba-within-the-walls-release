import { ADMISSION_RUNTIME_REVISION } from './ordinary-admission32.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { hasSoftRuntime } from '../content/relationship-context-policy.mjs';
import { PUBLICATION_RUNTIME_REVISION } from '../scenes/ordinary-publication31.mjs';
import { isProxy } from 'node:util/types';
import { relationshipPacketPolicy } from '../content/content-revisions.mjs';
import { RELATIONSHIP_CONTEXT_BUDGETS, RELATIONSHIP_DISPLAY_CHARS, RELATIONSHIP_VALUE_CHARS, relationshipContextPin } from '../content/relationship-context-policy.mjs';
import { dialogueContextPin, validateSystemSeal } from '../cognition/dialogue-context-policy.mjs';
import { containsMetaLanguage } from './story-language.mjs';
import { hasMixedUtterance } from '../../public/dialogue-format.mjs';
import { policyForActor, validatePerformancePolicy } from './actor-performance-policy.mjs';
import { assertPerformancePolicy, hasNoncanonicalSelfReference, invalidUtteranceAddress, narrativeGuardDiagnostic } from './narrative-guards.mjs';
import { validateAddressVoice } from './character-address-policy.mjs';

// Preserve only authentic native presentation classifications at this exact
// wrapping boundary. No error properties, candidate body or public cause.
const presentationFailures = new WeakMap();
export const performanceBoundaryDiagnostic = error => presentationFailures.get(error) ?? null;

// Observational only: the first actual roleplay rejection point, never inferred
// from candidate content or error properties. Existing messages/codes/issue and
// retry feedback remain independent of this finite, host-authenticated rule.
export const ROLEPLAY_DECISION_FAILURE_RULES = Object.freeze([
  'roleplay-packet', 'roleplay-scope', 'roleplay-stale', 'roleplay-ballot-structure', 'roleplay-ballot-candidate',
  'roleplay-structure', 'roleplay-required-output', 'roleplay-meta-language', 'roleplay-legacy-decision',
  'roleplay-required-decision', 'roleplay-movement-binding', 'roleplay-review-mode',
  'roleplay-goal-source-permission', 'roleplay-operation-args', 'roleplay-magic-binding',
  'roleplay-operation-target', 'roleplay-operation-object', 'roleplay-required-assessment',
  'roleplay-required-communication', 'roleplay-ordinary-contribution-binding', 'roleplay-communication-binding',
  'roleplay-state-update', 'roleplay-completed-goal', 'roleplay-goal-template-source',
  'roleplay-relationship-budget', 'roleplay-action-capability', 'roleplay-movement',
  'roleplay-intent-capability', 'roleplay-intent-target', 'roleplay-utterance-mixed', 'roleplay-utterance-capability', 'roleplay-self-reference', 'roleplay-address-form',
  'roleplay-goal-source-count', 'roleplay-goal-unavailable', 'roleplay-goal-strategy', 'roleplay-source-undelivered', 'roleplay-operation-permission',
  'roleplay-communication-operation-utterance', 'roleplay-communication-addressee',
  'roleplay-communication-reply-required', 'roleplay-communication-reply-undelivered', 'roleplay-communication-request-sender',
]);
// Safe classifications of the actual rejecting parser, not candidate fields
// or arbitrary exception messages. Shared with the gateway's trace allowlist.
const roleplayShape = new WeakMap();
export const roleplayOutputIssue = error => roleplayShape.get(error);
function markShape(error, issue) {
  if (!roleplayDecisionDiagnostic(error) && error instanceof Error && !roleplayShape.has(error)) roleplayShape.set(error, issue);
}
function shapeCheck(parse, issue) {
  return (value, consume) => { try { return parse(value, consume); }
    catch (error) { markShape(error, issue); throw error; } };
}
const roleplayFailures = new WeakMap();
export const roleplayDecisionDiagnostic = error => roleplayFailures.get(error) ?? null;
function roleplayReject(rule, message, code = 'ERR_AGENT_CONTEXT', issue) {
  const error = Object.assign(new Error(message), { code });
  roleplayFailures.set(error, Object.freeze({ rule }));
  if (issue) roleplayShape.set(error, issue);
  throw error;
}
function roleplayChecked(rule, operation) {
  try { return operation(); }
  catch (error) {
    if (error !== null && ['object', 'function'].includes(typeof error) && !roleplayFailures.has(error))
      roleplayFailures.set(error, Object.freeze({ rule }));
    throw error;
  }
}

// Presentation-only rules may name characters or reveal capabilities. Model
// instructions must be actor-independent; authorized knowledge arrives separately.
const MODEL_DIALOGUE_RULES = Object.freeze({
  speech: 'utterance 只含人物实际说出或写出的原话，发言使用「」、内层引用使用『』；动作、神态、语气与心理描写分开写入 action，不能夹在台词之间。',
  writing: '明确区分书写与有声发言，不把书面内容当作已经说出。',
  magic: '能力表现以实际发生的变化为准，施法意图与最终效果分别表述。',
});
// An utterance needs a known communication capability. Other host-defined action
// labels remain opaque and cannot implicitly grant speech or writing permission.
const COMMUNICATION_ACTIONS = new Set(['speak', 'ask', 'write']);
// Model adapters receive detached, frozen data, never a world/database handle.
const MAX_PACKET_BYTES = 64000;
const MAX_INPUT_BYTES = 256000;
const MAX_ROWS = 128;
const MAX_SCANNED_ROWS = 4096;
const MISSING = Symbol('missing');
// Only host-held originals authorize output. Clones remain safe adapter inputs.
const packets = new WeakMap();
const fail = (message, code = 'ERR_AGENT_CONTEXT') => { throw Object.assign(new Error(message), { code }); };
function checked(code, message, operation, roleplayRule) {
  try { return operation(); }
  catch (error) {
    if (roleplayRule) roleplayReject(roleplayDecisionDiagnostic(error)?.rule ?? roleplayRule, message, code,
      roleplayRule === 'roleplay-structure' ? roleplayShape.get(error) ?? 'npc_shape_envelope' : undefined);
    fail(message, code);
  }
}
const jsonSize = value => Buffer.byteLength(JSON.stringify(value), 'utf8');
const plain = value => value !== null && typeof value === 'object' && !isProxy(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function budget() {
  let used = 0;
  return bytes => {
    used += bytes;
    if (used > MAX_INPUT_BYTES) fail('上下文输入超过预算。', 'ERR_AGENT_CONTEXT_TOO_LARGE');
  };
}
function data(value, key) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) return MISSING;
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail('边界字段必须是普通数据，不能使用访问器。');
  return descriptor.value;
}
function optional(value, key, fallback) {
  const entry = data(value, key);
  return entry === MISSING || entry === undefined ? fallback : entry;
}
function object(value, fields, required, consume, exact = false, shapePath) {
  const reject = (at, message) => {
    try { fail(message); }
    catch (error) { if (shapePath) markShape(error, shapePath + '_' + at); throw error; }
  };
  if (!plain(value)) reject('object', '上下文条目必须是普通数据对象。');
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || (exact && !Object.hasOwn(fields, key)))) reject('keys', '边界包含未许可的字段。');
  if (Object.hasOwn(fields, 'sourceActorHandle') && (Object.hasOwn(value, 'sourceActorHandle') !== Object.hasOwn(value, 'sourceRelation'))) fail('来源角色字段必须成对提供。');
  consume(2);
  const result = {};
  for (const [key, parse] of Object.entries(fields)) {
    try {
      const entry = data(value, key);
      if (entry === MISSING || (!exact && entry === undefined)) {
        if (required.includes(key)) fail('边界缺少必要字段。');
        continue;
      }
      consume(jsonSize(key) + 2);
      result[key] = parse(entry, consume);
    } catch (error) {
      if (shapePath) markShape(error, shapePath + '_' + key);
      throw error;
    }
  }
  if (Object.hasOwn(fields, 'sourceActorHandle') && (Object.hasOwn(result, 'sourceActorHandle') !== Object.hasOwn(result, 'sourceRelation'))) fail('来源角色字段必须成对提供。');
  return result;
}
function text(value, consume, maxLength = 4000) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) fail('文本字段格式错误或过长。');
  consume(jsonSize(value));
  return value;
}
const boundedText = maximum => (value, consume) => text(value, consume, maximum);
// Classify only a rejected value at the actual text boundary. No coercion,
// extraction, default or repair; the old shape validator owns acceptance.
function assessmentText(value, consume) {
  try { return text(value, consume, 400); }
  catch (error) {
    const reason = value === null ? 'null' : typeof value !== 'string' ? 'type' : !value.trim() ? 'blank'
      : value.length > 400 ? 'length' : 'budget';
    markShape(error, 'npc_shape_decision_assessment_' + reason);
    throw error;
  }
}
function identifier(value, consume, maximum = 128) {
  if (typeof value !== 'string' || !value.length || value.length > maximum || value.trim() !== value
    || /[\u0000-\u001f\u007f]/u.test(value)) fail('标识符格式错误。');
  return text(value, consume, maximum);
}
const label = (value, consume) => identifier(value, consume, 64);
const enumeration = values => (value, consume) => {
  if (!values.includes(value)) fail('字段值不在许可范围。');
  return text(value, consume);
};
const limitedInteger = maximum => (value, consume) => {
  const result = revision(value, consume);
  if (result > maximum) fail('数值超过本轮范围。');
  return result;
};
function cognitiveKind(value, consume) {
  if (!['memory', 'belief', 'relationship'].includes(value)) fail('只能交付或提议本角色的记忆、信念与主观关系记录。');
  return text(value, consume);
}
function revision(value, consume) {
  if (!Number.isSafeInteger(value) || value < 0) fail('状态水位必须是非负安全整数。');
  consume(jsonSize(value));
  return value;
}
function generation(value, consume) {
  if (!Number.isSafeInteger(value) || value < 1) fail('执行世代必须是正安全整数。');
  consume(jsonSize(value));
  return value;
}
function list(value, parse, consume, maximum = MAX_ROWS, uniqueBy) {
  if (isProxy(value) || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail('列表必须是普通数据数组。');
  const length = Object.getOwnPropertyDescriptor(value, 'length').value;
  if (length > maximum || Reflect.ownKeys(value).length !== length + 1) fail('列表过长或包含额外字段。');
  consume(2 + length);
  const result = []; const seen = new Set();
  for (let index = 0; index < length; index++) {
    const entry = data(value, String(index));
    if (entry === MISSING) fail('列表不能包含空位。');
    const parsed = parse(entry, consume);
    if (parsed === MISSING) continue;
    if (uniqueBy) {
      const key = uniqueBy(parsed);
      if (seen.has(key)) fail('列表不能包含重复标识符或来源。');
      seen.add(key);
    }
    result.push(parsed);
  }
  return result;
}
const identifiers = (value, consume) => list(value, identifier, consume, 64, entry => entry);
const actions = (value, consume) => list(value, label, consume, 32, entry => entry);
const sources = (value, consume) => {
  const ids = identifiers(value, consume);
  if (!ids.length) fail('观测来源不能为空。');
  return ids;
};
const textOrList = (value, consume) => typeof value === 'string' ? text(value, consume, 2000)
  : list(value, boundedText(256), consume, 32);
const scopeFields = { actorId: identifier, branchId: identifier, generation, revision };
function validateScope(value, consume = budget(), exact = false) {
  return checked('ERR_AGENT_SCOPE', '角色上下文必须绑定合法角色、分支和状态水位。',
    () => object(value, scopeFields, Object.keys(scopeFields), consume, exact));
}
function sameScope(left, right) {
  return Object.keys(scopeFields).every(key => left[key] === right[key]);
}
const summary = boundedText(1000);
const personaFields = { name: boundedText(256), voice: boundedText(2000), values: textOrList, boundaries: textOrList };
const situationFields = { locationLabel: boundedText(256),
  // Owner-local current scene. The label/clock come from the same perception
  // used for locationLabel; the hearing is the owner's actual entry delivered
  // by this pending prefix, never a source effect, hidden grant or another
  // actor's observation. Declared before the long prose so it stays salient.
  currentPlace: (value, consume) => object(value, {
    label: boundedText(256), roomId: identifier, timeLabel: boundedText(64),
  }, ['label'], consume, true),
  currentHearing: (value, consume) => object(value, {
    text: boundedText(4000), occurredAt: revision, heardAtLabel: boundedText(64),
    previouslyHeardAt: revision, previouslyHeardLabel: boundedText(64),
  }, ['text', 'occurredAt', 'heardAtLabel'], consume, true),
  bodyCondition: boundedText(2000), perceivedParticipants: identifiers,
  permittedDestinations: identifiers, candidateIds: identifiers,
  participants: (value, consume) => list(value, (row, charge) => object(row, {
    handle: identifier, label: boundedText(256), appearance: boundedText(1000),
  }, ['handle', 'label'], charge, true), consume, 32, row => row.handle),
  readableIds: identifiers, inspectableIds: identifiers, knownEvidenceIds: identifiers,
  acquiredEvidence: boundedText(6000),
  caseOptions: (value, consume) => list(value, (row, charge) => object(row, {
    id: identifier, label: boundedText(600), kind: label,
  }, ['id', 'label', 'kind'], charge, true), consume, 32, row => row.id),
  objects: (value, consume) => list(value, (row, charge) => object(row, {
    id: identifier, name: boundedText(120), placement: enumeration(['本人持有', '眼前的人携带', '眼前可见']),
  }, ['id', 'name', 'placement'], charge, true), consume, 16, row => row.id),
  // Explicit host metadata only: never infer a request from an observation's
  // wording, or deliver its body, audience or private world state here.
  socialRequests: (value, consume) => list(value, (row, charge) => object(row, {
    id: identifier, kind: enumeration(['ask', 'invite']), sourceObservationId: identifier,
    senderHandle: identifier, status: enumeration(['pending', 'deferred', 'accepted']), reviewAt: revision, expiresAt: revision,
  }, ['id', 'kind', 'sourceObservationId', 'senderHandle', 'status', 'reviewAt', 'expiresAt'], charge, true), consume, 32, row => row.id),
  magicActions: (value, consume) => list(value, (row, charge) => object(row, {
    handle: identifier, label: boundedText(256),
  }, ['handle', 'label'], charge, true), consume, 8, row => row.handle),
  magicTargets: (value, consume) => list(value, (row, charge) => object(row, {
    handle: identifier, label: boundedText(256), sourceObservationId: identifier,
  }, ['handle', 'label'], charge, true), consume, 64, row => row.handle) };
const relationshipSituationFields = { ...situationFields,
  participants: (value, consume) => list(value, (row, charge) => object(row, {
    handle: identifier, label: boundedText(RELATIONSHIP_DISPLAY_CHARS), appearance: boundedText(1000),
  }, ['handle', 'label'], charge, true), consume, 32, row => row.handle),
  caseOptions: (value, consume) => list(value, (row, charge) => object(row, {
    id: identifier, label: boundedText(RELATIONSHIP_DISPLAY_CHARS), kind: label,
  }, ['id', 'label', 'kind'], charge, true), consume, 32, row => row.id),
  magicActions: (value, consume) => list(value, (row, charge) => object(row, {
    handle: identifier, label: boundedText(RELATIONSHIP_DISPLAY_CHARS),
  }, ['handle', 'label'], charge, true), consume, 8, row => row.handle),
  magicTargets: (value, consume) => list(value, (row, charge) => object(row, {
    handle: identifier, label: boundedText(RELATIONSHIP_DISPLAY_CHARS), sourceObservationId: identifier,
  }, ['handle', 'label'], charge, true), consume, 64, row => row.handle),
};
const decisionPolicyFields = {
  version: (value, consume) => { if (value !== 2) fail('决策策略版本无效。'); consume(1); return 2; },
  mode: enumeration(['act', 'review']), maxUpdates: limitedInteger(6), maxUtteranceChars: limitedInteger(400),
  relationshipBudget: (value, consume) => list(value, (row, charge) => object(row, {
    targetHandle: identifier, remaining: limitedInteger(1),
  }, ['targetHandle', 'remaining'], charge, true), consume, 64, row => row.targetHandle),
};
const performerFields = { sourceActorHandle: (value, consume) => {
  if (typeof value !== 'string' || !/^person-[a-f0-9]{16}$/u.test(value)) fail('来源角色必须是本人视角的安全句柄。');
  return identifier(value, consume);
}, sourceRelation: enumeration(['self', 'other']) };
const observationFields = { id: identifier, text, channel: label, revision, occurredAt: revision, learnedAt: revision, ...performerFields };
const observationRequired = ['id', 'text', 'channel', 'revision'];
const memoryFields = { id: identifier, summary, sourceObservationIds: sources, revision };
const relationshipFields = { targetHandle: identifier, subjectiveSummary: summary, revision };
const goalFields = { id: identifier, summary, revision };
const dialogueFields = { speakerHandle: identifier, text, revision };
// Existing record kinds are host-owned labels; only proposed writes have a
// closed cognitive-kind allowlist.
const recordFields = { id: identifier, kind: label, summary, sourceObservationIds: sources, revision };
// Authorized provenance for optional older recall whose body is represented by
// an existing subjective summary. These handles never authorize new data writes.
const recallSourceFields = { id: identifier, channel: label, revision, occurredAt: revision, learnedAt: revision, ...performerFields };
const rulesFields = { speech: text, writing: text, magic: text };
function visible(row, scope, consume) {
  if (!plain(row)) fail('上下文条目必须是普通数据对象。');
  // Stop at the first mismatched boundary: another actor's payload is never read.
  const actorId = data(row, 'actorId');
  if (actorId === MISSING) return false;
  if (identifier(actorId, consume) !== scope.actorId) return false;
  const branchId = data(row, 'branchId');
  if (branchId === MISSING) return false;
  if (identifier(branchId, consume) !== scope.branchId) return false;
  const epoch = data(row, 'generation');
  if (epoch === MISSING) return false;
  if (generation(epoch, consume) !== scope.generation) return false;
  const watermark = data(row, 'revision');
  if (watermark === MISSING) return false;
  return revision(watermark, consume) <= scope.revision;
}
function rows(input, key, scope, fields, required, consume, uniqueBy) {
  const result = list(optional(input, key, []), (row, charge) => visible(row, scope, charge)
    ? object(row, fields, required, charge) : MISSING, consume, MAX_SCANNED_ROWS, uniqueBy);
  if (result.length > MAX_ROWS) fail('已交付记录数量超过上限。');
  return result;
}
function maxBytes(options, ceiling = MAX_PACKET_BYTES) {
  return checked('ERR_AGENT_BUDGET', '上下文预算不合法。', () => {
    const { maxBytes: maximum = 12000 } = object(options, {
      maxBytes: value => {
        if (value === undefined) return 12000;
        if (!Number.isSafeInteger(value) || value < 1024 || value > ceiling) fail('上下文预算不合法。');
        return value;
      },
    }, [], budget(), true);
    return maximum;
  });
}
function freeze(value) {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function finish(packet, maximum, optionalBuckets = []) {
  // Retrievals are relevance-ranked by the host. Validate all admitted input
  // first, then drop only complete lowest-priority optional records.
  for (const bucket of optionalBuckets) {
    while (jsonSize(packet) > maximum && packet[bucket]?.length) packet[bucket].pop();
  }
  if (jsonSize(packet) > maximum) fail('必要上下文超过预算；请缩小当前交付批次，不能截断事实。', 'ERR_AGENT_CONTEXT_TOO_LARGE');
  freeze(packet);
  packets.set(packet, packet.role);
  return packet;
}
export function buildRoleplayContext(input, options = {}) {
  if (!plain(input)) fail('上下文必须是普通数据对象。');
  const relationship = relationshipContextPin(input).relationshipContextVersion === 1
    ? relationshipPacketPolicy(input, data(input, 'initialRunPolicy')) : {};
  const maximum = maxBytes(options, relationship.relationshipContextVersion === 1 ? RELATIONSHIP_CONTEXT_BUDGETS.roleplay : MAX_PACKET_BYTES); const consume = budget();
  const bound = checked('ERR_AGENT_SCOPE', '角色上下文必须绑定合法角色、分支和状态水位。',
    () => validateScope(data(input, 'scope'), consume));
  const pin = dialogueContextPin(input);
  if (data(input, 'systemPolicySeal') !== MISSING && pin.dialogueContextVersion !== 1) fail('传输封存需要明确版本。');
  const packet = {
    role: 'roleplay', scope: bound, ...pin, ...relationship,
    ...(relationship.relationshipContextVersion === 1 ? { initialRunPolicy: data(input, 'initialRunPolicy') } : {}),
    ...(data(input, 'systemPolicySeal') !== MISSING ? { systemPolicySeal: validateSystemSeal(data(input, 'systemPolicySeal')) } : {}),
    dialogueRules: object(pin.dialogueContextVersion === 1 ? { ...MODEL_DIALOGUE_RULES,
      speech: 'utterance 只含实际说出或写出的原话，发言使用「」、内层引用使用『』；action 仅含获准的可观察动作，不放心理描写。复核仅更新状态，不输出正文。' } : MODEL_DIALOGUE_RULES, rulesFields, Object.keys(rulesFields), consume),
    persona: object(data(input, 'persona'), { ...personaFields,
      ...(relationship.relationshipContextVersion === 1 ? { values: (value, charge) => typeof value === 'string' ? text(value, charge, 2000)
        : list(value, boundedText(RELATIONSHIP_VALUE_CHARS), charge, 32) } : {}),
      ...(data(input, 'performancePolicy') !== MISSING ? { appearance: boundedText(1000) } : {}) }, [], consume),
    situation: object(data(input, 'situation'), relationship.relationshipContextVersion === 1 ? relationshipSituationFields : situationFields, [], consume),
    observations: rows(input, 'observations', bound, observationFields, observationRequired, consume, row => row.id),
    memories: rows(input, 'memories', bound, memoryFields, ['id', 'summary', 'revision'], consume, row => row.id),
    relationships: rows(input, 'relationships', bound, relationshipFields, Object.keys(relationshipFields), consume),
    goals: rows(input, 'goals', bound, goalFields, Object.keys(goalFields), consume, row => row.id),
    recentDialogue: rows(input, 'recentDialogue', bound, dialogueFields, Object.keys(dialogueFields), consume),
    allowedActions: actions(optional(input, 'allowedActions', []), consume),
  };
  if (data(input, 'ordinaryParticipationVersion') !== MISSING) {
    if (!hasSoftRuntime(packet.executionRevision?.revisionId) || data(input, 'ordinaryParticipationVersion') !== 1) fail();
    packet.ordinaryParticipationVersion = 1;
    packet.ordinaryInvitation = object(data(input, 'ordinaryInvitation'), {
      attemptRef: enumeration(['a1']), activity: enumeration(['cooperative-rephrase']),
      invitationSourceRef: identifier, scriptSourceRefs: sources,
      criterion: enumeration(['sequence-and-causal-continuity@1']),
    }, ['attemptRef', 'activity', 'invitationSourceRef', 'scriptSourceRefs', 'criterion'], consume, true);
    const offered = packet.ordinaryInvitation;
    if (offered.scriptSourceRefs.length < 1 || offered.scriptSourceRefs.length > 3
      || [...offered.scriptSourceRefs, offered.invitationSourceRef].some(id => !packet.observations.some(row => row.id === id
        && row.channel === 'hearing'))) fail();
  } else if (data(input, 'ordinaryInvitation') !== MISSING) fail();
  const magicCastVersion = data(input, 'npcMagicCastVersion');
  if (magicCastVersion !== MISSING && magicCastVersion !== undefined) {
    if (magicCastVersion !== 1) fail('NPC 魔法施法版本无效。');
    packet.npcMagicCastVersion = 1;
  }
  if (pin.dialogueContextVersion === 1) {
    packet.acquiredBackgroundObservationIds = packet.observations.filter(row => row.channel === 'private_recollection').map(row => row.id);
    packet.currentDeliveryObservationIds = packet.observations.filter(row => row.channel !== 'private_recollection').map(row => row.id);
  }
  if (data(input, 'performancePolicy') !== MISSING) {
    packet.performancePolicy = checked('ERR_AGENT_CONTEXT', '角色表现策略不符合宿主契约。',
      () => validatePerformancePolicy(data(input, 'performancePolicy')));
    consume(jsonSize(packet.performancePolicy));
  }
  if (data(input, 'decisionContext') !== MISSING) {
    packet.decisionContext = object(data(input, 'decisionContext'), {
      version: value => { if (value !== 1) fail('决策契约版本无效。'); return 1; },
      ...(relationship.relationshipContextVersion === 1 ? { relationshipContextVersion: value => { if (value !== 1) fail('关系决策契约版本无效。'); return 1; } } : {}),
      goals: (value, charge) => list(value, (row, cost) => object(row, {
        id: identifier, summary, priority: revision, status: label, reviewAt: revision, sourceObservationIds: sources,
      }, ['id', 'summary', 'priority', 'status', 'reviewAt', 'sourceObservationIds'], cost, true), charge, 3),
      beliefs: (value, charge) => list(value, (row, cost) => object(row, {
        id: identifier, summary, confidence: label, sourceObservationIds: sources, label, contradicts: identifier,
      }, ['id', 'summary', 'confidence', 'sourceObservationIds', 'label'], cost, true), charge, 8),
      relationships: (value, charge) => list(value, (row, cost) => object(row, {
        id: identifier, targetHandle: identifier, subjectiveSummary: summary, confidence: label, label, previousId: identifier,
        distance: value => { if (!Number.isSafeInteger(value) || value < -3 || value > 3) fail('关系距离无效。'); return value; }, sourceObservationIds: sources,
      }, ['id', 'targetHandle', 'subjectiveSummary', 'confidence', 'label', 'distance', 'sourceObservationIds'], cost, true), charge, 16),
    }, ['version', 'goals', 'beliefs', 'relationships', ...(relationship.relationshipContextVersion === 1 ? ['relationshipContextVersion'] : [])], consume, true);
  }
  if (data(input, 'decisionPolicy') !== MISSING) {
    packet.decisionPolicy = object(data(input, 'decisionPolicy'), decisionPolicyFields, Object.keys(decisionPolicyFields), consume, true);
    if (!packet.decisionContext) fail('决策策略必须与本人决策上下文一起交付。');
    if (data(input, 'goalTemplates') !== MISSING) {
      packet.goalTemplates = list(data(input, 'goalTemplates'), (row, charge) => object(row, {
        id: identifier, summary: boundedText(400), sourceObservationIds: sources, templateId: identifier,
      }, ['id', 'summary', 'sourceObservationIds'], charge, true), consume, 4, row => row.id);
      const full = new Set(packet.observations.map(row => row.id));
      if (packet.goalTemplates.some(row => row.sourceObservationIds.length !== 1
        || row.sourceObservationIds.some(id => !full.has(id)))) fail('处境目标模板必须保留已完整交付的本人请求来源。');
    }
  }
  // Source-backed cognition is distinct from observed facts. Keep the generic
  // kinds (belief/relationship/evidence knowledge) rather than relabeling all
  // recall as an episodic memory. Omit the optional field for legacy callers.
  if (data(input, 'recalledRecords') !== MISSING) {
    packet.recalledRecords = rows(input, 'recalledRecords', bound, recordFields,
      ['id', 'kind', 'summary', 'sourceObservationIds', 'revision'], consume, row => row.id);
  }
  if (data(input, 'recallSources') !== MISSING) {
    packet.recallSources = rows(input, 'recallSources', bound, recallSourceFields,
      ['id', 'channel', 'revision'], consume, row => row.id);
    const full = new Set(packet.observations.map(row => row.id));
    const cited = new Set([...(packet.recalledRecords || []), ...(packet.decisionPolicy
      ? ['goals', 'beliefs', 'relationships'].flatMap(key => packet.decisionContext[key]) : [])].flatMap(row => row.sourceObservationIds));
    const compact = new Set(packet.recallSources.map(row => row.id));
    if (packet.recallSources.some(row => full.has(row.id) || !cited.has(row.id))
      || [...cited].some(id => !full.has(id) && !compact.has(id))) fail('压缩来源必须唯一且由已交付的个人记忆引用。');
  }
  const npcActPreflight = data(input, 'npcActPreflightVersion');
  if (npcActPreflight !== MISSING) {
    if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(npcActPreflight) || packet.dialogueContextVersion !== 1
      || packet.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION || packet.decisionPolicy?.mode !== 'act') fail();
    packet.npcActPreflightVersion = npcActPreflight;
  }
  const npcActionPerspective = data(input, 'npcActionPerspectiveVersion');
  if (npcActionPerspective !== MISSING) {
    if (![1, 2, 3].includes(npcActionPerspective) || !packet.allowedActions.some(action => action === 'gesture'
      || npcActionPerspective === 3 && (action === 'speak' || action === 'write'))) fail('角色动作叙述视角版本无效。');
    packet.npcActionPerspectiveVersion = npcActionPerspective;
  }
  const antiClicheVersion = data(input, 'antiClicheVersion');
  if (antiClicheVersion !== MISSING) {
    if (antiClicheVersion !== 1 || npcActionPerspective !== 3 || packet.decisionPolicy?.mode === 'review') fail('反套话规则只适用于当前演绎。');
    packet.antiClicheVersion = antiClicheVersion;
  }
  const addressVoice = data(input, 'addressVoice');
  if (addressVoice !== MISSING) {
    if (npcActionPerspective !== 3 || packet.decisionPolicy?.mode === 'review') fail('对白称呼只适用于当前演绎。');
    packet.addressVoice = validateAddressVoice(addressVoice, packet.scope.actorId);
  }
  const viewer = data(input, 'narrationPlayerHandle');
  if (viewer !== MISSING) {
    if (![2, 3].includes(npcActionPerspective) || !packet.situation.perceivedParticipants?.includes(viewer)) fail('叙述者必须属于已交付的当前参与者。');
    packet.narrationPlayerHandle = viewer;
  }
  if (data(input, 'shortObservationReferenceVersion') !== MISSING) {
    if (data(input, 'shortObservationReferenceVersion') !== 1) fail('短观察引用版本无效。');
    packet.shortObservationReferenceVersion = 1;
  }
  if (packet.decisionPolicy) {
    const available = new Set([...packet.observations, ...(packet.recallSources || [])].map(row => row.id));
    if (['goals', 'beliefs', 'relationships'].some(key => packet.decisionContext[key]
      .some(row => row.sourceObservationIds.length > 8 || row.sourceObservationIds.some(id => !available.has(id))))) {
      fail('本人决策记录必须保留完整的已交付来源闭包。');
    }
  }
  // Ignored secrets and cross-role fields are never traversed or serialized.
  // Compressed rows and provenance are an atomic unit; never leave orphan refs.
  return finish(packet, maximum, ['memories', 'relationships', 'goals', ...(packet.recallSources ? [] : packet.recalledRecords ? ['recalledRecords'] : [])]);
}
export function buildCharacterDataContext(input, options = {}) {
  if (!plain(input)) fail('上下文必须是普通数据对象。');
  const relationship = relationshipContextPin(input).relationshipContextVersion === 1
    ? relationshipPacketPolicy(input, data(input, 'initialRunPolicy')) : {};
  const maximum = maxBytes(options, relationship.relationshipContextVersion === 1 ? RELATIONSHIP_CONTEXT_BUDGETS.roleplay : MAX_PACKET_BYTES); const consume = budget();
  const bound = checked('ERR_AGENT_SCOPE', '角色上下文必须绑定合法角色、分支和状态水位。',
    () => validateScope(data(input, 'scope'), consume));
  return finish({
    role: 'character_data', scope: bound, ...relationship,
    ...(relationship.relationshipContextVersion === 1 ? { initialRunPolicy: data(input, 'initialRunPolicy') } : {}),
    observations: rows(input, 'observations', bound, observationFields, observationRequired, consume, row => row.id),
    currentRecords: rows(input, 'currentRecords', bound, recordFields, ['id', 'kind', 'summary', 'revision'], consume, row => row.id),
  }, maximum, ['currentRecords']);
}
function readPacket(value, role) {
  // Adapter copies are useful for transport, not authority. Validation must use
  // the host-held packet emitted by a builder, never a model-rewritten clone.
  if (!plain(value) || packets.get(value) !== role) fail('Agent 上下文不是本宿主交付的角色数据包。', 'ERR_AGENT_PACKET');
  return value;
}
/** Only authentic, already-cropped host packets may reach the model gateway.
 * A transported clone is data, never authority to construct a new request. */
export function agentPacketForTransport(packet) {
  if (!plain(packet) || !packets.has(packet)) fail('Agent 上下文不是本宿主交付的数据包。', 'ERR_AGENT_PACKET');
  return packet;
}
export function validateRoleplayDecision(packet, decision, currentScope) {
  const delivered = roleplayChecked('roleplay-packet', () => readPacket(packet, 'roleplay'));
  const expected = roleplayChecked('roleplay-scope', () => validateScope(currentScope));
  if (!sameScope(delivered.scope, expected)) roleplayReject('roleplay-stale', '角色决策已过期或越权。', 'ERR_AGENT_STALE');
  if (!delivered.decisionPolicy && delivered.allowedActions.length === 1 && delivered.allowedActions[0] === 'vote') {
    const result = checked('ERR_AGENT_DECISION', '投票决策只能包含一张许可候选人的选票。', () => object(decision, {
      ballot: (entry, consume) => object(entry, { candidateId: identifier }, ['candidateId'], consume, true),
    }, ['ballot'], budget(), true), 'roleplay-ballot-structure');
    // Candidates are curated by the host, not inferred from nearby speakers.
    // Self-votes are valid whenever the actor is among those candidates.
    if (!delivered.situation.candidateIds?.includes(result.ballot.candidateId)) roleplayReject('roleplay-ballot-candidate', '选票必须指定本轮交付的候选人。', 'ERR_AGENT_DECISION');
    return freeze(result);
  }
  const policy = delivered.decisionPolicy;
  const result = checked('ERR_AGENT_DECISION', '角色决策只能包含受限的对白与行动意图。', () => object(decision, {
    ...(delivered.ordinaryParticipationVersion === 1 ? { ordinaryParticipation: shapeCheck((entry, consume) => object(entry, {
      attemptRef: enumeration(['a1']), choice: enumeration(['contribute', 'decline']), invitationSourceRef: identifier,
    }, ['attemptRef', 'choice', 'invitationSourceRef'], consume, true), 'npc_shape_participation') } : {}),
    utterance: shapeCheck(policy ? boundedText(policy.maxUtteranceChars) : text, 'npc_shape_expression'),
    intent: shapeCheck((entry, consume) => object(entry, {
      type: label, targetHandle: identifier,
      description: boundedText(2000),
    }, ['type'], consume, true), 'npc_shape_expression'),
    action: shapeCheck(boundedText(policy ? 240 : 1200), 'npc_shape_expression'),
    movement: shapeCheck((entry, consume) => object(entry, { destination: identifier }, ['destination'], consume, true), 'npc_shape_expression'),
    decision: shapeCheck((entry, consume) => object(entry, {
      ...(policy ? { mode: enumeration(['act', 'review']) } : {}),
      goalId: identifier, strategy: label, assessment: delivered.npcActPreflightVersion >= 10 ? assessmentText : boundedText(400),
      operation: (row, charge) => object(row, { type: label, targetHandle: identifier, destination: identifier, subjectId: identifier }, ['type'], charge, true,
        delivered.npcActPreflightVersion >= 9 ? 'npc_shape_decision_operation' : undefined),
      sourceObservationIds: sources,
    }, [...(policy?.mode === 'review' ? ['mode'] : ['goalId']), 'strategy', 'operation', 'sourceObservationIds'], consume, true,
      delivered.npcActPreflightVersion >= 9 ? 'npc_shape_decision' : undefined), 'npc_shape_decision'),
    ...(policy ? { communication: shapeCheck((entry, consume) => object(entry, {
      kind: enumeration(['statement', 'ask', 'invite', 'reply', 'accept', 'decline', 'close']),
      addresseeHandles: (value, charge) => list(value, identifier, charge, 4, handle => handle), replyTo: identifier,
    }, ['kind', 'addresseeHandles'], consume, true), 'npc_shape_communication') } : {}),
    stateUpdates: shapeCheck((entries, consume) => list(entries, (entry, charge) => object(entry, {
      kind: label, id: identifier, status: label, priority: revision, reviewAt: revision,
      summary: boundedText(400), subjectiveSummary: boundedText(400), confidence: label, targetHandle: identifier, distanceChange: value => {
        if (!Number.isSafeInteger(value) || Math.abs(value) > 1) roleplayReject('roleplay-state-update', '关系变化超过本轮范围。'); return value;
      }, sourceObservationIds: sources, contradicts: identifier,
    }, ['kind', 'sourceObservationIds'], charge, true), consume, policy?.maxUpdates ?? 6), 'npc_shape_updates'),
  }, [], budget(), true), 'roleplay-structure');
  if (!Object.keys(result).length) roleplayReject('roleplay-required-output', '角色决策必须提出对白或行动意图。', 'ERR_AGENT_DECISION');
  if (containsMetaLanguage(result.utterance) || containsMetaLanguage(result.action)) {
    roleplayReject('roleplay-meta-language', '请用人物眼前的见闻与行动表达回应。', 'ERR_AGENT_DECISION');
  }
  if ((result.decision || result.stateUpdates) && !delivered.decisionContext) roleplayReject('roleplay-legacy-decision', '旧契约不能接收自主决策。', 'ERR_AGENT_DECISION');
  if (delivered.decisionContext && (!result.decision || result.movement)) roleplayReject('roleplay-required-decision', '自主回合必须声明个人目标、受限操作和本人来源。', 'ERR_AGENT_DECISION');
  if (result.decision) {
    if (result.movement) roleplayReject('roleplay-movement-binding', '移动只能有一个结构化来源。', 'ERR_AGENT_DECISION');
    const choice = result.decision; const op = choice.operation;
    const reviewOnly = !policy && !delivered.decisionContext.goals.some(row => row.status === 'active')
      && choice.strategy === 'wait' && op.type === 'wait'
      && !result.utterance && !result.action && !result.intent && !result.movement;
    const review = policy?.mode === 'review';
    // Review is a host-selected, update-only slot. Resuming an existing goal
    // here never grants an operation until a later host-delivered act packet.
    if (policy && (review ? choice.mode !== 'review' || choice.strategy !== 'wait' || op.type !== 'wait'
      || Object.keys(choice).some(key => !['mode', 'strategy', 'operation', 'sourceObservationIds'].includes(key))
      || Object.keys(result).some(key => !['decision', 'stateUpdates'].includes(key))
      : choice.mode !== undefined && choice.mode !== 'act')) roleplayReject('roleplay-review-mode', '复核回合只能等待并提出本人状态更新，不能在本轮恢复行动。', 'ERR_AGENT_DECISION');
    const goal = delivered.decisionContext.goals.find(row => row.id === choice.goalId
      && (row.status === 'active' || (reviewOnly && row.status === 'paused')));
    const evidence = new Set(delivered.observations.map(row => row.id));
    let failedRule;
    if ((choice.sourceObservationIds.length > 8 && (failedRule = 'roleplay-goal-source-count'))
      || ((!review && !goal) && (failedRule = 'roleplay-goal-unavailable'))
      || (!['respond', 'question', 'withhold', 'refuse', 'probe', 'cooperate', 'investigate', 'retreat', 'wait'].includes(choice.strategy) && (failedRule = 'roleplay-goal-strategy'))
      || (choice.sourceObservationIds.some(id => !evidence.has(id)) && (failedRule = 'roleplay-source-undelivered'))
      || (!delivered.allowedActions.includes(op.type) && (failedRule = 'roleplay-operation-permission'))) roleplayReject(failedRule, '自主决策缺少个人目标、权限或已交付来源。', 'ERR_AGENT_DECISION');
    const fields = { move: ['type', 'destination'], read: ['type', 'subjectId'], inspect: ['type', 'subjectId'], present: ['type', 'subjectId'],
      speak: ['type', 'targetHandle'], write: ['type', 'targetHandle'], wait: ['type'],
      case_step: ['type', 'subjectId'], report: ['type', 'subjectId'],
      magic_cast: ['type', 'subjectId', 'targetHandle'] }[op.type];
    if (!fields || Object.keys(op).some(key => !fields.includes(key))) roleplayReject('roleplay-operation-args', '操作参数不符合契约。', 'ERR_AGENT_DECISION');
    if (op.type === 'magic_cast' && (delivered.npcMagicCastVersion !== 1 || !op.subjectId || !op.targetHandle
      || !delivered.situation.magicActions?.some(row => row.handle === op.subjectId)
      || !delivered.situation.magicTargets?.some(row => row.handle === op.targetHandle)
      || result.utterance !== undefined || result.action !== undefined || result.intent || result.communication))
      roleplayReject('roleplay-magic-binding', '操作参数不符合契约。', 'ERR_AGENT_DECISION');
    if (op.type !== 'magic_cast' && op.targetHandle && !delivered.situation.perceivedParticipants?.includes(op.targetHandle)) roleplayReject('roleplay-operation-target', '目标不在本人视野。', 'ERR_AGENT_DECISION');
    if ((op.type === 'move' && !delivered.situation.permittedDestinations?.includes(op.destination))
      || (op.type === 'read' && !delivered.situation.readableIds?.includes(op.subjectId))
      || (op.type === 'inspect' && !delivered.situation.inspectableIds?.includes(op.subjectId))
      || (op.type === 'present' && !delivered.situation.knownEvidenceIds?.includes(op.subjectId))
      || (['case_step', 'report'].includes(op.type) && !delivered.situation.caseOptions?.some(row => row.id === op.subjectId
        && (op.type !== 'report' || row.kind === 'report')))) roleplayReject('roleplay-operation-object', '操作对象不在本人许可范围。', 'ERR_AGENT_DECISION');
    if (op.type === 'case_step' && ['identify', 'adopt', 'resume'].includes(delivered.situation.caseOptions.find(row => row.id === op.subjectId)?.kind)
      && !choice.assessment) roleplayReject('roleplay-required-assessment', '冲突识别、计划采纳与恢复必须附有简短、来源明确的决策摘要。', 'ERR_AGENT_DECISION');
  }
  if (delivered.dialogueContextVersion === 1 && policy && result.utterance !== undefined && !result.communication) {
    roleplayReject('roleplay-required-communication', '本轮实际交流必须明确选择交流标记；陈述、拒绝和沉默不强制回答请求。', 'ERR_AGENT_DECISION');
  }
  if (result.ordinaryParticipation) {
    if (policy?.mode === 'review' || result.ordinaryParticipation.invitationSourceRef !== delivered.ordinaryInvitation?.invitationSourceRef
      || result.ordinaryParticipation.choice === 'contribute' && (!result.utterance || result.decision?.operation.type !== 'speak'))
      roleplayReject('roleplay-ordinary-contribution-binding', '参与必须是本人本轮合法发言的明确选择。', 'ERR_AGENT_DECISION');
  }
  if (result.communication) {
    const communication = result.communication;
    let failedRule;
    if ((!['speak', 'write'].includes(result.decision?.operation.type) || !result.utterance)
      && (failedRule = 'roleplay-communication-operation-utterance')
      || (communication.addresseeHandles.some(handle => !delivered.situation.perceivedParticipants?.includes(handle))
        && (failedRule = 'roleplay-communication-addressee'))
      || (['reply', 'accept', 'decline', 'close'].includes(communication.kind) && !communication.replyTo
        && (failedRule = 'roleplay-communication-reply-required'))
      || (communication.replyTo !== undefined && ((!delivered.observations.some(row => row.id === communication.replyTo)
        && (failedRule = 'roleplay-communication-reply-undelivered'))
        || (!delivered.situation.socialRequests?.some(row => row.sourceObservationId === communication.replyTo
          && (delivered.dialogueContextVersion !== 1 || communication.addresseeHandles.includes(row.senderHandle)))
          && (failedRule = 'roleplay-communication-request-sender'))))) {
      roleplayReject([PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(delivered.executionRevision?.revisionId) ? failedRule : 'roleplay-communication-binding',
        '交流标记只能引用眼前对象和已完整交付的请求，不能改变传播范围。', 'ERR_AGENT_DECISION');
    }
  }
  if (result.stateUpdates) {
    const evidence = new Set(delivered.observations.map(row => row.id));
    const goalStatuses = new Map(delivered.decisionContext.goals.map(row => [row.id, row.status]));
    const templates = new Map((policy ? delivered.goalTemplates ?? [] : []).map(row => [row.id, row]));
    const relationshipSpent = new Map();
    for (const update of result.stateUpdates) {
      const fields = { goal: ['kind', 'id', 'status', 'priority', 'reviewAt', 'sourceObservationIds'],
        belief: ['kind', 'summary', 'confidence', 'sourceObservationIds', 'contradicts'],
        relationship: ['kind', 'targetHandle', 'subjectiveSummary', 'confidence', 'distanceChange', 'sourceObservationIds'] }[update.kind];
      if (!fields || Object.keys(update).some(key => !fields.includes(key)) || update.sourceObservationIds.length > 8 || update.sourceObservationIds.some(id => !evidence.has(id))
        || (update.kind === 'goal' && ((!delivered.decisionContext.goals.some(row => row.id === update.id)
          && !templates.has(update.id))
          || !['active', 'paused', 'completed'].includes(update.status) || ![1, 2, 3].includes(update.priority) || update.reviewAt === undefined))
        || (update.kind === 'belief' && (!update.summary || !['uncertain', 'likely'].includes(update.confidence)))
        || (update.kind === 'relationship' && (!update.subjectiveSummary || !['uncertain', 'likely'].includes(update.confidence)
          || update.distanceChange === undefined || !delivered.situation.perceivedParticipants?.includes(update.targetHandle)))) roleplayReject('roleplay-state-update', '主观更新越过个人来源或字段边界。', 'ERR_AGENT_DECISION');
      if (policy && update.kind === 'goal') {
        if (goalStatuses.get(update.id) === 'completed' && update.status !== 'completed') roleplayReject('roleplay-completed-goal', '已结束的个人目标不能恢复。', 'ERR_AGENT_DECISION');
        if (!goalStatuses.has(update.id) && templates.get(update.id).sourceObservationIds
          .some(id => !update.sourceObservationIds.includes(id))) roleplayReject('roleplay-goal-template-source', '新处境目标必须引用宿主模板绑定的完整请求来源。', 'ERR_AGENT_DECISION');
        goalStatuses.set(update.id, update.status);
      }
      if (policy && update.kind === 'relationship') {
        const remaining = policy.relationshipBudget.find(row => row.targetHandle === update.targetHandle)?.remaining ?? 0;
        const spent = (relationshipSpent.get(update.targetHandle) ?? 0) + Math.abs(update.distanceChange);
        if (spent > remaining) roleplayReject('roleplay-relationship-budget', '关系更新超过本轮交付的剩余额度。', 'ERR_AGENT_DECISION');
        relationshipSpent.set(update.targetHandle, spent);
      }
    }
  }
  if (result.action !== undefined && !delivered.allowedActions.includes('gesture')) roleplayReject('roleplay-action-capability', '本轮不允许角色动作提案。', 'ERR_AGENT_DECISION');
  if (result.movement && (!delivered.allowedActions.includes('move')
    || !delivered.situation.permittedDestinations?.includes(result.movement.destination))) roleplayReject('roleplay-movement', '角色只能提议本轮已开放的相邻移动。', 'ERR_AGENT_DECISION');
  if (result.intent) {
    const intentAccepted = delivered.allowedActions.includes(result.intent.type)
      || (policy && result.intent.type === 'ask' && delivered.allowedActions.includes('speak'));
    if (!intentAccepted) roleplayReject('roleplay-intent-capability', '行动意图不在许可范围。');
    if (result.intent.targetHandle !== undefined
      && !delivered.situation.perceivedParticipants?.includes(result.intent.targetHandle)) roleplayReject('roleplay-intent-target', '不能指定当前上下文未交付的角色。');
  }
  if (result.utterance !== undefined) {
    if (hasMixedUtterance(result.utterance)) roleplayReject('roleplay-utterance-mixed', 'utterance 只能包含实际发言或书写，动作与叙述必须单独放入 action。', 'ERR_AGENT_DECISION');
    const permitted = result.intent
      ? COMMUNICATION_ACTIONS.has(result.intent.type)
      : delivered.allowedActions.some(action => COMMUNICATION_ACTIONS.has(action));
    if (!permitted || (policy && !['speak', 'write'].includes(result.decision?.operation.type))) {
      roleplayReject('roleplay-utterance-capability', '对白必须具有本次上下文许可的交流能力。', 'ERR_AGENT_DECISION');
    }
  }
  if (invalidUtteranceAddress(delivered.scope.actorId, delivered.addressVoice, result.utterance)) {
    roleplayReject('roleplay-address-form', '本轮称呼与已认识对象或对应关系不符。', 'ERR_AGENT_DECISION');
  }
  if (!delivered.addressVoice && delivered.npcActionPerspectiveVersion === 3 && policyForActor(delivered.scope.actorId).selfReference
    && hasNoncanonicalSelfReference(result.utterance)) {
    roleplayReject('roleplay-self-reference', '生成的台词未遵守本角色的惯用自称。', 'ERR_AGENT_DECISION');
  }
  if (delivered.performancePolicy) {
    try { assertPerformancePolicy({ performancePolicy: delivered.performancePolicy, output: result,
      persona: delivered.persona, participants: delivered.situation.participants || [], addressVoice: delivered.addressVoice }); }
    catch (native) {
      const wrapped = Object.assign(new Error('角色动作人称、自称或随身物归属不符合本轮表现策略。'), { code: 'ERR_AGENT_DECISION' });
      const diagnostic = narrativeGuardDiagnostic(native);
      if (['self-reference', 'foreign-appearance'].includes(diagnostic?.rule))
        presentationFailures.set(wrapped, Object.freeze({ rule: diagnostic.rule }));
      throw wrapped;
    }
  }
  return freeze(result);
}
export function validateCharacterDataProposal(packet, proposal, currentScope) {
  const delivered = readPacket(packet, 'character_data');
  const expected = validateScope(currentScope);
  if (!sameScope(delivered.scope, expected)) fail('角色数据提案已过期或越权。', 'ERR_AGENT_STALE');
  const evidence = new Set(delivered.observations.map(row => row.id));
  const result = checked('ERR_AGENT_PROPOSAL', '数据 Agent 只能提交受限的认知更新提案。', () => object(proposal, {
    updates: (entries, consume) => list(entries, (entry, charge) => object(entry, {
      kind: cognitiveKind, summary, sourceObservationIds: sources,
    }, ['kind', 'summary', 'sourceObservationIds'], charge, true), consume, 20),
  }, ['updates'], budget(), true));
  if (result.updates.some(update => update.sourceObservationIds.some(id => !evidence.has(id)))) {
    fail('认知更新必须引用本次已交付的观测。', 'ERR_AGENT_EVIDENCE');
  }
  // Validation is not truth adjudication or persistence. The host must review.
  return freeze({ scope: expected, updates: result.updates, requiresHostReview: true });
}

export const NPC_HOST_TEXT_FAILURE_RULES = Object.freeze(['npc-host-text-envelope']);
export function validateNpcHostTextEnvelope(decision, task) {
  if ((decision.utterance && (decision.utterance.length > 2000 || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(decision.utterance)))
        || (decision.action && (/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(decision.action)
          || (task.context.decisionPolicy?.version === 2 && decision.action.length > 240)))) roleplayReject('npc-host-text-envelope', '角色回复含有无效文本或超过本场表达预算。', 'INVALID_AGENT_OUTPUT');
  return decision;
}
