import {animalConditionMedicalRest256} from './animal-condition-care-256.ts';
import {isAnimalSpecies256} from './animal-core-v256.ts';
import type { AnimalSpeciesId } from './animal-species.ts';
import { infectionNeedsRest } from './infection-state.ts';
import { freshMissing } from './injury-state.ts';
import type { MedicalRecord } from './injury-types.ts';

/** Care ownership follows the five already domesticated species. Historical
 * worlds retain their original hare-only admission. */
export function veterinaryCareSpeciesAllowed(species:AnimalSpeciesId,version:number,owner?:Pick<import("./wildlife-state.ts").WildAnimal,"species"|"growthTracker">):boolean {
  if(version>=256&&(isAnimalSpecies256(species)||owner?.species===species&&!!owner.growthTracker))return true;
  return species==='hare'?version>=106:version>=212&&
    (species==='deer'||species==='gazelle'||species==='muffalo'||species==='dromedary');
}

/** Core medical rest includes healing tended wounds and nonimmune infections,
 * even when no new pansement is due. Permanent scars do not require rest. */
export function veterinaryNeedsRest(record:MedicalRecord):boolean {
  return !record.death&&(animalConditionMedicalRest256(record)||record.injuries.some(i=>i.scar?.pain===undefined)||
    record.missing.some(m=>freshMissing(record,m))||infectionNeedsRest(record));
}
