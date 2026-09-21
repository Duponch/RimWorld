import { butcherStationEfficiency } from './food-workstations.ts';
import { corpseFresh,corpseProducts } from './corpses.ts';
import { butcheryEfficiency,completedCookingSkill,roundYield } from './cooking-statistics.ts';
import { freshRot,mergeRot } from './food-preservation.ts';
import { groundPile,planGroundPlacement } from './ground-placement.ts';
import { healthRandom } from './health.ts';
import { ITEM_DEFINITIONS,type ItemId } from './items.ts';
import { refreshStock } from './materials.ts';
import type { CookingBill } from './cooking-types.ts';
import type { ProductionContext } from './production-output.ts';
import type { Cell,MaterialPile,Pawn,World } from './types.ts';
import { animalSpecies } from './animal-species.ts';

/** Products are decided together; the secondary output is placed in physical
 * reach, while the first output uses the existing single-cargo delivery task. */
export function finishButchery(world:World,pawn:Pawn,bill:CookingBill,context:ProductionContext):boolean {
  const task=pawn.cooking!,corpse=world.piles.find(p=>p.id===task.ingredients[0]?.pileId);
  if(!corpse||!corpseFresh(corpse,world.tick)||corpse.owner.type!=='ground')return false;
  const skill=completedCookingSkill(pawn,task.workTicks??0),worker={...pawn,skills:{...pawn.skills,cooking:skill}};
  const station=world.structures.find(s=>s.id===task.stationId);if(!station)return false;
  const raw=corpseProducts(corpse);if(!raw)return false;
  const factor=butcheryEfficiency(worker)*butcherStationEfficiency(station),random={rng:world.rng};
  const meat=roundYield(raw.meat.quantity*factor,()=>healthRandom(random)),leather=roundYield(raw.leather.quantity*factor,()=>healthRandom(random));
  const meatItem=raw.meat.item as ItemId,leatherItem=raw.leather.item as ItemId,primaryQuantity=Math.min(meat,ITEM_DEFINITIONS[meatItem].stackLimit);
  const ledger=world.butchery??{completed:0,meat:0,leather:0};
  if(![ledger.completed+1,ledger.meat+meat,ledger.leather+leather].every(Number.isSafeInteger))return false;
  const piles=world.piles.filter(p=>p!==corpse),projected={...world,piles:piles.map(p=>({...p,owner:{...p.owner}}))};
  const placements:{item:ItemId;cell:Cell;quantity:number}[]=[];
  const reserve=(item:ItemId,quantity:number):boolean=>{
    if(quantity<=0)return true;const plan=planGroundPlacement(projected,quantity,pawn,item);if(!plan)return false;
    for(const entry of plan){placements.push({item,...entry});const existing=groundPile(projected,entry.cell);if(existing)existing.quantity+=entry.quantity;else projected.piles.push({id:0,item,kind:ITEM_DEFINITIONS[item].kind,quantity:entry.quantity,owner:{type:'ground',...entry.cell}});}
    return true;
  };
  if(!reserve(meatItem,meat-primaryQuantity)||!reserve(leatherItem,leather))return false;
  const identities=(primaryQuantity?1:0)+placements.filter(p=>!groundPile({ ...world,piles } as World,p.cell)).length;
  if(piles.length+identities>32768||!Number.isSafeInteger(world.nextId+identities))return false;
  // From this point nothing can fail: no actor, source, RNG or learning was
  // mutated before every product and capacity was proven possible.
  world.piles=piles;world.rng=random.rng;pawn.skills.cooking=skill;
  world.butchery={completed:ledger.completed+1,meat:ledger.meat+meat,leather:ledger.leather+leather};
  for(const placement of placements){
    const existing=groundPile(world,placement.cell);
    if(existing){mergeRot(existing,placement.quantity,0,world.tick);existing.quantity+=placement.quantity;}
    else world.piles.push({id:world.nextId++,item:placement.item,kind:ITEM_DEFINITIONS[placement.item].kind,quantity:placement.quantity,owner:{type:'ground',...placement.cell},...freshRot(placement.item,world.tick)});
  }
  if(primaryQuantity){
    const id=world.nextId++;
    world.piles.push({id,item:meatItem,kind:ITEM_DEFINITIONS[meatItem].kind,quantity:primaryQuantity,owner:{type:'pawn',pawnId:pawn.id},...freshRot(meatItem,world.tick)});
    task.ingredients=[];task.productId=id;task.phase='output';task.progress=0;delete task.workTicks;task.storageId=null;delete task.storageQuantity;
  }else {pawn.cooking=null;if(pawn.orders.active==='cook')pawn.orders.active=null;pawn.state='idle';}
  pawn.path=[];pawn.planCooldown=0;
  if(bill.mode==='times')bill.target=Math.max(0,bill.target-1);
  refreshStock(world);context.event(`${pawn.name} a dépecé ${animalSpecies(corpse.corpse!.species).label} : ${meat} viande, ${leather} cuir.`);
  return true;
}
