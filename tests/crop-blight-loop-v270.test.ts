import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { gatherResource } from '../src/sim/gathering.ts';
import { initializeHydroponicBasin } from '../src/sim/hydroponics.ts';
import { infectCrop } from '../src/sim/plant-blight.ts';
import { plantGrowth } from '../src/sim/plants.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { HYDROPONICS_RESEARCH_COST } from '../src/sim/research.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { Job,Resource,Structure,World } from '../src/sim/types.ts';
import { workProgress } from '../src/sim/work-progress.ts';
import { healrootCamp } from './helpers/healroot-domestic-v195.ts';
import { fixturePower } from './scenarios/power.ts';

function crop(w:World,x=5,z=4,growth=1):Resource {
  const p:Resource={id:w.nextId++,kind:'rice',x,z,amount:6,growth,growthTick:w.tick};
  w.resources=[...w.resources,p];return p;
}
function until(w:World,done:()=>boolean,limit=400):void {
  for(let n=0;n<limit&&!done();n++)stepWorld(w);
  expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({id:p.id,state:p.state,job:p.jobId,path:p.path}))})).toBe(true);
}
const valid=(w:World)=>expect(validateWorld(w)).toEqual([]);

test('a grower physically cuts a sick mature crop without XP or product, then sows a healthy replacement',()=>{
  const w=healrootCamp(32),pawn=w.pawns[0]!,p=crop(w);
  expect(applyCommand(w,{type:'area',action:'growing',from:p,to:p}).ok).toBe(true);infectCrop(w,p,1);
  const rng=w.rng,xp=pawn.skills.plants!.xp;valid(w);
  until(w,()=>!w.resources.includes(p));expect(pawn.skills.plants!.xp).toBe(xp);expect(w.piles).toEqual([]);expect(w.rng).toBe(rng);valid(w);
  until(w,()=>w.resources.some(r=>r.kind==='rice'&&r.id!==p.id));
  const replacement=w.resources.find(r=>r.kind==='rice')!;expect(replacement.blight).toBeUndefined();expect(plantGrowth(w,replacement)).toBeGreaterThan(0);
  expect(pawn.skills.plants!.xp).toBeGreaterThan(xp);expect(w.piles).toEqual([]);valid(w);
});

test('infection interrupts a committed manual harvest and its queued copy without a repeated harvest loop or cargo loss',()=>{
  const w=healrootCamp(32),p=crop(w),pawn=w.pawns[0]!;
  expect(applyCommand(w,{type:'designate',kind:'harvest',x:p.x,z:p.z}).ok).toBe(true);
  until(w,()=>w.jobs.some(j=>j.kind==='harvest'&&workProgress(j)>0));
  const old=w.jobs.find(j=>j.kind==='harvest')!,piles=JSON.stringify(w.piles),rng=w.rng;
  pawn.orders.queue=[old.id];expect(infectCrop(w,p,1)).toBe(true);
  expect(w.jobs.some(j=>j.id===old.id)).toBe(false);expect(pawn.jobId).toBeNull();expect(pawn.orders.queue).toEqual([]);
  expect(JSON.stringify(w.piles)).toBe(piles);expect(w.rng).toBe(rng);valid(w);
  stepWorld(w,30);expect(w.resources).toContain(p);expect(w.jobs.some(j=>j.kind==='harvest')).toBe(false);
  expect(applyCommand(w,{type:'designate',kind:'cut',x:p.x,z:p.z}).ok).toBe(true);
  until(w,()=>!w.resources.includes(p));expect(w.piles).toEqual([]);valid(w);
});

test('save in real cut work resumes through disappearance and resowing with identical plant and stream state',()=>{
  const w=healrootCamp(32),p=crop(w);
  applyCommand(w,{type:'area',action:'growing',from:p,to:p});infectCrop(w,p,1);
  until(w,()=>w.jobs.some(j=>j.kind==='cut'&&workProgress(j)>0));
  expect(w.resources).toContain(p);valid(w);const restored=deserializeWorld(serializeWorld(w));
  stepWorld(w,90);stepWorld(restored,90);expect(serializeWorld(restored)).toBe(serializeWorld(w));
  expect(w.resources.some(r=>r.id===p.id)).toBe(false);expect(w.resources.some(r=>r.kind==='rice'&&!r.blight)).toBe(true);expect(w.piles).toEqual([]);valid(w);
});

test('hydroponic work clears disease and resows on the same living powered basin',()=>{
  const w=healrootCamp(32);w.research={points:0,project:null,hydroponics:{points:HYDROPONICS_RESEARCH_COST,completedAt:w.tick}};
  const generator=fixturePower(w,'wood-generator',12,4),basin:Structure={id:w.nextId++,kind:'hydroponics-basin',x:6,z:4,orientation:0,footprint:'standard',material:'steel',power:{...newPowerState('hydroponics-basin'),on:true,parentId:generator.id}};
  w.structures.push(basin);initializeHydroponicBasin(w,basin);const zone=w.growingZones[0]!,p=crop(w,6,4);
  infectCrop(w,p,1);valid(w);until(w,()=>!w.resources.includes(p));expect(w.piles).toEqual([]);
  until(w,()=>w.resources.some(r=>r.x===p.x&&r.z===p.z&&r.id!==p.id));
  expect(w.structures).toContain(basin);expect(w.growingZones[0]).toBe(zone);expect(w.resources.find(r=>r.x===p.x&&r.z===p.z)?.blight).toBeUndefined();valid(w);
});

test('cutting a designated sick plant schedules its adjacent chain only when the cut completes',()=>{
  const w=healrootCamp(32),root=crop(w),neighbor=crop(w,6,4),diagonal=crop(w,7,5),distant=crop(w,11,4);
  for(const p of [root,neighbor,diagonal,distant])infectCrop(w,p,8192);
  expect(applyCommand(w,{type:'designate',kind:'cut',x:root.x,z:root.z}).ok).toBe(true);
  expect(w.jobs.map(j=>({x:j.x,z:j.z}))).toEqual([{x:root.x,z:root.z}]);
  until(w,()=>!w.resources.includes(root));
  expect(w.jobs.some(j=>j.kind==='cut'&&j.x===neighbor.x&&j.z===neighbor.z)).toBe(true);
  expect(w.jobs.some(j=>j.x===diagonal.x&&j.z===diagonal.z||j.x===distant.x&&j.z===distant.z)).toBe(false);
  until(w,()=>!w.resources.includes(neighbor));expect(w.resources).toContain(diagonal);expect(w.resources).toContain(distant);expect(w.piles).toEqual([]);valid(w);
});

test('a blocked or refused chain designation cannot prevent the original crop from being cut',()=>{
  const w=healrootCamp(32),root=crop(w),neighbor=crop(w,6,4);infectCrop(w,root,1);infectCrop(w,neighbor,1);
  const occupied:Job={id:w.nextId++,kind:'cut',x:neighbor.x,z:neighbor.z,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};
  w.jobs.push(occupied);const next=w.nextId;
  expect(gatherResource(w,root,'cut')).toBe(0);expect(w.resources).not.toContain(root);expect(w.resources).toContain(neighbor);
  expect(w.jobs).toEqual([occupied]);expect(w.nextId).toBe(next);expect(w.piles).toEqual([]);
});
