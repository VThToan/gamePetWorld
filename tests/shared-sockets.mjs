import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const port=58227;
const proc=spawn(process.execPath,['dev-server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port)}});
const sockets=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check,label,limit=4000){const start=Date.now();while(Date.now()-start<limit){const v=check();if(v)return v;await delay(30);}throw Error('Timeout '+label);}
async function open(){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);sockets.push(ws);const msgs=[];ws.addEventListener('message',e=>msgs.push(JSON.parse(e.data)));
 await new Promise((r,reject)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',reject,{once:true});});return {ws,msgs};}
try{
 await until(async()=>true,'noop',100);
 await until(()=>{try{return proc.exitCode!==null?'failed':true;}catch{return false;}},'server state');
 let ready=false;for(let i=0;i<80;i++){try{const res=await fetch(`http://127.0.0.1:${port}/`);if(res.ok){ready=true;break;}}catch{}await delay(60);}
 assert(ready,'HTTP server not ready');
 const a=await open(),b=await open();
 const wa=await until(()=>a.msgs.find(m=>m.type==='welcome'),'welcome1');const wb=await until(()=>b.msgs.find(m=>m.type==='welcome'),'welcome2');
 const sa=await until(()=>a.msgs.find(m=>m.type==='snapshot'&&m.wilds?.length),'snapshot1');
 const sb=await until(()=>b.msgs.find(m=>m.type==='snapshot'&&m.wilds?.length),'snapshot2');
 assert.deepEqual(sa.wilds,sb.wilds,'clients must observe identical wild monsters');
 assert.equal(sa.wilds.filter(w=>w.scene==='out-west').length,12);
 const chosen=sa.wilds.find(w=>w.scene==='out-west');
 const move=(who,x,y)=>who.ws.send(JSON.stringify({type:'move',scene:'out-west',player:{x,y,facing:'south'},pet:{x:x-30,y:y+12,facing:'east'},species:'flame',level:7,speed:32,petHP:100,petMP:100,skills:['basic','fury','fire'],name:'Tester',ballCount:3,potionCount:3}));
 move(a,chosen.x+34,chosen.y);move(b,chosen.x+38,chosen.y+6);await delay(150);
 a.ws.send(JSON.stringify({type:'wildStart',monsterId:chosen.id}));
 const begin=await until(()=>a.msgs.find(m=>m.type==='wildBattleStart'&&m.fight.monsterId===chosen.id),'battle start');
 const common=await until(()=>b.msgs.find(m=>m.type==='snapshot'&&m.wildBattles?.some(f=>f.monsterId===chosen.id)),'observer sees battle');
 assert.equal(common.wilds.find(m=>m.id===chosen.id).status,'battle');
 b.ws.send(JSON.stringify({type:'wildStart',monsterId:chosen.id}));
 const denied=await until(()=>b.msgs.find(m=>m.type==='notice'&&m.message.includes('Quái')),'battle lock');
 assert(denied);
 console.log('✅ PASS: 2 real WebSocket clients see identical monsters and observer sees shared battle/monster lock.');
}finally{for(const s of sockets)try{s.close();}catch{}proc.kill('SIGTERM');}
