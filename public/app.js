import { formatDialogue, dialogueFragments, publicEventCaption } from './dialogue-format.mjs';
import { resolveSceneBackground } from './scene-backgrounds.mjs';
import { updateWitchBook, configureWitchBookAvatarEditor, setWitchBookBusy, configureWitchBookPresentation, openWitchBookForTrial, confirmWitchBookTestimony } from './witchbook.js';
import { mountAvatarPicker } from './avatar-upload.mjs';
import { mountBgmPlayer } from './bgm-player.mjs';
import { mountPlayerCreator } from './player-creator.mjs';
import { normalizeCreationPreferences } from './player-creation-rules.mjs';
import { mountCustomAbilityEntry } from './custom-ability-entry.js';
import { mountScenePlayback } from './scene-playback.mjs';
import { mountStoryTypewriter } from './story-typewriter.mjs';
import { mountDeveloperPanel } from './developer-panel.mjs';
import { mountDailyHistory } from './daily-history.mjs';
import { mountTrialTestimony, paintTranscriptTestimony, transcriptTestimonyStatement } from './trial-testimony.mjs';
import { formattedTestimonyPassages } from './testimony-highlights.mjs';
import { createTestimonyDraft, testimonyDisplayText, testimonyFeedbackText } from './testimony-draft.mjs';
import { mountTrialOpening } from './trial-opening.mjs';
import { mountScreenTransition } from './screen-transition.mjs';
import { mountExecutionSeal } from './execution-seal.mjs';
import { mountDicePanel } from './dice-panel.mjs';
import { mountCaseItemControls } from './case-item-controls.mjs';
import { mountPhoneBallot, phoneBallotChoices } from './phone-ballot.mjs';

// Title BGM: gDie Divil JIO; no story request is needed to select it.
const TITLE_BGM = Object.freeze({ id: 'd1-21', loop: true, durationSec: 227.613 });
const bgmPlayer = mountBgmPlayer(document);
bgmPlayer.setTrack(TITLE_BGM);

const $ = (id) => document.getElementById(id);
let explicitAttempt;
let state; let csrfToken; let busy = false; let pendingAction; let pendingRegeneration; let pendingBookAction; let saveLoadMode = 'load';
const testimonyDraft = typeof createTestimonyDraft === 'function' ? createTestimonyDraft() : undefined;
let runtimeOptions = { directSendSuggestions: false, debug: false, developerMode: false };
let composing = false; let compositionFinishedAt = -Infinity; let submitSource = 'button';
let saveConfirmation;
let clientEvents = []; let clientLogTimer;
let avatarProcessing = false;
let newAvatarProcessing = false;
let creatorBusy = false;
let playerCreator;
let customAbilityUI;
let agentStatusUI;
let caseExecutionUI;
let phoneBallotUI;
let developerPanelUI;
let screenTransitionUI;
let diceUI;
let caseItemControlsUI;
let diceProcessing = false;
let guardUpgradeUncertain = false;
const dailyHistoryUI = typeof mountDailyHistory === 'function' ? mountDailyHistory(document, {
  getView: () => state,
  canOpen: () => !busy && (typeof diceProcessing === 'undefined' || !diceProcessing) && !avatarProcessing && !newAvatarProcessing && !creatorBusy && !saveConfirmation,
  onOpen: () => { logClientEvent('menu.open'); setBusy(busy); },
  onJump: (index, scope) => {
    if (!state || scope.generation !== state.generation || scope.revision !== state.revision) return;
    scrollSceneEntry(index, 'start', scope);
  },
}) : undefined;
const scenePlayback = typeof mountScenePlayback === 'function' ? mountScenePlayback(document, {
  onProjection: paintSceneProjection,
  isVisible: () => !document.body.classList.contains('at-title') && !$('game-screen').hidden,
}) : undefined;
const storyTypewriter = typeof mountStoryTypewriter === 'function' ? mountStoryTypewriter(document, {
  isVisible: () => !document.body.classList.contains('at-title') && !$('game-screen').hidden
    && !(typeof trialOpeningUI !== 'undefined' && trialOpeningUI?.active)
    && !(typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active)
    && !(typeof diceUI !== 'undefined' && diceUI?.active),
  onProgress: () => {
    if (typeof diceUI !== 'undefined') diceUI?.sync(state);
    if (typeof syncGuardRulesUpgrade === 'function') syncGuardRulesUpgrade();
  },
}) : undefined;
const trialOpeningUI = typeof mountTrialOpening === 'function' ? mountTrialOpening(document, {
  isVisible: () => !document.body.classList.contains('at-title') && !$('game-screen').hidden,
  isSuspended: () => !!screenTransitionUI?.active,
  onActiveChange: () => { storyTypewriter?.sync(); setBusy(busy); },
}) : undefined;
const trialTestimonyUI = typeof mountTrialTestimony === 'function' ? mountTrialTestimony(document, {
  includeReferences: false,
  canInteract: () => canUseTestimony(),
  onChoose: (command, scope) => {
    if (!canUseTestimony() || state.generation !== scope.generation || state.revision !== scope.revision) return;
    const action = state.trial?.testimony?.selections?.find(row => row.command === command);
    if (action && action.kind !== 'statement_reaction') {
      confirmWitchBookTestimony(command, scope); return;
    }
    chooseSuggestion(command, scope);
  },
}) : undefined;
configureWitchBookPresentation({
  canPresent: () => canUseTestimony({ allowWitchBook: true }),
  onPresent: pending => {
    if (!canUseTestimony()) return;
    const draftText = $('action').value;
    const displayText = pending.displayText || pending.command;
    const wireText = pending.scope ? testimonyDraft?.select(pending.command, pending.scope, state) : displayText;
    if (wireText === undefined) return;
    // A book confirmation uses the same guarded/idempotent action pipeline,
    // but neither overwrites nor sends an unrelated unsent composer draft.
    submitSource = 'witchbook';
    submitAction({ value: displayText, wireText: pending.command, preserveDraft: draftText,
      generation: state.generation, revision: state.revision });
  },
});
$('trial-book-open').addEventListener('click', openWitchBookForTrial);
$('book-action-retry').addEventListener('click', () => {
  if (!pendingBookAction || busy) return;
  submitSource = 'witchbook'; submitAction(pendingBookAction);
});
const newAvatarPicker = mountAvatarPicker($('new-avatar-editor'), {
  onChange: () => {},
  onBusyChange: value => { newAvatarProcessing = value; setBusy(busy); updateNewGameExample(); },
});
playerCreator = mountPlayerCreator({ request, getAvatar: () => newAvatarPicker.value,
  setAvatar: value => newAvatarPicker.setValue(value),
  onBusyChange: value => { creatorBusy = value; setBusy(busy); updateNewGameExample(); },
});
customAbilityUI = mountCustomAbilityEntry({ request, onChange: () => updateNewGameExample() });
configureWitchBookAvatarEditor({
  onBusyChange: value => { avatarProcessing = value; setBusy(busy); },
  onChange: async (avatarDataUrl, scope) => {
    try {
      const view = await request('/api/player/avatar', { ...scope, avatarDataUrl });
      const scrollTop = $('log').scrollTop;
      render(view);
      $('log').scrollTop = scrollTop;
      // An unresolved LLM request still owns its original scope, even when a
      // cosmetic change advances the visible revision.
      if (view.exampleId !== 'agent' || pendingAction?.expectedGeneration !== view.generation) pendingAction = undefined;
    } catch (error) {
      if (error.status === 409 || error.status === 403) {
        pendingAction = undefined;
        try { render(await request('/api/view')); } catch { /* Keep the original error visible in the picker. */ }
      }
      if (!error.status || error.status >= 500) error.message += ' 请刷新页面核对当前头像后再试。';
      throw error;
    }
  },
});

screenTransitionUI = typeof mountScreenTransition === 'function' ? mountScreenTransition(document, {
  onActiveChange: () => {
    storyTypewriter?.sync(); trialOpeningUI?.sync(); setBusy(busy);
  },
}) : undefined;

function logClientEvent(action, fields = {}) {
  if (!runtimeOptions.debug || !csrfToken) return;
  clientEvents.push({ action, generation: state?.generation, revision: state?.revision, ...fields });
  if (clientEvents.length > 20) clientEvents.shift();
  if (!clientLogTimer) clientLogTimer = setTimeout(flushClientEvents, 300);
}
function flushClientEvents() {
  clearTimeout(clientLogTimer); clientLogTimer = undefined;
  if (!runtimeOptions.debug || !csrfToken) { clientEvents = []; return; }
  const events = clientEvents.splice(0, 20);
  if (!events.length) return;
  // A diagnostic failure must never block gameplay or recursively log itself.
  fetch('/api/diagnostics/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Manosaba-Token': csrfToken }, body: JSON.stringify({ events }), keepalive: true }).catch(() => {});
}
function applyRuntimeOptions(options) {
  runtimeOptions = { directSendSuggestions: options?.directSendSuggestions === true, debug: options?.debug === true,
    developerMode: options?.developerMode === true };
  if (typeof developerPanelUI !== 'undefined') developerPanelUI?.sync();
  if (!runtimeOptions.debug) { clientEvents = []; clearTimeout(clientLogTimer); clientLogTimer = undefined; }
  $('suggestions').dataset.directSend = String(runtimeOptions.directSendSuggestions);
  $('input-help').textContent = `Enter 发送 · Shift + Enter 换行 · 快捷选项：${runtimeOptions.directSendSuggestions ? '点击直接发送' : '点击填入后手动发送'}`;
}
let runtimeOptionsChanged = false;
window.addEventListener('manosaba-options-changed', event => { runtimeOptionsChanged = true; applyRuntimeOptions(event.detail); });
window.addEventListener('error', () => logClientEvent('client.error'));
window.addEventListener('unhandledrejection', () => logClientEvent('client.error'));
window.addEventListener('pagehide', flushClientEvents);
window.addEventListener('manosaba-settings-rendered', () => {
  const root = $('case-item-controls');
  if (caseItemControlsUI?.root !== root) {
    caseItemControlsUI = mountCaseItemControls(root, {
      request, getView: () => state, onView: render,
      isBusy: () => busy || diceProcessing, setBusy,
      newRequestId: () => crypto.randomUUID(),
    });
  }
  caseItemControlsUI?.refresh();
  if (state && !$('game-screen').hidden && !document.body.classList.contains('at-title') && !$('open-run-policy')) {
    const button = document.createElement('button');
    button.type = 'button'; button.id = 'open-run-policy'; button.className = 'ms-secondary';
    button.textContent = '本局偏好与玩法边界';
    button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'run-policy-dialog');
    button.addEventListener('click', openRunPolicy);
    $('options-root').prepend(button);
  }
});
$('options-dialog').addEventListener('close', () => caseItemControlsUI?.cancel());
// Record only fixed UI categories, never element text or form contents.
for (const id of ['title-options', 'game-options', 'witchbook-open', 'back-title']) {
  $(id).addEventListener('click', () => logClientEvent('menu.open', { source: 'button' }));
}
for (const id of ['saves-dialog', 'witchbook-dialog', 'history-dialog', 'options-dialog', 'new-game-dialog', 'rewind-dialog', 'save-confirm-dialog', 'exit-dialog', 'case-execution-dialog']) {
  $(id).addEventListener('close', () => { logClientEvent('dialog.close'); setBusy(busy); });
  $(id).addEventListener('toggle', () => setBusy(busy));
}
// Keep dialogue and encyclopedia impression colors in one place.
import { characterInitialColors, characterAppearance } from './character-appearance.mjs';
const narrativeSpeakers = new Set(['', '旁白', '所见所闻', '验证说明', '系统']);
const labels = { agent_cell: '牢房', agent_corridor: '走廊', agent_reception: '会客厅', cell: '牢房', unlock: '集合广播与开锁', corridor: '走廊', intros: '自我介绍', warden: '典狱长说明', hiro_warning: '危险征兆', ending: '序章收束', daily: '日常探索', daily_complete: '片段收束' };
function element(tag, text, className) { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; }

function setSaveLoadMode(mode) {
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || saveConfirmation) return;
  saveLoadMode = mode === 'save' ? 'save' : 'load';
  $('saveload-title-img').src = saveLoadMode === 'save' ? '/assets/saveload/save-title.png' : '/assets/saveload/load-title.png';
  $('saveload-title-img').alt = saveLoadMode === 'save' ? '保存进度' : '读取存档';
  $('mode-save-btn').setAttribute('aria-selected', String(saveLoadMode === 'save'));
  $('mode-load-btn').setAttribute('aria-selected', String(saveLoadMode === 'load'));
  $('saves-dialog').dataset.mode = saveLoadMode;
  $('saveload-save-bar').hidden = saveLoadMode !== 'save';
  $('new-save-target').hidden = saveLoadMode !== 'save';
  $('load').hidden = saveLoadMode !== 'load';
  $('saveload-hint').textContent = saveLoadMode === 'save'
    ? '保存模式：选择已有存档后可覆盖或重命名；双击卡片会先确认覆盖，不会读取。选择空白槽位可新建存档。'
    : '读取模式：点击选择，双击卡片或点击「读取所选存档」读取。可重命名所选存档；删除需另行确认。';
  $('saves-message').textContent = '';
  // Opening SAVE never silently selects an existing slot for overwrite.
  if (saveLoadMode === 'save') $('save-slots').value = '';
  else if (!$('save-slots').value) $('save-slots').value = state?.saveSlots?.at(-1)?.id || '';
  if (state) renderSaveGrid(state);
  logClientEvent('menu.open');
}
function selectedSave() { return state?.saveSlots?.find(save => save.id === $('save-slots').value); }
function syncSaveSelection() {
  const save = selectedSave();
  for (const card of $('save-grid').children) {
    const selected = save ? card.dataset.saveId === save.id : saveLoadMode === 'save' && card.dataset.newSlot === 'true';
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-selected', String(selected));
  }
  $('save').textContent = save ? '覆盖所选存档' : '+ 新建存档';
  $('save-selected-desc').textContent = save ? `已选择：${save.name}` : saveLoadMode === 'save' ? '已选择：新建存档（不会覆盖已有进度）' : '尚未选择存档';
  setBusy(busy);
}
function selectSave(id) {
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || saveConfirmation) return;
  $('save-slots').value = id;
  // Do not replace card DOM on click: otherwise the second click can never
  // produce dblclick, and keyboard focus would be lost on each selection.
  syncSaveSelection();
  logClientEvent('save.select', { source: 'pointer' });
}
function renderSaveGrid(view) {
  const grid = $('save-grid');
  if (!grid) return;
  const scrollTop = grid.scrollTop;
  grid.replaceChildren();
  const saves = [...(view.saveSlots || [])].reverse();
  const totalSlots = Math.max(8, Math.ceil((saves.length + 1) / 4) * 4);
  for (let i = 0; i < totalSlots; i++) {
    const save = saves[i];
    const isNew = !save && i === saves.length && saveLoadMode === 'save';
    const slotNum = String(i + 1).padStart(2, '0');
    const card = element('div', null, `save-slot-card${save ? ' has-data' : ' is-empty'}${isNew ? ' is-quick-create' : ''}`);
    card.dataset.saveId = save?.id || '';
    card.dataset.newSlot = String(isNew);
    card.setAttribute('role', 'option');
    card.setAttribute('aria-disabled', String(!save && !isNew));
    card.tabIndex = save || isNew ? 0 : -1;
    const visual = element('div', null, 'slot-visual');
    if (save) {
      const bg = resolveSceneBackground(save.location, { exampleId: save.exampleId });
      const preview = element('div', null, 'slot-preview');
      if (bg.url) preview.style.backgroundImage = `linear-gradient(180deg, rgba(16, 12, 22, 0.25), rgba(12, 9, 18, 0.88)), url("${bg.url}")`;
      preview.append(element('span', `NO.${slotNum}`, 'slot-badge'), element('strong', save.name, 'slot-title'),
        element('span', saveLoadMode === 'save' ? '点击选择 · 双击确认覆盖' : '点击选择 · 双击读取', 'slot-hint'));
      visual.append(preview);
    } else {
      const emptyWrap = element('div', null, 'slot-empty');
      const emptyArt = element('img', null, 'slot-empty-img');
      emptyArt.src = '/assets/saveload/empty-slot.png'; emptyArt.alt = '';
      emptyWrap.append(emptyArt);
      if (isNew) emptyWrap.append(element('span', '点击选择新建存档', 'slot-new-hint'));
      visual.append(emptyWrap);
    }
    const frame = element('img', null, 'slot-frame');
    frame.src = '/assets/saveload/slot-frame.png'; frame.alt = '';
    visual.append(frame);
    card.append(visual, element('div', `[${slotNum}] ${save ? save.name : 'Empty · 空白槽位'}`, 'slot-label'));
    if (save || isNew) {
      const activate = () => {
        if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || saveConfirmation) return;
        selectSave(save?.id || '');
        if (saveLoadMode === 'save') $('save').click();
        else if (save) $('load').click();
      };
      card.addEventListener('click', () => selectSave(save?.id || ''));
      card.addEventListener('dblclick', activate);
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (event.key === 'Enter') activate();
        else selectSave(save?.id || '');
      });
    }
    grid.append(card);
  }
  syncSaveSelection();
  grid.scrollTop = scrollTop;
}

function render(view) {
  // Historical receipts are not current-head projections. Never let a delayed
  // response replace a newer view already observed by this page.
  if (state && (view.generation < state.generation || (view.generation === state.generation && view.revision < state.revision))) return;
  if (typeof diceUI !== 'undefined' && diceUI?.holding && state?.generation === view.generation) {
    diceUI.holdView(view); diceUI.sync(view); return;
  }
  state = view;
  if (typeof testimonyDraft !== 'undefined' && testimonyDraft && !testimonyDraft.sync(view, pendingAction)) pendingAction = undefined;
  // On a fresh page the world is already committed. Keep consequence entries
  // out of the DOM until the saved result has been explicitly acknowledged.
  const resolution = view.guardReaction?.resolution;
  const deferConsequences = resolution && Number.isSafeInteger(resolution.entryIndex) && resolution.entryIndex >= 0
    && (typeof diceUI !== 'undefined' && diceUI) && !diceUI.isResolutionSeen(view);
  if (deferConsequences) {
    if (typeof diceUI !== 'undefined') diceUI?.holdView(view);
    const end = resolution.entryIndex + 1;
    view = { ...view, entries: (view.entries || []).slice(0, end),
      turns: (view.turns || []).filter(turn => turn.entryStart < end).map(turn => ({ ...turn, entryEnd: Math.min(turn.entryEnd, end) })) };
  }
  if (!deferConsequences && typeof dailyHistoryUI !== 'undefined') dailyHistoryUI?.update(view);
  const playerName = view.player?.name || '樱羽艾玛';
  const reading = !deferConsequences && typeof scenePlayback !== 'undefined' ? scenePlayback : undefined;
  const readingScrollTop = $('log').scrollTop;
  const agent = view.exampleId === 'agent';
  const episode = agent ? undefined : view.episode;
  if (!deferConsequences) renderStoryPanels(view);
  $('edition-notice').textContent = '高墙之内';
  $('phone-connection').textContent = '监牢内网';
  $('phone-notes-notice').textContent = '这里记下了迄今的见闻。';
  restorePendingAction(view);
  if (agent) showAgentStatus(view);
  document.querySelector('.heading .eyebrow').textContent = playerName;
  const inputSpeaker = document.querySelector('.input-speaker');
  inputSpeaker.replaceChildren(...[...playerName].map((char, position) => element('span', char, position === 0 ? 'name-first' : position === 2 ? 'name-second' : 'name-body')));
  inputSpeaker.style.setProperty('--speaker-initial', view.exampleId === 'custom' || view.player?.custom ? (view.player?.impressionColor || '#a0beeb') : `rgb(${characterInitialColors[playerName] || '252,145,172'})`);
  document.querySelector('.input-actor-label .sr-only').textContent = playerName;
  $('action').placeholder = `描述你想采取的行动，或写下想说的话……${episode ? '（每次一个动作）' : ''}`;
  document.querySelector('.phone').setAttribute('aria-label', `${playerName}的手机`);
  const scenery = deferConsequences ? { id: 'guard-result-awaiting-reader' } : resolveSceneBackground(view.location, view);
  const backdrop = document.querySelector('.scene-backdrop');
  backdrop.style.backgroundImage = scenery.url
    ? `linear-gradient(90deg, #16131ca8, #15121b60), url("${scenery.url}")`
    : 'linear-gradient(120deg, #252131, #16131c)';
  backdrop.dataset.scene = scenery.id;
  $('location').textContent = deferConsequences ? '检定结果待确认' : typeof view.location === 'string' ? view.location : '当前位置';
  if (view.csrfToken) csrfToken = view.csrfToken;
  const log = $('log'); log.replaceChildren();
  for (const [index, entry] of (view.entries || []).entries()) {
    const turn = view.turns?.find(turn => turn.entryStart === index);
    if (turn) {
      const floor = element('section', null, 'turn-floor');
      floor.append(element('strong', `#${turn.floor} · ${playerName}的行动`), element('p',
        typeof testimonyDisplayText === 'function' ? testimonyDisplayText(turn) : turn.displayText || turn.text));
      const back = element('button', '回到此行动前'); back.type = 'button';
      back.addEventListener('click', () => openRewind(turn));
      const scene = turn.scene;
      const hasScene = scene?.version === 1 && Number.isSafeInteger(scene.hanCount) && scene.hanCount >= 0
        && Number.isSafeInteger(scene.blockCount) && scene.blockCount >= 0;
      if (hasScene || view.exampleId === 'agent') {
        floor.classList.add('has-scene');
        const reading = element('div', null, 'scene-reading');
        if (hasScene) {
          reading.append(element('span', `本场景 ${scene.hanCount} 汉字 · ${scene.blockCount} 段`, 'scene-metadata'));
          for (const [edge, text] of [['start', '跳到开头'], ['end', '跳到结尾']]) {
            const jump = element('button', text); jump.type = 'button'; jump.dataset.sceneNavigation = edge;
            jump.setAttribute('aria-label', `跳到第 ${turn.floor} 层场景${edge === 'start' ? '开头' : '结尾'}（仅滚动正文）`);
            jump.setAttribute('aria-controls', 'log');
            jump.addEventListener('click', () => scrollSceneEntry(edge === 'start' ? turn.entryStart : turn.entryEnd - 1, edge,
              { key: jump.dataset.sceneReadingKey, turnId: turn.id }));
            reading.append(jump);
          }
        }
        reading.append(back);
        if (view.exampleId === 'agent' && turn.regeneratable !== false) {
          const regenerate = element('button', '重新生成这一轮'); regenerate.type = 'button';
          regenerate.dataset.regenerateTurn = turn.id;
          regenerate.setAttribute('aria-label', `用原始输入重新生成第 ${turn.floor} 层整轮剧情（需确认，可能产生费用）`);
          regenerate.setAttribute('aria-haspopup', 'dialog'); regenerate.setAttribute('aria-controls', 'rewind-dialog');
          regenerate.addEventListener('click', () => openRegeneration(turn));
          reading.append(regenerate);
        }
        floor.append(reading);
      } else floor.append(back);
      const actionOutcome = typeof finiteActionOutcome === 'function' ? finiteActionOutcome(turn) : undefined;
      if (actionOutcome?.lines) for (const line of actionOutcome.lines) floor.append(element('p', line));
      log.append(floor);
    }
    const fragments = dialogueFragments(entry);
    for (const [fragmentIndex, fragment] of fragments.entries()) {
      const latest = index === view.entries.length - 1 && fragmentIndex === fragments.length - 1;
      const rawSpeaker = (fragment.speaker || '').trim();
      // A character card is reserved for delivered speech/writing. Observable
      // actions remain in the transcript, but render as player-view narration
      // instead of putting movement or gesture prose in somebody's dialogue box.
      const isDialogue = !narrativeSpeakers.has(rawSpeaker) && ['speech', 'writing'].includes(fragment.delivery);
      const isNarration = !isDialogue;
      const item = element('article', null, `entry dialogue-entry${isNarration ? ' is-narration' : ' is-character'}${latest ? ' is-latest' : ''}`);
      if (isDialogue) {
        const plate = element('div', null, 'dialogue-nameplate');
        const plateArt = element('img'); plateArt.src = '/assets/ui/nameplate.png'; plateArt.alt = '';
        const speaker = element('span', null, 'speaker dialogue-speaker');
        const fullNames = { '艾玛': '樱羽艾玛', '希罗': '二阶堂希罗' };
        const unknownSpeaker = /^[?？]+$/u.test(rawSpeaker);
        const name = unknownSpeaker ? '？？？' : fullNames[rawSpeaker] || rawSpeaker;
        if (unknownSpeaker) speaker.classList.add('is-unknown');
        const colorName = name.replace(/（.*?）/gu, '');
        speaker.style.setProperty('--speaker-initial', (view.exampleId === 'custom' || view.player?.custom) && colorName === view.player?.name
          ? (view.player.impressionColor || '#a0beeb')
          : `rgb(${characterInitialColors[colorName] || '255,255,255'})`);
        for (const [position, char] of [...name].entries()) {
          speaker.append(element('span', char, unknownSpeaker ? 'name-unknown'
            : position === 0 ? 'name-first' : position === 2 ? 'name-second' : 'name-body'));
        }
        plate.append(plateArt, speaker);
        item.append(plate);
      }
      const caption = publicEventCaption(entry, fragmentIndex);
      if (caption) item.append(element('div', caption, 'dialogue-public-event'));
      const message = element('div', null, 'dialogue-message');
      const formatted = formatDialogue(fragment);
      const paragraphs = narrativeSpeakers.has(rawSpeaker)
        ? formatted.text.split(/(?:\r?\n)[\t ]*(?:\r?\n)(?:[\t ]*\r?\n)*/u).filter(text => text.trim())
        : [formatted.text];
      if (paragraphs.length > 1) {
        const prose = element('div', null, 'dialogue-paragraphs');
        for (const text of paragraphs) prose.append(element('p', text));
        message.append(prose);
      } else {
        const paragraph = element('p', formatted.text, formatted.magic ? 'anan-magic' : '');
        if (typeof paintTranscriptTestimony === 'function' && typeof formattedTestimonyPassages === 'function'
          && typeof transcriptTestimonyStatement === 'function' && isDialogue) {
          const statement = transcriptTestimonyStatement(view, entry);
          if (statement) {
            const passages = formattedTestimonyPassages(entry.text, formatted.text, statement.highlights, { fragment: fragment.text });
            paintTranscriptTestimony(document, paragraph, {
              text: formatted.text, highlights: passages, passages,
              color: characterAppearance({ id: statement.speakerId, name: statement.speakerName }, view).color,
              ...(typeof trialTestimonyUI !== 'undefined' ? trialTestimonyUI?.transcriptBinding(statement.id) : {}),
            });
          }
        }
        message.append(paragraph);
      }
      if (latest) {
        const indicator = element('img', null, 'dialogue-indicator');
        indicator.src = '/assets/ui/InputIndicator.png'; indicator.alt = ''; indicator.setAttribute('aria-hidden', 'true');
        message.append(indicator);
      }
      item.dataset.entryIndex = String(index);
      item.dataset.entryFragment = String(fragmentIndex);
      item.append(message); log.append(item);
    }
  }
  log.scrollTop = log.scrollHeight;
  reading?.update(view, { scrollTop: readingScrollTop });
  if ((typeof deferConsequences === 'undefined' || !deferConsequences) && typeof trialOpeningUI !== 'undefined') trialOpeningUI?.update(view);
  if (typeof storyTypewriter !== 'undefined') storyTypewriter?.update(view);
  const selected = $('save-slots').value;
  $('save-slots').replaceChildren();
  const emptyOption = element('option', view.saveSlots?.length ? '新建存档／未选择' : '暂无存档');
  emptyOption.value = ''; $('save-slots').append(emptyOption);
  for (const save of view.saveSlots || []) { const option = element('option', save.name); option.value = save.id; $('save-slots').append(option); }
  if (view.saveSlots?.some(save => save.id === selected)) $('save-slots').value = selected;
  else $('save-slots').value = saveLoadMode === 'load' ? view.saveSlots?.at(-1)?.id || '' : '';
  renderSaveGrid(view);
  setBusy(busy);
  if (!reading?.active && !deferConsequences) bgmPlayer.setTrack(document.body.classList.contains('at-title') ? TITLE_BGM : view.bgm);
  if (!deferConsequences) {
    if (typeof developerPanelUI !== 'undefined') developerPanelUI?.sync();
  }
  if (typeof diceUI !== 'undefined') diceUI?.sync(state);
  if (typeof syncGuardRulesUpgrade === 'function') syncGuardRulesUpgrade();
  if (typeof caseItemControlsUI !== 'undefined') caseItemControlsUI?.sync();
}
// Panels follow the committed game state, independently of transcript scrolling
// and decorative text animation.
function renderStoryPanels(view) {
  const agent = view.exampleId === 'agent';
  const episode = agent ? undefined : view.episode;
  $('episode-panel').hidden = !episode;
  document.querySelector('.chapter-label span').textContent = ['case-1', 'case-1-execution-test'].includes(view.scenarioId) ? 'FIRST CASE · CHAPTER 01' : supportedProcedure(view) ? 'CASE PROCEDURE' : episode ? 'DAILY LIFE' : 'PROLOGUE · CHAPTER 00';
  document.querySelector('.chapter-label strong').textContent = supportedProcedure(view) && !['case-1', 'case-1-execution-test'].includes(view.scenarioId) ? '案件程序'
      : view.scenarioTitle || (agent ? '高墙之内，由你的行动继续。' : episode ? episode.title : '高墙之内，初次相遇。');
  for (const id of ['episode-title', 'episode-status', 'episode-objective', 'episode-nearby']) $(id).textContent = '';
  if (episode) {
    $('episode-title').textContent = episode.title;
    $('episode-status').textContent = view.completed ? '本段已收束' : '日常 · 探索中';
    $('episode-panel').dataset.status = view.completed ? 'completed' : 'playing';
    $('episode-objective').textContent = episode.objective;
    $('episode-nearby').textContent = `此处可交流：${view.nearbyCharacters?.map(person => person.name).join('、') || '暂无其他人'} · 已记录物品：${view.evidence?.length || 0}`;
  }
  const seconds = view.worldTime ?? 0;
  const minutes = (episode ? 14 : 6) * 60 + Math.floor(seconds / 60);
  const time = view.clock?.label || `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  $('phone-time').textContent = time;
  $('phone-large-time').textContent = `${time}:${String(view.clock?.second ?? seconds % 60).padStart(2, '0')}`;
  $('clock').textContent = `已过 ${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
  $('phone-clock-notice').textContent = view.clock ? `当前时段：${view.clock.period}。` : '监牢内的公共时钟。';
  $('phone-elapsed').textContent = `+${seconds} 秒`;
  document.querySelector('.phone-date').replaceChildren(document.createTextNode(`第 ${view.clock?.day || 1} 日 · ${supportedProcedure(view) ? (view.phaseLabel || (['case-1', 'case-1-execution-test'].includes(view.scenarioId) ? '第一案' : '案件程序')) : episode ? '日常' : '序章'} `), element('span', '监牢内网'));
  $('phone-place').textContent = view.location ? `当前位置：${view.location}` : '当前位置：场景未记录';
  const acquaintances = (view.characters || []).filter(person => person.id !== view.player?.id && person.id !== 'warden').length;
  $('phone-summary').textContent = episode ? `${episode.title} · ${episode.summary}` : `地点：${view.location}。已结识 ${acquaintances} 人。`;
  $('story-day').textContent = `入狱第 ${view.clock?.day || 1} 天`;
  $('story-time').textContent = time;
  $('story-period').textContent = typeof view.clock?.period === 'string' ? view.clock.period.trim() : '';
  $('story-period').hidden = !$('story-period').textContent;
  renderCaseUI(view);
  if ($('save-current-desc')) $('save-current-desc').textContent = `${view.location} · ${view.phaseLabel || labels[view.phase] || view.phase} · 故事时钟 ${time}:${String(view.clock?.second ?? seconds % 60).padStart(2, '0')}（第 ${view.turns?.length || 0} 层行动）`;
  updateWitchBook(view);
  $('suggestions').replaceChildren();
  for (const text of view.suggestions || []) {
    // The book owns the evidence picker; keep raw host suggestions in the view
    // for authority checks, but don't flood the dialogue composer with them.
    if (view.trial?.stage === 'discussion' && (view.evidence || []).some(item => text === `出示${item.name}` || text === `出示${item.id}`)) continue;
    const button = element('button', text); button.type = 'button';
    button.addEventListener('click', () => chooseSuggestion(text));
    $('suggestions').append(button);
  }
  $('completion').hidden = !view.completed;
  $('completion').textContent = episode ? `${episode.summary} 本段故事已结束。` : '本段故事已结束。可读取存档或回溯之前的行动。';
}
function supportedProcedure(view) { return ['case-1', 'case-1-execution-test'].includes(view?.scenarioId) || ['causal', 'case-one'].includes(view?.procedureKind); }
function renderCaseUI(view) {
  const active = supportedProcedure(view);
  // Public testimony can also be delivered by an ordinary @3 saved game,
  // without the fixed-scenario/causal markers used to authorize procedure UI.
  // The response tray uses the original composer; this panel is only a compact
  // status line. Testimony alone never grants ballot/execution permissions.
  const testimony = view.trial?.stage === 'discussion' && view.trial.testimony
    && (view.trial.testimony.version === undefined || view.trial.testimony.version === 1);
  const showPanel = active || !!testimony;
  const trialActive = showPanel && ['discussion', 'ballot', 'execution_ready'].includes(view.trial?.stage);
  $('game-screen').dataset.trialActive = String(trialActive);
  $('trial-book-open').hidden = view.trial?.stage !== 'discussion';
  const timer = $('case-trial-timer');
  const clockNode = $('case-trial-clock');
  const trialSeconds = view.trial?.remainingSeconds;
  const timed = showPanel && ['investigation', 'discussion'].includes(view.trial?.stage)
    && !view.completed && Number.isSafeInteger(trialSeconds) && trialSeconds >= 0;
  timer.hidden = !timed;
  clockNode.textContent = timed ? `${String(Math.floor(trialSeconds / 60)).padStart(2, '0')}:${String(trialSeconds % 60).padStart(2, '0')}` : '';
  clockNode.setAttribute('datetime', timed ? `PT${trialSeconds}S` : '');
  timer.setAttribute('aria-label', timed ? `${view.trial.stage === 'investigation' ? '搜查' : '审判'}剩余 ${Math.floor(trialSeconds / 60)} 分 ${trialSeconds % 60} 秒` : '审判剩余时间');
  const executionReady = active && view.phoneState === 'execution_ready';
  const ballotReady = active && view.phoneState === 'ballot' && view.trial?.stage === 'ballot' && !view.completed;
  const phoneSpecial = executionReady || ballotReady;
  $('case-panel').hidden = !showPanel;
  $('phone-execution').hidden = !executionReady;
  for (const id of ['phone-app-heading', 'phone-app-tabs', 'phone-scroll', 'phone-pager']) $(id).hidden = phoneSpecial;
  document.querySelector('.phone').dataset.phoneState = active ? view.phoneState || 'normal' : 'normal';
  for (const id of ['case-title', 'case-stage']) $(id).textContent = '';
  if (showPanel) {
    const title = ['case-1', 'case-1-execution-test'].includes(view.scenarioId) ? view.scenarioTitle || '第一案'
      : active ? '案件程序' : '审判讨论';
    $('case-title').textContent = title;
    $('case-stage').textContent = view.phaseLabel || view.trial?.stage || '';
    $('phone-summary').textContent = `${title} · ${view.phaseLabel || view.trial?.stage || ''} · 地点：${view.location}`;
  }
  $('execution-targets').replaceChildren();
  if (executionReady) {
    for (const target of view.execution?.targets || []) {
      const item = element('li', target.name); item.dataset.targetId = target.id;
      $('execution-targets').append(item);
    }
  }
  if (typeof trialTestimonyUI !== 'undefined') trialTestimonyUI?.update(view);
  // Command identity always belongs to the committed game state.
  if (typeof caseExecutionUI !== 'undefined') caseExecutionUI?.update(state);
  if (typeof phoneBallotUI !== 'undefined') phoneBallotUI?.sync(view);
}
function markPhoneBallotPending() {
  if (!pendingAction || pendingAction.phoneBallot === true) return;
  Object.defineProperty(pendingAction, 'phoneBallot', { value: true, configurable: true });
}
function isPhoneBallotPending() {
  if (!pendingAction) return false;
  if (!state || state.phoneState !== 'ballot' || state.trial?.stage !== 'ballot' || state.completed) return false;
  if (pendingAction.phoneBallot === true) return true;
  const text = typeof pendingActionDisplayText === 'function' ? pendingActionDisplayText() : pendingAction.text;
  return Boolean(text) && phoneBallotChoices(state, supportedProcedure).some(choice => choice.command === text);
}
function restorePendingAction(view) {
  if (typeof testimonyDraft !== 'undefined' && testimonyDraft && !testimonyDraft.sync(view, pendingAction)) pendingAction = undefined;
  // Background head reads do not adopt another window's request or composer
  // text. Initial/manual recovery still restores identities explicitly.
  if (typeof agentStatusUI !== 'undefined' && agentStatusUI?.readingHead) return;
  if (pendingAction && pendingAction.expectedGeneration !== view.generation) pendingAction = undefined;
  if (typeof pendingBookAction !== 'undefined' && pendingBookAction && (pendingBookAction.generation !== view.generation
    || (!pendingAction && pendingBookAction.revision !== view.revision))) {
    pendingBookAction = undefined; $('book-action-retry').hidden = true;
  }
  if (pendingRegeneration && (view.exampleId !== 'agent' || pendingRegeneration.expectedGeneration !== view.generation
    || pendingRegeneration.expectedRevision !== view.revision)) pendingRegeneration = undefined;
  const runtime = view.agentRuntime;
  if (view.exampleId === 'agent' && runtime?.operation === 'regenerate') {
    // Recovery never uses the composer, so an unsent draft is not replaced by
    // the historical input. Only an explicit confirmation can resume the job.
    if (['pending', 'running', 'failed'].includes(runtime.status) && runtime.expectedGeneration === view.generation
      && runtime.expectedRevision === view.revision && typeof runtime.requestId === 'string' && runtime.requestId
      && view.turns?.some(turn => turn.id === runtime.turnId)) {
      pendingRegeneration = { requestId: runtime.requestId, turnId: runtime.turnId,
        expectedGeneration: runtime.expectedGeneration, expectedRevision: runtime.expectedRevision };
      pendingAction = undefined;
    }
    return;
  }
  if (view.exampleId !== 'agent' || pendingAction) return;
  if (!['pending', 'running', 'failed'].includes(runtime?.status)) return;
  const generation = runtime.expectedGeneration ?? view.generation;
  if (generation !== view.generation || !Number.isSafeInteger(generation) || !Number.isSafeInteger(runtime.expectedRevision) || runtime.expectedRevision < 0
    || typeof runtime.requestId !== 'string' || !runtime.requestId || runtime.requestId.length > 160
    || typeof runtime.text !== 'string' || !runtime.text.trim() || runtime.text.length > 2000) return;
  const text = runtime.text.trim();
  // Public runtime metadata is enough to recover a request after a refresh;
  // never put model settings, prompts or outputs in browser storage.
  const draft = typeof testimonyDraft !== 'undefined' ? testimonyDraft : undefined;
  const displayText = draft ? draft.recover(runtime, $('action').value)
    : typeof testimonyDisplayText === 'function' ? testimonyDisplayText(runtime) : text;
  if (!displayText || ($('action').value.trim() && $('action').value !== displayText)) return;
  pendingAction = { requestId: runtime.requestId, text, expectedGeneration: generation, expectedRevision: runtime.expectedRevision };
  explicitAttempt = runtime.newAttemptOf ? { requestId: runtime.requestId, parentRequestId: runtime.newAttemptOf } : undefined;
  if (view.phoneState === 'ballot' && view.trial?.stage === 'ballot'
    && phoneBallotChoices(view, supportedProcedure).some(choice => choice.command === text)) markPhoneBallotPending();
  draft?.remember(pendingAction, displayText, view);
  $('action').value = displayText;
}
function showAgentStatus(view) {
  const runtime = view.agentRuntime;
  const regeneration = runtime?.operation === 'regenerate';
  let status = regeneration && ['pending', 'running', 'failed'].includes(runtime.status)
    ? `这一轮${runtime.status === 'failed' ? '重新生成未完成' : '仍在重新生成'}，原正文和进度保持不变。请点击原楼层的「重新生成这一轮」并确认后手动续接；不会自动重试，模型调用可能产生费用。`
    : ['pending', 'running'].includes(runtime?.status) ? '本次行动仍在处理中。保留原文，再次点击发送仅续接同一请求；不会自动重试。'
      : runtime?.status === 'failed' ? (runtime.canRetry ? '上次行动未完成。确认后用相同文本手动重试；重试可能再次调用模型并产生费用。' : '上次行动未完成。请检查模型设置后再试。')
        : '';
  const failure = runtime?.status === 'failed' ? safeFailureSummary(Object.getOwnPropertyDescriptor(runtime, 'failure')?.value) : undefined;
  if (failure) status = `${regeneration ? '这一轮重新生成未完成，原正文和进度保持不变。请点击原楼层的「重新生成这一轮」并确认后手动续接。' : '上次行动未完成，输入与请求编号已保留。'} ${failureSummaryText(failure)} ${failureRetryHint(failure)}`;
  $('message').textContent = status;
  $('title-message').textContent = status;
}
// A published action result is a fixed finite projection. Missing, unknown or
// malformed records add no text: they must not invent success, hide the host
// message, or turn a normal refusal into an operational retry.
function finiteActionOutcome(source) {
  try {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(source, 'actionOutcome');
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return undefined;
    const value = descriptor.value;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && Object.getPrototypeOf(prototype) !== null) return undefined;
    const own = (object, key) => {
      if (!object || typeof object !== 'object' || Array.isArray(object)) return undefined;
      const objectPrototype = Object.getPrototypeOf(object);
      if (objectPrototype !== null && Object.getPrototypeOf(objectPrototype) !== null) return undefined;
      const field = Object.getOwnPropertyDescriptor(object, key);
      if (!field || !field.enumerable || !Object.hasOwn(field, 'value')) return undefined;
      return { value: field.value };
    };
    const version = own(value, 'version');
    const kindField = own(value, 'kind');
    const stepsField = own(value, 'steps');
    const codeText = {
      completed: '已完成', condition_false: '条件未成立', destination_unavailable: '当前通路不可达',
      item_unavailable: '具体物件条件不成立', recipient_declined: '对方拒绝接纳', awaiting_recipient: '尚未接纳（不是拒绝）',
      operation_unavailable: '当前操作不可用', bounded: '到达本轮处理边界', world_interrupt: '当前情形中断后续',
      not_executed: '未执行', ambiguous_reference: '需明确对象/条件', unsupported_effect: '缺支持机制',
      boundary_conflict: '与初始边界冲突', operational_failure: '结算未完成',
    };
    const stopKinds = ['blocked', 'clarification', 'boundary_conflict', 'unsupported', 'execution_failed'];
    const statuses = ['completed', 'blocked', 'not_executed'];
    if (!version || version.value !== 1 || !kindField || !['completed', ...stopKinds].includes(kindField.value)
      || !stepsField || !Array.isArray(stepsField.value) || stepsField.value.length > 3) return undefined;
    const steps = [];
    for (let index = 0; index < stepsField.value.length; index++) {
      const step = stepsField.value[index];
      const stepIndex = own(step, 'index');
      const status = own(step, 'status');
      const code = own(step, 'code');
      if (!stepIndex || stepIndex.value !== index || !status || !statuses.includes(status.value)
        || !code || typeof code.value !== 'string' || !Object.hasOwn(codeText, code.value)) return undefined;
      steps.push({ index, status: status.value, code: code.value });
    }
    const stopField = own(value, 'stop');
    let stop;
    if (stopField) {
      const stopIndex = own(stopField.value, 'index');
      const stopKind = own(stopField.value, 'kind');
      const stopCode = own(stopField.value, 'code');
      if (!stopIndex || !Number.isSafeInteger(stopIndex.value) || stopIndex.value < 0 || stopIndex.value > 2
        || !stopKind || !stopKinds.includes(stopKind.value) || !stopCode || typeof stopCode.value !== 'string' || !Object.hasOwn(codeText, stopCode.value)) return undefined;
      stop = { index: stopIndex.value, kind: stopKind.value, code: stopCode.value };
    }
    if (!steps.length && !stop) return undefined;
    const done = steps.filter(step => step.status === 'completed').length;
    const completion = own(value, 'completion');
    const kind = kindField.value;
    if (kind === 'completed') {
      if (!completion || (completion.value !== 'full' && completion.value !== 'partial') || !steps.length
        || (completion.value === 'full' ? done !== steps.length : done === 0 || done === steps.length)) return undefined;
    } else if (completion || done > 0) return undefined;
    if (kind === 'execution_failed' && steps.some(step => step.status !== 'not_executed')) return undefined;
    const statusText = { completed: '已完成', blocked: '受阻', not_executed: '未执行' };
    const stopText = { blocked: '行动受阻', clarification: '需要你澄清', boundary_conflict: '与本局边界冲突', unsupported: '缺少支持机制', execution_failed: '结算未完成' };
    const lines = [kind === 'completed' && completion.value === 'full'
      ? `行动步骤已完成。已完成${done}/${steps.length}步。`
      : kind === 'completed' ? `行动步骤部分完成。已完成${done}/${steps.length}步。已完成的部分保留。未完成的后续需要你另作明确选择。`
        : kind === 'blocked' ? '行动受阻。这不是结算故障。'
          : kind === 'clarification' ? '需要你澄清。明确选择后再发送。'
            : kind === 'boundary_conflict' ? '与本局边界冲突。'
              : kind === 'unsupported' ? '当前缺少支持该效果或保存的机制。这不是永久的世界禁令，也不是结算故障。'
                : '本次结算未完成。已知步骤尚未执行。'];
    for (const step of steps) lines.push(step.status === 'completed'
      ? `第${step.index + 1}步已完成（${codeText[step.code]}）。`
      : `第${step.index + 1}步：${statusText[step.status]}（${codeText[step.code]}）。`);
    if (stop) lines.push(`${steps.length ? `停点第${stop.index + 1}步` : `停点位置${stop.index + 1}`}：${stopText[stop.kind]}（${codeText[stop.code]}）。`);
    return { text: lines.join(''), lines, outcome: { version: 1, kind, ...(kind === 'completed' ? { completion: completion.value } : {}),
      steps: steps.map(step => ({ index: step.index, status: step.status, code: step.code })), ...(stop ? { stop } : {}) } };
  } catch { return undefined; }
}
// Failure summaries are separate from prose and are never trusted as arbitrary
// server/provider text. Only own data properties from the fixed public schema
// can become labels; task slots, actor identities and raw exceptions are ignored.
function safeFailureSummary(value) {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && Object.getPrototypeOf(prototype) !== null) return undefined;
    const fields = {};
    for (const key of ['stage', 'code', 'phase', 'issue', 'rule', 'httpStatus', 'attempt', 'retryLimit', 'modelCalls', 'reusedTasks',
      'completedTasks', 'pendingTasks', 'retryAdvice', 'retryRequiresModel']) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor) continue;
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return undefined;
      fields[key] = descriptor.value;
    }
    const codes = ['ERR_LLM_TURN_FAILED', 'LLM_NOT_CONFIGURED', 'SETTINGS_UNAVAILABLE', 'AGENT_TIMEOUT', 'STALE_AGENT_TURN',
      'ERR_MODEL_CONFIG', 'ERR_MODEL_PACKET', 'ERR_MODEL_REQUEST', 'ERR_MODEL_RESPONSE',
      'ERR_MODEL_TIMEOUT', 'ERR_MODEL_CANCELLED', 'INVALID_AGENT_OUTPUT', 'INVALID_AGENT_JOB', 'INVALID_AGENT_STATE',
      'INVALID_NARRATIVE_OUTPUT', 'ERR_AGENT_DECISION', 'ERR_AGENT_PROPOSAL', 'ERR_AGENT_EVIDENCE', 'ERR_AGENT_CONTEXT_TOO_LARGE',
      'ERR_COGNITION_INVALID', 'ERR_COGNITION_SOURCE', 'ERR_COGNITION_CONFLICT', 'ERR_DECISION_STATE', 'INVALID_DOMAIN_STATE',
      'SOURCE_VERSION_MISMATCH', 'INVALID_CONVERSATION_STATE', 'ERR_CONVERSATION_STATE', 'INVALID_SCENE_STAGE'];
    const phases = ['configuration', 'packet', 'request', 'http_status', 'response_headers', 'response_body', 'response_json',
      'response_envelope', 'candidate_json', 'proposal', 'timeout', 'cancelled', 'host_validation'];
    if (!['prepare', 'context', 'configuration', 'model', 'validation', 'continuation', 'commit'].includes(fields.stage)
      || !codes.includes(fields.code) || (fields.phase !== undefined && !phases.includes(fields.phase))
      || !['manual_retry', 'check_settings', 'inspect_commit', 'refresh_state'].includes(fields.retryAdvice)
      || !['no', 'possible'].includes(fields.retryRequiresModel)) return undefined;
    const result = { stage: fields.stage, code: fields.code,
      phase: fields.phase ?? (fields.stage === 'configuration' ? 'configuration' : 'host_validation'),
      retryAdvice: fields.retryAdvice, retryRequiresModel: fields.retryRequiresModel };
    const locations = ['openai_envelope', 'openai_choice', 'openai_message', 'anthropic_envelope', 'anthropic_block'];
    const extensions = ['reasoning_content', 'reasoning', 'reasoning_details', 'tool_calls', 'function_call', 'audio',
      'provider_specific_fields', 'prompt_logprobs', 'request_id', 'native_finish_reason', 'finish_details', 'stop_reason',
      'stop_sequence', 'text', 'delta'];
    const issues = [...locations.map(location => `${location}_fields`),
      ...locations.flatMap(location => extensions.map(extension => `${location}_${extension}`)),
      'openai_choices', 'openai_finish', 'openai_truncated', 'openai_message_content', 'anthropic_content', 'anthropic_text',
      'scene_action_mismatch', 'scene_job_mismatch', 'scene_plan_mismatch', 'scene_base_mismatch', 'scene_scheduling_mismatch',
      'scene_journal_mismatch', 'scene_task_result_mismatch', 'scene_task_frame_mismatch', 'scene_task_scope_mismatch',
      'scene_source_visibility', 'scene_delivery_mismatch', 'scene_social_requests_mismatch', 'scene_goal_templates_mismatch',
      'scene_baseline_missing', 'scene_state_mismatch'];
    if (issues.includes(fields.issue)) result.issue = fields.issue;
    if (result.stage === 'validation' && result.phase === 'proposal' && result.code === 'ERR_MODEL_RESPONSE'
      && fields.rule === 'player-performance-player-choice') result.rule = fields.rule;
    for (const [key, min, max] of [['httpStatus', 100, 599], ['attempt', 1, 11], ['retryLimit', 0, 10], ['modelCalls', 0, 1000],
      ['reusedTasks', 0, 32], ['completedTasks', 0, 32], ['pendingTasks', 0, 32]]) {
      if (Number.isSafeInteger(fields[key]) && fields[key] >= min && fields[key] <= max) result[key] = fields[key];
    }
    return result;
  } catch { return undefined; }
}
function failureSummaryText(failure) {
  const stage = { prepare: '回合准备', context: '上下文准备', configuration: '模型配置', model: '模型请求',
    validation: '输出校验', continuation: '后续任务续接', commit: '最终提交校验' }[failure.stage];
  let reason = { configuration: '模型设置不可用', packet: '上下文未通过传输校验', request: '接口请求未完成',
    http_status: '模型服务返回错误状态', response_headers: '响应头不符合协议', response_body: '响应正文无效',
    response_json: '响应不是有效 JSON', response_envelope: '模型响应封套不符合协议', candidate_json: '候选输出不是有效 JSON',
    proposal: '候选输出未通过校验', timeout: '模型请求超时', cancelled: '模型请求已取消', host_validation: '规则或状态校验未通过' }[failure.phase];
  const hostReason = { scene_action_mismatch: '场景行动不匹配', scene_job_mismatch: '场景任务身份不匹配',
    scene_plan_mismatch: '场景计划不匹配', scene_base_mismatch: '场景起始状态不匹配', scene_scheduling_mismatch: '场景调度校验不通过',
    scene_journal_mismatch: '场景事件收据不匹配', scene_task_result_mismatch: '已校验任务结果不匹配', scene_task_frame_mismatch: '任务场景帧不匹配',
    scene_task_scope_mismatch: '任务作用域不匹配', scene_source_visibility: '来源可见性校验不通过', scene_delivery_mismatch: '信息交付校验不通过',
    scene_social_requests_mismatch: '交流请求状态不匹配', scene_goal_templates_mismatch: '目标模板校验不通过',
    scene_baseline_missing: '缺少场景基线', scene_state_mismatch: '场景决策状态不匹配' }[failure.issue];
  if (failure.stage === 'model' && failure.code === 'AGENT_TIMEOUT') reason = '模型响应超时';
  else if (failure.stage === 'model' && failure.phase === 'http_status' && failure.httpStatus === 429) reason = '模型服务限流或额度不足';
  else if (hostReason) reason = hostReason;
  else if (failure.rule === 'player-performance-player-choice') reason = '候选演绎与玩家明确选择的行动或发言不符';
  else if (failure.issue === 'openai_truncated') reason = '模型输出被截断';
  else if (failure.issue && /_(?:reasoning_content|reasoning|reasoning_details)$/u.test(failure.issue)) reason = '响应含不支持的推理字段';
  else if (failure.issue && /_(?:tool_calls|function_call)$/u.test(failure.issue)) reason = '响应含不支持的工具调用';
  const details = [`阶段：${stage}`, `原因：${reason}（${failure.code}）`];
  if (failure.httpStatus !== undefined) details.push(`模型 HTTP 状态：${failure.httpStatus}`);
  if (failure.attempt !== undefined) details.push(`尝试：${failure.attempt}${failure.retryLimit !== undefined ? `/${failure.retryLimit + 1}` : ''}`);
  if (failure.completedTasks !== undefined) details.push(`已完成子任务：${failure.completedTasks}`);
  if (failure.pendingTasks !== undefined) details.push(`待完成子任务：${failure.pendingTasks}`);
  if (failure.modelCalls !== undefined) details.push(`本次模型调用：${failure.modelCalls}`);
  if (failure.reusedTasks !== undefined) details.push(`复用结果：${failure.reusedTasks}`);
  return `${details.join('；')}。`;
}
function failureRetryHint(failure) {
  const advice = failure.stage === 'commit'
    ? `${failure.pendingTasks === 0 ? '模型子任务已完成，' : '已通过校验的子任务结果已保留，'}最终提交校验未完成，并非网络问题。请检查日志并修复后，使用原请求手动重新提交，不必反复重抽。`
    : failure.stage === 'model' && failure.httpStatus === 429
      ? '请先检查当前模型线路的额度或限流状态，恢复后再手动续接原请求。'
      : { manual_retry: '请确认后手动续接原请求。', check_settings: '请检查 Options 中的模型设置后手动续接原请求。',
      inspect_commit: '请检查日志并修复提交校验后手动续接原请求。', refresh_state: '请先手动刷新并核对当前状态，再确认是否续接原请求。' }[failure.retryAdvice];
  return `${advice}不会自动提交或调用模型。${failure.retryRequiresModel === 'no'
    ? '将复用保留结果，无需再次调用模型。' : '手动续接仍可能调用模型并产生费用。'}`;
}
function setBusy(value) {
  busy = value;
  const openingActive = typeof trialOpeningUI !== 'undefined' && trialOpeningUI?.active;
  const transitionActive = typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active;
  const guardPending = !!state?.guardReaction?.pending && !document.body.classList.contains('at-title');
  const blocked = busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || guardPending || !!saveConfirmation || avatarProcessing || creatorBusy || openingActive || transitionActive || $('case-execution-dialog')?.open === true;
  setWitchBookBusy(blocked);
  if (typeof trialTestimonyUI !== 'undefined') trialTestimonyUI?.setDisabled(!canUseTestimony());
  newAvatarPicker.setDisabled(blocked);
  $('new-confirm').disabled = blocked || newAvatarProcessing;
  $('new-game-examples').disabled = blocked || newAvatarProcessing;
  // The creator refresh reads #new-game-examples.disabled. Parent locks must
  // already be current, or releasing busy leaves #pc-form and its draft locked.
  playerCreator?.setDisabled?.(busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || !!saveConfirmation || avatarProcessing || newAvatarProcessing);
  // The server's default story exists even before the player has saved a game.
  const hasSaves = !!state?.saveSlots?.length;
  $('title-resume').hidden = !hasSaves;
  $('title-resume').disabled = (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || !!saveConfirmation || avatarProcessing || newAvatarProcessing || creatorBusy || openingActive || transitionActive) || !hasSaves;
  $('title-exit').disabled = blocked || newAvatarProcessing;
  $('exit-confirm').disabled = blocked || newAvatarProcessing;
  const regenerationLocked = !!pendingRegeneration || state?.agentRuntime?.operation === 'regenerate';
  const executionLocked = state?.phoneState === 'execution_ready' && supportedProcedure(state);
  $('send').disabled = blocked || regenerationLocked || executionLocked || !state || !!state.completed;
  updateExplicitAttemptButton();
  $('save').disabled = blocked || !state || saveLoadMode !== 'save';
  const loadBlocked = busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || !!saveConfirmation || avatarProcessing || newAvatarProcessing || creatorBusy || openingActive || transitionActive;
  $('load').disabled = loadBlocked || saveLoadMode !== 'load' || !selectedSave();
  $('delete-save').disabled = blocked || !selectedSave();
  $('rename-save').disabled = blocked || newAvatarProcessing || !selectedSave();
  $('save-confirm-accept').disabled = busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || avatarProcessing || newAvatarProcessing || creatorBusy;
  $('save-rename-name').disabled = busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || avatarProcessing || newAvatarProcessing || creatorBusy;
  $('new-save-target').disabled = blocked;
  $('save-custom-name').disabled = blocked;
  $('mode-save-btn').disabled = blocked; $('mode-load-btn').disabled = loadBlocked;
  $('action').disabled = blocked || executionLocked || !state || !!state.completed;
  for (const b of $('suggestions').children) b.disabled = blocked || regenerationLocked || executionLocked || !!state?.completed;
  const dialogOpen = !!document.querySelector?.('dialog[open]');
  const runtime = state?.agentRuntime;
  const jobLocked = ['pending', 'running', 'failed'].includes(runtime?.status);
  for (const b of document.querySelectorAll('.turn-floor button')) {
    b.disabled = blocked || newAvatarProcessing || dialogOpen;
    if (b.dataset.regenerateTurn) b.disabled ||= executionLocked || state?.exampleId !== 'agent' || !!pendingAction
      || (!!pendingRegeneration && pendingRegeneration.turnId !== b.dataset.regenerateTurn)
      || (jobLocked && !(runtime.operation === 'regenerate' && runtime.turnId === b.dataset.regenerateTurn));
  }
  if (typeof agentStatusUI !== 'undefined') agentStatusUI?.sync();
  if (typeof caseExecutionUI !== 'undefined') caseExecutionUI?.sync();
  if (typeof phoneBallotUI !== 'undefined') phoneBallotUI?.sync();
  if (typeof developerPanelUI !== 'undefined') developerPanelUI?.sync();
  if (typeof diceUI !== 'undefined') diceUI?.setBusy(!canUseDice());
  if (typeof syncGuardRulesUpgrade === 'function') syncGuardRulesUpgrade();
  if (typeof caseItemControlsUI !== 'undefined') caseItemControlsUI?.sync();
}
function canUseTestimony({ allowWitchBook = false } = {}) {
  return !!state && !state.guardReaction?.pending && state.trial?.stage === 'discussion' && !state.completed && !busy
    && (typeof diceProcessing === 'undefined' || !diceProcessing) && !avatarProcessing && !newAvatarProcessing && !creatorBusy
    && !saveConfirmation && !composing && !pendingAction && !pendingRegeneration
    && !['pending', 'running', 'failed'].includes(state.agentRuntime?.status)
    && state.agentRuntime?.operation !== 'regenerate'
    && !(typeof trialOpeningUI !== 'undefined' && trialOpeningUI?.active)
    && !(typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active)
    && !$('game-screen').hidden && !document.body.classList.contains('at-title')
    && !document.querySelector?.(allowWitchBook ? 'dialog[open]:not(#witchbook-dialog)' : 'dialog[open]');
}
function canUseDice() {
  // The panel's own request lock is intentionally excluded: feeding it back
  // would prevent the explicit retry/reconciliation controls from unlocking.
  return !!state && (!state.completed || !!state.guardReaction?.resolution) && !busy && !avatarProcessing && !newAvatarProcessing && !creatorBusy
    && !saveConfirmation && !composing && !pendingAction && !pendingRegeneration
    && !['pending', 'running', 'failed'].includes(state.agentRuntime?.status)
    && state.agentRuntime?.operation !== 'regenerate'
    && !(state.phoneState === 'execution_ready' && supportedProcedure(state))
    && !(typeof trialOpeningUI !== 'undefined' && trialOpeningUI?.active)
    && !(typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active)
    && !$('game-screen').hidden && !document.body.classList.contains('at-title')
    && !document.querySelector?.('dialog[open]:not(#dice-dialog)');
}
async function request(path, data) {
  const explicitHeaders = path === '/api/act' && data?.requestId === (typeof explicitAttempt === 'undefined' ? undefined : explicitAttempt?.requestId)
    ? { 'X-Manosaba-New-Attempt-Of': explicitAttempt.parentRequestId } : {};
  const response = await fetch(path, data === undefined ? (path === '/api/run-policy' ? { headers: { 'X-Manosaba-Token': csrfToken }, cache: 'no-store' } : {}) : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Manosaba-Token': csrfToken, ...explicitHeaders }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || '请求失败。');
    error.code = result.code; error.status = response.status;
    if (result.currentView) error.currentView = result.currentView;
    const failure = typeof safeFailureSummary === 'function'
      ? safeFailureSummary(Object.getOwnPropertyDescriptor(result, 'failure')?.value) : undefined;
    if (failure) error.failure = failure;
    const actionOutcome = typeof finiteActionOutcome === 'function' ? finiteActionOutcome(result) : undefined;
    if (actionOutcome?.outcome.kind === 'execution_failed') error.actionOutcome = actionOutcome.outcome;
    const correlationId = response.headers?.get('X-Manosaba-Request-Id');
    if (typeof correlationId === 'string' && /^[a-f0-9-]{36}$/iu.test(correlationId)) error.correlationId = correlationId;
    throw error;
  }
  if (path === '/api/view' && data === undefined) {
    // Page metadata rides the original view response, outside the world DTO.
    const version = response.headers?.get?.('X-Manosaba-Product-Version');
    if (typeof version === 'string' && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$/u.test(version)) {
      const label = $('title-product-version');
      if (label) { label.textContent = `版本 ${version}`; label.hidden = false; }
    }
  }
  return result;
}
const runPolicyDialog = $('run-policy-dialog');
let runPolicyBase, runPolicyBusy = false, runPolicyStale = false, runPolicyRetry;
const runPolicyErrors = Object.freeze({
  RUN_POLICY_UNSUPPORTED: '此存档不支持在游玩中调整本局设置。',
  RUN_POLICY_PENDING: '请先完成或按原规则放弃未结行动，再返回采用。草稿已保留。',
  RUN_POLICY_ACTIVE_CASE: '已有案件活动，不能用排除案件撤销。草稿已保留。',
  RUN_POLICY_STALE: '进度已变化。请重新读取并检查草稿后再采用。',
  INVALID_TOKEN: '页面凭据已失效，请刷新。',
  INVALID_RUN_POLICY: '本局设置无效。请检查字数和条数；草稿已保留。',
  RUN_POLICY_REQUEST_CONFLICT: '采用请求已冲突，请重新读取；草稿已保留。',
});
const runPolicyBoundaryIds = Array.from({ length: 8 }, (_, index) => `run-policy-boundary-${index + 1}`);
const sameBoundaryDraft = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function runPolicyDraft() {
  const raw = rawRunPolicyDraft();
  return normalizeCreationPreferences({ directorPreferences: raw.style, playPolicy: { cases: raw.cases,
    boundaries: raw.boundaries.filter(text => text.trim()) } });
}
function rawRunPolicyDraft() {
  return { style: $('run-policy-style').value, cases: $('run-policy-cases').value,
    boundaries: runPolicyBoundaryIds.map(id => $(id).value) };
}
function rawEffectivePolicy(current) {
  return { style: current.directorPreferences, cases: current.playPolicy.cases,
    boundaries: runPolicyBoundaryIds.map((_, index) => current.playPolicy.boundaries[index] ?? '') };
}
function updateRunPolicyDialog() {
  $('run-policy-fields').disabled = runPolicyBusy || !runPolicyBase;
  $('run-policy-adopt').disabled = runPolicyBusy || !runPolicyBase || runPolicyStale;
  $('run-policy-reload').disabled = runPolicyBusy;
  $('run-policy-close').disabled = runPolicyBusy;
}
function adoptPolicyView(view, preserveDraft = false) {
  // Keep only the raw fields the user has changed when they explicitly reload.
  // A new generation is a different run; never apply that draft to it.
  const old = runPolicyBase?.generation === view.generation && preserveDraft ? rawEffectivePolicy(runPolicyBase.effective) : null;
  const before = rawRunPolicyDraft(), effective = rawEffectivePolicy(view.effective);
  runPolicyBase = view; runPolicyStale = false;
  for (const name of ['style', 'cases']) $('run-policy-' + name).value = old && before[name] !== old[name] ? before[name] : effective[name];
  const rules = old && !sameBoundaryDraft(before.boundaries, old.boundaries) ? before.boundaries : effective.boundaries;
  for (const [index, id] of runPolicyBoundaryIds.entries()) $(id).value = rules[index];
  const summary = $('run-policy-current');
  const shownRules = view.effective.playPolicy.boundaries.map((text, index) => `${index + 1}. ${text}`).join('\n');
  summary.hidden = false;
  summary.textContent = ['当前生效：' + (effective.cases === 'excluded' ? '排除新增案件' : '允许案件'),
    '导演偏好：' + (effective.style || '未填写'), '其他边界：' + (shownRules || '未填写')].join('\n');
}
async function readRunPolicy() {
  if (runPolicyBusy) return;
  runPolicyBusy = true; updateRunPolicyDialog();
  $('run-policy-status').textContent = '正在读取本局设置…';
  try {
    const view = await request('/api/run-policy');
    const wasDifferentRun = runPolicyBase && runPolicyBase.generation !== view.generation;
    adoptPolicyView(view, true);
    if (wasDifferentRun) runPolicyRetry = undefined;
    $('run-policy-status').textContent = wasDifferentRun ? '已切换到另一局，未带入上一局的草稿。' : '已读取生效设置；已有草稿的改动仍待采用。';
  } catch (error) {
    runPolicyStale = true;
    if (error.code === 'RUN_POLICY_UNSUPPORTED') $('run-policy-current').hidden = true;
    $('run-policy-status').textContent = runPolicyErrors[error.code] || '读取失败，请重试。已有草稿未删除。';
  } finally { runPolicyBusy = false; updateRunPolicyDialog(); }
}
function openRunPolicy() {
  if (busy || !state || runPolicyDialog.open) return;
  if (runPolicyBase?.generation !== state.generation) {
    runPolicyBase = undefined; runPolicyRetry = undefined;
    $('run-policy-current').hidden = true;
    $('run-policy-form').reset();
  }
  runPolicyDialog.showModal();
  readRunPolicy();
}
runPolicyDialog?.addEventListener('cancel', event => { if (runPolicyBusy) event.preventDefault(); });
$('run-policy-close')?.addEventListener('click', () => { if (!runPolicyBusy) runPolicyDialog.close(); });
$('run-policy-reload')?.addEventListener('click', readRunPolicy);
$('run-policy-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (runPolicyBusy || runPolicyStale || !runPolicyBase) return;
  const status = $('run-policy-status');
  let draft;
  try { draft = runPolicyDraft(); }
  catch { status.textContent = runPolicyErrors.INVALID_RUN_POLICY; return; }
  const e = runPolicyBase.effective, playPolicy = {};
  if (draft.playPolicy.cases !== e.playPolicy.cases) playPolicy.cases = draft.playPolicy.cases;
  if (!sameBoundaryDraft(draft.playPolicy.boundaries, e.playPolicy.boundaries)) playPolicy.boundaries = draft.playPolicy.boundaries;
  const changes = { ...(draft.directorPreferences !== e.directorPreferences ? { directorPreferences: draft.directorPreferences } : {}),
    ...(Object.keys(playPolicy).length ? { playPolicy } : {}) };
  if (!Object.keys(changes).length) { status.textContent = '没有尚待采用的改动。'; return; }
  const edit = { expectedGeneration: runPolicyBase.generation, expectedRevision: runPolicyBase.revision, ...changes };
  const fingerprint = JSON.stringify(edit);
  if (runPolicyRetry?.fingerprint !== fingerprint) runPolicyRetry = { fingerprint, requestId: crypto.randomUUID() };
  runPolicyBusy = true; updateRunPolicyDialog(); status.textContent = '正在采用本局设置…';
  try {
    const receipt = await request('/api/run-policy', { ...edit, requestId: runPolicyRetry.requestId });
    runPolicyRetry = undefined;
    // An exact retry can acknowledge a historic successful adoption. Only a
    // subsequent authoritative GET can describe what is currently in effect.
    let current;
    try { current = await request('/api/run-policy'); }
    catch {
      runPolicyStale = true; $('run-policy-current').hidden = true;
      status.textContent = '采用请求已确认，但未能读取当前设置。请重新读取。'; return;
    }
    adoptPolicyView(current);
    const olderReceipt = current.generation !== receipt.runPolicy.generation || current.revision !== receipt.runPolicy.revision;
    status.textContent = olderReceipt ? '采用请求已确认；上方显示当前进度的生效设置。'
      : receipt.changed ? '已采用，将用于后续游玩。' : '这些设置已经生效。';
    try {
      if (current.generation !== state.generation || current.revision !== state.revision) render(await request('/api/view'));
    } catch { status.textContent = '采用请求已确认；游戏画面未能同步，请刷新页面。'; }
  } catch (error) {
    runPolicyStale = ['RUN_POLICY_STALE', 'RUN_POLICY_REQUEST_CONFLICT', 'RUN_POLICY_UNSUPPORTED', 'INVALID_TOKEN'].includes(error.code);
    status.textContent = runPolicyErrors[error.code] || '未能确认结果。草稿已保留；可用相同内容再试。';
  } finally { runPolicyBusy = false; updateRunPolicyDialog(); }
});
function pendingActionDisplayText(action = pendingAction) {
  return typeof testimonyDraft !== 'undefined' && testimonyDraft ? testimonyDraft.pendingDisplay(action)
    : typeof testimonyDisplayText === 'function' ? testimonyDisplayText(action) : action?.text || '';
}
async function operation(action, { retryAction = false, focusAction = retryAction } = {}) {
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || avatarProcessing || newAvatarProcessing || creatorBusy
    || (typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active)) return;
  setBusy(true); $('message').textContent = ''; $('saves-message').textContent = '';
  try { await action(); }
  catch (error) {
    let message = error.message;
    const failure = typeof safeFailureSummary === 'function'
      ? safeFailureSummary(Object.getOwnPropertyDescriptor(error, 'failure')?.value) : undefined;
    if (failure) message += ` ${failureSummaryText(failure)}`;
    const actionOutcome = typeof finiteActionOutcome === 'function' ? finiteActionOutcome(error) : undefined;
    if (actionOutcome?.outcome.kind === 'execution_failed') message += ` ${actionOutcome.text}`;
    if (retryAction && error.currentView) render(error.currentView);
    if (retryAction && ['ERR_LLM_TURN_FAILED', 'LLM_TURN_FAILED', 'AGENT_TIMEOUT', 'AGENT_BATCH_CANCELLED', 'LLM_NOT_CONFIGURED', 'SETTINGS_UNAVAILABLE'].includes(error.code)) {
      // A failed leased turn may already have advanced the public head. Keep
      // the original idempotency scope so a manual retry resumes that turn.
      message += failure ? ` 输入和请求编号已保留；${failureRetryHint(failure)}`
        : ' 输入和请求编号已保留；请确认后用相同文本手动重试，不会自动调用模型。重试可能产生费用。';
    } else if (['STALE_GENERATION', 'STALE_REVISION', 'STALE_AGENT_TURN', 'IDEMPOTENCY_CONFLICT', 'STALE_SAVE', 'SAVE_NOT_FOUND'].includes(error.code) || error.status === 403) {
      pendingAction = undefined;
      if (typeof testimonyDraft !== 'undefined') testimonyDraft?.clear();
      try {
        render(await request('/api/view'));
        message += ['STALE_SAVE', 'SAVE_NOT_FOUND'].includes(error.code)
          ? ' 已刷新存档列表；请重新选择并确认，未自动覆盖或删除，也未自动重命名。'
          : ' 已刷新当前进度；请确认剧情后重新提交，输入内容已保留。';
      } catch { message += ' 刷新失败，请检查连接后刷新页面。'; }
    } else if (error.status && error.status < 500) {
      pendingAction = undefined;
      if (typeof testimonyDraft !== 'undefined') testimonyDraft?.clear();
    } else if (retryAction) {
      message += ' 网络中断时再次提交相同文本会复用请求编号。';
    } else {
      message += ' 请刷新并核对操作结果后再试，避免重复操作。';
    }
    if (retryAction && typeof agentStatusUI !== 'undefined') agentStatusUI?.finish(
      ['pending', 'running', 'failed'].includes(error.currentView?.agentRuntime?.status) ? error.currentView.agentRuntime.status
        : !error.status || error.status >= 500 ? 'unknown' : 'failed');
    if (error.correlationId) message += `（日志编号：${error.correlationId}）`;
    if (typeof testimonyFeedbackText === 'function') message = testimonyFeedbackText(message);
    $('message').textContent = message; $('title-message').textContent = message; $('saves-message').textContent = message;
  } finally {
    if (!pendingAction) pendingBookAction = undefined;
    $('book-action-retry').hidden = !pendingBookAction;
    $('book-action-retry').disabled = !pendingAction;
    setBusy(false);
    // Disabling the composer during settlement drops keyboard focus. Restore it
    // after an action/clarification, but never steal focus from an open dialog.
    if (focusAction && !$('action').disabled && !$('game-screen').hidden && !document.hidden
      && !(typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active)
      && !document.querySelector('dialog[open]')) $('action').focus();
  }
}
$('action-form').addEventListener('submit', (event) => {
  event.preventDefault();
  submitAction();
});
function explicitNewAttemptParent() {
  const runtime = state?.agentRuntime, text = $('action').value.trim();
  if (state?.exampleId !== 'agent' || runtime?.supportsExplicitNewAttempt !== true || runtime?.status !== 'failed' || runtime.operation === 'regenerate'
    || runtime.expectedGeneration !== state.generation || runtime.expectedRevision !== state.revision
    || !runtime.requestId || !text || runtime.text !== text || runtime.displayText !== undefined
    || pendingBookAction || pendingRegeneration || saveConfirmation || state.completed || state.guardReaction?.pending
    || (state.phoneState === 'execution_ready' && supportedProcedure(state))
    || phoneBallotChoices(state, supportedProcedure).some(choice => choice.command === text)) return undefined;
  return runtime;
}
function updateExplicitAttemptButton() {
  const button = $('new-attempt'); if (!button) return;
  const parent = explicitNewAttemptParent();
  button.hidden = !parent; button.disabled = busy || $('send').disabled || !parent;
  $('new-attempt-help').hidden = !parent;
  const label = $('send').querySelector('span'); if (label) label.textContent = parent ? '续接原请求' : '执行行动';
}
$('new-attempt').addEventListener('click', () => {
  const parent = explicitNewAttemptParent();
  if (!parent || busy || $('new-attempt').disabled) return;
  submitAction(undefined, { newAttemptOf: parent.requestId });
});
function submitAction(bookAction, { newAttemptOf } = {}) {
  const origin = bookAction?.origin || 'composer';
  const phoneBallot = origin === 'phone-ballot';
  const source = bookAction?.origin || submitSource; submitSource = 'button';
  if (bookAction?.generation !== undefined && (bookAction.generation !== state?.generation
    || (!pendingAction && bookAction.revision !== state?.revision))) {
    pendingBookAction = undefined; $('book-action-retry').hidden = true;
    $('message').textContent = phoneBallot
      ? '进度已改变，未提交本次投票；请重新选择候选。'
      : '进度已改变，未出示材料；请重新打开图鉴选择。'; return false;
  }
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || !state || state.guardReaction?.pending || state.completed || composing || saveConfirmation || pendingRegeneration
    || (typeof trialOpeningUI !== 'undefined' && trialOpeningUI?.active)
    || (typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active)
    || state.agentRuntime?.operation === 'regenerate' || (state.phoneState === 'execution_ready' && supportedProcedure(state))
    || (phoneBallot && document.querySelector?.('dialog[open]'))) return false;
  const value = bookAction?.value ?? $('action').value;
  const text = value.trim(); if (!text) return false;
  if (newAttemptOf !== undefined && (bookAction || explicitNewAttemptParent()?.requestId !== newAttemptOf)) return false;
  let runtimeIsVote = false;
  if (phoneBallot) {
    if (pendingBookAction) return false;
    if (!phoneBallotChoices(state, supportedProcedure).some(choice => choice.command === text)) return false;
    if (pendingAction && pendingActionDisplayText(pendingAction) !== text) {
      $('message').textContent = '上一票的请求尚未结算；请先用原请求手动续接，不能把新选择当作新票提交。'; return false;
    }
    const runtime = state.agentRuntime;
    const runtimeText = typeof runtime?.text === 'string' ? runtime.text.trim() : '';
    runtimeIsVote = Boolean(runtimeText && phoneBallotChoices(state, supportedProcedure)
      .some(choice => choice.command === runtimeText));
    const runtimeSameVote = runtimeIsVote && runtimeText === text;
    const runtimeRecoverable = runtimeSameVote
      && (runtime.expectedGeneration ?? state.generation) === state.generation
      && Number.isSafeInteger(runtime.expectedRevision) && runtime.expectedRevision >= 0
      && typeof runtime.requestId === 'string' && runtime.requestId;
    if (!pendingAction && runtimeIsVote && runtimeText !== text) {
      $('message').textContent = '上一票的请求尚未结算；请先用原请求手动续接，不能把新选择当作新票提交。'; return false;
    }
    if (!pendingAction && runtimeSameVote && !runtimeRecoverable) {
      $('message').textContent = '上一票的原请求尚未恢复；请刷新核对后用原请求手动续接，不能换新编号重复投票。'; return false;
    }
    if (!pendingAction && ['pending', 'running', 'failed'].includes(runtime?.status) && !runtimeSameVote) {
      $('message').textContent = '上一票仍在处理中；请先用原请求手动续接，不会自动重试或另开新票。'; return false;
    }
    if (pendingAction) markPhoneBallotPending();
  }
  const draft = typeof testimonyDraft !== 'undefined' ? testimonyDraft : undefined;
  if (draft && !draft.sync(state, pendingAction)) pendingAction = undefined;
  const wireText = bookAction?.wireText ?? (draft ? draft.resolve(value, state, pendingAction) : text);
  pendingBookAction = phoneBallot ? undefined : bookAction;
  logClientEvent('action.submit', { source, length: text.length });
  operation(async () => {
    // An LLM request owns its pre-turn revision through pending work, network
    // failures and explicit retries. Legacy synchronous scenes still prepare
    // against the current head on a revision change.
    if (newAttemptOf !== undefined) {
      pendingAction = { requestId: crypto.randomUUID(), text: wireText, expectedGeneration: state.generation, expectedRevision: state.revision };
      explicitAttempt = { requestId: pendingAction.requestId, parentRequestId: newAttemptOf };
      draft?.remember(pendingAction, value, state);
    } else if (!pendingAction || (draft ? !draft.matches(pendingAction, value, state) : pendingActionDisplayText() !== text)
      || pendingAction.expectedGeneration !== state.generation
      || (state.exampleId !== 'agent' && pendingAction.expectedRevision !== state.revision)) {
      const retryRuntime = state.exampleId === 'agent' && state.agentRuntime?.operation !== 'regenerate'
        && (['pending', 'running', 'failed'].includes(state.agentRuntime?.status)
          || (phoneBallot && runtimeIsVote && state.agentRuntime?.status === 'idle'))
        && (state.agentRuntime.expectedGeneration ?? state.generation) === state.generation
        && Number.isSafeInteger(state.agentRuntime.expectedRevision) && state.agentRuntime.expectedRevision >= 0
        && typeof state.agentRuntime.requestId === 'string' && state.agentRuntime.requestId
        && typeof state.agentRuntime.text === 'string' && state.agentRuntime.text.trim() === wireText
        ? state.agentRuntime : undefined;
      pendingAction = retryRuntime
        ? { requestId: retryRuntime.requestId, text: wireText, expectedGeneration: state.generation, expectedRevision: retryRuntime.expectedRevision }
        : { requestId: crypto.randomUUID(), text: wireText, expectedGeneration: state.generation, expectedRevision: state.revision };
      explicitAttempt = retryRuntime?.newAttemptOf ? { requestId: pendingAction.requestId, parentRequestId: retryRuntime.newAttemptOf } : undefined;
      if (phoneBallot) markPhoneBallotPending();
      draft?.remember(pendingAction, value, state);
    }
    if (typeof agentStatusUI !== 'undefined') agentStatusUI?.start();
    const result = await request('/api/act', pendingAction);
    // receipt.view describes the original settlement; currentView is the head
    // observed after replay, including newer actions or newly created save slots.
    const view = result.currentView || result.view || result;
    // Clarification isn't a new story beat. Keep the reader's position when
    // the host confirms that no action changed this exact world version.
    const sameVersion = view.generation === state.generation && view.revision === state.revision;
    const readPosition = $('log').scrollTop;
    render(view);
    const inProgress = result.status === 'in_progress' || result.receipt?.status === 'in_progress';
    const retryableFailure = state.exampleId === 'agent' && result.status === 'failed' && view.agentRuntime?.canRetry === true;
    if (inProgress || retryableFailure) {
      // Activity polling is read-only; another process still owns the model
      // call. Keep both input and the original pre-turn version tokens.
      if (typeof agentStatusUI !== 'undefined') agentStatusUI?.finish(inProgress ? 'running' : 'failed');
      const failure = !inProgress && typeof safeFailureSummary === 'function'
        ? safeFailureSummary(Object.getOwnPropertyDescriptor(result, 'failure')?.value
          ?? Object.getOwnPropertyDescriptor(view.agentRuntime || {}, 'failure')?.value) : undefined;
      $('message').textContent = failure ? `本次行动未完成。输入与请求编号已保留；${failureSummaryText(failure)} ${failureRetryHint(failure)}`
        : (typeof testimonyFeedbackText === 'function' ? testimonyFeedbackText(result.message) : result.message) || (inProgress
          ? '本次行动仍在处理中。输入与请求编号已保留；稍后用相同文本再次发送以续接，不会自动重试。'
          : '本次行动未完成。输入与请求编号已保留；请确认后手动重试，模型调用可能产生费用。');
      const failureOutcome = !inProgress && typeof finiteActionOutcome === 'function' ? finiteActionOutcome(result) : undefined;
      if (failureOutcome?.outcome.kind === 'execution_failed') $('message').textContent += ` ${failureOutcome.text}`;
      return;
    }
    pendingAction = undefined;
    if (typeof pendingBookAction !== 'undefined') pendingBookAction = undefined;
    draft?.clear();
    if (typeof agentStatusUI !== 'undefined') agentStatusUI?.finish('idle');
    if (result.accepted === false && sameVersion) $('log').scrollTop = readPosition;
    const hostMessage = (typeof testimonyFeedbackText === 'function' ? testimonyFeedbackText(result.message) : result.message)
      || (state.exampleId === 'agent' ? '眼前的动静渐渐落定。下一步，由你决定。' : '');
    const actionOutcome = typeof finiteActionOutcome === 'function' ? finiteActionOutcome(result) : undefined;
    $('message').textContent = actionOutcome?.text ? (hostMessage ? `${hostMessage} ${actionOutcome.text}` : actionOutcome.text) : hostMessage;
    if (result.accepted !== false) $('action').value = bookAction ? bookAction.preserveDraft : '';
  }, { retryAction: true });
}
$('action').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.isComposing || composing || event.keyCode === 229) return;
  // Some IMEs emit compositionend immediately before the confirming Enter.
  if (performance.now() - compositionFinishedAt < 100) return;
  if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
  event.preventDefault();
  if (event.repeat || $('send').disabled) return;
  submitSource = 'enter';
  $('action-form').requestSubmit();
});
$('action').addEventListener('compositionstart', () => {
  composing = true;
  if (typeof trialTestimonyUI !== 'undefined') trialTestimonyUI?.setDisabled(!canUseTestimony());
  if (typeof diceUI !== 'undefined') diceUI?.setBusy(!canUseDice());
});
$('action').addEventListener('compositionend', () => {
  composing = false; compositionFinishedAt = performance.now();
  if (typeof trialTestimonyUI !== 'undefined') trialTestimonyUI?.setDisabled(!canUseTestimony());
  if (typeof diceUI !== 'undefined') diceUI?.setBusy(!canUseDice());
  if (typeof agentStatusUI !== 'undefined') agentStatusUI?.sync(true);
});
$('action').addEventListener('input', () => {
  const phonePending = isPhoneBallotPending();
  const editedHiddenRequest = !phonePending && typeof testimonyDraft !== 'undefined' && testimonyDraft?.edit(pendingAction);
  const displayText = typeof pendingActionDisplayText === 'function' ? pendingActionDisplayText() : pendingAction?.text;
  if (pendingAction && !phonePending
    && (editedHiddenRequest || displayText !== $('action').value.trim())) pendingAction = undefined;
  if (!pendingAction) { pendingBookAction = undefined; $('book-action-retry').hidden = true; }
  updateExplicitAttemptButton();
  if (typeof diceUI !== 'undefined') diceUI?.setBusy(!canUseDice());
});
function chooseSuggestion(text, scope) {
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || !state || state.guardReaction?.pending || state.completed || saveConfirmation || composing || pendingRegeneration
    || (typeof trialOpeningUI !== 'undefined' && trialOpeningUI?.active)
    || (typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active)
    || state.agentRuntime?.operation === 'regenerate' || (state.phoneState === 'execution_ready' && supportedProcedure(state))) return;
  const draft = typeof testimonyDraft !== 'undefined' ? testimonyDraft : undefined;
  const displayText = scope ? draft?.select(text, scope, state)
    : typeof testimonyDisplayText === 'function' ? testimonyDisplayText({ text }) : text;
  if (displayText === undefined) return;
  const phonePending = isPhoneBallotPending();
  const replacedHiddenRequest = !phonePending && !scope && draft?.edit(pendingAction);
  if (pendingAction && !phonePending && (replacedHiddenRequest
    || (typeof pendingActionDisplayText === 'function' ? pendingActionDisplayText() : pendingAction.text) !== displayText)) pendingAction = undefined;
  $('action').value = displayText; $('action').focus();
  logClientEvent('suggestion.select', { source: 'suggestion', length: text.length });
  if (runtimeOptions.directSendSuggestions && !phonePending) { submitSource = 'suggestion'; $('action-form').requestSubmit(); }
}
function saveName(save) {
  return $('save-custom-name').value.trim() || save?.name
    || `${state.scenarioTitle || state.episode?.title || (state.exampleId === 'agent' ? '高墙之内' : state.exampleId === 'custom' ? '八云晓' : '序章')} · ${state.location} · ${state.phaseLabel || labels[state.phase] || state.phase} · ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
}
async function performSave(target) {
  const updated = await request('/api/save', target);
  render(updated);
  if (updated.savedSlot?.id) { $('save-slots').value = updated.savedSlot.id; syncSaveSelection(); }
  $('save-custom-name').value = '';
  $('message').textContent = $('saves-message').textContent = target.saveId ? '已覆盖所选存档，当前剧情未被读取或回退。' : '当前进度已保存到本机。';
}
function openSaveConfirmation(kind) {
  const save = selectedSave();
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || avatarProcessing || newAvatarProcessing || creatorBusy || saveConfirmation || !save || (kind === 'overwrite' && saveLoadMode !== 'save')) return;
  const rename = kind === 'rename';
  saveConfirmation = { kind, saveId: save.id, expectedSaveVersion: save.version,
    ...(kind === 'overwrite' ? { name: saveName(save), expectedGeneration: state.generation, expectedRevision: state.revision } : {}) };
  $('save-confirm-title').textContent = rename ? '重命名存档' : kind === 'overwrite' ? '覆盖这个存档？' : '删除这个存档？';
  $('save-confirm-preview').textContent = rename
    ? `修改「${save.name}」的名称。存档内容、当前游戏进度与行动记录均保持不变。`
    : kind === 'overwrite'
      ? `「${save.name}」将替换为当前进度。旧存档内容无法恢复；其他存档不受影响。`
      : `将永久删除「${save.name}」。当前游戏进度、行动楼层和其他存档不会改变。`;
  $('save-rename-fields').hidden = !rename;
  $('save-rename-name').value = rename ? save.name : '';
  $('save-rename-name').setAttribute('aria-invalid', 'false');
  $('save-rename-error').textContent = '';
  $('save-confirm-accept').textContent = rename ? '确认重命名' : kind === 'overwrite' ? '确认覆盖' : '确认删除';
  $('save-confirm-accept').classList.toggle('saveload-danger-btn', !rename);
  $('save-confirm-dialog').showModal(); setBusy(busy);
  if (rename) { $('save-rename-name').focus(); $('save-rename-name').select(); }
}
function clearSaveConfirmation() { saveConfirmation = undefined; setBusy(busy); }
$('save').addEventListener('click', () => {
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || saveConfirmation || saveLoadMode !== 'save' || !state) return;
  if (selectedSave()) return openSaveConfirmation('overwrite');
  const target = { name: saveName(), expectedGeneration: state.generation, expectedRevision: state.revision };
  operation(() => performSave(target));
});
$('new-save-target').addEventListener('click', () => selectSave(''));
$('delete-save').addEventListener('click', () => openSaveConfirmation('delete'));
$('rename-save').addEventListener('click', () => openSaveConfirmation('rename'));
$('save-rename-name').addEventListener('input', () => {
  $('save-rename-error').textContent = '';
  $('save-rename-name').setAttribute('aria-invalid', 'false');
});
$('save-confirm-cancel').addEventListener('click', () => {
  logClientEvent('save.cancel'); clearSaveConfirmation(); $('save-confirm-dialog').close();
});
$('save-confirm-dialog').addEventListener('cancel', () => { logClientEvent('save.cancel'); clearSaveConfirmation(); });
$('save-confirm-dialog').addEventListener('close', clearSaveConfirmation);
$('save-confirm-form').addEventListener('submit', event => {
  event.preventDefault();
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || avatarProcessing || newAvatarProcessing || creatorBusy || !saveConfirmation) return;
  const { kind, ...target } = saveConfirmation;
  if (kind === 'rename') {
    const input = $('save-rename-name');
    const name = input.value.trim();
    if (!name || input.value.length > 80) {
      $('save-rename-error').textContent = '存档名称需为 1—80 字，不能只包含空白。';
      input.setAttribute('aria-invalid', 'true'); input.focus();
      return;
    }
    target.name = name;
  }
  clearSaveConfirmation(); $('save-confirm-dialog').close();
  logClientEvent(kind === 'rename' ? 'save.rename' : kind === 'overwrite' ? 'save.overwrite' : 'save.delete');
  operation(async () => {
    if (kind === 'overwrite') return performSave(target);
    if (kind === 'rename') {
      const updated = await request('/api/saves/rename', target);
      const readPosition = $('log').scrollTop;
      render(updated); $('log').scrollTop = readPosition;
      if (updated.savedSlot?.id) { $('save-slots').value = updated.savedSlot.id; syncSaveSelection(); }
      $('message').textContent = $('saves-message').textContent = '已重命名所选存档，存档内容与当前进度保持不变。';
      return;
    }
    render(await request('/api/saves/delete', target));
    $('message').textContent = $('saves-message').textContent = '已删除所选存档，当前剧情与回溯记录保留。';
  });
});
$('load').addEventListener('click', () => {
  const save = selectedSave();
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || saveConfirmation || saveLoadMode !== 'load' || !save) return;
  operation(async () => {
    const view = await request('/api/load', { saveId: save.id });
    $('saves-dialog').close();
    await transitionToScreen('game', () => {
      render(view); pendingAction = undefined; $('action').value = ''; $('message').textContent = '已读档。';
    });
  }, { focusAction: true });
});
function scrollCustomScene() {
  const log = $('log');
  log.scrollTop = log.scrollHeight;
}
function scrollSceneEntry(index, edge, scope) {
  // Reading navigation only targets already-rendered entries, never an action.
  if (!Number.isSafeInteger(index) || index < 0) return;
  const log = $('log');
  const fragments = Array.from(log.querySelectorAll(`[data-entry-index="${index}"]`));
  const entry = edge === 'end' ? fragments.at(-1) : fragments[0];
  if (!entry) return;
  if (typeof storyTypewriter !== 'undefined') storyTypewriter?.finish({ follow: false });
  if (typeof scenePlayback !== 'undefined' && scenePlayback?.active) {
    scenePlayback.scrollToEntry(index, { ...scope, edge, focus: true });
    return;
  }
  entry.tabIndex = -1; entry.focus({ preventScroll: true });
  const bounds = entry.getBoundingClientRect();
  const viewport = log.getBoundingClientRect();
  log.scrollTop += edge === 'end' ? bounds.bottom - viewport.bottom : bounds.top - viewport.top;
}
function paintSceneProjection(projection) {
  if (!state || projection.generation !== state.generation || projection.revision !== state.revision
    || (typeof scenePlayback !== 'undefined' && scenePlayback?.snapshot?.projection !== projection)) return;
  const backdrop = document.querySelector('.scene-backdrop');
  const scenery = projection.background;
  backdrop.style.backgroundImage = scenery.url
    ? `linear-gradient(90deg, #16131ca8, #15121b60), url("${scenery.url}")`
    : 'linear-gradient(120deg, #252131, #16131c)';
  backdrop.dataset.scene = scenery.id;
  // The committed head is the live player position. Older transcript frames
  // keep their own recorded location; a sparse frame must not replace the
  // current public view location with a placeholder.
  const location = projection.atHead ? state?.location : '';
  $('location').textContent = location || projection.location || '场景未记录';
  // Only derive the committed track; BgmPlayer still owns pause/mute/volume.
  if (!document.body.classList.contains('at-title')) bgmPlayer.setTrack(projection.bgm);
}
function enterGame() {
  $('title-screen').hidden = true; $('game-screen').hidden = false; document.body.classList.remove('at-title');
  agentStatusUI?.sync(true);
  if (typeof developerPanelUI !== 'undefined') developerPanelUI?.sync();
  const holdingDice = typeof diceUI !== 'undefined' && diceUI?.holding;
  const restored = !holdingDice && typeof scenePlayback !== 'undefined' && scenePlayback?.refresh({ scroll: true });
  if (!restored) { if (!holdingDice) bgmPlayer.setTrack(state?.bgm); scrollCustomScene(); }
  if (typeof storyTypewriter !== 'undefined') storyTypewriter?.sync();
  if (typeof trialTestimonyUI !== 'undefined') trialTestimonyUI?.setDisabled(!canUseTestimony());
  if (typeof diceUI !== 'undefined') { diceUI?.setActive(true); diceUI?.sync(state); }
  setBusy(busy);
}
function showTitle() {
  $('title-message').textContent = '';
  $('title-screen').hidden = false; $('game-screen').hidden = true; document.body.classList.add('at-title');
  if (typeof trialOpeningUI !== 'undefined') trialOpeningUI?.sync();
  if (typeof storyTypewriter !== 'undefined') storyTypewriter?.sync();
  agentStatusUI?.sync();
  if (typeof developerPanelUI !== 'undefined') developerPanelUI?.sync();
  bgmPlayer.setTrack(TITLE_BGM);
  if (typeof trialTestimonyUI !== 'undefined') trialTestimonyUI?.setDisabled(!canUseTestimony());
  if (typeof diceUI !== 'undefined') diceUI?.sync(state);
  setBusy(busy);
}
function transitionToScreen(target, prepare) {
  const commit = () => { prepare?.(); if (target === 'game') enterGame(); else showTitle(); };
  const onComplete = () => {
    if (document.hidden || document.querySelector('dialog[open]')) return;
    if (target === 'game') {
      if (!$('game-screen').hidden && !$('action').disabled) $('action').focus({ preventScroll: true });
    } else if (!$('title-screen').hidden) {
      ($('title-resume').hidden || $('title-resume').disabled ? $('title-new') : $('title-resume')).focus({ preventScroll: true });
    }
  };
  const controller = typeof screenTransitionUI !== 'undefined' ? screenTransitionUI : undefined;
  const atTarget = target === 'title' ? !$('title-screen').hidden : !$('game-screen').hidden;
  if (controller && (!atTarget || controller.active)) return controller.run({ target, commit, onComplete });
  commit(); onComplete(); return Promise.resolve();
}
function returnToTitle() {
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || avatarProcessing || newAvatarProcessing || creatorBusy || saveConfirmation
    || (typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active)
    || document.querySelector('dialog[open]')) return;
  return transitionToScreen('title');
}
$('back-title').addEventListener('click', returnToTitle);
document.querySelector('.brand')?.addEventListener('click', event => {
  if (event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); returnToTitle();
});
$('title-options').addEventListener('click', () => window.openModelSettings());
$('game-options').addEventListener('click', () => window.openModelSettings());
$('title-load').addEventListener('click', () => { if (!state) return; setSaveLoadMode('load'); $('saves-dialog').showModal(); });
$('title-exit').addEventListener('click', () => {
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || saveConfirmation || avatarProcessing || newAvatarProcessing || creatorBusy) return;
  $('exit-message').textContent = '';
  $('exit-dialog').showModal();
});
$('exit-cancel').addEventListener('click', () => $('exit-dialog').close());
$('exit-confirm').addEventListener('click', () => {
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || saveConfirmation || avatarProcessing || newAvatarProcessing || creatorBusy) return;
  // Releasing the source stops sound without changing the saved music preference
  // or issuing any game command. Browsers may refuse to close a user-opened tab.
  bgmPlayer.setTrack(null);
  flushClientEvents();
  window.close();
  $('exit-message').textContent = '游戏已停止播放，当前进度已保留。若此窗口未自动关闭，请手动关闭标签页；取消可返回游戏。';
});
$('exit-dialog').addEventListener('close', () => {
  if (!document.body.classList.contains('at-title') && typeof scenePlayback !== 'undefined' && scenePlayback?.refresh()) return;
  bgmPlayer.setTrack(document.body.classList.contains('at-title') ? TITLE_BGM : state?.bgm);
});
$('title-resume').addEventListener('click', () => {
  if (!state?.saveSlots?.length || busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || saveConfirmation || avatarProcessing || newAvatarProcessing || creatorBusy) return;
  if (typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active) return;
  transitionToScreen('game');
});
function updateNewGameExample() {
  const exampleId = document.querySelector('input[name="new-game-example"]:checked')?.value;
  const custom = exampleId === 'custom';
  const prototype = exampleId === 'prototype';
  const agent = exampleId === 'agent';
  const customMode = agent && document.querySelector('input[name="pc-player-mode"]:checked')?.value === 'custom';
  if (customMode) customAbilityUI?.refreshDraft?.();
  const ability = customMode ? customAbilityUI?.getConfirmedSelection() : undefined;
  $('new-game-example-status').textContent = agent
    ? '写下人物档案，选择故事开始的清晨。'
    : prototype ? '午后的会客厅里，一枚书签等待失主。'
      : custom ? '以八云晓的视角，走进陌生的监牢。' : '艾玛在陌生的牢房中睁开眼睛。';
  $('custom-character-options').hidden = !custom;
  playerCreator?.refresh();
  $('new-confirm').disabled = busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || avatarProcessing || newAvatarProcessing || creatorBusy;
  $('new-game-examples').disabled = busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || avatarProcessing || newAvatarProcessing || creatorBusy;
  $('new-confirm').textContent = agent
    ? ability ? '以此设定开始游戏（使用已确认的专用能力）' : '以此设定开始游戏'
    : prototype ? '开始日常故事' : custom ? '开始八云晓篇' : '开始艾玛篇';
}
$('title-new').addEventListener('click', () => {
  if (!state || busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || avatarProcessing) return;
  updateNewGameExample();
  $('new-game-dialog').showModal();
  playerCreator.open();
});
$('new-game-examples').addEventListener('change', updateNewGameExample);
for (const input of document.querySelectorAll('input[name="pc-player-mode"]')) input.addEventListener('change', updateNewGameExample);
$('new-cancel').addEventListener('click', () => $('new-game-dialog').close());
$('new-confirm').addEventListener('click', () => {
  const exampleId = document.querySelector('input[name="new-game-example"]:checked')?.value;
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || newAvatarProcessing || avatarProcessing || creatorBusy || !['agent', 'emma', 'custom', 'prototype'].includes(exampleId)) return;
  let creationPayload = {};
  try { if (exampleId === 'agent') creationPayload = playerCreator.collect(); }
  catch (error) { $('new-game-example-status').textContent = error.message; return; }
  const abilitySelection = exampleId === 'agent' && creationPayload.creation?.playerMode === 'custom'
    ? customAbilityUI?.getConfirmedSelection() : undefined;
  if (abilitySelection) startCustomAbilityNewGame(creationPayload, abilitySelection);
  else startNewGame(exampleId, creationPayload);
});
function startCustomAbilityNewGame(creationPayload, selection) { operation(async () => {
  try {
    if (creationPayload.creation?.scenarioId || creationPayload.creation?.storyArcId) {
      throw new Error('已确认能力不能和当前案件预设一起开始；请取消案件预设，或按普通自定义角色开始。');
    }
    const view = await request('/api/custom-abilities/new-game', {
      apiVersion: 1,
      requestId: crypto.randomUUID(),
      expectedGeneration: state.generation,
      expectedRevision: state.revision,
      creation: creationPayload.creation,
      abilitySelections: [{ definitionId: selection.definitionId, revision: selection.revision,
        expectedSemanticDigest: selection.expectedSemanticDigest }],
      confirmed: true,
    });
    let rendered = view;
    let avatarError;
    if (creationPayload.avatarDataUrl) {
      try {
        rendered = await request('/api/player/avatar', { expectedGeneration: view.generation,
          expectedRevision: view.revision, avatarDataUrl: creationPayload.avatarDataUrl });
      } catch (error) { avatarError = error; }
    }
    $('new-game-dialog').close();
    await transitionToScreen('game', () => { render(rendered); pendingAction = undefined; $('action').value = ''; });
    if (avatarError) $('message').textContent = `游戏已开始，但头像没有保存：${avatarError.message}`;
  } catch (error) {
    const text = error.code === 'CUSTOM_ABILITY_NOT_READY' ? '这份能力还不能带入游戏；请回到能力确认处重新确认。'
      : error.code === 'CUSTOM_ABILITY_PROFILE_UNSUPPORTED' ? '当前存档不支持带能力开始；请按普通自定义角色开始。'
        : error.code === 'STALE_REVISION' || error.code === 'STALE_GENERATION' ? '进度已经变化，请刷新后再试。'
          : error.message;
    $('new-game-example-status').textContent = text;
    throw error;
  }
}, { focusAction: true }); }
function startNewGame(exampleId, creationPayload = {}) { operation(async () => {
  try {
    const view = await request('/api/new-game', { expectedGeneration: state.generation, expectedRevision: state.revision, exampleId,
      ...creationPayload, ...(exampleId === 'custom' ? { impressionColor: $('custom-impression-color').value, avatarDataUrl: newAvatarPicker.value } : {}) });
    $('new-game-dialog').close();
    await transitionToScreen('game', () => { render(view); pendingAction = undefined; $('action').value = ''; });
  } catch (error) { $('new-game-example-status').textContent = error.message; throw error; }
}, { focusAction: true }); }
// WitchBookUI manages its own artwork, category selection and native dialog controls.
for (const button of document.querySelectorAll('[data-saveload-mode]')) button.addEventListener('click', () => {
  setSaveLoadMode(button.dataset.saveloadMode);
});
for (const button of document.querySelectorAll('[data-menu-action]')) button.addEventListener('click', () => {
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing)) return;
  const action = button.dataset.menuAction;
  if (action === 'Save') { setSaveLoadMode('save'); $('saves-dialog').showModal(); }
  if (action === 'Load') { setSaveLoadMode('load'); $('saves-dialog').showModal(); }
  if (action === 'Options') window.openModelSettings();
  if (action === 'Title') returnToTitle();
  if (action === 'Log') dailyHistoryUI?.open();
});
$('open-saves').addEventListener('click', () => { setSaveLoadMode('load'); $('saves-dialog').showModal(); });
$('close-saves').addEventListener('click', () => $('saves-dialog').close());
for (const button of document.querySelectorAll('[data-phone-tab]')) {
  button.addEventListener('click', () => {
    if (state?.phoneState === 'execution_ready' && supportedProcedure(state)) return;
    const tab = button.dataset.phoneTab;
    for (const other of document.querySelectorAll('[data-phone-tab]')) other.setAttribute('aria-selected', String(other === button));
    $('phone-people').hidden = tab !== 'people';
    $('phone-music').hidden = tab !== 'music';
    $('phone-time-panel').hidden = tab !== 'time';
    $('phone-notes').hidden = tab !== 'notes';
    $('phone-title').textContent = tab === 'music' ? '随身听' : tab === 'people' ? '魔女图鉴' : tab === 'time' ? '故事时钟' : '行动记录';
    $('phone-scroll').scrollTop = 0;
  });
}
let rewindTarget;

function openRewind(turn) {
  if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || avatarProcessing || newAvatarProcessing || creatorBusy || saveConfirmation || document.querySelector?.('dialog[open]')) return;
  const displayText = typeof testimonyDisplayText === 'function' ? testimonyDisplayText(turn) : turn.displayText || turn.text;
  rewindTarget = { turnId: turn.id, text: displayText, expectedGeneration: state.generation, expectedRevision: state.revision };
  $('rewind-title').textContent = '回溯到此行动之前？'; $('rewind-confirm').textContent = '确认回溯';
  $('rewind-preview').textContent = `将回到第 ${turn.floor} 楼「${displayText}」提交之前，撤回 ${state.turns.length - turn.floor + 1} 个行动。回退后可修改并重新提交这次行动。`;
  $('rewind-dialog').showModal(); setBusy(busy);
}
function regenerationBlocked(turn, { confirming = false } = {}) {
  const runtime = state?.agentRuntime;
  return busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || avatarProcessing || newAvatarProcessing || creatorBusy || saveConfirmation || composing || !!pendingAction
    || (state?.phoneState === 'execution_ready' && supportedProcedure(state))
    || state?.exampleId !== 'agent' || !state.turns?.some(entry => entry.id === turn.id)
    || (!confirming && !!document.querySelector?.('dialog[open]'))
    || (!!pendingRegeneration && pendingRegeneration.turnId !== turn.id)
    || (['pending', 'running', 'failed'].includes(runtime?.status) && !(runtime.operation === 'regenerate' && runtime.turnId === turn.id));
}
function openRegeneration(turn) {
  if (regenerationBlocked(turn)) return;
  const retry = pendingRegeneration?.turnId === turn.id;
  rewindTarget = { operation: 'regenerate', turnId: turn.id,
    expectedGeneration: state.generation, expectedRevision: state.revision };
  $('rewind-title').textContent = retry ? '续接这一轮的重新生成？' : '重新生成这一轮？';
  $('rewind-confirm').textContent = retry ? '确认续接生成' : '确认重新生成';
  const later = state.turns.length - turn.floor;
  const failure = retry && typeof safeFailureSummary === 'function'
    ? safeFailureSummary(Object.getOwnPropertyDescriptor(state.agentRuntime || {}, 'failure')?.value) : undefined;
  const retryNotice = failure ? `${failureSummaryText(failure)} ${failureRetryHint(failure)}`
    : '模型调用可能产生费用，不会自动重试整页提交；单个模型请求第一次没通过时，会按选项里的次数自动再请求。';
  const plan = failure?.stage === 'commit' && failure.retryRequiresModel === 'no'
    ? `将复用第 ${turn.floor} 楼已保留的子任务结果，手动重新提交最终校验，不会重新抽取模型输出。`
    : `将使用第 ${turn.floor} 楼的原始输入「${typeof testimonyDisplayText === 'function' ? testimonyDisplayText(turn) : turn.displayText || turn.text}」，从此行动前的真实状态重新推演整轮。`;
  $('rewind-preview').textContent = `${plan}${later > 0
    ? `成功后将撤回这一轮及其后续 ${later} 轮剧情，并切换到新分支；后续剧情不会保留。`
    : '成功后将替换最后这一轮，并切换到新分支。'}失败时保留原正文与进度；成功时自动备份旧进度。${retry
    ? '将复用原请求编号，仅续接未完成的任务，不会另起一轮。' : ''}${retryNotice}未发送的输入草稿不会被覆盖。`;
  $('rewind-dialog').showModal(); setBusy(busy);
}
async function performRegeneration(target) {
  if (!pendingRegeneration) pendingRegeneration = { requestId: crypto.randomUUID(), turnId: target.turnId,
    expectedGeneration: target.expectedGeneration, expectedRevision: target.expectedRevision };
  const attempt = pendingRegeneration;
  if (typeof agentStatusUI !== 'undefined') agentStatusUI?.start();
  try {
    const result = await request('/api/regenerate', attempt);
    const view = result.currentView || result.view || result;
    if (result.status !== 'in_progress') pendingRegeneration = undefined;
    else if (view.agentRuntime?.operation !== 'regenerate' || view.agentRuntime.requestId !== attempt.requestId) pendingRegeneration = undefined;
    render(view);
    if (typeof agentStatusUI !== 'undefined') agentStatusUI?.finish(result.status === 'in_progress' ? 'running' : 'idle');
    $('message').textContent = (typeof testimonyFeedbackText === 'function' ? testimonyFeedbackText(result.message) : result.message)
      || '这一轮已重新生成，输入草稿保持不变。';
  } catch (error) {
    let message = error.message;
    const failure = typeof safeFailureSummary === 'function'
      ? safeFailureSummary(Object.getOwnPropertyDescriptor(error, 'failure')?.value) : undefined;
    if (failure) message += ` ${failureSummaryText(failure)}`;
    const actionOutcome = typeof finiteActionOutcome === 'function' ? finiteActionOutcome(error) : undefined;
    if (actionOutcome?.outcome.kind === 'execution_failed') message += ` ${actionOutcome.text}`;
    if (error.currentView) render(error.currentView);
    if (error.status === 403 || error.status === 409 || (error.status && error.status < 500)) {
      pendingRegeneration = undefined;
      try { render(await request('/api/view')); message += ' 已刷新进度，请重新选择楼层并确认；草稿已保留。'; }
      catch { message += ' 请刷新页面核对进度，草稿未被修改。'; }
    } else {
      message += !error.status
        ? ' 网络中断，结果尚未确认；只会在整轮成功后切换进度，并自动备份旧正文。'
        : ' 原正文和进度未因生成失败被回退。';
      message += ` 输入草稿已保留。请点击同一楼层按钮并确认后手动续接；将复用请求编号，不会自动重试。${failure
        ? failureRetryHint(failure) : '重试模型可能产生费用。'}`;
    }
    if (typeof agentStatusUI !== 'undefined') agentStatusUI?.finish(
      ['pending', 'running', 'failed'].includes(error.currentView?.agentRuntime?.status) ? error.currentView.agentRuntime.status
        : !error.status || error.status >= 500 ? 'unknown' : 'failed');
    if (error.correlationId) message += `（日志编号：${error.correlationId}）`;
    if (typeof testimonyFeedbackText === 'function') message = testimonyFeedbackText(message);
    $('message').textContent = message; $('title-message').textContent = message;
  }
}
$('rewind-dialog').addEventListener('close', () => { rewindTarget = undefined; setBusy(busy); });
$('rewind-cancel').addEventListener('click', () => $('rewind-dialog').close());
$('rewind-confirm').addEventListener('click', () => {
  const target = rewindTarget;
  if (!target) return;
  if (target.operation === 'regenerate') {
    if (regenerationBlocked({ id: target.turnId }, { confirming: true })) return;
    $('rewind-dialog').close();
    operation(() => performRegeneration(target), { focusAction: true });
    return;
  }
  $('rewind-dialog').close();
  operation(async () => {
    render(await request('/api/rewind', target)); pendingAction = undefined; pendingRegeneration = undefined;
    if (typeof testimonyDraft !== 'undefined') testimonyDraft?.clear();
    $('action').value = target.text;
    $('message').textContent = '已恢复到所选行动之前。旧未来不再参与当前剧情；可修改输入后重新提交。';
  }, { focusAction: true });
});
applyRuntimeOptions(runtimeOptions);
setSaveLoadMode('load'); setBusy(false);
request('/api/view').then(render).catch(error => { $('message').textContent = error.message; $('title-message').textContent = error.message; });
request('/api/options').then(options => { if (!runtimeOptionsChanged) applyRuntimeOptions(options); }).catch(() => {
  if (!runtimeOptionsChanged) $('input-help').textContent += '（设置暂不可用，已使用手动发送）';
});
agentStatusUI = mountAgentStatusUI();
phoneBallotUI = mountPhoneBallot({
  document,
  getView: () => state,
  isSupported: view => supportedProcedure(view),
  isBusy: () => busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || !!saveConfirmation
    || avatarProcessing || newAvatarProcessing || creatorBusy || composing || !!state?.guardReaction?.pending
    || !!pendingRegeneration
    || state?.agentRuntime?.operation === 'regenerate'
    || (typeof trialOpeningUI !== 'undefined' && trialOpeningUI?.active)
    || (typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active)
    || !!document.querySelector?.('dialog[open]'),
  confirm: command => {
    if (!state || !phoneBallotChoices(state, supportedProcedure).some(choice => choice.command === command)) return false;
    const composerOriginal = $('action').value;
    const result = submitAction({ value: command, wireText: command, preserveDraft: composerOriginal,
      generation: state.generation, revision: state.revision, origin: 'phone-ballot',
      ballot: true, source: 'phone-ballot' });
    return result !== false;
  },
});
caseExecutionUI = mountCaseExecutionUI();
developerPanelUI = typeof mountDeveloperPanel === 'function' ? mountDeveloperPanel({ document, window, fetch: (...args) => fetch(...args),
  getView: () => state, getToken: () => csrfToken, isEnabled: () => runtimeOptions.developerMode === true,
  isGameVisible: () => !$('game-screen').hidden && !document.body.classList.contains('at-title') && !screenTransitionUI?.active,
}) : undefined;
diceUI = typeof mountDicePanel === 'function' ? mountDicePanel(document, {
  request, getView: () => state, canRoll: canUseDice,
  isGameVisible: () => !$('game-screen').hidden && !document.body.classList.contains('at-title'),
  isStoryReady: index => typeof storyTypewriter === 'undefined' || !storyTypewriter || storyTypewriter.hasReached(index),
  onBusyChange: value => { diceProcessing = value; setBusy(busy); },
  onActiveChange: active => {
    if (typeof storyTypewriter !== 'undefined') storyTypewriter?.setPaused?.(active);
  },
  onViewHeld: view => {
    if (!state || view.generation > state.generation || (view.generation === state.generation && view.revision >= state.revision)) {
      state = view; if (view.csrfToken) csrfToken = view.csrfToken;
    }
  },
  onContinue: view => {
    render(view);
    if (typeof storyTypewriter !== 'undefined') storyTypewriter?.resume?.();
    setBusy(busy);
  },
  onExit: target => {
    // A navigation exit is not a game command. Same-world pending checks reopen
    // on resume; only an explicit load/new game can replace that world.
    if (target === 'title') transitionToScreen('title');
    else { setSaveLoadMode('load'); $('saves-dialog').showModal(); setBusy(busy); }
  },
}) : undefined;
for (const dialog of document.querySelectorAll('dialog')) {
  if (dialog.id === 'dice-dialog') continue;
  dialog.addEventListener('close', () => {
    setBusy(busy);
    if (typeof diceUI !== 'undefined') {
      if (!$('game-screen').hidden && !document.querySelector('dialog[open]')) diceUI?.setActive(true);
      diceUI?.sync(state);
    }
  });
}
if (typeof diceUI !== 'undefined') diceUI?.sync(state);

// Optional old-save activation is deliberately outside the phone. Its identity
// survives an unknown network result and is only replayed by a manual click.
let guardUpgradeRequest;
function canActivateGuardRules({ confirming = false } = {}) {
  const upgrade = state?.guardRulesUpgrade;
  return upgrade?.supported === true && upgrade.enabled === false && upgrade.available === true
    && !(typeof guardUpgradeUncertain !== 'undefined' && guardUpgradeUncertain)
    && !busy && !diceProcessing && !avatarProcessing && !newAvatarProcessing && !creatorBusy && !saveConfirmation
    && !pendingAction && !pendingRegeneration && !composing && !state.guardReaction?.pending
    && !['pending', 'running', 'failed'].includes(state.agentRuntime?.status)
    && state.agentRuntime?.operation !== 'regenerate'
    && !(typeof storyTypewriter !== 'undefined' && storyTypewriter?.active)
    && !(typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active)
    && !(typeof trialOpeningUI !== 'undefined' && trialOpeningUI?.active)
    && !$('game-screen').hidden && !document.body.classList.contains('at-title')
    && !document.querySelector?.(confirming ? 'dialog[open]:not(#guard-rules-dialog)' : 'dialog[open]');
}
function syncGuardRulesUpgrade() {
  const control = $('guard-rules-open'); if (!control) return;
  const upgrade = state?.guardRulesUpgrade;
  control.hidden = !upgrade?.supported || upgrade.enabled === true;
  control.disabled = !canActivateGuardRules();
  control.title = typeof upgrade?.reason === 'string' ? upgrade.reason : '';
  const confirm = $('guard-rules-confirm'); if (confirm) confirm.disabled = !canActivateGuardRules({ confirming: true });
}
$('guard-rules-open')?.addEventListener('click', () => {
  if (!canActivateGuardRules()) return;
  $('guard-rules-message').textContent = ''; $('guard-rules-dialog').showModal(); setBusy(busy);
});
$('guard-rules-cancel')?.addEventListener('click', () => { if (!busy) $('guard-rules-dialog').close(); });
$('guard-rules-dialog')?.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
$('guard-rules-confirm')?.addEventListener('click', () => {
  if (!canActivateGuardRules({ confirming: true })) return;
  operation(async () => {
    if (!guardUpgradeRequest || guardUpgradeRequest.expectedGeneration !== state.generation) {
      guardUpgradeRequest = { requestId: crypto.randomUUID(), expectedGeneration: state.generation, expectedRevision: state.revision };
    }
    try {
      const receipt = await request('/api/guard-rules/activate', { ...guardUpgradeRequest });
      if (receipt.accepted !== true || !(receipt.currentView || receipt.view)?.guardRulesUpgrade?.enabled
        || typeof receipt.backupSaveId !== 'string' || !receipt.backupSaveId) throw new Error('启用或自动备份结果尚未确认，请先核对。');
      guardUpgradeUncertain = false; render(receipt.currentView || receipt.view); guardUpgradeRequest = undefined;
      $('guard-rules-dialog').close(); $('message').textContent = '守卫检定已启用，启用前的自动备份已保存；旧历史保持不变。';
    } catch (error) {
      guardUpgradeUncertain = true;
      $('guard-rules-message').textContent = `${error.message} 原请求编号已保留；请先核对启用结果，不会自动重试。`;
      $('guard-rules-check').hidden = false; throw error;
    }
  });
});
$('guard-rules-check')?.addEventListener('click', () => {
  if (busy) return;
  operation(async () => {
    const view = await request('/api/view'); guardUpgradeUncertain = false; render(view);
    if (view.guardRulesUpgrade?.enabled) {
      guardUpgradeRequest = undefined; $('guard-rules-dialog').close(); $('message').textContent = '已核对：守卫检定已启用，未重复执行。';
    } else {
      if (guardUpgradeRequest && (view.generation !== guardUpgradeRequest.expectedGeneration || view.revision !== guardUpgradeRequest.expectedRevision)) guardUpgradeRequest = undefined;
      $('guard-rules-message').textContent = '已核对当前世界，尚未启用。可手动点击确认续接；不会自动执行。';
    }
  });
});

// One read-only observer owns activity and committed-head synchronization for
// normal pages and #visual-test alike. Recovery/retries remain explicit actions.
function mountAgentStatusUI() {
  const root = $('agent-status');
  const disclosure = $('agent-status-disclosure');
  const label = $('agent-status-label');
  const list = $('agent-status-activities');
  const note = $('agent-status-note');
  const announcement = $('agent-status-announcement');
  const progressNote = document.getElementById?.('agent-progress-note');
  const activeStatuses = new Set(['pending', 'running']);
  const publicStatuses = new Set(['idle', 'pending', 'running', 'failed']);
  const roleLabels = Object.freeze({
    intent_parser: '留意你的行动', intent: '留意你的行动', player: '你的行动', player_roleplay: '你的行动', player_performance: '你的行动',
    director: '眼前的景象', world_adjudicator: '梳理眼前情形', narrator: '眼前的景象', narration: '眼前的景象', scene: '眼前的景象', scene_composer: '此刻的场景',
    character_data: '整理见闻', roleplay: '人物回应', character_dialogue: '人物回应',
  });
  const operationLabels = Object.freeze({
    host: '梳理眼前情形', rule: '梳理眼前情形', rules: '梳理眼前情形', model: '酝酿回应', llm: '酝酿回应', model_call: '酝酿回应',
    validate: '梳理眼前情形', validation: '梳理眼前情形', commit: '记下见闻', memory: '记下见闻',
    '规则处理': '梳理眼前情形', '模型请求': '酝酿回应', '结果检查': '梳理眼前情形', '整理记录': '记下见闻',
    '理解自然行动与条件': '留意你的行动', '按人设表现你的选择': '描写你的举动',
    '作出回应与自主决定': '回应眼前的话语', '描写所见与行动结果': '描写眼前的变化', '整理本次交流记忆': '记下这次交谈',
    '把已裁决动作与对白编排成完整场景': '串起此刻的见闻',
  });
  let scope; let generation; let latestHead; let observedRuntime;
  let snapshot; let localAction = false; let actionGeneration; let unavailable = false; let refreshNeeded = true;
  let timer; let timeout; let controller; let epoch = 0; let suspended = false; let wasVisible = false;
  let readingHead = false;
  let announced; let detailSignature;
  let progressCursor = 0; let progressJob; let progressRevision = -1; let progressEdge;
  const progressKinds = new Set(['prepared', 'validated', 'failed', 'committed', 'cancelled']);
  const progressRoles = new Set(['roleplay', 'character_data', 'intent_parser', 'world_adjudicator', 'player_performance', 'narrator', 'scene_composer', 'director']);
  const scopeKey = () => `${state?.exampleId}:${state?.generation}:${state?.revision}`;
  const isVersion = value => Number.isSafeInteger(value?.generation) && value.generation >= 0
    && Number.isSafeInteger(value.revision) && value.revision >= 0;
  const compareVersion = (left, right) => left.generation - right.generation || left.revision - right.revision;
  const isGameVisible = () => !suspended && isVersion(state)
    && !$('game-screen').hidden && !document.body?.classList.contains('at-title')
    && !document.hidden && document.visibilityState !== 'hidden'
    && !(typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active);
  const runtimeStatus = () => publicStatuses.has(state?.agentRuntime?.status) ? state.agentRuntime.status : 'idle';
  const shouldPoll = () => isGameVisible() && !document.querySelector('dialog[open]');
  const working = () => busy || localAction || activeStatuses.has(snapshot?.status ?? runtimeStatus());
  const canReadHead = () => shouldPoll() && !busy && (typeof diceProcessing === 'undefined' || !diceProcessing) && !localAction && !pendingAction && !pendingRegeneration
    && !composing && !saveConfirmation && !avatarProcessing && !newAvatarProcessing && !creatorBusy
    && !(typeof trialOpeningUI !== 'undefined' && trialOpeningUI?.active);

  function stop() {
    epoch++;
    clearTimeout(timer); clearTimeout(timeout);
    timer = timeout = undefined;
    controller?.abort(); controller = undefined;
  }
  function clearProgress() {
    progressCursor = 0; progressJob = undefined; progressRevision = -1; progressEdge = undefined;
    if (progressNote) { progressNote.textContent = ''; progressNote.hidden = true; }
  }
  function acceptProgress(value) {
    if (value?.version !== 1 || !Number.isSafeInteger(value.generation) || value.generation < 1
      || !Number.isSafeInteger(value.revision) || value.revision < 0 || typeof value.reset !== 'boolean'
      || !Number.isSafeInteger(value.cursor) || value.cursor < 0
      || !['idle', 'pending', 'running', 'failed', 'committed', 'cancelled'].includes(value.status)
      || !Array.isArray(value.events) || value.events.length > 256
      || (value.jobRef !== undefined && !/^[a-f0-9]{64}$/u.test(value.jobRef))) throw new Error('Invalid progress');
    if (value.generation !== state.generation || value.revision < state.revision || value.revision < progressRevision) return;
    if (!value.reset && (value.cursor < progressCursor || progressJob !== undefined && value.jobRef !== progressJob)) throw new Error('Invalid progress scope');
    let previous = value.reset ? 0 : progressCursor;
    for (const event of value.events) {
      if (!Number.isSafeInteger(event?.id) || event.id <= previous || event.id > value.cursor || !progressKinds.has(event.kind)
        || (event.role !== undefined && !progressRoles.has(event.role))) throw new Error('Invalid progress event');
      previous = event.id;
    }
    if (value.jobRef === undefined && (value.status !== 'idle' || value.cursor !== 0 || value.events.length)) throw new Error('Invalid progress job');
    if (value.reset || value.jobRef !== progressJob) progressEdge = undefined;
    // Retain only enum fields. Even accidentally supplied private diagnostics
    // never reach the DOM or become a trigger for gameplay/retry requests.
    const last = value.events.at(-1);
    if (last) progressEdge = { kind: last.kind, ...(last.role ? { role: last.role } : {}) };
    progressCursor = value.cursor; progressJob = value.jobRef; progressRevision = value.revision;
    const titles = { prepared: '已开始处理', validated: '已核对完成', failed: '暂时停下，请手动重试',
      committed: '已记下这次行动', cancelled: '这次处理已结束' };
    const edgeLabel = progressEdge ? `${progressEdge.role ? `${roleLabels[progressEdge.role]} · ` : ''}${titles[progressEdge.kind]}` : '';
    const actionOutcome = typeof finiteActionOutcome === 'function' ? finiteActionOutcome(value) : undefined;
    const outcomeEdge = actionOutcome?.text && progressEdge?.kind === 'committed' ? '请求处理已结束' : edgeLabel;
    progressNote.textContent = actionOutcome?.text ? `${outcomeEdge}${outcomeEdge ? '。' : ''}${actionOutcome.text}` : edgeLabel;
    progressNote.hidden = actionOutcome?.text ? false : !progressEdge;
  }
  async function readProgress(current, signal) {
    if (!progressNote || !current() || signal.aborted) return;
    const query = `after=${progressCursor}&generation=${state.generation}${progressJob ? `&jobRef=${progressJob}` : ''}`;
    try {
      const response = await fetch(`/api/agent-progress?${query}`, { method: 'GET', credentials: 'same-origin', cache: 'no-store', signal });
      if (!current() || signal.aborted) return;
      if (!response.ok) throw new Error('Progress unavailable');
      const value = await response.json();
      if (current() && !signal.aborted) acceptProgress(value);
    } catch {
      if (current() && !signal.aborted) { progressNote.textContent = '进度暂不可用；不会自动重试行动。'; progressNote.hidden = false; }
    }
  }
  function paint() {
    root.hidden = state?.exampleId !== 'agent';
    let status = snapshot?.status ?? runtimeStatus();
    const placeholder = localAction && (!snapshot || status === 'idle');
    if (placeholder) status = 'pending';
    if (unavailable) status = 'unknown';
    const activities = status === 'unknown' || !activeStatuses.has(status) ? [] : snapshot?.activities || [];
    const names = [...new Set(activities.map(activity => activity.label))];
    const text = status === 'unknown' ? '状态暂不可用' : status === 'idle' ? '待命' : status === 'failed' ? '任务未完成'
      : placeholder ? '正在理解行动' : names.length ? `${names.slice(0, 2).join(' · ')}${names.length > 2 ? ' 等' : ''}`
        : status === 'pending' ? '等待处理' : '正在处理';
    root.dataset.status = status;
    if (label.textContent !== text) label.textContent = text;
    const signature = JSON.stringify([status, activities]);
    if (signature !== detailSignature) {
      detailSignature = signature;
      list.replaceChildren(...activities.map(activity => {
        const item = element('li', null, 'agent-status-activity');
        item.append(element('span', activity.label), element('small', [activity.operation, activity.status === 'pending' ? '等待中' : '进行中'].filter(Boolean).join(' · ')));
        return item;
      }));
      list.hidden = !activities.length;
      note.hidden = !!activities.length;
      note.textContent = status === 'unknown' ? '暂时无法读取活动状态，请稍后查看。'
        : status === 'failed' ? '请查看行动提示，确认后再手动重试。'
          : activeStatuses.has(status) ? '正在回应你的行动，稍候片刻。' : '静候你的下一步行动。';
    }
    // Announce state transitions, not task names or every one-second poll.
    const spoken = activeStatuses.has(status) ? '正在回应你的行动。' : status === 'unknown' ? '当前活动状态暂不可用。'
      : status === 'failed' ? '本次行动未完成，请手动确认。' : '静候你的下一步行动。';
    if (isGameVisible() && spoken !== announced) {
      announced = spoken;
      announcement.textContent = spoken;
    }
  }
  function sync(refresh = false) {
    const nextScope = scopeKey();
    if (scope !== nextScope) {
      if (!readingHead) stop();
      clearProgress();
      const sameGeneration = generation === state?.generation;
      localAction = localAction && sameGeneration;
      generation = state?.generation;
      if (isVersion(state) && (!latestHead || compareVersion(state, latestHead) > 0)) {
        latestHead = { generation: state.generation, revision: state.revision };
      }
      scope = nextScope;
      snapshot = undefined; unavailable = false; refreshNeeded = !readingHead;
      disclosure.open = false;
    }
    const nextRuntime = runtimeStatus();
    if (nextRuntime !== observedRuntime) {
      observedRuntime = nextRuntime;
      if (state?.agentRuntime) {
        if (!readingHead) stop();
        snapshot = undefined; unavailable = false; refreshNeeded = !readingHead;
      }
    }
    const visible = shouldPoll();
    refresh ||= visible && !wasVisible;
    wasVisible = visible;
    if (refresh) {
      refreshNeeded = true;
      clearTimeout(timer); timer = undefined;
    }
    paint();
    if (!visible) { stop(); return; }
    if (timer === undefined && !controller) timer = setTimeout(poll, refreshNeeded || working() ? 0 : 1500);
  }
  function start() {
    if (state?.exampleId !== 'agent') return;
    sync();
    stop(); clearProgress(); snapshot = undefined; unavailable = false; localAction = true; actionGeneration = state.generation; refreshNeeded = true;
    // Schedule the GET after the explicit action POST has left this event.
    sync();
  }
  function finish(status) {
    if (state?.exampleId !== 'agent') return;
    if (actionGeneration !== undefined && actionGeneration !== state.generation) {
      actionGeneration = undefined; sync(); return;
    }
    sync();
    stop(); localAction = false; actionGeneration = undefined;
    unavailable = status === 'unknown';
    snapshot = publicStatuses.has(status) ? { status, activities: [] } : undefined;
    // One final read can replay the durable commit edge even when the POST
    // finishes between polls. It never submits or retries an action.
    refreshNeeded = !!progressNote || status === 'unknown' || activeStatuses.has(status);
    sync();
  }
  function publicActivities(activities) {
    const labels = new Set(Object.keys(characterInitialColors));
    if (state?.player?.name) labels.add(state.player.name);
    const seen = new Set();
    return activities.slice(0, 32).filter(activity => activity && activeStatuses.has(activity.status)).map(activity => {
      // Never display arbitrary operation/label/id strings, even if a future
      // backend accidentally includes prompts, dialogue or diagnostic details.
      const name = labels.has(activity.label) ? activity.label : Object.hasOwn(roleLabels, activity.role) ? roleLabels[activity.role] : '人物回应';
      const operation = Object.hasOwn(operationLabels, activity.operation) ? operationLabels[activity.operation] : '';
      return { label: name, operation, status: activity.status };
    }).filter(activity => {
      const key = JSON.stringify(activity);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  async function poll() {
    timer = undefined;
    if (!shouldPoll()) return;
    const includeProgress = state.exampleId === 'agent' && (refreshNeeded || working());
    refreshNeeded = false;
    const ownController = new AbortController();
    const ownEpoch = epoch; const ownScope = scope;
    controller = ownController;
    const current = () => controller === ownController && epoch === ownEpoch && ownScope === scopeKey() && shouldPoll();
    timeout = setTimeout(() => ownController.abort(), 5000);
    const progressRead = includeProgress ? readProgress(current, ownController.signal) : Promise.resolve();
    try {
      const response = await fetch('/api/agent-status', { method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: ownController.signal });
      if (!current()) return;
      if (!response.ok) throw new Error('Activity unavailable');
      const result = await response.json();
      if (!current() || ownController.signal.aborted) return;
      if (!Number.isSafeInteger(result?.generation) || !Number.isSafeInteger(result.revision) || result.generation < 0 || result.revision < 0
        || !publicStatuses.has(result.status) || !Array.isArray(result.activities)) throw new Error('Invalid activity status');
      if (compareVersion(result, state) < 0 || latestHead && compareVersion(result, latestHead) < 0) return;
      latestHead = { generation: result.generation, revision: result.revision };
      if (result.generation === state.generation) snapshot = { status: result.status, activities: publicActivities(result.activities) };
      unavailable = false;
      paint();
      if (compareVersion(latestHead, state) > 0 && canReadHead()) {
        // Share the activity poll's abort/epoch fence and single-flight slot.
        // Recheck locks after both awaits: a local POST, IME or modal may have
        // started while the read was in flight. Never touch request identities.
        const response = await fetch('/api/view', { method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: ownController.signal });
        if (!current() || ownController.signal.aborted || !canReadHead()) return;
        if (!response.ok) throw new Error('View unavailable');
        const view = await response.json();
        if (!current() || ownController.signal.aborted || !canReadHead()) return;
        if (!isVersion(view) || compareVersion(view, latestHead) < 0 || compareVersion(view, state) <= 0) return;
        readingHead = true;
        try { render(view); } finally { readingHead = false; }
      }
    } catch {
      if (!current()) return;
      unavailable = true;
      paint();
    } finally {
      await progressRead;
      if (controller === ownController) {
        clearTimeout(timeout); timeout = undefined; controller = undefined;
        // Idle pages need only a lightweight head check. Detailed progress is
        // reserved for active work or an explicit visibility/settlement refresh.
        if (shouldPoll()) timer = setTimeout(poll, refreshNeeded ? 0 : working() ? 1000 : 1500);
      }
    }
  }
  disclosure.addEventListener('keydown', event => { if (event.key === 'Escape') disclosure.open = false; });
  document.addEventListener?.('visibilitychange', () => sync(!document.hidden));
  window.addEventListener('pagehide', () => { suspended = true; stop(); });
  window.addEventListener('pageshow', () => { suspended = false; sync(true); });
  window.addEventListener('beforeunload', () => { suspended = true; stop(); });
  sync();
  return { sync, start, finish, get readingHead() { return readingHead; } };
}

// This host confirmation is separate from character actions and text votes.
// Filling/animation alone never submits: the same held gesture must be released
// explicitly while the reviewed verdict and current revision still match.
function mountCaseExecutionUI() {
  const dialog = $('case-execution-dialog');
  const open = $('case-execution-open');
  const confirm = $('case-execution-confirm');
  const refresh = $('case-execution-refresh');
  let pending; let confirmation; let submitting = false; let needsRefresh = false; let feedback = ''; let observedScope;
  const ready = view => view?.phoneState === 'execution_ready' && supportedProcedure(view)
    && typeof view.execution?.verdictId === 'string' && !!view.execution.verdictId
    && Array.isArray(view.execution.targets) && view.execution.targets.length > 0
    && view.execution.targets.every(target => typeof target?.id === 'string' && !!target.id && typeof target.name === 'string' && !!target.name.trim());
  const locked = () => busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || avatarProcessing || newAvatarProcessing || creatorBusy || !!saveConfirmation
    || (typeof screenTransitionUI !== 'undefined' && screenTransitionUI?.active);
  const sameVerdict = (command, view) => ready(view) && command?.expectedGeneration === view.generation && command.verdictId === view.execution.verdictId;
  const targetSignature = view => JSON.stringify(view?.execution?.targets || []);
  const currentConfirmation = () => sameVerdict(confirmation, state) && confirmation.expectedRevision === state.revision
    && confirmation.targets === targetSignature(state);
  const seal = mountExecutionSeal(document, {
    canInteract: () => !locked() && !submitting && !needsRefresh && currentConfirmation(),
    getAudioPreferences: () => bgmPlayer.snapshot,
    onConfirm: submitConfirmation,
  });
  function sync() {
    open.disabled = locked() || submitting || needsRefresh || !ready(state) || !!document.querySelector('dialog[open]');
    $('case-execution-open-label').textContent = submitting ? '正在提交确认…' : needsRefresh ? '请先核对当前进度' : pending ? '处刑 · 核对并续接' : '处刑 · 核对判决';
    confirm.disabled = locked() || submitting || needsRefresh || !currentConfirmation();
    refresh.hidden = !needsRefresh;
    refresh.disabled = locked() || submitting;
    $('phone-execution').setAttribute('aria-busy', String(submitting));
    $('execution-message').textContent = feedback;
    seal.sync();
  }
  function notify(message) {
    feedback = message;
    $('message').textContent = message;
    sync();
  }
  function update(view) {
    const scope = `${view?.generation}:${view?.scenarioId || view?.procedureKind}:${view?.phoneState}:${view?.execution?.verdictId}`;
    if (scope !== observedScope) { observedScope = scope; feedback = ''; needsRefresh = false; }
    // A revision change alone does not erase an ambiguous command identity.
    // Replaying its original scope is safer than inventing a second command.
    if (pending && !sameVerdict(pending, view)) pending = undefined;
    if (confirmation && !currentConfirmation()) {
      confirmation = undefined;
      if (dialog.open) dialog.close();
    }
    sync();
  }
  open.addEventListener('click', () => {
    if (locked() || submitting || needsRefresh || !ready(state) || document.querySelector('dialog[open]')) return;
    confirmation = { verdictId: state.execution.verdictId, expectedGeneration: state.generation,
      expectedRevision: state.revision, targets: targetSignature(state) };
    dialog.setAttribute('aria-label', pending ? '续接同一次处刑命令' : '处刑确认');
    confirm.setAttribute('aria-label', pending ? '长按处刑印章 5.5 秒，填满后松开续接原执行命令；Escape 取消' : '长按处刑印章 5.5 秒，填满后松开确认；Escape 取消');
    seal.cancel();
    dialog.showModal(); setBusy(busy); sync();
  });
  dialog.addEventListener('cancel', event => { if (busy || (typeof diceProcessing !== 'undefined' && diceProcessing) || submitting) event.preventDefault(); });
  // Keep a pointer/touch exit without putting another control on the phone.
  dialog.addEventListener('click', event => {
    if (event.target !== dialog || busy || submitting) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    confirmation = undefined; seal.cancel(); setBusy(busy);
  });
  function submitConfirmation() {
    if (!dialog.open || locked() || submitting || needsRefresh || !currentConfirmation()) return;
    const target = confirmation;
    confirmation = undefined; dialog.close();
    operation(async () => {
      if (!pending) pending = { requestId: crypto.randomUUID(), verdictId: target.verdictId,
        expectedGeneration: target.expectedGeneration, expectedRevision: target.expectedRevision };
      const attempt = pending;
      submitting = true; feedback = '正在提交推进确认；后端确认前不显示执行结果。'; sync();
      try {
        const result = await request('/api/case-execution', attempt);
        if (result.status !== 'in_progress') pending = undefined;
        render(result.currentView || result.view || result);
        notify(result.message || (result.status === 'in_progress'
          ? '同一次执行仍在处理中。请稍后核对并手动续接，将复用请求编号；不会自动重试。'
          : result.accepted === false ? '当前判决未执行，请核对最新进度。' : '已收到执行确认结果，请查看最新剧情。'));
      } catch (error) {
        const ambiguous = !error.status || error.status >= 500;
        if (!ambiguous) pending = undefined;
        needsRefresh = true;
        try { render(await request('/api/view')); needsRefresh = false; }
        catch { /* No blind retry: a failed read leaves the confirmation locked. */ }
        let message = error.message;
        if (needsRefresh) message += ' 结果尚未核实，请先点击「核对当前进度」。不会自动重试；未决命令的请求编号会保留。';
        else if (ambiguous && pending) message += ' 结果尚未确认。请核对判决后再次确认，将复用原请求编号；不会自动重试。';
        else message += ' 已核对当前进度，请查看剧情并重新核对；未自动重复执行。';
        if (error.correlationId) message += `（日志编号：${error.correlationId}）`;
        notify(message);
      } finally { submitting = false; sync(); }
    }, { focusAction: true });
  }
  refresh.addEventListener('click', () => {
    if (!needsRefresh || locked() || submitting) return;
    operation(async () => {
      try {
        render(await request('/api/view')); needsRefresh = false;
        notify(pending ? '已核对当前判决。请手动确认续接，将复用原请求编号，不会自动重试。' : '已核对当前进度，请查看剧情与当前判决。');
      } catch { notify('仍无法核对当前进度。请检查连接后再次核对；没有提交或重试处刑命令。'); }
    }, { focusAction: true });
  });
  update(state);
  return { update, sync };
}
