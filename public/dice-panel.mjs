const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const own = (value, key) => value && typeof value === 'object' ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
const text = (value, maximum = 500) => typeof value === 'string' ? value.slice(0, maximum) : '';
const integer = Number.isSafeInteger;
const identifier = value => typeof value === 'string' && value.length <= 160 && value.trim() ? value : '';
const signed = value => `${value >= 0 ? '+' : '−'}${Math.abs(value)}`;
const headKey = value => integer(value?.generation) && integer(value?.revision) ? `${value.generation}:${value.revision}` : undefined;
const rows = (value, maximum, project) => Array.isArray(value) ? value.slice(0, maximum).map(project).filter(Boolean) : [];
const compare = (left, right) => left.generation - right.generation || left.revision - right.revision;

// Public DTO whitelist. Never render host HTML, inspect unknown getters, or
// forward modifiers, DCs, effects or any model-proposed command fields.
function resultRow(value) {
  const id = identifier(own(value, 'id')); const ability = own(value, 'ability');
  const mode = own(value, 'mode'); const die = own(value, 'die');
  const modifier = own(value, 'modifier'); const environmentModifier = own(value, 'environmentModifier');
  const total = own(value, 'total'); const dc = own(value, 'dc'); const success = own(value, 'success');
  if (!id || !ABILITIES.includes(ability) || mode !== 'opportunity' || !integer(die) || die < 1 || die > 20
    || !integer(modifier) || !integer(environmentModifier) || !integer(total) || !integer(dc) || typeof success !== 'boolean') return undefined;
  return { id, label: text(own(value, 'label'), 160), ability, abilityLabel: text(own(value, 'abilityLabel'), 40),
    die, modifier, environmentModifier, total, dc, success };
}
function diceView(value) {
  if (own(value, 'version') !== 1 || typeof own(value, 'available') !== 'boolean'
    || !integer(own(value, 'generation')) || !integer(own(value, 'revision'))) return undefined;
  return { available: own(value, 'available'), generation: own(value, 'generation'), revision: own(value, 'revision'),
    notice: text(own(value, 'notice'), 800), opportunities: rows(own(value, 'opportunities'), 32, row => {
      const id = identifier(own(row, 'id')); const label = text(own(row, 'label'), 160);
      const options = rows(own(row, 'options'), 16, option => {
        const optionId = identifier(own(option, 'id')); const optionLabel = text(own(option, 'label'), 160);
        const ability = own(option, 'ability'); const modifier = own(option, 'modifier');
        const environmentModifier = own(option, 'environmentModifier'); const dc = own(option, 'dc');
        return optionId && optionLabel && ABILITIES.includes(ability) && integer(modifier) && integer(environmentModifier) && integer(dc)
          ? { id: optionId, label: optionLabel, ability, abilityLabel: text(own(option, 'abilityLabel'), 40), modifier, environmentModifier, dc } : undefined;
      });
      return id && label && options.length ? { id, label, options } : undefined;
    }) };
}
function guardState(view) {
  const guard = own(view, 'guardReaction');
  if (own(guard, 'version') !== 1 || own(guard, 'enabled') !== true) return {};
  const pending = own(guard, 'pending'); const resolution = own(guard, 'resolution');
  return { pending: identifier(own(pending, 'id')) && identifier(own(pending, 'opportunityId'))
    && integer(own(pending, 'entryIndex')) && own(pending, 'entryIndex') >= 0
    ? { id: own(pending, 'id'), opportunityId: own(pending, 'opportunityId'), label: text(own(pending, 'label'), 160), entryIndex: own(pending, 'entryIndex') } : undefined,
  resolution: identifier(own(resolution, 'encounterId')) && integer(own(resolution, 'entryIndex')) && own(resolution, 'entryIndex') >= 0
    && resultRow(own(resolution, 'result')) ? { encounterId: own(resolution, 'encounterId'), entryIndex: own(resolution, 'entryIndex'), result: resultRow(own(resolution, 'result')) } : undefined };
}

/** Native, mandatory guard-reaction dialog; the historical export is retained.
 * Reads only GET /api/dice and GET /api/view. A roll is one explicit, whitelisted
 * opportunity command. Its committed view is held until the reader continues.
 */
export function mountDicePanel(rootOrDocument, {
  request, getView = () => undefined, canRoll = () => true, isStoryReady = () => true, isGameVisible = () => true,
  onContinue = () => {}, onViewHeld = () => {}, onBusyChange = () => {}, onActiveChange = () => {}, onExit = () => {},
} = {}) {
  const root = rootOrDocument?.getElementById?.('dice-dialog') || (rootOrDocument?.ownerDocument ? rootOrDocument : undefined);
  const document = root?.ownerDocument || (rootOrDocument?.createElement ? rootOrDocument : undefined);
  const inert = { sync() {}, setBusy() {}, setActive() {}, holdView() {}, isResolutionSeen: () => false, active: false, holding: false };
  if (!root || !document || typeof request !== 'function') return inert;
  let gameView; let snapshot; let attemptedHead; let selectedId; let pendingRequest; let heldView; let lastResult;
  let active = false; let externalBusy = false; let inFlight = false; let reportedBusy = false; let status = ''; let closing = false; let suspended = false;
  let animating = false; let animation; let sequence = 0; let syncing = false;
  const seen = new Set(); const optionButtons = [];
  const motion = document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
  function element(tag, content, className) {
    const node = document.createElement(tag); if (content !== undefined) node.textContent = content;
    if (className) node.className = className; return node;
  }
  function button(label, id) { const node = element('button', label); node.type = 'button'; if (id) node.id = id; return node; }
  const frame = element('div', undefined, 'dice-frame');
  const kicker = element('p', 'REACTION CHECK · d20', 'dice-kicker');
  const title = element('h2', '守卫逼近', 'dice-title'); title.id = 'dice-title'; title.tabIndex = -1;
  const help = element('p', '先选择应对方案，再点击骰子。检定由宿主结算，不调用模型。', 'dice-help'); help.id = 'dice-help';
  const options = element('div', undefined, 'dice-options'); options.id = 'dice-options'; options.setAttribute('role', 'group'); options.setAttribute('aria-label', '选择应对方案');
  const details = element('p', '等待宿主提供检定资料。', 'dice-details'); details.id = 'dice-details';
  const roll = button('', 'dice-roll'); roll.className = 'dice-orb'; roll.setAttribute('aria-label', '选择方案后掷 d20'); roll.setAttribute('aria-describedby', 'dice-details');
  const geometry = element('span', undefined, 'dice-geometry'); geometry.setAttribute('aria-hidden', 'true');
  // Original faceted geometry. No external artwork, physics or random numbers.
  if (document.createElementNS) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 240 260'); svg.setAttribute('focusable', 'false');
    const facets = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    facets.setAttribute('d', 'M120 8 224 68 224 190 120 252 16 190 16 68Z M120 8 170 98 224 68 M170 98 190 174 224 190 M190 174 120 252 50 174 16 190 M50 174 70 98 16 68 M70 98 120 8 M70 98 170 98 190 174 50 174Z M70 98 120 174 170 98 M120 174 120 252');
    svg.append(facets); geometry.append(svg);
  }
  const face = element('span', 'd20', 'dice-face'); face.setAttribute('aria-hidden', 'true'); roll.append(geometry, face);
  const rollHint = element('p', '选择方案 · 点击骰子', 'dice-roll-hint');
  const result = element('section', undefined, 'dice-result'); result.id = 'dice-result'; result.setAttribute('aria-label', '宿主掷骰结果'); result.hidden = true;
  const feedback = element('p', '', 'dice-status'); feedback.id = 'dice-status'; feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); feedback.setAttribute('aria-atomic', 'true');
  const next = button('继续 · 查看后续', 'dice-continue'); next.hidden = true;
  const refresh = button('核对最新世界 / 结果', 'dice-refresh');
  const retry = button('续接同一次检定', 'dice-retry'); retry.hidden = true;
  const recovery = element('div', undefined, 'dice-recovery'); recovery.append(refresh, retry);
  const exits = element('div', undefined, 'dice-exits'); const titleExit = button('返回标题', 'dice-exit-title'); const loadExit = button('读取存档', 'dice-exit-load'); exits.append(titleExit, loadExit);
  const note = element('p', '退出不会撤销检定；回到同一世界仍须完成。连接中断时不会自动重投。', 'dice-help dice-save-help');
  frame.append(kicker, title, help, options, details, roll, rollHint, result, feedback, next, recovery, exits, note);
  root.classList.add('dice-dialog'); root.setAttribute('aria-labelledby', 'dice-title'); root.setAttribute('aria-describedby', 'dice-help'); root.setAttribute('closedby', 'none'); root.replaceChildren(frame);
  const currentView = () => gameView || getView();
  const seenKey = view => {
    const resolution = guardState(view).resolution;
    return resolution ? `manosaba.guard.seen:${view.generation}:${resolution.result.id}` : undefined;
  };
  function isResolutionSeen(view) {
    const key = seenKey(view); if (!key) return false;
    if (seen.has(key)) return true;
    try { return document.defaultView?.sessionStorage?.getItem(key) === '1'; } catch { return false; }
  }
  const guard = () => guardState(currentView());
  const opportunity = () => snapshot?.opportunities.find(item => item.id === guard().pending?.opportunityId);
  const selection = () => opportunity()?.options.find(item => item.id === selectedId);
  const matchingHead = () => snapshot && headKey(snapshot) === headKey(currentView());
  const allowed = () => !externalBusy && canRoll(currentView()) !== false;
  const visible = () => active && !document.hidden;
  function reportBusy() {
    const value = active || !suspended && isGameVisible() && (!!pendingRequest || !!heldView);
    if (value !== reportedBusy) { reportedBusy = value; onBusyChange(value); }
  }
  function paintLocks() {
    const blocked = !visible() || !allowed() || inFlight || !!pendingRequest || !!lastResult;
    for (const node of optionButtons) node.disabled = blocked;
    roll.disabled = blocked || !matchingHead() || !snapshot?.available || !selection();
    roll.setAttribute('aria-label', lastResult ? `d20 点数 ${lastResult.die}` : inFlight ? '正在等待宿主结果' : selection() ? `掷 d20：${selection().label}` : '请先选择应对方案');
    next.hidden = !heldView; next.disabled = !visible() || inFlight || animating || !heldView;
    refresh.disabled = !visible() || inFlight || animating;
    retry.hidden = !pendingRequest?.checked || !!pendingRequest?.rejected || !!lastResult;
    retry.disabled = !visible() || !allowed() || inFlight || !pendingRequest?.checked;
    titleExit.disabled = loadExit.disabled = inFlight || animating;
    root.setAttribute('aria-busy', String(inFlight || animating)); feedback.textContent = status;
    if (lastResult && !animating && !inFlight && active) next.setAttribute('aria-label', `继续查看${lastResult.success ? '成功' : '失败'}检定后的剧情`);
  }
  function paint() {
    const pending = guard().pending;
    title.textContent = lastResult?.label || pending?.label || '守卫逼近';
    options.hidden = !!lastResult; options.replaceChildren(); optionButtons.length = 0;
    for (const option of opportunity()?.options || []) {
      const control = button(option.label); control.dataset.optionId = option.id;
      control.setAttribute('aria-pressed', String(option.id === selectedId));
      control.addEventListener('click', () => {
        if (!control.disabled) { selectedId = option.id; paint(); optionButtons.find(node => node.dataset.optionId === selectedId)?.focus?.({ preventScroll: true }); }
      });
      optionButtons.push(control); options.append(control);
    }
    const chosen = lastResult || selection();
    details.textContent = chosen ? `${chosen.abilityLabel || chosen.ability}检定 · DC ${chosen.dc} · 属性 ${signed(chosen.modifier)} · 环境 ${signed(chosen.environmentModifier)}` : '选择应对方案，查看难度与加值。';
    face.textContent = lastResult ? String(lastResult.die) : inFlight ? '…' : 'd20';
    rollHint.textContent = animating ? '命运落定…' : lastResult ? '宿主已保存此结果' : inFlight ? '等待宿主确认…' : '选择方案 · 点击骰子';
    result.hidden = !lastResult; result.replaceChildren();
    if (lastResult) result.append(element('p', `d20 点数 ${lastResult.die} · 属性 ${signed(lastResult.modifier)} · 环境 ${signed(lastResult.environmentModifier)}`, 'dice-breakdown'),
      element('strong', `${lastResult.total} / DC ${lastResult.dc} · ${lastResult.success ? '成功' : '失败'}`, lastResult.success ? 'dice-success' : 'dice-failure'));
    paintLocks();
  }
  function closeDialog() {
    // HTMLDialogElement.close queues its event: clear active before returning
    // focus/callbacks so a late close event cannot reopen the previous check.
    closing = true; active = false; if (root.open) root.close?.(); closing = false;
    onActiveChange(false); reportBusy();
  }
  function ensureOpen() {
    if (active || suspended || !isGameVisible() || !allowed() || document.hidden) return;
    const state = guard();
    if (!state.pending && !(state.resolution && !isResolutionSeen(currentView())) && !heldView && !pendingRequest) return;
    if (!lastResult && state.pending && !isStoryReady(state.pending.entryIndex)) return;
    if (document.querySelector?.('dialog[open]')) return;
    try { root.showModal(); } catch { return; }
    active = true; suspended = false; onActiveChange(true); reportBusy(); paint();
    (lastResult ? next : optionButtons[0] || title).focus?.({ preventScroll: true });
  }
  function holdView(view) {
    if (!headKey(view) || currentView() && compare(view, currentView()) < 0) return;
    const changedGeneration = gameView && view.generation !== gameView.generation;
    if (changedGeneration) {
      pendingRequest = lastResult = snapshot = undefined; attemptedHead = selectedId = undefined;
      suspended = false; sequence++; animation?.cancel?.(); animating = false;
    }
    heldView = view; gameView = view; onViewHeld(view);
    if (changedGeneration && active) closeDialog();
    reportBusy();
  }
  function showResult(view, row, animate = false) {
    holdView(view); pendingRequest = undefined; lastResult = row; snapshot = undefined; selectedId = undefined;
    status = `d20 点数 ${row.die}，合计 ${row.total}，DC ${row.dc}，${row.success ? '成功' : '失败'}。结果已保存；点击「继续」才显示后续，不会再次结算。`;
    animation?.cancel?.(); animating = false; paint();
    if (animate && !motion?.matches && typeof roll.animate === 'function') {
      animating = true;
      animation = roll.animate([{ transform: 'rotate(-20deg) scale(.86)', filter: 'brightness(1.7)' }, { transform: 'rotate(12deg) scale(1.05)' }, { transform: 'rotate(0) scale(1)', filter: 'brightness(1)' }], { duration: 850, easing: 'cubic-bezier(.2,.8,.3,1)' });
      const token = ++sequence; paintLocks();
      animation.finished.catch(() => {}).then(() => { if (token !== sequence) return; animating = false; paintLocks(); if (active) next.focus?.({ preventScroll: true }); });
    }
    ensureOpen();
  }
  async function load({ reconcile = false } = {}) {
    if (!visible() || inFlight || !headKey(currentView())) return;
    const start = currentView(); const key = headKey(start); attemptedHead = key; inFlight = true;
    status = '正在核对宿主保存的世界与检定资料…'; paintLocks();
    try {
      const data = diceView(await request('/api/dice'));
      if (key !== headKey(currentView())) return;
      if (!data || compare(data, start) < 0) throw new Error('Invalid dice scope');
      if (reconcile || headKey(data) !== headKey(start)) {
        const latest = await request('/api/view');
        if (key !== headKey(currentView())) return;
        if (!headKey(latest) || compare(latest, start) < 0 || compare(latest, data) < 0) throw new Error('Stale world');
        const resolved = guardState(latest).resolution;
        if (resolved) { showResult(latest, resolved.result); return; }
        if (latest.generation !== start.generation || !guardState(latest).pending) {
          pendingRequest = undefined; lastResult = undefined; holdView(latest);
          status = '当前机会已在其他窗口处理或世界已切换。核对完成，点击继续同步最新世界。';
          paintLocks(); return;
        }
        gameView = latest; onViewHeld(latest);
        if (pendingRequest) {
          if (pendingRequest.rejected) pendingRequest = undefined;
          else pendingRequest.checked = true;
        }
      }
      snapshot = data;
      status = pendingRequest ? '原请求结果仍未知；可手动续接同一请求编号，不会新建或自动重投。'
        : data.available && opportunity() ? '选择应对方案，然后点击 d20。' : '当前机会不可用；请手动核对最新世界，或读取存档。';
      paint();
    } catch {
      status = pendingRequest ? '仍无法核对结果，原请求编号已保留。请检查连接后再核对，不会自动重投。' : '检定资料暂不可用。请手动核对最新世界，或读取存档。';
    } finally {
      inFlight = false; paintLocks(); reportBusy(); sync();
      if (active && heldView && !animating) next.focus?.({ preventScroll: true });
    }
  }
  async function sendPending() {
    if (!pendingRequest || inFlight || !visible() || !allowed()) return;
    const attempt = pendingRequest; const generation = currentView()?.generation; inFlight = true; attempt.checked = false;
    status = '正在等待宿主确认这一次检定…'; paint(); reportBusy(); let shouldCheck = false;
    try {
      const response = await request('/api/dice/roll', { ...attempt.payload });
      if (pendingRequest !== attempt || currentView()?.generation !== generation) return;
      const row = resultRow(own(response, 'result')); const data = diceView(own(response, 'dice'));
      const view = own(response, 'currentView') || own(response, 'view');
      if (own(response, 'accepted') !== true || !row || !data || !headKey(view)
        || view.generation !== generation || compare(view, currentView()) < 0 || data.generation !== generation || data.revision < attempt.payload.expectedRevision) throw new Error('Unconfirmed receipt');
      const resolution = guardState(view).resolution;
      if (!resolution || resolution.result.id !== row.id) { shouldCheck = true; status = '收据与最新世界不一致，请核对后续接。'; return; }
      showResult(view, row, true);
    } catch (error) {
      if (pendingRequest !== attempt || currentView()?.generation !== generation) return;
      attempt.rejected = integer(error?.status) && error.status >= 400 && error.status < 500;
      shouldCheck = error?.status === 403 || error?.status === 409;
      status = attempt.rejected ? '宿主未接受旧版本检定。正在核对最新世界，不会自动重投。'
        : '连接中断，结果是否保存尚未确认。原请求编号已保留；先核对，再手动续接同一次检定。';
    } finally {
      inFlight = false; paintLocks(); reportBusy();
      if (shouldCheck) await load({ reconcile: true });
      else sync();
      if (active && heldView && !animating) next.focus?.({ preventScroll: true });
    }
  }
  function sync(view = getView()) {
    if (syncing) return; syncing = true;
    try {
      if (view && (!gameView || compare(view, gameView) >= 0)) {
        if (gameView && view.generation !== gameView.generation) {
          pendingRequest = heldView = lastResult = snapshot = undefined; attemptedHead = undefined; selectedId = undefined;
          suspended = false; sequence++; animation?.cancel?.(); animating = false; if (active) closeDialog();
        }
        gameView = view;
      }
      const resolution = guard().resolution;
      if (!lastResult && resolution && !isResolutionSeen(currentView())) showResult(currentView(), resolution.result);
      ensureOpen(); paintLocks(); reportBusy();
      if (active && !lastResult && !heldView && !pendingRequest && attemptedHead !== headKey(currentView())) void load();
    } finally { syncing = false; }
  }
  roll.addEventListener('click', () => {
    if (roll.disabled || pendingRequest || !selection() || !guard().pending) return;
    const crypto = document.defaultView?.crypto || globalThis.crypto;
    if (typeof crypto?.randomUUID !== 'function') { status = '无法生成安全请求编号，未提交检定。'; paintLocks(); return; }
    pendingRequest = { payload: { requestId: crypto.randomUUID(), expectedGeneration: snapshot.generation, expectedRevision: snapshot.revision,
      mode: 'opportunity', opportunityId: opportunity().id, optionId: selection().id }, checked: false, rejected: false };
    void sendPending();
  });
  refresh.addEventListener('click', () => { if (!refresh.disabled) void load({ reconcile: true }); });
  retry.addEventListener('click', () => { if (!retry.disabled && pendingRequest?.checked && !pendingRequest.rejected) void sendPending(); });
  next.addEventListener('click', () => {
    if (next.disabled || !heldView) return;
    const view = heldView; const key = seenKey(view); if (key) { seen.add(key); try { document.defaultView?.sessionStorage?.setItem(key, '1'); } catch { /* Memory remains authoritative for this page. */ } }
    heldView = lastResult = pendingRequest = undefined; snapshot = undefined; status = ''; closeDialog();
    onContinue(view); sync(view);
  });
  function exit(target) {
    if (inFlight || animating) return;
    // Keep uncertain request identities in memory. The host may only navigate
    // to title/load; returning to this same pending world reopens the check.
    suspended = true; closeDialog(); onExit(target);
  }
  titleExit.addEventListener('click', () => exit('title')); loadExit.addEventListener('click', () => exit('load'));
  root.addEventListener('cancel', event => { event.preventDefault(); status = '请完成检定，或选择返回标题 / 读取存档。'; paintLocks(); });
  root.addEventListener('close', () => { if (!closing && active) { active = false; onActiveChange(false); reportBusy(); sync(); } });
  motion?.addEventListener?.('change', () => { if (motion.matches) { sequence++; animation?.cancel?.(); animating = false; paintLocks(); } });
  document.addEventListener?.('visibilitychange', () => sync());
  paint();
  return { sync, holdView, isResolutionSeen,
    setBusy(value) { const changed = externalBusy !== (value === true); externalBusy = value === true; paintLocks(); if (changed && !externalBusy) sync(); },
    setActive(value) { if (value === true) { suspended = false; sync(); } },
    get active() { return active; }, get holding() { return !!heldView || !!lastResult || !!pendingRequest; },
  };
}
