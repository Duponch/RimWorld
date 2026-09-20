import { butcherStationEfficiency } from './food-workstations.ts';
import { corpseFresh,corpseYield } from './corpses.ts';
import { butcheryEfficiency,completedCookingSkill,roundYield } from './cooking-statistics.ts';
import { freshRot } from './food-preservation.ts';
import { groundCapacity,groundPile,nearbyGround } from './ground-placement.ts';
import { healthRandom } from './health.ts';
import { ITEM_DEFINITIONS,type ItemId } from './items.ts';
import { refreshStock } from './materials.ts';
import type { CookingBill } from './cooking-types.ts';
import type { ProductionContext } from './production-output.ts';
import type { Cell,MaterialPile,Pawn,World } from './types.ts';

/** Products are decided together; the secondary output is placed in physical
 * reach, while the first output uses the existing single-cargo delivery task. */
export function finishButchery(world:World,pawn:Pawn,bill:CookingBill,context:ProductionContext):boolean {
  const task=pawn.cooking!,corpse=world.piles.find(p=>p.id===task.ingredients[0]?.pileId);
  if(!corpse||!corpseFresh(corpse,world.tick)||corpse.owner.type!=='ground')return false;
  const skill=completedCookingSkill(pawn,task.workTicks??0),worker={...pawn,skills:{...pawn.skills,cooking:skill}};
  const station=world.structures.find(s=>s.id===task.stationId);if(!station)return false;
  const raw=corpseYield(corpse),factor=butcheryEfficiency(worker)*butcherStationEfficiency(station),random={rng:world.rng};
  const meat=roundYield(raw.meat*factor,()=>healthRandom(random)),leather=roundYield(raw.leather*factor,()=>healthRandom(random));
  const products:readonly {item:ItemId;quantity:number}[]=[{item:'hare-meat',quantity:meat},{item:'light-leather',quantity:leather}].filter(p=>p.quantity>0) as {item:ItemId;quantity:number}[];
  const ledger=world.butchery??{completed:0,meat:0,leather:0};
  if(![ledger.completed+1,ledger.meat+meat,ledger.leather+leather].every(Number.isSafeInteger))return false;
  const primary=products[0],secondary=products[1],piles=world.piles.filter(p=>p!==corpse),projected={...world,piles};
  let cell:Cell|undefined,existing:MaterialPile|undefined;
  if(secondary){
    cell=nearbyGround(projected,pawn,1).find(c=>groundCapacity(projected,c,secondary.item,pawn.id)>=secondary.quantity);
    if(!cell)return false;
    existing=groundPile(projected,cell);
  }
  const identities=(primary?1:0)+(secondary&&!existing?1:0);
  if(piles.length+identities>32768||!Number.isSafeInteger(world.nextId+identities))return false;
  // From this point nothing can fail: no actor, source, RNG or learning was
  // mutated before every product and capacity was proven possible.
  world.piles=piles;world.rng=random.rng;pawn.skills.cooking=skill;
  world.butchery={completed:ledger.completed+1,meat:ledger.meat+meat,leather:ledger.leather+leather};
  if(secondary){
    if(existing)existing.quantity+=secondary.quantity;
    else world.piles.push({id:world.nextId++,item:secondary.item,kind:ITEM_DEFINITIONS[secondary.item].kind,quantity:secondary.quantity,owner:{type:'ground',...cell!}});
  }
  if(primary){
    const id=world.nextId++;
    world.piles.push({id,item:primary.item,kind:ITEM_DEFINITIONS[primary.item].kind,quantity:primary.quantity,owner:{type:'pawn',pawnId:pawn.id},...freshRot(primary.item,world.tick)});
    task.ingredients=[];task.productId=id;task.phase='output';task.progress=0;delete task.workTicks;task.storageId=null;delete task.storageQuantity;
  }else {pawn.cooking=null;if(pawn.orders.active==='cook')pawn.orders.active=null;pawn.state='idle';}
  pawn.path=[];pawn.planCooldown=0;
  if(bill.mode==='times')bill.target=Math.max(0,bill.target-1);
  refreshStock(world);context.event(`${pawn.name} a dépecé un lièvre : ${meat} viande, ${leather} cuir léger.`);
  return true;
}
