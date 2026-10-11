/** Only animals already obtainable through the existing domestic circuit. */
export const AUTO_SLAUGHTER_SPECIES=['hare','deer','gazelle','muffalo','dromedary'] as const;
export type AutoSlaughterSpecies=typeof AUTO_SLAUGHTER_SPECIES[number];
export interface AutoSlaughterConfig {
  species:AutoSlaughterSpecies;
  maxTotal:number;
  maxMales:number;
  maxMalesYoung:number;
  maxFemales:number;
  maxFemalesYoung:number;
  allowPregnant:boolean;
}
export type AutoSlaughterCommand={type:'auto-slaughter-policy';config:AutoSlaughterConfig};
export function defaultAutoSlaughterConfig(species:AutoSlaughterSpecies):AutoSlaughterConfig {
  return {species,maxTotal:-1,maxMales:-1,maxMalesYoung:-1,maxFemales:-1,maxFemalesYoung:-1,allowPregnant:false};
}
