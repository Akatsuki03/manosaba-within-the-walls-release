import { ordinaryCapacityForRevision } from '../content/ordinary-capacity30.mjs';
import { assertDirectorAssemblyPermit, directorAssemblyMayAdvance } from '../director/director-event-lifecycle.mjs';
import { effectiveAssemblyAllowed, withRunBoundary } from '../content/effective-run-boundary.mjs';
import { createHash } from 'node:crypto';
import { hasSoftRuntime } from '../content/relationship-context-policy.mjs';
import { applyCooperativeRephraseResult } from '../agents/cooperative-rephrase.mjs';
import { INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, hasIntentRuntime } from '../content/relationship-context-policy.mjs';
import { projectActionOutcome } from '../world/action-outcome.mjs';
import { isParagraphTurnSpeech, paragraphTurnRecipientPresent, paragraphTurnSourceBound, bareReplyRootSource, currentAddressedStepPresent } from '../agents/communication-selection30.mjs';
import { localConditionalWaitSource, localConditionalWaitStep, localConditionalWaitPlan, LOCAL_CONDITIONAL_WAIT_ACTION } from '../agents/player-address-resolution.mjs';
import { localTravelAttemptSource, localTravelAttemptStep, localTravelDirectedStep, localTravelAttemptPlan, supportsLocalTravelProposal } from '../agents/player-address-resolution.mjs';
import { resolvePlayerAddress, ordinaryReplyContext, localPointFocus, roomGroupSpeechLiteral, roomGroupSpeechSource, ordinaryDialogueSequence, localStairOrientationFocus, localApproachDomain, localApproachObservation, localPersonApproach, localReadinessApproach, localReadinessWait, explicitLocalVocative, ordinaryLocalApproachSource, localAmbientSpeech, localAmbientWait, ordinaryLocalAmbientSpeechSource, ordinaryLocalAmbientStepTypes, localAmbientPlanSpans, localAgreementPerformance, localComposedAmbientStep, localOpenOrientationStep, recentLocalWaitProposal, recentOpenWaitQuestion, ordinaryLocalSearchSource, localSearchLook, localSearchProposal, localThresholdLook, localThresholdLookText, localMoveVisualPrelude, ordinaryLocalVisualActionPins, localSpeechObservation, observedOrientationFocus, topLevelPlayerQuotes } from '../agents/player-address-resolution.mjs';
import { preservesEnactedPlayerSpeech } from '../agents/narrative-boundaries.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { runtimeItemOfferResult } from '../case-runtime.mjs';
import { isDeepStrictEqual } from 'node:util';
import { runtimeCapabilityId } from '../content/runtime-capabilities.mjs';
import { SCENE_BUDGET } from './scene-document.mjs';
import { SCENE_EXTENSION_FIELDS, validateSceneExtensions } from './scene-event-policy.mjs';
import { dialogueContextPin } from '../cognition/dialogue-context-policy.mjs';
import { isProxy } from 'node:util/types';
import { caseActionSeconds } from '../cases/case-action-timing.mjs';
import { confinementApplies } from '../world/curfew-policy.mjs';
import { guardEnabled, guardProtected, assertGuardOrdinaryAction, guardActionSeconds,
  finishGuardAction, settleGuardBoundary, finalizeGuardEntries, validateGuardScenePin } from '../world/guard-reaction.mjs';
import { actorsForState, actorForState, createdPlayerId, CREATED_ROOMS, ROOM_CODES } from '../creation/player-setup.mjs';
import { OUTSKIRTS_ROOMS, isCourtyardEntry, activateOutskirts, outskirtsActive } from '../world/outskirts-world.mjs';
import { runtimeRevisionForState } from '../content/content-revisions.mjs';
import { actorHandle, acquisitionAudience, playerPerceivedScene, projectPerceivedIntent, resolvePerceivedIntent, readingMaterial } from '../characters/actor-perception.mjs';
import { enableAutonomy, applyNpcDecisions, persistEnactments, pendingReactionActors,
  receivedEnactmentCount } from '../agents/agent-autonomy.mjs';
import { enablePrisonWorld, announcePrisonAssembly, prisonClock } from '../world/prison-activity.mjs';
import { CARD_ASSEMBLY_TEXT } from '../content/card-world.mjs';
import { enableCaseRuntime, runtimeActive, runtimeOptions, runtimeRoom, runtimeSetRoom, runtimeOperation,
  runtimeObserve, runtimeAcquire, discoverRuntimeIncidents, runtimeApplyItemPolicy, runtimeDiscoverObjects, runtimePoseActions, runtimeSettlePose, runtimeSwapOptions, runtimeSettleSwapStep, runtimeBodyActorId } from '../case-runtime.mjs';
import { procedureStatementReaction, activeProcedure, settleProcedureIntent, startProcedureTrial,
  validateProcedureIntent, procedureActorScene, inspectionAcquisition, hostCaseChoicePlan } from '../cases/case-procedure.mjs';
import { causalPlayerScene, resolvePlayerPlanStep, validateCausalIntent, roomGroupSpeechAudience, cellDoorAttemptRootSource, isCellDoorAttemptStep, cellDoorAttemptState, validateCausalSceneAction, advanceCausalTime,
  causalEnactment, normalizeCausalEvents, nextFreePeriodBoundary, nextScheduleBoundary, parseScheduleWaitIntent, curfewReturnIntent } from './causal-scene.mjs';
import { validateSceneScheduling, commitSceneScheduling } from './scene-scheduling.mjs';
import { parseTestimonyCommand } from '../cases/trial-testimony.mjs';
import { statementReactionPerformance } from '../cases/statement-reactions.mjs';
import { settleReceptionIntroductions } from '../characters/reception-introductions.mjs';
import { actorObservationId } from '../characters/observation-identity.mjs';
import { executeHostMagic, refreshHostMagic, hostMagicCapabilities, hostMagicTargetEntities, playerTextMagicOffer, hostSelfFloatEndEntries, hostStrengthEndEntries, recordHostMagicWitnessTraces, recordCustomMagicWitnessTraces } from '../world/magic/magic-host.mjs';
import { settleOwnedSelfFloat, settleOwnedStrength } from '../world/magic/ability-runtime.mjs';
import { bodyForMind } from '../world/magic/magic-identity.mjs';
import { magicDefinition, magicId } from '../world/magic/ability-definitions.mjs';
import { runtimeSwapAddressee } from '../presentation/player-communication.mjs';
import { settleAuthoredMagic } from '../world/magic/roleplay-magic.mjs';

const fail = () => { throw Object.assign(new Error('场景分拍记录与其玩家边界、来源或预算不一致。'), { code: 'INVALID_AGENT_STATE' }); };
const record = (value, fields = null) => value && typeof value === 'object' && !isProxy(value)
  && Object.getPrototypeOf(value) === Object.prototype && Reflect.ownKeys(value).every(key => typeof key === 'string'
    && (!fields || fields.includes(key)) && Object.getOwnPropertyDescriptor(value, key).enumerable
    && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
const list = (value, maximum) => Array.isArray(value) && !isProxy(value) && Object.getPrototypeOf(value) === Array.prototype
  && value.length <= maximum && Reflect.ownKeys(value).length === value.length + 1
  && Array.from({ length: value.length }, (_, index) => Object.getOwnPropertyDescriptor(value, String(index)))
    .every(descriptor => descriptor?.enumerable && Object.hasOwn(descriptor, 'value'));
const stage = state => activeProcedure(state)?.stage ?? null;
const roomLabel = room => room === 'court' ? '审判庭' : room === 'infirmary' ? '医务室' : OUTSKIRTS_ROOMS[room] || CREATED_ROOMS[room];
const actionFields = ['type', 'jobId', 'rawInput', 'intent', 'performance', 'document', 'questionKey', 'answerKey',
  'softResult', 'directorEventDue', 'effectiveRunPolicy', 'narrationPacingVersion', 'omittedNarrationParagraphs', 'bareReplyRootVersion', 'cellDoorAttemptVersion', 'localTravelAttemptVersion', 'localConditionalWaitVersion', 'ordinaryAddressVersion', 'ordinaryLocalApproachVersion', 'ordinaryLocalAmbientSpeechVersion', 'ordinaryLocalSearchConversationVersion', 'ordinaryLocalLookOutcomeVersion', 'ordinaryMoveVisualPreludeVersion', 'roomGroupSpeechVersion', 'ordinaryDialogueSequenceVersion', 'playerIntentPlan', 'playerPerformances', 'actionOutcome', 'authoredMagicVersion', 'authoredMagicDestinationVersion', 'dialogueContextVersion', 'roomLabelVersion', 'worldVersion', 'ballots', 'decisionVersion', 'decisions', 'causalVersion', 'causalTimingVersion', 'sceneBeatVersion', 'beats',
  'performanceVersion', 'schedulingVersion', 'schedulingBeats', 'schedulingEnd', 'decisionAuditVersion', 'itemPolicyVersion', 'caseActionTimingVersion', 'introductionVersion', 'scheduleWaitVersion', 'storyLifeVersion', 'storyArcVersion', 'guardRules', 'npcMagicCastVersion', 'npcVoluntaryFloatVersion', 'npcMedicalContactVersion', 'playerRuntimeCommunicationVersion', 'rootCaseOptionsVersion', ...SCENE_EXTENSION_FIELDS];
// Text magic is a separate ordinary-act pin. It is never inferred from a
// keyword: the model may only choose a host-issued grant and target handle
// already present in this exact menu, then the existing HOST executor settles
// the effect inside the same action transaction.

// Prefixes contain data only. In particular, a proposal cannot smuggle an
// accessor, proxy, prototype operation or callback into a resumed execution.
function serializable(value, depth = 0, ancestors = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object' || isProxy(value) || depth > 32 || ancestors.has(value)) fail();
  const keys = Reflect.ownKeys(value);
  if (keys.length > 8192 || !(Array.isArray(value) ? list(value, 8191) : record(value, keys))) fail();
  ancestors.add(value);
  for (const key of keys) if (key !== 'length' || !Array.isArray(value)) serializable(value[key], depth + 1, ancestors);
  ancestors.delete(value);
}
function rootAction(action) {
  const { beats, document, schedulingBeats, schedulingEnd, playerPerformances, actionOutcome, softResult, omittedNarrationParagraphs, ...root } = action;
  return root;
}
function validateBeats(beats, state) {
  if (!list(beats, 3)) fail();
  const counts = new Map(); const player = state && createdPlayerId(state); let calls = 0;
  for (const [index, beat] of beats.entries()) {
    if (!record(beat, ['beat', 'phase', 'decisions']) || beat.beat !== index + 1
      || !['reaction', 'npc'].includes(beat.phase) || !list(beat.decisions, 3)) fail();
    const owners = new Set();
    for (const row of beat.decisions) {
      if (!record(row, ['actorId', 'proposal']) || typeof row.actorId !== 'string' || !row.actorId
        || !record(row.proposal, ['action', 'utterance', 'intent', 'decision', 'stateUpdates', 'communication', ...(hasSoftRuntime(state) ? ['ordinaryParticipation'] : [])])
        || !record(row.proposal.decision, ['mode', 'goalId', 'strategy', 'assessment', 'operation', 'sourceObservationIds'])
        || !record(row.proposal.decision.operation, ['type', 'targetHandle', 'destination', 'subjectId'])
        || typeof row.proposal.decision.operation.type !== 'string' || owners.has(row.actorId)
        || row.actorId === 'warden' || (state && (row.actorId === player || !actorForState(state, row.actorId)))) fail();
      serializable(row.proposal);
      owners.add(row.actorId); counts.set(row.actorId, (counts.get(row.actorId) || 0) + 1); calls++;
    }
  }
  const budget = state ? runtimeRevisionForState(state).policy.sceneBudget : { decisions: 6, actors: 3, perActor: 2 };
  if (calls > budget.decisions || counts.size > budget.actors || [...counts.values()].some(count => count > budget.perActor)) fail();
}
function validateAction(action, state) {
  validateSceneExtensions(action);
  if (Object.hasOwn(action, 'ordinaryAddressVersion') && (![2, 3].includes(action.ordinaryAddressVersion)
    || state.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION || action.intentContractVersion !== 2)) fail();
  if (Object.hasOwn(action, 'narrationPacingVersion') && (![2, 3].includes(action.narrationPacingVersion) || !hasSoftRuntime(state))) fail();
  if (Object.hasOwn(action, 'omittedNarrationParagraphs') && (action.narrationPacingVersion !== 2 || !action.document
    || !Number.isSafeInteger(action.omittedNarrationParagraphs) || action.omittedNarrationParagraphs < 1
    || action.omittedNarrationParagraphs > SCENE_BUDGET.maxNarrationChars)) fail();
  if (Object.hasOwn(action, 'directorEventDue')) assertDirectorAssemblyPermit(action.directorEventDue, state, action.jobId);
  if (action.hostCaseChoiceVersion === 1) {
    const plan = action.playerIntentPlan;
    if (!hasSoftRuntime(state) || action.intentContractVersion !== 2
      || !record(plan, ['type', 'route', 'summary', 'steps']) || plan.type !== 'plan' || plan.route !== 'steps'
      || plan.summary !== action.intent?.summary || !list(plan.steps, 1) || plan.steps.length !== 1
      || !record(plan.steps[0], ['text', 'intent', 'condition']) || plan.steps[0].condition !== 'always'
      || plan.steps[0].text !== action.rawInput || !isDeepStrictEqual(plan.steps[0].intent, action.intent)
      || action.playerPerformances?.length) fail();
  }
  if ([1, 2].includes(action.intentContractVersion)) {
    if (!hasIntentRuntime(state?.agentRuntimeRevision) || runtimeRevisionForState(state).policy.intentContractVersion !== action.intentContractVersion) fail();
    if (action.playerIntentPlan && (action.playerIntentPlan.type !== 'plan' || action.playerIntentPlan.route !== 'steps'
      || !list(action.playerIntentPlan.steps, 3) || !action.playerIntentPlan.steps.length)) fail();
    if (action.playerPerformances && (!list(action.playerPerformances, 2)
      || action.playerPerformances.some((row, i) => !record(row, ['index', 'performance']) || row.index !== i + 1))) fail();
  } else if (['playerIntentPlan', 'playerPerformances', 'actionOutcome'].some(key => Object.hasOwn(action, key))) fail();
  if (Object.hasOwn(action, 'authoredMagicVersion')
    && (action.authoredMagicVersion !== 1 || state.authoredMagicVersion !== 1 || action.intentContractVersion !== 2)) fail();
  if (Object.hasOwn(action, 'authoredMagicDestinationVersion')
    && (action.authoredMagicDestinationVersion !== 1 || action.authoredMagicVersion !== 1)) fail();
  if (action.intent?.type === 'magic') {
    const steps = action.playerIntentPlan?.steps;
    if (action.authoredMagicVersion !== 1 || steps?.length !== 1 || steps[0].condition !== 'always'
      || steps[0].text !== action.rawInput || !isDeepStrictEqual(steps[0].intent, action.intent)) fail();
  }
  if (hasSoftRuntime(state)) {
    if (action.intentContractVersion !== 2 || action.softResultVersion !== 1 || action.ordinaryParticipationVersion !== 1) fail();
  } else if (['softResult', 'softResultVersion', 'ordinaryParticipationVersion'].some(key => Object.hasOwn(action, key))) fail();
  if (action.softResult && Buffer.byteLength(JSON.stringify(action.softResult), 'utf8') > ordinaryCapacityForRevision(runtimeRevisionForState(state).id).suffixBytes) fail();
  dialogueContextPin(action);
  validateGuardScenePin(state, action);
  if (!record(action, actionFields) || action.sceneBeatVersion !== 1 || action.causalTimingVersion !== 1
    || !list(action.decisions, 0) || !list(action.beats, 3)) fail();
  if ((Object.hasOwn(action, 'schedulingVersion') && action.schedulingVersion !== 1)
    || ((Object.hasOwn(action, 'schedulingEnd') || Object.hasOwn(action, 'schedulingBeats')) && action.schedulingVersion !== 1)
    || (action.schedulingVersion === 1 && (!['agent-prison-runtime@2', 'agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(state?.agentRuntimeRevision))
      || !list(action.schedulingBeats, 3) || action.schedulingBeats.length !== action.beats.length))) fail();
  if (Object.hasOwn(action, 'decisionAuditVersion') && (action.decisionAuditVersion !== 1
    || action.schedulingVersion !== 1 || !['agent-prison-runtime@2', 'agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(state?.agentRuntimeRevision)))) fail();
  if (Object.hasOwn(action, 'itemPolicyVersion') && ![1, 2].includes(action.itemPolicyVersion)) fail();
  if (Object.hasOwn(action, 'caseActionTimingVersion') && (action.caseActionTimingVersion !== 2
    || runtimeCapabilityId(state?.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail();
  if (Object.hasOwn(action, 'objectInspectionTimingVersion') && (action.objectInspectionTimingVersion !== 1
    || action.sceneBeatVersion !== 1 || action.causalVersion !== 1 || action.itemPolicyVersion !== 2
    || runtimeCapabilityId(state?.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail();
  if (Object.hasOwn(action, 'rootCaseOptionsVersion') && (action.rootCaseOptionsVersion !== 1
    || action.sceneBeatVersion !== 1 || action.causalVersion !== 1
    || runtimeCapabilityId(state?.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail();
  if (Object.hasOwn(action, 'introductionVersion') && (![1, 2, 3, 4, 5].includes(action.introductionVersion)
    || action.introductionVersion === 4 && !['agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(state?.agentRuntimeRevision)))) fail();
  if (Object.hasOwn(action, 'scheduleWaitVersion') && (action.scheduleWaitVersion !== 1
    || !['agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(state?.agentRuntimeRevision)))) fail();
  if (Object.hasOwn(action, 'storyArcVersion') && (action.storyArcVersion !== 1
    || state?.creation?.storyArcId !== 'case-one-day3@1')) fail();
  if (Object.hasOwn(action, 'storyLifeVersion') && (action.storyLifeVersion !== 1
    || runtimeCapabilityId(state?.agentRuntimeRevision) !== 'agent-prison-runtime@8' || state.storyLifeVersion !== 1)) fail();
  if (Object.hasOwn(action, 'npcMagicCastVersion') && (action.npcMagicCastVersion !== 1
    || runtimeCapabilityId(state?.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail();
  if (Object.hasOwn(action, 'npcVoluntaryFloatVersion') && (action.npcVoluntaryFloatVersion !== 1
    || action.npcMagicCastVersion !== 1 || runtimeCapabilityId(state?.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail();
  if (Object.hasOwn(action, 'npcMedicalContactVersion') && (action.npcMedicalContactVersion !== 1
    || action.npcMagicCastVersion !== 1 || runtimeCapabilityId(state?.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail();
  if (Object.hasOwn(action, 'playerTextMagicVersion') && (action.playerTextMagicVersion !== 1
    || runtimeCapabilityId(state?.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail();
  if (Object.hasOwn(action, 'playerRuntimeCommunicationVersion')
    && (action.playerRuntimeCommunicationVersion !== 1 || action.swapLifecycleVersion !== 1
      || runtimeCapabilityId(state?.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail();
  const { sceneBeatVersion, beats, schedulingVersion, schedulingBeats, schedulingEnd, decisionAuditVersion, introductionVersion, scheduleWaitVersion, storyLifeVersion, storyArcVersion, authoredMagicVersion, authoredMagicDestinationVersion,
    playerIntentPlan, playerPerformances, actionOutcome, softResult, directorEventDue, effectiveRunPolicy, narrationPacingVersion, omittedNarrationParagraphs, bareReplyRootVersion, cellDoorAttemptVersion, localTravelAttemptVersion, localConditionalWaitVersion, ordinaryAddressVersion, ordinaryLocalApproachVersion, ordinaryLocalAmbientSpeechVersion, ordinaryLocalSearchConversationVersion, ordinaryLocalLookOutcomeVersion, ordinaryMoveVisualPreludeVersion, roomGroupSpeechVersion, ordinaryDialogueSequenceVersion, softResultVersion, ordinaryParticipationVersion, intentContractVersion, hostCaseChoiceVersion, dialogueContextVersion, sceneEventTimeVersion, outputContractVersion, ambientContinuityVersion, materialProseVersion, physicalFactsVersion, postureActionVersion, occupiedBodyVersion, swapLifecycleVersion, npcMagicCastVersion, npcVoluntaryFloatVersion, npcMedicalContactVersion, playerTextMagicVersion, playerRuntimeCommunicationVersion, rootCaseOptionsVersion, objectInspectionTimingVersion, selfFloatEndObservationVersion, magicCaseWitnessVersion, customMagicCaseWitnessVersion, npcCurrentSituationVersion, ...legacy } = action;
  if (action.swapLifecycleVersion === 1 && !state?.caseRuntime?.swapLifecycle) fail();
  if (action.occupiedBodyVersion === 1 && !state?.caseRuntime?.occupiedBody) fail();
  if (action.postureActionVersion === 1 && (action.itemPolicyVersion !== 2 || action.physicalFactsVersion !== 2
    || runtimeCapabilityId(state?.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail();
  if (Object.hasOwn(action, 'performanceVersion') && (action.performanceVersion !== 2
    || runtimeRevisionForState(state).policy.playerPerformanceVersion !== 2)) fail();
  // Root playback owns only the first quoted delivery. Validate the complete
  // source binding first, then apply the unchanged causal quote guard to its
  // own step. Later deliveries independently run the same guard at the tail.
  const quotedRoot = state.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION
    && paragraphTurnSourceBound(action.rawInput, playerIntentPlan?.steps);
  if (quotedRoot && !isDeepStrictEqual(legacy.intent, playerIntentPlan.steps[0].intent)) fail();
  if (Object.hasOwn(action, 'bareReplyRootVersion') && (action.bareReplyRootVersion !== 1 || !quotedRoot
    || !bareReplyRootSource(action.rawInput, playerIntentPlan.steps))) fail();
  if (Object.hasOwn(action, 'cellDoorAttemptVersion') && (action.cellDoorAttemptVersion !== 1
    || action.intentContractVersion !== 2 || state.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION
    || !(playerIntentPlan ? cellDoorAttemptRootSource(action.rawInput, playerIntentPlan.steps)
      : action.jobId?.endsWith(':step:2') && isCellDoorAttemptStep(action.rawInput, action.intent)))) fail();
  const source = action.ordinaryAddressVersion === 3 ? firstAddressClause(action) : undefined;
  const itemRoot = ordinaryItemRootStep(action);
  if (itemRoot) {
    const item = itemRoot.intent, give = item.operation === 'give';
    const fields = ['type', 'operation', 'objectId', 'summary', ...(give ? ['targetId'] : [])];
    if (!record(itemRoot, ['text', 'intent', 'condition']) || itemRoot.condition !== 'always'
      || !record(item, fields) || Object.keys(item).length !== fields.length
      || !['take', 'drop', 'give'].includes(item.operation) || typeof item.objectId !== 'string' || !item.objectId.trim()
      || give && (typeof item.targetId !== 'string' || !item.targetId.trim())
      || !record(legacy.intent, ['type', 'subjectId', 'summary']) || Object.keys(legacy.intent).length !== 3
      || legacy.intent.type !== 'runtime' || typeof legacy.intent.subjectId !== 'string' || !legacy.intent.subjectId.trim()
      || typeof item.summary !== 'string' || legacy.intent.summary !== item.summary) fail();
  } else if (source && !isDeepStrictEqual(legacy.intent, source.intent)) fail();
  const grouped = playerIntentPlan?.steps.filter(step => Object.hasOwn(step.intent, 'speechScope'))
    ?? (Object.hasOwn(action.intent, 'speechScope') && source ? [source] : []);
  if (ordinaryDialogueSequenceVersion !== 4 && (grouped.length || roomGroupSpeechVersion !== undefined)) {
    const group = grouped[0];
    const proof = playerIntentPlan ? (localTravelAttemptVersion===1 ? localTravelAttemptSource(action.rawInput)
       : roomGroupSpeechSource(action.rawInput)) : roomGroupSpeechLiteral(source?.text);
    if (roomGroupSpeechVersion !== 1 || action.ordinaryAddressVersion !== 3 || grouped.length !== 1
      || group.intent.type !== 'conversation' || group.intent.speechScope !== 'room' || !proof
      || playerIntentPlan && proof.stepText !== group.text || group.intent.playerText !== proof.text
      || !record(group.intent, ['type', 'summary', 'speechScope', 'playerText'])) fail();
  }
  if (Object.hasOwn(action,'localTravelAttemptVersion')) {
    if (![1,2].includes(localTravelAttemptVersion) || state.agentRuntimeRevision!==EVENT_DIRECTOR_RUNTIME_REVISION
      || ordinaryAddressVersion!==3 || intentContractVersion!==2 || ordinaryDialogueSequenceVersion!==undefined
      || ordinaryLocalApproachVersion!==undefined || ordinaryLocalAmbientSpeechVersion!==undefined || ordinaryLocalSearchConversationVersion!==undefined) fail();
    if (playerIntentPlan) {
      const proof=localTravelAttemptSource(action.rawInput,undefined,localTravelAttemptVersion);
      if (!proof || roomGroupSpeechVersion!==(localTravelAttemptVersion===1?1:undefined)
        || !isDeepStrictEqual(playerIntentPlan.steps,localTravelAttemptPlan({...proof,targetId:action.intent.targetId}).steps)
        || !isDeepStrictEqual(action.performance,{action:'',utterance:proof.text})) fail();
    } else if (localTravelAttemptVersion===2) {
      const index=action.jobId?.endsWith(':step:1') ? 1 : action.jobId?.endsWith(':step:2') ? 2 : 0;
      const step=localTravelDirectedStep(action.rawInput,undefined,index);
      if (roomGroupSpeechVersion!==undefined || action.intent.type!=='act' || !record(action.intent,['type','summary'])
        || !step || !isDeepStrictEqual(action.performance,{action:step.action})) fail();
    } else if (roomGroupSpeechVersion!==undefined || !action.jobId?.endsWith(':step:1') || action.intent.type!=='act'
      || !localTravelAttemptStep(action.rawInput) || !isDeepStrictEqual(action.performance,{action:action.rawInput})) fail();
  }
  if (Object.hasOwn(action,'localConditionalWaitVersion')) {
    if (localConditionalWaitVersion!==1 || state.agentRuntimeRevision!==EVENT_DIRECTOR_RUNTIME_REVISION || ordinaryAddressVersion!==3
      || intentContractVersion!==2 || roomGroupSpeechVersion!==undefined || localTravelAttemptVersion!==undefined
      || ordinaryDialogueSequenceVersion!==undefined || ordinaryLocalApproachVersion!==undefined
      || ordinaryLocalAmbientSpeechVersion!==undefined || ordinaryLocalSearchConversationVersion!==undefined) fail();
    if (playerIntentPlan) {
      const proof=localConditionalWaitSource(action.rawInput);
      if (!proof || typeof action.intent.targetId!=='string' || !isDeepStrictEqual(playerIntentPlan.steps,
        localConditionalWaitPlan({...proof,targetId:action.intent.targetId}).steps)
        || !isDeepStrictEqual(action.performance,{action:'',utterance:proof.text})) fail();
    } else if (!action.jobId?.endsWith(':step:1') || action.intent.type!=='wait' || !record(action.intent,['type','summary'])
      || !localConditionalWaitStep(action.rawInput) || !isDeepStrictEqual(action.performance,{action:LOCAL_CONDITIONAL_WAIT_ACTION})) fail();
  }
  const exact = source?.intent.type === 'conversation' ? source.intent.playerText : v2AddressedSpeech(action);
  if (ordinaryLocalLookOutcomeVersion !== undefined || ordinaryMoveVisualPreludeVersion !== undefined) {
    const allowed=playerIntentPlan ? ordinaryLocalVisualActionPins(action,action.rawInput,playerIntentPlan.steps)
      : ordinaryLocalVisualActionPins(action,action.rawInput,[{text:action.rawInput,intent:action.intent}]);
    if (state.agentRuntimeRevision!==EVENT_DIRECTOR_RUNTIME_REVISION || intentContractVersion!==2
      || ordinaryLocalLookOutcomeVersion!==allowed.ordinaryLocalLookOutcomeVersion
      || ordinaryMoveVisualPreludeVersion!==allowed.ordinaryMoveVisualPreludeVersion) fail();
  }
  // This carrier is limited to stages proved again against their actual prefix.
  if (ordinaryLocalAmbientSpeechVersion !== undefined) {
    const composed=[3,4].includes(ordinaryLocalAmbientSpeechVersion);
    const stepSource=ordinaryLocalAmbientSpeechVersion===4?localOpenOrientationStep:localComposedAmbientStep;
    const types=composed ? playerIntentPlan
      ? ordinaryLocalAmbientSpeechSource(action.rawInput,undefined,ordinaryLocalAmbientSpeechVersion)?.map(row=>row.type) ?? []
      : [stepSource(action.rawInput)?.type] : ordinaryLocalAmbientStepTypes(ordinaryLocalAmbientSpeechVersion);
    if (!types.length || ordinaryAddressVersion!==3 || ordinaryDialogueSequenceVersion!==undefined
      || ordinaryLocalApproachVersion!==undefined || roomGroupSpeechVersion!==undefined || cellDoorAttemptVersion!==undefined
      || state.agentRuntimeRevision!==EVENT_DIRECTOR_RUNTIME_REVISION || !record(action.intent,['type','summary'])) fail();
    const raw=playerIntentPlan?.steps[0]?.text ?? action.rawInput;
    if (playerIntentPlan) {
      if (playerIntentPlan.steps.length!==types.length || playerIntentPlan.steps.some((step,index)=>step.intent.type!==types[index]
        || !record(step.intent,['type','summary']) || (index===0 ? step.condition!=='always' : !['always','previous_completed'].includes(step.condition)))) fail();
      if (ordinaryLocalAmbientSpeechVersion!==1 && !isDeepStrictEqual(action.intent,playerIntentPlan.steps[0].intent)) fail();
    } else if (composed ? !/:step:[12]$/u.test(action.jobId) || action.intent.type!==types[0]
      || ordinaryLocalAmbientSpeechVersion===4 && stepSource(action.rawInput)?.kind!==(action.jobId.endsWith(':step:1')?'orientation':'proposal')
      : !(action.jobId.endsWith(':step:1') && action.intent.type===types[1]
      || action.jobId.endsWith(':step:2') && action.intent.type==='wait')) fail();
    if (ordinaryLocalAmbientSpeechVersion===1 && (action.intent.type==='act' ? !record(action.performance,['action','utterance'])
      || action.performance.action!=='我开口问。' : !record(action.performance,['action']) || action.performance.action!==raw)) fail();
  }
  if (ordinaryLocalSearchConversationVersion !== undefined) {
    if (ordinaryLocalSearchConversationVersion!==1 || ordinaryAddressVersion!==3 || ordinaryDialogueSequenceVersion!==undefined
      || ordinaryLocalApproachVersion!==undefined || ordinaryLocalAmbientSpeechVersion!==undefined || roomGroupSpeechVersion!==undefined
      || state.agentRuntimeRevision!==EVENT_DIRECTOR_RUNTIME_REVISION || action.performanceVersion!==2) fail();
    const speechShape=step=>step?.intent.type==='conversation' && record(step.intent,['type','summary','targetId','playerText']);
    if (playerIntentPlan) {
      const [head,look,tail]=playerIntentPlan.steps;
      if (playerIntentPlan.steps.length!==3 || !speechShape(head) || !speechShape(tail) || head.condition!=='always'
        || head.intent.targetId!==tail.intent.targetId || look.intent.type!=='look' || !record(look.intent,['type','summary'])
        || [look,tail].some(step=>!['always','previous_completed'].includes(step.condition))) fail();
    } else if (action.jobId.endsWith(':step:1') ? action.intent.type!=='look' || !record(action.intent,['type','summary'])
      : !action.jobId.endsWith(':step:2') || !speechShape(firstAddressClause(action))) fail();
    if (action.intent.type==='conversation' && (!record(action.performance,['action','utterance'])
      || action.performance.action!=='' || action.performance.utterance!==exact)) fail();
  }
  if (ordinaryLocalApproachVersion===3) {
    if (ordinaryAddressVersion!==3 || ordinaryDialogueSequenceVersion!==undefined || roomGroupSpeechVersion!==undefined
      || cellDoorAttemptVersion!==undefined || bareReplyRootVersion!==undefined || ordinaryLocalAmbientSpeechVersion!==undefined
      || ordinaryLocalSearchConversationVersion!==undefined) fail();
    if (playerIntentPlan) {
      const [,near,tail]=playerIntentPlan.steps;
      if (!localApproachDomain(action.rawInput,3) || playerIntentPlan.steps.length!==3 || source?.condition!=='always'
        || action.intent.type!=='conversation' || !exact || !isDeepStrictEqual(action.intent,source.intent)
        || !record(action.intent,['type','summary','targetId','playerText']) || !record(action.performance,['action','utterance'])
        || action.performance.action!=='' || action.performance.utterance!==exact
        || near?.condition!=='previous_completed' || near.intent.type!=='act' || !record(near.intent,['type','summary'])
        || tail?.condition!=='previous_completed' || tail.intent.type!=='wait' || !record(tail.intent,['type','summary'])) fail();
    } else if (!record(action.intent,['type','summary']) || !record(action.performance,['action'])
      || !(action.jobId?.endsWith(':step:1') && action.intent.type==='act'
           || action.jobId?.endsWith(':step:2') && action.intent.type==='wait' && action.performance.action==='我在原地稍等。')) fail();
  } else if (ordinaryLocalApproachVersion===2) {
    if (ordinaryAddressVersion!==3 || ordinaryDialogueSequenceVersion!==undefined || roomGroupSpeechVersion!==undefined
      || cellDoorAttemptVersion!==undefined || bareReplyRootVersion!==undefined || ordinaryLocalAmbientSpeechVersion!==undefined
      || ordinaryLocalSearchConversationVersion!==undefined) fail();
    if (playerIntentPlan) {
      const [,tail]=playerIntentPlan.steps;
      if (!localApproachDomain(action.rawInput,2) || playerIntentPlan.steps.length!==2 || source?.condition!=='always'
        || action.intent.type!=='act' || !record(action.intent,['type','summary']) || !isDeepStrictEqual(action.intent,source.intent)
        || !record(action.performance,['action']) || tail?.condition!=='previous_completed' || tail.intent.type!=='conversation'
        || !record(tail.intent,['type','summary','targetId','playerText'])) fail();
    } else if (!action.jobId?.endsWith(':step:1') || action.intent.type!=='conversation' || !exact
      || !record(action.intent,['type','summary','targetId','playerText']) || !record(action.performance,['action','utterance'])
      || action.performance.action!=='我轻声开口。' || action.performance.utterance!==exact) fail();
  } else if (ordinaryLocalApproachVersion !== undefined) {
    if (ordinaryLocalApproachVersion !== 1 || ordinaryAddressVersion !== 3 || ordinaryDialogueSequenceVersion !== undefined
      || roomGroupSpeechVersion !== undefined || cellDoorAttemptVersion !== undefined || bareReplyRootVersion !== undefined) fail();
    if (playerIntentPlan) {
      const [, tail] = playerIntentPlan.steps;
      if (!localApproachDomain(action.rawInput) || playerIntentPlan.steps.length !== 2 || source?.condition !== 'always'
        || action.intent.type !== 'conversation' || !exact || action.performance.utterance !== exact || action.performance.action !== ''
        || Object.hasOwn(action.performance, 'reflection') || tail?.intent.type !== 'act' || !['always','previous_completed'].includes(tail.condition)
        || !record(tail.intent, ['type','summary'])) fail();
    } else if (!action.jobId?.endsWith(':step:1') || action.intent.type !== 'act' || !record(action.intent, ['type','summary'])
      || !record(action.performance, ['action']) || action.performance.action !== action.rawInput) fail();
  }
  if (ordinaryDialogueSequenceVersion !== undefined) {
    const quotes = topLevelPlayerQuotes(action.rawInput);
    const groupRoot = ordinaryDialogueSequenceVersion === 4 && action.intent?.speechScope === 'room';
    if (![1, 2, 3, 4, 5, 6, 7, 8].includes(ordinaryDialogueSequenceVersion) || ordinaryAddressVersion !== 3
      || roomGroupSpeechVersion !== (groupRoot ? 1 : undefined)
      || playerIntentPlan?.steps.length !== 1 || source?.text !== action.rawInput || source.condition !== 'always'
      || ![2, 3].includes(quotes?.length) || [3, 6, 7, 8].includes(ordinaryDialogueSequenceVersion) && quotes.length !== 2 || exact !== action.rawInput.slice(quotes[0].start, quotes[0].end)
      || !record(action.intent, ['type', 'summary', groupRoot ? 'speechScope' : 'targetId', 'playerText']) || action.performance.action !== ''
      || action.performance.utterance !== exact || Object.hasOwn(action.performance, 'reflection')) fail();
  }
  validateCausalSceneAction(quotedRoot || source ? { ...legacy, rawInput: source?.text ?? playerIntentPlan.steps[0].text } : legacy,
    exact ? { exactAddressedSpeech: exact, hostDialogueSequence: localConditionalWaitVersion === 1 || [1,2].includes(localTravelAttemptVersion) || ordinaryLocalSearchConversationVersion === 1 || [1,3].includes(ordinaryLocalApproachVersion) || [1, 2, 3, 4, 5, 6, 7, 8].includes(ordinaryDialogueSequenceVersion) } : undefined);
  validateBeats(beats, state);
  serializable(rootAction(action));
  return action;
}
// Only a V2 full single-step action can carry an independently selected
// report with its own interior quote(s). The actual audience is rechecked at
// beginScene, not later against a changed room during cached prefix replay.
function v2AddressedSpeech(action) {
  const steps = action.playerIntentPlan?.steps;
  if (action.ordinaryAddressVersion !== 2 || steps?.length !== 1 || steps[0].text !== action.rawInput
    || steps[0].condition !== 'always' || action.intent.type !== 'conversation'
    || !isDeepStrictEqual(action.intent, steps[0].intent)) return undefined;
  return action.intent.playerText;
}
function firstAddressClause(action) {
  return action.playerIntentPlan?.steps?.[0]
    ?? (/^.+:step:[12]$/u.test(action.jobId) ? { text: action.rawInput, intent: action.intent } : undefined);
}
function ordinaryItemRootStep(action) {
  const step = action.ordinaryAddressVersion === 3 ? action.playerIntentPlan?.steps?.[0] : undefined;
  return step?.intent?.type === 'item' ? step : undefined;
}
function liveAddressPresent(state, scene, text, intent, roomGroupSpeechVersion) {
  if (intent.speechScope === 'room') return roomGroupSpeechVersion === 1
    && roomGroupSpeechLiteral(text)?.text === intent.playerText && roomGroupSpeechAudience(state, scene).length >= 3;
  const perception = playerPerceivedScene(state, scene);
  Object.assign(perception.scene, ordinaryReplyContext(state, createdPlayerId(state), perception.scene, perception.targetIds, 3));
  return currentAddressedStepPresent(text, projectPerceivedIntent(intent, perception.targetIds), perception.scene);
}
function sequenceAudience(state, player, peer, room) {
  if (state.completed || state.caseRuntime?.occupiedBody || state.guardReaction?.pending
    || !runtimeActive(state, player) || !runtimeActive(state, peer)
    || runtimeRoom(state, player) !== room || runtimeRoom(state, peer) !== room
    || actorForState(state, player)?.communication !== 'speech') return null;
  const ids = acquisitionAudience(state, player, { delivery: 'speech', targetId: peer });
  return ids.includes(peer) ? ids : null;
}

// V6 only. Prove a live received ask, not a speaker inferred from its wording.
// Canonical NPC speak is emitted to its same-room audience. For legacy entries
// without a room stamp, require the latest committed beat and no later arrival.
export function ordinaryLocalPointReplyContext(state, player, scene, targetIds = {}) {
  if (typeof scene?.roomId !== 'string' || !Array.isArray(scene.nearby) || !Number.isSafeInteger(state?.worldTime)) return {};
  const now = state.worldTime, ledger = state.agentAutonomy?.conversation;
  const requests = ledger?.requests?.filter(row => row.recipientId === player && row.kind === 'ask'
    && row.status === 'pending' && row.reviewAt <= now && row.expiresAt > now);
  if (requests?.length !== 1) return {};
  const [request] = requests, peer = request.senderId;
  const session = ledger.sessions?.find(row => row.id === request.sessionId);
  if (peer === player || session?.status !== 'open' || session.expiresAt <= now || session.participantIds?.length !== 2
    || !session.participantIds.includes(peer) || !session.participantIds.includes(player)
    || !sequenceAudience(state, player, peer, scene.roomId)) return {};
  const perceived = scene.nearby.filter(row => (Object.hasOwn(targetIds, row.id) ? targetIds[row.id] : row.id) === peer);
  if (perceived.length !== 1 || scene.nearby.filter(row => row.id === perceived[0].id).length !== 1) return {};

  // Stop at a newer real exchange or player arrival, not narration or an overheard line.
  const entry = state.entries?.slice(-24).reverse().find(row =>
    row.delivery === 'action' && row.speakerId === player && row.observationKey?.endsWith(':arrival')
    || ['speech', 'writing'].includes(row.delivery) && row.audienceIds?.includes(player)
      && (row.speakerId === player && row.addresseeIds?.length || row.addresseeIds?.includes(player)));
  if (!entry || entry.observationKey !== request.eventId || entry.delivery !== 'speech' || entry.communication?.kind !== 'ask'
    || entry.speakerId !== peer || !entry.audienceIds.includes(peer) || !entry.addresseeIds?.includes(player)
    || entry.conversationRoomId !== undefined && entry.conversationRoomId !== scene.roomId
    || entry.occurredAt !== request.createdAt || !Number.isSafeInteger(entry.learnedAt)
    || entry.learnedAt < entry.occurredAt || entry.learnedAt > now) return {};
  const sourceId = actorObservationId(state, entry.observationKey, player);
  const receipt = ledger.journal?.entries?.find(row => row.id === entry.observationKey);
  if (request.sourceObservationId !== sourceId || receipt?.occurredAt !== entry.occurredAt
    || !Number.isSafeInteger(receipt.appliedAt) || receipt.appliedAt < entry.occurredAt || receipt.appliedAt > now
    || !receipt.requestIds?.includes(request.id)
    || !receipt.observations?.some(row => row.ownerId === player && row.observationId === sourceId)) return {};
  const latest = state.agentActions?.at(-1);
  if (!latest?.beats?.some(beat => entry.observationKey === `npc:${latest.jobId}:beat:${beat.beat}:${peer}`
    && beat.decisions.some(({ actorId, proposal }) => actorId === peer && proposal.decision?.operation?.type === 'speak'
      && proposal.utterance === entry.text && proposal.communication?.kind === 'ask'
      && proposal.communication.addresseeHandles?.includes(actorHandle(peer, player))))) return {};
  return { replyPeer: perceived[0].id };
}

// A statement can be the second half of an actual local exchange even
// when the old ask ledger is closed. Require both immediately adjacent
// directed voices in the latest committed turn, not a guessed recipient.
export function ordinaryLocalStairReplyContext(state,player,scene,targetIds={}) {
  const {replyPeer}=ordinaryReplyContext(state,player,scene,targetIds,3);
  const peer=replyPeer && (targetIds[replyPeer] ?? replyPeer), last=state.agentActions?.at(-1);
  if (!peer || !sequenceAudience(state,player,peer,scene.roomId)
    || last?.intent?.type!=='conversation' || last.intent.targetId!==peer) return {};
  const [heard,said]=state.entries.slice(-24).reverse().filter(row=>
    row.speakerId===player && row.observationKey?.endsWith(':arrival')
    || ['speech','writing'].includes(row.delivery) && row.audienceIds?.includes(player)
      && (row.speakerId===player && row.addresseeIds?.length || row.addresseeIds?.includes(player)));
  if (heard?.speakerId!==peer || said?.speakerId!==player || said.observationKey!==last.questionKey
    || said.text!==last.performance?.utterance || said.learnedAt>heard.occurredAt || state.worldTime-heard.occurredAt>360
    || !['statement','reply'].includes(heard.communication?.kind)) return {};
  const received=(entry,recipient)=>{
    const journal=state.agentAutonomy?.conversation?.journal?.entries?.find(row=>row.id===entry.observationKey);
    const actual=state.caseRuntime?.observations?.find(row=>row.id===entry.observationKey);
    return entry.delivery==='speech' && entry.conversationRoomId===scene.roomId && isDeepStrictEqual(entry.addresseeIds,[recipient])
      && Number.isSafeInteger(entry.occurredAt) && Number.isSafeInteger(entry.learnedAt) && entry.learnedAt>=entry.occurredAt
      && entry.learnedAt<=state.worldTime && journal?.occurredAt===entry.occurredAt && Number.isSafeInteger(journal.appliedAt)
      && journal.appliedAt>=entry.occurredAt && journal.appliedAt<=entry.learnedAt
      && actual?.text===entry.text && actual.delivery==='speech' && actual.speakerId===entry.speakerId && actual.occurredAt===entry.occurredAt
      && actual.audienceIds?.includes(recipient) && entry.audienceIds?.includes(recipient)
      && journal.observations?.some(row=>row.ownerId===recipient && row.observationId===actorObservationId(state,entry.observationKey,recipient));
  };
  if (!received(heard,player) || !received(said,peer)) return {};
  return last.beats?.some(beat=>heard.observationKey===`npc:${last.jobId}:beat:${beat.beat}:${peer}`
    && beat.decisions.some(({actorId,proposal})=>actorId===peer && proposal?.decision?.operation?.type==='speak'
      && proposal.utterance===heard.text && proposal.communication?.kind===heard.communication.kind
      && proposal.communication.addresseeHandles?.includes(actorHandle(peer,player)))
    && state.agentAutonomy?.decisions?.some(row=>row.actorId===peer && row.accepted===true && row.operation?.type==='speak'
      && row.sceneRevision===state.revision && row.sceneBeat===beat.beat && row.at===heard.occurredAt)) ? {replyPeer} : {};
}

// The preceding committed exchange must contain an actually heard proposal
// to multiple people. A later overheard warning does not choose a peer.
export function proveLocalTravelAttempt(state,player,raw,version=1) {
  if (version===2) {
    const scene=causalPlayerScene(state), {scene:perceived,targetIds}=playerPerceivedScene(state,scene);
    Object.assign(perceived,ordinaryLocalPointReplyContext(state,player,perceived,targetIds));
    return localTravelAttemptSource(raw,perceived,2,player);
  }
  if (version!==1) return null;
  const scene=causalPlayerScene(state), audience=roomGroupSpeechAudience(state,scene);
  if (state.completed || !runtimeActive(state,player) || audience.length<3) return null;
  const {scene:perceived,targetIds}=playerPerceivedScene(state,scene);
  Object.assign(perceived,ordinaryReplyContext(state,player,perceived,targetIds,3));
  const proof=localTravelAttemptSource(raw,perceived), latest=state.agentActions?.at(-1), now=state.worldTime;
  const journal=state.agentAutonomy?.conversation?.journal?.entries;
  if (!proof || !latest?.beats?.length || !journal || !Number.isSafeInteger(now)) return null;
  for (const source of state.entries.slice(-24).reverse()) {
    if (source.speakerId===player && (source.observationKey?.endsWith(':arrival') || ['speech','writing'].includes(source.delivery))) break;
    if (source.delivery!=='speech' || !source.audienceIds?.includes(player) || !supportsLocalTravelProposal(source.text,proof)) continue;
    const peer=source.speakerId, receipt=journal.find(row=>row.id===source.observationKey);
    const seen=state.caseRuntime?.observations?.find(row=>row.id===source.observationKey);
    if (!audience.includes(peer) || !source.audienceIds.includes(peer) || !source.addresseeIds?.includes(player)
      || !source.addresseeIds.some(id=>id!==player && id!==peer && audience.includes(id) && source.audienceIds.includes(id))
      || source.conversationRoomId!==undefined && source.conversationRoomId!==scene.roomId
      || !Number.isSafeInteger(source.occurredAt) || !Number.isSafeInteger(source.learnedAt) || source.learnedAt<source.occurredAt
      || source.learnedAt>now || now-source.learnedAt>300 || (source.textByActor?.[player] ?? source.text)!==source.text
      || receipt?.occurredAt!==source.occurredAt || !Number.isSafeInteger(receipt.appliedAt) || receipt.appliedAt<source.occurredAt
      || receipt.appliedAt>now || !receipt.observations?.some(row=>row.ownerId===player
        && row.observationId===actorObservationId(state,source.observationKey,player))
      || seen?.delivery!=='speech' || seen.speakerId!==peer || seen.text!==source.text || seen.occurredAt!==source.occurredAt
      || !seen.audienceIds?.includes(player)) return null;
    return latest.beats.some(beat=>source.observationKey===`npc:${latest.jobId}:beat:${beat.beat}:${peer}`
      && beat.decisions.some(({actorId,proposal})=>actorId===peer && proposal?.decision?.operation?.type==='speak'
        && proposal.utterance===source.text && proposal.communication?.addresseeHandles?.includes(actorHandle(peer,player)))
      && state.agentAutonomy?.decisions?.some(row=>row.actorId===peer && row.accepted===true && row.operation?.type==='speak'
        && row.sceneRevision===state.revision && row.sceneBeat===beat.beat && row.at===source.occurredAt)) ? proof : null;
  }
  return null;
}

// A visible notebook capability or a contemporaneous accepted visible
// packing action belongs to its actual rules, not this unresolved-wait path.
const notebookSurface=/(?:素描本|速写本|速寫本)/u;
function notebookConditionObservable(state,scene,peer,player,since) {
  if (scene.objects?.some(row=>notebookSurface.test(row.name ?? ''))) return true;
  const plausible=/(?:收好|收起|收进|收進|合上|放回|放好|装进|裝進)/u;
  return state.entries.slice(-28).some(row=>row.speakerId===peer && row.delivery==='action' && row.audienceIds?.includes(player)
    && Number.isSafeInteger(row.learnedAt) && row.learnedAt>=since && row.learnedAt<=state.worldTime
    && notebookSurface.test(row.text) && plausible.test(row.text));
}
const writtenJointProposal = /^(?:吾辈|吾輩|我)(?:也)?(?:想|愿意|願意)(?:和你)?(?:一起|一同)(?:去|上楼|上樓|走)[。！!](?=[^\n]*(?:楼上|樓上|上面))/u;
export function proveLocalConditionalWait(state,player,raw) {
  if (state.completed || state.caseRuntime?.occupiedBody || !runtimeActive(state,player)
    || actorForState(state,player)?.communication!=='speech') return null;
  const scene=causalPlayerScene(state), {scene:perceived,targetIds}=playerPerceivedScene(state,scene);
  Object.assign(perceived,ordinaryReplyContext(state,player,perceived,targetIds,3));
  const proof=localConditionalWaitSource(raw,perceived,player);
  if (!proof) return null;
  const peer=targetIds[proof.targetId] ?? proof.targetId;
  if (!sequenceAudience(state,player,peer,scene.roomId) || actorForState(state,peer)?.communication!=='writing') return null;
  const recent=state.entries.slice(-24);
  const source=recent.slice().reverse().find(row=>row.speakerId===player && row.observationKey?.endsWith(':arrival')
    || ['speech','writing'].includes(row.delivery) && row.audienceIds?.includes(player)
      && (row.speakerId===player || row.addresseeIds?.includes(player)));
  const latest=state.agentActions?.at(-1);
  if (!source || source.delivery!=='writing' || source.speakerId!==peer || !isDeepStrictEqual(source.addresseeIds,[player])
    || !isDeepStrictEqual([...source.audienceIds].sort(),[peer,player].sort()) || source.conversationRoomId!==scene.roomId
    || !Number.isSafeInteger(source.occurredAt) || !Number.isSafeInteger(source.learnedAt)
    || source.learnedAt<source.occurredAt || source.learnedAt>state.worldTime || state.worldTime-source.occurredAt>360
    || (source.textByActor?.[player] ?? source.text)!==source.text || !writtenJointProposal.test(source.text)
    || /(?:如果|假如|要是|听说|聽說|转述|轉述|明天|以后|以後|不想|不去|不要|别走|別走)/u.test(source.text)
    || notebookConditionObservable(state,perceived,peer,player,source.occurredAt)) return null;
  const receipt=state.agentAutonomy?.conversation?.journal?.entries?.find(row=>row.id===source.observationKey);
  const seen=state.caseRuntime?.observations?.find(row=>row.id===source.observationKey);
  if (receipt?.occurredAt!==source.occurredAt || !Number.isSafeInteger(receipt.appliedAt) || receipt.appliedAt<source.occurredAt
    || receipt.appliedAt>state.worldTime || !receipt.observations?.some(row=>row.ownerId===player
      && row.observationId===actorObservationId(state,source.observationKey,player))
    || seen?.delivery!=='writing' || seen.speakerId!==peer || seen.text!==source.text || seen.occurredAt!==source.occurredAt
    || !seen.audienceIds?.includes(player)) return null;
  return latest?.beats?.some(beat=>source.observationKey===`npc:${latest.jobId}:beat:${beat.beat}:${peer}`
    && beat.decisions.some(({actorId,proposal})=>actorId===peer && proposal?.decision?.operation?.type==='write'
      && proposal.utterance===source.text && proposal.communication?.addresseeHandles?.includes(actorHandle(peer,player))
      && notebookSurface.test(proposal.action ?? '') && recent.some(row=>row.speakerId===peer && row.delivery==='action'
        && row.occurredAt===source.occurredAt && row.learnedAt<=state.worldTime && row.audienceIds?.includes(player)
        && row.observationKey?.startsWith(latest.jobId+':beat:'+beat.beat+':enactment:') && row.text===proposal.action
        && state.caseRuntime?.observations?.some(obs=>obs.id===row.observationKey && obs.text===row.text
          && obs.audienceIds?.includes(player))))
    && state.agentAutonomy?.decisions?.some(row=>row.actorId===peer && row.accepted===true && row.operation?.type==='write'
      && row.sceneRevision===state.revision && row.sceneBeat===beat.beat && row.at===source.occurredAt)) ? proof : null;
}

// Match the sealed partner against the live room, identified by the actual
// approach span, not by a new reply or an NPC offer in a queued packet.
function readinessEndpoint(state,room,plan) {
  const scene=causalPlayerScene(state), player=createdPlayerId(state);
  if (scene.roomId!==room) return null;
  const perception=playerPerceivedScene(state,scene);
  const person=localReadinessApproach(plan.steps[1].text,perception.scene);
  const peer=resolvePerceivedIntent(plan.steps[0].intent,perception.targetIds)?.targetId;
  const focus=localReadinessWait(plan.steps[2].text,perception.scene);
  return person && focus && person.targetId===plan.steps[0].intent.targetId && peer
    && sequenceAudience(state,player,peer,room) ? {person,focus} : null;
}

function localSpeechPartAudience(state, player, room, part, sequence) {
  if (runtimeRoom(state, player) !== room || !runtimeActive(state, player) || state.completed
    || state.caseRuntime?.occupiedBody || state.guardReaction?.pending || actorForState(state, player)?.communication !== 'speech') return null;
  const scene = causalPlayerScene(state);
  if (part.kind === 'transition') {
    const current = playerPerceivedScene(state, scene).scene;
    const observed = sequence.version === 6 ? localPointFocus(part.action, current)
      : sequence.version===8 ? localStairOrientationFocus(part.action,current)
      : [5,7].includes(sequence.version) ? observedOrientationFocus(part.action, current) : localSpeechObservation(part.action, current);
    if (sequence.version >= 5 && !sequenceAudience(state, player, sequence.targetId, room)) return null;
    return isDeepStrictEqual(observed, part.focus)
      && (!part.focus.some(row => row.kind === 'crowd') || roomGroupSpeechAudience(state, scene).length >= 3) ? [] : null;
  }
  if (part.speechScope === 'room') {
    const audience = roomGroupSpeechAudience(state, scene);
    return audience.length >= 3 && (!part.memberId || audience.includes(part.memberId)) ? audience : null;
  }
  return sequenceAudience(state, player, part.targetId, room);
}

function sequenceEnactments(draft, action, sequence, index, audienceIds) {
  const player = createdPlayerId(draft), part = sequence.parts[index];
  const key = `${action.questionKey}:sequence:${index}`;
  if (part.kind === 'speech') {
    const directed = part.speechScope !== 'room';
    const rootKey = sequence.version >= 3 ? index === 0 : index === sequence.parts.length - 1;
    return [{ ...causalEnactment(draft, part.text, player, rootKey ? action.questionKey : key, { delivery: 'speech', audienceIds }),
      addresseeIds: directed ? [sequence.version >= 4 ? part.targetId : action.intent.targetId] : [], communication: { kind: communicationKind(part.text) } }];
  }
  return [...(part.action ? [causalEnactment(draft, part.action, player, `gesture:${key}`)] : []),
    ...(part.reflection ? [causalEnactment(draft, part.reflection, player, `reflection:${key}`, { delivery: 'reflection', audienceIds: [player] })] : [])];
}

function checkPrefix(prefix) {
  if (!record(prefix, ['version', 'action', 'draft', 'events', 'phase', 'boundary', 'interrupted', 'stopReason', 'beats',
    'rootEntryCount', 'rootActionCount', 'rootRevision', 'schedulingBeats', 'conversationEventClockVersion', 'intentSettlement', 'intentProgress']) || prefix.version !== 1
    || (prefix.conversationEventClockVersion !== undefined && prefix.conversationEventClockVersion !== 1)
    || !record(prefix.draft) || !['reaction', 'ready'].includes(prefix.phase)
    || typeof prefix.interrupted !== 'boolean' || !(prefix.stopReason === null || typeof prefix.stopReason === 'string')
    || !record(prefix.boundary, ['pending', 'completesAt', 'inspectionCompletesAt', 'inspectionIntent', 'inspectionStartedAt', 'stageBefore', 'destination', 'deferredEvents', 'roomBefore', 'localIds', 'localDoorVisible', 'localSearchSubject', 'localThresholdProof', 'dialogueSequence'])
    || typeof prefix.boundary.pending !== 'boolean'
    || Boolean(prefix.boundary.dialogueSequence) !== [1, 2, 3, 4, 5, 6, 7, 8].includes(prefix.action.ordinaryDialogueSequenceVersion)
    || Object.hasOwn(prefix.boundary, 'localDoorVisible') && (typeof prefix.boundary.localDoorVisible !== 'boolean'
      || prefix.action.cellDoorAttemptVersion !== 1 || prefix.action.playerIntentPlan !== undefined)
    || Object.hasOwn(prefix.boundary,'localSearchSubject') !== (prefix.action.ordinaryLocalSearchConversationVersion===1
      && (prefix.action.playerIntentPlan!==undefined || prefix.action.intent.type==='look'))
    || Object.hasOwn(prefix.boundary,'localSearchSubject') && typeof prefix.boundary.localSearchSubject!=='string'
    || Object.hasOwn(prefix.boundary,'localThresholdProof') && (prefix.action.ordinaryLocalLookOutcomeVersion!==1 || prefix.action.intent.type!=='look'
      || !record(prefix.boundary.localThresholdProof,['focus','needles']) || !record(prefix.boundary.localThresholdProof.focus,['kind','roomId','edgeId'])
      || prefix.boundary.localThresholdProof.focus.kind!=='threshold' || prefix.boundary.localThresholdProof.focus.roomId!==prefix.boundary.roomBefore
      || !list(prefix.boundary.localThresholdProof.needles,3) || !prefix.boundary.localThresholdProof.needles.length
      || prefix.boundary.localThresholdProof.needles.some(id=>id!==null && typeof id!=='string'))
    || ![prefix.rootEntryCount, prefix.rootActionCount, prefix.rootRevision, prefix.boundary.completesAt]
      .every(value => Number.isSafeInteger(value) && value >= 0)
    || !Array.isArray(prefix.draft.entries) || !Array.isArray(prefix.draft.agentActions)
    || !Array.isArray(prefix.boundary.deferredEvents) || !Array.isArray(prefix.events) || !list(prefix.boundary.localIds, 32)
    || typeof prefix.boundary.roomBefore !== 'string' || !Number.isSafeInteger(prefix.draft.worldTime)
    || prefix.draft.entries.length < prefix.rootEntryCount || prefix.draft.agentActions.length !== prefix.rootActionCount
    || prefix.draft.revision !== prefix.rootRevision) fail();
  validateAction({ ...prefix.action, beats: prefix.beats,
    ...(prefix.action.schedulingVersion === 1 ? { schedulingBeats: prefix.schedulingBeats } : {}) }, prefix.draft);
}
function refreshEvents(prefix) {
  prefix.events = prefix.draft.entries.slice(prefix.rootEntryCount).map((entry, index) => ({ id: `event-${index + 1}`, entry }));
}
function publishStage(prefix, events, key) {
  const normalized = normalizeCausalEvents(prefix.draft, events, key).map(event => ({ ...event,
    learnedAt: event.learnedAt ?? prefix.draft.worldTime }));
  if (normalized.some(event => event.occurredAt > prefix.draft.worldTime)) fail();
  // One normalized observation/enactment batch per stage. Helpers may already
  // have observed their own physical effects; identical keys are idempotent.
  runtimeObserve(prefix.draft, normalized);
  const visible = persistEnactments(prefix.draft, normalized, { introductionVersion: prefix.action.introductionVersion,
    ...(prefix.conversationEventClockVersion === 1 ? { conversationEventClockVersion: 1 } : {}) });
  for (const entry of visible) {
    const { draft } = prefix, player = createdPlayerId(draft);
    const single = [2, 3].includes(prefix.action.ordinaryAddressVersion) && ['speech', 'writing'].includes(entry.delivery)
      && entry.occurredAt === draft.worldTime && entry.addresseeIds?.length === 1
      && entry.audienceIds?.includes(entry.addresseeIds[0]) && (entry.speakerId === player || entry.addresseeIds[0] === player);
    const room = single && runtimeRoom(draft, player);
    const recipientRoom = room && runtimeRoom(draft, entry.speakerId === player ? entry.addresseeIds[0] : entry.speakerId);
    draft.entries.push({ ...entry, id: `entry-${draft.entries.length + 1}`, ...(room && room === recipientRoom ? { conversationRoomId: room } : {}) });
  }
  refreshEvents(prefix);
}
function stop(prefix, reason) {
  prefix.interrupted = true;
  prefix.stopReason ||= reason;
}
function communicationKind(text) {
  // Conservative metadata, not an interpretation of an unspoken intention.
  const content = text.trim().replace(/^[「『“]+/u, '');
  if (/[？?][」』”\s]*$/u.test(content) || /(?:吗|嗎|么|麼|呢)[。！!」』”\s]*$/u.test(content)
    || /^(?:请问|請問|能不能|可不可以|要不要)/u.test(content)) return 'ask';
  if (/^(?:(?:要不|不如)[，,\s]*)?(?:我们|我們|大家|请你|請你|请|請|你)?(?:和我|跟我)?(?:一起|一同)(?:去|走|来|來|看|调查|調查|聊)/u.test(content)
    || /^(?:我(?:想|希望)?|现在|現在)?(?:邀请|邀請)你/u.test(content)) return 'invite';
  return 'statement';
}

function applyPlayerTextMagic(draft, action, player, customAct = null, swapAct = null) {
  const intentMagic = action.intent.magic;
  if (!intentMagic) return;
  // Independent swap lifecycle has already been applied as this act's prepared
  // world base by beginCausalScene. It is not a generic MagicHost cast.
  if (intentMagic.swapAction === 'restore') {
    if (!swapAct?.prepared || swapAct.command?.type !== 'magic_swap_restore') fail();
    return;
  }
  if (swapAct?.prepared && swapAct.command?.type === 'magic_swap_establish') return;
  // Custom Echo/relocation has already been applied as the prepared world base
  // by beginCausalScene. It must not enter the native MagicHost executor.
  if (intentMagic.customBinding !== undefined) {
    if (!customAct?.prepared || customAct.prepared.command.bindingHandle !== intentMagic.customBinding) fail();
    return;
  }
  const magic = draft.magic; if (!magic) fail();
  if (intentMagic.end === true) {
    const strength = magic.effects.some(row => row.status === 'active' && row.event.operation === 'strength'
      && row.event.definitionRef === 'sherry:basic@1'
      && row.event.sourceMindId === Object.values(magic.identity.minds).find(mind => mind.actorId === player)?.id);
    const ended = strength
      ? settleOwnedStrength(magic, { actorId: player, at: draft.worldTime })
      : settleOwnedSelfFloat(magic, { actorId: player, at: draft.worldTime });
    const endEntries = strength
      ? hostStrengthEndEntries(draft, player, ended, `${action.jobId}:magic`, action.selfFloatEndObservationVersion)
      : [1, 2].includes(action.selfFloatEndObservationVersion)
        ? hostSelfFloatEndEntries(draft, player, ended, `${action.jobId}:magic`, action.selfFloatEndObservationVersion) : [];
    draft.magic = ended.state;
    draft.entries.push(...endEntries);
    if (action.magicCaseWitnessVersion === 1) recordHostMagicWitnessTraces(draft, endEntries);
    draft.npcMagicPublication = { projection: ended.state,
      command: { type: 'magic_end', useId: `${action.jobId}:magic` },
      receipt: { useId: `${action.jobId}:magic`, status: 'ended', effectIds: ended.effectIds, occurredAt: draft.worldTime },
      events: [] };
    return;
  }
  const grant = magic.grants.find(row => row.id === intentMagic.grantId && row.enabled === true);
  const definition = grant && magicDefinition(grant.definitionRef);
  const target = definition && hostMagicCapabilities(draft, magic, player, heardOwnerSources(draft, magic, player))
    .targets.find(row => row.handle === intentMagic.targetHandle && definition.targetKinds.includes(row.kind));
  if (!grant || !definition || !target) fail();
  const useId = `${action.jobId}:magic`;
  const command = { type: 'magic_cast', useId, actorId: player, grantId: grant.id, definitionRef: definition.ref,
    activation: 'intent', targetHandle: target.handle,
    parameters: definition.operation === 'sound-replay' ? { sourceHandle: target.handle } : {} };
  const before = { ...draft, magic }; const refs = [];
  if (definition.operation === 'spatial-shift') {
    const condition = before.caseRuntime.conditionsByActor?.[player];
    if ((condition && !['healthy', 'alive'].includes(condition.status))
      || (activeProcedure(before)?.stage && !['daily', 'aftermath'].includes(activeProcedure(before).stage))) fail();
    const id = `concentration:${useId}`;
    before.entries.push({ id: `entry-${before.entries.length + 1}`, speaker: '本人', speakerId: player,
      delivery: 'action', audienceIds: [player], occurredAt: before.worldTime, observationKey: id,
      text: '你停住动作，实际集中精神，明确构筑亲眼所见或亲历的位置。',
      hostMagicEvent: { id, type: 'concentration-established', sourceBodyId: `body:${player}`, at: before.worldTime,
        branchId: magic.branchId, headCommitRef: magic.headCommitRef, generation: before.generation, revision: before.revision } });
    refs.push(id);
    before.magic = refreshHostMagic(before, magic, { branchId: magic.branchId, commitRef: magic.headCommitRef,
      generation: before.generation, revision: before.revision,
      ...(sceneDomainStores.get(draft) ? { domainStore: sceneDomainStores.get(draft) } : {}) });
  }
  const applied = executeHostMagic(before, player, command, heardOwnerSources(before, before.magic, player),
    { refs, magicCaseWitnessVersion: action.magicCaseWitnessVersion });
  if (applied.requiredHooks?.length || applied.replayed) fail();
  Object.assign(draft, applied.state);
  draft.npcMagicPublication = { projection: applied.state.magic, command, receipt: applied.receipt,
    accessChanges: applied.domainDeltas?.memoryAccess || [], sharedMemories: applied.domainDeltas?.sharedMemories || [],
    events: applied.state.magic.effects.filter(row => applied.receipt.effectIds?.includes(row.id)).map(row => row.event) };
}
/** Ordinary self-treatment: the player's current body actually touches its
 * own existing small wound, then the canonical Meruru regenerate consumer runs
 * with exactly that injury. The contact is a same-act HOST action, not a model
 * claim; no new grant, executor or eligibility gate is introduced. */
function applySelfHeal(draft, action, player, option) {
  const magic = draft.magic; if (!magic) fail();
  const physicalId = runtimeBodyActorId(draft, player);
  const condition = draft.caseRuntime.conditionsByActor?.[physicalId];
  const injury = condition && Array.isArray(condition.injuries)
    ? condition.injuries.find(row => row?.id === option.injuryId && row.kind === 'puncture') : undefined;
  if (!injury) fail();
  const domain = sceneDomainStores.get(draft);
  const scope = { branchId: magic.branchId, commitRef: magic.headCommitRef,
    generation: draft.generation, revision: draft.revision };
  const contactId = `contact:${action.jobId}:self-heal`;
  draft.entries.push({ id: `entry-${draft.entries.length + 1}`, speaker: '本人', speakerId: player,
    delivery: 'action', audienceIds: [player], occurredAt: draft.worldTime, observationKey: contactId,
    text: '本人实际用另一只手覆住自己手指上的伤口，皮肤与伤处接触。',
    hostMagicEvent: { id: contactId, type: 'physical-contact', sourceBodyId: `body:${physicalId}`,
      targetId: `body:${physicalId}`, at: draft.worldTime, branchId: magic.branchId,
      headCommitRef: magic.headCommitRef, generation: draft.generation, revision: draft.revision } });
  const refreshed = refreshHostMagic(draft, magic, scope,
    domain ? { domainStore: domain, sourceState: sceneDomainSources.get(draft) || draft } : {});
  draft.magic = refreshed;
  const contact = draft.entries.find(entry => entry.observationKey === contactId);
  contact.hostMagicEvent.branchId = refreshed.branchId;
  contact.hostMagicEvent.headCommitRef = refreshed.headCommitRef;
  contact.hostMagicEvent.generation = draft.generation;
  contact.hostMagicEvent.revision = draft.revision;
  const capabilities = hostMagicCapabilities(draft, refreshed, player, heardOwnerSources(draft, refreshed, player));
  const target = capabilities.targets.find(row => row.kind === 'body' && row.label === '本人身体');
  const grant = refreshed.grants.find(row => row.id === 'grant:meruru:basic' && row.enabled === true);
  const definition = grant && magicDefinition(grant.definitionRef);
  if (!target || !definition || definition.operation !== 'regenerate') fail();
  const useId = `${action.jobId}:magic`;
  const command = { type: 'magic_cast', useId, actorId: player, grantId: grant.id, definitionRef: definition.ref,
    activation: 'intent', targetHandle: target.handle, parameters: { injuryIds: [injury.id] } };
  const applied = executeHostMagic(draft, player, command, heardOwnerSources(draft, refreshed, player),
    { refs: [contactId], magicCaseWitnessVersion: action.magicCaseWitnessVersion });
  if (applied.requiredHooks?.length || applied.replayed) fail();
  Object.assign(draft, applied.state);
  draft.npcMagicPublication = { projection: applied.state.magic, command, receipt: applied.receipt,
    accessChanges: applied.domainDeltas?.memoryAccess || [], sharedMemories: applied.domainDeltas?.sharedMemories || [],
    events: applied.state.magic.effects.filter(row => applied.receipt.effectIds?.includes(row.id)).map(row => row.event) };
}
/** Begin a detached, JSON-serializable scene prefix. Only the root gesture,
 * communication and instantaneous operations are delivered here; elapsed time,
 * reading, inspection and arrival remain in boundary until settled once.
 * phase === 'reaction' reserves a preexisting offscreen victim's opportunity. */
const sceneDomainStores = new WeakMap();
const sceneDomainSources = new WeakMap();
const sceneDeliveredMagicOffers = new WeakMap();
const sceneStageClocks = new WeakMap();
/** Host-only authority for the final commit replay: the sealed stage receipts
 * decide whether a stage uses the legacy clock or the per-event occurrence clock.
 * It is never serialized into an action, plan, receipt or model packet. */
export function setSceneStageClocks(state, clocks) {
  if (clocks) sceneStageClocks.set(state, clocks); else sceneStageClocks.delete(state);
}

/** Host-only transport for Domain's occupied-world assertion during an act
 * replay. It is never persisted, serialized or exposed to a model. */
export function setSceneDomainStore(state, domainStore, sourceState = null) {
  if (domainStore) sceneDomainStores.set(state, domainStore); else sceneDomainStores.delete(state);
  if (sourceState) sceneDomainSources.set(state, sourceState); else sceneDomainSources.delete(state);
}
/** Historical replay validates the accepted choice against this exact sealed
 * menu. Host-only transport; it is never a model-provided value. */
export function setSceneDeliveredMagicOffer(state, offer) {
  if (offer) sceneDeliveredMagicOffers.set(state, offer); else sceneDeliveredMagicOffers.delete(state);
}
export function beginCausalScene(state, action, options) {
  return withRunBoundary(state, action?.effectiveRunPolicy, () => beginScene(state, action, options));
}
function beginScene(state, action, { customAct = null, swapAct = null, domainStore = null, domainSourceState = null, deliveredMagicOffer = null, conversationEventClockVersion } = {}) {
  assertGuardOrdinaryAction(state);
  if (conversationEventClockVersion !== undefined && conversationEventClockVersion !== 1) fail();
  validateAction(action, state);
  // Current-owner capabilities are consumed by settlement. Re-derive authority
  // on every begin/replay from the real before, never from an after-prefix.
  if (action.hostCaseChoiceVersion === 1) {
    const choice = hostCaseChoicePlan(state, action.rawInput);
    if (!choice?.accepted || !isDeepStrictEqual(action.playerIntentPlan, choice.plan)
      || !isDeepStrictEqual(action.intent, choice.intent)) fail();
  }
  if ((action.occupiedBodyVersion === 1) !== Boolean(state.caseRuntime?.occupiedBody)) fail();
  const intentMagic = action.intent?.magic;
  let world = state;
  if (intentMagic && typeof intentMagic === 'object' && intentMagic.swapAction === 'restore') {
    if (!swapAct?.prepared || swapAct.command?.type !== 'magic_swap_restore') fail();
    world = structuredClone(swapAct.prepared.state); world.revision = state.revision;
    if (swapAct.prepared.projection) world.magic = structuredClone(swapAct.prepared.projection);
  } else if (intentMagic && typeof intentMagic === 'object' && intentMagic.grantId !== undefined) {
    const swap = swapAct?.prepared && swapAct.command?.type === 'magic_swap_establish';
    if (swap) {
      world = structuredClone(swapAct.prepared.state); world.revision = state.revision;
      if (swapAct.prepared.projection) world.magic = structuredClone(swapAct.prepared.projection);
    }
  }
  if (intentMagic && typeof intentMagic === 'object' && intentMagic.customBinding !== undefined) {
    if (!customAct?.prepared || customAct.prepared.command?.bindingHandle !== intentMagic.customBinding) fail();
    world = structuredClone(customAct.prepared.next);
    if (state.magic) world.magic = structuredClone(state.magic);
    // The custom delta belongs to this ordinary act; its transient +1 is not a
    // second commit and must not leak into the scene boundary.
    world.revision = state.revision;
  }
  const draft = structuredClone(world); enableAutonomy(draft); enablePrisonWorld(draft);
  // Only this new, opt-in action may defer a player's actual fatal outcome.
  // Historical pending actions keep their original outcome semantics.
  if (action.storyLifeVersion === 1 && createdPlayerId(draft) === 'hiro') draft.caseOutcomeVersion = 1;
  else if (draft.storyLifeVersion === 1) delete draft.caseOutcomeVersion;
  runtimeApplyItemPolicy(draft, action.itemPolicyVersion); enableCaseRuntime(draft);
  // The root option menu is captured only for this action's detached world.
  // Persistence happens in the same host commit after every beat succeeds.
  if (action.rootCaseOptionsVersion === 1 && draft.rootCaseOptionsVersion !== 1)
    draft.rootCaseOptionsVersion = 1;
  if (!draft.caseRuntime) fail();
  // Prefix checks may run after custody has changed. Rebind the frozen item
  // choice only here, against the current menu before any action settlement.
  const itemRoot = ordinaryItemRootStep(action);
  if (itemRoot && !isDeepStrictEqual(resolvePlayerPlanStep(draft, itemRoot), action.intent)) fail();
  if (!outskirtsActive(draft) && isCourtyardEntry(action.rawInput) && action.intent?.type === 'move'
    && action.intent.destination === 'courtyard' && runtimeRoom(draft, createdPlayerId(draft)) === 'reception') {
    activateOutskirts(draft);
  }
  // Scene activation may add the prison-world projection after a magic
  // activation was committed. That is the same world generation, not a new
  // authority: refresh only the derived host fingerprint before offering text
  // handles. The magic repository and its effects are unchanged.
  const domain = domainStore || sceneDomainStores.get(state) || sceneDomainStores.get(world);
  if (domain) sceneDomainStores.set(draft, domain);
  const refreshScope = { branchId: draft.magic?.branchId, commitRef: draft.magic?.headCommitRef,
    generation: draft.generation, revision: draft.revision };
  // Establishing a first swap introduces occupiedBody from an unoccupied
  // source. A prepared restore is the reverse transition. Both prepared
  // projections are already host-authenticated by Domain; the ordinary
  // existing-occupied refresh must not compare the post-transition mirror to
  // the pre-transition committed source.
  const introducesOccupied = draft.caseRuntime?.occupiedBody && !state.caseRuntime?.occupiedBody;
  const preparedSwap = Boolean(swapAct?.prepared);
  if (draft.magic && !introducesOccupied && !preparedSwap && (!draft.caseRuntime?.occupiedBody || domain))
    draft.magic = refreshHostMagic(draft, draft.magic, refreshScope,
      domain ? { domainStore: domain, sourceState: domainSourceState || sceneDomainSources.get(state) || state } : {});
  if (action.customMagicCaseWitnessVersion === 1 && customAct?.prepared
    && typeof intentMagic === 'object' && intentMagic?.customBinding !== undefined)
    recordCustomMagicWitnessTraces(draft, customAct.prepared, state);
  const authorization = structuredClone(draft);
  if (action.intent.operation === 'until_schedule'
    && parseScheduleWaitIntent(authorization, action.rawInput, action.scheduleWaitVersion)?.accepted !== true) fail();
  const scene = causalPlayerScene(authorization);
  const { intent } = action; const player = createdPlayerId(draft);
  const first = action.ordinaryAddressVersion === 3 ? firstAddressClause(action) : undefined;
  let dialogueSequence;
  if ([1, 2, 3, 4, 5, 6, 7, 8].includes(action.ordinaryDialogueSequenceVersion)) {
    const perception = playerPerceivedScene(authorization, scene);
    const version=action.ordinaryDialogueSequenceVersion;
    Object.assign(perception.scene, version===8 ? ordinaryLocalStairReplyContext(authorization,player,perception.scene,perception.targetIds)
      : [6,7].includes(version) ? ordinaryLocalPointReplyContext(authorization, player, perception.scene, perception.targetIds)
      : ordinaryReplyContext(authorization, player, perception.scene, perception.targetIds, 3));
    const target = projectPerceivedIntent(intent, perception.targetIds).targetId;
    const proof = ordinaryDialogueSequence(action.rawInput, perception.scene, target, action.ordinaryDialogueSequenceVersion);
    if (!proof || proof.parts[0].text !== intent.playerText) fail();
    if (proof.version >= 4) {
      if (proof.parts[0].speechScope !== intent.speechScope || proof.parts[0].targetId !== target) fail();
      const parts = proof.parts.map(part => part.targetId ? { ...part, targetId: perception.targetIds[part.targetId] ?? part.targetId } : part);
      dialogueSequence = { ...proof, parts, ...([6,7,8].includes(proof.version) ? { targetId: intent.targetId } : {}), startedAt: draft.worldTime };
      if (!parts.every(part => localSpeechPartAudience(draft, player, scene.roomId, part, dialogueSequence))) fail();
    } else {
      if (!sequenceAudience(draft, player, intent.targetId, scene.roomId)
        || proof.version === 3 && !roomGroupSpeechAudience(draft, scene).includes(proof.roomMemberId)) fail();
      dialogueSequence = { ...proof, targetId: intent.targetId, startedAt: draft.worldTime };
    }
  }
  if (action.localConditionalWaitVersion===1 && (action.playerIntentPlan
    ? !proveLocalConditionalWait(authorization,player,action.rawInput)
    : !localConditionalWaitStep(action.rawInput,playerPerceivedScene(authorization,scene).scene))) fail();
  const travelVersion=action.localTravelAttemptVersion;
  const localTravel=[1,2].includes(travelVersion) && !action.playerIntentPlan;
  const travelStepIndex=localTravel && action.jobId.endsWith(':step:2') ? 2 : 1;
  if ([1,2].includes(travelVersion)) {
    if (localTravel) {
      const perceived=playerPerceivedScene(authorization,scene).scene;
      if (!(travelVersion===1 ? localTravelAttemptStep(action.rawInput,perceived)
        : localTravelDirectedStep(action.rawInput,perceived,travelStepIndex))) fail();
    } else {
      const proof=proveLocalTravelAttempt(authorization,player,action.rawInput,travelVersion);
      if (!proof || travelVersion===2 && (playerPerceivedScene(authorization,scene).targetIds[proof.targetId] ?? proof.targetId)!==intent.targetId) fail();
    }
  }
  const ambientVersion=action.ordinaryLocalAmbientSpeechVersion, ambient=[1,2,3,4].includes(ambientVersion);
  if (ambient) {
    const perception=playerPerceivedScene(authorization,scene), perceived=perception.scene;
    if (!runtimeActive(draft,player) || actorForState(draft,player)?.communication !== 'speech') fail();
    if (ambientVersion===4) {
      const audience=roomGroupSpeechAudience(authorization,scene);
      if (action.playerIntentPlan) {
        Object.assign(perceived,ordinaryReplyContext(authorization,player,perceived,perception.targetIds,3));
        if (!recentOpenWaitQuestion(authorization,player,audience)
          || !localAmbientPlanSpans(ordinaryLocalAmbientSpeechSource(action.rawInput,perceived,4),action.playerIntentPlan.steps,4)) fail();
      }
      if (intent.type==='act' && audience.length<3) fail();
      const proof=localOpenOrientationStep(first?.text ?? action.rawInput,perceived);
      if (proof?.type!==intent.type || !isDeepStrictEqual(proof.performance,action.performance)) fail();
    } else if (ambientVersion===3) {
      if (intent.type==='act' || action.playerIntentPlan)
        Object.assign(perceived,ordinaryReplyContext(authorization,player,perceived,perception.targetIds,3));
      if ((intent.type==='act' || action.playerIntentPlan) && roomGroupSpeechAudience(authorization,scene).length<3) fail();
      if (action.playerIntentPlan && !localAmbientPlanSpans(ordinaryLocalAmbientSpeechSource(action.rawInput,perceived,3),action.playerIntentPlan.steps,3)) fail();
      const source=localComposedAmbientStep(action.playerIntentPlan?.steps[0]?.text ?? action.rawInput,perceived);
      if (source?.type!==intent.type || !isDeepStrictEqual(source.performance,action.performance)) fail();
    } else if (ambientVersion===2) {
      if (action.playerIntentPlan) {
        Object.assign(perceived,ordinaryReplyContext(authorization,player,perceived,perception.targetIds,3));
        const proof=ordinaryLocalAmbientSpeechSource(action.rawInput,perceived,2);
        if (!localAmbientPlanSpans(proof,action.playerIntentPlan.steps,2)
          || !recentLocalWaitProposal(authorization,player,roomGroupSpeechAudience(authorization,scene))) fail();
      }
      const text=action.playerIntentPlan?.steps[0]?.text ?? action.rawInput;
      const expected=localAgreementPerformance(text,perceived,intent.type);
      if (!expected || !isDeepStrictEqual(expected,action.performance)) fail();
    } else if (action.playerIntentPlan) {
      const proof=ordinaryLocalAmbientSpeechSource(action.rawInput,perceived);
      if (!localAmbientPlanSpans(proof,action.playerIntentPlan.steps,1)) fail();
    } else if (intent.type==='act' ? localAmbientSpeech(action.rawInput,perceived)?.text!==action.performance.utterance
      : !localAmbientWait(action.rawInput,perceived)) fail();
  }
  const searchConversation = action.ordinaryLocalSearchConversationVersion === 1;
  let searchSubject;
  if (searchConversation) {
    const perception = playerPerceivedScene(authorization,scene), current=perception.scene;
    Object.assign(current,ordinaryReplyContext(authorization,player,current,perception.targetIds,3));
    const target=projectPerceivedIntent(intent,perception.targetIds).targetId;
    if (!runtimeActive(draft,player) || actorForState(draft,player)?.communication!=='speech') fail();
    if (action.playerIntentPlan) {
      const proof=ordinaryLocalSearchSource(action.rawInput,current);
      if (!proof || !isDeepStrictEqual([proof.first,proof.look,proof.last],action.playerIntentPlan.steps.map(step=>step.text))
        || proof.start.targetId!==target || proof.start.text!==intent.playerText
        || proof.proposal.text!==action.playerIntentPlan.steps[2].intent.playerText
        || !sequenceAudience(draft,player,intent.targetId,scene.roomId)) fail();
      searchSubject=proof.search.subjectId;
    } else if (intent.type==='look') {
      const searchLook=localSearchLook(action.rawInput,current);
      if (!searchLook || action.performance.action!=='我朝周围看了看。' || action.performance.reflection!==searchLook.reflection
        || action.performance.utterance!==undefined) fail();
      searchSubject=searchLook.subjectId;
    } else if (localSearchProposal(action.rawInput,current,target)?.text!==intent.playerText
      || !sequenceAudience(draft,player,intent.targetId,scene.roomId)) fail();
  }
  const readiness=action.ordinaryLocalApproachVersion===3;
  if (readiness) {
    const perception=playerPerceivedScene(authorization,scene), current=perception.scene;
    if (action.playerIntentPlan) {
      Object.assign(current,ordinaryReplyContext(authorization,player,current,perception.targetIds,3));
      const proof=ordinaryLocalApproachSource(action.rawInput,current,3), [,near,tail]=action.playerIntentPlan.steps;
      if (!proof || proof.quote!==first?.text || proof.approachText!==near.text || proof.waitText!==tail.text
        || proof.speech.targetId!==projectPerceivedIntent(intent,perception.targetIds).targetId
        || proof.speech.text!==intent.playerText || !sequenceAudience(draft,player,intent.targetId,scene.roomId)) fail();
    } else if (intent.type==='act' ? localReadinessApproach(action.rawInput,current)?.action!==action.performance.action
        : !localReadinessWait(action.rawInput,current)) fail();
  }
  const personApproach=action.ordinaryLocalApproachVersion===2;
  if (personApproach) {
    const perception=playerPerceivedScene(authorization,scene), current=perception.scene;
    const tail=action.playerIntentPlan?.steps[1], speechIntent=tail?.intent ?? intent;
    // The root plan still uses the sealed perceived target; a current tail
    // action already has its concrete actor ID resolved by prepareIntentTail.
    const target=tail ? resolvePerceivedIntent(speechIntent,perception.targetIds)?.targetId : intent.targetId;
    if (!target || !sequenceAudience(draft,player,target,scene.roomId)) fail();
    if (tail) {
      const proof=ordinaryLocalApproachSource(action.rawInput,current,2);
      if (!proof || proof.approachText!==first?.text || proof.quote!==tail.text || proof.speech.targetId!==speechIntent.targetId
        || proof.speech.text!==speechIntent.playerText || proof.person.action!==action.performance.action) fail();
    } else if (explicitLocalVocative(action.rawInput,current,projectPerceivedIntent(intent,perception.targetIds).targetId)?.text!==intent.playerText) fail();
  }
  const approaches = action.ordinaryLocalApproachVersion === 1;
  const approachStep = approaches && !action.playerIntentPlan;
  if (approaches) {
    if (approachStep) {
      if (!localApproachObservation(action.rawInput, scene) || !runtimeActive(draft, player)) fail();
    } else {
      const perception = playerPerceivedScene(authorization, scene);
      const proof = ordinaryLocalApproachSource(action.rawInput, perception.scene);
      const target = projectPerceivedIntent(intent, perception.targetIds).targetId;
      if (!proof || proof.speech.targetId !== target || proof.speech.text !== intent.playerText || proof.quote !== first?.text
        || proof.approachText !== action.playerIntentPlan.steps[1].text
        || !sequenceAudience(draft, player, intent.targetId, scene.roomId)) fail();
    }
  }
  if (first?.intent.type === 'conversation' && !action.bareReplyRootVersion && !dialogueSequence && !approaches && !readiness && !searchConversation
    && (!liveAddressPresent(draft, scene, first.text, intent, action.roomGroupSpeechVersion) || action.performance.utterance !== intent.playerText)) fail();
  const singleSpeech = v2AddressedSpeech(action);
  if (singleSpeech && !preservesEnactedPlayerSpeech(action.rawInput, action.performance.utterance, intent)
    && resolvePlayerAddress(action.rawInput, scene, intent.targetId)?.text !== singleSpeech) fail();
  if (action.postureActionVersion === 1) scene.postureActions = runtimePoseActions(authorization);
  const offerWorld = swapAct?.prepared ? state : draft;
  const offerMagic = swapAct?.prepared ? (state.magic || draft.magic) : draft.magic;
  const magicOffer = deliveredMagicOffer && action.playerTextMagicVersion === 1
    ? structuredClone(deliveredMagicOffer)
    : action.playerTextMagicVersion === 1
      && !(draft.caseRuntime?.occupiedBody && !domain)
      ? playerTextMagicOffer(offerWorld, offerMagic, player,
        offerMagic ? heardOwnerSources(offerWorld, offerMagic, player) : [],
        customAct?.capabilities || null, swapAct?.capabilities || null) : null;
  if (magicOffer) scene.magic = magicOffer;
  const authoredCast = intent.type === 'magic';
  if (!authoredCast) {
    validateCausalIntent(scene, action.intent, { scheduleWaitVersion: action.scheduleWaitVersion,
      postureActionVersion: action.postureActionVersion, rawInput: action.rawInput,
      playerTextMagicVersion: action.playerTextMagicVersion, magicOffer, roomGroupSpeechVersion: action.roomGroupSpeechVersion });
    // Existing dedicated and native consumers still own their offered choices.
    applyPlayerTextMagic(draft, action, player, customAct, swapAct);
  }
  const stageBefore = stage(draft);
  const selectedReaction = procedureStatementReaction(authorization, parseTestimonyCommand(action.rawInput));
  const localDoorAttempt = action.cellDoorAttemptVersion === 1 && !action.playerIntentPlan;
  const bareReply = action.bareReplyRootVersion === 1
    ? bareReplyRootSource(action.rawInput, action.playerIntentPlan.steps, scene) : null;
  if (action.bareReplyRootVersion === 1 && (!bareReply || intent.targetId !== bareReply.targetId || selectedReaction)) fail();
  // The existing model packet is still validated and sealed byte-for-byte. A
  // source with only the reply authorizes neither a gesture nor a reflection.
  const chosenPerformance = bareReply ? { action: '', utterance: bareReply.text }
    : localDoorAttempt ? { action: '' }
    : approachStep ? { action: '我在房间内朝门口方向迈步，留意视线所及。' }
    : statementReactionPerformance(action, selectedReaction);
  // The paired relocation owns its contact and arrival lines; performance
  // is preparation only, never an alternate proof of touching or moving.
  const mechanical = [1, 2].includes(action.intentContractVersion) && (['runtime', 'move'].includes(intent.type)
    || authoredCast && intent.magic.kind === 'relocate');
  const clause = action.playerIntentPlan?.steps[0]?.text ?? action.rawInput;
  const performance = mechanical ? { ...chosenPerformance, action: '',
    utterance: /(?:说|问|告诉|回应|回答|表示)/u.test(clause) ? chosenPerformance.utterance : '' } : chosenPerformance;
  // Source-licensed visual preparation is independent of model performance;
  // the mechanical move still owns every departure and arrival.
  const visualScene = (intent.type==='look' && action.ordinaryLocalLookOutcomeVersion===1
    || intent.type==='move' && action.ordinaryMoveVisualPreludeVersion===1) ? playerPerceivedScene(authorization,scene).scene : null;
  const safeToObserve=visualScene && runtimeActive(authorization,player) && !authorization.completed
    && !authorization.caseRuntime?.occupiedBody && !pendingReactionActors(authorization).length;
  const localThresholdProof=safeToObserve && intent.type==='look' && intent.targetId===undefined ? localThresholdLook(clause,visualScene) : null;
  const visualPrelude=safeToObserve && intent.type==='move' ? localMoveVisualPrelude(clause,visualScene,intent.destination) : null;
  const reactions = intent.operation === 'vote' || guardProtected(draft) ? [] : pendingReactionActors(draft);
  // Root discovery is published after validating against the previous delivery.
  // Restrict it to the acting owner so a private item scan cannot create an
  // unrelated NPC trigger in the same scene admission.
  const events = runtimeDiscoverObjects(draft, `${action.jobId}:objects:root`, { actorIds: [player] }); const deferredEvents = [];
  if (dialogueSequence) events.push(...sequenceEnactments(draft, action, dialogueSequence, 0,
    dialogueSequence.version >= 4 ? localSpeechPartAudience(draft, player, scene.roomId, dialogueSequence.parts[0], dialogueSequence)
      : sequenceAudience(draft, player, intent.targetId, scene.roomId)));
  else if (intent.operation !== 'vote') {
    if (action.performanceVersion === 2 && performance.reflection) events.push(causalEnactment(draft,
      performance.reflection, player, `reflection:${action.jobId}`, { delivery: 'reflection', audienceIds: [player] }));
    // The ambient speech slot's causal-validation cue is the act of speaking,
    // not a separate gesture or a second observation.
    if (visualPrelude) events.push(causalEnactment(draft,visualPrelude,player,`visual-prelude:${action.jobId}`));
    if (performance.action && !localTravel && !(ambient && intent.type === 'act'))
       events.push(causalEnactment(draft, performance.action, player, `gesture:${action.jobId}`));
    if (performance.utterance) {
      const delivery = actorForState(draft, player).communication === 'writing' ? 'writing' : 'speech';
      const group = intent.speechScope === 'room';
      const audienceIds = group || ambientVersion===4 ? roomGroupSpeechAudience(draft, scene)
        : acquisitionAudience(draft, player, { delivery, targetId: intent.targetId });
      if (group && (delivery !== 'speech' || audienceIds.length < 3 || performance.utterance !== intent.playerText)) fail();
      // A room inquiry is one overheard event, not an individual request to
      // every listener; the existing beat scheduler remains in control.
      const addresseeIds = group || ambient ? [] : intent.targetId ? [intent.targetId]
        : action.playerRuntimeCommunicationVersion === 1
          ? runtimeSwapAddressee(draft, player, intent, performance.utterance, audienceIds) : [];
      const utterance = { ...causalEnactment(draft, performance.utterance, player, action.questionKey, { delivery,
        audienceIds }), addresseeIds, communication: { kind: communicationKind(performance.utterance) } };
      events.push(utterance);
      if (stageBefore === 'discussion') activeProcedure(draft).statements.push({
        id: `statement-${activeProcedure(draft).statements.length + 1}`, speakerId: player, text: performance.utterance,
        audienceIds: [...utterance.audienceIds],
      });
    }
  }
  const authoredResult = authoredCast ? settleAuthoredMagic(draft, action, scene, causalEnactment) : null;
  if (authoredResult) events.push(...authoredResult.events);
  const scheduleWait = intent.operation === 'until_schedule';
  const skipTarget = intent.type === 'wait' && intent.operation
    ? scheduleWait ? nextScheduleBoundary(draft) : nextFreePeriodBoundary(draft, { morningOnly: intent.operation === 'until_morning' }) : null;
  let elapsed = skipTarget !== null ? Math.max(15, skipTarget - draft.worldTime)
    : { look: 5, move: 20, broadcast: 17, conversation: 15, wait: 15, follow: 15, act: 15, runtime: 15, read: 5, case: 0, magic: 15 }[intent.type];
  if (action.caseActionTimingVersion === 2 && skipTarget === null && intent.type !== 'case')
    elapsed = caseActionSeconds(authoredCast ? 'runtime' : intent.type);
  let destination = null;
  if (intent.type === 'move') {
    if (!scene.permittedDestinations.includes(intent.destination)) events.push(causalEnactment(draft,
      '铁门或当前滞留规定挡住去路，脚步停在门前。', player, `${action.jobId}:blocked`));
    else if (intent.destination === 'court' && stageBefore === 'assembly') { elapsed = 120; destination = 'court'; }
    else destination = intent.destination;
  }
  let broadcastDelivered = false;
  if (intent.type === 'broadcast' || (['wait', 'follow'].includes(intent.type) && !draft.agentDoorOpen && scene.screenAvailable && !intent.operation)) {
    if (scene.screenAvailable && !draft.agentWorld.broadcasts.length
      && (!draft.agentWorld.lockReleased || draft.agentFormatVersion >= 3)) {
      const notice = announcePrisonAssembly(draft, { actors: actorsForState(draft).filter(actor => runtimeActive(draft, actor.id)),
        playerId: player, locationOf: actor => ROOM_CODES[runtimeRoom(draft, actor.id)], text: CARD_ASSEMBLY_TEXT, key: `broadcast:${action.jobId}` });
      if (notice) {
        broadcastDelivered = true;
        if (!draft.known.includes('warden')) draft.known.push('warden');
        events.push(causalEnactment(draft, notice.text, 'warden', notice.id, { delivery: 'speech', audienceIds: notice.audienceIds }));
      }
    }
  }
  let intentSettlement = [1, 2].includes(action.intentContractVersion) ? { status: intent.type === 'move' && !scene.permittedDestinations.includes(intent.destination) ? 'blocked' : 'completed',
    code: intent.type === 'move' && !scene.permittedDestinations.includes(intent.destination) ? 'destination_unavailable' : 'completed', entryEnd: null } : null;
  if (authoredResult && intentSettlement) Object.assign(intentSettlement, { status: authoredResult.status, code: authoredResult.code });
  let runtimeInspection = false;
  let inspectionIntent = intent;
  if (intent.type === 'runtime') {
    const selected = runtimeOptions(draft, player).find(row => row.id === intent.subjectId);
    if (action.objectInspectionTimingVersion === 1 && selected?.kind === 'inspect-object-evidence') {
      const objectIntent = { type: 'case', operation: 'inspect', subjectId: selected.objectId,
        inspectionEvidenceVersion: 1, summary: '检查本人眼前实际存在的材料' };
      validateProcedureIntent(procedureActorScene(draft, player), objectIntent);
      runtimeInspection = true; inspectionIntent = objectIntent;
    } else if (selected?.kind === 'self-heal') applySelfHeal(draft, action, player, selected);
    else if (!runtimeSwapOptions(draft, player).some(row => row.id === intent.subjectId)) {
      const result = runtimeOperation(draft, player, intent.subjectId,
        { assessment: intent.summary, sourceObservationIds: [] }, `${action.jobId}:player`,
        { npcMedicalContactVersion: action.npcMedicalContactVersion });
      events.push(...result.events);
      if (intentSettlement) Object.assign(intentSettlement, { status: result.accepted && !result.reason ? 'completed' : 'blocked',
        code: result.reason === 'awaiting_recipient' ? 'awaiting_recipient' : result.accepted ? 'completed' : result.reason === 'bounded' ? 'bounded' : 'operation_unavailable',
        ...(result.offerId ? { offerId: result.offerId } : {}) });
    }
  }
  const deferredInspection = runtimeInspection || (intent.type === 'case' && intent.operation === 'inspect');
  const pinnedExplicitInspection = !runtimeInspection && action.objectInspectionTimingVersion === 1
    && intent.type === 'case' && intent.operation === 'inspect' && intent.inspectionEvidenceVersion === 1
    && Boolean(draft.caseRuntime?.objects?.[intent.subjectId]);
  if (pinnedExplicitInspection) validateProcedureIntent(procedureActorScene(draft, player), intent);
  const inspectionCompletesAt = deferredInspection ? draft.worldTime + 120 : null;
  if (deferredInspection) elapsed = 120;
  else if (intent.type === 'case') {
    const result = settleProcedureIntent(draft, player, intent, `${action.jobId}:procedure`,
      intent.operation === 'vote' ? { ballots: action.ballots } : {});
    if (!result.accepted) fail();
    // A report is delivered at its actual completion time, never early in the
    // root snapshot offered to an offscreen reaction packet.
    for (const event of result.events) (event.occurredAt > draft.worldTime ? deferredEvents : events).push(event);
    elapsed = result.elapsed;
  }
  if (intent.operation === 'vote' && !/^(?:我(?:把票)?投(?:给|給|向)?|投票给|投票給)[^「」“”"？?]+[。！!]?$/u.test(action.rawInput.trim())) fail();
  if (action.caseActionTimingVersion !== 2 && intent.operation !== 'vote') elapsed += Math.ceil((dialogueSequence
    ? dialogueSequence.parts.reduce((sum, part) => sum + (part.text?.length ?? 0), 0) : (performance.utterance || '').length) / 6);
  if (broadcastDelivered && intent.type === 'broadcast' && draft.agentFormatVersion >= 3 && draft.agentWorld.startSecond + draft.worldTime < 6 * 3600) {
    elapsed = 6 * 3600 - draft.agentWorld.startSecond - draft.worldTime;
  }
  if (skipTarget !== null) elapsed = scheduleWait ? skipTarget - draft.worldTime : Math.max(elapsed, skipTarget - draft.worldTime);
  elapsed = guardActionSeconds(draft, elapsed);
  const prefix = { version: 1, action: structuredClone(rootAction(action)), draft, events: [],
    phase: reactions.length ? 'reaction' : 'ready', boundary: { pending: true, completesAt: draft.worldTime + elapsed,
      ...(searchSubject ? { localSearchSubject: searchSubject } : {}),
      ...(localThresholdProof ? {localThresholdProof} : {}),
      inspectionCompletesAt, ...(runtimeInspection || pinnedExplicitInspection ? { inspectionIntent, inspectionStartedAt: draft.worldTime } : {}), stageBefore, destination, deferredEvents, roomBefore: scene.roomId,
      localIds: scene.nearby.map(row => row.id),
       ...(dialogueSequence ? { dialogueSequence } : {}),
      ...(localDoorAttempt ? { localDoorVisible: cellDoorAttemptState(authorization, scene) !== 'unavailable' } : {}) },
     interrupted: false, stopReason: null, beats: [],
    // The custom prepared result is a real prefix of this ordinary act. It
    // stays in the event boundary keyed from the original source head, so the
    // public event set carries its typed marker/audience; the Host, not the
    // composer, decides whether those entries are retained.
    ...(intentSettlement ? { intentSettlement } : {}),
    rootEntryCount: state.entries.length, rootActionCount: state.agentActions.length, rootRevision: state.revision,
    ...(conversationEventClockVersion === 1 ? { conversationEventClockVersion: 1 } : {}),
    ...(action.schedulingVersion === 1 ? { schedulingBeats: [] } : {}) };
  publishStage(prefix, events, `${action.jobId}:root`);
  return prefix;
}

/** Complete (or interrupt) the original player boundary once. Repeating this
 * call is inert. Reaction elapsed overlaps the original completion target, as
 * in causalTimingVersion:1; it never re-enacts or recharges player speech. */
export function settlePlayerBoundary(input) {
  return withRunBoundary(input?.draft, input?.action?.effectiveRunPolicy, () => settleBoundary(input));
}
function settleBoundary(input) {
  checkPrefix(input); const prefix = structuredClone(input);
  const { draft, action, boundary } = prefix;
  if (!boundary.pending) return prefix;
  const player = createdPlayerId(draft); const { intent } = action;
  const protectedAction = guardProtected(draft); const protectionStart = draft.worldTime;
  const returning = curfewReturnIntent(draft, intent);
  const clockOptions = { npcReactions: true, storyArcVersion: action.storyArcVersion, curfewReturn: returning,
    ...(directorAssemblyMayAdvance(action, prefix) && effectiveAssemblyAllowed(action.effectiveRunPolicy, CARD_ASSEMBLY_TEXT) ? { directorAssembly: action.directorEventDue } : {}) };
  const sequence = boundary.dialogueSequence;
  let deliveredSequenceParts = sequence ? 1 : 0;
  if (sequence && !prefix.interrupted) {
    for (let index = 1; index < sequence.parts.length; index++) {
      const due = sequence.startedAt + Math.floor((boundary.completesAt - sequence.startedAt) * index / sequence.parts.length);
      const slice = advanceCausalTime(draft, Math.max(draft.worldTime, due), `${action.jobId}:sequence-clock:${index}`, clockOptions);
      if (slice.events.length) publishStage(prefix, slice.events, `${action.jobId}:sequence-clock:${index}`);
      if (slice.interrupted || stage(draft) !== boundary.stageBefore) { stop(prefix, 'world_interrupt'); break; }
      let audience = sequence.version >= 4 ? localSpeechPartAudience(draft, player, boundary.roomBefore, sequence.parts[index], sequence)
        : sequenceAudience(draft, player, sequence.targetId, boundary.roomBefore);
      if (sequence.version === 3) {
        const current = causalPlayerScene(draft);
        const group = audience && roomGroupSpeechAudience(draft, current);
        // Keep the already-spoken prefix when either anchor ceases to be real.
        if (!group?.includes(sequence.roomMemberId)) { stop(prefix, 'departure'); break; }
        if (sequence.parts[index].speechScope === 'room') audience = group;
      }
      if (!audience) { stop(prefix, 'departure'); break; }
      const events = sequenceEnactments(draft, action, sequence, index, audience);
      if (events.length) publishStage(prefix, events, `${action.jobId}:sequence:${index}`);
      deliveredSequenceParts++;
    }
  }
  const advanced = prefix.interrupted ? { events: [], interrupted: true }
    : advanceCausalTime(draft, Math.max(draft.worldTime, boundary.completesAt), action.jobId, clockOptions);
  const events = [...advanced.events, ...boundary.deferredEvents.filter(event => event.occurredAt <= draft.worldTime)];
  if (intent.type === 'read' && draft.worldTime >= boundary.completesAt && !draft.completed && runtimeActive(draft, player)
    && ((!advanced.interrupted && stage(draft) === boundary.stageBefore)
      || (draft.worldTime === boundary.completesAt && boundary.stageBefore === 'investigation'
        && stage(draft) === 'assembly' && activeProcedure(draft).investigationDeadline === boundary.completesAt))) {
    const item = readingMaterial(draft, intent.subjectId, player); const reads = draft.agentAutonomy.readByActor ||= {};
    const ids = reads[player] ||= []; if (!ids.includes(item.id)) ids.push(item.id);
    events.push(causalEnactment(draft, `阅读记录【${item.name}】：${item.text}`, player,
      `read:${action.jobId}:${player}`, { delivery: 'reading', audienceIds: [player] }));
  }
  const naturalCaseInspection = hasSoftRuntime(draft) && action.intentContractVersion === 2
    && intent.type === 'case' && intent.operation === 'inspect';
  if (naturalCaseInspection && prefix.intentSettlement) Object.assign(prefix.intentSettlement,
    { status: 'blocked', code: 'world_interrupt' });
  if (boundary.inspectionCompletesAt !== null && draft.worldTime >= boundary.inspectionCompletesAt
    && !draft.completed && runtimeActive(draft, player)
    && (!advanced.interrupted || (draft.worldTime === boundary.inspectionCompletesAt && stage(draft) === 'assembly'))) {
    const inspectionIntent = boundary.inspectionIntent || intent;
    const completion = boundary.inspectionIntent ? { startedAt: boundary.inspectionStartedAt,
      completesAt: boundary.inspectionCompletesAt, objectId: inspectionIntent.subjectId } : null;
    const result = inspectionAcquisition(draft, player, inspectionIntent, `${action.jobId}:procedure`, completion);
    if (result.accepted) events.push(...result.events.map(event => ({ ...event, audienceIds: [player] })));
    if (naturalCaseInspection && prefix.intentSettlement) Object.assign(prefix.intentSettlement,
      result.accepted ? { status: 'completed', code: 'completed' }
        : { status: 'blocked', code: 'operation_unavailable' });
  }
  if (boundary.destination && !advanced.interrupted) {
    if (boundary.destination === 'court') {
      runtimeSetRoom(draft, player, 'court'); events.push(...startProcedureTrial(draft, `${action.jobId}:court`));
    } else if (causalPlayerScene(draft).permittedDestinations.includes(boundary.destination)) {
      runtimeSetRoom(draft, player, boundary.destination);
      events.push(causalEnactment(draft, `你沿通路来到${roomLabel(boundary.destination)}。`, player, `${action.jobId}:arrival`));
    } else events.push(causalEnactment(draft, '通行条件已经改变，脚步停在当前通路前。', player, `${action.jobId}:arrival-blocked`));
  }
  const arrivalGuard = settleGuardBoundary(draft, `${action.jobId}:arrival`); events.push(...arrivalGuard.events);
  if (protectedAction) finishGuardAction(draft, action.jobId, draft.worldTime - protectionStart, intent.type);
  const introduction = protectedAction || arrivalGuard.interrupted ? { events: [], occurred: false } : settleReceptionIntroductions(draft, action.jobId); events.push(...introduction.events);
  if (introduction.occurred) stop(prefix, 'reception_introductions');
  const discoveries = discoverRuntimeIncidents(draft, `${action.jobId}:discovery`); events.push(...discoveries);
  events.push(...runtimeDiscoverObjects(draft, `${action.jobId}:objects:boundary`));
  if (stage(draft) !== boundary.stageBefore) stop(prefix, 'phase_transition');
  else if (advanced.interrupted || arrivalGuard.interrupted || draft.completed || discoveries.some(event => event.audienceIds?.includes(player))
    || (intent.operation === 'until_schedule' && draft.worldTime > boundary.completesAt)) stop(prefix, 'world_interrupt');
  else if (boundary.localIds.some(id => runtimeRoom(draft, id) !== boundary.roomBefore)
    || (runtimeRoom(draft, player) !== boundary.roomBefore && !boundary.destination)) stop(prefix, 'departure');
  // Reaching this host-selected target closes the turn without declaring an
  // interruption. Ordinary NPC beats must not spend seconds past the hour.
  if (!prefix.interrupted && intent.operation === 'until_schedule' && draft.worldTime >= boundary.completesAt) {
    prefix.stopReason = 'schedule_boundary';
  }
  if (!prefix.interrupted && returning && confinementApplies(draft) && !guardEnabled(draft)) prefix.stopReason = 'schedule_boundary';
  // Protected steps are player tactical actions, not a license for NPC time
  // to eat the rest of the escape window or spend a whole night as one step.
  if (!prefix.interrupted && protectedAction) prefix.stopReason = 'schedule_boundary';
  // This pin is sealed in the job/action. Only an explicit sleep command,
  // completed without any world interruption in the owner's actual cell, is
  // a waking source. A pure wait until morning is not sleep.
  if (action.storyLifeVersion === 1 && intent.operation === 'until_morning'
    && /^(?:睡(?:觉|覺)?(?:到|至)?(?:明天|第二天|次日)?(?:早上|清晨|天亮|早晨)|睡到(?:明天|第二天|次日))[。！!]?$/u.test(action.rawInput.trim())
    && !prefix.interrupted && !advanced.interrupted && draft.worldTime === boundary.completesAt
    && runtimeActive(draft, player) && runtimeRoom(draft, player) === boundary.roomBefore
    && ROOM_CODES[boundary.roomBefore] === actorForState(draft, player).locationId
    && /^(?:cell|cell\d+|playercell)$/u.test(boundary.roomBefore)
    && prisonClock(draft).hour >= 5 && prisonClock(draft).hour < 10) {
    const waking = causalEnactment(draft, '你实际睡过这段时间，在清晨醒来。', player,
      `morning-waking:${action.jobId}:${player}`, { delivery: 'action', audienceIds: [player] });
    waking.storyTimelineEvent = { version: 1, kind: 'morning-waking', actorId: player,
      mindId: `mind:${player}`, at: draft.worldTime };
    events.push(waking); prefix.stopReason = 'schedule_boundary';
  }
  if (action.swapLifecycleVersion === 1 && intent.type === 'runtime' && !prefix.interrupted && !advanced.interrupted
    && draft.worldTime >= boundary.completesAt && runtimeRoom(draft, player) === boundary.roomBefore) {
    events.push(...runtimeSettleSwapStep(draft, player, intent.subjectId, { sourceObservationIds: [] }, `${action.jobId}:player`).events);
  }
  if (intent.operation === 'pose' && !prefix.interrupted && !advanced.interrupted
    && !draft.completed && draft.worldTime >= boundary.completesAt && runtimeRoom(draft, player) === boundary.roomBefore) {
    events.push(runtimeSettlePose(draft, player, intent, action.rawInput, `pose:${action.jobId}:${player}`));
  }
  if (prefix.intentSettlement) {
    const travelVersion=action.localTravelAttemptVersion;
    if ([1,2].includes(travelVersion) && !action.playerIntentPlan) {
      if (prefix.interrupted || advanced.interrupted || draft.completed || draft.worldTime<boundary.completesAt
        || runtimeRoom(draft,player)!==boundary.roomBefore || !runtimeActive(draft,player)) {
        Object.assign(prefix.intentSettlement,{status:'blocked',code:'world_interrupt'});
      } else {
        const current=playerPerceivedScene(draft,causalPlayerScene(draft)).scene;
        const near=travelVersion===2 && action.jobId.endsWith(':step:1');
        const attempt=travelVersion===1 ? localTravelAttemptStep(action.rawInput,current)
          : localTravelDirectedStep(action.rawInput,current,near?1:2);
        if (attempt) {
          const text=travelVersion===2 && !near
            ? `我试着往上走，在${current.location}这边停了下来，没走到楼上。` : attempt.action;
          events.push(causalEnactment(draft,text,player,`local-travel-attempt:${action.jobId}`,
            travelVersion===2 && !near ? {audienceIds:[player]} : undefined));
        }
        Object.assign(prefix.intentSettlement,attempt && near ? {status:'completed',code:'completed'}
          : {status:'blocked',code:attempt?'destination_unavailable':'operation_unavailable'});
      }
    }
    if (Object.hasOwn(boundary, 'localDoorVisible')) {
      if (prefix.interrupted || advanced.interrupted || draft.completed || draft.worldTime < boundary.completesAt
        || runtimeRoom(draft, player) !== boundary.roomBefore) {
        Object.assign(prefix.intentSettlement, { status: 'blocked', code: 'world_interrupt' });
      } else {
        const door = boundary.localDoorVisible ? cellDoorAttemptState(draft) : 'unavailable';
        const text = { locked: '我走到牢门边，伸手轻推。锁还扣着，走廊这条路仍被挡住。',
          restricted: '我走到牢门边，伸手轻推。锁已解开，但眼下仍不准经这里出去，我留在门内。',
          passable: '我走到牢门边，伸手轻推。锁已解开，这条通路可前往走廊；我仍在门内。',
          unavailable: '眼前没有可供这次动作核对的牢房门；我没有试推，也没有跨过门口。' }[door];
        events.push(causalEnactment(draft, text, player, `cell-door-attempt:${action.jobId}`));
        Object.assign(prefix.intentSettlement, door === 'passable' ? { status: 'completed', code: 'completed' }
          : { status: 'blocked', code: door === 'unavailable' ? 'operation_unavailable' : 'destination_unavailable' });
      }
    }
    if (boundary.localThresholdProof && !prefix.interrupted && !advanced.interrupted && !draft.completed
      && draft.worldTime>=boundary.completesAt && runtimeActive(draft,player) && runtimeRoom(draft,player)===boundary.roomBefore) {
      // The door end supplies a local orientation, never optical evidence
      // about the adjacent room or proof of how anyone arrived.
      const view=playerPerceivedScene(draft,causalPlayerScene(draft)).scene;
      const current=localThresholdLook(action.playerIntentPlan?.steps[0]?.text ?? action.rawInput,view);
      if (isDeepStrictEqual(current?.focus,boundary.localThresholdProof.focus)) {
        const combined={...current,needles:current.needles.map((id,index)=>{
          const initial=boundary.localThresholdProof.needles[index];
          return initial===null || initial===id ? id : null;
        })};
        events.push(causalEnactment(draft,localThresholdLookText(combined,view),player,
          `local-look-outcome:${action.jobId}`,{delivery:'action',audienceIds:[player]}));
      }
    }
    if (boundary.localSearchSubject && intent.type==='look') {
      if (prefix.interrupted || advanced.interrupted || draft.completed || draft.worldTime<boundary.completesAt
        || runtimeRoom(draft,player)!==boundary.roomBefore || !runtimeActive(draft,player)) {
        Object.assign(prefix.intentSettlement,{status:'blocked',code:'world_interrupt'});
      } else {
        const current=playerPerceivedScene(draft,causalPlayerScene(draft)).scene;
        const found=localSearchLook(action.rawInput,current);
        const label=found?.subjectId===boundary.localSearchSubject ? found.label : undefined;
        events.push(causalEnactment(draft,label ? `我在眼前的人里认出了${label}。` : '在当前能看到的范围内，我还没有认出要找的人。',player,
          `local-search:${action.jobId}`,{delivery:'action',audienceIds:[player]}));
      }
    }
    if ((action.ordinaryLocalApproachVersion===2 && action.playerIntentPlan || action.ordinaryLocalApproachVersion===3)
      && (prefix.interrupted || advanced.interrupted || draft.completed || draft.worldTime<boundary.completesAt
        || runtimeRoom(draft,player)!==boundary.roomBefore || !runtimeActive(draft,player))) {
      Object.assign(prefix.intentSettlement,{status:'blocked',code:'world_interrupt'});
    }
    if (action.ordinaryLocalApproachVersion === 1 && !action.playerIntentPlan) {
      if (prefix.interrupted || advanced.interrupted || draft.completed || draft.worldTime < boundary.completesAt
        || runtimeRoom(draft, player) !== boundary.roomBefore || !localApproachObservation(action.rawInput, causalPlayerScene(draft))) {
        Object.assign(prefix.intentSettlement, { status:'blocked', code:'world_interrupt' });
      } else {
        events.push(causalEnactment(draft, '在当前能看到的范围内，所留意的情况仍未确认。', player,
          `local-approach:${action.jobId}`, { delivery:'action', audienceIds:[player] }));
      }
    }
    if (intent.type === 'move') Object.assign(prefix.intentSettlement, runtimeRoom(draft, player) === intent.destination
      ? { status: 'completed', code: 'completed' } : { status: 'blocked', code: advanced.interrupted ? 'world_interrupt' : 'destination_unavailable' });
    if (sequence && deliveredSequenceParts < sequence.parts.length)
      Object.assign(prefix.intentSettlement, { status: 'blocked', code: 'world_interrupt' });
    prefix.intentSettlement.entryEnd = draft.entries.length + events.length;
  }
  boundary.pending = false; boundary.deferredEvents = []; prefix.phase = 'ready';
  publishStage(prefix, events, `${action.jobId}:boundary`);
  return prefix;
}
function stageStop(prefix, before, events, clockInterrupted) {
  const { draft } = prefix; const player = createdPlayerId(draft);
  if (stage(draft) !== before.stage) return 'phase_transition';
  if (draft.completed || clockInterrupted || guardEnabled(draft) && draft.guardReaction.pending) return 'world_interrupt';
  if (draft.caseRuntime.signals.length > before.signals || pendingReactionActors(draft).some(id => !before.reactions.includes(id))) return 'threat';
  if (events.some(event => event.speakerId !== player && event.audienceIds?.includes(player)
    && event.addresseeIds?.includes(player) && (['ask', 'invite'].includes(event.communication?.kind)
      || ['speech', 'writing'].includes(event.delivery) && ['ask', 'invite'].includes(communicationKind(event.text))))) return 'player_ask';
  if (runtimeRoom(draft, player) !== before.rooms[player]) return 'departure';
  if (Object.entries(before.rooms).some(([id, room]) => id !== player && room === before.rooms[player]
    && runtimeRoom(draft, id) !== room)) return 'departure';
  if (events.some(event => event.delivery === 'reading' && event.audienceIds?.includes(player)
    && event.observationKey?.startsWith('case:discovery:'))) return 'world_interrupt';
  return null;
}

const NPC_VOLUNTARY_MAGIC = new Set(['ignite', 'sound-replay']);
// Match the existing roleplay situation wire limit without dropping physical targets.
const NPC_MAGIC_WIRE_TARGETS = 64;
/** A real patient is only a currently visible living body in this room with a
 * nonfatal injury in the shared register. The host chooses the exact injury;
 * the model never supplies an injury id or a contact/consent claim. */
function injuredNpcPatient(state, actorId, magic, bodyId) {
  if (typeof bodyId !== 'string' || !bodyId.startsWith('body:')) return null;
  const physicalId = bodyId.slice('body:'.length);
  for (const id of actorsForState(state).map(actor => actor.id)) {
    if (id === actorId || id === 'warden') continue;
    if (runtimeBodyActorId(state, id) !== physicalId) continue;
    const body = magic.identity.bodies[bodyId];
    const condition = state.caseRuntime.conditionsByActor?.[physicalId];
    if (!body?.alive || !Array.isArray(condition?.injuries) || !condition.injuries.length
      || ['dead', 'executed', 'unavailable'].includes(condition.status)) continue;
    const injury = condition.injuries.find(row => row && typeof row.id === 'string'
      && typeof row.sourceOperationId === 'string'
      // The patient's wound is actionable only after this actor really received
      // the observation of the wound-causing action. Shared condition truth and
      // an invisible register entry are not enough; another room's hidden injury
      // never becomes a menu target.
      && state.caseRuntime.observations.some(seen => seen?.audienceIds?.includes(actorId)
        && String(seen.id).startsWith(`case:${row.sourceOperationId}:`)));
    if (!injury) continue;
    return { actorId: id, physicalId, bodyId, injury, condition };
  }
  return null;
}
function npcMagicScope(state) {
  return { branchId: state.magic.branchId, commitRef: state.magic.headCommitRef,
    generation: state.generation, revision: state.revision };
}
function heardOwnerSources(state, magic, actorId) {
  const observations = []; const seen = new Set();
  for (const entry of state.entries || []) {
    if (entry?.delivery !== 'speech' || typeof entry.observationKey !== 'string' || !entry.audienceIds?.includes(actorId)) continue;
    const text = entry.textByActor?.[actorId] || entry.text;
    const occurredAt = entry.occurredAt;
    const learnedAt = Number.isSafeInteger(entry.learnedAt) ? Math.max(entry.learnedAt, occurredAt) : occurredAt;
    if (typeof text !== 'string' || !text || !Number.isSafeInteger(occurredAt) || occurredAt < 0
      || !Number.isSafeInteger(learnedAt) || learnedAt < occurredAt || learnedAt > state.worldTime) continue;
    const id = actorObservationId(state, entry.observationKey, actorId);
    if (!magicId(id) || seen.has(id)) continue;
    seen.add(id);
    observations.push({ id, actorId, text, channel: 'hearing', occurredAt, learnedAt,
      branchId: magic.branchId, generation: state.generation, revision: state.revision });
  }
  return { observations };
}
/** A prepared establish/restore is a host transition. Its scene prefix already
 * carries the after-state mirror (and, for a later establish, an occupied
 * parent), so an NPC voluntary menu must not audit that prepared mirror against
 * the still-unpublished committed source. The decision comes only from the
 * host-authenticated prepared swap command (never from a raw magic intent). */
export function preparedSwapForNpcMenu(swapAct) {
  return Boolean(swapAct?.prepared
    && ['magic_swap_establish', 'magic_swap_restore'].includes(swapAct.command?.type));
}
function voluntaryMagicView(state, actorId, domainStore, sourceState = state, options = {}) {
  if (!state?.magic || !state.caseRuntime) return null;
  // Occupied identity is authenticated only through the live domain. A menu
  // read without that store offers no cast instead of crashing the turn.
  // The scene draft is not the domain head, so authentication uses the
  // committed source while physical rows rebind from the draft.
  if (state.caseRuntime.occupiedBody && !domainStore) return null;
  // A same-act establishment introduces occupancy from an unoccupied source;
  // there is no committed occupied world to authenticate a voluntary NPC cast
  // against yet. Do not offer one inside the establishing beat.
  if (state.caseRuntime.occupiedBody && !sourceState?.caseRuntime?.occupiedBody) return null;
  // A same-act restore has the reverse shape: its occupied mirror is the
  // prepared after-state, while the committed source is still swapped. The
  // ordinary pre/post occupied audit cannot apply until the act publishes.
  if (options.preparedSwap === true) return null;
  const magic = refreshHostMagic(state, state.magic, npcMagicScope(state), { domainStore, sourceState });
  const capabilities = hostMagicCapabilities(state, magic, actorId, heardOwnerSources(state, magic, actorId));
  const actions = capabilities.actions.filter(action => action.executable === true
    && (NPC_VOLUNTARY_MAGIC.has(magicDefinition(action.definitionRef)?.operation)
      || action.definitionRef === 'sherry:basic@1'
      || options.npcVoluntaryFloatVersion === 1
        && magicDefinition(action.definitionRef)?.operation === 'self-float'));
  return { magic, capabilities, actions };
}
/** Labels and handles only. Ignite, sound-replay, the reviewed basic
 * self-float and the exact native `sherry:basic@1` basic strength (self-target
 * only) are voluntary; an owner may also end their own active float. */
export function npcMagicMenu(state, actorId, domainStore, sourceState = state, options = {}) {
  const view = voluntaryMagicView(state, actorId, domainStore, sourceState, options);
  if (!view) return null;
  const { magic, capabilities, actions } = view;
  const kinds = new Set(actions.flatMap(action => magicDefinition(action.definitionRef).targetKinds));
  const mindId = Object.values(magic.identity.minds).find(row => row.actorId === actorId)?.id;
  const sourceBodyId = mindId && bodyForMind(magic.identity, mindId);
  const targetEntities = hostMagicTargetEntities(state, magic, actorId, heardOwnerSources(state, magic, actorId));
  const strength = actions.some(action => action.definitionRef === 'sherry:basic@1');
  const patientAt = row => row.kind === 'body' && injuredNpcPatient(state, actorId, magic, targetEntities.get(row.handle));
  const medical = options.npcMedicalContactVersion === 1 && capabilities.actions.find(action =>
    action.executable === true && magicDefinition(action.definitionRef)?.operation === 'regenerate'
    && capabilities.targets.some(patientAt));
  if (!actions.length && !medical) return null;
  if (medical) for (const kind of magicDefinition(medical.definitionRef).targetKinds) kinds.add(kind);
  const ownFloat = options.npcVoluntaryFloatVersion === 1 && sourceBodyId && magic.effects.find(effect => effect.status === 'active'
    && effect.event.operation === 'self-float' && effect.event.definitionRef === 'hanna:basic@1'
    && effect.event.sourceMindId === mindId
    && effect.sourceBodyId === sourceBodyId && effect.event.targetId === sourceBodyId);
  let targets = capabilities.targets.filter(row => kinds.has(row.kind)
    && (!strength || row.kind !== 'body' || targetEntities.get(row.handle) === sourceBodyId)
    && (row.kind !== 'body' || !medical
      || ownFloat && targetEntities.get(row.handle) === sourceBodyId
      || patientAt(row)));
  if (targets.length > NPC_MAGIC_WIRE_TARGETS) {
    // The host lists authorized sounds after live physical targets, in delivery
    // history order. Bound only the offered sound window. Keep the observation
    // history and current-scope handle validation intact; valid short menus are
    // byte-for-byte unchanged, including old sealed decisions.
    const sounds = targets.filter(row => row.kind === 'observation');
    const available = Math.max(0, NPC_MAGIC_WIRE_TARGETS - (targets.length - sounds.length));
    const keep = new Set(sounds.slice(sounds.length - available));
    targets = targets.filter(row => row.kind !== 'observation' || keep.has(row));
  }
  return {
    actions: [...actions.map(action => ({ handle: action.grantId, label: action.label })),
      ...(medical ? [{ handle: medical.grantId, label: '实际覆住眼前伤处并尝试治愈·再生' }] : []),
      ...(ownFloat ? [{ handle: `end:${ownFloat.id}`, label: '结束你身上的飘浮' }] : [])],
    targets: targets.map(row => ({ handle: row.handle, label: row.label,
      ...(row.sourceObservationId ? { sourceObservationId: row.sourceObservationId } : {}) })),
  };
}
/** Capture the actor's host-only opaque handle -> entity map from the real
 * pre-decision frame. This is not wire data: the model still receives only
 * `menu.targets`; settlement uses it solely to authenticate that the exact
 * delivered handle belonged to this actor before rebinding the same entity
 * against the current shared world. */
function captureNpcMagicDecisionBinding(state, actorId, domainStore, sourceState, options) {
  const menu = npcMagicMenu(state, actorId, domainStore, sourceState, options);
  if (!menu?.targets?.length) return null;
  const view = voluntaryMagicView(state, actorId, domainStore, sourceState, options);
  if (!view) return null;
  const entities = hostMagicTargetEntities(state, view.magic, actorId,
    heardOwnerSources(state, view.magic, actorId));
  const targets = new Map();
  for (const row of menu.targets) {
    const entityId = entities.get(row.handle);
    if (entityId) targets.set(row.handle, entityId);
  }
  return targets.size ? { actorId, targets } : null;
}

export function settleNpcMagicCast(state, actorId, operation, useId, domainStore, sourceState = state, options = {}) {
  if (state.npcMagicPublication || !state.magic || !state.caseRuntime) return { accepted: false, reason: 'operation_unsupported' };
  const view = voluntaryMagicView(state, actorId, domainStore, sourceState, options);
  if (!view) return { accepted: false, reason: 'operation_unsupported' };
  const { magic, actions, capabilities } = view;
  if (options.npcVoluntaryFloatVersion === 1 && typeof operation?.subjectId === 'string' && operation.subjectId.startsWith('end:')) {
    const mindId = Object.values(magic.identity.minds).find(row => row.actorId === actorId)?.id;
    const sourceBodyId = mindId && bodyForMind(magic.identity, mindId);
    const effectId = operation.subjectId.slice(4);
    const effect = sourceBodyId && magic.effects.find(row => row.id === effectId && row.status === 'active'
      && row.event.operation === 'self-float' && row.event.definitionRef === 'hanna:basic@1'
      && row.event.sourceMindId === mindId
      && row.sourceBodyId === sourceBodyId && row.event.targetId === sourceBodyId);
    const target = sourceBodyId && capabilities.targets.find(row => row.handle === operation.targetHandle
      && row.kind === 'body' && row.label === '本人身体');
    if (!effect || !target || !magicId(useId)) return { accepted: false, reason: 'target_unavailable' };
    const ended = settleOwnedSelfFloat(magic, { actorId, at: state.worldTime });
    const endEntries = [1, 2].includes(options.selfFloatEndObservationVersion)
      ? hostSelfFloatEndEntries(state, actorId, ended, useId, options.selfFloatEndObservationVersion) : [];
    state.magic = ended.state;
    state.entries.push(...endEntries);
    if (options.magicCaseWitnessVersion === 1) recordHostMagicWitnessTraces(state, endEntries);
    state.npcMagicPublication = { projection: ended.state, command: { type: 'magic_end', useId,
      effectIds: ended.effectIds }, receipt: { useId, status: 'ended', effectIds: ended.effectIds,
      occurredAt: state.worldTime }, events: [] };
    return { accepted: true, entries: endEntries };
  }
  const medicalAction = options.npcMedicalContactVersion === 1 && capabilities.actions.find(row =>
    row.executable === true && magicDefinition(row.definitionRef)?.operation === 'regenerate'
    && row.grantId === operation?.subjectId);
  const action = medicalAction || actions.find(row => row.grantId === operation?.subjectId);
  const definition = action && magicDefinition(action.definitionRef);
  // The exact opaque handle was delivered against one real pre-decision frame.
  // Authenticate that handle in that captured host-only map, then resolve the
  // same physical entity against the current capabilities. Current execution
  // consumes the fresh handle; a handle absent from the actor's delivered map
  // is not accepted merely because its text resembles a token.
  let target;
  if (options.decisionBinding?.actorId === actorId && operation?.type === 'magic_cast' && definition) {
    const capturedEntityId = options.decisionBinding.targets.get(operation.targetHandle);
    if (capturedEntityId) {
      const currentEntities = hostMagicTargetEntities(state, magic, actorId,
        heardOwnerSources(state, magic, actorId));
      target = capabilities.targets.find(row => currentEntities.get(row.handle) === capturedEntityId
        && definition.targetKinds.includes(row.kind));
    }
  } else {
    target = definition && capabilities.targets.find(row => row.handle === operation.targetHandle
      && definition.targetKinds.includes(row.kind));
  }
  if (!action || !target || !magicId(useId)) {
    return { accepted: false, reason: action ? 'target_unavailable' : 'operation_unsupported' };
  }
  if (options.npcMedicalContactVersion === 1 && definition.operation === 'regenerate') {
    // The menu action itself is the ordinary host action that reaches out and
    // touches the visible wound. No model prose, missing-contact auto-fill or
    // synthetic certificate participates; the host selects the exact injury.
    const targetEntities = hostMagicTargetEntities(state, magic, actorId, heardOwnerSources(state, magic, actorId));
    const targetEntityId = targetEntities.get(target.handle);
    const patient = injuredNpcPatient(state, actorId, magic, targetEntityId);
    const mindId = Object.values(magic.identity.minds).find(row => row.actorId === actorId)?.id;
    const sourceBodyId = mindId && bodyForMind(magic.identity, mindId);
    if (!patient || !sourceBodyId) return { accepted: false, reason: 'target_unavailable' };
    // Resolve the refreshed grant/body before writing any contact, so a stale
    // target or a disabled grant leaves no contact entry and no effect behind.
    const scope = { branchId: magic.branchId, commitRef: magic.headCommitRef,
      generation: state.generation, revision: state.revision };
    const refreshed = refreshHostMagic(state, magic, scope,
      domainStore ? { domainStore, sourceState } : {});
    const refreshedCapabilities = hostMagicCapabilities(state, refreshed, actorId,
      heardOwnerSources(state, refreshed, actorId));
    const refreshedEntities = hostMagicTargetEntities(state, refreshed, actorId,
      heardOwnerSources(state, refreshed, actorId));
    const actualTarget = refreshedCapabilities.targets.find(row => row.kind === 'body'
      && refreshedEntities.get(row.handle) === targetEntityId);
    const actualPatient = refreshedEntities.has(actualTarget?.handle)
      && injuredNpcPatient(state, actorId, refreshed, targetEntityId);
    const grant = refreshed.grants.find(row => row.id === action.grantId && row.enabled === true);
    const actualDefinition = grant && magicDefinition(grant.definitionRef);
    if (!actualTarget || !actualPatient || !actualDefinition || actualDefinition.operation !== 'regenerate') {
      return { accepted: false, reason: 'target_unavailable' };
    }
    const contactId = `contact:${useId}:npc-heal`;
    const contact = { id: `entry-${state.entries.length + 1}`, speaker: actorForState(state, actorId).name,
      speakerId: actorId, delivery: 'action', audienceIds: [...new Set([actorId, actualPatient.actorId])],
      occurredAt: state.worldTime, observationKey: contactId,
      text: `${actorForState(state, actorId).name}实际伸手覆住眼前伤者的伤处，皮肤与伤口接触。`,
      hostMagicEvent: { id: contactId, type: 'physical-contact', sourceBodyId,
        targetId: actualPatient.bodyId, at: state.worldTime, branchId: refreshed.branchId,
        headCommitRef: refreshed.headCommitRef, generation: state.generation, revision: state.revision } };
    state.entries.push(contact);
    // Refresh once more with the contact in place so the host world fingerprint
    // and the contact certificate bind to the same exact action boundary.
    let finalMagic; let finalTarget; let finalGrant; let finalDefinition; let finalPatient;
    try {
      finalMagic = refreshHostMagic(state, refreshed, scope,
        domainStore ? { domainStore, sourceState } : {});
      const finalCapabilities = hostMagicCapabilities(state, finalMagic, actorId,
        heardOwnerSources(state, finalMagic, actorId));
      const finalEntities = hostMagicTargetEntities(state, finalMagic, actorId,
        heardOwnerSources(state, finalMagic, actorId));
      finalTarget = finalCapabilities.targets.find(row => row.kind === 'body'
        && finalEntities.get(row.handle) === targetEntityId);
      finalPatient = injuredNpcPatient(state, actorId, finalMagic, targetEntityId);
      finalGrant = finalMagic.grants.find(row => row.id === action.grantId && row.enabled === true);
      finalDefinition = finalGrant && magicDefinition(finalGrant.definitionRef);
    } catch (error) {
      state.entries.splice(state.entries.indexOf(contact), 1);
      throw error;
    }
    if (!finalTarget || !finalPatient || !finalDefinition || finalDefinition.operation !== 'regenerate') {
      state.entries.splice(state.entries.indexOf(contact), 1);
      return { accepted: false, reason: 'target_unavailable' };
    }
    contact.hostMagicEvent.branchId = finalMagic.branchId;
    contact.hostMagicEvent.headCommitRef = finalMagic.headCommitRef;
    contact.hostMagicEvent.generation = state.generation;
    contact.hostMagicEvent.revision = state.revision;
    const command = { type: 'magic_cast', useId, actorId, grantId: finalGrant.id,
      definitionRef: finalDefinition.ref, activation: 'intent', targetHandle: finalTarget.handle,
      parameters: { injuryIds: [finalPatient.injury.id] } };
    let result;
    try {
      result = executeHostMagic({ ...state, magic: finalMagic }, actorId, command,
        heardOwnerSources(state, finalMagic, actorId),
        { refs: [contactId], magicCaseWitnessVersion: options.magicCaseWitnessVersion });
    } catch (error) {
      state.entries.splice(state.entries.indexOf(contact), 1);
      throw error;
    }
    if (result.requiredHooks?.length || result.replayed) {
      state.entries.splice(state.entries.indexOf(contact), 1);
      return { accepted: false, reason: 'operation_unsupported' };
    }
    state.caseRuntime.signals = result.state.caseRuntime.signals;
    state.caseRuntime.objects = result.state.caseRuntime.objects;
    state.caseRuntime.traces = result.state.caseRuntime.traces;
    state.caseRuntime.observations = result.state.caseRuntime.observations;
    state.caseRuntime.conditionsByActor = result.state.caseRuntime.conditionsByActor;
    state.magic = result.state.magic;
    state.npcMagicPublication = { projection: result.state.magic, command, receipt: result.receipt,
      events: result.state.magic.effects.filter(row => result.receipt.effectIds.includes(row.id)).map(row => row.event) };
    return { accepted: true, entries: (result.entries || []).map(entry => structuredClone(entry)) };
  }
  const command = { type: 'magic_cast', useId, actorId, grantId: action.grantId, definitionRef: action.definitionRef,
    activation: 'intent', targetHandle: target.handle,
    parameters: definition.operation === 'sound-replay' ? { sourceHandle: target.handle } : {} };
  const result = executeHostMagic({ ...state, magic }, actorId, command,
    heardOwnerSources(state, magic, actorId), { magicCaseWitnessVersion: options.magicCaseWitnessVersion });
  if (result.requiredHooks?.length || result.replayed) return { accepted: false, reason: 'operation_unsupported' };
  state.caseRuntime.signals = result.state.caseRuntime.signals;
  state.caseRuntime.objects = result.state.caseRuntime.objects;
  state.caseRuntime.traces = result.state.caseRuntime.traces;
  state.caseRuntime.observations = result.state.caseRuntime.observations;
  state.magic = result.state.magic;
  state.npcMagicPublication = { projection: result.state.magic, command, receipt: result.receipt,
    events: result.state.magic.effects.filter(row => result.receipt.effectIds.includes(row.id)).map(row => row.event) };
  return { accepted: true, entries: (result.entries || []).map(entry => structuredClone(entry)) };
}

/** Apply only the supplied, already authorized proposals against this prefix.
 * A beat uses one pre-decision frame, fixed roster resource order and a unique
 * `${jobId}:beat:${beat}` event namespace. No model output is synthesized here. */
export function applyCausalNpcBeat(input, beat, scheduling, options) {
  return withRunBoundary(input?.draft, input?.action?.effectiveRunPolicy, () => applyNpcBeat(input, beat, scheduling, options));
}
function applyNpcBeat(input, beat, scheduling, { historicalReplay = false, domainStore, magicSourceState, preparedSwap = false, conversationEventClockVersion } = {}) {
  checkPrefix(input); validateBeats([...input.beats, beat], input.draft);
  if (conversationEventClockVersion !== undefined && conversationEventClockVersion !== 1) fail();
  if (input.action.schedulingVersion === 1) validateSceneScheduling(input, scheduling, beat.decisions.map(row => row.actorId), { exactDerivation: historicalReplay });
  else if (scheduling !== undefined) fail();
  if (input.interrupted || input.stopReason || guardEnabled(input.draft) && input.draft.guardReaction.pending
    || input.action.intent.operation === 'vote'
    || beat.phase !== (input.phase === 'reaction' ? 'reaction' : 'npc')
    || (beat.phase === 'npc' && input.boundary.pending)) fail();
  const prefix = structuredClone(input); const { draft, action } = prefix;
  if (conversationEventClockVersion === 1) prefix.conversationEventClockVersion = 1;
  else delete prefix.conversationEventClockVersion;
  const reactions = pendingReactionActors(draft);
  if (beat.phase === 'reaction' && (!input.boundary.pending || beat.decisions.some(row => !reactions.includes(row.actorId)))) fail();
  const roster = actorsForState(draft).map(actor => actor.id);
  // v1 keeps historical roster settlement. The opt-in advisory frame has
  // already validated the same selected membership and mandatory priorities;
  // its one adjacent soft reorder must govern actual execution, not dead metadata.
  const order = scheduling?.version === 2 && beat.phase !== 'reaction' ? scheduling.advisory.executionOrder : roster;
  const attackFirst = row => {
    if (scheduling?.version === 2 || action.caseActionTimingVersion !== 2 || beat.phase === 'reaction') return 1;
    const operation = row.proposal?.decision?.operation;
    if (operation?.type !== 'case_step') return 1;
    return runtimeOptions(draft, row.actorId, { perceived: true }).some(item => item.id === operation.subjectId && item.kind === 'attack') ? 0 : 1;
  };
  // A live gaze is shorter than one earlier sibling wait under shared action
  // timing. The already selected attack runs before those waits; it does not
  // skip the victim's later reaction beat. Advisory execution order stays exact.
  const ordered = [...beat.decisions].sort((left, right) => attackFirst(left) - attackFirst(right)
    || order.indexOf(left.actorId) - order.indexOf(right.actorId));
  // Under the accepted medical-contact pin, capture one real pre-decision frame
  // for every magic actor before any sibling can advance the shared clock.
  // These host-only maps never enter the task wire, action JSON or HMAC; they
  // only authenticate the exact delivered opaque handle against its actor.
  const magicDecisionBindings = new Map();
  if (action.npcMedicalContactVersion === 1 && beat.phase !== 'reaction') for (const decision of ordered) {
    const operation = decision.proposal?.decision?.operation;
    if (operation?.type !== 'magic_cast' || magicDecisionBindings.has(decision.actorId)) continue;
    const binding = captureNpcMagicDecisionBinding(draft, decision.actorId, domainStore, magicSourceState,
      { npcVoluntaryFloatVersion: action.npcVoluntaryFloatVersion,
        npcMedicalContactVersion: action.npcMedicalContactVersion, preparedSwap,
        selfFloatEndObservationVersion: action.selfFloatEndObservationVersion,
        magicCaseWitnessVersion: action.magicCaseWitnessVersion });
    if (binding) magicDecisionBindings.set(decision.actorId, binding);
  }
  const schedulerRoster = roster.filter(id => ![createdPlayerId(draft), 'warden'].includes(id) && runtimeActive(draft, id));
  const cursor = draft.agentAutonomy.cursor; const considered = new Set();
  const received = Object.fromEntries(beat.decisions.map(({ actorId }) => [actorId, receivedEnactmentCount(draft, actorId)]));
  const events = []; const jobKey = `${action.jobId}:beat:${beat.beat}`;
  if (beat.phase === 'reaction') for (const signal of draft.caseRuntime.signals.filter(row => row.kind === 'threat')) {
    const ids = beat.decisions.filter(row => signal.audienceIds.includes(row.actorId)).map(row => row.actorId);
    if (ids.length) signal.reactionActorIds = [...new Set([...(signal.reactionActorIds || []), ...ids])];
  }
  for (const decision of ordered) {
    const quotedAt = draft.worldTime;
    const before = { stage: stage(draft), signals: draft.caseRuntime.signals.length, reactions: pendingReactionActors(draft),
      rooms: Object.fromEntries(roster.filter(id => runtimeActive(draft, id)).map(id => [id, runtimeRoom(draft, id)])) };
    let clockInterrupted = false; const count = draft.agentAutonomy.decisions.length;
    // Stop between enacted siblings too: an ask/departure cannot authorize a
    // stale sibling or a later beat. Do not persist this beat until it ends.
    const enacted = applyNpcDecisions(draft, [decision], jobKey, { causalTimingVersion: 1, caseActionTimingVersion: action.caseActionTimingVersion,
      objectInspectionTimingVersion: action.objectInspectionTimingVersion,
      ...dialogueContextPin(action), decisionAuditVersion: action.decisionAuditVersion, introductionVersion: action.introductionVersion,
      npcMagicCastVersion: action.npcMagicCastVersion,
      npcVoluntaryFloatVersion: action.npcVoluntaryFloatVersion,
      settleNpcMagic: (state, actorId, operation, useId) => settleNpcMagicCast(state, actorId, operation, useId, domainStore, magicSourceState,
        { npcVoluntaryFloatVersion: action.npcVoluntaryFloatVersion,
          npcMedicalContactVersion: action.npcMedicalContactVersion, preparedSwap,
          selfFloatEndObservationVersion: action.selfFloatEndObservationVersion,
          magicCaseWitnessVersion: action.magicCaseWitnessVersion,
          decisionBinding: magicDecisionBindings.get(decision.actorId) }),
      followTargetId: action.intent.type === 'follow' ? action.intent.targetId : undefined,
      onElapsed: (seconds, actorId) => {
        const advanced = advanceCausalTime(draft, draft.worldTime + seconds,
          `${jobKey}:${beat.phase}-time:${actorId}`, { npcReactions: true, storyArcVersion: action.storyArcVersion });
        clockInterrupted ||= advanced.interrupted; return advanced;
      } });
    if (draft.agentAutonomy.decisions.length > count) {
      considered.add(decision.actorId);
      for (const row of draft.agentAutonomy.decisions.slice(count)) row.sceneRevision = prefix.rootRevision + 1;
    }
    if (action.ordinaryAddressVersion === 3) {
      // This exact speech is emitted before its elapsed boundary. The beat is
      // published after siblings, so use pre-decision rather than final rooms.
      const player = createdPlayerId(draft), room = before.rooms[player];
      for (const row of enacted) if (row.observationKey === `npc:${jobKey}:${decision.actorId}`
        && ['speech', 'writing'].includes(row.delivery) && row.occurredAt === quotedAt
        && row.speakerId === decision.actorId && row.addresseeIds?.length === 1 && row.addresseeIds[0] === player
        && row.audienceIds?.includes(player) && room && before.rooms[row.speakerId] === room) row.conversationRoomId = room;
    }
    const discovery = discoverRuntimeIncidents(draft, `${jobKey}:discovery:${decision.actorId}`);
    discovery.push(...runtimeDiscoverObjects(draft, `${jobKey}:objects:${decision.actorId}`));
    events.push(...enacted, ...discovery);
    const reason = stageStop(prefix, before, [...enacted, ...discovery], clockInterrupted);
    const operation = decision.proposal?.decision?.operation;
    const fixedGaze = !reason && action.caseActionTimingVersion === 2 && operation?.type === 'case_step'
      && runtimeOptions(draft, decision.actorId, { perceived: true }).some(item => item.id === operation.subjectId && item.kind === 'fix-gaze')
      && draft.agentAutonomy.decisions.slice(count).some(row => row.accepted);
    if (reason || fixedGaze) { stop(prefix, reason || 'world_interrupt'); break; }
  }
  for (const actorId of considered) (draft.agentAutonomy.receivedCounts ||= {})[actorId] = received[actorId];
  const last = beat.decisions.findLast(row => considered.has(row.actorId));
  const index = schedulerRoster.indexOf(last?.actorId);
  if (index >= 0) draft.agentAutonomy.cursor = cursor + (index - cursor % schedulerRoster.length + schedulerRoster.length) % schedulerRoster.length + 1;
  prefix.beats.push(structuredClone(beat));
  if (prefix.action.schedulingVersion === 1) prefix.schedulingBeats.push(structuredClone(scheduling));
  prefix.phase = prefix.boundary.pending && pendingReactionActors(draft).length ? 'reaction' : 'ready';
  publishStage(prefix, events, `${jobKey}:enactment`);
  return prefix;
}

function intentStepResult(prefix, index, settlement, start, end) {
  const code = settlement.offerId ? runtimeItemOfferResult(prefix.draft, settlement.offerId) : settlement.code;
  const offer = settlement.offerId && prefix.draft.caseRuntime.operations.find(row => row.id === settlement.offerId);
  return { index, status: code === 'completed' ? 'completed' : 'blocked', code,
    eventIds: prefix.draft.entries.slice(prefix.rootEntryCount).flatMap((entry, offset) => {
      const position = prefix.rootEntryCount + offset;
      const belongs = position >= start && position < end || offer?.acceptOperationId
        && entry.observationKey?.startsWith(`case:${offer.acceptOperationId}:`);
      return belongs && entry.delivery !== 'reflection' && entry.audienceIds?.includes(createdPlayerId(prefix.draft)) ? [`event-${offset + 1}`] : [];
    }) };
}
// Authorized steps interleave with the EXISTING bounded NPC beats. A pending
// offer pauses until its recipient receives a current menu and owned source.
// Seal a stage only when all currently eligible performance results exist.
export function preparePlayerIntentTail(input, action, options) {
  return withRunBoundary(input?.draft, action?.effectiveRunPolicy, () => prepareIntentTail(input, action, options));
}
function prepareIntentTail(input, action, { final = false, domainStore = null, domainSourceState = null } = {}) {
  if (![1, 2].includes(action.intentContractVersion) || !action.playerIntentPlan) return { prefix: settlePlayerBoundary(input) };
  if (!final && input.phase === 'reaction' && input.boundary.pending) return { prefix: structuredClone(input), awaitingReaction: true };
  const prefix = settlePlayerBoundary(input); const plan = action.playerIntentPlan;
  const progress = prefix.intentProgress ||= { version: 1, settlements: [{ index: 0, ...prefix.intentSettlement,
    start: prefix.rootEntryCount, end: prefix.intentSettlement.entryEnd ?? prefix.draft.entries.length }] };
  const facts = () => progress.settlements.map(row => intentStepResult(prefix, row.index, row, row.start, row.end));
  const finish = () => {
    const steps = facts();
    if (progress.stop) for (let index = steps.length; index < plan.steps.length; index++) steps.push({ index,
      status: 'not_executed', code: 'not_executed', eventIds: [] });
    return { prefix, steps, ...(progress.stop ? { stop: { ...progress.stop } } : {}) };
  };
  if (progress.stop) return finish();
  while (true) {
    const steps = facts(); const blocked = steps.find(row => row.status !== 'completed');
    if (blocked) {
      if (blocked.code === 'awaiting_recipient' && !final) return { ...finish(), awaitingRecipient: true };
      progress.stop = { index: blocked.index, kind: 'blocked', code: blocked.code }; return finish();
    }
    const index = progress.settlements.length;
    if (index >= plan.steps.length) return finish();
    const step = plan.steps[index]; const scene = causalPlayerScene(prefix.draft); const prior = progress.settlements.at(-1);
    const condition = !prefix.interrupted && !prefix.stopReason
      && (step.condition !== 'passage_permitted' || step.intent.type === 'move' && scene.permittedDestinations.includes(step.intent.destination))
      && (step.condition !== 'item_accepted' || prior.offerId && runtimeItemOfferResult(prefix.draft, prior.offerId) === 'completed');
    const intent = condition ? resolvePlayerPlanStep(prefix.draft, step) : null;
    const ambientVersion=action.ordinaryLocalAmbientSpeechVersion;
    if (condition && [1,2,3,4].includes(ambientVersion)) {
      const perception=playerPerceivedScene(prefix.draft,scene), current=perception.scene, player=createdPlayerId(prefix.draft);
      if (ambientVersion===3 && intent?.type==='act') Object.assign(current,ordinaryReplyContext(prefix.draft,player,current,perception.targetIds,3));
      if (!intent || scene.roomId!==prefix.boundary.roomBefore || !runtimeActive(prefix.draft,player)
        || actorForState(prefix.draft,player)?.communication!=='speech'
        || !(ambientVersion===4 ? localOpenOrientationStep(step.text,current)?.kind===(index===1?'orientation':'proposal')
            && (intent.type!=='act' || roomGroupSpeechAudience(prefix.draft,scene).length>=3)
          : ambientVersion===3 ? localComposedAmbientStep(step.text,current)?.type===intent.type
            && (intent.type!=='act' || roomGroupSpeechAudience(prefix.draft,scene).length>=3)
          : ambientVersion===2 ? localAgreementPerformance(step.text,current,intent.type)
          : index===1 ? localAmbientSpeech(step.text,current) : localAmbientWait(step.text,current))) {
        const edge=prefix.draft.entries.length;
        progress.settlements.push({index,code:'operation_unavailable',start:edge,end:edge});
        progress.stop={index,kind:'blocked',code:'operation_unavailable'};
        return finish();
      }
    }
    if (condition && action.ordinaryLocalApproachVersion === 1
      && (!intent || scene.roomId !== prefix.boundary.roomBefore || !localApproachObservation(step.text, scene))) {
      const edge = prefix.draft.entries.length;
      progress.settlements.push({ index, code:'operation_unavailable', start:edge, end:edge });
      progress.stop = { index, kind:'blocked', code:'operation_unavailable' };
      return finish();
    }
    const searchConversation=action.ordinaryLocalSearchConversationVersion===1;
    if (condition && searchConversation) {
      const perception=playerPerceivedScene(prefix.draft,scene), player=createdPlayerId(prefix.draft);
      const current=perception.scene, target=intent && projectPerceivedIntent(intent,perception.targetIds).targetId;
      const proof = index===1 ? localSearchLook(step.text,current) : localSearchProposal(step.text,current,target);
      if (!intent || scene.roomId!==prefix.boundary.roomBefore || !runtimeActive(prefix.draft,player)
        || actorForState(prefix.draft,player)?.communication!=='speech' || proof?.subjectId!==prefix.boundary.localSearchSubject
        || (index===1 ? !proof : proof?.text!==step.intent.playerText
          || !sequenceAudience(prefix.draft,player,intent.targetId,scene.roomId))) {
        const edge=prefix.draft.entries.length;
        progress.settlements.push({index,code:'operation_unavailable',start:edge,end:edge});
        progress.stop={index,kind:'blocked',code:'operation_unavailable'};
        return finish();
      }
    }
    const travelVersion=action.localTravelAttemptVersion;
    if (condition && [1,2].includes(travelVersion)) {
      const current=playerPerceivedScene(prefix.draft,scene).scene;
      const local=travelVersion===1 ? localTravelAttemptStep(step.text,current)
        : localTravelDirectedStep(step.text,current,index) && (index!==2 || localTravelDirectedStep(plan.steps[1].text,current,1));
      if (!intent || scene.roomId!==prefix.boundary.roomBefore || !local) {
        const edge=prefix.draft.entries.length;
        progress.settlements.push({index,code:'operation_unavailable',start:edge,end:edge});
        progress.stop={index,kind:'blocked',code:'operation_unavailable'};
        return finish();
      }
    }
    const readiness=action.ordinaryLocalApproachVersion===3;
    if (condition && readiness && (!intent || !readinessEndpoint(prefix.draft,prefix.boundary.roomBefore,plan))) {
      const edge=prefix.draft.entries.length;
      progress.settlements.push({index,code:'operation_unavailable',start:edge,end:edge});
      progress.stop={index,kind:'blocked',code:'operation_unavailable'};
      return finish();
    }
    const personApproach=action.ordinaryLocalApproachVersion===2;
    if (condition && personApproach) {
      const player=createdPlayerId(prefix.draft), perception=playerPerceivedScene(prefix.draft,scene);
      const visible=intent && projectPerceivedIntent(intent,perception.targetIds);
      if (intent?.type!=='conversation' || scene.roomId!==prefix.boundary.roomBefore
        || !sequenceAudience(prefix.draft,player,intent.targetId,scene.roomId)
        || localPersonApproach(action.playerIntentPlan.steps[0].text,perception.scene)?.targetId!==visible?.targetId
        || explicitLocalVocative(step.text,perception.scene,visible?.targetId)?.text!==intent.playerText) {
        const edge=prefix.draft.entries.length;
        progress.settlements.push({index,code:'operation_unavailable',start:edge,end:edge});
        progress.stop={index,kind:'blocked',code:'operation_unavailable'};
        return finish();
      }
    }
    if (condition && action.localConditionalWaitVersion===1) {
      const player=createdPlayerId(prefix.draft), peer=plan.steps[0].intent.targetId;
      const current=playerPerceivedScene(prefix.draft,scene).scene;
      if (!intent || scene.roomId!==prefix.boundary.roomBefore || !sequenceAudience(prefix.draft,player,peer,scene.roomId)
        || !localConditionalWaitStep(step.text,current)) {
        const edge=prefix.draft.entries.length;
        progress.settlements.push({index,code:'operation_unavailable',start:edge,end:edge});
        progress.stop={index,kind:'blocked',code:'operation_unavailable'};
        return finish();
      }
    }
    const addressed = step.intent.type === 'conversation' && typeof step.intent.playerText === 'string';
    if (!personApproach && !searchConversation && (condition && action.ordinaryAddressVersion === 3 && addressed
      ? !intent || intent.speechScope === 'room' && scene.roomId !== prefix.boundary.roomBefore
        || !liveAddressPresent(prefix.draft, scene, step.text, intent, action.roomGroupSpeechVersion)
      : intent && prefix.draft.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION && isParagraphTurnSpeech(step.text, intent)
        && !paragraphTurnRecipientPresent(step.text, intent, scene))) {
      prefix.stopReason = 'quoted_recipient_unavailable';
      if (action.ordinaryAddressVersion === 3) {
        const edge = prefix.draft.entries.length;
        progress.settlements.push({ index, code: 'operation_unavailable', start: edge, end: edge });
      }
      progress.stop = { index, kind: 'blocked', code: 'operation_unavailable' };
      return finish();
    }
    if (!condition || !intent || prefix.draft.entries.length - prefix.rootEntryCount + 6 >= SCENE_BUDGET.maxBlocks) {
      progress.stop = { index, kind: 'blocked', code: !condition ? prefix.interrupted || prefix.stopReason ? 'world_interrupt' : 'condition_false'
        : !intent ? hasSoftRuntime(prefix.draft) && action.intentContractVersion === 2 && step.intent.type === 'case'
          ? 'operation_unavailable' : 'item_unavailable' : 'bounded' }; return finish();
    }
    if (pendingReactionActors(prefix.draft).length) {
      if (!final) return { ...finish(), awaitingReaction: true };
      progress.stop = { index, kind: 'blocked', code: 'world_interrupt' }; return finish();
    }
    const performance = action.playerPerformances?.find(row => row.index === index)?.performance;
    if (!performance) return { ...finish(), next: { index, intent, text: step.text, scene } };
    const start = prefix.draft.entries.length;
    const { playerIntentPlan, playerPerformances, actionOutcome, directorEventDue, omittedNarrationParagraphs, bareReplyRootVersion, cellDoorAttemptVersion, roomGroupSpeechVersion, ordinaryLocalLookOutcomeVersion, ordinaryMoveVisualPreludeVersion, ...single } = action;
    const stepAction = { ...single, jobId: `${action.jobId}:step:${index}`, rawInput: step.text, intent, performance,
      ...(intent.speechScope === 'room' ? { roomGroupSpeechVersion } : {}),
       ...ordinaryLocalVisualActionPins({ordinaryLocalLookOutcomeVersion,ordinaryMoveVisualPreludeVersion},step.text,[{text:step.text,intent}]),
      ...(cellDoorAttemptVersion === 1 && index === 2 ? { cellDoorAttemptVersion: 1 } : {}),
      beats: [], schedulingBeats: [], questionKey: `${action.questionKey}:step:${index}`, answerKey: `${action.answerKey}:step:${index}` };
    delete stepAction.document; delete stepAction.schedulingEnd;
    const settled = settlePlayerBoundary(beginCausalScene(prefix.draft, stepAction, {
      domainStore: domainStore || sceneDomainStores.get(input.draft), domainSourceState: domainSourceState || sceneDomainSources.get(input.draft),
      conversationEventClockVersion: prefix.conversationEventClockVersion }));
    if (action.localConditionalWaitVersion===1 && index===1 && settled.intentSettlement.code==='completed') {
      // Same bounded stop as the existing readiness wait. Elapsed time is
      // never evidence that the other participant packed their belongings.
      const player=createdPlayerId(settled.draft), peer=plan.steps[0].intent.targetId;
      const interrupted=settled.interrupted || settled.stopReason;
      const local=sequenceAudience(settled.draft,player,peer,prefix.boundary.roomBefore);
      Object.assign(settled.intentSettlement,{status:'blocked',code:interrupted?'world_interrupt':local?'bounded':'operation_unavailable'});
    }
    if (readiness && index===2 && settled.intentSettlement.code==='completed') {
      const endpoint=readinessEndpoint(settled.draft,prefix.boundary.roomBefore,plan);
      if (endpoint && !settled.interrupted && !settled.stopReason) {
        // The short wait happened. Companion readiness and a shared next move
        // are not equivalent to this timer, a remark, or door permission.
        const player=createdPlayerId(settled.draft);
        publishStage(settled,[causalEnactment(settled.draft,
          '等了一会儿，眼下还没确认能一起往'+endpoint.focus.reference+'走。', player,
          'readiness:'+stepAction.jobId,{delivery:'action',audienceIds:[player]})], 'readiness:'+stepAction.jobId);
        Object.assign(settled.intentSettlement,{status:'blocked',code:'bounded'});
      } else Object.assign(settled.intentSettlement,{status:'blocked',code:settled.interrupted || settled.stopReason?'world_interrupt':'operation_unavailable'});
    }
    prefix.draft = settled.draft; prefix.interrupted ||= settled.interrupted; prefix.stopReason ||= settled.stopReason;
    progress.settlements.push({ index, ...settled.intentSettlement, start, end: prefix.draft.entries.length }); refreshEvents(prefix);
  }
}

/** Finalize exactly one root action/revision, never one per beat. document may
 * be attached after composition; all other action input must match the replayed
 * root and exact beat journal. The supplied prefix is left untouched. */
export function finalizeCausalScene(input, action, { historicalReplay = false, domainStore = null, domainSourceState = null, recoveredNarrationFrom } = {}) {
  checkPrefix(input); validateAction(action, input.draft);
  const comparable = rootAction(action);
  // Only the sealed recovery entry may promote the display policy after a
  // replay. The old prefix is kept byte-for-byte; all other root fields match.
  if (recoveredNarrationFrom !== undefined) {
    if (recoveredNarrationFrom !== 2 || comparable.narrationPacingVersion !== 3 || input.action.narrationPacingVersion !== 2) fail();
    comparable.narrationPacingVersion = 2;
  }
  if (!isDeepStrictEqual(comparable, input.action) || !isDeepStrictEqual(action.beats, input.beats)) fail();
  // A reaction may still own the unsettled player boundary. The terminal
  // admission record belongs to that exact prefix, before final settlement.
  if (action.schedulingVersion === 1) {
    if (!isDeepStrictEqual(action.schedulingBeats, input.schedulingBeats)) fail();
    validateSceneScheduling(input, action.schedulingEnd, [], { exactDerivation: historicalReplay });
  }
  const tail = preparePlayerIntentTail(input, action, { final: true, domainStore, domainSourceState });
  if (tail.next) fail();
  const prefix = tail.prefix; const { draft } = prefix;
  if (action.softResult) {
    if (prefix.interrupted || prefix.stopReason || pendingReactionActors(draft).length || draft.caseRuntime?.occupiedBody
      || action.playerIntentPlan?.steps.length !== 1 || !action.playerIntentPlan.steps[0].intent.ordinaryAttempt) fail();
    const suffix = action.softResult, event = applyCooperativeRephraseResult(suffix, runtimeRevisionForState(draft).id), manifest = suffix.manifest;
    const stateHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    if (manifest.jobId !== action.jobId || manifest.prefix.stage !== input.beats.length || manifest.prefix.stateHash !== stateHash
      || manifest.learnedAt !== input.draft.worldTime || manifest.occurredAt > manifest.learnedAt) fail();
    const raw = [...input.draft.entries.slice(input.rootEntryCount), ...(input.draft.agentAutonomy?.events || [])];
    const contributions = manifest.sources.filter(source => source.kind === 'contribution');
    for (const source of contributions) {
      const binding = manifest.bindings.find(binding => binding.ref === source.ref);
      for (const cert of binding.certificates.filter(cert => cert.kind === 'prefix-perception')) {
        const entry = raw.find(entry => entry.observationKey === cert.entryKey);
        if (!entry || entry.delivery !== 'speech' || entry.text !== source.text
          || entry.speakerId !== manifest.participants[source.performerHandle === 'p1' ? 0 : 1]
          || createHash('sha256').update(JSON.stringify(entry)).digest('hex') !== cert.entryHash
          || entry.occurredAt !== cert.occurredAt || !isDeepStrictEqual(entry.audienceIds, cert.audienceIds)) fail();
      }
    }
    const heard = acquisitionAudience(draft, manifest.participants[1], { delivery: 'speech' });
    if (manifest.audienceIds.some(id => !heard.includes(id))) fail();
    publishStage(prefix, [event], `${action.jobId}:ordinary-attempt-result`);
  }
  const actionOutcome = tail.steps ? projectActionOutcome({ version: 1, phase: 'committed', steps: tail.steps, ...(tail.stop ? { stop: tail.stop } : {}) }) : undefined;
  if (action.actionOutcome && !isDeepStrictEqual(action.actionOutcome, actionOutcome)) fail();
  commitSceneScheduling(input, draft, action);
  draft.agentActions.push(structuredClone({ ...action, ...(actionOutcome ? { actionOutcome } : {}) })); draft.revision = prefix.rootRevision + 1;
  finalizeGuardEntries(draft, prefix.rootEntryCount);
  if (!Number.isSafeInteger(draft.worldTime)) fail();
  refreshEvents(prefix);
  return { draft, ...(actionOutcome ? { actionOutcome } : {}), events: prefix.events, publicEvents: prefix.events.filter(({ entry }) => entry.delivery !== 'reflection').map(({ id, entry }) => ({ id,
    speaker: entry.speaker, delivery: entry.delivery, text: entry.text })), interrupted: prefix.interrupted };
}

/** Deterministic replay facade for agent-play's sceneBeatVersion:1 dispatch. */
export function sceneBeatsDraft(state, action, { customAct = null, swapAct = null } = {}) {
  const deliveredMagicOffer = sceneDeliveredMagicOffers.get(state) || null;
  const stageClocks = sceneStageClocks.get(state);
  const stageClock = stage => stageClocks?.[stage];
  // The prepared swap flag must survive the whole replay, not just the root:
  // a sealed NPC voluntary cast inside the same establish/restore act settles
  // against the prepared after-state too.
  const preparedSwap = preparedSwapForNpcMenu(swapAct);
  let prefix = beginCausalScene(state, action, { customAct, swapAct,
    ...(deliveredMagicOffer ? { deliveredMagicOffer } : {}),
    conversationEventClockVersion: stageClock(0) });
  if (prefix.phase !== 'reaction') prefix = settlePlayerBoundary(prefix);
  const intentOptions = { domainStore: sceneDomainStores.get(state), domainSourceState: sceneDomainSources.get(state) || state };
  if ([1, 2].includes(action.intentContractVersion)) { const tail = preparePlayerIntentTail(prefix, action, intentOptions); if (tail.next) fail(); prefix = tail.prefix; }
  for (const beat of action.beats) {
    prefix = applyCausalNpcBeat(prefix, beat, action.schedulingBeats?.[beat.beat - 1], { historicalReplay: true,
      preparedSwap, conversationEventClockVersion: stageClock(beat.beat) });
    if (beat.phase === 'reaction' && prefix.phase !== 'reaction') prefix = settlePlayerBoundary(prefix);
    if ([1, 2].includes(action.intentContractVersion)) { const tail = preparePlayerIntentTail(prefix, action, intentOptions); if (tail.next) fail(); prefix = tail.prefix; }
  }
  return finalizeCausalScene(prefix, action, { historicalReplay: true, ...intentOptions });
}
