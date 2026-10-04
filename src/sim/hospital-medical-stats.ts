import { isBedKind } from './bed-kinds.ts';
import { carrierOf } from './rescue-state.ts';
import type { Pawn,Structure,World } from './types.ts';

/** Current physical service only. A reservation, journey or carried body is
 * not a bed use. Callers already resolving the carrier can supply that result. */
export function currentMedicalBed(world:World,pawn:Pawn,carried=!!carrierOf(world,pawn.id)):Structure|undefined {
  const need=pawn.need;
  if(carried||pawn.state==='dead'||pawn.health?.death||pawn.moveCooldown!==0||pawn.motion&&pawn.motion.end>world.tick||
    !['sleeping','resting','downed'].includes(pawn.state)||need?.kind!=='sleep'||need.phase!=='sleep'||need.bedId===null)return;
  return world.structures.find(bed=>bed.id===need.bedId&&isBedKind(bed.kind)&&(bed.kind!=='hospital-bed'||world.schemaVersion>=187)&&bed.x===pawn.x&&bed.z===pawn.z);
}
/** Definition statistics independent of role, material and quality. Quality
 * is applied separately by the existing comfort/rest/surgery consumers. */
type BedDefinition=Pick<Structure,'kind'>;
export const bedTendOffset=(bed:BedDefinition|undefined):number=>bed?.kind==='hospital-bed'?.1:0;
export const bedImmunityFactor=(bed:BedDefinition):1.07|1.11=>bed.kind==='hospital-bed'?1.11:1.07;
export const bedHealPerDay=(bed:BedDefinition):4|10=>bed.kind==='hospital-bed'?10:4;
export const bedSurgeryFactor=(bed:BedDefinition):number=>bed.kind==='hospital-bed'?1.1:1;
