// SAMURAI BLUE（サッカー日本代表）: JFA 公式の年間スケジュール表
import * as cheerio from 'cheerio';

export const name = 'SAMURAI BLUE（JFA）';

export function urls(now) {
  const y = Number(now.toISOString().slice(0, 4));
  // 翌年分のページは年末にならないと公開されないので、12月だけ見に行く
  const years = now.getUTCMonth() === 11 ? [y, y + 1] : [y];
  return years.map((year) => `https://www.jfa.jp/samuraiblue/schedule_result/${year}.html`);
}

/** "10/1(木)" や "2027/1/11(月)" → "YYYY-MM-DD" */
export function parseJfaDate(text, pageYear) {
  const m = text.match(/(?:(\d{4})\/)?(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const y = m[1] ? Number(m[1]) : pageYear;
  return `${y}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

/** "〇2-1" / "●0-1" / "△0-0 PK5-4" → { home, away, note } */
export function parseJfaScore(text) {
  const m = text.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return undefined;
  const pk = text.match(/PK\s*(\d+)\s*-\s*(\d+)/);
  const result = { home: Number(m[1]), away: Number(m[2]) };
  if (pk) result.note = `PK ${pk[1]}-${pk[2]}`;
  return result;
}

export function parse(html, url) {
  const $ = cheerio.load(html);
  const pageYear = Number(url.match(/(\d{4})\.html/)?.[1]);
  const events = [];
  $('tr').each((_, tr) => {
    const row = $(tr);
    const dateText = row.find('td.date').text().trim();
    const team = row.find('td.team').text().trim();
    if (!dateText || !team) return;
    const date = parseJfaDate(dateText, pageYear);
    if (!date) return;
    const comp = row.find('td.comp_name').text().trim();
    const href = row.find('td.comp_name a').attr('href');
    const place = row.find('td.place').text().trim();
    const scoreText = row.find('td.score').text().replace(/\s+/g, ' ').trim();
    const ev = {
      id: `samurai-${date.replace(/-/g, '')}`,
      sport: 'soccer',
      competition: comp || 'サッカー日本代表',
      home: '日本',
      away: team,
      start: date,
      venue: place.replace(/^.*?／/, '') || undefined,
      featured: true,
      source: href ? new URL(href, url).toString() : url,
    };
    const result = parseJfaScore(scoreText);
    if (result) ev.result = result;
    events.push(ev);
  });
  return events;
}

/**
 * 大会ページ（/samuraiblue/kirincupsoccer_2026/ など）ごとに、試合結果ページが読み込む JSON がある。
 * 得点者もここに入っている
 */
export function scheduleJsonUrl(source) {
  const m = source?.match(/^https:\/\/www\.jfa\.jp\/samuraiblue\/([^/]+)\/$/);
  return m ? `https://www.jfa.jp/national_team/samuraiblue/${m[1]}/match/schedule.json` : null;
}

/** "90+1分 塩貝 健人" → { player, minute: "90+1'" } */
function parseScorer(text, side) {
  const s = text.normalize('NFKC').replace(/\s+/g, ' ').trim();
  const m = s.match(/^(\d+(?:\+\d+)?)分\s*(.+)$/);
  return m ? { side, player: m[2], minute: `${m[1]}'` } : { side, player: s, minute: '' };
}

/** schedule.json から、その日の日本の試合の得点者を取り出す。日本をホーム側にそろえる */
export function goalsFromSchedule(json, date) {
  const list = json?.matchScheduleList?.matchSchedule ?? [];
  const day = date.replace(/-/g, '/');
  const match = list.find((m) => (m.matchDateJpn ?? m.matchDate) === day && [m.homeTeamName, m.awayTeamName].includes('日本'));
  if (!match?.scorer) return null;
  const japanHome = match.homeTeamName === '日本';
  const read = (list, side) => (list ?? []).filter(Boolean).map((t) => parseScorer(t, side));
  const home = read(japanHome ? match.scorer.homeScorer : match.scorer.awayScorer, 'home');
  const away = read(japanHome ? match.scorer.awayScorer : match.scorer.homeScorer, 'away');
  return [...home, ...away];
}

/** 年間スケジュールを読み、ここ60日の結果の出た試合だけ得点者を足す（数がスコアと合うときだけ） */
export async function collect(now, fetchText) {
  const events = [];
  const errors = [];
  for (const url of urls(now)) {
    try {
      events.push(...parse(await fetchText(url), url));
    } catch (e) {
      errors.push(`${url}: ${e.message}`);
    }
  }
  if (!events.length && errors.length) throw new Error(errors.join(' / '));
  const since = new Date(now.getTime() - 60 * 86400000).toISOString().slice(0, 10);
  const schedules = new Map();
  for (const ev of events) {
    const url = ev.result && ev.start >= since && scheduleJsonUrl(ev.source);
    if (!url) continue;
    try {
      // 大会形式は同じ JSON に複数試合が入っているので1回だけ読む
      if (!schedules.has(url)) schedules.set(url, JSON.parse(await fetchText(url)));
      const goals = goalsFromSchedule(schedules.get(url), ev.start.slice(0, 10));
      if (!goals) continue;
      const count = (side) => goals.filter((g) => g.side === side).length;
      if (count('home') === ev.result.home && count('away') === ev.result.away) ev.goals = goals;
    } catch {
      schedules.set(url, null);
      // 得点者が取れなくても結果は出す
    }
  }
  return events;
}
