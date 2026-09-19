import { CLOTHING_RESEARCH_COST,clothingUnlocked } from './research.ts';
import { cookingSpot } from './cooking-bills.ts';
import { canStandAt } from './furniture-travel.ts';
import type { World } from './types.ts';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
export function validateResearch(world:World,version:number):string[]{
  const errors:string[]=[],state=world.research;
  if(state!==undefined&&(!record(state)||version<73||Object.keys(state).some(k=>!['project','points','completedAt'].includes(k))||state.project!==null&&state.project!=='complex-clothing'||!int(state.points,0,CLOTHING_RESEARCH_COST)
    ||(state.completedAt!==undefined? !int(state.completedAt,0,world.tick)||state.project!==null||state.points!==CLOTHING_RESEARCH_COST : state.points===CLOTHING_RESEARCH_COST)))errors.push('Invalid research project.');
  const stations=new Set<number>();
  for(const pawn of world.pawns){
    if(version<73?pawn.priorities.research!==undefined:!int(pawn.priorities.research,0,4))errors.push('Invalid or future research priority.');
    const task=pawn.research;if(task===undefined)continue;
    if(version<73||!record(task)||Object.keys(task).some(k=>!['stationId','spot','worked'].includes(k))||!int(task.stationId,1)||!record(task.spot)||!int(task.spot.x,0,world.width-1)||!int(task.spot.z,0,world.height-1)||!int(task.worked,0,399)){errors.push('Invalid research task.');continue;}
    const station=world.structures.find(s=>s.id===task.stationId&&s.kind==='research-bench'),spot=station&&cookingSpot(station);
    if(!station||!spot||spot.x!==task.spot.x||spot.z!==task.spot.z||!canStandAt(world,task.spot)||stations.has(task.stationId)||!state?.project||pawn.priorities.research===0
      ||pawn.heatRefuge||pawn.jobId!==null||pawn.haul||pawn.cooking||pawn.need||pawn.recreation.task||pawn.tend||pawn.feed||pawn.rescue||pawn.equipmentTask||pawn.draft||pawn.shooting||pawn.flee||pawn.tactics||pawn.melee||pawn.raid||pawn.mental?.crisis||!['moving','working'].includes(pawn.state)||pawn.orders.active!==null)errors.push('Invalid research ownership.');
    if(pawn.state==='working'&&(pawn.x!==task.spot.x||pawn.z!==task.spot.z||pawn.path.length))errors.push('Research working away from its station.');
    stations.add(task.stationId);
  }
  if(version>=73&&!clothingUnlocked(world)&&[...world.structures,...world.jobs,...world.packed.map(p=>p.building)].some(s=>s.kind==='tailor-bench'))errors.push('Locked tailoring bench.');
  return errors;
}
