# 或世盗 -ARSÈNE- — Ver.0.1 戦闘プロトタイプ

蓮で2〜3体のシャドウスライムと戦う、ブラウザ向けターン制コマンドバトルです。PC・スマートフォンの両方に対応し、勝利・敗北・逃走・リザルト・再戦まで実装しています。

## 起動方法

依存ライブラリやビルド作業はありません。`index.html` をブラウザで開くだけで動作します。ローカルサーバーを使う場合は、このフォルダで `python -m http.server 8080` などを実行し、`http://localhost:8080` を開いてください。

## ファイル構成

```text
index.html          ゲーム画面
css/game.css        UI、仮ドットキャラ、エフェクト、レスポンシブ表示
js/data.js          プレイヤー、敵、スキル、アイテムの定義
js/game.js          戦闘進行、AI、計算、演出
assets/
  playable-characters/  プレイキャラ（キャラクターIDごと）
  enemy-characters/     敵キャラ（敵IDごと）
  audio/                将来の共通音声素材
  weapons/              武器種ごとの透過PNG
  effects/              将来のエフェクト画像
  ui/                   将来のUI画像
  bg/                   戦闘・フィールド背景
```

設定資料は `references/playable-characters/` と `references/enemy-characters/` に分離しています。

## キャラクター追加方法

`js/data.js` の `player` と同じ形で、名前、レベル、`stats`、`growth`、所持スキル、所持品を定義します。将来複数キャラクターを扱う場合は `players` オブジェクトへ変更し、IDで選択する構造に拡張できます。

## 敵追加方法

`js/data.js` の `enemies` に新しいIDを追加します。`stats`、報酬、`ai` の行動と確率を設定してください。生成処理の `makeEnemy()` で使う敵IDを切り替えるだけで、同じ戦闘ロジックを利用できます。

## スキル追加方法

`js/data.js` の `skills` にID、表示名、MP、種別、威力係数を追加し、プレイヤーの `skills` 配列へIDを登録します。特殊効果を持つスキルは `game.js` の実行分岐へその効果だけを追加してください。

## 右手武器と戦闘ビジュアル

蓮の本体画像は武器なしの `assets/playable-characters/ren/body-no-weapon.png` です。右手武器は `js/data.js` の `weapons` から独立して重ねて表示します。

初期装備は次の指定です。

```js
equipment: { rightHand: 'mageStaff' }
```

武器定義には `weaponType`、`weaponSprite`、PNGを指定する `battleSprite`、攻撃演出を決める `attackMotion`、ダメージ参照値の `damageStat` を持たせます。魔導士の杖は `assets/weapons/staff/mage-staff-01.png` を使用します。`rightHand` を `phantomSword` へ変更すると剣レイヤーと斬撃モーションへ自動的に切り替わります。杖装備時はMAG参照の魔法弾になります。

## 画像素材の差し替え方法

蓮は `assets/playable-characters/ren/body-no-weapon.png`、シャドウスライムは `assets/enemy-characters/shadow-slime/battle-idle.png`、現在の背景は `assets/bg/dungeon-battle-01.png` から読み込みます。キャラクターIDごとのフォルダを複製して追加してください。

## BGM・効果音

戦闘BGMは `音楽系/戦闘用/零時侵蝕 (Without Lead Vocal).mp3` を最初のコマンド操作後からループ再生します。勝利時にフェード停止し、「メニューへ」で `音楽系/ダンジョン/ダンジョン1Moonlit Reliquary.mp3` を再生します。「再戦」でダンジョン曲を止め、戦闘BGMを曲頭から再生します。BGM音量は10%、効果音マスターは72%です。ヘッダーのSOUNDボタンでミュートできます。

## 報酬・成長・ゲームループ

敵のEXP、GOLD範囲、ドロップ率は `js/data.js` の各敵データにあります。勝利時に敵1体ずつ抽選し、同じアイテムはインベントリ内で加算します。必要EXPは `expTable`、キャラクター固有の成長値は `player.growth` で変更できます。

勝利・敗北後は「メニューへ」進み、ステータス、装備、アイテムを確認してから再戦します。再戦では敵とターンを新規作成し、HP・MPを全回復します。LV、EXP、基本能力、装備、インベントリ、GOLDは `localStorage` の `arsene-rpg-save-v01` に保存され、リロード後も維持されます。

基本能力と装備補正は分離され、ステータス画面に「基本」と「装備」を個別表示します。シャドウワンドはMAG+4・MND+1、スライムリングはVIT+2・LUK+2です。

## Netlifyへの公開方法

1. Netlifyで「Add new site」→「Deploy manually」を選択します。
2. この `アルセーヌRPG` フォルダをそのままアップロードします。
3. ビルドコマンドは空欄、公開ディレクトリはフォルダ直下（`.`）です。

Git連携の場合もビルドコマンド不要、Publish directoryを `.` に設定してください。
