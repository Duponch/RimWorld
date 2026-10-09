import { isBedKind } from './bed-kinds.ts';
import { carrierOf } from './rescue-state.ts';
import { activeVitalsMonitor } from './vitals-monitor.ts';
import type { Pawn,Structure,World } from './types.ts';

/** Current physical service only. A reservation, journey or carried body is
 * not a bed use. Callers already resolving the carrier can supply that result. */
export function currentMedicalBed(world:World,pawn:Pawn,carried=!!carrierOf(world,pawn.id)):Structure|undefined {
  const need=pawn.need;
  if(carried||pawn.state==='dead'||pawn.health?.death||pawn.moveCooldown!==0||pawn.motion&&pawn.motion.end>world.tick||
    !['sleeping','resting','downed'].includes(pawn.state)||need?.kind!=='sleep'||need.phase!=='sleep'||need.bedId===null)return;
  return world.structures.find(bed=>bed.id===need.bedId&&isBedKind(bed.kind)&&(bed.kind!=='hospital-bed'||world.schemaVersion>=187)&&bed.x===pawn.x&&bed.z===pawn.z);
}
/** Quality remains a separate consumer factor. With a World, a current powered
 * facility adds offsets to the hospital bed's definition statistics once. */
type BedDefinition=Pick<Structure,'kind'>&Partial<Pick<Structure,'id'>>;
function monitored(bed:BedDefinition,world:World|undefined):boolean {
  if(!world||bed.kind!=='hospital-bed'||bed.id===undefined)return false;
  const current=world.structures.find(s=>s.id===bed.id&&s.kind==='hospital-bed');
  return !!current&&!!activeVitalsMonitor(world,current);
}
export const bedTendOffset=(bed:BedDefinition|undefined,world?:World):number=>bed?.kind==='hospital-bed'?(monitored(bed,world)?.17:.1):0;
export const bedImmunityFactor=(bed:BedDefinition,world?:World):1.07|1.11|1.13=>bed.kind==='hospital-bed'?(monitored(bed,world)?1.13:1.11):1.07;
export const bedHealPerDay=(bed:BedDefinition):4|10=>bed.kind==='hospital-bed'?10:4;
export const bedSurgeryFactor=(bed:BedDefinition,world?:World):number=>bed.kind==='hospital-bed'?(monitored(bed,world)?1.15:1.1):1;
