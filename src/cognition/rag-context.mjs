import { isProxy } from 'node:util/types';
import { relationshipPacketPolicy } from '../content/content-revisions.mjs';
import { RELATIONSHIP_CONTEXT_BUDGETS, relationshipContextPin } from '../content/relationship-context-policy.mjs';
const retrievalRelationshipPin = retrieval => relationshipContextPin(retrieval).relationshipContextVersion === 1
  ? { ...relationshipPacketPolicy(retrieval, retrieval.initialRunPolicy), initialRunPolicy: retrieval.initialRunPolicy } : {};
import { dialogueContextPin } from './dialogue-context-policy.mjs';
import { buildRoleplayContext, buildCharacterDataContext } from '../agents/agent-boundaries.mjs';

export const RAG_POLICY_VERSION = 'actor-recall@2';
const fail = () => { throw Object.assign(new Error('检索上下文来源或交付边界不完整。'), { code: 'ERR_RAG_SOURCE' }); };
const bytes = value => Buffer.byteLength(JSON.stringify(value), 'utf8');
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Host-only, same-snapshot assembly. Recent perception always stays verbatim.
 * Under pressure, RP can replace ONLY optional source bodies already represented
 * by source-backed subjective records with channel/time/source handles. Neither
 * this rebuildable projection nor its handles are authority for cognitive writes.
 * Data agents always receive full source bodies. No new LLM summary, global
 * history, persistent derived cache, or deletion of authority is involved.
 */
export function assembleRagContext({ retrieval, role, persona = {}, situation = {}, allowedActions = [], decisionContext },  { maxBytes = 12000, compression = 'off' } = {}) {
  if (!['roleplay', 'character_data'].includes(role) || !retrieval || !Array.isArray(retrieval.recentObservations)
    || !Array.isArray(retrieval.sourceObservations) || !Array.isArray(retrieval.recall)) fail();
  if (!['off', 'auto'].includes(compression)) fail();
  const relationship = retrievalRelationshipPin(retrieval);
  const validationBytes = relationship.relationshipContextVersion === 1 ? RELATIONSHIP_CONTEXT_BUDGETS.roleplay : 64000;
  const scope = retrieval.scope;
  const build = role === 'roleplay' ? buildRoleplayContext : buildCharacterDataContext;
  const sources = new Map();
  for (const row of retrieval.sourceObservations) {
    if (relationship.relationshipContextVersion === 1) {
      const parsed = buildRoleplayContext({ ...relationship, scope, persona: {}, situation: {}, observations: [row] }, { maxBytes: validationBytes }).observations[0];
      if (!parsed || (sources.has(row.id) && JSON.stringify(sources.get(row.id)) !== JSON.stringify({ ...scope, ...parsed }))) fail();
      sources.set(row.id, { ...scope, ...parsed });
    } else sources.set(row.id, row);
  }
  const background = retrieval.backgroundObservations ?? [];
  const experience = retrieval.requiredObservations ?? [];
  const caseSources = retrieval.requiredCaseObservations ?? [];
  const relationshipRows = decisionList(retrieval.relationshipObservations ?? [], 1);
  if (!Array.isArray(background) || !Array.isArray(experience) || !Array.isArray(caseSources)) fail();
  // The shared retrieval's bounded experience lane is as indivisible as recent
  // perception. Validate each full body before deduplication, so a foreign or
  // conflicting duplicate cannot disappear behind a trusted recent/source row.
  const requiredById = new Map();
  const registerRequired = row => {
    const verified = buildRoleplayContext({ ...relationship, scope, persona: {}, situation: {}, observations: [row] }, { maxBytes: validationBytes }).observations;
    if (verified.length !== 1) fail();
    const parsed = verified[0]; const existing = requiredById.get(parsed.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(parsed)) fail();
    requiredById.set(parsed.id, parsed);
  };
  for (const row of [...decisionList(background), ...decisionList(experience, 19), ...decisionList(caseSources, 128),
    ...decisionList(retrieval.requiredDurableAcquisitionObservations ?? [], 128), ...relationshipRows, ...decisionList(retrieval.recentObservations)]) registerRequired(row);
  for (const id of requiredById.keys()) if (sources.has(id)) registerRequired(sources.get(id));
  const required = [...requiredById.values()].map(row => ({ ...scope, ...row }));
  if (caseSources.length && required.length > 128) throw Object.assign(new Error('本人的必需案件来源超过完整交付预算；未提交任何选票。请保留进度并检查上下文预算，不能省略证据。'), { code: 'ERR_AGENT_CONTEXT_TOO_LARGE' });
  const recentIds = new Set(required.map(row => row.id));
  const rawRecallIds = new Set();
  let observations = [...required];
  let records = [];
  const context = (perception, cognition, recallSources) => role === 'roleplay'
    ? { ...relationship, scope, persona, situation, observations: perception, allowedActions,
      ...(cognition.length ? { recalledRecords: cognition } : {}),
      ...(decisionContext ? { decisionContext } : {}),
      ...(recallSources?.length ? { recallSources } : {}) }
    : { ...relationship, scope, observations: perception, currentRecords: cognition };
  const make = (perception, cognition, recallSources) => {
    const packet = build(context(perception, cognition, recallSources), { maxBytes });
    const admitted = role === 'roleplay' ? packet.recalledRecords || [] : packet.currentRecords;
    return packet.observations.length === perception.length && admitted.length === cognition.length
      && (packet.recallSources?.length || 0) === (recallSources?.length || 0) ? packet : null;
  };
  const attempt = (perception, cognition, recallSources) => {
    try {
      if (perception.length > 128 || cognition.length > 128 || (recallSources?.length || 0) > 128) return null;
      return make(perception, cognition, recallSources);
    } catch (error) {
      if (error.code !== 'ERR_AGENT_CONTEXT_TOO_LARGE') throw error;
      return null;
    }
  };
  const compact = (perception, cognition) => {
    const cited = new Set(cognition.flatMap(row => row.sourceObservationIds));
    const full = []; const handles = [];
    for (const row of perception) {
      if (recentIds.has(row.id) || rawRecallIds.has(row.id) || !cited.has(row.id)) { full.push(row); continue; }
      // Validate actor/branch/generation AND the original body before deriving a
      // handle. A foreign row or accessor must not bypass the existing boundary.
      const verified = buildRoleplayContext({ ...relationship, scope, persona: {}, situation: {}, observations: [row] }, { maxBytes: validationBytes }).observations;
      if (verified.length !== 1) fail();
      const { text: _text, ...metadata } = verified[0];
      handles.push({ ...scope, ...metadata });
    }
    return attempt(full, cognition, handles);
  };
  let packet;
  try { packet = make(observations, records); }
  catch (error) {
    if (!caseSources.length || error.code !== 'ERR_AGENT_CONTEXT_TOO_LARGE') throw error;
    throw Object.assign(new Error('本人的必需案件来源无法完整装入本次投票预算；未提交任何选票。请保留进度并检查上下文预算，不能省略证据。'), { code: 'ERR_AGENT_CONTEXT_TOO_LARGE' });
  }
  if (!packet) fail();
  const selected = [];
  let skippedForBudget = 0;
  const usedObservations = new Set(observations.map(row => row.id));
  const usedRecords = new Set();
  for (const hit of retrieval.recall) {
    if (!['observation', 'record'].includes(hit.type)) fail();
    const sourceIds = hit.type === 'record' ? hit.sourceObservationIds : [hit.id];
    if (!Array.isArray(sourceIds) || !sourceIds.length || sourceIds.some(id => !sources.has(id))) fail();
    if ((hit.type === 'observation' && usedObservations.has(hit.id) && !packet.recallSources?.some(row => row.id === hit.id))
      || (hit.type === 'record' && usedRecords.has(hit.id))) continue;
    const additional = sourceIds.filter(id => !usedObservations.has(id)).map(id => sources.get(id));
    const nextObservations = [...observations, ...additional];
    const nextRecords = hit.type === 'record' ? [...records, hit] : records;
    if (hit.type === 'observation') rawRecallIds.add(hit.id);
    let candidate = attempt(nextObservations, nextRecords);
    // Soft watermark leaves room for the current turn. Once compact, subsequent
    // candidates stay on this projection rather than oscillating around the cap.
    if (role === 'roleplay' && compression === 'auto' && nextRecords.length
      && (!candidate || packet.recallSources || bytes(candidate) > Math.floor(maxBytes * 0.75))) {
      const smaller = compact(nextObservations, nextRecords);
      if (smaller && (!candidate || bytes(smaller) < bytes(candidate))) candidate = smaller;
    }
    if (!candidate) {
      if (hit.type === 'observation') rawRecallIds.delete(hit.id);
      skippedForBudget++; continue;
    }
    observations = nextObservations; records = nextRecords; packet = candidate;
    additional.forEach(row => usedObservations.add(row.id));
    if (hit.type === 'record') usedRecords.add(hit.id);
    selected.push({ type: hit.type, id: hit.id, sourceObservationIds: [...sourceIds] });
  }
  // Rebuild only from the whitelisted authentic packet, never from raw retrieval.
  const scoped = rows => rows.map(row => ({ ...row, ...packet.scope }));
  const cleanContext = role === 'roleplay'
    ? { scope: packet.scope, persona: packet.persona, situation: packet.situation,
      observations: scoped(packet.observations), ...(Object.hasOwn(packet, 'recalledRecords') ? { recalledRecords: scoped(packet.recalledRecords) } : {}), allowedActions: packet.allowedActions || [],
      ...(packet.decisionContext ? { decisionContext: packet.decisionContext } : {}),
      ...(packet.recallSources ? { recallSources: scoped(packet.recallSources) } : {}) }
    : { scope: packet.scope, observations: scoped(packet.observations), currentRecords: scoped(packet.currentRecords) };
  // Size the expanded whitelist without rebuilding an over-budget raw packet.
  // Each omitted body has already passed the one-row boundary in compact().
  const expanded = { ...packet };
  if (packet.recallSources) {
    const delivered = new Map([...packet.observations, ...packet.recallSources].map(row => [row.id, row]));
    expanded.observations = observations.map(row => ({ ...delivered.get(row.id), text: row.text }));
    delete expanded.recallSources;
  }
  const rawPacketBytes = bytes(expanded);
  return freeze({ context: cleanContext, packet,
    manifest: { ...performerManifest(packet), policyVersion: RAG_POLICY_VERSION, role, scope: { ...packet.scope }, maxBytes, packetBytes: bytes(packet),
      authorizedRecallCount: retrieval.recall.length,
      candidates: retrieval.recall.slice(0, 128).map(hit => ({ type: hit.type, id: hit.id,
        sourceObservationIds: hit.type === 'record' ? [...hit.sourceObservationIds] : [hit.id],
        delivered: selected.some(row => row.type === hit.type && row.id === hit.id)
          || (hit.type === 'observation' && packet.observations.some(row => row.id === hit.id)) })),
      ...(caseSources.length ? { requiredCaseObservationIds: caseSources.map(row => row.id) } : {}),
      requiredObservationIds: required.map(row => row.id),
      deliveredObservationIds: packet.observations.map(row => row.id), selected, skippedForBudget,
      compression: { policy: 'source-backed-recall@1', mode: compression,
        active: Boolean(packet.recallSources?.length), sourceCount: packet.recallSources?.length || 0,
        rawPacketBytes, savedBytes: Math.max(0, rawPacketBytes - bytes(packet)) } } });
}

function performerManifest(packet) {
  const rows = [...packet.observations, ...(packet.recallSources || [])].filter(row => row.sourceActorHandle)
    .map(({ id, sourceActorHandle, sourceRelation }) => ({ id, sourceActorHandle, sourceRelation }));
  return rows.length ? { observationPerformers: rows } : {};
}

export const DECISION_RAG_POLICY_VERSION = 'actor-decision-recall@1';
const decisionError = (code = 'ERR_AGENT_CONTEXT') => {
  throw Object.assign(new Error('自主决策上下文不完整或超过交付边界。'), { code });
};
const decisionPlain = value => value !== null && typeof value === 'object' && !isProxy(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function decisionField(value, key, fallback) {
  if (!decisionPlain(value)) decisionError();
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) return fallback;
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) decisionError();
  return descriptor.value === undefined ? fallback : descriptor.value;
}
function decisionList(value, maximum = 4096) {
  if (isProxy(value) || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) decisionError();
  const length = Object.getOwnPropertyDescriptor(value, 'length').value;
  if (length > maximum || Reflect.ownKeys(value).length !== length + 1) decisionError();
  return Array.from({ length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) decisionError();
    return descriptor.value;
  });
}
const decisionOrder = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const decisionTooLarge = () => decisionError('ERR_AGENT_CONTEXT_TOO_LARGE');

/** One authentic, final-size decision packet. Current received observations and
 * the retrieval's genuine background/recent perception are indivisible. Older
 * working source bodies are optional only alongside the EXACT delivered record,
 * never a new summary. The matching recalledRecords entries let the existing
 * boundary independently enforce metadata-handle closure, including for goals.
 * No handle is an observation or authority for a new cognitive write.
 *
 * retrieval must retain its real recent/background lanes: pass working-source
 * closure separately, not prefixed into recentObservations. Every active goal
 * is required (or one unchanged paused goal for an all-paused review). Optional
 * exact working records precede acquired entries and
 * ranked recall; newer appended assessments precede older ones. Default and
 * maximum maxBytes is the task cap, 32000 (not a pre-observation reserve).
 *
 * acquiredEvidenceEntries optionally accepts owner-visible {id,name,description}
 * rows. Admission is by whole formatted entry, not a sliced description. Without
 * entries the existing acquiredEvidence string is one indivisible optional block.
 * This projection never changes the authoritative decision state or goal review.
 */
export function assembleDecisionContext(input, options = {}) {
  const retrieval = decisionField(input, 'retrieval');
  const relationship = retrievalRelationshipPin(retrieval);
  const validationBytes = relationship.relationshipContextVersion === 1 ? RELATIONSHIP_CONTEXT_BUDGETS.roleplay : 64000;
  const maxBytes = decisionField(options, 'maxBytes', 32000);
  const compression = decisionField(options, 'compression', 'auto');
  const maxSourceHandles = decisionField(options, 'maxSourceHandles', 128);
  const maxRecalledRecords = decisionField(options, 'maxRecalledRecords', 128);
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1024 || maxBytes > (relationship.relationshipContextVersion === 1 ? RELATIONSHIP_CONTEXT_BUDGETS.roleplay : 32000)
    || !Number.isSafeInteger(maxSourceHandles) || maxSourceHandles < 0 || maxSourceHandles > 128
    || !Number.isSafeInteger(maxRecalledRecords) || maxRecalledRecords < 0 || maxRecalledRecords > 128) decisionError('ERR_AGENT_BUDGET');
  if (!['auto', 'off'].includes(compression)) fail();
  const rawSituation = decisionField(input, 'situation', {});
  if (!decisionPlain(rawSituation)) decisionError();
  // Preserve descriptors until the ordinary boundary inspects allowed fields;
  // neither object spreading nor JSON cloning may invoke a hidden accessor.
  const situationDescriptors = Object.getOwnPropertyDescriptors(rawSituation);
  delete situationDescriptors.acquiredEvidence;
  const rawDecision = decisionField(input, 'decisionContext');
  if (!decisionPlain(rawDecision) || Reflect.ownKeys(rawDecision).some(key => !['version', 'goals', 'beliefs', 'relationships', ...(relationship.relationshipContextVersion === 1 ? ['relationshipContextVersion'] : [])].includes(key))) decisionError();
  if (relationshipContextPin(rawDecision).relationshipContextVersion !== relationship.relationshipContextVersion) decisionError();
  const emptyDecision = { version: decisionField(rawDecision, 'version'), ...relationshipContextPin(rawDecision), goals: [], beliefs: [], relationships: [] };
  const dialogue = dialogueContextPin(input);
  const shortObservationVersion = decisionField(input, 'shortObservationReferenceVersion', undefined);
  if (shortObservationVersion !== undefined && shortObservationVersion !== 1) decisionError();
  const shortObservation = shortObservationVersion === 1 ? { shortObservationReferenceVersion: 1 } : {};
  const seed = buildRoleplayContext({ ...relationship, ...dialogue, ...shortObservation, scope: decisionField(retrieval, 'scope'),
    persona: decisionField(input, 'persona', {}), situation: Object.defineProperties({}, situationDescriptors),
    allowedActions: decisionField(input, 'allowedActions', []), decisionContext: emptyDecision,
    ...(decisionField(input, 'decisionPolicy') ? { decisionPolicy: decisionField(input, 'decisionPolicy') } : {}),
    ...(decisionField(input, 'performancePolicy') ? { performancePolicy: decisionField(input, 'performancePolicy') } : {}),
  }, { maxBytes });
  const scope = seed.scope;
  const decisions = { version: seed.decisionContext.version, ...relationshipContextPin(seed.decisionContext) };
  const limits = { goals: 3, beliefs: 8, relationships: 16 };
  const decisionIds = new Set();
  for (const [key, maximum] of Object.entries(limits)) {
    // Validate one complete record at a time: a large yet valid working state
    // must not need an over-budget monolithic packet before it can be selected.
    decisions[key] = decisionList(decisionField(rawDecision, key), maximum).map(row => {
      const packet = buildRoleplayContext({ ...relationship, scope, persona: {}, situation: {},
        decisionContext: { ...emptyDecision, [key]: [row] },
      }, { maxBytes: validationBytes });
      const parsed = packet.decisionContext[key][0];
      if (decisionIds.has(parsed.id)) fail();
      decisionIds.add(parsed.id);
      return parsed;
    });
  }
  const recent = decisionList(decisionField(retrieval, 'recentObservations'));
  const background = decisionList(decisionField(retrieval, 'backgroundObservations', []));
  const relationshipRows = decisionList(decisionField(retrieval, 'relationshipObservations', []), 1);
  const experience = decisionList(decisionField(retrieval, 'requiredObservations', []), 19);
  const durable = decisionList(decisionField(retrieval, 'requiredDurableAcquisitionObservations', []), 128);
  const recall = decisionList(decisionField(retrieval, 'recall'));
  const sources = new Map(); const verified = new Map();
  const register = row => {
    const id = decisionField(row, 'id');
    const entries = sources.get(id) ?? [];
    entries.push(row); sources.set(id, entries);
    return id;
  };
  for (const row of [...decisionList(decisionField(input, 'workingSourceObservations', [])),
    ...decisionList(decisionField(retrieval, 'sourceObservations')), ...background, ...experience, ...durable, ...relationshipRows, ...recent]) register(row);
  const receivedIds = [];
  for (const row of decisionList(decisionField(input, 'receivedObservations', []))) {
    if (!decisionPlain(row)) decisionError();
    const descriptors = Object.getOwnPropertyDescriptors(row);
    // Snapshot observations may not yet have an execution scope. Fill only
    // absent fields; an explicitly foreign boundary is never overwritten.
    for (const [key, value] of Object.entries(scope)) {
      if (!Object.hasOwn(descriptors, key)) descriptors[key] = { value, enumerable: true };
    }
    receivedIds.push(register(Object.defineProperties({}, descriptors)));
  }
  const source = id => {
    if (verified.has(id)) return verified.get(id);
    if (!sources.has(id)) fail();
    let result;
    for (const row of sources.get(id)) {
      const observations = buildRoleplayContext({ ...relationship, scope, persona: {}, situation: {}, observations: [row] }, { maxBytes: validationBytes }).observations;
      if (observations.length !== 1) fail();
      const parsed = { ...scope, ...observations[0] };
      if (result && JSON.stringify(result) !== JSON.stringify(parsed)) fail();
      result = parsed;
    }
    verified.set(id, result);
    return result;
  };
  const requiredIds = [...new Set([...background, ...experience, ...durable, ...relationshipRows, ...recent].map(row => decisionField(row, 'id')).concat(receivedIds))];
  requiredIds.forEach(source);
  const requiredSet = new Set(requiredIds);
  // New scene contracts require full actionable closure for salient psychology;
  // no compressed handle may replace an evidential body needed this beat.
  for (const id of decisionList(decisionField(input, 'requiredSourceObservationIds', []), 128)) {
    source(id); if (!requiredSet.has(id)) { requiredSet.add(id); requiredIds.push(id); }
  }
  // Missing/foreign working closure is invalid even if budget selection would
  // later omit that record; omitted text/accessors cannot bypass validation.
  for (const key of Object.keys(limits)) for (const row of decisions[key]) row.sourceObservationIds.forEach(source);
  const salientRecordIds = new Set(decisionList(decisionField(input, 'requiredDecisionRecordIds', []), 27));
  for (const id of salientRecordIds) if (!decisionIds.has(id)) decisionError();
  // Salience admits the exact record AND its full evidential closure. Callers
  // need not repeat its source IDs to prevent optional compression from
  // turning required psychology into metadata-only, unusable evidence.
  for (const key of Object.keys(limits)) for (const row of decisions[key]) {
    if (!salientRecordIds.has(row.id)) continue;
    for (const id of row.sourceObservationIds) if (!requiredSet.has(id)) {
      requiredSet.add(id); requiredIds.push(id);
    }
  }
  const rawGoalTemplates = decisionField(input, 'goalTemplates');
  let goalTemplates;
  if (rawGoalTemplates !== undefined) {
    if (!seed.decisionPolicy) decisionError();
    const templateRows = decisionList(rawGoalTemplates, 4);
    for (const row of templateRows) {
      for (const id of decisionList(decisionField(row, 'sourceObservationIds'), 8)) {
        source(id);
        if (!requiredSet.has(id)) { requiredSet.add(id); requiredIds.push(id); }
      }
    }
    // Validate candidates through the ordinary whitelist only after their
    // complete owner-local bodies have been authorized and made mandatory.
    goalTemplates = buildRoleplayContext({ ...relationship, scope, persona: {}, situation: {},
      observations: requiredIds.map(source), decisionContext: emptyDecision,
      decisionPolicy: seed.decisionPolicy, goalTemplates: templateRows,
    }, { maxBytes: validationBytes }).goalTemplates;
  }
  const requiredGoals = decisions.goals.filter(row => row.status === 'active');
  if (!requiredGoals.length) {
    // A due all-paused review can legally wait on one existing paused goal.
    // Keep it exact rather than forcing a resume/update just to make a packet.
    const reviewGoal = decisions.goals.filter(row => row.status === 'paused').sort((left, right) => right.priority - left.priority
      || left.reviewAt - right.reviewAt || decisionOrder(left.id, right.id))[0];
    if (reviewGoal) requiredGoals.push(reviewGoal);
  }
  const kept = new Set([...requiredGoals.map(row => row.id), ...salientRecordIds]);
  const projection = selected => ({ version: decisions.version, ...relationshipContextPin(decisions),
    ...Object.fromEntries(Object.keys(limits).map(key => [key, decisions[key].filter(row => selected.has(row.id))])) });
  const mirrors = current => Object.entries(limits).flatMap(([key]) => current[key].map(row => ({
    ...scope, id: row.id, kind: { goals: 'goal', beliefs: 'belief', relationships: 'relationship' }[key],
    summary: row.summary ?? row.subjectiveSummary, sourceObservationIds: [...row.sourceObservationIds],
  })));
  const handle = row => {
    const { text: _text, ...metadata } = row;
    return metadata;
  };
  let packet;
  const assemble = (selected, optionalRecords, rawIds, acquiredEvidence) => {
    const decisionContext = projection(selected);
    const records = [...mirrors(decisionContext), ...optionalRecords];
    if (records.length > maxRecalledRecords) return null;
    const cited = new Set(records.flatMap(row => row.sourceObservationIds));
    const allIds = [...new Set([...requiredIds, ...rawIds, ...cited])];
    const observations = allIds.map(source);
    const make = (full, handles = []) => {
      if (full.length > 128 || handles.length > maxSourceHandles) return null;
      try {
        const candidate = buildRoleplayContext({ ...relationship, ...dialogue, ...shortObservation, scope, persona: seed.persona,
          situation: { ...seed.situation, ...(acquiredEvidence ? { acquiredEvidence } : {}) },
          allowedActions: seed.allowedActions, decisionContext, observations: full, recalledRecords: records,
          ...(seed.decisionPolicy ? { decisionPolicy: seed.decisionPolicy } : {}),
          ...(seed.performancePolicy ? { performancePolicy: seed.performancePolicy } : {}),
          ...(goalTemplates ? { goalTemplates } : {}),
          ...(handles.length ? { recallSources: handles } : {}),
        }, { maxBytes });
        // The generic builder may drop optional recalledRecords. This helper
        // admits only atomic record/source bundles, so reject that crop.
        return (candidate.recalledRecords?.length || 0) === records.length ? candidate : null;
      } catch (error) {
        if (error.code !== 'ERR_AGENT_CONTEXT_TOO_LARGE') throw error;
        return null;
      }
    };
    const full = make(observations);
    if (compression === 'off' || (full && !packet?.recallSources && bytes(full) <= Math.floor(maxBytes * 0.75))) return full;
    const compressible = observations.filter(row => !requiredSet.has(row.id) && !rawIds.has(row.id) && cited.has(row.id));
    // If handles hit their independent 128-row cap, spend any available full
    // slots on the smallest bodies rather than manufacturing a partial closure.
    const promotions = Math.max(0, compressible.length - maxSourceHandles);
    const promoted = new Set([...compressible].sort((left, right) => bytes(left) - bytes(handle(left))
      - (bytes(right) - bytes(handle(right))) || decisionOrder(left.id, right.id)).slice(0, promotions).map(row => row.id));
    const compactIds = new Set(compressible.filter(row => !promoted.has(row.id)).map(row => row.id));
    const compact = make(observations.filter(row => !compactIds.has(row.id)),
      observations.filter(row => compactIds.has(row.id)).map(handle));
    return compact && (!full || bytes(compact) < bytes(full)) ? compact : full;
  };
  let optionalRecords = []; let rawIds = new Set(); let acquiredEvidence;
  packet = assemble(kept, optionalRecords, rawIds, acquiredEvidence);
  if (!packet) decisionTooLarge();
  // Required active goal metadata and all current bodies must fit BEFORE any
  // lower-priority background cognition, evidence description or ranked recall.
  const latestRelationships = new Map(decisions.relationships.map(row => [row.targetHandle, row.id]));
  const optionalWorking = [
    ...decisions.goals.filter(row => !kept.has(row.id)).map(row => ({ key: 'goals', row })),
    ...['beliefs', 'relationships'].flatMap(key => decisions[key].map((row, index) => ({ key, row, index,
      latestRelationship: key === 'relationships' && latestRelationships.get(row.targetHandle) === row.id,
    }))).sort((left, right) => Number(right.latestRelationship) - Number(left.latestRelationship) || right.index - left.index
      || decisionOrder(left.key, right.key) || decisionOrder(left.row.id, right.row.id)),
  ];
  for (const { key, row } of optionalWorking) {
    // Array order is the working state's append order, not source-observation
    // time: a new attitude can cite an old event. Never substitute an older
    // attitude when that target's latest exact record could not be delivered.
    if (key === 'relationships' && latestRelationships.get(row.targetHandle) !== row.id
      && !kept.has(latestRelationships.get(row.targetHandle))) continue;
    const next = new Set([...kept, row.id]);
    const candidate = assemble(next, optionalRecords, rawIds, acquiredEvidence);
    if (candidate) { kept.add(row.id); packet = candidate; }
  }
  const entries = decisionField(input, 'acquiredEvidenceEntries');
  const evidence = [];
  if (entries !== undefined) {
    const known = new Set(seed.situation.knownEvidenceIds ?? []); const seen = new Set();
    for (const row of decisionList(entries, 128)) {
      const id = decisionField(row, 'id'); const name = decisionField(row, 'name'); const description = decisionField(row, 'description');
      if (!known.has(id) || seen.has(id) || typeof name !== 'string' || !name.trim()
        || typeof description !== 'string' || !description.trim()) decisionError();
      // IDs authorize typed operations and stay in the host manifest. Only
      // the owner's acquired display name belongs in quotable source prose.
      seen.add(id); evidence.push({ id, text: `【${name}】${description}` });
    }
  } else {
    const text = decisionField(rawSituation, 'acquiredEvidence');
    if (text !== undefined) {
      if (typeof text !== 'string' || !text.trim()) decisionError();
      evidence.push({ text });
    }
  }
  const admittedEvidence = new Set();
  // Prefer recent acquisitions, but render selected complete entries in their
  // original order. The unstructured legacy string remains a single block.
  for (let index = evidence.length - 1; index >= 0; index--) {
    const next = new Set([...admittedEvidence, index]);
    const text = evidence.filter((_row, offset) => next.has(offset)).map(row => row.text).join('\n');
    if (text.length > 6000) continue;
    const candidate = assemble(kept, optionalRecords, rawIds, text);
    if (candidate) { admittedEvidence.add(index); acquiredEvidence = text; packet = candidate; }
  }
  const selected = []; const candidates = []; let skippedForBudget = 0;
  for (const hit of recall) {
    const type = decisionField(hit, 'type'); const id = decisionField(hit, 'id');
    if (!['record', 'observation'].includes(type)) fail();
    let parsed;
    if (type === 'record') {
      const rows = buildRoleplayContext({ ...relationship, scope, persona: {}, situation: {}, recalledRecords: [hit] }, { maxBytes: validationBytes }).recalledRecords;
      if (rows.length !== 1) fail();
      parsed = { ...scope, ...rows[0] };
    }
    const sourceObservationIds = type === 'record' ? parsed.sourceObservationIds : [id];
    sourceObservationIds.forEach(source);
    const manifestRow = { type, id, sourceObservationIds: [...sourceObservationIds], delivered: false };
    candidates.push(manifestRow);
    const existing = type === 'record' ? [...mirrors(projection(kept)), ...optionalRecords].find(row => row.id === id) : undefined;
    if (existing) {
      if (existing.kind !== parsed.kind || existing.summary !== parsed.summary
        || JSON.stringify(existing.sourceObservationIds) !== JSON.stringify(parsed.sourceObservationIds)) fail();
      manifestRow.delivered = true; continue;
    }
    if (type === 'observation' && packet.observations.some(row => row.id === id)) { manifestRow.delivered = true; continue; }
    const nextRecords = type === 'record' ? [...optionalRecords, parsed] : optionalRecords;
    const nextRaw = type === 'observation' ? new Set([...rawIds, id]) : rawIds;
    const candidate = assemble(kept, nextRecords, nextRaw, acquiredEvidence);
    if (!candidate) { skippedForBudget++; continue; }
    packet = candidate; optionalRecords = nextRecords; rawIds = nextRaw;
    manifestRow.delivered = true;
    selected.push({ type, id, sourceObservationIds: [...sourceObservationIds] });
  }
  const scoped = rows => rows.map(row => ({ ...scope, ...row }));
  const context = { ...dialogue, ...shortObservation, scope, persona: packet.persona, situation: packet.situation,
    allowedActions: packet.allowedActions || [], decisionContext: packet.decisionContext,
    ...(packet.decisionPolicy ? { decisionPolicy: packet.decisionPolicy } : {}),
    ...(packet.performancePolicy ? { performancePolicy: packet.performancePolicy } : {}),
    ...(packet.goalTemplates ? { goalTemplates: packet.goalTemplates } : {}),
    observations: scoped(packet.observations), ...(Object.hasOwn(packet, 'recalledRecords') ? { recalledRecords: scoped(packet.recalledRecords) } : {}),
    ...(packet.recallSources ? { recallSources: scoped(packet.recallSources) } : {}) };
  const expanded = { ...packet };
  if (packet.recallSources) {
    expanded.observations = [...packet.observations, ...packet.recallSources.map(row => ({ ...row, text: source(row.id).text }))];
    delete expanded.recallSources;
  }
  const rawPacketBytes = bytes(expanded);
  const working = Object.keys(limits).flatMap(key => decisions[key].map(row => ({ kind: key === 'goals' ? 'goal' : key === 'beliefs' ? 'belief' : 'relationship',
    id: row.id, sourceObservationIds: [...row.sourceObservationIds], delivered: kept.has(row.id) })));
  const skippedWorking = working.filter(row => !row.delivered).length;
  const skippedEvidence = evidence.length - admittedEvidence.size;
  return freeze({ context, packet, manifest: {
    ...performerManifest(packet), policyVersion: DECISION_RAG_POLICY_VERSION, role: 'roleplay', scope: { ...scope }, maxBytes, packetBytes: bytes(packet),
    authorizedRecallCount: recall.length, candidates: candidates.slice(0, 128),
    requiredObservationIds: requiredIds, deliveredObservationIds: packet.observations.map(row => row.id),
    selected: [...mirrors(projection(kept)).map(row => ({ type: 'record', id: row.id, sourceObservationIds: [...row.sourceObservationIds] })), ...selected],
    skippedForBudget: skippedForBudget + skippedWorking + skippedEvidence, skippedRecallForBudget: skippedForBudget,
    working: { policy: 'complete-working-records@1', records: working, skippedForBudget: skippedWorking },
    acquiredEvidence: { policy: 'whole-acquired-entries@1', authorizedCount: evidence.length,
      deliveredIds: evidence.filter((_row, index) => admittedEvidence.has(index)).flatMap(row => row.id === undefined ? [] : [row.id]),
      deliveredCount: admittedEvidence.size, skippedForBudget: skippedEvidence },
    compression: { policy: 'source-backed-recall@1', mode: compression, active: Boolean(packet.recallSources?.length),
      sourceCount: packet.recallSources?.length ?? 0, rawPacketBytes, savedBytes: Math.max(0, rawPacketBytes - bytes(packet)) },
  } });
}
