import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import { processCooking } from '../src/sim/cooking.ts';
import { newCookingBill } from '../src/sim/cooking-bills.ts';
import { queryCookingBillStatus } from '../src/sim/cooking-diagnostics.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { addGroundMaterial,refreshStock,reservedSource } from '../src/sim/materials.ts';
import { planCookingOrder } from '../src/sim/player-cooking.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { healthRandom } from '../src/sim/health.ts';
import { pawnBody } from '../src/sim/health-rules.ts';
import { productionResearchUnlocked,productionWorkerQualified } from '../src/sim/machining.ts';
import { PRODUCTION_WORK_SCALE,productionWorkTotal,productionStationUsable } from '../src/sim/production-recipes.ts';
import { SMELTING_WEAPONS,SMELTING_WORK_TICKS,smeltingIngredientAllowed,smeltingHitPointsPercent,smeltingProduct,smeltingSpeed,smeltingYield,validSmeltFilter,validSmeltingProduct } from '../src/sim/smelting-rules.ts';
import { finishSmelting } from '../src/sim/smelting.ts';
import type { WeaponItem,WeaponState } from '../src/sim/equipment-rules.ts';
import type { CookingOrder } from '../src/sim/order-types.ts';
import type { ProductionContext } from '../src/sim/production-output.ts';
import type { World,WorkType } from '../src/sim/types.ts';
import { biofuelCamp } from './helpers/biofuel-v283.ts';
import { controlledInjury } from './scenarios/health.ts';

function camp(item:WeaponItem='bolt-action-rifle',inputs=true){
  const {world:w,refineryId,startGeneratorId}=biofuelCamp(),p=w.pawns[0]!,station=w.structures.find(s=>s.id===refineryId)!;
  w.structures=w.structures.filter(s=>s.id===refineryId||s.id===startGeneratorId);
  station.kind='electric-smelter';station.power=newPowerState(station.kind);station.power.parentId=startGeneratorId;station.power.on=true;
  for(const pawn of w.pawns){for(const work of Object.keys(pawn.priorities) as WorkType[])pawn.priorities[work]=0;pawn.planCooldown=0;}
  p.priorities.craft=1;p.skills.crafting={level:0,xp:0,dailyXp:0,passion:0};
  const bill=newCookingBill(w.nextId++,'smelt-weapon');bill.filters[item]=true;bill.destination='drop';station.bills=[bill];
  if(inputs)addGroundMaterial(w,'weapon',1,{x:8,z:11},item);
  const weapon=w.piles.find(q=>q.item===item);refreshStock(w);
  return {w,p,station,bill,weapon};
}
function until(w:World,done:()=>boolean,max=800):void {
  for(let i=0;i<max&&!done();i++)stepWorld(w);
  expect(done(),`Smelting transition at ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);
}
function staged(item:WeaponItem='bolt-action-rifle'){
  const scene=camp(item),{w,p}=scene;
  expect(validateWorld(w)).toEqual([]);
  until(w,()=>!!p.cooking&&p.cooking.ingredients.every(i=>i.stage==='placed')&&p.x===p.cooking.spot.x&&p.z===p.cooking.spot.z&&(p.motion?.end??0)<=w.tick);
  return scene;
}
function context(w:World):ProductionContext {
  return {search:()=>null,move:()=>{throw Error('Already at work spot');},release:()=>releaseWork(w,w.pawns[0]!),event:()=>{},workRate:()=>1};
}

test('smelting is prospective craft work with no skill, and direct admission keeps Craft0 refusal',()=>{
  const {w,p,station}=camp();expect(productionResearchUnlocked(w,'smelt-weapon')).toBe(true);
  expect(productionResearchUnlocked({...w,schemaVersion:221 as World['schemaVersion']},'smelt-weapon')).toBe(false);
  expect(productionWorkerQualified(p,'smelt-weapon')).toBe(true);expect(smeltingSpeed(p)).toBe(1);
  p.skills.crafting!.level=20;expect(smeltingSpeed(p)).toBe(1);
  p.priorities.craft=0;expect(planCookingOrder(w,p,station.id).order).toBeUndefined();
  station.power!.on=false;expect(productionStationUsable(station)).toBe(false);
  p.priorities.craft=1;expect(queryCookingBillStatus(w,station,station.bills![0]!).code).toBe('no-power');
});

test('physical speed uses manipulation and sight once, without a skill multiplier',()=>{
  const {w,p}=camp();controlledInjury(w,p,'left-arm',2000);const c=pawnBody(p).capacities;
  expect(smeltingSpeed(p)).toBeCloseTo(Math.max(.1,c.manipulation*(.7+.3*Math.min(1,c.sight))));
  expect(smeltingSpeed(p)).toBeLessThan(1);
});

test('filters use rounded midpoint-to-even HP, ordered quality, and never inspect owner',()=>{
  const {bill,weapon}=camp('plasteel-knife');weapon!.weapon!.hitPoints=35;
  expect(smeltingHitPointsPercent(35,280)).toBe(12);expect(smeltingHitPointsPercent(105,280)).toBe(38);
  bill.smeltFilter={hpMin:12,hpMax:12,qualityMin:'normal',qualityMax:'normal'};
  for(const owner of [{type:'ground',x:8,z:11},{type:'pawn',pawnId:1},{type:'equipment',pawnId:1},{type:'inventory',pawnId:1}] as const)
    expect(smeltingIngredientAllowed(bill,{...weapon!,owner})).toBe(true);
  bill.smeltFilter.hpMin=13;bill.smeltFilter.hpMax=13;expect(smeltingIngredientAllowed(bill,weapon!)).toBe(false);
  bill.smeltFilter.hpMin=12;bill.smeltFilter.hpMax=12;weapon!.weapon!.quality='good';expect(smeltingIngredientAllowed(bill,weapon!)).toBe(false);
  expect(validSmeltFilter({...bill.smeltFilter,qualityMin:'excellent',qualityMax:'normal'})).toBe(false);
  expect(validSmeltFilter({...bill.smeltFilter,hpMin:-1})).toBe(false);
  expect(validSmeltFilter({...bill.smeltFilter,hpMin:12.5})).toBe(false);
  expect(validSmeltFilter(Object.create(bill.smeltFilter))).toBe(false);
  expect(smeltingIngredientAllowed(bill,{...weapon!,weapon:{...weapon!.weapon!,future:true} as WeaponState})).toBe(false);
});

test('defaults opt out of all four types; forbidden and foreign owned objects cannot be collected',()=>{
  const fresh=newCookingBill(1,'smelt-weapon');for(const item of SMELTING_WEAPONS)expect(fresh.filters[item]).toBe(false);
  for(const owner of ['equipment','inventory','pawn'] as const){const {w,p,station,weapon}=camp();weapon!.owner={type:owner,pawnId:p.id};expect(planCookingOrder(w,p,station.id).order).toBeUndefined();}
  const {w,p,station,weapon,bill}=camp();weapon!.weapon!.forbidden=true;
  expect(smeltingIngredientAllowed(bill,weapon!)).toBe(false);expect(planCookingOrder(w,p,station.id).order).toBeUndefined();
});

test('queued production and an equipment pickup share the indivisible source reservation',()=>{
  const {w,p,station,weapon}=camp(),other=w.pawns[1]!;other.priorities.craft=1;
  const proposal=planCookingOrder(w,p,station.id),order=proposal.order as CookingOrder;
  expect(proposal.label).toBe('Fondre une arme');expect(order.cooking.ingredients).toHaveLength(1);
  expect(order.cooking.ingredients[0]).toMatchObject({pileId:weapon!.id,quantity:1,stage:'source'});
  p.orders.queue.push(order);expect(reservedSource(w,weapon!.id)).toBe(1);expect(planCookingOrder(w,other,station.id).order).toBeUndefined();
  p.orders.queue=[];other.equipmentTask={itemId:weapon!.id,action:'equip',progress:0};
  expect(reservedSource(w,weapon!.id)).toBe(1);expect(planCookingOrder(w,p,station.id).order).toBeUndefined();
});

test.each(SMELTING_WEAPONS)('%s keeps identity through real movement, consumes once after160 neutral ticks and delivers the metal',item=>{
  const {w,p,station,bill,weapon}=staged(item),inputId=weapon!.id;
  expect(w.piles.find(q=>q.id===inputId)).toBe(weapon);expect(weapon!.owner.type).toBe('ground');expect(p.x).not.toBe(8);
  const skills=structuredClone(p.skills),rng=w.rng,projection={rng},expected=smeltingYield(item,()=>healthRandom(projection)),ctx=context(w);
  for(let i=0;i<SMELTING_WORK_TICKS-1;i++)processCooking(w,p,ctx);
  expect(p.cooking!.progress).toBe((SMELTING_WORK_TICKS-1)*PRODUCTION_WORK_SCALE);expect(p.cooking!.workTicks).toBeUndefined();
  expect(w.piles.some(q=>q.id===inputId)).toBe(true);expect(w.rng).toBe(rng);
  processCooking(w,p,ctx);const product=w.piles.find(q=>q.id===p.cooking!.productId)!;
  expect(product).toMatchObject({item:smeltingProduct(item),quantity:expected,owner:{type:'pawn',pawnId:p.id}});
  expect(product.id).not.toBe(inputId);expect(product.weapon).toBeUndefined();expect(product.apparel).toBeUndefined();
  expect(w.piles.some(q=>q.id===inputId)).toBe(false);expect(w.rng).toBe(projection.rng);expect(p.skills).toEqual(skills);expect(bill.target).toBe(0);
  expect(validateWorld(w)).toEqual([]);until(w,()=>p.cooking===null);
  expect(product.owner.type).toBe('ground');expect(w.piles.filter(q=>q.item===smeltingProduct(item)).reduce((sum,q)=>sum+q.quantity,0)).toBe(expected);
  expect(station.bills![0]!.target).toBe(0);
});

test('yield ignores quality/HP and draws once even for the exact fifteen-steel result',()=>{
  for(const [item,min,max] of [['revolver',7,8],['bolt-action-rifle',15,15],['emp-launcher',18,19],['plasteel-knife',7,8]] as const){
    let draws=0;expect(smeltingYield(item,()=>{draws++;return 0;})).toBe(max);expect(draws).toBe(1);
    expect(smeltingYield(item,()=>.999999)).toBe(min);
  }
  expect(validSmeltingProduct('steel',20)).toBe(false);expect(validSmeltingProduct('plasteel',9)).toBe(false);
});

test.each(['source-queued','source-active','placed'] as const)('forbidding a %s weapon while paused releases active or queued cooking without consuming it',stage=>{
  const scene=stage==='placed'?staged():camp(),{w,p,station,bill,weapon}=scene;
  if(stage==='source-queued'){
    const proposal=planCookingOrder(w,p,station.id);p.orders.queue.push(proposal.order as CookingOrder);
  }
  if(stage==='source-active')until(w,()=>p.cooking?.ingredients[0]?.stage==='source');
  const rng=w.rng,id=weapon!.id;
  expect(applyCommand(w,{type:'weapon-permission',itemId:id,allowed:false}).ok).toBe(true);
  expect(p.cooking).toBeNull();expect(p.orders.queue).toEqual([]);expect(w.piles.find(q=>q.id===id)).toBe(weapon);
  expect(weapon!.weapon!.forbidden).toBe(true);expect(bill.target).toBe(1);expect(w.rng).toBe(rng);expect(validateWorld(w)).toEqual([]);
});

test('a power cut during held transport keeps the original weapon and leaves RNG and bill untouched',()=>{
  const {w,p,station,bill,weapon}=camp(),rng=w.rng;
  until(w,()=>p.cooking?.ingredients[0]?.stage==='held'&&(p.motion?.end??0)<=w.tick);
  const id=weapon!.id;station.power!.on=false;processCooking(w,p,context(w));
  expect(p.cooking).toBeNull();expect(w.piles.find(q=>q.id===id)).toBe(weapon);expect(weapon!.owner.type).toBe('ground');
  expect(w.rng).toBe(rng);expect(bill.target).toBe(1);expect(weapon!.weapon).toBeDefined();
});

test('changing quality filters at staging releases work without consuming the weapon or RNG',()=>{
  const {w,p,station,bill,weapon}=staged();const rng=w.rng;
  const result=applyCommand(w,{type:'bill-update',structureId:station.id,billId:bill.id,settings:{mode:bill.mode,target:bill.target,suspended:bill.suspended,filters:{...bill.filters},radius:bill.radius,destination:bill.destination,smeltFilter:{hpMin:0,hpMax:100,qualityMin:'excellent',qualityMax:'legendary'}}});
  expect(result.ok).toBe(true);expect(p.cooking).toBeNull();expect(w.piles).toContain(weapon);expect(w.rng).toBe(rng);expect(bill.target).toBe(1);expect(validateWorld(w)).toEqual([]);
});

test('a blocked final transaction keeps progress, input, RNG and bill until a cargo slot is free',()=>{
  const {w,p,bill,weapon}=staged(),ctx=context(w);p.cooking!.phase='work';p.cooking!.progress=productionWorkTotal('smelt-weapon');
  const held={id:w.nextId++,item:'wood' as const,kind:'wood' as const,quantity:1,owner:{type:'pawn' as const,pawnId:p.id}};w.piles.push(held);refreshStock(w);
  const before=JSON.stringify(w);expect(finishSmelting(w,p,bill,ctx)).toBe(false);expect(JSON.stringify(w)).toBe(before);
  w.piles=w.piles.filter(q=>q!==held);refreshStock(w);expect(finishSmelting(w,p,bill,ctx)).toBe(true);expect(w.piles).not.toContain(weapon);
});

test('an exhausted identifier fails the final preflight without consuming anything',()=>{
  const {w,p,bill}=staged();p.cooking!.phase='work';p.cooking!.progress=productionWorkTotal('smelt-weapon');w.nextId=Number.MAX_SAFE_INTEGER;
  const before=JSON.stringify(w);expect(finishSmelting(w,p,bill,context(w))).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('a saturated floor retains the finished metal, then completes delivery when a real cell is freed',()=>{
  const {w,p,bill}=staged();p.cooking!.phase='work';p.cooking!.progress=productionWorkTotal('smelt-weapon');expect(finishSmelting(w,p,bill,context(w))).toBe(true);
  const product=w.piles.find(q=>q.id===p.cooking!.productId)!,rng=w.rng,sourceCount=w.piles.length;
  const blockers=[];
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(!w.piles.some(q=>q.owner.type==='ground'&&q.owner.x===x&&q.owner.z===z)){
    const pile={id:w.nextId++,item:'wood' as const,kind:'wood' as const,quantity:75,owner:{type:'ground' as const,x,z}};w.piles.push(pile);blockers.push(pile);
  }
  refreshStock(w);processCooking(w,p,context(w));expect(product.owner).toEqual({type:'pawn',pawnId:p.id});expect(p.cooking!.phase).toBe('output');expect(w.rng).toBe(rng);
  const free=blockers.find(q=>q.owner.x===p.x&&q.owner.z===p.z)!;w.piles=w.piles.filter(q=>q!==free);p.planCooldown=0;refreshStock(w);
  processCooking(w,p,context(w));expect(product.owner).toEqual({type:'ground',x:p.x,z:p.z});expect(p.cooking).toBeNull();expect(w.rng).toBe(rng);expect(w.piles.length).toBeGreaterThan(sourceCount);expect(bill.target).toBe(0);
});
