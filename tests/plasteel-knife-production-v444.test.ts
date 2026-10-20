import {expect,test} from 'vitest';
import {writeTestFileSync} from './test-output.ts';
import {foodWorkstationCamp} from './scenarios/food-workstations.ts';
import {fixturePower} from './scenarios/power.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {newBuildingFuel,FUEL_UNIT_TICKS} from '../src/sim/fuel.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import {biofuelProductionSpeed,productionResearchUnlocked,productionWorkerQualified} from '../src/sim/machining.ts';
import {PRODUCTION_WORK_SCALE,stationAccepts} from '../src/sim/production-recipes.ts';
import {smithingMaterialFromIngredients267,smithingWorkTotal267} from '../src/sim/smithing-content-267.ts';
import {WorkEnvironmentCache} from '../src/sim/work-environment.ts';
import {tailoringTemperatureFactor} from '../src/sim/crafting-quality.ts';
import {temperatureAt} from '../src/sim/temperature.ts';
import type {Command,Structure,World} from '../src/sim/types.ts';

const command=(w:World,c:Command)=>{const result=applyCommand(w,c);expect(result,result.reason).toMatchObject({ok:true});};
const quantity=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
function until(w:World,done:()=>boolean,limit=6000):void {
 for(let i=0;i<limit&&!done();i++)stepWorld(w);
 expect(done(),JSON.stringify({tick:w.tick,pawn:w.pawns[0]!.state,cooking:w.pawns[0]!.cooking,haul:w.pawns[0]!.haul})).toBe(true);
 expect(validateWorld(w)).toEqual([]);
}
function roundTrip(w:World):World {const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;}
/** Declared finite raw stock, novice, food and optional installed station.
 * No research, acquisition, construction or fuel service is claimed prepared.
 * The real commands/steps below obtain every carry, work and output phase. */
function prepared(kind:'crafting-spot'|'fueled-smithy'|'electric-smithy'='crafting-spot',units=30){
 const w=foodWorkstationCamp(),p=w.pawns[0]!;
 w.deterioration!.lastTick=w.tick;if(w.fires)w.fires.clockCore=w.tick*10;
 delete p.background;delete p.traits;p.recreation.level=100;p.priorities.craft=1;
 p.skills.crafting={level:0,xp:0,dailyXp:0,passion:0};w.research={project:null,points:0};
 let s:Structure;
 if(kind==='crafting-spot'){
  command(w,{type:'designate',kind,x:10,z:7});s=w.structures.find(s=>s.kind===kind)!;
 }else{
  // Installed/recovered benches do not require their construction research.
  s={id:w.nextId++,kind,x:10,z:7,orientation:0,footprint:'standard',material:'steel',bills:[],
   ...(kind==='fueled-smithy'?{fuel:newBuildingFuel(kind)}:{power:newPowerState(kind)})};
  w.structures.push(s);
  if(kind==='fueled-smithy')addGroundMaterial(w,'wood',50,{x:17,z:8});
  else fixturePower(w,'wood-generator',7,7); // Explicit finite generator reserve.
 }
 addGroundMaterial(w,'plasteel',units,{x:16,z:7});addGroundMaterial(w,'food',5,{x:3,z:5},'survival-meal');refreshStock(w);
 command(w,{type:'stockpile',enabled:true,x:23,z:6,filters:{wood:false,food:false,weapon:true}});
 command(w,{type:'bill-add',structureId:s.id,recipe:'make-plasteel-knife'});
 return {w,p,s,b:s.bills![0]!};
}

test('a novice hauls finite plaststeel to a real crafting spot, earns an author-bound workpiece and resumes the same knife through storage and equip',()=>{
 const {w,p,s,b}=prepared();
 expect(w.research).toEqual({project:null,points:0});expect(productionResearchUnlocked(w,b.recipe)).toBe(true);
 expect(productionWorkerQualified(p,b.recipe)).toBe(true);expect(b.filters).toEqual({plasteel:true});
 until(w,()=>!!p.cooking?.ingredients.some(i=>i.stage==='held'));
 const carried=w.piles.find(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id)!;
 expect(carried).toMatchObject({item:'plasteel',quantity:10});
 expect(Math.abs(p.x-p.cooking!.actionCell.x)+Math.abs(p.z-p.cooking!.actionCell.z)).toBeLessThanOrEqual(1);
 expect(p.moveCooldown).toBe(0);expect(p.motion?.end??0).toBeLessThanOrEqual(w.tick);
 const hauling=roundTrip(w);
 until(w,()=>w.piles.some(q=>q.item==='unfinished-knife'&&q.smithingWork!.progress>0));
 stepWorld(hauling,w.tick-hauling.tick);expect(serializeWorld(hauling)).toBe(serializeWorld(w));
 const work=w.piles.find(q=>q.smithingWork)!,id=work.id,u=work.smithingWork!;
 expect(u).toMatchObject({recipe:'make-plasteel-knife',material:'plasteel',authorId:p.id,billId:b.id});
 expect(u.parts.reduce((n,r)=>n+r.quantity,0)).toBe(30);expect(u.parts.every(r=>r.item==='plasteel')).toBe(true);
 expect(quantity(w,'plasteel')).toBe(0);expect(quantity(w,'plasteel-knife')).toBe(0);
 expect(p.x).toBe(p.cooking!.spot.x);expect(p.z).toBe(p.cooking!.spot.z);
 const before=u.progress;stepWorld(w);
 const factors=new WorkEnvironmentCache().read(w).production(s,p);expect(factors.station).toBe(.5);
 expect(u.progress-before).toBe(Math.round(factors.total*tailoringTemperatureFactor(temperatureAt(w,s))*biofuelProductionSpeed(p)*PRODUCTION_WORK_SCALE));
 writeTestFileSync('artifacts/plasteel-knife-working-v444.json',serializeWorld(w));
 writeTestFileSync('artifacts/plasteel-knife-working-v444.meta.json',JSON.stringify({prepared:'Novice,30plasteel and five survival meals; real free spot, haul and work.',tick:w.tick,stationId:s.id,authorId:p.id,workpieceId:id,progress:u.progress,station:{x:s.x,z:s.z},worker:{x:p.x,z:p.z}},null,2));
 command(w,{type:'priority',pawnId:p.id,work:'craft',value:0});const paid=u.progress;
 stepWorld(w,5);expect(u.progress).toBe(paid);
 const cancelled=roundTrip(w),cancelledReplay=roundTrip(w);
 for(const copy of [cancelled,cancelledReplay])command(copy,{type:'cancel-unfinished',itemId:id});
 expect(serializeWorld(cancelledReplay)).toBe(serializeWorld(cancelled));
 expect([22,23]).toContain(quantity(cancelled,'plasteel'));expect(quantity(cancelled,'unfinished-knife')).toBe(0);expect(quantity(cancelled,'plasteel-knife')).toBe(0);
 const afterCancel=serializeWorld(cancelled);expect(applyCommand(cancelled,{type:'cancel-unfinished',itemId:id}).ok).toBe(false);expect(serializeWorld(cancelled)).toBe(afterCancel);
 const replay=roundTrip(w);
 for(const copy of [w,replay])command(copy,{type:'priority',pawnId:p.id,work:'craft',value:1});
 until(w,()=>p.cooking?.phase==='output');stepWorld(replay,w.tick-replay.tick);expect(serializeWorld(replay)).toBe(serializeWorld(w));
 const product=w.piles.find(q=>q.item==='plasteel-knife')!,productId=product.id,quality=product.weapon!.quality,rng=w.rng;
 expect(product).toMatchObject({kind:'weapon',quantity:1,weapon:{hitPoints:280}});expect(product.apparel).toBeUndefined();
 expect(w.piles.some(q=>q.id===id)).toBe(false);expect(b.target).toBe(0);expect(quantity(w,'plasteel')).toBe(0);
 expect(p.skills.crafting!.xp).toBeGreaterThan(0);
 const output=roundTrip(w);
 until(w,()=>p.cooking===null&&w.piles.find(q=>q.id===productId)?.owner.type==='ground');
 stepWorld(output,w.tick-output.tick);expect(serializeWorld(output)).toBe(serializeWorld(w));
 expect(w.piles.find(q=>q.id===productId)).toMatchObject({owner:{type:'ground',x:23,z:6},weapon:{quality,hitPoints:280}});
 expect(w.rng).toBe(rng);expect(quantity(w,'plasteel-knife')).toBe(1);
 writeTestFileSync('artifacts/plasteel-knife-final-v444.json',serializeWorld(w));
 writeTestFileSync('artifacts/plasteel-knife-final-v444.meta.json',JSON.stringify({tick:w.tick,stationId:s.id,authorId:p.id,productId,quality,stored:{x:23,z:6}},null,2));
 command(w,{type:'order-equipment',pawnId:p.id,itemId:productId,action:'equip',queue:false});
 until(w,()=>w.piles.find(q=>q.id===productId)?.owner.type==='equipment');
 expect(w.piles.find(q=>q.id===productId)).toMatchObject({owner:{type:'equipment',pawnId:p.id},weapon:{quality,hitPoints:280}});
 roundTrip(w);
});

test.each(['fueled-smithy','electric-smithy'] as const)('%s serves the new knife with the real finite fuel/power service and the normal work factor',kind=>{
 const {w,p,s}=prepared(kind);
 if(s.fuel)expect(s.fuel.ticks).toBe(0);
 until(w,()=>w.piles.some(q=>q.item==='unfinished-knife'&&q.smithingWork!.progress>0));
 const q=w.piles.find(q=>q.smithingWork)!,before=q.smithingWork!.progress,reserve=s.fuel?.ticks;
 expect(quantity(w,'plasteel')).toBe(0);expect(p.skills.crafting!.level).toBe(0);
 stepWorld(w);
 const factors=new WorkEnvironmentCache().read(w).production(s,p);expect(factors.station).toBe(1);
 expect(q.smithingWork!.progress-before).toBe(Math.round(factors.total*tailoringTemperatureFactor(temperatureAt(w,s))*biofuelProductionSpeed(p)*PRODUCTION_WORK_SCALE));
 if(s.fuel){expect(reserve!-s.fuel.ticks).toBe(8);expect(quantity(w,'wood')+(s.fuel.ticks+s.fuel.burned)/FUEL_UNIT_TICKS).toBe(50);}
 else expect(s.power!.on).toBe(true);
 expect(validateWorld(w)).toEqual([]);roundTrip(w);
});

test('short, forbidden, unreachable or explicitly excluded plaststeel never reserves a remote substitute; invalid material settings refuse atomically',()=>{
 const {w,p,s,b}=prepared('crafting-spot',29);
 const noOrder=()=>{const before=serializeWorld(w);expect(planCookingOrder(w,p,s.id).order).toBeUndefined();expect(serializeWorld(w)).toBe(before);};
 noOrder();expect(quantity(w,'plasteel')).toBe(29);
 addGroundMaterial(w,'plasteel',1,{x:16,z:7});refreshStock(w);const raw=w.piles.find(q=>q.item==='plasteel')!;
 command(w,{type:'material-forbid',pileId:raw.id,forbidden:true});noOrder();
 command(w,{type:'material-forbid',pileId:raw.id,forbidden:false});
 command(w,{type:'bill-update',structureId:s.id,billId:b.id,settings:{...b,filters:{plasteel:false}}});noOrder();
 const before=serializeWorld(w);expect(applyCommand(w,{type:'bill-update',structureId:s.id,billId:b.id,settings:{...b,filters:{plasteel:true,steel:true}}}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 command(w,{type:'bill-update',structureId:s.id,billId:b.id,settings:{...b,filters:{plasteel:true}}});
 // Prepared solid enclosure around the existing source; no quantity or owner
 // is moved and no reserved job is manufactured to hide the lost route.
 for(let z=6;z<=8;z++)for(let x=15;x<=17;x++)if(x!==16||z!==7)
  w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard',material:'wood'});
 noOrder();expect(quantity(w,'plasteel')).toBe(30);expect(quantity(w,'unfinished-knife')).toBe(0);
 expect(stationAccepts({kind:'machining-table'},'make-plasteel-knife')).toBe(false);
 expect(smithingWorkTotal267('make-plasteel-knife','plasteel')).toBe(3_960_000);
 expect(smithingMaterialFromIngredients267('make-plasteel-knife',[{item:'steel',quantity:30}])).toBeUndefined();
 expect(smithingMaterialFromIngredients267('make-plasteel-knife',[{item:'plasteel',quantity:29},{item:'steel',quantity:1}])).toBeUndefined();
 expect(newCookingBill(500,'make-plasteel-knife').filters).toEqual({plasteel:true});
});
