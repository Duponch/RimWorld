import { expect,test } from 'vitest';
import { advanceCoolers,coolerFaceBlocked,coolerFaces } from '../src/sim/cooler.ts';
import { createWorld } from '../src/sim/index.ts';
import type { ThermalLayout } from '../src/sim/thermal-topology.ts';
import type { Job,Orientation,Structure,StructureKind,World } from '../src/sim/types.ts';
import { legacyAdvanceCoolers } from '../scripts/benchmark-cooler-v158.ts';

function scene():{world:World;layout:ThermalLayout;coolers:Structure[]} {
  const world=createWorld(42,20,20);
  const add=(kind:StructureKind,x:number,z:number,orientation:Orientation=0):Structure=>{
    const s:Structure={id:world.nextId++,kind,x,z,orientation,footprint:'standard'};
    world.structures.push(s);return s;
  };
  const cooler=(x:number,z:number,orientation:Orientation):Structure=>{
    const s=add('cooler',x,z,orientation);
    s.power={on:true,parentId:null};s.cooler={target:0,high:false};return s;
  };
  const coolers=[cooler(2,2,0),cooler(5,2,1),cooler(10,11,2),cooler(14,8,3),cooler(6,16,0),cooler(0,8,1),cooler(17,16,0),cooler(10,3,2)];
  add('wall',6,2);                    // Solid cold face.
  add('solar-generator',9,11);        // Non-solid 4x4 footprint covers a hot face away from its anchor.
  add('bed',13,8);                    // A non-solid footprint is allowed on a face.
  add('wall',10,4);                   // Solid hot face.
  world.tiles[17*world.width+6]={terrain:'rock'};
  world.jobs.push({id:world.nextId++,kind:'wall',x:17,z:17,orientation:0,footprint:'standard'} as Job);
  const cells=Array.from({length:world.width*world.height},(_,i)=>i);
  world.thermal={regions:[{cells,temperature:30}]};
  const layout:ThermalLayout={rooms:[],doors:[],indices:new Int32Array(cells.length)};
  return {world,layout,coolers};
}

const compareStep=(world:World,layout:ThermalLayout)=>{
  const before=structuredClone(world),after=structuredClone(world);
  legacyAdvanceCoolers(before,layout,20);advanceCoolers(after,layout,20);
  expect(after).toEqual(before);
  return after;
};

test('step-local cooler faces equal the V157 scalar decision on solid footprints, plans, rock and borders',()=>{
  const {world,layout,coolers}=scene();
  expect(coolerFaceBlocked(world,coolerFaces(coolers[2]!).hot)).toBe(false);
  expect(coolerFaceBlocked(world,coolerFaces(coolers[7]!).hot)).toBe(true);
  expect(coolerFaceBlocked(world,coolerFaces(coolers[3]!).cold)).toBe(false);
  const planned=coolerFaces(coolers[6]!).cold;
  expect(coolerFaceBlocked(world,planned,true)).toBe(true);
  expect(coolerFaceBlocked(world,planned)).toBe(false);
  expect(coolerFaceBlocked(world,coolerFaces(coolers[5]!).hot)).toBe(true);
  const result=compareStep(world,layout);
  expect(result.structures.filter(s=>s.kind==='cooler').map(s=>s.cooler!.high))
    .toEqual([true,false,true,true,false,false,true,false]);
});

test('the face capture is discarded after each call and sees in-place topology changes',()=>{
  const {world,layout,coolers}=scene(),first=coolers[0]!;
  expect(compareStep(world,layout).structures.find(s=>s.id===first.id)!.cooler!.high).toBe(true);
  const face=coolerFaces(first).cold;
  const wall:Structure={id:world.nextId++,kind:'wall',x:face.x,z:face.z,orientation:0,footprint:'standard'};
  world.structures.push(wall);
  expect(compareStep(world,layout).structures.find(s=>s.id===first.id)!.cooler!.high).toBe(false);
  world.structures.pop();
  world.tiles[face.z*world.width+face.x]={terrain:'rock'};
  expect(compareStep(world,layout).structures.find(s=>s.id===first.id)!.cooler!.high).toBe(false);
  world.tiles[face.z*world.width+face.x]={terrain:'grass'};
  expect(compareStep(world,layout).structures.find(s=>s.id===first.id)!.cooler!.high).toBe(true);
});
