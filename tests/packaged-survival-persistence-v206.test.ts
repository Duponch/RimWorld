import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {validateCooking} from '../src/sim/cooking-save.ts';
import {isCookingOrder} from '../src/sim/order-types.ts';
import {validCookingOrder} from '../src/sim/player-cooking-save.ts';
import {planCookingOrder,queuedCookingReason} from '../src/sim/player-cooking.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {packagedSurvivalCamp,packagedSurvivalUnits} from './scenarios/packaged-survival-v206.ts';

function until(w:World,done:()=>boolean,max=1800):void {
  for(let i=0;i<max&&!done();i++)stepWorld(w);
  expect(done(),`Missing survival phase at tick ${w.tick}`).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
function old187(w:World):World {
  const raw=structuredClone(w);(raw as {schemaVersion:number}).schemaVersion=187;
  if(raw.research)delete raw.research.packagedSurvivalMeals;
  return raw;
}
function roundtripAndCompare(w:World,ticks=9):void {
  const resumed=deserializeWorld(serializeWorld(w));expect(resumed).toEqual(w);
  stepWorld(w,ticks);stepWorld(resumed,ticks);expect(resumed).toEqual(w);
  expect(validateWorld(w)).toEqual([]);
}

test('187 rejects survival bills on both active and packed stoves; current bills require completed research',()=>{
  const active=old187(packagedSurvivalCamp());
  expect(validateCooking(active,187,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(active))).toThrow(/version 187/);
  const packed=old187(packagedSurvivalCamp()),station=packed.structures[0]!;
  packed.structures=[];packed.packed.push({building:station,owner:{type:'ground',x:station.x,z:station.z}});
  expect(validateCooking(packed,187,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(packed))).toThrow(/version 187/);
  const missingResearch=packagedSurvivalCamp();delete missingResearch.research!.packagedSurvivalMeals;
  expect(validateCooking(missingResearch,SCHEMA_VERSION,new Set())).toContain('Invalid cooking bill.');
  expect(()=>deserializeWorld(JSON.stringify(missingResearch))).toThrow();
});

test('queued survival order preserves 6+6 reservations and refuses future versions, bad quotas, skill and lost research',()=>{
  const w=packagedSurvivalCamp(),p=w.pawns[0]!,stove=w.structures[0]!;
  const proposal=planCookingOrder(w,p,stove.id);expect(proposal.reason).toBeUndefined();
  if(!proposal.order||!isCookingOrder(proposal.order))throw new Error('Expected packaged survival order');
  expect(proposal.label).toBe('Cuisiner un repas de survie emballé');
  expect(proposal.order.cooking.ingredients.map(i=>i.quantity)).toEqual([6,6]);
  expect(validCookingOrder(proposal.order,w)).toBe(true);
  const unbalanced=structuredClone(proposal.order);
  unbalanced.cooking.ingredients.find(i=>i.item==='milk')!.quantity=5;
  unbalanced.cooking.ingredients.find(i=>i.item==='rice')!.quantity=7;
  expect(validCookingOrder(unbalanced,w)).toBe(false);
  p.orders.queue.push(proposal.order);
  expect(queuedCookingReason(w,proposal.order)).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const legacy=old187(w);
  expect(validCookingOrder(legacy.pawns[0]!.orders.queue[0],legacy)).toBe(false);
  expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow(/version 187/);
  p.skills.cooking!.level=7;expect(queuedCookingReason(w,proposal.order)).toBe('Cuisine 8 nécessaire.');
  p.skills.cooking!.level=10;delete w.research!.packagedSurvivalMeals;
  expect(validCookingOrder(proposal.order,w)).toBe(false);expect(queuedCookingReason(w,proposal.order)).toMatch(/recherche/);
});

test('real queued command starts, save resumes gather, work and output exactly, and 187 cannot contain an active future task',()=>{
  const w=packagedSurvivalCamp(),p=w.pawns[0]!,stove=w.structures[0]!;
  p.priorities.build=2;addGroundMaterial(w,'wood',5,{x:5,z:4},'wood');
  expect(applyCommand(w,{type:'designate',kind:'wall',material:'wood',x:2,z:10}).ok).toBe(true);
  const wall=w.jobs.find(job=>job.kind==='wall'&&job.x===2&&job.z===10)!;
  expect(wall).toMatchObject({construction:'blueprint',escrow:{wood:0,food:0}});
  // Construction requires materials delivered to the site; ground stocks only
  // permit the preceding physical delivery order, which makes the cook queue.
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'job',jobId:wall.id},queue:false})).toMatchObject({ok:true});
  expect(p.haul?.destination).toMatchObject({type:'job',jobId:wall.id});
  expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:stove.id,queue:true})).toMatchObject({ok:true});
  expect(p.orders.queue.some(isCookingOrder)).toBe(true);
  roundtripAndCompare(w,1);
  until(w,()=>p.cooking?.phase==='gather'&&p.cooking.ingredients.some(i=>i.stage==='held'));
  roundtripAndCompare(w,3);
  until(w,()=>p.cooking?.phase==='work'&&p.cooking.progress>0);
  expect(p.cooking!.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(12);
  const unbalanced=structuredClone(w);
  unbalanced.pawns[0]!.cooking!.ingredients.find(i=>i.item==='milk')!.quantity=5;
  unbalanced.pawns[0]!.cooking!.ingredients.find(i=>i.item==='rice')!.quantity=7;
  expect(validateCooking(unbalanced,SCHEMA_VERSION,new Set())).toContain('Invalid recipe quantity or phase.');
  expect(()=>deserializeWorld(JSON.stringify(unbalanced))).toThrow();
  const interrupted=structuredClone(w);interrupted.pawns[0]!.cooking!.phase='interrupted';
  expect(validateCooking(interrupted,SCHEMA_VERSION,new Set())).toContain('Meal has no resumable interrupted work.');
  const legacy=old187(w);
  expect(validateCooking(legacy,187,new Set())).toContain('Invalid or future production recipe.');
  expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow(/version 187/);
  roundtripAndCompare(w,10);
  until(w,()=>p.cooking?.phase==='output');
  expect(packagedSurvivalUnits(w)).toBe(1);expect(p.cooking!.ingredients).toEqual([]);
  roundtripAndCompare(w,1);
  until(w,()=>p.cooking===null);expect(packagedSurvivalUnits(w)).toBe(1);
  expect(stove.bills![0]!.target).toBe(0);
});
