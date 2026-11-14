import * as cheerio from 'cheerio';
const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); console.log('GET', u, r.status); return r.ok ? r.text() : ''; };
for (const base of ['20261117', '20260924', 'kirincupsoccer_2026']) {
  const top = await get(`https://www.jfa.jp/samuraiblue/${base}/`);
  const $t = cheerio.load(top);
  const links = [...new Set($t('a').map((_, a) => $t(a).attr('href')).get().filter(x => x && x.includes(base)))];
  console.log('LINKS', links.join(' '));
  for (const u of [`https://www.jfa.jp/samuraiblue/${base}/schedule_result/`, ...links.filter(l => /result|match|report/.test(l)).map(l => new URL(l, 'https://www.jfa.jp/').toString())].slice(0, 3)) {
    const h = await get(u);
    if (!h) continue;
    const $ = cheerio.load(h);
    $('script,style,noscript,header,footer,nav').remove();
    const main = $('#contents, .contents, main, #main').first();
    const t = (main.length ? main : $('body')).text().replace(/\s+/g, ' ');
    const k = t.search(/得点|分[^野]|\d+'|’/);
    console.log('T', u, t.length, '\n', t.slice(Math.max(0, k - 800), k + 2000));
    const j = h.search(/得点/);
    if (j > 0) console.log('RAW', h.slice(Math.max(0, j - 1500), j + 2500));
  }
}
