// プロ野球: NPB 公式の月別日程（https://npb.jp/games/YYYY/schedule_MM_detail.html）
import * as cheerio from 'cheerio';

export const name = 'プロ野球（NPB）';

const CENTRAL = new Set(['巨人', '阪神', 'DeNA', '中日', '広島', 'ヤクルト']);
const PACIFIC = new Set(['ソフトバンク', '日本ハム', 'オリックス', '楽天', '西武', 'ロッテ']);

export function urls(now) {
  const jst = new Date(now.getTime() + 9 * 3600000);
  const y = jst.getUTCFullYear();
  const m = jst.getUTCMonth() + 1;
  // シーズン（3〜11月）の今月と来月。来月分は公開前だと 404 になるので 10 月まで
  const months = [m, ...(m >= 3 && m <= 10 ? [m + 1] : [])].filter((x) => x >= 3 && x <= 11);
  return months.map((mm) => `https://npb.jp/games/${y}/schedule_${String(mm).padStart(2, '0')}_detail.html`);
}

function leagueOf(home, away) {
  if (CENTRAL.has(home) && CENTRAL.has(away)) return 'セ・リーグ';
  if (PACIFIC.has(home) && PACIFIC.has(away)) return 'パ・リーグ';
  return '交流戦';
}

export function parse(html, url) {
  const $ = cheerio.load(html);
  const year = url.match(/games\/(\d{4})\//)?.[1];
  const events = [];
  const text = (el) => el.text().replace(/\s+/g, '').trim();
  $('tr[id^="date"]').each((_, tr) => {
    const row = $(tr);
    const mmdd = row.attr('id').slice(4);
    const home = text(row.find('.team1'));
    const away = text(row.find('.team2'));
    if (!year || !/^\d{4}$/.test(mmdd) || !home || !away) return;
    if (row.find('.cancel').length) return; // 中止
    const date = `${year}-${mmdd.slice(0, 2)}-${mmdd.slice(2)}`;
    const time = text(row.find('.time')).match(/^(\d{1,2}):(\d{2})/);
    const href = row.find('a[href^="/scores/"]').attr('href');
    const slug = href?.match(/\/scores\/(\d{4})\/(\d{4})\/([\w-]+)\//);
    const comment = text(row.find('.comment'));
    const ev = {
      id: slug ? `npb-${slug[1]}${slug[2]}-${slug[3]}` : `npb-${year}${mmdd}-${home}-${away}`,
      sport: 'baseball',
      competition: 'プロ野球',
      round: leagueOf(home, away),
      home,
      away,
      start: time ? `${date}T${time[1].padStart(2, '0')}:${time[2]}:00+09:00` : date,
      venue: text(row.find('.place')) || undefined,
      source: href ? `https://npb.jp${href}` : url,
    };
    const s1 = text(row.find('.score1'));
    const s2 = text(row.find('.score2'));
    if (/^\d+$/.test(s1) && /^\d+$/.test(s2)) {
      ev.result = { home: Number(s1), away: Number(s2), ...(comment ? { note: comment } : {}) };
    }
    events.push(ev);
  });
  return events;
}
