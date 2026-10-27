/** No npm dependencies. Local HTTP game server + minimal RFC6455 WebSocket relay. */
import {createServer} from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SKILL_LEVELS,skillCompatible,statsFor,combatDamage,mpCostPercent} from './src/pet-data.js';
import {SharedWildWorld} from './src/shared-wild-server.js';
import {furyMultiplier} from './src/wild-data.js';
const root=fileURLToPath(new URL('.',import.meta.url));
const port=Number(process.env.PORT||5500);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'};
const clients=new Map();let duel=null;
const wildWorld=new SharedWildWorld({onEvent:(id,data)=>send(id,data)});
const autoDuelAt=()=>Date.now()+3000;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,Number(x)||0));
function frame(data){const body=Buffer.from(JSON.stringify(data));const len=body.length;const head=len<126?Buffer.from([129,len]):len<65536?Buffer.from([129,126,len>>8,len&255]):Buffer.from([129,127,0,0,0,0,(len/2**24)&255,(len>>16)&255,(len>>8)&255,len&255]);return Buffer.concat([head,body]);}
function send(id,data){const c=clients.get(id);if(c&&!c.socket.destroyed)c.socket.write(frame(data));}
function both(data){if(!duel)return;for(const id of duel.players)send(id,data);}
function broadcast(data){for(const id of clients.keys())send(id,data);}
function endDuel(winner,why){if(!duel)return;both({type:'duelEnd',winner,message:why});duel=null;}
function nearby(a,b){return a&&b&&a.scene===b.scene&&Math.hypot(a.player.x-b.player.x,a.player.y-b.player.y)<=240;}
function handle(id,msg){const me=clients.get(id);if(!me||!msg||typeof msg.type!=='string')return;
 if(msg.type==='move'){
  const p=msg.player||{},pt=msg.pet||{};
  const scene=String(msg.scene||'city').slice(0,40);
  me.scene=scene;me.player={x:clamp(p.x,0,1600),y:clamp(p.y,0,1100),facing:['north','south','east','west'].includes(p.facing)?p.facing:'south',moving:!!p.moving,anim:clamp(p.anim,0,100000)};
  me.pet={x:clamp(pt.x,0,1600),y:clamp(pt.y,0,1100),facing:pt.facing==='west'?'west':'east',moving:!!pt.moving,anim:clamp(pt.anim,0,100000)};
  me.species=String(msg.species||'flame').slice(0,30);me.level=clamp(msg.level,1,100);me.name=String(msg.name||`Người chơi ${id}`).slice(0,24);
  me.petHP=clamp(msg.petHP??100,0,100);me.petMP=clamp(msg.petMP??100,0,100);me.speed=clamp(msg.speed??20,1,999);me.skills=Array.isArray(msg.skills)?msg.skills.filter(v=>typeof v==='string').slice(0,12):['basic'];me.potionCount=clamp(msg.potionCount??0,0,99);me.ballCount=clamp(msg.ballCount??0,0,99);me.furyRank=clamp(msg.furyRank??1,1,5);
 } else if(msg.type==='wildStart'){
  const result=wildWorld.startBattle(me,msg.monsterId);if(!result.ok)send(id,{type:'notice',message:result.message});
 } else if(msg.type==='wildAction'){
  const result=wildWorld.action(id,msg.action,msg.skill||'basic');if(!result.ok)send(id,{type:'notice',message:result.message});
 } else if(msg.type==='challenge'){
  const target=clients.get(msg.target);
  if(duel||wildWorld.fights.has(id)||wildWorld.fights.has(msg.target)||!nearby(me,target)){send(id,{type:'notice',message:'Đối phương cần ở gần bạn trên cùng map, và chưa trong trận.'});return;}
  target.pending=id;send(target.id,{type:'challenge',from:id,name:me.name});send(id,{type:'notice',message:`Đã gửi lời thách đấu tới ${target.name}.`});
 } else if(msg.type==='respond'){
  const inviter=clients.get(msg.from);if(me.pending!==msg.from||!inviter||!nearby(me,inviter))return;
  me.pending=null;if(!msg.accept){send(inviter.id,{type:'notice',message:`${me.name} đã từ chối lời thách đấu.`});return;}
  if(duel||wildWorld.fights.has(id)||wildWorld.fights.has(msg.from))return;
  const first=inviter.speed>me.speed?inviter.id:me.speed>inviter.speed?id:inviter.id;
  duel={players:[inviter.id,id],hp:{[id]:100,[inviter.id]:100},mp:{[id]:100,[inviter.id]:100},turn:first,turnEndsAt:autoDuelAt(),log:`${inviter.name} đấu với ${me.name}`,round:1,fury:{[id]:1,[inviter.id]:1}};
  both({type:'duel',duel});
 } else if(msg.type==='attack'){
  if(!duel||!duel.players.includes(id)||duel.turn!==id)return;
  const ability=SKILL_LEVELS.find(s=>s.id===msg.skill);if(!ability||me.level<ability.level||!skillCompatible(ability,me.species)||!me.skills.includes(ability.id)||duel.mp[id]<mpCostPercent(ability,statsFor(me.species,me.level))){send(id,{type:'notice',message:'Kỹ năng chưa mở cấp hoặc không đủ MP.'});return;}
  const foe=duel.players.find(p=>p!==id);
  const myStats=statsFor(me.species,me.level), foeStats=statsFor(clients.get(foe).species,clients.get(foe).level);
  duel.mp[id]-=mpCostPercent(ability,myStats);const isFury=ability.id==='fury';const hit=combatDamage(ability,myStats,foeStats,duel.fury[id]||1);const damage=hit.damage;
  if(isFury)duel.fury[id]=furyMultiplier(me.level,me.furyRank);else {duel.hp[foe]=Math.max(0,duel.hp[foe]-hit.percent);duel.fury[id]=1;}
  if(ability.heal)duel.hp[id]=Math.min(100,duel.hp[id]+ability.heal/myStats.maxHp*100);
  duel.log=isFury?`${me.name} gồng năng lượng x${duel.fury[id].toFixed(2)} lượt kế!`:`${me.name} dùng ${ability.name}, gây ${damage} sát thương.`;
  if(duel.hp[foe]===0){endDuel(id,`${me.name} chiến thắng!`);return;}
  duel.turn=foe;duel.turnEndsAt=autoDuelAt();duel.round++;both({type:'duel',duel});
 } else if(msg.type==='surrender'){
  if(duel?.players.includes(id))endDuel(duel.players.find(p=>p!==id),`${me.name} rời trận đấu.`);
 }
}
function attachSocket(socket,id){let buffer=Buffer.alloc(0);socket.on('data',chunk=>{
 buffer=Buffer.concat([buffer,chunk]);if(buffer.length>1000000){socket.destroy();return;}
 while(buffer.length>=2){
  const b0=buffer[0],b1=buffer[1];const opcode=b0&15;let n=b1&127,header=2;
  if(n===126){if(buffer.length<4)break;n=buffer.readUInt16BE(2);header=4;}
  if(n===127){if(buffer.length<10)break;const size=buffer.readBigUInt64BE(2);if(size>100000n){socket.destroy();return;}n=Number(size);header=10;}
  if(!(b1&128)){socket.destroy();return;} // browsers must mask messages
  if(buffer.length<header+4+n)break;
  const key=buffer.subarray(header,header+4),payload=Buffer.from(buffer.subarray(header+4,header+4+n));buffer=buffer.subarray(header+4+n);
  for(let i=0;i<n;i++)payload[i]^=key[i%4];
  if(opcode===8){socket.end();return;}
  if(opcode===9){socket.write(Buffer.from([0x8a,payload.length,...payload]));continue;}
  if(opcode!==1)continue;
  try{handle(id,JSON.parse(payload.toString('utf8')));}catch{}
 }
 });
 const leave=()=>{if(!clients.has(id))return;wildWorld.disconnect(id);const me=clients.get(id);clients.delete(id);if(duel?.players.includes(id))endDuel(duel.players.find(i=>i!==id),`${me.name} đã ngắt kết nối.`);broadcast({type:'notice',message:`${me.name} đã rời game.`});};
 socket.on('end',leave);socket.on('close',leave);socket.on('error',leave);
}
const server=createServer(async(req,res)=>{try{
 const pathPart=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const target=resolve(root,'.'+(pathPart==='/'?'/index.html':pathPart));
 if(target!==resolve(root,'index.html')&&!target.startsWith(resolve(root)+sep)){res.writeHead(403);return res.end('Forbidden');}
 const info=await stat(target);if(!info.isFile()){res.writeHead(404);return res.end('Not found');}
 res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(await readFile(target));
 }catch{res.writeHead(404);res.end('Not found');}});
server.on('upgrade',(req,socket)=>{
 if(new URL(req.url,'http://localhost').pathname!=='/ws'||req.headers.upgrade?.toLowerCase()!=='websocket'||!req.headers['sec-websocket-key']){socket.destroy();return;}
 if(clients.size>=2){socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\nOnly two players supported');socket.destroy();return;}
 const accept=createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
 socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
 const id=randomUUID().slice(0,8);clients.set(id,{id,socket,scene:'city',name:`HLV-${clients.size}`,species:'flame',level:1,player:{x:773,y:774,facing:'south'},pet:{x:720,y:786,facing:'east'}});
 attachSocket(socket,id);send(id,{type:'welcome',id});
});
setInterval(()=>{
 const now=Date.now();wildWorld.tick(now);
 if(duel&&duel.turnEndsAt<=now){const actor=clients.get(duel.turn);if(actor)handle(duel.turn,{type:'attack',skill:'basic'});}
 broadcast({type:'snapshot',players:[...clients.values()].map(({id,scene,name,species,level,player,pet})=>({id,scene,name,species,level,player,pet})),...wildWorld.snapshot()});
},110).unref();
server.listen(port,'0.0.0.0',()=>console.log(`Pet Town 2-player server http://localhost:${port} (npm run dev)`));
