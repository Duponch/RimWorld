import { prisonFoodChecker } from './prison-food.ts';
import { automaticallyHaulable } from './mining-rules.ts';
import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import { storageAccepts } from './storage-filters.ts';
import type { World } from './types.ts';

/** Linear conservative rejection before an expensive navigation flood.
 * False means no hauling can improve storage. True still requires all reservations/access checks. */
export function mayImproveStorage(world:World):boolean {
  const zones=new Map(world.stockpiles.map(z=>[z.z*world.width+z.x,z]));
  const piles=new Map(world.piles.flatMap(p=>p.owner.type==='ground'?[[p.owner.z*world.width+p.owner.x,p] as const]:[]));
  const best=new Map<ItemId,number>();
  for(const zone of world.stockpiles) {
    const pile=piles.get(zone.z*world.width+zone.x);
    for(const item of Object.keys(ITEM_DEFINITIONS) as ItemId[]) {
      const definition=ITEM_DEFINITIONS[item];
      if(storageAccepts(zone,item)&&(!pile||pile.item===item)&&Math.min(zone.capacity,definition.stackLimit)>(pile?.quantity??0))best.set(item,Math.max(best.get(item)??0,zone.priority));
    }
  }
  const isPrisonFood=prisonFoodChecker(world);
  for(const pile of piles.values())if(automaticallyHaulable(pile)&&!isPrisonFood(pile)&&pile.owner.type==='ground') {
    const zone=zones.get(pile.owner.z*world.width+pile.owner.x);
    const current=zone&&storageAccepts(zone,pile.item)&&pile.quantity<=zone.capacity?zone.priority:0;
    if((best.get(pile.item)??0)>current)return true;
  }
  return false;
}
