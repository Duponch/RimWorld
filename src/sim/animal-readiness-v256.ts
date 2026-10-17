import {isAnimalSpecies256} from './animal-core-v256.ts';
/** Cobra uses its real systemic venom runtime. Actual owner cohorts are
 * additionally checked at generation/spawn/entry before any transfer. */
export const animalMechanicalReadiness256=(species:unknown):{ok:true}|{ok:false;missing:readonly string[]}=>isAnimalSpecies256(species)?{ok:true}:{ok:false,missing:['No prospective species definition']};
