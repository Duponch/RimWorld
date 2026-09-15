import { canDesignate } from '../../src/sim/engine.ts';
import type { World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

/** A player cools a warm enclosed room after shelter, not an open camp.
 * One cooler per retained air region; field/cargo locations remain physical. */
export function coolingDecisions(world:World):Decision[] {
  for(const room of world.thermal?.regions??[]) {
    if(room.cells.length>100||room.temperature<=26)continue;
    const cells=new Set(room.cells);
    if([...world.structures,...world.jobs].some(s=>s.kind==='passive-cooler'&&cells.has(s.z*world.width+s.x)))continue;
    for(const i of room.cells) {
      const command={type:'designate' as const,kind:'passive-cooler' as const,material:'wood' as const,x:i%world.width,z:Math.floor(i/world.width),orientation:0 as const};
      if(canDesignate(world,command).ok)return [{reason:'Rafraîchir une pièce chaude avec du bois après sa couverture.',command}];
    }
  }
  return [];
}
