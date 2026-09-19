import { expect,test } from 'vitest';
import { applyCommand,createWorld,stepWorld,validateWorld,serializeWorld,deserializeWorld } from '../src/sim/index';
import { addGroundMaterial,refreshStock } from '../src/sim/materials';
import { corpseYield,CORPSE_ROT_TICKS } from '../src/sim/corpses';
import { createMedicalRecord } from '../src/sim/injury-state';
import { BLOOD_UNIT } from '../src/sim/injury-rules';
import { cookingSpeed,butcherySpeed,butcheryEfficiency,cookingSkill,roundYield } from '../src/sim/cooking-statistics';
import { finishButchery } from '../src/sim/butchery';
import { processProductionOutput,type ProductionContext } from '../src/sim/production-output';
import { countedProducts,newCookingBill } from '../src/sim/cooking-bills';
import { productionWorkTotal } from '../src/sim/production-recipes';
import type { World,MaterialPile,Structure } from '../src/sim/types';

function camp(){
  const w=createWorld(79123,16,16);w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.jobs=[];w.piles=[];w.structures=[];w.stockpiles=[];delete w.wildlife;
  w.pawns=w.pawns.slice(0,1);const p=w.pawns[0]!;
  Object.assign(p,{x:3,z:4,hunger:100,rest:100});p.schedule.fill('work');for(const key of Object.keys(p.priorities))p.priorities[key as keyof typeof p.priorities]=0;p.priorities.cook=1;p.skills.cooking={level:8,xp:0,dailyXp:0,passion:1};
  const id=w.nextId++,health={...createMedicalRecord(w.tick),body:'hare' as const,bloodLoss:BLOOD_UNIT,death:{tick:w.tick,cause:'blood-loss' as const}};
  const corpse:MaterialPile={id,item:'hare-corpse',kind:'corpse',quantity:1,owner:{type:'ground',x:5,z:4},corpse:{animalId:id,species:'hare',sex:'female',health},rot:{progress:0,atTick:w.tick}};w.piles.push(corpse);
  expect(applyCommand(w,{type:'designate',kind:'butcher-spot',x:8,z:8}).ok).toBe(true);
  const spot=w.structures.find(s=>s.kind==='butcher-spot')!;expect(spot).toBeDefined();expect(applyCommand(w,{type:'bill-add',structureId:spot.id}).ok).toBe(true);refreshStock(w);
  return {w,p,corpse,spot,bill:spot.bills![0]!};
}
function until(w:World,done:()=>boolean,max=2500){for(let i=0;i<max&&!done();i++){stepWorld(w);expect(validateWorld(w),`tick${w.tick}`).toEqual([]);}expect(done(),`condition tick${w.tick}`).toBe(true);}
const quantity=(w:World,item:MaterialPile['item'])=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);

test('Cooking and butchery use distinct skill/capacity curves and ordered stochastic rounding',()=>{
  const {p,corpse}=camp();for(const level of [0,8,20]){p.skills.cooking!.level=level;expect(cookingSpeed(p)).toBeCloseTo(.4+.06*level);expect(butcherySpeed(p)).toBeCloseTo(.4+.06*level);expect(butcheryEfficiency(p)).toBeCloseTo(.75+.025*level);}
  delete p.skills.cooking;expect(cookingSkill(p).level).toBe(0);expect(cookingSpeed(p)).toBe(.4);expect(p.skills.cooking).toBeUndefined();
  p.health={...createMedicalRecord(2000),missing:[{part:'left-hand',bornAt:2000,tended:true}]};
  expect(cookingSpeed(p)).toBeLessThan(.4);expect(butcherySpeed(p)).toBeLessThan(.4);expect(butcherySpeed(p)).toBeGreaterThanOrEqual(.1);expect(butcheryEfficiency(p)).toBeLessThan(.75);
  const draws:number[]=[];expect(roundYield(16,()=>{draws.push(1);return .1;})).toBe(16);expect(roundYield(16.2,()=>{draws.push(2);return .1;})).toBe(17);expect(draws).toEqual([1,2]);
  expect(corpseYield(corpse).meat).toBeCloseTo(31.0857142857);expect(corpseYield(corpse).leather).toBeCloseTo(16.2285714286);
});

test('physical corpse collection, saved work, two conserved products, cooked meat and real ingestion',()=>{
  const {w,p,corpse,spot,bill}=camp(),identity=corpse.id;
  until(w,()=>p.cooking?.ingredients.some(i=>i.stage==='held')===true);
  expect(w.piles.find(i=>i.id===identity)).toMatchObject({owner:{type:'pawn',pawnId:p.id},corpse:{animalId:identity}});expect(w.butchery).toBeUndefined();expect(p.skills.cooking!.xp).toBe(0);
  const interrupted=deserializeWorld(serializeWorld(w));expect(applyCommand(interrupted,{type:'priority',pawnId:p.id,work:'cook',value:0}).ok).toBe(true);expect(interrupted.piles.find(i=>i.id===identity)?.owner.type).toBe('ground');expect(interrupted.butchery).toBeUndefined();expect(interrupted.pawns[0]!.skills.cooking!.xp).toBe(0);expect(validateWorld(interrupted)).toEqual([]);
  until(w,()=>p.cooking?.phase==='work'&&p.cooking.progress>0);
  expect(p).toMatchObject({x:spot.x,z:spot.z-1});expect(p.skills.cooking!.xp).toBe(0);expect(p.cooking!.workTicks).toBeGreaterThan(0);
  const saved=serializeWorld(w),invalid=JSON.parse(saved);invalid.pawns[0].cooking.workTicks=-1;expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/work duration/);
  const resumed=deserializeWorld(saved);stepWorld(w,200);stepWorld(resumed,200);expect(resumed).toEqual(w);
  until(w,()=>bill.target===0&&!p.cooking);expect(w.butchery?.completed).toBe(1);expect(quantity(w,'hare-corpse')).toBe(0);expect(quantity(w,'hare-meat')).toBe(w.butchery!.meat);expect(quantity(w,'light-leather')).toBe(w.butchery!.leather);expect(p.skills.cooking!.xp).toBeGreaterThan(0);
  const fire:Structure={id:w.nextId++,kind:'campfire' as const,x:11,z:8,orientation:0 as const,footprint:'standard' as const,fuel:{ticks:12000,burned:0,autoRefuel:false},bills:[]};w.structures.push(fire);expect(applyCommand(w,{type:'bill-add',structureId:fire.id}).ok).toBe(true);
  const meal=fire.bills![0]!;expect(applyCommand(w,{type:'bill-update',structureId:fire.id,billId:meal.id,settings:{...meal,filters:{rice:false,berries:false,'hare-meat':true},destination:'drop'}}).ok).toBe(true);
  until(w,()=>quantity(w,'simple-meal')===1&&!p.cooking);expect(quantity(w,'hare-meat')+10).toBe(w.butchery!.meat);expect(quantity(w,'light-leather')).toBe(w.butchery!.leather);
  const meat=quantity(w,'hare-meat');p.hunger=20;until(w,()=>p.hunger>50);expect(quantity(w,'simple-meal')).toBe(0);expect(quantity(w,'hare-meat')).toBe(meat);expect(validateWorld(w)).toEqual([]);
});

test('rotting cancels a gathered corpse without output or learning; queued corpses remain exclusive',()=>{
  const {w,p,corpse,bill}=camp();until(w,()=>p.cooking?.phase==='work');w.tick+=CORPSE_ROT_TICKS;corpse.rot={progress:CORPSE_ROT_TICKS,atTick:w.tick};
  stepWorld(w);expect(p.cooking).toBeNull();expect(w.piles.find(i=>i.id===corpse.id)?.corpse).toBeDefined();expect(bill.target).toBe(1);expect(w.butchery).toBeUndefined();expect(p.skills.cooking!.xp).toBe(0);expect(validateWorld(w)).toEqual([]);
  const second=camp(),other=structuredClone(second.p);other.id=second.w.nextId++;other.name='Autre';other.x=4;second.w.pawns.push(other);
  stepWorld(second.w,20);expect(second.w.pawns.filter(p=>p.cooking)).toHaveLength(1);expect(validateWorld(second.w)).toEqual([]);until(second.w,()=>!!second.w.butchery);expect(second.w.butchery!.completed).toBe(1);
});

test('saturated ground reuses the consumed corpse cell, retains output, and preflight failure changes no RNG/XP/items',()=>{
  const {w,p,corpse,spot,bill}=camp();p.x=8;p.z=7;corpse.owner={type:'ground',x:8,z:8};
  p.state='working';p.cooking={recipe:'butcher-creature',stationId:spot.id,billId:bill.id,spot:{x:8,z:7},actionCell:{x:8,z:8},phase:'work',ingredients:[{pileId:corpse.id,item:'hare-corpse',quantity:1,stage:'placed',cell:{x:8,z:8}}],progress:productionWorkTotal('butcher-creature'),workTicks:45,productId:null,storageId:null};
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(x!==8||z!==8)addGroundMaterial(w,'wood',75,{x,z},'wood');refreshStock(w);
  const context={event:(message:string)=>w.events.push({tick:w.tick,type:'job',message}),release:()=>{throw Error('unexpected release');},move:()=>{},workRate:()=>1,search:()=>null} as unknown as ProductionContext;
  const bad=structuredClone(w);bad.nextId=Number.MAX_SAFE_INTEGER;const before=structuredClone(bad);expect(finishButchery(bad,bad.pawns[0]!,bad.structures[0]!.bills![0]!,context)).toBe(false);expect(bad).toEqual(before);
  const oldXp=p.skills.cooking!.xp;expect(finishButchery(w,p,bill,context)).toBe(true);expect(p.skills.cooking!.xp-oldXp).toBe(45000);expect(bill.target).toBe(0);expect(w.butchery!.completed).toBe(1);expect(w.piles.find(i=>i.owner.type==='ground'&&i.owner.x===8&&i.owner.z===8)?.item).toBe('light-leather');
  const held=w.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)!;expect(held.item).toBe('hare-meat');expect(countedProducts(w,bill)).toBe(0);processProductionOutput(w,p,context,'drop');expect(p.cooking?.phase).toBe('output');expect(w.piles.find(i=>i.id===held.id)?.quantity).toBe(w.butchery!.meat);
  w.piles=w.piles.filter(i=>!(i.owner.type==='ground'&&i.owner.x===7&&i.owner.z===7));p.planCooldown=0;processProductionOutput(w,p,context,'drop');expect(p.cooking).toBeNull();expect(quantity(w,'hare-meat')).toBe(w.butchery!.meat);expect(quantity(w,'light-leather')).toBe(w.butchery!.leather);
});
