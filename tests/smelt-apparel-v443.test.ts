import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {fixturePower} from './scenarios/power.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {addMaterial,refreshStock,reservedSource} from '../src/sim/materials.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {newCampfireFuel} from '../src/sim/fuel.ts';
import {SMELTING_APPAREL_INPUTS267,smeltingIngredientAllowed,smeltingProduct,smeltingYield,validSmeltingIngredients,validSmeltingProduct} from '../src/sim/smelting-rules.ts';
import {burnApparelIngredientAllowed,BURN_APPAREL_INPUTS} from '../src/sim/burn-apparel-rules.ts';
import {finishSmelting} from '../src/sim/smelting.ts';
import {productionWorkTotal} from '../src/sim/production-recipes.ts';
import {planCookingOrder} from '../src/sim/player-cooking.ts';
import {isCookingOrder} from '../src/sim/order-types.ts';
import {healthRandom} from '../src/sim/health.ts';
import {tickSkillsAt} from '../src/sim/skills.ts';
import {APPAREL,newApparelState} from '../src/sim/apparel-rules.ts';
import {SMITHING_APPAREL_ITEMS267,smithingApparelStuff267,type SmithingApparel267} from '../src/sim/smithing-apparel-267.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import type {MaterialPile,Pawn,Structure,World,WorkType} from '../src/sim/types.ts';
import type {ProductionContext} from '../src/sim/production-output.ts';

/** Finite prepared current camp, supplies and powered/fueled station. Nothing
 * has been collected, processed, worn, consumed or travelled before the test. */
function camp(item:SmithingApparel267='gold-plate-armor',burn=false){
 const w=deconstructionCamp(2);w.stockpiles=[];w.packed=[];w.events=[];
 for(const p of w.pawns){for(const work of Object.keys(p.priorities) as WorkType[])p.priorities[work]=0;p.apparelAutomation=false;p.recreation.level=100;p.mood=90;delete p.background;delete p.traits;}
 const p=w.pawns[0]!;p.priorities.craft=burn?0:1;p.priorities.haul=1;p.skills.crafting={level:0,xp:0,dailyXp:0,passion:0};p.x=5;p.z=10;
 const bill=newCookingBill(w.nextId++,burn?'burn-apparel':'smelt-apparel');bill.filters[item]=true;bill.destination='drop';
 const generator=burn?undefined:fixturePower(w,'wood-generator',11,11);
 const station:Structure={id:w.nextId++,kind:burn?'campfire':'electric-smelter',x:14,z:13,orientation:0,footprint:'standard',bills:[bill],
  ...burn?{fuel:newCampfireFuel()}:{material:'steel',power:newPowerState('electric-smelter')}};
 if(generator){station.power!.parentId=generator.id;station.power!.on=true;}w.structures.push(station);
 addMaterial(w,'apparel',1,{type:'ground',x:8,z:11},item);const garment=w.piles.at(-1)!;refreshStock(w);
 expect(validateWorld(w)).toEqual([]);return {w,p,bill,station,garment};
}
function until(w:World,done:()=>boolean,limit=700){for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),`Recovery checkpoint at tick${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);}
function exact(w:World){const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;}
function context():ProductionContext{return {search:()=>null,move:()=>{throw Error('Real staging already reached');},release:()=>{throw Error('Finish preflight must not release work');},event:()=>{},workRate:()=>1};}
/** Project only the existing passive daily reset/decay, with its real hash
 * cadence. Recovery must add no learning to any complete skill record. */
function passiveSkills(p:Pawn,before:Pawn['skills'],fromTick:number,toTick:number):Pawn['skills'] {
 const projected={...p,skills:structuredClone(before)};
 for(let tick=fromTick+1;tick<=toTick;tick++)tickSkillsAt(projected,tick);
 return projected.skills;
}

test('recovery admits only the actual Stuff, one whole garment, explicit filters and permitted condition; quality/HP never multiply yield',()=>{
 expect(SMELTING_APPAREL_INPUTS267).toHaveLength(10);expect(BURN_APPAREL_INPUTS).toContain('wood-plate-armor');
 for(const item of SMITHING_APPAREL_ITEMS267){
  const garment:MaterialPile={id:1,item,kind:'apparel',quantity:1,owner:{type:'ground',x:2,z:2},apparel:newApparelState(item)},smelt=newCookingBill(2,'smelt-apparel'),burn=newCookingBill(3,'burn-apparel'),wood=smithingApparelStuff267(item)==='wood';
  expect(smelt.filters[item]??false).toBe(false);smelt.filters[item]=true;burn.filters[item]=true;
  expect(smeltingIngredientAllowed(smelt,garment),item).toBe(!wood);expect(burnApparelIngredientAllowed(burn,garment),item).toBe(wood);
  expect(validSmeltingIngredients([{item,quantity:1}],'smelt-apparel')).toBe(!wood);expect(validSmeltingIngredients([{item,quantity:2}],'smelt-apparel')).toBe(false);
  if(wood){expect(()=>smeltingYield(item,()=>0)).toThrow();continue;}
  const normal=smeltingYield(item,()=>.9);garment.apparel!.quality='legendary';garment.apparel!.hitPoints=1;
  expect(smeltingIngredientAllowed(smelt,garment)).toBe(true);expect(smeltingYield(item,()=>.9)).toBe(normal);
  garment.apparel!.forbidden=true;expect(smeltingIngredientAllowed(smelt,garment)).toBe(false);delete garment.apparel!.forbidden;
  smelt.smeltFilter!.hpMin=50;expect(smeltingIngredientAllowed(smelt,garment)).toBe(false);
  expect(APPAREL[item].hitPoints).toBeGreaterThan(garment.apparel!.hitPoints);
 }
 for(const [item,minimum,maximum,product] of [
  ['steel-plate-armor',42,43,'steel'],['plasteel-plate-armor',42,43,'plasteel'],['uranium-plate-armor',42,43,'uranium'],
  ['silver-plate-armor',425,425,'silver'],['gold-plate-armor',425,425,'gold'],['steel-simple-helmet',10,10,'steel'],['silver-simple-helmet',100,100,'silver'],
 ] as const){
  let draws=0;expect(smeltingYield(item,()=>{draws++;return 0;})).toBe(maximum);expect(draws).toBe(1);expect(smeltingYield(item,()=>.999999)).toBe(minimum);expect(smeltingProduct(item)).toBe(product);
  expect(validSmeltingProduct(product,minimum,'smelt-apparel')).toBe(true);
 }
 expect(validSmeltingProduct('gold',424,'smelt-apparel')).toBe(false);expect(validSmeltingProduct('steel',44,'smelt-apparel')).toBe(false);expect(validSmeltingProduct('wood',42,'smelt-apparel')).toBe(false);
});

test('one real golden plate crosses a saved pickup edge, smelts once into425 gold and deposits the complete legal stack',()=>{
 const {w,p,bill,station,garment}=camp(),id=garment.id,metadata=structuredClone(garment.apparel),skills=structuredClone(p.skills),skillTick=w.tick;
 expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:false}).ok).toBe(true);expect(reservedSource(w,id)).toBe(1);
 w.pawns[1]!.priorities.craft=1;expect(planCookingOrder(w,w.pawns[1]!,station.id).order).toBeUndefined();w.pawns[1]!.priorities.craft=0;
 until(w,()=>p.cooking?.ingredients[0]?.stage==='held'&&(p.motion?.end??0)>w.tick);
 expect(garment.owner).toEqual({type:'pawn',pawnId:p.id});expect(garment.apparel).toEqual(metadata);const copy=exact(w),cp=copy.pawns.find(a=>a.id===p.id)!;
 let lastRng=w.rng;
 for(let i=0;i<700&&p.cooking?.phase!=='output';i++){lastRng=w.rng;stepWorld(w);stepWorld(copy);}
 expect(p.cooking?.phase).toBe('output');expect(cp.cooking?.phase).toBe('output');expect(serializeWorld(copy)).toBe(serializeWorld(w));
 const product=w.piles.find(a=>a.id===p.cooking!.productId)!,projected={rng:lastRng};healthRandom(projected);
 expect(product).toMatchObject({kind:'gold',item:'gold',quantity:425,owner:{type:'pawn',pawnId:p.id}});expect(product.id).not.toBe(id);expect(product.apparel).toBeUndefined();expect(product.weapon).toBeUndefined();
 expect(w.piles.some(a=>a.id===id)).toBe(false);expect(w.rng).toBe(projected.rng);expect(p.skills).toEqual(passiveSkills(p,skills,skillTick,w.tick));expect(p.skills.crafting).toEqual(skills.crafting);expect(bill.target).toBe(0);
 const packet=new SnapshotEncoder().encode(w,0,0);expect(new SnapshotDecoder().adopt(structuredClone(packet)).status).toBe('applied');exact(w);
 for(let i=0;i<100&&p.cooking;i++){stepWorld(w);stepWorld(copy);}expect(p.cooking).toBeNull();expect(product.owner.type).toBe('ground');expect(product.quantity).toBe(425);expect(w.piles.filter(a=>a.item==='gold').reduce((n,a)=>n+a.quantity,0)).toBe(425);expect(serializeWorld(copy)).toBe(serializeWorld(w));
});

test('blocked physical completion preserves the indivisible garment, RNG, allocator and bill before any commit',()=>{
 const {w,p,station,bill,garment}=camp('steel-plate-armor');
 expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:false}).ok).toBe(true);
 until(w,()=>p.cooking?.ingredients[0]?.stage==='placed'&&p.x===p.cooking.spot.x&&p.z===p.cooking.spot.z&&(p.motion?.end??0)<=w.tick);
 // The collection/contact above is real; this declared final-work checkpoint
 // isolates refusal preflight without pretending the remaining work elapsed.
 p.cooking!.phase='work';p.cooking!.progress=productionWorkTotal('smelt-apparel');
 const check=()=>{const bytes=JSON.stringify(w);expect(finishSmelting(w,p,bill,context())).toBe(false);expect(JSON.stringify(w)).toBe(bytes);expect(w.piles).toContain(garment);};
 station.power!.on=false;check();station.power!.on=true;
 garment.apparel!.forbidden=true;check();delete garment.apparel!.forbidden;
 bill.filters[garment.item as SmithingApparel267]=false;check();bill.filters[garment.item as SmithingApparel267]=true;
 const next=w.nextId;w.nextId=Number.MAX_SAFE_INTEGER;check();w.nextId=next;
 expect(finishSmelting(w,p,bill,context())).toBe(true);expect(bill.target).toBe(0);expect(w.piles.find(a=>a.id===p.cooking!.productId)!.quantity).toBeGreaterThanOrEqual(42);expect(validateWorld(w)).toEqual([]);
});

test('wooden plate is really carried and burned, with no recovered metal, RNG draw or fabricated value credit',()=>{
 const {w,p,station,bill,garment}=camp('wood-plate-armor',true),id=garment.id;
 expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:false}).ok).toBe(true);
 until(w,()=>p.cooking?.ingredients[0]?.stage==='held'&&(p.motion?.end??0)>w.tick);
 const copy=exact(w),rng=w.rng,next=w.nextId,skills=structuredClone(p.skills),skillTick=w.tick;
 for(let i=0;i<300&&w.piles.some(a=>a.id===id);i++){stepWorld(w);stepWorld(copy);}
 expect(w.piles.some(a=>a.id===id)).toBe(false);expect(w.destroyed?.items?.['wood-plate-armor']).toBe(1);expect(w.piles.some(a=>['steel','wood','gold'].includes(a.item))).toBe(false);
 expect(w.rng).toBe(rng);expect(w.nextId).toBe(next);expect(p.skills).toEqual(passiveSkills(p,skills,skillTick,w.tick));expect(p.skills.crafting).toEqual(skills.crafting);expect(bill.target).toBe(0);expect(p.cooking).toBeNull();expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
});

test.each(['active-source','queued-source','actually-placed','actually-held'] as const)('forbidding a %s smelting garment in pause preserves the original and releases only its real reservation',stage=>{
 const {w,p,station,bill,garment}=camp('steel-plate-armor'),id=garment.id;
 if(stage==='queued-source'){
  // A different real hauling order keeps the actor busy, so the authoritative
  // cook command really enters its queue rather than becoming an active task.
  addMaterial(w,'wood',1,{type:'ground',x:6,z:10},'wood');const wood=w.piles.at(-1)!;
  expect(applyCommand(w,{type:'stockpile',x:9,z:10,enabled:true,capacity:75,filters:{wood:true,food:false}}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:wood.id},queue:false}).ok).toBe(true);
  expect(p.haul).not.toBeNull();expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:true}).ok).toBe(true);
  expect(p.orders.queue.some(o=>isCookingOrder(o)&&o.cooking.recipe==='smelt-apparel'&&o.cooking.ingredients.some(i=>i.pileId===id))).toBe(true);
 }else{
  expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:false}).ok).toBe(true);
  if(stage==='actually-held')until(w,()=>p.cooking?.ingredients[0]?.stage==='held'&&(p.motion?.end??0)>w.tick);
  if(stage==='actually-placed')until(w,()=>p.cooking?.ingredients[0]?.stage==='placed'&&p.x===p.cooking.spot.x&&p.z===p.cooking.spot.z&&(p.motion?.end??0)<=w.tick);
  expect(p.cooking?.recipe).toBe('smelt-apparel');
 }
 expect(reservedSource(w,id)).toBe(stage==='actually-held'?0:1);
 expect(validateWorld(w)).toEqual([]);const before=serializeWorld(w),copy=exact(w),tick=w.tick,rng=w.rng,next=w.nextId,metadata=structuredClone(garment.apparel),haul=structuredClone(p.haul),others=structuredClone(w.piles.filter(i=>i.id!==id));
 const command={type:'apparel-permission' as const,itemId:id,allowed:false};
 const result=applyCommand(w,command),replayed=applyCommand(copy,command);expect(result.ok).toBe(replayed.ok);
 if(stage==='actually-held'){
  // The real UI permission targets ground Things. A carried original cannot
  // be forbidden through a fabricated floor location or remote replacement.
  expect(result.ok).toBe(false);expect(serializeWorld(w)).toBe(before);expect(garment.apparel).toEqual(metadata);
 }else{
  expect(result.ok,result.reason).toBe(true);expect(garment.apparel).toEqual({...metadata,forbidden:true});expect(reservedSource(w,id)).toBe(0);
  expect(p.cooking).toBeNull();expect(p.orders.queue.some(o=>isCookingOrder(o)&&o.cooking.ingredients.some(i=>i.pileId===id))).toBe(false);
  if(stage==='queued-source')expect(p.haul).toEqual(haul);else expect(p.orders.active).toBeNull();
 }
 expect(w.tick).toBe(tick);expect(w.rng).toBe(rng);expect(w.nextId).toBe(next);expect(bill.target).toBe(1);
 expect(w.piles.find(i=>i.id===id)).toBe(garment);expect(garment.quantity).toBe(1);expect(w.piles.filter(i=>i.id!==id)).toEqual(others);
 expect(validateWorld(w)).toEqual([]);expect(serializeWorld(copy)).toBe(serializeWorld(w));exact(w);
});
