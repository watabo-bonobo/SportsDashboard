import * as cheerio from 'cheerio';
const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); console.log('GET', u, r.status); return r.text(); };
const live = JSON.parse(await get('https://watabo-bonobo.github.io/SportsDashboard/data/events.json'));
const picks = live.events.filter(e => e.sport === 'soccer' && e.result && (/鹿島/.test((e.home||'')+(e.away||'')) || e.id.startsWith('samurai')));
for (const e of picks) console.log('EV', e.id, e.start, e.home, e.away, JSON.stringify(e.result), e.source);
// jleague match page
const k = picks.filter(e => e.id.startsWith('jl-')).at(-1);
if (k) {
  for (const suffix of ['', 'live/']) {
    const u = k.source.replace(/\/?$/, '/') + suffix;
    const html = await get(u);
    const text = cheerio.load(html)('body').text().replace(/\s+/g, ' ');
    const i = text.search(/得点/);
    console.log('TEXT', suffix, text.length, text.slice(Math.max(0, i - 300), i + 1500));
    for (const m of html.matchAll(/class="[^"]*(goal|score|scorer)[^"]*"/gi)) {}
    const cls = new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].split(' ')).filter(c => /goal|scor|point|tokuten/i.test(c)));
    console.log('CLS', [...cls].join(' '));
    const j = html.search(/得点者|goal/i);
    console.log('RAW', html.slice(Math.max(0, j - 500), j + 3000));
  }
}
// JFA schedule
const jh = await get('https://www.jfa.jp/samuraiblue/schedule_result/2026.html');
const $ = cheerio.load(jh);
$('tr').each((_, tr) => { const r = $(tr); if (r.find('td.date').length) console.log('JROW', r.find('td.date').text().trim(), r.find('td.team').text().trim(), r.find('td.score').text().replace(/\s+/g,' ').trim(), r.find('a').map((_, a) => $(a).attr('href')).get().join(' | ')); });
const played = $('tr').filter((_, tr) => /\d+\s*-\s*\d+/.test($(tr).find('td.score').text())).last();
const hrefs = played.find('a').map((_, a) => new URL($(a).attr('href'), 'https://www.jfa.jp/samuraiblue/schedule_result/2026.html').toString()).get();
console.log('JROWHTML', played.html());
for (const u of hrefs.slice(0, 3)) {
  const h = await get(u);
  const t = cheerio.load(h)('body').text().replace(/\s+/g, ' ');
  const i = t.search(/得点/);
  console.log('JTEXT', u, t.slice(Math.max(0, i - 500), i + 1500));
  const j = h.search(/得点/);
  console.log('JRAW', h.slice(Math.max(0, j - 1500), j + 2500));
}
