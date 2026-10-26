import { footprintCells } from './definitions.ts';
import { validConstructionMaterial, type ConstructionMaterial } from './construction-materials.ts';
import { roadPropCanDeconstruct256 } from './local-road-prop-ownership-256.ts';
import { releaseAssignments } from './work-release.ts';
import { wallDoorBlueprint296 } from './wall-door-state-296.ts';
import type { Cell, Job, Structure, World } from './types.ts';

/** Only the built, standard single-cell Wall is admitted by this vertical. */
export function wallDoorTarget296(world:World,kind:string,cell:Cell):Structure|undefined {
  if(Number(world.schemaVersion)!==296||kind!=='door'&&kind!=='autodoor')return;
  return world.structures.find(s=>s.kind==='wall'&&s.x===cell.x&&s.z===cell.z
    &&s.footprint==='standard'&&footprintCells(s).length===1);
}
export function wallDoorRemoval296(world:World,structure:Structure):Job|undefined {
  return world.jobs.find(j=>j.kind==='deconstruct'&&j.deconstruction?.structureId===structure.id);
}
/** Ordinary placement owns terrain/research/zones; this closes existing tasks
 * and the up-front identity budget before any placement mutation. */
export function canAttachWallDoor296(world:World,structure:Structure,kind:'door'|'autodoor',material:ConstructionMaterial):boolean {
  if(wallDoorTarget296(world,kind,structure)!==structure||!roadPropCanDeconstruct256(world,structure)
    ||!validConstructionMaterial(kind,material,world.schemaVersion))return false;
  const removal=wallDoorRemoval296(world,structure);
  if(removal?.wallDoor296?.plan)return false;
  if(world.jobs.some(j=>j!==removal&&(j.deconstruction?.structureId===structure.id||j.furniture?.structureId===structure.id
    ||j.repair?.structureId===structure.id||j.fixBreakdown?.structureId===structure.id||j.flick?.structureId===structure.id)))return false;
  return world.jobs.length+(removal?0:1)<=32768&&Number.isSafeInteger(world.nextId+(removal?1:2));
}
export function attachWallDoor296(world:World,structure:Structure,kind:'door'|'autodoor',material:ConstructionMaterial):Job|undefined {
  if(!canAttachWallDoor296(world,structure,kind,material))return;
  let job=wallDoorRemoval296(world,structure);
  if(!job){
    job={id:world.nextId++,kind:'deconstruct',deconstruction:{structureId:structure.id,kind:'wall',...structure.material?{material:structure.material}:{}},
      x:structure.x,z:structure.z,orientation:structure.orientation,footprint:structure.footprint,
      progress:0,status:'pending',reservedBy:null,escrow:{wood:0,food:0},wallDoor296:{manual:false}};
    world.jobs.push(job);
  }
  job.wallDoor296??={manual:true};
  job.wallDoor296.plan={revision:1,id:world.nextId++,kind,material};
  return job;
}
export function promoteWallDoorManual296(world:World,structure:Structure):boolean {
  const job=wallDoorRemoval296(world,structure);if(!job?.wallDoor296)return false;
  job.wallDoor296.manual=true;return true;
}
/** Called after physical retirement commits and before roof reconciliation.
 * The old numeric commands cannot follow the reserved future identity. */
export function retireWallDoorWork296(world:World,job:Job,blueprint=wallDoorBlueprint296(job)):void {
  for(const pawn of world.pawns){
    if(pawn.jobId===job.id){releaseAssignments(world,pawn);pawn.path=[];pawn.planCooldown=0;}
    pawn.orders.queue=pawn.orders.queue.filter(o=>o!==job.id);
  }
  world.jobs=world.jobs.filter(j=>j!==job);
  if(blueprint)world.jobs.push(blueprint);
}
