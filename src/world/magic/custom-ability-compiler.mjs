import { createHash } from 'node:crypto';
import { CUSTOM_ABILITY_MECHANISMS } from './custom-ability-runtime.mjs';
import { createCustomAbilityInterpretation, CUSTOM_ABILITY_LAW_PREDICATES } from './custom-ability-contracts.mjs';
import { customAbilityData, customAbilityDigest, customAbilityExact, customAbilityList, customAbilityId,
  customAbilityFail as bad, freezeCustomAbility, createCustomAbilityDeclaration,
  validateCustomAbilityDeclaration, validateCustomAbilityMechanisms, validateCustomAbilityEffectPlan, validateCustomAbilityAuthorConfirmation } from './custom-ability-contracts.mjs';

export const CUSTOM_ABILITY_COMPILER_REF = 'custom-ability-candidate-compiler@1';
function coverage(requirements, raw) {
  const inventory = customAbilityData(raw); customAbilityExact(inventory, ['version', 'mechanisms']);
  if (inventory.version !== 1) bad(); validateCustomAbilityMechanisms(inventory.mechanisms);
  const missing = requirements.filter(row => !inventory.mechanisms.some(m => m.ref === row.ref && m.version === row.version));
  if (!missing.length && requirements.length) return 'ready';
  if (missing.some(row => inventory.mechanisms.some(m => m.ref === row.ref && m.version !== row.version))) return 'incompatible-version';
  return requirements.length && missing.length < requirements.length ? 'partial' : 'extension-required';
}
function draft(raw) {
  const d = customAbilityData(raw);
  customAbilityExact(d, ['version', 'draftId', 'draftRevision', 'definitionId', 'revision', 'authoredText', 'initialState']);
  if (d.version !== 1 || !customAbilityId(d.draftId) || !Number.isSafeInteger(d.draftRevision) || d.draftRevision < 1) bad();
  // Reuse the actual envelope for the remaining declaration field checks.
  createCustomAbilityDeclaration({ version: 1, definitionId: d.definitionId, revision: d.revision, authoredText: d.authoredText,
    clauses: [{ id: 'authored:whole', kind: 'unresolved', text: d.authoredText }], initialState: d.initialState, unresolved: [],
    mechanismRequirements: [], provenance: { draftId: d.draftId, draftRevision: d.draftRevision, authoredTextDigest: customAbilityDigest(d.authoredText) } });
  return d;
}
/** Candidate in, candidate out: no keyword inference, model/provider transport,
 * callbacks, catalog confirmation, per-run grants or current-world fact checks.
 * Text offsets are UTF-16 code units, exactly as JS slice; all non-whitespace
 * authored meaning must be covered. Interpreted paraphrases require a later
 * explicit versioned author interpretation contract, never silent rewriting. */
export function compileCustomAbilityCandidate(rawDraft, rawCandidate, rawInventory = { version: 1, mechanisms: [] }) {
  const d = draft(rawDraft); const authoredTextDigest = customAbilityDigest(d.authoredText);
  let candidate;
  if (rawCandidate === undefined) {
    candidate = { version: 1, authoredTextDigest,
      clauses: [{ id: 'authored:whole', kind: 'unresolved', text: d.authoredText, spans: [{ start: 0, end: d.authoredText.length }] }],
      unresolved: [{ id: 'interpretation', question: 'Provide and author-review an explicit interpretation of this authored rule.' }], mechanismRequirements: [] };
  } else candidate = customAbilityData(rawCandidate);
  customAbilityExact(candidate, ['version', 'authoredTextDigest', 'clauses', 'unresolved', 'mechanismRequirements']);
  if (candidate.version !== 1) bad();
  if (candidate.authoredTextDigest !== authoredTextDigest) bad('CUSTOM_ABILITY_STALE');
  customAbilityList(candidate.clauses); const covered = new Uint8Array(d.authoredText.length); const trace = [];
  const clauses = candidate.clauses.map(row => {
    customAbilityExact(row, ['id', 'text', 'kind', 'spans']); customAbilityList(row.spans);
    if (!row.spans.length) bad('CUSTOM_ABILITY_TRACE');
    let previous = -1;
    for (const span of row.spans) {
      customAbilityExact(span, ['start', 'end']);
      if (!Number.isSafeInteger(span.start) || !Number.isSafeInteger(span.end) || span.start < 0 || span.start >= span.end
        || span.end > d.authoredText.length || span.start < previous) bad('CUSTOM_ABILITY_TRACE');
      previous = span.end; covered.fill(1, span.start, span.end);
    }
    if (row.text !== row.spans.map(span => d.authoredText.slice(span.start, span.end)).join('\n')) bad('CUSTOM_ABILITY_TRACE');
    trace.push({ clauseId: row.id, spans: row.spans });
    return { id: row.id, text: row.text, kind: row.kind };
  });
  for (let index = 0; index < covered.length; index++) if (!covered[index] && /\S/u.test(d.authoredText[index])) bad('CUSTOM_ABILITY_TRACE');
  const declaration = createCustomAbilityDeclaration({ version: 1, definitionId: d.definitionId, revision: d.revision,
    authoredText: d.authoredText, clauses, initialState: d.initialState, unresolved: candidate.unresolved,
    mechanismRequirements: candidate.mechanismRequirements, provenance: { draftId: d.draftId, draftRevision: d.draftRevision, authoredTextDigest } });
  return freezeCustomAbility({ version: 1, compilerRef: CUSTOM_ABILITY_COMPILER_REF, declaration, trace,
    candidateSource: rawCandidate === undefined ? 'uninterpreted-authored-text' : 'inert-structured-candidate',
    definitionStatus: declaration.unresolved.length || clauses.some(row => row.kind === 'unresolved') ? 'needs-clarification' : 'draft',
    authorConfirmation: 'required', coverageStatus: coverage(declaration.mechanismRequirements, rawInventory), runtimeAuthority: 'not-issued' });
}
/** Catalog status projection for an independently resolved server receipt.
 * Never call this to approve a declaration from HTTP/model-supplied JSON. */
export function describeCustomAbilityAuthoring(rawDeclaration, rawConfirmation = null) {
  const declaration = validateCustomAbilityDeclaration(rawDeclaration);
  const needsClarification = declaration.unresolved.length || declaration.clauses.some(row => row.kind === 'unresolved');
  if (rawConfirmation !== null) validateCustomAbilityAuthorConfirmation(rawConfirmation, declaration);
  return freezeCustomAbility({ version: 1, definitionStatus: needsClarification ? 'needs-clarification'
    : rawConfirmation === null ? 'draft' : 'author-confirmed',
    confirmationEvidence: rawConfirmation === null ? 'not-provided' : 'shape-bound-server-receipt-required', runtimeAuthority: 'not-issued' });
}
export function assessCustomAbilityPlan(rawDeclaration, rawPlan, rawInventory) {
  const declaration = validateCustomAbilityDeclaration(rawDeclaration);
  const plan = validateCustomAbilityEffectPlan(rawPlan, declaration);
  const coverageStatus = coverage(plan.mechanisms, rawInventory);
  return freezeCustomAbility({ version: 1, status: declaration.unresolved.length || declaration.clauses.some(row => row.kind === 'unresolved')
    ? 'needs-clarification' : coverageStatus === 'ready' ? 'candidate-compatible' : 'extension-required', coverageStatus, runtimeAuthority: 'not-issued',
    requiredHostChecks: ['author-confirmation', 'immutable-definition', 'run-binding', 'current-head', 'target-and-source-evidence', 'mechanism-consumers', 'atomic-publication'] });
}

export const CUSTOM_ABILITY_EXECUTABLE_COMPILER_REF = 'custom-ability-executable-compiler@1';
export const CUSTOM_ABILITY_CATALOG_BRIDGE_REF = 'custom-ability-catalog-codec-bridge@1';
const rawTextDigest = text => createHash('sha256').update(text, 'utf8').digest('hex');
function catalogSource(rawDraft, rawJob) {
  const d = customAbilityData(rawDraft), j = customAbilityData(rawJob);
  customAbilityExact(d, ['draftId', 'version', 'draftRevision', 'authoredText', 'options', 'cosmetics', 'sourceDigest', 'confirmed']);
  customAbilityExact(d.options, ['initialState', 'authorChoices']); customAbilityList(d.options.authorChoices, 32);
  for (const c of d.options.authorChoices) { customAbilityExact(c, ['id', 'value']); if (!customAbilityId(c.id) || typeof c.value !== 'string') bad(); }
  if (new Set(d.options.authorChoices.map(c => c.id)).size !== d.options.authorChoices.length) bad();
  // Only these completed/pending B fields are read. Actual B may add candidate
  // readback fields; caller must supply its strict job-start projection here.
  customAbilityExact(j, ['jobId', 'draftId', 'draftRevision', 'inputDigest', 'pins', 'status']);
  customAbilityExact(j.pins, ['compilerRef', 'compilerVersion', 'mechanisms']); validateCustomAbilityMechanisms(j.pins.mechanisms);
  if (j.pins.compilerRef !== CUSTOM_ABILITY_EXECUTABLE_COMPILER_REF || j.pins.compilerVersion !== 1
    || !['pending', 'completed'].includes(j.status) || !customAbilityId(j.jobId)
    || j.draftId !== d.draftId || j.draftRevision !== d.draftRevision || !Number.isSafeInteger(d.version) || d.version < 1) bad('CUSTOM_ABILITY_STALE');
  if (d.sourceDigest !== customAbilityDigest({ authoredText: d.authoredText, options: d.options })
    || j.inputDigest !== customAbilityDigest({ sourceDigest: d.sourceDigest, pins: j.pins })) bad('CUSTOM_ABILITY_STALE');
  return { d, j };
}
export function bridgeCustomAbilityCatalogDeclaration(raw, rawDraft, rawJob) {
  const declaration = validateCustomAbilityDeclaration(raw), { d, j } = catalogSource(rawDraft, rawJob);
  if (declaration.authoredText !== d.authoredText || declaration.provenance.draftId !== d.draftId
    || declaration.provenance.draftRevision !== d.draftRevision || customAbilityDigest(declaration.initialState) !== customAbilityDigest(d.options.initialState)) bad('CUSTOM_ABILITY_STALE');
  const catalogDeclaration = customAbilityData(declaration); catalogDeclaration.provenance.authoredTextDigest = rawTextDigest(d.authoredText);
  const bridge = { version: 1, ref: CUSTOM_ABILITY_CATALOG_BRIDGE_REF, canonicalAlgorithm: 'sha256-canonical-json-string@1', catalogAlgorithm: 'sha256-raw-utf8@1',
    jobId: j.jobId, draftRevision: d.draftRevision, sourceDigest: d.sourceDigest, inputDigest: j.inputDigest, pinsDigest: customAbilityDigest(j.pins),
    canonicalDeclarationDigest: customAbilityDigest(declaration), catalogDeclarationDigest: customAbilityDigest(catalogDeclaration) };
  return freezeCustomAbility({ catalogDeclaration, bridge: { ...bridge, bridgeDigest: customAbilityDigest(bridge) } });
}
export function restoreCustomAbilityCatalogDeclaration(raw, rawBridge, rawDraft, rawJob) {
  const catalog = customAbilityData(raw), bridge = customAbilityData(rawBridge), { d } = catalogSource(rawDraft, rawJob);
  customAbilityExact(bridge, ['version', 'ref', 'canonicalAlgorithm', 'catalogAlgorithm', 'jobId', 'draftRevision', 'sourceDigest', 'inputDigest', 'pinsDigest', 'canonicalDeclarationDigest', 'catalogDeclarationDigest', 'bridgeDigest']);
  if (catalog.authoredText !== d.authoredText || catalog.provenance?.authoredTextDigest !== rawTextDigest(d.authoredText)) bad('CUSTOM_ABILITY_DIGEST');
  catalog.provenance.authoredTextDigest = customAbilityDigest(d.authoredText);
  const declaration = validateCustomAbilityDeclaration(catalog), expected = bridgeCustomAbilityCatalogDeclaration(declaration, rawDraft, rawJob);
  if (customAbilityDigest(expected.bridge) !== customAbilityDigest(bridge) || customAbilityDigest(expected.catalogDeclaration) !== customAbilityDigest(raw)) bad('CUSTOM_ABILITY_DIGEST');
  return declaration;
}
function predicates(expression) {
  return expression.op === 'predicate' ? [expression] : expression.op === 'not' ? predicates(expression.term) : expression.terms.flatMap(predicates);
}
export function compileCustomAbilityInterpretation(raw) {
  const input = customAbilityData(raw); customAbilityExact(input, ['version', 'definitionId', 'revision', 'draft', 'job', 'candidate']); if (input.version !== 1) bad();
  const { d, j } = catalogSource(input.draft, input.job), c = input.candidate;
  customAbilityExact(c, ['version', 'declarationCandidate', 'mechanismNodes', 'semanticLaw', 'clauseInterpretations', 'choiceInterpretations']); if (c.version !== 1) bad();
  const compiled = compileCustomAbilityCandidate({ version: 1, draftId: d.draftId, draftRevision: d.draftRevision, definitionId: input.definitionId,
    revision: input.revision, authoredText: d.authoredText, initialState: d.options.initialState }, c.declarationCandidate, { version: 1, mechanisms: j.pins.mechanisms });
  const declaration = compiled.declaration;
  const interpretation = createCustomAbilityInterpretation({ version: 1,
    definition: { definitionId: declaration.definitionId, revision: declaration.revision, semanticDigest: declaration.semanticDigest },
    canonicalDeclarationDigest: customAbilityDigest(declaration), compilerTraceDigest: customAbilityDigest(compiled.trace),
    mechanismContract: { version: 1, definition: { definitionId: declaration.definitionId, revision: declaration.revision, semanticDigest: declaration.semanticDigest }, nodes: c.mechanismNodes },
    semanticLaw: c.semanticLaw, clauseInterpretations: c.clauseInterpretations, mechanismPins: declaration.mechanismRequirements,
    sourceBinding: { draftId: d.draftId, draftRevision: d.draftRevision, sourceDigest: d.sourceDigest, inputDigest: j.inputDigest, optionsDigest: customAbilityDigest(d.options), compilerPinsDigest: customAbilityDigest(j.pins) },
    choiceInterpretations: c.choiceInterpretations }, declaration);
  if (interpretation.choiceInterpretations.length !== d.options.authorChoices.length) bad('CUSTOM_ABILITY_INTERPRETATION');
  for (const choice of d.options.authorChoices) {
    const mapping = interpretation.choiceInterpretations.find(row => row.choiceId === choice.id);
    const rule = mapping && interpretation.semanticLaw.rules.find(row => row.id === mapping.ruleId);
    if (!mapping || mapping.value !== choice.value || !predicates(rule.expression).some(p => p.ref === mapping.predicateRef && p.args.value === choice.value)) bad('CUSTOM_ABILITY_INTERPRETATION');
  }
  const unknown = interpretation.semanticLaw.rules.flatMap(r => predicates(r.expression)).filter(p => !Object.hasOwn(CUSTOM_ABILITY_LAW_PREDICATES, p.ref));
  const unsupportedNodes = interpretation.mechanismContract.nodes.filter(n => {
    const descriptor = CUSTOM_ABILITY_MECHANISMS.find(m => m.ref === n.mechanism.ref && m.version === n.mechanism.version);
    return !descriptor || n.operation !== descriptor.operation || n.lifecycle !== descriptor.lifecycle || n.observability !== descriptor.observability
      || n.mechanism.ref === 'sound-reproduction' && n.config.audience !== 'actual-local-minds'
      || n.mechanism.ref === 'body-relocation' && n.config.destinationScope !== 'existing-same-island';
  });
  return freezeCustomAbility({ version: 1, compilerRef: CUSTOM_ABILITY_EXECUTABLE_COMPILER_REF, declaration, trace: compiled.trace, interpretation,
    executionStatus: compiled.definitionStatus === 'needs-clarification' ? 'needs-clarification' : unknown.length || unsupportedNodes.length || compiled.coverageStatus !== 'ready'
      || !['basic', 'awakened'].includes(declaration.initialState.stage) ? 'extension-required' : 'candidate-ready',
    runtimeAuthority: 'not-issued', authorConfirmation: 'exact-interpretation-required' });
}
