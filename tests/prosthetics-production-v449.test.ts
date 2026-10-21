import {expect,test} from 'vitest';
import {writeTestFileSync} from './test-output.ts';
import {foodWorkstationCamp} from './scenarios/food-workstations.ts';
import {fixturePower} from './scenarios/power.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {researchCost,selectResearch} from '../src/sim/research.ts';
import {productionResearchUnlocked,productionWorkerQualified,validProstheticIngredients273} from '../src/sim/machining.ts';
import {newCookingBill,validBillSettings} from '../src/sim/cooking-bills.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import {PROSTHETIC_RECIPES_273,prostheticProduct273,type ProstheticRecipe273} from '../src/sim/prosthetic-content-273.ts';
import {productionWorkTotal,stationAccepts} from '../src/sim/production-recipes.ts';
import {validProstheticWorkShape273,validateProstheticWorks273} from '../src/sim/prosthetic-work-save-273.ts';
import type {Command,Structure,World} from '../src/sim/types.ts';

const command=(w:World,c:Command)=>{const result=applyCommand(w,c);expect(result,result.reason).toMatchObject({ok:true});};
const quantity=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
function until(w:World,done:()=>boolean,limit=10000):void {
 for(let i=0;i<limit&&!done();i++)stepWorld(w);
 expect(done(),JSON.stringify({tick:w.tick,pawn:w.pawns[0]!.state,cooking:w.pawns[0]!.cooking})).toBe(true);
 expect(validateWorld(w)).toEqual([]);
}
function roundTrip(w:World):World {const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;}
/** Prepared workshop, power/fuel, research and Craft5, finite forty steel/four
 * components and food. No natural acquisition is claimed; every subsequent
 * pickup, work tick and product delivery uses the real simulation. */
function prepared(recipe:ProstheticRecipe273='make-prosthetic-leg'){
 const w=foodWorkstationCamp(),p=w.pawns[0]!;
 w.deterioration!.lastTick=w.tick;if(w.fires)w.fires.clockCore=w.tick*10;
 delete p.background;delete p.traits;p.recreation.level=100;p.priorities.craft=1;
 p.skills.crafting={level:5,xp:0,dailyXp:0,passion:0};
 w.research={project:null,points:0,smithing:{points:researchCost('smithing'),completedAt:1000},machining:{points:researchCost('machining'),completedAt:1001},prosthetics:{points:researchCost('prosthetics'),completedAt:1002}};
 const s:Structure={id:w.nextId++,kind:'machining-table',x:10,z:7,orientation:0,footprint:'standard',material:'steel',bills:[],power:newPowerState('machining-table')};
 w.structures.push(s);fixturePower(w,'wood-generator',7,7);
 addGroundMaterial(w,'steel',40,{x:16,z:7});addGroundMaterial(w,'component',4,{x:17,z:7});addGroundMaterial(w,'food',12,{x:3,z:5},'survival-meal');refreshStock(w);
 command(w,{type:'stockpile',enabled:true,x:23,z:6,filters:{wood:false,food:false,prosthesis:true}});
 command(w,{type:'bill-add',structureId:s.id,recipe});const b=s.bills![0]!;
 return {w,p,s,b};
}

test.each(PROSTHETIC_RECIPES_273)('%s consumes distinct finite ingredients, keeps its authored workpiece and delivers an unqualified physical product',recipe=>{
 const {w,p,s,b}=prepared(recipe),item=prostheticProduct273(recipe),total=productionWorkTotal(recipe);
 until(w,()=>!!p.cooking?.ingredients.some(i=>i.stage==='held'));
 const hauled=roundTrip(w);
 until(w,()=>w.piles.some(q=>q.prostheticWork273&&q.prostheticWork273.progress>0));
 stepWorld(hauled,w.tick-hauled.tick);expect(serializeWorld(hauled)).toBe(serializeWorld(w));
 const piece=w.piles.find(q=>q.prostheticWork273)!,id=piece.id,u=piece.prostheticWork273!;
 expect(u).toMatchObject({recipe,authorId:p.id,billId:b.id});
 expect(u.parts.reduce((n,r)=>n+(r.item==='steel'?r.quantity:0),0)).toBe(40);
 expect(u.parts.reduce((n,r)=>n+(r.item==='component'?r.quantity:0),0)).toBe(4);
 expect(quantity(w,'steel')).toBe(0);expect(quantity(w,'component')).toBe(0);expect(quantity(w,item)).toBe(0);
 expect(piece.weapon).toBeUndefined();expect(piece.apparel).toBeUndefined();expect(p.skills.crafting!.xp).toBeGreaterThan(0);
 const metadata={prepared:'One powered machining table, finite generator fuel, Craft5, Smithing/Machining/Prosthetics research,40steel/4components and12survival meals. All subsequent hauling/work/delivery real.',recipe,item,stationId:s.id,authorId:p.id,workpieceId:id,materials:u.parts,tick:w.tick,progress:u.progress,total};
 if(recipe==='make-prosthetic-leg'){
  writeTestFileSync('tmp/prosthetics-v449/working.json',serializeWorld(w));
  writeTestFileSync('tmp/prosthetics-v449/working.meta.json',JSON.stringify(metadata,null,2));
 }
 command(w,{type:'priority',pawnId:p.id,work:'craft',value:0});const progress=u.progress;
 stepWorld(w,5);expect(u.progress).toBe(progress);roundTrip(w);
 const cancelled=roundTrip(w),cancelledReplay=roundTrip(w);
 for(const copy of [cancelled,cancelledReplay])command(copy,{type:'cancel-unfinished',itemId:id});
 expect(serializeWorld(cancelledReplay)).toBe(serializeWorld(cancelled));expect(quantity(cancelled,'unfinished-prosthetic')).toBe(0);
 expect(quantity(cancelled,'steel')).toBeGreaterThanOrEqual(28);expect(quantity(cancelled,'steel')).toBeLessThanOrEqual(32);expect(quantity(cancelled,'component')).toBe(3);roundTrip(cancelled);
 const replay=roundTrip(w);
 for(const copy of [w,replay])command(copy,{type:'priority',pawnId:p.id,work:'craft',value:1});
 if(recipe==='make-prosthetic-leg'){
  until(w,()=>!!w.piles.find(q=>q.id===id)?.prostheticWork273&&w.piles.find(q=>q.id===id)!.prostheticWork273!.progress>=total*.95);
  stepWorld(replay,w.tick-replay.tick);expect(serializeWorld(replay)).toBe(serializeWorld(w));
  writeTestFileSync('tmp/prosthetics-v449/near-final.json',serializeWorld(w));
  writeTestFileSync('tmp/prosthetics-v449/near-final.meta.json',JSON.stringify({...metadata,tick:w.tick,progress:w.piles.find(q=>q.id===id)!.prostheticWork273!.progress},null,2));
 }
 until(w,()=>b.target===0&&!p.cooking&&w.piles.some(q=>q.item===item&&q.owner.type==='ground'&&q.owner.x===23&&q.owner.z===6));
 stepWorld(replay,w.tick-replay.tick);expect(serializeWorld(replay)).toBe(serializeWorld(w));
 const product=w.piles.find(q=>q.item===item)!;
 expect(product).toMatchObject({kind:'prosthesis',quantity:1,owner:{type:'ground',x:23,z:6}});expect(product.prostheticWork273).toBeUndefined();expect(product.weapon).toBeUndefined();expect(product.apparel).toBeUndefined();
 expect(w.piles.some(q=>q.id===id)).toBe(false);expect(quantity(w,'steel')).toBe(0);expect(quantity(w,'component')).toBe(0);roundTrip(w);
 if(recipe==='make-prosthetic-leg')writeTestFileSync('tmp/prosthetics-v449/final.json',serializeWorld(w));
});

test('prosthetic research, actual crafting skill and separate40/4quotas gate the machining path',()=>{
 const {w,p,s,b}=prepared();expect(stationAccepts(s,b.recipe)).toBe(true);expect(stationAccepts({kind:'fabrication-bench'},b.recipe)).toBe(false);
 expect(researchCost('prosthetics')).toBe(600_000_000);delete w.research!.prosthetics;delete w.research!.machining;
 expect(selectResearch(w,'prosthetics')).toMatchObject({ok:false});expect(productionResearchUnlocked(w,b.recipe)).toBe(false);
 w.research!.machining={points:researchCost('machining'),completedAt:1001};expect(selectResearch(w,'prosthetics')).toMatchObject({ok:true});
 w.research!.project=null;w.research!.prosthetics={points:researchCost('prosthetics'),completedAt:1002};
 p.skills.crafting!.level=4;expect(productionWorkerQualified(p,b.recipe)).toBe(false);p.skills.crafting!.level=5;expect(productionWorkerQualified(p,b.recipe)).toBe(true);
 expect(validProstheticIngredients273(b.recipe,[{item:'steel',quantity:43},{item:'component',quantity:1}])).toBe(false);
 w.piles.find(q=>q.item==='component')!.quantity=3;refreshStock(w);const before=serializeWorld(w),plan=planCookingOrder(w,p,s.id);
 expect(plan.order).toBeUndefined();expect(serializeWorld(w)).toBe(before);
 const bill=newCookingBill(w.nextId,b.recipe);expect(validBillSettings(bill,b.recipe,272)).toBe(false);expect(validBillSettings(bill,b.recipe,276)).toBe(false);
});

test('workpiece guards retain historical authors and cargo but reject forged metadata and future schemas',()=>{
 const {w,p}=prepared();until(w,()=>w.piles.some(q=>q.prostheticWork273&&q.prostheticWork273.progress>0));
 const piece=w.piles.find(q=>q.prostheticWork273)!,record=piece as unknown as Record<string,unknown>;
 expect(validProstheticWorkShape273(record,273)).toBe(true);expect(validProstheticWorkShape273(record,272)).toBe(false);expect(validProstheticWorkShape273(record,276)).toBe(false);
 expect(validProstheticWorkShape273({...record,owner:{type:'inventory',pawnId:p.id}},273)).toBe(true);
 for(const property of ['weapon','apparel','unfinished','gunWork','smithingWork'])expect(validProstheticWorkShape273({...record,[property]:undefined},273)).toBe(false);
 expect(validProstheticWorkShape273({item:'steel',prostheticWork273:undefined},273)).toBe(false);
 const departed={...w,pawns:[]};expect(validateProstheticWorks273(departed)).toEqual([]);
 expect(validProstheticWorkShape273({...record,prostheticWork273:{...piece.prostheticWork273,progress:productionWorkTotal('make-prosthetic-leg')+1}},273)).toBe(false);
});
