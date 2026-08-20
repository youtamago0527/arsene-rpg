// ══════════════════════════════════════════════════════════════════
// 或世盗 -ARSÈNE-  デバッグルーム（データ編集専用）
//
//  入り方 : 拠点のテーブルにいる狐を長押し（700ms）→ パスワード入力
//  用途   : モンスター・武器・防具・武器技・JOB・武器学・ダンジョン・
//           各種バランス値の 確認 / 調整 / 追加 / 削除。
//           UIの見た目調整は対象外（データだけを扱う）。
//  保存   : 変更は localStorage に「差分」として貯まり、次回起動時に
//           window.ARSENE_DATA へ自動適用される。
//           「書き出し」で差分JSONをコピーでき、それを data.js へ
//           正式に取り込めば全端末へ反映できる。
//
//  ★重要★ このファイルは data.js より後、game.js より前に読み込むこと。
//          （ゲーム起動前に差分を当てる必要があるため）
//
//  タブを増やしたいときは CATEGORIES に1行足すだけでよい。
//    key    : ARSENE_DATA のトップレベルキー（差分の保存単位）
//    list   : true = { id: {...} } のレコード集合（追加・削除できる）
//             false = 単一の設定オブジェクト（値の調整のみ）
//    path   : list:false のとき、key の中の入れ子を指定できる
//    filter : list:true のとき、表示するレコードを絞り込む
// ══════════════════════════════════════════════════════════════════
(() => {
  'use strict';

  const STORE_KEY = 'arsene-debug-overrides-v1';
  const UNLOCK_KEY = 'arsene-debug-unlocked-v1';
  const LONG_PRESS_MS = 700;

  const isPassive = s => s.kind === 'passive' || /^p_/.test(s.id || '');
  const isJobSkill = s => s.source === 'job' || !!s.jobId;

  const CATEGORIES = [
    { g: '敵', key: 'enemies', label: 'モンスター', list: true, hint: 'stats / exp / gold / dropTable / ai' },

    { g: '装備', key: 'weapons', label: '武器', list: true, hint: 'weaponType / attackPower / magicAttackPower / effects' },
    { g: '装備', key: 'armors', label: '防具', list: true, hint: 'slot / defensePower / magicDefensePower / effects' },
    { g: '装備', key: 'accessories', label: 'アクセサリ', list: true, hint: 'bonuses / effects' },
    { g: '装備', key: 'items', label: 'アイテム・素材', list: true, hint: '消費・素材・キーアイテム' },
    { g: '装備', key: 'recipes', label: '工房レシピ', list: true, hint: 'materials / gold / materialUnlockId' },
    { g: '装備', key: 'enchantTable', label: '強化', list: false, hint: '成功率 / 費用 / powerRate（+1あたりの上昇率）' },

    { g: '技', key: 'skills', label: '通常攻撃', list: true, hint: '武器種ごとの「たたかう」', filter: s => s.kind === 'weapon' && !s.prerequisiteSkill },
    { g: '技', key: 'skills', label: '武器技（閃き）', list: true, hint: 'prerequisiteSkill / requiredWeaponLevel / sparkRate', filter: s => !!s.prerequisiteSkill },
    { g: '技', key: 'skills', label: 'JOB固有技', list: true, hint: 'jobId / power / mp / effect', filter: s => isJobSkill(s) && !isPassive(s) },
    { g: '技', key: 'skills', label: 'パッシブ', list: true, hint: '常時効果', filter: isPassive },
    { g: '技', key: 'skills', label: 'その他の技', list: true, hint: '上記に入らないもの', filter: s => !s.prerequisiteSkill && !isJobSkill(s) && !isPassive(s) && s.kind !== 'weapon' },

    { g: 'JOB', key: 'jobs', label: 'JOB定義', list: true, hint: '名前 / 解放条件 / 習得パッシブ' },
    { g: 'JOB', key: 'growthBalance', label: 'JOB成長値', list: false, path: 'jobGrowthPerLevel', hint: 'JOB Lvごとの基礎能力上昇（1レベルあたり）' },
    { g: 'JOB', key: 'jobExpTable', label: 'JOB必要EXP', list: false, hint: 'Lvごとの必要JEXP' },
    { g: 'JOB', key: 'jobCommandAbilities', label: 'JOBコマンド', list: false, hint: 'JOBごとのコマンド表示' },

    { g: '武器学', key: 'weaponTypes', label: '武器種', list: true, hint: 'id / name / 初期武器 / 解放フラグ', arrayIdKey: 'id' },
    { g: '武器学', key: 'weaponScaling', label: '武器倍率', list: false, hint: '武器種→どの能力を攻撃力に変換するか' },
    { g: '武器学', key: 'growthBalance', label: '武器学の伸び', list: false, path: 'weaponExpTable', hint: 'base / growth / curve（Lvアップに必要な武器EXP）' },
    { g: '武器学', key: 'basicAttackByWeaponType', label: '武器種→通常攻撃', list: false, hint: '武器種ごとの通常攻撃ID' },
    { g: '武器学', key: 'weaponArtsCommand', label: '技コマンド名', list: false, hint: '剣技・拳技・魔法などの表示名' },

    { g: 'ダンジョン', key: 'dungeons', label: 'ダンジョン・階層', list: true, hint: 'floors / winsToClear / encounterProgression', arrayIdKey: 'id' },
    { g: 'ダンジョン', key: 'battleProgression', label: 'D1の進行', list: false, hint: 'ノエル / ゼナカドの出現勝利数' },
    { g: 'ダンジョン', key: 'settings', label: '解放条件など', list: false, hint: 'ボス再戦回数 / D2ボス解放 / デバッグPW' },

    { g: 'バランス', key: 'combatBalance', label: '戦闘計算', list: false, hint: '会心率 / 敵ダメージ式 / ばらつき' },
    { g: 'バランス', key: 'growthBalance', label: '成長全体', list: false, hint: 'HP/MP成長率 / 閃き率 / 特性倍率' },
    { g: 'バランス', key: 'accuracy', label: '命中率', list: false, hint: '器用さ→命中（隠しステータス）' },
    { g: 'バランス', key: 'defenseScaling', label: '防御の参照', list: false, hint: '物理=体力+防御力 / 魔法=精神+魔法防御力' }
  ];

  // ── 差分ストア ────────────────────────────────────────────────
  const loadOverrides = () => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; }
  };
  const saveOverrides = o => localStorage.setItem(STORE_KEY, JSON.stringify(o));

  // 差分を ARSENE_DATA へ適用する。
  //   { enemies: { shadowSlime: {...} } }        … 上書き（レコード丸ごと差し替え）
  //   { enemies: { __deleted: ['ghostBone'] } }  … 削除
  //   { combatBalance: {...} }                   … 単一オブジェクトへマージ
  function applyOverrides(data, ov) {
    for (const [key, patch] of Object.entries(ov || {})) {
      const target = data[key];
      if (target == null) continue;
      const isRecordSet = Array.isArray(target) || CATEGORIES.some(c => c.key === key && c.list);
      if (!isRecordSet) { Object.assign(target, patch); continue; }
      if (Array.isArray(target)) {
        for (const [id, rec] of Object.entries(patch)) {
          if (id === '__deleted') continue;
          const i = target.findIndex(x => x.id === id);
          if (i >= 0) target[i] = rec; else target.push(rec);
        }
        (patch.__deleted || []).forEach(id => {
          const i = target.findIndex(x => x.id === id);
          if (i >= 0) target.splice(i, 1);
        });
      } else {
        for (const [id, rec] of Object.entries(patch)) {
          if (id === '__deleted') continue;
          target[id] = rec;
        }
        (patch.__deleted || []).forEach(id => { delete target[id]; });
      }
    }
  }

  // ★起動時に差分を適用（game.js が読む前に済ませる）
  const bootOverrides = loadOverrides();
  if (window.ARSENE_DATA && Object.keys(bootOverrides).length) {
    try { applyOverrides(window.ARSENE_DATA, bootOverrides); console.log('[debug] 差分を適用しました', bootOverrides); }
    catch (e) { console.warn('[debug] 差分の適用に失敗', e); }
  }

  // ── 見た目（デバッグ用なので最小限） ──────────────────────────
  const CSS = `
  #dbg-root{position:fixed;inset:0;z-index:99999;display:none;background:#05070c;color:#cfe0f2;font:13px/1.6 system-ui,sans-serif}
  #dbg-root.open{display:grid;grid-template-rows:auto 1fr auto}
  #dbg-root *{box-sizing:border-box}
  .dbg-bar{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#0a1120;border-bottom:1px solid #1d3a5c}
  .dbg-bar b{font-size:14px;letter-spacing:.1em;color:#5fc6ff}
  .dbg-bar small{color:#6a7f96}
  .dbg-bar .sp{flex:1}
  .dbg-bar button{padding:6px 12px;background:#122744;color:#cfe0f2;border:1px solid #2f6ea8;border-radius:4px;cursor:pointer;font-size:12px}
  .dbg-bar button:hover{background:#1a3a63}
  .dbg-bar button.danger{border-color:#a8422f;color:#ff9d86}
  .dbg-body{display:grid;grid-template-columns:168px 240px 1fr;min-height:0}
  @media(max-width:820px){.dbg-body{grid-template-columns:1fr;grid-template-rows:auto auto 1fr}.dbg-cat,.dbg-list{max-height:22vh}.dbg-edit{min-height:44vh}}
  .dbg-col{min-height:0;overflow:auto;border-right:1px solid #142238;padding:8px}
  .dbg-col h4{margin:10px 0 5px;font-size:10px;letter-spacing:.14em;color:#5d7a99}
  .dbg-col h4:first-child{margin-top:0}
  .dbg-cat button,.dbg-list button{display:block;width:100%;text-align:left;padding:6px 8px;margin-bottom:3px;background:#0b1526;color:#a8c0d8;border:1px solid #16283f;border-radius:3px;cursor:pointer;font-size:12px}
  .dbg-cat button.on,.dbg-list button.on{background:#153252;color:#9fd8ff;border-color:#2f6ea8}
  .dbg-list button.edited{border-color:#c8a04a;color:#ffdc94}
  .dbg-list button.edited:after{content:' ●';color:#c8a04a}
  .dbg-search{width:100%;padding:6px 8px;margin-bottom:6px;background:#080e1a;color:#cfe0f2;border:1px solid #1d3a5c;border-radius:3px;font-size:12px}
  .dbg-edit{display:flex;flex-direction:column;gap:8px;padding:10px;min-height:0}
  .dbg-edit textarea{flex:1;min-height:200px;width:100%;padding:10px;background:#060b14;color:#bfe3ff;border:1px solid #1d3a5c;border-radius:4px;font:12px/1.5 ui-monospace,Consolas,monospace;resize:none;white-space:pre;overflow:auto}
  .dbg-edit textarea.bad{border-color:#c0392b}
  .dbg-actions{display:flex;flex-wrap:wrap;gap:8px}
  .dbg-actions button{padding:7px 14px;background:#122744;color:#cfe0f2;border:1px solid #2f6ea8;border-radius:4px;cursor:pointer;font-size:12px}
  .dbg-actions button.primary{background:#1c4b7d;border-color:#3f8fd0}
  .dbg-actions button.danger{border-color:#a8422f;color:#ff9d86}
  .dbg-msg{min-height:20px;font-size:12px;color:#8fd6a8}
  .dbg-msg.err{color:#ff9d86}
  .dbg-hint{font-size:11px;color:#67809a}
  .dbg-foot{padding:8px 12px;background:#0a1120;border-top:1px solid #1d3a5c;font-size:11px;color:#67809a}
  #dbg-gate{position:fixed;inset:0;z-index:100000;display:none;place-items:center;background:#02040ae6}
  #dbg-gate.open{display:grid}
  .dbg-gate-box{width:min(320px,86vw);padding:20px;background:#08111f;border:1px solid #2f6ea8;border-radius:6px;text-align:center}
  .dbg-gate-box b{display:block;margin-bottom:4px;font-size:13px;letter-spacing:.14em;color:#5fc6ff}
  .dbg-gate-box small{display:block;margin-bottom:12px;font-size:11px;color:#67809a}
  .dbg-gate-box input{width:100%;padding:9px;margin-bottom:10px;background:#050a13;color:#cfe0f2;border:1px solid #1d3a5c;border-radius:4px;text-align:center;font-size:16px;letter-spacing:.3em}
  .dbg-gate-box .row{display:flex;gap:8px}
  .dbg-gate-box button{flex:1;padding:8px;background:#122744;color:#cfe0f2;border:1px solid #2f6ea8;border-radius:4px;cursor:pointer}
  .dbg-gate-box p{margin:8px 0 0;font-size:11px;color:#ff9d86;min-height:16px}
  `;

  let state = { cat: 0, id: null };

  function css() {
    if (document.getElementById('dbg-css')) return;
    const s = document.createElement('style'); s.id = 'dbg-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── データ取得ヘルパ ──────────────────────────────────────────
  const D = () => window.ARSENE_DATA || {};
  const cur = () => CATEGORIES[state.cat] || CATEGORIES[0];
  // list:false のとき実際に編集する対象（path があればその入れ子）
  function singleTarget(def) {
    const root = D()[def.key];
    return def.path ? (root || {})[def.path] : root;
  }
  function records(def) {
    const src = D()[def.key];
    if (!src) return {};
    if (!def.list) return { [def.path || def.key]: singleTarget(def) };
    const all = Array.isArray(src) ? Object.fromEntries(src.map(x => [x.id, x])) : src;
    if (!def.filter) return all;
    return Object.fromEntries(Object.entries(all).filter(([, v]) => { try { return def.filter(v); } catch (e) { return false; } }));
  }
  const recordName = (def, id) => {
    const r = records(def)[id];
    return r && r.name ? `${id}　${r.name}` : id;
  };

  // ── 描画 ──────────────────────────────────────────────────────
  function render() {
    const root = document.getElementById('dbg-root'); if (!root) return;
    const ov = loadOverrides(), def = cur(), recs = records(def), ids = Object.keys(recs);
    if (!state.id || !recs[state.id]) state.id = ids[0] || null;
    const q = (document.getElementById('dbg-q')?.value || '').trim().toLowerCase();
    const shown = ids.filter(id => !q || id.toLowerCase().includes(q) || (recs[id]?.name || '').toLowerCase().includes(q));
    const edited = new Set(Object.keys(ov[def.key] || {}).filter(k => k !== '__deleted'));

    // カテゴリ（グループ見出し付き）
    let html = '', lastG = null;
    CATEGORIES.forEach((c, i) => {
      if (c.g !== lastG) { html += `<h4>${c.g}</h4>`; lastG = c.g; }
      html += `<button data-cat="${i}" class="${i === state.cat ? 'on' : ''}">${c.label}</button>`;
    });
    root.querySelector('.dbg-cat').innerHTML = html;

    root.querySelector('.dbg-list').innerHTML = `<h4>項目 ${shown.length}/${ids.length}</h4>` +
      (def.list ? `<input id="dbg-q" class="dbg-search" placeholder="ID・名前で検索" value="${q.replace(/"/g, '&quot;')}">` : '') +
      shown.map(id => `<button data-id="${id}" class="${id === state.id ? 'on' : ''} ${def.list && edited.has(id) ? 'edited' : ''}">${recordName(def, id)}</button>`).join('');

    const ta = root.querySelector('#dbg-json');
    ta.value = state.id != null && recs[state.id] !== undefined ? JSON.stringify(recs[state.id], null, 2) : '';
    ta.classList.remove('bad');
    root.querySelector('.dbg-hint').textContent = `${def.g} / ${def.label} — ${def.hint}`;
    root.querySelector('#dbg-del').style.display = def.list ? '' : 'none';
    root.querySelector('#dbg-new').style.display = def.list ? '' : 'none';
    const n = Object.values(ov).reduce((a, p) => a + Object.keys(p).filter(k => k !== '__deleted').length + (p.__deleted || []).length, 0);
    root.querySelector('.dbg-foot').textContent =
      `未書き出しの変更 ${n} 件　／　変更は端末に保存され次回起動時にも適用されます。data.js へ正式に取り込むには「書き出し」でJSONをコピーしてください。`;
  }

  function msg(text, isErr) {
    const el = document.querySelector('#dbg-root .dbg-msg'); if (!el) return;
    el.textContent = text; el.classList.toggle('err', !!isErr);
    clearTimeout(msg._t); msg._t = setTimeout(() => { el.textContent = ''; }, 5000);
  }

  // ── 操作 ──────────────────────────────────────────────────────
  function saveCurrent() {
    const ta = document.getElementById('dbg-json'); let parsed;
    try { parsed = JSON.parse(ta.value); }
    catch (e) { ta.classList.add('bad'); msg('JSONが壊れています：' + e.message, true); return; }
    const def = cur(), ov = loadOverrides();
    if (def.list) {
      const id = parsed.id || state.id;
      if (!id) { msg('id が必要です', true); return; }
      ov[def.key] ||= {};
      ov[def.key][id] = parsed;
      if (ov[def.key].__deleted) ov[def.key].__deleted = ov[def.key].__deleted.filter(x => x !== id);
      state.id = id;
      saveOverrides(ov); applyOverrides(D(), { [def.key]: { [id]: parsed } });
    } else if (def.path) {
      // 入れ子を書き換え、トップレベルごと差分として保存する
      const root = D()[def.key]; root[def.path] = parsed;
      ov[def.key] = { ...(ov[def.key] || {}), [def.path]: parsed };
      saveOverrides(ov);
    } else {
      Object.assign(D()[def.key], parsed);
      ov[def.key] = { ...(ov[def.key] || {}), ...parsed };
      saveOverrides(ov);
    }
    render();
    msg('保存しました。戦闘に入り直すと反映されます。');
  }

  function newRecord() {
    const def = cur(); if (!def.list) return;
    const base = records(def)[state.id];
    if (!base) { msg('複製元がありません', true); return; }
    const id = prompt('新しいID（半角英数）', (base.id || 'new') + '_copy');
    if (!id) return;
    const src = D()[def.key];
    const exists = Array.isArray(src) ? src.some(x => x.id === id) : !!src[id];
    if (exists) { msg('そのIDは既にあります', true); return; }
    const copy = JSON.parse(JSON.stringify(base)); copy.id = id;
    if (copy.name) copy.name += '（複製）';
    const ov = loadOverrides(); ov[def.key] ||= {}; ov[def.key][id] = copy;
    saveOverrides(ov); applyOverrides(D(), { [def.key]: { [id]: copy } });
    state.id = id; render();
    msg(`${id} を追加しました。中身を編集して保存してください。`);
  }

  function deleteRecord() {
    const def = cur(); if (!def.list || !state.id) return;
    if (!confirm(`${recordName(def, state.id)} を削除しますか？\n出現テーブルやレシピから参照されていると戦闘でエラーになります。`)) return;
    const ov = loadOverrides(); ov[def.key] ||= {};
    delete ov[def.key][state.id];
    ov[def.key].__deleted = [...new Set([...(ov[def.key].__deleted || []), state.id])];
    saveOverrides(ov);
    const src = D()[def.key];
    if (Array.isArray(src)) { const i = src.findIndex(x => x.id === state.id); if (i >= 0) src.splice(i, 1); }
    else delete src[state.id];
    state.id = null; render(); msg('削除しました。');
  }

  function revertCurrent() {
    const def = cur(), ov = loadOverrides();
    if (!ov[def.key]) { msg('このタブに変更はありません'); return; }
    if (def.list) {
      if (!ov[def.key][state.id]) { msg('この項目に変更はありません'); return; }
      delete ov[def.key][state.id];
    } else delete ov[def.key];
    if (!Object.keys(ov[def.key] || {}).length) delete ov[def.key];
    saveOverrides(ov); render();
    msg('変更を取り消しました。ページを再読み込みすると元の値に戻ります。');
  }

  function exportAll() {
    const text = JSON.stringify(loadOverrides(), null, 2);
    const ta = document.getElementById('dbg-json');
    ta.value = text; state.id = null;
    navigator.clipboard?.writeText(text).then(
      () => msg('差分JSONをクリップボードにコピーしました。これを渡してもらえれば data.js に取り込みます。'),
      () => msg('コピーできなかったので、上のテキストを選択して手動でコピーしてください。', true)
    );
  }

  function resetAll() {
    if (!confirm('端末に保存した変更をすべて破棄しますか？\ndata.js の元の値に戻ります。')) return;
    localStorage.removeItem(STORE_KEY);
    msg('破棄しました。ページを再読み込みしてください。');
  }

  // ── 組み立て ──────────────────────────────────────────────────
  function build() {
    if (document.getElementById('dbg-root')) return;
    css();
    const root = document.createElement('div');
    root.id = 'dbg-root';
    root.innerHTML = `
      <div class="dbg-bar">
        <b>DEBUG ROOM</b><small>データ編集専用</small><span class="sp"></span>
        <button id="dbg-export">書き出し</button>
        <button id="dbg-reset" class="danger">全変更を破棄</button>
        <button id="dbg-close">閉じる</button>
      </div>
      <div class="dbg-body">
        <div class="dbg-col dbg-cat"></div>
        <div class="dbg-col dbg-list"></div>
        <div class="dbg-col dbg-edit">
          <div class="dbg-hint"></div>
          <textarea id="dbg-json" spellcheck="false"></textarea>
          <div class="dbg-actions">
            <button id="dbg-save" class="primary">保存</button>
            <button id="dbg-new">複製して追加</button>
            <button id="dbg-revert">元に戻す</button>
            <button id="dbg-del" class="danger">削除</button>
          </div>
          <div class="dbg-msg"></div>
        </div>
      </div>
      <div class="dbg-foot"></div>`;
    document.body.appendChild(root);

    root.addEventListener('click', e => {
      const cat = e.target.closest('[data-cat]');
      if (cat) { state.cat = +cat.dataset.cat; state.id = null; render(); return; }
      const id = e.target.closest('[data-id]');
      if (id) { state.id = id.dataset.id; render(); return; }
      if (e.target.id === 'dbg-save') return saveCurrent();
      if (e.target.id === 'dbg-new') return newRecord();
      if (e.target.id === 'dbg-del') return deleteRecord();
      if (e.target.id === 'dbg-revert') return revertCurrent();
      if (e.target.id === 'dbg-export') return exportAll();
      if (e.target.id === 'dbg-reset') return resetAll();
      if (e.target.id === 'dbg-close') return close();
    });
    root.addEventListener('input', e => { if (e.target.id === 'dbg-q') render(); });

    const gate = document.createElement('div');
    gate.id = 'dbg-gate';
    gate.innerHTML = `<div class="dbg-gate-box">
      <b>DEBUG ROOM</b><small>パスワードを入力</small>
      <input id="dbg-pw" type="password" inputmode="numeric" autocomplete="off">
      <div class="row"><button id="dbg-pw-ok">入る</button><button id="dbg-pw-ng">やめる</button></div>
      <p id="dbg-pw-err"></p></div>`;
    document.body.appendChild(gate);
    gate.addEventListener('click', e => {
      if (e.target.id === 'dbg-pw-ok') return tryPassword();
      if (e.target.id === 'dbg-pw-ng') return gate.classList.remove('open');
    });
    gate.addEventListener('keydown', e => { if (e.key === 'Enter') tryPassword(); });
  }

  function tryPassword() {
    const input = document.getElementById('dbg-pw'), err = document.getElementById('dbg-pw-err');
    const pw = String(D().settings?.debugPassword ?? '1229');
    if (input.value === pw) {
      sessionStorage.setItem(UNLOCK_KEY, '1');
      document.getElementById('dbg-gate').classList.remove('open');
      input.value = ''; err.textContent = '';
      open();
    } else { err.textContent = 'パスワードが違います'; input.value = ''; }
  }

  function open() { build(); document.getElementById('dbg-root').classList.add('open'); render(); }
  function close() { document.getElementById('dbg-root')?.classList.remove('open'); }

  function requestOpen() {
    build();
    if (sessionStorage.getItem(UNLOCK_KEY) === '1') { open(); return; }
    document.getElementById('dbg-gate').classList.add('open');
    setTimeout(() => document.getElementById('dbg-pw')?.focus(), 50);
  }

  // ── 入口：拠点の狐を長押し ────────────────────────────────────
  // 拠点は再描画されることがあるので、要素ではなく document 側で拾う。
  function bindLongPress() {
    let timer = null, sx = 0, sy = 0;
    const isFox = t => t && t.closest && t.closest('.hideout-fox');
    const cancel = () => { clearTimeout(timer); timer = null; };
    const start = e => {
      if (!isFox(e.target)) return;
      const p = e.touches ? e.touches[0] : e;
      sx = p.clientX; sy = p.clientY; cancel();
      timer = setTimeout(() => { timer = null; requestOpen(); }, LONG_PRESS_MS);
    };
    const move = e => {
      if (!timer) return;
      const p = e.touches ? e.touches[0] : e;
      if (Math.abs(p.clientX - sx) > 12 || Math.abs(p.clientY - sy) > 12) cancel();
    };
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchmove', move, { passive: true });
    document.addEventListener('touchend', cancel);
    document.addEventListener('touchcancel', cancel);
    document.addEventListener('mousedown', start);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', cancel);
    document.addEventListener('mouseleave', cancel);
    document.addEventListener('dragstart', e => { if (isFox(e.target)) e.preventDefault(); });
    document.addEventListener('contextmenu', e => { if (isFox(e.target)) e.preventDefault(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindLongPress);
  else bindLongPress();

  // 実機で長押しが効かないときの逃げ道
  window.arseneDebugRoom = { open: requestOpen, overrides: loadOverrides, reset: resetAll };
})();
