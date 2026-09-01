// D1〜D5 初回ボス会話 / D3 無限奏廊解放演出
(() => {
  'use strict';
  const BG = window.BattleGame;
  if (!BG) return;
  const P = BG.prototype;
  const talk = (who, texts) => texts.map(text => ({ who, text }));
  const DATA = {
    zenakado: {
      intro: talk('第一奏卿《孤高の独奏者》ゼナカド', ['ここまで辿り着いたことだけは褒めてあげよう。', 'だが――合奏など、所詮は弱者の慰めだ。', '聴かせてあげるよ。', '完成された“独奏”というものをね。']),
      outro: talk('第一奏卿《孤高の独奏者》ゼナカド', ['……僕の、音が……止まる？', 'フフ……面白い。', 'なら進め。', '君たちの旋律が、どこまで届くのか――見せてもらおう。'])
    },
    myrthi: {
      intro: talk('第二奏卿《黒紅の双刃戦姫》ミルティ', ['あはっ……やっと来た。', 'ねぇ、止まらないでね？', '一拍でもズレたら――', '死ぬから。']),
      outro: talk('第二奏卿《黒紅の双刃戦姫》ミルティ', ['はぁ……はぁ……。', '私のリズムを……崩した……？', '最高……。', '行きなよ。', '次の人は――私みたいに遊んでくれないから。'])
    },
    seripes: {
      intro: talk('第三奏卿《不落の反奏騎士》セリペス', ['……ここまでか。', '二つの奏を越え、それでもなお先を望むか。', 'ならば覚えておけ。', '私は、お前を倒すためにここにいるのではない。', '――この先へ、何者も通さぬためにいる。', 'ここは私の反奏域。', '進みたければ――', '私という“門”を越えてみせろ。']),
      outro: talk('第三奏卿《不落の反奏騎士》セリペス', ['……見事だ。', '受けても……返せぬ旋律が、あるとはな。', 'ならば行け。', '私が守っていたものを――その目で確かめるがいい。', 'だが忘れるな。', 'ここから先は――', '私に守られていた世界ではない。', '……だが。', 'その力……ただの奏ではないな。', '奪い、己のものとする――', '“怪盗”の力か。', 'ならば――もう一つ試してみるといい。', 'この世界の狭間に、“終わりのない回廊”がある。', '階を重ねるほど世界は歪み、帰る道さえ失っていく場所だ。', 'PHANTOM THIEFの力を得たというのなら――', 'どこまで奪い、どこまで生きて帰れるのか。', '己の力で、確かめてみろ。', '……扉は、二つ開いた。'])
    },
    astact: {
      intro: talk('第四奏卿《瞬断の奏刃》アスタクト', ['……セリペスを越えたのね。', 'なら、少しは楽しめそう。', 'でも――', '遅い。', 'あなたのリズム、私が奪う。', '一拍の隙で十分よ。']),
      outro: talk('第四奏卿《瞬断の奏刃》アスタクト', ['……私が、遅れた？', 'たった一拍……。', 'ふふ……そう。', 'あなたは、私の“間”に入ったのね。', '行きなさい。', '次の旋律は――', '私にも断ち切れない。'])
    },
    ostina: {
      intro: talk('第五奏卿《反復の狩律》オスティナ', ['……ようやく来た。', 'ゼナカドを越え、', 'ミルティを崩し、', 'セリペスの門を開き、', 'アスタクトの刃すら抜けた。', 'ここまで来れば――偶然とは呼べない。', 'あなたたちは“進んでいる”のではない。', '――導かれているのよ。']),
      outro: talk('第五奏卿《反復の狩律》オスティナ', ['……やはり、そう。', 'あなたたちはまだ知らない。', '誰が扉を置き、', '誰が鍵を残し――', '誰が、あなたたちをここまで歩かせたのか。', '進みなさい。', '答えは――', 'もうすぐ、あなたの方から迎えに来る。'])
    }
  };
  window.ARSENE_BOSS_DIALOGUES = DATA;
  const defeatedId = id => id === 'zenakado' ? 'zenacad' : id;
  const flags = game => {
    const f = game.profile.flags ||= {};
    f.bossIntroSeen ||= {};
    f.bossOutroSeen ||= {};
    return f;
  };
  P.playBossDialogue = function (lines) {
    this.closeBattleMenu?.();
    this.cancelAutoPick?.();
    return this.playNoiseSequence?.(lines, { className: 'boss-dialogue', glitch: false, sfx: 'ui' }) || Promise.resolve(false);
  };
  P.ensureBossDialogueSave = function () {
    const f = flags(this);
    for (const id of Object.keys(DATA)) {
      if (this.isBossDefeated?.(defeatedId(id))) {
        f.bossIntroSeen[id] = true;
        f.bossOutroSeen[id] = true;
      }
    }
    if (this.isBossDefeated?.('seripes')) f.infiniteScoreUnlocked = true;
    if (f.infiniteScoreUnlocked == null) f.infiniteScoreUnlocked = false;
    if (f.infiniteScoreWarningSeen == null) f.infiniteScoreWarningSeen = false;
  };
  const origLoad = P.loadProfile;
  P.loadProfile = function () {
    const profile = origLoad.call(this);
    this.profile = profile;
    this.ensureBossDialogueSave();
    return profile;
  };
  const origFresh = P.freshProfile;
  P.freshProfile = function () {
    const profile = origFresh.call(this);
    profile.flags.bossIntroSeen = {};
    profile.flags.bossOutroSeen = {};
    profile.flags.infiniteScoreUnlocked = false;
    profile.flags.infiniteScoreWarningSeen = false;
    return profile;
  };
  const wrapStart = (method, bossId) => {
    const original = P[method];
    P[method] = async function (...args) {
      const story = DATA[bossId], f = flags(this);
      if (story && !f.bossIntroSeen[bossId]) {
        if (this.bossDialogueStarting) return;
        this.bossDialogueStarting = bossId;
        f.bossIntroSeen[bossId] = true;
        this.saveProfile();
        await this.playBossDialogue(story.intro);
        this.bossDialogueStarting = null;
      }
      return original.apply(this, args);
    };
  };
  wrapStart('startMyrthiBoss', 'myrthi');
  wrapStart('startSeripesBoss', 'seripes');
  const origStartBossEncounter = P.startBossEncounter;
  P.startBossEncounter = async function (forceBossId = null, forcePhase = null) {
    const progress = this.progressState(), raw = forceBossId || progress.bossId;
    const id = raw === 'zenacad' ? 'zenakado' : raw;
    const story = DATA[id], f = flags(this);
    if (story && !f.bossIntroSeen[id]) {
      if (this.bossDialogueStarting) return;
      this.bossDialogueStarting = id;
      f.bossIntroSeen[id] = true;
      this.saveProfile();
      await this.playBossDialogue(story.intro);
      this.bossDialogueStarting = null;
    }
    return origStartBossEncounter.call(this, forceBossId, forcePhase);
  };
  const origRewardSequence = P.showBossRewardSequence;
  P.showBossRewardSequence = function (victory, stages = []) {
    const id = this.battleMode === 'zenacad' ? 'zenakado' : this.battleMode;
    const story = DATA[id], f = flags(this);
    if (!story || f.bossOutroSeen[id]) return origRewardSequence.call(this, victory, stages);
    f.bossOutroSeen[id] = true;
    if (id === 'seripes') f.infiniteScoreUnlocked = true;
    this.saveProfile();
    const nextStages = [...stages];
    if (id === 'seripes') nextStages.unshift({
      title: 'NEW PATHS UNLOCKED', copy: 'セリペスが守っていた二つの扉が開いた。', kicker: 'TWO DOORS OPENED',
      html: '<div class="boss-recipe-unlock"><small>NEW JOB UNLOCKED</small><b>《守護士》</b><strong>NEW CONTENT UNLOCKED</strong><span>《異世界・無限奏廊》<br>PHANTOM THIEF ONLY</span></div>'
    });
    this.locked = true;
    this.playBossDialogue(story.outro).then(() => origRewardSequence.call(this, victory, nextStages));
  };
  const origInfiniteBegin = P.isBegin;
  if (origInfiniteBegin) P.isBegin = async function (selected = []) {
    const f = flags(this);
    if (this.isInfiniteScoreUnlocked?.() && !f.infiniteScoreWarningSeen) {
      f.infiniteScoreWarningSeen = true;
      this.saveProfile();
      await this.playBossDialogue(talk('第三奏卿《不落の反奏騎士》セリペス', ['奪う覚悟があるなら進め。', 'ただし――', '奪われる覚悟も忘れるな。']));
    }
    return origInfiniteBegin.call(this, selected);
  };
})();
