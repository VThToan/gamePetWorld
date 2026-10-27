// Shared public monster definitions, used by the Node server and game client.
export const WILD_SCENES = Object.freeze({
  'out-west':       {species:['bug','pumpkin','tiger'],level:[1,4]},
  'out-west-south': {species:['waterfish','bug','pumpkin','tiger','dino'],level:[3,8]},
  'out-north':      {species:['tiger','ice','bug','windspirit'],level:[4,9]},
  'out-south':      {species:['pumpkin','waterfish','dino'],level:[5,10]},
  'out-east':       {species:['thunder','ice','dino','dragon','lightspirit'],level:[6,12]}
});
export const WILD_MAX_PER_MAP = 12;
export const WILD_RESPAWN_MS = 10_000;
export const AUTO_ATTACK_MS = 3_000;
export const REVIIVE_MS = 30_000;
export const REST_STILL_MS = 5_000;
export const REST_TICK_MS = 2_000;
export const REST_AMOUNT = 10; // percentage points out of 100
export const SPECIES_ELEMENT = Object.freeze({flame:'fire',bug:'grass',pumpkin:'grass',tiger:'earth',dino:'earth',ice:'ice',thunder:'lightning',dragon:'dark',waterfish:'water',windspirit:'wind',lightspirit:'light'});
export const ELEMENTS = Object.freeze(['grass','fire','water','earth','lightning','ice','wind','dark','light']);
export const ELEMENT_LABELS = Object.freeze({grass:'Cỏ',fire:'Lửa',water:'Nước',earth:'Đất',lightning:'Sấm sét',ice:'Băng',wind:'Gió',dark:'Bóng tối',light:'Ánh sáng',fury:'Cường nộ',heal:'Hồi phục',revive:'Hồi sinh'});
export function elementalSkillFor(species){return `elem-${SPECIES_ELEMENT[species]||'wind'}`;}
export function furyMultiplier(level=1,skillRank=1){return Math.min(3.5,1.35+0.25*(Math.max(1,skillRank)-1)+Math.floor(Math.max(1,level)/8)*0.08);}
