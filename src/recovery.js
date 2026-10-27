import {REVIIVE_MS,REST_STILL_MS,REST_TICK_MS,REST_AMOUNT} from './wild-data.js';
/** Persisted timestamps survive a page refresh. No HP/MP regen while in battle. */
export function tickRecovery(pet,{now=Date.now(),idleMs=0,rest=false,inCity=false,inBattle=false}={}){
 if(!pet||inBattle)return {changed:false,event:null};
 let changed=false,event=null;
 if(pet.hp<=0){
  if(!pet.faintedAt){pet.faintedAt=now;changed=true;}
  if(now-pet.faintedAt>=REVIIVE_MS){pet.hp=10;pet.mp=Math.max(10,pet.mp||0);pet.faintedAt=0;pet.lastRegenAt=now;changed=true;event='revive';}
  return {changed,event};
 }
 if(pet.faintedAt){pet.faintedAt=0;changed=true;}
 if(!rest&&!inCity&&idleMs<REST_STILL_MS){pet.lastRegenAt=now;return {changed,event};}
 if(!pet.lastRegenAt){pet.lastRegenAt=now;return {changed:true,event:null};}
 const ticks=Math.min(1,Math.floor((now-pet.lastRegenAt)/REST_TICK_MS));
 if(ticks>0){pet.lastRegenAt+=ticks*REST_TICK_MS;const h=pet.hp,m=pet.mp;
  pet.hp=Math.min(100,h+REST_AMOUNT*ticks);pet.mp=Math.min(100,m+REST_AMOUNT*ticks);
  changed=true;event=(pet.hp!==h||pet.mp!==m)?'regen':null;
 }
 return {changed,event};
}
