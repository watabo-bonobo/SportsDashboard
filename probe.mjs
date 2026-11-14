const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); console.log('GET', u, r.status, r.headers.get('content-type')); return r.ok ? r.text() : ''; };
const js = await get('https://www.jfa.jp/common/js/jquery.jsonSetting.js');
const k = js.indexOf('scheduleResultAccordion');
console.log('FN', js.slice(k, k + 3000).replace(/\s+/g, ' '));
for (const m of js.matchAll(/(getJSON|ajax|url\s*:)[^;]{0,200}/g)) console.log('AJ', m.index, m[0].replace(/\s+/g, ' '));
for (const m of js.matchAll(/scorer|goal|match_page|matchPage/gi)) console.log('KW', m.index, js.slice(m.index - 150, m.index + 200).replace(/\s+/g, ' '));
