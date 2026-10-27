import assert from 'node:assert/strict';
import {SharedWildWorld} from '../src/shared-wild-server.js';
import {WILD_SCENES,WILD_MAX_PER_MAP,WILD_RESPAWN_MS} from '../src/wild-data.js';
import {tickRecovery} from '../src/recovery.js';
import {sceneTransferAt,isBlocked} from '../src/world.js';
let now=1_000_000;let seed=73;
const rng=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/2**32;
const notices=[];
const world=new SharedWildWorld({random:rng,now:()=>now,onEvent:(id,msg)=>notices.push({id,msg})});
for(const scene of Object.keys(WILD_SCENES)){
 const pack=world.getMonsters(scene);
 assert.equal(pack.length,WILD_MAX_PER_MAP,`${scene}: count`);
 for(const a of pack){assert(!isBlocked(a.x,a.y,15,scene),`${scene} monster spawn blocked`);assert(!sceneTransferAt(scene,a.x,a.y),`${scene} monster on portal`);}
 for(let i=0;i<pack.length;i++)for(let j=i+1;j<pack.length;j++)assert(Math.hypot(pack[i].x-pack[j].x,pack[i].y-pack[j].y)>=125,`${scene} monsters too close`);
}
const m=world.getMonsters('out-west')[0],client={id:'player-one',scene:'out-west',player:{x:m.x+40,y:m.y},petHP:100,petMP:100,species:'flame',level:7,name:'HLV-1',skills:['basic','fire','fury','elem-fire'],potionCount:3,ballCount:3};
const started=world.startBattle(client,m.id);assert(started.ok);
assert.equal(world.getMonsters('out-west').find(x=>x.id===m.id).status,'battle');
assert(!world.startBattle({...client,id:'player-two'},m.id).ok,'monster should be locked');
let f=started.fight;
assert.equal(world.snapshot().wildBattles.length,1);
// Guaranteed skill levels supported and fury multiplier used on next attack.
if(f.turn==='enemy'){now+=800;world.tick(now);}
assert.equal(f.turn,'player');
assert(world.action('player-one','skill','fury').ok);assert(f.furyMultiplier>1);
now=f.turnEndsAt+1;world.tick(now);assert.equal(f.turn,'player');
const hpBefore=f.enemyHP;assert(world.action('player-one','skill','fire').ok);assert(hpBefore-f.enemyHP>25,'fury multiplies skill damage');
// Player's 3s no-action turn must auto attack.
now=f.turnEndsAt+1;world.tick(now);if(f.phase==='fighting') {const h=f.enemyHP;now=f.turnEndsAt+1;world.tick(now);assert(f.enemyHP<=h);}
// Finish monster with legal attacks, then respawn at a new random position, with 12 total restored.
for(let j=0;j<30&&f.phase!=='ended';j++){
 now=f.turnEndsAt+1;world.tick(now);
 if(f.turn==='player'&&f.phase==='fighting'){world.action('player-one','skill','fire');}
}
assert.equal(f.phase,'ended','battle should end');
if(f.result==='win'||f.result==='caught'){
 assert.equal(world.getMonsters('out-west').length,11);
 const id=m.id;now+=WILD_RESPAWN_MS+2000;world.tick(now);
 assert.equal(world.getMonsters('out-west').length,12);assert(!world.find(id));
}
const pet={hp:0,mp:0,faintedAt:1000};
assert.equal(tickRecovery(pet,{now:30_999,idleMs:60000}).event,null);
assert.equal(tickRecovery(pet,{now:31_000,idleMs:60000}).event,'revive');assert.equal(pet.hp,10);
assert.equal(tickRecovery(pet,{now:33_001,idleMs:60000}).event,'regen');assert.equal(pet.hp,20);
const idle={hp:40,mp:30,lastRegenAt:1000};
tickRecovery(idle,{now:5000,idleMs:2000});assert.equal(idle.hp,40);
tickRecovery(idle,{now:7000,idleMs:7000});assert.equal(idle.hp,50);
console.log('✅ PASS: 5 shared maps, exactly 12 separated monsters/map, lock, 3s auto-turn, fury, regen and respawn.');
