import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { aggressiveCrisisCandidates } from '../src/sim/aggressive-crisis-admission.ts';
import { processAggressiveCrisis } from '../src/sim/aggressive-crisis.ts';
import { startBerserk,startMurderousRage,startTantrum } from '../src/sim/mental-break.ts';
import { finishMentalBreak } from '../src/sim/mental-state.ts';
import { advanceMelee,applyMeleeCommand } from '../src/sim/melee.ts';
import { meleeContact,structureMeleeCell } from '../src/sim/melee-space.ts';
import { startTravel } from '../src/sim/movement.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { LightEnvironmentCache } from '../src/sim/light-environment.ts';
import { shootingQueries } from '../src/sim/shooting.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { effectiveSkillLevel } from '../src/sim/work-types.ts';
import { structureMaxHp } from '../src/sim/thing-damage-rules.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import { controlledInjury } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { crisisBuildings,makeCrisisPacifist,mentalCrisesCamp,mentalCrisesNativeFixture } from './helpers/mental-crises-v211.ts';
import type { Pawn,Structure,World } from '../src/sim/types.ts';

function decision(w:World,p:Pawn,remaining=8){
  const budget={remaining,pairs:32768},light=()=>new LightEnvironmentCache().read(w);
  processAggressiveCrisis(w,p,()=>blockedCells(w),budget,light,{search:()=>null,move:()=>{throw new Error('Unexpected fallback wander.');},release:()=>true,event:()=>{}});
  return budget;
}
const strike=(w:World,p:Pawn,core=w.tick*10)=>advanceMelee(w,p,core,()=>blockedCells(w,true),shootingQueries(w));
function until(w:World,done:()=>boolean,max=180):void {for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done()).toBe(true);expect(validateWorld(w)).toEqual([]);}

test('Tantrum hits a distant footprint face after real recovery and retains a fatal structural strike',()=>{
  const w=mentalCrisesCamp(1),p=w.pawns[0]!,table:Structure=fixtureBuilding(w,'table-long',12,12);
  table.material='wood';fixtureBuilding(w,'stool',19,12);
  // Orientation zero extends in z: this face is far from the table anchor.
  p.x=12;p.z=16;expect(startTantrum(w,p)).toBe(true);
  const c=p.mental!.crisis!;if(c.kind!=='tantrum')throw new Error('Expected Tantrum.');c.targetId=table.id;
  expect(meleeContact(w,p,table)).toBe(false);expect(structureMeleeCell(w,p,table)).toEqual({x:12,z:15});
  table.damage=structureMaxHp(table)-1;decision(w,p);
  expect(strike(w,p)).toBe(true);expect(w.structures).not.toContain(table);expect(c.attempted).toBe(true);
  expect(p.melee?.order).toBeNull();expect(p.melee?.strike?.structure).toEqual({x:12,z:15});
  expect(w.fires).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  const peer=deserializeWorld(serializeWorld(w));stepWorld(w,8);stepWorld(peer,8);expect(peer).toEqual(w);
});

test('an engaged edge postpones the structural attempt without changing its captured travel',()=>{
  const w=mentalCrisesCamp(1),p=w.pawns[0]!,[id]=crisisBuildings(w),s=w.structures.find(t=>t.id===id)!;
  p.x=s.x-2;p.z=s.z;expect(startTravel(w,p,{x:s.x-1,z:s.z})).toBe(true);const motion=structuredClone(p.motion);
  expect(startTantrum(w,p)).toBe(true);const c=p.mental!.crisis!;if(c.kind!=='tantrum')throw new Error('Expected Tantrum.');c.targetId=id;
  decision(w,p);expect(strike(w,p)).toBe(false);expect(s.damage).toBeUndefined();expect(p.motion).toEqual(motion);
  until(w,()=>!!p.melee?.strike);expect(p.melee!.strike!.atCore/10).toBeGreaterThanOrEqual(motion!.end);expect(c.attempted).toBe(true);
});

test('Murder pursuit keeps its victim after downing and resumes immediately with a new admitted victim',()=>{
  const w=mentalCrisesCamp(2),p=w.pawns[0]!,victim=w.pawns[1]!;
  expect(startMurderousRage(w,p)).toBe(true);until(w,()=>!!p.melee?.strike);
  const c=p.mental!.crisis!;if(c.kind!=='murderous-rage')throw new Error('Expected Murder.');expect(c.targetId).toBe(victim.id);
  controlledInjury(w,victim,'left-leg',30000);controlledInjury(w,victim,'right-leg',30000);expect(victim.state).toBe('downed');
  const first=p.lastAttack!.atCore;until(w,()=>!!p.lastAttack&&p.lastAttack.atCore>first);expect(p.lastAttack!.targetId).toBe(victim.id);
  const retarget=mentalCrisesCamp(3),actor=retarget.pawns[0]!,old=retarget.pawns[1]!,next=retarget.pawns[2]!;
  expect(startMurderousRage(retarget,actor)).toBe(true);const state=actor.mental!.crisis!;if(state.kind!=='murderous-rage')throw new Error('Expected Murder.');
  state.targetId=old.id;state.nextCheckCore=retarget.tick*10;retarget.pawns=retarget.pawns.filter(t=>t!==old);
  decision(retarget,actor);expect(state.targetId).toBe(next.id);expect(actor.melee?.order?.targetId).toBe(next.id);
  expect(retarget.events.at(-1)).toMatchObject({type:'need'});expect(retarget.events.at(-1)!.message).toContain('Colère meurtrière');expect(validateWorld(retarget)).toEqual([]);
});

test('pacifist involuntary violence uses effective zero and never learns forbidden melee XP',()=>{
  const w=mentalCrisesCamp(2),p=w.pawns[0]!,victim=w.pawns[1]!;victim.x=p.x+1;
  makeCrisisPacifist(p);const record=structuredClone(p.skills.melee);expect(startMurderousRage(w,p)).toBe(true);decision(w,p);
  expect(strike(w,p)).toBe(true);expect(p.melee?.strike).toBeDefined();expect(p.skills.melee).toEqual(record);
  expect(effectiveSkillLevel(p,'melee',p.skills.melee.level)).toBe(0);finishMentalBreak(w,p);
  const before=JSON.stringify(w);expect(applyMeleeCommand(w,{type:'melee',pawnIds:[p.id],targetId:victim.id}).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('Berserk may physically attack a domestic animal while ordinary control continues to refuse it',()=>{
  const w=mentalCrisesCamp(1),p=w.pawns[0]!;
  const animal={id:w.nextId++,species:'hare' as const,sex:'female' as const,ageTicks:adultAgeTicks('hare'),x:p.x+1,z:p.z,food:.2,rest:90,state:'idle' as const,path:[],nextDecision:w.tick,
    domestic:{since:w.tick,care:'dry' as const,tameness:1,nextDecay:w.tick+6000}};
  w.wildlife={profile:'temperate-hares-v1',rng:42,animals:[animal],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  expect(aggressiveCrisisCandidates(w,p,'berserk')).toEqual([animal.id]);expect(startBerserk(w,p)).toBe(true);
  const c=p.mental!.crisis!;if(c.kind!=='berserk')throw new Error('Expected Berserk.');c.targetId=animal.id;c.jobUntilCore=w.tick*10+600;
  decision(w,p);expect(strike(w,p)).toBe(true);expect(p.melee?.strike?.targetId).toBe(animal.id);expect(c.targetId).toBeNull();
  finishMentalBreak(w,p);const before=JSON.stringify(w);expect(applyMeleeCommand(w,{type:'melee',pawnIds:[p.id],targetId:animal.id}).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('Murder breaks a real blocking door before resuming its primary human pursuit',()=>{
  const w=mentalCrisesCamp(2),p=w.pawns[0]!,victim=w.pawns[1]!;victim.x=16;
  const door:Structure=fixtureBuilding(w,'door',12,p.z);door.material='wood';door.door=newDoorState(w.tick);door.damage=structureMaxHp(door)-1;
  for(let z=0;z<w.height;z++)if(z!==p.z)fixtureBuilding(w,'wall',12,z);
  expect(startMurderousRage(w,p)).toBe(true);const c=p.mental!.crisis!;if(c.kind!=='murderous-rage')throw new Error('Expected Murder.');
  until(w,()=>p.melee?.order?.targetId===door.id);
  expect(p.melee!.order!.structure).toBe(true);expect(p.melee!.order!.untilCore).toBeUndefined();expect(c.targetId).toBe(victim.id);
  const saved=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(saved);expect(saved).toEqual(w);
  until(w,()=>!w.structures.includes(door));expect(c.targetId).toBe(victim.id);expect(p.melee?.strike?.structure).toEqual({x:door.x,z:door.z});expect(p.x).toBeLessThan(door.x);
  until(w,()=>p.lastAttack?.targetId===victim.id);expect(p.melee?.strike?.structure).toBeUndefined();
});

test('aggressive movement keeps ordinary speed and exhaustion waits for its committed recovery',()=>{
  for(const kind of ['tantrum','berserk','murderous-rage'] as const){
    const w=mentalCrisesCamp(2),p=w.pawns[0]!;crisisBuildings(w);
    expect(({tantrum:startTantrum,berserk:startBerserk,'murderous-rage':startMurderousRage})[kind](w,p)).toBe(true);
    const normal=structuredClone(w);delete normal.pawns[0]!.mental!.crisis;
    expect(startTravel(w,p,{x:p.x+1,z:p.z})).toBe(true);expect(startTravel(normal,normal.pawns[0]!,{x:p.x,z:p.z})).toBe(true);
    expect(p.motion!.speedFactor).toBe(normal.pawns[0]!.motion!.speedFactor);
  }
  const w=mentalCrisesCamp(2),p=w.pawns[0]!,victim=w.pawns[1]!;victim.x=p.x+1;expect(startMurderousRage(w,p)).toBe(true);decision(w,p);expect(strike(w,p)).toBe(true);
  const recovery=structuredClone(p.melee!.strike!);p.rest=0;p.restZeroTicks=101;p.collapsePending=true;
  stepWorld(w);expect(p.need).toBeNull();expect(p.melee?.strike).toEqual(recovery);expect(validateWorld(w)).toEqual([]);
  until(w,()=>p.state==='sleeping');expect(p.melee).toBeUndefined();expect(p.mental?.crisis).toBeUndefined();expect(p.need?.kind).toBe('sleep');
});

test('exhaustion during a pursuit cancels only its future path and replays the engaged edge before sleeping',()=>{
  const w=mentalCrisesCamp(2),p=w.pawns[0]!;expect(startMurderousRage(w,p)).toBe(true);stepWorld(w);
  expect(p.moveCooldown).toBeGreaterThan(0);expect(p.path.length).toBeGreaterThan(0);
  const motion=structuredClone(p.motion);p.rest=0;p.restZeroTicks=101;p.collapsePending=true;
  const peer=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(peer);
  expect(peer).toEqual(w);expect(p.path).toEqual([]);expect(p.motion).toEqual(motion);expect(p.melee).toBeUndefined();expect(p.need).toBeNull();expect(validateWorld(w)).toEqual([]);
  const checkpoint=deserializeWorld(serializeWorld(w));
  for(let i=0;i<15&&p.state!=='sleeping';i++){stepWorld(w);stepWorld(checkpoint);expect(checkpoint).toEqual(w);expect(validateWorld(w)).toEqual([]);}
  expect(p.state).toBe('sleeping');expect(w.tick).toBeGreaterThanOrEqual(motion!.end);expect(p.mental?.crisis).toBeUndefined();
});

test('native Tantrum finishes its last fatal recovery before wandering and remains saveable through natural recovery',()=>{
  const fixture=mentalCrisesNativeFixture('tantrum',1),w=fixture.world,p=w.pawns.find(p=>p.id===fixture.aggressorId)!;
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  function frontier(checkpoint=false):void {
    expect(validateWorld(w)).toEqual([]);
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
    const result=decoder.adopt(structuredClone(encoder.encode(w,0,0,checkpoint)));
    if(result.status!=='applied')throw new Error(JSON.stringify(result));
    expect(result.world).toEqual(w);
  }
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:fixture.jobId,queue:false}).ok).toBe(true);frontier();
  let entered=false,wandered=false,finished=false,remaining:number=fixture.buildingIds.length;
  let lastRecovery:NonNullable<NonNullable<Pawn['melee']>['strike']>|undefined,lastMotion:Pawn['motion'],peer:World|undefined;
  for(let i=0;i<1800&&!finished;i++){
    const wasRecovering=!!p.melee?.strike;
    stepWorld(w);
    if(peer){stepWorld(peer);expect(peer).toEqual(w);}
    expect(validateWorld(w)).toEqual([]);
    const c=p.mental?.crisis;
    if(c?.kind==='tantrum')entered=true;
    const nextRemaining=fixture.buildingIds.filter(id=>w.structures.some(s=>s.id===id)).length;
    if(nextRemaining<remaining){
      remaining=nextRemaining;
      expect(p.melee?.strike?.structure).toBeDefined();
      if(!remaining){
        lastRecovery=structuredClone(p.melee!.strike!);lastMotion=structuredClone(p.motion);
        expect(p.melee!.order).toBeNull();expect(p.path).toEqual([]);expect(p.moveCooldown).toBe(0);
        peer=deserializeWorld(serializeWorld(w));
      }
      frontier(true);
    }
    if(lastRecovery&&w.tick*10<lastRecovery.untilCore){
      expect(p.melee?.strike).toEqual(lastRecovery);expect(p.motion).toEqual(lastMotion);expect(p.path).toEqual([]);expect(p.moveCooldown).toBe(0);
      if(c?.kind==='tantrum')expect(c.target).toBeNull();
    }
    if(wasRecovering&&!p.melee?.strike)frontier(true);
    if(!remaining&&!wandered&&c?.kind==='tantrum'&&c.target&&p.moveCooldown>0){
      expect(lastRecovery).toBeDefined();expect(w.tick*10).toBeGreaterThanOrEqual(lastRecovery!.untilCore);
      expect(p.melee?.strike).toBeUndefined();expect(p.motion!.start*10).toBeGreaterThanOrEqual(lastRecovery!.untilCore);
      wandered=true;frontier();peer=undefined;
    }
    if(entered&&!c){finished=true;frontier(true);}
  }
  expect(entered).toBe(true);expect(remaining).toBe(0);expect(lastRecovery).toBeDefined();expect(wandered).toBe(true);expect(finished).toBe(true);
  expect(p.mental!.catharsis.length).toBeGreaterThan(0);
});
