import { interruptWork } from './interrupted-cargo.ts';
import { penRegion } from './animal-pens.ts';
import type { World } from './types.ts';

/** Death, corpse conversion and loss of tameness can precede a travelling
 * worker's turn. Release claims immediately; physical cargo survives. */
export function reconcileDomesticWork(world:World):void {
  for(const animal of world.wildlife?.animals??[]){
    const id=animal.domestic?.penMarkerId;
    if(id!==undefined&&!world.structures.some(s=>s.id===id&&s.kind==='pen-marker'&&s.pen?.accepted.includes(animal.species)))delete animal.domestic!.penMarkerId;
  }
  for(const pawn of world.pawns){
    const task=pawn.animalHandling??pawn.animalCare;if(!task)continue;
    const animal=world.wildlife?.animals.find(a=>a.id===task.animalId);
    const h=pawn.animalHandling;
    if(!animal||animal.state==='dead'||(h?h.kind==='tame'?!animal.taming?.designated||!!animal.domestic:h.kind==='lead'?!animal.domestic||h.markerId===undefined||animal.domestic.penMarkerId!==h.markerId||!penRegion(world,h.markerId)?.closed:!animal.domestic:!animal.domestic||animal.domestic.care==='none'))interruptWork(world,pawn);
  }
}
