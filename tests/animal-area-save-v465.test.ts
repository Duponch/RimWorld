import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {initialWorldRegistry,registeredMapId} from '../src/sim/world-map-context.ts';
import {validAnimalAreaChoice287,validAnimalAreaField287,validAnimalAreaHistoricalTransport287,validAnimalAreaWorld287} from '../src/sim/animal-area-save-287.ts';
import {captureAnimalAreaOwners287,prepareAnimalAreaAssignment287,prepareAnimalAreaRemoval287,type AnimalAreaOwnerResult287} from '../src/sim/animal-area-owners-287.ts';
import {advanceCorpses} from '../src/sim/corpses.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {reconcileAnimalHealth} from '../src/sim/wildlife-health.ts';
import {serializeWorld,deserializeWorld,validateWorld,validateCampaignSchema286} from '../src/sim/serialization.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import type {AnimalMapAreas287} from '../src/sim/animal-area-state-287.ts';
import type {World} from '../src/sim/types.ts';

// The existing finite32² colony and its one fresh-constructor Labrador are
// authored initial conditions. No played taming, trip or area command is claimed.
function camp(){const f=animalHaulingCamp459();initialWorldRegistry(f.world);const id=f.world.nextId++;
 f.world.allowedAreas=[{id,label:'Cour réelle',color:0x123456,cells:[12*f.world.width+12,12*f.world.width+13]}];return {...f,areaId:id};}
function ready(r:AnimalAreaOwnerResult287){if(!r.ok)throw Error(r.reason);return r;}
const dictionary=(mapId=0):AnimalMapAreas287=>({revision:1,assignments:[{mapId,choice:{kind:'home'}}]});
function readers(w:World){const packet=structuredClone(new SnapshotEncoder().encode(w,0,0)),a=new SnapshotDecoder().adopt(structuredClone(packet)),b=new ResidentPresentationAssembler().adopt(structuredClone(packet));
 expect(a.status,a.status==='resync'?a.reason:'snapshot').toBe('applied');expect(b.status,b.status==='resync'?b.reason:'resident').toBe('applied');if(a.status!=='applied'||b.status!=='applied')throw Error('Actual area projection refused');expect(a.world).toEqual(b.world);return a.world;}

test('tagged choices reject unevaluated kind/area getters and extra or inherited keys',()=>{
 let reads=0;const a={};Object.defineProperty(a,'kind',{enumerable:true,get(){reads++;return 'home';}});
 const b={kind:'allowed'};Object.defineProperty(b,'areaId',{enumerable:true,get(){reads++;return 3;}});
 for(const v of [a,b,{kind:'home',areaId:0},Object.create({kind:'home'}),{kind:'allowed',areaId:0}])expect(validAnimalAreaChoice287(v,20)).toBe(false);
 const f=camp();f.animal.animalMapAreas287=dictionary();Object.defineProperty(f.animal.animalMapAreas287.assignments[0]!.choice,'kind',{enumerable:true,get(){reads++;return 'home';}});expect(captureAnimalAreaOwners287(f.world).valid).toBe(false);
 expect(reads).toBe(0);expect(validAnimalAreaChoice287({kind:'home'},20)).toBe(true);expect(validAnimalAreaChoice287({kind:'allowed',areaId:3},20)).toBe(true);
});

test('prospective fields distinguish literal absence, empty acquired dictionary, sparse rows and detached Goto',()=>{
 expect(validAnimalAreaField287({},286,100)).toBe(true);expect(validAnimalAreaField287({animalMapAreas287:{revision:1,assignments:[]}},287,100)).toBe(true);
 for(const v of [{animalMapAreas287:undefined},{animalMapAreas287:dictionary()},{animalAreaReturn287:undefined}])expect(validAnimalAreaField287(v,286,100,true)).toBe(false);
 const state={animalMapAreas287:dictionary(),animalAreaReturn287:{mapId:0,target:{x:1,z:2}}};expect(validAnimalAreaField287(state,287,100,true)).toBe(true);expect(validAnimalAreaField287(state,287,100,false)).toBe(false);
 const sparse:unknown[]=[];sparse.length=1;expect(validAnimalAreaField287({animalMapAreas287:{revision:1,assignments:sparse}},287,100)).toBe(false);
 expect(validAnimalAreaField287({animalMapAreas287:{revision:1,assignments:[...dictionary().assignments,...dictionary().assignments]}},287,100)).toBe(false);
 expect(validAnimalAreaField287({},288,100)).toBe(false);
});

test('historical custody fences refuse future ownundefined, inherited fields and accessors without reading them',()=>{
 let reads=0;const accessor={};Object.defineProperty(accessor,'animalMapAreas287',{enumerable:true,get(){reads++;return dictionary();}});
 for(const record of [{animalMapAreas287:undefined},Object.create({animalAreaReturn287:undefined}),accessor]){
  for(const envelope of [{wildlife:{animals:[record]}},{worldGroups:{abandonedContents:[{animals:[{animal:record}]}]}},{worldPawns:{heldShipCaskets277:[{casket:{shipCryptosleep277:{occupant:{kind:'animal',animal:record}}}}]}}])expect(validAnimalAreaHistoricalTransport287(envelope,286)).toBe(false);
 }
 expect(reads).toBe(0);expect(validAnimalAreaHistoricalTransport287({events:[{message:'animalMapAreas287'}]},286)).toBe(true);expect(validAnimalAreaHistoricalTransport287({},288)).toBe(false);
});

test('actual assignment is pure until admission and retains its empty acquired dictionary after unrestricted',()=>{
 const f=camp(),before=JSON.stringify(f.world),rng=f.world.rng,nextId=f.world.nextId;
 const plan=ready(prepareAnimalAreaAssignment287(f.world,f.animal,{kind:'allowed',areaId:f.areaId}));expect(plan.noop).toBe(false);expect(plan.current()).toBe(true);expect(JSON.stringify(f.world)).toBe(before);
 plan.begin();expect(plan.current()).toBe(false);expect(plan.admittedCurrent()).toBe(true);expect(plan.adoptAdmitted()).toBe(true);expect(plan.adoptAdmitted()).toBe(false);
 expect(f.animal.animalMapAreas287).toEqual({revision:1,assignments:[{mapId:0,choice:{kind:'allowed',areaId:f.areaId}}]});
 expect(ready(prepareAnimalAreaAssignment287(f.world,f.animal,null)).commit()).toBe(true);expect(f.animal.animalMapAreas287).toEqual({revision:1,assignments:[]});expect(f.world.rng).toBe(rng);expect(f.world.nextId).toBe(nextId);
});

test('same preference is a literal noop before a distant custody census',()=>{
 const f=camp();f.animal.animalMapAreas287=dictionary();let reads=0;
 Object.defineProperty(f.world,'tradeRequests284',{enumerable:true,configurable:true,get(){reads++;throw Error('No census for a noop');}});
 const plan=ready(prepareAnimalAreaAssignment287(f.world,f.animal,{kind:'home'}));expect(plan.noop).toBe(true);expect(plan.commit()).toBe(true);expect(reads).toBe(0);delete f.world.tradeRequests284;
});

test('same-value original replacement and nested preference edits invalidate preparation before any write',()=>{
 const f=camp();f.animal.animalMapAreas287=dictionary();const first=ready(prepareAnimalAreaAssignment287(f.world,f.animal,{kind:'allowed',areaId:f.areaId}));
 f.world.wildlife!.animals[0]=structuredClone(f.animal);const replaced=JSON.stringify(f.world);expect(first.current()).toBe(false);expect(first.commit()).toBe(false);expect(JSON.stringify(f.world)).toBe(replaced);
 const animal=f.world.wildlife!.animals[0]!,second=ready(prepareAnimalAreaAssignment287(f.world,animal,null));animal.animalMapAreas287!.assignments[0]!.mapId=99;
 const changed=JSON.stringify(f.world);expect(second.current()).toBe(false);expect(second.commit()).toBe(false);expect(JSON.stringify(f.world)).toBe(changed);
});

test('admitted writes tolerate legitimate unrelated state changes but reject changed target dictionaries and immutable recipients',()=>{
 const f=camp();f.animal.animalMapAreas287=dictionary();const plan=ready(prepareAnimalAreaAssignment287(f.world,f.animal,null));plan.begin();f.animal.food-=.01;
 expect(plan.admittedCurrent()).toBe(true);expect(plan.adoptAdmitted()).toBe(true);
 f.animal.animalMapAreas287=dictionary();const stale=ready(prepareAnimalAreaAssignment287(f.world,f.animal,null));stale.begin();f.animal.animalMapAreas287.assignments[0]!.mapId=9;expect(stale.adoptAdmitted()).toBe(false);
 f.animal.animalMapAreas287=dictionary();Object.defineProperty(f.animal,'animalMapAreas287',{...Object.getOwnPropertyDescriptor(f.animal,'animalMapAreas287')!,writable:false});
 const before=JSON.stringify(f.world);expect(prepareAnimalAreaAssignment287(f.world,f.animal,null).ok).toBe(false);expect(JSON.stringify(f.world)).toBe(before);
});

test('Home needs its actual live Map but no cells, while unknown named or retired map references fail',()=>{
 const f=camp();f.animal.animalMapAreas287=dictionary();delete f.world.home;expect(validAnimalAreaWorld287(f.world)).toBe(true);expect(validateWorld(f.world)).toEqual([]);
 f.animal.animalMapAreas287={revision:1,assignments:[{mapId:0,choice:{kind:'allowed',areaId:f.areaId+1}}]};expect(validAnimalAreaWorld287(f.world)).toBe(false);
 f.animal.animalMapAreas287=dictionary(99);expect(validAnimalAreaWorld287(f.world)).toBe(false);
});

test('named removal preserves Home and other named references; map removal leaves an acquired empty dictionary',()=>{
 const f=camp();f.animal.animalMapAreas287=dictionary();expect(ready(prepareAnimalAreaRemoval287(f.world,{mapId:0,areaId:f.areaId})).noop).toBe(true);
 expect(ready(prepareAnimalAreaAssignment287(f.world,f.animal,{kind:'allowed',areaId:f.areaId})).commit()).toBe(true);
 const plan=ready(prepareAnimalAreaRemoval287(f.world,{mapId:0,areaId:f.areaId})),draft=structuredClone(f.animal);plan.projectInto(f.animal,draft);expect(draft.animalMapAreas287!.assignments).toEqual([]);expect(f.animal.animalMapAreas287!.assignments).toHaveLength(1);
 expect(plan.commit()).toBe(true);expect(f.animal.animalMapAreas287).toEqual({revision:1,assignments:[]});
 f.animal.animalMapAreas287=dictionary();expect(ready(prepareAnimalAreaRemoval287(f.world,{mapId:0})).commit()).toBe(true);expect(f.animal.animalMapAreas287!.assignments).toEqual([]);
});

test('the real animal body producer preserves only a copied dictionary on the same stable ID',()=>{
 const f=camp();f.animal.animalMapAreas287=dictionary();const old=f.animal.animalMapAreas287;
 // Declared terminal blood loss; the real medical resolver creates death,
 // then the existing body producer converts that same clinical original.
 f.animal.health=createAnimalMedicalRecord256(f.world,f.animal);f.animal.health.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(f.animal.health);expect(f.animal.health.death).toMatchObject({tick:f.world.tick,cause:'blood-loss'});reconcileAnimalHealth(f.world,f.animal);advanceCorpses(f.world);
 expect(validateWorld(f.world)).toEqual([]);
 const pile=f.world.piles.find(p=>p.id===f.animalId)!;expect(pile.corpse?.animalMapAreas287).toEqual(old);expect(pile.corpse?.animalMapAreas287).not.toBe(old);expect(f.world.wildlife!.animals).not.toContain(f.animal);expect(pile.corpse).not.toHaveProperty('animalAreaReturn287');
 const capture=captureAnimalAreaOwners287(f.world);expect(capture.valid).toBe(true);expect(capture.owners.find(o=>o.id===f.animalId)?.record).toBe(pile.corpse);
 expect(ready(prepareAnimalAreaRemoval287(f.world,{mapId:0})).commit()).toBe(true);expect(pile.corpse!.animalMapAreas287!.assignments).toEqual([]);
});

test('strict286 migration changes the number only; a new field under286 refuses before migration',()=>{
 const f=camp(),old=structuredClone(f.world);Object.assign(old,{schemaVersion:286});const raw=JSON.stringify(old);
 expect(validateCampaignSchema286(old)).toEqual([]);const loaded=deserializeWorld(raw);expect(loaded).toEqual({...old,schemaVersion:287});expect(loaded.wildlife!.animals[0]).not.toHaveProperty('animalMapAreas287');expect(JSON.stringify(old)).toBe(raw);
 Object.assign(old.wildlife!.animals[0]!,{animalMapAreas287:dictionary()});expect(validateCampaignSchema286(old).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
});

test('whole RAW reload, public Snapshot and resident candidates retain the same actual choices',()=>{
 const f=camp();expect(ready(prepareAnimalAreaAssignment287(f.world,f.animal,{kind:'allowed',areaId:f.areaId})).commit()).toBe(true);expect(validateWorld(f.world)).toEqual([]);
 const raw=serializeWorld(f.world);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);const source=registeredMapPresentation(f.world)!;
 const projection=readers(source);expect(projection.wildlife!.animals.find(a=>a.id===f.animalId)?.animalMapAreas287).toEqual(f.animal.animalMapAreas287);expect(registeredMapId(f.world)).toBe(0);
 const bad=structuredClone(source);bad.wildlife!.animals.find(a=>a.id===f.animalId)!.animalMapAreas287!.assignments[0]!.mapId=99;
 const packet=structuredClone(new SnapshotEncoder().encode(bad,0,0));expect(new SnapshotDecoder().adopt(structuredClone(packet)).status).toBe('resync');expect(new ResidentPresentationAssembler().adopt(packet).status).toBe('resync');
});

test('read custody mode keeps identical actual owners and refusals without offering a transaction admission',()=>{
 const f=camp(),w=f.world,a=f.animal;a.animalMapAreas287=dictionary();
 const compare=(valid:boolean)=>{
  const full=captureAnimalAreaOwners287(w),read=captureAnimalAreaOwners287(w,{seal:false});
  expect(full.valid).toBe(valid);expect(read.valid).toBe(full.valid);expect(read.owners).toEqual(full.owners);expect(read.current()).toBe(false);
  for(let i=0;i<full.owners.length;i++){expect(read.owners[i]!.record).toBe(full.owners[i]!.record);expect(read.owners[i]!.animal).toBe(full.owners[i]!.animal);}
  return full;
 };
 const first=compare(true);expect(first.current()).toBe(true);expect(validAnimalAreaWorld287(w)).toBe(true);
 // Default admission still notices in-place preference edits and same-value
 // replacement of the actual local original, independently of read mode.
 a.animalMapAreas287!.assignments[0]!.choice={kind:'allowed',areaId:f.areaId};expect(first.current()).toBe(false);
 const second=compare(true),replacement=structuredClone(a);w.wildlife!.animals[0]=replacement;expect(second.current()).toBe(false);w.wildlife!.animals[0]=a;
 // A duplicate original ID is invalid even when no filtering or census seal
 // is requested. No unassigned/ghost record is skipped by the read path.
 w.wildlife!.animals.push(structuredClone(a));compare(false);w.wildlife!.animals.pop();
 let reads=0;const choice=a.animalMapAreas287!.assignments[0]!.choice;
 Object.defineProperty(choice,'kind',{enumerable:true,configurable:true,get(){reads++;return 'allowed';}});compare(false);expect(reads).toBe(0);
 Object.defineProperty(choice,'kind',{enumerable:true,configurable:true,writable:true,value:'allowed'});
 // A second real holder form is reached through the existing clinical/body
 // producers, rather than by manufacturing a new animal or a fake WorldPawn.
 a.health=createAnimalMedicalRecord256(w,a);a.health.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(a.health);reconcileAnimalHealth(w,a);advanceCorpses(w);
 const body=w.piles.find(p=>p.id===a.id)!;expect(body.corpse).toBeDefined();const terminal=compare(true);expect(terminal.current()).toBe(true);
 expect(terminal.owners.find(o=>o.id===a.id)?.record).toBe(body.corpse);expect(terminal.owners.find(o=>o.id===a.id)?.kind).toBe('corpse');expect(validAnimalAreaWorld287(w)).toBe(true);
 w.piles.push(structuredClone(body));compare(false);w.piles.pop();
});
