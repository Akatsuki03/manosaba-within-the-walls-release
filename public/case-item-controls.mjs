// World-rule configuration only. Ordinary magic stays in the action text box.
export function mountCaseItemControls(root, { request, getView, onView, isBusy, setBusy, newRequestId }) {
  const status = root.querySelector('[data-case-item-status]');
  const start = root.querySelector('[data-case-item-start]');
  const confirmation = root.querySelector('[data-case-item-confirmation]');
  const confirm = root.querySelector('[data-case-item-confirm]');
  const cancelButton = root.querySelector('[data-case-item-cancel]');
  const refreshButton = root.querySelector('[data-case-item-refresh]');
  let rules, frame, pending, backupSaveId;
  let loading = false, posting = false, confirming = false, failed = false, message = '';
  const sameFrame = view => view && frame && view.generation === frame.generation && view.revision === frame.revision;
  function paint() {
    const locked = loading || posting || isBusy();
    const phase = posting ? 'busy' : loading ? 'loading' : failed ? 'error' : confirming ? 'confirm'
      : rules?.enabled ? 'enabled' : rules?.available ? 'available' : rules ? 'unavailable' : 'loading';
    root.dataset.state = phase;
    status.setAttribute('role', failed ? 'alert' : 'status');
    status.textContent = posting ? '正在备份原档并确认日用品规则，请稍候…' : loading ? '正在核对当前进度与日用品规则…'
      : message || rules?.reason || '正在加载日用品规则…';
    if (backupSaveId && !loading && !posting && !failed) status.textContent += ' 备份编号：' + backupSaveId;
    start.hidden = !rules?.available || confirming;
    start.disabled = locked || !rules?.available;
    confirmation.hidden = !confirming;
    confirm.hidden = !confirming; cancelButton.hidden = !confirming;
    confirm.disabled = locked || !confirming || !rules?.available;
    cancelButton.disabled = locked;
    refreshButton.disabled = locked;
  }
  function sync() {
    if (!loading && !posting && frame && !sameFrame(getView())) {
      confirming = false; pending = undefined; frame = undefined; rules = undefined;
      failed = false; message = '当前进度已变化。请刷新规则状态后重新确认；没有自动启用。';
    }
    paint();
  }
  async function refresh() {
    if (loading || posting || isBusy()) return;
    loading = true; failed = false; message = ''; paint();
    try {
      const view = await request('/api/view');
      const next = await request('/api/case-item-rules');
      if (pending && (pending.expectedGeneration !== view.generation || pending.expectedRevision !== view.revision || next.enabled)) pending = undefined;
      frame = { generation: view.generation, revision: view.revision };
      rules = next; confirming = false;
      onView(view);
    } catch (error) {
      failed = true; message = error.message + ' 未自动执行，可手动刷新状态。';
    } finally { loading = false; paint(); }
  }
  function cancel() {
    if (posting) return;
    confirming = false; failed = false; message = ''; paint();
  }
  start.addEventListener('click', () => {
    if (loading || posting || isBusy() || !rules?.available) return;
    sync(); if (!rules?.available) return;
    confirming = true; failed = false;
    message = '确认后会先新建原档备份，只从现在的节点启用已审核的日用品布置；不改写旧剧情，不会重置角色。';
    paint();
  });
  confirm.addEventListener('click', async () => {
    if (!confirming || loading || posting || isBusy() || !rules?.available) return;
    sync(); if (!confirming || !rules?.available) return;
    pending ||= { requestId: newRequestId(), expectedGeneration: frame.generation,
      expectedRevision: frame.revision, confirmed: true, policy: structuredClone(rules.policy) };
    posting = true; failed = false; setBusy(true); paint();
    try {
      const receipt = await request('/api/case-item-rules/activate', pending);
      onView(receipt.view);
      frame = { generation: receipt.view.generation, revision: receipt.view.revision };
      backupSaveId = receipt.backupSaveId;
      rules = await request('/api/case-item-rules');
      pending = undefined; confirming = false;
      message = receipt.message || '已保留原档备份并启用日用品规则。';
    } catch (error) {
      failed = true; message = error.message + ' 未自动重试。可先刷新状态核对结果，或手动续接同一请求。';
    } finally { posting = false; setBusy(false); paint(); }
  });
  cancelButton.addEventListener('click', cancel);
  refreshButton.addEventListener('click', refresh);
  paint();
  return { root, refresh, sync, cancel };
}
