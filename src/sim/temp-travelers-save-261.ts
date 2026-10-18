import {tempMapAdoptedAtCore261,tempMapModern261} from './temp-map-incidents-261.ts';
import type {World} from './types.ts';
const ownData=(v:object,k:string)=>{const d=Object.getOwnPropertyDescriptor(v,k);return !!d&&d.enumerable&&Object.hasOwn(d,'value');};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function dataGraph(v:unknown,seen=new Set<object>()):boolean {
 if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return true;
 if(!v||typeof v!=='object'||seen.has(v))return false;
 const array=Array.isArray(v);if(!array&&Object.getPrototypeOf(v)!==Object.prototype)return false;
 const keys=Reflect.ownKeys(v);if(keys.some(k=>typeof k!=='string'))return false;
 if(array&&(keys.length!==v.length+1||!keys.includes('length')||Array.from({length:v.length},(_,i)=>String(i)).some(k=>!ownData(v,k))))return false;
 seen.add(v);
 for(const k of keys){if(array&&k==='length')continue;if(!ownData(v,String(k))||!dataGraph(Object.getOwnPropertyDescriptor(v,k)!.value,seen)){seen.delete(v);return false;}}
 seen.delete(v);return true;
}
/** Strict RAW header: no inherited, accessor, hidden, symbol, undefined or
 * home-agenda slot is a TempMap visitor calendar. Archives keep their existing
 * validators and global identity namespace. Historical versions reject it. */
export function validTempTravelerHeader261(v:unknown,w:World,version:number):boolean {
 if(version!==261||!v||typeof v!=='object'||Object.getPrototypeOf(v)!==Object.prototype||!tempMapModern261(w))return false;
 const names=['profile','adoptedAt','rng','serial','groups','departed'];
 if(Reflect.ownKeys(v).length!==names.length||!names.every(k=>ownData(v,k)))return false;
 const s=v as Record<string,unknown>,adopted=tempMapAdoptedAtCore261(w);
 return s.profile==='temp-travelers261-v1'&&adopted!==undefined&&typeof s.adoptedAt==='number'&&Number.isSafeInteger(s.adoptedAt)&&s.adoptedAt>=adopted/10&&s.adoptedAt<=w.tick
  &&typeof s.rng==='number'&&Number.isSafeInteger(s.rng)&&s.rng>0&&s.rng<=0xffffffff
  &&typeof s.serial==='number'&&Number.isSafeInteger(s.serial)&&s.serial>=1
  &&Array.isArray(s.groups)&&s.groups.length<=w.width*w.height&&dataGraph(s.groups)&&s.groups.every(g=>record(g)&&Array.isArray(g.members)&&record(g.entry)&&record(g.spot))
  &&Array.isArray(s.departed)&&s.departed.length<=w.width*w.height&&dataGraph(s.departed)&&s.departed.every(d=>record(d)&&record(d.pawn)&&record(d.pawn.visitor)&&Array.isArray(d.pawn.visitor.personalFoodIds));
}
/** Adoption happens in the outer prepass before the campaign tick increments.
 * Validate dormant pending dates against that last confirmed tick. All
 * other group, archive and actor chronology is validated at the current tick. */
export function visitorAgendaClock261(w:World,version:number):number {
 const core=version>=261&&tempMapModern261(w)?tempMapAdoptedAtCore261(w):undefined;
 return core===undefined?w.tick:core/10;
}
