import { AGENT_ACTORS, agentActor } from '../content/agent-scenario.mjs';
import { isDeepStrictEqual } from 'node:util';
import { isRelationshipRuntime, hasSoftRuntime, INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, verifySoftRelationshipRootRows, verifyIntentRelationshipRootRows, verifyCaseBoundaryRelationshipRootRows } from '../content/relationship-context-policy.mjs';
import { buildRelationshipSetup, verifyRelationshipRootRows, initialRelationshipKnownIds } from './relationship-setup.mjs';
import { usesCurfewPolicy } from '../world/curfew-policy.mjs';
import { runtimeRevisionForState } from '../content/content-revisions.mjs';
import { normalizeCreation } from '../../public/player-creation-rules.mjs';
import { OPENING_CHOICES, ownerWorldFacts } from '../content/card-world.mjs';
import { cellSetupLayout } from '../../public/cell-setup-rules.mjs';
import { hasCaseOne, caseStartingKnowledge } from '../cases/case-one.mjs';
import { bunkStartingKnowledge, bunkActorKnowledge } from '../world/prison-bunks.mjs';

export const CREATED_SETUP_REF = 'player-prison-setup@1';
export const CREATED_NOTICE = '入监档案已登记。故事从你选定的清晨开始。';
export const CREATED_ROOMS = Object.freeze({ cell: '牢房', cell01: '一号牢房', cell02: '二号牢房', cell04: '四号牢房', cell05: '五号牢房', cell06: '六号牢房', cell07: '七号牢房', playercell: '八号牢房', corridor: '走廊', reception: '会客厅' });
export const ROOM_CODES = Object.freeze({ cell: 'CELL', cell01: 'CELL_01', cell02: 'CELL_02', cell04: 'CELL_04', cell05: 'CELL_05', cell06: 'CELL_06', cell07: 'CELL_07', playercell: 'PLAYER_CELL', corridor: 'CORRIDOR', reception: 'RECEPTION' });
export const roomKey = code => Object.keys(ROOM_CODES).find(key => ROOM_CODES[key] === code);
export const createdPlayerId = state => state.creation?.actorId || 'emma';
export const isCreatedCustom = state => state.exampleId === 'agent' && state.creation?.playerMode === 'custom';

// Actor-owned recollection, not shared plot truth or a read of another save.
// Source: docs/魔法少女的魔女审判.json, enabled Hiro entry id 55,
// /data/character_book/entries/51/content (人物指导), and
// /data/alternate_greetings/2. Her memory stops at her first-assembly death;
// subsequent cases, verdicts and endings are neither known nor precommitted.
const LOOP_TWO_HIRO = [
  '我保留了另一轮监狱经历的记忆，但仅限于从牢房醒来、第一次集合，到我在与看守冲突中死亡为止的亲身经历。这一轮重新开始，旧经历不是此刻已经发生的事实。',
  '我记得上一轮有屏幕通知和集合，并记得与看守冲突十分危险。这些只是过往经历，不能据此断言本轮的通知、集合、伤亡或后续事件必然发生。',
  '我不知道自己死亡之后发生的案件、审判、其他人的结局或尚未获知的秘密；不能把这些当成记忆，也不能把其他存档的内容当作经历。',
  '这份跨轮回忆只属于我。艾玛和其他少女各自积累眼前的见闻；此刻发生的变化仍以实际经历为准。',
];
export function setupActors(creation, sources = AGENT_ACTORS) {
  const originalPlayer = creation?.playerMode === 'original' ? sources.find(actor => actor.id === creation.actorId) : null;
  const relocated = originalPlayer && creation.opening && creation.opening.locationId !== originalPlayer.locationId;
  const cellLayout = creation?.cellSetup
    ? cellSetupLayout(creation.cellSetup, { playerMode: creation.playerMode, actorId: creation.actorId }) : null;
  const actors = sources.map(source => {
    const actor = structuredClone(source);
    if (actor.id === 'emma') actor.persona.boundaries = actor.persona.boundaries.filter(text => !text.includes('玩家控制'));
    if (actor.id === creation?.actorId) {
      actor.persona.boundaries.push('我的主动行动与对白完全由玩家控制，不能另行作为 NPC 自动决策。');
      if (creation.opening) actor.locationId = creation.opening.locationId;
    }
    if (cellLayout?.[actor.id]) actor.locationId = cellLayout[actor.id].cell;
    if (relocated && (actor.id === originalPlayer.id || actor.locationId === originalPlayer.locationId)) {
      // A setup relocation changes only current perception, never a biography or
      // anyone else's knowledge of where the absent player was placed. Emma's
      // room perception precedes her final general unknown-people boundary;
      // Sherry's same row also contains a personal dislike which must survive.
      const index = actor.initialKnowledge.length - (actor.id === 'emma' ? 2 : 1);
      const local = sources.filter(other => other.id !== actor.id && other.id !== originalPlayer.id && other.locationId === actor.locationId);
      const place = CREATED_ROOMS[roomKey(actor.locationId)];
      actor.initialKnowledge[index] = `${actor.id === 'sherry' ? '我不喜欢扮家人游戏。' : ''}我在${place}醒来。眼前所见：${local.map(other => other.appearance).join('；') || '没有其他人'}。${['CORRIDOR', 'RECEPTION'].includes(actor.locationId)
        ? '这是可通行的公共地点。' : '墙上的屏幕尚未亮起，牢门尚未打开。'}其他人的当前位置与经历不能靠旧记忆补全。`;
    }
    if (creation?.loop === 2 && actor.id === 'hiro') {
      // Keep this run's room/bunk perception (or the relocated perception
      // above); replace only the first-loop ignorance contradicted by memory.
      actor.initialKnowledge = actor.initialKnowledge.map(text => text.replace(
        '我还没有得到关于这里的说明，也不认识其他被关进来的少女。',
        '这是本轮亲眼所见；上一轮经历不代表本轮已经发生相同的事。',
      ));
      actor.initialKnowledge.push(...LOOP_TWO_HIRO);
    }
    return actor;
  });
  if (cellLayout && creation.playerMode === 'custom') {
    // A replaced canonical occupant physically moves to cell 08. Only current
    // room perception changes; identity, biography and abilities stay with them.
    const customAppearance = creation.character.appearance || '身穿黑白囚服的新来少女';
    const replacedId = creation.cellSetup.replaceActorId;
    const targetCell = replacedId ? cellLayout.player.cell : null;
    // Index against untouched source rows, never the live actor rows: loop 2
    // appends Hiro's private cross-run memory before this block runs.
    const sourcePerceptionIndex = id => {
      const source = sources.find(actor => actor.id === id);
      return source ? source.initialKnowledge.length - (id === 'emma' ? 2 : 1) : -1;
    };
    if (replacedId) {
      const moved = actors.find(actor => actor.id === replacedId);
      if (moved) {
        const index = sourcePerceptionIndex(moved.id);
        if (index >= 0) moved.initialKnowledge[index] = `${moved.id === 'sherry' ? '我不喜欢扮家人游戏。' : ''}我在八号牢房醒来。眼前所见：没有其他人。墙上的屏幕尚未亮起，牢门尚未打开。其他人的当前位置与经历不能靠旧记忆补全。`;
      }
      const roommate = actors.find(actor => actor.id !== replacedId && actor.locationId === targetCell);
      if (roommate) {
        const index = sourcePerceptionIndex(roommate.id);
        if (index >= 0) {
          const place = CREATED_ROOMS[roomKey(targetCell)];
          roommate.initialKnowledge[index] = `${roommate.id === 'sherry' ? '我不喜欢扮家人游戏。' : ''}我在${place}醒来。眼前所见：${customAppearance}。墙上的屏幕尚未亮起，牢门尚未打开。其他人的当前位置与经历不能靠旧记忆补全。`;
        }
      }
    }
  }
  if (creation?.playerMode === 'custom') {
    const character = creation.character;
    actors.push({ id: 'player', name: character.name, appearance: character.appearance || '身穿黑白囚服的新来少女', locationId: creation.opening.locationId,
      communication: 'speech', persona: { name: character.name, voice: character.personality || character.concept,
        values: character.desire ? [character.desire] : [], boundaries: ['玩家控制角色，不替玩家决定、承诺或发言。', '魔法构想为设定草稿，当前没有可执行的魔法权限。'] },
      initialKnowledge: [character.concept, character.background, character.desire].filter(Boolean).map(text => `我关于自己的回忆与想法：${text}`) });
  }
  return actors;
}
export const physicalActorsForState = state => {
  const sources = runtimeRevisionForState(state).actors;
  const actors = state.creation ? setupActors(state.creation, sources) : sources;
  if (state.customAbilitySetup || state.authoredMagicVersion === 1) {
    const custom = actors.find(actor => actor.id === 'player');
    if (custom) custom.persona = { ...custom.persona, boundaries: custom.persona.boundaries.map(text => text === '魔法构想为设定草稿，当前没有可执行的魔法权限。'
      ? (state.customAbilitySetup ? '能力仅由本局已确认绑定及当前合法句柄决定；本人选择不等于效果已经结算，不凭设定文本取得他人知识。'
        : '本局魔法设定由本人以普通行动发起尝试；实际效果以宿主结算为准。') : text) };
  }
  const supplement = source => ({ ...source, initialKnowledge: [...bunkActorKnowledge(state, source), ...bunkStartingKnowledge(state, source)] });
  if (hasCaseOne(state) && !state.creation?.storyArcId) return actors.map(source => supplement({ ...source, initialKnowledge: caseStartingKnowledge(state, source) }));
  if (!usesCurfewPolicy(state) && state.creation?.storyArcId === 'case-one-day3@1' && state.storyArc?.displacedAt !== undefined
    && !['aftermath', 'ending'].includes(state.storyArc.status)) {
    const anan = actors.find(actor => actor.id === 'anan'); if (anan) anan.locationId = 'RECEPTION';
  }
  if (!state.agentWorld) return actors.map(supplement);
  return actors.map(source => supplement({ ...source, initialKnowledge: [...source.initialKnowledge, ...ownerWorldFacts(source.id, state)] }));
};
export const usesRelationshipSetup = state => isRelationshipRuntime(state) && state.creation?.version === 2;
// Opt in only around one synchronous Host transaction. The full projection
// inputs are recomputed at every use, including physical and per-owner sources.
// No lookup by root/actor/revision alone, no memo across checkpoints or jobs.
let relationshipProjectionScope;
export function withExactRelationshipProjection(work) {
  const previous = relationshipProjectionScope;
  relationshipProjectionScope = {};
  try { return work(); }
  finally { relationshipProjectionScope = previous; }
}
export function relationshipSetupForState(state) {
  if (!usesRelationshipSetup(state)) throw Object.assign(new Error('关系初始化修订不一致。'), { code: 'INVALID_RELATIONSHIP_SOURCE' });
  const { creation, settingSupplement } = state;
  const runtime = runtimeRevisionForState(state), actors = physicalActorsForState(state);
  const scope = relationshipProjectionScope;
  if (!scope) return buildRelationshipSetup({ creation, runtime, actors, settingSupplement });
  // Registry identity is immutable; compare the three actual value inputs,
  // including property order (the result also flows to sealed JSON codecs).
  const values = [creation, actors, settingSupplement];
  const bytes = JSON.stringify(values);
  const last = scope.last;
  if (last?.runtime === runtime && last.bytes === bytes && isDeepStrictEqual(values, last.values)) return last.setup;
  const setup = buildRelationshipSetup({ creation, runtime, actors, settingSupplement });
  scope.last = { runtime, bytes, values: structuredClone(values), setup };
  return setup;
}
// Existing actor/perception/procedure/magic consumers receive the effective
// private view. Never re-project an already effective actor array.
export const actorsForState = state => usesRelationshipSetup(state)
  ? structuredClone(relationshipSetupForState(state).actors) : physicalActorsForState(state);
export function relationshipInitialKnownIds(state, ownerId, initialIds) {
  return usesRelationshipSetup(state) ? initialRelationshipKnownIds(relationshipSetupForState(state), ownerId, initialIds) : initialIds;
}
export function relationshipRootForRows(rows) {
  const revisionId = rows?.setup && JSON.parse(rows.setup.manifest).executionRevision?.revisionId;
  const verified = hasSoftRuntime(revisionId) ? verifySoftRelationshipRootRows(rows)
    : revisionId === CASE_BOUNDARY_RUNTIME_REVISION ? verifyCaseBoundaryRelationshipRootRows(rows)
    : revisionId === INTENT_RUNTIME_REVISION ? verifyIntentRelationshipRootRows(rows) : verifyRelationshipRootRows(rows);
  const runtime = runtimeRevisionForState(verified.snapshot);
  if (!isRelationshipRuntime(runtime) || !isDeepStrictEqual(verified.manifest.executionRevision, runtime.executionRevision)
    || !isDeepStrictEqual(verified.manifest.contentPackage, runtime.contentPackage)) {
    throw Object.assign(new Error('关系初始化封存来源不一致。'), { code: 'INVALID_RELATIONSHIP_SOURCE' });
  }
  return { ...verified, setup: relationshipSetupForState(verified.snapshot) };
}
export const actorForState = (state, id) => actorsForState(state).find(actor => actor.id === id);
export function creationCatalog() {
  return { version: 1, actors: AGENT_ACTORS.filter(actor => actor.id !== 'warden').map(actor => ({ id: actor.id, name: actor.name, appearance: actor.appearance, communication: actor.communication })),
    locations: Object.entries(ROOM_CODES).map(([key, id]) => ({ id, name: CREATED_ROOMS[key] })), openings: structuredClone(OPENING_CHOICES),
    scenarios: [{ id: 'case-1', name: '第一周目 · 第一案',
      description: '案发后、发现前的清晨，从会客厅的日常开始，经历发现、通报、搜查、审判及回归日常。无预设对白；开场地点固定，仅掌握本人经历与实际见闻。',
      loops: [1], playerModes: ['original', 'custom'], excludedActorIds: ['noah', 'hiro'], startLocationId: 'RECEPTION', fixedOpening: true },
      { id: 'case-1-execution-test', name: '第一案 · 处刑按钮测试',
        description: '仅测试处刑：直接从审判庭的判决确认阶段开始，使用全员投给蕾雅的固定测试票，无需模型。打开手机可测试取消、确认及执行后状态；选择蕾雅视角可测试本视角结束。含死亡结算。',
        loops: [1], playerModes: ['original', 'custom'], excludedActorIds: ['noah', 'hiro'], startLocationId: 'COURT', fixedOpening: true }],
    storyArcs: [{ id: 'case-one-day3@1', name: '原作开局 · 第三夜第一案', version: 1,
      description: '第一天正常开局；第三夜按已授权原作事件案发，第四天清晨发现、搜查和审判。NPC 自主对话和投票不预设，案后回归同一世界日常。',
      loops: [1], excludedActorIds: ['noah', 'hiro'] }], notice: CREATED_NOTICE };
}
export function canonicalCreation(value) { return normalizeCreation(value); }
export function startingRoom(creation) {
  return roomKey(creation.opening?.locationId ?? agentActor(creation.actorId).locationId);
}
export function ownStartingKnowledge(state) {
  return state.creation ? [...actorForState(state, createdPlayerId(state)).initialKnowledge] : undefined;
}
