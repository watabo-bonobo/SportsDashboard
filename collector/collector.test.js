import { describe, expect, it } from 'vitest';
import { mergeEvents, pruneOld } from './merge.js';
import * as jfa from './sources/jfa-samuraiblue.js';
import * as jleague from './sources/jleague.js';
import * as jdata from './sources/jleague-data.js';
import * as tt from './sources/tvtokyo-tabletennis.js';
import * as squad from './sources/kashima-squad.js';

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

  it('直近の試合はシーズン最初からの月別日程で数える', async () => {
    const npb = await import('./sources/npb.js');
    expect(npb.formUrls(new Date('2026-05-07T03:00:00Z'))).toEqual([
      'https://npb.jp/games/2026/schedule_03_detail.html',
      'https://npb.jp/games/2026/schedule_04_detail.html',
      'https://npb.jp/games/2026/schedule_05_detail.html',
    ]);
    expect(npb.formUrls(new Date('2026-12-07T03:00:00Z'))).toHaveLength(9);
  });

  it('順位表の試合数を超えた試合（クライマックスシリーズ）は数えない', async () => {
    const npb = await import('./sources/npb.js');
    const games = [
      { start: '2026-10-03T18:00:00+09:00', home: '巨人', away: 'DeNA', result: { home: 2, away: 5 } },
      { start: '2026-10-10T14:00:00+09:00', home: '巨人', away: 'DeNA', result: { home: 3, away: 0 } },
    ];
    expect(npb.recentForm(games, '巨人', 5, 1).map((f) => [f.date, f.outcome])).toEqual([['2026-10-03', 'loss']]);
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

describe('Ｊリーグ 得点者', () => {
  const cell = (t) => (t ? `<p class="a-typography">${t}</p>` : '<div class="o-page-header__player-score-empty"></div>');
  const list = (rows) =>
    `<div class="o-page-header__content"><div class="o-page-header__player-score-list">${rows.flat().map(cell).join('')}</div></div>`;
  const html = list([
    ['<a href="/player/1/">宮市 亮</a>', "20'", "45+6'", '<a href="/player/2/">鈴木 優磨</a>'],
    ['', '', "65'", '<a href="/player/3/">柴崎 岳</a>'],
    ['', '', "82'", '<a href="/player/2/">鈴木 優磨</a>'],
  ]);

  it('ホーム・アウェーの得点者と時間を読む', () => {
    expect(jleague.parseGoals(html)).toEqual([
      { side: 'home', player: '宮市 亮', minute: "20'" },
      { side: 'away', player: '鈴木 優磨', minute: "45+6'" },
      { side: 'away', player: '柴崎 岳', minute: "65'" },
      { side: 'away', player: '鈴木 優磨', minute: "82'" },
    ]);
  });

  it('得点の数がスコアと合わなければ使わない', () => {
    const goals = jleague.parseGoals(html);
    expect(jleague.goalsMatchResult(goals, { home: 1, away: 3 })).toBe(true);
    expect(jleague.goalsMatchResult(goals, { home: 2, away: 3 })).toBe(false);
    expect(jleague.parseGoals('<p>なし</p>')).toEqual([]);
  });

  it('鹿島の終わった試合で得点者がまだ無いものだけ試合ページを読む', async () => {
    const ev = (id, home, away, result, extra = {}) => ({
      id, sport: 'soccer', competition: '明治安田J1リーグ', home, away, start: '2026-10-05', result,
      source: `https://www.jleague.jp/match/j1/2026/${id}/`, ...extra,
    });
    const events = [
      ev('100501', '横浜Ｆ・マリノス', '鹿島アントラーズ', { home: 1, away: 3 }),
      ev('100502', '柏レイソル', '浦和レッズ', { home: 1, away: 0 }),
      ev('100503', '鹿島アントラーズ', 'ガンバ大阪', { home: 1, away: 0 }, { goals: [{ side: 'home', player: '鈴木 優磨', minute: "9'" }] }),
      ev('100504', '鹿島アントラーズ', '柏レイソル', undefined),
      ev('100505', '鹿島アントラーズ', '京都サンガF.C.', { home: 2, away: 0 }, { start: '2026-07-01' }),
    ];
    const requested = [];
    const added = await jleague.enrich(events, NOW, async (url) => {
      requested.push(url);
      return html;
    });
    expect(added).toBe(1);
    expect(events[0].goals).toHaveLength(4);
    expect(requested).toEqual(['https://www.jleague.jp/match/j1/2026/100501/']);
  });
});

describe('JFA 得点者', () => {
  const match = (date, home, away, homeScorer, awayScorer) => ({
    matchDateJpn: date,
    homeTeamName: home,
    awayTeamName: away,
    scorer: { homeScorer, awayScorer },
  });
  const json = (...matches) => JSON.stringify({ matchScheduleList: { matchSchedule: matches } });

  it('大会ページから試合結果の JSON の URL を作る', () => {
    expect(jfa.scheduleJsonUrl('https://www.jfa.jp/samuraiblue/kirincupsoccer_2026/')).toBe(
      'https://www.jfa.jp/national_team/samuraiblue/kirincupsoccer_2026/match/schedule.json',
    );
    expect(jfa.scheduleJsonUrl('https://www.footballchannel.jp/2026/10/05/post1027173/')).toBeNull();
  });

  it('その日の日本の試合の得点者を、日本をホーム側として読む', () => {
    const data = JSON.parse(
      json(
        match('2026/10/01', 'パナマ', 'ニュージーランド', ['45+1分 ジオバニー・ヘルベルト'], ['13分 マルコ・スタメニッチ']),
        match('2026/10/05', 'ニュージーランド', '日本', ['30分 クリス・ウッド'], ['12分 上田 綺世', '90+2分 堂安 律']),
      ),
    );
    expect(jfa.goalsFromSchedule(data, '2026-10-05')).toEqual([
      { side: 'home', player: '上田 綺世', minute: "12'" },
      { side: 'home', player: '堂安 律', minute: "90+2'" },
      { side: 'away', player: 'クリス・ウッド', minute: "30'" },
    ]);
    expect(jfa.goalsFromSchedule(data, '2026-10-01')).toBeNull();
  });

  it('スコアと数が合う試合だけ得点者を付け、同じ大会の JSON は1回だけ読む', async () => {
    const schedule = `<table>
      <tr><td class="date">10/1(木)</td><td class="comp_name"><a href="/samuraiblue/kirincupsoccer_2026/">キリンカップ</a></td><td class="score">〇0-0PK5-4</td><td class="team">エクアドル</td><td class="place">神奈川／横浜国際総合競技場</td></tr>
      <tr><td class="date">10/5(月)</td><td class="comp_name"><a href="/samuraiblue/kirincupsoccer_2026/">キリンカップ</a></td><td class="score">〇2-1</td><td class="team">ニュージーランド</td><td class="place">東京／国立競技場</td></tr>
      <tr><td class="date">9/24(木)</td><td class="comp_name"><a href="/samuraiblue/20260924/">キリンチャレンジカップ</a></td><td class="score">〇3-1</td><td class="team">ウルグアイ</td><td class="place">宮城／キューアンドエースタジアムみやぎ</td></tr>
    </table>`;
    const requested = [];
    const pages = {
      'https://www.jfa.jp/samuraiblue/schedule_result/2026.html': schedule,
      'https://www.jfa.jp/national_team/samuraiblue/kirincupsoccer_2026/match/schedule.json': json(
        match('2026/10/01', '日本', 'エクアドル', [], []),
        match('2026/10/05', '日本', 'ニュージーランド', ['20分 上田 綺世', '70分 堂安 律'], ['80分 クリス・ウッド']),
      ),
      // 数が合わない（速報で途中まで）
      'https://www.jfa.jp/national_team/samuraiblue/20260924/match/schedule.json': json(match('2026/09/24', '日本', 'ウルグアイ', ['11分 松木 玖生'], [])),
    };
    const events = await jfa.collect(NOW, async (url) => {
      requested.push(url);
      if (!(url in pages)) throw new Error('HTTP 404');
      return pages[url];
    });
    const byDate = (d) => events.find((e) => e.start === d);
    expect(byDate('2026-10-01').goals).toEqual([]);
    expect(byDate('2026-10-05').goals.map((g) => g.player)).toEqual(['上田 綺世', '堂安 律', 'クリス・ウッド']);
    expect(byDate('2026-09-24').goals).toBeUndefined();
    expect(requested.filter((u) => u.includes('kirincupsoccer_2026'))).toHaveLength(1);
  });
});

describe('鹿島のメンバーと不在', () => {
  it('クラブの選手一覧から背番号・ポジション・名前・選手ページを読む', () => {
    const row = (pos, href, name) => `<tr class="rt-TableRow o-table__row"><th class="o-table__cell--player"><div class="o-table__player"><div class="o-table__player-content"><div class="o-table__player-info"><p class="a-typography">${pos}</p><p class="a-typography"><a class="o-table__player-name-link" href="${href}">${name}</a></p></div></div></div></th><td><p>14</p></td></tr>`;
    const html = `<table><tbody>${row('GK 1', '/player/1632225/', '早川 友基')}${row('FW 40', '/player/1400757/', '鈴木 優磨')}${row('FW 40', '/player/1400757/', '鈴木 優磨')}</tbody></table>`;
    expect(squad.parseSquad(html)).toEqual([
      { id: '1632225', number: 1, position: 'GK', name: '早川 友基', url: 'https://www.jleague.jp/player/1632225/' },
      { id: '1400757', number: 40, position: 'FW', name: '鈴木 優磨', url: 'https://www.jleague.jp/player/1400757/' },
    ]);
  });

  it('選手ページから J1 の出場・得点・アシストと、J1 の警告・退場、最後に出た日を読む', () => {
    const score = (n, label) => `<div class="p-player-details__score-item"><p class="p-player-details__score-text">${n}</p><p class="p-player-details__score-label">${label}</p></div>`;
    const tr = (...cells) => `<tr class="rt-TableRow p-player-profile__history-row">${cells.map((c) => `<td><p>${c}</p></td>`).join('')}</tr>`;
    const html = `<div class="p-player-details__score-list">${score(14, '出場数')}${score(1, 'ゴール')}${score(5, 'アシスト')}</div>
      <table><tbody>
        ${tr('26/11/11', 'ルヴァンカップ', '横浜FM', '勝 3-2', '先発', '1', '1', '65<!-- -->分', '1/0')}
        ${tr('26/11/7', '明治安田Ｊ１', 'FC東京', '負 0-2', 'サブ', '0', '0', '45<!-- -->分', '1/0')}
        ${tr('26/10/31', '明治安田Ｊ１', 'Ｃ大阪', '勝 4-1', '先発', '0', '0', '90<!-- -->分', '2/1')}
      </tbody></table>`;
    expect(squad.parsePlayer(html)).toEqual({ apps: 14, goals: 1, assists: 5, yellow: 3, red: 1, lastPlayed: '2026-11-11' });
  });

  it('お知らせ一覧と記事（JSON-LD）を読む', () => {
    const list = `<a class="news-article-card" href="/blogs/news/26111216vj03"><div class="news-article-card__text"><h4 class="news-article-card__title"> 樋口 雄太選手 負傷のお知らせ </h4><div class="news-article-card__meta"><p class="news-article-card__date"> 2026.11.12 </p></div></div></a>`;
    expect(squad.parseNewsList(list)).toEqual([
      { url: 'https://www.antlers.co.jp/blogs/news/26111216vj03', title: '樋口 雄太選手 負傷のお知らせ', date: '2026-11-12' },
    ]);
    const article = `<script type="application/ld+json">{"@type":"Article","headline":"樋口 雄太選手 負傷のお知らせ","articleBody":"\\n樋口 雄太選手が11月7日（土）２０２６／２７明治安田Ｊ１リーグ 第14節 FC東京戦で負傷しましたので、お知らせいたします。\\n診断名\\n右腓骨骨折\\n※治療期間は非公表となります。\\n","datePublished":"2026-11-12T10:21:27+09:00"}</script>`;
    const a = squad.parseArticle(article);
    expect(a.title).toBe('樋口 雄太選手 負傷のお知らせ');
    expect(squad.parseNotice({ ...a, announced: '2026-11-12', url: 'u' })).toEqual([
      { kind: 'injury', player: '樋口 雄太', detail: '右腓骨骨折・治療期間は非公表', from: '2026-11-07', announced: '2026-11-12', source: 'u' },
    ]);
  });

  it('代表選出のお知らせから選手と活動期間を読む', () => {
    const u19 = squad.parseNotice({
      title: '徳田 誉選手、吉田 湊海選手 U-19日本代表選出のお知らせ',
      body: '本日（11/6）、アメリカ遠征（11/9～18＠アメリカ/アトランタ）のU-19日本代表メンバーが発表されました。',
      announced: '2026-11-06',
      url: 'u',
    });
    expect(u19.map((i) => [i.player, i.detail, i.from, i.until])).toEqual([
      ['徳田 誉', 'U-19日本代表', '2026-11-09', '2026-11-18'],
      ['吉田 湊海', 'U-19日本代表', '2026-11-09', '2026-11-18'],
    ]);
    const a = squad.parseNotice({
      title: '早川 友基選手 日本代表選出のお知らせ',
      body: '本日（11/4）、国際親善試合（11/14 vs ブラジル代表、11/17 vs パラグアイ代表＠シンガポールナショナルスタジアム）に臨む日本代表メンバーが発表されました。',
      announced: '2026-11-04',
      url: 'u',
    });
    expect(a.map((i) => [i.player, i.detail, i.from, i.until])).toEqual([['早川 友基', '日本代表', '2026-11-14', '2026-11-17']]);
    // 12月の発表で1月の活動を書いている場合は翌年にする
    const jan = squad.parseNotice({ title: '鈴木 優磨選手 日本代表選出のお知らせ', body: '（1/5～1/20＠サウジアラビア）', announced: '2026-12-20', url: 'u' });
    expect([jan[0].from, jan[0].until]).toEqual(['2027-01-05', '2027-01-20']);
  });

  it('出場停止のお知らせから鹿島の選手だけを読む', () => {
    const td = (t) => `<td class="o-table__data-cell">${t}<!-- --></td>`;
    const html = `<p class="m-article-module__date">2026/11/13 (金) 10:00</p><table><thead><tr><th><p>選手</p></th><th><p>チーム</p></th><th><p>前回の停止</p></th><th><p>今回の停止 </p></th><th><p>出場停止試合</p></th></tr></thead><tbody>
      <tr>${td('鈴木 優磨')}${td('鹿島')}${td(' ')}${td('J1(f)')}${td('２０２６／２７明治安田Ｊ１リーグ第１５節第１日(11/20)')}</tr>
      <tr>${td('ダニ ゴメス')}${td('FC東京')}${td(' ')}${td('J1(a)')}${td('２０２６／２７明治安田Ｊ１リーグ第１５節第２日(11/21)')}</tr>
    </tbody></table>`;
    expect(squad.parseSuspensions(html, 'u')).toEqual([
      { kind: 'suspension', player: '鈴木 優磨', detail: 'J1 第15節第1日・警告の累積', until: '2026-11-20', announced: '2026-11-13', source: 'u' },
    ]);
    const list = `<a href="/news/article/35343/?navicode=j1"><p>出場停止選手のお知らせ（2026/11/12）</p></a><a href="/news/article/35341/?navicode=j1">MF樋口の負傷を発表【鹿島】</a>`;
    expect(squad.findSuspensionArticles(list)).toEqual(['https://www.jleague.jp/news/article/35343/']);
  });

  it('終わった不在・負傷後に出場した選手・いない選手を外す', () => {
    const players = [
      { id: '1', name: '早川 友基', lastPlayed: '2026-11-07' },
      { id: '2', name: '樋口 雄太', lastPlayed: '2026-11-07' },
      { id: '3', name: '安西 幸輝' },
      { id: '4', name: '鈴木 優磨', lastPlayed: '2026-11-11' },
    ];
    const items = [
      { kind: 'injury', player: '樋口 雄太', from: '2026-07-18', announced: '2026-07-21' }, // その後に出場 → 外す
      { kind: 'injury', player: '樋口 雄太', from: '2026-11-07', announced: '2026-11-12' },
      { kind: 'injury', player: '安西幸輝', from: '2026-07-18', announced: '2026-07-21' },
      { kind: 'national', player: '早川 友基', from: '2026-10-05', until: '2026-10-14', announced: '2026-10-01' }, // 終わった
      { kind: 'national', player: '早川 友基', from: '2026-11-14', until: '2026-11-17', announced: '2026-11-04' },
      { kind: 'suspension', player: '鈴木 優磨', until: '2026-11-20', announced: '2026-11-13' },
      { kind: 'injury', player: '移籍した選手', from: '2026-11-01', announced: '2026-11-02' },
    ];
    const got = squad.currentAbsences(items, players, '2026-11-15');
    expect(got.map((a) => [a.kind, a.player, a.playerId])).toEqual([
      ['suspension', '鈴木 優磨', '4'],
      ['injury', '安西 幸輝', '3'],
      ['injury', '樋口 雄太', '2'],
      ['national', '早川 友基', '1'],
    ]);
  });
});

describe('野球日本代表（NPB）', () => {
  const index = `<div class="contents"><section>
    <h6><a href="/apbc/2026/">【ラグザス アジアプロ野球チャンピオンシップ2026】</a></h6>
    <dl><dt><a href="/japan/2026fal/" class="link_black">侍ジャパン練習試合</a></dt>
    <dd>2026年11月7日（土）、8日（日）　侍ジャパン  vs. 千葉ロッテ、広島東洋 （宮崎）</dd></dl>
    <dl><dt><a href="/japan/2026spr/" class="link_black">ラグザス 侍ジャパンシリーズ2026</a></dt>
    <dd><a href="/bis/scores/japan/linescore2026a.html">2026年2月22日（日）、23日（月） 侍ジャパン vs. 福岡ソフトバンク （宮崎）</a><br>
    <a href="/bis/scores/japan/linescore2026b.html">2026年2月27日（金）、28日（土） 侍ジャパン vs. 中日 （バンテリンドーム ナゴヤ）</a></dd></dl>
    <dl><dt><a href="/japan/2025fal/" class="link_black">ラグザス 侍ジャパンシリーズ2025</a></dt><dd>2025年11月15日（土）</dd></dl>
  </section></div>`;

  it('一覧から今年以降の大会ページを拾う', async () => {
    const s = await import('./sources/npb-japan.js');
    const pages = s.parseIndex(index, new Date('2026-11-15T05:00:00Z'));
    expect(pages.map((p) => [p.url, p.kind])).toEqual([
      ['https://npb.jp/apbc/2026/', 'tournament'],
      ['https://npb.jp/japan/2026fal/', 'series'],
      ['https://npb.jp/japan/2026spr/', 'series'],
    ]);
    expect([...s.opponentsByDate(pages[2].note)]).toEqual([
      ['2026-02-22', '福岡ソフトバンク'],
      ['2026-02-23', '福岡ソフトバンク'],
      ['2026-02-27', '中日'],
      ['2026-02-28', '中日'],
    ]);
  });

  it('大会の日程・結果表から全試合を取り込み、最終日を決勝・3位決定戦にする', async () => {
    const s = await import('./sources/npb-japan.js');
    const row = (d, t, card, href) =>
      `<tr><td>${d}</td><td>東京ドーム</td><td>${t}</td><td>${card}</td><td>${href ? `<a href="${href}">試合結果</a>` : ''}</td><td></td></tr>`;
    const html = `<title>ラグザス アジアプロ野球チャンピオンシップ2026 | NPB.jp 日本野球機構</title>
      <div class="line_table"><table><tbody>
      ${row('11月12日（木）', '19:00', 'チャイニーズ・タイペイ代表 0 - 5 日本代表', 'https://npb.jp/scores/2026/1112/tpe-jpn-80/')}
      ${row('11月13日（金）', '12:00', 'オーストラリア代表 4 - 6 チャイニーズ・タイペイ代表', 'https://npb.jp/scores/2026/1113/aus-tpe-80/')}
      ${row('11月15日（日）', '11:00', 'チャイニーズ・タイペイ代表 vs. オーストラリア代表')}
      ${row('11月15日（日）', '19:00', '日本代表 vs. 韓国代表')}
      </tbody></table></div>`;
    const events = s.parseTournament(html, 'https://npb.jp/apbc/2026/');
    expect(events.map((e) => [e.id, e.home, e.away, e.start, e.round, e.result, !!e.featured])).toEqual([
      ['jpnbb-20261112-1900', 'C.タイペイ', '日本', '2026-11-12T19:00:00+09:00', undefined, { home: 0, away: 5 }, true],
      ['jpnbb-20261113-1200', 'オーストラリア', 'C.タイペイ', '2026-11-13T12:00:00+09:00', undefined, { home: 4, away: 6 }, false],
      ['jpnbb-20261115-1100', 'C.タイペイ', 'オーストラリア', '2026-11-15T11:00:00+09:00', '3位決定戦', undefined, false],
      ['jpnbb-20261115-1900', '日本', '韓国', '2026-11-15T19:00:00+09:00', '決勝', undefined, true],
    ]);
    expect(events[0].competition).toBe('ラグザス アジアプロ野球チャンピオンシップ2026');
    expect(events[0].source).toBe('https://npb.jp/scores/2026/1112/tpe-jpn-80/');
  });

  it('侍ジャパンシリーズの日程表と結果を読み、日本をホームにそろえる', async () => {
    const s = await import('./sources/npb-japan.js');
    const html = `<title>ラグザス 侍ジャパンシリーズ2026 | NPB.jp</title>
      <table class="schedule_table">
        <tr><th>【第1戦】</th><td>2026年2月22日（日）</td><td>ひなたサンマリンスタジアム宮崎（開始 13:00）</td><td>テレビ朝日系列</td></tr>
        <tr><th>【第2戦】</th><td>2026年2月23日（月）</td><td>ひなたサンマリンスタジアム宮崎（開始 14:00）</td><td>TBS系列</td></tr>
        <tr><th>【第3戦】</th><td>2026年2月27日（金）</td><td>バンテリンドーム ナゴヤ<!--（開始 00:00）--></td></tr>
      </table>
      <div id="game_section"><a href="/scores/2026/0223/h-samurai-02/"><table class="sp_table"><tr><th>第2戦</th><td class="r1">2月23日（月）</td>
        <td class="r2"><div class="t2">●侍ジャパン</div><div class="score">0 - 4</div><div class="b2_1">福岡ソフトバンク○</div></td></tr></table></a></div>`;
    const note = '2026年2月22日（日）、23日（月） 侍ジャパン vs. 福岡ソフトバンク （宮崎） 2026年2月27日（金）、28日（土） 侍ジャパン vs. 中日 （バンテリンドーム ナゴヤ）';
    const events = s.parseSeries(html, 'https://npb.jp/japan/2026spr/', note);
    expect(events.map((e) => [e.id, e.round, e.home, e.away, e.start, e.venue, e.result, e.broadcasts?.[0]?.name])).toEqual([
      ['jpnbb-20260222-1300', '第1戦', '日本', '福岡ソフトバンク', '2026-02-22T13:00:00+09:00', 'ひなたサンマリンスタジアム宮崎', undefined, 'テレビ朝日系列'],
      ['jpnbb-20260223-1400', '第2戦', '日本', '福岡ソフトバンク', '2026-02-23T14:00:00+09:00', 'ひなたサンマリンスタジアム宮崎', { home: 0, away: 4 }, 'TBS系列'],
      ['jpnbb-20260227-g3', '第3戦', '日本', '中日', '2026-02-27', 'バンテリンドーム ナゴヤ', undefined, undefined],
    ]);
    expect(events[1].source).toBe('https://npb.jp/scores/2026/0223/h-samurai-02/');
  });
});
