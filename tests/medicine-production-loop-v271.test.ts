import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {groundCapacity,groundPile,nearbyGround} from '../src/sim/ground-placement.ts';
import {ITEM_DEFINITIONS} from '../src/sim/items.ts';
import {addGroundMaterial,addMaterial,refreshStock} from '../src/sim/materials.ts';
import {DRUG_PRODUCTION_RESEARCH_COST,MEDICINE_PRODUCTION_RESEARCH_COST,MICROELECTRONICS_RESEARCH_COST} from '../src/sim/research.ts';
import type {World} from '../src/sim/types.ts';
import {healrootCamp} from './helpers/healroot-domestic-v195.ts';
import {controlledInjury} from './scenarios/health.ts';

function scene():World {
  const w=healrootCamp(32),p=w.pawns[0]!;
  for(const key of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[key]=0;
  p.priorities.craft=1;delete p.traits;
  p.skills.crafting={level:8,xp:0,dailyXp:0,passion:1};p.skills.intellectual={level:8,xp:0,dailyXp:0,passion:1};
  w.research={points:0,project:null,microelectronics:{points:MICROELECTRONICS_RESEARCH_COST,completedAt:1000},drugProduction:{points:DRUG_PRODUCTION_RESEARCH_COST,completedAt:1500},medicineProduction:{points:MEDICINE_PRODUCTION_RESEARCH_COST,completedAt:2000}};
  w.structures.push({id:w.nextId++,kind:'drug-lab',x:8,z:8,orientation:0,footprint:'standard',material:'steel',bills:[]});
  for(const [item,quantity,x] of [['herbal-medicine',1,4],['neutroamine',1,5],['cloth',3,6]] as const)addGroundMaterial(w,ITEM_DEFINITIONS[item].kind,quantity,{x,z:6},item);
  refreshStock(w);
  expect(applyCommand(w,{type:'bill-add',structureId:w.structures[0]!.id,recipe:'make-medicine'}).ok).toBe(true);
  w.structures[0]!.bills![0]!.destination='drop';return w;
}
const count=(w:World,item:string)=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);
function until(w:World,done:()=>boolean,max=1800):void {
  for(let i=0;i<max&&!done();i++)stepWorld(w);
  expect(done(),`Medicine loop at ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);
}
function suspended(w:World,value:boolean):ReturnType<typeof applyCommand> {
  const lab=w.structures[0]!,bill=lab.bills![0]!;
  return applyCommand(w,{type:'bill-update',structureId:lab.id,billId:bill.id,settings:{mode:bill.mode,target:bill.target,suspended:value,filters:{...bill.filters},radius:bill.radius,destination:bill.destination}});
}

test('three real ingredient trips make one medicine subsequently consumed by clinical treatment',()=>{
  const w=scene(),p=w.pawns[0]!,carried=new Set<number>();
  addGroundMaterial(w,'food',10,{x:7,z:6},'rice');refreshStock(w);
  for(let i=0;i<1800&&!(count(w,'medicine')===1&&p.cooking===null);i++){
    stepWorld(w);
    for(const entry of p.cooking?.ingredients??[])if(entry.stage==='held')carried.add(entry.pileId);
    if(p.cooking?.phase==='work')expect(p.skills.intellectual!.xp).toBe(0);
  }
  expect(carried.size).toBe(3);expect(count(w,'medicine')).toBe(1);expect(p.cooking).toBeNull();
  expect(count(w,'herbal-medicine')+count(w,'neutroamine')+count(w,'cloth')).toBe(0);expect(count(w,'rice')).toBe(10);
  expect(p.skills.intellectual!.xp).toBeGreaterThan(0);expect(p.skills.crafting!.xp).toBe(0);
  p.priorities.craft=0;p.priorities.doctor=1;p.selfTend=true;p.medicalCare='industrial';
  controlledInjury(w,p,'left-leg',2000,'bruise');
  expect(applyCommand(w,{type:'order-tend',pawnId:p.id,patientId:p.id,queue:false}).ok).toBe(true);
  until(w,()=>p.health!.injuries[0]!.tended!==undefined);
  expect(count(w,'medicine')).toBe(0);expect(count(w,'rice')).toBe(10);
});

test('held, working and output medicine resume through the real serializer with identical continuation',()=>{
  const w=scene(),p=w.pawns[0]!;
  for(const reached of [()=>p.cooking?.ingredients.some(i=>i.stage==='held')===true,()=>p.cooking?.phase==='work',()=>p.cooking?.phase==='output']){
    until(w,reached);const restored=deserializeWorld(serializeWorld(w));
    stepWorld(w,3);stepWorld(restored,3);expect(restored).toEqual(w);
  }
  until(w,()=>p.cooking===null);expect(count(w,'medicine')).toBe(1);
});

test('cancelling performed work keeps all materials, gives no XP and requires new work',()=>{
  const w=scene(),p=w.pawns[0]!;until(w,()=>p.cooking?.phase==='work'&&p.cooking.progress>0);
  expect(p.cooking!.workTicks).toBeGreaterThan(0);expect(suspended(w,true).ok).toBe(true);
  expect(p.cooking).toBeNull();expect(p.skills.intellectual!.xp).toBe(0);
  expect(count(w,'cloth')).toBe(3);expect(count(w,'herbal-medicine')).toBe(1);expect(count(w,'neutroamine')).toBe(1);
  expect(w.piles.some(pile=>pile.unfinished)).toBe(false);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  expect(suspended(w,false).ok).toBe(true);until(w,()=>p.cooking?.phase==='work');
  expect(p.cooking!.workTicks).toBe(1);expect(count(w,'medicine')).toBe(0);
  until(w,()=>p.cooking===null&&count(w,'medicine')===1);
});

test('full-floor cancellation preserves held ingredients atomically until a real deposit is possible',()=>{
  const w=scene(),p=w.pawns[0]!;until(w,()=>p.cooking?.ingredients.some(i=>i.stage==='held')===true);
  const fillerIds=new Set<number>();
  for(const cell of nearbyGround(w,p))if(!groundPile(w,cell)){
    const entry=p.cooking!.ingredients.find(i=>i.stage!=='placed'&&i.cell.x===cell.x&&i.cell.z===cell.z);
    const item=entry?.item??'wood',quantity=groundCapacity(w,cell,item);
    if(quantity>0){addMaterial(w,ITEM_DEFINITIONS[item].kind,quantity,{type:'ground',...cell},item);fillerIds.add(groundPile(w,cell)!.id);}
  }
  refreshStock(w);expect(validateWorld(w)).toEqual([]);const before=serializeWorld(w);
  expect(suspended(w,true)).toMatchObject({ok:false,code:'occupied'});expect(serializeWorld(w)).toBe(before);
  w.piles=w.piles.filter(pile=>!fillerIds.has(pile.id));refreshStock(w);
  expect(suspended(w,true).ok).toBe(true);expect(p.cooking).toBeNull();expect(p.skills.intellectual!.xp).toBe(0);
  expect(count(w,'herbal-medicine')+count(w,'neutroamine')+count(w,'cloth')).toBe(5);expect(count(w,'medicine')).toBe(0);
});

test('a saturated output keeps one held medicine and never repeats completion XP',()=>{
  const w=scene(),p=w.pawns[0]!;until(w,()=>p.cooking?.phase==='output');
  const xp=p.skills.intellectual!.xp,productId=p.cooking!.productId,fillerIds=new Set<number>();
  for(const cell of nearbyGround(w,p))if(!groundPile(w,cell)){
    const quantity=groundCapacity(w,cell,'wood');if(quantity>0){addGroundMaterial(w,'wood',quantity,cell,'wood');fillerIds.add(groundPile(w,cell)!.id);}
  }
  refreshStock(w);stepWorld(w,30);
  expect(p.cooking?.phase).toBe('output');expect(p.cooking!.productId).toBe(productId);expect(count(w,'medicine')).toBe(1);expect(p.skills.intellectual!.xp).toBe(xp);
  const restored=deserializeWorld(serializeWorld(w));stepWorld(w,5);stepWorld(restored,5);expect(restored).toEqual(w);
  w.piles=w.piles.filter(pile=>!fillerIds.has(pile.id));refreshStock(w);until(w,()=>p.cooking===null);
  expect(count(w,'medicine')).toBe(1);expect(p.skills.intellectual!.xp).toBe(xp);
});
