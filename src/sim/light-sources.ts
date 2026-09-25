import { isPowerActive } from './power-rules.ts';
import type { World } from './types.ts';

export interface LightSource {cell:number;radius:number;red:number;green:number;blue:number}

/** Core 1.6.4871 glower channels. Warm sources share a red maximum, allowing
 * the scalar fast path; the powered machining table is blue-dominant. */
export function lightSources(world:World):LightSource[] {
  return world.structures.flatMap(s=>{
    const cell=s.z*world.width+s.x;
    if(s.kind==='campfire'&&s.fuel?.ticks)return [{cell,radius:10,red:252,green:187,blue:113}];
    if(s.kind==='wood-generator'&&isPowerActive(s))return [{cell,radius:6,red:217,green:112,blue:33}];
    if(s.kind==='standing-lamp'&&isPowerActive(s))return [{cell,radius:12,red:214,green:148,blue:94}];
    if(s.kind==='machining-table'&&isPowerActive(s))return [{cell,radius:5,red:73,green:123,blue:138}];
    return [];
  }).sort((a,b)=>a.cell-b.cell);
}
