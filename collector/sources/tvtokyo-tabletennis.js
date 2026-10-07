// 卓球: テレ東卓球NEWS の大会日程（WTT・ITTF の主な大会）と放送・配信予定
import * as cheerio from 'cheerio';

export const name = 'テレ東卓球';

export function urls() {
  return ['https://www.tv-tokyo.co.jp/tabletennis/tournament/'];
}

/**
 * "10/27［火］-11/1［日］（予定）" → { start, end }
 * 年は書かれていないので、基準日から見て一番近い年を選ぶ
 */
export function parseRange(text, now) {
  const m = text.replace(/［.*?］|（.*?）|\s/g, '').match(/^(\d{1,2})\/(\d{1,2})-(?:(\d{1,2})\/)?(\d{1,2})$/);
  if (!m) return null;
  const nowY = Number(now.toISOString().slice(0, 4));
  const nowM = Number(now.toISOString().slice(5, 7));
  const sm = Number(m[1]);
  let y = nowY;
  if (sm - nowM > 6) y -= 1;
  else if (nowM - sm > 6) y += 1;
  const em = m[3] ? Number(m[3]) : sm;
  const ey = em < sm ? y + 1 : y;
  const d = (yy, mm, dd) => `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return { start: d(y, sm, Number(m[2])), end: d(ey, em, Number(m[4])) };
}

export function slugId(title) {
  return `tt-${title.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase()}`;
}

export function parse(html, url, now) {
  const $ = cheerio.load(html);
  const events = [];
  $('.p-schedule__card').each((_, el) => {
    const card = $(el);
    const title = card.find('.p-schedule__card-title').text().trim();
    const range = parseRange(card.find('.p-schedule__card-date').text(), now);
    if (!title || !range) return;
    const href = card.find('a[href]').attr('href');
    events.push({
      id: slugId(title),
      sport: 'tabletennis',
      competition: /ITTF/.test(title) ? 'ITTF' : 'WTT',
      title,
      start: range.start,
      end: range.end,
      featured: /W杯|ファイナルズ|チャンピオンズ|スマッシュ|世界/.test(title),
      source: href ? new URL(href, url).toString() : url,
    });
  });
  return events;
}
