import {isSchema256Or257} from './schema-compatibility-257.ts';
import {cobraAdmissionReason256} from './cobra-admission-256.ts';
import {toxicFalloutActive294} from './toxic-fallout-state-294.ts';
import type {prepareWorldAnimalGeneration256} from './world-pawn-generation-256.ts';
/** Actual GenStep1200 producer over a genuine fresh map. Physical capture is
 * shared for the whole phase; no old starter World, independent wildlife RNG,
 * radial substitute, density reduction, partial cohort or favorable reroll. */
import {INITIAL_ANIMAL_FACTS_256,type InitialAnimalFact256} from './initial-animal-data-256.ts';
import {constructInitialWildAnimal256,type InitialAnimalConstruction256} from './initial-animal-constructor-256.ts';
import {captureRandomClosewalk256,randomClosewalkCellNear256,type RandomClosewalkCapture256} from './random-closewalk-256.ts';
import {localBiomeRules256} from './local-biome-rules-v256.ts';
import {geographicSeasonTemperature256,geographicLongitudeOffsetCore256,climateTick} from './site-climate.ts';
import {animalMechanicalReadiness256} from './animal-readiness-v256.ts';
import {isAnimalSpecies256} from './animal-core-v256.ts';
import {terrainIsWater256} from './natural-terrain-runtime-256.ts';
import {orderedCoreLocalMutators256} from './world-local-mutators-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {World,Tile} from './types.ts';
import {MAX_WILDLIFE,type WildAnimal} from './wildlife-state.ts';
export const INITIAL_ANIMALS_SEED_PART_256=1298760307;
import {GEOGRAPHIC_FAUNA_PROFILE_256} from './geographic-fauna-profile-256.ts';
export {GEOGRAPHIC_FAUNA_PROFILE_256};
const f=Math.fround;
const facts:Readonly<Record<string,InitialAnimalFact256>>=INITIAL_ANIMAL_FACTS_256;
const bySpecies=new Map(Object.values(facts).map(row=>[row.species,row]));
export interface InitialAnimalTicket256 {readonly fact:InitialAnimalFact256;readonly commonality:number;readonly weight:number}
/** IEnumerable reservoir, including every zero-weight draw AFTER the first
 * positive entry. A zero at Rand.Value==1 may replace that entry in Core. */
export function selectInitialAnimalTicket256(rows:readonly InitialAnimalTicket256[],random:Pick<WorldGenerationRandom,'float'>):InitialAnimalTicket256|undefined {
 let selected:InitialAnimalTicket256|undefined,total=0;
 for(const row of rows){const weight=f(Math.max(0,row.weight));if(!selected){if(weight===0)continue;selected=row;total=weight;continue;}
  const next=f(total+weight);if(random.float(0,next)>=total)selected=row;total=next;
 }return selected;
}
function actualTerrain(tile:Tile):Tile['terrain'] {return tile.mineable?.terrain??tile.collapsedRock?.terrain??tile.terrain;}
function terrainAvoidsWander(tile:Tile):boolean {return !tile.floor&&!tile.bridge&&(actualTerrain(tile)==='mud'||terrainIsWater256(actualTerrain(tile)));}
function anyActualWater(tiles:readonly Tile[]):boolean {return tiles.some(t=>!t.floor&&!t.bridge&&terrainIsWater256(actualTerrain(t)));}
export function randomInitialAnimalSpawnCell256(c:RandomClosewalkCapture256,tiles:readonly Tile[],random:WorldGenerationRandom):number {
 for(let attempt=0;attempt<1000;attempt++){const x=random.integer(0,c.width),z=random.integer(0,c.height),cell=z*c.width+x,district=c.physical.district(cell);
  // All installed prospective natural/road/floor definitions have dangerous
  // false. Water and Mud carry the actual avoidWander flag; occupants ignored.
  if(c.physical.standable(cell)&&!terrainAvoidsWander(tiles[cell]!)&&district?.touchesMapEdge)return cell;
 }
 return random.integer(0,c.width)+random.integer(0,c.height)*c.width;
}
export function initialAnimalTargetWeight256(area:number,density:number,seasonCommonality:number,totalCommonality:number,conditionFactor=1):{density:number;weight:number} {
 const desired=f(f(f(density)*f(f(seasonCommonality)/f(totalCommonality)))*f(conditionFactor));
 return {density:desired,weight:desired===0?0:f(f(area)/f(10000/desired))};
}
export type InitialAnimalsResult256=
 |{status:'ready';profile:typeof GEOGRAPHIC_FAUNA_PROFILE_256;originals:WildAnimal[];initialGrowth:{animalId:number;value:number;nextCheckCore:number}[];nextId:number;attempts:number;stop:'full'|'no-choice'|'attempt-limit';targetWeight:number;density:number;randomState:Readonly<{seed:number;counter:number}>}
 |{status:'blocked';reason:string;defId?:string;attempts:number;construction?:Extract<InitialAnimalConstruction256,{status:'blocked'}>;randomState:Readonly<{seed:number;counter:number}>};
/** No callback is used for choosing, placement, construction or clinical
 * history. The two lists are real DATA authorities: PawnKindDef enumeration
 * order, and actual campaign-retained animals (never projected people). */
export function produceInitialAnimals256(world:World,options:{random:WorldGenerationRandom;pawnKindOrder:readonly string[];unspawnedAnimals:readonly WildAnimal[];closewalk?:RandomClosewalkCapture256;worldGeneration?:ReturnType<typeof prepareWorldAnimalGeneration256>}):InitialAnimalsResult256 {
 const {random}=options,site=world.site;
 if(!isSchema256Or257(world.schemaVersion)||site?.revision!==3||world.climate?.revision!==4||world.climate.tileId!==site.tileId)throw Error('Initial fauna requires actual fresh256 Site3/climate4');
 if(!Number.isSafeInteger(world.nextId)||world.nextId<1)throw Error('Invalid initial fauna namespace');
 const rules=localBiomeRules256(site.biome,world.schemaVersion);if(!rules)throw Error('Missing actual geographic biome fauna');
 // The only four active Core-only modifiers currently represented by Site3
 // all inherit density/commonality factors1. Future modifiers must add real
 // facts before admission, never receive a generic default here.
 orderedCoreLocalMutators256(site.mutatorCode);
 const order=new Set(options.pawnKindOrder);if(order.size!==options.pawnKindOrder.length||rules.wildAnimals.some(row=>!order.has(row.defId)))throw Error('Incomplete or duplicate actual PawnKindDef enumeration');
 const required=new Map(rules.wildAnimals.map(row=>[String(row.defId),f(row.commonality)])),all:InitialAnimalTicket256[]=[];
 const season=geographicSeasonTemperature256(world.climate.definition,climateTick(world)*10-geographicLongitudeOffsetCore256(world.climate.definition.longitude));
 let total=0,acceptable=0;
 for(const defId of options.pawnKindOrder){const commonality=required.get(defId);if(commonality===undefined||commonality<=0)continue;const fact=facts[defId];if(!fact)throw Error('Missing real animal kind definition: '+defId);
  total=f(total+commonality);const allowed=season>f(fact.comfyMin)&&season<f(fact.comfyMax);if(allowed){acceptable=f(acceptable+commonality);all.push({fact,commonality,weight:commonality});}
 }
 // Only this map's actual active fallout suppresses spontaneous fauna.
 const target=initialAnimalTargetWeight256(world.width*world.height,rules.scalars.animalDensity,acceptable,total,toxicFalloutActive294(world)?0:1);
 const capture=options.closewalk??captureRandomClosewalk256(world),water=anyActualWater(world.tiles);
 if(capture.width!==world.width||capture.height!==world.height)throw Error('Initial fauna physical capture mismatch');
 const tickets=all.map(row=>({...row,weight:row.fact.waterSeeker&&!water?0:f(row.commonality/f(f(row.fact.wildGroupSize[0]+row.fact.wildGroupSize[1])/2))}));
 const originals:WildAnimal[]=[],initialGrowth:{animalId:number;value:number;nextCheckCore:number}[]=[],local=world.wildlife?.animals??[];let nextId=world.nextId,weight=0,attempts=0;
 for(const animal of local)if(animal.state!=='dead'&&!animal.domestic&&!animal.hive){const fact=bySpecies.get(animal.species);if(!fact)throw Error('Unrepresented spawned wild-kind ecological weight');weight=f(weight+f(fact.ecoSystemWeight));}
 const blocked=(reason:string,defId?:string,construction?:Extract<InitialAnimalConstruction256,{status:'blocked'}>):InitialAnimalsResult256=>({status:'blocked',reason,...(defId?{defId}:{}),attempts,...(construction?{construction}:{}),randomState:random.state});
 const ready=(stop:'full'|'no-choice'|'attempt-limit'):InitialAnimalsResult256=>({status:'ready',profile:GEOGRAPHIC_FAUNA_PROFILE_256,originals,initialGrowth,nextId,attempts,stop,targetWeight:target.weight,density:target.density,randomState:random.state});
 while(!(weight>=target.weight)){
  if(++attempts>=10000)return ready('attempt-limit');
  const anchor=randomInitialAnimalSpawnCell256(capture,world.tiles,random),ticket=selectInitialAnimalTicket256(tickets,random);if(!ticket)return ready('no-choice');
  const fact=ticket.fact;if(fact.species==='cobra'){const reason=cobraAdmissionReason256(world);if(reason)return blocked(reason,fact.defId);}if(isAnimalSpecies256(fact.species)&&!animalMechanicalReadiness256(fact.species).ok)return blocked('Real selected species has an unsupported mechanic',fact.defId);
  const count=random.integer(fact.wildGroupSize[0],fact.wildGroupSize[1]+1),radius=Math.ceil(Math.sqrt(fact.wildGroupSize[1]));
  if(local.length+(world.wildlife?.flyers?.length??0)+originals.length+count>MAX_WILDLIFE)return blocked('Actual cohort exceeds current resident capacity; it was not truncated',fact.defId);
  if(!Number.isSafeInteger(nextId+count))return blocked('Identity frontier overflow',fact.defId);
  for(let member=0;member<count;member++){
   const cell=randomClosewalkCellNear256(capture,anchor,radius,random),at={x:cell%world.width,z:Math.floor(cell/world.width)};
   if(options.worldGeneration){
    const made=options.worldGeneration.generate(fact,at);
    if(made.status==='blocked')return blocked(made.reason,fact.defId,made.construction?.status==='blocked'?made.construction:undefined);
    nextId=options.worldGeneration.nextId;originals.push(made.animal);
    if(made.initialGrowth)initialGrowth.push({animalId:made.animal.id,...made.initialGrowth});
    weight=f(weight+f(fact.ecoSystemWeight));continue;
   }
   const made=constructInitialWildAnimal256({fact,id:nextId++,cell:at,tick:world.tick,random,unspawnedAnimals:options.unspawnedAnimals});
   if(made.status==='blocked')return blocked(made.reason,fact.defId,made);
   // wildAnimalScariaChance is0 for all14 Core-only natural biome definitions:
   // Rand.Chance0 has no draw. canFlyIn=false never creates a Duck holder.
   originals.push(made.animal);initialGrowth.push({animalId:made.animal.id,value:made.growth,nextCheckCore:made.nextGrowthCheckCore});weight=f(weight+f(fact.ecoSystemWeight));
  }
 }
 return ready('full');
}
