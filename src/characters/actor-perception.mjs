import { AGENT_PROFILES } from '../content/agent-scenario.mjs';
import { dialogueContextPin } from '../cognition/dialogue-context-policy.mjs';
import { isKnowledgeGated, ownerReadableProfiles } from './actor-knowledge.mjs';
import { usesCurfewPolicy, confinementRoom } from '../world/curfew-policy.mjs';
import { guardDetained, GUARD_DETENTION_ROOM } from '../world/guard-reaction.mjs';
import { actorsForState, createdPlayerId, CREATED_ROOMS, ROOM_CODES, roomKey } from '../creation/player-setup.mjs';
import { prisonRulebook, worldSurfaceFacts } from '../content/card-world.mjs';
import { prisonClock, prisonPassage } from '../world/prison-activity.mjs';
import { hasCaseOne, caseActorScene } from '../cases/case-one.mjs';
import { hasCaseRuntime, runtimeRoom, runtimeActive, runtimeOptions, runtimeActorHandle, runtimeRecognizedActors, runtimeObjectView, runtimeContinuousScene, runtimePhysicalActor, runtimeBodyActorId, runtimeBodyIsIdentity } from '../case-runtime.mjs';
import { activeProcedure, procedureActorScene } from '../cases/case-procedure.mjs';
import { bunkSceneDescription } from '../world/prison-bunks.mjs';
import { physicalFactSnapshotV2WithElevation } from '../world/physical-fact-elevation.mjs';
import { runtimePhysicalFacts } from '../case-runtime.mjs';
import { OUTSKIRTS_DESCRIPTIONS, OUTSKIRTS_ROOMS, GUESTHOUSE_FIRE_ROOM, COURTYARD_ROOM, outskirtsActive } from '../world/outskirts-world.mjs';

const roomLabel = (state, room) => room === 'court' ? '审判庭' : room === 'infirmary' ? '医务室'
  : OUTSKIRTS_ROOMS[room] || CREATED_ROOMS[room] || state.location;
const outskirtsEdge = (state, from, to) => Boolean(state.agentDoorOpen) && outskirtsActive(state) && (
  from === 'reception' && to === COURTYARD_ROOM
  || from === COURTYARD_ROOM && (to === 'reception' || to === GUESTHOUSE_FIRE_ROOM)
  || from === GUESTHOUSE_FIRE_ROOM && to === COURTYARD_ROOM);

export const ACTOR_VIEW_VERSION = 1;
const fail = () => { throw Object.assign(new Error('角色视野或知识取得对象无效。'), { code: 'ERR_ACTOR_VIEW' }); };
export function actorRoom(state, actorId) {
  if (hasCaseRuntime(state)) return runtimeRoom(state, actorId);
  if (actorId === createdPlayerId(state)) {
    if (hasCaseOne(state)) return state.agentPositions[actorId];
    return Object.keys(CREATED_ROOMS).find(key => CREATED_ROOMS[key] === state.location)
      || (state.location === '新增牢房' ? 'playercell' : state.location === '牢房' ? 'cell' : undefined);
  }
  const actor = actorsForState(state).find(row => row.id === actorId);
  if (!actor) fail();
  const position = state.agentPositions?.[actorId] || actor.locationId;
  return hasCaseOne(state) ? position : roomKey(position);
}
// Lazy facades keep the owner-local identity contract safe across the host
// rule/perception import cycle; no imported binding is read at module startup.
export function actorHandle(ownerId, targetId) { return runtimeActorHandle(ownerId, targetId); }
export function recognizedActors(state, actorId) { return runtimeRecognizedActors(state, actorId); }
export function actorPerception(state, actorId, options = {}) {
  // Explicit module-call opt-in only: no HTTP/save flag or historical task
  // migration. Raw HOST closure is never spread into a perception packet.
  const continuous = options.sceneParticipantsVersion === 1 ? runtimeContinuousScene(state, actorId) : null;
  if (continuous && continuous.status !== 'resolved') throw Object.assign(new Error('当前连续场景的物理成员依据尚未闭合。'),
    { code: 'ERR_ACTOR_SCENE_UNRESOLVED', reason: continuous.reason });
  const actors = actorsForState(state); const actor = actors.find(row => row.id === actorId);
  if (!actor) fail();
  const room = actorRoom(state, actorId); if (!room || room === 'unavailable') fail();
  if (room === GUARD_DETENTION_ROOM && actorId === createdPlayerId(state) && guardDetained(state)) return {
    location: '惩罚室', roomId: GUARD_DETENTION_ROOM, description: '封闭的惩罚室，门由看守锁着；看不见外面的巡逻与其他人的活动。',
    nearby: [], adjacent: [], permittedDestinations: [], readable: [], doorOpen: false,
    ...(state.agentWorld ? { clock: prisonClock(state) } : {}), caseRuntime: { version: 1, options: [] },
    case: { kind: 'causal', stage: 'daily', inspectables: [], knownEvidence: [], reportableIncidentIds: [], candidateIds: [], statements: [] },
  };
  const known = recognizedActors(state, actorId);
  const physical = runtimePhysicalActor(state, actorId);
  const participants = actors.filter(other => other.id !== actorId && other.id !== 'warden'
    && (!hasCaseOne(state) || !['hiro', 'noah', ...state.caseOne.executedIds].includes(other.id))
    && (!hasCaseRuntime(state) || runtimeActive(state, other.id))
    && (continuous ? continuous.participantActorIds.includes(other.id) : actorRoom(state, other.id) === room)).map(other => ({
    handle: actorHandle(actorId, state.caseRuntime?.occupiedBody ? runtimeBodyActorId(state, other.id) : other.id),
    label: state.caseRuntime?.occupiedBody ? (known.has(runtimeBodyActorId(state, other.id)) ? runtimePhysicalActor(state, other.id).name : runtimePhysicalActor(state, other.id).appearance) : known.has(other.id) ? other.name : other.appearance,
    appearance: runtimePhysicalActor(state, other.id).appearance,
  }));
  let scene;
  if (hasCaseOne(state)) scene = caseActorScene(state, actorId);
  else {
    const codes = state.creation ? Object.keys(ROOM_CODES) : Object.keys(ROOM_CODES).filter(key => key !== 'playercell');
    const outskirts = outskirtsActive(state);
    const exits = usesCurfewPolicy(state) && room === 'infirmary' ? ['reception']
      : room === COURTYARD_ROOM ? ['reception', GUESTHOUSE_FIRE_ROOM]
        : room === GUESTHOUSE_FIRE_ROOM ? [COURTYARD_ROOM]
          : room === 'corridor' ? codes.filter(key => key !== 'corridor')
            : room === 'reception' ? ['corridor', ...(usesCurfewPolicy(state) ? ['infirmary'] : []),
              ...(outskirts ? [COURTYARD_ROOM] : [])] : ['corridor'];
    const roomCodes = usesCurfewPolicy(state) ? { ...ROOM_CODES, infirmary: 'INFIRMARY' } : ROOM_CODES;
    const home = usesCurfewPolicy(state) ? confinementRoom(state, actorId) : actor.locationId;
    const permittedDestinations = exits.filter(to => outskirtsEdge(state, room, to) || (state.agentWorld
      ? prisonPassage(state, { actorId, from: roomCodes[room], to: roomCodes[to], home }) : state.agentDoorOpen));
    scene = { location: roomLabel(state, room), roomId: room,
      description: room === 'infirmary' ? '有病床和笔记用品的医务室；留宿须有实际许可。'
        : room === 'reception' ? '有桌椅与壁炉的会客厅。'
          : room === 'corridor' ? '石砌走廊连接牢房与会客厅。'
            : OUTSKIRTS_DESCRIPTIONS[room] || '石墙旁有双层床、铁栅栏门和墙上的显示屏。',
    adjacent: exits.map(id => ({ id, label: roomLabel(state, id) })), permittedDestinations,
    doorOpen: Boolean(state.agentDoorOpen), ruleFacts: worldSurfaceFacts(room, state), ...(state.agentWorld ? { clock: prisonClock(state) } : {}) };
  }
  if (hasCaseRuntime(state)) {
    const p = activeProcedure(state); const phase = p?.stage;
    const locked = ['discussion', 'ballot', 'execution_ready', 'ending', ...(state.itemPolicyVersion === 2 ? ['outcome_pending'] : [])].includes(phase);
    const exits = locked ? [] : phase === 'assembly' ? (actorId === createdPlayerId(state) ? ['court'] : [])
      : room === 'court' ? ['reception'] : scene.adjacent.map(row => row.id);
    const specialPassage = phase === 'investigation' || phase === 'assembly' || room === 'court';
    scene.adjacent = exits.map(id => ({ id, label: roomLabel(state, id) }));
    scene.permittedDestinations = specialPassage ? exits : scene.permittedDestinations.filter(id => exits.includes(id));
    scene.location = roomLabel(state, room);
    if (specialPassage || locked) scene.doorOpen = !locked;
    if (room === 'court') scene.description = '围成一圈的审判席面向中央；桌上只保留已经封卷的资料。';
    Object.assign(scene, procedureActorScene(state, actorId));
    scene.caseRuntime = { version: 1, options: runtimeOptions(state, actorId, { perceived: true }).slice(0, 32).map(({ id, label, kind }) => ({ id, label, kind })) };
    if ([1, 2].includes(state.itemPolicyVersion)) scene.objects = runtimeObjectView(state, actorId);
  }
  if (!runtimeBodyIsIdentity(state)) {
    // No invented answer about which institution owns a swapped person's bunk,
    // curfew permission or medical authorization. Only public corridor/reception
    // edges are available in this bounded consumer version. An audited identity
    // return is not a swapped view, so the ordinary procedure edges stay intact.
    scene.permittedDestinations = runtimeActive(state, actorId)
      ? scene.permittedDestinations.filter(id => ['corridor', 'reception'].includes(id)) : [];
    scene.ownAppearance = physical.appearance;
  }
  if (!hasCaseOne(state) && runtimeBodyIsIdentity(state)) scene.description = bunkSceneDescription(state, room, actor, scene.description);
  const visible = { ...scene, nearby: participants.map(({ handle, ...row }) => ({ id: handle, ...row })),
    readable: readableMaterials(state, actorId).map(({ id, name }) => ({ id, name })) };
  return options.physicalFactsVersion === 2
    ? currentPhysicalScene(state, actorId, visible, options.boundary) : visible;
}

/** Current owner-authorized sources only. runtimePhysicalFacts already filters
 * real delivery, current custody and local visibility. Its v1 optical sentence
 * is NOT authority: authored bars and actual passage are independent here.
 * No prose/evidence/history supplies posture, closure or surface occupancy. */
export function currentPhysicalScene(state, ownerId, scene, boundary) {
  if (!boundary || boundary.ownerId !== ownerId || boundary.roomId !== actorRoom(state, ownerId)
    || boundary.worldTime !== state.worldTime) fail();
  const source = runtimePhysicalFacts(state, ownerId);
  const bars = /铁栅栏|铁栏|栅栏门/u.test(scene.description || '');
  const proceduralRestriction = ['discussion', 'ballot', 'execution_ready', 'outcome_pending', 'ending'].includes(scene.case?.stage);
  const physicalFacts = physicalFactSnapshotV2WithElevation({ scope: boundary,
    door: { passage: !proceduralRestriction && typeof scene.doorOpen === 'boolean' ? scene.doorOpen ? 'passable' : 'blocked' : 'unknown',
      barrier: bars ? 'bars' : 'unknown', view: bars ? 'visible' : 'unknown' },
    ...(source?.pose ? { pose: source.pose } : {}),
    objects: source?.objects || [], carriers: source?.carriers || [] }, boundary);
  return { ...scene, physicalFacts };
}
/** Authored carriers of the implemented rulebook/known-person phone pages.
 * Opt-in task projection only; old scene/reading records keep their bytes. */
export function materialReadableProjection(state, ownerId = createdPlayerId(state)) {
  return readableMaterials(state, ownerId).map(({ id, name, carrier }) => ({ id, name,
    ...(carrier ? { carrier } : /^(?:rule:|profile:)/u.test(id) ? { carrier: 'phone' } : {}) }));
}

/** Preserve the historical scene's adjudication fields while hiding the host
 * identity of anyone this viewpoint has not actually recognized. The reverse
 * map is a host-only projection aid, never narrative/model packet content. */
export function playerPerceivedScene(state, scene) {
  const owner = createdPlayerId(state); const known = recognizedActors(state, owner);
  const targetIds = {};
  const identities = new Set(actorsForState(state).map(row => row.id));
  const projectId = id => {
    if (state.caseRuntime?.occupiedBody) {
      // HOST-only reverse mapping: body handles name visible physical people,
      // whereas causal intent and cognition retain the current stable mind.
      const target = actorTarget(state, owner, id);
      if (target) { targetIds[id] = target; return id; }
      if (identities.has(id) && id !== owner) {
        const handle = actorHandle(owner, runtimeBodyActorId(state, id));
        if (actorTarget(state, owner, handle) === id) { targetIds[handle] = id; return handle; }
      }
    }
    if (!identities.has(id) || known.has(id)) return id;
    const handle = actorHandle(owner, id); targetIds[handle] = id;
    return handle;
  };
  const perceived = structuredClone(scene);
  perceived.nearby = perceived.nearby.map(row => ({ ...row, id: projectId(row.id) }));
  if (Array.isArray(perceived.case?.statements)) perceived.case.statements = perceived.case.statements
    .filter(row => !row.audienceIds || row.audienceIds.includes(owner))
    .map(({ audienceIds, ...row }) => ({ ...row, speakerId: projectId(row.speakerId) }));
  return { scene: perceived, targetIds };
}
export function projectPerceivedIntent(intent, targetIds = {}) {
  if (intent.type === 'magic' && intent.magic?.kind === 'relocate') {
    const companionId = Object.entries(targetIds).find(([, id]) => id === intent.magic.companionId)?.[0];
    return companionId ? { ...intent, magic: { ...intent.magic, companionId } } : intent;
  }
  if (!intent.targetId) return intent;
  const target = Object.entries(targetIds).find(([, id]) => id === intent.targetId)?.[0];
  return target ? { ...intent, targetId: target } : intent;
}
export function resolvePerceivedIntent(intent, targetIds = {}) {
  if (intent?.type === 'magic' && intent.magic?.kind === 'relocate' && Object.hasOwn(targetIds, intent.magic.companionId))
    return { ...intent, magic: { ...intent.magic, companionId: targetIds[intent.magic.companionId] } };
  if (!intent?.targetId || !Object.hasOwn(targetIds, intent.targetId)) return intent;
  return { ...intent, targetId: targetIds[intent.targetId] };
}
export function actorTarget(state, ownerId, handle) {
  const ownRoom = actorRoom(state, ownerId);
  return actorsForState(state).find(actor => actor.id !== ownerId && actor.id !== 'warden'
    && (!hasCaseOne(state) || !['hiro', 'noah', ...state.caseOne.executedIds].includes(actor.id))
    && (!hasCaseRuntime(state) || runtimeActive(state, actor.id))
    && actorRoom(state, actor.id) === ownRoom && actorHandle(ownerId, state.caseRuntime?.occupiedBody ? runtimeBodyActorId(state, actor.id) : actor.id) === handle)?.id;
}
export function readableMaterials(state, ownerId = createdPlayerId(state)) {
  const rules = prisonRulebook(state).map(rule => ({ id: `rule:${rule.id}`, name: rule.name, text: rule.text }));
  if (isKnowledgeGated(state)) {
    const phase = hasCaseOne(state) ? state.caseOne.stage : activeProcedure(state)?.stage;
    if (['assembly', 'discussion', 'ballot', 'execution_ready', 'ending'].includes(phase)) return [];
    return [...rules, ...ownerReadableProfiles(state, ownerId)];
  }
  return [...rules,
    ...AGENT_PROFILES.filter(profile => profile.id !== 'warden').map(profile => ({ id: `profile:${profile.id}`, name: `${profile.name}的图鉴资料`,
      text: [profile.name, profile.prisonerNumber ? `囚犯编号：${profile.prisonerNumber}` : '', profile.introduction].filter(Boolean).join('。') }))];
}
export function parseReadingIntent(state, raw, ownerId = createdPlayerId(state)) {
  const match = /^(?:阅读|閱讀|查阅|查閱)\s*(.+?)[。！!]?$/u.exec(raw.trim());
  if (!match) return null;
  const item = readableMaterials(state, ownerId).find(row => row.id === match[1] || row.name === match[1]
    || row.name.replace(/的图鉴资料$/u, '') === match[1]);
  return item ? { type: 'read', subjectId: item.id, summary: `阅读手机中已有的${item.name}` } : null;
}
export function readingMaterial(state, subjectId, ownerId = createdPlayerId(state)) {
  const item = readableMaterials(state, ownerId).find(row => row.id === subjectId);
  if (!item) fail();
  return item;
}

/** Exact enacted input only. Private intentions and unrelated player evidence
 * never select which of another person's memories is made salient. */
export function observableRecallQuery(observations, scene, options = {}) {
  if (dialogueContextPin(options).dialogueContextVersion === 1) {
    const received = new Set(options.receivedObservationIds || []);
    const eligible = observations.map((row, index) => ({ row, index }))
      .filter(({ row }) => ['hearing', 'reading', 'sight'].includes(row.channel) && typeof row.text === 'string');
    const communication = eligible.filter(({ row }) => ['hearing', 'reading'].includes(row.channel) && row.sourceRelation !== 'self')
      .sort((a, b) => Number(received.has(b.row.id)) - Number(received.has(a.row.id))
        || (b.row.occurredAt ?? -1) - (a.row.occurredAt ?? -1) || b.index - a.index);
    const chosen = communication[0];
    const context = eligible.filter(entry => entry !== chosen)
      .sort((a, b) => (b.row.occurredAt ?? -1) - (a.row.occurredAt ?? -1) || b.index - a.index)[0];
    // Protect the current received communication before spending the remainder
    // on earlier activity/location. Never inspect private player raw input.
    const parts = [chosen?.row.text.slice(0, 192), context?.row.text.slice(0, 40), scene.location?.slice(0, 22)];
    return parts.filter(Boolean).join(' ').slice(0, 256);
  }
  const latest = observations.filter(row => ['hearing', 'reading', 'sight'].includes(row.channel)).slice(-2).map(row => row.text);
  return [...latest, scene.location].filter(Boolean).join(' ').slice(0, 256);
}

export function acquisitionAudience(state, speakerId, { delivery, targetId, publicDisplay = false } = {}) {
  const room = actorRoom(state, speakerId);
  const local = actorsForState(state).filter(actor => actor.id !== 'warden'
    && (!hasCaseOne(state) || !['hiro', 'noah', ...state.caseOne.executedIds].includes(actor.id))
    && (!hasCaseRuntime(state) || runtimeActive(state, actor.id))
    && actorRoom(state, actor.id) === room).map(actor => actor.id);
  if (delivery === 'reading') return [speakerId];
  if (delivery === 'writing' && !publicDisplay) return [...new Set([speakerId, ...(targetId && local.includes(targetId) ? [targetId] : [])])];
  return local;
}
