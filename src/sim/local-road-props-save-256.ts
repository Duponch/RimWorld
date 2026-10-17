import {glowPodPackedFaction256} from './cave-glowpod-minification-256.ts';
import {isShipChunk256,validShipChunkStructure256} from './ship-chunk-256.ts';
import {validAncientFactionField256} from './ancient-monument-save-256.ts';
import {isAncientNeutralKind256} from './ancient-monument-runtime-256.ts';
import {isLocalRoadProp256,localRoadPropMaxHp256} from './local-road-props-256.ts';
import type {World} from './types.ts';
type Header=Pick<World,'width'|'height'|'nextId'>;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max:number)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const read=(o:object,key:string):unknown=>{const d=Object.getOwnPropertyDescriptor(o,key);return d&&'value' in d?d.value:undefined;};
const structureKeys=new Set(['id','kind','x','z','orientation','footprint','damage','factionId']);
/** Domain guard only. General IDs, overlap, terrain support and namespace
 * validators still run. No material/quality/power/role is granted by this kind. */
export function validLocalRoadPropStructure256(value:unknown,version:number,h:Header):boolean {
 if(!object(value))return false;
 const k=Object.getOwnPropertyDescriptor(value,'kind');if(!k||!('value' in k))return false;
 if(isShipChunk256(k.value))return validShipChunkStructure256(value,version,h);
 if(!isLocalRoadProp256(k.value))return validAncientFactionField256(value,version);
 if(version<256)return false;
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(Reflect.ownKeys(value).some(key=>typeof key!=='string'||!structureKeys.has(key)||
   !descriptors[key]||!('value' in descriptors[key])||!descriptors[key].enumerable))return false;
 return Object.hasOwn(value,'factionId')&&(read(value,'factionId')===null||integer(read(value,'factionId'),1,Number.MAX_SAFE_INTEGER))
  &&integer(read(value,'id'),1,h.nextId-1)&&integer(read(value,'x'),0,h.width-1)
  &&integer(read(value,'z'),0,h.height-1)&&read(value,'footprint')==='standard'
  &&integer(read(value,'orientation'),0,k.value==='ancient-road-lamp'?0:3)
  &&(!Object.hasOwn(value,'damage')||integer(read(value,'damage'),1,localRoadPropMaxHp256(k.value)-1));
}
export function validLocalRoadPropsState256(w:Pick<World,'structures'|'jobs'|'packed'|'width'|'height'|'nextId'|'worldFactions'>,version:number):boolean {
 for(const s of w.structures){
  if(!validLocalRoadPropStructure256(s,version,w))return false;
  if((isLocalRoadProp256(s.kind)||Object.hasOwn(s,'factionId')&&isAncientNeutralKind256(s.kind))&&s.factionId!==null){const r=w.worldFactions;if(!r||r.revision!==1||s.factionId!==r.playerFactionId||!Array.isArray(r.factions)||!r.factions.some(f=>f&&f.id===s.factionId&&(f.def==='PlayerColony'||f.def==='PlayerTribe')))return false;}
 }
 // Minification and construction are unavailable in every version, including
 // future-shaped payloads under an old outer packet.
 for(const p of w.packed??[])if(isLocalRoadProp256(p.building?.kind)||p.building&&Object.hasOwn(p.building,'factionId')&&!(glowPodPackedFaction256(p.building,version)||version>=256&&['urn','table','table-square'].includes(p.building.kind)&&validAncientFactionField256(p.building,version)))return false;
 for(const j of w.jobs){
  if(Object.hasOwn(j,'factionId'))return false;
  if(isShipChunk256(j.kind)||isShipChunk256(j.furniture?.kind)||isLocalRoadProp256(j.kind)||isLocalRoadProp256(j.furniture?.kind))return false;
  const d=j.deconstruction;if(!d||!isLocalRoadProp256(d.kind)&&!isShipChunk256(d.kind))continue;
  if(version<256||j.kind!=='deconstruct'||Reflect.ownKeys(d).some(k=>k!=='kind'&&k!=='structureId')
    ||!integer(d.structureId,1,w.nextId-1))return false;
  const s=w.structures.find(s=>s.id===d.structureId);
  if(!s||s.kind!==d.kind||j.x!==s.x||j.z!==s.z||j.orientation!==s.orientation||j.footprint!==s.footprint)return false;
 }
 return true;
}

/** Shared packed-owner frontier: applies to local, away and terminal holders.
 * No road prop is minifiable, and no old packed building gains a faction. */
export function validLocalRoadPropPackedBuilding256(v:unknown,version:number):boolean {
 if(!object(v))return false;const kind=read(v,'kind');return !isShipChunk256(kind)&&!isLocalRoadProp256(kind)&&(!Object.hasOwn(v,'factionId')||glowPodPackedFaction256(v,version)||version>=256&&typeof kind==='string'&&['urn','table','table-square'].includes(kind)&&validAncientFactionField256(v,version));
}
