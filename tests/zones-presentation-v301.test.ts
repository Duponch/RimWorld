import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {GroundSurfaceTint} from '../src/render/GroundSurfaceTint';
import {GpuGroundGrassLayer} from '../src/render/GpuGroundGrassLayer';
import {EnvironmentLighting} from '../src/render/EnvironmentLighting';
import {StoragePresentationSignature} from '../src/render/presentation-signatures';
import {storageZonePlacements,storageZoneSignature} from '../src/render/storage-zone-presentation';
import {areaPreviewColor,zoneBoundaryEdges,zoneBoundaryVertices} from '../src/render/zone-surface-presentation';
import {FLOOR_SURFACE_Y,type FilthSurface} from '../src/render/surface-height';
import type {StockpileCell} from '../src/sim/types';

test('zone compatibility uses valid, partial and refused colours; order previews retain blue',()=>{
  for(const action of ['stockpile','growing','remove-stockpile','remove-growing','home','remove-home','remove-roof','ignore-roof'] as const){
    expect(areaPreviewColor(action,1,0)).toBe(0x9dd9ca);
    expect(areaPreviewColor(action,1,1)).toBe(0xe4bb68);
    expect(areaPreviewColor(action,0,1)).toBe(0xe46f58);
  }
  for(const action of ['chop','mine','deconstruct','haul-chunks','cancel'] as const)
    expect(areaPreviewColor(action,0,1)).toBe(0x8bcef0);
});

test('selected contours retain concavities, holes and row boundaries',()=>{
  const l=zoneBoundaryEdges(8,[9,10,17]);
  expect(l.get(9)).toBe(1|4);expect(l.get(10)).toBe(2|4|8);expect(l.get(17)).toBe(1|2|8);
  expect(zoneBoundaryVertices(8,[9,10,17])).toHaveLength(8*18);
  const ring=[9,10,11,17,19,25,26,27],edges=zoneBoundaryEdges(8,ring);
  expect(edges.get(10)!&8).toBe(8);expect(edges.get(17)!&2).toBe(2);
  expect(edges.get(19)!&1).toBe(1);expect(edges.get(26)!&4).toBe(4);
  const wrapped=zoneBoundaryEdges(4,[7,8]);
  expect(wrapped.get(7)).toBe(15);expect(wrapped.get(8)).toBe(15);
  expect(zoneBoundaryVertices(8,[])).toEqual([]);
});

test('stockpile identity invalidates presentation independently of policy and overlays stand above floors',()=>{
  const cell:StockpileCell={id:5,zoneId:5,x:1,z:1,filters:{wood:true,food:false},capacity:75,priority:1};
  const reader=new StoragePresentationSignature(),initial=reader.read([cell]);
  cell.zoneId=8;expect(reader.read([cell])).not.toBe(initial);expect(reader.read([cell])).toBe(storageZoneSignature([cell]));
  const colour=storageZonePlacements(4,[cell]).cells[0]!.color;
  cell.filters.wood=false;expect(storageZonePlacements(4,[cell]).cells[0]!.color).toBe(colour);
  const world:FilthSurface={width:4,height:4,tiles:Array.from({length:16},()=>({terrain:'soil'}))};
  world.tiles[5]!.floor='wood-planks';
  expect(storageZonePlacements(4,[cell],world).cells[0]!.y).toBeCloseTo(FLOOR_SURFACE_Y+.021);
  delete cell.zoneId;expect(reader.read([cell])).toBe(storageZoneSignature([cell]));
});

test('hover changes only uniforms; eligible masks are rectangle-sized and stationary zones do not upload',()=>{
  const tint=new GroundSurfaceTint(),layers=[{placements:[{x:2,z:1,y:.02,color:0xff0000}],opacity:.2}];
  try{
    tint.setZones(250,250,layers,true);
    const before=[tint.zones.version,tint.edges.version,tint.eligible.version],data=tint.zones.image.data;
    tint.setZones(250,250,[{placements:[{...layers[0]!.placements[0]!,y:.08}],opacity:.2}],true);
    expect(tint.zones.image.data).toBe(data);expect(tint.zones.version).toBe(before[0]);
    for(let i=0;i<30;i++)tint.setHover(i,2,1,1,0xe46f58,.55);
    tint.clearPreview();expect([tint.zones.version,tint.edges.version,tint.eligible.version]).toEqual(before);
    tint.setArea(250,{minX:2,maxX:4,minZ:1,maxZ:2},[252,504],0xe4bb68);
    expect(tint.eligible.image.width).toBe(3);expect(tint.eligible.image.height).toBe(2);
    expect(Array.from(tint.eligible.image.data!).filter(v=>v===255)).toHaveLength(2);
    expect(tint.eligible.image.data![3]).toBe(255);expect(tint.eligible.image.data![23]).toBe(255);
    const version=tint.eligible.version;tint.clearPreview();expect(tint.eligible.version).toBe(version);
    tint.setSelection(250,250,[252,253],true);const selected=tint.edges.version;
    tint.setSelection(250,250,[252,253],true);expect(tint.edges.version).toBe(selected);
    expect(Array.from(tint.edges.image.data!.slice(252*4,252*4+4))).toEqual([255,0,255,255]);
    tint.setSelection(250,250,[252,253],false);expect(tint.edges.image.data!.every(v=>v===0)).toBe(true);
  }finally{tint.dispose();}
});

test('grass uses the composed lit output and stable tint textures across resize without owning them',()=>{
  const tint=new GroundSurfaceTint(),environment=new EnvironmentLighting();
  const grass=new GpuGroundGrassLayer(environment.configure,Infinity,()=>{},tint);
  let disposals=0;tint.zones.addEventListener('dispose',()=>disposals++);
  try{
    expect(grass.mesh.material.outputNode).toBeTruthy();
    const texture=tint.zones;
    tint.setZones(4,4,[{placements:[{x:0,z:0,y:0,color:0xff0000}],opacity:.2}],true);
    expect(tint.zones).toBe(texture);expect(tint.zones.image.data![0]).toBeCloseTo(.2);
    expect(tint.zones.image.data![3]).toBeCloseTo(.2);
    tint.setZones(8,4,[],false);expect(tint.zones).toBe(texture);expect(tint.zones.image.width).toBe(8);
    expect(tint.zones.minFilter).toBe(THREE.NearestFilter);
    const before=disposals;grass.dispose();expect(disposals).toBe(before);
  }finally{tint.dispose();environment.dispose();}
});
