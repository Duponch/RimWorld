/** These four no-wildness pets keep learned Tameness without maintenance.
 * Other species retain their existing paths; Obedience/master belongs to875. */
import {STARTING_PET_FOUR_DATA_256} from './starting-pet-four-data-256.ts';
export function startingPetFourNoTamenessDecay256(species:unknown):boolean {
 return typeof species==='string'&&Object.hasOwn(STARTING_PET_FOUR_DATA_256,species)&&STARTING_PET_FOUR_DATA_256[species as keyof typeof STARTING_PET_FOUR_DATA_256].stats.Wildness<=Math.fround(.101);
}
