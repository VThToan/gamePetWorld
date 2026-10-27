import { PLAYER_DIRECTIONS,PET_DIRECTIONS } from './config.js';
import {PET_SPECIES} from './pet-data.js';
function getVisibleBounds(image) {
  const canvas=document.createElement('canvas');
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0);
  const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
  let left=canvas.width,right=0,bottom=0,top=canvas.height;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    if(data[(y*canvas.width+x)*4+3]<72)continue;
    left=Math.min(left,x);right=Math.max(right,x+1);
    top=Math.min(top,y);bottom=Math.max(bottom,y+1);
  }
  return right<=left?{centerX:canvas.width/2,bottom:canvas.height}:{centerX:(left+right)/2,bottom};
}
function fetchImage(src) {
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('Không thể tải asset: '+src));
    image.src=src;
  });
}
export async function loadAssets(onProgress=()=>{}) {
  const files = [
    ['map','assets/map.png'],
    ['interior_west','assets/interiors/west.png'],
    ['interior_shop','assets/interiors/shop.png'],
    ['interior_mine','assets/interiors/mine.png'],
    ['out_west_village','assets/out-west-village.png'],
    ['out_west_south','assets/out-west-south.png'],
    ['out_harbor','assets/out-harbor.png'],
  ];
  for (const dir of PLAYER_DIRECTIONS) for (let n=0;n<2;n++) files.push([`player_${dir}_${n}`,`assets/player/${dir}_${n}.png`]);
  for (const dir of PET_DIRECTIONS) files.push([`pet_${dir}`,`assets/pet/${dir}.png`]);
  for(const type of PET_SPECIES)for(let n=0;n<2;n++) files.push([`pet_${type.id}_${n}`,`assets/pet-catalog/${type.id}_${n}.png`]);
  for(const name of ['fire','moon','spirit']) files.push([`skill_${name}`,`assets/pet/skill_${name}.png`]);
  for(const element of ['grass','fire','water','earth','lightning','ice','wind','dark','light','fury','heal','revive','basic'])for(let f=0;f<7;f++)files.push([`vfx_${element}_${f}`,`assets/effects/${element}_${f}.png`]);
  let completed=0;
  const entries=await Promise.all(files.map(async ([key,url])=>{
    try {return [key,await fetchImage(url)];}
    catch(err) {console.warn(err);return [key,null];}
    finally {onProgress(++completed,files.length);}
  }));
  const images=Object.fromEntries(entries);
  if(!images.map) throw new Error('Không tải được bản đồ. Hãy mở bằng Live Server, không mở file://.');
  images.bounds={};
  for(const [key,img] of entries){
    if(img && (key.startsWith('player_')||key.startsWith('pet_'))) images.bounds[key]=getVisibleBounds(img);
  }
  return images;
}
