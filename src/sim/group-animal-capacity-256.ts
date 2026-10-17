import type {WildAnimal} from './wildlife-state.ts';
import type {CaravanPhysicalPawn256} from './group-animal-state-256.ts';
import {animalCore256,isAnimalSpecies256,animalLifeStageData256} from './animal-core-v256.ts';
import {animalBodySize,animalLifeStage} from './animal-life.ts';
const RIDING:Readonly<Record<string,number>>=Object.freeze({dromedary:1.3,horse:1.6,donkey:1.3,elephant:1.3});
export const isCaravanAnimal256=(p:CaravanPhysicalPawn256):p is WildAnimal=>'species' in p;
export function animalCaravanCapacityGrams256(a:WildAnimal):number {
 const pack=isAnimalSpecies256(a.species)?animalCore256(a.species).race.packAnimal:a.species==='muffalo'||a.species==='dromedary';
 return pack?Math.round(animalBodySize(a)*35000):0;
}
/** Same gram convention as the existing item capacity capture. Downed does
 * not erase capacity: CanEverCarryAnything is distinct from CarryTracker. */
export function caravanPawnCapacityGrams256(p:CaravanPhysicalPawn256):number {return isCaravanAnimal256(p)?animalCaravanCapacityGrams256(p):35000;}
export function animalCaravanRidingFactor256(a:WildAnimal):number {
 if(a.state==='dead'||a.state==='downed'||a.health?.death)return 1;
 const adult=isAnimalSpecies256(a.species)?animalLifeStageData256(a.species,a.ageTicks,a.growthTracker?.value).definition==='AnimalAdult':animalLifeStage(a)==='adult';
 return adult?RIDING[a.species]??1:1;
}
/** Core chooses highest riding factors, at most one per human, then pads
 * unmatched humans with1. No minimum MoveSpeed/slowest-animal proxy. */
export function caravanRidingFactor256(humans:number,animals:readonly WildAnimal[]):number {
 if(!Number.isSafeInteger(humans)||humans<1)return 1;const factors=animals.map(animalCaravanRidingFactor256).filter(n=>n>1).sort((a,b)=>b-a).slice(0,humans);let total=humans-factors.length;for(const f of factors)total=Math.fround(total+Math.fround(f));return Math.fround(total/humans);
}
