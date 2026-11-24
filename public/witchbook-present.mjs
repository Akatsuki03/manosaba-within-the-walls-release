import { testimonyCapabilityKey, testimonyActionCommand, testimonyDisplayText } from './testimony-draft.mjs';

const supported = view => view?.trial?.stage === 'discussion' && !view.completed;
const keyFor = view => JSON.stringify([view?.exampleId, view?.scenarioId, view?.generation, view?.revision,
  view?.trial?.stage, view?.completed, view?.evidence, view?.suggestions, testimonyCapabilityKey(view)]);

// Navigation never invents permission: use only an exact host-offered command.
export function evidencePresentation(view, evidenceId) {
  if (!supported(view)) return undefined;
  const items = (view.evidence || []).filter(item => item.id === evidenceId);
  if (items.length !== 1) return undefined;
  const item = items[0];
  const command = (view.suggestions || []).find(value => value === `出示${item.id}` || value === `出示${item.name}`);
  if (command && (view.evidence || []).filter(row => command === `出示${row.id}` || command === `出示${row.name}`).length !== 1) return undefined;
  return command ? { command, name: item.name, evidenceId: item.id } : undefined;
}

export function createWitchBookPresentation() {
  let pending;
  return {
    evidence(view, id) {
      const choice = evidencePresentation(view, id);
      pending = choice && { ...choice, key: keyFor(view), kind: 'evidence' };
      return pending;
    },
    testimony(view, command, scope) {
      pending = undefined;
      if (!supported(view) || scope?.generation !== view.generation || scope?.revision !== view.revision) return undefined;
      const round = view.trial.testimony;
      if (!round || ![undefined, 1].includes(round.version)) return undefined;
      const choices = (round?.selections || []).filter(action => testimonyActionCommand(action) === command
        && action.kind !== 'statement_reaction' && action.type !== 'Cancel');
      if (choices.length !== 1) return undefined;
      const choice = choices[0];
      const source = round.statements?.find(row => row.id === choice.statementId);
      if (!source || !source.highlights?.some(mark => mark.start === choice.start && mark.end === choice.end
        && mark.selectionTokens?.includes(choice.token))) return undefined;
      const displayText = testimonyDisplayText(choice, { stripLabel: true });
      if (scope.displayText !== displayText) return undefined;
      pending = { command, scope: { generation: view.generation, revision: view.revision, displayText },
        name: source.sourceName || round.reference?.name || '当前材料', displayText, kind: 'testimony', key: keyFor(view) };
      return pending;
    },
    resolve(view) { return pending?.key === keyFor(view) && supported(view) ? pending : undefined; },
    clear() { pending = undefined; },
  };
}
