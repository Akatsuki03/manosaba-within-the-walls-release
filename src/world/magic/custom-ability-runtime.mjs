import { validateCustomAbilityInterpretation, validateCustomAbilityDeclaration, CUSTOM_ABILITY_LAW_PREDICATES } from './custom-ability-contracts.mjs';
import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';

// HOST-only inert mechanism dispatch, NOT a grant, author confirmation, truth
// certificate, actual cast, world patch executor or fulfilled receipt. Actual
// Domain must fetch/verify all metadata from its private current transaction.
// No other in-flight custom-ability module is imported in this isolated slice.
const fail = code => { throw Object.assign(new Error(code), { code }); };
const check = (condition, code = 'CUSTOM_RUNTIME_SCHEMA') => { if (!condition) fail(code); };
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value;
};
export const CUSTOM_ABILITY_RUNTIME_LIMITS = freeze({ depth: 24, nodes: 16000, string: 32768, stringUnits: 131072,
  array: 512, operationNodes: 16, entities: 128, ancestry: 128, priorApplications: 128, clauses: 64 });
function snapshot(input) {
  let nodes = 0, units = 0; const active = new Set();
  const visit = (value, depth) => {
    check(++nodes <= 16000 && depth <= 24, 'CUSTOM_RUNTIME_BUDGET');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'string') { units += value.length;
      check(value.length <= 32768 && units <= 131072, 'CUSTOM_RUNTIME_BUDGET'); check(value.isWellFormed()); return value; }
    if (typeof value === 'number') { check(Number.isSafeInteger(value) && value >= 0); return value; }
    check(typeof value === 'object' && !isProxy(value) && !active.has(value), 'CUSTOM_RUNTIME_NON_JSON');
    const array = Array.isArray(value);
    check(Object.getPrototypeOf(value) === (array ? Array.prototype : Object.prototype), 'CUSTOM_RUNTIME_NON_JSON');
    active.add(value); const keys = Reflect.ownKeys(value); let out;
    if (array) {
      const length = Object.getOwnPropertyDescriptor(value, 'length').value;
      check(length <= 512, 'CUSTOM_RUNTIME_BUDGET'); check(keys.length === length + 1, 'CUSTOM_RUNTIME_NON_JSON'); out = [];
      for (let i = 0; i < length; i++) {
        const field = Object.getOwnPropertyDescriptor(value, String(i));
        check(field?.enumerable && Object.hasOwn(field, 'value'), 'CUSTOM_RUNTIME_NON_JSON'); out.push(visit(field.value, depth + 1));
      }
    } else {
      out = {};
      for (const key of keys) {
        check(typeof key === 'string' && !['__proto__', 'prototype', 'constructor'].includes(key), 'CUSTOM_RUNTIME_NON_JSON');
        units += key.length; check(key.length <= 192 && units <= 131072, 'CUSTOM_RUNTIME_BUDGET');
        const field = Object.getOwnPropertyDescriptor(value, key);
        check(field?.enumerable && Object.hasOwn(field, 'value'), 'CUSTOM_RUNTIME_NON_JSON'); out[key] = visit(field.value, depth + 1);
      }
    }
    active.delete(value); return out;
  };
  return visit(input, 0);
}
const exact = (row, keys) => check(row && typeof row === 'object' && !Array.isArray(row)
  && Object.keys(row).length === keys.length && keys.every(key => Object.hasOwn(row, key)));
const id = value => check(typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:@._/-]{0,191}$/u.test(value));
const hash = value => check(typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value));
const integer = value => check(Number.isSafeInteger(value) && value >= 0);
const text = value => check(typeof value === 'string' && value.trim().length > 0);
const list = (value, max, min = 0) => check(Array.isArray(value) && value.length >= min && value.length <= max, 'CUSTOM_RUNTIME_BUDGET');
const unique = values => check(new Set(values).size === values.length, 'CUSTOM_RUNTIME_DUPLICATE');
const canonical = value => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value)
  ? `[${value.map(canonical).join(',')}]` : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
const same = (left, right) => canonical(left) === canonical(right);
const reference = row => { exact(row, ['ref', 'version']); id(row.ref); check(row.version >= 1); integer(row.version); };
const definitionRef = row => { exact(row, ['definitionId', 'revision', 'semanticDigest']); id(row.definitionId); integer(row.revision); check(row.revision >= 1); hash(row.semanticDigest); };
const scopeShape = row => {
  exact(row, ['runId', 'branchId', 'headCommitRef', 'generation', 'revision', 'storyTime']);
  ['runId', 'branchId', 'headCommitRef'].forEach(key => id(row[key])); ['generation', 'revision', 'storyTime'].forEach(key => integer(row[key]));
};

// Trusted CODE registry: no registration function, generated JS, callbacks,
// character IDs, cosmetic hashes, uploaded descriptors or approval booleans.
// Constraints describe these adapters, never all fictional power semantics.
export const CUSTOM_ABILITY_MECHANISMS = freeze([
  { ref: 'sound-reproduction', version: 1, operation: 'replay-owned-heard', targetType: 'owned-hearing-observation',
    lifecycle: 'instant', observability: 'actual-local-hearing',
    consumerRefs: ['magic-effects.sound-replay@1', 'magic-host.heard-source-delivery@1'],
    reads: ['owned-observation', 'occupancy', 'body-location'], writes: ['audible-signal', 'owner-observation'],
    adapterConstraint: 'actual-owned-acquired-hearing;actual-local-audience;no-arbitrary-sound-or-remote-source' },
  { ref: 'body-relocation', version: 1, operation: 'relocate-occupied-body', targetType: 'existing-location',
    lifecycle: 'instant', observability: 'departure-arrival',
    consumerRefs: ['magic-effects.spatial-shift@1', 'runtime-room-setter@1', 'magic-host.arrival-departure-delivery@1'],
    reads: ['occupancy', 'body-location', 'existing-location', 'body-inventory'], writes: ['body-location', 'route-invalidation', 'owner-observation'],
    adapterConstraint: 'only-acting-occupied-physical-body;existing-same-island;custody-kept;no-cross-world-implementation' },
]);
export const CUSTOM_ABILITY_RUNTIME_CAPABILITIES = freeze([...new Set(CUSTOM_ABILITY_MECHANISMS.flatMap(row => row.consumerRefs)),
  'domain-private-atomic-publication@1', 'domain-private-current-evidence@1', 'definition-run-binding@1',
  'immutable-effect-history@1', 'owner-local-next-task-delivery@1']);
const registry = new Map(CUSTOM_ABILITY_MECHANISMS.map(row => [`${row.ref}@${row.version}`, row]));
export const CUSTOM_ABILITY_RUNTIME_SCHEMA = freeze({ ref: 'custom-ability-runtime-plan@1', version: 1,
  declarationRef: 'custom-ability-declaration@1', contractRef: 'custom-ability-mechanism-contract@1',
  usePlanRef: 'custom-ability-use-plan@1', authority: 'metadata-only-not-domain-issuance',
  productionIntegrated: false, fulfilled: false });

function validateDeclaration(row) {
  exact(row, ['version', 'definitionId', 'revision', 'authoredText', 'clauses', 'initialState', 'unresolved', 'mechanismRequirements', 'provenance', 'semanticDigest']);
  check(row.version === 1); definitionRef({ definitionId: row.definitionId, revision: row.revision, semanticDigest: row.semanticDigest }); text(row.authoredText);
  list(row.clauses, 64, 1); row.clauses.forEach(clause => {
    exact(clause, ['id', 'text', 'kind']); id(clause.id); text(clause.text);
    check(['domain', 'effect', 'target', 'trigger', 'condition', 'limit', 'lifecycle', 'growth', 'exception', 'unresolved'].includes(clause.kind));
  }); unique(row.clauses.map(clause => clause.id));
  exact(row.initialState, ['stage', 'recognition']); id(row.initialState.stage); check(['known', 'unknown', 'partial'].includes(row.initialState.recognition));
  list(row.unresolved, 64); row.unresolved.forEach(item => { exact(item, ['id', 'question']); id(item.id); text(item.question); }); unique(row.unresolved.map(item => item.id));
  list(row.mechanismRequirements, 16, 1); row.mechanismRequirements.forEach(reference); unique(row.mechanismRequirements.map(item => `${item.ref}@${item.version}`));
  exact(row.provenance, ['draftId', 'draftRevision', 'authoredTextDigest']); id(row.provenance.draftId); integer(row.provenance.draftRevision);
  check(row.provenance.draftRevision >= 1); hash(row.provenance.authoredTextDigest);
  // Digests are pins supplied by the independently confirmed definition store.
  // This module neither reinterprets prose nor authenticates author confirmation.
}
function validateEvidence(evidence, scope) {
  exact(evidence, ['version', 'scope', 'invocation', 'observations', 'bodies', 'locations', 'occupants', 'ancestry']);
  check(evidence.version === 1); scopeShape(evidence.scope); check(same(scope, evidence.scope), 'CUSTOM_RUNTIME_SCOPE');
  const invocation = evidence.invocation;
  exact(invocation, ['mindId', 'bodyId', 'bindingRef', 'eligibilityRef', 'stage', 'recognition']);
  ['mindId', 'bodyId', 'bindingRef', 'eligibilityRef', 'stage'].forEach(key => id(invocation[key]));
  check(['known', 'unknown', 'partial'].includes(invocation.recognition));
  list(evidence.ancestry, 128, 1);
  evidence.ancestry.forEach((commit, index) => {
    exact(commit, ['commitRef', 'parentCommitRef', 'branchId', 'generation', 'revision', 'storyTime']); id(commit.commitRef); id(commit.branchId);
    ['generation', 'revision', 'storyTime'].forEach(key => integer(commit[key]));
    check(commit.parentCommitRef === (index ? evidence.ancestry[index - 1].commitRef : null), 'CUSTOM_RUNTIME_SCOPE');
    check(commit.storyTime <= scope.storyTime && commit.generation <= scope.generation && commit.revision <= scope.revision
      && (!index || commit.storyTime >= evidence.ancestry[index - 1].storyTime), 'CUSTOM_RUNTIME_SCOPE');
  }); unique(evidence.ancestry.map(row => row.commitRef));
  const head = evidence.ancestry.at(-1);
  check(head.commitRef === scope.headCommitRef && head.branchId === scope.branchId && head.generation === scope.generation
    && head.revision === scope.revision && head.storyTime === scope.storyTime, 'CUSTOM_RUNTIME_SCOPE');
  list(evidence.bodies, 128, 1); evidence.bodies.forEach(body => {
    exact(body, ['id', 'islandId', 'locationId', 'alive', 'inventoryIds']); [body.id, body.islandId, body.locationId].forEach(id);
    check(typeof body.alive === 'boolean'); list(body.inventoryIds, 128); body.inventoryIds.forEach(id); unique(body.inventoryIds);
  }); unique(evidence.bodies.map(row => row.id));
  list(evidence.locations, 128, 1); evidence.locations.forEach(location => { exact(location, ['id', 'islandId']); id(location.id); id(location.islandId); });
  unique(evidence.locations.map(row => row.id));
  check(evidence.bodies.every(body => evidence.locations.some(location => location.id === body.locationId && location.islandId === body.islandId)), 'CUSTOM_RUNTIME_TARGET');
  list(evidence.occupants, 128, 1); evidence.occupants.forEach(row => { exact(row, ['bodyId', 'mindId']); id(row.bodyId); id(row.mindId);
    check(evidence.bodies.some(body => body.id === row.bodyId), 'CUSTOM_RUNTIME_TARGET'); });
  unique(evidence.occupants.map(row => row.bodyId)); unique(evidence.occupants.map(row => row.mindId));
  check(evidence.occupants.length === evidence.bodies.length, 'CUSTOM_RUNTIME_TARGET');
  const body = evidence.bodies.find(row => row.id === invocation.bodyId);
  check(body?.alive && evidence.occupants.some(row => row.bodyId === body.id && row.mindId === invocation.mindId), 'CUSTOM_RUNTIME_TARGET');
  list(evidence.observations, 128); evidence.observations.forEach(row => {
    exact(row, ['id', 'ownerMindId', 'channel', 'occurredAt', 'learnedAt', 'eventRef', 'sourceCommitRef', 'sourceEntryRef', 'representationRef', 'acquisitionRef']);
    ['id', 'ownerMindId', 'eventRef', 'sourceCommitRef', 'sourceEntryRef', 'representationRef', 'acquisitionRef'].forEach(key => id(row[key]));
    integer(row.occurredAt); integer(row.learnedAt);
    const source = evidence.ancestry.find(commit => commit.commitRef === row.sourceCommitRef);
    check(row.channel === 'hearing' && row.occurredAt <= row.learnedAt && row.learnedAt <= scope.storyTime
      && source && row.learnedAt <= source.storyTime, 'CUSTOM_RUNTIME_SOURCE');
  }); unique(evidence.observations.map(row => row.id));
}

/** Closed ordered AST checker + trusted mechanism dispatch. Caller metadata is
 * evidence-shaped, not truth. Domain must prove actual definition confirmation,
 * grant/body factor, known mind, eligibility, complete lawful source/audience,
 * current head and transaction before building/reducing any real effect event. */
export function planCustomAbilityUse(raw) {
  const input = snapshot(raw);
  exact(input, ['declaration', 'contract', 'plan', 'evidence', 'consumerCapabilities', 'priorApplications']);
  const { declaration, contract, plan, evidence, consumerCapabilities, priorApplications } = input;
  validateDeclaration(declaration);
  exact(contract, ['version', 'definition', 'nodes']); check(contract.version === 1); definitionRef(contract.definition);
  exact(plan, ['version', 'useId', 'definition', 'scope', 'nodes']); check(plan.version === 1); id(plan.useId); definitionRef(plan.definition); scopeShape(plan.scope);
  const expected = { definitionId: declaration.definitionId, revision: declaration.revision, semanticDigest: declaration.semanticDigest };
  check(same(expected, contract.definition) && same(expected, plan.definition), 'CUSTOM_RUNTIME_DEFINITION');
  list(contract.nodes, 16, 1); list(plan.nodes, 16, 1);
  contract.nodes.forEach(node => {
    exact(node, ['id', 'clauseIds', 'mechanism', 'operation', 'lifecycle', 'observability', 'config']); id(node.id); reference(node.mechanism);
    list(node.clauseIds, 64, 1); node.clauseIds.forEach(id); unique(node.clauseIds);
    check(node.clauseIds.every(ref => declaration.clauses.some(clause => clause.id === ref)), 'CUSTOM_RUNTIME_CLOSURE');
    [node.operation, node.lifecycle, node.observability].forEach(id);
    check(node.config && typeof node.config === 'object' && !Array.isArray(node.config));
    check(declaration.mechanismRequirements.some(ref => same(ref, node.mechanism)), 'CUSTOM_RUNTIME_CLOSURE');
  }); unique(contract.nodes.map(row => row.id));
  check(declaration.clauses.every(clause => contract.nodes.some(node => node.clauseIds.includes(clause.id)))
    && declaration.mechanismRequirements.every(ref => contract.nodes.some(node => same(ref, node.mechanism))), 'CUSTOM_RUNTIME_CLOSURE');
  plan.nodes.forEach(node => {
    exact(node, ['id', 'contractNodeId', 'dependsOn', 'parameters']); id(node.id); id(node.contractNodeId); list(node.dependsOn, 16); node.dependsOn.forEach(id); unique(node.dependsOn);
    check(node.parameters && typeof node.parameters === 'object' && !Array.isArray(node.parameters));
  }); unique(plan.nodes.map(row => row.id)); unique(plan.nodes.map(row => row.contractNodeId));
  check(plan.nodes.length === contract.nodes.length && plan.nodes.every(node => contract.nodes.some(rule => rule.id === node.contractNodeId)), 'CUSTOM_RUNTIME_CLOSURE');
  plan.nodes.forEach((node, index) => check(node.dependsOn.every(dep => plan.nodes.slice(0, index).some(row => row.id === dep)), 'CUSTOM_RUNTIME_DEPENDENCY'));
  validateEvidence(evidence, plan.scope);
  list(consumerCapabilities, 64); consumerCapabilities.forEach(id); unique(consumerCapabilities);
  list(priorApplications, 128); priorApplications.forEach(row => {
    exact(row, ['useId', 'requestDigest', 'applicationRef']); id(row.useId); hash(row.requestDigest); id(row.applicationRef);
  }); unique(priorApplications.map(row => row.useId));
  const requestDigest = digest({ declaration, contract, plan, evidence, consumerCapabilities });
  const base = { type: CUSTOM_ABILITY_RUNTIME_SCHEMA.ref, version: 1, useId: plan.useId, definition: expected, scope: plan.scope,
    requestDigest, authority: CUSTOM_ABILITY_RUNTIME_SCHEMA.authority, productionIntegrated: false, fulfilled: false,
    knowledgeEffects: [], declarationPreserved: { authoredTextDigest: declaration.provenance.authoredTextDigest,
      semanticDigest: declaration.semanticDigest, clauseIds: declaration.clauses.map(row => row.id) },
    privateValidationObligations: { definitionConfirmation: 'resolve-immutable-confirmed-contract-not-caller-digest',
      semanticClauses: declaration.clauses.map(({ id: clauseId, kind }) => ({ clauseId, kind, status: 'requires-confirmed-contract-and-current-evidence' })),
      currentStage: evidence.invocation.stage, stageEligibility: 'private-run-binding-and-contract-check-required',
      currentRecognition: evidence.invocation.recognition, learnedOrSetupSource: 'private-owner-knowledge-check-required',
      triggerConditionsLimitsAndExceptions: 'all-confirmed-clauses-required;not-inferred-from-prose-by-this-dispatcher' } };
  const finish = result => freeze({ ...result, integrity: digest(result) });
  const empty = (status, unsupported = []) => finish({ ...base, status, unsupported, obligations: [], requiredConsumerCapabilities: [],
    readWriteManifest: { reads: [], writes: [] }, receiptObligation: null });
  const previous = priorApplications.find(row => row.useId === plan.useId);
  if (previous) { check(previous.requestDigest === requestDigest, 'CUSTOM_RUNTIME_REPLAY_CONFLICT'); return empty('replay'); }
  if (declaration.unresolved.length || declaration.clauses.some(row => row.kind === 'unresolved')) return empty('needs-clarification');
  const unsupported = [], requirements = new Set(['domain-private-atomic-publication@1', 'domain-private-current-evidence@1',
    'definition-run-binding@1', 'immutable-effect-history@1', 'owner-local-next-task-delivery@1']);
  for (const rule of contract.nodes) {
    const mechanism = registry.get(`${rule.mechanism.ref}@${rule.mechanism.version}`);
    if (!mechanism) { unsupported.push({ contractNodeId: rule.id, mechanism: rule.mechanism, reason: 'mechanism-version-not-implemented' }); continue; }
    mechanism.consumerRefs.forEach(ref => requirements.add(ref));
    if (rule.operation !== mechanism.operation || rule.lifecycle !== mechanism.lifecycle || rule.observability !== mechanism.observability)
      unsupported.push({ contractNodeId: rule.id, mechanism: rule.mechanism, reason: 'operation-lifecycle-observability-consumer-missing' });
    if (mechanism.ref === 'sound-reproduction') { exact(rule.config, ['audience']);
      if (rule.config.audience !== 'actual-local-minds') unsupported.push({ contractNodeId: rule.id, mechanism: rule.mechanism, reason: 'audience-consumer-missing' }); }
    else { exact(rule.config, ['destinationScope']);
      if (rule.config.destinationScope !== 'existing-same-island') unsupported.push({ contractNodeId: rule.id, mechanism: rule.mechanism, reason: 'relocation-scope-consumer-missing' }); }
  }
  for (const ref of requirements) if (!consumerCapabilities.includes(ref)) unsupported.push({ capabilityRef: ref, reason: 'required-consumer-missing' });
  if (unsupported.length) return empty('extension-required', unsupported);
  if (evidence.invocation.recognition !== 'known') return empty('unrecognized');
  const obligations = [], manifestReads = new Set(), manifestWrites = new Set(), completed = new Map();
  const positions = new Map(evidence.bodies.map(body => [body.id, body.locationId]));
  const sourceBodyId = evidence.invocation.bodyId, sourceMindId = evidence.invocation.mindId;
  for (const node of plan.nodes) {
    const rule = contract.nodes.find(row => row.id === node.contractNodeId);
    const inherited = new Set(node.dependsOn.flatMap(dep => [dep, ...completed.get(dep).ancestors]));
    let reads, writes, obligation;
    if (rule.mechanism.ref === 'sound-reproduction') {
      exact(node.parameters, ['observationId', 'audienceMindIds']); id(node.parameters.observationId);
      list(node.parameters.audienceMindIds, 128, 1); node.parameters.audienceMindIds.forEach(id); unique(node.parameters.audienceMindIds);
      const observation = evidence.observations.find(row => row.id === node.parameters.observationId);
      check(observation && observation.ownerMindId === sourceMindId, 'CUSTOM_RUNTIME_SOURCE');
      for (const [priorId, prior] of completed) check(!prior.writes.some(key => key.startsWith('body-location:'))
        || inherited.has(priorId), 'CUSTOM_RUNTIME_DEPENDENCY');
      const local = evidence.occupants.filter(row => evidence.bodies.find(body => body.id === row.bodyId).alive
        && positions.get(row.bodyId) === positions.get(sourceBodyId)).map(row => row.mindId).sort();
      check(same([...node.parameters.audienceMindIds].sort(), local), 'CUSTOM_RUNTIME_AUDIENCE');
      reads = [`owned-observation:${observation.id}`, 'occupancy', ...evidence.bodies.map(body => `body-location:${body.id}`)];
      writes = [`audible-signal:${node.id}`, ...local.map(mind => `owner-observation:${mind}`)];
      obligation = { operation: 'sound-replay', targetId: observation.id,
        payload: { sourceRef: observation.id, audienceMindIds: local }, sourceEvidence: observation,
        observability: { mode: rule.observability, audienceMindIds: local, readSourceText: 'only-after-private-source-authorization' } };
    } else {
      exact(node.parameters, ['bodyId', 'destinationId']); id(node.parameters.bodyId); id(node.parameters.destinationId);
      check(node.parameters.bodyId === sourceBodyId, 'CUSTOM_RUNTIME_TARGET');
      const body = evidence.bodies.find(row => row.id === sourceBodyId), destination = evidence.locations.find(row => row.id === node.parameters.destinationId);
      check(destination && destination.islandId === body.islandId, 'CUSTOM_RUNTIME_TARGET');
      reads = ['occupancy', `body-location:${sourceBodyId}`, `existing-location:${destination.id}`, `body-inventory:${sourceBodyId}`];
      writes = [`body-location:${sourceBodyId}`, `route-invalidation:${sourceMindId}`, `owner-observation:${sourceMindId}`];
      obligation = { operation: 'spatial-shift', targetId: destination.id, payload: {},
        bodyTransition: { bodyId: sourceBodyId, fromLocationId: positions.get(sourceBodyId), toLocationId: destination.id,
          inventoryIds: body.inventoryIds, occupancyChange: 'none', custodyChange: 'none' },
        observability: { mode: rule.observability, deriveAudienceAtSettlement: true } };
    }
    for (const [priorId, prior] of completed) {
      const hazard = prior.writes.some(key => reads.includes(key) || writes.includes(key)) || writes.some(key => prior.reads.includes(key));
      check(!hazard || inherited.has(priorId), 'CUSTOM_RUNTIME_DEPENDENCY');
    }
    if (obligation.bodyTransition) positions.set(sourceBodyId, obligation.bodyTransition.toLocationId);
    reads.forEach(key => manifestReads.add(key)); writes.forEach(key => manifestWrites.add(key)); completed.set(node.id, { reads, writes, ancestors: inherited });
    obligations.push({ type: 'custom-ability-effect-obligation@1', id: `custom-effect:${digest({ requestDigest, nodeId: node.id })}`,
      nodeId: node.id, contractNodeId: rule.id, clauseIds: rule.clauseIds, mechanism: rule.mechanism,
      afterNodeIds: node.dependsOn, sourceBodyId, sourceMindId, at: plan.scope.storyTime, expiresAt: plan.scope.storyTime,
      lifecycle: { mode: 'instant', persistOriginalDefinitionAndMechanismPins: true, retroactiveDefinitionUpdate: false,
        suppressionCheck: 'private-consumer-required', continuationOrEnd: 'not-supported-by-this-instant-adapter' },
      reads, writes, ...obligation });
  }
  return finish({ ...base, status: 'planned', unsupported: [], obligations, requiredConsumerCapabilities: [...requirements].sort(),
    readWriteManifest: { reads: [...manifestReads].sort(), writes: [...manifestWrites].sort() },
    receiptObligation: { type: 'custom-ability-application-receipt-obligation@1', useId: plan.useId, requestDigest,
      status: 'requires-private-atomic-application', atomic: true, effectIds: obligations.map(row => row.id),
      history: 'persist-only-after-all-effects-observations-next-task-and-world-commit', integrityNotAuthority: true } });
}

export const CUSTOM_ABILITY_INTERPRETED_RUNTIME_REF = 'custom-ability-interpreted-runtime@1';
/** Additional evidence is a closed reference journal, NOT SQL authorization.
 * Missing facts stay unsupported (including under not/any), never default true. */
export function planInterpretedCustomAbilityUse(raw) {
  const input = snapshot(raw);
  exact(input, ['declaration', 'interpretation', 'plan', 'evidence', 'lawEvidence', 'consumerCapabilities', 'priorApplications']);
  const declaration = validateCustomAbilityDeclaration(input.declaration);
  const interpretation = validateCustomAbilityInterpretation(input.interpretation, declaration);
  const { plan, evidence, lawEvidence } = input;
  exact(lawEvidence, ['version', 'scope', 'invocation', 'destinationRelations', 'sourceCategories']); check(lawEvidence.version === 1);
  check(same(lawEvidence.scope, plan.scope), 'CUSTOM_RUNTIME_SCOPE');
  exact(lawEvidence.invocation, ['mode', 'bindingBodyId']); id(lawEvidence.invocation.mode); id(lawEvidence.invocation.bindingBodyId);
  list(lawEvidence.destinationRelations, 128);
  for (const row of lawEvidence.destinationRelations) {
    exact(row, ['destinationId', 'mindId', 'relation', 'sourceCommitRef', 'eventRef']);
    [row.destinationId, row.mindId, row.sourceCommitRef, row.eventRef].forEach(id);
    check(['visible-now', 'visited'].includes(row.relation));
    check(evidence.ancestry.some(c => c.commitRef === row.sourceCommitRef), 'CUSTOM_RUNTIME_SCOPE');
    if (row.relation === 'visible-now') check(row.sourceCommitRef === plan.scope.headCommitRef, 'CUSTOM_RUNTIME_SCOPE');
  }
  list(lawEvidence.sourceCategories, 128);
  for (const row of lawEvidence.sourceCategories) { exact(row, ['observationId', 'category', 'sourceCommitRef', 'eventRef']); Object.values(row).forEach(id);
    check(evidence.observations.some(o => o.id === row.observationId && o.sourceCommitRef === row.sourceCommitRef && o.eventRef === row.eventRef), 'CUSTOM_RUNTIME_SOURCE'); }
  list(input.priorApplications, 128); input.priorApplications.forEach(row => { exact(row, ['useId', 'requestDigest', 'applicationRef']); id(row.useId); hash(row.requestDigest); id(row.applicationRef); });
  unique(input.priorApplications.map(row => row.useId));
  const interpretedRequestDigest = digest({ declaration, interpretation, plan, evidence, lawEvidence, consumerCapabilities: input.consumerCapabilities });
  const previous = input.priorApplications.find(row => row.useId === plan.useId);
  if (previous) check(previous.requestDigest === interpretedRequestDigest, 'CUSTOM_RUNTIME_REPLAY_CONFLICT');
  const legacyInput = { declaration, contract: interpretation.mechanismContract, plan, evidence, consumerCapabilities: input.consumerCapabilities, priorApplications: [] };
  // Validate actual C request shape/scope/whole-node closure even when a law is
  // false; planning is still inert, discarded until all law nodes have passed.
  const planned = planCustomAbilityUse(legacyInput);
  const base = { ...planned, type: CUSTOM_ABILITY_INTERPRETED_RUNTIME_REF, requestDigest: interpretedRequestDigest,
    interpretationDigest: interpretation.attachmentDigest, lawResults: [], lawReadObligations: [], fulfilled: false };
  delete base.integrity;
  const empty = (status, lawResults = [], lawReadObligations = []) => freeze({ ...base, status, lawResults, lawReadObligations,
    obligations: [], knowledgeEffects: [], receiptObligation: null, readWriteManifest: { reads: [], writes: [] } });
  if (previous) return empty('replay');
  if (planned.status !== 'planned') return empty(planned.status);
  if (!['basic', 'awakened'].includes(evidence.invocation.stage)) return empty('extension-required');
  const checks = [], reads = [];
  function predicate(p, node) {
    reads.push({ predicateRef: p.ref, version: p.version, nodeId: node.id, args: p.args, requires: 'private-current-SQL-and-physical-evidence' });
    if (!Object.hasOwn(CUSTOM_ABILITY_LAW_PREDICATES, p.ref)) return 'unsupported';
    const rule = interpretation.mechanismContract.nodes.find(n => n.id === node.contractNodeId), inv = evidence.invocation;
    const source = evidence.observations.find(o => o.id === node.parameters.observationId);
    const body = evidence.bodies.find(b => b.id === inv.bodyId), destination = evidence.locations.find(l => l.id === node.parameters.destinationId);
    switch (p.ref) {
      case 'invocation.mode': return lawEvidence.invocation.mode === p.args.value;
      case 'invocation.stageIs': return inv.stage === p.args.value;
      case 'actor.currentBodyMatchesBinding': return lawEvidence.invocation.bindingBodyId === inv.bodyId;
      case 'source.channelIs': return source ? source.channel === p.args.value : 'unsupported';
      case 'source.acquiredByActingMind': return source ? source.ownerMindId === inv.mindId && source.acquisitionRef.length > 0 : 'unsupported';
      case 'source.fromActuallyDeliveredEvent': return source ? source.sourceEntryRef.length > 0 && source.eventRef.length > 0 : 'unsupported';
      case 'source.categoryIs': { const row = source && lawEvidence.sourceCategories.find(c => c.observationId === source.id); return row ? row.category === p.args.value : 'unsupported'; }
      case 'emission.fromCurrentActingBody': return rule.mechanism.ref === 'sound-reproduction' && lawEvidence.invocation.bindingBodyId === inv.bodyId;
      case 'target.currentBodyIsActingBody': return node.parameters.bodyId ? node.parameters.bodyId === inv.bodyId : 'unsupported';
      case 'destination.sameIslandAsActingBody': return destination ? destination.islandId === body.islandId : 'unsupported';
      case 'destination.visibleAtCurrentBoundary':
      case 'destination.personallyVisitedByActingMind': return destination ? lawEvidence.destinationRelations.some(r => r.destinationId === destination.id && r.mindId === inv.mindId
        && r.relation === (p.ref === 'destination.visibleAtCurrentBoundary' ? 'visible-now' : 'visited')) : 'unsupported';
      case 'lifecycle.instant': return rule.lifecycle === 'instant';
      case 'observation.actualLocalHearing': return rule.observability === 'actual-local-hearing';
      case 'preserveBodyInventoryAndCustody': case 'preserveOccupancy': return rule.mechanism.ref === 'body-relocation';
      default: return 'unsupported';
    }
  }
  function evaluate(e, node) {
    if (e.op === 'predicate') return predicate(e, node);
    if (e.op === 'not') { const result = evaluate(e.term, node); return result === 'unsupported' ? result : !result; }
    const values = e.terms.map(term => evaluate(term, node));
    if (values.includes('unsupported')) return 'unsupported';
    return e.op === 'all' ? values.every(Boolean) : values.some(Boolean);
  }
  for (const r of interpretation.semanticLaw.rules) for (const nodeId of r.nodeIds) {
    const node = plan.nodes.find(n => n.contractNodeId === nodeId); check(node, 'CUSTOM_RUNTIME_CLOSURE');
    checks.push({ ruleId: r.id, contractNodeId: nodeId, result: evaluate(r.expression, node) });
  }
  if (checks.some(c => c.result === 'unsupported')) return empty('extension-required', checks, reads);
  if (checks.some(c => c.result === false)) return empty('law-not-satisfied', checks, reads);
  const effectIds = base.obligations.map(o => `custom-effect:${digest({ requestDigest: interpretedRequestDigest, nodeId: o.nodeId })}`);
  const result = { ...base, obligations: base.obligations.map((o, index) => ({ ...o, id: effectIds[index] })),
    receiptObligation: { ...base.receiptObligation, requestDigest: interpretedRequestDigest, effectIds }, lawResults: checks, lawReadObligations: reads,
    privateValidationObligations: { ...base.privateValidationObligations, executableInterpretation: 'resolve-exact-confirmed-author-attachment-in-private-catalog', lawEvidence: 'metadata-checked-not-SQL-authenticated' } };
  return freeze({ ...result, integrity: digest(result) });
}
