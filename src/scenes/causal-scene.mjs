import { isProxy } from 'node:util/types';
import { directorAssemblyRoom, directorAssemblyKey } from '../director/director-event-lifecycle.mjs';
import { resolvePlanStep } from '../agents/player-intent-contract.mjs';
import { hasSoftRuntime } from '../content/relationship-context-policy.mjs';
import { runtimeCapabilityId } from '../content/runtime-capabilities.mjs';
import { caseActionSeconds } from '../cases/case-action-timing.mjs';
import { guardEnabled, guardDetained, guardProtected, guardView, assertGuardOrdinaryAction, guardNextBoundary,
  settleGuardBoundary, guardActionSeconds, finishGuardAction, finalizeGuardEntries, validateGuardScenePin } from '../world/guard-reaction.mjs';
import { usesCurfewPolicy, assertLawfulLongWait, curfewClockLimit, curfewScenePolicy,
  confinementApplies, lawfulConfinementPlace, confinementCode } from '../world/curfew-policy.mjs';
import { actorsForState, actorForState, createdPlayerId, CREATED_ROOMS, ROOM_CODES } from '../creation/player-setup.mjs';
import { actorPerception, actorTarget, actorHandle, resolvePerceivedIntent, acquisitionAudience, readingMaterial } from '../characters/actor-perception.mjs';
import { enableAutonomy, applyNpcDecisions, persistEnactments, pendingReactionActors } from '../agents/agent-autonomy.mjs';
import { enablePrisonWorld, announcePrisonAssembly, advancePrisonActivities, prisonClock, prisonPublicRules, nextPrisonActivityBoundary } from '../world/prison-activity.mjs';
import { CARD_ASSEMBLY_TEXT, prisonRulebook } from '../content/card-world.mjs';
import { preservesEnactedPlayerSpeech } from '../agents/narrative-boundaries.mjs';
import { bareReplyRootSource } from '../agents/communication-selection30.mjs';
import { localRoomSpeechScene } from '../agents/player-address-resolution.mjs';
import { enableCaseRuntime, runtimeRoom, runtimeSetRoom, runtimeActive, runtimeLocalIds, runtimeOptions,
  runtimeOperation, runtimeObserve, runtimeNextBoundary, advanceCaseRuntime, discoverRuntimeIncidents, runtimeAcquire,
  runtimeApplyItemPolicy, runtimeDiscoverObjects, validatePoseIntent, runtimePhysicalFacts, runtimeBodyIsIdentity } from '../case-runtime.mjs';
import { procedureStatementReaction, activeProcedure, procedureIntent, validateProcedureIntent, settleProcedureIntent, procedureTick,
  startProcedureTrial, procedurePlayView, inspectionAcquisition } from '../cases/case-procedure.mjs';
import { parseTestimonyCommand } from '../cases/trial-testimony.mjs';
import { isCourtyardEntry, activateOutskirts, outskirtsActive, OUTSKIRTS_ROOMS } from '../world/outskirts-world.mjs';
import { statementReactionPerformance } from '../cases/statement-reactions.mjs';
import { assertObservablePlayerAction } from '../agents/narrative-guards.mjs';
import { scheduledCaseOneBoundary, advanceScheduledCaseOne, scheduledCaseArchive } from '../cases/case-one.mjs';
import { settleReceptionIntroductions } from '../characters/reception-introductions.mjs';

const fail = () => { throw Object.assign(new Error('条件式案件行动与其来源或版本不一致。'), { code: 'INVALID_AGENT_STATE' }); };
const safe = (text, limit) => typeof text === 'string' && text.trim() && text.length <= limit
  && !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text);
const exact = (value, fields) => value && typeof value === 'object' && !isProxy(value)
  && Object.getPrototypeOf(value) === Object.prototype && Reflect.ownKeys(value).every(key => typeof key === 'string' && fields.includes(key)
    && Object.getOwnPropertyDescriptor(value, key).enumerable && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
const roomLabel = room => room === 'court' ? '审判庭' : room === 'infirmary' ? '医务室' : OUTSKIRTS_ROOMS[room] || CREATED_ROOMS[room];
const ownerLabel = (state, id) => state.known.includes(id) ? actorForState(state, id).name : actorForState(state, id).appearance;
const terminal = p => ['ballot', 'execution_ready', 'ending'].includes(p?.stage);
function playerTextMagicChoice(offer, choice) {
  if (!offer || !choice || typeof choice !== 'object' || Array.isArray(choice)
    || Object.getPrototypeOf(choice) !== Object.prototype || isProxy(choice)) return false;
  const keys = Reflect.ownKeys(choice);
  if (keys.length === 1 && keys[0] === 'end') return choice.end === true && Boolean(offer.end);
  if (keys.length === 2 && keys.includes('customBinding') && keys.includes('targetHandle')) {
    if (!Object.getOwnPropertyDescriptor(choice, 'customBinding')?.enumerable
      || !Object.getOwnPropertyDescriptor(choice, 'targetHandle')?.enumerable
      || typeof choice.customBinding !== 'string' || typeof choice.targetHandle !== 'string') return false;
    const action = offer.custom?.actions?.find(row => row.customBinding === choice.customBinding);
    const target = offer.custom?.targets?.find(row => row.handle === choice.targetHandle);
    return Boolean(action && target && Array.isArray(action.targetKinds) && action.targetKinds.includes(target.kind));
  }
  if (keys.length === 2 && keys.includes('swapAction') && keys.includes('relationHandle')) {
    if (choice.swapAction !== 'restore' || typeof choice.relationHandle !== 'string'
      || !Object.getOwnPropertyDescriptor(choice, 'swapAction')?.enumerable
      || !Object.getOwnPropertyDescriptor(choice, 'relationHandle')?.enumerable) return false;
    return Boolean(offer.swap?.actions?.some(row => row.swapAction === 'restore'
      && row.relationHandle === choice.relationHandle));
  }
  if (keys.length !== 2 || !keys.includes('grantId') || !keys.includes('targetHandle')
    || !Object.getOwnPropertyDescriptor(choice, 'grantId')?.enumerable
    || !Object.getOwnPropertyDescriptor(choice, 'targetHandle')?.enumerable
    || typeof choice.grantId !== 'string' || typeof choice.targetHandle !== 'string') return false;
  const action = offer.actions?.find(row => row.grantId === choice.grantId);
  const target = offer.targets?.find(row => row.handle === choice.targetHandle);
  return Boolean(action && target && Array.isArray(action.targetKinds) && action.targetKinds.includes(target.kind)
    && (action.operation !== 'self-float' || target.label === '本人身体'));
}
const dailyScheduleOpen = state => {
  const p = activeProcedure(state);
  return !p || p.stage === 'aftermath';
};
// Only the host can authorize this operation. Its version belongs to a new
// job/action, never to an intent, a scene projection or model-owned prose.
export function parseScheduleWaitIntent(state, raw, version) {
  if (version !== 1 || !['等待至下一作息边界', '休息至下一作息边界'].includes(raw.trim())) return null;
  const player = createdPlayerId(state); const procedure = activeProcedure(state);
  const archived = new Set((state.caseRuntime?.procedureHistory || []).flatMap(row => row.incidentIds || [row.incidentId]));
  if (procedure?.stage === 'aftermath') for (const id of procedure.incidentIds || [procedure.incidentId]) archived.add(id);
  const home = actorForState(state, player)?.locationId;
  if (!['agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(state.agentRuntimeRevision)) || (state.caseOne && state.storyArc?.status !== 'aftermath') || state.creation?.scenarioId === 'case-1'
    || state.completed || !runtimeActive(state, player) || (procedure && !['daily', 'aftermath'].includes(procedure.stage))
    || (state.caseRuntime?.incidents || []).some(row => !archived.has(row.id))
    || !home || !Object.entries(ROOM_CODES).some(([room, code]) => code === home && !['corridor', 'reception'].includes(room))
    || ROOM_CODES[runtimeRoom(state, player)] !== home) {
    return { accepted: false, message: '只能在正常日常、没有待决案件且身处本人所属牢房时，等待至下一作息边界。' };
  }
  return { accepted: true, intent: { type: 'wait', operation: 'until_schedule', summary: '在所属牢房等待至下一作息边界' } };
}
export function nextScheduleBoundary(state) {
  if (!state.agentWorld) fail();
  const start = state.agentWorld.startSecond; const day = 24 * 3600;
  const firstDay = Math.floor((start + state.worldTime) / day);
  for (let d = firstDay; d <= firstDay + 1; d++) for (const hour of [6, 10, 12, 15, 17, 22]) {
    const at = d * day + hour * 3600 - start;
    if (at > state.worldTime) return at;
  }
  fail();
}
export function nextFreePeriodBoundary(state, { morningOnly = false } = {}) {
  if (!dailyScheduleOpen(state) || !state.agentWorld) return null;
  const start = state.agentWorld.startSecond; const day = 24 * 3600;
  const firstDay = Math.floor((start + state.worldTime) / day);
  let earliest = Number.MAX_SAFE_INTEGER;
  for (let d = firstDay; d <= firstDay + 2; d++) {
    for (const hour of (morningOnly ? [6] : [6, 12, 17])) {
      const at = d * day + hour * 3600 - start;
      if (at > state.worldTime && at < earliest) earliest = at;
    }
  }
  return earliest < Number.MAX_SAFE_INTEGER ? earliest : null;
}

export function causalPlayerScene(state) {
  const player = createdPlayerId(state);
  if (state.completed && !runtimeActive(state, player)) return { location: state.location, roomId: 'unavailable',
    description: '当前角色的视角已经结束。', nearby: [], adjacent: [], permittedDestinations: [], readable: [],
    doorOpen: false, screenAvailable: false, clock: prisonClock(state), caseRuntime: { version: 1, options: [] },
    case: { kind: 'causal', stage: 'ending', inspectables: [], knownEvidence: [], reportableIncidentIds: [], candidateIds: [], statements: [] } };
  const perception = actorPerception(state, player);
  const ownPose = runtimePhysicalFacts(state, player)?.pose;
  if (guardDetained(state)) return { ...perception, nearby: [], screenAvailable: false, clock: prisonClock(state), guard: guardView(state) };
  return { ...perception, ...(ownPose?.elevation ? { ownPose: { elevation: ownPose.elevation } } : {}), ...(guardEnabled(state) ? { guard: guardView(state) } : {}), ...(usesCurfewPolicy(state) ? { confinement: curfewScenePolicy(state, player, runtimeRoom(state, player)) } : {}),
    screenAvailable: !['corridor', 'reception', 'court', 'infirmary'].includes(runtimeRoom(state, player)),
    nearby: state.caseRuntime?.occupiedBody ? perception.nearby.map(row => {
      const id = actorTarget(state, player, row.id);
      if (!id) fail();
      return { ...row, id };
    }) : runtimeLocalIds(state, runtimeRoom(state, player)).filter(id => id !== player && id !== 'warden' && runtimeActive(state, id))
      .map(id => ({ id, label: ownerLabel(state, id), appearance: actorForState(state, id).appearance })),
    clock: prisonClock(state),
    actionLimits: '只能执行本人当前交付的有限步骤。首版不支持玩家主动致命攻击或共犯、任意毁证、未建模能力、多人共谋或多案合并；其他自由描述只是尝试，不会用旁白补成实际结果。' };
}
// Only a positive, finite approach-and-test of the local door. No inferred
// passage, no condition, no request for somebody else's act, and no alias from
// a candidate's summary. This classifier never changes the wire intent kind.
const cellDoorAttemptSource = /^我(?:走到|走近|来到)(?:(?:眼前的)?(?:牢门|铁栅栏门|铁门|门))(?:边|前|旁)?[，,](?:(?:伸手|用手))?(?:试着|尝试)(?:伸手)?(?:轻轻|轻)推(?:开|动)?(?:眼前的)?(?:牢门|铁栅栏门|铁门|门)(?:一下)?[。！]$/u;
export const isCellDoorAttemptStep = (source, intent) => typeof source === 'string' && intent?.type === 'act'
  && !Object.hasOwn(intent, 'operation') && !Object.hasOwn(intent, 'targetId') && !Object.hasOwn(intent, 'playerText')
  && cellDoorAttemptSource.test(source);

export function cellDoorAttemptRootSource(source, steps) {
  return Boolean(bareReplyRootSource(source, steps) && isCellDoorAttemptStep(steps[2].text, steps[2].intent));
}

export function cellDoorAttemptActionPin(plan, source, steps) {
  return plan.cellDoorAttemptVersion === 1 && cellDoorAttemptRootSource(source, steps) ? { cellDoorAttemptVersion: 1 } : {};
}

/** Only the authored cell exit is a valid target. The schedule's native lock
 * fact and the current player-specific exit permission are independent. */
export function cellDoorAttemptState(state, scene = causalPlayerScene(state)) {
  const code = ROOM_CODES[scene.roomId];
  if (!/^(?:CELL(?:_\d+)?|PLAYER_CELL)$/u.test(code ?? '') || runtimeRoom(state, createdPlayerId(state)) !== scene.roomId
    || !runtimeActive(state, createdPlayerId(state)) || guardDetained(state) || typeof state.agentDoorOpen !== 'boolean') return 'unavailable';
  if (!state.agentDoorOpen) return 'locked';
  return scene.permittedDestinations.includes('corridor') ? 'passable' : 'restricted';
}

/** HOST only: join current private menu metadata to IDs actually projected to
 * this player. No metadata is added to the historical/model scene shape. */
export function resolvePlayerPlanStep(state, step) {
  const scene = causalPlayerScene(state);
  if (hasSoftRuntime(state) && step.intent.type === 'case') {
    const intent = structuredClone(step.intent);
    // The wire selects only an owner's delivered ID. Recheck the actual prefix,
    // not the job-creation menu, before requesting performance for a later step.
    if (!['report', 'inspect', 'wait_boundary'].includes(intent.operation)
      || intent.operation === 'wait_boundary' && scene.case?.stage !== 'investigation') return null;
    if (intent.operation === 'inspect' && !scene.case?.inspectables.some(row => row.id === intent.subjectId)) {
      const offered = new Set((scene.caseRuntime?.options || []).map(row => row.id));
      const object = scene.objects?.find(row => row.id === intent.subjectId);
      const option = object && runtimeOptions(state, createdPlayerId(state)).find(row => offered.has(row.id)
        && row.kind === 'inspect-object-evidence' && row.objectId === object.id);
      if (!option) return null;
      intent.inspectionEvidenceVersion = 1;
    }
    try { validateCausalIntent(scene, intent); }
    catch (error) { if (error.code === 'INVALID_AGENT_STATE') return null; throw error; }
    return intent;
  }
  if (step.intent.type !== 'item') return resolvePlanStep(step, scene);
  const player = createdPlayerId(state);
  const offered = new Set((scene.caseRuntime?.options || []).map(row => row.id));
  // Runtime option target handles encode stable mind IDs (runtimeOptions),
  // while player scene body handles were already resolved by the plan owner.
  // Reverse only current local minds, using the existing owner-handle codec.
  const targets = Object.fromEntries(scene.nearby.map(({ id }) => [actorHandle(player, id), id]));
  const hostOptions = runtimeOptions(state, player, { perceived: true }).filter(row => offered.has(row.id))
    .map(({ id, kind, objectId, targetId }) => resolvePerceivedIntent({ id, kind, objectId, ...(targetId ? { targetId } : {}) }, targets));
  return resolvePlanStep(step, scene, hostOptions);
}
// Narrow natural aliases for the currently delivered take/drop entries. Only a sentence that
// starts with the action (optionally the player's own first-person 我) is taken over; ordinary
// dialogue, negation, hypothesis, quotes, speech and multi-clause text return null and keep their
// original routing. A matched sentence maps onto the single existing option of that kind via its
// delivered full name; the original option.id goes through the original runtime consumer.
// Unknown/unreachable/held-by-other or ambiguous objects are refused without creating a job or
// mutating the world; no new object or permission is invented.
const PHYSICAL_VERB = /^(?:我)?(?:拿起|拿取|拾起|捡起|撿起|放下)/u;
const PHYSICAL_SIMPLE = /^(?:我)?(拿起|拿取|拾起|捡起|撿起|放下)\s*(?:眼前的|手中的|手上的)?\s*([^，,、；;：:。！!？?\s]{1,24})$/u;
function physicalFreeInput(scene, command) {
  if (!PHYSICAL_VERB.test(command)) return null;
  const simple = PHYSICAL_SIMPLE.exec(command);
  if (!simple) return null;
  const take = simple[1] !== '放下'; const item = simple[2];
  const matches = (scene.caseRuntime?.options || []).filter(option => {
    if (option.kind !== (take ? 'take' : 'drop')) return false;
    const label = String(option.label || '');
    const name = take ? /^拿取眼前的(.+)$/u.exec(label)?.[1] : /^将手中(.+)放在眼前$/u.exec(label)?.[1];
    return Boolean(name) && (name === item || item === `眼前的${name}` || item === `手中的${name}`);
  });
  if (matches.length === 1) return { accepted: true, intent: { type: 'runtime', subjectId: matches[0].id, summary: matches[0].label } };
  return { accepted: false, code: 'UNSUPPORTED_PHYSICAL_INPUT',
    message: matches.length ? '眼前有多个同名物件，无法唯一确定要拿放的那一件；世界未改变。'
      : '眼前没有可以拿取或放下的这个物件，或它不在本人可处置范围；世界未改变。' };
}
// Only re-phrase an already-offered physical-object inspection back into the
// existing exact `检查<host name>` grammar. The host option, object identity,
// duration, trace and audience remain the original procedure consumer.
const OBJECT_INSPECT_INPUT = /^(?:我)?(?:仔细|认真|仔细地)?(?:检查|檢查|查看|观察|觀察)\s*(?:眼前的|这个|那个)?\s*([^，,、；;：:。！!？?\s]{1,24}?)\s*的?\s*(?:当前|當前)?(?:外观|外觀|位置|状态|狀態|情况|情況)(?:和\s*(?:当前|當前)?(?:外观|外觀|位置|状态|狀態|情况|情況))?$/u;
function objectInspectionCommand(scene, command) {
  const input = OBJECT_INSPECT_INPUT.exec(command);
  if (!input || !Array.isArray(scene.objects)) return null;
  const objects = scene.objects.filter(row => row.name === input[1] || row.name.endsWith(input[1]) || input[1].endsWith(row.name));
  if (objects.length !== 1) return null;
  const offered = (scene.caseRuntime?.options || []).some(row => row.kind === 'inspect-object-evidence'
    && row.id === `inspect-object-evidence:${objects[0].id}`);
  return offered ? `检查${objects[0].name}` : null;
}
// The only ordinary force text this slice accepts is an already-offered,
// scene-authored structure: the long table, or the authored `火精之室` wooden
// guesthouse whose courtyard sight scope and interior room are explicit. It
// never turns an arbitrary noun into a physics target; the actual option was
// produced by the host's current strength world.
const FORCE_ACTION = '(?:推|推动|推开|搬|搬动|挪|挪动)';
const FORCE_TABLE = '(?:眼前的|这张|那张)?(?:会客厅)?长桌';
const FORCE_BUILDING = '(?:眼前的|这座|这栋|那座|那栋)?(?:火精之室|木屋|木屋招待所|招待所|建筑)';
const FORCE_TARGET = `(?:${FORCE_TABLE}|${FORCE_BUILDING})`;
const FORCE_SIMPLE = new RegExp(`^(?:我)?(?:用力)?${FORCE_ACTION}(?:一下)?${FORCE_TARGET}$`, 'u');
const FORCE_BA = new RegExp(`^(?:我)?(?:把|将)${FORCE_TARGET}(?:用力)?${FORCE_ACTION}(?:开|动|到一边)?$`, 'u');
function forceFreeInput(scene, command) {
  if (!FORCE_SIMPLE.test(command) && !FORCE_BA.test(command)) return null;
  const building = /(?:火精之室|木屋|木屋招待所|招待所|建筑)/u.test(command);
  const matches = (scene.caseRuntime?.options || []).filter(option => option.kind === 'force-structure'
    && (building ? !String(option.label || '').includes('长桌') : String(option.label || '').includes('长桌')));
  if (matches.length === 1) return { accepted: true, intent: { type: 'runtime', subjectId: matches[0].id, summary: matches[0].label } };
  return { accepted: false, code: 'UNSUPPORTED_FORCE_INPUT',
    message: building
      ? '眼前没有本人此刻可以推动的已指认木屋建筑，或身体没有处于可发力状态；世界未改变。'
      : '眼前没有本人此刻可以推动的已指认长桌，或身体没有处于可发力状态；世界未改变。' };
}
// Ordinary inspection of the already-activated parent building, not a magic
// check and not a crime-scene inference. It reads only the current authored
// id/name/placement through the same runtime option/operation/evidence path.
const STRUCTURE_INSPECT = /^(?:我)?(?:检查|檢查|查看|观察|觀察)(?:眼前的|眼前|这座|這座|这栋|這棟|那座|那栋|那棟)?(?:火精之室|木屋|木屋招待所|招待所|建筑|建築)(?:的)?(?:当前|當前)?(?:外观|外觀|位置|状态|狀態|情况|情況)?$/u;
function structureInspectFreeInput(scene, command) {
  if (!['daily', 'discovery', 'aftermath', 'investigation'].includes(scene.case?.stage)
    || !STRUCTURE_INSPECT.test(command)) return null;
  const matches = (scene.caseRuntime?.options || []).filter(option => option.kind === 'inspect-structure');
  if (matches.length === 1) return { accepted: true, intent: { type: 'runtime', subjectId: matches[0].id, summary: matches[0].label } };
  return { accepted: false, code: 'UNSUPPORTED_STRUCTURE_INSPECTION',
    message: matches.length
      ? '眼前有多处已激活建筑，无法唯一确定要核对的这一栋；世界未改变。'
      : '当前没有本人可以普通核对的已激活建筑，或当前阶段不能检查；世界未改变。' };
}
export function parseCausalIntent(state, raw) {
  try { assertGuardOrdinaryAction(state); } catch (error) { return { accepted: false, code: error.code, message: error.message }; }
  const phase = activeProcedure(state)?.stage;
  if (state.completed || ['execution_ready', 'ending'].includes(phase)) return { accepted: false,
    message: phase === 'execution_ready' ? '请先在手机上确认当前判决，或读取先前存档。' : '当前角色的视角已经结束，可以读取先前存档。' };
  const scene = causalPlayerScene(state);
  const command = raw.trim().replace(/[。！!]+$/u, '').replaceAll('會客廳', '会客厅')
    .replaceAll('號牢房', '号牢房').replaceAll('審判庭', '审判庭');
  const parsed = procedureIntent(state, objectInspectionCommand(scene, command) || raw, scene);
  if (parsed) return parsed;
  if (terminal(activeProcedure(state))) return { accepted: false, message: phase === 'ballot'
    ? '请明确提交一张合法选票；可以投给自己。' : '请先在手机上确认当前判决，或读取先前存档。' };
  if (!outskirtsActive(state) && isCourtyardEntry(command)
    && runtimeRoom(state, createdPlayerId(state)) === 'reception') {
    // Detached parse projection only: the real state and old views stay exact
    // until the scene draft commits this same ordinary courtyard entry.
    const projected = structuredClone(state);
    activateOutskirts(projected);
    const scene = causalPlayerScene(projected);
    const target = scene.adjacent.find(row => row.id === 'courtyard');
    if (target && scene.permittedDestinations.includes(target.id))
      return { accepted: true, intent: { type: 'move', destination: target.id, summary: `前往${target.label}` } };
  }
  if (phase === 'discussion' && /^(?:阅读|閱讀|查阅|查閱)\s*\S/u.test(command)) {
    return { accepted: false, message: '庭中资料已经封卷，不能新增阅读或现场补查；可以讨论或出示本人已经取得的材料。' };
  }
  const step = /^(?:执行步骤|執行步驟|执行|執行)\s*[:：]?\s*(.+)$/u.exec(command);
  if (step) {
    const options = scene.caseRuntime.options;
    const option = options.find(row => row.id === step[1] || row.label === step[1]);
    if (option?.kind === 'report') return procedureIntent(state, '通报命案', scene);
    return option ? { accepted: true, intent: { type: 'runtime', subjectId: option.id, summary: option.label } }
      : { accepted: false, message: '这不是本人当前可以执行的步骤；未知意图不会直接改写世界。' };
  }
  const physical = physicalFreeInput(scene, command);
  if (physical) return physical;
  const structureInspection = structureInspectFreeInput(scene, command);
  if (structureInspection) return structureInspection;
  const forced = forceFreeInput(scene, command);
  if (forced) return forced;
  if (/^(?:销毁证据|銷毀證據|毁灭证据|毀滅證據|合并案件|合併案件|发动未建模能力|發動未建模能力)$/u.test(command)) {
    return { accepted: false, message: '首版尚不支持任意毁证、未建模能力、多人共谋或多案合并；这次输入没有改变物件、伤势或案件。' };
  }
  const move = /^(?:去|前往|返回|回到|走到)([^，,、；;：:。！!？?\s]{1,24})$/u.exec(command);
  if (move) {
    const target = scene.adjacent.find(row => row.id === move[1] || row.label === move[1] || (row.id === 'court' && move[1] === '審判庭'));
    return target ? { accepted: true, intent: { type: 'move', destination: target.id, summary: `前往${target.label}` } }
      : { accepted: false, message: '请沿当前允许的相邻通路移动；审判中不能返回现场。' };
  }
  if (!guardEnabled(state) && confinementApplies(state) && !lawfulConfinementPlace(state, createdPlayerId(state), runtimeRoom(state, createdPlayerId(state)))) {
    return { accepted: false, message: '当前不是放风时间，不能继续在公共地点停留。请沿相邻通路返回所属牢房；只有实际获准者能留医务室。' };
  }
  if (dailyScheduleOpen(state)) {
    if (/(?:睡(?:觉|覺)?(?:到|至)?(?:明天|第二天|次日)?(?:早上|清晨|天亮|早晨)|睡到(?:明天|第二天|次日)|等待?(?:到|至)(?:明天|第二天|次日)?(?:早上|清晨|天亮|早晨)|休息(?:到|至)(?:明天|第二天|次日)?(?:早上|清晨|天亮|早晨))/u.test(command)) {
      try { assertLawfulLongWait(state, createdPlayerId(state), runtimeRoom(state, createdPlayerId(state)), nextFreePeriodBoundary(state, { morningOnly: true })); }
      catch (error) { return { accepted: false, message: error.message }; }
      return { accepted: true, intent: { type: 'wait', operation: 'until_morning', summary: '在当前地点休息等待至清晨放风时刻' } };
    }
    if (/(?:等待?(?:到|至)(?:自由时间|自由時間|放风|放風|开门|開門|解锁|解鎖)|(?:构思|構思|思考|推演|盘算|盤算|规划|規劃).*(?:直到|直至|到|至)(?:自由时间|自由時間|放风|放風|早上|清晨|天亮|开门|開門)|在?(?:门禁|門禁|滞留|滯留|就寝|就寢)(?:时间|時間|时段|時段)?.*(?:直到|直至|到|至)(?:自由时间|自由時間|放风|放風|早上|清晨|天亮|开门|開門))/u.test(command)) {
      try { assertLawfulLongWait(state, createdPlayerId(state), runtimeRoom(state, createdPlayerId(state)), nextFreePeriodBoundary(state)); }
      catch (error) { return { accepted: false, message: error.message }; }
      return { accepted: true, intent: { type: 'wait', operation: 'until_free_time', summary: '在当前地点思考并等待至下一段自由放风时间' } };
    }
  }
  if (phase === 'assembly' && !/^(?:观察(?:四周|周围)?|觀察(?:四周|周圍)?|看看四周|环顾四周|環顧四周)$/u.test(command)) {
    return { accepted: false, message: '搜查已经结束；现在只能观察眼前或沿指定通路前往审判庭集合。' };
  }
  return null;
}
export function roomGroupSpeechAudience(state, scene = causalPlayerScene(state)) {
  const playerId = createdPlayerId(state);
  if (!localRoomSpeechScene(scene) || state.caseRuntime?.occupiedBody || !actorForState(state, playerId)
    || actorForState(state, playerId).communication === 'writing') return [];
  const nearby = new Set(scene.nearby.map(row => row.id));
  const audible = acquisitionAudience(state, playerId, { delivery: 'speech' }).filter(id => id === playerId || nearby.has(id));
  return audible.includes(playerId) && audible.length >= 3 ? audible : [];
}

export function validateCausalIntent(scene, intent, { scheduleWaitVersion, postureActionVersion, rawInput,
  playerTextMagicVersion, magicOffer, roomGroupSpeechVersion } = {}) {
  if (Object.hasOwn(intent ?? {}, 'speechScope')) {
    if (roomGroupSpeechVersion !== 1 || !exact(intent, ['type', 'summary', 'speechScope', 'playerText'])
      || intent.type !== 'conversation' || intent.speechScope !== 'room' || !safe(intent.summary, 800)
      || !safe(intent.playerText, 1400) || !localRoomSpeechScene(scene)) fail();
    return intent;
  }
  if (intent?.operation === 'pose') {
    if (postureActionVersion !== 1 || scene.guard?.pending || scene.guard?.detention?.status === 'detained'
      || scene.confinement?.returnRequired || ![undefined, 'daily', 'aftermath', 'investigation'].includes(scene.case?.stage)) fail();
    validatePoseIntent(scene.postureActions || [], intent, rawInput);
    return intent;
  }
  const evidenceInspection = intent?.type === 'case' && intent?.operation === 'inspect'
    && intent?.inspectionEvidenceVersion === 1;
  const fields = ['type', 'summary', 'targetId', 'destination', 'playerText', 'subjectId', 'operation', 'evidenceIds', 'statementId', 'claim', 'stance',
    ...(playerTextMagicVersion === 1 ? ['magic'] : []), ...(evidenceInspection ? ['inspectionEvidenceVersion'] : [])];
  if (!exact(intent, fields) || !safe(intent.summary, 800)) fail();
  if (intent.magic !== undefined && !playerTextMagicChoice(magicOffer, intent.magic)) fail();
  if (scene.guard?.pending || scene.guard?.detention?.status === 'detained') fail();
  if (scene.confinement?.returnRequired && intent.type !== 'move') fail();
  if (intent.type === 'case') return validateProcedureIntent(scene, intent);
  if (scene.case?.stage === 'discussion' && !['conversation', 'wait', 'act', 'look'].includes(intent.type)) fail();
  if (terminal(scene.case) || (scene.case?.stage === 'assembly' && !(intent.type === 'look'
    || (intent.type === 'move' && intent.destination === 'court')))) fail();
  if (intent.type === 'runtime') {
    if (!exact(intent, ['type', 'summary', 'subjectId']) || !scene.caseRuntime?.options.some(row => row.id === intent.subjectId)) fail();
    return intent;
  }
  if (intent.type === 'read') {
    if (!exact(intent, ['type', 'summary', 'subjectId']) || !scene.readable.some(row => row.id === intent.subjectId)) fail();
    return intent;
  }
  if (!['look', 'move', 'broadcast', 'conversation', 'wait', 'follow', 'act'].includes(intent.type)
    || !exact(intent, ['type', 'summary', 'targetId', 'destination', 'playerText',
      ...(intent.type === 'wait' ? ['operation'] : []), ...(playerTextMagicVersion === 1 ? ['magic'] : [])])) fail();
  if (intent.operation === 'until_schedule' && (scheduleWaitVersion !== 1
    || !exact(intent, ['type', 'summary', 'operation']) || !['daily', 'aftermath'].includes(scene.case?.stage))) fail();
  if (scene.confinement?.version === 1 && ['until_morning', 'until_free_time'].includes(intent.operation)
    && scene.confinement.longWaitAllowed !== true) fail();
  if (intent.operation !== undefined && (intent.type !== 'wait'
    || !['until_free_time', 'until_morning', ...(scheduleWaitVersion === 1 ? ['until_schedule'] : [])].includes(intent.operation)
    || ['investigation', 'discussion', 'assembly', 'ballot', 'execution_ready', 'ending'].includes(scene.case?.stage))) fail();
  if (intent.targetId && !scene.nearby.some(row => row.id === intent.targetId)) fail();
  if (['conversation', 'follow'].includes(intent.type) && !intent.targetId) fail();
  if (intent.type === 'move' && !scene.adjacent.some(row => row.id === intent.destination)) fail();
  return intent;
}
function enactment(state, text, speakerId, key, { delivery = 'action', audienceIds } = {}) {
  return { text, speakerId, delivery, occurredAt: state.worldTime,
    audienceIds: audienceIds || acquisitionAudience(state, speakerId, { delivery }), observationKey: key };
}
function normalizeEvents(state, events, key) {
  return events.filter(Boolean).map((event, index) => ({ ...event,
    speaker: event.speaker || (event.speakerId ? ownerLabel(state, event.speakerId) : '眼前的动静'),
    occurredAt: event.occurredAt ?? state.worldTime,
    observationKey: event.observationKey || `${key}:${index + 1}` }));
}
/** Shared clock: settle one due boundary at a time. An observable threat or a
 * procedure transition returns control instead of silently finishing a wait. */
export function advanceCausalTime(state, toTime, key, { npcReactions = false, storyArcVersion, curfewReturn = false,
  guardDetentionWait = false, guardCaseBoundary = null, directorAssembly } = {}) {
  const events = []; const player = createdPlayerId(state); let interrupted = false; let serial = 0;
  // This slot refines an existing real causal segment, never requests time.
  const dueAt = directorAssembly ? Math.max(directorAssembly.notBefore, state.worldTime + 1) : null;
  // Quiet passages must not turn a lawful overnight wait into hundreds of
  // mandatory scene blocks. Keep one witnessed patrol cue; threats stay exact.
  const collectGuard = rows => { for (const row of rows) {
    if (row.observationKey?.includes(':guard:patrol:') && events.some(prior => prior.observationKey?.includes(':guard:patrol:'))) continue;
    events.push(row);
  } };
  if (!Number.isSafeInteger(toTime) || toTime < state.worldTime) fail();
  if (guardEnabled(state)) {
    if (state.guardReaction.pending) return { events, interrupted: true };
    if (guardDetained(state) && !guardDetentionWait) assertGuardOrdinaryAction(state);
    if (!guardDetentionWait) toTime = state.worldTime + guardActionSeconds(state, toTime - state.worldTime);
    const guardNow = settleGuardBoundary(state, `${key}:start`); collectGuard(guardNow.events);
    if (guardNow.interrupted) return { events, interrupted: true };
  }
  let curfew = curfewReturn ? null : curfewClockLimit(state, player, runtimeRoom(state, player), toTime);
  if (curfew?.blocked) throw Object.assign(new Error('当前已到非放风时段，不能继续在公共地点停留。请返回所属牢房；医务室须有实际许可。'), { code: 'CURFEW_STAY_FORBIDDEN' });
  if (curfew) toTime = Math.min(toTime, curfew.at);
  while (state.worldTime < toTime) {
    if (guardDetentionWait && guardCaseBoundary !== null && state.worldTime >= guardCaseBoundary) { interrupted = true; break; }
    if (++serial > (storyArcVersion === 1 || guardEnabled(state) ? 10000 : 2048)) fail();
    // Another event can end an investigation or revoke a medical exception
    // during this very wait. Recheck the current segment, not just its start.
    if (!curfewReturn) {
      const revised = curfewClockLimit(state, player, runtimeRoom(state, player), toTime);
      if (revised && (!curfew || revised.at < curfew.at)) {
        curfew = revised;
        if (revised.blocked) {
          interrupted = true;
          events.push(enactment(state, '当前已进入非放风时段，公共地点的停留必须结束。请返回所属牢房；医务室须有实际许可。', null,
            `${key}:curfew:${revised.deadline}`, { audienceIds: [player] }));
          break;
        }
        toTime = Math.min(toTime, revised.at);
      }
    }
    // New contracts stop the shared clock for an offscreen victim too. The
    // private signal creates an NPC packet, not a player-visible warning or an
    // automatic defensive action. Historical actions retain their old timing.
    if (npcReactions && !guardProtected(state) && pendingReactionActors(state).length) { interrupted = true; break; }
    const introduction = guardDetentionWait || guardProtected(state) ? { events: [], occurred: false } : settleReceptionIntroductions(state, key);
    if (introduction.occurred) { events.push(...introduction.events); interrupted = true; break; }
    // A newly perceived threat interrupts at the current instant. Settle that
    // zero-time boundary before moving routine actors, changing door state or
    // publishing observations belonging to the next clock segment.
    const immediate = advanceCaseRuntime(state, state.worldTime, `${key}:start:${serial}`);
    events.push(...immediate.events);
    if (immediate.interrupted) { interrupted = true; break; }
    const authoredNow = advanceScheduledCaseOne(state, storyArcVersion);
    events.push(...authoredNow.events);
    if (authoredNow.interrupted) { interrupted = true; break; }
    const p = activeProcedure(state); const stage = p?.stage;
    const deadline = stage === 'investigation' ? p.investigationDeadline : stage === 'discussion' ? p.trialDeadline : null;
    const pending = runtimeNextBoundary(state, toTime);
    const dailyRoutes = !p || p.stage === 'aftermath';
    const routine = dailyRoutes ? nextPrisonActivityBoundary(state, toTime) : null;
    const authored = scheduledCaseOneBoundary(state, toTime, storyArcVersion);
    const patrol = guardNextBoundary(state, toTime);
    const directorAt = dueAt !== null && dueAt > state.worldTime && dueAt < directorAssembly.expiresAt ? dueAt : toTime;
    const next = Math.min(toTime, state.worldTime + 30, pending ?? toTime, routine ?? toTime, deadline ?? toTime, authored ?? toTime, patrol ?? toTime, directorAt);
    if (next <= state.worldTime) {
      events.push(...procedureTick(state, `${key}:procedure:${serial}`));
      interrupted = activeProcedure(state)?.stage !== stage || state.completed;
      break;
    }
    const fromTime = state.worldTime; const room = runtimeRoom(state, player);
    // Existing routes share the same segment; unavailable actors cannot be
    // resurrected by an old compliance route.
    if (state.agentWorld && dailyRoutes) {
      if (!runtimeBodyIsIdentity(state) && (state.agentWorld.routes.length || nextPrisonActivityBoundary(state, next) < next))
        throw Object.assign(new Error('交换后的制度路线与跨作息自动移动尚未接线。'), { code: 'MAGIC_HOST_RULE_GATED', requiredHook: 'occupied-body-institutional-routes' });
      state.agentWorld.routes = state.agentWorld.routes.filter(row => runtimeActive(state, row.actorId));
      const actors = actorsForState(state).filter(actor => runtimeActive(state, actor.id));
      advancePrisonActivities(state, { actors, playerId: player, fromTime, toTime: next,
        playerFrom: confinementCode(room) || 'COURT', playerTo: confinementCode(room) || 'COURT',
        label: actor => ownerLabel(state, actor.id), roomLabel: code => code === 'INFIRMARY' ? '医务室' : roomLabel(Object.keys(ROOM_CODES).find(id => ROOM_CODES[id] === code)) || '审判庭' });
      // Route observations are persisted through the existing activity ledger.
      const activities = state.agentWorld.activityLog.filter(row => row.occurredAt > fromTime && row.occurredAt <= next);
      runtimeObserve(state, activities.map(row => ({ text: row.text, speakerId: row.actorId, delivery: 'action',
        audienceIds: row.witnessIds, occurredAt: row.occurredAt, observationKey: `${key}:routine:${row.id}` })));
      for (const activity of activities) {
        activity.observationKey ||= `${key}:routine:${activity.id}`;
        if (activity.witnessIds.includes(player)) events.push({ text: activity.textByActor?.[player] || activity.text, speakerId: null, delivery: 'action',
          audienceIds: [player], occurredAt: activity.occurredAt, observationKey: `${key}:visible:${activity.id}` });
      }
    }
    const advance = advanceCaseRuntime(state, next, `${key}:time:${serial}`);
    state.worldTime = advance.at ?? next;
    const discoveries = discoverRuntimeIncidents(state, `${key}:discovery:${serial}`);
    events.push(...advance.events, ...discoveries, ...procedureTick(state, `${key}:procedure:${serial}`));
    if (guardDetentionWait && guardCaseBoundary !== null && state.worldTime >= guardCaseBoundary) { interrupted = true; break; }
    const authoredResult = advanceScheduledCaseOne(state, storyArcVersion); events.push(...authoredResult.events);
    const guardResult = settleGuardBoundary(state, `${key}:time:${serial}`); collectGuard(guardResult.events);
    if (guardResult.interrupted || authoredResult.interrupted || advance.interrupted || discoveries.some(row => row.audienceIds?.includes(player))
      || activeProcedure(state)?.stage !== stage || state.completed) { interrupted = true; break; }
    // Older world events/guard settle first, including a tie at the due time.
    if (directorAssembly && state.worldTime === dueAt && dueAt < directorAssembly.expiresAt
      && directorAssemblyRoom(state) === directorAssembly.roomId && (!curfew || state.worldTime < curfew.at)
      && !pendingReactionActors(state).length) {
      const notice = announcePrisonAssembly(state, { actors: actorsForState(state).filter(actor => runtimeActive(state, actor.id)),
        playerId: player, locationOf: actor => ROOM_CODES[runtimeRoom(state, actor.id)], text: CARD_ASSEMBLY_TEXT, key: directorAssemblyKey(directorAssembly) });
      if (notice) {
        if (!state.known.includes('warden')) state.known.push('warden');
        events.push({ ...enactment(state, notice.text, 'warden', notice.id, { delivery: 'speech', audienceIds: notice.audienceIds }), learnedAt: notice.occurredAt });
      }
    }
  }
  if (curfew && !curfew.blocked && state.worldTime === curfew.at) {
    interrupted = true;
    events.push(enactment(state, '非放风时段即将开始，不能继续在公共地点休息或等待。须回所属牢房；只有实际获准者能留医务室。违规被看守发现会送惩罚室禁闭两天。', null,
      `${key}:curfew:${curfew.deadline}`, { audienceIds: [player] }));
  }
  return { events, interrupted };
}
export function curfewReturnIntent(state, intent) {
  if (!usesCurfewPolicy(state) || intent.type !== 'move') return false;
  const player = createdPlayerId(state); const current = runtimeRoom(state, player);
  const home = causalPlayerScene(state).confinement?.medicalStayAllowed ? 'infirmary'
    : Object.entries(ROOM_CODES).find(([, code]) => code === causalPlayerScene(state).confinement?.homeRoom)?.[0];
  const next = home === 'infirmary' ? current === 'corridor' ? 'reception' : current === 'reception' ? 'infirmary' : undefined
    : current === 'infirmary' ? 'reception' : current === 'reception' ? 'corridor' : current === 'corridor' ? home : undefined;
  return intent.destination === next && causalPlayerScene(state).permittedDestinations.includes(intent.destination)
    && !lawfulConfinementPlace(state, player, current);
}
// These helpers are shared with the resumable scene-beat executor. The legacy
// reducer below retains its original observation, acquisition and clock order.
export { enactment as causalEnactment, normalizeEvents as normalizeCausalEvents };
export function validateCausalSceneAction(action, { exactAddressedSpeech, hostDialogueSequence = false } = {}) {
  if (!exact(action, ['type', 'jobId', 'rawInput', 'intent', 'performance', 'document', 'questionKey', 'answerKey', 'roomLabelVersion',
    'worldVersion', 'ballots', 'decisionVersion', 'decisions', 'causalVersion', 'causalTimingVersion', 'itemPolicyVersion', 'caseActionTimingVersion', 'guardRules', 'performanceVersion']) || action.type !== 'scene' || action.causalVersion !== 1
    || action.decisionVersion !== 1 || !Array.isArray(action.decisions) || action.decisions.length > 3
    || !safe(action.rawInput, 2000) || ![action.jobId, action.questionKey, action.answerKey].every(id => safe(id, 128))
    || !exact(action.performance, ['action', 'utterance', ...(action.performanceVersion === 2 ? ['reflection'] : [])])
    || !safe(action.performance.action, 1200) && !(hostDialogueSequence && exactAddressedSpeech && action.performance.action === ''
      && !Object.hasOwn(action.performance, 'reflection'))
    || (Object.hasOwn(action.performance, 'reflection') && (typeof action.performance.reflection !== 'string'
      || action.performance.reflection !== '' && !safe(action.performance.reflection, 1200)))
    || (Object.hasOwn(action, 'performanceVersion') && action.performanceVersion !== 2)
    || (action.performance.utterance && !safe(action.performance.utterance, 1400))
    || !(typeof exactAddressedSpeech === 'string' && action.intent.type === 'conversation'
      && action.intent.playerText === exactAddressedSpeech && action.performance.utterance === exactAddressedSpeech
      && action.rawInput.includes(exactAddressedSpeech))
      && !preservesEnactedPlayerSpeech(action.rawInput, action.performance.utterance, action.intent)
    || (action.intent?.operation === 'testimony' && parseTestimonyCommand(action.rawInput) !== action.intent.subjectId)
    || (action.roomLabelVersion !== undefined && action.roomLabelVersion !== 2)
    || (action.worldVersion !== undefined && action.worldVersion !== 1)
    || (action.causalTimingVersion !== undefined && action.causalTimingVersion !== 1)
    || (Object.hasOwn(action, 'caseActionTimingVersion') && action.caseActionTimingVersion !== 2)
    || (Object.hasOwn(action, 'itemPolicyVersion') && ![1, 2].includes(action.itemPolicyVersion))) fail();
  if (action.performanceVersion === 2) assertObservablePlayerAction(action.performance.action);
  return action;
}
export function causalSceneDraft(state, action) {
  assertGuardOrdinaryAction(state); validateGuardScenePin(state, action);
  if (guardEnabled(state) || Object.hasOwn(action, 'performanceVersion')) fail(); // New private performance requires resumable scene beats.
  validateCausalSceneAction(action);
  const draft = structuredClone(state); runtimeApplyItemPolicy(draft, action.itemPolicyVersion);
  enableAutonomy(draft); enablePrisonWorld(draft); enableCaseRuntime(draft);
  const player = createdPlayerId(draft);
  if (!outskirtsActive(draft) && isCourtyardEntry(action.rawInput) && action.intent?.type === 'move'
    && action.intent.destination === 'courtyard' && runtimeRoom(draft, player) === 'reception') {
    activateOutskirts(draft);
  }
  const npcReactions = action.causalTimingVersion === 1;
  const reactionIds = npcReactions ? pendingReactionActors(draft) : [];
  const reactionDecisions = action.decisions.filter(row => reactionIds.includes(row.actorId));
  const scene = causalPlayerScene(draft); validateCausalIntent(scene, action.intent);
  const events = runtimeDiscoverObjects(draft, `${action.jobId}:objects:root`);
  const { intent } = action;
  const selectedReaction = procedureStatementReaction(state, parseTestimonyCommand(action.rawInput));
  const performance = statementReactionPerformance(action, selectedReaction);
  const stageBefore = activeProcedure(draft)?.stage;
  if (intent.operation !== 'vote') {
    events.push(enactment(draft, performance.action, player, `gesture:${action.jobId}`));
    if (performance.utterance) events.push(enactment(draft, performance.utterance, player, action.questionKey, {
      delivery: actorForState(draft, player).communication === 'writing' ? 'writing' : 'speech',
      audienceIds: acquisitionAudience(draft, player, { delivery: actorForState(draft, player).communication === 'writing' ? 'writing' : 'speech', targetId: intent.targetId }),
    }));
  }
  runtimeObserve(draft, events);
  // The delivered statement belongs to the phase at its actual utterance,
  // even if its speaking time reaches the cutoff before later NPC work.
  if (stageBefore === 'discussion' && performance.utterance) activeProcedure(draft).statements.push({
    id: `statement-${activeProcedure(draft).statements.length + 1}`, speakerId: player, text: performance.utterance,
    audienceIds: acquisitionAudience(draft, player, { delivery: actorForState(draft, player).communication === 'writing' ? 'writing' : 'speech', targetId: intent.targetId }),
  });
  const skipTarget = intent.type === 'wait' && intent.operation
    ? nextFreePeriodBoundary(draft, { morningOnly: intent.operation === 'until_morning' }) : null;
  let elapsed = skipTarget !== null ? Math.max(15, skipTarget - draft.worldTime)
    : { look: 5, move: 20, broadcast: 17, conversation: 15, wait: 15, follow: 15, act: 15, runtime: 15, read: 5, case: 0 }[intent.type];
  if (action.caseActionTimingVersion === 2 && skipTarget === null && intent.type !== 'case') elapsed = caseActionSeconds(intent.type);
  let destination;
  if (intent.type === 'move') {
    if (!scene.permittedDestinations.includes(intent.destination)) events.push(enactment(draft, '铁门或当前滞留规定挡住去路，脚步停在门前。', player, `${action.jobId}:blocked`));
    else if (intent.destination === 'court' && stageBefore === 'assembly') {
      elapsed = 120; destination = 'court';
    } else destination = intent.destination;
  }
  let broadcastDelivered = false;
  if (intent.type === 'broadcast' || (['wait', 'follow'].includes(intent.type) && !draft.agentDoorOpen && scene.screenAvailable && !intent.operation)) {
    if (scene.screenAvailable && !draft.agentWorld.broadcasts.length
      && (!draft.agentWorld.lockReleased || draft.agentFormatVersion >= 3)) {
      const notice = announcePrisonAssembly(draft, { actors: actorsForState(draft).filter(actor => runtimeActive(draft, actor.id)), playerId: player,
        locationOf: actor => ROOM_CODES[runtimeRoom(draft, actor.id)], text: CARD_ASSEMBLY_TEXT, key: `broadcast:${action.jobId}` });
      if (notice) { broadcastDelivered = true; if (!draft.known.includes('warden')) draft.known.push('warden');
        events.push(enactment(draft, notice.text, 'warden', notice.id, { delivery: 'speech', audienceIds: notice.audienceIds })); }
    }
  }
  if (intent.type === 'runtime') {
    const result = runtimeOperation(draft, player, intent.subjectId, { assessment: intent.summary, sourceObservationIds: [] },
      `${action.jobId}:player`, { npcMedicalContactVersion: action.npcMedicalContactVersion });
    events.push(...result.events);
  }
  const deferredInspection = intent.type === 'case' && intent.operation === 'inspect';
  // Validate the minimum full inspection at its start. Once the shared clock
  // reaches its completion boundary, acquisition is legal even exactly at the
  // deadline; a boundary interrupt before that completion grants no material.
  const inspectionCompletesAt = deferredInspection ? draft.worldTime + 120 : null;
  if (deferredInspection) elapsed = 120;
  else if (intent.type === 'case') {
    const result = settleProcedureIntent(draft, player, intent, `${action.jobId}:procedure`,
      intent.operation === 'vote' ? { ballots: action.ballots } : {});
    if (!result.accepted) fail();
    events.push(...result.events); elapsed = result.elapsed;
  }
  const timedAcquisition = action.causalTimingVersion === 1;
  const settleReading = () => {
    if (intent.type !== 'read') return;
    const item = readingMaterial(draft, intent.subjectId, createdPlayerId(draft)); const reads = draft.agentAutonomy.readByActor ||= {}; const ids = reads[player] ||= [];
    if (!ids.includes(item.id)) ids.push(item.id);
    events.push(enactment(draft, `阅读记录【${item.name}】：${item.text}`, player, `read:${action.jobId}:${player}`, { delivery: 'reading', audienceIds: [player] }));
  };
  // Frozen causal actions retain their original acquisition and speech clock;
  // only newly prepared timing contracts use the corrected completion rules.
  if (!timedAcquisition) settleReading();
  if (intent.operation === 'vote' && !/^(?:我(?:把票)?投(?:给|給|向)?|投票给|投票給)[^「」“”"？?]+[。！!]?$/u.test(action.rawInput.trim())) fail();
  // Only delivered communication spends speaking time. Procedural actions use
  // the same clock; a silent ballot cannot authorize model-invented speech.
  if (action.caseActionTimingVersion !== 2 && (intent.type !== 'case' || (timedAcquisition && intent.operation !== 'vote'))) elapsed += Math.ceil((performance.utterance || '').length / 6);
  if (broadcastDelivered && intent.type === 'broadcast' && draft.agentFormatVersion >= 3 && draft.agentWorld.startSecond + draft.worldTime < 6 * 3600) {
    elapsed = 6 * 3600 - draft.agentWorld.startSecond - draft.worldTime;
  }
  if (skipTarget !== null) elapsed = Math.max(elapsed, skipTarget - draft.worldTime);
  elapsed = guardActionSeconds(draft, elapsed);
  const protectionStart = draft.worldTime; const protectedAction = guardProtected(draft);
  const completesAt = draft.worldTime + elapsed;
  if (reactionDecisions.length) {
    // Resolve only these already-recorded, owner-local proposals before this
    // player's elapsed time. Their snapshot includes the player's enacted
    // gesture/speech above; none of their private results enters that snapshot.
    for (const signal of draft.caseRuntime.signals.filter(row => row.kind === 'threat')) {
      const ids = reactionDecisions.filter(row => signal.audienceIds.includes(row.actorId)).map(row => row.actorId);
      if (ids.length) signal.reactionActorIds = [...new Set([...(signal.reactionActorIds || []), ...ids])];
    }
    events.push(...applyNpcDecisions(draft, reactionDecisions, action.jobId, {
      causalTimingVersion: action.causalTimingVersion, caseActionTimingVersion: action.caseActionTimingVersion,
      onElapsed: (seconds, actorId) => advanceCausalTime(draft, draft.worldTime + seconds,
        `${action.jobId}:reaction-time:${actorId}`, { npcReactions }),
    }));
  }
  const advanced = advanceCausalTime(draft, Math.max(draft.worldTime, completesAt), action.jobId,
    { npcReactions, curfewReturn: curfewReturnIntent(draft, intent) });
  events.push(...advanced.events);
  // Reading is acquisition, not an instantaneous gesture. Grant neither the
  // marker nor the full text until reading and its delivered speech finish.
  // A full read may finish exactly at the investigation cutoff, like an
  // inspection, but an earlier boundary or an unavailable reader grants none.
  if (timedAcquisition && intent.type === 'read' && draft.worldTime >= completesAt && !draft.completed && runtimeActive(draft, player)
    && ((!advanced.interrupted && activeProcedure(draft)?.stage === stageBefore)
      || (draft.worldTime === completesAt && stageBefore === 'investigation'
        && activeProcedure(draft)?.stage === 'assembly' && activeProcedure(draft).investigationDeadline === completesAt))) settleReading();
  if (deferredInspection && draft.worldTime >= inspectionCompletesAt
    && (!advanced.interrupted || (draft.worldTime === inspectionCompletesAt && activeProcedure(draft)?.stage === 'assembly'))) {
    const result = inspectionAcquisition(draft, player, intent, `${action.jobId}:procedure`);
    if (result.accepted) events.push(...result.events.map(row => ({ ...row, audienceIds: [player] })));
  }
  if (destination && !advanced.interrupted) {
    if (destination === 'court') {
      runtimeSetRoom(draft, player, 'court');
      events.push(...startProcedureTrial(draft, `${action.jobId}:court`));
    }
    else if (causalPlayerScene(draft).permittedDestinations.includes(destination)) {
      runtimeSetRoom(draft, player, destination);
      events.push(enactment(draft, `你沿通路来到${roomLabel(destination)}。`, player, `${action.jobId}:arrival`));
    } else events.push(enactment(draft, '通行条件已经改变，脚步停在当前通路前。', player, `${action.jobId}:arrival-blocked`));
  }
  const introduction = settleReceptionIntroductions(draft, action.jobId); events.push(...introduction.events);
  const arrivalGuard = settleGuardBoundary(draft, `${action.jobId}:arrival`); events.push(...arrivalGuard.events);
  if (protectedAction) finishGuardAction(draft, action.jobId, draft.worldTime - protectionStart, intent.type);
  const actionDiscoveries = discoverRuntimeIncidents(draft, `${action.jobId}:discovery`);
  events.push(...actionDiscoveries, ...runtimeDiscoverObjects(draft, `${action.jobId}:objects:boundary`));
  const interrupted = advanced.interrupted || introduction.occurred || arrivalGuard.interrupted || protectedAction || actionDiscoveries.some(row => row.audienceIds?.includes(player))
    || activeProcedure(draft)?.stage !== stageBefore;
  // Make the committed player boundary available under exactly the same
  // observation keys used by the preview and subsequent model packets.
  let normalized = normalizeEvents(draft, events, `${action.jobId}:enactment`);
  runtimeObserve(draft, normalized);
  const interim = persistEnactments(draft, normalized);
  draft.entries = [...state.entries, ...interim].map((entry, index) => ({ ...entry, id: `entry-${index + 1}` }));
  const npcEvents = interrupted ? [] : applyNpcDecisions(draft,
    action.decisions.filter(row => !reactionIds.includes(row.actorId)), action.jobId, {
    causalTimingVersion: action.causalTimingVersion, caseActionTimingVersion: action.caseActionTimingVersion,
    followTargetId: intent.type === 'follow' ? intent.targetId : undefined,
    onElapsed: (seconds, actorId) => advanceCausalTime(draft, draft.worldTime + seconds, `${action.jobId}:npc-time:${actorId}`, { npcReactions }),
  });
  const discovery = discoverRuntimeIncidents(draft, `${action.jobId}:npc-discovery`);
  normalized = normalizeEvents(draft, [...npcEvents, ...discovery,
    ...runtimeDiscoverObjects(draft, `${action.jobId}:objects:npc`)], `${action.jobId}:npc`);
  runtimeObserve(draft, normalized);
  const visible = [...interim, ...persistEnactments(draft, normalized)];
  draft.entries = [...state.entries, ...visible].map((entry, index) => ({ ...entry, id: `entry-${index + 1}` }));
  draft.agentActions.push(structuredClone(action)); draft.revision += 1;
  finalizeGuardEntries(draft, state.entries.length);
  if (!Number.isSafeInteger(draft.worldTime)) fail();
  const canonical = visible.map((entry, index) => ({ id: `event-${index + 1}`, entry }));
  return { draft, events: canonical, interrupted,
    publicEvents: canonical.map(({ id, entry }) => ({ id, speaker: entry.speaker, delivery: entry.delivery, text: entry.text })) };
}
export function causalPlayView(state) {
  const procedure = { ...scheduledCaseArchive(state), ...(procedurePlayView(state) || {}) };
  const arc = state.creation?.storyArcId ? { storyArcId: state.creation.storyArcId } : {};
  if (state.completed) return { mode: 'daily', ...arc, clock: prisonClock(state), nearbyCharacters: [], suggestions: [],
    evidence: [], ...procedure, rules: [...prisonRulebook(state), ...(procedure.rules || [])] };
  const scene = causalPlayerScene(state);
  if (guardEnabled(state) && (state.guardReaction.pending || guardDetained(state))) return {
    mode: 'daily', ...arc, clock: prisonClock(state), nearbyCharacters: [], suggestions: [], evidence: [], ...procedure,
    guard: guardView(state), rules: [...prisonRulebook(state), ...prisonPublicRules(state), ...(procedure.rules || [])],
  };
  const phase = activeProcedure(state)?.stage;
  return { mode: 'daily', ...(guardEnabled(state) ? { guard: guardView(state) } : {}), ...arc, clock: prisonClock(state),
    ...(scene.ownPose ? { ownPose: scene.ownPose } : {}),
    nearbyCharacters: scene.nearby.map(({ id, label }) => ({ id, name: label })),
    suggestions: ['观察四周', '等待片刻', ...scene.permittedDestinations.map(id => `前往${roomLabel(id)}`)],
    evidence: [], ...procedure,
    rules: [...prisonRulebook(state), ...prisonPublicRules(state), ...(procedure.rules || [])],
    ...(!terminal(activeProcedure(state)) && phase !== 'assembly' ? {
      suggestions: [...new Set([...(procedure.suggestions || ['观察四周', '等待片刻']),
        ...(scene.screenAvailable && (!state.agentWorld?.lockReleased
          || (state.agentFormatVersion >= 3 && !state.agentWorld?.broadcasts.length)) ? ['查看屏幕'] : []),
        ...scene.permittedDestinations.map(id => `前往${roomLabel(id)}`),
        ...scene.caseRuntime.options.filter(row => !['adopt', 'report'].includes(row.kind)).map(row => `执行${row.label}`)])],
    } : {}) };
}
