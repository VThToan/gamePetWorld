/** Server-authoritative wild population and PvE. No browser, timers or global socket state here.
 * The server periodically calls tick(now), sends snapshot() to every connected client.
 */
import {WILD_SCENES,WILD_MAX_PER_MAP,WILD_RESPAWN_MS,AUTO_ATTACK_MS,elementalSkillFor,furyMultiplier} from './wild-data.js';
import {getSceneDimensions,isBlocked,sceneTransferAt} from './world.js';
import {speciesById,skillById,unlockedSkillsForLevel,skillCompatible,statsFor,combatDamage,mpCostPercent} from './pet-data.js';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
const pick=(xs,rng)=>xs[Math.floor(rng()*xs.length)];
export class SharedWildWorld{
 constructor({random=Math.random,onEvent=()=>{},now=()=>Date.now()}={}){
  this.random=random;this.onEvent=onEvent;this.now=now;this.serial=0;
  this.monsters=new Map();this.fights=new Map();this.respawns=[];
  for(const scene of Object.keys(WILD_SCENES))this.seedScene(scene);
 }
 getMonsters(scene){return this.monsters.get(scene)||[];}
 cellAt(scene,index){
  const {width,height}=getSceneDimensions(scene);const cols=4,rows=3;
  const cellW=(width-96)/cols,cellH=(height-112)/rows;
  const col=index%cols,row=Math.floor(index/cols);
  return {x:48+(col+.5)*cellW,y:56+(row+.5)*cellH,w:cellW,h:cellH};
 }
 candidate(scene,index,others){
  const cell=this.cellAt(scene,index);
  for(let k=0;k<130;k++){
   const x=Math.round(cell.x+(this.random()-.5)*cell.w*.68),y=Math.round(cell.y+(this.random()-.5)*cell.h*.58);
   if(isBlocked(x,y,15,scene)||sceneTransferAt(scene,x,y))continue;
   if(others.some(m=>Math.hypot(m.x-x,m.y-y)<125))continue;
   return {x,y};
  }
  // If a cell is mostly blocked, choose a globally free and separated location.
  const {width,height}=getSceneDimensions(scene);
  for(let i=0;i<400;i++){
   const x=Math.round(35+this.random()*(width-70)),y=Math.round(35+this.random()*(height-70));
   if(isBlocked(x,y,15,scene)||sceneTransferAt(scene,x,y))continue;
   if(others.every(m=>Math.hypot(m.x-x,m.y-y)>=125))return {x,y};
  }
  return null;
 }
 spawn(scene,cellIndex){
  const config=WILD_SCENES[scene];if(!config)return null;
  const group=this.getMonsters(scene);if(group.length>=WILD_MAX_PER_MAP)return null;
  const pos=this.candidate(scene,cellIndex,group);if(!pos)return null;
  const type=pick(config.species,this.random),level=config.level[0]+Math.floor(this.random()*(config.level[1]-config.level[0]+1));
  const monster={id:`wild-${++this.serial}`,scene,species:type,name:speciesById(type).name,level,cell:cellIndex,...pos,hp:100,mp:100,speed:statsFor(type,level).speed,status:'idle',engagedBy:null,anim:this.random()*10,facing:this.random()>.5?'east':'west'};
  group.push(monster);return monster;
 }
 seedScene(scene){this.monsters.set(scene,[]);for(let i=0;i<WILD_MAX_PER_MAP;i++)this.spawn(scene,i);}
 find(id){for(const [scene,group] of this.monsters) {const monster=group.find(m=>m.id===id);if(monster)return monster;}return null;}
 snapshot(){return {wilds:[...this.monsters.entries()].flatMap(([scene,group])=>group.map(m=>({...m,scene}))),wildBattles:[...this.fights.values()].map(f=>this.publicFight(f))};}
 publicFight(f){return {...f,petSkills:undefined,initialItems:undefined,endsAt:undefined};}
 startBattle(client,monsterId){
  const monster=this.find(monsterId),id=client?.id;
  if(!id||!monster||monster.status!=='idle'||this.fights.has(id))return {ok:false,message:'Quái đã bị người khác thách đấu hoặc không tồn tại.'};
  if(client.scene!==monster.scene||Math.hypot(client.player.x-monster.x,client.player.y-monster.y)>110)return {ok:false,message:'Phải đến gần pet hoang dã để chiến đấu.'};
  const hp=clamp(client.petHP??100,0,100),mp=clamp(client.petMP??100,0,100);
  if(hp<=0)return {ok:false,message:'Pet đã kiệt sức; cần hồi sinh trước khi chiến đấu.'};
  const species=client.species||'flame',petLevel=clamp(client.level||1,1,100);
  const speed=statsFor(species,petLevel).speed;
  const now=this.now(),playerFirst=speed>monster.speed||(speed===monster.speed&&this.random()>=.5);
  const f={id:`fight-${++this.serial}`,playerId:id,scene:monster.scene,monsterId:monster.id,trainer:{x:client.player.x,y:client.player.y,name:client.name||'HLV'},
    playerSpecies:species,playerLevel:petLevel,playerFuryRank:clamp(client.furyRank||1,1,5),playerHP:hp,playerMP:mp,playerStatus:null,
    enemySpecies:monster.species,enemyLevel:monster.level,enemyHP:monster.hp,enemyMP:monster.mp,enemyStatus:null,
    turn:playerFirst?'player':'enemy',turnEndsAt:now+(playerFirst?AUTO_ATTACK_MS:700),phase:'fighting',effect:null,log:`${speciesById(species).name} ${playerFirst?'ra đòn trước':'chậm hơn đối thủ'} (tốc độ ${speed}/${monster.speed}).`,
    furyMultiplier:1,petSkills:client.skills||['basic'],initialItems:{potion:client.potionCount||0,ball:client.ballCount||0},appliedItem:null,
    startedAt:now,endsAt:null,round:1};
  monster.status='battle';monster.engagedBy=id;this.fights.set(id,f);
  this.onEvent(id,{type:'wildBattleStart',fight:this.publicFight(f)});
  return {ok:true,fight:f};
 }
 action(id,action,skillId='basic'){
  const f=this.fights.get(id);if(!f||f.phase!=='fighting'||f.turn!=='player')return {ok:false,message:'Chưa đến lượt pet của bạn.'};
  const now=this.now();if(action==='skill'){
   const skill=skillById(skillId);if(!skill)return {ok:false,message:'Không có kỹ năng.'};
   const unlocked=unlockedSkillsForLevel(f.playerLevel,f.playerSpecies);
   const allowed=skillCompatible(skill,f.playerSpecies)&&(f.petSkills.includes(skillId)||unlocked.includes(skillId));
   const playerStats=statsFor(f.playerSpecies,f.playerLevel), enemyStats=statsFor(f.enemySpecies,f.enemyLevel), cost=mpCostPercent(skill,playerStats);
   if(!allowed||skill.level>f.playerLevel||f.playerMP<cost)return {ok:false,message:'Kỹ năng chưa mở hoặc thiếu MP.'};
   f.playerMP-=cost;
   if(skill.id==='fury'){
    f.furyMultiplier=furyMultiplier(f.playerLevel,f.playerFuryRank);f.effect={element:'fury',at:now,owner:'player'};
    f.log=`Pet gồng năng lượng: đòn gây sát thương tiếp theo ×${f.furyMultiplier.toFixed(2)}.`;
   }else{
    const hit=combatDamage(skill,playerStats,enemyStats,f.furyMultiplier,this.random),damage=hit.damage;
    f.furyMultiplier=1;f.enemyHP=clamp(f.enemyHP-hit.percent,0,100);
    if(skill.heal)f.playerHP=clamp(f.playerHP+skill.heal/playerStats.maxHp*100,0,100);
    if(skill.status&&this.random()<(skill.statusChance||0))f.enemyStatus=skill.status;
    f.effect={element:skill.element||({'spirit':'heal'}[skill.id])||skill.id,at:now,owner:'player'};
    f.log=`${skill.name}: gây ${damage} sát thương.${f.enemyStatus?' Đối thủ chịu '+f.enemyStatus+'.':''}`;
   }
  }else if(action==='potion'){
   if(f.initialItems.potion<=0)return {ok:false,message:'Hết bình hồi phục.'};
   if(f.playerHP>=100)return {ok:false,message:'HP đã đầy.'};
   f.initialItems.potion--;f.playerHP=clamp(f.playerHP+40/statsFor(f.playerSpecies,f.playerLevel).maxHp*100,0,100);f.appliedItem='potion';f.effect={element:'heal',at:now,owner:'player'};f.log='Dùng bình hồi phục: +40 HP.';
   this.onEvent(id,{type:'wildItemUsed',item:'potion'});
  }else if(action==='catch'){
   if(f.initialItems.ball<=0)return {ok:false,message:'Không còn Poke Ball.'};
   f.initialItems.ball--;f.appliedItem='ball';this.onEvent(id,{type:'wildItemUsed',item:'ball'});
   const base=speciesById(f.enemySpecies).catchRate??.2;
   const chance=clamp(base+(100-f.enemyHP)*.0058+(f.enemyStatus?.length?0.18:0),.08,.94);
   f.effect={element:'light',at:now,owner:'player'};
   if(this.random()<chance){f.log=`Thu phục ${speciesById(f.enemySpecies).name} thành công!`;this.finish(f,'caught');return {ok:true,caught:true,chance};}
   f.log=`Bắt thất bại (tỉ lệ ${Math.round(chance*100)}%)!`;
  }else return {ok:false,message:'Hành động không hợp lệ.'};
  if(f.enemyHP<=0){this.finish(f,'win');return {ok:true};}
  f.turn='enemy';f.turnEndsAt=now+650;f.round++;
  this.onEvent(id,{type:'wildBattleUpdate',fight:this.publicFight(f)});
  return {ok:true};
 }
 enemyTurn(f){
  const now=this.now();const pool=unlockedSkillsForLevel(f.enemyLevel,f.enemySpecies).map(skillById)
    .filter(s=>s&&mpCostPercent(s,statsFor(f.enemySpecies,f.enemyLevel))<=f.enemyMP&&(s.id==='basic'||s.id.startsWith('elem-')||s.id==='fury'||s.id==='fire'));
  const preferred=pool.find(s=>s.id===elementalSkillFor(f.enemySpecies))||pool.find(s=>s.id==='fire')||pool.find(s=>s.id==='basic');
  const skill=preferred||skillById('basic');f.enemyMP=clamp(f.enemyMP-mpCostPercent(skill,statsFor(f.enemySpecies,f.enemyLevel)),0,100);
  const hit=combatDamage(skill,statsFor(f.enemySpecies,f.enemyLevel),statsFor(f.playerSpecies,f.playerLevel),1,this.random),damage=hit.damage;f.playerHP=clamp(f.playerHP-hit.percent,0,100);
  if(skill.status&&this.random()<(skill.statusChance||0))f.playerStatus=skill.status;
  f.effect={element:skill.element||'basic',owner:'enemy',at:now};
  f.log=`${speciesById(f.enemySpecies).name} dùng ${skill.name}: -${damage} HP.`;
  if(f.playerHP<=0){this.finish(f,'lose');return;}
  f.turn='player';f.turnEndsAt=now+AUTO_ATTACK_MS;f.round++;
  this.onEvent(f.playerId,{type:'wildBattleUpdate',fight:this.publicFight(f)});
 }
 finish(f,result){
  if(f.phase==='ended')return;
  f.phase='ended';f.result=result;f.turn='ended';f.endsAt=this.now()+1350;
  f.log=result==='win'?'Chiến thắng!':result==='caught'?'Thu phục thành công!':'Pet đã bị hạ gục.';
  const monster=this.find(f.monsterId);if(monster){
   if(result==='win'||result==='caught'){
    const group=this.getMonsters(monster.scene);const i=group.findIndex(m=>m.id===monster.id);if(i>=0)group.splice(i,1);
    this.respawns.push({scene:monster.scene,cell:monster.cell,due:this.now()+WILD_RESPAWN_MS});
   }else {monster.status='idle';monster.engagedBy=null;monster.hp=100;monster.mp=100;}
  }
  this.onEvent(f.playerId,{type:'wildBattleEnd',result,fight:this.publicFight(f),captured:result==='caught'?{species:f.enemySpecies,level:f.enemyLevel,hp:Math.max(12,f.enemyHP),mp:f.enemyMP}:null});
 }
 disconnect(id){const f=this.fights.get(id);if(f){const monster=this.find(f.monsterId);if(monster){monster.status='idle';monster.engagedBy=null;}this.fights.delete(id);}}
 tick(now=this.now()){
  for(const f of [...this.fights.values()]){
   if(f.phase==='ended'){
    if(now>=f.endsAt)this.fights.delete(f.playerId);continue;
   }
   if(now<f.turnEndsAt)continue;
   if(f.turn==='enemy')this.enemyTurn(f);
   else if(f.turn==='player')this.action(f.playerId,'skill','basic');
  }
  for(let i=this.respawns.length-1;i>=0;i--){const r=this.respawns[i];if(now<r.due)continue;this.respawns.splice(i,1);this.spawn(r.scene,r.cell);}
 }
}
