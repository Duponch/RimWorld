import {expect,test} from 'vitest';
import {writeTestFileSync} from './test-output.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {foodWorkstationCamp} from './scenarios/food-workstations.ts';
import {fixturePower} from './scenarios/power.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {newBuildingFuel,FUEL_UNIT_TICKS} from '../src/sim/fuel.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {researchCost} from '../src/sim/research.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {biofuelProductionSpeed,productionWorkerQualified} from '../src/sim/machining.ts';
import {PRODUCTION_WORK_SCALE} from '../src/sim/production-recipes.ts';
import {tailoringTemperatureFactor} from '../src/sim/crafting-quality.ts';
import {WorkEnvironmentCache} from '../src/sim/work-environment.ts';
import {reconcileTemperature,temperatureAt} from '../src/sim/temperature.ts';
import {controlledInjury} from './scenarios/health.ts';
import {smithingMaterialFromIngredients267,smithingUnits267,smithingWorkTotal267,smithingProduct267,type SmithingMaterial267} from '../src/sim/smithing-content-267.ts';
import {validSmithingWorkShape267} from '../src/sim/smithing-save-267.ts';
import type {Command,MaterialPile,Structure,World} from '../src/sim/types.ts';

const command=(w:World,c:Command)=>{const result=applyCommand(w,c);expect(result,result.reason).toMatchObject({ok:true});};
const units=(w:World,item:string)=>w.piles.filter(q=>q.item===item).reduce((n,q)=>n+q.quantity,0);
function until(w:World,done:()=>boolean,limit=12000):void {
 for(let i=0;i<limit&&!done();i++)stepWorld(w);
 expect(done(),JSON.stringify({tick:w.tick,pawn:w.pawns[0]!.state,task:w.pawns[0]!.cooking,need:w.pawns[0]!.need})).toBe(true);
 expect(validateWorld(w)).toEqual([]);
}
function roundTrip(w:World):World {const saved=serializeWorld(w),loaded=deserializeWorld(saved);expect(serializeWorld(loaded)).toBe(saved);return loaded;}
/** Prepared finite workshop (including its station), actor, research and food. Only production,
 * refuelling, carrying and output transitions below are claimed as played. */
function prepared(kind:'fueled-smithy'|'machining-table'):{w:World;s:Structure} {
 const w=foodWorkstationCamp(),p=w.pawns[0]!;
 w.deterioration!.lastTick=w.tick;if(w.fires)w.fires.clockCore=w.tick*10;
 delete p.background;delete p.traits;p.priorities.craft=1;p.recreation.level=100;
 p.skills.crafting={level:7,xp:0,dailyXp:0,passion:0};
 w.research={project:null,points:researchCost('complex-clothing'),completedAt:1000,
  smithing:{points:researchCost('smithing'),completedAt:1001},plateArmor:{points:researchCost('plate-armor'),completedAt:1002}};
 if(kind==='machining-table')w.research.machining={points:researchCost('machining'),completedAt:1003};
 const s:Structure={id:w.nextId++,kind,x:10,z:7,orientation:0,footprint:'standard',material:'steel',bills:[],
  ...(kind==='fueled-smithy'?{fuel:newBuildingFuel(kind)}:{power:newPowerState(kind)})};
 w.structures.push(s);if(kind==='machining-table')fixturePower(w,'wood-generator',7,7);
 addGroundMaterial(w,'food',5,{x:3,z:5},'survival-meal');
 command(w,{type:'stockpile',enabled:true,x:23,z:6,filters:{wood:false,food:false,apparel:true}});
 return {w,s};
}

test('finite wood is really hauled into a fueled smithy; the same plate work resumes, finishes once and reaches storage',()=>{
 const {w,s}=prepared('fueled-smithy'),p=w.pawns[0]!,initial=500;
 // Includes the finite fuel supply as well as170 ingredients; none is created
 // or restored during the run. Fuel starts empty and craft must transport it.
 addGroundMaterial(w,'wood',initial,{x:16,z:7});refreshStock(w);
 expect(s.fuel!.ticks).toBe(0);command(w,{type:'bill-add',structureId:s.id,recipe:'make-plate-armor'});
 const b=s.bills![0]!;command(w,{type:'bill-update',structureId:s.id,billId:b.id,settings:{...b,filters:{wood:true,steel:false,plasteel:false,uranium:false,silver:false,gold:false}}});
 until(w,()=>!!p.cooking?.ingredients.some(i=>i.stage==='held'));
 const held=w.piles.find(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id)!;
 expect(held).toMatchObject({item:'wood',quantity:10});expect(Math.abs(p.x-p.cooking!.actionCell.x)+Math.abs(p.z-p.cooking!.actionCell.z)).toBeLessThanOrEqual(1);
 expect(p.moveCooldown).toBe(0);expect(p.motion?.end??0).toBeLessThanOrEqual(w.tick);
 const carrying=roundTrip(w);
 until(w,()=>w.piles.some(q=>q.smithingWork?.progress&&q.smithingWork.recipe==='make-plate-armor'));
 stepWorld(carrying,w.tick-carrying.tick);expect(serializeWorld(carrying)).toBe(serializeWorld(w));
 const work=w.piles.find(q=>q.smithingWork)!,workId=work.id,u=work.smithingWork!;
 expect(u).toMatchObject({recipe:'make-plate-armor',material:'wood',authorId:p.id,billId:b.id});
 expect(u.parts.reduce((n,v)=>n+v.quantity,0)).toBe(170);expect(u.parts.every(v=>v.item==='wood')).toBe(true);
 expect(units(w,'wood')+170+(s.fuel!.ticks+s.fuel!.burned)/FUEL_UNIT_TICKS).toBe(initial);
 writeTestFileSync('tmp/forge-v443/ui-plate-working.json',serializeWorld(w));
 writeTestFileSync('tmp/forge-v443/ui-plate-working.meta.json',JSON.stringify({prepared:'Finite500wood, five survival meals, research and skilled worker; real refuelling, haul and work follow.',tick:w.tick,pawnId:p.id,stationId:s.id,workpieceId:workId,progress:u.progress,station:{x:s.x,z:s.z},worker:{x:p.x,z:p.z},storedOutput:{x:23,z:6}},null,2));
 const paid=u.progress;command(w,{type:'priority',pawnId:p.id,work:'craft',value:0});
 stepWorld(w,5);expect(w.piles.find(q=>q.id===workId)!.smithingWork!.progress).toBe(paid);
 const cancelled=roundTrip(w),cancelledReplay=roundTrip(w),beforeRefund=units(w,'wood');
 command(cancelled,{type:'cancel-unfinished',itemId:workId});command(cancelledReplay,{type:'cancel-unfinished',itemId:workId});
 expect(serializeWorld(cancelledReplay)).toBe(serializeWorld(cancelled));expect(validateWorld(cancelled)).toEqual([]);
 const refund=units(cancelled,'wood')-beforeRefund;
 expect(refund).toBeGreaterThanOrEqual(u.parts.reduce((n,v)=>n+Math.floor(v.quantity*.75),0));expect(refund).toBeLessThanOrEqual(u.parts.reduce((n,v)=>n+Math.ceil(v.quantity*.75),0));
 expect(cancelled.piles.some(q=>q.id===workId)).toBe(false);expect(units(cancelled,'wood-plate-armor')).toBe(0);
 const interrupted=roundTrip(w);
 command(w,{type:'priority',pawnId:p.id,work:'craft',value:1});command(interrupted,{type:'priority',pawnId:p.id,work:'craft',value:1});
 until(w,()=>p.cooking?.phase==='output'&&w.piles.some(q=>q.item==='wood-plate-armor'));
 stepWorld(interrupted,w.tick-interrupted.tick);expect(serializeWorld(interrupted)).toBe(serializeWorld(w));
 const product=w.piles.find(q=>q.item==='wood-plate-armor')!,productId=product.id,quality=product.apparel!.quality;
 expect(w.piles.some(q=>q.id===workId)).toBe(false);expect(b.target).toBe(0);expect(units(w,'wood-plate-armor')).toBe(1);
 expect(product.apparel!.hitPoints).toBe(188);expect(product.apparel!.material).toBeUndefined();
 expect(units(w,'wood')+170+(s.fuel!.ticks+s.fuel!.burned)/FUEL_UNIT_TICKS).toBe(initial);
 const output=roundTrip(w);
 until(w,()=>w.piles.find(q=>q.id===productId)?.owner.type==='ground'&&w.pawns[0]!.cooking===null);
 stepWorld(output,w.tick-output.tick);expect(serializeWorld(output)).toBe(serializeWorld(w));
 expect(w.piles.find(q=>q.id===productId)).toMatchObject({quantity:1,owner:{type:'ground',x:23,z:6},apparel:{quality}});
 roundTrip(w);
 writeTestFileSync('tmp/forge-v443/ui-plate-final.json',serializeWorld(w));
});

test('a novice really machines a400-silver helmet with homogeneous inputs, physical pickups and exact work/output reloads',()=>{
 const {w,s}=prepared('machining-table'),p=w.pawns[0]!;p.skills.crafting!.level=0;
 expect(productionWorkerQualified(p,'make-simple-helmet')).toBe(true);expect(productionWorkerQualified(p,'make-plate-armor')).toBe(false);
 addGroundMaterial(w,'silver',400,{x:16,z:7});refreshStock(w);
 command(w,{type:'bill-add',structureId:s.id,recipe:'make-simple-helmet'});const b=s.bills![0]!;
 expect(b.filters.silver).toBe(false);expect(b.filters.wood).toBeUndefined();
 command(w,{type:'bill-update',structureId:s.id,billId:b.id,settings:{...b,filters:{steel:false,plasteel:false,uranium:false,silver:true,gold:false}}});
 until(w,()=>w.piles.some(q=>q.smithingWork?.recipe==='make-simple-helmet'&&q.smithingWork.progress>0));
 const q=w.piles.find(q=>q.smithingWork)!,u=q.smithingWork!;
 expect(u.material).toBe('silver');expect(u.parts.reduce((n,p)=>n+p.quantity,0)).toBe(400);expect(units(w,'silver')).toBe(0);
 expect(p.x).toBe(10);expect(p.z).toBe(6);expect(u.progress).toBeLessThan(3_200_000);
 const replay=roundTrip(w);
 until(w,()=>p.cooking?.phase==='output');stepWorld(replay,w.tick-replay.tick);expect(serializeWorld(replay)).toBe(serializeWorld(w));
 const product=w.piles.find(q=>q.item==='silver-simple-helmet')!;expect(product.apparel!.hitPoints).toBe(70);expect(product.quantity).toBe(1);expect(product.apparel!.material).toBeUndefined();
 const savedQuality=product.apparel!.quality,checkpoint=roundTrip(w);
 until(w,()=>w.pawns[0]!.cooking===null&&w.piles.some(q=>q.id===product.id&&q.owner.type==='ground'));
 stepWorld(checkpoint,w.tick-checkpoint.tick);expect(serializeWorld(checkpoint)).toBe(serializeWorld(w));
 expect(w.piles.find(q=>q.id===product.id)).toMatchObject({quantity:1,owner:{type:'ground',x:23,z:6},apparel:{quality:savedQuality}});expect(units(w,'silver')).toBe(0);
});

test('material admission keeps exact precious-metal volume, rejects mixed parts and future work on266, and starts with conservative filters',()=>{
 const expected:[SmithingMaterial267,number,number][]=[['wood',170,26_600_000],['steel',170,38_000_000],['plasteel',170,83_600_000],['uranium',170,72_200_000],['silver',1700,38_000_000],['gold',1700,34_200_000]];
 for(const [material,quantity,total] of expected){
  expect(smithingUnits267('make-plate-armor',material)).toBe(quantity);expect(smithingWorkTotal267('make-plate-armor',material)).toBe(total);
  expect(smithingProduct267('make-plate-armor',material)).toBe(`${material}-plate-armor`);
  const parts:{item:SmithingMaterial267;quantity:number}[]=[];for(let left=quantity;left>0;){const n=Math.min(left,material==='silver'||material==='gold'?500:75);parts.push({item:material,quantity:n});left-=n;}
  const pile:MaterialPile={id:10,kind:'unfinished',item:'unfinished-plate-armor',quantity:1,owner:{type:'ground',x:1,z:1},smithingWork:{recipe:'make-plate-armor',material,authorId:1,progress:total,parts}};
  expect(validSmithingWorkShape267(pile as unknown as Record<string,unknown>,267)).toBe(true);expect(validSmithingWorkShape267(pile as unknown as Record<string,unknown>,266)).toBe(false);
  expect(validSmithingWorkShape267({...pile,flakWork:{}},267)).toBe(false);
 }
 expect(smithingMaterialFromIngredients267('make-plate-armor',[{item:'steel',quantity:169},{item:'wood',quantity:1}])).toBeUndefined();
 expect(smithingMaterialFromIngredients267('make-simple-helmet',[{item:'wood',quantity:40}])).toBeUndefined();
 expect(smithingMaterialFromIngredients267('make-simple-helmet',[{item:'gold',quantity:40}])).toBeUndefined();
 expect(smithingMaterialFromIngredients267('make-simple-helmet',[{item:'gold',quantity:400}])).toBe('gold');
 expect(newCookingBill(20,'make-plate-armor').filters).toEqual({wood:true,steel:true,plasteel:false,uranium:false,silver:false,gold:false});
});

test('real smithing service applies injured general labor once and the hot workshop temperature factor',()=>{
 const {w,s}=prepared('fueled-smithy'),p=w.pawns[0]!;
 addGroundMaterial(w,'wood',500,{x:16,z:7});refreshStock(w);
 command(w,{type:'bill-add',structureId:s.id,recipe:'make-plate-armor'});
 const b=s.bills![0]!;
 command(w,{type:'bill-update',structureId:s.id,billId:b.id,settings:{...b,filters:{wood:true,steel:false,plasteel:false,uranium:false,silver:false,gold:false}}});
 until(w,()=>w.piles.some(q=>q.smithingWork?.progress&&q.smithingWork.recipe==='make-plate-armor'));
 // Explicit prepared hot workshop and bruise after the real haul/work phase;
 // neither the acquired work nor its ingredient/fuel quantities are replaced.
 for(let z=4;z<=10;z++)for(let x=7;x<=13;x++)if(x===7||x===13||z===4||z===10)
  w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard',material:'wood'});
 w.roofing={constructed:[],build:[],remove:[],cursor:0};
 for(let z=5;z<=9;z++)for(let x=8;x<=12;x++)w.roofing.constructed.push(z*w.width+x);
 reconcileTemperature(w);
 const air=w.thermal!.regions.find(r=>r.cells.includes(s.z*w.width+s.x))!;expect(air).toBeDefined();air.temperature=45;
 controlledInjury(w,p,'left-arm',2000);
 expect(biofuelProductionSpeed(p)).toBeLessThan(1);
 expect(validateWorld(w)).toEqual([]);
 const q=w.piles.find(q=>q.smithingWork)!,before=q.smithingWork!.progress;
 stepWorld(w);
 const temperature=tailoringTemperatureFactor(temperatureAt(w,s));expect(temperature).toBe(.7);
 const environment=new WorkEnvironmentCache().read(w).production(s,p).total;
 const expected=Math.round(environment*temperature*biofuelProductionSpeed(p)*PRODUCTION_WORK_SCALE);
 expect(expected).toBeGreaterThan(0);expect(q.smithingWork!.progress-before).toBe(expected);
 expect(p.cooking!.progress).toBe(q.smithingWork!.progress);expect(validateWorld(w)).toEqual([]);
 roundTrip(w);
});
