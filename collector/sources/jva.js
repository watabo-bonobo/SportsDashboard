// バレーボール日本代表: JVA（日本バレーボール協会）の男女チームスケジュール
import * as cheerio from 'cheerio';

export const name = 'バレー日本代表（JVA）';

export function urls(now) {
  const y = now.getUTCFullYear();
  return ['men', 'women'].map((g) => `https://www.jva.or.jp/national_team/${y}/${g}_schedule/`);
}

/** "6/8-6/14" / "7/10" / "7/27-8/2" → { start, end? } */
export function parseJvaRange(text, year) {
  const m = text.replace(/\s/g, '').match(/^(\d{1,2})\/(\d{1,2})(?:-(?:(\d{1,2})\/)?(\d{1,2}))?/);
  if (!m) return null;
  const d = (mm, dd) => `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const start = d(m[1], m[2]);
  if (!m[4]) return { start };
  return { start, end: d(m[3] ?? m[1], m[4]) };
}

// 合宿や紅白戦など、観戦対象でない予定は除く
const SKIP = /合宿|紅白|練習|会見|発表|＊\d*$|^※/;

export function parse(html, url) {
  const $ = cheerio.load(html);
  const year = Number(url.match(/national_team\/(\d{4})\//)?.[1]);
  const gender = url.includes('/women_') ? '女子' : '男子';
  const events = [];
  $('dl.m-scheduleTreeColumn').each((_, el) => {
    const dl = $(el);
    const name = dl.find('.m-scheduleTreeColumn-name').text().replace(/＊\d+/g, '').trim();
    const place = dl.find('.m-scheduleTreeColumn-place').text().replace(/＊\d+/g, '').trim();
    const range = parseJvaRange(dl.find('dt').first().text(), year);
    if (!name || !range || SKIP.test(name)) return;
    const ev = {
      id: `jva-${gender === '女子' ? 'w' : 'm'}-${range.start.replace(/-/g, '')}`,
      sport: 'volleyball',
      competition: `バレーボール${gender}日本代表`,
      title: name.includes(gender) ? name : `${name}（${gender}）`,
      start: range.start,
      venue: place || undefined,
      featured: true,
      source: url,
    };
    if (range.end && range.end !== range.start) ev.end = range.end;
    events.push(ev);
  });
  return events;
}
