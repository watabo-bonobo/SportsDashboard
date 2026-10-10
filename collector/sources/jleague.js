// Ｊリーグ公式サイトの「今週の日程・結果」（J1・ルヴァンカップ・天皇杯など）と、
// ACL（エリート・Two）の日程・結果ページ（Ｊクラブが出る試合だけに詳細リンクがある）
import * as cheerio from 'cheerio';
import { mergeEvent } from '../merge.js';
import { enrichStandings, fetchResults } from './jleague-data.js';

export const name = 'Ｊリーグ公式';

const BASE = 'https://www.jleague.jp';

/** 今週分（J1・カップ戦）と ACL のシーズン全日程 */
export const PAGES = [`${BASE}/match/`, `${BASE}/acle/match/`, `${BASE}/acl2/match/`];

/** クラブ一覧が取れなかったときの J1 クラブ（2026-27） */
export const J1_CLUBS = [
  'kashima', 'mito', 'kashiwa', 'chiba', 'urawa', 'ftokyo', 'tokyov', 'machida', 'kawasakif', 'yokohamafm',
  'shimizu', 'nagoya', 'kyoto', 'gosaka', 'cosaka', 'kobe', 'okayama', 'hiroshima', 'fukuoka', 'nagasaki',
];

/**
 * 放送予定ページの絞り込み欄に埋め込まれた J1 クラブの一覧（{"label":"鹿島アントラーズ","value":"kashima"}）を読む。
 * React のデータとしてエスケープされた JSON なので、引用符の前の \ を許す
 */
export function parseJ1Clubs(html) {
  // ページは 1MB 近くあるので、まず J1 グループの位置を探してから、その近くだけを読む
  const start = html.search(/\\?"id\\?":\\?"j1\\?",\\?"(groupLabel|options)/);
  if (start < 0) return [];
  const group = html.slice(start, start + 6000).match(/\\?"options\\?":\[([^\]]*)\]/);
  if (!group) return [];
  return [...new Set([...group[1].matchAll(/\\?"value\\?":\\?"([a-z0-9]+)\\?"/g)].map((m) => m[1]))];
}

/**
 * 「今週の日程」には今週の試合しか載らないため、各 J1 クラブの「日程・結果」ページ（/club/{クラブ}/day/）で
 * 数節先までの試合も集める。同じ試合はホーム・アウェー両方のページに出るので id でまとめる
 */
export async function collect(_now, fetchText) {
  const byId = new Map();
  const add = (events) => events.forEach((e) => byId.set(e.id, mergeEvent(byId.get(e.id), e)));
  const errors = [];
  for (const url of PAGES) {
    try {
      add(parse(await fetchText(url), url));
    } catch (e) {
      errors.push(`${url}: ${e.message}`);
    }
  }
  if (errors.length === PAGES.length) throw new Error(errors.join(' / '));

  let clubs = [];
  try {
    clubs = parseJ1Clubs(await fetchText(`${BASE}/j1/tv/search-list/?category=j1`));
  } catch {
    // 一覧が取れなくても、手元のクラブ一覧で続ける
  }
  if (clubs.length < 10) clubs = J1_CLUBS;
  for (const club of clubs) {
    const url = `${BASE}/club/${club}/day/`;
    try {
      add(parse(await fetchText(url), url));
    } catch {
      // 1クラブ分が取れなくても他のクラブと今週分は使う
    }
  }
  return [...byId.values()];
}

/** href のカテゴリ → 大会名。ここに無いカテゴリ（J2/J3 など）は取り込まない */
export const COMPETITIONS = {
  j1: '明治安田J1リーグ',
  leaguecup: 'ルヴァンカップ',
  emperor: '天皇杯',
  acle: 'ACLエリート',
  acl2: 'ACL Two',
};

/**
 * ACL の試合は「AFCチャンピオンズリーグElite　リーグステージ　ＭＤ2　東地区」という見出しの下に並ぶ。
 * いちばん近い見出しから「リーグステージ MD2」の部分を取り出す
 */
export function aclRound($, box) {
  let node = box.parent();
  for (let i = 0; i < 8 && node.length; i++, node = node.parent()) {
    const head = node.find('.m-section-header__h2-eyebrow--logo-text-container-pc').first();
    if (!head.length) continue;
    const text = head.text().normalize('NFKC').replace(/\s+/g, ' ').trim();
    const round = text.replace(/^AFCチャンピオンズリーグ\S*\s*/, '').replace(/\s*(東|西)地区$/, '').trim();
    return round || undefined;
  }
  return undefined;
}

/**
 * React のストリーミング描画では、後から届いた部分（スコアなど）が
 * <div hidden id="S:n"> としてページ末尾に置かれ、本来の位置は <template id="B:n"> になっている。
 * 元の位置に戻してから読む。
 */
export function resolveStreamedHtml($) {
  // 入れ子になっていることがあるので、差し替えが起きなくなるまで繰り返す
  for (let round = 0; round < 5; round++) {
    let replaced = 0;
    $('div[hidden][id^="S:"]').each((_, el) => {
      const sid = $(el).attr('id');
      const tpl = $(`template[id="B:${sid.slice(2)}"]`);
      if (!tpl.length) return;
      // template の後ろのフォールバック表示（<!--/$--> まで）を取り除く
      let node = tpl[0].next;
      while (node && !(node.type === 'comment' && node.data === '/$')) {
        const next = node.next;
        $(node).remove();
        node = next;
      }
      tpl.replaceWith($(el).html() ?? '');
      $(el).remove();
      replaced++;
    });
    if (!replaced) break;
  }
  return $;
}

/** "DAZN・千葉テレビ" → 放送・配信の配列 */
export function parsePlatforms(text) {
  const NET = /DAZN|Lemino|U-NEXT|ABEMA|TVer|FOD|動画|オンデマンド|YouTube|JFATV|Prime|Hulu|NHKプラス/i;
  const BS = /BS|CS|スカパー|スポーツライブ|フジテレビNEXT|フジテレビTWO|J SPORTS/i;
  return text
    .split(/[・、,\/]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, kind: NET.test(name) ? 'net' : BS.test(name) ? 'bs' : 'tv' }));
}

/** "3PK4" → "PK 3-4"、"延長" はそのまま。同じ表記が重複していても1つにまとめる */
export function parsePenaltyNote(text) {
  let t = text.replace(/\s+/g, '');
  if (!t) return '';
  // 表示用に同じ文字列が2回入っていることがある
  if (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) t = t.slice(0, t.length / 2);
  const pk = t.match(/(\d+)PK(\d+)/);
  if (pk) return `PK ${pk[1]}-${pk[2]}`;
  if (t.includes('延長')) return '延長';
  return t;
}

export function parse(html, url) {
  const $ = resolveStreamedHtml(cheerio.load(html));
  const events = [];
  const seen = new Set();
  $('.m-schedule[id]').each((_, el) => {
    const box = $(el);
    const id = box.attr('id');
    const href = box.find('a[href^="/match/"]').first().attr('href') ?? '';
    const m = href.match(/^\/match\/([a-z0-9]+)\/(\d{4})\/(\d{6})\//);
    if (!m || !/^\d{10}$/.test(id) || seen.has(id)) return;
    const competition = COMPETITIONS[m[1]];
    if (!competition) return;
    seen.add(id);

    const date = `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}`;
    const teamName = (side) => box.find(`.m-schedule__team-${side} .m-schedule__team-name`).first().text().trim();
    const time = box.find('.m-schedule__time-text').first().text().trim();
    const scores = box
      .find('.m-schedule__match-info .m-schedule__score')
      .map((_, s) => $(s).text().trim())
      .get()
      .filter((s) => /^\d+$/.test(s));
    const over = box.hasClass('m-schedule--game-over') || box.find('.m-schedule__game-over-text').length > 0;
    const stadium = box.find('.m-schedule__info-stadium').eq(1).text().trim() || box.find('.m-schedule__info-stadium').first().text().trim();
    const platform = box.find('.m-schedule__info--hidden .m-schedule__info-platform').first().text().trim();
    const pk = parsePenaltyNote(box.find('.m-schedule__penalty').first().text());

    const ev = {
      id: `jl-${m[1]}-${id}`,
      sport: 'soccer',
      competition,
      home: teamName('home'),
      away: teamName('away'),
      start: /^\d{1,2}:\d{2}$/.test(time) ? `${date}T${time.padStart(5, '0')}:00+09:00` : date,
      venue: stadium || undefined,
      broadcasts: platform ? parsePlatforms(platform) : undefined,
      source: new URL(href, url).toString(),
    };
    if (m[1] === 'acle' || m[1] === 'acl2') ev.round = aclRound($, box);
    if (!ev.home || !ev.away) return;
    if (over && scores.length >= 2) {
      ev.result = { home: Number(scores[0]), away: Number(scores[1]) };
      if (pk) ev.result.note = pk;
    }
    events.push(ev);
  });
  return events;
}

/** Ｊリーグ公式の順位表ページ（/j1/standings/）を読む */
export function parseStandings(html) {
  const $ = resolveStreamedHtml(cheerio.load(html));
  const rows = [];
  const num = (row, key) => {
    const t = row.find(`.o-table__cell--${key}`).first().text().replace(/[^\d+-]/g, '');
    return t === '' ? undefined : Number(t);
  };
  $('tr.o-table__row').each((_, tr) => {
    const row = $(tr);
    const names = row.find('.o-table__club-link span');
    // 正式名と略称が並んでいる。略称（2つ目）があればそちらを使う
    const team = (names.eq(1).text() || names.eq(0).text()).trim();
    const rank = num(row, 'ranking');
    if (!team || rank === undefined) return;
    rows.push({
      rank,
      team,
      played: num(row, 'match'),
      win: num(row, 'win') ?? 0,
      draw: num(row, 'draw') ?? 0,
      loss: num(row, 'loss') ?? 0,
      diff: num(row, 'goal-difference'),
      points: num(row, 'point') ?? 0,
    });
  });
  return rows;
}

export async function standings(now, fetchText) {
  const url = 'https://www.jleague.jp/j1/standings/';
  let rows = parseStandings(await fetchText(url));
  if (!rows.length) return [];
  // 直近5試合・順位の推移はデータサイトから。取れなくても順位表は出す
  try {
    rows = enrichStandings(rows, await fetchResults(now, fetchText));
  } catch {
    // 付けずに続ける
  }
  return [{ id: 'jleague-j1', sport: 'soccer', title: '明治安田Ｊ１リーグ', rows, source: url }];
}
