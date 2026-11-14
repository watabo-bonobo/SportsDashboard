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

/** 1試合だけの企画（/samuraiblue/20260924/ など）の試合ページ。大会形式のページには無い */
export function matchPageUrl(source) {
  const m = source.match(/^(https:\/\/www\.jfa\.jp\/samuraiblue\/\d{8})\/$/);
  return m ? `${m[1]}/match_page.html` : null;
}

/**
 * 試合ページの得点者（"11分 松木 玖生<br>90+1分 塩貝 健人"）を読む。
 * 左右どちらが日本かは見出しのチーム名で決め、日本をホーム側にそろえる
 */
export function parseGoals(html) {
  const $ = cheerio.load(html);
  const names = $('#score-board-header .flag')
    .map((_, el) => $(el).text().trim())
    .get();
  const japanLeft = names[0] ? names[0] === '日本' : true;
  const read = (cls, side) =>
    ($(`#game-content-wrap .${cls}`).html() ?? '')
      .split(/<br\s*\/?>/i)
      .map((s) => cheerio.load(s).text().normalize('NFKC').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .map((s) => {
        const m = s.match(/^(\d+(?:\+\d+)?)分\s*(.+)$/);
        return m ? { side, player: m[2], minute: `${m[1]}'` } : { side, player: s, minute: '' };
      });
  const left = read('scorerLeft', japanLeft ? 'home' : 'away');
  const right = read('scorerRight', japanLeft ? 'away' : 'home');
  return [...left, ...right].sort((a, b) => (a.side === b.side ? 0 : a.side === 'home' ? -1 : 1));
}

/** 年間スケジュールを読み、ここ60日の結果の出た試合だけ試合ページから得点者を足す（数がスコアと合うときだけ） */
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
  for (const ev of events) {
    const page = ev.result && ev.start >= since && matchPageUrl(ev.source);
    if (!page) continue;
    try {
      const goals = parseGoals(await fetchText(page));
      const count = (side) => goals.filter((g) => g.side === side).length;
      if (count('home') === ev.result.home && count('away') === ev.result.away) ev.goals = goals;
    } catch {
      // 得点者が取れなくても結果は出す
    }
  }
  return events;
}
