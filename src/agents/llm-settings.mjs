import fs from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isProxy } from 'node:util/types';

import { encryptSecret, decryptSecret } from '../host/secret-vault.mjs';
import { createModelAdapter, createServiceModelAdapter, createAuthoringModelAdapter, createRelationshipAuthoringModelAdapter, createAbilityCompilerModelAdapter, createProfileSummaryAdapter, normalizeModelEndpoint } from './model-gateway.mjs';
import { WORLD_SERVICE_PRINCIPAL } from './service-task-contract.mjs';
import { agentPacketForTransport } from './agent-boundaries.mjs';
import { narrativePacketForTransport } from './narrative-boundaries.mjs';
import { directorPacketForTransport } from '../director/director-effective-private-contract.mjs';
import { MODEL_PROTOCOL_CAPABILITIES } from './model-capabilities.mjs';

const SECURITY_NOTICE = 'API Key 使用 Windows DPAPI 加密保存，绑定当前 Windows 账户；不会通过配置页面接口回传。此加密不对同一用户身份运行的进程提供绝对保护，请妥善保护账户与本机。';
const READ_ONLY_LEGACY_NOTICE = '本次从旧格式只读载入，未迁移原件；密钥不会通过配置页面接口回传。原文件未在本次载入中加密，请妥善保护原文件与本机账户。';
const AGENTS = [
  ['default', '默认通用模型'],
  ['director', '导演'], ['intent_parser', '意图解析'], ['narrator', '旁白'],
  ['world_adjudicator', '宿主有限意图裁决'],
  ['player_performance', '玩家人设演绎'], ['character_dialogue', '统一角色对白'], ['character_data', '角色数据整理'],
  ['character_creator', '角色创建与开场补全'], ['setup_assistant', '独立开局关系助手'],
  ['emma', '艾玛'], ['hiro', '希罗'], ['anan', '安安'], ['noah', '诺亚'],
  ['leia', '蕾娅'], ['milia', '米莉亚'], ['margo', '玛格'], ['nanoka', '奈叶香'],
  ['alisa', '亚里沙'], ['sherry', '雪莉'], ['hanna', '汉娜'], ['coco', '可可'], ['meruru', '梅露露'], ['warden', '典狱长'],
].map(([id, label]) => ({ id, label }));
const AGENT_IDS = new Set(AGENTS.map(agent => agent.id));
const THINKING_LEVELS = new Set(['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']);
const CHARACTER_IDS = new Set(['emma', 'hiro', 'anan', 'noah', 'leia', 'milia', 'margo', 'nanoka', 'alisa', 'sherry', 'hanna', 'coco', 'meruru']);

/** Resolve explicit > character dialogue (characters only) > general default; never expose credentials. */
export function resolveAssignment(preset, agentId) {
  // Runtime scene composition shares the legacy narrator's assignment; it is
  // deliberately not a separate persisted/UI agent or character-dialogue role.
  if (agentId === 'scene_composer') agentId = 'narrator';
  if (!AGENT_IDS.has(agentId)) return null;
  const assignment = preset?.assignments?.[agentId]
    ?? (CHARACTER_IDS.has(agentId) ? preset?.assignments?.character_dialogue : undefined)
    ?? preset?.assignments?.default;
  return assignment ? { nodeId: assignment.nodeId, model: assignment.model,
    ...(assignment.thinkingLevel !== undefined ? { thinkingLevel: assignment.thinkingLevel } : {}) } : null;
}
/** Product default: DeepSeek-compatible models reason by default even when the
 * assignment omits a level. Keep that implicit choice explicit as `low`; an
 * assignment's `off`/`high`/etc. always wins, and non-DeepSeek models unchanged. */
function implicitThinkingLevel(assignment) {
  if (assignment.thinkingLevel !== undefined) return assignment.thinkingLevel;
  return /deepseek/iu.test(assignment.model) ? 'low' : undefined;
}
const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', endpoint: 'https://api.openai.com/v1', protocol: 'openai' },
  { id: 'deepseek', label: 'DeepSeek', endpoint: 'https://api.deepseek.com/v1', protocol: 'openai' },
  { id: 'openrouter', label: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1', protocol: 'openai' },
  { id: 'google', label: 'Google（OpenAI 兼容）', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai', protocol: 'openai' },
  { id: 'ollama', label: 'Ollama（本机）', endpoint: 'http://localhost:11434/v1', protocol: 'openai' },
  { id: 'lmstudio', label: 'LM Studio（本机）', endpoint: 'http://localhost:1234/v1', protocol: 'openai' },
  { id: 'anthropic', label: 'Anthropic', endpoint: 'https://api.anthropic.com/v1', protocol: 'anthropic' },
];
const MAX_BYTES = 1024 * 1024;
const fail = message => { throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function fields(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) fail('配置格式不正确，或包含不支持的字段。');
}
function text(value, label, max = 80) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) fail(`${label}格式或长度不正确。`);
  return value.trim();
}
function identifier(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/u.test(value)) fail('配置 ID 格式不正确。');
  return value;
}
function protocolValue(value) {
  if (value !== 'openai' && value !== 'anthropic') fail('不支持的模型接口协议。');
  return value;
}
function keyValue(value) {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || value.length > 8192 || /[\u0000-\u001f\u007f]/u.test(value)) fail('API Key 格式或长度不正确。');
  return value.trim();
}
function normalizeEndpoint(value) {
  // Discovery, saved-key binding and inference MUST use one normalization;
  // otherwise an accepted edit could unexpectedly change the credential target.
  try { return normalizeModelEndpoint(value); }
  catch { fail('接口地址无效：远程接口必须使用 HTTPS，HTTP 仅允许回环地址；不能包含用户凭据、查询参数或片段。'); }
}
function normalizePreset(input, previous) {
  fields(input, ['id', 'name', 'nodes', 'assignments']);
  const id = input.id === undefined ? randomUUID() : identifier(input.id);
  const name = text(input.name, '预设名称');
  if (!Array.isArray(input.nodes) || input.nodes.length < 1 || input.nodes.length > 32) fail('每个预设需要 1—32 个节点。');
  const ids = new Set();
  const nodes = input.nodes.map(node => {
    fields(node, ['id', 'label', 'endpoint', 'protocol', 'key', 'clearKey', 'promptCaching']);
    const nodeId = identifier(node.id);
    if (ids.has(nodeId)) fail('同一预设中的节点 ID 不能重复。');
    ids.add(nodeId);
    if (node.clearKey !== undefined && typeof node.clearKey !== 'boolean') fail('清除 API Key 标记必须是布尔值。');
    const suppliedKey = keyValue(node.key);
    if (node.clearKey && suppliedKey) fail('清除 API Key 时不能同时提供新 Key。');
    const endpoint = normalizeEndpoint(node.endpoint);
    const protocol = protocolValue(node.protocol);
    if (Object.hasOwn(node, 'promptCaching') && typeof node.promptCaching !== 'boolean') fail('显式提示缓存标记必须是布尔值。');
    if (node.promptCaching === true && protocol !== 'anthropic') fail('显式提示缓存仅支持已确认兼容的 Anthropic 节点。');
    const oldNode = previous?.id === id ? previous.nodes.find(old => old.id === nodeId) : undefined;
    const oldKey = oldNode?.key || '';
    const sameTarget = oldNode?.endpoint === endpoint && oldNode?.protocol === protocol;
    // Saved keys belong to this preset/node AND its normalized endpoint/protocol.
    // Reject ambiguous edits before committing rather than silently moving or losing a key.
    if (oldKey && !sameTarget && !suppliedKey && !node.clearKey) fail('接口地址或协议已改变，请重新输入 API Key，或勾选“删除已保存密钥”后保存。');
    return { id: nodeId, label: text(node.label, '节点名称'), endpoint, protocol,
      ...(Object.hasOwn(node, 'promptCaching') ? { promptCaching: node.promptCaching } : {}),
      key: node.clearKey ? '' : suppliedKey || (sameTarget ? oldKey : '') };
  });
  if (!object(input.assignments)) fail('Agent 模型分配必须是对象。');
  const assignments = {};
  for (const [agentId, assignment] of Object.entries(input.assignments)) {
    if (!AGENT_IDS.has(agentId)) fail('存在不支持的 Agent。');
    fields(assignment, ['nodeId', 'model', 'thinkingLevel']);
    const nodeId = identifier(assignment.nodeId);
    if (!ids.has(nodeId)) fail('Agent 引用了不存在的节点。');
    if (assignment.thinkingLevel !== undefined && !THINKING_LEVELS.has(assignment.thinkingLevel)) fail('不支持的思考等级。');
    assignments[agentId] = { nodeId, model: text(assignment.model, '模型 ID', 256),
      ...(assignment.thinkingLevel !== undefined ? { thinkingLevel: assignment.thinkingLevel } : {}) };
  }
  return { id, name, nodes, assignments };
}

/** Local-only model configuration, independent of game saves and SQLite.
 * savePreset({ id?, name, nodes, assignments }) replaces the complete preset.
 * Mutations return view(); blank/omitted keys retain the same preset/node key
 * only while its normalized endpoint and protocol are unchanged.
 * Model discovery performs only GET /models and never sends game/world text.
 * Host-only { readOnly: true } borrows an existing v1/v2 document through this
 * same parser/factory, with no mkdir, migration or configuration submissions.
 */
export class LlmSettings {
  #file;
  #readOnly;
  #securityNotice = SECURITY_NOTICE;
  #state = { version: 2, presets: [], activePresetId: null };

  constructor(dataDir, options = {}) {
    // Host-only opening policy; never selected by a preset or browser payload.
    // Reject unsupported keys/accessors before any directory initialization.
    if (!object(options) || isProxy(options) || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
      || Reflect.ownKeys(options).some(key => key !== 'readOnly'
        || !Object.hasOwn(Object.getOwnPropertyDescriptor(options, key), 'value'))
      || (Object.hasOwn(options, 'readOnly') && typeof options.readOnly !== 'boolean')) throw new TypeError('Invalid model settings options');
    this.#readOnly = Object.hasOwn(options, 'readOnly') ? options.readOnly : false;
    this.#file = join(resolve(dataDir), 'llm-settings.json');
    try {
      if (!this.#readOnly) fs.mkdirSync(resolve(dataDir), { recursive: true });
      if (!fs.existsSync(this.#file)) {
        if (this.#readOnly) fail('只读模式需要已存在的模型配置文件。');
        return;
      }
      if (fs.statSync(this.#file).size > 8 * MAX_BYTES) fail('本机模型配置文件过大。');
      const saved = JSON.parse(fs.readFileSync(this.#file, 'utf8'));
      fields(saved, ['version', 'presets', 'activePresetId', 'securityNotice']);
      if (![1, 2].includes(saved.version) || !Array.isArray(saved.presets) || saved.presets.length > 100) fail('不支持的配置文件格式。');
      const presets = saved.presets.map(preset => {
        fields(preset, ['id', 'name', 'nodes', 'assignments']);
        identifier(preset.id);
        if (!Array.isArray(preset.nodes)) fail('节点格式不正确。');
        const nodes = preset.nodes.map(node => {
          fields(node, ['id', 'label', 'endpoint', 'protocol', 'promptCaching', saved.version === 1 ? 'key' : 'keyCipher']);
          if (saved.version === 1) return node;
          return { id: node.id, label: node.label, endpoint: node.endpoint, protocol: node.protocol,
            ...(Object.hasOwn(node, 'promptCaching') ? { promptCaching: node.promptCaching } : {}),
            key: decryptSecret(node.keyCipher) };
        });
        return normalizePreset({ ...preset, nodes });
      });
      if (new Set(presets.map(preset => preset.id)).size !== presets.length) fail('预设 ID 不能重复。');
      if (saved.activePresetId !== null && !presets.some(preset => preset.id === saved.activePresetId)) fail('当前预设不存在。');
      const next = { version: 2, presets, activePresetId: saved.activePresetId };
      // Validate the entire legacy document first. Migration uses the same atomic
      // replacement as regular saves, with no plaintext temporary file or backup.
      if (saved.version === 1 && !this.#readOnly) this.#commit(next);
      else {
        this.#state = next;
        if (saved.version === 1) this.#securityNotice = READ_ONLY_LEGACY_NOTICE;
      }
    } catch { fail('无法读取本机模型配置，请检查配置文件及目录权限。'); }
  }

  view() {
    return {
      providers: structuredClone(PROVIDERS), agents: structuredClone(AGENTS),
      protocolCapabilities: structuredClone(MODEL_PROTOCOL_CAPABILITIES),
      presets: this.#state.presets.map(preset => ({
        id: preset.id, name: preset.name,
        nodes: preset.nodes.map(({ key, ...node }) => ({ ...node, hasKey: Boolean(key) })),
        assignments: structuredClone(preset.assignments),
      })),
      activePresetId: this.#state.activePresetId,
      securityNotice: this.#securityNotice,
    };
  }

  #commit(next) {
    // All save/activate/delete paths converge here, before encryption, temp
    // creation or the in-memory state swap. Read-only still permits factories.
    if (this.#readOnly) throw Object.assign(new Error('模型配置以只读方式打开，不能保存、激活或删除预设。'), { code: 'SETTINGS_READ_ONLY' });
    const temporary = `${this.#file}.${randomUUID()}.tmp`;
    let fd;
    try {
      const disk = { ...next, version: 2, presets: next.presets.map(preset => ({
        ...preset, nodes: preset.nodes.map(({ key, ...node }) => ({ ...node, keyCipher: encryptSecret(key) })),
      })), securityNotice: SECURITY_NOTICE };
      const serialized = JSON.stringify(disk, null, 2);
      if (Buffer.byteLength(serialized) > 8 * MAX_BYTES) fail('模型配置总大小超过限制。');
      fd = fs.openSync(temporary, 'wx', 0o600);
      fs.writeFileSync(fd, serialized, 'utf8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = undefined;
      fs.renameSync(temporary, this.#file);
    } catch {
      if (fd !== undefined) { try { fs.closeSync(fd); } catch {} }
      try { fs.unlinkSync(temporary); } catch {}
      fail('无法保存本机模型配置，原配置未更改。请检查目录权限。');
    }
    this.#state = next;
    return this.view();
  }

  savePreset(input) {
    const previous = object(input) ? this.#state.presets.find(preset => preset.id === input.id) : undefined;
    const preset = normalizePreset(input, previous);
    const presets = this.#state.presets.filter(item => item.id !== preset.id);
    if (presets.length >= 100) fail('最多保存 100 个模型预设。');
    const index = this.#state.presets.findIndex(item => item.id === preset.id);
    presets.splice(index < 0 ? presets.length : index, 0, preset);
    return this.#commit({ ...this.#state, presets });
  }

  activatePreset(id) {
    identifier(id);
    if (!this.#state.presets.some(preset => preset.id === id)) fail('要激活的模型预设不存在。');
    return this.#commit({ ...this.#state, activePresetId: id });
  }

  deletePreset(id) {
    identifier(id);
    if (!this.#state.presets.some(preset => preset.id === id)) fail('要删除的模型预设不存在。');
    return this.#commit({ ...this.#state, presets: this.#state.presets.filter(preset => preset.id !== id), activePresetId: this.#state.activePresetId === id ? null : this.#state.activePresetId });
  }

  /** Host-only adapter factory. Credentials never leave this closure or become
   * browser JSON. Capture one explicit active assignment for the entire probe;
   * settings edits during a request cannot retarget an already-bound key. */
  createAdapter(agentId, options = {}) {
    if (agentId === 'world_adjudicator' || agentId === 'setup_assistant') throw Object.assign(new Error('请通过固定宿主服务工厂创建此任务。'), { code: 'SERVICE_UNAVAILABLE' });
    if (!object(options) || isProxy(options) || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
      || Reflect.ownKeys(options).some(key => !['timeoutMs', 'fetchImpl', 'behaviorPrompt', 'onTraffic'].includes(key)
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(options, key), 'value'))) fail('模型运行选项不正确。');
    const preset = this.#state.presets.find(item => item.id === this.#state.activePresetId);
    const assignment = typeof agentId === 'string' ? resolveAssignment(preset, agentId) : null;
    const node = preset?.nodes.find(item => item.id === assignment?.nodeId);
    if (!assignment || !node) throw Object.assign(new Error('尚未激活有效预设或没有为此角色任务分配模型。'), { code: 'LLM_NOT_CONFIGURED' });
    const thinkingLevel = implicitThinkingLevel(assignment);
    const adapter = createModelAdapter({ ...options, endpoint: node.endpoint, protocol: node.protocol,
      model: assignment.model, key: node.key, ...(thinkingLevel !== undefined ? { thinkingLevel } : {}),
      ...(node.promptCaching === true ? { promptCaching: true } : {}) });
    return async (packet, callOptions) => adapter(packet?.role === 'director' ? directorPacketForTransport(packet)
      : ['intent_parser', 'player_performance', 'narrator', 'scene_composer'].includes(packet?.role)
        ? narrativePacketForTransport(packet) : agentPacketForTransport(packet), callOptions);
  }

  /** Fixed Host service, not an actor or a legacy narrative adapter. Capture one
   * assignment/key; omitted thinking means off only here, never implicit low. */
  createServiceAdapter(servicePrincipal, options = {}) {
    if (servicePrincipal !== WORLD_SERVICE_PRINCIPAL) throw Object.assign(new Error('此宿主服务尚未开放。'), { code: 'SERVICE_UNAVAILABLE' });
    if (isProxy(options) || !object(options) || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
      || Reflect.ownKeys(options).some(key => !['timeoutMs', 'fetchImpl', 'behaviorPrompt', 'onTraffic', 'servicePurpose'].includes(key)
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(options, key), 'value'))) fail('模型运行选项不正确。');
    const { servicePurpose, ...transportOptions } = options;
    if (servicePurpose !== undefined && !['intent-plan@2', 'intent-plan@3', 'ordinary-attempt@1'].includes(servicePurpose)) fail('服务用途不正确。');
    const preset = this.#state.presets.find(item => item.id === this.#state.activePresetId);
    const assignment = resolveAssignment(preset, 'world_adjudicator');
    const node = preset?.nodes.find(item => item.id === assignment?.nodeId);
    if (!assignment || !node) throw Object.assign(new Error('尚未激活有效预设或没有为此宿主服务分配模型。'), { code: 'LLM_NOT_CONFIGURED' });
    // Pass explicit non-off through to the fixed codec's configuration guard.
    // Never erase it from the saved preset or silently replace it with off.
    return createServiceModelAdapter({ ...transportOptions, endpoint: node.endpoint, protocol: node.protocol,
      model: assignment.model, key: node.key, thinkingLevel: assignment.thinkingLevel ?? 'off',
      ...(node.promptCaching === true ? { promptCaching: true } : {}) }, 'world_adjudicator', servicePurpose);
  }

  /** Creator-only host policy: explicit creator assignment, then general default.
   * The request supplies author data only; target, model and key are captured
   * here from the active encrypted preset, never from browser/request fields. */
  createAuthoringAdapter(options = {}) {
    if (isProxy(options) || !object(options) || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
      || Reflect.ownKeys(options).some(key => !['timeoutMs', 'fetchImpl', 'behaviorPrompt', 'onTraffic'].includes(key)
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(options, key), 'value'))) fail('模型运行选项不正确。');
    const preset = this.#state.presets.find(item => item.id === this.#state.activePresetId);
    const assignment = resolveAssignment(preset, 'character_creator');
    const node = preset?.nodes.find(item => item.id === assignment?.nodeId);
    if (!assignment || !node) throw Object.assign(new Error('尚未激活有效预设或没有为角色创建分配模型。'), { code: 'LLM_NOT_CONFIGURED' });
    const thinkingLevel = implicitThinkingLevel(assignment);
    return createAuthoringModelAdapter({ ...options, endpoint: node.endpoint, protocol: node.protocol,
      model: assignment.model, key: node.key, ...(thinkingLevel !== undefined ? { thinkingLevel } : {}),
      ...(node.promptCaching === true ? { promptCaching: true } : {}) });
  }

  /** Independent setup assignment -> default. Creator/dialogue/data are never
   * consulted. The caller supplies a Host-minted draft context, not world data. */
  createRelationshipAuthoringAdapter(options = {}) {
    if (isProxy(options) || !object(options) || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
      || Reflect.ownKeys(options).some(key => !['timeoutMs', 'fetchImpl', 'behaviorPrompt', 'onTraffic'].includes(key)
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(options, key), 'value'))) fail('模型运行选项不正确。');
    const preset = this.#state.presets.find(item => item.id === this.#state.activePresetId);
    const assignment = resolveAssignment(preset, 'setup_assistant');
    const node = preset?.nodes.find(item => item.id === assignment?.nodeId);
    if (!assignment || !node) throw Object.assign(new Error('尚未激活有效预设或没有为独立关系助手分配模型。'), { code: 'LLM_NOT_CONFIGURED' });
    const thinkingLevel = implicitThinkingLevel(assignment);
    return createRelationshipAuthoringModelAdapter({ ...options, endpoint: node.endpoint, protocol: node.protocol,
      model: assignment.model, key: node.key, ...(thinkingLevel !== undefined ? { thinkingLevel } : {}),
      ...(node.promptCaching === true ? { promptCaching: true } : {}) });
  }

  /** Display-only encyclopedia batch. Reuses the existing character_data
   * assignment/default; no new browser-visible role or credential surface. */
  createProfileSummaryAdapter(options = {}) {
    if (isProxy(options) || !object(options) || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
      || Reflect.ownKeys(options).some(key => !['timeoutMs', 'fetchImpl', 'behaviorPrompt', 'onTraffic'].includes(key)
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(options, key), 'value'))) fail('模型运行选项不正确。');
    const preset = this.#state.presets.find(item => item.id === this.#state.activePresetId);
    const assignment = resolveAssignment(preset, 'character_data');
    const node = preset?.nodes.find(item => item.id === assignment?.nodeId);
    if (!assignment || !node) throw Object.assign(new Error('尚未激活有效预设或没有为人物资料整理分配模型。'), { code: 'LLM_NOT_CONFIGURED' });
    const thinkingLevel = implicitThinkingLevel(assignment);
    return createProfileSummaryAdapter({ ...options, endpoint: node.endpoint, protocol: node.protocol,
      model: assignment.model, key: node.key, ...(thinkingLevel !== undefined ? { thinkingLevel } : {}),
      ...(node.promptCaching === true ? { promptCaching: true } : {}) });
  }

  createAbilityCompilerAdapter(options = {}) {
    if (isProxy(options) || !object(options) || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
      || Reflect.ownKeys(options).some(key => !['timeoutMs', 'fetchImpl', 'behaviorPrompt', 'onTraffic'].includes(key)
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(options, key), 'value'))) fail('模型运行选项不正确。');
    const preset = this.#state.presets.find(item => item.id === this.#state.activePresetId);
    const assignment = resolveAssignment(preset, 'character_creator');
    const node = preset?.nodes.find(item => item.id === assignment?.nodeId);
    if (!assignment || !node) throw Object.assign(new Error('尚未激活有效预设或没有为能力解释分配模型。'), { code: 'LLM_NOT_CONFIGURED' });
    const thinkingLevel = implicitThinkingLevel(assignment);
    return createAbilityCompilerModelAdapter({ ...options, endpoint: node.endpoint, protocol: node.protocol,
      model: assignment.model, key: node.key, ...(thinkingLevel !== undefined ? { thinkingLevel } : {}),
      ...(node.promptCaching === true ? { promptCaching: true } : {}) });
  }

  async fetchModels(input) {
    fields(input, ['endpoint', 'protocol', 'key', 'presetId', 'nodeId']);
    const endpoint = normalizeEndpoint(input.endpoint);
    const protocol = protocolValue(input.protocol);
    let key = keyValue(input.key);
    if (input.presetId !== undefined || input.nodeId !== undefined) {
      const presetId = identifier(input.presetId);
      const nodeId = identifier(input.nodeId);
      const node = this.#state.presets.find(preset => preset.id === presetId)?.nodes.find(item => item.id === nodeId);
      if (!node) fail('指定的模型预设或节点不存在。');
      // A saved credential must never be forwarded to an edited, unrelated origin/path.
      if (!key) {
        if (node.endpoint !== endpoint || node.protocol !== protocol) fail('接口地址或协议已改变，请重新输入 API Key，或清除已保存密钥并保存后重试。');
        key = node.key;
      }
    }
    if (protocol === 'anthropic' && !key) fail('Anthropic 模型列表需要 API Key。');
    const headers = { Accept: 'application/json' };
    if (protocol === 'anthropic') {
      headers['x-api-key'] = key;
      headers['anthropic-version'] = '2023-06-01';
    } else if (key) headers.Authorization = `Bearer ${key}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let reader;
    try {
      const response = await fetch(`${endpoint}/models`, { method: 'GET', headers, redirect: 'error', signal: controller.signal });
      if (!response.ok) fail('模型服务返回错误。');
      if (!/^application\/json(?:\s*;|\s*$)/iu.test(response.headers.get('content-type') || '')) fail('模型服务未返回 JSON。');
      const contentLength = response.headers.get('content-length');
      if (contentLength && (!/^\d+$/u.test(contentLength) || Number(contentLength) > MAX_BYTES)) fail('模型列表响应过大。');
      if (!response.body) fail('模型列表为空。');
      reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) fail('模型列表响应过大。');
        chunks.push(value);
      }
      const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
      if (!object(payload) || !Array.isArray(payload.data) || payload.data.length > 2000) fail('模型列表格式不正确。');
      const unique = new Set();
      for (const model of payload.data) {
        if (!object(model)) fail('模型列表格式不正确。');
        const id = text(model.id, '模型 ID', 256);
        if (key && id.includes(key)) fail('模型列表包含敏感内容。');
        unique.add(id);
      }
      return { models: [...unique].map(id => ({ id })), endpoint };
    } catch {
      fail('无法拉取模型列表：请检查接口地址、凭据、服务响应和网络连接（超时 10 秒，最多 1 MB）。');
    } finally {
      clearTimeout(timer);
      controller.abort();
      if (reader) { try { await reader.cancel(); } catch {} }
    }
  }
}
