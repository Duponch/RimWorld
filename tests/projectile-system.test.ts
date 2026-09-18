import { withoutShootingSkills,withMigratedShootingSkills } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { registerWorldProjectile,advanceWorldProjectiles } from '../src/sim/projectile-system';
import { createBulletFlight } from '../src/sim/bullet-flight';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { CORE_TICKS_PER_LOCAL,revolverProfile } from '../src/sim/ranged-statistics';
import { resolveUnarmoredBullet } from '../src/sim/bullet-impact';
import { createMedicalRecord } from '../src/sim/injury-state';
import { healthRandom } from '../src/sim/health';
import { PresentationChanges } from '../src/bridge/presentation-changes';
import { captureProjectileBatch } from '../src/sim/projectile-batch';
import { captureWorldProjectileTargets } from '../src/sim/projectile-world';
import { addGroundMaterial } from '../src/sim/materials';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { medicalCamp } from './scenarios/health';
import { fixtureBuilding } from './scenarios/deconstruction';
import { SCHEMA_VERSION,type Cell,type World } from '../src/sim/types';

function camp(){const w=medicalCamp(2);Object.assign(w.pawns[0],{x:5,z:10});Object.assign(w.pawns[1],{x:25,z:10});return w;}
function launch(w:World,from:Cell=w.pawns[0],to:Cell=w.pawns[1],key:string|null=`pawn:${w.pawns[1].id}`){
  return registerWorldProjectile(w,createBulletFlight({origin:{x:from.x+.5,z:from.z+.5},destination:{x:to.x+.5,z:to.z+.5},launcherKey:`pawn:${w.pawns[0].id}`,equipmentKey:null,intendedKey:key,usedKey:key,flags:7,preventFriendlyFire:false,speedPerCoreTick:.55}),'normal',{friendlyPawnIds:w.pawns.map(p=>p.id),friendlyFireFactor:.4});
}

test('real stepWorld, strict saves and snapshots carry one moving-target impact exactly once',()=>{
  const w=camp(),p=w.pawns[1],projectile=launch(w),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),changes=new PresentationChanges();
  expect(validateWorld(w)).toEqual([]);expect(changes.capture(w)).toBe(true);
  const old=structuredClone(encoder.encode(w,0,1));decoder.adopt(old);const saved=serializeWorld(w),replays=[deserializeWorld(saved)];
  const command={type:'draft' as const,pawnIds:[p.id],enabled:true},move={type:'draft-move' as const,pawnIds:[p.id],target:{x:25,z:15},queue:false};
  for(const state of [w,...replays]){expect(applyCommand(state,command).ok).toBe(true);expect(applyCommand(state,move).ok).toBe(true);}
  let arrivalCount=0;
  for(let i=0;i<8;i++) {
    stepWorld(w);for(const replay of replays)stepWorld(replay);for(const replay of replays)expect(replay).toEqual(w);
    expect(validateWorld(w)).toEqual([]);const result=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
    const shot=w.projectiles?.[0];if(shot?.arrival){arrivalCount++;expect(shot.arrival).toMatchObject({effect:'pawn',targetKey:`pawn:${p.id}`,coreTick:37});expect(shot.flight.destination).toEqual({x:25.5,z:10.5});expect(p.z).toBeGreaterThan(10);expect(p.health?.injuries.some(i=>i.kind==='gunshot')).toBe(true);expect(changes.capture(w)).toBe(true);}
    replays.push(deserializeWorld(serializeWorld(w)));
  }
  expect(arrivalCount).toBe(1);expect(w.projectiles).toBeUndefined();expect(projectile.emittedAtCore).toBe(3000*CORE_TICKS_PER_LOCAL);
  expect(old.kind==='checkpoint'&&old.world.projectiles?.[0].flight.remainingCoreTicks).toBe(37); // immutable transport snapshot
});

test('Core substep ordering beats array completion order, and a lethal impact invalidates the next target capture',()=>{
  const w=camp(),target=w.pawns[1];let seed=1;
  for(;seed<100000;seed++){const r={rng:seed},hit=resolveUnarmoredBullet(createMedicalRecord(w.tick+1),{damage:12},()=>healthRandom(r));if(hit.record.death)break;}
  expect(seed).toBeLessThan(100000);w.rng=seed;
  // Earlier ID takes ten Core ticks; later ID hits on four. No flyby candidate.
  const far=launch(w,{x:20,z:10}),near=launch(w,{x:23,z:10});
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(copy);
  expect(w).toEqual(copy);expect(target.state).toBe('dead');
  expect(near.arrival).toMatchObject({effect:'pawn',coreTick:4});expect(far.arrival).toMatchObject({effect:'ground',coreTick:10,targetKey:null});
  expect(validateWorld(w)).toEqual([]);
  const stable=serializeWorld(w),rng=w.rng;advanceWorldProjectiles(w);expect(serializeWorld(w)).toBe(stable);expect(w.rng).toBe(rng);
  const terminal=deserializeWorld(stable);stepWorld(w,10);stepWorld(terminal,10);expect(w).toEqual(terminal);expect(w.projectiles).toBeUndefined();
});

test('a newly inserted obstruction and disappeared target are observed; exits and unresolved object impacts stay distinct',()=>{
  const w=camp();w.pawns[1].z=15;
  const shot=launch(w,{x:5,z:10},{x:25,z:10},null);stepWorld(w);
  const wall=fixtureBuilding(w,'wall',16,10); // changed between captures, not on the firing path initially
  const copy=deserializeWorld(serializeWorld(w));for(let i=0;i<4&&!shot.arrival;i++){stepWorld(w);stepWorld(copy);}
  expect(copy).toEqual(w);expect(shot.arrival).toMatchObject({effect:'unsupported-object',targetKey:`structure:${wall.id}`});expect(w.structures.find(s=>s.id===wall.id)).toEqual(wall);expect(validateWorld(w)).toEqual([]);
  const out=camp();out.pawns[1].z=15;const exit=launch(out,{x:30,z:10},{x:34,z:10},null);stepWorld(out);
  expect(exit.arrival).toMatchObject({kind:'exit',effect:'exit',targetKey:null});expect(exit.arrival!.point.x).toBeLessThan(out.width);expect(validateWorld(out)).toEqual([]);
  const vanished=camp(),lost=launch(vanished);vanished.pawns.pop();for(let i=0;i<4;i++)stepWorld(vanished);
  expect(lost.arrival).toMatchObject({effect:'ground'});expect(validateWorld(vanished)).toEqual([]);
});

test('registration is atomic; launch data is owned; V54 is validated before migration; corrupt flight envelopes are rejected',()=>{
  const w=camp(),legacy=structuredClone(w) as unknown as Record<string,unknown>;legacy.schemaVersion=54;withoutShootingSkills(legacy);
  expect(deserializeWorld(JSON.stringify(legacy))).toEqual(withMigratedShootingSkills({...legacy,schemaVersion:SCHEMA_VERSION}));
  const before=serializeWorld(w),next=w.nextId;
  expect(()=>launch(w,{x:-1,z:10})).toThrow();expect(serializeWorld(w)).toBe(before);expect(w.nextId).toBe(next);
  const shot=launch(w),saved=serializeWorld(w);expect(()=>deserializeWorld(saved.replace(`"schemaVersion":${SCHEMA_VERSION}`,'"schemaVersion":54'))).toThrow(/version 54/);
  const mutations:Array<(v:World)=>void>=[
    v=>{v.projectiles![0].flight.remainingCoreTicks--;},v=>{v.projectiles![0].flight.completed=true;},v=>{v.projectiles![0].advancedAtCore--;},v=>{v.projectiles![0].emittedAtCore++;},
    v=>{v.projectiles![0].id=v.pawns[0].id;},v=>{v.projectiles![0].relations.friendlyPawnIds.reverse();},v=>{v.projectiles![0].relations.friendlyFireFactor=2;},v=>{v.projectiles![0].flight.speedPerCoreTick=2;},
    v=>{v.projectiles![0].flight.origin.x=NaN;},v=>{v.projectiles![0].arrival={kind:'impact',targetKey:null,point:{x:1,z:1},coreTick:1,effect:'ground'};},v=>{v.projectiles!.push(structuredClone(v.projectiles![0]));},v=>{v.projectiles=[];},
  ];
  for(const mutate of mutations){const bad=JSON.parse(saved) as World;mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  const plan=createBulletFlight({...shot.flight});const ids=w.pawns.map(p=>p.id),relations={friendlyPawnIds:ids,friendlyFireFactor:1};const owned=registerWorldProjectile(w,plan,'normal',relations);plan.origin.x=0;ids.length=0;expect(owned.flight.origin.x).toBe(5.5);expect(owned.relations.friendlyPawnIds).toHaveLength(2);
  expect(validateWorld(w)).toEqual([]);expect(revolverProfile(owned.quality).damage).toBe(12);
});

test('medical-batch overlay equals a full fresh capture, preserving old views and canonical candidate order',()=>{
  const w=camp(),victim=w.pawns[1],friends=new Set(w.pawns.map(p=>p.id));
  fixtureBuilding(w,'wall',12,12);w.tiles[10*32+16]={terrain:'rock',stone:'granite'};
  w.resources.push({id:w.nextId++,kind:'tree',x:10,z:10,amount:12});
  addGroundMaterial(w,'wood',5,{x:10,z:10},'wood');addGroundMaterial(w,'food',2,{x:25,z:10},'rice');
  const pile=w.piles.at(-1)!;pile.owner={type:'pawn',pawnId:victim.id};
  const batch=captureProjectileBatch(w),original=batch.refresh(w)(friends,.4);
  const compare=()=>{
    const actual=batch.refresh(w)(friends,.4),oracle=captureWorldProjectileTargets(w).scene(friends,.4);
    for(let z=0;z<32;z++)for(let x=0;x<32;x++){const cell={x,z};expect(actual.at(cell)).toEqual(oracle.at(cell));for(const target of oracle.at(cell))expect(actual.target(target.key)).toEqual(target);}
    return actual;
  };
  compare();victim.state='downed';pile.owner={type:'ground',x:25,z:10};w.piles.reverse();w.pawns.reverse();const after=compare();
  expect(original.target(`pawn:${victim.id}`)).toMatchObject({standing:true});expect(after.target(`pawn:${victim.id}`)).toMatchObject({standing:false});
  expect(original.target(`pile:${pile.id}`)).toBeUndefined();expect(after.target(`pile:${pile.id}`)).toBeDefined();
  victim.state='dead';compare();expect(after.target(`pawn:${victim.id}`)).toBeDefined();
  w.width=33;expect(()=>batch.refresh(w)).toThrow(/another map/);expect(original.at({x:32,z:0})).toEqual([]);
});
