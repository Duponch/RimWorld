import { prepareConstructionFlora } from './scenarios/construction-flora-v348';
import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health';
import {fixtureBuilding} from './scenarios/deconstruction';
import {applyCommand,canDesignate,buildConstructionCellIndex,stepWorld} from '../src/sim/engine';
import {addMaterial,refreshStock,reservedSource} from '../src/sim/materials';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {constructionRecipe} from '../src/sim/construction-materials';
import {AUTODOORS_RESEARCH_COST} from '../src/sim/research';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import type {Command,DesignateCommand,World} from '../src/sim/types';

function camp(){const w=medicalCamp();w.tick=2000;Object.assign(w.pawns[0]!,{x:8,z:10});w.pawns[0]!.priorities.build=1;addMaterial(w,'wood',30,{type:'ground',x:7,z:10},'wood');refreshStock(w);valid(w);return w;}
function valid(w:World){expect(validateWorld(w)).toEqual([]);}
function accept(w:World,c:Command){const result=applyCommand(w,c);expect(result.ok,JSON.stringify({command:c,result})).toBe(true);valid(w);}
function until(w:World,done:()=>boolean,max=1100){for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({jobs:w.jobs,pawns:w.pawns})).toBe(true);valid(w);}
const wall:DesignateCommand={type:'designate',kind:'wall',material:'wood',x:12,z:10};
const door:DesignateCommand={type:'designate',kind:'door',material:'wood',x:12,z:10};
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
function replay(w:World,ticks=3){const copy=deserializeWorld(serializeWorld(w));stepWorld(w,ticks);stepWorld(copy,ticks);expect(copy).toEqual(w);valid(w);}

test.each(['door','autodoor'] as const)('V348 %s replaces one unpaid wall ghost and only appears after its actual paid construction',kind=>{
  const w=camp();if(kind==='autodoor'){w.research??={project:null,points:0};w.research.autodoors={points:AUTODOORS_RESEARCH_COST,completedAt:w.tick};addMaterial(w,'steel',40,{type:'ground',x:7,z:9},'steel');addMaterial(w,'component',2,{type:'ground',x:7,z:8},'component');refreshStock(w);valid(w);}
  accept(w,wall);const old=w.jobs[0]!,nextId=w.nextId,rng=w.rng,piles=structuredClone(w.piles),command={...door,kind};
  expect(canDesignate(w,command)).toEqual(canDesignate(w,command,false,buildConstructionCellIndex(w,'wall')));expect(canDesignate(w,command).ok).toBe(true);accept(w,command);
  expect(w.jobs).toHaveLength(1);expect(w.jobs[0]).toMatchObject({id:nextId,kind,construction:'blueprint',progress:0,escrow:{wood:0,food:0}});expect(w.jobs.some(j=>j.id===old.id)).toBe(false);
  expect(w.nextId).toBe(nextId+1);expect(w.structures).toEqual([]);expect(w.piles).toEqual(piles);expect(w.rng).toBe(rng);const cost=constructionRecipe(w.jobs[0]!).ingredients;
  replay(w,1);until(w,()=>w.jobs[0]?.construction==='frame'&&cost.every(c=>w.piles.filter(p=>p.owner.type==='job'&&p.item===c.item).reduce((n,p)=>n+p.quantity,0)===c.quantity));expect(cost.every(c=>w.piles.filter(p=>p.owner.type==='job'&&p.item===c.item).reduce((n,p)=>n+p.quantity,0)===c.quantity)).toBe(true);
  until(w,()=>w.structures.some(s=>s.kind===kind));expect(w.jobs).toEqual([]);expect(wood(w)).toBe(5);expect(w.piles.some(p=>p.owner.type==='job')).toBe(false);replay(w,2);
});

test('V348 replacing a wall removes its genuine queued clearance but preserves the actors different active cut',()=>{
  const w=camp(),p=w.pawns[0]!;p.priorities.gather=1;w.resources.push({id:w.nextId++,kind:'tree',species:'oak',x:12,z:10,amount:46,growth:.1,growthTick:w.tick},
    {id:w.nextId++,kind:'wild-plant',species:'brambles',x:8,z:9,amount:0,growth:.5,growthTick:w.tick});prepareConstructionFlora(w);valid(w);accept(w,wall);const old=w.jobs[0]!;
  accept(w,{type:'designate',kind:'cut',x:8,z:9});const cut=w.jobs.find(j=>j.kind==='cut')!;accept(w,{type:'order-job',pawnId:p.id,jobId:cut.id,queue:false});
  accept(w,{type:'order-job',pawnId:p.id,jobId:old.id,queue:true});expect(p.orders.queue).toContain(old.id);expect(old.clearance?.resourceId).toBe(w.resources[0]!.id);const active=structuredClone({jobId:p.jobId,path:p.path,orders:p.orders.active});
  accept(w,door);expect(p.orders.queue).not.toContain(old.id);expect({jobId:p.jobId,path:p.path,orders:p.orders.active}).toEqual(active);expect(w.resources).toHaveLength(2);expect(wood(w)).toBe(30);replay(w,1);
});

test('V348 replacing a ghost releases the actual material pickup reservation without refunding nonexistent paid work',()=>{
  const w=camp(),p=w.pawns[0]!,source=w.piles[0]!;accept(w,wall);const old=w.jobs[0]!;
  accept(w,{type:'order-haul',pawnId:p.id,target:{type:'job',jobId:old.id},queue:false});expect(p.haul).toMatchObject({phase:'pickup',destination:{type:'job',jobId:old.id}});expect(reservedSource(w,source.id)).toBeGreaterThan(0);
  accept(w,door);expect(p.haul).toBeNull();expect(p.jobId).toBeNull();expect(p.orders.active).toBeNull();expect(p.priorityWork).toBeUndefined();expect(reservedSource(w,source.id)).toBe(0);
  expect(w.piles.find(v=>v.id===source.id)).toMatchObject({quantity:30,owner:{type:'ground',x:7,z:10}});expect(w.deconstructed.count).toBe(0);replay(w,0);
});

test('V348 a captured supply cargo prevents ghost replacement without dropping at its future cell; the supplied frame remains protected',()=>{
  const w=camp(),p=w.pawns[0]!;accept(w,wall);const old=w.jobs[0]!;until(w,()=>p.haul?.phase==='deliver'&&!!p.motion&&p.motion.end>w.tick);expect(old.construction).toBe('blueprint');
  const cargo=w.piles.find(v=>v.owner.type==='pawn'&&v.owner.pawnId===p.id)!,before=serializeWorld(w);expect(applyCommand(w,door).ok).toBe(false);expect(serializeWorld(w)).toBe(before);expect(cargo.owner).toEqual({type:'pawn',pawnId:p.id});replay(w,0);
  until(w,()=>old.construction==='frame');const paid=serializeWorld(w);expect(applyCommand(w,door).ok).toBe(false);expect(serializeWorld(w)).toBe(paid);expect(w.piles.filter(v=>v.owner.type==='job').reduce((n,v)=>n+v.quantity,0)).toBe(5);
});

test('V348 paid frames, finished walls and unrelated furniture plans refuse door replacement atomically',()=>{
  const frame=camp();accept(frame,wall);until(frame,()=>frame.jobs[0]?.construction==='frame');
  const built=camp(),building=fixtureBuilding(built,'wall',12,10);built.structures.find(s=>s.id===building.id)!.material='wood';valid(built);
  const other=camp();accept(other,{type:'designate',kind:'bed',material:'wood',x:12,z:10});
  for(const w of [frame,built,other]){const before=serializeWorld(w);expect(canDesignate(w,door).ok).toBe(false);expect(applyCommand(w,door).ok).toBe(false);expect(serializeWorld(w)).toBe(before);valid(w);}
});

test.each([true,false])('V348 replacement snapshot checkpoint=%s removes the old foreign key and rejects a malformed protocol revision atomically',checkpoint=>{
  const w=camp();accept(w,wall);const oldId=w.jobs[0]!.id,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,0,true)));
  expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Invalid prepared ghost snapshot');const previous=structuredClone(first.world);accept(w,door);
  const good=structuredClone(encoder.encode(w,0,0,checkpoint)),bad=structuredClone(good);bad.revision=0;
  expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(previous);const retry=decoder.adopt(good);expect(retry.status).toBe('applied');if(retry.status==='applied')expect(retry.world).toEqual(w);replay(w,0);
});
test('V348 RAW reload rejects a forged retained queue to the retired wall',()=>{
  const w=camp();accept(w,wall);const oldId=w.jobs[0]!.id;accept(w,door);
  w.pawns[0]!.orders.queue.push(oldId);
  expect(validateWorld(w)).toContain('Queued order reservation mismatch.');
  expect(()=>deserializeWorld(serializeWorld(w))).toThrow();
});
