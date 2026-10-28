import {expect,test} from 'vitest';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {controlledInjury} from './scenarios/health.ts';
import {applyCommand,advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {recordFilthMovement} from '../src/sim/filth.ts';
import {initializeSnowSurface,setSnowDepth,finishSnowStep} from '../src/sim/snow-surface.ts';
import {workProgress} from '../src/sim/work-progress.ts';
import {isDraftedTending} from '../src/sim/drafted-tending.ts';
import {isDraftedRescue} from '../src/sim/rescue.ts';
import {isForcedConsuming} from '../src/sim/consuming.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {reconcilePawnHealth} from '../src/sim/health.ts';
import {FixedCoreClock297} from '../src/bridge/fixed-core-clock-297.ts';
import {SCHEMA_VERSION,type World,type Pawn,type Command} from '../src/sim/types.ts';

/** Prepared feature fixtures only. Never the real campaign or a performance claim.
 * Reuses the repository's live construction/medical fixtures, keeping tick0;
 * no fake clock frontier, injected command implementation or copied movement/RNG. */
function quiet(count=1):World {
  const w=deconstructionCamp(count,32);expect(SCHEMA_VERSION).toBe(297);expect(w.phaseCore297).toBe(0);
  w.growingZones=[];w.stockpiles=[];
  for(const [i,p]of w.pawns.entries()){
    Object.assign(p,{x:3,z:5+i*7,hunger:70,rest:80,needCooldown:20,background:{childhood:'quiet-child',adulthood:'medic'}});
    p.schedule.fill('anything');p.recreation.level=100;
    for(const k of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[k]=0;
  }
  refreshStock(w);return w;
}
const command=(w:World,c:Command)=>expect(applyCommand(w,c)).toMatchObject({ok:true});
function cores(w:World,count:number):void {
  for(let n=0;n<count;n++){const before=effectiveCore297(w),result=advanceWorldCore297(w);expect(result.core).toBe(before+1);expect(effectiveCore297(w)).toBe(before+1);}
}
function untilCore(w:World,goal:number,limit=160):void {
  for(let n=0;n<limit&&effectiveCore297(w)<goal;n++)cores(w,1);
  expect(effectiveCore297(w)).toBe(goal);
}
function until(w:World,done:()=>boolean,limit=120):void {
  for(let n=0;n<limit&&!done();n++)cores(w,1);
  expect(done()).toBe(true);
}
function draftRoute(w:World,target:{x:number;z:number}):Pawn {
  const p=w.pawns[0]!;
  command(w,{type:'draft',pawnIds:[p.id],enabled:true});
  command(w,{type:'draft-move',pawnIds:[p.id],target,queue:false});
  return p;
}

test('Core1â€“9 do not spend another needs/work interval; the next real macro spends exactly one stroke',()=>{
  const w=quiet(),p=w.pawns[0]!,rock={x:4,z:5};p.priorities.mine=1;
  w.tiles[rock.z*w.width+rock.x]={terrain:'rock',stone:'granite'};
  command(w,{type:'designate',kind:'mine',...rock});
  const job=w.jobs.find(j=>j.kind==='mine')!;expect(job).toBeDefined();
  until(w,()=>w.phaseCore297===0&&p.jobId===job.id&&p.state==='working'&&!!job.pickTicks&&workProgress(job)+1<job.pickTicks!/10,200);
  const before={tick:w.tick,work:workProgress(job),hunger:p.hunger,rest:p.rest,skills:structuredClone(p.skills),damage:w.tiles[rock.z*w.width+rock.x]!.miningDamage};
  cores(w,9);
  expect(w.tick).toBe(before.tick);expect(w.phaseCore297).toBe(9);
  expect(workProgress(job)).toBe(before.work);expect(p.hunger).toBe(before.hunger);expect(p.rest).toBe(before.rest);
  expect(p.skills).toEqual(before.skills);expect(w.tiles[rock.z*w.width+rock.x]!.miningDamage).toBe(before.damage);
  cores(w,1);
  expect(w.tick).toBe(before.tick+1);expect(w.phaseCore297).toBe(0);
  expect(workProgress(job)).toBeCloseTo(before.work+1,12);expect(p.hunger).toBeLessThan(before.hunger);
});

test.skip('SUPERSEDED by core-reclick-paid-progress: command now engages at the already played Core',()=>{
  const w=quiet(),p=draftRoute(w,{x:16,z:5}),rng=w.rng;
  expect(p.motion).toBeUndefined();expect(w.tick).toBe(0);
  cores(w,1);
  expect(w.tick).toBe(0);expect(w.phaseCore297).toBe(1);expect(p.motion?.from).toEqual({x:3,z:5});
  expect(p.motion?.start).toBe(.1);expect(w.rng).toBe(rng);
  cores(w,59);expect(effectiveCore297(w)).toBe(60);expect(w.tick).toBe(6);expect(w.phaseCore297).toBe(0);
  expect(p.motion?.from).not.toEqual({x:3,z:5});
});

test('one physical arrival spends the legacy feet/RNG operation once and compacts snow at its own phase',()=>{
  const w=quiet(),target={x:4,z:5},index=target.z*w.width+target.x;
  initializeSnowSurface(w);setSnowDepth(w,index,.1);
  const p=draftRoute(w,target);p.filthFeet={carried:[{kind:'slime',thickness:2}]};
  w.filth={rng:1,items:[],cleaned:0};cores(w,1);
  const captured=structuredClone(p.motion)!;expect(captured.snowEntryPending).toBe(true);
  const arrival=Math.ceil(captured.end*10);
  // A scenario fence: this fixture is intentionally a non-macro arrival.
  expect(arrival%10).not.toBe(0);untilCore(w,arrival-1);
  const expected=structuredClone(w),expectedPawn=expected.pawns.find(a=>a.id===p.id)!;
  recordFilthMovement(expected,expectedPawn); // Existing public historical operation, not a copied algorithm.
  const beforeDepth=w.tiles[index]!.snowDepth!;expect(beforeDepth).toBeGreaterThan(.001);
  cores(w,1);
  expect(w.filth!.rng).toBe(expected.filth!.rng);expect(p.filthFeet).toEqual(expectedPawn.filthFeet);
  expect(w.filth!.items.map(({id,kind,x,z,thickness})=>({id,kind,x,z,thickness}))).toEqual(expected.filth!.items.map(({id,kind,x,z,thickness})=>({id,kind,x,z,thickness})));
  expect(w.filth!.items.some(f=>f.kind==='slime'&&f.x===target.x&&f.z===target.z)).toBe(true);
  expect(w.filth!.items.find(f=>f.kind==='slime')!.grownCore).toBe(arrival);
  expect(w.tiles[index]!.snowDepth).toBeCloseTo(beforeDepth-.001,12);expect(p.motion?.snowEntryPending).toBeUndefined();
  const depth=w.tiles[index]!.snowDepth,rng=w.filth!.rng,feet=structuredClone(p.filthFeet);
  finishSnowStep(w,p);finishSnowStep(w,p);expect(w.tiles[index]!.snowDepth).toBe(depth);
  untilCore(w,Math.ceil(arrival/10)*10);
  expect(w.filth!.rng).toBe(rng);expect(p.filthFeet).toEqual(feet); // No replay at the following macro.
});

type Clinical='tend'|'rescue'|'consume';
function clinical(kind:Clinical):{w:World;p:Pawn;active:()=>boolean} {
  const w=quiet(kind==='consume'?1:2),p=w.pawns[0]!;
  Object.assign(p,{background:{childhood:'quiet-child',adulthood:'medic'},foodPolicyId:4});
  command(w,{type:'draft',pawnIds:[p.id],enabled:true});
  if(kind==='consume'){
    addMaterial(w,'food',30,{type:'ground',x:12,z:5},'rice');refreshStock(w);
    command(w,{type:'order-consume',pawnId:p.id,pileId:w.piles[0]!.id,queue:false});
    return {w,p,active:()=>isForcedConsuming(p)};
  }
  const patient=w.pawns[1]!;Object.assign(patient,{x:12,z:5});p.skills.medicine={level:8,xp:0,dailyXp:0,passion:0};
  controlledInjury(w,patient,'left-arm',5000,'cut');controlledInjury(w,patient,'right-arm',5000,'bruise');
  patient.health!.bloodLoss=BLOOD_UNIT*.61;
  // This is the same controlled medical transition used by V343's field fixture.
  // Reconcile via its real producer rather than assigning a fake downed state.
  return completeClinical(w,p,patient,kind);
}
function completeClinical(w:World,p:Pawn,patient:Pawn,kind:'tend'|'rescue') {
  reconcilePawnHealth(w,patient);expect(patient.state).toBe('downed');
  if(kind==='rescue')Object.assign(fixtureBuilding(w,'bed',3,20),{medical:true});
  command(w,kind==='tend'?{type:'order-drafted-tend',pawnId:p.id,patientId:patient.id,queue:false}:{type:'order-rescue',pawnId:p.id,patientId:patient.id,queue:false});
  return {w,p,active:()=>kind==='tend'?isDraftedTending(p):isDraftedRescue(w,p)};
}

test.each(['tend','rescue','consume'] as const)('a drafted %s route retains its real mandate when the first edge finishes between macros',kind=>{
  const {w,p,active}=clinical(kind);expect(active()).toBe(true);
  until(w,()=>!!p.motion&&p.path.length>0);
  const first=structuredClone(p.motion)!,priorPath=structuredClone(p.path),arrival=Math.ceil(first.end*10);
  untilCore(w,arrival);
  expect(active()).toBe(true);expect(p.draft).toMatchObject({target:null,queue:[]});
  expect(p.motion?.from).toEqual(first.to);expect(p.motion!.end).toBeGreaterThan(first.end);
  expect(p.path.length).toBeLessThan(priorPath.length);expect(p.state).toBe('moving');
  if(kind==='tend')expect(p.tend).toMatchObject({drafted:true,phase:'approach',progress:0});
  if(kind==='rescue')expect(p.rescue?.phase).toBe('approach');
  if(kind==='consume')expect(p.need).toMatchObject({kind:'eat',forced:true,phase:'pickup',progress:0});
});

test('a paused phase7 saves/reloads its real frontier and resumes from one new Core credit, without playing old whole credits',()=>{
  const w=quiet(),p=draftRoute(w,{x:16,z:5});cores(w,7);
  const raw=serializeWorld(w),frozen=structuredClone(p.motion),rng=w.rng,reloaded=deserializeWorld(raw);
  expect(reloaded.phaseCore297).toBe(7);expect(effectiveCore297(reloaded)).toBe(7);expect(reloaded.pawns[0]!.motion).toEqual(frozen);
  const clock=new FixedCoreClock297();clock.reset(0);
  for(const now of [20,100,1000]){expect(clock.reserve(now,0)).toBe(0);expect(clock.consume()).toBe(false);}
  expect(serializeWorld(w)).toBe(raw);expect(w.rng).toBe(rng);expect(p.motion).toEqual(frozen);
  expect(clock.reserve(1016.7,1)).toBe(1);expect(clock.consume()).toBe(true);
  cores(w,1);cores(reloaded,1);expect(clock.consume()).toBe(false);
  expect(w.phaseCore297).toBe(8);expect(w.tick).toBe(0);expect(serializeWorld(reloaded)).toBe(serializeWorld(w));
  expect(validateWorld(w)).toEqual([]);
});

test.each([undefined,-1,10,.5,'7',null])('current297 refuses missing/malformed owned phase %s without silently adopting phase0',value=>{
  const raw=JSON.parse(serializeWorld(quiet()));if(value===undefined)delete raw.phaseCore297;else raw.phaseCore297=value;
  expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow();
});