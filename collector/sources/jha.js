// ハンドボール日本代表: 日本ハンドボール協会の活動スケジュール（男子 彗星JAPAN・女子 おりひめジャパン）
// 協会サイトは https で応答しないため http で読む
import * as cheerio from 'cheerio';

export const name = 'ハンドボール日本代表（JHA）';

const BASE = 'http://handball.or.jp';
const TEAMS = [
  { key: 'm', page: 'men', gender: '男子', competition: 'ハンドボール男子日本代表（彗星JAPAN）' },
  { key: 'w', page: 'women', gender: '女子', competition: 'ハンドボール女子日本代表（おりひめジャパン）' },
];
const SKIP = /合宿|遠征|研修|選考/;

const pad = (n) => String(n).padStart(2, '0');

/** "2026/9/19 ～ 9/29" や "2026/06/06 〜 2026/06/16" → { start, end } */
export function parseRange(text) {
  const t = text.replace(/\s/g, '');
  const m = t.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:[～〜~-](?:(\d{4})\/)?(\d{1,2})\/(\d{1,2}))?$/);
  if (!m) return null; // 「12/上旬」など日付が決まっていないもの
  const start = `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  if (!m[5]) return { start };
  const end = `${m[4] ?? m[1]}-${pad(m[5])}-${pad(m[6])}`;
  return { start, end: end < start ? `${Number(m[1]) + 1}-${pad(m[5])}-${pad(m[6])}` : end };
}

/** 大会一覧（game_event_list.php）から、大会ID → 期間 */
export function parseEventList(html) {
  const $ = cheerio.load(html);
  const dates = new Map();
  $('table.content_table tr').each((_, tr) => {
    const td = $(tr).find('td');
    const eid = td.eq(2).find('a').attr('href')?.match(/eid=(\d+)/)?.[1];
    const range = parseRange(td.eq(0).text());
    if (eid && range) dates.set(eid, range);
  });
  return dates;
}

/** 代表チームのページ（活動スケジュール表）から大会を取り出す */
export function parseTeamPage(html, team, dates = new Map()) {
  const $ = cheerio.load(html);
  const events = [];
  $('table.nationalteam_schedule_table tr').each((_, tr) => {
    const td = $(tr).find('td');
    const name = td.eq(1).text().replace(/\s+/g, ' ').trim();
    if (!name || SKIP.test(name)) return;
    const link = td.eq(1).find('a').attr('href');
    const eid = link?.match(/eid=(\d+)/)?.[1];
    const range = parseRange(td.eq(0).text()) ?? (eid ? dates.get(eid) : null);
    if (!range) return;
    const ev = {
      id: `jha-${team.key}-${eid ?? range.start.replace(/-/g, '')}`,
      sport: 'handball',
      competition: team.competition,
      title: name.includes(team.gender) ? name : `${name}（${team.gender}）`,
      start: range.start,
      venue: td.eq(2).text().trim() || undefined,
      featured: true,
      source: eid ? `${BASE}/system/prog/game_event_outline.php?eid=${eid}` : `${BASE}/nationalteam/${team.page}.html`,
    };
    if (range.end && range.end !== range.start) ev.end = range.end;
    events.push(ev);
  });
  return events;
}

export async function collect(_now, fetchText) {
  const dates = parseEventList(await fetchText(`${BASE}/system/prog/game_event_list.php?sd=g&sm=g&ed=i`));
  const events = [];
  for (const team of TEAMS) {
    await new Promise((r) => setTimeout(r, 1000));
    events.push(...parseTeamPage(await fetchText(`${BASE}/nationalteam/${team.page}.html`), team, dates));
  }
  return events;
}
