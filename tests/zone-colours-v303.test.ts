import {expect,test} from 'vitest';
import {adjacentZoneColors} from '../src/render/zone-surface-presentation';
import {storageZonePlacements} from '../src/render/storage-zone-presentation';
import {GrowingZoneLayer} from '../src/render/GrowingZoneLayer';
import {BoxBatches} from '../src/render/BoxBatches';
import {createWorld} from '../src/sim/engine';
import type {StockpileCell} from '../src/sim/types';

const cell=(id:number,zoneId:number,x:number,z:number):StockpileCell=>({id,zoneId,x,z,filters:{wood:true,food:true},capacity:500,priority:2});

test('touching stockpile identities cannot share a cycling-palette colour',()=>{
  const a=cell(1,1,2,2),b=cell(7,7,3,2),c=cell(13,13,4,2),input=[a,b,c];
  const forward=storageZonePlacements(16,input).cells;
  expect(forward[0]!.color).not.toBe(forward[1]!.color);expect(forward[1]!.color).not.toBe(forward[2]!.color);
  const reversed=storageZonePlacements(16,[...input].reverse()).cells.reverse();
  expect(reversed.map(p=>p.color)).toEqual(forward.map(p=>p.color));
  expect(a).toEqual(cell(1,1,2,2));
  b.filters.food=false;b.capacity=75;b.priority=5;
  expect(storageZonePlacements(16,input).cells.map(p=>p.color)).toEqual(forward.map(p=>p.color));
  const expanded=storageZonePlacements(16,[...input,cell(99,1,2,3)]).cells;
  expect(expanded[0]!.color).toBe(forward[0]!.color);expect(expanded[3]!.color).toBe(forward[0]!.color);
});

test('only true cardinal neighbours affect colours; row wrapping and remote zones do not',()=>{
  const palette=[0x110000,0x001100],same=[{zoneId:1,cell:3},{zoneId:3,cell:4}];
  expect([...adjacentZoneColors(4,same,palette).values()]).toEqual([0x110000,0x110000]);
  const vertical=adjacentZoneColors(4,[{zoneId:1,cell:3},{zoneId:3,cell:7}],palette);
  expect(vertical.get(1)).not.toBe(vertical.get(3));
  expect([...adjacentZoneColors(4,[{zoneId:1,cell:3},{zoneId:3,cell:10}],palette).values()]).toEqual([0x110000,0x110000]);
});

test('palette exhaustion from disjoint legacy regions still assigns distinct touching colours',()=>{
  // Disjoint interfaces between each pair build an identity
  // adjacency graph without assuming those old zone identities are contiguous.
  const cells:{zoneId:number;cell:number}[]=[];let row=0;
  for(let a=1;a<=4;a++)for(let b=a+1;b<=4;b++,row++)cells.push({zoneId:a,cell:row*8+1},{zoneId:b,cell:row*8+2});
  const colors=adjacentZoneColors(8,cells,[0xbf4040,0x4040bf]);
  expect(new Set(colors.values()).size).toBe(4);
  expect([...adjacentZoneColors(8,[...cells].reverse(),[0xbf4040,0x4040bf])]).toEqual([...colors]);
});

test('neighbouring fields stay distinct when sowing is disabled and stable updates do not upload',()=>{
  const w=createWorld(303,16,16),boxes=new BoxBatches(),layer=new GrowingZoneLayer(boxes);
  w.growingZones=[{id:1,cells:[34,50],plant:'rice',allowSow:false,allowCut:true},{id:6,cells:[35,51],plant:'rice',allowSow:false,allowCut:true}];
  const before=structuredClone(w);
  try{
    expect(layer.update(w,true)).toBe(true);const colors=layer.surfaces.map(p=>p.color),mesh=layer.group.children[0]!;
    expect(colors[0]).toBe(colors[1]);expect(colors[2]).toBe(colors[3]);expect(colors[0]).not.toBe(colors[2]);
    expect(layer.update(w,false)).toBe(false);expect(layer.group.children[0]).toBe(mesh);expect(w).toEqual(before);
    w.growingZones[0]!.allowSow=true;expect(layer.update(w,false)).toBe(true);
    expect(layer.surfaces.map(p=>p.color)).toEqual(colors);
  }finally{boxes.dispose();}
});
