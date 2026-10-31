import {isCorePhysicalSchema297} from './physical-schema-297.ts';
import {effectiveCore297} from './core-phase-297.ts';
import {isSchema256Or257} from './schema-compatibility-257.ts';
import type {Cell,MaterialOwner,MaterialPile,Pawn,Structure} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
import {validAncientCasketWickField256} from './ancient-casket-explosive-state-256.ts';

export const ANCIENT_CASKET_KIND_256='ancient-cryptosleep-casket' as const;
export const ANCIENT_CASKET_OPEN_CORE_256=300;
export interface AncientCasketDirectOwner256 {type:'ancient-casket';casketId:number}
export type AncientHeldPile256=Omit<MaterialPile,'owner'>&{owner:MaterialOwner|AncientCasketDirectOwner256};
/** These are original owned records. There is no generated NPC or presentation copy. */
export interface AncientCasketState256 {
 revision:1;groupId:number;contentsKnown:boolean;heldAt:number;
 humans:Pawn[];animals:WildAnimal[];items:AncientHeldPile256[];
}
export type AncientCasket256=Omit<Structure,'kind'>&{kind:typeof ANCIENT_CASKET_KIND_256;casket:AncientCasketState256};
export interface AncientCasketOpening256 {casketId:number;phase:'approach'|'opening';progressCore:number;lastWorkedAt:number}
export type AncientCasketPawn256=Pawn&{openCasket?:AncientCasketOpening256};
export type AncientCasketCommand256={type:'order-open-casket';pawnId:number;casketId:number};
/** One canonical clinical shape; this holder owns no second illness. */
export type {CryptosleepSickness256} from './cryptosleep-sickness-256.ts';
export const isAncientCasket256=(s:unknown):s is AncientCasket256=>!!s&&typeof s==='object'&&Object.getOwnPropertyDescriptor(s,'kind')?.value===ANCIENT_CASKET_KIND_256;
export const ancientCasketHasContents256=(s:AncientCasketState256)=>s.humans.length+s.animals.length+s.items.filter(p=>p.owner.type==='ancient-casket').length>0;
/** Original XML (1,0,0) offset, rotated around the Thing anchor. */
export function ancientCasketInteraction256(s:Pick<AncientCasket256,'x'|'z'|'orientation'>):Cell {
 const [dx,dz]=[[1,0],[0,-1],[-1,0],[0,1]][s.orientation]!;return {x:s.x+dx!,z:s.z+dz!};
}
/** Source order is kept. A known casket never causes a second group cascade. */
export function ancientCasketOpeningGroup256(all:readonly AncientCasket256[],target:AncientCasket256):AncientCasket256[] {
 if(target.casket.contentsKnown||target.casket.groupId===-1)return [target];
 return [target,...all.filter(s=>s!==target&&s.casket.groupId===target.casket.groupId&&!s.casket.contentsKnown)];
}
/** Pure ownership partition after the REAL Near plan. Failed drops keep their
 * original arrays/identities; possessions leave only with their original actor. */
export function partitionAncientNear256(s:AncientCasketState256,movedActorIds:ReadonlySet<number>,movedDirectItemIds:ReadonlySet<number>){
 const movedHumans=s.humans.filter(p=>movedActorIds.has(p.id)),movedAnimals=s.animals.filter(a=>movedActorIds.has(a.id));
 const movedItems=s.items.filter(i=>i.owner.type==='ancient-casket'?movedDirectItemIds.has(i.id):'pawnId'in i.owner&&movedActorIds.has(i.owner.pawnId));
 return {movedHumans,movedAnimals,movedItems,retainedHumans:s.humans.filter(p=>!movedActorIds.has(p.id)),retainedAnimals:s.animals.filter(a=>!movedActorIds.has(a.id)),retainedItems:s.items.filter(i=>!movedItems.includes(i))};
}
/** Read-only projection: biological age stays frozen, chronological age does not. */
export function ancientHeldHumanAge256(state:AncientCasketState256,pawn:Pawn,tick:number):Pawn['age'] {
 if(!state.humans.includes(pawn)||!Number.isSafeInteger(tick)||tick<state.heldAt)throw Error('Invalid actual suspended age query');
 if(!pawn.age)return undefined;
 const chronologicalTicks=pawn.age.chronologicalTicks+tick-state.heldAt;
 if(!Number.isSafeInteger(chronologicalTicks))throw Error('Chronological age exhausted');
 return {...pawn.age,chronologicalTicks};
}
/** This is a dependency refusal, never an empty/alternate generated pod. */
export const actualAncientPodProducer256=()=>({status:'blocked' as const,reason:'AncientSoldier/Slave PawnGeneration, local Ancients factions and Megascarab Manhunter are not composed; do not activate ScatterShrines.'});

const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
/** Bounded data-only admission, never JSON.stringify/getters as a raw guard. */
function dataOnly(value:unknown):boolean {
 const active=new Set<object>();let left=150000;
 const visit=(v:unknown,depth:number):boolean=>{
  if(--left<0||depth>24)return false;if(v===null||typeof v==='string'||typeof v==='boolean')return true;if(typeof v==='number')return Number.isFinite(v);
  if(typeof v!=='object'||active.has(v))return false;const array=Array.isArray(v);if(Object.getPrototypeOf(v)!==(array?Array.prototype:Object.prototype))return false;
  const keys=Reflect.ownKeys(v);if(array&&keys.length!==v.length+1)return false;active.add(v);
  for(const key of keys){const d=Object.getOwnPropertyDescriptor(v,key);if(typeof key!=='string'||!d||!('value'in d)||!d.enumerable&&!(array&&key==='length'))return false;if(array&&key==='length')continue;if(array&&(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=v.length)||!visit(d.value,depth+1))return false;}
  active.delete(v);return true;
 };return visit(value,0);
}
export function validAncientCasketState256(raw:unknown,version:number,tick:number):raw is AncientCasketState256 {
 if(!isSchema256Or257(version)||!integer(tick)||!dataOnly(raw)||!object(raw)||Reflect.ownKeys(raw).length!==7||!['revision','groupId','contentsKnown','heldAt','humans','animals','items'].every(k=>Object.hasOwn(raw,k)))return false;
 return raw.revision===1&&integer(raw.groupId,-1)&&typeof raw.contentsKnown==='boolean'&&integer(raw.heldAt,0,tick)&&Array.isArray(raw.humans)&&raw.humans.every(object)&&Array.isArray(raw.animals)&&raw.animals.every(object)&&Array.isArray(raw.items)&&raw.items.every(object);
}
/** Presence fence for RAW/full/delta entries, before any property read.
 * Header-only callers use MAX_SAFE_INTEGER; complete owner admission below
 * still checks heldAt against the actual confirmed map tick before adoption. */
export function validAncientCasketField256(value:unknown,version:number,tick=Number.MAX_SAFE_INTEGER,coreNow297?:number):boolean {
 if(!value||typeof value!=='object'||Array.isArray(value)||!validAncientCasketWickField256(value,version,tick,coreNow297))return false;
 const kind=Object.getOwnPropertyDescriptor(value,'kind'),field=Object.getOwnPropertyDescriptor(value,'casket');
 if(kind&&(!Object.hasOwn(kind,'value')||!kind.enumerable))return false;
 if(kind?.value!=='ancient-cryptosleep-casket')return !('casket'in value);
 return !!field&&Object.hasOwn(field,'value')&&field.enumerable===true&&validAncientCasketState256(field.value,version,tick);
}

/** Original local holder reads only. Complete clinical/item/namespace guards
 * are separate admission, never side effects of knowledge capture. */
export function ancientCasketHumanOwners256(c:AncientCasket256){return c.casket.humans.map(pawn=>({pawn,kind:'ancient-casket' as const,simulation:'frozen' as const,place:{kind:'ancient-casket' as const,casketId:c.id},validationTick:c.casket.heldAt,items:c.casket.items.filter((i):i is MaterialPile=>'pawnId'in i.owner&&i.owner.pawnId===pawn.id)}));}
export function ancientCasketHumanOwnersForWorld256(w:{schemaVersion:number;tick:number;phaseCore297?:number;structures:readonly unknown[]}){
 const out:ReturnType<typeof ancientCasketHumanOwners256>=[];
 for(const entry of w.structures){if(!entry||typeof entry!=='object')throw Error('Invalid actual structure before casket capture');if(!isAncientCasket256(entry)&&!('casket'in entry))continue;
  if(!validAncientCasketField256(entry,w.schemaVersion,w.tick,isCorePhysicalSchema297(w.schemaVersion)?effectiveCore297(w):undefined))throw Error('Invalid actual ancient casket before owner capture');
  out.push(...ancientCasketHumanOwners256(entry as unknown as AncientCasket256));
 }return out;
}

/** Until the actual destructive casket-content transaction exists, a removed
 * map must not archive loose aliases or silently destroy this live holder. */
export function ancientCasketMapRemovalBoundary256(w:{schemaVersion:number;tick:number;phaseCore297?:number;structures:readonly unknown[]}):string|null {
 for(const entry of w.structures){if(!entry||typeof entry!=='object')return 'Invalid actual structure before casket removal';if(!isAncientCasket256(entry)&&!('casket'in entry))continue;
  if(!validAncientCasketField256(entry,w.schemaVersion,w.tick,isCorePhysicalSchema297(w.schemaVersion)?effectiveCore297(w):undefined))return 'Invalid actual casket before map removal';
  if(ancientCasketHasContents256((entry as unknown as AncientCasket256).casket))return 'Actual nonempty casket destruction/contents transfer is not composed; original holder and map retained.';
 }return null;
}

export function validAncientOpening256(raw:unknown,version:number,tick:number,nextId:number):boolean {
 if(raw===undefined)return true;if(!isSchema256Or257(version)||!raw||typeof raw!=='object'||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype)return false;
 const keys=Reflect.ownKeys(raw);if(keys.length!==4||keys.some(k=>typeof k!=='string'||!['casketId','phase','progressCore','lastWorkedAt'].includes(k)||!Object.getOwnPropertyDescriptor(raw,k)?.enumerable||!('value'in Object.getOwnPropertyDescriptor(raw,k)!)))return false;
 const t=raw as AncientCasketOpening256;
 return Number.isSafeInteger(t.casketId)&&t.casketId>0&&t.casketId<nextId&&['approach','opening'].includes(t.phase)&&Number.isSafeInteger(t.progressCore)&&t.progressCore>=0&&t.progressCore<300&&t.progressCore%10===0&&(t.phase!=='approach'||t.progressCore===0)&&Number.isSafeInteger(t.lastWorkedAt)&&t.lastWorkedAt>=0&&t.lastWorkedAt<=tick;
}

export function validAncientOpeningField256(owner:unknown,version:number,tick:number,nextId:number):boolean {
 if(!owner||typeof owner!=='object'||Array.isArray(owner))return false;
 const d=Object.getOwnPropertyDescriptor(owner,'openCasket');if(!d)return !('openCasket'in owner);
 return Object.hasOwn(d,'value')&&d.enumerable===true&&d.value!==undefined&&validAncientOpening256(d.value,version,tick,nextId);
}
