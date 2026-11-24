import { createHash } from 'node:crypto';
// New confirmed executions only. Legacy execution-scene projection is untouched.
export const CASE_EXECUTION_SCENE_VERSION = 2;
export const CASE_EXECUTION_SCENE_REF = 'observed-confirmed-execution@2';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 20);
/** Build real, replayable owner-local events from the confirmed host verdict.
 * No confession, motive, magic outcome, or historical execution is invented.
 * labelFor is evaluated against the pre-execution recognition snapshot. */
export function confirmedExecutionEvents({ verdictId, selectedIds, audienceIds, at, labelFor,
  playerId, firstCaseLeia = false, deferPlayerOutcome = false, executionLifeVersion }) {
  const events = []; const audience = [...new Set(audienceIds)];
  const steps = [
    { id: 'mechanism', offset: 0, text: () => '审判庭中央响起齿轮声，地面沿接缝打开，刑具底座升起。' },
    { id: 'transfer', offset: 30, text: owner => `看守将${selectedIds.map(id => labelFor(owner, id)).join('、')}从席位带向中央，金属拘束逐一合拢。` },
    { id: 'enclosure', offset: 60, text: () => firstCaseLeia
      ? '天使像的外壳从正中展开，蓝蔷薇后露出尖刺；拘束锁紧，两扇外壳缓缓合拢，遮住其中的身影。'
      : '金属隔板升起，遮住刑具内部。机关继续转动，沉重的合响传遍环形席位。' },
    { id: 'completion', offset: 120, text: owner => selectedIds.includes(owner)
      ? deferPlayerOutcome && owner === playerId ? '眼前的光线被金属遮断；身体遭受致命伤害，后续身体与能力结果尚待宿主结算。'
        : '最后一线光被遮断，致命的机关合拢，当前身体的活动停止。'
      : '刑具底座缓缓降入地下，地板重新闭合。看守宣布本次执行程序结束，中央已不见被带走的人。' },
  ];
  if (executionLifeVersion === 1) {
    const mixed = selectedIds.length > 1;
    const genericEnclosure = steps[2].text, genericCompletion = steps[3].text;
    steps[2].text = owner => !mixed || owner === 'hiro'
      ? '特制绞索在刑台上收紧，受刑者被固定在绞刑台上。'
      : selectedIds.includes(owner) ? genericEnclosure(owner)
        : `刑台上的特制绞索收紧，${labelFor(owner, 'hiro')}被固定在绞刑台上；其他受刑者的金属隔板升起，遮住各自刑具内部。`;
    steps[3].text = owner => !mixed || owner === 'hiro'
      ? selectedIds.includes(owner)
        ? '绞索造成致命伤害，当前身体的活动停止；这次执行没有发生死亡回溯。'
        : '绞刑台停止运转，看守宣布执行结束；受刑者没有回来。'
      : selectedIds.includes(owner) ? genericCompletion(owner)
        : '绞刑台与其他刑具停止运转，看守宣布执行结束；被带走的人没有回来。';
  }
  for (const step of steps) for (const ownerId of audience) {
    // Once the enclosure is closed the selected body cannot see/hear other
    // selected people or the courtroom machinery outside its own enclosure.
    const selected = selectedIds.includes(ownerId);
    const observedIds = selected && step.offset >= 60 ? [ownerId] : selectedIds;
    events.push({ text: step.text(ownerId), speakerId: null, speaker: '旁白', delivery: 'action',
      audienceIds: [ownerId], occurredAt: at + step.offset,
      observationKey: `execution-v2:${digest([verdictId, step.id, ownerId])}`,
      executionScene: { version: 2, verdictId, step: step.id,
        observedSubjects: observedIds.map(id => ({ id, label: labelFor(ownerId, id) })) },
      mediaAnchor: { version: 1, kind: 'case_execution', verdictId, step: step.id,
        perspective: selected ? 'selected' : 'witness', ...(firstCaseLeia ? { set: 'angel-enclosure' } : {}) } });
  }
  return events;
}
/** Optional extension gate for future life/ability reducers. This does not
 * revive, reset a clock, consume magic or decide the final outcome. */
export function deferCasePlayerOutcome(state, { subjectId, at, cause, sourceKey }) {
  if (state.caseOutcomeVersion !== 1) return false;
  state.caseOutcome = { version: 1, status: 'pending', subjectId, occurredAt: at, cause, sourceKey };
  state.completed = false; state.phase = 'agent_outcome_pending';
  return true;
}
