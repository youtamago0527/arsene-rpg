// 無限奏廊の個体装備。既存装備IDや敵の設定とは独立させる。
(() => {
  'use strict';
  const D = window.ARSENE_DATA;
  const op = (key, label, grade) => ({key, label, grade});
  // Fixed ranges for action and recovery effects, including on INFINITY equipment.
  const tactical = (key,label,grade,table,values,totalCapPercent) =>
    ({key,label,grade,table,values,totalCapPercent});
  const pairValues = [9,12,15,18];
  const combination = (key,label,grade,stats,values=pairValues,details={}) =>
    ({key,label,grade,stats,values,...details});
  const baseAttributes = ['str','vit','mag','mnd','agi','dex','luk'];
  const equipmentPower = ['attackPower','magicAttackPower','defensePower','magicDefensePower'];
  D.infiniteGearV2 = {
    baseAttributes, equipmentPower,
    tiers: [
      {id:'common', name:'COMMON', prefix:'異界の', color:'#c3c8d1', count:[1,1], values:[3,10], weights:[100,0,0,0,0]},
      {id:'rare', name:'RARE', prefix:'深淵の', color:'#50aaff', count:[1,2], values:[15,25], weights:[35,65,0,0,0]},
      {id:'epic', name:'EPIC', prefix:'混沌の', color:'#b56cff', count:[2,3], values:[30,45], weights:[10,35,55,0,0]},
      {id:'legendary', name:'LEGEND', prefix:'神滅の', color:'#ffc750', count:[3,4], values:[50,65], weights:[0,15,35,50,0]},
      {id:'mythic', name:'MYTHIC', prefix:'終焉の', color:'#ff5e70', count:[4,5], values:[70,90], weights:[0,0,15,35,50]},
      {id:'infinity', name:'INFINITY', prefix:'無限なる', color:'#f7eaff', count:[6,6], weights:[0,0,5,25,70]}
    ],
    rarityRates: [
      [1, [80,18,1.8,.19,.009,.001]],
      [25,[50,35,12,2.5,.49,.01]],
      [50,[30,35,25,8,1.95,.05]],
      [100,[15,25,32,20,7.8,.2]],
      [200,[5,15,30,32,17.5,.5]],
      [500,[1,4,15,35,43,2]]
    ],
    floorStepPercent: 2,
    enhancementMultiplier: 1.20,
    limits: {stat: 1e12, optionPercent: 1e9},
    infinity: {
      attackMinimumStep: 20, opMinimumPerFloor: 1,
      statTail: {scale:500, shape:1.55}, opTail: {scale:6, shape:1.65}
    },
    // Each entry is [1F ranges for R1–R5]. A part maps a stat to a table and a multiplier.
    ranges: {
      weapon: [[80,120],[150,250],[300,450],[550,800],[950,1400]],
      armor: [[25,40],[60,95],[120,185],[225,340],[400,620]],
      accessoryHp: [[15,25],[35,60],[75,115],[135,205],[240,350]],
      accessoryMp: [[6,10],[14,24],[30,46],[54,82],[96,140]]
    },
    parts: [
      {id:'sword', name:'魔剣', slot:'rightHand', family:'sword', weaponType:'sword', base:{attackPower:['weapon',1]}},
      {id:'martial', name:'魔爪', slot:'rightHand', family:'martial', weaponType:'martial', base:{attackPower:['weapon',.84]}},
      {id:'staff', name:'魔杖', slot:'rightHand', family:'staff', weaponType:'staff', base:{magicAttackPower:['weapon',1.04]}},
      {id:'instrument', name:'奏琴', slot:'rightHand', family:'instrument', weaponType:'instrument', base:{magicAttackPower:['weapon',.94]}},
      {id:'shield', name:'魔盾', slot:'rightHand', family:'shield', weaponType:'shield', base:{defensePower:['armor',1.30],magicDefensePower:['armor',.94]}},
      {id:'buckler', name:'小盾', slot:'leftHand', family:'buckler', base:{defensePower:['armor',.75],magicDefensePower:['armor',.65]}},
      {id:'head', name:'仮面', slot:'head', family:'head', base:{defensePower:['armor',.72],magicDefensePower:['armor',.64]}},
      {id:'body', name:'外套', slot:'body', family:'body', base:{defensePower:['armor',1],magicDefensePower:['armor',.82]}},
      {id:'arms', name:'手甲', slot:'arms', family:'arms', base:{defensePower:['armor',.66],magicDefensePower:['armor',.57]}},
      {id:'feet', name:'長靴', slot:'feet', family:'feet', base:{defensePower:['armor',.62],magicDefensePower:['armor',.54]}},
      {id:'accessory', name:'指環', slot:'accessory', family:'accessory', base:{maxHp:['accessoryHp',1],maxMp:['accessoryMp',1]}}
    ],
    infinityTableScale: {weapon:1,armor:.45,accessoryHp:.25,accessoryMp:.10},
    transfer: {sameFamily:true, allowCrossRarity:true, infinityOnlyWithInfinity:true},
    grades: ['COMMON','RARE','EPIC','LEGEND','MYTHIC'],
    combinationShare: [0,0,.30,.20,.04],
    ops: [
      op('attackPowerRate','物理攻撃力',0),op('magicAttackPowerRate','魔法攻撃力',0),
      op('defensePowerRate','物理防御力',0),op('magicDefensePowerRate','魔法防御力',0),
      op('maxHpRate','最大HP',0),op('maxMpRate','最大MP',0),
      op('strRate','力',1),op('vitRate','体力',1),op('magRate','魔力',1),op('mndRate','精神',1),
      op('agiRate','素早さ',1),op('dexRate','器用さ',1),op('lukRate','運',1),
      op('skillDamageRate','スキルダメージ',2),op('elementDamageRate','属性ダメージ',2),
      op('healingPowerPercent','回復量',2),op('physicalDamagePercent','物理与ダメージ',2),op('magicDamagePercent','魔法与ダメージ',2),
      op('bossDamageRate','ボスダメージ',3),op('criticalDamageRate','会心ダメージ',3),
      { ...op('lifeStealRate','HP吸収',3), table:'weapon', chance:.01, values:[1,2,3], totalCapPercent:3 },
      { ...op('hitMpRecoveryRate','被ダメージ時MP回復',3), table:'armor', chance:.0075, values:[.25,.5,.75,1], totalCapPercent:2 },
      op('echoDamageRate','追加ダメージ',4),op('openingDamageRate','初手ダメージ',4),
      op('executeDamageRate','敵HP30%以下ダメージ',4),op('healthyDamageRate','自身HP90%以上ダメージ',4),
      op('groupDamageRate','敵複数時ダメージ',4),op('mpEfficiencyRate','消費MP効率',4),
      tactical('firstHitWardRate','初撃防壁',3,'armor',[8,12,16,20],30),
      tactical('physicalDamageReductionPercent','物理耐性',2,'armor',[2,3,4,5],12),
      tactical('magicDamageReductionPercent','魔法耐性',2,'armor',[2,3,4,5],12),
      tactical('guardMpRate','防御充填',3,'armor',[3,4,5],8),
      tactical('guardStrikeRate','守勢からの一撃',4,'armor',[12,16,20,25],40),
      tactical('turnHealRate','戦闘再生',3,'accessoryHp',[1,2,3],3),
      tactical('victoryHealRate','戦後手当',2,'accessoryHp',[2,3,4],4),
      tactical('potionBoostRate','薬効増幅',2,'accessoryHp',[10,15,20,25],25),
      tactical('weaponDefBreakRate','護り崩し',3,'weapon',[6,8,10,12],12),
      tactical('basicToSkillRate','連携強化',4,'weapon',[12,16,20,25],25),
      combination('physAttackDefense','攻守の律',2,['attackPower','defensePower']),
      combination('physAttackSpeed','疾攻の律',2,['attackPower','agi']),
      combination('physDefenseSpeed','疾守の律',2,['defensePower','agi']),
      combination('magicAttackDefense','魔攻守の律',2,['magicAttackPower','magicDefensePower']),
      combination('magicAttackSpeed','疾術の律',2,['magicAttackPower','agi']),
      combination('magicDefenseSpeed','疾護の律',2,['magicDefensePower','agi']),
      combination('dualAttack','双撃の律',2,['attackPower','magicAttackPower']),
      combination('dualDefense','双壁の律',2,['defensePower','magicDefensePower']),
      combination('hpMp','活力の律',2,['maxHp','maxMp']),
      combination('strengthVitality','剛健の律',2,['str','vit']),
      combination('magicSpirit','魔心の律',2,['mag','mnd']),
      combination('speedDexterity','軽業の律',2,['agi','dex']),
      combination('dexterityLuck','星運の律',2,['dex','luk']),
      combination('hpAttack','血気の律',3,['maxHp','attackPower'],[12,16,20,24],{table:'weapon'}),
      combination('mpMagicDefense','静護の律',3,['maxMp','magicDefensePower'],[12,16,20,24],{table:'armor'}),
      combination('allEquipmentPower','武威の律',3,equipmentPower,[6,8,10,12],{summary:'物理・魔法の攻防4種'}),
      combination('allBaseAttributes','才覚の律',3,baseAttributes,[5,7,9,11],{summary:'力〜運の7能力'}),
      combination('allAbilities','全能の律',4,['maxHp','maxMp',...baseAttributes,...equipmentPower],[3,4,6,8],
        {summary:'最大HP・MP／力〜運／物理・魔法の攻防'}),
      { ...op('normalDungeonExpRate','経験値UP',3), values:[5,10,15,20], repeatable:true, uncappedGrowth:true,
        summary:'EXP・JOB EXP' },
      { ...op('normalDungeonGoldRate','GOLD UP',2), values:[10,15,20,25], repeatable:true, uncappedGrowth:true }
    ]
  };
})();
