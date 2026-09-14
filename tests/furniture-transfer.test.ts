import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld,addGroundMaterial } from '../src/sim/index';
import { releaseWork } from '../src/sim/work-release';
import { groundCapacity } from '../src/sim/ground-placement';
import { footprintCells } from '../src/sim/definitions';
import { queryOrderOptions } from '../src/sim/player-orders';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction';
import { woodAccount } from './scenarios/colony-player';
import type { World } from '../src/sim/types';

function until(w:World,done:()=>boolean,limit=1000){for(let i=0;i<limit&&!done();i++){stepWorld(w);expect(validateWorld(w),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns,packed:w.packed})).toEqual([]);}expect(done(),JSON.stringify({jobs:w.jobs,pawns:w.pawns,packed:w.packed})).toBe(true);}
test('a bed keeps its identity, ownership and resources through uninstall, ground storage, pickup, interruption, rotation and exact resume',()=>{
 const w=deconstructionCamp(),pawn=w.pawns[0]!,bed=fixtureBuilding(w,'bed',14,16,1);pawn.bedId=bed.id;const initial=woodAccount(w);
 expect(applyCommand(w,{type:'designate',kind:'uninstall',x:15,z:16}).ok).toBe(true);
 until(w,()=>w.packed.length===1);expect(w.structures).toHaveLength(0);expect(pawn.bedId).toBe(bed.id);expect(w.packed[0]!.building).toBe(bed);expect(woodAccount(w)).toBe(initial);
 const owner=w.packed[0]!.owner;if(owner.type!=='ground')throw Error('Expected a real ground package');expect(groundCapacity(w,owner,'wood')).toBe(0);
 const invalidPack=JSON.parse(serializeWorld(w));invalidPack.packed[0].building.x=w.width-1;expect(()=>deserializeWorld(JSON.stringify(invalidPack))).toThrow();invalidPack.packed[0].building.x=14;invalidPack.packed[0].building.orientation=99;expect(validateWorld(invalidPack).length).toBeGreaterThan(0);
 expect(applyCommand(w,{type:'install',structureId:bed.id,x:23,z:20,orientation:3}).ok).toBe(true);
 const job=w.jobs[0]!;expect(footprintCells(job)).toEqual([{x:23,z:20},{x:22,z:20}]);
 expect(queryOrderOptions(w,pawn.id,job).some(o=>o.enabled)).toBe(true);
 until(w,()=>w.packed[0]?.owner.type==='pawn');expect(w.structures).toHaveLength(0);expect(woodAccount(w)).toBe(initial);
 expect(releaseWork(w,pawn)).toBe(true);expect(w.packed[0]!.owner.type).toBe('ground');expect(job.progress).toBe(0);
 until(w,()=>w.packed[0]?.owner.type==='pawn');const copy=deserializeWorld(serializeWorld(w));
 const enc=new SnapshotEncoder(),dec=new SnapshotDecoder();dec.adopt(structuredClone(enc.encode(w,0,1)));
 until(w,()=>!w.jobs.length);stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);expect(w.structures[0]).toBe(bed);expect(bed).toMatchObject({x:23,z:20,orientation:3});expect(pawn.bedId).toBe(bed.id);expect(w.stock.wood).toBe(0);expect(woodAccount(w)).toBe(initial);
 const adopted=dec.adopt(structuredClone(enc.encode(w,0,1)));expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);
});
test('direct reinstall clears a planted destination, reserves the source, and cancel while carried retains exactly one recoverable object',()=>{
 const w=deconstructionCamp(2),bed=fixtureBuilding(w,'bed',14,16),pawn=w.pawns[0]!,other=w.pawns[1]!;
 other.priorities.build=0;w.resources.push({id:w.nextId++,kind:'tree',amount:12,x:20,z:18});const initial=woodAccount(w);
 expect(applyCommand(w,{type:'install',structureId:bed.id,x:20,z:18,orientation:1}).ok).toBe(true);
 expect(applyCommand(w,{type:'install',structureId:bed.id,x:21,z:21,orientation:0}).ok).toBe(false);
 expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:14,z:16}).ok).toBe(false);
 expect(applyCommand(w,{type:'cancel',x:14,z:16}).ok).toBe(true);expect(w.jobs).toHaveLength(0);expect(w.structures).toContain(bed);
 expect(applyCommand(w,{type:'install',structureId:bed.id,x:20,z:18,orientation:1}).ok).toBe(true);
 until(w,()=>w.packed[0]?.owner.type==='pawn');expect(w.resources).toHaveLength(0);expect(woodAccount(w)).toBe(initial);
 expect(applyCommand(w,{type:'cancel',x:21,z:18}).ok).toBe(true);expect(w.jobs).toHaveLength(0);expect(w.packed).toHaveLength(1);expect(w.packed[0]!.owner.type).toBe('ground');expect(pawn.jobId).toBeNull();expect(woodAccount(w)).toBe(initial);expect(validateWorld(w)).toEqual([]);
 expect(applyCommand(w,{type:'install',structureId:bed.id,x:14,z:16,orientation:3}).ok).toBe(true);until(w,()=>!w.packed.length);expect(w.structures[0]).toBe(bed);
});
test('full floors and conflicting uses refuse atomically; migration and corrupt identity/carrier/target data remain strict',()=>{
 const w=deconstructionCamp(),table=fixtureBuilding(w,'table',14,16),wall=fixtureBuilding(w,'wall',18,16),p=w.pawns[0]!;
 const before=serializeWorld(w);expect(applyCommand(w,{type:'designate',kind:'uninstall',x:wall.x,z:wall.z}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 expect(applyCommand(w,{type:'install',structureId:table.id,x:18,z:16,orientation:0}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 expect(applyCommand(w,{type:'install',structureId:table.id,x:23,z:16,orientation:0}).ok).toBe(true);until(w,()=>w.packed[0]?.owner.type==='pawn');
 for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(!w.structures.some(s=>s.x===x&&s.z===z))addGroundMaterial(w,'food',10,{x,z},'survival-meal');
 const full=serializeWorld(w);expect(applyCommand(w,{type:'cancel',x:23,z:16}).ok).toBe(false);expect(serializeWorld(w)).toBe(full);expect(releaseWork(w,p)).toBe(false);
 const corrupted=JSON.parse(full);corrupted.packed[0].owner.pawnId=999999;expect(()=>deserializeWorld(JSON.stringify(corrupted))).toThrow();
 const duplicate=JSON.parse(full);duplicate.packed.push(duplicate.packed[0]);expect(()=>deserializeWorld(JSON.stringify(duplicate))).toThrow();
 const bad=JSON.parse(full);bad.jobs[0].furniture.structureId=wall.id;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
 const legacy=JSON.parse(before);legacy.schemaVersion=24;delete legacy.packed;const migrated=deserializeWorld(JSON.stringify(legacy));expect(migrated.packed).toEqual([]);expect(migrated.structures).toEqual(JSON.parse(before).structures);expect(migrated.schemaVersion).toBe(27);
 legacy.packed=[];expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow();
});

test('a sleeping user delays removal, source cancellation preserves the object, and in-place rotation preserves the bed',()=>{
 const w=deconstructionCamp(2),bed=fixtureBuilding(w,'bed',14,16),user=w.pawns[1]!,builder=w.pawns[0]!;
 user.bedId=bed.id;user.rest=20;user.priorities.build=0;user.schedule.fill('sleep');user.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:14,z:16}};user.state='sleeping';
 expect(applyCommand(w,{type:'install',structureId:bed.id,x:14,z:16,orientation:1}).ok).toBe(true);
 const job=w.jobs[0]!;expect(queryOrderOptions(w,builder.id,job)[0]!.enabled).toBe(false);stepWorld(w,10);expect(w.structures).toContain(bed);expect(job.progress).toBe(0);
 expect(applyCommand(w,{type:'area',action:'cancel',from:{x:14,z:16},to:{x:14,z:17}}).ok).toBe(true);expect(w.jobs).toHaveLength(0);expect(w.structures).toContain(bed);
 expect(applyCommand(w,{type:'install',structureId:bed.id,x:14,z:16,orientation:1}).ok).toBe(true);
 const invalid=JSON.parse(serializeWorld(w));invalid.jobs[0].construction='frame';expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow();
 user.rest=100;user.schedule.fill('anything');until(w,()=>!w.jobs.length);expect(bed.orientation).toBe(1);expect(w.structures).toContain(bed);expect(user.bedId).toBe(bed.id);
});
