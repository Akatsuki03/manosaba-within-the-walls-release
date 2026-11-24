import { ADMISSION_RUNTIME_REVISION } from '../agents/ordinary-admission32.mjs';

// New setup identity. The shared admission behavior isn't an execution pin.
export const EVENT_DIRECTOR_RUNTIME_REVISION = 'agent-prison-runtime@33';
export const EVENT_DIRECTOR_POLICY_REF = 'agent-runtime-policy@33';
export const DIRECTOR_EVENT_ATTEMPT_MS = 15_000;
export const usesOrdinaryAdmission32 = id => id === ADMISSION_RUNTIME_REVISION || id === EVENT_DIRECTOR_RUNTIME_REVISION;
