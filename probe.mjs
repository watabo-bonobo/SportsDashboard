const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); console.log('GET', u, r.status, r.headers.get('content-type')); return r.ok ? r.text() : ''; };
for (const slug of ['kirincupsoccer_2026', '20261117']) {
  const base = `https://www.jfa.jp/samuraiblue/${slug}/schedule_result/`;
  const h = await get(base);
  for (const m of h.matchAll(/(jsonPath|json|scheduleResultAccordion)[^\n]{0,250}/gi)) console.log('L', m[0].replace(/\s+/g, ' ').slice(0, 260));
  const urls = [...new Set([...h.matchAll(/['"]([^'"]+\.json[^'"]*)['"]/g)].map(m => m[1]))];
  console.log('JSONURLS', urls.join(' '));
  for (const u of urls.slice(0, 2)) {
    const t = await get(new URL(u, base).toString());
    console.log('JSON', u, t.length, t.slice(0, 3500).replace(/\s+/g, ' '));
  }
}
