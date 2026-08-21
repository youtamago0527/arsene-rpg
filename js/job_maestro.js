// ══════════════════════════════════════════════════════════════════
// 或世盗 -ARSÈNE-  魔奏士（MAGIC KNIGHT）の演奏システム
//
//  ・パッシブ《フォルテ》《クレッシェンド》《ノクターン》は
//    自分のターン開始時に抽選され、成功すると一時バフが乗る。
//  ・固有技《アンサンブル》は一定ターン、その抽選確率を引き上げる。
//  ・発動率・持続・重ねがけ上限は data.js の maestroBalance で調整する。
//
//  game.js より後に読み込むこと（BattleGame.prototype を拡張するため）。
// ══════════════════════════════════════════════════════════════════
(() => {
  'use strict';
  const BG = window.BattleGame;
  if (!BG) { console.error('[maestro] BattleGame が見つかりません'); return; }
  const P = BG.prototype;
  const D = () => window.ARSENE_DATA;
  const $ = s => document.querySelector(s);

  const CFG = () => Object.assign({
    procChance: 0.50, ensembleChance: 0.75, ensembleTurns: 3,
    buffTurns: 2, buffRate: 0.10, maxStacks: 3,
    nocturneTurns: 3, nocturneHealRate: 0.08, soloTurns: 2
  }, D().maestroBalance || {});

  // ── バフの入れ物 ──────────────────────────────────────────
  // songBuffs[kind] = [切れるターン, ...]。要素数がそのままスタック数になる。
  P.songBuffs = function () {
    this.player.buffs ||= {};
    this.player.buffs.songBuffs ||= {};
    return this.player.buffs.songBuffs;
  };
  // 期限切れを捨てて、いま生きているスタック数を返す
  P.songStacks = function (kind) {
    const store = this.songBuffs();
    const live = (store[kind] || []).filter(until => this.turn <= until);
    store[kind] = live;
    return live.length;
  };
  // 上限まで1スタック積む。積めたら true
  P.addSongStack = function (kind) {
    const cfg = CFG(), store = this.songBuffs();
    this.songStacks(kind);                       // 先に期限切れを掃除
    if (store[kind].length >= cfg.maxStacks) return false;
    store[kind].push(this.turn + Math.max(1, cfg.buffTurns) - 1);
    return true;
  };
  // ダメージへ掛ける倍率（1.0 が等倍）
  P.songBuffRate = function (kind) { return this.songStacks(kind) * CFG().buffRate; };

  // アンサンブル中かどうか
  P.isEnsembleActive = function () {
    const e = this.player?.buffs?.ensembleUntil;
    return typeof e === 'number' && this.turn <= e;
  };
  P.maestroProcChance = function () {
    const cfg = CFG();
    return this.isEnsembleActive() ? cfg.ensembleChance : cfg.procChance;
  };

  // ソロ（2回行動）が生きているか
  P.isDoubleActActive = function () {
    const u = this.player?.buffs?.doubleActUntil;
    return typeof u === 'number' && this.turn <= u;
  };

  // ── 自ターン開始時の抽選 ───────────────────────────────────
  P.rollMaestroPassives = async function () {
    const passives = this.activePassives().filter(p => p.passiveEffect?.type === 'turnStartBuff');
    if (!passives.length) return;
    const cfg = CFG(), chance = this.maestroProcChance();
    for (const p of passives) {
      const need = p.passiveEffect.requiresWeaponType;
      // 武器種の条件があるパッシブは、その武器を持っていないと抽選もしない
      if (need && this.equippedWeaponType() !== need) continue;
      const kind = p.passiveEffect.buff;
      // ソロ（2回行動）は影響が大きいので専用の発動率を持てる。
      // アンサンブル中は同じ比率で底上げする。
      let myChance = chance;
      if (kind === 'doubleAct' && cfg.soloChance != null) {
        myChance = this.isEnsembleActive()
          ? Math.min(1, cfg.soloChance * (cfg.ensembleChance / cfg.procChance))
          : cfg.soloChance;
      }
      if (Math.random() >= myChance) continue;
      let label;
      if (kind === 'regen') {
        // ノクターン：既存のリジェネ枠を使う（重ねがけせず上書き）
        this.player.buffs.regenerate = Math.max(this.player.buffs.regenerate || 0, cfg.nocturneTurns);
        label = `${cfg.nocturneTurns}ターン 自然回復`;
      } else if (kind === 'doubleAct') {
        // ソロ：重ねがけせず、鳴り直すたびに持続を上書きする
        if (this.isDoubleActActive()) continue;
        this.player.buffs.doubleActUntil = this.turn + Math.max(1, cfg.soloTurns) - 1;
        label = `${cfg.soloTurns}ターン 2回行動`;
      } else {
        if (!this.addSongStack(kind)) continue;   // 上限に達していれば演出も出さない
        const stacks = this.songStacks(kind);
        label = (kind === 'atkUp' ? '攻撃力' : '魔法攻撃力') + ` +${Math.round(stacks * cfg.buffRate * 100)}%`;
      }
      this.flashTitle(p.name, label);
      this.setLog(`《${p.name}》が響いた！ ${label}`);
      this.audio?.sfx?.('heal');
      await this.battleSleep(260);
    }
    this.updateHUD();
  };

  // ── 演奏中だけ使える専用技 ────────────────────────────────
  // requiresBuff を持つ技は、そのバフが乗っているあいだだけコマンドへ出す。
  P.conditionalJobSkills = function () {
    const jobId = this.profile.currentJob;
    return Object.values(D().skills).filter(s =>
      s.requiresBuff && s.jobId === jobId && this.songStacks(s.requiresBuff) > 0);
  };
  // 固有コマンド＝JOB Lv条件を満たした固有技＋発動中の専用技
  const origPersonal = P.personalSkills;
  P.personalSkills = function () {
    const base = origPersonal.call(this).filter(s => {
      const need = s.unlockJobLevel || 1;
      return (this.profile.jobs?.[this.profile.currentJob]?.level || 1) >= need;
    });
    return [...base, ...this.conditionalJobSkills()];
  };

  // 検証用：演出を挟まず抽選だけ回す同期版
  P.rollMaestroPassivesSync = function () {
    const passives = this.activePassives().filter(p => p.passiveEffect?.type === 'turnStartBuff');
    if (!passives.length) return;
    const cfg = CFG(), chance = this.maestroProcChance();
    for (const p of passives) {
      const need = p.passiveEffect.requiresWeaponType;
      if (need && this.equippedWeaponType() !== need) continue;
      const kind = p.passiveEffect.buff;
      let myChance = chance;
      if (kind === 'doubleAct' && cfg.soloChance != null) {
        myChance = this.isEnsembleActive() ? Math.min(1, cfg.soloChance * (cfg.ensembleChance / cfg.procChance)) : cfg.soloChance;
      }
      if (Math.random() >= myChance) continue;
      if (kind === 'regen') this.player.buffs.regenerate = Math.max(this.player.buffs.regenerate || 0, cfg.nocturneTurns);
      else if (kind === 'doubleAct') { if (!this.isDoubleActActive()) this.player.buffs.doubleActUntil = this.turn + Math.max(1, cfg.soloTurns) - 1; }
      else this.addSongStack(kind);
    }
  };

  // 既存のターン開始処理へ差し込む
  const origBegin = P.beginPlayerTurn;
  P.beginPlayerTurn = async function () {
    await origBegin.call(this);
    await this.rollMaestroPassives();
  };

  // ノクターンの回復量を maestroBalance 側に合わせる（既存リジェネは8%固定）
  // ※ 既存の regenerate 処理はそのまま使い、ここでは触らない。

  // ── ダメージへ反映 ────────────────────────────────────────
  const origDamageFor = P.damageFor;
  P.damageFor = function (skill, enemy) {
    const r = origDamageFor.call(this, skill, enemy);
    if (!r || !this.player) return r;
    const w = this.equippedWeapon() || {};
    const wType = skill.weaponType || w.weaponType || 'sword';
    const isMagic = skill.kind === 'magical' || skill.damageType === 'magical' || this.weaponDamageType(wType) === 'magical';
    const rate = isMagic ? this.songBuffRate('matkUp') : this.songBuffRate('atkUp');
    if (!rate) return r;
    return { ...r, value: Math.max(1, Math.round(r.value * (1 + rate))) };
  };

  // ── アンサンブル ──────────────────────────────────────────
  const origSelfSkill = P.applySelfSkill;
  P.applySelfSkill = async function (skill) {
    if (skill?.effect?.type === 'ensemble') {
      const cfg = CFG();
      this.player.buffs ||= {};
      this.player.buffs.ensembleUntil = this.turn + cfg.ensembleTurns - 1;
      this.flashTitle(skill.name, `発動率 ${Math.round(cfg.ensembleChance * 100)}% ／ ${cfg.ensembleTurns}ターン`);
      this.setLog(`《${skill.name}》 旋律が重なり、魔奏が乱れなくなった！`);
      this.audio?.sfx?.('heal');
      const ren = $('#ren'); ren?.classList.add('casting');
      await this.battleSleep(520);
      ren?.classList.remove('casting');
      return;
    }
    return origSelfSkill.call(this, skill);
  };

  // 戦闘開始時にバフを持ち越さない
  const origStart = P.startBattle;
  P.startBattle = function () {
    const r = origStart.call(this);
    if (this.player?.buffs) {
      this.player.buffs.songBuffs = {};
      delete this.player.buffs.ensembleUntil;
      delete this.player.buffs.doubleActUntil;
    }
    return r;
  };

  // ── ソロ：2回行動 ─────────────────────────────────────────
  // 追撃は同じ技を繰り返す。MPが足りなければ装備武器の通常攻撃に落とす。
  // 対象が倒れていたら生存敵へ狙いを移す。
  P.performExtraAction = async function (skill, targetIndex) {
    if (!this.enemies.some(e => e.alive) || this.finished || this.player.hp <= 0) return;
    let use = skill;
    if ((skill.mp || 0) > this.player.mp) use = this.basicAttackSkill();
    else this.player.mp -= (use.mp || 0);
    let idx = targetIndex;
    const aoe = use.target === 'all' || use.randomTarget || use.target === 'self';
    if (!aoe && !this.enemies[idx]?.alive) idx = this.enemies.findIndex(e => e.alive);
    if (!aoe && idx < 0) return;
    this.flashTitle('SOLO', '2回行動');
    this.setLog('《ソロ》 続けざまにもう一手！');
    await this.battleSleep(200);
    await this.playerActionWithSpark(use, idx);
  };

  const origExecute = P.executeRound;
  P.executeRound = async function (skillId, targetIndex) {
    // ソロが乗っているターンだけ、行動後に追撃を1回差し込む
    if (!this.isDoubleActActive() || this.locked) return origExecute.call(this, skillId, targetIndex);
    const skill = D().skills[skillId];
    const origAction = this.playerActionWithSpark;
    let done = false;
    // 最初の行動が終わった直後に追撃する
    this.playerActionWithSpark = async function (s, i) {
      await origAction.call(this, s, i);
      if (done) return;
      done = true;
      await this.performExtraAction(skill || s, targetIndex);
    };
    try { return await origExecute.call(this, skillId, targetIndex); }
    finally { this.playerActionWithSpark = origAction; }
  };

  // ── HUDへ現在のバフを出す ─────────────────────────────────
  // game.js の共通ステータス欄へ統合。旧フローティング欄は残さない。
  const origHud = P.updateHUD;
  P.updateHUD = function () {
    origHud.call(this);
    document.getElementById('maestro-buffs')?.remove();
  };
})();
