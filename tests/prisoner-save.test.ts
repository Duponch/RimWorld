import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { validateWorld,serializeWorld,deserializeWorld } from '../src/sim/serialization.ts';
import { createPrisonerState } from '../src/sim/prisoner-state.ts';
import { exitPrisoner } from '../src/sim/prisoner-exit.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { newApparelState } from '../src/sim/apparel-rules.ts';
import { advanceRaids } from '../src/sim/raids.ts';
import { prisonerUiFixture,recruitmentUiFixture } from './scenarios/prison-camp.ts';
import type { World } from '../src/sim/types.ts';
import { withoutV90 } from './scenarios/legacy-skills.ts';

const valid=(w:World)=>expect(validateWorld(w),JSON.stringify({tick:w.tick,pawns:w.pawns.map(p=>({id:p.id,state:p.state,prisoner:p.prisoner,rescue:p.rescue,ward:p.ward,need:p.need}))})).toEqual([]);
function continuation(w:World,ticks=8){valid(w);const copy=deserializeWorld(serializeWorld(w));stepWorld(w,ticks);stepWorld(copy,ticks);expect(copy).toEqual(w);valid(w);}
function until(w:World,done:()=>boolean,max:number){for(let i=0;i<max&&!done();i++){stepWorld(w);valid(w);}expect(done()).toBe(true);}
function rejected(w:World,mutations:((w:World)=>void)[]){for(const mutate of mutations){const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad)),mutate.toString()).toThrow();}}

test('V85 validates before neutral migration and refuses every future prisoner record',()=>{
  // Real V84 colony promoted only by the documented V84->85 basic priority.
  const old=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/colony-v84.json.gz',import.meta.url))).toString('utf8')) as World;
  old.schemaVersion=85 as typeof old.schemaVersion;for(const p of old.pawns)p.priorities.basic=3;
  const upgraded=deserializeWorld(JSON.stringify(old));expect(upgraded.schemaVersion).toBe(90);expect(upgraded.tick).toBe(old.tick);expect(upgraded.prisonDepartures).toBeUndefined();expect(upgraded.pawns.every(p=>!p.prisoner&&!p.recruitment&&!p.ward)).toBe(true);expect(upgraded.pawns.every(p=>p.priorities.clean===3&&p.priorities.firefight===1&&p.priorities.warden===3)).toBe(true);
  const base=withoutV90(prisonerUiFixture().world);base.schemaVersion=85 as typeof base.schemaVersion;for(const p of base.pawns)delete (p.priorities as Partial<typeof p.priorities>).clean;for(const p of base.pawns)delete (p.priorities as Partial<typeof p.priorities>).warden;for(const p of base.pawns)delete (p.priorities as Partial<typeof p.priorities>).firefight;
  expect(()=>deserializeWorld(JSON.stringify(base))).not.toThrow();
  rejected(base,[w=>{w.pawns[0]!.prisoner=createPrisonerState(w,w.pawns[0]!);},w=>{w.pawns[0]!.recruitment={capturedAt:0,recruitedAt:0,fromFaction:'outlaws'};},w=>{w.prisonDepartures=[];},w=>{w.structures.find(s=>s.kind==='bed')!.prisoner=true;},w=>{w.pawns[0]!.ward={kind:'chat',patientId:w.pawns[2]!.id,spot:{x:9,z:10},phase:'approach',progress:0,rapports:0};},w=>{w.pawns[0]!.priorities.warden=3;}]);
  const invalid=structuredClone(old);invalid.pawns[0]!.hunger=-1;expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/version 85/);
  const packed=structuredClone(base),bed=packed.structures.find(s=>s.kind==='bed')!;packed.structures=packed.structures.filter(s=>s!==bed);packed.packed=[{building:bed,owner:{type:'ground',x:16,z:16}}];
  expect(()=>deserializeWorld(JSON.stringify(packed))).not.toThrow();rejected(packed,[v=>{v.packed[0]!.building.prisoner=true;}]);
});

test('physical capture survives approach and shared carry, rejects corrupt roles and preserves a captured person',()=>{
  const {world:w,actorId,patientId,bedId}=prisonerUiFixture(),actor=w.pawns.find(p=>p.id===actorId)!,patient=w.pawns.find(p=>p.id===patientId)!;
  expect(applyCommand(w,{type:'prison-bed',bedId,enabled:true}).ok).toBe(true);expect(applyCommand(w,{type:'order-capture',pawnId:actorId,patientId,queue:false}).ok).toBe(true);
  continuation(w,2);until(w,()=>actor.rescue?.phase==='carry'&&actor.moveCooldown>0,250);
  rejected(w,[v=>{v.pawns.find(p=>p.id===actorId)!.rescue!.capture=undefined;},v=>{v.pawns.find(p=>p.id===actorId)!.orders.active=null;},v=>{v.pawns.find(p=>p.id===patientId)!.x++;},v=>{v.pawns.find(p=>p.id===patientId)!.prisoner=createPrisonerState(v,v.pawns.find(p=>p.id===patientId)!);},v=>{delete v.structures.find(b=>b.id===bedId)!.prisoner;}]);
  continuation(w,3);until(w,()=>!!patient.prisoner,350);continuation(w,2);
  rejected(w,[v=>{v.pawns.find(p=>p.id===patientId)!.prisoner!.resistance=-.1;},v=>{v.pawns.find(p=>p.id===patientId)!.prisoner!.rng=0;},v=>{v.pawns.find(p=>p.id===patientId)!.prisoner!.capturedAt=v.tick+1;},v=>{v.pawns.find(p=>p.id===patientId)!.faction='colony';},v=>{delete v.structures.find(b=>b.id===bedId)!.prisoner;},v=>{Object.assign(v.pawns.find(p=>p.id===patientId)!.prisoner!,{invented:true});}]);
});

test('ward food ownership and completed recruitment closing remain exact across save boundaries',()=>{
  const fixture=recruitmentUiFixture(),w=fixture.world,actor=w.pawns.find(p=>p.id===fixture.actorId)!,patient=w.pawns.find(p=>p.id===fixture.patientId)!;
  actor.priorities.warden=1;patient.hunger=20;
  until(w,()=>actor.ward?.kind==='food'&&actor.ward.phase==='pickup',120);continuation(w,2);
  until(w,()=>actor.ward?.kind==='food'&&actor.ward.phase==='deliver',180);
  rejected(w,[v=>{const a=v.pawns.find(p=>p.id===actor.id)!;if(a.ward?.kind==='food')a.ward.quantity++;},v=>{const a=v.pawns.find(p=>p.id===actor.id)!;if(a.ward?.kind==='food')a.ward.carryPileId=null;},v=>{v.pawns.find(p=>p.id===actor.id)!.priorities.warden=0;},v=>{v.pawns.find(p=>p.id===actor.id)!.orders.active='rescue';}]);
  continuation(w,3);until(w,()=>!actor.ward,250);
  // A separate already-persuaded boundary isolates recruitment persistence;
  // progression to zero belongs to the gameplay producer scenario.
  const q=recruitmentUiFixture(),a=q.world.pawns.find(p=>p.id===q.actorId)!,p=q.world.pawns.find(p=>p.id===q.patientId)!;
  p.prisoner!.resistance=0;p.prisoner!.mode='recruit';a.priorities.warden=1;
  until(q.world,()=>!!p.recruitment,260);expect(a.ward).toMatchObject({kind:'chat',phase:'closing',rapports:5});expect(p.prisoner).toBeUndefined();continuation(q.world,3);
  rejected(q.world,[v=>{v.pawns.find(c=>c.id===p.id)!.recruitment!.recruitedAt=v.tick+1;},v=>{v.pawns.find(c=>c.id===p.id)!.faction='outlaws';},v=>{const c=v.pawns.find(c=>c.id===a.id)!;if(c.ward?.kind==='chat')c.ward.rapports=4;}]);
});

test('prisoner departure exports the same worn object once and rejects missing or duplicate identities',()=>{
  const {world:w,patientId}=recruitmentUiFixture(),p=w.pawns.find(p=>p.id===patientId)!;
  p.x=0;p.z=10;p.need=null;p.bedId=null;p.path=[];p.motion=null;p.moveCooldown=0;p.prisoner!.escape={x:0,z:10};
  const item={id:w.nextId++,kind:'apparel' as const,item:'cloth-shirt' as const,quantity:1,owner:{type:'apparel' as const,pawnId:p.id},apparel:newApparelState('cloth-shirt')};w.piles.push(item);refreshStock(w);
  valid(w);expect(exitPrisoner(w,p)).toBe(true);expect(w.prisonDepartures?.[0]?.items).toEqual([item]);expect(w.pawns.some(q=>q.id===patientId)).toBe(false);expect(w.piles.some(i=>i.id===item.id)).toBe(false);continuation(w,4);
  rejected(w,[v=>{v.prisonDepartures![0]!.cell={x:3,z:3};},v=>{v.prisonDepartures![0]!.pawnId=v.pawns[0]!.id;},v=>{v.prisonDepartures![0]!.items[0]!.id=v.piles[0]!.id;},v=>{v.prisonDepartures![0]!.items[0]!.quantity=2;},v=>{v.prisonDepartures!.push(structuredClone(v.prisonDepartures![0]!));}]);
});

test('raid results count a captive once and recruitment keeps the former group without a live hostile mandate',()=>{
  // An isolated already-captured raid boundary; the ordinary raid controller
  // produces its outcome. The end-to-end assault is covered by prisoners.test.
  const {world:w,patientId}=recruitmentUiFixture(),p=w.pawns.find(p=>p.id===patientId)!;
  p.raid={group:1,exiting:true,goal:null};w.raids={profile:'camp-raids-v1',rng:1,nextCheck:null,serial:1,completed:0,departed:[],active:{id:1,startedAt:w.tick,deadline:w.tick+2600,lossPermille:500,members:[p.id],lost:[],phase:'assault'}};
  valid(w);advanceRaids(w);expect(w.raids.last).toMatchObject({captured:1,killed:0,downed:0,escaped:0});continuation(w,2);
  rejected(w,[v=>{v.raids!.last!.captured=2;},v=>{v.raids!.last!.captured=0;},v=>{v.raids!.last!.downed=1;},v=>{v.pawns.find(q=>q.id===patientId)!.raid!.goal={x:0,z:1};}]);
  p.recruitment={capturedAt:p.prisoner!.capturedAt,recruitedAt:w.tick,fromFaction:'outlaws',raidGroup:1};delete p.prisoner;delete p.raid;p.faction='colony';p.bedId=null;valid(w);
  rejected(w,[v=>{v.pawns.find(q=>q.id===patientId)!.recruitment!.raidGroup=2;},v=>{v.pawns.find(q=>q.id===patientId)!.raid={group:1,exiting:true,goal:null};}]);
});
