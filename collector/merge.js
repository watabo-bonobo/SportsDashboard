// 収集結果を既存データに重ねる。収集で取れなかった項目（放送局や時刻など）は既存の値を残す。

/** 既存イベントに収集した値を上書きする（undefined の項目は既存を残す） */
export function mergeEvent(prev, next) {
  if (!prev) return next;
  const out = { ...prev };
  for (const [k, v] of Object.entries(next)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  // 収集側が日付のみで、既存に同じ日の時刻があれば時刻付きを残す
  if (!next.start.includes('T') && prev.start.includes('T') && prev.start.startsWith(next.start)) {
    out.start = prev.start;
  }
  return out;
}

/**
 * 同じ試合かどうかを判定するキー。サイトごとに id の付け方が違っても重複させないため、
 * 対戦形式は「日付＋ホーム＋アウェー」、大会形式は「競技＋期間」で見る。
 */
export function naturalKey(e) {
  const norm = (s) => (s ?? '').normalize('NFKC').replace(/\s/g, '');
  const date = e.start.slice(0, 10);
  if (e.home && e.away) return `${e.sport}|${date}|${norm(e.home)}|${norm(e.away)}`;
  return `${e.sport}|${date}|${e.end ?? ''}`;
}

/**
 * base: 前回までのデータ, collected: 今回収集したイベント
 * 収集で見つからなかった既存イベントはそのまま残す（過去の結果を消さないため）
 */
export function mergeEvents(base, collected) {
  const byId = new Map(base.map((e) => [e.id, e]));
  const idByKey = new Map(base.map((e) => [naturalKey(e), e.id]));
  for (const e of collected) {
    const sameId = idByKey.get(naturalKey(e));
    let prev = byId.get(e.id);
    if (!prev && sameId) {
      // 別の id で登録済みの同じ試合 → 新しい id に付け替える
      prev = byId.get(sameId);
      byId.delete(sameId);
    }
    const merged = mergeEvent(prev, e);
    byId.set(e.id, merged);
    idByKey.set(naturalKey(merged), e.id);
  }
  return [...byId.values()].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

/** 古すぎるイベントを落とす（終了から keepDays 日以上前） */
export function pruneOld(events, now, keepDays = 60) {
  const limit = new Date(now.getTime() - keepDays * 86400000).toISOString().slice(0, 10);
  return events.filter((e) => (e.end ?? e.start.slice(0, 10)) >= limit);
}
