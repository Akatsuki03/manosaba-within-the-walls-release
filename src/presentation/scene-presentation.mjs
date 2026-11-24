import { bgmForScene } from './bgm.mjs';
import { actorsForState, createdPlayerId, CREATED_ROOMS, ROOM_CODES, roomKey, startingRoom } from '../creation/player-setup.mjs';
import { selectedCardOpening } from '../content/card-world.mjs';
import { runtimeRoom } from '../case-runtime.mjs';
import { authoredPassageArrival } from '../agents/authored-magic-intent.mjs';

const locationLabel = value => value === '新增牢房' ? CREATED_ROOMS.playercell : value;
const track = state => bgmForScene(state);
const sameTrack = (a, b) => (a?.id || null) === (b?.id || null);
/** Map committed raw ranges to one owner's display without touching history.
 * Multi-owner host events retain their original SQL/audit rows; private rows
 * never receive a display coordinate or carry their media into this view. */
export function projectOwnerSceneDisplay({ entries, turns, presentation, ownerId }) {
  const boundaries = [0]; const visible = [];
  for (const entry of entries) {
    if (!Array.isArray(entry.audienceIds) || entry.audienceIds.includes(ownerId)) visible.push(entry);
    boundaries.push(visible.length);
  }
  if (visible.length === entries.length) return { entries, turns, presentation };
  const remapFrame = frame => boundaries[frame.entryIndex + 1] > boundaries[frame.entryIndex]
    ? { ...frame, entryIndex: boundaries[frame.entryIndex] } : null;
  return { entries: visible,
    turns: turns.map(turn => ({ ...turn, entryStart: boundaries[turn.entryStart], entryEnd: boundaries[turn.entryEnd] })),
    ...(presentation ? { presentation: { ...presentation, scenes: presentation.scenes.map(scene => ({ ...scene,
      entryStart: boundaries[scene.entryStart], entryEnd: boundaries[scene.entryEnd],
      frames: scene.frames.map(remapFrame).filter(Boolean) })).filter(scene => scene.entryEnd > scene.entryStart) } } : {}) };
}

function namedSpeaker(row, state, rosterAt) {
  const speaker = row.speakerId && rosterAt(state).find(actor => actor.id === row.speakerId);
  return speaker && [speaker.name, `${speaker.name}（书写）`, `${speaker.name}（屏幕）`].includes(row.speaker) ? speaker : null;
}
function portraitsFor(row, state, rosterAt, known = state.known || []) {
  // A voice or an appearance label cannot reveal an unacquired identity.
  if (!known.includes(row.speakerId) || !['speech', 'writing', 'action'].includes(row.delivery)) return [];
  const speaker = namedSpeaker(row, state, rosterAt);
  return speaker ? [{ id: speaker.id, name: speaker.name }] : [];
}

function openingFrames(rows, initial, rosterAt) {
  const frame = (row, entryIndex, scene = initial) => ({ entryIndex,
    location: locationLabel(scene.location), bgm: track(scene), portraits: portraitsFor(row, initial, rosterAt) });
  // Scenario openings own their setup even when the creator selected auto.
  if (initial.creation?.scenarioId) return rows.map((row, index) => frame(row, index));
  let opening; let room;
  try {
    opening = selectedCardOpening(initial.creation);
    if (opening) room = startingRoom(initial.creation);
  } catch { /* Unknown historical setup cannot authenticate a source boundary. */ }
  // Other-cell actors receive a perception-safe substitute, not these spans.
  if (!opening || !room || (opening.id === 'card-other-cell' && createdPlayerId(initial) !== 'emma')) return rows.map((row, index) => frame(row, index));
  const cell = { ...initial, phase: `agent_${room}`, location: CREATED_ROOMS[room], worldTime: 0 };
  const corridor = { ...initial, phase: 'agent_corridor', location: CREATED_ROOMS.corridor, worldTime: 35 };
  const actors = rosterAt(initial); const playerId = createdPlayerId(initial);
  const known = new Set(opening.id === 'card-second' ? actors.filter(actor => actor.id !== 'warden').map(actor => actor.id)
    : [playerId, ...(['emma', 'hiro'].includes(playerId) ? [playerId === 'emma' ? 'hiro' : 'emma'] : [])]);
  const label = actor => known.has(actor.id) ? actor.name : actor.appearance;
  const expected = [];
  // applyCardPrologue emits host activity groups just before the first corridor
  // span and after the source ends. Match those committed events too; arbitrary
  // action prose, duplicate quotes or an openingSource label alone are no cue.
  const positions = new Map(actors.map(actor => [actor.id, actor.locationId]));
  const openingActivity = (initial.agentWorld?.activityLog || []).filter(event => event.occurredAt > 0 && event.occurredAt <= 45);
  const activity = (from, to) => {
    const events = openingActivity.filter(event => event.occurredAt > from && event.occurredAt <= to);
    const visible = events.filter(event => Array.isArray(event.witnessIds) && event.witnessIds.includes(playerId));
    const groups = [visible.filter(event => event.to === 'CORRIDOR'), visible.filter(event => event.from === 'CORRIDOR')]
      .filter(group => group.length).map(group => ({ scene: corridor, speaker: '旁白', speakerId: null, delivery: 'action',
        occurredAt: group.at(-1).occurredAt, text: group.map(event => {
          const actor = actors.find(actor => actor.id === event.actorId);
          const place = code => CREATED_ROOMS[roomKey(code)] || '当前位置';
          return `${actor ? label(actor) : ''}由${place(event.from)}走向${place(event.to)}。`;
        }).join('\n') }));
    for (const event of events) positions.set(event.actorId, event.to);
    return groups;
  };
  let inCorridor = false;
  for (const block of opening.blocks) {
    if (block.kind === 'image' || !block.text) continue;
    if (block.stage === 'corridor' && !inCorridor) {
      inCorridor = true; expected.push(...activity(0, 35));
    }
    // A remembered quote remains narration, never a movement or portrait cue.
    const speakerId = block.speakerId === 'warden' || (block.kind === 'dialogue' && !block.memory) ? block.speakerId : null;
    if (speakerId === 'warden') known.add(speakerId);
    const actor = speakerId && actors.find(actor => actor.id === speakerId);
    const delivery = actor ? actor.communication : 'narration';
    const distant = actor && block.stage === 'cell' && !known.has(actor.id) && positions.get(actor.id) !== ROOM_CODES[room];
    const speaker = distant ? '远处的少女声音' : actor ? `${label(actor)}${delivery === 'writing' ? '（书写）' : ''}` : '旁白';
    expected.push({ text: block.text, speaker, speakerId, delivery,
      observationKey: speakerId === 'warden' ? `opening:${opening.id}:broadcast` : undefined,
      occurredAt: speakerId === 'warden' || !inCorridor ? 0 : 35, scene: inCorridor ? corridor : cell });
  }
  expected.push(...activity(35, 45));
  const source = initial.agentOpening;
  const exact = source?.id === opening.id && source.source?.pointer === opening.source.pointer
    && source.source?.sha256 === opening.source.sha256 && source.handoff === 'player-choice'
    && initial.location === corridor.location && initial.phase === corridor.phase && initial.worldTime === 45
    && rows.length === expected.length && rows.every((row, index) => row.id === `entry-${index + 1}` && row.openingSource === opening.id
      && ['text', 'speaker', 'speakerId', 'delivery', 'occurredAt', 'observationKey'].every(key => row[key] === expected[index][key]));
  // Reject the whole alignment on any mismatch, not a plausible-looking prefix.
  // Keep the setup scene until the final paragraph when no exact boundary exists.
  return rows.map((row, index) => frame(row, index,
    exact ? expected[index].scene : index === rows.length - 1 ? initial : cell));
}

/** Pure, disposable presentation. It consumes already committed, host-resolved
 * enactments and before/after snapshots. No candidate prose can introduce a
 * cue; neither reading nor projecting these frames replays a game action.
 * Unknown historical boundaries conservatively reveal the final scene only at
 * its final block rather than claiming a precise unauthored transition. */
export function projectScenePresentation({ turns, entries, readBefore, head }) {
  if (head.exampleId !== 'agent') return undefined;
  const befores = turns.map(turn => readBefore(turn.id));
  // Read-only, per projection and per exact checkpoint, not a cache across
  // revisions or between players. Per-frame knowledge and delivery are unchanged.
  const rosters = new WeakMap();
  const rosterAt = state => {
    if (!rosters.has(state)) rosters.set(state, actorsForState(state));
    return rosters.get(state);
  };
  const scenes = [];
  const initial = befores[0] || head;
  const openingEnd = turns[0]?.entryStart ?? entries.length;
  if (openingEnd > 0) scenes.push({ turnId: 'opening', entryStart: 0, entryEnd: openingEnd,
    frames: openingFrames(entries.slice(0, openingEnd), initial, rosterAt) });
  for (let index = 0; index < turns.length; index++) {
    const turn = turns[index];
    // Explicit host-only turns (notably execution confirmation) have no
    // composer summary, but their committed entries still need media frames.
    if (turn.entryEnd <= turn.entryStart) continue;
    const before = befores[index]; const after = befores[index + 1] || head;
    const action = head.agentActions?.[index];
    let location = locationLabel(before.location); let bgm = track(before);
    const moved = before.location !== after.location;
    const musicChanged = !sameTrack(bgm, track(after));
    const canonical = entries.slice(turn.entryStart, turn.entryEnd);
    // The key is generated by the causal resolver, not by the composer. Also
    // require its exact host-authored arrival text and actual state movement.
    const arrival = moved && action?.causalVersion === 1 ? canonical.findIndex(row => row.delivery === 'action'
      && row.speakerId === createdPlayerId(before)
      && row.observationKey === `${action.jobId}:arrival`
      && [`我沿通路来到${locationLabel(after.location)}。`, `你沿通路来到${locationLabel(after.location)}。`].includes(row.text)) : -1;
    const authoredChoice = action?.authoredMagicVersion === 1 && action.intent?.type === 'magic'
      && action.intent.magic?.kind === 'relocate' ? action.intent.magic : null;
    const authoredArrival = moved && authoredChoice && runtimeRoom(after, createdPlayerId(before)) === authoredChoice.destination
      && runtimeRoom(before, authoredChoice.companionId) === runtimeRoom(before, createdPlayerId(before))
      && runtimeRoom(after, authoredChoice.companionId) === authoredChoice.destination
      ? canonical.findIndex(row => row.delivery === 'action' && row.speakerId === createdPlayerId(before)
        && row.observationKey === `authored-magic:${action.jobId}:arrival`
        && row.text === authoredPassageArrival(locationLabel(after.location), action.authoredMagicDestinationVersion)) : -1;
    const procedure = before.caseRuntime?.procedure?.stage !== after.caseRuntime?.procedure?.stage
      ? canonical.findIndex(row => row.delivery === 'action' && typeof row.observationKey === 'string'
        && row.observationKey.startsWith(action?.jobId || '\u0000')
        && /:(?:procedure|court|boundary)(?::|$)/u.test(row.observationKey)) : -1;
    const fixedStageBefore = before.caseOne?.stage;
    const fixedStageAfter = after.caseOne?.stage;
    const fixedTrialArrival = moved && before.caseOne && after.caseOne
      && fixedStageBefore === 'assembly' && fixedStageAfter === 'discussion'
      && action?.type === 'scene' && action.sceneEventTimeVersion === 1
      && action.intent?.type === 'move' && action.intent.destination === 'court'
      && Number.isSafeInteger(after.caseOne.trialStartedAt)
      ? canonical.findIndex(row => row.delivery === 'action' && row.speakerId === createdPlayerId(before)
        && row.occurredAt === after.caseOne.trialStartedAt
        && [`我沿通路来到${locationLabel(after.location)}。`, `你沿通路来到${locationLabel(after.location)}。`].includes(row.text)) : -1;
    // Version-two executions carry authenticated per-owner mechanism/return
    // events. Keep the court frame until the actual host return, rather than
    // switching early because the final snapshot is already in reception.
    const executionReturn = action?.type === 'case_execution' && action.sceneVersion === 2
      ? canonical.findIndex(row => row.delivery === 'action' && row.occurredAt === after.worldTime
        && row.observationKey === `execution-v2:return:${action.verdictId}`) : -1;
    const transition = [executionReturn, fixedTrialArrival, authoredArrival, arrival, procedure].find(index => index >= 0) ?? canonical.length - 1;
    // A court opening is authenticated by the committed institutional stage
    // change and the player's actual assembly move, never by narrative prose.
    const caseBefore = before.caseOne || before.caseRuntime?.procedure;
    const caseAfter = after.caseOne || after.caseRuntime?.procedure;
    const trialOpening = caseBefore?.stage === 'assembly' && caseAfter?.stage === 'discussion'
      && action?.type === 'scene' && action.intent?.type === 'move' && action.intent.destination === 'court'
      && Number.isSafeInteger(caseAfter.trialStartedAt) && after.location === '审判庭';
    const known = [...(before.known || [])];
    const frames = canonical.map((row, offset) => {
      if (offset >= transition) {
        if (moved) location = locationLabel(after.location);
        if (musicChanged) bgm = track(after);
      }
      // Identity recognition is independent of moving rooms/changing music.
      // Only an already committed, named communication plus the authoritative
      // acquired identity can reveal a portrait. Prose, action labels and
      // unidentified voices cannot introduce it or backfill earlier frames.
      const ownerVisible = !Array.isArray(row.audienceIds) || row.audienceIds.includes(createdPlayerId(before));
      const speaker = ownerVisible && ['speech', 'writing'].includes(row.delivery) && namedSpeaker(row, after, rosterAt);
      if (speaker && (after.known || []).includes(speaker.id) && !known.includes(speaker.id)) known.push(speaker.id);
      const executionAnchor = action?.type === 'case_execution' && action.sceneVersion === 2
        && row.mediaAnchor?.version === 1 && row.mediaAnchor.kind === 'case_execution'
        && row.mediaAnchor.verdictId === action.verdictId && row.executionScene?.version === 2
        && row.executionScene.verdictId === action.verdictId
        && row.executionScene.step === row.mediaAnchor.step
        && ['mechanism', 'transfer', 'enclosure', 'completion'].includes(row.mediaAnchor.step)
        && row.audienceIds?.includes(createdPlayerId(before))
        && Number.isSafeInteger(row.occurredAt) && row.occurredAt >= before.worldTime && row.occurredAt <= after.worldTime
        ? { version: 1, verdictId: action.verdictId, step: row.mediaAnchor.step,
          perspective: ['selected', 'witness'].includes(row.mediaAnchor.perspective) ? row.mediaAnchor.perspective : 'witness',
          ...(row.mediaAnchor.set === 'angel-enclosure' ? { set: 'angel-enclosure' } : {}) } : null;
      return { entryIndex: turn.entryStart + offset, location, bgm, portraits: portraitsFor(row, after, rosterAt, known),
        ...(executionAnchor ? { execution: executionAnchor } : {}),
        ...(trialOpening && offset === transition ? { trialOpening: { version: 1, id: `trial-opening:${turn.id}` } } : {}) };
    });
    scenes.push({ turnId: turn.id, entryStart: turn.entryStart, entryEnd: turn.entryEnd, frames });
  }
  return { version: 1, scenes };
}
