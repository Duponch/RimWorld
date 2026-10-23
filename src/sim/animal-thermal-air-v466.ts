import {animalThermalProfile466,type AnimalThermalOpportunity466} from './animal-thermal-v466.ts';
import {animalCarrier} from './animal-rest-state.ts';
import {groupPawnInterval256} from './group-core-cadence-256.ts';
import {outdoorTemperature,type ThermalRegion} from './temperature.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {World} from './types.ts';

/** One real wildlife phase, not a persistent/public temperature cache.
 * Index room references only on the first due proven actor. Temperatures stay
 * live; an explosion's replacement of the actual regions rebuilds the index.
 * This phase's geometry mutations replace regions through reconciliation. */
export function createAnimalThermalPass466(world:World):(animal:WildAnimal)=>AnimalThermalOpportunity466|undefined {
  let regions:ThermalRegion[]|undefined,index:Map<number,ThermalRegion>|undefined,outside:number|undefined;
  return animal=>{
    if(world.schemaVersion!==287||animal.state==='dead'||animal.health?.death||
      !groupPawnInterval256(animal.id,world.tick*10,60,10)||!animalThermalProfile466(animal))return;
    const current=world.thermal?.regions;
    if(!index||current!==regions){
      regions=current;index=new Map();
      // Preserve the public point reader's last-region priority on overlaps.
      for(const region of current??[])for(const cell of region.cells)index.set(cell,region);
    }
    const carrier=animalCarrier(world,animal.id),owner=carrier??animal;
    // Logical destinations are anticipated for travel. Actual room exposure
    // changes only when the captured physical edge is complete.
    const cell=owner.motion&&owner.motion.end>world.tick?owner.motion.from:owner;
    // The patient itself is despawned while carried, but AnyParentSpawned is
    // still true: on-map carrying never grants off-map cold recovery.
    return {temperature:index.get(cell.z*world.width+cell.x)?.temperature??(outside??=outdoorTemperature(world)),mapHeld:true};
  };
}
