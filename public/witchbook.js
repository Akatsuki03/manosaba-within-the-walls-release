// Original WitchBookUI artwork and layout; all profile/evidence data comes from engine.view().
import { characterAppearance, isCustomPlayer, DEFAULT_CUSTOM_AVATAR } from './character-appearance.mjs';
import { mountAvatarPicker } from './avatar-upload.mjs';
import { MAP_LAYOUTS, resolveMapLayout, visibleMapAreas, updatedMapFloor } from './witchbook-map.mjs';
import { resolveLocation } from './locations.mjs';
import { mountTrialTestimony } from './trial-testimony.mjs';
import { createWitchBookPresentation, evidencePresentation } from './witchbook-present.mjs';
const $ = id => document.getElementById(id);
const art = (group, file) => `/assets/witchbook/UI_WitchBook_${group}/${file}.png`;
// Only host-owned clue IDs may select artwork; evidence never supplies a URL.
const evidenceThumbnail = item => item.id === 'blue-bookmark'
  ? '/assets/items/blue-bookmark.svg' : '/assets/ui/book.png';
const categories = [['evidence', 'Clue', '证物'], ['people', 'Profile', '人物'], ['maps', 'Map', '地图'], ['rules', 'Rule', '规定'], ['records', 'Note', '记录']];
const floors = [['F1', 'F1'], ['F2', 'F2'], ['B1', '地下 1F']];
let category = 'people';
let floor = 'F1';
let people = [];
let selectedId;
let selectedEvidenceId;
let selectedRuleId;
let selectedRecordId;
let currentView = {};
let selectionScope;

// Custom artwork always falls back to the web project's image, not an initial.
const portrait = $('wb-person-thumb');
portrait.addEventListener('error', () => {
  if (portrait.dataset.custom === 'true') {
    if (portrait.getAttribute('src') !== DEFAULT_CUSTOM_AVATAR) portrait.src = DEFAULT_CUSTOM_AVATAR;
    return;
  }
  portrait.hidden = true;
  $('wb-person-mark').hidden = false;
});
let avatarHandlers = {};
let externalBusy = false;
let presentationHandlers = {};
const presentation = createWitchBookPresentation();
export function configureWitchBookPresentation(handlers) { presentationHandlers = handlers; }
const canPresent = () => !externalBusy && !avatarPicker.busy && presentationHandlers.canPresent?.() === true;
const sourceUI = mountTrialTestimony(document, { rootId: 'wb-testimony-actions', sourceOnly: true,
  canInteract: canPresent, onChoose: (command, scope) => {
    const pending = presentation.testimony(currentView, command, scope);
    if (pending && canPresent()) showPresentationConfirmation(pending);
  } });
const avatarPicker = mountAvatarPicker($('wb-avatar-editor'), {
  getContext: () => ({ expectedGeneration: currentView.generation, expectedRevision: currentView.revision }),
  onChange: async (dataUrl, scope) => {
    if (!avatarHandlers.onChange) throw new Error('头像设置尚未就绪，请稍后重试。');
    await avatarHandlers.onChange(dataUrl, scope);
  },
  onBusyChange: value => avatarHandlers.onBusyChange?.(value),
});
export function configureWitchBookAvatarEditor(handlers) { avatarHandlers = handlers; }
export function setWitchBookBusy(value) {
  externalBusy = value;
  avatarPicker.setDisabled(value || !isCustomPlayer(people.find(person => person.id === selectedId), currentView));
  $('wb-present-clue').disabled = !canPresent() || !evidencePresentation(currentView, selectedEvidenceId);
  $('wb-present-submit').disabled = !canPresent() || !presentation.resolve(currentView);
  sourceUI.setDisabled(!canPresent());
}

const dialog = $('witchbook-dialog');
export function openWitchBookForTrial() {
  category = currentView.evidence?.length ? 'evidence' : 'records';
  render();
  if (!dialog.open) dialog.showModal();
}
export function confirmWitchBookTestimony(command, scope) {
  const pending = presentation.testimony(currentView, command, scope);
  if (!pending || !canPresent()) return false;
  category = 'records'; render();
  if (!dialog.open) dialog.showModal();
  showPresentationConfirmation(pending); return true;
}
function setConfirmationInert(value) {
  for (const child of document.querySelector('.wb-stage').children) {
    if (child.id !== 'wb-present-confirm') child.inert = value;
  }
}
function cancelPresentation() {
  setConfirmationInert(false);
  presentation.clear(); $('wb-present-confirm').hidden = true;
  $('wb-present-message').textContent = '';
}
function showPresentationConfirmation(pending) {
  $('wb-present-confirm-title').textContent = pending.kind === 'testimony' ? '提交这次材料核对？' : '出示这份材料？';
  $('wb-present-submit').textContent = pending.kind === 'testimony' ? '确认核对' : '确认出示';
  $('wb-confirm-name').textContent = pending.name;
  const perjury = pending.kind === 'testimony' && currentView.trial?.testimony?.selections?.some(action => action.command === pending.command && action.stance === 'perjury');
  $('wb-confirm-copy').textContent = pending.kind === 'testimony'
    ? `${pending.displayText}${perjury ? ' 只提交这次发言，不出示原件。' : ''}`
    : '将这份材料出示给庭上的所有人。';
  $('wb-present-message').textContent = '';
  $('wb-present-confirm').hidden = false;
  setConfirmationInert(true);
  $('wb-present-submit').disabled = !canPresent();
  $('wb-present-cancel').focus();
}
$('wb-present-clue').addEventListener('click', () => {
  if (!canPresent()) return;
  const pending = presentation.evidence(currentView, selectedEvidenceId);
  if (pending) showPresentationConfirmation(pending);
});
$('wb-present-cancel').addEventListener('click', () => { cancelPresentation();
  (category === 'evidence' ? $('wb-present-clue') : $('testimony-reference').querySelector('summary'))?.focus(); });
$('wb-present-submit').addEventListener('click', () => {
  const pending = presentation.resolve(currentView);
  if (!pending || !canPresent()) {
    $('wb-present-message').textContent = '当前材料或审判状态已改变，请返回重新选择。';
    return;
  }
  // The closed dialog is no longer a modal blocker when the main submit gate runs.
  dialog.close(); cancelPresentation();
  presentationHandlers.onPresent?.(pending);
});
dialog.addEventListener('close', () => { cancelPresentation(); sourceUI.close(); });
dialog.addEventListener('cancel', event => {
  if (!$('wb-present-confirm').hidden) { event.preventDefault(); cancelPresentation(); }
});
const tabs = document.querySelector('.wb-tabs');
const itemStrip = $('wb-items');
// Translate a vertical mouse wheel into horizontal browsing, never vertical panning.
itemStrip.addEventListener('wheel', event => {
  if (event.ctrlKey) return;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  const unit = event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? itemStrip.clientWidth : 1;
  event.preventDefault();
  itemStrip.scrollLeft += delta * unit;
}, { passive: false });

for (const [id, label, name] of categories) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.bookTab = id;
  button.setAttribute('aria-label', name);
  button.innerHTML = '<img class="wb-tab-base" alt=""><img class="wb-tab-label" alt="">';
  button.addEventListener('click', () => { category = id; render(); });
  tabs.append(button);
}

for (const btnId of ['wb-present-people', 'wb-present-clue']) {
  const btn = $(btnId);
  if (!btn) continue;
  const bg = btn.querySelector('.wb-btn-bg');
  btn.addEventListener('pointerenter', () => { if (bg) bg.src = '/assets/ui/ButtonBase_Highlighted.png'; });
  btn.addEventListener('pointerleave', () => { if (bg) bg.src = '/assets/ui/ButtonBase_Default.png'; });
}

function renderNamePlate(container, text) {
  container.replaceChildren();
  const chars = [...(text || '暂无人物')];
  for (const [index, char] of chars.entries()) {
    const span = document.createElement('span');
    span.className = index === 0 ? 'first-initial' : index === 2 ? 'second-initial' : 'name-body';
    span.textContent = char;
    container.append(span);
  }
}

function renderRuleBody(container, rule) {
  let timetable;
  for (const text of (rule?.text || '目前没有可查阅的规定。').split(/\r?\n\r?\n/u)) {
    // Format existing copy locally so old saves gain the same readable rows.
    const lines = rule?.id === 'timetable' ? text.split(/(?<=。)\s*(?=\d{2}:\d{2}[—–-])/u) : [text];
    for (const line of lines) {
      const slot = rule?.id === 'timetable' && /^(\d{2}:\d{2}\s*[—–-]\s*(?:次日\s*)?\d{2}:\d{2})[：:]?\s*([\s\S]+)$/u.exec(line.trim());
      if (slot) {
        if (!timetable) {
          timetable = document.createElement('dl'); timetable.className = 'wb-timetable'; container.append(timetable);
        }
        const time = document.createElement('dt'); time.textContent = slot[1];
        const activity = document.createElement('dd'); activity.textContent = slot[2];
        timetable.append(time, activity);
      } else {
        timetable = undefined;
        const paragraph = document.createElement('p'); paragraph.textContent = line; container.append(paragraph);
      }
    }
  }
}

function render() {
  const acquaintances = people.filter(person => person.id !== currentView.player?.id && person.id !== 'warden').length;
  $('people-count').textContent = `${people.length} 人`;
  $('book-records').textContent = currentView.episode
    ? `${currentView.episode.title}\n${currentView.episode.summary}`
    : `地点：${resolveLocation(currentView.location, currentView)?.name || currentView.location || '未知地点'}。已结识 ${acquaintances} 人。`;
  const rules = currentView.rules || [];
  const rule = rules.find(item => item.id === selectedRuleId) || rules[0];
  selectedRuleId = rule?.id;
  const ruleContent = $('wb-rule-content');
  if (ruleContent) {
    ruleContent.replaceChildren();
    const heading = document.createElement('h4'); heading.textContent = rule?.name || '当前规定'; ruleContent.append(heading);
    renderRuleBody(ruleContent, rule);
  }
  const records = currentView.records || [];
  const record = records.find(item => item.id === selectedRecordId) || records[0];
  selectedRecordId = record?.id;
  if (record) $('book-records').textContent = `${record.name}\n${record.text}`;
  document.querySelector('.wb-stage').dataset.category = category;
  $('wb-background').src = art(category === 'rules' ? 2 : 1, category === 'rules' ? 'Background_2' : 'Background_1');
  for (const [id, label] of categories) {
    const active = category === id;
    const button = tabs.querySelector(`[data-book-tab="${id}"]`);
    button.setAttribute('aria-selected', String(active));
    button.querySelector('.wb-tab-base').src = art(1, `TabBase_${active ? 'Highlighted' : 'Default'}`);
    button.querySelector('.wb-tab-label').src = art(1, `TabLabel_${label}_${active ? 'Active' : 'Inactive'}@ZhHans`);
    document.querySelector(`[data-book-panel="${id}"]`).hidden = !active;
  }

  const character = people.find(person => person.id === selectedId) || people[0];
  selectedId = character?.id;
  const appearance = characterAppearance(character, currentView);
  const editable = isCustomPlayer(character, currentView);
  $('wb-avatar-editor').hidden = !editable;
  document.querySelector('[data-book-panel="people"] .wb-right-area').classList.toggle('has-avatar-editor', editable);
  portrait.dataset.custom = String(editable);
  portrait.closest('.wb-thumbnail-mask').dataset.custom = String(editable);
  if (editable) avatarPicker.setValue(currentView.player?.avatarUrl || null);
  else avatarPicker.clearMessage();
  avatarPicker.setDisabled(externalBusy || !editable);
  renderNamePlate($('wb-person-name'), character?.name || '暂无人物');
  $('wb-person-name').style.setProperty('--speaker-initial', appearance.color);
  const mark = $('wb-person-mark');
  mark.textContent = [...(character?.name || '？')][0];
  mark.style.setProperty('--speaker-initial', appearance.color);
  mark.hidden = Boolean(appearance.portrait);
  portrait.hidden = !appearance.portrait;
  portrait.alt = character ? `${character.name}立绘` : '';
  if (appearance.portrait) {
    if (portrait.getAttribute('src') !== appearance.portrait) portrait.src = appearance.portrait;
  } else {
    portrait.removeAttribute('src');
  }

  const charContainer = $('characters');
  charContainer.replaceChildren();
  if (character) {
    const texts = [
      character.prisonerNumber ? `囚犯编号${character.prisonerNumber}。` : '',
      ...(Array.isArray(character.profileParagraphs) ? character.profileParagraphs
        : (character.introduction || '').split(/\n\s*\n/u)),
    ].filter(Boolean);
    for (const text of texts) {
      const p = document.createElement('p');
      p.className = 'wb-description-text';
      p.textContent = text;
      charContainer.append(p);
    }
  } else {
    const p = document.createElement('p');
    p.className = 'wb-description-text';
    p.textContent = '当前尚未获知人物资料。';
    charContainer.append(p);
  }

  // Evidence is already cropped by the host; never reconstruct it from dialogue
  // or another saved view. Rewind/load may remove the selected object entirely.
  const evidence = currentView.evidence || [];
  const clue = evidence.find(item => item.id === selectedEvidenceId) || evidence[0];
  selectedEvidenceId = clue?.id;
  const clueTitle = $('wb-clue-title');
  clueTitle.replaceChildren();
  for (const [index, char] of [...(clue?.name || '暂无证物')].entries()) {
    const letter = document.createElement('span');
    letter.className = index === 0 ? 'first-char' : 'rest-chars';
    letter.textContent = char; clueTitle.append(letter);
  }
  const clueThumbnail = $('wb-clue-thumb');
  clueThumbnail.hidden = !clue;
  clueThumbnail.alt = clue ? `${clue.name}物品插图` : '';
  if (clue) clueThumbnail.src = evidenceThumbnail(clue);
  else clueThumbnail.removeAttribute('src');
  const clueDescription = document.createElement('p');
  clueDescription.className = 'wb-description-text';
  clueDescription.textContent = clue?.description || (clue ? '暂无更多物品记录。' : '尚未记录物品。');
  $('wb-clue-desc').replaceChildren(clueDescription);
  // A profile is not a ballot or a presentable material. Keep those actions separate.
  $('wb-present-people').hidden = true;
  const presentable = evidencePresentation(currentView, selectedEvidenceId);
  $('wb-present-clue').hidden = currentView.trial?.stage !== 'discussion';
  $('wb-present-clue').disabled = !presentable || !canPresent();
  $('wb-present-clue').title = presentable ? '在图鉴中确认后向庭上公开材料' : '当前没有宿主授权的出示操作';
  const source = currentView.trial?.testimony?.reference;
  // Round-robin source validation is a transcript tool, not a clue hint.
  // Keep every evidence page identical; legacy source commands remain in records.
  const sourceVisible = currentView.trial?.stage === 'discussion' && source && category === 'records';
  $('wb-trial-source').hidden = !sourceVisible;
  document.querySelector('.wb-stage').dataset.hasSource = String(Boolean(sourceVisible));
  sourceUI.update(currentView);
  sourceUI.setDisabled(!canPresent());

  const isThumbMode = category === 'evidence' || category === 'people';
  const items = category === 'maps'
    ? floors.map(([id, name]) => ({ id, name }))
    : category === 'people'
      ? people
      : category === 'rules'
        ? rules.map(item => ({ id: item.id, name: item.name || '当前规定' }))
        : category === 'records'
          ? (records.length ? records : [{ id: 'progress', name: '调查记录' }])
          : evidence;

  $('wb-items').replaceChildren();
  for (let i = 0; i < Math.max(10, items.length); i++) {
    const item = items[i];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `wb-item${isThumbMode ? ' no-bg' : ''}`;
    button.disabled = !item;

    if (item) {
      if (!isThumbMode) {
        const bgImg = document.createElement('img');
        bgImg.className = 'wb-slot-bg';
        const isMultiLine = item.name.includes('\n') || item.name.length > 6;
        bgImg.src = category === 'records'
          ? art(1, 'ItemButton_Common_1')
          : art(1, isMultiLine ? 'ItemButton_Common_3' : 'ItemButton_Common_2');
        bgImg.alt = '';
        button.append(bgImg);
      }

      if (isThumbMode) {
        const icon = document.createElement('img');
        icon.className = 'wb-item-icon';
        const itemAppearance = characterAppearance(item, currentView);
        icon.dataset.custom = String(Boolean(itemAppearance.custom));
        const thumbnail = category === 'people' ? itemAppearance.thumbnail : evidenceThumbnail(item);
        icon.alt = category === 'evidence' ? `${item.name}物品插图` : '';
        const initial = document.createElement('span');
        initial.className = 'wb-item-initial';
        initial.textContent = [...(item.name || '？')][0];
        initial.style.setProperty('--speaker-initial', itemAppearance.color);
        initial.hidden = Boolean(thumbnail);
        icon.hidden = !thumbnail;
        if (thumbnail) {
          icon.src = thumbnail;
          icon.loading = 'lazy';
          icon.addEventListener('error', () => {
            if (itemAppearance.custom) {
              if (icon.getAttribute('src') !== DEFAULT_CUSTOM_AVATAR) icon.src = DEFAULT_CUSTOM_AVATAR;
            } else { icon.hidden = true; initial.hidden = false; }
          });
        }
        button.setAttribute('aria-label', item.name);
        button.append(icon, initial);
        const srName = document.createElement('span');
        srName.className = 'wb-item-badge';
        srName.textContent = item.name;
        button.append(srName);
      } else {
        const text = document.createElement('span');
        text.className = 'wb-slot-text';
        text.textContent = item.name;
        button.append(text);
      }

      const isActive = category === 'maps' ? item.id === floor : category === 'people' ? item.id === selectedId
        : category === 'evidence' ? item.id === selectedEvidenceId : category === 'rules' ? item.id === selectedRuleId
          : category === 'records' ? item.id === selectedRecordId : i === 0;
      button.setAttribute('aria-pressed', String(isActive));
      button.addEventListener('click', () => {
        if (externalBusy || avatarPicker.busy) return;
        if (category === 'maps') floor = item.id;
        if (category === 'people') selectedId = item.id;
        if (category === 'evidence') selectedEvidenceId = item.id;
        if (category === 'rules') selectedRuleId = item.id;
        if (category === 'records') selectedRecordId = item.id;
        const scroll = $('wb-items').scrollLeft;
        render();
        $('wb-items').scrollLeft = scroll;
        $('wb-items').children[i]?.focus({ preventScroll: true });
      });
    } else {
      button.setAttribute('aria-label', '空条目');
      if (!isThumbMode) {
        const emptyBg = document.createElement('img');
        emptyBg.className = 'wb-slot-bg wb-opacity-30';
        emptyBg.src = art(1, 'ItemButton_Common_1');
        emptyBg.alt = '';
        button.append(emptyBg);
      }
    }
    $('wb-items').append(button);
  }

  const floorName = floors.find(([id]) => id === floor)[1];
  const originalLayout = MAP_LAYOUTS[floor];
  const layout = resolveMapLayout(floor, currentView);
  const extensionWidth = layout.extensionWidth || 0;
  const sourceX = extensionWidth - (layout.imageOffsetX || 0);
  const baseWidth = layout.width - extensionWidth;
  const image = art(2, `Layout_${floor}_1`);
  $('wb-map-canvas').setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
  const base = $('wb-map-base');
  base.setAttribute('x', extensionWidth);
  base.setAttribute('width', baseWidth);
  base.setAttribute('height', layout.height);
  base.setAttribute('viewBox', `${sourceX} 0 ${baseWidth} ${layout.height}`);
  $('wb-map').setAttribute('href', image);
  $('wb-map').setAttribute('width', originalLayout.width);
  $('wb-map').setAttribute('height', originalLayout.height);
  $('wb-map-title').textContent = `${floorName} 地图（仅标注已到访地点）`;
  const locationName = resolveLocation(currentView.location, currentView)?.name || currentView.location;
  $('book-location').textContent = locationName ? `当前位置：${locationName}` : '';
  const svg = (tag, attributes = {}) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    return element;
  };
  const extension = $('wb-map-extension');
  extension.replaceChildren();
  if (extensionWidth) {
    const room = svg('svg', {
      width: extensionWidth, height: layout.height,
      viewBox: `0 0 ${extensionWidth} ${layout.height}`,
      overflow: 'hidden', 'aria-hidden': 'true',
    });
    room.append(svg('image', { href: image, width: originalLayout.width, height: originalLayout.height }));
    extension.append(room);
  }
  const nodes = $('wb-map-nodes');
  nodes.replaceChildren();
  for (const area of visibleMapAreas(currentView, floor)) {
    const [x, y, width, height] = area.rect;
    const node = svg('g', {
      class: `wb-map-node${area.current ? ' is-current' : ''}`,
      'data-map-area': area.id,
      transform: `translate(${x} ${y})`,
      role: 'img',
      'aria-label': `${area.name}${area.current ? '（当前位置）' : '（已到访）'}`,
    });
    if (area.current) {
      node.setAttribute('aria-current', 'location');
      node.append(svg('rect', { class: 'wb-map-highlight', width, height }));
    }
    const plate = svg('image', {
      href: art(2, `AreaLabelPlate_${Math.min(Math.max(area.name.length - 1, 1), 5)}`),
      x: width / 2 - 100, y: height / 2 - 36, width: 200, height: 72,
      'aria-hidden': 'true',
    });
    const label = svg('text', { x: width / 2, y: height / 2, 'aria-hidden': 'true' });
    label.textContent = area.name;
    node.append(plate, label);
    nodes.append(node);
  }
}

export function updateWitchBook(view) {
  floor = updatedMapFloor(floor, currentView, view);
  const scope = `${view.exampleId}:${view.generation}:${view.player?.id || ''}`;
  if (scope !== selectionScope) selectedId = view.player?.id;
  selectionScope = scope;
  currentView = view;
  if (!$('wb-present-confirm').hidden && !presentation.resolve(view)) {
    $('wb-present-submit').disabled = true;
    $('wb-present-message').textContent = '进度已更新，未出示材料；请返回图鉴重新选择。';
  }
  // Reset selection if a rewind/load removes a previously known character.
  people = (view.characters || []).map((person, index) => ({ ...person, id: person.id ?? person.name ?? String(index) }))
    .sort((left, right) => (left.prisonerNumber ?? Infinity) - (right.prisonerNumber ?? Infinity));
  render();
}

$('witchbook-open').addEventListener('click', () => { render(); dialog.showModal(); });
$('witchbook-close').addEventListener('click', () => dialog.close());
const closeImage = $('witchbook-close').querySelector('img');
for (const [event, state] of [['pointerenter', 'Highlighted'], ['pointerleave', 'Default'], ['pointerdown', 'Pressed'], ['pointerup', 'Highlighted']]) {
  $('witchbook-close').addEventListener(event, () => { closeImage.src = `/assets/ui/CloseButton_${state}.png`; });
}
// Native dialog supplies focus trapping/restoration; explicit Escape also supports
// embedded browser hosts that dispatch keyboard events without native cancel.
document.addEventListener('keydown', event => {
  if (dialog.open && event.key === 'Escape') {
    event.preventDefault();
    if (!$('wb-present-confirm').hidden) {
      cancelPresentation(); (category === 'evidence' ? $('wb-present-clue') : $('witchbook-close')).focus();
    } else dialog.close();
  }
});
render();
