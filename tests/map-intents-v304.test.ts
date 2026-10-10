import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/engine';
import {PresentationQueue} from '../src/render/PresentationQueue';
import type {World} from '../src/sim/types';

function started(){const queue=new PresentationQueue(),world=createWorld(304,8,8);queue.push(world);expect(queue.take(world.tick,0)).toBe(world);return{queue,world};}
test('confirmed zone, job, home, roof and hauling edits draw before the periodic scene deadline',()=>{
  const edits:((w:World)=>void)[]=[
    w=>{w.growingZones=[{id:909,plant:'rice',cells:[18,19],allowSow:true,allowCut:true}];},
    w=>{w.stockpiles=[{id:910,zoneId:910,x:2,z:2,capacity:75,priority:2,filters:{wood:true,food:true}}];},
    w=>{w.jobs=[{id:911,kind:'chop',x:2,z:2,orientation:0,footprint:'standard',progress:0,status:'pending',reservedBy:null,escrow:{...w.stock}}];},
    w=>{w.home=[18,19];},
    w=>{w.roofing={constructed:[],build:[18],remove:[],cursor:0};},
    w=>{w.piles=[{id:912,item:'granite-chunk',kind:'chunk',quantity:1,owner:{type:'ground',x:2,z:2},haulRequested:true}];},
  ];
  for(const edit of edits){const {queue,world}=started(),next=structuredClone(world);edit(next);queue.push(next);expect(queue.take(next.tick,10)).toBe(next);}
});
test('edits wait for the confirmed actor tick; continuous cloned snapshots retain the original cadence',()=>{
  const {queue,world}=started(),same=structuredClone(world);same.tick++;queue.push(same);
  expect(queue.take(same.tick,10)).toBeUndefined();expect(queue.take(same.tick,199)).toBeUndefined();expect(queue.take(same.tick,200)).toBe(same);
  const edited=structuredClone(same);edited.tick++;edited.growingZones=[];edited.home=[18];queue.push(edited);
  expect(queue.take(same.tick,201)).toBeUndefined();expect(queue.take(edited.tick,202)).toBe(edited);
  const removed=structuredClone(edited);removed.home=[];queue.push(removed);expect(queue.take(removed.tick,203)).toBe(removed);
});
test('continuous job work does not create a per-tick scene update',()=>{
  const {queue,world}=started(),job={id:909,kind:'chop' as const,x:2,z:2,orientation:0 as const,footprint:'standard' as const,progress:0,status:'pending' as const,reservedBy:null,escrow:{...world.stock}};
  const next={...world,jobs:[job]};queue.push(next);expect(queue.take(next.tick,1)).toBe(next);
  const progress={...next,tick:next.tick+1,jobs:[{...job,progress:1}]};queue.push(progress);
  expect(queue.take(progress.tick,2)).toBeUndefined();expect(queue.take(progress.tick,201)).toBe(progress);
});
