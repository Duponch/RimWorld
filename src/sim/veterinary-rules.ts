import type { AnimalSpeciesId } from './animal-species.ts';
import { infectionNeedsRest } from './infection-state.ts';
import { freshMissing } from './injury-state.ts';
import type { MedicalRecord } from './injury-types.ts';

/** Care ownership follows the five already domesticated species. Historical
 * worlds retain their original hare-only admission. */
export function veterinaryCareSpeciesAllowed(species:AnimalSpeciesId,version:number):boolean {
  return species==='hare'?version>=106:version>=212&&
    (species==='deer'||species==='gazelle'||species==='muffalo'||species==='dromedary');
}

/** Core medical rest includes healing tended wounds and nonimmune infections,
 * even when no new pansement is due. Permanent scars do not require rest. */
export function veterinaryNeedsRest(record:MedicalRecord):boolean {
  return !record.death&&(record.injuries.some(i=>i.scar?.pain===undefined)||
    record.missing.some(m=>freshMissing(record,m))||infectionNeedsRest(record));
}
