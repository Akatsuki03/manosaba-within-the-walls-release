export function mountCustomAbilityEntry({ request, onChange = () => {} } = {}) {
  const section = document.getElementById('pc-ability-authoring');
  if (!section) return { getConfirmedSelection: () => undefined, clearSelection: () => {} };

  const magic = document.getElementById('pc-character-magic');
  const characterName = document.getElementById('pc-character-name');
  const stageSelect = document.getElementById('pc-ability-stage');
  const recognitionSelect = document.getElementById('pc-ability-recognition');
  const compileButton = document.getElementById('pc-ability-compile');
  const statusLine = document.getElementById('pc-ability-status');
  const preview = document.getElementById('pc-ability-preview');
  const definition = document.getElementById('pc-ability-definition');
  const technical = document.getElementById('pc-ability-technical');
  const technicalDefinition = document.getElementById('pc-ability-technical-definition');
  const note = document.getElementById('pc-ability-note');
  const confirmButton = document.getElementById('pc-ability-confirm');
  const entryStatus = document.getElementById('pc-ability-entry-status');

  let pendingJob;
  let compiled;
  let confirmed;
  let authoredText;
  let authoredOptions;
  let confirmedSelection;
  let busy = false;

  const ticket = prefix => {
    const value = globalThis.crypto?.randomUUID?.()
      || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    return `${prefix}:${value.replace(/-/gu, '')}`;
  };
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const status = text => { statusLine.textContent = text; };
  const errorText = error => {
    if (error?.code === 'CUSTOM_COMPILER_UNAVAILABLE') return '能力编译暂时不可用，请稍后再试。';
    if (error?.code === 'CUSTOM_ABILITY_CATALOG_STALE' || error?.code === 'STALE_REVISION') return '当前内容已经变化，请重新编译。';
    if (error?.code === 'INVALID_REQUEST' || error?.code === 'INVALID_ABILITY_REQUEST') return '请检查能力描述后再试。';
    return error?.message || '这次没有完成，请稍后再试。';
  };
  const showError = error => status(errorText(error));
  const setSelection = value => {
    if (JSON.stringify(value) === JSON.stringify(confirmedSelection)) return;
    confirmedSelection = value;
    onChange(value ? { ...value } : undefined);
  };
  const setBusy = value => {
    busy = value;
    compileButton.disabled = value;
    compileButton.textContent = pendingJob ? '刷新编译状态' : '编译能力';
    confirmButton.disabled = value || !compiled?.canConfirm || Boolean(confirmed);
    magic.disabled = value;
    stageSelect.disabled = value;
    recognitionSelect.disabled = value;
  };
  const authoringOptions = () => ({ stage: stageSelect.value, recognition: recognitionSelect.value });
  const resetView = () => {
    pendingJob = undefined;
    compiled = undefined;
    confirmed = undefined;
    authoredText = undefined;
    authoredOptions = undefined;
    preview.hidden = true;
    definition.replaceChildren();
    technical.hidden = true;
    technicalDefinition.replaceChildren();
    note.textContent = '';
    entryStatus.hidden = true;
    setSelection(undefined);
    setBusy(false);
  };

  function appendRows(target, rows) {
    target.replaceChildren();
    for (const [label, value] of rows) {
      if (!value) continue;
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      target.append(term, detail);
    }
  }

  function renderDefinition(result) {
    const declaration = result.declaration;
    if (!declaration || !Array.isArray(declaration.clauses)) throw new Error('这次没有拿到可核对的能力内容，请重新编译。');
    const stage = { basic: '尚未觉醒', awakened: '已觉醒' }[declaration.initialState?.stage]
      || declaration.initialState?.stage || '';
    const recognition = { known: '已知', unknown: '未知', partial: '部分已知' }[declaration.initialState?.recognition]
      || declaration.initialState?.recognition || '';
    const mainRows = [['初始状态', stage && recognition ? `${stage} · ${recognition}` : stage || recognition]];
    for (const [index, clause] of declaration.clauses.entries()) {
      mainRows.push([`能力 ${index + 1}`, clause.text || '']);
    }
    for (const [index, issue] of (declaration.unresolved || []).entries()) {
      mainRows.push([`还需澄清 ${index + 1}`, typeof issue === 'string' ? issue : issue?.question || '']);
    }
    const technicalRows = [
      ['定义 ID', declaration.definitionId || ''],
      ['版本', declaration.revision === undefined ? '' : String(declaration.revision)],
      ['执行状态', result.executionStatus || ''],
      ['语义摘要', result.semanticDigest || ''],
    ];
    appendRows(definition, mainRows);
    appendRows(technicalDefinition, technicalRows);
    technical.hidden = false;
    preview.hidden = false;
    note.textContent = result.executionStatus === 'candidate-ready'
      ? '核对无误后确认；这份能力会随角色进入新游戏。'
      : result.executionStatus === 'needs-clarification'
        ? '这段原文仍会带入普通新局；专用机制需要澄清后才能确认。'
        : '这段原文仍会带入普通新局；当前没有匹配的专用结算机制。';
  }

  async function readStatus(jobId) {
    let result = await request('/api/custom-abilities/compile/status', { apiVersion: 1, jobId });
    for (let attempt = 0; result.status === 'pending' && attempt < 7; attempt++) {
      await delay(800);
      result = await request('/api/custom-abilities/compile/status', { apiVersion: 1, jobId });
    }
    return result;
  }

  function acceptCompilation(result) {
    if (result.status === 'failed') {
      pendingJob = undefined;
      throw new Error(result.failureCode === 'compiler-unavailable'
        ? '能力编译模型请求失败。请检查 Options 中「角色创建与开场补全」的模型设置，再用原描述重试。'
        : result.failureCode === 'invalid-candidate'
          ? '模型返回的能力解释未通过校验。原描述已保留，可以直接重试。'
          : '能力编译未完成。原描述已保留。');
    }
    if (result.status !== 'completed') {
      pendingJob = result.jobId;
      status('能力还在编译，稍后可以刷新结果。');
      setBusy(false);
      return;
    }
    pendingJob = undefined;
    if (!result.declaration) throw new Error('编译完成，但没有拿到能力内容，请重新编译。');
    compiled = {
      jobId: result.jobId,
      draftRevision: result.draftRevision,
      semanticDigest: result.semanticDigest,
      attachmentDigest: result.attachmentDigest,
      canConfirm: result.executionStatus === 'candidate-ready',
    };
    confirmed = undefined;
    renderDefinition(result);
    status(compiled.canConfirm ? '编译完成；请核对能力内容，确认后会带入新游戏。' : '编译完成，但这份能力还不能确认。');
    setBusy(false);
  }

  async function compile() {
    if (busy) return;
    if (pendingJob) {
      setBusy(true);
      status('正在读取编译结果…');
      try { acceptCompilation(await readStatus(pendingJob)); }
      catch (error) { showError(error); }
      finally { setBusy(false); }
      return;
    }
    const text = magic.value.trim();
    if (!text) {
      status('请先写下能力描述。');
      return;
    }
    const options = authoringOptions();
    resetView();
    authoredText = text;
    authoredOptions = options;
    setBusy(true);
    status('正在准备能力…');
    try {
      const draftId = ticket('draft:ui');
      const saved = await request('/api/custom-abilities/drafts/save', {
        apiVersion: 1,
        draft: {
          requestId: ticket('ui:save'),
          draftId,
          expectedVersion: 0,
          authoredText,
          options: { initialState: options, authorChoices: [] },
          cosmetics: { name: (characterName.value || '').trim() || '未命名', avatarRef: null },
        },
      });
      const result = await request('/api/custom-abilities/compile', {
        apiVersion: 1,
        requestId: ticket('ui:compile'),
        draftId: saved.draftId,
        expectedVersion: saved.version,
      });
      const completed = result.status === 'completed' || result.status === 'pending'
        ? await readStatus(result.jobId) : result;
      if (completed.status === 'completed') completed.draftRevision = completed.draftRevision ?? saved.draftRevision;
      acceptCompilation(completed);
      section.dataset.draftId = saved.draftId;
      section.dataset.draftVersion = String(saved.version);
      section.dataset.draftRevision = String(completed.draftRevision ?? saved.draftRevision ?? '');
    } catch (error) {
      showError(error);
      setBusy(false);
    }
  }

  async function confirm() {
    if (busy || !compiled?.canConfirm || confirmed) return;
    const options = authoringOptions();
    if (magic.value.trim() !== authoredText
      || options.stage !== authoredOptions.stage
      || options.recognition !== authoredOptions.recognition) {
      resetView();
      status('描述或初始状态已修改，请重新编译；文字已保留。');
      return;
    }
    if (!compiled.semanticDigest || !compiled.attachmentDigest) {
      status('这次编译结果不完整，请重新编译。');
      return;
    }
    const draftId = section.dataset.draftId;
    const draftVersion = Number(section.dataset.draftVersion);
    const draftRevision = Number(compiled.draftRevision ?? section.dataset.draftRevision);
    if (!draftId || !Number.isSafeInteger(draftVersion) || draftVersion < 1 || !Number.isSafeInteger(draftRevision) || draftRevision < 1) {
      status('草稿信息不完整，请重新编译。');
      return;
    }
    setBusy(true);
    status('正在确认能力…');
    try {
      const response = await request('/api/custom-abilities/confirm', {
        apiVersion: 1,
        requestId: ticket('ui:confirm'),
        draftId,
        expectedVersion: draftVersion,
        draftRevision,
        jobId: compiled.jobId,
        expectedSemanticDigest: compiled.semanticDigest,
        expectedAttachmentDigest: compiled.attachmentDigest,
        confirmed: true,
      });
      const selection = typeof response.definitionId === 'string' && Number.isSafeInteger(response.revision)
        ? { definitionId: response.definitionId, revision: response.revision, expectedSemanticDigest: compiled.semanticDigest }
        : undefined;
      if (!selection) {
        status('确认已记录，但没有拿到可带入游戏的标识，请重新确认。');
        setBusy(false);
        return;
      }
      confirmed = response;
      setSelection(selection);
      entryStatus.hidden = false;
      entryStatus.textContent = '作者确认已记录。开始时这份能力会随自定义角色进入游戏。';
      status('能力已确认，会随角色进入新游戏。');
      setBusy(false);
    } catch (error) {
      showError(error);
      setBusy(false);
    }
  }

  compileButton.addEventListener('click', compile);
  confirmButton.addEventListener('click', confirm);
  const onAuthoringChanged = () => {
    if (!compiled && !confirmed && !pendingJob) return;
    resetView();
    status('描述或初始状态已修改，请重新编译；文字已保留。');
  };
  magic.addEventListener('input', onAuthoringChanged);
  magic.addEventListener('change', onAuthoringChanged);
  stageSelect.addEventListener('change', onAuthoringChanged);
  recognitionSelect.addEventListener('change', onAuthoringChanged);
  resetView();
  status('如需专用结算，可选「编译能力」。');

  return {
    getConfirmedSelection: () => confirmedSelection && magic.value.trim() === authoredText ? { ...confirmedSelection } : undefined,
    clearSelection: () => setSelection(undefined),
    refreshDraft: () => { if (!busy && authoredText !== undefined && magic.value.trim() !== authoredText) onAuthoringChanged(); },
  };
}
