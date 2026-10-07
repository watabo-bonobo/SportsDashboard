// ハンドボール: リーグＨ（日本のトップリーグ）公式サイトの日程・結果と順位表
import * as cheerio from 'cheerio';

export const name = 'リーグＨ';

const BASE = 'https://leagueh.jp';
const DAY_MS = 24 * 60 * 60 * 1000;

/** シーズンは秋開幕・春閉幕。7月以降はその年、6月までは前年がシーズン年 */
export function seasonOf(y, m) {
  return m >= 7 ? y : y - 1;
}

/** 月のページから、試合のある日を取り出す */
export function parseDays(html) {
  return [...new Set([...html.matchAll(/id="div_day_(\d+)"/g)].map((m) => Number(m[1])))];
}

/** 1日分の試合一覧を読む。date は "YYYY-MM-DD" */
export function parseDay(html, date) {
  const $ = cheerio.load(html);
  const events = [];
  $('#game-list li.col').each((_, li) => {
    const el = $(li);
    const href = el.find('a[href^="/schedule/"]').first().attr('href') ?? '';
    const code = href.match(/\/schedule\/(\w+)\//)?.[1];
    const teams = el.find('.team').map((_, t) => $(t).text().trim()).get();
    if (!code || teams.length < 2) return;
    const span = el.find('.heading a span').first();
    const time = span.find('em').text().trim().match(/^(\d{1,2}):(\d{2})$/);
    span.find('em').remove();
    const venue = span.text().replace(/\s+/g, ' ').trim();
    const stage = el.find('.heading strong').text().replace(/^\S+\s+リーグＨ\s*/, '').trim();
    const gender = /W\d+$/.test(code) ? '女子' : '男子';
    const scores = el
      .find('.score span')
      .map((_, s) => $(s).text().trim())
      .get();
    const movie = el.find('.movie a').attr('href');
    const ev = {
      id: `lh-${code}`,
      sport: 'handball',
      competition: 'リーグＨ',
      round: [gender, stage].filter(Boolean).join(' '),
      home: teams[0],
      away: teams[1],
      start: time ? `${date}T${time[1].padStart(2, '0')}:${time[2]}:00+09:00` : date,
      venue: venue || undefined,
      source: `${BASE}${href}`,
    };
    if (movie) ev.broadcasts = [{ name: 'リーグＨ 試合動画', kind: 'net', url: movie }];
    if (scores.length === 2 && scores.every((s) => /^\d+$/.test(s))) {
      ev.result = { home: Number(scores[0]), away: Number(scores[1]) };
    }
    events.push(ev);
  });
  return events;
}

/** 直近7日の結果と、3週間先までの予定 */
export async function collect(now, fetchText) {
  const jst = new Date(now.getTime() + 9 * 3600000);
  const from = new Date(jst.getTime() - 7 * DAY_MS).toISOString().slice(0, 10);
  const to = new Date(jst.getTime() + 21 * DAY_MS).toISOString().slice(0, 10);
  const months = [];
  for (const d of [new Date(from), new Date(to)]) {
    const key = [d.getUTCFullYear(), d.getUTCMonth() + 1];
    if (!months.some((m) => m[0] === key[0] && m[1] === key[1])) months.push(key);
  }
  const events = [];
  for (const [y, m] of months) {
    const q = `s=${seasonOf(y, m)}&y=${y}&m=${m}`;
    const days = parseDays(await fetchText(`${BASE}/schedule/?${q}`));
    for (const d of days) {
      const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (date < from || date > to) continue;
      await new Promise((r) => setTimeout(r, 1000));
      events.push(...parseDay(await fetchText(`${BASE}/schedule/?${q}&d=${d}`), date));
    }
  }
  return events;
}

/** 順位表ページ。男子・女子の順に表が並ぶ */
export function parseStandings(html) {
  const $ = cheerio.load(html);
  return $('table.ranking-table.league')
    .map((_, table) => {
      const rows = [];
      $(table)
        .find('tbody tr')
        .each((_, tr) => {
          const rank = Number($(tr).find('th').first().text().trim());
          const td = $(tr)
            .find('td')
            .map((_, c) => $(c).text().replace(/\s+/g, ''))
            .get();
          if (!rank || td.length < 9) return;
          rows.push({
            rank,
            team: td[0],
            points: Number(td[1]),
            played: Number(td[2]),
            win: Number(td[3]),
            draw: Number(td[4]),
            loss: Number(td[5]),
            diff: Number(td[8]),
          });
        });
      return [rows];
    })
    .get();
}

export async function standings(_now, fetchText) {
  const url = `${BASE}/rankings/`;
  const tables = parseStandings(await fetchText(url));
  return tables
    .slice(0, 2)
    .map((rows, i) => ({
      id: `leagueh-${i ? 'w' : 'm'}`,
      sport: 'handball',
      title: `リーグＨ ${i ? '女子' : '男子'}`,
      rows,
      source: url,
    }))
    .filter((t) => t.rows.length);
}
