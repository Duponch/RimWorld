import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization';
import { startSadWander,updateMentalBreak,processSadWander } from '../src/sim/mental-break';
import { finishMentalBreak,mentalState } from '../src/sim/mental-state';
import { moodThoughts } from '../src/sim/mood';
import { addMaterial,refreshStock } from '../src/sim/materials';
import { medicalCamp,medicalCarrier,controlledInjury } from './scenarios/health';
import { fixtureBuilding } from './scenarios/deconstruction';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { PresentationChanges } from '../src/bridge/presentation-changes';
import { startTravel } from '../src/sim/movement';
import { SCHEMA_VERSION,type World,type Command } from '../src/sim/types';

const valid=(w:World)=>expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);
function camp(){const w=medicalCamp();const p=w.pawns[0]!;p.hunger=80;p.rest=80;p.mood=50;p.comfort=50;p.recreation.level=50;return w;}

test('exposure is sampled and random, strict thresholds reset independently, sleep blocks entry and pauses recovery cooldown',()=>{
  const w=camp(),p=w.pawns[0]!;p.mood=4;
  for(let i=0;i<195;i++){w.tick++;updateMentalBreak(w,p);}expect(p.mental?.crisis).toBeUndefined();expect(p.mental?.below).toEqual([1950,1950,1950]);
  p.mood=20;for(let i=0;i<15;i++){w.tick++;updateMentalBreak(w,p);}expect(p.mental?.below).toEqual([2100,0,0]);
  p.mood=35;for(let i=0;i<15;i++){w.tick++;updateMentalBreak(w,p);}expect(p.mental?.below).toEqual([0,0,0]);
  p.state='sleeping';p.mood=0;mentalState(p).cooldown=5;
  for(let i=0;i<300;i++){w.tick++;updateMentalBreak(w,p);}expect(p.mental?.cooldown).toBe(5);expect(p.mental?.crisis).toBeUndefined();expect(p.mental?.below).toEqual([2100,2100,2100]);
  p.state='idle';const replay=structuredClone(w);
  for(let i=0;i<120000&&!p.mental?.crisis;i++){w.tick++;replay.tick++;updateMentalBreak(w,p);updateMentalBreak(replay,replay.pawns[0]!);}
  expect(p.mental?.crisis).toBeDefined();expect(replay).toEqual(w);expect(w.events.at(-1)?.message).toContain('errance triste');
});

test('break interrupts real work and active travel, releases orders, preserves the edge and rejects direct control atomically',()=>{
  const w=camp(),p=w.pawns[0]!;p.priorities.gather=1;
  const tree={id:w.nextId++,kind:'tree' as const,x:p.x+5,z:p.z,amount:10};w.resources.push(tree);
  expect(applyCommand(w,{type:'area',action:'chop',from:tree,to:tree}).ok).toBe(true);
  stepWorld(w,2);expect(p.motion).toBeTruthy();const edge=structuredClone(p.motion),joy=p.recreation.level;
  expect(startSadWander(w,p)).toBe(true);expect(p.motion).toEqual(edge);expect(p.jobId).toBeNull();expect(w.jobs[0]!.reservedBy).toBeNull();valid(w);
  const before=serializeWorld(w);for(const c of [{type:'draft',pawnIds:[p.id],enabled:true},{type:'order-job',pawnId:p.id,jobId:w.jobs[0]!.id,queue:false},{type:'clear-orders',pawnId:p.id}] satisfies Command[]){expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
  const copy=deserializeWorld(before),positions=new Set<string>();
  for(let i=0;i<100;i++){stepWorld(w);stepWorld(copy);positions.add(`${p.x},${p.z}`);if(i%10===0)valid(w);}
  expect(copy).toEqual(w);expect(positions.size).toBeGreaterThan(4);expect(w.resources).toContainEqual(tree);expect(p.recreation.level).toBe(joy);expect(p.motion!.speedFactor).toBeLessThanOrEqual(.5);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),observer=new PresentationChanges();observer.capture(w);expect(decoder.adopt(encoder.encode(w,0,1))).toMatchObject({status:'applied',world:w});
  finishMentalBreak(w,p);expect(observer.capture(w)).toBe(true);valid(w);
});

test('saturated ground retains carried steel while wandering and deposits it when a reachable cell is freed',()=>{
  const w=medicalCarrier(),p=w.pawns[0]!,held=w.piles.find(i=>i.owner.type==='pawn')!;p.rest=90;p.hunger=90;
  expect(startSadWander(w,p)).toBe(true);expect(p.interruptedCargo).toBe(true);valid(w);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,45);stepWorld(copy,45);expect(copy).toEqual(w);valid(w);expect(held.quantity).toBe(10);expect(held.owner.type).toBe('pawn');
  const free=w.piles.find(i=>i.owner.type==='ground'&&i.owner.x===p.x&&i.owner.z===p.z)!;w.piles.splice(w.piles.indexOf(free),1);refreshStock(w);
  for(let i=0;i<50&&p.interruptedCargo;i++)stepWorld(w);
  expect(p.interruptedCargo).toBeUndefined();expect(held.owner.type).toBe('ground');expect(held.quantity).toBe(10);valid(w);
});

test('wandering still obtains an actual meal despite policy, then uses a bed at low rest and recovers with catharsis',()=>{
  const w=camp(),p=w.pawns[0]!;p.hunger=4;p.rest=80;p.foodPolicyId=4;addMaterial(w,'food',20,{type:'ground',x:p.x+2,z:p.z},'rice');
  const before=w.piles.reduce((n,i)=>n+(i.kind==='food'?i.quantity:0),0);startSadWander(w,p);
  for(let i=0;i<220&&!p.memories.length;i++)stepWorld(w);
  expect(p.hunger).toBeGreaterThan(60);expect(w.piles.reduce((n,i)=>n+(i.kind==='food'?i.quantity:0),0)).toBeLessThan(before);expect(p.mental?.crisis).toBeDefined();valid(w);
  const bed=fixtureBuilding(w,'bed',p.x,p.z+1);p.bedId=bed.id;p.rest=14;p.needCooldown=0;
  stepWorld(w,30);expect(p.need?.kind).not.toBe('sleep');expect(p.mental?.crisis).toBeDefined();
  p.schedule.fill('anything');p.needCooldown=0;
  for(let i=0;i<150&&p.mental?.crisis;i++)stepWorld(w);
  expect(p.mental?.crisis).toBeUndefined();expect(p.need).toMatchObject({kind:'sleep',bedId:bed.id,phase:'sleep'});expect(p.mental?.catharsis).toEqual([w.tick+18000]);expect(moodThoughts(w,p).find(t=>t.id==='catharsis')?.offset).toBe(40);valid(w);
});

test('duration, early sleep/downing, death and five diminishing catharses keep distinct outcomes and exact replay',()=>{
  const w=camp(),p=w.pawns[0]!;startSadWander(w,p);const m=p.mental!;
  m.crisis!.age=39960;for(let i=0;i<2;i++){w.tick++;updateMentalBreak(w,p);}expect(m.crisis).toBeDefined();
  m.crisis!.age=59970;for(let i=0;i<3&&m.crisis;i++){w.tick++;updateMentalBreak(w,p);}expect(m.crisis).toBeUndefined();expect(m.cooldown).toBe(1500);
  for(let i=0;i<5;i++){w.tick++;startSadWander(w,p);finishMentalBreak(w,p);}
  expect(m.catharsis).toHaveLength(5);expect(moodThoughts(w,p).find(t=>t.id==='catharsis')?.offset).toBeCloseTo(40*(1+.75+.75**2+.75**3+.75**4));
  const oldest=m.catharsis[0]!;w.tick=oldest;updateMentalBreak(w,p);expect(m.catharsis).toHaveLength(4);
  startSadWander(w,p);controlledInjury(w,p,'left-leg',30000);controlledInjury(w,p,'right-leg',30000);expect(p.state).toBe('downed');expect(m.crisis).toBeUndefined();expect(m.catharsis).toHaveLength(5);valid(w);
  const dead=camp(),q=dead.pawns[0]!;startSadWander(dead,q);controlledInjury(dead,q,'heart',15000);expect(q.state).toBe('dead');expect(q.mental?.crisis).toBeUndefined();expect(q.mental?.catharsis).toEqual([]);valid(dead);
});

test('strict V64 migration introduces no past exposure, corruption is rejected, continuation spans mid-wander and recovery',()=>{
  const old=camp();(old as any).schemaVersion=64;expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
  const legacy=structuredClone(old);mentalState(legacy.pawns[0]!);expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow(/version 64/);
  const w=camp(),p=w.pawns[0]!;startSadWander(w,p);stepWorld(w,10);valid(w);
  for(const mutate of [(v:any)=>v.pawns[0].mental.below=[0,150,0],(v:any)=>v.pawns[0].mental.crisis.age=60000,(v:any)=>v.pawns[0].mental.catharsis=[v.tick],(v:any)=>v.pawns[0].mental.crisis.target={x:-1,z:0},(v:any)=>v.pawns[0].mental.crisis=true]){const v=structuredClone(w);mutate(v);expect(()=>deserializeWorld(JSON.stringify(v))).toThrow();}
  const replay=deserializeWorld(serializeWorld(w));for(let i=0;i<120;i++){stepWorld(w);stepWorld(replay);if(i%20===0)valid(w);}expect(replay).toEqual(w);
});

test('recovery interrupts a carried meal without loss, and a newly occupied wander stop is abandoned',()=>{
  const w=camp(),p=w.pawns[0]!;p.hunger=4;addMaterial(w,'food',20,{type:'ground',x:p.x+1,z:p.z},'rice');startSadWander(w,p);
  for(let i=0;i<180&&!(p.need?.kind==='eat'&&p.need.carryPileId!==null);i++)stepWorld(w);
  expect(p.need).toMatchObject({kind:'eat'});const meal=w.piles.find(i=>i.owner.type==='pawn')!;expect(meal).toBeDefined();
  const count=w.piles.filter(i=>i.kind==='food').reduce((n,i)=>n+i.quantity,0);
  p.mental!.crisis!.age=59970;w.tick+=((3-(w.tick+p.id)%3)%3);updateMentalBreak(w,p);
  expect(p.need).toBeNull();expect(p.mental?.crisis).toBeUndefined();expect(w.piles.filter(i=>i.kind==='food').reduce((n,i)=>n+i.quantity,0)).toBe(count);valid(w);
  const a=camp(),b=a.pawns[0]!;startSadWander(a,b);stepWorld(a);const target=b.mental!.crisis!.target!;expect(target).toBeTruthy();fixtureBuilding(a,'bed',target.x,target.z);
  for(let i=0;i<20&&b.mental?.crisis?.target===target;i++)stepWorld(a);
  expect(b.mental?.crisis?.target).not.toBe(target);valid(a);
  const deferred=camp(),c=deferred.pawns[0]!;startSadWander(deferred,c);stepWorld(deferred);
  deferred.tick=Math.ceil(c.motion!.end);c.moveCooldown=0;c.hunger=4;c.needCooldown=0;
  addMaterial(deferred,'food',20,{type:'ground',x:13,z:14},'rice');const before=serializeWorld(deferred);
  processSadWander(deferred,c,{search:()=>null,move:()=>{},release:()=>false,event:()=>{}},()=>null);
  expect(serializeWorld(deferred)).toBe(before);valid(deferred);
  const replay=deserializeWorld(before);stepWorld(deferred,80);stepWorld(replay,80);expect(deferred).toEqual(replay);valid(deferred);
});

test('wounded slow wander preserves captured speed after recovery and survives strict save continuation',()=>{
  const w=camp(),p=w.pawns[0]!;w.tick=6000;controlledInjury(w,p,'left-leg',19000);controlledInjury(w,p,'right-leg',23500);addMaterial(w,'apparel',1,{type:'apparel',pawnId:p.id},'flak-vest');
  // The same clothed, injured night-time edge was valid gameplay in V63/V64.
  expect(startTravel(w,p,{x:p.x+1,z:p.z+1})).toBe(true);p.state='moving';p.draft={lastActiveTick:w.tick,target:{x:p.x,z:p.z},queue:[]};
  const legacy=structuredClone(w);(legacy as any).schemaVersion=64;expect(deserializeWorld(JSON.stringify(legacy)).pawns[0]!.motion).toEqual(p.motion);
  stepWorld(w,Math.ceil(p.motion!.end)-w.tick);startSadWander(w,p);expect(startTravel(w,p,{x:p.x+1,z:p.z+1})).toBe(true);p.state='moving';expect(p.moveCooldown).toBeGreaterThan(49.5);
  expect(p.motion!.speedFactor).toBeLessThan(.128);valid(w);
  const edge=structuredClone(p.motion);finishMentalBreak(w,p);expect(p.motion).toEqual(edge);valid(w);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,80);stepWorld(copy,80);expect(copy).toEqual(w);valid(w);
  const corrupt=JSON.parse(serializeWorld(w));corrupt.pawns[0].motion.speedFactor=.001;expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow();
});
