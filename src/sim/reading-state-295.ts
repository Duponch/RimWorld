import {isColonist} from './affiliation.ts';
import {pawnBody} from './health-rules.ts';
import {TICKS_PER_DAY} from './types.ts';
import type {Cell,Pawn} from './types.ts';

export const READING_POLICIES_295=Object.freeze([Object.freeze({id:1 as const,label:'Romans autorisés'}),Object.freeze({id:2 as const,label:'Aucune lecture'})]);
export const READING_AUTO_DURATION295=800;
export const READING_MANUAL_DURATION295=500;
export interface ReadingTask295 {
 activity:'read';bookId:number;stage:'pickup'|'seat'|'read'|'return';phase:'travel'|'active';
 target:Cell;buildingId:number|null;seatId?:number;elapsed:number;manual?:true;patientId?:never;partyStartedAtCore?:never;
}
/** Missing policy remains neutral: inspection and old saves never acquire state. */
export const effectiveReadingPolicy295=(pawn:Pick<Pawn,'readingPolicy295'>):1|2=>pawn.readingPolicy295??1;
export const readingDuration295=(task:Pick<ReadingTask295,'manual'>):number=>task.manual?READING_MANUAL_DURATION295:READING_AUTO_DURATION295;
export const readingActive295=(pawn:Pick<Pawn,'state'|'recreation'>):boolean=>pawn.state==='recreating'&&pawn.recreation.task?.activity==='read'&&pawn.recreation.task.stage==='read'&&pawn.recreation.task.phase==='active';
/** Represented human actors only; no new child stage or intellectual admission. */
export function readingAllowed295(pawn:Pawn,manual=false):boolean {
 if(!isColonist(pawn)||pawn.prisoner||pawn.visitor||pawn.state==='dead'||pawn.state==='downed'||pawn.draft||pawn.mental?.crisis||pawn.burning||pawn.cryptosleepHeldAt271!==undefined||pawn.shipCryptosleepHeldAt277!==undefined||pawn.age&&pawn.age.biologicalTicks<3*60*TICKS_PER_DAY)return false;
 const body=pawnBody(pawn);
 return body.capacities.sight>0&&body.capacities.manipulation>0&&body.capacities.consciousness>=.3&&(manual||effectiveReadingPolicy295(pawn)===1);
}
/** Humans currently represented use Hungry at24%, plus Core's five-point margin. */
export const readingAutoNeeds295=(pawn:Pick<Pawn,'hunger'|'rest'>):boolean=>pawn.hunger>=29&&pawn.rest>=33;
