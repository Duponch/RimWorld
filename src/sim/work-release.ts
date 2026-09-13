import type { Cell, Command, MaterialPile, Pawn, World } from './types.ts';
import { workType } from './work-planner.ts';
import { footprintCells } from './definitions.ts';
import { queryArea } from './designation.ts';
import { dropRetainingIdentity } from './ground-placement.ts';
export type DropPlan=Map<number,Cell>;
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;

/** Plan only ownership released by this command, before any command mutation.
 * Store the selected cells so a later greedy search cannot invalidate the plan. */
export function planCommandDrops(world:World,command:Command):DropPlan|null {
  const jobs=new Set<number>(),zones=new Set<number>(),pawns=new Set<number>();
  if(command.type==='cancel') {
    const job=world.jobs.find(j=>footprintCells(j).some(c=>same(c,command)));if(job)jobs.add(job.id);
  } else if(command.type==='area'&&(command.action==='cancel'||command.action==='remove-stockpile')) {
    const selection=queryArea(world,command);if(!selection.ok)return new Map();
    const cells=new Set(selection.cells);
    if(command.action==='cancel')for(const job of world.jobs){if(footprintCells(job).some(c=>cells.has(c.z*world.width+c.x)))jobs.add(job.id);}
    else for(const zone of world.stockpiles)if(cells.has(zone.z*world.width+zone.x))zones.add(zone.id);
  } else if(command.type==='stockpile') {
    const zone=world.stockpiles.find(z=>same(z,command));if(zone)zones.add(zone.id);
  } else if(command.type==='priority'&&command.value===0) {
    const pawn=world.pawns.find(p=>p.id===command.pawnId),job=world.jobs.find(j=>j.id===pawn?.jobId);
    if(pawn&&((pawn.haul&&command.work==='haul')||(job&&workType(job)===command.work)))pawns.add(pawn.id);
  } else if(command.type==='assign-bed') {
    for(const pawn of world.pawns)if(pawn.need?.kind==='sleep'&&(pawn.bedId===command.bedId||pawn.id===command.pawnId))pawns.add(pawn.id);
  }
  for(const pawn of world.pawns)if((pawn.jobId!==null&&jobs.has(pawn.jobId))||(pawn.haul&&(pawn.haul.destination.type==='job'?jobs.has(pawn.haul.destination.jobId):zones.has(pawn.haul.destination.stockpileId))))pawns.add(pawn.id);
  const result:DropPlan=new Map();
  if(!jobs.size&&!pawns.size)return result;
  const shadow={...world,piles:world.piles.map(p=>({...p,owner:{...p.owner}}))};
  const add=(pile:MaterialPile,origin:Cell)=>{
    if(!dropRetainingIdentity(shadow,pile,origin)||pile.owner.type!=='ground')return false;
    result.set(pile.id,{x:pile.owner.x,z:pile.owner.z});return true;
  };
  for(const pawn of world.pawns)if(pawns.has(pawn.id)) {
    const pile=shadow.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
    if(pile&&!add(pile,pawn))return null;
  }
  for(const pile of shadow.piles)if(pile.owner.type==='job'&&jobs.has(pile.owner.jobId)) {
    const job=world.jobs.find(j=>pile.owner.type==='job'&&j.id===pile.owner.jobId)!;
    if(!add(pile,job))return null;
  }
  return result;
}
export function commitDrop(world:World,pile:MaterialPile,origin:Cell,plan?:DropPlan):boolean {
  const cell=plan?.get(pile.id);
  if(cell){pile.owner={type:'ground',...cell};return true;}
  return dropRetainingIdentity(world,pile,origin);
}
export function releaseWork(world:World,pawn:Pawn,plan?:DropPlan):boolean {
  const held=world.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
  if(held&&!commitDrop(world,held,pawn,plan))return false;
  const job=world.jobs.find(j=>j.id===pawn.jobId);
  if(job?.reservedBy===pawn.id){job.reservedBy=null;job.status='pending';if(job.kind==='sow')job.progress=0;}
  pawn.jobId=null;pawn.haul=null;pawn.need=null;pawn.path=[];pawn.state='idle';pawn.planCooldown=20;pawn.needCooldown=20;
  return true;
}
