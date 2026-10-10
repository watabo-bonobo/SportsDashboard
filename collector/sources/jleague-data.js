// Ｊリーグ公式の記録サイト（Ｊリーグ・データサイト）の「日程・結果検索」から、
// J1 の今シーズン全試合の結果を読み、順位表に「直近5試合」と「節ごとの順位」を付ける。
import * as cheerio from 'cheerio';

const BASE = 'https://data.j-league.or.jp';

/** シーズン（8月開幕・翌年5月ごろ閉幕。2026/27 は 2026）の年。7月以降はその年、6月以前は前年 */
export function seasonYear(now) {
  const jst = new Date(now.getTime() + 9 * 3600000);
  return jst.getUTCMonth() >= 6 ? jst.getUTCFullYear() : jst.getUTCFullYear() - 1;
}

/** J1（competition_frame_ids=1）の、そのシーズンの全試合 */
export function resultsUrl(now) {
  return `${BASE}/SFMS01/search?competition_years=${seasonYear(now)}&competition_frame_ids=1`;
}

/** 全角・半角や空白の違いをならしたチーム名（"Ｇ大阪" と "G大阪" を同じに扱う） */
export const teamKey = (s) => s.normalize('NFKC').replace(/\s/g, '');

/**
 * 「日程・結果検索」の表を読む。
 * 列: シーズン, 大会, 節（"第１節第２日"）, 試合日（"26/08/08(土)"）, K/O時刻, ホーム, スコア（"3-4"）, アウェイ, …
 * まだ行われていない試合（スコアが数字でない）は除く
 */
export function parseResults(html) {
  const $ = cheerio.load(html);
  const matches = [];
  $('table tr').each((_, tr) => {
    const cells = $(tr)
      .find('td')
      .map((_, td) => $(td).text().normalize('NFKC').replace(/\s+/g, ' ').trim())
      .get();
    if (cells.length < 8) return;
    const section = cells[2].match(/第(\d+)節/);
    const date = cells[3].match(/(\d{2})\/(\d{2})\/(\d{2})/);
    const score = cells[6].match(/^(\d+)\s*-\s*(\d+)$/);
    if (!section || !date || !score) return;
    matches.push({
      section: Number(section[1]),
      date: `20${date[1]}-${date[2]}-${date[3]}`,
      home: cells[5],
      away: cells[7],
      homeGoals: Number(score[1]),
      awayGoals: Number(score[2]),
    });
  });
  return matches;
}

/** 勝点 → 得失点差 → 総得点 の順で並べた順位表（同じならチーム名順） */
export function computeTable(matches) {
  const table = new Map();
  const row = (name) => {
    const key = teamKey(name);
    if (!table.has(key)) table.set(key, { key, pts: 0, gf: 0, ga: 0, played: 0 });
    return table.get(key);
  };
  for (const m of matches) {
    const h = row(m.home);
    const a = row(m.away);
    h.played++;
    a.played++;
    h.gf += m.homeGoals;
    h.ga += m.awayGoals;
    a.gf += m.awayGoals;
    a.ga += m.homeGoals;
    if (m.homeGoals > m.awayGoals) h.pts += 3;
    else if (m.homeGoals < m.awayGoals) a.pts += 3;
    else {
      h.pts += 1;
      a.pts += 1;
    }
  }
  return [...table.values()].sort(
    (x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || (x.key < y.key ? -1 : 1),
  );
}

/** 各節終了時点の順位（その節までに組まれた試合の結果で計算）。key: チーム名 → 第1節からの順位 */
export function rankHistory(matches) {
  const last = Math.max(0, ...matches.map((m) => m.section));
  const history = new Map();
  for (let n = 1; n <= last; n++) {
    const upto = matches.filter((m) => m.section <= n);
    computeTable(upto).forEach((r, i) => {
      if (!history.has(r.key)) history.set(r.key, []);
      const ranks = history.get(r.key);
      while (ranks.length < n - 1) ranks.push(null);
      ranks.push(i + 1);
    });
  }
  return history;
}

/** チームの直近 count 試合（古い順）。結果はそのチームから見た勝敗 */
export function recentForm(matches, team, count = 5) {
  const key = teamKey(team);
  return matches
    .filter((m) => teamKey(m.home) === key || teamKey(m.away) === key)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.section - b.section))
    .slice(-count)
    .map((m) => {
      const home = teamKey(m.home) === key;
      const [mine, theirs] = home ? [m.homeGoals, m.awayGoals] : [m.awayGoals, m.homeGoals];
      return {
        date: m.date,
        opponent: home ? m.away : m.home,
        home,
        score: `${mine}-${theirs}`,
        outcome: mine > theirs ? 'win' : mine < theirs ? 'loss' : 'draw',
      };
    });
}

/**
 * 順位表の行に直近5試合（form）と節ごとの順位（ranks）を付ける。
 * 最後の節の順位は、試合数が公式の順位表とそろっていれば公式の順位に合わせる（同点時の扱いの違いをなくす）
 */
export function enrichStandings(rows, matches) {
  if (!matches.length) return rows;
  const history = rankHistory(matches);
  const table = computeTable(matches);
  const played = new Map(table.map((r) => [r.key, r.played]));
  const inSync = rows.every((r) => r.played === undefined || played.get(teamKey(r.team)) === r.played);
  return rows.map((r) => {
    const key = teamKey(r.team);
    const ranks = history.get(key);
    if (!ranks) return r;
    const out = { ...r, form: recentForm(matches, r.team), ranks: [...ranks] };
    if (inSync) out.ranks[out.ranks.length - 1] = r.rank;
    return out;
  });
}

export async function fetchResults(now, fetchText) {
  return parseResults(await fetchText(resultsUrl(now)));
}
