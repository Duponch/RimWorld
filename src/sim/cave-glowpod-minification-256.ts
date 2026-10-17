/** CompLifespan is not ticked inside the real minified wrapper. Its original
 * counter stays on the same building; installation resumes, never catches up. */
import type {Structure,World} from './types.ts';
/** Internal installation preflight only. It is NOT added to Command or
 * JobKind: a generated GlowPod cannot be built through Architecte. */
export type NaturalInstallPlan256=Omit<import('./types.ts').DesignateCommand,'kind'>&{kind:'glow-pod'};
import {validCaveHiveBuilding256} from './cave-hive-save-256.ts';
export function pauseGlowPod256(w:Pick<World,'schemaVersion'|'tick'>,s:Structure):void {
 if(s.kind!=='glow-pod')return;
 if(w.schemaVersion!==256||!s.glowPod)throw Error('Missing actual GlowPod component');
 s.glowPod.lastCore=w.tick*10;
}
export const resumeGlowPod256=pauseGlowPod256;
export function validGlowPodPacked256(value:unknown,version:number,h:Pick<World,'width'|'height'|'tick'|'nextId'>):boolean {
 if(!value||typeof value!=='object')return false;
 const kind=Object.getOwnPropertyDescriptor(value,'kind');if(!kind||!('value'in kind))return false;
 if(kind.value==='insect-hive')return false;
 return validCaveHiveBuilding256(value,version,h,true);
}
/** Faction authority is still checked against the real campaign registry by
 * the surrounding owner coordinator. No packed Hive or component alias. */
export function glowPodPackedFaction256(value:unknown,version:number):boolean {
 if(!value||typeof value!=='object')return false;
 const d=Object.getOwnPropertyDescriptors(value),kind=d.kind;
 return version===256&&!!kind&&'value'in kind&&kind.value==='glow-pod'&&Reflect.ownKeys(value).every(k=>typeof k==='string'&&'value'in d[k]!&&d[k]!.enumerable)&&!!d.factionId&&'value'in d.factionId&&(d.factionId.value===null||Number.isSafeInteger(d.factionId.value)&&d.factionId.value>0);
}
