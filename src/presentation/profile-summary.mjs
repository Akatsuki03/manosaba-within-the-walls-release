import { createHash } from 'node:crypto';

// The encyclopedia has no omniscient author. A cached entry is a short,
// third-person reading of only the subject's owner-delivered record; the
// original attributed statements remain the authority and stay in records/API.
export const PROFILE_SUMMARY_VERSION = 2;
export const PROFILE_SUMMARY_MAX_CHARS = 160;
export const PROFILE_SUMMARY_MAX_SUBJECTS = 16;
const SOURCE_MAX = 18000;
const META = /本人陈述|内容未自动核实|未自動核實|情报来源|情報來源|故事时间|故事時間|待验证|待驗證|为证实|為證實|当前宿主|當前宿主|未核实|未核實|来源[：:]|來源[：:]/u;
const QUOTES = /[「」『』“”"]/u;
const FIRST_PERSON = /(?:^|[，。；：、\s])我(?:是|的|想|不|会|會|要|在|把|和|也|被|给|給|对|對|从|從|有|没|沒|知|看|听|聽|说|說|写|寫|能|可以|喜欢|喜歡)/u;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/u;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const line = value => typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';

/** Full current owner source. There is deliberately no per-statement slice:
 * a later correction in the same statement must be visible to the summary and
 * to its digest. */
export function profileSummarySource(source, appearance) {
  if (!source || typeof source !== 'object') return [];
  const lines = [];
  if (line(source.name)) lines.push(`姓名：${line(source.name)}`);
  if (line(source.role)) lines.push(`身份：${line(source.role)}`);
  if (source.recognized && line(appearance)) lines.push(`可见外貌：${line(appearance)}`);
  for (const row of Array.isArray(source.statements) ? source.statements : []) {
    if (!line(row?.text)) continue;
    lines.push(`本人陈述${Number.isSafeInteger(row.at) ? `（${row.at}）` : ''}：${line(row.text)}`);
  }
  if (line(source.condition)) lines.push(`已知状态：${line(source.condition)}`);
  if (line(source.cause) && source.cause !== '未获知') lines.push(`已知死因：${line(source.cause)}`);
  return lines;
}

export function profileSummaryHash(source, appearance) {
  // Bind the digest to the complete source object, not only the rendered prose:
  // a withdrawn key, changed kind/time or conditionAt must invalidate the cache
  // even if the visible sentence text happens to be identical.
  return digest({ source, appearance: source?.recognized ? line(appearance) : '' });
}

export function profileSummaryProcessed(state, source, appearance) {
  const id = source?.id; if (typeof id !== 'string') return false;
  const row = state?.profileSummaries?.version === PROFILE_SUMMARY_VERSION
    ? state.profileSummaries.bySubject?.[id] : undefined;
  return row?.sourceHash === profileSummaryHash(source, appearance);
}

export function cachedProfileSummary(state, source, appearance) {
  if (!profileSummaryProcessed(state, source, appearance)) return undefined;
  return state.profileSummaries.bySubject[source.id].text;
}

/** Only changed, meaningful records enter the next batch. An oversized subject
 * is skipped explicitly, never silently truncated to look fully covered. */
export function pendingProfileSummaries(state, records) {
  const profiles = [];
  let chars = 0;
  for (const record of Array.isArray(records) ? records : []) {
    const source = record?.source; const appearance = record?.appearance;
    if (!source || typeof source.id !== 'string') continue;
    const lines = profileSummarySource(source, appearance);
    if (!lines.some(value => value.startsWith('本人陈述') || value.startsWith('已知状态：') || value.startsWith('已知死因：'))) continue;
    const sourceHash = profileSummaryHash(source, appearance);
    if (profileSummaryProcessed(state, source, appearance)) continue;
    const bytes = JSON.stringify({ id: source.id, sourceHash, source: lines }).length;
    if (bytes > SOURCE_MAX) continue;
    if (profiles.length >= PROFILE_SUMMARY_MAX_SUBJECTS || chars + bytes > SOURCE_MAX) continue;
    profiles.push({ id: source.id, name: source.name, sourceHash, source: lines });
    chars += bytes;
  }
  return profiles.length ? { version: PROFILE_SUMMARY_VERSION, profiles } : undefined;
}

export function validateProfileSummaries(entries, context) {
  if (!Array.isArray(entries) || entries.length > PROFILE_SUMMARY_MAX_SUBJECTS) return [];
  const allowed = new Map((Array.isArray(context) ? context : []).map(row => [row.id, row]));
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const keys = Reflect.ownKeys(entry);
    if (keys.length !== 2 || !keys.includes('id') || !keys.includes('text')) continue;
    const { id, text } = entry;
    if (typeof id !== 'string' || typeof text !== 'string' || !allowed.has(id) || seen.has(id)) continue;
    const value = text.trim();
    if (!value || value.length > PROFILE_SUMMARY_MAX_CHARS || CONTROL.test(value) || QUOTES.test(value)
      || META.test(value) || FIRST_PERSON.test(value) || /[\r\n]/u.test(value)) continue;
    seen.add(id); result.push({ id, text: value });
  }
  return result;
}
