import { isDeepStrictEqual } from 'node:util';
import { isProxy } from 'node:util/types';
import * as prior from './director-effective-contract.mjs';
export * from './director-effective-contract.mjs';

export const PRIVATE_SUPPLY_EXTENSION = Object.freeze({ id: 'independent-director@6', mode: 'event_planning' });
export const PRIVATE_SUPPLY_WIRE = 6;
export const PRIVATE_SUPPLY_OFFER = 'sealed-supply-transfer';
export const isPrivateDirectorExtension = value => isDeepStrictEqual(value, PRIVATE_SUPPLY_EXTENSION);
export const isSealedDirectorExtension = value => prior.isDirectorEventExtension(value) || isPrivateDirectorExtension(value);
export const isDirectorExtension = value => prior.isDirectorExtension(value) || isPrivateDirectorExtension(value);
export const isDirectorEventWire = value => prior.isDirectorEventWire(value) || value === PRIVATE_SUPPLY_WIRE;
const has = (value, key) => value && typeof value === 'object' && !isProxy(value) && Object.getOwnPropertyDescriptor(value, key)?.value;
export const isPrivateDirectorPacket = packet => has(packet, 'role') === 'director' && has(has(packet, 'data'), 'version') === PRIVATE_SUPPLY_WIRE;
const fail = () => { throw Object.assign(new Error('导演候选或来源边界无效。'), { code: 'INVALID_AGENT_OUTPUT' }); };
function exact(value, keys) {
  if (!value || typeof value !== 'object' || isProxy(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Reflect.ownKeys(value).length !== keys.length || keys.some(key => {
      const d = Object.getOwnPropertyDescriptor(value, key); return !d?.enumerable || !Object.hasOwn(d, 'value');
    })) fail();
}
const integer = (x, minimum) => Number.isSafeInteger(x) && x >= minimum;
const id = x => typeof x === 'string' && /^[a-zA-Z0-9:_.-]{1,128}$/u.test(x);
const digest = x => typeof x === 'string' && /^[a-f0-9]{64}$/u.test(x);
export function buildDirectorContext(packet, options = {}) {
  if (!isPrivateDirectorPacket(packet)) return prior.buildDirectorContext(packet, options);
  exact(packet, ['role', 'scope', 'data']);
  exact(packet.scope, ['actorId', 'branchId', 'generation', 'revision']);
  const { actorId, branchId, generation, revision } = packet.scope;
  if (actorId !== prior.DIRECTOR_PRINCIPAL || !id(branchId) || !integer(generation, 1) || !integer(revision, 0)) fail();
  exact(packet.data, ['version', 'extension', 'offer']);
  exact(packet.data.extension, ['id', 'mode']);
  exact(packet.data.offer, ['offerId', 'sourceToken']);
  if (!isPrivateDirectorExtension(packet.data.extension) || packet.data.offer.offerId !== PRIVATE_SUPPLY_OFFER
    || !digest(packet.data.offer.sourceToken)) fail();
  const copy = structuredClone(packet);
  if (!integer(options.maxBytes ?? 16000, 1) || Buffer.byteLength(JSON.stringify(copy), 'utf8') > Math.min(16000, options.maxBytes ?? 16000)) fail();
  return copy;
}
export const directorPacketForTransport = packet => isPrivateDirectorPacket(packet) ? buildDirectorContext(packet) : prior.directorPacketForTransport(packet);
export function validateDirectorOutput(packet, result, scope = packet.scope) {
  if (!isPrivateDirectorPacket(packet)) return prior.validateDirectorOutput(packet, result, scope);
  const delivered = buildDirectorContext(packet);
  if (!isDeepStrictEqual(delivered.scope, scope)) fail();
  if (has(result, 'operation') === 'no_change') exact(result, ['operation']);
  else if (has(result, 'operation') === 'plan') {
    exact(result, ['operation', 'offerId', 'sourceToken']);
    if (result.offerId !== delivered.data.offer.offerId || result.sourceToken !== delivered.data.offer.sourceToken) fail();
  } else fail();
  return structuredClone(result);
}
export const directorInstructionsForVersion = wire => wire === PRIVATE_SUPPLY_WIRE
  ? 'Private Host director task. Choose whether to plan the single delivered maintenance offer (one sealed crate of ordinary bandages) following the actual public assembly. This is optional: return exactly {"operation":"no_change"} or {"operation":"plan","offerId":"delivered offerId","sourceToken":"delivered sourceToken"}. A proposal transfers nothing. Never add timing, quantities, recipients, prose, forced behavior, healing, knowledge or authority. Only Host exact authorization and subsequent lawful committed story advance can effect the plan.'
  : prior.directorInstructionsForVersion(wire);
