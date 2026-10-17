/** Native anatomy facts for prospective originals only. This does not widen
 * the historical species gate or replace an unmarked medical record. */
import {CORE_ANIMAL_DATA_256} from './animal-core-data-v256.ts';
import type {AnimalSpeciesId256} from './animal-core-data-v256.ts';
import type {AnimalBodyDef256} from './animal-anatomy-data-v256.ts';
import type {AnimalSpeciesId} from './animal-species.ts';
const originals={"hare":{"coreDefId":"Hare","body":"QuadrupedAnimalWithPawsAndTail","baseHealthScale":0.4},"snow-hare":{"coreDefId":"Snowhare","body":"QuadrupedAnimalWithPawsAndTail","baseHealthScale":0.4},"deer":{"coreDefId":"Deer","body":"QuadrupedAnimalWithHooves","baseHealthScale":0.9},"muffalo":{"coreDefId":"Muffalo","body":"QuadrupedAnimalWithHooves","baseHealthScale":1.75},"gazelle":{"coreDefId":"Gazelle","body":"QuadrupedAnimalWithHooves","baseHealthScale":0.7},"dromedary":{"coreDefId":"Dromedary","body":"QuadrupedAnimalWithHoovesAndHump","baseHealthScale":1.6},"red-fox":{"coreDefId":"Fox_Red","body":"QuadrupedAnimalWithPawsAndTail","baseHealthScale":0.7}} as const;
for(const row of Object.values(originals))Object.freeze(row);Object.freeze(originals);
export function nativeAnimalAnatomy256(species:AnimalSpeciesId):Readonly<{body:AnimalBodyDef256;baseHealthScale:number}> {
 if(Object.hasOwn(CORE_ANIMAL_DATA_256,species)){const race=CORE_ANIMAL_DATA_256[species as AnimalSpeciesId256].race;return {body:race.body,baseHealthScale:race.baseHealthScale};}
 if(Object.hasOwn(originals,species))return originals[species as keyof typeof originals];
 throw Error('Unknown native animal anatomy');
}
