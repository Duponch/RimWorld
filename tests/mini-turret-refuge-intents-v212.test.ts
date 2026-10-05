import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { applyStructureExternalDamage } from '../src/sim/bomb-system.ts';
import { miniTurretExplosive } from '../src/sim/bomb-eligibility.ts';
import { validateBombRefuges } from '../src/sim/bomb-danger.ts';
import { newMiniTurretState } from '../src/sim/mini-turret-state.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { SMITHING_RESEARCH_COST,MACHINING_RESEARCH_COST,GUNSMITHING_RESEARCH_COST,GUN_TURRETS_RESEARCH_COST } from '../src/sim/research.ts';
import { considerFlee,processFlee,threatQueries } from '../src/sim/threats.ts';
import { enableRaids } from '../src/sim/raids.ts';
import { createRaidGroup } from '../src/sim/raid-spawn.ts';
import { processRaider } from '../src/sim/raid-behavior.ts';
import { resetTactics } from '../src/sim/tactics-state.ts';
import { validateTactics } from '../src/sim/tactics-save.ts';
import { processPrisoner } from '../src/sim/prisoners.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { search } from '../src/sim/work-planner.ts';
import { moveToward } from '../src/sim/travel.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { LightEnvironmentCache } from '../src/sim/light-environment.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { recruitmentUiFixture } from './scenarios/prison-camp.ts';
import type { Cell,Pawn,Structure,World } from '../src/sim/types.ts';

type Intent='flee'|'raid'|'tactics'|'escape';
const cases:readonly [Intent,string][]=[['flee','Flee path misses its target.'],['raid','Raid route misses its goal.'],
  ['tactics','Tactical path misses its post.'],['escape','Invalid prisoner escape intent or route.']];
const EMPTY:ReadonlySet<number>=new Set();
const destination=(p:Pawn,kind:Intent):Cell|null|undefined=>kind==='flee'?p.flee?.target:kind==='raid'?p.raid?.goal:kind==='tactics'?p.tactics?.post:p.prisoner?.escape;

function prepare(kind:Intent):{w:World;p:Pawn} {
  const light=new LightEnvironmentCache(),budget={remaining:4,pairs:32768};
  if(kind==='escape'){
    const {world:w,patientId}=recruitmentUiFixture(),p=w.pawns.find(p=>p.id===patientId)!;
    // The recovered fixture retains its previous health-interruption cooldown.
    // Prepare the next ordinary decision, without inventing an escape intent.
    p.planCooldown=0;expect(p.state).toBe('idle');expect(validateWorld(w)).toEqual([]);
    w.structures=w.structures.filter(s=>s.kind!=='door');
    processPrisoner(w,p,{search:goals=>search(w,p,blockedCells(w),EMPTY,budget,goals),
      move:(target,exact)=>moveToward(w,p,target,true,()=>blockedCells(w),budget,exact,()=>light.read(w)),
      release:()=>releaseWork(w,p),event:message=>w.events.push({tick:w.tick,type:'need',message})});
    expect(p.prisoner?.escape).toBeDefined();return {w,p};
  }
  const w=medicalCamp(kind==='flee'?2:1,64),colonist=w.pawns[0]!;
  if(kind==='flee'){
    Object.assign(colonist,{x:16,z:32});Object.assign(w.pawns[1]!,{x:22,z:32,faction:'outlaws'});
    expect(applyCommand(w,{type:'hostility-response',pawnId:colonist.id,response:'flee'})).toMatchObject({ok:true});
    const context=threatQueries(w);considerFlee(w,colonist,context);
    expect(colonist.flee).toBeDefined();processFlee(w,colonist,context,()=>blockedCells(w),budget,()=>light.read(w));
    return {w,p:colonist};
  }
  Object.assign(colonist,{x:kind==='raid'?2:55,z:kind==='raid'?2:32,hostilityResponse:'ignore'});
  enableRaids(w);
  expect(createRaidGroup(w,{count:1,sites:[{x:kind==='raid'?63:0,z:32}],random:{rng:81733}})).not.toBeNull();
  const p=w.pawns.find(p=>p.raid)!;
  if(kind==='tactics')addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');
  processRaider(w,p,()=>blockedCells(w),budget,()=>light.read(w));
  if(kind==='raid'){expect(p.tactics).toBeUndefined();expect(p.raid?.goal).not.toBeNull();}
  else {expect(p.tactics?.targetId).toBe(colonist.id);expect(p.tactics?.post).not.toBeNull();}
  return {w,p};
}

function installSource(w:World,p:Pawn):Structure {
  w.research??={project:null,points:0};w.research.project=null;
  Object.assign(w.research,{smithing:{points:SMITHING_RESEARCH_COST,completedAt:0},machining:{points:MACHINING_RESEARCH_COST,completedAt:0},
    gunsmithing:{points:GUNSMITHING_RESEARCH_COST,completedAt:0},gunTurrets:{points:GUN_TURRETS_RESEARCH_COST,completedAt:0}});
  const cell=[[0,1],[1,0],[0,-1],[-1,0]].map(([dx,dz])=>({x:p.x+dx!,z:p.z+dz!})).find(c=>
    c.x>=0&&c.x<w.width&&c.z>=0&&c.z<w.height&&!w.structures.some(s=>footprintCells(s).some(v=>v.x===c.x&&v.z===c.z))
    &&!w.pawns.some(q=>q.x===c.x&&q.z===c.z))!;
  expect(cell).toBeDefined();const source:Structure=fixtureBuilding(w,'mini-turret',cell.x,cell.z);
  while(!miniTurretExplosive(source.id))source.id=w.nextId++;
  source.material='steel';source.power=newPowerState(source.kind);source.turret=newMiniTurretState();source.turret.holdFire=true;
  return source;
}

function adopt(decoder:SnapshotDecoder,packet:SnapshotMessage):World {
  const result=decoder.adopt(packet);expect(result.status,JSON.stringify(result.status==='resync'?result:undefined)).toBe('applied');
  if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;
}

test.each(cases)('%s keeps its interrupted mandate while a real fuse gives the route to refuge', (kind,error)=>{
  const {w,p}=prepare(kind),edge=structuredClone(p.motion),oldTarget=structuredClone(destination(p,kind));
  expect(edge).toBeDefined();expect(edge).not.toBeNull();expect(p.moveCooldown).toBeGreaterThan(0);expect(p.path.length).toBeGreaterThan(0);
  expect(validateWorld(w)).toEqual([]);
  const source=installSource(w,p),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  function frontier(checkpoint=false):void {
    expect(validateWorld(w),`World ${kind} at ${w.tick}`).toEqual([]);
    expect(adopt(decoder,structuredClone(encoder.encode(w,0,1,checkpoint)))).toEqual(w);
  }
  expect(source.damage).toBeUndefined();expect(source.turret!.wick).toBeUndefined();
  expect(applyStructureExternalDamage(w,source,80,80,'bullet',w.rng,w.tick*10)).toBe(true);
  expect(source.turret!.wick).toBeDefined();frontier(true);
  let peer=deserializeWorld(serializeWorld(w));
  for(let n=0;n<16&&!p.bombRefuge;n++){
    stepWorld(w);stepWorld(peer);expect(peer).toEqual(w);frontier();
    if(w.tick<edge!.end){expect(p.motion).toEqual(edge);expect(p.bombRefuge).toBeUndefined();}
  }
  expect(p.bombRefuge).toBeDefined();expect(w.tick).toBeGreaterThanOrEqual(edge!.end);
  expect(p.path.length).toBeGreaterThan(0);expect(p.path.at(-1)).toEqual(p.bombRefuge!.target);
  expect(p.bombRefuge!.target).not.toEqual(oldTarget);expect(destination(p,kind)).toEqual(oldTarget);
  expect(p.melee?.order).toBeUndefined();expect(p.shooting?.order).toBeUndefined();frontier(true);

  // The old mandate cannot authorize a route that misses the refuge target.
  function forgeRoute(q:Pawn):void {
    const end={...q.path.at(-1)!};q.bombRefuge!.target={x:source.x<w.width/2?w.width-2:1,z:1};
    if(kind==='flee')q.flee!.target=end;
    else if(kind==='raid')q.raid!.goal=end;
    else if(kind==='tactics')q.tactics!.post=end;
    // A prison escape must retain its real border cell, not an interior post.
  }
  const forged=structuredClone(w);forgeRoute(forged.pawns.find(q=>q.id===p.id)!);
  expect(validateBombRefuges(forged)).toContain('Bomb refuge route misses its target.');
  expect(validateWorld(forged)).toContain(error);expect(()=>deserializeWorld(JSON.stringify(forged))).toThrow();
  const good=structuredClone(encoder.encode(w,0,1,true)),bad=structuredClone(good);forgeRoute(bad.world.pawns.find(q=>q.id===p.id)!);
  expect(decoder.adopt(bad)).toMatchObject({status:'resync',reason:'Refuge ou danger Bomb incohérent.'});expect(adopt(decoder,good)).toEqual(w);
  if(kind==='tactics'){
    const inactive=structuredClone(w),actor=inactive.pawns.find(q=>q.id===p.id)!;resetTactics(actor);
    expect(validateWorld(inactive)).toEqual([]);expect(deserializeWorld(serializeWorld(inactive))).toEqual(inactive);
    actor.tactics!.reviewAtCore=inactive.tick*10+1;
    expect(validateTactics(inactive)).toContain('Inactive tactical actor retains engagement.');
  }
  peer=deserializeWorld(serializeWorld(w));
  for(let n=0;n<8;n++){stepWorld(w);stepWorld(peer);expect(peer).toEqual(w);frontier();}
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);frontier(true);
});
