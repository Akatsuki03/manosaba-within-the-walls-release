import { ADMISSION_RUNTIME_REVISION, ORDINARY_ADMISSION32 } from './agents/ordinary-admission32.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from './director/director-event-runtime.mjs';
import { RUN_POLICY_BODY_BYTES, RUN_POLICY_ERROR_STATUS } from './content/run-policy-contract.mjs';
import { PUBLICATION_RUNTIME_REVISION } from './scenes/ordinary-publication31.mjs';
import { CAPACITY_RUNTIME_REVISION } from './content/ordinary-capacity30.mjs';
import { KNOWN_TARGET_RUNTIME_REVISION } from './content/relationship-context-policy.mjs';
import { TRUSTED_COMMUNICATION_RUNTIME_REVISION } from './content/relationship-context-policy.mjs';
import {SOURCE_ACQUISITION_RUNTIME_REVISION} from './content/relationship-context-policy.mjs';
import {SCREEN_BROADCAST_RUNTIME_REVISION} from './content/relationship-context-policy.mjs';
import http from 'node:http';
import { readFileSync, mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { isProxy } from 'node:util/types';
import { serveBgm } from './presentation/bgm.mjs';
import { Diagnostics } from './host/diagnostics.mjs';
import { PrologueEngine } from './prologue.mjs';
import { configureLocalHttpResponse, validLocalHost, serveAgentObservation, LocalQueryIngress, INTERNAL_QUERY_INGRESS } from './host/local-query-ingress.mjs';
import { compileApprovedBodyFactorPolicy } from './world/magic/magic-binding-policy.mjs';
import { PlayerDeliveryWorker } from './presentation/player-delivery-worker.mjs';
import { LlmSettings } from './agents/llm-settings.mjs';
import { WORLD_SERVICE_PRINCIPAL } from './agents/service-task-contract.mjs';
import { LlmTurnRunner, llmRetryDelayMs, llmTurnFailure } from './agents/llm-turn-runner.mjs';
import { modelGatewayDiagnostic } from './agents/model-gateway.mjs';
import { traceFailure } from './agents/turn-trace.mjs';
import { STATIC_FILES as staticFiles } from './host/static-assets.mjs';
import { MAX_AVATAR_BODY_BYTES } from './characters/character-avatars.mjs';
import { creationCatalog } from './creation/player-setup.mjs';
import { ATTRIBUTE_RULES, ATTRIBUTES } from '../public/player-creation-rules.mjs';
import { ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION } from './content/relationship-context-policy.mjs';
import { CURRENT_RUNTIME_REVISION } from './content/content-revisions.mjs';
import { buildRelationshipAuthoringContext, RELATIONSHIP_AUTHORING_LIMITS } from './creation/relationship-authoring.mjs';

// Only loopback HTTP is exposed. The LLM edition uses explicit saved provider
// assignments; the archived deterministic fixtures never silently call models.
// Host-only: point LlmSettings at another directory while the game DB,
// diagnostics and profile identity stay in dataDirectory. modelSettingsReadOnly
// controls that settings store only, not game/diagnostics writes or model use.
const RUN_POLICY_ROUTE = '/api/run-policy';
// Product identity follows the local package manifest, not any save, runtime
// revision, configuration, or the launch profile's historical selector name.
const { version: productVersion = null } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
// Finite public messages: never serialize the underlying SQLite/authentication
// error or a submitted preference/boundary when projecting an error.
const runPolicyErrors = Object.freeze({
  INVALID_RUN_POLICY: '本局设置包含不支持或无效的字段。',
  RUN_POLICY_UNSUPPORTED: '当前存档不支持游玩中调整本局设置。',
  RUN_POLICY_STALE: '当前版本已经改变，请重新读取本局设置后再采用。',
  RUN_POLICY_PENDING: '请先完成或按原规则放弃未结行动。',
  RUN_POLICY_ACTIVE_CASE: '已有案件活动，不能用排除案件撤销。',
  RUN_POLICY_REQUEST_CONFLICT: '该请求标识已用于不同的本局设置。',
});

export function resolveModelSettingsDirectory(dataDir, requested) {
  return requested === undefined ? dataDir : resolve(requested);
}
export function resolveCreationRuntimeRevision(options = {}) {
const creationRuntimeRevision=Object.hasOwn(options,'creationRuntimeRevision')?options.creationRuntimeRevision:ATOMIC_PLAN_RUNTIME_REVISION;
if(![ATOMIC_PLAN_RUNTIME_REVISION,SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(creationRuntimeRevision))throw new TypeError('Invalid creation runtime revision');
return creationRuntimeRevision;
}
export function startLocalServer(options = {}) {
// Validate before filesystem/engine/server initialization. Factory is HOST code
// only; neither HTTP payloads nor environment variables can select it.
if(!options||typeof options!=='object'||isProxy(options)||![Object.prototype,null].includes(Object.getPrototypeOf(options))
  ||Reflect.ownKeys(options).some(key=>typeof key!=='string'||!['dataDirectory','portNumber','customAbilityFixture','offlineTurnAdapterFactory','modelSettingsDirectory','modelSettingsReadOnly','creationRuntimeRevision','v2CustomAbility','hiddenSupplyVersion','getHiddenSupplyMode','npcManualRecoveryVersion','visualPerformanceGuidanceVersion','privateDirectorTailVersion','npcActPreflightVersion','privateUnissuedAskVersion'].includes(key)
    ||!Object.hasOwn(Object.getOwnPropertyDescriptor(options,key),'value')))throw new TypeError('Invalid server options');
const {dataDirectory,portNumber,customAbilityFixture,offlineTurnAdapterFactory,modelSettingsDirectory}=options;
const creationRuntimeRevision=resolveCreationRuntimeRevision(options);
const modelSettingsReadOnly=Object.hasOwn(options,'modelSettingsReadOnly')?options.modelSettingsReadOnly:false;
if(typeof modelSettingsReadOnly!=='boolean')throw new TypeError('Invalid model settings read-only option');
if(modelSettingsDirectory!==undefined&&(typeof modelSettingsDirectory!=='string'||!modelSettingsDirectory))throw new TypeError('Invalid model settings directory');
if(offlineTurnAdapterFactory!==undefined&&(typeof offlineTurnAdapterFactory!=='function'||isProxy(offlineTurnAdapterFactory)))throw new TypeError('Invalid offline turn adapter factory');
// Code-held first-party test injection only; no HTTP/client adapter selector.
if(customAbilityFixture && (!['ordinary-unguarded@1','ordinary-guarded@1'].includes(customAbilityFixture.profile)||typeof customAbilityFixture.compiler!=='function'))throw new TypeError('Unsupported custom fixture');
const llmEdition = true;
const customAbilityProfile = customAbilityFixture?.profile ?? (llmEdition ? 'ordinary-guarded@1' : undefined);
const hiddenSupply = Object.hasOwn(options, 'hiddenSupplyVersion');
if (hiddenSupply && (options.hiddenSupplyVersion !== 2 || !llmEdition || creationRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION))
  throw new TypeError('Invalid hidden supply Host capability');
if (Object.hasOwn(options, 'getHiddenSupplyMode') && (!hiddenSupply || typeof options.getHiddenSupplyMode !== 'function' || isProxy(options.getHiddenSupplyMode)))
  throw new TypeError('Invalid private director Host control');
const npcManualRecovery = Object.hasOwn(options, 'npcManualRecoveryVersion');
if (npcManualRecovery && (![1, 2, 3].includes(options.npcManualRecoveryVersion) || !llmEdition || creationRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION))
  throw new TypeError('Invalid NPC manual recovery Host capability');
const npcActPreflight = Object.hasOwn(options, 'npcActPreflightVersion');
if (npcActPreflight && (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(options.npcActPreflightVersion) || !llmEdition || creationRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION))
  throw new TypeError('Invalid NPC act preflight Host capability');
const visualPerformanceGuidance = Object.hasOwn(options, 'visualPerformanceGuidanceVersion');
if (visualPerformanceGuidance && (![1, 2, 3].includes(options.visualPerformanceGuidanceVersion) || !llmEdition || creationRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION))
  throw new TypeError('Invalid visual performance Host capability');
const privateDirectorTail = Object.hasOwn(options, 'privateDirectorTailVersion');
if (privateDirectorTail && (options.privateDirectorTailVersion !== 1 || !hiddenSupply))
  throw new TypeError('Invalid private director tail Host capability');
const privateUnissuedAsk = Object.hasOwn(options, 'privateUnissuedAskVersion');
if (privateUnissuedAsk && (options.privateUnissuedAskVersion !== 1 || !hiddenSupply))
  throw new TypeError('Invalid private unissued aperture Host capability');
const v2CustomAbility = Object.hasOwn(options, 'v2CustomAbility');
if (v2CustomAbility && (options.v2CustomAbility !== EVENT_DIRECTOR_RUNTIME_REVISION || customAbilityProfile !== 'ordinary-guarded@1'))
  throw new TypeError('Invalid guarded custom-ability policy runtime');
const port = Number(portNumber ?? process.env.PORT ?? (llmEdition ? 3211 : 3210));
const dataDir = resolve(dataDirectory || process.env.MANOSABA_DATA_DIR || join(homedir(), '.manosaba', llmEdition ? 'llm-test-v1' : 'prologue-verification'));
const modelSettingsDir = resolveModelSettingsDirectory(dataDir, modelSettingsDirectory);
mkdirSync(dataDir, { recursive: true });
const canonicalDataDir = realpathSync(dataDir);
const profileId = createHash('sha256').update(process.platform === 'win32' ? canonicalDataDir.toLowerCase() : canonicalDataDir).digest('hex');
const customAbilityCompiler = customAbilityFixture?.compiler ?? (llmEdition ? async draft => {
  const adapter = getSettings().createAbilityCompilerAdapter({ timeoutMs: 60000,
    onTraffic: (event, fields) => diagnostics.recordTraffic(event, fields) });
  try { return await adapter(draft); }
  catch (error) {
    const diagnostic = modelGatewayDiagnostic(error);
    if (diagnostic?.code === 'ERR_MODEL_RESPONSE' && ['candidate_json', 'proposal'].includes(diagnostic.phase)) {
      throw Object.assign(new Error('模型的能力候选未通过校验。'), { code: 'CUSTOM_ABILITY_AUTHORING_INVALID' });
    }
    throw error;
  }
} : undefined);
const dbPath = join(dataDir, 'world.sqlite');
 const isolatedReadIngress = llmEdition && creationRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION;
 const ingressKey = isolatedReadIngress ? randomBytes(32).toString('hex') : null;
 const engine = new PrologueEngine(dbPath, { initialExampleId: llmEdition ? 'agent' : 'emma',
  runtimeRevisionId: CURRENT_RUNTIME_REVISION, creationRuntimeRevisions: { v2Ordinary: creationRuntimeRevision }, directorVersion: 3, materialProseVersion: 2, physicalFactsVersion: 2, postureActionVersion: 1, guardRulesByDefault: customAbilityFixture ? customAbilityFixture.profile === 'ordinary-guarded@1' : true, caseRulesByDefault: true,
  ...(v2CustomAbility ? { v2CustomAbility: EVENT_DIRECTOR_RUNTIME_REVISION } : {}),
  ...(npcManualRecovery ? { npcManualRecoveryVersion: options.npcManualRecoveryVersion } : {}),
  ...(npcActPreflight ? { npcActPreflightVersion: options.npcActPreflightVersion } : {}),
  ...(visualPerformanceGuidance ? { visualPerformanceGuidanceVersion: options.visualPerformanceGuidanceVersion } : {}),
  ...(privateDirectorTail ? { privateDirectorTailVersion: 1 } : {}),
  ...(privateUnissuedAsk ? { privateUnissuedAskVersion: 1 } : {}),
  ...(hiddenSupply ? { hiddenSupplyVersion: 2, ...(options.getHiddenSupplyMode ? { getHiddenSupplyMode: options.getHiddenSupplyMode } : {}) } : {}),
  ...(customAbilityProfile ? {customAbilityProfile,...(customAbilityCompiler ? {customAbilityCompiler} : {})} : {}),
  magicBindingPolicy: compileApprovedBodyFactorPolicy(),
  occupiedBodyVersion: 1, swapLifecycleVersion: 1,
  getDirectorMode: () => diagnostics.view().directorMode });
let settings;
let authoringActive = false;

function getSettings() {
  if (settings) return settings;
  // Cache only successful initialization; a repaired file can be retried later.
  try { return settings = new LlmSettings(modelSettingsDir, { readOnly: modelSettingsReadOnly }); }
  catch { throw Object.assign(new Error('本机模型配置暂不可用，请修复配置后重试。'), { code: 'SETTINGS_UNAVAILABLE' }); }
}
const diagnostics = new Diagnostics(dataDir);
if(offlineTurnAdapterFactory)diagnostics.record('server.offline-turn-fixture',{profile:'guarded-player-route-offline@1'});
const MODEL_RETRY_CODES = new Set(['ERR_MODEL_REQUEST', 'ERR_MODEL_RESPONSE', 'ERR_MODEL_TIMEOUT']);
function modelErrorCode(error) {
  if (error === null || (typeof error !== 'object' && typeof error !== 'function')) return undefined;
  try { return Object.getOwnPropertyDescriptor(error, 'code')?.value; }
  catch { return undefined; }
}
function llmRetryLimit() {
  const value = diagnostics.view().llmRetryCount;
  return Number.isSafeInteger(value) && value >= 0 && value <= 10 ? value : 3;
}
async function retryModelOperation(operation) {
  const limit = llmRetryLimit();
  for (let index = 0; ; index += 1) {
    try { return await operation(); }
    catch (error) {
      if (index >= limit || !MODEL_RETRY_CODES.has(modelErrorCode(error))) throw error;
      const delay = llmRetryDelayMs(error, index + 1, 250, modelGatewayDiagnostic);
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
function safeOperationFailure(error, path) {
  const failure = llmTurnFailure(error);
  if (failure) return traceFailure(failure);
  // Only the gateway's authenticated WeakMap projection can enrich non-turn
  // model operations. Never trust a provider's message, cause or custom fields.
  const gateway = modelGatewayDiagnostic(error);
  if (!gateway || !['/api/creation/complete', '/api/settings/models'].includes(path)) return undefined;
  return traceFailure({ ...gateway, stage: gateway.phase === 'configuration' ? 'configuration'
    : ['candidate_json', 'proposal'].includes(gateway.phase) ? 'validation' : 'model',
    retryAdvice: gateway.phase === 'configuration' ? 'check_settings' : 'manual_retry', retryRequiresModel: 'possible' });
}
function turnFailureMessage(failure) {
  if (failure?.stage === 'model' && failure.httpStatus === 429)
    return '本轮模型服务返回 429，已通过校验的子任务结果已保留。请先核对模型线路的额度或限流状态。';
  if (failure?.stage === 'model' && (failure.code === 'AGENT_TIMEOUT' || failure.phase === 'timeout'))
    return '本轮有模型任务响应超时，已通过校验的子任务结果已保留。';
  if (failure?.stage === 'commit') return `${failure.pendingTasks === 0 ? '模型子任务已完成；' : '已通过校验的模型子任务结果已保留；'}最终提交校验未完成，并非网络问题。请检查日志，修复后使用原请求手动重试，不必反复重抽。`;
  return {
    prepare: '本轮准备未完成，尚未提交剧情。请检查日志后使用原请求手动重试。',
    context: '本轮上下文准备未通过校验，尚未提交剧情。请检查日志与当前状态后手动重试。',
    configuration: '当前任务的模型配置不可用。请检查 Options 中的激活预设、任务分配与凭据，再手动续接原请求。',
    model: '本轮模型请求未完成，已通过校验的子任务结果已保留。请根据故障摘要检查接口或网络后手动重试原请求。',
    validation: '本轮模型输出未通过格式或规则校验，已通过校验的子任务结果已保留，没有发布候选台词。请检查日志后手动重试原请求。',
    continuation: '已通过校验的模型子任务结果已保留，但后续任务续接未完成，尚未提交剧情。请检查日志后手动续接原请求。',
  }[failure?.stage];
}
const llmRunner = new LlmTurnRunner({ engine, timeoutMs: 60000, sceneTimeoutMs: 90000, yieldBetweenTransactions: true,
  // The source player entry requests authored scenes explicitly; the guarded
  // offline route fixture still exercises its original presentation policy.
  scenePresentation: offlineTurnAdapterFactory ? 'model' : 'novel',
  onMetrics: metrics => diagnostics.record('model.usage', metrics),
  getRetryCount: () => offlineTurnAdapterFactory ? 0 : diagnostics.view().llmRetryCount,
  getAdapter: (role, actorId, { behaviorPrompt, servicePrincipal, servicePurpose } = {}) => {
    const service = role === 'world_adjudicator';
    if (service ? servicePrincipal !== WORLD_SERVICE_PRINCIPAL : (servicePrincipal !== undefined || servicePurpose !== undefined))
      throw Object.assign(new Error('此宿主服务尚未开放。'), { code: 'SERVICE_UNAVAILABLE' });
    if (offlineTurnAdapterFactory) return offlineTurnAdapterFactory(role, actorId, Object.freeze({ behaviorPrompt,
      ...(service ? { servicePrincipal, ...(servicePurpose ? { servicePurpose } : {}) } : {}), fixtureProfile: 'guarded-player-route-offline@1' }));
    const adapterOptions = { timeoutMs: servicePurpose === 'ordinary-attempt@1' ? ORDINARY_ADMISSION32.softCallMs : role === 'scene_composer' ? 90000 : ORDINARY_ADMISSION32.requiredServiceMs,
      onTraffic: (event, fields) => diagnostics.recordTraffic(event, { agentId: role === 'roleplay' ? actorId : role, ...fields }),
      ...(behaviorPrompt ? { behaviorPrompt } : {}) };
    return service ? getSettings().createServiceAdapter(servicePrincipal, { ...adapterOptions, ...(servicePurpose ? { servicePurpose } : {}) })
      : getSettings().createAdapter(role === 'roleplay' ? actorId : role, adapterOptions);
  } });
const deliveryWorker = new PlayerDeliveryWorker(engine, { onError: () => diagnostics.record('delivery.deferred') });
const token = randomBytes(32).toString('hex');
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const mutationRoutes = new Set(['/api/prompts/update', '/api/creation/complete', '/api/creation/presets/read', '/api/creation/presets/save', '/api/creation/presets/delete', '/api/act', '/api/profiles/summarize', '/api/dice/roll', '/api/guard-rules/activate', '/api/case-item-rules/activate', '/api/ability-rules/activate', '/api/magic/activate', '/api/magic/cast', '/api/custom-abilities/drafts/save', '/api/custom-abilities/preset-draft/save', '/api/custom-abilities/compile', '/api/custom-abilities/compile/status', '/api/custom-abilities/confirm', '/api/custom-abilities/new-game', '/api/custom-abilities/current', '/api/custom-abilities/use', '/api/regenerate', '/api/case-execution', '/api/save', '/api/saves/rename', '/api/saves/delete', '/api/load', '/api/rewind', '/api/new-game', '/api/player/avatar', RUN_POLICY_ROUTE, '/api/options', '/api/diagnostics/events', '/api/settings/save', '/api/settings/activate', '/api/settings/delete', '/api/settings/models']);
let ingress;
 const backend = http.createServer(async (req, res) => {
  const path = req.url;
  const runPolicyRoute = path === RUN_POLICY_ROUTE;
  const correlationId = randomUUID();
  const started = performance.now();
  let input;
  const tracked = !runPolicyRoute && (mutationRoutes.has(path) || path === '/api/view' || path === '/api/settings') && path !== '/api/diagnostics/events';
  const json = (status, data, developerFailure) => {
    // Ordinary operation logs remain content-free. Private debug exchanges go
    // through the separate credential-redacting host-only recorder below.
    if (tracked) {
      diagnostics.record('http.operation', { path, method: req.method, status, correlationId,
        requestId: input?.requestId, code: data?.code, result: status >= 400 ? 'error' : 'success',
        expectedGeneration: input?.expectedGeneration, expectedRevision: input?.expectedRevision,
        expectedSaveVersion: input?.expectedSaveVersion, saveVersion: data?.savedSlot?.version,
        generation: data?.currentView?.generation ?? data?.generation,
        revision: data?.currentView?.revision ?? data?.revision, accepted: data?.accepted,
        failure: data?.failure,
        textLength: typeof input?.text === 'string' ? input.text.length : undefined });
      diagnostics.record('http.operation', { path, method: req.method, status, correlationId,
        failure: developerFailure ?? data?.failure, durationMs: Math.round(performance.now() - started) }, { debug: true });
      diagnostics.recordTraffic('http.exchange', { correlationId, path, method: req.method, status,
        durationMs: Math.round(performance.now() - started), request: input ?? null, response: data }, [token]);
    }
    // Background delivery is derived maintenance only. Scheduling it after a
    // successful response never authorizes another game action.
    if (status < 400 && (runPolicyRoute ? req.method === 'POST' && data?.changed === true : path === '/api/view' || mutationRoutes.has(path))) deliveryWorker.notify();
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data));
  };
  configureLocalHttpResponse(res, correlationId);
   if (ingressKey !== null && req.headers[INTERNAL_QUERY_INGRESS] !== ingressKey)
     return json(403, { code: 'INVALID_HOST', error: '只允许本机地址访问。' });
   const browserPort = ingress?.address()?.port ?? backend.address()?.port ?? port;
   if (!validLocalHost(req.headers.host, browserPort)) return json(403, { code: 'INVALID_HOST', error: '只允许本机地址访问。' });
   try {
     if (await serveBgm(req, res)) return;
    if (req.method === 'GET' && Object.hasOwn(staticFiles, path)) {
      const [file, type] = staticFiles[path];
      const content = readFileSync(join(publicDir, file));
      res.writeHead(200, { 'Content-Type': type });
      return res.end(content);
    }
    const avatarMatch = req.method === 'GET' && /^\/assets\/avatars\/([a-f0-9]{64})\.png$/u.exec(path);
    if (avatarMatch) {
      const asset = engine.avatarAsset(avatarMatch[1]);
      if (!asset) return json(404, { error: '没有找到头像图片。' });
      res.writeHead(200, { 'Content-Type': asset.mime, 'Content-Length': asset.bytes.length });
      return res.end(asset.bytes);
    }
    // The launcher must not reuse another profile just because it shares a port.
    // Expose only an opaque identity, never the data directory or world snapshot.
    if (req.method === 'GET' && path === '/api/health') return json(200, { application: 'manosaba-local', profileId, edition: llmEdition ? 'llm' : 'legacy', productVersion });
    if (req.method === 'GET' && path === '/api/view') {
      // Page metadata, not part of the canonical view shared with mutations.
      if (typeof productVersion === 'string') res.setHeader('X-Manosaba-Product-Version', productVersion);
      return json(200, { ...engine.httpPlayerView(), csrfToken: token });
    }
    if (req.method === 'GET' && runPolicyRoute) {
      // Like other sensitive reads, this is same-session local authority, not
      // a public settings export. It never wakes delivery or model work.
      if ((req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)
        || ['cross-site', 'same-site'].includes(req.headers['sec-fetch-site']))
        return json(403, { code: 'INVALID_ORIGIN', error: '不接受跨站请求。' });
      if (req.headers['x-manosaba-token'] !== token)
        return json(403, { code: 'INVALID_TOKEN', error: '页面凭据已失效，请刷新。' });
      return json(200, engine.runPolicy());
    }
    if (req.method === 'GET' && path === '/api/dice') return json(200, engine.diceView());
    if (req.method === 'GET' && path === '/api/case-item-rules') return json(200, engine.caseItemRulesUpgrade());
    if (req.method === 'GET' && path === '/api/guard-rules') return json(200, engine.guardRulesUpgrade());
    if (req.method === 'GET' && path === '/api/ability-rules') return json(200, engine.abilityRulesUpgrade());
    if (req.method === 'GET' && path === '/api/magic') return json(200, engine.magicCapabilities());
    if (serveAgentObservation(req, json, { status: () => engine.agentStatus(), progress: options => engine.agentProgress(options) })) return;
     if (req.method === 'GET' && path === '/api/prompts') return json(200, engine.promptCatalog());
    if (req.method === 'GET' && path === '/api/settings') return json(200, getSettings().view());
    if (req.method === 'GET' && path === '/api/options') return json(200, diagnostics.view());
    if (req.method === 'GET' && path === '/api/developer/actors') {
      // Sensitive read, intentionally outside mutationRoutes: no delivery work,
      // arbitrary actor selection, model calls or state updates are authorized.
      if ((req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)
        || ['cross-site', 'same-site'].includes(req.headers['sec-fetch-site'])) {
        return json(403, { code: 'INVALID_ORIGIN', error: '不接受跨站请求。' });
      }
      if (req.headers['x-manosaba-token'] !== token) return json(403, { code: 'INVALID_TOKEN', error: '页面凭据已失效，请刷新。' });
      if (diagnostics.view().developerMode !== true) return json(403, { code: 'DEVELOPER_MODE_DISABLED', error: '请先在选项设置中开启开发人员模式。' });
      return json(200, engine.developerActors());
    }
    if (req.method === 'GET' && ['/api/developer/turns', '/api/developer/turn-context'].includes(path)) {
      if ((req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)
        || ['cross-site', 'same-site'].includes(req.headers['sec-fetch-site'])) {
        return json(403, { code: 'INVALID_ORIGIN', error: '不接受跨站请求。' });
      }
      if (req.headers['x-manosaba-token'] !== token) return json(403, { code: 'INVALID_TOKEN', error: '页面凭据已失效，请刷新。' });
      if (diagnostics.view().developerMode !== true) return json(403, { code: 'DEVELOPER_MODE_DISABLED', error: '请先明确开启开发人员模式。' });
      if (path === '/api/developer/turn-context') {
        if (process.env.MANOSABA_CONTEXT_INSPECTION !== '1') return json(403, { code: 'CONTEXT_INSPECTION_DISABLED', error: '完整上下文仅可由本机启动环境另行授权；普通调试模式不会开放。' });
        return json(200, engine.developerTurnContext());
      }
      return json(200, engine.developerTurns());
    }
    if (req.method === 'GET' && path === '/api/creation/catalog') return json(200, { ...creationCatalog(), attributeRules: ATTRIBUTE_RULES, attributes: ATTRIBUTES });
    if (req.method === 'GET' && path === '/api/creation/presets') return json(200, engine.listPlayerPresets());
    if (req.method !== 'POST' || !mutationRoutes.has(path)) return json(404, { error: '不存在的接口。' });
    const origin = req.headers.origin;
    if ((origin && origin !== `http://${req.headers.host}`) || ((runPolicyRoute || path.startsWith('/api/custom-abilities/')) && ['cross-site','same-site'].includes(req.headers['sec-fetch-site']))) return json(403, { code: 'INVALID_ORIGIN', error: '不接受跨站请求。' });
    if (req.headers['x-manosaba-token'] !== token) return json(403, { code: 'INVALID_TOKEN', error: '页面凭据已失效，请刷新。' });
    const contentType = req.headers['content-type'] ?? '';
    if (runPolicyRoute ? !/^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?\s*$/iu.test(contentType) : !contentType.startsWith('application/json'))
      return json(415, { code: 'INVALID_CONTENT_TYPE', error: '需要 JSON 请求。' });
    const bodyChunks = []; let size = 0;
    const limit = runPolicyRoute ? RUN_POLICY_BODY_BYTES : path.startsWith('/api/custom-abilities/') ? 131072 : path === '/api/player/avatar' ? MAX_AVATAR_BODY_BYTES : path === '/api/new-game' ? MAX_AVATAR_BODY_BYTES + 196608 : path === '/api/creation/presets/save' ? MAX_AVATAR_BODY_BYTES + 32768 : path === '/api/creation/complete' ? RELATIONSHIP_AUTHORING_LIMITS.httpBytes : path.startsWith('/api/settings/') || path.startsWith('/api/prompts/') ? 131072 : 16384;
    if (runPolicyRoute && Number(req.headers['content-length']) > limit)
      return json(413, { code: 'INVALID_BODY_SIZE', error: '请求过大。' });
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) { json(413, { code: 'INVALID_BODY_SIZE', error: '请求过大。' }); return; }
      bodyChunks.push(chunk);
    }
    const bodyBytes = Buffer.concat(bodyChunks);
    if (runPolicyRoute) {
      try { input = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bodyBytes)); }
      catch { return json(400, { code: 'INVALID_JSON', error: '请求必须是完整、合法 UTF-8 JSON。' }); }
      return json(200, engine.setRunPolicy(input));
    }
    if (path === '/api/creation/complete') {
      try { input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bodyBytes)); }
      catch { return json(400, { code: 'INVALID_CREATION', error: '补全请求必须是完整、合法 UTF-8 JSON，未调用模型。' }); }
    } else input = JSON.parse(bodyBytes.toString('utf8'));
    if (!input || typeof input !== 'object' || Array.isArray(input)) return json(400, { code: 'INVALID_BODY', error: '请求格式错误。' });
    if (path === '/api/custom-abilities/drafts/save') return json(200,engine.saveCustomAbilityDraft(input));
    if (path === '/api/custom-abilities/preset-draft/save') return json(200,engine.saveCharacterAbilityDraft(input));
    if (path === '/api/custom-abilities/compile') {
      if (authoringActive) return json(409, { code: 'STALE_CREATION', error: '已有一条作者补全或能力解释正在执行，请等待当前结果。' });
      authoringActive = true;
      try { return json(200, await engine.requestCustomAbilityCompilation(input)); }
      finally { authoringActive = false; }
    }
    if (path === '/api/custom-abilities/compile/status') return json(200,engine.customAbilityCompilationStatus(input));
    if (path === '/api/custom-abilities/confirm') return json(200,engine.confirmCustomAbilityDefinition(input));
    if (path === '/api/custom-abilities/new-game') return json(200,engine.newCustomAbilityGame(input));
    if (path === '/api/custom-abilities/current') {if(Object.keys(input).length) return json(400,{code:'INVALID_BODY',error:'无需提供角色事实。'}); return json(200,engine.customAbilityCapabilities());}
    if (path === '/api/custom-abilities/use') return json(200,engine.useCustomAbility(input));
    if (path === '/api/prompts/update') return json(200, engine.updatePrompt(input));
    if (path === '/api/options') return json(200, diagnostics.update(input));
    if (path === '/api/diagnostics/events') return json(200, diagnostics.clientEvents(input));
    if (path === '/api/settings/models') return json(200, await getSettings().fetchModels(input));
    if (path === '/api/settings/save') { getSettings().savePreset(input); return json(200, getSettings().view()); }
    if (path === '/api/settings/activate') { getSettings().activatePreset(input.id); return json(200, getSettings().view()); }
    if (path === '/api/settings/delete') { getSettings().deletePreset(input.id); return json(200, getSettings().view()); }
    if (path === '/api/creation/presets/read') return json(200, engine.readPlayerPreset(input));
    if (path === '/api/creation/presets/save') return json(200, engine.savePlayerPreset(input));
    if (path === '/api/creation/presets/delete') return json(200, engine.deletePlayerPreset(input));
    if (path === '/api/creation/complete') {
      // Reading the new finite v2 ceiling does not enlarge either old kind.
      if (input.kind !== 'relationships' && size > 32768) return json(413, { code: 'INVALID_BODY_SIZE', error: '原角色与开场补全请求仍限 32 KiB。' });
      if (!['character', 'opening', 'relationships'].includes(input.kind)) return json(400, { code: 'INVALID_CREATION', error: '不支持此补全类型，未调用模型。' });
      if (authoringActive) return json(409, { code: 'STALE_CREATION', error: '已有一条设定补全正在执行，请等待当前结果。' });
      authoringActive = true;
      try {
        if (input.kind === 'relationships') {
          const controller = new AbortController();
          const abort = () => controller.abort();
          req.once('aborted', abort); res.once('close', abort);
          if (req.aborted || res.destroyed) abort();
          const timer = setTimeout(abort, RELATIONSHIP_AUTHORING_LIMITS.wholeMs);
          try {
            const context = buildRelationshipAuthoringContext(input);
            const adapter = getSettings().createRelationshipAuthoringAdapter({
              timeoutMs: RELATIONSHIP_AUTHORING_LIMITS.adapterMs, behaviorPrompt: engine.setupAssistantPrompt(),
              onTraffic: (event, fields) => diagnostics.recordTraffic(event, fields) });
            // Exactly one adapter call. No old retry policy or story-slot claim.
            return json(200, await adapter(context, { signal: controller.signal }));
          } finally {
            clearTimeout(timer); req.removeListener('aborted', abort); res.removeListener('close', abort); abort();
          }
        }
        const adapter = getSettings().createAuthoringAdapter({ timeoutMs: 60000, behaviorPrompt: engine.authoringPrompt(),
          onTraffic: (event, fields) => diagnostics.recordTraffic(event, fields) });
        return json(200, await retryModelOperation(() => adapter(input)));
      }
      finally { authoringActive = false; }
    }
    if (path === '/api/dice/roll') return json(200, engine.rollDice(input));
    if (path === '/api/case-item-rules/activate') return json(200, engine.activateCaseItemRules(input));
    if (path === '/api/guard-rules/activate') return json(200, engine.activateGuardRules(input));
    if (path === '/api/ability-rules/activate') return json(200, engine.activateAbilityRules(input));
    if (path === '/api/magic/activate') return json(200, engine.activateMagic(input));
    if (path === '/api/magic/cast') return json(200, engine.castMagic(input));
    if (path === '/api/new-game') {
      if (input.exampleId !== undefined && input.exampleId !== 'agent') return json(400, { code: 'INVALID_EXAMPLE', error: '发行版仅支持正式 LLM 游戏。' });
      return json(200, engine.newGame({ ...input, exampleId: 'agent' }));
    }
    if (path === '/api/player/avatar') return json(200, engine.updatePlayerAvatar(input));
    if (path === '/api/act') {
      // Explicit public intent is metadata, not a fifth legacy act DTO field.
      const parent = req.headers['x-manosaba-new-attempt-of'];
      const agentExample = engine.isAgentExample();
      if (Object.hasOwn(input, 'newAttemptOf') || (parent !== undefined && (typeof parent !== 'string'
        || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(parent)
        || Object.keys(input).some(key => !['requestId', 'text', 'expectedGeneration', 'expectedRevision'].includes(key))
        || !agentExample))) throw Object.assign(new Error('新尝试必须明确关联当前失败的普通行动。'), { code: 'INVALID_NEW_ATTEMPT' });
      const actionInput = parent === undefined ? input : { ...input, newAttemptOf: parent };
      const receipt = agentExample ? await llmRunner.act(actionInput) : engine.act(actionInput);
      return json(200, { ...receipt, currentView: engine.httpPlayerView() });
    }
    // Compatibility for an already-open old client. Original public dossiers
    // and current branch events need no model and never incur a summary charge.
    if (path === '/api/profiles/summarize') return json(200, {
      ...engine.httpPlayerView(),
      profileSummaryDirty: false,
    });
    if (path === '/api/case-execution') {
      if (Object.keys(input).some(key => !['requestId', 'verdictId', 'expectedGeneration', 'expectedRevision'].includes(key))) return json(400, { code: 'INVALID_CASE_EXECUTION', error: '执行确认只能包含请求编号、判决编号和当前版本。' });
      const receipt = await engine.confirmCaseExecution(input);
      return json(200, { ...receipt, currentView: engine.httpPlayerView() });
    }
    if (path === '/api/regenerate') {
      const receipt = await llmRunner.regenerate(input);
      return json(200, { ...receipt, currentView: engine.httpPlayerView() });
    }
    if (path === '/api/rewind') return json(200, engine.rewind(input));
    if (path === '/api/save') {
      if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80) return json(400, { code: 'INVALID_SAVE_NAME', error: '存档名称需为 1—80 字。' });
      const savedSlot = engine.save(input.name.trim(), { saveId: input.saveId, expectedSaveVersion: input.expectedSaveVersion,
        expectedGeneration: input.expectedGeneration, expectedRevision: input.expectedRevision });
      return json(200, { ...engine.view(), savedSlot });
    }
    if (path === '/api/saves/rename') {
      if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80) return json(400, { code: 'INVALID_SAVE_NAME', error: '存档名称需为 1—80 字。' });
      const savedSlot = engine.renameSave(input.saveId, input.name.trim(), { expectedSaveVersion: input.expectedSaveVersion });
      return json(200, { ...engine.view(), savedSlot });
    }
    if (path === '/api/saves/delete') {
      const deletedSlot = engine.deleteSave(input.saveId, { expectedSaveVersion: input.expectedSaveVersion });
      return json(200, { ...engine.view(), deletedSlot });
    }
    if (typeof input.saveId !== 'string') return json(400, { code: 'INVALID_SAVE', error: '请选择存档。' });
    return json(200, engine.load(input.saveId));
  } catch (error) {
    if (runPolicyRoute) {
      const caught = modelErrorCode(error);
      const code = caught === 'IDEMPOTENCY_CONFLICT' ? 'RUN_POLICY_REQUEST_CONFLICT' : caught;
      if (typeof code === 'string' && Object.hasOwn(RUN_POLICY_ERROR_STATUS, code)) return json(RUN_POLICY_ERROR_STATUS[code], { code, error: runPolicyErrors[code] });
      console.error(`Manosaba operation failed [${correlationId}]`);
      return json(500, { code: 'INTERNAL_ERROR', error: '本局设置暂不可用，请稍后重试。' });
    }
    // Developer reads must never echo sensitive state, repository diagnostics
    // or provider details through the generic error handling below.
    if (['INITIAL_POLICY_CONFLICT', 'INITIAL_POLICY_CLARIFICATION'].includes(error.code))
      return json(409, { accepted: false, code: error.code, error: error.message });
    if (path === '/api/agent-progress' || path.startsWith('/api/agent-progress?')) return json(error.code === 'INVALID_AGENT_PROGRESS' ? 400 : 503,
      { code: error.code === 'INVALID_AGENT_PROGRESS' ? 'INVALID_AGENT_PROGRESS' : 'AGENT_PROGRESS_UNAVAILABLE', error: '进度资料暂不可用，请确认游标后手动刷新。' });
    if (path === '/api/developer/actors') return json(503, { code: 'DEVELOPER_VIEW_UNAVAILABLE', error: '角色观察资料暂不可用，请稍后手动刷新。' });
    if (path === '/api/developer/turns' || path === '/api/developer/turn-context') return json(503, { code: 'DEVELOPER_VIEW_UNAVAILABLE', error: '回合追踪资料暂不可用，请稍后手动刷新。' });
    // 错误只传达固定枚举与消息，不向网页泄露数据库路径或内部堆栈。
    if (path === '/api/magic' || path === '/api/magic/activate' || path === '/api/magic/cast') {
      const conflict = ['STALE_GENERATION', 'STALE_REVISION', 'IDEMPOTENCY_CONFLICT'].includes(error.code);
      const fixed = conflict ? error.code : ['INVALID_ABILITY_REQUEST', 'INVALID_ABILITY_PENDING', 'INVALID_ABILITY_GRANT', 'INVALID_REQUEST_ID'].includes(error.code)
        ? error.code : error.code === 'MAGIC_HOST_RULE_GATED' ? 'MAGIC_HOST_RULE_GATED' : 'INVALID_ABILITY_STATE';
      return json(conflict ? 409 : 400, { code: fixed,
        error: '魔法操作未完成；绑定策略、目标见闻、当前版本或共享世界消费层尚不满足。当前进度未被此请求修改。' });
    }
    if(path?.startsWith('/api/custom-abilities/')) {
      const code=typeof error.code==='string' && /^(?:CUSTOM_ABILITY_[A-Z_]+|CUSTOM_COMPILER_UNAVAILABLE|STALE_GENERATION|STALE_REVISION|IDEMPOTENCY_CONFLICT|INVALID_[A-Z_]+)$/u.test(error.code)?error.code:'INVALID_CUSTOM_ABILITY';
      const conflict=/STALE|CONFLICT/u.test(code), unavailable=/UNAVAILABLE|NOT_READY|PROFILE_UNSUPPORTED/u.test(code);
      return json(conflict?409:unavailable?503:400,{code,error:'自定义能力操作未完成；请核对草稿、确认版本或当前支持配置。未发布未完成效果。'});
    }
    const failure = safeOperationFailure(error, path);
    const publicFailure = failure && traceFailure({
      ...(llmTurnFailure(error) ? { phase: failure.stage === 'configuration' ? 'configuration' : 'host_validation' } : {}),
      ...failure,
    }, { developer: false });
    const failureFields = publicFailure && Object.keys(publicFailure).length ? { failure: publicFailure } : {};
    if (path?.startsWith('/api/settings')) {
      if (error.code === 'SETTINGS_READ_ONLY') return json(400, { code: 'SETTINGS_READ_ONLY', error: '模型配置以只读方式打开，不能保存、激活或删除预设。' });
      if (error.code === 'SETTINGS_UNAVAILABLE') return json(503, { code: 'SETTINGS_UNAVAILABLE', error: '本机模型配置暂不可用，请修复配置后重试。' });
      const gateway = modelGatewayDiagnostic(error);
      return json(400, { ...(gateway ? { code: gateway.code } : {}), ...failureFields,
        error: '节点配置或模型列表请求失败，请检查地址、协议、模型分配和凭据后手动重试。' }, failure);
    }
    if (path === '/api/creation/complete' && modelGatewayDiagnostic(error)) return json(503, {
      code: modelGatewayDiagnostic(error).code, ...failureFields,
      error: '设定补全未完成：模型请求、格式校验或超时失败。当前角色草稿、加点和游戏进度均未修改；请检查模型设置后手动重试。' }, failure);
    if (path === '/api/profiles/summarize' && modelGatewayDiagnostic(error)) return json(503, {
      code: modelGatewayDiagnostic(error).code, ...failureFields,
      error: '人物资料整理未完成：模型请求、格式校验或超时失败。现有图鉴、对白记录和游戏进度均未修改；请检查模型设置后手动重试。' });
    const llmErrors = {
      LLM_NOT_CONFIGURED: '尚未激活有效模型预设，或缺少当前意图解析、玩家演绎、角色回应或旁白任务的模型分配。请在 Options 中配置后重试原行动。',
      SETTINGS_UNAVAILABLE: '本机模型配置暂不可用，请修复配置后重试原发言。',
      ERR_LLM_TURN_FAILED: '本轮模型请求或结构校验未完成。已成功的子任务被保留；请重试原发言。没有发布候选台词。',
      AGENT_TIMEOUT: '模型请求超时。已成功的子任务被保留；请重试原发言。',
      AGENT_BATCH_CANCELLED: '本轮角色任务已取消，没有发布候选台词。',
      LLM_REQUIRED: '此场景必须使用正式 LLM 入口，不能用离线台词替代。',
    };
    if (Object.hasOwn(llmErrors, error.code)) {
      const message = turnFailureMessage(publicFailure) || llmErrors[error.code];
      return json(503, { code: error.code, ...failureFields, ...(error.actionOutcome ? { actionOutcome: error.actionOutcome } : {}), error: path === '/api/regenerate'
        ? `${message} 重新生成未完成，原正文与进度保持不变；原请求编号已保留。请通过原楼层的重新生成按钮确认后手动续接，页面不会自动再次提交。`
        : message,
        currentView: engine.httpPlayerView() }, failure);
    }
    const conflicts = new Set(['STALE_GENERATION', 'STALE_REVISION', 'STALE_SAVE', 'STALE_PRESET', 'STALE_PROMPT', 'IDEMPOTENCY_CONFLICT', 'STALE_AGENT_TURN']);
    const safeCode = typeof error.code === 'string' && /^(INVALID_[A-Z_]+|STALE_[A-Z_]+|UNSUPPORTED_[A-Z_]+|OPTIONS_[A-Z_]+|IDEMPOTENCY_CONFLICT|SAVE_NOT_FOUND|PRESET_NOT_FOUND|SOURCE_VERSION_MISMATCH|CUSTOM_COMPLETED|GUARD_REACTION_PENDING|GUARD_DETAINED|GUARD_DETENTION_RESUME_REQUIRED|GUARD_DETENTION_NOT_DUE|GUARD_DETENTION_NOT_WAITING|GUARD_CASE_BOUNDARY|GUARD_RULES_UNSUPPORTED|GUARD_RULES_ALREADY_ACTIVE|GUARD_RULES_DISABLED)$/u.test(error.code);
    if (safeCode) return json(conflicts.has(error.code) ? 409 : ['SAVE_NOT_FOUND', 'PRESET_NOT_FOUND'].includes(error.code) ? 404 : error.code === 'OPTIONS_WRITE_FAILED' ? 500 : 400, { code: error.code, error: error.message });
    // Raw error messages can include input, filesystem paths or credentials.
    console.error(`Manosaba operation failed [${correlationId}]`);
    return json(error instanceof SyntaxError ? 400 : 500, { code: error instanceof SyntaxError ? 'INVALID_JSON' : 'INTERNAL_ERROR', error: '操作未完成，请检查输入或稍后重试。当前进度未被此失败请求修改。' });
  }
});
if (isolatedReadIngress) ingress = new LocalQueryIngress({ backend, dbPath, port, key: ingressKey });
 const server = ingress ?? backend;
 const started = () => {
   diagnostics.record('server.start');
  deliveryWorker.notify();
  console.log(`魔法少女的魔女裁判：高墙之内 ${llmEdition ? 'P0.3 正式 LLM 测试' : '旧版原型／序章验证'}：http://127.0.0.1:${server.address().port}\n本地数据目录：${dataDir}\n操作日志目录：${diagnostics.view().logDirectory}\n${llmEdition ? '自然行动、人设演绎与场景旁白会调用已配置模型，可能产生费用；实际移动与开锁由受限宿主规则结算。' : '旧版规则场景不调用模型。'}Ctrl+C 停止。`);
 };
 if (ingress) { ingress.once('listening', started); ingress.start(); }
 else backend.listen(port, '127.0.0.1', started);
 let closing;
 function close() {
   if (closing) return closing;
   process.removeListener('SIGINT', shutdown); process.removeListener('SIGTERM', shutdown);
   llmRunner.close(); deliveryWorker.close();
   closing = (async () => {
     try {
       if (ingress) await ingress.close();
       else await new Promise(done => backend.close(done));
       diagnostics.record('server.stop');
     } finally { engine.close(); }
   })();
   return closing;
 }
 function shutdown() { void close().then(() => process.exit(0), () => process.exit(1)); }
 process.on('SIGINT', shutdown);
 process.on('SIGTERM', shutdown);
 return { server, close };
}
// The shipped launcher inherits the explicit server-process opt-in. It is not
// a player/HTTP selector and cannot affect the revision on any existing save.
export function resolveLocalServerLaunchOptions(env = process.env) {
 const revision = env.MANOSABA_CREATION_RUNTIME_REVISION;
  const release = env.MANOSABA_LOCAL_RELEASE_PROFILE;
  if (release !== undefined) {
    // This selects the named local package for new creation only. Persisted
    // saves/pending jobs still supply their own pinned execution revisions.
    if (release !== 'local0.1.0' || env.MANOSABA_EDITION !== 'llm' || revision !== undefined)
      throw new TypeError('Invalid MANOSABA_LOCAL_RELEASE_PROFILE');
    const settings = env.MANOSABA_MODEL_SETTINGS_READONLY_DIR;
    if (settings !== undefined && (typeof settings !== 'string' || !isAbsolute(settings)
        || typeof env.MANOSABA_DATA_DIR !== 'string' || !env.MANOSABA_DATA_DIR.trim())) {
      throw new TypeError('Read-only model settings require an absolute settings directory and explicit MANOSABA_DATA_DIR.');
    }
    return { creationRuntimeRevision: EVENT_DIRECTOR_RUNTIME_REVISION, npcManualRecoveryVersion: 3,
      npcActPreflightVersion: 14, visualPerformanceGuidanceVersion: 3,
       ...(settings === undefined ? {} : { modelSettingsDirectory: settings, modelSettingsReadOnly: true }) };
  }
 if (revision === undefined) return {};
 if (revision !== ADMISSION_RUNTIME_REVISION) throw new TypeError('Invalid MANOSABA_CREATION_RUNTIME_REVISION');
 return { creationRuntimeRevision: revision };
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))startLocalServer(resolveLocalServerLaunchOptions());
