import { isProxy } from 'node:util/types';
import { relationshipExecutionPolicy } from '../content/content-revisions.mjs';
import { RELATIONSHIP_DISPLAY_CHARS } from '../content/relationship-context-policy.mjs';

// Current physical projection only: no operation history, source metadata,
// inferred ownership, private plans or invisible inspection results.
export function physicalFactSnapshot({ room, doorOpen, pose, objects = [], carriers = [] }) {
  return { version: 1, roomId: room, door: { open: doorOpen === true,
    visibility: doorOpen === true ? '当前门口通路可见；不提供相邻房间内部' : '门关闭；不提供门外人物与物品' },
  pose: pose ? { posture: pose.posture, support: pose.support } : { posture: 'unknown', support: 'unknown' },
  objects: objects.map(({ id, name, placement, carrierId }) => ({ id, name, placement, ...(carrierId ? { carrierId } : {}) })),
  carriers: carriers.map(({ id, label }) => ({ id, label })) };
}
export function physicalObjectInspection(object, placement) {
  return `眼前的${object.name}，${placement}。可以核对当前外观与位置；这次检查不说明此前是谁使用、携带或放下，也没有自动拿取。`;
}

// Explicit opt-in projection; the historical function above keeps its exact
// bytes/meaning. No runtime selects this version until its owner pins it.
export const PHYSICAL_FACT_PROJECTION_VERSION_2 = 2;
const invalid = () => { throw Object.assign(new Error('当前物理投影的边界或字段无效。'), { code: 'INVALID_PHYSICAL_PROJECTION' }); };
const plain = value => value !== null && typeof value === 'object' && !isProxy(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function own(value, key) {
  if (!plain(value)) invalid();
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) { if (key in value) invalid(); return undefined; }
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) invalid();
  return descriptor.value;
}
function label(value, maximum = 160) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || /[\u0000-\u001f\u007f]/u.test(value)) invalid();
  return value;
}
function relationshipCarrierLabel(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > RELATIONSHIP_DISPLAY_CHARS
    || !value.isWellFormed() || /[\u0000-\u0009\u000b-\u001f\u007f]/u.test(value)) invalid();
  return value;
}
function rows(value, maximum = 32) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maximum
    || Reflect.ownKeys(value).length !== value.length + 1) invalid();
  return Array.from({ length: value.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) invalid();
    return descriptor.value;
  });
}
function enumeration(row, key, values, optional = true) {
  const value = own(row, key);
  if (value === undefined && optional) return undefined;
  if (!values.includes(value)) invalid();
  return value;
}
function frozen(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); }
  return value;
}
function boundary(value) {
  const copy = {};
  for (const key of ['ownerId', 'branchId', 'roomId']) copy[key] = label(own(value, key), 128);
  for (const key of ['generation', 'revision', 'worldTime']) {
    const number = own(value, key);
    if (!Number.isSafeInteger(number) || number < (key === 'generation' ? 1 : 0)) invalid();
    copy[key] = number;
  }
  return copy;
}
/** Structural bounds only, NOT a world-state reader or an authorization oracle.
 * The host must supply only THIS owner's currently visible, actually delivered
 * objects, owner-local carrier handles and explicitly observed surface states.
 * Absence of an object row means unknown, never empty. An empty surface needs
 * its own current observation; neither custody history nor raw evidence text
 * supplies one. expectedBoundary is the receiving task's exact host boundary.
 * Unknown fields are not read, including private plans, true names and cues. */
export function physicalFactSnapshotV2(input, expectedBoundary) {
  if (!plain(input) || !plain(expectedBoundary)) invalid();
  // A complete registered execution pin, not a bare marker, selects this new
  // display codec. Retain it so the existing elevation/material rebuilds agree.
  const supplied = relationshipExecutionPolicy(input), expectedPin = relationshipExecutionPolicy(expectedBoundary);
  const relationship = expectedPin.relationshipContextVersion === 1 ? expectedPin : supplied;
  const scope = boundary(own(input, 'scope')); const expected = boundary(expectedBoundary);
  if (Object.keys(scope).some(key => scope[key] !== expected[key])) invalid();
  const doorInput = own(input, 'door');
  const door = doorInput === undefined ? { passage: 'unknown', barrier: 'unknown', view: 'unknown' } : {
    passage: enumeration(doorInput, 'passage', ['passable', 'blocked', 'unknown'], false),
    barrier: enumeration(doorInput, 'barrier', ['bars', 'opaque', 'transparent', 'unknown'], false),
    view: enumeration(doorInput, 'view', ['visible', 'occluded', 'unknown'], false),
  };
  // passability, optical occlusion and institutional permission are independent.
  const poseInput = own(input, 'pose');
  const pose = poseInput === undefined ? { posture: 'unknown', support: 'unknown' } : {
    posture: enumeration(poseInput, 'posture', ['standing', 'sitting', 'lying', 'unknown'], false),
    support: enumeration(poseInput, 'support', ['floor', 'chair', 'bed', 'unknown'], false),
  };
  const carriers = rows(own(input, 'carriers'), 16).map(row => ({ id: label(own(row, 'id'), 128), label: relationship.relationshipContextVersion === 1 ? relationshipCarrierLabel(own(row, 'label')) : label(own(row, 'label'), 320) }));
  const objects = rows(own(input, 'objects')).map(row => {
    const object = { id: label(own(row, 'id'), 128), name: label(own(row, 'name')) };
    for (const key of ['placement', 'carrierId']) {
      const value = own(row, key); if (value !== undefined) object[key] = label(value, key === 'placement' ? 240 : 128);
    }
    for (const key of ['closed', 'transparent']) {
      const value = own(row, key);
      if (value !== undefined && typeof value !== 'boolean') invalid();
      if (value !== undefined) object[key] = value;
    }
    const carrier = enumeration(row, 'carrier', ['phone', 'paper', 'paper-book', 'voting-paper']);
    if (carrier !== undefined) object.carrier = carrier;
    return object;
  });
  const surfaces = rows(own(input, 'surfaces'), 16).map(row => ({ id: label(own(row, 'id'), 128),
    name: label(own(row, 'name')), occupancy: enumeration(row, 'occupancy', ['empty'], false) }));
  for (const values of [objects, carriers, surfaces]) if (new Set(values.map(row => row.id)).size !== values.length) invalid();
  if (objects.some(row => row.carrierId && !carriers.some(carrier => carrier.id === row.carrierId))) invalid();
  const result = { version: 2, ...relationship, scope, roomId: scope.roomId, door, pose, objects, carriers, surfaces };
  if (JSON.stringify(result).length > 16000) invalid();
  return frozen(result);
}
