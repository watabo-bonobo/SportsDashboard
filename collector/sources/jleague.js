// Ｊリーグ公式サイトの「今週の日程・結果」（J1・ルヴァンカップ・天皇杯など）
import * as cheerio from 'cheerio';

export const name = 'Ｊリーグ公式';

export function urls() {
  return ['https://www.jleague.jp/match/'];
}

/** href のカテゴリ → 大会名。ここに無いカテゴリ（J2/J3 など）は取り込まない */
export const COMPETITIONS = {
  j1: '明治安田J1リーグ',
  leaguecup: 'ルヴァンカップ',
  emperor: '天皇杯',
};

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

export async function standings(_now, fetchText) {
  const url = 'https://www.jleague.jp/j1/standings/';
  const rows = parseStandings(await fetchText(url));
  return rows.length ? [{ id: 'jleague-j1', sport: 'soccer', title: '明治安田Ｊ１リーグ', rows, source: url }] : [];
}
