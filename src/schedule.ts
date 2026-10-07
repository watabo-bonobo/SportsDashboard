import type { Sport, SportEvent } from './types';

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export const SPORT_LABEL: Record<Sport, string> = {
  soccer: 'サッカー',
  volleyball: 'バレー',
  basketball: 'バスケ',
  tabletennis: '卓球',
};

export const SPORT_ICON: Record<Sport, string> = {
  soccer: '⚽',
  volleyball: '🏐',
  basketball: '🏀',
  tabletennis: '🏓',
};

/** 時刻まで決まっているか（日付のみなら時刻未定） */
export function hasTime(e: SportEvent): boolean {
  return e.start.includes('T');
}

/** Date を日本時間の "YYYY-MM-DD" に変換 */
export function jstDateKey(d: Date): string {
  return new Date(d.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** イベントの開始日（日本時間）を "YYYY-MM-DD" で返す */
export function startDateKey(e: SportEvent): string {
  return hasTime(e) ? jstDateKey(new Date(e.start)) : e.start;
}

/** イベントの最終日（日本時間）。単日なら開始日と同じ */
export function endDateKey(e: SportEvent): string {
  return e.end ?? startDateKey(e);
}

/** "YYYY-MM-DD" 同士の日数差（b - a） */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
}

export type Phase = 'finished' | 'ongoing' | 'upcoming';

export function phaseOf(e: SportEvent, now: Date): Phase {
  if (e.result) return 'finished';
  const today = jstDateKey(now);
  if (endDateKey(e) < today) return 'finished';
  if (startDateKey(e) <= today && today <= endDateKey(e) && e.end) return 'ongoing';
  if (hasTime(e) && new Date(e.start).getTime() <= now.getTime()) {
    // キックオフ後・結果未入力。当日中は「進行中/結果待ち」として予定側に残す
    return startDateKey(e) === today ? 'ongoing' : 'finished';
  }
  return 'upcoming';
}

function compareStart(a: SportEvent, b: SportEvent): number {
  const ka = startDateKey(a);
  const kb = startDateKey(b);
  if (ka !== kb) return ka < kb ? -1 : 1;
  // 同日なら時刻未定を後ろに
  if (hasTime(a) !== hasTime(b)) return hasTime(a) ? -1 : 1;
  return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
}

export interface DayGroup {
  date: string;
  events: SportEvent[];
}

export interface Board {
  ongoing: SportEvent[];
  upcoming: DayGroup[];
  results: SportEvent[];
  /** 日本代表など注目試合の次の1件ずつ（競技ごと） */
  nextFeatured: SportEvent[];
}

export interface BoardOptions {
  /** 結果を何日前まで表示するか */
  resultDays?: number;
  /** 予定を何日先まで表示するか */
  upcomingDays?: number;
}

export function buildBoard(events: SportEvent[], now: Date, opts: BoardOptions = {}): Board {
  const { resultDays = 30, upcomingDays = 120 } = opts;
  const today = jstDateKey(now);

  const ongoing: SportEvent[] = [];
  const upcomingList: SportEvent[] = [];
  const results: SportEvent[] = [];

  for (const e of events) {
    const phase = phaseOf(e, now);
    if (phase === 'finished') {
      if (daysBetween(endDateKey(e), today) <= resultDays) results.push(e);
    } else if (phase === 'ongoing') {
      ongoing.push(e);
    } else if (daysBetween(today, startDateKey(e)) <= upcomingDays) {
      upcomingList.push(e);
    }
  }

  upcomingList.sort(compareStart);
  ongoing.sort(compareStart);
  results.sort((a, b) => compareStart(b, a));

  const upcoming: DayGroup[] = [];
  for (const e of upcomingList) {
    const date = startDateKey(e);
    const last = upcoming[upcoming.length - 1];
    if (last && last.date === date) last.events.push(e);
    else upcoming.push({ date, events: [e] });
  }

  const seen = new Set<Sport>();
  const nextFeatured: SportEvent[] = [];
  for (const e of upcomingList) {
    if (e.featured && !seen.has(e.sport)) {
      seen.add(e.sport);
      nextFeatured.push(e);
    }
  }

  return { ongoing, upcoming, results, nextFeatured };
}

/** "10/10(土)" */
export function formatDate(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEKDAYS[d.getUTCDay()]})`;
}

/** "14:00"（日本時間）。時刻未定なら "時間未定" */
export function formatTime(e: SportEvent): string {
  if (!hasTime(e)) return '時間未定';
  const d = new Date(new Date(e.start).getTime() + JST_OFFSET_MS);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function formatPeriod(e: SportEvent): string {
  const s = startDateKey(e);
  const end = endDateKey(e);
  return s === end ? formatDate(s) : `${formatDate(s)}〜${formatDate(end)}`;
}

/** 今日を基準にした相対表記: 「今日」「明日」「あと5日」 */
export function relativeDay(dateKey: string, now: Date): string {
  const diff = daysBetween(jstDateKey(now), dateKey);
  if (diff === 0) return '今日';
  if (diff === 1) return '明日';
  if (diff > 1) return `あと${diff}日`;
  if (diff === -1) return '昨日';
  return `${-diff}日前`;
}

export function eventTitle(e: SportEvent): string {
  if (e.home && e.away) return `${e.home} vs ${e.away}`;
  return e.title ?? e.competition;
}

/** Google カレンダーの「予定を作成」リンク */
export function googleCalendarUrl(e: SportEvent): string {
  const compact = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  let dates: string;
  if (hasTime(e)) {
    const s = new Date(e.start);
    const end = new Date(s.getTime() + 2 * 60 * 60 * 1000);
    dates = `${compact(s.toISOString())}/${compact(end.toISOString())}`;
  } else {
    // 終日予定: 終了日は翌日を指定する仕様
    const endExclusive = new Date(Date.parse(endDateKey(e)) + DAY_MS).toISOString().slice(0, 10);
    dates = `${startDateKey(e).replace(/-/g, '')}/${endExclusive.replace(/-/g, '')}`;
  }
  const details = [
    [e.competition, e.round].filter(Boolean).join(' '),
    e.broadcasts?.length ? `放送・配信: ${e.broadcasts.map((b) => b.name).join(' / ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${SPORT_ICON[e.sport]} ${eventTitle(e)}`,
    dates,
    details,
    location: e.venue ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
