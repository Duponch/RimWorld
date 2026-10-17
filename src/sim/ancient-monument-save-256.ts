import {isSchema256Or257} from './schema-compatibility-257.ts';
import {isCaveHiveKind256} from './cave-hive-state-256.ts';
import {isAncientMonumentKind256,ancientMonumentMaterial256,ancientMonumentMaxHp256,ancientMonumentCells256,ANCIENT_MONUMENT_DEFS_256} from './ancient-monument-props-256.ts';
import {isAncientNeutralKind256} from './ancient-monument-runtime-256.ts';
import {isFurnitureQuality} from './furniture-stats.ts';
import type {World} from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const read=(v:object,k:string)=>{const d=Object.getOwnPropertyDescriptor(v,k);return d&&'value'in d?d.value:undefined;};
const data=(v:object)=>Reflect.ownKeys(v).every(k=>{const d=Object.getOwnPropertyDescriptor(v,k)!;return typeof k==='string'&&'value'in d&&d.enumerable;});
const int=(v:unknown,a:number,b=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=a&&v<=b;
/** Can be composed with the existing neutral road-prop owner guard. */
export function validAncientFactionField256(v:unknown,version:number):boolean {
 if(v&&typeof v==='object'&&isCaveHiveKind256(Object.getOwnPropertyDescriptor(v,'kind')?.value))return isSchema256Or257(version);
 if(!object(v)||!data(v))return false;
 if(!Object.hasOwn(v,'factionId'))return true;
 if(read(v,'kind')==='ancient-cryptosleep-casket')return version>=256&&v.factionId===null;
 return version>=256&&isAncientNeutralKind256(read(v,'kind'))&&(v.factionId===null||int(v.factionId,1));
}
/** New kinds only. The surrounding original record/namespace guards still run. */
export function validAncientMonumentBuilding256(v:unknown,version:number):boolean {
 if(!object(v)||!data(v))return false;const kind=read(v,'kind');if(!isAncientMonumentKind256(kind))return true;
 if(version<256||Reflect.ownKeys(v).some(k=>typeof k!=='string'||!['id','kind','x','z','orientation','footprint','material','quality','damage','factionId','grave'].includes(k))||!int(v.id,1)||!int(v.x,0)||!int(v.z,0)||v.footprint!=='standard'||!int(v.orientation,0,ANCIENT_MONUMENT_DEFS_256[kind].rotatable?3:0)||!ancientMonumentMaterial256(kind,v.material,version)||!validAncientFactionField256(v,version))return false;
 if(Object.hasOwn(v,'damage')&&!int(v.damage,1,ancientMonumentMaxHp256(kind,v.material)-1))return false;
 if(kind==='sarcophagus'){
  const g=v.grave;if(!isFurnitureQuality(v.quality)||!object(g)||!data(g)||Reflect.ownKeys(g).some(k=>typeof k!=='string'||!['corpseId','assignedPawnId','colonists','strangers'].includes(k))||typeof g.colonists!=='boolean'||typeof g.strangers!=='boolean'||Object.hasOwn(g,'corpseId')&&!int(g.corpseId,1)||Object.hasOwn(g,'assignedPawnId')&&!int(g.assignedPawnId,1))return false;
 }else if(Object.hasOwn(v,'quality')||Object.hasOwn(v,'grave'))return false;
 return true;
}
export function validAncientMonumentState256(w:Pick<World,'structures'|'packed'|'jobs'|'width'|'height'|'nextId'|'worldFactions'>,version:number):boolean {
 const packed=w.packed??[],nonSpatial=version>=258?new Set<object>(packed.map(p=>p.building)):undefined,installed=version>=258?new Set<object>(w.structures):undefined;
 for(const b of [...w.structures,...packed.map(p=>p.building)]){
  if(!validAncientMonumentBuilding256(b,version))return false;
  if(isAncientMonumentKind256(b.kind)&&(!int(b.id,1,w.nextId-1)||(!nonSpatial?.has(b)||installed?.has(b))&&ancientMonumentCells256(b.kind,b,b.orientation).some(c=>!int(c.x,0,w.width-1)||!int(c.z,0,w.height-1))))return false;
  if(Object.hasOwn(b,'factionId')&&isAncientNeutralKind256(b.kind)&&b.factionId!==null){const r=w.worldFactions;if(!r||b.factionId!==r.playerFactionId||!r.factions.some(f=>f.id===b.factionId&&(f.def==='PlayerColony'||f.def==='PlayerTribe')))return false;}
 }
 for(const p of packed)if(isAncientMonumentKind256(p.building.kind)&&p.building.kind!=='urn')return false;
 for(const j of w.jobs){if(isAncientMonumentKind256(j.kind)&&(version<256||!ancientMonumentMaterial256(j.kind,j.material,version)||j.footprint!=='standard'||!int(j.orientation,0,ANCIENT_MONUMENT_DEFS_256[j.kind].rotatable?3:0)||ancientMonumentCells256(j.kind,j,j.orientation).some(c=>!int(c.x,0,w.width-1)||!int(c.z,0,w.height-1))))return false;for(const t of [j.furniture,j.deconstruction])if(t&&isAncientMonumentKind256(t.kind)&&(version<256||t.kind!=='urn'&&!!j.furniture))return false;}
 return true;
}
