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
    buffTurns: 1, buffRate: 0.10, maxStacks: 3,
    nocturneTurns: 3, nocturneHealRate: 0.08
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

  // ── 自ターン開始時の抽選 ───────────────────────────────────
  P.rollMaestroPassives = async function () {
    const passives = this.activePassives().filter(p => p.passiveEffect?.type === 'turnStartBuff');
    if (!passives.length) return;
    const cfg = CFG(), chance = this.maestroProcChance();
    for (const p of passives) {
      if (Math.random() >= chance) continue;
      const kind = p.passiveEffect.buff;
      if (kind === 'regen') {
        // ノクターン：既存のリジェネ枠を使う（重ねがけせず上書き）
        this.player.buffs.regenerate = Math.max(this.player.buffs.regenerate || 0, cfg.nocturneTurns);
      } else if (!this.addSongStack(kind)) {
        continue;                                 // 上限に達していれば演出も出さない
      }
      const stacks = kind === 'regen' ? 0 : this.songStacks(kind);
      const label = kind === 'atkUp' ? `攻撃力 +${Math.round(stacks * cfg.buffRate * 100)}%`
        : kind === 'matkUp' ? `魔法攻撃力 +${Math.round(stacks * cfg.buffRate * 100)}%`
          : `${cfg.nocturneTurns}ターン 自然回復`;
      this.flashTitle(p.name, label);
      this.setLog(`《${p.name}》が響いた！ ${label}`);
      this.audio?.sfx?.('heal');
      await this.battleSleep(260);
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
    if (this.player?.buffs) { this.player.buffs.songBuffs = {}; delete this.player.buffs.ensembleUntil; }
    return r;
  };

  // ── HUDへ現在のバフを出す ─────────────────────────────────
  const origHud = P.updateHUD;
  P.updateHUD = function () {
    origHud.call(this);
    if (!this.player) return;
    let box = document.getElementById('maestro-buffs');
    const atk = this.songStacks('atkUp'), matk = this.songStacks('matkUp');
    const regen = this.player.buffs?.regenerate || 0, ens = this.isEnsembleActive();
    const cfg = CFG(), chips = [];
    if (atk) chips.push(`<i class="mb-atk">フォルテ +${Math.round(atk * cfg.buffRate * 100)}%</i>`);
    if (matk) chips.push(`<i class="mb-matk">クレッシェンド +${Math.round(matk * cfg.buffRate * 100)}%</i>`);
    if (regen) chips.push(`<i class="mb-regen">ノクターン ${regen}T</i>`);
    if (ens) chips.push(`<i class="mb-ens">アンサンブル</i>`);
    if (!chips.length) { box?.remove(); return; }
    if (!box) {
      const host = document.querySelector('#ren')?.parentElement || document.querySelector('#battlefield');
      if (!host) return;
      box = document.createElement('div'); box.id = 'maestro-buffs'; box.className = 'maestro-buffs';
      host.appendChild(box);
    }
    box.innerHTML = chips.join('');
  };
})();
