import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { processCooking } from '../src/sim/cooking.ts';
import { planCookingOrder,queuedCookingReason } from '../src/sim/player-cooking.ts';
import { queryCookingBillStatus } from '../src/sim/cooking-diagnostics.ts';
import { cookingSpot,newCookingBill } from '../src/sim/cooking-bills.ts';
import { productionWorkTotal,recipeHasProducts,stationWork,taskWork } from '../src/sim/production-recipes.ts';
import { cremationIngredientAllowed,CREMATION_WORK_TICKS } from '../src/sim/cremation-rules.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { reservedSource,refreshStock } from '../src/sim/materials.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { advanceCorpses,CORPSE_ROT_TICKS,CORPSE_DESSICATION_TICKS } from '../src/sim/corpses.ts';
import { createMedicalRecord,reconcileMedicalDeath } from '../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { reconcileAnimalHealth } from '../src/sim/wildlife-health.ts';
import { enableWildlife } from '../src/sim/wildlife.ts';
import { advanceHumanCorpses } from '../src/sim/human-corpses.ts';
import { initialGrave } from '../src/sim/burial.ts';
import { canStandAt } from '../src/sim/furniture-travel.ts';
import { allowedAreaAllows } from '../src/sim/allowed-area-state.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import { biofuelCamp } from './helpers/biofuel-v283.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import type { CookingOrder } from '../src/sim/order-types.ts';
import type { ProductionContext } from '../src/sim/production-output.ts';
import type { MaterialPile,Pawn,World,WorkType } from '../src/sim/types.ts';

/** Prepared references; actual collection, movement and production remain ordinary. */
function camp(human=false){
  const {world:w,refineryId,startGeneratorId}=biofuelCamp(),p=w.pawns[0]!,other=w.pawns[1]!,station=w.structures.find(s=>s.id===refineryId)!;
  w.structures=w.structures.filter(s=>s.id===refineryId||s.id===startGeneratorId);
  station.kind='electric-crematorium';station.material='granite-blocks';station.power=newPowerState(station.kind);station.power.parentId=startGeneratorId;station.power.on=true;
  for(const pawn of w.pawns){for(const work of Object.keys(pawn.priorities) as WorkType[])pawn.priorities[work]=0;pawn.planCooldown=0;}
  p.priorities.haul=1;p.skills.crafting={level:0,xp:0,dailyXp:0,passion:0};
  const bill=newCookingBill(w.nextId++,'cremate-corpse');station.bills=[bill];
  let corpse:MaterialPile;
  if(human){
    Object.assign(other,{x:8,z:11});other.health=createMedicalRecord(w.tick);other.health.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(other.health);reconcilePawnHealth(w,other);advanceHumanCorpses(w);
    corpse=w.piles.find(q=>q.humanCorpse?.pawnId===other.id)!;
  }else{
    delete w.wildlife;w.resources.push({id:w.nextId++,kind:'berries',x:8,z:11,amount:10,growth:1,growthTick:w.tick});enableWildlife(w,1);
    const animal=w.wildlife!.animals[0]!;Object.assign(animal,{x:8,z:11,path:[],motion:undefined});
    animal.health={...createMedicalRecord(w.tick),body:'hare',bloodLoss:BLOOD_UNIT,death:{tick:w.tick,cause:'blood-loss'}};
    reconcileAnimalHealth(w,animal);advanceCorpses(w);w.resources=[];corpse=w.piles.find(q=>q.corpse?.animalId===animal.id)!;bill.filters['hare-corpse']=true;
  }
  refreshStock(w);return {w,p,other,station,bill,corpse};
}
function until(w:World,done:()=>boolean,max=800){for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done(),`Cremation transition at ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);}
function roundTrip(w:World){expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));expect(copy).toEqual(w);const decoded=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));expect(decoded.status).toBe('applied');if(decoded.status==='applied')expect(decoded.world).toEqual(w);return copy;}
function context(w:World,p:Pawn):ProductionContext{return {search:()=>null,move:()=>{throw new Error('Expected a completed physical arrival.');},release:()=>releaseWork(w,p),event:()=>{},workRate:()=>1};}
function staged(){const scene=camp();until(scene.w,()=>scene.p.cooking?.ingredients[0]?.stage==='placed'&&scene.p.x===scene.p.cooking.spot.x&&scene.p.z===scene.p.cooking.spot.z&&(scene.p.motion?.end??0)<=scene.w.tick);expect(scene.p.cooking!.progress).toBe(0);return scene;}

test('cremation uses Transport with no minimum skill or product, and Transport0 refuses a direct order',()=>{
  const {w,p,station,bill}=camp();expect(stationWork(station)).toBe('haul');expect(recipeHasProducts(bill.recipe)).toBe(false);
  const proposal=planCookingOrder(w,p,station.id);expect(proposal.label).toBe('Incinérer une dépouille');expect(taskWork((proposal.order as CookingOrder).cooking)).toBe('haul');
  p.priorities.haul=0;p.priorities.craft=1;p.skills.crafting!.level=20;expect(planCookingOrder(w,p,station.id).order).toBeUndefined();
  p.priorities.haul=1;station.power!.on=false;expect(planCookingOrder(w,p,station.id).reason).toContain('250 W');expect(queryCookingBillStatus(w,station,bill).code).toBe('no-power');
});

test.each(['fresh','rotting','desiccated'] as const)('a %s animal body remains admissible to cremation in planning, queue and diagnostics',stage=>{
  const {w,p,station,bill,corpse}=camp();const age=stage==='fresh'?0:stage==='rotting'?CORPSE_ROT_TICKS:CORPSE_DESSICATION_TICKS;
  w.tick+=age;corpse.rot={progress:age,atTick:w.tick};
  const proposal=planCookingOrder(w,p,station.id),order=proposal.order as CookingOrder;expect(order.cooking.ingredients[0]).toMatchObject({pileId:corpse.id,quantity:1});
  expect(cremationIngredientAllowed(w,bill,corpse)).toBe(true);expect(queryCookingBillStatus(w,station,bill).code).toBe('waiting');
  p.orders.queue.push(order);expect(queuedCookingReason(w,order,p)).toBeUndefined();expect(reservedSource(w,corpse.id)).toBe(1);if(stage==='fresh')roundTrip(w);
  p.orders.queue=[];
  if(stage!=='fresh'){
    station.kind='butcher-table';delete station.power;station.material='wood';station.bills=[newCookingBill(w.nextId++,'butcher-creature')];p.priorities.cook=1;
    expect(planCookingOrder(w,p,station.id).order).toBeUndefined();expect(queryCookingBillStatus(w,station,station.bills[0]!).code).toBe('missing-ingredients');
  }
});

test('the same corpse moves held across a saved edge, is staged physically and disappears without any output',()=>{
  const {w,p,station,bill,corpse}=camp(),id=corpse.id,metadata=structuredClone(corpse.corpse);
  expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:false}).ok).toBe(true);
  until(w,()=>p.cooking?.ingredients[0]?.stage==='held'&&(p.motion?.end??0)>w.tick);
  expect(w.piles.find(q=>q.id===id)).toBe(corpse);expect(corpse.owner).toEqual({type:'pawn',pawnId:p.id});expect(corpse.corpse).toEqual(metadata);
  const copy=roundTrip(w),copiedPawn=copy.pawns.find(q=>q.id===p.id)!;
  until(w,()=>p.cooking?.ingredients[0]?.stage==='placed'&&p.x===p.cooking.spot.x&&p.z===p.cooking.spot.z&&(p.motion?.end??0)<=w.tick);
  until(copy,()=>copiedPawn.cooking?.ingredients[0]?.stage==='placed'&&copiedPawn.x===copiedPawn.cooking.spot.x&&copiedPawn.z===copiedPawn.cooking.spot.z&&(copiedPawn.motion?.end??0)<=copy.tick);
  expect(copy).toEqual(w);expect(corpse.owner.type).toBe('ground');expect(corpse.id).toBe(id);expect(corpse.corpse).toEqual(metadata);
  const rng=w.rng,nextId=w.nextId,skills=structuredClone(p.skills),count=w.piles.length,ctx=context(w,p);
  for(let n=0;n<CREMATION_WORK_TICKS-1;n++)processCooking(w,p,ctx);
  expect(w.piles).toContain(corpse);expect(p.cooking!.progress).toBe(productionWorkTotal(bill.recipe)-10000);
  processCooking(w,p,ctx);expect(p.cooking).toBeNull();expect(w.piles.some(q=>q.id===id)).toBe(false);expect(w.piles.length).toBe(count-1);
  expect(bill.target).toBe(0);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(p.skills).toEqual(skills);expect(w.destroyed?.items?.['hare-corpse']).toBe(1);roundTrip(w);
});

test('an unfinished arrival edge cannot place a held body or begin work on a staged body',()=>{
  const {w,p,corpse}=staged(),task=p.cooking!,head=cookingSpot(w.structures.find(s=>s.id===task.stationId)!);
  p.motion={from:{x:head.x-1,z:head.z},to:head,start:w.tick,end:w.tick+3,speedFactor:1,terrainDelay:0};p.moveCooldown=3;
  const rng=w.rng,owner=structuredClone(corpse.owner);processCooking(w,p,context(w,p));expect(task.progress).toBe(0);expect(corpse.owner).toEqual(owner);
  task.ingredients[0]!.stage='held';corpse.owner={type:'pawn',pawnId:p.id};processCooking(w,p,context(w,p));expect(task.ingredients[0]!.stage).toBe('held');expect(corpse.owner.type).toBe('pawn');expect(w.rng).toBe(rng);
  w.tick+=3;p.moveCooldown=0;processCooking(w,p,context(w,p));expect(task.ingredients[0]!.stage).toBe('placed');expect(corpse.owner.type).toBe('ground');expect(task.progress).toBe(0);
});

test('a burial intention by human identity blocks cremation even before its pile reference is populated',()=>{
  const {w,p,other,station,bill,corpse}=camp(true),helper={...structuredClone(p),id:w.nextId++,name:'Porteur témoin'};helper.priorities.haul=1;Object.assign(helper,{x:9,z:15});w.pawns.push(helper);
  const grave=fixtureBuilding(w,'grave',22,16);Object.assign(grave,{grave:initialGrave()});
  helper.burial={bodyPawnId:other.id,graveId:grave.id,phase:'pickup',progress:0};
  expect(reservedSource(w,corpse.id)).toBe(0);expect(planCookingOrder(w,p,station.id).order).toBeUndefined();expect(queryCookingBillStatus(w,station,bill).code).toBe('missing-ingredients');
  delete helper.burial;const order=planCookingOrder(w,p,station.id).order as CookingOrder;expect(order.cooking.ingredients[0]!.pileId).toBe(corpse.id);
  p.orders.queue.push(order);helper.burial={bodyPawnId:other.id,graveId:grave.id,phase:'pickup',progress:0};expect(queuedCookingReason(w,order,p)).toContain('inhumation');
});

test('a power loss after pickup releases the physical body without consuming it or decrementing the bill',()=>{
  const {w,p,station,bill,corpse}=camp();until(w,()=>p.cooking?.ingredients[0]?.stage==='held'&&(p.motion?.end??0)<=w.tick);
  const id=corpse.id,rng=w.rng,metadata=structuredClone(corpse.corpse);station.power!.on=false;processCooking(w,p,context(w,p));
  expect(p.cooking).toBeNull();expect(w.piles.find(q=>q.id===id)).toBe(corpse);expect(corpse.owner.type).toBe('ground');expect(corpse.corpse).toEqual(metadata);expect(w.rng).toBe(rng);expect(bill.target).toBe(1);
});

test('a paused filter edit releases a staged corpse, then permitted settings can reserve that same corpse again',()=>{
  const {w,p,station,bill,corpse}=staged(),rng=w.rng,id=corpse.id;
  const settings={mode:bill.mode,target:bill.target,suspended:false,filters:{...bill.filters},radius:bill.radius,destination:'drop' as const,cremationFilter:{...bill.cremationFilter!,fresh:false}};
  expect(applyCommand(w,{type:'bill-update',structureId:station.id,billId:bill.id,settings}).ok).toBe(true);
  expect(p.cooking).toBeNull();expect(w.piles.find(q=>q.id===id)).toBe(corpse);expect(corpse.owner.type).toBe('ground');expect(w.rng).toBe(rng);expect(bill.target).toBe(1);roundTrip(w);
  const current=station.bills![0]!;current.cremationFilter!.fresh=true;expect(planCookingOrder(w,p,station.id).order).toBeDefined();
});

test('a source outside the worker area is filtered before selection and a staged shrink consumes nothing',()=>{
  const {w,p,station,corpse}=camp(),areaId=w.nextId++,spot=cookingSpot(station);
  w.allowedAreas=[{id:areaId,label:'Atelier',color:0,cells:[station.z*w.width+station.x,spot.z*w.width+spot.x].sort((a,b)=>a-b)}];p.allowedAreaId=areaId;
  expect(planCookingOrder(w,p,station.id).order).toBeUndefined();expect(corpse.owner.type).toBe('ground');
  delete p.allowedAreaId;delete w.allowedAreas;until(w,()=>p.cooking?.ingredients[0]?.stage==='placed'&&(p.motion?.end??0)<=w.tick);
  const task=p.cooking!,id=corpse.id,rng=w.rng;w.allowedAreas=[{id:areaId,label:'Atelier',color:0,cells:[station.z*w.width+station.x,spot.z*w.width+spot.x].sort((a,b)=>a-b)}];p.allowedAreaId=areaId;
  const part=task.ingredients[0]!;expect(canStandAt(w,part.cell)).toBe(true);expect(allowedAreaAllows(w,p,part.cell)).toBe(false);
  const progress=task.progress,metadata=structuredClone(corpse.corpse);processCooking(w,p,context(w,p));
  expect(p.cooking).toBeNull();expect(task.progress).toBe(progress);expect(w.piles.find(q=>q.id===id)).toBe(corpse);expect(corpse.corpse).toEqual(metadata);expect(w.rng).toBe(rng);
});

test('a cremation queue cannot reserve the solid item surface as its staging cell',()=>{
  const {w,p,station}=camp(),proposal=planCookingOrder(w,p,station.id),order=proposal.order as CookingOrder;
  expect(canStandAt(w,order.cooking.ingredients[0]!.cell)).toBe(true);
  order.cooking.ingredients[0]!.cell={x:station.x,z:station.z};p.orders.queue.push(order);
  expect(queuedCookingReason(w,order,p)).toBe('Dépôt des ingrédients inaccessible.');
});
