import { handlingStepDuration } from '../sim/animal-handling';
import { isColonist } from '../sim/affiliation';
import { INGEST_TICKS } from '../sim/eating';
import { FEED_TICKS } from '../sim/feeding-rules';
import { FILTH_DEFINITIONS } from '../sim/filth-rules';
import { jobDuration } from '../sim/farming';
import { clearingDuration } from '../sim/gathering';
import { productionTaskTotal } from '../sim/production-recipes';
import { workProgress } from '../sim/work-progress';
import { PRISON_RAPPORT_TICKS } from '../sim/prisoner-state';
import type { Cell, Job, Pawn, Resource, World } from '../sim/types';

export interface ActionProgress {
  kind: 'job'|'clearing'|'production'|'ingestion'|'feeding'|'tending'|'warden'|'cleaning'|'hunting'|'handling';
  completed: number;
  total: number;
  fraction: number;
}

export interface ActionLookup {
  /** Ephemeral snapshot indices. The large resource index is built only if a
   * colon is actually clearing a plant before construction. */
  jobs?:ReadonlyMap<number,Job>;
  resources?:ReadonlyMap<number,Resource>;
  resourceCells?:ReadonlyMap<number,Resource>;
}

const measured=(kind:ActionProgress['kind'],completed:number,total:number):ActionProgress|undefined=>
  Number.isFinite(completed)&&Number.isFinite(total)&&total>0
    ?{kind,completed,total,fraction:Math.max(0,Math.min(1,completed/total))}:undefined;

/** Only work with a persisted counter and a known completion threshold gets a
 * bar. Waiting, travel, sleep, recreation, hauling and open-ended research do
 * not acquire a synthetic timer. Called on confirmed world snapshots only. */
export function actionProgress(world:World,pawn:Pawn,lookup?:ActionLookup):ActionProgress|undefined {
  if(!isColonist(pawn))return undefined;
  if(pawn.state==='eating'&&pawn.need?.kind==='eat'&&pawn.need.phase==='ingest')
    return measured('ingestion',workProgress(pawn.need),INGEST_TICKS);
  if(pawn.state!=='working')return undefined;
  if(pawn.cooking?.phase==='work')return measured('production',pawn.cooking.progress,productionTaskTotal(world,pawn.cooking));
  if(pawn.feed?.phase==='feed')return measured('feeding',pawn.feed.progress,FEED_TICKS);
  if(pawn.cleaning?.phase==='clean'){
    const filth=world.filth?.items.find(item=>item.id===pawn.cleaning!.targets[0]);
    if(filth)return measured('cleaning',pawn.cleaning.progress,FILTH_DEFINITIONS[filth.kind].work);
  }
  if(pawn.animalHandling?.phase==='interact')return measured('handling',pawn.animalHandling.progress,handlingStepDuration(pawn.animalHandling));
  if(pawn.animalCare?.phase==='treat'&&pawn.animalCare.duration!==undefined)return measured('tending',pawn.animalCare.progress,pawn.animalCare.duration);
  if(pawn.hunting?.phase==='finish')return measured('hunting',pawn.hunting.progress,18);
  if(pawn.tend?.phase==='tend'&&pawn.tend.duration!==undefined)
    return measured('tending',pawn.tend.progress,pawn.tend.duration);
  if(pawn.ward?.kind==='chat'&&(pawn.ward.phase==='rapport'||pawn.ward.phase==='closing'))
    return measured('warden',pawn.ward.progress,PRISON_RAPPORT_TICKS);
  if(pawn.jobId!==null){
    if(lookup&&!lookup.jobs)lookup.jobs=new Map(world.jobs.map(job=>[job.id,job]));
    const candidate=lookup?.jobs?.get(pawn.jobId)??world.jobs.find(j=>j.id===pawn.jobId);
    const job=candidate?.status==='active'&&candidate.reservedBy===pawn.id?candidate:undefined;
    if(job){
      if(job.clearance){
        if(lookup&&!lookup.resources)lookup.resources=new Map(world.resources.map(resource=>[resource.id,resource]));
        const resource=lookup?.resources?.get(job.clearance.resourceId)??world.resources.find(r=>r.id===job.clearance!.resourceId);
        if(resource)return measured('clearing',workProgress(job.clearance),clearingDuration(resource));}
      return measured('job',workProgress(job),jobDuration(world,job,lookup?.resourceCells ? lookup.resourceCells.get(job.z*world.width+job.x)??null : undefined));
    }
  }
  return undefined;
}

/** The current edge was removed from `path` when travel started. Keep its
 * confirmed destination before the untouched route; never search a new one. */
export function selectedConfirmedPath(world:World,pawn:Pawn):readonly Cell[] {
  if(!isColonist(pawn)||pawn.state!=='moving'||pawn.body?.lostAt!==undefined||pawn.body?.pileId!==undefined)return [];
  const route:Cell[]=[];
  if(pawn.motion&&pawn.motion.end>world.tick)route.push(pawn.motion.to);
  for(const cell of pawn.path)if(!route.length||route.at(-1)!.x!==cell.x||route.at(-1)!.z!==cell.z)route.push(cell);
  return route;
}
