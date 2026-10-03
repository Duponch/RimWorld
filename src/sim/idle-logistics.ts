import { prisonFoodChecker } from './prison-food.ts';
import { automaticallyHaulable } from './mining-rules.ts';
import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import { storageAccepts } from './storage-filters.ts';
import { storageConditionAccepts,storageConditionKey } from './storage-condition.ts';
import type { StockpileCell, World } from './types.ts';

/** Linear conservative rejection before an expensive navigation flood.
 * False means no hauling can improve storage. True still requires all reservations/access checks. */
export function mayImproveStorage(world:World):boolean {
  const zones=new Map(world.stockpiles.map(z=>[z.z*world.width+z.x,z]));
  const piles=new Map(world.piles.flatMap(p=>p.owner.type==='ground'?[[p.owner.z*world.width+p.owner.x,p] as const]:[]));
  const best=new Map<ItemId,number>();
  // Keep the historical fast path when no range is active. Geometry/category
  // candidates are shared by item; state admission is cached separately per
  // immutable equivalence class, for this decision only.
  const conditional=world.stockpiles.some(z=>z.quality!==undefined||z.hitPoints!==undefined);
  const candidates=conditional?new Map<ItemId,Map<string,StockpileCell>>():undefined;
  const items=conditional?[...new Set([...piles.values()].map(p=>p.item))]:Object.keys(ITEM_DEFINITIONS) as ItemId[];
  for(const zone of world.stockpiles) {
    const pile=piles.get(zone.z*world.width+zone.x);
    const policy=candidates?`${zone.quality?.min??'-'}:${zone.quality?.max??'-'}:${zone.hitPoints?.min??'-'}:${zone.hitPoints?.max??'-'}`:'';
    for(const item of items) {
      const definition=ITEM_DEFINITIONS[item];
      if(storageAccepts(zone,item)&&(!pile||pile.item===item)&&Math.min(zone.capacity,definition.stackLimit)>(pile?.quantity??0)){
        best.set(item,Math.max(best.get(item)??0,zone.priority));
        // Once geometry/item admission is known, identical range policies
        // differ only by priority for this conservative gate. Keep the best.
        if(candidates){let list=candidates.get(item);if(!list)candidates.set(item,list=new Map());const previous=list.get(policy);if(!previous||previous.priority<zone.priority)list.set(policy,zone);}
      }
    }
  }
  const isPrisonFood=prisonFoodChecker(world);
  const stateBest=new Map<string,number>();
  for(const pile of piles.values())if(automaticallyHaulable(pile)&&!isPrisonFood(pile)&&pile.owner.type==='ground') {
    const zone=zones.get(pile.owner.z*world.width+pile.owner.x);
    const current=zone&&storageAccepts(zone,pile)&&pile.quantity<=zone.capacity?zone.priority:0;
    const coarse=best.get(pile.item)??0;
    if(coarse<=current)continue;
    if(!candidates)return true;
    const key=storageConditionKey(pile);
    let admitted=stateBest.get(key);
    if(admitted===undefined){
      admitted=0;
      for(const destination of candidates.get(pile.item)?.values()??[])if(destination.priority>admitted&&storageConditionAccepts(destination,pile)){
        admitted=destination.priority;if(admitted===coarse)break;
      }
      stateBest.set(key,admitted);
    }
    if(admitted>current)return true;
  }
  return false;
}
