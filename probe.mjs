const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); console.log('GET', u, r.status, r.headers.get('content-type')); return r.ok ? r.text() : ''; };
const base = 'https://www.jfa.jp/samuraiblue/kirincupsoccer_2026/schedule_result/';
const h = await get(base);
const srcs = [...h.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
console.log('SRCS', srcs.join(' '));
const k = h.indexOf('scheduleResultAccordion');
console.log('INLINE', h.slice(k - 1500, k + 1500));
for (const s of srcs.filter(s => /jsonSetting|schedule|result|accordion/i.test(s))) {
  const t = await get(new URL(s, base).toString());
  console.log('FILE', s, t.slice(0, 2500));
}
