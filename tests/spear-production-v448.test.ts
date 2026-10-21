import {expect,test} from 'vitest';
import {writeTestFileSync} from './test-output.ts';
import {foodWorkstationCamp} from './scenarios/food-workstations.ts';
import {fixturePower} from './scenarios/power.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {newBuildingFuel,FUEL_UNIT_TICKS} from '../src/sim/fuel.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {researchCost} from '../src/sim/research.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import {productionResearchUnlocked,productionWorkerQualified} from '../src/sim/machining.ts';
import {stationAccepts} from '../src/sim/production-recipes.ts';
import {haulingWork} from '../src/sim/work-types.ts';
import {smithingMaterialFromIngredients267,smithingWorkTotal267} from '../src/sim/smithing-content-267.ts';
import {SPEAR_MATERIALS_272,spearBaseValue272,spearItem272,spearMaxHitPoints272,spearUnits272,spearWorkTotal272,type SpearMaterial272} from '../src/sim/spear-content-272.ts';
import type {Command,Structure,World} from '../src/sim/types.ts';

const command=(w:World,c:Command)=>{const result=applyCommand(w,c);expect(result,result.reason).toMatchObject({ok:true});};
const quantity=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
let failureOrdinal=0;
function until(w:World,done:()=>boolean,limit=20000):void {
 for(let i=0;i<limit&&!done();i++)stepWorld(w);
 const completed=done(),errors=validateWorld(w);
 if(!completed||errors.length){const prefix=`artifacts/spear-production-invalid-v448-${w.tick}-${++failureOrdinal}`;
  writeTestFileSync(`${prefix}.json`,JSON.stringify(w));writeTestFileSync(`${prefix}.meta.json`,JSON.stringify({completed,errors,tick:w.tick},null,2));}
 expect(completed,JSON.stringify({tick:w.tick,pawn:w.pawns[0]!.state,cooking:w.pawns[0]!.cooking,haul:w.pawns[0]!.haul,need:w.pawns[0]!.need})).toBe(true);
 expect(errors).toEqual([]);
}
function roundTrip(w:World):World {const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;}
/** Prepared single workshop, Craft4, Smithing and Long blades research, finite raw stock and
 * food; the generator has a declared finite reserve. No construction, mining,
 * research or fuel acquisition is claimed. All transport and work are real. */
function prepared(material:SpearMaterial272='steel',units=spearUnits272(material),kind:'electric-smithy'|'fueled-smithy'='electric-smithy'){
 const w=foodWorkstationCamp(),p=w.pawns[0]!;
 w.deterioration!.lastTick=w.tick;if(w.fires)w.fires.clockCore=w.tick*10;
 delete p.background;delete p.traits;p.recreation.level=100;p.priorities.craft=1;
 p.skills.crafting={level:4,xp:0,dailyXp:0,passion:0};
 w.research={project:null,points:0,smithing:{points:researchCost('smithing'),completedAt:1000},longBlades:{points:researchCost('long-blades'),completedAt:1001}};
 const s:Structure={id:w.nextId++,kind,x:10,z:7,orientation:0,footprint:'standard',material:'steel',bills:[],
  ...(kind==='fueled-smithy'?{fuel:newBuildingFuel(kind)}:{power:newPowerState(kind)})};
 w.structures.push(s);
 if(kind==='electric-smithy')fixturePower(w,'wood-generator',7,7);
 else addGroundMaterial(w,'wood',50,{x:17,z:8});
 addGroundMaterial(w,material,units,{x:16,z:7});addGroundMaterial(w,'food',12,{x:3,z:5},'survival-meal');refreshStock(w);
 command(w,{type:'stockpile',enabled:true,x:23,z:6,filters:{wood:false,food:false,weapon:true}});
 command(w,{type:'bill-add',structureId:s.id,recipe:'make-spear'});const b=s.bills![0]!;
 command(w,{type:'bill-update',structureId:s.id,billId:b.id,settings:{...b,filters:Object.fromEntries(SPEAR_MATERIALS_272.map(m=>[m,m===material]))}});
 return {w,p,s,b};
}

test.each(SPEAR_MATERIALS_272)('%s spear owns finite ingredients, physical work and its original identity through reload, storage and equip',material=>{
 const {w,p,s,b}=prepared(material),paidUnits=spearUnits272(material),item=spearItem272(material);
 expect(productionWorkerQualified(p,'make-spear')).toBe(true);expect(productionResearchUnlocked(w,'make-spear')).toBe(true);
 until(w,()=>!!p.cooking?.ingredients.some(i=>i.stage==='held'));
 const held=w.piles.find(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id)!;
 expect(held).toMatchObject({item:material,quantity:10});
 expect(Math.abs(p.x-p.cooking!.actionCell.x)+Math.abs(p.z-p.cooking!.actionCell.z)).toBeLessThanOrEqual(1);
 expect(p.moveCooldown).toBe(0);expect(p.motion?.end??0).toBeLessThanOrEqual(w.tick);
 const hauling=roundTrip(w);
 until(w,()=>w.piles.some(q=>q.item==='unfinished-spear'&&q.smithingWork!.progress>0));
 stepWorld(hauling,w.tick-hauling.tick);expect(serializeWorld(hauling)).toBe(serializeWorld(w));
 const work=w.piles.find(q=>q.item==='unfinished-spear')!,id=work.id,u=work.smithingWork!;
 expect(u).toMatchObject({recipe:'make-spear',material,authorId:p.id,billId:b.id});
 expect(u.parts.reduce((n,r)=>n+r.quantity,0)).toBe(paidUnits);expect(u.parts.every(r=>r.item===material)).toBe(true);
 expect(quantity(w,material)).toBe(0);expect(quantity(w,item)).toBe(0);expect(u.progress).toBeLessThan(spearWorkTotal272(material));
 expect(p.x).toBe(p.cooking!.spot.x);expect(p.z).toBe(p.cooking!.spot.z);
 if(material==='steel'){
  writeTestFileSync('tmp/spear-v448/spear-working-v448.json',serializeWorld(w));
  writeTestFileSync('tmp/spear-v448/spear-working-v448.meta.json',JSON.stringify({prepared:'Craft4, Forge research, electric smithy, finite generator reserve,75steel and twelve survival meals; real haul/work.',tick:w.tick,stationId:s.id,authorId:p.id,workpieceId:id,material,progress:u.progress,station:{x:s.x,z:s.z},worker:{x:p.x,z:p.z}},null,2));
 }
 command(w,{type:'priority',pawnId:p.id,work:'craft',value:0});const progress=u.progress;
 stepWorld(w,5);expect(u.progress).toBe(progress);
 const cancelled=roundTrip(w),cancelledReplay=roundTrip(w);
 for(const copy of [cancelled,cancelledReplay])command(copy,{type:'cancel-unfinished',itemId:id});
 expect(serializeWorld(cancelledReplay)).toBe(serializeWorld(cancelled));expect(quantity(cancelled,'unfinished-spear')).toBe(0);expect(quantity(cancelled,item)).toBe(0);
 const refund=quantity(cancelled,material);
 expect(refund).toBeGreaterThanOrEqual(u.parts.reduce((n,r)=>n+Math.floor(r.quantity*.75),0));
 expect(refund).toBeLessThanOrEqual(u.parts.reduce((n,r)=>n+Math.ceil(r.quantity*.75),0));
 expect(refund).toBeLessThan(paidUnits);roundTrip(cancelled);
 const replay=roundTrip(w);
 for(const copy of [w,replay])command(copy,{type:'priority',pawnId:p.id,work:'craft',value:1});
 if(material==='steel'){
  until(w,()=>!!w.piles.find(q=>q.id===id)?.smithingWork&&w.piles.find(q=>q.id===id)!.smithingWork!.progress>=spearWorkTotal272(material)*.95);
  stepWorld(replay,w.tick-replay.tick);expect(serializeWorld(replay)).toBe(serializeWorld(w));
  writeTestFileSync('tmp/spear-v448/ui-steel-near-final.json',serializeWorld(w));
  writeTestFileSync('tmp/spear-v448/ui-steel-near-final.meta.json',JSON.stringify({prepared:'Craft4, Forge and Long blades research, electric smithy, finite generator reserve,75steel and twelve survival meals. Progress acquired by real haul and work only.',tick:w.tick,stationId:s.id,authorId:p.id,workpieceId:id,material,progress:w.piles.find(q=>q.id===id)!.smithingWork!.progress,total:spearWorkTotal272(material)},null,2));
 }
 until(w,()=>p.cooking?.phase==='output');stepWorld(replay,w.tick-replay.tick);expect(serializeWorld(replay)).toBe(serializeWorld(w));
 const product=w.piles.find(q=>q.item===item)!,productId=product.id,quality=product.weapon!.quality;
 expect(product).toMatchObject({kind:'weapon',quantity:1,weapon:{hitPoints:spearMaxHitPoints272(item)}});expect(product.apparel).toBeUndefined();
 expect(w.piles.some(q=>q.id===id)).toBe(false);expect(quantity(w,item)).toBe(1);expect(quantity(w,material)).toBe(0);expect(b.target).toBe(0);
 expect(p.skills.crafting!.xp).toBeGreaterThan(0);
 const output=roundTrip(w);
 until(w,()=>p.cooking===null&&w.piles.find(q=>q.id===productId)?.owner.type==='ground');
 stepWorld(output,w.tick-output.tick);expect(serializeWorld(output)).toBe(serializeWorld(w));
 const dropped=w.piles.find(q=>q.id===productId)!;
 if(dropped.owner.type==='ground'&&(dropped.owner.x!==23||dropped.owner.z!==6)){
  // A real need may interrupt the output walk and leave the same weapon on
  // the ground. Let that service finish, then order an actual storage trip.
  until(w,()=>!p.need&&!p.interruptedCargo&&p.moveCooldown===0&&(p.motion?.end??0)<=w.tick);
  stepWorld(output,w.tick-output.tick);expect(serializeWorld(output)).toBe(serializeWorld(w));
  for(const state of [w,output]){command(state,{type:'priority',pawnId:p.id,work:'haul',value:1});command(state,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:productId},queue:false});}
  until(w,()=>{const q=w.piles.find(q=>q.id===productId);return p.haul===null&&q?.owner.type==='ground'&&q.owner.x===23&&q.owner.z===6;});
  stepWorld(output,w.tick-output.tick);expect(serializeWorld(output)).toBe(serializeWorld(w));
 }
 expect(w.piles.find(q=>q.id===productId)).toMatchObject({owner:{type:'ground',x:23,z:6},weapon:{quality,hitPoints:spearMaxHitPoints272(item)}});
 if(material==='steel'){
  writeTestFileSync('tmp/spear-v448/spear-final-v448.json',serializeWorld(w));
  writeTestFileSync('tmp/spear-v448/spear-final-v448.meta.json',JSON.stringify({tick:w.tick,stationId:s.id,authorId:p.id,productId,item,quality,stored:{x:23,z:6}},null,2));
 }
 command(w,{type:'order-equipment',pawnId:p.id,itemId:productId,action:'equip',queue:false});
 until(w,()=>w.piles.find(q=>q.id===productId)?.owner.type==='equipment');
 expect(w.piles.find(q=>q.id===productId)).toMatchObject({owner:{type:'equipment',pawnId:p.id},weapon:{quality,hitPoints:spearMaxHitPoints272(item)}});
 roundTrip(w);
});

test('the fueled smithy really refuels before making a wooden spear from its separate finite ingredient quota',()=>{
 const {w,p,s}=prepared('wood',75,'fueled-smithy');expect(s.fuel!.ticks).toBe(0);expect(quantity(w,'wood')).toBe(125);
 expect(p.priorities.craft).toBe(1);expect(p.priorities.cook).toBe(0);expect(p.priorities.haul).toBe(0);
 const explicit=roundTrip(w);command(explicit,{type:'order-cook',pawnId:p.id,structureId:s.id,queue:false});
 expect(explicit.pawns[0]!.priorityWork?.work).toBe('craft');expect(validateWorld(explicit)).toEqual([]);roundTrip(explicit);
 until(w,()=>!!p.haul&&p.haul.destination.type==='fuel'&&p.haul.phase==='deliver');
 expect(p.haul!.destination).toMatchObject({type:'fuel',structureId:s.id,forCrafting:true});
 expect('forCooking'in p.haul!.destination).toBe(false);expect(haulingWork(p.haul!.destination)).toBe('craft');
 expect(w.piles.some(q=>q.item==='wood'&&q.owner.type==='pawn'&&q.owner.pawnId===p.id)).toBe(true);
 const carrying=roundTrip(w);
 until(w,()=>w.piles.some(q=>q.item==='unfinished-spear'&&q.smithingWork!.progress>0));
 stepWorld(carrying,w.tick-carrying.tick);expect(serializeWorld(carrying)).toBe(serializeWorld(w));
 const u=w.piles.find(q=>q.smithingWork)!.smithingWork!;expect(u.material).toBe('wood');expect(u.parts.reduce((n,r)=>n+r.quantity,0)).toBe(75);
 expect(quantity(w,'wood')+75+(s.fuel!.ticks+s.fuel!.burned)/FUEL_UNIT_TICKS).toBe(125);roundTrip(w);
 const working=roundTrip(w),workId=w.piles.find(q=>q.item==='unfinished-spear')!.id;
 until(w,()=>p.cooking?.phase==='output');stepWorld(working,w.tick-working.tick);expect(serializeWorld(working)).toBe(serializeWorld(w));
 const product=w.piles.find(q=>q.item==='wood-spear')!;
 expect(product).toMatchObject({kind:'weapon',quantity:1,weapon:{hitPoints:65}});expect(product.apparel).toBeUndefined();
 expect(w.piles.some(q=>q.id===workId)).toBe(false);expect(quantity(w,'wood-spear')).toBe(1);
 expect(quantity(w,'wood')+75+(s.fuel!.ticks+s.fuel!.burned)/FUEL_UNIT_TICKS).toBe(125);
 expect(p.priorities.cook).toBe(0);expect(p.priorities.haul).toBe(0);roundTrip(w);
});

test('initial filters, homogeneous quotas, Long blades and Craft4 remain authoritative with atomic refusals',()=>{
 expect(newCookingBill(500,'make-spear').filters).toEqual({wood:false,steel:true,plasteel:true,uranium:true,silver:false,gold:false});
 expect(stationAccepts({kind:'crafting-spot'},'make-spear')).toBe(false);expect(stationAccepts({kind:'machining-table'},'make-spear')).toBe(false);
 for(const [material,units,total,value] of [['wood',75,8_400_000,120.24],['steel',75,12_000_000,185.7],['plasteel',75,26_400_000,770.04],['uranium',75,22_800_000,532.08],['silver',750,12_000_000,793.2],['gold',750,10_800_000,7538.88]] as const){
  expect(spearUnits272(material)).toBe(units);expect(smithingWorkTotal267('make-spear',material)).toBe(total);expect(spearBaseValue272(spearItem272(material))).toBeCloseTo(value,8);
  expect(smithingMaterialFromIngredients267('make-spear',[{item:material,quantity:units-1}])).toBeUndefined();
 }
 expect(smithingMaterialFromIngredients267('make-spear',[{item:'steel',quantity:74},{item:'wood',quantity:1}])).toBeUndefined();
 const {w,p,s,b}=prepared('steel',74);
 const noOrder=()=>{const before=serializeWorld(w);expect(planCookingOrder(w,p,s.id).order).toBeUndefined();expect(serializeWorld(w)).toBe(before);};
 noOrder();addGroundMaterial(w,'wood',1,{x:16,z:8});refreshStock(w);noOrder();
 addGroundMaterial(w,'steel',1,{x:16,z:7});refreshStock(w);
 p.skills.crafting!.level=3;expect(productionWorkerQualified(p,'make-spear')).toBe(false);noOrder();
 p.skills.crafting!.level=4;
 const locked=roundTrip(w);command(locked,{type:'bill-remove',structureId:s.id,billId:b.id});
 delete locked.research!.longBlades;expect(productionResearchUnlocked(locked,'make-spear')).toBe(false);
 const before=serializeWorld(locked);expect(applyCommand(locked,{type:'bill-add',structureId:s.id,recipe:'make-spear'}).ok).toBe(false);expect(serializeWorld(locked)).toBe(before);
 const raw=w.piles.find(q=>q.item==='steel')!;command(w,{type:'material-forbid',pileId:raw.id,forbidden:true});noOrder();
 command(w,{type:'material-forbid',pileId:raw.id,forbidden:false});
 command(w,{type:'bill-update',structureId:s.id,billId:b.id,settings:{...b,filters:{wood:false,steel:false,plasteel:false,uranium:false,silver:false,gold:false}}});noOrder();
 expect(quantity(w,'unfinished-spear')).toBe(0);expect(quantity(w,'steel-spear')).toBe(0);expect(quantity(w,'steel')).toBe(75);
});

test('forbidding a real working spear releases the service without spending progress or RNG; allowing it resumes the same acquired object',()=>{
 const {w,p,s}=prepared('steel');
 until(w,()=>w.piles.some(q=>q.item==='unfinished-spear'&&q.smithingWork!.progress>0));
 const work=w.piles.find(q=>q.item==='unfinished-spear')!,id=work.id,owner=structuredClone(work.owner),paid=work.smithingWork!.progress,receipt=structuredClone(work.smithingWork!.parts),rng=w.rng,nextId=w.nextId;
 expect(p.cooking?.ingredients[0]!.pileId).toBe(id);
 command(w,{type:'material-forbid',pileId:id,forbidden:true});
 expect(w.rng).toBe(rng);expect(work.smithingWork!.progress).toBe(paid);
 stepWorld(w);
 expect(p.cooking).toBeNull();expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
 expect(w.piles.find(q=>q.id===id)).toMatchObject({owner,forbidden:true,smithingWork:{progress:paid,parts:receipt}});
 expect(quantity(w,'steel')).toBe(0);expect(quantity(w,'steel-spear')).toBe(0);
 const copy=roundTrip(w),blocked=serializeWorld(w);
 expect(planCookingOrder(w,p,s.id).order).toBeUndefined();expect(serializeWorld(w)).toBe(blocked);
 for(let i=0;i<3;i++){stepWorld(w);stepWorld(copy);expect(serializeWorld(copy)).toBe(serializeWorld(w));}
 expect(w.piles.find(q=>q.id===id)!.smithingWork!.progress).toBe(paid);expect(p.cooking).toBeNull();
 for(const state of [w,copy])command(state,{type:'material-forbid',pileId:id,forbidden:false});
 until(w,()=>w.piles.find(q=>q.id===id)!.smithingWork!.progress>paid);
 stepWorld(copy,w.tick-copy.tick);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 expect(p.cooking?.ingredients[0]!.pileId).toBe(id);expect(w.piles.find(q=>q.id===id)!.owner).toEqual(owner);
 expect(w.piles.find(q=>q.id===id)!.smithingWork!.parts).toEqual(receipt);
 expect(w.piles.filter(q=>q.item==='unfinished-spear')).toHaveLength(1);expect(quantity(w,'steel')).toBe(0);expect(w.rng).toBe(rng);
 roundTrip(w);
});

test('forbidding truly deposited raw material before incorporation preserves its identity and quota until permission returns',()=>{
 const {w,p,s}=prepared('steel');
 // The helper prepares only finite stock/bench/research. Every pickup and
 // deposit up to this pre-work boundary was performed by the real service.
 until(w,()=>p.cooking?.phase==='gather'&&p.cooking.ingredients.length>0&&p.cooking.ingredients.every(i=>i.stage==='placed')&&p.x===p.cooking.spot.x&&p.z===p.cooking.spot.z);
 const ids=[...new Set(p.cooking!.ingredients.map(i=>i.pileId))],raw=w.piles.find(q=>q.id===ids[0])!;
 const records=ids.map(id=>structuredClone(w.piles.find(q=>q.id===id)!)),rng=w.rng,nextId=w.nextId;
 expect(records.reduce((n,q)=>n+q.quantity,0)).toBe(75);expect(quantity(w,'unfinished-spear')).toBe(0);
 command(w,{type:'material-forbid',pileId:raw.id,forbidden:true});stepWorld(w);
 expect(p.cooking).toBeNull();expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
 expect(quantity(w,'steel')).toBe(75);expect(quantity(w,'unfinished-spear')).toBe(0);expect(quantity(w,'steel-spear')).toBe(0);
 for(const before of records){const after=w.piles.find(q=>q.id===before.id)!;expect(after.owner).toEqual(before.owner);expect(after.quantity).toBe(before.quantity);}
 const copy=roundTrip(w),blocked=serializeWorld(w);
 expect(planCookingOrder(w,p,s.id).order).toBeUndefined();expect(serializeWorld(w)).toBe(blocked);
 for(let i=0;i<3;i++){stepWorld(w);stepWorld(copy);expect(serializeWorld(copy)).toBe(serializeWorld(w));}
 expect(p.cooking).toBeNull();expect(quantity(w,'steel')).toBe(75);expect(quantity(w,'unfinished-spear')).toBe(0);
 for(const state of [w,copy])command(state,{type:'material-forbid',pileId:raw.id,forbidden:false});
 until(w,()=>w.piles.some(q=>q.item==='unfinished-spear'&&q.smithingWork!.progress>0));
 stepWorld(copy,w.tick-copy.tick);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 const work=w.piles.find(q=>q.item==='unfinished-spear')!;
 expect(work.smithingWork).toMatchObject({authorId:p.id,material:'steel',recipe:'make-spear'});
 expect(work.smithingWork!.parts.reduce((n,q)=>n+q.quantity,0)).toBe(75);
 expect(ids.every(id=>!w.piles.some(q=>q.id===id))).toBe(true);expect(quantity(w,'steel')).toBe(0);expect(w.rng).toBe(rng);
 roundTrip(w);
});
