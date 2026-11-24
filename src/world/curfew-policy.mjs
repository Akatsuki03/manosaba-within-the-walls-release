import { createHash } from 'node:crypto';
import { GUARD_RULES, GUARD_FINGERPRINT } from './guard-rules.mjs';
import { cellSetupLayout } from '../../public/cell-setup-rules.mjs';
import { runtimeCapabilityId } from '../content/runtime-capabilities.mjs';
// Keep the immutable base policy a leaf: importing the reaction/runtime here
// would create an initialization cycle through content-revisions.
const guardEnabled = state => state?.guardReaction?.version === GUARD_RULES.version
  && state.guardReaction.rulesRef === GUARD_RULES.ref && state.guardReaction.fingerprint === GUARD_FINGERPRINT;

// New execution identity only. Never reinterpret sealed v1-v4 actions/pending
// jobs. Source: the immutable life/patrol/timetable rules in prison-world.json.
export const CURFEW_RUNTIME_REVISION = 'agent-prison-runtime@5';
const homes = Object.freeze({ emma: 'CELL', hiro: 'CELL', anan: 'CELL_04', noah: 'CELL_04',
  sherry: 'CELL_01', alisa: 'CELL_01', margo: 'CELL_02', nanoka: 'CELL_02',
  leia: 'CELL_05', milia: 'CELL_05', coco: 'CELL_06', hanna: 'CELL_06', meruru: 'CELL_07' });
const cells = Object.freeze(['CELL', 'CELL_01', 'CELL_02', 'CELL_04', 'CELL_05', 'CELL_06', 'CELL_07', 'PLAYER_CELL']);
export const CURFEW_POLICY = Object.freeze({ version: 1, ref: 'owner-confinement-boundary@1',
  homes, cells, assignment: 'explicit-cell-opening-otherwise-original-assignment; public-opening-never-home',
  freeHours: Object.freeze([[6, 10], [12, 15], [17, 22]].map(Object.freeze)),
  warningSeconds: 75, medicalPermission: 'host-granted-infirmary-only-with-owner-source-and-time',
  illegalWait: 'reject-before-model-or-world-mutation', clock: 'interrupt-before-confinement-and-never-skip-illegal-residence',
  punishment: 'two-days-only-after-actual-guard-discovery; unimplemented-escort-must-not-be-fabricated',
  openingException: 'explicitly-unlocked-public-opening-before-first-0600-only',
  investigationException: 'institutionally-open-investigation-assembly-and-trial',
  displacement: 'paint-event-authorizes-Anan-infirmary-stay-not-reception-or-home-reassignment' });
export const CURFEW_FINGERPRINT = createHash('sha256').update(JSON.stringify(CURFEW_POLICY)).digest('hex');
export const usesCurfewPolicy = state => [CURFEW_RUNTIME_REVISION, 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(state?.agentRuntimeRevision));
const DAY = 86400;
const code = room => cells.includes(room) || ['CORRIDOR', 'RECEPTION', 'INFIRMARY', 'COURT'].includes(room) ? room
  : ({ cell: 'CELL', cell01: 'CELL_01', cell02: 'CELL_02', cell04: 'CELL_04', cell05: 'CELL_05',
    cell06: 'CELL_06', cell07: 'CELL_07', playercell: 'PLAYER_CELL', corridor: 'CORRIDOR', reception: 'RECEPTION',
    infirmary: 'INFIRMARY', court: 'COURT', 牢房: 'CELL', 一号牢房: 'CELL_01', 二号牢房: 'CELL_02',
    四号牢房: 'CELL_04', 五号牢房: 'CELL_05', 六号牢房: 'CELL_06', 七号牢房: 'CELL_07',
    八号牢房: 'PLAYER_CELL', 会客厅: 'RECEPTION', 医务室: 'INFIRMARY', 审判庭: 'COURT', 走廊: 'CORRIDOR' })[room];
export function assignedCell(state, actorId) {
  if (state.creation?.cellSetup) {
    const layout = cellSetupLayout(state.creation.cellSetup, {
      playerMode: state.creation.playerMode, actorId: state.creation.actorId });
    if (layout[actorId]?.cell) return layout[actorId].cell;
  }
  if (actorId === 'player') {
    const opening = state.creation?.opening?.locationId;
    return cells.includes(opening) ? opening : 'PLAYER_CELL';
  }
  // A custom cell opening may select another cell; a public/medical opening
  // does not erase the original prison-number assignment.
  const opening = state.creation?.actorId === actorId && state.creation?.opening?.locationId;
  return cells.includes(opening) ? opening : homes[actorId];
}
export function medicalStayAllowed(state, actorId, at = state.worldTime) {
  const permission = state.confinementPermissions?.[actorId];
  return permission?.version === 1 && permission.room === 'INFIRMARY' && permission.grantedBy === 'warden'
    && typeof permission.sourceKey === 'string' && permission.sourceKey.length > 0
    && Number.isSafeInteger(permission.grantedAt) && permission.grantedAt <= at
    && (permission.until === null || Number.isSafeInteger(permission.until) && permission.until > at);
}
export function confinementRoom(state, actorId, at = state.worldTime) {
  return medicalStayAllowed(state, actorId, at) ? 'INFIRMARY' : assignedCell(state, actorId);
}
export function grantPaintMedicalStay(state, at = state.worldTime) {
  if (!usesCurfewPolicy(state)) return;
  if (!Number.isSafeInteger(at) || at < 0 || at > state.worldTime) throw new Error('Invalid medical permission time');
  state.confinementPermissions ||= {};
  state.confinementPermissions.anan ||= { version: 1, room: 'INFIRMARY', grantedBy: 'warden', grantedAt: at,
    until: null, sourceKey: `story-arc:${state.storyArc?.id || 'case-one-checkpoint'}:paint-medical-permission` };
}
function procedureException(state) {
  const stage = state.caseOne?.stage || state.caseRuntime?.procedure?.stage;
  return ['investigation', 'assembly', 'discussion', 'ballot', 'execution_ready'].includes(stage);
}
const epoch = state => state.caseOne && !state.creation?.storyArcId ? 28800 : state.agentWorld?.startSecond ?? 21540;
const freeAt = (state, at) => {
  const hour = ((epoch(state) + at) % DAY) / 3600;
  return CURFEW_POLICY.freeHours.some(([from, to]) => hour >= from && hour < to);
};
function openingException(state, at) {
  return epoch(state) + at < 21600 && (state.agentWorld?.lockReleased || state.agentDoorOpen);
}
export function lawfulConfinementPlace(state, actorId, room, at = state.worldTime) {
  return actorId === 'warden' || code(room) === assignedCell(state, actorId)
    || code(room) === 'INFIRMARY' && medicalStayAllowed(state, actorId, at);
}
export function confinementApplies(state, at = state.worldTime) {
  return usesCurfewPolicy(state) && !procedureException(state) && !freeAt(state, at) && !openingException(state, at);
}
/** Earliest mandatory-return time intersecting a chosen interval. Includes an
 * already-illegal stay, not just the next day's boundary. Pure, owner-local. */
export function unlawfulResidenceBoundary(state, actorId, room, toTime) {
  if (!usesCurfewPolicy(state) || actorId === 'warden' || procedureException(state)
    || (toTime !== null && !Number.isSafeInteger(toTime)) || (toTime !== null && toTime < state.worldTime)) return null;
  if (toTime === null) {
    const absolute = epoch(state) + state.worldTime;
    toTime = (Math.floor(absolute / DAY) + (absolute % DAY < 21600 ? 0 : 1)) * DAY + 21600 - epoch(state);
  }
  const from = state.worldTime;
  if (confinementApplies(state, from) && !lawfulConfinementPlace(state, actorId, room, from)) return from;
  const candidates = [];
  const first = Math.floor((epoch(state) + from) / DAY);
  const last = Math.floor((epoch(state) + toTime) / DAY);
  for (let day = first; day <= last; day++) for (const hour of [10, 15, 22]) {
    const at = day * DAY + hour * 3600 - epoch(state);
    if (at >= from && at <= toTime) candidates.push(at);
  }
  const expiry = state.confinementPermissions?.[actorId]?.until;
  if (Number.isSafeInteger(expiry) && expiry >= from && expiry <= toTime && confinementApplies(state, expiry)) candidates.push(expiry);
  const futureViolation = candidates.sort((a, b) => a - b).find(at => !lawfulConfinementPlace(state, actorId, room, at));
  if (futureViolation !== undefined) return futureViolation;
  return null;
}
export function assertLawfulLongWait(state, actorId, room, toTime) {
  if (guardEnabled(state)) return; // The shared patrol clock, not a hard stop, adjudicates this risk.
  if (unlawfulResidenceBoundary(state, actorId, room, toTime) !== null
    || usesCurfewPolicy(state) && openingException(state, state.worldTime) && !lawfulConfinementPlace(state, actorId, room)) throw Object.assign(
    new Error('非放风时段必须回所属牢房；医务室只有取得实际许可才能滞留。不能在会客厅或其他公共地点等待过夜。违规被看守发现须送惩罚室禁闭两天，当前不以旁白虚构押送。请先返回牢房。'),
    { code: 'CURFEW_STAY_FORBIDDEN' });
}
/** A clock advance without a chosen return cannot quietly cross confinement.
 * Give a single warning, then stop at the deadline rather than spending the
 * night there or inventing an encounter with an unseen guard. */
export function curfewClockLimit(state, actorId, room, toTime) {
  if (guardEnabled(state)) return null;
  const boundary = unlawfulResidenceBoundary(state, actorId, room, toTime);
  if (boundary === null) return null;
  const warningAt = boundary - CURFEW_POLICY.warningSeconds;
  const at = state.worldTime < warningAt ? warningAt : boundary;
  return { at, deadline: boundary, blocked: at <= state.worldTime };
}
export function curfewScenePolicy(state, actorId, room) {
  if (!usesCurfewPolicy(state)) return undefined;
  const toTime = state.worldTime + 2 * DAY;
  if (guardEnabled(state)) return { version: 1, homeRoom: assignedCell(state, actorId), medicalStayAllowed: medicalStayAllowed(state, actorId),
    returnRequired: false, longWaitAllowed: true, guardEnforced: true,
    instruction: '非放风时段须回所属牢房；医务室须有实际许可。违规行动仍可尝试，实际巡逻发现后须先处理抓捕反应；失败会被押入惩罚室禁闭两天。文字不能改变门锁、许可或骰果。' };
  return { version: 1, homeRoom: assignedCell(state, actorId), medicalStayAllowed: medicalStayAllowed(state, actorId),
    returnRequired: confinementApplies(state) && !lawfulConfinementPlace(state, actorId, room),
    longWaitAllowed: unlawfulResidenceBoundary(state, actorId, room, toTime) === null
      && !(openingException(state, state.worldTime) && !lawfulConfinementPlace(state, actorId, room)),
    instruction: '非放风时段须回所属牢房；医务室须有实际许可。公共地点不能过夜。违规被看守发现罚惩罚室禁闭两天，不能仅凭文字生成许可或押送。' };
}
export const confinementCode = code;
