import * as cheerio from 'cheerio';
const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); console.log('GET', u, r.status); return r.ok ? r.text() : ''; };
for (const base of ['kirincupsoccer_2026', '20261117', 'worldcup_2026']) {
  const u0 = `https://www.jfa.jp/samuraiblue/${base}/schedule_result/`;
  const h = await get(u0);
  const $ = cheerio.load(h);
  const links = [...new Set($('a').map((_, a) => $(a).attr('href')).get().filter(x => x && x.includes(base)))];
  console.log('LINKS', base, links.join(' '));
  const sec = h.indexOf('section-block');
  console.log('BODY', h.slice(h.indexOf('shcedule-tournament'), h.indexOf('shcedule-tournament') + 3000).replace(/\s+/g, ' '));
  for (const l of links.filter(x => /match_page|m\d\d/.test(x) && !/pdf/.test(x)).slice(0, 2)) {
    const hh = await get(new URL(l, u0).toString());
    const j = hh.indexOf('scorerLeft');
    console.log('SC', j, hh.slice(Math.max(0, j - 700), j + 500).replace(/\s+/g, ' '));
  }
}
const m = await get('https://www.jfa.jp/samuraiblue/20260924/match_page.html');
const j = m.indexOf('total-score');
console.log('HEAD', m.slice(Math.max(0, j - 1500), j + 200).replace(/\s+/g, ' '));
