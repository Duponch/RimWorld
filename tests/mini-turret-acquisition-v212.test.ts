import { expect,test,vi } from 'vitest';
import { startBerserk } from '../src/sim/mental-break.ts';
import { factionRelation,hostileTo } from '../src/sim/affiliation.ts';
import { createPrisonerState } from '../src/sim/prisoner-state.ts';
import { enableWildlife } from '../src/sim/wildlife.ts';
import { startAnimalManhunter } from '../src/sim/animal-manhunter.ts';
import { findShotLine,type ShotGrid } from '../src/sim/combat-space.ts';
import { advanceTurretOwner,captureTurretTargets,turretCandidate,turretTargetAllowed,turretHashDue } from '../src/sim/mini-turret.ts';
import * as turretModule from '../src/sim/mini-turret.ts';
import { advanceWorldCombat } from '../src/sim/combat-system.ts';
import { newMiniTurretState } from '../src/sim/mini-turret-state.ts';
import { MINI_TURRET_PROFILE } from '../src/sim/mini-turret-profile.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { fixturePower } from './scenarios/power.ts';
import { campTurret,miniTurretCamp,miniTurretQueries } from './scenarios/mini-turret-v212.ts';
import type { Structure } from '../src/sim/types.ts';

test('machine admission uses pure faction relation, not involuntary Berserk hostility or a universal sleep guard',()=>{
  const w=miniTurretCamp(),s=campTurret(w),colon=w.pawns[0]!,pirate=w.pawns[1]!,neutral=w.pawns[2]!;
  expect(startBerserk(w,colon)).toBe(true);Object.assign(colon,{x:18,z:32});
  const neutralRage={...structuredClone(colon),faction:'outlanders' as const};
  expect(hostileTo(colon,pirate)).toBe(true);expect(hostileTo(neutralRage,pirate)).toBe(true);
  expect(factionRelation('colony','outlanders')).toBe('neutral');
  expect(turretTargetAllowed(colon)).toBe(false);expect(turretTargetAllowed(neutralRage)).toBe(false);expect(turretTargetAllowed(neutral)).toBe(false);
  expect(turretCandidate(w,s,miniTurretQueries(w))?.key).toBe(`pawn:${pirate.id}`);
  pirate.state='sleeping';expect(turretTargetAllowed(pirate)).toBe(true);
  expect(turretCandidate(w,s,miniTurretQueries(w))?.key).toBe(`pawn:${pirate.id}`);
  pirate.prisoner=createPrisonerState(w,pirate);expect(turretCandidate(w,s,miniTurretQueries(w))).toBeUndefined();
  delete pirate.prisoner;pirate.state='downed';expect(turretTargetAllowed(pirate)).toBe(false);
  delete w.wildlife;w.resources.push({id:w.nextId++,kind:'berries',x:20,z:32,amount:10,growth:1,growthTick:w.tick});
  enableWildlife(w,1);const animal=w.wildlife!.animals[0]!;Object.assign(animal,{x:20,z:32});
  expect(startAnimalManhunter(w,animal)).toBe(true);expect(turretCandidate(w,s,miniTurretQueries(w))?.key).toBe(`animal:${animal.id}`);
  animal.domestic={since:w.tick,care:'best',tameness:1,nextDecay:w.tick+6000};expect(turretTargetAllowed(animal)).toBe(false);
});

test('nearest distance then ID is exact and read-only, range and full wall differ from low cover',()=>{
  const w=miniTurretCamp(),s=campTurret(w),pirate=w.pawns[1]!,other=structuredClone(pirate);other.id=w.nextId++;w.pawns.push(other);
  Object.assign(pirate,{x:44,z:39});Object.assign(other,{x:44,z:39});w.pawns.reverse();
  const before=JSON.stringify(w),queries=miniTurretQueries(w);
  expect(turretCandidate(w,s,queries)?.key).toBe(`pawn:${pirate.id}`);expect(turretCandidate(w,s,queries)?.key).toBe(`pawn:${pirate.id}`);expect(JSON.stringify(w)).toBe(before);
  pirate.z=40;other.z=40;expect(turretCandidate(w,s,miniTurretQueries(w))).toBeUndefined();
  pirate.z=32;other.z=32;
  const wall=fixtureBuilding(w,'wall',26,32);expect(turretCandidate(w,s,miniTurretQueries(w))).toBeUndefined();
  w.structures=w.structures.filter(v=>v!==wall);const sac:Structure=fixtureBuilding(w,'sandbags',43,32);sac.material='cloth';
  expect(turretCandidate(w,s,miniTurretQueries(w))?.key).toBe(`pawn:${pirate.id}`);
  Object.assign(other,{x:20,z:32});expect(turretCandidate(w,s,miniTurretQueries(w))?.key).toBe(`pawn:${other.id}`);
});

test('fixed Structure origin cannot borrow human leaning, whose historical default remains enabled',()=>{
  const grid:ShotGrid={width:32,height:32,blocksSight:(x,z)=>x===11&&z===10,coverAt:()=>undefined};
  const from={x:10,z:10},target={cell:{x:20,z:10},leans:false};
  expect(findShotLine(grid,from,target,MINI_TURRET_PROFILE.range).ok).toBe(true);
  expect(findShotLine(grid,from,target,MINI_TURRET_PROFILE.range,0,false)).toEqual({ok:false,reason:'blocked'});
});

test('shared sparse candidate index keeps private owners and removes only dominated cell/posture ties, without starvation by one population',()=>{
  const w=miniTurretCamp(),s=campTurret(w),pirate=w.pawns[1]!;
  for(let i=0;i<1000;i++){const p=structuredClone(pirate);p.id=w.nextId++;w.pawns.push(p);}
  w.pawns.reverse();const index=captureTurretTargets(w),before=JSON.stringify(w),queries={...miniTurretQueries(w),turretTargets:()=>index};
  expect(index.near(s,28.9)).toHaveLength(1);expect(index.target(`pawn:${w.pawns[0]!.id}`)).toBe(w.pawns[0]);
  const budget={remaining:8,pairs:32768};expect(turretCandidate(w,s,queries,budget)?.key).toBe(`pawn:${pirate.id}`);
  expect(budget).toEqual({remaining:7,pairs:32766});expect(JSON.stringify(w)).toBe(before);
  const exhausted={remaining:0,pairs:32768};expect(advanceTurretOwner(w,s,w.tick*10,queries,exhausted)).toEqual({changed:false,deferred:true});
  expect(s.turret!.warmup).toBeNull();expect(JSON.stringify(w)).toBe(before);
  expect(turretCandidate(w,s,queries,{remaining:1,pairs:1})).toBeNull();expect(JSON.stringify(w)).toBe(before);
  const largeId=Number.MAX_SAFE_INTEGER-2,core=15-largeId%15;
  expect(turretHashDue({id:largeId},core)).toBe(true);expect(turretHashDue({id:largeId},core+1)).toBe(false);
});

test('the real shared acquisition quota eventually completes every one of 24 due owners, including the last IDs',()=>{
  const w=miniTurretCamp(),pirate=structuredClone(w.pawns[1]!);w.pawns=w.pawns.filter(p=>p.faction!=='outlaws');w.structures=[];
  const generators=[fixturePower(w,'wood-generator',27,31),fixturePower(w,'wood-generator',38,31),fixturePower(w,'wood-generator',32,26)];
  const guns:Structure[]=[];
  for(let z=30;z<34;z++)for(let x=30;x<36;x++){
    w.nextId+=(15-w.nextId%15)%15;
    const s:Structure=fixtureBuilding(w,'mini-turret',x,z);s.material='steel';s.power={on:true,parentId:generators[guns.length%3]!.id};s.turret=newMiniTurretState();guns.push(s);
  }
  // Two opaque rings block every line, including a human target's lean. Every
  // distinct candidate remains within the real range of all 24 machines.
  for(let z=28;z<=35;z++)for(let x=28;x<=37;x++)if(x<30||x>35||z<30||z>33)fixtureBuilding(w,'wall',x,z);
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++){
    if(x>=28&&x<=37&&z>=28&&z<=35||guns.some(s=>(s.x-x)**2+(s.z-z)**2>MINI_TURRET_PROFILE.range**2))continue;
    const p=structuredClone(pirate);p.id=w.nextId++;Object.assign(p,{x,z});w.pawns.push(p);
  }
  const candidates=w.pawns.filter(p=>p.faction==='outlaws').length;
  expect(candidates).toBeGreaterThan(2048);expect(candidates*2).toBeLessThan(32768);
  // The scheduler must also ignore the input array's order. Observation wraps
  // the real index iterator; it changes neither queries, budgets nor outcomes.
  w.structures.reverse();const completed=new Set<number>(),perPass:number[]=[];let passCompleted=0;
  const capture=turretModule.captureTurretTargets;
  const spy=vi.spyOn(turretModule,'captureTurretTargets').mockImplementation(world=>{
    const real=capture(world);return {...real,near(center,range){
      const values=[...real.near(center,range)],id=(center as Structure).id;
      values[Symbol.iterator]=function*(){for(let i=0;i<values.length;i++)yield values[i]!;completed.add(id);passCompleted++;return undefined;};
      return values;
    }};
  });
  try{
    // 36 real local combat passages contain exactly 24 Core15 opportunities.
    // No replacement acquisition budget is supplied to the production owner.
    for(let i=0;i<36;i++){passCompleted=0;w.tick++;advanceWorldCombat(w);perPass.push(passCompleted);}
    expect([...completed].sort((a,b)=>a-b)).toEqual(guns.map(s=>s.id));
    expect(perPass.some(n=>n>0&&n<8)).toBe(true);
    expect(guns.every(s=>s.turret!.ammoQ===240&&s.turret!.warmup===null&&s.turret!.burst===null)).toBe(true);
    expect(w.projectiles).toBeUndefined();
  }finally{spy.mockRestore();}
});
