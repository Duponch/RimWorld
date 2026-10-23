import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {initialWorldRegistry,registeredMapId} from '../src/sim/world-map-context.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {validAnimalThermalRefugeField288,validAnimalThermalRefugeHistoricalTransport288,validAnimalThermalRefugeWorld288} from '../src/sim/animal-thermal-refuge-save-288.ts';
import {deserializeWorld,serializeWorld,validateCampaignSchema287,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import type {AnimalThermalRefuge288} from '../src/sim/animal-thermal-refuge-state-288.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';

// Existing finite32² colony and the same fresh-constructor Labrador original.
// Tasks/positions below are declared guard fixtures, never a played refuge claim.
function camp(){const f=animalHaulingCamp459();initialWorldRegistry(f.world);Object.assign(f.animal,{state:'idle',path:[]});return f;}
// Declared healed dossier: real clock/anatomy, no remaining thermal condition.
function waiting(f:ReturnType<typeof camp>):AnimalThermalRefuge288{f.animal.health??=createAnimalMedicalRecord256(f.world,f.animal);return {mapId:registeredMapId(f.world)!,target:{x:f.animal.x,z:f.animal.z},phase:'wait',startedAtCore:f.world.tick*10};}

test('prospective task shape is current288 local only and keeps literal absence distinct from ownundefined',()=>{
 const task={mapId:0,target:{x:3,z:4},phase:'travel',startedAtCore:20};
 expect(validAnimalThermalRefugeField288({animalThermalRefuge288:task},288,2,32,32,true)).toBe(true);
 expect(validAnimalThermalRefugeField288({animalThermalRefuge288:task},SCHEMA_VERSION,2,32,32,true)).toBe(true);
 for(const version of [1,256,286,287,SCHEMA_VERSION+1])expect(validAnimalThermalRefugeField288({animalThermalRefuge288:task},version,2,32,32,true)).toBe(false);
 expect(validAnimalThermalRefugeField288({},287,2,32,32)).toBe(true);
 expect(validAnimalThermalRefugeField288({},SCHEMA_VERSION,2,32,32)).toBe(true);
 expect(validAnimalThermalRefugeField288({},SCHEMA_VERSION+1,2,32,32)).toBe(false);
 expect(validAnimalThermalRefugeField288({animalThermalRefuge288:undefined},288,2,32,32,true)).toBe(false);
 expect(validAnimalThermalRefugeField288({animalThermalRefuge288:task},288,2,32,32,false)).toBe(false);
});

test('task and cell descriptors reject accessors inherited fields and extras without evaluation',()=>{
 let reads=0;const field={};Object.defineProperty(field,'animalThermalRefuge288',{enumerable:true,get(){reads++;return undefined;}});
 const task={mapId:0,target:{x:1,z:1},phase:'wait',startedAtCore:0};
 const target={z:1};Object.defineProperty(target,'x',{enumerable:true,get(){reads++;return 1;}});
 const phase={...task};Object.defineProperty(phase,'phase',{enumerable:true,get(){reads++;return 'wait';}});
 for(const record of [field,Object.create({animalThermalRefuge288:task}),{animalThermalRefuge288:{...task,target}},{animalThermalRefuge288:phase},{animalThermalRefuge288:{...task,extra:true}},{animalThermalRefuge288:{...task,target:{x:1,z:1,extra:0}}}])expect(validAnimalThermalRefugeField288(record,288,1,32,32,true)).toBe(false);
 expect(reads).toBe(0);
});

test('exact task values reject future clocks noninteger dates unknown phases and outside cells',()=>{
 const task={mapId:0,target:{x:1,z:1},phase:'wait',startedAtCore:10};
 for(const patch of [{mapId:-1},{startedAtCore:11},{startedAtCore:1},{startedAtCore:.5},{startedAtCore:NaN},{phase:'sleep'},{phase:{toString(){throw Error('Do not coerce phase');}}},{target:{x:32,z:1}},{target:{x:1,z:-1}}])expect(validAnimalThermalRefugeField288({animalThermalRefuge288:{...task,...patch}},288,1,32,32,true)).toBe(false);
});

test('historical fences inspect local sparse and every detached custody lane without calling getters',()=>{
 let reads=0;const getter={};Object.defineProperty(getter,'animalThermalRefuge288',{enumerable:true,get(){reads++;return undefined;}});
 for(const animal of [{animalThermalRefuge288:undefined},Object.create({animalThermalRefuge288:undefined}),getter]){
  const envelopes=[{wildlife:{animals:[animal]}},{dynamic:{wildlife:{animals:[animal]}}},{worldMaps:{sites:[{map:{wildlife:{animals:[animal]}}}]}},{worldGroups:{groups:[{state:{animalOwners:{members:[animal]}}}]}},{wildlife:{flyers:[{animal}]}},{piles:[{corpse:animal}]},{startingArrival:{pods:[{animals:[animal]}]}},{worldGroups:{animalLosses:[{animal}],abandonedContents:[{animals:[{animal}]}]}},{worldPawns:{owners:[{actor:animal}]}},{worldPawns:{heldShipCaskets277:[{casket:{shipCryptosleep277:{occupant:{kind:'animal',animal}}}}]}},{structures:[{casket:{animals:[animal]}}]},{worldGroups:{groups:[{pending261:{animals:[animal]}}]}}];
  for(const envelope of envelopes)for(const version of [1,256,286,287])expect(validAnimalThermalRefugeHistoricalTransport288(envelope,version)).toBe(false);
 }
 expect(reads).toBe(0);expect(validAnimalThermalRefugeHistoricalTransport288({events:[{message:'animalThermalRefuge288'}]},287)).toBe(true);
 expect(validAnimalThermalRefugeHistoricalTransport288({},288)).toBe(true);expect(validAnimalThermalRefugeHistoricalTransport288({},SCHEMA_VERSION)).toBe(true);expect(validAnimalThermalRefugeHistoricalTransport288({},SCHEMA_VERSION+1)).toBe(false);
});

test('an awake wait survives a healthy or changed thermal state but never becomes sleep or movement',()=>{
 const f=camp();f.animal.animalThermalRefuge288=waiting(f);
 expect(validAnimalThermalRefugeWorld288(f.world)).toBe(true);expect(validateWorld(f.world)).toEqual([]);
 const healed=f.animal.health;delete f.animal.health;expect(validAnimalThermalRefugeWorld288(f.world)).toBe(false);f.animal.health=healed;
 for(const state of ['sleeping','downed','dead','eating'] as const){const old=f.animal.state;f.animal.state=state;expect(validAnimalThermalRefugeWorld288(f.world)).toBe(false);f.animal.state=old;}
 f.animal.path=[{x:f.animal.x+1,z:f.animal.z}];expect(validAnimalThermalRefugeWorld288(f.world)).toBe(false);f.animal.path=[];
 f.animal.animalThermalRefuge288.target.x++;expect(validAnimalThermalRefugeWorld288(f.world)).toBe(false);
});

test('travel preserves its target without requiring serious current injury or comfortable destination air',()=>{
 const f=camp(),a=f.animal,target={x:a.x+1,z:a.z};a.animalThermalRefuge288={...waiting(f),phase:'travel',target};a.state='moving';a.path=[target];
 expect(a.health).toBeDefined();expect(a.health!.hypothermia).toBeUndefined();expect(a.health!.heatstroke).toBeUndefined();expect(validAnimalThermalRefugeWorld288(f.world)).toBe(true);
 a.path=[{x:target.x+1,z:target.z}];expect(validAnimalThermalRefugeWorld288(f.world)).toBe(false);
});

test('wrong map unauthorized target and concurrent local jobs refuse before acceptance',()=>{
 const f=camp(),a=f.animal;a.animalThermalRefuge288=waiting(f);
 a.animalThermalRefuge288.mapId=999;expect(validAnimalThermalRefugeWorld288(f.world)).toBe(false);a.animalThermalRefuge288=waiting(f);
 const id=f.world.nextId++;f.world.allowedAreas=[{id,label:'Autre cellule',color:0x123456,cells:[(a.z+1)*f.world.width+a.x]}];a.animalMapAreas287={revision:1,assignments:[{mapId:0,choice:{kind:'allowed',areaId:id}}]};expect(validAnimalThermalRefugeWorld288(f.world)).toBe(false);delete a.animalMapAreas287;
 a.animalAreaReturn287={mapId:0,target:{x:a.x,z:a.z}};expect(validAnimalThermalRefugeWorld288(f.world)).toBe(false);delete a.animalAreaReturn287;
 a.animalRest={phase:'travel',spotId:f.spotId};expect(validAnimalThermalRefugeWorld288(f.world)).toBe(false);delete a.animalRest;
 const domestic=a.domestic;delete a.domestic;expect(validAnimalThermalRefugeWorld288(f.world)).toBe(false);a.domestic=domestic;
});

test('a true holding cargo remains compatible while active haul is a competing job',()=>{
 const f=camp(),a=f.animal;a.animalThermalRefuge288=waiting(f);
 const pile=f.world.piles.find(p=>p.id===f.woodId)!;pile.owner={type:'inventory',pawnId:a.id};a.haul={phase:'holding',carryPileId:pile.id,sinceCore:f.world.tick*10};
 expect(validAnimalThermalRefugeWorld288(f.world)).toBe(true);
 // Competing active phase only; this is a guard fixture, not an acquired haul.
 Object.assign(a.haul,{phase:'pickup'});expect(validAnimalThermalRefugeWorld288(f.world)).toBe(false);
});

test('a nonlocal flyer original cannot retain its prior local task',()=>{
 const f=camp(),a=f.animal;a.animalThermalRefuge288=waiting(f);f.world.wildlife!.animals=[];
 // Custody envelope fixture reaches the actual census before flight anatomy.
 Object.assign(f.world.wildlife!,{flyers:[{animal:a}]});expect(validAnimalThermalRefugeWorld288(f.world)).toBe(false);
});

test('strict287 migration changes only the number and rejects a future task before migration',()=>{
 const f=camp(),old=structuredClone(f.world);Object.assign(old,{schemaVersion:287});const raw=JSON.stringify(old);
 expect(validateCampaignSchema287(old)).toEqual([]);expect(deserializeWorld(raw)).toEqual({...old,schemaVersion:SCHEMA_VERSION});expect(JSON.stringify(old)).toBe(raw);
 Object.assign(old.wildlife!.animals[0]!,{animalThermalRefuge288:waiting(f)});expect(validateCampaignSchema287(old).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
});

test('whole RAW Snapshot and resident keep the same awake wait and both refuse an invalid map',()=>{
 const f=camp();f.animal.animalThermalRefuge288=waiting(f);const raw=serializeWorld(f.world);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
 const source=registeredMapPresentation(f.world)!,packet=structuredClone(new SnapshotEncoder().encode(source,0,0)),snapshot=new SnapshotDecoder().adopt(structuredClone(packet)),resident=new ResidentPresentationAssembler().adopt(structuredClone(packet));
 expect(snapshot.status,snapshot.status==='resync'?snapshot.reason:'snapshot').toBe('applied');expect(resident.status,resident.status==='resync'?resident.reason:'resident').toBe('applied');
 if(snapshot.status!=='applied'||resident.status!=='applied')throw Error('Prospective local task refused');expect(snapshot.world).toEqual(resident.world);expect(snapshot.world.wildlife!.animals.find(a=>a.id===f.animal.id)?.animalThermalRefuge288).toEqual(f.animal.animalThermalRefuge288);
 const bad=structuredClone(source);bad.wildlife!.animals.find(a=>a.id===f.animal.id)!.animalThermalRefuge288!.mapId=999;const invalid=new SnapshotEncoder().encode(bad,0,0);
 expect(new SnapshotDecoder().adopt(structuredClone(invalid)).status).toBe('resync');expect(new ResidentPresentationAssembler().adopt(structuredClone(invalid)).status).toBe('resync');
});

test('same-tick task delta refuses atomically and accepts the unchanged valid revision afterward',()=>{
 const f=camp(),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const opening=structuredClone(encoder.encode(f.world,0,0));expect(decoder.adopt(structuredClone(opening)).status).toBe('applied');expect(resident.adopt(structuredClone(opening)).status).toBe('applied');
 f.animal.animalThermalRefuge288=waiting(f);const good=structuredClone(encoder.encode(f.world,0,0));expect(good.kind).toBe('delta');
 const bad=structuredClone(good);bad.world.wildlife!.animals.find(a=>a.id===f.animal.id)!.animalThermalRefuge288!.startedAtCore=f.world.tick*10+1;
 expect(decoder.adopt(structuredClone(bad)).status).toBe('resync');expect(resident.adopt(structuredClone(bad)).status).toBe('resync');
 expect(decoder.adopt(structuredClone(good)).status).toBe('applied');expect(resident.adopt(structuredClone(good)).status).toBe('applied');
});
