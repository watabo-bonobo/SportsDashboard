// 鹿島アントラーズのメンバーと不在（代表招集・負傷・出場停止）
//   メンバー・成績: Ｊリーグ公式のクラブ選手一覧と各選手のページ（J1 の出場・得点・アシスト・警告・退場）
//   代表招集・負傷: 鹿島公式サイトのお知らせ（Atom フィード）
//   出場停止: Ｊリーグ公式ニュースの「出場停止選手のお知らせ」
import * as cheerio from 'cheerio';
import { resolveStreamedHtml } from './jleague.js';

export const name = '鹿島メンバー';

const JLEAGUE = 'https://www.jleague.jp';
const SQUAD_URL = `${JLEAGUE}/club/kashima/player/`;
const NEWS_URL = `${JLEAGUE}/j1/news/`;
const ANTLERS = 'https://www.antlers.co.jp';
/** 鹿島公式のお知らせ（チーム情報）の一覧 */
const NOTICE_LIST_URL = `${ANTLERS}/blogs/news/tagged/${encodeURIComponent('チーム情報')}`;
/** 選手ページ（成績）を読み直す間隔。1時間ごとに40人分読むと相手サイトの負担になるので間をあける */
const STATS_TTL_MS = 6 * 3600000;
/** お知らせをさかのぼる日数（長い負傷も拾えるように） */
const NOTICE_DAYS = 180;
const DAY = 86400000;

const clean = (s) => s.normalize('NFKC').replace(/\s+/g, ' ').trim();
/** 名前の照合用（空白の有無・全角半角の違いを無視する） */
export const nameKey = (s) => s.normalize('NFKC').replace(/[\s・]/g, '');
const toInt = (s) => (/^\d+$/.test(s) ? Number(s) : 0);
const jstDate = (d) => new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 10);

/** クラブの選手一覧: 背番号・ポジション・名前・選手ページ */
export function parseSquad(html) {
  const $ = resolveStreamedHtml(cheerio.load(html));
  const players = [];
  const seen = new Set();
  $('a.o-table__player-name-link').each((_, a) => {
    const href = $(a).attr('href') ?? '';
    const id = href.match(/\/player\/(\d+)\//)?.[1];
    if (!id || seen.has(id)) return;
    seen.add(id);
    const info = $(a).closest('.o-table__player-info');
    const m = clean(info.children().first().text()).match(/^(GK|DF|MF|FW)\s*(\d+)?/);
    if (!m) return;
    players.push({
      id,
      number: m[2] ? Number(m[2]) : undefined,
      position: m[1],
      name: clean($(a).text()),
      url: new URL(href, JLEAGUE).toString(),
    });
  });
  return players;
}

/**
 * 選手ページ: 今季 J1 の出場・得点・アシスト（ページ上部の集計）と、
 * 出場履歴の表から J1 の警告・退場の合計と最後に出場した日（全大会）
 */
export function parsePlayer(html) {
  const $ = resolveStreamedHtml(cheerio.load(html));
  const summary = {};
  $('.p-player-details__score-item').each((_, el) => {
    const label = clean($(el).find('.p-player-details__score-label').text());
    summary[label] = toInt(clean($(el).find('.p-player-details__score-text').text()));
  });
  let yellow = 0;
  let red = 0;
  let lastPlayed;
  $('tr.p-player-profile__history-row').each((_, tr) => {
    const cells = $(tr)
      .children('td')
      .map((__, td) => clean($(td).text()))
      .get();
    if (cells.length < 9) return;
    const [date, comp, , , role, , , , cards] = cells;
    const d = date.match(/^(\d{2})\/(\d{1,2})\/(\d{1,2})$/);
    if (d && /先発|サブ/.test(role)) {
      const iso = `20${d[1]}-${d[2].padStart(2, '0')}-${d[3].padStart(2, '0')}`;
      if (!lastPlayed || iso > lastPlayed) lastPlayed = iso;
    }
    const c = cards.match(/^(\d+)\/(\d+)$/);
    if (c && /J1/.test(comp)) {
      yellow += Number(c[1]);
      red += Number(c[2]);
    }
  });
  if (!('出場数' in summary)) throw new Error('成績の欄が見つかりません');
  return { apps: summary['出場数'], goals: summary['ゴール'] ?? 0, assists: summary['アシスト'] ?? 0, yellow, red, lastPlayed };
}

/** "11/9" のような月日を、基準日に近い年の "YYYY-MM-DD" にする */
function monthDay(month, day, base) {
  const y = Number(base.slice(0, 4));
  let iso = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  // 基準日より半年以上前なら翌年（12月の発表で1月の日程を書いている場合）
  if (new Date(iso) < new Date(new Date(base).getTime() - 180 * DAY)) iso = `${y + 1}${iso.slice(4)}`;
  return iso;
}

/** 「A選手、B選手 U-19日本代表選出」などのタイトルから選手名を取り出す */
function namesInTitle(part) {
  return part
    .split(/[、,，]/)
    .map((s) => clean(s.replace(/選手/g, '')))
    .filter(Boolean);
}

/** 鹿島公式のお知らせ一覧（チーム情報）: 記事の URL・タイトル・日付 */
export function parseNewsList(html) {
  const $ = cheerio.load(html);
  return $('a.news-article-card')
    .map((_, a) => {
      const date = clean($(a).find('.news-article-card__date').text()).match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
      return {
        url: new URL($(a).attr('href'), ANTLERS).toString(),
        title: clean($(a).find('.news-article-card__title').text()),
        date: date ? `${date[1]}-${date[2]}-${date[3]}` : undefined,
      };
    })
    .get();
}

/** お知らせ記事: 埋め込みの構造化データ（JSON-LD）からタイトル・本文・公開日 */
export function parseArticle(html) {
  const $ = cheerio.load(html);
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    try {
      const data = JSON.parse($(el).text());
      if (data['@type'] === 'Article' && data.articleBody) {
        return { title: clean(data.headline ?? ''), body: clean(data.articleBody), published: data.datePublished };
      }
    } catch {
      // ほかの JSON-LD は飛ばす
    }
  }
  throw new Error('記事の本文が見つかりません');
}

/** 代表招集・負傷のお知らせか（記事を読みに行くかどうかの判定） */
export const isAbsenceNotice = (title) => /代表.*選出のお知らせ|負傷のお知らせ/.test(title);

/**
 * お知らせ1件から代表招集と負傷を読む。
 * 代表は本文の「（11/9～18＠…）」や「11/14 vs …、11/17 vs …」から期間を取る。
 * 負傷は本文の「10月24日（土）…で負傷」「診断名 …」「全治…／治療期間…」を取る
 */
export function parseNotice({ title, body, announced, url }) {
  const items = [];
  const call = title.match(/^(.+?)\s*((?:U-\d+|U\d+)?\s*日本(?:女子)?代表|フットサル日本代表)\s*(?:メンバー)?\s*選出のお知らせ/);
  if (call) {
    const team = clean(call[2]).replace(/\s/g, '');
    let from;
    let until;
    const range = body.match(/(\d{1,2})\/(\d{1,2})\s*[～〜~-]\s*(?:(\d{1,2})\/)?(\d{1,2})/);
    if (range) {
      from = monthDay(Number(range[1]), Number(range[2]), announced);
      until = monthDay(Number(range[3] ?? range[1]), Number(range[4]), announced);
    } else {
      const days = [...body.matchAll(/(\d{1,2})\/(\d{1,2})\s*(?:\([^)]*\)|（[^）]*）)?\s*vs/g)].map((m) =>
        monthDay(Number(m[1]), Number(m[2]), announced),
      );
      if (days.length) {
        days.sort();
        [from, until] = [days[0], days[days.length - 1]];
      }
    }
    for (const player of namesInTitle(call[1])) {
      items.push({ kind: 'national', player, detail: team, from, until, announced, source: url });
    }
    return items;
  }

  const injury = title.match(/^(.+?)\s*負傷のお知らせ/);
  if (injury) {
    const names = namesInTitle(injury[1]);
    for (const player of names) {
      // 複数人のお知らせは、本文をその選手の名前から次の選手の名前までに区切って読む
      let part = body;
      if (names.length > 1) {
        const at = body.indexOf(player.split(' ')[0]);
        if (at >= 0) {
          const rest = names.filter((n) => n !== player).map((n) => body.indexOf(n.split(' ')[0], at + 1)).filter((i) => i > at);
          part = body.slice(at, rest.length ? Math.min(...rest) : undefined);
        }
      }
      const day = part.match(/(\d{1,2})月(\d{1,2})日[^。]*?負傷/);
      const diagnosis = part.match(/診断名\s*(.+?)(?=\s*(?:※|全治|治療期間|受傷|手術|$|。))/)?.[1];
      const period = part.match(/(全治[^。※]*|治療期間[^。]*)/)?.[1];
      const detail = [diagnosis, period?.replace(/となります$/, '')].filter(Boolean).join('・') || '負傷';
      items.push({
        kind: 'injury',
        player,
        detail,
        from: day ? monthDay(Number(day[1]), Number(day[2]), announced) : announced,
        announced,
        source: url,
      });
    }
  }
  return items;
}

/** ニュース一覧から「出場停止選手のお知らせ」の記事を探す（新しい順） */
export function findSuspensionArticles(html) {
  const $ = cheerio.load(html);
  const urls = [];
  $('a[href*="/news/article/"]').each((_, a) => {
    if (!/出場停止選手のお知らせ/.test($(a).text())) return;
    const url = new URL($(a).attr('href'), JLEAGUE);
    url.search = '';
    if (!urls.includes(url.toString())) urls.push(url.toString());
  });
  return urls;
}

/** 「出場停止選手のお知らせ」の表から鹿島の選手を読む */
export function parseSuspensions(html, url) {
  const $ = resolveStreamedHtml(cheerio.load(html));
  const dateText = clean($('.m-article-module__date').first().text());
  const base = dateText.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  const announced = base ? `${base[1]}-${base[2].padStart(2, '0')}-${base[3].padStart(2, '0')}` : undefined;
  const items = [];
  $('table').each((_, table) => {
    const heads = $(table)
      .find('th')
      .map((__, th) => clean($(th).text()))
      .get();
    const col = (label) => heads.findIndex((h) => h.startsWith(label));
    const [iName, iTeam, iKind, iMatch] = [col('選手'), col('チーム'), col('今回の停止'), col('出場停止試合')];
    if (iName < 0 || iTeam < 0 || iMatch < 0) return;
    $(table)
      .find('tbody tr')
      .each((__, tr) => {
        const cells = $(tr)
          .children('td,th')
          .map((___, td) => clean($(td).text()))
          .get();
        if (cells[iTeam] !== '鹿島') return;
        const match = cells[iMatch];
        const days = [...match.matchAll(/\((\d{1,2})\/(\d{1,2})\)/g)].map((m) =>
          monthDay(Number(m[1]), Number(m[2]), announced ?? '2026-01-01'),
        );
        const kind = iKind >= 0 ? cells[iKind] : '';
        items.push({
          kind: 'suspension',
          player: cells[iName],
          detail: [match.replace(/^[0-9０-９／/]+/, '').replace(/^明治安田/, '').replace(/J1リーグ/, 'J1 ').replace(/\(\d{1,2}\/\d{1,2}\)/g, ''), /\(f\)/.test(kind) ? '警告の累積' : ''].filter(Boolean).join('・'),
          until: days.sort().at(-1),
          announced,
          source: url,
        });
      });
  });
  return items;
}

/**
 * 不在リストを整える。終わったものや、負傷のあとに試合に出た選手、いまの所属にいない選手は外す
 */
export function currentAbsences(items, players, today) {
  const byName = new Map(players.map((p) => [nameKey(p.name), p]));
  const out = [];
  const seen = new Set();
  // 新しい発表を先に見て、同じ選手・同じ種類は新しい方だけ残す
  for (const a of [...items].sort((x, y) => (y.announced ?? '').localeCompare(x.announced ?? ''))) {
    const p = byName.get(nameKey(a.player));
    if (!p) continue;
    const key = `${a.kind}:${p.id}`;
    if (seen.has(key)) continue;
    if (a.kind === 'injury') {
      if (p.lastPlayed && a.from && p.lastPlayed > a.from) continue;
    } else if (a.until && a.until < today) {
      continue;
    } else if (!a.until && a.announced && Date.parse(a.announced) < Date.parse(today) - 14 * DAY) {
      continue;
    }
    seen.add(key);
    out.push({ ...a, player: p.name, playerId: p.id });
  }
  const order = { suspension: 0, injury: 1, national: 2 };
  return out.sort((x, y) => order[x.kind] - order[y.kind] || (x.from ?? x.until ?? '').localeCompare(y.from ?? y.until ?? ''));
}

/** 位置の並び（一覧の表示順） */
const POS_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 };

/**
 * メンバーと不在をまとめて集める。取れなかった部分は前回の値を使う
 * @returns {{ squad: object, report: string[] }}
 */
export async function collectSquad(now, fetchText, previous) {
  const report = [];
  const today = jstDate(now);
  const prevPlayers = new Map((previous?.players ?? []).map((p) => [p.id, p]));

  let roster;
  try {
    roster = parseSquad(await fetchText(SQUAD_URL));
    if (roster.length < 15) throw new Error(`選手が${roster.length}人しか読めませんでした`);
    report.push(`✓ 鹿島メンバー: ${roster.length}人`);
  } catch (e) {
    report.push(`✗ 鹿島メンバー: ${e.message}`);
    if (!previous) return { squad: undefined, report };
    roster = previous.players.map(({ id, number, position, name, url }) => ({ id, number, position, name, url }));
  }

  let refreshed = 0;
  let failed = 0;
  const players = [];
  for (const p of roster) {
    const prev = prevPlayers.get(p.id);
    const fresh = prev?.statsAt && now.getTime() - Date.parse(prev.statsAt) < STATS_TTL_MS;
    let stats = prev && { apps: prev.apps, goals: prev.goals, assists: prev.assists, yellow: prev.yellow, red: prev.red, lastPlayed: prev.lastPlayed, statsAt: prev.statsAt };
    if (!fresh) {
      try {
        stats = { ...parsePlayer(await fetchText(p.url)), statsAt: now.toISOString() };
        refreshed++;
      } catch {
        failed++;
      }
      await new Promise((r) => setTimeout(r, 500)); // 相手サイトに負荷をかけない
    }
    players.push({ ...p, apps: 0, goals: 0, assists: 0, yellow: 0, red: 0, ...stats });
  }
  players.sort((a, b) => POS_ORDER[a.position] - POS_ORDER[b.position] || (a.number ?? 999) - (b.number ?? 999));
  report.push(`${failed ? '✗' : '✓'} 鹿島メンバー（成績）: ${refreshed}人を読み直し${failed ? `・${failed}人失敗` : ''}`);

  // 前回の不在情報（お知らせが一覧から流れても残す）に今回読んだものを重ねる
  const items = [...(previous?.absences ?? [])];
  const addItems = (got) => {
    for (const a of got) {
      const i = items.findIndex((b) => b.kind === a.kind && nameKey(b.player) === nameKey(a.player) && b.source === a.source);
      if (i >= 0) items[i] = a;
      else items.push(a);
    }
  };

  // お知らせ一覧をさかのぼり、まだ読んでいない代表招集・負傷の記事だけを開く
  const checked = new Set(previous?.checked ?? []);
  try {
    const since = jstDate(new Date(now.getTime() - NOTICE_DAYS * DAY));
    const notices = [];
    for (let page = 1; page <= 8; page++) {
      const list = parseNewsList(await fetchText(page === 1 ? NOTICE_LIST_URL : `${NOTICE_LIST_URL}?page=${page}`));
      notices.push(...list.filter((n) => !n.date || n.date >= since));
      if (!list.length || (list.at(-1).date ?? '') < since) break;
    }
    let read = 0;
    for (const n of notices) {
      if (!isAbsenceNotice(n.title) || checked.has(n.url)) continue;
      const article = parseArticle(await fetchText(n.url));
      const announced = article.published ? jstDate(new Date(article.published)) : n.date;
      addItems(parseNotice({ title: article.title || n.title, body: article.body, announced, url: n.url }));
      checked.add(n.url);
      read++;
    }
    report.push(`✓ 鹿島公式のお知らせ（代表・負傷）: 一覧${notices.length}件・新しく${read}件を読みました`);
  } catch (e) {
    report.push(`✗ 鹿島公式のお知らせ（代表・負傷）: ${e.message}`);
  }

  try {
    const urls = findSuspensionArticles(await fetchText(NEWS_URL)).slice(0, 3);
    let count = 0;
    for (const url of urls) {
      const got = parseSuspensions(await fetchText(url), url);
      addItems(got);
      count += got.length;
    }
    report.push(`✓ 出場停止（Ｊリーグ）: 記事${urls.length}件・鹿島${count}人`);
  } catch (e) {
    report.push(`✗ 出場停止（Ｊリーグ）: ${e.message}`);
  }

  const absences = currentAbsences(items, players, today);
  // checked: 読み終えたお知らせ（毎時同じ記事を開き直さないため）
  return { squad: { players, absences, source: SQUAD_URL, checked: [...checked].slice(-300) }, report };
}
