import { groundCapacity, groundPile, nearbyGround } from './ground-placement.ts';
import { MAX_STACK, footprintCells } from './definitions.ts';
import { furnitureDuration, furnitureReady, furnitureWorkTarget, packedAt, type PackedFurniture } from './furniture-rules.ts';
import type { Cell, Job, Pawn, World } from './types.ts';
import { advanceWork, resetWork, workProgress } from './work-progress.ts';

/** A whole object needs a completely unreserved slot, never a compatible stack.
 * A full wood-slot capacity also excludes every typed inbound reservation. */
export function furnitureDropCell(world:World,origin:Cell,exceptPawn?:number):Cell|undefined {
  const free=(c:Cell)=>!groundPile(world,c)&&!packedAt(world,c)&&groundCapacity(world,c,'wood',exceptPawn)===MAX_STACK;
  return free(origin)?{x:origin.x,z:origin.z}:nearbyGround(world,origin).find(free);
}
export function releaseFurniture(world:World,pawn:Pawn,plan?:ReadonlyMap<number,Cell>):boolean {
  const pack=world.packed?.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);if(!pack)return true;
  const cell=plan?.get(pack.building.id)??furnitureDropCell(world,pawn,pawn.id);if(!cell)return false;
  pack.owner={type:'ground',...cell};return true;
}
function detach(world:World,job:Job,owner:PackedFurniture['owner']):PackedFurniture {
  const building=world.structures.find(s=>s.id===job.furniture!.structureId)!;
  world.structures=world.structures.filter(s=>s!==building);
  for(const p of world.pawns)if(p.need?.kind==='eat'&&p.need.dining?.tableId===building.id)p.need.dining.tableId=null;
  const pack={building,owner};world.packed.push(pack);return pack;
}
/** Returns true only after an authoritative topology/ownership transition. */
export function advanceFurniture(world:World,pawn:Pawn,job:Job,move:(target:Cell & {kind?:Job['kind']})=>void,release:()=>boolean,workRate:()=>number=()=>1):boolean {
  if(!furnitureReady(world,job,pawn)){release();return false;}
  const target=furnitureWorkTarget(world,job),cells='kind' in target?footprintCells(target as Job):[target];
  if(!cells.some(c=>Math.abs(c.x-pawn.x)+Math.abs(c.z-pawn.z)===1)||cells.some(c=>c.x===pawn.x&&c.z===pawn.z)) {move(target);return false;}
  pawn.path=[];pawn.state='working';
  const id=job.furniture!.structureId,source=world.structures.find(s=>s.id===id);
  let pack=world.packed.find(p=>p.building.id===id);
  if(source) {
    advanceWork(job,workRate());
    if(workProgress(job)<furnitureDuration(world,job))return false;
    if(job.kind==='uninstall') {
      const view={...world,structures:world.structures.filter(s=>s.id!==id)};
      const cell=furnitureDropCell(view,source);
      if(!cell){release();return false;}
      detach(world,job,{type:'ground',...cell});
    } else {
      pack=detach(world,job,{type:'pawn',pawnId:pawn.id});resetWork(job);return true;
    }
  } else if(pack?.owner.type==='ground') {
    pack.owner={type:'pawn',pawnId:pawn.id};resetWork(job);return true;
  } else if(pack?.owner.type==='pawn') {
    // The consulted hauling driver has no timed install work for a blueprint.
    // The 150 WorkTotal field is inspection text, not its execution duration.
    // The same object is installed, not a replacement with copied attributes.
    Object.assign(pack.building,{x:job.x,z:job.z,orientation:job.orientation});
    world.packed=world.packed.filter(p=>p!==pack);world.structures.push(pack.building);
  } else {release();return false;}
  world.jobs=world.jobs.filter(j=>j!==job);pawn.jobId=null;pawn.path=[];pawn.state='idle';pawn.planCooldown=0;
  world.events.push({tick:world.tick,type:'job',message:`${pawn.name} a ${job.kind==='uninstall'?'désinstallé':'installé'} le meuble.`});
  if(world.events.length>80)world.events.shift();return true;
}
