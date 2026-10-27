/** Demo data; edit the free-test switch and species prices here. */
import {ELEMENTS,ELEMENT_LABELS,SPECIES_ELEMENT} from './wild-data.js';
export const FREE_PET_TEST_MODE = true;
export const PET_SPECIES = [
 {id:'flame',name:'Hỏa Linh Thú',rarity:'Hiếm',price:600,element:'Hỏa',description:'Chiến binh Hỏa Vương sử dụng kiếm hỏa.',attack:30,defense:24,mp:100,speed:24,catchRate:.16},
 {id:'bug',name:'Bé Bọ',rarity:'Thường',price:80,element:'Cỏ',description:'Linh thú nhỏ dành cho người mới.',attack:12,defense:14,mp:80,speed:19,catchRate:.42},
 {id:'pumpkin',name:'Bí Ngô',rarity:'Thường',price:100,element:'Mộc',description:'Bạn đồng hành tinh nghịch.',attack:15,defense:12,mp:95,speed:18,catchRate:.38},
 {id:'tiger',name:'Super Tigger',rarity:'Ít gặp',price:200,element:'Thổ',description:'Hổ con nhanh nhẹn.',attack:20,defense:19,mp:85,speed:26,catchRate:.28},
 {id:'dino',name:'Khủng Long Dữ Dằn',rarity:'Ít gặp',price:260,element:'Thổ',description:'Khủng long chiến đấu dũng mãnh.',attack:24,defense:21,mp:80,speed:17,catchRate:.24},
 {id:'ice',name:'Băng Linh Thú',rarity:'Hiếm',price:550,element:'Băng',description:'Tấn công và bảo vệ bằng băng tinh.',attack:28,defense:26,mp:110,speed:20,catchRate:.18},
 {id:'thunder',name:'Lôi Linh Thú',rarity:'Hiếm',price:580,element:'Sấm sét',description:'Phóng lôi nhanh và chính xác.',attack:31,defense:20,mp:110,speed:29,catchRate:.16},
 {id:'dragon',name:'Răng Sún',rarity:'Huyền thoại',price:1200,element:'Bóng tối',description:'Rồng đen mắt xanh, sức mạnh khó đoán.',attack:39,defense:30,mp:125,speed:25,catchRate:.08},
 {id:'waterfish',name:'Cá 3 đuôi',rarity:'Đặc biệt',price:0,element:'Thủy',description:'Pet hệ Thủy của NPC tân thủ ngoài đường mòn phía Nam.',attack:22,defense:18,mp:96,speed:22,catchRate:.30},
 {id:'windspirit',name:'Phong Linh Thú',rarity:'Hiếm',price:540,element:'Gió',description:'Biến thể sprite demo gió; có kỹ năng hệ Gió.',attack:24,defense:18,mp:120,speed:34,catchRate:.21},
 {id:'lightspirit',name:'Quang Linh Thú',rarity:'Hiếm',price:570,element:'Ánh sáng',description:'Biến thể sprite demo ánh sáng; có kỹ năng hệ Ánh Sáng.',attack:28,defense:24,mp:115,speed:26,catchRate:.18},
];
export const speciesById = id=>PET_SPECIES.find(p=>p.id===id)||PET_SPECIES[0];
export const STATUS_LABELS = {burn:'Bỏng',curse:'Nguyền',freeze:'Đóng băng',shock:'Choáng'};
export const SKILL_LEVELS = [
 {id:'basic',level:1,mp:0,damage:10,name:'Đòn thường',description:'Đánh thường không tốn MP',status:null},
 {id:'fire', element:'fire', level:1, mp:12, damage:25, name:'Kiếm Hỏa', description:'Lửa quét phía trước',status:'burn',statusChance:.34},
 {id:'moon', element:'dark', level:5, mp:20, damage:35, name:'Hắc Nguyệt', description:'Trăng khuyết bóng tối',status:'curse',statusChance:.4},
 {id:'spirit', level:10, mp:24, damage:18, heal:12, name:'Triệu Hồi Linh Lực',description:'Linh lực hồi phục',status:null},
 {id:'ultimate', level:40, mp:40, damage:52, name:'Tuyệt kỹ',description:'Mốc cấp 40 (vật phẩm và kỹ năng chính thức sẽ cập nhật)',status:'shock',statusChance:.55},
 {id:'fury',level:3,mp:18,damage:0,name:'Cường nộ',description:'Gồng năng lượng 1 lượt, tăng sát thương đòn tiếp theo tùy theo cấp độ.',element:'fury'},
 ...ELEMENTS.map((element,i)=>({id:`elem-${element}`,level:5,mp:16,damage:24+(i%3)*2,name:`Kỹ năng ${ELEMENT_LABELS[element]}`,description:`Đòn tấn công thuộc hệ ${ELEMENT_LABELS[element]}.`,element,status:(element==='ice'?'freeze':element==='fire'?'burn':element==='lightning'?'shock':element==='dark'?'curse':null),statusChance:.28})),
];
export const PET_TEST_FLAG_STORAGE_KEY='pettown-free-pets';
export function getFreePetMode(){try{const s=localStorage.getItem(PET_TEST_FLAG_STORAGE_KEY);return s===null?FREE_PET_TEST_MODE:s==='true';}catch{return FREE_PET_TEST_MODE;}}
export function skillCompatible(skill,species){
 if(!skill || !SPECIES_ELEMENT[species]) return skill?.id==='basic';
 return !skill.element || skill.element==='fury' || skill.element===SPECIES_ELEMENT[species];
}
export function unlockedSkillsForLevel(level=1,species=null){return SKILL_LEVELS.filter(s=>level>=s.level&&skillCompatible(s,species)).map(s=>s.id);}
// HP and MP in saved games and network messages are percentages; maxima are derived from species and level.
export function statsFor(species,level=1){
 const type=speciesById(species), n=Math.max(0,Math.floor(level||1)-1);
 return {maxHp:100+n*8,maxMp:type.mp+n*5,attack:type.attack+n*2,defense:type.defense+n*2,speed:type.speed+n,crit:Math.min(.5,.05+n*.005)};
}
export function combatDamage(skill,attacker,defender,multiplier=1,random=Math.random){
 if(!skill.damage)return {damage:0,percent:0,critical:false};
 const critical=random()<attacker.crit;
 const damage=Math.max(1,Math.round((skill.damage+attacker.attack)*100/(100+defender.defense)*multiplier*(critical?1.5:1)));
 return {damage,percent:damage/defender.maxHp*100,critical};
}
export function mpCostPercent(skill,stats){return skill.mp/stats.maxMp*100;}
export function skillById(id){return SKILL_LEVELS.find(s=>s.id===id)||SKILL_LEVELS[0];}
export function levelCurve(level=1){return Math.max(1, level)*50;}
