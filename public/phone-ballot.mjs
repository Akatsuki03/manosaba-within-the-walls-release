// Phone ballot is a presentation-only consumer of an already host-authorized
// ballot. Candidates come exclusively from exact `我投给...` suggestions; this
// module never creates a stage, candidate, vote, verdict or request identity.
const CHOICE_PREFIX = '我投给';

export function phoneBallotAvailable(view, isSupported = () => true) {
  return isSupported(view) === true && view?.phoneState === 'ballot' && view?.trial?.stage === 'ballot'
    && !view?.completed && Array.isArray(view?.suggestions);
}

export function phoneBallotChoices(view, isSupported = () => true) {
  if (!phoneBallotAvailable(view, isSupported)) return [];
  const seen = new Set();
  return view.suggestions.filter(command => typeof command === 'string' && command.startsWith(CHOICE_PREFIX)
    && !seen.has(command) && seen.add(command)).map((command, index) => ({
    id: `phone-ballot-choice-${index + 1}`, command, label: command,
  }));
}

export function phoneBallotScope(view, isSupported = () => true) {
  return JSON.stringify([view?.generation, view?.revision, view?.phoneState, view?.trial?.stage,
    phoneBallotChoices(view, isSupported).map(choice => choice.command)]);
}

function setStatus(node, text) {
  if (!node) return;
  if (node.textContent !== text) node.textContent = text;
}

export function mountPhoneBallot({ document, getView, isBusy = () => false, isSupported = () => true, confirm } = {}) {
  const root = document?.getElementById('phone-ballot');
  if (!root) return { sync() {}, destroy() {} };
  const choicesRoot = document.getElementById('phone-ballot-choices');
  const status = document.getElementById('phone-ballot-status');
  const button = document.getElementById('phone-ballot-confirm');
  const selectedNode = document.getElementById('phone-ballot-selected');
  let scopeKey;
  let selectedCommand;
  let awaiting = false;

  function clear() {
    selectedCommand = undefined;
    awaiting = false;
    if (choicesRoot) choicesRoot.replaceChildren();
    if (selectedNode) selectedNode.textContent = '';
    setStatus(status, '');
    if (button) button.disabled = true;
  }

  function paintChoices(choices, busy) {
    if (!choicesRoot) return;
    choicesRoot.replaceChildren();
    for (const choice of choices) {
      const label = document.createElement('label');
      label.className = 'phone-ballot-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'phone-ballot-choice';
      input.id = choice.id;
      input.value = choice.command;
      input.checked = selectedCommand === choice.command;
      input.disabled = busy;
      input.addEventListener('change', () => {
        if (!input.checked) return;
        if (isBusy() === true) { sync(getView()); return; }
        const current = getView();
        if (scopeKey !== phoneBallotScope(current, isSupported)
          || !phoneBallotChoices(current, isSupported).some(row => row.command === choice.command)) {
          sync(current); return;
        }
        selectedCommand = choice.command;
        if (selectedNode) selectedNode.textContent = `已选择：${choice.command}`;
        setStatus(status, `${choice.command}。确认后才会提交本轮投票，不会自动投票。`);
        if (button) button.disabled = isBusy() === true;
      });
      const text = document.createElement('span');
      text.textContent = choice.label;
      label.append(input, text);
      choicesRoot.append(label);
    }
  }

  function sync(view = getView()) {
    const busy = isBusy() === true;
    if (!phoneBallotAvailable(view, isSupported)) {
      root.hidden = true;
      clear();
      return;
    }
    root.hidden = false;
    const choices = phoneBallotChoices(view, isSupported);
    const key = phoneBallotScope(view, isSupported);
    if (key !== scopeKey) {
      scopeKey = key;
      selectedCommand = undefined;
      awaiting = false;
      if (selectedNode) selectedNode.textContent = '';
      setStatus(status, '');
    }
    if (selectedCommand && !choices.some(choice => choice.command === selectedCommand)) {
      selectedCommand = undefined;
      if (selectedNode) selectedNode.textContent = '';
      setStatus(status, '');
    }
    // The panel remains visible but cannot invent candidates when the host
    // offered none. No hidden fallback reads verdict or roster data.
    paintChoices(choices, busy);
    if (button) button.disabled = busy || !selectedCommand;
    if (!choices.length) setStatus(status, '当前未收到可投选项；不会自行生成候选或投票。');
    else if (!selectedCommand) setStatus(status, '选择一名候选人后，再点确认投票。');
    else if (awaiting) {
      if (busy) setStatus(status, '正在提交本轮投票；不会自动重试。');
      else {
        awaiting = false;
        setStatus(status, '本轮投票尚未完成；请确认后手动续接同一请求，不会自动重试。');
      }
    }
  }

  if (button) button.addEventListener('click', () => {
    if (!selectedCommand || isBusy() === true || awaiting) return;
    // The click may outlive this render: re-read the actual head and only
    // confirm a command that is still offered in the same current scope. Do
    // not attach an old selection epoch to a newer head.
    const current = getView();
    if (scopeKey !== phoneBallotScope(current, isSupported)
      || !phoneBallotChoices(current, isSupported).some(choice => choice.command === selectedCommand)) {
      sync(current); return;
    }
    awaiting = true;
    setStatus(status, '正在提交本轮投票；不会自动重试。');
    button.disabled = true;
    const accepted = confirm?.(selectedCommand);
    if (accepted === false) {
      awaiting = false;
      button.disabled = isBusy() === true;
      setStatus(status, '本轮投票未提交；请先处理当前进度或继续编辑，不会自动发送。');
    }
  });

  return {
    sync,
    destroy() { root.hidden = true; clear(); },
  };
}
