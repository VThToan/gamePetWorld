import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {
 INTERIORS, PORTALS, CITY_INTERACTIONS,nearestInteraction,nearestPortal,
 isBlocked,moveWithCollisions,isInsideExit,getSceneDimensions
} from '../src/world.js';
import {BAG_CAPACITY,freshProgress,activePet,buy,usePotion,healTeam,storePet,withdrawPet,testCatchPet,acceptQuest} from '../src/gameplay.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
for(const [scene,room] of Object.entries(INTERIORS)){
 const fileName=room.image==='interior_west'?'west.png':room.image==='interior_shop'?'shop.png':room.image==='interior_mine'?'mine.png':'shop.png';
 assert(existsSync(resolve(root,`assets/interiors/${fileName}`)),`missing scene ${scene}`);
 assert.deepEqual(getSceneDimensions(scene),{width:room.width,height:room.height});
 assert(!isBlocked(room.spawn.x,room.spawn.y,10,scene),`${scene}: interior spawn blocked`);
 assert(isInsideExit(scene,room.exit.x+room.exit.w/2,room.exit.y+room.exit.h/2));
 if(room.npc.length){
  for(const npc of room.npc){
   assert.equal(nearestInteraction(scene,npc.x,npc.y)?.id,npc.id,`NPC mismatch ${npc.id}`);
  }
 }
}
// Store: approach NPCs from player side of counters.
assert.equal(nearestInteraction('orange-shop',421,780)?.id,'items');
assert.equal(nearestInteraction('orange-shop',509,780)?.id,'storage');
assert.equal(nearestInteraction('orange-shop',166,487)?.id,'evolution');
assert(isBlocked(421,650,10,'orange-shop'),'shop counter must block movement');
assert(!isBlocked(421,771,10,'orange-shop'),'player must reach shop NPC counter');
assert(!isBlocked(166,489,10,'orange-shop'),'player must reach ingredients counter');
assert(!isBlocked(275,835,10,'west-cottage'),'west interior doorway must be walkable');
assert(!isBlocked(465,416,10,'west-cottage'),'elder NPC conversation zone walkable');
assert(isBlocked(430,183,10,'west-cottage'),'fireplace blocks feet');
// Town MAGIC has a walkable approach; no transfer portal there.
assert.equal(nearestInteraction('city',1177,841)?.id,'magic');
assert(!isBlocked(1177,841,10,'city'),'MAGIC entrance blocked');
assert(CITY_INTERACTIONS.filter(x=>x.id==='quests').length>=2);
assert.equal(nearestInteraction('city',1137,290)?.id,'quests');
assert.equal(nearestInteraction('city',1341,300)?.id,'quests');
assert(!PORTALS.some(p=>p.id==='magic'||p.id==='guild'), 'MAGIC should not transfer scenes');
assert(INTERIORS[nearestPortal(300,307)?.id]?.id==='orange-shop');
assert(INTERIORS[nearestPortal(142,588)?.id]?.id==='west-cottage');
// NPC transactions, pet overflow, storage and restoration.
const p=freshProgress();assert.equal(p.coins,250);
assert(buy(p,'potion').ok);assert.equal(p.coins,220);assert.equal(p.items.potion,3);
p.pets[0].hp=20;assert(usePotion(p).ok);assert.equal(p.pets[0].hp,60);
assert(healTeam(p).ok);assert.equal(activePet(p).hp,100);
for(let i=0;i<BAG_CAPACITY;i++)assert(testCatchPet(p).ok);
assert.equal(p.pets.length,BAG_CAPACITY);assert.equal(p.storage.length,1);
assert(!withdrawPet(p,p.storage[0].id).ok,'full bag cannot withdraw');
assert(storePet(p,p.pets[1].id).ok);assert.equal(p.pets.length,2);
assert(withdrawPet(p,p.storage[0].id).ok);assert.equal(p.pets.length,3);
assert(acceptQuest(p).ok);assert(!acceptQuest(p).ok);assert(p.quest.accepted);
// Collision stairs/threshold and corner sliding still obey feet-only geometry.
const actor={x:421,y:763};moveWithCollisions(actor,0,-80,10,'orange-shop');assert(actor.y>=748);
console.log('✅ PASS: 2 nội thất, NPC, ngưỡng thoát, MAGIC đi tới được, bảng nhiệm vụ, mua đồ, lưu trữ/hồi pet.');
