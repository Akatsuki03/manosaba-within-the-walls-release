// A read-only notebook of the current timeline. The host supplies dated,
// player-visible excerpts; this UI never infers story facts or submits actions.
export function mountDailyHistory(document, { getView = () => undefined, canOpen = () => true,
  onJump = () => {}, onOpen = () => {} } = {}) {
  const byId = id => document.getElementById(id);
  const dialog = byId('history-dialog');
  const dayList = byId('history-days');
  const content = byId('history-day-content');
  if (!dialog || !dayList || !content) return undefined;
  const narrators = new Set(['', '旁白', '所见所闻', '系统', '验证说明']);
  let view; let selectedDay; let signature; let renderTicket = 0;
  const days = () => view?.dailyHistory?.version === 1 && Array.isArray(view.dailyHistory.days) ? view.dailyHistory.days : [];
  const scope = value => `${value?.exampleId || ''}:${value?.generation}`;
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function excerpt(item, className) {
    const quote = make('blockquote', undefined, className);
    if (!narrators.has(item.speaker || '')) quote.append(make('cite', item.speaker, 'history-speaker'));
    quote.append(make('p', item.text));
    return quote;
  }
  function paint({ preserve = false, preserveList = preserve } = {}) {
    const nextSignature = JSON.stringify([scope(view), view?.dailyHistory, selectedDay]);
    if (preserve && signature === nextSignature) return;
    signature = nextSignature;
    const ticket = ++renderTicket;
    const scrollTop = preserve ? content.scrollTop : 0;
    const listScroll = preserveList ? dayList.scrollTop : 0;
    const listScrollLeft = preserveList ? dayList.scrollLeft : 0;
    const focusedDay = document.activeElement?.dataset?.historyDay;
    dayList.replaceChildren(); content.replaceChildren();
    const available = days();
    byId('history-count').textContent = available.length ? `共 ${available.length} 天的见闻` : '尚无每日记录';
    byId('history-current').textContent = view?.dailyHistory?.currentDay ? `入狱第 ${view.dailyHistory.currentDay} 天` : '高墙之内';
    for (const day of [...available].reverse()) {
      const button = make('button', undefined, 'history-day-button'); button.type = 'button';
      button.dataset.historyDay = String(day.day);
      button.setAttribute('aria-pressed', String(day.day === selectedDay));
      button.setAttribute('aria-controls', 'history-day-content');
      button.append(make('span', day.current ? 'TODAY · 今日' : 'ARCHIVED · 已归档', 'history-day-state'),
        make('strong', day.label), make('small', `${day.turnCount} 次行动 · ${day.startTime}—${day.endTime}`));
      button.addEventListener('click', () => {
        if (!dialog.open || ticket !== renderTicket) return;
        if (selectedDay === day.day) return;
        selectedDay = day.day; paint({ preserveList: true });
        // Replacing the date list must not strand keyboard focus on a removed button.
        dayList.querySelector(`[data-history-day="${day.day}"]`)?.focus({ preventScroll: true });
      });
      dayList.append(button);
    }
    const day = available.find(item => item.day === selectedDay);
    if (!day) {
      const empty = make('div', undefined, 'history-empty');
      empty.append(make('span', 'THE STORY IS STILL UNWRITTEN', 'history-kicker'),
        make('h3', '此页，等待你的足迹。'), make('p', '故事开始后，亲历的见闻会按天记在这里。'));
      content.append(empty);
    } else {
      const heading = make('div', undefined, 'history-day-heading');
      const title = make('div');
      const headingText = make('h3', day.label); headingText.id = 'history-day-heading';
      title.append(make('span', day.current ? 'A DAY WITHIN THESE WALLS' : 'A PAGE FROM THE PAST', 'history-kicker'), headingText);
      heading.append(title, make('span', day.current ? '今日 · 记录中' : '当日已归档', 'history-status'));
      const meta = make('p', `${day.startTime}—${day.endTime} · ${day.turnCount} 次行动 · ${day.entryCount} 条见闻`, 'history-meta');
      content.append(heading, meta);
      if (day.locations?.length) {
        const places = make('div', undefined, 'history-locations'); places.setAttribute('aria-label', '当日到访地点');
        for (const location of day.locations) places.append(make('span', location));
        content.append(places);
      }
      const digest = make('section', undefined, 'history-digest'); digest.setAttribute('aria-label', '每日总结');
      digest.append(make('h4', '每日总结', 'history-section-title'), make('span', '从当日亲历的剧情中摘录', 'history-digest-note'));
      const highlights = make('ol', undefined, 'history-highlights');
      for (const item of day.summary || []) {
        const row = make('li'); row.append(excerpt(item, 'history-summary-quote')); highlights.append(row);
      }
      if (!highlights.children.length) digest.append(make('p', '这一天还没有新的见闻，空白的纸页静候下一步。', 'history-quiet'));
      else digest.append(highlights);
      content.append(digest);
      const timelineTitle = make('div', undefined, 'history-timeline-heading');
      timelineTitle.append(make('h4', '当日足迹', 'history-section-title'), make('span', '行动与所见，按故事顺序留下。'));
      content.append(timelineTitle);
      const timeline = make('ol', undefined, 'history-moments');
      for (const moment of day.moments || []) {
        const row = make('li', undefined, 'history-moment');
        const time = make('time', moment.time, 'history-moment-time');
        const body = make('div', undefined, 'history-moment-body');
        body.append(make('h5', moment.kind === 'opening' ? '故事开场' : `第 ${moment.floor} 次行动`));
        if (moment.action) {
          const action = make('div', undefined, 'history-action');
          action.append(make('span', '你提交的行动'), make('p', moment.action)); body.append(action);
        }
        for (const item of moment.excerpts || []) body.append(excerpt(item, 'history-moment-quote'));
        const index = moment.entryStart;
        if (Number.isSafeInteger(index) && index >= 0 && index < (view?.entries?.length || 0) && moment.entryEnd > index) {
          const jump = make('button', '回看这段正文', 'history-jump'); jump.type = 'button';
          jump.dataset.historyEntry = String(index); jump.setAttribute('aria-controls', 'log');
          jump.setAttribute('aria-label', `回看${day.label}${moment.kind === 'opening' ? '开场' : `第 ${moment.floor} 次行动`}的正文（不回溯）`);
          jump.addEventListener('click', () => {
            if (!dialog.open || ticket !== renderTicket || !canOpen()) return;
            const anchor = { generation: view.generation, revision: view.revision };
            dialog.close(); onJump(index, anchor);
          });
          body.append(jump);
        }
        row.append(time, body); timeline.append(row);
      }
      if (timeline.children.length) content.append(timeline);
      else content.append(make('p', '还没有留下新的足迹。', 'history-quiet'));
    }
    content.scrollTop = scrollTop; dayList.scrollTop = listScroll; dayList.scrollLeft = listScrollLeft;
    if (preserve && focusedDay !== undefined) dayList.querySelector(`[data-history-day="${focusedDay}"]`)?.focus({ preventScroll: true });
  }
  function update(next) {
    if (!next || view && (next.generation < view.generation || next.generation === view.generation && next.revision < view.revision)) return;
    const changedBranch = scope(view) !== scope(next);
    const previousDay = selectedDay;
    const followToday = selectedDay === view?.dailyHistory?.currentDay;
    view = next;
    if (changedBranch || followToday || !days().some(day => day.day === selectedDay)) selectedDay = days().find(day => day.current)?.day ?? days().at(-1)?.day;
    if (dialog.open) paint({ preserve: !changedBranch && previousDay === selectedDay });
  }
  function open() {
    if (dialog.open || !canOpen() || document.querySelector?.('dialog[open]')) return;
    update(getView());
    if (!view) return;
    selectedDay = days().find(day => day.current)?.day ?? days().at(-1)?.day;
    paint(); dialog.showModal(); onOpen();
  }
  byId('history-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (dialog.open && event.key === 'Escape') { event.preventDefault(); dialog.close(); }
  });
  return { open, update, close: () => dialog.close(), get selectedDay() { return selectedDay; } };
}
