import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';

export const PSYCHOLOGY_PROFILE_VERSION = 1;
const fail = () => { throw Object.assign(new Error('人物心理档案或其作者来源校验失败。'), { code: 'INVALID_PSYCHOLOGY_PROFILE' }); };
const sha256 = value => createHash('sha256').update(value).digest('hex');
const plain = value => value !== null && !isProxy(value) && Object.getPrototypeOf(value) === Object.prototype;
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const text = value => typeof value === 'string' && value.trim() === value && Boolean(value) && value.length <= 400
  && !/[<>\u0000-\u001f\u007f]/u.test(value);
const strings = (value, maximum, nonempty = false) => Array.isArray(value) && !isProxy(value)
  && value.length <= maximum && (!nonempty || value.length > 0) && value.every(text) && new Set(value).size === value.length;
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function atPointer(root, pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/') || pointer.length > 256) fail();
  let value = root;
  for (const segment of pointer.slice(1).split('/')) {
    const key = segment.replace(/~1/gu, '/').replace(/~0/gu, '~');
    if (!value || !Object.hasOwn(value, key) || ['__proto__', 'constructor', 'prototype'].includes(key)) fail();
    value = value[key];
  }
  if (!text(value)) fail();
  return value;
}

/** Compile a separate HOST_ONLY psychology supplement. The original scenario
 * bytes are not edited, so supported old packages remain available unchanged.
 * The supplement's exact bytes/hash are part of the new execution policy.
 * Actor projections never contain knowledge-boundary reasons or host pointers.
 */
export function compilePsychologyProfiles(bytes, content) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 256 * 1024 || !content?.ok) fail();
  let input;
  try { input = JSON.parse(bytes.toString('utf8')); } catch { fail(); }
  if (!exact(input, ['schemaVersion', 'ref', 'visibility', 'actors']) || input.schemaVersion !== 1
    || input.ref !== 'causal-psychology@1' || input.visibility !== 'HOST_ONLY'
    || !Array.isArray(input.actors) || input.actors.length !== content.host.scenario.actors.length) fail();
  const seen = new Set(); const scenario = content.host.scenario;
  const actors = input.actors.map(profile => {
    if (!exact(profile, ['actorId', 'needs', 'conflicts', 'triggers', 'coping', 'beliefs', 'relationships', 'knowledgeBoundaries'])
      || seen.has(profile.actorId)) fail();
    const index = scenario.actors.findIndex(actor => actor.id === profile.actorId);
    if (index < 0) fail(); seen.add(profile.actorId);
    for (const key of ['needs', 'conflicts', 'triggers', 'coping']) if (!strings(profile[key], 6, true)) fail();
    const source = pointer => {
      // Only this owner's explicit remembered fields can seed a belief. Neither
      // a provenance note nor another actor's knowledge is an owner memory.
      if (!new RegExp(`^/actors/${index}/initialKnowledge/[0-9]+$`, 'u').test(pointer)) fail();
      const body = atPointer(scenario, pointer);
      return { file: 'data/agent-scenario.json', pointer, sha256: sha256(body), text: body, knowledgeState: 'owner-known' };
    };
    const sources = pointers => {
      if (!strings(pointers, 8, true)) fail();
      return pointers.map(source);
    };
    if (!Array.isArray(profile.beliefs) || profile.beliefs.length > 3 || !profile.beliefs.length
      || !Array.isArray(profile.relationships) || profile.relationships.length > 2
      || !Array.isArray(profile.knowledgeBoundaries) || profile.knowledgeBoundaries.length > 8) fail();
    const beliefs = profile.beliefs.map(belief => {
      if (!exact(belief, ['summary', 'sourcePointers']) || !text(belief.summary)) fail();
      return { summary: belief.summary, sources: sources(belief.sourcePointers) };
    });
    const relationships = profile.relationships.map(relationship => {
      if (!exact(relationship, ['targetId', 'summary', 'distance', 'sourcePointers']) || !text(relationship.summary)
        || !Number.isSafeInteger(relationship.distance) || relationship.distance < -3 || relationship.distance > 3
        || ![['emma', 'hiro'], ['hiro', 'emma']].some(([owner, target]) => profile.actorId === owner && relationship.targetId === target)) fail();
      return { targetId: relationship.targetId, summary: relationship.summary, distance: relationship.distance,
        sources: sources(relationship.sourcePointers) };
    });
    const knowledgeBoundaries = profile.knowledgeBoundaries.map(boundary => {
      if (!exact(boundary, ['state', 'sourcePointers', 'reason']) || !['forgotten', 'host-fact'].includes(boundary.state)
        || !strings(boundary.sourcePointers, 8, true) || !text(boundary.reason)) fail();
      for (const pointer of boundary.sourcePointers) {
        if (!/^\/(?:provenance\/decisions|host\/quarantine)\//u.test(pointer)) fail();
        atPointer(scenario, pointer);
      }
      return structuredClone(boundary);
    });
    return { actorId: profile.actorId, needs: [...profile.needs], conflicts: [...profile.conflicts],
      triggers: [...profile.triggers], coping: [...profile.coping], beliefs, relationships, knowledgeBoundaries };
  });
  return freeze({ schemaVersion: 1, ref: input.ref, visibility: 'HOST_ONLY', fingerprint: sha256(bytes), actors });
}

const sourceId = (commitRef, ownerId, pointer) => `psy-${sha256(JSON.stringify(['psychology-source@1', commitRef, ownerId, pointer])).slice(0, 48)}`;
const actorHandle = (ownerId, targetId) => `person-${sha256(JSON.stringify(['actor-view@1', ownerId, targetId])).slice(0, 16)}`;

/** Exact host-only seed blueprint. Every goal/assessment cites its own minimal
 * source set; nothing can borrow an arbitrary nearby private recollection.
 * Source identities are commit-scoped, opaque, stable on transaction retry and
 * never reveal an unseen character's raw ID to a model.
 */
export function psychologySeedBlueprint(runtime, actor, commitRef) {
  if (runtime?.policy.psychologicalInitialization !== 1 || !runtime.psychology
    || typeof commitRef !== 'string' || !commitRef.length || !actor?.id) fail();
  const canonical = runtime.actors.find(row => row.id === actor.id);
  const index = runtime.actors.findIndex(row => row.id === actor.id);
  const profile = runtime.psychology.actors.find(row => row.actorId === actor.id);
  if (canonical && !profile) fail();
  const observations = new Map();
  const observe = source => {
    const id = sourceId(commitRef, actor.id, source.pointer);
    const entry = { id, ownerId: actor.id, text: source.text, source: { file: source.file, pointer: source.pointer,
      sha256: source.sha256, knowledgeState: 'owner-known' } };
    if (observations.has(id) && JSON.stringify(observations.get(id)) !== JSON.stringify(entry)) fail();
    observations.set(id, entry); return id;
  };
  const values = canonical?.persona.values ?? actor.persona.values;
  if (!strings(values, 32)) fail();
  const goals = values.slice(0, 3).map((value, i) => ({ value, sourceObservationIds: [observe({
    file: canonical ? 'data/agent-scenario.json' : 'run-setup',
    pointer: canonical ? `/actors/${index}/persona/values/${i}` : `/creation/character/desire`,
    text: value, sha256: sha256(value),
  })] }));
  const beliefs = (profile?.beliefs ?? []).map(belief => ({ summary: belief.summary,
    sourceObservationIds: belief.sources.map(observe) }));
  const relationships = (profile?.relationships ?? []).map(relationship => ({ targetHandle: actorHandle(actor.id, relationship.targetId),
    summary: relationship.summary, distance: relationship.distance, sourceObservationIds: relationship.sources.map(observe) }));
  return freeze({ goals, beliefs, relationships, observations: [...observations.values()] });
}
