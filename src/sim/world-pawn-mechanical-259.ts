import {validMechanoidShape} from './mechanoid-save.ts';
import {validMechanicalWorldFaction259} from './mechanoid-world-faction-259.ts';
import {cancelMelee} from './melee-state.ts';
import {cancelMechanoidRanged} from './mechanoid-ranged-state.ts';
import {medicalStatus} from './injury-state.ts';
import type {Mechanoid} from './mechanoid-state.ts';
import type {WorldPawnOwner256} from './world-pawn-state-256.ts';
import type {WorldFactionRegistry256} from './world-faction-state.ts';
export type MechanicalWorldPawn259=Extract<WorldPawnOwner256,{kind:'mechanical'}>;
/** Real StopDead/job interruptions. Physical recovery, stagger, stun and EMP
 * retain their original counters; no wall-clock expiry or clinical tick. */
export function cleanMapRemovedMechanical259(m:Mechanoid,tick:number):void {
 if(m.motion&&m.motion.end>tick){m.x=m.motion.from.x;m.z=m.motion.from.z;}
 delete m.motion;m.path=[];m.moveCooldown=0;m.planCooldown=0;
 // Parent fields were preflighted mutable. Copy tiny job records before their
 // existing notifiers so frozen nested snapshots cannot cause partial cleanup.
 if(m.melee)m.melee=structuredClone(m.melee);if(m.ranged)m.ranged=structuredClone(m.ranged);
 cancelMelee(m);cancelMechanoidRanged(m);delete m.meleeThreat;
 if(m.raid)m.raid={...m.raid,goal:null};if(m.temple)m.temple={...m.temple,goal:null};
 if(m.state!=='dead'&&m.state!=='downed')m.state='idle';
}
/** Shape reads the captured DeSpawn frontier for the native stance tracker.
 * Sparse mechanical health remains at its last real impact, <= that frontier. */
export function validMechanicalWorldPawn259(row:MechanicalWorldPawn259,version:number,registry?:WorldFactionRegistry256):boolean {
 const at=row.mechanicalTimersAtCore259,a=row.actor;
 if((version!==259&&version!==260&&version!==261)||!Number.isSafeInteger(at)||at<0||at%10||at>row.clockCore||row.mode==='mothballed'||row.items.length||row.packed.length||Object.hasOwn(row,'heldAtCore259')||Object.hasOwn(row,'entryKind259')||!a.worldFaction259||row.factionId!==a.worldFaction259.factionId||!validMechanicalWorldFaction259(a,version,registry))return false;
 if(!validMechanoidShape(a,version,at/10)||a.path.length||a.motion||a.moveCooldown||a.planCooldown||a.melee?.order||a.ranged?.order||a.ranged?.stance?.phase==='warmup'||a.meleeThreat||a.raid?.goal||a.temple?.goal)return false;
 const status=a.health?medicalStatus(a.health):'mobile';
 return status==='mobile'?a.state==='idle':a.state===status;
}
/** No age/needs/organic healing/RNG exist for this sparse mechanical model.
 * The clinical engine already returns unchanged on mechanical bodies. */
export function advanceMechanicalWorldPawn259(row:MechanicalWorldPawn259,toCore:number):string|null {
 if(!Number.isSafeInteger(toCore)||toCore%10||toCore-row.clockCore!==10||row.mode!=='active'||row.items.length||row.packed.length||!Number.isSafeInteger(row.mechanicalTimersAtCore259)||row.mechanicalTimersAtCore259<0||row.mechanicalTimersAtCore259%10||row.mechanicalTimersAtCore259>row.clockCore)return 'Invalid actual mechanical WorldPawn frontier';
 row.clockCore=toCore;return null;
}
