import {captureActualLocalDistricts256} from './actual-local-districts-256.ts';
import {terrainSupportsAffordance256,terrainSupportsFloor256} from './natural-terrain-runtime-256.ts';
import {newDoorState} from './door-rules.ts';
import {isRoofed} from './roof-rules.ts';
import type {AncientRect256} from './local-ancient-placement-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {World,Structure} from './types.ts';

export const ITEM_STASH_STORAGE_SEED_PART_263=913432591;
/** Genuine storage400 on the unpublished Site map. Native admission7×7,
 * Heavy centre, no edifice throughout and no UsedRects overlap; same original
 * current wood walls/floor/roof/door interpret the storage building in3D.
 * Its concrete contents remain in the Site owner until complete adoption. */
export function generateItemStashStorage400263(w:World,factionId:number|null,usedRects:AncientRect256[],random:WorldGenerationRandom):AncientRect256 {
 if(Number(w.schemaVersion)!==263||w.site?.revision!==3||w.pawns.length||w.jobs.length)throw Error('Actual unpublished ItemStash400 frontier required');
 const physical=captureActualLocalDistricts256(w),width=w.width,height=w.height,center={x:Math.floor(width/2),z:Math.floor(height/2)};
 const rectAt=(x:number,z:number):AncientRect256=>({minX:x-3,minZ:z-3,maxX:x+3,maxZ:z+3});
 const allowed=(x:number,z:number)=>{
  const cell=z*width+x,r=rectAt(x,z);if(!physical.standable(cell)||isRoofed(w,cell)||!terrainSupportsAffordance256(w.tiles[cell]!,'Heavy',w)||r.minX<0||r.minZ<0||r.maxX>=width||r.maxZ>=height||usedRects.some(u=>r.minX<=u.maxX&&u.minX<=r.maxX&&r.minZ<=u.maxZ&&u.minZ<=r.maxZ))return false;
  for(let cz=r.minZ;cz<=r.maxZ;cz++)for(let cx=r.minX;cx<=r.maxX;cx++)if(physical.edifice(cz*width+cx))return false;
  return true;
 };
 // RCellFinder near-centre expanding rectangles:30 attempts per radius,
 // starting maxAxis/20 clipped3..25; no chosen seed or unbounded map search.
 let radius=Math.max(3,Math.min(25,Math.floor(Math.max(width,height)/20))),rect:AncientRect256|undefined;
 for(;;){
  for(let attempt=0;attempt<30;attempt++){
   const x=random.integer(Math.max(0,center.x-radius),Math.min(width-1,center.x+radius)+1),z=random.integer(Math.max(0,center.z-radius),Math.min(height-1,center.z+radius)+1);
   if(allowed(x,z)){rect=rectAt(x,z);break;}
  }
  if(rect)break;if(radius>width*2&&radius>height*2)throw Error('No actual supported Site storage location');radius=Math.floor(radius*1.5);
 }
 const structures:Structure[]=[],floors:number[]=[],roofs:number[]=[];let nextId=w.nextId;
 for(let z=rect.minZ;z<=rect.maxZ;z++)for(let x=rect.minX;x<=rect.maxX;x++){
  const cell=z*width+x,edge=x===rect.minX||x===rect.maxX||z===rect.minZ||z===rect.maxZ,t=w.tiles[cell]!;
  if(edge){if(!terrainSupportsAffordance256(t,'Heavy',w))throw Error('Actual Site storage wall lacks Heavy support');const door=z===rect.maxZ&&x===rect.minX+3;structures.push({id:nextId++,kind:door?'door':'wall',x,z,orientation:0,footprint:'standard',material:'wood',factionId,...door?{door:newDoorState(w.tick)}:{}});}
  else{if(!terrainSupportsFloor256(t,w)||w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z)||w.resources.some(p=>p.x===x&&p.z===z))throw Error('Actual Site storage interior is occupied or unsupported');floors.push(cell);roofs.push(cell);}
 }
 if(!Number.isSafeInteger(nextId))throw Error('Actual Site storage namespace exhausted');
 for(const c of floors)w.tiles[c]={...w.tiles[c]!,floor:'wood-planks'};w.structures.push(...structures);w.nextId=nextId;
 w.roofing??={constructed:[],build:[],remove:[],cursor:0};const natural=new Set([...(w.roofing.natural?.thin??[]),...(w.roofing.natural?.thick??[])]);
 w.roofing.constructed=[...new Set([...w.roofing.constructed,...roofs.filter(c=>!natural.has(c))])].sort((a,b)=>a-b);usedRects.push(rect);
 return rect;
}
