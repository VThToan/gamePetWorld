import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {CITY_EXITS,OUTSKIRTS,INTERIORS,PORTALS,cityExitAt,isBlocked,isOutdoorScene,isInsideExit} from '../src/world.js';
import {PET_SPECIES,SKILL_LEVELS} from '../src/pet-data.js';
import {freshProgress,adoptPet,choosePet,gainPetXP,learnPetSkill,activePet} from '../src/gameplay.js';
assert.equal(CITY_EXITS.length,4);
for(const e of CITY_EXITS){assert.equal(cityExitAt(e.x+e.w/2,e.y+e.h/2)?.id,e.id);assert(isOutdoorScene('out-'+e.id));assert(OUTSKIRTS['out-'+e.id]);}
assert(PORTALS.filter(p=>p.enabled).length===2);
for(const p of PORTALS.filter(x=>x.enabled))assert(INTERIORS[p.id]);
for(const id of ['west-cottage','orange-shop']){const ex=INTERIORS[id].exit;assert(isInsideExit(id,ex.x+ex.w/2,ex.y+ex.h/2));}
for(const id of ['flame','ice','thunder','dragon','dino','tiger','pumpkin','bug'])assert(PET_SPECIES.some(p=>p.id===id));
assert.deepEqual(SKILL_LEVELS.slice(0,5).map(s=>s.level),[1,1,5,10,40]);assert.equal(SKILL_LEVELS.filter(s=>s.id.startsWith('elem-')).length,9);assert(SKILL_LEVELS.some(s=>s.id==='fury'));
const p=freshProgress();assert(adoptPet(p,'bug').ok);assert(choosePet(p,p.pets[1].id).ok);assert.equal(activePet(p).species,'bug');
assert(!learnPetSkill(p,'moon').ok,'Lv 1 should not learn Lv 5 skill');
for(let k=0;k<40;k++)gainPetXP(p,500);
assert(activePet(p).level>=10);assert(!learnPetSkill(p,'moon').ok);assert(learnPetSkill(p,'spirit').ok);
const port=58213;
const server=spawn(process.execPath,['dev-server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port)}});
let stderr='';server.stderr.on('data',d=>stderr+=d);
const sockets=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 for(let i=0;i<60;i++){try{const response=await fetch(`http://localhost:${port}/`);if(response.ok)break;}catch{}await sleep(60);}
 async function connect(){const sock=new WebSocket(`ws://localhost:${port}/ws`);sockets.push(sock);const messages=[];
  sock.addEventListener('message',e=>{messages.push(JSON.parse(e.data));});
  await new Promise((res,rej)=>{sock.addEventListener('open',res,{once:true});sock.addEventListener('error',rej,{once:true});});
  return {sock,messages};}
 const a=await connect(),b=await connect();
 async function waitFor(w,predicate,label){for(let i=0;i<80;i++){const found=w.messages.find(predicate);if(found)return found;await sleep(35);}throw Error('Timeout '+label+' '+JSON.stringify(w.messages));}
 const wa=await waitFor(a,x=>x.type==='welcome','welcome1'),wb=await waitFor(b,x=>x.type==='welcome','welcome2');assert.notEqual(wa.id,wb.id);
 const move=(who,x,y)=>who.sock.send(JSON.stringify({type:'move',scene:'city',player:{x,y,facing:'south',moving:false},pet:{x:x-30,y:y+10,facing:'east'},name:'Trainee',species:'flame',level:10,skills:['basic','fire']}));
 move(a,770,700);move(b,800,710);await sleep(120);
 a.sock.send(JSON.stringify({type:'challenge',target:wb.id}));await waitFor(b,x=>x.type==='challenge'&&x.from===wa.id,'challenge');
 b.sock.send(JSON.stringify({type:'respond',from:wa.id,accept:true}));
 const duel=await waitFor(a,x=>x.type==='duel','duel');assert.equal(duel.duel.turn,wa.id);
 a.sock.send(JSON.stringify({type:'attack',skill:'fire'}));const changed=await waitFor(b,x=>x.type==='duel'&&x.duel.hp[wb.id]<100,'attack');
 assert(changed.duel.hp[wb.id]<100);assert(changed.duel.mp[wa.id]<100);
 b.sock.send(JSON.stringify({type:'surrender'}));const win=await waitFor(a,x=>x.type==='duelEnd','surrender');assert.equal(win.winner,wa.id);
 console.log('✅ PASS: 4 thành môn, cờ pet, mốc kỹ năng, 2 WebSocket client, thách đấu, lượt, MP/HP, đầu hàng.');
}finally{for(const s of sockets)try{s.close();}catch{}server.kill('SIGTERM');}
