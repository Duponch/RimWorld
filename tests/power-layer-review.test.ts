import { expect,test } from 'vitest';
import { miningCamp } from './scenarios/mining';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { addGroundMaterial } from '../src/sim/materials';
import { blockedCells,canStep } from '../src/sim/pathfinding';
import { canStandAt,captureStandability,furnitureDelay,navigationCosts } from '../src/sim/furniture-travel';
import { groundCapacity,nearbyGround } from '../src/sim/ground-placement';
import { captureWorldShotGrid } from '../src/sim/combat-world';
import { RoomTopologyCache } from '../src/sim/room-topology';
import { pileSurfaces } from '../src/render/pile-surfaces';
import { newPowerState } from '../src/sim/power-rules';
import { newDoorState } from '../src/sim/door-rules';
import { FRAME_SEARCH_COST,FRAME_TRAVEL_DELAY } from '../src/sim/construction-costs';
import type { Structure,StructureKind,World } from '../src/sim/types';

function fixture(count=0):World {const w=miningCamp(count);w.structures=[];w.jobs=[];w.stockpiles=[];w.growingZones=[];delete w.arrivals;delete w.raids;delete w.heatwaves;return w;}
function part(w:World,kind:StructureKind,x:number,z:number):Structure {
  const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:kind==='power-conduit'?'steel':'wood',...(kind==='table'?{quality:'normal' as const}:{}),...kind==='power-conduit'?{power:newPowerState(kind)}:{},...kind==='door'?{door:newDoorState(w.tick)}:{}};w.structures.push(s);return s;
}

test('conduits never hide solid walls, corners, rejected floor placement or shot blockers regardless of insertion order',()=>{
  const w=fixture();for(let z=0;z<w.height;z++)part(w,'wall',16,z);const wire=part(w,'power-conduit',16,10);
  const room=new RoomTopologyCache(),capture=room.read(w),cell={x:16,z:10},index=cell.z*w.width+cell.x;
  const initial=serializeWorld(w);
  for(let order=0;order<2;order++){
    const blocked=blockedCells(w),shots=captureWorldShotGrid(w);
    expect(blocked[index]).toBe(1);expect(canStandAt(w,cell)).toBe(false);expect(captureStandability(w)(cell)).toBe(false);
    expect(canStep(w,{x:15,z:10},cell,blocked,new Set())).toBe(false);
    expect(canStep(w,{x:15,z:9},{x:16,z:10},blocked,new Set())).toBe(false);
    expect(groundCapacity(w,cell,'wood')).toBe(0);expect(nearbyGround(w,{x:15,z:10},4).every(c=>c.x<16)).toBe(true);
    expect(shots.blocksSight(16,10)).toBe(true);expect(shots.coverAt(16,10)).toMatchObject({full:true,fill:1});
    expect(room.read(w)).toBe(capture);expect(capture.at(16,10)?.kind).toBe('solid');
    expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
    w.structures.reverse();
  }
  expect(serializeWorld(w)).toBe(initial);expect(wire.power!.on).toBe(false);
  const doorWorld=fixture(),door=part(doorWorld,'door',8,8);part(doorWorld,'power-conduit',8,8);
  for(let order=0;order<2;order++){
    expect(captureWorldShotGrid(doorWorld).blocksSight(8,8)).toBe(true);
    door.door!.open=true;door.door!.from=1;
    const shot=captureWorldShotGrid(doorWorld);expect(shot.blocksSight(8,8)).toBe(false);expect(shot.coverAt(8,8)).toMatchObject({key:`structure:${door.id}`,openDoor:true,fill:1});
    door.door!.open=false;door.door!.from=0;doorWorld.structures.reverse();
  }
});

test('conduits preserve compatible pile surfaces and crop ownership, while a real building still forbids crops in either insertion order',()=>{
  const w=fixture(),table=part(w,'table',8,8);part(w,'power-conduit',8,8);addGroundMaterial(w,'wood',3,{x:8,z:8},'wood');
  const surface=pileSurfaces(w).get(8*w.width+8);expect(surface).toBeDefined();
  for(let order=0;order<2;order++){
    const before=serializeWorld(w);expect(groundCapacity(w,{x:8,z:8},'wood')).toBe(72);expect(furnitureDelay(w,{x:7,z:8},{x:8,z:8})).toBe(4.2);
    expect(pileSurfaces(w).get(8*w.width+8)).toEqual(surface);expect(serializeWorld(w)).toBe(before);expect(validateWorld(w)).toEqual([]);w.structures.reverse();
  }
  expect(table.kind).toBe('table');
  const field=fixture();part(field,'power-conduit',8,8);
  expect(applyCommand(field,{type:'area',action:'growing',from:{x:8,z:8},to:{x:8,z:8}}).ok).toBe(true);
  field.resources=[{id:field.nextId++,kind:'rice',x:8,z:8,amount:6,growth:.4,growthTick:field.tick}];
  expect(validateWorld(field)).toEqual([]);const peer=deserializeWorld(serializeWorld(field));stepWorld(field,20);stepWorld(peer,20);expect(peer).toEqual(field);expect(field.resources[0]!.kind).toBe('rice');
  part(field,'wall',8,8);for(let order=0;order<2;order++){expect(()=>deserializeWorld(serializeWorld(field))).toThrow();field.structures.reverse();}
});

test('a completed conduit cannot erase the physical slowdown of a building frame sharing its cell',()=>{
  const w=fixture(1),p=w.pawns[0]!;p.x=6;p.z=8;p.schedule.fill('work');p.priorities.build=1;p.priorities.haul=1;p.priorities.craft=0;
  part(w,'power-conduit',8,8);addGroundMaterial(w,'wood',5,{x:6,z:7},'wood');
  expect(applyCommand(w,{type:'designate',kind:'wall',material:'wood',x:8,z:8}).ok).toBe(true);
  for(let i=0;i<300&&!w.jobs.some(j=>j.kind==='wall'&&j.construction==='frame');i++)stepWorld(w);
  expect(w.jobs.some(j=>j.kind==='wall'&&j.construction==='frame')).toBe(true);expect(validateWorld(w)).toEqual([]);
  const cell={x:8,z:8},index=8*w.width+8,cost=navigationCosts(w);
  expect(cost.costs?.get(index)).toBe(FRAME_SEARCH_COST);expect(canStandAt(w,cell)).toBe(false);
  expect(furnitureDelay(w,{x:7,z:8},cell)).toBe(FRAME_TRAVEL_DELAY);
});


test('fractional conduit work finishes at the real threshold and can save every preceding tick',()=>{
  const w=fixture(1),p=w.pawns[0]!;p.x=7;p.z=8;p.schedule.fill('work');p.skills.construction.level=0;
  for(const key of Object.keys(p.priorities) as Array<keyof typeof p.priorities>)p.priorities[key]=0;
  p.priorities.build=1;addGroundMaterial(w,'steel',1,{x:7,z:7},'steel');
  expect(applyCommand(w,{type:'designate',kind:'power-conduit',material:'steel',x:8,z:8})).toMatchObject({ok:true});
  let saved:World|undefined;
  for(let i=0;i<250&&!w.structures.some(s=>s.kind==='power-conduit');i++){
    stepWorld(w);expect(validateWorld(w)).toEqual([]);
    const job=w.jobs.find(j=>j.kind==='power-conduit');
    if(job?.progress===3&&!saved)saved=deserializeWorld(serializeWorld(w));
  }
  expect(saved).toBeDefined();expect(w.structures.filter(s=>s.kind==='power-conduit')).toHaveLength(1);
  expect(w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(0);
  stepWorld(saved!,w.tick-saved!.tick);expect(serializeWorld(saved!)).toBe(serializeWorld(w));
});
