import {ANIMAL_EGG_CONTENT_256,isEggSpecies256} from './animal-egg-content-v256.ts';
import {trackedAnimalLifeStage256} from './animal-growth-runtime-256.ts';
import {animalGrowthFactor} from './animal-life.ts';
import {groupHashOffset256} from './group-core-cadence-256.ts';
import type {WildAnimal} from './wildlife-state.ts';
const f=Math.fround,period=2500,low=-2147483648,high=2147483647;
/** Count actual CompTick hash hits in (fromCore,toCore], including signed
 * int32 overflow. The delta form of IsHashIntervalTick is NOT equivalent for
 * a negative remainder, so the ten Core ticks are not approximated by it. */
export function worldPawnEggTickCount256(id:number,fromCore:number,toCore:number):number {
 if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(fromCore)||fromCore<0||!Number.isSafeInteger(toCore)||toCore-fromCore!==10)throw Error('Invalid actual WorldPawn egg interval');
 const hash=groupHashOffset256(id),first=(((fromCore+1)|0)+hash)|0,last=((toCore|0)+hash)|0;
 const count=(a:number,b:number)=>Math.floor(b/period)-Math.floor((a-1)/period);
 return first<=last?count(first,last):count(first,high)+count(low,last);
}
/** No new persistence or inferred health flags. A real adult stage is stable
 * under further growth. Immature females need the actual Pawn tickDelta15
 * phase before their CompTick-versus-AgeTick ordering can be certified. */
export function worldPawnEggBoundary256(a:WildAnimal,permanentClinical:boolean):string|null {
 if(!a.eggLayer)return null;
 if(!isEggSpecies256(a.species)||!a.growthTracker)return 'Actual WorldPawn egg definition/growth owner is missing';
 if(f(a.eggLayer.progress)!==a.eggLayer.progress)return 'Actual WorldPawn egg progress must retain its native float32 value';
 const def=ANIMAL_EGG_CONTENT_256[a.species];if(def.femaleOnly&&a.sex!=='female')return null;
 const stage=trackedAnimalLifeStage256(a.species,a.growthTracker);
 if(stage.definition!=='AnimalAdult')return 'Immature WorldPawn egg comp requires its actual native age-interval phase';
 if(!stage.milkable||!stage.reproductive)return null;
 if(!permanentClinical)return 'Active WorldPawn egg comp with evolving health requires its exact intra-interval death frontier';
 return null;
}
/** Reject only the unresolved collision of two real events, before any egg,
 * age, clinical mutation or birthday draw. The owner does not persist native
 * tickDelta15, so a favorable ordering cannot be inferred from its clock. */
export function worldPawnEggIntervalBoundary256(a:WildAnimal,fromCore:number,toCore:number):string|null {
 if(!a.eggLayer||!isEggSpecies256(a.species))return null;
 const def=ANIMAL_EGG_CONTENT_256[a.species];if(def.femaleOnly&&a.sex!=='female')return null;
 if(!Number.isSafeInteger(fromCore)||fromCore<0||!Number.isSafeInteger(toCore)||toCore-fromCore!==10)return 'WorldPawn egg comp requires its actual ten-Core interval';
 const before=a.ageTicks*10+(a.ageCoreRemainder??0),after=before+10;
 if(!Number.isSafeInteger(before)||before<0||!Number.isSafeInteger(after))return 'WorldPawn egg biological clock is exhausted';
 if(Math.floor(before/3600000)!==Math.floor(after/3600000)&&worldPawnEggTickCount256(a.id,fromCore,toCore))return 'WorldPawn egg hash and biological birthday require their actual native intra-interval order';
 return null;
}
/** The caller's existing PRIVATE row outcome only, before age/health. No job,
 * egg Thing, fertility decrement, birth, allocation, RNG, map or inventory is
 * manufactured. Mothballed rows never call this comp, matching TickMothballed. */
export function advanceWorldPawnEggLayer256(a:WildAnimal,fromCore:number,toCore:number):void {
 if(!a.eggLayer||!isEggSpecies256(a.species))return;
 const def=ANIMAL_EGG_CONTENT_256[a.species];if(def.femaleOnly&&a.sex!=='female')return;
 if(!a.growthTracker)throw Error('Missing actual WorldPawn egg growth owner');
 const stage=trackedAnimalLifeStage256(a.species,a.growthTracker);if(!stage.milkable||!stage.reproductive)return;
 if(stage.definition!=='AnimalAdult')throw Error('Unprepared immature WorldPawn egg comp');
 if(!worldPawnEggTickCount256(a.id,fromCore,toCore))return;
 const increment=f(f(f(2500)/f(f(def.intervalDays)*f(60000)))*f(animalGrowthFactor(a)));
 const layer=a.eggLayer;layer.progress=Math.min(1,f(layer.progress+increment));
 if(def.unfertilizedProgressMaximum<1&&layer.fertilizations===0&&layer.progress>=def.unfertilizedProgressMaximum)layer.progress=def.unfertilizedProgressMaximum;
}
