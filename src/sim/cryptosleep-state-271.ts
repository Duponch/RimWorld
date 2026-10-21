import {isSchema271OrLater} from './schema-compatibility-257.ts';
import type {Cell,MaterialPile,Pawn,Structure} from './types.ts';
import type {PackedFurniture} from './furniture-rules.ts';

/** One original human and their possessions. No generated replacement, loose
 * loot, duplicated map pawn, electrical state or item minification. */
export interface CryptosleepHolder271 {
 revision:1;
 heldAt:number;
 human:Pawn|null;
 items:MaterialPile[];
 packed:PackedFurniture[];
}
export type PlayerCasket271=Omit<Structure,'kind'>&{
 kind:'cryptosleep-casket';cryptosleep:CryptosleepHolder271;
};
export const CRYPTOSLEEP_ENTER_CORE_271=500;
export const CRYPTOSLEEP_OPEN_CORE_271=300;
/** The patient remains a real local pawn until the closing commit. A carried
 * relation is derived from this task, never from a second copied Pawn. */
export interface CryptosleepTask271 {
 casketId:number;
 action:'enter'|'carry'|'open';
 phase:'approach'|'pickup'|'carry'|'closing'|'opening';
 patientId?:number;
 progressCore:number;
 lastWorkedAt:number;
}
export type CryptosleepCommand271=
 |{type:'order-enter-cryptosleep';pawnId:number;casketId:number;confirmLastColonist?:true}
 |{type:'order-carry-cryptosleep';pawnId:number;patientId:number;casketId:number}
 |{type:'order-open-cryptosleep';pawnId:number;casketId:number};
export const newCryptosleepHolder271=(tick:number):CryptosleepHolder271=>{
 if(!Number.isSafeInteger(tick)||tick<0)throw Error('Invalid actual casket construction tick');
 return {revision:1,heldAt:tick,human:null,items:[],packed:[]};
};
export const isPlayerCasket271=(s:unknown):s is PlayerCasket271=>!!s&&typeof s==='object'
 &&Object.getOwnPropertyDescriptor(s,'kind')?.value==='cryptosleep-casket';
/** Resolved Core interaction offset, rotated around the structure anchor. */
export function cryptosleepInteraction271(s:Pick<PlayerCasket271,'x'|'z'|'orientation'>):Cell {
 const [dx,dz]=[[1,0],[0,-1],[-1,0],[0,1]][s.orientation]!;
 return {x:s.x+dx!,z:s.z+dz!};
}

const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
/** Inspect descriptors before reading a prospective holder. No accessors,
 * cycles, class instances or hidden state can enter the authoritative owner. */
function dataOnly271(value:unknown):boolean {
 let budget=150000;const active=new Set<object>();
 const visit=(v:unknown,depth:number):boolean=>{
  if(--budget<0||depth>24)return false;
  if(v===null||typeof v==='string'||typeof v==='boolean')return true;
  if(typeof v==='number')return Number.isFinite(v);
  if(typeof v!=='object'||active.has(v))return false;
  const array=Array.isArray(v);if(Object.getPrototypeOf(v)!==(array?Array.prototype:Object.prototype))return false;
  const keys=Reflect.ownKeys(v);if(array&&keys.length!==v.length+1)return false;active.add(v);
  for(const key of keys){
   const descriptor=Object.getOwnPropertyDescriptor(v,key);
   if(typeof key!=='string'||!descriptor||!('value'in descriptor)||!descriptor.enumerable&&!(array&&key==='length'))return false;
   if(array&&key==='length')continue;
   if(array&&(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=v.length)||!visit(descriptor.value,depth+1))return false;
  }
  active.delete(v);return true;
 };return visit(value,0);
}
export function validCryptosleepField271(value:unknown,version:number,tick:number):boolean {
 if(!object(value))return false;
 const kind=Object.getOwnPropertyDescriptor(value,'kind'),field=Object.getOwnPropertyDescriptor(value,'cryptosleep');
 if(kind&&(!Object.hasOwn(kind,'value')||!kind.enumerable))return false;
 if(kind?.value!=='cryptosleep-casket')return !('cryptosleep'in value);
 if(!isSchema271OrLater(version)||!integer(tick)||!field||!field.enumerable||!Object.hasOwn(field,'value')||!dataOnly271(field.value)||!object(field.value))return false;
 const state=field.value;
 return Reflect.ownKeys(state).length===5&&['revision','heldAt','human','items','packed'].every(k=>Object.hasOwn(state,k))
  &&state.revision===1&&integer(state.heldAt,0,tick)&&(state.human===null||object(state.human))
  &&Array.isArray(state.items)&&state.items.length<=32768&&Array.isArray(state.packed)&&state.packed.length<=32768&&(state.human!==null||state.items.length===0&&state.packed.length===0);
}
export function cryptosleepHumanOwnersForWorld271(w:{schemaVersion:number;tick:number;structures:readonly unknown[]}){
 const result:{pawn:Pawn;kind:'player-casket';simulation:'frozen';place:{kind:'player-casket';casketId:number};validationTick:number;items:readonly MaterialPile[];packed:readonly PackedFurniture[]}[]=[];
 for(const s of w.structures){
  if(!isPlayerCasket271(s)&&!(s&&typeof s==='object'&&'cryptosleep'in s))continue;
  if(!validCryptosleepField271(s,w.schemaVersion,w.tick))throw Error('Invalid actual player casket before owner capture');
  const c=s as PlayerCasket271,p=c.cryptosleep.human;
  if(p)result.push({pawn:p,kind:'player-casket',simulation:'frozen',place:{kind:'player-casket',casketId:c.id},validationTick:c.cryptosleep.heldAt,items:c.cryptosleep.items,packed:c.cryptosleep.packed});
 }
 return result;
}
