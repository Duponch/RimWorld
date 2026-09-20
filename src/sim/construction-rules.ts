import { conduitKeepsPlant } from './power-construction.ts';
import { furnitureWorkTarget } from './furniture-rules.ts';
import { clearsGroundItems } from './occupancy.ts';
import { footprintCells, STRUCTURE_DEFINITIONS } from './definitions.ts';
import type { Cell, HaulDestination, Job, MaterialPile, Pawn, Resource, World } from './types.ts';
import { serviceCell } from './service-reservations.ts';

export const isConstruction = (job: Pick<Job,'kind'>): boolean => job.kind==='install'||job.kind in STRUCTURE_DEFINITIONS;
export const containsCell = (job: Job, cell: Cell): boolean => footprintCells(job).some(c=>c.x===cell.x&&c.z===cell.z);
/** Old saves are validated with the old solid-plan contract before migration. */
export const jobBlocksTransit = (world: World, job: Job): boolean => world.schemaVersion<16&&(job.kind==='wall'||job.kind==='table');
export const constructionWorkTarget = (world: World, job: Job): Cell => job.clearance ? world.resources.find(r=>r.id===job.clearance!.resourceId)??job : furnitureWorkTarget(world,job);
export const constructionHaulId = (destination: HaulDestination): number|undefined => destination.type==='job'?destination.jobId:destination.type==='aside'?destination.constructionId:undefined;
export const constructionHaulPriority = (pawn: Pawn): number => Math.min(pawn.priorities.build||Infinity,pawn.priorities.haul||Infinity);
export const asBuilder = (pawn: Pawn): boolean => pawn.priorities.build>0&&pawn.priorities.build<= (pawn.priorities.haul||Infinity);

export interface ConstructionObstruction { plant?:Resource; pile?:MaterialPile; pack?:import('./furniture-rules.ts').PackedFurniture }
/** One synchronous planner decision. Keep array ordering for multi-cell sites,
 * and discard this index before any transfer, cutting or construction occurs. */
export function constructionObstructions(world:World):ReadonlyMap<number,ConstructionObstruction> {
  const sites=new Map<number,number[]>(),result=new Map<number,ConstructionObstruction>(),clearItems=new Set<number>();
  for(const job of world.jobs)if(isConstruction(job)) {
    result.set(job.id,{});if(clearsGroundItems(world,job.furniture?.kind??job.kind))clearItems.add(job.id);
    for(const c of footprintCells(job)) {
      const cell=c.z*world.width+c.x,ids=sites.get(cell)??[];
      ids.push(job.id);sites.set(cell,ids);
    }
  }
  if(!sites.size)return result;
  for(const resource of world.resources)for(const id of sites.get(resource.z*world.width+resource.x)??[])if(!conduitKeepsPlant(world.jobs.find(j=>j.id===id)!.kind,resource.kind))result.get(id)!.plant??=resource;
  for(const pile of world.piles)if(pile.owner.type==='ground')for(const id of sites.get(pile.owner.z*world.width+pile.owner.x)??[])if(clearItems.has(id))result.get(id)!.pile??=pile;
  for(const pack of world.packed??[])if(pack.owner.type==='ground')for(const id of sites.get(pack.owner.z*world.width+pack.owner.x)??[])if(clearItems.has(id)&&world.jobs.find(j=>j.id===id)?.furniture?.structureId!==pack.building.id)result.get(id)!.pack??=pack;
  return result;
}
export function constructionObstruction(world: World, job: Job):ConstructionObstruction {
  const cells=new Set(footprintCells(job).map(c=>c.z*world.width+c.x));
  const plant=world.resources.find(r=>cells.has(r.z*world.width+r.x)&&!conduitKeepsPlant(job.kind,r.kind));
  const pile=clearsGroundItems(world,job.furniture?.kind??job.kind)?world.piles.find(p=>p.owner.type==='ground'&&cells.has(p.owner.z*world.width+p.owner.x)):undefined;
  const pack=(job.kind==='sow'||clearsGroundItems(world,job.furniture?.kind??job.kind))?world.packed?.find(p=>p.owner.type==='ground'&&cells.has(p.owner.z*world.width+p.owner.x)&&p.building.id!==job.furniture?.structureId):undefined;
  return {plant,pile,pack};
}
/** A frame is traversable. Completion must not materialize a building across
 * a person, an active edge (including its diagonal corner), or a service. */
export function constructionSiteFree(world: World, job: Job, workerId?: number, obstacle=constructionObstruction(world,job)): boolean {
  if(obstacle.plant||obstacle.pile||obstacle.pack)return false;
  const cells=footprintCells(job);
  if(world.wildlife?.animals.some(a=>cells.some(c=>{
    const m=a.motion;return a.x===c.x&&a.z===c.z||!!m&&m.end>world.tick&&c.x>=Math.min(m.from.x,m.to.x)&&c.x<=Math.max(m.from.x,m.to.x)&&c.z>=Math.min(m.from.z,m.to.z)&&c.z<=Math.max(m.from.z,m.to.z);
  })))return false;
  return !world.pawns.some(p=>p.id!==workerId&&cells.some(c=>{
    const edge=p.motion;
    const service=serviceCell(p);
    return p.x===c.x&&p.z===c.z || service?.x===c.x&&service.z===c.z || !!edge&&edge.end>world.tick&&c.x>=Math.min(edge.from.x,edge.to.x)&&c.x<=Math.max(edge.from.x,edge.to.x)&&c.z>=Math.min(edge.from.z,edge.to.z)&&c.z<=Math.max(edge.from.z,edge.to.z);
  }));
}
