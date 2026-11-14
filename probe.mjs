const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); console.log('GET', u, r.status, r.headers.get('content-type')); return r.ok ? r.text() : ''; };
const h = await get('https://www.jfa.jp/samuraiblue/kirincupsoccer_2026/schedule_result/');
for (const m of h.matchAll(/<script[^>]*src="([^"]+)"/g)) console.log('SRC', m[1]);
for (const m of h.matchAll(/(\.json|\.js|ajax|getJSON|\$\.get|fetch\()[^\n]{0,200}/g)) console.log('JS', m[0].slice(0, 220));
const j = h.indexOf('js-finalTournament');
for (const m of h.matchAll(/finalTournament[^\n]{0,300}/g)) console.log('FT', m[0]);
for (const p of ['match_page/m02.html', 'schedule_result/match_page/m02.html', 'schedule_result/m02.html', 'match_page_m02.html', 'match_page.html', 'schedule_result/json/schedule_result.json', 'schedule_result/js/schedule_result.json', 'schedule_result/data.json']) {
  const t = await get(`https://www.jfa.jp/samuraiblue/kirincupsoccer_2026/${p}`);
  if (t) { const k = t.indexOf('scorerLeft'); console.log('FOUND', p, t.length, k, t.slice(Math.max(0, k - 200), k + 300).replace(/\s+/g, ' ')); }
}
