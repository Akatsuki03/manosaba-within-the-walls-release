const LIMITS = Object.freeze({ actors: 16, actionChain: 12, assessments: 8, goals: 3, nextSteps: 4,
  relationships: 16, socialRequests: 8, sourceObservationIds: 8, reviewTriggers: 11 });
const MAX_ACTOR_BYTES = 14 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const PSYCHOLOGY_RUNTIME = 'agent-prison-runtime@2';
const REQUEST_STATUSES = ['pending', 'deferred', 'accepted', 'answered', 'declined', 'expired', 'cancelled', 'closed', 'fulfilled', 'superseded'];
const SELECTION_REASONS = ['reaction', 'direct_target', 'request_due', 'runtime_pending', 'broadcast_received',
  'new_perception', 'goal_review_due', 'public_clock', 'local_trigger', 'review_resumed', 'prior_reply'];
const BLOCK_REASONS = ['inactive', 'procedure_blocked', 'not_reaction', 'no_trigger', 'review_cooldown', 'rotation_limit',
  'no_continuation', 'per_actor_budget', 'scene_actor_budget', 'decision_budget', 'beat_budget', 'execution_budget',
  'public_event_budget', 'scene_stop', 'ballot'];
const STOP_REASONS = ['phase_transition', 'world_interrupt', 'departure', 'threat', 'player_ask'];
const SCHEDULING_LABELS = Object.freeze({ reaction: '待处理威胁反应', direct_target: '玩家明确交谈对象', request_due: '已送达交流请求到复核时间',
  runtime_pending: '宿主待处理事件', broadcast_received: '收到新广播', new_perception: '取得新的本人见闻', goal_review_due: '目标到复核时间',
  public_clock: '公共时钟复核', local_trigger: '当前场景交流触发', review_resumed: '上一拍复核后有进行中目标', prior_reply: '上一拍收到明确回应',
  inactive: '角色当前不可行动', procedure_blocked: '当前程序阶段不允许', not_reaction: '不是当前威胁反应对象', no_trigger: '没有当前调度触发',
  review_cooldown: '目标复核仍在宿主冷却期', rotation_limit: '本拍轮转名额已用尽', no_continuation: '没有同场景续拍授权',
  per_actor_budget: '每人决定预算已用尽', scene_actor_budget: '场景参与角色预算已用尽', decision_budget: '场景总决定预算已用尽',
  beat_budget: '场景节拍预算已用尽', execution_budget: '执行时间预算已关闭新拍', public_event_budget: '公开事件篇幅预算不足',
  scene_stop: '场景已停止续拍', ballot: '投票阶段不调度自主节拍', phase_transition: '程序阶段切换', world_interrupt: '世界事件中断',
  departure: '在场角色离开', threat: '出现新威胁', player_ask: '交还玩家回答', unrecorded: '未记录（unrecorded）' });
const schedulingLabel = reason => SCHEDULING_LABELS[reason];
const REJECTION_LABELS = Object.freeze({ target_unavailable: '目标不可用', communication_unavailable: '交流不可用',
  destination_unavailable: '移动目的地不可用', reading_unavailable: '阅读不可用', case_step_unavailable: '案件步骤不可用',
  report_unavailable: '通报不可用', inspection_unavailable: '检查不可用', presentation_unavailable: '出示材料不可用',
  operation_unsupported: '不支持该操作', communication_mode_unavailable: '交流方式不可用' });
const REJECTION_REASONS = Object.freeze(Object.keys(REJECTION_LABELS));
const rejectionLabel = reason => reason === 'unrecorded' ? '未记录（unrecorded），不作推测' : REJECTION_LABELS[reason];
const unavailable = '角色观察资料暂不可用。请点击「刷新」手动重试。';
const invalid = () => { throw new Error('Invalid developer observation'); };
// Read only own data properties, including for optional known fields. Unknown
// getters are never touched; a getter on a used field fails before execution.
const record = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return new Proxy(value, { get(target, key) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (!descriptor) return undefined;
    if (!Object.hasOwn(descriptor, 'value')) invalid();
    return descriptor.value;
  } });
};
const text = (value, maximum = 400) => { if (typeof value !== 'string' || value.length > maximum) invalid(); return value; };
const id = value => { if (!text(value, 128).trim()) invalid(); return value; };
const boolean = value => { if (typeof value !== 'boolean') invalid(); return value; };
const integer = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) invalid(); return value;
};
const time = value => { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) invalid(); return value; };
const choice = (value, values) => { if (!values.includes(value)) invalid(); return value; };
const array = (value, maximum, project) => {
  if (!Array.isArray(value)) invalid();
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value;
  integer(length, 0, maximum);
  const result = [];
  for (let index = 0; index < length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid();
    result.push(project(descriptor.value));
  }
  return result;
};
const list = (value, maximum, project) => array(value, maximum, entry => project(record(entry)));
const confidence = value => choice(value, ['uncertain', 'likely']);
const reference = value => value === undefined ? undefined : text(value, 128);
const sourceIds = value => {
  const result = array(value, LIMITS.sourceObservationIds, source => id(source));
  if (new Set(result).size !== result.length) invalid();
  return result;
};
function runtimeMetadata(input) {
  if (input === undefined) return undefined;
  const value = record(input);
  if (![PSYCHOLOGY_RUNTIME, 'agent-prison-runtime@3'].includes(value.id)) return undefined;
  if (value.psychologicalInitialization !== 1) invalid();
  return { id: value.id, policyRef: id(value.policyRef), psychologicalInitialization: 1 };
}

// Count the serialized allowlist only, without serializing untrusted input or
// invoking toJSON/iterators/getters. Lone surrogates use JSON's six-byte escape.
function payloadBytes(value) {
  if (value === null) return 4;
  if (typeof value === 'boolean') return value ? 4 : 5;
  if (typeof value === 'number') return String(value).length;
  if (typeof value === 'string') {
    let size = 2;
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      if (code === 34 || code === 92) size += 2;
      else if (code < 32) size += [8, 9, 10, 12, 13].includes(code) ? 2 : 6;
      else if (code >= 0xd800 && code <= 0xdbff && value.charCodeAt(index + 1) >= 0xdc00
        && value.charCodeAt(index + 1) <= 0xdfff) { size += 4; index++; }
      else if (code >= 0xd800 && code <= 0xdfff) size += 6;
      else size += code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
    }
    return size;
  }
  if (Array.isArray(value)) return 2 + Math.max(0, value.length - 1) + value.reduce((sum, row) => sum + payloadBytes(row), 0);
  let size = 2; let count = 0;
  for (const [key, child] of Object.entries(value)) if (child !== undefined) {
    size += Number(count++ > 0) + payloadBytes(key) + 1 + payloadBytes(child);
  }
  return size;
}
function freezeDiagnostic(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeDiagnostic(child);
    Object.freeze(value);
  }
  return value;
}
function schedulingHistory(input, worldTime, revision) {
  return list(input, LIMITS.actionChain, row => {
    const at = time(row.at); if (at > worldTime) invalid();
    const selected = boolean(row.selected); const execution = choice(row.execution, ['accepted', 'rejected', 'not_executed', 'not_selected']);
    if (selected === (execution === 'not_selected')) invalid();
    const reason = choice(row.reason, selected ? SELECTION_REASONS : BLOCK_REASONS);
    const codes = (value, allowed) => {
      const result = array(value, allowed.length, code => choice(code, allowed));
      if (new Set(result).size !== result.length) invalid(); return result;
    };
    const triggers = codes(row.triggers, SELECTION_REASONS); const blockers = codes(row.blockers, BLOCK_REASONS);
    if (selected ? blockers.length > 0 || !triggers.includes(reason) : !blockers.includes(reason)) invalid();
    const decisionAt = row.decisionAt === null ? null : time(row.decisionAt);
    if (['accepted', 'rejected'].includes(execution) ? decisionAt === null || decisionAt < at || decisionAt > worldTime : decisionAt !== null) invalid();
    let rejectionReason;
    if (Object.hasOwn(row, 'rejectionReason')) {
      if (execution !== 'rejected') invalid();
      rejectionReason = choice(row.rejectionReason, REJECTION_REASONS);
    }
    const budget = record(row.budget); const used = record(budget.used);
    const beats = integer(budget.beats, 1, 3); const actors = integer(budget.actors, 1, 3);
    const decisions = integer(budget.decisions, 1, 6); const perActor = integer(budget.perActor, 1, 2);
    const terminal = boolean(row.terminal); const beat = integer(row.beat, 1, terminal ? 4 : 3);
    if (terminal && selected) invalid();
    return { at, sceneRevision: integer(row.sceneRevision, 1, revision), beat, phase: choice(row.phase, ['reaction', 'npc']),
      terminal, selected, reason, triggers, blockers, execution, decisionAt,
      ...(rejectionReason === undefined ? {} : { rejectionReason }),
      stopReason: row.stopReason === null ? null : choice(row.stopReason, STOP_REASONS),
      budget: { beats, actors, decisions, perActor, used: { beats: integer(used.beats, 0, beats),
        actors: integer(used.actors, 0, actors), decisions: integer(used.decisions, 0, decisions),
        actorDecisions: integer(used.actorDecisions, 0, perActor) } } };
  });
}
function schedulingMetadata(input, actor, worldTime, revision) {
  const value = record(input); if (value.version !== 1) invalid();
  const history = record(value.history); const current = record(value.current);
  const lastConsideredAt = history.lastConsideredAt === null ? null : time(history.lastConsideredAt);
  if (lastConsideredAt !== null && lastConsideredAt > worldTime) invalid();
  let latestDecision = null;
  if (history.latestDecision !== null) {
    const row = record(history.latestDecision); const at = time(row.at); if (at > worldTime) invalid();
    const accepted = boolean(row.accepted);
    latestDecision = { at, accepted, reason: choice(row.reason, accepted ? ['unrecorded'] : ['unrecorded', ...REJECTION_REASONS]) };
  }
  const reviewTriggers = list(current.reviewTriggers, LIMITS.reviewTriggers, row => {
    if (row.kind === 'goal-review-due') {
      const goalId = text(row.goalId, 128); const status = choice(row.status, ['active', 'paused']); const reviewAt = time(row.reviewAt);
      if (reviewAt > worldTime || !actor.goals.some(goal => goal.id === goalId && goal.status === status && goal.reviewAt === reviewAt)) invalid();
      return { kind: row.kind, goalId, status, reviewAt };
    }
    if (row.kind !== 'social-request-open') invalid();
    const requestId = text(row.requestId, 128); const status = choice(row.status, ['pending', 'deferred']); const deadline = time(row.deadline);
    if (row.reviewAt !== null || deadline <= worldTime || !actor.socialRequests?.some(entry => entry.id === requestId
      && entry.status === status && entry.deadline === deadline)) invalid();
    return { kind: row.kind, requestId, status, deadline, reviewAt: null };
  });
  const keys = reviewTriggers.map(row => `${row.kind}:${row.goalId ?? row.requestId}`);
  if (new Set(keys).size !== keys.length
    || reviewTriggers.filter(row => row.kind === 'goal-review-due').length > LIMITS.goals
    || reviewTriggers.filter(row => row.kind === 'social-request-open').length > LIMITS.socialRequests) invalid();
  if (actor.sceneActivity && lastConsideredAt !== actor.sceneActivity.lastConsideredAt) invalid();
  const recent = history.recent === undefined ? undefined : schedulingHistory(history.recent, worldTime, revision);
  const selectionReason = choice(history.selectionReason, ['unrecorded', ...SELECTION_REASONS]);
  const nonSelectionReason = choice(history.nonSelectionReason, ['unrecorded', ...BLOCK_REASONS]);
  if (selectionReason !== (recent?.findLast(row => row.selected)?.reason ?? 'unrecorded')
    || nonSelectionReason !== (recent?.findLast(row => !row.selected)?.reason ?? 'unrecorded')) invalid();
  if (latestDecision && history.latestDecision !== null) {
    const source = record(history.latestDecision);
    if (source.selectionReason !== undefined) {
      latestDecision.selectionReason = choice(source.selectionReason, SELECTION_REASONS);
      if (!recent?.some(row => row.selected && row.reason === latestDecision.selectionReason && row.decisionAt === latestDecision.at
        && row.execution === (latestDecision.accepted ? 'accepted' : 'rejected'))) invalid();
    }
  }
  return freezeDiagnostic({ version: 1, history: { lastConsideredAt, latestDecision, selectionReason, nonSelectionReason,
    ...(recent === undefined ? {} : { recent, truncated: boolean(history.truncated) }) }, 
  current: { eligibility: choice(current.eligibility, ['unknown']), coverage: choice(current.coverage, ['partial']),
    reviewTriggers, truncated: boolean(current.truncated) } });
}

// Copy only this DTO's documented summaries. Unknown fields (including model
// reasoning, proposals and source bodies) are never traversed or retained.
function observation(input) {
  const value = record(input);
  if (value.version !== 1 || value.audience !== 'developer-only' || value.committedOnly !== true) invalid();
  const worldTime = time(value.worldTime);
  const runtimeRevision = runtimeMetadata(value.runtimeRevision);
  const actors = list(value.actors, LIMITS.actors, actor => {
    const result = {
      id: id(actor.id), name: text(actor.name, 128), isPlayer: boolean(actor.isPlayer),
      location: actor.location === null ? null : text(actor.location, 80),
      subjectiveStatus: choice(actor.subjectiveStatus, ['available', 'not-recorded', 'unsupported']),
      actionChain: list(actor.actionChain, LIMITS.actionChain, row => {
        const at = time(row.at); if (at > worldTime) invalid();
        return { at, kind: choice(row.kind, ['decision', 'enactment', 'movement']),
          accepted: row.accepted === null ? null : boolean(row.accepted), summary: text(row.summary) };
      }),
      assessments: list(actor.assessments, LIMITS.assessments, row => ({ id: text(row.id, 128),
        summary: text(row.summary), confidence: confidence(row.confidence), contradicts: reference(row.contradicts) })),
      attitudeTowardPlayer: null,
      goals: list(actor.goals, LIMITS.goals, row => ({ id: text(row.id, 128), summary: text(row.summary),
        priority: integer(row.priority, 1, 3), status: choice(row.status, ['active', 'paused', 'completed']), reviewAt: time(row.reviewAt) })),
      nextSteps: list(actor.nextSteps, LIMITS.nextSteps, row => {
        const at = time(row.at); if (at <= worldTime) invalid();
        return { at, destination: text(row.destination, 80) };
      }),
      truncated: boolean(actor.truncated),
    };
    if (actor.attitudeTowardPlayer !== null) {
      const row = record(actor.attitudeTowardPlayer);
      result.attitudeTowardPlayer = { id: text(row.id, 128), summary: text(row.summary), confidence: confidence(row.confidence),
        distance: integer(row.distance, -3, 3), previousId: reference(row.previousId) };
    }
    if (runtimeRevision) {
      if (!result.isPlayer && actor.causalInitialization !== undefined) {
        const row = record(actor.causalInitialization);
        if (row.revision !== runtimeRevision.id) invalid();
        result.causalInitialization = { revision: row.revision, seeded: boolean(row.seeded) };
      }
      // Do not even traverse new subjective fields on a player or an actor
      // without recorded subjective state, including unknown source bodies.
      if (!result.isPlayer && result.subjectiveStatus === 'available' && actor.relationships !== undefined) {
        result.relationships = list(actor.relationships, LIMITS.relationships, row => ({ id: text(row.id, 128),
          targetHandle: id(row.targetHandle), targetName: row.targetName === null ? null : text(row.targetName, 128),
          summary: text(row.summary), confidence: confidence(row.confidence), distance: integer(row.distance, -3, 3),
          sourceObservationIds: sourceIds(row.sourceObservationIds), previousId: reference(row.previousId) }));
        if (new Set(result.relationships.map(row => row.targetHandle)).size !== result.relationships.length) invalid();
      }
      if (actor.socialRequests !== undefined) {
        result.socialRequests = list(actor.socialRequests, LIMITS.socialRequests, row => ({ id: text(row.id, 128),
          senderHandle: id(row.senderHandle), senderName: row.senderName === null ? null : text(row.senderName, 128),
          status: choice(row.status, REQUEST_STATUSES), deadline: time(row.deadline),
          sourceObservationIds: sourceIds(row.sourceObservationIds) }));
      }
      if (actor.sceneActivity !== undefined) {
        const row = record(actor.sceneActivity); const committedBeatCount = integer(row.committedBeatCount);
        const lastConsideredAt = row.lastConsideredAt === null ? null : time(row.lastConsideredAt);
        if (lastConsideredAt !== null && lastConsideredAt > worldTime) invalid();
        const recentBeats = list(row.recentBeats, LIMITS.actionChain, beat => {
          const at = time(beat.at); if (at > worldTime) invalid();
          const sceneRevision = beat.sceneRevision === undefined ? undefined : integer(beat.sceneRevision, 1, integer(value.revision));
          return { at, sceneBeat: integer(beat.sceneBeat, 1, 3), accepted: boolean(beat.accepted),
            ...(sceneRevision === undefined ? {} : { sceneRevision }) };
        });
        if (recentBeats.length > committedBeatCount) invalid();
        result.sceneActivity = { committedBeatCount, acceptedBeatCount: integer(row.acceptedBeatCount, 0, committedBeatCount),
          lastConsideredAt, recentBeats };
        if (row.perSceneBudget !== undefined) {
          const budget = record(row.perSceneBudget);
          const projected = { beats: integer(budget.beats, 1, 3),
            decisions: integer(budget.decisions, 1, 6), perActor: integer(budget.perActor, 1, 2), used: null };
          if (budget.used !== undefined && budget.used !== null) {
            const used = record(budget.used);
            if (used.revision !== value.revision) invalid();
            const decisions = integer(used.decisions, 0, projected.decisions);
            projected.used = { revision: used.revision, beats: integer(used.beats, 0, projected.beats), decisions,
              actorDecisions: integer(used.actorDecisions, 0, Math.min(projected.perActor, decisions)) };
          }
          result.sceneActivity.perSceneBudget = projected;
        }
      }
    }
    // Even an incorrectly populated response cannot invent the player's inner
    // life or decisions. Their committed, visible action history is still useful.
    if (result.isPlayer || result.subjectiveStatus !== 'available') {
      result.assessments = []; result.attitudeTowardPlayer = null; result.goals = [];
    }
    if (result.isPlayer) result.nextSteps = [];
    if (runtimeRevision && value.supported === true && !result.isPlayer && actor.scheduling !== undefined) {
      result.scheduling = schedulingMetadata(actor.scheduling, result, worldTime, integer(value.revision));
    }
    if (runtimeRevision && payloadBytes(result) > MAX_ACTOR_BYTES) invalid();
    return result;
  });
  if (new Set(actors.map(actor => actor.id)).size !== actors.length) invalid();
  const result = { generation: integer(value.generation), revision: integer(value.revision), worldTime,
    supported: boolean(value.supported), subjectiveLabel: text(value.subjectiveLabel), actors,
    ...(runtimeRevision ? { runtimeRevision } : {}) };
  if (runtimeRevision && payloadBytes({ version: 1, audience: 'developer-only', committedOnly: true, ...result }) > MAX_RESPONSE_BYTES) invalid();
  return result;
}

const elapsed = seconds => {
  const whole = Math.floor(seconds);
  return `+${Math.floor(whole / 60)}分${String(whole % 60).padStart(2, '0')}秒`;
};
const certainty = value => value === 'likely' ? '较可能 · 仍为主观判断' : '不确定 · 主观判断';

// An isolated read-only observer: no gameplay state, composer, storage, model
// contexts or story DOM is written. Only an enabled, visible current head is read.
export function mountDeveloperPanel({ document, window, fetch, getView, getToken, isEnabled, isGameVisible }) {
  const root = document.getElementById('developer-panel');
  const game = document.getElementById('game-screen');
  if (!root || !game) return { sync() {} };
  const schedule = window.setTimeout.bind(window);
  const cancel = window.clearTimeout.bind(window);
  const Controller = window.AbortController || globalThis.AbortController;
  let scope; let generation; let snapshot; let ui; let selectedId = ''; let readPosition = 0;
  let controller; let timeout; let epoch = 0; let attempted = false; let active = false; let suspended = false;

  function element(tag, content, className) {
    const node = document.createElement(tag);
    if (content !== undefined) node.textContent = content;
    if (className) node.className = className;
    return node;
  }
  function head() {
    const view = getView();
    return Number.isSafeInteger(view?.generation) && view.generation >= 0 && Number.isSafeInteger(view.revision) && view.revision >= 0
      ? { generation: view.generation, revision: view.revision } : null;
  }
  const key = view => view ? `${view.generation}:${view.revision}` : undefined;
  const visible = () => !suspended && isEnabled() === true && isGameVisible() === true
    && !document.hidden && document.visibilityState !== 'hidden';
  function stop() {
    epoch++; cancel(timeout); timeout = undefined;
    const previous = controller; controller = undefined; previous?.abort();
  }
  function remember() { if (ui?.rendered) readPosition = ui.content.scrollTop; }
  function clear() {
    snapshot = undefined;
    if (ui) {
      ui.content.replaceChildren(); ui.select.replaceChildren();
      ui.meta.textContent = ''; ui.status.textContent = '';
    }
    root.replaceChildren(); root.hidden = true; root.setAttribute('aria-busy', 'false');
    delete root.dataset.status;
    game.classList.toggle('developer-mode', false); ui = undefined;
  }
  function build() {
    if (ui) return;
    const title = element('h2', '开发人员 · 角色观察'); title.id = 'developer-panel-title';
    const refresh = element('button', '刷新', 'developer-refresh'); refresh.type = 'button';
    refresh.setAttribute('aria-label', '刷新已提交的角色观察资料');
    const heading = element('div', undefined, 'developer-heading'); heading.append(title, refresh);
    const warning = element('p', '剧透 · 只读 · 主观记录并非事实或模型思维链。仅观察当前已提交快照；刷新不会补建心理状态、重新调度、调用模型或推进剧情。', 'developer-warning');
    const meta = element('p', '', 'developer-meta');
    const status = element('p', '', 'developer-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const label = element('label', '观察角色'); label.htmlFor = 'developer-actor-select';
    const select = element('select'); select.id = 'developer-actor-select'; select.disabled = true;
    const picker = element('div', undefined, 'developer-picker'); picker.append(label, select);
    const content = element('div', undefined, 'developer-content'); content.id = 'developer-actor-content'; content.tabIndex = 0;
    content.setAttribute('aria-label', '所选角色的已提交观察记录'); select.setAttribute('aria-controls', content.id);
    root.append(heading, warning, meta, status, picker, content);
    ui = { refresh, meta, status, label, select, content, rendered: false };
    refresh.addEventListener('click', () => { if (!controller && visible()) sync(true); });
    select.addEventListener('change', () => {
      if (!snapshot || !visible() || key(snapshot) !== key(head())) return;
      if (!snapshot.actors.some(actor => actor.id === select.value)) return;
      selectedId = select.value; readPosition = 0; paintActor();
    });
    content.addEventListener('scroll', () => {
      if (ui?.content === content && ui.rendered && snapshot) readPosition = content.scrollTop;
    });
  }
  function message(content, state) {
    build(); ui.status.textContent = content; root.dataset.status = state;
    ui.refresh.disabled = !!controller; root.setAttribute('aria-busy', String(!!controller));
  }
  function loading(currentHead) {
    remember(); build();
    ui.meta.textContent = `分支 ${currentHead.generation} · 修订 ${currentHead.revision} · 仅已提交记录`;
    ui.select.replaceChildren(); ui.select.disabled = true; ui.content.replaceChildren(); ui.rendered = false;
    message('正在读取已提交的角色记录…', 'loading');
  }
  function section(title, name) {
    const node = element('section', undefined, 'developer-record-section'); node.dataset.developerSection = name;
    node.append(element('h4', title)); ui.content.append(node); return node;
  }
  function rows(parent, values, render) {
    const list = element('ul', undefined, 'developer-record-list');
    for (const value of values) { const item = element('li'); render(item, value); list.append(item); }
    parent.append(list);
  }
  function empty(parent, content) { parent.append(element('p', content, 'developer-empty')); }
  function paintActor() {
    if (!snapshot || !ui) return;
    const actor = snapshot.actors.find(value => value.id === selectedId);
    ui.content.replaceChildren(); ui.rendered = true;
    if (!actor) { empty(ui.content, '当前没有可观察的角色。'); return; }
    ui.content.append(element('h3', `${actor.name || '未命名角色'}${actor.isPlayer ? '（玩家）' : ''}`),
      element('p', `所在地：${actor.location ?? '未知'}`, 'developer-actor-location'));
    if (actor.truncated) ui.content.append(element('p', '仅显示有限的近期记录；部分较早条目已省略。', 'developer-truncated'));
    const history = section('已提交行动链', 'actions');
    if (!snapshot.supported) empty(history, '当前场景不支持角色行动链。');
    else if (!actor.actionChain.length) empty(history, '尚无已提交行动记录。');
    else rows(history, actor.actionChain, (item, row) => {
      const kind = row.kind === 'movement' ? '已发生移动' : row.kind === 'enactment' ? '已呈现行动'
        : `决定 · ${row.accepted === true ? '已采纳' : row.accepted === false ? '未采纳' : '是否采纳未知'}`;
      item.append(element('small', `${elapsed(row.at)} · ${kind}`), element('p', row.summary || '未记录摘要。'));
    });
    const thoughts = section('当前想法（主观记录）', 'subjective');
    thoughts.append(element('p', snapshot.subjectiveLabel, 'developer-subjective-label'));
    const subjective = snapshot.supported && actor.subjectiveStatus === 'available' && !actor.isPlayer;
    if (actor.isPlayer) empty(thoughts, '玩家的想法与选择由你决定；不会生成玩家内心。');
    else if (!snapshot.supported || actor.subjectiveStatus === 'unsupported') empty(thoughts, '当前场景不支持角色主观记录。');
    else if (!subjective || !actor.assessments.length) empty(thoughts, '尚无已提交的主观判断。');
    else rows(thoughts, actor.assessments, (item, row) => {
      item.append(element('small', certainty(row.confidence)), element('p', row.summary || '未记录摘要。'));
      if (row.contradicts) item.append(element('small', `修正 / 相反记录：${row.contradicts}`));
    });
    const attitude = section('对玩家的态度', 'attitude');
    if (actor.isPlayer) empty(attitude, '玩家自身态度不作推测。');
    else if (!snapshot.supported || actor.subjectiveStatus === 'unsupported') empty(attitude, '当前场景不支持态度记录；态度未知。');
    else if (!subjective || !actor.attitudeTowardPlayer) empty(attitude, '未知 · 尚无已提交的态度记录；不代表中立。');
    else {
      const row = actor.attitudeTowardPlayer;
      attitude.append(element('small', certainty(row.confidence)), element('p', row.summary || '未记录摘要。'),
        element('p', `关系距离：${row.distance}（主观量表 -3～3）`, 'developer-distance'));
      if (row.previousId) attitude.append(element('small', `接续记录：${row.previousId}`));
    }
    if (snapshot.runtimeRevision) {
      const initialization = section('初始化修订与已提交场景节拍', 'initialization');
      initialization.append(element('p', `运行时修订：${snapshot.runtimeRevision.id}`),
        element('p', `执行策略：${snapshot.runtimeRevision.policyRef} · 心理初始化版本：${snapshot.runtimeRevision.psychologicalInitialization}`));
      if (actor.isPlayer) empty(initialization, '玩家内心不作推测；不展示玩家心理初始化。');
      else if (!actor.causalInitialization) empty(initialization, '尚无心理初始化记录。');
      else initialization.append(element('p', actor.causalInitialization.seeded
        ? '已记录根节点心理初始化；只读取现有已提交主观状态。' : '尚无已提交心理状态；不会为观察面板补建。'));
      if (actor.sceneActivity) {
        const activity = actor.sceneActivity;
        initialization.append(element('p', `已提交节拍决定：${activity.committedBeatCount} · 已采纳：${activity.acceptedBeatCount}`),
          element('p', `最近调度考虑时间：${activity.lastConsideredAt === null ? '尚无已提交记录' : elapsed(activity.lastConsideredAt)}`));
        if (activity.perSceneBudget) {
          const budget = activity.perSceneBudget;
          initialization.append(element('p', `每场景预算：最多 ${budget.beats} 个节拍 / ${budget.decisions} 次决定 / 每角色 ${budget.perActor} 次决定；累计次数不表示当前场景已用预算。`));
          if (budget.used) initialization.append(element('p', `当前修订 ${budget.used.revision} 的场景已用：${budget.used.beats}/${budget.beats} 个节拍 · 全体决定 ${budget.used.decisions}/${budget.decisions} · 本角色决定 ${budget.used.actorDecisions}/${budget.perActor}。`));
          else empty(initialization, '当前场景已用预算未知 · 已提交决定缺少场景边界标识，不作推测。');
        }
        if (activity.recentBeats.length) rows(initialization, activity.recentBeats, (item, beat) => {
          item.append(element('small', `${elapsed(beat.at)} · 场景节拍 ${beat.sceneBeat} · ${beat.accepted ? '已采纳' : '未采纳'}`));
        });
      } else empty(initialization, '尚无已提交的场景节拍计数。');
      const scheduling = section('调度诊断（只读、有限记录）', 'scheduling');
      scheduling.append(element('p', '已记录决定与当前待复核触发分开展示；不会重跑调度器。当前触发不是历史入选或未入选原因，也不保证下一轮入选。', 'developer-subjective-label'));
      if (actor.isPlayer) empty(scheduling, '玩家不参与自主角色调度；不推测玩家的入选原因。');
      else if (!actor.scheduling) empty(scheduling, '未知 · 尚无可用调度诊断；不会补造历史原因。');
      else {
        const { history, current } = actor.scheduling;
        scheduling.append(element('h5', '已记录的最近决定'),
          element('p', `最近调度考虑时间：${history.lastConsideredAt === null ? '未记录（unrecorded）' : elapsed(history.lastConsideredAt)}；不代表当前轮已入选。`));
        if (history.latestDecision) scheduling.append(element('p', `${elapsed(history.latestDecision.at)} · ${history.latestDecision.accepted ? '已采纳' : '未采纳'}；${history.latestDecision.accepted ? '采纳' : '未采纳操作'}原因：${rejectionLabel(history.latestDecision.reason)}。`));
        else empty(scheduling, '尚无已记录决定；不能据此断定未入选。');
        if (history.latestDecision?.selectionReason) scheduling.append(element('p', `该决定的入选原因：${schedulingLabel(history.latestDecision.selectionReason)}；入选原因不等于操作采纳原因。`));
        scheduling.append(element('p', `历史入选原因：${schedulingLabel(history.selectionReason)}；历史未入选原因：${schedulingLabel(history.nonSelectionReason)}。`));
        if (history.recent?.length) {
          scheduling.append(element('h5', '宿主封存的逐拍调度记录'),
            element('p', '以下均随最终世界原子提交；模型任务完成不等于实际执行。预算按已授权任务计费，未执行的同拍候选也不会伪装成已执行决定。'));
          rows(scheduling, history.recent, (item, row) => {
            const outcome = { accepted: '已执行 · 操作已采纳', rejected: '已执行检查 · 操作未采纳', not_executed: '已入选但未执行', not_selected: '未入选' }[row.execution];
            item.append(element('small', `修订 ${row.sceneRevision} · ${row.terminal ? `续拍检查 ${row.beat}` : `场景节拍 ${row.beat}`} · ${elapsed(row.at)} · ${row.phase === 'reaction' ? '威胁反应' : '普通调度'}`),
              element('p', `${outcome}；${row.selected ? '入选' : '未入选'}原因：${schedulingLabel(row.reason)}。`));
            if (row.execution === 'rejected') item.append(element('p', `未采纳操作原因：${rejectionLabel(row.rejectionReason ?? 'unrecorded')}。`));
            if (row.blockers.length) item.append(element('p', `预算 / 条件阻挡：${row.blockers.map(schedulingLabel).join('；')}。`));
            const { budget } = row; const { used } = budget;
            item.append(element('small', `调度前已用：节拍 ${used.beats}/${budget.beats} · 场景参与 ${used.actors}/${budget.actors} · 决定 ${used.decisions}/${budget.decisions} · 本人 ${used.actorDecisions}/${budget.perActor}。`));
            if (row.execution === 'not_executed' && row.stopReason) item.append(element('p', `实际中断：${schedulingLabel(row.stopReason)}；没有该角色的执行收据。`));
          });
          if (history.truncated) empty(scheduling, '逐拍调度历史为有界尾部；更早记录已省略，未记录的历史仍未知。');
        }
        scheduling.append(element('h5', '当前待复核触发（非实际调度结论）'),
          element('p', '当前资格 / 是否入选：未知（unknown）。仅覆盖有限的已记录目标复核时间与未到期交流请求；未核实冷却、轮转、场景预算、在场或其他调度条件。'));
        if (!current.reviewTriggers.length) empty(scheduling, '当前有限记录中没有待复核触发；不代表没有其他触发或不符合调度资格。');
        else rows(scheduling, current.reviewTriggers, (item, trigger) => {
          if (trigger.kind === 'goal-review-due') item.append(element('p', `目标 ${trigger.goalId || '（无标识）'} · ${trigger.status === 'paused' ? '已暂停，复核不自动恢复' : '进行中'} · 已到复核时间 ${elapsed(trigger.reviewAt)}；是否可入选仍未知。`));
          else item.append(element('p', `交流请求 ${trigger.requestId || '（无标识）'} · ${trigger.status === 'deferred' ? '已延期 · 仍未回应' : '待处理'} · 截止 ${elapsed(trigger.deadline)}；复核时间未知，不能断定已到调度时机。`));
        });
        if (current.truncated) empty(scheduling, '待复核触发仅为有界片段；部分目标、请求或触发已省略。');
      }
      const relations = section('单向关系（本人主观记录）', 'relationships');
      relations.append(element('p', '只表示所选角色对目标的当前看法，不代表对方态度、双向关系或客观事实。', 'developer-subjective-label'));
      if (actor.isPlayer) empty(relations, '玩家对他人的内心态度不作推测。');
      else if (!subjective || !actor.relationships?.length) empty(relations, '未知 · 尚无已提交的单向关系记录；不代表中立。');
      else rows(relations, actor.relationships, (item, row) => {
        item.append(element('h5', `${actor.name} → ${row.targetName || row.targetHandle}`),
          element('small', `${certainty(row.confidence)} · 关系距离：${row.distance}（-3～3）`),
          element('p', row.summary || '未记录摘要。'), element('small', `目标标识：${row.targetHandle}`));
        if (row.sourceObservationIds.length) item.append(element('small', `来源观察标识：${row.sourceObservationIds.join('、')}`));
        if (row.previousId) item.append(element('small', `接续记录：${row.previousId}`));
      });
      const requests = section('交流请求（待处理与近期状态）', 'social-requests');
      requests.append(element('p', '仅显示已送达请求的发送方、状态、期限与来源标识；请求不保证得到回应。', 'developer-subjective-label'));
      if (!actor.socialRequests?.length) empty(requests, '尚无已提交的交流请求。');
      else rows(requests, actor.socialRequests, (item, row) => {
        const status = { pending: '待处理', deferred: '已延期 · 仍未回应', accepted: '已表态接受 · 尚非完成',
          answered: '已回应', declined: '已拒绝', expired: '已过期', cancelled: '已取消', closed: '已关闭',
          fulfilled: '已完成', superseded: '已被替代' }[row.status];
        item.append(element('h5', `发送方：${row.senderName || row.senderHandle}`),
          element('small', `${status} · 截止时间 ${elapsed(row.deadline)}`), element('small', `发送方标识：${row.senderHandle}`));
        if (row.sourceObservationIds.length) item.append(element('small', `来源观察标识：${row.sourceObservationIds.join('、')}`));
      });
    }
    const future = section('目标与后续行动', 'next');
    future.append(element('p', '目标是当前意向，不保证执行；只列已排定的未来移动，未知的下一步不作推测。', 'developer-subjective-label'));
    future.append(element('h5', '已记录目标'));
    if (actor.isPlayer) empty(future, '玩家的目标与下一步由你决定，不自动生成。');
    else if (!snapshot.supported || actor.subjectiveStatus === 'unsupported') empty(future, '当前场景不支持主观目标记录。');
    else if (!subjective || !actor.goals.length) empty(future, '尚无已提交的目标记录。');
    else rows(future, actor.goals, (item, row) => {
      const status = { active: '进行中', paused: '已暂停', completed: '已完成' }[row.status];
      item.append(element('small', `${status} · 优先级 ${row.priority} · 复核时间 ${elapsed(row.reviewAt)}`), element('p', row.summary || '未记录摘要。'));
    });
    future.append(element('h5', '已排定的未来移动'));
    if (!snapshot.supported || actor.isPlayer || !actor.nextSteps.length) empty(future, '下一步未知 · 没有已排定的未来移动；目标不是行动承诺。');
    else rows(future, actor.nextSteps, (item, row) => { item.append(element('small', elapsed(row.at)), element('p', `前往：${row.destination}`)); });
    ui.content.scrollTop = readPosition;
  }
  function paint() {
    build();
    if (!snapshot.actors.some(actor => actor.id === selectedId)) selectedId = snapshot.actors[0]?.id || '';
    ui.select.replaceChildren(...snapshot.actors.map(actor => {
      const option = element('option', `${actor.name || '未命名角色'}${actor.isPlayer ? '（玩家）' : ''}${actor.location ? ` · ${actor.location}` : ''}`);
      option.value = actor.id; return option;
    }));
    ui.select.value = selectedId; ui.select.disabled = !snapshot.actors.length;
    ui.label.textContent = `观察角色（${snapshot.actors.length}）`;
    ui.meta.textContent = `分支 ${snapshot.generation} · 修订 ${snapshot.revision} · 故事时间 ${elapsed(snapshot.worldTime)}`;
    message(snapshot.supported ? '仅显示当前进度已提交的记录；不会调用模型或推进剧情。' : '当前场景不支持角色观察；不生成替代记录。', 'ready');
    paintActor();
  }
  async function load(currentHead) {
    loading(currentHead);
    const token = getToken();
    if (typeof token !== 'string' || !token || token.length > 1024) {
      message('尚未取得页面安全令牌，请等待当前进度载入后刷新。', 'unavailable'); return;
    }
    attempted = true;
    const ownController = new Controller(); const ownEpoch = epoch;
    controller = ownController; message('正在读取已提交的角色记录…', 'loading');
    const current = () => controller === ownController && epoch === ownEpoch && visible() && key(currentHead) === key(head());
    timeout = schedule(() => {
      if (!current()) return;
      stop(); message(unavailable, 'unavailable');
    }, 8000);
    try {
      const response = await fetch('/api/developer/actors', {
        method: 'GET', mode: 'same-origin', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        headers: { Accept: 'application/json', 'X-Manosaba-Token': token }, signal: ownController.signal,
      });
      if (!current() || ownController.signal.aborted) return;
      if (!response.ok) throw new Error('Developer observation unavailable');
      const result = await response.json();
      if (!current() || ownController.signal.aborted) return;
      const next = observation(result);
      // Equality, not a high-water mark: even a newer committed response must
      // not reveal a future that the main story UI has not caught up with yet.
      if (key(next) !== key(currentHead)) {
        message('观察资料与当前进度尚未对齐。请在剧情更新后点击「刷新」。', 'unavailable'); return;
      }
      snapshot = next; paint();
    } catch {
      if (current()) message(unavailable, 'unavailable');
    } finally {
      if (controller === ownController) {
        cancel(timeout); timeout = undefined; controller = undefined;
        if (ui) { ui.refresh.disabled = false; root.setAttribute('aria-busy', 'false'); }
      }
    }
  }
  function sync(refresh = false) {
    const currentHead = head(); const nextScope = key(currentHead); const enabled = isEnabled() === true;
    const newGeneration = generation !== currentHead?.generation;
    if (newGeneration) { selectedId = ''; readPosition = 0; generation = currentHead?.generation; }
    if (scope !== nextScope) {
      if (!newGeneration) remember();
      stop(); snapshot = undefined; attempted = false; scope = nextScope;
      if (ui) { ui.content.replaceChildren(); ui.rendered = false; ui.select.replaceChildren(); ui.select.disabled = true; }
    }
    if (!enabled || !visible() || !currentHead) {
      if (!newGeneration) remember();
      stop(); clear(); attempted = false; active = false;
      if (!enabled) { selectedId = ''; readPosition = 0; }
      return;
    }
    if (!active || (refresh && !controller)) {
      remember(); stop(); snapshot = undefined; attempted = false; active = true;
    }
    root.hidden = false; game.classList.toggle('developer-mode', true); build();
    if (!snapshot && !attempted && !controller) void load(currentHead);
  }
  document.addEventListener('visibilitychange', () => sync());
  window.addEventListener('pagehide', () => { suspended = true; sync(); });
  window.addEventListener('beforeunload', () => { suspended = true; sync(); });
  window.addEventListener('pageshow', () => { suspended = false; sync(); });
  sync();
  return { sync };
}
