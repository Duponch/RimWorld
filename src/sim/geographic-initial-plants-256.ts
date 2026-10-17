/** Real generation-to-owner transfer. The private step stream and planned
 * plants are not a second runtime flora authority or a saved history. */
import type {World,Resource} from './types.ts';
import {actualWildPlantReader256,initializeActualWildFlora256} from './wild-plant-actual-runtime-256.ts';
import {generateInitialWildPlants256,INITIAL_PLANTS_SEED_PART_256} from './wild-plant-generation-256.ts';
import {localGenerationStepSeed,surfaceTileHash} from './world-site-geography.ts';
import {createWildPlantResource256} from './wild-plant-acquisition-v256.ts';
import {attachInitialPlantAge256} from './initial-plant-age-256.ts';

export function* populateGeographicInitialPlants256(world:World):Generator<{phase:'plants';completed:number;total:number},{count:number;stepState:Readonly<{seed:number;counter:number}>},void>{
 const site=world.site,planet=world.planet;
 if(world.schemaVersion!==256||site?.revision!==3||planet?.revision!==3||world.flora!==undefined)throw Error('Initial plants require an unfinished actual geographic map');
 const step=generateInitialWildPlants256({...actualWildPlantReader256.capture(world),
  stepSeed:localGenerationStepSeed(site.mapSeed,INITIAL_PLANTS_SEED_PART_256,0),worldSeed:planet.generationSeed,tileHash:surfaceTileHash(site.tileId)});
 let next=step.next();while(!next.done){yield {phase:'plants',completed:next.value.visited,total:next.value.total};next=step.next();}
 const result=next.value;
 if(!Number.isSafeInteger(world.nextId+result.plants.length))throw Error('Initial plants exhaust actual identity namespace');
 let nextId=world.nextId;const plants:Resource[]=[];
 for(const row of result.plants){
  const plant=createWildPlantResource256(world,nextId++,row.cell%world.width,Math.floor(row.cell/world.width),row.species,row.growth,false);
  if(!plant)throw Error('An actual initial plant definition is missing');
  attachInitialPlantAge256(plant,world.schemaVersion,row.initialAgeCore,world.tick);plants.push(plant);
 }
 world.resources=[...world.resources,...plants];world.nextId=nextId;
 initializeActualWildFlora256(world);
 return {count:plants.length,stepState:result.stepState};
}
