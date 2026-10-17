import type {MedicalRecord} from './injury-types.ts';
const f=Math.fround,year=3600000;
/** Only the real prospective Human Adult-development stages (13..18, 18+).
 * This scalar is a current physiological projection, never a second age. */
export function nativeHumanHealthScaleForCore256(coreAge:number):number {
 if(!Number.isSafeInteger(coreAge)||coreAge<13*year)throw Error('Actual native Human Adult age required');
 return Math.floor(coreAge/year)<18?f(.9):1;
}
/** Descriptor-safe isolated header; the Pawn guard MUST also compare the
 * actual nativeHuman biological age. Absence never invents provenance. */
export function validHumanHealthScaleHeader256(record:unknown,version:number,human=true):boolean {
 if(record===undefined)return true;
 if(!record||typeof record!=='object'||Array.isArray(record))return false;
 const d=Object.getOwnPropertyDescriptor(record,'humanHealthScale');
 return !d?!('humanHealthScale'in record):version===256&&human&&!Object.hasOwn(record,'ageAilments')&&'value'in d&&d.enumerable===true&&(Object.is(d.value,f(.9))||d.value===1);
}
export function validNativeHumanClinicalScale256(record:unknown,version:number,coreAge?:number):boolean {
 if(!validHumanHealthScaleHeader256(record,version))return false;
 if(coreAge===undefined)return record===undefined||!Object.hasOwn(record as object,'humanHealthScale');
 if(version!==256||!record||typeof record!=='object'||Array.isArray(record)||Object.hasOwn(record,'body'))return false;
 if(!Number.isSafeInteger(coreAge)||coreAge<13*year)return false;
 return Object.getOwnPropertyDescriptor(record,'humanHealthScale')?.value===nativeHumanHealthScaleForCore256(coreAge);
}
/** Called at the SAME original's biological age change, before clinical
 * consumers. Construction provides the initial dossier; no lazy migration. */
export function syncNativeHumanClinicalScale256(pawn:{health?:MedicalRecord},coreAge:number):void {
 const h=pawn.health;if(!h||!Object.hasOwn(h,'humanHealthScale')||h.body!==undefined)throw Error('Native Human lost its actual clinical owner');
 const scale=nativeHumanHealthScaleForCore256(coreAge);if(h.humanHealthScale!==scale)h.humanHealthScale=scale;
}
