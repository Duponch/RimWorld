import { expect,test } from 'vitest';
import { withoutV90 } from './scenarios/legacy-skills';
import { cleanlinessCamp,enclosedRoom } from './scenarios/cleanliness';
import { addFilth,advanceFilth,recordFilthMovement,roomCleanliness,removeFilth } from '../src/sim/filth';
import { cleaningWanted,applyCleanRoom } from '../src/sim/cleaning';
import { infectionRoomFactor } from '../src/sim/infection-room';
import { validateFilth } from '../src/sim/filth-save';
import { applyCommand,stepWorld,validateWorld,serializeWorld,deserializeWorld } from '../src/sim/index';
import type { World } from '../src/sim/types';
function valid(w:World){expect(validateWorld(w),JSON.stringify({tick:w.tick,filth:w.filth,p:w.pawns.map(p=>({state:p.state,cleaning:p.cleaning}))})).toEqual([]);}
function until(w:World,predicate:()=>boolean,limit=400){for(let i=0;i<limit&&!predicate();i++)stepWorld(w);expect(predicate(),JSON.stringify({tick:w.tick,p:w.pawns,filth:w.filth})).toBe(true);valid(w);}

test('proper room cleanliness counts each trace once, includes its doorway, and changes clinical capture without a roof bonus',()=>{
  const w=cleanlinessCamp(),r=enclosedRoom(w,{x:5,z:5});
  expect(roomCleanliness(w,r.inside)).toBe(-1);expect(infectionRoomFactor(w,r.inside)).toBe(600);
  for(const i of r.cells)w.tiles[i]!.floor='steel-tile';
  expect(roomCleanliness(w,r.inside)).toBeCloseTo(.2);expect(infectionRoomFactor(w,r.inside)).toBe(440);
  expect(addFilth(w,r.inside,'blood',5)).toBe(true);expect(w.filth!.items).toHaveLength(1);
  expect(roomCleanliness(w,r.inside)).toBeCloseTo(.2-10/9);
  expect(addFilth(w,r.door,'vomit')).toBe(true);expect(roomCleanliness(w,r.inside)).toBeCloseTo(.2-25/9);
  expect(roomCleanliness(w,r.door)).toBeNull();expect(infectionRoomFactor(w,r.door)).toBe(1000);
  const before=roomCleanliness(w,r.inside);w.roofing={constructed:[...r.cells],build:[],remove:[],cursor:0};expect(roomCleanliness(w,r.inside)).toBe(before);
  w.structures=w.structures.filter(s=>s.x!==5||s.z!==6);expect(roomCleanliness(w,r.inside)).toBeNull();
  valid(w);
});

test('natural dirt and trash are filtered while blood, rain, thickness and lifetime keep their physical meanings',()=>{
  const w=cleanlinessCamp(),a={x:10,z:10},b={x:11,z:10},c={x:12,z:10};
  const clean=JSON.stringify(w);expect(addFilth(w,a,'dirt')).toBe(false);expect(addFilth(w,a,'trash')).toBe(false);expect(JSON.stringify(w)).toBe(clean);
  w.tiles[a.z*w.width+a.x]={terrain:'rough-stone',stone:'granite'};expect(addFilth(w,a,'trash',1,true)).toBe(false);expect(addFilth(w,a,'dirt')).toBe(true);removeFilth(w,w.filth!.items[0]!);
  w.tiles[a.z*w.width+a.x]!.floor='wood-planks';addFilth(w,a,'dirt',5);const f=w.filth!.items[0]!,expires=f.expiresAfterCore;
  expect(f.thickness).toBe(5);addFilth(w,b,'blood',2);addFilth(w,c,'ash',2);
  w.roofing={constructed:[a.z*w.width+a.x],build:[],remove:[],cursor:0};
  const untilCore=Math.max(...w.filth!.items.map(f=>f.nextCheckCore));w.tick=Math.ceil(untilCore/10);advanceFilth(w,1);
  expect(f.thickness).toBe(5);expect(f.expiresAfterCore).toBe(expires);
  expect(w.filth!.items.find(f=>f.kind==='blood')?.thickness).toBe(1);expect(w.filth!.items.find(f=>f.kind==='ash')?.thickness).toBe(2);
  expect(validateFilth(w,89)).toEqual([]);
  const copy=structuredClone(w);recordFilthMovement(w,w.pawns[0]!);recordFilthMovement(copy,copy.pawns[0]!);expect(copy).toEqual(w);
  expect(w.rng).toBe(JSON.parse(clean).rng);
});

test('room order cleans fresh layers at contact, reserves exclusively, resumes exactly and releases a disappearing target',()=>{
  const w=cleanlinessCamp(2),r=enclosedRoom(w,{x:10,z:10});
  const p=w.pawns[0]!,q=w.pawns[1]!;p.x=11;p.z=11;q.x=12;q.z=11;w.home=[...r.cells].sort((a,b)=>a-b);
  const target={x:13,z:13};w.tiles[target.z*w.width+target.x]!.floor='steel-tile';addFilth(w,target,'blood',3);const f=w.filth!.items[0]!;
  expect(cleaningWanted(w,p)).toBe(false);expect(applyCleanRoom(w,{type:'clean-room',pawnId:p.id,...r.inside})).toBeNull();
  expect(applyCleanRoom(w,{type:'clean-room',pawnId:q.id,...r.inside})).not.toBeNull();
  stepWorld(w);expect(f.thickness).toBe(3);until(w,()=>p.cleaning?.phase==='clean'&&p.cleaning.progress>0);
  const saved=deserializeWorld(serializeWorld(w)),start=w.tick,targetId=f.id;until(w,()=>!w.filth!.items.some(f=>f.id===targetId));
  stepWorld(saved,w.tick-start);expect(saved).toEqual(w);expect(p.cleaning).toBeUndefined();expect(w.filth!.cleaned).toBe(1);
  addFilth(w,target,'vomit');expect(applyCleanRoom(w,{type:'clean-room',pawnId:p.id,...r.inside})).toBeNull();
  removeFilth(w,w.filth!.items.find(f=>f.kind==='vomit')!);expect(p.cleaning).toBeUndefined();valid(w);
});

test('automatic cleaning waits for age, honors home and enabled work, and does not require disabling a higher unused priority',()=>{
  const w=cleanlinessCamp(),p=w.pawns[0]!,target={x:p.x+2,z:p.z};p.priorities.patient=1;
  addFilth(w,target,'blood');const id=w.filth!.items[0]!.id;stepWorld(w,65);expect(p.cleaning).toBeUndefined();
  expect(applyCommand(w,{type:'area',action:'home',from:target,to:target}).ok).toBe(true);
  until(w,()=>!w.filth!.items.some(f=>f.id===id));expect(w.filth!.cleaned).toBe(1);
  addFilth(w,target,'blood');p.priorities.clean=0;stepWorld(w,80);expect(w.filth!.items.some(f=>f.kind==='blood')).toBe(true);expect(p.cleaning).toBeUndefined();valid(w);
});

test('strict V88 migration creates no filth history, and current corrupt ages, duplicate targets and concurrent work are rejected',()=>{
  const w=cleanlinessCamp(),raw=withoutV90(JSON.parse(serializeWorld(w)));raw.schemaVersion=88;for(const p of raw.pawns)delete p.priorities.clean;
  const migrated=deserializeWorld(JSON.stringify(raw));expect(migrated.filth).toBeUndefined();expect(migrated.pawns.every(p=>p.priorities.clean===3&&!p.filthFeet)).toBe(true);
  raw.filth={rng:1,items:[],cleaned:0};expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow();
  addFilth(w,{x:14,z:15},'blood');addFilth(w,{x:15,z:15},'vomit');const f=w.filth!.items[0]!;const future=structuredClone(w);future.filth!.items[0]!.grownCore=1;expect(validateFilth(future,89).length).toBeGreaterThan(0);
  const p=w.pawns[0]!;p.cleaning={targets:[f.id,f.id],forced:true,phase:'approach',progress:0};expect(validateFilth(w,89)).toContain('Invalid cleaning reservation.');
  p.cleaning.targets=[f.id];p.research={stationId:1234,spot:{x:1,z:1},worked:0};expect(validateFilth(w,89)).toContain('Conflicting cleaning activity.');
});
