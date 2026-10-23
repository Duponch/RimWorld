import {animalCarrier} from './animal-rest-state.ts';
import {animalLifeStage} from './animal-life.ts';
import {captureBombCells} from './bomb-cells.ts';
import {reconcileTemperature} from './temperature.ts';
import type {MiniTurretBombWave} from './bomb-state.ts';
import type {MedicalRecord} from './injury-types.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {World} from './types.ts';
export {isExplosiveAnimal256,animalDeathExplosionRadius256} from './animal-death-provenance-v256.ts';
import {isExplosiveAnimal256,animalDeathExplosionRadius256,type AnimalDeathExplosion256} from './animal-death-provenance-v256.ts';
const none=Object.freeze({commit:()=>{}});
/** Actual living-to-dead transition only. The retained local dead actor is the
 * same corpse owner that corpses.ts later materializes with this same ID.
 * A carried death never becomes a delayed explosion when deposited. */
export function planAnimalDeathExplosion256(world:World,animal:WildAnimal,record:MedicalRecord,core=world.tick*10,atPhysicalCell=false):{commit:()=>void} {
 if(world.schemaVersion<256||!isExplosiveAnimal256(animal.species)||animal.state==='dead'||animal.health?.death||!record.death||animalCarrier(world,animal.id))return none;
 if(!world.wildlife?.animals.includes(animal)||record.body!==animal.species||!Number.isSafeInteger(record.animalBirthTick)||record.death.tick!==world.tick
  ||!Number.isSafeInteger(core)||core<Math.max(0,(world.tick-1)*10)||core>world.tick*10||!Number.isSafeInteger(world.nextId+1)||(world.bombWaves?.length??0)>=world.width*world.height
  ||world.bombWaves?.some(w=>w.animalDeath&&w.sourceId===animal.id))throw RangeError('Cannot reserve animal death explosion.');
 const proof:AnimalDeathExplosion256={species:animal.species,lifeStage:animalLifeStage({...animal,ageTicks:record.tick-record.animalBirthTick!}),deathTick:record.death.tick};
 // New local thermal exposure belongs to the occupied cell until its edge
 // completes. Historical impact producers keep their existing anchor.
 const cell=atPhysicalCell&&animal.motion&&animal.motion.end>world.tick?animal.motion.from:animal;
 const center={x:cell.x,z:cell.z},radius=animalDeathExplosionRadius256(proof),nextId=world.nextId,waves=world.bombWaves;
 const wave:MiniTurretBombWave={id:nextId,sourceId:animal.id,center,startedAtCore:core,advancedAtCore:core,cells:captureBombCells(world,center,radius,true),nextCell:0,damagedThingKeys:[],animalDeath:proof};
 const draft={...world,...world.thermal?{thermal:structuredClone(world.thermal)}:{}},layout=reconcileTemperature(draft);
 const region=draft.thermal?.regions[layout.indices[center.z*world.width+center.x]!];
 if(region){region.temperature=Math.min(1000,region.temperature+15*wave.cells.length/region.cells.length);if(!Number.isFinite(region.temperature))throw RangeError('Invalid animal explosion heat.');}
 let used=false;
 return {commit:()=>{
  if(used||world.nextId!==nextId||world.bombWaves!==waves)throw RangeError('Stale animal death explosion plan.');used=true;
  world.nextId++;world.bombWaves=[...(waves??[]),wave];if(draft.thermal)world.thermal=draft.thermal;else delete world.thermal;
 }};
}

/** Combat may flush an older clinical interval before resolving a hit. Reserve
 * feasibility before that flush/attacker draws at the exhausted-ID frontier. */
export function requireAnimalDeathCapacity256(world:World,animal:WildAnimal):void {
 if(world.schemaVersion>=256&&isExplosiveAnimal256(animal.species)&&animal.state!=='dead'&&!animal.health?.death&&!animalCarrier(world,animal.id)
  &&(!Number.isSafeInteger(world.nextId+1)||(world.bombWaves?.length??0)>=world.width*world.height))throw RangeError('Cannot reserve animal death explosion.');
}
