import {validAnimalTrainingTransport282} from './animal-training-save-282.ts';
import {validateDomesticAnimals} from './domestic-save.ts';
import type {World} from './types.ts';

/** New resident/public relation only. Old worlds retain their existing guard
 * and do not acquire another clinical, room or ground-storage census. */
export function validAnimalTrainingWorld282(w:World):boolean {
 try{
  if(!validAnimalTrainingTransport282(w))return false;
  return !w.pawns.some(p=>p.animalHandling?.kind==='train')||validateDomesticAnimals(w,w.schemaVersion).length===0;
 }catch{return false;}
}
