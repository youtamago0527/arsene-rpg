window.KAZU_DIALOGUES = [
  // ── ゲーム開始直後（new_game）─────────────────────────────────── priority 60
  {
    id: 'new_game_01',
    condition: 'new_game',
    priority: 60,
    once: true,
    dialogues: [
      'よう、目え覚めたか。ここが俺の店だ。しばらく世話になれ。',
      '怪異が出てるのは知ってるよな。まずは近くのダンジョンで慣れとけ。',
      '飯は出す。死ぬなよ。それだけだ。'
    ]
  },

  // ── 初戦後（after_first_battle）──────────────────────────────── priority 50
  {
    id: 'after_first_battle_01',
    condition: 'after_first_battle',
    priority: 50,
    once: false,
    dialogues: [
      '生きて帰ってきたな。上出来だ。',
      '怪我は？……まあ、動けてるなら問題ねえ。',
      '初戦でそれならまあまあだ。続けりゃ強くなる。',
      'メシ食ったか？腹減ったまま潜るなよ。'
    ]
  },

  // ── 低HP（low_hp）────────────────────────────────────────────── priority 70
  {
    id: 'low_hp_01',
    condition: 'low_hp',
    priority: 70,
    once: false,
    dialogues: [
      'おいおい、それで戦うつもりか。まず回復してこい。',
      'HP見ろよ。これじゃスライムにもやられるぞ。',
      'まかない食ってけ。タダじゃねえけど、死ぬよりましだろ。',
      'そのHPで出かけようとすんな。俺が心配するだろうが。'
    ]
  },

  // ── 連続敗北（consecutive_defeats）───────────────────────────── priority 75
  {
    id: 'consecutive_defeats_01',
    condition: 'consecutive_defeats',
    priority: 75,
    once: false,
    dialogues: [
      '何回やられてんだ。ちょっと落ち着いて装備見直せ。',
      '負けが続いてるな。飯食って頭冷やせ。作戦変えろ。',
      'スキルの組み合わせ、もう一回考えてみろ。俺でも見てやる。',
      '焦るなよ。怪異は逃げない。お前が強くなりゃいい話だ。'
    ]
  },

  // ── 敗北直後（just_defeated）─────────────────────────────────── priority 65
  {
    id: 'just_defeated_01',
    condition: 'just_defeated',
    priority: 65,
    once: false,
    dialogues: [
      'また運び込まれてきたか。生きてりゃOKだ。',
      'とりあえず座れ。メシ食え。話はそれからだ。',
      '負けは負けだ。でも帰ってきた。それで十分だろ。',
      '悔しいか？そいつを覚えとけ。次は違う結果になる。'
    ]
  },

  // ── 工房解放直後（workshop_just_unlocked）────────────────────── priority 80, once
  {
    id: 'workshop_just_unlocked_01',
    condition: 'workshop_just_unlocked',
    priority: 80,
    once: true,
    dialogues: [
      '工房が使えるようになったぞ。素材集めて装備を強化してみろ。',
      'ノエルに負けたデータが役に立ったな。工房、遠慮なく使え。'
    ]
  },

  // ── 工房解放済み（workshop_unlocked）─────────────────────────── priority 20
  {
    id: 'workshop_unlocked_01',
    condition: 'workshop_unlocked',
    priority: 20,
    once: false,
    dialogues: [
      '工房の調子はどうだ？素材は集まってるか？',
      '装備の質が上がれば戦いも楽になる。こまめに製作しとけ。',
      'ダンジョンで素材拾ったら忘れず持ち帰れよ。'
    ]
  },

  // ── 素材あり・工房なし（has_materials_no_workshop）────────────── priority 30
  {
    id: 'has_materials_no_workshop_01',
    condition: 'has_materials_no_workshop',
    priority: 30,
    once: false,
    dialogues: [
      '何か光るもの拾ったか？まあ取っておけ、後で使い道が出てくるかもしれん。',
      '面白いもん持ってんな。そのうち活かせる日が来る。'
    ]
  },

  // ── 武器強化解放（weapon_fusion_unlocked）────────────────────── priority 35
  {
    id: 'weapon_fusion_unlocked_01',
    condition: 'weapon_fusion_unlocked',
    priority: 35,
    once: true,
    dialogues: [
      '武器強化が使えるようになったぞ。リスクはあるが、上手くいきゃ強力だ。',
      '強化は失敗することもある。俺なら慎重にやるけどな。'
    ]
  },

  // ── ノエル戦準備完了（boss1_available）───────────────────────── priority 55
  {
    id: 'boss1_available_01',
    condition: 'boss1_available',
    priority: 55,
    once: false,
    dialogues: [
      '反応が出てるな。気をつけろよ、あれは普通じゃない。',
      'ノエルか……。今の装備で本当に行くのか？',
      '行くつもりなら止めない。でも全回復してから行け。'
    ]
  },

  // ── ノエル討伐後（boss1_cleared）─────────────────────────────── priority 45
  {
    id: 'boss1_cleared_01',
    condition: 'boss1_cleared',
    priority: 45,
    once: false,
    dialogues: [
      'ノエルのことは忘れるな。あの経験が今のお前を作ってる。',
      '工房が使えるようになって、また一歩進んだな。',
      'ダンジョン1の奥にまだ何かいるはずだ。気を抜くなよ。'
    ]
  },

  // ── ゼナカド戦準備（zenakado_available）──────────────────────── priority 58
  {
    id: 'zenakado_available_01',
    condition: 'zenakado_available',
    priority: 58,
    once: false,
    dialogues: [
      '独奏卿ゼナカド……。強い。それだけは言っとく。',
      '行くなとは言わないが、装備と技は最善にしてから行け。',
      'あの旋律を止められるのはお前しかいない。信じてる。'
    ]
  },

  // ── ゼナカド初回撃破（zenakado_cleared_first）────────────────── priority 85, once
  {
    id: 'zenakado_cleared_first_01',
    condition: 'zenakado_cleared_first',
    priority: 85,
    once: true,
    dialogues: [
      'ゼナカドを倒したか……。お前、本物になったな。',
      'あれを倒したのか。信じてたけど、やっぱり驚くな。'
    ]
  },

  // ── ゼナカド撃破後（zenakado_cleared）────────────────────────── priority 40
  {
    id: 'zenakado_cleared_01',
    condition: 'zenakado_cleared',
    priority: 40,
    once: false,
    dialogues: [
      'ジョブシステムも使えるようになったしな。スキルの幅が広がった。',
      'ダンジョン2があるらしい。無理するなとは言えないが、準備してから行け。',
      'ゼナカドを倒したお前なら、次も大丈夫だ。'
    ]
  },

  // ── ダンジョン2解放（dungeon2_available）─────────────────────── priority 52
  {
    id: 'dungeon2_available_01',
    condition: 'dungeon2_available',
    priority: 52,
    once: true,
    dialogues: [
      '新しいダンジョンが解放されたな。どんな怪異がいるかは分からん。気をつけろ。',
      'ダンジョン2か。また強い怪異が出るだろうな。心してかかれ。'
    ]
  },

  // ── ダンジョン2初帰還（dungeon2_first_return）────────────────── priority 48
  {
    id: 'dungeon2_first_return_01',
    condition: 'dungeon2_first_return',
    priority: 48,
    once: false,
    dialogues: [
      'ダンジョン2の感触はどうだ？慣れるまで無理すんな。',
      '新しい怪異は手強かっただろ。少しずつ攻略していけ。',
      '素材も変わってくるぞ。集めながら進んでみろ。'
    ]
  },

  // ── ミルティ戦準備（myrthi_available）────────────────────────── priority 56
  {
    id: 'myrthi_available_01',
    condition: 'myrthi_available',
    priority: 56,
    once: false,
    dialogues: [
      'ダンジョン2のボスか……黒紅の双刃戦姫ミルティ。速いぞ。',
      'ミルティの速度は異常だ。AGIで負けたら何もできない。',
      '行くなら今の実力でいけるか、ちゃんと考えてからにしろ。'
    ]
  },

  // ── ミルティ初回撃破（myrthi_cleared_first）──────────────────── priority 83, once
  {
    id: 'myrthi_cleared_first_01',
    condition: 'myrthi_cleared_first',
    priority: 83,
    once: true,
    dialogues: [
      'ミルティを倒したのか。あの速さを超えたなら、本物の怪盗だな。',
      '双刃戦姫を落としたか……。お前、俺が思ってた以上だな。'
    ]
  },

  // ── ミルティ撃破後（myrthi_cleared）─────────────────────────── priority 38
  {
    id: 'myrthi_cleared_01',
    condition: 'myrthi_cleared',
    priority: 38,
    once: false,
    dialogues: [
      '双刃士も使えるようになったな。強さの幅が広がった。',
      'MYRTHIシリーズの装備、試してみたか？',
      '次はどこへ行くつもりだ？まだ先があるかもしれないぞ。'
    ]
  },

  // ── ジョブ解放（job_unlocked）────────────────────────────────── priority 42
  {
    id: 'job_unlocked_01',
    condition: 'job_unlocked',
    priority: 42,
    once: true,
    dialogues: [
      'ジョブが使えるようになったぞ。スキルの組み合わせが重要だ。',
      '職業によって得意なことが変わる。いろいろ試してみろ。'
    ]
  },

  // ── ジョブLv20（job_mastered）────────────────────────────────── priority 44
  {
    id: 'job_mastered_01',
    condition: 'job_mastered',
    priority: 44,
    once: false,
    dialogues: [
      'ジョブをマスターしたか。それだけで相当強くなってるぞ。',
      'レベル20か。上位職の解放条件を確認してみろ。'
    ]
  },

  // ── 工房活用（workshop_used）──────────────────────────────────── priority 22
  {
    id: 'workshop_used_01',
    condition: 'workshop_used',
    priority: 22,
    once: false,
    dialogues: [
      'ちゃんと工房使ってるな。それが最短ルートだ。',
      '自分で作った装備は愛着が違うだろ。大事に使え。',
      '新しいレシピは解放されたか？素材次第でまだ作れるものがある。'
    ]
  },

  // ── レニ雑談（reni_chat）──────────────────────────────────────── priority 10
  {
    id: 'reni_chat_01',
    condition: 'reni_chat',
    priority: 10,
    once: false,
    dialogues: [
      '工房、助かってるか？あれ整備するのに結構かかったんだぞ。',
      'ダンジョンから帰ってくるたびに成長してるな。分かるんだよ、俺には。',
      'たまには飯以外の話もするか。……まあ、お前が帰ってくれば十分だ。',
      '工房は壊さないでくれよ。修理代、誰が出すと思ってんだ。'
    ]
  },

  // ── ラーメン雑談（ramen_chat）────────────────────────────────── priority 8
  {
    id: 'ramen_chat_01',
    condition: 'ramen_chat',
    priority: 8,
    once: false,
    dialogues: [
      '今日のスープ、出汁の加減がちょうどいい。食ってみろ。',
      'ラーメン一杯で世界は変わらんが、腹は変わる。まず食え。',
      '麺の茹で時間は命だ。戦闘の判断も一緒だろ。',
      'このスープのレシピは誰にも渡さん。門外不出だ。',
      '具材は毎日変わる。来るたびに楽しみにしといてくれ。',
      'ラーメンは一人で食うもんじゃない。まあ、俺がいるから問題ないか。'
    ]
  },

  // ── メタ雑談（meta_chat）─────────────────────────────────────── priority 5
  {
    id: 'meta_chat_01',
    condition: 'meta_chat',
    priority: 5,
    once: false,
    dialogues: [
      'お前、最近また腕上げたんじゃないか？顔が違う。',
      '無茶はするなよ。でもそれがお前のスタイルなら、止めんが。',
      'いつかこの店が平和になったら、普通のラーメン屋に戻れるかもな。',
      '俺の話は聞かなくていい。ただ生きて帰ってこい。'
    ]
  },

  // ── 汎用雑談（always）────────────────────────────────────────── priority 5
  {
    id: 'always_01',
    condition: 'always',
    priority: 5,
    once: false,
    dialogues: [
      'おかえり。怪我はないか？',
      'また来たか。茶でも入れるか。',
      '今日も無事でよかった。',
      '何か用か？なけりゃ飯でも食ってけ。',
      '外の様子はどうだ。怪異は増えてるか？',
      '困ったことがあれば言え。できる範囲で助ける。',
      'ここは安全だ。ゆっくりしてけ。',
      '腕が鈍る前に動いとくのは正解だ。'
    ]
  }
];
