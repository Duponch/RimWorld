import { cancelAutomaticCombat } from './automatic-combat-state.ts';
import { releaseRescue } from './rescue-state.ts';
import { updatePawnHealth } from './health.ts';
import { isRoofJob } from './roof-rules.ts';
import { taskWork } from './production-recipes.ts';
import { furnitureIntentAt, furnitureSourceCells } from './furniture-rules.ts';
import { furnitureDropCell, releaseFurniture } from './furniture-transfer.ts';
import { resetWork } from './work-progress.ts';
import { zonesUnderPlan } from './construction-zones.ts';
import { constructionHaulId } from './construction-rules.ts';
import type { Cell, Command, MaterialPile, Pawn, World } from './types.ts';
import { workType } from './work-planner.ts';
import { haulingWork } from './haul-aside.ts';
import { footprintCells } from './definitions.ts';
import { queryArea } from './designation.ts';
import { dropRetainingIdentity } from './ground-placement.ts';
export type DropPlan=Map<number,Cell>;
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;

/** Plan only ownership released by this command, before any command mutation.
 * Store the selected cells so a later greedy search cannot invalidate the plan. */
export function planCommandDrops(world:World,command:Command):DropPlan|null {
  const jobs=new Set<number>(),zones=new Set<number>(),pawns=new Set<number>();
  if(command.type==='order-equipment'||command.type==='order-feed'||command.type==='order-tend'||command.type==='order-rescue'||command.type==='order-job'||command.type==='order-cook'||command.type==='order-haul'||command.type==='clear-orders') {
    pawns.add(command.pawnId);
  } else if(command.type==='designate') {
    const affected=zonesUnderPlan(world,command);for(const id of affected.deliveries)zones.add(id);
    for(const pawn of world.pawns)if(pawn.haul?.destination.type==='aside'&&affected.growing.has(pawn.haul.destination.growingZoneId??-1))pawns.add(pawn.id);
  } else if(command.type==='cancel') {
    const job=world.jobs.find(j=>footprintCells(j).some(c=>same(c,command)))??furnitureIntentAt(world,command);if(job)jobs.add(job.id);
  } else if(command.type==='area'&&(command.action==='cancel'||command.action==='remove-stockpile')) {
    const selection=queryArea(world,command);if(!selection.ok)return new Map();
    const cells=new Set(selection.cells);
    if(command.action==='cancel')for(const job of world.jobs){if([...footprintCells(job),...furnitureSourceCells(world,job)].some(c=>cells.has(c.z*world.width+c.x)))jobs.add(job.id);}
    else for(const zone of world.stockpiles)if(cells.has(zone.z*world.width+zone.x))zones.add(zone.id);
  } else if(command.type==='growing-policy'||command.type==='area'&&command.action==='remove-growing') {
    const cells=command.type==='area'?queryArea(world,command):null;
    const ids=new Set(command.type==='growing-policy'?[command.zoneId]:cells?.ok?world.growingZones.filter(z=>z.cells.some(c=>cells.cells.includes(c))).map(z=>z.id):[]);
    for(const pawn of world.pawns)if(pawn.haul?.destination.type==='aside'&&ids.has(pawn.haul.destination.growingZoneId??-1))pawns.add(pawn.id);
  } else if(command.type==='stockpile') {
    for(const p of world.pawns)if(p.haul?.whole&&p.haul.destination.type==='aside'&&same(p.haul.destination,command))pawns.add(p.id);
    const zone=world.stockpiles.find(z=>same(z,command));if(zone)zones.add(zone.id);
  } else if(command.type==='priority'&&command.value===0) {
    const pawn=world.pawns.find(p=>p.id===command.pawnId),job=world.jobs.find(j=>j.id===pawn?.jobId);
    if(pawn&&((pawn.tend&&command.work==='doctor'&&pawn.orders.active!=='tend')||(pawn.feed&&command.work==='doctor'&&pawn.orders.active!=='feed')||(pawn.haul&&pawn.orders.active!=='haul'&&command.work===haulingWork(pawn.haul.destination))||(job&&workType(job)===command.work&&pawn.orders.active===null)||(pawn.cooking&&pawn.orders.active!=='cook'&&command.work === taskWork(pawn.cooking))))pawns.add(pawn.id);
  } else if(command.type==='bill-remove'||command.type==='bill-update') {
    for(const pawn of world.pawns)if(pawn.cooking?.billId===command.billId&&pawn.cooking.stationId===command.structureId)pawns.add(pawn.id);
  } else if(command.type==='refuel-policy' && !command.enabled) {
    for(const pawn of world.pawns)if(pawn.haul?.destination.type==='fuel'&&!pawn.haul.destination.forced&&pawn.haul.destination.structureId===command.structureId)pawns.add(pawn.id);
  } else if(command.type==='assign-bed') {
    for(const pawn of world.pawns)if(pawn.need?.kind==='sleep'&&(pawn.bedId===command.bedId||pawn.id===command.pawnId))pawns.add(pawn.id);
  }
  for(const pawn of world.pawns)if((pawn.jobId!==null&&jobs.has(pawn.jobId))||(pawn.haul&&(jobs.has(constructionHaulId(pawn.haul.destination)??-1)||pawn.haul.destination.type==='stockpile'&&zones.has(pawn.haul.destination.stockpileId))))pawns.add(pawn.id);
  if(command.type==='designate'&&command.kind==='deconstruct'||command.type==='area'&&command.action==='deconstruct'){
    const selection=command.type==='area'?queryArea(world,command):null;const cells=selection?.ok?new Set(selection.cells):null;
    const spots=new Set(world.structures.filter(s=>s.kind==='crafting-spot'&&(cells?cells.has(s.z*world.width+s.x):command.type==='designate'&&same(s,command))).map(s=>s.id));
    for(const p of world.pawns)if(p.cooking&&spots.has(p.cooking.stationId))pawns.add(p.id);
  }
  const result:DropPlan=new Map();
  if(!jobs.size&&!pawns.size)return result;
  const shadow={...world,packed:world.packed?.map(p=>({...p,owner:{...p.owner}})),piles:world.piles.map(p=>({...p,owner:{...p.owner}}))};
  const add=(pile:MaterialPile,origin:Cell)=>{
    if(!dropRetainingIdentity(shadow,pile,origin)||pile.owner.type!=='ground')return false;
    result.set(pile.id,{x:pile.owner.x,z:pile.owner.z});return true;
  };
  for(const pawn of world.pawns)if(pawns.has(pawn.id)) {
    const pile=shadow.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
    if(pile&&!add(pile,pawn))return null;
    const pack=shadow.packed?.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
    if(pack){const cell=furnitureDropCell(shadow,pawn,pawn.id);if(!cell)return null;pack.owner={type:'ground',...cell};result.set(pack.building.id,cell);}
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
  if(!releaseFurniture(world,pawn,plan))return false;
  const held=world.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
  if(held&&!commitDrop(world,held,pawn,plan))return false;
  delete pawn.interruptedCargo;
  releaseAssignments(world,pawn);
  return true;
}
/** Release task/service claims independently of ownership. Only involuntary or tactical
 * interruption may use this while an object is still carried. */
export function releaseAssignments(world:World,pawn:Pawn):void {
  cancelAutomaticCombat(pawn);
  if(pawn.need?.kind==='sleep'&&pawn.need.medical&&pawn.health&&!pawn.health.death&&pawn.health.tick<world.tick)updatePawnHealth(world,pawn);
  delete pawn.heatRefuge;delete pawn.research;releaseRescue(world,pawn);delete pawn.tend;delete pawn.feed;delete pawn.medicalSleep;delete pawn.equipmentTask;
  const job=world.jobs.find(j=>j.id===pawn.jobId);
  if(job?.reservedBy===pawn.id){delete job.installationWork;delete job.clearance;delete job.pickTicks;job.reservedBy=null;job.status='pending';if(job.repair)delete job.repair.warmed;if(job.kind==='repair'||job.furniture||job.kind==='mine'||job.kind==='sow'||job.kind==='deconstruct'||isRoofJob(job))resetWork(job);}
  delete pawn.transitExit;
  pawn.orders.active=null;
  pawn.recreation.task=null;pawn.jobId=null;pawn.haul=null;pawn.cooking=null;pawn.need=null;pawn.path=[];if(pawn.state!=='downed'&&pawn.state!=='dead')pawn.state='idle';pawn.planCooldown=20;pawn.needCooldown=20;
}
