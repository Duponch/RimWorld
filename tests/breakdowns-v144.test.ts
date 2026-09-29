import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {advanceBreakdownFix,advanceBreakdowns,breakdownEligible,canBreakdownNow,fixBreakdownSuccessChance,newBreakdownCalendar,reconcileBreakdownJobs,triggerBreakdown} from '../src/sim/breakdowns.ts';
import {doorOpenTicks,newDoorState} from '../src/sim/door-rules.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {advancePower,reconcilePower} from '../src/sim/power.ts';
import {AUTODOORS_RESEARCH_COST,BATTERIES_RESEARCH_COST} from '../src/sim/research.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {withoutFutureFineMealPolicy} from './scenarios/legacy-skills.ts';
import {fixturePower} from './scenarios/power.ts';
import {SCHEMA_VERSION,type Structure,type StructureKind,type World} from '../src/sim/types.ts';

const breakable:StructureKind[]=[
  'autodoor','wood-generator','wind-turbine','battery','solar-generator',
  'electric-tailor-bench','machining-table','electric-stove','fabrication-bench','heater','cooler',
];
const other:StructureKind[]=['door','standing-lamp','hi-tech-research-bench','multi-analyzer','power-conduit','power-switch'];
const sample=(kind:StructureKind):Structure=>({id:1,kind,x:4,z:4,orientation:0,footprint:'standard',power:newPowerState(kind)});
const home=(w:World,s:Structure)=>applyCommand(w,{type:'area',action:'home',from:s,to:s});

function until(w:World,done:()=>boolean,limit=3000):void {
  for(let i=0;i<limit&&!done();i++){
    stepWorld(w);
    if(i%100===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);
  }
  expect(done(),`tick ${w.tick}; ${JSON.stringify({jobs:w.jobs,pawns:w.pawns.map(p=>({state:p.state,jobId:p.jobId,haul:p.haul})),piles:w.piles})}`).toBe(true);
}

test('only Core breakdown components can fail; PowerTrader requires current power',()=>{
  expect(breakable.filter(kind=>!breakdownEligible(sample(kind)))).toEqual([]);
  expect(other.filter(kind=>breakdownEligible(sample(kind)))).toEqual([]);
  const door=sample('autodoor');
  expect(canBreakdownNow(door)).toBe(false);
  door.power!.on=true;
  expect(canBreakdownNow(door)).toBe(true);
  door.breakdown={brokenAt:0};
  expect(canBreakdownNow(door)).toBe(false);
  for(const kind of ['wood-generator','wind-turbine','battery','solar-generator'] as const){
    const structure=sample(kind);
    structure.power!.on=false;
    expect(canBreakdownNow(structure),kind).toBe(true);
  }
});

test('Construction 0–8 follows the Core success curve before capacity modifiers',()=>{
  const pawn=deconstructionCamp().pawns[0]!;
  for(const [level,chance] of [.75,.8,.85,.875,.9,.925,.95,.975,1].entries()){
    pawn.skills.construction.level=level;
    expect(fixBreakdownSuccessChance(pawn),`Construction ${level}`).toBeCloseTo(chance);
  }
});

test('natural checks keep the 1041-Core-tick boundary and a separate deterministic RNG',()=>{
  const w=deconstructionCamp();
  const battery:Structure={id:w.nextId++,kind:'battery',x:17,z:17,orientation:0,footprint:'standard',material:'steel',power:newPowerState('battery'),battery:{stored:0}};
  w.structures.push(battery);
  w.breakdown={rng:1,nextCheckCore:1041}; // first xorshift roll is below 1041 / 13,680,000
  const mainRng=w.rng;
  w.tick=104;advanceBreakdowns(w);
  expect(battery.breakdown).toBeUndefined();
  expect(w.breakdown).toEqual({rng:1,nextCheckCore:1041});
  w.tick=105;advanceBreakdowns(w);
  expect(battery.breakdown).toEqual({brokenAt:105});
  expect(battery.power?.on).toBe(false);
  expect(w.breakdown.nextCheckCore).toBe(2082);
  expect(w.rng).toBe(mainRng);
  const after=structuredClone(w);
  advanceBreakdowns(w);
  expect(w).toEqual(after); // the same confirmed tick never repeats the check
});

test('a forced breakdown is distinct from HP damage and battery energy is actually lost',()=>{
  const w=deconstructionCamp();
  w.research??={project:null,points:0};
  w.research.batteries={points:BATTERIES_RESEARCH_COST,completedAt:0};
  const battery:Structure={id:w.nextId++,kind:'battery',x:17,z:17,orientation:0,footprint:'standard',material:'steel',power:newPowerState('battery'),battery:{stored:123_000}};
  w.structures.push(battery);
  const beforeRng=w.rng,beforeCalendar=structuredClone(w.breakdown);
  expect(triggerBreakdown(w,battery.id)).toBe(true);
  expect(battery.breakdown).toEqual({brokenAt:w.tick});
  expect(battery.damage).toBeUndefined();
  expect(battery.battery!.stored).toBe(0);
  expect(battery.power!.on).toBe(false);
  expect(triggerBreakdown(w,battery.id)).toBe(false);
  expect(w.rng).toBe(beforeRng);
  expect(w.breakdown).toEqual(beforeCalendar);
  expect(w.jobs.some(j=>j.kind==='fix-breakdown')).toBe(false); // Outside Home.
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('a broken powered autodoor remains traversable at manual speed despite available network power',()=>{
  const w=deconstructionCamp(),source=fixturePower(w,'wood-generator',12,16);
  w.research??={project:null,points:0};
  w.research.autodoors={points:AUTODOORS_RESEARCH_COST,completedAt:0};
  const door:Structure={id:w.nextId++,kind:'autodoor',material:'steel',x:16,z:16,orientation:0,footprint:'standard',power:newPowerState('autodoor'),door:newDoorState(w.tick)};
  door.door!.duration=doorOpenTicks(door);
  w.structures.push(door);
  w.tick=2000;w.breakdown=newBreakdownCalendar(w.seed,w.tick);reconcilePower(w);
  expect(door.power!.parentId).toBe(source.id);
  door.power!.on=true;
  const powered=doorOpenTicks(door);
  expect(triggerBreakdown(w,door.id)).toBe(true);
  expect(doorOpenTicks(door)).toBe(powered*4);
  expect(door.door?.forbidden).toBe(false);
  expect(door.power!.parentId).toBe(source.id);
  for(let i=0;i<50;i++){w.tick++;advancePower(w);}
  expect(door.power!.on).toBe(false);
  expect(doorOpenTicks(door)).toBe(powered*4);
  expect(validateWorld(w)).toEqual([]);
});

test('Home creates one physical Construction job; repair consumes one component and preserves the building',()=>{
  const w=deconstructionCamp(),pawn=w.pawns[0]!,generator=fixturePower(w,'wood-generator',16,16);
  pawn.schedule.fill('work');pawn.priorities.build=1;pawn.priorities.haul=1;
  pawn.skills.construction.level=8;
  addGroundMaterial(w,'component',1,{x:14,z:16},'component');
  expect(home(w,generator).ok).toBe(true);
  expect(triggerBreakdown(w,generator.id)).toBe(true);
  const job=w.jobs.find(j=>j.kind==='fix-breakdown');
  expect(job?.fixBreakdown).toMatchObject({structureId:generator.id});
  expect(w.jobs.filter(j=>j.kind==='fix-breakdown')).toHaveLength(1);
  expect(validateWorld(w)).toEqual([]);
  until(w,()=>!!w.piles.find(p=>p.item==='component'&&p.owner.type==='job'));
  expect(validateWorld(w)).toEqual([]);
  const during=deserializeWorld(serializeWorld(w));
  for(let i=0;i<600;i++){stepWorld(w);stepWorld(during);expect(serializeWorld(during)).toBe(serializeWorld(w));if(!generator.breakdown)break;}
  expect(generator.breakdown).toBeUndefined();
  expect(w.structures.find(s=>s.id===generator.id)).toBe(generator);
  expect(w.piles.filter(p=>p.item==='component')).toHaveLength(0);
  expect(w.jobs.some(j=>j.kind==='fix-breakdown')).toBe(false);
  expect(validateWorld(w)).toEqual([]);
});

test('a failed replacement consumes the delivered component and leaves the fault for another attempt',()=>{
  const w=deconstructionCamp(),pawn=w.pawns[0]!,s=fixturePower(w,'wood-generator',16,16);
  pawn.skills.construction.level=0;
  expect(home(w,s).ok).toBe(true);
  expect(triggerBreakdown(w,s.id)).toBe(true);
  const job=w.jobs.find(j=>j.kind==='fix-breakdown')!;
  addGroundMaterial(w,'component',1,{x:14,z:16},'component');
  const component=w.piles.find(p=>p.item==='component')!;
  component.owner={type:'job',jobId:job.id};
  job.progress=99;
  w.breakdown!.rng=12345; // The next independent roll is above the level-0 75% chance.
  const mainRng=w.rng;
  expect(advanceBreakdownFix(w,pawn,job)).toBe('failure');
  expect(s.breakdown).toBeDefined();
  expect(w.piles.some(p=>p.id===component.id)).toBe(false);
  expect(job.progress).toBe(0);
  expect(w.rng).toBe(mainRng);
});

test('repair job follows Home and deconstruction rather than repairing at a distance',()=>{
  const w=deconstructionCamp(),s=fixturePower(w,'wood-generator',16,16);
  expect(triggerBreakdown(w,s.id)).toBe(true);
  expect(w.jobs.some(j=>j.kind==='fix-breakdown')).toBe(false);
  expect(home(w,s).ok).toBe(true);
  reconcileBreakdownJobs(w);
  expect(w.jobs.filter(j=>j.kind==='fix-breakdown')).toHaveLength(1);
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:s.x,z:s.z}).ok).toBe(true);
  reconcileBreakdownJobs(w);
  expect(w.jobs.some(j=>j.kind==='fix-breakdown')).toBe(false);
  expect(validateWorld(w)).toEqual([]);
});

test('interrupting after delivery returns the same component and restarts work from zero',()=>{
  const w=deconstructionCamp(),pawn=w.pawns[0]!,s=fixturePower(w,'wood-generator',16,16);
  pawn.schedule.fill('work');pawn.priorities.build=1;pawn.priorities.haul=1;
  addGroundMaterial(w,'component',1,{x:14,z:16},'component');
  expect(home(w,s).ok).toBe(true);
  expect(triggerBreakdown(w,s.id)).toBe(true);
  until(w,()=>w.jobs.some(j=>j.kind==='fix-breakdown'&&j.progress>=5));
  const delivered=w.piles.find(p=>p.item==='component'&&p.owner.type==='job')!;
  const id=delivered.id;
  expect(applyCommand(w,{type:'area',action:'remove-home',from:s,to:s}).ok).toBe(true);
  expect(w.jobs.some(j=>j.kind==='fix-breakdown')).toBe(false);
  expect(w.piles.filter(p=>p.item==='component')).toHaveLength(1);
  expect(w.piles.find(p=>p.id===id)?.owner.type).toBe('ground');
  expect(s.breakdown).toBeDefined();
  expect(validateWorld(w)).toEqual([]);
  expect(home(w,s).ok).toBe(true);
  const restarted=w.jobs.find(j=>j.kind==='fix-breakdown');
  expect(restarted?.progress).toBe(0);
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('V143 migration is prospective and strict; malformed V144 breakdown states are rejected',()=>{
  const current=deconstructionCamp(),old=structuredClone(current);
  withoutFutureFineMealPolicy(old);
  (old as {schemaVersion:number}).schemaVersion=143;
  delete old.breakdown;
  old.apparelPolicies=old.apparelPolicies?.map(policy=>({...policy,allowedItems:policy.allowedItems.filter(item=>item!=='recon-helmet')}));
  const priorRng=old.rng,priorNextId=old.nextId;
  const migrated=deserializeWorld(JSON.stringify(old));
  expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
  expect(migrated.breakdown).toBeDefined();
  expect(migrated.structures.some(s=>!!s.breakdown)).toBe(false);
  expect(migrated.jobs.some(j=>j.kind==='fix-breakdown')).toBe(false);
  expect(migrated.rng).toBe(priorRng);
  expect(migrated.nextId).toBe(priorNextId);
  expect(deserializeWorld(JSON.stringify(old))).toEqual(migrated);
  expect(validateWorld(migrated)).toEqual([]);

  const future=structuredClone(old);
  future.breakdown=structuredClone(current.breakdown);
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/Invalid version 143 save/);
  const foreign=structuredClone(migrated);
  const wall:Structure={id:foreign.nextId++,kind:'wall',material:'wood',x:4,z:4,orientation:0,footprint:'standard',breakdown:{brokenAt:0}};
  foreign.structures.push(wall);
  expect(()=>deserializeWorld(JSON.stringify(foreign))).toThrow();
  for(const mutate of [(w:World)=>{w.breakdown!.nextCheckCore=-1;},(w:World)=>{w.breakdown!.rng=-1;},(w:World)=>{w.breakdown!.rng=1.5;}]){
    const bad=structuredClone(migrated);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
});
