// MLB: 日本人選手が所属するチームの試合（MLB 公式の公開データ statsapi.mlb.com）
export const name = 'MLB（日本人選手の所属チーム）';

const API = 'https://statsapi.mlb.com/api/v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export const TEAM_JA = {
  108: 'エンゼルス', 109: 'ダイヤモンドバックス', 110: 'オリオールズ', 111: 'レッドソックス',
  112: 'カブス', 113: 'レッズ', 114: 'ガーディアンズ', 115: 'ロッキーズ', 116: 'タイガース',
  117: 'アストロズ', 118: 'ロイヤルズ', 119: 'ドジャース', 120: 'ナショナルズ', 121: 'メッツ',
  133: 'アスレチックス', 134: 'パイレーツ', 135: 'パドレス', 136: 'マリナーズ', 137: 'ジャイアンツ',
  138: 'カージナルス', 139: 'レイズ', 140: 'レンジャーズ', 141: 'ブルージェイズ', 142: 'ツインズ',
  143: 'フィリーズ', 144: 'ブレーブス', 145: 'ホワイトソックス', 146: 'マーリンズ', 147: 'ヤンキース',
  158: 'ブルワーズ',
};

// 表示用の日本語名。載っていない選手は英語名のまま出す
export const PLAYER_JA = {
  660271: '大谷翔平', 808967: '山本由伸', 808963: '佐々木朗希', 673548: '鈴木誠也',
  684007: '今永昇太', 673540: '千賀滉大', 807799: '吉田正尚', 579328: '菊池雄星',
  608372: '菅野智之', 673513: '松井裕樹', 808959: '村上宗隆', 672960: '岡本和真',
  837227: '今井達也', 807747: '西田陸浮', 506433: 'ダルビッシュ有', 673633: '前田健太',
};

const ROUND = {
  R: 'レギュラーシーズン', F: 'ワイルドカードシリーズ', D: '地区シリーズ',
  L: 'リーグ優勝決定シリーズ', W: 'ワールドシリーズ',
};

/** 日本生まれの現役選手を、所属チームごとにまとめる */
export function japaneseByTeam(players) {
  const byTeam = new Map();
  for (const p of players) {
    if (p.birthCountry !== 'Japan' || p.active === false || !p.currentTeam?.id) continue;
    const list = byTeam.get(p.currentTeam.id) ?? [];
    list.push(PLAYER_JA[p.id] ?? p.fullName);
    byTeam.set(p.currentTeam.id, list);
  }
  return byTeam;
}

/** "2026-10-07T22:00:00Z" → "2026-10-08T07:00:00+09:00" */
export function toJst(iso) {
  return new Date(Date.parse(iso) + 9 * 3600000).toISOString().replace(/\.\d+Z$/, '+09:00');
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

/** schedule API の結果を events に変換する */
export function parseSchedule(schedule, byTeam) {
  const events = [];
  for (const day of schedule.dates ?? []) {
    for (const g of day.games ?? []) {
      const home = g.teams?.home?.team;
      const away = g.teams?.away?.team;
      if (!home || !away || !TEAM_JA[home.id] || !TEAM_JA[away.id]) continue; // 対戦相手が未定
      const players = [...(byTeam.get(home.id) ?? []), ...(byTeam.get(away.id) ?? [])];
      if (!players.length) continue;
      const state = g.status?.detailedState ?? '';
      if (/Postponed|Cancelled/.test(state)) continue;
      const postseason = g.gameType !== 'R' && g.gameType !== 'S' && g.gameType !== 'E';
      const round = [ROUND[g.gameType], postseason && g.seriesGameNumber ? `第${g.seriesGameNumber}戦` : '']
        .filter(Boolean)
        .join(' ');
      // 時刻未定の試合は日付だけ。アメリカの日付の翌日が日本の日付になることが多い
      const start = g.status?.startTimeTBD
        ? ymd(new Date(Date.parse(g.officialDate) + DAY_MS))
        : toJst(g.gameDate);
      const ev = {
        id: `mlb-${g.gamePk}`,
        sport: 'baseball',
        competition: 'MLB',
        round: round || undefined,
        home: TEAM_JA[home.id],
        away: TEAM_JA[away.id],
        start,
        venue: g.venue?.name,
        note: `日本人選手：${players.join('、')}`,
        featured: postseason || undefined,
        source: `https://www.mlb.com/gameday/${g.gamePk}`,
      };
      const hs = g.teams.home.score;
      const as = g.teams.away.score;
      if (g.status?.abstractGameState === 'Final' && typeof hs === 'number' && typeof as === 'number') {
        const innings = g.linescore?.currentInning;
        ev.result = { home: hs, away: as, ...(innings > 9 ? { note: `延長${innings}回` } : {}) };
      }
      events.push(ev);
    }
  }
  return events;
}

// 試合と順位表の両方で使うので、1回の収集で選手一覧は1度だけ取る
let japaneseCache;
async function loadJapanese(season, fetchText) {
  if (japaneseCache?.season !== season) {
    const players = fetchText(`${API}/sports/1/players?season=${season}`).then((t) => japaneseByTeam(JSON.parse(t).people ?? []));
    japaneseCache = { season, players };
  }
  return japaneseCache.players;
}

export async function collect(now, fetchText) {
  const season = now.getUTCFullYear();
  const byTeam = await loadJapanese(season, fetchText);
  if (!byTeam.size) return [];
  // 直近3日の結果と、7日先までの予定
  const params = new URLSearchParams({
    sportId: '1',
    teamId: [...byTeam.keys()].join(','),
    startDate: ymd(new Date(now.getTime() - 3 * DAY_MS)),
    endDate: ymd(new Date(now.getTime() + 7 * DAY_MS)),
    hydrate: 'linescore,venue',
  });
  return parseSchedule(JSON.parse(await fetchText(`${API}/schedule?${params}`)), byTeam);
}
