import { interruptWork } from './interrupted-cargo.ts';
import type { World } from './types.ts';

/** Death, corpse conversion and loss of tameness can precede a travelling
 * worker's turn. Release claims immediately; physical cargo survives. */
export function reconcileDomesticWork(world:World):void {
  for(const pawn of world.pawns){
    const task=pawn.animalHandling??pawn.animalCare;if(!task)continue;
    const animal=world.wildlife?.animals.find(a=>a.id===task.animalId);
    const h=pawn.animalHandling;
    if(!animal||animal.state==='dead'||(h?h.kind==='tame'?!animal.taming?.designated||!!animal.domestic:!animal.domestic:!animal.domestic||animal.domestic.care==='none'))interruptWork(world,pawn);
  }
}
