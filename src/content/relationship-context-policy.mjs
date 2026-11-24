import { ADMISSION_RUNTIME_REVISION } from '../agents/ordinary-admission32.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION, EVENT_DIRECTOR_POLICY_REF } from '../director/director-event-runtime.mjs';
import { PUBLICATION_RUNTIME_REVISION } from '../scenes/ordinary-publication31.mjs';
import { CAPACITY_RUNTIME_REVISION } from './ordinary-capacity30.mjs';
export { CAPACITY_RUNTIME_REVISION } from './ordinary-capacity30.mjs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
// Pure, finite policy. Eligibility is not a persisted execution identity.
export const RELATIONSHIP_RUNTIME_REVISION = 'agent-prison-runtime@10';
export const INTENT_RUNTIME_REVISION = 'agent-prison-runtime@11';
export const CASE_BOUNDARY_RUNTIME_REVISION = 'agent-prison-runtime@12';
export const SOFT_RUNTIME_REVISION = 'agent-prison-runtime@13';
export const EXPLICIT_INTENT_RUNTIME_REVISION = 'agent-prison-runtime@14';
export const ORDINARY_PLAN_RUNTIME_REVISION = 'agent-prison-runtime@15';
export const SEMANTIC_ORDINARY_RUNTIME_REVISION = 'agent-prison-runtime@16';
export const SEMANTIC_ADMISSION_RUNTIME_REVISION = 'agent-prison-runtime@17';
export const INTENT_OBJECT_RUNTIME_REVISION = 'agent-prison-runtime@18';
export const EXPLICIT_STANDARD_RUNTIME_REVISION = 'agent-prison-runtime@19';
export const PLAN_CARDINALITY_RUNTIME_REVISION = 'agent-prison-runtime@20';
export const UNIQUE_RECIPIENT_RUNTIME_REVISION = 'agent-prison-runtime@21';
export const ATOMIC_SOURCE_RUNTIME_REVISION = 'agent-prison-runtime@22';
export const LOSSLESS_PLAN_RUNTIME_REVISION = 'agent-prison-runtime@23';
export const ATOMIC_PLAN_RUNTIME_REVISION = 'agent-prison-runtime@24';
export const SOFT_REFERENCE_RUNTIME_REVISION = 'agent-prison-runtime@25';
export const SCREEN_BROADCAST_RUNTIME_REVISION = 'agent-prison-runtime@26';
export const SOURCE_ACQUISITION_RUNTIME_REVISION = 'agent-prison-runtime@27';
export const TRUSTED_COMMUNICATION_RUNTIME_REVISION = 'agent-prison-runtime@28';
export const KNOWN_TARGET_RUNTIME_REVISION = 'agent-prison-runtime@29';
const runtimeId = value => typeof value === 'string' ? value
  : value?.agentRuntimeRevision ?? value?.executionRevision?.revisionId ?? value?.id ?? value?.revisionId;
export const hasIntentAdmissionRuntime = value => [SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(runtimeId(value));
export const hasSemanticOrdinaryRuntime = value => [SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(runtimeId(value));
export const hasSoftRuntime = value => [SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(typeof value === 'string' ? value
  : value?.agentRuntimeRevision ?? value?.executionRevision?.revisionId ?? value?.id);
export const hasIntentRuntime = value => [INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(typeof value === 'string' ? value
  : value?.agentRuntimeRevision ?? value?.executionRevision?.revisionId ?? value?.id);
export const RELATIONSHIP_CONTEXT_VERSION = 1;
export const RELATIONSHIP_CONTEXT_BUDGETS = Object.freeze({
  playerRecall: 65536, roleplay: 131072, player_performance: 196608,
  narrative: 131072, gateway: 262144,
});
export const RELATIONSHIP_GOAL_CHARS = 513;
export const RELATIONSHIP_VALUE_CHARS = 500;
export const RELATIONSHIP_DISPLAY_CHARS = 1024;
const fail = () => { throw Object.assign(new Error('关系上下文策略或封存水位不一致。'), { code: 'INVALID_RELATIONSHIP_SOURCE' }); };
export const isRelationshipRuntime = value => [RELATIONSHIP_RUNTIME_REVISION, INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(typeof value === 'string' ? value
  : value?.agentRuntimeRevision ?? value?.executionRevision?.revisionId ?? value?.id);
export function relationshipContextPin(value) {
  const descriptor = value && Object.getOwnPropertyDescriptor(value, 'relationshipContextVersion');
  if (descriptor && (!Object.hasOwn(descriptor, 'value') || descriptor.value !== RELATIONSHIP_CONTEXT_VERSION)) fail();
  return descriptor ? { relationshipContextVersion: RELATIONSHIP_CONTEXT_VERSION } : {};
}
export const hasRelationshipContext = value => relationshipContextPin(value).relationshipContextVersion === RELATIONSHIP_CONTEXT_VERSION;
export const relationshipRuntimePin = value => isRelationshipRuntime(value) ? { relationshipContextVersion: RELATIONSHIP_CONTEXT_VERSION } : {};
export function relationshipCanonicalJson(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(relationshipCanonicalJson).join(',')}]`;
  if (value && Object.getPrototypeOf(value) === Object.prototype) return `{${Object.keys(value).sort()
    .map(key => `${JSON.stringify(key)}:${relationshipCanonicalJson(value[key])}`).join(',')}}`;
  fail();
}
// Whole entries only. Even slots provide the fair ring; odd slots prefer a
// genuine sealed-prefix counterpart, with stable author-order ties/fallback.
export function selectRelationshipWindow(entries, { ordinal, targetIds = [] } = {}) {
  if (!Array.isArray(entries) || entries.length > 16 || !Number.isSafeInteger(ordinal) || ordinal < 0
    || !Array.isArray(targetIds) || targetIds.some(id => typeof id !== 'string')) fail();
  if (!entries.length) return [];
  const ordered = [...entries].sort((a, b) => a.entryIndex - b.entryIndex);
  if (ordered.some((row, index) => !Number.isSafeInteger(row.entryIndex) || row.entryIndex < 0 || row.entryIndex > 15
    || (index && ordered[index - 1].entryIndex === row.entryIndex) || !Array.isArray(row.actorIds))) fail();
  const fair = ordered[Math.floor(ordinal / 2) % ordered.length];
  const relevant = ordinal % 2 ? ordered.filter(row => row.actorIds.some(id => targetIds.includes(id))) : [];
  return [relevant.length ? relevant[Math.floor(ordinal / 2) % relevant.length] : fair];
}

// The old @10 verifier and its release bytes stay untouched. This explicit
// @11 leaf verifies REAL rows; no relabelled snapshot, manifest or fake seal.
export function verifyIntentRelationshipRootRows({ run, root, setup } = {}) {
  const runFields = ['run_id', 'root_seed', 'rng_version', 'scenario_ref', 'rules_ref', 'initial_config_hash',
    'initial_setup_ref', 'random_lineage_ref', 'seed_origin', 'schema_version'];
  const commitFields = ['commit_ref', 'run_id', 'branch_id', 'parent_commit_ref', 'previous_execution_ref', 'sequence',
    'generation', 'revision', 'world_time', 'kind', 'causal_key', 'snapshot_json', 'snapshot_hash', 'story_fingerprint',
    'turn_depth', 'legacy_event_id', 'schema_version'];
  const sha = value => createHash('sha256').update(value).digest('hex');
  const integrity = (row, fields) => sha(relationshipCanonicalJson(Object.fromEntries(fields.map(key => [key, row[key]]))));
  if (!run || !root || !setup || run.schema_version !== 1 || root.schema_version !== 1 || setup.schema_version !== 1
    || root.run_id !== run.run_id || setup.run_id !== run.run_id || setup.setup_ref !== run.initial_setup_ref
    || root.parent_commit_ref !== null || root.sequence !== 0 || !['initial', 'new_game'].includes(root.kind)
    || integrity(run, runFields) !== run.integrity_hash || integrity(root, commitFields) !== root.integrity_hash
    || sha(root.snapshot_json) !== root.snapshot_hash) fail();
  let snapshot, manifest, configuration;
  try { snapshot = JSON.parse(root.snapshot_json); manifest = JSON.parse(setup.manifest); configuration = JSON.parse(setup.configuration); } catch { fail(); }
  const expected = { exampleId: snapshot.exampleId, ...(snapshot.creation ? { creation: structuredClone(snapshot.creation) } : {}),
    ...(snapshot.customAbilitySetup ? { customAbilitySetup: structuredClone(snapshot.customAbilitySetup) } : {}) };
  if (expected.creation?.character) delete expected.creation.character.impressionColor;
  if (snapshot.exampleId !== 'agent' || snapshot.agentRuntimeRevision !== INTENT_RUNTIME_REVISION || snapshot.creation?.version !== 2
    || manifest.runId !== run.run_id || manifest.scenarioRef !== run.scenario_ref || manifest.rulesRef !== run.rules_ref
    || manifest.executionRevision?.revisionId !== INTENT_RUNTIME_REVISION
    || manifest.executionRevision?.policyRef !== 'agent-runtime-policy@11'
    || sha(relationshipCanonicalJson(manifest)) !== run.initial_setup_ref
    || sha(relationshipCanonicalJson(configuration)) !== run.initial_config_hash
    || !isDeepStrictEqual(manifest.configuration, configuration) || !isDeepStrictEqual(configuration, expected)
    || !isDeepStrictEqual(manifest.settingSupplement, snapshot.settingSupplement)) fail();
  return { snapshot, manifest, context: { commitRef: root.commit_ref, runId: run.run_id, setupRef: run.initial_setup_ref } };
}

// New identity verifies its own immutable rows; never relabel an old root.
export function verifyCaseBoundaryRelationshipRootRows({ run, root, setup } = {}) {
  const runFields = ['run_id', 'root_seed', 'rng_version', 'scenario_ref', 'rules_ref', 'initial_config_hash',
    'initial_setup_ref', 'random_lineage_ref', 'seed_origin', 'schema_version'];
  const commitFields = ['commit_ref', 'run_id', 'branch_id', 'parent_commit_ref', 'previous_execution_ref', 'sequence',
    'generation', 'revision', 'world_time', 'kind', 'causal_key', 'snapshot_json', 'snapshot_hash', 'story_fingerprint',
    'turn_depth', 'legacy_event_id', 'schema_version'];
  const sha = value => createHash('sha256').update(value).digest('hex');
  const integrity = (row, fields) => sha(relationshipCanonicalJson(Object.fromEntries(fields.map(key => [key, row[key]]))));
  if (!run || !root || !setup || run.schema_version !== 1 || root.schema_version !== 1 || setup.schema_version !== 1
    || root.run_id !== run.run_id || setup.run_id !== run.run_id || setup.setup_ref !== run.initial_setup_ref
    || root.parent_commit_ref !== null || root.sequence !== 0 || !['initial', 'new_game'].includes(root.kind)
    || integrity(run, runFields) !== run.integrity_hash || integrity(root, commitFields) !== root.integrity_hash
    || sha(root.snapshot_json) !== root.snapshot_hash) fail();
  let snapshot, manifest, configuration;
  try { snapshot = JSON.parse(root.snapshot_json); manifest = JSON.parse(setup.manifest); configuration = JSON.parse(setup.configuration); } catch { fail(); }
  const expected = { exampleId: snapshot.exampleId, ...(snapshot.creation ? { creation: structuredClone(snapshot.creation) } : {}),
    ...(snapshot.customAbilitySetup ? { customAbilitySetup: structuredClone(snapshot.customAbilitySetup) } : {}) };
  if (expected.creation?.character) delete expected.creation.character.impressionColor;
  if (snapshot.exampleId !== 'agent' || snapshot.agentRuntimeRevision !== CASE_BOUNDARY_RUNTIME_REVISION || snapshot.creation?.version !== 2
    || manifest.runId !== run.run_id || manifest.scenarioRef !== run.scenario_ref || manifest.rulesRef !== run.rules_ref
    || manifest.executionRevision?.revisionId !== CASE_BOUNDARY_RUNTIME_REVISION
    || manifest.executionRevision?.policyRef !== 'agent-runtime-policy@12'
    || sha(relationshipCanonicalJson(manifest)) !== run.initial_setup_ref
    || sha(relationshipCanonicalJson(configuration)) !== run.initial_config_hash
    || !isDeepStrictEqual(manifest.configuration, configuration) || !isDeepStrictEqual(configuration, expected)
    || !isDeepStrictEqual(manifest.settingSupplement, snapshot.settingSupplement)) fail();
  return { snapshot, manifest, context: { commitRef: root.commit_ref, runId: run.run_id, setupRef: run.initial_setup_ref } };
}

// Authenticate actual @13/@14 rows under their own matching identities, never aliases.
export function verifySoftRelationshipRootRows({ run, root, setup } = {}) {
  const runFields = ['run_id', 'root_seed', 'rng_version', 'scenario_ref', 'rules_ref', 'initial_config_hash',
    'initial_setup_ref', 'random_lineage_ref', 'seed_origin', 'schema_version'];
  const commitFields = ['commit_ref', 'run_id', 'branch_id', 'parent_commit_ref', 'previous_execution_ref', 'sequence',
    'generation', 'revision', 'world_time', 'kind', 'causal_key', 'snapshot_json', 'snapshot_hash', 'story_fingerprint',
    'turn_depth', 'legacy_event_id', 'schema_version'];
  const sha = value => createHash('sha256').update(value).digest('hex');
  const integrity = (row, fields) => sha(relationshipCanonicalJson(Object.fromEntries(fields.map(key => [key, row[key]]))));
  if (!run || !root || !setup || run.schema_version !== 1 || root.schema_version !== 1 || setup.schema_version !== 1
    || root.run_id !== run.run_id || setup.run_id !== run.run_id || setup.setup_ref !== run.initial_setup_ref
    || root.parent_commit_ref !== null || root.sequence !== 0 || !['initial', 'new_game'].includes(root.kind)
    || integrity(run, runFields) !== run.integrity_hash || integrity(root, commitFields) !== root.integrity_hash
    || sha(root.snapshot_json) !== root.snapshot_hash) fail();
  let snapshot, manifest, configuration;
  try { snapshot = JSON.parse(root.snapshot_json); manifest = JSON.parse(setup.manifest); configuration = JSON.parse(setup.configuration); } catch { fail(); }
  const expected = { exampleId: snapshot.exampleId, ...(snapshot.creation ? { creation: structuredClone(snapshot.creation) } : {}),
    ...(snapshot.customAbilitySetup ? { customAbilitySetup: structuredClone(snapshot.customAbilitySetup) } : {}) };
  if (expected.creation?.character) delete expected.creation.character.impressionColor;
  const revisionId = snapshot.agentRuntimeRevision;
  const policyRefs = { [SOFT_RUNTIME_REVISION]: 'agent-runtime-policy@13',
    [EXPLICIT_INTENT_RUNTIME_REVISION]: 'agent-runtime-policy@14',
    [ORDINARY_PLAN_RUNTIME_REVISION]: 'agent-runtime-policy@15',
    [SEMANTIC_ORDINARY_RUNTIME_REVISION]: 'agent-runtime-policy@16',
    [SEMANTIC_ADMISSION_RUNTIME_REVISION]: 'agent-runtime-policy@17',
    [INTENT_OBJECT_RUNTIME_REVISION]: 'agent-runtime-policy@18',
    [EXPLICIT_STANDARD_RUNTIME_REVISION]: 'agent-runtime-policy@19',
    [PLAN_CARDINALITY_RUNTIME_REVISION]: 'agent-runtime-policy@20',
    [UNIQUE_RECIPIENT_RUNTIME_REVISION]: 'agent-runtime-policy@21',
    [ATOMIC_SOURCE_RUNTIME_REVISION]: 'agent-runtime-policy@22',
    [LOSSLESS_PLAN_RUNTIME_REVISION]: 'agent-runtime-policy@23',
    [ATOMIC_PLAN_RUNTIME_REVISION]: 'agent-runtime-policy@24',
    [SOFT_REFERENCE_RUNTIME_REVISION]: 'agent-runtime-policy@25',
    [SCREEN_BROADCAST_RUNTIME_REVISION]: 'agent-runtime-policy@26', [SOURCE_ACQUISITION_RUNTIME_REVISION]: 'agent-runtime-policy@27', [TRUSTED_COMMUNICATION_RUNTIME_REVISION]: 'agent-runtime-policy@28', [KNOWN_TARGET_RUNTIME_REVISION]: 'agent-runtime-policy@29', [CAPACITY_RUNTIME_REVISION]: 'agent-runtime-policy@30',
    [PUBLICATION_RUNTIME_REVISION]: 'agent-runtime-policy@31', [ADMISSION_RUNTIME_REVISION]: 'agent-runtime-policy@32',
    [EVENT_DIRECTOR_RUNTIME_REVISION]: EVENT_DIRECTOR_POLICY_REF };
  const expectedPolicyRef = Object.hasOwn(policyRefs, revisionId) ? policyRefs[revisionId] : undefined;
  if (!expectedPolicyRef || snapshot.exampleId !== 'agent' || !hasSoftRuntime(revisionId) || snapshot.creation?.version !== 2
    || manifest.runId !== run.run_id || manifest.scenarioRef !== run.scenario_ref || manifest.rulesRef !== run.rules_ref
    || manifest.executionRevision?.revisionId !== revisionId
    || manifest.executionRevision?.policyRef !== expectedPolicyRef
    || sha(relationshipCanonicalJson(manifest)) !== run.initial_setup_ref
    || sha(relationshipCanonicalJson(configuration)) !== run.initial_config_hash
    || !isDeepStrictEqual(manifest.configuration, configuration) || !isDeepStrictEqual(configuration, expected)
    || !isDeepStrictEqual(manifest.settingSupplement, snapshot.settingSupplement)) fail();
  return { snapshot, manifest, context: { commitRef: root.commit_ref, runId: run.run_id, setupRef: run.initial_setup_ref } };
}
