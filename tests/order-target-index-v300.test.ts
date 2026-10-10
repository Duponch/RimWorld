import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/index';
import {queryArea} from '../src/sim/designation';
import {OrderTargetIndex} from '../src/render/order-target-index';
import {designationMinCellPixels,designationVisibilityLabel} from '../src/ui/designation-visibility';
import type {AreaAction,Job,World} from '../src/sim/types';
function fixture(){
  const w=createWorld(300,12,12);w.resources=[];w.jobs=[];w.structures=[];w.piles=[];w.growingZones=[];w.stockpiles=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));return w;
}
function cells(w:World,action:AreaAction){const q=queryArea(w,{type:'area',action,from:{x:0,z:0},to:{x:11,z:11}});if(!q.ok)throw Error(q.reason);return q.cells;}
function job(w:World,kind:Job['kind'],x:number,z:number):Job{return{id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};}
test('preview eligibility identifies compatible co-located resources, not other models sharing their cell',()=>{
  const w=fixture();w.resources=[
    {id:9001,kind:'tree',species:'oak',x:2,z:2,amount:10,growth:1},
    {id:9002,kind:'tree',species:'oak',x:2,z:2,amount:10,growth:.1,growthTick:w.tick},
    {id:9003,kind:'berries',x:2,z:2,amount:10,growth:1,growthTick:w.tick},
    {id:9004,kind:'rock',x:3,z:2,amount:10},
  ];w.tiles[4+2*w.width]={terrain:'rock'};
  const before=JSON.stringify(w),index=new OrderTargetIndex(w);
  expect([...index.select('chop',cells(w,'chop')).resources]).toEqual([9001]);
  expect([...index.select('harvest',cells(w,'harvest')).resources]).toEqual([9003]);
  const mining=index.select('mine',cells(w,'mine'));
  expect([...mining.rocks]).toEqual([28]);expect(mining.resources.size).toBe(0);
  expect(JSON.stringify(w)).toBe(before);
});
test('multi-cell structures and cancel jobs identify their owners once',()=>{
  const w=fixture();w.structures=[{id:9001,kind:'bed',x:2,z:2,orientation:0,footprint:'standard',material:'wood'}];
  const index=new OrderTargetIndex(w);expect([...index.select('deconstruct',[26,38]).structures]).toEqual([9001]);
  w.jobs=[job(w,'deconstruct',2,2),job(w,'wall',4,2)];
  const cancelled=new OrderTargetIndex(w).select('cancel',cells(w,'cancel'));
  expect(cancelled.structures).toEqual(new Set([9001]));expect(cancelled.jobs).toEqual(new Set(w.jobs.map(j=>j.id)));
});
test('zoom preference defaults safely and supports always-visible without numeric ambiguity',()=>{
  for(const value of [null,undefined,'',NaN,'incorrect'])expect(designationMinCellPixels(value)).toBe(32);
  expect(designationMinCellPixels('0')).toBe(0);expect(designationVisibilityLabel(0)).toBe('Toujours visibles');
  expect(designationMinCellPixels(-1)).toBe(0);expect(designationMinCellPixels(1000)).toBe(96);expect(designationMinCellPixels(23.6)).toBe(24);
});
test('cancel on a furniture source reaches its distant job and preserves exact owner identity',()=>{
  const w=fixture();w.structures=[{id:9001,kind:'bed',x:2,z:2,orientation:0,footprint:'standard',material:'wood'}];
  const installation=job(w,'install',7,7);installation.furniture={structureId:9001,kind:'bed'};w.jobs=[installation];
  const selected=new OrderTargetIndex(w).select('cancel',[26]);
  expect(selected.jobs).toEqual(new Set([installation.id]));expect(selected.structures).toEqual(new Set([9001]));
  const teardown=job(w,'deconstruct',2,2);teardown.deconstruction={structureId:9001,kind:'bed',material:'wood'};
  w.jobs=[teardown];w.structures.push({...w.structures[0]!,id:9002});
  expect(new OrderTargetIndex(w).select('cancel',[26]).structures).toEqual(new Set([9001]));
  expect(new OrderTargetIndex(w).select('deconstruct',[26]).structures).toEqual(new Set([9001,9002]));
});
