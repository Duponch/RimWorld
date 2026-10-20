import {eggSpeciesForItem256} from './animal-egg-content-v256.ts';
import {animalCore256,isAnimalSpecies256} from './animal-core-v256.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {ItemId} from './items.ts';
import {isAnimalMeat} from './biome-items.ts';
import {SCHEMA_VERSION} from './types.ts';
/** Numeric food categories, not a predator/herbivore inference. The source
 * composite flags are facts; actual candidates/contact remain wildlife-food. */
const flags:Readonly<Record<string,number>>={AnimalProduct:0x20,VegetarianRoughAnimal:0x1f51,CarnivoreAnimal:0xb0a,CarnivoreAnimalStrict:0xa,OmnivoreAnimal:0x1f1b,OmnivoreRoughAnimal:0x1f5b,OvivoreAnimal:0xb20};
export function animalDietFlags256(species:WildAnimal['species']):number|undefined {
 if(!isAnimalSpecies256(species))return;
 let value=0;for(const name of animalCore256(species).race.foodType.split(',')){
  const key=name.trim();if(!Object.hasOwn(flags,key))throw Error('Unbound animal food category.');value|=flags[key]!;
 }
 return value;
}
export function animalPlantDiet256(a:WildAnimal,tree=false):boolean|undefined {
 const diet=animalDietFlags256(a.species);return diet===undefined?undefined:(diet&(tree?0x80:0x40))!==0;
}
export function animalItemDiet256(a:WildAnimal,item:ItemId,corpse=false,version:number=SCHEMA_VERSION):boolean|undefined {
 if(item==='hops'&&version<265)return false;
 const diet=animalDietFlags256(a.species);if(diet===undefined)return;
 const category=item==='raw-fungus'?0x1001:corpse?8:isAnimalMeat(item)?2:item==='hay'||item==='hops'?0x40:item==='kibble'?0x800:item==='milk'||item==='insect-jelly'||eggSpeciesForItem256(item)?0x20:item==='pemmican'?0x200:item.endsWith('-meal')||item==='legacy-portion'?0x100:['berries','rice','corn','potato','agave-fruit'].includes(item)?1:0;
 return category!==0&&(diet&category)!==0;
}

/** Only the new Fungus item is admitted by these resolved Core categories.
 * Historical foods/plant selection for the seven old species stay literal. */
const legacyFungusFlags256={"hare":8017,"snow-hare":8017,"deer":8017,"muffalo":8017,"gazelle":8017,"dromedary":8017,"red-fox":2826} as const;
export function legacyAnimalFungus256(species:unknown,version:number):boolean {
 return version>=256&&typeof species==='string'&&Object.hasOwn(legacyFungusFlags256,species)&&((legacyFungusFlags256 as Readonly<Record<string,number>>)[species]!&0x1001)!==0;
}
