# 観戦ダッシュボード

日本のサッカー（日本代表・J1・天皇杯・ルヴァンカップ）、バレー、バスケ日本代表、卓球などの
**予定・放送局／ネット配信・結果** を1画面にまとめる静的Webアプリです。

- 上段: 競技ごとの「次の日本代表戦・注目イベント」とカウントダウン
- 左: これからの予定（日付ごと。開催中の大会は先頭）
- 右: 直近30日の結果
- 競技での絞り込み、「日本代表・注目のみ」表示（設定はブラウザに保存）
- 各試合から Google カレンダーに追加、情報の出典へのリンク
- 「更新」ボタンでページを開いたまま最新の `events.json` を取り直す

公開URL（GitHub Pages）: https://watabo-bonobo.github.io/SportsDashboard/

## 使い方

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # ロジックと events.json の形式チェック
npm run build    # dist/ に静的ファイルを出力
```

`?now=2026-10-07` を URL に付けると「今日」を差し替えて表示を確認できます。

## データの更新

データは `public/data/events.json` の1ファイルです。ビルドし直さなくても、このファイルを差し替えるだけで画面に反映されます。

```jsonc
{
  "id": "samurai-20261114",            // 一意なID
  "sport": "soccer",                    // soccer | volleyball | basketball | tabletennis
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
  "result": { "home": 2, "away": 1, "note": "PK 5-4" }, // 試合後に追加
  "featured": true,                     // 日本代表など。上段カードと強調表示の対象
  "source": "https://..."               // 出典
}
```

`npm test` で必須項目や日付形式の誤りを検出できます。

### データソースについて

J リーグ・JFA・JBA・JVA・WTT などの公式サイトには、誰でも使える公開 API がありません。
また各サイトの HTML を自動取得（スクレイピング）する方式は、利用規約上の問題やページ構造の変更で壊れやすいため採用していません。
そのため、公式発表・報道をもとに `events.json` を手で（または Claude などに頼んで）更新する方式にしています。
同梱のデータは 2026-10-07 時点で各出典から集めたもので、放送・配信予定は変更される可能性があります。

## 公開（GitHub Pages）

`main` に push すると `.github/workflows/deploy.yml` が GitHub Pages にデプロイします。
初回のみリポジトリの Settings → Pages → Source を「GitHub Actions」にしてください。
