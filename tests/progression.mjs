import assert from 'node:assert/strict';
import {statsFor,combatDamage,skillById,unlockedSkillsForLevel,mpCostPercent,skillCompatible,PET_SPECIES} from '../src/pet-data.js';
import {freshProgress,learnPetSkill,normalizeSkills,petStats} from '../src/gameplay.js';
import {Battle} from '../src/battle.js';
for(const species of PET_SPECIES){
 const a=statsFor(species.id,1),b=statsFor(species.id,10);
 for(const stat of ['maxHp','maxMp','attack','defense','speed','crit'])assert(b[stat]>a[stat],`${species.id} ${stat}`);
 assert(mpCostPercent(skillById('fire'),b)<mpCostPercent(skillById('fire'),a));
 const skills=unlockedSkillsForLevel(60,species.id);assert(skills.every(id=>skillCompatible(skillById(id),species.id)));
}
const attacker=statsFor('flame',10),target=statsFor('ice',10),skill=skillById('fire');
const normal=combatDamage(skill,attacker,target,1,()=>1);assert(combatDamage(skill,attacker,{...target,defense:target.defense+100},1,()=>1).damage<normal.damage);
assert(combatDamage(skill,attacker,target,1,()=>0).damage>normal.damage);
const p=freshProgress();p.pets[0].level=10;assert(!learnPetSkill(p,'elem-water').ok);assert(!learnPetSkill(p,'moon').ok);
assert(!normalizeSkills({...p.pets[0],skills:['basic','moon','elem-water','fire']}).includes('moon'));
assert.equal(petStats(p.pets[0]).maxHp,172);
const b=new Battle();b.start(100,{playerSpeed:100,petSpecies:'flame',playerPet:{level:10,skills:['basic','fire','elem-water']}});
assert(!b.useSkill('elem-water'));assert(b.useSkill('fire'));assert(b.enemyHP<100);
console.log('✅ PASS: level growth, armor, critical hits, MP and element restrictions.');
