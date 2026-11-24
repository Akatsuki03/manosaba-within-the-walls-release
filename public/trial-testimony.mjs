import { characterAppearance } from './character-appearance.mjs';
import { testimonyActionCommand, testimonyDisplayText, testimonyCapabilityKey } from './testimony-draft.mjs';
import { normalizeTestimonyHighlights, paintTestimonyText, bindTestimonyInteraction, readTestimonyInteraction } from './testimony-highlights.mjs';

const clean = (value, maximum = 2000) => typeof value === 'string' && value.length <= maximum ? value : '';
const token = value => typeof value === 'string' && /^[a-zA-Z0-9:_-]{1,160}$/u.test(value);
// A sprite never grants an action: only the host's passage tokens can submit.
const choiceTags = Object.freeze({ Approval: 'Agreement', Objection: 'Objection', Question: 'Doubt', Perjury: 'Perjury',
  MagicEma: 'Magic_Pink', MagicAnAn: 'Magic_Yellow', MagicLeia: 'Magic_Blue', MagicCoco: 'Magic_Purple',
  MagicMargo: 'Magic_Orange', MagicNanoka: 'Magic_Gray' });
const stanceTypes = Object.freeze({ agree: 'Approval', rebut: 'Objection', question: 'Question', perjury: 'Perjury' });
const choiceOrder = Object.keys(choiceTags);
const passageKey = (statementId, start, end) => JSON.stringify([statementId, start, end]);
const supported = view => view?.trial?.testimony
  && (view.trial.testimony.version === undefined || view.trial.testimony.version === 1);
const actionCommand = testimonyActionCommand;

function passageActions(current, statement, range) {
  const mark = statement.highlights?.find(mark => mark?.start === range.start && mark.end === range.end);
  if (!mark) return [];
  const actions = Array.isArray(statement.actions) ? statement.actions
    : (Array.isArray(current.selections) ? current.selections : []).filter(action =>
      Array.isArray(mark.selectionTokens) ? mark.selectionTokens.includes(action?.token)
        : action?.statementId === statement.id && action.start === range.start && action.end === range.end);
  return actions.filter(action => token(action?.token || action?.id) && clean(action.label, 200) && actionCommand(action)
    && action.type !== 'Cancel'
    && (mark.kind !== 'statement' || (Array.isArray(mark.selectionTokens) && mark.selectionTokens.includes(action.token)
      && action.kind === 'statement_reaction' && action.statementId === statement.id
      && action.start === range.start && action.end === range.end && clean(action.command).trim())));
}

// Public entry anchors are the preferred binding, including anonymous speakers.
// Without one, both the speaker/text pair AND its occurrence must be unique.
// Never infer an anonymous speaker's identity from a phrase or impression color.
export function transcriptTestimonyStatement(view, entry) {
  if (!supported(view) || typeof entry?.text !== 'string') return undefined;
  const entries = Array.isArray(view.entries) ? view.entries : [];
  const name = typeof entry.speaker === 'string' ? entry.speaker.trim() : '';
  const rows = (Array.isArray(view.trial.testimony.statements) ? view.trial.testimony.statements : []).filter(row => {
    if (!['utterance', 'testimony', 'statement'].includes(row?.kind) || row.text !== entry.text) return false;
    if (row.delivery !== undefined && row.delivery !== entry.delivery) return false;
    if (row.entryId !== undefined) return entry.id !== undefined && row.entryId === entry.id
      && entries.filter(item => item.id === entry.id).length === 1;
    if (!name || /^[?？]+$/u.test(name)) return false;
    const matches = item => item.text === row.text && (entry.speakerId
      ? item.speakerId === row.speakerId : typeof item.speaker === 'string' && item.speaker.trim() === row.speakerName)
      && (row.delivery === undefined || item.delivery === row.delivery);
    return (entry.speakerId ? row.speakerId === entry.speakerId : row.speakerName === name)
      && entries.filter(matches).length === 1;
  });
  return rows.length === 1 ? rows[0] : undefined;
}

// The transcript remains the only NPC statement list. This composer tray
// consumes public capabilities only; choosing a passage never submits a turn.
export function mountTrialTestimony(document, { onChoose, canInteract = () => true,
  rootId = 'trial-testimony', includeReferences = true, sourceOnly = false } = {}) {
  const root = document.getElementById(rootId);
  const reference = includeReferences ? document.getElementById('testimony-reference') : null;
  const referencePassages = includeReferences ? document.getElementById('testimony-reference-passages') : null;
  const log = document.getElementById('log');
  let current; let selection; let returnFocus; let disabled = false; let scope; let controls = []; let paintEpoch = 0;
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const available = () => !!root && !!current && !disabled && typeof onChoose === 'function' && canInteract();
  const findPassage = (statementId, start, end) => {
    if (!current || !token(statementId) || typeof onChoose !== 'function') return undefined;
    const statements = Array.isArray(current.statements) ? current.statements.filter(row => row?.id === statementId) : [];
    const statement = statements.length === 1 && statements[0];
    if (sourceOnly && statement?.kind !== 'reference') return undefined;
    const range = statement && clean(statement.text, 6000) && normalizeTestimonyHighlights(statement.text, statement.highlights)
      .find(range => range.start === start && range.end === end);
    return range && passageActions(current, statement, range).length ? { statement, range } : undefined;
  };
  const speakerName = statement => clean(statement.speakerName, 100) || clean(statement.label, 100)
    || (statement.speakerId ? '庭上陈述' : clean(statement.sourceName, 100) || '已取得的记录');
  const colorFor = statement => characterAppearance(statement.speakerId ? { id: statement.speakerId, name: speakerName(statement) }
    : scope.view.player, scope.view).color;
  function focusActions() {
    const actions = root?.querySelector('[data-testimony-actions]');
    actions?.scrollIntoView?.({ block: 'nearest' });
    actions?.focus?.({ preventScroll: true });
  }
  function selectPassage(statementId, start, end, expected = {}) {
    if (!available() || expected.generation !== scope?.view.generation || expected.revision !== scope?.view.revision
      || (expected.roundId !== undefined && expected.roundId !== current.id)
      || (expected.capabilityKey !== undefined && expected.capabilityKey !== scope.key)
      || !findPassage(statementId, start, end)) return false;
    const focused = document.activeElement;
    returnFocus = log?.contains?.(focused) ? focused : undefined;
    selection = passageKey(statementId, start, end);
    if (reference) reference.open = false;
    paint(); focusActions(); return true;
  }
  function choiceButton(action, type, { cancel = false, activate } = {}) {
    const description = testimonyDisplayText(action, { stripLabel: true });
    const button = make('button', undefined, 'testimony-action'); button.type = 'button'; button.disabled = !available();
    button.dataset.choiceType = type; button.title = description;
    button.setAttribute('aria-label', description);
    const decoration = (src, className) => {
      const image = make('img', undefined, className); image.src = `/assets/trial/choices/${src}.png`;
      image.alt = ''; image.setAttribute('aria-hidden', 'true'); button.append(image);
    };
    decoration(cancel ? 'Balloon_Cancel' : 'Balloon_Default', 'testimony-action-bg');
    decoration('Balloon_Selected', 'testimony-action-bg testimony-action-hover');
    if (choiceTags[type]) decoration(`${choiceTags[type]}@ZhHans`, 'testimony-action-tag');
    const copy = make('span', undefined, 'testimony-action-copy');
    copy.append(make('span', description, choiceTags[type] ? 'testimony-action-description' : 'testimony-action-title'));
    button.append(copy); button.addEventListener('click', activate);
    controls.push(button); return button;
  }
  function paint() {
    if (!root) return;
    const ownPaint = ++paintEpoch;
    root.replaceChildren(); root.hidden = true; controls = [];
    referencePassages?.replaceChildren();
    if (reference) reference.hidden = true;
    if (!current) { if (reference) reference.open = false; return; }
    const statements = Array.isArray(current.statements) ? current.statements : [];
    const ownScope = scope.key;
    const active = () => available() && ownScope === scope?.key && ownPaint === paintEpoch;
    let selected;
    for (const statement of statements) {
      if (!token(statement?.id) || !clean(statement.text, 6000)) continue;
      const ranges = normalizeTestimonyHighlights(statement.text, statement.highlights);
      for (const range of ranges) {
        const passage = findPassage(statement.id, range.start, range.end);
        if (!passage) continue;
        if (selection === passageKey(statement.id, range.start, range.end)) selected = passage;
        // The source round may not occur in the transcript. Keep its exact
        // highlighted excerpt discoverable, but never mirror NPC statements.
        if (statement.kind !== 'reference' || !reference || !referencePassages) continue;
        const row = make('div', undefined, 'testimony-reference-row'); row.dataset.statementId = statement.id;
        row.style.setProperty('--testimony-color', colorFor(statement));
        const name = speakerName(statement);
        const button = make('button', statement.text.slice(range.start, range.end), 'testimony-highlight testimony-target');
        button.type = 'button'; button.disabled = !available();
        button.setAttribute('aria-controls', rootId); button.setAttribute('aria-label', `核对${name}的片段：${button.textContent}`);
        button.title = button.textContent;
        button.addEventListener('click', () => { if (active()) selectPassage(statement.id, range.start, range.end, scope.view); });
        row.append(make('span', name, 'testimony-speaker'), button);
        referencePassages.append(row); controls.push(button); reference.hidden = false;
      }
    }
    if (reference?.hidden) reference.open = false;
    if (!selected) { selection = undefined; returnFocus = undefined; return; }
    const { statement, range } = selected;
    root.hidden = false;
    const heading = make('div', undefined, 'testimony-selection'); heading.dataset.statementId = statement.id;
    heading.style.setProperty('--testimony-color', colorFor(statement));
    const quote = make('q', statement.text.slice(range.start, range.end), 'testimony-selected-quote'); quote.title = quote.textContent;
    heading.append(make('span', speakerName(statement), 'testimony-speaker'), quote);
    const actions = make('div', undefined, 'testimony-actions'); actions.dataset.testimonyActions = ''; actions.tabIndex = -1;
    actions.setAttribute('role', 'group'); actions.setAttribute('aria-label', sourceOnly
      ? '选择材料核对的立场，随后在图鉴中确认' : '选择此证词片段的回应；填入原对话栏，发送前可修改');
    const actionType = action => clean(action?.type, 40) || stanceTypes[action?.stance] || '';
    const order = action => { const index = choiceOrder.indexOf(actionType(action)); return index < 0 ? choiceOrder.length : index; };
    for (const action of [...passageActions(current, statement, range)].sort((a, b) => order(a) - order(b))) {
      const command = actionCommand(action);
      actions.append(choiceButton(action, actionType(action), { activate: () => {
        if (active()) onChoose(command, { generation: scope.view.generation, revision: scope.view.revision,
          displayText: testimonyDisplayText(action, { stripLabel: true }) });
      } }));
    }
    const cancel = choiceButton({ label: '取消选择' }, 'Cancel', { cancel: true, activate: () => {
      if (!active()) return;
      const target = returnFocus;
      selection = undefined; paint();
      if (target && log?.contains?.(target)) target.focus?.({ preventScroll: true });
    } });
    root.append(heading, actions, cancel);
  }
  // Same-revision round/token/range replacements invalidate retained controls.
  const keyFor = testimonyCapabilityKey;
  return {
    update(view) {
      if (scope && (view?.generation < scope.view.generation
        || (view?.generation === scope.view.generation && view?.revision < scope.view.revision))) return;
      const next = view?.trial?.stage === 'discussion' && supported(view) ? view.trial.testimony : null;
      const key = keyFor(view);
      if (scope && key !== scope.key) { selection = undefined; returnFocus = undefined; if (reference) reference.open = false; }
      scope = { key, view }; current = next;
      if (!available()) selection = undefined;
      paint();
    },
    selectPassage,
    // Snapshot bindings survive typewriter rewrapping, not a changed host scope.
    transcriptBinding(statementId) {
      const expected = { generation: scope?.view.generation, revision: scope?.view.revision,
        roundId: current?.id, capabilityKey: scope?.key };
      const valid = () => !!(current && expected.capabilityKey === scope?.key);
      return {
        canSelect: (start, end) => !!(valid() && findPassage(statementId, start, end)),
        isEnabled: () => !!(valid() && available()),
        onSelect: (start, end) => valid() && selectPassage(statementId, start, end, expected),
      };
    },
    setDisabled(value) {
      disabled = Boolean(value);
      if (disabled && selection) { selection = undefined; returnFocus = undefined; paint(); }
      for (const control of controls) control.disabled = !available();
      for (const button of log?.querySelectorAll?.('.testimony-transcript-target') || []) button.disabled = !available();
    },
    close() { current = null; selection = undefined; returnFocus = undefined; paint(); },
  };
}

const transcriptListeners = new WeakSet();
// The paragraph owns delegation, not its transient highlight children. The
// typewriter can freely replace spans/buttons without discarding activation.
export function paintTranscriptTestimony(document, paragraph, { text, highlights, color, passages = highlights,
  onSelect, canSelect = () => true, isEnabled = () => true } = {}) {
  const ranges = normalizeTestimonyHighlights(text, highlights);
  bindTestimonyInteraction(paragraph, undefined);
  if (!ranges.length) { delete paragraph.dataset.testimonyHighlights; paragraph.textContent = text; return; }
  paragraph.dataset.testimonyHighlights = JSON.stringify(ranges);
  if (color) paragraph.style.setProperty('--testimony-color', color);
  if (typeof onSelect === 'function') {
    const bound = ranges.flatMap(range => {
      const source = Array.isArray(passages) && passages.find(mark => mark?.start === range.start && mark.end === range.end);
      const start = source?.statementStart ?? range.start; const end = source?.statementEnd ?? range.end;
      return source && Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && end > start
        ? [{ ...range, statementStart: start, statementEnd: end }] : [];
    });
    const passage = range => bound.find(mark => mark.start === range.start && mark.end === range.end
      && canSelect(mark.statementStart, mark.statementEnd));
    bindTestimonyInteraction(paragraph, { passage, isEnabled, onSelect });
    if (!transcriptListeners.has(paragraph)) {
      const activate = event => {
        if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
          || (event.type === 'click' ? event.button > 0 : !['Enter', ' '].includes(event.key))) return;
        const target = event.target?.closest?.('[data-testimony-passage]');
        if (!target || target.disabled || !paragraph.contains?.(target)
          || target.closest?.('[aria-hidden="true"], [data-story-pending="true"], .story-unrevealed')) return;
        const interaction = readTestimonyInteraction(paragraph);
        const mark = interaction?.passage({ start: Number(target.dataset.testimonyStart), end: Number(target.dataset.testimonyEnd) });
        if (!mark || !interaction.isEnabled()) return;
        event.preventDefault(); interaction.onSelect(mark.statementStart, mark.statementEnd);
      };
      paragraph.addEventListener('click', activate); paragraph.addEventListener('keydown', activate);
      transcriptListeners.add(paragraph);
    }
  }
  paintTestimonyText(document, paragraph, text, ranges);
}
