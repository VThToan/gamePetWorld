import assert from 'node:assert/strict';
import {WORLD, SPAWN} from '../src/config.js';
import {CITY_EXITS,OUTSKIRTS,INTERIORS,PLAYER_RADIUS,isBlocked,getSceneDimensions,sceneTransferAt,moveWithCollisions,safeSceneSpawn,FERRY_ROUTES,nearestInteraction,getMapConfig} from '../src/world.js';

const STEP=12;
function nearbyStart(scene, pos){
  const a=Math.round(pos.x/STEP),b=Math.round(pos.y/STEP);
  for(let k=0;k<8;k++)for(let x=a-k;x<=a+k;x++)for(let y=b-k;y<=b+k;y++){
    if(Math.max(Math.abs(x-a),Math.abs(y-b))!==k)continue;
    if(!isBlocked(x*STEP,y*STEP,PLAYER_RADIUS,scene))return [x,y];
  }
  throw Error(`Blocked start ${scene} (${pos.x},${pos.y})`);
}
function pathTo(scene,start,zone){
  const size=getSceneDimensions(scene),W=Math.ceil(size.width/STEP)+1,H=Math.ceil(size.height/STEP)+1;
  const [sx,sy]=nearbyStart(scene,start);
  const queue=[sy*W+sx];const prev=new Int32Array(W*H);prev.fill(-1);prev[queue[0]]=queue[0];
  let found=-1;
  for(let head=0;head<queue.length;head++){
    const i=queue[head],x=i%W,y=Math.floor(i/W),px=x*STEP,py=y*STEP;
    if(px>=zone.x&&px<=zone.x+zone.w&&py>=zone.y&&py<=zone.y+zone.h){found=i;break;}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;if(nx<=0||nx>=W-1||ny<=0||ny>=H-1)continue;
      const ni=ny*W+nx;if(prev[ni]!==-1)continue;
      if(isBlocked(nx*STEP,ny*STEP,PLAYER_RADIUS,scene))continue;
      // Physical movement cannot tunnel across a thin wall.
      const a={x:px,y:py};const delta=moveWithCollisions(a,dx*STEP,dy*STEP,PLAYER_RADIUS,scene);
      if(Math.hypot(delta.dx,delta.dy)<STEP-.5)continue;
      prev[ni]=i;queue.push(ni);
    }
  }
  if(found===-1)return {found:false,examined:queue.length};
  const path=[];for(let n=found;n!==queue[0];n=prev[n])path.push({x:(n%W)*STEP,y:Math.floor(n/W)*STEP});
  path.push({x:sx*STEP,y:sy*STEP});path.reverse();
  return {found:true,examined:queue.length,steps:path.length,path};
}
const scenes={city:{spawn:SPAWN,exits:CITY_EXITS},...Object.fromEntries(Object.entries({...OUTSKIRTS,...INTERIORS}).map(([id,cfg])=>[id,{spawn:cfg.spawn,exits:[...(cfg.exits||[]),...(cfg.exit?[cfg.exit]:[])],room:cfg}]))};
for(const [scene,cfg] of Object.entries(scenes)){
  const {spawn,exits}=cfg;
  assert(!isBlocked(spawn.x,spawn.y,PLAYER_RADIUS,scene),`${scene} spawn is inside collision: ${JSON.stringify(spawn)}`);
  const safe=safeSceneSpawn(scene,spawn);assert.deepEqual(safe,spawn,`${scene} authored spawn should be safe`);
  for(const ex of exits){
    const name=ex.id||'interior',point={x:ex.x+ex.w/2,y:ex.y+ex.h/2};
    assert(!isBlocked(point.x,point.y,PLAYER_RADIUS,scene),`${scene}/${name} exit blocked: ${JSON.stringify(point)}`);
    assert(sceneTransferAt(scene,point.x,point.y),`${scene}/${name} missing scene transfer handler`);
    const result=pathTo(scene,spawn,ex);
    assert(result.found,`${scene}/${name} inaccessible from spawn, explored ${result.examined} steps`);
    console.log(`PASS ${scene} -> ${name}: ${result.steps} navigation steps`);
  }
}
// Regression: mine doorway is a real route; from South Village it MUST be accessible by walking.
const mine=OUTSKIRTS['out-west-south'].exits.find(e=>e.id==='mine');
assert.equal(sceneTransferAt('out-west-south',mine.x+mine.w/2,mine.y+mine.h/2)?.to,'mine-tunnel');
assert.equal(sceneTransferAt('mine-tunnel',480,140)?.to,'out-west-south');
// Every return spawn must be reachable and must not trigger an instant re-entry.
for(const [scene,cfg] of Object.entries(scenes))for(const exit of cfg.exits){
  if(!exit.returnAt)continue;
  const destination=exit.to||'city';
  assert(!isBlocked(exit.returnAt.x,exit.returnAt.y,PLAYER_RADIUS,destination),`Unsafe return position from ${scene}/${exit.id}: ${JSON.stringify(exit.returnAt)}`);
  assert(!sceneTransferAt(destination,exit.returnAt.x,exit.returnAt.y),`Return point immediately re-triggers exit from ${scene}/${exit.id}`);
}
// Each alternate arrival (returnAt) must be able to move on the target map,
// not merely occupy a nominally free pixel.
for(const [source,cfg] of Object.entries(scenes))for(const exit of cfg.exits){
  if(!exit.returnAt)continue;
  const destination=exit.to||'city', destCfg=scenes[destination];
  const goal=destCfg.exits.find(e=>e.id!=='exit')||destCfg.exits[0];
  if(!goal)continue;
  const path=pathTo(destination,exit.returnAt,goal);
  assert(path.found,`${source} arrival -> ${destination} is cut off from exits; explored ${path.examined}`);
  console.log(`PASS arrival from ${source} to ${destination}: ${path.steps} navigation steps`);
}
// Intentional trapped position should be recovered by the safe-spawn fallback.
const recovered=safeSceneSpawn('out-west',{x:1200,y:602});
assert(!isBlocked(recovered.x,recovered.y,PLAYER_RADIUS,'out-west'));
console.log('✅ PASS: All map arrivals, scene exits, return points, actual walkable routes, and mine round-trip.');
assert.equal(sceneTransferAt('out-west-south',1512,618).to,'out-harbor');
assert.equal(sceneTransferAt('out-harbor',40,548).to,'out-west-south');
for(const [scene,routes] of Object.entries(FERRY_ROUTES)){
 const npc=(scene==='city'?{x:1370,y:660}:OUTSKIRTS[scene].npc.find(n=>n.id==='ferryman'));
 const approach={x:npc.x-18,y:npc.y+42,w:36,h:28};
 assert(pathTo(scene,scenes[scene].spawn,approach).found,`${scene}: ferry NPC must be reachable from entrance`);
 for(const route of routes){
  assert(!isBlocked(route.spawn.x,route.spawn.y,PLAYER_RADIUS,route.to));
  assert(!sceneTransferAt(route.to,route.spawn.x,route.spawn.y));
  assert.equal(nearestInteraction(route.to,route.spawn.x,route.spawn.y)?.id,'ferryman','Arrival must allow return ferry');
  assert(pathTo(route.to,route.spawn,scenes[route.to].exits[0]).found,'Ferry arrival must connect to walking exit');
 }
}
for(const [x,y] of [[1300,300],[1300,700],[1140,100],[1190,600],[950,560]])assert(isBlocked(x,y,PLAYER_RADIUS,'out-harbor'),'Water and statue are solid');
assert.equal(getMapConfig('out-harbor').image,'assets/out-harbor.png');
console.log('✅ PASS: Harbor round-trip, ferry approaches, safe arrivals, return journeys, water/statue collision and minimap.');
