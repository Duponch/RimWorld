import { deconstructionCamp } from './deconstruction';
import { addGroundMaterial } from '../../src/sim/materials';
import { startFire } from '../../src/sim/fire';
import type { Cell,World } from '../../src/sim/types';
/** Controlled incident fixture: ordinary camp, no natural chronology claim. */
export function fireCamp(count=1):World {
  const w=deconstructionCamp(count);for(const p of w.pawns){p.recreation.level=100;p.priorities.build=0;p.priorities.craft=0;p.priorities.mine=0;}
  return w;
}
export function woodFire(w:World,c:Cell,size=.6):number {
  addGroundMaterial(w,'wood',20,c,'wood');if(!startFire(w,c,size))throw new Error('Fire fixture could not ignite its wood.');return w.fires!.items.at(-1)!.id;
}
