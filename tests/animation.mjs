import assert from 'node:assert/strict';
import {SharedWildWorld} from '../src/shared-wild-server.js';
import {actorMotion} from '../src/animation.js';
import {isFoliagePixel} from '../src/occlusion.js';

let now=10_000;
const world=new SharedWildWorld({now:()=>now});
const monster=world.getMonsters('out-west')[0];
const original={x:monster.x,y:monster.y,facing:monster.facing};
now=monster.nextTurnAt-1;world.tick(now);
assert.equal(monster.facing,original.facing,'Monster should not turn before its scheduled time');
now++;world.tick(now);
assert.notEqual(monster.facing,original.facing,'Idle monster should alternate facing');
assert.deepEqual({x:monster.x,y:monster.y},{x:original.x,y:original.y},'Visual turns must preserve spawn separation and collision');
const client={id:'animation-player',scene:monster.scene,player:{x:monster.x-30,y:monster.y},species:'flame',level:100,petHP:100,petMP:100,skills:['basic']};
assert(world.startBattle(client,monster.id).ok);
assert.equal(monster.facing,'west','Locked monster must face its opponent');
monster.nextTurnAt=now+100;now+=101;world.tick(now);
assert.equal(monster.facing,'west','Idle turn timer must not run during battle');
world.disconnect(client.id);world.tick(now);
assert.equal(monster.facing,'east','Idle animation must resume after the fight is released');
for(const actor of [{id:'trainer',x:30,y:50},{id:'npc-elder',x:70,y:100},{id:'wild-one',species:'bug',x:100,y:120}]){
 const before=JSON.stringify(actor);
 const samples=[0,.3,.7,1.2].map(time=>actorMotion(actor,time));
 assert(new Set(samples.map(m=>m.lift)).size>1,'Idle pose must breathe');
 assert(samples.every(m=>m.lift>=0&&m.lift<=1.3&&m.stretch>.98&&m.stretch<1.02),'Idle motion must stay subtle');
 assert.equal(JSON.stringify(actor),before,'Drawing must not move colliders or network positions');
}
assert(!isFoliagePixel(214,182,128),'Dirt path must never become tree foreground');
assert(!isFoliagePixel(229,216,199),'Town pavement must never become tree foreground');
assert(isFoliagePixel(3,108,73),'Dark foliage remains in the tree mask');
console.log('✅ PASS: synchronized idle turns, battle-facing lock, fixed feet, breathing and transparent ground masks.');
