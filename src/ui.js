import { CATALOG,BAG_CAPACITY,activePet,buy,usePotion,healTeam,storePet,withdrawPet,testCatchPet,acceptQuest,saveProgress } from './gameplay.js';
import { SKILLS } from './config.js';
import { PET_SPECIES,SKILL_LEVELS,getFreePetMode,PET_TEST_FLAG_STORAGE_KEY,speciesById,skillCompatible } from './pet-data.js';
import { adoptPet,choosePet,gainPetXP,learnPetSkill,upgradeSkillRank,petStats } from './gameplay.js';
import { getMapConfig } from './world.js';
const $=(selector)=>document.querySelector(selector);
const escapeHTML=(text)=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function renderMenuMap(scene){
 const map=getMapConfig(scene);
 const markers=(map.markers||[]).map(m=>{
   const x=(m.x/map.width*100).toFixed(2),y=(m.y/map.height*100).toFixed(2);
   return `<button class="menu-map-marker ${m.axis==='v'?'vertical':''}" title="${escapeHTML(m.label)}" style="left:${x}%;top:${y}%;" aria-label="${escapeHTML(m.label)}">-</button>`;
 }).join('');
 const hotspots=(map.hotspots||[]).map(h=>{
   const left=(h.x/map.width*100).toFixed(2),top=(h.y/map.height*100).toFixed(2),width=(h.w/map.width*100).toFixed(2),height=(h.h/map.height*100).toFixed(2);
   return `<div class="menu-map-hotspot" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%;" title="${escapeHTML(h.label)}" aria-label="${escapeHTML(h.label)}"></div>`;
 }).join('');
 return `<div class="menu-map-title"><strong>${escapeHTML(map.title)}</strong><span>Chỉ các nơi đi được / đi vào được mới có dấu "-". Di chuột lên vùng công trình để xem tên.</span></div>`+
 `<div class="menu-map-shell"><img class="minimap" src="${map.image}" alt="${escapeHTML(map.title)}"><div class="menu-map-overlay">${hotspots}${markers}</div></div>`+
 `<p class="small-copy">Dấu "-" chỉ hiện trong phần bản đồ của menu, không hiện trên giao diện chơi chính. Các cổng đỏ trên màn chơi đã được dời sát cuối mép map theo yêu cầu.</p>`;
}

export function createGameUI(progress,openSettings,getScene=()=> 'city'){
 const backdrop=$('#menu-shade'),menu=$('#quick-menu'),panel=$('#game-panel'),content=$('#game-panel-content');
 let current=null,showMenu=false,message='',selectedPetId=progress.activePet;
 const persist=()=>saveProgress(progress);
 const isOpen=()=>showMenu||!!current;
 const close=()=>{current=null;showMenu=false;menu.hidden=true;panel.hidden=true;backdrop.hidden=true;message='';};
 const openMenu=()=>{if(showMenu){close();return;}showMenu=true;current=null;menu.hidden=false;panel.hidden=true;backdrop.hidden=false;};
 const open=(name)=>{showMenu=false;menu.hidden=true;backdrop.hidden=false;panel.hidden=false;current=name;message='';render();};
 const heading=(title,subtitle)=>`<div class="panel-title"><div><h2>${title}</h2><p>${subtitle}</p></div><button data-action="close" aria-label="Đóng bảng">✕</button></div>`;
 const notice=()=>message?`<p class="feedback" role="status">${escapeHTML(message)}</p>`:'';
 function render(){
  let html='';const pet=activePet(progress);const wallet=`<span class="wallet">🪙 ${progress.coins} xu</span>`;
  switch(current){
   case 'pets':{
    const currentPet=[...progress.pets,...progress.storage].find(p=>p.id===selectedPetId)||pet;
    const species=speciesById(currentPet?.species),stats=petStats(currentPet);
    html=heading('🐾 Đội hình & thông tin Pet','Chọn pet xuất chiến, quan sát chỉ số và kỹ năng')+
    `<div class="pet-details"><img src="assets/pet-catalog/${species.id}_0.png" alt="${escapeHTML(species.name)}"><div><h3>${escapeHTML(currentPet?.name||'Chưa có Pet')} <span class="rarity">${species.rarity}</span></h3>`+
    `<p>Lv.${stats.level} · ${escapeHTML(species.element)} · EXP ${currentPet?.exp||0}/${stats.level*50}</p><p>❤️ HP ${stats.hp}/${stats.maxHp}</p><div class="hpbar"><span style="width:${stats.hp/stats.maxHp*100}%"></span></div><p>💠 MP ${stats.mp}/${stats.maxMp} · ⚔ Công ${stats.attack} · 🛡 Giáp ${stats.defense}</p><p>💨 Tốc độ ${stats.speed} · 🎯 Chí mạng ${(stats.crit*100).toFixed(1)}%</p>`+
    `<p>Kỹ năng đã học: ${(currentPet?.skills||[]).map(id=>SKILL_LEVELS.find(s=>s.id===id)?.name||id).join(' · ')||'Chưa có'}</p>`+
    `<button data-action="choose-pet" data-id="${escapeHTML(currentPet?.id||'')}" ${progress.activePet===currentPet?.id?'disabled':''}>${progress.activePet===currentPet?.id?'✓ Đang đồng hành':'Chọn ra trận'}</button></div></div>`+
    `<div class="pet-roster">${[...progress.pets,...progress.storage].map(t=>{const sp=speciesById(t.species);return `<button class="pet-tile" data-action="show-pet" data-id="${escapeHTML(t.id)}" data-active="${t.id===selectedPetId}"><img src="assets/pet-catalog/${sp.id}_0.png"><strong>${escapeHTML(t.name)}</strong><small>Lv.${t.level} · ${progress.storage.some(q=>q.id===t.id)?'Trong kho':'Đội hình'}</small></button>`;}).join('')}</div>`+
    `<p class="small-copy">Bản thử nghiệm: dùng nút nhận EXP để kiểm tra các mốc cấp 1 / 5 / 10 / 40; cân bằng cấp độ sẽ cập nhật sau.</p><button class="testing-button" data-action="xp">+35 EXP kiểm thử</button>`;
    }break;
   case 'pet-shop':{
    const free=getFreePetMode();
    html=heading('🏷️ Cửa hàng Pet','NPC trước hòm thư xanh gần bảng nhiệm vụ')+wallet+
    `<label class="toggle-inline"><input type="checkbox" id="free-pets-switch" ${free?'checked':''}> <strong>FREE_PET_TEST_MODE</strong> — ${free?'Nhận miễn phí để test':'Mua bằng xu'}</label>`+
    `<p class="small-copy">Giá gốc: Thường → Ít gặp → Hiếm → Huyền thoại. Pet thứ 4 trở đi sẽ vào kho lưu trữ nếu đội đủ 3.</p>`+
    `<div class="pet-roster">${PET_SPECIES.map(sp=>`<div class="pet-tile"><img src="assets/pet-catalog/${sp.id}_0.png"><strong>${escapeHTML(sp.name)}</strong><span class="rarity">${sp.rarity}</span><small>${free?'Miễn phí':`${sp.price} xu`}</small><button data-action="adopt" data-id="${sp.id}">${free?'Nhận Pet':'Mua Pet'}</button></div>`).join('')}</div>`;
    }break;
   case 'quests':
    html=heading('📜 Nhiệm vụ mỗi ngày','Bảng nhiệm vụ trên thành trì · phiên bản thử nghiệm')+wallet+
    `<div class="module-card"><h3>Nhiệm vụ ngày — đang chuẩn bị</h3><p>Hệ thống đã có thao tác nhận nhiệm vụ; danh sách mục tiêu, điều kiện hoàn thành và phần thưởng sẽ cập nhật khi có dữ liệu.</p><p class="tag-line">Trạng thái: <b>${progress.quest.accepted?'Đã nhận nhiệm vụ demo':'Chưa nhận'}</b></p><div class="panel-buttons"><button data-action="accept-quest" ${progress.quest.accepted?'disabled':''}>${progress.quest.accepted?'✓ Đã nhận':'Nhận nhiệm vụ (demo)'}</button><button disabled title="Chưa có điều kiện và phần thưởng">🎁 Nhận thưởng (chưa mở)</button></div></div>`;
    break;
   case 'map':
    html=heading('🗺️ Bản đồ','Xem các vị trí đi được trong scene hiện tại')+renderMenuMap(getScene());
    break;
   case 'bag':
    html=heading('🎒 Ba lô','Vật phẩm đang sở hữu · dữ liệu lưu trong trình duyệt')+wallet+
    `<div class="module-card"><h3>Đội pet (${progress.pets.length}/${BAG_CAPACITY})</h3>${progress.pets.map(a=>`<p>🐾 ${escapeHTML(a.name)} — ${a.hp}/100 HP</p>`).join('')||'Trống'}</div>`+
    `<div class="item-list">${Object.entries(CATALOG).map(([id,it])=>`<div class="item-row"><div><strong>${escapeHTML(it.label)} × ${progress.items[id]||0}</strong><small>${escapeHTML(it.detail)}</small></div>${id==='potion'?'<button data-action="use-potion">Sử dụng</button>':''}</div>`).join('')}</div>`;
    break;
   case 'shop':case 'items':case 'evolution':{
    const evo=current==='evolution';
    html=heading(evo?'✨ Quầy tiến hóa':'🛍️ Thương điểm',evo?'NPC vàng · Bán nguyên liệu tiến hóa':'NPC tóc đen · Hồi phục và Poke Ball')+wallet+
    `<p class="small-copy">Giao dịch bằng xu thử nghiệm. Bình hồi phục và Poke Ball đã có thể dùng trong chiến đấu; tiến hóa sẽ cập nhật sau.</p>`+
    `<div class="item-list">${(evo?['crystal']:['potion','ball']).map(id=>{const it=CATALOG[id];return `<div class="item-row"><div><strong>${escapeHTML(it.label)}</strong><small>${escapeHTML(it.detail)} · Đang có: ${progress.items[id]||0}</small></div><button data-action="buy" data-id="${id}">Mua · ${it.price} xu</button></div>`;}).join('')}</div>`;
    }break;
   case 'storage':
    html=heading('💚 Lưu trữ & hồi phục','NPC tóc xanh · Quản lý pet và điều dưỡng')+wallet+
    `<div class="module-card"><h3>Hồi phục thể lực</h3><p>${pet?`${escapeHTML(pet.name)} — ${pet.hp}/100 HP`:'Chưa có pet trong đội.'}</p><button data-action="heal">💚 Hồi phục toàn bộ pet</button></div>`+
    `<h3>Đội hình (${progress.pets.length}/${BAG_CAPACITY})</h3>`+
    `<div class="item-list">${progress.pets.map(a=>`<div class="item-row"><div><strong>🐾 ${escapeHTML(a.name)}</strong><small>${a.hp}/100 HP</small></div><button data-action="store" data-id="${escapeHTML(a.id)}" ${progress.pets.length<=1?'disabled':''}>Gửi kho</button></div>`).join('')}</div>`+
    `<h3>Kho lưu trữ (${progress.storage.length})</h3><div class="item-list">${progress.storage.map(a=>`<div class="item-row"><div><strong>🐾 ${escapeHTML(a.name)}</strong><small>${a.hp}/100 HP</small></div><button data-action="withdraw" data-id="${escapeHTML(a.id)}" ${progress.pets.length>=BAG_CAPACITY?'disabled':''}>Lấy ra</button></div>`).join('')||'<p class="small-copy">Chưa có pet trong kho.</p>'}</div>`+
    `<button class="testing-button" data-action="add-demo">+ Thêm pet kiểm thử (mô phỏng giới hạn balo)</button>`;
    break;
   case 'magic':
    html=heading('✦ MAGIC — Sổ kỹ năng','Giao diện thử nghiệm dựa trên mẫu · điều kiện cấp Lv.1 / 5 / 10 / 40')+
     `<div class="pet-details"><img src="assets/pet-catalog/${speciesById(pet?.species).id}_0.png"><div><h3>${escapeHTML(pet?.name||'Pet')}</h3><p>Lv.${pet?.level||1} · EXP ${pet?.exp||0}/${(pet?.level||1)*50}</p><p>Chỉ học kỹ năng tại nhà MAGIC · nhấn E trước cửa</p></div></div>`+
     `<div class="skill-grid">${SKILL_LEVELS.filter(s=>s.id!=='basic'&&skillCompatible(s,pet?.species)).map(s=>`<div class="skill-box"><h3>✦ ${escapeHTML(s.name)} <span class="rarity">Lv.${s.level}</span></h3><p>${escapeHTML(s.description)}</p><p>⚔ ${s.damage} sát thương · 💠 ${s.mp} MP${s.id==='fury'?` · Cấp kỹ năng: ${pet?.skillRanks?.fury||1}`:''}</p><button data-action="learn" data-id="${s.id}" ${pet?.skills?.includes(s.id)||((pet?.level||1)<s.level)?'disabled':''}>${pet?.skills?.includes(s.id)?'✓ Đã học':(pet?.level||1)<s.level?'🔒 Chưa đạt cấp':'Học kỹ năng'}</button>${s.id==='fury'&&pet?.skills?.includes('fury')?`<button data-action="upgrade-fury">⬆ Nâng Cường nộ (cần cấp và xu)</button>`:''}</div>`).join('')}</div>`;
    break;
   case 'elder':
    html=heading('🏡 Nhà phía Tây','Trò chuyện với người trong nhà')+`<div class="module-card"><h3>👵 Bà chủ nhà</h3><p>Chào mừng đến nhà ta! Sau này nơi đây sẽ có thêm đối thoại và nhiệm vụ riêng.</p></div>`;
    break;
  }
  content.innerHTML=html+notice();
 }
 function apply(action,id){
  let result={ok:false,message:'Chưa hỗ trợ thao tác này.'};
  switch(action){
   case 'buy':result=buy(progress,id);break;
   case 'use-potion':result=usePotion(progress);break;
   case 'heal':result=healTeam(progress);break;
   case 'store':result=storePet(progress,id);break;
   case 'withdraw':result=withdrawPet(progress,id);break;
   case 'add-demo':result=testCatchPet(progress);break;
   case 'accept-quest':result=acceptQuest(progress);break;
   case 'learn':result=learnPetSkill(progress,id);break;
   case 'upgrade-fury':result=upgradeSkillRank(progress,'fury');break;
   case 'show-pet':selectedPetId=id;result={ok:false,message:''};break;
   case 'choose-pet':result=choosePet(progress,id);break;
   case 'adopt':result=adoptPet(progress,id);break;
   case 'xp':result=gainPetXP(progress,35);break;
  }
  message=result.message;
  if(result.ok)persist();render();
 }
 $('#menu-trigger').addEventListener('click',openMenu);
 $('#menu-close').addEventListener('click',close);
 backdrop.addEventListener('click',close);
 menu.addEventListener('click',e=>{const b=e.target.closest('button[data-panel]');if(!b)return;if(b.dataset.panel==='settings'){close();openSettings();}else open(b.dataset.panel);});
 panel.addEventListener('change',e=>{if(e.target.id==='free-pets-switch'){localStorage.setItem(PET_TEST_FLAG_STORAGE_KEY,String(e.target.checked));message='Đã cập nhật cờ nhận Pet miễn phí.';render();}});
 panel.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;if(b.dataset.action==='close')close();else apply(b.dataset.action,b.dataset.id);});
 return {open,close,openMenu,isOpen};
}
