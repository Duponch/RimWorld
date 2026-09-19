import { withoutResearch,withMigratedResearch } from './scenarios/legacy-skills';
import { SCHEMA_VERSION } from '../src/sim/types';
import { expect,test } from 'vitest';
import { createWorld,applyCommand,stepWorld } from '../src/sim/engine';
import { deserializeWorld,serializeWorld,validateWorld,hashWorld } from '../src/sim/serialization';
import { advanceArrivals,enableArrivals } from '../src/sim/arrivals';
import { arrivalEntry } from '../src/sim/arrival-entry';
import { moodThoughts,expireMealMemories } from '../src/sim/mood';
import { startingPawn } from '../src/sim/starting-pawns';
import { TICKS_PER_DAY } from '../src/sim/types';

function offer(seed=42) {
  const w=createWorld(seed);enableArrivals(w);w.tick=w.arrivals!.nextCheck;advanceArrivals(w);
  expect(w.arrivals!.pending).toBeDefined();expect(validateWorld(w)).toEqual([]);return w;
}
test('arrival letter persists, accepts once at a reachable edge, retains policy and external clothing identity',()=>{
  const w=offer(),pending=structuredClone(w.arrivals!.pending!),rng=w.rng,ids=w.nextId,initial=structuredClone(w.piles);
  w.events=Array.from({length:80},()=>({tick:w.tick,type:'command' as const,message:'Historique conservé'}));
  const clone=deserializeWorld(serializeWorld(w));
  for(const world of [w,clone]) {
    expect(applyCommand(world,{type:'answer-arrival',offerId:pending.id,accept:true})).toMatchObject({ok:true});
    expect(validateWorld(world)).toEqual([]);
    expect(world.events).toHaveLength(80);
    const p=world.pawns.at(-1)!;expect(p.name).toBe(pending.name);expect(p.id).toBe(ids);expect(p.foodPolicyId).toBe(world.foodPolicies[0]!.id);
    expect(p.x===0||p.z===0||p.x===world.width-1||p.z===world.height-1).toBe(true);
    expect(world.piles.slice(0,-1)).toEqual(initial);expect(world.piles.at(-1)).toMatchObject({id:ids+1,item:'cloth-shirt',quantity:1,owner:{type:'apparel',pawnId:p.id}});
    expect(p.schedule).not.toBe(world.pawns[0]!.schedule);expect(p.skills).not.toBe(world.pawns[0]!.skills);expect(p.bedId).toBeNull();expect(world.rng).toBe(rng);
    const before=hashWorld(world);expect(applyCommand(world,{type:'answer-arrival',offerId:pending.id,accept:true}).ok).toBe(false);expect(hashWorld(world)).toBe(before);
  }
  stepWorld(w,150);stepWorld(clone,150);expect(hashWorld(clone)).toBe(hashWorld(w));expect(validateWorld(w)).toEqual([]);
});
test('sealed border refuses atomically; reopening revalidates, including a deleted default food policy',()=>{
  const w=offer();for(let i=0;i<w.tiles.length;i++){const x=i%w.width,z=Math.floor(i/w.width);if(x===0||z===0||x===w.width-1||z===w.height-1)w.tiles[i]={terrain:'water'};}
  // Controlled geography; opening is restored before validating the whole map.
  const before=hashWorld(w),command={type:'answer-arrival' as const,offerId:w.arrivals!.pending!.id,accept:true};
  expect(arrivalEntry(w,1)).toBeNull();expect(applyCommand(w,command).ok).toBe(false);expect(hashWorld(w)).toBe(before);
  for(let z=0;z<18;z++)w.tiles[z*w.width+16]={terrain:'grass'};
  const p=w.pawns[0]!;
  // The only entrance is protected while an edge leaves it, but an expired
  // presentation history must not permanently occupy that border cell.
  p.motion={from:{x:16,z:0},to:{x:p.x,z:p.z},start:w.tick-1,end:w.tick+1};
  expect(arrivalEntry(w,1)).toBeNull();p.motion.end=w.tick;
  expect(arrivalEntry(w,1)).toEqual({x:16,z:0});delete p.motion;
  for(const p of w.pawns)p.foodPolicyId=2;
  expect(applyCommand(w,{type:'food-policy-delete',policyId:1}).ok).toBe(true);
  expect(applyCommand(w,command).ok).toBe(true);expect(w.pawns.at(-1)!.foodPolicyId).toBe(2);
  expect(w.arrivals!.accepted).toBe(1);expect(w.arrivals!.pending).toBeUndefined();
});
test('refusal has decreasing six-day memories, expiration is not refusal, no repeated decision',()=>{
  const w=offer(),p=w.pawns[0]!,id=w.arrivals!.pending!.id,count=w.pawns.length;
  expect(applyCommand(w,{type:'answer-arrival',offerId:id,accept:false}).ok).toBe(true);
  expect(w.pawns).toHaveLength(count);expect(moodThoughts(w,p).find(t=>t.id==='denied-joining')).toMatchObject({offset:-3,expiresAt:w.tick+36000});
  const before=hashWorld(w);expect(applyCommand(w,{type:'answer-arrival',offerId:id,accept:false}).ok).toBe(false);expect(hashWorld(w)).toBe(before);
  w.tick++;w.arrivals!.serial++;w.arrivals!.pending={id:id+1,openedAt:w.tick,expiresAt:w.tick+6000,name:'Sacha',profile:0};
  expect(applyCommand(w,{type:'answer-arrival',offerId:id+1,accept:false}).ok).toBe(true);
  expect(moodThoughts(w,p).find(t=>t.id==='denied-joining')?.offset).toBe(-5.25);expect(validateWorld(w)).toEqual([]);
  for(let n=0;n<5;n++) {
    w.tick++;const s=w.arrivals!;s.pending={id:++s.serial,openedAt:w.tick,expiresAt:w.tick+6000,name:'Robin',profile:1};
    expect(applyCommand(w,{type:'answer-arrival',offerId:s.serial,accept:false}).ok).toBe(true);
  }
  expect(p.deniedJoining).toHaveLength(5);expect(moodThoughts(w,p).find(t=>t.id==='denied-joining')?.offset).toBeCloseTo(-3*(1-.75**5)/.25);expect(validateWorld(w)).toEqual([]);
  const timed=offer(93),o=timed.arrivals!.pending!;timed.tick=o.expiresAt;
  const atDeadline=hashWorld(timed);expect(applyCommand(timed,{type:'answer-arrival',offerId:o.id,accept:true}).ok).toBe(false);expect(hashWorld(timed)).toBe(atDeadline);
  advanceArrivals(timed);expect(timed.arrivals!.expired).toBe(1);expect(timed.pawns.every(p=>!p.deniedJoining)).toBe(true);expect(validateWorld(timed)).toEqual([]);
  w.tick=p.deniedJoining!.at(-1)!;p.state='dead';expireMealMemories(w,p);expect(p.deniedJoining).toBeUndefined();
});
test('calendar cannot generate impossible or unlimited arrivals and does no per-tick navigation work',()=>{
  const w=createWorld(42);enableArrivals(w);const first=w.arrivals!.nextCheck;expect(first).toBeGreaterThanOrEqual(9000);expect(first).toBeLessThan(12000);
  for(let i=3;i<12;i++)w.pawns.push(startingPawn(w.nextId++,`P${i}`,16,16,i%3,55));
  w.tick=first;advanceArrivals(w);expect(w.arrivals!.pending).toBeUndefined();expect(w.arrivals!.serial).toBe(0);
  const same=hashWorld(w);advanceArrivals(w);expect(hashWorld(w)).toBe(same);
  expect(w.arrivals!.nextCheck-w.tick).toBeGreaterThanOrEqual(4*TICKS_PER_DAY);
});
test('V65 migration is neutral, invalid old/current letters and memories fail before adoption',()=>{
  const legacy=JSON.parse(serializeWorld(createWorld()));(legacy.schemaVersion=65,withoutResearch(legacy));
  const migrated=deserializeWorld(JSON.stringify(legacy));expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);expect(migrated.arrivals).toBeUndefined();expect(migrated).toEqual(withMigratedResearch({...legacy,schemaVersion:SCHEMA_VERSION}));
  const good=offer();
  for(const mutate of [(x:any)=>x.schemaVersion=65,(x:any)=>x.arrivals.pending.profile=3,(x:any)=>x.arrivals.accepted++, (x:any)=>x.arrivals.pending.expiresAt=x.tick,(x:any)=>x.arrivals.pending.name='<'.repeat(49),(x:any)=>x.arrivals.rng=0,(x:any)=>x.pawns[0].deniedJoining=[x.tick]]) {
    const bad=JSON.parse(serializeWorld(good));mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  expect(applyCommand(migrated,{type:'enable-arrivals'}).ok).toBe(true);const before=hashWorld(migrated);expect(applyCommand(migrated,{type:'enable-arrivals'}).ok).toBe(true);expect(hashWorld(migrated)).toBe(before);
});
