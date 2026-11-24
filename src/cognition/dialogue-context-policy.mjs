import { isProxy } from 'node:util/types';

// Independent new-job contract: never alter an execution revision fingerprint.
export const DIALOGUE_CONTEXT_VERSION = 1;
const fail = () => { throw Object.assign(new Error('对白上下文版本或传输封存无效。'), { code: 'INVALID_AGENT_JOB' }); };
export function dialogueContextPin(value) {
  if (!value || typeof value !== 'object' || isProxy(value)) fail();
  const descriptor = Object.getOwnPropertyDescriptor(value, 'dialogueContextVersion');
  if (!descriptor) { if ('dialogueContextVersion' in value) fail(); return {}; }
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value') || descriptor.value !== 1) fail();
  return { dialogueContextVersion: 1 };
}
export function validateSystemSeal(value) {
  if (!value || typeof value !== 'object' || isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype
    || Reflect.ownKeys(value).length !== 2) fail();
  const read = key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail();
    return descriptor.value;
  };
  if (read('version') !== 1 || typeof read('sha256') !== 'string' || !/^[a-f0-9]{64}$/u.test(read('sha256'))) fail();
  return { version: 1, sha256: read('sha256') };
}
