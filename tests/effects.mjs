import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {ELEMENTS} from '../src/wild-data.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
for(const id of [...ELEMENTS,'fury','heal','revive','basic']){
 for(let f=0;f<7;f++)assert(existsSync(resolve(root,`assets/effects/${id}_${f}.png`)),`${id} frame ${f} missing`);
}
assert(existsSync(resolve(root,'assets/pet-catalog/windspirit_0.png')));
assert(existsSync(resolve(root,'assets/pet-catalog/lightspirit_0.png')));
console.log('✅ PASS: 9 elemental VFX + 4 secondary effects × 7 frames and wind/light pet demo sprites.');
