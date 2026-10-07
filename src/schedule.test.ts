import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { EventData, SportEvent } from './types';
import { buildBoard, formatDate, formatTime, googleCalendarUrl, jstDateKey, phaseOf } from './schedule';
import { validateEventData } from './validate';

const ev = (over: Partial<SportEvent>): SportEvent => ({
  id: 'x',
  sport: 'soccer',
  competition: 'テスト',
  home: 'A',
  away: 'B',
  start: '2026-10-10T14:00:00+09:00',
  ...over,
});

const NOW = new Date('2026-10-07T12:00:00+09:00');

describe('日付の扱い', () => {
  it('日本時間で日付を判定する（UTC では前日でも JST の日付になる）', () => {
    expect(jstDateKey(new Date('2026-10-06T16:00:00Z'))).toBe('2026-10-07');
  });

  it('曜日付きで表示する', () => {
    expect(formatDate('2026-10-10')).toBe('10/10(土)');
  });

  it('時刻未定は「時間未定」', () => {
    expect(formatTime(ev({ start: '2026-11-26' }))).toBe('時間未定');
    expect(formatTime(ev({ start: '2026-10-10T05:00:00Z' }))).toBe('14:00');
  });
});

describe('phaseOf', () => {
  it('結果があれば終了', () => {
    expect(phaseOf(ev({ result: { home: 1, away: 0 } }), NOW)).toBe('finished');
  });
  it('期間中の大会は開催中', () => {
    expect(phaseOf(ev({ start: '2026-10-01', end: '2026-10-11' }), NOW)).toBe('ongoing');
  });
  it('過去日の試合は結果未入力でも終了扱い', () => {
    expect(phaseOf(ev({ start: '2026-10-05' }), NOW)).toBe('finished');
  });
  it('当日キックオフ済みで結果未入力なら本日扱い', () => {
    expect(phaseOf(ev({ start: '2026-10-07T10:00:00+09:00' }), NOW)).toBe('ongoing');
  });
});

describe('buildBoard', () => {
  const events = [
    ev({ id: 'later', start: '2026-10-11T15:00:00+09:00' }),
    ev({ id: 'tbd', start: '2026-10-10' }),
    ev({ id: 'early', start: '2026-10-10T14:00:00+09:00' }),
    ev({ id: 'jp1', featured: true, start: '2026-11-14T19:15:00+09:00' }),
    ev({ id: 'jp2', featured: true, start: '2026-11-17T21:10:00+09:00' }),
    ev({ id: 'old', start: '2026-08-01', result: { home: 1, away: 1 } }),
    ev({ id: 'recent', start: '2026-10-05', result: { home: 2, away: 1 } }),
  ];
  const board = buildBoard(events, NOW);

  it('予定を日付ごとにまとめ、同日は時刻順・時刻未定は後ろ', () => {
    expect(board.upcoming.map((g) => g.date)).toEqual(['2026-10-10', '2026-10-11', '2026-11-14', '2026-11-17']);
    expect(board.upcoming[0].events.map((e) => e.id)).toEqual(['early', 'tbd']);
  });

  it('結果は直近30日のみ新しい順', () => {
    expect(board.results.map((e) => e.id)).toEqual(['recent']);
  });

  it('注目試合は競技ごとに次の1件', () => {
    expect(board.nextFeatured.map((e) => e.id)).toEqual(['jp1']);
  });
});

describe('googleCalendarUrl', () => {
  it('時刻ありは2時間の予定', () => {
    const url = new URL(googleCalendarUrl(ev({})));
    expect(url.searchParams.get('dates')).toBe('20261010T050000Z/20261010T070000Z');
  });
  it('複数日の大会は終日予定（終了日は翌日）', () => {
    const url = new URL(googleCalendarUrl(ev({ start: '2026-10-01', end: '2026-10-11' })));
    expect(url.searchParams.get('dates')).toBe('20261001/20261012');
  });
});

describe('public/data/events.json', () => {
  it('スキーマに合っている', () => {
    const data = JSON.parse(readFileSync('public/data/events.json', 'utf8')) as EventData;
    expect(validateEventData(data)).toEqual([]);
  });
});

describe('japanOutcome / buildSummary', () => {
  it('日本側から見た勝敗。PK戦の勝敗も反映', async () => {
    const { japanOutcome } = await import('./schedule');
    expect(japanOutcome(ev({ home: '日本', away: 'X', result: { home: 2, away: 1 } }))).toBe('win');
    expect(japanOutcome(ev({ home: 'X', away: '日本', result: { home: 2, away: 1 } }))).toBe('loss');
    expect(japanOutcome(ev({ home: '日本', away: 'X', result: { home: 0, away: 0, note: 'PK 5-4' } }))).toBe('win');
    expect(japanOutcome(ev({ home: '日本', away: 'X', result: { home: 1, away: 1 } }))).toBe('draw');
    expect(japanOutcome(ev({ home: 'A', away: 'B', result: { home: 1, away: 0 } }))).toBeNull();
  });

  it('今日・7日以内・地上波・直近の日本の戦績を数える', async () => {
    const { buildSummary } = await import('./schedule');
    const s = buildSummary(
      [
        ev({ id: 'a', start: '2026-10-07T19:00:00+09:00', broadcasts: [{ name: 'NHK', kind: 'tv' }] }),
        ev({ id: 'b', start: '2026-10-01', end: '2026-10-11' }),
        ev({ id: 'c', start: '2026-10-13T19:00:00+09:00' }),
        ev({ id: 'd', start: '2026-10-20T19:00:00+09:00' }),
        ev({ id: 'e', home: '日本', start: '2026-10-05', result: { home: 2, away: 1 } }),
      ],
      NOW,
    );
    expect(s).toEqual({ today: 2, week: 2, freeTv: 1, record: { win: 1, draw: 0, loss: 0 } });
  });
});
