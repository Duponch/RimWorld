import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {billWanted,countedProducts} from '../src/sim/cooking-bills.ts';
import {processCooking} from '../src/sim/cooking.ts';
import {cookingSpeed} from '../src/sim/cooking-statistics.ts';
import {productionWorkerQualified} from '../src/sim/machining.ts';
import {addGroundMaterial,addMaterial,refreshStock} from '../src/sim/materials.ts';
import {groundCapacity,groundPile,nearbyGround} from '../src/sim/ground-placement.ts';
import {PRODUCTION_RECIPES,PRODUCTION_WORK_SCALE,stationAccepts,validSurvivalMealIngredients} from '../src/sim/production-recipes.ts';
import {PACKAGED_SURVIVAL_MEALS_RESEARCH_COST} from '../src/sim/research.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {ROT_DAYS,ticksUntilRot} from '../src/sim/food-preservation.ts';
import type {World} from '../src/sim/types.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './scenarios/food-workstations.ts';

const RECIPE='cook-survival-meal' as const;
const count=(w:World,item:string)=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);
function until(w:World,done:()=>boolean,max=2000):void {
  for(let i=0;i<max&&!done();i++)stepWorld(w);
  expect(done(),`Expected packaged survival transition by tick ${w.tick}`).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
function scene(unlocked=true):World {
  const w=foodWorkstationCamp(),p=w.pawns[0]!,stove=fixtureFoodStation(w,'fueled-stove');
  p.priorities.cook=1;stove.fuel!.ticks=12000;
  if(unlocked)w.research={project:null,points:0,packagedSurvivalMeals:{points:PACKAGED_SURVIVAL_MEALS_RESEARCH_COST,completedAt:0}};
  return w;
}
function addBill(w:World):void {
  expect(applyCommand(w,{type:'bill-add',structureId:w.structures[0]!.id,recipe:RECIPE})).toMatchObject({ok:true});
  w.structures[0]!.bills![0]!.destination='drop';
}
function ingredients(w:World,protein:'milk'|'hare-meat'='milk'):void {
  addGroundMaterial(w,'food',6,{x:6,z:6},protein);
  addGroundMaterial(w,'food',6,{x:7,z:6},'rice');refreshStock(w);
}

test('single survival recipe keeps two 6-unit quotas, Cuisine 8 and the researched stove boundary',()=>{
  expect(PRODUCTION_RECIPES[RECIPE]).toMatchObject({units:12,workTicks:45,outputUnits:1});
  expect(stationAccepts({kind:'fueled-stove'},RECIPE)).toBe(true);
  expect(stationAccepts({kind:'electric-stove'},RECIPE)).toBe(true);
  expect(stationAccepts({kind:'campfire'},RECIPE)).toBe(false);
  expect(validSurvivalMealIngredients([{item:'milk',quantity:3},{item:'hare-meat',quantity:3},{item:'rice',quantity:4},{item:'corn',quantity:2}])).toBe(true);
  for(const parts of [[{item:'rice',quantity:12}],[{item:'milk',quantity:12}],[{item:'milk',quantity:5},{item:'rice',quantity:7}],[{item:'milk',quantity:7},{item:'rice',quantity:5}]] as const)expect(validSurvivalMealIngredients(parts)).toBe(false);
  const locked=scene(false),before=serializeWorld(locked);
  expect(applyCommand(locked,{type:'bill-add',structureId:locked.structures[0]!.id,recipe:RECIPE}).ok).toBe(false);
  expect(serializeWorld(locked)).toBe(before);
  const w=scene(),p=w.pawns[0]!;addBill(w);ingredients(w);
  p.skills.cooking!.level=7;expect(productionWorkerQualified(p,RECIPE)).toBe(false);
  stepWorld(w,80);expect(p.cooking).toBeNull();expect(count(w,'survival-meal')).toBe(0);
  p.skills.cooking!.level=8;expect(productionWorkerQualified(p,RECIPE)).toBe(true);
  until(w,()=>p.cooking?.phase==='work');
  expect(validSurvivalMealIngredients(p.cooking!.ingredients)).toBe(true);
  const plants=scene();addBill(plants);addGroundMaterial(plants,'food',12,{x:6,z:6},'rice');refreshStock(plants);
  stepWorld(plants,120);expect(plants.pawns[0]!.cooking).toBeNull();expect(count(plants,'rice')).toBe(12);
});

test('real two-trip staging precedes exactly 45 neutral work ticks, one existing ration and actual ingestion',()=>{
  const w=scene(),p=w.pawns[0]!,stove=w.structures[0]!;addBill(w);ingredients(w);
  const heldIds=new Set<number>();
  for(let i=0;i<1500;i++){
    stepWorld(w);
    for(const entry of p.cooking?.ingredients??[])if(entry.stage==='held')heldIds.add(entry.pileId);
    if(p.cooking?.phase==='gather'&&p.cooking.ingredients.every(e=>e.stage==='placed')&&p.x===p.cooking.spot.x&&p.z===p.cooking.spot.z)break;
  }
  expect(heldIds.size).toBe(2);expect(p.cooking?.phase).toBe('gather');expect(p.cooking!.progress).toBe(0);
  expect(cookingSpeed(p)).toBe(1);expect(count(w,'milk')+count(w,'rice')).toBe(12);
  const context={search:()=>null,move:()=>{throw new Error('Neutral work must remain at the reached stove');},release:()=>releaseWork(w,p),event:()=>{},workRate:()=>1};
  const fuel=stove.fuel!.ticks;
  for(let i=0;i<44;i++)processCooking(w,p,context);
  expect(p.cooking!.progress).toBe(44*PRODUCTION_WORK_SCALE);expect(p.cooking!.workTicks).toBe(44);
  expect(count(w,'survival-meal')).toBe(0);expect(count(w,'milk')+count(w,'rice')).toBe(12);
  processCooking(w,p,context);
  refreshStock(w);
  expect(p.cooking!.phase).toBe('output');expect(count(w,'survival-meal')).toBe(1);
  expect(count(w,'milk')+count(w,'rice')).toBe(0);expect(stove.bills![0]!.target).toBe(0);expect(stove.fuel!.ticks).toBeLessThan(fuel);
  const ration=w.piles.find(pile=>pile.item==='survival-meal')!;
  expect(ration.owner).toEqual({type:'pawn',pawnId:p.id});expect(ration.rot).toBeUndefined();expect(ticksUntilRot(ration,w.tick)).toBe(Infinity);
  expect(validateWorld(w)).toEqual([]);
  until(w,()=>p.cooking===null);
  p.priorities.cook=0;p.hunger=20;p.needCooldown=0;
  until(w,()=>count(w,'survival-meal')===0&&p.hunger>80);
  expect(p.memories.some(m=>m.kind==='ate-fine-meal'||m.kind==='ate-lavish-meal')).toBe(false);
});

test('until-X counts only surviving rations admitted by stored product filters and current task cargo',()=>{
  const w=scene(),p=w.pawns[0]!;addBill(w);ingredients(w,'hare-meat');
  const bill=w.structures[0]!.bills![0]!;
  w.stockpiles.push({id:w.nextId++,x:14,z:10,filters:{wood:false,food:true},items:{'survival-meal':true},priority:2,capacity:10});
  w.stockpiles.push({id:w.nextId++,x:15,z:10,filters:{wood:false,food:true},items:{'survival-meal':false,'simple-meal':true},priority:2,capacity:10});
  addGroundMaterial(w,'food',1,{x:14,z:10},'survival-meal');
  addGroundMaterial(w,'food',1,{x:15,z:10},'survival-meal');
  addGroundMaterial(w,'food',1,{x:16,z:10},'survival-meal');refreshStock(w);
  bill.mode='until';bill.target=2;bill.destination='stockpile';expect(countedProducts(w,bill)).toBe(1);
  until(w,()=>p.cooking?.phase==='output');expect(countedProducts(w,bill)).toBe(2);expect(billWanted(w,bill)).toBe(false);
  until(w,()=>p.cooking===null);expect(countedProducts(w,bill)).toBe(2);expect(count(w,'survival-meal')).toBe(4);
  stepWorld(w,80);expect(count(w,'survival-meal')).toBe(4);
});

test('cancelling a held ingredient refuses atomically when full, then keeps materials and restarts work from zero',()=>{
  const w=scene(),p=w.pawns[0]!;addBill(w);ingredients(w);const stove=w.structures[0]!,bill=stove.bills![0]!;
  until(w,()=>p.cooking?.ingredients.some(i=>i.stage==='held')===true);
  const fillerIds=new Set<number>();
  for(const cell of nearbyGround(w,p))if(!groundPile(w,cell)){
    const entry=p.cooking!.ingredients.find(i=>i.stage!=='placed'&&i.cell.x===cell.x&&i.cell.z===cell.z);
    const item=entry?.item??'wood',quantity=groundCapacity(w,cell,item);
    if(quantity>0){addMaterial(w,item==='wood'?'wood':'food',quantity,{type:'ground',...cell},item);fillerIds.add(groundPile(w,cell)!.id);}
  }
  refreshStock(w);
  expect(validateWorld(w)).toEqual([]);
  const before=serializeWorld(w),settings={mode:bill.mode,target:bill.target,suspended:true,filters:{...bill.filters},radius:bill.radius,destination:bill.destination};
  expect(applyCommand(w,{type:'bill-update',structureId:stove.id,billId:bill.id,settings})).toMatchObject({ok:false,code:'occupied'});
  expect(serializeWorld(w)).toBe(before);
  w.piles=w.piles.filter(pile=>!fillerIds.has(pile.id));refreshStock(w);
  expect(applyCommand(w,{type:'bill-update',structureId:stove.id,billId:bill.id,settings}).ok).toBe(true);
  expect(p.cooking).toBeNull();expect(count(w,'milk')+count(w,'rice')).toBe(12);expect(count(w,'survival-meal')).toBe(0);
  expect(applyCommand(w,{type:'bill-update',structureId:stove.id,billId:bill.id,settings:{...settings,suspended:false}}).ok).toBe(true);
  until(w,()=>p.cooking?.phase==='work'&&p.cooking.progress>0);
  const performed=p.cooking!.progress;expect(performed).toBeGreaterThan(0);
  expect(applyCommand(w,{type:'bill-update',structureId:stove.id,billId:bill.id,settings}).ok).toBe(true);
  expect(p.cooking).toBeNull();expect(count(w,'milk')+count(w,'rice')).toBe(12);
  const resumed=deserializeWorld(serializeWorld(w));expect(resumed).toEqual(w);
  expect(applyCommand(w,{type:'bill-update',structureId:stove.id,billId:bill.id,settings:{...settings,suspended:false}}).ok).toBe(true);
  until(w,()=>p.cooking?.phase==='work');expect(p.cooking!.progress).toBeLessThanOrEqual(PRODUCTION_WORK_SCALE);
  until(w,()=>count(w,'survival-meal')===1&&p.cooking===null);expect(count(w,'milk')+count(w,'rice')).toBe(0);
});

test('expired raw inputs cannot manufacture a nonperishable ration',()=>{
  const w=scene();addBill(w);ingredients(w);const milk=w.piles.find(p=>p.item==='milk')!;
  milk.rot={progress:ROT_DAYS.milk*6000,atTick:w.tick};
  stepWorld(w,80);expect(count(w,'survival-meal')).toBe(0);expect(w.structures[0]!.bills![0]!.target).toBe(1);
});
