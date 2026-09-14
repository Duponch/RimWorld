import { groundOccupancyAllows, occupancyOf } from './occupancy.ts';
import { footprintCells } from './definitions.ts';
import { cancelGrowingJobs } from './farming.ts';
import { planCommandDrops } from './work-release.ts';
import { dropRetainingIdentity } from './ground-placement.ts';
import { reconcileOrders } from './player-orders.ts';
import type { World } from './types.ts';

/** V20 allowed incidental drops inside beds/fires. Relocate only those legacy
 * piles, preserving identity, item, quantity and age; fail before adoption. */
export function initializeOccupancy(world:World):void {
  Object.assign(world,{schemaVersion:21});
  for(const pile of world.piles)if(pile.owner.type==='ground'&&!groundOccupancyAllows(world,pile.owner)) {
    if(!dropRetainingIdentity(world,pile,pile.owner))throw new Error('No ground cell for legacy furniture contents.');
  }
  const blocked=new Set([...world.structures,...world.jobs].filter(s=>occupancyOf(s.kind)?.zones===false).flatMap(s=>footprintCells(s).map(c=>c.z*world.width+c.x)));
  for(const zone of world.growingZones)if(zone.cells.some(c=>blocked.has(c))) {
    const drops=planCommandDrops(world,{type:'growing-policy',zoneId:zone.id,allowSow:zone.allowSow,allowCut:zone.allowCut});
    if(!drops)throw new Error('No ground cell for legacy growing clearance.');
    cancelGrowingJobs(world,new Set([zone.id]),drops);
    world.growingZones=world.growingZones.map(z=>z.id===zone.id?{...z,cells:z.cells.filter(c=>!blocked.has(c))}:z).filter(z=>z.cells.length);
    world.growingCursor=0;
  }
  reconcileOrders(world);
}
