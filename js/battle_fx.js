/* ══════════════════════════════════════════════════════════════
   戦闘エフェクト（武器種ごとの通常攻撃 + クリティカル）

   武器演出はDOM + CSS、炎属性の着弾は支給されたPixel Fire素材を使う。
   game.js の playerAttack から次の2点で呼ばれる：
     attackSwingFx(skill)              … 振りかぶり／詠唱のタイミング
     attackImpactFx(skill, el, crit)   … ヒットしたタイミング
   どちらも `?.()` 付きで呼ばれるので、このファイルが読めなくても戦闘は動く。
   ══════════════════════════════════════════════════════════════ */
(() => {
  const P = window.BattleGame?.prototype;
  if (!P) return;
  const $ = sel => document.querySelector(sel);

  // 演出用の要素は必ず一定時間で消す。戦闘が長引いてもDOMが増え続けないようにする。
  const spawn = (parent, className, ms, build) => {
    if (!parent) return null;
    const el = document.createElement('div');
    el.className = className;
    if (build) build(el);
    parent.appendChild(el);
    setTimeout(() => el.remove(), ms);
    return el;
  };

  // 対象の中心を battlefield 基準の座標で返す
  const centerIn = (field, el) => {
    const f = field.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height * .55, w: r.width, h: r.height };
  };

  // その攻撃がどの武器種のものか。技が武器種を持っていればそちらを優先する。
  P.fxWeaponType = function (skill) {
    return skill?.weaponType || this.equippedWeaponType?.() || 'sword';
  };
  // 魔法・回復などの非武器スキルは武器種エフェクトの対象外。
  // 装備が剣でも魔法に剣の斬撃が乗ってしまうのを防ぐ。
  P.fxIsWeaponAction = function (skill) {
    if (!skill) return true;
    if (skill.weaponType) return true;
    return skill.kind !== 'magical' && skill.kind !== 'hybrid';
  };
  // 杖を持っているだけでは炎扱いにしない。技データの属性を最優先する。
  P.fxIsFireAction = function (skill) {
    return (skill?.element || skill?.elementId) === 'fire';
  };

  // ── 振り／詠唱のタイミング ────────────────────────────────
  P.attackSwingFx = function (skill) {
    if (!this.fxIsWeaponAction(skill)) { this.audio?.sfx?.('magic'); return; }
    // 素早い斬撃は専用の連撃音を残す
    if (skill?.id === 'quickSlash') { this.audio?.sfx?.('quick'); return; }
    const type = this.fxWeaponType(skill), ren = $('#ren');
    if (!ren) return;
    ren.classList.add(`fx-swing-${type}`);
    setTimeout(() => ren.classList.remove(`fx-swing-${type}`), 420);
    this.audio?.sfx?.({ sword: 'swordSwing', martial: 'clawSwing', staff: 'fireCast', instrument: 'noteSwing', shield: 'shieldSwing' }[type] || 'swordSwing');
    if (type === 'instrument') this.fxNoteBurst(ren);
  };

  // ── ヒットのタイミング ────────────────────────────────────
  P.attackImpactFx = function (skill, targetEl, critical) {
    const field = $('#battlefield');
    if (!field || !targetEl) return;
    const at = centerIn(field, targetEl);
    if (this.fxIsFireAction(skill)) {
      this.fxPixelFireImpact(field, at);
      this.audio?.sfx?.('fireHit');
      if (critical) { this.audio?.sfx?.('criticalHit'); this.fxCritical(field, at); }
      return;
    }
    if (!this.fxIsWeaponAction(skill)) {
      this.audio?.sfx?.('enemyHit');
      if (critical) { this.audio?.sfx?.('criticalHit'); this.fxCritical(field, at); }
      return;
    }
    const type = this.fxWeaponType(skill);
    ({ sword: 'fxSlash', martial: 'fxClaw', staff: 'fxBurn', instrument: 'fxNotes', shield: 'fxImpact' }[type] || 'fxSlash')
      .split(' ').forEach(fn => this[fn]?.(field, at));
    // 武器ごとの音は常に鳴らし、クリティカルのときは衝撃音を重ねる
    this.audio?.sfx?.({ sword: 'swordHit', martial: 'clawHit', staff: 'fireHit', instrument: 'noteHit', shield: 'shieldHit' }[type] || 'swordHit');
    if (critical) { this.audio?.sfx?.('criticalHit'); this.fxCritical(field, at); }
  };

  // 炎属性：Pixel Fire Asset Packの8フレーム炎を、既存の着弾光と重ねる。
  P.fxPixelFireImpact = function (field, at) {
    spawn(field, 'fx fx-pixel-fire-impact', 840, el => {
      el.style.left = `${at.x}px`; el.style.top = `${at.y}px`;
      el.style.setProperty('--fx-size', `${Math.max(76, Math.min(112, at.w * .92))}px`);
      const img = document.createElement('img');
      // 同じ敵への連続着弾でもGIFを必ず先頭フレームから再生する。
      img.src = `assets/effects/fire/pixel-fire-impact.gif?v=1&hit=${Date.now()}-${Math.random()}`;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<i class="fx-blast"></i><i class="fx-fire-ring"></i>';
      el.appendChild(img);
    });
  };

  // 剣：斜めに走る一閃と、遅れて消える残光
  P.fxSlash = function (field, at) {
    spawn(field, 'fx fx-slash', 460, el => {
      el.style.left = `${at.x}px`; el.style.top = `${at.y}px`;
      el.style.setProperty('--fx-size', `${Math.max(96, at.w * 1.5)}px`);
      el.innerHTML = '<i class="fx-slash-line"></i><i class="fx-slash-glow"></i>';
    });
  };

  // 爪：3本の平行な裂傷
  P.fxClaw = function (field, at) {
    spawn(field, 'fx fx-claw', 480, el => {
      el.style.left = `${at.x}px`; el.style.top = `${at.y}px`;
      el.style.setProperty('--fx-size', `${Math.max(84, at.w * 1.25)}px`);
      el.innerHTML = '<i style="--n:0"></i><i style="--n:1"></i><i style="--n:2"></i>';
    });
  };

  // 杖：着弾の炎。爆ぜてから、しばらく燃えている。
  P.fxBurn = function (field, at) {
    spawn(field, 'fx fx-burn', 1150, el => {
      el.style.left = `${at.x}px`; el.style.top = `${at.y}px`;
      el.style.setProperty('--fx-size', `${Math.max(104, at.w * 1.45)}px`);
      const flames = Array.from({ length: 11 }, (_, i) =>
        `<i class="fx-flame" style="--n:${i};--dx:${(Math.random() * 2 - 1).toFixed(2)};--sc:${(.5 + Math.random() * .8).toFixed(2)};--dly:${(Math.random() * .28).toFixed(2)}s"></i>`).join('');
      const embers = Array.from({ length: 9 }, (_, i) =>
        `<i class="fx-ember" style="--n:${i};--dx:${(Math.random() * 2 - 1).toFixed(2)};--dly:${(Math.random() * .35).toFixed(2)}s"></i>`).join('');
      el.innerHTML = `<i class="fx-blast"></i>${flames}${embers}`;
    });
  };

  // 楽器：音符が着弾点から広がって舞う
  P.fxNotes = function (field, at) {
    const glyphs = ['♪', '♫', '♬', '♩'];
    spawn(field, 'fx fx-notes', 1000, el => {
      el.style.left = `${at.x}px`; el.style.top = `${at.y}px`;
      el.innerHTML = '<i class="fx-ring"></i>' + Array.from({ length: 7 }, (_, i) => {
        const a = (-90 + (i - 3) * 30) * Math.PI / 180, dist = 54 + Math.random() * 52;
        return `<b class="fx-note" style="--dx:${(Math.cos(a) * dist).toFixed(1)}px;--dy:${(Math.sin(a) * dist).toFixed(1)}px;--dly:${(i * .045).toFixed(2)}s;--rot:${(Math.random() * 60 - 30).toFixed(0)}deg">${glyphs[i % glyphs.length]}</b>`;
      }).join('');
    });
  };

  // 楽器の振り：奏者の周りにも音符を出す
  P.fxNoteBurst = function (ren) {
    const field = $('#battlefield'); if (!field) return;
    const at = centerIn(field, ren);
    spawn(field, 'fx fx-notes fx-notes-self', 900, el => {
      el.style.left = `${at.x}px`; el.style.top = `${at.y}px`;
      el.innerHTML = Array.from({ length: 4 }, (_, i) =>
        `<b class="fx-note" style="--dx:${(-10 + Math.random() * 46).toFixed(1)}px;--dy:${(-34 - Math.random() * 34).toFixed(1)}px;--dly:${(i * .07).toFixed(2)}s;--rot:${(Math.random() * 40 - 20).toFixed(0)}deg">${['♪', '♫', '♬'][i % 3]}</b>`).join('');
    });
  };

  // 盾：鈍い衝撃の輪
  P.fxImpact = function (field, at) {
    spawn(field, 'fx fx-impact', 460, el => {
      el.style.left = `${at.x}px`; el.style.top = `${at.y}px`;
      el.style.setProperty('--fx-size', `${Math.max(90, at.w * 1.3)}px`);
      el.innerHTML = '<i></i><i class="d2"></i>';
    });
  };

  // クリティカル：画面フラッシュ＋衝撃波＋放射の閃光
  P.fxCritical = function (field, at) {
    spawn(field, 'fx-crit-flash', 360);
    spawn(field, 'fx fx-crit', 720, el => {
      el.style.left = `${at.x}px`; el.style.top = `${at.y}px`;
      el.innerHTML = '<i class="fx-crit-ring"></i><i class="fx-crit-ring d2"></i>'
        + Array.from({ length: 8 }, (_, i) => `<i class="fx-crit-ray" style="--a:${i * 45}deg"></i>`).join('')
        + '<b class="fx-crit-label">CRITICAL</b>';
    });
    // 一瞬だけ画面を揺らす
    const bf = field;
    bf.classList.add('fx-shake');
    setTimeout(() => bf.classList.remove('fx-shake'), 340);
  };

  // ── 炎属性の攻撃は弾も炎にする ────────────────────────────
  const origProjectile = P.magicProjectile;
  P.magicProjectile = async function (targetEl, skill) {
    const fire = this.fxIsFireAction(skill);
    if (!fire) return origProjectile.call(this, targetEl, skill);
    const field = $('#battlefield'), from = $('#weapon-layer'), ren = $('#ren');
    if (!field || !targetEl) return origProjectile.call(this, targetEl, skill);
    const f = field.getBoundingClientRect();
    const src = (from?.getBoundingClientRect().width ? from : ren).getBoundingClientRect();
    const to = targetEl.getBoundingClientRect();
    const sx = src.right - f.left, sy = src.top - f.top + src.height * .22;
    const ex = to.left - f.left + to.width * .48, ey = to.top - f.top + to.height * .58;
    // 飛翔音は火球が飛び出す瞬間に鳴らす（着弾音ではないため）
    this.audio?.sfx?.('fireFlight');
    spawn(field, 'fx-fireball', 520, el => {
      el.style.left = `${sx}px`; el.style.top = `${sy}px`;
      el.style.setProperty('--shot-x', `${ex - sx}px`);
      el.style.setProperty('--shot-y', `${ey - sy}px`);
      el.innerHTML = '<i class="fb-core"></i><i class="fb-trail"></i>';
    });
    await this.battleSleep(460);
  };
})();
