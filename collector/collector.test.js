import { describe, expect, it } from 'vitest';
import { mergeEvents, pruneOld } from './merge.js';
import * as jfa from './sources/jfa-samuraiblue.js';
import * as jleague from './sources/jleague.js';
import * as jdata from './sources/jleague-data.js';
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

describe('ACL', () => {
  const group = (head, matches) => `<div class="p-game-schedule__group">
    <div class="m-section-header"><div class="m-section-header__h2-eyebrow--logo-text-container m-section-header__h2-eyebrow--logo-text-container-pc"><span>${head}</span></div>
    <div class="m-section-header__h2-eyebrow--logo-text-container m-section-header__h2-eyebrow--logo-text-container-sp"><span>${head}</span></div></div>
    <div class="p-game-schedule__group-matches">${matches}</div></div>`;
  const match = (id, cat, home, away, link = true, over = false) => `
    <div class="m-schedule${over ? ' m-schedule--game-over' : ''}" id="${id}"><div class="m-schedule__wrapper">
      ${link ? `<a class="m-schedule__link" href="/match/${cat}/2026/${id.slice(4)}/">` : '<div>'}
      <div class="m-schedule__team m-schedule__team-home"><span class="m-schedule__team-name">${home}</span></div>
      <div class="m-schedule__match-info">${over ? '<p class="m-schedule__score">2</p><p class="m-schedule__score">1</p>' : '<p class="m-schedule__time-text">19:00</p>'}</div>
      <div class="m-schedule__team m-schedule__team-away"><span class="m-schedule__team-name">${away}</span></div>
      <div class="m-schedule__info m-schedule__info--hidden"><p class="m-schedule__info-platform">DAZN</p></div>
      ${link ? '</a>' : '</div>'}</div></div>`;
  const html = `<main>
    ${group('AFCチャンピオンズリーグElite　リーグステージ　ＭＤ1　東地区', match('2026091503', 'acle', '鹿島アントラーズ', 'ニューカッスル・ジェッツ', true, true) + match('2026091506', 'acle', '上海海港', '北京FC', false))}
    ${group('AFCチャンピオンズリーグTwo　グループステージ　ＭＤ2　東地区', match('2026101504', 'acl2', 'ＦＣ町田ゼルビア', 'FCソウル'))}
    </main>`;
  const events = jleague.parse(html, 'https://www.jleague.jp/acle/match/');

  it('Ｊクラブの試合だけを、大会名と節つきで読む', () => {
    expect(events.map((e) => [e.id, e.competition, e.round, e.home, e.away])).toEqual([
      ['jl-acle-2026091503', 'ACLエリート', 'リーグステージ MD1', '鹿島アントラーズ', 'ニューカッスル・ジェッツ'],
      ['jl-acl2-2026101504', 'ACL Two', 'グループステージ MD2', 'ＦＣ町田ゼルビア', 'FCソウル'],
    ]);
    expect(events[0].result).toEqual({ home: 2, away: 1 });
    expect(events[1].start).toBe('2026-10-15T19:00:00+09:00');
  });
});

describe('Ｊリーグ 先の節（クラブ別日程）', () => {
  it('J1 クラブの一覧を読み、今週分とクラブ別日程を id でまとめる', async () => {
    const clubsJson = String.raw`{\"id\":\"j1\",\"options\":[{\"label\":\"鹿島\",\"value\":\"kashima\"},{\"label\":\"長崎\",\"value\":\"nagasaki\"}]},{\"id\":\"j2\",\"options\":[{\"value\":\"sapporo\"}]}`;
    expect(jleague.parseJ1Clubs(clubsJson)).toEqual(['kashima', 'nagasaki']);

    const box = (id, home, away, platform = '') => `<div class="m-schedule" id="${id}"><a href="/match/j1/2026/${id.slice(4)}/">
      <div class="m-schedule__team-home"><span class="m-schedule__team-name">${home}</span></div>
      <div class="m-schedule__match-info"><p class="m-schedule__time-text">15:00</p></div>
      <div class="m-schedule__team-away"><span class="m-schedule__team-name">${away}</span></div>
      ${platform ? `<div class="m-schedule__info--hidden"><p class="m-schedule__info-platform">${platform}</p></div>` : ''}</a></div>`;
    const pages = {
      'https://www.jleague.jp/match/': box('2026100903', '鹿島アントラーズ', 'ガンバ大阪'),
      'https://www.jleague.jp/j1/tv/search-list/?category=j1': clubsJson,
      'https://www.jleague.jp/club/kashima/day/': box('2026101711', '鹿島アントラーズ', 'Ｖ・ファーレン長崎', 'DAZN'),
      'https://www.jleague.jp/club/nagasaki/day/': box('2026101711', '鹿島アントラーズ', 'Ｖ・ファーレン長崎'),
    };
    const fetchText = async (url) => {
      if (!(url in pages)) throw new Error('HTTP 404');
      return pages[url];
    };
    const events = await jleague.collect(NOW, fetchText);
    expect(events.map((e) => [e.id, e.start])).toEqual([
      ['jl-j1-2026100903', '2026-10-09T15:00:00+09:00'],
      ['jl-j1-2026101711', '2026-10-17T15:00:00+09:00'],
    ]);
    // 2ページ目に放送局が無くても、先に読んだ放送局を残す
    expect(events[1].broadcasts).toEqual([{ name: 'DAZN', kind: 'net' }]);
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

  it('直近の勝敗を各チームから見て数える（引き分けは分）', async () => {
    const npb = await import('./sources/npb.js');
    const g = (start, home, away, h, a) => ({ start, home, away, result: h === undefined ? undefined : { home: h, away: a } });
    const games = [
      g('2026-09-29T18:00:00+09:00', '阪神', '巨人', 3, 1),
      g('2026-09-30T18:00:00+09:00', '巨人', '阪神', 4, 2),
      g('2026-10-01T18:00:00+09:00', '阪神', '巨人', 2, 2),
      g('2026-10-08T18:00:00+09:00', '巨人', 'ヤクルト'),
    ];
    expect(npb.recentForm(games, '巨人').map((f) => [f.date, f.opponent, f.home, f.score, f.outcome])).toEqual([
      ['2026-09-29', '阪神', false, '1-3', 'loss'],
      ['2026-09-30', '阪神', true, '4-2', 'win'],
      ['2026-10-01', '阪神', false, '2-2', 'draw'],
    ]);
    expect(npb.recentForm(games, '阪神', 2).map((f) => f.outcome)).toEqual(['loss', 'draw']);
  });

  it('直近の試合は今月と先月の日程から数える', async () => {
    const npb = await import('./sources/npb.js');
    expect(npb.formUrls(new Date('2026-10-07T03:00:00Z'))).toEqual([
      'https://npb.jp/games/2026/schedule_09_detail.html',
      'https://npb.jp/games/2026/schedule_10_detail.html',
    ]);
    expect(npb.formUrls(new Date('2026-03-27T03:00:00Z'))).toEqual(['https://npb.jp/games/2026/schedule_03_detail.html']);
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

describe('順位表', () => {
  it('Ｊ１の順位表（略称・勝点・得失点差）を読む', async () => {
    const jl = await import('./sources/jleague.js');
    const cell = (k, v) => `<td class="o-table__cell o-table__cell--${k}"><p>${v}</p></td>`;
    const row = (rank, full, short, pts, m, w, d, l, gd) =>
      `<tr class="rt-TableRow o-table__row">${cell('ranking', rank)}<td class="o-table__cell--club"><a class="o-table__club-link" href="/club/x/"><span>${full}</span><span>${short}</span></a></td>${cell('point', pts)}${cell('match', m)}${cell('win', w)}${cell('draw', d)}${cell('loss', l)}${cell('goal-scored', 9)}${cell('goal-lost', 9)}${cell('goal-difference', gd)}</tr>`;
    const html = `<table><tbody>${row(1, 'ヴィッセル神戸', '神戸', 19, 8, 6, 1, 1, '+8')}${row(20, 'ジェフユナイテッド千葉', '千葉', 3, 8, 0, 3, 5, '-9')}</tbody></table>`;
    expect(jl.parseStandings(html)).toEqual([
      { rank: 1, team: '神戸', played: 8, win: 6, draw: 1, loss: 1, diff: 8, points: 19 },
      { rank: 20, team: '千葉', played: 8, win: 0, draw: 3, loss: 5, diff: -9, points: 3 },
    ]);
  });

  it('NPB のチーム勝敗表を略称で読む', async () => {
    const npb = await import('./sources/npb.js');
    const html = `<table class="tablefix2"><thead><tr><th>チーム</th></tr></thead><tbody>
      <tr class="ststats"><td>阪神タイガース</td><td>141</td><td>78</td><td>61</td><td>2</td><td>.561</td><td>--</td><td>36-32</td></tr>
      <tr class="ststats"><td>読売ジャイアンツ</td><td>143</td><td>76</td><td>64</td><td>3</td><td>.543</td><td>2.5</td><td>39-31</td></tr>
    </tbody></table><table><tbody><tr><td>交流戦の表は読まない</td></tr></tbody></table>`;
    expect(npb.parseStandings(html)).toEqual([
      { rank: 1, team: '阪神', played: 141, win: 78, loss: 61, draw: 2, gb: '-' },
      { rank: 2, team: '巨人', played: 143, win: 76, loss: 64, draw: 3, gb: '2.5' },
    ]);
  });

  it('取れなかった表は前回のものを残す', async () => {
    const { collectStandings } = await import('./collect.js');
    const prev = [
      { id: 'old-table', sport: 'soccer', title: '前回', rows: [], from: 'Ｊリーグ公式' },
      { id: 'mlb-203', sport: 'baseball', title: '外した取得元', rows: [], from: 'MLB（日本人選手の所属チーム）' },
    ];
    const failing = async () => {
      throw new Error('offline');
    };
    const { standings, report } = await collectStandings(NOW, prev, failing);
    expect(standings).toEqual([prev[0]]);
    expect(report.every((r) => r.startsWith('✗'))).toBe(true);
  });
});

describe('ハンドボール', () => {
  it('リーグＨの日別一覧から試合と結果を読む', async () => {
    const lh = await import('./sources/leagueh.js');
    const game = (code, time, venue, a, b, score = '', movie = '') => `<li class="col"><div class="field"><div class="heading">
      <strong>2026-27 リーグＨ レギュラーシーズン</strong><a href="/schedule/${code}/"><span><em>${time}</em>${venue}</span></a>
      ${movie ? `<p class="movie"><a href="${movie}">試合動画</a></p>` : ''}</div>
      <div class="body"><div class="team"><a href="/schedule/${code}/">${a}</a></div><div class="team"><a href="/schedule/${code}/">${b}</a></div>
      <div class="score">${score}</div></div></div></li>`;
    const html = `<div class="swiper-slide div_day" id="div_day_12"></div><div class="swiper-slide div_day" id="div_day_17"></div>
      <div class="game-list" id="game-list"><ul>
      ${game('511M03', '13:00', '泉大津市立総合体育館', '大同フェニックス東海', '琉球コラソン')}
      ${game('511W08', '14:30', 'マエダハウジング東区スポーツセンター', 'イズミメイプルレッズ広島', 'ハニービー石川', '<span>23</span><span>34</span>', 'https://tv-leagueh.example/live')}
      </ul></div>`;
    expect(lh.parseDays(html)).toEqual([12, 17]);
    const events = lh.parseDay(html, '2026-10-12');
    expect(events.map((e) => [e.id, e.round, e.home, e.away, e.start, e.venue, e.result, e.broadcasts?.[0].kind])).toEqual([
      ['lh-511M03', '男子 レギュラーシーズン', '大同フェニックス東海', '琉球コラソン', '2026-10-12T13:00:00+09:00', '泉大津市立総合体育館', undefined, undefined],
      ['lh-511W08', '女子 レギュラーシーズン', 'イズミメイプルレッズ広島', 'ハニービー石川', '2026-10-12T14:30:00+09:00', 'マエダハウジング東区スポーツセンター', { home: 23, away: 34 }, 'net'],
    ]);
    expect(lh.seasonOf(2027, 3)).toBe(2026);
    expect(lh.seasonOf(2026, 10)).toBe(2026);
  });

  it('リーグＨの順位表を男女別に読む', async () => {
    const lh = await import('./sources/leagueh.js');
    const table = (team) => `<table class="ranking-table league"><tbody><tr><th>1</th><td class="team"><a><div>${team}</div></a></td>
      <td class="point">50</td><td>26</td><td>25</td><td>0</td><td>1</td><td>957</td><td>724</td><td>233</td><td>8.6</td></tr></tbody></table>`;
    expect(lh.parseStandings(table('ブレイヴキングス刈谷') + table('ＨＣ名古屋'))).toEqual([
      [{ rank: 1, team: 'ブレイヴキングス刈谷', points: 50, played: 26, win: 25, draw: 0, loss: 1, diff: 233 }],
      [{ rank: 1, team: 'ＨＣ名古屋', points: 50, played: 26, win: 25, draw: 0, loss: 1, diff: 233 }],
    ]);
  });

  it('日本代表の活動スケジュールから大会だけを取り込む', async () => {
    const jha = await import('./sources/jha.js');
    expect(jha.parseRange('2026/9/19 ～ 9/29')).toEqual({ start: '2026-09-19', end: '2026-09-29' });
    expect(jha.parseRange('2026/12/上旬')).toBeNull();
    const list = `<table class="content_table"><tr><th>期間</th></tr>
      <tr><td>2026/11/23 〜 2026/12/03</td><td>国際</td><td><a href="game_event_outline.php?eid=415">第21回女子ハンドボールアジア選手権</a></td><td>カザフスタン</td></tr></table>`;
    const dates = jha.parseEventList(list);
    const page = `<table class="nationalteam_schedule_table">
      <tr><td>2026/9/11 ～ 9/18</td><td>第2回強化合宿</td><td>東京都</td></tr>
      <tr><td>2026/9/19 ～ 9/27</td><td><a href="../system/prog/game_event_outline.php?eid=402">第20回アジア競技大会（2026/愛知・名古屋）</a></td><td>愛知県</td></tr>
      <tr><td>2026/12/上旬</td><td><a href="../system/prog/game_event_outline.php?eid=415">第21回女子ハンドボールアジア選手権</a></td><td>カザフスタン</td></tr>
    </table>`;
    const team = { key: 'w', page: 'women', gender: '女子', competition: 'ハンドボール女子日本代表（おりひめジャパン）' };
    expect(jha.parseTeamPage(page, team, dates).map((e) => [e.id, e.title, e.start, e.end])).toEqual([
      ['jha-w-402', '第20回アジア競技大会（2026/愛知・名古屋）（女子）', '2026-09-19', '2026-09-27'],
      ['jha-w-415', '第21回女子ハンドボールアジア選手権', '2026-11-23', '2026-12-03'],
    ]);
  });
});

describe('Ｊリーグ・データサイト（直近5試合・順位の推移）', () => {
  const row = (sec, date, home, score, away) =>
    `<tr><td>2026/27</td><td>Ｊ１</td><td>第${sec}節第１日</td><td>${date}</td><td>19:03</td>` +
    `<td class="nowrap"><a href="#">${home}</a></td><td class="al-c nowrap">${score}</td>` +
    `<td class="nowrap"><a href="#">${away}</a></td><td>メルスタ</td><td>&nbsp;</td><td>ＤＡＺＮ</td></tr>`;
  const html = `<table><tr><th>シーズン</th><th>大会</th></tr>
    ${row('１', '26/08/07(金)', '横浜FM', '3-4', '鹿島')}
    ${row('１', '26/08/08(土)', 'Ｇ大阪', '1-1', '柏')}
    ${row('２', '26/08/15(土)', '鹿島', '0-1', 'Ｇ大阪')}
    ${row('２', '26/08/15(土)', '柏', '2-0', '横浜FM')}
    ${row('３', '26/08/22(土)', '柏', '\n vs', '鹿島')}
  </table>`;
  const matches = jdata.parseResults(html);

  it('終わった試合だけを読み、全角のチーム名をそろえる', () => {
    expect(matches).toHaveLength(4);
    expect(matches[1]).toEqual({ section: 1, date: '2026-08-08', home: 'G大阪', away: '柏', homeGoals: 1, awayGoals: 1 });
  });

  it('節ごとの順位と直近の勝敗を付ける', () => {
    const rows = [
      { rank: 1, team: '柏', played: 2, win: 1, draw: 1, loss: 0, points: 4 },
      { rank: 2, team: 'G大阪', played: 2, win: 1, draw: 1, loss: 0, points: 4 },
      { rank: 3, team: '鹿島', played: 2, win: 1, draw: 0, loss: 1, points: 3 },
      { rank: 4, team: '横浜FM', played: 2, win: 0, draw: 0, loss: 2, points: 0 },
    ];
    const out = jdata.enrichStandings(rows, matches);
    // 第1節: 鹿島(3) G大阪・柏(1、同じなら名前順) 横浜FM(0) → 第2節: 柏・G大阪(4) 鹿島(3) 横浜FM(0)
    expect(out.find((r) => r.team === '鹿島').ranks).toEqual([1, 3]);
    expect(out.find((r) => r.team === '柏').ranks).toEqual([3, 1]);
    // 試合数が公式とそろっているので、最後の節は公式の順位（G大阪は2位）
    expect(out.find((r) => r.team === 'G大阪').ranks).toEqual([2, 2]);
    expect(out.find((r) => r.team === '鹿島').form).toEqual([
      { date: '2026-08-07', opponent: '横浜FM', home: false, score: '4-3', outcome: 'win' },
      { date: '2026-08-15', opponent: 'G大阪', home: true, score: '0-1', outcome: 'loss' },
    ]);
  });

  it('結果が取れなければ順位表はそのまま', () => {
    const rows = [{ rank: 1, team: '柏', win: 0, loss: 0 }];
    expect(jdata.enrichStandings(rows, [])).toBe(rows);
  });

  it('シーズンは7月で切り替わる', () => {
    expect(jdata.resultsUrl(new Date('2026-10-10T12:00:00+09:00'))).toContain('competition_years=2026&');
    expect(jdata.seasonYear(new Date('2027-03-01T12:00:00+09:00'))).toBe(2026);
  });
});
