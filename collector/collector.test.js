import { describe, expect, it } from 'vitest';
import { mergeEvents, pruneOld } from './merge.js';
import * as jfa from './sources/jfa-samuraiblue.js';
import * as jleague from './sources/jleague.js';
import * as tt from './sources/tvtokyo-tabletennis.js';

const NOW = new Date('2026-10-07T12:00:00+09:00');

describe('JFA SAMURAI BLUE', () => {
  const html = `<table>
    <tr><td class="date poscenter">10/1(木)</td><td class="comp_name"><a href="/samuraiblue/kirincupsoccer_2026/">キリンカップサッカー2026</a></td><td class="score poscenter"><a>〇0-0<br class="disp_pc">PK5-4</a></td><td class="team poscenter">エクアドル</td><td class="place">神奈川／横浜国際総合競技場</td></tr>
    <tr><td class="date poscenter">11/14(土)</td><td class="comp_name"><a href="/samuraiblue/20261117/">KALLANG</a></td><td class="score poscenter">-</td><td class="team poscenter">ブラジル</td><td class="place">カラン(シンガポール)／シンガポールナショナルスタジアム</td></tr>
    <tr><td class="date poscenter">2027/1/11(月)</td><td class="comp_name"><a href="/samuraiblue/asiancup2027/">AFC アジアカップ</a></td><td class="score poscenter">-</td><td class="team poscenter">インドネシア</td><td class="place">ジェッダ(サウジアラビア)／Prince Abdullah Al Faisal Sports City Stadium</td></tr>
    <!--<tr><td class="date poscenter">3/20(木)</td><td class="team">バーレーン</td></tr>-->
  </table>`;
  const events = jfa.parse(html, 'https://www.jfa.jp/samuraiblue/schedule_result/2026.html');

  it('日付・結果・会場を読む', () => {
    expect(events.map((e) => [e.id, e.away, e.start])).toEqual([
      ['samurai-20261001', 'エクアドル', '2026-10-01'],
      ['samurai-20261114', 'ブラジル', '2026-11-14'],
      ['samurai-20270111', 'インドネシア', '2027-01-11'],
    ]);
    expect(events[0].result).toEqual({ home: 0, away: 0, note: 'PK 5-4' });
    expect(events[0].venue).toBe('横浜国際総合競技場');
    expect(events[1].result).toBeUndefined();
    expect(events[0].source).toBe('https://www.jfa.jp/samuraiblue/kirincupsoccer_2026/');
  });
});

describe('Ｊリーグ', () => {
  const box = (id, cat, extraClass, home, away, middle, platform) => `
    <div class="m-schedule m-schedule--j1 ${extraClass}" id="${id}"><div class="m-schedule__wrapper">
      <a class="m-schedule__link" href="/match/${cat}/2026/${id.slice(4)}/"><div class="m-schedule__content"><div class="m-schedule__match">
        <div class="m-schedule__team m-schedule__team-home"><span class="m-schedule__team-name">${home}</span><span class="m-schedule__team-name">略</span></div>
        ${middle}
        <div class="m-schedule__team m-schedule__team-away"><span class="m-schedule__team-name">${away}</span><span class="m-schedule__team-name">略</span></div>
      </div>
      <div class="m-schedule__info m-schedule__info--hidden"><p class="m-schedule__info-stadium">メルスタ</p><p class="m-schedule__info-stadium">メルカリスタジアム</p><p class="m-schedule__info-platform">${platform}</p></div>
      </div></a></div></div>`;
  const html = `<main>
    ${box('2026100903', 'j1', '', '鹿島アントラーズ', 'ガンバ大阪', '<div class="m-schedule__match-info"><p class="m-schedule__time-text">19:00</p></div>', 'DAZN・千葉テレビ')}
    ${box('2026100711', 'emperor', 'm-schedule--game-over', 'ＲＢ大宮アルディージャ', '浦和レッズ', '<!--$?--><template id="B:20"></template><div class="m-schedule__match-info"><p>読み込み中</p></div><!--/$-->', 'スポーツライブ＋・スカパー！動画ストア')}
    ${box('2026100801', 'j2', '', 'A', 'B', '', 'DAZN')}
    </main>
    <div hidden id="S:20"><div class="m-schedule__match-info"><p class="m-schedule__score">3</p><p class="m-schedule__game-over-text">試合終了</p><p class="m-schedule__score">2</p></div></div>`;
  const events = jleague.parse(html, 'https://www.jleague.jp/j1/match/');

  it('J1 と天皇杯だけを取り込む', () => {
    expect(events.map((e) => [e.id, e.competition])).toEqual([
      ['jl-j1-2026100903', '明治安田J1リーグ'],
      ['jl-emperor-2026100711', '天皇杯'],
    ]);
  });

  it('時刻・会場・放送局を読む', () => {
    const e = events[0];
    expect(e.start).toBe('2026-10-09T19:00:00+09:00');
    expect(e.venue).toBe('メルカリスタジアム');
    expect(e.broadcasts).toEqual([
      { name: 'DAZN', kind: 'net' },
      { name: '千葉テレビ', kind: 'tv' },
    ]);
  });

  it('後から届いたスコアを元の位置に戻して読む', () => {
    expect(events[1].result).toEqual({ home: 3, away: 2 });
    expect(events[1].start).toBe('2026-10-07');
    expect(events[1].broadcasts?.map((b) => b.kind)).toEqual(['bs', 'net']);
  });
});

describe('テレ東卓球', () => {
  it('年をまたぐ期間を読む', () => {
    expect(tt.parseRange('10/27［火］-11/1［日］（予定）', NOW)).toEqual({ start: '2026-10-27', end: '2026-11-01' });
    expect(tt.parseRange('12/30［水］-1/3［日］（予定）', NOW)).toEqual({ start: '2026-12-30', end: '2027-01-03' });
    expect(tt.parseRange('1/5［火］-10［日］（予定）', NOW)).toEqual({ start: '2027-01-05', end: '2027-01-10' });
  });

  it('大会カードを読む', () => {
    const html = `<ul><li class="p-schedule__card"><a href="https://www.tv-tokyo.co.jp/tabletennis/tournament/china_smash_2026/"><h3 class="p-schedule__card-title">WTTチャイナスマッシュ 2026</h3><p class="p-schedule__card-date">10/1<span>［木］</span><i>-</i>11<span>［日］（予定）</span></p></a></li>
      <li class="p-schedule__card"><div><h3 class="p-schedule__card-title">WTTチャンピオンズ モンペリエ 2026</h3><p class="p-schedule__card-date">10/27<span>［火］</span><i>-</i>11/1<span>［日］（予定）</span></p></div></li></ul>`;
    const events = tt.parse(html, 'https://www.tv-tokyo.co.jp/tabletennis/tournament/', NOW);
    expect(events.map((e) => [e.title, e.start, e.end])).toEqual([
      ['WTTチャイナスマッシュ 2026', '2026-10-01', '2026-10-11'],
      ['WTTチャンピオンズ モンペリエ 2026', '2026-10-27', '2026-11-01'],
    ]);
  });
});

describe('mergeEvents', () => {
  const seed = [
    { id: 'j1-2627-09-01', sport: 'soccer', competition: 'J1', home: '鹿島アントラーズ', away: 'ガンバ大阪', start: '2026-10-09T19:00:00+09:00', broadcasts: [{ name: 'DAZN', kind: 'net' }] },
    { id: 'samurai-20261114', sport: 'soccer', competition: 'X', home: '日本', away: 'ブラジル', start: '2026-11-14T19:15:00+09:00', broadcasts: [{ name: 'テレビ朝日系', kind: 'tv' }] },
    { id: 'old', sport: 'soccer', competition: 'X', home: 'A', away: 'B', start: '2026-10-01', result: { home: 1, away: 0 } },
  ];

  it('別 id の同じ試合は1件にまとめ、収集した値で更新する', () => {
    const out = mergeEvents(seed, [
      { id: 'jl-j1-2026100903', sport: 'soccer', competition: '明治安田J1リーグ', home: '鹿島アントラーズ', away: 'ガンバ大阪', start: '2026-10-09T19:00:00+09:00', result: { home: 2, away: 0 } },
    ]);
    expect(out.map((e) => e.id).sort()).toEqual(['jl-j1-2026100903', 'old', 'samurai-20261114']);
    const m = out.find((e) => e.id === 'jl-j1-2026100903');
    expect(m.result).toEqual({ home: 2, away: 0 });
    expect(m.broadcasts).toEqual([{ name: 'DAZN', kind: 'net' }]);
  });

  it('収集側が日付のみなら、既存の時刻と放送局を残す', () => {
    const out = mergeEvents(seed, [{ id: 'samurai-20261114', sport: 'soccer', competition: 'KALLANG', home: '日本', away: 'ブラジル', start: '2026-11-14', venue: 'シンガポール' }]);
    const m = out.find((e) => e.id === 'samurai-20261114');
    expect(m.start).toBe('2026-11-14T19:15:00+09:00');
    expect(m.broadcasts?.[0].name).toBe('テレビ朝日系');
    expect(m.venue).toBe('シンガポール');
  });

  it('60日より前の試合は落とす', () => {
    expect(pruneOld(seed, new Date('2026-12-15T00:00:00Z')).map((e) => e.id)).toEqual(['samurai-20261114']);
  });
});
