import {preparedSchema256} from './helpers/legacy-fixture-guards.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {planNaturalHiveLoss256,validNaturalHiveLoss256} from '../src/sim/cave-hive-loss-256.ts';
import {hiveReproductionFactor256} from '../src/sim/cave-hive-profile-256.ts';
import {validHiveDefeatMemory256,hiveDefeatThoughts256} from '../src/sim/cave-hive-memories-256.ts';
import {pauseGlowPod256,resumeGlowPod256,validGlowPodPacked256} from '../src/sim/cave-glowpod-minification-256.ts';
import type {Structure} from '../src/sim/types.ts';
import {describe,it,expect} from 'vitest';
import {hiveMtbOccurs256,hiveMaintenanceChance256,OBSERVED_HIVE_MAINTENANCE_KEY_256} from '../src/sim/cave-hive-think-256.ts';
import {validHiveRuntimeFields256} from '../src/sim/cave-hive-runtime-save-256.ts';
import {validMaterialPermission256} from '../src/sim/material-permission-256.ts';
import {glowPodAgeAtCore256,hiveNextPawnCore256} from '../src/sim/cave-hive-clocks-256.ts';
describe('Hive runtime narrow closed facts, no activation claim',()=>{
 it('uses the observed executable clone key, keeps the exact hourly throttle',()=>{
  expect(OBSERVED_HIVE_MAINTENANCE_KEY_256).toEqual({tree:'Insect',duty:'DefendAndExpandHive',key:-1527103351});
  const data={maintenanceLastTryCore:100};
  expect(hiveMaintenanceChance256(31,2599,62599,data,OBSERVED_HIVE_MAINTENANCE_KEY_256)).toBe(false);expect(data.maintenanceLastTryCore).toBe(100);
  hiveMaintenanceChance256(31,2600,62600,data,OBSERVED_HIVE_MAINTENANCE_KEY_256);expect(data.maintenanceLastTryCore).toBe(2600);
  expect(hiveMaintenanceChance256(31,2600,62600,data,OBSERVED_HIVE_MAINTENANCE_KEY_256)).toBe(false);
  const before={...data};expect(()=>hiveMaintenanceChance256(31,5100,65100,data,{tree:'Insect',duty:'DefendAndExpandHive',key:1})).toThrow();expect(data).toEqual(before);expect(()=>hiveMaintenanceChance256(31,5100,65100,data,{tree:'Insect',duty:'DefendAndExpandHive',key:-2})).toThrow();expect(data).toEqual(before);
 });
 it('keeps linear MTB and its real small-rate gate/draw count',()=>{
  let calls=0;expect(hiveMtbOccurs256(4,2500,1,{value:()=>{calls++;return 1;}})).toBe(false);expect(calls).toBe(1);
  const sequence=[0,0];calls=0;expect(hiveMtbOccurs256(40,2500,1,{value:()=>{calls++;return sequence.shift()!;}})).toBe(true);expect(calls).toBe(2);
  expect(hiveMtbOccurs256(2.5,2500,2500,{value:()=>.39999})).toBe(true);expect(hiveMtbOccurs256(2.5,2500,2500,{value:()=>.4})).toBe(false);
 });
 it('rejects future permission, own undefined and malformed actual item',()=>{
  const pile={item:'insect-jelly',forbidden:true};expect(validMaterialPermission256(pile,256)).toBe(true);expect(validMaterialPermission256(pile,255)).toBe(false);
  expect(validMaterialPermission256({item:'insect-jelly',forbidden:undefined},256)).toBe(false);
  let reads=0;const value={item:'insect-jelly'};Object.defineProperty(value,'forbidden',{enumerable:true,get(){reads++;return true;}});expect(validMaterialPermission256(value,256)).toBe(false);expect(reads).toBe(0);
 });
 it('keeps intrinsic think data after detach but never an orphan local reservation',()=>{
  const actor={species:'megascarab',state:'idle',hive:{factionId:7,lordId:null,spawnerId:null},hiveThink:{maintenanceLastTryCore:100}};
  expect(validHiveRuntimeFields256(actor,256,10,100)).toBe(true);expect(validHiveRuntimeFields256(actor,255,10,100)).toBe(false);
  expect(validHiveRuntimeFields256({...actor,hiveJob:{kind:'maintain',hiveId:50,progressCore:0}},256,10,100)).toBe(false);
  expect(validHiveRuntimeFields256({...actor,hive:{...actor.hive,lordId:0},hiveJob:{kind:'maintain',hiveId:50,progressCore:179}},256,10,100)).toBe(true);
  expect(validHiveRuntimeFields256({...actor,hiveThink:undefined},256,10,100)).toBe(false);
 });
 it('retains rare ThingID phase and the disabled pawn spawner scheduling draw',()=>{
  expect(glowPodAgeAtCore256(31,0,30)).toBe(-1);expect(glowPodAgeAtCore256(31,0,31)).toBe(249);expect(glowPodAgeAtCore256(31,31,31)).toBe(-1);
  let draws=0;const next=hiveNextPawnCore256(500,0,1,{float:(a,_b)=>{draws++;return Math.fround(a);}});expect(draws).toBe(1);expect(next).toBe(51500);
 });
 it('reads only the real shipped difficulty profile and refuses a missing one',()=>{
  expect(hiveReproductionFactor256({gameProfile:{revision:1,storyteller:'cassandra-partial',difficulty:'adventure-story',saveMode:'reloadable'}})).toBe(.5);
  expect(()=>hiveReproductionFactor256({})).toThrow();
 });
 it('suspends the SAME minified GlowPod counter without catch-up or a new identity',()=>{
  const s:Structure={id:31,kind:'glow-pod',x:10,z:10,orientation:0,footprint:'standard',factionId:null,glowPod:{revision:1,madeAtCore:0,ageCore:-1}};
  pauseGlowPod256(preparedSchema256({schemaVersion:SCHEMA_VERSION,tick:2}),s);const original=s.glowPod;
  expect(validGlowPodPacked256(s,256,{width:250,height:250,tick:200,nextId:40})).toBe(true);
  expect(validGlowPodPacked256(s,255,{width:250,height:250,tick:200,nextId:40})).toBe(false);
  resumeGlowPod256(preparedSchema256({schemaVersion:SCHEMA_VERSION,tick:200}),s);expect(s.id).toBe(31);expect(s.glowPod).toBe(original);expect(s.glowPod!.ageCore).toBe(-1);expect(s.glowPod!.lastCore).toBe(2000);
  expect(validGlowPodPacked256({...s,glowPod:{...s.glowPod!,lastCore:undefined}},256,{width:250,height:250,tick:200,nextId:40})).toBe(false);
 });
 it('keeps the actual memory cap, expiration and future descriptor fences',()=>{
  const p={hiveDefeats:[0,1,2,3,4]};expect(validHiveDefeatMemory256(p,256,4)).toBe(true);expect(validHiveDefeatMemory256(p,255,4)).toBe(false);expect(validHiveDefeatMemory256({hiveDefeats:[5]},256,4)).toBe(false);
  expect(validHiveDefeatMemory256({hiveDefeats:undefined},256,4)).toBe(false);expect(validHiveDefeatMemory256({hiveDefeats:[0,0,0,0,0,0]},256,4)).toBe(false);
  expect(hiveDefeatThoughts256({hiveDefeats:[0]},59999)[0]!.offset).toBe(4);expect(hiveDefeatThoughts256({hiveDefeats:[0]},60000)).toEqual([]);
  let reads=0;const forged={};Object.defineProperty(forged,'hiveDefeats',{enumerable:true,get(){reads++;return [];}});expect(validHiveDefeatMemory256(forged,256,4)).toBe(false);expect(reads).toBe(0);
 });

 it('counts real natural destruction without inventing a material loss or allowing old fields',()=>{
  const first=planNaturalHiveLoss256(undefined,'glow-pod')!;expect(first).toEqual({count:1,lost:{},natural:{'glow-pod':1}});expect(validNaturalHiveLoss256(first,256)).toBe(true);expect(validNaturalHiveLoss256(first,255)).toBe(false);
  const next=planNaturalHiveLoss256(first,'insect-hive')!;expect(first.count).toBe(1);expect(next).toEqual({count:2,lost:{},natural:{'glow-pod':1,'insect-hive':1}});
  expect(validNaturalHiveLoss256({count:1,lost:{},natural:{}},256)).toBe(false);expect(validNaturalHiveLoss256({count:0,lost:{},natural:{'glow-pod':1}},256)).toBe(false);expect(validNaturalHiveLoss256({count:1,lost:{},natural:undefined},256)).toBe(false);
  let reads=0;const forged={count:1,lost:{}};Object.defineProperty(forged,'natural',{enumerable:true,get(){reads++;return {'glow-pod':1};}});expect(validNaturalHiveLoss256(forged,256)).toBe(false);expect(reads).toBe(0);
 });

});
