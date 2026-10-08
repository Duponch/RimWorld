import {removeHydroponicPlants} from './hydroponics.ts';
import {detachMissingFlakBills} from './flak-work.ts';
import { releaseStructureMelee } from './melee-state.ts';
import {invalidateAnimalPens} from './animal-pens.ts';
import {detachMissingGunBills} from './gun-work.ts';
import {detachMissingComponentBills} from './component-work.ts';
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
import { neutralLossPlan } from './destruction-losses.ts';
import { miniTurretExplosive,registerBombWave,startTurretWick } from './bomb-creation.ts';
import type { BombInstigatorKey } from './mini-turret-state.ts';
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
export function damageResource(world:World,r:Resource,amount:number,reason:'fire'|'frost'|'darkness'|'age'|'bullet'|'bomb'|'rotting'='fire'):boolean {
  const max=resourceMaxHp(r);if(!max||!positive(amount)||!world.resources.includes(r))return false;
  const damage=(r.damage??0)+amount;if(damage<max){r.damage=damage;return true;}
  const ledger=reason==='fire'?ensureFireState(world).ledger:undefined;
  const woodPotential=r.kind==='tree'?r.amount:0;
  const neutral=reason==='bullet'||reason==='bomb'?neutralLossPlan(world,{resources:{[r.kind]:1},...(woodPotential?{woodPotentialLost:woodPotential}:{})}):undefined;
  if(neutral===null)return false;
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
  if(ledger){ledger.resources[r.kind]=(ledger.resources[r.kind]??0)+1;ledger.woodPotentialLost+=woodPotential;}if(neutral)world.destroyed=neutral;return true;
}
function referencesPile(p:Pawn,id:number):boolean {
  const c=p.cooking,h=p.haul,n=p.need;
  return !!(p.equipmentTask?.itemId===id||c&&(c.productId===id||c.ingredients.some(i=>i.pileId===id))
    ||h&&(h.sourcePileId===id||h.carryPileId===id)||n?.kind==='eat'&&(n.sourcePileId===id||n.carryPileId===id)
    ||p.animalHandling&&(p.animalHandling.sourcePileId===id||p.animalHandling.carryPileId===id)
    ||p.animalCare?.medicine&&(p.animalCare.medicine.sourcePileId===id||p.animalCare.medicine.carryPileId===id)
    ||p.tend?.medicine&&(p.tend.medicine.sourcePileId===id||p.tend.medicine.carryPileId===id)
    ||p.feed&&(p.feed.sourcePileId===id||p.feed.carryPileId===id)||p.ward?.kind==='food'&&(p.ward.sourcePileId===id||p.ward.carryPileId===id));
}
/** A destroyed stack loses all its units. Other carried ingredients survive. */
export function damagePile(world:World,pile:MaterialPile,amount:number,cause:'fire'|'bullet'|'bomb'='fire'):boolean {
  const max=pileMaxHp(pile,world.schemaVersion);if(!max||!positive(amount)||!world.piles.includes(pile))return false;
  const damage=pileDamage(pile)+amount;
  if(damage<max){if(pile.apparel)pile.apparel.hitPoints=max-damage;else if(pile.weapon)pile.weapon.hitPoints=max-damage;else pile.damage=damage;return true;}
  if(pile.humanCorpse){
    if(!destroyHumanCorpse(world,pile,cause))return false;
    for(const p of world.pawns){
      if(referencesPile(p,pile.id))interruptWork(world,p);
      if(p.interruptedCargo&&!world.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)&&!world.packed.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id))delete p.interruptedCargo;
    }
    refreshStock(world);return true;
  }
  const neutral=cause==='fire'?undefined:neutralLossPlan(world,{items:{[pile.item]:pile.quantity}});if(neutral===null)return false;
  const state=cause==='fire'?ensureFireState(world):undefined,loss=state?.ledger.items[pile.item]??0;if(state&&!addSafe(loss,pile.quantity))return false;
  // Retire the source before releasing consumers; releasing must not drop a burnt pile back onto the ground.
  world.piles=world.piles.filter(p=>p!==pile);
  for(const p of world.pawns){
    if(p.droppedWeaponId===pile.id)delete p.droppedWeaponId;
    if(referencesPile(p,pile.id))interruptWork(world,p);
    if(p.interruptedCargo&&!world.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)&&!world.packed.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id))delete p.interruptedCargo;
  }
  for(const a of world.wildlife?.animals??[])if(a.meal?.kind==='pile'&&a.meal.id===pile.id){delete a.meal;a.path=[];a.nextDecision=world.tick;}
  if(state)state.ledger.items[pile.item]=loss+pile.quantity;if(neutral)world.destroyed=neutral;refreshStock(world);return true;
}
/** Damage installed or packed furniture. Salvage is preflighted before a fatal hit.
 * Quarter raw-material restitution follows the existing cooler adaptation. */
export type StructureDamageCause='fire'|'melee'|'bullet'|'bomb';
export interface StructureDamageContext {core:number;rawAmount:number;instigatorKey?:BombInstigatorKey;detonate?:true}
export function damageStructure(world:World,s:Structure,amount:number,cause:StructureDamageCause='fire',rng=world.rng,external?:StructureDamageContext):boolean {
  const packed=world.packed.find(p=>p.building===s),installed=world.structures.includes(s),max=structureMaxHp(s);
  if(!max||!positive(amount)||!installed&&!packed)return false;
  if(external&&(!Number.isFinite(external.rawAmount)||external.rawAmount<0||!Number.isSafeInteger(external.core)||external.core<Math.max(0,(world.tick-1)*10)||external.core>world.tick*10))return false;
  const core=external?.core??world.tick*10,explosive=world.schemaVersion>=193&&installed&&s.kind==='mini-turret'&&!!s.turret&&miniTurretExplosive(s.id);
  const detonates=explosive&&(external?.detonate|| (external?.rawAmount??amount)>=max-(s.damage??0));
  if(explosive&&!Number.isSafeInteger(core+240)||detonates&&(!Number.isSafeInteger(core+5)||world.bombWaves&&world.bombWaves.length>=world.width*world.height))return false;
  const damage=detonates?max:(s.damage??0)+amount;
  if(damage<max){s.damage=damage;if(cause!=='fire')world.rng=rng;if(explosive&&max-damage<=Math.round(max*.2))startTurretWick(world,s,core,external?.instigatorKey);return true;}
  const owner=packed?.owner,origin=owner?.type==='ground'?owner:owner?.type==='pawn'||owner?.type==='inventory'?world.pawns.find(p=>p.id===owner.pawnId)??s:s;
  // Refusing a fatal hit must not create a fire ledger or advance its stream.
  const state=cause==='fire'&&!detonates?(world.fires??ensureFireState({...world})):undefined;
  const ids=new Set(world.jobs.filter(j=>j.repair?.structureId===s.id||j.fixBreakdown?.structureId===s.id||j.deconstruction?.structureId===s.id||j.furniture?.structureId===s.id||j.flick?.structureId===s.id).map(j=>j.id));
  const breakdownIds=new Set(world.jobs.filter(j=>j.fixBreakdown?.structureId===s.id).map(j=>j.id));
  const delivered=world.piles.filter(p=>p.owner.type==='job'&&breakdownIds.has(p.owner.jobId));
  const serviceLoss=delivered.reduce((sum,p)=>sum+(p.item==='component'?p.quantity:0),0);
  const actors=world.pawns.filter(p=>{
    const h=p.haul;
    return p.jobId!==null&&ids.has(p.jobId)||p.research?.stationId===s.id||p.cooking?.stationId===s.id
      ||h&&(h.whole&&h.sourcePileId===s.id||(h.destination.type==='fuel'||h.destination.type==='turret')&&h.destination.structureId===s.id||h.destination.type==='job'&&ids.has(h.destination.jobId))
      ||p.need?.kind==='sleep'&&p.need.bedId===s.id||p.recreation.task?.buildingId===s.id||p.recreation.task?.seatId===s.id||p.rescue?.bedId===s.id;
  });
  const plan=planStructureDestruction(detonates?{...world,nextId:world.nextId+1}:world,s,actors,origin,state?.rng??rng);if(!plan)return false;
  if(detonates&&!Number.isSafeInteger(world.nextId+1+(plan.salvage?.drops.length??0)))return false;
  const {salvage,drops}=plan;
  const destruction=world.destroyed??{count:0,lost:{}},lost={...destruction.lost};
  for(const cost of constructionRecipe(s).ingredients){const key=cost.item as keyof typeof lost,quantity=cost.quantity-(salvage?.returned.get(cost.item)??0);if(quantity)lost[key]=(lost[key]??0)+quantity;}
  if(serviceLoss)lost.component=(lost.component??0)+serviceLoss;
  const fuelLost=s.fuel?.ticks??0,fuelBurned=s.fuel?.burned??0;
  const energy=s.battery?(s.battery.stored+(s.battery.half?.5:0)):0;
  const totals=state?.ledger??destruction;
  if(!addSafe(totals.fuelTicksLost??0,fuelLost)||!addSafe(totals.fuelTicksBurned??0,fuelBurned)||!addSafe(destruction.count,1)||!Object.values(lost).every(Number.isSafeInteger)||!Number.isSafeInteger(((totals.batteryEnergyLost??0)+energy)*2)
    ||state&&(!addSafe(state.ledger.structures,1)||!addSafe(state.ledger.items.component??0,serviceLoss)))return false;
  if(state)world.fires=state;
  const waveId=detonates?world.nextId++:undefined;
  world.structures=world.structures.filter(b=>b!==s);world.packed=world.packed.filter(p=>p!==packed);
  for(const p of world.pawns)if(p.bombRefuge?.sourceId===s.id){
    p.bombRefuge.endCore=Math.min(p.bombRefuge.endCore,core);
    if(waveId===undefined&&!p.moveCooldown&&!(p.motion&&p.motion.end>world.tick)&&!p.melee?.strike&&!p.shooting?.stance&&!p.stun){delete p.bombRefuge;p.path=[];if(p.state!=='dead'&&p.state!=='downed')p.state='idle';}
  }
  invalidateAnimalPens(world);
  // Commit exactly the floor preview before health/roof/task interruption can
  // cause other deposits. Those later effects see the already occupied floor.
  for(const p of actors){
    const held=world.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id);
    if(held&&drops.has(held.id))commitDrop(world,held,p,drops);
    const pack=world.packed.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id);
    if(pack&&drops.has(pack.building.id))releaseFurniture(world,p,drops);
  }
  if(delivered.length)world.piles=world.piles.filter(p=>!delivered.includes(p));
  if(state){if(salvage)state.rng=salvage.rng;}else world.rng=salvage?.rng??rng;
  if(salvage)for(const drop of salvage.drops)addMaterial(world,ITEM_DEFINITIONS[drop.item].kind,drop.quantity,{type:'ground',...drop.cell},drop.item);
  for(const p of actors)interruptWork(world,p);
  for(const a of world.wildlife?.animals??[])if(a.manhunter?.door?.targetId===s.id)delete a.manhunter.door;
  removeJobs(world,ids);
  for(const p of world.pawns){
    if(p.bedId===s.id)p.bedId=null;
    if(p.need?.kind==='eat'&&p.need.dining?.tableId===s.id)p.need.dining.tableId=null;
  }
  releaseStructureMelee(world,s.id);
  world.destroyed={...destruction,count:destruction.count+1,lost};
  if(state){state.ledger.structures++;state.ledger.batteryEnergyLost+=energy;state.ledger.fuelTicksLost+=fuelLost;state.ledger.fuelTicksBurned+=fuelBurned;
    if(serviceLoss)state.ledger.items.component=(state.ledger.items.component??0)+serviceLoss;
  }else {
    if(fuelLost)world.destroyed.fuelTicksLost=(destruction.fuelTicksLost??0)+fuelLost;
    if(fuelBurned)world.destroyed.fuelTicksBurned=(destruction.fuelTicksBurned??0)+fuelBurned;
    if(energy)world.destroyed.batteryEnergyLost=(destruction.batteryEnergyLost??0)+energy;
  }
  if(world.fires)world.fires.batteryWicks=world.fires.batteryWicks.filter(w=>w.structureId!==s.id);
  if(s.kind==='hydroponics-basin')removeHydroponicPlants(world,s);
  detachMissingBills(world);detachMissingFlakBills(world);detachMissingGunBills(world);detachMissingArtBills(world);detachMissingComponentBills(world);reconcilePower(world);if(installed)reconcileRoofSupport(world,false,s);refreshStock(world);
  if(waveId!==undefined)registerBombWave(world,s,waveId,core,external?.instigatorKey??s.turret?.wick?.instigatorKey);return true;
}
