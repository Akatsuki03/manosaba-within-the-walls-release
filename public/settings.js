(() => {
  'use strict';

  // This module deliberately has no dependency on app.js or its API helpers.
  let dialog;
  let root;
  let view;
  let runtimeOptions = { directSendSuggestions: false, debug: false, developerMode: false, llmRetryCount: 3, directorMode: 'off', logDirectory: '', logAvailable: false };
  let token;
  let draft;
  let ui;
  let dirty = false;
  let busy = false;
  let opening = null;
  let sequence = 0;
  const modelCache = new Map();
  const characterIds = new Set(['emma', 'hiro', 'anan', 'noah', 'leia', 'milia', 'margo', 'nanoka', 'alisa', 'sherry', 'hanna', 'coco', 'meruru']);
  const promptFunctionIds = new Set(['director', 'intent_parser', 'player_performance', 'narrator', 'character_dialogue', 'character_data', 'character_creator', 'world_adjudicator', 'setup_assistant']);
  const promptDrafts = new Map();
  let promptCatalog = null;
  let promptSelection = 'character_dialogue';
  let promptOpen = false;
  let developerEpoch = 0;
  let developerPending = null;
  const TRACE_ROLES = new Set(['roleplay', 'character_data', 'intent_parser', 'world_adjudicator', 'player_performance', 'narrator', 'scene_composer', 'director']);
  const TRACE_STATUSES = new Set(['pending', 'running', 'failed', 'committed', 'cancelled', 'completed', 'ready', 'validated', 'accepted', 'rejected', 'failed_optional', 'skipped_optional']);
  const MAX_CONTEXT_BYTES = 256 * 1024;

  function inheritanceHint(agentId) {
    if (agentId === 'default') return '以保持未分配（无通用默认）';
    return characterIds.has(agentId) ? '以继承统一对白；对白未分配时回退默认通用模型' : '以回退默认通用模型（不继承统一对白）';
  }

  function element(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }

  function button(text, action, className = '') {
    const result = element('button', `ms-button ${className}`, text);
    result.type = 'button';
    result.addEventListener('click', action);
    return result;
  }

  function option(value, text) {
    const result = element('option', '', text);
    result.value = value;
    return result;
  }

  function input(type, value = '') {
    const result = element('input', 'ms-input');
    result.type = type;
    result.value = value;
    return result;
  }

  function field(label, control, hint) {
    const wrapper = element('div', 'ms-field');
    control.id = `ms-field-${++sequence}`;
    const caption = element('label', 'ms-label', label);
    caption.htmlFor = control.id;
    wrapper.append(caption, control);
    if (hint) {
      const note = element('small', 'ms-hint', hint);
      note.id = `${control.id}-hint`;
      control.setAttribute('aria-describedby', note.id);
      wrapper.append(note);
    }
    return wrapper;
  }

  function status(text, error = false) {
    if (!ui || !ui.status) return;
    ui.status.textContent = text;
    ui.status.classList.toggle('ms-error', error);
    ui.status.setAttribute('role', error ? 'alert' : 'status');
  }

  function apiError(responseStatus) {
    if (responseStatus === 401 || responseStatus === 403) return '验证失败，请关闭设置后重新打开再试。';
    if (responseStatus === 404) return '找不到设置或节点，请重新打开设置后再试。';
    if (responseStatus === 409) return '内容已被其他页面修改。草稿已保留，请刷新版本并核对后重试。';
    if (responseStatus === 429) return '请求过于频繁，请稍后重试。';
    if (responseStatus >= 500) return '后端请求失败，请检查服务或节点连接。';
    return '请求未成功，请检查节点地址、协议、密钥及输入内容。更改已有密钥节点的地址或协议后，请重新输入密钥，或勾选“删除已保存密钥”再保存。';
  }

  async function request(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const headers = { Accept: 'application/json' };
      if (body !== undefined) {
        if (!token) throw new Error('缺少安全令牌，请关闭设置后重新打开。');
        headers['Content-Type'] = 'application/json';
        headers['X-Manosaba-Token'] = token;
      }
      const response = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      // Never render server error bodies: upstream services may echo credentials.
      if (!response.ok) throw Object.assign(new Error(apiError(response.status)), { status: response.status });
      try {
        return await response.json();
      } catch {
        throw new Error('服务返回了无效数据，请稍后再试。');
      }
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('请求超时，请检查连接后重试。');
      if (error instanceof TypeError) throw new Error('网络连接失败，请检查本机后端是否运行。');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function settingsView(data) {
    if (!data || !Array.isArray(data.providers) || !Array.isArray(data.agents) || !Array.isArray(data.presets)) {
      throw new Error('设置数据格式不正确，请检查后端接口。');
    }
    return data;
  }

  function runtimeView(data) {
    const retry = Object.hasOwn(data || {}, 'llmRetryCount') ? data.llmRetryCount : 3;
    const directorMode = Object.hasOwn(data || {}, 'directorMode') ? data.directorMode : 'off';
    if (!['off', 'advisory'].includes(directorMode)) throw new Error('导演模式数据格式不正确，请检查后端接口。');
    if (!data || typeof data.directSendSuggestions !== 'boolean' || typeof data.debug !== 'boolean' ||
      (Object.hasOwn(data, 'developerMode') && typeof data.developerMode !== 'boolean') ||
      !Number.isSafeInteger(retry) || retry < 0 || retry > 10 ||
      typeof data.logDirectory !== 'string' || typeof data.logAvailable !== 'boolean') {
      throw new Error('操作设置数据格式不正确，请检查后端接口。');
    }
    // Only expose runtime preferences and log metadata, never model drafts or credentials.
    return {
      directSendSuggestions: data.directSendSuggestions,
      debug: data.debug,
      developerMode: Object.hasOwn(data, 'developerMode') ? data.developerMode : false,
      llmRetryCount: retry,
      directorMode,
      logDirectory: data.logDirectory,
      logAvailable: data.logAvailable,
    };
  }

  function announceRuntimeOptions(options = runtimeOptions) {
    window.dispatchEvent(new CustomEvent('manosaba-options-changed', { detail: { ...options } }));
  }

  function syncRuntimeControls() {
    if (!ui || !ui.runtime) return;
    ui.runtime.directSendSuggestions.checked = runtimeOptions.directSendSuggestions;
    ui.runtime.debug.checked = runtimeOptions.debug;
    ui.runtime.developerMode.checked = runtimeOptions.developerMode;
    if (ui.runtime.llmRetryCount) ui.runtime.llmRetryCount.value = String(runtimeOptions.llmRetryCount);
    if (ui.runtime.directorMode) ui.runtime.directorMode.value = runtimeOptions.directorMode;
    ui.runtime.logDirectory.textContent = runtimeOptions.logDirectory || '暂不可用';
    ui.runtime.logStatus.textContent = runtimeOptions.logAvailable ? '日志写入可用。' : '日志暂不可用，请检查本机日志目录的写入权限。';
    syncDeveloperInspection();
  }

  function saveRuntimeOption(name, value) {
    if (busy) { syncRuntimeControls(); return; }
    let published;
    if (name === 'developerMode' && value === false) {
      clearDeveloperInspection();
      // Hide and abort the story observer at the user's click, not after a
      // potentially slow disk/network save. Failed saves restore the committed
      // preference and require a fresh read rather than reviving private DOM.
      if (runtimeOptions.developerMode) {
        published = { ...runtimeOptions, developerMode: false };
        announceRuntimeOptions(published);
      }
    }
    return perform(async () => {
      status('正在保存操作设置…');
      try {
        runtimeOptions = runtimeView(await request('/api/options', { [name]: value }));
        syncRuntimeControls();
        if (!published || Object.keys(runtimeOptions).some(key => runtimeOptions[key] !== published[key])) announceRuntimeOptions();
        status('操作设置已保存，立即生效。');
      } catch (error) {
        syncRuntimeControls();
        if (published) announceRuntimeOptions();
        throw error;
      }
    });
  }

  function setBusy(value) {
    busy = value;
    if (ui && ui.controls) ui.controls.disabled = value;
    if (ui && ui.close) ui.close.disabled = value;
    if (root) root.setAttribute('aria-busy', String(value));
  }

  async function perform(action) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      status(error.message || '操作失败，请稍后重试。', true);
    } finally {
      setBusy(false);
    }
  }

  function newNode() {
    return {
      id: `node-${globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${++sequence}`}`,
      label: '', endpoint: '', protocol: 'openai', hasKey: false,
    };
  }

  function loadPreset(id) {
    modelCache.clear();
    const preset = view.presets.find(item => item.id === id);
    draft = preset ? {
      id: preset.id,
      name: preset.name || '',
      nodes: (preset.nodes || []).map(node => ({
        id: node.id, label: node.label || '', endpoint: node.endpoint || '',
        protocol: node.protocol === 'anthropic' ? 'anthropic' : 'openai', hasKey: Boolean(node.hasKey),
        ...(typeof node.promptCaching === 'boolean' ? { promptCaching: node.promptCaching } : {}),
      })),
      assignments: Object.fromEntries(view.agents.map(agent => {
        const assigned = preset.assignments && preset.assignments[agent.id];
        if (!assigned) return [agent.id, { nodeId: '', model: '' }];
        const row = { nodeId: assigned.nodeId || '', model: assigned.model || '' };
        if (typeof assigned.thinkingLevel === 'string') row.thinkingLevel = assigned.thinkingLevel;
        return [agent.id, row];
      })),
    } : { name: '', nodes: [newNode()], assignments: {} };
    dirty = false;
    render();
  }

  function discardAllowed() {
    return !dirty || window.confirm('尚有未保存的更改（包括输入的密钥）。确定放弃吗？');
  }

  function close() {
    if (busy) return;
    const hasPromptDrafts = [...promptDrafts.values()].some(item => item.dirty || item.conflict);
    if (hasPromptDrafts && !window.confirm('尚有未保存的提示词草稿，关闭后将放弃。确定关闭吗？')) return;
    if (discardAllowed()) dialog.close();
  }

  function nodeName(node, index) {
    return node.label.trim() || `节点 ${index + 1}`;
  }

  function cacheEntry(node) {
    const cached = modelCache.get(node.id);
    return cached && cached.endpoint === node.endpoint.trim() && cached.protocol === node.protocol ? cached.models : [];
  }

  function fillModelList(list, nodeId) {
    list.replaceChildren();
    const node = draft.nodes.find(item => item.id === nodeId);
    if (node) cacheEntry(node).forEach(model => list.append(option(model, model)));
  }

  function refreshSelectors() {
    ui.agentRows.forEach(row => {
      const select = row.node;
      const previous = select.value;
      select.replaceChildren(option('', row.agentId === 'default' ? '未分配（无通用默认）' : row.inheritsDialogue ? '继承统一对白 → 默认通用模型' : '继承默认通用模型'));
      draft.nodes.forEach((node, index) => select.append(option(node.id, nodeName(node, index))));
      select.value = draft.nodes.some(node => node.id === previous) ? previous : '';
    });
    refreshModelLists();
  }

  function refreshModelLists() {
    ui.agentRows.forEach(row => fillModelList(row.list, row.node.value));
  }

  function endpointList() {
    const list = element('datalist');
    list.id = `ms-endpoints-${++sequence}`;
    const endpoints = new Set(view.providers.map(provider => provider.endpoint));
    view.presets.forEach(preset => (preset.nodes || []).forEach(node => endpoints.add(node.endpoint)));
    draft.nodes.forEach(node => endpoints.add(node.endpoint));
    endpoints.forEach(endpoint => { if (endpoint) list.append(option(endpoint, endpoint)); });
    return list;
  }

  function renderNode(node, index) {
    const card = element('section', 'ms-node');
    const heading = element('div', 'ms-section-heading');
    heading.append(element('h4', '', `连接节点 ${index + 1}`), button('移除', () => {
      if (!window.confirm('移除此节点？对应角色分配将被清空，保存后生效。')) return;
      draft.nodes = draft.nodes.filter(item => item !== node);
      Object.values(draft.assignments).forEach(assignment => {
        if (assignment.nodeId === node.id) { assignment.nodeId = ''; assignment.model = ''; assignment.thinkingLevel = 'off'; }
      });
      // Re-rendering only the node list must not discard other nodes' typed keys.
      dirty = true;
      renderNodes();
      ui.agentRows.forEach(row => {
        const assigned = draft.assignments[row.agentId];
        if (!assigned || !assigned.nodeId) { row.node.value = ''; row.model.value = ''; row.thinking.value = 'off'; }
      });
      refreshSelectors();
    }, 'ms-danger ms-small'));
    const provider = element('select', 'ms-input');
    provider.append(option('', '自定义 / 选择服务商自动填充'));
    view.providers.forEach(item => provider.append(option(item.id, item.label)));
    const label = input('text', node.label);
    const endpoint = input('url', node.endpoint);
    endpoint.placeholder = 'http://localhost:11434/v1';
    endpoint.autocomplete = 'off';
    const endpoints = endpointList();
    endpoint.setAttribute('list', endpoints.id);
    const protocol = element('select', 'ms-input');
    protocol.append(option('openai', 'OpenAI 兼容'), option('anthropic', 'Anthropic'));
    protocol.value = node.protocol;
    const promptCaching = input('checkbox');
    const promptCachingField = field('显式提示缓存（仅支持的 Anthropic 节点）', promptCaching);
    promptCachingField.classList.add('ms-check-field');
    const promptCachingHint = element('small', 'ms-hint', '默认关闭。开启会在供应商端产生短期提示缓存，缓存写入可能计费；请先确认此 Anthropic 节点支持。不延长 TTL，不缓存完整历史，仅标记稳定的系统提示前缀。');
    promptCachingHint.id = `${promptCaching.id}-hint`;
    promptCaching.setAttribute('aria-describedby', promptCachingHint.id);
    const promptCachingSettings = element('div', 'ms-field');
    promptCachingSettings.append(promptCachingField, promptCachingHint);
    const syncPromptCaching = () => {
      if (node.protocol !== 'anthropic' && node.promptCaching === true) delete node.promptCaching;
      promptCaching.checked = node.promptCaching === true;
      promptCaching.disabled = node.protocol !== 'anthropic';
    };
    syncPromptCaching();
    promptCaching.addEventListener('change', () => {
      node.promptCaching = node.protocol === 'anthropic' && promptCaching.checked;
      syncPromptCaching();
    });
    const key = input('password', node.key || '');
    key.autocomplete = 'new-password';
    key.spellcheck = false;
    key.placeholder = node.hasKey ? '已保存；地址及协议不变时留空沿用' : '可留空（如本地服务）';
    const clearKey = input('checkbox');
    clearKey.checked = Boolean(node.clearKey);
    clearKey.disabled = !node.hasKey;
    const clearField = field('删除已保存密钥', clearKey);
    clearField.classList.add('ms-check-field');
    const nodeStatus = element('p', 'ms-hint');
    nodeStatus.setAttribute('role', 'status');
    nodeStatus.setAttribute('aria-live', 'polite');
    const invalidateModels = () => {
      modelCache.delete(node.id);
      nodeStatus.textContent = '';
      refreshModelLists();
    };
    label.addEventListener('input', () => { node.label = label.value; refreshSelectors(); });
    endpoint.addEventListener('input', () => { node.endpoint = endpoint.value; invalidateModels(); });
    protocol.addEventListener('change', () => { node.protocol = protocol.value; syncPromptCaching(); invalidateModels(); });
    key.addEventListener('input', () => { node.key = key.value; invalidateModels(); });
    clearKey.addEventListener('change', () => {
      node.clearKey = clearKey.checked;
      if (node.clearKey) { node.key = ''; key.value = ''; }
      key.disabled = node.clearKey;
      invalidateModels();
    });
    key.disabled = Boolean(node.clearKey);
    provider.addEventListener('change', () => {
      const selected = view.providers.find(item => item.id === provider.value);
      if (!selected) return;
      node.endpoint = selected.endpoint || '';
      node.protocol = selected.protocol === 'anthropic' ? 'anthropic' : 'openai';
      if (!node.label.trim()) node.label = selected.label || '';
      endpoint.value = node.endpoint;
      protocol.value = node.protocol;
      label.value = node.label;
      syncPromptCaching();
      invalidateModels();
      refreshSelectors();
    });
    const fetchModels = button('拉取模型列表', () => perform(async () => {
      if (!validEndpoint(node.endpoint)) throw new Error('请先填写有效的 HTTP(S) 节点地址。');
      nodeStatus.classList.remove('ms-error');
      nodeStatus.textContent = '正在通过本机后端拉取模型…';
      try {
        const body = { endpoint: node.endpoint.trim(), protocol: node.protocol };
        if (node.key) body.key = node.key;
        // A pending key deletion must not silently reuse the saved key.
        if (draft.id && node.hasKey && !node.clearKey) { body.presetId = draft.id; body.nodeId = node.id; }
        const result = await request('/api/settings/models', body);
        if (!result || !Array.isArray(result.models)) throw new Error('模型列表格式不正确。');
        const models = [...new Set(result.models.map(item => item && item.id).filter(id => typeof id === 'string' && id.length > 0))];
        modelCache.set(node.id, { endpoint: node.endpoint.trim(), protocol: node.protocol, models });
        refreshModelLists();
        nodeStatus.textContent = `拉取成功：${models.length} 个模型。仍可手动输入模型 ID。`;
      } catch (error) {
        nodeStatus.classList.add('ms-error');
        nodeStatus.textContent = error.message || '拉取失败，请检查节点连接。';
        throw error;
      }
    }), 'ms-secondary');
    const grid = element('div', 'ms-node-fields');
    grid.append(field('服务商快捷填充', provider), field('节点名称', label), field('API 地址', endpoint), endpoints,
      field('协议', protocol), promptCachingSettings,
      field('API 密钥', key, node.hasKey ? '此节点已有保存的密钥。仅地址和协议不变时可留空沿用；更改后请重新输入密钥，或勾选“删除已保存密钥”再保存。' : '无密钥的本地节点也可以拉取模型。'), clearField);
    card.append(heading, grid, fetchModels, nodeStatus);
    return card;
  }

  function renderNodes() {
    ui.nodes.replaceChildren(...draft.nodes.map(renderNode));
    if (!draft.nodes.length) ui.nodes.append(element('p', 'ms-hint', '还没有节点。点击“添加节点”开始。'));
  }

  function validEndpoint(value) {
    try {
      const url = new URL(value.trim());
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
    } catch { return false; }
  }

  function payload() {
    const name = draft.name.trim();
    if (!name) throw new Error('请先为预设命名。');
    if (!draft.nodes.length) throw new Error('请至少添加一个连接节点。');
    const nodes = draft.nodes.map((node, index) => {
      if (!validEndpoint(node.endpoint)) throw new Error(`节点 ${index + 1} 的地址无效，请使用不含账号密码的 HTTP(S) 地址。`);
      const result = { id: node.id, label: nodeName(node, index), endpoint: node.endpoint.trim(), protocol: node.protocol };
      if (node.promptCaching === true && node.protocol !== 'anthropic') throw new Error(`节点 ${index + 1} 的显式提示缓存仅支持已确认兼容的 Anthropic 节点。`);
      if (typeof node.promptCaching === 'boolean') result.promptCaching = node.promptCaching;
      if (node.clearKey) result.clearKey = true;
      else if (node.key) result.key = node.key;
      return result;
    });
    const assignments = Object.create(null);
    view.agents.forEach(agent => {
      const assigned = draft.assignments[agent.id];
      if (!assigned || (!assigned.nodeId && !assigned.model.trim())) return;
      if (!draft.nodes.some(node => node.id === assigned.nodeId) || !assigned.model.trim()) {
        throw new Error(`请完整填写“${agent.label}”的节点与模型，或清空两者${inheritanceHint(agent.id)}。`);
      }
      const assignment = { nodeId: assigned.nodeId, model: assigned.model.trim() };
      if (typeof assigned.thinkingLevel === 'string') assignment.thinkingLevel = assigned.thinkingLevel;
      assignments[agent.id] = assignment;
    });
    return { ...(draft.id ? { id: draft.id } : {}), name, nodes, assignments };
  }

  function modelControl() {
    const control = input('text');
    control.placeholder = '选择或手动输入模型 ID';
    control.autocomplete = 'off';
    control.spellcheck = false;
    const list = element('datalist');
    list.id = `ms-models-${++sequence}`;
    control.setAttribute('list', list.id);
    return { control, list };
  }

  function traceNumber(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  }

  function traceId(value) {
    return typeof value === 'string' && value.length <= 160 && /^[A-Za-z0-9][A-Za-z0-9_.:@-]*$/u.test(value) ? value : undefined;
  }

  function traceHash(value) {
    return typeof value === 'string' && /^(?:sha256:)?[a-f0-9]{64}$/iu.test(value) ? value : undefined;
  }

  function traceCount(value) {
    return Array.isArray(value) ? traceNumber(value.length) : traceNumber(value);
  }

  function traceIds(value) {
    return Array.isArray(value) ? value.slice(0, 16).map(traceId).filter(Boolean) : [];
  }

  function traceManifest(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const compression = value.compression;
    return {
      policyVersion: traceId(value.policyVersion),
      requiredObservationIds: traceIds(value.requiredObservationIds),
      deliveredObservationIds: traceIds(value.deliveredObservationIds),
      selected: Array.isArray(value.selected) ? value.selected.slice(0, 8).map(item => ({
        type: ['observation', 'record'].includes(item?.type) ? item.type : undefined,
        id: traceId(item?.id), sourceObservationIds: traceIds(item?.sourceObservationIds),
      })) : [],
      skippedForBudget: traceNumber(value.skippedForBudget),
      ...(compression && typeof compression === 'object' ? { compression: {
        policy: traceId(compression.policy), mode: ['off', 'auto'].includes(compression.mode) ? compression.mode : undefined,
        active: typeof compression.active === 'boolean' ? compression.active : undefined,
        sourceCount: traceNumber(compression.sourceCount), rawPacketBytes: traceNumber(compression.rawPacketBytes),
        savedBytes: traceNumber(compression.savedBytes),
      } } : {}),
    };
  }

  function traceFailure(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const own = key => Object.getOwnPropertyDescriptor(value, key)?.value;
    const result = {};
    const locations = ['openai_envelope', 'openai_choice', 'openai_message', 'anthropic_envelope', 'anthropic_block'];
    const extensions = ['fields', 'reasoning_content', 'reasoning', 'reasoning_details', 'tool_calls', 'function_call', 'audio',
      'provider_specific_fields', 'prompt_logprobs', 'request_id', 'native_finish_reason', 'finish_details', 'stop_reason', 'stop_sequence', 'text', 'delta'];
    const issues = [...locations.flatMap(location => extensions.map(field => `${location}_${field}`)),
      'openai_choices', 'openai_finish', 'openai_truncated', 'openai_message_content', 'anthropic_content', 'anthropic_text',
      'scene_action_mismatch', 'scene_job_mismatch', 'scene_plan_mismatch', 'scene_base_mismatch', 'scene_scheduling_mismatch',
      'scene_journal_mismatch', 'scene_task_result_mismatch', 'scene_task_frame_mismatch', 'scene_task_scope_mismatch',
      'scene_source_visibility', 'scene_delivery_mismatch', 'scene_social_requests_mismatch', 'scene_goal_templates_mismatch',
      'scene_baseline_missing', 'scene_state_mismatch'];
    for (const [key, allowed] of [
      ['stage', ['prepare', 'context', 'configuration', 'model', 'validation', 'continuation', 'commit']],
      ['code', ['ERR_LLM_TURN_FAILED', 'LLM_NOT_CONFIGURED', 'SETTINGS_UNAVAILABLE', 'AGENT_TIMEOUT', 'STALE_AGENT_TURN',
        'ERR_MODEL_CONFIG', 'ERR_MODEL_PACKET', 'ERR_MODEL_REQUEST', 'ERR_MODEL_RESPONSE', 'ERR_MODEL_TIMEOUT', 'ERR_MODEL_CANCELLED',
        'INVALID_AGENT_OUTPUT', 'INVALID_AGENT_JOB', 'INVALID_AGENT_STATE', 'INVALID_NARRATIVE_OUTPUT',
        'ERR_AGENT_DECISION', 'ERR_AGENT_PROPOSAL', 'ERR_AGENT_EVIDENCE', 'ERR_AGENT_CONTEXT_TOO_LARGE',
        'ERR_COGNITION_INVALID', 'ERR_COGNITION_SOURCE', 'ERR_COGNITION_CONFLICT', 'ERR_DECISION_STATE', 'INVALID_DOMAIN_STATE',
        'SOURCE_VERSION_MISMATCH', 'INVALID_CONVERSATION_STATE', 'ERR_CONVERSATION_STATE', 'INVALID_SCENE_STAGE']],
      ['phase', ['configuration', 'packet', 'request', 'http_status', 'response_headers', 'response_body', 'response_json',
        'response_envelope', 'candidate_json', 'proposal', 'timeout', 'cancelled', 'host_validation']],
      ['issue', issues], ['taskRole', [...TRACE_ROLES]],
      ['taskKind', ['intent', 'performance', 'npc', 'ballot', 'scene', 'scene-repair', 'roleplay', 'character_data', 'narrator']],
      ['retryAdvice', ['manual_retry', 'check_settings', 'inspect_commit', 'refresh_state']],
      ['retryRequiresModel', ['no', 'possible']],
    ]) { const entry = own(key); if (allowed.includes(entry)) result[key] = entry; }
    for (const [key, max] of [['sequence', Number.MAX_SAFE_INTEGER], ['httpStatus', 599], ['attempt', 11], ['retryLimit', 10],
      ['modelCalls', 1000], ['reusedTasks', 32], ['completedTasks', 32], ['pendingTasks', 32]]) {
      const entry = own(key); if (Number.isSafeInteger(entry) && entry >= 0 && entry <= max) result[key] = entry;
    }
    const kind = own('kind'); if (['failed', 'attempt_failed', 'rejected'].includes(kind)) result.kind = kind;
    const jobRef = traceHash(own('jobRef')); if (jobRef) result.jobRef = jobRef;
    return Object.keys(result).length ? result : undefined;
  }

  function traceFailures(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(-12).map(traceFailure).filter(Boolean);
  }

  function traceTask(value) {
    if (!value || !traceId(value.id) || !TRACE_ROLES.has(value.role)) return null;
    const task = {
      id: traceId(value.id), role: value.role, actorId: traceId(value.actorId),
      status: TRACE_STATUSES.has(value.status) ? value.status : 'unknown',
      contextHash: traceHash(value.contextHash), packetHash: traceHash(value.packetHash), promptHash: traceHash(value.promptHash),
      packetBytes: traceNumber(value.packetBytes), maxBytes: traceNumber(value.maxBytes),
      manifest: traceManifest(value.manifest),
      validation: { accepted: traceCount(value.validation?.accepted), rejected: traceCount(value.validation?.rejected) },
      failures: traceFailures(value.failures),
    };
    const frame = value.sceneFrame;
    if (frame && Number.isSafeInteger(frame.beat) && frame.beat >= 1 && frame.beat <= 3
      && Number.isSafeInteger(frame.worldTime) && frame.worldTime >= 0 && traceHash(frame.prefixHash)) {
      task.sceneFrame = { beat: frame.beat, worldTime: frame.worldTime, prefixHash: traceHash(frame.prefixHash) };
    }
    const budget = value.decisionBudget;
    if (budget && ['act', 'review'].includes(budget.mode) && Number.isSafeInteger(budget.updatesRemaining)
      && budget.updatesRemaining >= 0 && budget.updatesRemaining <= 6
      && Number.isSafeInteger(budget.utteranceChars) && budget.utteranceChars >= 0 && budget.utteranceChars <= 400
      && Array.isArray(budget.relationshipRemaining) && budget.relationshipRemaining.length <= 32) {
      task.decisionBudget = { mode: budget.mode, updatesRemaining: budget.updatesRemaining, utteranceChars: budget.utteranceChars,
        relationshipRemaining: budget.relationshipRemaining.filter(row => row && traceId(row.targetHandle)
          && Number.isSafeInteger(row.remaining) && row.remaining >= 0 && row.remaining <= 1)
          .map(row => ({ targetHandle: traceId(row.targetHandle), remaining: row.remaining })) };
    }
    if (value.usage && typeof value.usage === 'object') {
      task.usage = {};
      for (const key of ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'requestBytes', 'packetBytes']) {
        const count = traceNumber(value.usage[key]);
        if (count !== undefined && count <= 1_000_000_000) task.usage[key] = count;
      }
    }
    return task;
  }

  function traceView(data) {
    if (!data || data.version !== 1 || data.audience !== 'developer-only' ||
      traceNumber(data.generation) === undefined || traceNumber(data.revision) === undefined || !Array.isArray(data.turns)) {
      throw new Error('追踪数据格式不正确。');
    }
    // Rebuild a bounded metadata-only DTO. Unknown fields, packet bodies,
    // dialogue, provider errors and prompts never reach the regular trace DOM.
    let remaining = 48;
    const turns = data.turns.slice(0, 12).map(turn => {
      if (!turn || !traceId(turn.jobId) || !Array.isArray(turn.tasks)) throw new Error('追踪数据格式不正确。');
      const tasks = turn.tasks.slice(0, Math.min(remaining, 24)).map(traceTask).filter(Boolean);
      remaining -= tasks.length;
      return {
        jobId: traceId(turn.jobId), requestRef: traceId(turn.requestRef),
        failure: traceFailure(turn.failure), failures: traceFailures(turn.failures),
        status: TRACE_STATUSES.has(turn.status) ? turn.status : 'unknown',
        generation: traceNumber(turn.generation), baseRevision: traceNumber(turn.baseRevision), turnId: traceId(turn.turnId),
        review: { policy: traceId(turn.review?.policy), adoptedSubjective: traceCount(turn.review?.adoptedSubjective),
          deferredSubjective: traceCount(turn.review?.deferredSubjective), compositionRepairs: traceCount(turn.review?.compositionRepairs),
          ...(Number.isSafeInteger(turn.review?.beats) && turn.review.beats >= 0 && turn.review.beats <= 3
            ? { beats: turn.review.beats, npcDecisions: traceCount(turn.review.npcDecisions) } : {}) },
        tasks,
      };
    });
    return { generation: data.generation, revision: data.revision, contentFingerprint: traceHash(data.contentFingerprint), turns };
  }

  function boundedUtf8(value, maxBytes) {
    let bytes = 0;
    let end = 0;
    for (const character of value) {
      const code = character.codePointAt(0);
      const size = code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
      if (bytes + size > maxBytes) break;
      bytes += size;
      end += character.length;
    }
    return { text: value.slice(0, end), truncated: end < value.length };
  }

  function clearDeveloperInspection() {
    developerEpoch++;
    if (developerPending) developerPending.abort();
    developerPending = null;
    const panel = ui && ui.runtime && ui.runtime.trace;
    if (!panel) return;
    panel.tasks = [];
    panel.selector.replaceChildren();
    panel.selector.disabled = true;
    panel.summary.textContent = '';
    panel.task.textContent = '';
    panel.context.textContent = '';
    panel.context.hidden = true;
    const enabled = runtimeOptions.developerMode === true && Boolean(token) && dialog?.open === true;
    panel.controls.disabled = !enabled;
    panel.refresh.disabled = !enabled;
    panel.inspect.disabled = !enabled;
    panel.section.setAttribute('aria-disabled', String(!enabled));
    if (!enabled) panel.section.open = false;
    developerStatus(panel, runtimeOptions.developerMode ? '尚未读取；请手动刷新。' : '开发人员模式已关闭。');
  }

  function syncDeveloperInspection() {
    const panel = ui && ui.runtime && ui.runtime.trace;
    if (!panel) return;
    const enabled = runtimeOptions.developerMode === true && Boolean(token) && dialog?.open === true;
    panel.controls.disabled = !enabled;
    panel.refresh.disabled = !enabled || Boolean(developerPending);
    panel.inspect.disabled = !enabled || Boolean(developerPending);
    panel.section.setAttribute('aria-disabled', String(!enabled));
    if (!enabled) {
      panel.section.open = false;
      clearDeveloperInspection();
    }
  }

  function developerStatus(panel, message, error = false) {
    panel.status.textContent = message;
    panel.status.classList.toggle('ms-error', error);
    panel.status.setAttribute('role', error ? 'alert' : 'status');
  }

  function renderTrace(panel, data) {
    const lines = [`代次 ${data.generation} · 修订 ${data.revision} · 显示 ${data.turns.length} 轮（最多 12 轮／48 项任务）`];
    if (data.contentFingerprint) lines.push(`内容指纹 ${data.contentFingerprint}`);
    panel.tasks = [];
    for (const turn of data.turns) {
      lines.push(`${turn.jobId} · ${turn.status} · 显示 ${turn.tasks.length} 项任务 · 主观更新 ${turn.review.adoptedSubjective ?? 0} 采纳／${turn.review.deferredSubjective ?? 0} 延后 · 正文修订 ${turn.review.compositionRepairs ?? 0}${turn.review.beats === undefined ? '' : ` · 场景微拍 ${turn.review.beats}／3 · NPC 决定 ${turn.review.npcDecisions ?? 0}／6`}`);
      if (turn.failure) {
        const f = turn.failure;
        lines.push(`失败定位：${f.stage || '未知阶段'} / ${f.code || '未记录'}${f.phase ? ` / ${f.phase}` : ''}${f.issue ? ` / ${f.issue}` : ''}${f.httpStatus ? ` / HTTP ${f.httpStatus}` : ''}`);
        lines.push(`本次模型调用 ${f.modelCalls ?? '未知'} · 复用 ${f.reusedTasks ?? '未知'} · 已完成 ${f.completedTasks ?? '未知'} · 待完成 ${f.pendingTasks ?? '未知'} · ${f.retryRequiresModel === 'no' ? '修复后仅重试提交，无需重抽' : '续接可能调用模型并产生费用'}`);
      }
      for (const task of turn.tasks) panel.tasks.push({ ...task, jobId: turn.jobId, turnFailure: turn.failure });
    }
    panel.summary.textContent = lines.join('\n');
    panel.selector.replaceChildren(...panel.tasks.map((task, index) => option(String(index),
      `${task.role === 'world_adjudicator' ? '宿主有限意图裁决' : task.role} · ${task.actorId || '系统'} · ${task.id}`)));
    panel.selector.disabled = !panel.tasks.length;
    panel.selector.value = panel.tasks.length ? '0' : '';
    panel.task.textContent = panel.tasks.length ? JSON.stringify(panel.tasks[0], null, 2) : '';
    developerStatus(panel, '只读快照已刷新；列表与清单均有数量上限，不显示上下文、对白或行为提示词。');
  }

  function contextText(data) {
    if (!data || data.version !== 1 || data.audience !== 'developer-context-only' ||
      traceNumber(data.generation) === undefined || traceNumber(data.revision) === undefined ||
      !Array.isArray(data.tasks) || data.tasks.length > 32 ||
      (!traceId(data.jobId) && !(data.jobId === null && data.tasks.length === 0))) {
      throw new Error('完整上下文格式不正确。');
    }
    const tasks = data.tasks.map(task => {
      if (!task || !traceId(task.id) || !TRACE_ROLES.has(task.role) || !traceId(task.actorId) ||
        (typeof task.context !== 'string' && (!task.context || typeof task.context !== 'object' || Array.isArray(task.context))) ||
        typeof task.behaviorPrompt !== 'string') throw new Error('完整上下文格式不正确。');
      return { id: task.id, role: task.role, actorId: task.actorId, context: task.context, behaviorPrompt: task.behaviorPrompt };
    });
    return boundedUtf8(JSON.stringify({ version: 1, audience: 'developer-context-only', generation: data.generation,
      revision: data.revision, jobId: data.jobId, tasks }, null, 2), MAX_CONTEXT_BYTES);
  }

  async function loadDeveloperInspection(fullContext = false) {
    const panel = ui && ui.runtime && ui.runtime.trace;
    if (!panel || !dialog?.open || runtimeOptions.developerMode !== true || !token || busy || developerPending) return;
    if (fullContext && !window.confirm('完整上下文会泄露角色秘密、私有 NPC 知识与行为提示词。仅在本机另行设置 MANOSABA_CONTEXT_INSPECTION=1 后可用。确定本次读取并显示吗？')) return;
    clearDeveloperInspection();
    const epoch = developerEpoch;
    const controller = new AbortController();
    developerPending = controller;
    const timer = setTimeout(() => controller.abort(), 30000);
    syncDeveloperInspection();
    developerStatus(panel, fullContext ? '正在读取本次授权的完整上下文…' : '正在读取只读追踪快照…');
    const current = () => epoch === developerEpoch && dialog?.open && runtimeOptions.developerMode === true && ui?.runtime?.trace === panel;
    try {
      // Both protected GETs require the token. No polling, mutation, model call
      // or automatic retry; redirects must not forward inspection credentials.
      const response = await fetch(fullContext ? '/api/developer/turn-context' : '/api/developer/turns', {
        method: 'GET', mode: 'same-origin', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        headers: { Accept: 'application/json', 'X-Manosaba-Token': token }, signal: controller.signal,
      });
      if (!response.ok) throw new Error('开发人员只读接口不可用；请核对开关、安全令牌与本机授权。');
      const data = await response.json();
      if (!current()) return;
      if (fullContext) {
        const content = contextText(data);
        panel.context.textContent = content.text;
        panel.context.hidden = false;
        developerStatus(panel, content.truncated ? '已显示完整上下文的前 256 KiB；超出部分未显示。关闭设置或关闭开发人员模式会清空。' : '本次授权的上下文已显示（上限 256 KiB）；关闭设置或关闭开发人员模式会清空。');
      } else renderTrace(panel, traceView(data));
    } catch {
      if (current()) developerStatus(panel, '读取失败。未显示服务端错误内容；请核对开发人员模式、安全令牌及本机另行授权后手动读取。', true);
    } finally {
      clearTimeout(timer);
      if (developerPending === controller) developerPending = null;
      if (current()) syncDeveloperInspection();
    }
  }

  function renderDeveloperInspection() {
    const section = element('details', 'ms-advanced ms-developer-trace');
    section.append(element('summary', '', '开发人员 · 轮次追踪（只读）'));
    const controls = element('fieldset', 'ms-controls ms-trace-body');
    controls.append(element('p', 'ms-hint', '仅手动读取已记录的任务元数据与检索清单，不会轮询、执行行动、调用模型或自动重试。常规追踪不显示上下文、对白、行为提示词或角色秘密正文。'));
    const refresh = button('手动刷新轮次追踪', () => loadDeveloperInspection(), 'ms-secondary ms-small');
    const summary = element('pre', 'ms-trace-summary');
    const selector = element('select', 'ms-input');
    selector.disabled = true;
    const task = element('pre', 'ms-trace-text');
    const warning = element('p', 'ms-context-warning', '剧透与隐私警告：完整上下文会暴露私有 NPC 知识、角色秘密及行为提示词。默认不读取；必须另行配置本机授权，并在每次直接点击后确认。请勿分享。');
    const inspect = button('完整上下文（本机另行授权）', () => loadDeveloperInspection(true), 'ms-danger ms-small');
    const context = element('pre', 'ms-trace-text ms-context-text');
    context.hidden = true;
    const state = element('p', 'ms-hint', '尚未读取；请手动刷新。');
    state.setAttribute('aria-live', 'polite');
    controls.append(refresh, summary, field('追踪任务（最多显示 48 项）', selector), task, warning, inspect, context, state);
    section.append(controls);
    const panel = { section, controls, refresh, summary, selector, task, inspect, context, status: state, tasks: [] };
    ui.runtime.trace = panel;
    selector.addEventListener('change', () => {
      const selected = panel.tasks[Number(selector.value)];
      task.textContent = selected && runtimeOptions.developerMode ? JSON.stringify(selected, null, 2) : '';
    });
    section.addEventListener('toggle', () => {
      if (ui?.runtime?.trace !== panel) return;
      if (!runtimeOptions.developerMode) section.open = false;
      // Expanding never fetches. Collapsing discards sensitive in-memory data.
      if (!section.open) clearDeveloperInspection();
    });
    syncDeveloperInspection();
    return section;
  }

  function renderRuntimeSettings() {
    const section = element('section', 'ms-runtime-settings');
    const heading = element('h3', '', '操作设置');
    heading.id = 'ms-runtime-title';
    section.setAttribute('aria-labelledby', heading.id);
    const controls = element('div', 'ms-runtime-controls');
    ui.runtime = { section };
    const runtimeField = (name, label, hint) => {
      const control = input('checkbox');
      control.checked = runtimeOptions[name];
      control.addEventListener('change', () => saveRuntimeOption(name, control.checked));
      ui.runtime[name] = control;
      const wrapper = field(label, control, hint);
      wrapper.classList.add('ms-check-field', 'ms-runtime-option');
      controls.append(wrapper);
    };
    runtimeField('directSendSuggestions', '点击快捷选项后直接发送',
      '默认关闭：点击快捷选项只会填入输入框，可手动编辑后再发送。开启后点击快捷选项将直接发送。此设置独立于模型预设，更改后立即保存。');
    runtimeField('debug', 'Debug 调试日志',
      '默认关闭。基础日志始终开启；Debug 额外记录 UI、性能、完整行动与接口请求/回复，以及模型的完整提示词和原始回复（含未通过校验的候选）。私有内容写入日志目录的 debug-traffic.jsonl，可能包含剧情剧透、角色秘密及个人文本，请勿直接公开分享。API 密钥、认证头和页面凭据仍会屏蔽；超出传输上限或中断的回复会标记不完整。关闭后立即停止记录正文，已有日志保留并按容量轮转。更改后立即保存。');
    runtimeField('developerMode', '开发人员模式',
      '默认关闭。剧透与隐私警告：开启后在游戏正文左侧显示角色观察框，可切换查看每位角色的行动链条、当前主观摘要、对玩家的态度与下一步目标和计划。资料仅供开发人员，可能暴露私有 NPC 知识与角色秘密；主观记录并非事实，不展示模型的真实思维链，未记录的想法与下一步不会自动补写。常规轮次追踪仅显示任务元数据；完整上下文必须在本机另行授权并直接点击确认，不会自动读取。查看不会发起模型调用或产生额外费用。此设置独立于 Debug 日志、模型预设与游戏存档，更改后立即保存。');
    const retry = input('number', String(runtimeOptions.llmRetryCount));
    retry.min = '0';
    retry.max = '10';
    retry.step = '1';
    retry.inputMode = 'numeric';
    retry.classList.add('ms-retry-count');
    retry.addEventListener('change', () => {
      const raw = String(retry.value).trim();
      const value = Number(raw);
      if (!/^\d+$/u.test(raw) || !Number.isSafeInteger(value) || value > 10) {
        retry.value = String(runtimeOptions.llmRetryCount);
        status('自动重试次数须为 0 到 10 的整数。', true);
        return;
      }
      if (value === runtimeOptions.llmRetryCount) {
        retry.value = String(value);
        return;
      }
      saveRuntimeOption('llmRetryCount', value);
    });
    ui.runtime.llmRetryCount = retry;
    controls.append(field('模型调用失败后自动重试', retry,
      '默认 3 次。同一轮并行请求里，某一个第一次没通过（网络、超时或输出未通过校验）会自动再请求，不会立刻让整轮失败；已经成功的请求会保留。0 表示不自动重试，仍可手动续接未完成的部分。每次重试都会再次调用模型，可能产生费用。填写 0–10 的整数，保存后从下一次行动或角色补全开始生效。'));
    const director = element('select', 'ms-input');
    director.append(option('off', '关闭'), option('advisory', '独立建议'));
    director.value = runtimeOptions.directorMode;
    director.addEventListener('change', () => {
      const mode = director.value;
      if (!['off', 'advisory'].includes(mode)) {
        director.value = runtimeOptions.directorMode;
        status('导演模式只能为关闭或独立建议。', true);
        return;
      }
      if (mode !== runtimeOptions.directorMode) return saveRuntimeOption('directorMode', mode);
    });
    ui.runtime.directorMode = director;
    controls.append(field('独立导演', director,
      '默认关闭。独立建议仅在后续新行动的宏观边界调用导演模型，使用“导演”模型分配，未单独分配时继承默认通用模型。跟踪已有机会的跨回合候选，在条件变化或到期时撤回，并且仅在真实行动后确认激活。可对已合法入选的非必要任务做一次有界排序，不增加调用或唤醒权限，不强迫角色行动或改写世界。每次评估可能产生费用；保存设置本身不调用模型，已开始的任务保持原设置。可选导演失败不会阻止其他正常行动。更改后立即保存。'));
    const logs = element('div', 'ms-runtime-logs');
    ui.runtime.logDirectory = element('p', 'ms-log-directory');
    ui.runtime.logStatus = element('p', 'ms-hint');
    ui.runtime.logStatus.setAttribute('role', 'status');
    logs.append(element('h4', '', '本地日志目录'), ui.runtime.logDirectory, ui.runtime.logStatus);
    section.append(heading, controls, renderDeveloperInspection(), logs);
    syncRuntimeControls();
    return section;
  }

  function validPromptText(value) {
    return typeof value === 'string' && value.length <= 12000 && Boolean(value.trim()) &&
      !/[\p{Cc}\p{Cf}\p{Cs}]/u.test(value.replace(/[\r\n]/gu, ''));
  }

  function promptView(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.entries) || !data.entries.length || data.entries.length > 64) {
      throw new Error('提示词目录格式不正确，请检查后端接口。');
    }
    const ids = new Set();
    const entries = data.entries.map(entry => {
      if (!entry || typeof entry.id !== 'string' || ids.has(entry.id) ||
        (!promptFunctionIds.has(entry.id) && !characterIds.has(entry.id) && entry.id !== 'warden' && !/^custom:[a-f0-9]{64}$/u.test(entry.id)) ||
        typeof entry.label !== 'string' || !entry.label.trim() || entry.label.length > 120 ||
        !Number.isSafeInteger(entry.version) || entry.version < 0 ||
        !validPromptText(entry.defaultPrompt) || !validPromptText(entry.effectivePrompt) ||
        (entry.overridePrompt !== null && !validPromptText(entry.overridePrompt)) ||
        !['default', 'override', 'inherited'].includes(entry.source)) {
        throw new Error('提示词条目格式不正确，请检查后端接口。');
      }
      ids.add(entry.id);
      return {
        id: entry.id, label: entry.label, version: entry.version,
        defaultPrompt: entry.defaultPrompt, effectivePrompt: entry.effectivePrompt,
        overridePrompt: entry.overridePrompt, source: entry.source,
      };
    });
    if (![...promptFunctionIds, ...characterIds, 'warden'].every(id => ids.has(id))) {
      throw new Error('提示词目录不完整，请刷新后重试。');
    }
    const shared = entries.find(entry => entry.id === 'character_dialogue');
    for (const entry of entries) {
      const inherits = !promptFunctionIds.has(entry.id);
      const source = entry.overridePrompt !== null ? 'override' : inherits ? 'inherited' : 'default';
      const effective = entry.overridePrompt !== null ? entry.overridePrompt : inherits ? shared.effectivePrompt : entry.defaultPrompt;
      if (entry.source !== source || entry.effectivePrompt !== effective) {
        throw new Error('提示词来源与生效内容不一致，请刷新后重试。');
      }
    }
    return { version: data.version, entries };
  }

  function promptError(error) {
    if (error.status === 400) return '提示词无效，或当前自定义角色资料已变化。请检查条目、版本及多行纯文本内容，草稿已保留。';
    if (error.status === 404) return '提示词条目或接口不存在，请刷新提示词目录或重新打开设置。';
    if (error.status >= 500) return '提示词服务暂不可用，草稿已保留，请稍后重试。';
    return error.message || '提示词操作失败，草稿已保留，请稍后重试。';
  }

  function promptScope(entry) {
    if (entry.id.startsWith('custom:')) return '自定义角色';
    return promptFunctionIds.has(entry.id) ? '功能' : '角色';
  }

  function promptStatus(message, error = false) {
    if (!ui || !ui.prompts) return;
    ui.prompts.status.textContent = message;
    ui.prompts.status.classList.toggle('ms-error', error);
    ui.prompts.status.setAttribute('role', error ? 'alert' : 'status');
  }

  function selectedPrompt() {
    return promptCatalog && promptCatalog.entries.find(entry => entry.id === promptSelection);
  }

  function promptDraft(entry) {
    if (!promptDrafts.has(entry.id)) {
      const text = entry.overridePrompt === null ? entry.effectivePrompt : entry.overridePrompt;
      promptDrafts.set(entry.id, { text, baseline: text, version: entry.version, dirty: false, conflict: false });
    }
    return promptDrafts.get(entry.id);
  }

  function syncPromptPreview() {
    const entry = selectedPrompt();
    if (!entry || !ui || !ui.prompts) return;
    const current = promptDraft(entry);
    const valid = validPromptText(current.text);
    ui.prompts.counter.textContent = `${current.text.length} / 12000 字符${current.dirty ? ' · 有未保存草稿' : ''}${current.conflict ? ' · 版本冲突，请刷新核对' : ''}`;
    ui.prompts.counter.classList.toggle('ms-error', !valid);
    ui.prompts.editor.setAttribute('aria-invalid', String(!valid));
    ui.prompts.draftPreview.textContent = current.text;
    ui.prompts.save.disabled = !valid || current.conflict;
    ui.prompts.reset.disabled = current.conflict || (entry.overridePrompt === null && !current.dirty);
  }

  function showPromptEntry() {
    if (!ui || !ui.prompts || !promptCatalog) return;
    if (!selectedPrompt()) promptSelection = promptCatalog.entries.some(entry => entry.id === 'character_dialogue')
      ? 'character_dialogue' : promptCatalog.entries[0].id;
    const entry = selectedPrompt();
    const current = promptDraft(entry);
    const inherits = !promptFunctionIds.has(entry.id);
    ui.prompts.selector.value = entry.id;
    ui.prompts.editor.value = current.text;
    ui.prompts.scope.textContent = entry.id.startsWith('custom:')
      ? `作用范围：自定义角色“${entry.label}”的当前完整资料（${entry.id.slice('custom:'.length, 'custom:'.length + 12)}…）。仅资料哈希完全一致时复用，不按姓名共享。`
      : inherits ? `作用范围：仅“${entry.label}”的角色扮演表现；没有单独覆盖时继承统一角色对白。`
        : entry.id === 'character_dialogue' ? '作用范围：所有没有单独提示词覆盖的角色对白与笔谈，包括典狱长和当前自定义角色。'
          : `作用范围：仅“${entry.label}”功能；不改变其他功能或角色提示词。`;
    ui.prompts.source.textContent = `当前来源：${entry.source === 'override' ? '此条目单独覆盖' : entry.source === 'inherited' ? '继承统一角色对白' : '内置默认风格'} · 条目版本 ${entry.version}${current.version !== entry.version ? ` · 草稿基于旧版本 ${current.version}` : ''}`;
    ui.prompts.effective.textContent = entry.effectivePrompt;
    ui.prompts.defaultPreview.textContent = entry.defaultPrompt;
    ui.prompts.editor.placeholder = inherits ? '编辑后保存，仅覆盖此角色；恢复继承不会改动统一对白。' : '编辑此功能的行为与写作风格。';
    ui.prompts.fields.hidden = false;
    syncPromptPreview();
  }

  function fillPromptSelector() {
    if (!ui || !ui.prompts || !promptCatalog) return;
    ui.prompts.selector.replaceChildren(...promptCatalog.entries.map(entry =>
      option(entry.id, `${promptScope(entry)} · ${entry.label}${entry.source === 'override' ? ' · 已覆盖' : ''}`)));
    showPromptEntry();
  }

  function loadPrompts(rebaseSelected = false) {
    return perform(async () => {
      promptStatus('正在加载独立提示词目录…');
      try {
        const next = promptView(await request('/api/prompts'));
        if (rebaseSelected) {
          const entry = next.entries.find(item => item.id === promptSelection);
          const current = promptDrafts.get(promptSelection);
          if (entry && current) {
            if (current.dirty || current.conflict) {
              current.baseline = entry.overridePrompt === null ? entry.effectivePrompt : entry.overridePrompt;
              current.version = entry.version;
              current.dirty = current.text !== current.baseline;
              current.conflict = false;
            } else promptDrafts.delete(entry.id);
          }
        }
        // Untouched cached fields follow refreshed defaults/inheritance. Dirty
        // drafts keep their own CAS versions until explicitly refreshed.
        for (const [id, current] of promptDrafts) {
          if (!current.dirty && !current.conflict) promptDrafts.delete(id);
        }
        promptCatalog = next;
        fillPromptSelector();
        promptStatus(rebaseSelected ? '版本已刷新，当前草稿保留。请对照生效内容核对后再保存。' : '提示词目录已加载。保存与重置独立于模型预设及游戏存档。');
      } catch (error) { promptStatus(promptError(error), true); }
    });
  }

  function savePrompt(reset = false) {
    const entry = selectedPrompt();
    if (!entry) return;
    const current = promptDraft(entry);
    return perform(async () => {
      try {
        if (current.conflict) throw new Error('提示词版本已冲突，草稿已保留。请先刷新提示词版本并核对内容，再保存或重置。');
        if (!reset && !validPromptText(current.text)) throw new Error('请输入 1–12000 字符的纯文本提示词，可换行，不可包含控制字符；恢复默认请使用重置按钮。');
        promptStatus(reset ? '正在重置当前条目…' : '正在保存当前提示词…');
        const next = promptView(await request('/api/prompts/update', {
          id: entry.id, expectedVersion: current.version, prompt: reset ? null : current.text,
        }));
        const saved = next.entries.find(item => item.id === entry.id);
        const submitted = reset ? null : current.text.replace(/\r\n?/gu, '\n');
        if (!saved || saved.version !== current.version + 1 || saved.overridePrompt !== submitted) {
          throw new Error('保存响应未确认当前条目及版本，草稿已保留。请刷新版本并核对后重试。');
        }
        promptCatalog = next;
        promptDrafts.delete(entry.id);
        // A shared-style update must refresh untouched inheriting entries, but
        // must never replace another entry’s unsaved text.
        for (const [id, pending] of promptDrafts) {
          if (!pending.dirty && !pending.conflict) promptDrafts.delete(id);
        }
        fillPromptSelector();
        promptStatus(reset ? '仅当前条目已恢复默认／继承；其他提示词与模型预设未改变。' : '当前提示词已独立保存，后续模型调用生效；模型预设与游戏存档未改变。');
      } catch (error) {
        if (error.status === 409) current.conflict = true;
        syncPromptPreview();
        promptStatus(promptError(error), true);
      }
    });
  }

  function renderPromptSettings() {
    const section = element('details', 'ms-advanced ms-prompt-settings');
    section.open = promptOpen;
    section.append(element('summary', '', '高级设置 · 独立提示词与角色演绎'));
    const body = element('div', 'ms-advanced-body');
    body.append(element('p', 'ms-hint', '这里编辑的是写作偏好，不是角色卡或发送给模型的完整提示词。即使几位角色继承同一份风格，游戏也会分别交付各自的口吻、性格、已知见闻与当前关系。自定义覆盖会独立保存；规则和角色知识不会随这里的编辑改变。'));
    const refresh = button('刷新提示词版本', () => loadPrompts(true), 'ms-secondary ms-small');
    body.append(refresh);
    const fields = element('div', 'ms-prompt-fields');
    fields.hidden = !promptCatalog;
    const selector = element('select', 'ms-input');
    const scope = element('p', 'ms-hint');
    const source = element('p', 'ms-prompt-source');
    const editor = element('textarea', 'ms-input ms-prompt-editor');
    editor.rows = 12;
    editor.maxLength = 12000;
    editor.spellcheck = false;
    const counter = element('p', 'ms-hint');
    const editorField = field('行为与风格提示词', editor, '保存会替换此条目继承的写作偏好，不会替换角色自带的人设。允许多行，最多 12000 字符；要恢复继承请使用重置。');
    counter.id = `${editor.id}-counter`;
    editor.setAttribute('aria-describedby', `${editor.id}-hint ${counter.id}`);
    const save = button('保存当前提示词', () => savePrompt(false), 'ms-primary');
    const reset = button('重置当前条目（默认／继承）', () => savePrompt(true), 'ms-secondary');
    const actions = element('div', 'ms-prompt-actions');
    actions.append(save, reset);
    const previews = element('div', 'ms-prompt-previews');
    const preview = (title, opened = false) => {
      const details = element('details', 'ms-prompt-preview');
      details.open = opened;
      const content = element('pre', 'ms-prompt-text');
      details.append(element('summary', '', title), content);
      previews.append(details);
      return content;
    };
    const effective = preview('当前生效的写作偏好（非完整提示词）', true);
    const defaultPreview = preview('当前玩法的内置风格（可作为编辑起点）');
    const draftPreview = preview('当前编辑草稿（保存后生效）');
    const notice = element('p', 'ms-hint', '重置仅清除此条目的覆盖：角色恢复继承统一对白，功能恢复内置默认。重置不会清空其他条目，也不会改动模型分配。刷新版本会保留当前草稿，方便解决其他页面修改造成的版本冲突。');
    fields.append(field('提示词条目', selector), scope, source, editorField, counter, actions, notice, previews);
    const state = element('p', 'ms-prompt-status');
    state.setAttribute('aria-live', 'polite');
    state.setAttribute('aria-atomic', 'true');
    body.append(fields, state);
    section.append(body);
    ui.prompts = { section, fields, selector, scope, source, editor, counter, save, reset, effective, defaultPreview, draftPreview, status: state };
    selector.addEventListener('change', () => { promptSelection = selector.value; showPromptEntry(); promptStatus(''); });
    editor.addEventListener('input', () => {
      const entry = selectedPrompt();
      if (!entry) return;
      const current = promptDraft(entry);
      current.text = editor.value;
      current.dirty = current.text !== current.baseline;
      syncPromptPreview();
    });
    section.addEventListener('toggle', () => {
      promptOpen = section.open;
      if (section.open && !promptCatalog && !busy) void loadPrompts();
    });
    if (promptCatalog) fillPromptSelector();
    else promptStatus('展开后自动加载，或点击“刷新提示词版本”。提示词不会包含在模型预设中。');
    return section;
  }

  function render() {
    clearDeveloperInspection();
    const retainedCaseItems = document.getElementById('case-item-controls');
    root.replaceChildren();
    ui = { agentRows: [] };
    const header = element('header', 'ms-header');
    const title = element('div');
    const heading = element('h2', '', '选项设置');
    heading.id = 'ms-dialog-title';
    title.append(element('span', 'ms-eyebrow', 'OPTIONS'), heading);
    ui.close = button('关闭', close, 'ms-secondary');
    header.append(title, ui.close);
    root.append(header);
    dialog.setAttribute('aria-labelledby', heading.id);
    ui.controls = element('fieldset', 'ms-controls');
    const caseItems = retainedCaseItems || element('section', 'ms-runtime-settings');
    if (!retainedCaseItems) {
      caseItems.id = 'case-item-controls';
      caseItems.setAttribute('aria-labelledby', 'case-item-controls-title');
      caseItems.innerHTML = '<h3 id="case-item-controls-title">当前世界 · 日用品规则</h3>'
        + '<p class="ms-hint">旧档可自愿启用已审核的可操作日用品。启用前自动备份，不重置角色、不改写历史。施法仍在普通行动文本框完成。</p>'
        + '<p data-case-item-status class="ms-status" role="status" aria-live="polite">正在加载日用品规则…</p>'
        + '<div><button data-case-item-start class="ms-button ms-secondary" type="button" hidden disabled>了解并启用日用品规则</button> '
        + '<button data-case-item-refresh class="ms-button ms-secondary" type="button">刷新规则状态</button></div>'
        + '<div data-case-item-confirmation hidden><p class="ms-hint">确认后将先保存原档备份，只从现在的节点启用；不会推进世界时间，也不会调用模型。</p>'
        + '<button data-case-item-cancel class="ms-button ms-secondary" type="button" hidden>暂不启用</button> '
        + '<button data-case-item-confirm class="ms-button ms-primary" type="button" hidden disabled>确认备份并启用</button></div>';
    }
    ui.controls.append(caseItems, renderRuntimeSettings());
    ui.modelControls = element('section', 'ms-model-preferences');
    ui.modelControls.append(element('h3', '', '模型与连接设置'));
    const notice = element('aside', 'ms-notice');
    notice.append(element('strong', '', '本地 Windows DPAPI · 当前账户加密保护'),
      element('p', '', '保存的 API 密钥由 Windows DPAPI 使用当前 Windows 账户加密保护，不能直接供其他账户或机器使用。拉取模型时，输入的密钥仅提交到本机后端，由后端连接目标服务；拉取不会保存密钥。请仅连接可信节点。人物演绎、对白与笔谈会按需调用已激活的模型，可能产生费用；固定故事按已有内容展开。'));
    if (view.securityNotice) notice.append(element('p', '', String(view.securityNotice)));
    ui.modelControls.append(notice);
    const toolbar = element('section', 'ms-toolbar');
    const presetSelect = element('select', 'ms-input');
    presetSelect.append(option('', '新建预设 / 未保存'));
    view.presets.forEach(preset => presetSelect.append(option(preset.id, `${preset.name}${preset.id === view.activePresetId ? ' · 当前激活' : ''}`)));
    presetSelect.value = draft.id || '';
    presetSelect.addEventListener('change', () => {
      if (discardAllowed()) loadPreset(presetSelect.value);
      else presetSelect.value = draft.id || '';
    });
    toolbar.append(field('编辑预设', presetSelect), button('新建预设', () => {
      if (discardAllowed()) loadPreset(null);
    }, 'ms-secondary'));
    const name = input('text', draft.name);
    name.placeholder = '例如：本地实验 / 日常云端';
    name.maxLength = 120;
    name.addEventListener('input', () => { draft.name = name.value; });
    toolbar.append(field('预设名称', name));
    ui.modelControls.append(toolbar);
    const columns = element('div', 'ms-columns');
    const connections = element('section', 'ms-connections');
    const nodeHeading = element('div', 'ms-section-heading');
    nodeHeading.append(element('h3', '', '连接节点'), button('添加节点', () => {
      draft.nodes.push(newNode());
      dirty = true;
      renderNodes();
      refreshSelectors();
    }, 'ms-secondary ms-small'));
    ui.nodes = element('div', 'ms-nodes');
    connections.append(nodeHeading, ui.nodes);
    const advanced = element('details', 'ms-advanced');
    advanced.append(element('summary', '', '高级设置 · 单角色覆盖与系统模型'));
    const advancedBody = element('div', 'ms-advanced-body');
    advancedBody.append(element('p', 'ms-hint', '角色继承顺序：单角色显式分配 → 统一角色对白 → 默认通用模型；思考等级随最终生效的 Agent 分配继承。系统与角色数据、宿主有限意图裁决和典狱长：显式分配 → 默认通用模型，不继承统一对白；没有通用默认时保持未分配。裁决的提示词是独立条目，不继承对白。模型 ID 可手动输入，候选来自所选节点缓存。每次行动会按需调用模型理解行动、演绎人物、生成对白或笔谈、铺陈场景与整理角色记忆，可能产生多次调用费用；明确的快捷行动可直接进入演绎。角色创建与开场补全由创建器中的按钮发起，结果作为草稿供你确认，属性点数由你分配。独立导演按操作设置在宏观边界运行，使用“导演”模型分配；旧任务保留原有写作偏好，不因设置变化重写。移动、门锁和能力效果均以场景的实际条件为准。'));
    const renderAssignment = (agent, container, inheritsDialogue = false, hint = '') => {
      if (!agent) return;
      const row = element('section', `ms-agent${agent.id === 'default' ? ' ms-default' : agent.id === 'character_dialogue' ? ' ms-dialogue' : ''}`);
      row.append(element('h4', '', agent.id === 'character_dialogue' ? '角色对白统一模型' : agent.id === 'character_data' ? '角色数据整理' : agent.label));
      if (hint) row.append(element('p', 'ms-hint', hint));
      const select = element('select', 'ms-input');
      const model = modelControl();
      model.control.placeholder = agent.id === 'default' ? '选择或手动输入通用默认模型 ID' : inheritsDialogue ? '清空两者 = 统一对白 → 通用默认' : '清空两者 = 回退默认通用模型';
      const thinking = element('select', 'ms-input');
      for (const [value, label] of [['off', '不额外启用（接口默认）'], ['minimal', '极少'], ['low', '低'], ['medium', '中'],
        ['high', '高'], ['xhigh', '很高'], ['max', '最高']]) thinking.append(option(value, label));
      const assigned = draft.assignments[agent.id] || { nodeId: '', model: '' };
      model.control.value = assigned.model || '';
      thinking.value = typeof assigned.thinkingLevel === 'string' ? assigned.thinkingLevel : 'off';
      // Node and model edits keep a stored level, including its absence. The select
      // may display off without writing that display back. Only the thinking
      // control's own change records the chosen value; a DOM event is not that signal.
      const update = thinkingChanged => {
        const prior = draft.assignments[agent.id] || assigned;
        const next = { nodeId: select.value, model: model.control.value };
        if (thinkingChanged === true) next.thinkingLevel = thinking.value;
        else if (typeof prior.thinkingLevel === 'string') next.thinkingLevel = prior.thinkingLevel;
        draft.assignments[agent.id] = next;
      };
      select.addEventListener('change', () => { update(); fillModelList(model.list, select.value); });
      // Do not rebuild a datalist during text/IME composition: browsers may cancel editing.
      model.control.addEventListener('input', update);
      thinking.addEventListener('change', () => update(true));
      row.append(field('节点', select), field('模型 ID', model.control), model.list,
        field('思考等级', thinking, '跟随该 Agent 的模型分配继承。未改这一项时，原本没有的思考等级仍不写入。不额外启用（接口默认）表示请求不额外附带思考参数，不保证供应商默认思考已经关闭，也不保证费用降低。若在这里明确改成不额外启用后保存，配置会记下 off；这只保留该项选择，同样不保证供应商思考实际停止或费用下降。启用其他等级后可能增加耗时与费用。无论等级如何，都只使用最终 JSON，推理字段不会保存。'));
      if (agent.id !== 'default') row.append(button(inheritsDialogue ? '恢复继承统一对白 / 通用默认' : '恢复默认通用模型', () => {
        select.value = '';
        model.control.value = '';
        thinking.value = 'off';
        draft.assignments[agent.id] = { nodeId: '', model: '' };
        fillModelList(model.list, '');
        dirty = true;
        status(`“${agent.label}”已清空显式分配，${inheritsDialogue ? '继承统一对白；对白未分配时回退默认通用模型' : '回退默认通用模型'}；保存预设后生效。`);
      }, 'ms-secondary ms-small'));
      container.append(row);
      ui.agentRows.push({ agentId: agent.id, node: select, model: model.control, thinking, list: model.list, inheritsDialogue });
    };
    const modelSettings = element('section', 'ms-model-settings');
    modelSettings.append(element('h3', '', '默认模型与角色对白'));
    renderAssignment(view.agents.find(agent => agent.id === 'default'), modelSettings, false,
      '默认通用节点与模型是所有分配的最终回退。角色优先使用显式覆盖或统一对白；系统与角色数据不继承统一对白。通用默认也未配置时保持未分配。');
    renderAssignment(view.agents.find(agent => agent.id === 'character_dialogue'), modelSettings, false,
      '十三位角色优先继承此角色扮演（RP）对白模型，不处理角色数据。节点与模型同时清空则回退默认通用模型。');
    const overrides = element('details', 'ms-overrides');
    overrides.append(element('summary', '', '按角色单独设置'));
    const overrideBody = element('div', 'ms-overrides-body');
    overrideBody.append(element('p', 'ms-hint', '单独指定节点与模型即可覆盖该角色。节点未选、模型留空时继承统一对白，统一对白未分配时回退默认通用模型；旧预设中已保存的单角色分配会保留。'));
    view.agents.filter(agent => characterIds.has(agent.id))
      .forEach(agent => renderAssignment(agent, overrideBody, true));
    overrides.append(overrideBody);
    advancedBody.append(overrides);
    const system = element('section', 'ms-system');
    system.append(element('h4', '', '系统与数据 · 独立分配'),
      element('p', 'ms-hint', '这里列出默认模型、统一对白和十三位角色覆盖之外的全部实际目录身份，每个身份一行。显式配置优先，否则回退默认通用模型，不继承统一对白；没有通用默认时保持未分配，不会自动挑选节点或探测模型。宿主有限意图裁决的提示词单独设置，不继承对白。典狱长的模型也不走统一对白。'));
    const placed = new Set(['default', 'character_dialogue', ...characterIds]);
    view.agents.forEach(agent => {
      if (!agent || placed.has(agent.id)) return;
      placed.add(agent.id);
      const hint = agent.id === 'character_data'
        ? '角色数据整理不是角色扮演（RP），仅负责整理角色数据；数据操作必须经世界引擎校验，不直接修改世界状态。'
        : agent.id === 'setup_assistant'
          ? '独立开局关系助手：显式分配 → 默认通用模型；不继承角色创建、对白或数据整理。独立提示词可编辑、重置；只在创建器手动请求关系候选，不自动采用、不自动重试。'
        : agent.id === 'world_adjudicator'
          ? '显式模型优先，否则回退默认通用模型，不继承统一对白。没有通用默认时保持未分配。提示词是独立条目，不继承对白，也不改写其他身份的提示词。'
          : agent.id === 'warden'
            ? '显式模型优先，否则回退默认通用模型，不继承统一对白。提示词是否另继承对白由提示词设置决定，不改变这里的模型回退。'
            : '显式配置优先；节点与模型同时清空则回退默认通用模型，不继承统一对白。';
      renderAssignment(agent, system, false, hint);
    });
    advancedBody.append(system);
    advanced.append(advancedBody);
    modelSettings.append(advanced);
    columns.append(connections, modelSettings);
    ui.modelControls.append(columns);
    const footer = element('footer', 'ms-footer');
    footer.append(button('保存预设', () => perform(async () => {
      const body = payload();
      const result = settingsView(await request('/api/settings/save', body));
      const saved = body.id ? result.presets.find(preset => preset.id === body.id) :
        result.presets.find(preset => !view.presets.some(old => old.id === preset.id) && preset.name === body.name);
      view = result;
      modelCache.clear();
      loadPreset(saved ? saved.id : null);
      status('预设已保存。保存不会自动激活；需要时请点击“激活预设”。');
    }), 'ms-primary'));
    const activate = button('激活预设', () => perform(async () => {
      if (dirty) throw new Error('请先保存或放弃当前修改，再激活已保存的预设。');
      const id = draft.id;
      view = settingsView(await request('/api/settings/activate', { id }));
      loadPreset(id);
      status('预设已激活，下一次需要模型的行动将使用该配置。模型调用可能产生费用；固定故事保持原样。');
    }), 'ms-secondary');
    activate.disabled = !draft.id || draft.id === view.activePresetId;
    const remove = button('删除预设', () => {
      if (!draft.id || !window.confirm('确定删除此预设及其保存的密钥？此操作不可撤销；未保存修改也会丢失。')) return;
      perform(async () => {
        view = settingsView(await request('/api/settings/delete', { id: draft.id }));
        modelCache.clear();
        loadPreset(view.activePresetId || null);
        status('预设已删除。');
      });
    }, 'ms-danger');
    remove.disabled = !draft.id;
    footer.append(activate, remove);
    ui.modelControls.append(footer);
    // Runtime preferences save independently and must never dirty a model preset.
    const markModelDirty = event => { if (event.target.isConnected) dirty = true; };
    ui.modelControls.addEventListener('input', markModelDirty);
    ui.modelControls.addEventListener('change', markModelDirty);
    ui.controls.append(ui.modelControls, renderPromptSettings());
    root.append(ui.controls);
    ui.status = element('p', 'ms-status');
    ui.status.setAttribute('aria-live', 'polite');
    ui.status.setAttribute('aria-atomic', 'true');
    root.append(ui.status);
    renderNodes();
    refreshSelectors();
    ui.agentRows.forEach(row => {
      const assigned = draft.assignments[row.agentId] || {};
      row.node.value = assigned.nodeId || '';
      row.thinking.value = assigned.thinkingLevel || 'off';
    });
    refreshModelLists();
    setBusy(busy);
    window.dispatchEvent(new CustomEvent('manosaba-settings-rendered'));
  }

  function initialize() {
    dialog = document.getElementById('options-dialog');
    root = document.getElementById('options-root');
    if (!dialog || !root) throw new Error('页面缺少模型设置对话框。');
    if (dialog.dataset.modelSettingsReady) return;
    dialog.dataset.modelSettingsReady = 'true';
    dialog.classList.add('ms-dialog');
    if (!document.querySelector('link[data-manosaba-settings-css], link[href="/settings.css"], link[href="settings.css"]')) {
      const stylesheet = element('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = '/settings.css';
      stylesheet.dataset.manosabaSettingsCss = 'true';
      document.head.append(stylesheet);
    }
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', () => {
      clearDeveloperInspection();
      if (draft) draft.nodes.forEach(node => { delete node.key; });
      draft = null;
      dirty = false;
      promptDrafts.clear();
      promptCatalog = null;
      promptSelection = 'character_dialogue';
      promptOpen = false;
      token = null;
      modelCache.clear();
      root.replaceChildren();
      ui = null;
    });
  }

  window.openModelSettings = function openModelSettings() {
    if (opening) return opening;
    initialize();
    if (dialog.open) { dialog.focus(); return Promise.resolve(); }
    root.replaceChildren();
    const loading = element('p', 'ms-loading', '正在加载选项设置…');
    const dismiss = button('关闭', () => { if (!busy) dialog.close(); }, 'ms-secondary');
    root.append(loading, dismiss);
    ui = { status: loading, close: dismiss };
    dialog.showModal();
    opening = perform(async () => {
      const [settings, page, options] = await Promise.all([request('/api/settings'), request('/api/view'), request('/api/options')]);
      view = settingsView(settings);
      if (!page || typeof page.csrfToken !== 'string' || !page.csrfToken) throw new Error('未能取得安全令牌，请关闭后重试。');
      runtimeOptions = runtimeView(options);
      token = page.csrfToken;
      loadPreset(view.activePresetId || (view.presets[0] && view.presets[0].id) || null);
      announceRuntimeOptions();
    }).finally(() => { opening = null; });
    return opening;
  };
})();
