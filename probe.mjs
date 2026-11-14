import * as jfa from './collector/sources/jfa-samuraiblue.js';
import * as jleague from './collector/sources/jleague.js';
const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';
const fetchText = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); };
const now = new Date();
for (const src of [jfa, jleague]) {
  const evs = await src.collect(now, fetchText);
  for (const e of evs.filter(e => e.result && (e.id.startsWith('samurai') || /鹿島/.test(e.home + e.away))))
    console.log('EV', e.id, e.home, e.away, JSON.stringify(e.result), e.goals ? JSON.stringify(e.goals) : 'NO-GOALS');
}
// 鹿島の過去試合ページを直接（クラブページに載らない試合の確認）
for (const u of ['https://www.jleague.jp/match/j1/2026/103110/', 'https://www.jleague.jp/match/j1/2026/102407/', 'https://www.jleague.jp/match/acle/2026/102808/', 'https://www.jleague.jp/match/j1/2026/110709/'])
  console.log('PG', u, JSON.stringify(jleague.parseGoals(await fetchText(u))));
