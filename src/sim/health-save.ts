import { medicalStatus } from './injury-state.ts';
import { pawnBody } from './health-rules.ts';
import type { World } from './types.ts';

/** Called after the isolated records and ordinary pawn shapes are validated. */
export function validatePawnHealth(world:World):string[] {
  const errors:string[]=[];
  for(const p of world.pawns) {
    if(p.medicalSleep&&((p.state!=='downed'&&p.state!=='resting')||p.moveCooldown>0))errors.push('Invalid medical sleep posture.');
    const h=p.health;
    if(!h){if(p.state==='downed'||p.state==='dead')errors.push('Medical state without a medical record.');continue;}
    if(h.death?h.tick>world.tick:h.tick!==world.tick)errors.push('Medical clock does not match the world.');
    const status=medicalStatus(h),stopped=status!=='mobile';
    if(stopped?p.state!==status:p.state==='downed'||p.state==='dead')errors.push('Inconsistent medical state.');
    if((stopped||pawnBody(p).capacities.manipulation===0)&&(p.hunting||p.research||p.equipmentTask||p.jobId!==null||p.ward||p.feed||p.tend||p.rescue||p.haul||p.cooking||p.orders.active!==null||p.orders.queue.length||p.priorityWork))errors.push('Incapacitated pawn still owns work.');
    if(stopped&&(p.heatRefuge||p.path.length||p.recreation.task||p.transitExit||p.collapsePending||p.restZeroTicks||p.need&&(status==='dead'||p.need.kind!=='sleep'||p.need.phase!=='sleep'||p.need.bedId===null)))errors.push('Invalid incapacitated activity.');
  }
  return errors;
}
