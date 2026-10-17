import {expect,test} from 'vitest';
import {validNativeHumanField256,validNativeHumanNonSpatialPosition256,validHumanAgeForPawn256,nativeHumanBiologicalCore256,type NativeHumanIdentity256} from '../src/sim/native-human-identity-256';
import {originalAncientHumanWord256,ancientHumanNameLabel256} from '../src/sim/ancient-human-name-256';
import {syncNativeHumanClinicalScale256,nativeHumanHealthScaleForCore256} from '../src/sim/native-human-clinical-scale-256';
import {HUMAN_YEAR_TICKS} from '../src/sim/human-age';
import {createMedicalRecord} from '../src/sim/injury-state';
import {startingPawn} from '../src/sim/starting-pawns';
import {prepareAncientResumeClock256} from '../src/sim/ancient-casket-clock-256';
import {partitionAncientNear256,type AncientCasketState256} from '../src/sim/ancient-casket-state-256';
import {reorganizationCamp256,preparedMotion} from './helpers/group-reorganization-v256';
import {prepareGroupSplit,prepareGroupMerge,commitGroupReorganization} from '../src/sim/group-reorganization';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/serialization';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import type {Pawn} from '../src/sim/types';
import type {AwayGroup} from '../src/sim/group-capture';

/** Explicit transport fixture only: NOT a birth producer, native Pawn proof,
 * retroactive migration, or grant to an adapted actor in the product. */
function preparedIdentity(p:Pawn,tick:number,remainder=3):NativeHumanIdentity256 {
 const name={first:originalAncientHumanWord256(1,100),nick:originalAncientHumanWord256(2,100),last:originalAncientHumanWord256(3,100),nickSet:true};
 // This declared transport fixture starts with its own fresh native dossier,
 // not an adapted starter's independently authored legacy age-ailment bits.
 const header:NativeHumanIdentity256={revision:1,gender:'Female',name,biologicalCoreRemainder:remainder};p.nativeHuman=header;p.name=ancientHumanNameLabel256(name);p.health=createMedicalRecord(tick);p.health.humanHealthScale=nativeHumanHealthScaleForCore256(nativeHumanBiologicalCore256(p));return header;
}
test('physical header is strict, descriptor-safe and never granted by absence',()=>{
 const p=startingPawn(1,'Transport préparé',3,3,0,55,123,0);preparedIdentity(p,0);
 expect(validNativeHumanField256(p,256)).toBe(true);expect(validNativeHumanField256(p,255)).toBe(false);expect(validNativeHumanField256({name:p.name,nativeHuman:undefined},256)).toBe(false);
 expect(validNativeHumanField256({name:'Ancien sans header'},255)).toBe(true);expect(validNativeHumanField256({name:'Ancien sans header'},256)).toBe(true);
 let reads=0;const accessor=Object.defineProperty({name:p.name},'nativeHuman',{enumerable:true,get(){reads++;throw Error('must not read');}});expect(validNativeHumanField256(accessor,256)).toBe(false);expect(reads).toBe(0);
 expect(validNativeHumanField256({...p,name:'Un label divergent'},256)).toBe(false);expect(validNativeHumanField256({...p,nativeHuman:{...p.nativeHuman,biologicalCoreRemainder:10}},256)).toBe(false);
});
test('age and clinical scale use the SAME biological ticks plus exact Core remainder',()=>{
 const p=startingPawn(1,'Âge préparé',3,3,0,55,123,0);preparedIdentity(p,0,9);
 for(const [ticks,scale] of [[14*HUMAN_YEAR_TICKS-1,Math.fround(.9)],[14*HUMAN_YEAR_TICKS,Math.fround(.9)],[18*HUMAN_YEAR_TICKS-1,Math.fround(.9)],[18*HUMAN_YEAR_TICKS,1]] as const){p.age={biologicalTicks:ticks,chronologicalTicks:100*HUMAN_YEAR_TICKS};syncNativeHumanClinicalScale256(p,nativeHumanBiologicalCore256(p));expect(nativeHumanBiologicalCore256(p)).toBe(ticks*10+9);expect(p.health!.humanHealthScale).toBe(scale);expect(validHumanAgeForPawn256(p,256)).toBe(true);expect(validHumanAgeForPawn256({...p,nativeHuman:undefined},256)).toBe(false);}
 const old=structuredClone(p);delete old.nativeHuman;delete old.health!.humanHealthScale;old.age={biologicalTicks:14*HUMAN_YEAR_TICKS,chronologicalTicks:100*HUMAN_YEAR_TICKS};expect(validHumanAgeForPawn256(old,256)).toBe(false);
});
test('held native Position keeps Invalid or actual former IntVec3; suspension changes no biological owner',()=>{
 const p=startingPawn(1,'Détenu préparé',3,3,0,55,123,100),header=preparedIdentity(p,100);p.x=-1000;p.z=-1000;
 expect(validNativeHumanNonSpatialPosition256(p,256)).toBe(true);p.x=249;p.z=249;expect(validNativeHumanNonSpatialPosition256(p,256)).toBe(true);expect(validNativeHumanNonSpatialPosition256({...p,x:1.5},256)).toBe(false);
 const state:AncientCasketState256={revision:1,groupId:-1,contentsKnown:false,heldAt:100,humans:[p],animals:[],items:[]},core=nativeHumanBiologicalCore256(p),chrono=p.age!.chronologicalTicks;
 const resume=prepareAncientResumeClock256(state,150);expect(resume.commit()).toBe(true);expect(nativeHumanBiologicalCore256(p)).toBe(core);expect(p.age!.chronologicalTicks).toBe(chrono+50);expect(p.nativeHuman).toBe(header);expect(p.x).toBe(249);
 const moved=partitionAncientNear256(state,new Set([p.id]),new Set());expect(moved.movedHumans[0]).toBe(p);expect(moved.movedHumans[0]!.nativeHuman).toBe(header);expect(moved.retainedHumans).toEqual([]);
});
test('real split/merge keeps originals and native fields; RAW/full/delta retain them at the confirmed owner',()=>{
 const f=reorganizationCamp256(),original=f.members[1]!,header=preparedIdentity(original,f.w.tick),before=JSON.stringify(header);
 expect(validateWorld(f.w)).toEqual([]);const split=prepareGroupSplit(f.w,{type:'group-split',groupId:f.g.id,memberIds:[original.id],inventory:[]});if(split.kind!=='ready')throw Error(split.reason);expect(commitGroupReorganization(split.plan).ok).toBe(true);
 const child=split.plan.created[0]!,childState=child.state as AwayGroup;expect(childState.members[0]).toBe(original);expect(original.nativeHuman).toBe(header);
 const merge=prepareGroupMerge(f.w,{type:'group-merge',groupIds:[f.g.id,childState.id]},preparedMotion(f.w));if(merge.kind!=='ready')throw Error(merge.reason);expect(commitGroupReorganization(merge.plan).ok).toBe(true);
 expect((f.record.state as AwayGroup).members.find(p=>p.id===original.id)).toBe(original);expect(JSON.stringify(original.nativeHuman)).toBe(before);
 const raw=serializeCampaign(f.w),loaded=deserializeCampaign(raw);expect(serializeCampaign(loaded)).toBe(raw);expect(loaded.worldGroups!.groups.flatMap(r=>'members'in r.state?r.state.members:[]).find(p=>p.id===original.id)!.nativeHuman).toEqual(header);
 const enc=new SnapshotEncoder(),dec=new SnapshotDecoder(),full=structuredClone(enc.encode(f.w,0,0));expect(dec.adopt(full).status).toBe('applied');const delta=structuredClone(enc.encode(f.w,0,0));expect(delta.kind).toBe('delta');const adopted=dec.adopt(delta);expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world.campaignMap?.revision===2&&adopted.world.campaignMap.groups.flatMap(r=>'members'in r.state?r.state.members:[]).find(p=>p.id===original.id)!.nativeHuman).toEqual(header);
});
test('full and delta reject future/header divergence without replacing the prior snapshot',()=>{
 const f=reorganizationCamp256(),enc=new SnapshotEncoder(),dec=new SnapshotDecoder(),first=structuredClone(enc.encode(f.w,0,0));expect(dec.adopt(first).status).toBe('applied');
 const broken=structuredClone(enc.encode(f.w,0,0));broken.world.pawns[0]!.nativeHuman=undefined;expect(dec.adopt(broken).status).toBe('resync');
 const checkpoint=structuredClone(new SnapshotEncoder().encode(f.w,0,0));checkpoint.world.pawns[0]!.nativeHuman=undefined;expect(new SnapshotDecoder().adopt(checkpoint).status).toBe('resync');
});
