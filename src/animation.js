/** Visual motion never changes feet positions, collision or gameplay timing. */
export function animationPhase(actor){
 const seed=String(actor.id||actor.npcId||actor.species||'actor');
 let hash=0;for(const char of seed)hash=(hash*31+char.charCodeAt(0))>>>0;
 return (hash%628)/100;
}
export function actorMotion(actor,time,{player=false,frames=2}={}){
 const phase=animationPhase(actor),moving=!!actor.moving;
 const step=(actor.anim||0)*Math.PI*7;
 return {
  frame:moving?Math.floor((actor.anim||0)*7)%frames:(!player&&frames>1?Math.floor(time*2+phase)%frames:frames===4?1:0),
  lift:moving?Math.abs(Math.sin(step))*(player?1.6:2.4):(Math.sin(time*2.6+phase)+1)*.65,
  stretch:moving?1:1+Math.sin(time*2.6+phase)*.012,
  tilt:!player&&moving?Math.sin(step)*.035:0,
 };
}
