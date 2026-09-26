import { isAnimalSpecies } from './animal-species.ts';
import { PEN_ANIMALS } from './animal-pens.ts';
import type { World } from './types.ts';

/** Marker policy is an explicit saved player choice. The geometric region is
 * derived from actual barriers and never persisted. */
export function validateAnimalPens(world:World,version:number):string[] {
  const errors:string[]=[];
  for(const s of world.structures){
    if(s.kind==='pen-marker'){
      if(version<119||!s.pen||!Array.isArray(s.pen.accepted)||Object.keys(s.pen).length!==1
        ||s.pen.accepted.some(id=>!isAnimalSpecies(id)||!PEN_ANIMALS.includes(id))
        ||new Set(s.pen.accepted).size!==s.pen.accepted.length)errors.push('Invalid pen marker policy.');
    }else if(s.pen!==undefined)errors.push('Unexpected pen policy.');
  }
  for(const job of world.jobs)if((job as unknown as {pen?:unknown}).pen!==undefined)errors.push('Unexpected pen policy on construction.');
  return errors;
}
