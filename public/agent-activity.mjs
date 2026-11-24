const ROLES = new Set(['intent_parser', 'player_performance', 'roleplay', 'narrator', 'scene_composer', 'character_data']);
const STATUSES = new Set(['idle', 'pending', 'running', 'failed']);
const TASK_STATUSES = new Set(['running', 'completed', 'failed']);
const safeText = value => typeof value === 'string' && value.length > 0 && value.length <= 160
  && !/[\u0000-\u001f\u007f<>]/u.test(value);
function checkedStatus(value) {
  if (!value || !Number.isSafeInteger(value.generation) || value.generation < 1
    || !Number.isSafeInteger(value.revision) || value.revision < 0 || !STATUSES.has(value.status)
    || !Array.isArray(value.activities) || value.activities.length > 8) throw new Error('Invalid activity status.');
  const ids = new Set();
  const activities = value.activities.map(task => {
    if (!task || !safeText(task.id) || ids.has(task.id) || !ROLES.has(task.role)
      || !safeText(task.label) || !safeText(task.operation) || !TASK_STATUSES.has(task.status)) throw new Error('Invalid activity task.');
    ids.add(task.id);
    // Deliberately retain only presentation fields, never arbitrary response data.
    return { id: task.id, role: task.role, label: task.label, operation: task.operation, status: task.status };
  });
  return { generation: value.generation, revision: value.revision, status: value.status, activities };
}

/** Read-only telemetry. Polling can never submit/retry an action or render story.
 * The host version fences delayed responses; leaving the game aborts requests.
 * Timer/fetch injection keeps this contract testable without a browser/provider. */
export function mountAgentActivity(document, { fetchImpl = globalThis.fetch,
  schedule = globalThis.setTimeout, cancel = globalThis.clearTimeout } = {}) {
  const root = document.getElementById('agent-status');
  const label = document.getElementById('agent-status-label');
  const list = document.getElementById('agent-status-activities');
  const note = document.getElementById('agent-status-note');
  const announcement = document.getElementById('agent-status-announcement');
  if (!root || !label || !list || !note || !announcement) return { update() {}, close() {} };
  let scope; let active = false; let working = false; let runtime = 'idle'; let closed = false;
  let timer; let controller; let sequence = 0; let last; let lastView; let lastOptions;
  const idle = () => ({ ...scope, status: 'idle', activities: [] });
  function draw(value, unavailable = false) {
    const pending = value.activities.filter(task => task.status !== 'completed');
    const title = unavailable ? '状态暂不可用' : value.status === 'failed' ? '任务暂停'
      : value.status === 'pending' ? '等待续接'
        : value.status === 'running' ? pending.map(task => task.label).join(' · ') || '整理行动' : '待命';
    root.dataset.status = unavailable ? 'unavailable' : value.status;
    label.textContent = title;
    const rows = value.activities.map(task => {
      const row = document.createElement('li'); row.className = 'agent-status-activity'; row.dataset.status = task.status;
      const name = document.createElement('strong'); name.textContent = task.label;
      const operation = document.createElement('span'); operation.textContent = task.operation;
      const status = document.createElement('small'); status.textContent = ({ completed: '已完成', running: '进行中', failed: '未完成' })[task.status];
      row.append(name, operation, status); return row;
    });
    list.replaceChildren(...rows);
    note.textContent = unavailable ? '暂时无法查看进展。'
      : value.status === 'failed' ? '这次行动暂时停下了。已完成的部分已保留，可手动重试。'
        : value.status === 'pending' ? '行动等待续接。'
          : value.status === 'running' ? '正在续写眼前的故事……' : '等待你的下一步行动。';
    const spoken = `故事 · ${title}`;
    if (announcement.textContent !== spoken) announcement.textContent = spoken;
  }
  function stop() {
    sequence++; cancel(timer); timer = undefined;
    controller?.abort(); controller = undefined;
  }
  function queue(milliseconds) {
    cancel(timer);
    timer = schedule(() => { timer = undefined; void poll(); }, milliseconds);
  }
  async function poll() {
    if (!active || closed || controller) return;
    const token = sequence; const request = new AbortController(); controller = request;
    const timeout = schedule(() => request.abort(), 4000);
    try {
      const response = await fetchImpl('/api/agent-status', { method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: request.signal });
      if (!response.ok) throw new Error('Activity unavailable.');
      const value = checkedStatus(await response.json());
      if (!active || closed || token !== sequence || request.signal.aborted) return;
      if (value.generation !== scope.generation || value.revision !== scope.revision) return;
      last = value; draw(value);
    } catch {
      if (active && !closed && token === sequence) draw(last || idle(), true);
    } finally {
      cancel(timeout);
      if (controller === request) controller = undefined;
      if (active && !closed && token === sequence) queue(working || ['pending', 'running'].includes(last?.status || runtime) ? 700 : 4000);
    }
  }
  function update(view, { visible = false, working: isWorking = false } = {}) {
    if (closed) return;
    lastView = view; lastOptions = { visible, working: isWorking };
    const nextActive = visible && view?.exampleId === 'agent' && document.visibilityState !== 'hidden'
      && Number.isSafeInteger(view.generation) && Number.isSafeInteger(view.revision);
    if (!nextActive) { stop(); active = false; root.hidden = true; return; }
    const changed = !scope || scope.generation !== view.generation || scope.revision !== view.revision;
    const starting = !active; const startedWork = isWorking && !working;
    if (changed || starting) { stop(); scope = { generation: view.generation, revision: view.revision }; last = undefined; }
    active = true; working = isWorking; runtime = view.agentRuntime?.status || 'idle'; root.hidden = false;
    if (!last) draw({ ...idle(), status: STATUSES.has(runtime) ? runtime : 'idle' });
    if (changed || starting || startedWork || timer === undefined && !controller) queue(0);
  }
  const visibilityChanged = () => update(lastView, lastOptions);
  document.addEventListener('visibilitychange', visibilityChanged);
  return { update, close() { closed = true; stop(); root.hidden = true; document.removeEventListener('visibilitychange', visibilityChanged); } };
}
