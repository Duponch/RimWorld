import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { validSmeltingTransport } from '../src/sim/smelting-save.ts';
import { cookingSpot,newCookingBill,validBillSettings } from '../src/sim/cooking-bills.ts';
import { applyBillCommand } from '../src/sim/cooking-commands.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { productionWorkTotal } from '../src/sim/production-recipes.ts';
import { finishSmelting } from '../src/sim/smelting.ts';
import { smeltingHitPointsPercent } from '../src/sim/smelting-rules.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixturePower } from './scenarios/power.ts';
import { withoutPawnSkills } from './scenarios/legacy-skills.ts';
import { withoutPostV10Fields } from './scenarios/legacy-save.ts';
import { createWorld } from '../src/sim/engine.ts';
import { validAnimalRestTransport } from '../src/sim/animal-rest-save.ts';
import { SCHEMA_VERSION,type Structure,type World } from '../src/sim/types.ts';
import type { WeaponItem } from '../src/sim/equipment-rules.ts';
import type { ProductionContext } from '../src/sim/production-output.ts';

function prepared(item:WeaponItem='revolver',stage:'source'|'held'|'placed'='source'){
  const w=medicalCamp(2),p=w.pawns[0]!;
  w.resources=[];w.jobs=[];w.piles=[];w.structures=[];w.packed=[];
  for(const actor of w.pawns){delete actor.health;delete actor.background;delete actor.traits;actor.path=[];actor.motion=null;actor.state='idle';actor.hunger=100;actor.rest=100;actor.need=null;actor.haul=null;actor.jobId=null;actor.moveCooldown=0;actor.priorities.craft=1;}
  const generator=fixturePower(w,'wood-generator',11,11),bill=newCookingBill(w.nextId++,'smelt-weapon');bill.filters[item]=true;
  const station:Structure={id:w.nextId++,kind:'electric-smelter',x:14,z:13,orientation:0,footprint:'standard',material:'steel',power:newPowerState('electric-smelter'),bills:[bill]};
  station.power!.parentId=generator.id;station.power!.on=true;w.structures.push(station);
  const spot=cookingSpot(station),cell={x:spot.x,z:spot.z-1},source={x:8,z:13};
  addMaterial(w,'weapon',1,stage==='held'?{type:'pawn',pawnId:p.id}:{type:'ground',...stage==='placed'?cell:source},item);
  const pile=w.piles[0]!;
  p.cooking={recipe:'smelt-weapon',stationId:station.id,billId:bill.id,spot,actionCell:stage==='source'?source:spot,phase:stage==='placed'?'work':'gather',ingredients:[{pileId:pile.id,item,quantity:1,stage,cell}],progress:stage==='placed'?510000:0,productId:null,storageId:null};
  Object.assign(p,stage==='placed'?{...spot,state:'working'}:{x:8,z:12,state:'moving'});refreshStock(w);
  return {w,p,pile,bill,station};
}
type Fixture=ReturnType<typeof prepared>;
const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
function exact(w:World){expect(validateWorld(w)).toEqual([]);expect(validSmeltingTransport(w,w.schemaVersion)).toBe(true);expect(deserializeWorld(serializeWorld(w))).toEqual(w);const result=checkpoint(w);expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);}
function refused(w:World){expect(validSmeltingTransport(w,w.schemaVersion)).toBe(false);expect(checkpoint(w).status).toBe('resync');expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();}
function output(f:Fixture,item:'steel'|'plasteel'='steel',quantity=12){
  f.w.piles=[];addMaterial(f.w,item,quantity,{type:'pawn',pawnId:f.p.id},item);
  f.p.cooking!.ingredients=[];f.p.cooking!.phase='output';f.p.cooking!.progress=0;f.p.cooking!.productId=f.w.piles[0]!.id;f.bill.target=0;return f;
}

test('221 neutral migration preserves clocks, resources, existing bills and RNG without opting in to smelting',()=>{
  const w=medicalCamp(),bill=newCookingBill(w.nextId++,'simple-meal');
  w.structures.push({id:w.nextId++,kind:'campfire',x:9,z:9,orientation:0,footprint:'standard',material:'wood',bills:[bill],fuel:{ticks:300,burned:0,autoRefuel:true}});
  w.schemaVersion=221 as World['schemaVersion'];const original=structuredClone(w),expected=structuredClone(w);expected.schemaVersion=SCHEMA_VERSION;
  expect(deserializeWorld(JSON.stringify(w))).toEqual(expected);expect(w).toEqual(original);expect(Object.hasOwn(bill,'smeltFilter')).toBe(false);
});
test('pre-20 orders and pre-25 furniture absence remain strictly readable without accepting present malformed containers',()=>{
  const w=createWorld(42,16,16);w.structures=[];w.jobs=[];w.piles=[];w.resources=[];w.stockpiles=[];refreshStock(w);
  const old=JSON.parse(JSON.stringify(w));old.schemaVersion=9;withoutPawnSkills(old);withoutPostV10Fields(old);
  for(const p of old.pawns){delete p.priorities.mine;delete p.priorities.craft;delete p.priorities.cook;delete p.cooking;}
  const original=structuredClone(old);expect(Object.hasOwn(old,'packed')).toBe(false);expect(old.pawns.every((p:{orders?:unknown})=>!Object.hasOwn(p,'orders'))).toBe(true);
  expect(validSmeltingTransport(old,9)).toBe(true);expect(validAnimalRestTransport(old,9)).toBe(true);
  const restored=deserializeWorld(JSON.stringify(old));expect(validateWorld(restored)).toEqual([]);expect(restored.schemaVersion).toBe(SCHEMA_VERSION);expect([restored.rng,restored.tick,restored.nextId]).toEqual([old.rng,old.tick,old.nextId]);expect(restored.piles).toEqual([]);expect(old).toEqual(original);
  for(const packed of [null,{},false,undefined]){const malformed={...old,packed};expect(validSmeltingTransport(malformed,9)).toBe(false);expect(validAnimalRestTransport(malformed,9)).toBe(false);if(packed!==undefined)expect(()=>deserializeWorld(JSON.stringify(malformed))).toThrow();}
  const future={...old,structures:[{id:old.nextId,kind:'electric-smelter',x:8,z:8,orientation:0,footprint:'standard',material:'steel'}],nextId:old.nextId+1};expect(validSmeltingTransport(future,9)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(future))).toThrow();
});
for(const item of ['revolver','bolt-action-rifle','emp-launcher','plasteel-knife'] as const)for(const stage of ['source','held','placed'] as const)test(`${item} ${stage} retains one real weapon and its exact condition through file and Decoder`,()=>{
  const f=prepared(item,stage);f.pile.weapon!.quality='legendary';f.pile.weapon!.hitPoints=item==='plasteel-knife'?35:17;exact(f.w);
});
test('completion threshold and variable metal envelope are persisted without inventing the consumed source history',()=>{
  const f=prepared('emp-launcher','placed');f.p.cooking!.progress=productionWorkTotal('smelt-weapon');exact(f.w);
  for(const [item,quantity] of [['steel',1],['steel',12],['steel',19],['plasteel',1],['plasteel',8]] as const)exact(output(prepared('revolver','placed'),item,quantity).w);
});
test('future station, recipe and filters on ordinary bills are rejected in 221 before migration',()=>{
  for(const stage of ['source','held','placed'] as const){const f=prepared('revolver',stage);f.w.schemaVersion=221 as World['schemaVersion'];refused(f.w);}
  const f=prepared();f.p.cooking=null;f.w.piles=[];f.station.kind='campfire';delete f.station.power;f.station.material='wood';f.station.fuel={ticks:300,burned:0,autoRefuel:true};
  f.station.bills=[{...newCookingBill(f.bill.id,'simple-meal'),smeltFilter:{hpMin:0,hpMax:100,qualityMin:'awful',qualityMax:'legendary'}}];f.w.schemaVersion=221 as World['schemaVersion'];refused(f.w);
});
test('future smelting filter in a frozen archive is seen at the original owner without adding local tasks',()=>{
  const f=prepared(),archive=f.w.pawns[1]!;f.w.pawns=f.w.pawns.filter(p=>p!==archive);
  const building:Structure={id:f.w.nextId++,kind:'tailor-bench',x:22,z:22,material:'wood',orientation:0,footprint:'standard',bills:[newCookingBill(f.w.nextId++,'shirt')]};
  f.w.visitors={departed:[{tick:f.w.tick,pawn:archive,items:[],packed:[{building,owner:{type:'inventory',pawnId:archive.id}}]}]} as never;
  expect(validSmeltingTransport(f.w,222)).toBe(true);building.bills![0]!.smeltFilter={hpMin:0,hpMax:100,qualityMin:'awful',qualityMax:'legendary'};
  expect(validSmeltingTransport(f.w,222)).toBe(false);f.w.schemaVersion=221 as World['schemaVersion'];expect(validSmeltingTransport(f.w,221)).toBe(false);
});
test('inactive minified station retains its real bills and cannot acquire a fuel tank or a pre-222 kind',()=>{
  const f=prepared();f.p.cooking=null;f.p.state='idle';f.w.structures=f.w.structures.filter(s=>s!==f.station);f.station.power!.on=false;f.station.power!.parentId=null;
  f.w.packed.push({building:f.station,owner:{type:'ground',x:22,z:22}});exact(f.w);
  f.station.fuel={ticks:0,burned:0,autoRefuel:true};refused(f.w);delete f.station.fuel;
  f.w.schemaVersion=221 as World['schemaVersion'];refused(f.w);
});
test('strict bill defaults, inclusive ranges and half-even HP keep historical until mode valid',()=>{
  const bill=newCookingBill(1,'smelt-weapon');expect(Object.values(bill.filters)).toEqual([false,false,false,false]);expect(validBillSettings(bill,'smelt-weapon',222)).toBe(true);expect(validBillSettings(bill,'smelt-weapon',221)).toBe(false);
  for(const patch of [{mode:'until'},{smeltFilter:undefined},{smeltFilter:{hpMin:101,hpMax:100,qualityMin:'awful',qualityMax:'legendary'}},{smeltFilter:{hpMin:0,hpMax:100,qualityMin:'good',qualityMax:'poor'}},{smeltFilter:{hpMin:0,hpMax:100,qualityMin:'awful',qualityMax:'legendary',extra:true}}])expect(validBillSettings({...bill,...patch},'smelt-weapon',222)).toBe(false);
  const old=newCookingBill(2,'simple-meal');old.mode='until';expect(validBillSettings(old,'simple-meal',221)).toBe(true);expect(validBillSettings({...old,smeltFilter:undefined},'simple-meal',222)).toBe(false);
  expect(smeltingHitPointsPercent(35,280)).toBe(12);const f=prepared('plasteel-knife','held');f.pile.weapon!.hitPoints=35;f.bill.smeltFilter!.hpMin=12;f.bill.smeltFilter!.hpMax=12;exact(f.w);f.bill.smeltFilter!.hpMin=13;f.bill.smeltFilter!.hpMax=13;refused(f.w);
});
test('bill update copies filter settings deeply and invalid modes fail atomically with a valid target',()=>{
  const f=prepared();f.p.cooking=null;f.p.state='idle';const {id:_id,recipe:_recipe,...settings}=structuredClone(f.bill),before=structuredClone(f.w);
  expect(applyBillCommand(f.w,{type:'bill-update',structureId:f.station.id,billId:f.bill.id,settings:{...settings,mode:'until'}},new Map()).ok).toBe(false);expect(f.w).toEqual(before);
  expect(applyBillCommand(f.w,{type:'bill-update',structureId:f.station.id,billId:f.bill.id,settings},new Map()).ok).toBe(true);
  settings.smeltFilter!.hpMin=99;settings.filters.revolver=false;expect(f.bill.smeltFilter!.hpMin).toBe(0);expect(f.bill.filters.revolver).toBe(true);exact(f.w);
});
test('malformed weapon stage, condition, quantity, progress and forbidden state share file and Decoder refusal',()=>{
  const changes:((f:Fixture)=>void)[]=[f=>{f.pile.quantity=2;},f=>{f.pile.weapon!.forbidden=true;},f=>{f.pile.weapon!.hitPoints=0;},f=>{Object.assign(f.pile.weapon!,{extra:true});},f=>{f.pile.owner={type:'pawn',pawnId:f.w.pawns[1]!.id};},f=>{f.p.cooking!.progress=1;},f=>{f.p.cooking!.phase='interrupted';},f=>{f.bill.filters.revolver=false;},f=>{f.bill.smeltFilter!.qualityMin='good';},f=>{f.bill.radius=0;}];
  for(const change of changes){const f=prepared();change(f);refused(f.w);}
});
test('output refuses weapon metadata and quantities beyond each metal envelope',()=>{
  for(const [item,quantity] of [['steel',20],['plasteel',9]] as const)refused(output(prepared(),item,quantity).w);
  const f=output(prepared());f.w.piles[0]!.weapon={quality:'normal',hitPoints:100};refused(f.w);
});
test('partially reserved metal output uses its actual quantity and storage capacity',()=>{
  const f=output(prepared(), 'steel',12),id=f.w.nextId++;
  f.w.stockpiles.push({id,zoneId:id,x:20,z:20,priority:3,capacity:75,filters:{wood:false,food:false,steel:true}});
  addMaterial(f.w,'steel',70,{type:'ground',x:20,z:20},'steel');f.p.cooking!.storageId=id;f.p.cooking!.storageQuantity=5;f.p.cooking!.actionCell={x:20,z:20};exact(f.w);
  f.p.cooking!.storageQuantity=6;refused(f.w);delete f.p.cooking!.storageQuantity;refused(f.w);
});
test('one queued weapon reservation survives checkpoints but rejects concurrent equip and duplicate station owners',()=>{
  const f=prepared(),task=structuredClone(f.p.cooking!);f.p.cooking=null;f.p.state='idle';f.p.orders.queue=[{cooking:task}];exact(f.w);
  f.w.pawns[1]!.equipmentTask={itemId:f.pile.id,action:'equip',progress:0};refused(f.w);delete f.w.pawns[1]!.equipmentTask;
  f.w.pawns[1]!.orders.queue=[{cooking:structuredClone(task)}];refused(f.w);
});
test('same-tick progress and irreversible output retain exact RNG, bill count and immutable Decoder checkpoints',()=>{
  const f=prepared('bolt-action-rifle','placed'),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(f.w,0,1)));expect(first.status).toBe('applied');const before=first.status==='applied'?structuredClone(first.world):null;
  const tick=f.w.tick,rng=f.w.rng,sourceId=f.pile.id;f.p.cooking!.progress=productionWorkTotal('smelt-weapon');
  expect(decoder.adopt(structuredClone(encoder.encode(f.w,1,2))).status).toBe('applied');exact(f.w);
  const context:ProductionContext={search:()=>null,move:()=>{},release:()=>false,event:()=>{},workRate:()=>1};expect(finishSmelting(f.w,f.p,f.bill,context)).toBe(true);
  expect(f.w.tick).toBe(tick);expect(f.w.rng).not.toBe(rng);expect(f.w.piles.some(p=>p.id===sourceId)).toBe(false);expect(f.w.piles[0]!.quantity).toBe(15);expect(f.bill.target).toBe(0);exact(f.w);
  const final=decoder.adopt(structuredClone(encoder.encode(f.w,2,3)));expect(final.status).toBe('applied');if(final.status==='applied')expect(final.world).toEqual(f.w);if(first.status==='applied')expect(first.world).toEqual(before);
});
