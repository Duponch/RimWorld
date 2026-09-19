import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { huntingCamp } from './scenarios/hunting';
import { createMedicalRecord } from '../src/sim/injury-state';
import { reconcilePawnHealth } from '../src/sim/health';
import { reconcileAnimalHealth } from '../src/sim/wildlife-health';
import { animalNavigation,moveAnimal } from '../src/sim/wildlife-navigation';
import { BLOOD_UNIT } from '../src/sim/injury-rules';
import type { World } from '../src/sim/types';

function until(w:World,done:()=>boolean,max=500){for(let i=0;i<max&&!done();i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}expect(done()).toBe(true);}
function orderedCamp(){
  const w=huntingCamp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;
  p.priorities.gather=4;w.resources.push({id:w.nextId++,kind:'tree',x:3,z:10,amount:11});
  expect(applyCommand(w,{type:'designate',kind:'chop',x:3,z:10}).ok).toBe(true);
  const job=w.jobs.find(j=>j.kind==='chop')!;
  expect(applyCommand(w,{type:'hunt',animalId:a.id,enabled:true}).ok).toBe(true);
  until(w,()=>p.shooting?.stance?.phase==='aim');return {w,p,a,job};
}

test('queued work stays behind hunting; replacement respects the preserved shot recovery',()=>{
  const {w,p,a,job}=orderedCamp();
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:true}).ok).toBe(true);
  expect(p.hunting?.animalId).toBe(a.id);expect(p.orders.queue).toEqual([job.id]);expect(p.jobId).toBeNull();expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,15);stepWorld(copy,15);expect(copy).toEqual(w);
  until(w,()=>!w.jobs.some(j=>j.id===job.id),1000);expect(w.hunting?.completed).toBe(1);

  const direct=orderedCamp();until(direct.w,()=>direct.p.shooting?.stance?.phase==='cooldown');
  const recovery=structuredClone(direct.p.shooting!.stance),bullets=structuredClone(direct.w.projectiles);
  const before=serializeWorld(direct.w),result=applyCommand(direct.w,{type:'order-job',pawnId:direct.p.id,jobId:direct.job.id,queue:false});
  expect(result.ok).toBe(false);expect(serializeWorld(direct.w)).toBe(before);expect(direct.p.shooting?.stance).toEqual(recovery);expect(direct.w.projectiles).toEqual(bullets);
  until(direct.w,()=>direct.p.shooting?.stance?.phase!=='cooldown');
  const accepted=applyCommand(direct.w,{type:'order-job',pawnId:direct.p.id,jobId:direct.job.id,queue:false});expect(accepted.ok,JSON.stringify(accepted)).toBe(true);
  expect(direct.p.hunting).toBeUndefined();expect(validateWorld(direct.w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(direct.w));stepWorld(direct.w,150);stepWorld(resumed,150);expect(resumed).toEqual(direct.w);expect(direct.w.jobs.some(j=>j.id===direct.job.id)).toBe(false);
  // A queued sustaining delivery carries a priority intention too. Neither may
  // start over an active hunt; both survive the save until explicit cancellation.
  const sustained=orderedCamp(),q=sustained.p;q.priorities.haul=3;
  expect(applyCommand(sustained.w,{type:'designate',kind:'wall',x:3,z:12}).ok).toBe(true);
  const wall=sustained.w.jobs.find(j=>j.kind==='wall')!;
  const queued=applyCommand(sustained.w,{type:'order-haul',pawnId:q.id,target:{type:'job',jobId:wall.id},queue:true});expect(queued.ok,JSON.stringify(queued)).toBe(true);
  expect(q.priorityWork).toBeDefined();expect(q.orders.queue).toHaveLength(1);expect(q.hunting).toBeDefined();expect(q.haul).toBeNull();expect(validateWorld(sustained.w)).toEqual([]);
  const reload=deserializeWorld(serializeWorld(sustained.w));stepWorld(sustained.w,2);stepWorld(reload,2);expect(reload).toEqual(sustained.w);expect(q.haul).toBeNull();
  expect(applyCommand(sustained.w,{type:'hunt',animalId:sustained.a.id,enabled:false}).ok).toBe(true);
  until(sustained.w,()=>sustained.w.piles.some(i=>i.owner.type==='job'&&i.owner.jobId===wall.id),400);

});

test('a mobile hunter losing both hands releases the hunt and queued reservations immediately',()=>{
  const {w,p,job}=orderedCamp();expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:true}).ok).toBe(true);
  p.health={...createMedicalRecord(w.tick),missing:[{part:'left-hand',bornAt:w.tick,tended:true},{part:'right-hand',bornAt:w.tick,tended:true}]};
  reconcilePawnHealth(w,p);expect(p.state).not.toBe('downed');expect(p.hunting).toBeUndefined();expect(p.shooting).toBeUndefined();expect(p.orders.queue).toEqual([]);expect(job.reservedBy).toBeNull();expect(validateWorld(w)).toEqual([]);
  stepWorld(w,30);expect(p.hunting).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('finishing waits for the prey captured fall before eighteen contact ticks and resumes exactly from mid-fall',()=>{
  const w=huntingCamp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;w.pawns=[p];p.x=12;p.z=11;
  a.path=[{x:11,z:11}];expect(moveAnimal(w,a,animalNavigation(w).step,.16)).toBe(true);
  const edge=structuredClone(a.motion!),arrival=Math.ceil(edge.end);
  a.health={...createMedicalRecord(w.tick),body:'hare',bloodLoss:BLOOD_UNIT*.7};reconcileAnimalHealth(w,a);
  expect(a.state).toBe('downed');expect(arrival-w.tick).toBeGreaterThan(18);
  expect(applyCommand(w,{type:'hunt',animalId:a.id,enabled:true}).ok).toBe(true);
  // A hunter is already next to the destination, but not to the early part of
  // the diagonal fall. Twenty elapsed ticks must not complete an execution.
  for(let i=0;i<20;i++){
    stepWorld(w);expect(p.hunting).toMatchObject({phase:'stalk',progress:0});expect(a.health.death).toBeUndefined();expect(a.motion).toEqual(edge);expect(validateWorld(w)).toEqual([]);
  }
  const saved=serializeWorld(w),copy=deserializeWorld(saved),invalid=JSON.parse(saved);
  invalid.pawns[0].hunting.phase='finish';invalid.pawns[0].hunting.progress=1;
  expect(validateWorld(invalid)).toContain('Invalid hunting finish.');expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow();
  while(w.tick<arrival){stepWorld(w);expect(validateWorld(w)).toEqual([]);if(w.tick<arrival)expect(p.hunting).toMatchObject({phase:'stalk',progress:0});}
  expect(p.hunting).toMatchObject({phase:'finish',progress:1});expect(a.health.death).toBeUndefined();
  stepWorld(w,16);expect(p.hunting?.progress).toBe(17);expect(a.health.death).toBeUndefined();
  stepWorld(w);expect(w.piles.find(i=>i.id===a.id)?.corpse?.health.death).toEqual({tick:arrival+17,cause:'execution'});
  expect(w.hunting?.completed).toBe(1);expect(validateWorld(w)).toEqual([]);
  stepWorld(copy,w.tick-copy.tick);expect(serializeWorld(copy)).toBe(serializeWorld(w));
});
