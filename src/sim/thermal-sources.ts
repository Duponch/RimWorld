import { isPowerActive } from './power-rules.ts';
import type { World } from './types.ts';
import type { ThermalLayout } from './thermal-topology.ts';

/** Heat per Core second, distributed over six local steps. Fuel consumption
 * stays independent: an idle or outdoor passive cooler still uses its wood.
 * As with the fire, continuous clamping replaces Core's staggered impulses. */
export function applyThermalSources(world:World,layout:ThermalLayout):void {
  const regions=world.thermal?.regions;if(!regions)return;
  for(const source of world.structures) {
    if(!source.fuel?.ticks)continue;
    const id=layout.indices[source.z*world.width+source.x]!;if(id<0)continue;
    const room=regions[id]!;
    if(source.kind==='wood-generator'&&isPowerActive(source))room.temperature=Math.min(1000,room.temperature+1/room.cells.length);
    else if(source.kind==='campfire'&&room.temperature<28)room.temperature=Math.min(28,room.temperature+21/6/room.cells.length);
    else if(source.kind==='passive-cooler'&&room.temperature>17)room.temperature=Math.max(17,room.temperature-11/6/room.cells.length);
  }
}
