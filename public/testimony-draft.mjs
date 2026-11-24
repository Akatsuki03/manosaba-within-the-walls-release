const clean = (value, maximum = 2000) => typeof value === 'string' && value.length <= maximum ? value.trim() : '';
const token = value => typeof value === 'string' && /^[a-zA-Z0-9:_-]{1,160}$/u.test(value);
const opaqueCommand = /^(?:核对证词|庭上回应)[：:]\s*[a-zA-Z0-9:_-]+$/u;
const recoveryText = '继续刚才的证词回应';

export function testimonyActionCommand(action) {
  return clean(action?.command)
    || (action?.kind !== 'statement_reaction' && token(action?.token || action?.id) ? `核对证词：${action.token || action.id}` : '');
}

// Display prose is supplied by the host. Legacy fallback only removes a short
// action label; it never interprets a stance or cuts prose at sentence borders.
export function testimonyDisplayText(action, { stripLabel = false } = {}) {
  const display = clean(action?.displayText, 500);
  if (display && !opaqueCommand.test(display)) return display;
  const text = clean(action?.text);
  const label = clean(action?.label, 200);
  if (text && !opaqueCommand.test(text)) {
    if (stripLabel && label && label.length <= 8) {
      for (const separator of ['：', ':']) {
        if (text.startsWith(`${label}${separator}`)) return text.slice(label.length + 1).trim() || text;
      }
    }
    return text;
  }
  return label && !opaqueCommand.test(label) ? label : recoveryText;
}

export function testimonyFeedbackText(value) {
  return typeof value === 'string'
    ? value.replace(/(?:核对证词|庭上回应)[：:]\s*[a-zA-Z0-9:_-]+/gu, '证词回应') : '';
}

// Identity includes every public command/range, including legacy per-statement
// actions. No DOM attribute or request body contains this private binding key.
export const testimonyCapabilityKey = view => JSON.stringify([view?.exampleId, view?.scenarioId, view?.generation, view?.revision,
  view?.trial?.stage, view?.trial?.testimony?.version, view?.trial?.testimony?.id, view?.trial?.testimony?.index,
  view?.trial?.testimony?.selections, view?.trial?.testimony?.statements?.map(row => [row?.id, row?.text, row?.highlights, row?.entryId,
    row?.speakerId, row?.speakerName, row?.delivery, row?.actions])]);

export function createTestimonyDraft() {
  let binding;
  let recoveryAllowed = true;
  const pendingDisplays = new WeakMap();
  const valid = (entry, view) => entry?.capabilityKey === testimonyCapabilityKey(view);
  const pendingDisplay = request => request ? pendingDisplays.get(request)?.displayText || testimonyDisplayText(request) : '';
  function sync(view, request) {
    if (binding && !valid(binding, view)) { binding = undefined; recoveryAllowed = false; }
    const pending = request && pendingDisplays.get(request);
    if (pending?.hidden && !valid(pending, view)) { recoveryAllowed = false; return false; }
    return true;
  }
  return {
    select(command, scope, view) {
      binding = undefined;
      const testimony = view?.trial?.testimony;
      if (scope?.generation !== view?.generation || scope?.revision !== view?.revision || view?.trial?.stage !== 'discussion'
        || !testimony || ![undefined, 1].includes(testimony.version)) return undefined;
      const choices = [...(Array.isArray(testimony.selections) ? testimony.selections : []),
        ...(Array.isArray(testimony.statements) ? testimony.statements : []).flatMap(row => Array.isArray(row?.actions) ? row.actions : [])]
        .filter(action => action?.type !== 'Cancel' && token(action?.token || action?.id) && testimonyActionCommand(action) === command);
      if (choices.length !== 1) return undefined;
      const displayText = testimonyDisplayText(choices[0], { stripLabel: true });
      if (scope.displayText !== undefined && scope.displayText !== displayText) return undefined;
      binding = { command, displayText, generation: view.generation, revision: view.revision, capabilityKey: testimonyCapabilityKey(view) };
      return displayText;
    },
    sync,
    resolve(value, view, request) {
      sync(view, request);
      const pending = request && pendingDisplays.get(request);
      if (pending?.hidden && valid(pending, view) && value === pending.displayText) return request.text;
      if (binding && value === binding.displayText) return binding.command;
      if (binding) { binding = undefined; recoveryAllowed = false; }
      return value.trim();
    },
    matches(request, value, view) {
      if (!request) return false;
      const pending = pendingDisplays.get(request);
      if (!pending && request.text !== pendingDisplay(request)) return false;
      return pending?.hidden ? valid(pending, view) && value === pending.displayText : pendingDisplay(request) === value.trim();
    },
    pendingDisplay,
    remember(request, displayText, view) {
      const hidden = request.text !== displayText.trim();
      pendingDisplays.set(request, { displayText: hidden ? displayText : displayText.trim(), hidden, capabilityKey: testimonyCapabilityKey(view) });
    },
    recover(runtime, value) {
      const displayText = testimonyDisplayText(runtime);
      if ((!recoveryAllowed && runtime.text !== displayText) || (value.trim() && value !== displayText)) return undefined;
      return displayText;
    },
    edit(request) {
      binding = undefined; recoveryAllowed = false;
      return Boolean(request && pendingDisplays.get(request)?.hidden);
    },
    clear() { binding = undefined; recoveryAllowed = false; },
  };
}
