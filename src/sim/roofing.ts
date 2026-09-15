import { RoomTopologyCache } from './room-topology.ts';
import { RoofContext, isRoofJob, roofIndex, roofJobWanted } from './roof-rules.ts';
import { releaseWork } from './work-release.ts';
import { isPlant, plantGrowth } from './plants.ts';
import type { Cell, Job, World } from './types.ts';

function setConstructedRoofs(world: World, cells: number[]): void {
  const old=new Set(world.roofing!.constructed),next=new Set(cells);
  const changed=world.resources.some(r=>isPlant(r)&&old.has(roofIndex(world,r))!==next.has(roofIndex(world,r)));
  if(changed)world.resources=world.resources.map(r=>isPlant(r)&&old.has(roofIndex(world,r))!==next.has(roofIndex(world,r))
    ?{...r,growth:plantGrowth(world,r),growthTick:world.tick}:r);
  world.roofing!.constructed=cells;
}

export function designateRoofArea(world: World, cells: readonly number[], action: string): void {
  const state = world.roofing ??= { constructed: [], build: [], remove: [], cursor: 0 };
  const chosen = new Set(cells);
  state.build = state.build.filter(i => !chosen.has(i)); state.remove = state.remove.filter(i => !chosen.has(i));
  if (action === 'build-roof') state.build.push(...cells);
  if (action === 'remove-roof') state.remove.push(...cells);
  state.build.sort((a,b)=>a-b); state.remove.sort((a,b)=>a-b); state.cursor = 0;
  reconcileRoofJobs(world);
  for (const p of world.pawns) if (p.jobId === null && !p.haul && !p.cooking) p.planCooldown = 0;
}

export function reconcileRoofJobs(world: World, context?: RoofContext): void {
  if(!world.jobs.some(isRoofJob))return;
  context ??= new RoofContext(world);
  const current=context;
  const stale = new Set(world.jobs.filter(j => isRoofJob(j) && !roofJobWanted(world,j,current)).map(j => j.id));
  if (!stale.size) return;
  for (const pawn of world.pawns) if (pawn.jobId !== null && stale.has(pawn.jobId)) releaseWork(world,pawn);
  for (const pawn of world.pawns) pawn.orders.queue = pawn.orders.queue.filter(order => typeof order !== 'number' || !stale.has(order));
  world.jobs = world.jobs.filter(j => !stale.has(j.id));
}

/** Bounded intentions, separate ceiling layer: no material escrow or frame. */
export function scheduleRoofs(world: World): void {
  const state = world.roofing; if (!state || world.tick % 5 !== 0) return;
  const context = new RoofContext(world); reconcileRoofJobs(world,context);
  // Inaccessible generated targets must not monopolize a small worker pool.
  // Rotate only unclaimed intentions, never active or accepted queued work.
  if(world.tick%50===0) {
    const roofJobs=world.jobs.filter(isRoofJob);
    if(roofJobs.length&&roofJobs.every(j=>j.reservedBy===null))world.jobs=world.jobs.filter(j=>!isRoofJob(j));
  }
  const pending = world.jobs.filter(isRoofJob), used = new Set(pending.map(j => roofIndex(world,j)));
  let capacity = Math.max(0, Math.min(128, world.pawns.filter(p=>p.priorities.build>0).length * 2) - pending.length);
  const candidates = [...state.remove, ...state.build]; if (!candidates.length) { state.cursor = 0; return; }
  const limit = Math.min(candidates.length, 1024);
  for (let scanned = 0; scanned < limit && capacity > 0; scanned++) {
    const at = state.cursor % candidates.length, index = candidates[at]!; state.cursor = (at+1)%candidates.length;
    if (used.has(index)) continue;
    const kind = context.remove.has(index) ? 'remove-roof' : 'build-roof';
    const job: Job = {id:world.nextId,kind,x:index%world.width,z:Math.floor(index/world.width),orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};
    if (!roofJobWanted(world,job,context) || !Number.isSafeInteger(world.nextId+1)) continue;
    // A ground task already cutting the same tree owns that plant first.
    if (kind==='build-roof' && world.resources.some(r=>r.kind==='tree'&&roofIndex(world,r)===index)
      && world.jobs.some(j=>!isRoofJob(j)&&roofIndex(world,j)===index)) continue;
    world.nextId++; world.jobs.push(job); used.add(index); capacity--;
  }
}

/** Called only when a finished wall/door changes the enclosure. No roof appears
 * automatically: the resulting designation still requires a builder. */
export function autoRoofRooms(world: World, at: Cell): void {
  const topology = new RoomTopologyCache().read(world), spaces = new Set<number>();
  for (const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const s=topology.at(at.x+dx!,at.z+dz!);
    if(s?.kind==='space'&&!s.touchesMapEdge&&s.cellCount<=320)spaces.add(s.id);
  }
  if(!spaces.size)return;
  const context=new RoofContext(world), cells=new Set<number>();
  for(let z=0;z<world.height;z++)for(let x=0;x<world.width;x++) {
    const room=topology.at(x,z);if(room?.kind!=='space'||!spaces.has(room.id))continue;
    const index=z*world.width+x;
    if(!context.remove.has(index)&&context.supported(index,true))cells.add(index);
    for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nx=x+dx!,nz=z+dz!,i=nz*world.width+nx;
      if(nx>=0&&nz>=0&&nx<world.width&&nz<world.height&&context.holders[i]&&!context.remove.has(i))cells.add(i);
    }
  }
  if(cells.size)designateRoofArea(world,[...cells],'build-roof');
}

/** Loss of support removes constructed coverage; damage awaits health/HP.
 * Re-evaluate until stable because one lost connection can expose another. */
export function reconcileRoofSupport(world: World, removal = false, lostSupport?: Cell): number {
  const state=world.roofing;if(!state?.constructed.length)return 0;
  let removed=0;
  for(;;) {
    const context=new RoofContext(world), connected=context.connectedRoofs();
    const retained=state.constructed.filter(i=>connected.has(i) && (removal || lostSupport && (i%world.width-lostSupport.x)**2+(Math.floor(i/world.width)-lostSupport.z)**2>6.9**2 || context.supported(i)));
    if(retained.length===state.constructed.length)break;
    removed+=state.constructed.length-retained.length;setConstructedRoofs(world,retained);
  }
  if(removed&&!removal) {
    world.events.push({tick:world.tick,type:'job',message:`Effondrement : ${removed} case(s) de toit sans support. Les dégâts ne sont pas encore simulés.`});
    if(world.events.length>80)world.events.splice(0,world.events.length-80);
  }
  reconcileRoofJobs(world);return removed;
}

export function finishRoofJob(world: World, job: Job): void {
  const state=world.roofing!,context=new RoofContext(world),at=roofIndex(world,job);
  if(job.kind==='remove-roof') {
    setConstructedRoofs(world,state.constructed.filter(i=>i!==at));reconcileRoofSupport(world,true);
  } else {
    // Cardinal then diagonals, root last: deterministic local adaptation of
    // Core's 3x3 placement, each new cell can support the next in this action.
    for(const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1],[0,0]]) {
      const x=job.x+dx!,z=job.z+dz!,index=z*world.width+x;
      if(x<0||z<0||x>=world.width||z>=world.height||!context.build.has(index)||context.roof.has(index)||!context.supported(index)
        ||world.resources.some(r=>r.kind==='tree'&&r.x===x&&r.z===z))continue;
      context.roof.add(index);
    }
    setConstructedRoofs(world,[...context.roof].sort((a,b)=>a-b));
  }
}
