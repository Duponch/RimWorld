import {nextHeatSeverity} from './heat-severity.ts';
import {nextColdSeverity} from './cold-rules.ts';
import {apparelInsulation} from './apparel-rules.ts';
import {animalComfyRange256,isAnimalSpecies256} from './animal-core-v256.ts';
import {actualNativeSevenFacts256} from './actual-animal-profile-256.ts';
import {groupPawnInterval256} from './group-core-cadence-256.ts';
import {reconcileMedicalDeath} from './injury-state.ts';
import type {MedicalRecord} from './injury-types.ts';
import type {Pawn,MaterialPile} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
type Actor=Pawn|WildAnimal;
/** Thing.AmbientTemperature: a true WorldPawn has no ParentHolder/valid Tile.
 * This literal native fallback applies to its actor, never its held goods. */
export const WORLD_PAWN_NO_HOLDER_TEMPERATURE_259=21;
export function offmapThermalRange259(actor:Actor,items:readonly MaterialPile[]):{min:number;max:number}|string {
 if('species'in actor){
  // These real races use HypothermicSlowdown, which is not represented by the
  // existing human/animal hypothermia dossier. Never substitute that hediff.
  if(['megascarab','spelopede','megaspider'].includes(actor.species))return 'Actual off-map Insectoid HypothermicSlowdown is not represented';
  if(isAnimalSpecies256(actor.species)){const r=animalComfyRange256(actor.species);return {min:r.minimum,max:r.maximum};}
  const r=actualNativeSevenFacts256(actor);return r?{min:r.comfyMin,max:r.comfyMax}:'Actual off-map animal comfortable-temperature profile is not proven';
 }
 let min=16,max=26;for(const p of items)if(p.owner.type==='apparel'&&p.owner.pawnId===actor.id){const r=apparelInsulation(p);min-=r.cold;max+=r.heat;}return {min,max};
}
/** One actual local frontier, after its sole clinical interval. The existing
 * Core hash60 predicate admits at most one giver call in these ten Core ticks.
 * No spatial frostbite, fabricated World or changed medical date/RNG. */
export function advanceOffmapThermal259(actor:Actor,items:readonly MaterialPile[],atCore:number,temperature:number,create:()=>MedicalRecord):void {
 if(actor.health?.death||!groupPawnInterval256(actor.id,atCore,60,10))return;
 const range=offmapThermalRange259(actor,items);if(typeof range==='string')throw Error(range);
 if(!Number.isFinite(temperature))throw Error('Actual off-map ambient temperature is absent');
 if(temperature>range.max+150)throw Error('Actual off-map ambient-air burn damage is not represented');
 const h=actor.health,heat=h?.heatstroke??0,cold=h?.hypothermia??0;
 const nextHeat=nextHeatSeverity(heat,temperature,range.max),nextCold=nextColdSeverity(cold,temperature,range.min,true);
 if(nextHeat===heat&&nextCold===cold)return;
 const record=h??create();if(record.tick!==atCore/10)throw Error('Actual off-map thermal medical frontier differs from its owner');
 actor.health=record;
 if(nextHeat)record.heatstroke=nextHeat;else delete record.heatstroke;
 // Heat giver can kill before Hypothermia's turn; preserve that true barrier.
 reconcileMedicalDeath(record);if(record.death)return;
 if(nextCold)record.hypothermia=nextCold;else delete record.hypothermia;
 reconcileMedicalDeath(record);
}
