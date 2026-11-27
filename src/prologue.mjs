import { ADMISSION_RUNTIME_REVISION, ORDINARY_ADMISSION32, hostOrdinaryTailMs, novelCompositionReserveMs, optionalOrdinaryWaveFits } from './agents/ordinary-admission32.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION, usesOrdinaryAdmission32 } from './director/director-event-runtime.mjs';
import { PUBLICATION_RUNTIME_REVISION } from './scenes/ordinary-publication31.mjs';
import { ordinaryCapacityForRevision } from './content/ordinary-capacity30.mjs';
import { CAPACITY_RUNTIME_REVISION } from './content/ordinary-capacity30.mjs';
import { KNOWN_TARGET_RUNTIME_REVISION } from './content/relationship-context-policy.mjs';
import { TRUSTED_COMMUNICATION_RUNTIME_REVISION } from './content/relationship-context-policy.mjs';
import {SOURCE_ACQUISITION_RUNTIME_REVISION} from './content/relationship-context-policy.mjs';
import {SCREEN_BROADCAST_RUNTIME_REVISION} from './content/relationship-context-policy.mjs';
import { SOFT_EXECUTION_BUDGET, SOFT_SLOT, SOFT_PURPOSE, captureCooperativeRephrase, applyCooperativeRephraseResult } from './agents/cooperative-rephrase.mjs';
import { SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, hasSoftRuntime, hasSemanticOrdinaryRuntime, hasIntentAdmissionRuntime } from './content/relationship-context-policy.mjs';
import { initialNarrativeBoundaryConflict } from './agents/narrative-boundaries.mjs';
import { INTENT_ADMISSION_PURPOSE, projectIntentAdmissionPlan } from './agents/intent-admission-contract.mjs';
import { authoredMagicContext } from './agents/authored-magic-intent.mjs';
import { validAuthoredMagicChoice } from './world/magic/roleplay-magic.mjs';
import { INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, hasIntentRuntime } from './content/relationship-context-policy.mjs';
import { projectActionOutcome } from './world/action-outcome.mjs';
import { preparePlayerIntentTail } from './scenes/scene-beats.mjs';
import { causalPlayerScene, resolvePlayerPlanStep, cellDoorAttemptActionPin, roomGroupSpeechAudience } from './scenes/causal-scene.mjs';
import { bareReplyRootActionPin, proveReadinessHostIntent } from './agents/communication-selection30.mjs';
import { ordinaryReplyContext, localPointReplySequenceDomain, samePeerGazeSequenceDomain, localStairReplySequenceDomain, roomGroupSpeechSource, dialogueSequencePerformance, dialogueSequenceActionPin, localAmbientSpeechDomain, ordinaryLocalAmbientSpeechSource, recentLocalWaitProposal, recentOpenWaitQuestion, localSearchConversationDomain, ordinaryLocalSearchSource, ordinaryLocalVisualPlanPins, ordinaryLocalVisualActionPins, localApproachDomain, observedOrientationSequenceDomain, ordinaryDialogueSequence, ordinaryLocalApproachSource } from './agents/player-address-resolution.mjs';
import { DatabaseSync } from 'node:sqlite';
import { RELATIONSHIP_RUNTIME_REVISION, RELATIONSHIP_CONTEXT_BUDGETS, isRelationshipRuntime, relationshipContextPin } from './content/relationship-context-policy.mjs';
import { runtimeCapabilityId, RP_FOUNDATION_RUNTIME_REVISION } from './content/runtime-capabilities.mjs';
import { assertFoundationCreation, assertInitialRunPolicy, assertInitialBoundaryTransition, initialMechanismDecision, initialPublicBoundaryConflict, requiresInitialBoundaryReview, validateInitialBoundaryAssessments, initialBoundaryHasUnreviewedCaseChange } from './content/initial-run-policy.mjs';
import { appendFileSync } from 'node:fs';
import { CustomAbilityStore } from './world/magic/custom-ability-store.mjs';
import { customAbilityData, customAbilityExact } from './world/magic/custom-ability-contracts.mjs';
import { CUSTOM_ABILITY_EXECUTABLE_COMPILER_REF } from './world/magic/custom-ability-compiler.mjs';
import { CUSTOM_ABILITY_MECHANISMS } from './world/magic/custom-ability-runtime.mjs';
import { newSceneJobExtensions, sceneExtensionPin, sceneEventTimeline, narrationParagraphActionPin, novelFirstPresentation, novelNarrationFocusTaskPin, focusedNarratorPreference, ordinaryRoundProseMode } from './scenes/scene-event-policy.mjs';
import { PUBLIC_ASSEMBLY_CATEGORY, captureEffectiveDirectorEventPin, isSealedDirectorExtension, isPrivateDirectorPacket, DIRECTOR_PLANNING_EXTENSION, DIRECTOR_LIFECYCLE_EXTENSION, isDirectorExtension, DIRECTOR_BLUEPRINT_DESCRIPTIONS, DIRECTOR_PRINCIPAL, buildDirectorContext, validateDirectorOutput, directorBoundary, directorOpportunities, directorSnapshotHash } from './director/director-effective-private-contract.mjs';
import { DirectorCandidateStore, DirectorPlanningStore, directorPlanningInterest, candidateStatus, directorCandidateView } from './director/director-policy.mjs';
import { directorEventMayReviewIntent } from './director/director-event-source.mjs';
import { directorAssemblyKey } from './director/director-event-lifecycle.mjs';
import { activeRunPolicyCase, currentRunPolicyPending, effectiveRunPolicyValues, runPolicyCommitState } from './world/run-policy-authority.mjs';
import { PRIVATE_SUPPLY_CHANNEL, isPrivateSupplyObservationId } from './cognition/private-supply-observation.mjs';
import { hiddenSupplyAdmits, hiddenSupplyIntent, hiddenSupplyRootEligible, isHiddenSupplyMode } from './world/hidden-supply.mjs';
import { decideRunPolicyChange, normalizeRunPolicyRequest, runPolicyPublicView, runPolicyRequestFingerprint } from './content/run-policy-contract.mjs';
import { adjudicationPolicy, effectiveAdjudicationData, assertEffectiveBoundaryTransition, effectiveBoundaryDecision, withRunBoundary } from './content/effective-run-boundary.mjs';
import { isKnowledgeGated, knownIdentityIds, ownerWitchBookProfile, recognizesPerson } from './characters/actor-knowledge.mjs';
import { PROFILE_SUMMARY_VERSION } from './presentation/profile-summary.mjs';
import { policyForActor } from './agents/actor-performance-policy.mjs';
import { randomUUID, createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { isProxy } from 'node:util/types';
import { bgmForScene } from './presentation/bgm.mjs';
import { PlayerDeliveryOutbox } from './presentation/player-delivery.mjs';
import { assemblePlayerQueryView, composeDeliveredPlayerView } from './presentation/player-view.mjs';
import { CharacterAvatars, isAvatarId, avatarUrl } from './characters/character-avatars.mjs';
import { DomainStore, DURABLE_EXECUTION_REF, withVerifiedDomainCommitBytes } from './world/domain-store.mjs';
import { DiceStore } from './world/dice-store.mjs';
import { DICE_RULES, diceAbilities, diceCharacter, validateDiceRollInput, diceFailure } from './world/dice-core.mjs';
import { REACTION_RULES } from './world/dice-reaction.mjs';
import { GUARD_RULES, GUARD_FINGERPRINT } from './world/guard-rules.mjs';
import { guardEnabled, guardView, guardOpportunity, guardDiceNarrationVersion, localDetentionAction } from './world/guard-reaction.mjs';
import { ABILITY_FINGERPRINT, abilityRuleReference, approvedSpatialCreation } from './world/magic/ability-definitions.mjs';
import { approvedSpatialActivation, MagicRepository, settleOwnedSelfFloat } from './world/magic/ability-runtime.mjs';
import { assertApprovedBodyFactorPolicy } from './world/magic/magic-binding-policy.mjs';
import { abilityDigest, magicJson, magicId, magicDefinition } from './world/magic/ability-definitions.mjs';
import { initializeHostMagic, refreshHostMagic, hostMagicCapabilities, executeHostMagic, executeHostDurableMemoryAcquisition, hostStoryFacts, hostRootStoryFacts, buildHostStoryRequest, HOST_MAGIC_REF, matchPlayerMagicSentence, attachNpcMagicProjection, ownedSelfFloatEnd, playerTextMagicOffer } from './world/magic/magic-host.mjs';
import { parseTestimonyCommand, trialTestimonyDisplayText } from './cases/trial-testimony.mjs';
import { STATEMENT_REACTION_INSTRUCTIONS, compactStatementReaction } from './cases/statement-reactions.mjs';
import { assembleRagContext, assembleDecisionContext } from './cognition/rag-context.mjs';
import { assemblePlayerTaskRecall, assembleNpcDecisionTaskPayload, finalizeActorTaskPacket, playerPerformanceTaskData, npcDecisionTaskInput, npcMagicPersonaPacketBoundaries, firstOfferReliabilityGuidance } from './agents/actor-task-packets.mjs';
import { actorPerception, actorRoom, actorHandle, actorTarget, recognizedActors, observableRecallQuery, readableMaterials, materialReadableProjection, currentPhysicalScene, playerPerceivedScene, projectPerceivedIntent, resolvePerceivedIntent, acquisitionAudience } from './characters/actor-perception.mjs';
import { projectDeveloperActors } from './host/developer-view.mjs';
import { enableAutonomy, selectDecisionActors, decisionActorInput, decisionSnapshotObservations, pendingReactionActors, pendingSocialRequests, projectSocialRequests } from './agents/agent-autonomy.mjs';
import { DecisionStateStore, initialDecisionState, reviewDecisionState, reviewSceneDecisionState, deriveSituationalGoalTemplates } from './cognition/decision-state.mjs';
import { assertPlayerPerformance, assertActorPerformance, assertSceneProse, narrativeGuardDiagnostic, resolvedSceneFacts } from './agents/narrative-guards.mjs';
const PROTOTYPE_NOTICE = "";
const initialPrototypeState = unsupportedLegacy;
const parsePrototypeIntent = unsupportedLegacy;
const advancePrototype = unsupportedLegacy;
const validatePrototypeState = unsupportedLegacy;
const prototypeSuggestions = unsupportedLegacy;
const prototypeView = unsupportedLegacy;
const prototypeActorInput = unsupportedLegacy;
const prototypeStoryEntries = unsupportedLegacy;
const CUSTOM_PLAYER = null;
const CUSTOM_NOTICE = "";
const CUSTOM_SOURCE_HASH = "";
const customSuggestions = unsupportedLegacy;
const initialCustomState = unsupportedLegacy;
const advanceCustom = unsupportedLegacy;
const customPresentation = unsupportedLegacy;
const validateCustomState = unsupportedLegacy;
function unsupportedLegacy() { throw Object.assign(new Error("发行版仅支持正式 LLM 游戏。"), { code: "INVALID_EXAMPLE" }); }
import { AGENT_SCENARIO_NOTICE, agentProfile, publicAgentProfile, CUSTOM_PRISONER_NUMBER } from './content/agent-scenario.mjs';
import { conciseProfileConcept } from './agents/story-language.mjs';
import { initialAgentState, supportsAuthoredMagicRoot, validateAgentState, validateAgentStateEnvelope, parseAgentIntent, parseLegacyAgentIntent, applyAgentAction, canCaptureRootCaseOptions, takeNpcMagicPublication, setCustomActPreparation, takeCustomActPreparation, setSwapActPreparation, takeSwapActPreparation, agentActorInput, agentLocalActors, agentPlayView, agentScene, narrativeResolution, sceneActionDraft, AGENT_BROADCAST_TEXT, agentLocationLabel, agentStoryEntries } from './agent-play.mjs';
import { AgentTurnStore } from './agents/agent-turn-store.mjs';
import { traceTask, traceFailure } from './agents/turn-trace.mjs';
import { projectScenePresentation, projectOwnerSceneDisplay } from './presentation/scene-presentation.mjs';
import { playerExchangeForAction, playerViewEntryProse } from './presentation/player-view-prose.mjs';
import { projectExecutionEntries } from './cases/execution-scene.mjs';
import { projectDailyHistory } from './presentation/daily-history.mjs';
import { PlayerPresets } from './creation/player-presets.mjs';
import { normalizeCreation, normalizeNewGameCreation, attributeModifier } from '../public/player-creation-rules.mjs';
import { CREATED_NOTICE, isCreatedCustom, createdPlayerId, actorForState, actorsForState, usesRelationshipSetup, relationshipSetupForState, withExactRelationshipProjection, ownStartingKnowledge, ROOM_CODES } from './creation/player-setup.mjs';
import { buildRoleplayContext, buildCharacterDataContext, validateRoleplayDecision, validateCharacterDataProposal, validateNpcHostTextEnvelope } from './agents/agent-boundaries.mjs';
import { buildNarrativeContext, validateNarrativeOutput } from './agents/narrative-boundaries.mjs';
import { proveLocalTravelAttempt, proveLocalConditionalWait } from './scenes/scene-beats.mjs';
import { localTravelAttemptSource, localConditionalWaitSource } from './agents/player-address-resolution.mjs';
import { currentPrivateReflection, hostPrivateReflectionAction, supportsOpenPlayerAction } from './agents/open-player-action.mjs';
import { canCapturePrivateReflection } from './agent-play.mjs';
import { buildServiceTaskContext, validateServiceTaskOutput, WORLD_SERVICE_PRINCIPAL, INITIAL_BOUNDARY_REVIEW_SLOT, initialBoundaryReviewProposal } from './agents/service-task-contract.mjs';
import { AgentPrompts } from './agents/agent-prompts.mjs';
import { dialogueContextPin } from './cognition/dialogue-context-policy.mjs';
import { modelSystemPolicySeal } from './agents/model-gateway.mjs';
import { roleplayGuidance, playerPerformanceGuidance } from './agents/persona-guidance.mjs';
import { SCENE_BUDGET, scenePalette, sceneAuthorizedPalette, sceneSummary, sceneNeedsRepair, sceneStyleFeedback, projectQualifiedSceneDocument, NOVEL_MIN_PARAGRAPH_HAN,
  hostSceneDocument, mergeHostSceneEvents, sceneNarrationParagraphs, sceneParagraphFeedback, sceneRoundFeedback, NOVEL_MIN_ROUND_HAN } from './scenes/scene-document.mjs';
import { CARD_ASSEMBLY_TEXT } from './content/card-world.mjs';
import { hasCaseOne, CASE_ONE_NOTICE, caseBallotInput, caseObservedCondition, caseStatementReaction, caseTestimony } from './cases/case-one.mjs';
import { enableCaseRuntime, hasCaseRuntime, runtimeObservedCondition, runtimeApplyItemPolicy, activateCaseItemPolicy, runtimeItemProjection, runtimePoseActions, validatePoseIntent, occupiedBodyWorld, runtimePhysicalActor, runtimeBodyActorId, runtimeActive, runtimeRoom, withMagicProjection } from './case-runtime.mjs';
import { caseItemPolicyPin, caseItemPolicyV2Reference, isCaseItemPolicyV2Reference, CASE_ITEM_POLICY_V2_HASH } from './cases/case-item-policy.mjs';
import { activeProcedure, procedureVoterIds, procedureBallotInput, procedureStatementReaction, procedureTestimony, executionLifeAction, hostCaseChoicePlan } from './cases/case-procedure.mjs';

import { ordinaryLocalPointReplyContext, ordinaryLocalStairReplyContext, beginCausalScene, settlePlayerBoundary, applyCausalNpcBeat, finalizeCausalScene, npcMagicMenu, preparedSwapForNpcMenu, setSceneDomainStore, setSceneDeliveredMagicOffer, setSceneStageClocks } from './scenes/scene-beats.mjs';
import { captureSceneScheduling, validateSceneScheduling } from './scenes/scene-scheduling.mjs';
import { actorObservationId } from './characters/observation-identity.mjs';
import { DEFAULT_RUNTIME_REVISION, runtimeRevisionById, runtimeRevisionForState, assertRuntimeJobRevision } from './content/content-revisions.mjs';
import { CURRENT_BUNK_SUPPLEMENT_ID } from './world/prison-bunks.mjs';

const STATE_FORMAT_VERSION = 1;
const V0_SRC_TIMING_LOG = process.env.V0_SRC_TIMING_LOG;
const v0Timing = (label, startedAt) => {
  if (V0_SRC_TIMING_LOG) appendFileSync(V0_SRC_TIMING_LOG, `${Date.now()} ${label} ${(performance.now() - startedAt).toFixed(1)}ms\n`);
};
const GUARD_ACTIVATION_TEXT = '启用看守抓捕检定规则';
const ABILITY_ACTIVATION_TEXT = '确认启用意念穿梭规则';
const CASE_ITEM_ACTIVATION_TEXT = '确认启用监牢日用品规则';
const guardActivation = action => ['guard_rules_activate', 'guard_magic_rules_activate', 'case_item_policy_activate'].includes(action?.type);
const GUARD_RESOLUTION_TEXT = '结算看守抓捕检定';
const GUARD_WAIT_TEXT = '等待禁闭结束';
const GUARD_RELEASE_TEXT = '接受看守移送';
const guardHostCaption = action => action?.type === 'case_item_policy_activate' ? CASE_ITEM_ACTIVATION_TEXT
  : action?.type === 'guard_rules_activate' ? GUARD_ACTIVATION_TEXT
  : action?.type === 'guard_magic_rules_activate' ? ABILITY_ACTIVATION_TEXT
  : action?.type === 'guard_dice_resolution' ? GUARD_RESOLUTION_TEXT
    : action?.type === 'guard_detention_wait' ? GUARD_WAIT_TEXT : action?.type === 'guard_release' ? GUARD_RELEASE_TEXT
      : action?.type === 'guard_detention_local' && [1, 2, 3].includes(action.version) ? action.rawInput : undefined;
const guardRulePin = state => guardEnabled(state) ? { guardRules: { ref: GUARD_RULES.ref, fingerprint: GUARD_FINGERPRINT } } : {};
const guardSuggestions = state => {
  const view = guardView(state);
  if (view.pending) return [];
  if (view.detention) {
    if (view.detention.status === 'detained') return view.detention.remainingSeconds === 0
      || view.detention.caseBoundaryAt === state.worldTime ? [GUARD_RELEASE_TEXT] : [GUARD_WAIT_TEXT];
    if (view.detention.status === 'suspended' && !hasCaseOne(state)
      && [undefined, null, 'daily', 'aftermath'].includes(activeProcedure(state)?.stage)) return [GUARD_WAIT_TEXT];
  }
  return undefined;
};

const PEOPLE = [agentProfile("emma")];
const NOTICE = "";
const OPTIONS = {};
function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
/** Host-only receipt projection. Public/private transcript buckets are not the
 * enactment order. Preserve the actual conversation journal order, including
 * equal-clock causality; leave non-conversation event positions untouched. */
export function sceneConversationReceiptEvents(publicEvents, privateEvents, conversation) {
  const events = [...publicEvents, ...privateEvents];
  const eligible = event => ['speech', 'writing'].includes(event.delivery)
    && event.observationKey !== undefined && event.speakerId !== undefined;
  const order = new Map((conversation?.journal?.entries ?? []).map((entry, index) => [entry.id, index]));
  const delivered = events.filter(eligible);
  if (delivered.some(event => !order.has(event.observationKey)))
    fail('INVALID_AGENT_JOB', '场景沟通事件不属于实际封存前缀。');
  delivered.sort((left, right) => order.get(left.observationKey) - order.get(right.observationKey));
  let index = 0;
  return events.map(event => eligible(event) ? delivered[index++] : event);
}
function entry(state, speaker, text) {
  state.entries.push({ id: `entry-${state.entries.length + 1}`, speaker, text });
}
const initialState = unsupportedLegacy;
const advance = unsupportedLegacy;
const legacyStoryEntries = unsupportedLegacy;
function parseState(json) {
  try { return JSON.parse(json); }
  catch { fail('INVALID_STATE', '存档数据损坏，未修改当前进度。'); }
}
// Later ordinary anchors feed only clock, location, visible identities, roster
// and music into the public history. The opening and any case/testimony anchor
// continue to consume the full snapshot. This is a read-only SQL projection,
// not another state source or a cache: every selected field comes from the
// exact before_state row in the current read transaction.
const publicOrdinaryAnchorFields = ['exampleId','phase','worldTime','location','known','creation',
  'agentWorld','agentRuntimeRevision','agentScenarioHash','agentFormatVersion','settingSupplement','completed'];
const publicOrdinaryAnchorSQL = `SELECT CASE WHEN json_valid(before_state) THEN CASE WHEN
  before_state ->> '$.exampleId' = 'agent' AND before_state ->> '$.agentRuntimeRevision' = ?
  AND before_state ->> '$.creation.playPolicy.cases' = 'excluded'
  AND before_state ->> '$.creation.playerMode' = 'original'
  AND before_state ->> '$.creation.scenarioId' IS NULL AND before_state ->> '$.creation.storyArcId' IS NULL
  AND before_state ->> '$.caseOne' IS NULL AND before_state ->> '$.storyArc' IS NULL
  AND before_state ->> '$.caseRuntime.procedure' IS NULL AND before_state ->> '$.caseRuntime.occupiedBody' IS NULL
  AND before_state ->> '$.customAbilitySetup' IS NULL
  THEN json_object(${publicOrdinaryAnchorFields.map(key => `'${key}', before_state -> '$.${key}'`).join(', ')})
  END END snapshot FROM prologue_turns WHERE id=?`;
function projectPublicAgentStatus(state, jobs) {
  const row = jobs.active(state.generation);
  if (!row || row.base_revision !== state.revision) return { generation: state.generation, revision: state.revision, status: 'idle', activities: [] };
  const tasks = jobs.statusActivities(row);
  let nearby;
  const labels = { director: '导演规划', intent_parser: '意图解析', world_adjudicator: '行动准入服务', player_performance: '玩家演绎', narrator: '场景与旁白', scene_composer: '场景编排', character_data: '角色数据' };
  const operations = { director: '检查可选场景机会', intent_parser: '理解自然行动与条件', world_adjudicator: '按封存场景识别受限行动意图', player_performance: '按人设表现你的选择', roleplay: '作出回应与自主决定', narrator: '描写所见与行动结果', scene_composer: '把已裁决动作与对白编排成完整场景', character_data: '整理本次交流记忆' };
  return { generation: state.generation, revision: state.revision, status: row.status === 'failed' ? 'failed' : row.status === 'pending' ? 'pending' : 'running',
    activities: tasks.map(task => ({ id: task.id, role: task.role,
      label: labels[task.role] || (nearby ??= agentScene(state).nearby).find(actor => actor.id === task.actorId)?.label || '角色回应',
      operation: operations[task.role], status: task.completed ? 'completed' : row.status === 'failed' ? 'failed' : 'running' })) };
}
function assertPublicAgentProgressOptions(options) {
  if (!options || typeof options !== 'object' || isProxy(options)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
    || Reflect.ownKeys(options).some(key => !['after', 'generation', 'jobRef'].includes(key)
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(options, key), 'value'))) fail('INVALID_AGENT_PROGRESS', '进度游标格式无效。');
}

// Host-owned query-only connection for the current ordinary runtime. It does
// not initialize, repair, update, acquire a lease or touch the delivery outbox.
// The projectors are exactly those used by the Engine; a historical/foreign
// runtime is explicitly unsupported so its original Engine path is preserved.
export function openLocalAgentObserver(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try { db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=500'); }
  catch (error) { db.close(); throw error; }
  const domain = new DomainStore(db), jobs = new AgentTurnStore(db);
  const read = work => {
    db.exec('BEGIN');
    try {
      const state = parseState(db.prepare('SELECT state FROM prologue_head WHERE id=1').get().state);
      if (state.caseRuntime?.occupiedBody) domain.assertOccupiedBodyWorld(state);
      const result = state.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION ? work(state) : null;
      db.exec('COMMIT'); return result;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  return Object.freeze({
    status: () => read(state => projectPublicAgentStatus(state, jobs)),
    progress: (options = {}) => {
      assertPublicAgentProgressOptions(options);
      return read(state => jobs.publicProgress(state, domain.scope(state), options));
    },
    close: () => db.close(),
  });
}

function gameplayState(state) {
  // Avatar choice is presentation metadata, not a fact in an action's story replay.
  const { generation, revision, turnIds, stateFormatVersion, restoredFrom, playerAvatarId, ...gameplay } = state;
  // Agent replay must compare every non-envelope field, including unexpected
  // custom-only metadata; otherwise transition equality could hide extra data.
  if (state.exampleId !== 'agent') { delete gameplay.customFormatVersion; delete gameplay.customSourceHash; }
  gameplay.exampleId = state.exampleId || 'emma';
  if (gameplay.exampleId === 'custom') gameplay.entries = customPresentation(state).entries;
  return gameplay;
}
function validateStateEnvelope(state) {
  if (state?.exampleId !== 'agent') unsupportedLegacy();
  if (!state || typeof state !== 'object' || Array.isArray(state)) fail('INVALID_STATE', '存档状态格式无效。');
  if (state.stateFormatVersion !== undefined && state.stateFormatVersion !== STATE_FORMAT_VERSION) fail('UNSUPPORTED_STATE_VERSION', '此存档版本不受支持，未修改当前进度。');
  const valid = Number.isSafeInteger(state.generation) && state.generation > 0
    && Number.isSafeInteger(state.revision) && state.revision >= 0
    && Number.isSafeInteger(state.worldTime) && state.worldTime >= 0
    && Array.isArray(state.entries) && state.entries.length > 0
    && state.entries.every((entry, index) => entry && entry.id === `entry-${index + 1}` && typeof entry.speaker === 'string' && typeof entry.text === 'string')
    && Array.isArray(state.known) && state.known.every(id => typeof id === 'string') && new Set(state.known).size === state.known.length
    && Array.isArray(state.turnIds) && state.turnIds.every(id => typeof id === 'string' && id.length > 0 && id.length <= 128)
    && new Set(state.turnIds).size === state.turnIds.length && state.revision >= state.turnIds.length;
  if (!valid) fail('INVALID_STATE', '存档状态或行动路径不完整，未修改当前进度。');
  if (state.playerAvatarId !== undefined && ((state.exampleId !== 'custom' && !isCreatedCustom(state)) || !isAvatarId(state.playerAvatarId))) fail('INVALID_AVATAR', '存档头像引用无效，未修改当前进度。');
}
function validateState(state) {
  validateStateEnvelope(state);
  if (state.exampleId === 'custom') {
    if ((state.stateFormatVersion !== undefined || state.customSourceHash !== undefined) && state.customSourceHash !== CUSTOM_SOURCE_HASH) fail('SOURCE_VERSION_MISMATCH', '此存档的对白来源版本不一致，未修改当前进度。');
    validateCustomState(state);
    if (state.turnIds.length !== state.customStage) fail('INVALID_STATE', '存档场景与行动路径不一致。');
    return;
  }
  if (state.exampleId === 'prototype') {
    validatePrototypeState(state);
    return;
  }
  if (state.exampleId === 'agent') { validateAgentState(state); return; }
  if (state.exampleId !== undefined && state.exampleId !== 'emma') fail('INVALID_STATE', '存档使用了未知剧情示例。');
  const expected = initialState();
  for (let i = 0; i < state.turnIds.length && !expected.completed; i++) {
    advance(expected, state.fixtureBranch && expected.phase === 'hiro_warning' ? '劝阻希罗' : '继续');
  }
  const fields = ['phase', 'worldTime', 'location', 'known', 'introduced', 'entries', 'completed', 'hiroStatus', 'fixtureBranch'];
  if (state.turnIds.length > 17 || fields.some(field => !isDeepStrictEqual(state[field], expected[field]))) fail('INVALID_STATE', '存档剧情阶段、位置或已送达内容不一致。');
}
function requestVersion({ expectedGeneration, expectedRevision }, { required = true } = {}) {
  if ((required || expectedGeneration !== undefined) && (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 1)) fail('INVALID_GENERATION', '执行世代须为正整数。');
  if ((required || expectedRevision !== undefined) && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) fail('INVALID_REVISION', '状态版本须为非负整数。');
}
function saveOptions(options) {
  if (!options || typeof options !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(options))) fail('INVALID_SAVE_OPTIONS', '存档选项须为对象。');
  return options;
}
function validateSaveId(saveId) {
  if (typeof saveId !== 'string' || !saveId.trim()) fail('INVALID_SAVE', '请提供有效存档标识。');
}
function validateSaveVersion(version) {
  if (!Number.isSafeInteger(version) || version < 1) fail('INVALID_SAVE_VERSION', '存档版本须为正整数，请刷新存档列表。');
}
function saveMetadata(row) {
  const metadata = { exampleId: null, location: null, phase: null, worldTime: null, generation: null, revision: null, turnCount: null };
  let snapshot;
  try { snapshot = JSON.parse(row.state); } catch { /* A damaged inactive slot can still be listed and deleted. */ }
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    if (snapshot.exampleId === undefined || snapshot.exampleId === 'emma') metadata.exampleId = 'emma';
    else if (['custom', 'prototype', 'agent'].includes(snapshot.exampleId)) metadata.exampleId = snapshot.exampleId;
    for (const field of ['location', 'phase']) if (typeof snapshot[field] === 'string') metadata[field] = snapshot[field];
    if (snapshot.exampleId === 'agent') metadata.location = agentLocationLabel(metadata.location);
    for (const field of ['worldTime', 'revision']) if (Number.isSafeInteger(snapshot[field]) && snapshot[field] >= 0) metadata[field] = snapshot[field];
    if (Number.isSafeInteger(snapshot.generation) && snapshot.generation > 0) metadata.generation = snapshot.generation;
    if (Array.isArray(snapshot.turnIds) && snapshot.turnIds.every(id => typeof id === 'string')) metadata.turnCount = snapshot.turnIds.length;
  }
  return { id: row.id, name: row.name, version: row.version, ...metadata };
}

export class PrologueEngine {
  #db;
  #closed = false;
  #preparations = new WeakMap();
  #delivery;
  #avatars;
  #domain;
  #decisions;
  #agentJobs;
  #presets;
  #prompts;
  #domainReady = false;
  #newRunRevision;
  #dice;
  #guardRulesByDefault;
  #caseRulesByDefault;
  #getDirectorMode;
  #directorVersion;
  #materialProseVersion;
  #ballotInstrumentVersion;
  #physicalFactsVersion;
  #postureActionVersion;
  #occupiedBodyVersion;
  #executionLifeVersion;
  #swapLifecycleVersion;
  #directorCandidates;
  #directorPlanning;
  #magicRepository;
  #magicPolicy;
  #customCompiler;
  #customCatalog;
  #customProfile;
  #customEnabled = false;
  #customGuarded = false;
  #journalTrust = null;
  #journalPending = null;
  #saveCardReads = new Map();
  #httpOrdinaryAnchorMemo;
  #historyTrust = null;
  #memoryTrust = null;
  #trustDataVersion;
  #sceneReplayCache = null;
  #ordinaryTerminalReplay = null;
  #creationRuntimeRevisions = Object.freeze({});
  #v2CustomAbility;
  #hiddenSupply = false;
  #getHiddenSupplyMode;
  #npcManualRecovery = 0;
  #npcActPreflight = 0;
  #visualPerformanceGuidance = 0;
  #privateDirectorTail = false;
  #privateUnissuedAsk = false;
  constructor(dbPath = ':memory:', options = {}) {
    if (!options || typeof options !== 'object' || isProxy(options)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
      || Reflect.ownKeys(options).some(key => !Object.hasOwn(Object.getOwnPropertyDescriptor(options, key), 'value')))
      fail('INVALID_AGENT_JOB', '宿主构造选项无效。');
    const selected = Object.getOwnPropertyDescriptor(options, 'directorVersion');
    const directorVersion = selected ? selected.value : 2;
    if (directorVersion !== 2 && directorVersion !== 3) fail('INVALID_AGENT_JOB', '导演版本必须为 2 或 3。');
    const { deliveryClock = Date.now, initialExampleId = 'agent', agentClock = Date.now,
      runtimeRevisionId = DEFAULT_RUNTIME_REVISION, guardRulesByDefault = false, caseRulesByDefault = false,
      magicBindingPolicy, getDirectorMode = () => 'off' } = options;
    this.#directorVersion = directorVersion;
    const requestedCustomProfile = options.customAbilityProfile;
    if (requestedCustomProfile !== undefined && !['ordinary-unguarded@1', 'ordinary-guarded@1'].includes(requestedCustomProfile)) fail('INVALID_AGENT_JOB','自定义能力配置未支持。');
    if (requestedCustomProfile === 'ordinary-guarded@1' && guardRulesByDefault !== true) fail('INVALID_AGENT_JOB','普通看守自定义能力必须启用看守规则。');
    if (options.customAbilityCompiler !== undefined && typeof options.customAbilityCompiler !== 'function') fail('INVALID_AGENT_JOB','能力编译器无效。');
    this.#customProfile = requestedCustomProfile;
    this.#customEnabled = requestedCustomProfile !== undefined;
    this.#customGuarded = requestedCustomProfile === 'ordinary-guarded@1';
    this.#customCompiler = options.customAbilityCompiler;
    if (Object.hasOwn(options, 'v2CustomAbility')) {
      if (options.v2CustomAbility !== EVENT_DIRECTOR_RUNTIME_REVISION || !this.#customGuarded || guardRulesByDefault !== true)
        fail('INVALID_AGENT_JOB', '自定义能力策略修订仅支持宿主显式选择正式看守配置。');
      this.#v2CustomAbility = options.v2CustomAbility;
    }
    for (const key of ['materialProseVersion', 'physicalFactsVersion']) {
      const descriptor = Object.getOwnPropertyDescriptor(options, key);
      if (descriptor && ![1, 2].includes(descriptor.value)) fail('INVALID_AGENT_JOB', '物质与物理投影版本必须为 1 或 2。');
    }
    if (Object.hasOwn(options, 'ballotInstrumentVersion') && options.ballotInstrumentVersion !== 1) fail('INVALID_AGENT_JOB', '投票器具扩展仅支持显式版本1。');
    this.#ballotInstrumentVersion = options.ballotInstrumentVersion;
    this.#materialProseVersion = Object.hasOwn(options, 'materialProseVersion') ? options.materialProseVersion : 1;
    this.#physicalFactsVersion = Object.hasOwn(options, 'physicalFactsVersion') ? options.physicalFactsVersion : 1;
    if (Object.hasOwn(options, 'postureActionVersion') && options.postureActionVersion !== 1)
      fail('INVALID_AGENT_JOB', '姿势行动仅支持显式版本 1；省略保留旧契约。');
    this.#postureActionVersion = options.postureActionVersion;
    if (Object.hasOwn(options, 'occupiedBodyVersion') && options.occupiedBodyVersion !== 1)
      fail('INVALID_AGENT_JOB', '身体消费仅支持显式版本 1。');
    this.#occupiedBodyVersion = options.occupiedBodyVersion;
    if (Object.hasOwn(options, 'executionLifeVersion') && options.executionLifeVersion !== 1) fail('INVALID_AGENT_JOB', '执行生命版本无效。');
    this.#executionLifeVersion = options.executionLifeVersion;
    if (Object.hasOwn(options, 'swapLifecycleVersion') && (options.swapLifecycleVersion !== 1 || options.occupiedBodyVersion !== 1)) fail('INVALID_AGENT_JOB', '互换生命周期需要显式身体版本。');
    this.#swapLifecycleVersion = options.swapLifecycleVersion;
    if (typeof getDirectorMode !== 'function') fail('INVALID_AGENT_JOB', '导演模式读取器无效。');
    if (magicBindingPolicy !== undefined) {
      const policy = magicJson(magicBindingPolicy);
      if (policy.version === 2) assertApprovedBodyFactorPolicy(policy);
      else if (policy.version !== 1 || !magicId(policy.ref) || !magicId(policy.approvedBy) || !policy.bindings
        || Object.keys(policy).some(key => !['version', 'ref', 'approvedBy', 'bindings'].includes(key))) fail('INVALID_ABILITY_GRANT', '通用魔法需要明确的宿主审核绑定策略。');
      this.#magicPolicy = policy;
    }
    this.#getDirectorMode = getDirectorMode;
    this.#guardRulesByDefault = guardRulesByDefault === true;
    this.#caseRulesByDefault = caseRulesByDefault === true;
    if (hasIntentRuntime(runtimeRevisionId)) fail('INVALID_AGENT_JOB', '新自然意图修订只能由宿主的 v2Ordinary 选择器新建带来源的二版根。');
    this.#newRunRevision = runtimeRevisionById(runtimeRevisionId).id;
    if (options.creationRuntimeRevisions !== undefined) {
      const dispatch = options.creationRuntimeRevisions;
      if (!dispatch || typeof dispatch !== 'object' || isProxy(dispatch) || Object.getPrototypeOf(dispatch) !== Object.prototype
        || Reflect.ownKeys(dispatch).length !== 1 || ![RELATIONSHIP_RUNTIME_REVISION, INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(Object.getOwnPropertyDescriptor(dispatch, 'v2Ordinary')?.value))
        fail('INVALID_AGENT_JOB', '新建关系修订只能由宿主固定选择。');
      this.#creationRuntimeRevisions = Object.freeze({ v2Ordinary: dispatch.v2Ordinary });
    }
    if (Object.hasOwn(options, 'hiddenSupplyVersion')) {
      if (options.hiddenSupplyVersion !== 2 || this.#creationRuntimeRevisions.v2Ordinary !== EVENT_DIRECTOR_RUNTIME_REVISION)
        fail('INVALID_AGENT_JOB', '私有补给仅支持显式启用的新普通牢房根。');
      this.#hiddenSupply = true;
    }
    if (Object.hasOwn(options, 'getHiddenSupplyMode') && (!this.#hiddenSupply || typeof options.getHiddenSupplyMode !== 'function' || isProxy(options.getHiddenSupplyMode)))
      fail('INVALID_AGENT_JOB', '私有导演模式必须由已启用的宿主持有。');
    this.#getHiddenSupplyMode = options.getHiddenSupplyMode ?? (() => 'active');
    if (Object.hasOwn(options, 'npcManualRecoveryVersion')) {
      if (![1, 2, 3].includes(options.npcManualRecoveryVersion) || this.#creationRuntimeRevisions.v2Ordinary !== EVENT_DIRECTOR_RUNTIME_REVISION)
        fail('INVALID_AGENT_JOB', 'NPC 人工格式恢复仅支持宿主显式启用的新任务版本。');
      this.#npcManualRecovery = options.npcManualRecoveryVersion;
    }
    if (Object.hasOwn(options, 'npcActPreflightVersion')) {
      if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(options.npcActPreflightVersion) || this.#creationRuntimeRevisions.v2Ordinary !== EVENT_DIRECTOR_RUNTIME_REVISION)
        fail('INVALID_AGENT_JOB', '角色决策结构提示仅支持宿主显式启用的新任务。');
      this.#npcActPreflight = options.npcActPreflightVersion;
    }
    if (Object.hasOwn(options, 'visualPerformanceGuidanceVersion')) {
      if (![1, 2, 3].includes(options.visualPerformanceGuidanceVersion) || this.#creationRuntimeRevisions.v2Ordinary !== EVENT_DIRECTOR_RUNTIME_REVISION
        || this.#materialProseVersion !== 2) fail('INVALID_AGENT_JOB', '视觉演绎说明仅支持宿主显式启用的新任务和物质版本2。');
      this.#visualPerformanceGuidance = options.visualPerformanceGuidanceVersion;
    }
    if (Object.hasOwn(options, 'privateDirectorTailVersion')) {
      if (options.privateDirectorTailVersion !== 1 || !this.#hiddenSupply)
        fail('INVALID_AGENT_JOB', '私有导演末段预算仅支持已启用私有补给的新任务。');
      this.#privateDirectorTail = true;
    }
    if (Object.hasOwn(options, 'privateUnissuedAskVersion')) {
      if (options.privateUnissuedAskVersion !== 1 || !this.#hiddenSupply)
        fail('INVALID_AGENT_JOB', '保留未派私有入口仅支持已启用私有补给的新任务。');
      this.#privateUnissuedAsk = true;
    }
    if (initialExampleId !== 'agent') fail('INVALID_EXAMPLE', '初始测试版本无效。');
    this.#db = new DatabaseSync(dbPath);
    this.#db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS prologue_head (id INTEGER PRIMARY KEY CHECK(id=1), state TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS prologue_events (id INTEGER PRIMARY KEY AUTOINCREMENT, generation INTEGER NOT NULL, revision INTEGER NOT NULL, kind TEXT NOT NULL, state TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS prologue_requests (request_id TEXT PRIMARY KEY, generation INTEGER NOT NULL, text TEXT NOT NULL, receipt TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS prologue_saves (id TEXT PRIMARY KEY, name TEXT NOT NULL, state TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1 CHECK(typeof(version)='integer' AND version>0));
      CREATE TABLE IF NOT EXISTS prologue_turns (id TEXT PRIMARY KEY, text TEXT NOT NULL, before_state TEXT NOT NULL, after_entries TEXT NOT NULL, entry_start INTEGER NOT NULL, entry_end INTEGER NOT NULL);`);
    try {
      this.#delivery = new PlayerDeliveryOutbox(this.#db, { clock: deliveryClock });
      this.#avatars = new CharacterAvatars(this.#db);
      this.#presets = new PlayerPresets(this.#db, this.#avatars);
      this.#customCatalog = new CustomAbilityStore(this.#db,{catalogId:'local-author'});
      // Private Engine connection only. No caller READ policy exists here; any
      // memoryChannelPolicy (even null) keeps the previous fresh-prepare contract.
      const privateStatements = options.memoryChannelPolicy === undefined;
      this.#domain = new DomainStore(this.#db, { memoryChannelPolicy: options.memoryChannelPolicy,
        decisionStatementCache: privateStatements,
        durableTaskPreflight: packet => this.#preflightDurableTasks(packet),
        rootTaskPreflight: packet => this.#preflightRelationshipRoot(packet) });
      this.#magicRepository = new MagicRepository(this.#db);
      this.#directorCandidates = new DirectorCandidateStore(this.#db);
      this.#directorPlanning = new DirectorPlanningStore(this.#db, { baselineMagic: state => {
        // Director validation can run after the Domain commit but before the
        // compatibility prologue_head update, in the same act transaction.
        const head = this.#db.prepare(`SELECT c.snapshot_json FROM domain_head h
          JOIN domain_commits c ON c.commit_ref=h.commit_ref WHERE h.id=1`).get();
        return head ? this.#temporaryMagic(state, { nativeOnly: Boolean(state.customAbilitySetup),
          domainHeadState: JSON.parse(head.snapshot_json) })?.magic : null;
      } });
      this.#dice = new DiceStore(this.#db);
      this.#decisions = new DecisionStateStore(this.#db, { cacheLatest: privateStatements });
      this.#agentJobs = new AgentTurnStore(this.#db, { clock: agentClock, directorPlanning: this.#directorPlanning });
      this.#prompts = new AgentPrompts(this.#db);
      this.#transaction(() => {
        this.#delivery.initialize();
        this.#avatars.initialize();
        this.#presets.initialize();
        this.#domain.initialize();
        this.#customCatalog.initialize();
        this.#db.exec(`CREATE TABLE IF NOT EXISTS prologue_story_request_receipts (
          request_id TEXT PRIMARY KEY, text TEXT NOT NULL, source_generation INTEGER NOT NULL,
          source_revision INTEGER NOT NULL, source_commit_ref TEXT NOT NULL, target_commit_ref TEXT NOT NULL,
          receipt_json TEXT NOT NULL);
          CREATE TRIGGER IF NOT EXISTS prologue_story_receipt_no_update BEFORE UPDATE ON prologue_story_request_receipts BEGIN SELECT RAISE(ABORT,'STORY_RECEIPT_IMMUTABLE'); END;
          CREATE TRIGGER IF NOT EXISTS prologue_story_receipt_no_delete BEFORE DELETE ON prologue_story_request_receipts BEGIN SELECT RAISE(ABORT,'STORY_RECEIPT_IMMUTABLE'); END;
          CREATE TABLE IF NOT EXISTS profile_summary_cache(
            owner_id TEXT NOT NULL, subject_id TEXT NOT NULL, source_hash TEXT NOT NULL,
            text TEXT NOT NULL, policy_version INTEGER NOT NULL, generated_at INTEGER NOT NULL,
            PRIMARY KEY(owner_id, subject_id, source_hash, policy_version));`);
        this.#magicRepository.initialize();
        this.#directorCandidates.initialize();
        this.#agentJobs.initialize();
        this.#directorPlanning.initialize();
        this.#agentJobs.initializeNarrative();
        this.#prompts.initialize();
        if (!this.#db.prepare('PRAGMA table_info(prologue_saves)').all().some(column => column.name === 'version')) {
          this.#db.exec("ALTER TABLE prologue_saves ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK(typeof(version)='integer' AND version>0)");
        }
        const fresh = !this.#db.prepare('SELECT id FROM prologue_head WHERE id=1').get();
        if (fresh) this.#write(initialExampleId === 'agent' ? initialAgentState(undefined, { runtimeRevisionId: this.#newRunRevision, rootCaseOptionsVersion: 1 }) : initialState(), 'initial');
        const migratedPaths = this.#migrateLegacyPaths();
        if (migratedPaths) this.#delivery.resetAfterPathMigration();
        const head = this.#state();
        // Existing Domain identity is available before validating extension
        // checkpoints on reopen; fresh pre-domain migration remains unchanged.
        this.#domainReady = Boolean(this.#db.prepare('SELECT id FROM domain_head WHERE id=1').get());
        const restoreStartedAt = performance.now();
        this.#validateRestored(head);
        v0Timing('boot:restore', restoreStartedAt);
        if (!this.#db.prepare('SELECT id FROM domain_head WHERE id=1').get()) {
          this.#domain.importLegacy({ events: this.#db.prepare('SELECT * FROM prologue_events ORDER BY id').all(),
            head, saves: this.#db.prepare('SELECT id,state,version FROM prologue_saves').all(),
            validate: state => this.#validateRestored(state), fresh });
        } else {
          if (migratedPaths) this.#domain.reconcileLegacyPaths(this.#db.prepare('SELECT * FROM prologue_events ORDER BY id').all());
          this.#domain.assertHead(head);
        }
        this.#domainReady = true;
        // Existing databases get one current-view baseline, not a fabricated
        // replay of historical knowledge or observations for absent NPCs.
        this.#delivery.ensureBaseline(this.#view(head));
        let activated = head;
        if (fresh && this.#guardRulesByDefault && this.#guardUpgradeView(activated).available) activated = this.#activateGuardRules(activated);
        if (fresh && this.#caseRulesByDefault && this.#caseItemUpgradeView(activated).available) this.#activateCaseItems(activated);
      }, { reuseVerifiedCommitBytes: true, reuseRelationshipProjection: true, reuseExactPlanReads: true });
    } catch (error) { this.#db.close(); this.#closed = true; throw error; }
  }
  #migrateLegacyPaths() {
    const head = this.#state();
    // Only the head and event lineage are authoritative migration sources.
    // Damaged inactive slots stay untouched, so they can still be deleted.
    const candidate = row => {
      try { return { ...row, snapshot: JSON.parse(row.state) }; }
      catch { return { ...row, snapshot: null }; }
    };
    const events = this.#db.prepare('SELECT * FROM prologue_events ORDER BY id').all().map(candidate);
    const saves = this.#db.prepare('SELECT id,state FROM prologue_saves').all().map(candidate);
    const sources = [head, ...events.map(event => event.snapshot)];
    const needsPath = state => state && typeof state === 'object' && !Array.isArray(state) && state.turnIds === undefined;
    if (![...sources, ...saves.map(save => save.snapshot)].some(needsPath)) return;
    if (sources.some(state => !state || (state.turnIds !== undefined && !Array.isArray(state.turnIds)))) fail('INVALID_STATE', '行动路径字段损坏，未修改旧档。');
    const migrationError = () => fail('LEGACY_LINEAGE_UNRESOLVED', '旧档行动来源无法唯一确定；迁移已撤销，原始进度与存档保留。');
    const version = state => `${state.generation}:${state.revision}`;
    const byVersion = new Map();
    const requests = this.#db.prepare('SELECT generation,text,receipt FROM prologue_requests').all().map(row => ({ ...row, receipt: parseState(row.receipt) }));
    let previous;
    for (const event of events) {
      const state = event.snapshot;
      if (event.generation !== state.generation || event.revision !== state.revision || byVersion.has(version(state))) migrationError();
      if (event.kind === 'initial') {
        if (previous || state.generation !== 1 || state.revision !== 0) migrationError();
        state.turnIds = [];
      } else if (event.kind === 'new_game') {
        if (!previous || state.generation !== previous.generation + 1 || state.revision !== previous.revision + 1) migrationError();
        state.turnIds = [];
      } else if (event.kind === 'act') {
        if (!previous || state.generation !== previous.generation || state.revision !== previous.revision + 1) migrationError();
        const matching = requests.filter(row => row.generation === state.generation && row.receipt.accepted === true && row.receipt.view?.revision === state.revision);
        if (matching.length > 1) migrationError();
        const id = state.turnIds?.at(-1) || `legacy-${event.id}`;
        const text = matching[0]?.text || '继续（旧版行动）';
        state.turnIds = [...previous.turnIds, id];
        if (!this.#db.prepare('SELECT id FROM prologue_turns WHERE id=?').get(id)) this.#insertTurn(id, text, previous, state);
        this.#validateRestored(state);
      } else if (event.kind === 'player_avatar') {
        if (!previous || state.generation !== previous.generation || state.revision !== previous.revision + 1
          || !isDeepStrictEqual(gameplayState(previous), gameplayState(state))) migrationError();
        state.turnIds = [...previous.turnIds];
      } else if (event.kind === 'load' || event.kind === 'rewind') {
        if (!previous || state.generation !== previous.generation + 1 || state.revision !== previous.revision + 1) migrationError();
        let candidates = state.restoredFrom ? [byVersion.get(version(state.restoredFrom))].filter(Boolean) : [...byVersion.values()];
        candidates = candidates.filter(candidate => isDeepStrictEqual(gameplayState(candidate), gameplayState(state)));
        if (event.kind === 'rewind') candidates = candidates.filter(candidate => candidate.turnIds.length < previous.turnIds.length && candidate.turnIds.every((id, index) => id === previous.turnIds[index]));
        const paths = new Map(candidates.map(candidate => [JSON.stringify(candidate.turnIds), candidate.turnIds]));
        if (paths.size !== 1) migrationError();
        state.turnIds = [...paths.values()][0].slice();
      } else migrationError();
      validateState(state);
      byVersion.set(version(state), state);
      this.#db.prepare('UPDATE prologue_events SET state=? WHERE id=?').run(JSON.stringify(state), event.id);
      previous = state;
    }
    const restorePath = state => {
      const source = byVersion.get(version(state));
      if (!source || !isDeepStrictEqual(gameplayState(source), gameplayState(state))) migrationError();
      state.turnIds = [...source.turnIds];
      this.#validateRestored(state);
    };
    restorePath(head);
    this.#db.prepare('UPDATE prologue_head SET state=? WHERE id=1').run(JSON.stringify(head));
    for (const save of saves) {
      if (!needsPath(save.snapshot)) continue;
      // Validate a reconstructed candidate before touching the original slot.
      // A supported but ambiguous source still fails closed in restorePath.
      let candidate;
      try {
        const source = byVersion.get(version(save.snapshot));
        candidate = { ...save.snapshot, turnIds: source?.turnIds || [] };
        validateState(candidate);
      } catch { continue; }
      restorePath(candidate);
      this.#db.prepare('UPDATE prologue_saves SET state=? WHERE id=?').run(JSON.stringify(candidate), save.id);
    }
    return true;
  }
  #transaction(work, { readOnly = false, reuseVerifiedCommitBytes = false, reuseRelationshipProjection = false, reuseExactPlanReads = false } = {}) {
    if (this.#closed) fail('CLOSED', '引擎已经关闭。');
    this.#db.exec(readOnly ? 'BEGIN' : 'BEGIN IMMEDIATE');
    try {
      const checkedWork = () => reuseVerifiedCommitBytes ? withVerifiedDomainCommitBytes(this.#db, work) : work();
      const checkedProjection = () => reuseRelationshipProjection ? withExactRelationshipProjection(checkedWork) : checkedWork();
      const result = reuseExactPlanReads ? this.#agentJobs.withExactPlanReads(checkedProjection) : checkedProjection();
      this.#db.exec('COMMIT'); return result;
    }
    catch (error) { this.#db.exec('ROLLBACK'); throw error; }
  }
  #state() {
    if (this.#closed) fail('CLOSED', '引擎已经关闭。');
    const state = parseState(this.#db.prepare('SELECT state FROM prologue_head WHERE id=1').get().state);
    if (this.#domainReady && state.caseRuntime?.occupiedBody) this.#domain.assertOccupiedBodyWorld(state);
    return state;
  }
  #refreshTrust() {
    const dataVersion = this.#db.prepare('PRAGMA data_version').get().data_version;
    if (this.#trustDataVersion === dataVersion) return;
    this.#trustDataVersion = dataVersion;
    this.#journalTrust = null; this.#historyTrust = null; this.#memoryTrust = null;
  }
  #assertMagicHistory(state, commit, { memory = false } = {}) {
    this.#refreshTrust();
    const ref = commit.commit_ref;
    if (this.#historyTrust !== ref) {
      this.#domain.assertExecutionLifeHistory(state);
      this.#domain.assertGrowthHistory(state);
      this.#domain.assertSwapLifecycleHistory(state);
      this.#historyTrust = ref;
    }
    if (memory && this.#memoryTrust !== ref) {
      this.#domain.assertMemoryChannelHistory(state);
      this.#domain.assertDurableMemoryAcquisitionHistory(state);
      this.#memoryTrust = ref;
    }
  }
  #magicAt(state, historical = false) {
    if (!this.#domainReady || state.exampleId !== 'agent') return null;
    const startedAt = performance.now();
    try {
      const commit = state.caseRuntime?.occupiedBody ? this.#domain.assertOccupiedBodyWorld(state) : this.#domain.assertSnapshot(state);
      const saved = this.#magicRepository.readAt({ commitRef: commit.commit_ref, runId: commit.run_id });
      // Ancestor replay cannot audit the live memory-channel head; its exact
      // commit snapshot and saved projection are the historical authority.
      if (saved) this.#assertMagicHistory(state, commit, { memory: !historical });
      return saved ? refreshHostMagic(state, saved.state, { branchId: commit.branch_id, commitRef: commit.commit_ref,
        generation: state.generation, revision: state.revision }, { domainStore: this.#domain }) : null;
    } finally { v0Timing('magicAt', startedAt); }
  }
  #baselineMagic(state, world = state, journalAnchor) {
    if (!state || state.magic || state.exampleId !== 'agent') return null;
    // Only an actual custom-ability setup suppresses the player's native
    // grant. A reviewed Yakumo spatial-preset creation keeps the already
    // approved GENERAL_SPATIAL_SHIFT grant (it is not the Echo custom path).
    const nativeOnly = Boolean(state.customAbilitySetup);
    return this.#temporaryMagic(state, { nativeOnly, world, journalAnchor });
  }
  // A real self-treatment scene needs the same reviewed baseline grant as an
  // ordinary text cast. Build it transiently from the approved policy for this
  // one detached planning/replay snapshot; never persist or hand-invent magic.
  #selfHealMagic(state) {
    if (!state || state.magic || state.exampleId !== 'agent' || !this.#domainReady) return null;
    const player = createdPlayerId(state);
    if (player !== 'meruru') return null;
    const physicalId = runtimeBodyActorId(state, player);
    const condition = state.caseRuntime?.conditionsByActor?.[physicalId];
    if (!condition || !Array.isArray(condition.injuries)
      || !condition.injuries.some(row => row?.kind === 'puncture')) return null;
    return this.#baselineMagic(state)?.magic || null;
  }
  #npcMagicCastPin(state) {
    if (hasCaseOne(state) || runtimeCapabilityId(state.agentRuntimeRevision) !== 'agent-prison-runtime@8') return {};
    if (runtimeRevisionForState(state).policy.sceneBeatVersion !== 1) return {};
    const magic = this.#magicAt(state) || this.#baselineMagic(state)?.magic;
    if (!magic) return {};
    // The persona policy joins the plan only for a newly-created ordinary job.
    // It is never copied into task context, action or the NPC magic wire.
    return { npcMagicCastVersion: 1, npcMagicPersonaPolicyVersion: 3, npcVoluntaryFloatVersion: 1,
      npcMedicalContactVersion: 1 };
  }
  #attachNpcMagic(state, plan, journalAnchor) {
    if (!this.#domainReady) return null;
    const saved = attachNpcMagicProjection(state, plan, this.#domain, this.#magicRepository);
    if (saved) return saved;
    if (plan?.npcMagicCastVersion !== 1 || state.magic || state.exampleId !== 'agent') return null;
    const baseline = this.#baselineMagic(state, state, journalAnchor);
    if (!baseline) return null;
    state.magic = baseline.magic;
    return state.magic;
  }
  #magicCheckpoint(state) {
    if (!this.#domainReady || state.exampleId !== 'agent') return false;
    const known = this.#db.prepare('SELECT commit_ref,run_id FROM domain_commits WHERE generation=? AND revision=?').get(state.generation, state.revision);
    if (!known || !this.#magicRepository.readAt({ commitRef: known.commit_ref, runId: known.run_id })) return false;
    this.#domain.assertSnapshot(state); return true;
  }
  #sealedMagicOffer(action) {
    const job = this.#agentJobs.get(action.jobId);
    return this.#magicOfferForTasks(this.#agentJobs.tasks(job));
  }
  #magicOfferForTasks(tasks) {
    const task = tasks.find(row => row.role === 'intent_parser' || row.id === 'intent' && row.role === 'world_adjudicator');
    return task?.context?.data?.magic || null;
  }
  #sceneStageClocksFor(action) {
    if (action?.type !== 'scene' || !action.jobId) return undefined;
    let job;
    try { job = this.#agentJobs.get(action.jobId); } catch (error) {
      if (Object.hasOwn(action, 'directorEventDue')) throw error;
      return undefined;
    }
    if (Object.hasOwn(action, 'directorEventDue') && !isDeepStrictEqual(action.directorEventDue, this.#agentJobs.input(job).directorEventLifecycle?.due))
      fail('INVALID_AGENT_JOB', '历史公共广播与封存导演任务不一致。');
    const stages = this.#agentJobs.stages(job);
    if (!stages.length) return undefined;
    return stages.map(entry => entry.receipt?.conversationEventClockVersion === 1 ? 1 : undefined);
  }
  #assertMagicJournalStages(action, before, journalAnchor) {
    const job = this.#agentJobs.get(action.jobId); const plan = this.#agentJobs.input(job);
    // The exact host-only action is checked by assertNarrativeAction; it has
    // no model stage to replay and grants neither case contact nor magic.
    if (![6, 7].includes(plan.version) || plan.privateReflectionVersion === 1) return;
    const base = plan.regeneration?.checkpoint || before;
    return withRunBoundary(base, plan.runPolicyConsumersVersion === 1 ? plan.effectiveRunPolicy : undefined,
      () => this.#assertMagicJournalStagesScoped(action, job, plan, base, journalAnchor));
  }
  #assertMagicJournalStagesScoped(action, job, plan, base, journalAnchor) {
    const source = this.#domain.assertSnapshot(base);
    const tasks = this.#agentJobs.tasks(job); const stages = this.#agentJobs.stages(job);
    const deliveredMagicOffer = action.intent?.magic ? this.#magicOfferForTasks(tasks) : null;
    const beats = [];
    const sceneBase = structuredClone(base);
    this.#attachNpcMagic(sceneBase, plan, journalAnchor);
    if (action.intent?.type !== 'magic' && action.intent?.magic && !sceneBase.magic) {
      const actual = this.#magicAt(base, true) || this.#temporaryMagic(base, { journalAnchor })?.magic;
      if (actual) sceneBase.magic = actual;
    }
    const customCommand = this.#customTextCommand(base, { ...action, jobId: action.jobId });
    const customAct = customCommand ? { command: customCommand,
      prepared: this.#domain.prepareCustomUse(base, customCommand, true),
      capabilities: this.#domain.customAbilityCapabilities(base) } : null;
    const swapCommand = this.#swapTextCommand(base, { ...action, jobId: action.jobId }, true);
    const swapAct = swapCommand ? { command: swapCommand,
      prepared: this.#domain.prepareSwapLifecycle(base, swapCommand),
      capabilities: this.#domain.swapLifecycleCapabilitiesAt(base) } : null;
    const preparedSwap = preparedSwapForNpcMenu(swapAct);
    const stageClock = stage => stages[stage]?.receipt?.conversationEventClockVersion === 1 ? 1 : undefined;
    let prefix = beginCausalScene(sceneBase, this.#sceneBeatAction(job, plan, action.intent, action.performance, action.ballots, beats), { customAct, swapAct, domainStore: this.#domain, domainSourceState: base,
      deliveredMagicOffer: action.intent?.magic ? deliveredMagicOffer : null, conversationEventClockVersion: stageClock(0) });
    if (prefix.phase !== 'reaction') prefix = settlePlayerBoundary(prefix);
    const check = (stage, input) => {
      const receipt = stages[stage]?.receipt;
      if (!receipt || receipt.baseCommitRef !== source.commit_ref
        || receipt.inputHash !== this.#sceneDigest(this.#intentStageInput(plan, tasks, prefix, input)) || receipt.stateHash !== this.#sceneDigest(prefix))
        fail('INVALID_AGENT_JOB', '历史场景阶段与真实行动前缀不一致。');
    };
    const advancePlayer = () => {
      if (![1, 2].includes(plan.intentContractVersion)) return;
      const tail = preparePlayerIntentTail(prefix, action, { domainStore: this.#domain, domainSourceState: base });
      if (tail.next) fail('INVALID_AGENT_JOB'); prefix = tail.prefix;
    };
    advancePlayer();
    check(0, { intent: action.intent, performance: action.performance, ballots: action.ballots || null });
    for (const beat of action.beats) {
      const own = tasks.filter(task => task.id.startsWith(`npc:${beat.beat}:`));
      if (own.some(task => task.sceneFrame.beat !== beat.beat || task.sceneFrame.worldTime !== prefix.draft.worldTime
        || task.sceneFrame.prefixHash !== stages[beat.beat - 1]?.hash)) fail('INVALID_AGENT_JOB', '历史角色任务不属于封存前缀。');
      prefix = applyCausalNpcBeat(prefix, beat, own[0]?.scheduling,
        { domainStore: this.#domain, magicSourceState: base, preparedSwap, conversationEventClockVersion: stageClock(beat.beat) });
      if (beat.phase === 'reaction' && prefix.phase !== 'reaction') prefix = settlePlayerBoundary(prefix);
      beats.push(beat); advancePlayer(); check(beat.beat, { tasks: own, input: beat });
    }
    if (action.softResult) this.#domain.assertOrdinaryAttemptPublication(base, action);
  }
  #validateMagicJournal(state) {
    this.#refreshTrust();
    const startedAt = performance.now();
    const head = this.#domain.assertSnapshot(state);
    if (this.#journalTrust?.commitRef === head.commit_ref) { v0Timing('journalCached', startedAt); return; }
    // Only narrative parents participate: neither an abandoned execution future
    // nor a matching depth on another run/branch can authenticate a floor.
    const history = this.#db.prepare(`WITH RECURSIVE history AS (
      SELECT *,0 AS depth FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.*,h.depth+1 FROM domain_commits c JOIN history h ON c.commit_ref=h.parent_commit_ref
        WHERE c.run_id=?
    ) SELECT * FROM history ORDER BY depth DESC`).all(head.commit_ref, head.run_id);
    const byRef = new Map(history.map(commit => [commit.commit_ref, commit]));
    const turnById = this.#db.prepare('SELECT * FROM prologue_turns WHERE id=?');
    let index = 0, preceding = null;
    for (const commit of history) {
      const previous = preceding, after = parseState(commit.snapshot_json);
      preceding = { ref: commit.commit_ref, snapshot: after };
      validateStateEnvelope(after); validateAgentStateEnvelope(after); this.#domain.assertSnapshot(after);
      if (commit.run_id !== head.run_id) fail('INVALID_TURN', '行动领域来源不一致。');
      if (commit.kind !== 'act') {
        if (after.customAbilitySetup) { if (['initial','new_game'].includes(commit.kind)) validateAgentState(after); continue; }
        if (['magic_activate', 'magic_cast'].includes(commit.kind)) {
          const magic = this.#magicRepository.readAt({ commitRef: commit.commit_ref, runId: commit.run_id });
          if (!magic || magic.commitRef !== commit.commit_ref || magic.expectedHead !== commit.parent_commit_ref)
            fail('INVALID_TURN', '魔法边界缺少本次不可变发布。');
        }
        continue;
      }
      const turnId = state.turnIds[index];
      const parent = byRef.get(commit.parent_commit_ref);
      const row = turnById.get(turnId);
      if (!row || !parent || after.turnIds.at(-1) !== turnId) fail('INVALID_TURN', '行动楼层缺少实际祖先。');
      const before = parseState(row.before_state);
      const original = previous?.ref === parent.commit_ref ? previous.snapshot : parseState(parent.snapshot_json);
      const entries = parseState(row.after_entries); const action = after.agentActions[index];
      // Exact snapshots, not gameplay-only fingerprints: regeneration consumes
      // the actual before envelope, and after_entries ends at this act BEFORE
      // any later no-floor cast, activation, technical load or story fork.
      if (!isDeepStrictEqual(before, original) || !isDeepStrictEqual(before.turnIds, state.turnIds.slice(0, index))
        || !isDeepStrictEqual(after.turnIds, state.turnIds.slice(0, index + 1))
        || !isDeepStrictEqual(action, state.agentActions[index]) || !isDeepStrictEqual(entries, after.entries)
        || row.entry_start !== before.entries.length || row.entry_end !== after.entries.length
        || row.entry_end < row.entry_start || row.entry_end === row.entry_start && !guardActivation(action))
        fail('INVALID_TURN', '行动楼层与不可变领域端点不一致。');
      const hostCaption = guardHostCaption(action);
      const caseExecution = (hasCaseOne(before) || hasCaseRuntime(before)) && action?.type === 'case_execution';
      if (hostCaption) {
        if (row.text !== hostCaption) fail('INVALID_TURN', '宿主行动输入不一致。');
        if (action.type === 'guard_dice_resolution') this.#dice.assertResult({ runId: parent.run_id }, action.result, action.opportunityId);
      } else if (caseExecution) {
        if (row.text !== '确认处刑推进' || action.verdictId !== (hasCaseOne(before) ? before.caseOne : activeProcedure(before))?.verdict?.id)
          fail('INVALID_TURN', '处刑行动来源不一致。');
      } else if (['scene', 'narrative'].includes(action?.type)) {
        if (action.rawInput !== row.text) fail('INVALID_TURN', '自然行动输入来源不一致。');
        this.#agentJobs.assertNarrativeAction(action);
        const job = this.#agentJobs.get(action.jobId); const plan = this.#agentJobs.input(job);
        if (job.status !== 'committed' || job.turn_id !== turnId || job.actor_id !== createdPlayerId(before)
          || plan.jobId !== job.job_id) fail('INVALID_AGENT_JOB', '历史任务与已提交楼层不一致。');
        if (plan.regeneration) {
          const checkpoint = this.#domain.assertSnapshot(plan.regeneration.checkpoint);
          const execution = this.#db.prepare('SELECT commit_ref FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
            .get(job.branch_id, job.generation, job.base_revision);
          if (parent.kind !== 'rewind' || parent.parent_commit_ref !== checkpoint.commit_ref
            || parent.previous_execution_ref !== execution?.commit_ref
            || !isDeepStrictEqual(gameplayState(before), gameplayState(plan.regeneration.checkpoint)))
            fail('INVALID_AGENT_JOB', '历史重生成没有使用真实知识起点和执行围栏。');
        } else if (job.branch_id !== parent.branch_id || job.generation !== before.generation || job.base_revision !== before.revision)
          fail('INVALID_AGENT_JOB', '历史任务不属于实际行动起点。');
        assertRuntimeJobRevision(plan.regeneration?.checkpoint || before, plan);
        this.#assertHistoricalBallot(before, action, job, plan);
        this.#assertMagicJournalStages(action, before, state);
      } else {
        const parsed = parseLegacyAgentIntent(before, row.text);
        if (!parsed.accepted || !isDeepStrictEqual(parsed.intent, action?.type === 'conversation'
          ? { type: 'conversation', targetId: action.targetId, playerText: action.playerText } : action))
          fail('INVALID_TURN', '行动楼层包含不受支持的指令。');
        if (action.type === 'conversation') this.#agentJobs.assertAction(action);
      }
      const expected = structuredClone(before);
      this.#attachNpcMagic(expected, action, state);
      if ((action.intent?.type !== 'magic' && action.intent?.magic || action.intent?.type === 'runtime'
        && String(action.intent?.subjectId || '').startsWith('force-structure:')) && !expected.magic) {
        const actual = this.#magicAt(before, true) || this.#temporaryMagic(before, { journalAnchor: state })?.magic;
        if (actual) expected.magic = actual;
      }
      const customCommand = this.#customTextCommand(before, action);
      if (customCommand) setCustomActPreparation(expected, { command: customCommand,
        prepared: this.#domain.prepareCustomUse(before, customCommand, true),
        capabilities: this.#domain.customAbilityCapabilities(before) });
      const swapCommand = this.#swapTextCommand(before, action, true);
      if (swapCommand) setSwapActPreparation(expected, { command: swapCommand,
        prepared: this.#domain.prepareSwapLifecycle(before, swapCommand),
        capabilities: this.#domain.swapLifecycleCapabilitiesAt(before) });
      // Full replay must see the same Domain occupied-world proof and the exact
      // sealed menu as the historical prefix. Both are host-only side channel,
      // never part of the state hash or prefix object.
      setSceneDomainStore(expected, this.#domain, before);
      setSceneDeliveredMagicOffer(expected, action.intent?.magic ? this.#sealedMagicOffer(action) : null);
      setSceneStageClocks(expected, this.#sceneStageClocksFor(action));
      try { applyAgentAction(expected, action); }
      finally { setSceneStageClocks(expected, null); }
      takeCustomActPreparation(expected);
      takeSwapActPreparation(expected);
      takeNpcMagicPublication(expected);
      if (!isDeepStrictEqual(gameplayState(expected), gameplayState(after))) fail('INVALID_TURN', '行动未能重现不可变领域端点。');
      index++;
    }
    if (index !== state.turnIds.length) fail('INVALID_TURN', '行动楼层路径不完整。');
    this.#journalTrust = { commitRef: head.commit_ref, turnCount: state.turnIds.length };
    v0Timing('journalFull', startedAt);
  }
  // Both canonical induction paths use the ORIGINAL before checkpoint, never
  // the active execution head. This also validates a pending publication whose
  // immutable results are complete but job commit bookkeeping has not run yet.
  #assertHistoricalBallot(before, action, job = this.#agentJobs.get(action.jobId), plan = this.#agentJobs.input(job)) {
    if (plan.ballotInstrumentVersion === undefined) return;
    if (plan.ballotInstrumentVersion !== 1 || plan.regeneration || plan.jobId !== job.job_id
      || job.actor_id !== createdPlayerId(before) || job.generation !== before.generation
      || job.base_revision !== before.revision || !['running', 'committed'].includes(job.status))
      fail('INVALID_AGENT_JOB', '历史投票任务不属于实际行动起点。');
    const source = this.#domain.assertSnapshot(before);
    if (source.branch_id !== job.branch_id) fail('INVALID_AGENT_JOB', '历史投票分支不一致。');
    const tasks = this.#agentJobs.tasks(job);
    for (const [id, role] of [['performance', 'player_performance'], ['scene', 'scene_composer']]) {
      const mandatory = tasks.filter(task => task.id === id);
      if (mandatory.length !== 1 || mandatory[0].role !== role || mandatory[0].actorId !== job.actor_id
        || mandatory[0].result === undefined) fail('INVALID_AGENT_JOB', '历史投票缺少完整必需任务。');
    }
    for (const task of tasks.filter(task => ['performance', 'scene', 'scene-repair'].includes(task.id))) {
      if (task.actorId !== job.actor_id || task.role !== (task.id === 'performance' ? 'player_performance' : 'scene_composer')
        || task.result === undefined) fail('INVALID_AGENT_JOB', '历史投票任务类型或结果缺失。');
      this.#assertBallotTask(job, before, plan, task, true);
      this.#validateNarrativeTask(task, task.result);
    }
  }
  #validateRestored(state) {
    const agentPath = state?.exampleId === 'agent';
    const validateCheckpoint = snapshot => {
      if (agentPath) { validateStateEnvelope(snapshot); validateAgentStateEnvelope(snapshot); }
      else validateState(snapshot);
      if (snapshot.playerAvatarId !== undefined) this.#avatars.assertReference(snapshot.playerAvatarId);
    };
    validateCheckpoint(state);
    if (agentPath && this.#domainReady) {
      const committed = this.#db.prepare('SELECT commit_ref,snapshot_json FROM domain_commits WHERE generation=? AND revision=?')
        .get(state.generation, state.revision);
      if (committed && isDeepStrictEqual(JSON.parse(committed.snapshot_json), state)) {
        this.#directorPlanning.read(committed.commit_ref);
        this.#domain.effectiveRunPolicy(state);
        this.#domain.assertHiddenSupplyHistory(state);
      }
    }
    // Prove an agent path by induction: one canonical root, then each exact
    // transition into the next checkpoint (including the final head). The
    // immutable journal result is reused for an unchanged head, but any commit
    // by another connection invalidates that reuse through PRAGMA data_version.
    // New pending heads still go through the full transition loop below.
    if (agentPath && state.customAbilitySetup) {
      const committed=this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE generation=? AND revision=?').get(state.generation,state.revision);
      if(committed) {this.#domain.assertCustomAbilityHistory(state);this.#validateMagicJournal(state);return;}
      const current=this.#state();
      // A load keeps restoredFrom as historical metadata in every later clone.
      // Only an incoming restore/rewind generation transfer compares against its
      // source checkpoint; an ordinary pending act must use the exact transition
      // validation below, not be mistaken for a no-change restore.
      const pendingNext=state.generation===current.generation&&state.revision===current.revision+1
        &&state.turnIds.length===current.turnIds.length+1;
      if(!pendingNext&&state.restoredFrom) {const source=this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE generation=? AND revision=?').get(state.restoredFrom.generation,state.restoredFrom.revision);
        if(!source||!isDeepStrictEqual(gameplayState(parseState(source.snapshot_json)),gameplayState(state)))fail('INVALID_TURN');
        const original=parseState(source.snapshot_json);this.#domain.assertCustomAbilityHistory(original);this.#validateMagicJournal(original);return;}
      this.#domain.assertCustomAbilityHistory(current);this.#validateMagicJournal(current);
      if(state.revision!==current.revision+1||state.generation!==current.generation||state.turnIds.length!==current.turnIds.length+1)fail('INVALID_TURN');
      const row=this.#db.prepare('SELECT * FROM prologue_turns WHERE id=?').get(state.turnIds.at(-1));
      const action=state.agentActions.at(-1);
      // Host configuration actions (guard rules, guard-magic rules and case-item
      // rules) are not model narrative turns and have no agent job to validate.
      // Their exact shape is still checked by applyAgentAction, the same
      // guardHostCaption classification and the custom history guard.
      if (action?.type === 'guard_detention_local') {
        if (!guardHostCaption(action) || row?.text !== guardHostCaption(action)) fail('INVALID_TURN', '宿主行动输入不一致。');
      } else if(!guardActivation(action))this.#agentJobs.assertNarrativeAction(action);
      // A pending custom action has no committed endpoint yet, so it cannot use
      // the historical Magic journal replay above. Reproduce the same live host
      // side channels the ordinary scene path uses: custom/swap preparation,
      // NPC Magic attachment, occupied-world Domain proof, then the exact action.
      // They stay host-only transport and never enter the state envelope.
      const expected=structuredClone(current);
      const customCommand=this.#customTextCommand(current,action);
      const swapCommand=this.#swapTextCommand(current,action);
      const swapPublication=swapCommand?this.#domain.prepareSwapLifecycle(current,swapCommand):null;
      if(customCommand) setCustomActPreparation(expected,{command:customCommand,
        prepared:this.#domain.prepareCustomUse(current,customCommand),
        capabilities:this.#domain.customAbilityCapabilities(current)});
      else if(swapPublication) setSwapActPreparation(expected,{command:swapCommand,
        prepared:swapPublication,capabilities:this.#domain.swapLifecycleCapabilities(current)});
      else if(action.intent?.magic&&!expected.magic) {const actual=this.#magicAt(current);
        if(actual) expected.magic=actual;
        else {const temporary=this.#temporaryMagic(current);
          if(!temporary) fail('MAGIC_HOST_INITIALIZATION_REQUIRED');expected.magic=temporary.magic;}}
      this.#attachNpcMagic(expected,action);
      setSceneDomainStore(expected,this.#domain,current);
      setSceneDeliveredMagicOffer(expected,action.intent?.magic?this.#sealedMagicOffer(action):null);
      setSceneStageClocks(expected,this.#sceneStageClocksFor(action));
      try { applyAgentAction(expected,action); }
      finally { setSceneStageClocks(expected,null); }
      takeCustomActPreparation(expected);takeSwapActPreparation(expected);takeNpcMagicPublication(expected);
      if(!row||!isDeepStrictEqual(parseState(row.before_state),current)||!isDeepStrictEqual(gameplayState(expected),gameplayState(state))||!isDeepStrictEqual(parseState(row.after_entries),state.entries))fail('INVALID_TURN');
      return;
    }
    if (agentPath && this.#magicCheckpoint(state)) { this.#assertMagicHistory(state, this.#domain.assertSnapshot(state)); this.#validateMagicJournal(state); return; }
    let startIndex = 0;
    let pendingJournal = null;
    if (agentPath && this.#domainReady) {
      const current = this.#state();
      if (state.generation === current.generation && state.revision === current.revision + 1
        && state.turnIds.length === current.turnIds.length + 1 && this.#magicCheckpoint(current)) {
        this.#validateMagicJournal(current); startIndex = current.turnIds.length;
        pendingJournal = { generation: state.generation, revision: state.revision, turnCount: state.turnIds.length };
        const pending = this.#db.prepare('SELECT before_state FROM prologue_turns WHERE id=?').get(state.turnIds.at(-1));
        if (!pending || !isDeepStrictEqual(parseState(pending.before_state), current)) fail('INVALID_TURN', '新行动没有使用实际领域起点。');
      }
    }
    if (agentPath && !state.turnIds.length) validateAgentState(state);
    const present = snapshot => snapshot.exampleId === 'custom' ? customPresentation(snapshot).entries : snapshot.entries;
    const readTurn = id => {
      const row = this.#db.prepare('SELECT * FROM prologue_turns WHERE id=?').get(id);
      if (!row) fail('INVALID_TURN', '存档引用的行动楼层不存在。');
      return row;
    };
    let row = state.turnIds.length ? readTurn(state.turnIds[startIndex]) : null;
    let before = row ? parseState(row.before_state) : null;
    for (let index = startIndex; index < state.turnIds.length; index++) {
      validateCheckpoint(before);
      if (agentPath && index === 0 && !this.#magicCheckpoint(before)) validateAgentState(before);
      const afterEntries = parseState(row.after_entries);
      if (!isDeepStrictEqual(before.turnIds, state.turnIds.slice(0, index))
        || !Array.isArray(afterEntries) || row.entry_start !== before.entries.length
        || row.entry_end !== afterEntries.length || row.entry_end < row.entry_start
        || row.entry_end === row.entry_start && !guardActivation(state.agentActions?.[index])) fail('INVALID_TURN', '存档行动楼层的范围或来源不一致。');
      const nextRow = index + 1 < state.turnIds.length ? readTurn(state.turnIds[index + 1]) : null;
      const after = nextRow ? parseState(nextRow.before_state) : state;
      const expected = structuredClone(before);
      const command = row.text === '继续（旧版行动）' ? '继续' : row.text.trim().replace(/[。！!？?]+$/u, '');
      const prototypeIntent = before.exampleId === 'prototype' ? parsePrototypeIntent(before, row.text) : null;
      const caseExecution = (hasCaseOne(before) || hasCaseRuntime(before)) && state.agentActions[index]?.type === 'case_execution';
      let parsingState = structuredClone(before);
      if (state.agentActions?.[index]?.causalVersion === 1) {
        runtimeApplyItemPolicy(parsingState, state.agentActions[index].itemPolicyVersion);
        enableCaseRuntime(parsingState);
      }
      if (state.agentActions?.[index]?.intent?.type === 'runtime'
        && String(state.agentActions[index].intent.subjectId || '').startsWith('force-structure:')) {
        const projection = this.#magicAt(before, true) || this.#magicAt(before);
        parsingState = withMagicProjection(parsingState, projection);
      }
      const hostCaption = guardHostCaption(state.agentActions?.[index]);
      const agentIntent = before.exampleId === 'agent' ? (hostCaption ? { accepted: row.text === hostCaption, intent: state.agentActions[index] }
        : caseExecution ? { accepted: row.text === '确认处刑推进', intent: state.agentActions[index] }
        : ['narrative', 'scene'].includes(state.agentActions[index]?.type)
          ? parseAgentIntent(parsingState, row.text, { scheduleWaitVersion: state.agentActions[index].scheduleWaitVersion }) : parseLegacyAgentIntent(before, row.text)) : null;
      const suggestions = before.exampleId === 'custom' ? customSuggestions(before) : OPTIONS[before.phase];
      if (before.completed || (agentIntent ? !agentIntent.accepted : prototypeIntent ? !prototypeIntent.accepted : !suggestions?.includes(command))) fail('INVALID_TURN', '存档行动楼层包含不受支持的指令。');
      if (agentIntent) {
        const action = state.agentActions[index];
        if (hostCaption) {
          if (action.type === 'guard_dice_resolution') {
            const source = this.#db.prepare('SELECT run_id FROM domain_commits WHERE generation=? AND revision=?').get(before.generation, before.revision);
            if (!source) fail('INVALID_TURN', '检定来源不存在。');
            this.#dice.assertResult({ runId: source.run_id }, action.result, action.opportunityId);
          }
        } else if (caseExecution) {
          if (action.verdictId !== (hasCaseOne(before) ? before.caseOne : activeProcedure(before))?.verdict?.id) fail('INVALID_TURN', '处刑确认不属于当前判决。');
        } else if (['narrative', 'scene'].includes(action.type)) {
          if (action.rawInput !== row.text) fail('INVALID_TURN', '自然行动输入来源不一致。');
          this.#agentJobs.assertNarrativeAction(action);
          this.#assertHistoricalBallot(before, action);
          this.#assertMagicJournalStages(action, before);
        } else {
          if (!isDeepStrictEqual(agentIntent.intent, action.type === 'conversation'
            ? { type: 'conversation', targetId: action.targetId, playerText: action.playerText } : action)) fail('INVALID_TURN', 'LLM 行动来源不一致。');
          if (action.type === 'conversation') this.#agentJobs.assertAction(action);
        }
        // A new NPC medical contact is committed by the same action that
        // settles the ordinary scene. Replay must bind the same committed
        // host Magic projection and its Domain scope as the live action did;
        // otherwise the contact cannot be reproduced and the turn is rejected.
        const pendingMedicalContact = index === state.turnIds.length - 1
          && action?.type === 'scene' && action.npcMedicalContactVersion === 1;
        if (pendingMedicalContact) {
          this.#attachNpcMagic(expected, action);
          setSceneDomainStore(expected, this.#domain, before);
        }
        if (action.intent?.type === 'runtime'
          && String(action.intent?.subjectId || '').startsWith('force-structure:')) {
          const projection = this.#magicAt(before, true) || this.#magicAt(before);
          if (projection) expected.magic = structuredClone(projection);
        }
        setSceneStageClocks(expected, this.#sceneStageClocksFor(action));
        try { applyAgentAction(expected, action); }
        finally { setSceneStageClocks(expected, null); }
        if (pendingMedicalContact) takeNpcMagicPublication(expected);
      } else if (prototypeIntent) advancePrototype(expected, prototypeIntent.intentKey);
      else if (before.exampleId === 'custom') advanceCustom(expected, PEOPLE);
      else advance(expected, command);
      if (!isDeepStrictEqual(gameplayState(expected), gameplayState(after))
        || !isDeepStrictEqual(present({ ...after, entries: afterEntries }), present(after))) fail('INVALID_TURN', '存档行动楼层与已送达剧情不一致。');
      row = nextRow; before = after;
    }
    if (pendingJournal) this.#journalPending = pendingJournal;
  }
  #write(state, kind, { action, seed, records = [], decisionStates = [], director, runPolicyRequest, hiddenSupplyRoot = false, hiddenSupplyMode = 'off', magicPublication, durablePublication, swapPublication, customRoot = false, customCommand, baselineMagic = false, cancelObsolete = true, stageDelivery = true } = {}) {
    const writeStartedAt = performance.now();
    this.#journalPending = null;
    if (magicPublication && durablePublication) fail('INVALID_DOMAIN_STATE', '互斥魔法发布。');
    const publication = magicPublication || durablePublication || swapPublication;
    // Validate before adding current metadata; never launder a future format or
    // a mismatched content digest by overwriting its version first.
    const restoredMagicSource = ['load', 'rewind'].includes(kind) && state.restoredFrom
      ? this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE generation=? AND revision=?')
        .get(state.restoredFrom.generation, state.restoredFrom.revision) : null;
    const validatedRestore = restoredMagicSource && this.#magicCheckpoint(parseState(restoredMagicSource.snapshot_json));
    if (kind === 'run_policy') {
      // The actual parent is already a sealed checkpoint. DomainStore verifies
      // the entire candidate differs from it only by the administrative revision.
      this.#validateRestored(this.#state());
      validateStateEnvelope(state); validateAgentStateEnvelope(state);
    } else if (publication || validatedRestore || customRoot || customCommand) { validateStateEnvelope(state); validateAgentStateEnvelope(state); }
    else this.#validateRestored(state);
    v0Timing('write:validate', writeStartedAt);
    const previousState = this.#domainReady ? this.#state() : undefined;
    if (kind === 'new_game') assertInitialBoundaryTransition({ ...state, entries: [] }, state);
    if (previousState && !['initial', 'new_game', 'load', 'rewind', 'run_policy'].includes(kind)) {
      const effective = this.#domain.effectiveRunPolicy(previousState)?.pin;
      if (effective?.source.adoptedCommitRef) assertEffectiveBoundaryTransition(previousState, state, effective, { magic: kind === 'magic_cast' });
      else assertInitialBoundaryTransition(previousState, state, { magic: kind === 'magic_cast' });
    }
    const inheritedMagic = !publication && previousState && !['new_game', 'load', 'rewind'].includes(kind) ? this.#magicAt(previousState) : null;
    // New text-pin ordinary acts initialize one legal host baseline from the
    // exact previous commit. It is published with this same act commit, never
    // as a separate activation, and never for a custom player's native lane.
    const baseline = baselineMagic && !publication && !inheritedMagic && kind === 'act'
      && !customRoot && previousState?.exampleId === 'agent' && !hasCaseOne(previousState) && !state.magic
      ? this.#baselineMagic(previousState) : null;
    if (baselineMagic && !publication && !inheritedMagic && kind === 'act' && !customRoot && !customCommand
      && previousState?.exampleId === 'agent' && !hasCaseOne(previousState) && !baseline)
      fail('MAGIC_HOST_INITIALIZATION_REQUIRED');
    const storyMagic = publication?.projection || (inheritedMagic ? refreshHostMagic(state, inheritedMagic,
      { ...this.#domain.scope(previousState), generation: state.generation, revision: state.revision }, { domainStore: this.#domain, sourceState: previousState }) : null);
    const rootFacts = !storyMagic && kind === 'new_game' ? hostRootStoryFacts(state) : undefined;
    const storyFacts = storyMagic ? hostStoryFacts({ ...state, magic: storyMagic }) : rootFacts;
    if (storyFacts && previousState && !rootFacts) {
      const newKeys = new Set([...state.entries.slice(previousState.entries.length),
        ...(state.agentAutonomy?.events || []).slice(previousState.agentAutonomy?.events?.length || 0)]
        .map(entry => entry.observationKey));
      storyFacts.waking = storyFacts.waking.filter(row => row.evidenceKey && newKeys.has(row.evidenceKey));
      storyFacts.deaths = storyFacts.deaths.filter(row => {
        const bodyActorId = row.bodyId ? storyMagic.identity.bodies[row.bodyId]?.actorId : row.actorId;
        const old = previousState.caseRuntime?.conditionsByActor?.[bodyActorId];
        return !['dead', 'executed'].includes(old?.status || old);
      });
    }
    if (storyFacts && magicPublication?.receipt?.status === 'activated') {
      // Activation is not a waking event. Do not mint morning anchors merely
      // because no player floor exists at this same clock.
      storyFacts.waking = [];
    }
    if (previousState) this.#domain.assertHead(previousState);
    state.stateFormatVersion = STATE_FORMAT_VERSION;
    if (state.exampleId === 'custom') state.customSourceHash = CUSTOM_SOURCE_HASH;
    const json = JSON.stringify(state);
    const event = this.#db.prepare('INSERT INTO prologue_events(generation,revision,kind,state) VALUES(?,?,?,?)')
      .run(state.generation, state.revision, kind, json);
    const domainInput = { legacyEventId: Number(event.lastInsertRowid), kind, state, previousState, action, seed, records, decisionStates, storyFacts, ...(runPolicyRequest ? { runPolicyRequest } : {}), ...(hiddenSupplyRoot ? { hiddenSupplyRoot: true } : {}), ...(kind === 'act' && hiddenSupplyMode !== 'off' ? { hiddenSupplyMode } : {}) };
    const magicResult = publication ? { state: publication.projection, receipt: publication.receipt,
      events: publication.events || [] } : undefined;
    const preSealMagic = magicPublication && kind === 'magic_cast';
    if (state.storyLifeVersion === 1 && state.caseOutcome?.status === 'pending'
      && state.caseOutcome.subjectId === 'hiro' && state.agentActions?.at(-1)?.storyLifeVersion !== 1)
      fail('MAGIC_HOST_RULE_GATED', '此宿主行动尚未接入死亡反应；没有提交未决死亡。');
    const recordStartedAt = performance.now();
    const lifeEligible = this.#domainReady && kind === 'act' && state.storyLifeVersion === 1
      && state.agentActions?.at(-1)?.storyLifeVersion === 1 && inheritedMagic && !swapPublication && !customCommand;
    // A custom act must be one Domain record. When story life is active, hand
    // the same inherited projection to the custom transaction instead of
    // eagerly committing the life act first and then reusing its old parent.
    const lifePublication = !customCommand && lifeEligible
      ? this.#domain.recordWithStoryLife(domainInput, inheritedMagic) : null;
    const customRecord = customCommand && this.#domainReady && kind === 'act'
      ? this.#domain.recordWithCustomAbilityAct(domainInput, customCommand, {
        ...(baseline ? { magicBaseline: { projection: baseline.magic } } : {}),
        ...(lifeEligible ? { life: inheritedMagic } : {}) }) : null;
    if (customCommand && kind === 'act' && !customRecord) fail('INVALID_DOMAIN_STATE');
    const commit = customRoot ? this.#domain.recordWithCustomRoot(domainInput) : customRecord ? customRecord.commit
      : customCommand ? this.#domain.recordWithCustomAbilityUse(domainInput, customCommand)
      : lifePublication?.commit || (!this.#domainReady ? null : swapPublication
      ? this.#domain.recordWithSwapLifecycle(domainInput, swapPublication) : durablePublication
      ? this.#domain.recordWithDurableMemoryAcquisition(domainInput, { executionRef: DURABLE_EXECUTION_REF,
        command: durablePublication.command, result: magicResult, plan: durablePublication.plan }) : preSealMagic
      ? this.#domain.recordWithMagic(domainInput, { command: magicPublication.command, result: magicResult,
        accessChanges: magicPublication.accessChanges || [], sharedMemories: magicPublication.sharedMemories || [],
        ...(magicPublication.commandBinding ? { commandBinding: magicPublication.commandBinding } : {}) })
      : baseline ? this.#domain.recordWithMagicBaseline(domainInput, { projection: baseline.magic })
      : this.#domain.record(domainInput));
    v0Timing('write:record', recordStartedAt);
    v0Timing('write:through-record', writeStartedAt);
    if (this.#journalPending && commit && this.#journalPending.generation === state.generation
      && this.#journalPending.revision === state.revision && this.#journalPending.turnCount === state.turnIds.length) {
      this.#journalTrust = { commitRef: commit.commit_ref, turnCount: state.turnIds.length };
    }
    this.#journalPending = null;
    if (magicPublication && !preSealMagic) this.#magicRepository.append({ branchId: commit.branch_id, commitRef: commit.commit_ref,
      expectedHead: magicPublication.projection.headCommitRef, command: magicPublication.command, result: magicResult });
    if (this.#domainReady && state.exampleId === 'agent') {
      const scene = kind === 'act' && state.agentActions?.length !== previousState?.agentActions?.length
        && state.agentActions?.at(-1)?.type === 'scene' ? state.agentActions.at(-1) : null;
      this.#directorPlanning.publish(this.#domain.scope(state), state, { jobId: scene?.jobId ?? null });
    }
    this.#db.prepare('INSERT INTO prologue_head(id,state) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state').run(json);
    if (this.#domainReady) this.#directorCandidates.publish(this.#domain.scope(state), state, director);
    if (this.#domainReady && cancelObsolete && ['load', 'rewind', 'new_game', 'story_rewind'].includes(kind)) this.#agentJobs.cancelObsolete(this.#domain.scope(state));
    if (this.#domainReady && guardEnabled(state)) {
      const opportunity = guardOpportunity(state);
      if (opportunity) this.#dice.offer(this.#domain.scope(state), opportunity, createdPlayerId(state));
    }
    if (stageDelivery) { v0Timing('write:preview', writeStartedAt); this.#delivery.stage(this.#view(state)); v0Timing('write:view', writeStartedAt); }
    v0Timing('write:total', writeStartedAt);
    return customRecord?.reaction || lifePublication?.reaction || null;
  }
  #publishStoryReaction(state, reaction) {
    if (!reaction) return state;
    if (reaction.command.definitionRef !== 'hiro:basic@1' || reaction.command.activation !== 'reaction'
      || reaction.projection.grants.filter(row => row.actorId === 'hiro' && row.enabled
        && magicDefinition(row.definitionRef)?.operation === 'death-rewind').length !== 1)
      fail('INVALID_STORY_FORK', '当前自动死亡路径仅支持唯一已审核的基本回溯。');
    const args = buildHostStoryRequest({ ...state, magic: reaction.projection }, this.#domain, {
      actorId: 'hiro', useId: reaction.command.useId, anchorId: reaction.anchorId, memoryWhitelist: reaction.memoryWhitelist });
    if (!isDeepStrictEqual(args.request, reaction.request)) fail('INVALID_STORY_FORK', '自动反应与领域回溯请求不一致。');
    const active = args.request.activation === 'activate-player-fork';
    // Reserve the compatibility event ID before DomainStore records the fork;
    // no second #write/record is permitted after applyStoryFork.
    const legacyEventId = active ? Number(this.#db.prepare('SELECT coalesce(max(id),0)+1 AS id FROM prologue_events').get().id) : undefined;
    const fork = this.#domain.applyStoryFork({ ...args, previousState: state, ...(active ? { legacyEventId } : {}) });
    if (!fork.active) return state;
    const restored = fork.state; const json = JSON.stringify(restored);
    this.#db.prepare('INSERT INTO prologue_events(id,generation,revision,kind,state) VALUES(?,?,?,?,?)')
      .run(legacyEventId, restored.generation, restored.revision, 'story_rewind', json);
    this.#directorPlanning.publish(this.#domain.scope(restored), restored);
    this.#db.prepare('UPDATE prologue_head SET state=? WHERE id=1').run(json);
    this.#domain.assertHead(restored);
    const restoredMagic = this.#magicAt(restored);
    const restoredIdentity = restoredMagic?.identity || hostRootStoryFacts(restored)?.identity;
    if (!restoredIdentity || !isDeepStrictEqual(restoredIdentity, fork.restoredIdentity))
      fail('INVALID_STORY_FORK', '恢复的魔法身体／心智投影不属于实际晨醒锚点。');
    return restored;
  }
  #bindSlot(id, version, state) {
    this.#domain.bindSlot(id, version, state);
    if (state.exampleId === 'agent') this.#dice.bindSave(id, version, this.#domain.scope(state));
  }
  #insertTurn(id, text, before, after, { diceBound = false } = {}) {
    if (!diceBound && this.#domainReady && before.exampleId === 'agent') this.#dice.bindTurn(id, this.#domain.scope(before));
    this.#db.prepare('INSERT INTO prologue_turns VALUES(?,?,?,?,?,?)').run(id, text, JSON.stringify(before), JSON.stringify(after.entries), before.entries.length, after.entries.length);
  }
  #view(state, { compactOrdinaryHistory = false, ordinaryAnchorMemo } = {}) {
    const viewStartedAt = performance.now();
    let viewSegmentAt = viewStartedAt;
    const markPublicView = name => { if (!V0_SRC_TIMING_LOG) return; v0Timing(name, viewSegmentAt); viewSegmentAt = performance.now(); };
    if (state.caseRuntime?.occupiedBody) this.#domain.assertOccupiedBodyWorld(state);
    const presentation = state.exampleId === 'custom' ? customPresentation(state) : null;
    let delivered = presentation?.entries || (state.exampleId === 'agent' ? agentStoryEntries(state, { projectUnknownSpeakers: true })
      : state.exampleId === 'prototype' ? prototypeStoryEntries(state) : legacyStoryEntries(state));
    const dossierOwner = createdPlayerId(state);
    const dossierSources = isKnowledgeGated(state) && this.#domainReady
      ? this.#domain.witchBookKnowledge(state, dossierOwner)
      : { authorizedSourceKeys: new Set(), ownRecollections: [], factsBySubject: {}, statementsBySubject: {} };
    const knownPerson = person => {
      if (isKnowledgeGated(state)) {
        const facts = [...(dossierSources.factsBySubject[person.id] || [])];
        if (person.id === dossierOwner && isCreatedCustom(state)) {
          facts.push({ field: 'age', value: state.creation.character.age,
            text: state.creation.character.age + '岁。', sourceKey: 'own-player-creation:age', acquiredAt: 0 });
        }
        return ownerWitchBookProfile(state, dossierOwner, person.id, {
          facts, statements: dossierSources.statementsBySubject[person.id] || [],
          authorizedSourceKeys: dossierSources.authorizedSourceKeys,
          ownRecollections: person.id === dossierOwner ? dossierSources.ownRecollections : [],
        }) || { id: person.id, name: person.name, profileParagraphs: [] };
      }
      const profile = agentProfile(person.id);
      const result = { id: person.id, name: person.name };
      if (profile) {
        if (profile.prisonerNumber) result.prisonerNumber = profile.prisonerNumber;
        if (profile.role) result.role = profile.role;
        result.introduction = profile.introduction;
        result.profileParagraphs = [...publicAgentProfile(person.id).paragraphs];
        if (publicAgentProfile(person.id).age) result.age = publicAgentProfile(person.id).age;
      } else if (isCreatedCustom(state) && person.id === createdPlayerId(state)) {
        result.prisonerNumber = CUSTOM_PRISONER_NUMBER;
        result.introduction = [
          `${state.creation.character.age}岁。`, conciseProfileConcept(state.creation.character.concept),
        ].filter(Boolean).join('');
        result.age = state.creation?.character?.age ?? 17;
        result.profileParagraphs = [`${result.age}岁。`, conciseProfileConcept(state.creation?.character?.concept)].filter(Boolean);
        if (isKnowledgeGated(state)) result.profileParagraphs.push(...(ownerWitchBookProfile(state,
          createdPlayerId(state), person.id)?.profileParagraphs || []));
      }
      return result;
    };
    // The visible roster follows this timeline's acquaintances and delivered
    // announcements, while each dossier remains independent of quoted speech.
    const knownIds = isKnowledgeGated(state) ? knownIdentityIds(state, createdPlayerId(state)) : [...state.known];
    if (isKnowledgeGated(state)) for (const subjectId of new Set([
      ...Object.keys(dossierSources.statementsBySubject), ...Object.keys(dossierSources.factsBySubject),
    ])) {
      if (knownIds.includes(subjectId)) continue;
      const entry = ownerWitchBookProfile(state, dossierOwner, subjectId, {
        facts: dossierSources.factsBySubject[subjectId] || [], statements: dossierSources.statementsBySubject[subjectId] || [],
        authorizedSourceKeys: dossierSources.authorizedSourceKeys,
      });
      if (entry) knownIds.push(subjectId);
    }
    if (!knownIds.includes('warden') && (isKnowledgeGated(state) || delivered.some(entry => entry.speakerId === 'warden'
      || /^典狱长(?:（屏幕）)?$/u.test(entry.speaker)))) knownIds.push('warden');
    // Only this branch's anchors are authoritative. Events, saves and narrative
    // text may contain abandoned futures or places the player has never visited.
    const unlockedLocations = new Set();
    const remember = location => {
      if (typeof location === 'string' && location.trim()) unlockedLocations.add(state.exampleId === 'agent' ? agentLocationLabel(location.trim()) : location.trim());
    };
    // Parse each potentially large anchor once, then share it across the map,
    // scene frames and daily history. Never read abandoned turns or event logs.
    markPublicView('view:dossier');
    const befores = new Map();
    const compact = compactOrdinaryHistory && state.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION
      && state.creation?.playerMode === 'original' && state.creation.playPolicy?.cases === 'excluded'
      && !state.caseOne && !state.storyArc && !state.caseRuntime?.procedure && !state.caseRuntime?.occupiedBody
      && !state.customAbilitySetup && !state.agentActions?.some(action => action.type === 'case_execution');
    const turnAnchor = this.#db.prepare('SELECT id,text,entry_start,entry_end,before_state FROM prologue_turns WHERE id=?');
    const turnHeader = compact ? this.#db.prepare('SELECT id,text,entry_start,entry_end FROM prologue_turns WHERE id=?') : null;
    const ordinaryAnchor = compact ? this.#db.prepare(publicOrdinaryAnchorSQL) : null;
    const turns = (state.turnIds || []).map((id, index) => {
      const head = index > 0 ? turnHeader?.get(id) : undefined;
      // Testimony display authenticates the original case command and must
      // see the full checkpoint, even in an unexpected mixed historical view.
      const compactBytes = head && !parseTestimonyCommand(head.text)
        ? this.#readOrdinaryAnchor(ordinaryAnchor, id, ordinaryAnchorMemo) : null;
      const row = compactBytes ? head : turnAnchor.get(id);
      const before = parseState(compactBytes || row.before_state); befores.set(id, before);
      remember(before.location);
      const action = state.exampleId === 'agent' ? state.agentActions[index] : undefined;
      return { id: row.id, floor: index + 1, text: this.#testimonyInputDisplay(before, row.text, action), entryStart: presentation ? presentation.boundaries[row.entry_start] : row.entry_start, entryEnd: presentation ? presentation.boundaries[row.entry_end] : row.entry_end,
        ...(guardHostCaption(action) || action?.type === 'case_execution' || action?.privateReflectionVersion === 1 ? { regeneratable: false } : {}),
        ...(action?.type === 'scene' ? {
          ...(action.privateReflectionVersion !== 1 ? { scene: sceneSummary(state.entries.slice(row.entry_start, row.entry_end), action.document.stopReason, action) } : {}),
          ...(hasIntentRuntime(state.agentRuntimeRevision) && action.actionOutcome ? { actionOutcome: structuredClone(action.actionOutcome) } : {}) } : {}) };
    });
    remember(state.location);
    const readBefore = id => befores.get(id);
    if (state.exampleId === 'agent') delivered = projectExecutionEntries({ entries: delivered, turns, readBefore, head: state,
      playerId: createdPlayerId, actorName: (snapshot, id) => actorForState(snapshot, id)?.name });
    markPublicView('view:anchors');
    const rawPresentation = projectScenePresentation({ turns, entries: state.entries, head: state, readBefore });
    const display = state.exampleId === 'agent'
      ? projectOwnerSceneDisplay({ turns, entries: delivered, presentation: rawPresentation, ownerId: createdPlayerId(state) })
      : { turns, entries: delivered, presentation: rawPresentation };
    delivered = display.entries;
    const scenePresentation = display.presentation;
    // Time-neutral rule activation is neither a player floor nor a daily
    // story moment. Apply the same exclusion to both public projections.
    const visibleTurns = display.turns.filter((turn, index) => !guardActivation(state.agentActions?.[index]))
      .map((turn, index) => ({ ...turn, floor: index + 1 }));
    const dailyHistory = projectDailyHistory({ head: state, turns: visibleTurns, entries: delivered, readBefore,
      presentation: scenePresentation, locationLabel: state.exampleId === 'agent' ? agentLocationLabel : undefined });
    // View-only hydration: active magic is projected into a detached state for
    // the player scene, never persisted and never returned as raw magic.
    markPublicView('view:history');
    const sceneMagic = state.exampleId === 'agent' ? this.#magicAt(state) : null;
    const playView = state.exampleId === 'agent'
      ? agentPlayView(runtimeItemProjection(sceneMagic ? { ...state, magic: sceneMagic } : state)) : undefined;
    const reaction = state.exampleId === 'agent' ? guardView(state) : undefined;
    if (reaction?.resolution) {
      const index = state.agentActions.findLastIndex(action => action.type === 'guard_dice_resolution'
        && action.encounterId === reaction.resolution.encounterId);
      // Only the unacknowledged result head needs a presentation gate. A later
      // explicit action proves the player has continued; never crop its future
      // back to an old dice screen on a fresh page or another browser.
      if (index !== state.agentActions.length - 1 || !display.turns[index]) reaction.resolution = null;
      else reaction.resolution.entryIndex = Math.max(0, display.turns[index].entryStart - 1);
    }
    v0Timing('view', viewStartedAt);
    // Materialize the same public inputs in the old return-expression order.
    // Authority, branching and reads stay here; final shape/precedence do not.
    const viewUnlockedLocations = [...unlockedLocations];
    // Match this creation, not a global registry or another run/save.
    const mapLayout = state.exampleId === 'agent' ? { hasPlayerCell: state.creation?.playerMode === 'custom'
      || state.creation?.opening?.locationId === 'PLAYER_CELL' } : undefined;
    const exampleId = state.exampleId || 'emma';
    const bgm = bgmForScene(state);
    const player = state.creation ? { ...knownPerson(actorForState(state, createdPlayerId(state))),
      custom: isCreatedCustom(state),
      ...(isCreatedCustom(state) ? { impressionColor: state.creation.character.impressionColor,
        profile: structuredClone(state.creation.character),
        ...(state.playerAvatarId ? { avatarUrl: avatarUrl(state.playerAvatarId) } : {}) } : {}) }
      : state.exampleId === 'custom' ? { ...knownPerson(CUSTOM_PLAYER), impressionColor: state.playerImpressionColor || '#a0beeb',
        ...(state.playerAvatarId ? { avatarUrl: avatarUrl(state.playerAvatarId) } : {}) } : knownPerson(PEOPLE[0]);
    const creationView = state.creation ? { loop: state.creation.loop, playerMode: state.creation.playerMode,
      playerKnowledge: ownStartingKnowledge(state),
      ...(isCreatedCustom(state) ? { playerAttributes: { ...structuredClone(state.creation.character.attributes),
        modifiers: Object.fromEntries(Object.entries(state.creation.character.attributes.scores).map(([id, score]) => [id, attributeModifier(score)])) } } : {}) } : undefined;
    const generation = state.generation, revision = state.revision, phase = state.phase;
    const worldTime = state.worldTime, location = state.exampleId === 'agent' ? agentLocationLabel(state.location) : state.location;
    const characters = knownIds.map(id => {
        const person = state.exampleId === 'agent' ? actorForState(state, id) : id === 'xiao' ? CUSTOM_PLAYER
          : PEOPLE.find(person => person.id === id) || agentProfile(id);
        const result = knownPerson(person);
        // 致命伤害不等于玩家可确认永久死亡；此时不再返回过时的 alive:true。
        const caseCondition = hasCaseOne(state) ? caseObservedCondition(state, id)
          : hasCaseRuntime(state) ? runtimeObservedCondition(state, id, createdPlayerId(state)) : undefined;
        if (result.observedCondition && isKnowledgeGated(state)) { /* Preserve attributed notice, not a fabricated personal sighting. */ }
        else if (caseCondition) result.observedCondition = caseCondition;
        else if (id === 'hiro' && state.hiroStatus !== 'alive' && !isKnowledgeGated(state)) result.observedCondition = '目击斩首造成的致命伤害';
        else if (!isKnowledgeGated(state)) result.alive = true;
        if (!isKnowledgeGated(state) && result.observedCondition) {
          const condition = result.observedCondition;
          const paragraph = condition.includes('执行') ? '经审判认定为魔女，已被处刑。'
            : condition.includes('致命伤害') ? '遭受了致命伤害。' : '已死亡。';
          result.profileParagraphs = [...(result.profileParagraphs || []), paragraph];
        }
        return result;
      });
    markPublicView('view:characters');
    const publicAssemblyEntryId = this.#domainReady ? this.#domain.playerAssemblyNoticeEntry(state, dossierOwner) : null;
    markPublicView('view:assembly');
    const entries = structuredClone(delivered.map(({ speakerId, audienceIds, addresseeIds, communication, observationKey, openingSource, learnedAt, textByActor, receptionIntroduction, hostMagicEvent, magicObservation, storyTimelineEvent, executionScene, mediaAnchor, conversationRoomId, publicEvent: _undeliveredEvent, ...entry }, index) => {
      if (publicAssemblyEntryId !== null && entry.id === publicAssemblyEntryId && entry.delivery === 'speech'
        && speakerId === 'warden' && audienceIds?.includes(dossierOwner)) return { ...entry, publicEvent: PUBLIC_ASSEMBLY_CATEGORY };
      if (state.exampleId !== 'agent' || entry.delivery !== 'action') return entry;
      const unknownAppearance = speakerId && /^[?？]+$/u.test(entry.speaker) && entry.text.includes('走向')
        ? actorForState(state, speakerId)?.appearance : undefined;
      const exchange = playerExchangeForAction(delivered[index], delivered[index - 1], delivered[index + 1], dossierOwner);
      return playerViewEntryProse(entry, { speakerId, playerId: dossierOwner, unknownAppearance, exchange });
    }));
    const baseSuggestions = state.exampleId === 'agent' ? playView.suggestions : state.exampleId === 'prototype' ? prototypeSuggestions(state)
      : state.exampleId === 'custom' ? customSuggestions(state) : [...OPTIONS[state.phase]];
    // Capture public fragment values where their old object spreads evaluated.
    const prototypeViewFields = state.exampleId === 'prototype' ? { ...prototypeView(state) } : undefined;
    const playViewFields = { ...(playView || {}) };
    // Keep both original calls, including selection vs the second call's value.
    const hasGuardSuggestions = state.exampleId === 'agent' && guardSuggestions(state);
    const selectedGuardSuggestions = hasGuardSuggestions ? guardSuggestions(state) : undefined;
    const guardControls = state.exampleId === 'agent' ? { guardReaction: reaction,
      guardRulesUpgrade: this.#guardUpgradeView(state) } : {};
    const completed = state.completed;
    const summaryMarker = isKnowledgeGated(state) ? { profileSummaryDirty: false } : {};
    const magicView = state.exampleId === 'agent' && this.#domainReady ? { magic: this.#magicView(state, sceneMagic, compact ? ordinaryAnchorMemo?.relationshipActions : undefined) } : {};
    markPublicView('view:publicFields');
    const saveSlots = this.#saveCards(compact ? ordinaryAnchorMemo : undefined);
    markPublicView('view:saveCards');
    const prototypeNotice = hasCaseOne(state) ? CASE_ONE_NOTICE : state.creation ? CREATED_NOTICE : state.exampleId === 'agent' ? AGENT_SCENARIO_NOTICE : state.exampleId === 'prototype' ? PROTOTYPE_NOTICE : state.exampleId === 'custom' ? CUSTOM_NOTICE : NOTICE;
    const branchMarker = state.fixtureBranch ? { branchNotice: '希罗放下了拨火棍。眼前的危机暂时平息。' } : {};
    return assemblePlayerQueryView({
      turns: visibleTurns, dailyHistory, scenePresentation, unlockedLocations: viewUnlockedLocations,
      ...(mapLayout ? { mapLayout } : {}), exampleId, bgm, player, creationView,
      generation, revision, phase, worldTime, location, characters, entries, baseSuggestions,
      prototypeView: prototypeViewFields, playView: playViewFields,
      ...(hasGuardSuggestions ? { guardSuggestions: selectedGuardSuggestions } : {}),
      ...guardControls, completed, ...summaryMarker, ...magicView, saveSlots, prototypeNotice, ...branchMarker,
    });
  }
  #readOrdinaryAnchor(statement, id, memo) {
    if (memo?.rows.has(id)) return memo.rows.get(id);
    const bytes = statement.get(EVENT_DIRECTOR_RUNTIME_REVISION, id)?.snapshot;
    // Only compact projection strings, never full anchors, parsed/shared DTOs,
    // failures or case/checkpoint evidence. If this fills, old records still
    // take the same checked SQL path; the bound is not a visibility limit.
    if (memo && typeof bytes === 'string' && memo.rows.size < 192 && memo.units + bytes.length <= 4 * 1024 * 1024) {
      memo.rows.set(id, bytes); memo.units += bytes.length;
    }
    return bytes;
  }
  #saveCards(memo) {
    if (memo) {
      // This is a detached display card, not a load anchor. At runtime the
      // Host changes a persisted slot only by versioned mutation; the one
      // historical migration that rewrites bytes runs before any HTTP read.
      // A foreign same-version SQL write invalidates the enclosing SQLite
      // data_version memo, including a write racing its read transaction.
      const prior = memo.cards; const next = new Map();
      const state = this.#db.prepare('SELECT state FROM prologue_saves WHERE id=?');
      const rows = this.#db.prepare('SELECT id,name,version FROM prologue_saves ORDER BY rowid').all().map(row => {
        const cached = prior.get(row.id);
        const card = cached?.version === row.version && cached?.name === row.name ? cached
          : saveMetadata({ ...row, state: state.get(row.id).state });
        if (next.size < 64) next.set(row.id, card);
        return { ...card };
      });
      memo.cards = next;
      return rows;
    }
    // Always re-read exact row bytes. A save may be repaired or change on a
    // second SQLite connection without a new version. These are only flat
    // display cards, never load/restore state or an authority decision.
    const next = new Map();
    let codeUnits = 0;
    const rows = this.#db.prepare('SELECT id,name,state,version FROM prologue_saves ORDER BY rowid').all();
    const publicCards = rows.map(row => {
      const prior = this.#saveCardReads.get(row.id);
      const hit = prior && prior.bytes === row.state && prior.value.name === row.name && prior.value.version === row.version;
      const value = hit ? prior.value : saveMetadata(row);
      const units = typeof row.state === 'string' ? row.state.length : 0;
      if (next.size < 64 && units > 0 && codeUnits + units <= 16 * 1024 * 1024) {
        codeUnits += units;
        next.set(row.id, hit ? prior : { bytes: row.state, value });
      }
      return { ...value };
    });
    this.#saveCardReads = next;
    return publicCards;
  }
  /** Retired display-summary API. Existing cache rows remain intact, but the
   * original dossiers are projected without model work or cache writes. */
  profileSummaryPlan() {
    return this.#transaction(() => {
      const state = this.#state();
      return { version: PROFILE_SUMMARY_VERSION, scope: { generation: state.generation, revision: state.revision },
        digest: createHash('sha256').update('[]').digest('hex'), profiles: [] };
    }, { readOnly: true });
  }
  saveProfileSummaries() {
    return { saved: 0, processed: 0, profileSummaryDirty: false };
  }
  view() { return this.#transaction(() => this.#view(this.#state()), { readOnly: true, reuseVerifiedCommitBytes: true, reuseRelationshipProjection: true }); }
  // Host-only repository entry points. There is intentionally no HTTP route
  // accepting arbitrary actors, branch IDs or knowledge watermarks.
  executionScope() { return this.#transaction(() => this.#domain.scope(this.#state()), { readOnly: true }); }
  actorCognition(actorId) { return this.#transaction(() => this.#domain.readCognition(this.#state(), actorId), { readOnly: true }); }
  actorDecisionState(actorId) { return this.#transaction(() => this.#domain.readDecisionState(this.#state(), actorId), { readOnly: true }); }
  // Out-of-story observer: server-selected roster and the current committed
  // head only. Never attach this DTO to #view(), receipts or model contexts.
  developerActors() {
    return this.#transaction(() => {
      const state = this.#state();
      const actors = state.exampleId === 'agent' ? actorsForState(state)
        : [...PEOPLE, ...(state.exampleId === 'custom' ? [CUSTOM_PLAYER] : [])];
      const playerId = createdPlayerId(state);
      const subjective = this.#domain.readDecisionStates(state,
        state.exampleId === 'agent' ? actors.filter(actor => actor.id !== playerId).map(actor => actor.id) : []);
      return projectDeveloperActors({ state, actors, playerId,
        readDecisionState: actorId => {
          const value = subjective.get(actorId);
          if (!value || !['warden', 'meruru'].includes(actorId)) return value;
          const ownPublic = row => !row.sourceObservationIds?.some(isPrivateSupplyObservationId)
            && !isPrivateSupplyObservationId(row.sourceObservationId);
          return { ...value, beliefs: value.beliefs.filter(ownPublic), goals: value.goals.filter(ownPublic),
            relationships: value.relationships.filter(ownPublic) };
        },
        locationOf: actorId => actorId === 'warden' ? undefined : actorRoom(state, actorId), handleFor: actorHandle,
        ...(state.exampleId === 'agent' ? { runtimeRevision: runtimeRevisionForState(state),
          readSocialRequests: actorId => (state.agentAutonomy?.conversation?.requests || [])
            .filter(request => request.recipientId === actorId).map(request => ({ id: request.id,
              senderHandle: actorHandle(actorId, request.senderId), status: request.status, deadline: request.expiresAt,
              sourceObservationId: request.sourceObservationId })),
        } : {}),
      });
    }, { readOnly: true });
  }
  searchActorMemory(actorId, query, options = {}) {
    return this.#transaction(() => this.#domain.searchCognition(this.#state(), actorId, query, options), { readOnly: true });
  }
  prepareActorContext(actorId, options = {}) {
    if (!options || typeof options !== 'object' || isProxy(options) || Object.getPrototypeOf(options) !== Object.prototype
      || Reflect.ownKeys(options).some(key => !['role', 'query', 'recentLimit', 'recallLimit', 'continuityLimit', 'maxBytes', 'compression', 'includeBackground'].includes(key)
        || !Object.hasOwn(Object.getOwnPropertyDescriptor(options, key), 'value'))) {
      fail('INVALID_RAG_OPTIONS', 'RAG 验证只能指定话题、角色任务与检索预算，不能指定世界或分支边界。');
    }
    const { role = 'roleplay', query = '', recentLimit = 6, recallLimit = 12, continuityLimit = 4, maxBytes = 12000, compression = 'auto', includeBackground = true } = options;
    return this.#transaction(() => {
      const state = this.#state();
      const input = state.exampleId === 'agent' ? decisionActorInput(state, actorId,
        this.#decisionStateAt(null, state, {}, actorId)) : prototypeActorInput(state, actorId);
      const retrieval = this.#domain.retrieveCognition(state, actorId, { query, recentLimit, recallLimit, continuityLimit, includeBackground });
      if (state.exampleId === 'agent') {
        const workingSourceObservations = this.#decisionSourcesAt(null, state, {}, actorId);
        if (role === 'roleplay') {
          return assembleDecisionContext({ retrieval, ...input, workingSourceObservations,
            acquiredEvidenceEntries: actorPerception(state, actorId).case?.knownEvidence || [],
          }, { maxBytes, compression });
        }
        // The data-agent inspection keeps its historical full-source contract;
        // only autonomous roleplay uses optional working-source compression.
        const full = [...new Map([...workingSourceObservations, ...retrieval.recentObservations]
          .map(observation => [observation.id, observation])).values()];
        return assembleRagContext({ retrieval: { ...retrieval, recentObservations: full }, role, ...input }, { maxBytes, compression });
      }
      return assembleRagContext({ retrieval, role, ...input }, { maxBytes, compression });
    }, { readOnly: true });
  }
  // Host control operations, never model tools or browser acknowledgements.
  claimPlayerDelivery(options = {}) {
    return this.#transaction(() => this.#delivery.claim(this.#state(), options));
  }
  completePlayerDelivery(lease) {
    return this.#transaction(() => this.#delivery.complete(this.#state(), lease));
  }
  releasePlayerDelivery(lease) {
    return this.#transaction(() => this.#delivery.release(this.#state(), lease));
  }
  playerDeliveryDelay() {
    return this.#transaction(() => this.#delivery.nextDelay(this.#state()), { readOnly: true });
  }
  playerView() {
    return this.#transaction(() => this.#playerViewAt(this.#state()),
      { readOnly: true, reuseVerifiedCommitBytes: true, reuseRelationshipProjection: true });
  }
  httpPlayerView() {
    // Show delivery and retry controls from the same verified snapshot.
    // The Engine's only writer to prologue_turns inserts a fresh immutable ID.
    // SQLite data_version also detects changes from other connections, even for
    // an UPDATE preserving the ID/revision. Sample outside each transaction:
    // a concurrent commit between the observation and snapshot is never allowed
    // to publish a cached DTO. Retry once without the memo in that case.
    const dataVersion = () => this.#db.prepare('PRAGMA main.data_version').get().data_version;
    const version = dataVersion();
    const old = this.#httpOrdinaryAnchorMemo;
    const memo = old?.version === version ? old : { version, rows: new Map(), units: 0, cards: new Map(), relationshipActions: new Map() };
    this.#httpOrdinaryAnchorMemo = undefined;
    const candidate = this.#httpPlayerViewInSnapshot(memo);
    if (dataVersion() !== version) return this.#httpPlayerViewInSnapshot();
    this.#httpOrdinaryAnchorMemo = memo;
    return candidate;
  }
  #httpPlayerViewInSnapshot(ordinaryAnchorMemo) {
    return this.#transaction(() => {
      const head = this.#state();
      const httpViewAt = performance.now();
      const view = this.#playerViewAt(head, { compactOrdinaryHistory: true, ordinaryAnchorMemo });
      v0Timing('httpView:player', httpViewAt);
      const httpRuntimeAt = performance.now();
      const agentRuntime = this.#agentRuntimeAt(head);
      v0Timing('httpView:runtime', httpRuntimeAt);
      return agentRuntime ? { ...view, agentRuntime } : view;
    }, { readOnly: true, reuseVerifiedCommitBytes: true, reuseRelationshipProjection: true, reuseExactPlanReads: true });
  }
  #playerViewAt(head, viewOptions) {
    // A lagging delivery must not show an abandoned future or old save cards.
    try {
      // Music, labels, layout and current testimony controls are disposable
      // presentation policy, not durable story facts. Refresh older projections
      // without rewriting payloads, task inputs or historical receipts.
      const delivered = this.#delivery.read(head);
      const roomLabels = head.exampleId === 'agent' ? {
        location: agentLocationLabel(delivered.location),
        unlockedLocations: (delivered.unlockedLocations || []).map(agentLocationLabel),
        // The current guard projection (always present for an agent view)
        // owns these suggestions in the delivered merge below.
        ...(viewOptions?.compactOrdinaryHistory && head.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION
          && head.itemPolicyVersion === 2 && head.creation?.playerMode === 'original'
          && head.creation.playPolicy?.cases === 'excluded' && !head.caseOne && !head.storyArc
          && !head.caseRuntime?.procedure && !head.caseRuntime?.occupiedBody
          ? {} : { suggestions: agentPlayView(runtimeItemProjection(head)).suggestions }),
      } : {};
      const current = this.#view(head, viewOptions);
      const guardRulesUpgrade = current.guardReaction ? this.#guardUpgradeView(head, { checkTasks: true }) : undefined;
      const bgm = bgmForScene(head);
      return composeDeliveredPlayerView({ delivered, current, roomLabels, bgm, guardRulesUpgrade });
    } catch (error) {
      if (!['DELIVERY_NOT_READY', 'INVALID_DELIVERY_STATE'].includes(error.code)) throw error;
      const view = this.#view(head, viewOptions);
      return head.exampleId === 'agent' ? { ...view, guardRulesUpgrade: this.#guardUpgradeView(head, { checkTasks: true }) } : view;
    }
  }
  #priorReceipt(state, requestId, text) {
    this.#assertNotCustomRootRequest(requestId);
    if (this.#dice.hasRequest(requestId)) fail('IDEMPOTENCY_CONFLICT', '请求编号已用于掷骰，不能用于剧情操作。');
    const prior = this.#db.prepare('SELECT * FROM prologue_requests WHERE request_id=?').get(requestId);
    if (!prior) return undefined;
    if (prior.generation !== state.generation) fail('STALE_GENERATION', '此请求属于旧执行世代，请使用新的请求标识。');
    if (prior.text !== text) fail('IDEMPOTENCY_CONFLICT', '同一请求标识不能用于不同内容。');
    const receipt = JSON.parse(prior.receipt);
    if (receipt.kind === 'run_policy') fail('IDEMPOTENCY_CONFLICT', '请求编号已用于本局设置。');
    if (receipt.view?.exampleId === 'custom' && !receipt.presentationVersion) {
      const presented = customPresentation(receipt.view);
      receipt.view.entries = presented.entries;
      receipt.view.turns = receipt.view.turns.map(turn => ({ ...turn,
        entryStart: presented.boundaries[turn.entryStart], entryEnd: presented.boundaries[turn.entryEnd] }));
    }
    return receipt;
  }
  // Host-only two-phase boundary. Preparation holds no write transaction and
  // publishes no proposed dialogue or world state. It is not a durable job.
  prepareAction({ requestId, text, expectedGeneration, expectedRevision } = {}) {
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(requestId)) fail('INVALID_REQUEST_ID', '请求标识须为一至一百二十八位字母、数字或安全标点，首位须为字母或数字。');
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) fail('INVALID_TEXT', '请输入非空文本，且不超过两千个字符。');
    requestVersion({ expectedGeneration, expectedRevision }, { required: false });
    const state = this.#state();
    if (expectedGeneration !== undefined && expectedGeneration !== state.generation) fail('STALE_GENERATION', '此请求属于旧执行世代，请刷新当前视图。');
    const replay = this.#priorReceipt(state, requestId, text) !== undefined;
    if (state.exampleId === 'agent') fail('LLM_REQUIRED', '请通过正式 LLM 回合入口提交此场景；不能以离线桩替代。');
    let next;
    let clarification;
    let accepted = false;
    if (!replay) {
      requestVersion({ expectedGeneration, expectedRevision });
      if (expectedRevision !== state.revision) fail('STALE_REVISION', '页面进度已更新，请确认最新内容后再提交行动。');
      this.#validateRestored(state);
      this.#domain.assertHead(state);
      const command = text.trim().replace(/[。！!？?]+$/u, '');
      const prototypeIntent = state.exampleId === 'prototype' ? parsePrototypeIntent(state, text) : null;
      const suggestions = state.exampleId === 'custom' ? customSuggestions(state) : OPTIONS[state.phase];
      accepted = !state.completed && (prototypeIntent ? prototypeIntent.accepted : suggestions.includes(command));
      clarification = prototypeIntent?.message;
      next = structuredClone(state);
      if (accepted) {
        if (prototypeIntent) advancePrototype(next, prototypeIntent.intentKey);
        else if (state.exampleId === 'custom') advanceCustom(next, PEOPLE);
        else advance(next, command);
      }
    }
    const preparation = Object.freeze({ kind: 'prepared_action', scope: Object.freeze({ generation: state.generation, revision: state.revision }) });
    this.#preparations.set(preparation, { requestId, text, before: state, next, accepted, clarification });
    return preparation;
  }
  commitAction(preparation) {
    const draft = this.#preparations.get(preparation);
    if (!draft) fail('INVALID_PREPARATION', '行动准备凭据无效，请重新提交原请求。');
    return this.#transaction(() => {
      const current = this.#state();
      if (draft.before.generation !== current.generation) fail('STALE_GENERATION', '此请求属于旧执行世代，请刷新当前视图。');
      // Replays survive later actions in the same generation, but never a load,
      // rewind or restart of the scenario. Duplicate preparations share a receipt.
      const prior = this.#priorReceipt(current, draft.requestId, draft.text);
      if (prior !== undefined) return prior;
      if (!draft.next) fail('INVALID_PREPARATION', '行动回执已不可用，请检查本地数据。');
      if (draft.before.revision !== current.revision) fail('STALE_REVISION', '页面进度已更新，请确认最新内容后再提交行动。');
      if (!isDeepStrictEqual(current, draft.before)) fail('STALE_PREPARATION', '行动依据已改变，未提交过期结果。');
      this.#domain.assertHead(current);
      const state = structuredClone(draft.next);
      if (draft.accepted) {
        const turnId = randomUUID();
        this.#insertTurn(turnId, draft.text, draft.before, state);
        state.turnIds = [...draft.before.turnIds, turnId];
        this.#write(state, 'act', { action: { intentKey: this.#domain.intentKey(draft.before, draft.text) } });
      }
      const message = !draft.accepted
        ? draft.clarification || (state.completed ? '本段场景已结束，可以读档或回溯重选。' : '当前仅支持提示中的受限指令；未理解的输入不耗时、不推进。')
        : state.exampleId === 'prototype'
          ? `行动已发生 · 故事时间 +${state.worldTime - draft.before.worldTime} 秒。${state.completed ? '片段已收束，可回溯比较另一种选择。' : '等待你的下一次行动。'}`
          : '行动已结算，等待下一次输入。';
      const receipt = { requestId: draft.requestId, presentationVersion: 1, accepted: draft.accepted,
        status: draft.accepted ? 'accepted' : 'needs_clarification', message, view: this.#view(state) };
      this.#db.prepare('INSERT INTO prologue_requests(request_id,generation,text,receipt) VALUES(?,?,?,?)').run(draft.requestId, state.generation, draft.text, JSON.stringify(receipt));
      return receipt;
    });
  }
  act(input) { return this.commitAction(this.prepareAction(input)); }
  #agentReceipt(input, state, accepted, message, status = accepted ? 'accepted' : 'needs_clarification') {
    return { requestId: input.requestId, presentationVersion: 1, accepted, status, message,
      view: this.#view(state, { compactOrdinaryHistory: true }),
      ...(accepted && hasIntentRuntime(state.agentRuntimeRevision) && state.agentActions.at(-1)?.actionOutcome
        ? { actionOutcome: structuredClone(state.agentActions.at(-1).actionOutcome) } : {}) };
  }
  #rememberAgentReceipt(input, state, receipt) {
    this.#db.prepare('INSERT INTO prologue_requests(request_id,generation,text,receipt) VALUES(?,?,?,?)')
      .run(input.requestId, state.generation, input.text, JSON.stringify(receipt));
  }
  #testimonyInputDisplay(state, raw, action) {
    const token = parseTestimonyCommand(raw);
    if (!token) return raw;
    if (action?.intent?.type === 'conversation' && typeof action.intent.playerText === 'string') {
      const selected = hasCaseOne(state) ? caseStatementReaction(state, token) : hasCaseRuntime(state) ? procedureStatementReaction(state, token) : null;
      return selected ? compactStatementReaction(selected.stance, selected.excerpt, createdPlayerId(state)) : '回应刚才的证词。';
    }
    const selected = hasCaseOne(state) ? caseStatementReaction(state, token) : hasCaseRuntime(state) ? procedureStatementReaction(state, token) : null;
    if (selected) return compactStatementReaction(selected.stance, selected.excerpt, createdPlayerId(state));
    const round = hasCaseOne(state) ? caseTestimony(state) : hasCaseRuntime(state) ? procedureTestimony(state) : null;
    return trialTestimonyDisplayText(round, token) || '回应刚才的证词。';
  }
  agentRuntime() {
    return this.#transaction(() => this.#agentRuntimeAt(this.#state()), { readOnly: true });
  }
  isAgentExample() {
    return this.#transaction(() => this.#state().exampleId === 'agent', { readOnly: true });
  }
  #agentRuntimeAt(state) {
    if (state.exampleId !== 'agent') return undefined;
    const row = this.#agentJobs.active(state.generation);
    if (!row || row.base_revision !== state.revision) return { status: 'idle', canRetry: false, supportsExplicitNewAttempt: true };
    const runtimePlan = this.#agentJobs.input(row);
    const regeneration = runtimePlan.regeneration;
    const failure = row.status === 'failed' ? this.#agentJobs.latestFailure(row, { developer: false }) : undefined;
    const expiredOrdinaryIntent = this.#expiredOrdinaryIntent(state, row, runtimePlan);
    const sceneRecoveryAvailable = !!this.#sceneRecoveryTask(state, row, runtimePlan);
    const usedSceneRecovery = this.#agentJobs.hasSceneRecovery(row);
    const status = usedSceneRecovery ? this.#agentJobs.sceneRecoveryRunning(row) ? 'running' : 'failed' : row.status;
    return { status,
      ...(sceneRecoveryAvailable ? { sceneRecoveryAvailable: true } : {}),
      ...(expiredOrdinaryIntent ? { ordinaryAttemptExpired: true } : {}),
      ...(failure ? { failure: { ...failure, ...this.#agentJobs.taskSummary(row) } } : {}),
      // Protocol support only: parent/head/text/lease checks remain mandatory in prepareAgentTurn.
      supportsExplicitNewAttempt: true,
      canRetry: !usedSceneRecovery, requestId: row.request_id, text: row.text,
      ...(runtimePlan.explicitNewAttemptOf ? { newAttemptOf: runtimePlan.explicitNewAttemptOf } : {}),
      ...(parseTestimonyCommand(row.text) ? { displayText: this.#testimonyInputDisplay(state, row.text) } : {}),
      ...(regeneration ? { operation: 'regenerate', turnId: regeneration.turnId } : {}),
      expectedGeneration: row.generation, expectedRevision: row.base_revision };
  }
  #expiredOrdinaryIntent(state, row, plan) {
    // Only the stopped, uncommitted first intent may start a linked attempt.
    // Keep the durable deadline/ledger unchanged, including across restart.
    if (row.status !== 'failed' || row.lease_owner !== null || row.lease_expires !== null
      || row.turn_id !== null || row.receipt_json !== null || state.completed || guardView(state)?.pending
      || plan.version !== 7 || plan.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION
      || plan.regeneration || plan.explicitNewAttemptOf || plan.intentHint?.type === 'case' || parseTestimonyCommand(row.text)) return false;
    const ledger = this.#agentJobs.modelAttemptLedger(row);
    if (ledger.count < 1 || ledger.slots.intent !== ledger.count
      || this.#agentJobs.ordinaryAdmissionClock(row, ledger).remainingMs > 0) return false;
    const tasks = this.#agentJobs.tasks(row);
    return tasks.length === 1 && tasks[0].id === 'intent' && tasks[0].result === undefined && tasks[0].terminal === undefined;
  }
  prepareAgentRegeneration(input = {}, { scenePresentation } = {}) {
    if (!input || typeof input !== 'object' || isProxy(input) || Object.getPrototypeOf(input) !== Object.prototype
      || Reflect.ownKeys(input).some(key => !['requestId', 'turnId', 'expectedGeneration', 'expectedRevision'].includes(key)
        || !Object.hasOwn(Object.getOwnPropertyDescriptor(input, key), 'value'))) fail('INVALID_REGENERATION', '重生成只能指定原行动楼层及当前版本，不能传入剧情或角色状态。');
    const { requestId, turnId, expectedGeneration, expectedRevision } = input;
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(requestId)) fail('INVALID_REQUEST_ID', '请求标识格式错误。');
    if (typeof turnId !== 'string' || !turnId || turnId.length > 128) fail('INVALID_TURN', '请选择有效的行动楼层。');
    requestVersion({ expectedGeneration, expectedRevision });
    return this.#transaction(() => {
      this.#assertNotCustomRootRequest(requestId);
      const head = this.#state();
      if (this.#dice.hasRequest(requestId)) fail('IDEMPOTENCY_CONFLICT', '请求编号已用于掷骰。');
      let row = this.#agentJobs.getByRequest(requestId);
      const priorPlan = row && this.#agentJobs.input(row);
      if (row && (!priorPlan.regeneration || priorPlan.regeneration.turnId !== turnId
        || row.generation !== expectedGeneration || row.base_revision !== expectedRevision)) fail('IDEMPOTENCY_CONFLICT', '同一重生成请求标识不能用于不同楼层或版本。');
      if (row?.status === 'committed') {
        const receipt = this.#priorReceipt(head, requestId, row.text);
        if (!receipt) fail('INVALID_AGENT_JOB', '重生成回执不存在。');
        return { kind: 'immediate', receipt };
      }
      if (head.generation !== expectedGeneration) fail('STALE_GENERATION', '请求属于旧世代，请刷新。');
      if (head.revision !== expectedRevision) fail('STALE_REVISION', '进度已经改变，请刷新后重新确认楼层。');
      if (head.exampleId !== 'agent') fail('LLM_REQUIRED', '离线固定示例不能重新生成模型剧情。');
      const attemptedEvent = head.agentActions[head.turnIds.indexOf(turnId)]?.directorEventDue;
      if (attemptedEvent && head.agentWorld?.broadcasts.some(notice => notice.id === directorAssemblyKey(attemptedEvent)))
        fail('INVALID_REGENERATION', '已实际交付的公共广播是宿主事实；可以读取先前存档。');
      if (head.agentActions[head.turnIds.indexOf(turnId)]?.softResult) fail('INVALID_REGENERATION', '本版不重新裁判已经发布的合作复述结果。');
      const originalAction = head.agentActions[head.turnIds.indexOf(turnId)];
      if (originalAction?.privateReflectionVersion === 1) fail('INVALID_REGENERATION', '这是依原句留下的私想；可继续行动，或回溯后另作选择。');
      if (guardHostCaption(originalAction)) fail('INVALID_REGENERATION', '规则启用与检定结算是宿主事实，不能用剧情重生成改写；可以回溯或读取先前存档。');
      if (!head.turnIds.includes(turnId)) fail('INVALID_TURN', '只能重新生成当前路径中的行动楼层。');
      this.#validateRestored(head);
      if (head.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION) this.#domain.assertGrowthRequest(head, null);
      const scope = this.#domain.scope(head);
      this.#agentJobs.cancelObsolete(scope);
      if (row?.status === 'cancelled') fail('STALE_AGENT_TURN', '重生成任务已过期。');
      let active = this.#agentJobs.active(head.generation);
      const original = this.#db.prepare('SELECT text,before_state FROM prologue_turns WHERE id=?').get(turnId);
      if (!original) fail('INVALID_TURN', '原行动楼层不存在。');
      const receiptInput = { requestId, text: original.text };
      if (active && active.request_id !== requestId) return { kind: 'in_progress', receipt: this.#agentReceipt(receiptInput, head, false,
        '另一个行动或重生成任务尚未完成。请先处理原请求，或读档／回溯取消旧任务；未发起新的模型请求。', 'in_progress') };
      if (!row) {
        if (this.#db.prepare('SELECT request_id FROM prologue_requests WHERE request_id=?').get(requestId)) fail('IDEMPOTENCY_CONFLICT', '请求标识已经用于另一项操作。');
        const checkpoint = parseState(original.before_state);
        this.#validateRestored(checkpoint);
        // Regeneration inherits the original action's captured pin, never the
        // current head's. An old unpinned action therefore stays unpinned.
        const originalAction = head.agentActions[head.turnIds.indexOf(turnId)];
        const originalJob = checkpoint.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION && originalAction?.jobId
          ? this.#agentJobs.get(originalAction.jobId) : null;
        // Early V1 stored its speech pin only on the sealed job, not on the
        // resulting scene action. Do not substitute the current version for
        // a historical unpinned action or when that job is unavailable.
        const ordinaryAddressVersion = originalAction?.ordinaryAddressVersion
          ?? (originalJob?.status === 'committed' && originalJob.text === original.text
            ? this.#agentJobs.input(originalJob).ordinaryAddressVersion : undefined);
        const projection = structuredClone(checkpoint);
        const itemPolicyVersion = checkpoint.itemPolicyVersion === 2 ? 2 : checkpoint.itemPolicyVersion === 1
          || runtimeRevisionForState(checkpoint).policy.sceneBeatVersion === 1 ? 1 : undefined;
        if (!hasCaseOne(projection)) {
          runtimeApplyItemPolicy(projection, itemPolicyVersion);
          enableCaseRuntime(projection);
        }
        const scheduleWaitVersion = ['agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(checkpoint.agentRuntimeRevision)) && !hasCaseOne(checkpoint) ? 1 : undefined;
        const parseMagic = this.#magicAt(checkpoint, true);
        const parseProjection = parseMagic?.effects?.some(effect => effect.status === 'active'
          && effect.event?.operation === 'strength') ? withMagicProjection(projection, parseMagic) : projection;
        const effectiveRunPolicy = this.#domain.effectiveRunPolicy(checkpoint)?.pin;
         const ordinary = withRunBoundary(checkpoint, effectiveRunPolicy, () => parseAgentIntent(parseProjection, original.text, { scheduleWaitVersion }));
        const courtChoice = originalAction?.hostCaseChoiceVersion === 1
          ? withRunBoundary(checkpoint, effectiveRunPolicy, () => hostCaseChoicePlan(parseProjection, original.text)) : null;
        if (originalAction?.hostCaseChoiceVersion === 1 && (!ordinary.accepted || !courtChoice?.accepted)) fail('INVALID_TURN');
        const parsed = courtChoice || ordinary;
        if (!parsed.accepted || checkpoint.completed) fail('INVALID_TURN', '原行动无法从其真实起点重新推演。');
        if (this.#ballotInstrumentVersion === 1 && parsed.intent.type === 'case' && parsed.intent.operation === 'vote')
          fail('INVALID_AGENT_JOB', '投票器具扩展尚不支持重新生成。');
        const jobId = randomUUID();
        const initialRunPolicy = this.#domain.initialRunPolicy(checkpoint);
        row = this.#agentJobs.insert({ requestId, text: original.text, scope, actorId: createdPlayerId(checkpoint),
          plan: { ...(effectiveRunPolicy ? { effectiveRunPolicy, runPolicyConsumersVersion: 1 } : {}), ...(checkpoint.storyLifeVersion === 1 && !hasCaseOne(checkpoint) ? { storyLifeVersion: 1 } : {}), ...(originalAction?.rootCaseOptionsVersion === 1 ? { rootCaseOptionsVersion: 1 } : {}), ...(originalAction?.objectInspectionTimingVersion === 1 ? { objectInspectionTimingVersion: 1 } : {}), ...(runtimeCapabilityId(checkpoint.agentRuntimeRevision) === 'agent-prison-runtime@8' && (hasCaseOne(checkpoint) || itemPolicyVersion === 2) ? { caseActionTimingVersion: 2 } : {}), ...guardRulePin(checkpoint), ...(!hasCaseOne(checkpoint) && runtimeRevisionForState(checkpoint).policy.sceneBeatVersion === 1
              && checkpoint.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION
               && this.#getDirectorMode() === 'advisory' ? this.#captureDirector(checkpoint, scope) : {}), version: hasSoftRuntime(checkpoint) ? 7 : hasCaseOne(checkpoint) ? 4 : runtimeRevisionForState(checkpoint).policy.sceneBeatVersion === 1 ? 6 : 5, ...this.#newSceneJobExtensions(checkpoint), ...(originalAction?.hostCaseChoiceVersion === 1 ? { hostCaseChoiceVersion: 1 } : {}), ...(hasSoftRuntime(checkpoint) ? { executionBudget: SOFT_EXECUTION_BUDGET } : {}), ...(this.#ballotInstrumentVersion === 1 && parsed.intent.type === 'case' && parsed.intent.operation === 'vote' ? { ballotInstrumentVersion: 1 } : {}), ...(checkpoint.caseRuntime?.occupiedBody ? { occupiedBodyVersion: 1 } : {}), ...(checkpoint.caseRuntime?.swapLifecycle ? { swapLifecycleVersion: 1, playerTextSwapVersion: 1, playerRuntimeCommunicationVersion: 1 } : {}), ...(itemPolicyVersion === 2 && !hasCaseOne(checkpoint) ? { playerRuntimeSelfServiceVersion: 1, playerRuntimeOfferedInspectionVersion: 1, shortObservationReferenceVersion: 1 } : {}), ...(checkpoint.customAbilitySetup ? { customAbilityVersion: 1, customAbilityRefs: structuredClone(checkpoint.customAbilitySetup.selections) } : {}), ...(this.#postureActionVersion === 1 && runtimeCapabilityId(checkpoint.agentRuntimeRevision) === 'agent-prison-runtime@8' && !hasCaseOne(checkpoint) && itemPolicyVersion === 2 && this.#physicalFactsVersion === 2 ? { postureActionVersion: 1 } : {}), ...(!hasCaseOne(checkpoint) && runtimeRevisionForState(checkpoint).policy.playerPerformanceVersion === 2 ? { dialogueContextVersion: 1 } : {}), styleVersion: 1, movementGuardVersion: 1, ...(checkpoint.creation?.storyArcId === 'case-one-day3@1' ? { storyArcVersion: 1 } : {}), ...(!hasCaseOne(checkpoint) ? { causalTimingVersion: 1, ...(itemPolicyVersion !== undefined ? { itemPolicyVersion } : {}),
            ...(runtimeRevisionForState(checkpoint).policy.sceneBeatVersion === 1 ? { schedulingVersion: 1, decisionAuditVersion: 1, introductionVersion: 5,
              ...(scheduleWaitVersion !== undefined ? { scheduleWaitVersion } : {}) } : {}) } : {}), contentFingerprint: runtimeRevisionForState(checkpoint).content.fingerprint,
            executionRevision: runtimeRevisionForState(checkpoint).executionRevision,
             ...(checkpoint.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION ? { bareReplyRootVersion: 1, cellDoorAttemptVersion: 1,
               ...([1, 2, 3].includes(ordinaryAddressVersion) ? { ordinaryAddressVersion } : {}),
                 ...([1,2,3].includes(originalAction?.ordinaryLocalAmbientSpeechVersion) ? { ordinaryLocalAmbientSpeechVersion: originalAction.ordinaryLocalAmbientSpeechVersion } : {}),
                 ...(originalAction?.ordinaryLocalSearchConversationVersion === 1 ? { ordinaryLocalSearchConversationVersion: 1 } : {}),
                 ...ordinaryLocalVisualPlanPins(original.text,originalAction ?? null),
                 ...([1,2,3].includes(originalAction?.ordinaryLocalApproachVersion) ? { ordinaryLocalApproachVersion: originalAction.ordinaryLocalApproachVersion,
                   ...(originalJob?.status === 'committed' && originalJob.text === original.text
                     && this.#agentJobs.input(originalJob).localApproachHostPerformanceVersion === 1 ? { localApproachHostPerformanceVersion: 1 } : {}) } : {}),
                ...(originalAction?.roomGroupSpeechVersion === 1 ? { roomGroupSpeechVersion: 1 } : {}),
                ...([1, 2, 3, 4, 5, 6, 7, 8].includes(originalAction?.ordinaryDialogueSequenceVersion) ? { ordinaryDialogueSequenceVersion: originalAction.ordinaryDialogueSequenceVersion } : {}) } : {}),
              ...(scenePresentation === 'novel' ? { novelScenePresentationVersion: 1, narrationPacingVersion: hasSoftRuntime(checkpoint) ? 3 : 1 } : {}),
            ...(initialRunPolicy === undefined ? {} : { initialRunPolicy }),
            ...(runtimeRevisionForState(checkpoint).policy.playerPerformanceVersion === 2 ? { performanceVersion: 2, caseRecallVersion: 1 } : {}), perceptionVersion: 1, jobId, intentHint: this.#narrativeHint(parsed.intent),
            questionKey: `question:${jobId}`, answerKey: `answer:${jobId}`, roomLabelVersion: 2, worldVersion: 1,
            promptSnapshot: this.#promptSnapshot(checkpoint), scene: { ...agentScene(projection), readable: materialReadableProjection(projection, createdPlayerId(projection)) },
            regeneration: { turnId, checkpoint } } });
      }
      const pendingPlan = this.#agentJobs.input(row);
      assertRuntimeJobRevision(pendingPlan.regeneration.checkpoint, pendingPlan);
      const leaseToken = this.#agentJobs.claim(row);
      if (leaseToken === null) return { kind: 'in_progress', receipt: this.#agentReceipt(receiptInput, head, false,
        '这一轮仍在重新生成。请稍后用同一按钮手动续接；不会另起重复模型调用。', 'in_progress') };
      row = this.#agentJobs.get(row.job_id);
      const plan = this.#agentJobs.input(row);
      return this.#prepareNarrativeStage(row, plan.regeneration.checkpoint, plan, leaseToken);
    });
  }
  #routePlayerMagicText(input) {
    const { requestId, text, expectedGeneration, expectedRevision } = input;
    const sentence = text.trim().replace(/[。！!？?]+$/u, '');
    const route = this.#transaction(() => {
      const state = this.#state();
      if (state.exampleId !== 'agent' || this.#agentJobs.getByRequest(requestId)) return null;
      const saved = this.#db.prepare('SELECT text,receipt FROM prologue_requests WHERE request_id=?').get(requestId);
      if (saved && (saved.text.startsWith('magic-activate:') || saved.text.startsWith('magic-cast:')
        || saved.text.startsWith('magic-end:'))) {
        const receipt = JSON.parse(saved.receipt);
        return receipt.playerMagicSentence === sentence ? { replay: receipt } : null;
      }
      // Historical exact-sentence clients still get the old missing-grant
      // rejection when magic was never enabled. Once actual magic exists, the
      // same text is ordinary intent and follows the one-act text lane.
      const view = this.#magicView(state);
      const legacy = matchPlayerMagicSentence(text, view, createdPlayerId(state));
      return legacy && legacy.kind !== 'end' ? { legacy, playerId: createdPlayerId(state) } : null;
    }, { readOnly: true });
    if (route?.replay) return { kind: 'immediate', receipt: route.replay };
    if (route?.legacy?.kind === 'clarify') {
      return this.#transaction(() => {
        const state = this.#state();
        if (state.generation !== expectedGeneration) fail('STALE_GENERATION', '请求属于旧世代，请刷新。');
        const prior = this.#priorReceipt(state, requestId, text);
        if (prior) return { kind: 'immediate', receipt: prior };
        if (state.revision !== expectedRevision) fail('STALE_REVISION', '进度已经改变，请刷新后再发言。');
        const receipt = this.#agentReceipt(input, state, false, route.legacy.message);
        this.#rememberAgentReceipt({ requestId, text }, state, receipt);
        return { kind: 'immediate', receipt };
      });
    }
    const stamp = () => this.#transaction(() => {
      const row = this.#db.prepare('SELECT receipt FROM prologue_requests WHERE request_id=?').get(requestId);
      const stored = JSON.parse(row.receipt);
      stored.playerMagicSentence = sentence;
      this.#db.prepare('UPDATE prologue_requests SET receipt=? WHERE request_id=?').run(JSON.stringify(stored), requestId);
      return stored;
    });
    if (route?.legacy?.kind === 'activate') {
      this.activateMagic({ requestId, expectedGeneration, expectedRevision, confirmed: true });
      return { kind: 'immediate', receipt: stamp() };
    }
    if (route?.legacy?.kind === 'cast') {
      this.castMagic({ requestId, expectedGeneration, expectedRevision, command: {
        type: 'magic_cast', useId: requestId, actorId: route.playerId, grantId: route.legacy.grantId,
        definitionRef: route.legacy.definitionRef, activation: 'intent', targetHandle: route.legacy.targetHandle, parameters: {} } });
      return { kind: 'immediate', receipt: stamp() };
    }
    return null;
  }
  #sceneRecoveryTask(state, row, plan) {
    if (row.status !== 'failed' || state.exampleId !== 'agent' || state.completed || guardView(state)?.pending || parseTestimonyCommand(row.text)
      || row.generation !== state.generation || row.base_revision !== state.revision) return undefined;
    const scope = this.#domain.scope(state);
    if (scope.branchId !== row.branch_id || this.#agentJobs.active(state.generation)?.job_id !== row.job_id) return undefined;
    return this.#agentJobs.sceneRecoveryTask(row, plan, scope.commitRef);
  }
  #prepareAgentSceneRecovery(input) {
    const { requestId, text, expectedGeneration, expectedRevision } = input;
    return this.#transaction(() => {
      const state = this.#state();
      const row = this.#agentJobs.getByRequest(requestId);
      const reject = () => fail('INVALID_SCENE_RECOVERY', '当前行动没有可用的一次性旁白恢复。');
      if (!row || row.text !== text || row.generation !== expectedGeneration || row.base_revision !== expectedRevision
        || state.generation !== expectedGeneration) reject();
      const scope = this.#domain.scope(state);
      if (row.branch_id !== scope.branchId) reject();
      if (row.status === 'committed') {
        const receipt = this.#priorReceipt(state, requestId, text);
        if (this.#agentJobs.hasSceneRecovery(row) && receipt && row.turn_id && state.turnIds.includes(row.turn_id))
          return { kind: 'immediate', receipt };
        reject();
      }
      if (this.#agentJobs.hasSceneRecovery(row)) {
        if (row.base_revision === state.revision && this.#agentJobs.sceneRecoveryRunning(row))
          return { kind: 'in_progress', receipt: this.#agentReceipt(input, state, false, '旁白恢复正在执行。', 'in_progress') };
        reject();
      }
      const plan = this.#agentJobs.input(row);
      const task = this.#sceneRecoveryTask(state, row, plan);
      if (!task) reject();
      assertRuntimeJobRevision(state, plan);
      this.#assertMaterialTask(row, state, plan, task);
      const recovery = this.#agentJobs.startSceneRecovery(row, plan, scope.commitRef);
      return { kind: 'scene_recovery', jobId: row.job_id, ...recovery, task,
        stopReason: hostSceneDocument(task.context.data.events).stopReason };
    }, { reuseVerifiedCommitBytes: true, reuseExactPlanReads: true });
  }
  prepareAgentTurn(input = {}, { scenePresentation } = {}) {
    const startedAt = performance.now();
    try {
    const { requestId, text, expectedGeneration, expectedRevision, newAttemptOf, recoverScene } = input;
    if (recoverScene !== undefined || Object.hasOwn(input, 'recoverScene')) {
      const flag = Object.getOwnPropertyDescriptor(input, 'recoverScene');
      if (!flag?.enumerable || flag.value !== true || Object.hasOwn(input, 'newAttemptOf') || newAttemptOf !== undefined)
        fail('INVALID_SCENE_RECOVERY', '旁白恢复必须明确指定同一原行动。');
    }
    if (newAttemptOf !== undefined && (typeof newAttemptOf !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(newAttemptOf) || newAttemptOf === requestId)) fail('INVALID_NEW_ATTEMPT', '请明确关联另一条失败的普通行动。');
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(requestId)) fail('INVALID_REQUEST_ID', '请求标识格式错误。');
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) fail('INVALID_TEXT', '请输入不超过两千字的发言或行动。');
    requestVersion({ expectedGeneration, expectedRevision });
    if (recoverScene === true) return this.#prepareAgentSceneRecovery(input);
    const magicRoute = newAttemptOf === undefined ? this.#routePlayerMagicText(input) : null;
    if (magicRoute) return magicRoute;
    return this.#transaction(() => {
      this.#assertNotCustomRootRequest(requestId);
      const state = this.#state();
      // Check an existing new request's immutable binding before receipt/version
      // replay. A committed duplicate must not require its parent to remain failed.
      const boundAttempt = this.#agentJobs.getByRequest(requestId);
      if (newAttemptOf !== undefined && boundAttempt
        && this.#agentJobs.input(boundAttempt).explicitNewAttemptOf !== newAttemptOf)
        fail('INVALID_NEW_ATTEMPT', '此请求编号已绑定另一项操作。');
      if (newAttemptOf !== undefined && !boundAttempt
        && this.#db.prepare('SELECT 1 FROM prologue_requests WHERE request_id=?').get(requestId))
        fail('IDEMPOTENCY_CONFLICT', '此请求编号已有结算记录。');
      if (expectedGeneration !== state.generation) {
        const prior = this.#db.prepare('SELECT * FROM prologue_story_request_receipts WHERE request_id=?').get(requestId);
        const job = prior && this.#agentJobs.getByRequest(requestId);
        const scope = this.#domain.scope(state);
        if (prior && prior.text === text && prior.source_generation === expectedGeneration && prior.source_revision === expectedRevision
          && job?.status === 'committed' && job.generation === expectedGeneration && job.base_revision === expectedRevision
          && scope.commitRef === prior.target_commit_ref && prior.receipt_json === job.receipt_json
          && this.#db.prepare('SELECT 1 FROM domain_story_branches WHERE source_execution_ref=? AND json_extract(receipt_json,\'$.commitRef\')=?')
            .get(prior.source_commit_ref, prior.target_commit_ref)) return { kind: 'immediate', receipt: JSON.parse(prior.receipt_json) };
        fail('STALE_GENERATION', '请求属于旧世代，请刷新。');
      }
      this.#domain.assertGrowthRequest(state, { requestId, text });
      const existing = this.#agentJobs.getByRequest(requestId);
      if (existing && this.#agentJobs.input(existing).regeneration) fail('IDEMPOTENCY_CONFLICT', '重生成请求不能作为新的玩家行动重试。');
      const prior = this.#priorReceipt(state, requestId, text);
      if (prior) return { kind: 'immediate', receipt: prior };
      if (state.exampleId !== 'agent') fail('LLM_REQUIRED', '此入口只用于正式 LLM 场景。');
      if (expectedRevision !== state.revision) fail('STALE_REVISION', '进度已经改变，请刷新后再发言。');
      this.#validateRestored(state);
      const scope = this.#domain.scope(state);
      if (existing && existing.text !== text) fail('IDEMPOTENCY_CONFLICT', '同一请求标识不能用于不同内容。');
      let linkedLocalPointReply = false, linkedSamePeerGaze = false, linkedLocalStairReply = false;
      if (newAttemptOf !== undefined && !existing) {
        const parent = this.#agentJobs.getByRequest(newAttemptOf);
        const activeParent = this.#agentJobs.active(state.generation);
        const parentPlan = parent && this.#agentJobs.input(parent);
        if (!parent || parent.status !== 'failed' || parent.lease_owner !== null || parent.lease_expires !== null
          || activeParent?.job_id !== parent.job_id || parent.generation !== state.generation
          || parent.base_revision !== state.revision || parent.branch_id !== scope.branchId || parent.text !== text
          || parentPlan.regeneration || parentPlan.intentHint?.type === 'case' || parseTestimonyCommand(text)
          || state.completed || guardView(state)?.pending)
          fail('INVALID_NEW_ATTEMPT', '只能为当前版本、同一原文且已停止的失败普通行动另开新尝试。');
        // Inherit only the lane from the authenticated parent; prove the current ask again below.
        linkedLocalPointReply = parentPlan.ordinaryDialogueSequenceVersion === 6;
        linkedSamePeerGaze = parentPlan.ordinaryDialogueSequenceVersion === 7;
        linkedLocalStairReply = parentPlan.ordinaryDialogueSequenceVersion === 8;
      }
      if (existing && (state.completed || existing.generation !== state.generation || existing.base_revision !== state.revision
        || existing.branch_id !== scope.branchId || existing.status === 'cancelled')) fail('STALE_AGENT_TURN', '角色任务依据已经过期。');
      if (state.completed) {
        const receipt = this.#agentReceipt(input, state, false, '本段场景已结束，可以读档或回溯重选。');
        this.#rememberAgentReceipt(input, state, receipt);
        return { kind: 'immediate', receipt };
      }
      if (state.caseRuntime?.occupiedBody && !runtimeActive(state, createdPlayerId(state)))
        fail('INVALID_AGENT_STATE', '当前实际身体无法行动。');
      if (guardView(state)?.pending) {
        const receipt = this.#agentReceipt(input, state, false, '看守即将实施抓捕，请先处理当前掷骰判定。');
        this.#rememberAgentReceipt(input, state, receipt);
        return { kind: 'immediate', receipt };
      }
      const detention = guardView(state)?.detention;
      const localDetention = detention && !existing && newAttemptOf === undefined ? localDetentionAction(state, text) : null;
      if (localDetention || detention && [GUARD_WAIT_TEXT, GUARD_RELEASE_TEXT].includes(text.trim())) {
        if (this.#agentJobs.active(state.generation)?.base_revision === state.revision) fail('INVALID_GUARD_PENDING', '请先处理当前未决任务。');
        const next = structuredClone(state);
        const type = localDetention?.type ?? (text.trim() === GUARD_WAIT_TEXT ? 'guard_detention_wait' : 'guard_release');
        applyAgentAction(next, localDetention ?? { type, encounterId: detention.encounterId, narrationVersion: 1 });
        const turnId = randomUUID(); next.turnIds.push(turnId);
        this.#insertTurn(turnId, localDetention ? text : text.trim(), state, next);
        this.#write(next, 'act', { action: { intentKey: `guard-detention:${type}:${detention.encounterId}:${state.worldTime}` } });
        const receiptInput = { requestId, text };
        const receipt = this.#agentReceipt(input, next, true, localDetention ? '' : '已按共享故事时间处理禁闭状态。');
        if (localDetention && scenePresentation === 'novel') {
          const actualHan = next.entries.slice(state.entries.length).reduce((sum, row) => sum
            + (row.delivery === 'narration' ? Array.from(row.text.matchAll(/\p{Script=Han}/gu)).length : 0), 0);
          receipt.narrationOutcome = { kind: actualHan < NOVEL_MIN_ROUND_HAN ? 'round_minimum_not_met' : 'round_minimum_met',
            minimumHan: NOVEL_MIN_ROUND_HAN, actualHan };
        }
        this.#rememberAgentReceipt(receiptInput, next, receipt);
        return { kind: 'immediate', receipt };
      }
      this.#agentJobs.cancelObsolete(scope);
      let row = this.#agentJobs.getByRequest(requestId);
      let active = this.#agentJobs.active(state.generation);
      // If a previous turn failed and the caller is retrying the exact same text
      // under a newly generated requestId (e.g. after editing the input box back
      // to the original phrasing), resume the failed job so completed subtasks
      // are preserved rather than blocking or restarting from scratch.
      if (newAttemptOf === undefined && !row && active?.status === 'failed' && active.generation === state.generation
        && active.base_revision === state.revision && active.branch_id === scope.branchId
        && !this.#agentJobs.input(active).regeneration && active.text === text) {
        row = active;
      }
      if (active && active.job_id !== row?.job_id && active.status === 'failed' && !this.#agentJobs.input(active).regeneration) {
        this.#agentJobs.cancelFailed(active.job_id);
        active = this.#agentJobs.active(state.generation);
      }
      if (active && active.job_id !== row?.job_id) return { kind: 'in_progress', receipt: this.#agentReceipt(input, state, false,
        '上一条发言尚未完成。请重试原发言；或者读档／回溯开启另一条路径。新输入未提交，也未发起模型请求。', 'in_progress') };
      if (!row) {
        const projection = structuredClone(state);
        const itemPolicyVersion = state.itemPolicyVersion === 2 ? 2 : state.itemPolicyVersion === 1
          || runtimeRevisionForState(state).policy.sceneBeatVersion === 1 ? 1 : undefined;
        if (!hasCaseOne(projection)) {
          runtimeApplyItemPolicy(projection, itemPolicyVersion);
          enableCaseRuntime(projection);
        }
        const scheduleWaitVersion = ['agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(state.agentRuntimeRevision)) && !hasCaseOne(state) ? 1 : undefined;
        const parseMagic = this.#magicAt(state);
        const parseProjection = parseMagic?.effects?.some(effect => effect.status === 'active'
          && effect.event?.operation === 'strength') ? withMagicProjection(projection, parseMagic) : projection;
        const effectiveRunPolicy = this.#domain.effectiveRunPolicy(state)?.pin;
        const hiddenSupplyCapability = this.#domain.hiddenSupplyJob(state);
        const ordinary = withRunBoundary(state, effectiveRunPolicy, () => parseAgentIntent(parseProjection, text, { scheduleWaitVersion }));
        const courtChoice = ordinary.accepted ? withRunBoundary(state, effectiveRunPolicy, () => hostCaseChoicePlan(parseProjection, text)) : null;
        const parsed = courtChoice || ordinary;
        const actionLimit = hasCaseOne(state) ? 256 : Number.MAX_SAFE_INTEGER;
        if (!parsed.accepted || state.agentActions.length >= actionLimit) {
          const message = parsed.code === 'GUARD_DETAINED' && detention?.status === 'detained'
            ? detention.remainingSeconds === 0 || detention.caseBoundaryAt !== undefined
              ? '门还锁着；要离开，得等看守开门。' : '门还锁着。你可以留在门内，朝门口说话，再等一小会儿。'
            : parsed.message;
          const receipt = this.#agentReceipt(input, state, false, message || `这段旅程已记下 ${actionLimit} 次行动。可以回到先前的选择，或开始新的故事。`);
          this.#rememberAgentReceipt(input, state, receipt);
          return { kind: 'immediate', receipt };
        }
        const actorId = createdPlayerId(state);
        const jobId = randomUUID(); const questionKey = `question:${jobId}`; const answerKey = `answer:${jobId}`;
        const initialRunPolicy = this.#domain.initialRunPolicy(state);
        const casePolicy = effectiveRunPolicy?.source?.adoptedCommitRef ? effectiveRunPolicy.playPolicy.cases : initialRunPolicy?.playPolicy?.cases;
        const privateReflection = !courtChoice && canCapturePrivateReflection(state)
          && !requiresInitialBoundaryReview(adjudicationPolicy({ initialRunPolicy, effectiveRunPolicy, runPolicyConsumersVersion: 1 }))
          && Boolean(currentPrivateReflection(text));
        // Only new case-allowed jobs opt in; preserve v12 ordinary evidence and pending plans.
        const npcActPreflight = this.#npcActPreflight >= 13 && casePolicy !== 'allowed' ? 12 : this.#npcActPreflight;
        const intentHint = privateReflection ? { type: 'reflect' } : this.#narrativeHint(parsed.intent);
        const executionRevision = runtimeRevisionForState(state).executionRevision;
         const localConditionalWait = newAttemptOf===undefined && executionRevision.revisionId===EVENT_DIRECTOR_RUNTIME_REVISION
           && !courtChoice && intentHint.type==='interpret' && localConditionalWaitSource(text)
           && !requiresInitialBoundaryReview(adjudicationPolicy({initialRunPolicy,effectiveRunPolicy,runPolicyConsumersVersion:1}))
           && proveLocalConditionalWait(parseProjection,actorId,text);
         let localTravel;
         if (newAttemptOf===undefined && executionRevision.revisionId===EVENT_DIRECTOR_RUNTIME_REVISION
           && !courtChoice && intentHint.type==='interpret'
           && !requiresInitialBoundaryReview(adjudicationPolicy({initialRunPolicy,effectiveRunPolicy,runPolicyConsumersVersion:1}))) {
           if (localTravelAttemptSource(text) && proveLocalTravelAttempt(parseProjection,actorId,text)) localTravel=1;
           else if (localTravelAttemptSource(text,undefined,2) && proveLocalTravelAttempt(parseProjection,actorId,text,2)) localTravel=2;
         }
        const groupSpeech = localTravel===1 || executionRevision.revisionId === EVENT_DIRECTOR_RUNTIME_REVISION && intentHint.type === 'interpret'
          && roomGroupSpeechSource(text, causalPlayerScene(parseProjection)) && roomGroupSpeechAudience(parseProjection).length >= 3;
        const localSearch = executionRevision.revisionId===EVENT_DIRECTOR_RUNTIME_REVISION && intentHint.type==='interpret'
           && !localTravel && !localConditionalWait && !groupSpeech && !parseProjection.caseRuntime?.occupiedBody && actorForState(parseProjection,actorId)?.communication==='speech'
           && localSearchConversationDomain(text) && ordinaryLocalSearchSource(text,this.#observedOrientationScene(parseProjection,actorId).scene);
          let ambientSpeech;
          if (executionRevision.revisionId===EVENT_DIRECTOR_RUNTIME_REVISION && intentHint.type==='interpret'
            && !localTravel && !localConditionalWait && !groupSpeech && !parseProjection.caseRuntime?.occupiedBody && actorForState(parseProjection,actorId)?.communication==='speech') {
            if (localAmbientSpeechDomain(text) && ordinaryLocalAmbientSpeechSource(text,this.#observedOrientationScene(parseProjection,actorId).scene)) ambientSpeech=1;
            else if (localAmbientSpeechDomain(text,2) && recentLocalWaitProposal(parseProjection,actorId,roomGroupSpeechAudience(parseProjection))
              && ordinaryLocalAmbientSpeechSource(text,this.#observedOrientationScene(parseProjection,actorId).scene,2)) ambientSpeech=2;
            else if (localAmbientSpeechDomain(text,3) && roomGroupSpeechAudience(parseProjection).length>=3
              && ordinaryLocalAmbientSpeechSource(text,this.#observedOrientationScene(parseProjection,actorId).scene,3)) ambientSpeech=3;
            else if (newAttemptOf===undefined && localAmbientSpeechDomain(text,4)
              && this.#openOrientationIntentProof(parseProjection,actorId,text,{initialRunPolicy,effectiveRunPolicy,runPolicyConsumersVersion:1})) ambientSpeech=4;
          }
          let localApproach;
          if (executionRevision.revisionId===EVENT_DIRECTOR_RUNTIME_REVISION && intentHint.type==='interpret'
            && !localTravel && !localConditionalWait && !groupSpeech && !parseProjection.caseRuntime?.occupiedBody && actorForState(parseProjection,actorId)?.communication==='speech') {
            if (localApproachDomain(text)) localApproach=1;
            else if (localApproachDomain(text,2) && ordinaryLocalApproachSource(text,this.#observedOrientationScene(parseProjection,actorId).scene,2)) localApproach=2;
            else if (newAttemptOf===undefined && localApproachDomain(text,3)
              && this.#hostReadinessIntentProof(parseProjection,actorId,text,{initialRunPolicy,effectiveRunPolicy,runPolicyConsumersVersion:1})) localApproach=3;
          }
         let sequenceVersion = ambientSpeech || localSearch ? 1 : undefined;
         if (!localTravel && !localConditionalWait && !ambientSpeech && !localSearch && executionRevision.revisionId === EVENT_DIRECTOR_RUNTIME_REVISION && intentHint.type === 'interpret'
           && !parseProjection.caseRuntime?.occupiedBody && actorForState(parseProjection, actorId)?.communication === 'speech'
           && /[「」『』“”"]/u.test(text)) {
           const pointReply = (newAttemptOf === undefined || linkedLocalPointReply) && !groupSpeech && !localApproach && localPointReplySequenceDomain(text)
              && this.#localPointReplySequence(parseProjection, actorId, text);
            const namedGaze = (newAttemptOf===undefined || linkedSamePeerGaze) && !groupSpeech && !localApproach && samePeerGazeSequenceDomain(text)
              && !requiresInitialBoundaryReview(adjudicationPolicy({initialRunPolicy,effectiveRunPolicy,runPolicyConsumersVersion:1}))
              && this.#localPointReplySequence(parseProjection,actorId,text,7);
             const stairGaze = (newAttemptOf===undefined || linkedLocalStairReply) && !groupSpeech && !localApproach && localStairReplySequenceDomain(text)
              && !requiresInitialBoundaryReview(adjudicationPolicy({initialRunPolicy,effectiveRunPolicy,runPolicyConsumersVersion:1}))
              && this.#localPointReplySequence(parseProjection,actorId,text,8);
             if (stairGaze) sequenceVersion=8;
             else if (namedGaze) sequenceVersion=7;
             else if (pointReply) sequenceVersion = 6;
            else if (this.#roomShiftDialogueSequence(parseProjection, actorId, text)) sequenceVersion = 3;
            else {
              const local = this.#localDialogueSequence(parseProjection, actorId, text);
              if (!local && !groupSpeech && this.#boundLocalSpeechSequence(parseProjection, actorId, text)) sequenceVersion = 4;
              else if (!groupSpeech && observedOrientationSequenceDomain(text)) {
                const perception = this.#observedOrientationScene(parseProjection, actorId);
                const peer = perception.scene.replyPeer;
                const unambiguous = ordinaryDialogueSequence(text, perception.scene, peer, 5);
                // A valid legacy named-gaze proof can stand without a historical
                // peer. Otherwise do not fall back to the old bare reply when
                // the stronger source proof disagrees.
                sequenceVersion = local && (!peer || unambiguous) ? 2
                  : unambiguous && ordinaryDialogueSequence(text, perception.scene, peer, 1) ? 1 : 5;
              } else sequenceVersion = local ? 2 : 1;
            }
         }
         const hiddenSupplyMode = hiddenSupplyCapability?.version === 2 ? this.#privateDirectorMode() : 'off';
        const hiddenSupplyChoice = hiddenSupplyMode === 'active'
          ? this.#domain.hiddenSupplyChoice(state, jobId) : null;
        const director = state.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION
          ? (state.customAbilitySetup ? {} : { ...(hiddenSupplyChoice
            ? { directorExtension: hiddenSupplyChoice.packet.data.extension, hiddenSupplyChoice }
            : this.#captureDirectorEvent(state, scope, jobId, initialRunPolicy, executionRevision, effectiveRunPolicy)),
            directorEventLifecycle: this.#directorPlanning.eventJobPin(scope, jobId) })
          : !hasCaseOne(state) && runtimeRevisionForState(state).policy.sceneBeatVersion === 1 && this.#getDirectorMode() === 'advisory'
            ? this.#captureDirector(state, scope) : {};
        row = this.#agentJobs.insert({ requestId, text, scope, actorId,
          plan: { ...(effectiveRunPolicy ? { effectiveRunPolicy, runPolicyConsumersVersion: 1 } : {}), ...(hiddenSupplyCapability ? { hiddenSupplyCapability } : {}), ...(hiddenSupplyCapability?.lifecycle === 1 ? { hiddenSupplyMode } : {}), ...(newAttemptOf === undefined ? {} : { explicitNewAttemptOf: newAttemptOf }), ...(state.storyLifeVersion === 1 && !hasCaseOne(state) ? { storyLifeVersion: 1 } : {}), ...(canCaptureRootCaseOptions(state) ? { rootCaseOptionsVersion: 1 } : {}), ...(runtimeCapabilityId(state.agentRuntimeRevision) === 'agent-prison-runtime@8' && !hasCaseOne(state) && itemPolicyVersion === 2 && runtimeRevisionForState(state).policy.sceneBeatVersion === 1 ? { objectInspectionTimingVersion: 1 } : {}), ...(runtimeCapabilityId(state.agentRuntimeRevision) === 'agent-prison-runtime@8' && (hasCaseOne(state) || itemPolicyVersion === 2) ? { caseActionTimingVersion: 2 } : {}), ...guardRulePin(state), ...director, ...(privateReflection ? { privateReflectionVersion: 1 } : {}), version: hasSoftRuntime(state) ? 7 : hasCaseOne(state) ? 4 : runtimeRevisionForState(state).policy.sceneBeatVersion === 1 ? 6 : 5, ...this.#newSceneJobExtensions(state), ...(courtChoice?.accepted ? { hostCaseChoiceVersion: 1 } : {}), ...(hasSoftRuntime(state) ? { executionBudget: SOFT_EXECUTION_BUDGET } : {}), ...(this.#ballotInstrumentVersion === 1 && parsed.intent.type === 'case' && parsed.intent.operation === 'vote' ? { ballotInstrumentVersion: 1 } : {}), ...(state.caseRuntime?.occupiedBody ? { occupiedBodyVersion: 1 } : {}), ...(state.caseRuntime?.swapLifecycle ? { swapLifecycleVersion: 1, playerTextSwapVersion: 1, playerRuntimeCommunicationVersion: 1 } : {}), ...(itemPolicyVersion === 2 && !hasCaseOne(state) ? { playerRuntimeSelfServiceVersion: 1, playerRuntimeOfferedInspectionVersion: 1, shortObservationReferenceVersion: 1 } : {}), ...(state.customAbilitySetup ? { customAbilityVersion: 1, customAbilityRefs: structuredClone(state.customAbilitySetup.selections) } : {}), ...(this.#postureActionVersion === 1 && runtimeCapabilityId(state.agentRuntimeRevision) === 'agent-prison-runtime@8' && !hasCaseOne(state) && itemPolicyVersion === 2 && this.#physicalFactsVersion === 2 ? { postureActionVersion: 1 } : {}), ...(!hasCaseOne(state) && runtimeRevisionForState(state).policy.playerPerformanceVersion === 2 ? { dialogueContextVersion: 1 } : {}), styleVersion: 1, movementGuardVersion: 1, ...(state.creation?.storyArcId === 'case-one-day3@1' ? { storyArcVersion: 1 } : {}), ...(!hasCaseOne(state) ? { causalTimingVersion: 1, ...(itemPolicyVersion !== undefined ? { itemPolicyVersion } : {}),
            ...(runtimeRevisionForState(state).policy.sceneBeatVersion === 1 ? { schedulingVersion: 1, decisionAuditVersion: 1, introductionVersion: 5,
              ...(scheduleWaitVersion !== undefined ? { scheduleWaitVersion } : {}), ...this.#npcMagicCastPin(state) } : {}) } : {}), contentFingerprint: runtimeRevisionForState(state).content.fingerprint,
            executionRevision,
             ...(state.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION ? { bareReplyRootVersion: 1, cellDoorAttemptVersion: 1, ordinaryAddressVersion: 3 } : {}),
                ...(localConditionalWait ? {localConditionalWaitVersion:1} : {}),
                ...(localTravel ? {localTravelAttemptVersion:localTravel} : {}),
              ...(groupSpeech || sequenceVersion === 4 ? { roomGroupSpeechVersion: 1 } : {}),
               ...(sequenceVersion ? { ordinaryDialogueSequenceVersion: sequenceVersion } : {}),
                ...(localApproach ? { ordinaryLocalApproachVersion: localApproach, localApproachHostPerformanceVersion: 1 } : {}),
                 ...(localApproach===3 ? {localReadinessHostIntentVersion:1} : {}),
                 ...(ambientSpeech ? { ordinaryLocalAmbientSpeechVersion: ambientSpeech } : {}),
                 ...(localSearch ? { ordinaryLocalSearchConversationVersion: 1 } : {}),
                 ...(executionRevision.revisionId === EVENT_DIRECTOR_RUNTIME_REVISION ? ordinaryLocalVisualPlanPins(text) : {}),
              ...(scenePresentation === 'novel' ? novelFirstPresentation(
                 { novelScenePresentationVersion: 1, narrationPacingVersion: hasSoftRuntime(state) ? 3 : 1 },
                 executionRevision.revisionId === EVENT_DIRECTOR_RUNTIME_REVISION && newAttemptOf === undefined
                   && intentHint.type === 'interpret' && !courtChoice && !hasCaseOne(state)
                   && [undefined, null, 'daily', 'aftermath'].includes(activeProcedure(state)?.stage)) : {}),
             ...(executionRevision.revisionId === EVENT_DIRECTOR_RUNTIME_REVISION && casePolicy === 'allowed'
               && !courtChoice && !hasCaseOne(state) && newAttemptOf === undefined ? { npcIdentifySourceClosureVersion: 1 } : {}),
            ...(this.#npcManualRecovery && executionRevision.revisionId === EVENT_DIRECTOR_RUNTIME_REVISION
              ? { npcManualRecoveryVersion: this.#npcManualRecovery } : {}),
            ...this.#visualPerformancePin(state),
            ...(npcActPreflight && executionRevision.revisionId === EVENT_DIRECTOR_RUNTIME_REVISION ? { npcActPreflightVersion: npcActPreflight } : {}),
            ...(this.#privateDirectorTail && hiddenSupplyChoice?.packet.data.version === 7 ? { privateDirectorTailVersion: 1 } : {}),
            ...(this.#privateUnissuedAsk && hiddenSupplyChoice?.packet.data.version === 7 ? { privateUnissuedAskVersion: 1 } : {}),
            ...(initialRunPolicy === undefined ? {} : { initialRunPolicy }),
            ...(runtimeRevisionForState(state).policy.playerPerformanceVersion === 2 ? { performanceVersion: 2, caseRecallVersion: 1 } : {}), perceptionVersion: 1, jobId, intentHint, questionKey, answerKey, roomLabelVersion: 2, worldVersion: 1,
            promptSnapshot: this.#promptSnapshot(state), scene: { ...agentScene(parseProjection), readable: materialReadableProjection(projection, createdPlayerId(projection)) } } });
      }
      if (!hasIntentRuntime(state.agentRuntimeRevision)) this.#domain.bindGrowthRequest(state, row, { requestId, text });
      const sealedPlan = this.#agentJobs.input(row);
      assertRuntimeJobRevision(state, sealedPlan);
      if (this.#agentJobs.hasSceneRecovery(row) || this.#sceneRecoveryTask(state, row, sealedPlan))
        fail('INVALID_SCENE_RECOVERY', '此原行动只支持明确的一次性旁白恢复。');
      // Legacy same-text rejoin under another ID is not an explicit resend.
      const manualNpcResume = [1, 2, 3].includes(sealedPlan.npcManualRecoveryVersion) && row.request_id === requestId
        && row.text === text && row.status === 'failed' && row.turn_id === null && row.receipt_json === null;
      const leaseToken = this.#agentJobs.claim(row);
      if (leaseToken === null) return { kind: 'in_progress', receipt: this.#agentReceipt(input, state, false,
        '此发言仍在执行，请稍后重试原请求。没有另起重复模型调用。', 'in_progress') };
      row = this.#agentJobs.get(row.job_id);
      const plan = this.#agentJobs.input(row);
      if (plan.privateReflectionVersion === 1)
        return { kind: 'immediate', receipt: this.#completePrivateReflection(row, state, plan, leaseToken) };
      if ([2, 3, 4, 5, 6, 7].includes(plan.version)) {
        const prepared = this.#prepareNarrativeStage(row, state, plan, leaseToken);
        return manualNpcResume && prepared.kind === 'model' ? { ...prepared, manualNpcResume: true } : prepared;
      }
      return { kind: 'model', jobId: row.job_id, actorId: row.actor_id, leaseToken,
        scope: { actorId: row.actor_id, branchId: row.branch_id, generation: row.generation, revision: row.base_revision },
        tasks: plan.tasks.map(({ manifest, ...task }) => ({ ...task,
          ...(this.#agentJobs.result(row, task.role) === undefined ? {} : { result: this.#agentJobs.result(row, task.role) }) })) };
    }, { reuseVerifiedCommitBytes: true, reuseExactPlanReads: true });
    } finally { v0Timing('prepareAgentTurn', startedAt); }
  }
  #completePrivateReflection(row, state, plan, leaseToken) {
    this.#agentJobs.assertLease(row, leaseToken);
    const action = hostPrivateReflectionAction(row, plan);
    this.#agentJobs.assertNarrativeAction(action);
    const next = structuredClone(state);
    applyAgentAction(next, action);
    const turnId = randomUUID(); next.turnIds.push(turnId);
    this.#insertTurn(turnId, row.text, state, next);
    this.#write(next, 'act', { action: { intentKey: `private-reflection:${row.job_id}` }, stageDelivery: false });
    const receipt = this.#agentReceipt({ requestId: row.request_id }, next, true, '这个念头留在心里，接下来仍由你决定。');
    this.#rememberAgentReceipt({ requestId: row.request_id, text: row.text }, next, receipt);
    this.#agentJobs.commit(row, leaseToken, { turnId, receipt, review: { policy: 'private-reflection@1' } });
    this.#delivery.stage(this.#view(next, { compactOrdinaryHistory: true }));
    return receipt;
  }
  #privateDirectorMode() {
    if (!this.#hiddenSupply) return 'off';
    try { const mode = this.#getHiddenSupplyMode(); return isHiddenSupplyMode(mode) ? mode : 'off'; } catch { return 'off'; }
  }
  #privateDirectorEnabled() { return this.#privateDirectorMode() === 'active'; }
  #captureDirectorEvent(state, scope, jobId, initialRunPolicy, executionRevision, effectiveRunPolicy) {
    const pin = captureEffectiveDirectorEventPin(this.#db, { ...scope, jobId, initialRunPolicy, executionRevision, effectiveRunPolicy }, state);
    return pin ? { directorExtension: pin.packet.data.extension, directorEventPin: pin, directorBoundary: pin.packet.data.boundary } : {};
  }
  #captureDirector(state, scope) {
    if (this.#directorVersion === 2) return { directorExtension: DIRECTOR_LIFECYCLE_EXTENSION,
      directorCandidates: this.#directorCandidatesAt(state),
      directorBoundary: directorBoundary(state, this.#previousTurnState(state)),
      directorSnapshotHash: directorSnapshotHash(state) };
    return this.#captureDirectorPlanning(state, scope);
  }
  #captureDirectorPlanning(state, scope) {
    const source = this.#db.prepare('SELECT commit_ref,snapshot_json FROM domain_commits WHERE generation=? AND revision=?')
      .get(state.generation, state.revision);
    if (!source || !isDeepStrictEqual(JSON.parse(source.snapshot_json), state)) fail('INVALID_AGENT_JOB', '导演起点不是原始领域快照。');
    const pin = this.#directorPlanning.capture({ extension: DIRECTOR_PLANNING_EXTENSION,
      sourceCommitRef: source.commit_ref, state, scope });
    return { directorExtension: DIRECTOR_PLANNING_EXTENSION, directorPlanning: pin,
      directorBoundary: pin.boundary, directorSnapshotHash: pin.snapshotHash };
  }
  #directorCandidatesAt(state) {
    const commit = this.#db.prepare('SELECT commit_ref FROM domain_commits WHERE generation=? AND revision=?').get(state.generation, state.revision);
    if (!commit) fail('INVALID_DOMAIN_STATE', '导演候选起点不存在。');
    return this.#directorCandidates.read(commit.commit_ref);
  }
  directorCandidates() {
    return this.#transaction(() => this.#directorCandidatesAt(this.#state()), { readOnly: true });
  }
  #previousTurnState(state) {
    const turnId = state.turnIds?.at(-1);
    const row = turnId && this.#db.prepare('SELECT before_state FROM prologue_turns WHERE id=?').get(turnId);
    return row ? JSON.parse(row.before_state) : null;
  }
  #customPrompt(state) {
    return isCreatedCustom(state) ? { customCharacter: { id: createHash('sha256').update(JSON.stringify(state.creation.character)).digest('hex'), name: state.creation.character.name } } : {};
  }
  promptCatalog() { return this.#transaction(() => this.#prompts.catalog(this.#promptPreferences(this.#state())), { readOnly: true }); }
  updatePrompt(input) { return this.#transaction(() => this.#prompts.update(input, this.#promptPreferences(this.#state()))); }
  #visualPerformancePin(state) {
    return this.#visualPerformanceGuidance && state.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION
      ? { visualPerformanceGuidanceVersion: this.#visualPerformanceGuidance } : {};
  }
  #newSceneJobExtensions(state) {
    const extensions = newSceneJobExtensions(this.#materialProseVersion, this.#physicalFactsVersion);
    if (!hasCaseOne(state) && runtimeRevisionForState(state).policy.sceneBeatVersion === 1
      && runtimeCapabilityId(state.agentRuntimeRevision) !== 'agent-prison-runtime@8') delete extensions.playerTextMagicVersion;
    if (hasIntentRuntime(state.agentRuntimeRevision)) extensions.intentContractVersion = runtimeRevisionForState(state).policy.intentContractVersion;
    if (hasSoftRuntime(state)) Object.assign(extensions, { softResultVersion: 1, ordinaryParticipationVersion: 1 });
    if (supportsOpenPlayerAction(state.agentRuntimeRevision)) extensions.openActionVersion = 1;
    if (state.authoredMagicVersion === 1) Object.assign(extensions, { authoredMagicVersion: 1, authoredMagicDestinationVersion: 1 });
    return { ...extensions, actorAddressVersion: 2, antiClicheVersion: 1 };
  }
  #promptPreferences(state) {
    return { ...this.#customPrompt(state), currentPerformance: !hasCaseOne(state)
      && runtimeRevisionForState(state).policy.playerPerformanceVersion === 2 };
  }
  #promptSnapshot(state) {
    const preferences = this.#promptPreferences(state);
    const ids = ['director', 'intent_parser', 'world_adjudicator', 'player_performance', 'narrator', 'character_dialogue', 'character_data', 'character_creator', ...actorsForState(state).filter(actor => actor.id !== 'player').map(actor => actor.id)];
    const snapshot = Object.fromEntries(ids.map(id => [id, this.#prompts.resolve(id, preferences)]));
    if (preferences.customCharacter) snapshot.player = this.#prompts.resolve(`custom:${preferences.customCharacter.id}`, preferences);
    return snapshot;
  }
  authoringPrompt() { return this.#transaction(() => this.#prompts.resolve('character_creator'), { readOnly: true }); }
  setupAssistantPrompt() { return this.#transaction(() => this.#prompts.resolve('setup_assistant'), { readOnly: true }); }
  #preflightRelationshipRoot({ state, commitRef, runId, setupRef }) {
    const scope = this.#domain.scope(state), runtime = runtimeRevisionForState(state);
    const initialRunPolicy = this.#domain.initialRunPolicy(state);
    if (!isRelationshipRuntime(state) || scope.commitRef !== commitRef || scope.runId !== runId
      || initialRunPolicy?.version !== 2 || initialRunPolicy.source.setupRef !== setupRef) fail('INVALID_DOMAIN_STATE');
    const upgrade = this.#caseRulesByDefault && state.itemPolicyVersion !== 2 ? this.#caseItemUpgradeView(state) : null;
    const planning = upgrade?.available ? structuredClone(state) : state;
    // Plan the same registered supplies as the later real Host activation, but
    // do not append an action, advance the fence or mutate the committed root.
    if (planning !== state) activateCaseItemPolicy(planning,
      { type: 'case_item_policy_activate', confirmed: true, policy: upgrade.policy });
    const itemPolicyVersion = planning.itemPolicyVersion ?? 1;
    const pin = { version: hasSoftRuntime(state) ? 7 : 6, executionRevision: runtime.executionRevision, initialRunPolicy, ...this.#visualPerformancePin(state),
      ...this.#newSceneJobExtensions(state), ...(hasSoftRuntime(state) ? { executionBudget: SOFT_EXECUTION_BUDGET } : {}), dialogueContextVersion: 1, performanceVersion: 2,
      movementGuardVersion: 1, itemPolicyVersion,
      ...(state.caseRuntime?.swapLifecycle ? { swapLifecycleVersion: 1, playerTextSwapVersion: 1, playerRuntimeCommunicationVersion: 1 } : {}),
      ...(itemPolicyVersion === 2 ? { playerRuntimeSelfServiceVersion: 1, playerRuntimeOfferedInspectionVersion: 1, shortObservationReferenceVersion: 1 } : {}),
      ...(this.#postureActionVersion === 1 && itemPolicyVersion === 2 && this.#physicalFactsVersion === 2 ? { postureActionVersion: 1 } : {}),
      ...(state.customAbilitySetup ? { customAbilityVersion: 1, customAbilityRefs: structuredClone(state.customAbilitySetup.selections) } : {}) };
    const row = { branch_id: scope.branchId, generation: state.generation, base_revision: state.revision };
    const itemWorld = this.#itemPolicySnapshot(planning, pin), prompts = this.#promptSnapshot(state), player = createdPlayerId(state);
    // Magic proof/source authority remains the real root; only its detached
    // planning world carries the already-validated future item policy.
    const baseline = this.#baselineMagic(state, itemWorld);
    // The producer also prepares autonomy before binding every non-magic world
    // field. Preserve its world/magic pair for ALL preview consumers.
    const projected = baseline?.magic ? { ...baseline.world, magic: baseline.magic } : itemWorld;
    const scene = playerPerceivedScene(projected, { ...agentScene(projected), readable: materialReadableProjection(projected, player) }).scene;
    if (scene.case) delete scene.case.testimony;
    const rawInput = '观'.repeat(2000), intent = { type: 'look', summary: '观察当前周围环境' };
    for (const actor of actorsForState(state)) {
      const id = actor.id;
      if (id === player || id === 'warden' || !runtimeActive(projected, id)) continue;
      const subjective = this.#domain.readDecisionState(state, id);
      if (!subjective) fail('ERR_DECISION_STATE');
      const retrieval = this.#domain.retrieveCognition(state, id, { query: '', recentLimit: 6, recallLimit: 8, continuityLimit: 4, includeBackground: true });
      const workingSources = this.#decisions.readSourceObservations({ commitRef, actorId: id, generation: state.generation, revision: state.revision });
      const input = npcDecisionTaskInput(projected, id, subjective, pin, { boundary: this.#physicalBoundary(row, projected, id) });
      if (pin.npcMagicCastVersion === 1 && input.decisionPolicy?.mode === 'act' && projected.magic) {
        const menu = npcMagicMenu(projected, id, this.#domain, state,
          { npcVoluntaryFloatVersion: pin.npcVoluntaryFloatVersion, npcMedicalContactVersion: pin.npcMedicalContactVersion });
        if (menu?.actions.length) {
          input.allowedActions.push('magic_cast'); input.situation.magicActions = menu.actions; input.situation.magicTargets = menu.targets;
          if ([1, 2, 3].includes(pin.npcMagicPersonaPolicyVersion)) input.persona.boundaries = npcMagicPersonaPacketBoundaries(input.persona.boundaries, pin.npcMagicPersonaPolicyVersion, menu);
        }
      }
      const assembled = assembleNpcDecisionTaskPayload({ ownerId: id, runtimePolicy: runtimeRevisionForState(projected).policy,
        worldTime: projected.worldTime, dialogueContextVersion: pin.dialogueContextVersion,
        actorInput: input, subjective, retrieval, workingSourceObservations: workingSources,
        receivedObservations: [], acquiredEvidenceEntries: actorPerception(projected, id).case?.knownEvidence || [],
        ...(pin.npcMagicCastVersion === 1 ? { npcMagicCastVersion: 1 } : {}) });
      finalizeActorTaskPacket({ role: 'roleplay', context: { ...assembled.context }, behaviorPrompt: prompts[id] || prompts.character_dialogue,
        maxBytes: RELATIONSHIP_CONTEXT_BUDGETS.roleplay }, pin, { playerId: player, addressState: projected });
    }
    const cognition = this.#domain.retrieveCognition(state, player, { query: '', recentLimit: 6, recallLimit: 4, includeBackground: true });
    const recall = assemblePlayerTaskRecall(cognition, actorForState(state, player).persona, state.location);
    const data = playerPerformanceTaskData(projected, pin, rawInput, intent, scene, cognition, recall);
    Object.assign(data, { performanceVersion: 2, movementGuardVersion: 1, ...dialogueContextPin(pin) });
    if (pin.outputContractVersion !== undefined) data.outputContractVersion = pin.outputContractVersion;
    if (pin.ambientContinuityVersion === 1) data.ambientContinuityVersion = 1;
    if (pin.materialProseVersion !== undefined) data.materialProseVersion = pin.materialProseVersion;
    if (pin.postureActionVersion === 1) Object.assign(data, { postureActionVersion: 1, postureActions: runtimePoseActions(projected, player) });
    if (isKnowledgeGated(projected)) data.performancePolicy = policyForActor(player, { player: true });
    const actualData = this.#materialTaskData(row, projected, pin, 'player_performance', data);
    finalizeActorTaskPacket({ role: 'player_performance', context: { role: 'player_performance', scope: cognition.scope, data: actualData },
      behaviorPrompt: [...new Set([prompts.player_performance, prompts[player]])].filter(Boolean).join('\n\n'), maxBytes: RELATIONSHIP_CONTEXT_BUDGETS.player_performance }, pin, { addressState: projected });
    const magic = pin.playerTextMagicVersion === 1 ? this.#playerTextMagicOffer(state, pin,
      baseline ?? (planning === state ? undefined : { world: projected, magic: projected.magic })) : null;
    const intentPlan = hasIntentRuntime(runtime.id), softIntent = hasSoftRuntime(state), admission = hasIntentAdmissionRuntime(state);
    finalizeActorTaskPacket({ role: 'world_adjudicator', context: { version: admission ? 7 : softIntent ? 6 : intentPlan ? 3 : 2, ...(softIntent ? { purpose: admission ? INTENT_ADMISSION_PURPOSE : 'intent-plan@2' } : {}), role: 'world_adjudicator',
      principal: { kind: 'service', id: 'world_adjudicator' }, slot: 'intent',
      scope: { principalId: WORLD_SERVICE_PRINCIPAL, branchId: scope.branchId, generation: state.generation, revision: state.revision },
      data: { viewpointActorId: player, rawInput, scene, ...(pin.openActionVersion === 1 ? { openActionVersion: 1 } : {}),
         contractVersion: admission ? 9 : softIntent ? 8 : intentPlan ? 5 : 4, ...(softIntent ? { ordinarySources: [], ...(hasSemanticOrdinaryRuntime(state) ? { ordinarySourceSelection: {
          status: 'no_candidate_in_window', capacity: 16, maxSelected: 3, scanned: 0, eligibleInWindow: 0, oversizeInWindow: 0, mayHaveEarlier: false } } : {}) } : {}),
        ...(intentPlan ? { intentContractVersion: softIntent ? 2 : 1 } : {}), ...dialogueContextPin(pin),
        ...(pin.playerTextMagicVersion === 1 ? { playerTextMagicVersion: 1, ...(magic ? { magic } : {}) } : {}),
        ...(pin.authoredMagicVersion === 1 ? { authoredMagic: authoredMagicContext(state, pin) } : {}),
         ...(pin.playerTextSwapVersion === 1 ? { playerTextSwapVersion: 1 } : {}),
        ...(pin.playerRuntimeSelfServiceVersion === 1 ? { playerRuntimeSelfServiceVersion: 1 } : {}),
        ...(pin.playerRuntimeOfferedInspectionVersion === 1 ? { playerRuntimeOfferedInspectionVersion: 1 } : {}),
        ...(pin.postureActionVersion === 1 ? { postureActionVersion: 1, postureActions: runtimePoseActions(projected, player) } : {}) } },
      behaviorPrompt: prompts.world_adjudicator, maxBytes: RELATIONSHIP_CONTEXT_BUDGETS.narrative }, pin);
  }
  #physicalBoundary(row, state, ownerId = createdPlayerId(state)) {
    return { ...this.#materialBoundary(row, state, ownerId), ...(isRelationshipRuntime(state)
      ? { relationshipContextVersion: 1, executionRevision: runtimeRevisionForState(state).executionRevision } : {}) };
  }
  #preflightDurableTasks({ state, sourceHeadRef, command, plan, projections }) {
    // Called only by this engine's private Domain. The real committed source
    // and prospective fence are checked without publishing a speculative head.
    const before = this.#state(), source = this.#domain.assertHead(before);
    if (source.commit_ref !== sourceHeadRef || state.generation !== before.generation || state.revision !== before.revision + 1
      || state.worldTime !== before.worldTime || plan.request.scope.useId !== command.useId) fail('INVALID_DOMAIN_STATE', '施法任务预检水位不一致。');
    const runtime = runtimeRevisionForState(state), prompts = this.#promptSnapshot(state), player = createdPlayerId(state);
    const pin = { version: hasSoftRuntime(state) ? 7 : 6, ...this.#visualPerformancePin(state), ...this.#newSceneJobExtensions(state), ...(hasSoftRuntime(state) ? { executionBudget: SOFT_EXECUTION_BUDGET } : {}),
      ...(runtime.policy.playerPerformanceVersion === 2 ? { dialogueContextVersion: 1, performanceVersion: 2 } : {}),
      movementGuardVersion: 1, itemPolicyVersion: state.itemPolicyVersion ?? 1,
      ...(isRelationshipRuntime(state) ? { executionRevision: runtime.executionRevision, initialRunPolicy: this.#domain.initialRunPolicy(before) } : {}) };
    const row = { branch_id: source.branch_id, generation: state.generation, base_revision: state.revision };
    for (const projection of projections) {
      if (projection.actorId !== player) {
        if (!projection.subjective) fail('ERR_DECISION_STATE', '施法预检缺少真实主观状态。');
        const id = projection.actorId;
        const actorInput = npcDecisionTaskInput(state, id, projection.subjective, pin,
          { boundary: this.#physicalBoundary(row, state, id) });
        const { context } = assembleNpcDecisionTaskPayload({ ownerId: id, runtimePolicy: runtimeRevisionForState(state).policy,
          worldTime: state.worldTime, dialogueContextVersion: pin.dialogueContextVersion,
          actorInput, subjective: projection.subjective, retrieval: projection.retrieval,
          workingSourceObservations: projection.workingSources, receivedObservations: [],
          acquiredEvidenceEntries: actorPerception(state, id).case?.knownEvidence || [] });
        finalizeActorTaskPacket({ role: 'roleplay', context, behaviorPrompt: prompts[id] || prompts.character_dialogue,
          maxBytes: 32000 }, pin, { playerId: player, addressState: state });
        continue;
      }
      const recall = assemblePlayerTaskRecall(projection.retrieval, actorForState(state, player).persona, state.location);
      let scene = playerPerceivedScene(state, { ...agentScene(state), readable: materialReadableProjection(state, player) }).scene;
      if (scene.case) delete scene.case.testimony;
      const data = playerPerformanceTaskData(state, pin, '观察四周', { type: 'look', summary: '观察当前周围环境' }, scene, projection.retrieval, recall);
      Object.assign(data, { performanceVersion: 2, movementGuardVersion: 1 });
      // Composer-only timeline pin is not part of a player performance packet.
      if (pin.outputContractVersion !== undefined) data.outputContractVersion = pin.outputContractVersion;
      if (pin.ambientContinuityVersion === 1) data.ambientContinuityVersion = 1;
      if (pin.materialProseVersion !== undefined) data.materialProseVersion = pin.materialProseVersion;
      if (isKnowledgeGated(state)) data.performancePolicy = policyForActor(player, { player: true });
      const actualData = this.#materialTaskData(row, state, pin, 'player_performance', data);
      finalizeActorTaskPacket({ role: 'player_performance', context: { role: 'player_performance',
        scope: projection.retrieval.scope, data: actualData }, behaviorPrompt: [...new Set([prompts.player_performance, prompts[player]])].filter(Boolean).join('\n\n'), maxBytes: 48000 }, pin, { addressState: state });
    }
  }
  #temporaryMagic(state, { nativeOnly = false, world = state, domainHeadState, journalAnchor } = {}) {
    if (!this.#domainReady || !this.#magicPolicy || state?.magic || state?.exampleId !== 'agent') return null;
    try {
      const initial = structuredClone(runtimeItemProjection(world));
      if (!initial.caseRuntime) enableCaseRuntime(initial); enableAutonomy(initial);
      let head;
      try { head = this.#domain.assertHead(state); } catch { head = null; }
      if (head) {
        // Ordinary text on a current committed head (including an old,
        // previously unactivated rev>0 save). The proof is Host-only over the
        // exact head and scope; nothing is persisted and no activation receipt
        // or backup is created. The accepted act itself publishes the cast.
        const magic = initializeHostMagic(initial, { scope: this.#domain.scope(state),
          bindings: this.#magicPolicy.bindings, nativeOnly,
          ...(this.#magicPolicy.version === 2 ? { bindingPolicy: this.#magicPolicy,
            initialKnowledgeSources: actorId => this.#domain.retrieveCognition(state, actorId,
              { recentLimit: 1, recallLimit: 0, includeBackground: true }).backgroundObservations.filter(row =>
                this.#db.prepare(`SELECT 1 FROM cognition_observations o JOIN domain_world_events e ON e.event_ref=o.event_ref
                  WHERE o.id=? AND o.owner_id=? AND e.kind='actor_initial_knowledge'`).get(row.id, actorId)) } : {}),
          approvedBy: this.#magicPolicy.approvedBy, setupRef: this.#magicPolicy.ref,
          initializationProof: { version: 1, mode: 'current', commitRef: head.commit_ref, runId: head.run_id,
            branchId: head.branch_id, generation: state.generation, revision: state.revision },
          domainStore: { assertHead: () => head,
            assertMagicInitialization: proof => this.#domain.assertMagicInitialization(proof, state) } });
        return { magic, world: initial };
      }
      // Historical replay must reproduce the exact projection that the live
      // act built from this same `before` snapshot. Do not initialize from the
      // new-game root and refresh: that changes knowledge `at`/initial waking
      // and therefore the prefix state hash. Instead prove this committed
      // snapshot is a read-only ancestor of the current head, and initialize
      // from it with the same source cognition/scope the live act used.
      const source = this.#domain.assertSnapshot(state);
      // Journal replay validates an already committed target, not the currently open run.
      const currentState = journalAnchor ?? domainHeadState ?? this.#state();
      const current = this.#domain.assertSnapshot(currentState);
      const magic = initializeHostMagic(initial, {
        scope: this.#domain.scopeAt(state),
        bindings: this.#magicPolicy.bindings, nativeOnly,
        ...(this.#magicPolicy.version === 2 ? { bindingPolicy: this.#magicPolicy,
          initialKnowledgeSources: actorId => this.#domain.retrieveCheckpointCognition(currentState, state, actorId,
            { recentLimit: 1, recallLimit: 0, includeBackground: true }, { journalAnchor: Boolean(journalAnchor) }).backgroundObservations.filter(row =>
              this.#db.prepare(`SELECT 1 FROM cognition_observations o JOIN domain_world_events e ON e.event_ref=o.event_ref
                WHERE o.id=? AND o.owner_id=? AND e.kind='actor_initial_knowledge'`).get(row.id, actorId)) } : {}),
        approvedBy: this.#magicPolicy.approvedBy, setupRef: this.#magicPolicy.ref,
        initializationProof: { version: 1, mode: 'ancestor', commitRef: source.commit_ref,
          runId: source.run_id, branchId: source.branch_id, generation: state.generation,
          revision: state.revision, headCommitRef: current.commit_ref, headRunId: current.run_id },
        domainStore: { assertHead: () => source,
          assertMagicInitialization: proof => this.#domain.assertMagicInitialization(proof, state, journalAnchor) } });
      return { magic, world: initial };
    } catch { return null; }
  }
  #customTextCommand(state, action) {
    const choice = action?.intent?.magic;
    if (!choice || typeof choice !== 'object' || choice.customBinding === undefined) return null;
    if (!this.#domainReady || typeof choice.customBinding !== 'string' || typeof choice.targetHandle !== 'string'
      || typeof action.jobId !== 'string') fail('INVALID_DOMAIN_STATE');
    const capabilities = this.#domain.customAbilityCapabilities(state);
    const binding = capabilities.actions.find(row => row.bindingHandle === choice.customBinding);
    const source = capabilities.sources.find(row => row.handle === choice.targetHandle);
    const destination = capabilities.destinations.find(row => row.handle === choice.targetHandle);
    if (!binding) fail('CUSTOM_ABILITY_NOT_READY');
    const intent = binding.mechanism === 'sound-reproduction' && source
      ? { kind: 'sound-replay', sourceHandle: source.handle }
      : binding.mechanism === 'body-relocation' && destination
        ? { kind: 'position-change', destinationHandle: destination.handle } : null;
    if (!intent) fail('CUSTOM_ABILITY_NOT_READY');
    return { requestId: `${action.jobId}:custom`, bindingHandle: binding.bindingHandle, intent,
      expectedGeneration: state.generation, expectedRevision: state.revision };
  }
  #swapTextCommand(state, action, historical = false) {
    const choice = action?.intent?.magic;
    if (!choice || typeof choice !== 'object' || action?.jobId === undefined) return null;
    const restore = choice.swapAction === 'restore';
    if (!restore && choice.grantId === undefined) return null;
    if (!this.#domainReady || !this.#swapLifecycleVersion || state?.caseRuntime?.swapLifecycle === undefined) return null;
    if (typeof action.jobId !== 'string') fail('INVALID_DOMAIN_STATE');
    const capabilities = historical ? this.#domain.swapLifecycleCapabilitiesAt(state) : this.#domain.swapLifecycleCapabilities(state);
    if (restore) {
      if (typeof choice.relationHandle !== 'string') fail('INVALID_DOMAIN_STATE');
      const relation = capabilities.relations.find(row => row.handle === choice.relationHandle);
      if (!relation) fail('MAGIC_SWAP_NOT_READY');
      return { type: 'magic_swap_restore', requestId: `${action.jobId}:swap`, handle: relation.handle,
        expectedGeneration: state.generation, expectedRevision: state.revision };
    }
    const holding = capabilities.offers.find(row => row.targetHandle === choice.targetHandle);
    if (!holding) fail('MAGIC_SWAP_NOT_READY');
    // Historical replay must read the saved projection at that exact snapshot;
    // #magicAt audits the live head and deliberately rejects an ancestor.
    const magic = historical
      ? (() => { const scope = this.#domain.assertSnapshot(state);
        return this.#magicRepository.readAt({ commitRef: scope.commit_ref, runId: scope.run_id })?.state || null; })()
      : this.#magicAt(state);
    const grant = magic?.grants.find(row => row.id === choice.grantId && row.enabled === true);
    const definition = grant && magicDefinition(grant.definitionRef);
    if (!grant || definition?.operation !== 'body-swap') fail('INVALID_ABILITY_PENDING');
    return { type: 'magic_swap_establish', requestId: `${action.jobId}:swap`, handle: holding.handle,
      targetHandle: choice.targetHandle, expectedGeneration: state.generation, expectedRevision: state.revision };
  }
  #playerTextMagicOffer(state, plan, planningMagic) {
    if (!this.#domainReady || state?.exampleId !== 'agent') return null;
    const historical = Boolean(plan.regeneration);
    // The state, checkpoint and SQLite transaction are identical; the
    // earlier expression did not write or advance the authoritative revision.
    const persistedMagic = this.#magicAt(state, historical);
    const temporary = persistedMagic ? null : (planningMagic ?? this.#baselineMagic(state));
    const magic = persistedMagic || temporary?.magic || null;
    const world = temporary?.world || planningMagic?.world || state;
    const custom = state.customAbilitySetup ? this.#domain.customAbilityCapabilities(state) : null;
    const swap = this.#swapLifecycleVersion === 1 && state.caseRuntime?.swapLifecycle
      ? (historical ? this.#domain.swapLifecycleCapabilitiesAt(state) : this.#domain.swapLifecycleCapabilities(state)) : null;
    const actorId = createdPlayerId(state);
    // Magic owner sources keep the checkpoint scope; only the enclosing task
    // uses the current execution fence. Never retrieve the abandoned future.
    const options = { recentLimit: 32, recallLimit: 0 };
    const sources = historical
      ? this.#domain.retrieveCheckpointCognition(this.#state(), plan.regeneration.checkpoint, actorId, options)
      : this.#domain.retrieveCognition(state, actorId, options);
    return playerTextMagicOffer(world, magic, actorId, sources, custom, swap);
  }
  #narrativeHint(intent) {
    if (intent.type === 'interpret' || intent.type === 'case' || intent.summary) return intent;
    return { type: intent.type, summary: intent.type === 'conversation' ? `向眼前的人表达：${intent.playerText}` : ({ look: '观察当前周围环境', broadcast: '查看眼前的显示屏', move: '前往选择的相邻地点', wait: '在当前地点等待片刻' }[intent.type]),
      ...(intent.targetId ? { targetId: intent.targetId } : {}), ...(intent.playerText ? { playerText: intent.playerText } : {}),
      ...(intent.target ? { destination: intent.target } : {}) };
  }
  #itemPolicySnapshot(state, plan) {
    const captureRoot = plan.rootCaseOptionsVersion === 1 && state.rootCaseOptionsVersion !== 1;
    if (!Object.hasOwn(plan, 'itemPolicyVersion') && !captureRoot) return state;
    const snapshot = structuredClone(state);
    if (Object.hasOwn(plan, 'itemPolicyVersion')) runtimeApplyItemPolicy(snapshot, plan.itemPolicyVersion);
    if (captureRoot) snapshot.rootCaseOptionsVersion = 1;
    return snapshot;
  }
  #materialBoundary(row, state, ownerId = createdPlayerId(state)) {
    return { ownerId, branchId: row.branch_id, generation: row.generation, revision: row.base_revision,
      roomId: actorRoom(state, ownerId), worldTime: state.worldTime };
  }
  #materialScene(row, state, plan, intent, composer = false) {
    // Legacy unpinned item snapshots may alias the committed source. Runtime
    // initialization belongs only to this detached material projection.
    const snapshot = this.#itemPolicySnapshot(state, plan);
    const projected = snapshot === state ? structuredClone(state) : snapshot;
    if (!hasCaseOne(projected)) enableCaseRuntime(projected);
    const projectedScene = playerPerceivedScene(projected, { ...agentScene(projected),
      readable: materialReadableProjection(projected, createdPlayerId(projected)) });
    const scene = projectedScene.scene;
    if (!composer && [2, 3].includes(plan.ordinaryAddressVersion)) {
      Object.assign(scene, this.#playerReplyContext(projected, createdPlayerId(projected), projectedScene, plan));
    }
    // Only the real current source projection enters the new authority packet.
    // Do not inherit old v1 optics or document/action-derived material overlays.
    delete scene.materialFacts; delete scene.access;
    if (plan.physicalFactsVersion === 2) Object.assign(scene,
      currentPhysicalScene(projected, createdPlayerId(projected), scene, this.#physicalBoundary(row, state)));
    else if (plan.materialProseVersion === 2) delete scene.physicalFacts;
    if (plan.hostCaseChoiceVersion === 1 && scene.case) delete scene.case.testimony;
    if (!composer) return scene;
    const { readable, rulebookAccess, caseRuntime, actionLimits, ...visible } = scene;
    if (intent.subjectId && readable?.some(entry => entry.id === intent.subjectId))
      visible.readable = readable.filter(entry => entry.id === intent.subjectId);
    if (visible.case) {
      const { knownEvidence, inspectables, disclosedEvidence, statements, testimony, ...procedure } = visible.case;
      visible.case = procedure;
    }
    return visible;
  }
  #materialIntermediates(row, base, plan, intent, settled, prefixes) {
    const snapshots = new Map();
    for (const state of prefixes) {
      const events = state.entries.slice(base.entries.length).filter(entry => !['reflection', 'narration'].includes(entry.delivery));
      const eventIndex = events.length;
      if (eventIndex < 1 || eventIndex >= settled.publicEvents.length
        || events.at(-1).occurredAt !== state.worldTime
        || events.some((entry, index) => ['speaker', 'delivery', 'text'].some(key => entry[key] !== settled.publicEvents[index]?.[key]))) continue;
      snapshots.set(eventIndex, { eventIndex, boundary: this.#materialBoundary(row, state),
        scene: this.#materialScene(row, state, plan, intent, true) });
    }
    return [...snapshots.values()].sort((a, b) => a.eventIndex - b.eventIndex);
  }
  #materialTaskData(row, state, plan, role, data, after = state) {
    if (!(plan.materialProseVersion === 2 || plan.physicalFactsVersion === 2)
      || !['player_performance', 'scene_composer'].includes(role)) return data;
    const composer = role === 'scene_composer';
    if (Object.hasOwn(data, 'postureSettlement')) { data = { ...data }; delete data.postureSettlement; }
    const poseSource = plan.postureActionVersion === 1 && composer ? after.caseRuntime?.poseSourcesByActor?.[createdPlayerId(after)] : null;
    const poseEntry = poseSource?.observationKey === `pose:${row.job_id}:${createdPlayerId(after)}`
      && after.entries.find(entry => entry.observationKey === poseSource.observationKey);
    const poseEvent = poseEntry && data.events?.find(event => event.delivery === poseEntry.delivery && event.text === poseEntry.text && event.speaker === poseEntry.speaker);
    return { ...data, ...(poseEvent ? { postureSettlement: { eventId: poseEvent.id, posture: after.caseRuntime.posesByActor[createdPlayerId(after)].posture } } : {}),
      ...(plan.physicalFactsVersion !== undefined ? { physicalFactsVersion: plan.physicalFactsVersion } : {}),
      materialProseBoundaries: { before: this.#materialBoundary(row, state), after: this.#materialBoundary(row, after) },
      ...(composer ? { sceneBefore: this.#materialScene(row, state, plan, data.intent, true),
        sceneAfter: this.#materialScene(row, after, plan, data.intent, true) }
        : { scene: this.#materialScene(row, state, plan, data.intent) }) };
  }
  #intentSourceSnapshot(state, plan) {
    const snapshot = this.#itemPolicySnapshot(state, plan);
    const source = snapshot === state ? structuredClone(state) : snapshot;
    if (!hasCaseOne(source)) enableCaseRuntime(source);
    return source;
  }
  #resolvedIntentPlan(state, plan, value) {
    if (plan.hostCaseChoiceVersion === 1) {
      const row = this.#agentJobs.get(plan.jobId);
      const choice = withRunBoundary(state, plan.runPolicyConsumersVersion === 1 ? plan.effectiveRunPolicy : undefined, () => hostCaseChoicePlan(this.#intentSourceSnapshot(state, plan), row.text));
      if (!choice?.accepted || !isDeepStrictEqual(choice.intent, plan.intentHint)) fail('INVALID_AGENT_JOB');
      return choice.plan;
    }
    if (![1, 2].includes(plan.intentContractVersion) || value?.type !== 'plan') return undefined;
    if (hasIntentAdmissionRuntime(plan)) value = projectIntentAdmissionPlan(value);
    const targets = playerPerceivedScene(this.#itemPolicySnapshot(state, plan), plan.scene).targetIds;
    return { ...structuredClone(value), steps: value.steps.map(step => ({ ...structuredClone(step),
      intent: resolvePerceivedIntent(step.intent, targets) })) };
  }
  #perceivedIntent(state, plan, intent) {
    const steps = this.#resolvedIntentPlan(state, plan, intent);
    if (steps) {
      if (steps.route !== 'steps') return null;
      if (plan.hostCaseChoiceVersion === 1) return structuredClone(steps.steps[0].intent);
      const first = steps.steps[0]; const effective = plan.effectiveRunPolicy;
      if (effective?.source.adoptedCommitRef && effectiveBoundaryDecision(effective.playPolicy, first.intent.type, { semantic: true })) return null;
      if (first.intent.type === 'magic') {
        const authored = authoredMagicContext(state, plan);
        return authored && validAuthoredMagicChoice(first.intent.magic, authored.text) ? first.intent : null;
      }
      return withRunBoundary(state, effective, () => resolvePlayerPlanStep(this.#intentSourceSnapshot(state, plan), first));
    }
    return plan.perceptionVersion === 1
      ? resolvePerceivedIntent(intent, playerPerceivedScene(this.#itemPolicySnapshot(state, plan), plan.scene).targetIds) : intent;
  }
  #narrativeCognition(row, state, plan, actorId, options) {
    if (!plan.regeneration) return this.#domain.retrieveCognition(state, actorId, options);
    const retrieval = this.#domain.retrieveCheckpointCognition(this.#state(), plan.regeneration.checkpoint, actorId, options);
    // The source watermark remains the ancestor; only the task execution fence
    // is projected onto the still-current head. No future data is retrieved.
    const scope = { actorId, branchId: row.branch_id, generation: row.generation, revision: row.base_revision };
    const projected = { ...retrieval, scope };
    for (const key of ['recentObservations', 'backgroundObservations', 'recall', 'sourceObservations', 'requiredObservations', 'requiredCaseObservations', 'requiredDurableAcquisitionObservations', 'relationshipObservations']) {
      if (retrieval[key]) projected[key] = retrieval[key].map(entry => ({ ...entry, ...scope }));
    }
    return projected;
  }
  #decisionSourcesAt(row, state, plan, actorId, { includeArchive = false } = {}) {
    let scope;
    if (plan.regeneration) {
      // Reuse the domain's effective-ancestor guard before reading source bodies.
      // The execution head is only a fence, never a regeneration knowledge source.
      this.#domain.retrieveCheckpointCognition(this.#state(), plan.regeneration.checkpoint, actorId,
        { query: '', recentLimit: 1, recallLimit: 0 });
      const source = this.#db.prepare('SELECT commit_ref,branch_id,generation,revision FROM domain_commits WHERE generation=? AND revision=?')
        .get(state.generation, state.revision);
      if (!source) fail('INVALID_DOMAIN_STATE', '主观状态的历史来源不在当前行动路径内。');
      scope = { commitRef: source.commit_ref, branchId: source.branch_id, generation: source.generation, revision: source.revision };
    } else scope = this.#domain.scope(state);
    const observations = this.#decisions.readSourceObservations({ commitRef: scope.commitRef, actorId,
      generation: scope.generation, revision: scope.revision }, { includeArchive });
    const execution = plan.regeneration ? { actorId, branchId: row.branch_id, generation: row.generation, revision: row.base_revision }
      : { actorId, branchId: scope.branchId, generation: scope.generation, revision: scope.revision };
    return observations.map(observation => ({ ...observation, ...execution }));
  }
  #decisionStateAt(row, state, plan, actorId) {
    const current = plan.regeneration ? this.#domain.readCheckpointDecisionState(this.#state(), plan.regeneration.checkpoint, actorId)
      : this.#domain.readDecisionState(state, actorId);
    if (current) return current;
    if (runtimeRevisionForState(state).policy.psychologicalInitialization === 1) {
      fail('ERR_DECISION_STATE', '当前角色的已封存心理根状态缺失，原始进度保持不变。');
    }
    const retrieval = this.#narrativeCognition(row, state, plan, actorId, { query: '', recallLimit: 0, includeBackground: true });
    return initialDecisionState(actorForState(state, actorId), [...new Map([...retrieval.backgroundObservations, ...retrieval.recentObservations].map(row => [row.id, row])).values()], { worldTime: state.worldTime });
  }
  #prepareNarrativeStage(row, state, plan, token, options) {
    return withRunBoundary(state, plan.runPolicyConsumersVersion === 1 ? plan.effectiveRunPolicy : undefined, () => this.#prepareNarrativeStageScoped(row, state, plan, token, options));
  }
  #prepareNarrativeStageScoped(row, state, plan, token, { stopNewNpcBeats = false, hostScenePresentation } = {}) {
    if ((plan.swapLifecycleVersion === 1) !== Boolean(state.caseRuntime?.swapLifecycle)) fail('INVALID_AGENT_JOB', '互换生命周期版本与封存起点不一致。');
    if ((plan.occupiedBodyVersion === 1) !== Boolean(state.caseRuntime?.occupiedBody)) fail('INVALID_AGENT_JOB', '身体消费版本与封存起点不一致。');
    if (state.caseRuntime?.occupiedBody) this.#domain.assertOccupiedBodyWorld(state);
    assertRuntimeJobRevision(state, plan);
    const existing = this.#agentJobs.tasks(row); const result = id => existing.find(task => task.id === id)?.result;
    // A pending legacy review may already bind a Host document. Its input is
    // authoritative across retries, even if the caller now prefers novels.
    const hostBoundaryReview = plan.novelScenePresentationVersion !== 1
      && requiresInitialBoundaryReview(adjudicationPolicy(plan)) && !result('scene')
      && (hostScenePresentation === 'host@1' || existing.some(task => task.id === INITIAL_BOUNDARY_REVIEW_SLOT));
    if (hostBoundaryReview) stopNewNpcBeats = true;
    if (plan.ballotInstrumentVersion === 1) for (const task of existing) this.#assertBallotTask(row, state, plan, task);
    const playerId = createdPlayerId(state);
    const scopeFor = actorId => ({ actorId, branchId: row.branch_id, generation: row.generation, revision: row.base_revision });
    const behavior = (role, actorId, slot) => [...new Set([...(plan.directorExtension && !isSealedDirectorExtension(plan.directorExtension) ? [] : [4, 5, 6, 7].includes(plan.version) ? (role === 'scene_composer' ? [plan.promptSnapshot.director] : []) : [plan.promptSnapshot.director]),
      role === 'character_dialogue' ? plan.promptSnapshot[actorId]
        : role === 'scene_composer' && novelNarrationFocusTaskPin(plan, { id: slot, role }).novelNarrationFocusVersion === 1
          ? `旁白风格偏好（只用于口吻）：\n${focusedNarratorPreference(plan.promptSnapshot.narrator)}`
          : role === 'scene_composer' ? `${plan.narrationPacingVersion === 2
           ? '只按已有材料展开，守住每个发布旁白自然段的下限；不延伸玩家行动或当前情节。\n旁白风格偏好（只用于口吻）：'
           : plan.narrationPacingVersion === 3
             ? '只按可核实的已有材料把本轮正文写足，全部新增旁白合计争取达到 500 汉字；按剧情自然分段，段无最低字数。材料不足就保留诚实短文，不延伸行动、不补造事实。\n旁白风格偏好（只用于口吻）：'
           : plan.outputContractVersion === 1 && plan.novelScenePresentationVersion === 1
          ? '按已有材料充分展开现场，并把选择交还给玩家；篇幅是建议，场景上限和事件顺序优先。\n旁白写作偏好：'
          : `${plan.outputContractVersion === 1 ? '只按已有材料组织现场与交还选择；没有最少字数，短场景自然收束，不用篇幅推进时间。' : '按完整场景组织起势、回应、可见后果与交还选择，正文目标 1000–2500 汉字；不沿用旧版短旁白的篇幅。'}\n旁白风格偏好（仅适用于口吻，篇幅和契约以本场景要求为准）：`}\n${plan.promptSnapshot.narrator}` : plan.promptSnapshot[role],
      ...(role === 'player_performance' ? [plan.promptSnapshot[actorId]] : [])].filter(Boolean))].join('\n\n');
    // Share only this stage call's unchanged before-frame for emitted hints.
    let stageCommittedMagic;
    const add = (id, role, actorId, context, manifest, sceneFrame, scheduling, addressState = state, resizeLegacyNpc) => {
      const prior = existing.find(task => task.id === id);
      if (prior) return prior;
      const behaviorRole = role; const behaviorActorId = actorId;
      if (role === 'intent_parser' && plan.initialRunPolicy !== undefined) {
        if (id !== 'intent' || ![RP_FOUNDATION_RUNTIME_REVISION, RELATIONSHIP_RUNTIME_REVISION, INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(plan.executionRevision?.revisionId)) fail('INVALID_AGENT_JOB');
        const { actorId: viewpointActorId, ...scope } = context.scope;
        role = 'world_adjudicator'; actorId = WORLD_SERVICE_PRINCIPAL;
        context = { version: hasIntentAdmissionRuntime(plan) ? 7 : plan.intentContractVersion === 2 ? 6 : [1, 2].includes(plan.intentContractVersion) ? 3 : plan.initialRunPolicy.version, role, principal: { kind: 'service', id: 'world_adjudicator' }, slot: id, ...(plan.intentContractVersion === 2 ? { purpose: hasIntentAdmissionRuntime(plan) ? INTENT_ADMISSION_PURPOSE : 'intent-plan@2' } : {}),
          scope: { principalId: WORLD_SERVICE_PRINCIPAL, ...scope },
          data: { viewpointActorId, ...context.data, ...(plan.openActionVersion === 1 ? { openActionVersion: 1 } : {}),
              ...(plan.localConditionalWaitVersion===1 ? {localConditionalWaitVersion:1} : {}),
              ...([1,2].includes(plan.localTravelAttemptVersion) ? {localTravelAttemptVersion:plan.localTravelAttemptVersion} : {}),
             ...(plan.localReadinessHostIntentVersion===1 ? {localReadinessHostIntentVersion:1} : {}),
              initialRunPolicy: plan.initialRunPolicy, ...effectiveAdjudicationData(plan) } };
      }
      if (plan.npcMagicCastVersion === 1 && role === 'roleplay' && typeof id === 'string' && id.startsWith('npc:')) context = { ...context, npcMagicCastVersion: 1 };
      if (plan.npcActPreflightVersion && role === 'roleplay' && sceneFrame && id.startsWith('npc:')
        && context.decisionPolicy?.mode === 'act') context = { ...context, npcActPreflightVersion: plan.npcActPreflightVersion };
      const policy = isKnowledgeGated(state) && role === 'roleplay'
        && !(context.allowedActions?.length === 1 && context.allowedActions[0] === 'vote') ? policyForActor(actorId, { unidentified: !recognizesPerson(state, playerId, actorId) }) : null;
      // Beat NPCs receive their authenticated menu from the actual scene prefix,
      // never this ordinary before-frame hint. Do not build a second, unused
      // temporary baseline, capabilities or retrieval for those slots.
      const beatMagicMenu = plan.npcMagicCastVersion === 1 && role === 'roleplay' && id.startsWith('npc:');
      const needsMagic = !plan.regeneration && !state.completed && !beatMagicMenu
        && ['roleplay', 'player_performance'].includes(role);
      if (needsMagic && stageCommittedMagic === undefined) stageCommittedMagic = this.#magicAt(state);
      let magic = needsMagic ? stageCommittedMagic : null;
      if (needsMagic && !magic && plan.npcMagicCastVersion === 1 && role === 'roleplay') {
        const baseline = this.#baselineMagic(state)?.magic;
        if (baseline) magic = refreshHostMagic(state, baseline, this.#domain.scope(state), { domainStore: this.#domain, sourceState: state });
      }
      const magicCapability = magic ? hostMagicCapabilities(state, magic, actorId,
        this.#domain.retrieveCognition(state, actorId, { recentLimit: 32, recallLimit: 0 })) : null;
      const task = { id, role, actorId, ...(id === SOFT_SLOT ? { manifest } : {}), ...dialogueContextPin(plan), ...sceneExtensionPin(plan), ...(plan.ballotInstrumentVersion === 1 ? { ballotInstrumentVersion: 1 } : {}), context: policy && !context.performancePolicy ? { ...context, performancePolicy: policy,
        persona: { ...context.persona, appearance: runtimePhysicalActor(state, actorId).appearance } } : context,
        ...(plan.itemPolicyVersion !== undefined ? { itemPolicyVersion: plan.itemPolicyVersion } : {}),
      ...(plan.caseActionTimingVersion !== undefined ? { caseActionTimingVersion: plan.caseActionTimingVersion } : {}),
        ...(sceneFrame ? { sceneFrame } : {}),
        ...(scheduling ? { scheduling } : {}),
        maxBytes: role === 'director' && isSealedDirectorExtension(plan.directorExtension) ? 16000 : role === 'scene_composer' ? 64000 : ['intent_parser', 'world_adjudicator', 'player_performance', 'narrator'].includes(role) ? 48000 : 32000,
        // New jobs capture the independent service preference. A historical
        // snapshot without this key keeps its exact old role/default behavior;
        // never resolve live prompts while preparing a later slot of that job.
        behaviorPrompt: role === 'director' && isSealedDirectorExtension(plan.directorExtension) ? ''
          : (role === 'world_adjudicator' && Object.hasOwn(plan.promptSnapshot, 'world_adjudicator')
          ? plan.promptSnapshot.world_adjudicator
          : behavior(behaviorRole === 'roleplay' ? 'character_dialogue' : behaviorRole, behaviorActorId, id))
          + (plan.postureActionVersion === 1 && behaviorRole === 'intent_parser' ? '\nPosture action version1: postureActions is a closed HOST player-only menu. Only if the ENTIRE rawInput, apart from trailing 。！!, exactly matches a listed choices string, return {"type":"act","operation":"pose","subjectId":"offered id","playerChoice":"EXACT original rawInput","summary":"chosen posture"}. Quotes, reading, reflection, negation, hypotheticals, other actors or unsupported support never authorize posture. Otherwise retain the ordinary attempt contract. Upper bunks, chairs and injured/restrained bodies are gated. NPC typed posture execution is NOT IMPLEMENTED.' : '')
          + (plan.postureActionVersion === 1 && role === 'player_performance' ? '\nPosture action version1: selected pose is a PLAN, not a current physical fact. Describe preparation only; never announce sitting/lying/standing completion before the HOST settlement event. Existing current posture remains as physicalFacts.pose until then.' : '')
          + (plan.customAbilityVersion === 1 && behaviorActorId === playerId ? `\n本局自定义能力仅经独立宿主入口结算；当前已知能力：${JSON.stringify(plan.customAbilityRefs.filter(ref=>ref.initialState.recognition==='known').map(ref=>({definitionId:ref.definitionId,stage:ref.initialState.stage})))}。本任务不得自行宣告效果。` : '')
          + (magicCapability
            ? `\n当前本人魔法能力句柄（仅宿主独立施法入口执行；此对白任务不能自行宣告效果）：${JSON.stringify(magicCapability)}` : ''),
        ...(plan.styleVersion === 1 ? { styleVersion: 1 } : {}) };
      task.behaviorPrompt += firstOfferReliabilityGuidance(task, plan.executionRevision?.revisionId, plan.npcActPreflightVersion);
      try { finalizeActorTaskPacket(task, plan, { playerId, addressState }); }
      catch (error) {
        if (!resizeLegacyNpc || error.code !== 'ERR_AGENT_CONTEXT_TOO_LARGE') throw error;
        // Preserve every packet that already fit. Only a new legacy NPC slot
        // can reselect optional recall after the final wire fields are added.
        const finalBytes = Buffer.byteLength(JSON.stringify(buildRoleplayContext(task.context, { maxBytes: 64000 })), 'utf8');
        const wireBytes = finalBytes - manifest.packetBytes;
        if (finalBytes <= task.maxBytes || wireBytes <= 0) throw error;
        ({ context: task.context, manifest } = resizeLegacyNpc(task.maxBytes - wireBytes));
        finalizeActorTaskPacket(task, plan, { playerId, addressState });
      }
      if (role === 'director' && isSealedDirectorExtension(plan.directorExtension)) {
        task.directorSystemSeal = modelSystemPolicySeal(task.context);
      }
      if (task.context.data?.ballotInstrumentVersion === 1) {
        task.context.systemPolicySeal = modelSystemPolicySeal(task.context, task.behaviorPrompt);
        buildNarrativeContext(task.context);
      }
      const actualManifest = task.context.ordinaryParticipationVersion === 1
        ? { ...manifest, packetBytes: Buffer.byteLength(JSON.stringify(buildRoleplayContext(task.context, { maxBytes: task.maxBytes })), 'utf8') } : manifest;
      const persisted = this.#agentJobs.addTask(row, { ...task, trace: traceTask(task, actualManifest) }, token);
      if (!plan.regeneration && ['roleplay', 'player_performance'].includes(role))
        this.#domain.recordDurableMemoryTaskDelivery(state, { jobId: row.job_id, slot: id });
      return persisted;
    };
    const narrative = (id, role, data, manifest, scheduling, materialState = state) => {
      if (role === 'player_performance') data = this.#materialTaskData(row, materialState, plan, role, data);
      if (plan.ballotInstrumentVersion === 1 && ['player_performance', 'scene_composer'].includes(role)) {
        data = { ...data, ballotInstrumentVersion: 1, ballotInstrumentSource: this.#domain.ballotInstrumentSource(state,
          { ownerId: playerId, intent: data.intent, operationRef: row.job_id, historical: Boolean(plan.regeneration) }) };
      }
      const reaction = role === 'scene_composer' ? existing.find(task => task.id === 'performance')?.context.data.statementReaction : null;
      const delivered = reaction?.deliveryVersion === 1 ? data.events?.find(event => ['speech', 'writing'].includes(event.delivery)
        && event.text === reaction.communicationText) : null;
      return add(id, role, playerId,
        { role, scope: scopeFor(playerId), data: { ...data,
          ...(plan.postureActionVersion === 1 ? { postureActionVersion: 1,
            ...(['intent_parser', 'player_performance'].includes(role) ? { postureActions: runtimePoseActions(this.#itemPolicySnapshot(state, plan), playerId) } : {}) } : {}),
          ...(plan.outputContractVersion === 1 ? { outputContractVersion: 1 } : {}),
          ...(plan.outputContractVersion === 1 && plan.narrationPacingVersion && role === 'scene_composer' ? { narrationPacingVersion: plan.narrationPacingVersion } : {}),
          ...(plan.ambientContinuityVersion === 1 && ['player_performance', 'scene_composer'].includes(role) ? { ambientContinuityVersion: 1 } : {}),
          ...([1, 2].includes(plan.materialProseVersion) && ['player_performance', 'scene_composer'].includes(role) ? { materialProseVersion: plan.materialProseVersion } : {}),
          // Bind only a public event id, never the private delivery audience.
          ...(delivered ? { statementReaction: { version: 1, deliveryVersion: 1, eventId: delivered.id } } : {}),
          ...(plan.performanceVersion === 2 && role === 'player_performance' ? { performanceVersion: 2 } : {}),
          ...(isKnowledgeGated(state) && role === 'player_performance' ? { performancePolicy: policyForActor(playerId, { player: true }) } : {}),
          ...(isKnowledgeGated(state) && role === 'scene_composer' ? { narrativeIdentityVersion: 1 } : {}),
          ...(plan.guardRules && ['player_performance', 'scene_composer'].includes(role) ? { guardCaptureVersion: 1 } : {}),
          ...(plan.movementGuardVersion === 1 && ['player_performance', 'scene_composer'].includes(role)
            ? { movementGuardVersion: 1 } : {}) } }, manifest, undefined, scheduling, materialState);
    };
    const prepared = tasks => ({ kind: 'model', staged: true, jobId: row.job_id, actorId: playerId, leaseToken: token,
      scope: scopeFor(playerId), tasks, completedTaskCount: this.#agentJobs.taskSummary(row).completedTasks,
      ...(plan.version === 7 ? { executionBudget: plan.executionBudget, persistentExecution: this.#agentJobs.modelAttemptLedger(row) } : {}),
      ...(usesOrdinaryAdmission32(plan.executionRevision?.revisionId) ? { ordinaryAdmissionVersion: 1 } : {}),
       ...(plan.novelScenePresentationVersion === 1 ? { novelScenePresentationVersion: 1 } : {}),
       ...(effectiveAdjudicationData(plan).runBoundary ? { requiresRunBoundaryReview: requiresInitialBoundaryReview(adjudicationPolicy(plan)) && !result(INITIAL_BOUNDARY_REVIEW_SLOT) } : {}),
      ...(hostBoundaryReview ? { hostScenePresentation: 'host@1' } : {}), ...([6, 7].includes(plan.version)
        ? { sceneExecutionBudget: runtimeRevisionForState(state).policy.sceneExecutionBudget } : {}) });
    const directorEvent = isSealedDirectorExtension(plan.directorExtension);
    if (isDeepStrictEqual(plan.directorExtension, DIRECTOR_PLANNING_EXTENSION)) {
      const packet = this.#directorPlanning.packet(plan.directorPlanning);
      const prior = existing.find(task => task.id === 'director');
      if (packet && !prior?.result && !prior?.terminal)
        return prepared([add('director', 'director', DIRECTOR_PRINCIPAL, packet)]);
    } else if (!directorEvent && plan.directorExtension && plan.directorBoundary) {
      if (!isDirectorExtension(plan.directorExtension) || plan.directorSnapshotHash !== directorSnapshotHash(state)) fail('INVALID_AGENT_JOB', '导演快照依据不一致。');
      const prior = existing.find(task => task.id === 'director');
      if (!prior?.result && !prior?.terminal) {
        const visible = playerPerceivedScene(this.#itemPolicySnapshot(state, plan), plan.scene).scene;
        return prepared([add('director', 'director', DIRECTOR_PRINCIPAL,
          buildDirectorContext({ role: 'director', scope: scopeFor(DIRECTOR_PRINCIPAL), data: { version: plan.directorExtension.id === DIRECTOR_LIFECYCLE_EXTENSION.id ? 2 : 1,
            snapshotHash: plan.directorSnapshotHash, boundary: plan.directorBoundary,
            opportunities: directorOpportunities(visible, plan.directorSnapshotHash).map(opportunity => ({ ...opportunity,
              ...(plan.directorExtension.id === DIRECTOR_LIFECYCLE_EXTENSION.id ? { description: DIRECTOR_BLUEPRINT_DESCRIPTIONS[opportunity.blueprint] } : {}) })),
            ...(plan.directorExtension.id === DIRECTOR_LIFECYCLE_EXTENSION.id ? { activeCandidates: plan.directorCandidates
              .filter(candidate => candidateStatus(candidate, state) === 'focused').map(directorCandidateView) } : {}) } }))]);
      }
    }
    // Perception changes only on a detached planning snapshot; cognition reads
    // and the publication checkpoint remain bound to the committed world.
    const planningState = this.#itemPolicySnapshot(state, plan);
    const selfHealMagic = this.#selfHealMagic(planningState);
    if (selfHealMagic) planningState.magic = selfHealMagic;
    const perception = plan.perceptionVersion === 1 ? playerPerceivedScene(planningState, plan.scene) : { scene: structuredClone(plan.scene), targetIds: {} };
    // plan.scene is a job-creation snapshot. Replace only its runtime option
    // projection after the transient approved grant is attached, so the model
    // receives the same delivered self-heal option the HOST can execute.
    if (selfHealMagic && perception.scene.caseRuntime) {
      const fresh = actorPerception(planningState, playerId);
      if (fresh.caseRuntime) perception.scene.caseRuntime = fresh.caseRuntime;
    }
    if ([2, 3].includes(plan.ordinaryAddressVersion)) {
      Object.assign(perception.scene, this.#playerReplyContext(planningState, playerId, perception, plan));
    }
    // Human-only passage capabilities are not model instructions. In
    // particular do not inflate the actor packet with every reaction button.
    if (perception.scene.case) delete perception.scene.case.testimony;
    if (plan.intentHint.type === 'interpret' && !result('intent')) {
      const magic = plan.playerTextMagicVersion === 1 ? this.#playerTextMagicOffer(state, plan) : null;
      const ordinary = plan.version === 7 ? this.#domain.ordinaryScriptSources(state) : null;
      return prepared([narrative('intent', 'intent_parser', { rawInput: row.text, scene: perception.scene,
         ...([1, 2, 3].includes(plan.ordinaryAddressVersion) ? { ordinaryAddressVersion: plan.ordinaryAddressVersion } : {}),
          ...([1,2,3,4].includes(plan.ordinaryLocalAmbientSpeechVersion) ? { ordinaryLocalAmbientSpeechVersion: plan.ordinaryLocalAmbientSpeechVersion } : {}),
          ...(plan.ordinaryLocalSearchConversationVersion === 1 ? { ordinaryLocalSearchConversationVersion: 1 } : {}),
          ...([1,2,3].includes(plan.ordinaryLocalApproachVersion) ? { ordinaryLocalApproachVersion: plan.ordinaryLocalApproachVersion } : {}),
         ...(plan.roomGroupSpeechVersion === 1 ? { roomGroupSpeechVersion: 1 } : {}),
          ...([1, 2, 3, 4, 5, 6, 7, 8].includes(plan.ordinaryDialogueSequenceVersion) ? { ordinaryDialogueSequenceVersion: plan.ordinaryDialogueSequenceVersion } : {}),
        ...(ordinary ? { ordinarySources: ordinary.sources,
          ...(hasSemanticOrdinaryRuntime(state) ? { ordinarySourceSelection: ordinary.selection } : {}) } : {}),
        ...([4, 5, 6, 7].includes(plan.version) ? { contractVersion: hasIntentAdmissionRuntime(plan) ? 9 : plan.intentContractVersion === 2 ? 8 : [1, 2].includes(plan.intentContractVersion) ? 5 : 4 } : {}),
        ...([1, 2].includes(plan.intentContractVersion) ? { intentContractVersion: plan.intentContractVersion } : {}),
        ...(plan.playerTextMagicVersion === 1 ? { playerTextMagicVersion: 1, ...(magic ? { magic } : {}) } : {}),
        ...(plan.authoredMagicVersion === 1 ? { authoredMagic: authoredMagicContext(state, plan) } : {}),
         ...(plan.playerTextSwapVersion === 1 ? { playerTextSwapVersion: 1 } : {}),
        ...(plan.playerRuntimeSelfServiceVersion === 1 ? { playerRuntimeSelfServiceVersion: 1 } : {}),
        ...(plan.playerRuntimeOfferedInspectionVersion === 1 ? { playerRuntimeOfferedInspectionVersion: 1 } : {}) })]);
    }
    const classified = plan.hostCaseChoiceVersion === 1 ? this.#resolvedIntentPlan(state, plan)
      : plan.intentHint.type === 'interpret' ? result('intent') : plan.intentHint;
    if ([1, 2].includes(plan.intentContractVersion) && classified?.type === 'plan' && classified.route !== 'steps') return prepared([]);
    const intent = this.#perceivedIntent(state, plan, classified);
    if (!intent && [1, 2].includes(plan.intentContractVersion)) return prepared([]);
    if (!intent) fail('INVALID_AGENT_OUTPUT', '当前第一步的具体物件能力已经不可用。');
    if (directorEvent && (plan.hiddenSupplyCapability?.lifecycle !== 1 || plan.directorEventPin)
      && intent.type === 'look' && directorEventMayReviewIntent(classified)) {
      const prior = existing.find(task => task.id === 'director');
      const packet = plan.directorEventPin?.packet ?? plan.hiddenSupplyChoice?.packet;
      if (packet && !prior?.result && !prior?.terminal && (!isPrivateDirectorPacket(packet) || prior || this.#privateDirectorEnabled()))
        return prepared([add('director', 'director', DIRECTOR_PRINCIPAL, packet)]);
    }
    if ([1, 2].includes(plan.intentContractVersion) && !(plan.regeneration && plan.runPolicyConsumersVersion === 1)) this.#domain.bindGrowthRequest(state, row, { requestId: row.request_id, text: row.text });
    if (!result('performance')) {
      const reactionToken = parseTestimonyCommand(row.text);
      const statementReaction = hasCaseRuntime(planningState) ? procedureStatementReaction(planningState, reactionToken)
        : hasCaseOne(planningState) ? caseStatementReaction(planningState, reactionToken) : null;
      const player = actorForState(state, playerId);
      const cognition = this.#narrativeCognition(row, state, plan, playerId, { query: row.text.slice(0, 256), recentLimit: 6, recallLimit: 4, includeBackground: true });
      const recall = [4, 5, 6, 7].includes(plan.version) ? assemblePlayerTaskRecall(cognition, player.persona, state.location) : null;
      const perceivedIntent = projectPerceivedIntent(intent, perception.targetIds);
      const { playerText: hostDeliveredText, ...gestureIntent } = perceivedIntent;
      const data = playerPerformanceTaskData(state, plan, [1, 2].includes(plan.intentContractVersion) ? classified.steps[0].text : row.text, statementReaction ? gestureIntent : perceivedIntent,
        perception.scene, cognition, recall);
      if (statementReaction) {
        data.statementReaction = { version: 1, deliveryVersion: 1, stance: statementReaction.stance,
          excerpt: statementReaction.excerpt, communicationText: hostDeliveredText };
        data.guidance += `\n${STATEMENT_REACTION_INSTRUCTIONS}`;
      }
      if ([1,2].includes(plan.localTravelAttemptVersion)) data.localTravelAttemptVersion=plan.localTravelAttemptVersion;
      if (plan.localConditionalWaitVersion===1) data.localConditionalWaitVersion=1;
      return prepared([narrative('performance', 'player_performance', data, recall?.manifest)]);
    }
    const performance = result('performance'); const actorId = intent.targetId;
    let ballots;
    if ((hasCaseOne(state) || hasCaseRuntime(state)) && intent.operation === 'vote') {
      const voterIds = (hasCaseOne(state) ? state.caseOne.voterIds : procedureVoterIds(state)).filter(id => id !== playerId);
      const missing = voterIds.filter(id => !result(`ballot:${id}`));
      if (missing.length) return prepared(missing.map(id => {
        const actorInput = hasCaseOne(state) ? caseBallotInput(state, id) : procedureBallotInput(state, id);
        const retrieval = this.#narrativeCognition(row, state, plan, id, {
          ...(plan.caseRecallVersion === 1 ? { caseRecallVersion: 1, query: '', recallLimit: 0, continuityLimit: 0 }
            : { query: '审判 证据 发言 矛盾 投票', recallLimit: 12, continuityLimit: 4 }),
          recentLimit: 12, includeBackground: true });
        const { context, manifest } = assembleRagContext({ retrieval, role: 'roleplay', ...actorInput }, { maxBytes: isRelationshipRuntime(state) ? RELATIONSHIP_CONTEXT_BUDGETS.roleplay : 26000, compression: 'auto' });
        return add(`ballot:${id}`, 'roleplay', id, context, manifest);
      }));
      ballots = Object.fromEntries(voterIds.map(id => [id, result(`ballot:${id}`).ballot.candidateId]));
    }
    if ([6, 7].includes(plan.version)) return this.#prepareSceneBeats(row, state, plan, token,
      { existing, intent, performance, ballots, add, narrative, prepared, perception, stopNewNpcBeats, hostBoundaryReview });
    if ([4, 5].includes(plan.version)) {
      const decisionTasks = existing.filter(task => task.id.startsWith('npc:'));
      if (!decisionTasks.length && !((hasCaseOne(state) || hasCaseRuntime(state)) && intent.operation === 'vote')) {
        const previewState = structuredClone(state); enableAutonomy(previewState);
        const previewAction = { type: 'scene', jobId: row.job_id, rawInput: row.text, intent, performance,
          ...(ballots ? { ballots } : {}), questionKey: plan.questionKey, answerKey: plan.answerKey,
          roomLabelVersion: 2, worldVersion: 1, decisionVersion: 1, decisions: [],
          ...(plan.performanceVersion !== undefined ? { performanceVersion: plan.performanceVersion } : {}),
          ...(plan.storyArcVersion !== undefined ? { storyArcVersion: plan.storyArcVersion } : {}),
          ...(plan.guardRules ? { guardRules: structuredClone(plan.guardRules) } : {}),
          ...(plan.itemPolicyVersion !== undefined ? { itemPolicyVersion: plan.itemPolicyVersion } : {}),
          ...(plan.caseActionTimingVersion !== undefined ? { caseActionTimingVersion: plan.caseActionTimingVersion } : {}), ...(plan.version === 5 ? { causalVersion: 1, ...(plan.causalTimingVersion === 1 ? { causalTimingVersion: 1 } : {}) } : {}) };
        const previewResult = sceneActionDraft(previewState, previewAction);
        const preview = previewResult.draft;
        const subjectiveByActor = {};
        for (const actor of actorsForState(state).filter(actor => !['warden', playerId].includes(actor.id))) {
          subjectiveByActor[actor.id] = this.#decisionStateAt(row, state, plan, actor.id);
        }
        const reactions = plan.causalTimingVersion === 1 ? pendingReactionActors(preview) : [];
        const selected = reactions.length ? reactions.slice(0, 3)
          : previewResult.interrupted ? [] : selectDecisionActors(preview, { targetId: actorId, performance,
            triggerLocal: intent.type === 'act' || intent.type === 'follow' || intent.type === 'conversation', previewBroadcast: Boolean(preview.agentWorld?.broadcasts.length > (state.agentWorld?.broadcasts.length || 0)), decisionStates: subjectiveByActor });
        if (selected.length) return prepared(selected.map(id => {
          const projected = actorPerception(preview, id);
          const received = decisionSnapshotObservations(state, preview, id);
          const latest = this.#narrativeCognition(row, state, plan, id, { query: '', recentLimit: 6, recallLimit: 0 });
          const query = observableRecallQuery([...latest.recentObservations, ...received], projected,
            { ...dialogueContextPin(plan), receivedObservationIds: received.map(row => row.id) });
          const retrieval = this.#narrativeCognition(row, state, plan, id,
            { query, recentLimit: 6, recallLimit: 8, continuityLimit: 4, includeBackground: true });
          const subjective = subjectiveByActor[id] || initialDecisionState(actorForState(state, id), [...new Map([...retrieval.backgroundObservations, ...retrieval.recentObservations].map(row => [row.id, row])).values()], { worldTime: state.worldTime });
          const actorInput = decisionActorInput(preview, id, subjective, plan.physicalFactsVersion === 2
            ? { physicalFactsVersion: 2, ...(plan.postureActionVersion === 1 ? { postureActionVersion: 1 } : {}), boundary: this.#materialBoundary(row, preview, id) } : {});
          if (isKnowledgeGated(state)) {
            actorInput.performancePolicy = policyForActor(id, { unidentified: !recognizesPerson(preview, playerId, id) });
            actorInput.persona.appearance = actorForState(state, id).appearance;
          }
          const guidance = `\n${roleplayGuidance(id, playerId, { loop: state.creation?.loop || 1, evolving: true, ...(usesRelationshipSetup(state) ? { relationshipSetup: relationshipSetupForState(state) } : {}), ...(isKnowledgeGated(state) ? { performancePolicy: policyForActor(id) } : {}) })}\n当前目标与单向关系以 decisionContext 为准。可以追问、拒绝、隐瞒、试探或有限合作；集合通知不等于服从。猜测和谎言仅为陈述，不改写事实。`;
          // Keep current owner facts intact; long presentation guidance uses the
          // existing scalar persona boundary instead of overflowing bodyCondition.
          if (actorInput.situation.bodyCondition.length + guidance.length > 2000)
            actorInput.persona.boundaries = actorInput.persona.boundaries.join('\n') + guidance;
          else actorInput.situation.bodyCondition += guidance;
          // Size the final delivered packet, including this beat's perceptions.
          // Older working sources keep exact record closure without becoming
          // required current facts or authority for new cognitive writes.
          const decisionInput = { retrieval, ...actorInput,
            workingSourceObservations: this.#decisionSourcesAt(row, state, plan, id),
            receivedObservations: received, acquiredEvidenceEntries: projected.case?.knownEvidence || [],
          };
          const { context, manifest } = assembleDecisionContext(decisionInput);
          return add(`npc:${id}`, 'roleplay', id, context, manifest, undefined, undefined, state,
            maxBytes => assembleDecisionContext(decisionInput, { maxBytes }));
        }));
      }
      const missing = decisionTasks.filter(task => !task.result);
      if (missing.length) return prepared(missing);
    }
    if (![4, 5, 6, 7].includes(plan.version) && actorId && !result('npc')) {
      const actorInput = agentActorInput(state, actorId); const preview = narrativeResolution(state, intent, undefined, { worldVersion: plan.worldVersion });
      actorInput.persona = structuredClone(actorInput.persona);
      actorInput.persona.boundaries = actorInput.persona.boundaries.filter(text => !text.includes('玩家控制'));
      const guidance = roleplayGuidance(actorId, playerId, { loop: state.creation?.loop || 1, ...(usesRelationshipSetup(state) ? { relationshipSetup: relationshipSetupForState(state) } : {}) })
        .replace('不宣告移动、开锁、物品转移、伤亡、能力效果或剧情推进', '不以文字宣告移动、开锁、物品转移、伤亡、能力效果或剧情推进；本轮明确交付相邻移动权限时只能用 movement 字段提案');
      actorInput.allowedActions.push('gesture');
      const destinations = preview.afterScene.permittedDestinations ?? plan.scene.adjacent.map(room => room.id);
      const canMove = ['follow', 'wait', 'act'].includes(intent.type) && (state.agentDoorOpen || preview.broadcast) && destinations.length > 0;
      if (canMove) { actorInput.allowedActions.push('move'); actorInput.situation.permittedDestinations = destinations; }
      if (preview.afterScene.clock) actorInput.situation.bodyCondition += `\n公共时钟：${preview.afterScene.clock.label}，${preview.afterScene.clock.period}。${preview.afterScene.assemblyNotice || ''}`;
      actorInput.situation.bodyCondition += `\n当前亲眼可见：${plan.scene.description}${hasCaseOne(state) ? '' : `铁门${state.agentDoorOpen || preview.broadcast ? '已解锁' : '仍然上锁'}。`}\n${guidance}\n${canMove ? '可以自行决定留在这里或走向交付的相邻地点；门锁已开，但你不必服从来访者。' : '只回应眼前的交流与可见动作。'}`;
      const retrieval = this.#narrativeCognition(row, state, plan, actorId, { query: row.text.slice(0, 256), recentLimit: 6, recallLimit: 8, continuityLimit: 4, includeBackground: true });
      const assembled = assembleRagContext({ retrieval, role: 'roleplay', ...actorInput }, { maxBytes: isRelationshipRuntime(state) ? RELATIONSHIP_CONTEXT_BUDGETS.roleplay : 26000, compression: 'auto' });
      const context = structuredClone(assembled.context);
      if (performance.utterance) context.observations.push({ ...context.scope, id: `gesture:${row.job_id}:${actorId}`, text: performance.action, channel: 'sight', occurredAt: state.worldTime, learnedAt: state.worldTime });
      context.observations.push({ ...context.scope, id: `${plan.questionKey}:${actorId}`,
        text: performance.utterance || performance.action,
        channel: performance.utterance ? actorForState(state, playerId).communication === 'writing' ? 'reading' : 'hearing' : 'sight',
        occurredAt: state.worldTime, learnedAt: state.worldTime });
      if (preview.broadcast) context.observations.push({ ...context.scope, id: `broadcast:${row.job_id}:${actorId}`,
        text: plan.worldVersion === 1 || state.agentWorld ? CARD_ASSEMBLY_TEXT : AGENT_BROADCAST_TEXT, channel: 'hearing', occurredAt: state.worldTime, learnedAt: state.worldTime });
      // An actor sees only enacted gestures/speech, not the player's hidden plan.
      return prepared([add('npc', 'roleplay', actorId, context, assembled.manifest)]);
    }
    const response = result('npc'); const tasks = [];
    if ([3, 4, 5].includes(plan.version)) {
      const action = { type: 'scene', ...dialogueContextPin(plan), ...sceneExtensionPin(plan), jobId: row.job_id, rawInput: row.text, intent, performance,
        ...(response ? { response } : {}), ...(ballots ? { ballots } : {}), questionKey: plan.questionKey, answerKey: plan.answerKey,
        ...(plan.roomLabelVersion !== undefined ? { roomLabelVersion: plan.roomLabelVersion } : {}),
        ...(plan.performanceVersion !== undefined ? { performanceVersion: plan.performanceVersion } : {}),
        ...(plan.storyArcVersion !== undefined ? { storyArcVersion: plan.storyArcVersion } : {}),
        ...(plan.guardRules ? { guardRules: structuredClone(plan.guardRules) } : {}),
        ...(plan.worldVersion !== undefined ? { worldVersion: plan.worldVersion } : {}),
        ...(plan.itemPolicyVersion !== undefined ? { itemPolicyVersion: plan.itemPolicyVersion } : {}),
      ...(plan.caseActionTimingVersion !== undefined ? { caseActionTimingVersion: plan.caseActionTimingVersion } : {}),
        ...([4, 5, 6, 7].includes(plan.version) ? { decisionVersion: 1, decisions: existing.filter(task => task.id.startsWith('npc:')).map(task => ({ actorId: task.actorId, proposal: task.result })) } : {}),
        ...(plan.version === 5 ? { causalVersion: 1, ...(plan.causalTimingVersion === 1 ? { causalTimingVersion: 1 } : {}) } : {}) };
      const { publicEvents, events: eventLedger, draft: enacted } = sceneActionDraft(state, action);
      const resolution = [4, 5, 6, 7].includes(plan.version) ? { elapsed: enacted.worldTime - state.worldTime, facts: resolvedSceneFacts(perception.scene, plan.perceptionVersion === 1 ? playerPerceivedScene(enacted, agentScene(enacted)).scene : agentScene(enacted), publicEvents), afterScene: agentScene(enacted) }
        : narrativeResolution(state, intent, response, { worldVersion: plan.worldVersion, ballots,
          additionalElapsed: Math.ceil(((performance.utterance || '').length + (response?.utterance || '').length) / 6) });
      const { afterScene, ...sceneResolution } = resolution;
      const perceptionOnly = scene => {
        if (![4, 5, 6, 7].includes(plan.version)) return scene;
        const { readable, rulebookAccess, caseRuntime, actionLimits, ...visible } = scene;
        if ([1, 2].includes(plan.materialProseVersion) && intent.subjectId && readable?.some(row => row.id === intent.subjectId))
          visible.readable = readable.filter(row => row.id === intent.subjectId).map(({ id, name, carrier }) => {
            const sourceCarrier = carrier ?? plan.scene.readable?.find(source => source.id === id)?.carrier;
            return { id, name, ...(sourceCarrier ? { carrier: sourceCarrier } : {}) };
          });
        if (visible.case) {
          const { knownEvidence, inspectables, disclosedEvidence, statements, testimony, ...procedure } = visible.case;
          visible.case = procedure;
        }
        return visible;
      };
      const sceneData = { ...([4, 5, 6, 7].includes(plan.version) ? { contractVersion: 4, intent: { type: intent.type,
        ...(intent.operation ? { operation: intent.operation } : {}),
        ...([1, 2].includes(plan.materialProseVersion) ? { ...(intent.subjectId ? { subjectId: intent.subjectId } : {}), ...(intent.targetId ? { targetId: projectPerceivedIntent(intent, perception.targetIds).targetId } : {}) } : {}) } } : { rawInput: row.text, intent }), sceneBefore: perceptionOnly(perception.scene), sceneAfter: perceptionOnly(plan.perceptionVersion === 1 ? playerPerceivedScene(enacted, afterScene).scene : afterScene),
        resolution: sceneResolution, events: publicEvents, budget: plan.outputContractVersion === 1 ? { ...SCENE_BUDGET, minHan: 0, targetHan: null } : SCENE_BUDGET,
        ...(plan.sceneEventTimeVersion === 1 ? { sceneEventTimeVersion: 1, eventTimeline: sceneEventTimeline(state, enacted, eventLedger, publicEvents) } : {}),
        palette: plan.ambientContinuityVersion === 1 ? { before: sceneAuthorizedPalette(perception.scene),
          after: sceneAuthorizedPalette(plan.perceptionVersion === 1 ? playerPerceivedScene(enacted, afterScene).scene : afterScene) }
          : { before: scenePalette(plan.scene.roomId), after: scenePalette(resolution.afterScene.roomId) },
        recentScene: state.entries.filter(entry => entry.delivery === 'narration' && !entry.openingSource).slice(-2).map(entry => entry.text.slice(-1200)) };
      Object.assign(sceneData, this.#materialTaskData(row, state, plan, 'scene_composer', sceneData, enacted));
      if (!result('scene')) tasks.push(narrative('scene', 'scene_composer', sceneData));
      else if (sceneNeedsRepair(result('scene'), publicEvents, { style: plan.styleVersion === 1, outputContractVersion: plan.outputContractVersion, antiClicheVersion: plan.antiClicheVersion }) && !result('scene-repair')) {
        const summary = sceneSummary([{ text: publicEvents.map(event => event.text).join('\n') },
          ...result('scene').blocks.filter(block => block.type === 'narration')], result('scene').stopReason);
        const styleFeedback = plan.styleVersion === 1 ? sceneStyleFeedback(result('scene'), { antiClicheVersion: plan.antiClicheVersion }) : null;
        tasks.push(narrative('scene-repair', 'scene_composer', { ...sceneData, repairSource: result('scene'),
          compositionFeedback: { hanCount: summary.hanCount, lengthStatus: summary.lengthStatus,
            ...(styleFeedback ? { styleRuleIds: styleFeedback.ruleIds } : {}),
            remainingRepairs: 0, instruction: plan.outputContractVersion === 1
              ? `${styleFeedback?.instruction || '仅用相同固定事件重新编排。'} 没有最少字数，不因短而延长；仅处理已命中文风或超出上限的问题，材料不足或需要玩家选择时立即收束。`
              : styleFeedback ? `${styleFeedback.instruction} 仍须遵守正文篇幅预算，有材料则补足现场变化，没有材料或需玩家回答则如实提前收束。` : '仅用相同事件重新编排；有材料则达到正文预算，没有材料或需玩家回答则如实提前收束，不新增事件或对白。' } }));
      }
    } else if (!result('narrator')) tasks.push(narrative('narrator', 'narrator', { rawInput: row.text, intent,
      sceneBefore: plan.scene, resolution: narrativeResolution(state, intent, response, { worldVersion: plan.worldVersion,
        additionalElapsed: Math.ceil(((performance.utterance || '').length + (response?.utterance || '').length) / 6) }),
      performance, ...(response ? { response: { ...(response.action ? { action: response.action } : {}), ...(response.utterance ? { utterance: response.utterance } : {}) } } : {}),
      recentScene: state.entries.filter(entry => entry.delivery === 'narration' && !entry.openingSource).slice(-2).map(entry => entry.text) }));
    if (![4, 5, 6, 7].includes(plan.version) && actorId && !result('data')) {
      const retrieval = this.#narrativeCognition(row, state, plan, actorId, { query: row.text.slice(0, 256), recentLimit: 4, recallLimit: 4, continuityLimit: 2 });
      const assembled = assembleRagContext({ retrieval, role: 'character_data' }, { maxBytes: isRelationshipRuntime(state) ? RELATIONSHIP_CONTEXT_BUDGETS.roleplay : 22000 });
      const context = structuredClone(assembled.context);
      context.observations.push({ ...context.scope, id: `${plan.questionKey}:${actorId}`, text: performance.utterance || performance.action,
        channel: performance.utterance ? actorForState(state, playerId).communication === 'writing' ? 'reading' : 'hearing' : 'sight', occurredAt: state.worldTime, learnedAt: state.worldTime });
      if (response?.utterance) context.observations.push({ ...context.scope, id: `${plan.answerKey}:${actorId}`, text: response.utterance,
        channel: 'self_expression', occurredAt: state.worldTime, learnedAt: state.worldTime });
      tasks.push(add('data', 'character_data', actorId, context, assembled.manifest));
    }
    return prepared(tasks);
  }
  #sceneBeatAction(row, plan, intent, performance, ballots, beats, schedulingBeats = [], beforePlayerStep = 3) {
    let intentData = {};
    if ([1, 2].includes(plan.intentContractVersion)) {
      const source = plan.regeneration?.checkpoint || JSON.parse(this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
        .get(row.branch_id, row.generation, row.base_revision).snapshot_json);
      const tasks = this.#agentJobs.tasks(row);
      const playerIntentPlan = this.#resolvedIntentPlan(source, plan, tasks.find(task => task.id === 'intent')?.result);
      if (!playerIntentPlan || playerIntentPlan.route !== 'steps') fail('INVALID_AGENT_JOB');
      intentData = { playerIntentPlan, ...dialogueSequenceActionPin(plan, tasks.find(task => task.id === 'performance')), playerPerformances: tasks.filter(task => /^performance:[12]$/u.test(task.id) && Number(task.id.at(-1)) < beforePlayerStep && task.result)
        .sort((a, b) => a.id.localeCompare(b.id)).map(task => ({ index: Number(task.id.at(-1)), performance: task.result })) };
    }
    return { type: 'scene', ...dialogueContextPin(plan), ...sceneExtensionPin(plan), ...narrationParagraphActionPin(plan),
      ...bareReplyRootActionPin(plan, row.text, intentData.playerIntentPlan?.steps),
      ...cellDoorAttemptActionPin(plan, row.text, intentData.playerIntentPlan?.steps),
        ...(plan.localConditionalWaitVersion===1 ? {localConditionalWaitVersion:1} : {}),
         ...([1,2].includes(plan.localTravelAttemptVersion) ? {localTravelAttemptVersion:plan.localTravelAttemptVersion} : {}),
       ...ordinaryLocalVisualActionPins(plan,row.text,intentData.playerIntentPlan?.steps),
       ...([1,2,3,4].includes(plan.ordinaryLocalAmbientSpeechVersion) ? { ordinaryLocalAmbientSpeechVersion: plan.ordinaryLocalAmbientSpeechVersion } : {}),
       ...(plan.ordinaryLocalSearchConversationVersion === 1 ? { ordinaryLocalSearchConversationVersion: 1 } : {}),
       ...([1,2,3].includes(plan.ordinaryLocalApproachVersion) ? { ordinaryLocalApproachVersion: plan.ordinaryLocalApproachVersion } : {}),
      ...([2, 3].includes(plan.ordinaryAddressVersion) ? { ordinaryAddressVersion: plan.ordinaryAddressVersion } : {}),
      ...(plan.roomGroupSpeechVersion === 1 && intentData.playerIntentPlan?.steps.some(step => step.intent.speechScope === 'room') ? { roomGroupSpeechVersion: 1 } : {}), ...intentData,
       ...(plan.authoredMagicVersion === 1 ? { authoredMagicVersion: 1 } : {}),
        ...(plan.authoredMagicDestinationVersion === 1 ? { authoredMagicDestinationVersion: 1 } : {}),
      ...(plan.rootCaseOptionsVersion === 1 ? { rootCaseOptionsVersion: 1 } : {}),
      ...(plan.directorEventLifecycle?.due ? { directorEventDue: plan.directorEventLifecycle.due } : {}),
      ...(plan.effectiveRunPolicy?.source.adoptedCommitRef ? { effectiveRunPolicy: plan.effectiveRunPolicy } : {}),
      jobId: row.job_id, rawInput: row.text, intent, performance,
      ...(plan.guardRules ? { guardRules: structuredClone(plan.guardRules) } : {}),
      ...(ballots ? { ballots } : {}), questionKey: plan.questionKey, answerKey: plan.answerKey,
      roomLabelVersion: 2, worldVersion: 1, decisionVersion: 1, decisions: [], causalVersion: 1,
      causalTimingVersion: 1, sceneBeatVersion: 1, beats,
      ...(plan.performanceVersion !== undefined ? { performanceVersion: plan.performanceVersion } : {}),
      ...(plan.storyArcVersion !== undefined ? { storyArcVersion: plan.storyArcVersion } : {}),
      ...(plan.itemPolicyVersion !== undefined ? { itemPolicyVersion: plan.itemPolicyVersion } : {}),
      ...(plan.caseActionTimingVersion !== undefined ? { caseActionTimingVersion: plan.caseActionTimingVersion } : {}),
      ...(plan.schedulingVersion === 1 ? { schedulingVersion: 1, schedulingBeats } : {}),
      ...(plan.decisionAuditVersion === 1 ? { decisionAuditVersion: 1 } : {}),
      ...(plan.introductionVersion !== undefined ? { introductionVersion: plan.introductionVersion } : {}),
      ...(plan.scheduleWaitVersion !== undefined ? { scheduleWaitVersion: plan.scheduleWaitVersion } : {}),
      ...(plan.npcMagicCastVersion !== undefined ? { npcMagicCastVersion: plan.npcMagicCastVersion } : {}),
      ...(plan.npcVoluntaryFloatVersion !== undefined ? { npcVoluntaryFloatVersion: plan.npcVoluntaryFloatVersion } : {}),
      ...(plan.npcMedicalContactVersion === 1 ? { npcMedicalContactVersion: 1 } : {}),
      ...(plan.playerRuntimeCommunicationVersion === 1 ? { playerRuntimeCommunicationVersion: 1 } : {}),
      ...(plan.storyLifeVersion !== undefined ? { storyLifeVersion: plan.storyLifeVersion } : {}) };
  }
  #intentStageInput(plan, tasks, prefix, input) {
    if (![1, 2].includes(plan.intentContractVersion)) return input;
    if (plan.directorEventLifecycle?.due) input = { ...input, directorEventDue: plan.directorEventLifecycle.due };
    if (plan.effectiveRunPolicy?.source.adoptedCommitRef) input = { ...input, effectiveRunPolicy: plan.effectiveRunPolicy.fingerprint };
    const performed = new Set((prefix.intentProgress?.settlements || []).map(row => row.index));
    return { ...input, playerSteps: tasks.filter(task => /^performance:[12]$/u.test(task.id) && performed.has(Number(task.id.at(-1))))
      .map(task => ({ id: task.id, result: task.result })) };
  }
  #sceneDigest(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
  // Each prefix in this synchronous replay shares the same committed base.
  // Sealing a stage appends to the job only; base cognition is not changed.
  // The readers never leave this replay/prepare transaction or enter a cache.
  #sceneBaseReaders(row, base, plan) {
    if (plan.regeneration || !usesOrdinaryAdmission32(plan.executionRevision?.revisionId)) return undefined;
    const decisions = new Map(), archive = new Map();
    const decision = id => {
      if (!decisions.has(id)) decisions.set(id, this.#decisionStateAt(row, base, plan, id));
      return decisions.get(id);
    };
    return {
      decision,
      roster: ids => {
        const unread = ids.filter(id => !decisions.has(id));
        if (unread.length && unread.length <= 16) {
          for (const [id, current] of this.#domain.readDecisionStates(base, unread)) {
            if (current) decisions.set(id, current);
          }
        }
        return new Map(ids.map(id => [id, decision(id)]));
      },
      archive: id => {
        if (!archive.has(id)) archive.set(id, this.#decisionSourcesAt(row, base, plan, id, { includeArchive: true }));
        return archive.get(id);
      },
    };
  }
  #sceneBeatPsychology(row, base, plan, prefix, tasks, beats, baseReaders) {
    const result = new Map();
    for (const actorId of new Set(tasks.filter(task => task.id.startsWith('npc:')).map(task => task.actorId))) {
      const initial = baseReaders?.decision(actorId) ?? this.#decisionStateAt(row, base, plan, actorId);
      const ownTasks = tasks.filter(task => task.id.startsWith('npc:') && task.actorId === actorId && task.result);
      const journal = ownTasks.filter(task => beats.some(beat => beat.beat === task.sceneFrame.beat
        && beat.decisions.some(decision => decision.actorId === actorId))
        && (prefix.draft.agentAutonomy?.decisions || []).slice(base.agentAutonomy?.decisions?.length || 0)
          .some(decision => decision.actorId === actorId && decision.sceneBeat === task.sceneFrame.beat))
        .map(task => ({ beat: task.sceneFrame.beat, worldTime: task.sceneFrame.worldTime,
          allowedTargets: task.context.situation.perceivedParticipants || [], updates: task.result.stateUpdates || [],
          sourceObservationIds: task.context.observations.map(observation => observation.id),
          ...(task.context.goalTemplates ? { goalTemplates: task.context.goalTemplates } : {}) }));
      if (!journal.length) continue;
      const scope = { actorId, branchId: row.branch_id, generation: row.generation, revision: row.base_revision };
      const observations = [...new Map([
        ...(baseReaders?.archive(actorId) ?? this.#decisionSourcesAt(row, base, plan, actorId, { includeArchive: true })),
        ...ownTasks.flatMap(task => task.context.observations),
        ...decisionSnapshotObservations(base, prefix.draft, actorId).map(observation => ({ ...observation, ...scope })),
      ].map(observation => [observation.id, observation])).values()];
      const reviewed = reviewSceneDecisionState(initial, journal, { ownerId: actorId, observations });
      result.set(actorId, { ...reviewed, journal, observations });
    }
    return result;
  }
  #captureSceneScheduling(row, base, plan, prefix, tasks, cognition, admissionClosed = false, sealedStages, baseReaders) {
    const states = {};
    const player = createdPlayerId(base);
    const ids = actorsForState(base).map(actor => actor.id).filter(id => id !== 'warden' && id !== player);
    const missing = ids.filter(id => !cognition.get(id)?.state);
    // Current sealed roster uses the same owner checks and one exact head proof.
    // Regeneration still needs its existing per-owner ancestor policy.
    const current = baseReaders ? baseReaders.roster(missing) : (!plan.regeneration && missing.length && missing.length <= 16
      ? this.#domain.readDecisionStates(base, missing) : null);
    for (const id of ids) states[id] = cognition.get(id)?.state || current?.get(id) || this.#decisionStateAt(row, base, plan, id);
    const calls = tasks.filter(task => task.id.startsWith('npc:') && task.sceneFrame.beat <= prefix.beats.length);
    const reviewContinuationIds = [...new Set(calls.filter(task => task.context.decisionPolicy?.mode === 'review'
      && cognition.get(task.actorId)?.state.goals.some(goal => goal.status === 'active')).map(task => task.actorId))];
    const lifecycle = plan.directorExtension?.id === DIRECTOR_LIFECYCLE_EXTENSION.id;
    const withdrawn = tasks.find(task => task.id === 'director')?.result;
    const applied = new Set(tasks.filter(task => task.sceneFrame?.beat <= prefix.beats.length)
      .flatMap(task => task.scheduling?.advisory?.appliedActorIds || []));
    const planning = isDeepStrictEqual(plan.directorExtension, DIRECTOR_PLANNING_EXTENSION);
    const interestActorIds = planning ? directorPlanningInterest(plan.directorPlanning.plans, prefix.draft,
      { output: withdrawn, appliedActorIds: [...applied] }) : lifecycle ? plan.directorCandidates.filter(candidate => candidate.targetActorId && !candidate.rankingUsed
      && !applied.has(candidate.targetActorId) && candidateStatus(candidate, prefix.draft) === 'focused'
      && !(withdrawn?.operation === 'withdraw' && withdrawn.opportunityId === candidate.opportunity.id && withdrawn.sourceRef === candidate.opportunity.sourceRef))
      .map(candidate => candidate.targetActorId) : [];
    const ownerPerception = plan.hiddenSupplyCapability?.awareness === 1 && !prefix.beats.length && prefix.phase !== 'reaction'
      && !prefix.interrupted && !prefix.stopReason && hiddenSupplyIntent(tasks.find(task => task.id === 'intent')?.result, 1)
      ? this.#domain.hiddenSupplyA2(base) : null;
    return { states, scheduling: captureSceneScheduling(prefix, { decisionStates: states, reviewContinuationIds,
      ...(ownerPerception ? { ownerPerception } : {}),
      ...(lifecycle || planning ? { advisory: { interestActorIds: [...new Set(interestActorIds)] } } : {}),
      previousEvents: (sealedStages ?? this.#agentJobs.stages(row))[prefix.beats.length]?.receipt.events || [], admissionClosed }) };
  }
  #sceneBeatReplay(row, base, plan, intent, performance, ballots, tasks, token, { seal = false, beforePlayerStep } = {}) {
    const replayStartedAt = globalThis.performance.now();
    // The sealed prefix is local to this transaction. Only sealStage may
    // extend it; the next replay/reclaim starts with a fresh validated read.
    let saved = this.#agentJobs.stages(row); const beats = []; const schedulingBeats = [];
    const baseReaders = this.#sceneBaseReaders(row, base, plan);
    const stageClock = stage => {
      const prior = saved[stage]?.receipt;
      return prior ? (prior.conversationEventClockVersion === 1 ? 1 : undefined) : 1;
    };
    const materialPrefixes = [];
    const action = this.#sceneBeatAction(row, plan, intent, performance, ballots, beats, [], beforePlayerStep);
    const sceneBase = structuredClone(base);
    this.#attachNpcMagic(sceneBase, plan);
    const customCommand = this.#customTextCommand(base, action);
    const customAct = customCommand ? { command: customCommand,
      prepared: this.#domain.prepareCustomUse(base, customCommand),
      capabilities: this.#domain.customAbilityCapabilities(base) } : null;
    const swapCommand = this.#swapTextCommand(base, action);
    const swapAct = swapCommand ? { command: swapCommand,
      prepared: this.#domain.prepareSwapLifecycle(base, swapCommand),
      capabilities: this.#domain.swapLifecycleCapabilities(base) } : null;
    const preparedSwap = preparedSwapForNpcMenu(swapAct);
    const selfHealIntent = action.intent?.type === 'runtime'
      && typeof action.intent.subjectId === 'string' && action.intent.subjectId.startsWith('self-heal:');
    if (!customAct && !sceneBase.magic && (action.intent.type !== 'magic' && action.intent.magic || selfHealIntent)) {
      const actual = this.#magicAt(base);
      if (actual) sceneBase.magic = actual;
      else { const temporary = this.#temporaryMagic(base); if (!temporary) fail('MAGIC_HOST_INITIALIZATION_REQUIRED');
        sceneBase.magic = temporary.magic; }
    }
    let prefix = beginCausalScene(sceneBase, action, { customAct, swapAct, domainStore: this.#domain, domainSourceState: base,
      conversationEventClockVersion: stageClock(0) });
    if (prefix.phase !== 'reaction') prefix = settlePlayerBoundary(prefix);
    const sourceCommit = this.#db.prepare('SELECT commit_ref FROM domain_commits WHERE generation=? AND revision=?')
      .get(base.generation, base.revision);
    if (!sourceCommit) fail('INVALID_DOMAIN_STATE', '场景起点不在领域历史内。');
    const sceneRootDigest = this.#sceneDigest({ intent, performance, ballots: ballots ?? null });
    const sceneTasksDigest = () => this.#sceneDigest(tasks.map(task => ({ id: task.id, result: task.result ?? null,
      terminal: task.terminal ?? null, sceneFrame: task.sceneFrame ?? null, scheduling: task.scheduling ?? null })));
    if (!seal && beforePlayerStep === undefined) {
      // Reuse only a result whose job, base commit, sealed stage hashes, root
      // action and task-result bindings are exact. Callers receive a clone;
      // a new task result or newly sealed stage changes the key and replays.
      const cached = this.#sceneReplayCache;
      if (cached?.jobId === row.job_id && cached.baseCommitRef === sourceCommit.commit_ref
        && cached.rootDigest === sceneRootDigest && cached.tasksDigest === sceneTasksDigest()
        && isDeepStrictEqual(cached.stageHashes, saved.map(entry => entry.hash))) {
        v0Timing('scene:replayCached', replayStartedAt);
        return structuredClone(cached.result);
      }
    }
    const cognitionByPrefix = new WeakMap();
    const cognitionFor = candidate => {
      let value = cognitionByPrefix.get(candidate);
      if (!value) {
        const startedAt = globalThis.performance.now();
        value = this.#sceneBeatPsychology(row, base, plan, candidate, tasks, beats, baseReaders);
        cognitionByPrefix.set(candidate, value);
        v0Timing('scene:cognition', startedAt);
      }
      return value;
    };
    let baseActorIds;
    const check = (stage, kind, before, input) => {
      const previousHash = stage ? saved[stage - 1]?.hash : null;
      // One unchanged base roster per synchronous replay; observations and
      // exact sealed receipt input still recompute for every actual prefix.
      baseActorIds ??= actorsForState(base).map(actor => actor.id);
      const sources = baseActorIds.flatMap(actorId => decisionSnapshotObservations(before, prefix.draft, actorId)
        .map(observation => ({ ...observation, ownerId: actorId })));
      const cognition = cognitionFor(prefix);
      const publicEvents = prefix.draft.entries.slice(before.entries.length);
      const privateEvents = (prefix.draft.agentAutonomy?.events || []).slice(before.agentAutonomy?.events?.length || 0);
      const legacyEvents = [...publicEvents, ...privateEvents];
      const events = prefix.conversationEventClockVersion === 1
        && runtimeRevisionForState(prefix.draft).policy.conversationVersion === 1
        ? sceneConversationReceiptEvents(publicEvents, privateEvents, prefix.draft.agentAutonomy.conversation) : legacyEvents;
      const receipt = { stage, kind, baseCommitRef: sourceCommit.commit_ref,
        executionRevision: plan.executionRevision, contentFingerprint: plan.contentFingerprint,
        previousHash, inputHash: this.#sceneDigest(this.#intentStageInput(plan, tasks, prefix, input)), stateHash: this.#sceneDigest(prefix),
        events,
        sources, journal: [...cognition].map(([ownerId, value]) => ({ ownerId, entries: value.journal,
          stateHash: this.#sceneDigest(value.state) })), stopReason: prefix.stopReason || (prefix.interrupted ? 'world_interrupt' : null),
        ...(prefix.conversationEventClockVersion === 1 ? { conversationEventClockVersion: 1 } : {}) };
      const prior = saved[stage];
      if (prior) {
        // Old immutable seals retain their exact bucket shape and original
        // clock. Accept only a full-field match, never rewrite their receipts.
        if (!isDeepStrictEqual(prior.receipt, receipt)
          && !isDeepStrictEqual(prior.receipt, { ...receipt, events: legacyEvents }))
          fail('INVALID_AGENT_JOB', '场景前缀校验失败，原始进度保持不变。');
      } else if (seal) saved = this.#agentJobs.sealStage(row, receipt, token);
      else fail('INVALID_AGENT_JOB', '场景阶段尚未封存。');
    };
    let intentTail;
    const advancePlayer = () => {
      if (![1, 2].includes(plan.intentContractVersion)) return false;
      const before = prefix.draft.entries.length;
      intentTail = preparePlayerIntentTail(prefix, action, { domainStore: this.#domain, domainSourceState: base });
      prefix = intentTail.prefix;
      if ((plan.materialProseVersion === 2 || plan.physicalFactsVersion === 2) && prefix.draft.entries.length !== before)
        materialPrefixes.push(structuredClone(prefix.draft));
      return Boolean(intentTail.next);
    };
    const awaitingPerformance = () => ({ prefix, beats, materialPrefixes, cognition: cognitionFor(prefix),
      action: this.#sceneBeatAction(row, plan, intent, performance, ballots, beats, schedulingBeats, beforePlayerStep), preparedSwap, intentTail });
    // Delay the FIRST seal while this prefix needs an authorized player slot.
    // An existing seal is never rewritten by a later performance result.
    if (advancePlayer()) return awaitingPerformance();
    check(0, 'root', base, { intent, performance, ballots: ballots || null });
    if (plan.materialProseVersion === 2 || plan.physicalFactsVersion === 2) materialPrefixes.push(structuredClone(prefix.draft));
    for (let beat = 1; beat <= 3; beat++) {
      const stageTasks = tasks.filter(task => task.id.startsWith(`npc:${beat}:`));
      if (!stageTasks.length || stageTasks.some(task => !task.result)) break;
      const phase = prefix.phase === 'reaction' ? 'reaction' : 'npc';
      const scheduling = stageTasks[0].scheduling;
      if (plan.schedulingVersion === 1) {
        if (stageTasks.some(task => !isDeepStrictEqual(task.scheduling, scheduling))) fail('INVALID_AGENT_JOB', '同拍调度依据不一致。');
        validateSceneScheduling(prefix, scheduling, stageTasks.map(task => task.actorId));
        const cognition = cognitionFor(prefix);
        const captured = this.#captureSceneScheduling(row, base, plan, prefix, tasks, cognition,
          usesOrdinaryAdmission32(plan.executionRevision?.revisionId) && scheduling.admissionClosed, saved, baseReaders).scheduling;
        if (!isDeepStrictEqual(captured, scheduling)) fail('INVALID_AGENT_JOB', '角色调度事实不属于其封存前缀。');
      }
      const input = { beat, phase, decisions: stageTasks.map(task => ({ actorId: task.actorId, proposal: task.result })) };
      const before = structuredClone(prefix.draft);
      const previousHash = saved[beat - 1]?.hash;
      for (const task of stageTasks) if (task.sceneFrame.beat !== beat || task.sceneFrame.worldTime !== prefix.draft.worldTime
        || task.sceneFrame.prefixHash !== previousHash) fail('INVALID_AGENT_JOB', '角色输入不属于当前场景前缀。');
      prefix = applyCausalNpcBeat(prefix, input, scheduling,
        { domainStore: this.#domain, magicSourceState: base, preparedSwap, conversationEventClockVersion: stageClock(beat) });
      if (phase === 'reaction' && prefix.phase !== 'reaction') prefix = settlePlayerBoundary(prefix);
      beats.push(input);
      if (plan.schedulingVersion === 1) schedulingBeats.push(scheduling);
      if (advancePlayer()) return awaitingPerformance();
      check(beat, 'beat', before, { tasks: stageTasks, input });
      if (plan.materialProseVersion === 2 || plan.physicalFactsVersion === 2) materialPrefixes.push(structuredClone(prefix.draft));
    }
    const finalAction = this.#sceneBeatAction(row, plan, intent, performance, ballots, beats, schedulingBeats, beforePlayerStep);
    if (plan.schedulingVersion === 1) {
      const scene = tasks.find(task => task.id === 'scene');
      if (scene) {
        finalAction.schedulingEnd = scene.scheduling;
        validateSceneScheduling(prefix, finalAction.schedulingEnd, []);
        const cognition = cognitionFor(prefix);
        const captured = this.#captureSceneScheduling(row, base, plan, prefix, tasks, cognition,
          finalAction.schedulingEnd.admissionClosed, saved, baseReaders).scheduling;
        if (!isDeepStrictEqual(captured, finalAction.schedulingEnd)) fail('INVALID_AGENT_JOB', '续拍调度事实不属于其封存前缀。');
      }
    }
    const soft = tasks.find(task => task.id === SOFT_SLOT);
    if (soft?.result?.type === 'ordinary_attempt_result') finalAction.softResult = this.#ordinarySuffix(row, soft, base);
    const result = { prefix, beats, materialPrefixes, cognition: cognitionFor(prefix), action: finalAction, preparedSwap, ...(intentTail ? { intentTail } : {}) };
    if (beforePlayerStep === undefined && saved.length >= prefix.beats.length + 1) this.#sceneReplayCache = {
      jobId: row.job_id, baseCommitRef: sourceCommit.commit_ref, rootDigest: sceneRootDigest, tasksDigest: sceneTasksDigest(),
      stageHashes: saved.map(entry => entry.hash), result: structuredClone(result),
    };
    v0Timing('scene:replay', replayStartedAt);
    // Only the synchronous sealing caller uses this verified prefix. Do not
    // cache it or carry it into a later transaction, lease or replay.
    return seal ? { ...result, sealedStages: saved, baseReaders } : result;
  }
  #prepareSceneBeats(row, base, plan, token, { existing, intent, performance, ballots, add, narrative, prepared, perception, stopNewNpcBeats, hostBoundaryReview }) {
    const missing = existing.filter(task => task.id.startsWith('npc:') && !task.result);
    if (missing.length) return prepared(missing);
    const replay = this.#sceneBeatReplay(row, base, plan, intent, performance, ballots, existing, token, { seal: true });
    const { prefix, beats, cognition, action, sealedStages, baseReaders } = replay;
    const tail = replay.intentTail;
    if (tail?.next) {
      const { index, intent: nextIntent, text, scene } = tail.next;
      const draft = tail.prefix.draft;
      const cognition = this.#narrativeCognition(row, base, plan, createdPlayerId(base), { query: text.slice(0, 256), recentLimit: 6, recallLimit: 4, includeBackground: true });
      const recall = assemblePlayerTaskRecall(cognition, actorForState(draft, createdPlayerId(draft)).persona, draft.location);
      const perception = playerPerceivedScene(draft, scene);
      if ([2, 3].includes(plan.ordinaryAddressVersion)) {
        Object.assign(perception.scene, ordinaryReplyContext(draft, createdPlayerId(draft), perception.scene, perception.targetIds, plan.ordinaryAddressVersion));
      }
      const data = playerPerformanceTaskData(draft, plan, text, projectPerceivedIntent(nextIntent, perception.targetIds), perception.scene, cognition, recall);
      if ([1,2].includes(plan.localTravelAttemptVersion)) data.localTravelAttemptVersion=plan.localTravelAttemptVersion;
      if (plan.localConditionalWaitVersion===1) data.localConditionalWaitVersion=1;
      return prepared([narrative(`performance:${index}`, 'player_performance', data, recall.manifest, undefined, draft)]);
    }

    // The replay already knows whether this act is a prepared swap establish or
    // restore. Carry that fact into the NPC voluntary-menu guard instead of
    // recomputing it from intent alone: a later establish has an occupied
    // parent but a still-unpublished after-state mirror.
    const preparedSwap = replay.preparedSwap === true;
    const runtime = runtimeRevisionForState(base); const budget = runtime.policy.sceneBudget;
    const done = existing.some(task => task.id === 'scene');
    const calls = existing.filter(task => task.id.startsWith('npc:'));
    const usedActors = new Set(calls.map(task => task.actorId));
    const player = createdPlayerId(base);
    const publicRows = prefix.draft.entries.slice(base.entries.length).filter(entry => !['narration', 'reflection'].includes(entry.delivery));
    const hasRoom = publicRows.length + 6 < SCENE_BUDGET.maxBlocks
      && publicRows.reduce((sum, row) => sum + row.text.length, 0) + budget.utteranceChars * 2 + budget.actionChars * 2 < budget.publicEventChars;
    if (usesOrdinaryAdmission32(runtime.id) && !done && existing.some(task => task.id === SOFT_SLOT)) stopNewNpcBeats = true;
    let selection;
    const ordinarySelection = () => selection ??= plan.version === 7 ? this.#ordinarySelection(row, base, plan, existing) ?? false : false;
    if (usesOrdinaryAdmission32(runtime.id) && !done && !stopNewNpcBeats) {
      const selection = ordinarySelection();
      const sources = selection && !prefix.interrupted && !prefix.stopReason && !prefix.intentProgress?.stop
        ? this.#domain.ordinaryScriptSources(base, { refs: selection.scriptSourceRefs, targetId: selection.targetId }) : null;
      const clock = this.#agentJobs.ordinaryAdmissionClock(row);
      // The existing scheduling record seals this admission decision. It never
      // cancels an issued batch, required reactions, or the first direct offer.
      const needsReview = requiresInitialBoundaryReview(adjudicationPolicy(plan));
      const compositionReserveMs = novelCompositionReserveMs(plan);
      stopNewNpcBeats = clock.elapsedMs >= SOFT_EXECUTION_BUDGET.sceneSoftDurationMs
        || (compositionReserveMs > 0 && clock.remainingMs <= hostOrdinaryTailMs(needsReview) + compositionReserveMs)
        || Boolean(sources?.sources?.length && !optionalOrdinaryWaveFits(clock.remainingMs, needsReview, compositionReserveMs));
    }
    const admission = plan.schedulingVersion === 1 && !done
      ? this.#captureSceneScheduling(row, base, plan, prefix, existing, cognition, stopNewNpcBeats, sealedStages, baseReaders) : null;
    if (!done && (admission || (!stopNewNpcBeats && !ballots && !prefix.interrupted && !prefix.stopReason
      && beats.length < budget.beats && calls.length < budget.decisions && hasRoom))) {
      const current = prefix.draft; const states = admission?.states || {};
      if (!admission) for (const actor of actorsForState(base).filter(actor => !['warden', player].includes(actor.id))) {
        states[actor.id] = cognition.get(actor.id)?.state || this.#decisionStateAt(row, base, plan, actor.id);
      }
      const admitted = admission ? admission.scheduling.selected : (() => {
      const reactions = prefix.phase === 'reaction' ? pendingReactionActors(current) : [];
      let selected = reactions.length ? reactions : selectDecisionActors(current, {
        ...dialogueContextPin(plan), targetId: beats.length ? undefined : intent.targetId, performance: beats.length ? undefined : performance,
        triggerLocal: !beats.length && ['act', 'follow', 'conversation'].includes(intent.type), decisionStates: states,
      });
      // Only the immediately sealed beat can wake a conversational follow-up.
      // A real B -> A reply must allow A to ask again without requiring B to
      // disguise her answer as a new question. Bystanders and stale clock ticks
      // still cannot keep a scene alive; all calls share the same scene caps.
      const previousEvents = sealedStages.at(-1)?.receipt.events || [];
      if (beats.length && !reactions.length) selected = [...new Set([...selected,
        ...calls.filter(task => task.context.decisionPolicy?.mode === 'review'
          && cognition.get(task.actorId)?.state.goals.some(goal => goal.status === 'active')).map(task => task.actorId),
      ])];
      if (beats.length && !reactions.length) selected = selected.filter(id => pendingSocialRequests(current, id)
        .some(request => request.status === 'pending' && request.reviewAt <= current.worldTime)
        || previousEvents.some(event => event.speakerId !== id && ['speech', 'writing'].includes(event.delivery)
          && event.addresseeIds?.includes(id) && event.audienceIds?.includes(id))
        || calls.some(task => task.actorId === id && task.context.decisionPolicy?.mode === 'review'
          && cognition.get(id)?.state.goals.some(goal => goal.status === 'active')));
      selected = selected.filter(id => calls.filter(task => task.actorId === id).length < budget.perActor
        && (usedActors.has(id) || usedActors.size < budget.actors));
      const admitted = [];
      for (const id of selected) {
        if (admitted.length >= Math.min(3, budget.decisions - calls.length)) break;
        if (!usedActors.has(id) && usedActors.size >= budget.actors) continue;
        usedActors.add(id); admitted.push(id);
      }
      return admitted;
      })();
      if (admitted.length) {
        const beat = beats.length + 1;
        const prefixHash = sealedStages.find(entry => entry.stage === beat - 1).hash;
        const selection = ordinarySelection();
        return prepared(admitted.map(id => {
          const subjective = states[id]; const projected = actorPerception(current, id);
          const received = decisionSnapshotObservations(base, current, id);
          const ordinarySourceSet = selection?.targetId === id
            ? this.#domain.ordinaryScriptSources(base, { refs: selection.scriptSourceRefs, targetId: id }) : null;
          const ordinaryRequiredIds = (ordinarySourceSet?.observationsByOwner[id] || []).map(source => source.id);
          const privateOwnerSource = id === 'meruru' && plan.hiddenSupplyCapability?.awareness === 1
            ? this.#domain.hiddenSupplyOwnerSource(base, id)?.id : undefined;
          const requiredObservationIds = [...new Set([...ordinaryRequiredIds, ...(privateOwnerSource ? [privateOwnerSource] : [])])];
          const latest = this.#narrativeCognition(row, base, plan, id, { query: '', recentLimit: 6, recallLimit: 0 });
          const query = observableRecallQuery([...latest.recentObservations, ...received], projected,
            { ...dialogueContextPin(plan), receivedObservationIds: received.map(row => row.id) });
          const retrieval = this.#narrativeCognition(row, base, plan, id,
            { query, recentLimit: 6, recallLimit: 8, continuityLimit: 4, includeBackground: true,
              ...(requiredObservationIds.length ? { requiredObservationIds } : {}) });
          if (privateOwnerSource && !retrieval.requiredObservations?.some(row => row.id === privateOwnerSource && row.channel === PRIVATE_SUPPLY_CHANNEL))
            fail('INVALID_AGENT_JOB', '拥有者纪要未通过交付边界。');
          const actorInput = npcDecisionTaskInput(current, id, subjective, plan,
            { boundary: this.#physicalBoundary(row, current, id), remaining: cognition.get(id)?.budget,
              pendingAction: prefix.action, entryStart: prefix.rootEntryCount });
          if (plan.npcMagicCastVersion === 1 && actorInput.decisionPolicy?.mode === 'act' && current.magic) {
            const menu = npcMagicMenu(current, id, this.#domain, base,
              { npcVoluntaryFloatVersion: plan.npcVoluntaryFloatVersion,
                npcMedicalContactVersion: plan.npcMedicalContactVersion, preparedSwap });
            if (menu?.actions.length) {
              actorInput.allowedActions.push('magic_cast');
              actorInput.situation.magicActions = menu.actions;
              actorInput.situation.magicTargets = menu.targets;
              if ([1, 2, 3].includes(plan.npcMagicPersonaPolicyVersion)) {
                actorInput.persona.boundaries = npcMagicPersonaPacketBoundaries(
                  actorInput.persona.boundaries, plan.npcMagicPersonaPolicyVersion, menu);
              }
            }
          }
          const oldSources = cognition.get(id)?.observations || this.#decisionSourcesAt(row, base, plan, id);
          const allSources = [...new Map([...oldSources, ...received.map(observation => ({ ...retrieval.scope, ...observation }))]
            .map(observation => [observation.id, observation])).values()];
          const requests = actorInput.situation.socialRequests;
          const invitation = received.find(source => source.channel === 'hearing'
            && source.text === existing.find(task => task.id === 'performance')?.result?.utterance);
          const ordinaryOffer = ordinaryRequiredIds.length && ordinaryRequiredIds.length === selection?.scriptSourceRefs.length
            && invitation && actorInput.decisionPolicy?.mode === 'act'
            && (!hasSemanticOrdinaryRuntime(plan) || !existing.some(task => task.actorId === id && task.result?.ordinaryParticipation))
            ? { attemptRef: 'a1', activity: 'cooperative-rephrase', invitationSourceRef: invitation.id,
              scriptSourceRefs: ordinaryRequiredIds, criterion: 'sequence-and-causal-continuity@1' } : null;
          // Request sources survive topic changes even when they fall outside
          // optional recall. They are fetched only through owner-local SQL.
          const fullRequests = this.#sceneRequestSources(row, base, plan, id, requests, received);
          const workingSources = [...new Map([...allSources, ...fullRequests].map(observation => [observation.id, observation])).values()];
          const { context, manifest } = assembleNpcDecisionTaskPayload({ ownerId: id, runtimePolicy: runtimeRevisionForState(current).policy,
            worldTime: current.worldTime, dialogueContextVersion: plan.dialogueContextVersion,
            actorInput, subjective, retrieval, workingSourceObservations: workingSources,
             receivedObservations: received, acquiredEvidenceEntries: projected.case?.knownEvidence || [], ordinaryOffer,
             ...(plan.npcIdentifySourceClosureVersion === 1 && prefix.phase === 'ready' && intent.type !== 'case'
               && actorInput.decisionPolicy.mode === 'act' ? { identifyOwnerState: current } : {}),
           });
          const task = add(`npc:${beat}:${id}`, 'roleplay', id, context, manifest,
            { beat, worldTime: current.worldTime, prefixHash }, admission?.scheduling, current);
          // sceneFrame is frozen with the task input, never supplied by a model.
          return task;
        }).map(task => task));
      }
    }
    if (admission) action.schedulingEnd = admission.scheduling;
    if (plan.version === 7) {
      const prior = existing.find(task => task.id === SOFT_SLOT);
      if (prior && !prior.result) return prepared([prior]);
      if (prior?.result?.type === 'ordinary_attempt_unresolved') return prepared([]);
      const capture = this.#captureOrdinaryAttempt(row, base, plan, replay.prefix, existing);
      if (capture) {
        const sourceRefs = capture.sources.map(source => source.ref);
        // Size upper bound only, never persisted, sent to a model or adopted as a candidate/source authority.
        // Both not_satisfied plus all refs is the longest legal result; either unresolved encoding is shorter.
        const candidateSizeUpperBound = { outcome: 'stopped',
          criteria: ['c1', 'c2'].map(id => ({ id, status: 'not_satisfied', sourceRefs })), usedSourceRefs: sourceRefs };
        // Four-key JSON punctuation/keys and two 64-hex hash strings add exactly 193 bytes, excluding both values.
        if (Buffer.byteLength(JSON.stringify(capture.manifest), 'utf8') + Buffer.byteLength(JSON.stringify(candidateSizeUpperBound), 'utf8') + 193 > ordinaryCapacityForRevision(runtimeRevisionForState(base).id).suffixBytes)
          fail('ERR_AGENT_CONTEXT_TOO_LARGE', '完整活动来源超过固定新增行动预算；没有省略来源或发起语义调用。');
      }
      if (prior && !isDeepStrictEqual(prior.manifest, capture?.manifest)) fail('INVALID_AGENT_JOB', '活动来源不属于封存的最后前缀。');
      if (capture && !prior) return prepared([add(SOFT_SLOT, 'world_adjudicator', WORLD_SERVICE_PRINCIPAL,
        { version: 5, role: 'world_adjudicator', principal: { kind: 'service', id: 'world_adjudicator' }, slot: SOFT_SLOT, purpose: SOFT_PURPOSE,
          scope: { principalId: WORLD_SERVICE_PRINCIPAL, branchId: row.branch_id, generation: row.generation, revision: row.base_revision },
          data: { contractVersion: 7, dialogueContextVersion: 1, viewpointActorId: row.actor_id, initialRunPolicy: plan.initialRunPolicy,
            attempt: capture.attempt, scriptSpeakers: capture.scriptSpeakers, prefix: capture.manifest.prefix, sources: capture.sources } }, capture.manifest)]);
      if (prior) action.softResult = this.#ordinarySuffix(row, prior, base);
    }
    const enacted = finalizeCausalScene(prefix, action);
    // Reviewed public director retains its early aperture. A new private task
    // sees nothing from this canonical progression except that its own offer
    // is available; interrupted, clockless and blocked acts issue no offer.
    const privateChoiceTask = () => {
      if (plan.hiddenSupplyCapability?.lifecycle !== 1 || !plan.hiddenSupplyChoice || plan.directorEventPin
        || !hiddenSupplyIntent(existing.find(task => task.id === 'intent')?.result, 1)
        || enacted.interrupted || !hiddenSupplyAdmits(base, enacted.draft, action, enacted.actionOutcome)) return null;
      const prior = existing.find(task => task.id === 'director');
      return !prior?.result && !prior?.terminal && (prior || this.#privateDirectorEnabled())
        ? add('director', 'director', DIRECTOR_PRINCIPAL, plan.hiddenSupplyChoice.packet) : null;
    };
    const after = agentScene(enacted.draft);
    const perceptionOnly = scene => {
      const { readable, rulebookAccess, caseRuntime, actionLimits, ...visible } = scene;
      if ([1, 2].includes(plan.materialProseVersion) && intent.subjectId && readable?.some(row => row.id === intent.subjectId))
        visible.readable = readable.filter(row => row.id === intent.subjectId).map(({ id, name, carrier }) => {
          const sourceCarrier = carrier ?? plan.scene.readable?.find(source => source.id === id)?.carrier;
          return { id, name, ...(sourceCarrier ? { carrier: sourceCarrier } : {}) };
        });
      if (visible.case) {
        const { knownEvidence, inspectables, disclosedEvidence, statements, testimony, ...procedure } = visible.case;
        visible.case = procedure;
      }
      return visible;
    };
    const customEventIds = enacted.events.filter(({ entry }) => entry.customAbilityEvent).map(({ id }) => id);
    const sceneData = { contractVersion: 4, intent: { type: intent.type, ...(intent.operation ? { operation: intent.operation } : {}),
      ...([1, 2].includes(plan.materialProseVersion) ? { ...(intent.subjectId ? { subjectId: intent.subjectId } : {}), ...(intent.targetId ? { targetId: projectPerceivedIntent(intent, perception.targetIds).targetId } : {}) } : {}) },
      sceneBefore: perceptionOnly(perception.scene), sceneAfter: perceptionOnly(playerPerceivedScene(enacted.draft, after).scene),
      ...(customEventIds.length ? { customEventIds } : {}),
      resolution: { elapsed: enacted.draft.worldTime - base.worldTime,
        facts: resolvedSceneFacts(perception.scene, playerPerceivedScene(enacted.draft, after).scene, enacted.publicEvents) }, publicStop: prefix.stopReason || null,
      events: enacted.publicEvents, budget: plan.outputContractVersion === 1 ? { ...SCENE_BUDGET, minHan: 0, targetHan: null } : SCENE_BUDGET,
      ...(plan.sceneEventTimeVersion === 1 ? { sceneEventTimeVersion: 1, eventTimeline: sceneEventTimeline(base, enacted.draft, enacted.events, enacted.publicEvents) } : {}),
      palette: plan.ambientContinuityVersion === 1 ? { before: sceneAuthorizedPalette(perception.scene),
        after: sceneAuthorizedPalette(playerPerceivedScene(enacted.draft, after).scene) }
        : { before: scenePalette(plan.scene.roomId), after: scenePalette(after.roomId) },
      recentScene: base.entries.filter(entry => entry.delivery === 'narration' && !entry.openingSource).slice(-2).map(entry => entry.text.slice(-1200)) };
    Object.assign(sceneData, this.#materialTaskData(row, base, plan, 'scene_composer', sceneData, enacted.draft));
    if (plan.materialProseVersion === 2 || plan.physicalFactsVersion === 2) {
      const snapshots = this.#materialIntermediates(row, base, plan, intent, enacted, replay.materialPrefixes);
      if (snapshots.length) sceneData.materialProseEventSnapshots = snapshots;
    }
    const result = id => existing.find(task => task.id === id)?.result;
    const hostReview = hostBoundaryReview;
    if (!result('scene') && !hostReview) {
      // Seal the normal composer/scheduling end first. The optional private
      // sibling cannot reopen NPC selection or change any other task packet.
      const ownerEvents = plan.novelRoundFirstDraftVersion === 3
        ? new Set(enacted.events.filter(({ entry }) => entry.speakerId === row.actor_id).map(({ id }) => id)) : null;
      const composer = narrative('scene', 'scene_composer', ownerEvents
        ? { ...sceneData, narrationOwnerEventIds: enacted.publicEvents.filter(({ id }) => ownerEvents.has(id)).map(({ id }) => id) }
        : sceneData, undefined, action.schedulingEnd);
      const choice = privateChoiceTask();
      const result = prepared(choice ? [composer, choice] : [composer]);
      // The successful stage already replayed every sealed beat and derived
      // the empty terminal schedule. Keep just that proof for the next host-
      // only terminal call, not for model publication or other situations.
      if (!choice && plan.novelScenePresentationVersion !== 1 && plan.executionRevision?.revisionId === EVENT_DIRECTOR_RUNTIME_REVISION
          && plan.version === 7 && plan.outputContractVersion === 1 && !plan.regeneration
          && !requiresInitialBoundaryReview(adjudicationPolicy(plan)) && admission?.scheduling.selected.length === 0
          && composer.scheduling === action.schedulingEnd && prefix.phase === 'ready' && !prefix.interrupted
          && !prefix.boundary.pending && !enacted.interrupted && !preparedSwap && !prefix.draft.caseRuntime?.occupiedBody
          && action.playerIntentPlan?.steps.every(step => ['look', 'wait', 'move'].includes(step.intent.type))
          && existing.every(task => /^(?:intent|performance(?::[12])?|npc:[123]:[a-z0-9_-]+)$/u.test(task.id))) {
        this.#ordinaryTerminalReplay = { jobId: row.job_id, planHash: row.context_hash,
          tasksHash: this.#sceneDigest([...existing, composer]), stages: sealedStages.map(stage => stage.hash),
          changes: this.#db.prepare('SELECT total_changes() n').get().n,
          dataVersion: this.#db.prepare('PRAGMA data_version').get().data_version,
          replay: structuredClone({ action, prefix, beats, cognition }) };
      }
      return result;
    }
    const choice = privateChoiceTask();
    if (choice) return prepared([choice]);
    const repairDocument = hostReview ? null : mergeHostSceneEvents(result('scene'), customEventIds);
    // V3 style revisions use the already bounded optional composer attempt.
    const requireStyleRepair = plan.styleVersion === 1 && plan.novelRoundFirstDraftVersion !== 3;
    if (!hostReview && sceneNeedsRepair(repairDocument, enacted.publicEvents, { style: requireStyleRepair, outputContractVersion: plan.outputContractVersion, antiClicheVersion: plan.antiClicheVersion, narrationPacingVersion: plan.narrationPacingVersion }) && !result('scene-repair')) {
      const styleFeedback = requireStyleRepair ? sceneStyleFeedback(repairDocument, { antiClicheVersion: plan.antiClicheVersion }) : null;
      return prepared([
        narrative('scene-repair', 'scene_composer', { ...sceneData, repairSource: repairDocument,
          compositionFeedback: { remainingRepairs: 0, ...(styleFeedback ? { styleRuleIds: styleFeedback.ruleIds } : {}),
            instruction: plan.narrationPacingVersion === 2
              ? `${styleFeedback?.instruction || '仅按相同已裁决事件编排，保留每个事件。'} 发布的旁白自然段各需 500 个汉字；材料不足如实收束，不增造细节。`
              : plan.outputContractVersion === 1
              ? `${styleFeedback?.instruction || '仅按相同已裁决事件编排，保留每个事件。'} 没有最少字数，不因短而延长；仅处理已命中文风或超出上限的问题，遇到玩家选择或材料不足立即收束。`
              : styleFeedback ? `${styleFeedback.instruction} 仍须遵守正文篇幅预算，遇到玩家选择或材料不足时立即收束。` : '仅按相同已裁决事件编排，保留每个事件，遇到玩家选择立即收束。' } }),
      ]);
    }
    if (requiresInitialBoundaryReview(adjudicationPolicy(plan)) && !result(INITIAL_BOUNDARY_REVIEW_SLOT)) {
      return prepared([add(INITIAL_BOUNDARY_REVIEW_SLOT, 'world_adjudicator', WORLD_SERVICE_PRINCIPAL,
        { version: 4, role: 'world_adjudicator', principal: { kind: 'service', id: 'world_adjudicator' }, slot: INITIAL_BOUNDARY_REVIEW_SLOT,
          scope: { principalId: WORLD_SERVICE_PRINCIPAL, branchId: row.branch_id, generation: row.generation, revision: row.base_revision },
          data: { viewpointActorId: row.actor_id, contractVersion: 6, dialogueContextVersion: 1,
            initialRunPolicy: plan.initialRunPolicy, ...effectiveAdjudicationData(plan), proposed: initialBoundaryReviewProposal(existing) } })]);
    }
    return prepared([]);
  }
  #sceneRequestSources(row, base, plan, actorId, requests, received) {
    const ids = new Set(requests.map(request => request.sourceObservationId));
    const local = received.filter(observation => ids.has(observation.id));
    const missing = [...ids].filter(id => !local.some(observation => observation.id === id));
    if (!missing.length) return local.map(observation => ({ ...observation,
      actorId, branchId: row.branch_id, generation: row.generation, revision: row.base_revision }));
    const cognition = this.#narrativeCognition(row, base, plan, actorId,
      { query: '', recentLimit: 1, recallLimit: 0, requiredObservationIds: missing });
    return [...local, ...(cognition.requiredObservations || []), ...cognition.recentObservations]
      .filter(observation => ids.has(observation.id)).map(observation => ({ ...observation,
        actorId, branchId: row.branch_id, generation: row.generation, revision: row.base_revision }));
  }
  #ordinarySelection(row, base, plan, tasks) {
    if (plan.version !== 7 || plan.intentContractVersion !== 2 || plan.regeneration) return null;
    const delivered = tasks.find(task => task.id === 'intent')?.result;
    const candidate = delivered && hasIntentAdmissionRuntime(plan) ? projectIntentAdmissionPlan(delivered) : delivered;
    if (candidate?.route !== 'steps' || candidate.steps.length !== 1 || candidate.steps[0].condition !== 'always'
      || candidate.steps[0].intent.type !== 'conversation') return null;
    const selection = candidate.steps[0].intent.ordinaryAttempt;
    if (!selection) return null;
    const snapshot = this.#itemPolicySnapshot(base, plan);
    const perceived = playerPerceivedScene(snapshot, plan.scene);
    const targets = perceived.targetIds;
    let targetId = targets[selection.targetHandle];
    if ([KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(plan.executionRevision?.revisionId)) {
      const owner = createdPlayerId(snapshot), handle = selection.targetHandle;
      // Both the actually delivered projection and HOST scene must contain one
      // current recipient. A bare candidate ID is never a fallback capability.
      if (perceived.scene.nearby.filter(actor => actor.id === handle).length !== 1) return null;
      if (!targetId && recognizedActors(snapshot, owner).has(handle)
        && plan.scene.nearby.filter(actor => actor.id === handle).length === 1
        && actorsForState(snapshot).some(actor => actor.id === handle)
        && actorTarget(snapshot, owner, actorHandle(owner, handle)) === handle) targetId = handle;
      if (!targetId || plan.scene.nearby.filter(actor => actor.id === targetId).length !== 1
        || actorRoom(snapshot, owner) !== actorRoom(snapshot, targetId)) return null;
    }
    if (!targetId || targetId === createdPlayerId(base) || targetId === 'warden') return null;
    return { ...structuredClone(selection), targetId };
  }
  #ordinaryTaskRow(row, task) {
    const stored = this.#db.prepare('SELECT * FROM agent_turn_tasks WHERE job_id=? AND slot=?').get(row.job_id, task.id);
    if (!stored || this.#sceneDigest(JSON.parse(stored.input_json)) !== stored.input_hash
      || task.result && this.#sceneDigest(task.result) !== stored.result_hash) fail('INVALID_AGENT_JOB');
    return stored;
  }
  #captureOrdinaryAttempt(row, base, plan, prefix, tasks) {
    const selection = this.#ordinarySelection(row, base, plan, tasks);
    if (!selection || prefix.interrupted || prefix.stopReason || prefix.intentProgress?.stop
      || prefix.draft.caseRuntime?.occupiedBody || pendingReactionActors(prefix.draft).length) return null;
    const player = createdPlayerId(base), target = selection.targetId;
    const performance = tasks.find(task => task.id === 'performance');
    const participating = tasks.filter(task => task.id.startsWith('npc:') && task.actorId === target
      && task.result?.ordinaryParticipation?.choice === 'contribute');
    if (!performance?.result?.utterance || participating.length !== 1
      || tasks.filter(task => task.id.startsWith('npc:') && task.result).some(task =>
        !['speak', 'wait'].includes(task.result.decision?.operation.type))) return null;
    const npc = participating[0], proposal = npc.result;
    if (proposal.decision?.operation.type !== 'speak' || npc.context.decisionPolicy?.mode === 'review'
      || !proposal.utterance || npc.context.ordinaryParticipationVersion !== 1) return null;
    const original = this.#domain.ordinaryScriptSources(base, { refs: selection.scriptSourceRefs, targetId: target });
    if (!original.sources.length || original.sources.length !== selection.scriptSourceRefs.length) return null;
    const entries = [...prefix.draft.entries.slice(base.entries.length),
      ...(prefix.draft.agentAutonomy?.events || []).slice(base.agentAutonomy?.events?.length || 0)];
    const playerEntries = entries.filter(entry => entry.speakerId === player && entry.delivery === 'speech'
      && entry.observationKey === plan.questionKey && entry.text === performance.result.utterance);
    const contributionKey = hasSemanticOrdinaryRuntime(plan) ? `npc:${row.job_id}:beat:${npc.sceneFrame.beat}:${target}` : null;
    const npcEntries = entries.filter(entry => entry.speakerId === target && entry.delivery === 'speech'
      && entry.text === proposal.utterance && (contributionKey ? entry.observationKey === contributionKey : entry.observationKey?.includes(row.job_id)));
    if (playerEntries.length !== 1 || npcEntries.length !== 1) return null;
    const [invitation] = playerEntries, [contribution] = npcEntries;
    if (entries.indexOf(invitation) >= entries.indexOf(contribution) || invitation.occurredAt > contribution.occurredAt) return null;
    const invitationId = actorObservationId(prefix.draft, invitation.observationKey, target);
    if (proposal.ordinaryParticipation.attemptRef !== 'a1' || proposal.ordinaryParticipation.invitationSourceRef !== invitationId
      || npc.context.ordinaryInvitation?.invitationSourceRef !== invitationId
      || !npc.context.observations.some(obs => obs.id === invitationId && obs.channel === 'hearing' && obs.text === invitation.text)) return null;
    const heardNow = acquisitionAudience(prefix.draft, target, { delivery: 'speech' });
    const eligible = [...new Set(invitation.audienceIds.filter(owner => contribution.audienceIds.includes(owner) && heardNow.includes(owner)))];
    const audienceIds = [];
    for (const owner of eligible) {
      const sources = this.#domain.ordinaryScriptSources(base, { refs: selection.scriptSourceRefs, targetId: owner });
      if (!isDeepStrictEqual(sources.sources, original.sources)) continue;
      audienceIds.push(owner);
      for (const binding of original.bindings) {
        const extra = sources.bindings.find(row => row.ref === binding.ref)?.certificates || [];
        for (const cert of extra) if (!binding.certificates.some(prior => isDeepStrictEqual(prior, cert))) binding.certificates.push(cert);
      }
    }
    if (![player, target].every(owner => audienceIds.includes(owner))) return null;
    const stage = this.#agentJobs.stages(row).at(-1);
    if (!stage || stage.stage !== prefix.beats.length || stage.receipt.stateHash !== this.#sceneDigest(prefix)) fail('INVALID_AGENT_JOB');
    const performanceRow = this.#ordinaryTaskRow(row, performance), npcRow = this.#ordinaryTaskRow(row, npc);
    const npcPacket = buildRoleplayContext(npc.context, { maxBytes: npc.maxBytes }), packetHash = this.#sceneDigest(npcPacket);
    const scripts = original.sources.map((source, index) => ({ ...source, ref: `s${index + 1}`, kind: 'script', performerHandle: original.sourceHandles[index].handle }));
    const bindings = original.bindings.map((binding, index) => ({ ...binding, ref: `s${index + 1}` }));
    for (const binding of bindings) {
      const observation = original.observationsByOwner[target].find(obs => binding.certificates.some(cert => cert.ownerId === target && cert.observationId === obs.id));
      if (!observation || !npcPacket.observations.some(obs => obs.id === observation.id && obs.text === observation.text && obs.channel === 'hearing')) return null;
      binding.certificates.push({ kind: 'sealed-packet-delivery', slot: npc.id, inputHash: npcRow.input_hash,
        packetHash, ownerId: target, sourceObservationId: observation.id, textHash: this.#sceneTextHash(observation.text) });
    }
    const next = () => `s${scripts.length + 1}`;
    const invitationRef = next(); scripts.push({ ref: invitationRef, kind: 'invitation', performerHandle: 'p1', text: invitation.text });
    const expression = (task, stored, ownerId, entry, body) => ({ kind: 'sealed-expression', slot: task.id,
      inputHash: stored.input_hash, resultHash: stored.result_hash, ownerId, operation: 'speak', entryKey: entry.observationKey,
      textHash: this.#sceneTextHash(body) });
    bindings.push({ ref: invitationRef, certificates: [expression(performance, performanceRow, player, invitation, invitation.text),
      { kind: 'sealed-packet-delivery', slot: npc.id, inputHash: npcRow.input_hash, packetHash, ownerId: target,
        sourceObservationId: invitationId, textHash: this.#sceneTextHash(invitation.text) }] });
    const participationRef = next(); scripts.push({ ref: participationRef, kind: 'participation', performerHandle: 'p2', choice: 'contribute', invitationSourceRef: invitationRef });
    bindings.push({ ref: participationRef, certificates: [expression(npc, npcRow, target, contribution, JSON.stringify(proposal.ordinaryParticipation))] });
    for (const [task, stored, ownerId, entry, performerHandle] of [[performance, performanceRow, player, invitation, 'p1'], [npc, npcRow, target, contribution, 'p2']]) {
      const ref = next(); scripts.push({ ref, kind: 'contribution', performerHandle, text: entry.text });
      bindings.push({ ref, certificates: [expression(task, stored, ownerId, entry, entry.text), ...audienceIds.map(owner => ({
        kind: 'prefix-perception', jobId: row.job_id, baseCommitRef: stage.receipt.baseCommitRef, receiptHash: stage.hash,
        entryKey: entry.observationKey, entryHash: this.#sceneDigest(entry), occurredAt: entry.occurredAt,
        audienceIds: [...entry.audienceIds], ownerId: owner }))] });
    }
    return captureCooperativeRephrase({ jobId: row.job_id, runId: plan.initialRunPolicy.source.runId,
      branchId: row.branch_id, participants: [player, target], audienceIds, scriptSpeakers: original.scriptSpeakers,
      prefix: { baseCommitRef: stage.receipt.baseCommitRef, stage: stage.stage, receiptHash: stage.hash, stateHash: stage.receipt.stateHash },
      sources: scripts, bindings, occurredAt: contribution.occurredAt, learnedAt: prefix.draft.worldTime }, runtimeRevisionForState(base).id);
  }
  #sceneTextHash(value) { return createHash('sha256').update(value).digest('hex'); }
  #ordinarySuffix(row, task, base) {
    const revisionId = runtimeRevisionForState(base).id;
    const stored = this.#ordinaryTaskRow(row, task);
    const capture = captureCooperativeRephrase(Object.fromEntries(Object.entries(task.manifest).filter(([key]) => key !== 'version')), revisionId);
    // Only the internal world suffix omits the three constants restored by the full candidate validator.
    const candidate = { outcome: task.result.outcome, criteria: task.result.criteria, usedSourceRefs: task.result.usedSourceRefs };
    const suffix = { manifest: capture.manifest, candidate, taskInputHash: stored.input_hash, taskResultHash: stored.result_hash };
    if (Buffer.byteLength(JSON.stringify(suffix), 'utf8') > ordinaryCapacityForRevision(revisionId).suffixBytes) fail('ERR_AGENT_CONTEXT_TOO_LARGE', '本次完整活动来源超过固定结果预算，请缩小另一次明确练习。');
    applyCooperativeRephraseResult(suffix, revisionId); return suffix;
  }
  #completeSoftResolution(row, base, plan, token, tasks) {
    const task = tasks.find(task => task.id === SOFT_SLOT);
    if (plan.version !== 7 || task?.result?.type !== 'ordinary_attempt_unresolved') fail('INVALID_AGENT_JOB');
    this.#validateNarrativeTask(task, task.result);
    const intent = this.#perceivedIntent(base, plan, tasks.find(task => task.id === 'intent')?.result);
    const replay = this.#sceneBeatReplay(row, base, plan, intent, tasks.find(task => task.id === 'performance')?.result, undefined, tasks, token);
    const capture = this.#captureOrdinaryAttempt(row, base, plan, replay.prefix, tasks);
    if (!capture || !isDeepStrictEqual(capture.manifest, task.manifest)) fail('INVALID_AGENT_JOB');
    const actionOutcome = projectActionOutcome({ version: 1, phase: 'stopped', steps: [],
      stop: { index: 0, kind: 'clarification', code: 'ambiguous_reference' } });
    const receipt = { ...this.#agentReceipt({ requestId: row.request_id }, base, false,
      '本次复述的语义承接或来源仍不确定。没有发布本轮动作、对白、认知或时间变化；请另作明确选择。'), actionOutcome };
    this.#rememberAgentReceipt({ requestId: row.request_id, text: row.text }, base, receipt);
    this.#agentJobs.commit(row, token, { turnId: null, receipt, review: { policy: 'ordinary-attempt-resolution@1', reason: task.result.reason, actionOutcome } });
    return receipt;
  }
  canRetryAgentOrdinaryAdjudication(jobId, token, delayMs, onDenied) {
    if (!Number.isSafeInteger(delayMs) || delayMs < 0 || delayMs > ORDINARY_ADMISSION32.optionalRetryDelayMs) fail('INVALID_AGENT_JOB');
    return this.#transaction(() => {
      const { row } = this.#agentJobAtHead(jobId, token);
      return this.#agentJobs.canRetryOrdinaryAdjudication(row, delayMs, onDenied);
    }, { readOnly: true });
  }
  reserveAgentModelAttempt(jobId, slot, token, context, manualNpcResume = false) {
    const startedAt = performance.now();
    try {
      return this.#transaction(() => {
        const { row, state, plan } = this.#agentJobAtHead(jobId, token);
        if (plan.version !== 7) fail('INVALID_AGENT_JOB');
        return this.#agentJobs.reserveModelAttempt(row, slot, token, (task, tasks) => {
          const actual = task && (task.role === 'roleplay' ? buildRoleplayContext(task.context, { maxBytes: task.maxBytes })
            : task.role === 'world_adjudicator' ? buildServiceTaskContext(task.context)
              : task.role === 'director' ? buildDirectorContext(task.context) : buildNarrativeContext(task.context));
          if (isPrivateDirectorPacket(task?.context) && !this.#privateDirectorEnabled()) fail('LLM_NOT_CONFIGURED');
          if (!task || !isDeepStrictEqual(actual, context)) fail('INVALID_AGENT_JOB');
          this.#assertMaterialTask(row, state, plan, task, token, { tasks, initialPolicy: () => this.#domain.initialRunPolicy(state) });
        }, manualNpcResume);
      }, { reuseVerifiedCommitBytes: true, reuseRelationshipProjection: true, reuseExactPlanReads: true });
    } finally { v0Timing('reserveAgentModelAttempt', startedAt); }
  }
  #completeIntentResolution(row, base, plan, token, tasks) {
    if (!hasIntentRuntime(plan.executionRevision?.revisionId) || tasks.length !== 1 || tasks[0].id !== 'intent'
      || !tasks[0].result || !['steps', 'clarification', 'unsupported'].includes(tasks[0].result.route)
      || tasks[0].result.route === 'steps' && this.#perceivedIntent(base, plan, tasks[0].result)) fail('INVALID_AGENT_JOB');
    this.#assertMaterialTask(row, base, plan, tasks[0], token);
    this.#validateNarrativeTask(tasks[0], tasks[0].result);
    const kind = tasks[0].result.route === 'steps' ? 'blocked' : tasks[0].result.route;
    const actionOutcome = projectActionOutcome({ version: 1, phase: 'stopped', steps: [],
      stop: { index: 0, kind, code: kind === 'unsupported' ? 'unsupported_effect' : kind === 'blocked' ? 'item_unavailable' : 'ambiguous_reference' } });
    const firstType = tasks[0].result.steps?.[0]?.intent?.type;
    const effective = plan.effectiveRunPolicy;
    const blockedByPolicy = effective?.source.adoptedCommitRef && effectiveBoundaryDecision(effective.playPolicy, firstType, { semantic: true });
    const blocked = blockedByPolicy ? '当前玩法边界不允许这项案件行动，没有执行。' : '当前具体物件的拿取、持有或在场条件不成立，动作没有执行。';
    const receipt = { ...this.#agentReceipt({ requestId: row.request_id }, base, false, kind === 'blocked' ? blocked : tasks[0].result.summary), actionOutcome };
    this.#rememberAgentReceipt({ requestId: row.request_id, text: row.text }, base, receipt);
    // Intentionally no turn, #write, Domain commit, staged delivery, elapsed
    // time, growth consumption or player speech. This settles only the job.
    this.#agentJobs.commit(row, token, { turnId: null, receipt, review: { policy: 'intent-resolution@1', actionOutcome } });
    return receipt;
  }
  #completeInitialPolicyResolution(row, base, plan, token) {
    const actionOutcome = projectActionOutcome({ version: 1, phase: 'stopped', steps: [],
      stop: { index: 0, kind: 'clarification', code: 'ambiguous_reference' } });
    const receipt = { ...this.#agentReceipt({ requestId: row.request_id }, base, false,
      '目前无法确认本轮拟采纳内容符合初始边界。请澄清当前请求；未采纳本轮动作、对白、认知、物权或时间变化，初始边界未改。'), actionOutcome };
    this.#rememberAgentReceipt({ requestId: row.request_id, text: row.text }, base, receipt);
    this.#agentJobs.commit(row, token, { turnId: null, receipt, review: { policy: 'initial-policy-resolution@1', actionOutcome } });
    return receipt;
  }
  agentFailureOutcome(jobId, code = 'ERR_LLM_TURN_FAILED') {
    return this.#transaction(() => {
      const row = this.#agentJobs.get(jobId); if (!row || row.status === 'committed') return undefined;
      const plan = this.#agentJobs.input(row);
      if (![1, 2].includes(plan.intentContractVersion) || !hasIntentRuntime(plan.executionRevision?.revisionId)) return undefined;
      let intent = this.#agentJobs.tasks(row).find(task => task.id === 'intent')?.result;
      if (plan.hostCaseChoiceVersion === 1) {
        const source = plan.regeneration?.checkpoint || JSON.parse(this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
          .get(row.branch_id, row.generation, row.base_revision).snapshot_json);
        intent = this.#resolvedIntentPlan(source, plan);
      }
      const steps = intent?.route === 'steps' ? intent.steps.map((_step, index) => ({ index, status: 'not_executed', code: 'operational_failure', eventIds: [] })) : [];
      return projectActionOutcome({ version: 1, phase: 'failed', steps, failure: { code } });
    }, { readOnly: true });
  }
  #completeSceneBeatTurn(row, base, plan, token, { hostScenePresentation = false, recoveryCommitRef, recoveryNarrationVersion } = {}) {
    const pacing = recoveryNarrationVersion ?? plan.narrationPacingVersion;
    const tasks = this.#agentJobs.tasks(row); const output = id => tasks.find(task => task.id === id)?.result;
    // These reads belong to this one synchronous completion, before publication.
    // Each task still validates against the same sealed values; later Host calls
    // (or reads at a different base) obtain their own proof.
    let initial;
    const completionRead = { tasks, initialPolicy: () => (initial ??= { value: this.#domain.initialRunPolicy(base) }).value };
    if ([1, 2].includes(plan.intentContractVersion) && (this.#resolvedIntentPlan(base, plan, output('intent'))?.route !== 'steps' || !this.#perceivedIntent(base, plan, output('intent')))) return this.#completeIntentResolution(row, base, plan, token, tasks);
    if (plan.version === 7 && output(SOFT_SLOT)?.type === 'ordinary_attempt_unresolved') return this.#completeSoftResolution(row, base, plan, token, tasks);
    if (requiresInitialBoundaryReview(adjudicationPolicy(plan))) {
      const review = tasks.find(task => task.id === INITIAL_BOUNDARY_REVIEW_SLOT);
      if (!review?.result) fail('INVALID_AGENT_OUTPUT', '初始边界复核尚未完成；没有发布本轮。');
      this.#assertMaterialTask(row, base, plan, review, token, completionRead);
      this.#validateNarrativeTask(review, review.result);
      const composer = tasks.find(task => task.id === 'scene');
      const conflict = effectiveAdjudicationData(plan).runBoundary
         ? initialPublicBoundaryConflict(adjudicationPolicy(plan), initialBoundaryReviewProposal(tasks))
         : initialNarrativeBoundaryConflict(buildNarrativeContext(composer.context), initialBoundaryReviewProposal(tasks));
      if (!validateInitialBoundaryAssessments(adjudicationPolicy(plan), review.result.assessments) || conflict)
        return this.#completeInitialPolicyResolution(row, base, plan, token);
    }
    const sceneTask = tasks.find(task => task.id === 'scene');
    const hostPresentation = hostScenePresentation === true;
    if (hostPresentation && (!sceneTask || sceneTask.result || sceneTask.terminal)) fail('INVALID_AGENT_JOB', '宿主呈现只能接续尚未完成的原始场景任务。');
    const incomplete = tasks.filter(task => !task.result && !task.terminal && !(hostPresentation && task.id === 'scene'));
    if (incomplete.length || !output('performance') || (!output('scene') && !hostPresentation)) fail('INVALID_AGENT_OUTPUT', '场景阶段尚未完整完成。');
    for (const task of tasks) if (!task.terminal && !(hostPresentation && task.id === 'scene')) {
      this.#assertMaterialTask(row, base, plan, task, token, completionRead);
      this.#validateNarrativeTask(task, task.result, task.id === 'scene' && task.context.data.narrationPacingVersion === 2
        && recoveryNarrationVersion === 3 ? 3 : undefined);
    }
    const intent = this.#perceivedIntent(base, plan, plan.intentHint.type === 'interpret' ? output('intent') : plan.intentHint);
    const ballots = intent.operation === 'vote' ? Object.fromEntries(tasks.filter(task => task.id.startsWith('ballot:'))
      .map(task => [task.actorId, task.result.ballot.candidateId])) : undefined;
    let replay;
    const terminal = this.#ordinaryTerminalReplay;
    if (terminal?.jobId === row.job_id) {
      this.#ordinaryTerminalReplay = null;
      // Lease, active world, input and task validators have already been run.
      // A write (even a local rolled-back write) or another connection's commit
      // invalidates this one-use proof. Exact task/stage changes also miss.
      if (hostPresentation && terminal.planHash === row.context_hash
          && terminal.changes === this.#db.prepare('SELECT total_changes() n').get().n
          && terminal.dataVersion === this.#db.prepare('PRAGMA data_version').get().data_version
          && terminal.tasksHash === this.#sceneDigest(tasks)
          && isDeepStrictEqual(terminal.stages, this.#agentJobs.stages(row).map(stage => stage.hash))) {
        replay = terminal.replay;
        v0Timing('scene:ordinary-terminal-prefix-reused', performance.now());
      }
    }
    replay ??= this.#sceneBeatReplay(row, base, plan, intent, output('performance'), ballots, tasks, token);
    const hostDocument = hostPresentation ? hostSceneDocument(tasks.find(task => task.id === 'scene').context.data.events) : null;
    const sceneResult = output('scene');
    const selectedDocument = output('scene-repair') || sceneResult || hostDocument;
    const action = { ...replay.action, ...(pacing === 3 ? { narrationPacingVersion: 3 } : {}), document: selectedDocument };
    const composerData = sceneTask.context.data;
    const sparseRoundProse = ordinaryRoundProseMode(sceneTask.context) === 'sparse';
    const publishedParagraphs = pacing === 2
      ? projectQualifiedSceneDocument(mergeHostSceneEvents(selectedDocument, composerData.customEventIds), composerData.events)
      : null;
    const roundFeedback = pacing === 3 && !sparseRoundProse
      ? sceneRoundFeedback(mergeHostSceneEvents(selectedDocument, composerData.customEventIds), composerData.events) : null;
    if (publishedParagraphs) {
      action.document = publishedParagraphs.document;
      if (publishedParagraphs.omittedParagraphs) action.omittedNarrationParagraphs = publishedParagraphs.omittedParagraphs;
    }
    const canonical = finalizeCausalScene(replay.prefix, action, recoveryNarrationVersion === 3 && plan.narrationPacingVersion === 2
      ? { recoveredNarrationFrom: 2 } : undefined);
    if (withRunBoundary(base, plan.runPolicyConsumersVersion === 1 ? plan.effectiveRunPolicy : undefined, () => initialBoundaryHasUnreviewedCaseChange(base, canonical.draft, canonical.events, canonical.publicEvents)))
      return this.#completeInitialPolicyResolution(row, base, plan, token);
    if (canonical.actionOutcome) action.actionOutcome = structuredClone(canonical.actionOutcome);
    const canonicalCustomIds = canonical.events.filter(({ entry }) => entry.customAbilityEvent).map(({ id }) => id);
    if (!hostPresentation && recoveryNarrationVersion !== 3 && sceneNeedsRepair(mergeHostSceneEvents(sceneResult, canonicalCustomIds), canonical.publicEvents,
      { style: plan.styleVersion === 1 && plan.novelRoundFirstDraftVersion !== 3, outputContractVersion: plan.outputContractVersion, antiClicheVersion: plan.antiClicheVersion, narrationPacingVersion: pacing }) && !output('scene-repair'))
      fail('INVALID_AGENT_OUTPUT', '场景正文修订尚未完成。');
    const decisionStates = [...replay.cognition].filter(([_owner, value]) => value.journal.length)
      .map(([ownerId, value]) => ({ ownerId, state: value.state, journal: value.journal }));
    const before = plan.regeneration ? this.#publishRegenerationBase(base, plan.regeneration.turnId) : base;
    // Stage receipts bind the historical knowledge prefix. Publication replays
    // the same action from its actual fork envelope, so sceneRevision is also
    // canonical when this transition is checked after reload or another turn.
    let next = structuredClone(before);
    const customCommand = this.#customTextCommand(before, action);
    const swapCommand = this.#swapTextCommand(before, action);
    const swapPublication = swapCommand ? this.#domain.prepareSwapLifecycle(before, swapCommand) : null;
    if (customCommand) {
      setCustomActPreparation(next, { command: customCommand,
        prepared: this.#domain.prepareCustomUse(before, customCommand),
        capabilities: this.#domain.customAbilityCapabilities(before) });
    } else if (swapPublication) {
      setSwapActPreparation(next, { command: swapCommand,
        prepared: swapPublication, capabilities: this.#domain.swapLifecycleCapabilities(before) });
    } else if ((action.intent.type !== 'magic' && action.intent.magic || action.intent?.type === 'runtime'
      && String(action.intent?.subjectId || '').startsWith('force-structure:')) && !next.magic) {
      const actual = this.#magicAt(before);
      if (actual) next.magic = actual;
      else { const temporary = this.#temporaryMagic(before);
        if (!temporary) fail('MAGIC_HOST_INITIALIZATION_REQUIRED');
        next.magic = temporary.magic; }
    }
    this.#attachNpcMagic(next, plan);
    setSceneDomainStore(next, this.#domain, before);
    setSceneStageClocks(next, this.#sceneStageClocksFor(action));
    try { applyAgentAction(next, action); }
    finally { setSceneStageClocks(next, null); }
    setSceneDomainStore(next, null);
    takeCustomActPreparation(next);
    takeSwapActPreparation(next);
    const npcMagicPublication = takeNpcMagicPublication(next);
    const turnId = randomUUID(); next.turnIds.push(turnId);
    this.#insertTurn(turnId, row.text, before, next);
    const directorTask = tasks.find(task => task.id === 'director');
    // The existing v2 consumer never receives a v4 result; public lifecycle
    // settlement uses the immutable Domain commit in DirectorPlanningStore.
    const directorOutput = plan.directorExtension?.id === DIRECTOR_LIFECYCLE_EXTENSION.id ? directorTask?.result : undefined;
    const opportunity = directorOutput?.operation === 'focus' ? directorTask.context.data.opportunities.find(candidate =>
      candidate.id === directorOutput.opportunityId && candidate.sourceRef === directorOutput.sourceRef) : undefined;
    const rankingActors = new Set(tasks.flatMap(task => task.scheduling?.advisory?.appliedActorIds || []));
    const intentBefore = action.intent?.type === 'runtime'
      && String(action.intent?.subjectId || '').startsWith('force-structure:')
      ? withMagicProjection(before, this.#magicAt(before)) : before;
    const reaction = this.#write(next, 'act', { action: { intentKey: this.#domain.intentKey(intentBefore, row.text) }, decisionStates, stageDelivery: false, hiddenSupplyMode: plan.hiddenSupplyCapability?.version === 2 ? this.#privateDirectorMode() : 'off',
      baselineMagic: plan.playerTextMagicVersion === 1 && plan.npcMagicCastVersion === 1
        && !hasCaseOne(before) && !npcMagicPublication && !swapPublication
        && (customCommand ? action.intent?.magic?.customBinding !== undefined : action.intent?.type === 'magic' || !action.intent?.magic),
      ...(npcMagicPublication ? { magicPublication: npcMagicPublication } : {}), ...(customCommand ? { customCommand } : {}),
      ...(swapPublication ? { swapPublication } : {}),
      director: { before: base, action, jobId: row.job_id,
        ...(plan.directorExtension?.id === DIRECTOR_LIFECYCLE_EXTENSION.id ? { captured: plan.directorCandidates,
          opportunity, output: directorOutput, rankingUsedIds: plan.directorCandidates
            .filter(candidate => rankingActors.has(candidate.targetActorId)).map(candidate => candidate.id) } : {}) } });
    if (activeProcedure(next)?.stage === 'execution_ready' && activeProcedure(base)?.verdict?.id !== activeProcedure(next).verdict.id) {
      const saveId = randomUUID(); this.#db.prepare('INSERT INTO prologue_saves(id,name,state) VALUES(?,?,?)')
        .run(saveId, '案件处刑前自动存档', JSON.stringify(next)); this.#bindSlot(saveId, 1, next);
    }
    const published = this.#publishStoryReaction(next, reaction);
    const omitted = publishedParagraphs?.omittedParagraphs || 0;
    const receipt = this.#agentReceipt({ requestId: row.request_id }, published, true,
      published.generation !== next.generation ? '死亡回溯已实际发生；你在本人清晨醒来的分支继续。'
        : plan.regeneration ? '这一轮已重新生成，原进度已自动备份。' : '行动已展开，等待你的下一次选择。');
    if (omitted) {
      receipt.narrationOutcome = { kind: 'paragraph_minimum_not_met', minimumHan: NOVEL_MIN_PARAGRAPH_HAN, omittedParagraphs: omitted };
      receipt.message += ` 本轮有 ${omitted} 段旁白未达每段 ${NOVEL_MIN_PARAGRAPH_HAN} 汉字，未展示；已发生的事件仍保留。`;
    } else if (publishedParagraphs) receipt.narrationOutcome = { kind: 'paragraph_minimum_met', minimumHan: NOVEL_MIN_PARAGRAPH_HAN };
    else if (pacing === 3 && !sparseRoundProse) {
      receipt.narrationOutcome = roundFeedback ? { kind: 'round_minimum_not_met', ...roundFeedback }
        : { kind: 'round_minimum_met', minimumHan: NOVEL_MIN_ROUND_HAN };
      if (roundFeedback) receipt.message += ` 本轮合规旁白为 ${roundFeedback.actualHan} 汉字，未达合计 ${NOVEL_MIN_ROUND_HAN} 汉字；保留已验证的正文和已发生事件。`;
    }
    this.#rememberAgentReceipt({ requestId: row.request_id, text: row.text }, published, receipt);
    if (published.generation !== next.generation) {
      this.#db.prepare('INSERT INTO prologue_story_request_receipts VALUES(?,?,?,?,?,?,?)').run(row.request_id,
        row.text, row.generation, row.base_revision, reaction.request.source.headCommitRef,
        this.#domain.scope(published).commitRef, JSON.stringify(receipt));
    }
    const settlement = { turnId, receipt, review: { policy: 'scene-owner-journal@1',
      adoptedHostMemories: 0, adoptedSubjective: [...replay.cognition.values()].reduce((sum, value) => sum + value.adopted.length, 0),
      deferredSubjective: [...replay.cognition.values()].reduce((sum, value) => sum + value.deferred.length, 0),
      npcDecisions: tasks.filter(task => task.id.startsWith('npc:')).length, beats: replay.beats.length,
      scene: sceneSummary(next.entries.slice(base.entries.length), action.document.stopReason, action), compositionRepairs: output('scene-repair') ? 1 : 0,
      ...(hostPresentation ? { presentationOrigin: 'host', hostPresentationVersion: 1 } : {}) } };
    if (recoveryCommitRef === undefined) this.#agentJobs.commit(row, token, settlement);
    else this.#agentJobs.commitSceneRecovery(row, token, recoveryCommitRef, settlement);
    if (plan.regeneration || published.generation !== next.generation) this.#agentJobs.cancelObsolete(this.#domain.scope(published));
    // An already enabled magic projection does not consult active jobs. Without
    // it, a just-committed job can change upgrade availability; read that view
    // after settlement as before. stage() still omits independent save cards.
    this.#delivery.stage(receipt.view.magic?.enabled === true ? receipt.view
      : this.#view(published, { compactOrdinaryHistory: true }));
    return receipt;
  }
  continueAgentTurn(jobId, token, options) {
    const startedAt = performance.now();
    try {
    return this.#transaction(() => { const { row, state, plan } = this.#agentJobAtHead(jobId, token);
      if (![2, 3, 4, 5, 6, 7].includes(plan.version)) fail('INVALID_AGENT_JOB', '非分阶段任务。');
      const hostFlag = options && typeof options === 'object' && !isProxy(options)
        ? Object.getOwnPropertyDescriptor(options, 'hostScenePresentation') : undefined;
      const hostReview = hostFlag?.enumerable && Object.hasOwn(hostFlag, 'value') && hostFlag.value === 'host@1'
        && plan.novelScenePresentationVersion !== 1 && requiresInitialBoundaryReview(adjudicationPolicy(plan)) && plan.outputContractVersion === 1
        && this.#agentJobs.tasks(row).some(task => task.id === 'scene' && !task.result);
      if (options !== undefined && (![6, 7].includes(plan.version) || !options || typeof options !== 'object' || isProxy(options)
        || Object.getPrototypeOf(options) !== Object.prototype || Reflect.ownKeys(options).length !== 1
        || !(hostReview ? true : Object.getOwnPropertyDescriptor(options, 'stopNewNpcBeats')?.value === true
          && Object.getOwnPropertyDescriptor(options, 'stopNewNpcBeats')?.enumerable))) {
        fail('INVALID_AGENT_JOB', '场景执行预算指令不符合当前修订。');
      }
      if (usesOrdinaryAdmission32(plan.executionRevision?.revisionId)) this.#agentJobs.assertOrdinaryDeadline(row);
      if (plan.version === 7) this.#agentJobs.reserveContinuation(row, token);
      return this.#prepareNarrativeStage(row, state, plan, token, options); }, { reuseVerifiedCommitBytes: true, reuseRelationshipProjection: true, reuseExactPlanReads: true });
    } finally { v0Timing('continueAgentTurn', startedAt); }
  }
  #assertInitialPolicyTask(row, state, plan, task, completionRead) {
    const expected = completionRead ? completionRead.initialPolicy() : this.#domain.initialRunPolicy(state);
    assertInitialRunPolicy(plan.initialRunPolicy, expected);
    const relevant = ['intent_parser', 'player_performance', 'narrator', 'scene_composer', 'world_adjudicator'].includes(task.role);
    assertInitialRunPolicy(task.context?.data?.initialRunPolicy, relevant ? expected : undefined);
    const relationship = isRelationshipRuntime(plan) && task.role !== 'director';
    if (relationshipContextPin(task.context || {}).relationshipContextVersion !== (relationship ? 1 : undefined)) fail('INVALID_AGENT_JOB');
    if (['roleplay', 'character_data'].includes(task.role)) assertInitialRunPolicy(task.context?.initialRunPolicy, relationship ? expected : undefined);
    if (task.role === 'world_adjudicator') {
      const packet = buildServiceTaskContext(task.context);
      const boundaryReview = task.id === INITIAL_BOUNDARY_REVIEW_SLOT && requiresInitialBoundaryReview(adjudicationPolicy(plan));
      const runBoundary = ['intent', INITIAL_BOUNDARY_REVIEW_SLOT].includes(task.id) ? effectiveAdjudicationData(plan).runBoundary : undefined;
      if (!isDeepStrictEqual(task.context.data.runBoundary, runBoundary)) fail('INVALID_AGENT_JOB');
      if (boundaryReview && !isDeepStrictEqual(packet.data.proposed, initialBoundaryReviewProposal(completionRead?.tasks ?? this.#agentJobs.tasks(row)))) fail('INVALID_AGENT_JOB');
      if (expected === undefined || (!boundaryReview && task.id !== 'intent' && !(plan.version === 7 && task.id === SOFT_SLOT)) || task.actorId !== WORLD_SERVICE_PRINCIPAL
        || ![RP_FOUNDATION_RUNTIME_REVISION, RELATIONSHIP_RUNTIME_REVISION, INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(plan.executionRevision?.revisionId)
        || packet.data.viewpointActorId !== row.actor_id || (!boundaryReview && task.id !== SOFT_SLOT && packet.data.rawInput !== row.text)
        || !isDeepStrictEqual(packet.scope, { principalId: WORLD_SERVICE_PRINCIPAL, branchId: row.branch_id,
          generation: row.generation, revision: row.base_revision })) fail('INVALID_AGENT_JOB');
    } else if (expected !== undefined && task.id === 'intent') fail('INVALID_AGENT_JOB');
  }
  #assertIntentPerformance(row, state, plan, task, token, completionRead) {
    const index = task.id === 'performance' ? 0 : /^performance:[12]$/u.test(task.id) ? Number(task.id.at(-1)) : -1;
    const tasks = completionRead?.tasks ?? this.#agentJobs.tasks(row);
    const classified = tasks.find(entry => entry.id === 'intent')?.result;
    const intentPlan = this.#resolvedIntentPlan(state, plan, classified);
    if (!intentPlan || index < 0 || !intentPlan.steps[index]) fail('INVALID_AGENT_JOB');
    let source = this.#intentSourceSnapshot(state, plan);
    let intent = this.#perceivedIntent(state, plan, classified);
    if (index) {
      const replay = this.#sceneBeatReplay(row, state, plan, intent, tasks.find(entry => entry.id === 'performance')?.result, undefined, tasks, token, { beforePlayerStep: index });
      const tail = replay.intentTail;
      if (tail?.next?.index !== index) fail('INVALID_AGENT_JOB', '该后续步骤尚未满足宿主执行条件。');
      source = tail.prefix.draft; intent = tail.next.intent;
    }
    const currentScene = causalPlayerScene(source);
    // First-step issuance used the sealed plan's readable projection. Preserve
    // that exact historical carrier shape; later steps still use live replay.
    if (index === 0) currentScene.readable = structuredClone(plan.scene.readable);
    const perception = playerPerceivedScene(source, currentScene);
    if ([2, 3].includes(plan.ordinaryAddressVersion)) {
      Object.assign(perception.scene, this.#playerReplyContext(source, createdPlayerId(source), perception, plan));
    }
    const data = task.context.data;
    const expectedIntent = { ...projectPerceivedIntent(intent, perception.targetIds) };
    if (plan.hostCaseChoiceVersion === 1 && data.statementReaction) delete expectedIntent.playerText;
    const raw = intentPlan.steps[index].text;
    const sequence = index === 0 ? dialogueSequencePerformance(raw, perception.scene, expectedIntent, plan.ordinaryDialogueSequenceVersion) : null;
    if (data.rawInput !== (sequence?.rawInput ?? raw) || !isDeepStrictEqual(data.intent, expectedIntent)
      || !isDeepStrictEqual(data.dialogueSequence, sequence?.dialogueSequence)
      || data.ordinaryDialogueSequenceVersion !== sequence?.ordinaryDialogueSequenceVersion) fail('INVALID_AGENT_JOB');
    const scene = plan.materialProseVersion === 2 || plan.physicalFactsVersion === 2
      ? this.#materialScene(row, source, plan, data.intent) : perception.scene;
    if (!isDeepStrictEqual(data.scene, scene)) fail('INVALID_AGENT_JOB', '玩家演绎不是该授权步骤的真实前缀。');
    const expected = this.#materialTaskData(row, source, plan, 'player_performance', data);
    if (!isDeepStrictEqual(data.materialProseBoundaries, expected.materialProseBoundaries)) fail('INVALID_AGENT_JOB');
  }
  #openOrientationIntentProof(state,player,text,policy) {
    if (state.completed || hasCaseOne(state) || activeProcedure(state) || state.guardReaction?.pending || state.guardReaction?.detention
      || state.caseRuntime?.occupiedBody || !runtimeActive(state,player) || actorForState(state,player)?.communication!=='speech'
      || requiresInitialBoundaryReview(adjudicationPolicy(policy))
      || !recentOpenWaitQuestion(state,player,roomGroupSpeechAudience(state))) return null;
    return ordinaryLocalAmbientSpeechSource(text,this.#observedOrientationScene(state,player).scene,4);
  }
  #hostReadinessIntentProof(state,player,text,policy) {
    if (state.completed || hasCaseOne(state) || activeProcedure(state) || state.guardReaction?.pending || state.guardReaction?.detention
      || state.caseRuntime?.occupiedBody || !runtimeActive(state,player) || actorForState(state,player)?.communication!=='speech'
      || requiresInitialBoundaryReview(adjudicationPolicy(policy))) return null;
    const {scene,targetIds}=this.#observedOrientationScene(state,player);
    const proof=proveReadinessHostIntent({rawInput:text,scene,viewpointActorId:player});
    const peer=proof && (targetIds[proof.person.targetId]??proof.person.targetId);
    return peer && runtimeActive(state,peer) && runtimeRoom(state,peer)===runtimeRoom(state,player)
      && acquisitionAudience(state,player,{delivery:'speech',targetId:peer}).includes(peer) ? proof : null;
  }
  #playerReplyContext(state, player, { scene, targetIds }, plan) {
    if (plan.ordinaryDialogueSequenceVersion===8) return ordinaryLocalStairReplyContext(state,player,scene,targetIds);
    return [6,7].includes(plan.ordinaryDialogueSequenceVersion) || plan.localTravelAttemptVersion===2 ? ordinaryLocalPointReplyContext(state, player, scene, targetIds)
      : ordinaryReplyContext(state, player, scene, targetIds, plan.ordinaryAddressVersion);
  }
  #localPointReplySequence(state, player, raw, version=6) {
    const current = playerPerceivedScene(state, causalPlayerScene(state));
    const reply=version===8 ? ordinaryLocalStairReplyContext : ordinaryLocalPointReplyContext;
    Object.assign(current.scene, reply(state, player, current.scene, current.targetIds));
    return ordinaryDialogueSequence(raw, current.scene, undefined, version);
  }
  #observedOrientationScene(state, player) {
    const current = playerPerceivedScene(state, causalPlayerScene(state));
    Object.assign(current.scene, ordinaryReplyContext(state, player, current.scene, current.targetIds, 3));
    return current;
  }
  #boundLocalSpeechSequence(state, player, raw) {
    const scene = causalPlayerScene(state), current = playerPerceivedScene(state, scene);
    Object.assign(current.scene, ordinaryReplyContext(state, player, current.scene, current.targetIds, 3));
    if (!runtimeActive(state, player) || actorForState(state, player)?.communication !== 'speech') return null;
    const proof = ordinaryDialogueSequence(raw, current.scene, undefined, 4), hearers = roomGroupSpeechAudience(state, scene);
    return proof && hearers.length >= 3 && proof.parts.every(({ targetId, memberId }) => {
      const id = targetId ?? memberId;
      return !id || hearers.includes(current.targetIds[id] ?? id);
    }) ? proof : null;
  }
  #roomShiftDialogueSequence(state, player, raw) {
    const scene = causalPlayerScene(state), current = playerPerceivedScene(state, scene);
    Object.assign(current.scene, ordinaryReplyContext(state, player, current.scene, current.targetIds, 3));
    const proof = ordinaryDialogueSequence(raw, current.scene, undefined, 3);
    if (!proof || !runtimeActive(state, player) || actorForState(state, player)?.communication !== 'speech') return null;
    const peer = current.targetIds[proof.targetId] ?? proof.targetId;
    const audible = roomGroupSpeechAudience(state, scene);
    return audible.includes(peer) && audible.includes(proof.roomMemberId) ? proof : null;
  }
  #localDialogueSequence(state, player, raw) {
    const current = playerPerceivedScene(state, causalPlayerScene(state));
    Object.assign(current.scene, ordinaryReplyContext(state, player, current.scene, current.targetIds, 3));
    // Keep already-authenticated V1 inputs on the same byte-for-byte lane.
    if (ordinaryDialogueSequence(raw, current.scene, current.scene.replyPeer, 1)) return null;
    const sequence = ordinaryDialogueSequence(raw, current.scene, undefined, 2);
    if (!sequence || !runtimeActive(state, player) || !runtimeActive(state, sequence.targetId)
      || runtimeRoom(state, player) !== sequence.roomId || runtimeRoom(state, sequence.targetId) !== sequence.roomId
      || !acquisitionAudience(state, player, { delivery: 'speech', targetId: sequence.targetId }).includes(sequence.targetId)) return null;
    return sequence;
  }
  #assertMaterialTask(row, state, plan, task, token, completionRead) {
    return withRunBoundary(state, plan.runPolicyConsumersVersion === 1 ? plan.effectiveRunPolicy : undefined, () => this.#assertScopedMaterialTask(row, state, plan, task, token, completionRead));
  }
  #assertScopedMaterialTask(row, state, plan, task, token, completionRead) {
    this.#assertInitialPolicyTask(row, state, plan, task, completionRead);
    if (task.id === 'intent' && task.role === 'world_adjudicator' && [2, 3].includes(plan.ordinaryAddressVersion)) {
      const source = this.#intentSourceSnapshot(state, plan);
      const perception = playerPerceivedScene(source, plan.scene);
      const detail = this.#playerReplyContext(source, row.actor_id, perception, plan);
      if (task.context.data.scene.replyPeer !== detail.replyPeer || task.context.data.scene.replyAddress !== detail.replyAddress) fail('INVALID_AGENT_JOB');
      if (plan.ordinaryLocalSearchConversationVersion===1 && (!localSearchConversationDomain(row.text) || !isDeepStrictEqual(
        ordinaryLocalSearchSource(row.text,this.#observedOrientationScene(source,row.actor_id).scene),
        ordinaryLocalSearchSource(row.text,task.context.data.scene)))) fail('INVALID_AGENT_JOB');
       const ambientVersion=plan.ordinaryLocalAmbientSpeechVersion;
       if ([1,2,3].includes(ambientVersion) && (!localAmbientSpeechDomain(row.text,ambientVersion) || ambientVersion===2
         && !recentLocalWaitProposal(source,row.actor_id,roomGroupSpeechAudience(source)) || ambientVersion===3
         && roomGroupSpeechAudience(source).length<3 || !isDeepStrictEqual(
         ordinaryLocalAmbientSpeechSource(row.text,this.#observedOrientationScene(source,row.actor_id).scene,ambientVersion),
         ordinaryLocalAmbientSpeechSource(row.text,task.context.data.scene,ambientVersion)))) fail('INVALID_AGENT_JOB');
       if (ambientVersion===4) {
          const proof=this.#openOrientationIntentProof(source,row.actor_id,row.text,plan);
          if (!proof || !isDeepStrictEqual(proof,ordinaryLocalAmbientSpeechSource(row.text,task.context.data.scene,4))) fail('INVALID_AGENT_JOB');
        }
        const approachVersion=plan.ordinaryLocalApproachVersion;
       if ([1,2,3].includes(approachVersion) && (!localApproachDomain(row.text,approachVersion) || !isDeepStrictEqual(
         ordinaryLocalApproachSource(row.text,this.#observedOrientationScene(source,row.actor_id).scene,approachVersion),
         ordinaryLocalApproachSource(row.text,task.context.data.scene,approachVersion)))) fail('INVALID_AGENT_JOB');
      if (plan.localReadinessHostIntentVersion===1) {
         const proof=this.#hostReadinessIntentProof(source,row.actor_id,row.text,plan);
         if (!proof || !isDeepStrictEqual(proof,proveReadinessHostIntent(task.context.data))) fail('INVALID_AGENT_JOB');
       }
       const sequenceVersion = plan.ordinaryDialogueSequenceVersion;
      if ([6,7,8].includes(sequenceVersion)) {
         const proof = this.#localPointReplySequence(source, row.actor_id, row.text, sequenceVersion);
         if (!proof || !isDeepStrictEqual(proof, ordinaryDialogueSequence(row.text, task.context.data.scene, undefined, sequenceVersion))) fail('INVALID_AGENT_JOB');
       }
       if (sequenceVersion === 5) {
        const { scene } = this.#observedOrientationScene(source, row.actor_id);
        if (!observedOrientationSequenceDomain(row.text) || actorForState(source, row.actor_id)?.communication !== 'speech'
          || !isDeepStrictEqual(ordinaryDialogueSequence(row.text, scene, undefined, 5),
            ordinaryDialogueSequence(row.text, task.context.data.scene, undefined, 5))) fail('INVALID_AGENT_JOB');
      }
      if ([2, 3, 4].includes(sequenceVersion)) {
        const proof = sequenceVersion === 4 ? this.#boundLocalSpeechSequence(source, row.actor_id, row.text)
          : sequenceVersion === 3 ? this.#roomShiftDialogueSequence(source, row.actor_id, row.text)
          : this.#localDialogueSequence(source, row.actor_id, row.text);
        if (!proof || !isDeepStrictEqual(proof, ordinaryDialogueSequence(row.text, task.context.data.scene, undefined, sequenceVersion))) fail('INVALID_AGENT_JOB');
      }
    }
    if (task.id === SOFT_SLOT) {
      const tasks = completionRead?.tasks ?? this.#agentJobs.tasks(row), output = id => tasks.find(task => task.id === id)?.result;
      const intent = this.#perceivedIntent(state, plan, output('intent'));
      const replay = this.#sceneBeatReplay(row, state, plan, intent, output('performance'), undefined, tasks, token);
      const expected = this.#captureOrdinaryAttempt(row, state, plan, replay.prefix, tasks);
      if (!expected || !isDeepStrictEqual(expected.manifest, task.manifest)
        || !isDeepStrictEqual(expected.attempt, task.context.data.attempt)
        || !isDeepStrictEqual(expected.sources, task.context.data.sources)
        || !isDeepStrictEqual(expected.scriptSpeakers, task.context.data.scriptSpeakers)
        || !isDeepStrictEqual(expected.manifest.prefix, task.context.data.prefix)) fail('INVALID_AGENT_JOB');
      return;
    }
    if (task.id === INITIAL_BOUNDARY_REVIEW_SLOT) return;
    this.#assertBallotTask(row, state, plan, task);
    if ([1, 2].includes(plan.intentContractVersion) && task.role === 'player_performance') return this.#assertIntentPerformance(row, state, plan, task, token, completionRead);

    if (plan.postureActionVersion === 1 && ['intent_parser', 'world_adjudicator', 'player_performance'].includes(task.role)) {
      if (task.context.data.rawInput !== row.text || !isDeepStrictEqual(task.context.data.postureActions,
        runtimePoseActions(this.#itemPolicySnapshot(state, plan), row.actor_id))) fail('INVALID_AGENT_JOB', '姿势菜单不是封存起点的本人支撑物。');
    }
    if (!(plan.materialProseVersion === 2 || plan.physicalFactsVersion === 2)
      || !['player_performance', 'scene_composer'].includes(task.role)) return;
    const data = task.context.data;
    const allTasks = completionRead?.tasks ?? this.#agentJobs.tasks(row);
    const resolvedIntent = this.#perceivedIntent(state, plan, plan.intentHint.type === 'interpret'
      ? allTasks.find(entry => entry.id === 'intent')?.result : plan.intentHint);
    const perceived = projectPerceivedIntent(resolvedIntent,
      playerPerceivedScene(this.#itemPolicySnapshot(state, plan), plan.scene).targetIds);
    let authorizedIntent;
    if (task.role === 'player_performance') {
      const planning = this.#itemPolicySnapshot(state, plan); const command = parseTestimonyCommand(row.text);
      const reaction = hasCaseRuntime(planning) ? procedureStatementReaction(planning, command)
        : hasCaseOne(planning) ? caseStatementReaction(planning, command) : null;
      const { playerText, ...gesture } = perceived;
      authorizedIntent = reaction ? gesture : perceived;
      if (data.rawInput !== row.text) fail('INVALID_AGENT_JOB', '玩家输入不是封存的原始选择。');
    } else authorizedIntent = { type: resolvedIntent.type,
      ...(resolvedIntent.operation ? { operation: resolvedIntent.operation } : {}),
      ...(resolvedIntent.subjectId ? { subjectId: resolvedIntent.subjectId } : {}),
      ...(resolvedIntent.targetId ? { targetId: perceived.targetId } : {}) };
    if (!isDeepStrictEqual(data.intent, authorizedIntent)) fail('INVALID_AGENT_JOB', '物质目标不是宿主授权的选择。');
    if (Object.hasOwn(data, 'materialProseFacts') || Object.hasOwn(data, 'knownMaterials')) fail('INVALID_AGENT_JOB', '未封存的物质来源。');
    let after = state; let eventSnapshots;
    if (task.role === 'scene_composer') {
      const tasks = allTasks; const output = id => tasks.find(entry => entry.id === id)?.result;
      const intent = this.#perceivedIntent(state, plan, plan.intentHint.type === 'interpret' ? output('intent') : plan.intentHint);
      const ballots = intent.operation === 'vote' ? Object.fromEntries(tasks.filter(entry => entry.id.startsWith('ballot:'))
        .map(entry => [entry.actorId, entry.result.ballot.candidateId])) : undefined;
      let settled;
      if ([6, 7].includes(plan.version)) {
        const replay = this.#sceneBeatReplay(row, state, plan, intent, output('performance'), ballots, tasks, token);
        settled = finalizeCausalScene(replay.prefix, replay.action);
        const snapshots = this.#materialIntermediates(row, state, plan, intent, settled, replay.materialPrefixes);
        if (snapshots.length) eventSnapshots = snapshots;
      } else {
        const action = { type: 'scene', ...dialogueContextPin(plan), ...sceneExtensionPin(plan), jobId: row.job_id,
          rawInput: row.text, intent, performance: output('performance'), questionKey: plan.questionKey, answerKey: plan.answerKey,
          ...(output('npc') ? { response: output('npc') } : {}), ...(ballots ? { ballots } : {}),
          ...Object.fromEntries(['roomLabelVersion', 'worldVersion', 'performanceVersion', 'storyArcVersion', 'guardRules',
            'itemPolicyVersion', 'caseActionTimingVersion'].filter(key => plan[key] !== undefined).map(key => [key, plan[key]])),
          decisionVersion: 1, decisions: tasks.filter(entry => entry.id.startsWith('npc:')).map(entry => ({ actorId: entry.actorId, proposal: entry.result })),
          ...(plan.version === 5 ? { causalVersion: 1, ...(plan.causalTimingVersion === 1 ? { causalTimingVersion: 1 } : {}) } : {}) };
        settled = sceneActionDraft(state, action);
      }
      after = settled.draft;
      if (!isDeepStrictEqual(data.events, settled.publicEvents)
        || !isDeepStrictEqual(data.eventTimeline, sceneEventTimeline(state, after, settled.events, settled.publicEvents)))
        fail('INVALID_AGENT_JOB', '物质事件不属于封存的宿主前缀。');
    }
    if (!isDeepStrictEqual(data.materialProseEventSnapshots, eventSnapshots)) fail('INVALID_AGENT_JOB', '中间快照不属于真实归约前缀。');
    const expected = this.#materialTaskData(row, state, plan, task.role, data, after);
    for (const key of ['postureSettlement', 'materialProseBoundaries', ...(task.role === 'player_performance' ? ['scene'] : ['sceneBefore', 'sceneAfter'])])
      if (!isDeepStrictEqual(data[key], expected[key])) fail('INVALID_AGENT_JOB', '物质快照不属于当前任务的真实来源。');
  }
  #assertBallotTask(row, state, plan, task, historical = false) {
    const relevant = ['player_performance', 'scene_composer'].includes(task.role);
    const data = task.context?.data;
    if (plan.ballotInstrumentVersion === undefined) {
      if (data && (Object.hasOwn(data, 'ballotInstrumentVersion') || Object.hasOwn(data, 'ballotInstrumentSource'))) fail('INVALID_AGENT_JOB');
      return;
    }
    if (!relevant) return;
    const expected = this.#domain.ballotInstrumentSource(state, { ownerId: row.actor_id, intent: plan.intentHint,
      operationRef: row.job_id, historical: historical || Boolean(plan.regeneration) });
    if (data.ballotInstrumentVersion !== 1 || !isDeepStrictEqual(data.ballotInstrumentSource, expected)
      || !isDeepStrictEqual({ type: data.intent.type, operation: data.intent.operation, subjectId: data.intent.subjectId }, expected.context.intent)) fail('INVALID_AGENT_JOB', '投票器具来源不是本人当前已取得的规则。');
  }
  assertAgentTask(jobId, slot, token, deliveredContext) {
    return this.#transaction(() => {
      const { row, state, plan } = this.#agentJobAtHead(jobId, token);
      const task = this.#agentJobs.tasks(row).find(entry => entry.id === slot);
      if (isPrivateDirectorPacket(task?.context) && !this.#privateDirectorEnabled()) fail('LLM_NOT_CONFIGURED');
      const expectedContext = task?.role === 'world_adjudicator' ? buildServiceTaskContext(task.context) : task?.context;
      if (!task || !isDeepStrictEqual(expectedContext, deliveredContext)) fail('INVALID_AGENT_JOB', '交付任务与封存任务不同。');
      this.#assertMaterialTask(row, state, plan, task, token);
    }, { readOnly: true, reuseVerifiedCommitBytes: true });
  }
  #validateNarrativeTask(task, output, sceneRecoveryNarrationVersion) {
    if (task.role === 'roleplay') {
      const decision = validateRoleplayDecision(buildRoleplayContext(task.context, { maxBytes: task.maxBytes }), output, task.context.scope);
      validateNpcHostTextEnvelope(decision, task);
      if (task.context.decisionContext) assertActorPerformance({ decision, observations: task.context.observations,
        participants: task.context.situation.participants, persona: task.context.persona,
        performancePolicy: task.context.performancePolicy, addressVoice: task.context.addressVoice });
      return decision;
    }
    if (task.role === 'director') return validateDirectorOutput(buildDirectorContext(task.context), output, task.context.scope);
    if (task.role === 'character_data') return validateCharacterDataProposal(buildCharacterDataContext(task.context, { maxBytes: task.maxBytes }), output, task.context.scope);
    if (task.role === 'world_adjudicator') return validateServiceTaskOutput(task.context, output);
    const validated = validateNarrativeOutput(buildNarrativeContext(task.context), output, task.context.scope, { sceneRecoveryNarrationVersion });
    if (task.context.data.contractVersion === 4) {
      if (task.role === 'player_performance') assertPlayerPerformance({ ...task.context.data, performance: validated });
      if (task.role === 'scene_composer') assertSceneProse({ ...task.context.data, document: validated });
    }
    return validated;
  }
  #publishRegenerationBase(checkpoint, turnId) {
    // Called only inside completeAgentTurn's transaction, after every model
    // stage validates. The backup, fork, action, cognition, receipt and outbox
    // commit together; any failure rolls ALL of them back to the original head.
    const current = this.#state(); const id = randomUUID();
    this.#db.prepare('INSERT INTO prologue_saves(id,name,state) VALUES(?,?,?)').run(id, '重新生成前自动备份', JSON.stringify(current));
    this.#bindSlot(id, 1, current);
    const restored = structuredClone(checkpoint);
    if (current.playerAvatarId) restored.playerAvatarId = current.playerAvatarId;
    else delete restored.playerAvatarId;
    restored.restoredFrom = { generation: restored.generation, revision: restored.revision };
    restored.generation = current.generation + 1; restored.revision = current.revision + 1;
    // This intermediate fork belongs to the still-running regeneration job.
    // Seal its result first, then cancel other obsolete jobs in the SAME tx.
    this.#write(restored, 'rewind', { cancelObsolete: false });
    if (restored.exampleId === 'agent') this.#dice.restoreTurn(turnId, this.#domain.scope(restored), { reroll: false });
    return restored;
  }
  #completeNarrativeTurn(row, state, plan, token, { hostScenePresentation = false } = {}) {
    if (hostScenePresentation && (plan.novelScenePresentationVersion === 1 || ![6, 7].includes(plan.version))) fail('INVALID_AGENT_JOB', '当前叙事修订不支持宿主场景呈现。');
    if ([6, 7].includes(plan.version)) return this.#completeSceneBeatTurn(row, state, plan, token, { hostScenePresentation });
    const tasks = this.#agentJobs.tasks(row); const result = id => tasks.find(task => task.id === id)?.result;
    const intent = this.#perceivedIntent(state, plan, plan.intentHint.type === 'interpret' ? result('intent') : plan.intentHint);
    const sceneTurn = [3, 4, 5].includes(plan.version);
    if (!intent || !result('performance') || !(sceneTurn ? result('scene') : result('narrator'))
      || (![4, 5, 6, 7].includes(plan.version) && intent.targetId && (!result('npc') || !result('data')))) fail('INVALID_AGENT_OUTPUT', '叙事阶段尚未完整完成。');
    for (const task of tasks) { if (!task.result) fail('INVALID_AGENT_OUTPUT', '任务尚未完成。');
      this.#assertMaterialTask(row, state, plan, task, token); this.#validateNarrativeTask(task, task.result); }
    const voterIds = intent.operation === 'vote' ? (hasCaseOne(state) ? state.caseOne.voterIds : procedureVoterIds(state)).filter(id => id !== createdPlayerId(state)) : [];
    if (voterIds.some(id => !result(`ballot:${id}`)?.ballot)) fail('INVALID_AGENT_OUTPUT', '尚未收齐全部合法选票，未计票或代投。');
    const base = { ...sceneExtensionPin(plan), jobId: row.job_id, rawInput: row.text, intent, performance: result('performance'),
      ...(voterIds.length ? { ballots: Object.fromEntries(voterIds.map(id => [id, result(`ballot:${id}`).ballot.candidateId])) } : {}),
      ...(result('npc') ? { response: result('npc') } : {}), questionKey: plan.questionKey, answerKey: plan.answerKey,
      ...(plan.roomLabelVersion !== undefined ? { roomLabelVersion: plan.roomLabelVersion } : {}),
      ...(plan.performanceVersion !== undefined ? { performanceVersion: plan.performanceVersion } : {}),
      ...(plan.storyArcVersion !== undefined ? { storyArcVersion: plan.storyArcVersion } : {}),
        ...(plan.guardRules ? { guardRules: structuredClone(plan.guardRules) } : {}),
      ...(plan.worldVersion !== undefined ? { worldVersion: plan.worldVersion } : {}),
      ...(plan.itemPolicyVersion !== undefined ? { itemPolicyVersion: plan.itemPolicyVersion } : {}),
      ...(plan.caseActionTimingVersion !== undefined ? { caseActionTimingVersion: plan.caseActionTimingVersion } : {}),
      ...([4, 5, 6, 7].includes(plan.version) ? { decisionVersion: 1, decisions: tasks.filter(task => task.id.startsWith('npc:')).map(task => ({ actorId: task.actorId, proposal: task.result })) } : {}),
      ...(plan.version === 5 ? { causalVersion: 1, ...(plan.causalTimingVersion === 1 ? { causalTimingVersion: 1 } : {}) } : {}) };
    if (sceneTurn) {
      const { publicEvents } = sceneActionDraft(state, { type: 'scene', ...base });
      if (sceneNeedsRepair(result('scene'), publicEvents, { style: plan.styleVersion === 1, outputContractVersion: plan.outputContractVersion, antiClicheVersion: plan.antiClicheVersion }) && !result('scene-repair')) fail('INVALID_AGENT_OUTPUT', '场景正文修订尚未完成。');
    }
    const action = sceneTurn ? { type: 'scene', ...base, document: result('scene-repair') || result('scene') }
      : { type: 'narrative', jobId: row.job_id, rawInput: row.text, intent, performance: result('performance'),
        ...(result('npc') ? { response: result('npc') } : {}), narration: result('narrator').text, questionKey: plan.questionKey, answerKey: plan.answerKey };
    // Regeneration changes execution head before record. This first opt-in
    // slice explicitly refuses it instead of treating a checkpoint as current.
    if (plan.ballotInstrumentVersion === 1 && plan.regeneration) fail('INVALID_AGENT_JOB', '投票器具扩展尚不支持重新生成。');
    const next = structuredClone(state);
    setSceneStageClocks(next, this.#sceneStageClocksFor(action));
    try { applyAgentAction(next, action); }
    finally { setSceneStageClocks(next, null); }
    const records = ![4, 5, 6, 7].includes(plan.version) && intent.targetId ? [{ ownerId: intent.targetId, kind: 'memory',
      summary: `记得眼前的人${action.performance.utterance ? actorForState(state, createdPlayerId(state)).communication === 'writing' ? '向我写道（陈述未核实）' : '向我说（陈述未核实）' : '作出可见动作'}：${(action.performance.utterance || action.performance.action).slice(0, 900)}`,
      sourceObservationIds: [`${plan.questionKey}:${intent.targetId}`] }] : [];
    const decisionStates = [];
    let adoptedSubjective = 0; let deferredSubjective = 0;
    const consideredActors = plan.version === 5 ? new Set((next.agentAutonomy?.decisions || [])
      .slice(state.agentAutonomy?.decisions?.length || 0).map(decision => decision.actorId)) : null;
    if ([4, 5, 6, 7].includes(plan.version)) for (const task of tasks.filter(task => task.id.startsWith('npc:')
      && (!consideredActors || consideredActors.has(task.actorId)))) {
      const initial = this.#decisionStateAt(row, state, plan, task.actorId);
      const observations = [...new Map([
        ...this.#decisionSourcesAt(row, state, plan, task.actorId, { includeArchive: true }),
        ...task.context.observations,
      ].map(observation => [observation.id, observation])).values()];
      const reviewed = reviewDecisionState(initial, task.result.stateUpdates || [], {
        observations, worldTime: next.worldTime,
        allowedTargets: task.context.situation.perceivedParticipants,
      });
      // A due goal is reviewed at most once per shared-time decision beat.
      for (const goal of reviewed.state.goals) if (goal.reviewAt <= next.worldTime) goal.reviewAt = next.worldTime + 30;
      decisionStates.push({ ownerId: task.actorId, state: reviewed.state });
      adoptedSubjective += Array.isArray(reviewed.adopted) ? reviewed.adopted.length : reviewed.adopted;
      deferredSubjective += Array.isArray(reviewed.deferred) ? reviewed.deferred.length : reviewed.deferred;
      const sourceIds = task.context.observations.filter(observation => observation.id.endsWith(`:${task.actorId}`)
        && (observation.id.startsWith(`question:${row.job_id}:`) || observation.id.startsWith(`gesture:${row.job_id}:`))).map(observation => observation.id);
      if (sourceIds.length) records.push({ ownerId: task.actorId, kind: 'memory',
        summary: `本轮亲身交流记录（陈述未核实）：${task.context.observations.filter(row => sourceIds.includes(row.id)).map(row => row.text).join(' / ').slice(0, 900)}`,
        sourceObservationIds: sourceIds });
    }
    const before = plan.regeneration ? this.#publishRegenerationBase(state, plan.regeneration.turnId) : state;
    if (plan.regeneration) {
      next.generation = before.generation; next.revision = before.revision + 1;
      next.restoredFrom = before.restoredFrom;
      if (before.playerAvatarId) next.playerAvatarId = before.playerAvatarId;
      else delete next.playerAvatarId;
    }
    const turnId = randomUUID(); next.turnIds.push(turnId);
    this.#insertTurn(turnId, row.text, before, next);
    this.#write(next, 'act', { action: { intentKey: this.#domain.intentKey(before, row.text) }, records, decisionStates });
    if (hasCaseOne(next) && next.caseOne.stage === 'execution_ready') {
      const saveId = randomUUID();
      this.#db.prepare('INSERT INTO prologue_saves(id,name,state) VALUES(?,?,?)').run(saveId, '第一案处刑前自动存档', JSON.stringify(next));
      this.#bindSlot(saveId, 1, next);
    } else if (activeProcedure(next)?.stage === 'execution_ready' && activeProcedure(state)?.verdict?.id !== activeProcedure(next).verdict.id) {
      const saveId = randomUUID();
      this.#db.prepare('INSERT INTO prologue_saves(id,name,state) VALUES(?,?,?)').run(saveId, '案件处刑前自动存档', JSON.stringify(next));
      this.#bindSlot(saveId, 1, next);
    }
    const receipt = this.#agentReceipt({ requestId: row.request_id }, next, true, plan.regeneration
      ? '这一轮已重新生成并切换到新分支，旧轮次及其后续不再参与当前剧情。原进度已自动备份。'
      : '行动已展开，等待你的下一次选择。');
    this.#rememberAgentReceipt({ requestId: row.request_id, text: row.text }, next, receipt);
    this.#agentJobs.commit(row, token, { review: { policy: [4, 5, 6, 7].includes(plan.version) ? 'subjective-owner-local@4' : sceneTurn ? 'scene-literal-only@3' : 'narrative-literal-only@2', adoptedHostMemories: records.length,
      ...([4, 5, 6, 7].includes(plan.version) ? { adoptedSubjective, deferredSubjective, npcDecisions: decisionStates.length } : {}),
      deferredProposalCount: result('data')?.updates.length || 0,
      ...(sceneTurn ? { scene: sceneSummary(next.entries.slice(state.entries.length), action.document.stopReason, action),
        compositionRepairs: result('scene-repair') ? 1 : 0 } : {}) }, turnId, receipt });
    if (plan.regeneration) this.#agentJobs.cancelObsolete(this.#domain.scope(next));
    return receipt;
  }
  agentStatus() {
    return this.#transaction(() => {
      return projectPublicAgentStatus(this.#state(), this.#agentJobs);
    }, { readOnly: true });
  }
  #agentJobAtHead(jobId, token, sceneRecovery = false) {
    const row = this.#agentJobs.get(jobId); const plan = this.#agentJobs.assertLease(row, token);
    if (!sceneRecovery && this.#agentJobs.hasSceneRecovery(row)) fail('INVALID_SCENE_RECOVERY', '此租约仅可用于旁白恢复。');
    const state = this.#state(); const scope = this.#domain.scope(state);
    if (state.exampleId !== 'agent' || row.generation !== state.generation || row.base_revision !== state.revision || row.branch_id !== scope.branchId) fail('STALE_AGENT_TURN', '角色任务已过期，未提交迟到结果。');
    assertRuntimeJobRevision(plan.regeneration ? plan.regeneration.checkpoint : state, plan);
    if (plan.regeneration && !state.turnIds.includes(plan.regeneration.turnId)) fail('STALE_AGENT_TURN', '原楼层已不在当前路径中。');
    return { row, state: plan.regeneration ? plan.regeneration.checkpoint : state, plan };
  }
  #validateAgentOutput(row, plan, role, output) {
    const task = plan.tasks.find(task => task.role === role);
    if (!task) fail('INVALID_AGENT_OUTPUT', '角色任务类型不合法。');
    if (role === 'roleplay') {
      const decision = validateRoleplayDecision(buildRoleplayContext(task.context, { maxBytes: task.maxBytes }), output, task.context.scope);
      // A bounded intent.description is audit metadata, not an executed action.
      // Only the validated utterance is published by completeAgentTurn.
      if (typeof decision.utterance !== 'string' || decision.utterance.length > 2000
        || (decision.intent && !['speak','write'].includes(decision.intent.type))
        || /[\u0000-\u0008\u000b\u000c\u000e-\u001f<>]/u.test(decision.utterance)) fail('INVALID_AGENT_OUTPUT', '本版本只采纳角色自己的纯文本发言或书写，不采纳动作结果与 HTML。');
      return decision;
    }
    return validateCharacterDataProposal(buildCharacterDataContext(task.context, { maxBytes: task.maxBytes }), output, task.context.scope);
  }
  #assertedAgentNarrativeTask(row, state, plan, slot, token, expectedRole) {
    const task = this.#agentJobs.tasks(row).find(entry => entry.id === slot);
    if (!task || expectedRole && task.role !== expectedRole) fail('INVALID_AGENT_OUTPUT', '叙事子任务不存在。');
    this.#assertMaterialTask(row, state, plan, task, token);
    return task;
  }
  #validatedAgentNarrativeTask(row, state, plan, slot, output, token, expectedRole) {
    const task = this.#assertedAgentNarrativeTask(row, state, plan, slot, token, expectedRole);
    return { task, validated: this.#validateNarrativeTask(task, output) };
  }
  prevalidateAgentSceneCandidate(jobId, output, token) {
    // A length-only alternate must pass the same sealed-source and prose checks
    // as the durable write. It may not publish, renew, or choose the outcome.
    return this.#transaction(() => {
      const { row, state, plan } = this.#agentJobAtHead(jobId, token);
      if (![6, 7].includes(plan.version) || ![2, 3].includes(plan.narrationPacingVersion)) fail('INVALID_AGENT_JOB');
      this.#validatedAgentNarrativeTask(row, state, plan, 'scene', output, token, 'scene_composer');
    }, { readOnly: true, reuseVerifiedCommitBytes: true, reuseExactPlanReads: true });
  }
  recordAgentResult(jobId, role, output, token) {
    const startedAt = performance.now();
    try {
    return this.#transaction(() => {
      const { row, state, plan } = this.#agentJobAtHead(jobId, token);
      if ([2, 3, 4, 5, 6, 7].includes(plan.version)) {
        const { task, validated } = this.#validatedAgentNarrativeTask(row, state, plan, role, output, token);
        this.#agentJobs.saveTaskResult(row, role, [CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(plan.executionRevision?.revisionId) && task.id === 'intent' ? validated : output, token); return;
      }
      this.#validateAgentOutput(row, plan, role, output);
      this.#agentJobs.saveResult(row, role, output, token);
    }, { reuseVerifiedCommitBytes: true, reuseExactPlanReads: true });
    } finally { v0Timing('recordAgentResult', startedAt); }
  }
  // Best-effort host telemetry is fenced independently from game publication.
  // A rejected candidate is recorded AFTER the failed validation transaction,
  // otherwise SQLite rollback would erase the most useful troubleshooting edge.
  recordAgentOptionalTerminal(jobId, slot, token, status, diagnostic) {
    return this.#transaction(() => {
      const { row } = this.#agentJobAtHead(jobId, token);
      this.#agentJobs.terminateOptional(row, slot, token, status, diagnostic);
    });
  }
  recordAgentValidationFailure(jobId, slot, token, diagnostic) {
    return this.#transaction(() => {
      const { row } = this.#agentJobAtHead(jobId, token);
      if (!this.#agentJobs.tasks(row).some(task => task.id === slot)) return;
      this.#agentJobs.trace(row, 'rejected', slot, diagnostic);
      this.#agentJobs.renew(row, token);
    });
  }
  recordAgentTaskFailure(jobId, slot, token, diagnostic) {
    return this.#transaction(() => {
      const { row, plan } = this.#agentJobAtHead(jobId, token);
      const exists = [2, 3, 4, 5, 6, 7].includes(plan.version) ? this.#agentJobs.tasks(row).some(task => task.id === slot)
        : plan.tasks.some(task => task.role === slot);
      if (!exists) return;
      this.#agentJobs.trace(row, 'attempt_failed', slot, diagnostic);
    });
  }
  recordAgentUsage(jobId, slot, metrics, token) {
    return this.#transaction(() => {
      const { row } = this.#agentJobAtHead(jobId, token);
      if (!this.#agentJobs.tasks(row).some(task => task.id === slot)) return;
      this.#agentJobs.trace(row, 'usage', slot, metrics);
      this.#agentJobs.renew(row, token);
    }, { reuseVerifiedCommitBytes: true, reuseExactPlanReads: true });
  }
  renewAgentTurn(jobId, token) {
    return this.#transaction(() => {
      const { row } = this.#agentJobAtHead(jobId, token);
      this.#agentJobs.renew(row, token);
    });
  }
  agentProgress(options = {}) {
    assertPublicAgentProgressOptions(options);
    return this.#transaction(() => {
      const state = this.#state();
      return this.#agentJobs.publicProgress(state, this.#domain.scope(state), options);
    }, { readOnly: true });
  }
  developerTurns() {
    return this.#transaction(() => {
      const state = this.#state();
      return this.#agentJobs.developerTrace(state, this.#domain.scope(state),
        state.exampleId === 'agent' ? runtimeRevisionForState(state).content.fingerprint : null);
    }, { readOnly: true });
  }
  developerTurnContext() {
    return this.#transaction(() => {
      const state = this.#state();
      return this.#agentJobs.developerContext(state, this.#domain.scope(state));
    }, { readOnly: true });
  }
  failAgentTurn(jobId, token, code, diagnostic) {
    return this.#transaction(() => {
      const { row } = this.#agentJobAtHead(jobId, token);
      this.#agentJobs.fail(row, token, code, { ...traceFailure(diagnostic), ...this.#agentJobs.taskSummary(row) });
    });
  }
  completeAgentSceneRecovery(jobId, token, output) {
    return this.#transaction(() => {
      const { row, state, plan } = this.#agentJobAtHead(jobId, token, true);
      const { commitRef } = this.#domain.scope(state);
      const recoveryNarrationVersion = this.#agentJobs.assertSceneRecovery(row, token, commitRef);
      const task = this.#assertedAgentNarrativeTask(row, state, plan, 'scene', token, 'scene_composer');
      const data = task.context.data;
      const { events } = data;
      const { stopReason } = hostSceneDocument(events);
      const packet = buildNarrativeContext(task.context);
      const validate = candidate => validateNarrativeOutput(packet, candidate, task.context.scope, {
        sceneRecoveryNarrationVersion: recoveryNarrationVersion === 3 && data.narrationPacingVersion === 2 ? 3 : undefined,
      });
      let validated = validate(output);
      const final = validated.blocks.at(-1);
      if (data.contractVersion !== 4 || validated.stopReason !== stopReason
        || validated.blocks.slice(0, events.length).some(block => block.type !== 'event')
        || recoveryNarrationVersion === 2 && (validated.blocks.length !== events.length + 1
          || final?.type !== 'narration' || sceneNarrationParagraphs(final.text).length !== 1 || sceneParagraphFeedback(validated, events)))
        fail('INVALID_AGENT_OUTPUT', '旁白恢复必须保留每个已裁决事件和宿主停点。');
      try {
        assertSceneProse({ ...data, document: validated });
      } catch (error) {
        const diagnostic = narrativeGuardDiagnostic(error);
        if (recoveryNarrationVersion !== 3 || diagnostic?.rule !== 'movement' || diagnostic.eventIndex !== events.length
          || validated.blocks[diagnostic.blockIndex]?.type !== 'narration') throw error;
        // Discard every candidate paragraph. The authoritative events and stop
        // are already sealed; no model retry, invented handoff or new outcome.
        validated = validate({ blocks: events.map(({ id }) => ({ type: 'event', eventId: id })), stopReason });
        assertSceneProse({ ...data, document: validated });
        this.#agentJobs.trace(row, 'rejected', 'scene', { stage: 'validation', phase: 'host_validation',
          code: 'INVALID_AGENT_OUTPUT', taskRole: 'scene_composer', taskKind: 'scene', ...diagnostic });
      }
      this.#agentJobs.saveTaskResult(row, 'scene', validated, token);
      return this.#completeSceneBeatTurn(row, state, plan, token, { recoveryCommitRef: commitRef, recoveryNarrationVersion });
    }, { reuseVerifiedCommitBytes: true, reuseExactPlanReads: true });
  }
  failAgentSceneRecovery(jobId, token, code, diagnostic) {
    return this.#transaction(() => {
      const { row } = this.#agentJobAtHead(jobId, token, true);
      if (!this.#agentJobs.hasSceneRecovery(row)) fail('INVALID_SCENE_RECOVERY');
      this.#agentJobs.fail(row, token, code, { ...traceFailure(diagnostic), ...this.#agentJobs.taskSummary(row) });
    });
  }
  completeAgentTurn(jobId, token, options) {
    let hostScenePresentation = false;
    if (options !== undefined) {
      const descriptor = options && typeof options === 'object' && !isProxy(options)
        ? Object.getOwnPropertyDescriptor(options, 'hostScenePresentation') : undefined;
      if (!options || typeof options !== 'object' || isProxy(options) || Object.getPrototypeOf(options) !== Object.prototype
        || Reflect.ownKeys(options).length !== 1 || !descriptor?.enumerable
        || !Object.hasOwn(descriptor, 'value') || descriptor.value !== 'host@1') {
        fail('INVALID_AGENT_JOB', '场景呈现指令不符合当前修订。');
      }
      hostScenePresentation = true;
    }
    const startedAt = performance.now();
    try {
    return this.#transaction(() => {
      const { row, state, plan } = this.#agentJobAtHead(jobId, token);
      if ([2, 3, 4, 5, 6, 7].includes(plan.version)) return this.#completeNarrativeTurn(row, state, plan, token, { hostScenePresentation });
      if (hostScenePresentation) fail('INVALID_AGENT_JOB', '当前任务不支持宿主场景呈现。');
      const roleplay = this.#agentJobs.result(row, 'roleplay'); const data = this.#agentJobs.result(row, 'character_data');
      if (!roleplay || !data) fail('INVALID_AGENT_OUTPUT', '角色任务尚未完整完成。');
      const decision = this.#validateAgentOutput(row, plan, 'roleplay', roleplay);
      const proposal = this.#validateAgentOutput(row, plan, 'character_data', data);
      // Current policy deliberately adopts ONLY the literal episodic record.
      // Model beliefs/relationships remain audited proposals, not true facts.
      // This prevents speculative model summaries laundering claims into RAG.
      const records = [{ ownerId: row.actor_id, kind: 'memory',
        summary: `记得眼前的来访者当面对我${actorForState(state, createdPlayerId(state)).communication === 'writing' ? '写道' : '说'}（陈述未核实）：${plan.intent.playerText.slice(0, 900)}`,
        sourceObservationIds: [`${plan.questionKey}:${row.actor_id}`] }];
      const review = { policy: 'literal-episode-only@1', adoptedHostMemories: 1,
        deferredProposalCount: proposal.updates.length, reason: '模型认知提案留作审计；当前仅宿主生成的逐字交流记忆入库。' };
      const next = structuredClone(state);
      applyAgentAction(next, { ...plan.intent, jobId, questionKey: plan.questionKey, answerKey: plan.answerKey, reply: decision.utterance });
      const turnId = randomUUID(); next.turnIds.push(turnId);
      this.#insertTurn(turnId, row.text, state, next);
      this.#write(next, 'act', { action: { intentKey: this.#domain.intentKey(state, row.text) }, records });
      const receipt = this.#agentReceipt({ requestId: row.request_id }, next, true,
        '对方的回应已记下。接下来，由你决定。');
      this.#rememberAgentReceipt({ requestId: row.request_id, text: row.text }, next, receipt);
      this.#agentJobs.commit(row, token, { review, turnId, receipt });
      return receipt;
    }, { reuseVerifiedCommitBytes: true, reuseRelationshipProjection: true });
    } finally { v0Timing('completeAgentTurn', startedAt); }
  }
  #magicView(state, sceneMagic, relationshipActions) {
    // #view already verified the identical state in this synchronous read.
    // Undefined means the direct capabilities caller still resolves it here.
    const magicForState = () => sceneMagic === undefined ? this.#magicAt(state) : sceneMagic;
    if(state.customAbilitySetup) {
      const guarded=this.#customGuarded&&state.customAbilitySetup.version===2&&state.customAbilitySetup.profile==='ordinary-guarded@1';
      const magic=guarded?magicForState():null;
      const available=guarded&&!magic&&Boolean(this.#magicPolicy)&&state.exampleId==='agent'&&runtimeCapabilityId(state.agentRuntimeRevision)==='agent-prison-runtime@8'
        &&!state.creation?.scenarioId&&!state.caseOne&&!state.completed
        &&[undefined,null,'daily','aftermath'].includes(activeProcedure(state)?.stage)
        &&!state.guardReaction?.pending&&!state.guardReaction?.detention&&!this.#agentJobs.active(state.generation);
      return {version:1,enabled:Boolean(magic),available,gate:'custom-ability-separate-versioned-entry',actions:[],targets:[]};
    }
    if (state.exampleId !== 'agent') return { version: 1, enabled: false, available: false, gate: 'unsupported-world', actions: [], targets: [] };
    const magic = magicForState();
    if (!magic) {
      this.#domain.assertSnapshot(state);
      return { version: 1, enabled: false, available: Boolean(this.#magicPolicy) && state.exampleId === 'agent' && runtimeCapabilityId(state.agentRuntimeRevision) === 'agent-prison-runtime@8'
        && !state.creation?.scenarioId && !state.caseOne && !state.completed
        && [undefined, null, 'daily', 'aftermath'].includes(activeProcedure(state)?.stage)
        && !state.guardReaction?.pending && !state.guardReaction?.detention && !this.#agentJobs.active(state.generation),
        gate: this.#magicPolicy ? 'explicit-confirmation-required' : 'host-reviewed-binding-policy-required', actions: [], targets: [] };
    }
    if (state.completed || state.caseOne && state.storyArc?.status !== 'aftermath') return {
      version: 1, enabled: true, available: false, gate: state.completed ? 'completed-world-read-only' : 'shared-case-world-adapter', actions: [], targets: [] };
    const actorId = createdPlayerId(state);
    const ownerCognition = () => this.#domain.retrieveCognition(state, actorId, { recentLimit: 32, recallLimit: 0 });
    const sources = relationshipActions ? this.#domain.withRelationshipDisplayActions(relationshipActions, ownerCognition) : ownerCognition();
    return { version: 1, enabled: true, available: false, ...hostMagicCapabilities(state, magic, actorId, sources),
      ...(ownedSelfFloatEnd(magic, actorId) ? { end: { label: '停止飘浮' } } : {}),
      incompleteConsumers: ['mind-body-world-control-perception-inventory', 'owner-constraint-action-enforcement',
        'domain-owner-memory-overlay', 'authorized-remote-past-future-channel', 'shared-force-elevation-impact-consumer'] };
  }
  magicCapabilities() { return this.#transaction(() => this.#magicView(this.#state()), { readOnly: true }); }
  // HOST-only engineering harness; server/model command schemas do not expose
  // these methods. Qualification never issues actual emotional truth or lore.
  growthStatus() { return this.#transaction(() => this.#domain.growthStatus(this.#state()), { readOnly: true }); }
  stageProtocolGrowth(operation) {
    return this.#transaction(() => {
      const state = this.#state();
      return this.#domain.stageProtocolGrowth(state, operation, this.#agentJobs.active(state.generation));
    });
  }
  /** HOST recovery of a genuinely committed no-floor protocol boundary. No
   * mapping, result or event is accepted from the caller. Source establishment
   * is deliberately separate from ordinary action/perception consumption. */
  recoverOccupiedBodyHead() {
    return this.#transaction(() => {
      const before = parseState(this.#db.prepare('SELECT state FROM prologue_head WHERE id=1').get().state);
      const parent = this.#domain.assertSnapshot(before);
      const row = this.#db.prepare('SELECT c.* FROM domain_head h JOIN domain_commits c USING(commit_ref) WHERE h.id=1').get();
      if (!row || row.run_id !== parent.run_id || row.kind !== 'magic_cast' || row.previous_execution_ref !== parent.commit_ref
        || row.generation !== before.generation || row.revision !== before.revision + 1) fail('INVALID_DOMAIN_STATE', '没有可恢复的同源魔法提交。');
      const state = JSON.parse(row.snapshot_json); this.#domain.assertOccupiedBodyWorld(state);
      const saved = this.#magicRepository.readAt({ commitRef: row.commit_ref, runId: row.run_id });
      if (!before.caseRuntime?.occupiedBody || saved?.commitRef !== row.commit_ref
        || !this.#domain.assertOccupiedBodyPrimary(state)
        || !isDeepStrictEqual(before.turnIds, state.turnIds)
        || !isDeepStrictEqual(before.agentActions, state.agentActions)) fail('INVALID_DOMAIN_STATE', '恢复缺少实际交换发布。');
      this.#validateRestored(state);
      this.#db.prepare('UPDATE prologue_head SET state=? WHERE id=1').run(row.snapshot_json);
      this.#delivery.stage(this.#view(state));
      return this.#view(state);
    });
  }
  #magicInput(input, fields) {
    const data = magicJson(input);
    if (!data || Object.keys(data).length !== fields.length || fields.some(key => !Object.hasOwn(data, key))) fail('INVALID_ABILITY_REQUEST', '魔法请求包含未授权字段或缺少当前版本。');
    if (typeof data.requestId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(data.requestId)) fail('INVALID_REQUEST_ID', '请求编号格式错误。');
    requestVersion(data); return data;
  }
  #magicFence(state, input, text) {
    if (state.generation !== input.expectedGeneration) fail('STALE_GENERATION', '魔法操作属于旧执行世代。');
    const prior = this.#priorReceipt(state, input.requestId, text);
    if (prior) { this.#domain.assertMemoryChannelHistory(state); this.#domain.assertDurableMemoryAcquisitionHistory(state); return prior; }
    if (state.revision !== input.expectedRevision) fail('STALE_REVISION', '魔法依据已变化，请重新取得当前目标句柄。');
    if (state.completed || this.#agentJobs.active(state.generation) || this.#agentJobs.getByRequest(input.requestId)
      || state.guardReaction?.pending || state.guardReaction?.detention
      || state.caseRuntime?.operations?.some(row => row.status === 'pending')) fail('INVALID_ABILITY_PENDING', '须先完成当前未决事务；已完成历史不能追加魔法。');
    this.#validateRestored(state); this.#domain.assertHead(state); return null;
  }
  activateMagic(input) {
    input = this.#magicInput(input, ['requestId', 'expectedGeneration', 'expectedRevision', 'confirmed']);
    if (input.confirmed !== true) fail('INVALID_ABILITY_REQUEST', '必须明确确认宿主已审核的绑定策略。');
    return this.#transaction(() => {
      const state = this.#state();
      if(state.customAbilitySetup&&(!this.#customGuarded||state.customAbilitySetup.version!==2||state.customAbilitySetup.profile!=='ordinary-guarded@1'))fail('CUSTOM_ABILITY_PROFILE_UNSUPPORTED');
      // Text is legal player input, never operation provenance. Historical
      // retries must reconstruct the exact activation command and find its
      // immutable ledger on THIS head's narrative ancestry before replay.
      if (state.generation !== input.expectedGeneration) fail('STALE_GENERATION', '魔法操作属于旧执行世代。');
      const saved = this.#db.prepare('SELECT text FROM prologue_requests WHERE request_id=?').get(input.requestId);
      let text = `magic-activate:${this.#magicPolicy ? abilityDigest(this.#magicPolicy) : 'unresolved'}`;
      if (saved) {
        const receipt = this.#priorReceipt(state, input.requestId, saved.text);
        const conflict = () => fail('IDEMPOTENCY_CONFLICT', '请求编号不属于当前历史中已提交的魔法启用操作。');
        const match = /^magic-activate:([a-f0-9]{64})$/u.exec(saved.text);
        if (!match || receipt.requestId !== input.requestId || receipt.accepted !== true || receipt.status !== 'accepted'
          || receipt.view?.generation !== state.generation || !Number.isSafeInteger(receipt.view?.revision)
          || receipt.view.magic?.enabled !== true || !magicId(receipt.backupSaveId)
          || !receipt.view.saveSlots?.some(slot => slot.id === receipt.backupSaveId)) conflict();
        const head = this.#domain.assertHead(state);
        const committed = this.#db.prepare(`WITH RECURSIVE history AS (
          SELECT commit_ref,parent_commit_ref,run_id,0 AS depth FROM domain_commits WHERE commit_ref=? AND run_id=?
          UNION ALL SELECT c.commit_ref,c.parent_commit_ref,c.run_id,h.depth+1 FROM domain_commits c
            JOIN history h ON c.commit_ref=h.parent_commit_ref WHERE c.run_id=? AND h.depth<4096
        ) SELECT c.* FROM history h JOIN domain_commits c ON c.commit_ref=h.commit_ref
          JOIN host_magic_commits_v2 m ON m.commit_ref=c.commit_ref AND m.branch_id=c.branch_id
          WHERE c.kind='magic_activate' AND c.generation=? AND c.revision=? AND m.request_id=?
            AND m.expected_head=c.previous_execution_ref AND m.command_hash=?`).get(head.commit_ref, head.run_id, head.run_id,
          state.generation, receipt.view.revision, input.requestId,
          abilityDigest({ type: 'magic_activate', useId: input.requestId, policyFingerprint: match[1] }));
        if (!committed) conflict();
        this.#domain.assertSnapshot(JSON.parse(committed.snapshot_json));
        const source = this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE commit_ref=?')
          .get(committed.previous_execution_ref);
        const beforeActivation = source && this.#domain.assertSnapshot(JSON.parse(source.snapshot_json));
        const backup = receipt.view.saveSlots.find(slot => slot.id === receipt.backupSaveId);
        if (!beforeActivation || backup.generation !== beforeActivation.generation || backup.revision !== beforeActivation.revision
          || receipt.view.worldTime !== committed.world_time) conflict();
        const activation = this.#magicRepository.readAt({ commitRef: committed.commit_ref, runId: head.run_id });
        if (activation?.commitRef !== committed.commit_ref
          || !isDeepStrictEqual(activation.receipt, { useId: input.requestId, status: 'activated' })) conflict();
        text = saved.text;
      }
      const prior = this.#magicFence(state, input, text); if (prior) return prior;
      if (!this.#magicPolicy) fail('INVALID_ABILITY_GRANT', '尚未提供明确审核的宿主绑定策略；不会默认给全员绑定心智或身体。');
      if (!this.#magicView(state).available) fail('INVALID_ABILITY_PENDING', '当前规则、案件或未决状态不支持显式升级；历史存档不会隐式获得通用魔法。');
      const initial = structuredClone(runtimeItemProjection(state));
      if (!initial.caseRuntime) enableCaseRuntime(initial); enableAutonomy(initial);
      // Initialization uses the audited physical projection, while root
      // provenance is proved against the actual immutable pre-activation world.
      const projection = initializeHostMagic(initial, { scope: this.#domain.scope(state), bindings: this.#magicPolicy.bindings,
        ...(this.#magicPolicy.version === 2 ? { bindingPolicy: this.#magicPolicy,
          initialKnowledgeSources: actorId => this.#domain.retrieveCognition(state, actorId,
            { recentLimit: 1, recallLimit: 0, includeBackground: true }).backgroundObservations.filter(row =>
              this.#db.prepare(`SELECT 1 FROM cognition_observations o JOIN domain_world_events e ON e.event_ref=o.event_ref
                WHERE o.id=? AND o.owner_id=? AND e.kind='actor_initial_knowledge'`).get(row.id, actorId)) } : {}),
        approvedBy: this.#magicPolicy.approvedBy, setupRef: this.#magicPolicy.ref,
        activationRef: input.requestId, domainStore: { assertHead: () => this.#domain.assertHead(state),
          assertMagicActivation: ref => ref === input.requestId && input.confirmed === true && Boolean(this.#magicPolicy) } });
      const next = structuredClone(initial); next.revision++; next.storyLifeVersion = 1;
      const swapOwner = createdPlayerId(next) === 'milia' && !isCreatedCustom(next);
      if (this.#occupiedBodyVersion === 1 && swapOwner) {
        if (this.#magicPolicy.version !== 2 || guardEnabled(next) || next.creation?.storyArcId) fail('INVALID_ABILITY_PENDING', '身体消费需要新版本身体策略和普通场景。');
        next.agentPositions = Object.fromEntries(Object.values(projection.identity.bodies).map(body =>
          [body.actorId, ROOM_CODES[body.locationId] || 'unavailable']));
        next.caseRuntime.occupiedBody = occupiedBodyWorld(projection.identity);
      }
      if (this.#swapLifecycleVersion === 1 && swapOwner && !next.caseRuntime.swapLifecycle) next.caseRuntime.swapLifecycle = { version: 1, offers: [], journal: [] };
      const backupSaveId = randomUUID();
      this.#db.prepare('INSERT INTO prologue_saves(id,name,state) VALUES(?,?,?)').run(backupSaveId, '通用魔法启用前·原档备份', JSON.stringify(state));
      this.#bindSlot(backupSaveId, 1, state);
      const receiptInput = { requestId: input.requestId, text };
      this.#write(next, 'magic_activate', { magicPublication: { projection,
        command: { type: 'magic_activate', useId: input.requestId, policyFingerprint: abilityDigest(this.#magicPolicy) },
        receipt: { useId: input.requestId, status: 'activated' } } });
      const receipt = { ...this.#agentReceipt(receiptInput, next, true, '已启用明确审核绑定的通用魔法；未实现消费层的能力仍保持规则门控。'), backupSaveId };
      this.#rememberAgentReceipt(receiptInput, next, receipt); return receipt;
    });
  }
  swapLifecycleCapabilities() { return this.#transaction(() => this.#domain.swapLifecycleCapabilities(this.#state()), { readOnly: true }); }
  establishBodySwap(input) {
    input = this.#magicInput(input, ['requestId', 'expectedGeneration', 'expectedRevision', 'offerHandle', 'targetHandle']);
    return this.#swapLifecycleOperation(input, 'magic_swap_establish', input.offerHandle, input.targetHandle);
  }
  restoreOriginalSwap(input) {
    input = this.#magicInput(input, ['requestId', 'expectedGeneration', 'expectedRevision', 'relationHandle']);
    return this.#swapLifecycleOperation(input, 'magic_swap_restore', input.relationHandle, null);
  }
  #assertDirectInitialBoundary(state) {
    const pin = this.#domain.effectiveRunPolicy(state)?.pin;
    if (withRunBoundary(state, pin, () => initialMechanismDecision(state, 'magic'))) fail('INITIAL_POLICY_CLARIFICATION',
      '这项同步能力操作尚无法确定与本局自然语言边界兼容；请澄清具体请求。没有执行能力、推进时钟、清空边界或改变能力规则。');
  }
  #swapLifecycleOperation(input, type, handle, targetHandle) {
    return this.#transaction(() => {
      const state = this.#state(); const text = `${type}:${abilityDigest([handle, targetHandle])}`;
      const prior = this.#magicFence(state, input, text);
      if (prior) { this.#domain.assertSwapLifecycleHistory(state); return prior; }
      this.#assertDirectInitialBoundary(state);
      const result = this.#domain.prepareSwapLifecycle(state, { type, requestId: input.requestId, handle, targetHandle });
      this.#write(result.state, 'magic_cast', { swapPublication: result });
      const receipt = this.#agentReceipt(input, result.state, true, type === 'magic_swap_establish' ? '互换已实际建立，持续到原关系归还。' : '原先建立的互换关系已由本人主动归还。');
      this.#rememberAgentReceipt({ requestId: input.requestId, text }, result.state, receipt); return receipt;
    });
  }
  castMagic(input) {
    input = this.#magicInput(input, ['requestId', 'expectedGeneration', 'expectedRevision', 'command']);
    return this.#transaction(() => {
      const state = this.#state(); const command = magicJson(input.command);
      if (command.type === 'magic_end') {
        if (Object.keys(command).length !== 2 || command.useId !== input.requestId)
          fail('INVALID_ABILITY_REQUEST', '停止飘浮只能引用本人的当前请求。');
        return this.#endOwnedSelfFloat(input);
      }
      if (command.actorId !== createdPlayerId(state) || command.useId !== input.requestId || command.activation !== 'intent') fail('INVALID_ABILITY_REQUEST', 'HTTP 主动施法只能提交当前玩家意图，不能指定 NPC、反应事件或宿主事实。');
      const receiptInput = { requestId: input.requestId, text: `magic-cast:${abilityDigest(command)}` };
      const prior = this.#magicFence(state, input, receiptInput.text); if (prior) return prior;
      this.#assertDirectInitialBoundary(state);
      const magic = this.#magicAt(state); if (!magic) fail('INVALID_ABILITY_GRANT', '本局尚未明确启用通用魔法。');
      if (command.parameters?.channel === 'scene-durable-all@1') {
        return this.#domain.runDurableMemoryAcquisition(state, command, capability => {
          const result = executeHostDurableMemoryAcquisition({ ...state, magic }, createdPlayerId(state), command,
            { domainStore: this.#domain, capability });
          const { magic: projection, ...next } = result.state; next.revision++;
          this.#write(next, 'magic_cast', { durablePublication: { projection, command, plan: result.plan,
            receipt: result.receipt, events: result.events } });
          const receipt = this.#agentReceipt(receiptInput, next, true, '现场记忆已一次性取得并封存为本人见闻。');
          this.#rememberAgentReceipt(receiptInput, next, receipt); return receipt;
        });
      }
      const sources = this.#domain.retrieveCognition(state, createdPlayerId(state), { recentLimit: 32, recallLimit: 0 });
      // Active spatial intent itself is the HOST concentration attempt only
      // when actual settled conditions permit it. It is not an actor-supplied
      // certificate or an extra success die; guard timing remains on its old d20.
      const castWorld = structuredClone(state); let castProjection = magic; const refs = [];
      if (magicDefinition(command.definitionRef)?.operation === 'spatial-shift') {
        const actorId = createdPlayerId(state); const condition = state.caseRuntime.conditionsByActor[actorId];
        if ((condition && !['healthy', 'alive'].includes(condition.status)) || (activeProcedure(state)?.stage
          && !['daily', 'aftermath'].includes(activeProcedure(state).stage))) fail('INVALID_ABILITY_PENDING', '当前身体或制度阶段无法完成已审核的集中精神动作。');
        const scope = this.#domain.scope(state); const id = `concentration:${input.requestId}`;
        castWorld.entries.push({ id: `entry-${castWorld.entries.length + 1}`, speaker: '本人', speakerId: actorId,
          delivery: 'action', audienceIds: [actorId], occurredAt: state.worldTime, observationKey: id,
          text: '你停住动作，实际集中精神，明确构筑亲眼所见或亲历的位置。',
          hostMagicEvent: { id, type: 'concentration-established', sourceBodyId: `body:${actorId}`, at: state.worldTime,
            branchId: scope.branchId, headCommitRef: scope.commitRef, generation: state.generation, revision: state.revision } });
        refs.push(id); castProjection = refreshHostMagic(castWorld, magic, scope);
      }
      const settle = memoryChannel => {
        const result = executeHostMagic({ ...castWorld, magic: castProjection }, createdPlayerId(state), command, sources,
          { refs, ...(memoryChannel ? { domainStore: this.#domain, memoryChannel } : {}) });
        if (result.requiredHooks.length) fail('INVALID_ABILITY_PENDING', '此魔法尚需宿主生命／分支事务接线，未提交世界。');
        const { magic: projection, ...next } = result.state;
        const entryIds = new Map(next.entries.map((entry, index) => [entry.id, `entry-${index + 1}`]));
        if (entryIds.size !== next.entries.length || result.domainDeltas.observations.length) fail('INVALID_ABILITY_PENDING', '魔法观测必须来自实际宿主事件，不能直接插入任意记录。');
        const sharedMemories = result.domainDeltas.sharedMemories.map(shared => {
          const sourceEntryRef = entryIds.get(shared.sourceEntryRef);
          if (!sourceEntryRef) fail('INVALID_ABILITY_STATE', '共享记忆缺少本次实际发生的来源事件。');
          return { ...shared, sourceEntryRef };
        });
        next.entries = next.entries.map(entry => ({ ...entry, id: entryIds.get(entry.id) })); next.revision++;
        this.#write(next, 'magic_cast', { magicPublication: { projection,
          command: result.commandBinding?.publicCommand || command,
          ...(result.commandBinding ? { commandBinding: result.commandBinding } : {}),
          accessChanges: result.domainDeltas.memoryAccess, sharedMemories,
          receipt: { ...result.receipt, useId: input.requestId },
          events: result.events || projection.effects.filter(row => result.receipt.effectIds.includes(row.id)).map(row => row.event) } });
        const receipt = this.#agentReceipt(receiptInput, next, true, '魔法已通过宿主规则，并与共享世界及本人见闻原子提交。');
        this.#rememberAgentReceipt(receiptInput, next, receipt); return receipt;
      };
      return ['memory-share', 'mental-heal'].includes(magicDefinition(command.definitionRef)?.operation)
        ? this.#domain.runMemoryChannel(state, command, settle) : settle(null);
    });
  }
  #endOwnedSelfFloat(input) {
    // Caller (castMagic) already owns the transaction; never open a nested one.
    const state = this.#state();
    const text = `magic-end:${input.requestId}`;
    const prior = this.#magicFence(state, input, text); if (prior) return prior;
    const magic = this.#magicAt(state); if (!magic) fail('INVALID_ABILITY_GRANT', '本局尚未明确启用通用魔法。');
    const actorId = createdPlayerId(state);
    let ended;
    try { ended = settleOwnedSelfFloat(magic, { actorId, at: state.worldTime }); }
    catch (error) {
      if (error?.code !== 'MAGIC_LIFECYCLE_TARGET') throw error;
      const receipt = this.#agentReceipt({ requestId: input.requestId, text }, state, false, '你现在没有可由本人停止的飘浮。世界没有改动。');
      this.#rememberAgentReceipt({ requestId: input.requestId, text }, state, receipt); return receipt;
    }
    const next = structuredClone(state); next.revision++;
    next.entries.push({ id: `entry-${next.entries.length + 1}`, observationKey: `magic-end:${input.requestId}:${actorId}`,
      speaker: '本人', speakerId: actorId, text: '你的身体重新落回原来的支撑面。', delivery: 'action',
      audienceIds: [actorId], occurredAt: state.worldTime });
    this.#write(next, 'magic_cast', { magicPublication: { projection: ended.state,
      command: { type: 'magic_end', useId: input.requestId }, receipt: { useId: input.requestId,
        status: 'ended', effectIds: ended.effectIds, occurredAt: state.worldTime }, events: [] } });
    const receipt = this.#agentReceipt({ requestId: input.requestId, text }, next, true,
      '你实际收住了飘浮，身体重新落回原来的支撑面。');
    this.#rememberAgentReceipt({ requestId: input.requestId, text }, next, receipt); return receipt;
  }
  #caseItemUpgradeView(state) {
    const enabled = Boolean(caseItemPolicyPin(state));
    const supported = state.exampleId === 'agent' && state.agentFormatVersion === 3
      && runtimeCapabilityId(state.agentRuntimeRevision) === 'agent-prison-runtime@8' && !state.creation?.scenarioId
      && !state.creation?.storyArcId && !state.completed
      && [undefined, null, 'daily', 'aftermath'].includes(activeProcedure(state)?.stage);
    const active = this.#agentJobs.active(state.generation);
    const blocked = Boolean(active && active.base_revision === state.revision)
      || Boolean(state.guardReaction?.pending || state.guardReaction?.detention)
      || Boolean(state.caseRuntime?.operations.some(row => row.status === 'pending'));
    return { version: 2, policy: caseItemPolicyV2Reference(), supported, enabled,
      available: supported && !enabled && !blocked,
      reason: enabled ? '本局已封存日用品规则。' : !supported ? '此历史模式或案件阶段不支持启用。'
        : blocked ? '须先完成或取消当前待决行动。' : '明确确认后备份原档，从当前节点启用已审核的日用品布置。' };
  }
  caseItemRulesUpgrade() {
    return this.#transaction(() => this.#caseItemUpgradeView(this.#state()), { readOnly: true });
  }
  #activateCaseItems(state) {
    const next = structuredClone(state);
    applyAgentAction(next, { type: 'case_item_policy_activate', confirmed: true, policy: caseItemPolicyV2Reference() });
    const turnId = randomUUID(); next.turnIds.push(turnId);
    this.#insertTurn(turnId, CASE_ITEM_ACTIVATION_TEXT, state, next);
    this.#write(next, 'act', { action: { intentKey: `case-item-policy:${CASE_ITEM_POLICY_V2_HASH}:confirmed` } });
    return next;
  }
  activateCaseItemRules(input = {}) {
    const fields = ['requestId', 'expectedGeneration', 'expectedRevision', 'confirmed', 'policy'];
    if (!input || isProxy(input) || Object.getPrototypeOf(input) !== Object.prototype
      || Reflect.ownKeys(input).length !== fields.length || fields.some(key => {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        return !descriptor?.enumerable || !Object.hasOwn(descriptor, 'value');
      }) || input.confirmed !== true || !isCaseItemPolicyV2Reference(input.policy))
      fail('INVALID_CASE_ITEM_REQUEST', '须明确确认唯一已审核的日用品规则。');
    const { requestId, expectedGeneration, expectedRevision } = input;
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(requestId)) fail('INVALID_REQUEST_ID', '请求标识格式错误。');
    requestVersion({ expectedGeneration, expectedRevision });
    return this.#transaction(() => {
      const state = this.#state();
      if (state.generation !== expectedGeneration) fail('STALE_GENERATION', '规则确认属于旧世代。');
      const receiptInput = { requestId, text: `case-item-policy:${CASE_ITEM_POLICY_V2_HASH}:confirmed` };
      const prior = this.#priorReceipt(state, requestId, receiptInput.text); if (prior) return prior;
      if (state.revision !== expectedRevision) fail('STALE_REVISION', '进度已变化，请重新确认。');
      if (this.#agentJobs.getByRequest(requestId)) fail('IDEMPOTENCY_CONFLICT', '请求编号已用于剧情任务。');
      const upgrade = this.#caseItemUpgradeView(state);
      if (!upgrade.available) fail('INVALID_CASE_ITEM_PENDING', upgrade.reason);
      this.#validateRestored(state); this.#domain.assertHead(state);
      const backupSaveId = randomUUID();
      this.#db.prepare('INSERT INTO prologue_saves(id,name,state) VALUES(?,?,?)')
        .run(backupSaveId, '日用品规则启用前·原档备份', JSON.stringify(state));
      this.#bindSlot(backupSaveId, 1, state);
      const next = this.#activateCaseItems(state);
      const receipt = { ...this.#agentReceipt(receiptInput, next, true, '已保留原档备份并启用日用品规则。'), backupSaveId };
      this.#rememberAgentReceipt(receiptInput, next, receipt); return receipt;
    });
  }
  #guardUpgradeView(state, { checkTasks = false } = {}) {
    const enabled = guardEnabled(state);
    const stage = hasCaseOne(state) ? state.caseOne.stage : activeProcedure(state)?.stage;
    const supported = state.exampleId === 'agent' && state.agentFormatVersion === 3
      && runtimeRevisionForState(state).policy.curfewVersion === 1
      && (!hasCaseOne(state) || state.storyArc?.status === 'aftermath')
      && (!stage || ['daily', 'aftermath'].includes(stage)) && !state.completed;
    const taskBlocked = checkTasks && supported && !enabled && this.#agentJobs.activeBaseRevision(state.generation) === state.revision;
    const reason = enabled ? '本局已启用看守抓捕检定。' : !supported ? '此历史模式或当前案件阶段暂不支持启用；原有规则保持不变。'
      : taskBlocked ? '请先完成或取消当前未决剧情任务。' : '启用前会新建原档备份；只从当前节点之后生效，不改写旧剧情。';
    return { supported, enabled, available: supported && !enabled && !taskBlocked, reason };
  }
  guardRulesUpgrade() {
    return this.#transaction(() => this.#guardUpgradeView(this.#state(), { checkTasks: true }), { readOnly: true });
  }
  #activateGuardRules(state) {
    const next = structuredClone(state);
    applyAgentAction(next, { type: 'guard_rules_activate', rulesRef: GUARD_RULES.ref, fingerprint: GUARD_FINGERPRINT });
    const turnId = randomUUID(); next.turnIds.push(turnId);
    this.#insertTurn(turnId, GUARD_ACTIVATION_TEXT, state, next);
    this.#write(next, 'act', { action: { intentKey: `guard-rules:${GUARD_FINGERPRINT}` } });
    return next;
  }
  activateGuardRules(input = {}) {
    if (!input || typeof input !== 'object' || isProxy(input) || Object.getPrototypeOf(input) !== Object.prototype
      || Reflect.ownKeys(input).some(key => !['requestId', 'expectedGeneration', 'expectedRevision'].includes(key)
        || !Object.hasOwn(Object.getOwnPropertyDescriptor(input, key), 'value'))) fail('INVALID_GUARD_REQUEST', '规则启用只能包含请求编号与当前版本。');
    const { requestId, expectedGeneration, expectedRevision } = input;
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(requestId)) fail('INVALID_REQUEST_ID', '请求标识格式错误。');
    requestVersion({ expectedGeneration, expectedRevision });
    return this.#transaction(() => {
      const state = this.#state();
      if (state.generation !== expectedGeneration) fail('STALE_GENERATION', '规则启用请求属于旧世代，请刷新。');
      const receiptInput = { requestId, text: `guard-rules:${GUARD_FINGERPRINT}` };
      const prior = this.#priorReceipt(state, requestId, receiptInput.text);
      if (prior) return prior;
      if (state.revision !== expectedRevision) fail('STALE_REVISION', '进度已变化，请重新确认。');
      if (this.#agentJobs.getByRequest(requestId)) fail('IDEMPOTENCY_CONFLICT', '请求编号已用于剧情任务。');
      if (!this.#guardUpgradeView(state, { checkTasks: true }).available) fail('INVALID_GUARD_PENDING', this.#guardUpgradeView(state, { checkTasks: true }).reason);
      this.#validateRestored(state); this.#domain.assertHead(state);
      const backupSaveId = randomUUID();
      this.#db.prepare('INSERT INTO prologue_saves(id,name,state) VALUES(?,?,?)')
        .run(backupSaveId, '看守检定升级前·原档备份', JSON.stringify(state));
      this.#bindSlot(backupSaveId, 1, state);
      const next = this.#activateGuardRules(state);
      const receipt = { ...this.#agentReceipt(receiptInput, next, true, '已保留升级前备份，并从当前节点启用看守抓捕检定。'), backupSaveId };
      this.#rememberAgentReceipt(receiptInput, next, receipt);
      return receipt;
    });
  }
  #abilityUpgradeView(state) {
    const enabled = Boolean(abilityRuleReference(state));
    const stage = hasCaseOne(state) ? state.caseOne.stage : activeProcedure(state)?.stage;
    const supported = state.exampleId === 'agent' && state.agentFormatVersion === 3
      && runtimeCapabilityId(state.agentRuntimeRevision) === 'agent-prison-runtime@8' && approvedSpatialCreation(state.creation)
      && !state.creation?.scenarioId && (!hasCaseOne(state) || state.storyArc?.status === 'aftermath')
      && (!stage || ['daily', 'aftermath'].includes(stage)) && !state.completed;
    const active = this.#agentJobs.active(state.generation);
    const blocked = !guardEnabled(state) || Boolean(state.guardReaction?.pending || state.guardReaction?.detention)
      || Boolean(active && active.base_revision === state.revision);
    return { version: 1, supported, enabled, available: supported && !enabled && !blocked,
      reason: enabled ? '本局已封存意念穿梭规则。' : !supported ? '当前角色或执行版本不支持此已审核能力。'
        : blocked ? '须先启用看守规则，并完成当前待决行动或遭遇。' : '明确确认后备份当前进度并启用已审核的意念穿梭。' };
  }
  abilityRulesUpgrade() {
    return this.#transaction(() => this.#abilityUpgradeView(this.#state()), { readOnly: true });
  }
  activateAbilityRules(input = {}) {
    const fields = ['requestId', 'expectedGeneration', 'expectedRevision', 'confirmed'];
    if (!input || typeof input !== 'object' || isProxy(input) || Object.getPrototypeOf(input) !== Object.prototype
      || Reflect.ownKeys(input).length !== fields.length || fields.some(key => !Object.hasOwn(input, key))
      || Reflect.ownKeys(input).some(key => !fields.includes(key)
        || !Object.getOwnPropertyDescriptor(input, key)?.enumerable
        || !Object.hasOwn(Object.getOwnPropertyDescriptor(input, key), 'value'))) fail('INVALID_ABILITY_REQUEST', '能力启用只能包含请求编号、当前版本与明确确认。');
    const { requestId, expectedGeneration, expectedRevision, confirmed } = input;
    if (confirmed !== true) fail('INVALID_ABILITY_REQUEST', '须明确确认已审核的能力定义。');
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(requestId)) fail('INVALID_REQUEST_ID', '请求标识格式错误。');
    requestVersion({ expectedGeneration, expectedRevision });
    return this.#transaction(() => {
      const state = this.#state();
      if (state.generation !== expectedGeneration) fail('STALE_GENERATION', '能力启用请求属于旧世代，请刷新。');
      const receiptInput = { requestId, text: `ability-rules:${ABILITY_FINGERPRINT}:confirmed` };
      const prior = this.#priorReceipt(state, requestId, receiptInput.text);
      if (prior) return prior;
      if (state.revision !== expectedRevision) fail('STALE_REVISION', '进度已变化，请重新确认。');
      if (this.#agentJobs.getByRequest(requestId)) fail('IDEMPOTENCY_CONFLICT', '请求编号已用于剧情任务。');
      const upgrade = this.#abilityUpgradeView(state);
      if (!upgrade.available) fail('INVALID_ABILITY_PENDING', upgrade.reason);
      this.#validateRestored(state); this.#domain.assertHead(state);
      const action = approvedSpatialActivation(state, { confirmed });
      const backupSaveId = randomUUID();
      this.#db.prepare('INSERT INTO prologue_saves(id,name,state) VALUES(?,?,?)')
        .run(backupSaveId, '意念穿梭启用前·原档备份', JSON.stringify(state));
      this.#bindSlot(backupSaveId, 1, state);
      const next = structuredClone(state); applyAgentAction(next, action);
      const turnId = randomUUID(); next.turnIds.push(turnId);
      this.#insertTurn(turnId, ABILITY_ACTIVATION_TEXT, state, next);
      this.#write(next, 'act', { action: { intentKey: receiptInput.text } });
      const receipt = { ...this.#agentReceipt(receiptInput, next, true, '已保留原档备份，并启用确认过的意念穿梭规则。'), backupSaveId };
      this.#rememberAgentReceipt(receiptInput, next, receipt);
      return receipt;
    });
  }
  #diceCharacter(state) {
    const character = diceCharacter(state);
    if (!character) return null;
    const actorId = createdPlayerId(state);
    return { ...character, actorId, name: character.name || actorForState(state, actorId).name, abilities: diceAbilities() };
  }
  #diceView(state, scope) {
    const character = this.#diceCharacter(state);
    const available = Boolean(character) && !state.completed;
    return { version: 1, available, generation: state.generation, revision: state.revision,
      character: character ? { name: character.name, attributeSource: character.attributeSource, modifiers: character.modifiers } : null,
      abilities: diceAbilities(), difficulties: structuredClone(DICE_RULES.difficulties),
      reactionRules: { protectedActions: REACTION_RULES.protectedActions, maxActionSeconds: REACTION_RULES.maxActionSeconds },
      ...(character ? this.#dice.view(scope, character) : { history: [], opportunities: [] }),
      notice: '后端d20检定，不调用模型。试掷不推进时间、不改变剧情，也不授予逃脱保护。读回检定前存档可重新掷骰；读回检定后存档恢复原结果。' };
  }
  diceView() {
    return this.#transaction(() => {
      const state = this.#state();
      return this.#diceView(state, this.#domain.scope(state));
    }, { readOnly: true });
  }
  rollDice(input) {
    const request = validateDiceRollInput(input);
    return this.#transaction(() => {
      this.#assertNotCustomRootRequest(request.requestId);
      const state = this.#state(); const scope = this.#domain.scope(state);
      if (state.generation !== request.expectedGeneration) fail('STALE_GENERATION', '掷骰请求属于旧世代，请刷新后选择。');
      const prior = this.#dice.prior(scope, request);
      if (prior) {
        const saved = this.#db.prepare('SELECT generation,text,receipt FROM prologue_requests WHERE request_id=?').get(request.requestId);
        if (saved) {
          if (saved.generation !== state.generation || saved.text !== `guard-dice:${request.opportunityId}:${request.optionId}`) fail('IDEMPOTENCY_CONFLICT', '检定回执身份不一致。');
          return { ...JSON.parse(saved.receipt), dice: this.#diceView(state, scope), currentView: this.#view(state) };
        }
        return { accepted: true, result: prior, dice: this.#diceView(state, scope) };
      }
      if (state.revision !== request.expectedRevision) fail('STALE_REVISION', '剧情进度已经改变，未掷骰。');
      if (this.#agentJobs.getByRequest(request.requestId)
        || this.#db.prepare('SELECT 1 FROM prologue_requests WHERE request_id=?').get(request.requestId)) fail('IDEMPOTENCY_CONFLICT', '请求编号已用于剧情操作。');
      if (request.mode === 'opportunity' && guardEnabled(state) && !guardView(state)?.pending) {
        const resolved = state.agentActions.findLast(action => action.type === 'guard_dice_resolution'
          && action.opportunityId === request.opportunityId);
        if (resolved) {
          if (resolved.optionId !== request.optionId) diceFailure('INVALID_DICE_OPTION', '同一抓捕判定不能换选项重掷；可以读取检定前存档。');
          return { accepted: true, result: resolved.result, dice: this.#diceView(state, scope), view: this.#view(state) };
        }
      }
      const character = this.#diceCharacter(state);
      if (!character || state.completed) diceFailure('INVALID_DICE_REQUEST', '当前视角不能掷骰。');
      const active = this.#agentJobs.active(state.generation);
      if (active && active.base_revision === state.revision) diceFailure('INVALID_DICE_PENDING', '当前有未完成的剧情任务，请先处理原任务。');
      if ((hasCaseOne(state) ? state.caseOne.stage : activeProcedure(state)?.stage) === 'execution_ready')
        diceFailure('INVALID_DICE_PENDING', '当前判决等待确认，请先处理阶段选择。');
      this.#validateRestored(state);
      const pending = guardView(state)?.pending;
      if (pending && (request.mode !== 'opportunity' || request.opportunityId !== pending.opportunityId))
        diceFailure('INVALID_DICE_PENDING', '必须处理当前看守抓捕判定。');
      const turnId = pending ? randomUUID() : undefined;
      if (turnId) this.#dice.bindTurn(turnId, scope);
      const result = this.#dice.roll(scope, request, character);
      if (!pending) return { accepted: true, result, dice: this.#diceView(state, scope) };
      const next = structuredClone(state);
      const narrationVersion = guardDiceNarrationVersion(state, result, request.optionId);
      applyAgentAction(next, { type: 'guard_dice_resolution', encounterId: pending.id, narrationVersion,
        opportunityId: pending.opportunityId, optionId: request.optionId, result });
      next.turnIds.push(turnId);
      this.#insertTurn(turnId, GUARD_RESOLUTION_TEXT, state, next, { diceBound: true });
      this.#write(next, 'act', { action: { intentKey: `guard-dice:${pending.id}:${request.optionId}:${result.id}` } });
      const receiptInput = { requestId: request.requestId, text: `guard-dice:${request.opportunityId}:${request.optionId}` };
      const receipt = { ...this.#agentReceipt(receiptInput, next, true, result.success ? '检定成功，已脱离抓捕。' : '检定失败，看守已实施抓捕。'), result };
      this.#rememberAgentReceipt(receiptInput, next, receipt);
      return { ...receipt, dice: this.#diceView(next, this.#domain.scope(next)) };
    });
  }
  // Host integration seam retained for other rule-owned checks. No HTTP/model
  // tool can offer opportunities or prescribe outcomes. Guard opportunities
  // are staged with the committed pending encounter in #write().
  offerDiceOpportunity(definition, { expectedGeneration, expectedRevision } = {}) {
    requestVersion({ expectedGeneration, expectedRevision });
    return this.#transaction(() => {
      const state = this.#state(); const scope = this.#domain.scope(state);
      if (state.generation !== expectedGeneration || state.revision !== expectedRevision) fail('STALE_REVISION', '检定机会依据已过期。');
      if (state.exampleId !== 'agent' || state.completed) diceFailure();
      const active = this.#agentJobs.active(state.generation);
      if (active && active.base_revision === state.revision) diceFailure('INVALID_DICE_PENDING');
      this.#dice.offer(scope, definition, createdPlayerId(state));
      return this.#diceView(state, scope);
    });
  }
  diceResult(resultId) {
    return this.#transaction(() => this.#dice.result(this.#domain.scope(this.#state()), resultId), { readOnly: true });
  }
  diceOpportunityResolution(opportunityId) {
    return this.#transaction(() => this.#dice.resolution(this.#domain.scope(this.#state()), opportunityId), { readOnly: true });
  }
  confirmCaseExecution({ requestId, verdictId, expectedGeneration, expectedRevision } = {}) {
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(requestId)) fail('INVALID_REQUEST_ID', '请求标识格式错误。');
    if (typeof verdictId !== 'string' || !/^verdict-[a-f0-9]{24}$/u.test(verdictId)) fail('INVALID_VERDICT', '请选择当前已成立的判决。');
    requestVersion({ expectedGeneration, expectedRevision });
    return this.#transaction(() => {
      const state = this.#state();
      if (state.generation !== expectedGeneration) fail('STALE_GENERATION', '执行确认属于旧世代，请刷新。');
      // The command identity includes the verdict; a dropped response can be
      // retried exactly, but the same request ID cannot confirm another verdict.
      const receiptInput = { requestId, text: `case-execution:${verdictId}` };
      const prior = this.#priorReceipt(state, requestId, receiptInput.text);
      if (prior) { this.#domain.assertExecutionLifeHistory(state); return prior; }
      if (state.revision !== expectedRevision) fail('STALE_REVISION', '判决或进度已经改变，请刷新后再确认。');
      const procedure = hasCaseOne(state) ? state.caseOne : activeProcedure(state);
      const executionLife = hasSoftRuntime(state) || this.#executionLifeVersion === 1;
      if (state.storyLifeVersion === 1 && procedure?.verdict?.selectedIds.includes('hiro')
        && (!executionLife || hasCaseOne(state)))
        fail('MAGIC_HOST_RULE_GATED', '处刑死亡反应适配尚未完成；没有提交执行或永久死亡。');
      if (!procedure || procedure.stage !== 'execution_ready' || procedure.verdict.id !== verdictId) fail('INVALID_VERDICT', '尚未到执行确认阶段，或判决已不属于当前路径。');
      if (this.#agentJobs.getByRequest(requestId)) fail('IDEMPOTENCY_CONFLICT', '请求标识已用于另一项操作。');
      this.#validateRestored(state); this.#domain.assertHead(state);
      const next = structuredClone(state);
      const execution = executionLife && state.storyLifeVersion === 1 && procedure.verdict.selectedIds.includes('hiro')
        ? executionLifeAction(state, requestId) : { type: 'case_execution', verdictId,
          ...(runtimeCapabilityId(state.agentRuntimeRevision) === 'agent-prison-runtime@8' ? { sceneVersion: 2 } : {}) };
      applyAgentAction(next, execution);
      const turnId = randomUUID(); next.turnIds.push(turnId);
      this.#insertTurn(turnId, '确认处刑推进', state, next);
      const reaction = this.#write(next, 'act', { action: { intentKey: `case-execution:${verdictId}` }, stageDelivery: false });
      const published = this.#publishStoryReaction(next, reaction);
      this.#delivery.stage(this.#view(published));
      const receipt = this.#agentReceipt(receiptInput, published, true, published.completed ? '执行结束，当前角色视角已停止。可以读取执行前自动存档。' : '执行结束，幸存者回归日常。');
      this.#rememberAgentReceipt(receiptInput, published, receipt);
      return receipt;
    });
  }
  save(name, options = {}) {
    if (typeof name !== 'string' || !name.trim() || name.length > 100) fail('INVALID_SAVE_NAME', '存档名须非空且不超过一百个字符。');
    const { saveId, expectedGeneration, expectedRevision, expectedSaveVersion } = saveOptions(options);
    const checkHead = expectedGeneration !== undefined || expectedRevision !== undefined;
    requestVersion({ expectedGeneration, expectedRevision }, { required: checkHead });
    if (saveId !== undefined) validateSaveId(saveId);
    if (saveId !== undefined || expectedSaveVersion !== undefined) validateSaveVersion(expectedSaveVersion);
    return this.#transaction(() => {
      const state = this.#state();
      if (checkHead && expectedGeneration !== state.generation) fail('STALE_GENERATION', '此存档请求属于旧执行世代，请刷新当前视图。');
      if (checkHead && expectedRevision !== state.revision) fail('STALE_REVISION', '页面进度已更新，请刷新后再存档。');
      const id = saveId === undefined ? randomUUID() : saveId;
      let version = 1;
      if (saveId !== undefined) {
        const slot = this.#db.prepare('SELECT version FROM prologue_saves WHERE id=?').get(id);
        if (!slot) fail('SAVE_NOT_FOUND', '没有找到该存档。');
        if (slot.version !== expectedSaveVersion) fail('STALE_SAVE', '该存档已被其他页面修改，请刷新存档列表。');
        version = slot.version + 1;
        validateSaveVersion(version);
      }
      this.#validateRestored(state);
      this.#domain.assertHead(state);
      if (saveId === undefined) {
        this.#db.prepare('INSERT INTO prologue_saves(id,name,state,version) VALUES(?,?,?,?)').run(id, name.trim(), JSON.stringify(state), version);
      } else {
        const result = this.#db.prepare('UPDATE prologue_saves SET name=?,state=?,version=? WHERE id=? AND version=?').run(name.trim(), JSON.stringify(state), version, id, expectedSaveVersion);
        if (result.changes !== 1) fail('STALE_SAVE', '该存档已被其他页面修改，请刷新存档列表。');
      }
      this.#bindSlot(id, version, state);
      return { id, name: name.trim(), version };
    });
  }
  renameSave(saveId, name, options = {}) {
    if (typeof name !== 'string' || !name.trim() || name.length > 100) fail('INVALID_SAVE_NAME', '存档名须非空且不超过一百个字符。');
    const { expectedSaveVersion } = saveOptions(options);
    validateSaveId(saveId);
    validateSaveVersion(expectedSaveVersion);
    return this.#transaction(() => {
      const slot = this.#db.prepare('SELECT version FROM prologue_saves WHERE id=?').get(saveId);
      if (!slot) fail('SAVE_NOT_FOUND', '没有找到该存档。');
      if (slot.version !== expectedSaveVersion) fail('STALE_SAVE', '该存档已被其他页面修改，请刷新存档列表。');
      const version = slot.version + 1;
      validateSaveVersion(version);
      // Rename metadata only: never replace the snapshot with the live head.
      const result = this.#db.prepare('UPDATE prologue_saves SET name=?,version=? WHERE id=? AND version=?').run(name.trim(), version, saveId, expectedSaveVersion);
      if (result.changes !== 1) fail('STALE_SAVE', '该存档已被其他页面修改，请刷新存档列表。');
      this.#domain.advanceSlotVersion(saveId, expectedSaveVersion, version);
      this.#dice.renameSave(saveId, version);
      return { id: saveId, name: name.trim(), version };
    });
  }
  deleteSave(saveId, options = {}) {
    const { expectedSaveVersion } = saveOptions(options);
    validateSaveId(saveId);
    validateSaveVersion(expectedSaveVersion);
    return this.#transaction(() => {
      const slot = this.#db.prepare('SELECT version FROM prologue_saves WHERE id=?').get(saveId);
      if (!slot) fail('SAVE_NOT_FOUND', '没有找到该存档。');
      if (slot.version !== expectedSaveVersion) fail('STALE_SAVE', '该存档已被其他页面修改，请刷新存档列表。');
      const result = this.#db.prepare('DELETE FROM prologue_saves WHERE id=? AND version=?').run(saveId, expectedSaveVersion);
      if (result.changes !== 1) fail('STALE_SAVE', '该存档已被其他页面修改，请刷新存档列表。');
      this.#domain.deleteSlot(saveId);
      this.#dice.deleteSave(saveId);
      return { id: saveId };
    });
  }
  load(saveId) {
    return this.#transaction(() => {
      if (typeof saveId !== 'string') fail('INVALID_SAVE', '请提供有效存档标识。');
      const slot = this.#db.prepare('SELECT state,version FROM prologue_saves WHERE id=?').get(saveId);
      if (!slot) fail('SAVE_NOT_FOUND', '没有找到该存档。');
      const current = this.#state();
      const restored = parseState(slot.state);
      this.#validateRestored(restored);
      const source = this.#domain.resolveSlot(saveId, slot.version, restored);
      this.#refreshTrust();
      const sourceJournal = this.#journalTrust?.commitRef === source.commit_ref
        && this.#journalTrust.turnCount === restored.turnIds.length
        && isDeepStrictEqual(parseState(source.snapshot_json), restored) ? this.#journalTrust : null;
      restored.restoredFrom = { generation: restored.generation, revision: restored.revision };
      restored.generation = current.generation + 1;
      restored.revision = current.revision + 1;
      this.#write(restored, 'load');
      // Carry only the exact audited source across this authenticated no-floor load.
      if (sourceJournal && this.#journalTrust === sourceJournal) {
        const loaded = this.#domain.assertHead(restored);
        if (loaded.kind === 'load' && loaded.parent_commit_ref === source.commit_ref
          && loaded.run_id === source.run_id && loaded.turn_depth === sourceJournal.turnCount
          && isDeepStrictEqual(parseState(loaded.snapshot_json), restored)) {
          this.#journalTrust = { commitRef: loaded.commit_ref, turnCount: sourceJournal.turnCount };
        }
      }
      if (restored.exampleId === 'agent') this.#dice.restoreSave(saveId, slot.version, this.#domain.scope(restored));
      return this.#view(restored);
    }, { reuseVerifiedCommitBytes: true, reuseRelationshipProjection: true, reuseExactPlanReads: true });
  }
  avatarAsset(id) {
    if (this.#closed) fail('CLOSED', '引擎已经关闭。');
    return this.#avatars.read(id);
  }
  updatePlayerAvatar({ expectedGeneration, expectedRevision, avatarDataUrl } = {}) {
    requestVersion({ expectedGeneration, expectedRevision });
    if (avatarDataUrl !== null && typeof avatarDataUrl !== 'string') fail('INVALID_AVATAR', '请选择头像图片，或恢复默认头像。');
    return this.#transaction(() => {
      const state = this.#state();
      if (state.generation !== expectedGeneration) fail('STALE_GENERATION', '头像设置属于旧执行世代，请刷新后重试。');
      if (state.revision !== expectedRevision) fail('STALE_REVISION', '页面进度已更新，请刷新后重试。');
      if (state.exampleId !== 'custom' && !isCreatedCustom(state)) fail('INVALID_AVATAR', '仅可更换当前自定义角色的头像。');
      const id = avatarDataUrl === null ? undefined : this.#avatars.put(avatarDataUrl);
      if (id === state.playerAvatarId) return this.#view(state);
      if (id) state.playerAvatarId = id;
      else delete state.playerAvatarId;
      // Cosmetic changes invalidate stale writes but never add an action,
      // observation, dialogue entry or a tick of story time.
      state.revision += 1;
      if (!Number.isSafeInteger(state.revision)) fail('INVALID_REVISION', '状态版本超出范围。');
      this.#write(state, 'player_avatar');
      return this.#view(state);
    });
  }
  #assertNotCustomRootRequest(requestId) {
    if(this.#db.prepare('SELECT 1 FROM custom_ability_root_requests WHERE request_id=?').get(requestId))fail('IDEMPOTENCY_CONFLICT');
  }
  saveCustomAbilityDraft(raw) {
    const input=customAbilityData(raw);customAbilityExact(input,['apiVersion','draft']);if(input.apiVersion!==1)fail('INVALID_ABILITY_REQUEST');
    return this.#transaction(()=>{this.#assertNotCustomRootRequest(input.draft.requestId);return this.#customCatalog.saveDraft(input.draft);});
  }
  saveCharacterAbilityDraft(raw) {
    const input=customAbilityData(raw);customAbilityExact(input,['apiVersion','preset','draft']);if(input.apiVersion!==1)fail('INVALID_ABILITY_REQUEST');
    return this.#transaction(()=>{this.#assertNotCustomRootRequest(input.draft.requestId);const preset=this.#presets.save(input.preset),draft=this.#customCatalog.saveDraft(input.draft);
      if(!preset.savedPreset.character)fail('INVALID_PRESET');
      const link=this.#domain.linkCustomPresetDraft(preset.savedPreset,draft);return {preset,draft,link};});
  }
  async requestCustomAbilityCompilation(raw) {
    const input=customAbilityData(raw);customAbilityExact(input,['apiVersion','requestId','draftId','expectedVersion']);if(input.apiVersion!==1)fail('INVALID_ABILITY_REQUEST');
    if(!this.#customCompiler)fail('CUSTOM_COMPILER_UNAVAILABLE','尚无已配置的能力解释编译器。');
    const prepared=this.#transaction(()=>{this.#assertNotCustomRootRequest(input.requestId);const draft=this.#customCatalog.readDraft(input.draftId);
      const pins={compilerRef:CUSTOM_ABILITY_EXECUTABLE_COMPILER_REF,compilerVersion:1,mechanisms:CUSTOM_ABILITY_MECHANISMS.map(m=>({ref:m.ref,version:m.version})).sort((a,b)=>a.ref.localeCompare(b.ref))};
      const job=this.#customCatalog.requestCompile({requestId:input.requestId,draftId:input.draftId,expectedVersion:input.expectedVersion,pins});return {draft,job};});
    // Code-held compiler executes OUTSIDE SQL transaction. Client never chooses
    // the adapter or supplies its candidate/AST/evidence.
    const existing=this.#transaction(()=>this.#db.prepare('SELECT job_id FROM custom_ability_interpretations WHERE job_id=?').get(prepared.job.jobId),{readOnly:true});
    if(existing||this.#transaction(()=>this.#customCatalog.readJob(prepared.job.jobId).status,{readOnly:true})==='failed')return this.#transaction(()=>this.#domain.customCompilation(prepared.job.jobId),{readOnly:true});
    const failure=code=>this.#transaction(()=>{const actual=this.#customCatalog.readJob(prepared.job.jobId);
      if(actual.status==='completed')return this.#domain.customCompilation(actual.jobId);
      this.#customCatalog.failCompile({requestId:`compile-failure:${prepared.job.jobId}`,jobId:prepared.job.jobId,failureCode:code});return this.#domain.customCompilation(actual.jobId);});
    let candidate;
    try{candidate=await this.#customCompiler(structuredClone(prepared.draft));}
    catch(error){return failure(error?.code==='CUSTOM_ABILITY_AUTHORING_INVALID'?'invalid-candidate':'compiler-unavailable');}
    try{return this.#transaction(()=>{const actual=this.#customCatalog.readDraft(input.draftId);
      if(actual.sourceDigest!==prepared.draft.sourceDigest)fail('CUSTOM_ABILITY_CATALOG_STALE');
      const definitionId=`custom:${input.draftId}`;
      const existing=this.#db.prepare("SELECT max(revision) n FROM custom_ability_catalog_definitions WHERE catalog_id='local-author' AND definition_id=?").get(definitionId);
      const own=this.#db.prepare('SELECT data_json FROM custom_ability_interpretations WHERE job_id=?').get(prepared.job.jobId);
      const revision=own?JSON.parse(own.data_json).compiled.declaration.revision:(existing.n??0)+1;
      return this.#domain.completeCustomCompilation(prepared.draft,prepared.job,candidate,definitionId,revision,`complete:${input.requestId}`);});
    }catch(error){if(error.code==='CUSTOM_ABILITY_CATALOG_STALE'){failure('invalid-candidate');throw error;}
      if(error.code==='CUSTOM_ABILITY_CATALOG_RESULT_CONFLICT'||error.code==='IDEMPOTENCY_CONFLICT')throw error;
      return failure('invalid-candidate');}

  }
  customAbilityCompilationStatus(raw) { const input=customAbilityData(raw);customAbilityExact(input,['apiVersion','jobId']);if(input.apiVersion!==1)fail('INVALID_ABILITY_REQUEST');return this.#transaction(()=>this.#domain.customCompilation(input.jobId),{readOnly:true}); }
  confirmCustomAbilityDefinition(raw) {
    const input=customAbilityData(raw);customAbilityExact(input,['apiVersion','requestId','draftId','expectedVersion','draftRevision','jobId','expectedSemanticDigest','expectedAttachmentDigest','confirmed']);
    if(input.apiVersion!==1||input.confirmed!==true)fail('INVALID_ABILITY_REQUEST');
    return this.#transaction(()=>{this.#assertNotCustomRootRequest(input.requestId);return this.#domain.confirmCustomDefinition(input);});
  }
  newCustomAbilityGame(raw) {
    const input=customAbilityData(raw);customAbilityExact(input,['apiVersion','requestId','expectedGeneration','expectedRevision','creation','abilitySelections','confirmed']);
    if(input.apiVersion!==1||input.confirmed!==true||!this.#customEnabled
      ||(this.#customGuarded ? this.#guardRulesByDefault!==true : this.#guardRulesByDefault))fail('CUSTOM_ABILITY_PROFILE_UNSUPPORTED');
    const ordinaryRevision = this.#creationRuntimeRevisions.v2Ordinary;
    const legacyRevision = ordinaryRevision === EVENT_DIRECTOR_RUNTIME_REVISION ? ADMISSION_RUNTIME_REVISION : ordinaryRevision;
    const newRunRevision = input.creation?.version === 2
      ? this.#v2CustomAbility ?? legacyRevision ?? this.#newRunRevision : this.#newRunRevision;
    const creation=assertFoundationCreation((runtimeCapabilityId(newRunRevision)==='agent-prison-runtime@8'?normalizeNewGameCreation:normalizeCreation)(input.creation),runtimeRevisionById(newRunRevision));if(creation.playerMode!=='custom'||creation.scenarioId||creation.storyArcId||runtimeCapabilityId(newRunRevision)!=='agent-prison-runtime@8')fail('CUSTOM_ABILITY_PROFILE_UNSUPPORTED');
    if(typeof input.requestId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(input.requestId))fail('INVALID_REQUEST_ID');
    return this.#transaction(()=>{const replay=this.#domain.customRootRequest(input);
      if(replay){if(!this.#customGuarded&&!this.#caseRulesByDefault)return replay;const head=this.#state();
        // Root and its explicit world-rule activations commit in one transaction.
        // Replay only projects that generation; it never activates another world.
        return head.generation===replay.generation&&(this.#customGuarded?guardEnabled(head):Boolean(caseItemPolicyPin(head)))?this.#view(head):replay;}
      if (newRunRevision === EVENT_DIRECTOR_RUNTIME_REVISION && (!creation.cellSetup || creation.opening?.text))
        fail('CUSTOM_ABILITY_PROFILE_UNSUPPORTED');
      if(this.#db.prepare('SELECT 1 FROM prologue_requests WHERE request_id=?').get(input.requestId)||this.#agentJobs.getByRequest(input.requestId)||this.#dice.hasRequest(input.requestId)
        ||this.#db.prepare('SELECT 1 FROM custom_ability_catalog_requests WHERE request_id=?').get(input.requestId))fail('IDEMPOTENCY_CONFLICT');
      const current=this.#state();if(current.generation!==input.expectedGeneration||current.revision!==input.expectedRevision)fail('STALE_GENERATION');
      this.#domain.assertCustomRootAdmission(current);
      if(this.#agentJobs.active(current.generation))fail('INVALID_ABILITY_PENDING');
      const source=this.#domain.scope(current);
      if(current.turnIds.length){this.#validateRestored(current);const id=randomUUID();this.#db.prepare('INSERT INTO prologue_saves(id,name,state) VALUES(?,?,?)').run(id,'新游戏前自动备份',JSON.stringify(current));this.#bindSlot(id,1,current);}
      const setup=this.#domain.customSetup(input.abilitySelections,this.#customProfile);const state=initialAgentState(creation,{runtimeRevisionId:newRunRevision,rootCaseOptionsVersion:1,...(hasSoftRuntime(newRunRevision)?{storyLifeVersion:1}:{}),customAbilitySetup:setup});
      state.generation=current.generation+1;state.revision=current.revision+1;this.#write(state,'new_game',{customRoot:true});
      const result=this.#view(state);const root=this.#domain.publishCustomRootRequest(input,source,state,result);
      let activated=this.#customGuarded?this.#activateGuardRules(state):state;
      // This is the same versioned public items/body world used by ordinary
      // roots, not permission to adopt a plan, cause an incident or open a trial.
      // Keep the legacy root untouched unless the existing host default opts in.
      if(this.#caseRulesByDefault&&this.#caseItemUpgradeView(activated).available)activated=this.#activateCaseItems(activated);
      return activated===state?root:this.#view(activated);});
  }
  #runPolicyView(state, policy = this.#domain.effectiveRunPolicy(state)) {
    if (!policy) fail('RUN_POLICY_UNSUPPORTED', '当前存档不支持游玩中调整本局设置。');
    return runPolicyPublicView({ generation: state.generation, revision: state.revision, initial: policy.initial, effective: effectiveRunPolicyValues(policy) });
  }
  runPolicy() { return this.#transaction(() => this.#runPolicyView(this.#state()), { readOnly: true }); }
  setRunPolicy(input) {
    const request = normalizeRunPolicyRequest(input);
    const { requestId } = request; const key = `run-policy:v1:${runPolicyRequestFingerprint(request)}`;
    return this.#transaction(() => {
      const state = this.#state(); const scope = this.#domain.scope(state);
      const policy = this.#domain.effectiveRunPolicy(state);
      if (!policy) fail('RUN_POLICY_UNSUPPORTED', '当前存档不支持游玩中调整本局设置。');
      this.#assertNotCustomRootRequest(requestId);
      const collision = () => fail('RUN_POLICY_REQUEST_CONFLICT', '该请求标识已用于不同的本局设置。');
      if (this.#dice.hasRequest(requestId) || this.#agentJobs.getByRequest(requestId)) collision();
      const prior = this.#db.prepare('SELECT * FROM prologue_requests WHERE request_id=?').get(requestId);
      if (prior) {
        if (prior.text !== key) collision();
        const saved = parseState(prior.receipt);
        if (saved.kind !== 'run_policy' || saved.response?.requestId !== requestId) collision();
        if (prior.generation !== state.generation || saved.runId !== scope.runId || saved.branchId !== scope.branchId
          || !this.#domain.runPolicyAncestor(state, saved.commitRef)) fail('RUN_POLICY_STALE', '当前版本已经改变，请重新读取本局设置后再采用。');
        return saved.response;
      }
      const decision = decideRunPolicyChange(effectiveRunPolicyValues(policy), request, { generation: state.generation, revision: state.revision,
        pending: currentRunPolicyPending(this.#db, { ...scope, branch_id: scope.branchId }), activeCase: activeRunPolicyCase(state) });
      let next = state;
      if (decision.changed) {
        next = runPolicyCommitState(state);
        this.#write(next, 'run_policy', { runPolicyRequest: request });
      }
      const after = this.#domain.scope(next);
      const response = { requestId, changed: decision.changed, runPolicy: this.#runPolicyView(next) };
      this.#rememberAgentReceipt({ requestId, text: key }, next, { kind: 'run_policy', runId: after.runId, branchId: after.branchId, commitRef: after.commitRef, response });
      return response;
    });
  }
  initialRunPolicy() {
    return this.#transaction(() => {
      const state = this.#state(); this.#domain.assertHead(state);
      return this.#domain.initialRunPolicy(state);
    }, { readOnly: true });
  }
  customAbilityCapabilities() {return this.#transaction(()=>this.#domain.customAbilityCapabilities(this.#state()),{readOnly:true});}
  useCustomAbility(raw) {
    const input=customAbilityData(raw);customAbilityExact(input,['apiVersion','requestId','expectedGeneration','expectedRevision','bindingHandle','intent']);
    if(input.apiVersion!==1||!this.#customEnabled)fail('CUSTOM_ABILITY_PROFILE_UNSUPPORTED');
    if(typeof input.requestId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(input.requestId))fail('INVALID_REQUEST_ID');
    customAbilityExact(input.intent,input.intent.kind==='sound-replay'?['kind','sourceHandle']:['kind','destinationHandle']);
    return this.#transaction(()=>{const state=this.#state();const text=`custom-use:${abilityDigest(input)}`;
      if(state.generation!==input.expectedGeneration)fail('STALE_GENERATION');
      const prior=this.#priorReceipt(state,input.requestId,text);if(prior){this.#domain.assertCustomAbilityHistory(state);return prior;}
      if(state.revision!==input.expectedRevision)fail('STALE_REVISION');if(this.#agentJobs.active(state.generation))fail('INVALID_ABILITY_PENDING');
      if(!state.customAbilitySetup)fail('CUSTOM_ABILITY_PROFILE_UNSUPPORTED');
      const magic=this.#magicAt(state);
      if(magic&&magic.grants.some(row=>row.actorId==='player'))fail('CUSTOM_ABILITY_PROFILE_UNSUPPORTED');
      this.#assertDirectInitialBoundary(state);
      const prepared=this.#domain.prepareCustomUse(state,input);this.#write(prepared.next,'magic_cast',{customCommand:input});
      const receipt=this.#agentReceipt({requestId:input.requestId},prepared.next,true,'自定义能力的实际结果已提交。');
      this.#rememberAgentReceipt({requestId:input.requestId,text},prepared.next,receipt);return receipt;});
  }
  listPlayerPresets() { return this.#transaction(() => this.#presets.list(), { readOnly: true }); }
  readPlayerPreset(input) { return this.#transaction(() => this.#presets.read(input), { readOnly: true }); }
  savePlayerPreset(input) { return this.#transaction(() => this.#presets.save(input)); }
  deletePlayerPreset(input) { return this.#transaction(() => this.#presets.delete(input)); }
  newGame({ expectedGeneration, expectedRevision, exampleId = 'agent', impressionColor = '#a0beeb', avatarDataUrl = null, seed, creation: creationInput } = {}) {
    if (exampleId === 'custom' && (typeof impressionColor !== 'string' || !/^#[0-9a-f]{6}$/iu.test(impressionColor))) fail('INVALID_COLOR', '人物印象色需要为六位十六进制颜色。');
    if (exampleId !== 'agent') fail('INVALID_EXAMPLE', '请选择有效的游戏示例。');
    if (creationInput !== undefined && exampleId !== 'agent') fail('INVALID_CREATION', '仅正式 LLM 开局支持角色创建配置。');
    const creationVersion = creationInput && typeof creationInput === 'object' && !isProxy(creationInput)
      ? Object.getOwnPropertyDescriptor(creationInput, 'version')?.value : undefined;
    const newRunRevision = exampleId === 'agent' && creationVersion === 2 && this.#creationRuntimeRevisions.v2Ordinary
      ? this.#creationRuntimeRevisions.v2Ordinary : this.#newRunRevision;
    const creation = assertFoundationCreation(runtimeCapabilityId(newRunRevision) === 'agent-prison-runtime@8' && exampleId === 'agent' ? normalizeNewGameCreation(creationInput) : creationInput === undefined ? undefined : normalizeCreation(creationInput), runtimeRevisionById(newRunRevision));
    if (newRunRevision === EVENT_DIRECTOR_RUNTIME_REVISION && (!creation?.cellSetup || creation.scenarioId || creation.storyArcId))
      fail('INVALID_CREATION', '新版导演提案只支持正式普通牢房开局。');
    // New setup only. Old heads, saved configurations, frozen jobs and their
    // original hashes never acquire a supplement through normalization/read.
    if (creation && ['agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(newRunRevision)) && !creation.scenarioId
      && !Object.hasOwn(creation, 'settingSupplementId')) creation.settingSupplementId = CURRENT_BUNK_SUPPLEMENT_ID;
    if (avatarDataUrl !== null && ((exampleId !== 'custom' && creation?.playerMode !== 'custom') || typeof avatarDataUrl !== 'string')) fail('INVALID_AVATAR', '仅可为自定义角色设置头像图片。');
    return this.#transaction(() => {
      const current = this.#state();
      if (current.generation !== expectedGeneration || current.revision !== expectedRevision) fail('STALE_GENERATION', '页面状态已过期，请刷新。');
      const avatarId = avatarDataUrl === null ? undefined : this.#avatars.put(avatarDataUrl);
      if (current.turnIds?.length) {
        this.#validateRestored(current);
        const id = randomUUID();
        this.#db.prepare('INSERT INTO prologue_saves(id,name,state) VALUES(?,?,?)').run(id, '新游戏前自动备份', JSON.stringify(current));
        this.#bindSlot(id, 1, current);
      }
      const state = exampleId === 'agent' ? initialAgentState(creation, { runtimeRevisionId: newRunRevision, rootCaseOptionsVersion: 1,
        ...(hasSoftRuntime(newRunRevision) ? { storyLifeVersion: 1 } : {}),
        ...(supportsAuthoredMagicRoot(creation, newRunRevision) ? { authoredMagicVersion: 1 } : {}) }) : exampleId === 'prototype' ? initialPrototypeState() : exampleId === 'custom' ? initialCustomState() : initialState(); state.turnIds = [];
      // The original Milia root owns the existing independent swap lifecycle.
      // Echo, custom players and every historical root stay byte-identical:
      // they never acquire the pair merely because this server enables it.
      if (this.#swapLifecycleVersion === 1 && exampleId === 'agent' && createdPlayerId(state) === 'milia') {
        // This early runtime is only a root seed: the normal case-item activation
        // below still owns the visible policy transition. When that activation is
        // already available, seed the strict policy-2 objects instead of the
        // historical paper/paint seeds, which the later activation would retain
        // as archival objects and leak into the fresh normal root.
        if (this.#caseRulesByDefault && this.#caseItemUpgradeView(state).available) {
          const projected = structuredClone(state);
          delete projected.caseRuntime;
          projected.caseItemPolicy = caseItemPolicyV2Reference();
          projected.itemPolicyVersion = 2;
          enableCaseRuntime(projected);
          state.caseRuntime = projected.caseRuntime;
          // Host-only root marker: replay must rebuild the same strict seed
          // before the later visible case-item activation.
          state.caseRootStrictItemsVersion = 1;
        } else enableCaseRuntime(state);
        // A cold first ordinary act may establish the swap without a separate
        // magic activation. Seed the physical body positions the occupied
        // world will need, using the same room codes activation later rebuilds;
        // old roots never enter this branch.
        if (!state.agentPositions) state.agentPositions = Object.fromEntries(actorsForState(state)
          .filter(actor => actor.id !== 'warden')
          .map(actor => [actor.id, ROOM_CODES[runtimeRoom(state, actor.id)] || 'unavailable']));
        if (state.caseRuntime && !state.caseRuntime.swapLifecycle) state.caseRuntime.swapLifecycle = { version: 1, offers: [], journal: [] };
      }
      if (exampleId === 'custom') state.playerImpressionColor = impressionColor.toLowerCase();
      if (avatarId) state.playerAvatarId = avatarId;
      state.generation = current.generation + 1; state.revision = current.revision + 1;
      this.#write(state, 'new_game', { seed, hiddenSupplyRoot: this.#hiddenSupply && hiddenSupplyRootEligible(state) });
      if (creation?.scenarioId === 'case-1-execution-test') {
        const saveId = randomUUID();
        this.#db.prepare('INSERT INTO prologue_saves(id,name,state) VALUES(?,?,?)').run(saveId, '处刑按钮测试·执行前自动存档', JSON.stringify(state));
        this.#bindSlot(saveId, 1, state);
      }
      let activated = this.#guardRulesByDefault && this.#guardUpgradeView(state).available ? this.#activateGuardRules(state) : state;
      if (this.#caseRulesByDefault && this.#caseItemUpgradeView(activated).available) activated = this.#activateCaseItems(activated);
      return this.#view(activated);
    });
  }
  rewind({ turnId, expectedGeneration, expectedRevision } = {}) {
    return this.#transaction(() => {
      const current = this.#state();
      if (expectedGeneration !== current.generation || expectedRevision !== current.revision) fail('STALE_GENERATION', '页面状态已过期，请刷新后选择楼层。');
      if (typeof turnId !== 'string' || !(current.turnIds || []).includes(turnId)) fail('INVALID_TURN', '只能回溯当前记录中的有效楼层。');
      this.#validateRestored(current);
      const row = this.#db.prepare('SELECT before_state FROM prologue_turns WHERE id=?').get(turnId);
      if (!row) fail('INVALID_TURN', '行动楼层不存在，未修改当前进度。');
      const restored = parseState(row.before_state);
      this.#validateRestored(restored);
      // Rewinding story decisions does not undo a player's cosmetic preference.
      if (current.playerAvatarId) restored.playerAvatarId = current.playerAvatarId;
      else delete restored.playerAvatarId;
      restored.restoredFrom = { generation: restored.generation, revision: restored.revision };
      restored.generation = current.generation + 1;
      restored.revision = current.revision + 1;
      this.#write(restored, 'rewind');
      if (restored.exampleId === 'agent') this.#dice.restoreTurn(turnId, this.#domain.scope(restored));
      return this.#view(restored);
    });
  }
  close() { if (!this.#closed) { this.#agentJobs.close(); this.#db.close(); this.#closed = true; this.#preparations = new WeakMap(); } }
}
