import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health';
import {treeTransferScene} from './scenarios/tree-transfer-v349';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {addMaterial,refreshStock} from '../src/sim/materials';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {mapObjectActions} from '../src/ui/map-object-actions';
import {cancelIntentJobs} from '../src/sim/designation-cancel';
import type {Command,World} from '../src/sim/types';

function valid(w:World){expect(validateWorld(w)).toEqual([]);}
function accept(w:World,c:Command){expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});valid(w);}
function until(w:World,done:()=>boolean,max=500){for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,pawns:w.pawns,piles:w.piles,jobs:w.jobs})).toBe(true);valid(w);}
function chunks(){const w=medicalCamp(2);Object.assign(w.pawns[0]!,{x:8,z:10});Object.assign(w.pawns[1]!,{x:6,z:18});w.pawns[0]!.priorities.haul=1;addMaterial(w,'chunk',1,{type:'ground',x:12,z:10},'granite-chunk');w.stockpiles.push({id:w.nextId++,x:20,z:14,filters:{wood:false,food:false,chunk:true},priority:3,capacity:75});refreshStock(w);valid(w);return w;}
const request=(w:World)=>accept(w,{type:'area',action:'haul-chunks',from:{x:12,z:10},to:{x:12,z:10}});

test('V349 inspector offers exact cancellation of a transport permission without creating a haul Job',()=>{
  const w=chunks(),pile=w.piles[0]!;request(w);expect(pile.haulRequested).toBe(true);expect(w.jobs).toEqual([]);const actions=mapObjectActions(w,{kind:'pile',id:pile.id});expect(actions.some(a=>a.id==='cancel')).toBe(true);expect(actions.find(a=>a.id==='cancel')?.command).toEqual({type:'cancel-pile',pileId:pile.id});
  accept(w,{type:'cancel-pile',pileId:pile.id});expect(Object.hasOwn(pile,'haulRequested')).toBe(false);expect(w.piles).toEqual([pile]);expect(pile.quantity).toBe(1);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('V349 an empty automatic pickup is released when its source Haul permission is cancelled',()=>{
  const w=chunks(),p=w.pawns[0]!,pile=w.piles[0]!;request(w);until(w,()=>p.haul?.phase==='pickup');expect(p.orders.active).toBeNull();expect(p.haul!.sourcePileId).toBe(pile.id);const quantity=pile.quantity,rng=w.rng;
  accept(w,{type:'cancel-pile',pileId:pile.id});expect(p.haul).toBeNull();expect(pile.owner).toEqual({type:'ground',x:12,z:10});expect(pile.quantity).toBe(quantity);expect(w.rng).toBe(rng);expect(Object.hasOwn(pile,'haulRequested')).toBe(false);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('V349 a directly ordered pickup survives cancellation of the independent permission flag',()=>{
  const w=chunks(),p=w.pawns[0]!,pile=w.piles[0]!;request(w);accept(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:pile.id},queue:false});expect(p.orders.active).toBe('haul');const task=structuredClone(p.haul),quantity=pile.quantity,rng=w.rng;
  accept(w,{type:'cancel-pile',pileId:pile.id});expect(p.orders.active).toBe('haul');expect(p.haul).toEqual(task);expect(pile.quantity).toBe(quantity);expect(pile.owner.type).toBe('ground');expect(w.rng).toBe(rng);expect(Object.hasOwn(pile,'haulRequested')).toBe(false);
  until(w,()=>w.piles.some(v=>v.item==='granite-chunk'&&v.owner.type==='ground'&&v.owner.x===20&&v.owner.z===14));expect(w.piles.filter(v=>v.item==='granite-chunk').reduce((n,v)=>n+v.quantity,0)).toBe(1);
});

test('V349 area cancellation clears a flag-only cell that has no Job and remains exact after reload',()=>{
  const w=chunks(),pile=w.piles[0]!;request(w);accept(w,{type:'area',action:'cancel',from:{x:12,z:10},to:{x:12,z:10}});expect(Object.hasOwn(pile,'haulRequested')).toBe(false);expect(w.jobs).toEqual([]);expect(w.piles).toEqual([pile]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('V349 a rectangle cancels every co-located plant / ghost intent and transport flag, preserving physical originals',()=>{
  const w=treeTransferScene('oak',.1),source=w.resources[0]!;addMaterial(w,'chunk',1,{type:'ground',x:13,z:10},'granite-chunk');refreshStock(w);accept(w,{type:'designate',kind:'wall',material:'wood',x:12,z:10});accept(w,{type:'extract-tree',resourceId:source.id});accept(w,{type:'area',action:'haul-chunks',from:{x:13,z:10},to:{x:13,z:10}});
  expect(w.jobs).toHaveLength(2);expect(w.piles[0]!.haulRequested).toBe(true);const rng=w.rng;
  accept(w,{type:'area',action:'cancel',from:{x:12,z:10},to:{x:13,z:10}});expect(w.jobs).toEqual([]);expect(w.resources[0]).toBe(source);expect(w.piles[0]!.quantity).toBe(1);expect(Object.hasOwn(w.piles[0]!,'haulRequested')).toBe(false);expect(w.rng).toBe(rng);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test.each(['chop','extract-tree'] as const)('V349 targeted cancellation handles an explicit legacy TreeBase %s without species conversion',kind=>{
  const w=treeTransferScene(null),source=w.resources[0]!;if(kind==='chop')accept(w,{type:'designate',kind:'chop',x:source.x,z:source.z});else accept(w,{type:'extract-tree',resourceId:source.id});const rng=w.rng;
  accept(w,{type:'cancel-resource',resourceId:source.id});expect(w.jobs).toEqual([]);expect(w.resources[0]).toBe(source);expect(Object.hasOwn(source,'species')).toBe(false);expect(w.piles).toEqual([]);expect(w.rng).toBe(rng);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('V349 removing a queued exact Job leaves an independent explicit haul and its physical quantities intact',()=>{
  const w=chunks(),p=w.pawns[0]!,pile=w.piles[0]!;p.priorities.gather=1;const tree={id:w.nextId++,kind:'tree' as const,x:15,z:10,amount:12};w.resources.push(tree);valid(w);accept(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:pile.id},queue:false});accept(w,{type:'designate',kind:'chop',x:tree.x,z:tree.z});const job=w.jobs[0]!;accept(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:true});expect(p.orders.queue).toEqual([job.id]);const haul=structuredClone(p.haul),quantity=pile.quantity;
  accept(w,{type:'cancel-job',jobId:job.id});expect(p.orders.queue).toEqual([]);expect(p.orders.active).toBe('haul');expect(p.haul).toEqual(haul);expect(pile.quantity).toBe(quantity);expect(w.resources[0]).toBe(tree);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('V349 cancellation of a paid frame refuses a saturated physical drop before any job, material, queue or RNG change',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;Object.assign(p,{x:8,z:10});p.priorities.build=1;addMaterial(w,'wood',5,{type:'ground',x:7,z:10},'wood');refreshStock(w);valid(w);accept(w,{type:'designate',kind:'wall',material:'wood',x:12,z:10});until(w,()=>w.jobs[0]?.construction==='frame');const job=w.jobs[0]!;
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)addMaterial(w,'wood',75,{type:'ground',x,z},'wood');refreshStock(w);valid(w);const before=serializeWorld(w);
  expect(applyCommand(w,{type:'cancel-job',jobId:job.id}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);expect(w.jobs[0]).toBe(job);expect(w.piles.filter(v=>v.owner.type==='job').reduce((n,v)=>n+v.quantity,0)).toBe(5);
});

test('V349 empty Job set is a no-op for the outer flag-only area transaction',()=>{const w=chunks(),before=serializeWorld(w);expect(cancelIntentJobs(w,new Set())).toEqual({ok:true});expect(serializeWorld(w)).toBe(before);});
