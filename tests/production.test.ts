import { withoutV37LightWork } from './scenarios/legacy-light-work';
import { withoutPostV10Fields } from './scenarios/legacy-save';
import { expect, test } from 'vitest';
import { applyCommand, createWorld, deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index';
import { addGroundMaterial, refreshStock } from '../src/sim/materials';
import { CAMPFIRE_CAPACITY } from '../src/sim/fuel';
import { countedMeals } from '../src/sim/cooking-bills';
import { foodScore } from '../src/sim/food-selection';
import { queryPawnStatus } from '../src/sim/diagnostics';
import { queryCookingBillStatus } from '../src/sim/cooking-diagnostics';
import type { BillSettings } from '../src/sim/cooking-types';
import { woodAccount } from './scenarios/colony-player';
import type { World } from '../src/sim/types';
import { initialRecreation } from '../src/sim/recreation-rules';

function camp():World {
  const w=createWorld(42,16,16);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];
  w.pawns.forEach((p,i)=>Object.assign(p,{x:2+i*2,z:2,hunger:100,rest:100,priorities:{craft:2,mine:2,gather:0,build:1,haul:1,grow:0, cook: 0 }}));
  addGroundMaterial(w,'wood',50,{x:2,z:4},'wood');addGroundMaterial(w,'food',40,{x:3,z:6},'survival-meal');refreshStock(w);
  return w;
}
function until(w:World,predicate:()=>boolean,max=1000):void {
  for(let i=0;i<max&&!predicate();i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(predicate(),`condition at tick ${w.tick}`).toBe(true);
}

test('feu construit, deux jours de combustion, ravitaillement concurrent et interruption conservent le bois',()=>{
  const w=camp(),initial=woodAccount(w);
  const v9=JSON.parse(serializeWorld(w));v9.schemaVersion=9;for(const a of v9.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete v9.deconstructed;delete v9.packed;withoutPostV10Fields(v9);
  for(const pawn of v9.pawns){delete pawn.cooking;delete pawn.priorities.cook;}
  const migrated=deserializeWorld(JSON.stringify(v9));
  expect(migrated.pawns.every(p=>p.cooking===null&&p.priorities.cook===2)).toBe(true);
  migrated.pawns.forEach(p=>p.priorities.cook=0);
  const historicalExpected=structuredClone(w);historicalExpected.restRules='legacy';historicalExpected.pawns.forEach(p=>{p.schedule.fill('anything');p.recreation=initialRecreation();});expect(migrated).toEqual(historicalExpected);
  expect(applyCommand(w,{type:'designate',kind:'campfire',x:8,z:8}).ok).toBe(true);
  until(w,()=>w.structures.some(s=>s.kind==='campfire'));
  const fire=w.structures.find(s=>s.kind==='campfire')!;
  expect(fire.fuel).toEqual({ticks:CAMPFIRE_CAPACITY,burned:0,autoRefuel:true});
  expect(woodAccount(w)).toBe(initial);
  expect(applyCommand(w,{type:'refuel-policy',structureId:fire.id,enabled:false}).ok).toBe(true);
  stepWorld(w,12000);expect(fire.fuel?.ticks).toBe(0);expect(fire.fuel?.burned).toBe(12000);expect(woodAccount(w)).toBe(initial);
  expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'refuel-policy',structureId:fire.id,enabled:true}).ok).toBe(true);
  until(w,()=>w.pawns.some(p=>p.haul?.destination.type==='fuel'&&p.haul.phase==='deliver'),2000);
  const restored=deserializeWorld(serializeWorld(w));stepWorld(restored,150);const control=structuredClone(w);stepWorld(control,150);
  expect(restored).toEqual(control);expect(validateWorld(restored)).toEqual([]);
  const interrupted=structuredClone(w);
  expect(applyCommand(interrupted,{type:'refuel-policy',structureId:fire.id,enabled:false}).ok).toBe(true);
  expect(interrupted.pawns.every(p=>p.haul?.destination.type!=='fuel')).toBe(true);
  expect(woodAccount(interrupted)).toBe(initial);expect(validateWorld(interrupted)).toEqual([]);
  until(w,()=>fire.fuel!.ticks>5000);expect(woodAccount(w)).toBe(initial);
  const bad=JSON.parse(serializeWorld(w));bad.structures[0].fuel.ticks=CAMPFIRE_CAPACITY+1;
  expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  const historical=JSON.parse(serializeWorld(w));historical.schemaVersion=9;for(const a of historical.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete historical.deconstructed;delete historical.packed;
  expect(()=>deserializeWorld(JSON.stringify(historical))).toThrow();
  const before=serializeWorld(w);
  expect(applyCommand(w,{type:'refuel-policy',structureId:-1,enabled:false}).ok).toBe(false);
  expect(serializeWorld(w)).toBe(before);
});

function kitchen() {
  const w=camp();
  expect(applyCommand(w,{type:'designate',kind:'campfire',x:8,z:8}).ok).toBe(true);
  until(w,()=>w.structures.some(s=>s.kind==='campfire'));
  for(const p of w.pawns)for(const work of ['gather','build','haul','grow','cook'] as const)expect(applyCommand(w,{type:'priority',pawnId:p.id,work,value:0}).ok).toBe(true);
  const fire=w.structures.find(s=>s.kind==='campfire')!;
  expect(applyCommand(w,{type:'bill-add',structureId:fire.id}).ok).toBe(true);
  const bill=fire.bills![0]!;
  const update=(settings:Partial<BillSettings>)=>applyCommand(w,{type:'bill-update',structureId:fire.id,billId:bill.id,settings:{...bill,filters:{...bill.filters},...settings}});
  return {w,fire,bill,update,pawn:w.pawns[0]!};
}
const raw=(w:World)=>w.piles.filter(p=>p.item==='rice'||p.item==='berries').reduce((n,p)=>n+p.quantity,0);
const meals=(w:World)=>w.piles.filter(p=>p.item==='simple-meal').reduce((n,p)=>n+p.quantity,0);

test('cuisine physique : mélange, interruption, sauvegarde du travail, deux repas et arrêt de facture',()=>{
  const {w,fire,bill,update,pawn}=kitchen();
  expect(queryCookingBillStatus(w,fire,bill).code).toBe('waiting-worker');
  addGroundMaterial(w,'food',7,{x:12,z:8},'berries');addGroundMaterial(w,'food',33,{x:12,z:10},'rice');refreshStock(w);
  expect(applyCommand(w,{type:'stockpile',x:6,z:5,enabled:true,filters:{wood:false,food:true}}).ok).toBe(true);
  expect(update({mode:'times',target:2,radius:1}).ok).toBe(true);
  expect(applyCommand(w,{type:'priority',pawnId:pawn.id,work:'cook',value:1}).ok).toBe(true);
  stepWorld(w,40);expect(pawn.cooking).toBeNull();expect(raw(w)).toBe(40); // Ingredients outside the configured radius.
  const beforeQuery=serializeWorld(w);
  expect(queryCookingBillStatus(w,fire,bill)).toEqual({code:'missing-ingredients',reason:'Ingrédients insuffisants : 0/10 non réservés dans le rayon et les filtres.'});
  expect(serializeWorld(w)).toBe(beforeQuery);
  expect(update({radius:999}).ok).toBe(true);
  until(w,()=>!!pawn.cooking?.ingredients.some(i=>i.stage==='held'));
  expect(queryPawnStatus(w,pawn).code).toBe('gathering-ingredients');
  expect(raw(w)).toBe(40);expect(meals(w)).toBe(0); // Picking up is not consumption.
  const carry=serializeWorld(w),interrupted=deserializeWorld(carry);
  expect(applyCommand(interrupted,{type:'priority',pawnId:pawn.id,work:'cook',value:0}).ok).toBe(true);
  expect(interrupted.pawns[0]!.cooking).toBeNull();expect(raw(interrupted)).toBe(40);expect(validateWorld(interrupted)).toEqual([]);
  until(w,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>=84000);
  expect(pawn).toMatchObject({x:8,z:7,state:'working'});
  expect(queryPawnStatus(w,pawn).reason).toContain('28 %');
  const oldWork=JSON.parse(serializeWorld(w));oldWork.schemaVersion=35;withoutV37LightWork(oldWork);oldWork.pawns[0].cooking.progress=17;
  expect(deserializeWorld(JSON.stringify(oldWork)).pawns[0]!.cooking!.progress).toBe(85000);
  oldWork.pawns[0].cooking.progress=61;expect(()=>deserializeWorld(JSON.stringify(oldWork))).toThrow(/version 35/);
  expect(queryCookingBillStatus(w,fire,bill).code).toBe('cooking');
  expect(pawn.cooking!.ingredients.every(i=>i.stage==='placed')).toBe(true);expect(raw(w)).toBe(40);
  // A passer collapsing on the floor does not acquire the chef's workstation.
  // The chef keeps its exclusive bill/spot and real ingredients across save/load.
  const collapse=deserializeWorld(serializeWorld(w)),visitor=collapse.pawns[1]!;
  Object.assign(visitor,{x:8,z:7,rest:0,restZeroTicks:101,collapsePending:true,motion:undefined,moveCooldown:0});
  expect(validateWorld(collapse)).toEqual([]);stepWorld(collapse);
  expect(visitor).toMatchObject({state:'sleeping',need:{kind:'sleep',bedId:null}});
  expect(collapse.pawns[0]!.cooking!.progress-pawn.cooking!.progress).toBe(4000);expect(validateWorld(collapse)).toEqual([]);
  const collapseResume=deserializeWorld(serializeWorld(collapse));stepWorld(collapse,45);stepWorld(collapseResume,45);expect(collapseResume).toEqual(collapse);
  const stolen=structuredClone(w);stolen.pawns[1]!.cooking=structuredClone(pawn.cooking);stolen.pawns[1]!.priorities.cook=1;
  expect(()=>deserializeWorld(JSON.stringify(stolen))).toThrow(/duplicate|reservation|ownership/i);
  const canceled=deserializeWorld(serializeWorld(w));
  expect(applyCommand(canceled,{type:'bill-remove',structureId:fire.id,billId:bill.id}).ok).toBe(true);
  expect(canceled.pawns[0]!.cooking).toBeNull();expect(raw(canceled)).toBe(40);expect(meals(canceled)).toBe(0);expect(validateWorld(canceled)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(resumed,50);const control=structuredClone(w);stepWorld(control,50);
  expect(resumed).toEqual(control);expect(validateWorld(resumed)).toEqual([]);
  until(w,()=>bill.target===0&&!pawn.cooking);
  expect(raw(w)).toBe(20);expect(meals(w)).toBe(2);expect(countedMeals(w)).toBe(2);
  expect(queryCookingBillStatus(w,fire,bill).code).toBe('target-met');
  expect(w.events.filter(e=>e.message.includes('a cuisiné')).map(e=>e.message)).toEqual([
    `${pawn.name} a cuisiné 1 repas simple (7 baies, 3 riz).`,`${pawn.name} a cuisiné 1 repas simple (0 baies, 10 riz).`,
  ]);
  stepWorld(w,60);expect(raw(w)).toBe(20);expect(meals(w)).toBe(2);expect(pawn.cooking).toBeNull();
  expect(foodScore('simple-meal',0)).toBeGreaterThan(foodScore('berries',0));
  const bad=JSON.parse(serializeWorld(resumed));bad.pawns[0].cooking.productId=999999;
  expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  const before=serializeWorld(w);expect(update({target:-1}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
});

test('factures ordonnées et réservations : deux cuisiniers, une recette disponible, repli et ravitaillement sans transporteur',()=>{
  const {w,fire,bill,update,pawn}=kitchen();
  // Construct the second station through player commands before enabling cooks.
  const builder=w.pawns[2]!;
  expect(applyCommand(w,{type:'priority',pawnId:builder.id,work:'build',value:1}).ok).toBe(true);
  expect(applyCommand(w,{type:'priority',pawnId:builder.id,work:'haul',value:1}).ok).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'campfire',x:10,z:8}).ok).toBe(true);
  until(w,()=>w.structures.filter(s=>s.kind==='campfire').length===2);
  expect(applyCommand(w,{type:'priority',pawnId:builder.id,work:'haul',value:0}).ok).toBe(true);
  expect(applyCommand(w,{type:'priority',pawnId:builder.id,work:'build',value:0}).ok).toBe(true);
  addGroundMaterial(w,'food',6,{x:12,z:8},'berries');addGroundMaterial(w,'food',4,{x:12,z:10},'rice');refreshStock(w);
  const second=w.structures.find(s=>s.kind==='campfire'&&s.id!==fire.id)!;
  expect(update({filters:{rice:true,berries:false}}).ok).toBe(true); // First bill cannot gather ten rice.
  expect(applyCommand(w,{type:'bill-add',structureId:fire.id}).ok).toBe(true);
  const usable=fire.bills![1]!;
  expect(applyCommand(w,{type:'bill-update',structureId:fire.id,billId:usable.id,settings:{...usable,destination:'drop'}}).ok).toBe(true);
  expect(applyCommand(w,{type:'bill-add',structureId:second.id}).ok).toBe(true);
  for(const p of w.pawns.slice(0,2))expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'cook',value:1}).ok).toBe(true);
  until(w,()=>w.pawns.some(p=>p.cooking));
  expect(w.pawns.filter(p=>p.cooking)).toHaveLength(1);
  until(w,()=>meals(w)===1&&!w.pawns.some(p=>p.cooking));
  expect(raw(w)).toBe(0);expect(countedMeals(w)).toBe(0);expect(meals(w)).toBe(1);
  expect(bill.target).toBe(1); // Unusable first bill was skipped, not consumed.
  expect(usable.target+second.bills![0]!.target).toBe(1);
  const loose=w.piles.find(p=>p.item==='simple-meal')!;expect(loose.owner.type).toBe('ground');
  if(loose.owner.type==='ground')expect(applyCommand(w,{type:'stockpile',x:loose.owner.x,z:loose.owner.z,enabled:true,filters:{wood:false,food:true}}).ok).toBe(true);
  expect(countedMeals(w)).toBe(1);
  expect(update({mode:'until',target:1,filters:{rice:true,berries:true}}).ok).toBe(true);
  // Explicitly suspend the other bills; an already stocked target must not consume raw food.
  for(const s of [fire,second])for(const b of s.bills!)if(b.id!==bill.id)expect(applyCommand(w,{type:'bill-update',structureId:s.id,billId:b.id,settings:{...b,suspended:true}}).ok).toBe(true);
  addGroundMaterial(w,'food',10,{x:13,z:10},'rice');refreshStock(w);stepWorld(w,50);expect(raw(w)).toBe(10);
  // Empty fire with a valid recipe: a cook can perform the physical refuel job even with Haul disabled.
  fire.fuel!.burned+=fire.fuel!.ticks;fire.fuel!.ticks=0;w.tick=Math.max(w.tick,fire.fuel!.burned);
  expect(update({target:2}).ok).toBe(true);
  const disabled=structuredClone(w),disabledFire=disabled.structures.find(s=>s.id===fire.id)!;
  disabledFire.fuel!.autoRefuel=false;
  expect(queryCookingBillStatus(disabled,disabledFire,disabledFire.bills![0]!).code).toBe('refuel-disabled');
  until(w,()=>w.pawns.some(p=>p.haul?.destination.type==='fuel'&&p.haul.destination.forCooking));
  const carrier=w.pawns.find(p=>p.haul?.destination.type==='fuel')!;
  expect(carrier.priorities.haul).toBe(0);
  until(w,()=>!!carrier.haul?.serviceProgress);
  expect(queryPawnStatus(w,carrier).code).toBe('refueling');
  expect(queryPawnStatus(w,carrier).reason).toContain('Ravitaille le bâtiment');
  const restored=deserializeWorld(serializeWorld(w));const control=structuredClone(w);stepWorld(restored,100);stepWorld(control,100);expect(restored).toEqual(control);
  until(w,()=>meals(w)===2&&!w.pawns.some(p=>p.cooking),2500);
  expect(raw(w)).toBe(0);expect(fire.fuel!.ticks).toBeGreaterThan(0);expect(validateWorld(w)).toEqual([]);
  // Identity/order survive editing, malformed ids do not mutate the world.
  expect(applyCommand(w,{type:'bill-move',structureId:fire.id,billId:usable.id,direction:-1}).ok).toBe(true);
  expect(fire.bills![0]!.id).toBe(usable.id);
  const before=serializeWorld(w);expect(applyCommand(w,{type:'bill-move',structureId:fire.id,billId:usable.id,direction:-1}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  expect(pawn.priorities.cook).toBe(1);
});
