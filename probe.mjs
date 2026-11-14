import * as cheerio from 'cheerio';
const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); console.log('GET', u, r.status); return r.ok ? r.text() : ''; };
for (const base of ['20260924', '20260928', 'kirincupsoccer_2026', '20261117']) {
  const top = await get(`https://www.jfa.jp/samuraiblue/${base}/`);
  const $t = cheerio.load(top);
  const links = [...new Set($t('a').map((_, a) => $t(a).attr('href')).get().filter(x => x && /match_page|result/.test(x) && !/news/.test(x)))];
  console.log('LINKS', base, links.join(' '));
  for (const l of links.slice(0, 2)) {
    const u = new URL(l, `https://www.jfa.jp/samuraiblue/${base}/`).toString();
    const h = await get(u);
    const idx = [...h.matchAll(/得点/g)].map(m => m.index);
    console.log('IDX', idx.length);
    for (const j of idx.slice(0, 3)) console.log('AT', j, h.slice(Math.max(0, j - 600), j + 1800).replace(/\s+/g, ' '));
  }
}
