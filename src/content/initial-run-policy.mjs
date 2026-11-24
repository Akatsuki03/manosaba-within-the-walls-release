import { activeEffectiveBoundary, effectiveBoundaryDecision } from './effective-run-boundary.mjs';
import { ADMISSION_RUNTIME_REVISION } from '../agents/ordinary-admission32.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import * as v31 from './initial-run-policy-v31.mjs';
import { PUBLICATION_RUNTIME_REVISION } from '../scenes/ordinary-publication31.mjs';
import * as v30 from '../initial-run-policy-v30.mjs';
import { CAPACITY_RUNTIME_REVISION } from './ordinary-capacity30.mjs';
import * as v29 from '../initial-run-policy-v29.mjs';
import { KNOWN_TARGET_RUNTIME_REVISION } from './relationship-context-policy.mjs';
import * as v28 from '../initial-run-policy-v28.mjs';
import { TRUSTED_COMMUNICATION_RUNTIME_REVISION } from './relationship-context-policy.mjs';
import * as v27 from '../initial-run-policy-v27.mjs';
import {SOURCE_ACQUISITION_RUNTIME_REVISION} from './relationship-context-policy.mjs';
import * as v26 from '../initial-run-policy-v26.mjs';
import {SCREEN_BROADCAST_RUNTIME_REVISION} from './relationship-context-policy.mjs';
// Versioned executable policies: old roots execute the exact preserved asset.
import * as v12 from '../initial-run-policy-v12.mjs';
import * as v13 from '../initial-run-policy-v13.mjs';
import * as v14 from '../initial-run-policy-v14.mjs';
import * as v15 from '../initial-run-policy-v15.mjs';
import * as v16 from '../initial-run-policy-v16.mjs';
import * as v17 from '../initial-run-policy-v17.mjs';
import * as v18 from '../initial-run-policy-v18.mjs';
import * as v19 from '../initial-run-policy-v19.mjs';
import * as v20 from '../initial-run-policy-v20.mjs';
import * as v21 from '../initial-run-policy-v21.mjs';
import * as v22 from '../initial-run-policy-v22.mjs';
import * as v23 from '../initial-run-policy-v23.mjs';
import * as v24 from '../initial-run-policy-v24.mjs';
import * as v25 from '../initial-run-policy-v25.mjs';
import { SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION } from './relationship-context-policy.mjs';
const revisionId = value => typeof value === 'string' ? value
  : value?.source?.executionRevision?.revisionId ?? value?.agentRuntimeRevision ?? value?.executionRevision?.revisionId ?? value?.id;
function policy(value) {
  const id = revisionId(value);
  if ([PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(id)) return v31;
  if (id === CAPACITY_RUNTIME_REVISION) return v30;
  if (id === KNOWN_TARGET_RUNTIME_REVISION) return v29;
  if (id === TRUSTED_COMMUNICATION_RUNTIME_REVISION) return v28;
  if (id === SOURCE_ACQUISITION_RUNTIME_REVISION) return v27;
  if (id === SCREEN_BROADCAST_RUNTIME_REVISION) return v26;
  if (id === SOFT_REFERENCE_RUNTIME_REVISION) return v25;
  if (id === ATOMIC_PLAN_RUNTIME_REVISION) return v24;
  if (id === LOSSLESS_PLAN_RUNTIME_REVISION) return v23;
  if (id === ATOMIC_SOURCE_RUNTIME_REVISION) return v22;
  if (id === UNIQUE_RECIPIENT_RUNTIME_REVISION) return v21;
  if (id === PLAN_CARDINALITY_RUNTIME_REVISION) return v20;
  if (id === EXPLICIT_STANDARD_RUNTIME_REVISION) return v19;
  if (id === INTENT_OBJECT_RUNTIME_REVISION) return v18;
  if (id === SEMANTIC_ADMISSION_RUNTIME_REVISION) return v17;
  if (id === SEMANTIC_ORDINARY_RUNTIME_REVISION) return v16;
  if (id === ORDINARY_PLAN_RUNTIME_REVISION) return v15;
  if (id === EXPLICIT_INTENT_RUNTIME_REVISION) return v14;
  if (id === SOFT_RUNTIME_REVISION) return v13;
  if (id !== undefined && !/^agent-prison-runtime@(?:[1-9]|1[0-2])$/u.test(id))
    throw Object.assign(new Error('未知初始玩法执行修订。'), { code: 'SOURCE_VERSION_MISMATCH' });
  return v12;
}
export const assertFoundationCreation = (creation, revision) => policy(revision).assertFoundationCreation(creation, revision);
export const composeInitialRunPolicy = input => policy(input).composeInitialRunPolicy(input);
export const assertInitialRunPolicy = (...args) => policy(args[0] ?? args[1]).assertInitialRunPolicy(...args);
export const initialBoundaryPolicy = value => policy(value).initialBoundaryPolicy(value);
export const requiresInitialBoundaryReview = value => policy(value).requiresInitialBoundaryReview(value);
export const initialBoundaryRules = value => policy(value).initialBoundaryRules(value);
export const initialMechanismDecision = (state, kind, options) => {
  const effective = activeEffectiveBoundary(state);
  return effective ? effectiveBoundaryDecision(effective, kind, options) : policy(state).initialMechanismDecision(state, kind, options);
};
export const initialPublicBoundaryConflict = (...args) => policy(args[0]).initialPublicBoundaryConflict(...args);
export const assertInitialBoundaryTransition = (...args) => policy(args[0]).assertInitialBoundaryTransition(...args);
export const initialBoundaryHasUnreviewedCaseChange = (before, after, events, publicEvents) => {
  const boundary = activeEffectiveBoundary(before);
  // The original evaluator only reads this value's boundary rules. This
  // temporary rule input is never a scene snapshot or an initial proof.
  const view = boundary ? { ...before, creation: { playPolicy: boundary } } : before;
  return policy(before).initialBoundaryHasUnreviewedCaseChange(view, after, events, publicEvents);
};
export const validateInitialBoundaryAssessments = (...args) => policy(args[0]).validateInitialBoundaryAssessments(...args);

// Authentic lookup only: never select a policy from an error.
export const initialBoundaryAssessmentDiagnostic = error => v31.initialBoundaryAssessmentDiagnostic(error) ?? v30.initialBoundaryAssessmentDiagnostic(error) ?? v29.initialBoundaryAssessmentDiagnostic(error) ?? v28.initialBoundaryAssessmentDiagnostic(error) ?? v27.initialBoundaryAssessmentDiagnostic(error) ?? v26.initialBoundaryAssessmentDiagnostic(error) ?? v25.initialBoundaryAssessmentDiagnostic(error);
export const INITIAL_BOUNDARY_FAILURE_RULES = v25.INITIAL_BOUNDARY_FAILURE_RULES;
