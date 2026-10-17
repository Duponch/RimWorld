import type {World} from './types.ts';
import {footprintCells} from './definitions.ts';
import {isFurnitureQuality,materialAllowed,furnitureMaxHitPoints} from './furniture-stats.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const int=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
/** Only this definition's prospective facts; other domains keep their existing guards. */
export function validBedrollBuilding256(v:unknown,version:number):boolean {
 if(!object(v))return false;if(v.kind!=='bedroll')return true;
 return Reflect.ownKeys(v).every(k=>typeof k==='string'&&['id','kind','x','z','orientation','footprint','material','quality','damage','medical','prisoner'].includes(k))&&version>=256&&v.footprint==='standard'&&int(v.orientation,0,3)&&materialAllowed('bedroll',v.material)&&isFurnitureQuality(v.quality)
  &&(!Object.hasOwn(v,'damage')||int(v.damage,1,Math.round(furnitureMaxHitPoints('bedroll',v.material))-1))
  &&(!Object.hasOwn(v,'medical')||v.medical===true)&&(!Object.hasOwn(v,'prisoner')||v.prisoner===true);
}
export function validBedrollStructureEntry256(v:unknown,version:number,w:Pick<World,'width'|'height'>):boolean {
 if(!validBedrollBuilding256(v,version))return false;const b=v as World['structures'][number];
 return b.kind!=='bedroll'||footprintCells(b).every(c=>int(c.x,0,w.width-1)&&int(c.z,0,w.height-1));
}
/** Called on each real map by RAW admission and on the private Decoder candidate
 * before commit. Archived packages also call the building guard in their own
 * existing owner validator, with that owner's literal schema. No map is cloned. */
export function validBedrollState256(w:World,version:number=w.schemaVersion):boolean {
 for(const b of w.structures)if(!validBedrollStructureEntry256(b,version,w))return false;
 for(const pack of w.packed??[])if(!validBedrollBuilding256(pack.building,version))return false;
 for(const job of w.jobs){
  if(job.kind==='bedroll'&&(version<256||job.footprint!=='standard'||!int(job.orientation,0,3)||!materialAllowed('bedroll',job.material)||footprintCells(job).some(c=>!int(c.x,0,w.width-1)||!int(c.z,0,w.height-1))))return false;
  for(const target of [job.furniture,job.deconstruction,job.repair,job.flick,job.fixBreakdown])if(target&&'kind' in target&&target.kind==='bedroll'&&version<256)return false;
 }
 return true;
}
