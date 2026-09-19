import { withoutResearch,withMigratedResearch } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization';
import { SCHEMA_VERSION } from '../src/sim/types';
import { moodFrozen,moodTarget,moodThoughts,updateMood } from '../src/sim/mood';
import { rememberMeal } from '../src/sim/wellbeing';
import { addMaterial } from '../src/sim/materials';
import { medicalCamp,controlledInjury } from './scenarios/health';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots';

function camp(){const w=medicalCamp(1),p=w.pawns[0]!;w.piles=[];Object.assign(p,{hunger:80,rest:80,comfort:50,mood:50});p.recreation.level=50;return w;}
const view=(w:ReturnType<typeof camp>)=>moodThoughts(w,w.pawns[0]!);
const valid=(w:ReturnType<typeof camp>)=>expect(validateWorld(w)).toEqual([]);

test('thought families: exact need boundaries, anatomical pain and weakest worn garment, never summed twice',()=>{
  const w=camp(),p=w.pawns[0]!;expect(moodTarget(view(w))).toBe(62);
  for(const [value,offset] of [[0,-20],[.001,-12],[11.999,-12],[12,-6],[23.999,-6],[24,0],[100,0]]){p.hunger=value!;expect(moodTarget(view(w))-62).toBe(offset);}
  p.hunger=80;
  for(const [value,offset] of [[0,-18],[.999,-18],[1,-12],[13.999,-12],[14,-6],[27.999,-6],[28,0]]){p.rest=value!;expect(moodTarget(view(w))-62).toBe(offset);}
  p.rest=80;
  for(const [value,offset] of [[0,-3],[9.999,-3],[10,0],[59.999,0],[60,4],[70,6],[80,8],[90,10]]){p.comfort=value!;expect(moodTarget(view(w))-62).toBe(offset);}
  p.comfort=50;
  for(const [value,offset] of [[0,-20],[.999,-20],[1,-10],[14.999,-10],[15,-5],[29.999,-5],[30,0],[70,5],[85,10]]){p.recreation.level=value!;expect(moodTarget(view(w))-62).toBe(offset);}
  p.recreation.level=50;
  addMaterial(w,'apparel',1,{type:'apparel',pawnId:p.id},'cloth-shirt');addMaterial(w,'apparel',1,{type:'apparel',pawnId:p.id},'flak-vest');
  const shirt=w.piles.at(-2)!,vest=w.piles.at(-1)!;
  for(const [hp,offset] of [[100,0],[99,-3],[40,-3],[39,-5]]){vest.apparel!.hitPoints=hp!;expect(moodTarget(view(w))-62).toBe(offset);}
  shirt.apparel!.hitPoints=1;expect(view(w).filter(t=>t.id.includes('apparel'))).toHaveLength(1);expect(moodTarget(view(w))).toBe(57);
  controlledInjury(w,p,'torso',10000);expect(view(w).some(t=>t.id==='minor-pain')).toBe(true);valid(w);
  for(const [severity,offset] of [[1,0],[8,-5],[11999,-5],[12000,-10],[31999,-10],[32000,-15],[63999,-15],[64000,-20]]){
    const v=camp(),actor=v.pawns[0]!;let remaining=severity!;
    for(const part of ['torso','left-leg','right-leg','left-arm','right-arm','head','neck'] as const){const amount=Math.min(10000,remaining);if(amount)controlledInjury(v,actor,part,amount);remaining-=amount;}
    expect(moodTarget(view(v))-62).toBe(offset);valid(v);
  }
  Object.assign(p,{hunger:0,rest:0,comfort:0});p.recreation.level=0;rememberMeal(w,p,false,true);expect(moodTarget(view(w))).toBe(0);p.mood=.01;updateMood(w,p);expect(p.mood).toBe(0);

});

test('mood pursues a separate target with bounded rise/fall, freezes in sleep but not merely when downed',()=>{
  const w=camp(),p=w.pawns[0]!;p.mood=0;
  for(let i=0;i<250;i++)updateMood(w,p);expect(p.mood).toBeCloseTo(12,9);
  p.mood=100;for(let i=0;i<250;i++)updateMood(w,p);expect(p.mood).toBeCloseTo(92,9);
  p.mood=61.99;updateMood(w,p);expect(p.mood).toBe(62);p.mood=62.01;updateMood(w,p);expect(p.mood).toBe(62);
  p.mood=50;p.state='sleeping';for(let i=0;i<250;i++)updateMood(w,p);expect(p.mood).toBe(50);
  p.state='resting';p.medicalSleep=true;updateMood(w,p);expect(p.mood).toBe(50);delete p.medicalSleep;updateMood(w,p);expect(p.mood).toBeGreaterThan(50);
  p.state='idle';controlledInjury(w,p,'left-leg',30000);controlledInjury(w,p,'right-leg',30000);expect(p.state).toBe('downed');expect(moodFrozen(p)).toBe(false);
  p.mood=100;updateMood(w,p);expect(p.mood).toBeCloseTo(99.968,9);
  controlledInjury(w,p,'brain',8000);expect(moodFrozen(p)).toBe(true);const before=p.mood;updateMood(w,p);expect(p.mood).toBe(before);valid(w);
});

test('situations follow physical removal, meal memories refresh without stacking, expire in sleep and on retained bodies, replay and snapshots agree',()=>{
  const w=camp(),p=w.pawns[0]!;addMaterial(w,'apparel',1,{type:'apparel',pawnId:p.id},'flak-vest');const vest=w.piles.at(-1)!;vest.apparel!.hitPoints=10;
  expect(applyCommand(w,{type:'order-equipment',pawnId:p.id,itemId:vest.id,action:'remove',queue:false}).ok).toBe(true);stepWorld(w,10);expect(view(w).some(t=>t.id==='tattered-apparel')).toBe(true);
  const clone=deserializeWorld(serializeWorld(w));stepWorld(w,20);stepWorld(clone,20);expect(clone).toEqual(w);expect(vest.owner.type).toBe('ground');expect(view(w).some(t=>t.id.includes('apparel'))).toBe(false);
  rememberMeal(w,p,false,true);const expiry=p.memories[0]!.expiresAt;stepWorld(w,3);rememberMeal(w,p,false,true);expect(p.memories).toHaveLength(2);expect(p.memories[0]!.expiresAt).toBe(expiry+3);
  rememberMeal(w,p,true,false);expect(p.memories).toHaveLength(2);expect(view(w).filter(t=>t.kind==='memory').map(t=>t.offset)).toEqual([-3,-7]);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(decoder.adopt(encoder.encode(w,0,1))).toMatchObject({status:'applied',world:w});
  for(const m of p.memories)m.expiresAt=w.tick+2;p.schedule.fill('sleep');p.state='sleeping';p.need={kind:'sleep',phase:'sleep',bedId:null,target:{x:p.x,z:p.z}};p.rest=20;const sleepingMood=p.mood;stepWorld(w,2);expect(p.mood).toBe(sleepingMood);expect(p.memories).toEqual([]);valid(w);
  rememberMeal(w,p,false,true);for(const m of p.memories)m.expiresAt=w.tick+2;controlledInjury(w,p,'heart',15000);expect(p.state).toBe('dead');stepWorld(w,2);expect(p.memories).toEqual([]);valid(w);
});

test('strict V63 adoption preserves mood, needs, memories and PRNG then follows new dynamics with exact continuation',()=>{
  const old=camp(),p=old.pawns[0]!;rememberMeal(old,p,false);p.mood=87.25;((old as any).schemaVersion=63,withoutResearch(old));
  const migrated=deserializeWorld(JSON.stringify(old));expect(migrated).toEqual(withMigratedResearch({...old,schemaVersion:SCHEMA_VERSION}));
  const copy=deserializeWorld(serializeWorld(migrated));stepWorld(migrated,60);stepWorld(copy,60);expect(copy).toEqual(migrated);expect(migrated.pawns[0]!.mood).toBeCloseTo(87.25-60*.032,8);valid(migrated);
  for(const mutate of [(v:any)=>v.pawns[0].mood=101,(v:any)=>v.pawns[0].memories[0].expiresAt=v.tick,(v:any)=>v.pawns[0].memories.push({...v.pawns[0].memories[0]})]){const v=structuredClone(old);mutate(v);expect(()=>deserializeWorld(JSON.stringify(v))).toThrow(/version 63/);}
});
