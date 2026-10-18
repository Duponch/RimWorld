import {raidGroup261,raidKidnapSource261} from './temp-map-raids-261.ts';
import {physicalKidnapReason261,kidnapRecoveredAwake261,type RaiderKidnap261} from './caravan-kidnap-261.ts';
import {sameRescueEdge} from './rescue-save.ts';
import type {World} from './types.ts';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>{const d=Object.getOwnPropertyDescriptor(v,k)!;return typeof k==='string'&&d.enumerable&&Object.hasOwn(d,'value');});
/** Use also on dormant/archive raw raid fields before migration. A missing
 * optional field is neutral; ownundefined/hidden/inherited/accessor is not. */
export function validRaiderKidnapField261(raid:object,version:number):boolean {
 const d=Object.getOwnPropertyDescriptor(raid,'kidnap261');if(!d)return !('kidnap261'in raid);
 if(version!==261||!d.enumerable||!Object.hasOwn(d,'value')||!record(d.value))return false;const t=d.value;
 return Reflect.ownKeys(t).length===2&&Object.hasOwn(t,'patientId')&&Object.hasOwn(t,'phase')&&Number.isSafeInteger(t.patientId)&&Number(t.patientId)>0&&(t.phase==='approach'||t.phase==='carry');
}
/** Additional closed-domain cross references. The ordinary raid validator must
 * admit the new key ONLY for261 and relax exiting only for this valid carry. */
export function validatePhysicalKidnaps261(w:World,version:number):string[] {
 const errors:string[]=[],patients=new Set<number>();
 for(const carrier of w.pawns){if(!carrier.raid)continue;const descriptor=Object.getOwnPropertyDescriptor(carrier.raid,'kidnap261');
  if(!descriptor){if('kidnap261'in carrier.raid)errors.push('Inherited raider kidnapping reference.');continue;}
  if(version!==261||!descriptor.enumerable||!Object.hasOwn(descriptor,'value')){errors.push('Invalid or future raider kidnapping reference.');continue;}
  const raw=descriptor.value;
  if(!record(raw)||Reflect.ownKeys(raw).length!==2||!Object.hasOwn(raw,'patientId')||!Object.hasOwn(raw,'phase')||!Number.isSafeInteger(raw.patientId)||Number(raw.patientId)<1||raw.phase!=='approach'&&raw.phase!=='carry'){errors.push('Invalid or future raider kidnapping reference.');continue;}
  const t=raw as unknown as RaiderKidnap261;
  const patient=w.pawns.find(p=>p.id===t.patientId),a=raidGroup261(w,carrier.raid?.group),source=raidKidnapSource261(a);
  if(!patient||patient===carrier||patients.has(t.patientId)||!a||!source||a.id!==carrier.raid?.group||!a.members.includes(carrier.id)||carrier.worldAffiliation259?.factionId!==source.factionId||patient.worldAffiliation259?.factionId!==w.worldFactions?.playerFactionId||physicalKidnapReason261(w,carrier,patient,t.phase==='carry')){errors.push('Invalid, duplicate or unowned kidnapping victim.');continue;}
  patients.add(t.patientId);
  if(t.phase==='approach'){if(carrier.raid!.exiting||patient.state!=='downed')errors.push('Invalid physical kidnapping approach.');continue;}
  if(!carrier.raid!.exiting||patient.need!==null||patient.path.length||patient.medicalSleep||kidnapRecoveredAwake261(patient)||carrier.x!==patient.x||carrier.z!==patient.z||carrier.moveCooldown!==patient.moveCooldown||!sameRescueEdge(carrier.motion,patient.motion))errors.push('Kidnapping passenger differs from its real carrier edge.');
 }
 return errors;
}
