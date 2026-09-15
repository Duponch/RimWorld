import { isPowerActive } from './power-rules.ts';
import type { World } from './types.ts';

/** All current sources have their strongest channel in red. Consequently a
 * scalar sum still represents the reference's maximum RGB channel exactly;
 * arbitrary coloured lamps will require independent RGB accumulators. */
export function lightSources(world:World):{cell:number;radius:number;red:number}[] {
  return world.structures.flatMap(s=>{
    const cell=s.z*world.width+s.x;
    if(s.kind==='campfire'&&s.fuel?.ticks)return [{cell,radius:10,red:252}];
    if(s.kind==='wood-generator'&&isPowerActive(s))return [{cell,radius:6,red:217}];
    if(s.kind==='standing-lamp'&&isPowerActive(s))return [{cell,radius:12,red:214}];
    return [];
  }).sort((a,b)=>a.cell-b.cell);
}
