import * as cheerio from 'cheerio';
const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } }); console.log('GET', u, r.status); return r.ok ? r.text() : ''; };
for (const base of ['20260924', 'kirincupsoccer_2026', '20261117', 'worldcup_2026']) {
  const h = await get(`https://www.jfa.jp/samuraiblue/${base}/schedule_result/`);
  const $ = cheerio.load(h);
  $('script,style,noscript').remove();
  // 見出しやクラス名の一覧（本文部分）
  const box = $('#contents').length ? $('#contents') : $('body');
  const heads = box.find('h1,h2,h3,h4,h5,th,caption,dt').map((_, e) => $(e).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean);
  console.log('HEADS', [...new Set(heads)].slice(0, 80).join(' | '));
  const cls = [...new Set(box.find('[class]').map((_, e) => $(e).attr('class')).get())];
  console.log('CLS', cls.slice(0, 120).join(' | '));
  // 「得点」を含む一番小さい要素とその親
  box.find('*').filter((_, e) => /得点/.test($(e).clone().children().remove().end().text())).each((i, e) => {
    if (i > 4) return;
    const p = $(e).closest('table,section,div');
    console.log('GOAL', i, e.tagName, $(e).attr('class'), '\n', $.html(p).replace(/\s+/g, ' ').slice(0, 2500));
  });
  // スコアの周り
  const t = box.text().replace(/\s+/g, ' ');
  const k = t.search(/試合結果/);
  console.log('RES', t.slice(Math.max(0, k), k + 800));
}
