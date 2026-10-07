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

describe('Ｊリーグ PK・延長表記', () => {
  it('重複した表記をまとめる', () => {
    expect(jleague.parsePenaltyNote('3PK4 3PK4')).toBe('PK 3-4');
    expect(jleague.parsePenaltyNote('延長延長')).toBe('延長');
    expect(jleague.parsePenaltyNote('')).toBe('');
  });
});

describe('JVA', () => {
  it('試合・大会だけを取り込む', async () => {
    const jva = await import('./sources/jva.js');
    const html = `<dl class="m-scheduleTreeColumn"><dt>5/11-6/6</dt><dd class="m-scheduleTreeColumn-name">第1回国内合宿＊1</dd><dd class="m-scheduleTreeColumn-place">味の素トレセン</dd></dl>
      <dl class="m-scheduleTreeColumn"><dt>7/13-7/19</dt><dd class="m-scheduleTreeColumn-name">バレーボールネーションズリーグ2026 第3週</dd><dd class="m-scheduleTreeColumn-place">Asueアリーナ大阪（大阪市）</dd></dl>
      <dl class="m-scheduleTreeColumn"><dt>7/10</dt><dd class="m-scheduleTreeColumn-name">2026バレーボール男子日本代表 国際親善試合（沖縄大会）</dd><dd class="m-scheduleTreeColumn-place">沖縄サントリーアリーナ</dd></dl>`;
    const events = jva.parse(html, 'https://www.jva.or.jp/national_team/2026/men_schedule/');
    expect(events.map((e) => [e.title, e.start, e.end])).toEqual([
      ['バレーボールネーションズリーグ2026 第3週（男子）', '2026-07-13', '2026-07-19'],
      ['2026バレーボール男子日本代表 国際親善試合（沖縄大会）', '2026-07-10', undefined],
    ]);
  });

  it('大会名と会場の改行を整える', async () => {
    const jva = await import('./sources/jva.js');
    const html = `<dl class="m-scheduleTreeColumn"><dt>9/5</dt><dd class="m-scheduleTreeColumn-name">国際
        親善試合</dd><dd class="m-scheduleTreeColumn-place">東京体育館
        大阪城ホール</dd></dl>`;
    const [e] = jva.parse(html, 'https://www.jva.or.jp/national_team/2026/women_schedule/');
    expect(e.title).toBe('国際親善試合（女子）');
    expect(e.venue).toBe('東京体育館 / 大阪城ホール');
  });
});

describe('NPB', () => {
  it('月別日程から試合と結果を取り込む', async () => {
    const npb = await import('./sources/npb.js');
    const html = `<table><tbody>
      <tr id="date1001"><th rowspan="2">10/1（木）</th><td><div class="team1">阪神</div><a href="/scores/2026/1001/t-g-25/"><div class="score1">2</div><div class="state">-</div><div class="score2">2</div></a><div class="team2">巨人</div></td>
        <td><div class="place">甲子園</div><div class="time">18:00</div></td><td><div class="comment"></div></td></tr>
      <tr id="date1001"><td><div class="team1">楽天</div><a href="/scores/2026/1001/e-h-24/"><div class="score1">2</div><div class="score2">8</div></a><div class="team2">ソフトバンク</div></td>
        <td><div class="place">楽天モバイル</div><div class="time">18:00</div></td></tr>
      <tr id="date1002"><td><div class="team1">ヤクルト</div><a href="/scores/2026/1002/s-l-24/"><div class="cancel">中止</div></a><div class="team2">西武</div></td></tr>
      <tr id="date1008"><td><div class="team1">ヤクルト</div><a href="/scores/2026/1008/s-g-26/"></a><div class="team2">巨人</div></td>
        <td><div class="place">神 宮</div><div class="time">18:00</div></td></tr>
    </tbody></table>`;
    const events = npb.parse(html, 'https://npb.jp/games/2026/schedule_10_detail.html');
    expect(events.map((e) => [e.id, e.round, e.start, e.venue, e.result])).toEqual([
      ['npb-20261001-t-g-25', 'セ・リーグ', '2026-10-01T18:00:00+09:00', '甲子園', { home: 2, away: 2 }],
      ['npb-20261001-e-h-24', 'パ・リーグ', '2026-10-01T18:00:00+09:00', '楽天モバイル', { home: 2, away: 8 }],
      ['npb-20261008-s-g-26', 'セ・リーグ', '2026-10-08T18:00:00+09:00', '神宮', undefined],
    ]);
  });

  it('シーズン中は今月と来月を見る', async () => {
    const npb = await import('./sources/npb.js');
    expect(npb.urls(new Date('2026-10-07T03:00:00Z'))).toEqual([
      'https://npb.jp/games/2026/schedule_10_detail.html',
      'https://npb.jp/games/2026/schedule_11_detail.html',
    ]);
    expect(npb.urls(new Date('2026-12-07T03:00:00Z'))).toEqual([]);
  });
});

describe('MLB', () => {
  const players = [
    { id: 660271, fullName: 'Shohei Ohtani', birthCountry: 'Japan', active: true, currentTeam: { id: 119 } },
    { id: 808967, fullName: 'Yoshinobu Yamamoto', birthCountry: 'Japan', active: true, currentTeam: { id: 119 } },
    { id: 1, fullName: 'New Player', birthCountry: 'Japan', active: true, currentTeam: { id: 135 } },
    { id: 2, fullName: 'Someone', birthCountry: 'USA', active: true, currentTeam: { id: 144 } },
  ];
  const game = (pk, extra) => ({
    gamePk: pk,
    gameDate: '2026-10-07T22:00:00Z',
    officialDate: '2026-10-07',
    gameType: 'D',
    seriesGameNumber: 4,
    status: { abstractGameState: 'Preview', detailedState: 'Scheduled' },
    teams: { home: { team: { id: 144 } }, away: { team: { id: 119 } } },
    venue: { name: 'Truist Park' },
    ...extra,
  });

  it('日本人選手の所属チームの試合を日本時間で取り込む', async () => {
    const mlb = await import('./sources/mlb.js');
    const byTeam = mlb.japaneseByTeam(players);
    expect([...byTeam]).toEqual([
      [119, ['大谷翔平', '山本由伸']],
      [135, ['New Player']],
    ]);
    const schedule = {
      dates: [
        {
          games: [
            game(1),
            game(2, {
              gameType: 'R',
              status: { abstractGameState: 'Final', detailedState: 'Final' },
              teams: { home: { team: { id: 135 }, score: 4 }, away: { team: { id: 158 }, score: 3 } },
              linescore: { currentInning: 11 },
            }),
            game(3, { teams: { home: { team: { id: 5517 } }, away: { team: { id: 5525 } } } }), // 対戦相手未定
            game(4, { teams: { home: { team: { id: 147 } }, away: { team: { id: 139 } } } }), // 日本人選手なし
            game(5, { status: { startTimeTBD: true, detailedState: 'Scheduled' } }),
          ],
        },
      ],
    };
    const events = mlb.parseSchedule(schedule, byTeam);
    expect(events.map((e) => [e.id, e.round, e.home, e.away, e.start, e.note, e.featured, e.result])).toEqual([
      ['mlb-1', '地区シリーズ 第4戦', 'ブレーブス', 'ドジャース', '2026-10-08T07:00:00+09:00', '日本人選手：大谷翔平、山本由伸', true, undefined],
      ['mlb-2', 'レギュラーシーズン', 'パドレス', 'ブルワーズ', '2026-10-08T07:00:00+09:00', '日本人選手：New Player', undefined, { home: 4, away: 3, note: '延長11回' }],
      ['mlb-5', '地区シリーズ 第4戦', 'ブレーブス', 'ドジャース', '2026-10-08', '日本人選手：大谷翔平、山本由伸', true, undefined],
    ]);
  });
});

describe('ダブルヘッダー', () => {
  it('同じ日の同じ対戦でも、今回の収集で別の試合ならまとめない', async () => {
    const { mergeEvents } = await import('./merge.js');
    const g = (id, start) => ({ id, sport: 'baseball', competition: 'MLB', home: 'A', away: 'B', start });
    const out = mergeEvents([], [g('mlb-1', '2026-07-01T02:00:00+09:00'), g('mlb-2', '2026-07-01T08:00:00+09:00')]);
    expect(out.map((e) => e.id)).toEqual(['mlb-1', 'mlb-2']);
  });
});
