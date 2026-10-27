/** Shared HTTP/WebSocket game server for LAN or a reverse-proxied host. */
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {readFile,stat,realpath} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {networkInterfaces} from 'node:os';
import {WebSocket,WebSocketServer} from 'ws';
import {SKILL_LEVELS,skillCompatible,statsFor,combatDamage,mpCostPercent} from './src/pet-data.js';
import {SharedWildWorld} from './src/shared-wild-server.js';
import {furyMultiplier} from './src/wild-data.js';
import {OUTSKIRTS,INTERIORS,getSceneDimensions,nearestInteraction,FERRY_ROUTES,safeSceneSpawn} from './src/world.js';
const root=fileURLToPath(new URL('.',import.meta.url));
const port=Number(process.env.PORT||5500),host=process.env.HOST||'0.0.0.0';
const maxClients=Number(process.env.MAX_CLIENTS||64);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be an integer from 1 to 65535');
if(!Number.isInteger(maxClients)||maxClients<1||maxClients>256)throw Error('MAX_CLIENTS must be an integer from 1 to 256');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'};
const clients=new Map(),duels=new Map();
const wildWorld=new SharedWildWorld({onEvent:(id,data)=>send(id,data)});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,Number(x)||0));
const busy=id=>duels.has(id)||wildWorld.fights.has(id);
function write(socket,message){
 if(socket.readyState!==WebSocket.OPEN)return;
 if(socket.bufferedAmount>1024*1024){socket.terminate();return;}
 socket.send(message);
}
function send(id,data){const c=clients.get(id);if(c)write(c.socket,JSON.stringify(data));}
function both(duel,data){for(const id of duel.players)send(id,data);}
function broadcast(data){const message=JSON.stringify(data);for(const c of clients.values())write(c.socket,message);}
function endDuel(duel,winner,message){
 both(duel,{type:'duelEnd',winner,message});
 for(const id of duel.players)duels.delete(id);
}
function nearby(a,b){return a&&b&&a.scene===b.scene&&Math.hypot(a.player.x-b.player.x,a.player.y-b.player.y)<=240;}
function handle(id,msg){
 const me=clients.get(id);if(!me||!msg||typeof msg.type!=='string')return;
 const duel=duels.get(id);
 if(msg.type==='move'){
  const p=msg.player||{},pt=msg.pet||{},scene=String(msg.scene||'city');
  if(scene!=='city'&&!Object.hasOwn(OUTSKIRTS,scene)&&!Object.hasOwn(INTERIORS,scene))return;
  if(busy(id))return;
  const {width,height}=getSceneDimensions(scene);
  me.scene=scene;me.player={x:clamp(p.x,0,width),y:clamp(p.y,0,height),facing:['north','south','east','west'].includes(p.facing)?p.facing:'south',moving:!!p.moving,anim:clamp(p.anim,0,100000)};
  me.pet={x:clamp(pt.x,0,width),y:clamp(pt.y,0,height),facing:pt.facing==='west'?'west':'east',moving:!!pt.moving,anim:clamp(pt.anim,0,100000)};
  me.species=String(msg.species||'flame').slice(0,30);me.level=clamp(msg.level,1,100);me.name=String(msg.name||'HLV').slice(0,24);
  me.petHP=clamp(msg.petHP??100,0,100);me.petMP=clamp(msg.petMP??100,0,100);me.speed=clamp(msg.speed??20,1,999);me.skills=Array.isArray(msg.skills)?msg.skills.filter(v=>typeof v==='string').slice(0,12):['basic'];me.potionCount=clamp(msg.potionCount??0,0,99);me.ballCount=clamp(msg.ballCount??0,0,99);me.furyRank=clamp(msg.furyRank??1,1,5);
 }else if(msg.type==='ferry'){
  const route=FERRY_ROUTES[me.scene]?.find(r=>r.to===msg.destination);
  const npc=nearestInteraction(me.scene,me.player.x,me.player.y);
  if(!route||npc?.id!=='ferryman'||busy(id)){send(id,{type:'notice',message:'Hãy đến gần người lái đò và kết thúc trận đấu trước khi đi thuyền.'});return;}
  const spawn=safeSceneSpawn(route.to,route.spawn);
  me.scene=route.to;me.player={...spawn,facing:'south',moving:false,anim:0};
  me.pet={...safeSceneSpawn(route.to,{x:spawn.x-40,y:spawn.y+12}),facing:'east',moving:false,anim:0};
  send(id,{type:'travel',scene:route.to,spawn,message:'Đã cập bến '+route.label+'.'});
 }else if(msg.type==='wildStart'){
  if(duel){send(id,{type:'notice',message:'Hãy kết thúc trận PvP trước.'});return;}
  const result=wildWorld.startBattle(me,msg.monsterId);if(!result.ok)send(id,{type:'notice',message:result.message});
 }else if(msg.type==='wildAction'){
  const result=wildWorld.action(id,msg.action,msg.skill||'basic');if(!result.ok)send(id,{type:'notice',message:result.message});
 }else if(msg.type==='challenge'){
  const target=clients.get(msg.target);
  if(id===msg.target||busy(id)||busy(msg.target)||!nearby(me,target)){send(id,{type:'notice',message:'Đối phương cần ở gần bạn trên cùng map, và chưa trong trận.'});return;}
  target.pending={from:id,expires:Date.now()+30_000};
  send(target.id,{type:'challenge',from:id,name:me.name});send(id,{type:'notice',message:'Đã gửi lời thách đấu tới '+target.name+'.'});
 }else if(msg.type==='respond'){
  const inviter=clients.get(msg.from);
  if(me.pending?.from!==msg.from||me.pending.expires<Date.now()||!inviter||!nearby(me,inviter))return;
  me.pending=null;if(!msg.accept){send(inviter.id,{type:'notice',message:me.name+' đã từ chối lời thách đấu.'});return;}
  if(busy(id)||busy(msg.from))return;
  const first=inviter.speed>me.speed?inviter.id:me.speed>inviter.speed?id:inviter.id;
  const battle={players:[inviter.id,id],hp:{[id]:100,[inviter.id]:100},mp:{[id]:100,[inviter.id]:100},turn:first,turnEndsAt:Date.now()+3000,log:inviter.name+' đấu với '+me.name,round:1,fury:{[id]:1,[inviter.id]:1}};
  for(const participant of battle.players)duels.set(participant,battle);
  both(battle,{type:'duel',duel:battle});
 }else if(msg.type==='attack'){
  if(!duel||duel.turn!==id)return;
  const ability=SKILL_LEVELS.find(s=>s.id===msg.skill);if(!ability||me.level<ability.level||!skillCompatible(ability,me.species)||!me.skills.includes(ability.id)||duel.mp[id]<mpCostPercent(ability,statsFor(me.species,me.level))){send(id,{type:'notice',message:'Kỹ năng chưa mở cấp hoặc không đủ MP.'});return;}
  const foe=duel.players.find(p=>p!==id),opponent=clients.get(foe);if(!opponent)return;
  const myStats=statsFor(me.species,me.level),foeStats=statsFor(opponent.species,opponent.level);
  duel.mp[id]-=mpCostPercent(ability,myStats);const isFury=ability.id==='fury';const hit=combatDamage(ability,myStats,foeStats,duel.fury[id]||1);
  if(isFury)duel.fury[id]=furyMultiplier(me.level,me.furyRank);else{duel.hp[foe]=Math.max(0,duel.hp[foe]-hit.percent);duel.fury[id]=1;}
  if(ability.heal)duel.hp[id]=Math.min(100,duel.hp[id]+ability.heal/myStats.maxHp*100);
  duel.log=isFury?me.name+' gồng năng lượng x'+duel.fury[id].toFixed(2)+' lượt kế!':me.name+' dùng '+ability.name+', gây '+hit.damage+' sát thương.';
  if(duel.hp[foe]===0){endDuel(duel,id,me.name+' chiến thắng!');return;}
  duel.turn=foe;duel.turnEndsAt=Date.now()+3000;duel.round++;both(duel,{type:'duel',duel});
 }else if(msg.type==='surrender'&&duel){endDuel(duel,duel.players.find(p=>p!==id),me.name+' rời trận đấu.');}
}
const server=createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path==='/health'){
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
   return res.end(req.method==='HEAD'?undefined:JSON.stringify({ok:true,players:clients.size,maxClients}));
  }
  if(path!=='/'&&path!=='/index.html'&&!/^\/(assets|src)\//.test(path)){res.writeHead(404);return res.end('Not found');}
  const target=resolve(root,'.'+(path==='/'?'/index.html':path)),actual=await realpath(target);
  if(path.split('/').some(part=>part.startsWith('.'))||!actual.startsWith(resolve(root)+sep)){res.writeHead(403);return res.end('Forbidden');}
  const info=await stat(actual);if(!info.isFile()){res.writeHead(404);return res.end('Not found');}
  res.writeHead(200,{'Content-Type':types[extname(actual)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:await readFile(actual));
 }catch{res.writeHead(404);res.end('Not found');}
});
const wss=new WebSocketServer({noServer:true,maxPayload:64*1024,perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{
 socket.on('error',()=>{});
 if(req.url!=='/ws'){socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');return;}
 if(req.headers.origin){
  try{if(new URL(req.headers.origin).host!==req.headers.host)throw Error('origin');}
  catch{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
 }
 if(clients.size>=maxClients){socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\nServer full');return;}
 wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
});
wss.on('connection',socket=>{
 const id=randomUUID();
 clients.set(id,{id,socket,scene:'city',name:'HLV-'+(clients.size+1),species:'flame',level:1,speed:20,skills:['basic'],player:{x:773,y:774,facing:'south'},pet:{x:720,y:786,facing:'east'}});
 socket.isAlive=true;socket.on('pong',()=>{socket.isAlive=true;});
 socket.on('message',(data,isBinary)=>{
  if(isBinary){socket.close(1003,'Text messages only');return;}
  let message;try{message=JSON.parse(data.toString());}catch{return;}
  handle(id,message);
 });
 socket.on('error',()=>socket.terminate());
 socket.on('close',()=>{
  wildWorld.disconnect(id);const me=clients.get(id);clients.delete(id);
  const duel=duels.get(id);if(duel)endDuel(duel,duel.players.find(i=>i!==id),me.name+' đã ngắt kết nối.');
  for(const c of clients.values())if(c.pending?.from===id)c.pending=null;
 });
 send(id,{type:'welcome',id,maxClients});
});
const tick=setInterval(()=>{
 const now=Date.now();wildWorld.tick(now);
 for(const duel of new Set(duels.values()))if(duel.turnEndsAt<=now)handle(duel.turn,{type:'attack',skill:'basic'});
 broadcast({type:'snapshot',online:clients.size,maxClients,players:[...clients.values()].map(({id,scene,name,species,level,player,pet})=>({id,scene,name,species,level,player,pet})),...wildWorld.snapshot()});
},110);
const heartbeat=setInterval(()=>{
 for(const {socket} of clients.values()){
  if(!socket.isAlive){socket.terminate();continue;}
  socket.isAlive=false;socket.ping();
 }
},30_000);
function shutdown(){clearInterval(tick);clearInterval(heartbeat);for(const {socket} of clients.values())socket.terminate();wss.close();server.close();}
process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
server.listen(port,host,()=>{
 console.log('Pet Town multiplayer listening on '+host+':'+port+' · capacity '+maxClients);
 if(host==='0.0.0.0')for(const list of Object.values(networkInterfaces()))for(const nic of list||[])if(nic.family==='IPv4'&&!nic.internal)console.log('LAN: http://'+nic.address+':'+port+' (devices must reach this host)');
});
