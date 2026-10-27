import {PET_SPECIES,speciesById,getFreePetMode,SKILL_LEVELS,unlockedSkillsForLevel,levelCurve,skillCompatible,statsFor} from './pet-data.js';
/** Minimal editable offline gameplay state, not a live inventory backend. */
export const START_ITEMS={potion:2,ball:1,crystal:0};
export const CATALOG={
 potion:{label:'Bình hồi phục',price:30,detail:'Hồi 40 HP cho pet'},
 ball:{label:'Poke Ball',price:50,detail:'Dụng cụ bắt pet hoang dã'},
 crystal:{label:'Mảnh tiến hóa',price:80,detail:'Nguyên liệu tiến hóa (chưa triển khai tiến hóa)'},
};
export const BAG_CAPACITY=3;
export function freshProgress(){return {coins:250,items:{...START_ITEMS},pets:[{id:'flame-1',species:'flame',name:'Hỏa Linh Thú',hp:100,mp:100,level:1,exp:0,skills:['basic','fire'],skillRanks:{fury:1}}],storage:[],activePet:'flame-1',quest:{accepted:false,claimed:false},flags:{rookieWaterDefeated:false}};}
export function loadProgress(){
 try {
  const stored=JSON.parse(localStorage.getItem('pettown-progress-v2'));
  if(!stored||!Array.isArray(stored.pets)||!Array.isArray(stored.storage))return freshProgress();
  const normalized=p=>({...p,species:p.species||(p.name.includes('Hỏa')?'flame':'bug'),level:p.level||1,mp:p.mp??100,exp:p.exp||0,skills:normalizeSkills({...p,species:p.species||(p.name?.includes('Hỏa')?'flame':'bug')}),skillRanks:{fury:1,...(p.skillRanks||{})}});
  return {...freshProgress(),...stored,pets:stored.pets.map(normalized),storage:stored.storage.map(normalized),items:{...START_ITEMS,...stored.items},flags:{...freshProgress().flags,...(stored.flags||{})}};
 }catch{return freshProgress();}
}
export function saveProgress(p){try{localStorage.setItem('pettown-progress-v2',JSON.stringify(p));}catch{}}
export function activePet(p){return p.pets.find(pet=>pet.id===p.activePet)||p.pets[0]||null;}
export function buy(p,id){const item=CATALOG[id];if(!item)return {ok:false,message:'Vật phẩm không hợp lệ.'};
 if(p.coins<item.price)return {ok:false,message:'Không đủ xu.'};
 p.coins-=item.price;p.items[id]=(p.items[id]||0)+1;
 return {ok:true,message:`Đã mua ${item.label} (-${item.price} xu).`};
}
export function consumeItem(progress,id,count=1){
 if(!(progress.items[id]>=(count||1)))return {ok:false,message:'Không đủ vật phẩm.'};
 progress.items[id]-=count;
 return {ok:true,message:`Đã dùng ${CATALOG[id]?.label||id}.`};
}
export function usePotion(p){const pet=activePet(p);
 if(!pet)return {ok:false,message:'Chưa có pet trong đội.'};
 if(!(p.items.potion>0))return {ok:false,message:'Không có bình hồi phục.'};
 if(pet.hp>=100)return {ok:false,message:'Pet đã đầy HP.'};
 p.items.potion--;pet.hp=Math.min(100,pet.hp+40/statsFor(pet.species,pet.level).maxHp*100);
 return {ok:true,message:`Đã hồi phục: ${pet.name} ${Math.round(pet.hp*statsFor(pet.species,pet.level).maxHp/100)}/${statsFor(pet.species,pet.level).maxHp} HP.`};
}
export function healTeam(p){for(const pet of [...p.pets,...p.storage]){pet.hp=100;pet.mp=100;}
 return {ok:true,message:'Đã hồi phục toàn bộ pet về 100 HP / 100 MP (demo).'};
}
export function storePet(p,id){if(p.pets.length<=1)return {ok:false,message:'Cần giữ ít nhất một pet trong đội.'};
 const i=p.pets.findIndex(pet=>pet.id===id);if(i<0)return {ok:false,message:'Không thấy pet.'};
 const [pet]=p.pets.splice(i,1);p.storage.push(pet);
 if(p.activePet===id)p.activePet=p.pets[0].id;
 return {ok:true,message:`Đã gửi ${pet.name} vào lưu trữ.`};
}
export function withdrawPet(p,id){if(p.pets.length>=BAG_CAPACITY)return {ok:false,message:`Đội đã đủ ${BAG_CAPACITY} pet.`};
 const i=p.storage.findIndex(pet=>pet.id===id);if(i<0)return {ok:false,message:'Không thấy pet.'};
 const [pet]=p.storage.splice(i,1);p.pets.push(pet);
 return {ok:true,message:`Đã lấy ${pet.name} ra khỏi lưu trữ.`};
}
export function testCatchPet(p){const n=p.pets.length+p.storage.length+1;
 const pet={id:`demo-${Date.now()}-${n}`,species:'bug',name:`Pet kiểm thử ${n}`,hp:65,mp:100,level:1,exp:0,skills:['basic'],skillRanks:{fury:1}};
 if(p.pets.length>=BAG_CAPACITY){p.storage.push(pet);return {ok:true,message:'Đội đầy: pet thử đã gửi vào lưu trữ.'};}
 p.pets.push(pet);return {ok:true,message:`Đã thêm ${pet.name} vào đội (chỉ để kiểm thử).`};
}
export function acceptQuest(p){if(p.quest.accepted)return {ok:false,message:'Bạn đã nhận nhiệm vụ thử nghiệm.'};
 p.quest.accepted=true;return {ok:true,message:'Đã nhận vị trí nhiệm vụ ngày (demo). Chưa có mục tiêu/thưởng thật.'};
}

/** Same source of truth drives shop, team selector and MAGIC trainer. */
export function adoptPet(progress,type,level=1){
 const species=PET_SPECIES.find(p=>p.id===type);
 if(!species)return {ok:false,message:'Không thấy giống pet này.'};
 const free=getFreePetMode();const price=free?0:species.price;
 if(progress.coins<price)return {ok:false,message:`Thiếu ${price-progress.coins} xu để mua ${species.name}.`};
 progress.coins-=price;
 const pet=buildPet(type,level,`${type}-${Date.now()}-${Math.floor(Math.random()*9999)}`);
 pet.name=species.name;
 if(progress.pets.length<BAG_CAPACITY)progress.pets.push(pet);else progress.storage.push(pet);
 return {ok:true,message:`${free?'Đã nhận miễn phí':'Đã mua'} ${pet.name}. ${progress.pets.length>BAG_CAPACITY?'Pet vào kho nếu đội đầy.':''}`};
}
export function choosePet(progress,id){
 if(!progress.pets.some(p=>p.id===id))return {ok:false,message:'Pet đang lưu trữ không thể ra trận.'};
 progress.activePet=id;return {ok:true,message:`Đã chọn ${activePet(progress).name} làm pet đồng hành.`};
}
export function gainPetXP(progress,amount=35){
 const pet=activePet(progress);if(!pet)return {ok:false,message:'Không có pet.'};
 pet.exp=(pet.exp||0)+amount;let gained=0;
 while(pet.level<60&&pet.exp>=levelCurve(pet.level)){pet.exp-=levelCurve(pet.level);pet.level++;gained++;pet.skills=normalizeSkills(pet,true);}
 return {ok:true,message:`+${amount} XP cho ${pet.name}${gained?` · tăng ${gained} cấp tới Lv.${pet.level}`:''}.`};
}
export function learnPetSkill(progress,id){
 const pet=activePet(progress),skill=SKILL_LEVELS.find(s=>s.id===id);
 if(!pet||!skill)return {ok:false,message:'Chưa chọn pet hoặc sai kỹ năng.'};
 if(!skillCompatible(skill,pet.species))return {ok:false,message:'Pet không cùng hệ với kỹ năng này.'};
 if(pet.level<skill.level)return {ok:false,message:`Kỹ năng này cần Lv.${skill.level}; pet hiện tại Lv.${pet.level}.`};
 pet.skills??=['basic'];if(pet.skills.includes(id))return {ok:false,message:'Pet đã học kỹ năng này.'};
 pet.skills.push(id);return {ok:true,message:`${pet.name} đã học ${skill.name}!`};
}
export function normalizeSkills(pet,addUnlocked=false){
 const own=new Set((Array.isArray(pet?.skills)?pet.skills:['basic']).filter(id=>{const skill=SKILL_LEVELS.find(s=>s.id===id);return skill&&skillCompatible(skill,pet?.species)&&skill.level<=(pet?.level||1);}));
 own.add('basic');
 if(addUnlocked)for(const id of unlockedSkillsForLevel(pet?.level||1,pet?.species||null))if(id==='fury'||id.startsWith('elem-'))own.add(id);
 return [...own];
}
export function petStats(pet){
 const level=pet?.level||1, stats=statsFor(pet?.species,level);
 return {...stats,hp:Math.round((pet?.hp??100)*stats.maxHp/100),mp:Math.round((pet?.mp??100)*stats.maxMp/100),level,catchRate:speciesById(pet?.species).catchRate??.2};
}
export function upgradeSkillRank(progress,id='fury'){
 const pet=activePet(progress);if(!pet||id!=='fury')return {ok:false,message:'Chưa hỗ trợ nâng cấp kỹ năng này.'};
 if(!(pet.skills||[]).includes(id))return {ok:false,message:'Pet chưa học Cường nộ (Lv.3).'};
 pet.skillRanks??={fury:1};const rank=pet.skillRanks.fury||1;
 const maxRank=Math.min(5,1+Math.floor(Math.max(0,pet.level-1)/8));
 if(rank>=maxRank)return {ok:false,message:`Cần nâng cấp cấp độ pet để vượt bậc ${rank} (tối đa hiện tại ${maxRank}).`};
 const price=rank*40;if(progress.coins<price)return {ok:false,message:`Cần ${price} xu nâng bậc.`};
 progress.coins-=price;pet.skillRanks.fury=rank+1;
 return {ok:true,message:`Đã tăng Cường nộ lên bậc ${rank+1} (-${price} xu).`};
}
export function buildPet(species,level=1,id=`${species}-${Date.now()}`){
 const base=speciesById(species);
 return {id,species,name:base.name,hp:100,mp:100,level,exp:0,skills:unlockedSkillsForLevel(level,species),skillRanks:{fury:1}};
}
export function addCaughtPet(progress,pet){
 const clone={...pet,id:`${pet.species}-${Date.now()}-${Math.floor(Math.random()*9999)}`,skills:normalizeSkills(pet,true),hp:Math.max(20,pet.hp||100),mp:pet.mp??100};
 if(progress.pets.length<BAG_CAPACITY)progress.pets.push(clone); else progress.storage.push(clone);
 return {ok:true,message:progress.pets.includes(clone)?`Đã thu phục ${clone.name}!`:`Đã thu phục ${clone.name}; đội đầy nên pet được gửi vào kho.`};
}
