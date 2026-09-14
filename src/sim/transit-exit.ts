import { canStandAt } from './furniture-travel.ts';
import { footprintCells } from './definitions.ts';
import { canStep, routeToCell, routeCost } from './pathfinding.ts';
import { search, PLAN_INTERVAL, type NavigationGrid, type SearchBudget } from './work-planner.ts';
import { CIVIL_TRANSIT_BLOCKERS } from './travel.ts';
import { startTravel } from './movement.ts';
import { reservedServiceCells } from './service-reservations.ts';
import { wantsSleep } from './schedule.ts';
import { releaseWork } from './work-release.ts';
import type { World, Pawn, Cell } from './types.ts';

/** Finish a through-route or leave furniture physically after interruption.
 * Bed use is an explicit service exception. No pushing, teleport or lost cargo. */
export function leaveTransitCell(world:World,pawn:Pawn,getBlocked:NavigationGrid,budget:SearchBudget):boolean {
  if(world.schemaVersion<22)return false;
  if(canStandAt(world,pawn)){
    if(pawn.transitExit&&!pawn.need&&!pawn.haul&&!pawn.cooking&&pawn.jobId===null&&!pawn.recreation.task){pawn.path=[];pawn.state='idle';}
    delete pawn.transitExit;return false;
  }
  if(!pawn.need&&wantsSleep(world,pawn)&&world.structures.some(s=>s.id===pawn.bedId&&s.x===pawn.x&&s.z===pawn.z))return false;
  if(pawn.need?.kind==='sleep'&&pawn.need.bedId!==null&&pawn.need.target.x===pawn.x&&pawn.need.target.z===pawn.z){delete pawn.transitExit;return false;}
  if(pawn.need?.kind==='sleep'&&pawn.need.bedId===null||pawn.recreation.task&&pawn.recreation.task.target.x===pawn.x&&pawn.recreation.task.target.z===pawn.z||pawn.cooking&&pawn.cooking.spot.x===pawn.x&&pawn.cooking.spot.z===pawn.z) {
    if(!releaseWork(world,pawn))return true;
  }
  const blocked=getBlocked();let next=pawn.path[0];
  if(!next||!canStep(world,pawn,next,blocked,CIVIL_TRANSIT_BLOCKERS)) {
    if(pawn.planCooldown>0)return true;
    const reserved=reservedServiceCells(world,pawn.id),goals=new Set<number>();
    const add=(c:Cell)=>{if(canStandAt(world,c)&&!reserved.has(c.z*world.width+c.x))goals.add(c.z*world.width+c.x);};
    // The nearest standable exit of a connected furniture patch is on its
    // cardinal boundary under our solid-corner rule.
    for(const s of [...world.structures,...world.jobs])for(const c of footprintCells(s))for(const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0]])add({x:c.x+dx!,z:c.z+dz!});
    for(const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0]])add({x:pawn.x+dx!,z:pawn.z+dz!});
    const reach=search(world,pawn,blocked,CIVIL_TRANSIT_BLOCKERS,budget,goals);if(!reach)return true;
    pawn.planCooldown=PLAN_INTERVAL;let path:Cell[]|null=null;
    for(const i of goals){const p=routeToCell(world,{x:i%world.width,z:Math.floor(i/world.width)},reach);if(p&&(path===null||routeCost(world,p,reach)<routeCost(world,path,reach)))path=p;}
    if(!path?.length)return true;
    pawn.path=path;next=path[0];
  }
  if(next){pawn.transitExit=true;pawn.state='moving';startTravel(world,pawn,next);pawn.path.shift();}
  return true;
}
