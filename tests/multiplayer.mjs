import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {networkInterfaces} from 'node:os';
import {once} from 'node:events';
import {WebSocket as TestSocket} from 'ws';

const port=58241,base=`http://127.0.0.1:${port}`;
const proc=spawn(process.execPath,['dev-server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,HOST:'0.0.0.0',PORT:String(port),MAX_CLIENTS:'8'}});
let stderr='';proc.stderr.on('data',data=>stderr+=data);
const clients=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check,label){
 for(let i=0;i<160;i++){const result=await check();if(result)return result;await sleep(25);}
 throw Error(`Timeout: ${label}; server stderr: ${stderr}`);
}
async function connect(host='127.0.0.1'){
 const socket=new WebSocket(`ws://${host}:${port}/ws`),messages=[];
 const client={socket,messages,send:message=>socket.send(JSON.stringify(message))};clients.push(client);
 socket.addEventListener('message',event=>messages.push(JSON.parse(event.data)));
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 client.id=(await wait(client,m=>m.type==='welcome','welcome')).id;
 return client;
}
const wait=(c,p,label)=>until(()=>c.messages.find(p),label);
const move=(c,scene,x,y)=>c.send({type:'move',scene,player:{x,y,facing:'south'},pet:{x:x-40,y:y+12,facing:'east'},species:'flame',level:10,speed:32,skills:['basic','fire'],petHP:100,petMP:100});
async function duel(a,b){
 a.send({type:'challenge',target:b.id});await wait(b,m=>m.type==='challenge'&&m.from===a.id,'invitation');
 b.send({type:'respond',from:a.id,accept:true});
 return wait(a,m=>m.type==='duel','duel starts');
}
try{
 await until(async()=>{if(proc.exitCode!==null)throw Error(stderr);try{return (await fetch(base+'/health')).ok;}catch{return false;}},'startup');
 for(const path of ['/', '/src/main.js','/assets/out-harbor.png'])assert((await fetch(base+path)).ok);
 for(const path of ['/.git/config','/package.json','/dev-server.mjs','/node_modules/ws/package.json','/src/../.git/config'])assert((await fetch(base+path)).status>=400,`${path} must not be public`);
 assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
 const lan=Object.values(networkInterfaces()).flat().find(n=>n?.family==='IPv4'&&!n.internal)?.address;
 for(let i=0;i<8;i++)await connect(i===7&&lan?lan:'127.0.0.1');
 const [a,b,c,d,e,f,g,h]=clients;
 await wait(a,m=>m.type==='snapshot'&&m.players.length===8,'eight shared clients');
 assert.equal((await (await fetch(base+'/health')).json()).players,8);
 const ninth=new WebSocket(`ws://127.0.0.1:${port}/ws`);
 await new Promise(resolve=>ninth.addEventListener('error',resolve,{once:true}));
 ninth.close();
 for(const [i,client] of clients.entries())move(client,'city',770+i*8,700);
 await sleep(140);
 const first=await duel(a,b),second=await duel(c,d);
 assert.notDeepEqual(first.duel.players,second.duel.players);
 a.send({type:'attack',skill:'fire'});c.send({type:'attack',skill:'fire'});
 await wait(b,m=>m.type==='duel'&&m.duel.hp[b.id]<100,'first duel damage');
 await wait(d,m=>m.type==='duel'&&m.duel.hp[d.id]<100,'second duel damage');
 assert(!e.messages.some(m=>m.type==='duel'),'Duels must be private to participants');
 const snapshot=await wait(e,m=>m.type==='snapshot'&&m.wilds?.length===60,'shared wild world');
 const monsters=snapshot.wilds.filter(m=>m.scene==='out-west');
 move(e,'out-west',monsters[0].x+30,monsters[0].y);move(f,'out-west',monsters[1].x+30,monsters[1].y);move(g,'out-west',monsters[0].x+35,monsters[0].y);
 await sleep(140);
 e.send({type:'wildStart',monsterId:monsters[0].id});f.send({type:'wildStart',monsterId:monsters[1].id});
 await wait(e,m=>m.type==='wildBattleStart','first parallel PvE');await wait(f,m=>m.type==='wildBattleStart','second parallel PvE');
 g.send({type:'wildStart',monsterId:monsters[0].id});await wait(g,m=>m.type==='notice'&&m.message.includes('Quái'),'shared monster lock');
 h.send({type:'ferry',destination:'out-harbor'});await wait(h,m=>m.type==='notice'&&m.message.includes('lái đò'),'reject distant ferry');
 assert(!h.messages.some(m=>m.type==='travel'));
 move(h,'out-harbor',1130,344);await sleep(140);
 h.send({type:'ferry',destination:'city'});
 const trip=await wait(h,m=>m.type==='travel'&&m.scene==='city','ferry to town');
 await wait(g,m=>m.type==='snapshot'&&m.players.some(p=>p.id===h.id&&p.scene==='city'&&p.player.x===trip.spawn.x),'other players observe ferry');
 h.send({type:'ferry',destination:'out-harbor'});await wait(h,m=>m.type==='travel'&&m.scene==='out-harbor','return ferry');
 h.send({type:'ferry',destination:'mine-tunnel'});await sleep(140);
 assert.equal(h.messages.filter(m=>m.type==='travel').length,2,'Unknown destination must be rejected');
 e.send({type:'ferry',destination:'city'});await wait(e,m=>m.type==='notice'&&m.message.includes('lái đò'),'reject ferry during PvE');
 a.socket.close();await wait(b,m=>m.type==='duelEnd'&&m.winner===b.id,'disconnect resolves only its duel');
 assert(!c.messages.some(m=>m.type==='duelEnd'),'Other duel must remain active');
 c.send({type:'surrender'});await wait(d,m=>m.type==='duelEnd'&&m.winner===d.id,'independent surrender');
 e.socket.close();await until(async()=> (await (await fetch(base+'/health')).json()).players===6,'disconnect cleanup');
 g.send({type:'wildStart',monsterId:monsters[0].id});await wait(g,m=>m.type==='wildBattleStart','disconnect releases wild monster');
 const replacement=await connect();assert(replacement.id!==a.id);
 const foreign=new TestSocket(`ws://127.0.0.1:${port}/ws`,{origin:'https://unrelated.example'});
 await new Promise(resolve=>foreign.once('error',resolve));foreign.close();
 replacement.send({type:'move',scene:'__proto__',player:{x:1,y:1}});replacement.socket.send('{broken json');
 assert((await fetch(base+'/health')).ok,'Malformed input must not crash server');
 console.log(`✅ PASS: 8 clients${lan?' including LAN-address connection':''}, capacity/rejoin, 2 independent PvP + 2 PvE, monster lock/cleanup, validated two-way ferry, public files and origin checks.`);
}finally{
 for(const client of clients)client.socket.close();
 const exited=once(proc,'exit');proc.kill('SIGTERM');await exited;
}
