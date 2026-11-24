import { ORDINARY_ADMISSION32, recoverableOrdinaryServiceFailure } from './ordinary-admission32.mjs';
import { DIRECTOR_EVENT_ATTEMPT_MS } from '../director/director-event-runtime.mjs';
import { SOFT_EXECUTION_BUDGET, SOFT_SLOT, softBoundaryDiagnostic } from './cooperative-rephrase.mjs';
import { isDeepStrictEqual } from 'node:util';
import { setImmediate as yieldToLocalIO } from 'node:timers/promises';
import { requiresInitialBoundaryReview } from '../content/initial-run-policy.mjs';
import { isProxy } from 'node:util/types';
import { isPrivateDirectorPacket, isDirectorEventWire, buildDirectorContext, validateDirectorOutput } from '../director/director-effective-private-contract.mjs';
import { buildServiceTaskContext, validateServiceTaskOutput, WORLD_SERVICE_PRINCIPAL, INITIAL_BOUNDARY_REVIEW_SLOT , serviceTaskOutputDiagnostic } from './service-task-contract.mjs';
import {
  buildRoleplayContext, buildCharacterDataContext,
  validateRoleplayDecision, validateCharacterDataProposal, roleplayDecisionDiagnostic,
} from './agent-boundaries.mjs';
import { modelGatewayDiagnostic, modelGatewayUsage, ordinaryGatewayDispatched } from './model-gateway.mjs';
import { chosenPlayerSpeech, renderPlayerSpeech, narrativeGuardDiagnostic, npcHostPerformanceDiagnostic } from './narrative-guards.mjs';
import { buildNarrativeContext, explicitQuotes, validateNarrativeOutput } from './narrative-boundaries.mjs';
import { authenticatedFailureClock, failureClockError, traceFailure, traceRequestRef } from './turn-trace.mjs';
import { validateSystemSeal } from '../cognition/dialogue-context-policy.mjs';
import { decisionStateDiagnostic } from '../cognition/decision-state.mjs';
import { analyzeNarrativeStyle, sceneStyleIssues } from './narrative-style.mjs';
import { HOST_SCENE_HANDOFF, hostSceneDocument } from '../scenes/scene-document.mjs';

const MESSAGES = Object.freeze({
  ERR_LLM_TURN_FAILED: '角色模型调用失败，可重试尚未完成的任务。',
  LLM_NOT_CONFIGURED: '尚未配置此角色任务所需的模型。',
  STALE_AGENT_TURN: '角色决策依据已过期，未采纳迟到结果。',
  AGENT_TIMEOUT: '角色模型响应超时，可重试尚未完成的任务。',
});
const REGENERATION_INPUT_ERRORS = Object.freeze({
  INVALID_REQUEST_ID: '重生成请求标识格式错误。',
  INVALID_REGENERATION: '重生成只能指定原行动楼层及当前版本。',
  INVALID_TURN: '只能重新生成当前路径中的有效行动楼层。',
  INVALID_GENERATION: '执行世代须为正整数。',
  INVALID_REVISION: '状态版本须为非负整数。',
  IDEMPOTENCY_CONFLICT: '同一重生成请求标识不能用于不同楼层、版本或操作。',
  STALE_GENERATION: '重生成请求属于旧世代，请刷新后重新确认。',
  STALE_REVISION: '进度已经改变，请刷新后重新确认楼层。',
  LLM_REQUIRED: '离线固定示例不能重新生成模型剧情。',
});
const STALE_CODES = new Set([
  'STALE_AGENT_TURN', 'STALE_AGENT_LEASE', 'STALE_AGENT_JOB', 'STALE_AGENT_RESULT',
  'STALE_AGENT_BATCH', 'STALE_GENERATION', 'STALE_REVISION', 'STALE_PREPARATION',
  'STALE_SAVE', 'ERR_AGENT_STALE',
]);
const HOST_VALIDATION_CODES = new Set([
  'INVALID_AGENT_OUTPUT', 'INVALID_AGENT_JOB', 'INVALID_AGENT_STATE', 'INVALID_NARRATIVE_OUTPUT',
  'ERR_AGENT_DECISION', 'ERR_AGENT_PROPOSAL', 'ERR_AGENT_EVIDENCE', 'ERR_AGENT_CONTEXT_TOO_LARGE',
  'ERR_COGNITION_INVALID', 'ERR_COGNITION_SOURCE', 'ERR_COGNITION_CONFLICT', 'ERR_DECISION_STATE', 'INVALID_DOMAIN_STATE',
  'SOURCE_VERSION_MISMATCH', 'INVALID_CONVERSATION_STATE', 'ERR_CONVERSATION_STATE', 'INVALID_SCENE_STAGE',
]);
const ERRORS = new WeakSet();
const DIAGNOSTICS = new WeakMap();
const FAILURES = new WeakMap();
const ACTION_OUTCOMES = new WeakMap();
// Kept separate from the legacy gateway diagnostic shape for compatibility.
export const llmTurnFailure = error => FAILURES.get(error) ?? null;
function locateFailure(error, stage, context = {}) {
  const failure = safeFailure(error);
  const prior = FAILURES.get(failure);
  FAILURES.set(failure, Object.freeze(traceFailure({ code: failure.code,
    ...llmTurnDiagnostic(failure), ...(npcHostPerformanceDiagnostic(error) ?? narrativeGuardDiagnostic(error)),
    ...((authenticatedFailureClock(failure) ?? authenticatedFailureClock(error))
      ? { failureClock: authenticatedFailureClock(failure) ?? authenticatedFailureClock(error) } : {}), ...prior, ...context,
    stage: prior?.stage ?? stage })));
  return failure;
}
function taskDiagnostic(task) {
  const taskKind = task.id?.startsWith('npc:') ? 'npc' : task.id?.startsWith('ballot:') ? 'ballot' : task.id;
  return { taskRole: task.role, taskKind };
}
function playerPerformanceFallback(task, failure) {
  if (task.role !== 'player_performance') return undefined;
  const data = task.packet.data;
  const literal = chosenPlayerSpeech(data)?.text;
  const silentFollow = data.contractVersion === 4 && data.intent?.type === 'follow' && data.intent.operation === undefined
    && data.intent.playerText === undefined && !data.communicationSelection && !data.statementReaction
    && !explicitQuotes(data.rawInput).length;
  const diagnostic = llmTurnDiagnostic(failure);
  if (data.authoredMagic?.version === 1 && data.intent?.type === 'magic' && data.intent.magic?.kind === 'relocate'
    && data.performanceVersion === 2 && literal === undefined && !data.communicationSelection && !explicitQuotes(data.rawInput).length
    && diagnostic?.code === 'ERR_MODEL_RESPONSE' && diagnostic.phase === 'proposal' && diagnostic.rule === 'player-performance-observable-action') {
    // This slot is required by the narrative packet, but the host already owns
    // all contact/arrival prose for a paired relocation. Discard the rejected
    // action and reflection; the validated replacement is preparation only.
    return { action: '我伸出手。' };
  }
  if (literal === undefined && !silentFollow) return undefined;
  if (diagnostic?.code !== 'ERR_MODEL_RESPONSE' || !(diagnostic.phase === 'candidate_json'
    || diagnostic.phase === 'proposal' && (literal !== undefined
      || ['player-performance-player-choice', 'player-performance-structure'].includes(diagnostic.rule)))) return undefined;
  // Discard the failed candidate; source-bound lines and a neutral gesture
  // are sufficient for the normal Host checks, not evidence of an effect.
  return literal === undefined ? { action: '我留意着对方的动向。' } : { action: '我抬起目光。', utterance: literal };
}
function settledMagicSceneFallback(task, failure) {
  const data = task.packet?.data;
  const details = llmTurnFailure(failure);
  if (task.id !== 'scene' || task.role !== 'scene_composer' || data?.intent?.type !== 'magic'
    || !data.sceneBefore?.roomId || !data.sceneAfter?.roomId || data.sceneBefore.roomId === data.sceneAfter.roomId
    || details?.stage !== 'validation' || details.phase !== 'host_validation' || details.code !== 'INVALID_AGENT_OUTPUT'
    || details.rule !== 'other-action') return undefined;
  // The terminal composer is only a reading layer. A fabricated action in
  // its prose must not replace or erase the already staged contact and arrival.
  // Save the fixed document through the same task and world-commit checks.
  return hostSceneDocument(data.events);
}
function taskAttemptPolicy(packet) {
  // packet is the runner-built immutable task, never response/provider metadata.
  const descriptor = Object.getOwnPropertyDescriptor(packet, 'systemPolicySeal');
  if (!descriptor) return { attemptPolicyState: 'absent' };
  try { return { attemptPolicyState: 'sealed-base', attemptBaseSystemPolicySeal: validateSystemSeal(descriptor.value) }; }
  catch { return {}; } // Unknown is absence of metadata, not an invented seal.
}
const ROLES = new Set(['roleplay', 'character_data', 'intent_parser', 'world_adjudicator', 'player_performance', 'narrator', 'scene_composer', 'director']);
const SCOPE_FIELDS = ['actorId', 'branchId', 'generation', 'revision'];
const NOVEL_PRESENTATION = Object.freeze({ scenePresentation: 'novel' });
const SCENE_EXECUTION_FIELDS = ['softDurationMs', 'hardDurationMs', 'compositionReserveMs'];
const MAX_SCENE_EXECUTION_MS = 180000;
const MAX_LLM_RETRIES = 10;
const DEFAULT_LLM_RETRY_DELAY_MS = 250;
// Validation misses are the common "first response did not pass" case and
// should be repeated immediately. Transport failures wait briefly.
const IMMEDIATE_RETRY_PHASES = new Set(['candidate_json', 'proposal', 'host_validation']);

export class LlmTurnError extends Error {
  constructor(code = 'ERR_LLM_TURN_FAILED') {
    const safeCode = typeof code === 'string' && Object.hasOwn(MESSAGES, code) ? code : 'ERR_LLM_TURN_FAILED';
    super(MESSAGES[safeCode]);
    this.name = 'LlmTurnError';
    this.code = safeCode;
    ERRORS.add(this);
    Object.freeze(this);
  }
  get actionOutcome() { return ACTION_OUTCOMES.get(this); }
}

// Only bounded host/gateway enums and status are retained. There is no public
// cause, provider exception, URL, response body or request packet.
export const llmTurnDiagnostic = error => DIAGNOSTICS.get(error) ?? null;
/** Delay before retry attempt N (1 = first retry). Zero skips the wait. */
export function llmRetryDelayMs(error, attemptIndex, baseMs = DEFAULT_LLM_RETRY_DELAY_MS, diagnostic = llmTurnDiagnostic) {
  if (baseMs === 0 || !Number.isSafeInteger(attemptIndex) || attemptIndex < 1
    || !Number.isSafeInteger(baseMs) || baseMs < 0) return 0;
  const phase = typeof diagnostic === 'function' ? diagnostic(error)?.phase : undefined;
  if (IMMEDIATE_RETRY_PHASES.has(phase)) return 0;
  return Math.min(2000, baseMs * 2 ** Math.min(attemptIndex - 1, 3));
}
function ownCode(error) {
  if (error === null || !['object', 'function'].includes(typeof error) || isProxy(error)) return undefined;
  try { return Object.getOwnPropertyDescriptor(error, 'code')?.value; }
  catch { return undefined; }
}
function safeFailure(error, source = 'engine') {
  if (ERRORS.has(error)) return error;
  const diagnostic = modelGatewayDiagnostic(error);
  const nativeRule = roleplayDecisionDiagnostic(error) ?? softBoundaryDiagnostic(error) ?? serviceTaskOutputDiagnostic(error) ?? npcHostPerformanceDiagnostic(error);
  const code = source === 'provider' ? undefined : ownCode(error);
  let safeCode = 'ERR_LLM_TURN_FAILED';
  if (source === 'engine' && STALE_CODES.has(code)) safeCode = 'STALE_AGENT_TURN';
  else if (code === 'LLM_NOT_CONFIGURED' || diagnostic?.code === 'ERR_MODEL_CONFIG') safeCode = 'LLM_NOT_CONFIGURED';
  else if (code === 'AGENT_TIMEOUT' || diagnostic?.code === 'ERR_MODEL_TIMEOUT') safeCode = 'AGENT_TIMEOUT';
  const failure = new LlmTurnError(safeCode);
  if (diagnostic) DIAGNOSTICS.set(failure, diagnostic);
  else if (source === 'engine' && authenticatedFailureClock(error)) {
    DIAGNOSTICS.set(failure, Object.freeze({ code, failureClock: authenticatedFailureClock(error) }));
  } else if (source === 'engine' && HOST_VALIDATION_CODES.has(code)) {
    DIAGNOSTICS.set(failure, Object.freeze({ code, phase: 'host_validation', ...decisionStateDiagnostic(error), ...nativeRule }));
  } else if (nativeRule) DIAGNOSTICS.set(failure, nativeRule);
  return failure;
}
const plain = value => value !== null && typeof value === 'object' && !isProxy(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function sceneExecutionBudget(prepared) {
  const descriptor = Object.getOwnPropertyDescriptor(prepared, 'sceneExecutionBudget');
  // Only absence opts out. Undefined, inherited policy, accessors and non-JSON
  // metadata must not silently disable a deadline or invoke policy getters.
  if (descriptor === undefined) {
    if ('sceneExecutionBudget' in prepared) throw new LlmTurnError();
    return undefined;
  }
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new LlmTurnError();
  const value = descriptor.value;
  if (!plain(value) || Reflect.ownKeys(value).length !== SCENE_EXECUTION_FIELDS.length) throw new LlmTurnError();
  const budget = {};
  for (const field of SCENE_EXECUTION_FIELDS) {
    const entry = Object.getOwnPropertyDescriptor(value, field);
    if (!entry?.enumerable || !Object.hasOwn(entry, 'value') || !Number.isSafeInteger(entry.value)
      || entry.value < 1 || entry.value > MAX_SCENE_EXECUTION_MS) throw new LlmTurnError();
    budget[field] = entry.value;
  }
  if (budget.softDurationMs > budget.hardDurationMs || budget.compositionReserveMs > budget.hardDurationMs) throw new LlmTurnError();
  return Object.freeze(budget);
}
const sameSceneExecutionBudget = (left, right) => left === right || (left !== undefined && right !== undefined
  && SCENE_EXECUTION_FIELDS.every(field => left[field] === right[field]));
function freeze(value, seen = new WeakSet()) {
  if (value !== null && typeof value === 'object' && !seen.has(value)) {
    seen.add(value);
    for (const child of Object.values(value)) freeze(child, seen);
    Object.freeze(value);
  }
  return value;
}
function receiptCopy(receipt) {
  if (!plain(receipt)) throw new LlmTurnError();
  return freeze(structuredClone(receipt));
}
const taskIdentifier = value => typeof value === 'string' && value.length > 0 && value.length <= 128
  && value.trim() === value && !/[\u0000-\u001f\u007f]/u.test(value);
function pendingTasks(prepared) {
  const staged = prepared.staged === true;
  if (!plain(prepared.scope) || !Array.isArray(prepared.tasks) || prepared.tasks.length > (staged ? 16 : 2)) throw new LlmTurnError();
  const scope = Object.freeze({ actorId: prepared.actorId, branchId: prepared.scope.branchId,
    generation: prepared.scope.generation, revision: prepared.scope.revision });
  if (prepared.scope.actorId !== undefined && prepared.scope.actorId !== scope.actorId) throw new LlmTurnError('STALE_AGENT_TURN');
  const seen = new Set();
  const pending = [];
  // Build every missing packet before any adapter factory runs. Independent
  // actor slots never receive siblings' results or a mutable host context.
  for (const task of prepared.tasks) {
    if (!plain(task) || !ROLES.has(task.role)
      || (staged && (!taskIdentifier(task.id) || !taskIdentifier(task.actorId)))) throw new LlmTurnError();
    const id = staged ? task.id : task.id || task.role;
    const slot = staged ? id : task.role;
    if (seen.has(slot)) throw new LlmTurnError();
    seen.add(slot);
    if (task.terminal !== undefined) {
      if (task.role !== 'director' || !['failed_optional', 'skipped_optional'].includes(task.terminal.status) || task.result !== undefined) throw new LlmTurnError();
      continue;
    }
    if (task.result !== undefined) {
      if (!plain(task.result)) throw new LlmTurnError();
      continue;
    }
    const service = task.role === 'world_adjudicator';
    if (service && (!staged || !['intent', INITIAL_BOUNDARY_REVIEW_SLOT, SOFT_SLOT].includes(id) || task.actorId !== WORLD_SERVICE_PRINCIPAL)) throw new LlmTurnError();
    const build = task.role === 'roleplay' ? buildRoleplayContext : task.role === 'character_data' ? buildCharacterDataContext : task.role === 'director' ? buildDirectorContext : service ? buildServiceTaskContext : buildNarrativeContext;
    const packet = build(task.context, task.maxBytes === undefined ? undefined : { maxBytes: task.maxBytes });
    const taskScope = service ? Object.freeze({ principalId: WORLD_SERVICE_PRINCIPAL, branchId: scope.branchId,
      generation: scope.generation, revision: scope.revision }) : staged ? Object.freeze({ ...scope, actorId: task.actorId }) : scope;
    const fields = service ? ['principalId', 'branchId', 'generation', 'revision'] : SCOPE_FIELDS;
    if (!fields.every(field => packet.scope[field] === taskScope[field])
      || service && packet.data.viewpointActorId !== scope.actorId) throw new LlmTurnError('STALE_AGENT_TURN');
    pending.push(Object.freeze({ role: task.role, id, packet, scope: taskScope, behaviorPrompt: task.behaviorPrompt,
      styleVersion: task.styleVersion, outputContractVersion: task.outputContractVersion }));
  }
  return pending;
}
function preferredFailure(settled) {
  const failures = settled.flatMap((result, index) => result.status === 'rejected' ? [{ failure: safeFailure(result.reason), index }] : []);
  // A stale engine fence must never be masked by an unrelated provider error.
  return failures.find(({ failure }) => failure.code === 'STALE_AGENT_TURN')
    ?? failures.find(({ failure }) => failure.code === 'AGENT_TIMEOUT')
    ?? failures.find(({ failure }) => failure.code === 'LLM_NOT_CONFIGURED') ?? failures[0];
}

/** Formal turn orchestration only. The engine owns durable jobs, leases, fixed
 * contexts, validation and all publication. Every engine call is short and
 * synchronous; adapter promises are awaited only after that call has returned.
 * There is no success cache or shadow act. A failed model call is repeated up
 * to the configured count before that slot fails the turn; a sibling that
 * already passed is kept. Omitted retryCount is a single attempt so tests and
 * offline scripts stay exact. The game server reads the runtime preference,
 * which defaults to 3. Stale, closed and unconfigured calls are not retried.
 */
export class LlmTurnRunner {
  #engine;
  #getAdapter;
  #timeoutMs;
  #sceneTimeoutMs;
  #retryCount = 0;
  #getRetryCount;
  #retryDelayMs = DEFAULT_LLM_RETRY_DELAY_MS;
  #scenePresentation = 'model';
  #yieldToLocalIO;
  #inFlight = new Map();
  #closed = false;
  #onMetrics;

  constructor({ engine, getAdapter, timeoutMs, sceneTimeoutMs, onMetrics, retryCount, getRetryCount, retryDelayMs,
    scenePresentation = 'model', yieldBetweenTransactions = false } = {}) {
    // A host's explicit general deadline also governs scenes unless separately
    // overridden; short timeout tests and the server's 60-second cap stay exact.
    if (sceneTimeoutMs === undefined) sceneTimeoutMs = timeoutMs === undefined ? 90000 : timeoutMs;
    if (timeoutMs === undefined) timeoutMs = 45000;
    if (!engine || ['prepareAgentTurn', 'recordAgentResult', 'completeAgentTurn', 'failAgentTurn']
      .some(method => typeof engine[method] !== 'function') || typeof getAdapter !== 'function'
      || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000
      || !Number.isSafeInteger(sceneTimeoutMs) || sceneTimeoutMs < 1 || sceneTimeoutMs > 120000
      || (onMetrics !== undefined && (typeof onMetrics !== 'function' || isProxy(onMetrics)))
      || typeof yieldBetweenTransactions !== 'boolean' || !['model', 'host', 'novel'].includes(scenePresentation)) throw new LlmTurnError();
    this.#engine = engine;
    this.#getAdapter = getAdapter;
    this.#scenePresentation = scenePresentation;
    this.#yieldToLocalIO = yieldBetweenTransactions;
    this.#timeoutMs = timeoutMs;
    this.#sceneTimeoutMs = sceneTimeoutMs;
    this.#onMetrics = onMetrics;
    if (getRetryCount !== undefined && retryCount !== undefined) throw new LlmTurnError();
    if (getRetryCount !== undefined) {
      if (typeof getRetryCount !== 'function' || isProxy(getRetryCount)) throw new LlmTurnError();
      this.#getRetryCount = getRetryCount;
    } else if (retryCount !== undefined) {
      if (!Number.isSafeInteger(retryCount) || retryCount < 0 || retryCount > MAX_LLM_RETRIES) throw new LlmTurnError();
      this.#retryCount = retryCount;
    }
    if (retryDelayMs !== undefined) {
      if (!Number.isSafeInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 5000) throw new LlmTurnError();
      this.#retryDelayMs = retryDelayMs;
    }
  }

  #resolveRetryCount() {
    let value = this.#retryCount;
    if (this.#getRetryCount) {
      try { value = this.#getRetryCount(); }
      catch { throw new LlmTurnError(); }
    }
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_LLM_RETRIES) throw new LlmTurnError();
    return value;
  }

  #shouldRetry(attempt, error) {
    if (this.#closed || attempt.controller.signal.aborted) return false;
    if (attempt.deadline !== undefined && Date.now() >= attempt.deadline) return false;
    const failure = safeFailure(error);
    // A 429 is a provider refusal, not a malformed candidate. Short retries
    // on each parallel slot amplify it; keep the unfinished slots resumable.
    if (llmTurnDiagnostic(failure)?.httpStatus === 429) return false;
    return failure.code === 'ERR_LLM_TURN_FAILED' || failure.code === 'AGENT_TIMEOUT';
  }

  #retryPause(attempt, error, attemptIndex) {
    const delay = llmRetryDelayMs(error, attemptIndex, this.#retryDelayMs);
    if (delay === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let timer;
      let settled = false;
      const finish = failure => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        attempt.controller.signal.removeEventListener('abort', onAbort);
        if (failure) reject(failure);
        else resolve();
      };
      const onAbort = () => finish(new LlmTurnError(this.#closed ? 'ERR_LLM_TURN_FAILED' : 'STALE_AGENT_TURN'));
      timer = setTimeout(() => finish(), delay);
      attempt.controller.signal.addEventListener('abort', onAbort, { once: true });
      if (attempt.controller.signal.aborted) onAbort();
    });
  }

  async #finishTask(task, attempt, jobId, leaseToken, timing) {
    let output;
    let retryFeedback = task.retryFeedback;
    let downstreamReserveMs = 0;
    try {
      if (attempt.softExecution) {
        if (typeof this.#engine.reserveAgentModelAttempt !== 'function') throw new LlmTurnError();
        const reserved = this.#engine.reserveAgentModelAttempt(jobId, task.id, leaseToken, task.packet, attempt.manualNpcResume);
        if (!reserved || !Number.isSafeInteger(reserved.firstStartedAt) || reserved.hardDeadline !== reserved.firstStartedAt + 180000) throw new LlmTurnError();
        attempt.jobStartedAt = attempt.startedAt = reserved.firstStartedAt; attempt.deadline = reserved.hardDeadline;
        retryFeedback = reserved.npcResumeFeedback ?? retryFeedback;
        downstreamReserveMs = reserved.downstreamReserveMs ?? 0;
      }
      output = await this.#call(task.adapter, task.packet, attempt, retryFeedback, timing, downstreamReserveMs); }
    catch (error) {
      if (timing.startedAt !== undefined) timing.finishedAt = performance.now();
      const phase = llmTurnDiagnostic(error)?.phase;
      const failure = locateFailure(error, ['candidate_json', 'proposal'].includes(phase) ? 'validation' : 'model', taskDiagnostic(task));
      if (['candidate_json', 'proposal'].includes(phase)
        && typeof this.#engine.recordAgentValidationFailure === 'function') {
        try {
          if (attempt.budget !== undefined) this.#check(attempt);
          this.#engine.recordAgentValidationFailure(jobId, task.id, leaseToken, llmTurnFailure(failure));
        } catch { /* Stale or expired execution cannot add diagnostics. */ }
      }
      throw failure;
    }
    this.#check(attempt);
    const metrics = modelGatewayUsage(output);
    if (metrics && this.#onMetrics && !isPrivateDirectorPacket(task.packet)) {
      // Host-only numeric telemetry. No actor names, context, response or
      // model URL/key; observer failures cannot discard valid gameplay.
      try { Promise.resolve(this.#onMetrics(Object.freeze({ role: task.role, ...metrics }))).catch(() => {}); } catch { /* Best effort. */ }
    }
    if (metrics && typeof this.#engine.recordAgentUsage === 'function') {
      if (attempt.budget !== undefined) this.#check(attempt);
      try { this.#engine.recordAgentUsage(jobId, task.id, metrics, leaseToken); } catch { /* Telemetry cannot adopt or discard gameplay. */ }
    }
    timing.hostValidationStarted = true;
    try {
      if (task.role === 'roleplay') validateRoleplayDecision(task.packet, output, task.scope);
      else if (task.role === 'character_data') validateCharacterDataProposal(task.packet, output, task.scope);
      else if (task.role === 'director') validateDirectorOutput(task.packet, output, task.scope);
      else if (task.role === 'world_adjudicator') validateServiceTaskOutput(task.packet, output, task.scope);
      else {
        const validated = validateNarrativeOutput(task.packet, output, task.scope);
        // A short observation is fine, but returning the old UI handoff in lieu
        // of all scene prose does not fulfill a newly requested novel scene.
        if (attempt.novelScene && task.role === 'scene_composer' && !validated.blocks.some(block =>
          block.type === 'narration' && block.text.trim() !== HOST_SCENE_HANDOFF)) {
          throw Object.assign(new Error('本轮缺少场景描写，仅返回了固定交接语。'), { code: 'INVALID_NARRATIVE_OUTPUT' });
        }
      }
      if (task.role === 'player_performance') {
        const selection = chosenPlayerSpeech(task.packet.data);
        if (selection) {
          const utterance = task.packet.data.playerSpeechVoiceVersion === 1
            ? renderPlayerSpeech(selection, output.utterance, /「[^」]*」/u.test(task.packet.data.rawInput) ? undefined : task.packet.data.addressVoice) : selection.text;
          if (output.utterance !== utterance) {
            // Keep any valid gesture; the model may style, but not choose, speech.
            output = { ...output, utterance };
            validateNarrativeOutput(task.packet, output, task.scope);
          }
        }
      }
      const antiClicheVersion = task.packet.antiClicheVersion ?? task.packet.data?.antiClicheVersion;
      if (antiClicheVersion === 1 && timing.styleRetryAvailable && !task.retryFeedback && !attempt.styleRetried?.has(task.id)) {
        // Do not reroll an NPC's combined decision + performance for a wording hit.
        const prose = task.role === 'player_performance' ? [[output.action, 'action'], [output.reflection, 'reflection']]
          : task.role === 'narrator' ? [[output.text, 'narrative']] : [];
        if (prose.some(([text, scope]) => analyzeNarrativeStyle(text, { scope, antiClicheVersion }).issues.some(hit => hit.confidence === 'revise'))) {
          attempt.styleRetried ??= new Set(); attempt.styleRetried.add(task.id);
          timing.antiClicheRepair = true;
          throw Object.assign(new Error('场景表达需要压缩套话。'), { code: 'INVALID_NARRATIVE_OUTPUT' });
        }
      }
      if (task.styleVersion === 1 && task.role === 'scene_composer' && task.packet.data.compositionFeedback?.styleRuleIds
        && !task.packet.data.compositionFeedback.remainingRepairs) {
        // The one budgeted scene repair is the only hard style gate. The
        // initial draft remains advisory; this keeps style from causing loops.
        const styleIssues = sceneStyleIssues(output);
        if (styleIssues.some(issue => issue.confidence === 'high')) throw Object.assign(new Error('场景风格修订未收敛。'), { code: 'INVALID_NARRATIVE_OUTPUT' });
      }
      if (task.styleVersion === 1 && task.role === 'player_performance'
        && analyzeNarrativeStyle(output.action, { scope: 'action' }).blocking
        && !attempt.styleRetried?.has(task.id)) {
        attempt.styleRetried ??= new Set(); attempt.styleRetried.add(task.id);
        throw Object.assign(new Error('玩家动作描写需要调整文风。'), { code: 'INVALID_NARRATIVE_OUTPUT' });
      }
      if (task.styleVersion === 1 && task.role === 'roleplay' && typeof output.action === 'string'
        && analyzeNarrativeStyle(output.action, { scope: 'action' }).blocking
        && !attempt.styleRetried?.has(task.id)) {
        attempt.styleRetried ??= new Set(); attempt.styleRetried.add(task.id);
        throw Object.assign(new Error('角色动作描写需要调整文风。'), { code: 'ERR_AGENT_DECISION' });
      }
      if (task.styleVersion === 1 && task.role === 'narrator' && typeof output.text === 'string'
        && analyzeNarrativeStyle(output.text, { scope: 'narrative' }).blocking
        && !attempt.styleRetried?.has(task.id)) {
        attempt.styleRetried ??= new Set(); attempt.styleRetried.add(task.id);
        throw Object.assign(new Error('旁白需要调整文风。'), { code: 'INVALID_NARRATIVE_OUTPUT' });
      }
      this.#check(attempt);
      // Persist structured output, not the review validator's envelope.
      this.#engine.recordAgentResult(jobId, task.id, output, leaseToken);
      attempt.completed.add(task.id);
    } catch (error) {
      if (timing.startedAt !== undefined) timing.finishedAt = performance.now();
      const failure = locateFailure(error, 'validation', taskDiagnostic(task));
      if (typeof this.#engine.recordAgentValidationFailure === 'function') {
        try {
          if (attempt.budget !== undefined) this.#check(attempt);
          this.#engine.recordAgentValidationFailure(jobId, task.id, leaseToken, llmTurnFailure(failure));
        } catch { /* A stale or expired lease cannot write a trace either. */ }
      }
      throw failure;
    }
  }

  async #runTask(task, attempt, jobId, leaseToken, retries) {
    for (let index = 0; ; index += 1) {
      let attemptStartedAt;
      const timing = { styleRetryAvailable: index < retries };
      try {
        if (task.failure) throw task.failure;
        attemptStartedAt = Date.now();
        await this.#finishTask(task, attempt, jobId, leaseToken, timing);
        if (!attempt.softExecution && task.role === 'director' && attempt.deadline !== undefined) {
          const elapsed = Math.max(0, Date.now() - attemptStartedAt);
          attempt.deadline += elapsed; attempt.startedAt += elapsed;
        }
        return;
      } catch (error) {
        const elapsed = timing.startedAt === undefined ? undefined : (timing.finishedAt ?? performance.now()) - timing.startedAt;
        const gatewayClock = llmTurnDiagnostic(error)?.failureClock;
        const failure = locateFailure(error, 'model', { ...taskDiagnostic(task), attempt: index + 1, retryLimit: retries,
          ...taskAttemptPolicy(task.packet), ...(timing.startedAt === undefined ? { modelNotDispatched: true } : {}),
          ...(timing.hostValidationStarted ? {} : { hostValidationNotRun: true }),
          ...(gatewayClock?.check === 'gateway-call-timeout' ? { failureClock: { ...gatewayClock, jobStartedAt: attempt.jobStartedAt } } : {}),
          ...(Number.isFinite(elapsed) && elapsed >= 0
            ? { attemptDurationMs: Math.min(86_400_000, Math.round(elapsed)) } : {}) });
        // Record every failed slot attempt, including transport failures and
        // automatic retries. This cannot publish output or change retry policy.
        const guardedSoft = attempt.ordinaryAdmission && task.id === SOFT_SLOT;
        const details = llmTurnFailure(failure);
        const dispatchFacts = guardedSoft && timing.ordinaryDispatch ? { ...details, ordinaryDispatch: 'confirmed' } : details;
        if (typeof this.#engine.recordAgentTaskFailure === 'function') {
          try { this.#engine.recordAgentTaskFailure(jobId, task.id, leaseToken, dispatchFacts); } catch { /* Best effort, lease fenced. */ }
        }
        const fallback = playerPerformanceFallback(task, failure) ?? settledMagicSceneFallback(task, failure);
        if (fallback) {
          this.#check(attempt);
          try {
            // Uses the normal lease and sealed-task validation, then the
            // normal continuation and commit. No rejected text is saved.
            this.#engine.recordAgentResult(jobId, task.id, fallback, leaseToken);
            attempt.completed.add(task.id);
            return;
          } catch (error) { throw locateFailure(error, 'validation', taskDiagnostic(task)); }
        }
        if (guardedSoft && index < retries && this.#shouldRetry(attempt, failure)) {
          let retryBlockedClock;
          if (!recoverableOrdinaryServiceFailure(dispatchFacts) || !this.#engine.canRetryAgentOrdinaryAdjudication(
            jobId, leaseToken, llmRetryDelayMs(failure, index + 1, this.#retryDelayMs), clock => { retryBlockedClock = clock; })) {
            throw retryBlockedClock ? locateFailure(failure, 'model', { retryBlockedClock }) : failure;
          }
        }
        if (!attempt.softExecution && task.role === 'director' && attempt.deadline !== undefined && attemptStartedAt !== undefined) {
          const elapsed = Math.max(0, Date.now() - attemptStartedAt);
          attempt.deadline += elapsed; attempt.startedAt += elapsed;
        }
        if (task.failure || index >= retries || !this.#shouldRetry(attempt, failure)) {
          if (task.role === 'director' && failure.code !== 'STALE_AGENT_TURN' && !this.#closed && !attempt.controller.signal.aborted
            && typeof this.#engine.recordAgentOptionalTerminal === 'function') {
            const optionalSkip = failure.code === 'LLM_NOT_CONFIGURED' || details.failureClock?.check === 'director-optional-reserve';
            this.#engine.recordAgentOptionalTerminal(jobId, task.id, leaseToken,
              optionalSkip ? 'skipped_optional' : 'failed_optional', llmTurnFailure(failure));
            attempt.completed.add(task.id);
            return;
          }
          throw failure;
        }
        if (timing.antiClicheRepair) {
          task.retryFeedback = 'anti_cliche_prose';
        } else if (task.outputContractVersion === 1 && llmTurnDiagnostic(failure)?.issue === 'utterance_mixed_content') {
          task.retryFeedback = 'utterance_mixed_content';
        } else if (task.role === 'roleplay' && task.packet.npcActionPerspectiveVersion === 3
          && llmTurnDiagnostic(failure)?.rule === 'roleplay-self-reference') {
          task.retryFeedback = 'actor_self_reference';
        } else if ((task.packet.addressVoice || task.packet.data?.addressVoice)
          && ['roleplay-address-form', 'player-performance-address-form'].includes(llmTurnDiagnostic(failure)?.rule)) {
          task.retryFeedback = 'actor_address_form';
        }
        await this.#retryPause(attempt, failure, index + 1);
        if (this.#closed) throw new LlmTurnError();
        if (attempt.controller.signal.aborted) throw new LlmTurnError('STALE_AGENT_TURN');
        if (typeof this.#engine.renewAgentTurn === 'function') {
          this.#engine.renewAgentTurn(jobId, leaseToken);
        }
        // Failed provider calls should not consume the turn's hard wall-clock
        // ceiling before the retry gets to run.
        if (!attempt.softExecution && task.role !== 'director' && attempt.deadline !== undefined && attemptStartedAt !== undefined) {
          attempt.deadline += Math.max(0, Date.now() - attemptStartedAt);
        }
        this.#checkJobDeadline(attempt);
      }
    }
  }

  #check(attempt, deadline = true) {
    if (this.#closed) throw new LlmTurnError();
    if (attempt?.controller.signal.aborted) throw new LlmTurnError('STALE_AGENT_TURN');
    if (deadline) this.#checkJobDeadline(attempt);
  }

  #checkJobDeadline(attempt) {
    if (attempt?.deadline !== undefined) {
      const now = Date.now();
      if (now >= attempt.deadline) throw failureClockError(new LlmTurnError('AGENT_TIMEOUT'), {
        check: 'runner-job-deadline', jobStartedAt: attempt.jobStartedAt,
        checkedAt: now, deadlineAt: attempt.deadline, remainingMs: attempt.deadline - now,
      });
    }
  }

  async act(input) { return this.#execute(input, 'prepareAgentTurn'); }

  async regenerate(input) { return this.#execute(input, 'prepareAgentRegeneration'); }

  async #execute(input, prepareMethod) {
    this.#check();
    let prepared;
    let startedAt;
    let budget;
    try {
      // Always consult the engine before coalescing. It alone checks request
      // identity, lineage and lease ownership, including repeated requests.
      prepared = this.#scenePresentation === 'novel' ? this.#engine[prepareMethod](input, NOVEL_PRESENTATION)
        : this.#engine[prepareMethod](input);
      startedAt = Date.now(); // Preparation is outside the per-attempt budget.
      this.#check();
      if (prepared.kind === 'immediate' || prepared.kind === 'in_progress') return receiptCopy(prepared.receipt);
      if (prepared.kind !== 'model' || typeof prepared.jobId !== 'string' || !prepared.jobId
        || typeof prepared.leaseToken !== 'string' || !prepared.leaseToken) throw new LlmTurnError();
    } catch (error) {
      const code = ownCode(error);
      if (prepareMethod === 'prepareAgentTurn' && input?.newAttemptOf !== undefined
        && ['INVALID_NEW_ATTEMPT', 'INVALID_REQUEST_ID', 'INVALID_TEXT', 'INVALID_GENERATION', 'INVALID_REVISION',
          'IDEMPOTENCY_CONFLICT', 'STALE_GENERATION', 'STALE_REVISION', 'STALE_AGENT_TURN', 'LLM_REQUIRED'].includes(code))
        throw Object.assign(new Error('新尝试未提交：请核对当前失败请求、原文与版本；不会自动另开请求。'), { code });
      if (prepareMethod === 'prepareAgentRegeneration' && Object.hasOwn(REGENERATION_INPUT_ERRORS, code)) {
        throw Object.assign(new Error(REGENERATION_INPUT_ERRORS[code]), { code });
      }
      throw locateFailure(error, 'prepare');
    }
    let budgetFailure;
    try { budget = sceneExecutionBudget(prepared); }
    catch (error) { budgetFailure = safeFailure(error); }
    const prior = this.#inFlight.get(prepared.jobId);
    if (prior?.leaseToken === prepared.leaseToken) {
      // A duplicate cannot replace the original attempt's immutable policy.
      if (budgetFailure) throw budgetFailure;
      if (!sameSceneExecutionBudget(budget, prior.budget)) throw new LlmTurnError();
      return prior.promise;
    }
    // Reclaimed leases cannot inherit a previous attempt's promise/results.
    prior?.controller.abort();
    const attempt = { controller: new AbortController(), leaseToken: prepared.leaseToken, startedAt, jobStartedAt: startedAt,
      budget, budgetFailure, deadline: budget === undefined ? undefined : startedAt + budget.hardDurationMs, promise: undefined,
      modelCalls: 0, privateSlots: new Set(), completed: new Set(), known: new Set(), reused: new Set(),
      manualNpcResume: prepared.manualNpcResume === true,
      reusedTaskCount: Number.isSafeInteger(prepared.completedTaskCount) && prepared.completedTaskCount >= 0
        && prepared.completedTaskCount <= 32 ? prepared.completedTaskCount : 0 };
    // The engine's saved slots survive retry; execution time never does.
    attempt.promise = Promise.resolve().then(() => this.#run(prepared, attempt)).finally(() => {
      if (this.#inFlight.get(prepared.jobId) === attempt) this.#inFlight.delete(prepared.jobId);
    });
    this.#inFlight.set(prepared.jobId, attempt);
    return attempt.promise;
  }

  async #call(adapter, packet, attempt, retryFeedback, timing, downstreamReserveMs) {
    this.#check(attempt);
    const controller = new AbortController();
    let stopped;
    let rejectStopped;
    const cancelled = new Promise((_, reject) => { rejectStopped = reject; });
    const stop = (code, checkedAt) => {
      if (stopped) return;
      stopped = new LlmTurnError(code);
      if (code === 'AGENT_TIMEOUT') {
        DIAGNOSTICS.set(stopped, Object.freeze({ code, phase: 'timeout' }));
        const now = checkedAt ?? Date.now();
        failureClockError(stopped, { check: 'runner-call-timeout', jobStartedAt: attempt.jobStartedAt,
          attemptStartedAt: timing.callStartedAt, checkedAt: now, deadlineAt: deadline, remainingMs: deadline - now });
      }
      rejectStopped(stopped);
      controller.abort(); // Never forward private caller/provider abort reasons.
    };
    const onAbort = () => stop(this.#closed ? 'ERR_LLM_TURN_FAILED' : 'STALE_AGENT_TURN');
    attempt.controller.signal.addEventListener('abort', onAbort, { once: true });
    if (attempt.controller.signal.aborted) onAbort();
    const ordinarySoft = attempt.ordinaryAdmission && packet.purpose === 'ordinary-attempt@1';
    const baseTimeout = packet.role === 'director' && isDirectorEventWire(packet.data.version)
      ? Math.min(this.#timeoutMs, DIRECTOR_EVENT_ATTEMPT_MS) : packet.role === 'scene_composer' ? this.#sceneTimeoutMs : this.#timeoutMs;
    const timeoutMs = attempt.ordinaryAdmission && !(attempt.novelScene && packet.role === 'scene_composer')
      ? Math.min(baseTimeout, ordinarySoft ? ORDINARY_ADMISSION32.softCallMs : ORDINARY_ADMISSION32.requiredServiceMs) : baseTimeout;
    const startedAt = Date.now();
    const deadline = Math.min(startedAt + timeoutMs, (attempt.deadline ?? Infinity) - downstreamReserveMs);
    const check = () => {
      this.#check(attempt, false);
      if (!stopped) { const now = Date.now(); if (now >= deadline) stop('AGENT_TIMEOUT', now); }
      if (stopped) throw stopped;
    };
    const timer = setTimeout(() => stop('AGENT_TIMEOUT'), deadline - startedAt);
    // Promise.race observes late rejection too. A noncooperative adapter can
    // finish remotely, but has no continuation that can save or publish output.
    const called = Promise.resolve().then(() => {
      check();
      if (!isPrivateDirectorPacket(packet)) attempt.modelCalls++;
      timing.startedAt = performance.now();
      timing.callStartedAt = Date.now();
      return adapter(packet, Object.freeze({ signal: controller.signal, ...(retryFeedback ? { retryFeedback } : {}) }));
    });
    try {
      const output = await Promise.race([called, cancelled]);
      check();
      return output;
    } catch (error) {
      if (stopped) throw stopped;
      if (attempt.budget !== undefined) check();
      else this.#check(attempt);
      throw safeFailure(error, 'provider');
    } finally {
      if (ordinarySoft) timing.ordinaryDispatch = ordinaryGatewayDispatched(controller.signal);
      clearTimeout(timer);
      attempt.controller.signal.removeEventListener('abort', onAbort);
    }
  }

  async #run(prepared, attempt) {
    const { jobId, leaseToken } = prepared;
    let stage = 'context';
    try {
      if (attempt.budgetFailure) throw attempt.budgetFailure;
      this.#check(attempt);
      // One count for the whole turn, including later scene stages. A settings
      // change applies to the next action, not to a call already in flight.
      attempt.novelScene = prepared.novelScenePresentationVersion === 1;
      if (Object.hasOwn(prepared, 'executionBudget')) {
        if (!isDeepStrictEqual(prepared.executionBudget, SOFT_EXECUTION_BUDGET) || !prepared.persistentExecution) throw new LlmTurnError();
        attempt.softExecution = true;
        attempt.ordinaryAdmission = prepared.ordinaryAdmissionVersion === 1;
        const persisted = prepared.persistentExecution;
        if (persisted.count) { attempt.jobStartedAt = attempt.startedAt = persisted.firstStartedAt; attempt.deadline = persisted.hardDeadline; }
      }
      const retries = attempt.softExecution ? Math.min(1, this.#resolveRetryCount()) : this.#resolveRetryCount();
      // Intent + performance + three NPC beats + composition + repair + empty
      // completion fit eight stages; the pinned director adds at most one.
      // Advisory slots get one model attempt, never extra retry-driven calls.
      const maxStages = attempt.softExecution ? 13 : prepared.tasks.some(task => task.role === 'director') ? 9 : 8;
      for (let stageIndex = 0; stageIndex < maxStages; stageIndex++) {
        this.#check(attempt);
        stage = 'context';
        const pending = pendingTasks(prepared);
        // The Host completion seam needs both the scene budget capability and
        // the output-contract pin. Unmarked @32/@33 jobs keep their original
        // Host admission and publication policy; a new novel pin takes priority.
        const sceneTask = pending.find(task => task.role === 'scene_composer' && task.id === 'scene');
        // A legacy review may already be sealed against a Host document. It
        // must finish on that basis even when the current entry selects novel.
        const hostScene = prepared.hostScenePresentation === 'host@1' || (!attempt.novelScene
          && (this.#scenePresentation === 'host' || attempt.ordinaryAdmission)
          && attempt.budget !== undefined && sceneTask?.outputContractVersion === 1);
        const modelPending = hostScene
          ? pending.filter(task => !(task.role === 'scene_composer' && task.id === 'scene')) : pending;
        for (const task of prepared.tasks) {
          const id = prepared.staged ? task.id : task.role;
          if (isPrivateDirectorPacket(task.context)) attempt.privateSlots.add(id);
          attempt.known.add(id);
          if ((task.result !== undefined || task.terminal !== undefined) && !attempt.completed.has(id)) {
            attempt.completed.add(id); attempt.reused.add(id);
          }
        }
        // Capture the stage's closures before any sibling starts. A factory
        // failure does not discard another slot's validated durable result.
        const selected = modelPending.map(task => {
          try {
            this.#check(attempt);
            const foundationTask = task.role === 'world_adjudicator' || task.packet?.data?.initialRunPolicy !== undefined;
            const directorEvent = task.role === 'director' && isDirectorEventWire(task.packet.data.version);
            if ((directorEvent || foundationTask) && typeof this.#engine.assertAgentTask !== 'function') throw new LlmTurnError();
            if ((directorEvent || foundationTask || task.packet?.data?.ballotInstrumentVersion === 1 || task.packet?.data?.materialProseVersion === 2 || task.packet?.data?.physicalFactsVersion === 2)
              && typeof this.#engine.assertAgentTask === 'function')
              this.#engine.assertAgentTask(jobId, task.id, leaseToken, task.packet);
            const adapter = this.#getAdapter(task.role, task.scope.actorId, { behaviorPrompt: task.behaviorPrompt,
              ...(task.role === 'world_adjudicator' ? { servicePrincipal: task.scope.principalId, ...(task.packet.purpose ? { servicePurpose: task.packet.purpose } : {}) } : {}) });
            if (typeof adapter !== 'function') throw new LlmTurnError('LLM_NOT_CONFIGURED');
            return { ...task, adapter };
          } catch (error) { return { ...task, failure: locateFailure(safeFailure(error, 'configuration'), 'configuration', taskDiagnostic(task)) }; }
        });
        stage = 'model';
        const settled = await Promise.allSettled(selected.map(task => this.#runTask(task, attempt, jobId, leaseToken, task.role === 'director' ? 0 : retries)));
        // Completion of a model wave can leave several synchronous writes in
        // the same microtask stretch. Let queued HTTP reads run before the next
        // Host transaction, without splitting a transaction or changing clocks.
        if (this.#yieldToLocalIO && attempt.ordinaryAdmission && (selected.length || hostScene)) await yieldToLocalIO();
        this.#check(attempt, false);
        const preferred = preferredFailure(settled);
        if (preferred?.failure.code === 'STALE_AGENT_TURN') throw preferred.failure;
        this.#check(attempt);
        if (preferred) {
          const { failure, index } = preferred;
          // Only the final failed soft slot blocks the next Host continuation.
          throw selected[index].id === SOFT_SLOT ? locateFailure(failure, stage, { hostContinuationNotRun: true }) : failure;
        }
        if (hostScene && (prepared.requiresRunBoundaryReview ?? requiresInitialBoundaryReview(sceneTask?.packet?.data?.initialRunPolicy))) {
          stage = 'continuation';
          prepared = this.#engine.continueAgentTurn(jobId, leaseToken, Object.freeze({ hostScenePresentation: 'host@1' }));
          this.#check(attempt, false);
          if (prepared.kind !== 'model' || prepared.jobId !== jobId || prepared.leaseToken !== leaseToken
            || prepared.hostScenePresentation !== 'host@1') throw new LlmTurnError('STALE_AGENT_TURN');
          if (!sameSceneExecutionBudget(sceneExecutionBudget(prepared), attempt.budget)) throw new LlmTurnError();
          continue;
        }
        if (hostScene) {
          // All non-composer slots above have real validated results. The
          // engine publishes the canonical events with a Host handoff through
          // its normal completion seam; no task result or model usage exists.
          stage = 'commit';
          return receiptCopy(this.#engine.completeAgentTurn(jobId, leaseToken,
            Object.freeze({ hostScenePresentation: 'host@1' })));
        }
        if (prepared.staged === true && pending.length) {
          this.#check(attempt);
          const now = attempt.budget === undefined ? undefined : Date.now();
          // Admission only: the engine still returns unfinished fixed slots
          // and the composer. Legacy callers retain the exact two-arg API.
          const stopNewNpcBeats = !attempt.ordinaryAdmission && attempt.budget !== undefined && (now - attempt.startedAt >= attempt.budget.softDurationMs
            || attempt.deadline - now <= attempt.budget.compositionReserveMs);
          stage = 'continuation';
          prepared = stopNewNpcBeats
            ? this.#engine.continueAgentTurn(jobId, leaseToken, Object.freeze({ stopNewNpcBeats: true }))
            : this.#engine.continueAgentTurn(jobId, leaseToken);
          this.#check(attempt, false);
          if (prepared.kind !== 'model' || prepared.jobId !== jobId || prepared.leaseToken !== leaseToken) throw new LlmTurnError('STALE_AGENT_TURN');
          this.#check(attempt);
          if (!sameSceneExecutionBudget(sceneExecutionBudget(prepared), attempt.budget)) throw new LlmTurnError();
          continue;
        }
        this.#check(attempt);
        stage = 'commit';
        return receiptCopy(this.#engine.completeAgentTurn(jobId, leaseToken));
      }
      throw new LlmTurnError();
    } catch (error) {
      let failure = locateFailure(error, stage);
      const location = llmTurnFailure(failure);
      const advice = failure.code === 'STALE_AGENT_TURN' ? 'refresh_state'
        : location.stage === 'commit' ? 'inspect_commit'
          : failure.code === 'LLM_NOT_CONFIGURED' || location.stage === 'configuration' ? 'check_settings' : 'manual_retry';
      const nonPrivate = values => [...values].filter(id => !attempt.privateSlots.has(id)).length;
      const reused = nonPrivate(attempt.reused), completed = nonPrivate(attempt.completed);
      FAILURES.set(failure, Object.freeze(traceFailure({ ...location,
        ...(stage !== 'commit' ? { hostCommitNotRun: true } : {}),
        jobRef: traceRequestRef(jobId), modelCalls: attempt.modelCalls,
        reusedTasks: Math.max(reused, attempt.reusedTaskCount),
        completedTasks: completed + Math.max(0, attempt.reusedTaskCount - reused),
        pendingTasks: nonPrivate(attempt.known) - completed,
        retryAdvice: advice, retryRequiresModel: location.stage === 'commit' ? 'no' : 'possible' })));
      try { this.#engine.failAgentTurn(jobId, leaseToken, failure.code, llmTurnFailure(failure)); }
      catch (failed) {
        const fenced = safeFailure(failed);
        if (fenced.code === 'STALE_AGENT_TURN') failure = fenced;
      }
      try {
        const actionOutcome = this.#engine.agentFailureOutcome?.(jobId, failure.code);
        if (actionOutcome) ACTION_OUTCOMES.set(failure, receiptCopy(actionOutcome));
      } catch { /* Preserve the operational error if source recovery itself failed. */ }
      throw failure;
    }
  }

  close() {
    if (this.#closed) return;
    this.#closed = true;
    for (const attempt of this.#inFlight.values()) attempt.controller.abort();
  }
}
