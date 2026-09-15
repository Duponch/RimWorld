import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import { RockLayer } from '../src/render/RockLayer';
import { writeRockCell, ROCK_VERTICES } from '../src/render/RockSurface';
import { sameTerrainSurface } from '../src/render/terrain-state';

test('continuous faceted cells: shared seams, winding, local excavation/restoration, resident buffers and map boundaries',()=>{
  const world=createWorld(42,32,32);world.tiles=world.tiles.map(()=>({terrain:'soil'}));
  for(let z=12;z<=18;z++)for(let x=12;x<=18;x++)world.tiles[z*32+x]={terrain:'rock'};
  const typed=structuredClone(world);typed.tiles[15*32+15]={terrain:'rock',stone:'granite'};
  const damaged=structuredClone(typed);damaged.tiles[15*32+15]!.miningDamage=80;
  const mined=structuredClone(damaged);mined.tiles[15*32+15]={terrain:'rough-stone',stone:'granite'};
  expect(sameTerrainSurface(null,typed)).toBe(false);
  expect(sameTerrainSurface(typed,typed)).toBe(true);
  expect(sameTerrainSurface(world,typed)).toBe(false);
  expect(sameTerrainSurface(typed,damaged)).toBe(true);
  expect(sameTerrainSurface(damaged,mined)).toBe(true);
  const altered=structuredClone(mined);altered.tiles[15*32+15]!.stone='marble';
  expect(sameTerrainSurface(mined,altered)).toBe(false);
  altered.tiles[15*32+15]={terrain:'soil'};
  expect(sameTerrainSurface(mined,altered)).toBe(false);
  const legacy=structuredClone(world);legacy.tiles[15*32+15]={terrain:'rough-stone'};
  expect(sameTerrainSurface(world,legacy)).toBe(true);
  expect(typed.tiles[15*32+15]).toEqual({terrain:'rock',stone:'granite'});
  const a=new Float32Array(ROCK_VERTICES*3),b=new Float32Array(ROCK_VERTICES*3);
  const faces=writeRockCell(world,15,15,a,0);writeRockCell(world,16,15,b,0);
  expect(faces).toHaveLength(6); // two top triangles only, no hidden internal walls
  for(const ring of [0,4,8]) {
    expect([...a.slice((ring+3)*3,(ring+4)*3)]).toEqual([...b.slice(ring*3,(ring+1)*3)]);
    expect([...a.slice((ring+2)*3,(ring+3)*3)]).toEqual([...b.slice((ring+1)*3,(ring+2)*3)]);
  }
  const points=[0,1,2].map(i=>new THREE.Vector3().fromArray(a,faces[i]!*3));
  expect(points[1]!.clone().sub(points[0]!).cross(points[2]!.clone().sub(points[0]!)).y).toBeGreaterThan(0);
  const material=new THREE.MeshStandardNodeMaterial(),layer=new RockLayer(material),before=JSON.stringify(world);
  layer.update(world,true);expect(JSON.stringify(world)).toBe(before);
  const geometry=layer.mesh.geometry,position=geometry.getAttribute('position') as THREE.BufferAttribute,index=geometry.index,original=Array.from(index!.array).slice(0,geometry.drawRange.count);
  const vertices=Array.from(position.array);
  expect(position.usage).toBe(THREE.StaticDrawUsage);expect(index!.usage).toBe(THREE.StaticDrawUsage);
  const positionVersion=position.version;layer.update(world);expect(position.version).toBe(positionVersion);
  const colors=geometry.getAttribute('color'),oldColors=Array.from(colors.array);
  world.tiles=world.tiles.map((tile,i)=>i===15*32+15?{terrain:'rock',stone:'marble'}:tile);layer.update(world);
  expect(layer.stats.updatedCells).toBe(9);expect(Array.from(colors.array)).not.toEqual(oldColors);
  expect(position.version).toBeGreaterThan(positionVersion);
  expect(Array.from(position.array)).toEqual(vertices);expect(Array.from(index!.array).slice(0,geometry.drawRange.count)).toEqual(original);
  expect(layer.mesh.geometry).toBe(geometry);expect(geometry.getAttribute('color')).toBe(colors);
  const marbleColors=Array.from(colors.array),bytes=layer.stats.bufferBytes;
  world.tiles=world.tiles.map((tile,i)=>i===15*32+15?{...tile,ore:'steel'}:tile);layer.update(world);
  expect(layer.stats.updatedCells).toBe(9);expect(layer.stats.bufferBytes).toBe(bytes);
  expect(Array.from(colors.array)).not.toEqual(marbleColors);expect(Array.from(position.array)).toEqual(vertices);
  expect(layer.mesh.geometry).toBe(geometry);expect(geometry.index).toBe(index);
  world.tiles=world.tiles.map((tile,i)=>i===15*32+15?{...tile,miningDamage:80}:tile);layer.update(world);
  expect(layer.stats.updatedCells).toBe(0);
  world.tiles=world.tiles.map((tile,i)=>i===15*32+15?{terrain:'soil'}:tile);layer.update(world);
  expect(layer.stats.updatedCells).toBe(9);expect(layer.mesh.geometry).toBe(geometry);expect(geometry.index).toBe(index);expect(geometry.getAttribute('position')).toBe(position);
  expect(layer.stats.indexCount).toBe(original.length+42); // remove top, expose four neighbours
  expect(Array.from(position.array).slice(24*3,(24+ROCK_VERTICES)*3)).toEqual(vertices.slice(24*3,(24+ROCK_VERTICES)*3));
  world.tiles=world.tiles.map((tile,i)=>i===15*32+15?{terrain:'rock'}:tile);layer.update(world);
  expect(Array.from(index!.array).slice(0,geometry.drawRange.count)).toEqual(original);
  world.tiles=world.tiles.map(()=>({terrain:'soil'}));layer.update(world);expect(geometry.drawRange.count).toBe(36);
  world.tiles=world.tiles.map((tile,i)=>i===0?{terrain:'rock'}:tile);layer.update(world);
  expect(layer.stats.indexCount).toBe(90);
  const active=Array.from(layer.mesh.geometry.index!.array).slice(0,layer.stats.indexCount);
  expect(active.every(i=>i>=0&&i<layer.mesh.geometry.getAttribute('position').count)).toBe(true);
  layer.dispose();material.dispose();
});
