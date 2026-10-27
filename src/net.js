/** Same-origin multiplayer works over LAN HTTP and hosted HTTPS/WSS. */
export class NetClient {
 constructor(notify){this.notify=notify;this.id=null;this.players=[];this.connected=false;this.duel=null;this.wilds=[];this.wildBattles=[];this.wildFight=null;this.socket=null;this.lastMove=0;this.online=0;this.maxClients=64;this.retry=0;this.retryTimer=null;this.stopped=false;this.open();}
 open(){
  if(!('WebSocket' in window))return;
  const ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');this.socket=ws;
  ws.addEventListener('open',()=>{if(this.socket!==ws)return;this.retry=0;this.connected=true;this.lastMove=0;this.notify({type:'connection',online:true});});
  ws.addEventListener('close',()=>{
   if(this.socket!==ws)return;
   this.connected=false;this.id=null;this.players=[];this.duel=null;this.wilds=[];this.wildBattles=[];this.wildFight=null;this.online=0;
   this.notify({type:'connection',online:false});
   if(!this.stopped){const delay=Math.min(10000,500*2**Math.min(this.retry++,5));this.retryTimer=setTimeout(()=>this.open(),delay);}
  });
  ws.addEventListener('error',()=>{});
  ws.addEventListener('message',e=>{try{
   if(this.socket!==ws)return;
   const msg=JSON.parse(e.data);
   if(msg.type==='welcome'){this.id=msg.id;this.maxClients=msg.maxClients;}
   if(msg.type==='snapshot'){this.online=msg.online??msg.players.length;this.maxClients=msg.maxClients??this.maxClients;this.players=msg.players.filter(p=>p.id!==this.id);this.wilds=msg.wilds||[];this.wildBattles=msg.wildBattles||[];this.wildFight=this.wildBattles.find(f=>f.playerId===this.id&&f.phase==='fighting')||null;}
   if(msg.type==='duel')this.duel=msg.duel;
   if(msg.type==='duelEnd')this.duel=null;
   if(msg.type==='wildBattleStart'||msg.type==='wildBattleUpdate')this.wildFight=msg.fight;
   if(msg.type==='wildBattleEnd')this.wildFight=null;
   this.notify(msg);
  }catch(err){console.warn('Net message',err);}});
 }
 close(){this.stopped=true;clearTimeout(this.retryTimer);this.socket?.close();}
 send(obj){if(this.connected&&this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(obj));}
 update(player,pet,scene,species,level,name,extra={}){const now=performance.now();if(now-this.lastMove<85)return;this.lastMove=now;
  this.send({type:'move',player:{x:player.x,y:player.y,facing:player.facing,moving:player.moving,anim:player.anim},pet:{x:pet.x,y:pet.y,facing:pet.facing,moving:pet.moving,anim:pet.anim},scene,species,level,name,...extra});}
 challenge(id){this.send({type:'challenge',target:id});}
 respond(id,accept){this.send({type:'respond',from:id,accept});}
 attack(skill){this.send({type:'attack',skill});}
 surrender(){this.send({type:'surrender'});}
 wildStart(monsterId){this.send({type:'wildStart',monsterId});}
 wildAction(action,skill='basic'){this.send({type:'wildAction',action,skill});}
 ferry(destination){this.send({type:'ferry',destination});}
}
