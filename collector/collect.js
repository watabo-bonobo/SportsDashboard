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
    if (Array.isArray(data.events)) return data.events;
  } catch (e) {
    console.warn(`前回データを読めませんでした (${where}): ${e.message}`);
  }
  return null;
}

export async function collect(now = new Date()) {
  const collected = [];
  const report = [];
  for (const src of SOURCES) {
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

async function main() {
  const [baseArg, seedPath = 'public/data/events.json', outPath = seedPath] = process.argv.slice(2);
  const now = new Date();
  // 公開中のデータ（前回収集分）→ なければリポジトリの初期データ
  const seed = (await loadBase(seedPath)) ?? [];
  const base = (baseArg ? await loadBase(baseArg) : null) ?? seed;
  // リポジトリ側で手で追加・修正したイベントは常に優先して反映する
  const merged = mergeEvents(base, seed);
  const { collected, report } = await collect(now);
  console.log(report.join('\n'));
  const events = pruneOld(mergeEvents(merged, collected), now);
  const jst = new Date(now.getTime() + 9 * 3600000).toISOString().replace('T', ' ').slice(0, 16);
  await writeFile(outPath, JSON.stringify({ updatedAt: jst, events }, null, 2) + '\n');
  console.log(`${events.length}件を書き出しました: ${outPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
