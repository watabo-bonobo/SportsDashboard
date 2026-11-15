// 野球の国際試合（侍ジャパン）: NPB 公式の「主な日本代表関連試合」から今年以降の大会ページをたどる
//   大会（アジアプロ野球チャンピオンシップなど）: /apbc/2026/ の「試合日程・結果」表（他国同士の試合も含む）
//   侍ジャパンシリーズ・強化試合: /japan/2026fal/ の日程表と試合結果
// 侍ジャパン公式（japan-baseball.jp）は自動取得の接続を切るため使わない
import * as cheerio from 'cheerio';

export const name = '野球日本代表（NPB）';

export const INDEX_URL = 'https://npb.jp/japan/japan_games.html';

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

// 長い国名は NPB トップページの速報と同じ略し方にして、スマホでも1行に収める
const SHORT = { 侍ジャパン: '日本', チャイニーズ・タイペイ: 'C.タイペイ' };

/** "チャイニーズ・タイペイ代表" → "C.タイペイ"、"侍ジャパン" → "日本" */
export function teamName(text) {
  const t = clean(text).replace(/[○●△]/g, '').replace(/代表$/, '').trim();
  return SHORT[t] ?? t;
}

/** "2026年11月7日（土）" や "11月12日（木）" → "YYYY-MM-DD" */
export function parseDate(text, year) {
  const m = clean(text).match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  return `${m[1] ?? year}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

const withTime = (date, hhmm) => {
  const m = hhmm?.match(/(\d{1,2}):(\d{2})/);
  return m ? `${date}T${m[1].padStart(2, '0')}:${m[2]}:00+09:00` : date;
};

/**
 * 一覧ページから、今年以降の大会ページと、各ページの対戦相手の説明（dd）を取り出す。
 * 新しい順に並んでいるので、去年以前のページが出たところで止める
 */
export function parseIndex(html, now) {
  const $ = cheerio.load(html);
  const year = new Date(now.getTime() + 9 * 3600000).getUTCFullYear();
  const pages = [];
  const seen = new Set();
  $('.contents a[href]').each((_, a) => {
    const href = $(a).attr('href');
    const m = href.match(/^\/(apbc|premier|japan)\/(\d{4})[a-z0-9]*\/$/);
    if (!m || Number(m[2]) < year || seen.has(href)) return;
    seen.add(href);
    const dd = $(a).closest('dt').next('dd');
    pages.push({ url: `https://npb.jp${href}`, kind: m[1] === 'japan' ? 'series' : 'tournament', note: clean(dd.text()) });
  });
  return pages;
}

const pageTitle = ($) => clean($('title').text().split('|')[0]);

/**
 * 大会ページの「試合日程・結果」表。行は 日付・球場・開始・対戦（"A代表 0 - 5 B代表"）・試合結果リンク。
 * 最終日の最後の試合を決勝、その前の試合を3位決定戦とする
 */
export function parseTournament(html, url) {
  const $ = cheerio.load(html);
  const year = url.match(/\/(\d{4})/)?.[1];
  const competition = pageTitle($);
  const events = [];
  $('.line_table tr').each((_, tr) => {
    const td = $(tr).find('td');
    if (td.length < 4) return;
    const date = parseDate(td.eq(0).text(), year);
    const card = clean(td.eq(3).text()).normalize('NFKC');
    const m = card.match(/^(.+?)\s+(?:(\d+)\s*-\s*(\d+)|vs\.?|-)\s+(.+)$/);
    if (!date || !m) return;
    const time = clean(td.eq(2).text());
    const home = teamName(m[1]);
    const away = teamName(m[4]);
    const href = $(tr).find('a[href*="/scores/"]').attr('href');
    const ev = {
      // 決勝などは対戦が決まる前後でチーム名が変わるので、日付と開始時刻で id を付ける
      id: `jpnbb-${date.replace(/-/g, '')}-${(time.match(/\d{1,2}:\d{2}/)?.[0] ?? String(events.length)).replace(':', '')}`,
      sport: 'baseball',
      competition,
      home,
      away,
      start: withTime(date, time),
      venue: clean(td.eq(1).text()) || undefined,
      featured: home === '日本' || away === '日本' || undefined,
      source: href ? new URL(href, url).toString() : url,
    };
    if (m[2] !== undefined) ev.result = { home: Number(m[2]), away: Number(m[3]) };
    events.push(ev);
  });
  const lastDay = events.reduce((d, e) => (e.start > d ? e.start : d), '').slice(0, 10);
  const finals = events.filter((e) => e.start.startsWith(lastDay)).sort((a, b) => (a.start < b.start ? -1 : 1));
  if (events.length > finals.length) {
    finals.at(-1).round = '決勝';
    if (finals.length >= 2) finals.at(-2).round = '3位決定戦';
  }
  return events;
}

/**
 * 一覧の説明 "2026年11月7日（土）、8日（日）　侍ジャパン vs. 千葉ロッテ、広島東洋 （宮崎）" から日付ごとの相手。
 * 日付と相手の数が同じなら順に対応させ、相手が1つなら全日程その相手
 */
export function opponentsByDate(note) {
  const map = new Map();
  for (const line of note.split(/(?=\d{4}年\d{1,2}月)/)) {
    const ym = line.match(/(\d{4})年(\d{1,2})月/);
    const vs = line.match(/vs\.?\s*(.+?)\s*[（(]/);
    if (!ym || !vs) continue;
    const [, y] = ym;
    let month = ym[2];
    const dates = [];
    // "2月22日（日）、23日（月）" や "3月2日（月）～3月3日（火）"
    for (const d of line.slice(0, vs.index).matchAll(/(?:(\d{1,2})月)?(\d{1,2})日/g)) {
      if (d[1]) month = d[1];
      dates.push(`${y}-${month.padStart(2, '0')}-${d[2].padStart(2, '0')}`);
    }
    const teams = vs[1].split(/[、,]/).map((t) => t.trim()).filter(Boolean);
    dates.forEach((d, i) => {
      const t = teams.length === dates.length ? teams[i] : teams.length === 1 ? teams[0] : null;
      if (t) map.set(d, t);
    });
  }
  return map;
}

/** 侍ジャパンシリーズ・強化試合のページ。日程表（第N戦・日付・球場（開始 HH:MM）・放送）と試合結果 */
export function parseSeries(html, url, note = '') {
  const $ = cheerio.load(html);
  const competition = pageTitle($);
  const opponents = opponentsByDate(note);
  // 試合結果（あれば）: 第N戦 → 対戦・スコア
  const results = new Map();
  $('#game_section, [id="game_section"]').each((_, sec) => {
    const s = $(sec);
    const no = clean(s.find('th').first().text());
    const score = clean(s.find('.score').text()).match(/(\d+)\s*-\s*(\d+)/);
    const left = teamName(s.find('.r2 > div').first().text());
    const right = teamName(s.find('.r2 > div').last().text());
    const href = s.find('a[href*="/scores/"]').attr('href');
    if (no && left && right) results.set(no, { left, right, score, href });
  });
  const events = [];
  $('table.schedule_table tr').each((_, tr) => {
    const row = $(tr);
    const no = clean(row.find('th').text()).replace(/[【】]/g, '');
    const td = row.find('td');
    const date = parseDate(td.eq(0).text());
    if (!date) return;
    const place = clean(td.eq(1).text());
    const time = place.match(/開始\s*(\d{1,2}:\d{2})/)?.[1];
    const r = results.get(no);
    const opponent = r ? (r.left === '日本' ? r.right : r.left) : opponents.get(date);
    if (!opponent) return;
    const tv = clean(td.eq(2).text());
    const ev = {
      id: `jpnbb-${date.replace(/-/g, '')}-${time ? time.replace(':', '').padStart(4, '0') : `g${no.match(/\d+/)?.[0] ?? ''}`}`,
      sport: 'baseball',
      competition,
      round: no || undefined,
      home: '日本',
      away: opponent,
      start: withTime(date, time),
      venue: place.replace(/[（(].*$/, '').trim() || undefined,
      broadcasts: tv && !/未定|調整中/.test(tv) ? tv.split(/[、・/]/).map((n) => ({ name: n.trim(), kind: 'tv' })) : undefined,
      featured: true,
      source: r?.href ? new URL(r.href, url).toString() : url,
    };
    if (r?.score) {
      const [a, b] = [Number(r.score[1]), Number(r.score[2])];
      ev.result = r.left === '日本' ? { home: a, away: b } : { home: b, away: a };
    }
    events.push(ev);
  });
  return events;
}

export async function collect(now, fetchText) {
  const pages = parseIndex(await fetchText(INDEX_URL), now);
  const events = [];
  const errors = [];
  for (const page of pages) {
    try {
      const html = await fetchText(page.url);
      events.push(...(page.kind === 'tournament' ? parseTournament(html, page.url) : parseSeries(html, page.url, page.note)));
    } catch (e) {
      errors.push(`${page.url}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!events.length && errors.length) throw new Error(errors.join(' / '));
  return events;
}
