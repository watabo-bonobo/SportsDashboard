import type { EventData } from './types';

const SPORTS = ['soccer', 'baseball', 'volleyball', 'basketball', 'handball', 'tabletennis'];
const KINDS = ['tv', 'bs', 'net'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;

/** events.json を手で編集したときのミスを見つける。問題がなければ空配列 */
export function validateEventData(data: EventData): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  if (!Array.isArray(data.events)) return ['events が配列ではありません'];

  data.events.forEach((e, i) => {
    const at = `events[${i}]${e.id ? ` (${e.id})` : ''}`;
    if (!e.id) errors.push(`${at}: id がありません`);
    else if (ids.has(e.id)) errors.push(`${at}: id が重複しています`);
    else ids.add(e.id);

    if (!SPORTS.includes(e.sport)) errors.push(`${at}: sport が不正です: ${e.sport}`);
    if (!e.competition) errors.push(`${at}: competition がありません`);
    if (!(e.home && e.away) && !e.title) errors.push(`${at}: home/away か title のどちらかが必要です`);
    if (!DATE_RE.test(e.start) && !DATETIME_RE.test(e.start)) {
      errors.push(`${at}: start の形式が不正です（YYYY-MM-DD か タイムゾーン付き日時）: ${e.start}`);
    }
    if (e.end !== undefined && (!DATE_RE.test(e.end) || e.end < e.start.slice(0, 10))) {
      errors.push(`${at}: end の形式が不正か、start より前です: ${e.end}`);
    }
    e.broadcasts?.forEach((b, j) => {
      if (!b.name) errors.push(`${at}: broadcasts[${j}] に name がありません`);
      if (!KINDS.includes(b.kind)) errors.push(`${at}: broadcasts[${j}].kind が不正です: ${b.kind}`);
    });
    if (e.result && (typeof e.result.home !== 'number' || typeof e.result.away !== 'number')) {
      errors.push(`${at}: result.home / result.away は数値にしてください`);
    }
  });
  return errors;
}
