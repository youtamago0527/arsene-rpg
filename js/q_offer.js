/* Q'S OFFER — provider-neutral reward offers. No ad SDK or forced navigation. */
(function(){
  const DAILY = 2, DAY = () => new Date().toLocaleDateString('ja-JP');
  const defs = {
    auto2:{title:'AUTO ×2.0',copy:'30分間、AUTO速度を×2.0へ。',key:'auto2Uses',expiry:'auto2ExpiresAt',label:'AUTO速度アップ'},
    sweep:{title:'一掃',copy:'30分間、一掃の特典を有効化。',key:'sweepUses',expiry:'sweepExpiresAt',label:'一掃ブースト'},
    otherworld:{title:'異世界 +1',copy:'本日の異世界入場回数を1回追加。',key:'otherworldUses',label:'異世界入場'},
    revive:{title:'怪盗の再起',copy:'戦闘不能から復活し、HP50%で現在の戦闘を続行する。',key:'reviveUses',label:'戦闘復活'},
    protect:{title:'保護のアルカナ',copy:'強化失敗時、ベース装備の破壊を1回防ぐ。',key:'restoreUses',label:'強化保護'},
    bossDrop:{title:'ボス報酬ボーナス',copy:'次回以降のボス撃破で追加ドロップ抽選。',key:'bossDrop',label:'ボス追加ドロップ'}
  };
  function game(){return window.arseneGame;}
  function state(g){
    g.profile.rewardState ||= {};
    const s=g.profile.rewardState;
    if(s.dateKey!==DAY()){Object.assign(s,{dateKey:DAY(),auto2Uses:0,sweepUses:0,otherworldUses:0,reviveUses:0,restoreUses:0});}
    return s;
  }
  function save(g){g.saveProfile?.();}
  function active(s,key){return Number(s[key]||0)>Date.now();}
  const api = {
    defs,
    show(type='auto2', extra={}){
      const g=game(); if(!g)return;
      const d={...(defs[type]||defs.auto2),...extra};
      const modal=document.createElement('div'); modal.className='q-offer-modal'; modal.innerHTML=`<div class="q-offer-card" role="dialog" aria-label="Q offer"><button class="q-offer-close" data-q-close aria-label="閉じる">×</button><div class="q-offer-q">Q</div><small class="q-offer-kicker">Q'S OFFER</small><h2>${d.title}</h2><p>${d.copy}</p><div class="q-offer-ad"><span>広告を再生しています</span><b data-q-countdown>3</b></div><button class="q-offer-watch" data-q-watch>報酬を受け取る<span>WATCH MOCK AD</span></button></div>`;
      if(type==='revive') modal.classList.add('q-offer-defeat');
      document.body.appendChild(modal); let n=3; const count=modal.querySelector('[data-q-countdown]'); const timer=setInterval(()=>{n--; if(count)count.textContent=n; if(n<=0){clearInterval(timer); modal.querySelector('[data-q-watch]').disabled=false; modal.querySelector('[data-q-watch]').textContent='報酬を受け取る';}},1000); modal.querySelector('[data-q-watch]').disabled=true;
      modal.addEventListener('click',e=>{if(e.target.closest('[data-q-close]')){clearInterval(timer);modal.remove();} if(e.target.closest('[data-q-watch]')&&!e.target.closest('[data-q-watch]').disabled){clearInterval(timer);const granted=api.grant(type);modal.remove();if(granted&&typeof d.onGrant==='function')d.onGrant();}});
    },
    grant(type){const g=game();if(!g)return false;const d=defs[type]||defs.auto2,s=state(g),daily=['auto2','sweep','otherworld','revive','protect'].includes(type);if(daily&&Number(s[d.key]||0)>=DAILY){g.startFlow?.toast?.('本日のQ’S OFFERは受け取り済みです');return false;}if(daily)s[d.key]=(Number(s[d.key])||0)+1;if(d.expiry)s[d.expiry]=Math.max(Number(s[d.expiry])||0,Date.now()+30*60*1000);if(type==='protect')s.enhancementProtection=(Number(s.enhancementProtection)||0)+1;if(type==='bossDrop')s.bossDropBonus=(Number(s.bossDropBonus)||0)+1;if(type==='otherworld')s.otherworldBonus=(Number(s.otherworldBonus)||0)+1;save(g);api.indicator();return true;},
    consumeEnhancementProtection(g){const s=state(g);if((s.enhancementProtection||0)<=0)return false;s.enhancementProtection--;save(g);return true;},
    indicator(){const g=game();if(!g)return;const s=state(g);let el=document.getElementById('q-offer-indicator');if(!el){el=document.createElement('div');el.id='q-offer-indicator';document.body.appendChild(el);}const rows=[];if(active(s,'auto2ExpiresAt'))rows.push('AUTO ×2');if(active(s,'sweepExpiresAt'))rows.push('一掃');if(s.enhancementProtection)rows.push(`保護 ${s.enhancementProtection}`);if(s.bossDropBonus)rows.push(`BOSS +${s.bossDropBonus}`);el.textContent=rows.join('　');el.hidden=!rows.length;},
    debugHTML(){return `<section class="q-offer-debug"><header><b>Q'S OFFER // DEBUG</b><span>Mock provider・日次上限2回</span></header><div class="q-offer-debug-grid">${Object.entries(defs).map(([k,d])=>`<button data-q-debug="${k}">${d.title}<small>${d.label}</small></button>`).join('')}</div></section>`;}
    ,normalHTML(){return `<section class="q-offer-debug q-offer-normal"><header><b>Q'S OFFER</b><span>3秒で受け取り・日次上限あり</span></header><div class="q-offer-debug-grid">${Object.entries(defs).map(([k,d])=>`<button data-q-offer="${k}">${d.title}<small>${d.label}</small></button>`).join('')}</div></section>`;}
  };
  window.arseneQOffer=api;
  document.addEventListener('click',e=>{const b=e.target.closest('[data-q-debug],[data-q-offer]');if(b){api.show(b.dataset.qDebug||b.dataset.qOffer);}});
  window.addEventListener('load',()=>api.indicator());
})();
