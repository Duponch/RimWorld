import { withoutPawnSkills, withMigratedSkills } from './scenarios/legacy-skills';
import { expect, test } from 'vitest';
import { applyCommand, stepWorld, serializeWorld, deserializeWorld, validateWorld, addGroundMaterial } from '../src/sim/index';
import { footprintCells } from '../src/sim/definitions';
import { blockedCells } from '../src/sim/pathfinding';
import { deconstructionDuration, deconstructionAvailable } from '../src/sim/deconstruction-rules';
import { finishDeconstruction } from '../src/sim/deconstruction';
import { queryOrderOptions } from '../src/sim/player-orders';
import { releaseWork } from '../src/sim/work-release';
import { fuelStationReserved } from '../src/sim/fuel';
import { availablePins } from '../src/sim/recreation-space';
import { SnapshotEncoder, SnapshotDecoder } from '../src/bridge/snapshots';
import { woodAccount } from './scenarios/colony-player';
import { deconstructionCamp, fixtureBuilding } from './scenarios/deconstruction';
import type { World } from '../src/sim/types';

function until(w:World,done:()=>boolean,limit=700) {
  for(let i=0;i<limit&&!done();i++){stepWorld(w);expect(validateWorld(w),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns})).toEqual([]);}
  expect(done()).toBe(true);
}
const designate=(w:World,x:number,z:number)=>{expect(applyCommand(w,{type:'designate',kind:'deconstruct',x,z}).ok).toBe(true);return w.jobs.at(-1)!;};

test('construction precedes demolition; forced and queued removals preserve footprints, interruption semantics, refunds and exact replay',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!,wall=fixtureBuilding(w,'wall',14,16),bed=fixtureBuilding(w,'bed',17,16,1);
  const initial=woodAccount(w)+5;addGroundMaterial(w,'wood',5,{x:12,z:16},'wood');
  const a=designate(w,wall.x,wall.z),b=designate(w,18,16);
  expect(footprintCells(b)).toEqual(footprintCells(bed));
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:bed.x,z:bed.z}).ok).toBe(false);
  expect(applyCommand(w,{type:'designate',kind:'wall',x:13,z:14}).ok).toBe(true);
  until(w,()=>w.structures.some(s=>s.x===13&&s.z===14));expect(w.structures).toContain(wall);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:b.id,queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:a.id,queue:true}).ok).toBe(true);
  until(w,()=>b.progress>=3);
  const cancelled=deserializeWorld(serializeWorld(w));
  expect(applyCommand(cancelled,{type:'cancel',x:18,z:16}).ok).toBe(true);expect(cancelled.structures).toHaveLength(3);expect(woodAccount(cancelled)).toBe(initial);expect(validateWorld(cancelled)).toEqual([]);
  expect(releaseWork(w,p)).toBe(true);expect(b.progress).toBe(0);expect(w.structures).toContain(bed);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:b.id,queue:false}).ok).toBe(true);
  until(w,()=>b.progress>=3);
  const saved=serializeWorld(w),copy=deserializeWorld(saved),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  until(w,()=>!w.jobs.some(j=>j.kind==='deconstruct'));
  stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);expect(woodAccount(w)).toBe(initial);
  expect(w.deconstructed.count).toBe(2);expect(w.stock.wood).toBeGreaterThanOrEqual(6);expect(w.stock.wood).toBeLessThanOrEqual(7);
  expect(blockedCells(w)[16*w.width+14]).toBe(0);expect(w.structures).toHaveLength(1);
  const adopted=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);
});

test('odd refunds can round either way; saturated ground and identity limits do not delete buildings, consume RNG or duplicate material',()=>{
  const outcomes=new Set<number>();
  for(const rng of [1,8192]) {
    const w=deconstructionCamp();w.rng=rng;w.pawns[0]!.priorities.gather=2;
    w.resources.push({id:w.nextId++,kind:'tree',x:12,z:16,amount:12});expect(applyCommand(w,{type:'designate',kind:'chop',x:12,z:16}).ok).toBe(true);const wall=fixtureBuilding(w,'wall',14,16),job=designate(w,wall.x,wall.z);
    until(w,()=>!w.jobs.includes(job));outcomes.add(w.stock.wood);expect(woodAccount(w)).toBe(17);expect(w.resources[0]!.amount).toBe(12);
  }
  expect([...outcomes].sort()).toEqual([2,3]);
  const w=deconstructionCamp(),table=fixtureBuilding(w,'table',14,16),job=designate(w,table.x,table.z),p=w.pawns[0]!;
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)addGroundMaterial(w,'food',10,{x,z},'survival-meal');
  const before=serializeWorld(w);expect(finishDeconstruction(w,p,job)).toBe(false);expect(serializeWorld(w)).toBe(before);
  // One empty neighbouring cell suffices; the food on the table is retained.
  w.piles=w.piles.filter(p=>!(p.owner.type==='ground'&&p.owner.x===14&&p.owner.z===15));
  const identity=w.nextId;w.nextId=Number.MAX_SAFE_INTEGER;
  expect(finishDeconstruction(w,p,job)).toBe(false);expect(w.structures).toContain(table);w.nextId=identity;
  until(w,()=>!w.jobs.includes(job));expect(w.stock.wood).toBe(14);expect(w.piles.find(p=>p.owner.type==='ground'&&p.owner.x===14&&p.owner.z===16)?.item).toBe('survival-meal');
  expect(w.piles.filter(p=>p.item==='wood')).toHaveLength(1);expect(w.deconstructed).toEqual({count:1,lostWood:14,fuelTicks:0});
});

test('object reservations coordinate beds, seats, recreation and fuel; removal cleans ownership and table references while preserving held food',()=>{
  const w=deconstructionCamp(2),[builder,user]=w.pawns;
  const bed=fixtureBuilding(w,'bed',14,16),job=designate(w,14,16);user!.bedId=bed.id;user!.need={kind:'sleep',phase:'travel',bedId:bed.id,target:{x:14,z:16}};
  expect(deconstructionAvailable(w,job,builder!.id)).toBe(false);expect(queryOrderOptions(w,builder!.id,bed)[0]!.enabled).toBe(false);
  releaseWork(w,user!);expect(applyCommand(w,{type:'order-job',pawnId:builder!.id,jobId:job.id,queue:false}).ok).toBe(true);
  until(w,()=>!w.jobs.includes(job));expect(user!.bedId).toBeNull();
  const fire=fixtureBuilding(w,'campfire',14,18);fire.fuel!.ticks=8000;fire.fuel!.burned=4000;w.tick=4000;
  const fireJob=designate(w,14,18),initial=woodAccount(w);
  expect(applyCommand(w,{type:'order-job',pawnId:builder!.id,jobId:fireJob.id,queue:false}).ok).toBe(true);expect(fuelStationReserved(w,fire.id,user!.id)).toBe(true);
  const wood=w.stock.wood;until(w,()=>!w.jobs.includes(fireJob));expect(w.stock.wood).toBe(wood);expect(woodAccount(w)).toBe(initial);expect(w.deconstructed.fuelTicks).toBe(12000);
  const pin=fixtureBuilding(w,'horseshoes',19,18),pinJob=designate(w,pin.x,pin.z);
  expect(applyCommand(w,{type:'order-job',pawnId:builder!.id,jobId:pinJob.id,queue:false}).ok).toBe(true);expect(availablePins(w,user!.id)).not.toContain(pin);
  expect(applyCommand(w,{type:'cancel',x:pin.x,z:pin.z}).ok).toBe(true);expect(availablePins(w,user!.id)).toContain(pin);
  const table=fixtureBuilding(w,'table',20,20),stool=fixtureBuilding(w,'stool',19,20),t=designate(w,20,21),s=designate(w,19,20);
  addGroundMaterial(w,'food',1,{x:18,z:20},'survival-meal');const meal=w.piles.find(p=>p.item==='survival-meal')!;meal.owner={type:'pawn',pawnId:user!.id};
  user!.x=19;user!.z=20;user!.need={kind:'eat',phase:'ingest',sourcePileId:meal.id,carryPileId:meal.id,quantity:1,progress:10,dining:{target:{x:19,z:20},seatId:stool.id,tableId:table.id}};
  expect(deconstructionAvailable(w,s,builder!.id)).toBe(false);expect(deconstructionAvailable(w,t,builder!.id)).toBe(true);
  expect(finishDeconstruction(w,builder!,t)).toBe(true);expect(user!.need.dining!.tableId).toBeNull();expect(user!.need.progress).toBe(10);expect(meal.owner).toEqual({type:'pawn',pawnId:user!.id});
});

test('rectangle deduplicates multi-cell furniture, cancellation preserves it, and V23 migration rejects corrupted or disguised removal state',()=>{
  const w=deconstructionCamp();fixtureBuilding(w,'bed',14,16,1);fixtureBuilding(w,'table',16,17,2);
  const old=JSON.parse(serializeWorld(w));(old.schemaVersion=23,withoutPawnSkills(old));for(const a of old.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete old.deconstructed;delete old.packed;
  expect(deserializeWorld(JSON.stringify(old))).toEqual(withMigratedSkills(w));
  expect(applyCommand(w,{type:'area',action:'deconstruct',from:{x:14,z:16},to:{x:16,z:17}}).affected).toBe(2);
  const saved=serializeWorld(w);expect(deserializeWorld(saved)).toEqual(w);expect(deconstructionDuration(w.jobs[0]!)).toBeGreaterThan(1);
  for(const mutate of [(s:any)=>s.jobs[0].deconstruction=null,(s:any)=>s.jobs[0].deconstruction.structureId=999999,(s:any)=>s.jobs[0].deconstruction.kind='table',(s:any)=>s.jobs[0].x++,(s:any)=>s.jobs[0].progress=1,(s:any)=>s.deconstructed.lostWood=-1,(s:any)=>s.schemaVersion=23]) {
    const bad=JSON.parse(saved);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  const corrupt=structuredClone(old);corrupt.pawns[0].hunger=-1;expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow(/version 23/);
  expect(applyCommand(w,{type:'area',action:'cancel',from:{x:15,z:16},to:{x:16,z:16}}).affected).toBe(2);expect(w.jobs).toEqual([]);expect(w.structures).toHaveLength(2);expect(w.deconstructed.count).toBe(0);expect(validateWorld(w)).toEqual([]);
});
