// Deterministic presentation of an already resolved verdict, not a composer or
// a second execution. Leia's first-case set dressing is adapted from the unpacked
// Act01_Chapter01, 0101Adv35_Narrative024–044 and 0101Adv36_Narrative038–042.
// Do not import her confession, motive, memories, magic or other actors' lines.
export function executionScene({ names, playerSelected = false, firstCaseLeia = false }) {
  const named = names.join('、');
  const opening = '审判庭中央传来低沉的齿轮声。原本平整的地面从接缝处分开，底座缓缓沉下，又托着沉重的刑具升回灯光之中。金属摩擦声沿环形席位绕了一圈，先前的低语停了下来。';
  if (playerSelected) return [
    opening,
    `看守沿着被点名的席位走来。${names.length > 1 ? `那些名字——${named}——还在庭中回响，` : ''}脚步声最后停在我面前。身后的座位越来越远，中央的灯光却越来越近；看守的手没有松开，冰冷的拘束扣住了手腕。`,
    firstCaseLeia
      ? '天使像从正中打开。蓝蔷薇挤在狭窄的内壁间，花瓣背后露出尖刺的冷光。两扇沉重的外壳朝眼前合拢，席位间最后一线光被越挤越细，直到只剩下贴近耳边的机械声。'
      : '刑具的阴影挡住了环形席位，拘束的金属一寸寸收紧。灯光从缝隙里落进来，随着机关移动，变成一道摇晃的细线。',
    '一声沉重的合响盖住了庭中的一切。那线光骤然断开，余下的声音也沉进了黑暗。',
  ];
  const middle = firstCaseLeia ? [
    `底座上立着一尊展开双翼的天使像，脸上仍是安宁的微笑。看守将${named}从席位上架起，带到像前。外壳从正中打开，蓝蔷薇铺满狭窄的内部，花瓣间露出的尖刺却没有半点柔软。`,
    `${named}被固定在天使像中。两扇沉重的外壳缓缓合拢，先遮住肩膀，再遮住脸，只留下越来越窄的一道缝。最后一线身影消失时，锁扣发出了一声闷响。紧接着传出的呼声撞在封闭的金属内壁上，沉沉地压回庭里。`,
    '天使像的底座再次震动，连同紧闭的外壳缓缓降入地下。声音隔着地板延续了片刻，随接缝合拢而消失。原来的台座重新升回中央，灯光照在空处，像那里从未站过人。',
  ] : [
    `看守沿着被点名的席位走过，将${named}带到中央。拘束逐一锁紧，升起的金属隔板遮住了席位与刑具之间的空隙；最后一道锁扣落下后，机关开始转动。`,
    '沉重的撞击声从隔板后传来，拖曳的机械声紧随其后。底座缓缓降入地下，声音也一层层远去，直到地板重新合拢。环形席位之间只剩下空出来的位置，再没有人从中央走回来。',
  ];
  return [opening, ...middle,
    `会客厅的门重新出现在眼前，桌椅仍旧摆在原处。走进门的脚步比来时少了，${named}没有回来。有人停在门边，有人默默让出通路；审判庭里的那阵声响已经听不见了，空下来的位置却仍在那里。`];
}

// Historical commits/receipts keep their original bytes. Only an authenticated
// host execution turn may replace its exact old bookkeeping sentence in the
// disposable transcript. Quoting the same words never grants this projection.
export function projectExecutionEntries({ entries, turns, readBefore, head, playerId, actorName }) {
  let projected = entries;
  for (const [index, turn] of turns.entries()) {
    const action = head.agentActions?.[index];
    if (action?.type !== 'case_execution' || action.sceneVersion !== undefined || turn.entryEnd !== turn.entryStart + 1) continue;
    const before = readBefore(turn.id); const after = turns[index + 1] ? readBefore(turns[index + 1].id) : head;
    const fixed = before?.caseOne?.stage === 'execution_ready';
    const source = fixed ? before.caseOne : before?.caseRuntime?.procedure;
    const result = fixed ? after?.caseOne : after?.caseRuntime?.procedure;
    const selected = source?.verdict?.selectedIds;
    const ended = Array.isArray(selected) && selected.includes(playerId(before));
    if (source?.stage !== 'execution_ready' || source.verdict?.id !== action.verdictId
      || !Array.isArray(selected) || !selected.length || new Set(selected).size !== selected.length
      || result?.stage !== (ended ? 'ending' : 'aftermath') || after.worldTime !== before.worldTime + 120
      || JSON.stringify(result.executedIds) !== JSON.stringify(selected)) continue;
    const canonical = head.entries?.[turn.entryStart]; const entry = entries[turn.entryStart];
    const names = selected.map(id => actorName(before, id));
    if (names.some(name => typeof name !== 'string' || !name.trim())
      || canonical?.speaker !== '旁白' || canonical.delivery !== 'action' || canonical.speakerId
      || entry?.id !== canonical.id || entry.text !== canonical.text
      || canonical.text !== legacyExecutionNotice(names, ended, !fixed)) continue;
    if (projected === entries) projected = entries.slice();
    projected[turn.entryStart] = { ...entry, delivery: 'narration', text: executionScene({ names, playerSelected: ended,
      firstCaseLeia: fixed && selected.length === 1 && selected[0] === 'leia' }).join('\n\n') };
  }
  return projected;
}

export function legacyExecutionNotice(names, ended, causal = false) {
  return `玩家已确认阶段推进，判决的执行程序结束。执行对象：${names.join('、')}。` + (ended
    ? `你的角色已被执行，当前视角停止；没有自动复活${causal ? '、重置时间或' : '或'}把技术读档当作魔法。`
    : causal ? '幸存者返回会客厅，同一世界的日常活动重新开放。案件、证词、判决与每个人的实际见闻继续保留；死亡或已执行者不再参加活动。'
      : '幸存者返回会客厅，日常活动重新开放。此前的案件记录、证词、判决与每个人的见闻继续保留，执行对象不再参加日常活动。');
}
