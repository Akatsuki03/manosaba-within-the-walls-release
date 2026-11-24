import {
  ATTRIBUTES, ATTRIBUTE_RULES, CREATION_VERSION, CREATION_V2_VERSION, attributeModifier, defaultCharacter,
  normalizeCharacter, normalizeCreation, normalizeCreationPreferences, normalizeOpening, pointBuyCost, validateAttributes,
  relationshipActorIds, normalizeRelationshipEntries, normalizeRelationshipAuthoringInput,
  normalizeRelationshipCandidate, normalizeRelationshipAuthoringResponse, RELATIONSHIP_AUTHORING_POLICY, RELATIONSHIP_AUTHORING_LIMITS,
} from './player-creation-rules.mjs';
import { CANONICAL_CELLS, CELL_REPLACEMENTS, cellSetupFields, cellSetupLocation } from './cell-setup-rules.mjs';

const TEXT_FIELDS = ['name', 'concept', 'appearance', 'personality', 'background', 'desire', 'magic'];
const FIELD_LABELS = { name: '姓名', concept: '角色概念', appearance: '外貌', personality: '性格', background: '背景', desire: '愿望', magic: '魔法设想' };
const LOOP_LABELS = { 1: '第一周目', 2: '第二周目' };
const ACTOR_IDS = new Set(['emma', 'hiro', 'anan', 'noah', 'leia', 'milia', 'margo', 'nanoka', 'alisa', 'sherry', 'hanna', 'coco', 'meruru']);
const CASE_SCENARIO_IDS = new Set(['case-1', 'case-1-execution-test']);
const STORY_ARC_IDS = new Set(['case-one-day3@1']);
export const STORY_ARC_OPTION_PREFIX = 'story-arc:';
/** Pure catalog projection shared by the creator and independent UI tests.
 * Story arcs stay distinct from the two fixed case scenarios: selecting one
 * emits storyArcId only, keeps the normal opening/draft flow, and is first-loop
 * only. No catalog object or DOM state is mutated. */
export function creationScenarioOptions(catalog) {
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const scenarios = (Array.isArray(catalog?.scenarios) ? catalog.scenarios : [])
    .filter(choice => choice && text(choice.id) && CASE_SCENARIO_IDS.has(choice.id)
      && text(choice.name) && text(choice.description))
    .map(choice => ({ value: choice.id, kind: 'scenario', id: choice.id, name: choice.name,
      description: choice.description, loops: Array.isArray(choice.loops) ? [...choice.loops] : [1],
      excludedActorIds: Array.isArray(choice.excludedActorIds) ? [...choice.excludedActorIds] : [],
      ...(typeof choice.startLocationId === 'string' ? { startLocationId: choice.startLocationId } : {}),
      ...(Array.isArray(choice.playerModes) ? { playerModes: [...choice.playerModes] } : {}),
      fixedOpening: choice.fixedOpening === true }));
  const storyArcs = (Array.isArray(catalog?.storyArcs) ? catalog.storyArcs : [])
    .filter(arc => arc && text(arc.id) && STORY_ARC_IDS.has(arc.id)
      && text(arc.name) && text(arc.description))
    .map(arc => ({ value: `${STORY_ARC_OPTION_PREFIX}${arc.id}`, kind: 'storyArc', id: arc.id,
      name: arc.name, description: arc.description, loops: Array.isArray(arc.loops) ? [...arc.loops] : [1],
      excludedActorIds: Array.isArray(arc.excludedActorIds) ? [...arc.excludedActorIds] : [],
      fixedOpening: false }));
  return [...scenarios, ...storyArcs];
}
export function creationScenarioSelection(value, catalog) {
  return creationScenarioOptions(catalog).find(choice => choice.value === value) || null;
}
/** Empty regular selection emits no field; fixed scenarios emit scenarioId;
 * story arcs emit storyArcId and can never be misread as a scenarioId. */
export function creationScenarioFields(value) {
  if (typeof value !== 'string') return {};
  if (CASE_SCENARIO_IDS.has(value)) return { scenarioId: value };
  if (value.startsWith(STORY_ARC_OPTION_PREFIX)) {
    const id = value.slice(STORY_ARC_OPTION_PREFIX.length);
    if (STORY_ARC_IDS.has(id)) return { storyArcId: id };
  }
  return {};
}
const LOCATION_NAMES = new Map([['PLAYER_CELL', '八号牢房'], ['CELL', '艾玛的牢房'], ['CELL_01', '一号牢房'], ['CELL_02', '二号牢房'], ['CELL_04', '四号牢房'], ['CELL_05', '五号牢房'], ['CELL_06', '六号牢房'], ['CELL_07', '七号牢房'], ['CORRIDOR', '走廊'], ['RECEPTION', '会客厅']]);
const blankOpening = () => ({ text: '', locationId: 'PLAYER_CELL', enabled: false, presetId: '', presetName: '', instruction: '', openingId: 'auto', cellReplace: '' });
const problem = message => Object.assign(new Error(message), { code: 'INVALID_CREATION' });
function safeError(error) {
  if (error?.code === 'INVALID_CREATION') return error.message;
  if (error?.status === 409) return '预设或请求版本已改变，当前草稿已保留；请刷新目录并核对后重试。';
  if (error?.status === 403) return '请求验证已失效，当前草稿已保留；请刷新页面后重试。';
  if (error?.status === 404) return '没有找到创建接口或所选预设，当前草稿已保留；请刷新目录后重试。';
  if (error?.code === 'LLM_NOT_CONFIGURED' || error?.code === 'SETTINGS_UNAVAILABLE') return '尚未配置可用模型，请先在选项中确认设置；不会自动重试。';
  return '请求未完成，当前草稿与游戏进度均已保留。请核对本机服务或模型设置后手动重试；AI 请求可能已产生费用。';
}
function avatarData(value) {
  if (!value) return null;
  if (typeof value !== 'string' || value.length > 4200000 || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/u.test(value)) throw problem('头像资料无效，请重新上传 PNG、JPEG 或 WebP 图片。');
  return value;
}

/** The creator owns drafts only. Nothing writes the live game until collect()
 * is explicitly submitted through the application's versioned new-game route.
 * Model calls happen only on explicit completion buttons. Relationship authoring
 * is an independent, one-request setup helper; its editable candidate needs Apply.
 * Relationship data never enters character/opening helpers or their presets.
 */
export function mountPlayerCreator({ request, getAvatar = () => null, setAvatar = () => {}, onBusyChange = () => {}, document: doc = globalThis.document }) {
  const $ = id => doc.getElementById(id);
  const root = $('player-creator');
  const dialog = $('new-game-dialog');
  if (!root || !dialog || typeof request !== 'function') throw problem('角色创建界面或请求接口尚未就绪。');
  const defaults = defaultCharacter();
  let catalog;
  let presetsLoaded = false;
  let loadingPromise;
  let presets = { characters: [], openings: [] };
  let working = false;
  let requestLocks;
  let externallyDisabled = false;
  let revision = 0;
  let activeLoop = 1;
  let actorId = 'emma';
  const originalMagicDrafts = new Map();
  $('pc-original-magic')?.addEventListener('input', event => originalMagicDrafts.set(actorId, event.target.value));
  let attributeMode = defaults.attributes.mode;
  const attributeDrafts = { standard: { ...defaults.attributes.scores }, custom: { ...defaults.attributes.scores } };
  const openingDrafts = { 1: blankOpening(), 2: blankOpening() };
  const relationshipDrafts = [];
  const relationshipNodes = new Map();
  let relationshipSeed = 0;
  let relationshipErrorSignature = null;
  let relationshipList = null;
  let relationshipAdd = null;
  let relationshipCount = null;
  let relationshipWarning = null;
  let relationshipError = null;
  let relationshipSummary = null;
  let relationshipAssistant;
  let relationshipInstruction;
  let relationshipGenerate;
  let relationshipAssistantStatus;
  let relationshipCandidatePanel;
  let relationshipCandidateList;
  let relationshipCandidateSummary;
  let relationshipCandidateError;
  let relationshipCandidateApply;
  let relationshipCandidateAdd;
  let relationshipCandidate = null;
  let relationshipRequestToken = 0;
  let relationshipCandidateSeed = 0;
  const attributeNodes = new Map();
  const candidates = { character: null, opening: null };
  const deletes = { character: null, opening: null };
  const mode = () => doc.querySelector('input[name="pc-player-mode"]:checked')?.value || 'original';
  const loop = () => Number(doc.querySelector('input[name="pc-loop"]:checked')?.value || 1);
  const scenarioSelection = () => creationScenarioSelection($('pc-scenario')?.value || '', catalog);
  const scenarioId = () => creationScenarioFields($('pc-scenario')?.value || '').scenarioId || '';
  const storyArcId = () => creationScenarioFields($('pc-scenario')?.value || '').storyArcId || '';
  const caseScenario = () => scenarioSelection()?.kind === 'scenario';
  const restrictedView = () => caseScenario() || scenarioSelection()?.kind === 'storyArc';
  const caseActorAllowed = id => !(scenarioSelection()?.excludedActorIds || []).includes(id);
  const example = () => doc.querySelector('input[name="new-game-example"]:checked')?.value || '';
  const blocked = () => working || externallyDisabled || (!working && Boolean($('new-game-examples').disabled));
  const openingEnabled = () => !caseScenario() && (mode() === 'custom' || $('pc-opening-enabled').checked);
  const selectedCellReplace = () => $('pc-cell-replace') ? $('pc-cell-replace').value : openingDrafts[activeLoop]?.cellReplace || '';
  const currentCellSetup = () => cellSetupFields({
    fixed: caseScenario(), playerMode: mode(), replaceActorId: selectedCellReplace(),
  }).cellSetup;
  const currentCellLocation = () => cellSetupLocation(currentCellSetup(), {
    playerMode: mode(), actorId: mode() === 'custom' ? 'player' : actorId,
  }) || (mode() === 'custom' ? 'PLAYER_CELL' : 'CELL');
  function node(tag, text, className) {
    const element = doc.createElement(tag);
    if (text !== undefined) element.textContent = String(text);
    if (className) element.className = className;
    return element;
  }
  function status(text, error = false) {
    $('pc-message').textContent = text;
    root.dataset.error = String(error);
    $('pc-message').dataset.tone = error ? 'error' : 'notice';
  }
  function clearCandidate(kind) {
    candidates[kind] = null;
    $(`pc-${kind}-preview`).hidden = true;
    $(`pc-${kind}-preview-content`).replaceChildren();
  }
  function cancelDelete(kind) {
    deletes[kind] = null;
    dialog.querySelector(`[data-pc-delete="${kind}"]`).hidden = true;
  }
  function invalidate() {
    revision += 1;
    if (relationshipCandidate) relationshipCandidate.stale = true;
    clearCandidate('character'); clearCandidate('opening');
    cancelDelete('character'); cancelDelete('opening');
  }
  function currentScores() {
    return Object.fromEntries(ATTRIBUTES.map(({ id }) => {
      const raw = attributeNodes.get(id).input.value;
      return [id, raw.trim() === '' ? NaN : Number(raw)];
    }));
  }
  function setAttributes(attributes) {
    attributeMode = attributes.mode;
    $('pc-attribute-mode').value = attributeMode;
    attributeDrafts[attributeMode] = { ...attributes.scores };
    for (const { id } of ATTRIBUTES) attributeNodes.get(id).input.value = String(attributes.scores[id]);
    renderAttributes();
  }
  function renderAttributes() {
    const standard = attributeMode === 'standard';
    const scores = currentScores();
    const minimum = standard ? ATTRIBUTE_RULES.base : 1;
    const maximum = standard ? ATTRIBUTE_RULES.maxStandard : ATTRIBUTE_RULES.maxCustom;
    let spent;
    try { if (standard) spent = pointBuyCost(scores); }
    catch { /* An unfinished numeric input is kept for the player to correct. */ }
    $('pc-point-budget').hidden = !standard;
    $('pc-custom-points-help').hidden = standard;
    $('pc-points-remaining').textContent = spent === undefined ? '请检查六项属性' : `剩余 ${ATTRIBUTE_RULES.budget - spent} / 27 点`;
    $('pc-points-spent').textContent = spent === undefined ? '每项须为 8—15 的整数' : `已用 ${spent} 点`;
    $('pc-points-meter').value = spent ?? 0;
    $('pc-points-meter').textContent = `${spent ?? 0} / ${ATTRIBUTE_RULES.budget}`;
    $('pc-point-budget').dataset.complete = String(standard && spent === ATTRIBUTE_RULES.budget);
    $('pc-point-budget').dataset.invalid = String(spent === undefined || spent > ATTRIBUTE_RULES.budget);
    $('pc-attribute-message').textContent = !standard ? '自由设定六项属性，每项可填写 1—20。'
      : spent === undefined ? '请填写 8—15 的整数；空白、小数和超出范围的数值不能开局。'
        : spent > ATTRIBUTE_RULES.budget ? '已超出预算，请降低部分属性。'
          : spent < ATTRIBUTE_RULES.budget ? `还有 ${ATTRIBUTE_RULES.budget - spent} 点待分配，花完后才能保存角色或开始游戏。` : '27 点已分配完毕，可以保存角色或开始游戏。';
    for (const { id } of ATTRIBUTES) {
      const { input, decrease, increase, modifier, cost } = attributeNodes.get(id);
      const score = scores[id];
      const valid = Number.isInteger(score) && score >= minimum && score <= maximum;
      input.min = String(minimum); input.max = String(maximum);
      input.setAttribute('aria-invalid', String(!valid));
      input.setCustomValidity(valid ? '' : `请填写 ${minimum}—${maximum} 的整数。`);
      modifier.textContent = valid ? `${attributeModifier(score) >= 0 ? '+' : ''}${attributeModifier(score)}` : '—';
      cost.textContent = standard && valid ? `${ATTRIBUTE_RULES.costs[score]} 点` : standard ? '待分配' : '自由设定';
      decrease.disabled = blocked() || !valid || score <= minimum;
      const extraCost = standard ? ATTRIBUTE_RULES.costs[score + 1] - ATTRIBUTE_RULES.costs[score] : 0;
      increase.disabled = blocked() || !valid || score >= maximum || (standard && (spent === undefined || spent + extraCost > ATTRIBUTE_RULES.budget));
    }
  }
  for (const attribute of ATTRIBUTES) {
    const card = node('div', undefined, 'pc-attribute');
    const title = node('label', attribute.label);
    title.htmlFor = `pc-score-${attribute.id}`;
    const description = node('p', attribute.description, 'pc-attribute-description');
    description.id = `pc-score-${attribute.id}-help`;
    const controls = node('div', undefined, 'pc-score-controls');
    const decrease = node('button', '−'); decrease.type = 'button';
    decrease.setAttribute('aria-label', `降低${attribute.label}`);
    const input = node('input');
    input.id = `pc-score-${attribute.id}`; input.type = 'number'; input.step = '1'; input.inputMode = 'numeric';
    input.value = String(defaults.attributes.scores[attribute.id]);
    input.setAttribute('aria-describedby', description.id);
    const increase = node('button', '+'); increase.type = 'button';
    increase.setAttribute('aria-label', `提高${attribute.label}`);
    controls.append(decrease, input, increase);
    const foot = node('div', undefined, 'pc-score-foot');
    const cost = node('span'); const modifier = node('strong');
    const modifierLabel = node('span', '调整值 '); modifierLabel.append(modifier);
    foot.append(cost, modifierLabel);
    card.append(title, description, controls, foot);
    $('pc-attributes').append(card);
    attributeNodes.set(attribute.id, { input, decrease, increase, modifier, cost });
    function adjust(delta) {
      if (blocked() || (delta > 0 ? increase.disabled : decrease.disabled)) return;
      input.value = String(Number(input.value) + delta);
      try { attributeDrafts[attributeMode] = validateAttributes({ mode: attributeMode, scores: currentScores() }, { requireSpent: false }).scores; }
      catch { /* Other fields may still contain unfinished numeric input. */ }
      invalidate(); renderAttributes();
    }
    decrease.addEventListener('click', () => adjust(-1));
    increase.addEventListener('click', () => adjust(1));
    function editScore(commit) {
      const proposed = currentScores();
      const score = proposed[attribute.id];
      const standard = attributeMode === 'standard';
      const minimum = standard ? ATTRIBUTE_RULES.base : 1;
      const maximum = standard ? ATTRIBUTE_RULES.maxStandard : ATTRIBUTE_RULES.maxCustom;
      let spent;
      try { if (standard) spent = pointBuyCost(proposed); } catch { /* Keep unfinished numeric input editable. */ }
      const valid = Number.isInteger(score) && score >= minimum && score <= maximum;
      // Permit temporary blank / "1" drafts while typing 12 or 15. Invalid
      // drafts are never collected; leaving the field restores its last value.
      if ((Number.isFinite(score) && score > maximum) || (spent !== undefined && spent > ATTRIBUTE_RULES.budget)
        || (commit && !valid)) {
        input.value = String(attributeDrafts[attributeMode][attribute.id]);
      } else if (standard ? spent !== undefined : Object.values(proposed).every(value => Number.isInteger(value) && value >= 1 && value <= maximum)) {
        attributeDrafts[attributeMode] = { ...proposed };
      }
      renderAttributes();
    }
    input.addEventListener('input', () => editScore(false));
    input.addEventListener('change', () => editScore(true));
  }
  function profileValues() {
    return { ...Object.fromEntries(TEXT_FIELDS.map(field => [field, $(`pc-character-${field}`).value])),
      age: $('pc-character-age').value.trim() === '' ? NaN : Number($('pc-character-age').value),
      impressionColor: $('custom-impression-color').value };
  }
  function character({ partial = false, withAttributes = true } = {}) {
    const values = profileValues();
    if (withAttributes) values.attributes = validateAttributes({ mode: attributeMode, scores: currentScores() });
    return normalizeCharacter(values, { partial });
  }
  function opening() {
    return normalizeOpening({ text: $('pc-opening-text').value, locationId: currentCellLocation() });
  }
  const RELATIONSHIP_MESSAGES = new Set([
    '关系文字总长不能超过 12800 字。',
    '非空初始关系不能与固定案件起点或预制故事弧同时使用。',
    '同一对人物的初始相识设置冲突，请统一设置。',
    '关系人物标识无效或重复。',
  ]);
  function fixedStartSelected() {
    return Boolean(scenarioId() || storyArcId());
  }
  function actorAllowed(id) {
    return id === 'player' ? mode() === 'custom' : ACTOR_IDS.has(id);
  }
  function staleIds(ids) {
    return ids.filter(id => !actorAllowed(id));
  }
  // Default audience omits knownBy. A saved manual list stays in the draft, but
  // only the active parties and, when manual, that list can block submission.
  function activeReferenceIds(entry) {
    return entry.audienceMode === 'manual' ? [...entry.actorIds, ...entry.knownBy] : entry.actorIds;
  }
  function activeStaleIds(entry) {
    return [...new Set(staleIds(activeReferenceIds(entry)))];
  }
  function actorLabel(id) {
    if (id === 'player') {
      const name = $('pc-character-name')?.value;
      const trimmed = typeof name === 'string' ? name.trim() : '';
      return trimmed ? `自定义玩家（${trimmed}）` : '自定义玩家';
    }
    const actor = catalog?.actors?.find(item => item && item.id === id && typeof item.name === 'string' && item.name);
    return actor ? actor.name : id;
  }
  function actorToken(id) {
    if (id === 'player') return `${actorLabel(id)} / player`;
    const label = actorLabel(id);
    return label === id ? id : `${label} / ${id}`;
  }
  function listedIds(selected) {
    const ids = [...ACTOR_IDS];
    if (mode() === 'custom' || selected.includes('player')) ids.push('player');
    for (const id of selected) if (!ids.includes(id)) ids.push(id);
    return ids;
  }
  function toggleId(list, id, checked) {
    const has = list.includes(id);
    if (checked) return has ? list : [...list, id];
    return has ? list.filter(item => item !== id) : list;
  }
  function childByTag(parent, tagName) {
    if (!parent?.children) return null;
    for (const child of parent.children) if (typeof child?.tagName === 'string' && child.tagName.toLowerCase() === tagName) return child;
    return null;
  }
  function choiceInput(label) { return childByTag(label, 'input'); }
  function choiceCaption(label) { return childByTag(label, 'span'); }
  function blankRelationship() {
    relationshipSeed += 1;
    return { key: `r${relationshipSeed}`, actorIds: [], text: '', acquainted: true, audienceMode: 'default', knownBy: [], manualInitialized: false };
  }
  function relationshipSnapshot() {
    return relationshipDrafts.map(entry => {
      const text = relationshipNodes.get(entry.key)?.text;
      if (text && typeof text.value === 'string') entry.text = text.value;
      return {
        actorIds: entry.actorIds.slice(), text: entry.text, acquainted: entry.acquainted === true,
        audienceMode: entry.audienceMode === 'manual' ? 'manual' : 'default', knownBy: entry.knownBy.slice(),
      };
    });
  }
  function relationshipRecords() {
    return relationshipSnapshot().map(entry => {
      const row = { actorIds: entry.actorIds.slice(), text: entry.text, acquainted: entry.acquainted === true };
      if (entry.audienceMode === 'manual') row.knownBy = entry.knownBy.slice();
      return row;
    });
  }
  function baseCreationFields() {
    const fixed = caseScenario();
    const selectedOpening = fixed && mode() === 'custom' ? normalizeOpening()
      : openingEnabled() ? opening() : null;
    const cellSetup = currentCellSetup();
    const authoredMagic = mode() === 'original' && !fixedStartSelected() ? $('pc-original-magic')?.value : undefined;
    return {
      playerMode: mode(), actorId: mode() === 'custom' ? 'player' : actorId, loop: loop(),
      character: mode() === 'custom' ? character() : null, opening: selectedOpening,
      ...(authoredMagic?.trim() ? { authoredMagic } : {}),
      ...(cellSetup ? { cellSetup } : {}),
      ...(fixed ? { openingId: 'auto' } : {}),
      ...(scenarioId() ? { scenarioId: scenarioId() } : {}),
      ...(storyArcId() ? { storyArcId: storyArcId() } : {}),
    };
  }
  function runPolicyFields() {
    // Fixed starts keep their historical payload and a retained local draft.
    if (fixedStartSelected()) return {};
    return normalizeCreationPreferences({ directorPreferences: $('pc-director-preferences')?.value ?? '',
      playPolicy: { cases: $('pc-policy-cases')?.value ?? 'allowed',
        boundaries: ($('pc-policy-boundaries')?.value ?? '').split(/\r?\n/u).filter(line => line.trim()) } });
  }
  function creationRecord() {
    const relationships = relationshipRecords();
    const fields = baseCreationFields();
    // A fixed start keeps the historical v1 byte shape only while relationships
    // stay empty. Non-empty drafts stay on v2 so the shared codec can reject
    // them without dropping authored rows or other v2 semantics.
    if (relationships.length === 0 && fixedStartSelected()) return { version: CREATION_VERSION, ...fields };
    return { version: CREATION_V2_VERSION, ...fields, relationships, ...runPolicyFields() };
  }
  function creationWithoutRelationships() {
    const fields = baseCreationFields();
    if (fixedStartSelected()) return { version: CREATION_VERSION, ...fields };
    return { version: CREATION_V2_VERSION, ...fields, relationships: [], ...runPolicyFields() };
  }
  function isRelationshipFailure(error) {
    try {
      if (error?.code !== 'INVALID_CREATION' || relationshipDrafts.length === 0) return false;
      if (RELATIONSHIP_MESSAGES.has(error.message)) return true;
      normalizeCreation(creationWithoutRelationships());
      return true;
    } catch {
      return false;
    }
  }
  function normalizedLengths() {
    const custom = mode() === 'custom';
    return relationshipDrafts.map(entry => {
      try {
        const row = { actorIds: entry.actorIds.slice(), text: entry.text, acquainted: entry.acquainted === true };
        if (entry.audienceMode === 'manual') row.knownBy = entry.knownBy.slice();
        return normalizeRelationshipEntries([row], custom ? 'custom' : 'original')[0].text.length;
      } catch {
        return null;
      }
    });
  }
  function relationshipErrorDetail(error) {
    if (!isRelationshipFailure(error)) return '';
    const message = String(error.message || '');
    const parts = [];
    if (relationshipDrafts.length > 16) parts.push(`当前共 ${relationshipDrafts.length} 条，上限 16 条。`);
    if (message.includes('12800')) {
      const lengths = normalizedLengths();
      if (lengths.every(length => length !== null)) parts.push(`规范后正文合计 ${lengths.reduce((sum, length) => sum + length, 0)} 字。`);
      relationshipDrafts.forEach((entry, index) => {
        const normalized = lengths[index];
        parts.push(`第 ${index + 1} 条原始正文 ${entry.text.length} 个 UTF-16 码元${normalized === null ? '' : `，规范后 ${normalized} 字`}。`);
      });
    } else if (message.includes('文字内容')) {
      relationshipDrafts.forEach((entry, index) => {
        parts.push(`第 ${index + 1} 条原始正文 ${entry.text.length} 个 UTF-16 码元${entry.text.length > 1600 ? '，超过单项 1600' : ''}。`);
      });
    }
    if (message.includes('人物标识')) {
      relationshipDrafts.forEach((entry, index) => {
        const stale = activeStaleIds(entry);
        parts.push(`第 ${index + 1} 条当事人 ${entry.actorIds.join('、') || '（无）'}${stale.length ? `；失效标识 ${stale.join('、')}` : ''}。`);
      });
    }
    if (message.includes('冲突')) parts.push('相交当事人的相识设置不一致；条目未合并，正文和受众未改写。');
    if (message.includes('固定案件') || message.includes('故事弧')) parts.push(`当前 ${relationshipDrafts.length} 条关系仍保留，没有改成空列表，也没有降级为版本 1。`);
    return parts.length ? ` ${parts.join('')}` : '';
  }
  function clearRelationshipMarks() {
    if (relationshipError) relationshipError.textContent = '';
    for (const nodes of relationshipNodes.values()) {
      nodes.error.textContent = '';
      nodes.text.setAttribute('aria-invalid', 'false');
      nodes.actorsField.setAttribute('aria-invalid', 'false');
      nodes.acquaintedField.setAttribute('aria-invalid', 'false');
    }
  }
  function markRelationshipErrors(fullMessage, codecMessage) {
    relationshipErrorSignature = signature();
    if (relationshipError) relationshipError.textContent = fullMessage;
    const actorProblem = codecMessage.includes('人物标识');
    const textProblem = codecMessage.includes('文字内容') || codecMessage.includes('12800');
    const conflict = codecMessage.includes('冲突');
    relationshipDrafts.forEach((entry, index) => {
      const nodes = relationshipNodes.get(entry.key);
      if (!nodes) return;
      const stale = activeStaleIds(entry);
      const parts = [`第 ${index + 1} 条：${codecMessage}`];
      if (actorProblem) parts.push(`当事人 ${entry.actorIds.length} 人${stale.length ? `，失效标识 ${stale.join('、')}` : ''}。`);
      if (textProblem) parts.push(`原始正文 ${entry.text.length} 个 UTF-16 码元。`);
      if (entry.audienceMode === 'manual') parts.push(entry.knownBy.length ? `手动受众 ${entry.knownBy.join('、')}。` : '手动受众 []。');
      else parts.push('默认受众。');
      if (conflict) parts.push('相识设置与其他条目冲突。');
      nodes.error.textContent = parts.join('');
      if (actorProblem) nodes.actorsField.setAttribute('aria-invalid', 'true');
      if (textProblem) nodes.text.setAttribute('aria-invalid', 'true');
      if (conflict) nodes.acquaintedField.setAttribute('aria-invalid', 'true');
    });
    const target = relationshipError;
    if (!target) return;
    target.tabIndex = -1;
    if (dialog.open && typeof target.focus === 'function') {
      target.focus({ preventScroll: true });
      if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }
  function relationshipProbe() {
    const relationships = relationshipRecords();
    if (relationships.length === 0) {
      return { ok: true, relationships: fixedStartSelected() ? null : [] };
    }
    try {
      const normalized = normalizeRelationshipEntries(relationships, mode());
      if (fixedStartSelected()) throw problem('非空初始关系不能与固定案件起点或预制故事弧同时使用。');
      return { ok: true, relationships: normalized };
    } catch (error) {
      return { ok: false, message: error?.code === 'INVALID_CREATION' ? error.message : '关系草稿未能通过共享规则。' };
    }
  }
  function seriousRelationshipMessage(probe) {
    if (!probe || probe.ok || relationshipDrafts.length === 0) return '';
    const message = probe.message || '';
    const stale = relationshipDrafts.some(entry => activeStaleIds(entry).length > 0);
    if (stale) return `${message} 草稿仍保留。`;
    if (message.includes('冲突') || message.includes('12800') || message.includes('固定案件') || message.includes('故事弧')) return `${message} 草稿仍保留。`;
    if (relationshipDrafts.length > 16) return `${message} 当前共 ${relationshipDrafts.length} 条，上限 16 条。草稿仍保留。`;
    if (message.includes('文字内容') && relationshipDrafts.some(entry => entry.text.length > 1600)) return `${message} 草稿仍保留，不会自动截断。`;
    return '';
  }
  function summaryLines(probe) {
    const lines = ['这些关系只用于即将开始的新游戏。可完全手写；只有手动请求独立关系助手才发送公开草稿，不进入角色、开场补全或预设。'];
    const fixed = fixedStartSelected();
    if (relationshipDrafts.length === 0) {
      lines.push(fixed
        ? '当前没有关系。固定案件起点或预制故事弧按历史版本 1 提交，不包含关系字段。'
        : '当前没有关系。常规开局按版本 2 提交，关系列表为空数组。');
      return lines;
    }
    lines.push(fixed
      ? '已填写关系，将按版本 2 与当前起点一起校验，不会删掉关系来迁就版本 1。'
      : '常规开局按版本 2 提交下列关系。');
    if (!probe.ok) lines.push(`共享规则尚未通过：${probe.message} 输入保留，不会自动截断或改正。`);
    relationshipDrafts.forEach((entry, index) => {
      const people = entry.actorIds.map(actorToken).join('、') || '尚未选择当事人';
      const acquainted = entry.acquainted === true ? '相识 true' : '相识 false';
      const audience = entry.audienceMode === 'manual'
        ? `手动受众 ${entry.knownBy.length ? entry.knownBy.map(actorToken).join('、') : '[]'}`
        : '默认受众（不写 knownBy）';
      const normalized = probe.ok ? probe.relationships?.[index] : null;
      let effect = '';
      if (normalized) {
        effect = entry.audienceMode === 'manual'
          ? ` 生效 knownBy：${normalized.knownBy.length ? normalized.knownBy.join('、') : '[]'}；相识 ${normalized.acquainted === true ? 'true' : 'false'}。`
          : ` 生效时规则将 knownBy 设为 ${normalized.knownBy.join('、')}；相识 ${normalized.acquainted === true ? 'true' : 'false'}。`;
        effect += normalized.text === entry.text ? ' 正文按输入原样提交。' : ' 输入框保留原文，规范后的正文见下一段。';
      }
      lines.push(`第 ${index + 1} 条：${people}。${acquainted}。${audience}。原始 ${entry.text.length} 个 UTF-16 码元。${effect}`);
      if (normalized && normalized.text !== entry.text) lines.push(`第 ${index + 1} 条规范后正文：${normalized.text}`);
    });
    return lines;
  }
  function syncChoices(box, entry, kind) {
    const selected = kind === 'actors' ? entry.actorIds : entry.knownBy;
    const ids = listedIds(selected);
    const current = [];
    for (const label of box.children) current.push(choiceInput(label)?.value);
    if (current.length !== ids.length || ids.some((id, index) => id !== current[index])) {
      box.replaceChildren(...ids.map(id => createChoice(entry.key, kind, id, selected.includes(id))));
    }
    const manualLock = kind === 'known' && entry.audienceMode !== 'manual';
    for (const label of box.children) {
      const input = choiceInput(label);
      const caption = choiceCaption(label);
      if (!input) continue;
      input.checked = selected.includes(input.value);
      input.disabled = blocked() || manualLock;
      label.hidden = false;
      const activeChoice = kind === 'actors' || entry.audienceMode === 'manual';
      input.setAttribute('aria-invalid', String(activeChoice && selected.includes(input.value) && !actorAllowed(input.value)));
      if (caption) caption.textContent = actorLabel(input.value);
    }
  }
  function createChoice(key, kind, id, checked) {
    const inputId = `pc-rel-${key}-${kind}-${id}`;
    const label = node('label', undefined, 'pc-actor-card');
    label.htmlFor = inputId;
    const input = node('input');
    input.type = 'checkbox'; input.id = inputId; input.value = id; input.checked = checked === true;
    const caption = node('span', actorLabel(id), 'pc-actor-card-name');
    label.append(input, caption);
    const commit = () => {
      if (blocked()) return;
      const current = relationshipDrafts.find(item => item.key === key);
      if (!current || (kind === 'known' && current.audienceMode !== 'manual')) return;
      const next = toggleId(kind === 'actors' ? current.actorIds : current.knownBy, id, input.checked === true);
      if (kind === 'actors') current.actorIds = next;
      else { current.knownBy = next; current.manualInitialized = true; }
    };
    input.addEventListener('input', commit);
    input.addEventListener('change', commit);
    return label;
  }
  function staleWarning(entry) {
    const stale = activeStaleIds(entry);
    return stale.length ? `失效标识仍保留：${stale.join('、')}。正文、选择、相识和受众都没有改写；此状态下不能提交。` : '';
  }
  function renderRelationships() {
    if (!relationshipList) return;
    const keepErrors = relationshipErrorSignature !== null && relationshipErrorSignature === signature();
    if (!keepErrors) {
      relationshipErrorSignature = null;
      clearRelationshipMarks();
    }
    if (relationshipCount) relationshipCount.textContent = `${relationshipDrafts.length} / 16 条`;
    if (relationshipAdd) relationshipAdd.disabled = blocked();
    relationshipDrafts.forEach((entry, index) => {
      const nodes = relationshipNodes.get(entry.key);
      if (!nodes) return;
      nodes.title.textContent = `第 ${index + 1} 条初始关系`;
      nodes.textCount.textContent = `原始 ${entry.text.length} / 1600`;
      nodes.remove.disabled = blocked();
      nodes.text.disabled = blocked();
      nodes.actorsField.disabled = blocked();
      syncChoices(nodes.actorBox, entry, 'actors');
      nodes.acquaintedTrue.checked = entry.acquainted === true;
      nodes.acquaintedFalse.checked = entry.acquainted === false;
      nodes.acquaintedTrue.disabled = blocked();
      nodes.acquaintedFalse.disabled = blocked();
      nodes.acquaintedField.disabled = blocked();
      nodes.audienceDefault.checked = entry.audienceMode !== 'manual';
      nodes.audienceManual.checked = entry.audienceMode === 'manual';
      nodes.audienceDefault.disabled = blocked();
      nodes.audienceManual.disabled = blocked();
      nodes.audienceField.disabled = blocked();
      nodes.knownField.disabled = blocked() || entry.audienceMode !== 'manual';
      syncChoices(nodes.knownBox, entry, 'known');
      const warning = staleWarning(entry);
      if (nodes.warning.textContent !== warning) nodes.warning.textContent = warning;
    });
    const probe = relationshipProbe();
    const serious = seriousRelationshipMessage(probe);
    if (relationshipWarning && relationshipWarning.textContent !== serious) relationshipWarning.textContent = serious;
    if (relationshipSummary) relationshipSummary.replaceChildren(...summaryLines(probe).map(line => node('p', line, 'pc-help')));
  }
  function buildRelationshipEntry(entry) {
    const article = node('section', undefined, 'pc-section');
    article.id = `pc-rel-${entry.key}`;
    const heading = node('div', undefined, 'pc-section-heading');
    const title = node('h4', '初始关系');
    title.id = `pc-rel-${entry.key}-title`;
    const remove = node('button', '删除这条关系', 'pc-danger');
    remove.type = 'button'; remove.id = `pc-rel-${entry.key}-remove`;
    heading.append(title, remove);
    article.setAttribute('aria-labelledby', title.id);
    const actorsField = node('fieldset', undefined, 'pc-choice');
    actorsField.id = `pc-rel-${entry.key}-actors`;
    const actorsLegend = node('legend', '当事人');
    const actorBox = node('div', undefined, 'pc-actors');
    const actorsHelp = node('p', '至少选择两位。自定义玩家的标识固定为 player，原作使用各自的标识。切换身份或目录后，失效标识会留在草稿里并阻止提交，不会被删掉或改掉。床位替换也不会从名单里去掉被替换的人。', 'pc-help');
    actorsHelp.id = `pc-rel-${entry.key}-actors-help`;
    actorsField.append(actorsLegend, actorBox, actorsHelp);
    const textLabel = node('label', '关系正文', 'pc-field');
    const textId = `pc-rel-${entry.key}-text`;
    textLabel.htmlFor = textId;
    const textCount = node('span', '原始 0 / 1600');
    const textarea = node('textarea');
    textarea.id = textId; textarea.rows = 4; textarea.value = entry.text; textarea.placeholder = '手写这段关系的完整经过。';
    const textHelp = node('small', '完整正文按原始 UTF-16 长度计。单项超过 1600、或全部规范后合计超过 12800，都会被拒绝；输入框不会自动删节。');
    textHelp.id = `pc-rel-${entry.key}-text-help`;
    textLabel.append(textCount, textarea, textHelp);
    const acquaintedField = node('fieldset', undefined, 'pc-choice');
    acquaintedField.id = `pc-rel-${entry.key}-acquainted`;
    const acquaintedLegend = node('legend', '是否相识');
    const acquaintedSegments = node('div', undefined, 'pc-segments');
    const acquaintedName = `pc-rel-${entry.key}-acquainted-value`;
    const acquaintedHelp = node('p', '选择不相识时会提交布尔值 false，不会在收集时被省略。', 'pc-help');
    acquaintedHelp.id = `pc-rel-${entry.key}-acquainted-help`;
    function addRadio(group, name, value, label) {
      const id = `${name}-${value}`;
      const wrap = node('label'); wrap.htmlFor = id;
      const input = node('input');
      input.type = 'radio'; input.name = name; input.id = id; input.value = value;
      wrap.append(input, node('span', label));
      group.append(wrap);
      return input;
    }
    const acquaintedTrue = addRadio(acquaintedSegments, acquaintedName, 'true', '相识');
    const acquaintedFalse = addRadio(acquaintedSegments, acquaintedName, 'false', '不相识');
    acquaintedTrue.checked = entry.acquainted === true;
    acquaintedFalse.checked = entry.acquainted === false;
    acquaintedField.append(acquaintedLegend, acquaintedSegments, acquaintedHelp);
    const audienceField = node('fieldset', undefined, 'pc-choice');
    audienceField.id = `pc-rel-${entry.key}-audience`;
    const audienceLegend = node('legend', '正文受众');
    const audienceSegments = node('div', undefined, 'pc-segments');
    const audienceName = `pc-rel-${entry.key}-audience-value`;
    const audienceHelp = node('p', '默认受众不写 knownBy，随当事人交给共享规则。手动受众即使一个人都不选，也会提交空数组；重新绘制或收集时不会变回默认。', 'pc-help');
    audienceHelp.id = `pc-rel-${entry.key}-audience-help`;
    const audienceDefault = addRadio(audienceSegments, audienceName, 'default', '默认受众（随当事人）');
    const audienceManual = addRadio(audienceSegments, audienceName, 'manual', '手动受众');
    audienceDefault.checked = entry.audienceMode !== 'manual';
    audienceManual.checked = entry.audienceMode === 'manual';
    audienceField.append(audienceLegend, audienceSegments, audienceHelp);
    const knownField = node('fieldset', undefined, 'pc-choice');
    knownField.id = `pc-rel-${entry.key}-known`;
    const knownLegend = node('legend', '手动受众名单');
    const knownBox = node('div', undefined, 'pc-actors');
    const knownHelp = node('p', '只在选择手动受众后可以修改。清空表示无人获得这段正文，空数组会被原样保留。', 'pc-help');
    knownHelp.id = `pc-rel-${entry.key}-known-help`;
    knownField.append(knownLegend, knownBox, knownHelp);
    const warning = node('p', '', 'pc-help');
    warning.id = `pc-rel-${entry.key}-warning`; warning.setAttribute('role', 'status'); warning.setAttribute('aria-live', 'polite');
    const error = node('p', '', 'pc-help');
    error.id = `pc-rel-${entry.key}-error`; error.setAttribute('role', 'status'); error.setAttribute('aria-live', 'polite');
    const described = `${actorsHelp.id} ${warning.id} ${error.id}`;
    actorsField.setAttribute('aria-describedby', described);
    textarea.setAttribute('aria-describedby', `${textHelp.id} ${warning.id} ${error.id}`);
    acquaintedField.setAttribute('aria-describedby', `${acquaintedHelp.id} ${error.id}`);
    audienceField.setAttribute('aria-describedby', `${audienceHelp.id} ${error.id}`);
    knownField.setAttribute('aria-describedby', `${knownHelp.id} ${warning.id} ${error.id}`);
    article.append(heading, actorsField, textLabel, acquaintedField, audienceField, knownField, warning, error);
    const nodes = {
      article, title, remove, text: textarea, textCount, actorsField, actorBox, acquaintedField, acquaintedTrue, acquaintedFalse,
      audienceField, audienceDefault, audienceManual, knownField, knownBox, warning, error,
    };
    relationshipNodes.set(entry.key, nodes);
    const commitText = () => {
      if (blocked()) return;
      const current = relationshipDrafts.find(item => item.key === entry.key);
      if (current) current.text = textarea.value;
    };
    textarea.addEventListener('input', commitText);
    textarea.addEventListener('change', commitText);
    const commitAcquainted = input => {
      if (blocked() || input.checked !== true) return;
      const current = relationshipDrafts.find(item => item.key === entry.key);
      if (current) current.acquainted = input.value === 'true';
    };
    acquaintedTrue.addEventListener('input', () => commitAcquainted(acquaintedTrue));
    acquaintedTrue.addEventListener('change', () => commitAcquainted(acquaintedTrue));
    acquaintedFalse.addEventListener('input', () => commitAcquainted(acquaintedFalse));
    acquaintedFalse.addEventListener('change', () => commitAcquainted(acquaintedFalse));
    const commitAudience = input => {
      if (blocked() || input.checked !== true) return;
      const current = relationshipDrafts.find(item => item.key === entry.key);
      if (!current) return;
      if (input.value === 'manual') {
        if (current.audienceMode !== 'manual' && !current.manualInitialized) {
          current.knownBy = current.actorIds.slice();
          current.manualInitialized = true;
        }
        current.audienceMode = 'manual';
      } else current.audienceMode = 'default';
    };
    audienceDefault.addEventListener('input', () => commitAudience(audienceDefault));
    audienceDefault.addEventListener('change', () => commitAudience(audienceDefault));
    audienceManual.addEventListener('input', () => commitAudience(audienceManual));
    audienceManual.addEventListener('change', () => commitAudience(audienceManual));
    remove.addEventListener('click', () => {
      if (blocked() || remove.disabled) return;
      const active = doc.activeElement;
      const move = active && typeof article.contains === 'function' && article.contains(active);
      const index = relationshipDrafts.findIndex(item => item.key === entry.key);
      if (index < 0) return;
      relationshipDrafts.splice(index, 1);
      relationshipNodes.delete(entry.key);
      relationshipList.replaceChildren(...relationshipDrafts.map(item => relationshipNodes.get(item.key).article));
      invalidate();
      refresh();
      if (move && dialog.open && typeof relationshipAdd.focus === 'function') relationshipAdd.focus({ preventScroll: true });
    });
    return article;
  }
  function placeRelationshipSection(section) {
    const form = $('pc-form');
    const opening = $('pc-opening-inputs');
    const host = opening && opening.parentElement && opening.parentElement !== form ? opening.parentElement : null;
    if (host && host.parentElement === form && typeof host.after === 'function') host.after(section);
    else form.append(section);
  }
  function mountRelationshipSection() {
    if (relationshipList) return;
    const section = node('section', undefined, 'pc-section');
    section.id = 'pc-relationships';
    section.setAttribute('aria-labelledby', 'pc-relationships-title');
    const heading = node('div', undefined, 'pc-section-heading');
    const title = node('h3', '初始关系');
    title.id = 'pc-relationships-title';
    relationshipCount = node('span', '0 / 16 条');
    relationshipCount.id = 'pc-relationship-count';
    heading.append(title, relationshipCount);
    const help = node('p', '只用于新开的一局。可手写，或手动请求独立关系助手；候选须明确采用。不会自动保存、创建游戏，或发给角色与开场补全。', 'pc-help');
    help.id = 'pc-relationships-help';
    relationshipWarning = node('p', '', 'pc-help');
    relationshipWarning.id = 'pc-relationships-warning';
    relationshipWarning.setAttribute('role', 'status');
    relationshipWarning.setAttribute('aria-live', 'polite');
    relationshipError = node('p', '', 'pc-help');
    relationshipError.id = 'pc-relationships-error';
    relationshipError.tabIndex = -1;
    relationshipError.setAttribute('tabindex', '-1');
    relationshipError.setAttribute('role', 'alert');
    relationshipList = node('div');
    relationshipList.id = 'pc-relationship-list';
    const actions = node('div', undefined, 'pc-actions');
    relationshipAdd = node('button', '添加一条初始关系');
    relationshipAdd.type = 'button';
    relationshipAdd.id = 'pc-relationship-add';
    relationshipAdd.setAttribute('aria-describedby', help.id);
    actions.append(relationshipAdd);
    const summary = node('div');
    summary.id = 'pc-relationship-summary';
    summary.setAttribute('aria-labelledby', 'pc-relationship-summary-title');
    const summaryTitle = node('h4', '采用前生效摘要');
    summaryTitle.id = 'pc-relationship-summary-title';
    relationshipSummary = node('div');
    relationshipSummary.id = 'pc-relationship-summary-body';
    summary.append(summaryTitle, relationshipSummary);
    section.append(heading, help, relationshipWarning, relationshipError, relationshipList, actions, summary);
    placeRelationshipSection(section);
    mountRelationshipAssistant(section);
    relationshipAdd.addEventListener('click', () => {
      if (blocked() || relationshipAdd.disabled) return;
      const entry = blankRelationship();
      relationshipDrafts.push(entry);
      relationshipList.append(buildRelationshipEntry(entry));
      invalidate();
      refresh();
      const field = relationshipNodes.get(entry.key)?.text;
      if (dialog.open && field && typeof field.focus === 'function') {
        field.focus({ preventScroll: true });
        if (typeof field.scrollIntoView === 'function') field.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
    });
  }

  function relationshipRequest() {
    const values = profileValues();
    const fields = ['name', 'concept', 'appearance', 'personality', 'background', 'desire'];
    const character = mode() === 'custom' ? {
      ...Object.fromEntries(fields.map(key => [key, values[key]])),
      ...($('pc-character-age').value.trim() ? { age: values.age } : {}),
    } : null;
    return normalizeRelationshipAuthoringInput({ kind: 'relationships', draft: {
      playerMode: mode(), actorId: mode() === 'custom' ? 'player' : actorId, loop: loop(), character,
      opening: openingEnabled() ? opening() : null, relationships: relationshipRecords(),
      ...(scenarioId() ? { scenarioId: scenarioId() } : {}), ...(storyArcId() ? { storyArcId: storyArcId() } : {}),
    }, instruction: relationshipInstruction.value });
  }
  async function authorDigest(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  const currentRelationshipGuard = guard => dialog.open && example() === 'agent'
    && guard.revision === revision && guard.signature === signature() && guard.token === relationshipRequestToken;
  function candidateRecords(candidate) {
    return candidate.rows.map(row => ({ actorIds: row.actorIds.slice(), text: row.nodes?.text.value ?? row.text,
      acquainted: row.acquainted, ...(row.audienceMode === 'default' ? {} : { knownBy: row.knownBy.slice() }) }));
  }
  function candidateRow(entry) {
    return { key: `c${++relationshipCandidateSeed}`, actorIds: entry.actorIds.slice(), text: entry.text,
      acquainted: entry.acquainted, knownBy: entry.knownBy.slice(), audienceMode: 'manual' };
  }
  function focusRelationshipTarget(target) {
    if (!dialog.open || !target || typeof target.focus !== 'function') return;
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
  }
  function validateRelationshipCandidate() {
    const candidate = relationshipCandidate;
    if (!candidate) return null;
    let normalized = null, message = '';
    try { normalized = normalizeRelationshipCandidate({ kind: 'relationships', entries: candidateRecords(candidate) }, candidate.request); }
    catch (error) { message = safeError(error); }
    candidate.error = message;
    relationshipCandidateError.replaceChildren();
    if (message) relationshipCandidateError.append(node('span', `${message} 编辑仍保留；请检查下列候选字段。`));
    candidate.rows.forEach(row => {
      const nodes = row.nodes; if (!nodes) return;
      nodes.error.textContent = '';
      nodes.text.setAttribute('aria-invalid', 'false'); nodes.actors.setAttribute('aria-invalid', 'false');
      nodes.known.disabled = blocked() || row.audienceMode === 'default';
      try { normalizeRelationshipEntries([candidateRecords({ rows: [row] })[0]], candidate.request.draft.playerMode); }
      catch (error) {
        nodes.error.textContent = safeError(error);
        nodes.text.setAttribute('aria-invalid', 'true'); nodes.actors.setAttribute('aria-invalid', 'true');
        const link = node('a', ` 第 ${candidate.rows.indexOf(row) + 1} 条：${safeError(error)}`);
        link.href = `#${nodes.text.id}`;
        link.addEventListener('click', () => focusRelationshipTarget(nodes.text));
        relationshipCandidateError.append(link);
      }
    });
    const previous = candidate.request.draft.relationships, entries = normalized?.entries;
    const changed = entries ? entries.filter((entry, index) => index < previous.length && JSON.stringify(entry) !== JSON.stringify(previous[index])).length : 0;
    relationshipCandidateSummary.textContent = candidate.stale || !currentRelationshipGuard(candidate)
      ? '基础稿、窗口或请求版本已变化。候选编辑保留，但已过期，不能采用，也不会重新绑定到新稿。'
      : entries ? entries.length === 0
        ? `明确空候选：将清空当前 ${previous.length} 条关系，只有点击清空采用才生效。`
        : `完整替换提案：${entries.length} 条；按顺序比较，新增 ${Math.max(0, entries.length - previous.length)}、修改 ${changed}、移除 ${Math.max(0, previous.length - entries.length)} 条。尚未采用。`
        : '候选编辑未通过共享规则；原稿未改变，不能采用。';
    relationshipCandidateApply.textContent = entries?.length === 0 ? `清空当前 ${previous.length} 条关系并采用` : '采用这份完整关系列表';
    relationshipCandidateApply.disabled = blocked() || !normalized || candidate.stale || !currentRelationshipGuard(candidate);
    relationshipCandidateAdd.disabled = blocked() || candidate.rows.length >= 16;
    return normalized;
  }
  function renderRelationshipCandidateRows() {
    const candidate = relationshipCandidate; if (!candidate) return;
    relationshipCandidateList.replaceChildren();
    const allowed = relationshipActorIds(candidate.request.draft.playerMode);
    const label = id => id === 'player' ? candidate.request.draft.character?.name || '自定义玩家 player' : actorLabel(id);
    candidate.rows.forEach((row, index) => {
      const section = node('section', undefined, 'pc-section'); section.id = `pc-relationship-candidate-${row.key}`;
      const heading = node('div', undefined, 'pc-section-heading');
      const title = node('h4', `候选第 ${index + 1} 条`); title.id = `${section.id}-title`; section.setAttribute('aria-labelledby', title.id);
      const remove = node('button', '移除候选这条', 'pc-danger'); remove.type = 'button';
      remove.addEventListener('click', () => {
        if (blocked() || relationshipCandidate !== candidate) return;
        const index = candidate.rows.indexOf(row); if (index < 0) return;
        candidate.rows.splice(index, 1); renderRelationshipCandidateRows(); validateRelationshipCandidate();
        focusRelationshipTarget(relationshipCandidateAdd);
      });
      heading.append(title, remove);
      const makePeople = (kind, selected) => {
        const field = node('fieldset', undefined, 'pc-choice'); const legend = node('legend', kind === 'actor' ? '候选当事人（至少两位）' : '候选明确知情受众（允许全部不选）');
        field.append(legend); const box = node('div', undefined, 'pc-actors'); field.append(box);
        for (const id of allowed) {
          const wrap = node('label', undefined, 'pc-actor-card'), input = node('input'); input.type = 'checkbox';
          input.id = `${section.id}-${kind}-${id}`; input.value = id; wrap.htmlFor = input.id; input.checked = selected.includes(id);
          input.addEventListener('change', () => {
            if (relationshipCandidate !== candidate) return;
            if (kind === 'actor') row.actorIds = toggleId(row.actorIds, id, input.checked);
            else row.knownBy = toggleId(row.knownBy, id, input.checked);
            validateRelationshipCandidate();
          });
          wrap.append(input, node('span', label(id), 'pc-actor-card-name')); box.append(wrap);
        }
        return field;
      };
      const actors = makePeople('actor', row.actorIds), known = makePeople('known', row.knownBy);
      const textLabel = node('label', '候选关系正文（不截断，最多 1600 UTF-16 码元）', 'pc-field');
      const text = node('textarea'); text.id = `${section.id}-text`; text.rows = 4; text.value = row.text; textLabel.htmlFor = text.id; textLabel.append(text);
      text.addEventListener('input', () => { row.text = text.value; validateRelationshipCandidate(); });
      const acquaintedLabel = node('label', '候选相识状态', 'pc-field'), acquainted = node('select');
      acquainted.id = `${section.id}-acquainted`; acquaintedLabel.htmlFor = acquainted.id;
      for (const [value, caption] of [['true', '相识 true'], ['false', '不相识 false']]) { const option = node('option', caption); option.value = value; acquainted.append(option); }
      acquainted.value = String(row.acquainted); acquaintedLabel.append(acquainted);
      acquainted.addEventListener('change', () => { row.acquainted = acquainted.value === 'true' ? true : acquainted.value === 'false' ? false : null; validateRelationshipCandidate(); });
      const audienceLabel = node('label', '候选正文受众', 'pc-field'), audience = node('select'); audience.id = `${section.id}-audience`; audienceLabel.htmlFor = audience.id;
      for (const [value, caption] of [['manual', '明确受众（保留空数组）'], ['default', '默认受众：当事人']]) { const option = node('option', caption); option.value = value; audience.append(option); }
      audience.value = row.audienceMode; audienceLabel.append(audience);
      audience.addEventListener('change', () => { row.audienceMode = audience.value; validateRelationshipCandidate(); });
      const error = node('p', '', 'pc-help'); error.id = `${section.id}-error`; error.setAttribute('role', 'alert');
      text.setAttribute('aria-describedby', error.id); actors.setAttribute('aria-describedby', error.id);
      row.nodes = { text, actors, known, error };
      section.append(heading, actors, textLabel, acquaintedLabel, audienceLabel, known, error); relationshipCandidateList.append(section);
    });
  }
  function renderRelationshipAssistant() {
    if (!relationshipAssistant) return;
    relationshipAssistant.setAttribute('aria-busy', String(working));
    relationshipInstruction.disabled = blocked();
    relationshipGenerate.disabled = blocked() || !catalog || fixedStartSelected();
    relationshipCandidatePanel.hidden = relationshipCandidate === null;
    if (relationshipCandidate) validateRelationshipCandidate();
  }
  async function completeRelationships() {
    if (blocked() || !catalog || !dialog.open || example() !== 'agent') return;
    const payload = relationshipRequest(); // All unfinished relationship rows block BEFORE HTTP.
    const guard = { revision, signature: signature(), token: ++relationshipRequestToken };
    if (relationshipCandidate) relationshipCandidate.stale = true;
    relationshipAssistantStatus.textContent = '正在生成一次关系候选；现有原稿与候选编辑均保留，不自动重试。';
    const staleResult = () => {
      if (guard.token !== relationshipRequestToken) return;
      relationshipAssistantStatus.textContent = '这次请求对应的草稿或窗口版本已变化，结果不再采用；原稿与候选编辑保留。';
      status(relationshipAssistantStatus.textContent);
    };
    await run(async () => {
      const [draftHash, policyFingerprint] = await Promise.all([authorDigest(payload), authorDigest(RELATIONSHIP_AUTHORING_POLICY)]);
      if (!currentRelationshipGuard(guard)) { staleResult(); return; }
      let timer;
      try {
        const result = await Promise.race([request('/api/creation/complete', payload), new Promise((_, reject) => {
          timer = setTimeout(() => reject(problem('关系助手等待已超时；原稿与候选编辑保留。没有自动重试，也不据此声称远端已经停止。')), RELATIONSHIP_AUTHORING_LIMITS.browserMs);
        })]);
        if (!currentRelationshipGuard(guard)) { staleResult(); return; }
        const candidate = normalizeRelationshipAuthoringResponse(result, payload, { kind: 'creation-draft', contractVersion: 2, draftHash, policyFingerprint });
        relationshipCandidate = { ...guard, request: payload, source: candidate.source, rows: candidate.entries.map(candidateRow), stale: false, error: '' };
        renderRelationshipCandidateRows(); validateRelationshipCandidate();
        relationshipAssistantStatus.textContent = '关系候选已生成，尚未采用；可编辑、丢弃或明确采用完整替换列表。';
        status('关系候选已生成；基础稿、人物、加点、预设与游戏进度均未修改。');
      } catch (error) {
        if (currentRelationshipGuard(guard)) { relationshipAssistantStatus.textContent = `${safeError(error)} 原稿与已有候选编辑保留，没有自动重试。`; status(relationshipAssistantStatus.textContent, true); }
      } finally { clearTimeout(timer); }
    }, '独立关系助手正在生成一次候选；不自动重试，不自动采用或保存。');
  }
  async function applyRelationshipCandidate() {
    const candidate = relationshipCandidate; if (blocked() || !candidate) return;
    const selected = validateRelationshipCandidate();
    if (!selected || candidate.stale || !currentRelationshipGuard(candidate)) {
      if (candidate.stale || !currentRelationshipGuard(candidate)) relationshipCandidateError.textContent = '基础稿或窗口版本已变化；候选编辑保留，不能采用。';
      focusRelationshipTarget(relationshipCandidateError); return;
    }
    const edit = JSON.stringify(candidateRecords(candidate));
    const input = relationshipRequest();
    const [draftHash, policyFingerprint] = await Promise.all([authorDigest(input), authorDigest(RELATIONSHIP_AUTHORING_POLICY)]);
    if (relationshipCandidate !== candidate || !currentRelationshipGuard(candidate)) {
      candidate.stale = true; renderRelationshipAssistant(); return;
    }
    if (edit !== JSON.stringify(candidateRecords(candidate))) {
      validateRelationshipCandidate();
      relationshipAssistantStatus.textContent = '候选在核验期间有新的本地编辑；尚未采用，请核对后再次明确采用。';
      status(relationshipAssistantStatus.textContent); return;
    }
    normalizeRelationshipAuthoringResponse({ kind: 'relationships', source: candidate.source, entries: selected.entries }, input, { kind: 'creation-draft', contractVersion: 2, draftHash, policyFingerprint });
    // Only this explicit Apply replaces the manual relationship draft. Canonical
    // knownBy is an explicit manual value; [] must not turn into default audience.
    relationshipDrafts.splice(0); relationshipNodes.clear(); relationshipList.replaceChildren();
    for (const entry of selected.entries) {
      const draft = { ...blankRelationship(), actorIds: entry.actorIds.slice(), text: entry.text,
        acquainted: entry.acquainted, audienceMode: 'manual', knownBy: entry.knownBy.slice(), manualInitialized: true };
      relationshipDrafts.push(draft); relationshipList.append(buildRelationshipEntry(draft));
    }
    relationshipCandidate = null; relationshipCandidateList.replaceChildren(); invalidate(); refresh();
    relationshipAssistantStatus.textContent = '已明确采用关系草稿；没有保存预设、创建游戏或修改其他草稿。';
    status(relationshipAssistantStatus.textContent);
    focusRelationshipTarget(relationshipDrafts.length ? relationshipNodes.get(relationshipDrafts[0].key)?.text : relationshipAdd);
  }
  function mountRelationshipAssistant(section) {
    relationshipAssistant = node('section', undefined, 'pc-section'); relationshipAssistant.id = 'pc-relationship-assistant';
    relationshipAssistant.setAttribute('aria-labelledby', 'pc-relationship-assistant-title');
    const title = node('h4', '独立关系助手 · 候选须明确采用'); title.id = 'pc-relationship-assistant-title';
    const help = node('p', '独立 setup_assistant 显式分配 → 通用默认；不使用角色创建、对白或数据整理。仅发送公开部分人物稿、开场、关系稿和要求。姓名、点数未完成也可请求；未完成关系行需先修正。', 'pc-help');
    const label = node('label', '关系创作要求（可留空，最多 1000 字）', 'pc-field'); relationshipInstruction = node('textarea'); relationshipInstruction.id = 'pc-relationship-instruction'; relationshipInstruction.rows = 2; label.htmlFor = relationshipInstruction.id; label.append(relationshipInstruction);
    relationshipGenerate = node('button', '生成一次关系候选'); relationshipGenerate.type = 'button'; relationshipGenerate.id = 'pc-relationship-generate';
    relationshipAssistantStatus = node('p', '只生成一次候选，不自动重试；仍可完全手写。', 'pc-help'); relationshipAssistantStatus.id = 'pc-relationship-assistant-status'; relationshipAssistantStatus.setAttribute('role', 'status'); relationshipAssistantStatus.setAttribute('aria-live', 'polite'); relationshipAssistantStatus.setAttribute('style', 'min-height:3em');
    relationshipGenerate.addEventListener('click', async () => {
      try { await completeRelationships(); }
      catch (error) {
        relationshipAssistantStatus.textContent = safeError(error); status(safeError(error), true);
        const probe = relationshipProbe(); if (!probe.ok) markRelationshipErrors(safeError(error), probe.message);
      }
      refresh();
    });
    relationshipCandidatePanel = node('section', undefined, 'pc-preview'); relationshipCandidatePanel.id = 'pc-relationship-candidate'; relationshipCandidatePanel.hidden = true;
    const heading = node('h4', '完整候选预览与局部编辑（未采用）'); heading.id = 'pc-relationship-candidate-title'; relationshipCandidatePanel.setAttribute('aria-labelledby', heading.id);
    relationshipCandidateSummary = node('p', '', 'pc-help'); relationshipCandidateSummary.setAttribute('role', 'status');
    relationshipCandidateError = node('p', '', 'pc-help'); relationshipCandidateError.id = 'pc-relationship-candidate-error'; relationshipCandidateError.tabIndex = -1; relationshipCandidateError.setAttribute('role', 'alert');
    relationshipCandidateList = node('div'); relationshipCandidateList.id = 'pc-relationship-candidate-list';
    const actions = node('div', undefined, 'pc-actions'); relationshipCandidateAdd = node('button', '添加候选条目'); relationshipCandidateAdd.type = 'button'; relationshipCandidateAdd.id = 'pc-relationship-candidate-add';
    relationshipCandidateAdd.addEventListener('click', () => {
      if (blocked() || !relationshipCandidate || relationshipCandidate.rows.length >= 16) return;
      relationshipCandidate.rows.push(candidateRow({ actorIds: [], text: '', acquainted: true, knownBy: [] })); renderRelationshipCandidateRows(); validateRelationshipCandidate();
      focusRelationshipTarget(relationshipCandidate.rows.at(-1).nodes.text);
    });
    relationshipCandidateApply = node('button', '采用这份完整关系列表', 'pc-primary'); relationshipCandidateApply.type = 'button'; relationshipCandidateApply.id = 'pc-relationship-candidate-apply';
    relationshipCandidateApply.addEventListener('click', async () => { try { await applyRelationshipCandidate(); } catch (error) { status(safeError(error), true); relationshipCandidateError.textContent = safeError(error); focusRelationshipTarget(relationshipCandidateError); } });
    const reject = node('button', '丢弃候选，保留原稿'); reject.type = 'button'; reject.id = 'pc-relationship-candidate-reject';
    reject.addEventListener('click', () => { if (blocked()) return; relationshipCandidate = null; relationshipCandidateList.replaceChildren(); renderRelationshipAssistant(); relationshipAssistantStatus.textContent = '已丢弃候选；基础关系稿与其他输入保持不变。'; focusRelationshipTarget(relationshipGenerate); });
    actions.append(relationshipCandidateAdd, relationshipCandidateApply, reject);
    relationshipCandidatePanel.append(heading, relationshipCandidateSummary, relationshipCandidateError, relationshipCandidateList, actions);
    relationshipAssistant.append(title, help, label, relationshipGenerate, relationshipAssistantStatus, relationshipCandidatePanel); section.append(relationshipAssistant);
  }

  function signature() {
    // Avatar bytes are guarded locally only, never sent to the authoring API.
    // Relationship rows stay in this signature so edits expire old proposals.
    return JSON.stringify({ example: example(), mode: mode(), loop: loop(), scenarioId: scenarioId(), storyArcId: storyArcId(), actorId, profile: profileValues(), attributeMode,
      scores: currentScores(), opening: { text: $('pc-opening-text').value, locationId: $('pc-opening-location')?.value || currentCellLocation() },
      avatar: getAvatar() || null, enabled: $('pc-opening-enabled').checked, characterInstruction: $('pc-character-instruction').value,
      openingInstruction: $('pc-opening-instruction').value, characterPreset: $('pc-character-preset').value,
      openingPreset: $('pc-opening-preset').value, characterPresetName: $('pc-character-preset-name').value,
      openingPresetName: $('pc-opening-preset-name').value, openingId: $('pc-card-opening')?.value || 'auto', cellReplace: selectedCellReplace(),
      relationships: relationshipSnapshot(), relationshipInstruction: relationshipInstruction?.value || '' });
  }
  function saveOpeningDraft() {
    openingDrafts[activeLoop] = { text: $('pc-opening-text').value, locationId: $('pc-opening-location')?.value || currentCellLocation(),
      enabled: $('pc-opening-enabled').checked, presetId: $('pc-opening-preset').value,
      presetName: $('pc-opening-preset-name').value, instruction: $('pc-opening-instruction').value, openingId: $('pc-card-opening')?.value || 'auto',
      cellReplace: selectedCellReplace() };
  }
  function restoreOpeningDraft(nextLoop) {
    const draft = openingDrafts[nextLoop];
    $('pc-opening-text').value = draft.text;
    if ($('pc-opening-location')) $('pc-opening-location').value = draft.locationId;
    $('pc-opening-enabled').checked = draft.enabled;
    $('pc-opening-preset-name').value = draft.presetName; $('pc-opening-instruction').value = draft.instruction;
    if ($('pc-card-opening')) $('pc-card-opening').value = draft.openingId;
    if ($('pc-cell-replace')) $('pc-cell-replace').value = draft.cellReplace || '';
    renderPresets('opening', draft.presetId);
  }
  const cellReplaceLabel = node('label', '同房床位');
  cellReplaceLabel.className = 'pc-field pc-cell-replace-field';
  cellReplaceLabel.htmlFor = 'pc-cell-replace';
  const cellReplaceSelect = node('select');
  cellReplaceSelect.id = 'pc-cell-replace';
  const cellReplaceHelp = node('small', '默认住八号牢房；也可以替换一间双人牢房中的原作床位，成为另一位少女的新室友。名字、身体与记忆不会交换。');
  cellReplaceLabel.append(cellReplaceSelect, cellReplaceHelp);
  const locationField = $('pc-opening-location')?.parentElement;
  $('pc-opening-inputs')?.append(cellReplaceLabel);
  function renderCellReplacements() {
    const select = $('pc-cell-replace');
    if (!select) return;
    const selected = select.value;
    const defaultOption = node('option', '八号牢房（默认，不替换）'); defaultOption.value = '';
    const options = CELL_REPLACEMENTS.map(choice => {
      const actor = catalog?.actors?.find(item => item.id === choice.actorId);
      const roommate = Object.entries(CANONICAL_CELLS).find(([id, value]) => id !== choice.actorId && value.cell === choice.cell);
      const roommateActor = catalog?.actors?.find(item => item.id === roommate?.[0]);
      const option = node('option', `替换${actor?.name || choice.actorId}的${choice.bunk}（与${roommateActor?.name || roommate?.[0] || '室友'}同室）`);
      option.value = choice.actorId;
      return option;
    });
    select.replaceChildren(defaultOption, ...options);
    select.value = options.some(option => option.value === selected) ? selected : '';
  }
  function renderPresets(kind, selected = $(`pc-${kind}-preset`).value) {
    const select = $(`pc-${kind}-preset`);
    const items = kind === 'character' ? presets.characters : presets.openings.filter(preset => preset.loop === loop());
    const placeholder = node('option', kind === 'character' ? '选择一份角色预设' : `选择${LOOP_LABELS[loop()]}的开场预设`);
    placeholder.value = '';
    select.replaceChildren(placeholder);
    for (const preset of items) {
      const option = node('option', `${preset.name} · v${preset.version}`);
      option.value = preset.id; select.append(option);
    }
    select.value = items.some(preset => preset.id === selected) ? selected : '';
  }
  function applyPresets(result) {
    if (!Array.isArray(result?.characters) || !Array.isArray(result?.openings)) throw problem('预设目录未能完整载入，请手动刷新。');
    const valid = preset => preset && typeof preset.id === 'string' && preset.id.length > 0
      && Number.isSafeInteger(preset.version) && preset.version > 0 && typeof preset.name === 'string';
    presets = { characters: result.characters.filter(valid), openings: result.openings.filter(preset => valid(preset) && (preset.loop === 1 || preset.loop === 2)) };
    presetsLoaded = true;
    cancelDelete('character'); cancelDelete('opening');
    renderPresets('character'); renderPresets('opening');
  }
  function selectedPreset(kind) {
    const id = $(`pc-${kind}-preset`).value;
    const preset = (kind === 'character' ? presets.characters : presets.openings).find(item => item.id === id);
    if (!preset || (kind === 'opening' && preset.loop !== loop())) throw problem('请先选择当前目录中的一份预设。');
    return preset;
  }
  function showActor() {
    const actor = catalog?.actors.find(item => item.id === actorId);
    $('pc-actor-description').hidden = !actor;
    if (actor) {
      $('pc-actor-name').textContent = actor.name;
      $('pc-actor-appearance').textContent = actor.appearance || '';
      $('pc-actor-communication').textContent = actor.communication === 'writing'
        ? '她习惯通过书写与人交流。' : actor.communication === 'speech' || actor.communication === 'spoken' || !actor.communication
          ? '她的行动与对白由你决定。' : actor.communication;
    }
    for (const input of $('pc-actors').querySelectorAll('input')) {
      const unavailable = restrictedView() && !caseActorAllowed(input.value);
      input.checked = input.value === actorId;
      input.disabled = blocked() || unavailable;
      if (input.parentElement) input.parentElement.hidden = unavailable;
    }
    if ($('pc-actor-count')) $('pc-actor-count').textContent = restrictedView() ? '十一位可选原作少女' : '十三位原作少女';
  }
  function renderActors() {
    const cards = [];
    for (const actor of catalog.actors) {
      const label = node('label', undefined, 'pc-actor-card');
      const input = node('input'); input.type = 'radio'; input.name = 'pc-actor-id'; input.value = actor.id;
      input.checked = actor.id === actorId;
      const picture = node('img'); picture.src = `/assets/characters/${actor.id}-thumb.webp`; picture.alt = ''; picture.loading = 'lazy';
      picture.width = 320; picture.height = 240;
      const frame = node('span', undefined, 'pc-actor-frame'); frame.append(picture);
      const copy = node('span', actor.name, 'pc-actor-card-name');
      label.append(input, frame, copy);
      function selectActor() {
        if (!blocked() && input.checked && (!restrictedView() || caseActorAllowed(actor.id))) actorId = actor.id;
        showActor();
      }
      // Native radios emit input before change. Commit the draft before the
      // dialog's bubbled input handler refreshes checkedness from actorId.
      input.addEventListener('input', selectActor);
      input.addEventListener('change', selectActor);
      cards.push(label);
    }
    $('pc-actors').replaceChildren(...cards);
    showActor();
  }
  function renderScenarios() {
    const select = $('pc-scenario');
    if (!select) return;
    const selected = select.value;
    const placeholder = node('option', '常规开局 · 依周目与身份选择序幕');
    placeholder.value = '';
    const choices = creationScenarioOptions(catalog);
    select.replaceChildren(placeholder, ...choices.map(choice => {
      const option = node('option', choice.name); option.value = choice.value; return option;
    }));
    select.value = choices.some(choice => choice.value === selected) ? selected : '';
  }
  function renderCardOpenings() {
    const select = $('pc-card-opening');
    if (!select) return;
    if (caseScenario()) { select.disabled = true; return; }
    if (!catalog?.openings) return;
    const selected = select.value || 'auto';
    const choices = catalog.openings.filter(choice => choice.loops.includes(loop()) && choice.playerModes.includes(mode())
      && (!choice.actorIds || choice.actorIds.includes(actorId)));
    select.replaceChildren(...choices.map(choice => { const option = node('option', choice.name); option.value = choice.id; return option; }));
    select.value = choices.some(choice => choice.id === selected) ? selected : 'auto';
    $('pc-card-opening-help').textContent = choices.find(choice => choice.id === select.value)?.description || '自填开场优先。';
    select.disabled = blocked();
  }
  function refresh() {
    renderCardOpenings();
    const isAgent = example() === 'agent';
    const custom = mode() === 'custom';
    const selection = scenarioSelection();
    const fixed = selection?.kind === 'scenario' && selection.fixedOpening === true;
    const storyArc = selection?.kind === 'storyArc';
    if ($('pc-scenario')) $('pc-scenario').disabled = blocked() || !catalog;
    if ($('pc-scenario-help')) $('pc-scenario-help').textContent = fixed
      ? `${selection?.description || '第一案从案发后的清晨在会客厅开始。'} 仅第一周目；诺亚与希罗在此时点不可作为玩家视角。`
      : storyArc ? `${selection.description} 仅第一周目；诺亚与希罗此时不可作为玩家视角。仍可填写开场文字，已有草稿会保留。`
        : '常规开局可以填写开场文字。原作角色从本人牢房开始；自建角色默认从八号牢房开始，也可选择替换双人牢房的床位。切换场景不会清空开场草稿。';
    for (const input of dialog.querySelectorAll('input[name="pc-loop"]')) input.disabled = blocked() || ((fixed || storyArc) && input.value !== '1');
    if ($('pc-card-opening-wrap')) $('pc-card-opening-wrap').hidden = true;
    if (locationField) locationField.hidden = true;
    if ($('pc-opening-location')) $('pc-opening-location').hidden = true;
    if ($('pc-cell-replace')) {
      $('pc-cell-replace').hidden = !custom || fixed;
      $('pc-cell-replace').disabled = blocked() || !custom || fixed;
    }
    cellReplaceLabel.hidden = !custom || fixed;
    if ($('pc-fixed-opening-help')) {
      $('pc-fixed-opening-help').hidden = !fixed;
      if (fixed) $('pc-fixed-opening-help').textContent = `${selection?.description || ''} 本场景的周目、开场与起始地点固定；常规开场草稿会保留。`;
    }
    showActor();
    for (const kind of ['character', 'opening']) {
      if (candidates[kind] && (!isAgent || candidates[kind].signature !== signature())) clearCandidate(kind);
    }
    root.hidden = !isAgent;
    $('custom-character-options').hidden = !(example() === 'custom' || (isAgent && custom));
    $('pc-original-fields').hidden = custom;
    const originalMagic = $('pc-original-magic');
    if (originalMagic) {
      if (originalMagic.dataset.actorId !== actorId) {
        originalMagic.value = originalMagicDrafts.get(actorId) || '';
        originalMagic.dataset.actorId = actorId;
      }
      originalMagic.disabled = custom || fixedStartSelected() || blocked();
      $('pc-original-magic-wrap').hidden = fixedStartSelected();
    }
    $('pc-custom-fields').hidden = !custom;
    $('pc-opening-toggle-wrap').hidden = custom || fixed;
    $('pc-opening-loop-label').textContent = LOOP_LABELS[loop()];
    $('pc-form').disabled = blocked();
    $('pc-cosmetics-inputs').disabled = blocked();
    $('pc-opening-inputs').disabled = blocked() || !openingEnabled();
    $('pc-opening-inputs').hidden = !openingEnabled();
    $('pc-opening-count').textContent = String($('pc-opening-text').value.length);
    root.setAttribute('aria-busy', String(working));
    for (const button of root.querySelectorAll('[data-pc-action]')) button.disabled = blocked() || (fixed && button.dataset.pcAction.endsWith('-opening'));
    for (const kind of ['character', 'opening']) {
      const kindBlocked = blocked() || (fixed && kind === 'opening');
      let selected = false;
      try { selected = Boolean(selectedPreset(kind)); } catch { /* No selected preset. */ }
      for (const action of ['load', 'overwrite', 'delete']) root.querySelector(`[data-pc-action="${action}-${kind}"]`).disabled = kindBlocked || !selected;
      root.querySelector(`[data-pc-action="save-${kind}"]`).disabled = kindBlocked || !presetsLoaded;
      root.querySelector(`[data-pc-action="complete-${kind}"]`).disabled = kindBlocked || !catalog;
    }
    if (working) { $('new-confirm').disabled = true; $('new-game-examples').disabled = true; }
    const policyFields = $('pc-run-policy-fields');
    if (policyFields) policyFields.disabled = fixedStartSelected() || blocked();
    const unavailable = $('pc-run-policy-unavailable');
    if (unavailable) unavailable.hidden = !fixedStartSelected();
    renderAttributes();
    renderRelationships();
    renderRelationshipAssistant();
  }
  async function run(work, pendingMessage) {
    if (blocked()) return;
    requestLocks = ['new-confirm', 'new-game-examples'].map(id => [$(id), $(id).disabled]);
    working = true;
    for (const [control] of requestLocks) control.disabled = true;
    refresh();
    if (pendingMessage) status(pendingMessage);
    try { onBusyChange(true); await work(); }
    catch (error) { status(safeError(error), true); }
    finally {
      working = false;
      for (const [control, disabled] of requestLocks || []) control.disabled = disabled;
      requestLocks = undefined;
      refresh(); onBusyChange(false);
    }
  }
  function applyCatalog(nextCatalog) {
    if (!Array.isArray(nextCatalog?.actors) || !Array.isArray(nextCatalog?.locations)) throw problem('角色目录暂不可用，请手动刷新。');
    const seen = new Set();
    const actors = nextCatalog.actors.filter(actor => actor && ACTOR_IDS.has(actor.id) && typeof actor.name === 'string'
      && !seen.has(actor.id) && seen.add(actor.id));
    if (actors.length !== ACTOR_IDS.size) throw problem('原作人物目录不完整，请刷新目录后重试。');
    const scenarios = Array.isArray(nextCatalog.scenarios) ? nextCatalog.scenarios.filter(choice => ['case-1', 'case-1-execution-test'].includes(choice?.id)
      && typeof choice.name === 'string' && typeof choice.description === 'string') : [];
    const storyArcs = Array.isArray(nextCatalog.storyArcs) ? nextCatalog.storyArcs.filter(arc => arc?.id === 'case-one-day3@1'
      && typeof arc.name === 'string' && typeof arc.description === 'string') : [];
    catalog = { ...nextCatalog, actors, scenarios, storyArcs };
    if (!actors.some(actor => actor.id === actorId)) actorId = actors[0].id;
    renderScenarios(); renderActors();
    const locationSelect = $('pc-opening-location');
    if (locationSelect) {
      const selectedLocation = locationSelect.value;
      const options = Array.from(LOCATION_NAMES, ([id, fallback]) => id === 'PLAYER_CELL' || id.startsWith('CELL') ? (() => {
        const name = catalog.locations.find(location => location?.id === id && typeof location.name === 'string')?.name || fallback;
        const option = node('option', name); option.value = id; return option;
      })() : null).filter(Boolean);
      locationSelect.replaceChildren(...options);
      locationSelect.value = LOCATION_NAMES.has(selectedLocation) && !['CORRIDOR', 'RECEPTION'].includes(selectedLocation)
        ? selectedLocation : 'PLAYER_CELL';
    }
    renderCellReplacements();
    $('pc-catalog-notice').textContent = typeof catalog.notice === 'string' ? catalog.notice : '';
  }
  async function reload(force = true) {
    if (loadingPromise) return loadingPromise;
    if (!force && catalog && presetsLoaded) { refresh(); return; }
    loadingPromise = run(async () => {
      const tasks = [];
      if (force || !catalog) tasks.push(request('/api/creation/catalog').then(applyCatalog));
      if (force || !presetsLoaded) tasks.push(request('/api/creation/presets').then(applyPresets));
      const results = await Promise.allSettled(tasks);
      const failure = results.find(result => result.status === 'rejected');
      if (failure) throw failure.reason;
      status(`目录就绪 · ${catalog.actors.length} 位原作角色 · ${presets.characters.length} 份角色预设 · ${presets.openings.filter(item => item.loop === loop()).length} 份本周目开场预设`);
    }, '正在读取人物目录与预设……');
    try { await loadingPromise; } finally { loadingPromise = undefined; }
  }
  function presetName(kind) {
    const name = $(`pc-${kind}-preset-name`).value.trim();
    if (!name || name.length > 60 || /[<>\p{Cc}\p{Cf}\p{Cs}]/u.test(name)) throw problem('请填写 1—60 字的预设备注名，不要使用标记或控制字符。');
    return name;
  }
  async function savePreset(kind, overwrite) {
    const name = presetName(kind);
    const target = overwrite ? selectedPreset(kind) : null;
    // Character and opening presets keep their original payloads. Relationship drafts are not stored in either preset.
    const payload = { kind, name, ...(target ? { id: target.id, expectedVersion: target.version } : {}),
      ...(kind === 'character' ? { character: character(), avatarDataUrl: avatarData(getAvatar()) } : { loop: loop(), opening: opening() }) };
    await run(async () => {
      const result = await request('/api/creation/presets/save', payload);
      applyPresets(result); $(`pc-${kind}-preset`).value = result.savedPreset.id;
      cancelDelete(kind);
      status(`${kind === 'character' ? '角色' : LOOP_LABELS[loop()] + '开场'}预设「${result.savedPreset.name}」已保存 · v${result.savedPreset.version}。游戏进度不变。`);
    }, '正在保存本机预设……');
  }
  async function loadPreset(kind) {
    const selected = selectedPreset(kind);
    const guard = { revision, signature: signature() };
    await run(async () => {
      const result = await request('/api/creation/presets/read', { kind, id: selected.id });
      if (revision !== guard.revision || signature() !== guard.signature || example() !== 'agent') { status('草稿或入口已改变，未载入旧请求返回的预设。'); return; }
      if (!result || result.id !== selected.id || !Number.isSafeInteger(result.version) || result.version < 1 || typeof result.name !== 'string') throw problem('预设响应格式无效，当前草稿已保留。');
      if (kind === 'character') {
        const data = normalizeCharacter(result.character);
        await setAvatar(avatarData(result.avatarDataUrl));
        for (const field of TEXT_FIELDS) $(`pc-character-${field}`).value = data[field];
        $('pc-character-age').value = String(data.age); $('custom-impression-color').value = data.impressionColor;
        setAttributes(data.attributes);
        $('pc-character-advanced').open = true;
      } else {
        if (result.loop !== loop()) throw problem('这份开场属于另一个周目，请先切换周目。');
        const data = normalizeOpening(result.opening);
        $('pc-opening-text').value = data.text; $('pc-opening-location').value = data.locationId;
        $('pc-opening-enabled').checked = true;
        saveOpeningDraft();
      }
      const collection = kind === 'character' ? presets.characters : presets.openings;
      const index = collection.findIndex(item => item.id === result.id);
      // Cache the latest version, but never keep a second avatar data URL in
      // the catalog; the picker/creation draft alone owns those bytes.
      const { avatarDataUrl: _avatar, ...summary } = result;
      if (index >= 0) collection[index] = summary;
      invalidate(); renderPresets(kind, result.id);
      status(`已载入「${result.name}」· v${result.version}。另一类草稿、周目与备注名均保持不变。`);
    }, '正在读取所选预设……');
  }
  function confirmDelete(kind) {
    const selected = selectedPreset(kind);
    deletes[kind] = { id: selected.id, name: selected.name, expectedVersion: selected.version };
    const panel = dialog.querySelector(`[data-pc-delete="${kind}"]`);
    panel.querySelector('[data-pc-delete-label]').textContent = `删除「${selected.name}」· v${selected.version}？只删除这份预设，不删除当前草稿、头像或存档。`;
    panel.hidden = false;
  }
  async function deletePreset(kind) {
    const selected = deletes[kind];
    if (!selected) throw problem('请重新选择并确认要删除的预设。');
    const current = selectedPreset(kind);
    if (current.id !== selected.id || current.version !== selected.expectedVersion) throw problem('所选预设已改变，请重新确认删除。');
    await run(async () => {
      const result = await request('/api/creation/presets/delete', { kind, id: selected.id, expectedVersion: selected.expectedVersion });
      applyPresets(result); cancelDelete(kind);
      status(`已删除预设「${selected.name}」。当前草稿与已有存档仍保留。`);
    }, '正在删除已确认的预设……');
  }
  function authorCharacter() {
    let data;
    if (mode() === 'custom') data = character({ partial: true, withAttributes: false });
    else {
      const actor = catalog?.actors.find(item => item.id === actorId);
      if (!actor) throw problem('请先载入目录并选择原作角色。');
      data = normalizeCharacter({ name: actor.name, appearance: (actor.appearance || '').slice(0, 800), concept: '原作少女，以玩家选定的视角开始；从本人已知的经历与眼前见闻写起。' }, { partial: true });
    }
    // Normalization adds default attributes and colour even to a text-only
    // input. Explicitly project authoring fields before sending any request.
    return Object.fromEntries([...TEXT_FIELDS, 'age'].map(field => [field, data[field]]));
  }
  async function complete(kind) {
    if (kind === 'character' && mode() !== 'custom') throw problem('原作人物资料保持不变，请先切换为自定义角色。');
    const data = caseScenario() ? normalizeOpening() : opening();
    if (kind === 'opening' && data.text) { status('已填写开场文字，保留原文且不调用模型；如需新候选，请先自行清空开场。'); return; }
    if (kind === 'character' && TEXT_FIELDS.every(field => $(`pc-character-${field}`).value.trim() !== '')) { status('角色文字项均已填写，无需调用模型；原有资料已保留。'); return; }
    const instruction = $(`pc-${kind}-instruction`).value;
    if (instruction.length > 1000 || /[<>\p{Cc}\p{Cf}]/u.test(instruction.replace(/[\r\n]/gu, ''))) throw problem('补充要求限 1000 字，请勿使用标记或控制字符。');
    // The authoring request stays on character and opening text. Relationship drafts are not sent and do not start another assistant.
    const payload = { kind, character: authorCharacter(), opening: data, loop: loop(), instruction };
    const guard = { revision, signature: signature() };
    clearCandidate('character'); clearCandidate('opening');
    await run(async () => {
      const result = await request('/api/creation/complete', payload);
      if (revision !== guard.revision || signature() !== guard.signature || example() !== 'agent') { status('草稿或窗口已切换，补全结果未应用。可基于当前草稿手动重新请求。'); return; }
      if (result?.kind !== kind) throw problem('补全响应格式无效，未应用任何内容。');
      if (kind === 'character') {
        if (!result.fields || Array.isArray(result.fields) || typeof result.fields !== 'object'
          || Object.keys(result.fields).some(field => field !== 'age' && !Object.hasOwn(FIELD_LABELS, field))) throw problem('补全包含不支持的字段，未应用任何内容。');
        const normalized = normalizeCharacter(result.fields, { partial: true });
        const fields = Object.fromEntries(TEXT_FIELDS.filter(field => Object.hasOwn(result.fields, field)
          && normalized[field] !== '' && $(`pc-character-${field}`).value.trim() === '').map(field => [field, normalized[field]]));
        if (!Object.keys(fields).length) { status('没有可补入的空白文字项；已填写内容均已保留。'); return; }
        const rows = [];
        for (const [field, value] of Object.entries(fields)) rows.push(node('dt', FIELD_LABELS[field]), node('dd', value));
        $('pc-character-preview-content').replaceChildren(...rows);
        candidates.character = { ...guard, fields };
      } else {
        const text = normalizeOpening({ text: result.text, locationId: data.locationId }).text;
        if (!text) { status('模型没有返回可用开场，当前草稿保持不变。'); return; }
        $('pc-opening-preview-content').textContent = text;
        candidates.opening = { ...guard, text };
      }
      const panel = $(`pc-${kind}-preview`); panel.hidden = false;
      if (dialog.open) { panel.focus({ preventScroll: true }); panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      status('AI 候选已生成，尚未应用。预览后接受或舍弃，不会自动保存为预设。');
    }, '正在请求一次 AI 补全……若这一次没通过，会按选项中的次数自动重试，也不会修改草稿或游戏进度。');
  }
  function accept(kind) {
    const candidate = candidates[kind];
    if (example() !== 'agent' || !candidate || candidate.revision !== revision || candidate.signature !== signature()) {
      clearCandidate(kind); throw problem('这份候选已失效，请基于当前草稿手动重新请求。');
    }
    if (kind === 'character') {
      for (const [field, value] of Object.entries(candidate.fields)) if ($(`pc-character-${field}`).value.trim() === '') $(`pc-character-${field}`).value = String(value);
      $('pc-character-advanced').open = true;
    } else {
      if ($('pc-opening-text').value.trim()) throw problem('已有开场文字，不会被 AI 覆盖。');
      $('pc-opening-text').value = candidate.text;
      saveOpeningDraft();
    }
    invalidate(); refresh();
    status(kind === 'character' ? '已补入空白文字项。原有输入、属性、年龄、头像、印象色、周目和地点均未改动。' : '已手动应用候选开场文字。角色、周目和起始地点均未改动。');
    const target = $(kind === 'character' ? 'pc-character-name' : 'pc-opening-text');
    if (dialog.open) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  const actions = { reload: () => reload(true) };
  for (const kind of ['character', 'opening']) {
    actions[`load-${kind}`] = () => loadPreset(kind);
    actions[`save-${kind}`] = () => savePreset(kind, false);
    actions[`overwrite-${kind}`] = () => savePreset(kind, true);
    actions[`delete-${kind}`] = () => confirmDelete(kind);
    actions[`cancel-delete-${kind}`] = () => cancelDelete(kind);
    actions[`confirm-delete-${kind}`] = () => deletePreset(kind);
    actions[`complete-${kind}`] = () => complete(kind);
    actions[`accept-${kind}`] = () => accept(kind);
    actions[`discard-${kind}`] = () => { clearCandidate(kind); status('已舍弃候选，当前草稿保持不变。'); };
  }
  for (const button of root.querySelectorAll('[data-pc-action]')) button.addEventListener('click', async () => {
    if (blocked() || (caseScenario() && button.dataset.pcAction.endsWith('-opening'))) return;
    try { await actions[button.dataset.pcAction]?.(); }
    catch (error) { status(safeError(error), true); }
    refresh();
  });
  $('pc-attribute-mode').addEventListener('change', () => {
    try { attributeDrafts[attributeMode] = validateAttributes({ mode: attributeMode, scores: currentScores() }, { requireSpent: false }).scores; }
    catch { /* Keep the last valid distribution for this mode. */ }
    attributeMode = $('pc-attribute-mode').value;
    for (const { id } of ATTRIBUTES) {
      const value = attributeDrafts[attributeMode][id];
      attributeNodes.get(id).input.value = Number.isFinite(value) ? String(value) : '';
    }
    renderAttributes();
  });
  $('pc-scenario')?.addEventListener('change', () => {
    const selection = scenarioSelection();
    const restricted = selection?.kind === 'storyArc' || (selection?.kind === 'scenario' && selection.fixedOpening === true);
    if (restricted) {
      if (loop() !== 1) {
        saveOpeningDraft();
        for (const input of dialog.querySelectorAll('input[name="pc-loop"]')) input.checked = input.value === '1';
        activeLoop = 1; restoreOpeningDraft(1);
      }
      const changedActor = !caseActorAllowed(actorId);
      if (changedActor) actorId = 'emma';
      const where = selection.kind === 'storyArc' ? '第三夜第一案：第一周目正常开局；案发与后续由实际流程产生'
        : '第一案：第一周目、会客厅固定开场';
      status(`已选择${where}；常规开场草稿保留。${changedActor ? '原视角在此时点不可用，已改为艾玛；可重新选择其他可用角色。' : ''}`);
    } else status('已恢复常规开局；可以继续编辑开场文字。');
    refresh();
  });
  for (const input of dialog.querySelectorAll('input[name="pc-loop"]')) input.addEventListener('change', () => {
    const next = loop();
    if (next !== activeLoop) { saveOpeningDraft(); activeLoop = next; restoreOpeningDraft(next); status(`已切换${LOOP_LABELS[next]}。角色草稿通用，开场恢复为该周目的独立草稿。`); }
    refresh();
  });
  for (const name of ['pc-player-mode', 'new-game-example']) {
    for (const input of dialog.querySelectorAll(`input[name="${name}"]`)) input.addEventListener('change', refresh);
  }
  $('pc-opening-enabled').addEventListener('change', refresh);
  $('pc-opening-text').addEventListener('input', () => { $('pc-opening-count').textContent = String($('pc-opening-text').value.length); });
  // Both events matter: some controls emit only change, while text edits must
  // invalidate previews immediately, not only after losing focus.
  for (const event of ['input', 'change']) dialog.addEventListener(event, event => {
    // Candidate edits are local only, not changes to the captured source draft.
    if (relationshipCandidatePanel?.contains(event.target)) return;
    invalidate(); refresh();
  });
  dialog.addEventListener('close', invalidate);
  mountRelationshipSection();
  refresh();
  return {
    async open() { await reload(false); refresh(); },
    refresh,
    isActive: () => example() === 'agent',
    get busy() { return working; },
    setDisabled(value) { externallyDisabled = Boolean(value); refresh(); },
    collect() {
      try {
        if (example() !== 'agent') throw problem('请先选择「高墙之内」，再填写人物档案。');
        if (blocked()) throw problem('请等待当前操作或头像处理结束后再开始游戏。');
        if (!catalog) throw problem('角色目录尚未载入，请点击「刷新目录与预设」后重试。');
        const creation = normalizeCreation(creationRecord());
        return { creation, avatarDataUrl: creation.playerMode === 'custom' ? avatarData(getAvatar()) : null };
      } catch (error) {
        const safe = problem(safeError(error));
        const detail = relationshipErrorDetail(error);
        const reported = detail ? problem(`${safe.message}${detail}`) : safe;
        status(reported.message, true);
        if (isRelationshipFailure(error)) markRelationshipErrors(reported.message, String(error?.message || ''));
        throw reported;
      }
    },
  };
}
