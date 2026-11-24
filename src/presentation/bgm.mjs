import { readFileSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream';
import { prisonClock } from '../world/prison-activity.mjs';

// Server-only catalog. Never send its titles, cue annotations or full track list
// to a player. Request paths select a fixed catalog entry, not a filesystem path.
const catalog = JSON.parse(readFileSync(new URL('../../data/ost-catalog.json', import.meta.url), 'utf8'));
const oneShotIds = new Set(['d1-01', 'd1-22', 'd2-01', 'd2-19']);
const tracks = new Map();
const assets = new Map();
for (const track of catalog.tracks) {
  if (!/^d[123]-\d{2}$/u.test(track.id) || tracks.has(track.id)
    || track.file !== `public/assets/audio/${track.id}.opus`
    || track.proposedUrl !== `/assets/ost/${track.id}.opus`
    || !Number.isFinite(track.durationSec) || track.durationSec <= 0) {
    throw new Error('Invalid server OST catalog.');
  }
  tracks.set(track.id, Object.freeze({ id: track.id, loop: !oneShotIds.has(track.id), durationSec: track.durationSec }));
  assets.set(track.proposedUrl, fileURLToPath(new URL(`../../${track.file}`, import.meta.url)));
}

// 此同人测试的配乐安排，不是原作逐场核实。按 exampleId/phase
// 显式映射配乐；夜间牢房／走廊与处刑后返回使用宿主时钟／已提交状态，不扫描叙事。
// Loop means repeat the complete CD track: no verified in-game loop points exist.
const sceneTracks = new Map([
  ['emma', new Map([
    ['cell', 'd1-08'], ['unlock', 'd1-08'], ['corridor', 'd1-08'],
    ['intros', 'd1-09'], ['warden', 'd2-09'], ['hiro_warning', 'd2-09'],
    ['ending', 'd1-11'],
  ])],
  ['custom', new Map([
    ['cell', 'd1-08'], ['unlock', 'd1-08'], ['corridor', 'd1-08'],
    ['intros', 'd1-09'], ['hiro_warning', 'd2-09'], ['ending', 'd1-11'],
  ])],
  ['prototype', new Map([['daily', 'd1-09'], ['daily_complete', 'd1-11']])],
  ['agent', new Map([
    ['agent_cell', 'd1-08'], ['agent_cell01', 'd1-08'], ['agent_cell02', 'd1-08'],
    ['agent_cell04', 'd1-08'], ['agent_cell05', 'd1-08'], ['agent_cell06', 'd1-08'],
    ['agent_cell07', 'd1-08'], ['agent_playercell', 'd1-08'], ['agent_corridor', 'd1-08'],
    // Reception ambience is separate from the light/comedic introduction cue.
    ['agent_reception', 'd2-11'],
    ['agent_case_daily', 'd2-11'], ['agent_case_discovery', 'd2-09'],
    ['agent_case_investigation', 'd1-12'], ['agent_case_assembly', 'd2-12'],
    ['agent_case_discussion', 'd3-10'], ['agent_case_ballot', 'd3-04'],
    ['agent_case_execution_ready', 'd1-10'], ['agent_case_aftermath', 'd1-05'], ['agent_case_ending', 'd1-11'],
  ])],
]);

export function bgmForTrack(id) {
  const track = tracks.get(id);
  return track ? { ...track } : null;
}

const cellPhases = new Set(['agent_cell', 'agent_cell01', 'agent_cell02', 'agent_cell04',
  'agent_cell05', 'agent_cell06', 'agent_cell07', 'agent_playercell']);

export function bgmForScene(state) {
  // Only an absent exampleId is the legacy Emma fixture; unknown values stay unknown.
  const exampleId = state?.exampleId === undefined ? 'emma' : state.exampleId;
  let id = sceneTracks.get(exampleId)?.get(state?.phase);
  if (exampleId === 'agent' && id) {
    if ((cellPhases.has(state.phase) || state.phase === 'agent_corridor')
      && Number.isSafeInteger(state.worldTime) && state.worldTime >= 0) {
      const { hour } = prisonClock(state);
      if (hour >= 22 || hour < 6) id = state.phase === 'agent_corridor' ? 'd1-11' : 'd1-17';
    }
    // Every case uses the aftermath cue on its committed return to reception.
    // Later daily actions restore ordinary ambience; prose never selects music.
    const returnedFromExecution = state.caseRuntime?.procedure?.stage === 'aftermath'
      || (state.caseOne?.stage === 'aftermath' && (!state.storyArc || state.storyArc.status === 'aftermath'));
    if (state.phase === 'agent_reception' && !state.completed && returnedFromExecution
      && state.agentActions?.at(-1)?.type === 'case_execution') id = 'd1-05';
  }
  return bgmForTrack(id);
}

// Exactly one byte range. BigInt permits valid very large end/suffix values to
// clamp to EOF without losing precision; malformed and unsatisfiable => null.
export function parseByteRange(value, size) {
  if (typeof value !== 'string' || !Number.isSafeInteger(size) || size <= 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/iu.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const length = BigInt(size);
  let start;
  let end;
  if (!match[1]) {
    const suffix = BigInt(match[2]);
    if (suffix === 0n) return null;
    start = suffix >= length ? 0n : length - suffix;
    end = length - 1n;
  } else {
    start = BigInt(match[1]);
    end = match[2] ? BigInt(match[2]) : length - 1n;
    if (start >= length || end < start) return null;
    if (end >= length) end = length - 1n;
  }
  return { start: Number(start), end: Number(end) };
}

// The optional opener is a filesystem test seam, never derived from HTTP input.
export async function serveBgm(req, res, { openFile = open } = {}) {
  const file = assets.get(req.url);
  if (!file || !['GET', 'HEAD'].includes(req.method)) return false;
  let handle;
  try {
    handle = await openFile(file, 'r');
    const info = await handle.stat();
    if (!info.isFile() || !Number.isSafeInteger(info.size) || info.size < 0) throw new Error('Audio unavailable.');
    if (req.aborted || res.destroyed) return true;
    const range = req.headers.range === undefined ? undefined : parseByteRange(req.headers.range, info.size);
    if (range === null) {
      res.writeHead(416, { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes */${info.size}`, 'Content-Length': 0, 'Cache-Control': 'no-store' });
      res.end();
      return true;
    }
    const headers = {
      'Content-Type': 'audio/ogg',
      'Accept-Ranges': 'bytes',
      'Content-Length': range ? range.end - range.start + 1 : info.size,
      'Cache-Control': 'private, max-age=86400',
    };
    if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${info.size}`;
    const status = range ? 206 : 200;
    if (req.method === 'HEAD' || info.size === 0) {
      res.writeHead(status, headers);
      res.end();
      return true;
    }
    const stream = handle.createReadStream({ ...(range || {}), autoClose: true });
    handle = undefined; // The stream now owns and closes the descriptor.
    res.writeHead(status, headers);
    // pipeline closes both ends on client abort/read failure. The callback
    // consumes errors without sending exception messages or disk paths to HTTP.
    pipeline(stream, res, () => {});
    return true;
  } catch {
    if (!res.headersSent && !res.destroyed) {
      const body = JSON.stringify({ code: 'AUDIO_UNAVAILABLE', error: '背景音乐暂不可用。' });
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } else if (!res.destroyed) res.destroy();
    return true;
  } finally {
    // HEAD, invalid ranges and pre-stream errors still release their descriptor.
    if (handle) await handle.close().catch(() => {});
  }
}
