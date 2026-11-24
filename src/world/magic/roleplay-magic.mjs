import { authoredMagicContext, authoredMagicDestination, authoredPassageArrival, isCurrentAuthoredMagicAct } from '../../agents/authored-magic-intent.mjs';
import { assertSceneProse } from '../../agents/narrative-guards.mjs';
import { activeProcedure } from '../../cases/case-procedure.mjs';
import { runtimeActive, runtimeRoom, runtimeSetRoom } from '../../case-runtime.mjs';
import { acquisitionAudience } from '../../characters/actor-perception.mjs';
import { createdPlayerId } from '../../creation/player-setup.mjs';
import { guardView } from '../guard-reaction.mjs';

const keys = (value, expected) => value && Object.getPrototypeOf(value) === Object.prototype
  && Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
const fail = () => { throw Object.assign(new Error('本局魔法选择与封存场景不一致。'), { code: 'INVALID_AGENT_STATE' }); };

// This consumes a selected visual impression, never a location, persistent light,
// item, injury, relationship, knowledge claim, or authored rule as a fact.
export function validAuthoredMagicChoice(choice, privateText) {
  if (choice?.kind === 'visible') {
    if (!(keys(choice, ['kind', 'appearance']) && typeof choice.appearance === 'string'
      && choice.appearance.trim() && choice.appearance.length <= 160 && !/[<>\u0000-\u001f\u007f]/u.test(choice.appearance))) return false;
    if (privateText && choice.appearance.includes(privateText)) return false;
    // A reported visual may describe light reaching a wall, but not smuggle
    // an actual actor's relocation (including the short form 到了) into it.
    if (/(?:两人|她们|他们|众人|同伴|你我|我和|身形|脚步)[^。！？；]{0,20}(?:到了|挪到|进了|出了|出现在|置身|站在|被传送|被带走)/u.test(choice.appearance)) return false;
    try {
      assertSceneProse({ document: { blocks: [{ type: 'narration', text: choice.appearance }] }, movementGuardVersion: 1 });
      return true;
    } catch { return false; }
  }
  return choice?.kind === 'relocate' && keys(choice, ['kind', 'destination', 'companionId', 'contact'])
    && typeof choice.destination === 'string' && typeof choice.companionId === 'string' && choice.contact === 'hand';
}

// Physical contact requires a current player gesture in the exact authorized
// clause, not a flag from the model or a voluntary reaction invented for an NPC.
// For a pronoun, require exactly one nearby candidate rather than picking a face.
function handContact(rawInput, scene, companionId) {
  const text = rawInput.trim();
  const contact = /^(?:我\s*)?(?:先)?(?:直接|立刻|轻轻|紧紧)?(?:握住|握紧|握着|牵住|牵起|牵着|拉住|拉着|抓住|攥住)([^，,。；;！!？?：:\n「」『』“”"']{1,64}?)(?:的)?手(?:掌)?(?=$|[，,。；;！!？?\s]|并|然后|再|一同|一起)/u.exec(text)
    || /^(?:我\s*)?(?:先)?(?:和|与|同)([^，,。；;！!？?：:\n「」『』“”"']{1,64}?)(?:牵着手|牵手|握着手|握手)(?=$|[，,。；;！!？?\s]|并|然后|再|一同|一起)/u.exec(text);
  if (!contact) return false;
  const reference = contact[1].trim().replace(/的$/u, '');
  if (/^(?:她|他|对方|眼前的(?:人|少女)|身边的(?:人|少女)|同伴)$/u.test(reference)) {
    return scene.nearby.length === 1 && scene.nearby[0].id === companionId;
  }
  const matches = scene.nearby.filter(row => row.label === reference || row.appearance === reference
    || (/^[\p{Script=Han}]{3,6}$/u.test(row.label) && reference.length >= 2 && row.label.endsWith(reference)));
  return matches.length === 1 && matches[0].id === companionId;
}

/** Enact this one bounded outcome on a detached ordinary scene. The caller
 * publishes it through the normal stage/observation/commit path. */
export function settleAuthoredMagic(state, action, scene, enactment) {
  const { magic: choice } = action.intent;
  const authored = authoredMagicContext(state, action);
  if (!authored || !validAuthoredMagicChoice(choice, authored.text) || !isCurrentAuthoredMagicAct(action.rawInput)) fail();
  const player = createdPlayerId(state), origin = runtimeRoom(state, player);
  const localAudience = () => acquisitionAudience(state, player, { delivery: 'action' });
  const event = (suffix, text, audienceIds) => enactment(state, text, player,
    `authored-magic:${action.jobId}:${suffix}`, { audienceIds });
  const blocked = text => ({ events: [event('blocked', text, [player])], status: 'blocked', code: 'operation_unavailable' });
  if (!origin || !runtimeActive(state, player) || guardView(state)?.detention
    || !['daily', 'aftermath'].includes(activeProcedure(state)?.stage ?? 'daily')) {
    return blocked('此刻没有形成可结算的施放，现场没有发生变化。');
  }
  const present = localAudience();
  if (choice.kind === 'visible') return { status: 'completed', code: 'completed',
    events: [event('visible', `一瞬可见的异象：${choice.appearance.trim().replace(/[。！？]+$/u, '')}。随即消散。`, present)] };

  const { companionId, destination } = choice;
  const landing = authoredMagicDestination(scene, choice, action.rawInput, authored);
  if (!landing || destination === origin) return blocked('无法确定这一次的目的地，两人都留在原处。');
  if (companionId === player || !present.includes(companionId)) return blocked('要同行的人不在近旁，两人没有一同移动。');
  if (!handContact(action.rawInput, scene, companionId)) return blocked('没有与选定的同伴建立这次手部接触，两人都留在原处。');
  const moved = [player, companionId];
  const departure = present.filter(id => !moved.includes(id));
  const contact = event('contact', '施放前，两人的手实际接触。', present);
  for (const actorId of moved) if (!runtimeSetRoom(state, actorId, destination)) fail();
  if (state.agentWorld) state.agentWorld.routes = state.agentWorld.routes.filter(row => !moved.includes(row.actorId));
  const arrival = localAudience();
  if (moved.some(id => !arrival.includes(id))) fail();
  return { status: 'completed', code: 'completed', events: [contact,
    ...(departure.length ? [event('departure', '眼前的两道身影一同从原处消失。', departure)] : []),
    event('arrival', authoredPassageArrival(landing.label, action.authoredMagicDestinationVersion), arrival)] };
}
