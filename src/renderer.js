import { WORLD } from './config.js';
import { INTERIORS, OUTSKIRTS, CITY_EXITS, isOutdoorScene, getSceneDimensions } from './world.js';
import {SKILL_LEVELS,speciesById} from './pet-data.js';
import { SOLIDS, FOREGROUND, PORTALS, PLAYER_RADIUS, PET_RADIUS } from './world.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const round=n=>Math.round(n);
export class Renderer {
  constructor(canvas,assets,settings) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    this.images=assets;this.settings=settings;
    this.camera={x:0,y:0};this.time=0;
    this.setResolution(settings.resolution);
  }
  setResolution(value) {
    const [w,h]=String(value).split('x').map(Number);
    if(!w||!h)return;
    this.canvas.width=w;this.canvas.height=h;
    this.canvas.style.aspectRatio=`${w} / ${h}`;
    this.ctx.imageSmoothingEnabled=!this.settings.pixelated;
  }
  updateCamera(target,dt,instant=false,scene='city') {
    const zoom=this.settings.zoom;
    const {width,height}=getSceneDimensions(scene);
    const vw=this.canvas.width/zoom,vh=this.canvas.height/zoom;
    const goalX=vw>=width?(width-vw)/2:clamp(target.x-vw/2,0,width-vw);
    const goalY=vh>=height?(height-vh)/2:clamp(target.y-vh/2,0,height-vh);
    const k=instant?1:1-Math.exp(-8*dt);
    this.camera.x+=(goalX-this.camera.x)*k;
    this.camera.y+=(goalY-this.camera.y)*k;
  }
  draw(game) {
    const {ctx,canvas,camera}=this;
    const zoom=this.settings.zoom;
    this.time+=game.dt||0;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.imageSmoothingEnabled=!this.settings.pixelated;
    ctx.fillStyle='#1d4334';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.setTransform(zoom,0,0,zoom,-round(camera.x*zoom),-round(camera.y*zoom));
    const scene=game.scene||'city';
    const dim=getSceneDimensions(scene);
    if(isOutdoorScene(scene))this.drawOutdoors(scene);
    else {
      const img=scene==='city'?this.images.map:this.images[INTERIORS[scene].image];
      if(img) ctx.drawImage(img,0,0,dim.width,dim.height);
      else {ctx.fillStyle=scene==='city'?'#253b4f':'#30241c';ctx.fillRect(0,0,dim.width,dim.height);}
    }
    if(scene==='city'){this.drawCityMarkers();this.drawPetVendor();this.drawCityFerryman();}
    else if(!isOutdoorScene(scene))this.drawIndoorHighlights(scene);
    // Painter algorithm: roofs, trees and signs cover actors BEHIND them.
    // They never block movement merely because they are tall in the image.
    const sceneNpcLayers=(OUTSKIRTS[scene]?.rookieTrainer?[      {kind:'npc-player',y:OUTSKIRTS[scene].rookieTrainer.y,data:{x:OUTSKIRTS[scene].rookieTrainer.x,y:OUTSKIRTS[scene].rookieTrainer.y,facing:'west',moving:false,anim:0,displayName:OUTSKIRTS[scene].rookieTrainer.name}},      {kind:'npc-pet',y:OUTSKIRTS[scene].rookieTrainer.petY,data:{x:OUTSKIRTS[scene].rookieTrainer.petX,y:OUTSKIRTS[scene].rookieTrainer.petY,facing:'east',moving:false,anim:0,species:OUTSKIRTS[scene].rookieTrainer.species,displayName:OUTSKIRTS[scene].rookieTrainer.petName}}    ]:[]);
    const foreground=scene==='city'?FOREGROUND:(OUTSKIRTS[scene]?.foreground||[]);
    const layers=[
      ...foreground.map(item=>({kind:'foreground',y:item.contactY,data:item})),
      ...sceneNpcLayers,
      {kind:'player',y:game.player.y,data:game.player},
      {kind:'pet',y:game.pet.y,data:game.pet},
      ...((game.net?.wilds||[]).filter(w=>w.scene===scene).map(w=>({kind:'wild-pet',y:w.y,data:w}))),
      ...((game.net?.players||[]).filter(p=>p.scene===scene).flatMap(p=>[
        {kind:'remote-player',y:p.player.y,data:{...p.player,displayName:p.name}},
        {kind:'remote-pet',y:p.pet.y,data:{...p.pet,species:p.species,displayName:speciesById(p.species).name}}
      ])),
    ].sort((a,b)=>a.y-b.y);
    for(const layer of layers) {
      if(layer.kind==='foreground') this.drawForeground(layer.data,scene);
      else this.drawActor(layer.kind,layer.data);
      if(layer.kind==='pet'||layer.kind==='remote-pet'||layer.kind==='wild-pet'){const fight=(game.net?.wildBattles||[]).find(f=>f.monsterId===layer.data.id);this.drawWorldPetBars(layer.data,layer.kind==='pet'?game.petStats:(layer.kind==='wild-pet'?{hp:fight?.enemyHP??layer.data.hp??100,mp:fight?.enemyMP??layer.data.mp??100,level:layer.data.level||1}:null));}
      if(layer.kind==='remote-player')this.drawRemoteName(layer.data);
      if(layer.kind==='npc-player')this.drawRemoteName(layer.data);
      if(layer.kind==='npc-pet'||layer.kind==='wild-pet')this.drawScenePetName(layer.data,layer.kind==='wild-pet');
    }
    // A faint ghost prevents the avatar disappearing completely behind a roof.
    // Building art remains visually in front; gameplay movement is not restricted.
    for(const actor of [{kind:'player',data:game.player},{kind:'pet',data:game.pet}]) {
      if(foreground.some(layer=>actor.data.y<layer.contactY && this.isInsidePolygon(actor.data.x,actor.data.y,layer.polygon))) {
        ctx.save();ctx.globalAlpha=.30;this.drawActor(actor.kind,actor.data);ctx.restore();
      }
    }
    if(isOutdoorScene(scene))this.drawSceneExitArrows(scene);
    this.drawOverworldFights(game,scene);
    if(game.recoveryVfx?.at&&Date.now()-game.recoveryVfx.at<1200)this.drawElementEffect(game.recoveryVfx.element,game.pet.x,game.pet.y-48,(Date.now()-game.recoveryVfx.at)/1200,65);
    if(this.settings.debugCollisions) {
      this.drawCollisions(scene);
      this.drawContactPoint(game.player,'#ffe047',PLAYER_RADIUS);
      this.drawContactPoint(game.pet,'#d992ff',PET_RADIUS);
    }
    ctx.setTransform(1,0,0,1,0,0);
    if(game.paused&&!game.battle.active)this.drawPause();
    if(game.net?.duel)this.drawDuel(game.net.duel,game.net.id,game.net.players,game.player,game.pet);
    else if(game.net?.wildFight)this.drawBattle(this.asServerBattle(game.net.wildFight));
    else if(game.battle.active)this.drawBattle(game.battle);
  }
  drawWorldPetBars(actor,stat){
    const c=this.ctx,x=actor.x-23,y=actor.y-94;const hp=stat?.hp??100,mp=stat?.mp??100;
    for(const [i,val,col] of [[0,hp,'#64ed91'],[1,mp,'#55b8ff']]){
      c.fillStyle='#0d2332';c.fillRect(x,y+i*7,46,6);
      c.fillStyle=col;c.fillRect(x+1,y+i*7+1,44*Math.max(0,Math.min(100,val))/100,4);
    }
    if(stat?.level){c.fillStyle='#eaffff';c.font='bold 10px system-ui';c.textAlign='center';c.fillText('Lv.'+stat.level,actor.x,y-4);c.textAlign='left';}
  }
  drawRemoteName(a){const c=this.ctx;c.font='bold 12px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#00182d';c.fillStyle='#ffe7ad';c.strokeText(a.displayName||'Player 2',a.x,a.y-110);c.fillText(a.displayName||'Player 2',a.x,a.y-110);c.textAlign='left';}
  drawScenePetName(a,isWild=false){const c=this.ctx;c.save();c.font='bold 11px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#00182d';c.fillStyle=isWild?'#ffd7a0':'#8fe8ff';const label=a.displayName||(speciesById(a.species||'bug').name+(a.level?' Lv.'+a.level:''));c.strokeText(label,a.x,a.y-88);c.fillText(label,a.x,a.y-88);c.restore();}
  drawMarker(x,y,axis='h',color='#f33e39'){
    const c=this.ctx;c.save();c.lineCap='round';c.lineWidth=5;c.strokeStyle='#40151b';c.beginPath();
    if(axis==='h'){c.moveTo(x-13,y);c.lineTo(x+13,y);}else{c.moveTo(x,y-13);c.lineTo(x,y+13);}c.stroke();
    c.lineWidth=3;c.strokeStyle=color;c.stroke();c.restore();
  }
  drawPetVendor(){
    const c=this.ctx,x=1032,y=319;
    const img=this.images.player_south_0;
    c.save();c.fillStyle='#1d2c36a9';c.beginPath();c.ellipse(x,y-1,22,6,0,0,7);c.fill();
    if(img){c.filter='sepia(.18) saturate(1.3)';c.drawImage(img,x-30,y-82,60,81);c.filter='none';}
    c.font='bold 12px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#163041';c.strokeText('SHOP PET · E',x,y-92);c.fillStyle='#ffed9c';c.fillText('SHOP PET · E',x,y-92);
    c.textAlign='left';c.restore();
  }
  drawCityMarkers(){
    for(const g of CITY_EXITS)this.drawGateArrow(g.markerX,g.markerY,g.facing);
  }
  drawCityFerryman(){
    const c=this.ctx,x=1370,y=660,img=this.images.player_south_0;
    c.save();
    if(img){c.filter='hue-rotate(180deg)';c.drawImage(img,x-25,y-72,50,72);c.filter='none';}
    c.textAlign='center';c.font='bold 23px system-ui';c.strokeStyle='#143849';c.lineWidth=4;
    c.strokeText('⚓',x,y-83);c.fillStyle='#9af0ff';c.fillText('⚓',x,y-83);
    c.font='bold 12px system-ui';c.strokeText('LÁI ĐÒ · E',x,y+20);c.fillStyle='#fff0c4';c.fillText('LÁI ĐÒ · E',x,y+20);c.restore();
  }
  drawGateArrow(x,y,dir){
    const c=this.ctx,angle={north:-Math.PI/2,south:Math.PI/2,west:Math.PI,east:0}[dir];
    c.save();c.translate(x,y);c.rotate(angle);c.translate(0,-22);c.fillStyle='#f1402d';c.strokeStyle='#ffe360';c.lineWidth=2;
    c.beginPath();c.moveTo(13,0);c.lineTo(-5,-10);c.lineTo(-5,-4);c.lineTo(-15,-4);c.lineTo(-15,4);c.lineTo(-5,4);c.lineTo(-5,10);c.closePath();c.fill();c.stroke();c.restore();
  }
  drawSceneExitArrows(scene){
    const exits=[...(OUTSKIRTS[scene]?.exits||[]),...(OUTSKIRTS[scene]?.exit?[OUTSKIRTS[scene].exit]:[])];
    for(const exit of exits){
      if(exit.showArrow===false)continue;
      const x=exit.x+exit.w/2,y=exit.y+exit.h/2;
      this.drawGateArrow(x,y,exit.arrow||'north');
    }
  }
  drawIndoorHighlights(scene){
    const c=this.ctx,people=INTERIORS[scene]?.npc||[];
    // Lightweight pixel-furniture details contextualize previously empty wall space.
    if(scene==='orange-shop'){
      c.save();c.imageSmoothingEnabled=false;
      for(const y of [124,160]){
        c.fillStyle='#87502c';c.fillRect(218,y,270,8);c.fillStyle='#d09b4c';c.fillRect(221,y,264,3);
      }
      for(const [x,y,color,kind] of [
       [238,100,'#f35461','ball'],[291,101,'#7edcfa','potion'],[348,100,'#f6bb63','ball'],[426,102,'#98f1a4','potion'],
       [256,136,'#da70f2','potion'],[322,135,'#f5b54a','ball'],[391,135,'#61e7e2','potion'],[455,135,'#f1dd7a','ball']]){
        c.fillStyle='#252334';c.fillRect(x-11,y-13,24,24);c.fillStyle='#f3e3c0';c.fillRect(x-8,y-10,18,18);
        if(kind==='ball'){
          c.fillStyle=color;c.beginPath();c.arc(x+1,y,8,Math.PI,2*Math.PI);c.fill();c.fillStyle='#fff';c.fillRect(x-7,y,16,7);
          c.fillStyle='#273247';c.fillRect(x-8,y-1,18,3);c.fillStyle='#fff';c.fillRect(x-2,y-3,5,5);
        }else{
          c.fillStyle=color;c.fillRect(x-5,y-4,12,12);c.fillStyle='#7d444b';c.fillRect(x-2,y-8,6,5);
          c.fillStyle='#fff9ec';c.fillRect(x-3,y,4,2);
        }
      }
      c.fillStyle='#633c20';c.fillRect(229,192,249,24);c.fillStyle='#f6d684';c.font='bold 16px system-ui';c.textAlign='center';c.fillText('PET TOWN · VẬT PHẨM',354,209);c.textAlign='left';c.restore();
    }
    if(scene==='west-cottage'){
      c.save();c.fillStyle='#84623f';c.fillRect(91,466,188,12);
      c.fillStyle='#b6d872';for(let i=0;i<6;i++){const x=107+i*28;c.beginPath();c.arc(x,449-(i%2)*5,12,0,7);c.fill();}
      c.font='bold 15px system-ui';c.fillStyle='#8b5c3c';c.fillText('NHÀ ẤM ÁP',375,287);c.restore();
    }
    // The screenshot NPC artwork remains intact; high-contrast labels make it legible.
    for(const person of people){
      const tags={elder:'Bà chủ nhà',evolution:'NGUYÊN LIỆU',items:'HỒI PHỤC',storage:'LƯU TRỮ'};
      const label=tags[person.id]||person.label;
      const x=person.x,y=person.id==='items'||person.id==='storage'?person.y-180:person.y-118;
      c.save();c.font='bold 13px system-ui';const w=Math.max(65,c.measureText(label).width+16);
      c.fillStyle='#162236ec';c.strokeStyle='#ffe0a4';c.lineWidth=1.5;
      c.beginPath();c.roundRect(x-w/2,y-19,w,25,7);c.fill();c.stroke();
      c.textAlign='center';c.fillStyle='#fff1cd';c.fillText(label,x,y-2);c.restore();
    }
  }
  drawOutdoors(scene){
    const c=this.ctx,data=OUTSKIRTS[scene],{width:w,height:h}=data;
    const bg=data?.image?this.images[data.image]:null;
    if(bg){c.drawImage(bg,0,0,w,h);}
    else{
      c.fillStyle='#7ebd59';c.fillRect(0,0,w,h);
      for(let y=0;y<h;y+=32)for(let x=0;x<w;x+=32){
        const n=Math.sin(x*.159+y*.673+scene.length)*Math.cos(x*.711-y*.231);
        c.fillStyle=n>0?'#85c968':'#70b353';c.fillRect(x,y,32,32);
        if(n>.48){c.fillStyle='#b9e78c';c.fillRect(x+8,y+12,3,3);c.fillRect(x+22,y+21,4,2);}
      }
      c.fillStyle='#cbb68a';c.fillRect(w/2-56,0,112,h);
      for(let i=0;i<40;i++){const x=39+((i*139)%860),y=33+((i*197)%560);if(Math.abs(x-w/2)<110)continue;
        c.fillStyle='#2c8141';c.beginPath();c.arc(x,y,16,0,7);c.fill();c.fillStyle='#8adb75';c.fillRect(x-7,y-8,8,8);}
      c.fillStyle='#152942c9';c.fillRect(270,255,420,72);c.fillStyle='#fff2c7';c.font='bold 23px system-ui';c.textAlign='center';
      c.fillText('NGOẠI THÀNH — KHU VỰC TEST',480,295);c.font='14px system-ui';c.fillText('Đi về mũi tên để trở lại thành trì',480,317);c.textAlign='left';
    }
    if(scene==='out-west'){c.fillStyle='#142233dd';c.fillRect(14,14,210,48);c.fillStyle='#fff0c4';c.font='bold 17px system-ui';c.fillText('LÀNG PHÍA TÂY',24,36);c.font='12px system-ui';c.fillText('Lối phải sang thành trì · lối dưới xuống đường mòn',24,53);}
    if(scene==='out-west-south'){c.fillStyle='#142233dd';c.fillRect(14,14,270,52);c.fillStyle='#fff0c4';c.font='bold 17px system-ui';c.fillText('KHU PHÍA NAM CỦA LÀNG',24,36);c.font='12px system-ui';c.fillText('Lối phải sang bến thuyền Mỏ Neo',24,53);}
    if(scene==='out-harbor'){c.fillStyle='#142233dd';c.fillRect(14,14,284,52);c.fillStyle='#fff0c4';c.font='bold 17px system-ui';c.fillText('BẾN THUYỀN MỎ NEO',24,36);c.font='12px system-ui';c.fillText('Gặp người lái đò ⚓ để đi thành trì Pet Town',24,53);}
  }
  drawDuel(battle,id,players,localPlayer,localPet){
    const c=this.ctx,{width:w,height:h}=this.canvas;const i=battle.players.indexOf(id),foeId=battle.players[1-i];
    const foe=players.find(p=>p.id===foeId),opponent=foe||{name:'Người chơi khác',species:'ice'};
    c.save();c.fillStyle='#102532ef';c.fillRect(0,0,w,h);c.fillStyle='#9a7047';c.fillRect(0,h*.79,w,h*.21);
    c.fillStyle='#f6e5ae';c.textAlign='center';c.font='bold 25px system-ui';c.fillText('⚔ ĐẤU LINH THÚ — 2 NGƯỜI CHƠI',w/2,h*.13);
    const drawSide=(x,who,species,hp,mp,flipped)=>{
      const img=this.images[`pet_${species||'flame'}_${Math.floor(this.time*5)%2}`]||this.images.pet_east;
      const avatar=this.images['player_south_0'];const y=h*.68,ps=Math.min(142,h*.32),pw=ps*.87;
      if(avatar)c.drawImage(avatar,x+(flipped?66:-100),y-ps*.76,64,ps*.76);
      if(img){c.save();if(flipped){c.translate(2*x,0);c.scale(-1,1);}c.drawImage(img,x-pw/2,y-ps,pw,ps);c.restore();}
      c.font='bold 14px system-ui';c.fillStyle='#fff';c.textAlign='center';c.fillText(who,x,h*.25);
      for(const [n,value,col] of [[0,hp,'#5fe99c'],[1,mp,'#50afff']]){
        c.fillStyle='#12263a';c.fillRect(x-75,h*.29+n*25,150,14);c.fillStyle=col;c.fillRect(x-73,h*.29+2+n*25,146*(Math.max(0,value)/100),10);
        c.fillStyle='#fff';c.font='bold 11px system-ui';c.fillText(`${n?'MP':'HP'} ${value}/100`,x,h*.29+n*25-4);
      }
    };
    drawSide(w*.27,'BẠN',localPet.species,battle.hp[id]??100,battle.mp[id]??100,false);
    drawSide(w*.73,opponent.name,opponent.species,battle.hp[foeId]??100,battle.mp[foeId]??100,true);
    c.font='bold 25px system-ui';c.fillStyle='#ffcc6c';c.fillText('VS',w*.5,h*.55);
    c.font='15px system-ui';c.fillStyle='#d8ebff';c.fillText(battle.log,w/2,h*.76);
    c.fillStyle=battle.turn===id?'#6effc0':'#ffd491';c.fillText(battle.turn===id?'ĐẾN LƯỢT BẠN':'ĐANG CHỜ ĐỐI THỦ',w/2,h*.18);c.restore();
  }
  isInsidePolygon(x,y,polygon) {
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      const a=polygon[i],b=polygon[j];
      if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  drawForeground(layer,scene='city') {
    const {ctx}=this;
    const points=layer.polygon;
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    ctx.save();ctx.beginPath();ctx.moveTo(...points[0]);
    for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);
    ctx.closePath();ctx.clip();
    // Repaint EXACT pixels from the underlying flattened map within the object.
    const image=scene==='city'?this.images.map:this.images[OUTSKIRTS[scene]?.image];
    if(image)ctx.drawImage(image,left,top,right-left,bottom-top,left,top,right-left,bottom-top);
    ctx.restore();
  }
  drawActor(kind,actor) {
    const ctx=this.ctx;
    const isPlayer=kind.includes('player');
    const scale=isPlayer?this.settings.playerScale:this.settings.petScale;
    const frame=actor.moving?(Math.floor(actor.anim*7)%2):0;
    // Pet has ONLY one side view, mirrored horizontally for the other direction.
    // Keeping the entire original bitmap fixes amputated tail / legs.
    const key=isPlayer?`player_${actor.facing}_${frame}`:`pet_${actor.species||'flame'}_${frame}`;
    const chosen=this.images[key]||this.images.pet_east;
    const image=chosen;
    const nativeW=image?.naturalWidth||57,nativeH=image?.naturalHeight||77;
    const bounds=this.images.bounds?.[key]||{centerX:nativeW/2,bottom:nativeH};
    const w=nativeW*scale,h=nativeH*scale;
    const bob=actor.moving?Math.abs(Math.sin(actor.anim*11))*.65:0;
    // The feet anchor (actor.x, actor.y) coincides with the visible lowest
    // alpha pixel, not the bottom of the PNG or top of the collider circle.
    const x=round(actor.x-bounds.centerX*scale),y=round(actor.y-bounds.bottom*scale-bob);
    ctx.fillStyle='rgba(7,23,25,.22)';ctx.beginPath();
    ctx.ellipse(round(actor.x),round(actor.y-1),Math.min(15,w*.25),3.5,0,0,Math.PI*2);ctx.fill();
    if(image) {
      if(!isPlayer&&actor.facing==='west') {
        ctx.save();ctx.translate(round(actor.x*2),0);ctx.scale(-1,1);
        ctx.drawImage(image,x,y,round(w),round(h));ctx.restore();
      }else ctx.drawImage(image,x,y,round(w),round(h));
    }else {
      ctx.fillStyle=isPlayer?'#56b9ff':'#cc89ff';ctx.fillRect(x,y,w,h);
    }
  }
  drawContactPoint(actor,color,radius) {
    const ctx=this.ctx;
    ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();
    ctx.arc(actor.x,actor.y,radius,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=color;ctx.fillRect(actor.x-2,actor.y-2,4,4);
    ctx.font='12px monospace';ctx.fillText(actor.facing,actor.x-17,actor.y-96);
  }
  drawExitArrow(exit){
    const c=this.ctx,x=exit.x+exit.w/2,y=exit.y+9+Math.sin(this.time*4)*3;
    c.save();c.lineWidth=3;c.strokeStyle='#ffd44c';c.fillStyle='#e94128';c.beginPath();
    c.moveTo(x-13,y-7);c.lineTo(x+13,y-7);c.lineTo(x+13,y+4);c.lineTo(x+20,y+4);
    c.lineTo(x,y+24);c.lineTo(x-20,y+4);c.lineTo(x-13,y+4);c.closePath();c.fill();c.stroke();c.restore();
  }
  drawCollisions(scene='city') {
    const ctx=this.ctx;
    ctx.fillStyle='rgba(235,65,81,.24)';ctx.strokeStyle='rgba(255,80,80,.86)';ctx.lineWidth=1.5;
    for(const ob of (scene==='city'?SOLIDS:(INTERIORS[scene]||OUTSKIRTS[scene])?.solids||[])) {
      ctx.beginPath();
      if(ob.type==='circle')ctx.arc(ob.x,ob.y,ob.r,0,Math.PI*2);
      else ctx.rect(ob.x,ob.y,ob.w,ob.h);
      ctx.fill();ctx.stroke();
    }
    ctx.fillStyle='rgba(47,235,160,.24)';ctx.strokeStyle='#42eeba';
    for(const door of (scene==='city'?PORTALS:[])){ctx.fillRect(door.x,door.y,door.w,door.h);ctx.strokeRect(door.x,door.y,door.w,door.h);}
    ctx.strokeStyle='rgba(61,169,250,.68)';ctx.lineWidth=1;
    for(const o of (scene==='city'?FOREGROUND:[])) {
      ctx.beginPath();ctx.moveTo(...o.polygon[0]);
      for(let i=1;i<o.polygon.length;i++)ctx.lineTo(...o.polygon[i]);
      ctx.closePath();ctx.stroke();
    }
    if(scene!=='city'){for(const e of [...(OUTSKIRTS[scene]?.exits||[]),...((INTERIORS[scene]||OUTSKIRTS[scene])?.exit?[((INTERIORS[scene]||OUTSKIRTS[scene]).exit)]:[])]){ctx.fillStyle='rgba(255,181,54,.24)';ctx.strokeStyle='#ffb031';ctx.fillRect(e.x,e.y,e.w,e.h);ctx.strokeRect(e.x,e.y,e.w,e.h);}}
  }
  drawPause() {
    const {ctx,canvas}=this;
    ctx.fillStyle='rgba(8,14,32,.45)';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 30px system-ui';ctx.fillText('ĐÃ TẠM DỪNG',canvas.width/2,canvas.height/2);
    ctx.textAlign='left';
  }
  drawBattle(battle) {
    const {ctx,canvas}=this,w=canvas.width,h=canvas.height;
    ctx.fillStyle='rgba(4,9,30,.87)';ctx.fillRect(0,0,w,h);
    ctx.save();
    ctx.fillStyle='#f0e4ff';ctx.textAlign='center';ctx.font=`bold ${Math.max(22,w*.03)}px system-ui`;
    ctx.fillText(battle.mode==='wild'?'⚔  CHIẾN ĐẤU PET HOANG DÃ':battle.mode==='trainer'?'⚔  ĐẤU HUẤN LUYỆN':'⚔  ĐẤU TẬP LINH THÚ',w/2,h*.16);
    const centerY=h*.57;
    const a={x:w*.28,y:centerY},b={x:w*.72,y:centerY};
    const mySpecies=battle.petSpecies||'flame';
    const foeSpecies=battle.opponentSpecies||'ice';
    const sprite=this.images[`pet_${mySpecies}_${Math.floor(this.time*4)%2}`]||this.images.pet_east;
    const foe=this.images[`pet_${foeSpecies}_${Math.floor(this.time*4)%2}`]||this.images.pet_east;
    const sz=Math.min(170,w*.17,h*.32),sw=sz*.76;
    this.shadowScreen(a.x,centerY+12,sw*.48);this.shadowScreen(b.x,centerY+12,sw*.48);
    if(sprite)ctx.drawImage(sprite,a.x-sw/2,centerY-sz,sw,sz);
    if(foe){ctx.save();ctx.translate(b.x*2,0);ctx.scale(-1,1);ctx.drawImage(foe,b.x-sw/2,centerY-sz,sw,sz);ctx.restore();}
    const avatar=this.images['player_south_0'];
    if(avatar){ctx.drawImage(avatar,a.x-126,centerY-sz*.68,60,78);ctx.drawImage(avatar,b.x+72,centerY-sz*.68,60,78);}    
    this.drawHP(a.x-sw*.6,h*.34,sw*1.2,16,battle.petHP,'PET CỦA BẠN','#56e3bd');
    this.drawHP(a.x-sw*.6,h*.40,sw*1.2,10,battle.petMP,'MP','#60bcff');
    this.drawHP(b.x-sw*.6,h*.34,sw*1.2,16,battle.enemyHP,battle.opponentName||'ĐỐI THỦ','#ff7ba5');
    this.drawHP(b.x-sw*.6,h*.40,sw*1.2,10,battle.enemyMP??100,'MP','#60bcff');
    if(battle.effect)this.drawSkillEffect(battle.effect,battle.effect.owner==='enemy'?a.x:b.x,centerY,sz);
    ctx.fillStyle=battle.winner?'#ffe992':'#d2c6f7';ctx.font=`${Math.max(15,w*.018)}px system-ui`;
    ctx.fillText(battle.message,w/2,h*.77);
    ctx.font='13px system-ui';ctx.fillStyle='#98afd2';
    const turnText=battle.winner?battle.winner:(battle.turnSide==='player'?`Đến lượt bạn · tự đánh sau ${Math.ceil(battle.playerTimeLeft||0)}s`:(battle.turnSide==='enemy'?'Đối thủ đang chuẩn bị ra đòn':'Đang xử lý'));
    ctx.fillText(turnText,w/2,h*.83);
    const sub=(battle.mode==='wild'?'Pet hoang dã có thể bắt khi máu thấp hoặc đang bị hiệu ứng xấu.':'Trận sẽ tự thoát sau khi phân thắng bại.');
    ctx.fillStyle='#86d9ff';ctx.fillText(sub,w/2,h*.875);
    if(battle.enemyStatus||battle.playerStatus){ctx.fillStyle='#ffd9f6';ctx.fillText(`Trạng thái - Bạn: ${battle.playerStatus||'Không'} · Đối thủ: ${battle.enemyStatus||'Không'}`,w/2,h*.91);} 
    ctx.textAlign='left';ctx.restore();
  }
  asServerBattle(f){
    const e=f.effect,elapsed=e?Math.max(0,(Date.now()-e.at)/1000):0;
    return {active:true,mode:'wild',petSpecies:f.playerSpecies,opponentSpecies:f.enemySpecies,
      opponentName:`${speciesById(f.enemySpecies).name} · Lv.${f.enemyLevel}`,
      petHP:f.playerHP,petMP:f.playerMP,enemyHP:f.enemyHP,enemyMP:f.enemyMP,
      playerTimeLeft:f.turn==='player'?Math.max(0,(f.turnEndsAt-Date.now())/1000):0,turnSide:f.turn,
      message:f.log||'Đang chiến đấu...',winner:f.phase==='ended'?f.log:'',playerStatus:f.playerStatus,enemyStatus:f.enemyStatus,
      effect:e&&elapsed<=1?{id:e.element,elapsed,duration:1,color:e.owner==='enemy'?'#ffba69':'#90eaff',owner:e.owner}:null,
      furyMultiplier:f.furyMultiplier||1};
  }
  drawElementEffect(element,x,y,t=0,sz=85){
    const c=this.ctx,frame=Math.max(0,Math.min(6,Math.floor(Math.max(0,Math.min(1,t))*7)));
    const name=(['grass','fire','water','earth','lightning','ice','wind','dark','light','fury','heal','revive','basic'].includes(element))?element:'basic';
    const img=this.images[`vfx_${name}_${frame}`];
    if(!img)return;
    c.save();c.globalAlpha=Math.max(0,1-Math.max(0,t-.62)*2.1);c.drawImage(img,x-sz/2,y-sz/2,sz,sz);c.restore();
  }
  drawOverworldFights(game,scene){
    const c=this.ctx;
    for(const f of (game.net?.wildBattles||[])){
      if(f.scene!==scene||f.phase==='ended')continue;
      const monster=(game.net.wilds||[]).find(w=>w.id===f.monsterId);if(!monster)continue;
      const x=monster.x,y=monster.y;
      c.save();c.textAlign='center';c.font='bold 13px system-ui';c.lineWidth=3;c.strokeStyle='#102437';c.fillStyle='#ffe19d';
      c.strokeText('⚔ ĐANG CHIẾN ĐẤU',x,y-126);c.fillText('⚔ ĐANG CHIẾN ĐẤU',x,y-126);
      const trainer=(game.net.players||[]).find(p=>p.id===f.playerId);
      if(trainer){
        const px=trainer.player.x,py=trainer.player.y;
        c.strokeStyle='#fdad6988';c.lineWidth=2;c.setLineDash([6,5]);c.beginPath();c.moveTo(px,py-27);c.lineTo(x,y-32);c.stroke();c.setLineDash([]);
        c.fillStyle='#68ef9c';c.fillRect(px-24,py-119,48*f.playerHP/100,4);
        c.fillStyle='#74bffe';c.fillRect(px-24,py-112,48*f.playerMP/100,4);
      }
      if(f.effect){const dt=(Date.now()-f.effect.at)/950;if(dt>=0&&dt<=1)this.drawElementEffect(f.effect.element,f.effect.owner==='enemy'?(trainer?.pet.x||x-90):x,y-42,dt,110);}
      c.restore();
    }
  }
  shadowScreen(x,y,r) {const c=this.ctx;c.fillStyle='rgba(23,5,33,.7)';c.beginPath();c.ellipse(x,y,r,10,0,0,Math.PI*2);c.fill();}
  drawHP(x,y,w,h,value,label,color) {
    const c=this.ctx;c.textAlign='left';c.font='bold 13px system-ui';c.fillStyle='#f2eaff';c.fillText(`${label}  ${Math.round(value)}%`,x,y-12);
    c.fillStyle='#3b274c';c.fillRect(x,y,w,h);c.fillStyle=color;c.fillRect(x,y,w*value/100,h);
    c.strokeStyle='#bba3db';c.lineWidth=1;c.strokeRect(x,y,w,h);
  }
  drawSkillEffect(effect,x,y,sz) {
    const ctx=this.ctx,t=effect.elapsed/effect.duration;
    ctx.save();ctx.globalAlpha=clamp(1-t*.85,.1,1);
    const element=effect.id.startsWith?.('elem-')?effect.id.slice(5):effect.id;
    const idx=Math.max(0,Math.min(6,Math.floor(t*7)));
    const img=this.images[`vfx_${element}_${idx}`]||this.images['skill_'+effect.id];
    if(img){
      const r=sz*(1.05+.45*t);
      ctx.drawImage(img,x-r*.6,y-r*1.07,r*1.2,r*1.2);
    }
    ctx.strokeStyle=effect.color||'#96dfff';ctx.lineWidth=4;ctx.shadowColor=effect.color;ctx.shadowBlur=17;
    for(let i=0;i<3;i++){
      const rad=sz*(.28+t*.6+i*.11);
      ctx.beginPath();ctx.arc(x,y-sz*.43,rad,-Math.PI*.95+t+i*.6,Math.PI*.36+t+i*.6);ctx.stroke();
    }
    ctx.restore();
  }
}
