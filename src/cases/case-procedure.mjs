import { initialMechanismDecision } from '../content/initial-run-policy.mjs';
import { hasSoftRuntime } from '../content/relationship-context-policy.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { runtimeCapabilityId } from '../content/runtime-capabilities.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { selectMagicSources, MAGIC_CARD_HASH, magicDefinition } from '../world/magic/ability-definitions.mjs';
import { isProxy } from 'node:util/types';
import { isKnowledgeGated, acquireOfficialNotice, acquirePublicExecution } from '../characters/actor-knowledge.mjs';
import { actorForState, actorsForState, createdPlayerId } from '../creation/player-setup.mjs';
import { prisonClock } from '../world/prison-activity.mjs';
import { hasCaseRuntime, runtimeActive, runtimeRoom, runtimeSetRoom, runtimeInspectable,
  runtimeAcquire, runtimeOperation, runtimeKnownEvidence, runtimeActorHandle, runtimeOptions,
  runtimeRecognizedActors, runtimePhysicalFacts } from '../case-runtime.mjs';
import { confirmedExecutionEvents, deferCasePlayerOutcome } from './case-execution-events.mjs';
import { projectTrialTestimony, parseTestimonyCommand, resolveTrialTestimonySelection,
  recordTrialTestimonyAttempt, testimonyFeedback } from './trial-testimony.mjs';
import { bindStatementEntries } from './statement-reactions.mjs';

const INVESTIGATION_SECONDS = 45 * 60;
const DISCUSSION_SECONDS = 60 * 60;
const labels = Object.freeze({ daily: '日常', discovery: '发现现场', investigation: '搜查', assembly: '开庭集合',
  discussion: '审判讨论', ballot: '投票', execution_ready: '等待处刑确认', aftermath: '回归日常', ending: '本视角结束', outcome_pending: '等待身体与能力结算' });
const rules = '发现与通报分开，只有亲自发现现场者可以通报。通报后搜查45个故事分钟，截止时刻不因重复通报改变；集合后仅可前往审判庭。'
  + '开庭时封卷，庭中禁止离庭或新增现场搜查；只能出示本人实际取得的资料，发言与判决不认证案情真相。'
  + '讨论60个故事分钟后冻结参加者与候选名单，全员各投一张有效票、允许自投、不允许弃权。唯一最高票者成为执行对象；最高票并列时，全部投票参加者成为执行对象。执行须由现实玩家另行确认。';
const searchingStages = ['daily', 'discovery', 'investigation', 'aftermath'];
const reportingStages = ['daily', 'discovery', 'investigation', 'aftermath'];
const fail = () => { throw Object.assign(new Error('案件程序、来源或行动权限不一致，未修改进度。'), { code: 'INVALID_AGENT_STATE' }); };
const safeText = (value, maximum = 800) => typeof value === 'string' && Boolean(value.trim()) && value.length <= maximum
  && !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
function record(value, allowed, required = []) {
  if (!value || typeof value !== 'object' || isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const keys = Reflect.ownKeys(value);
  return keys.every(key => typeof key === 'string' && allowed.includes(key)
    && Object.getOwnPropertyDescriptor(value, key)?.enumerable
    && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'))
    && required.every(key => keys.includes(key));
}
const rejected = reason => ({ accepted: false, events: [], elapsed: 0, ...(reason ? { reason } : {}) });
const assertCasePolicy = (state, kind = 'case') => { const reason = initialMechanismDecision(state, kind);
  if (reason) throw Object.assign(new Error('本局初始边界不允许这项案件程序；当前世界与时钟未被修改。'), { code: reason === 'initial_policy_clarification' ? 'INITIAL_POLICY_CLARIFICATION' : 'INITIAL_POLICY_CONFLICT' }); };
const roster = state => actorsForState(state).map(row => row.id);
const living = state => roster(state).filter(id => id !== 'warden' && runtimeActive(state, id));
const publicAudience = state => [...new Set([...living(state), 'warden'])];
const actorName = (state, id) => actorForState(state, id)?.name || id;
const incident = (state, id) => state.caseRuntime.incidents.find(row => row.id === id);
const trace = (state, id) => state.caseRuntime.traces.find(row => row.id === id);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const evidenceIds = rows => Array.isArray(rows) ? rows.map(row => typeof row === 'string' ? row : row?.id || row?.traceId).filter(id => typeof id === 'string') : [];
function ownEvidence(state, actorId) {
  const rows = runtimeKnownEvidence(state, actorId);
  return (Array.isArray(rows) ? rows : []).map(row => typeof row === 'string' ? trace(state, row) : row)
    .filter(row => row && typeof row.id === 'string')
    .map(row => ({ id: row.id, name: row.name, description: row.description }));
}
function ownedDiscoveries(state, actorId) {
  return state.caseRuntime.discoveries.filter(row => row.actorId === actorId && incident(state, row.incidentId));
}
function reportableIds(state, actorId) {
  if (initialMechanismDecision(state, 'report')) return [];
  const p = activeProcedure(state);
  if (!runtimeActive(state, actorId) || actorId === 'warden' || state.completed || p?.stage === 'ending') return [];
  const archived = new Set((state.caseRuntime.procedureHistory || []).flatMap(row => row.incidentIds || [row.incidentId]));
  if (p && !['aftermath', 'ending'].includes(p.stage)) {
    return reportingStages.includes(p.stage) && ownedDiscoveries(state, actorId).some(row => row.incidentId === p.incidentId)
      ? [p.incidentId] : [];
  }
  if (p) archived.add(p.incidentId);
  return [...new Set(ownedDiscoveries(state, actorId).map(row => row.incidentId).filter(id => !archived.has(id)))];
}
function remaining(state, p = activeProcedure(state)) {
  const deadline = p?.stage === 'investigation' ? p.investigationDeadline : p?.stage === 'discussion' ? p.trialDeadline : null;
  return Number.isFinite(deadline) ? Math.max(0, deadline - state.worldTime) : null;
}
function setStage(state, stage) {
  state.caseRuntime.procedure.stage = stage;
  state.phase = `agent_case_${stage}`;
  // A public institutional transition cancels ordinary daily movement, not the
  // actors' positions, biographies, observations, or past activity history.
  if (state.agentWorld) state.agentWorld.routes = [];
}
function notice(state, text, key, { speakerId = null, audienceIds = publicAudience(state), occurredAt = state.worldTime,
  delivery = 'action' } = {}) {
  return { text, speakerId, delivery, audienceIds: [...new Set(audienceIds)], occurredAt,
    ...(safeText(key, 256) ? { observationKey: key } : {}) };
}

export function activeProcedure(state) {
  return state && hasCaseRuntime(state) ? state.caseRuntime.procedure || null : null;
}
export const procedureStage = state => activeProcedure(state)?.stage || 'daily';

function disclosedTestimonySnapshot(state, actorId, id) {
  const p = activeProcedure(state);
  if (!p.disclosedEvidence.includes(id)) return null;
  const observations = [...(state.caseRuntime.observations || []), ...(state.entries || []).map(row => ({ ...row, id: row.observationKey }))];
  // Older present operations spread an ID, but not the inspector's snapshot.
  // Recover only a host-authored, actually delivered presentation whose
  // recorded typed action binds this exact evidence ID. Never parse an NPC's
  // free-form claim/action as a material or fall back to a changed host trace.
  for (const action of [...(state.agentActions || [])].reverse()) {
    const keys = [];
    if (action.intent?.type === 'case' && action.intent.operation === 'present' && action.intent.subjectId === id) {
      keys.push(`${action.jobId}:procedure`);
    }
    const batches = [{ job: action.jobId, decisions: action.decisions },
      ...(action.beats || []).map(beat => ({ job: `${action.jobId}:beat:${beat.beat}`, decisions: beat.decisions }))];
    for (const batch of batches) for (const row of batch.decisions || []) {
      const op = row.proposal?.decision?.operation;
      if (op?.type === 'present' && op.subjectId === id) keys.push(`npc:${batch.job}:${row.actorId}`);
    }
    const delivered = observations.findLast(row => keys.includes(row.id)
      && row.delivery === 'action' && row.audienceIds?.includes(actorId)
      && row.occurredAt >= p.trialStartedAt && row.occurredAt <= state.worldTime);
    const match = delivered && /^公开出示【([^【】\r\n]+)】：([\s\S]+)$/u.exec(delivered.text);
    if (match && safeText(match[1], 800) && safeText(match[2], 4000)) return { id, name: match[1], description: match[2] };
  }
  return null;
}

function testimonyInput(state, actorId) {
  const p = activeProcedure(state); const acquired = state.caseRuntime.evidenceByActor?.[actorId] || {};
  const sealed = new Set(evidenceIds(p.sealedEvidence?.[actorId]));
  const disclosed = new Set(p.disclosedEvidence);
  const owned = new Set(evidenceIds(state.caseRuntime.knowledgeByActor[actorId]));
  // New rounds require an actual acquisition snapshot. Legacy ID-only saves
  // without one can use the already public rules, never a later host trace.
  const presentable = new Set(ownEvidence(state, actorId).map(row => row.id));
  const sources = [...owned].filter(id => presentable.has(id) && (sealed.has(id) || disclosed.has(id))).flatMap(id => {
    const item = acquired[id] || (p.sealedEvidence?.[actorId] || []).find(row => row && typeof row === 'object' && row.id === id)
      || disclosedTestimonySnapshot(state, actorId, id);
    return item && safeText(item.name, 800) && safeText(item.description, 4000)
      ? [{ id, name: item.name, text: item.description, kind: 'material', status: disclosed.has(id) ? 'public' : 'sealed' }] : [];
  });
  const recognized = runtimeRecognizedActors(state, actorId);
  const statements = bindStatementEntries(p.statements.filter(row => !row.audienceIds || row.audienceIds.includes(actorId)).slice(-12),
    state.entries || [], actorId).map(row => {
    const speaker = actorForState(state, row.speakerId);
    return { id: row.id, text: row.text, ...(row.entryId ? { entryId: row.entryId } : {}), ...(speaker ? {
      speakerId: recognized.has(speaker.id) ? speaker.id : runtimeActorHandle(actorId, speaker.id),
      speakerName: recognized.has(speaker.id) ? speaker.name : speaker.appearance,
    } : {}) };
  });
  return { caseId: p.id, actorId, progress: p.testimonyProgress, sources, statements,
    statementReactionVersion: actorId === createdPlayerId(state) ? (runtimeCapabilityId(state.agentRuntimeRevision) === 'agent-prison-runtime@8' ? 3 : 2) : undefined,
    allowPerjury: actorId === createdPlayerId(state) && (state.creation?.playerMode === 'custom' || actorId === 'hiro'),
    fallback: { id: 'public-procedure-rules', name: '通报与开庭时公布的制度记录', text: rules, kind: 'institutional', status: 'public' } };
}

export function procedureStatementReaction(state, token, ownerId = createdPlayerId(state)) {
  const p = activeProcedure(state);
  if (!p || p.stage !== 'discussion' || !(remaining(state, p) > 0) || state.completed || !runtimeActive(state, ownerId)) return null;
  const selection = resolveTrialTestimonySelection(testimonyInput(state, ownerId), token);
  if (selection?.kind !== 'statement_reaction') return null;
  const original = p.statements.find(row => row.id === selection.statementId
    && (!row.audienceIds || row.audienceIds.includes(ownerId)));
  const targetId = original?.speakerId;
  if (!targetId || targetId === ownerId || targetId === 'warden' || !runtimeActive(state, targetId)
    || runtimeRoom(state, targetId) !== runtimeRoom(state, ownerId)) return null;
  return { ...selection, targetId };
}

/** Pure owner-local view; no default state fields or historical event changes. */
export function procedureTestimony(state, actorId = createdPlayerId(state)) {
  const p = activeProcedure(state);
  if (!p || p.stage !== 'discussion' || !(remaining(state, p) > 0) || state.completed
    || actorId === 'warden' || !roster(state).includes(actorId) || !runtimeActive(state, actorId)) return null;
  return projectTrialTestimony(testimonyInput(state, actorId));
}

function testimonyRespondent(state, actorId) {
  const candidates = living(state).filter(id => id !== actorId && id !== createdPlayerId(state) && !['noah', 'hiro'].includes(id));
  const recognized = runtimeRecognizedActors(state, actorId);
  const score = id => (actorForState(state, id)?.communication === 'writing' ? 2 : 0) + (recognized.has(id) ? 0 : 1);
  return candidates.sort((a, b) => score(a) - score(b))[0] || 'warden';
}

/** Additional actor-local projection only. The movement facade owns rooms,
 * exits, handles, ordinary rules, and its base scene. No host causal fields or
 * another actor's discovery, sealed inventory, or ballots cross this boundary. */
export function procedureActorScene(state, actorId) {
  if (!hasCaseRuntime(state) || !roster(state).includes(actorId)) return {};
  if (initialMechanismDecision(state, 'case')) { const physicalFacts = runtimePhysicalFacts(state, actorId);
    return physicalFacts ? { physicalFacts, objects: physicalFacts.objects } : {}; }
  const p = activeProcedure(state); const reportable = reportableIds(state, actorId);
  const stage = !p && reportable.length ? 'discovery' : p?.stage || 'daily';
  const active = runtimeActive(state, actorId) && actorId !== 'warden' && !state.completed;
  const canInspect = active && searchingStages.includes(stage) && (stage !== 'investigation' || remaining(state, p) >= 120);
  const inspectables = canInspect ? runtimeInspectable(state, actorId).map(({ id, name }) => ({ id, name })) : [];
  const known = ownEvidence(state, actorId);
  const sealedIds = new Set([...(evidenceIds(p?.sealedEvidence?.[actorId])), ...(p?.disclosedEvidence || [])]);
  const physicalFacts = runtimePhysicalFacts(state, actorId);
  return { ...(physicalFacts ? { physicalFacts, objects: physicalFacts.objects } : {}), case: { id: p?.id || null, kind: 'causal', stage, phaseLabel: labels[stage], inspectables,
    knownEvidence: p && ['discussion', 'ballot', 'execution_ready'].includes(stage) ? known.filter(row => sealedIds.has(row.id)) : known,
    disclosedEvidence: [...(p?.disclosedEvidence || [])], reportableIncidentIds: reportable,
    candidateIds: p && ['ballot', 'execution_ready'].includes(stage) && active ? [...p.candidateIds] : [],
    statements: (p?.statements || []).filter(row => !row.audienceIds || row.audienceIds.includes(actorId)).slice(-12)
      .map(row => ({ id: row.id, speakerId: row.speakerId, text: row.text, ...(row.audienceIds ? { audienceIds: [...row.audienceIds] } : {}) })),
    remainingSeconds: remaining(state, p), rules,
    ...(stage === 'discussion' && active ? { testimony: procedureTestimony(state, actorId) } : {}) } };
}

const normalize = text => text.replaceAll('諾亞', '诺亚').replaceAll('蕾婭', '蕾雅').replaceAll('蕾娅', '蕾雅')
  .replaceAll('發帶', '发带').replaceAll('蘋果', '苹果').replaceAll('希羅', '希罗').replaceAll('櫻羽艾瑪', '樱羽艾玛');
function namedCandidate(state, name, ids) {
  const value = normalize(name.trim());
  const matches = ids.filter(id => value === id || value === normalize(actorName(state, id))
    || normalize(actorName(state, id)).endsWith(value));
  return matches.length === 1 ? matches[0] : undefined;
}

/** Exact host commands, not a natural-language voting interpreter. Returning
 * null leaves unrelated daily speech/actions to the parent's normal parser. */
export function procedureIntent(state, raw, scene = procedureActorScene(state, createdPlayerId(state))) {
  if (!scene?.case || scene.case.kind !== 'causal' || typeof raw !== 'string') return null;
  const no = message => ({ accepted: false, message });
  if (!safeText(raw, 2000)) return no('请输入不超过两千字的完整行动。');
  const text = normalize(raw.trim()).replace(/[。！!]+$/u, '');
  const yes = intent => {
    try { validateProcedureIntent(scene, intent); return { accepted: true, intent }; }
    catch { return no('当前阶段不能执行此操作；通报须有本人的现场发现，材料须本人实际取得，选票须在冻结的候选名单内。'); }
  };
  const testimony = parseTestimonyCommand(raw);
  if (testimony) {
    const reaction = procedureStatementReaction(state, testimony);
    if (reaction) return { accepted: true, intent: { type: 'conversation', targetId: reaction.targetId,
      playerText: reaction.communicationText, summary: `对选定陈述${reaction.stance === 'question' ? '质疑并请求解释' : reaction.stance === 'agree' ? '表达暂时赞同' : '表达反驳并请求依据'}` } };
    return yes({ type: 'case', operation: 'testimony', subjectId: testimony, summary: '核对本轮标记的记录引用' });
  }
  if (/^(?:核对证词|核對證詞)/u.test(raw.trim())) return no('请使用当前证词轮次中完整的核对指令；引述、附加主张与过期选项不会建立证据连接。');
  if (/^(?:通报命案|通報命案|报告命案|報告命案|报告尸体|報告屍體|报案|報案)$/u.test(text)) {
    const ids = scene.case.reportableIncidentIds;
    if (ids.length !== 1) return no(ids.length ? '已发现多个尚未通报的现场，请用“通报命案：现场标识”明确选择。' : '本人尚未发现可通报的现场。');
    return yes({ type: 'case', operation: 'report', subjectId: ids[0], summary: '通过配发手机通报本人发现的现场' });
  }
  const report = /^(?:通报命案|通報命案)[：:]\s*(\S+)$/u.exec(text);
  if (report) return yes({ type: 'case', operation: 'report', subjectId: report[1], summary: '通过配发手机通报本人发现的现场' });
  if (/^(?:等待至开庭|等待至開庭|等待至搜查结束|等待至搜查結束|等待至讨论结束|等待至討論結束)$/u.test(text)) {
    return yes({ type: 'case', operation: 'wait_boundary', summary: '等待当前程序的截止时刻' });
  }
  const inspect = /^(?:检查|檢查|调查|調查|搜查|查看)\s*(.+)$/u.exec(text);
  if (inspect) {
    const item = scene.case.inspectables.find(row => row.id === inspect[1] || normalize(row.name) === inspect[1]);
    if (item) return yes({ type: 'case', operation: 'inspect', subjectId: item.id, summary: `检查${item.name}` });
    // Physical object inspection exists only for the v2 supplies projection.
    // v1 delivered objects are still visible to actorPerception, but they have
    // no inspect-object-evidence offer; binding them here would shadow the
    // ordinary fallback with a rejected case operation.
    const object = Array.isArray(scene.objects) && scene.physicalFacts && searchingStages.includes(scene.case.stage)
      ? scene.objects.find(row => row.id === inspect[1] || normalize(row.name) === inspect[1]) : null;
    if (object) return yes({ type: 'case', operation: 'inspect', subjectId: object.id,
      summary: `检查${object.name}的当前外观`, inspectionEvidenceVersion: 1 });
    if (!searchingStages.includes(scene.case.stage) || scene.case.knownEvidence.some(row => row.id === inspect[1] || normalize(row.name) === inspect[1])) {
      return no('眼前没有可以检查的该项材料，或现场搜查已经结束；庭中不能补查。');
    }
  }
  const present = /^(?:出示|提交证据|提交證據)\s*(.+)$/u.exec(text);
  if (present) {
    const item = scene.case.knownEvidence.find(row => row.id === present[1] || normalize(row.name) === present[1]);
    return item ? yes({ type: 'case', operation: 'present', subjectId: item.id, summary: `出示${item.name}` })
      : no('只能出示本人实际取得并已封卷或公开的资料；发言不会创造证物。');
  }
  const vote = /^(?:我(?:把票)?投(?:给|給|向)?|投票给|投票給)([^「」『』“”‘’"'？?\r\n]+)$/u.exec(text);
  if (vote) {
    const id = /^(?:自己|我自己|我)$/u.test(vote[1]) ? createdPlayerId(state) : namedCandidate(state, vote[1], scene.case.candidateIds);
    return id ? yes({ type: 'case', operation: 'vote', subjectId: id, summary: '明确提交本人唯一的一票' })
      : no('请明确选择一位合法候选者，也可以投给自己；引用、假设与疑问不会成为选票。');
  }
  if (scene.case.stage === 'ballot') return no('讨论已经结束，请明确输入“我投给某人”或“我投给自己”；引用、猜测与假设不算选票。');
  if (['execution_ready', 'ending'].includes(scene.case.stage)) return no(scene.case.stage === 'execution_ready'
    ? '判决已成立，须由现实玩家在手机上另行确认处刑；模型与普通发言不能执行判决。' : '当前角色的视角已经结束。');
  return null;
}

/** New source13 jobs may capture one exact human court choice. This is not a
 * service proposal: every consumer rebuilds it from the immutable raw request
 * and source state. Missing pins retain the old intent-service path. */
export function hostCaseChoicePlan(state, raw) {
  const stage = activeProcedure(state)?.stage;
  if (!hasSoftRuntime(state)) return null;
  if (stage === 'execution_ready') return { accepted: false, message: procedureIntent(state, raw)?.message
    || '判决已成立，须由现实玩家在手机上另行确认处刑；模型与普通发言不能执行判决。' };
  // A literal button command for an already delivered field-record option
  // doesn't require semantic adjudication. No effect or evidence is issued
  // here: the original case inspection reducer settles after its 120s delay.
  if (state.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION
      && searchingStages.includes(stage ?? 'daily') && safeText(raw, 2000)
      && !/[\u0000-\u001f\u007f]/u.test(raw)) {
    const label = /^(?:执行步骤[：:]|执行)(检查眼前.{1,80}的当前外观并留存本人现场记录)$/u.exec(raw)?.[1];
    if (label) {
      const owner = createdPlayerId(state), scene = procedureActorScene(state, owner);
      const matches = scene.case && !state.completed && runtimeActive(state, owner)
        ? runtimeOptions(state, owner, { perceived: true }).filter(x => x.kind === 'inspect-object-evidence' && x.label === label) : [];
      const no = () => ({ accepted: false, message: '该现场记录未在本人当前视野与阶段获准，未更新见闻或时间。' });
      if (matches.length !== 1) return no();
      const intent = { type: 'case', operation: 'inspect', subjectId: matches[0].objectId,
        summary: '仅检查当前可见外观并留存本人记录', inspectionEvidenceVersion: 1 };
      try { validateProcedureIntent(scene, intent); } catch { return no(); }
      return { accepted: true, intent, plan: { type: 'plan', route: 'steps', summary: intent.summary,
        steps: [{ text: raw, intent: structuredClone(intent), condition: 'always' }] } };
    }
  }
  if (!['discussion', 'ballot'].includes(stage)) return null;
  const attempted = typeof raw === 'string' && /出示|提交证据|提交證據|核对证词|核對證詞|庭上回应|庭上回應|等待至讨论结束|等待至討論結束|我(?:把票)?投|投(?:票|给|給|向)|把票/u.test(raw);
  if (stage !== 'ballot' && !attempted) return null;
  const no = message => ({ accepted: false, message });
  if (!safeText(raw, 2000) || /[\u0000-\u001f\u007f]/u.test(raw)) return no('请单独提交当前庭审中的一个完整本人选择。');
  const parsed = procedureIntent(state, raw);
  if (!parsed?.accepted) return parsed || no('请使用当前交付的完整庭审指令；引用、假设与附加动作不构成选择。');
  const intent = parsed.intent;
  if (intent.type === 'conversation' ? !parseTestimonyCommand(raw)
    : intent.type !== 'case' || !['present', 'testimony', 'wait_boundary', 'vote'].includes(intent.operation))
    return no('本次只能单独选择出示、当前证词回应、讨论截止或本人明确的一票。');
  if (state.completed || !runtimeActive(state, createdPlayerId(state)) || initialMechanismDecision(state, 'case'))
    return no('当前本人或本局初始案件边界不允许这项庭审选择。');
  const plan = { type: 'plan', route: 'steps', summary: intent.summary,
    steps: [{ text: raw, intent: structuredClone(intent), condition: 'always' }] };
  return { accepted: true, intent, plan };
}

/** This validator handles only generalized case intents; fixture and ordinary
 * movement/dialogue validators remain the parent's responsibility. */
export function validateProcedureIntent(scene, intent) {
  if (scene?.case?.kind !== 'causal' || !record(intent, ['type', 'operation', 'subjectId', 'summary',
    'inspectionEvidenceVersion'], ['type', 'operation', 'summary'])
    || intent.type !== 'case' || !safeText(intent.summary)
    || (intent.inspectionEvidenceVersion !== undefined && (intent.operation !== 'inspect' || intent.inspectionEvidenceVersion !== 1))) fail();
  const c = scene.case; const subject = Object.hasOwn(intent, 'subjectId');
  if (intent.operation === 'report') {
    if (!reportingStages.includes(c.stage) || !c.reportableIncidentIds?.length
      || (subject && !c.reportableIncidentIds.includes(intent.subjectId)) || (!subject && c.reportableIncidentIds.length !== 1)
      || (c.stage === 'investigation' && !(c.remainingSeconds > 0))) fail();
  } else if (intent.operation === 'inspect') {
    if (!searchingStages.includes(c.stage)
      || !(c.inspectables?.some(row => row.id === intent.subjectId)
        || (Array.isArray(scene.objects) && scene.objects.some(row => row.id === intent.subjectId)))
      || (c.stage === 'investigation' && c.remainingSeconds < 120)) fail();
  } else if (intent.operation === 'present') {
    if (c.stage !== 'discussion' || !(c.remainingSeconds > 0) || !c.knownEvidence?.some(row => row.id === intent.subjectId)) fail();
  } else if (intent.operation === 'testimony') {
    if (c.stage !== 'discussion' || !(c.remainingSeconds > 0)
      || !c.testimony?.selections.some(row => row.token === intent.subjectId && row.kind !== 'statement_reaction')) fail();
  } else if (intent.operation === 'wait_boundary') {
    if (subject || !['investigation', 'discussion'].includes(c.stage) || !(c.remainingSeconds > 0)) fail();
  } else if (intent.operation === 'vote') {
    if (c.stage !== 'ballot' || !c.candidateIds?.includes(intent.subjectId)) fail();
  } else fail();
  return intent;
}

function beginProcedure(state, source, at) {
  const prior = activeProcedure(state);
  if (prior) (state.caseRuntime.procedureHistory ||= []).push(structuredClone(prior));
  const p = { id: `case-${digest(['causal-procedure@1', source.id]).slice(0, 24)}`, kind: 'causal', incidentId: source.id,
    stage: 'investigation', reports: [], reportedAt: at, investigationDeadline: at + INVESTIGATION_SECONDS,
    trialStartedAt: null, trialDeadline: null, sealedEvidence: null, disclosedEvidence: [], statements: [],
    voterIds: [], candidateIds: [], ballots: null, verdict: null, executedIds: [], completedAt: null };
  state.caseRuntime.procedure = p;
  setStage(state, 'investigation');
  return p;
}
function publicKnowledge(state, actorId, id) {
  const ids = state.caseRuntime.knowledgeByActor[actorId] ||= [];
  if (!evidenceIds(ids).includes(id)) ids.push(id);
}
function validBallots(p, ballots) {
  return record(ballots, p.voterIds, p.voterIds) && Object.values(ballots).every(id => p.candidateIds.includes(id));
}
function verdictFor(p, ballots) {
  const counts = Object.fromEntries(p.candidateIds.map(id => [id, p.voterIds.filter(voter => ballots[voter] === id).length]));
  const maximum = Math.max(...Object.values(counts)); const top = p.candidateIds.filter(id => counts[id] === maximum);
  return { id: `verdict-${digest(['causal-verdict@1', p.incidentId, p.voterIds.map(id => [id, ballots[id]])]).slice(0, 24)}`,
    kind: top.length === 1 ? 'unique_highest' : 'unresolved_tie', counts,
    selectedIds: top.length === 1 ? top : [...p.voterIds] };
}

export function inspectionAcquisition(state, actorId, intent, key, completion = null) {
  const object = state.caseRuntime?.objects?.[intent.subjectId];
  const legacyTrace = state.caseRuntime?.traces?.find(row => row.id === intent.subjectId);
  // A legacy markerless history action could only inspect a trace id. Keep that
  // exact acquisition whenever the same id still names a trace, even if a new
  // physical object later shares the id. New object evidence is explicit or only
  // selected when no legacy trace with that id can explain the old action.
  return object && (intent.inspectionEvidenceVersion === 1 || !legacyTrace)
    ? runtimeOperation(state, actorId, `inspect-object-evidence:${object.id}`, { source: 'procedure-inspect' }, key,
      completion === null ? {} : { objectInspectionCompletion: completion })
    : runtimeAcquire(state, actorId, intent.subjectId, key);
}

/** Mutates only the caller-owned state draft, never its clock, event ledger,
 * revision or action log. The caller advances elapsed and then invokes tick. */
export function settleProcedureIntent(state, actorId, intent, key, options = {}) {
  const policyReason = initialMechanismDecision(state, 'case'); if (policyReason) return rejected(policyReason);
  if (!hasCaseRuntime(state) || state.completed || actorId === 'warden' || !roster(state).includes(actorId)
    || !runtimeActive(state, actorId) || state.caseOutcome?.status === 'pending' || !record(options, ['ballots'])) return rejected();
  try { validateProcedureIntent(procedureActorScene(state, actorId), intent); } catch { return rejected(); }
  if (options.ballots !== undefined && intent.operation !== 'vote') return rejected();
  let p = activeProcedure(state);
  if (intent.operation === 'inspect') {
    const result = inspectionAcquisition(state, actorId, intent, key);
    if (!result.accepted) return rejected();
    return { accepted: true, elapsed: 120, events: result.events.map(row => ({ ...row, audienceIds: [actorId] })) };
  }
  if (intent.operation === 'wait_boundary') return { accepted: true, events: [], elapsed: remaining(state, p) };
  if (intent.operation === 'report') {
    const id = intent.subjectId || reportableIds(state, actorId)[0]; const source = incident(state, id);
    const elapsed = p?.stage === 'investigation' ? Math.min(30, remaining(state, p)) : 30;
    const at = state.worldTime + elapsed; const repeated = Boolean(p && p.incidentId === id && p.stage === 'investigation');
    if (!repeated) p = beginProcedure(state, source, at);
    p.reports.push({ incidentId: id, actorId, at, ...(safeText(key, 256) ? { key } : {}) });
    if (isKnowledgeGated(state) && !repeated) {
      (p.identityNotices ||= []).push({ subjectId: source.victimId, fullName: actorName(state, source.victimId),
        audienceIds: publicAudience(state), sourceKey: `procedure-notice:${p.id}:${at}`, at });
    }
    const deadline = prisonClock(state, p.investigationDeadline);
    const deadlineLabel = `第${deadline.day}日${deadline.label}:${String(deadline.second).padStart(2, '0')}`;
    const text = repeated ? `配发手机已追加${actorName(state, actorId)}对同一现场的通报；原搜查截止时刻不变：${deadlineLabel}。`
      : `配发手机已登记${actorName(state, source.victimId)}的死亡通报，特别搜查启动。通知送达全体参加者：搜查45个故事分钟，固定于${deadlineLabel}结束，随后前往审判庭集合。${rules}`;
    return { accepted: true, elapsed, events: [notice(state, text, key, { speakerId: actorId, occurredAt: at })] };
  }
  if (intent.operation === 'testimony') {
    const selection = resolveTrialTestimonySelection(testimonyInput(state, actorId), intent.subjectId);
    if (!selection || selection.kind === 'statement_reaction') return rejected();
    const events = [];
    if (selection.stance === 'perjury') {
      // A deliberately chosen utterance, not a material disclosure or a fact.
      // Neither its intent nor a truth label is delivered to other actors.
      const text = testimonyFeedback(selection);
      const delivery = actorForState(state, actorId)?.communication === 'writing' ? 'writing' : 'speech';
      const statement = notice(state, text, key, { speakerId: actorId, delivery });
      p.statements.push({ id: `statement-${p.statements.length + 1}`, speakerId: actorId, text, audienceIds: [...statement.audienceIds] });
      return { accepted: true, elapsed: Math.min(90, remaining(state, p)), events: [statement] };
    }
    if (selection.source.kind === 'material') {
      // Reuse the legal sealed/owned presentation gate and acquisition text,
      // not a later host trace or a material borrowed from another owner.
      const disclosed = settleProcedureIntent(state, actorId, { type: 'case', operation: 'present',
        subjectId: selection.source.id, summary: '公开本轮引用的本人封卷材料' }, safeText(key, 240) ? `${key}:source` : undefined);
      if (!disclosed.accepted) return rejected();
      events.push(...disclosed.events.map(row => ({ ...row,
        text: `公开出示【${selection.source.name}】：${selection.source.text}` })));
      for (const owner of publicAudience(state)) {
        const snapshots = state.caseRuntime.evidenceByActor ||= {}; const own = snapshots[owner] ||= {};
        // An earlier/later inspection remains its owner's record. Recipients
        // without one receive exactly the disclosed snapshot, never host text.
        if (!Object.hasOwn(own, selection.source.id)) own[selection.source.id] = {
          id: selection.source.id, name: selection.source.name, description: selection.source.text };
      }
    } else events.push(notice(state, `核对已公布的制度记录【${selection.source.name}】：${selection.source.text}`,
      safeText(key, 240) ? `${key}:source` : undefined));
    const progress = recordTrialTestimonyAttempt(p.testimonyProgress, actorId, selection);
    if (progress !== undefined) p.testimonyProgress = progress;
    const text = testimonyFeedback(selection);
    if (selection.stance === 'question' || selection.matched) events.push(notice(state, text, key));
    else {
      const speakerId = testimonyRespondent(state, actorId); const speaker = actorForState(state, speakerId);
      const delivery = speaker?.communication === 'writing' ? 'writing' : 'speech';
      const known = runtimeRecognizedActors(state, actorId).has(speakerId);
      const label = known ? speaker?.name : speaker?.appearance;
      const row = { ...notice(state, text, key, { speakerId, delivery }),
        ...(label ? { speaker: `${label}${delivery === 'writing' ? '（书写）' : ''}` } : {}) };
      events.push(row);
      p.statements.push({ id: `statement-${p.statements.length + 1}`, speakerId, text, audienceIds: [...row.audienceIds] });
    }
    return { accepted: true, elapsed: Math.min(90, remaining(state, p)), events };
  }
  if (intent.operation === 'present') {
    const item = ownEvidence(state, actorId).find(row => row.id === intent.subjectId);
    if (!p.disclosedEvidence.includes(item.id)) p.disclosedEvidence.push(item.id);
    const recipients = publicAudience(state);
    for (const owner of recipients) publicKnowledge(state, owner, item.id);
    return { accepted: true, elapsed: Math.min(60, remaining(state, p)), events: [notice(state,
      `公开出示【${item.name}】：${item.description}`, key, { speakerId: actorId, audienceIds: recipients })] };
  }
  if (!p.voterIds.includes(actorId)) return rejected();
  const ballots = { ...(p.ballots || {}) };
  if (Object.hasOwn(ballots, actorId) && ballots[actorId] !== intent.subjectId) return rejected();
  ballots[actorId] = intent.subjectId;
  if (options.ballots !== undefined) {
    const others = p.voterIds.filter(id => id !== actorId);
    if (!record(options.ballots, others, others) || Object.entries(options.ballots).some(([id, vote]) => !p.candidateIds.includes(vote)
      || (Object.hasOwn(ballots, id) && ballots[id] !== vote))) return rejected();
    Object.assign(ballots, options.ballots);
  }
  p.ballots = ballots;
  if (!validBallots(p, ballots)) return { accepted: true, events: [], elapsed: 0 };
  p.verdict = verdictFor(p, ballots); setStage(state, 'execution_ready');
  const tally = Object.entries(p.verdict.counts).map(([id, count]) => `${actorName(state, id)}${count}票`).join('、');
  const outcome = p.verdict.kind === 'unique_highest' ? `唯一最高票者为${actorName(state, p.verdict.selectedIds[0])}`
    : '最高票并列，依已公布的制度，全部投票参加者成为执行对象';
  return { accepted: true, elapsed: 0, events: [notice(state,
    `全员有效选票已收齐。计票：${tally}。${outcome}。判决已成立，但不认证案情真相；执行须等待现实玩家在手机上另行确认。`, key)] };
}

/** Boundary events use the original deadline even if a host tick arrives late.
 * This function cannot discover an unseen death or advance story time. */
export function procedureTick(state, key) {
  if (activeProcedure(state)) assertCasePolicy(state);
  const p = activeProcedure(state);
  if (!p || state.completed) return [];
  if (isKnowledgeGated(state)) for (const notice of p.identityNotices || []) {
    if (notice.at <= state.worldTime) acquireOfficialNotice(state, notice);
  }
  if (p.stage === 'investigation' && state.worldTime >= p.investigationDeadline) {
    setStage(state, 'assembly');
    return [notice(state, '搜查时限已到，新的现场检查停止。集合通知已送达；现在只可沿看守指定的通路前往审判庭，尚未自动开庭。',
      key, { occurredAt: p.investigationDeadline })];
  }
  if (p.stage === 'discussion' && state.worldTime >= p.trialDeadline) {
    p.voterIds = living(state); p.candidateIds = [...p.voterIds]; p.ballots = {};
    setStage(state, 'ballot');
    return [notice(state, '一小时讨论已经结束，发言与现场调查停止。投票资格与候选名单已冻结；全员各投一张有效票，允许自投，不允许弃权。唯一最高票者成为执行对象；最高票并列则全部投票参加者成为执行对象。',
      key, { occurredAt: p.trialDeadline })];
  }
  return [];
}

/** The host calls this only for the player's approved assembly-to-court move,
 * after its travel time. This institutional transfer moves everyone, including
 * the player; a clock tick or NPC arrival never calls it automatically. */
export function startProcedureTrial(state, key) {
  if (activeProcedure(state)) assertCasePolicy(state);
  const p = activeProcedure(state); const player = createdPlayerId(state);
  if (!p || p.stage !== 'assembly' || state.completed || !runtimeActive(state, player)) return [];
  for (const id of publicAudience(state)) if (runtimeActive(state, id)) runtimeSetRoom(state, id, 'COURT');
  p.sealedEvidence = structuredClone(state.caseRuntime.knowledgeByActor);
  p.trialStartedAt = state.worldTime; p.trialDeadline = state.worldTime + DISCUSSION_SECONDS;
  setStage(state, 'discussion');
  return [notice(state, '所有仍可参加的少女已由制度统一带入审判庭，搜查材料封卷。讨论开始，限一小时故事时间；庭中不得离庭、远程补查或创造过去不存在的证物。', key)];
}

export function procedureVoterIds(state) {
  const p = activeProcedure(state);
  return p && ['ballot', 'execution_ready'].includes(p.stage) ? [...p.voterIds] : [];
}
export function procedureBallotInput(state, actorId) {
  const p = activeProcedure(state);
  if (!p || p.stage !== 'ballot' || !p.voterIds.includes(actorId) || actorId === 'warden') fail();
  const source = actorForState(state, actorId); if (!source) fail();
  const persona = structuredClone(source.persona);
  persona.boundaries = persona.boundaries.filter(text => !text.includes('玩家控制'));
  return { persona, situation: { locationLabel: '审判庭',
    bodyCondition: '讨论已经结束。只依本人实际获得的见闻、怀疑、动机与判断，独立提交唯一一张有效票；允许自投、不能弃权，不保证指认正确。不知道其他人尚未公布的选择。只输出 ballot，不公开发言。\n'
      + `合法候选标识与姓名：${p.candidateIds.map(id => `${id}＝${actorName(state, id)}`).join('、')}。`,
    perceivedParticipants: [...p.candidateIds], candidateIds: [...p.candidateIds] }, allowedActions: ['vote'] };
}

// Independent execution-life pin; source selection is the existing last-enabled
// label algorithm, never a client mechanism/suppression assertion.
export function hiroExecutionMechanism() {
  const bytes = readFileSync(new URL('../../data/card-source.json', import.meta.url));
  if (createHash('sha256').update(bytes).digest('hex') !== MAGIC_CARD_HASH) fail();
  const sources = selectMagicSources(JSON.parse(bytes));
  if (!sources['处刑台'] || !sources['二阶堂希罗']) fail();
  return { version: 1, ref: 'hiro-authored-nullifying-noose@1', apparatus: sources['处刑台'],
    subject: sources['二阶堂希罗'], cardHash: MAGIC_CARD_HASH,
    definitionFingerprint: magicDefinition('hiro:basic@1').fingerprint,
    disposition: 'closed-inapplicable-authored-suppression' };
}
export function executionLifeAction(state, requestId) {
  assertCasePolicy(state, 'execution');
  const p = activeProcedure(state);
  if (!p || p.stage !== 'execution_ready' || state.caseOne || state.storyLifeVersion !== 1
    || !validBallots(p, p.ballots) || !isDeepStrictEqual(p.verdict, verdictFor(p, p.ballots))
    || !safeText(requestId, 128) || !/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u.test(requestId)
    || (hasSoftRuntime(state) ? !p.verdict.selectedIds.includes('hiro')
      : p.verdict.selectedIds.length !== 1 || p.verdict.selectedIds[0] !== 'hiro')
    || state.caseRuntime?.occupiedBody && Object.entries(state.caseRuntime.occupiedBody.occupants).some(([mind, body]) => mind !== body)
    || !runtimeActive(state, 'hiro') || runtimeRoom(state, 'hiro') !== 'court')
    throw Object.assign(new Error('处刑身体与制度身份不明确或刑具来源不支持。'), { code: 'MAGIC_HOST_RULE_GATED' });
  return { type: 'case_execution', verdictId: p.verdict.id, sceneVersion: 2, storyLifeVersion: 1,
    executionLife: { version: 1, requestId, subjectId: 'hiro', bodyId: 'body:hiro', mindId: 'mind:hiro',
      startedAt: state.worldTime, completedAt: state.worldTime + 120, mechanism: hiroExecutionMechanism() } };
}
export function applyProcedureExecution(state, action) {
  assertCasePolicy(state, 'execution');
  const p = activeProcedure(state);
  const life = Object.hasOwn(action || {}, 'executionLife');
  if (life && !isDeepStrictEqual(action.executionLife?.mechanism, hiroExecutionMechanism()))
    throw Object.assign(new Error('刑具来源未获支持；不能假定死亡回溯适用。'), { code: 'MAGIC_HOST_RULE_GATED' });
  if (life && !isDeepStrictEqual(action, executionLifeAction(state, action.executionLife?.requestId))) fail();
  if (!record(action, ['type', 'verdictId', 'sceneVersion', ...(life ? ['storyLifeVersion', 'executionLife'] : [])], ['type', 'verdictId'])
    || (Object.hasOwn(action, 'sceneVersion') && action.sceneVersion !== 2) || action.type !== 'case_execution'
    || !p || p.stage !== 'execution_ready' || state.completed || !validBallots(p, p.ballots)
    || JSON.stringify(p.verdict) !== JSON.stringify(verdictFor(p, p.ballots)) || action.verdictId !== p.verdict.id) fail();
  const audienceIds = action.sceneVersion === 2
    ? publicAudience(state).filter(id => runtimeRoom(state, id) === 'court') : publicAudience(state);
  const selected = [...p.verdict.selectedIds];
  const recognition = Object.fromEntries(audienceIds.map(id => [id, runtimeRecognizedActors(state, id)]));
  const executionEvents = action.sceneVersion === 2 ? confirmedExecutionEvents({ verdictId: p.verdict.id,
    selectedIds: selected, audienceIds, at: state.worldTime, playerId: createdPlayerId(state),
    deferPlayerOutcome: !life && state.caseOutcomeVersion === 1,
    ...(life ? { executionLifeVersion: 1 } : {}),
    labelFor: (owner, id) => recognition[owner].has(id) ? actorName(state, id) : actorForState(state, id)?.appearance || '眼前的人' }) : [];
  // Conditions are shared with the causal runtime. No separate procedure-only
  // availability list can resurrect a victim or an earlier executed actor.
  const runtime = state.caseRuntime;
  runtime.executedIds = [...new Set([...(runtime.executedIds || []), ...selected])];
  for (const id of selected) {
    const conditions = runtime.conditionsByActor ||= {};
    conditions[id] = { ...(typeof conditions[id] === 'object' ? conditions[id] : {}), status: 'executed',
      executedAt: state.worldTime + 120, verdictId: p.verdict.id };
    runtimeSetRoom(state, id, 'unavailable');
  }
  p.executedIds = selected; state.worldTime += 120; p.completedAt = state.worldTime;
  if (isKnowledgeGated(state)) for (const subjectId of selected) acquirePublicExecution(state,
    { subjectId, audienceIds: state.storyLifeVersion === 1 && hasSoftRuntime(state) && action.sceneVersion === 2 && selected.length > 1
      ? audienceIds.filter(ownerId => !selected.includes(ownerId) || ownerId === subjectId) : audienceIds,
      sourceKey: `procedure-execution:${p.verdict.id}:${subjectId}`, at: state.worldTime });
  const ended = selected.includes(createdPlayerId(state));
  const deferred = !life && ended && state.caseOutcomeVersion === 1;
  if (life) state.caseRuntime.executionLife = { ...structuredClone(action.executionLife), verdictId: action.verdictId,
    status: 'fatal-suppressed', outcome: ended ? 'player-dead' : 'subject-dead' };
  if (ended) { state.completed = !deferred; setStage(state, deferred ? 'outcome_pending' : 'ending'); }
  else setStage(state, 'aftermath');
  if (deferred) deferCasePlayerOutcome(state, { subjectId: createdPlayerId(state), at: state.worldTime,
    cause: 'case-execution', sourceKey: p.verdict.id });
  for (const id of publicAudience(state)) if (runtimeActive(state, id)) runtimeSetRoom(state, id, 'RECEPTION');
  const row = notice(state, `玩家已确认阶段推进，判决的执行程序结束。执行对象：${selected.map(id => actorName(state, id)).join('、')}。`
    + (deferred ? '当前身体遭受致命伤害，后续能力与生命结果尚待宿主结算。'
      : ended ? '你的角色已被执行，当前视角停止；没有自动复活、重置时间或把技术读档当作魔法。'
        : '幸存者返回会客厅，同一世界的日常活动重新开放。案件、证词、判决与每个人的实际见闻继续保留；死亡或已执行者不再参加活动。'),
  // Keep this host event key stable for byte-identical action replay. The
  // cognitive repository namespaces newly delivered execution observations by
  // commit, without changing story entries or inherited observation IDs.
  `execution:${p.verdict.id}`, { audienceIds });
  const speaker = '旁白';
  if (action.sceneVersion === 2) {
    for (const event of executionEvents) state.entries.push({ id: `entry-${state.entries.length + 1}`, ...event });
    if (!ended) state.entries.push({ id: `entry-${state.entries.length + 1}`, speaker,
      ...notice(state, '幸存者沿通路返回会客厅，先前带走的执行对象没有回来。', `execution-v2:return:${p.verdict.id}`,
        { audienceIds: publicAudience(state) }) });
  } else state.entries.push({ id: `entry-${state.entries.length + 1}`, speaker, ...row });
  state.agentActions.push(structuredClone(action)); state.revision += 1;
}

export function procedurePlayView(state) {
  const player = createdPlayerId(state); const scene = procedureActorScene(state, player);
  if (!scene.case) return {};
  const c = scene.case; const p = activeProcedure(state);
  if (!p && !c.reportableIncidentIds.length && !c.knownEvidence.length) {
    if (!c.inspectables.length) return {};
    return { suggestions: ['观察四周', '等待片刻', ...c.inspectables.map(row => `检查${row.name}`)] };
  }
  const mode = ['daily', 'discovery', 'aftermath', 'ending'].includes(c.stage) ? 'daily'
    : ['investigation', 'assembly'].includes(c.stage) ? 'investigation' : 'trial';
  const reportSuggestions = c.reportableIncidentIds.length === 1 ? ['通报命案'] : c.reportableIncidentIds.map(id => `通报命案：${id}`);
  const suggestions = state.completed || ['execution_ready', 'outcome_pending'].includes(c.stage) ? [] : c.stage === 'ballot'
    ? ['我投给自己', ...c.candidateIds.filter(id => id !== player).map(id => `我投给${actorName(state, id)}`)]
    : [...(c.stage === 'assembly' ? [] : ['观察四周', '等待片刻']), ...c.inspectables.map(row => `检查${row.name}`), ...reportSuggestions,
      ...(c.stage === 'investigation' ? ['等待至搜查结束'] : []),
      ...(c.stage === 'assembly' ? ['前往审判庭'] : []),
      ...(c.stage === 'discussion' ? [...c.knownEvidence.map(row => `出示${row.name}`), '等待至讨论结束'] : [])];
  const records = [{ id: 'causal-case-progress', name: '当前案件程序', text: `${c.phaseLabel}。`
    + (p ? '案件通报已登记。' : c.reportableIncidentIds.length ? '本人已发现尚未通报的现场。' : '尚未登记本人的命案通报。')
    + (c.remainingSeconds === null ? '' : `本阶段剩余${c.remainingSeconds}秒故事时间。`) },
  ...c.statements.map(row => ({ id: row.id, name: `${isKnowledgeGated(state) && !runtimeRecognizedActors(state, player).has(row.speakerId)
    ? '？？？' : actorName(state, row.speakerId)}的庭上陈述`, text: row.text })),
  ...(state.caseRuntime.procedureHistory || []).filter(row => row.kind === 'causal').flatMap(row => [
    { id: `${row.id}:history`, name: '此前案件的公开程序记录', text: `${labels[row.stage] || '已登记'}。`
      + (row.verdict ? `已公布的执行对象：${row.verdict.selectedIds.map(id => actorName(state, id)).join('、')}。判决不认证案情真相。` : '') },
    ...(row.statements || []).filter(statement => !statement.audienceIds || statement.audienceIds.includes(player))
      .map(statement => ({ id: `${row.id}:${statement.id}`, name: `${isKnowledgeGated(state) && !runtimeRecognizedActors(state, player).has(statement.speakerId)
        ? '？？？' : actorName(state, statement.speakerId)}此前的庭上陈述`, text: statement.text })),
  ])];
  return { mode, procedureKind: 'causal', phaseLabel: c.phaseLabel, clock: prisonClock(state), suggestions,
    rules: [{ id: 'causal-case-procedure', name: '案件程序与投票规则', text: rules }],
    evidence: c.knownEvidence.map(row => ({ ...row, status: c.disclosedEvidence.includes(row.id) ? '已在庭上公开' : '本人取得的记录' })), records,
    trial: { stage: c.stage, remainingSeconds: c.remainingSeconds, ...(c.testimony ? { testimony: c.testimony } : {}),
      ...(p?.verdict ? { verdict: structuredClone(p.verdict) } : {}) },
    phoneState: c.stage === 'execution_ready' ? 'execution_ready' : c.stage === 'ballot' ? 'ballot' : 'normal',
    ...(c.stage === 'execution_ready' ? { execution: { verdictId: p.verdict.id,
      targets: p.verdict.selectedIds.map(id => ({ id, name: actorName(state, id) })) } } : {}) };
}
