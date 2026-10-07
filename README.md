# 観戦ダッシュボード

日本のサッカー（日本代表・J1・天皇杯・ルヴァンカップ）、プロ野球、日本人選手のいるメジャーリーグ、バレー、バスケ日本代表、卓球などの
**予定・放送局／ネット配信・結果** を1画面にまとめる静的Webアプリです。

- 上段: 競技ごとの「次の日本代表戦・注目イベント」とカウントダウン
- 左: これからの予定（日付ごと。開催中の大会は先頭）
- 右: 直近30日の結果
- 競技での絞り込み、「日本代表・注目のみ」表示（設定はブラウザに保存）
- 各試合から Google カレンダーに追加、情報の出典へのリンク
- 「更新」ボタンでページを開いたまま最新のデータを取り直す（データは1時間ごとに自動収集）

公開URL（GitHub Pages）: https://watabo-bonobo.github.io/SportsDashboard/

## 使い方

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # ロジックと events.json の形式チェック
npm run build    # dist/ に静的ファイルを出力
```

`?now=2026-10-07` を URL に付けると「今日」を差し替えて表示を確認できます。

## データの集め方

GitHub Actions（`.github/workflows/deploy.yml`）が **1時間ごと** に各サイトの公開ページを読み取り、
前回のデータに重ねてから GitHub Pages に公開します。サイトを開いたときと「更新」ボタンを押したときは、
その時点で公開されている最新のデータを読み込みます。

| 収集元 | 取れる情報 | 処理 |
| --- | --- | --- |
| JFA「SAMURAI BLUE 日程・結果」 | 日本代表の日程・対戦相手・会場・結果 | `collector/sources/jfa-samuraiblue.js` |
| Ｊリーグ公式「今週の日程・結果」 | J1・ルヴァンカップ・天皇杯の時刻・会場・放送局・結果 | `collector/sources/jleague.js` |
| NPB「試合日程・結果」（今月・来月） | プロ野球の日程・時刻・球場・結果 | `collector/sources/npb.js` |
| MLB 公式データ（statsapi.mlb.com） | 日本人選手が所属するチームの試合（直近3日〜7日先）・結果。ポストシーズンは注目扱い | `collector/sources/mlb.js` |
| 日本バレーボール協会「日本代表 日程」 | 男女日本代表の大会・期間・会場 | `collector/sources/jva.js` |
| テレ東卓球「大会日程」 | WTT・ITTF の大会と期間 | `collector/sources/tvtokyo-tabletennis.js` |

自動で取れない情報（バスケ日本代表、代表戦や野球の放送局など）は `public/data/events.json` に手で書きます。
収集した情報と同じ試合があれば、手入力の放送局や時刻は残したまま、結果などが上書きされます。
過去60日より前の試合は自動で消えます。

各サイトのページの作りが変わると、そのサイトの分だけ収集が止まります（他のサイトと前回データはそのまま表示されます）。
ローカルでの試し方: `node collector/collect.js "" public/data/events.json /tmp/out.json`

### 手入力データの形式

```jsonc
{
  "id": "samurai-20261114",            // 一意なID
  "sport": "soccer",                    // soccer | baseball | volleyball | basketball | handball | tabletennis
  "competition": "KALLANG FOOTBALL SERIES SINGAPORE",
  "round": "第9節",                     // 任意
  "home": "日本", "away": "ブラジル",    // 対戦形式の場合
  "title": "WTTチャンピオンズ 2026",     // 大会形式の場合（home/away の代わり）
  "start": "2026-11-14T19:15:00+09:00", // 時刻未定なら "2026-11-14"
  "end": "2026-11-21",                  // 複数日の大会のみ
  "venue": "シンガポール・ナショナルスタジアム",
  "broadcasts": [
    { "name": "テレビ朝日系", "kind": "tv" },  // tv=地上波 / bs=BS・CS / net=配信
    { "name": "U-NEXT", "kind": "net", "url": "https://video.unext.jp/", "note": "補足" }
  ],
  "result": { "home": 2, "away": 1, "note": "PK 5-4" },
  "featured": true,                     // 日本代表など。上段カードと強調表示の対象
  "source": "https://..."               // 出典
}
```

`npm test` で必須項目や日付形式の誤り、収集処理の動作を確認できます。

## 公開（GitHub Pages）

`main` への push 時と1時間ごとに `.github/workflows/deploy.yml` が収集とデプロイを行います。
初回のみリポジトリの Settings → Pages → Source を「GitHub Actions」にしてください。
