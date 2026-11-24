import { runtimeRevisionForState } from '../content/content-revisions.mjs';
import { actorsForState, createdPlayerId } from '../creation/player-setup.mjs';
import { runtimeActive, runtimeRoom, runtimeSetRoom } from '../case-runtime.mjs';
import { prisonClock } from '../world/prison-activity.mjs';
import { RECEPTION_INTRODUCTION_POLICY } from './reception-introduction-policy.mjs';
import { RECEPTION_INTRODUCTIONS, RECEPTION_INTRODUCTION_SOURCE } from './reception-introduction-lines.mjs';

const fail = () => { throw Object.assign(new Error('会客厅介绍事件与实际集合或执行版本不一致。'), { code: 'INVALID_AGENT_STATE' }); };
export const usesReceptionIntroductions = state => runtimeRevisionForState(state).policy.receptionIntroductionVersion === 1;
const eligible = state => usesReceptionIntroductions(state) && !state.creation?.scenarioId && !state.completed
  && !state.caseOne && !state.caseRuntime?.procedure && !(state.caseRuntime?.incidents || []).length && !state.guardReaction?.pending
  && state.guardReaction?.detention?.status !== 'detained' && (!state.storyArc || state.storyArc.status === 'scheduled')
  && prisonClock(state).day === 1 && prisonClock(state).free && state.agentDoorOpen
  && runtimeActive(state, createdPlayerId(state)) && runtimeRoom(state, createdPlayerId(state)) === 'reception';
const pathToReception = room => room === 'reception' ? [] : room === 'corridor' ? ['reception']
  : room === 'infirmary' || room === 'hall' || room === 'cafeteria' || room === 'courtyard' ? ['reception']
    : room === 'kitchen' ? ['cafeteria', 'reception'] : room === 'lake' ? ['courtyard', 'reception']
      : /^cell(?:0[124567])?$/u.test(room || '') || room === 'playercell' ? ['corridor', 'reception'] : null;
const label = room => ({ corridor: '走廊', reception: '会客厅', infirmary: '医务室', hall: '玄关大厅',
  cafeteria: '食堂', kitchen: '厨房', courtyard: '庭院', lake: '湖边', playercell: '八号牢房', cell: '三号牢房',
  cell01: '一号牢房', cell02: '二号牢房', cell04: '四号牢房', cell05: '五号牢房', cell06: '六号牢房', cell07: '七号牢房' })[room] || '眼前的地点';
const elapsed = utterance => Math.max(3, Math.ceil(utterance.length / 6));
/** A single authored boundary, never a view-time migration. Returning pending
 * lets a long player wait stop for the actual introduction instead of skipping
 * over it. The original player has already chosen to enter this room. */
export function settleReceptionIntroductions(state, actionKey) {
  if (!eligible(state) || state.receptionIntroductions?.status === 'completed') return { events: [], occurred: false };
  if (state.receptionIntroductions) fail();
  const player = createdPlayerId(state);
  const participants = actorsForState(state).filter(actor => actor.id !== 'warden' && runtimeActive(state, actor.id));
  const ids = participants.map(actor => actor.id);
  if (!ids.includes(player)) fail();
  const start = state.worldTime; const clock = prisonClock(state);
  const logicalQueue = state.caseRuntime?.operations || [];
  if (logicalQueue.some(row => row.status === 'pending')) return { events: [], occurred: false };
  const windowEnd = (clock.hour < 10 ? 10 : clock.hour < 15 ? 15 : 22) * 3600;
  const availableSeconds = windowEnd - (clock.hour * 3600 + clock.minute * 60 + clock.second);
  const maximumDuration = 40 + RECEPTION_INTRODUCTIONS.reduce((sum, row) => sum + elapsed(row.text), 0) + 30;
  // Do not silently run an ordinary group meeting through a confinement
  // boundary. It remains pending for the next legal first-day free period.
  if (availableSeconds < maximumDuration) return { events: [], occurred: false };
  const events = []; const deliveryKey = typeof actionKey === 'string' && actionKey ? actionKey : `clock:${start}`;
  const put = (id, text, { speakerId = null, delivery = 'action', audienceIds = ids, addresseeIds } = {}) => {
    const row = { text, speakerId, delivery, audienceIds: [...audienceIds], occurredAt: state.worldTime,
      observationKey: `reception-introductions@1:${id}:${deliveryKey}`,
      ...(addresseeIds ? { addresseeIds: [...addresseeIds], communication: { kind: 'statement' } } : {}) };
    events.push(row); return row;
  };
  // Adjacent authored escort movements are retained separately from ordinary
  // autonomous routes. No name, biography or knowledge is granted by walking.
  const routes = participants.filter(actor => actor.id !== player).map(actor => ({ actor,
    path: pathToReception(runtimeRoom(state, actor.id)) }));
  if (routes.some(row => row.path === null)) return { events: [], occurred: false };
  for (let step = 0; step < Math.max(0, ...routes.map(row => row.path.length)); step++) {
    const movements = [];
    for (const row of routes.filter(row => row.path.length > step)) {
      const from = runtimeRoom(state, row.actor.id); const to = row.path[step];
      if (!runtimeSetRoom(state, row.actor.id, to)) fail();
      movements.push({ actorId: row.actor.id, from, to, at: state.worldTime + 20 });
    }
    if (movements.length) {
      state.worldTime += 20;
      const arriving = movements.some(row => row.to === 'reception');
      put(`escort-${step + 1}`, arriving
        ? '看守沿入口引导尚未到场的少女走进会客厅，桌椅旁渐渐聚齐了人。'
        : `看守沿相邻通路引导尚未到场的少女，从${[...new Set(movements.map(row => label(row.from)))].join('、')}走向${[...new Set(movements.map(row => label(row.to)))].join('、')}。`,
        { audienceIds: arriving ? [...ids] : [...new Set(movements.map(row => row.actorId))] });
      (state.receptionIntroductionEscort ||= []).push(...movements);
    }
  }
  if (!participants.every(actor => runtimeRoom(state, actor.id) === 'reception')) fail();
  if (state.agentWorld) state.agentWorld.routes = state.agentWorld.routes.filter(row => !ids.includes(row.actorId));
  put('begin', '会客厅的桌椅旁，少女们依次说明自己的姓名。书写的介绍会展示给在场的人，尚未轮到的人留在原处等候。');
  if (ids.some(id => id !== player)) {
    // Registration is a public identity notice, not the controlled actor's
    // consent, self-description or promise. It keeps authored addressed lines
    // intelligible without putting words in that actor's mouth.
    const actor = participants.find(row => row.id === player);
    const words = `这位是${actor.name}。`; state.worldTime += elapsed(words);
    const registration = put(`registered-${player}`, words, {
      speakerId: 'warden', delivery: 'speech', audienceIds: [...ids, 'warden'] });
    registration.receptionIntroduction = { version: 1, sourceId: 'host-registration', subjectId: player };
  }
  for (const source of RECEPTION_INTRODUCTIONS) {
    if (!ids.includes(source.speakerId)) continue;
    if (source.speakerId === player) continue;
    const projected = source.delivery === 'writing' && source.text.startsWith('『') && source.text.endsWith('』')
      ? source.text.slice(1, -1) : source.text;
    state.worldTime += elapsed(projected);
    const row = put(`name-${source.speakerId}`, projected, { speakerId: source.speakerId,
      delivery: source.delivery, audienceIds: [...ids], addresseeIds: ids.filter(id => id !== source.speakerId) });
    row.receptionIntroduction = { version: 1, sourceId: source.sourceId, subjectId: source.speakerId };
  }
  state.receptionIntroductions = { version: RECEPTION_INTRODUCTION_POLICY.version, status: 'completed',
    startedAt: start, completedAt: state.worldTime, participantIds: [...ids], deliveryKey,
    sourceRef: RECEPTION_INTRODUCTION_SOURCE.ref,
    observationKeys: events.map(row => row.observationKey) };
  return { events, occurred: true };
}
