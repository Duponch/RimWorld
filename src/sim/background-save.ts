import { validBackground } from './colonist-backgrounds.ts';
import { validHumanAge, type HumanAge } from './human-age.ts';

/** Narrow shared guard: neither generation, skills nor RNG are involved. */
export function validOfferedBackground(value:unknown,version:number):boolean {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const offer=value as Record<string,unknown>;
  if(offer.age===undefined&&offer.background===undefined)return true;
  return version>=191&&offer.age!==undefined&&offer.background!==undefined
    &&validHumanAge(offer.age,version)&&validBackground(offer.background,version,offer.age as HumanAge);
}
