// 或世盗 -ARSÈNE- HELP / 遊び方
// lockedBy 付きの項目は、対応システムの解放後だけ表示する。
window.ARSENE_HELP = [
  {
    id: 'basics', title: '基本操作', titleEn: 'BASICS',
    body: [
      '拠点からダンジョンへ潜入し、怪異と戦って素材やGOLDを集めます。',
      '戦闘はコマンド選択式で、装備中の武器によって「たたかう」の性能が変わります。',
      '- ダンジョンへ潜入：戦闘に出る',
      '- カズのまかない：HP・MPを全回復し、潜入中の効果を得る',
      '- 装備・ステータス：装備変更と能力確認'
    ]
  },
  {
    id: 'growth', title: 'キャラクター育成', titleEn: 'CHARACTER GROWTH',
    body: [
      'JOB Lvの上昇で現在のJOBの基礎能力が成長します。',
      '戦闘中の行動や被弾でHP・MPが成長することがあり、武器を使うと対応する武器学も伸びます。',
      'それぞれ独立した成長要素です。'
    ]
  },
  {
    id: 'stats', title: '能力の見かた', titleEn: 'STATS',
    body: [
      '能力は「キャラクターとJOBの基礎能力」と「装備が与える戦闘能力」に分かれます。',
      '- 基礎能力：力・体力・魔力・精神・素早さ・器用さ・運',
      '- 装備の戦闘能力：攻撃力・防御力・魔法攻撃力・魔法防御力',
      '物理防御は体力＋装備防御力、魔法防御は精神＋装備魔法防御力が基準です。'
    ]
  },
  {
    id: 'weaponFormula', title: '武器と攻撃性能', titleEn: 'WEAPON FORMULA',
    body: [
      '装備する武器種によって、攻撃に使う基礎能力が変わります。',
      '- 剣：力＋武器攻撃力',
      '- 爪／体術：力×50％＋素早さ×50％＋武器攻撃力',
      '- 杖：魔力＋武器魔法攻撃力',
      'JOBを変えても武器の参照能力は変わりません。回復魔法は精神を参照します。'
    ]
  },
  {
    id: 'job', title: 'JOB', titleEn: 'JOB',
    body: [
      'JOB Lvが上がると、JOBごとに定められた基礎能力が成長します。',
      '育てた成長はそのJOBに就いている間だけ反映され、転職後も育成記録は失われません。',
      'JOB固有ACTIONと、Lv1・5・10・15などで習得するPASSIVEがあります。詳細はJOB画面で確認できます。'
    ]
  },
  {
    id: 'jobSkill', title: 'JOBスキル', titleEn: 'JOB SKILL',
    body: [
      '各JOBには、そのJOBで使える固有ACTIONがあります。',
      '- 戦士：《ちからため》',
      '- 武道家：《ばくれつけん》',
      '- 魔導士：《精神集中》',
      '- 僧侶：《ヒール》',
      'JOBスキルと武器学で閃く武器技は別のシステムです。'
    ]
  },
  {
    id: 'passive', title: 'PASSIVE', titleEn: 'PASSIVE',
    body: [
      'JOBごとに定められたLvで習得する常時能力です。Lv1で覚えるものと、Lv5・10・15で覚えるものがあります。',
      '現在のJOBの習得済みPASSIVEはそのJOBの能力として発動します。',
      '他のJOBで習得したPASSIVEから1つを追加装備できます。'
    ]
  },
  {
    id: 'mastery', title: '武器学', titleEn: 'WEAPON MASTERY',
    body: [
      '通常攻撃または武器技を1ACTION使うごとに、装備中の武器に対応する武器学が成長します。',
      '- 剣学・杖学・体術',
      '武器学Lvに通常の上限はなく、1Lvごとに対応武器の最終ダメージが0.5％上昇します。多段技でもEXP判定は1ACTIONにつき1回です。'
    ]
  },
  {
    id: 'spark', title: '技のひらめき', titleEn: 'SPARK',
    body: [
      '戦闘中に武器技を使うと、新しい技を「閃く」ことがあります。',
      '技のSpark Rank、敵のSpark Level、武器学Lvが確率に関わり、派生元の技が合っていると閃きやすくなります。',
      '閃いたときは元の行動と入れ替わって新技が発動し、追加MPは消費しません。JOB固有ACTIONはSpark対象外です。'
    ]
  },
  {
    id: 'equipment', title: '装備', titleEn: 'EQUIPMENT',
    body: [
      '武器・防具には基礎性能に加え、会心率、属性ダメージ、回復量、耐性などを変化させる特殊効果があります。',
      '装備できる箇所とJOB・武器種の条件を確認してください。'
    ]
  },
  {
    id: 'dungeon', title: 'ダンジョン', titleEn: 'DUNGEON',
    body: [
      'ダンジョンごとに出現する怪異と入手できる素材が異なります。',
      '進行条件を満たすとボスへ挑戦できます。クリア後は通常戦5勝ごとにボスと再戦できます。'
    ]
  },
  {
    id: 'workshop', title: '工房', titleEn: 'WORKSHOP', lockedBy: 'workshop',
    body: [
      '怪異から入手した素材とGOLDを使って装備を製作できます。',
      '新しい素材の発見やボス撃破でレシピが解放されます。',
      '不要な装備は分解してGOLDに変換できます。ロック中と、装備中の最後の1個は分解できません。'
    ]
  },
  {
    id: 'magicKnight', title: '魔奏士と楽器', titleEn: 'MAGIC KNIGHT', lockedBy: 'magicKnight',
    body: [
      '魔奏士は魔力を軸に物理と魔法の両方を扱うJOBです。',
      'Lv1で《魔力装填》と《ソロ》、Lv5で《アンサンブル》と《フォルテ》を習得します。',
      '楽器は器用さを威力に変換し、楽器装備中は《ソロ》による2回行動を狙えます。'
    ]
  },
  {
    id: 'phantomThief', title: 'PHANTOM THIEF', titleEn: 'PHANTOM THIEF', lockedBy: 'phantomThief',
    body: [
      'PHANTOM THIEFはJOB成長、通常のHP・MP成長、武器学成長が発生しない特殊JOBです。',
      '解放済みの通常JOBで育てた基礎能力を合算し、50％を反映します。京介のみ60％です。',
      '通常JOBを現在の上限まで育ててMASTERにすると、初回に固有ACTIONを盗みます。戦闘へ持ち込めるのはACTION 2個、PASSIVE 2個です。',
      '武器学Lvと習得済み武器技は使えますが、PHANTOM THIEF中は成長しません。'
    ]
  },
  {
    id: 'otherWorld', title: '異世界', titleEn: 'OTHER WORLD', lockedBy: 'otherWorld',
    body: [
      '拠点のレニーフォックスから侵入できます。通常のEXP、GOLD、JOB EXP、武器学は得られません。',
      '異界干渉力は1日の侵入回数で、日付が変わると回復します。',
      '- 月＝力／火＝体力／水＝魔力／木＝精神／金＝素早さ／土＝器用さ／日＝7能力からランダム',
      'アルカナは対応能力を永久に＋1します。1周は通常戦9回＋BOSS戦1回で、撃破後は3つの宝箱から1つを選びます。'
    ]
  },
  {
    id: 'otherWorldAdvanced', title: '曜日ダンジョン・上級', titleEn: 'WEEKLY RIFT // ADVANCED', lockedBy: 'otherWorldAdvanced',
    body: [
      'D4クリア後に解放される曜日異世界ダンジョンの上級です。',
      '敵能力は中級の4倍です。通常戦・BOSS戦とも、勝利ごとに本日のアルカナを4個獲得します。',
      '通常アイテムの獲得量も初級の4倍になります。'
    ]
  },
  {
    id: 'infiniteScore', title: '無限奏廊と異世界工房', titleEn: 'INFINITE SCORE', lockedBy: 'otherWorld',
    body: [
      '無限奏廊では探索中に拾った異世界装備と異界素材を、低確率で現れる異世界工房で加工できます。',
      '調律は異界の欠片を消費して強化値を＋1します。＋6以降の調律には異界の核も必要です。',
      '＋4以降の調律は失敗すると装備が消滅します。通常所持している保護のアルカナを使えば、失敗時も装備と現在の強化値を維持できます。',
      'モンスターは基礎能力アルカナ・保護のアルカナ・輪廻のアルカナを落とすことがあります。総ドロップ率は階層ごとに上昇し、最大20％です。',
      'iOSアプリ版では任意広告により、ショップ候補の再抽選（1ショップ1回）、全滅装備1個の奪還（1RUN1回）、バッグ最大33枠への緊急拡張（1RUN1回）を利用できます。広告スキップ権を持っている場合も性能と回数は同じです。',
      'OP移植は異界の欠片と異界の核を消費し、素材装備は消滅します。移植できるOPランクは移植先装備の★に応じて制限されます。',
      'OP削除は異界の欠片10個を消費します。同型合成では素材にした同型装備が消滅します。'
    ]
  },
  {
    id: 'phantomShop', title: 'PHANTOM SHOP', titleEn: 'IN-APP PURCHASES', lockedBy: 'phantomShop',
    body: [
      'iOSアプリ版のPHANTOM SHOPでは、時短機能の永久解放と消費アイテムをApp Store決済で購入できます。購入成功が確認された場合だけ効果が付与されます。',
      '永久商品の購入履歴は「購入を復元」から復元できます。広告スキップ券、異世界探索券、各アルカナなどの消費商品は復元対象外です。',
      '購入がキャンセル・保留・失敗になった場合、効果は付与されません。表示価格はApp Storeの商品情報を正とします。'
    ]
  },
  {
    id: 'enhance', title: '装備強化', titleEn: 'ENHANCE', lockedBy: 'enhance',
    body: [
      '同じ装備1個とGOLDを消費し、武器・防具を強化できます。',
      '+1ごとにその装備自身の戦闘値・能力補正・特殊効果が15％ずつ上昇します。',
      '+3までは必ず成功し、+4以降は失敗で対象装備が消滅します。',
      '保護のアルカナは消失を防ぎ強化値を3下げ、祝福された保護は強化値も維持します。'
    ]
  },
  {
    id: 'dualBlade', title: '双刃士', titleEn: 'DUAL BLADE', lockedBy: 'dualBlade',
    body: [
      '双刃士は二刀追撃と会心で単体への短期火力を高めるJOBです。',
      'Lv1で《二刀の型》と《戦姫乱舞》、Lv5で《連舞》を習得します。',
      '連舞は命中で段階が上がり、ミスで0に戻ります。'
    ]
  },
  {
    id: 'rebirth', title: '転生', titleEn: 'REBIRTH', lockedBy: 'rebirth',
    body: [
      'JOB Lv20以上の通常JOBは、《輪廻のアルカナ》1個を使って転生できます。',
      '転生後はJOB Lv1・EXP0に戻り、Lvアップで得た能力の20％を残します。',
      '習得済みACTION・PASSIVEは残り、再びPASSIVEの習得Lvへ到達すると効果が強化されます。',
      '転生1回ごとに次の育成で得るJOB成長量が10％ずつ増加します。'
    ]
  },
  {
    id: 'guardian', title: '守護士と盾', titleEn: 'GUARDIAN', lockedBy: 'guardian',
    body: [
      '守護士は受けた実ダメージをRESONANCEへ変換し、反撃へつなげる耐久JOBです。',
      '盾は右手に装備する両手占有武器で、防御力と魔法防御力を攻撃性能に変換します。',
      '《RESONANCE BREAK》は全RESONANCEを消費し、防御・魔法防御・耐性を無視する必中攻撃です。'
    ]
  },
  {
    id: 'levelCap', title: 'JOBレベル上限', titleEn: 'LEVEL CAP', lockedBy: 'levelCap',
    body: [
      '全JOBのレベル上限がLv20からLv40へ上昇しています。',
      '上限解放時は従来のMASTER表示が解除され、Lv40到達で再びMASTERになります。既に盗んだ固有ACTIONは失われません。',
      'Lv21以降は成長量が2倍です。転生はLv20以上でいつでも選べます。'
    ]
  },
  {
    id: 'levelCapFinal', title: 'JOBレベル上限Ⅱ', titleEn: 'LEVEL CAP II', lockedBy: 'levelCapFinal',
    body: [
      '全JOBのレベル上限がLv40からLv70へ上昇しています。',
      '上限解放時は従来のMASTER表示が解除され、Lv70到達で再びMASTERになります。既に盗んだ固有ACTIONは失われません。',
      '転生はLv20以上でいつでも選べます。'
    ]
  }
];
