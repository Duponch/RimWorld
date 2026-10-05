import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import { equippedWeapon } from '../src/sim/equipment-rules.ts';
import { injurePawn } from '../src/sim/health.ts';
import { advanceShooter,shootingQueries } from '../src/sim/shooting.ts';
import type { World } from '../src/sim/types.ts';
import { prepareShootingStun,produceShootingStunImpact,type ShootingStunPhase } from './scenarios/shooting-stun-v220.ts';

// Root certified these initial seeds with the unchanged V219 real producers:
// tmp/stun-next/seed-evidence.json. There is no search or reroll in these tests.
const cases:{phase:ShootingStunPhase;seed:number;origin:number;deadline:number;hit:number;stunEnd:number}[]=[
  {phase:'aim',seed:12,origin:30000,deadline:30018,hit:30011,stunEnd:30056},
  {phase:'cooldown',seed:26,origin:30018,deadline:30114,hit:30081,stunEnd:30126},
];
const commandCases=cases.flatMap(c=>['stop','undraft'].map(action=>({...c,action})));

test.each(cases)('$phase: a real survivable Blunt stun preserves paid Core, saves and resumes exactly',({phase,seed,origin,deadline,hit,stunEnd})=>{
  const fixture=prepareShootingStun(seed,phase),w=fixture.world,shooter=w.pawns.find(p=>p.id===fixture.shooterId)!;
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),copies:World[]=[],captured=new Set<number>();
  const checkpoint=(retain=false)=>{
    expect(validateWorld(w)).toEqual([]);
    const saved=deserializeWorld(serializeWorld(w));expect(saved).toEqual(w);
    const received=decoder.adopt(structuredClone(encoder.encode(w,0,6,retain)));
    expect(received.status).toBe('applied');if(received.status==='applied')expect(received.world).toEqual(w);
    if(retain&&!captured.has(w.tick)){captured.add(w.tick);copies.push(saved);}
  };
  expect(fixture.before).toEqual({phase,startedAtCore:origin,endsAtCore:deadline});
  expect(fixture.beforeImpactCore).toBe(hit-1);
  const xpBefore=shooter.skills.shooting.xp;
  checkpoint(true);
  const evidence=produceShootingStunImpact(fixture);
  for(const copy of copies)expect(produceShootingStunImpact({...fixture,world:copy})).toEqual(evidence);
  expect(evidence).toMatchObject({eligible:true,strike:{outcome:'hit',tool:'left-fist',atCore:hit},stun:{sinceCore:hit,untilCore:stunEnd},moving:1,manipulation:1,armed:true,targetMobile:true});
  expect(evidence.injuries).toEqual([{part:'head',kind:'bruise',severity:phase==='aim'?9703:8662}]);
  expect(w.pawns.find(p=>p.id===fixture.attackerId)!.melee?.order).toBeNull();
  for(const copy of copies)expect(copy).toEqual(w);

  // The shooter has the lower ID and already paid Core U when the attacker
  // strikes at U. Only subsequent owner passes U+1..until-1 are suspended.
  // This oracle uses those physical boundaries, never a clock helper result.
  const pausedAt=(core:number)=>Math.max(0,Math.min(core,stunEnd-1)-hit);
  const pause=stunEnd-hit-1;
  const resumedDeadline=deadline+pause;
  const emissionCore=resumedDeadline+(phase==='cooldown'?18:0);
  expect(pause).toBe(44);
  expect(shooter.shooting?.stance?.phase).toBe(phase);
  expect(shooter.shooting?.stance?.startedAtCore).toBe(origin);
  expect(shooter.shooting?.stance?.endsAtCore).toBe(deadline+pausedAt(w.tick*10));
  expect(shooter.shooting?.order).toMatchObject({targetId:fixture.targetId,weaponId:fixture.weaponId});
  expect(shooter.skills.shooting.xp).toBe(xpBefore);
  checkpoint(true);
  // Drafting/hunting also consult this owner at the published Core. Such a
  // revalidation is not another scheduler pass or another paid pause.
  const beforeRevalidation=structuredClone(w);
  for(let n=0;n<3;n++)advanceShooter(w,shooter,w.tick*10,shootingQueries(w));
  expect(w).toEqual(beforeRevalidation);

  const frontiers=new Set([
    Math.floor(deadline/10)*10+10,
    Math.floor((stunEnd-1)/10)*10,
    Math.ceil(stunEnd/10)*10,
    Math.ceil(resumedDeadline/10)*10,
    Math.ceil(emissionCore/10)*10,
  ]);
  const emissions=new Set<number>();let crossedOldDeadline=false,restoredAfterStun=false;
  while(w.tick*10<emissionCore){
    stepWorld(w);for(const copy of copies){stepWorld(copy);expect(copy).toEqual(w);}
    const core=w.tick*10,stance=shooter.shooting?.stance;
    expect(equippedWeapon(w,shooter)?.id).toBe(fixture.weaponId);
    expect(shooter.state).toBe('idle');expect(shooter.motion).toBeUndefined();
    if(core<resumedDeadline){
      expect(stance?.phase).toBe(phase);
      expect(stance?.startedAtCore).toBe(origin);
      expect(stance?.endsAtCore).toBe(deadline+pausedAt(core));
    }else if(core<emissionCore){
      expect(stance).toMatchObject({phase:'aim',startedAtCore:resumedDeadline,endsAtCore:emissionCore});
    }
    if(core>deadline&&core<stunEnd){
      crossedOldDeadline=true;expect(stance?.phase).toBe(phase);
      expect(shooter.stun?.untilCore).toBe(stunEnd);
    }
    if(core>=stunEnd&&core<emissionCore){restoredAfterStun=true;expect(shooter.stun).toBeUndefined();}
    if(core<emissionCore){
      expect(shooter.skills.shooting.xp).toBe(xpBefore);
      expect(shooter.lastAttack?.atCore??-1).toBeLessThan(hit);
    }
    for(const bullet of w.projectiles??[])if(bullet.flight.launcherKey===`pawn:${shooter.id}`&&bullet.emittedAtCore>hit)emissions.add(bullet.emittedAtCore);
    checkpoint(frontiers.has(core));
  }
  // Aim's first post-impact publication has already crossed its old deadline.
  if(phase==='aim')crossedOldDeadline ||=fixture.beforeImpactCore+10>deadline&&fixture.beforeImpactCore+10<stunEnd;
  expect(crossedOldDeadline).toBe(true);expect(restoredAfterStun).toBe(true);
  expect([...emissions]).toEqual([emissionCore]);
  expect(shooter.lastAttack?.atCore).toBe(emissionCore);
  expect(shooter.skills.shooting.xp).toBe(xpBefore+38000);
  expect(shooter.shooting?.stance).toMatchObject({phase:'cooldown',startedAtCore:emissionCore,endsAtCore:emissionCore+96});

  // Explicit stop cannot refund the new recovery. The emitted projectile and
  // the head wound remain real while every retained checkpoint pays its tail.
  const beforeStopRng=w.rng;
  expect(applyCommand(w,{type:'draft-stop',pawnIds:[shooter.id]}).ok).toBe(true);
  for(const copy of copies){expect(applyCommand(copy,{type:'draft-stop',pawnIds:[shooter.id]}).ok).toBe(true);expect(copy).toEqual(w);}
  expect(w.rng).toBe(beforeStopRng);
  expect(shooter.shooting?.order).toBeNull();
  expect(shooter.shooting?.stance?.endsAtCore).toBe(emissionCore+96);
  checkpoint(true);
  while(w.tick*10<emissionCore+96){
    stepWorld(w);for(const copy of copies){stepWorld(copy);expect(copy).toEqual(w);}
    if(w.tick*10<emissionCore+96)expect(shooter.shooting?.stance).toMatchObject({phase:'cooldown',startedAtCore:emissionCore,endsAtCore:emissionCore+96});
    checkpoint();
  }
  expect(shooter.shooting).toBeUndefined();
  expect(shooter.health?.injuries.some(i=>i.part==='head')).toBe(true);
  checkpoint(true);stepWorld(w);
  for(const copy of copies){stepWorld(copy);expect(copy).toEqual(w);}
  checkpoint();
});

test.each(commandCases)('$action during real $phase stun cancels authority without refunding recovery',({phase,seed,origin,deadline,hit,stunEnd,action})=>{
  const fixture=prepareShootingStun(seed,phase),w=fixture.world;
  expect(produceShootingStunImpact(fixture).eligible).toBe(true);
  const shooter=w.pawns.find(p=>p.id===fixture.shooterId)!,xp=shooter.skills.shooting.xp;
  expect(shooter.stun).toEqual({sinceCore:hit,untilCore:stunEnd});
  expect(shooter.shooting?.stance?.phase).toBe(phase);
  const before=structuredClone(shooter.shooting!.stance),rng=w.rng;
  const result=action==='stop'
    ?applyCommand(w,{type:'draft-stop',pawnIds:[shooter.id]})
    :applyCommand(w,{type:'draft',pawnIds:[shooter.id],enabled:false});
  expect(result.ok).toBe(true);expect(w.rng).toBe(rng);
  expect(shooter.stun).toEqual({sinceCore:hit,untilCore:stunEnd});
  expect(!!shooter.draft).toBe(action==='stop');
  if(phase==='aim')expect(shooter.shooting).toBeUndefined();
  else {
    expect(shooter.shooting?.order).toBeNull();
    expect(shooter.shooting?.stance).toEqual(before);
  }
  const copy=deserializeWorld(serializeWorld(w)),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const end=deadline+stunEnd-hit-1;
  let passedOriginalEndWhileStunned=false;
  do {
    expect(validateWorld(w)).toEqual([]);
    const received=decoder.adopt(structuredClone(encoder.encode(w,0,6)));
    expect(received.status).toBe('applied');if(received.status==='applied')expect(received.world).toEqual(w);
    const core=w.tick*10;
    expect(shooter.skills.shooting.xp).toBe(xp);
    expect(shooter.lastAttack?.atCore??-1).toBeLessThan(hit);
    expect((w.projectiles??[]).some(b=>b.flight.launcherKey===`pawn:${shooter.id}`&&b.emittedAtCore>hit)).toBe(false);
    if(phase==='aim')expect(shooter.shooting).toBeUndefined();
    else if(core<end){
      const paused=Math.max(0,Math.min(core,stunEnd-1)-hit);
      expect(shooter.shooting?.stance).toMatchObject({phase:'cooldown',startedAtCore:origin,endsAtCore:deadline+paused});
      if(core>deadline&&core<stunEnd)passedOriginalEndWhileStunned=true;
    }
    stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  } while(w.tick*10<=end);
  if(phase==='cooldown')expect(passedOriginalEndWhileStunned).toBe(true);
  expect(shooter.shooting).toBeUndefined();expect(shooter.stun).toBeUndefined();
  expect(shooter.skills.shooting.xp).toBe(xp);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const received=decoder.adopt(structuredClone(encoder.encode(w,0,6,true)));
  expect(received.status).toBe('applied');if(received.status==='applied')expect(received.world).toEqual(w);
});

test.each(cases)('a prepared fatal clinical impact overrides the real $phase stun and drops the original weapon',({phase,seed})=>{
  const fixture=prepareShootingStun(seed,phase),w=fixture.world;
  expect(produceShootingStunImpact(fixture).eligible).toBe(true);
  const shooter=w.pawns.find(p=>p.id===fixture.shooterId)!;
  expect(shooter.shooting?.stance?.phase).toBe(phase);expect(shooter.stun).toBeDefined();
  const xp=shooter.skills.shooting.xp,deathTick=w.tick;
  // Explicit clinical preparation, not a second duel or a frequency claim:
  // the existing resolved-injury producer removes the real 10-HP vital brain,
  // reconciles death and performs the equipment drop without forcing state.
  injurePawn(w,shooter,'brain','crush',10000);
  expect(shooter.state).toBe('dead');expect(shooter.health?.death?.tick).toBe(deathTick);
  expect(shooter.shooting).toBeUndefined();expect(shooter.stun).toBeUndefined();
  expect(shooter.draft).toBeUndefined();expect(equippedWeapon(w,shooter)).toBeUndefined();
  expect(w.piles.filter(p=>p.id===fixture.weaponId)).toHaveLength(1);
  expect(w.piles.find(p=>p.id===fixture.weaponId)).toMatchObject({quantity:1,owner:{type:'ground'},weapon:{forbidden:true}});
  expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w)),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  for(let n=0;n<8;n++){
    const received=decoder.adopt(structuredClone(encoder.encode(w,0,6,n===0)));
    expect(received.status).toBe('applied');if(received.status==='applied')expect(received.world).toEqual(w);
    stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
    expect(shooter.shooting).toBeUndefined();expect(shooter.skills.shooting.xp).toBe(xp);
    expect(shooter.health?.death?.tick).toBe(deathTick);
    expect(w.piles.filter(p=>p.id===fixture.weaponId)).toHaveLength(1);
    expect(w.piles.find(p=>p.id===fixture.weaponId)?.owner.type).toBe('ground');
  }
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('a target dying during the real aim stun is retained only until active revalidation, without emission or XP',()=>{
  const fixture=prepareShootingStun(12,'aim'),w=fixture.world;
  const evidence=produceShootingStunImpact(fixture);expect(evidence.eligible).toBe(true);
  const shooter=w.pawns.find(p=>p.id===fixture.shooterId)!,target=w.pawns.find(p=>p.id===fixture.targetId)!;
  const xp=shooter.skills.shooting.xp,stunEnd=evidence.stun!.untilCore,deathTick=w.tick;
  expect(shooter.shooting?.stance?.phase).toBe('aim');
  // Real clinical death, explicitly prepared through the resolved-injury API.
  // The original human stays registered; no target or Thing is removed by hand.
  injurePawn(w,target,'brain','crush',10000);
  expect(target.state).toBe('dead');expect(target.health?.death?.tick).toBe(deathTick);
  const copy=deserializeWorld(serializeWorld(w)),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  while(w.tick*10<stunEnd){
    expect(shooter.stun?.untilCore).toBe(stunEnd);
    expect(shooter.shooting?.stance?.phase).toBe('aim');
    expect(shooter.shooting?.stance?.startedAtCore).toBe(fixture.before.startedAtCore);
    expect(shooter.shooting?.order?.targetId).toBe(target.id);
    expect(shooter.skills.shooting.xp).toBe(xp);
    expect(w.projectiles).toBeUndefined();expect(validateWorld(w)).toEqual([]);
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
    const received=decoder.adopt(structuredClone(encoder.encode(w,0,6)));
    expect(received.status).toBe('applied');if(received.status==='applied')expect(received.world).toEqual(w);
    stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  }
  expect(w.tick*10).toBe(30060);expect(shooter.stun).toBeUndefined();
  expect(shooter.shooting).toBeUndefined();expect(shooter.skills.shooting.xp).toBe(xp);
  expect(shooter.lastAttack).toBeUndefined();expect(w.projectiles).toBeUndefined();
  expect(w.pawns.find(p=>p.id===target.id)).toBe(target);
  expect(target.health?.death?.tick).toBe(deathTick);expect(validateWorld(w)).toEqual([]);
  const received=decoder.adopt(structuredClone(encoder.encode(w,0,6,true)));
  expect(received.status).toBe('applied');if(received.status==='applied')expect(received.world).toEqual(w);
  stepWorld(w,3);stepWorld(copy,3);expect(copy).toEqual(w);
  expect(shooter.shooting).toBeUndefined();expect(shooter.skills.shooting.xp).toBe(xp);
  expect(w.projectiles).toBeUndefined();expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
