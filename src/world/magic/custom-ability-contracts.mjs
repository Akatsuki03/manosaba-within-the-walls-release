import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';

export const CUSTOM_ABILITY_CONTRACT_REF = 'custom-ability-declaration@1';
export const CUSTOM_ABILITY_INTERPRETATION_REF = 'custom-ability-executable-interpretation@1';
export const CUSTOM_ABILITY_LAW_PREDICATES = Object.freeze({
  'invocation.mode': 'value', 'invocation.stageIs': 'value', 'actor.currentBodyMatchesBinding': null,
  'source.channelIs': 'value', 'source.acquiredByActingMind': null, 'source.fromActuallyDeliveredEvent': null,
  'source.categoryIs': 'value', 'emission.fromCurrentActingBody': null, 'target.currentBodyIsActingBody': null,
  'destination.visibleAtCurrentBoundary': null, 'destination.personallyVisitedByActingMind': null,
  'destination.sameIslandAsActingBody': null, 'lifecycle.instant': null, 'observation.actualLocalHearing': null,
  'preserveBodyInventoryAndCustody': null, 'preserveOccupancy': null,
});
export const CUSTOM_ABILITY_LIMITS = Object.freeze({ bytes: 262144, depth: 24, nodes: 12000, text: 24000, clauses: 128, operations: 128 });
export const CUSTOM_ABILITY_CLAUSE_KINDS = Object.freeze(['domain', 'effect', 'target', 'trigger', 'condition', 'limit', 'lifecycle', 'growth', 'exception', 'unresolved']);
export function customAbilityFail(code = 'CUSTOM_ABILITY_SCHEMA') { throw Object.assign(new Error(code), { code }); }
const bad = customAbilityFail;
export function customAbilityData(input) {
  let nodes = 0, stringBytes = 0; const ancestors = new Set();
  function copy(value, depth) {
    if (++nodes > CUSTOM_ABILITY_LIMITS.nodes || depth > CUSTOM_ABILITY_LIMITS.depth) bad('CUSTOM_ABILITY_LIMIT');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.length > CUSTOM_ABILITY_LIMITS.bytes || (stringBytes += Buffer.byteLength(value, 'utf8')) > CUSTOM_ABILITY_LIMITS.bytes) bad('CUSTOM_ABILITY_LIMIT');
      if (!value.isWellFormed() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) bad('CUSTOM_ABILITY_INPUT'); return value;
    }
    if (typeof value === 'number') { if (!Number.isFinite(value)) bad('CUSTOM_ABILITY_INPUT'); return value; }
    if (typeof value !== 'object' || isProxy(value) || ancestors.has(value)) bad('CUSTOM_ABILITY_INPUT');
    const array = Array.isArray(value), proto = Object.getPrototypeOf(value);
    if (array ? proto !== Array.prototype : ![Object.prototype, null].includes(proto)) bad('CUSTOM_ABILITY_INPUT');
    ancestors.add(value);
    const descriptors = Object.getOwnPropertyDescriptors(value); const keys = Reflect.ownKeys(descriptors);
    const out = array ? [] : {};
    if (array) {
      const length = descriptors.length?.value;
      if (!Number.isSafeInteger(length) || length < 0 || length > CUSTOM_ABILITY_LIMITS.nodes
        || keys.length !== length + 1 || !Object.hasOwn(descriptors, 'length')) bad('CUSTOM_ABILITY_INPUT');
      // Exact dense own-key set, not decimal-looking property count. A hole
      // plus e.g. 4294967295 must never be shifted into index zero by push().
      for (let index = 0; index < length; index++) {
        const key = String(index);
        if (!Object.hasOwn(descriptors, key)) bad('CUSTOM_ABILITY_INPUT');
        const d = descriptors[key];
        if (!d.enumerable || !Object.hasOwn(d, 'value')) bad('CUSTOM_ABILITY_INPUT');
      }
      // length + every checked index exhaust the own keys, rejecting extras
      // (including symbols). Copy descriptors in actual index order only.
      for (let index = 0; index < length; index++) {
        const key = String(index);
        stringBytes += Buffer.byteLength(key, 'utf8'); if (stringBytes > CUSTOM_ABILITY_LIMITS.bytes) bad('CUSTOM_ABILITY_LIMIT');
        out[index] = copy(descriptors[key].value, depth + 1);
      }
    } else for (const key of keys) {
      const d = descriptors[key];
      if (typeof key !== 'string' || !d.enumerable || !Object.hasOwn(d, 'value')
        || ['__proto__', 'constructor', 'prototype'].includes(key)) bad('CUSTOM_ABILITY_INPUT');
      stringBytes += Buffer.byteLength(key, 'utf8'); if (stringBytes > CUSTOM_ABILITY_LIMITS.bytes) bad('CUSTOM_ABILITY_LIMIT');
      Object.defineProperty(out, key, { value: copy(d.value, depth + 1), enumerable: true, writable: true, configurable: true });
    }
    ancestors.delete(value); return out;
  }
  const result = copy(input, 0);
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > CUSTOM_ABILITY_LIMITS.bytes) bad('CUSTOM_ABILITY_LIMIT');
  return result;
}
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value !== null && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
export function customAbilityDigest(value) { return createHash('sha256').update(canonical(customAbilityData(value))).digest('hex'); }
export function freezeCustomAbility(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freezeCustomAbility); Object.freeze(value); } return value; }
export const customAbilityId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:._@/-]{0,191}$/u.test(value);
export function customAbilityExact(value, keys) { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) bad(); }
export function customAbilityList(value, maximum = 128) { if (!Array.isArray(value) || value.length > maximum) bad(); return value; }
const positive = value => Number.isSafeInteger(value) && value > 0;
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= CUSTOM_ABILITY_LIMITS.text;
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const unique = (rows, key) => { if (new Set(rows.map(key)).size !== rows.length) bad(); };
export function validateCustomAbilityMechanisms(raw) {
  const rows = customAbilityData(raw); customAbilityList(rows);
  for (const row of rows) { customAbilityExact(row, ['ref', 'version']); if (!customAbilityId(row.ref) || !positive(row.version)) bad(); }
  unique(rows, row => row.ref); return freezeCustomAbility(rows);
}
function declarationBody(d) {
  customAbilityExact(d, ['version', 'definitionId', 'revision', 'authoredText', 'clauses', 'initialState', 'unresolved', 'mechanismRequirements', 'provenance']);
  if (d.version !== 1 || !customAbilityId(d.definitionId) || !positive(d.revision) || !text(d.authoredText)) bad();
  customAbilityList(d.clauses); if (!d.clauses.length) bad();
  for (const row of d.clauses) { customAbilityExact(row, ['id', 'text', 'kind']); if (!customAbilityId(row.id) || !text(row.text) || !CUSTOM_ABILITY_CLAUSE_KINDS.includes(row.kind)) bad(); }
  unique(d.clauses, row => row.id);
  customAbilityExact(d.initialState, ['stage', 'recognition']);
  if (!customAbilityId(d.initialState.stage) || !['known', 'unknown', 'partial'].includes(d.initialState.recognition)) bad();
  customAbilityList(d.unresolved);
  for (const row of d.unresolved) { customAbilityExact(row, ['id', 'question']); if (!customAbilityId(row.id) || !text(row.question)) bad(); }
  unique(d.unresolved, row => row.id); validateCustomAbilityMechanisms(d.mechanismRequirements);
  customAbilityExact(d.provenance, ['draftId', 'draftRevision', 'authoredTextDigest']);
  if (!customAbilityId(d.provenance.draftId) || !positive(d.provenance.draftRevision) || !digest(d.provenance.authoredTextDigest)) bad();
  if (d.provenance.authoredTextDigest !== customAbilityDigest(d.authoredText)) bad('CUSTOM_ABILITY_DIGEST');
  return d;
}
function semanticBody(d) {
  // Definition/draft identity/revision are lookup/provenance, never cosmetics or
  // rule meaning. Original text participates: no unproved paraphrase equivalence.
  return { version: d.version, authoredText: d.authoredText, clauses: d.clauses,
    initialState: d.initialState, unresolved: d.unresolved, mechanismRequirements: d.mechanismRequirements };
}
export function createCustomAbilityDeclaration(raw) {
  const data = customAbilityData(raw); const supplied = data?.semanticDigest;
  if (Object.hasOwn(data ?? {}, 'semanticDigest')) delete data.semanticDigest;
  const d = declarationBody(data), semanticDigest = customAbilityDigest(semanticBody(d));
  if (supplied !== undefined && supplied !== semanticDigest) bad('CUSTOM_ABILITY_DIGEST');
  return freezeCustomAbility({ ...d, semanticDigest });
}
export function validateCustomAbilityDeclaration(raw) {
  const data = customAbilityData(raw);
  if (!data || !Object.hasOwn(data, 'semanticDigest') || !digest(data.semanticDigest)) bad();
  return createCustomAbilityDeclaration(data);
}
/** Closed catalog interpretation receipt shape ONLY. A trusted server must
 * resolve actual author action/ownership; copied IDs or digest are not proof.
 * Confirmation deliberately lives outside the common declaration envelope. */
export function validateCustomAbilityAuthorConfirmation(raw, declaration) {
  const d = validateCustomAbilityDeclaration(declaration), receipt = customAbilityData(raw);
  customAbilityExact(receipt, ['version', 'definitionId', 'revision', 'semanticDigest', 'draftId', 'draftRevision', 'authorActionId']);
  if (receipt.version !== 1 || receipt.definitionId !== d.definitionId || receipt.revision !== d.revision
    || receipt.semanticDigest !== d.semanticDigest || receipt.draftId !== d.provenance.draftId
    || receipt.draftRevision !== d.provenance.draftRevision || !customAbilityId(receipt.authorActionId)) bad('CUSTOM_ABILITY_CONFIRMATION');
  if (d.unresolved.length || d.clauses.some(row => row.kind === 'unresolved')) bad('CUSTOM_ABILITY_CONFIRMATION');
  return freezeCustomAbility(receipt);
}
export function validateCustomAbilityEffectPlan(raw, declaration) {
  const d = validateCustomAbilityDeclaration(declaration), p = customAbilityData(raw);
  customAbilityExact(p, ['version', 'planId', 'definition', 'source', 'clauseIds', 'mechanisms', 'targets', 'requirements', 'operations']);
  if (p.version !== 1 || !customAbilityId(p.planId)) bad();
  customAbilityExact(p.definition, ['definitionId', 'revision', 'semanticDigest']);
  if (p.definition.definitionId !== d.definitionId || p.definition.revision !== d.revision || p.definition.semanticDigest !== d.semanticDigest) bad('CUSTOM_ABILITY_PLAN');
  customAbilityExact(p.source, ['runId', 'headCommitRef', 'generation', 'revision']);
  if (![p.source.runId, p.source.headCommitRef].every(customAbilityId) || !positive(p.source.generation) || !Number.isSafeInteger(p.source.revision) || p.source.revision < 0) bad();
  customAbilityList(p.clauseIds); unique(p.clauseIds, row => row);
  if (p.clauseIds.length !== d.clauses.length || d.clauses.some(row => !p.clauseIds.includes(row.id))) bad('CUSTOM_ABILITY_PLAN');
  validateCustomAbilityMechanisms(p.mechanisms);
  if (customAbilityDigest(p.mechanisms) !== customAbilityDigest(d.mechanismRequirements)) bad('CUSTOM_ABILITY_PLAN');
  customAbilityList(p.targets); for (const row of p.targets) { customAbilityExact(row, ['id', 'kind']); if (!customAbilityId(row.id) || !['body', 'mind', 'item', 'location', 'sound', 'observation', 'relation', 'worldline'].includes(row.kind)) bad(); }
  unique(p.targets, row => row.id); const targets = new Set(p.targets.map(row => row.id));
  customAbilityList(p.requirements);
  for (const row of p.requirements) { customAbilityExact(row, ['id', 'clauseId', 'kind', 'targetId']); if (!customAbilityId(row.id) || !p.clauseIds.includes(row.clauseId) || !['source-evidence', 'current-condition', 'target-relation', 'lifecycle', 'growth', 'exception'].includes(row.kind) || !targets.has(row.targetId)) bad('CUSTOM_ABILITY_PLAN'); }
  unique(p.requirements, row => row.id); const requirements = new Map(p.requirements.map(row => [row.id, row]));
  customAbilityList(p.operations); if (!p.operations.length) bad('CUSTOM_ABILITY_PLAN');
  const seen = new Set(); const usedRequirements = new Set(); const usedMechanisms = new Set(); const coveredClauses = new Set();
  for (const row of p.operations) {
    customAbilityExact(row, ['id', 'clauseId', 'mechanism', 'targetIds', 'requirementIds', 'dependsOn']);
    if (!customAbilityId(row.id) || seen.has(row.id) || !p.clauseIds.includes(row.clauseId)) bad('CUSTOM_ABILITY_PLAN');
    validateCustomAbilityMechanisms([row.mechanism]);
    if (!p.mechanisms.some(m => m.ref === row.mechanism.ref && m.version === row.mechanism.version)) bad('CUSTOM_ABILITY_PLAN');
    for (const key of ['targetIds', 'requirementIds', 'dependsOn']) { customAbilityList(row[key]); unique(row[key], id => id); }
    if (!row.targetIds.length || row.targetIds.some(id => !targets.has(id)) || !row.requirementIds.length
      || row.requirementIds.some(id => !requirements.has(id) || !row.targetIds.includes(requirements.get(id).targetId))
      || row.dependsOn.some(id => !seen.has(id))) bad('CUSTOM_ABILITY_PLAN');
    coveredClauses.add(row.clauseId);
    row.requirementIds.forEach(id => { usedRequirements.add(id); coveredClauses.add(requirements.get(id).clauseId); });
    usedMechanisms.add(row.mechanism.ref); seen.add(row.id);
  }
  if (usedRequirements.size !== requirements.size || usedMechanisms.size !== p.mechanisms.length
    || coveredClauses.size !== d.clauses.length) bad('CUSTOM_ABILITY_PLAN');
  // These are references/obligations only. Never take fact/effect patches,
  // SQL/JS, readiness flags or claimed current target metadata as proof.
  return freezeCustomAbility(p);
}

export function validateCustomAbilityLaw(raw) {
  const law = customAbilityData(raw); customAbilityExact(law, ['version', 'rules']);
  if (law.version !== 1) bad(); customAbilityList(law.rules, 64);
  function expression(e, depth = 0) {
    if (depth > 12) bad('CUSTOM_ABILITY_LIMIT');
    if (e.op === 'all' || e.op === 'any') { customAbilityExact(e, ['op', 'terms']); customAbilityList(e.terms, 32); if (!e.terms.length) bad(); e.terms.forEach(row => expression(row, depth + 1)); }
    else if (e.op === 'not') { customAbilityExact(e, ['op', 'term']); expression(e.term, depth + 1); }
    else {
      customAbilityExact(e, ['op', 'ref', 'version', 'args']);
      if (e.op !== 'predicate' || !customAbilityId(e.ref) || e.version !== 1) bad();
      // Unknown predicate identity is preserved as unsupported, never executed.
      const key = Object.hasOwn(CUSTOM_ABILITY_LAW_PREDICATES, e.ref) ? CUSTOM_ABILITY_LAW_PREDICATES[e.ref] : undefined;
      if (key === null) customAbilityExact(e.args, []);
      else if (key === 'value') { customAbilityExact(e.args, ['value']); if (!customAbilityId(e.args.value)) bad(); }
      else { customAbilityExact(e.args, []); }
    }
  }
  for (const rule of law.rules) {
    customAbilityExact(rule, ['id', 'clauseIds', 'nodeIds', 'expression']); if (!customAbilityId(rule.id)) bad();
    for (const key of ['clauseIds', 'nodeIds']) { customAbilityList(rule[key], 64); if (!rule[key].length || rule[key].some(id => !customAbilityId(id))) bad(); unique(rule[key], id => id); }
    expression(rule.expression);
  }
  unique(law.rules, row => row.id); return freezeCustomAbility(law);
}
export function createCustomAbilityInterpretation(raw, declaration) {
  const d = validateCustomAbilityDeclaration(declaration), a = customAbilityData(raw), supplied = a?.attachmentDigest;
  if (Object.hasOwn(a ?? {}, 'attachmentDigest')) delete a.attachmentDigest;
  customAbilityExact(a, ['version', 'definition', 'canonicalDeclarationDigest', 'compilerTraceDigest', 'mechanismContract', 'semanticLaw', 'clauseInterpretations', 'mechanismPins', 'sourceBinding', 'choiceInterpretations']);
  if (a.version !== 1) bad();
  const ref = { definitionId: d.definitionId, revision: d.revision, semanticDigest: d.semanticDigest };
  if (customAbilityDigest(a.definition) !== customAbilityDigest(ref) || a.canonicalDeclarationDigest !== customAbilityDigest(d) || !digest(a.compilerTraceDigest)) bad('CUSTOM_ABILITY_INTERPRETATION');
  customAbilityExact(a.sourceBinding, ['draftId', 'draftRevision', 'sourceDigest', 'inputDigest', 'optionsDigest', 'compilerPinsDigest']);
  if (a.sourceBinding.draftId !== d.provenance.draftId || a.sourceBinding.draftRevision !== d.provenance.draftRevision
    || ['sourceDigest', 'inputDigest', 'optionsDigest', 'compilerPinsDigest'].some(key => !digest(a.sourceBinding[key]))) bad('CUSTOM_ABILITY_INTERPRETATION');
  const c = a.mechanismContract; customAbilityExact(c, ['version', 'definition', 'nodes']);
  if (c.version !== 1 || customAbilityDigest(c.definition) !== customAbilityDigest(ref)) bad('CUSTOM_ABILITY_INTERPRETATION');
  // A fully unresolved background proposal can be previewed but can never
  // be compiled into an executable ability. All executable constraints remain.
  const backgroundOnly = d.unresolved.length > 0 && d.clauses.every(clause => clause.kind === 'unresolved');
  customAbilityList(c.nodes, 16);
  const noExecution = backgroundOnly && c.nodes.length === 0 && d.mechanismRequirements.length === 0;
  if (!c.nodes.length && !noExecution) bad();
  for (const n of c.nodes) {
    customAbilityExact(n, ['id', 'clauseIds', 'mechanism', 'operation', 'lifecycle', 'observability', 'config']);
    if (![n.id, n.operation, n.lifecycle, n.observability].every(customAbilityId)) bad();
    customAbilityList(n.clauseIds, 64); unique(n.clauseIds, id => id); if (!n.clauseIds.length || n.clauseIds.some(id => !d.clauses.some(row => row.id === id))) bad('CUSTOM_ABILITY_INTERPRETATION');
    validateCustomAbilityMechanisms([n.mechanism]);
    if (!d.mechanismRequirements.some(m => customAbilityDigest(m) === customAbilityDigest(n.mechanism))) bad('CUSTOM_ABILITY_INTERPRETATION');
    if (n.mechanism.ref === 'sound-reproduction') customAbilityExact(n.config, ['audience']);
    else if (n.mechanism.ref === 'body-relocation') customAbilityExact(n.config, ['destinationScope']);
    else customAbilityExact(n.config, []);
    if (Object.values(n.config).some(value => !customAbilityId(value))) bad();
  }
  unique(c.nodes, n => n.id); validateCustomAbilityMechanisms(a.mechanismPins);
  if (customAbilityDigest(a.mechanismPins) !== customAbilityDigest(d.mechanismRequirements)
    || d.mechanismRequirements.some(m => !c.nodes.some(n => customAbilityDigest(n.mechanism) === customAbilityDigest(m)))) bad('CUSTOM_ABILITY_INTERPRETATION');
  validateCustomAbilityLaw(a.semanticLaw);
  const rules = new Map(a.semanticLaw.rules.map(r => [r.id, r])); const nodes = new Map(c.nodes.map(n => [n.id, n]));
  for (const r of rules.values()) if (r.clauseIds.some(id => !d.clauses.some(c => c.id === id)) || r.nodeIds.some(id => !nodes.has(id))) bad('CUSTOM_ABILITY_INTERPRETATION');
  customAbilityList(a.clauseInterpretations, 64); unique(a.clauseInterpretations, row => row.clauseId);
  if (noExecution ? a.clauseInterpretations.length !== 0 || rules.size !== 0
    : a.clauseInterpretations.length !== d.clauses.length) bad('CUSTOM_ABILITY_INTERPRETATION');
  for (const mapping of a.clauseInterpretations) {
    customAbilityExact(mapping, ['clauseId', 'lawRuleIds', 'nodeIds', 'interpretationText']);
    const clause = d.clauses.find(c => c.id === mapping.clauseId);
    if (!clause || mapping.interpretationText !== clause.text) bad('CUSTOM_ABILITY_INTERPRETATION');
    for (const key of ['lawRuleIds', 'nodeIds']) { customAbilityList(mapping[key], 64); unique(mapping[key], id => id); }
    if (!mapping.nodeIds.length || mapping.nodeIds.some(id => !nodes.get(id)?.clauseIds.includes(clause.id))
      || mapping.lawRuleIds.some(id => !rules.get(id)?.clauseIds.includes(clause.id) || mapping.nodeIds.some(n => !rules.get(id).nodeIds.includes(n)))) bad('CUSTOM_ABILITY_INTERPRETATION');
    // Non-effect text cannot be marked covered by an effect-node reference alone.
    if (!['domain', 'effect', 'target'].includes(clause.kind) && !mapping.lawRuleIds.length) bad('CUSTOM_ABILITY_INTERPRETATION');
  }
  for (const rule of rules.values()) if (rule.clauseIds.some(id => !a.clauseInterpretations.some(m => m.clauseId === id && m.lawRuleIds.includes(rule.id)))) bad('CUSTOM_ABILITY_INTERPRETATION');
  customAbilityList(a.choiceInterpretations, 32);
  for (const choice of a.choiceInterpretations) { customAbilityExact(choice, ['choiceId', 'value', 'ruleId', 'predicateRef']); if (![choice.choiceId, choice.predicateRef, choice.ruleId].every(customAbilityId) || !text(choice.value) || !rules.has(choice.ruleId)) bad(); }
  unique(a.choiceInterpretations, row => row.choiceId);
  const attachmentDigest = customAbilityDigest(a);
  if (supplied !== undefined && supplied !== attachmentDigest) bad('CUSTOM_ABILITY_DIGEST');
  return freezeCustomAbility({ ...a, attachmentDigest });
}
export function validateCustomAbilityInterpretation(raw, declaration) {
  const a = customAbilityData(raw); if (!digest(a?.attachmentDigest)) bad(); return createCustomAbilityInterpretation(a, declaration);
}
