import {isSchema271OrLater} from './schema-compatibility-257.ts';
import {isSchema256Or257} from './schema-compatibility-257.ts';
import type {BombInstigatorKey,TurretWick} from './mini-turret-state.ts';
import type {Structure,World} from './types.ts';

export const ANCIENT_CASKET_FLAME_RADIUS_256=Math.fround(2.66);
export interface AncientCasketWick256 extends TurretWick {}
export interface AncientCasketExplosion256 {ignoredThingKeys:string[];player271?:true}
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const key=(v:unknown):v is BombInstigatorKey=>typeof v==='string'&&/^(pawn|animal|mech|structure):[1-9]\d*$/.test(v)&&integer(Number(v.slice(v.indexOf(':')+1)),1);
function data(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.getOwnPropertyDescriptor(v,k)?.enumerable&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));}
/** A presence fence, including undefined/accessors and non-casket owners. The
 * duration is persisted, never redrawn by RAW/MAIN or owner reconstruction. */
export function validAncientCasketWickField256(owner:object,version:number,tick=Number.MAX_SAFE_INTEGER):boolean {
 const d=Object.getOwnPropertyDescriptor(owner,'casketWick');if(!d)return !('casketWick'in owner);
 if(!isSchema256Or257(version)||!Object.hasOwn(d,'value')||!d.enumerable||!(Object.getOwnPropertyDescriptor(owner,'kind')?.value==='ancient-cryptosleep-casket'||isSchema271OrLater(version)&&Object.getOwnPropertyDescriptor(owner,'kind')?.value==='cryptosleep-casket')||!data(d.value))return false;
 const w=d.value,keys=Object.keys(w);
 if(!keys.every(k=>['startedAtCore','endCore','instigatorKey'].includes(k))||!integer(w.startedAtCore)||!integer(w.endCore,w.startedAtCore+140,w.startedAtCore+150)||tick!==Number.MAX_SAFE_INTEGER&&(!Number.isSafeInteger(tick*10)||w.startedAtCore>tick*10||w.endCore<=tick*10))return false;
 if(Object.hasOwn(w,'instigatorKey')&&!key(w.instigatorKey))return false;
 // StartWick is reached only after actual HP<=RoundToInt(.2*250).
 const damage=Object.getOwnPropertyDescriptor(owner,'damage');return !!damage&&Object.hasOwn(damage,'value')&&integer(damage.value,200,249);
}
/** Borrowed by the existing ID-ordered combat/danger/render paths. */
export const actualBombWick256=(s:Structure):TurretWick|undefined=>s.kind==='ancient-cryptosleep-casket'||s.kind==='cryptosleep-casket'?s.casketWick:s.turret?.wick;
export const actualBombSourceRadius256=(s:Structure):number=>s.kind==='ancient-cryptosleep-casket'||s.kind==='cryptosleep-casket'?ANCIENT_CASKET_FLAME_RADIUS_256:3.9;
/** No relation/typed-ID reconstruction: this is the still-owned original
 * needed by Ancient.PreApplyDamage's non-null Faction predicate. A removed
 * projectile launcher is unknown, not an unfactioned Thing. */
export function ancientDamageInstigator256(w:World,k:BombInstigatorKey|undefined):{known:boolean;hasFaction:boolean}{
 if(k===undefined)return {known:true,hasFaction:false};const id=Number(k.slice(k.indexOf(':')+1));
 if(k.startsWith('pawn:'))return {known:w.pawns.some(p=>p.id===id),hasFaction:w.pawns.some(p=>p.id===id)};
 if(k.startsWith('animal:')){const a=w.wildlife?.animals.find(a=>a.id===id);return {known:!!a,hasFaction:!!a?.domestic};}
 if(k.startsWith('structure:')){const s=w.structures.find(s=>s.id===id);return {known:!!s&&Object.hasOwn(s,'factionId'),hasFaction:!!s&&s.factionId!==null&&s.factionId!==undefined};}
 // Mechanoid faction currently has no retained Faction owner in this model.
 return {known:false,hasFaction:false};
}
