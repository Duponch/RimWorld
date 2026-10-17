/** Original constructor for CompSpawnerPawn's three fixed-adult kinds.
 * The existing animal, growth and mind owners are used without a proxy. */
import type {WildAnimal} from './wildlife-state.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import {attachActualAnimalGrowth256} from './animal-growth-runtime-256.ts';
import {constructAnimalMind256} from './animal-condition-mental-state-256.ts';
import {CAVE_INSECT_DATA_256} from './cave-insect-data-256.ts';
export type CaveInsectSpecies256=keyof typeof CAVE_INSECT_DATA_256;
export const isCaveInsectSpecies256=(v:unknown):v is CaveInsectSpecies256=>typeof v==='string'&&Object.hasOwn(CAVE_INSECT_DATA_256,v);
export type HiveInsectMembership256={factionId:number;lordId:number|null;spawnerId:number|null};
export function constructHiveInsect256(input:{species:CaveInsectSpecies256;id:number;cell:{x:number;z:number};tick:number;random:Pick<WorldGenerationRandom,'value'|'integer'|'float'>;unspawnedAnimals:readonly WildAnimal[]}):{status:'ready';animal:WildAnimal}|{status:'blocked';reason:string} {
 const {species,id,tick,cell,random}=input,f=Math.fround;
 if(!isCaveInsectSpecies256(species)||!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(tick)||tick<0||!Number.isSafeInteger(tick*10+240)||!Number.isInteger(cell.x)||!Number.isInteger(cell.z))throw Error('Invalid actual hive-insect constructor frontier');
 if(input.unspawnedAnimals.some(a=>a.species===species))return {status:'blocked',reason:'Actual retained same-race original requires the real WorldPawn redress transaction'};
 const fact=CAVE_INSECT_DATA_256[species];
 random.value(); // ChanceToRedress still draws with no eligible original.
 random.float(.5,.9);if(fact.race.needsRest)random.float(.9,1);
 const sex=random.value()<.5?'male':'female';
 // FixedBiologicalAge is the last lifeStage minAge in CompSpawnerPawn.
 const ageCore=Math.trunc(f(f(fact.lifeStages.at(-1)!.minAgeYears)*3600000));
 random.value(); // cryptosleepCommonality0 direct comparison.
 random.integer(20,41); // actual initial age-reversal demand.
 const nutrition=random.float(.5,.9),rest=fact.race.needsRest?random.float(.9,1):1;
 const animal:WildAnimal={id,species,sex,x:cell.x,z:cell.z,ageTicks:Math.floor(ageCore/10),ageCoreRemainder:ageCore%10,food:f(nutrition*f(f(fact.stats.MaxNutrition)*f(fact.race.baseBodySize))),rest,state:'idle',path:[],nextDecision:tick+1,caravanCarrySick:false};
 attachActualAnimalGrowth256(animal,{value:1,nextCheckCore:tick*10+240},256);
 constructAnimalMind256(animal,256);
 // All three fixed ages are <1 year AND <lifeExpectancy/8. Actual initial
 // scar and birthday loops therefore execute zero iterations, not a healthy
 // replacement of a selected disease or an omitted random age distribution.
 if(ageCore>=3600000||ageCore/3600000>=fact.race.lifeExpectancy/8)throw Error('Hive fixed-age clinical frontier changed; actual producer must be extended');
 random.value(); // direct combat-drug guard with chance0.
 return {status:'ready',animal};
}
