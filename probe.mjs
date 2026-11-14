import * as cheerio from 'cheerio';
import { resolveStreamedHtml } from './collector/sources/jleague.js';
const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); console.log('GET', u, r.status); return r.text(); };
for (const u of ['https://www.jleague.jp/match/leaguecup/2026/111103/', 'https://www.jleague.jp/match/acle/2026/110402/', 'https://www.jleague.jp/match/j1/2026/103110/']) {
  const $ = resolveStreamedHtml(cheerio.load(await get(u)));
  const lists = $('.o-page-header__player-score-list');
  console.log('N', lists.length);
  lists.each((i, el) => console.log('LIST', i, $(el).parent().attr('class'), '\n', $.html(el).slice(0, 3000)));
}
for (const u of ['https://www.jfa.jp/samuraiblue/20261117/', 'https://www.jfa.jp/samuraiblue/20260924/', 'https://www.jfa.jp/samuraiblue/kirincupsoccer_2026/']) {
  const h = await get(u);
  const $ = cheerio.load(h);
  $('script,style,noscript').remove();
  const t = $('body').text().replace(/\s+/g, ' ');
  console.log('LEN', t.length);
  for (const m of t.matchAll(/(得点|ゴール|\d+分|\d+'|’)/g)) { if (m.index) console.log('HIT', m[0], t.slice(Math.max(0, m.index - 150), m.index + 150)); }
  const k = t.search(/試合結果|RESULT/i);
  console.log('RES', t.slice(Math.max(0, k - 200), k + 1500));
  const hrefs = [...new Set($('a').map((_, a) => $(a).attr('href')).get().filter(x => /samuraiblue|match|report|result|pdf/.test(x)))];
  console.log('HREFS', hrefs.slice(0, 60).join(' '));
}
