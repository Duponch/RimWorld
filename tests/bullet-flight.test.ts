import { expect,test } from 'vitest';
import { advanceBulletFlight,bulletPosition,createBulletFlight,validateBulletFlight,type BulletFlight } from '../src/sim/bullet-flight';
import { PROJECTILE_HIT,flybyChance,projectileCanHit,projectileChance,resolveProjectileArrival,type ProjectilePolicy } from '../src/sim/projectile-rules';
import { ballisticObject,ballisticPawn,projectileRandom,projectileScene } from './scenarios/projectiles';
import { revolverProfile,projectileFlightTicks } from '../src/sim/ranged-statistics';
import { medicalCamp } from './scenarios/health';
import { damageUnarmoredPawnWithBullet } from '../src/sim/bullet-damage';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization';
import { emitRevolverBullet,wildMissCell,wildMissRadius,type BulletEmissionInput } from '../src/sim/bullet-emission';
import { shotAim } from '../src/sim/combat-report';
import type { ShotGrid } from '../src/sim/combat-space';

const policy:ProjectilePolicy={launcherKey:'shooter',intendedKey:'target',usedKey:'target',flags:PROJECTILE_HIT.all,preventFriendlyFire:false};
const origin={x:.5,z:10.5},destination={x:20.5,z:10.5};
const flight=(overrides:Partial<BulletFlight>={})=>createBulletFlight({...policy,equipmentKey:'weapon:5',origin,destination,speedPerCoreTick:revolverProfile('normal').projectileTilesPerCoreTick,...overrides});

test('permissions distinguish intended, incidental, covered and full targets across every flag combination',()=>{
  const pawn=ballisticPawn('target',20,10),wall=ballisticObject('target',20,10,1),otherPawn=ballisticPawn('other',18,10),otherWall=ballisticObject('wall',18,10,1);
  for(let flags=0;flags<=7;flags++) {
    const p={...policy,flags};
    expect(projectileCanHit(p,pawn)).toBe(!!(flags&1));
    expect(projectileCanHit(p,wall)).toBe(flags!==0); // Full intended target exception.
    expect(projectileCanHit(p,otherPawn)).toBe(!!(flags&2));expect(projectileCanHit(p,otherWall)).toBe(!!(flags&4));
    expect(projectileCanHit(p,{...wall,covered:true})).toBe(false);
    expect(projectileCanHit(p,{...wall,key:'shooter'})).toBe(false);
  }
  let draws=0;const random=()=>{draws++;return .5;};
  expect(projectileChance(0,random)).toBe(false);expect(projectileChance(1,random)).toBe(true);expect(projectileChance(1.5,random)).toBe(true);expect(draws).toBe(0);
  expect(projectileChance(.5,random)).toBe(false);expect(draws).toBe(1);
  for(const bad of [-.1,1,NaN,Infinity])expect(()=>projectileChance(.5,()=>bad)).toThrow();
});

test('fly-by and final-cell friendly fire, posture, open doors and low cover have different probabilities',()=>{
  const end={x:20,z:10},at={x:12,z:10};
  const pawn=ballisticPawn('other',12,10);if(pawn.kind!=='pawn')throw Error();pawn.friendly=true;
  expect(flybyChance(policy,pawn,origin,end,at,.4)).toBeCloseTo(.16,12);
  expect(flybyChance({...policy,preventFriendlyFire:true},pawn,origin,end,at,.4)).toBe(0);
  pawn.standing=false;expect(flybyChance(policy,pawn,origin,end,at,.4)).toBeCloseTo(.016,12);
  pawn.bodySize=10;expect(flybyChance(policy,pawn,origin,end,at,.4)).toBeCloseTo(.032,12);
  expect(flybyChance(policy,pawn,origin,end,{x:5,z:10},.4)).toBe(0);
  expect(flybyChance(policy,pawn,origin,end,{x:6,z:10},.4)).toBeCloseTo(.032*11/119,12);
  expect(flybyChance(policy,pawn,origin,end,end,.4)).toBe(0);
  expect(flybyChance(policy,ballisticObject('low',12,10,.2),origin,end,at,.4)).toBe(0);
  expect(flybyChance(policy,ballisticObject('chunk',12,10,.5),origin,end,at,.4)).toBe(.075);
  expect(flybyChance(policy,ballisticObject('chunk',19,10,.5),origin,end,{x:19,z:10},.4)).toBe(.5);
  expect(flybyChance(policy,ballisticObject('door',12,10,1,true),origin,end,at,.4)).toBe(.05);
  expect(flybyChance(policy,ballisticObject('door',12,10,1),origin,end,at,.4)).toBe(1);
  expect(flybyChance(policy,ballisticObject('door',5,10,1),origin,end,{x:5,z:10},.4)).toBe(0);
  expect(flybyChance({...policy,flags:1},ballisticObject('door',12,10,1),origin,end,at,.4)).toBe(0);
  const f=projectileScene(),friendly=ballisticPawn('other',20,10);if(friendly.kind!=='pawn')throw Error();friendly.friendly=true;f.set(friendly);f.scene.friendlyFireFactor=0;
  // The final-cell chance is .5; it does not acquire the fly-by difficulty gate.
  expect(resolveProjectileArrival({...policy,usedKey:null,preventFriendlyFire:true},origin,destination,f.scene,()=>.49)).toBe('other');
  expect(resolveProjectileArrival({...policy,usedKey:null},origin,destination,f.scene,()=>.5)).toBeNull();
});

test('a moved used target keeps its identity; lying failure stops, invalidation enables shuffled fallback',()=>{
  const f=projectileScene(),target=ballisticPawn('target',27,18),other=ballisticObject('chunk',20,10,1);f.set(target);f.set(other);
  const noDraw=()=>{throw Error('unexpected draw');};
  expect(resolveProjectileArrival(policy,origin,destination,f.scene,noDraw)).toBe('target');
  if(target.kind!=='pawn')throw Error();target.standing=false;
  expect(resolveProjectileArrival(policy,origin,destination,f.scene,()=>.5)).toBeNull(); // No fallback to certain chunk.
  expect(resolveProjectileArrival(policy,origin,destination,f.scene,()=>.499)).toBe('target');
  expect(resolveProjectileArrival(policy,origin,{x:4.99,z:10.5},f.scene,noDraw)).toBe('target');
  expect(resolveProjectileArrival(policy,origin,{x:5,z:10.5},f.scene,()=>.5)).toBeNull();
  f.remove('target');expect(resolveProjectileArrival(policy,origin,destination,f.scene,noDraw)).toBe('chunk');
  f.set({...target,covered:true});expect(resolveProjectileArrival(policy,origin,destination,f.scene,noDraw)).toBe('chunk');
  f.set(ballisticObject('other',20,10,1));const before=[...f.scene.at({x:20,z:10})];
  expect(resolveProjectileArrival(policy,origin,destination,f.scene,()=>0)).toBe('other');expect(f.scene.at({x:20,z:10})).toEqual(before);
});

test('ceil countdown preserves the nominal position formula, exact arrival and inert completed flights',()=>{
  const f=flight({destination:{x:11.51,z:10.5}}),scene=projectileScene().scene;
  expect(f.remainingCoreTicks).toBe(21);expect(projectileFlightTicks(11.01,revolverProfile('normal'))).toBe(2.1);
  expect(bulletPosition(f)).toEqual(origin);
  const first=advanceBulletFlight(f,scene,()=>.9,1);
  expect(bulletPosition(first.flight).x).toBeCloseTo(.51,12); // First step is the residual, not 11.01/21.
  const before=JSON.stringify(first.flight),a=advanceBulletFlight(first.flight,scene,()=>.9,19);
  expect(a.arrival).toBeNull();expect(a.flight.remainingCoreTicks).toBe(1);expect(JSON.stringify(first.flight)).toBe(before);
  const b=advanceBulletFlight(a.flight,scene,()=>.9,1);expect(b.arrival).toMatchObject({kind:'impact',targetKey:null,point:f.destination,coreTick:21});
  expect(advanceBulletFlight(b.flight,scene,()=>{throw Error('duplicate impact');}).arrival).toBeNull();
  const zero=flight({destination:origin});expect(zero.remainingCoreTicks).toBe(1);expect(advanceBulletFlight(zero,scene,()=>.9,1).arrival?.coreTick).toBe(1);
  const tiny=flight({destination:{x:.50001,z:10.5}});expect(advanceBulletFlight(tiny,scene,()=>.9,1).arrival?.point).toEqual(tiny.destination);
});

test('Core-step sampling cannot tunnel at local-tick speeds and does not invent a visit within one cell',()=>{
  const f=projectileScene();f.set(ballisticObject('wall',12,10,1));
  const fast=flight({speedPerCoreTick:7}),result=advanceBulletFlight(fast,f.scene,()=>.999,10);
  expect(result.arrival).toMatchObject({kind:'impact',targetKey:'wall',coreTick:2});expect(result.flight.remainingCoreTicks).toBe(1);
  // Gate before five cells applies to this fly-by branch, even for a full wall.
  f.remove('wall');f.set(ballisticObject('near',3,10,1));expect(advanceBulletFlight(fast,f.scene,()=>.999,10).arrival?.targetKey).toBeNull();
  const calls:number[]=[];const observe=projectileScene();observe.scene.at=c=>{calls.push(c.x);return [];};
  let state=flight();
  state=advanceBulletFlight(state,observe.scene,()=>.999,1).flight;expect(calls).toEqual([]);
  state=advanceBulletFlight(state,observe.scene,()=>.999,1).flight;expect(calls).toEqual([]); // Near-origin gate.
  advanceBulletFlight(state,observe.scene,()=>.999,24);expect(calls).toEqual([6,7,8,9,10,11,12,13,14]);
  const diagonal:string[]=[];observe.scene.at=c=>{diagonal.push(`${c.x},${c.z}`);return [];};
  advanceBulletFlight(flight({origin:{x:.5,z:.5},destination:{x:20.5,z:20.5}}),observe.scene,()=>.999,30);
  expect(diagonal.length).toBeGreaterThan(new Set(diagonal).size); // Diagonal samples may revisit a cell across ticks.
  const exit=flight({origin:{x:38.5,z:10.5},destination:{x:44.5,z:10.5}});
  const exited=advanceBulletFlight(exit,f.scene,()=>.999,20);
  expect(exited.arrival).toMatchObject({kind:'exit',targetKey:null});expect(bulletPosition(exited.flight)).toEqual(exited.arrival!.point);
  const doorScene=projectileScene();doorScene.set(ballisticObject('door',12,10,1,true));
  const beforeDoor=advanceBulletFlight(flight(),doorScene.scene,()=>.999,15).flight;
  const open=advanceBulletFlight(beforeDoor,doorScene.scene,()=>.999,100);expect(open.arrival?.targetKey).toBeNull();
  doorScene.set(ballisticObject('door',12,10,1,false));
  const shut=advanceBulletFlight(JSON.parse(JSON.stringify(beforeDoor)),doorScene.scene,()=>.999,100);
  expect(shut.arrival?.targetKey).toBe('door');expect(shut.arrival!.coreTick).toBeLessThan(open.arrival!.coreTick);
});

const emptyGrid:ShotGrid={width:40,height:40,blocksSight:()=>false,coverAt:()=>undefined};
function emissionInput():BulletEmissionInput {
  return {grid:emptyGrid,line:{from:{x:0,z:10},to:{x:20,z:10}},origin,launcherKey:'shooter',equipmentKey:'weapon:5',target:{key:'target',cell:{x:20,z:10},full:false,canBenefitFromCover:true},aim:shotAim({distance:20,pawnAccuracy:1,weaponAccuracy:[1,1,1,1],targetSize:1,standing:true,weather:1,blindSmoke:false}),cover:{blockChance:0,passChance:1,contributions:[]},profile:revolverProfile('normal'),canHitOtherPawns:true,preventFriendlyFire:false,coverAnchor:()=>undefined};
}
function sequence(values:number[]) {
  let index=0;return {draw:()=>{if(index===values.length)throw Error('Unexpected random draw');return values[index++];},count:()=>index};
}

test('emission selects cover before accuracy, keeps object anchors and resolves posture only on arrival',()=>{
  const input=emissionInput(),draws=sequence([0,.999]),direct=emitRevolverBullet(input,draws.draw);
  expect(direct).toMatchObject({branch:'target',coverKey:null,flight:{flags:3,usedKey:'target',intendedKey:'target',equipmentKey:'weapon:5'}});
  expect(direct.flight.destination).toEqual({x:20.2,z:10.7994});expect(draws.count()).toBe(2);
  for(const target of [{...input.target,key:null},{...input.target,full:true}])expect(emitRevolverBullet({...input,target},()=>.5).flight.flags).toBe(7);
  const cover={blockChance:.68,passChance:.32,contributions:[{key:'a',cell:{x:19,z:10},chance:.2,blocks:true},{key:'b',cell:{x:19,z:11},chance:.6,blocks:true}]};
  const blocked={...input,aim:{...input.aim,aimIgnoringPosture:.6},cover,coverAnchor:(key:string)=>key==='b'?{x:21,z:11}:undefined};
  const rolls=sequence([.4,.5,.9,.5,.5]),result=emitRevolverBullet(blocked,rolls.draw);
  expect(result).toMatchObject({branch:'cover',coverKey:'b',flight:{usedKey:'b',flags:6,destination:{x:21.5,z:11.5}}});expect(rolls.count()).toBe(5);
  expect(()=>emitRevolverBullet({...blocked,coverAnchor:()=>undefined},sequence([.4,.5,.9]).draw)).toThrow('Stale');
  const single={...input,cover:{blockChance:.2,passChance:.8,contributions:cover.contributions.slice(0,1)},coverAnchor:()=>({x:19,z:10})};
  const singleDraw=sequence([.9,.5,.5]);expect(emitRevolverBullet(single,singleDraw.draw).branch).toBe('cover');expect(singleDraw.count()).toBe(3);
  const prone=emitRevolverBullet({...input,aim:{...input.aim,posture:.5,aim:.5}},sequence([.5,.5]).draw);
  const scene=projectileScene(),pawn=ballisticPawn('target',20,10);if(pawn.kind!=='pawn')throw Error();pawn.standing=false;scene.set(pawn);
  const arrivalDraw=sequence([.6]);expect(advanceBulletFlight(prone.flight,scene.scene,arrivalDraw.draw,100).arrival?.targetKey).toBeNull();expect(arrivalDraw.count()).toBe(1);
});

test('wild misses use the spread surface, forward rejection, leaning visibility, clipping and explicit hit flags',()=>{
  for(const [aim,radius] of [[.02,10],[.04,8],[.07,6],[.11,4],[.22,2],[1,1],[2,1]]){expect(wildMissRadius(aim,1)).toBe(radius);expect(wildMissRadius(aim,0)).toBe(1);}
  expect(wildMissRadius(.055,.5)).toBeCloseTo(4,12);
  const input=emissionInput(),badAim={...input.aim,standardAim:.02,aimIgnoringPosture:0};
  const rolls=sequence([0,0,.1,.5,.5]),wild=emitRevolverBullet({...input,aim:badAim},rolls.draw);
  expect(wild).toMatchObject({branch:'wild',flight:{usedKey:null,intendedKey:'target',flags:6,destination:{x:21.5,z:10.5}}});expect(rolls.count()).toBe(5);
  const denied=sequence([0,0,.1,.5,.5]);expect(emitRevolverBullet({...input,aim:badAim,canHitOtherPawns:false},denied.draw).flight.flags).toBe(4);expect(denied.count()).toBe(5);
  expect(emitRevolverBullet({...input,aim:badAim},sequence([0,0,.5,.5,.5]).draw).flight.flags).toBe(4);
  const retry=sequence([.9,.5,0]);expect(wildMissCell(emptyGrid,{x:10,z:10},{x:11,z:10},.02,retry.draw)).toEqual({x:20,z:10});expect(retry.count()).toBe(3);
  expect(()=>wildMissCell(emptyGrid,{x:10,z:10},{x:11,z:10},.02,()=>.5)).toThrow('budget');
  const wall={...emptyGrid,blocksSight:(x:number)=>x===8};
  expect(wildMissCell(wall,{x:0,z:10},{x:20,z:10},1,sequence([0,0]).draw)).toEqual({x:8,z:10});
  // A single near-source obstruction allows a leaned line and must not clip.
  const corner={...emptyGrid,blocksSight:(x:number,z:number)=>x===1&&z===10};
  expect(wildMissCell(corner,{x:0,z:10},{x:20,z:10},1,sequence([0,0]).draw)).toEqual({x:21,z:10});
  expect(wildMissCell(emptyGrid,{x:0,z:10},{x:39,z:10},1,sequence([0,0]).draw)).toEqual({x:40,z:10});
  expect(()=>wildMissRadius(NaN,.5)).toThrow();expect(()=>wildMissCell(emptyGrid,{x:-1,z:10},{x:20,z:10},1,()=>.5)).toThrow();
});

test('grouped advances and JSON continuation keep the same path, outcome and random stream in all octants',()=>{
  let compared=0;
  for(const dx of [-14,-9,0,9,14])for(const dz of [-14,-9,0,9,14])for(const seed of [13,29,101]) {
    if(dx===0&&dz===0)continue;
    const f=projectileScene(),to={x:20.5+dx,z:20.5+dz},start=flight({origin:{x:20.5,z:20.5},destination:to,usedKey:null});
    for(let i=0;i<35;i++)for(let j=0;j<35;j++)if((i*13+j*7)%17===0)f.set(ballisticObject(`chunk:${i}:${j}`,i,j,.5));
    const a=projectileRandom(seed),b=projectileRandom(seed);let single=start,grouped=start,oneImpact=null,batchImpact=null;
    while(!single.completed){const r=advanceBulletFlight(single,f.scene,a.draw,1);single=r.flight;oneImpact=r.arrival;}
    while(!grouped.completed){const r=advanceBulletFlight(JSON.parse(JSON.stringify(grouped)),f.scene,b.draw,10);grouped=r.flight;batchImpact=r.arrival;}
    expect(grouped).toEqual(single);expect(batchImpact).toEqual(oneImpact);expect(b.state).toEqual(a.state);expect(b.draws()).toBe(a.draws());compared++;
  }
  expect(compared).toBe(72);
  const f=flight(),invalid=[{remainingCoreTicks:-1},{remainingCoreTicks:.5},{remainingCoreTicks:1000},{speedPerCoreTick:0},{flags:8},{origin:{x:NaN,z:0}},{completed:false,remainingCoreTicks:0}];
  for(const change of invalid)expect(()=>validateBulletFlight({...f,...change})).toThrow();
  expect(()=>advanceBulletFlight(f,projectileScene().scene,()=>.5,1001)).toThrow();
});

test('fixture flight can resolve a moved person into existing Gunshot health, without using a replacement weapon',()=>{
  const w=medicalCamp(2),target=w.pawns[1],f=projectileScene(w.width,w.height),targetKey=`pawn:${target.id}`;
  const launch=flight({launcherKey:`pawn:${w.pawns[0].id}`,intendedKey:targetKey,usedKey:targetKey,equipmentKey:'weapon:original'});
  const half=advanceBulletFlight(launch,f.scene,()=>.9,10);expect(half.arrival).toBeNull();
  // Explicit fixture movement and test-only flight envelope; World does not yet
  // save or automatically execute these flights. No player command is claimed.
  target.x=25;target.z=20;f.set(ballisticPawn(targetKey,target.x,target.z));
  const saved=deserializeWorld(serializeWorld(w)),resumed=JSON.parse(JSON.stringify(half.flight));
  const hit=advanceBulletFlight(resumed,f.scene,()=>.9,100);
  expect(hit.arrival?.targetKey).toBe(targetKey);expect(hit.flight.equipmentKey).toBe('weapon:original');
  for(const world of [w,saved])damageUnarmoredPawnWithBullet(world,world.pawns[1],{damage:revolverProfile('normal').damage,part:'left-lung'});
  expect(saved).toEqual(w);expect(validateWorld(w)).toEqual([]);
  expect(target.health?.injuries.map(i=>i.kind)).toEqual(['gunshot','gunshot']);
});
