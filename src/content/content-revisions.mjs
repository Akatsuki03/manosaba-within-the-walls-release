import { ADMISSION_RUNTIME_REVISION } from '../agents/ordinary-admission32.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { PUBLICATION_RUNTIME_REVISION } from '../scenes/ordinary-publication31.mjs';
import { ORDINARY_CAPACITY_RUNTIME30_POLICY, ORDINARY_PUBLICATION_RUNTIME31_POLICY, ORDINARY_ADMISSION_RUNTIME32_POLICY, EVENT_DIRECTOR_RUNTIME33_POLICY } from './runtime-policy-snapshots.mjs';
import { CAPACITY_RUNTIME_REVISION } from './ordinary-capacity30.mjs';
import { KNOWN_TARGET_RUNTIME_REVISION } from './relationship-context-policy.mjs';
import { KNOWN_TARGET_RUNTIME29_POLICY } from './runtime-policy-snapshots.mjs';
import { TRUSTED_COMMUNICATION_RUNTIME28_POLICY } from './runtime-policy-snapshots.mjs';
import { TRUSTED_COMMUNICATION_RUNTIME_REVISION } from './relationship-context-policy.mjs';
import {SOURCE_ACQUISITION_RUNTIME27_POLICY} from './runtime-policy-snapshots.mjs';
import {SOURCE_ACQUISITION_RUNTIME_REVISION} from './relationship-context-policy.mjs';
import {SCREEN_BROADCAST_RUNTIME26_POLICY} from './runtime-policy-snapshots.mjs';
import {SCREEN_BROADCAST_RUNTIME_REVISION} from './relationship-context-policy.mjs';
import { INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, hasIntentRuntime } from './relationship-context-policy.mjs';
import { PUBLISHED_RUNTIME13_POLICY, EXPLICIT_INTENT_RUNTIME14_POLICY, GROUNDED_ORDINARY_RUNTIME15_POLICY, SEMANTIC_ORDINARY_RUNTIME16_POLICY, SEMANTIC_ADMISSION_RUNTIME17_POLICY, INTENT_OBJECT_RUNTIME18_POLICY, EXPLICIT_STANDARD_RUNTIME19_POLICY, PLAN_CARDINALITY_RUNTIME20_POLICY, UNIQUE_RECIPIENT_RUNTIME21_POLICY, ATOMIC_SOURCE_RUNTIME22_POLICY, LOSSLESS_PLAN_RUNTIME23_POLICY, ATOMIC_PLAN_RUNTIME24_POLICY, SOFT_REFERENCE_RUNTIME25_POLICY } from './runtime-policy-snapshots.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { compilePsychologyProfiles } from '../cognition/psychology-profile.mjs';
import { isDeepStrictEqual } from 'node:util';
import { AGENT_CONTENT_PACKAGE } from './agent-scenario.mjs';
import { KNOWLEDGE_FINGERPRINT } from '../characters/actor-knowledge-policy.mjs';
import { ACTOR_PERFORMANCE_POLICY_HASH } from '../agents/actor-performance-policy.mjs';
import { CURFEW_FINGERPRINT } from '../world/curfew-policy.mjs';
import { IDENTITY_ASSERTION_FINGERPRINT } from '../characters/identity-assertion-policy.mjs';
import { RECEPTION_INTRODUCTION_FINGERPRINT } from '../characters/reception-introduction-policy.mjs';
import { CASE_ONE_V2_HASH, CASE_ONE_KNOWLEDGE_FINGERPRINT } from '../cases/case-knowledge-policy.mjs';
import { guardRuleReference } from '../world/guard-rules.mjs';
import { RP_FOUNDATION_RUNTIME_REVISION } from './runtime-capabilities.mjs';
import { RELATIONSHIP_RUNTIME_REVISION, RELATIONSHIP_CONTEXT_BUDGETS, relationshipContextPin } from './relationship-context-policy.mjs';
import { assertInitialRunPolicy } from './initial-run-policy.mjs';
export { RELATIONSHIP_RUNTIME_REVISION, INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION } from './relationship-context-policy.mjs';
export { RP_FOUNDATION_RUNTIME_REVISION } from './runtime-capabilities.mjs';
export { guardRuleReference } from '../world/guard-rules.mjs';

// This is an audited historical identity, NOT an alias for whatever happens to
// compile today. The original declared files remain its immutable release assets.
// A changed authoring document needs a new entry/path before it can be supported.
export const LEGACY_RUNTIME_REVISION = 'agent-prison-runtime@1';
export const V2_RUNTIME_REVISION = 'agent-prison-runtime@2';
// Low-level fixture callers keep their historical default. The live server
// explicitly chooses CURRENT_RUNTIME_REVISION for newly created runs only.
export const DEFAULT_RUNTIME_REVISION = LEGACY_RUNTIME_REVISION;
export const V3_RUNTIME_REVISION = 'agent-prison-runtime@3';
export const V4_RUNTIME_REVISION = 'agent-prison-runtime@4';
export const V5_RUNTIME_REVISION = 'agent-prison-runtime@5';
export const V6_RUNTIME_REVISION = 'agent-prison-runtime@6';
export const V7_RUNTIME_REVISION = 'agent-prison-runtime@7';
export const CURRENT_RUNTIME_REVISION = 'agent-prison-runtime@8';
const LEGACY_CONTENT_FINGERPRINT = '84ca8ef6d316a091dcd649112634495b227c6ff8356e15e6126797100a7b1ac9';
const LEGACY_SCENARIO_HASH = '33f2062f4ca0611e043be63a6996c47d522788dc2e1505fcea5e16571df93c24';
const LEGACY_WORLD_HASH = '4fb0abb75eb119e48f2395dcead8ced3edeb0d86de894de146badb6d835171d9';
const LEGACY_CASE_HASH = 'dc3ca8f08b30fbcbeabeb2ef370f0833d8c369f72c5df6d1672fafd9dd64698e';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = () => { throw Object.assign(new Error('所需的内容或执行修订缺失、未知或无法唯一确定；原始进度保持不变。'), { code: 'SOURCE_VERSION_MISMATCH' }); };
const plain = value => value !== null && Object.getPrototypeOf(value) === Object.prototype;
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9@._:/-]{0,127}$/u.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
const contentReference = pack => freeze({ schemaVersion: 1, identity: pack.identity, fingerprint: pack.fingerprint });
function actors(pack) {
  // Deliberately repeat the public-to-owner allowlist rather than spread a host
  // document. New host fields can never become model-visible by accident.
  return pack.host.scenario.actors.map(actor => ({
    id: actor.id, name: actor.name,
    persona: { name: actor.persona.name, voice: actor.persona.voice,
      values: [...actor.persona.values], boundaries: [...actor.persona.boundaries] },
    initialKnowledge: [...actor.initialKnowledge], appearance: actor.appearance,
    locationId: actor.locationId, communication: actor.communication,
  }));
}
function supportsScenario(revision, scenarioRef) {
  return scenarioRef === `${revision.scenarioRef}:${revision.scenarioHash}`
    || [1, 2].some(loop => scenarioRef === `player-prison-setup@1:loop-${loop}:${revision.scenarioHash}`)
    || scenarioRef === `loop-one-case-one@1:${revision.caseOneHash}`;
}

/** Host-only, append-at-construction registry. There is no mutable "current"
 * slot, runtime registration, SQL rewrite, guessed fallback or actor lookup of
 * another actor's private data. Each resolution returns the same frozen value.
 * Compiler results and policy declarations are trusted authored inputs only.
 */
export class ContentRevisionRegistry {
  #revisions = new Map();
  constructor(entries) {
    if (!Array.isArray(entries) || !entries.length || entries.length > 33) fail();
    for (const entry of entries) {
      if (!plain(entry) || Object.keys(entry).some(key => !['id', 'content', 'policy', 'caseOneHash', 'legacyCompatible', 'psychology'].includes(key))
        || !['id', 'content', 'policy', 'caseOneHash', 'legacyCompatible'].every(key => Object.hasOwn(entry, key))
        || !identifier(entry.id) || this.#revisions.has(entry.id) || !entry.content?.ok
        || !hash(entry.content.fingerprint) || entry.content.identity !== `sha256:${entry.content.fingerprint}`
        || entry.content.manifest?.identity !== entry.content.identity || !hash(entry.caseOneHash)
        || !plain(entry.policy) || !identifier(entry.policy.ref) || typeof entry.legacyCompatible !== 'boolean') fail();
      const content = freeze(structuredClone(entry.content));
      const sourceHash = file => content.manifest.sources.find(source => source.file === file)?.sha256;
      const scenarioHash = sourceHash('data/agent-scenario.json');
      const worldHash = sourceHash('data/prison-world.json');
      if (!hash(scenarioHash) || !hash(worldHash) || !identifier(content.host.scenario.scenarioRef)) fail();
      const policy = freeze(structuredClone(entry.policy));
      const psychology = entry.psychology === undefined ? undefined : freeze(structuredClone(entry.psychology));
      if (policy.psychologicalInitialization === 1 && (!psychology || psychology.fingerprint !== policy.psychologyFingerprint)) fail();
      if (policy.psychologicalInitialization !== 1 && psychology !== undefined) fail();
      const executionRevision = freeze({ schemaVersion: 1, revisionId: entry.id,
        policyRef: policy.ref, policyFingerprint: digest(policy) });
      const revision = freeze({ id: entry.id, content, contentPackage: contentReference(content), policy, executionRevision,
        scenarioRef: content.host.scenario.scenarioRef, scenarioHash, worldHash, caseOneHash: entry.caseOneHash,
        legacyCompatible: entry.legacyCompatible, actors: actors(content), ...(psychology ? { psychology } : {}) });
      this.#revisions.set(entry.id, revision);
    }
    Object.freeze(this);
  }
  get(id) {
    if (!identifier(id) || !this.#revisions.has(id)) fail();
    return this.#revisions.get(id);
  }
  /** Resolve an immutable domain setup. Absence of a package pin is evidence of
   * an old format, not permission to attach the latest installed author data.
   * Only one explicitly audited legacy entry may satisfy ALL surviving pins.
   */
  resolve({ scenarioRef, contentPackage, executionRevision } = {}) {
    const candidates = [...this.#revisions.values()].filter(revision => {
      if (!supportsScenario(revision, scenarioRef)) return false;
      if (contentPackage !== undefined && !isDeepStrictEqual(contentPackage, revision.contentPackage)) return false;
      return executionRevision === undefined ? revision.legacyCompatible
        : isDeepStrictEqual(executionRevision, revision.executionRevision);
    });
    if (candidates.length !== 1) fail();
    return candidates[0];
  }
  forState(state) {
    if (!plain(state) || state.exampleId !== 'agent' || !hash(state.agentScenarioHash)) fail();
    const explicit = Object.hasOwn(state, 'agentRuntimeRevision');
    const candidates = [...this.#revisions.values()].filter(revision =>
      (explicit ? revision.id === state.agentRuntimeRevision : revision.legacyCompatible)
      && revision.scenarioHash === state.agentScenarioHash
      && (!state.agentWorld || state.agentWorld.sourceHash === revision.worldHash)
      && (!state.caseOne || state.caseOne.sourceHash === revision.caseOneHash));
    if (candidates.length !== 1) fail();
    return candidates[0];
  }
}

if (AGENT_CONTENT_PACKAGE.fingerprint !== LEGACY_CONTENT_FINGERPRINT
  || AGENT_CONTENT_PACKAGE.manifest.sources.find(source => source.file === 'data/agent-scenario.json')?.sha256 !== LEGACY_SCENARIO_HASH
  || AGENT_CONTENT_PACKAGE.manifest.sources.find(source => source.file === 'data/prison-world.json')?.sha256 !== LEGACY_WORLD_HASH) fail();

const psychologyV1 = compilePsychologyProfiles(readFileSync(new URL('../../data/psychology-profiles-v1.json', import.meta.url)), AGENT_CONTENT_PACKAGE);

export const CONTENT_REVISIONS = new ContentRevisionRegistry([{
  id: LEGACY_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: LEGACY_CASE_HASH, legacyCompatible: true,
  // These paths still implement the original branches. Adding a new policy
  // requires a separate dispatch branch, not changing what these IDs mean.
  policy: { ref: 'agent-runtime-policy@1', narrativeVersions: [1, 2, 3, 4, 5],
    agentPlayVersion: 2, causalVersion: 1, causalTimingVersion: 1,
    psychologicalInitialization: 0, conversationVersion: 0,
    initialDecisionState: 'persona-values@1', creationRules: 'player-creation-rules@1',
    npcDecision: 'single-snapshot@1', sourceIds: 'owner-suffixed@1' },
}, {
  id: V2_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: LEGACY_CASE_HASH, legacyCompatible: false,
  psychology: psychologyV1,
  policy: { ref: 'agent-runtime-policy@2', narrativeVersions: [4, 5, 6],
    agentPlayVersion: 3, causalVersion: 1, causalTimingVersion: 1, sceneBeatVersion: 1,
    psychologicalInitialization: 1, psychologyFingerprint: psychologyV1.fingerprint, conversationVersion: 1,
    initialDecisionState: 'causal-psychology@1', creationRules: 'player-creation-rules@1',
    situationalGoalTemplates: 'pending-social-request@1',
    npcDecision: 'ordered-scene-beats@1', sourceIds: 'opaque-owner-event@1',
    sceneBudget: { beats: 3, actors: 3, decisions: 6, perActor: 2, subjectiveChanges: 6, relationshipDistance: 1,
      utteranceChars: 240, actionChars: 240, publicEventChars: 4200 },
    sceneExecutionBudget: { softDurationMs: 60000, hardDurationMs: 180000, compositionReserveMs: 30000 },
    conversationBudget: { sessionsPerActor: 2, openRequestsPerActor: 4, ttl: 300, reviewDelay: 30 },
  },
}, {
  id: V3_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: LEGACY_CASE_HASH, legacyCompatible: false,
  psychology: psychologyV1,
  policy: { ref: 'agent-runtime-policy@3', narrativeVersions: [4, 5, 6],
    agentPlayVersion: 3, causalVersion: 1, causalTimingVersion: 1, sceneBeatVersion: 1,
    psychologicalInitialization: 1, psychologyFingerprint: psychologyV1.fingerprint, conversationVersion: 1,
    initialDecisionState: 'causal-psychology@1', creationRules: 'player-creation-rules@1',
    situationalGoalTemplates: 'pending-social-request@1',
    npcDecision: 'ordered-scene-beats@1', schedulingPolicy: 'ensemble-rotation@1', sourceIds: 'opaque-owner-event@1',
    sceneBudget: { beats: 3, actors: 4, decisions: 8, perActor: 2, subjectiveChanges: 6, relationshipDistance: 1,
      utteranceChars: 240, actionChars: 240, publicEventChars: 4200 },
    sceneExecutionBudget: { softDurationMs: 90000, hardDurationMs: 180000, compositionReserveMs: 20000 },
    conversationBudget: { sessionsPerActor: 2, openRequestsPerActor: 4, ttl: 300, reviewDelay: 30 },
  },
}, {
  id: V4_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1,
  policy: { ref: 'agent-runtime-policy@4', narrativeVersions: [4, 5, 6],
    agentPlayVersion: 3, causalVersion: 1, causalTimingVersion: 1, sceneBeatVersion: 1,
    psychologicalInitialization: 1, psychologyFingerprint: psychologyV1.fingerprint, conversationVersion: 1,
    knowledgeVersion: 1, knowledgeFingerprint: KNOWLEDGE_FINGERPRINT,
    caseKnowledgeFingerprint: CASE_ONE_KNOWLEDGE_FINGERPRINT, introductionVersion: 4,
    performancePolicyFingerprint: ACTOR_PERFORMANCE_POLICY_HASH,
    initialDecisionState: 'causal-psychology@1', creationRules: 'player-creation-rules@1',
    situationalGoalTemplates: 'pending-social-request@1',
    npcDecision: 'ordered-scene-beats@1', schedulingPolicy: 'ensemble-rotation@1', sourceIds: 'opaque-owner-event@1',
    sceneBudget: { beats: 3, actors: 4, decisions: 8, perActor: 2, subjectiveChanges: 6, relationshipDistance: 1,
      utteranceChars: 240, actionChars: 240, publicEventChars: 4200 },
    sceneExecutionBudget: { softDurationMs: 90000, hardDurationMs: 180000, compositionReserveMs: 20000 },
    conversationBudget: { sessionsPerActor: 2, openRequestsPerActor: 4, ttl: 300, reviewDelay: 30 },
  },
}, {
  id: V5_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1,
  policy: { ref: 'agent-runtime-policy@5', narrativeVersions: [4, 5, 6],
    agentPlayVersion: 3, causalVersion: 1, causalTimingVersion: 1, sceneBeatVersion: 1,
    psychologicalInitialization: 1, psychologyFingerprint: psychologyV1.fingerprint, conversationVersion: 1,
    knowledgeVersion: 1, knowledgeFingerprint: KNOWLEDGE_FINGERPRINT,
    caseKnowledgeFingerprint: CASE_ONE_KNOWLEDGE_FINGERPRINT, introductionVersion: 4,
    performancePolicyFingerprint: ACTOR_PERFORMANCE_POLICY_HASH,
    curfewVersion: 1, curfewFingerprint: CURFEW_FINGERPRINT,
    initialDecisionState: 'causal-psychology@1', creationRules: 'player-creation-rules@1',
    situationalGoalTemplates: 'pending-social-request@1',
    npcDecision: 'ordered-scene-beats@1', schedulingPolicy: 'ensemble-rotation@1', sourceIds: 'opaque-owner-event@1',
    sceneBudget: { beats: 3, actors: 4, decisions: 8, perActor: 2, subjectiveChanges: 6, relationshipDistance: 1,
      utteranceChars: 240, actionChars: 240, publicEventChars: 4200 },
    sceneExecutionBudget: { softDurationMs: 90000, hardDurationMs: 180000, compositionReserveMs: 20000 },
    conversationBudget: { sessionsPerActor: 2, openRequestsPerActor: 4, ttl: 300, reviewDelay: 30 },
  },
}, {
  id: V6_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1,
  policy: { ref: 'agent-runtime-policy@6', narrativeVersions: [4, 5, 6],
    agentPlayVersion: 3, causalVersion: 1, causalTimingVersion: 1, sceneBeatVersion: 1,
    psychologicalInitialization: 1, psychologyFingerprint: psychologyV1.fingerprint, conversationVersion: 1,
    knowledgeVersion: 1, knowledgeFingerprint: KNOWLEDGE_FINGERPRINT,
    identityAssertionVersion: 2, identityAssertionFingerprint: IDENTITY_ASSERTION_FINGERPRINT,
    caseKnowledgeFingerprint: CASE_ONE_KNOWLEDGE_FINGERPRINT, introductionVersion: 4,
    performancePolicyFingerprint: ACTOR_PERFORMANCE_POLICY_HASH,
    curfewVersion: 1, curfewFingerprint: CURFEW_FINGERPRINT,
    initialDecisionState: 'causal-psychology@1', creationRules: 'player-creation-rules@1',
    situationalGoalTemplates: 'pending-social-request@1',
    npcDecision: 'ordered-scene-beats@1', schedulingPolicy: 'ensemble-rotation@1', sourceIds: 'opaque-owner-event@1',
    sceneBudget: { beats: 3, actors: 4, decisions: 8, perActor: 2, subjectiveChanges: 6, relationshipDistance: 1,
      utteranceChars: 240, actionChars: 240, publicEventChars: 4200 },
    sceneExecutionBudget: { softDurationMs: 90000, hardDurationMs: 180000, compositionReserveMs: 20000 },
    conversationBudget: { sessionsPerActor: 2, openRequestsPerActor: 4, ttl: 300, reviewDelay: 30 },
  },
}, {
  id: V7_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1,
  policy: { ref: 'agent-runtime-policy@7', narrativeVersions: [4, 5, 6],
    agentPlayVersion: 3, causalVersion: 1, causalTimingVersion: 1, sceneBeatVersion: 1,
    psychologicalInitialization: 1, psychologyFingerprint: psychologyV1.fingerprint, conversationVersion: 1,
    knowledgeVersion: 1, knowledgeFingerprint: KNOWLEDGE_FINGERPRINT,
    identityAssertionVersion: 2, identityAssertionFingerprint: IDENTITY_ASSERTION_FINGERPRINT,
    caseKnowledgeFingerprint: CASE_ONE_KNOWLEDGE_FINGERPRINT, introductionVersion: 4,
    performancePolicyFingerprint: ACTOR_PERFORMANCE_POLICY_HASH,
    curfewVersion: 1, curfewFingerprint: CURFEW_FINGERPRINT,
    receptionIntroductionVersion: 1, receptionIntroductionFingerprint: RECEPTION_INTRODUCTION_FINGERPRINT,
    initialDecisionState: 'causal-psychology@1', creationRules: 'player-creation-rules@1',
    situationalGoalTemplates: 'pending-social-request@1',
    npcDecision: 'ordered-scene-beats@1', schedulingPolicy: 'ensemble-rotation@1', sourceIds: 'opaque-owner-event@1',
    sceneBudget: { beats: 3, actors: 4, decisions: 8, perActor: 2, subjectiveChanges: 6, relationshipDistance: 1,
      utteranceChars: 240, actionChars: 240, publicEventChars: 4200 },
    sceneExecutionBudget: { softDurationMs: 90000, hardDurationMs: 180000, compositionReserveMs: 20000 },
    conversationBudget: { sessionsPerActor: 2, openRequestsPerActor: 4, ttl: 300, reviewDelay: 30 },
  },
}, {
  id: CURRENT_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1,
  policy: { ref: 'agent-runtime-policy@8', narrativeVersions: [4, 5, 6],
    agentPlayVersion: 3, causalVersion: 1, causalTimingVersion: 1, sceneBeatVersion: 1,
    psychologicalInitialization: 1, psychologyFingerprint: psychologyV1.fingerprint, conversationVersion: 1,
    knowledgeVersion: 1, knowledgeFingerprint: KNOWLEDGE_FINGERPRINT,
    identityAssertionVersion: 2, identityAssertionFingerprint: IDENTITY_ASSERTION_FINGERPRINT,
    caseKnowledgeFingerprint: CASE_ONE_KNOWLEDGE_FINGERPRINT, introductionVersion: 4,
    performancePolicyFingerprint: ACTOR_PERFORMANCE_POLICY_HASH,
    playerPerformanceVersion: 2, observationPerformerVersion: 1,
    curfewVersion: 1, curfewFingerprint: CURFEW_FINGERPRINT,
    receptionIntroductionVersion: 1, receptionIntroductionFingerprint: RECEPTION_INTRODUCTION_FINGERPRINT,
    initialDecisionState: 'causal-psychology@1', creationRules: 'player-creation-rules@1',
    situationalGoalTemplates: 'pending-social-request@1',
    npcDecision: 'ordered-scene-beats@1', schedulingPolicy: 'ensemble-rotation@1', sourceIds: 'opaque-owner-event@1',
    sceneBudget: { beats: 3, actors: 4, decisions: 8, perActor: 2, subjectiveChanges: 6, relationshipDistance: 1,
      utteranceChars: 240, actionChars: 240, publicEventChars: 4200 },
    sceneExecutionBudget: { softDurationMs: 90000, hardDurationMs: 180000, compositionReserveMs: 20000 },
    conversationBudget: { sessionsPerActor: 2, openRequestsPerActor: 4, ttl: 300, reviewDelay: 30 },
  },
}, {
  id: RP_FOUNDATION_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1,
  policy: { ref: 'agent-runtime-policy@9', narrativeVersions: [4, 5, 6],
    agentPlayVersion: 3, causalVersion: 1, causalTimingVersion: 1, sceneBeatVersion: 1,
    psychologicalInitialization: 1, psychologyFingerprint: psychologyV1.fingerprint, conversationVersion: 1,
    knowledgeVersion: 1, knowledgeFingerprint: KNOWLEDGE_FINGERPRINT,
    identityAssertionVersion: 2, identityAssertionFingerprint: IDENTITY_ASSERTION_FINGERPRINT,
    caseKnowledgeFingerprint: CASE_ONE_KNOWLEDGE_FINGERPRINT, introductionVersion: 4,
    performancePolicyFingerprint: ACTOR_PERFORMANCE_POLICY_HASH,
    playerPerformanceVersion: 2, observationPerformerVersion: 1,
    curfewVersion: 1, curfewFingerprint: CURFEW_FINGERPRINT,
    receptionIntroductionVersion: 1, receptionIntroductionFingerprint: RECEPTION_INTRODUCTION_FINGERPRINT,
    initialDecisionState: 'causal-psychology@1', creationRules: 'player-creation-rules@2',
    initialRunPolicyVersion: 1, serviceTaskVersion: 1,
    situationalGoalTemplates: 'pending-social-request@1',
    npcDecision: 'ordered-scene-beats@1', schedulingPolicy: 'ensemble-rotation@1', sourceIds: 'opaque-owner-event@1',
    sceneBudget: { beats: 3, actors: 4, decisions: 8, perActor: 2, subjectiveChanges: 6, relationshipDistance: 1,
      utteranceChars: 240, actionChars: 240, publicEventChars: 4200 },
    sceneExecutionBudget: { softDurationMs: 90000, hardDurationMs: 180000, compositionReserveMs: 20000 },
    conversationBudget: { sessionsPerActor: 2, openRequestsPerActor: 4, ttl: 300, reviewDelay: 30 },
  },
}, {
  id: RELATIONSHIP_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1,
  policy: { ref: 'agent-runtime-policy@10', narrativeVersions: [4, 5, 6],
    agentPlayVersion: 3, causalVersion: 1, causalTimingVersion: 1, sceneBeatVersion: 1,
    psychologicalInitialization: 1, psychologyFingerprint: psychologyV1.fingerprint, conversationVersion: 1,
    knowledgeVersion: 1, knowledgeFingerprint: KNOWLEDGE_FINGERPRINT,
    identityAssertionVersion: 2, identityAssertionFingerprint: IDENTITY_ASSERTION_FINGERPRINT,
    caseKnowledgeFingerprint: CASE_ONE_KNOWLEDGE_FINGERPRINT, introductionVersion: 4,
    performancePolicyFingerprint: ACTOR_PERFORMANCE_POLICY_HASH,
    playerPerformanceVersion: 2, observationPerformerVersion: 1,
    curfewVersion: 1, curfewFingerprint: CURFEW_FINGERPRINT,
    receptionIntroductionVersion: 1, receptionIntroductionFingerprint: RECEPTION_INTRODUCTION_FINGERPRINT,
    initialDecisionState: 'causal-psychology@1', creationRules: 'player-creation-rules@2',
    initialRunPolicyVersion: 2, serviceTaskVersion: 2,
    relationshipInitialization: 1, relationshipContextVersion: 1, authoredGoalChars: 513,
    relationshipSourceFingerprint: createHash('sha256').update(readFileSync(new URL('../relationship-setup.mjs', import.meta.url))).digest('hex'),
    relationshipContextBudgets: RELATIONSHIP_CONTEXT_BUDGETS,
    situationalGoalTemplates: 'pending-social-request@1',
    npcDecision: 'ordered-scene-beats@1', schedulingPolicy: 'ensemble-rotation@1', sourceIds: 'opaque-owner-event@1',
    sceneBudget: { beats: 3, actors: 4, decisions: 8, perActor: 2, subjectiveChanges: 6, relationshipDistance: 1,
      utteranceChars: 240, actionChars: 240, publicEventChars: 4200 },
    sceneExecutionBudget: { softDurationMs: 90000, hardDurationMs: 180000, compositionReserveMs: 20000 },
    conversationBudget: { sessionsPerActor: 2, openRequestsPerActor: 4, ttl: 300, reviewDelay: 30 },
  },
}, {
  id: INTENT_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1,
  policy: { ref: 'agent-runtime-policy@11', narrativeVersions: [4, 5, 6],
    agentPlayVersion: 3, causalVersion: 1, causalTimingVersion: 1, sceneBeatVersion: 1,
    psychologicalInitialization: 1, psychologyFingerprint: psychologyV1.fingerprint, conversationVersion: 1,
    knowledgeVersion: 1, knowledgeFingerprint: KNOWLEDGE_FINGERPRINT,
    identityAssertionVersion: 2, identityAssertionFingerprint: IDENTITY_ASSERTION_FINGERPRINT,
    caseKnowledgeFingerprint: CASE_ONE_KNOWLEDGE_FINGERPRINT, introductionVersion: 4,
    performancePolicyFingerprint: ACTOR_PERFORMANCE_POLICY_HASH,
    playerPerformanceVersion: 2, observationPerformerVersion: 1,
    curfewVersion: 1, curfewFingerprint: CURFEW_FINGERPRINT,
    receptionIntroductionVersion: 1, receptionIntroductionFingerprint: RECEPTION_INTRODUCTION_FINGERPRINT,
    initialDecisionState: 'causal-psychology@1', creationRules: 'player-creation-rules@2',
    initialRunPolicyVersion: 2, serviceTaskVersion: 3, intentContractVersion: 1,
    relationshipInitialization: 1, relationshipContextVersion: 1, authoredGoalChars: 513,
    relationshipSourceFingerprint: createHash('sha256').update(readFileSync(new URL('../relationship-setup.mjs', import.meta.url))).digest('hex'),
    relationshipContextBudgets: RELATIONSHIP_CONTEXT_BUDGETS,
    situationalGoalTemplates: 'pending-social-request@1',
    npcDecision: 'ordered-scene-beats@1', schedulingPolicy: 'ensemble-rotation@1', sourceIds: 'opaque-owner-event@1',
    sceneBudget: { beats: 3, actors: 4, decisions: 8, perActor: 2, subjectiveChanges: 6, relationshipDistance: 1,
      utteranceChars: 240, actionChars: 240, publicEventChars: 4200 },
    sceneExecutionBudget: { softDurationMs: 90000, hardDurationMs: 180000, compositionReserveMs: 20000 },
    conversationBudget: { sessionsPerActor: 2, openRequestsPerActor: 4, ttl: 300, reviewDelay: 30 },
  },
}, {
  id: CASE_BOUNDARY_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1,
  policy: { ref: 'agent-runtime-policy@12', narrativeVersions: [4, 5, 6],
    agentPlayVersion: 3, causalVersion: 1, causalTimingVersion: 1, sceneBeatVersion: 1,
    psychologicalInitialization: 1, psychologyFingerprint: psychologyV1.fingerprint, conversationVersion: 1,
    knowledgeVersion: 1, knowledgeFingerprint: KNOWLEDGE_FINGERPRINT,
    identityAssertionVersion: 2, identityAssertionFingerprint: IDENTITY_ASSERTION_FINGERPRINT,
    caseKnowledgeFingerprint: CASE_ONE_KNOWLEDGE_FINGERPRINT, introductionVersion: 4,
    performancePolicyFingerprint: ACTOR_PERFORMANCE_POLICY_HASH,
    playerPerformanceVersion: 2, observationPerformerVersion: 1,
    curfewVersion: 1, curfewFingerprint: CURFEW_FINGERPRINT,
    receptionIntroductionVersion: 1, receptionIntroductionFingerprint: RECEPTION_INTRODUCTION_FINGERPRINT,
    initialDecisionState: 'causal-psychology@1', creationRules: 'player-creation-rules@2',
    initialRunPolicyVersion: 2, serviceTaskVersion: 3, intentContractVersion: 1, initialCaseBoundaryVersion: 1,
    initialBoundaryReviewVersion: 1, initialBoundaryPolicyFingerprint: createHash('sha256').update(readFileSync(new URL('../initial-run-policy-v12.mjs', import.meta.url))).digest('hex'),
    relationshipInitialization: 1, relationshipContextVersion: 1, authoredGoalChars: 513,
    relationshipSourceFingerprint: createHash('sha256').update(readFileSync(new URL('../relationship-setup.mjs', import.meta.url))).digest('hex'),
    relationshipContextBudgets: RELATIONSHIP_CONTEXT_BUDGETS,
    situationalGoalTemplates: 'pending-social-request@1',
    npcDecision: 'ordered-scene-beats@1', schedulingPolicy: 'ensemble-rotation@1', sourceIds: 'opaque-owner-event@1',
    sceneBudget: { beats: 3, actors: 4, decisions: 8, perActor: 2, subjectiveChanges: 6, relationshipDistance: 1,
      utteranceChars: 240, actionChars: 240, publicEventChars: 4200 },
    sceneExecutionBudget: { softDurationMs: 90000, hardDurationMs: 180000, compositionReserveMs: 20000 },
    conversationBudget: { sessionsPerActor: 2, openRequestsPerActor: 4, ttl: 300, reviewDelay: 30 },
  },
}, {
  id: SOFT_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: PUBLISHED_RUNTIME13_POLICY,
}, {
  id: EXPLICIT_INTENT_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: EXPLICIT_INTENT_RUNTIME14_POLICY,
}, {
  id: ORDINARY_PLAN_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: GROUNDED_ORDINARY_RUNTIME15_POLICY,
}, {
  id: SEMANTIC_ORDINARY_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: SEMANTIC_ORDINARY_RUNTIME16_POLICY,
}, {
  id: SEMANTIC_ADMISSION_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: SEMANTIC_ADMISSION_RUNTIME17_POLICY,
}, {
  id: INTENT_OBJECT_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: INTENT_OBJECT_RUNTIME18_POLICY,
}, {
  id: EXPLICIT_STANDARD_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: EXPLICIT_STANDARD_RUNTIME19_POLICY,
}, {
  id: PLAN_CARDINALITY_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: PLAN_CARDINALITY_RUNTIME20_POLICY,
}, {
  id: UNIQUE_RECIPIENT_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: UNIQUE_RECIPIENT_RUNTIME21_POLICY,
}, {
  id: ATOMIC_SOURCE_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: ATOMIC_SOURCE_RUNTIME22_POLICY,
}, {
  id: LOSSLESS_PLAN_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: LOSSLESS_PLAN_RUNTIME23_POLICY,
}, {
  id: ATOMIC_PLAN_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: ATOMIC_PLAN_RUNTIME24_POLICY,
}, {
  id: SOFT_REFERENCE_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: SOFT_REFERENCE_RUNTIME25_POLICY,
}, {
  id: SCREEN_BROADCAST_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: SCREEN_BROADCAST_RUNTIME26_POLICY,
}, {
  id: SOURCE_ACQUISITION_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: SOURCE_ACQUISITION_RUNTIME27_POLICY,
}, {
  id: TRUSTED_COMMUNICATION_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: TRUSTED_COMMUNICATION_RUNTIME28_POLICY,
}, {
  id: KNOWN_TARGET_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: KNOWN_TARGET_RUNTIME29_POLICY,
}, {
  id: CAPACITY_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: ORDINARY_CAPACITY_RUNTIME30_POLICY,
}, {
  id: PUBLICATION_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: ORDINARY_PUBLICATION_RUNTIME31_POLICY,
}, {
  id: ADMISSION_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: ORDINARY_ADMISSION_RUNTIME32_POLICY,
}, {
  id: EVENT_DIRECTOR_RUNTIME_REVISION, content: AGENT_CONTENT_PACKAGE, caseOneHash: CASE_ONE_V2_HASH, legacyCompatible: false,
  psychology: psychologyV1, policy: EVENT_DIRECTOR_RUNTIME33_POLICY,
}]);
export const runtimeRevisionForState = state => CONTENT_REVISIONS.forState(state);
export const runtimeRevisionById = id => CONTENT_REVISIONS.get(id);
// A codec marker does NOT authorize a revision/budget. Every wire rebuild must
// match the real immutable definition AND the source-bound initial policy v2.
export function relationshipExecutionPolicy(value) {
  const pin = relationshipContextPin(value);
  if (pin.relationshipContextVersion !== 1) return {};
  const descriptor = Object.getOwnPropertyDescriptor(value, 'executionRevision');
  const id = descriptor?.value?.revisionId;
  const revision = runtimeRevisionById(hasIntentRuntime(id) ? id : RELATIONSHIP_RUNTIME_REVISION);
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || !isDeepStrictEqual(descriptor.value, revision.executionRevision)) fail();
  return { ...pin, executionRevision: revision.executionRevision };
}
export function relationshipPacketPolicy(value, initialPolicy) {
  const pin = relationshipExecutionPolicy(value);
  if (pin.relationshipContextVersion !== 1) return {};
  const policy = assertInitialRunPolicy(initialPolicy);
  if (policy?.version !== 2 || !isDeepStrictEqual(policy.source.executionRevision, pin.executionRevision)) fail();
  return pin;
}

/** Preflight before leasing tasks or calling an adapter. An old unpinned job
 * may continue only under its audited legacy revision; a supplied pin is exact.
 */
export function assertRuntimeJobRevision(state, plan) {
  const revision = runtimeRevisionForState(state);
  const guardRules = guardRuleReference(state);
  if (!plain(plan) || (revision.policy.intentContractVersion ? plan.intentContractVersion !== revision.policy.intentContractVersion : Object.hasOwn(plan, 'intentContractVersion'))
    || !revision.policy.narrativeVersions.includes(plan.version)
    || (revision.policy.playerPerformanceVersion === 2 ? plan.performanceVersion !== 2 : Object.hasOwn(plan, 'performanceVersion'))
    || (plan.contentFingerprint !== undefined && plan.contentFingerprint !== revision.content.fingerprint)
    || (plan.executionRevision !== undefined && !isDeepStrictEqual(plan.executionRevision, revision.executionRevision))
    || (plan.executionRevision === undefined && !revision.legacyCompatible)
    || (guardRules === undefined ? Object.hasOwn(plan, 'guardRules')
      : !Object.hasOwn(plan, 'guardRules') || !isDeepStrictEqual(plan.guardRules, guardRules))) fail();
  return revision;
}
