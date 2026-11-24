import { createHash } from 'node:crypto';

// Pure authored inputs only. In particular this module must not import the
// runtime registry: the registry binds its execution identity to these hashes.
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
export const CASE_ONE_KNOWLEDGE_VERSION = 1;
export const CASE_ONE_KNOWLEDGE_REF = 'case-one-source-knowledge@1';
export const CASE_ONE_V2_EVIDENCE = freeze([
  { id: 'body', name: '诺亚的遗体记录', room: 'cell04', description: '诺亚倒在四号牢房的涂绘中央，胸前可见刺入伤，身旁留着带血的箭。眼前遗体周围未见明显挣扎痕迹。' },
  { id: 'paint', name: '无足迹的颜料地面', room: 'cell04', description: '诺亚与门口之间隔着约四米涂有颜料的地面。眼前这片颜料地面未见鞋印，表面可见划痕。' },
  { id: 'arrow', name: '带血的弩箭', room: 'cell04', description: '遗体近旁留着一支带血的短箭，箭杆可见局部压痕。眼前现场未见弩枪。' },
  { id: 'scrape', name: '地板上的刮痕', room: 'cell04', description: '颜料表层可见细而连续的刮痕，局部白色颜料缺失；这些细痕的形状与鞋印不同。' },
  { id: 'broom', name: '拆卸过的扫帚', room: 'hall', description: '清扫工具柜里可见长柄扫帚，扫头与柄已经分离，连接处露在外面。柄上未见可辨认的姓名或标记。' },
  { id: 'ribbon', name: '湖边的发带', room: 'lake', description: '近岸草叶间有一条发带，附着血迹和白色颜料，布面可见褶皱和局部压痕。' },
  { id: 'apple', name: '沾有白色颜料的苹果', room: 'kitchen', description: '厨房收起的苹果上可见一个小孔，孔边附着白色颜料。' },
]);
// These are accepted physical history snapshots of the explicit after-crime
// checkpoint, not fabricated documents that an actor can inspect or read.
export const CASE_ONE_FIXED_SOURCE_SNAPSHOTS = freeze([
  { producer: CASE_ONE_KNOWLEDGE_REF, kind: 'accepted-checkpoint-object-history', event: 'apple-stored',
    objectId: 'apple', room: 'kitchen', sourceKey: 'case-one:checkpoint@2:apple-stored', at: 0 },
]);
export const CASE_ONE_KNOWLEDGE_POLICY = freeze({
  ref: CASE_ONE_KNOWLEDGE_REF, version: CASE_ONE_KNOWLEDGE_VERSION,
  legacyCaseOneHash: 'dc3ca8f08b30fbcbeabeb2ef370f0833d8c369f72c5df6d1672fafd9dd64698e',
  catalogue: CASE_ONE_V2_EVIDENCE,
  roomDescriptions: { hall: '通往屋内的大厅，墙边放着清扫工具柜。', infirmary: '有病床和笔记用品的房间。' },
  fixedSourceSnapshots: CASE_ONE_FIXED_SOURCE_SNAPSHOTS,
  scheduledProducer: 'scheduled-case-one@2',
  physicalSource: 'accepted-fixed-checkpoint-or-completed-authorized-crime',
  appleSource: 'accepted-checkpoint-object-history-or-authorized-stream-and-apple-stored-events',
  quarantined: [
    { id: 'magic-profile', reason: 'no-public-ability-profile-source' },
    { id: 'inventory', reason: 'no-authored-theft-registry' },
    { id: 'stream', reason: 'live-stream-is-not-a-retained-and-delivered-recording' },
  ],
  testimony: 'owner-acquired-materials-or-existing-public-institutional-fallback',
  privateWitnesses: 'owner-local-until-actual-delivered-communication',
  officialNotice: 'delivered-identity-and-death-facts-not-eyewitness-experience',
});
export const CASE_ONE_KNOWLEDGE_FINGERPRINT = digest(CASE_ONE_KNOWLEDGE_POLICY);
export const CASE_ONE_V2_HASH = digest({ ref: 'loop-one-case-one@1',
  legacyCaseOneHash: CASE_ONE_KNOWLEDGE_POLICY.legacyCaseOneHash,
  knowledgeVersion: CASE_ONE_KNOWLEDGE_VERSION, knowledgeFingerprint: CASE_ONE_KNOWLEDGE_FINGERPRINT });

const fixedCheckpoint = state => !state?.creation?.storyArcId
  && ['case-1', 'case-1-execution-test'].includes(state?.creation?.scenarioId);
const validTime = (at, state) => Number.isSafeInteger(at) && at >= 0 && at <= state.worldTime;
function hasAppleSource(state) {
  const snapshots = state.caseOne?.sourceSnapshots;
  if (!Array.isArray(snapshots)) return false;
  if (fixedCheckpoint(state)) return snapshots.some(row => {
    const source = CASE_ONE_FIXED_SOURCE_SNAPSHOTS[0];
    return row && Object.keys(source).every(key => row[key] === source[key]) && validTime(row.at, state);
  });
  const arc = state.storyArc;
  if (!arc?.completedBeats?.includes('stream') || !validTime(arc.streamAt, state)) return false;
  const authorized = event => snapshots.some(row => row?.producer === CASE_ONE_KNOWLEDGE_POLICY.scheduledProducer
    && row.kind === 'authorized-scheduled-event' && row.event === event && row.at === arc.streamAt
    && row.sourceKey === `story-arc:${arc.id}:${event}`
    && (event !== 'apple-stored' || (row.objectId === 'apple' && row.room === 'kitchen')));
  return authorized('stream') && authorized('apple-stored');
}
/** Read-only projection of accepted host history, never extraction from model
 * prose, private witness memories, or a live broadcast's presumed replay. */
export function caseOneV2EvidenceForState(state) {
  if (state?.caseOne?.sourceHash !== CASE_ONE_V2_HASH || state.caseOne.knowledgeVersion !== CASE_ONE_KNOWLEDGE_VERSION) return [];
  const scheduled = state.creation?.storyArcId === 'case-one-day3@1'
    && state.storyArc?.id === state.creation.storyArcId && state.caseOne.scheduledArcVersion === 1
    && state.storyArc?.completedBeats?.includes('crime') && validTime(state.storyArc.crimeAt, state);
  if (!fixedCheckpoint(state) && !scheduled) return [];
  return CASE_ONE_V2_EVIDENCE.filter(item => item.id !== 'apple' || hasAppleSource(state));
}
