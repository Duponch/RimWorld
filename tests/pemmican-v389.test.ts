import {expect,test} from 'vitest';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {PEMMICAN_INPUTS,validPemmicanIngredients} from '../src/sim/pemmican-content.ts';
import {PRODUCTION_RECIPES,productionWorkTotal,stationAccepts} from '../src/sim/production-recipes.ts';
import {newCookingBill,validBillSettings} from '../src/sim/cooking-bills.ts';
import {processCooking} from '../src/sim/cooking.ts';
import {productionWorkerQualified} from '../src/sim/machining.ts';
import {pemmicanUnlocked,PEMMICAN_RESEARCH_COST,RESEARCH_SCALE} from '../src/sim/research.ts';
import {ITEM_DEFINITIONS,mealQuantity,rawFoodThought} from '../src/sim/items.ts';
import {foodScore} from '../src/sim/food-selection.ts';
import {INGEST_TICKS} from '../src/sim/eating.ts';
import {foodCanCarryPoison,rawFoodPoisonChance,foodPoisonFromRecipe,ingestionFoodPoison} from '../src/sim/food-poisoning.ts';
import {addMaterial,depositMaterialPart,transferPile} from '../src/sim/materials.ts';
import {ROT_DAYS,rotAge,ticksUntilRot} from '../src/sim/food-preservation.ts';
import {expireFood} from '../src/sim/food-expiration.ts';
import {commercialItemMassGrams} from '../src/sim/commercial-mass.ts';
import {tradeCatalogueEntry} from '../src/sim/trade-catalogue.ts';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {TICKS_PER_DAY,type Command,type World} from '../src/sim/types.ts';
import {pemmicanWorkshopV389} from './scenarios/pemmican-v389.ts';

const accept=(w:World,c:Command)=>expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});
const until=(w:World,done:()=>boolean,limit=1600)=>{for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),`tick ${w.tick}`).toBe(true);};
const amount=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
function start(){
  const f=pemmicanWorkshopV389(),w=f.world,p=w.pawns[0]!;
  accept(w,{type:'research-project',project:'pemmican'});until(w,()=>pemmicanUnlocked(w));
  accept(w,{type:'bill-add',structureId:f.stationId,recipe:'make-pemmican'});return {...f,p,bill:w.structures.find(s=>s.id===f.stationId)!.bills![0]!};
}

test('Core constants and grouping stay distinct from milk meals, one-unit packs and starting knowledge',()=>{
  const f=pemmicanWorkshopV389(),w=f.world,p=w.pawns[0]!,recipe=PRODUCTION_RECIPES['make-pemmican'];
  expect(recipe).toMatchObject({units:10,outputUnits:16,workTicks:70,work:'cook'});expect(PEMMICAN_RESEARCH_COST).toBe(500*RESEARCH_SCALE);
  expect(PEMMICAN_INPUTS).not.toContain('milk');expect(PEMMICAN_INPUTS).not.toContain('hay');
  expect(validPemmicanIngredients([{item:'deer-meat',quantity:5},{item:'rice',quantity:5}])).toBe(true);
  for(const parts of [[{item:'milk',quantity:5},{item:'rice',quantity:5}],[{item:'hare-meat',quantity:10}],[{item:'hare-meat',quantity:4},{item:'corn',quantity:6}]])expect(validPemmicanIngredients(parts)).toBe(false);
  for(const kind of ['campfire','fueled-stove','electric-stove'] as const)expect(stationAccepts({kind},'make-pemmican')).toBe(true);expect(stationAccepts({kind:'butcher-table'},'make-pemmican')).toBe(false);
  p.skills.cooking!.level=0;expect(productionWorkerQualified(p,'make-pemmican')).toBe(true);
  const before=JSON.stringify(w);expect(applyCommand(w,{type:'bill-add',structureId:f.stationId,recipe:'make-pemmican'}).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
  const bill=newCookingBill(w.nextId,'make-pemmican');expect(validBillSettings({...bill,filters:{...bill.filters,milk:true}},'make-pemmican')).toBe(false);
  expect(ITEM_DEFINITIONS.pemmican).toMatchObject({stackLimit:75,nutrition:5,maxIngest:75});expect(foodScore('pemmican',0)).toBe(6);expect(rawFoodThought('pemmican')).toBe(false);expect(INGEST_TICKS).toBe(50);
  expect(commercialItemMassGrams('pemmican')).toBe(18);expect(tradeCatalogueEntry('pemmican')!.baseMarketValue).toBe(1.4);
  expect(pemmicanUnlocked(createScenarioWorld(389,32,'crashlanded'))).toBe(false);
});

test('last research point, actual paid batch, storage and multi-unit ingestion keep exact identity/age/contamination on both reload boundaries',()=>{
  const f=start(),w=f.world,p=f.p;expect(w.research!.pemmican!.points).toBe(PEMMICAN_RESEARCH_COST);expect(w.research!.pemmican!.completedAt).toBeGreaterThan(3000);
  until(w,()=>p.cooking?.phase==='work'&&p.cooking.progress>0);expect(p.cooking!.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(10);
  const copy=deserializeWorld(serializeWorld(w)),at=w.tick;until(w,()=>!p.cooking&&amount(w,'pemmican')===16);stepWorld(copy,w.tick-at);expect(serializeWorld(copy)).toBe(serializeWorld(w));
  expect(amount(w,'hare-meat')).toBe(0);expect(amount(w,'rice')).toBe(0);expect(f.bill.target).toBe(0);
  const product=w.piles.find(v=>v.item==='pemmican')!;expect(product.owner).toEqual({type:'ground',...f.storage});expect(product.rot).toBeDefined();
  accept(w,{type:'order-consume',pawnId:p.id,pileId:product.id,queue:false});expect(p.need?.kind).toBe('eat');const quantity=p.need?.kind==='eat'?p.need.quantity:0;expect(quantity).toBeGreaterThan(1);expect(quantity).toBeLessThanOrEqual(16);
  until(w,()=>p.need?.kind==='eat'&&p.need.phase==='ingest'&&p.need.progress>0);expect(amount(w,'pemmican')).toBe(16);
  const carried=w.piles.find(v=>v.owner.type==='pawn'&&v.owner.pawnId===p.id)!;expect(carried.foodPoison).toEqual(product.foodPoison);
  const saved=deserializeWorld(serializeWorld(w)),startTick=w.tick;until(w,()=>!p.need);stepWorld(saved,w.tick-startTick);expect(serializeWorld(saved)).toBe(serializeWorld(w));
  expect(amount(w,'pemmican')).toBe(16-quantity);expect(p.hunger).toBeGreaterThan(80);expect(p.memories.some(m=>m.kind==='ate-raw-food')).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test('sixteen-unit output is physically split across two eight-slot reserves, with held remainder and exact replay',()=>{
  const f=start(),w=f.world,p=f.p,second={x:f.storage.x+1,z:f.storage.z};
  accept(w,{type:'stockpile',...f.storage,enabled:true,filters:{wood:false,food:true},capacity:8});
  accept(w,{type:'stockpile',...second,enabled:true,filters:{wood:false,food:true},capacity:8});
  until(w,()=>w.piles.some(v=>v.item==='pemmican'&&v.owner.type==='ground'&&v.quantity===8)&&p.cooking?.phase==='output');
  const held=w.piles.find(v=>v.item==='pemmican'&&v.owner.type==='pawn')!;expect(held.quantity).toBe(8);expect(amount(w,'pemmican')).toBe(16);
  const copy=deserializeWorld(serializeWorld(w)),at=w.tick;until(w,()=>!p.cooking);stepWorld(copy,w.tick-at);expect(serializeWorld(copy)).toBe(serializeWorld(w));
  expect(w.piles.filter(v=>v.item==='pemmican').map(v=>v.quantity).sort()).toEqual([8,8]);expect(w.piles.some(v=>v.id===held.id&&v.owner.type==='pawn')).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test('an unavailable output identity consumes no ingredients, gives no completion XP and draws no poison RNG before retry succeeds',()=>{
  const f=start(),w=f.world,p=f.p;until(w,()=>p.cooking?.phase==='work'&&p.cooking.progress>0);
  const next=w.nextId;w.nextId=Number.MAX_SAFE_INTEGER;
  const context={search:()=>null,move:()=>{throw Error('Worker already at contact');},release:()=>{throw Error('Valid active recipe');},event:()=>{},workRate:()=>1};
  while(p.cooking!.progress<productionWorkTotal('make-pemmican'))processCooking(w,p,context);
  const inputs=JSON.stringify(w.piles),rng=w.rng,skill=structuredClone(p.skills.cooking);
  processCooking(w,p,context);expect(JSON.stringify(w.piles)).toBe(inputs);expect(w.rng).toBe(rng);expect(p.skills.cooking).toEqual(skill);expect(amount(w,'pemmican')).toBe(0);
  w.nextId=next;processCooking(w,p,context);expect(amount(w,'pemmican')).toBe(16);expect(amount(w,'hare-meat')+amount(w,'rice')).toBe(0);expect(p.cooking!.phase).toBe('output');expect(f.bill.target).toBe(0);
});

test('one batch poison draw, split/fusion fractions and seventy-day thermal age use ordinary food contracts, with no intrinsic immunity',()=>{
  expect(foodCanCarryPoison('pemmican')).toBe(true);expect(rawFoodPoisonChance('pemmican')).toBe(0);
  let calls=0;const poison=foodPoisonFromRecipe(-5,0,()=>{calls++;return 0;});expect(calls).toBe(1);expect(poison).toEqual({fraction:1,cause:'filthy-kitchen'});
  const {world:w}=pemmicanWorkshopV389(),p=w.pawns[0]!,cell={x:p.x+1,z:p.z};w.piles=[];
  addMaterial(w,'food',16,{type:'pawn',pawnId:p.id},'pemmican');const source=w.piles.at(-1)!;source.foodPoison=poison;source.rot={progress:1000,atTick:w.tick};
  expect(depositMaterialPart(w,source,cell,4,p.id)).toBe(true);const split=w.piles.find(v=>v!==source)!;
  expect(source.quantity).toBe(12);expect(split.foodPoison).toEqual(poison);expect(split.foodPoison).not.toBe(source.foodPoison);expect(rotAge(split,w.tick)).toBe(1000);
  addMaterial(w,'food',4,{type:'ground',...cell},'pemmican');expect(split.quantity).toBe(8);expect(split.foodPoison!.fraction).toBe(.5);expect(rotAge(split,w.tick)).toBe(500);
  expect(transferPile(w,source,{type:'ground',...cell})).toBe(true);expect(split.quantity).toBe(20);expect(split.foodPoison!.fraction).toBe(.8);expect(rotAge(split,w.tick)).toBe(800);
  calls=0;expect(ingestionFoodPoison(split,true,1,()=>{calls++;return .5;})).toBe('filthy-kitchen');expect(calls).toBe(1);
  expect(ROT_DAYS.pemmican).toBe(70);expect(ticksUntilRot(split,w.tick)).toBe(70*TICKS_PER_DAY-800);split.rot={progress:0,atTick:w.tick,rate:0};expect(ticksUntilRot(split,w.tick+TICKS_PER_DAY)).toBe(Infinity);
  split.rot={progress:70*TICKS_PER_DAY-1,atTick:w.tick};w.tick++;expireFood(w);expect(w.piles.some(v=>v.item==='pemmican')).toBe(false);expect(w.spoiled.pemmican).toBe(20);
  expect(mealQuantity({...p,hunger:42.5}, {...split,quantity:75},75)).toBe(12);
});

test('expiring an uncarried ingredient cancels the batch while actual in-flight cargo retains its owner and finishes its edge before deposit',()=>{
  const f=start(),w=f.world,p=f.p;until(w,()=>!!p.motion&&p.motion.end>w.tick+1&&!!p.cooking?.ingredients.some(i=>i.stage==='held'));
  const held=w.piles.find(v=>v.owner.type==='pawn'&&v.owner.pawnId===p.id)!,other=p.cooking!.ingredients.find(i=>i.stage!=='held')!,expired=w.piles.find(v=>v.id===other.pileId)!,quantity=held.quantity,motion=structuredClone(p.motion);
  expired.rot={progress:ROT_DAYS[expired.item as keyof typeof ROT_DAYS]*TICKS_PER_DAY,atTick:w.tick};
  stepWorld(w); // The complete expiry boundary also refreshes the derived stock before checkpoints.
  expect(p.cooking).toBeNull();expect(p.interruptedCargo).toBe(true);expect(p.motion).toEqual(motion);expect(held.owner).toEqual({type:'pawn',pawnId:p.id});expect(held.quantity).toBe(quantity);expect(amount(w,'pemmican')).toBe(0);
  const copy=deserializeWorld(serializeWorld(w)),at=w.tick;until(w,()=>!p.interruptedCargo);stepWorld(copy,w.tick-at);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(w.tick).toBeGreaterThanOrEqual(motion!.end);expect(held.owner.type).toBe('ground');expect(held.quantity).toBe(quantity);expect(validateWorld(w)).toEqual([]);
});
