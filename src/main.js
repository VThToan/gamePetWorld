import { DEFAULT_SETTINGS, SPAWN, WALK_SPEED, RUN_SPEED } from './config.js';
import { loadAssets } from './assets.js';
import { moveWithCollisions, isBlocked, PLAYER_RADIUS, PET_RADIUS, nearestPortal, nearestInteraction, INTERIORS, OUTSKIRTS, cityExitAt, isOutdoorScene, sceneTransferAt, safeSceneSpawn, getSceneDimensions } from './world.js';
import { loadProgress,saveProgress,activePet,consumeItem,addCaughtPet,buildPet,petStats,gainPetXP,usePotion as useBagPotion } from './gameplay.js';
import { createGameUI } from './ui.js';
import { Renderer } from './renderer.js';
import { Battle } from './battle.js';
import { NetClient } from './net.js';
import {speciesById,SKILL_LEVELS,unlockedSkillsForLevel,mpCostPercent,statsFor,skillCompatible} from './pet-data.js';
import {tickRecovery} from './recovery.js';
import {WILD_SCENES,elementalSkillFor} from './wild-data.js';

const $=(s)=>document.querySelector(s);
const keys=new Set();
const canvas=$('#game'),status=$('#game-status'),details=$('#details'),doorHint=$('#door-hint'),interactButton=$('#interact-trigger');
const settings=loadSettings();
const progress=loadProgress();
let ui=null,renderer=null,game=null,lastTime=0,currentPeer=null;
const controlKeys=new Set(['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d','shift']);
const sceneName=scene=>scene==='city'?'Thành trì':(INTERIORS[scene]||OUTSKIRTS[scene])?.label||scene;

function loadSettings(){try{return {...DEFAULT_SETTINGS,...(JSON.parse(localStorage.getItem('petTownSettings'))||{})};}catch{return {...DEFAULT_SETTINGS};}}
function saveSettings(){try{localStorage.setItem('petTownSettings',JSON.stringify(settings));}catch{}}
function facing4(dx,dy){return Math.abs(dx)>Math.abs(dy)?(dx>0?'east':'west'):(dy>0?'south':'north');}
function makeActor(x,y,facing){return {x,y,facing,moving:false,anim:0};}
function setStatus(text){status.textContent=text;}
function screenToWorld(clientX,clientY){const b=canvas.getBoundingClientRect();const px=(clientX-b.left)*canvas.width/b.width,py=(clientY-b.top)*canvas.height/b.height;return {x:px/settings.zoom+renderer.camera.x,y:py/settings.zoom+renderer.camera.y};}
function clearPointerTarget(){if(!game?.pointer)return;game.pointer.active=false;game.pointer.dragMoved=false;game.pointer.target=null;}
function interactionMeta(target){
  const route={quests:'quests',magic:'magic',elder:'elder',items:'items',storage:'storage',evolution:'evolution','pet-shop':'pet-shop'};
  const prompts={
    quests:'Mở bảng nhiệm vụ để xem việc cần làm hôm nay?',magic:'Bạn muốn vào nhà MAGIC để học kỹ năng cho pet?',elder:'Bạn muốn nói chuyện với Bà chủ nhà?',
    items:'Bạn muốn giao tiếp với NPC vật phẩm / Poke Ball?',storage:'Bạn muốn giao tiếp với NPC lưu trữ / hồi phục pet?',evolution:'Bạn muốn giao tiếp với NPC nguyên liệu tiến hóa?',
    'pet-shop':'Bạn muốn mở shop pet để nhận miễn phí hoặc mua pet?'
  };
  return {route:route[target?.id]||null,prompt:prompts[target?.id]||`Bạn muốn tương tác với ${target?.label||'đối tượng này'}?`};
}
const randInt=(a,b)=>Math.floor(a+Math.random()*(b-a+1));
const randomOf=list=>list[Math.floor(Math.random()*list.length)];

function resetGame(){
  if(!game)return;
  game.battle.stop();game.paused=false;game.scene='city';const start=safeSceneSpawn('city',SPAWN);game.player=makeActor(start.x,start.y,'south');
  game.pet=makeActor(SPAWN.x-64,SPAWN.y+6,'west');game.pet.species=activePet(progress)?.species||'flame';
  game.history=[{x:game.player.x,y:game.player.y}];game.lastHistory={x:game.player.x,y:game.player.y};
  game.exitCooldown=.2;game.returnAt=null;game.battleResolution='';game.wildEncounterCooldown=.6;keys.clear();clearPointerTarget();$('#pause').textContent='⏸ Tạm dừng';syncBattleUI();
  if(doorHint)doorHint.hidden=true;renderer.updateCamera(game.player,1,true,game.scene);setStatus('Đang khám phá');$('#menu-trigger').disabled=false;
  game.lastMotionAt=Date.now();game.restMode=false;
}
function recordHistory(){const {history,player,lastHistory}=game;if(Math.hypot(player.x-lastHistory.x,player.y-lastHistory.y)>=4){history.push({x:player.x,y:player.y});lastHistory.x=player.x;lastHistory.y=player.y;if(history.length>1800)history.splice(0,history.length-1200);}}
function trailTarget(){let remaining=68;const pts=game.history;let a={x:game.player.x,y:game.player.y};for(let i=pts.length-1;i>=0;i--){const b=pts[i],dist=Math.hypot(a.x-b.x,a.y-b.y);if(dist>=remaining&&dist>0){const t=remaining/dist;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}remaining-=dist;a=b;}return {x:game.player.x-58,y:game.player.y+12};}
function respawnPetTrail(point){game.history=[{x:point.x,y:point.y}];game.lastHistory={x:point.x,y:point.y};game.pet=makeActor(point.x-58,point.y+9,'east');game.pet.species=activePet(progress)?.species||'flame';}
function changeScene(scene,entry=null,spawnOverride=null){
  game.scene=scene;
  let point;
  if(spawnOverride)point=spawnOverride; else if(scene==='city')point=game.returnAt||{x:SPAWN.x,y:SPAWN.y}; else point=(INTERIORS[scene]||OUTSKIRTS[scene]).spawn;
  point=safeSceneSpawn(scene,point);
  game.player=makeActor(point.x,point.y,scene==='city'?'south':'north');
  respawnPetTrail(point);game.exitCooldown=.65;game.wildEncounterCooldown=.8;keys.clear();clearPointerTarget();doorHint.hidden=true;renderer.updateCamera(game.player,.1,true,game.scene);
  game.lastMotionAt=Date.now();
  setStatus(scene==='city'?'Đang khám phá thành trì':`Đang ở ${sceneName(scene)}`);window.dispatchEvent(new CustomEvent('pettown:scene',{detail:{scene,entry}}));
}

function sceneSupportsWilds(scene){return !!WILD_SCENES[scene];}
function currentWilds(){return (game.net?.wilds||[]).filter(w=>w.scene===game.scene);}
function nearestWild(scene,x,y,reach=42){return (game.net?.wilds||[]).filter(w=>w.scene===scene&&w.status==='idle')
 .map(w=>({w,d:Math.hypot(w.x-x,w.y-y)})).filter(a=>a.d<=reach).sort((a,b)=>a.d-b.d)[0]?.w||null;}
function startWildBattle(wild){
 if(!game.net?.connected){setStatus('Multiplayer cần npm run dev. Quái được sinh trên máy chủ.');return;}
 const pet=activePet(progress);if(!pet||pet.hp<=0){setStatus('Pet đã hết HP. Hồi sinh tự động sau 30 giây.');return;}
 if(!wild||wild.status!=='idle')return;
 if(Math.hypot(game.player.x-wild.x,game.player.y-wild.y)>104){setStatus('Hãy đến gần quái hoang dã để giao chiến.');return;}
 clearPointerTarget();game.net.wildStart(wild.id);
}
function startTrainingBattle(){
  const pet=activePet(progress);if(!pet||pet.hp<=0){setStatus('Pet đã hết HP — đến NPC tóc xanh hồi phục');return;}
  const myStats=petStats(pet), dummy=buildPet('ice',Math.max(1,pet.level));
  game.paused=false;game.battle.start(pet.hp,{mode:'training',name:'Mô hình luyện tập',species:'ice',petSpecies:pet.species,playerMP:pet.mp??100,enemyHP:100,enemyMP:100,playerSpeed:myStats.speed,enemySpeed:petStats(dummy).speed,playerPet:pet,enemyPet:dummy,onResolve:(outcome,{battle})=>handleBattleEnd(outcome,battle,game.scene,null)});
  $('#menu-trigger').disabled=true;keys.clear();clearPointerTarget();syncBattleUI();syncSkillButtons();
}
function handleBattleEnd(outcome,battle){
 const pet=activePet(progress);if(pet){pet.hp=battle.petHP;pet.mp=battle.petMP;if(pet.hp<=0&&!pet.faintedAt)pet.faintedAt=Date.now();saveProgress(progress);}
 $('#menu-trigger').disabled=false;syncBattleUI();syncSkillButtons();
 if(outcome==='win'){const xp=gainPetXP(progress,18);saveProgress(progress);setStatus(`Thắng trận thử! ${xp.message}`);}
 else setStatus(outcome==='lose'?'Pet đã hết thể lực, đợi 30 giây hồi sinh.':'Đã kết thúc trận.');
}
function handleSharedBattleResult(msg){
 const f=msg.fight,pet=activePet(progress);if(!f)return;
 if(pet){pet.hp=f.playerHP;pet.mp=f.playerMP;if(pet.hp<=0&&!pet.faintedAt)pet.faintedAt=Date.now();saveProgress(progress);}
 if(msg.result==='win'){const xp=gainPetXP(progress,28);setStatus(`Thắng pet hoang dã! ${xp.message}`);}
 else if(msg.result==='caught'&&msg.captured){const reward=addCaughtPet(progress,buildPet(msg.captured.species,msg.captured.level));setStatus(reward.message);}
 else if(msg.result==='lose')setStatus('Pet đã gục. Sau 30 giây pet sẽ hồi sinh với 10% HP.');
 saveProgress(progress);$('#menu-trigger').disabled=false;syncBattleUI();
}
function networkExtra(){const pet=activePet(progress),stats=petStats(pet);return {petHP:pet?.hp??0,petMP:pet?.mp??0,speed:stats.speed,skills:pet?.skills||['basic'],potionCount:progress.items.potion||0,ballCount:progress.items.ball||0,furyRank:pet?.skillRanks?.fury||1};}
function updateRecovery(now,dt){
 const pet=activePet(progress);if(!pet)return;
 let changed=false,mainEvent=null;
 for(const member of [...progress.pets,...progress.storage]){
  const result=tickRecovery(member,{now,idleMs:now-(game.lastMotionAt||now),rest:game.restMode,inCity:game.scene==='city',inBattle:member===pet&&(!!game.net?.wildFight||!!game.net?.duel||game.battle.active)});
  if(result.changed)changed=true;if(member===pet)mainEvent=result.event;
 }
 if(changed)saveProgress(progress);
 if(mainEvent==='revive'){setStatus(`${pet.name} đã hồi sinh! HP/MP sẽ hồi dần.`);game.recoveryVfx={element:'revive',at:Date.now()};}
 else if(mainEvent==='regen')game.recoveryVfx={element:'heal',at:Date.now()};
}

function toggleRest(){if(!game||game.net?.wildFight||game.net?.duel||game.battle.active)return;game.restMode=!game.restMode;const b=$('#rest-trigger');if(b)b.textContent=game.restMode?'💚 Đang hồi phục':'💚 Hồi phục';setStatus(game.restMode?'Pet đang nghỉ: hồi 10% HP/MP mỗi 2 giây.':'Đã tắt chế độ hồi phục.');}

function update(dt){
  updateRecovery(Date.now(),dt);
  if(game.paused||ui?.isOpen()||$('#settings-dialog').open)return;
  if(game.net?.duel||game.net?.wildFight){game.dt=dt;game.net.update(game.player,game.pet,game.scene,activePet(progress)?.species||'flame',activePet(progress)?.level||1,game.playerName,networkExtra());syncBattleUI();syncSkillButtons();return;}
  game.dt=dt;game.exitCooldown=Math.max(0,(game.exitCooldown||0)-dt);game.wildEncounterCooldown=Math.max(0,(game.wildEncounterCooldown||0)-dt);game.battle.update(dt);
  if(game.battle.active){const pet=activePet(progress);if(pet&&(pet.hp!==game.battle.petHP||pet.mp!==game.battle.petMP)){pet.hp=game.battle.petHP;pet.mp=game.battle.petMP;saveProgress(progress);}syncSkillButtons();return;}
  const p=game.player;
  if(game.restMode){p.moving=false;game.net?.update(p,game.pet,game.scene,activePet(progress)?.species||'flame',activePet(progress)?.level||1,game.playerName,networkExtra());return;}
  let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  let dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  if(!dx&&!dy&&game.pointer?.target){const vx=game.pointer.target.x-p.x,vy=game.pointer.target.y-p.y,dist=Math.hypot(vx,vy);if(dist>7){dx=vx/dist;dy=vy/dist;}else game.pointer.target=null;}
  if(dx||dy){const norm=Math.hypot(dx,dy);dx/=norm;dy/=norm;p.facing=facing4(dx,dy);const sp=keys.has('shift')?RUN_SPEED:WALK_SPEED;const actual=moveWithCollisions(p,dx*sp*dt,dy*sp*dt,PLAYER_RADIUS,game.scene);p.moving=Math.hypot(actual.dx,actual.dy)>.1;if(p.moving){p.anim+=dt*(keys.has('shift')?1.4:1);recordHistory();game.lastMotionAt=Date.now();}} else p.moving=false;

  if(game.scene==='city'&&game.exitCooldown<=0){
    const gate=cityExitAt(p.x,p.y);
    if(gate){game.returnAt={x:gate.markerX+(gate.facing==='east'?-74:gate.facing==='west'?74:0),y:gate.markerY+(gate.facing==='north'?64:gate.facing==='south'?-64:0)};changeScene(gate.target,gate.id);return;}
    const entrance=nearestPortal(p.x,p.y,5);
    if(entrance?.enabled&&INTERIORS[entrance.id]){game.returnAt={x:entrance.x+entrance.w/2,y:entrance.y+entrance.h+30};changeScene(entrance.id,entrance.id);return;}
  }
  if(game.scene!=='city'&&game.exitCooldown<=0){
    const exit=sceneTransferAt(game.scene,p.x,p.y);
    if(exit){if(exit.to==='city'){game.returnAt=exit.returnAt||game.returnAt;changeScene('city',game.scene,exit.returnAt||game.returnAt);}else{const arrival=exit.arrivalAt||(INTERIORS[exit.to]?null:exit.returnAt)||null;changeScene(exit.to,exit.id,arrival);}return;}
  }

  const pet=game.pet,target=trailTarget();const vx=target.x-pet.x,vy=target.y-pet.y,dist=Math.hypot(vx,vy);pet.moving=false;
  if(dist>4){if(Math.abs(vx)>2) pet.facing=vx>0?'east':'west';const speed=Math.min(dist,Math.max(140,Math.min(360,dist*4))*dt);const moved=moveWithCollisions(pet,vx/dist*speed,vy/dist*speed,PET_RADIUS,game.scene);pet.moving=Math.hypot(moved.dx,moved.dy)>.08;if(pet.moving)pet.anim+=dt;if(dist>440){const safe=game.history.findLast?.(pt=>Math.hypot(pt.x-p.x,pt.y-p.y)<100&&!isBlocked(pt.x,pt.y,PET_RADIUS,game.scene));if(safe){pet.x=safe.x;pet.y=safe.y;}}}
  game.pet.species=activePet(progress)?.species||'flame';game.petStats={hp:activePet(progress)?.hp??100,mp:activePet(progress)?.mp??100};renderer.updateCamera(p,dt,false,game.scene);game.net?.update(p,pet,game.scene,game.pet.species,activePet(progress)?.level||1,game.playerName,networkExtra());
  if(isOutdoorScene(game.scene)&&sceneSupportsWilds(game.scene)){
    const encounter=nearestWild(game.scene,p.x,p.y,29);
    if(encounter&&game.wildEncounterCooldown<=0){game.wildEncounterCooldown=1.5;startWildBattle(encounter);return;}
  }

  updateDoorPrompt();
}

function updateDoorPrompt(){
  const p=game.player;const interactable=nearestInteraction(game.scene,p.x,p.y);const entry=game.scene==='city'?nearestPortal(p.x,p.y,16):null;game.nearPortal=entry;game.nearInteraction=interactable;
  doorHint.hidden=true;if(interactButton)interactButton.hidden=true;if(game.battle.active)return;
  const target=interactable||entry;if(!target)return;
  doorHint.hidden=false;doorHint.textContent=interactable?`Nhấp trái / E · ${interactable.label}`:entry?.enabled?`Bước vào cửa để đến ${entry.label}`:`${entry.label} đang hoàn thiện`;
  if(interactable&&interactButton)interactButton.hidden=false;
}
function interact(targetOverride=null){
  if(!game||game.paused||game.battle.active||ui?.isOpen())return;
  const {x,y}=game.player;const target=targetOverride||nearestInteraction(game.scene,x,y);if(!target)return;
  const meta=interactionMeta(target);
  if(window.confirm(`${meta.prompt}\n\nChọn OK để đồng ý, hoặc Cancel để rời đi.`)){clearPointerTarget();if(meta.route)ui.open(meta.route);else setStatus(`Đã giao tiếp với ${target.label}`);}
}
function syncBattleUI(){
 const local=game.battle.active,shared=!!game.net?.wildFight,duel=!!game.net?.duel;
 $('#battle-actions').hidden=!local&&!shared&&!duel;
 $('#battle-toggle').textContent=local?'✕ Kết thúc trận':duel?'⚔ Trận PvP':shared?'⚔ Pet hoang dã':'⚔ Thử chiến đấu';
 const heal=$('#battle-heal'),catchBtn=$('#battle-catch');if(heal)heal.hidden=!(local||shared);if(catchBtn)catchBtn.hidden=!shared;
 if(heal)heal.textContent=`🧪 Hồi máu (${progress.items.potion||0})`;
 if(catchBtn)catchBtn.textContent=`🟠 Bắt pet (${progress.items.ball||0})`;
 if(local||shared||duel)$('#menu-trigger').disabled=true;
}
function syncSkillButtons(){
 const shared=game.net?.wildFight;const isYourTurn=!!shared&&shared.phase==='fighting'&&shared.turn==='player';
 for(const btn of document.querySelectorAll('[data-skill]')){
  const skill=SKILL_LEVELS.find(s=>s.id===btn.dataset.skill),pet=activePet(progress);
  const cost=skill?mpCostPercent(skill,statsFor(pet?.species,pet?.level)):Infinity;
  const unlocked=skill&&skillCompatible(skill,pet?.species)&&(pet?.level||1)>=skill.level&&((pet?.skills||[]).includes(skill.id)||skill.id===elementalSkillFor(pet?.species));
  btn.disabled=!unlocked||(game.net?.duel?(game.net.duel.turn!==game.net.id||game.net.duel.mp[game.net.id]<cost):shared?(!isYourTurn||shared.playerMP<cost):!game.battle.canPlayerAct()||game.battle.petMP<cost);
 }
 const heal=$('#battle-heal'),catchBtn=$('#battle-catch');
 if(heal)heal.disabled=shared?(!isYourTurn||shared.playerHP>=100||!(progress.items.potion>0)):!game.battle.active||!game.battle.canPlayerAct()||!(progress.items.potion>0)||game.battle.petHP>=100;
 if(catchBtn)catchBtn.disabled=!shared||!isYourTurn||!(progress.items.ball>0);
}

function toggleBattle(){
  if(game.net?.duel||game.net?.wildFight){setStatus('Đang trong trận: hãy chờ kết quả chiến đấu.');return;}
  ui?.close();
  if(game.battle.active){game.battle.stop();}
  else startTrainingBattle();
  $('#menu-trigger').disabled=game.battle.active;keys.clear();syncBattleUI();syncSkillButtons();
}
function loop(now){const dt=Math.min((now-lastTime)/1000,.035)||.016;lastTime=now;update(dt);game.petStats={hp:activePet(progress)?.hp??100,mp:activePet(progress)?.mp??100};renderer.draw(game);const p=game.player;$('#coordinates').textContent=`${sceneName(game.scene)} · X:${p.x|0} Y:${p.y|0}`;details.textContent=`${game.net?.duel?'Đấu PvP':game.net?.wildFight?'Đấu pet hoang dã':game.battle.active?(game.battle.mode==='wild'?'Bắt pet / giao chiến':'Đấu tập'):game.paused?'Tạm dừng':'Khám phá'} · ${sceneName(game.scene)} · (${p.x|0}, ${p.y|0}) · ${p.facing} · ${activePet(progress)?.name||'Pet'} Lv.${activePet(progress)?.level||1} · ${activePet(progress)?.hp??0} HP`;requestAnimationFrame(loop);}

function bindKeyboard(){
  window.addEventListener('keydown',e=>{if($('#settings-dialog').open)return;const key=e.key.toLowerCase();if(controlKeys.has(key)||key===' ')e.preventDefault();if(ui?.isOpen()){if(key==='escape'||key==='m')ui.close();return;}if(controlKeys.has(key))keys.add(key);if(e.repeat)return;if(key==='r')resetGame();if(key==='e')interact();if(key==='m')ui.openMenu();if(key==='h')toggleRest();if(key==='f3'){e.preventDefault();settings.debugCollisions=!settings.debugCollisions;syncSettingsUI();saveSettings();}if(key==='escape'&&game.battle.active)toggleBattle();if(key==='p'&&!game.battle.active)togglePause();});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});
}
function togglePause(){if(game.battle.active)return;game.paused=!game.paused;$('#pause').textContent=game.paused?'▶ Tiếp tục':'⏸ Tạm dừng';setStatus(game.paused?'Đang tạm dừng':'Đang khám phá');keys.clear();}
function syncSettingsUI(){ $('#resolution').value=settings.resolution;for(const [id,value,out] of [['zoom',settings.zoom,'#zoom-output'],['player-scale',settings.playerScale,'#player-output'],['pet-scale',settings.petScale,'#pet-output']]){$('#'+id).value=value;$(out).textContent=Number(value).toFixed(2)+'×';} $('#debug-collisions').checked=settings.debugCollisions;$('#pixelated').checked=settings.pixelated;}
function bindSettings(){const dlg=$('#settings-dialog');$('#settings-toggle').addEventListener('click',()=>{syncSettingsUI();keys.clear();dlg.showModal();});dlg.addEventListener('close',()=>keys.clear());$('#resolution').addEventListener('change',e=>{settings.resolution=e.target.value;renderer.setResolution(settings.resolution);renderer.updateCamera(game.player,1,true,game.scene);saveSettings();});for(const [id,name,out] of [['#zoom','zoom','#zoom-output'],['#player-scale','playerScale','#player-output'],['#pet-scale','petScale','#pet-output']])$(id).addEventListener('input',e=>{settings[name]=Number(e.target.value);$(out).textContent=settings[name].toFixed(2)+'×';if(name==='zoom')renderer.updateCamera(game.player,1,true,game.scene);saveSettings();});$('#pixelated').addEventListener('change',e=>{settings.pixelated=e.target.checked;canvas.style.imageRendering=e.target.checked?'pixelated':'auto';saveSettings();});$('#debug-collisions').addEventListener('change',e=>{settings.debugCollisions=e.target.checked;saveSettings();});$('#defaults').addEventListener('click',()=>{Object.assign(settings,DEFAULT_SETTINGS);renderer.setResolution(settings.resolution);canvas.style.imageRendering='pixelated';renderer.updateCamera(game.player,1,true,game.scene);syncSettingsUI();saveSettings();});$('#fullscreen').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await $('#stage').requestFullscreen();else await document.exitFullscreen();}catch(err){console.warn('Fullscreen unavailable:',err);}});}
function bindTouch(){document.querySelectorAll('[data-control]').forEach(button=>{const k=button.dataset.control;button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);keys.add(k);});const stop=()=>keys.delete(k);button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',stop);button.addEventListener('lostpointercapture',stop);});$('#touch-interact').addEventListener('click',()=>interact());const run=$('#touch-run');run.addEventListener('pointerdown',e=>{e.preventDefault();run.setPointerCapture?.(e.pointerId);keys.add('shift');});for(const event of ['pointerup','pointercancel','lostpointercapture'])run.addEventListener(event,()=>keys.delete('shift'));if(interactButton)interactButton.addEventListener('click',()=>interact());}
function bindPointerControls(){
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',event=>{if(event.button!==0||ui?.isOpen()||game.battle.active)return;const world=screenToWorld(event.clientX,event.clientY);game.pointer.active=true;game.pointer.dragMoved=false;game.pointer.startX=event.clientX;game.pointer.startY=event.clientY;game.pointer.target=world;canvas.setPointerCapture?.(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(!game?.pointer?.active||!(event.buttons&1)||ui?.isOpen()||game.battle.active)return;if(Math.hypot(event.clientX-game.pointer.startX,event.clientY-game.pointer.startY)>6)game.pointer.dragMoved=true;game.pointer.target=screenToWorld(event.clientX,event.clientY);});
  canvas.addEventListener('pointerup',event=>{
    if(event.button!==0||!game?.pointer) return;
    const wasActive=game.pointer.active,dragMoved=game.pointer.dragMoved;game.pointer.active=false;if(!wasActive||ui?.isOpen()||game.battle.active)return;
    const world=screenToWorld(event.clientX,event.clientY);if(dragMoved){game.pointer.target=null;game.pointer.dragMoved=false;return;}game.pointer.dragMoved=false;
    const wildHit=currentWilds().find(w=>Math.abs(w.x-world.x)<28&&Math.abs(w.y-world.y)<44);
    if(wildHit){game.pointer.target=null;if(Math.hypot(game.player.x-wildHit.x,game.player.y-wildHit.y)<=54)startWildBattle(wildHit);else game.pointer.target={x:wildHit.x,y:wildHit.y};return;}
    const target=nearestInteraction(game.scene,game.player.x,game.player.y);if(target){interact(target);return;}game.pointer.target=world;
  });
  for(const name of ['pointercancel','lostpointercapture']) canvas.addEventListener(name,()=>{if(game?.pointer){game.pointer.active=false;game.pointer.dragMoved=false;game.pointer.target=null;}});
}

function setupNetwork(){
 const net=new NetClient(msg=>{if(msg.type==='connection'){$('#net-status').textContent=msg.online?'🟢 Multiplayer: đã kết nối máy chủ':'🔴 Ngoại tuyến · chạy npm run dev để chơi 2 client';}if(msg.type==='notice')setStatus(msg.message);if(msg.type==='challenge'){const yes=window.confirm(`${msg.name} muốn thách đấu pet với bạn. Đồng ý?`);net.respond(msg.from,yes);}if(msg.type==='duel'){ui?.close();game.battle.stop();keys.clear();$('#menu-trigger').disabled=true;syncBattleUI();syncSkillButtons();}if(msg.type==='duelEnd'){$('#menu-trigger').disabled=false;syncBattleUI();setStatus(msg.message);if(msg.winner===net.id){gainPetXP(progress,40);saveProgress(progress);}}
 if(msg.type==='wildBattleStart'){ui?.close();clearPointerTarget();$('#menu-trigger').disabled=true;syncBattleUI();}
 if(msg.type==='wildBattleEnd')handleSharedBattleResult(msg);
 if(msg.type==='wildItemUsed'){if(progress.items[msg.item]>0){progress.items[msg.item]--;saveProgress(progress);}syncSkillButtons();}});game.net=net;
 const peerCard=$('#peer-card');canvas.addEventListener('pointerup',event=>{if(ui?.isOpen()||game.net?.duel||game.battle.active)return;const b=canvas.getBoundingClientRect();const px=(event.clientX-b.left)*canvas.width/b.width,py=(event.clientY-b.top)*canvas.height/b.height;const x=px/settings.zoom+renderer.camera.x,y=py/settings.zoom+renderer.camera.y;const remote=net.players.filter(p=>p.scene===game.scene).find(p=>Math.abs(p.player.x-x)<34&&y<=p.player.y+15&&y>=p.player.y-110);if(!remote){peerCard.hidden=true;return;}currentPeer=remote.id;$('#peer-title').textContent=remote.name;$('#peer-subtitle').textContent=`${sceneName(remote.scene)} · ${speciesById(remote.species).name} Lv.${remote.level}`;peerCard.hidden=false;});
 $('#peer-close').addEventListener('click',()=>peerCard.hidden=true);$('#peer-challenge').addEventListener('click',()=>{if(currentPeer)net.challenge(currentPeer);peerCard.hidden=true;});$('#peer-profile').addEventListener('click',()=>{const remote=net.players.find(p=>p.id===currentPeer);setStatus(remote?`${remote.name}: ${speciesById(remote.species).name} Lv.${remote.level}`:'Người chơi đã rời bản đồ');peerCard.hidden=true;});
}

async function start(){
  try{
    const assets=await loadAssets((count,total)=>{$('#loading-progress').textContent=`Đang nạp asset ${count} / ${total}`;});
    renderer=new Renderer(canvas,assets,settings);canvas.style.imageRendering=settings.pixelated?'pixelated':'auto';
    game={playerName:'HLV '+Math.floor(Math.random()*900+100),player:makeActor(SPAWN.x,SPAWN.y,'south'),pet:makeActor(SPAWN.x-64,SPAWN.y+6,'west'),history:[],lastHistory:{},battle:new Battle(),paused:false,dt:0,scene:'city',exitCooldown:0,battleResolution:'',pointer:{active:false,dragMoved:false,target:null,startX:0,startY:0},wildEncounterCooldown:0,restMode:false,lastMotionAt:Date.now()};
    resetGame();bindKeyboard();bindSettings();bindTouch();bindPointerControls();
    ui=createGameUI(progress,()=>{syncSettingsUI();keys.clear();$('#settings-dialog').showModal();},()=>game?.scene||'city');
    setupNetwork();window.__PetTownDebug={getGame:()=>game,getProgress:()=>progress,moveTo:(scene,x,y)=>{if(scene!==game.scene)changeScene(scene);game.player.x=x;game.player.y=y;renderer.updateCamera(game.player,0,true,game.scene);},getSharedWilds:()=>game.net?.wilds||[]};
    $('#battle-toggle').addEventListener('click',toggleBattle);$('#leave-battle').addEventListener('click',()=>game.net?.duel?game.net.surrender():toggleBattle());$('#reset').addEventListener('click',resetGame);$('#pause').addEventListener('click',togglePause);
    document.querySelectorAll('[data-skill]').forEach(button=>button.addEventListener('click',()=>{const skill=SKILL_LEVELS.find(x=>x.id===button.dataset.skill);const pet=activePet(progress);if(!skill||!pet?.skills?.includes(skill.id)||pet.level<skill.level)return;if(game.net?.duel){game.net.attack(skill.id);return;}if(game.net?.wildFight){game.net.wildAction('skill',skill.id);return;}if(game.battle.active&&game.battle.useSkill(skill.id))syncSkillButtons();}));
    $('#battle-heal')?.addEventListener('click',()=>{if(game.net?.wildFight){game.net.wildAction('potion');return;}if(!game.battle.active)return;const spent=consumeItem(progress,'potion');if(!spent.ok){setStatus(spent.message);syncSkillButtons();return;}const res=game.battle.usePotion(40);if(!res.ok){progress.items.potion++;setStatus(res.message);syncSkillButtons();return;}saveProgress(progress);syncSkillButtons();});
    $('#battle-catch')?.addEventListener('click',()=>{if(game.net?.wildFight)game.net.wildAction('catch');});
    $('#rest-trigger')?.addEventListener('click',toggleRest);
    $('#loading').hidden=true;lastTime=performance.now();requestAnimationFrame(loop);console.info('Pet Town v1.6: thêm pet hoang dã, bắt pet, auto battle turn và dùng vật phẩm trong trận.');
  }catch(err){console.error(err);$('#loading-progress').textContent=err.message;$('#loading-progress').style.color='#ff9d9d';setStatus('Lỗi tải game');}
}
start();
