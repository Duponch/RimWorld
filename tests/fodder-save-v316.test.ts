import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/engine.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {captureHumanOwners} from '../src/sim/human-owners.ts';
import {validFodderTransport} from '../src/sim/fodder-save.ts';
import type {MaterialPile,Pawn,World} from '../src/sim/types.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import {animalSpecies} from '../src/sim/animal-species.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {freshRot} from '../src/sim/food-preservation.ts';
import {serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotValidationContext} from '../src/bridge/snapshots.ts';
import {createOwnedValidationGeometry} from '../src/sim/owned-validation-geometry.ts';
import {PowerParentValidationCache} from '../src/sim/power-parent-validation.ts';
import {foodWorkstationCamp} from './scenarios/food-workstations.ts';

type Raw=Record<string,any>;
const raw=(value:unknown)=>value as Raw;
/** Sparse pre-migration transport, deliberately without any modern owner clock
 * or field. Full historical formats remain qualified by the public corpus. */
const historical=(version=226)=>({schemaVersion:version,pawns:[],piles:[],resources:[],jobs:[],structures:[],stockpiles:[],growingZones:[]} as unknown as World);
const food=(item:'hay'|'kibble',id=10)=>({id,item,kind:'food' as const,quantity:1,owner:{type:'ground' as const,x:1,z:1}});

test('all historical versions accept a clean sparse transport without requiring modern owner fields',()=>{
  for(let version=1;version<227;version++){
    const w=historical(version),before=JSON.stringify(w);
    expect(validFodderTransport(w),String(version)).toBe(true);expect(JSON.stringify(w)).toBe(before);
  }
});

test('narrative names and references are not recursively treated as future transport discriminants',()=>{
  const w=historical(1),value=raw(w);
  value.name='hay';value.events=[{kind:'ate-kibble',text:'make-kibble haygrass hay kibble'}];
  value.pawns=[{name:'kibble',biography:'haygrass',need:null}];
  value.foodPolicies=[{name:'hay',allowed:['rice']}];
  value.visitors={groups:[{name:'haygrass',members:[{name:'hay',item:'kibble'}]}]};
  value.group={memberIds:[10],label:'make-kibble'};
  expect(validFodderTransport(w)).toBe(true);
});

const futureCases:[string,(w:Raw)=>void][]=[
  ['map hay pile',w=>{w.piles=[food('hay')];}],
  ['map orbital-owned kibble',w=>{w.piles=[{...food('kibble'),owner:{type:'orbital-cargo',deliveryId:20}}];}],
  ['scout original possessions',w=>{w.scout={pawn:{name:'Scout'},items:[food('hay')]};}],
  ['commercial original possessions',w=>{w.commercialTrip={pawn:{name:'Trader'},items:[food('kibble')]};}],
  ['group original possessions',w=>{w.group={members:[],items:[food('hay')]};}],
  ['terminal original possessions',w=>{w.groupLosses=[{pawn:{name:'Loss'},items:[food('hay')]}];}],
  ['visitor original possessions',w=>{w.visitors={departed:[{pawn:{name:'Visitor'},items:[food('kibble')]}]};}],
  ['pod original possessions',w=>{w.podRescues={departed:[{pawn:{name:'Civilian'},items:[food('hay')]}]};}],
  ['raid identity archive possessions',w=>{w.raids={departed:[{pawnId:7,name:'Raider',items:[food('kibble')]}]};}],
  ['prison identity archive possessions',w=>{w.prisonDepartures=[{pawnId:7,name:'Prisoner',items:[food('hay')]}];}],
  ['post stock has no artificial owner requirement',w=>{const {owner,...pile}=food('kibble');void owner;w.civilianPost={stock:[pile]};}],
  ['haygrass resource',w=>{w.resources=[{id:9,kind:'haygrass'}];}],
  ['haygrass growing zone and its sow job',w=>{w.growingZones=[{id:9,plant:'haygrass'}];w.jobs=[{id:10,kind:'sow',growingZoneId:9}];}],
  ['food policy allowed kibble',w=>{w.foodPolicies=[{allowed:['kibble']}];}],
  ['food policy allowed hay',w=>{w.foodPolicies=[{allowed:['hay']}];}],
  ['false stockpile whitelist key',w=>{w.stockpiles=[{items:{hay:false}}];}],
  ['false storage filter key',w=>{w.stockpiles=[{filters:{kibble:false}}];}],
  ['station bill recipe',w=>{w.structures=[{bills:[{recipe:'make-kibble'}]}];}],
  ['false bill ingredient key',w=>{w.structures=[{bills:[{recipe:'simple-meal',filters:{hay:false}}]}];}],
  ['packed station recipe',w=>{w.packed=[{building:{bills:[{recipe:'make-kibble'}]}}];}],
  ['archived packed station recipe',w=>{w.visitors={departed:[{items:[],packed:[{building:{bills:[{recipe:'make-kibble'}]}}]}]};}],
  ['job retained furniture bill',w=>{w.jobs=[{kind:'install',furniture:{bills:[{recipe:'make-kibble'}]}}];}],
  ['local production task recipe',w=>{w.pawns=[{cooking:{recipe:'make-kibble'}}];}],
  ['task ingredient hay with a historical recipe',w=>{w.pawns=[{cooking:{recipe:'simple-meal',ingredients:[{item:'hay'}]}}];}],
  ['queued production recipe',w=>{w.pawns=[{orders:{queue:[{cooking:{recipe:'make-kibble'}}]}}];}],
  ['queued ingredient hay',w=>{w.pawns=[{orders:{queue:[{cooking:{ingredients:[{item:'hay'}]}}]}}];}],
  ['held physical output',w=>{w.piles=[{...food('kibble'),owner:{type:'pawn',pawnId:7}}];w.pawns=[{cooking:{phase:'output',productId:10}}];}],
  ['archived cooking task',w=>{w.podRescues={departed:[{pawn:{cooking:{recipe:'make-kibble'}},items:[]}]};}],
  ['local meal memory',w=>{w.pawns=[{memories:[{kind:'ate-kibble',expiresAt:100}]}];}],
  ['archived meal memory',w=>{w.groupLosses=[{pawn:{memories:[{kind:'ate-kibble',expiresAt:100}]},items:[]}];}],
  ['local poisoning source',w=>{w.pawns=[{health:{foodPoisoning:{item:'kibble'}}}];}],
  ['archived poisoning source',w=>{w.visitors={departed:[{pawn:{health:{foodPoisoning:{item:'kibble'}}},items:[]}]};}],
  ['animal poisoning source',w=>{w.wildlife={animals:[{health:{foodPoisoning:{item:'kibble'}}}]};}],
  ['retained animal corpse poisoning source',w=>{w.piles=[{item:'hare-corpse',corpse:{health:{foodPoisoning:{item:'kibble'}}}}];}],
  ['zero preservation ledger key',w=>{w.spoiled={hay:0};}],
  ['zero destroyed item key',w=>{w.destroyed={items:{kibble:0}};}],
  ['zero destroyed crop key',w=>{w.destroyed={resources:{haygrass:0}};}],
  ['zero fire item key',w=>{w.fires={ledger:{items:{hay:0}}};}],
  ['zero fire crop key',w=>{w.fires={ledger:{resources:{haygrass:0}}};}],
  ['zero bought item key',w=>{w.trade={bought:{kibble:0}};}],
  ['zero sold item key',w=>{w.trade={sold:{hay:0}};}],
  ['trade receipt item',w=>{w.trade={recent:[{lines:[{item:'kibble'}]}]};}],
];
test.each(futureCases)('future transport is refused before migration: %s',(label,mutate)=>{
  void label;
  const w=historical();mutate(raw(w));const before=JSON.stringify(w);
  expect(validFodderTransport(w,226)).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

function current(){
  const w=createWorld(316,16,16);w.tick=10000;w.piles=[];w.resources=[];
  for(const pawn of w.pawns){pawn.need=null;pawn.feed=undefined;pawn.cooking=null;delete pawn.health;pawn.memories=[];}
  return w;
}
function hayPile(w:World,pawn?:Pawn):MaterialPile {
  const pile:MaterialPile={...food('hay',w.nextId++),owner:pawn?{type:'pawn',pawnId:pawn.id}:{type:'ground',x:3,z:3}};
  w.piles.push(pile);return pile;
}
const eating=(id:number,carried=false)=>({kind:'eat',phase:carried?'ingest':'pickup',sourcePileId:carried?null:id,carryPileId:carried?id:null,quantity:1,progress:0,dining:null} as Extract<NonNullable<Pawn['need']>,{kind:'eat'}>);

test('schema227 accepts real human transport of hay while refusing its targeted human ingestion',()=>{
  const w=current(),pawn=w.pawns[0]!,pile=hayPile(w,pawn),before=JSON.stringify(w);
  expect(validFodderTransport(w,227)).toBe(true);expect(JSON.stringify(w)).toBe(before);
  pawn.need=eating(pile.id,true);expect(validFodderTransport(w,227)).toBe(false);
  pawn.need=null;pile.owner={type:'ground',x:3,z:3};pawn.need=eating(pile.id);expect(validFodderTransport(w,227)).toBe(false);
  pawn.need=null;pile.item='kibble';expect(validFodderTransport(w,227)).toBe(true);
  pawn.need=eating(pile.id);expect(validFodderTransport(w,227)).toBe(true);
});

test('human feeding rejects hay source and cargo independently but veterinary delivery remains separate',()=>{
  const w=current(),doctor=w.pawns[0]!,pile=hayPile(w),task={patientId:w.pawns[1]!.id,spot:{x:2,z:2},quantity:1,phase:'pickup',progress:0,sourcePileId:pile.id,carryPileId:null};
  doctor.feed=task as Pawn['feed'];expect(validFodderTransport(w)).toBe(false);
  task.phase='feed';task.sourcePileId=0;raw(task).carryPileId=pile.id;expect(validFodderTransport(w)).toBe(false);
  delete doctor.feed;raw(doctor).animalFeed={...task,animalId:7};expect(validFodderTransport(w)).toBe(true);
});

test('a human paste request cannot disguise hay behind source identities',()=>{
  const w=current(),pawn=w.pawns[0]!,pile=hayPile(w);
  pawn.need={...eating(0),paste:{dispenserId:w.nextId++,spot:{x:2,z:2},ingredients:[{pileId:pile.id,quantity:1}]}} as Pawn['need'];
  expect(validFodderTransport(w)).toBe(false);
});

test('human prison food delivery rejects both hay source and held identity',()=>{
  const w=current(),warden=w.pawns[0]!,pile=hayPile(w);
  raw(warden).ward={kind:'food',sourcePileId:pile.id,carryPileId:null};expect(validFodderTransport(w)).toBe(false);
  raw(warden).ward={kind:'food',sourcePileId:null,carryPileId:pile.id};expect(validFodderTransport(w)).toBe(false);
  delete warden.ward;expect(validFodderTransport(w)).toBe(true);
});

test('a haygrass-only snapshot needs no complete human ownership census',()=>{
  const w=current();w.resources=[{id:w.nextId++,kind:'haygrass',x:4,z:4,amount:18,growth:.2,growthTick:w.tick}];
  raw(w.pawns[1]).id=w.pawns[0]!.id;
  // The surrounding owner/identity guard still rejects this corrupt duplicate.
  // This domain has no hay pile or personal record requiring owner clock capture.
  expect(validFodderTransport(w)).toBe(true);
});

test('personal kibble records require owner clocks even without a hay pile',()=>{
  const w=current(),pawn=w.pawns[0]!;
  pawn.memories=[{kind:'ate-kibble',expiresAt:w.tick+1}];expect(validFodderTransport(w)).toBe(true);
  pawn.memories[0]!.expiresAt=w.tick;expect(validFodderTransport(w)).toBe(false);
  pawn.memories=[];pawn.health=createMedicalRecord(w.tick);
  pawn.health.foodPoisoning={item:'kibble',cause:'dangerous-food',severity:100,bornAt:w.tick};
  expect(validFodderTransport(w)).toBe(true);
  pawn.health.foodPoisoning.bornAt=w.tick+1;expect(validFodderTransport(w)).toBe(false);
});

type Owner='scout'|'commercial'|'group'|'visitor'|'pod'|'terminal';
/** Owner capture fixture, not a full valid traveller/archive claim: the original
 * Pawn moves between real containers and its explicit validation clock is kept. */
function moved(kind:Owner){
  const w=current(),pawn=w.pawns.shift()!,pile=hayPile(w,pawn);w.piles=[];
  if(kind==='scout'||kind==='commercial')raw(w)[kind==='scout'?'scout':'commercialTrip']={pawn,items:[pile],phase:'outbound'};
  else if(kind==='group')raw(w).group={id:w.nextId++,phase:'travelling',members:[pawn],items:[pile],departedAt:100,lastPersonalTick:100,tile:1,
    baseline:{food:0,silver:0,medicine:0,component:0,cargo:{cloth:0,'muffalo-wool':0}}};
  else if(kind==='terminal'){
    pawn.health=createMedicalRecord(100);pawn.health.death={tick:100,cause:'trauma'};pawn.state='dead';
    raw(w).groupLosses=[{groupId:w.nextId++,tile:1,tick:100,pawn,items:[pile]}];
  }else raw(w)[kind==='visitor'?'visitors':'podRescues']={departed:[{tick:100,pawn,items:[pile]}]};
  return {w,pawn,pile};
}
test.each(['scout','commercial','group','visitor','pod','terminal'] as const)('hay consumption is checked on the original %s human owner',kind=>{
  const {w,pawn,pile}=moved(kind);
  expect(captureHumanOwners(w).byId.get(pawn.id)?.pawn).toBe(pawn);
  expect(validFodderTransport(w)).toBe(true);
  pawn.need=eating(pile.id,true);expect(validFodderTransport(w)).toBe(false);
  pawn.need=null;pawn.feed={patientId:7,spot:{x:2,z:2},quantity:1,phase:'feed',progress:0,sourcePileId:null,carryPileId:pile.id};
  expect(validFodderTransport(w)).toBe(false);
});

test.each(['group','visitor','pod','terminal'] as const)('kibble memories and poisoning use the real %s owner clock, never the world tick',kind=>{
  const {w,pawn}=moved(kind);pawn.memories=[{kind:'ate-kibble',expiresAt:101}];
  expect(captureHumanOwners(w).byId.get(pawn.id)?.validationTick).toBe(100);
  expect(validFodderTransport(w)).toBe(true);
  pawn.memories[0]!.expiresAt=6100;expect(validFodderTransport(w)).toBe(true);
  pawn.memories[0]!.expiresAt=6101;expect(validFodderTransport(w)).toBe(false);
  pawn.memories[0]!.expiresAt=100;expect(validFodderTransport(w)).toBe(false);
  pawn.memories=[{kind:'ate-kibble',expiresAt:101},{kind:'ate-kibble',expiresAt:102}];expect(validFodderTransport(w)).toBe(false);
  pawn.memories=[];pawn.health??=createMedicalRecord(100);
  pawn.health.foodPoisoning={item:'kibble',cause:'dangerous-food',severity:100,bornAt:100};expect(validFodderTransport(w)).toBe(true);
  pawn.health.foodPoisoning.bornAt=101;expect(validFodderTransport(w)).toBe(false);
});

test('current human policy cannot reclassify hay, and malformed frontier inputs return false without throwing',()=>{
  const w=current();raw(w.foodPolicies[0]).allowed=['hay'];expect(validFodderTransport(w)).toBe(false);
  for(const value of [null,undefined,{schemaVersion:226,pawns:1},{schemaVersion:NaN},{schemaVersion:0},{schemaVersion:226,pawns:[{orders:{queue:null}}]}]){
    let accepted=true;expect(()=>{accepted=validFodderTransport(value as unknown as World);}).not.toThrow();expect(accepted).toBe(false);
  }
});

type AnimalFood='hay'|'kibble'|'haygrass';
function animalMeal(item:AnimalFood='hay'){
  const w=foodWorkstationCamp();
  w.resources=[{id:w.nextId++,kind:'rice',x:8,z:8,amount:6,growth:1,growthTick:w.tick}];enableWildlife(w,1);w.resources=[];
  const a=w.wildlife!.animals[0]!;Object.assign(a,{x:8,z:8,state:'eating',path:[],food:.1});
  const id=w.nextId++;
  if(item==='haygrass')w.resources=[{id,kind:item,x:9,z:8,amount:18,growth:.65,growthTick:w.tick}];
  else w.piles=[{id,kind:'food',item,quantity:8,owner:{type:'ground',x:9,z:8},...freshRot(item,w.tick)}];
  a.meal={kind:item==='haygrass'?'plant':'pile',id,quantity:1,progress:.25};
  refreshStock(w);return {w,a};
}

test.each(['hay','kibble','haygrass'] as const)('new %s animal meals retain local shape, contact and ingestion progress',item=>{
  const {w,a}=animalMeal(item),before=JSON.stringify(w);
  expect(validFodderTransport(w)).toBe(true);expect(JSON.stringify(w)).toBe(before);
  const mutations:Array<(v:ReturnType<typeof animalMeal>)=>void>=[
    ({a})=>{a.meal!.progress=-1;},({a})=>{a.meal!.progress=NaN;},
    ({a})=>{a.meal!.progress=animalSpecies(a.species).ingestTicks;},
    ({a})=>{raw(a.meal).progress='1';},({a})=>{a.meal!.quantity=0;},({a})=>{a.meal!.quantity=1.5;},
    ({a})=>{raw(a.meal).extra=true;},({a})=>{a.state='idle';},
    ({a})=>{a.state='moving';},({a})=>{a.x=1;},({a})=>{a.path=[{x:7,z:8}];},
    ({w,a})=>{a.motion={from:{x:7,z:8},to:{x:8,z:8},start:w.tick,end:w.tick+1,speedFactor:3,terrainDelay:0};},
    ({a})=>{a.meal!.quantity=5;},
  ];
  for(const mutate of mutations){const candidate=animalMeal(item);mutate(candidate);expect(validFodderTransport(candidate.w)).toBe(false);}
  a.state='moving';a.meal!.progress=0;expect(validFodderTransport(w)).toBe(true);
});

test('new animal foods enforce the actual diet, growth and competing physical reservations',()=>{
  const hay=animalMeal();hay.a.species='red-fox';expect(validFodderTransport(hay.w)).toBe(false);
  const kibble=animalMeal('kibble');kibble.a.species='red-fox';expect(validFodderTransport(kibble.w)).toBe(true);
  const grass=animalMeal('haygrass');grass.w.resources[0]!.growth=.649999;expect(validFodderTransport(grass.w)).toBe(false);
  grass.w.resources[0]!.growth=.65;grass.a.species='red-fox';expect(validFodderTransport(grass.w)).toBe(false);
  for(const item of ['hay','kibble'] as const){
    const {w,a}=animalMeal(item);w.pawns[0]!.haul={sourcePileId:a.meal!.id,quantity:8,phase:'pickup',carryPileId:null,destination:{type:'aside',x:7,z:7}};
    expect(validFodderTransport(w)).toBe(false);w.pawns[0]!.haul!.quantity=7;expect(validFodderTransport(w)).toBe(true);
    w.piles[0]!.owner={type:'pawn',pawnId:w.pawns[0]!.id};expect(validFodderTransport(w)).toBe(false);
  }
  const claim=animalMeal('haygrass');claim.w.wildlife!.animals.push({...structuredClone(claim.a),id:claim.w.nextId++});
  expect(validFodderTransport(claim.w)).toBe(false);
  const work=animalMeal('haygrass');work.w.jobs=[{id:work.w.nextId++,kind:'harvest',x:9,z:8,orientation:0,footprint:'standard',status:'pending',reservedBy:work.w.pawns[0]!.id,progress:0,escrow:{wood:0,food:0}}];
  expect(validFodderTransport(work.w)).toBe(false);
});

test('animal fodder poisoning is impossible while old food and old meals keep their own guards',()=>{
  const {w,a}=animalMeal('kibble');delete a.meal;a.state='idle';w.piles=[];refreshStock(w);
  a.health={...createMedicalRecord(w.tick),body:a.species};
  for(const item of ['hay','kibble'] as const){
    a.health.foodPoisoning={item,cause:'dangerous-food',severity:100,bornAt:w.tick};expect(validFodderTransport(w)).toBe(false);
  }
  a.health.foodPoisoning={item:'rice',cause:'dangerous-food',severity:100,bornAt:w.tick};
  a.meal={kind:'pile',id:w.nextId++,quantity:0,progress:-1};
  // Deliberately invalid old domain fields are left to their historical guard.
  expect(validFodderTransport(w)).toBe(true);
});

// Private-shaped MAIN context fixture follows the existing protected-hook
// tests. It establishes no authority for arbitrary public snapshot callers.
class MainFodderDecoder extends SnapshotDecoder {
  protected override createValidationContext(next:World):SnapshotValidationContext {
    const geometry=createOwnedValidationGeometry(next);
    return {powerParents:new PowerParentValidationCache(),geometry,resourceFacts:geometry.resourceFacts};
  }
}

test.each(['hay','kibble','haygrass'] as const)('RAW and MAIN reject a same-tick remote %s meal without adopting its revision',item=>{
  const {w}=animalMeal(item);expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
  for(const decoder of [new SnapshotDecoder(),new MainFodderDecoder()]){
    const encoder=new SnapshotEncoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
    expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Animal meal baseline refused');
    const held=structuredClone(first.world),good=structuredClone(encoder.encode(w,0,1));
    const bad=structuredClone(good);bad.world.wildlife!.animals[0]!.x=1;
    expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(held);
    expect(decoder.adopt(good).status).toBe('applied');expect(first.world).toEqual(held);
    const invalid=structuredClone(w);invalid.wildlife!.animals[0]!.meal!.progress=NaN;
    expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(invalid,0,1))).status).toBe('resync');
    expect(new MainFodderDecoder().adopt(structuredClone(new SnapshotEncoder().encode(invalid,0,1))).status).toBe('resync');
  }
});

test('RAW and MAIN refuse impossible animal kibble poisoning even without an active meal or fodder pile',()=>{
  const {w,a}=animalMeal('kibble');delete a.meal;a.state='idle';w.piles=[];refreshStock(w);
  a.health={...createMedicalRecord(w.tick),body:a.species,foodPoisoning:{item:'kibble',cause:'dangerous-food',severity:100,bornAt:w.tick}};
  expect(validFodderTransport(w)).toBe(false);
  const packet=structuredClone(new SnapshotEncoder().encode(w,0,1));
  expect(new SnapshotDecoder().adopt(structuredClone(packet)).status).toBe('resync');
  expect(new MainFodderDecoder().adopt(structuredClone(packet)).status).toBe('resync');
});
