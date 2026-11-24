import { createHash } from 'node:crypto';
import { relationshipInitialKnownIds } from '../creation/player-setup.mjs';
import { runtimeCapabilityId } from '../content/runtime-capabilities.mjs';
import { affirmativeIdentitySubjects, deliveredSelfIntroduction, usesIdentityAssertionV2 } from './identity-assertion-policy.mjs';
import { policyForActor } from '../agents/actor-performance-policy.mjs';
import { RECEPTION_INTRODUCTIONS } from './reception-introduction-lines.mjs';
import { statementProfileFacts, ownRecollectionProfileFacts, projectProfileKnowledge } from '../cognition/witchbook-cognition.mjs';
import { publicAgentProfile, CUSTOM_PRISONER_NUMBER } from '../content/agent-scenario.mjs';

import { KNOWLEDGE_RUNTIME_REVISION, KNOWLEDGE_POLICY } from './actor-knowledge-policy.mjs';

export { KNOWLEDGE_RUNTIME_REVISION, KNOWLEDGE_POLICY, KNOWLEDGE_FINGERPRINT } from './actor-knowledge-policy.mjs';

export const isKnowledgeGated = state => [KNOWLEDGE_RUNTIME_REVISION, 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(state?.agentRuntimeRevision));
const byId = new Map(KNOWLEDGE_POLICY.identities.map(row => [row.id, row]));
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const playerId = state => state.creation?.actorId || 'emma';
const aliasesFor = (state, id) => id === 'player' && state.creation?.character?.name
  ? [state.creation.character.name] : byId.get(id)?.aliases || [];
const canonicalName = (state, id) => id === 'player' ? state.creation?.character?.name : byId.get(id)?.name;
const supports = (state, id) => typeof canonicalName(state, id) === 'string';
const fail = () => { throw Object.assign(new Error('人物知识缺少合法的本人取得来源。'), { code: 'INVALID_AGENT_STATE' }); };
function ledger(state, ownerId, subjectId) {
  state.actorKnowledge ||= { version: 1, byActor: {} };
  if (state.actorKnowledge.version !== 1 || !supports(state, ownerId) || !supports(state, subjectId)) fail();
  const own = state.actorKnowledge.byActor[ownerId] ||= {};
  return own[subjectId] ||= { nameSources: [], statements: [], conditionSources: [] };
}
function rememberName(state, ownerId, subjectId, source, { recognize = true } = {}) {
  const record = ledger(state, ownerId, subjectId);
  if (!record.nameSources.some(row => row.key === source.key)) record.nameSources.push({ ...source, recognize });
  if (recognize) {
    const map = state.agentAutonomy?.recognizedByActor;
    if (map) { const known = map[ownerId] ||= []; if (!known.includes(subjectId)) known.push(subjectId); }
  }
  // A name-only notice belongs in the encyclopedia, not an automatic binding
  // between every unknown body/voice and a newly learned name.
  if (recognize && ownerId === playerId(state) && !state.known.includes(subjectId)) state.known.push(subjectId);
}
export function knownIdentityIds(state, ownerId = playerId(state)) {
  const checkpoint = ['case-1', 'case-1-execution-test'].includes(state.creation?.scenarioId) && !state.creation?.storyArcId;
  const familiar = ['emma', 'hiro'].includes(ownerId) ? [ownerId === 'emma' ? 'hiro' : 'emma'] : [];
  const seeded = new Set([ownerId, ...relationshipInitialKnownIds(state, ownerId, familiar), ...(checkpoint ? KNOWLEDGE_POLICY.identities.map(({ id }) => id) : []),
    ...(ownerId === playerId(state) ? state.known || [] : []), ...(state.agentAutonomy?.recognizedByActor?.[ownerId] || [])]);
  for (const [id, row] of Object.entries(state.actorKnowledge?.byActor?.[ownerId] || {})) if (row.nameSources?.length) seeded.add(id);
  return [...seeded];
}
export function knowsIdentity(state, ownerId, subjectId) { return knownIdentityIds(state, ownerId).includes(subjectId); }
export function recognizesPerson(state, ownerId, subjectId) {
  return ownerId === subjectId || relationshipInitialKnownIds(state, ownerId,
    ['emma', 'hiro'].includes(ownerId) ? [ownerId === 'emma' ? 'hiro' : 'emma'] : []).includes(subjectId)
    || ['case-1', 'case-1-execution-test'].includes(state.creation?.scenarioId) && !state.creation?.storyArcId
    || (ownerId === playerId(state) && state.known?.includes(subjectId))
    || state.agentAutonomy?.recognizedByActor?.[ownerId]?.includes(subjectId) || false;
}
function ownAssertion(state, actorId, utterance) {
  const aliases = aliasesFor(state, actorId).map(escape).join('|'); if (!aliases) return false;
  let text = utterance.trim();
  const wrappers = new Map([['「', '」'], ['『', '』'], ['“', '”'], ['"', '"']]);
  const closing = wrappers.get(text[0]);
  // Only a single complete enclosing pair is presentation. Two attributed
  // quotations must not be unwrapped into the speaker's own assertion.
  if (closing && text.at(-1) === closing && text.indexOf(closing, 1) === text.length - 1) text = text.slice(1, -1);
  // Inner quotations and attributed recitations are not the owner's assertion.
  for (const alias of aliasesFor(state, actorId)) for (const [open, close] of [['「', '」'], ['『', '』'], ['“', '”'], ['"', '"']]) {
    text = text.replaceAll(`${open}${alias}${close}`, alias);
  }
  text = text.replace(/「[^」]*」|『[^』]*』|“[^”]*”|"[^"]*"/gu, ' ');
  const prefix = '(?:我叫|我是|我的名字是|(?:你(?:们|們)?(?:可以)?|大家(?:可以)?)?叫我?|名字是|吾[辈輩](?:乃|是|名[为為]?)|本小姐是|大叔是|(?:那)?我先报名字[：:]|我自己先说[，,：:])';
  const ownNameContinuation = actorId === 'noah' ? '|想|喜欢|喜歡|觉得|覺得|不喜欢|不喜歡|会|會|要|可以|能|也|还|還|的|是|先|才' : '';
  const pattern = new RegExp(`(?:^|[。！!；;，,\\n])\\s*(?:${prefix}\\s*)?(?<name>${aliases})(?=$|[\\s，,。！!？?；;…—–]|就好|就行|好了|吧${ownNameContinuation})`, 'gu');
  const split = /(?:^|[。！!；;\n])\s*吾[辈輩]姓(?<surname>\p{Script=Han}{1,4})[，,]\s*名(?<given>\p{Script=Han}{1,5})(?=$|[，,。！!；;\s])/u.exec(text);
  if (split && aliasesFor(state, actorId).includes(split.groups.surname + split.groups.given)
    && !/[？?]|不是|并非|並非|开玩笑|開玩笑|假名/u.test(text.slice(split.index).split(/[。！!；;\n]/u)[0])) return true;
  for (const match of text.matchAll(pattern)) {
    const sentence = text.slice(match.index).split(/[。！!；;\n]/u)[0];
    const preceding = text.slice(0, match.index).split(/[。！!；;\n]/u).at(-1);
    if (/(?:她说|她說|他说|他說|据说|據說|听说|聽說|引用|复述|複述|转述|轉述|如果|假如|假设|假設|不是|并非|並非)/u.test(preceding)) continue;
    if (/[？?]|不是|并非|並非|不叫|假名|开玩笑|開玩笑|才怪|不对|不對|引用|台词|臺詞|[她他]的名字|不在这里|不在這裡/u.test(sentence)) continue;
    const full = match[0].trim();
    // A bare own short name is a conventional introduction, not a global scan
    // for name mentions. Longer third-person claims do not match this prefix.
    if (new RegExp(`^(?:${prefix})`, 'u').test(full)
      || match.index === 0 && full === match.groups.name && (sentence.trim() === full || /(?:就好|就行|好了|吧)$/u.test(sentence.trim()))
      || actorId === 'noah' && match.index === 0 && full === match.groups.name
        && new RegExp(`^(?:${aliases})(?:想|喜欢|喜歡|觉得|覺得|不喜欢|不喜歡|会|會|要|可以|能|也|还|還|的|是|先|才)`, 'u').test(sentence.trim())) return true;
  }
  return false;
}
/** Called only for freshly enacted communication, never by a view or replay scan. */
export function acquireDeliveredIdentity(state, row, { explicitDelivery = false } = {}) {
  // A custom replay emits the owner-local speech row with a typed
  // `customAbilityEvent`; the replayed voice belongs to its original speaker,
  // never to the replaying actor's own identity/statement ledger.
  if (row?.customAbilityEvent) return;
  if (!isKnowledgeGated(state) || !['speech', 'writing'].includes(row?.delivery) || !supports(state, row.speakerId)
    || !Array.isArray(row.audienceIds) || typeof row.text !== 'string') return;
  if (row.audienceIds.some(id => !supports(state, id)) || !Number.isSafeInteger(row.occurredAt)
    || row.occurredAt < 0 || row.occurredAt > state.worldTime) fail();
  const key = row.observationKey || `identity:${createHash('sha256').update(JSON.stringify([row.speakerId, row.occurredAt, row.text])).digest('hex')}`;
  const source = { key, at: row.occurredAt, kind: row.delivery, speakerId: row.speakerId };
  const subjects = [];
  if (explicitDelivery && deliveredSelfIntroduction(row, {
    name: canonicalName(state, row.speakerId), selfReference: policyForActor(row.speakerId).selfReference,
  })) subjects.push(row.speakerId);
  // Original introductions include stammers, punctuation and bare names which
  // are not ordinary affirmative assertions. Only an exact host-produced,
  // source-pinned group introduction may establish that identity directly.
  if (['agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(state.agentRuntimeRevision)) && row.receptionIntroduction?.version === 1) {
    const meeting = state.receptionIntroductions;
    if (meeting?.version !== 1 || meeting.status !== 'completed' || !meeting.observationKeys?.includes(row.observationKey)
      || row.audienceIds.some(id => id !== 'warden' && !meeting.participantIds.includes(id))
      || row.occurredAt < meeting.startedAt || row.occurredAt > meeting.completedAt) fail();
    if (row.receptionIntroduction.sourceId === 'host-registration') {
      const id = playerId(state);
      if (row.speakerId !== 'warden' || row.receptionIntroduction.subjectId !== id || row.delivery !== 'speech'
        || row.text !== `这位是${canonicalName(state, id)}。` || row.observationKey !== `reception-introductions@1:registered-${id}:${meeting.deliveryKey}`) fail();
      subjects.push(id);
    } else {
      const source = RECEPTION_INTRODUCTIONS.find(item => item.sourceId === row.receptionIntroduction.sourceId
        && item.speakerId === row.speakerId && (item.delivery === 'writing' && item.text.startsWith('『') && item.text.endsWith('』')
          ? item.text.slice(1, -1) : item.text) === row.text && item.delivery === row.delivery);
      if (!source || row.receptionIntroduction.subjectId !== source.speakerId
        || row.observationKey !== `reception-introductions@1:name-${source.speakerId}:${meeting.deliveryKey}`) fail();
      subjects.push(source.speakerId);
    }
  }
  if (usesIdentityAssertionV2(state)) subjects.push(...affirmativeIdentitySubjects(row,
    [...KNOWLEDGE_POLICY.identities, ...(state.creation?.playerMode === 'custom'
      ? [{ id: 'player', aliases: aliasesFor(state, 'player') }] : [])]));
  else {
    if (ownAssertion(state, row.speakerId, row.text)) subjects.push(row.speakerId);
    // Frozen v4/v5 interpretation; new assertion checks never rescan old rows.
    if (/^(?:「|『|“)?\s*(?:这位|這位|她|他)(?:是|叫)/u.test(row.text.trim())
      && !/[？?]|不是|不叫|假如|如果/u.test(row.text)) {
      const targets = row.audienceIds.filter(id => id !== row.speakerId && supports(state, id)).filter(id => {
        const aliases = aliasesFor(state, id).map(escape).join('|');
        return new RegExp(`^[「『“]?\\s*(?:这位|這位|她|他)(?:是|叫)\\s*(?:${aliases})(?=$|[，,。！!；;」』”\\s])`, 'u').test(row.text.trim());
      });
      if (targets.length === 1) subjects.push(targets[0]);
    }
    const addressed = (row.addresseeIds || []).filter(id => supports(state, id));
    if (addressed.length === 1) {
      const aliases = aliasesFor(state, addressed[0]).map(escape).join('|');
      if (new RegExp(`^[「『“]?\\s*(?:${aliases})[，,！!：:]`, 'u').test(row.text.trim())) subjects.push(addressed[0]);
    }
  }
  for (const subjectId of new Set(subjects)) for (const ownerId of row.audienceIds) {
    if (supports(state, ownerId)) rememberName(state, ownerId, subjectId, source);
  }
  // Attributed verbatim statements stay statements. They never become a
  // biography, ability mechanism, death certificate or source document.
  for (const ownerId of row.audienceIds) if (supports(state, ownerId) && knowsIdentity(state, ownerId, row.speakerId)) {
    const record = ledger(state, ownerId, row.speakerId);
    if (!record.statements.some(item => item.key === key)) record.statements.push({ ...source, text: row.text });
  }
}
/** Host producer API; never accept these facts from a model response. */
export function acquireOfficialNotice(state, { subjectId, fullName, status = 'dead', cause, audienceIds, sourceKey, at = state.worldTime }) {
  if (!isKnowledgeGated(state)) return;
  if (!supports(state, subjectId) || fullName !== canonicalName(state, subjectId) || status !== 'dead'
    || !Array.isArray(audienceIds) || audienceIds.some(id => !supports(state, id))
    || !sourceKey || !Number.isSafeInteger(at) || at < 0 || at > state.worldTime
    || (cause !== undefined && (typeof cause !== 'string' || !cause.trim()))) fail();
  for (const ownerId of audienceIds) {
    if (!supports(state, ownerId)) fail();
    const source = { key: sourceKey, at, kind: 'official_notice', speakerId: 'warden' };
    rememberName(state, ownerId, subjectId, source, { recognize: recognizesPerson(state, ownerId, subjectId) });
    const record = ledger(state, ownerId, subjectId);
    if (!record.conditionSources.some(row => row.key === sourceKey)) record.conditionSources.push({ ...source, status, ...(cause ? { cause } : {}) });
  }
}
/** Authenticated public execution producer, separate from an ordinary death report. */
export function acquirePublicExecution(state, { subjectId, audienceIds, sourceKey, at = state.worldTime }) {
  if (!isKnowledgeGated(state)) return;
  if (!supports(state, subjectId) || !Array.isArray(audienceIds) || audienceIds.some(id => !supports(state, id))
    || !sourceKey || !Number.isSafeInteger(at) || at < 0 || at > state.worldTime) fail();
  for (const ownerId of audienceIds) {
    const source = { key: sourceKey, at, kind: 'public_execution' };
    rememberName(state, ownerId, subjectId, source, { recognize: recognizesPerson(state, ownerId, subjectId) });
    const record = ledger(state, ownerId, subjectId);
    if (!record.conditionSources.some(row => row.key === sourceKey)) record.conditionSources.push({ ...source, status: 'executed' });
  }
}
function ownerProfileCondition(state, ownerId, subjectId) {
  const own = state.actorKnowledge?.byActor?.[ownerId]?.[subjectId];
  const reported = own?.conditionSources?.findLast(row => row.at <= state.worldTime);
  const observed = state.caseOne?.observedConditionsByActor?.[ownerId]?.[subjectId]
    || state.caseRuntime?.observedConditionsByActor?.[ownerId]?.[subjectId];
  const visibleObservation = observed && observed.at <= state.worldTime ? observed : null;
  return visibleObservation?.status === 'executed' ? visibleObservation : reported || visibleObservation;
}

/** The official registration number and the warden's public office are baseline
 * book information. All other personal fields still require this owner's actual
 * sources. No view writes cognition or changes historic read actions. */
export function ownerWitchBookProfile(state, ownerId, subjectId, { facts = [], ownRecollections = [], statements = [], authorizedSourceKeys } = {}) {
  const official = publicAgentProfile(subjectId);
  const known = ownerProfile(state, ownerId, subjectId)
    || (subjectId === 'warden' ? { id: subjectId, name: official.name, role: official.role } : null);
  const prisonerNumber = subjectId === 'player' && state.creation?.playerMode === 'custom'
    ? CUSTOM_PRISONER_NUMBER : official?.prisonerNumber;
  const own = state.actorKnowledge?.byActor?.[ownerId]?.[subjectId];
  const aliases = aliasesFor(state, subjectId);
  const received = [...(own?.statements || []), ...statements].filter(row => row.at <= state.worldTime
    && (!authorizedSourceKeys || authorizedSourceKeys.has(row.key)));
  const delivered = received.flatMap(row => statementProfileFacts(row, aliases));
  const self = ownerId === subjectId ? ownRecollections.filter(row => row.at <= state.worldTime)
    .flatMap(row => ownRecollectionProfileFacts(row, aliases)) : [];
  const projected = projectProfileKnowledge([...self, ...delivered, ...facts.filter(row => row?.acquiredAt <= state.worldTime)]);
  const paragraphs = subjectId === 'warden' ? [...official.paragraphs,
    '负责说明监牢规则、发布通知，并主持魔女审判与判决执行。', ...projected.profileParagraphs] : [...projected.profileParagraphs];
  if (!known && !paragraphs.length && !received.length) return null;
  const condition = ownerProfileCondition(state, ownerId, subjectId);
  const cases = [state.caseOne, state.caseRuntime?.procedure, ...(state.caseRuntime?.procedureHistory || [])].filter(Boolean);
  const verdict = cases.findLast(row => row.voterIds?.includes(ownerId) && row.verdict?.selectedIds?.includes(subjectId));
  if (condition?.status === 'executed') {
    paragraphs.push(verdict?.verdict.kind === 'unresolved_tie'
      ? '因审判未能选定魔女，已被处刑。'
      : '经审判认定为魔女，已被处刑。');
  } else if (condition?.status === 'fatal_injury') {
    paragraphs.push('遭受了致命伤害。');
  } else if (condition?.status === 'dead') {
    const cause = typeof condition.cause === 'string' ? condition.cause.trim() : '';
    paragraphs.push(cause && cause !== '未获知' ? `${cause.replace(/[。！？]+$/u, '')}。` : '已死亡。');
  }
  if (verdict && !verdict.executedIds?.includes(subjectId) && condition?.status !== 'executed') {
    paragraphs.push(verdict.verdict.kind === 'unresolved_tie'
      ? '审判未能选定魔女，将与其他参加者一同接受处刑。'
      : '经审判认定为魔女，等待处刑。');
  }
  return { ...(known || { id: subjectId, name: '？？？', unidentified: true }), ...projected,
    ...(prisonerNumber ? { prisonerNumber } : {}), profileParagraphs: paragraphs };
}

export function ownerProfile(state, ownerId, subjectId) {
  if (!isKnowledgeGated(state) || !knowsIdentity(state, ownerId, subjectId)) return null;
  const result = { id: subjectId, name: canonicalName(state, subjectId) };
  if (subjectId === 'warden') result.role = '典狱长';
  const own = state.actorKnowledge?.byActor?.[ownerId]?.[subjectId];
  const condition = ownerProfileCondition(state, ownerId, subjectId);
  if (condition) {
    result.observedCondition = condition.status === 'executed' ? '判决执行已结束，已不参加活动'
      : condition.kind === 'official_notice' ? '已通报死亡'
        : condition.status === 'fatal_injury' ? '本人目击致命伤害，已不参加活动' : '本人已确认死亡';
    result.knownCause = condition.cause || '未获知';
    result.knowledgeSource = condition.kind === 'official_notice' ? '典狱长正式通知'
      : condition.status === 'executed' ? '公开判决执行' : '本人见闻';
    result.knowledgeAcquiredAt = condition.at;
  }
  if (own?.statements?.length) {
    const recent = []; let chars = 0;
    for (const row of own.statements.slice(-8).reverse()) {
      if (chars + row.text.length > 2400) break;
      recent.unshift({ text: row.text, attribution: '本人陈述，内容未自动核实', occurredAt: row.at }); chars += row.text.length;
    }
    if (recent.length) result.attributedStatements = recent;
  }
  return result;
}
/** Full owner-held source for a display summary, not the recent-eight dossier
 * projection. It keeps every current statement (including later corrections)
 * and the exact source keys/times; the caller may decline to batch an oversized
 * subject rather than truncate away its newest correction. */
export function ownerProfileSource(state, ownerId, subjectId) {
  if (!isKnowledgeGated(state) || !knowsIdentity(state, ownerId, subjectId)) return null;
  const profile = ownerProfile(state, ownerId, subjectId); if (!profile) return null;
  const own = state.actorKnowledge?.byActor?.[ownerId]?.[subjectId];
  return {
    id: subjectId, name: profile.name, ...(profile.role ? { role: profile.role } : {}),
    recognized: recognizesPerson(state, ownerId, subjectId),
    statements: (own?.statements || []).map(row => ({ key: row.key, at: row.at, kind: row.kind, text: row.text })),
    ...(profile.observedCondition ? { condition: profile.observedCondition,
      cause: profile.knownCause, conditionSource: profile.knowledgeSource,
      conditionAt: profile.knowledgeAcquiredAt } : {}),
  };
}
/** An encyclopedia index is not a newly created physical file or disclosure. */
export function ownerReadableProfiles(state, ownerId) {
  return knownIdentityIds(state, ownerId).filter(id => id !== 'warden').map(id => {
    const profile = ownerProfile(state, ownerId, id); if (!profile) return null;
    const lines = [profile.name, ...(profile.attributedStatements || []).map(row => `【本人陈述，未核实】${row.text}`),
      ...(profile.observedCondition ? [`${profile.observedCondition}；死因：${profile.knownCause}；来源：${profile.knowledgeSource}`] : [])];
    return { id: `profile:${id}`, name: `${profile.name}的已知人物记录`, text: lines.join('\n') };
  }).filter(Boolean);
}
