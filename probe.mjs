const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); console.log('GET', u, r.status, r.headers.get('content-type')); return r.ok ? r.text() : ''; };
for (const slug of ['kirincupsoccer_2026', '20261117', '20260924']) {
  const t = await get(`https://www.jfa.jp/national_team/samuraiblue/${slug}/match/schedule.json`);
  console.log('SCH', t.slice(0, 2500).replace(/\s+/g, ' '));
}
for (const u of ['https://www.jfa.jp/national_team/samuraiblue/kirincupsoccer_2026/match_page/m02.html', 'https://www.jfa.jp/national_team/samuraiblue/kirincupsoccer_2026/match_page/m04.html', 'https://www.jfa.jp/national_team/samuraiblue/20261117/match_page/m01.html', 'https://www.jfa.jp/national_team/samuraiblue/20261117/match_page/m02.html', 'https://www.jfa.jp/national_team/samuraiblue/20260924/match_page/m01.html']) {
  const h = await get(u);
  const a = h.indexOf('score-board-header'), b = h.indexOf('game-content-wrap');
  console.log('HDR', h.slice(a, a + 700).replace(/\s+/g, ' '));
  console.log('SC', h.slice(b, b + 500).replace(/\s+/g, ' '));
}
