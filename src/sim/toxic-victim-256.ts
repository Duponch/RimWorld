import {CORE_ANIMAL_DATA_256} from './animal-core-data-v256.ts';
import {isAnimalSpecies256} from './animal-core-v256.ts';
import {CORPSE_ROT_TICKS} from './corpses.ts';
import type {Pawn} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {MedicalRecord} from './injury-types.ts';
import type {RotState} from './food-preservation.ts';
/** Core flesh human default0; all seven represented historical animal races
 * inherit AnimalBase .5. The actual39 use their resolved native stat. Core
 * apparel available here adds no ToxicResistance (environment resistance is
 * a distinct stat and does not reduce a bite). No DLC gene is synthesized. */
export function toxicResistance256(actor:Pawn|WildAnimal):number {
 return 'species'in actor?isAnimalSpecies256(actor.species)?CORE_ANIMAL_DATA_256[actor.species].stats.ToxicResistance:.5:0;
}
/** The single decision was made at the true terminal commit. Transfer it to
 * this same physical corpse, retaining its actual thermal clock/rate. */
export function toxicCorpseRot256(record:MedicalRecord|undefined,rot:RotState):RotState {
 return record?.toxicBuildup?.rotOnDeath?{...rot,progress:Math.max(rot.progress,CORPSE_ROT_TICKS)}:rot;
}
/** Descriptor-only guard witness from the same actual terminal record. */
export function toxicCorpseRotAllowance256(record:unknown,observedAt:number):number {
 if(!record||typeof record!=='object')return 0;
 const data=(v:object,k:string)=>{const d=Object.getOwnPropertyDescriptor(v,k);return d&&'value'in d&&d.enumerable?d.value:undefined;};
 const death=data(record,'death'),toxic=data(record,'toxicBuildup');
 if(!death||typeof death!=='object'||!toxic||typeof toxic!=='object')return 0;
 const tick=data(death,'tick');return Number.isSafeInteger(tick)&&tick<=observedAt&&data(toxic,'rotOnDeath')===true?CORPSE_ROT_TICKS:0;
}
