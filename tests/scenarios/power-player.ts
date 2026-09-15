import { canDesignate } from '../../src/sim/engine.ts';
import type { World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

/** The player spends mined materials after shelter/workshop, then lights the
 * covered camp with a nearby outdoor generator. No state or stock injection. */
export function powerDecisions(world:World):Decision[] {
  if(!world.structures.some(s=>s.kind==='stonecutter'))return [];
  const cx=Math.floor(world.width/2),cz=Math.floor(world.height/2);
  for(const [kind,x,z] of [['wood-generator',cx+6,cz-4],['standing-lamp',cx+2,cz-2]] as const) {
    if(world.structures.some(s=>s.kind===kind)||world.jobs.some(j=>j.kind===kind))continue;
    if(kind==='standing-lamp'&&!world.structures.some(s=>s.kind==='wood-generator'))continue;
    const command={type:'designate',kind,x,z,material:'steel',orientation:0} as const;
    if(canDesignate(world,command).ok)return [{reason:kind==='wood-generator'?'Construire une alimentation au bois à l’extérieur du camp.':'Éclairer le camp couvert avec une lampe raccordée au générateur.',command}];
  }
  return [];
}
