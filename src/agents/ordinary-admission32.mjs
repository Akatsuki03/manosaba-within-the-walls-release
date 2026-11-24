// Exact opt-in identity, independent from gameplay and model-controlled data.
export const ADMISSION_RUNTIME_REVISION = 'agent-prison-runtime@32';
export const ORDINARY_ADMISSION32 = Object.freeze({ version: 1, softCallMs: 15000,
  requiredServiceMs: 60000, hostTailMs: 20000, optionalAttempts: 2, optionalRetryDelayMs: 2000 });

// Host presentation needs no composer or repair call. Hold 20s for the
// remainder of Host validation, prefix replay, document creation, and the
// transactional commit. A required boundary review adds one actual service
// call; this reserve does not promise a recoverable second review.
export const hostOrdinaryTailMs = needsReview => ORDINARY_ADMISSION32.hostTailMs
  + (needsReview ? ORDINARY_ADMISSION32.requiredServiceMs : 0);
// Opt-in for new model scenes only. This is a floor for composition (and
// possible repair), not an extension of the persisted job deadline.
export const novelCompositionReserveMs = plan => plan.novelScenePresentationVersion === 1 ? 20000 : 0;
export const ordinarySoftFits = (remainingMs, needsReview, compositionReserveMs = 0) =>
  remainingMs > ORDINARY_ADMISSION32.softCallMs + hostOrdinaryTailMs(needsReview) + compositionReserveMs;
// Runner caps each concurrent NPC call at 60s. A complete optional batch can
// use two attempts plus the maximum delay, not 60s times the sibling count.
export const optionalOrdinaryWaveFits = (remainingMs, needsReview, compositionReserveMs = 0) => ordinarySoftFits(remainingMs
  - ORDINARY_ADMISSION32.optionalAttempts * ORDINARY_ADMISSION32.requiredServiceMs
  - ORDINARY_ADMISSION32.optionalRetryDelayMs, needsReview, compositionReserveMs);
export const recoverableOrdinaryServiceFailure = details => details?.ordinaryDispatch === 'confirmed'
  && ['ERR_LLM_TURN_FAILED', 'ERR_MODEL_REQUEST', 'ERR_MODEL_RESPONSE', 'ERR_MODEL_TIMEOUT', 'AGENT_TIMEOUT',
    'INVALID_AGENT_OUTPUT'].includes(details.code) && ['model', 'validation'].includes(details.stage);
