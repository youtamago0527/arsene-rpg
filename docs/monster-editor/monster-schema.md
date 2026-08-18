# Monster JSON スキーマ（たたき台）

既存の `js/data.js` の `enemies` 構造と `game.js` の戦闘ロジック（`makeEnemy`, `enemies.forEach(e => e.dropTable...)` など）を壊さない前提で、Monster Editorが読み書きするJSON構造を設計しました。

## 1. マスターテーブル（先に決める）

Monster側が「文字列名でなくID」で参照するには、参照先のIDがまず固定されている必要があります。

- `elements.json` … 属性・弱点・耐性が参照するID一覧（新規。現状 `data.js` は `'闇'` のような日本語文字列直書きなので、ここでID化する）
- `items` … 既存の `data.js` の `items`（キー自体がIDなので流用可。DROP/STEALが参照）
- `skills` … 既存の `data.js` の `skills`（キー自体がIDなので流用可。モンスターの使用スキンルが参照）
- `dungeons.json` … 出現情報が参照するID一覧（将来のDungeon Editor用。今は仮でよい）

## 2. Monster オブジェクト

```jsonc
{
  "id": "shadowSlime",          // 一意ID。data.jsのenemiesキーと同一にすると移行が楽
  "name": "シャドウスライム",
  "enName": "SHADOW SLIME",
  "kind": "normal",              // "normal" | "boss"
  "title": "",                   // ボス用の二つ名（例: "永遠の裁定者"）。normalは空文字
  "variant": "standard",         // "standard" | "rare" | "stray" など。色違い/強化版の区別。自由入力可（Editor側はdatalistで候補提示のみ）
  "baseMonsterId": "",           // 色違い等の元になったモンスターのID（例: shadowSlimeRareならshadowSlime）。任意項目

  "stats": {
    "maxHp": 12,
    "maxMp": 0,                  // 現状battle側は未参照。将来MP攻撃モンスター用に予約
    "atk": 4,
    "def": 2,
    "mag": 5,
    "mnd": 0,                    // 未参照・予約
    "spd": 6,
    "dex": 0,                    // 未参照・予約
    "luk": 0                     // 未参照・予約
  },

  "exp": 10,
  "jobExp": 0,                   // 新規項目。ジョブシステム実装まではEditor上だけで保持
  "gold": { "min": 5, "max": 10 },

  "elementId": "dark",           // elements.json 参照
  "weaknessIds": ["light", "fire"],
  "resistanceIds": [],           // 新規。既存データには無かった項目

  "appearance": {
    "dungeonIds": ["dungeon1"],  // 出現ダンジョンID（仮。Dungeon Editor実装まではフリーテキストでも可）
    "encounterRate": 1,          // 出現率の重みなど、決め方は運用に合わせて調整
    "minLevel": 1,
    "maxLevel": 3,
    "spritePath": "assets/enemy-characters/shadow-slime/battle-idle.png"
  },

  "skills": [
    { "skillId": "shadowBolt", "weight": 0.28 },
    { "skillId": "attack", "weight": 0.72 }
  ],

  "dropTable": [
    { "itemId": "slimeJelly", "chance": 0.40 },
    { "itemId": "manaPotion", "chance": 0.20 },
    { "itemId": "shadowWand", "chance": 0.10 },
    { "itemId": "slimeRing", "chance": 0.08 },
    { "itemId": "darkCore", "chance": 0.03 }
  ],

  "stealTable": []               // 新規。DROPと同じ形 { itemId, chance }
}
```

## 3. 既存コードとの対応関係（重要）

移行時にズレやすい箇所だけメモ:

- `data.js` の `ai` フィールド → 新スキーマでは `skills` に改名。Editorで生成したJSONをゲームに反映する際は、書き出し側で `skills` → `ai` にリネームするコンバータを1個挟むか、`game.js` 側で `e.ai` を読んでいる箇所を `e.skills` に合わせて直すか、どちらかを決めておく。
- `weaknesses` は既存データにもあったが `game.js` はまだ参照していない（弱点属性でダメージ倍率、は未実装）。EditorでJSONに持たせておくのは問題ないが、「入れたのに戦闘に反映されない」状態にしばらくなる点は認識しておく。
- `element` / `weaknesses` を日本語文字列からID参照に変える場合、既存の2体（shadowSlime, noelFirstEncounter）と、今後増えるモンスター全部で表記ゆれ（'闇' と '闇属性' など）を防げるのがメリット。

## 4. 作業の進め方（おすすめ順）

1. 上記スキーマを確定させる（フィールムの過不足をここで決め切る。後からの追加は簡単だが、リネームは面倒）
2. `elements.json` を作る（属性の数は多くないので先に全部出し切る）
3. 既存の `shadowSlime` と `noelFirstEncounter` を新スキーマで書き直し、`monsters.json` を作る（= スキーマの検証も兼ねる。書きにくい項目があればスキーマを直す）
4. `monsters.json` が2体分きちんと書けたら、それをそのままMonster EditorのInitial DataとしてJSON Importに読み込ませ、フォーム項目 ⇔ JSONキーの対応を1:1で決める
5. フォーム実装 → Export → 既存 `data.js` への反映方法（手動貼り替え or 将来的にビルドスクリプトで自動生成）を決める

サンプルの `elements.json` と `monsters.json` を同じフォルダに置いています。中身を見ながら3をすぐ試せます。
