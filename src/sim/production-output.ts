import { mergeThingDamage } from './thing-damage-rules.ts';
import { copyPileCondition } from './pile-condition.ts';
import { mergeRot, rotAge } from './food-preservation.ts';
import { groundCapacity, groundPile, nearbyGround, storageCapacity } from './ground-placement.ts';
import { refreshStock, transferPile } from './materials.ts';
import { routeToJob, type Reachability } from './pathfinding.ts';
import type { NeedContext } from './needs.ts';
import type { Cell, MaterialPile, Pawn, Structure, World } from './types.ts';

const near=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)<=1;
export interface ProductionContext extends NeedContext { candidates?():Reachability|null; workRate(station:Structure,worker:Cell):number }
function finish(pawn:Pawn):void {pawn.cooking=null;if(pawn.orders.active==='cook')pawn.orders.active=null;pawn.path=[];pawn.state='idle';pawn.planCooldown=0;}
/** A partial output keeps the held ID; only its deposited fraction can merge. */
function deposit(world:World,pawn:Pawn,product:MaterialPile,cell:Cell,quantity:number):boolean {
  if(quantity<1||groundCapacity(world,cell,product.item,pawn.id)<quantity)return false;
  if(quantity===product.quantity)return transferPile(world,product,{type:'ground',x:cell.x,z:cell.z});
  const target=groundPile(world,cell);
  if(target){mergeThingDamage(target,quantity,product.damage);mergeRot(target,quantity,rotAge(product,world.tick),world.tick);target.quantity+=quantity;}
  else {
    if(world.piles.length>=32768||!Number.isSafeInteger(world.nextId+1))return false;
    world.piles.push({...product,...copyPileCondition(product),id:world.nextId++,quantity,owner:{type:'ground',x:cell.x,z:cell.z}});
  }
  product.quantity-=quantity;refreshStock(world);return true;
}
function depositAndContinue(world:World,pawn:Pawn,product:MaterialPile,cell:Cell,quantity:number):void {
  const complete=quantity===product.quantity;
  if(!deposit(world,pawn,product,cell,quantity)){pawn.planCooldown=20;return;}
  if(complete)finish(pawn);
  else {pawn.cooking!.storageId=null;delete pawn.cooking!.storageQuantity;pawn.path=[];pawn.planCooldown=0;pawn.state='working';}
}
export function processProductionOutput(world:World,pawn:Pawn,context:ProductionContext,destination:'stockpile'|'drop'):void {
  const task=pawn.cooking!,product=world.piles.find(p=>p.id===task.productId);
  if(!product){context.release();return;}
  if(destination==='stockpile') {
    const target=world.stockpiles.find(s=>s.id===task.storageId),quantity=task.storageQuantity??product.quantity;
    if(target&&storageCapacity(world,target,product.item,pawn.id)>=quantity) {
      task.actionCell={x:target.x,z:target.z};
      if(!near(pawn,target)){context.move(target,false);return;}
      depositAndContinue(world,pawn,product,target,quantity);return;
    }
    task.storageId=null;delete task.storageQuantity;
    if(pawn.planCooldown>0)return;
    const targets=world.stockpiles.filter(s=>s.filters[product.kind])
      .sort((a,b)=>b.priority-a.priority||(pawn.x-a.x)**2+(pawn.z-a.z)**2-((pawn.x-b.x)**2+(pawn.z-b.z)**2)||a.id-b.id);
    if(targets.length) {
      const reach=context.candidates?context.candidates():context.search();if(!reach)return;
      for(const zone of targets) {
        const capacity=storageCapacity(world,zone,product.item,pawn.id);if(capacity<=0)continue;
        const path=routeToJob(world,zone,reach,true);if(!path)continue;
        task.storageId=zone.id;
        if(task.recipe==='stone-blocks'||task.recipe==='butcher-creature')task.storageQuantity=Math.min(product.quantity,capacity);
        pawn.path=path;pawn.state='moving';pawn.planCooldown=0;return;
      }
    }
  }
  if(pawn.planCooldown>0)return;
  // Re-evaluate at an action boundary; no remote deposit across the map.
  const targets=nearbyGround(world,pawn).filter(c=>groundCapacity(world,c,product.item,pawn.id)>0);
  const close=targets.find(c=>near(pawn,c));
  if(close){task.actionCell={...close};depositAndContinue(world,pawn,product,close,Math.min(product.quantity,groundCapacity(world,close,product.item,pawn.id)));return;}
  if(targets.length) {
    const reach=context.candidates?context.candidates():context.search();if(!reach)return;
    for(const target of targets){const path=routeToJob(world,target,reach,true);if(path){task.actionCell={...target};pawn.path=path;pawn.state='moving';return;}}
  }
  pawn.state='working';pawn.planCooldown=20;
}
