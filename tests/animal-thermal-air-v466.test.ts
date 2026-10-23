import {expect,test,vi} from 'vitest';
import {createWorld} from '../src/sim/index.ts';
import {createAnimalThermalPass466} from '../src/sim/animal-thermal-air-v466.ts';
import {applyAnimalThermal466} from '../src/sim/animal-thermal-v466.ts';
import {constructFreshInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {groupPawnInterval256} from '../src/sim/group-core-cadence-256.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {reconcileAnimalHealth} from '../src/sim/wildlife-health.ts';
import {planAnimalDeathExplosion256} from '../src/sim/animal-death-explosion-v256.ts';
import {validAnimalDeathExplosionOwner256} from '../src/sim/animal-death-provenance-v256.ts';
import {syncCarriedAnimals} from '../src/sim/animal-rest-state.ts';
import {HEAT_UNIT} from '../src/sim/heat-severity.ts';
import {outdoorTemperature,temperatureAt} from '../src/sim/temperature.ts';
import type {World} from '../src/sim/types.ts';
import {passiveCoolingFixture} from './scenarios/passive-cooling.ts';

/** Opening preparation only. The tests below read the same real constructor
 * originals; they do not claim a played thermal crisis or natural weather. */
class LowerEndpoints extends WorldGenerationRandom {
  constructor(){super(0);}
  override value(){return .999999;}
  override float(min:number,_max:number){return Math.fround(min);}
  override integer(min:number,_max:number){return min;}
}
function addOriginal(w:World,def:'LabradorRetriever'|'Boomalope'|'Hare'='LabradorRetriever',due=true,cell={x:4,z:7}){
  let id=w.nextId;
  while(groupPawnInterval256(id,w.tick*10,60,10)!==due)id++;
  const made=constructFreshInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256[def],id,cell,tick:w.tick,random:new LowerEndpoints()});
  if(made.status!=='ready')throw Error('Prepared air original refused: '+made.reason);
  w.nextId=id+1;w.wildlife??={profile:'temperate-hares-v1',rng:1,animals:[],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  w.wildlife.animals.push(made.animal);return made.animal;
}

test('a due healthy original reads its current room without creating health, changing RNG or any world byte',()=>{
  const w=createWorld(466,16,16),a=addOriginal(w),cell=a.z*w.width+a.x;
  w.thermal={regions:[{cells:[cell],temperature:71}]};
  expect(a.health).toBeUndefined();const before=JSON.stringify(w),read=createAnimalThermalPass466(w);
  expect(read(a)).toEqual({temperature:71,mapHeld:true});expect(a.health).toBeUndefined();expect(JSON.stringify(w)).toBe(before);
});

test('non-due, dead and unproven historical originals never construct or traverse the air index',()=>{
  const w=createWorld(466,16,16),notDue=addOriginal(w,'LabradorRetriever',false),dead=addOriginal(w),unproven=addOriginal(w,'Hare');
  dead.health=createAnimalMedicalRecord256(w,dead);dead.health.heatstroke=HEAT_UNIT;reconcileMedicalDeath(dead.health);dead.state='dead';
  delete unproven.growthTracker;
  const cells=[notDue.z*w.width+notDue.x],region={cells,temperature:80};w.thermal={regions:[region]};
  const iteration=vi.spyOn(cells,Symbol.iterator),read=createAnimalThermalPass466(w),before=JSON.stringify(w);
  expect(iteration).not.toHaveBeenCalled();expect(read(notDue)).toBeUndefined();expect(read(dead)).toBeUndefined();expect(read(unproven)).toBeUndefined();
  expect(iteration).not.toHaveBeenCalled();expect(JSON.stringify(w)).toBe(before);iteration.mockRestore();
});

test('one pass indexes actual room cells once and keeps temperatures live on repeated O(1) reads',()=>{
  const w=createWorld(466,16,16),a=addOriginal(w),cells=[a.z*w.width+a.x],region={cells,temperature:61};w.thermal={regions:[region]};
  const iteration=vi.spyOn(cells,Symbol.iterator),read=createAnimalThermalPass466(w);
  expect(iteration).not.toHaveBeenCalled();expect(read(a)?.temperature).toBe(61);
  for(let n=0;n<40;n++){region.temperature=61+n;expect(read(a)?.temperature).toBe(61+n);}
  expect(iteration).toHaveBeenCalledTimes(1);iteration.mockRestore();
});

test('replacement, removal and restoration of actual regions refresh a live pass without retaining old room air',()=>{
  const w=createWorld(466,16,16),a=addOriginal(w),cell=a.z*w.width+a.x;w.thermal={regions:[{cells:[cell],temperature:61}]};
  const read=createAnimalThermalPass466(w);expect(read(a)?.temperature).toBe(61);
  w.thermal={regions:[{cells:[cell],temperature:22}]};expect(read(a)?.temperature).toBe(22);
  delete w.thermal;expect(read(a)?.temperature).toBe(outdoorTemperature(w));
  w.thermal={regions:[{cells:[cell],temperature:-12}]};expect(read(a)?.temperature).toBe(-12);
});

test('overlapping regions preserve the point reader last-write priority and the next pass sees moved cell lists',()=>{
  const w=createWorld(466,16,16),a=addOriginal(w),cell=a.z*w.width+a.x,first={cells:[cell],temperature:50},last={cells:[cell],temperature:73};w.thermal={regions:[first,last]};
  const read=createAnimalThermalPass466(w);expect(read(a)?.temperature).toBe(temperatureAt(w,a));expect(read(a)?.temperature).toBe(73);
  // No geometry is edited during a real pass. A later public invocation owns
  // a new index and must not retain the previous cell membership.
  last.cells[0]=cell+1;
  expect(createAnimalThermalPass466(w)(a)?.temperature).toBe(temperatureAt(w,a));expect(createAnimalThermalPass466(w)(a)?.temperature).toBe(50);
});

test('a spawned traveller receives origin air until the physical edge finishes, then destination air',()=>{
  const w=createWorld(466,16,16),a=addOriginal(w),from={x:4,z:7},to={x:5,z:7};a.x=to.x;a.z=to.z;
  a.motion={from,to,start:w.tick-1,end:w.tick+1,speedFactor:1,terrainDelay:0};
  w.thermal={regions:[{cells:[from.z*w.width+from.x],temperature:71},{cells:[to.z*w.width+to.x],temperature:19}]};
  const read=createAnimalThermalPass466(w);expect(read(a)).toEqual({temperature:71,mapHeld:true});
  a.motion.end=w.tick;expect(read(a)).toEqual({temperature:19,mapHeld:true});
});

test.each(['rescue','group','ship'] as const)('a %s carried patient reads its original human carrier air and retains AnyParentSpawned',kind=>{
  const w=createWorld(466,16,16),a=addOriginal(w),carrier=w.pawns[0]!,from={x:8,z:7},to={x:9,z:7};
  const spot={id:w.nextId++,kind:'animal-sleeping-spot' as const,x:to.x,z:to.z,orientation:0 as const,footprint:'standard' as const,medical:true as const};w.structures.push(spot);
  a.domestic={since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+45000};
  a.x=from.x;a.z=from.z;a.health=createAnimalMedicalRecord256(w,a);a.health.hypothermia=HEAT_UNIT*.2;
  w.thermal={regions:[{cells:[from.z*w.width+from.x],temperature:-47},{cells:[to.z*w.width+to.x],temperature:21}]};
  const read=createAnimalThermalPass466(w),ground=read(a)!;
  carrier.x=to.x;carrier.z=to.z;carrier.motion={from,to,start:w.tick-1,end:w.tick+1,speedFactor:1,terrainDelay:0};
  if(kind==='rescue')carrier.animalRescue={animalId:a.id,spotId:spot.id,phase:'carry'};
  else if(kind==='ship'){
    const casketId=w.nextId++;w.structures.push({id:casketId,kind:'ship-cryptosleep-casket',x:10,z:7,orientation:0,footprint:'standard',shipCryptosleep277:{revision:1,heldAt:w.tick,occupant:null,items:[],packed:[]}});
    carrier.shipCasketTask277={casketId,action:'carry',patient:{kind:'animal',id:a.id},phase:'carry',progressCore:0,lastWorkedAt:w.tick};
  }else w.group={id:1,phase:'gathering',startedAt:w.tick,destination:52,memberIds:[carrier.id],rendezvous:to,meeting:[{pawnId:carrier.id,cell:to}],manifest:[],cursor:0,exits:[{pawnId:carrier.id,cell:null}],
    animalPreparation:{revision:1,lines:[{animalId:a.id,handlerId:carrier.id,mode:'carry',gathered:true}]},
    ledger:{foodLoaded:0,foodConsumed:0,medicineUsed:0,silverLoaded:0,silverPaid:0,silverEarned:0,cargoLoaded:{cloth:0,'muffalo-wool':0},sold:{cloth:0,'muffalo-wool':0},bought:{medicine:0,component:0}}};
  syncCarriedAnimals(w,carrier);
  const before=JSON.stringify(w),carried=read(a)!;expect(carried).toEqual({temperature:-47,mapHeld:true});expect(JSON.stringify(w)).toBe(before);
  // These are two independent private outcomes of the same initial record;
  // neither is adopted. Carrying on this map cannot invoke off-map decay.
  const groundRecord=structuredClone(a.health),carriedRecord=structuredClone(a.health);
  applyAnimalThermal466(w,a,groundRecord,ground);applyAnimalThermal466(w,a,carriedRecord,carried);
  expect(carriedRecord.hypothermia).toBe(groundRecord.hypothermia);expect(carriedRecord.hypothermia).toBeGreaterThan(a.health.hypothermia);
  carrier.motion.end=w.tick;expect(read(a)).toEqual({temperature:21,mapHeld:true});
});

test('separate real maps retain their own width and region owners rather than sharing an index',()=>{
  const narrow=createWorld(466,16,16),wide=createWorld(467,32,32),a=addOriginal(narrow),b=addOriginal(wide);
  narrow.thermal={regions:[{cells:[a.z*narrow.width+a.x],temperature:54}]};wide.thermal={regions:[{cells:[b.z*wide.width+b.x],temperature:23}]};
  const readNarrow=createAnimalThermalPass466(narrow),readWide=createAnimalThermalPass466(wide);
  expect(readNarrow(a)?.temperature).toBe(54);expect(readWide(b)?.temperature).toBe(23);expect(readNarrow(a)?.temperature).toBe(54);
});

test('a real reserved animal-death explosion replaces and heats room air before a later animal in the same pass',()=>{
  const w=passiveCoolingFixture(),explosive=addOriginal(w,'Boomalope',true,{x:16,z:16}),later=addOriginal(w,'LabradorRetriever',true,{x:17,z:16});
  const read=createAnimalThermalPass466(w),beforeAir=read(later)!.temperature,originalThermal=w.thermal,originalRng=w.rng;
  expect(beforeAir).toBe(35);
  const record=createAnimalMedicalRecord256(w,explosive);record.heatstroke=HEAT_UNIT;reconcileMedicalDeath(record);
  expect(record.death).toEqual({tick:w.tick,cause:'heatstroke'});expect(explosive.health).toBeUndefined();
  const outcome=planAnimalDeathExplosion256(w,explosive,record);outcome.commit();explosive.health=record;reconcileAnimalHealth(w,explosive);
  expect(w.thermal).not.toBe(originalThermal);expect(w.bombWaves).toHaveLength(1);expect(validAnimalDeathExplosionOwner256(w,w.bombWaves![0]!)).toBe(true);
  const afterAir=read(later)!.temperature;expect(afterAir).toBeGreaterThan(beforeAir);expect(afterAir).toBe(temperatureAt(w,later));expect(w.rng).toBe(originalRng);
});
