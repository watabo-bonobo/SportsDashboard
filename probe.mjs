const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); console.log('GET', u, r.status, r.headers.get('content-type')); return r.ok ? r.text() : ''; };
for (const slug of ['kirincupsoccer_2026', '20261117']) {
  const base = `https://www.jfa.jp/samuraiblue/${slug}/schedule_result/`;
  const h = await get(base);
  const k = h.indexOf('scheduleResultAccordion');
  console.log('INL', h.slice(k - 600, k + 900).replace(/\s+/g, ' '));
  const p = h.indexOf('jsonPath = [');
  console.log('JP', h.slice(p, p + 600).replace(/\s+/g, ' '));
  const urls = [...new Set([...h.slice(k - 600, k + 900).matchAll(/['"]((?:https?:)?\/[^'"]+)['"]/g)].map(m => m[1]))];
  for (const u of urls.filter(u => !/\.js$|\.css$/.test(u)).slice(0, 3)) {
    const t = await get(new URL(u, base).toString());
    const g = t.search(/得点|goal|score/i);
    console.log('DATA', u, t.length, t.slice(0, 1500).replace(/\s+/g, ' '));
    console.log('DATAG', t.slice(Math.max(0, g - 300), g + 1500).replace(/\s+/g, ' '));
  }
}
