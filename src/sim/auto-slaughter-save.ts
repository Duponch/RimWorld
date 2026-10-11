import { AUTO_SLAUGHTER_SPECIES,type AutoSlaughterConfig } from './auto-slaughter-state.ts';
import type { World } from './types.ts';

const species=AUTO_SLAUGHTER_SPECIES;
const limits=['maxTotal','maxMales','maxMalesYoung','maxFemales','maxFemalesYoung'] as const;
const fields=['species',...limits,'allowPregnant'] as const;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);

/** Configurations carry only prospective limits, never cached animal IDs. */
export function validAutoSlaughterConfig(value:unknown):value is AutoSlaughterConfig {
  return object(value)&&Object.keys(value).length===fields.length
    &&fields.every(key=>Object.hasOwn(value,key))&&Object.keys(value).every(key=>(fields as readonly string[]).includes(key))
    &&(species as readonly unknown[]).includes(value.species)&&typeof value.allowPregnant==='boolean'
    &&limits.every(key=>Number.isSafeInteger(value[key])&&Number(value[key])>=-1);
}

/** File and Decoder use the same sparse, version-aware policy admission. */
export function validAutoSlaughterTransport(world:World,version:number=world.schemaVersion):boolean {
  try {
    if(!Object.hasOwn(world,'autoSlaughter'))return true;
    const configs:unknown=world.autoSlaughter;
    return version>=228&&Array.isArray(configs)&&configs.length<=species.length
      &&configs.every(validAutoSlaughterConfig)&&new Set(configs.map(config=>config.species)).size===configs.length;
  }catch{return false;}
}
