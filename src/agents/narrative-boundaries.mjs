import { PLAYER_PERFORMANCE_SHAPE } from './player-performance-shape.mjs';
import { assertCommunicationSelection, isCommunicationRuntime } from './communication-selection30.mjs';
import { initialPublicBoundaryConflict } from '../content/initial-run-policy.mjs';
import { isProxy } from 'node:util/types';
import { relationshipPacketPolicy } from '../content/content-revisions.mjs';
import { RELATIONSHIP_CONTEXT_BUDGETS, relationshipContextPin } from '../content/relationship-context-policy.mjs';
import { isDeepStrictEqual } from 'node:util';
import { buildMaterialProseContextV2 } from './material-prose-policy.mjs';
import { buildBallotInstrumentContext } from '../cases/ballot-instrument-assertions.mjs';
import { physicalFactSnapshotV2WithElevation } from '../world/physical-fact-elevation.mjs';
import { dialogueContextPin, validateSystemSeal } from '../cognition/dialogue-context-policy.mjs';
import { validateSceneExtensions, validateSceneEventTimeline } from '../scenes/scene-event-policy.mjs';
import { SCENE_COMPOSER_INSTRUCTIONS, validateSceneEvents, validateSceneDocument, mergeHostSceneEvents } from '../scenes/scene-document.mjs';
import { containsMetaLanguage } from './story-language.mjs';
import { hasMixedUtterance } from '../../public/dialogue-format.mjs';
import { assertChosenPerformance, assertObservablePlayerAction, assertNarrativeMaterialProse, assertNarrativeBallotInstrument, chosenPlayerSpeech, invalidUtteranceAddress, playerSpeechFits, supportsPlayerSpeech } from './narrative-guards.mjs';
import { validateAddressVoice } from './character-address-policy.mjs';
import { STATEMENT_REACTION_INSTRUCTIONS, assertStatementReactionDelivery } from '../cases/statement-reactions.mjs';
import { validateCaseIntent } from '../cases/case-one.mjs';
import { analyzeNarrativeStyle } from './narrative-style.mjs';
import { validateCausalIntent } from '../scenes/causal-scene.mjs';
import { isAuthoredMagicContext, validAuthoredMagicIntent, assertsAuthoredMagicResult } from './authored-magic-intent.mjs';
import { validatePoseIntent } from '../case-runtime.mjs';

const packets = new WeakSet();
// These labels identify only an actual rejected check. Never attach candidate
// values, input text, field names, or the exception's stack to the diagnostic.
const PLAYER_PERFORMANCE_FAILURES = new WeakMap();
export const playerPerformanceOutputDiagnostic = error => PLAYER_PERFORMANCE_FAILURES.get(error);
const performanceStructureRule = 'player-performance-structure';

const PERFORMANCE_SHAPE_FAILURES = new WeakMap();
export const playerPerformanceOutputIssue = error => PERFORMANCE_SHAPE_FAILURES.get(error);
// Label only after the real validator rejects. Never retain keys, values,
// rejected candidates, or unconstrained exception metadata.
function performanceShape(check, issue) {
  try { return check(); }
  catch (error) {
    if (playerPerformanceOutputDiagnostic(error) === performanceStructureRule)
      PERFORMANCE_SHAPE_FAILURES.set(error, typeof issue === 'function' ? issue() : issue);
    throw error;
  }
}
const fail = rule => {
  const error = Object.assign(new Error('叙事任务数据或结果不符合受限执行契约。'), { code: 'INVALID_NARRATIVE_OUTPUT' });
  if (rule !== undefined) PLAYER_PERFORMANCE_FAILURES.set(error, rule);
  throw error;
};
const plain = value => value && typeof value === 'object' && !isProxy(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function exact(value, fields, required = fields, rule) {
  if (!plain(value) || Reflect.ownKeys(value).some(key => !fields.includes(key)
    || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')) || required.some(key => !Object.hasOwn(value, key))) fail(rule);
  return value;
}
function text(value, maximum = 2000, empty = false, rule) {
  if (typeof value !== 'string' || (!empty && !value.trim()) || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/u.test(value)) fail(rule);
  return value;
}
function clone(value, maximum = 48000, rule) {
  // Host-owned JSON only: reject accessors/proxies before any serialization.
  const visit = (entry, depth = 0) => {
    if (depth > 16) fail(rule);
    if (entry === null || typeof entry === 'boolean' || (typeof entry === 'number' && Number.isSafeInteger(entry))) return;
    if (typeof entry === 'string') { text(entry, 16000, true, rule); return; }
    if (isProxy(entry) || (!Array.isArray(entry) && !plain(entry))) fail(rule);
    if (Reflect.ownKeys(entry).length > 256) fail(rule);
    for (const key of Reflect.ownKeys(entry)) {
      if (Array.isArray(entry) && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(entry, key);
      if (typeof key !== 'string' || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail(rule);
      visit(descriptor.value, depth + 1);
    }
  };
  visit(value);
  if (Buffer.byteLength(JSON.stringify(value)) > maximum) fail(rule);
  return structuredClone(value);
}
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
export function explicitQuotes(raw) { return [...raw.matchAll(/「([^」]*)」/gu)].map(match => match[1]); }
export function preservesExplicitSpeech(raw, utterance) {
  const quotes = explicitQuotes(raw);
  if (!quotes.length) return true;
  if (typeof utterance !== 'string') return false;
  // Only optional outer dialogue marks and whitespace may surround each quote.
  // A valid quote is never a license to append a new promise/question/decision.
  let rest = utterance;
  for (const quote of quotes) {
    rest = rest.trimStart();
    if (rest.startsWith(`「${quote}」`)) rest = rest.slice(quote.length + 2);
    else if (rest.startsWith(quote)) rest = rest.slice(quote.length);
    else return false;
  }
  return !rest.trim();
}
export function preservesEnactedPlayerSpeech(raw, utterance, intent) {
  // The engine already checked the sealed player task; the scene may not
  // broaden quote compatibility to procedure actions or multiple quotes.
  if (preservesExplicitSpeech(raw, utterance)) return true;
  const quotes = explicitQuotes(raw);
  return supportsPlayerSpeech(intent) && quotes.length === 1 && playerSpeechFits(quotes[0], utterance);
}
export function buildNarrativeContext(input) {
  exact(input, ['role', 'scope', 'data', 'systemPolicySeal', 'relationshipContextVersion', 'executionRevision'], ['role', 'scope', 'data']);
  if (!plain(input.data)) fail();
  const initialPolicyDescriptor = Object.getOwnPropertyDescriptor(input.data, 'initialRunPolicy');
  const initialPolicy = initialPolicyDescriptor && Object.hasOwn(initialPolicyDescriptor, 'value') ? initialPolicyDescriptor.value : undefined;
  const relationship = relationshipContextPin(input).relationshipContextVersion === 1
    ? relationshipPacketPolicy(input, initialPolicy) : {};
  if (!relationship.relationshipContextVersion && plain(initialPolicy)
    && Object.getOwnPropertyDescriptor(initialPolicy, 'version')?.value === 2) fail();
  if (Object.hasOwn(input, 'systemPolicySeal')) validateSystemSeal(input.systemPolicySeal);
  const dialogue = dialogueContextPin(input.data);
  if (Object.hasOwn(input, 'systemPolicySeal') && dialogue.dialogueContextVersion !== 1 && input.data?.ballotInstrumentVersion !== 1) fail();
  if (!['intent_parser', 'player_performance', 'narrator', 'scene_composer'].includes(input.role)) fail();
  exact(input.scope, ['actorId', 'branchId', 'generation', 'revision']);
  text(input.scope.actorId, 128); text(input.scope.branchId, 128);
  if (!Number.isSafeInteger(input.scope.generation) || input.scope.generation < 1 || !Number.isSafeInteger(input.scope.revision) || input.scope.revision < 0) fail();
  const maximum = relationship.relationshipContextVersion === 1
    ? (input.role === 'player_performance' ? RELATIONSHIP_CONTEXT_BUDGETS.player_performance : RELATIONSHIP_CONTEXT_BUDGETS.narrative)
    : input.role === 'scene_composer' ? 64000 : 48000;
  const packet = freeze(clone(input, maximum));
  if (packet.role === 'player_performance') assertCommunicationSelection(packet.data, packet.scope);
  if (Object.hasOwn(packet.data, 'antiClicheVersion') && (packet.data.antiClicheVersion !== 1
    || !['player_performance', 'narrator', 'scene_composer'].includes(packet.role))) fail();
  if (Object.hasOwn(packet.data, 'addressVoice')) {
    if (packet.role !== 'player_performance') fail();
    validateAddressVoice(packet.data.addressVoice, packet.scope.actorId);
  }
  if (Object.hasOwn(packet.data, 'playerSpeechVoiceVersion') && (packet.role !== 'player_performance'
    || packet.data.playerSpeechVoiceVersion !== 1 || !chosenPlayerSpeech(packet.data))) fail();
  if (Object.hasOwn(packet.data, 'performanceVersion') && (packet.role !== 'player_performance' || packet.data.performanceVersion !== 2)) fail();
  if (Object.hasOwn(packet.data, 'visualPerformanceSystemVersion') && (packet.role !== 'player_performance'
    || packet.data.visualPerformanceSystemVersion !== 2 || packet.data.materialProseVersion !== 2
    || packet.data.dialogueContextVersion !== 1 || !['look', 'inspect', 'examine'].includes(packet.data.intent?.type))) fail();
  if (Object.hasOwn(packet.data, 'conversationPerformanceSystemVersion') && (packet.role !== 'player_performance'
    || packet.data.conversationPerformanceSystemVersion !== 1 || packet.data.performanceVersion !== 2
    || packet.executionRevision?.revisionId !== 'agent-prison-runtime@33' || packet.data.materialProseVersion !== 2
    || packet.data.dialogueContextVersion !== 1 || packet.data.intent?.type !== 'conversation')) fail();
  validateSceneExtensions(packet.data);
  if (packet.data.postureActionVersion === 1 && !['intent_parser', 'player_performance', 'scene_composer'].includes(packet.role)) fail();
  if (packet.data.dialogueContextVersion === 1 && packet.role === 'player_performance') {
    if (packet.data.performanceVersion !== 2 || Object.hasOwn(packet.data, 'observations') || Object.hasOwn(packet.data, 'recollections')) fail();
    const full = packet.data.recall?.observations;
    if (!Array.isArray(full) || full.length > 128 || new Set(full.map(row => row.id)).size !== full.length) fail();
    for (const [key, historical] of [['acquiredBackgroundObservationIds', true], ['currentDeliveryObservationIds', false]]) {
      const ids = packet.data[key];
      const expected = full.filter(row => (row.channel === 'private_recollection') === historical).map(row => row.id);
      if (!Array.isArray(ids) || ids.length !== expected.length || ids.some((id, index) => id !== expected[index])) fail();
    }
  }
  if (Object.hasOwn(packet.data, 'materialProseVersion') && !['player_performance', 'scene_composer'].includes(packet.role)) fail();
  if (Object.hasOwn(packet.data, 'playerTextMagicVersion') && packet.data.playerTextMagicVersion !== 1) fail();
  if (Object.hasOwn(packet.data, 'playerTextSwapVersion')
    && (packet.role !== 'intent_parser' || packet.data.playerTextSwapVersion !== 1)) fail();
  if (Object.hasOwn(packet.data, 'playerRuntimeSelfServiceVersion')
    && (packet.role !== 'intent_parser' || packet.data.playerRuntimeSelfServiceVersion !== 1)) fail();
  if (Object.hasOwn(packet.data, 'playerRuntimeOfferedInspectionVersion')
    && (packet.role !== 'intent_parser' || packet.data.playerRuntimeOfferedInspectionVersion !== 1)) fail();
  if (Object.hasOwn(packet.data, 'magic') && (packet.role !== 'intent_parser'
    || packet.data.playerTextMagicVersion !== 1)) fail();
  const authoredMagic = packet.role === 'player_performance' && isAuthoredMagicContext(packet.data.authoredMagic);
  if (Object.hasOwn(packet.data, 'authoredMagic') && !authoredMagic) fail();
  if (packet.role === 'player_performance' && packet.data.intent?.type === 'magic'
    && (!authoredMagic || !validAuthoredMagicIntent(packet.data.intent, packet.data.scene, packet.data.rawInput, packet.data.authoredMagic))) fail();
  // No serialized WeakSet capability or candidate-produced material context
  // is meaningful at this boundary. Only bounded raw host snapshot fields go
  // over the wire and a fresh host context is built during validation.
  if ([1, 2].includes(packet.data.materialProseVersion) && Object.hasOwn(packet.data, 'materialContext')) fail();
  validateMaterialPacketData(packet);
  validateBallotPacketData(packet);
  if (Object.hasOwn(packet.data, 'postureSettlement')) {
    if (packet.role !== 'scene_composer' || packet.data.postureActionVersion !== 1) fail();
    exact(packet.data.postureSettlement, ['eventId', 'posture']);
    if (!packet.data.events?.some(row => row.id === packet.data.postureSettlement.eventId)
      || !['standing', 'sitting', 'lying'].includes(packet.data.postureSettlement.posture)) fail();
  }
  if (Object.hasOwn(packet.data, 'narrationPacingVersion') && (packet.role !== 'scene_composer'
    || packet.data.narrationPacingVersion !== 1 || packet.data.outputContractVersion !== 1)) fail();
  if (packet.role === 'scene_composer') {
    validateSceneEvents(packet.data.events);
    if (packet.data.sceneEventTimeVersion === 1) validateSceneEventTimeline(packet.data.eventTimeline, packet.data.events);
    else if (Object.hasOwn(packet.data, 'eventTimeline')) fail();
  } else if (Object.hasOwn(packet.data, 'eventTimeline') || Object.hasOwn(packet.data, 'sceneEventTimeVersion')) fail();
  packets.add(packet); return packet;
}
function validateBallotPacketData(packet) {
  const data = packet.data;
  if (!Object.hasOwn(data, 'ballotInstrumentVersion')) {
    if (Object.hasOwn(data, 'ballotInstrumentSource')) fail(); return;
  }
  if (data.ballotInstrumentVersion !== 1 || !['player_performance', 'scene_composer'].includes(packet.role)) fail();
  const source = exact(data.ballotInstrumentSource, ['context', 'evidence']);
  const context = buildBallotInstrumentContext(source.context);
  if (context.scope.ownerId !== packet.scope.actorId || context.scope.branchId !== packet.scope.branchId
    || context.scope.generation !== packet.scope.generation || context.scope.revision !== packet.scope.revision
    || context.intent.type !== 'case' || context.intent.operation !== 'vote'
    || context.intent.subjectId !== data.intent?.subjectId || data.intent.operation !== 'vote' || data.intent.type !== 'case'
    || context.ballot && context.ballot.carrier !== 'phone' && context.ballot.carrier !== 'unknown') fail();
  if (context.ballot?.state === 'resolved') {
    const proof = exact(source.evidence, ['observationId', 'sourceCommitRef', 'eventRef', 'sha256']);
    for (const key of ['observationId', 'sourceCommitRef', 'eventRef']) text(proof[key], 128);
    if (context.ballot.sourceRef !== proof.observationId || !/^[a-f0-9]{64}$/u.test(proof.sha256)) fail();
  } else if (source.evidence !== null) fail();
}
function validateMaterialPacketData(packet) {
  const data = packet.data; const relevant = ['player_performance', 'scene_composer'].includes(packet.role);
  if (Object.hasOwn(data, 'physicalFactsVersion') && !relevant) fail();
  const fields = ['materialProseBoundaries', 'materialProseEventSnapshots'];
  const v2 = data.materialProseVersion === 2 || data.physicalFactsVersion === 2;
  if (!v2) { if (fields.some(key => Object.hasOwn(data, key))) fail(); return; }
  if (!relevant || Object.hasOwn(data, 'materialContext')) fail();
  if (Object.hasOwn(data, 'materialProseFacts')) exact(data.materialProseFacts, ['before', 'after'], []);
  const bounds = exact(data.materialProseBoundaries, ['before', 'after']);
  for (const boundary of [bounds.before, bounds.after]) {
    exact(boundary, ['ownerId', 'branchId', 'generation', 'revision', 'roomId', 'worldTime']);
    if (boundary.ownerId !== packet.scope.actorId || ['branchId', 'generation', 'revision'].some(key => boundary[key] !== packet.scope[key])) fail();
  }
  const performance = packet.role === 'player_performance';
  if (performance && (!isDeepStrictEqual(bounds.before, bounds.after) || Object.hasOwn(data, 'materialProseEventSnapshots'))) fail();
  const before = performance ? data.scene : data.sceneBefore; const after = performance ? before : data.sceneAfter;
  const snapshot = (scene, boundary) => {
    if (!plain(scene) || scene.roomId !== boundary.roomId) fail();
    if (data.physicalFactsVersion === 2) {
      const physical = scene.physicalFacts;
      exact(physical, ['version', 'scope', 'roomId', 'door', 'pose', 'objects', 'carriers', 'surfaces',
        ...(packet.relationshipContextVersion === 1 ? ['relationshipContextVersion', 'executionRevision'] : [])]);
      if (packet.relationshipContextVersion === 1 && !isDeepStrictEqual(physical.executionRevision, packet.executionRevision)) fail();
      const expected = packet.relationshipContextVersion === 1 ? { ...boundary, relationshipContextVersion: 1, executionRevision: packet.executionRevision } : boundary;
      if (!isDeepStrictEqual(physicalFactSnapshotV2WithElevation(physical, expected), physical)) fail();
    } else if (scene.physicalFacts !== undefined && scene.physicalFacts.version !== 1) fail();
    // A v1 optical projection cannot masquerade as v2 physical authority.
    const { physicalFacts, ...rest } = scene;
    return { ...rest, ...(data.physicalFactsVersion === 2 ? { physicalFacts } : {}) };
  };
  const first = snapshot(before, bounds.before); const last = snapshot(after, bounds.after);
  const intermediates = data.materialProseEventSnapshots?.map(row => {
    exact(row, ['eventIndex', 'boundary', 'scene']);
    exact(row.boundary, ['ownerId', 'branchId', 'generation', 'revision', 'roomId', 'worldTime']);
    return { ...row, scene: snapshot(row.scene, row.boundary) };
  });
  buildMaterialProseContextV2({ scene: { before: { ...first, ...(data.materialProseFacts?.before ? { materialFacts: data.materialProseFacts.before } : {}) },
    after: { ...last, ...(data.materialProseFacts?.after ? { materialFacts: data.materialProseFacts.after } : {}) } },
    boundaries: bounds, eventSnapshots: intermediates, events: performance ? [] : data.events,
    intent: data.intent, knownMaterials: data.knownMaterials, eventTimeline: data.eventTimeline });
}
export function narrativePacketForTransport(packet) { if (!packets.has(packet)) fail(); return packet; }
export function rebuildNarrativePacket(packet) { return buildNarrativeContext(packet); }
// A bounded posture predicate family, shared by performance and pre-event
// composition. Only an immediately attached modifier can make THIS predicate
// nonactual. Never borrow modality from a different verb, a prior posture,
// a connective, or any suffix (including another comma-delimited assertion).
const posturePredicates = { sitting: '坐下|坐(?:着|在)|坐稳', lying: '躺下|躺(?:着|在)',
  standing: '站起|起身|站(?:着|在)|站稳' };
function assertsUnsettledPosture(value, { posture, uncertainty = false } = {}) {
  if (typeof value !== 'string') return false;
  const target = new RegExp(posture ? posturePredicates[posture] : Object.values(posturePredicates).join('|'), 'gu');
  const modifiers = '准备|打算|想要|尝试|试着|尚未|还没|没有|并未|不会' + (uncertainty ? '|可能|也许' : '');
  const framing = '(?:我(?:的身体)?|自己|现在|此刻|仍然|已经|还|正|再|就|能|会|要|安静地|静静地|慢慢地|缓缓地|轻轻地|\\s)';
  const support = '(?:在(?:自己的)?(?:下铺|床上|床边|地面|地板上|地上))';
  const attached = new RegExp(`(?:${modifiers})(?:${framing}|${support})*$`, 'u');
  for (const match of value.matchAll(target)) {
    // The suffix match cannot cross punctuation, conjunctions or unrelated
    // predicates: those tokens are deliberately absent from the closed grammar.
    if (!attached.test(value.slice(0, match.index))) return true;
  }
  return false;
}
const sceneTypes = new Set(['look', 'move', 'broadcast', 'conversation', 'wait', 'follow', 'act']);
export function validateNarrativeOutput(packet, output, scope = packet.scope) {
  narrativePacketForTransport(packet);
  if (['actorId', 'branchId', 'generation', 'revision'].some(key => packet.scope[key] !== scope[key])) fail();
  const data = packet.data;
  const structureRule = packet.role === 'player_performance' ? performanceStructureRule : undefined;
  output = structureRule ? performanceShape(() => clone(output, 24000, structureRule), PLAYER_PERFORMANCE_SHAPE.json)
    : clone(output, packet.role === 'scene_composer' ? 36000 : 24000);
  if (packet.role === 'scene_composer') {
    // Host-settled custom prelude blocks are merged deterministically before
    // the strict document contract. This keeps the ordinary event contract
    // exact while making a composer omission of the prelude non-fatal.
    if (data.customEventIds !== undefined) {
      if (!Array.isArray(data.customEventIds) || !data.customEventIds.length
        || data.customEventIds.some(id => typeof id !== 'string')
        || data.customEventIds.length > data.events.length
        || data.customEventIds.some((id, index) => data.events[index]?.id !== id)) fail();
      output = mergeHostSceneEvents(output, data.customEventIds);
    }
    const document = validateSceneDocument(output, data.events);
    if (data.postureActionVersion === 1 && data.postureSettlement) {
      let settled = false;
      for (const block of document.blocks) {
        if (block.type === 'event' && block.eventId === data.postureSettlement.eventId) settled = true;
        if (block.type === 'narration' && !settled && assertsUnsettledPosture(block.text,
          { posture: data.postureSettlement.posture, uncertainty: true })) fail();
      }
    }
    assertNarrativeBallotInstrument(data, document, packet.role);
    assertNarrativeMaterialProse(data, document, packet.role);
    return assertStatementReactionDelivery(data, document, { scene: true });
  }
  if (packet.role === 'intent_parser') {
    if (output.operation === 'pose') {
      if (data.postureActionVersion !== 1) fail();
      validatePoseIntent(data.postureActions || [], output, data.rawInput);
      return freeze(clone(output, 6000));
    }
    if (output.type === 'read' && data.contractVersion === 4 && !data.scene.caseRuntime) {
      exact(output, ['type', 'summary', 'subjectId']); text(output.summary, 800);
      if (!data.scene.readable?.some(row => row.id === output.subjectId)) fail();
      return freeze(clone(output, 6000));
    }
    if (data.scene.caseRuntime) {
      validateCausalIntent(data.scene, output, { playerTextMagicVersion: data.playerTextMagicVersion, magicOffer: data.magic });
      // Adoption and major player actions require explicit host-parsed input.
      // The ordinary-text exceptions are the currently delivered swap offer
      // handle and the narrow player-only self-service actions whose actual
      // body/contact consequences are settled by the same HOST action.
      if (output.type === 'runtime') {
        const selected = data.scene.caseRuntime.options.find(option => option.id === output.subjectId);
        const swapReply = data.playerTextMagicVersion === 1 && data.playerTextSwapVersion === 1
          && selected?.kind === 'swap-offer-hand';
        const selfService = ['self-prick', 'self-heal'].includes(selected?.kind);
        // A separate new-task pin additionally allows only the currently
        // delivered non-harmful parent-building inspection. Older packets
        // without the pin keep the narrower swap/self-service gate unchanged.
        const offeredInspection = data.playerRuntimeOfferedInspectionVersion === 1
          && selected?.kind === 'inspect-structure';
        if (!swapReply && !selfService && !offeredInspection) fail();
      }
      if (['vote', 'testimony'].includes(output.operation)) fail();
      return freeze(clone(output, 6000));
    }
    if (data.scene.case) {
      validateCaseIntent(data.scene, output);
      // A model can identify an argument, never infer a formal vote from a
      // suspicion, quotation, hypothetical or another actor's suggestion.
      if (['vote', 'testimony'].includes(output.operation)) fail();
      return freeze(clone(output, 6000));
    }
    exact(output, ['type', 'summary', 'targetId', 'destination', ...(output.type === 'wait' ? ['operation'] : [])], ['type', 'summary']);
    if (!sceneTypes.has(output.type)) fail(); text(output.summary, 800);
    if (output.operation !== undefined && !['until_free_time', 'until_morning'].includes(output.operation)) fail();
    if (output.operation !== undefined && data.scene.confinement?.version === 1
      && data.scene.confinement.longWaitAllowed !== true) fail();
    if (output.targetId !== undefined && (!['conversation', 'follow', 'wait', 'act'].includes(output.type)
      || !data.scene.nearby.some(actor => actor.id === output.targetId))) fail();
    if (output.destination !== undefined && !data.scene.adjacent.some(room => room.id === output.destination)) fail();
    if (['conversation', 'follow'].includes(output.type) && !output.targetId) fail();
    if (output.type === 'move' && !output.destination) fail();
    return freeze(clone(output, 6000));
  }
  if (packet.role === 'player_performance') {
    if (data.postureActionVersion === 1 && data.intent?.operation === 'pose') {
      validatePoseIntent(data.postureActions || [], data.intent, data.rawInput);
      if (assertsUnsettledPosture(output.action)) fail('player-performance-posture');
    }
    const fields = ['action', 'utterance', ...(data.performanceVersion === 2 ? ['reflection'] : [])];
    performanceShape(() => exact(output, fields, ['action'], structureRule), () => !plain(output) ? PLAYER_PERFORMANCE_SHAPE.object
      : Reflect.ownKeys(output).some(key => !fields.includes(key)) ? PLAYER_PERFORMANCE_SHAPE.keys : PLAYER_PERFORMANCE_SHAPE.missing);
    performanceShape(() => text(output.action, 1200, false, structureRule), PLAYER_PERFORMANCE_SHAPE.action);
    if (data.performanceVersion === 2) assertObservablePlayerAction(output.action);
    if (output.reflection !== undefined) {
      performanceShape(() => text(output.reflection, 1200, true, structureRule), PLAYER_PERFORMANCE_SHAPE.reflection);
      if (containsMetaLanguage(output.reflection)) fail('player-performance-meta-language');
    }
    // Compatible models may explicitly return an empty optional speech field
    // for silent gestures. It carries no dialogue and must not block the turn.
    if (output.utterance !== undefined) performanceShape(() => text(output.utterance, 1400, output.utterance === '', structureRule), PLAYER_PERFORMANCE_SHAPE.utterance);
    if (data.intent?.type === 'magic' && (output.utterance || assertsAuthoredMagicResult(output.action)
      || assertsAuthoredMagicResult(output.reflection) || output.action.includes(data.authoredMagic.text)
      || (data.intent.magic.kind === 'visible' && output.action.includes(data.intent.magic.appearance)))) fail('player-performance-authored-magic');
    if (data.statementReaction?.version === 1 && output.utterance) fail('player-performance-silent-statement');
    assertStatementReactionDelivery(data, output);
    const selection = chosenPlayerSpeech(data);
    const exactPlayerSpeech = selection !== undefined && output.utterance === selection.text;
    const addressVoice = explicitQuotes(data.rawInput).length ? undefined : data.addressVoice;
    const voicedPlayerSpeech = data.playerSpeechVoiceVersion === 1 && playerSpeechFits(selection?.text, output.utterance, addressVoice);
    if (!exactPlayerSpeech && !voicedPlayerSpeech && (!isCommunicationRuntime(data.initialRunPolicy) || data.communicationSelection !== null)
      && !preservesExplicitSpeech(data.rawInput, output.utterance)) fail('player-performance-literal-quote');
    // Literal player quotations remain exact. Newly generated wording must not
    // smuggle gestures or stage directions into the communication channel.
    const generatedSpeech = !exactPlayerSpeech && !explicitQuotes(data.rawInput).length;
    if (generatedSpeech && invalidUtteranceAddress(packet.scope.actorId, addressVoice, output.utterance)) fail('player-performance-address-form');
    if (generatedSpeech && hasMixedUtterance(output.utterance)) fail('player-performance-mixed-speech');
    if (containsMetaLanguage(output.action)
      || (generatedSpeech && containsMetaLanguage(output.utterance))) fail('player-performance-meta-language');
    if (data.contractVersion === 4) assertChosenPerformance(data, output);
    assertNarrativeBallotInstrument(data, output, packet.role);
    assertNarrativeMaterialProse(data, output, packet.role);
    // Style is advisory here. Rejection/retry is explicitly task-scoped and
    // never touches the player's immutable literal utterance.
    analyzeNarrativeStyle(output.action, { scope: 'action' });
    return freeze(clone(output, 12000));
  }
  exact(output, ['text']); text(output.text, 2400);
  // Internal constraints belong in packets/settings, never in delivered prose.
  if (containsMetaLanguage(output.text) || /后续事件/u.test(output.text)) fail();
  return freeze(clone(output, 12000));
}

// Immutable action/communication split, repeated after user style preferences
// by the gateway. This is guidance only: no new permission, task migration or
// output repair; the existing strict choice and quotation validators stay put.
export const PLAYER_CASE_ACTION_INSTRUCTIONS = [
  'Bare case actions are action-only: when rawInput only requests present/出示证物/提交证据, report/通报命案 or inspect/检查材料 and does not independently choose speech or writing, OMIT utterance (an empty string is also silent). A selected case operation or its summary is NOT communication authorization.',
  'For bare present, action may describe preparing or orienting an EXISTING acquired material/phone record for display. For bare report/inspect, describe only the chosen phone/inspection gesture. Exact evidence disclosure, report registration, inspection content and procedural results come ONLY from subsequent host-resolved events. Do not invent paper copies, labels, acquired facts, deductions, audience comprehension or successful results.',
  'Do not create explanatory dialogue, a reading-aloud, written restatement, question, accusation or disclaimer just because evidence is being shown. Do not copy evidence text, a title or quoted words into action as a substitute for utterance. Example rawInput 出示无足迹的颜料地面: return {"action":"我把手机上已有的记录转向庭中，指尖停在屏幕边缘。"}, with NO invented utterance.',
  'This action-only rule does NOT silence an independently chosen natural conversation, direct question, or explicit request to speak/write. If the player explicitly chooses words inside 「」, preserve those exact words in utterance in order, with no additions or paraphrase, even alongside present/report/inspect; keep only gesture/reflection in action. For writing-only communication, presenting a record is not audible speech. Style/persona preferences cannot require an utterance when the player did not authorize one.',
].join('\n');

export const PRIVATE_PLAYER_PERFORMANCE_INSTRUCTIONS = [
  'Express only this player\'s chosen present intention in Chinese. Return a JSON object with required action (observable gestures only, 1-1200 characters), optional reflection (private first-person situational thoughts, at most 1200 characters), and optional utterance (actual chosen speech/writing only). No other fields.',
  'action is witnessed by nearby actors: include only visible posture, gaze, pauses, and preparatory gestures. All inner thoughts, private memories, assessments, secret intentions, silent questions and unexpressed knowledge belong ONLY in reflection, never action. reflection is delivered privately to the player, not to NPCs or the scene composer. Do not restate reflection through action, clothing, signs or invented speech.',
  'Use first-person 我 for this player unless rawInput explicitly chooses another viewpoint. Other people remain third-person. Preserve choices, pronouns and usual self-address; do not invent promises, consent, recovered memory, another person\'s reaction or mind, completed movement or world success.',
  'Every substring explicitly inside 「」 in rawInput MUST appear UNCHANGED in utterance in the same order, with no added words or paraphrase. Optional wrappers and separating whitespace only. Keep ALL actual speech/writing solely in utterance, not action or reflection. Silent thinking does not authorize speech. Writing is delivered only to actual readers, not audible speech.',
  'For terse unquoted communicative intentions, supply only the chosen words. Preserve intent.playerText exactly apart from optional outer dialogue marks. Looking, waiting, moving, thinking, private questions or negated requests to speak authorize no utterance. Movement is preparatory until host events confirm arrival.',
  'Bare present/report/inspect requests authorize only observable preparation with existing acquired materials or phone records, not explanatory speech or written restatement. Do not invent copies, labels, discoveries, deductions, recipients, comprehension or procedural success; only subsequent host events settle these. Do not put evidence text, quoted lines or new communication into action. An independently chosen literal quotation or explicit speaking/writing intention still belongs exactly in utterance. Authorized private reflections belong only in reflection.',
  `When data.statementReaction.version is 1: ${STATEMENT_REACTION_INSTRUCTIONS}`,
].join('\n');

export const PLAYER_TEXT_MAGIC_INSTRUCTIONS = [
  'Text magic version 1: when data.playerTextMagicVersion is 1 and data.magic is present, this ordinary text input may itself be the player\'s attempt to use an ability already offered in data.magic.',
  'Choose magic ONLY when rawInput is the player\'s own present attempt, request or command to use one of those offered abilities on one of those offered targets. Ordinary wording is enough; the input does not need the word 魔法 or a separate button. A quoted, reported, imagined, negated, conditional, hypothetical, retrospective or another actor\'s example does not by itself authorize a current cast.',
  'When confirmed, add exactly {"magic":{"grantId":"one data.magic.actions grantId","targetHandle":"one data.magic.targets handle"}} to the ordinary intent object. The target must be legal for that exact action. A known custom ability appears under data.magic.custom with opaque customBinding handles; for those use exactly {"magic":{"customBinding":"one data.magic.custom.actions customBinding","targetHandle":"one matching data.magic.custom.targets handle"}}. To end the player\'s own current float, when data.magic.end exists, use {"magic":{"end":true}}.',
  'The menu is the whole permission. Never invent or alter a grantId, targetHandle, target, ability, result or new magic rule. If the wording is vague, targets are unclear, or the requested ability/target is absent, return an ordinary intent with no magic; do not claim a successful cast. Actual authorization, reachability and effects are settled by the HOST after this intent, never by this parser.',
].join('\n');
// New ordinary-text swap tasks append this after the unchanged 860 text-magic
// instructions. Old tasks do not carry playerTextSwapVersion and never see it.
export const PLAYER_TEXT_SWAP_RESTORE_INSTRUCTIONS = '普通文本互换归还：当 data.magic.swap.actions 提供 swapAction:"restore" 的 relationHandle 时，本人明确要求结束当前互换，可在普通 intent 对象上使用 {"magic":{"swapAction":"restore","relationHandle":"one delivered relationHandle"}}。只可归还当前已建立的关系，不得借此建立互换、伪造关系或选择其他动作。';
export const NARRATIVE_INSTRUCTIONS = Object.freeze({
  scene_composer: SCENE_COMPOSER_INSTRUCTIONS + '\nWhen data.statementReaction.deliveryVersion is 1, statementReaction.eventId binds the actual host-delivered selected reaction. That event communicates the selected words, including writing to its actual reader: after its event block do not narrate that nobody received/read it, that the selected page was never shown, or that the player chose to keep it only for themselves. Private writing is not audible/public speech and never licenses all bystanders to read it; do not invent recipients, comprehension, agreement or a reply. Preparation before delivery remains preparation.',
  intent_parser: [
    'Interpret the player\'s natural Chinese instruction as their present intention. Accept vague, indirect, conditional and multi-clause commands; select the smallest plausible present step and preserve the distinction between an attempt and its outcome.',
    'Return {"type":"look|move|broadcast|conversation|wait|follow|act","summary":"...","targetId":"...","destination":"..."}. Only type and summary are mandatory. targetId only from scene.nearby; destination only from scene.adjacent.',
    'When contractVersion is 4 and scene.readable is present, explicit reading may use {"type":"read","summary":"...","subjectId":"one delivered readable id"}; browsing or mentioning a document is not reading.',
    'If scene.case is present, also support {"type":"case","summary":"...","operation":"inspect|report|wait_boundary|present|argue","subjectId":"...","stance":"rebut|agree|question|claim","claim":"...","evidenceIds":[],"statementId":"..."}. Inspect only scene.case.inspectables, present/argue only scene.case.knownEvidence, statementId only an existing statement. Omit irrelevant fields. inspect/present require subjectId; argue requires stance, claim, evidenceIds (may be empty). report requires discovery; wait_boundary only investigation/discussion; present/argue only discussion. Do not manufacture clues or certify claims. Formal votes are accepted only by the host explicit-input gate, never infer them. Trial movement/remote re-investigation is forbidden.',
    'When scene.caseRuntime is present, physical case-step execution requires the host explicit-input gate. Do not output type runtime or invent an option id. Exception: when data.playerTextMagicVersion is 1, scene.caseRuntime.options contains a currently delivered option whose kind is exactly swap-offer-hand, and the player\'s words clearly answer that offered handshake, you may return {"type":"runtime","summary":"...","subjectId":"that exact option id"}. This only delivers the player\'s proposal to the existing swap settlement; it never proves acceptance, establishes a swap, or selects any other runtime option. Its generalized case supports only inspect, report, wait_boundary and present, not the fixed fixture argue operation; express arguments as conversation or act without certifying a claim. Routine dialogue, observation, movement and legally delivered investigation operations remain available; an unmodeled attack stays an act attempt, never a completed injury.',
    'For waiting for someone to leave and following, choose follow with that local target; their movement requires their independent decision. A bare continue requests one brief wait or observation. For sleeping until morning, use {"type":"wait","operation":"until_morning","summary":"..."}; for waiting or contemplating during curfew/confinement until the next free time, use {"type":"wait","operation":"until_free_time","summary":"..."} when not in an active case investigation/trial.',
    'Treat hypothetical or negated movement and quoted speech as conversation/act. Resolve attacks, remote targets and locked paths as attempts awaiting a visible response. Preserve literal quoted words exactly.',
    'Do not add a destination, decision, trust, consent, knowledge, injury, magic, items or promises the player did not choose. Return only the JSON object.',
  ].join('\n'),
  player_performance: [
    'Express this player\'s chosen present intention through their own persona in Chinese, grounded in what they can see and hear. Return {"action":"first-person action and situational inner thoughts/observations, 40-220 Chinese characters","utterance":"optional speech/writing"}.',
    'By default, write action in FIRST-PERSON Chinese using 我 for this player\'s own gestures and situational reflections (e.g. 我抬起目光。); other people remain third-person. Honor an explicitly requested different action viewpoint in rawInput or user-configured behavior preferences. Preserve the original pronouns and usual self-address in speech/writing. You may include the player character\'s natural inner thoughts and situational assessments grounded in their persona and present circumstances, while choices and intentions remain faithful to what the player expressed.',
    'Perform the player\'s chosen goal with concrete posture, gaze, pauses, situational thoughts and actions from their own perspective suited to the immediate scene. Do not invent promises/confessions, another actor\'s reaction or inner mind, completed movement, or unapproved world success.',
    'Write natural, affirmative prose from inside the scene. Describe the person\'s concrete actions, inner reflections on the current situation, and the actual obstacle or pause. Research attribution and implementation commentary stay outside generated actions and speech; literal player quotations remain exact.',
    'Every substring explicitly inside 「」 in rawInput MUST appear UNCHANGED in utterance, in the same order, including punctuation and traditional/simplified spelling. If quoted speech exists, utterance consists ONLY of those exact quotations separated by whitespace, with optional 「」 wrappers.',
    'Keep fields separate: generated utterance contains ONLY words actually spoken or written, never surrounding gestures, speech tags, stage directions or inner monologue. Observable gestures and authorized player reflections belong in action. Never output utterance like 「你好。」我抬起头，「你呢？」. This separation never rewrites the player\'s immutable literal quotations.',
    PLAYER_CASE_ACTION_INSTRUCTIONS,
    `When data.statementReaction.version is 1: ${STATEMENT_REACTION_INSTRUCTIONS}`,
    'For terse unquoted communicative intentions, supply only the chosen in-character utterance: no extra question, promise, consent, forgiveness, stance or recovered memory. If intent.playerText is present, preserve it exactly apart from optional outer dialogue marks. Looking, waiting, moving or thinking alone does not authorize speech; private questions and negated requests to speak do not authorize it either. Omit utterance or return an empty string for silence. Put ALL spoken/written content only in utterance, never quote or paraphrase a new line inside action. Show writing through its observable gesture. A quoted promise, stance or claim is not an accomplished social/world effect in action. Keep the prose within the person\'s present experience.',
  ].join('\n'),
  narrator: [
    'Write immersive Chinese scene prose from the current player character\'s subjective viewpoint (first-person 我 or close subjective framing; never address the player as second-person 你). Return {"text":"..."}, 2-4 brief paragraphs (~120-450 Chinese characters). Follow this intention\'s visible consequence through concrete distances, textures, light, sound, pauses and the protagonist\'s immediate perception.',
    'sceneBefore/sceneAfter and resolution provide the settled facts. Narrate sensory framing and their visible consequences. Never modify positions, locks, bodies, inventory, promises or relationships outside those facts.',
    'For look, describe the current room and what can actually be observed from here. Work with the supplied surfaces and people; clues, items, entrances and identities require explicit evidence.',
    'For conditional follow, describe the target\'s actual departure or continued presence. A blocked path can be felt in the bars, lock or halted step. A wait is one finite beat, ending at the next opportunity to act.',
    'Player gestures/quotes and NPC output are delivered separately. Give them sensory context without repeating dialogue or inventing other actors\' thoughts. Use appearance labels until names are known; private recollections and future events remain outside this viewpoint.',
    'Write natural, affirmative Chinese about what is present and happening. Express a limit through the actual bars, distance or pause rather than a list of exclusions. Keep every sentence inside the immediate scene: what the person sees, hears, senses or can presently do. Research attribution and implementation notes belong in development records. End with a concrete detail or a pause that leaves the next choice to the player.',
  ].join('\n'),
});
// Exact pre-swap-runtime intent prompt (current prompt minus the one delivered
// swap-offer-hand exception). Pending tasks sealed before that exception must
// still be reconstructible byte-for-byte at the transport and task-store
// boundaries; no other old prompt is accepted.
export const PRE_SWAP_RUNTIME_INTENT_INSTRUCTIONS = NARRATIVE_INSTRUCTIONS.intent_parser
  .replace(/\s*Exception: when data\.playerTextMagicVersion is 1,[\s\S]*?any other runtime option\./, '');
// New ordinary-text tasks may opt into the HOST-delivered self-service runtime
// lane. Derive this from the current instruction without editing the global
// string, so old PRE_SWAP sealed tasks stay byte-identical.
const SELF_SERVICE_RUNTIME_RULE = `When scene.caseRuntime is present, physical case-step execution requires the host explicit-input gate. Do not output type runtime or invent an option id. Exception: when data.playerTextMagicVersion is 1, scene.caseRuntime.options contains a currently delivered option whose kind is exactly swap-offer-hand, and the player's words clearly answer that offered handshake, you may return {"type":"runtime","summary":"...","subjectId":"that exact option id"}. Self-service exception: when scene.caseRuntime.options contains a currently delivered option whose kind is exactly self-prick or self-heal, and the player's own present words clearly intend exactly that delivered action on their own current body, you may return {"type":"runtime","summary":"...","subjectId":"that exact delivered option id"}; ordinary wording is enough and no exact sentence, ability name or separate button is required. A quoted, reported, imagined, conditional, hypothetical, negated or another actor's example does not authorize either exception. The self-service exception never selects any other runtime option, invents an id, targets another body, or adds injury ids, parameters, grants or refs; actual body, contact and regeneration results are settled only by the HOST. This only delivers the player's proposal to the existing settlement; it never proves acceptance or selects an option outside the current menu.`;
export const PLAYER_RUNTIME_SELF_SERVICE_INTENT_INSTRUCTIONS = NARRATIVE_INSTRUCTIONS.intent_parser
  .replace(/When scene\.caseRuntime is present,[\s\S]*?any other runtime option\./, SELF_SERVICE_RUNTIME_RULE);
// A separate new-task pin additionally allows the currently delivered,
// non-harmful parent-building inspection option. Packets without the pin stay
// exactly on the older prompt so pending/sealed bytes remain byte-identical.
const SELF_SERVICE_AND_INSPECTION_RUNTIME_RULE = SELF_SERVICE_RUNTIME_RULE
  .replace('Self-service exception:', 'Self-service and offered-inspection exceptions:')
  .replace('The self-service exception never selects any other runtime option', 'Neither exception selects any other runtime option')
  .replace('does not authorize either exception', 'does not authorize any of these exceptions')
  + ' Offered-inspection exception: when scene.caseRuntime.options contains a currently delivered option whose kind is exactly inspect-structure, and the player\'s own present words clearly intend inspecting that offered parent building\'s current exterior/placement, you may return {"type":"runtime","summary":"...","subjectId":"that exact option id"}. This only forwards the player\'s proposal to the existing runtimeOperation consumer; it never creates a second inspection executor, a trace, a reading, or any other effect, and it never selects an option outside the current menu.';
export const PLAYER_RUNTIME_OFFERED_INSPECTION_INTENT_INSTRUCTIONS = NARRATIVE_INSTRUCTIONS.intent_parser
  .replace(/When scene\.caseRuntime is present,[\s\S]*?any other runtime option\./, SELF_SERVICE_AND_INSPECTION_RUNTIME_RULE);

// Publication consumes the actual proposed public document/events, after their
// ordinary contracts validated. A conflict becomes Host terminal clarification,
// not a retry that might rewrite the world's physical consequences.
export function initialNarrativeBoundaryConflict(packet, proposed) {
  narrativePacketForTransport(packet);
  return initialPublicBoundaryConflict(packet.data.initialRunPolicy, proposed);
}
