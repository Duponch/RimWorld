import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { validCremationTransport } from '../src/sim/cremation-save.ts';
import { cookingSpot,newCookingBill,validBillSettings } from '../src/sim/cooking-bills.ts';
import { applyBillCommand } from '../src/sim/cooking-commands.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { refreshStock,addMaterial } from '../src/sim/materials.ts';
import { productionWorkTotal } from '../src/sim/production-recipes.ts';
import { finishCremation } from '../src/sim/cremation.ts';
import { startTravel } from '../src/sim/movement.ts';
import { captureHumanOwners } from '../src/sim/human-owners.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { funeralFixture } from './scenarios/hygiene-ui.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixturePower } from './scenarios/power.ts';
import { SCHEMA_VERSION,type Pawn,type Structure,type World } from '../src/sim/types.ts';
import type { ProductionContext } from '../src/sim/production-output.ts';

function prepared(stage:'source'|'held'|'placed'='source'){
  const {w,actor:p,other,body}=funeralFixture();
  w.structures=[];w.jobs=[];w.resources=[];w.packed=[];
  for(const actor of [p,other]){actor.priorities.haul=1;actor.priorities.cook=0;actor.priorities.craft=0;actor.path=[];actor.motion=null;actor.moveCooldown=0;actor.state='idle';actor.need=null;actor.haul=null;actor.jobId=null;}
  const generator=fixturePower(w,'wood-generator',11,11),bill=newCookingBill(w.nextId++,'cremate-corpse');
  const station:Structure={id:w.nextId++,kind:'electric-crematorium',x:14,z:13,orientation:0,footprint:'standard',material:'granite-blocks',power:newPowerState('electric-crematorium'),bills:[bill]};
  station.power!.parentId=generator.id;station.power!.on=true;w.structures.push(station);
  const spot=cookingSpot(station),cell={x:spot.x,z:spot.z-1},source={x:8,z:13},pile=w.piles.find(i=>i.humanCorpse?.pawnId===body.id)!;
  pile.owner=stage==='held'?{type:'pawn',pawnId:p.id}:{type:'ground',...stage==='placed'?cell:source};
  p.cooking={recipe:'cremate-corpse',stationId:station.id,billId:bill.id,spot,actionCell:stage==='source'?source:spot,phase:stage==='placed'?'work':'gather',progress:stage==='placed'?90000:0,productId:null,storageId:null,ingredients:[{pileId:pile.id,item:'human-corpse',quantity:1,stage,cell}]};
  Object.assign(p,stage==='placed'?{...spot,state:'working'}:{x:8,z:12,state:'moving'});refreshStock(w);
  return {w,p,other,body,pile,bill,station};
}
type Fixture=ReturnType<typeof prepared>;
const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
function exact(w:World){
  expect(validCremationTransport(w,w.schemaVersion)).toBe(true);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);const result=checkpoint(w);expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
}
function refused(w:World,file=true){expect(validCremationTransport(w,w.schemaVersion)).toBe(false);expect(checkpoint(w).status).toBe('resync');if(file)expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();}

test.each(['source','held','placed'] as const)('225 whole human corpse at %s retains identity, ownership, clinical record and settings through file and Decoder',stage=>{
  const f=prepared(stage),before=structuredClone(f.w);exact(f.w);expect(f.w).toEqual(before);expect(Object.hasOwn(f.w,'cremation')).toBe(false);
  expect(f.p.priorities.cook).toBe(0);expect(f.p.priorities.craft).toBe(0);expect(f.pile.id).toBe(f.body.body!.pileId);
});
test('held interrupted cremation retains its one real body with neutral progress and no invented output',()=>{
  const f=prepared('held');f.p.cooking!.phase='interrupted';exact(f.w);
  // Retaining the task keeps its historical assigned-actor envelope. An idle
  // interruption releases the task and uses interruptedCargo, a separate owner.
  f.p.state='idle';refused(f.w);f.p.state='moving';
  f.p.cooking!.progress=1;refused(f.w);
});
test('224 migration is number-only, preserving an existing funeral and ordinary bills without adding cremation policy',()=>{
  const {w}=funeralFixture(),bill=newCookingBill(w.nextId++,'simple-meal');
  w.structures.push({id:w.nextId++,kind:'campfire',x:9,z:9,orientation:0,footprint:'standard',material:'wood',bills:[bill],fuel:{ticks:300,burned:0,autoRefuel:true}});
  w.schemaVersion=224 as World['schemaVersion'];const before=structuredClone(w);
  expect(validCremationTransport(w,224)).toBe(true);expect(deserializeWorld(JSON.stringify(w))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(w).toEqual(before);
  expect(Object.hasOwn(bill,'cremationFilter')).toBe(false);expect(Object.hasOwn(w,'cremation')).toBe(false);
});
test('224 rejects prospective crematorium, recipe and filter before migration',()=>{
  const future=prepared();future.w.schemaVersion=224 as World['schemaVersion'];refused(future.w);
  const {w}=funeralFixture(),bill=newCookingBill(w.nextId++,'simple-meal');
  w.structures.push({id:w.nextId++,kind:'campfire',x:9,z:9,orientation:0,footprint:'standard',material:'wood',fuel:{ticks:300,burned:0,autoRefuel:true},bills:[bill]});
  w.schemaVersion=224 as World['schemaVersion'];Object.assign(bill,{cremationFilter:undefined});refused(w,false);
  Object.assign(bill,{cremationFilter:{colonists:true,strangers:true,fresh:true,rotting:true,desiccated:true}});refused(w);
});
test('cremation defaults and five exact own Boolean settings exclude target-count and output storage',()=>{
  const bill=newCookingBill(1,'cremate-corpse');expect(bill.filters['human-corpse']).toBe(true);expect(Object.entries(bill.filters).filter(([i])=>i!=='human-corpse').every(([,v])=>v===false)).toBe(true);
  expect(bill.cremationFilter).toEqual({colonists:true,strangers:true,fresh:true,rotting:true,desiccated:true});expect(bill.destination).toBe('drop');expect(validBillSettings(bill,'cremate-corpse',225)).toBe(true);
  for(const patch of [{mode:'until'},{destination:'stockpile'},{cremationFilter:undefined},{cremationFilter:null},{cremationFilter:{...bill.cremationFilter,extra:true}},{cremationFilter:{...bill.cremationFilter,fresh:1}}])expect(validBillSettings({...bill,...patch},'cremate-corpse',225)).toBe(false);
  for(const key of Object.keys(bill.cremationFilter!)){const filter={...bill.cremationFilter!};delete (filter as Record<string,unknown>)[key];expect(validBillSettings({...bill,cremationFilter:filter},'cremate-corpse',225)).toBe(false);}
  expect(validBillSettings({...newCookingBill(2),cremationFilter:undefined},'simple-meal',225)).toBe(false);
});
test('bill updates deeply copy both policies and reject malformed settings atomically on a real station',()=>{
  const f=prepared();f.p.cooking=null;f.p.state='idle';const {id:_id,recipe:_recipe,...settings}=structuredClone(f.bill),before=structuredClone(f.w);
  for(const patch of [{mode:'until'},{destination:'stockpile'},{cremationFilter:undefined},{cremationFilter:{...settings.cremationFilter,unknown:true}}]){
    expect(applyBillCommand(f.w,{type:'bill-update',structureId:f.station.id,billId:f.bill.id,settings:{...settings,...patch}} as never,new Map()).ok).toBe(false);expect(f.w).toEqual(before);
  }
  expect(applyBillCommand(f.w,{type:'bill-update',structureId:f.station.id,billId:f.bill.id,settings},new Map()).ok).toBe(true);
  settings.cremationFilter!.colonists=false;settings.filters['human-corpse']=false;expect(f.bill.cremationFilter!.colonists).toBe(true);expect(f.bill.filters['human-corpse']).toBe(true);exact(f.w);
});
test('malformed body, ownership, quantities, future fields and outputs share file and Decoder refusals',()=>{
  const changes:((f:Fixture)=>void)[]=[
    f=>{f.pile.quantity=2;},f=>{f.p.cooking!.ingredients[0]!.quantity=2;},f=>{f.pile.owner={type:'pawn',pawnId:f.other.id};},
    f=>{f.p.cooking!.ingredients=[];},f=>{f.p.cooking!.phase='output';},f=>{f.p.cooking!.productId=f.pile.id;},f=>{f.p.cooking!.storageId=f.pile.id;},
    f=>Object.assign(f.p.cooking!,{storageQuantity:undefined}),f=>Object.assign(f.p.cooking!,{workTicks:undefined}),
    f=>{f.body.body!.lostAt=f.w.tick;},f=>{delete f.body.body;},f=>{f.pile.humanCorpse!.pawnId=f.other.id;},f=>{f.pile.rot!.atTick=f.w.tick+1;},
    f=>{f.bill.filters['human-corpse']=false;},f=>{f.bill.cremationFilter!.colonists=false;},f=>{f.bill.radius=0;},
    f=>{f.p.cooking!.ingredients[0]!.cell={x:f.station.x,z:f.station.z};},
    f=>Object.assign(f.w,{cremation:{completed:1}}),f=>{f.station.material='steel';},f=>{f.station.fuel={ticks:0,burned:0,autoRefuel:true};},
  ];
  for(const change of changes){const f=prepared();change(f);refused(f.w,!Object.hasOwn(f.p.cooking!,'workTicks')&&!Object.hasOwn(f.p.cooking!,'storageQuantity'));}
});
test('whole corpse claims conflict with burial by person even without corpseId and with another pickup while carried',()=>{
  for(const stage of ['source','held','placed'] as const){
    const f=prepared(stage);f.other.burial={bodyPawnId:f.body.id,graveId:f.station.id,phase:'pickup',progress:0};refused(f.w);
  }
  const f=prepared('held');f.other.haul={phase:'pickup',sourcePileId:f.pile.id,carryPileId:null,quantity:1,destination:{type:'aside',x:22,z:22}};refused(f.w);
  const conflict=prepared();conflict.p.research={benchId:conflict.station.id,spot:{...conflict.p.cooking!.spot}} as never;refused(conflict.w);
  const disabled=prepared();disabled.p.priorities.haul=0;disabled.p.orders.active='cook';refused(disabled.w);
});
test('one queued body retains exact reservations while duplicate station or source claims are refused',()=>{
  const f=prepared(),task=structuredClone(f.p.cooking!);f.p.cooking=null;f.p.state='idle';f.p.orders.queue=[{cooking:task}];exact(f.w);
  f.other.orders.queue=[{cooking:structuredClone(task)}];refused(f.w);
});
test('same-tick movement and progress preserve the physical segment and immutable Decoder views',()=>{
  const f=prepared('held'),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  f.p.path=[{x:f.p.x+2,z:f.p.z}];expect(startTravel(f.w,f.p,{x:f.p.x+1,z:f.p.z})).toBe(true);
  const edge=structuredClone(f.p.motion),rng=f.w.rng,first=decoder.adopt(structuredClone(encoder.encode(f.w,0,1)));expect(first.status).toBe('applied');exact(f.w);expect(f.p.motion).toEqual(edge);
  const old=first.status==='applied'?structuredClone(first.world):null;
  f.bill.cremationFilter!.strangers=false;
  const sameTick=decoder.adopt(structuredClone(encoder.encode(f.w,1,2)));expect(sameTick.status).toBe('applied');if(sameTick.status==='applied')expect(sameTick.world).toEqual(f.w);
  if(first.status==='applied')expect(first.world).toEqual(old);expect(f.w.rng).toBe(rng);expect(f.p.motion).toEqual(edge);
  const working=prepared('placed');working.p.cooking!.progress=productionWorkTotal('cremate-corpse');exact(working.w);
});
test('human completion preserves its historical Pawn and death while consuming attached possessions without an output or RNG',()=>{
  const f=prepared('placed');addMaterial(f.w,'apparel',1,{type:'apparel',pawnId:f.body.id},'cloth-shirt');f.p.cooking!.progress=productionWorkTotal('cremate-corpse');
  const health=structuredClone(f.body.health),rng=f.w.rng,nextId=f.w.nextId,pawnId=f.body.id,tick=f.w.tick;
  const context:ProductionContext={search:()=>null,move:()=>{},release:()=>false,event:()=>{},workRate:()=>1};expect(finishCremation(f.w,f.p,f.bill,context)).toBe(true);
  expect(f.w.pawns.find(p=>p.id===pawnId)).toBe(f.body);expect(f.body.health).toEqual(health);expect(f.body.body!.lostAt).toBe(tick);expect(f.w.piles).toEqual([]);
  expect([f.w.rng,f.w.nextId,f.w.tick]).toEqual([rng,nextId,tick]);expect(f.bill.target).toBe(0);expect(f.p.cooking).toBeNull();expect(Object.hasOwn(f.w,'cremation')).toBe(false);exact(f.w);
});
test('archived ordinary bills reject own prospective filter fields and crematorium cannot acquire a packed owner',()=>{
  const f=prepared();f.p.cooking=null;f.p.state='idle';const archived=f.other;f.w.pawns=f.w.pawns.filter(p=>p!==archived);
  const building:Structure={id:f.w.nextId++,kind:'tailor-bench',x:22,z:22,material:'wood',orientation:0,footprint:'standard',bills:[newCookingBill(f.w.nextId++,'shirt')]};
  f.w.visitors={departed:[{tick:f.w.tick,pawn:archived,items:[],packed:[{building,owner:{type:'inventory',pawnId:archived.id}}]}]} as never;
  expect(validCremationTransport(f.w,225)).toBe(true);Object.assign(building.bills![0]!,{cremationFilter:undefined});expect(validCremationTransport(f.w,225)).toBe(false);expect(validCremationTransport(f.w,224)).toBe(false);
  const packed=prepared();packed.p.cooking=null;packed.p.state='idle';packed.w.structures=packed.w.structures.filter(s=>s!==packed.station);packed.station.power!.on=false;packed.station.power!.parentId=null;
  packed.w.packed.push({building:packed.station,owner:{type:'ground',x:22,z:22}});refused(packed.w);
});
test('all seven original Pawn domains reject prospective local cremation tasks before historic migration or projection',()=>{
  const w=medicalCamp(7),[local,scout,commercial,member,loss,visitor,pod]=w.pawns as [Pawn,Pawn,Pawn,Pawn,Pawn,Pawn,Pawn];w.pawns=[local];
  w.scout={phase:'travelling',pawn:scout,items:[],foodPileId:w.nextId++,quantity:2,startedAt:w.tick,departedAt:w.tick,returnAt:w.tick+1500,consumed:0,entry:{x:0,z:3}};
  w.commercialTrip={phase:'outbound',pawn:commercial,items:[],foodPileId:w.nextId++,foodQuantity:2,silverQuantity:0,startedAt:w.tick,departedAt:w.tick,arrivesAt:w.tick+750,entry:{x:0,z:4},consumed:0,silverPaid:0,bought:{medicine:0,component:0}};
  w.group={id:1,phase:'travelling',members:[member],items:[],startedAt:w.tick,departedAt:w.tick,lastPersonalTick:w.tick,entry:{x:0,z:5},tile:0,destination:1,route:[],segment:null,paused:false,stop:null,
    baseline:{food:0,silver:0,medicine:0,component:0,cargo:{cloth:0,'muffalo-wool':0}},ledger:{foodLoaded:0,foodConsumed:0,medicineUsed:0,silverLoaded:0,silverPaid:0,silverEarned:0,cargoLoaded:{cloth:0,'muffalo-wool':0},sold:{cloth:0,'muffalo-wool':0},bought:{medicine:0,component:0}}};
  loss.state='dead';loss.health=createMedicalRecord(w.tick);loss.health.death={tick:w.tick,cause:'blood-loss'};w.groupLosses=[{groupId:1,tile:0,tick:w.tick,pawn:loss,items:[]}];
  const agenda={rng:1,cycle:0,last:w.tick,pending:[]};w.visitors={profile:'cassandra-visitors-v1',adoptedAt:w.tick,rng:1,serial:1,introAt:null,traveler:{...agenda},visitor:{...agenda},groups:[],departed:[{group:1,tick:w.tick,pawn:visitor,items:[]}]};
  w.podRescues={profile:'civilian-pod-rescue-v1',serial:1,incidents:[],departed:[{incidentId:1,tick:w.tick,pawn:pod,items:[]}]};
  const owners=captureHumanOwners(w).pawnOwners;expect(owners).toHaveLength(7);expect(validCremationTransport(w,224)).toBe(true);
  const task=prepared().p.cooking!;
  for(const version of [224,225])for(const owner of owners){owner.pawn!.cooking=structuredClone(task);expect(validCremationTransport(w,version)).toBe(false);owner.pawn!.cooking=null;owner.pawn!.orders.queue=[{cooking:structuredClone(task)}];expect(validCremationTransport(w,version)).toBe(false);owner.pawn!.orders.queue=[];}
});
