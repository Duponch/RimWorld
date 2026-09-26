import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {captureRoomQuality} from '../src/sim/room-quality.ts';
import {moodTarget,moodThoughts} from '../src/sim/mood.ts';
import {initialRecreation} from '../src/sim/recreation-rules.ts';
import {recreationSiteValid} from '../src/sim/recreation-space.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import type {World} from '../src/sim/types.ts';
import {roomExperienceCamp} from './scenarios/room-experience.ts';
import {withoutArt} from './scenarios/legacy-skills.ts';
import {expireRoomMemories,rememberRoomUse} from '../src/sim/room-experience.ts';

function room():World {
  const w=roomExperienceCamp(),quality=captureRoomQuality(w).room(w.pawns[0]!);
  expect(quality?.stage).toBeGreaterThanOrEqual(3);
  expect(quality?.cells.size).toBe(169);
  return w;
}
const memory=(w:World,kind:string)=>w.pawns[0]!.roomMemories?.find(m=>m.kind===kind);
function until(w:World,predicate:()=>boolean,limit:number):void {
  for(let i=0;i<limit&&!predicate();i++)stepWorld(w);
  expect(predicate(),`tick=${w.tick}; pawn=${JSON.stringify(w.pawns[0]!.need??w.pawns[0]!.recreation.task)}`).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
function moodEffect(w:World,kind:string):number {
  const p=w.pawns[0]!,without=structuredClone(w),other=without.pawns[0]!;
  other.roomMemories=other.roomMemories?.filter(m=>m.kind!==kind);
  return moodTarget(moodThoughts(w,p))-moodTarget(moodThoughts(without,other));
}

test('a completed physical meal records the current room; interrupted ingestion records nothing, and replay is exact',()=>{
  const w=room(),p=w.pawns[0]!;p.hunger=20;p.rest=100;
  addGroundMaterial(w,'food',1,{x:16,z:15});
  until(w,()=>p.need?.kind==='eat'&&p.need.phase==='ingest',150);
  expect(memory(w,'dining')).toBeUndefined();
  const checkpoint=serializeWorld(w),interrupted=deserializeWorld(checkpoint),other=interrupted.pawns[0]!;
  other.rest=0;other.restZeroTicks=150;other.collapsePending=true;stepWorld(interrupted);
  expect(other.need?.kind).toBe('sleep');expect(memory(interrupted,'dining')).toBeUndefined();
  expect(interrupted.piles.some(pile=>pile.kind==='food'&&pile.owner.type==='ground')).toBe(true);
  const replay=deserializeWorld(checkpoint);
  until(w,()=>p.need===null,80);stepWorld(replay,w.tick-replay.tick);expect(replay).toEqual(w);
  expect(memory(w,'dining')).toMatchObject({stage:captureRoomQuality(w).room(p)!.stage,expiresAt:w.tick+6000});
  expect(moodThoughts(w,p).some(t=>t.id==='room-dining')).toBe(true);
  expect(moodEffect(w,'dining')).toBeGreaterThan(0);
});

test('horseshoes grant recreation memory after active use, while travel and skygazing do not',()=>{
  const w=room(),p=w.pawns[0]!;
  const pin={id:w.nextId++,kind:'horseshoes' as const,x:12,z:15,orientation:0 as const,footprint:'standard' as const};w.structures.push(pin);
  p.x=17;p.z=17;p.recreation=initialRecreation(10);p.schedule.fill('recreation');
  p.recreation.task={activity:'horseshoes',buildingId:pin.id,target:{x:17,z:15},phase:'travel',elapsed:0};p.state='moving';
  expect(recreationSiteValid(w,p.recreation.task)).toBe(true);
  until(w,()=>p.recreation.task?.phase==='active',45);
  expect(memory(w,'recreation')).toBeUndefined();
  const checkpoint=serializeWorld(w),replay=deserializeWorld(checkpoint);
  until(w,()=>p.recreation.task===null,420);
  stepWorld(replay,w.tick-replay.tick);expect(replay).toEqual(w);
  expect(memory(w,'recreation')).toMatchObject({stage:captureRoomQuality(w).room(p)!.stage,expiresAt:w.tick+6000});
  expect(moodEffect(w,'recreation')).toBeGreaterThan(0);

  const sky=room(),watcher=sky.pawns[0]!;watcher.recreation=initialRecreation(10);watcher.schedule.fill('recreation');
  watcher.recreation.task={activity:'skygaze',buildingId:null,target:{x:17,z:15},phase:'travel',elapsed:0};watcher.state='moving';
  expect(recreationSiteValid(sky,watcher.recreation.task)).toBe(true);
  until(sky,()=>watcher.recreation.task?.phase==='active',3);
  until(sky,()=>watcher.recreation.task===null,420);
  expect(memory(sky,'recreation')).toBeUndefined();
});

test('owned bed observes only after its persisted delay, then refreshes at physical wake; a brief visit grants nothing',()=>{
  const w=room(),p=w.pawns[0]!;
  const bed={id:w.nextId++,kind:'bed' as const,x:18,z:18,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,quality:'normal' as const};w.structures.push(bed);
  p.x=bed.x;p.z=bed.z;p.bedId=bed.id;p.rest=0;p.schedule.fill('sleep');p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:bed.x,z:bed.z}};p.state='sleeping';
  stepWorld(w);expect(p.need?.kind).toBe('sleep');if(p.need?.kind!=='sleep')throw new Error('sleep task missing');
  const first=p.need.roomRest!.nextAt;expect(first-w.tick).toBeGreaterThanOrEqual(250);expect(first-w.tick).toBeLessThanOrEqual(1000);
  expect(memory(w,'bedroom')).toBeUndefined();
  const checkpoint=serializeWorld(w),replay=deserializeWorld(checkpoint);
  stepWorld(w,first-w.tick-1);expect(memory(w,'bedroom')).toBeUndefined();
  stepWorld(w);expect(memory(w,'bedroom')).toMatchObject({stage:captureRoomQuality(w).room(p)!.stage,expiresAt:w.tick+6000});
  stepWorld(replay,w.tick-replay.tick);expect(replay).toEqual(w);expect(moodEffect(w,'bedroom')).not.toBe(0);
  const prior=memory(w,'bedroom')!.expiresAt;p.rest=50;p.schedule.fill('work');stepWorld(w);
  expect(p.need).toBeNull();expect(memory(w,'bedroom')!.expiresAt).toBeGreaterThan(prior);

  const brief=deserializeWorld(checkpoint),visitor=brief.pawns[0]!;visitor.rest=50;visitor.schedule.fill('work');stepWorld(brief);
  expect(visitor.need).toBeNull();expect(memory(brief,'bedroom')).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);
});

test('V101 migration preserves fields and refuses future room memories; current saves enforce family and duration bounds',()=>{
  const w=room(),raw=withoutArt(JSON.parse(serializeWorld(w)));raw.schemaVersion=101;
  const migrated=deserializeWorld(JSON.stringify(raw));expect(migrated).toEqual(w);
  expect(migrated.pawns[0]!.roomMemories).toBeUndefined();
  const future=structuredClone(raw);future.pawns[0].roomMemories=[{kind:'dining',stage:3,expiresAt:future.tick+100}];
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/version 101|room/i);
  const current=JSON.parse(serializeWorld(w)),base={kind:'dining',stage:3,expiresAt:current.tick+100};
  for(const memories of [
    [base,{...base,kind:'recreation'},{...base,kind:'bedroom',stage:2},{...base,kind:'barracks'}],
    [base,{...base}],
    [{...base,stage:0}],
    [{...base,expiresAt:current.tick+6001}],
  ]){
    const invalid=structuredClone(current);invalid.pawns[0].roomMemories=memories;
    expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow();
  }
});

test('immutable V101 workshop migrates without adding a thought, clock, material or research',()=>{
  const raw=JSON.parse(readFileSync('public/test-saves/v101/atelier.json','utf8'));
  expect(raw.schemaVersion).toBe(101);
  const migrated=deserializeWorld(JSON.stringify(raw));
  expect(migrated).toEqual({...raw,schemaVersion:105,pawns:raw.pawns.map((p:Record<string,unknown>)=>({...p,priorities:{...(p.priorities as object),art:0}}))});
  expect(validateWorld(migrated)).toEqual([]);
});

test('room use refreshes one family, and the memory expires exactly at its deadline',()=>{
  const w=room(),p=w.pawns[0]!;rememberRoomUse(w,p,'dining');
  const first=memory(w,'dining')!.expiresAt;w.tick+=100;rememberRoomUse(w,p,'dining');
  expect(p.roomMemories).toHaveLength(1);expect(memory(w,'dining')!.expiresAt).toBe(first+100);
  const end=memory(w,'dining')!.expiresAt;w.tick=end-1;expireRoomMemories(w,p);
  expect(moodThoughts(w,p).some(t=>t.id==='room-dining')).toBe(true);
  w.tick=end;expireRoomMemories(w,p);
  expect(p.roomMemories).toBeUndefined();expect(moodThoughts(w,p).some(t=>t.id==='room-dining')).toBe(false);
});
