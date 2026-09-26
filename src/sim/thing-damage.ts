import {detachMissingArtBills} from './art-work.ts';
import { constructionRecipe } from './construction-materials.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { addMaterial,refreshStock } from './materials.ts';
import { interruptWork } from './interrupted-cargo.ts';
import { commitDrop,releaseAssignments } from './work-release.ts';
import { releaseFurniture } from './furniture-transfer.ts';
import { planStructureDestruction } from './thing-destruction.ts';
import { reconcileRoofSupport } from './roofing.ts';
import { reconcilePower } from './power.ts';
import { detachMissingBills } from './unfinished.ts';
import { ensureFireState } from './fire-rules.ts';
import { destroyHumanCorpse } from './human-corpses.ts';
import { pileDamage,pileMaxHp,resourceMaxHp,structureMaxHp } from './thing-damage-rules.ts';
import type { MaterialPile,Pawn,Resource,Structure,World } from './types.ts';
export { pileDamage,pileMaxHp,resourceMaxHp,structureMaxHp,copyThingDamage,mergeThingDamage } from './thing-damage-rules.ts';

const positive=(n:number)=>Number.isSafeInteger(n)&&n>0;
const addSafe=(a:number,b:number)=>Number.isSafeInteger(a+b);
const at=(a:{x:number;z:number},b:{x:number;z:number})=>a.x===b.x&&a.z===b.z;
function removeJobs(world:World,ids:Set<number>):void {
  if(!ids.size)return;
  for(const p of world.pawns)if(p.jobId!==null&&ids.has(p.jobId))interruptWork(world,p);
  for(const p of world.pawns)p.orders.queue=p.orders.queue.filter(o=>typeof o!=='number'||!ids.has(o));
  world.jobs=world.jobs.filter(j=>!ids.has(j.id));
}
/** Shared destructive plant boundary; the cause never creates a harvest. */
export function damageResource(world:World,r:Resource,amount:number,reason:'fire'|'frost'|'darkness'|'age'='fire'):boolean {
  const max=resourceMaxHp(r);if(!max||!positive(amount)||!world.resources.includes(r))return false;
  const damage=(r.damage??0)+amount;if(damage<max){r.damage=damage;return true;}
  const ledger=reason==='fire'?ensureFireState(world).ledger:undefined;
  const woodPotential=r.kind==='tree'?r.amount:0;
  if(ledger&&(!addSafe(ledger.resources[r.kind]??0,1)||!addSafe(ledger.woodPotentialLost,woodPotential)))return false;
  const jobs=new Set(world.jobs.filter(j=>at(j,r)&&['mine','chop','cut','harvest'].includes(j.kind)).map(j=>j.id));
  removeJobs(world,jobs);world.resources=world.resources.filter(candidate=>candidate!==r);
  // The clearance step ended without a harvest. Keep its construction intent,
  // materials and unrelated queued work, but release this now-obsolete claim:
  // an unsupplied blueprint cannot retain a finishing-work reservation.
  for(const job of world.jobs)if(job.clearance?.resourceId===r.id){
    for(const p of world.pawns){
      if(p.jobId===job.id)releaseAssignments(world,p);
      p.orders.queue=p.orders.queue.filter(order=>order!==job.id);
    }
    delete job.clearance;delete job.installationWork;job.reservedBy=null;job.status='pending';
  }
  for(const a of world.wildlife?.animals??[])if(a.meal?.kind==='plant'&&a.meal.id===r.id){delete a.meal;a.path=[];a.nextDecision=world.tick;}
  if(ledger){ledger.resources[r.kind]=(ledger.resources[r.kind]??0)+1;ledger.woodPotentialLost+=woodPotential;}return true;
}
function referencesPile(p:Pawn,id:number):boolean {
  const c=p.cooking,h=p.haul,n=p.need;
  return !!(p.equipmentTask?.itemId===id||c&&(c.productId===id||c.ingredients.some(i=>i.pileId===id))
    ||h&&(h.sourcePileId===id||h.carryPileId===id)||n?.kind==='eat'&&(n.sourcePileId===id||n.carryPileId===id)
    ||p.tend?.medicine&&(p.tend.medicine.sourcePileId===id||p.tend.medicine.carryPileId===id)
    ||p.feed&&(p.feed.sourcePileId===id||p.feed.carryPileId===id)||p.ward?.kind==='food'&&(p.ward.sourcePileId===id||p.ward.carryPileId===id));
}
/** A destroyed stack loses all its units. Other carried ingredients survive. */
export function damagePile(world:World,pile:MaterialPile,amount:number):boolean {
  const max=pileMaxHp(pile);if(!max||!positive(amount)||!world.piles.includes(pile))return false;
  const damage=pileDamage(pile)+amount;
  if(damage<max){if(pile.apparel)pile.apparel.hitPoints=max-damage;else if(pile.weapon)pile.weapon.hitPoints=max-damage;else pile.damage=damage;return true;}
  if(pile.humanCorpse){
    if(!destroyHumanCorpse(world,pile))return false;
    for(const p of world.pawns){
      if(referencesPile(p,pile.id))interruptWork(world,p);
      if(p.interruptedCargo&&!world.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)&&!world.packed.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id))delete p.interruptedCargo;
    }
    refreshStock(world);return true;
  }
  const state=ensureFireState(world),loss=state.ledger.items[pile.item]??0;if(!addSafe(loss,pile.quantity))return false;
  // Retire the source before releasing consumers; releasing must not drop a burnt pile back onto the ground.
  world.piles=world.piles.filter(p=>p!==pile);
  for(const p of world.pawns){
    if(p.droppedWeaponId===pile.id)delete p.droppedWeaponId;
    if(referencesPile(p,pile.id))interruptWork(world,p);
    if(p.interruptedCargo&&!world.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)&&!world.packed.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id))delete p.interruptedCargo;
  }
  for(const a of world.wildlife?.animals??[])if(a.meal?.kind==='pile'&&a.meal.id===pile.id){delete a.meal;a.path=[];a.nextDecision=world.tick;}
  state.ledger.items[pile.item]=loss+pile.quantity;refreshStock(world);return true;
}
/** Damage installed or packed furniture. Salvage is preflighted before a fatal hit.
 * Quarter raw-material restitution follows the existing cooler adaptation. */
export function damageStructure(world:World,s:Structure,amount:number):boolean {
  const packed=world.packed.find(p=>p.building===s),installed=world.structures.includes(s),max=structureMaxHp(s);
  if(!max||!positive(amount)||!installed&&!packed)return false;
  const damage=(s.damage??0)+amount;if(damage<max){s.damage=damage;return true;}
  const owner=packed?.owner,origin=owner?.type==='ground'?owner:owner?.type==='pawn'||owner?.type==='inventory'?world.pawns.find(p=>p.id===owner.pawnId)??s:s;
  // Refusing a fatal hit must not create a fire ledger or advance its stream.
  const state=world.fires??ensureFireState({...world});
  const ids=new Set(world.jobs.filter(j=>j.repair?.structureId===s.id||j.deconstruction?.structureId===s.id||j.furniture?.structureId===s.id||j.flick?.structureId===s.id).map(j=>j.id));
  const actors=world.pawns.filter(p=>{
    const h=p.haul;
    return p.jobId!==null&&ids.has(p.jobId)||p.research?.stationId===s.id||p.cooking?.stationId===s.id
      ||h&&(h.whole&&h.sourcePileId===s.id||h.destination.type==='fuel'&&h.destination.structureId===s.id)
      ||p.need?.kind==='sleep'&&p.need.bedId===s.id||p.recreation.task?.buildingId===s.id||p.rescue?.bedId===s.id;
  });
  const plan=planStructureDestruction(world,s,actors,origin,state.rng);if(!plan)return false;
  const {salvage,drops}=plan;
  const destruction=world.destroyed??{count:0,lost:{}},lost={...destruction.lost};
  for(const cost of constructionRecipe(s).ingredients){const key=cost.item as keyof typeof lost;lost[key]=(lost[key]??0)+cost.quantity-(salvage?.returned.get(cost.item)??0);}
  const fuelLost=s.fuel?.ticks??0,fuelBurned=s.fuel?.burned??0;
  const energy=s.battery?(s.battery.stored+(s.battery.half?.5:0)):0;
  if(!addSafe(state.ledger.fuelTicksLost,fuelLost)||!addSafe(state.ledger.fuelTicksBurned,fuelBurned)||!addSafe(destruction.count,1)||!Object.values(lost).every(Number.isSafeInteger)||!addSafe(state.ledger.structures,1)||!Number.isSafeInteger((state.ledger.batteryEnergyLost+energy)*2))return false;
  world.fires=state;
  world.structures=world.structures.filter(b=>b!==s);world.packed=world.packed.filter(p=>p!==packed);
  // Commit exactly the floor preview before health/roof/task interruption can
  // cause other deposits. Those later effects see the already occupied floor.
  for(const p of actors){
    const held=world.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id);
    if(held&&drops.has(held.id))commitDrop(world,held,p,drops);
    const pack=world.packed.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id);
    if(pack&&drops.has(pack.building.id))releaseFurniture(world,p,drops);
  }
  if(salvage){state.rng=salvage.rng;for(const drop of salvage.drops)addMaterial(world,ITEM_DEFINITIONS[drop.item].kind,drop.quantity,{type:'ground',...drop.cell},drop.item);}
  for(const p of actors)interruptWork(world,p);
  removeJobs(world,ids);
  for(const p of world.pawns){
    if(p.bedId===s.id)p.bedId=null;
    if(p.need?.kind==='eat'&&p.need.dining?.tableId===s.id)p.need.dining.tableId=null;
    if(p.melee?.order?.structure&&p.melee.order.targetId===s.id){p.melee.order=null;p.path=[];if(!p.melee.strike)delete p.melee;}
  }
  world.destroyed={count:destruction.count+1,lost};state.ledger.structures++;state.ledger.batteryEnergyLost+=energy;state.ledger.fuelTicksLost+=fuelLost;state.ledger.fuelTicksBurned+=fuelBurned;
  state.batteryWicks=state.batteryWicks.filter(w=>w.structureId!==s.id);
  detachMissingBills(world);detachMissingArtBills(world);reconcilePower(world);if(installed)reconcileRoofSupport(world,false,s);refreshStock(world);return true;
}
