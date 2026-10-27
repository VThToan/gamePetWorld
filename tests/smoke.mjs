import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { WORLD,SPAWN,PLAYER_DIRECTIONS,PET_DIRECTIONS,SKILLS } from '../src/config.js';
import { SOLIDS,FOREGROUND,PORTALS,PLAYER_RADIUS,PET_RADIUS,nearestPortal,isBlocked,moveWithCollisions } from '../src/world.js';
import { Battle } from '../src/battle.js';
import { fileURLToPath } from 'node:url';
import { dirname,resolve } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const asset=p=>assert(existsSync(resolve(root,p)),`Thiếu asset: ${p}`);
assert.deepEqual(WORLD,{width:1536,height:1024});
assert.deepEqual(PLAYER_DIRECTIONS,['east','south','west','north']);
assert.deepEqual(PET_DIRECTIONS,['east']);
assert.equal(SKILLS.length,3);
assert(!isBlocked(SPAWN.x,SPAWN.y,PLAYER_RADIUS),'Spawn người chơi nằm trong vật cản');
assert(!isBlocked(SPAWN.x-64,SPAWN.y+6,PET_RADIUS),'Spawn pet nằm trong vật cản');

// A roof's height is NOT a collision height. Both actor types can traverse
// ground behind buildings instead of colliding with an invisible box.
const openBehind=[
  ['phía sau cửa hàng',310,180], ['sau nhà nhỏ Tây',138,440],
  ['sau tiệm Tây Nam',300,677],['sau pet center',1197,415],
  ['sau nhà guild',1160,686],['đường ngang cửa hàng',298,310],
  ['bậc đài phun nước',760,609]
];
for(const [place,x,y] of openBehind)assert(!isBlocked(x,y,PLAYER_RADIUS),`Cần đi được: ${place}`);
for(const [name,x,y] of [
  ['tường thành',20,700],['tường shop',238,278],
  ['bệ đài phun nước',761,488],['bồn hoa đài phun',664,425],
  ['gốc cây',1411,555],['bảng thông báo',1121,251],
  ['mép tường nhà pet',1100,543],['mép tường tiệm Tây Nam',260,807]
])assert(isBlocked(x,y,PLAYER_RADIUS),`Phải bị chặn: ${name}`);

// Feet should come right up against the image-level contact, not stop on a roof.
const player={x:241,y:340};
moveWithCollisions(player,0,-130,PLAYER_RADIUS);
assert(player.y>=295&&player.y<=310,`Chân nhân vật cách móng shop: y=${player.y}`);
const beside={x:304,y:338};
moveWithCollisions(beside,0,-90,PLAYER_RADIUS);
assert(beside.y>240&&beside.y<300,`Cửa shop phải tiếp cận được: y=${beside.y}`);
assert.equal(nearestPortal(304,282,16)?.id,'orange-shop');
assert.equal(nearestPortal(1200,568,16)?.id,'pet-center');
assert.equal(nearestPortal(300,806,16)?.id,'southwest-shop');
assert.equal(nearestPortal(775,777,16),null);
assert(PORTALS.every(p=>p.insideMap.startsWith('interiors/')),'Door hooks need future interior destination');
assert(SOLIDS.length>=35&&FOREGROUND.length>=10);

// Collision substeps prevent tunneling through narrow feet-sized obstacles.
const wallRun={x:241,y:350};
moveWithCollisions(wallRun,0,-280,PLAYER_RADIUS);
assert(wallRun.y>295,'Nhân vật không xuyên vách khi chạy nhanh');

const b=new Battle();b.start(100,{playerSpeed:100,playerPet:{skills:['basic','fire']}});assert(b.active&&b.petHP===100&&b.enemyHP===100);
assert(b.useSkill('fire'));assert(b.enemyHP<100);
assert(!b.useSkill('moon'),'Skill cooldown enforced');b.update(.93);
assert(b.petHP<100);b.stop();assert.equal(b.active,false);
asset('assets/map.png');asset('assets/reference/player-sheet.png');asset('assets/reference/pet-sheet.png');
for(const dir of PLAYER_DIRECTIONS)for(let frame=0;frame<2;frame++)asset(`assets/player/${dir}_${frame}.png`);
asset('assets/pet/east.png');
for(const id of ['fire','moon','spirit'])asset(`assets/pet/skill_${id}.png`);
console.log('✅ PASS: 4 hướng chuẩn, pet lật ngang, nền móng thay mái nhà, cửa chờ map, va chạm chân, battle.');
