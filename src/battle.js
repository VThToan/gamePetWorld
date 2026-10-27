import { skillById, STATUS_LABELS, statsFor, combatDamage, mpCostPercent, skillCompatible } from './pet-data.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export class Battle {
  constructor() {
    this.reset();
  }
  reset(){
    this.active=false;this.hits=0;this.effect=null;this.message='';this.winner='';this.timer=0;this.mode='training';
    this.opponentName='Đối thủ';this.opponentSpecies='ice';this.onResolve=null;this.turnSide='player';this.playerTimeLeft=3;
    this.enemyStatus=null;this.playerStatus=null;this.autoEndTimer=0;this.encounterId=null;this.canCapture=false;this.sourceWildId=null;
    this.playerPet=null;this.enemyPet=null;this.enemyAIReadyAt=0;this.furyMultiplier=1;
  }
  start(initialHP=100,options={}) {
    this.reset();
    this.active=true;
    this.mode=options.mode||'training';
    this.opponentName=options.name||'Đối thủ';
    this.opponentSpecies=options.species||'ice';
    this.petSpecies=options.petSpecies||'flame';
    this.playerPet={
      name:options.playerPet?.name||'Pet của bạn',species:this.petSpecies,level:options.playerPet?.level||1,
      speed:options.playerSpeed??options.playerPet?.speed??12,maxHp:100,maxMp:100,
      skills:options.playerPet?.skills||['basic'],skillRanks:options.playerPet?.skillRanks||{fury:1},
    };
    this.enemyPet={
      name:options.enemyPet?.name||this.opponentName,species:this.opponentSpecies,level:options.enemyPet?.level||1,
      speed:options.enemySpeed??options.enemyPet?.speed??10,maxHp:100,maxMp:100,
      skills:options.enemyPet?.skills||['basic']
    };
    Object.assign(this.playerPet,statsFor(this.petSpecies,this.playerPet.level)); Object.assign(this.enemyPet,statsFor(this.opponentSpecies,this.enemyPet.level));
    this.petHP=clamp(initialHP,0,100);this.petMP=options.playerMP??100;
    this.enemyHP=clamp(options.enemyHP??100,0,100);this.enemyMP=options.enemyMP??100;
    this.onResolve=options.onResolve||null;this.encounterId=options.encounterId||null;
    this.canCapture=this.mode==='wild';this.sourceWildId=options.sourceWildId||null;
    this.effect=null;this.hits=0;this.timer=0;this.autoEndTimer=0;
    const playerFast=this.playerPet.speed>this.enemyPet.speed || (this.playerPet.speed===this.enemyPet.speed && Math.random()>=0.5);
    this.turnSide=playerFast?'player':'enemy';
    this.playerTimeLeft=3;
    this.enemyAIReadyAt=this.turnSide==='enemy'?0.75:0;
    this.message=options.message||`${this.mode==='wild'?'Pet hoang dã xuất hiện!':this.mode==='trainer'?`${this.opponentName} thách đấu!`:'Chọn một kỹ năng để thử hiệu ứng.'} ${this.turnSide==='player'?'Pet của bạn ra tay trước.':'Đối thủ ra tay trước.'}`;
  }
  stop(outcome='cancel',meta={}){
    const cb=this.onResolve;this.active=false;this.effect=null;this.winner='';this.onResolve=null;this.autoEndTimer=0;
    if(cb)cb(outcome,{battle:this,...meta});
  }
  hasEnded(){return !!this.winner;}
  canPlayerAct(){return this.active&&!this.winner&&this.turnSide==='player'&&this.timer<=0;}
  consumeMP(side,amount){ if(side==='player') this.petMP=clamp(this.petMP-amount,0,100); else this.enemyMP=clamp(this.enemyMP-amount,0,100); }
  applyHit(side,skillId){
    const skill=skillById(skillId);
    if(side==='player'){
      if(!skillCompatible(skill,this.playerPet.species)||!this.playerPet.skills.includes(skill.id)||this.playerPet.level<skill.level)return {ok:false,message:'Kỹ năng không hợp lệ.'};
      const cost=mpCostPercent(skill,this.playerPet);
      if(this.petMP<cost)return {ok:false,message:'Không đủ MP.'};
      this.consumeMP('player',cost);
      const hit=combatDamage(skill,this.playerPet,this.enemyPet,this.furyMultiplier);
      const damage=hit.damage;
      if(skill.id!=='fury')this.furyMultiplier=1;else this.furyMultiplier=Math.min(3.5,1.35+.25*Math.max(0,(this.playerPet?.skillRanks?.fury||1)-1)+.08*Math.floor(this.playerPet.level/8));
      this.enemyHP=clamp(this.enemyHP-hit.percent,0,100);
      if(skill.heal) this.petHP=clamp(this.petHP+skill.heal/this.playerPet.maxHp*100,0,100);
      if(skill.status&&Math.random()<(skill.statusChance||0)) this.enemyStatus=skill.status;
      this.effect={id:skill.element||({'moon':'dark','spirit':'heal'}[skill.id])||skill.id,owner:'player',elapsed:0,duration:.85,color:this.mode==='trainer'?'#79dbff':'#da9aff'};
      this.message=`${skill.name}: ${damage} sát thương${skill.heal?`, hồi ${skill.heal} HP`:''}${this.enemyStatus&&skill.status?` · ${STATUS_LABELS[this.enemyStatus]}`:''}.`;
      this.hits++;
      if(this.enemyHP<=0){this.finish('win', this.mode==='wild'?`Bạn đã hạ ${this.opponentName}!`:`Bạn đã thắng ${this.opponentName}!`);return {ok:true,skill};}
      this.turnSide='enemy';this.timer=.7;this.enemyAIReadyAt=.55;this.playerTimeLeft=0;return {ok:true,skill};
    }
    if(!skillCompatible(skill,this.enemyPet.species)||this.enemyMP<mpCostPercent(skill,this.enemyPet))skillId='basic';
    const enemySkill=skillById(skillId);
    this.consumeMP('enemy',mpCostPercent(enemySkill,this.enemyPet));
    const hit=combatDamage(enemySkill,this.enemyPet,this.playerPet); const damage=hit.damage;
    this.petHP=clamp(this.petHP-hit.percent,0,100);
    if(enemySkill.heal) this.enemyHP=clamp(this.enemyHP+enemySkill.heal/this.enemyPet.maxHp*100,0,100);
    if(enemySkill.status&&Math.random()<(enemySkill.statusChance||0)) this.playerStatus=enemySkill.status;
    this.effect={id:enemySkill.element||({'moon':'dark','spirit':'heal'}[enemySkill.id])||enemySkill.id,owner:'enemy',elapsed:0,duration:.85,color:'#5ec8ff'};
    this.message=`${this.opponentName} dùng ${enemySkill.name}: -${damage} HP${this.playerStatus&&enemySkill.status?` · ${STATUS_LABELS[this.playerStatus]}`:''}!`;
    if(this.petHP<=0){this.finish('lose', this.mode==='wild'?'Pet của bạn đã kiệt sức!':'Bạn đã thua trận, hãy hồi phục pet rồi thử lại.');return {ok:true,skill:enemySkill};}
    this.turnSide='player';this.timer=.18;this.playerTimeLeft=3;return {ok:true,skill:enemySkill};
  }
  useSkill(id) {
    if(!this.canPlayerAct()) return false;
    const skill=skillById(id);
    if(!skill)return false;
    return this.applyHit('player',id).ok;
  }
  usePotion(amount=40){
    if(!this.canPlayerAct())return {ok:false,message:'Chưa đến lượt của bạn.'};
    if(this.petHP>=100)return {ok:false,message:'Pet đã đầy HP.'};
    this.petHP=clamp(this.petHP+amount/this.playerPet.maxHp*100,0,100);
    this.message=`Bạn dùng Bình hồi phục: +${amount} HP.`;
    this.turnSide='enemy';this.timer=.55;this.enemyAIReadyAt=.5;this.playerTimeLeft=0;return {ok:true};
  }
  tryCapture(baseChance=.25){
    if(!this.canPlayerAct())return {ok:false,message:'Chưa đến lượt của bạn.'};
    if(!this.canCapture)return {ok:false,message:'Chỉ có thể bắt pet hoang dã.'};
    const hpFactor=(100-this.enemyHP)/100;
    const statusBonus=this.enemyStatus?.length?0.18:0;
    const finalChance=clamp(baseChance+hpFactor*.58+statusBonus,0.08,0.94);
    if(Math.random()<finalChance){
      this.message=`Thu phục thành công ${this.opponentName}!`;
      this.finish('caught',this.message,{caught:true});
      return {ok:true,caught:true,finalChance};
    }
    this.message=`Thu phục thất bại (${Math.round(finalChance*100)}%). ${this.opponentName} vẫn chống cự!`;
    this.turnSide='enemy';this.timer=.55;this.enemyAIReadyAt=.4;this.playerTimeLeft=0;return {ok:true,caught:false,finalChance};
  }
  enemyChooseSkill(){
    const choices=(this.enemyPet?.skills||['basic']).map(skillById).filter(Boolean).filter(s=>this.enemyPet.level>=s.level&&skillCompatible(s,this.enemyPet.species)&&this.enemyMP>=mpCostPercent(s,this.enemyPet));
    if(!choices.length)return 'basic';
    const sorted=choices.sort((a,b)=>(b.damage+(b.heal||0)*.5)-(a.damage+(a.heal||0)*.5));
    return (sorted.find(s=>s.id!=='basic')||sorted[0]).id;
  }
  finish(outcome,message,meta={}){
    this.winner=message;this.message=message;this.autoEndTimer=1.55;this.pendingOutcome={outcome,meta};
    this.turnSide='ended';this.timer=0;this.playerTimeLeft=0;
  }
  update(dt) {
    if(!this.active)return;
    if(this.effect) {
      this.effect.elapsed+=dt;
      if(this.effect.elapsed>this.effect.duration) this.effect=null;
    }
    if(this.autoEndTimer>0){
      this.autoEndTimer=Math.max(0,this.autoEndTimer-dt);
      if(this.autoEndTimer===0&&this.pendingOutcome){const p=this.pendingOutcome;this.pendingOutcome=null;this.stop(p.outcome,p.meta);return;}
    }
    if(this.winner)return;
    if(this.timer>0)this.timer=Math.max(0,this.timer-dt);
    if(this.turnSide==='player'&&this.timer<=0){
      this.playerTimeLeft=Math.max(0,this.playerTimeLeft-dt);
      if(this.playerTimeLeft===0)this.useSkill('basic');
    }
    if(this.turnSide==='enemy'){
      this.enemyAIReadyAt=Math.max(0,this.enemyAIReadyAt-dt);
      if(this.timer<=0&&this.enemyAIReadyAt===0){this.applyHit('enemy',this.enemyChooseSkill());}
    }
  }
}
