import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {APPAREL,newApparelState,type ApparelItem} from '../src/sim/apparel-rules.ts';
import {burnApparelIngredientAllowed,BURN_APPAREL_INPUTS,validBurnApparelIngredients} from '../src/sim/burn-apparel-rules.ts';
import {finishBurnApparel} from '../src/sim/burn-apparel.ts';
import {newCookingBill,validBillSettings} from '../src/sim/cooking-bills.ts';
import {planCookingOrder,queuedCookingReason} from '../src/sim/player-cooking.ts';
import {productionPriority} from '../src/sim/cooking-planner.ts';
import {queryCookingBillStatus} from '../src/sim/cooking-diagnostics.ts';
import {productionResearchUnlocked} from '../src/sim/machining.ts';
import {productionWorkTotal,recipeHasProducts,stationAccepts,taskWork} from '../src/sim/production-recipes.ts';
import {processCooking} from '../src/sim/cooking.ts';
import {planCommandDrops,releaseWork} from '../src/sim/work-release.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import type {CookingOrder} from '../src/sim/order-types.ts';
import type {ProductionContext} from '../src/sim/production-output.ts';
import type {MaterialPile,Pawn,World} from '../src/sim/types.ts';
import {burnApparelWorkshopV395} from './scenarios/burn-apparel-v395.ts';
function scene(){
 const f=burnApparelWorkshopV395(),w=f.world,p=w.pawns[0]!,station=w.structures.find(s=>s.id===f.stationId)!;
 expect(applyCommand(w,{type:'bill-add',structureId:station.id,recipe:'burn-apparel'}).ok).toBe(true);
 const bill=station.bills![0]!;bill.filters['cloth-shirt']=true;bill.smeltFilter!.hpMax=50;
 const garment=w.piles.find(s=>s.id===f.apparelId)!;
 return {...f,w,p,station,bill,garment};
}
function until(w:World,done:()=>boolean,max=500){for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done(),`Burn transition at ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);}
function staged(){const f=scene();until(f.w,()=>f.p.cooking?.ingredients[0]?.stage==='placed'&&f.p.x===f.p.cooking.spot.x&&f.p.z===f.p.cooking.spot.z&&(f.p.motion?.end??0)<=f.w.tick);return f;}
function ctx(w:World,p:Pawn,rate=1):ProductionContext{return {search:()=>null,move:()=>{throw Error('Already physically staged');},release:()=>releaseWork(w,p),event:()=>{},workRate:()=>rate};}

test('burn bills are prospective, explicit opt-in whole apparel destruction with Transport and no products',()=>{
 const {w,p,station}=scene(),blank=newCookingBill(w.nextId,'burn-apparel',251),current=newCookingBill(w.nextId,'burn-apparel');
 expect(Object.values(blank.filters).every(v=>v===false)).toBe(true);expect(blank.destination).toBe('drop');expect(validBillSettings(blank,'burn-apparel',251)).toBe(true);
 expect(Object.hasOwn(blank.filters,'wood-plate-armor')).toBe(false);expect(current.filters['wood-plate-armor']).toBe(false);
 expect(validBillSettings(current,'burn-apparel')).toBe(true);expect(validBillSettings(current,'burn-apparel',251)).toBe(false);
 expect(validBillSettings(blank,'burn-apparel',250)).toBe(false);expect(validBillSettings({...blank,mode:'until'},'burn-apparel')).toBe(false);
 expect(validBillSettings({...blank,destination:'stockpile'},'burn-apparel')).toBe(false);
 expect(productionResearchUnlocked(w,'burn-apparel')).toBe(true);expect(productionResearchUnlocked({...w,schemaVersion:250 as World['schemaVersion']},'burn-apparel')).toBe(false);
 expect(stationAccepts(station,'burn-apparel')).toBe(true);expect(stationAccepts({kind:'electric-crematorium'},'burn-apparel')).toBe(true);expect(stationAccepts({kind:'electric-stove'},'burn-apparel')).toBe(false);
 expect(recipeHasProducts('burn-apparel')).toBe(false);expect(productionWorkTotal('burn-apparel')).toBe(60000);
 expect(productionPriority(w,p)).toBe(1);const proposal=planCookingOrder(w,p,station.id);expect(proposal.label).toBe('Brûler des vêtements');expect(taskWork((proposal.order as CookingOrder).cooking)).toBe('haul');
 p.priorities.haul=0;p.priorities.cook=1;expect(planCookingOrder(w,p,station.id).order).toBeUndefined();expect(queryCookingBillStatus(w,station,station.bills![0]!).code).toBe('waiting-worker');
 p.priorities.haul=1;p.priorities.cook=0;station.fuel!.ticks=0;addMaterial(w,'wood',10,{type:'ground',x:5,z:11},'wood');
 const refuel=planCookingOrder(w,p,station.id).order;expect(refuel).toMatchObject({quantity:10,destination:{type:'fuel',structureId:station.id}});if(refuel&&'destination' in refuel&&refuel.destination.type==='fuel')expect(refuel.destination.forCooking).toBeUndefined();
});

test('definition and Stuff burnability, integer HP/quality and permission filters reject protected inputs',()=>{
 const {bill,garment}=scene();expect(BURN_APPAREL_INPUTS).not.toContain('flak-helmet');expect(BURN_APPAREL_INPUTS).not.toContain('plasteel-flak-helmet');
 for(const item of Object.keys(APPAREL) as ApparelItem[]){const pile:MaterialPile={id:1,item,kind:'apparel',quantity:1,owner:{type:'ground',x:1,z:1},apparel:newApparelState(item)};
 const stuff=APPAREL[item].stuff,burnable=stuff===undefined?item!=='flak-helmet'&&item!=='plasteel-flak-helmet':stuff==='wood';
 const b={...newCookingBill(2,'burn-apparel'),filters:{[item]:true}};expect(burnApparelIngredientAllowed(b,pile),item).toBe(burnable);}
 expect(burnApparelIngredientAllowed(bill,garment)).toBe(true);expect(validBurnApparelIngredients([{item:'cloth-shirt',quantity:2}])).toBe(false);expect(validBurnApparelIngredients([null])).toBe(false);
 garment.apparel!.quality='excellent';bill.smeltFilter!.qualityMax='good';expect(burnApparelIngredientAllowed(bill,garment)).toBe(false);
 garment.apparel!.quality='normal';garment.apparel!.hitPoints=51;expect(burnApparelIngredientAllowed(bill,garment)).toBe(false);
 garment.apparel!.hitPoints=35;garment.apparel!.forbidden=true;expect(burnApparelIngredientAllowed(bill,garment)).toBe(false);
});

test('only authorized ground originals are selected; carried, worn and forbidden pieces are not sources',()=>{
 const {w,p,station,garment}=scene();expect(validateWorld(w)).toEqual([]);
 garment.owner={type:'apparel',pawnId:p.id};expect(planCookingOrder(w,p,station.id).order).toBeUndefined();
 garment.owner={type:'pawn',pawnId:p.id};expect(planCookingOrder(w,p,station.id).order).toBeUndefined();
 garment.owner={type:'ground',x:5,z:5};garment.apparel!.forbidden=true;expect(planCookingOrder(w,p,station.id).order).toBeUndefined();
 expect(applyCommand(w,{type:'apparel-permission',itemId:garment.id,allowed:true}).ok).toBe(true);
 const order=(planCookingOrder(w,p,station.id).order as CookingOrder);p.orders.queue.push(order);expect(queuedCookingReason(w,order,p)).toBeUndefined();
 expect(applyCommand(w,{type:'apparel-permission',itemId:garment.id,allowed:false}).ok).toBe(true);expect(p.orders.queue).toEqual([]);expect(garment.apparel!.forbidden).toBe(true);
});

test('one original crosses a real saved cargo edge, stages at contact and burns with no output or skill/RNG credit',()=>{
 const {w,p,station,garment,bill,helmetId,protectedId}=scene(),metadata=structuredClone(garment.apparel),id=garment.id;
 expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:false}).ok).toBe(true);
 until(w,()=>p.cooking?.ingredients[0]?.stage==='held'&&(p.motion?.end??0)>w.tick);
 expect(garment.owner).toEqual({type:'pawn',pawnId:p.id});expect(garment.apparel).toEqual(metadata);
 const copy=deserializeWorld(serializeWorld(w)),cp=copy.pawns.find(q=>q.id===p.id)!;
 until(w,()=>p.cooking?.ingredients[0]?.stage==='placed'&&(p.motion?.end??0)<=w.tick&&p.x===p.cooking.spot.x&&p.z===p.cooking.spot.z);
 until(copy,()=>cp.cooking?.ingredients[0]?.stage==='placed'&&(cp.motion?.end??0)<=copy.tick&&cp.x===cp.cooking.spot.x&&cp.z===cp.cooking.spot.z);expect(copy).toEqual(w);
 expect(garment.id).toBe(id);expect(garment.apparel).toEqual(metadata);
 const rng=w.rng,next=w.nextId,skills=structuredClone(p.skills),fuel=structuredClone(station.fuel),count=w.piles.length;
 for(let i=0;i<11;i++)processCooking(w,p,ctx(w,p,.5));expect(w.piles).toContain(garment);expect(p.cooking!.progress).toBe(55000);
 processCooking(w,p,ctx(w,p,.5));expect(p.cooking).toBeNull();expect(bill.target).toBe(0);expect(w.piles.length).toBe(count-1);expect(w.destroyed?.items?.['cloth-shirt']).toBe(1);
 expect(w.piles.some(q=>q.id===helmetId)).toBe(true);expect(w.piles.find(q=>q.id===protectedId)!.apparel!.forbidden).toBe(true);
 expect(w.rng).toBe(rng);expect(w.nextId).toBe(next);expect(p.skills).toEqual(skills);expect(station.fuel).toEqual(fuel);expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('empty campfire and powerless crematorium cannot destroy, and withdrawal at work cancels without burning',()=>{
 const f=staged(),{w,p,station,garment,bill}=f;p.cooking!.phase='work';p.cooking!.progress=60000;
 station.fuel!.ticks=0;const empty=serializeWorld(w);expect(finishBurnApparel(w,p,bill,ctx(w,p))).toBe(false);expect(serializeWorld(w)).toBe(empty);
 station.kind='electric-crematorium';delete station.fuel;station.material='granite-blocks';station.power=newPowerState(station.kind);station.power.on=false;
 expect(finishBurnApparel(w,p,bill,ctx(w,p))).toBe(false);expect(w.piles).toContain(garment);
 station.kind='campfire';delete station.power;delete station.material;station.fuel={ticks:100,burned:0,autoRefuel:false};
 expect(applyCommand(w,{type:'apparel-permission',itemId:garment.id,allowed:false}).ok).toBe(true);expect(p.cooking).toBeNull();expect(w.piles).toContain(garment);expect(w.destroyed?.items?.['cloth-shirt']??0).toBe(0);
});

test('bill cancellation in flight retains cargo on its captured edge through exact reload and actual arrival',()=>{
 const {w,p,station,bill,garment}=scene();expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:false}).ok).toBe(true);
 until(w,()=>p.cooking?.ingredients[0]?.stage==='held'&&(p.motion?.end??0)>w.tick);const motion=structuredClone(p.motion),metadata=structuredClone(garment.apparel);
 const {id:_id,recipe:_recipe,...settings}=bill,command={type:'bill-update' as const,structureId:station.id,billId:bill.id,settings:{...settings,suspended:true}};
 const beforePreflight=serializeWorld(w);expect(planCommandDrops(w,command)).toEqual(new Map());expect(serializeWorld(w)).toBe(beforePreflight);
 expect(applyCommand(w,command).ok).toBe(true);
 expect(p.cooking).toBeNull();expect(p.interruptedCargo).toBe(true);expect(p.motion).toEqual(motion);expect(garment.owner).toEqual({type:'pawn',pawnId:p.id});expect(garment.apparel).toEqual(metadata);expect(validateWorld(w)).toEqual([]);
 const copy=deserializeWorld(serializeWorld(w)),cp=copy.pawns.find(q=>q.id===p.id)!;expect(copy).toEqual(w);
 until(w,()=>!p.interruptedCargo);until(copy,()=>!cp.interruptedCargo);expect(copy).toEqual(w);expect(w.piles.find(q=>q.id===garment.id)!.owner.type).toBe('ground');expect(w.destroyed?.items?.['cloth-shirt']??0).toBe(0);
});

test('final loss overflow refuses the whole commit without changing the input, bill, RNG or fuel',()=>{
 const {w,p,bill}=staged();p.cooking!.phase='work';p.cooking!.progress=60000;
 w.destroyed={...(w.destroyed??{count:0,lost:{}}),items:{'cloth-shirt':Number.MAX_SAFE_INTEGER}};const before=serializeWorld(w);
 expect(finishBurnApparel(w,p,bill,ctx(w,p))).toBe(false);expect(serializeWorld(w)).toBe(before);
});
