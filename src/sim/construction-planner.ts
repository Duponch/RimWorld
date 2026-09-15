import { planFurnitureTransport } from './furniture-haul-planner.ts';
import { constructionSupplied } from './construction-materials.ts';
import { furnitureReady, furnitureWorkTarget } from './furniture-rules.ts';
import { CARRY_CAPACITY } from './definitions.ts';
import { constructionSiteFree, constructionHaulPriority, asBuilder, isConstruction, type ConstructionObstruction } from './construction-rules.ts';
import { reservedSource } from './materials.ts';
import { findAsideDestination } from './haul-aside.ts';
import { canReach, type SearchBudget } from './work-planner.ts';
import type { Reachability } from './pathfinding.ts';
import type { Cell, HaulDestination, Job, Pawn, World } from './types.ts';

export interface ConstructionCandidate {
  priority:number; rank:number; distance:number; id:number; target:Cell;
  whole?:true; job?:Job; clearance?:{resourceId:number;progress:number};
  sourceId?:number; quantity?:number; destination?:HaulDestination;
}
/** One intent owns clearing and building. Hauling reserves the obstruction and
 * its destination quantitatively; a plant stays alive until real cutting ends. */
export function constructionCandidates(world:World,pawn:Pawn,blocked:Uint8Array,reach:Reachability,budget:SearchBudget,obstacles:ReadonlyMap<number,ConstructionObstruction>,jobs:readonly Job[]=world.jobs):ConstructionCandidate[] {
  const result:ConstructionCandidate[]=[];
  if(!Number.isFinite(constructionHaulPriority(pawn)))return result;
  for(const job of jobs) {
    if(!isConstruction(job)||job.reservedBy!==null)continue;
    const obstacle=obstacles.get(job.id)!;const {plant,pile}=obstacle;
    const base={id:job.id,rank:1,distance:Math.abs(job.x-pawn.x)+Math.abs(job.z-pawn.z)};
    if(plant) {
      const target={x:plant.x,z:plant.z};
      if((pawn.priorities.build>0||job.kind==='install'&&pawn.priorities.haul>0)&&plant.kind!=='rock'&&canReach(world,target,reach,false))result.push({...base,priority:job.kind==='install'?constructionHaulPriority(pawn):pawn.priorities.build,target,job,clearance:{resourceId:plant.id,progress:0}});
    } else if(pile?.owner.type==='ground') {
      if(reservedSource(world,pile.id)>0||!canReach(world,pile.owner,reach,true))continue;
      const quantity=Math.min(CARRY_CAPACITY,pile.quantity),destination=findAsideDestination(world,pile.owner,pile.item,quantity,blocked,budget);
      if(destination)result.push({...base,priority:constructionHaulPriority(pawn),target:pile.owner,sourceId:pile.id,quantity,destination:{...destination,constructionId:job.id,forConstruction:asBuilder(pawn)}});
    } else if(obstacle.pack) {
      const candidate=planFurnitureTransport(world,pawn,obstacle.pack,blocked,reach,budget,job);if(candidate)result.push(candidate);
    } else if(job.kind==='install'&&Number.isFinite(constructionHaulPriority(pawn))&&furnitureReady(world,job,pawn)&&canReach(world,job,reach,false)&&canReach(world,furnitureWorkTarget(world,job),reach,false)) {
      result.push({...base,priority:constructionHaulPriority(pawn),target:furnitureWorkTarget(world,job),job});
    } else if(job.construction==='frame'&&pawn.priorities.build>0&&constructionSupplied(world,job)&&constructionSiteFree(world,job,pawn.id,obstacle)&&canReach(world,job,reach,false)) {
      result.push({...base,priority:pawn.priorities.build,target:job,job});
    }
  }
  return result;
}
