// 応援クラブの J1 順位の推移を作る。
// Ｊリーグ公式には節ごとの順位が無いので、集めた J1 の結果から「その試合の日までの順位表」を計算する。
// 古い結果は events.json から落ちる（pruneOld）ため、計算済みの点は前回データから引き継ぐ。

const J1 = '明治安田J1リーグ';

/** 推移を出すクラブ（画面側の KASHIMA と同じ判定） */
export const TRENDS = [{ id: 'kashima-j1', team: '鹿島', is: (s) => s.startsWith('鹿島') }];

const norm = (s) => s.normalize('NFKC').replace(/\s/g, '');

/** シーズン（8月開幕・翌年5月ごろ閉幕）の初日。7月以降はその年、6月以前は前年の7/1 */
export function seasonStart(now) {
  const jst = new Date(now.getTime() + 9 * 3600000);
  const y = jst.getUTCMonth() >= 6 ? jst.getUTCFullYear() : jst.getUTCFullYear() - 1;
  return `${y}-07-01`;
}

/** 勝点 → 得失点差 → 総得点 → 名前 の順で並べた順位（1始まり）を返す */
export function rankOf(results, isTeam) {
  const table = new Map();
  const row = (name) => {
    const key = norm(name);
    if (!table.has(key)) table.set(key, { name, pts: 0, gf: 0, ga: 0, played: 0 });
    return table.get(key);
  };
  for (const e of results) {
    const h = row(e.home);
    const a = row(e.away);
    const { home, away } = e.result;
    h.played++;
    a.played++;
    h.gf += home;
    h.ga += away;
    a.gf += away;
    a.ga += home;
    if (home > away) h.pts += 3;
    else if (home < away) a.pts += 3;
    else {
      h.pts += 1;
      a.pts += 1;
    }
  }
  const rows = [...table.values()].sort(
    (x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || (x.name < y.name ? -1 : 1),
  );
  const i = rows.findIndex((r) => isTeam(r.name));
  return i < 0 ? null : { rank: i + 1, points: rows[i].pts, played: rows[i].played };
}

/**
 * events: 今回の全イベント（前回分と今回収集分を重ねたもの）
 * previous: 前回データの rankTrends
 * standings: 今回の順位表（公式の最新順位で最後の点を補正する）
 */
export function buildRankTrends(events, previous = [], standings = [], now = new Date(), keepDays = 45) {
  const from = seasonStart(now);
  // これより新しい試合は events に周りの結果がそろっているので計算し直す。古い試合は前回の値を使う
  const fresh = new Date(now.getTime() - keepDays * 86400000).toISOString().slice(0, 10);
  const j1 = events
    .filter((e) => e.competition === J1 && e.result && e.home && e.away && e.start.slice(0, 10) >= from)
    .sort((a, b) => (a.start < b.start ? -1 : 1));
  const official = standings.find((t) => t.id === 'jleague-j1');

  return TRENDS.map(({ id, team, is }) => {
    const prev = new Map((previous.find((t) => t.id === id)?.points ?? []).map((p) => [p.matchId, p]));
    const mine = j1.filter((e) => is(e.home) || is(e.away));
    const points = new Map([...prev].filter(([, p]) => p.date >= from));
    for (const e of mine) {
      const date = e.start.slice(0, 10);
      if (date < fresh && points.has(e.id)) continue;
      const upto = j1.filter((r) => r.start.slice(0, 10) <= date);
      const got = rankOf(upto, is);
      if (got) points.set(e.id, { matchId: e.id, date, ...got });
    }
    const list = [...points.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    // 公式の順位表と試合数が合えば、最後の点は公式の順位（同点時の扱いも正確）にする
    const row = official?.rows.find((r) => is(r.team));
    const last = list[list.length - 1];
    if (row && last && row.played === last.played) {
      last.rank = row.rank;
      last.points = row.points ?? last.points;
    }
    return { id, team, title: '明治安田Ｊ１リーグ', points: list };
  }).filter((t) => t.points.length > 0);
}
