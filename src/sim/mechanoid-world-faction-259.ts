import type {WorldFactionRegistry256} from './world-faction-state.ts';
export interface MechanicalWorldFaction259 {revision:1;factionId:number}
/** Header on the true original at birth only. Historical absence stays literal. */
export function validMechanicalWorldFactionField259(actor:object,version:number):boolean {
 const d=Object.getOwnPropertyDescriptor(actor,'worldFaction259');if(!d)return !('worldFaction259'in actor);
 if((version!==259&&version!==260&&(version!==261&&version!==262))||!d.enumerable||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object'||Object.getPrototypeOf(d.value)!==Object.prototype)return false;
 const v=d.value;if(Reflect.ownKeys(v).length!==2)return false;
 for(const k of ['revision','factionId']){const p=Object.getOwnPropertyDescriptor(v,k);if(!p?.enumerable||!Object.hasOwn(p,'value'))return false;}
 return v.revision===1&&Number.isSafeInteger(v.factionId)&&v.factionId>0;
}
export function validMechanicalWorldFaction259(actor:object,version:number,registry:WorldFactionRegistry256|undefined):boolean {
 if(!validMechanicalWorldFactionField259(actor,version))return false;
 const header=Object.getOwnPropertyDescriptor(actor,'worldFaction259')?.value as MechanicalWorldFaction259|undefined;
 return !header||!!registry?.factions.some(f=>f.id===header.factionId&&f.def==='Mechanoid');
}
/** Existing producers already require this true Core faction. Ordered first
 * is a declared deterministic selection when an incident admits several. */
export function actualMechanicalBirthFaction259(registry:WorldFactionRegistry256|undefined):MechanicalWorldFaction259|null {
 const faction=registry?.factions.find(f=>f.def==='Mechanoid');return faction?{revision:1,factionId:faction.id}:null;
}
