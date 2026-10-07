// 各サイトから試合情報を集め、前回のデータに重ねて events.json を書き出す。
//   node collector/collect.js <前回データのURLかパス> <出力パス>
// どれかのサイトの取得や解析に失敗しても、他のサイトの結果と前回データで出力する。
import { readFile, writeFile } from 'node:fs/promises';
import { mergeEvents, pruneOld } from './merge.js';
import { SOURCES } from './sources/index.js';

const UA = 'Mozilla/5.0 (compatible; SportsDashboard/1.0; +https://github.com/watabo-bonobo/SportsDashboard)';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function loadBase(where) {
  try {
    const text = /^https?:/.test(where) ? await fetchText(`${where}?t=${Date.now()}`) : await readFile(where, 'utf8');
    const data = JSON.parse(text);
    if (Array.isArray(data.events)) return { events: data.events, standings: data.standings ?? [] };
  } catch (e) {
    console.warn(`前回データを読めませんでした (${where}): ${e.message}`);
  }
  return null;
}

export async function collect(now = new Date()) {
  const collected = [];
  const report = [];
  for (const src of SOURCES) {
    // 複数のページを組み合わせる取得元は collect() を持つ
    if (src.collect) {
      try {
        const events = await src.collect(now, fetchText);
        collected.push(...events);
        report.push(`✓ ${src.name}: ${events.length}件`);
      } catch (e) {
        report.push(`✗ ${src.name}: ${e.message}`);
      }
      continue;
    }
    for (const url of src.urls(now)) {
      try {
        const events = src.parse(await fetchText(url), url, now);
        collected.push(...events);
        report.push(`✓ ${src.name}: ${events.length}件 ${url}`);
      } catch (e) {
        report.push(`✗ ${src.name}: ${e.message} ${url}`);
      }
      await new Promise((r) => setTimeout(r, 1000)); // 相手サイトに負荷をかけない
    }
  }
  return { collected, report };
}

/** 順位表を集める。取れなかった表は前回のものを残す */
export async function collectStandings(now, previous = [], fetch = fetchText) {
  const tables = new Map(previous.map((t) => [t.id, t]));
  const report = [];
  for (const src of SOURCES) {
    if (!src.standings) continue;
    try {
      const got = await src.standings(now, fetch);
      for (const t of got) tables.set(t.id, t);
      report.push(`✓ ${src.name}（順位表）: ${got.length}表`);
    } catch (e) {
      report.push(`✗ ${src.name}（順位表）: ${e.message}`);
    }
  }
  return { standings: [...tables.values()], report };
}

async function main() {
  const [baseArg, seedPath = 'public/data/events.json', outPath = seedPath] = process.argv.slice(2);
  const now = new Date();
  // 公開中のデータ（前回収集分）→ なければリポジトリの初期データ
  const seed = (await loadBase(seedPath)) ?? { events: [], standings: [] };
  const base = (baseArg ? await loadBase(baseArg) : null) ?? seed;
  // リポジトリ側で手で追加・修正したイベントは常に優先して反映する
  const merged = mergeEvents(base.events, seed.events);
  const { collected, report } = await collect(now);
  const st = await collectStandings(now, base.standings);
  console.log([...report, ...st.report].join('\n'));
  const events = pruneOld(mergeEvents(merged, collected), now);
  const jst = new Date(now.getTime() + 9 * 3600000).toISOString().replace('T', ' ').slice(0, 16);
  const out = { updatedAt: jst, events, standings: st.standings };
  await writeFile(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`${events.length}件を書き出しました: ${outPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
