import { isPowerActive } from './power-rules.ts';
import { applyHeaterHeat } from './heater.ts';
import type { Structure, World } from './types.ts';
import type { ThermalLayout } from './thermal-topology.ts';

/** Heat per Core second, distributed over six local steps. Fuel consumption
 * stays independent: an idle or outdoor passive cooler still uses its wood.
 * As with the fire, continuous clamping replaces Core's staggered impulses. */
export function applyThermalSources(world:World,layout:ThermalLayout):void {
  const regions=world.thermal?.regions;
  for(const source of world.structures) {
    if(source.kind==='heater'){applyHeaterHeat(world,source,layout);continue;}
    if(!regions)continue;
    if(source.kind==='electric-stove'?!isPowerActive(source):!source.fuel?.ticks)continue;
    const id=layout.indices[source.z*world.width+source.x]!;if(id<0)continue;
    const room=regions[id]!;
    if(source.kind==='fueled-stove'||source.kind==='electric-stove')room.temperature=Math.min(1000,room.temperature+(source.kind==='fueled-stove'?4:3)/6/room.cells.length);
    else if(source.kind==='wood-generator'&&isPowerActive(source))room.temperature=Math.min(1000,room.temperature+1/room.cells.length);
    else if(source.kind==='campfire'&&room.temperature<28)room.temperature=Math.min(28,room.temperature+21/6/room.cells.length);
    else if(source.kind==='passive-cooler'&&room.temperature>17)room.temperature=Math.max(17,room.temperature-11/6/room.cells.length);
  }
}
/** The work itself adds .1 heat per Core tick (one per local tick).
 * Heat is applied immediately; no ephemeral work flag affects save/replay. */
export function applyCookingHeat(world:World,station:Structure,fraction=1):void {
  if(station.kind!=='fueled-stove'&&station.kind!=='electric-stove')return;
  const index=station.z*world.width+station.x;
  for(const room of world.thermal?.regions??[]) {
    let lo=0,hi=room.cells.length;
    while(lo<hi){const mid=(lo+hi)>>>1;if(room.cells[mid]!<index)lo=mid+1;else hi=mid;}
    if(room.cells[lo]===index){room.temperature=Math.min(1000,room.temperature+fraction/room.cells.length);return;}
  }
}
