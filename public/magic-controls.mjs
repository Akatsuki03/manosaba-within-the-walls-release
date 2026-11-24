// Read-only ability reference. There is deliberately no activation, cast or
// end control here: ordinary player text in the main input is the only way to
// release or stop an ability, and the HOST settles it inside that same action.
const GATE_COPY = {
  'completed-world-read-only': '这段故事已经进入收束阶段，不能再改变世界。',
  'shared-case-world-adapter': '当前案件阶段暂不支持这项能力。',
  'host-reviewed-binding-policy-required': '当前存档没有可用的能力规则。',
  'explicit-confirmation-required': '当前不能直接使用能力。',
  'custom-ability-separate-versioned-entry': '自定义能力以当前已经确认的定义为准。',
};
const mechanismLabel = mechanism => {
  if (mechanism === 'sound-reproduction') return '回放听过的声音';
  if (mechanism === 'body-relocation') return '移动到已见的位置';
  return '当前机制';
};

export function mountMagicControls({ request, getState } = {}) {
  const openButton = document.getElementById('magic-open');
  const dialog = document.getElementById('magic-dialog');
  if (!openButton || !dialog) return { sync: () => {} };
  const body = document.getElementById('magic-body');
  const statusLine = document.getElementById('magic-status');
  const closeButton = document.getElementById('magic-close');
  const technical = document.getElementById('magic-technical');
  const technicalDefinition = document.getElementById('magic-technical-definition');
  let loading = false;

  const status = text => { if (statusLine) statusLine.textContent = text; };
  const paragraph = text => { const item = document.createElement('p'); item.textContent = text; return item; };
  const setTechnical = rows => {
    if (!technical || !technicalDefinition) return;
    technicalDefinition.replaceChildren();
    for (const [label, value] of rows) {
      if (value === undefined || value === null || value === '') continue;
      const term = document.createElement('dt'); const detail = document.createElement('dd');
      term.textContent = label; detail.textContent = String(value);
      technicalDefinition.append(term, detail);
    }
    technical.hidden = technicalDefinition.childElementCount === 0;
  };
  const guidance = () => paragraph('在下方文本框直接写下你想做的行动，包括想发动或停止的能力。系统只按当前已经确认的能力、目标和世界条件结算；这里只列出当前参考，不代替行动。');

  function renderCustom(current, state) {
    body.replaceChildren();
    const actions = Array.isArray(current?.actions) ? current.actions : [];
    const sources = Array.isArray(current?.sources) ? current.sources : [];
    const destinations = Array.isArray(current?.destinations) ? current.destinations : [];
    setTechnical([
      ['来源数量', sources.length], ['目的地数量', destinations.length],
      ['定义', actions.map(action => action.definitionId).filter(Boolean).join('、')],
      ['阶段', actions.map(action => action.stage).filter(Boolean).join('、')],
      ['启用状态', state?.magic?.enabled === true ? '已启用' : '未启用'],
      ['规则门', state?.magic?.gate || ''],
    ]);
    body.append(guidance());
    if (!actions.length) { body.append(paragraph('当前没有已经确认可直接参考的能力。')); return; }
    for (const action of actions) {
      const card = document.createElement('section');
      card.append(paragraph(mechanismLabel(action.mechanism)));
      if (action.mechanism === 'sound-reproduction') {
        card.append(paragraph(sources.length ? `可回放的声音：${sources.map(source => source.label).join('；')}`
          : '现在没有可以回放的声音。'));
      } else if (action.mechanism === 'body-relocation') {
        card.append(paragraph(destinations.length ? `可去的位置：${destinations.map(row => row.label).join('、')}`
          : '现在没有可以去的位置。'));
      } else card.append(paragraph('这个能力目前没有可直接参考的方式。'));
      body.append(card);
    }
  }

  function renderOriginal(magic, state) {
    body.replaceChildren();
    const actions = Array.isArray(magic?.actions) ? magic.actions : [];
    const targets = Array.isArray(magic?.targets) ? magic.targets : [];
    setTechnical([
      ['启用状态', magic?.enabled === true ? '已启用' : '未启用'],
      ['规则门', magic?.gate || ''], ['可用能力', actions.length],
      ['可选目标', targets.length], ['玩家 ID', state?.player?.id || ''],
    ]);
    body.append(guidance());
    if (magic?.enabled !== true) {
      body.append(paragraph(GATE_COPY[magic?.gate] || '当前没有可直接参考的能力。'));
      return;
    }
    if (magic?.end) body.append(paragraph(`当前参考：${magic.end.label || '停止这项能力'}。`));
    if (!actions.length && !magic?.end) { body.append(paragraph('现在还没有可直接参考的能力。')); return; }
    for (const action of actions) {
      const card = document.createElement('section');
      card.append(paragraph(action.label || '已获得的能力'));
      if (action.executable !== true) { card.append(paragraph('当前条件不足。')); body.append(card); continue; }
      const names = targets.filter(target => !action.targetKinds || action.targetKinds.includes(target.kind))
        .map(target => target.label || target.handle);
      card.append(paragraph(names.length ? `可参考目标：${names.join('、')}` : '现在没有可以选择的目标。'));
      body.append(card);
    }
  }

  async function load() {
    const state = getState();
    if (!state) return;
    loading = true;
    status('正在读取当前能力…');
    try {
      if (state.magic?.gate === 'custom-ability-separate-versioned-entry') {
        const current = await request('/api/custom-abilities/current', {});
        renderCustom(current, state);
        const count = Array.isArray(current?.actions) ? current.actions.length : 0;
        status(count ? '只作参考。要使用能力，请在下方文本框写你的行动。' : '当前没有可参考的能力。');
      } else {
        const magic = await request('/api/magic');
        renderOriginal(magic, state);
        status('只作参考。要使用或停止能力，请在下方文本框写你的行动。');
      }
    } catch (error) {
      status(error?.message || '这次没有读取出可用能力。');
    } finally { loading = false; }
  }

  openButton.addEventListener('click', async () => {
    if (dialog.open || loading) return;
    dialog.showModal(); body.replaceChildren(); setTechnical([]); status('正在读取当前能力…');
    await load();
  });
  closeButton?.addEventListener('click', () => dialog.close());

  return {
    sync(view) {
      openButton.hidden = view?.exampleId !== 'agent';
      if (dialog.open && openButton.hidden) dialog.close();
    },
  };
}
