// SAMURAI BLUE（サッカー日本代表）: JFA 公式の年間スケジュール表
import * as cheerio from 'cheerio';

export const name = 'SAMURAI BLUE（JFA）';

export function urls(now) {
  const y = Number(now.toISOString().slice(0, 4));
  return [y, y + 1].map((year) => `https://www.jfa.jp/samuraiblue/schedule_result/${year}.html`);
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
