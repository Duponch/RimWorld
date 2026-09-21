import { foodWorkstationCamp as camp,fixtureFoodStation as station,foodWorkstationConstructionFixture } from './scenarios/food-workstations';
import { withoutFoodCrops } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { applyCommand,stepWorld,validateWorld,serializeWorld,deserializeWorld } from '../src/sim/index';
import { addGroundMaterial,refreshStock } from '../src/sim/materials';
import { footprintCells } from '../src/sim/definitions';
import { constructionRecipe } from '../src/sim/construction-materials';
import { consumeCookingFuel,burnFuel } from '../src/sim/fuel';
import { newCookingBill } from '../src/sim/cooking-bills';
import { WorkEnvironmentCache } from '../src/sim/work-environment';
import { reconcileTemperature } from '../src/sim/temperature';
import { applyCookingHeat,applyThermalSources } from '../src/sim/thermal-sources';
import { foodStationUsable } from '../src/sim/food-workstations';
import { powerDemand } from '../src/sim/power-rules';
import { reconcilePower,advancePower } from '../src/sim/power';
import { fixturePower } from './scenarios/power';
import { workplaceCamp } from './scenarios/work-environment';
import { createMedicalRecord } from '../src/sim/injury-state';
import { BLOOD_UNIT } from '../src/sim/injury-rules';
import { finishButchery } from '../src/sim/butchery';
import { productionWorkTotal } from '../src/sim/production-recipes';
import { deconstructionDuration } from '../src/sim/deconstruction-rules';
import { isCookingOrder } from '../src/sim/order-types';
import type { ProductionContext } from '../src/sim/production-output';
import type { World,Structure,MaterialPile } from '../src/sim/types';

function until(w:World,done:()=>boolean,max=2000) {
  for(let i=0;i<max&&!done();i++){stepWorld(w);if(i%25===0)expect(validateWorld(w),`tick${w.tick}`).toEqual([]);}
  expect(done(),JSON.stringify({tick:w.tick,pawn:w.pawns[0],jobs:w.jobs,structures:w.structures})).toBe(true);expect(validateWorld(w)).toEqual([]);
}
const quantity=(w:World,item:MaterialPile['item'])=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const wood=(w:World)=>quantity(w,'wood')+[...w.structures,...w.packed.map(p=>p.building)].reduce((n,s)=>n+(s.fuel?(s.fuel.ticks+s.fuel.burned)/600:0),0);

test('food stations build from delivered matter, electric finishing requires skill4, and all orientations occupy three cells',()=>{
  const w=foodWorkstationConstructionFixture(),p=w.pawns[0]!;p.skills.construction.level=3;
  for(const kind of ['fueled-stove','electric-stove','butcher-table'] as const){
    expect(constructionRecipe({kind,material:kind==='butcher-table'?'wood':'steel'}).coreWork).toBe(kind==='butcher-table'?1400:2000);
    for(const orientation of [0,1,2,3] as const)expect(footprintCells({kind,x:10,z:10,orientation})).toHaveLength(3);
  }
  until(w,()=>w.structures.some(s=>s.kind==='fueled-stove')&&w.structures.some(s=>s.kind==='butcher-table'),4000);
  expect(w.structures.some(s=>s.kind==='electric-stove')).toBe(false);
  const fire=w.structures.find(s=>s.kind==='fueled-stove')!;expect(fire.fuel).toEqual({ticks:0,burned:0,autoRefuel:true});expect(fire.bills).toEqual([]);
  p.skills.construction.level=4;until(w,()=>w.structures.some(s=>s.kind==='electric-stove'),2000);
  expect(quantity(w,'steel')).toBe(0);expect(quantity(w,'component')).toBe(0);expect(quantity(w,'wood')).toBe(0);
  expect(w.structures.find(s=>s.kind==='electric-stove')!.power?.on).toBe(false);
});

test('cook refuels a stove without Hauling, gathers mixed crops on its surface, saves exact work and preserves fuel when packed',()=>{
  const w=camp(),p=w.pawns[0]!;p.priorities.cook=1;const s=station(w,'fueled-stove');
  addGroundMaterial(w,'wood',10,{x:5,z:6},'wood');addGroundMaterial(w,'food',5,{x:6,z:6},'potato');addGroundMaterial(w,'food',5,{x:7,z:6},'corn');refreshStock(w);
  expect(applyCommand(w,{type:'bill-add',structureId:s.id}).ok).toBe(true);s.bills![0]!.destination='drop';const initial=wood(w);
  until(w,()=>p.haul?.destination.type==='fuel'&&p.haul.phase==='deliver');
  expect(p.haul!.destination).toMatchObject({forCooking:true});const haul=deserializeWorld(serializeWorld(w));stepWorld(w,35);stepWorld(haul,35);expect(haul).toEqual(w);
  until(w,()=>p.cooking?.phase==='work'&&p.cooking.progress>0);
  const cells=new Set(footprintCells(s).map(c=>`${c.x}:${c.z}`));expect(p.cooking!.ingredients.every(i=>i.stage==='placed'&&cells.has(`${i.cell.x}:${i.cell.z}`))).toBe(true);
  expect(s.fuel!.burned).toBe(p.cooking!.workTicks!*16);const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,100);stepWorld(resumed,100);expect(resumed).toEqual(w);
  until(w,()=>s.bills![0]!.target===0&&!p.cooking);expect(quantity(w,'simple-meal')).toBe(1);expect(quantity(w,'potato')+quantity(w,'corn')).toBe(0);expect(wood(w)).toBe(initial);
  const fuel=structuredClone(s.fuel);stepWorld(w,30);expect(s.fuel).toEqual(fuel);
  p.priorities.cook=0;p.priorities.build=1;expect(applyCommand(w,{type:'designate',kind:'uninstall',x:s.x,z:s.z}).ok).toBe(true);
  until(w,()=>w.packed.some(q=>q.building.id===s.id));expect(w.packed[0]!.building.fuel).toEqual(fuel);expect(wood(w)).toBe(initial);
  const packed=deserializeWorld(serializeWorld(w));expect(packed).toEqual(w);
  expect(applyCommand(w,{type:'install',structureId:s.id,x:14,z:10,orientation:1}).ok).toBe(true);until(w,()=>w.structures.some(q=>q.id===s.id));expect(s.fuel).toEqual(fuel);expect(s.bills![0]!.target).toBe(0);expect(wood(w)).toBe(initial);
});

test('kitchen role, powered idle heat, work heat, fractional last fuel, outage and strict version boundaries',()=>{
  const w=workplaceCamp();w.structures=w.structures.filter(s=>s.kind==='wall'||s.kind==='door');const a=station(w,'fueled-stove',4,4);a.fuel!.ticks=600;
  const env=new WorkEnvironmentCache();expect(env.read(w).room(a)?.role).toBe('kitchen');expect(env.read(w).production(a,{x:4,z:3}).roomRole).toBe(1);
  w.structures.push({id:w.nextId++,kind:'bed',x:2,z:2,orientation:0,footprint:'standard'});expect(env.read(w).production(a,{x:4,z:3}).roomRole).toBe(.8);
  const layout=reconcileTemperature(w),room=w.thermal!.regions[layout.indices[4*w.width+4]!]!,before=room.temperature;applyThermalSources(w,layout);expect(room.temperature-before).toBeCloseTo(4/6/room.cells.length);
  const warmed=room.temperature;applyCookingHeat(w,a);expect(room.temperature-warmed).toBeCloseTo(1/room.cells.length);
  for(let i=0;i<37;i++)expect(consumeCookingFuel(a)).toBe(1);expect(a.fuel!.ticks).toBe(8);expect(consumeCookingFuel(a)).toBe(.5);expect(a.fuel!.burned).toBe(600);expect(consumeCookingFuel(a)).toBe(0);const held=structuredClone(a.fuel);burnFuel(w);expect(a.fuel).toEqual(held);
  const electric=camp(),e=station(electric,'electric-stove'),g=fixturePower(electric,'wood-generator',14,10);reconcilePower(electric);
  for(let i=0;i<120&&!e.power!.on;i++){electric.tick++;advancePower(electric);}expect(e.power!.on).toBe(true);expect(powerDemand(e)).toBe(350);expect(foodStationUsable(e)).toBe(true);
  g.fuel!.ticks=0;g.power!.on=false;for(let i=0;i<120&&e.power!.on;i++){electric.tick++;advancePower(electric);}expect(foodStationUsable(e)).toBe(false);expect(validateWorld(electric)).toEqual([]);
  for(const kind of ['fueled-stove','electric-stove','butcher-table'] as const){const future=withoutFoodCrops(camp());station(future,kind);const bad=structuredClone(future);(bad as {schemaVersion:number}).schemaVersion=83;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  const old=withoutFoodCrops(camp()),fire:Structure={id:old.nextId++,kind:'campfire',x:10,z:10,orientation:0,footprint:'standard',fuel:{ticks:12000,burned:0,autoRefuel:true},bills:[newCookingBill(old.nextId++)]};old.structures.push(fire);delete fire.bills![0]!.filters.potato;delete fire.bills![0]!.filters.corn;withoutFoodCrops(old);const legacy=JSON.parse(JSON.stringify(old));legacy.schemaVersion=83;const migrated=deserializeWorld(JSON.stringify(legacy));expect(migrated.structures[0]!.bills![0]!.filters).toEqual(fire.bills![0]!.filters);legacy.structures[0].bills[0].filters.corn=false;expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow();
});

test('butcher table applies full anatomical yield without changing work or granting a kitchen role',()=>{
  function butcher(kind:'butcher-table'|'butcher-spot') {
    const w=camp(),p=w.pawns[0]!;p.priorities.cook=1;p.x=10;p.z=9;
    const s:Structure=kind==='butcher-table'?station(w,kind):{id:w.nextId++,kind,x:10,z:10,orientation:0,footprint:'standard',bills:[]};if(kind==='butcher-spot')w.structures.push(s);
    const bill=newCookingBill(w.nextId++,'butcher-creature');s.bills!.push(bill);const id=w.nextId++;
    w.piles.push({id,item:'hare-corpse',kind:'corpse',quantity:1,owner:{type:'ground',x:10,z:10},corpse:{animalId:id,species:'hare',sex:'female',health:{...createMedicalRecord(w.tick),body:'hare',bloodLoss:BLOOD_UNIT,death:{tick:w.tick,cause:'blood-loss'}}},rot:{progress:0,atTick:w.tick}});
    p.cooking={recipe:'butcher-creature',stationId:s.id,billId:bill.id,spot:{x:10,z:9},actionCell:{x:10,z:10},phase:'work',ingredients:[{pileId:id,item:'hare-corpse',quantity:1,stage:'placed',cell:{x:10,z:10}}],progress:productionWorkTotal('butcher-creature'),workTicks:45,productId:null,storageId:null};p.state='working';
    const context={event:()=>{},release:()=>{throw Error('unexpected release');},move:()=>{},workRate:()=>1,search:()=>null} as unknown as ProductionContext;
    expect(finishButchery(w,p,bill,context)).toBe(true);refreshStock(w);expect(validateWorld(w)).toEqual([]);return w;
  }
  const table=butcher('butcher-table'),spot=butcher('butcher-spot');expect(table.butchery!.meat).toBeGreaterThan(spot.butchery!.meat);expect(table.butchery!.leather).toBeGreaterThan(spot.butchery!.leather);expect(table.pawns[0]!.skills.cooking).toEqual(spot.pawns[0]!.skills.cooking);
  const room=workplaceCamp();room.structures=room.structures.filter(s=>s.kind==='wall'||s.kind==='door');const b=station(room,'butcher-table',4,4),env=new WorkEnvironmentCache().read(room);expect(env.room(b)?.role).toBe('none');expect(env.production(b,{x:4,z:3}).roomRole).toBe(1);
});

test('electric cooking survives save replay and generator removal reconciles queued work without losing carried matter',()=>{
  const w=camp(),cook=w.pawns[0]!,helper=structuredClone(cook);
  helper.id=w.nextId++;helper.name='Électricien';helper.x=15;helper.z=10;w.pawns.push(helper);
  cook.priorities.cook=1;
  const stove=station(w,'electric-stove'),generator=fixturePower(w,'wood-generator',14,10);
  addGroundMaterial(w,'food',20,{x:7,z:7},'potato');refreshStock(w);
  expect(applyCommand(w,{type:'bill-add',structureId:stove.id})).toMatchObject({ok:true});
  stove.bills![0]!.destination='drop';
  until(w,()=>cook.cooking?.phase==='work'&&cook.cooking.progress>0);
  expect(stove.power).toMatchObject({on:true,parentId:generator.id});
  const cookingCopy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<300&&cook.cooking;i++){stepWorld(w);stepWorld(cookingCopy);expect(cookingCopy).toEqual(w);}
  expect(cook.cooking).toBeNull();expect(quantity(w,'simple-meal')).toBe(1);expect(quantity(w,'potato')).toBe(10);
  expect(stove.bills![0]!.target).toBe(0);expect(validateWorld(w)).toEqual([]);

  // A real builder approaches and nearly finishes dismantling the source.
  // The cook then carries a different payload while its next meal waits in queue.
  helper.priorities.build=1;
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:generator.x,z:generator.z})).toMatchObject({ok:true});
  const removal=w.jobs.find(j=>j.deconstruction?.structureId===generator.id)!;
  expect(applyCommand(w,{type:'order-job',pawnId:helper.id,jobId:removal.id,queue:false})).toMatchObject({ok:true});
  until(w,()=>removal.progress>=deconstructionDuration(removal)-20);
  addGroundMaterial(w,'wood',5,{x:cook.x,z:cook.z},'wood');refreshStock(w);
  const payload=w.piles.find(p=>p.item==='wood')!;cook.priorities.haul=1;
  expect(applyCommand(w,{type:'stockpile',enabled:true,x:27,z:27,filters:{wood:true,food:false},priority:1})).toMatchObject({ok:true});
  expect(applyCommand(w,{type:'order-haul',pawnId:cook.id,target:{type:'pile',pileId:payload.id},queue:false})).toMatchObject({ok:true});
  until(w,()=>cook.haul?.phase==='deliver');
  const carried=w.piles.find(p=>p.id===cook.haul!.carryPileId)!;
  expect(carried.owner).toEqual({type:'pawn',pawnId:cook.id});
  expect(applyCommand(w,{type:'bill-update',structureId:stove.id,billId:stove.bills![0]!.id,settings:{...stove.bills![0]!,target:1}})).toMatchObject({ok:true});
  expect(applyCommand(w,{type:'order-cook',pawnId:cook.id,structureId:stove.id,queue:true})).toMatchObject({ok:true});
  expect(cook.orders.queue).toHaveLength(1);expect(isCookingOrder(cook.orders.queue[0]!)).toBe(true);
  const reservedPotatoes=w.piles.filter(p=>p.item==='potato').map(p=>({id:p.id,quantity:p.quantity,owner:{...p.owner}}));
  const beforeCut=deserializeWorld(serializeWorld(w));
  for(let i=0;i<100&&w.structures.some(s=>s.id===generator.id);i++){stepWorld(w);stepWorld(beforeCut);expect(beforeCut).toEqual(w);}
  expect(w.structures.some(s=>s.id===generator.id)).toBe(false);
  expect(stove.power).toEqual({on:false,parentId:null});
  expect(validateWorld(w)).toEqual([]);
  expect(cook.orders.queue).toEqual([]);expect(cook.haul?.carryPileId).toBe(carried.id);
  expect(w.piles.find(p=>p.id===carried.id)).toMatchObject({item:'wood',quantity:5,owner:{type:'pawn',pawnId:cook.id}});
  expect(w.piles.filter(p=>p.item==='potato').map(p=>({id:p.id,quantity:p.quantity,owner:{...p.owner}}))).toEqual(reservedPotatoes);
  expect(quantity(w,'simple-meal')).toBe(1);expect(stove.bills![0]!.target).toBe(1);
  const outage=deserializeWorld(serializeWorld(w));stepWorld(w,100);stepWorld(outage,100);expect(outage).toEqual(w);expect(validateWorld(w)).toEqual([]);
  expect(quantity(w,'potato')).toBe(10);expect(quantity(w,'simple-meal')).toBe(1);
});
