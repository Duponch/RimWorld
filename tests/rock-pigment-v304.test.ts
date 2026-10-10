import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {createWorld} from '../src/sim/engine';
import {RockLayer} from '../src/render/RockLayer';
import {ROCK_VERTICES} from '../src/render/RockSurface';
import {rockCornerPigment,writeRockPigment} from '../src/render/rock-pigment';

function scene(){const world=createWorld(42,32,32);world.tiles=world.tiles.map(()=>({terrain:'soil'}));
  for(let z=12;z<=18;z++)for(let x=12;x<=18;x++)world.tiles[z*32+x]={terrain:'rock',stone:x<16?'granite':'marble'};
  world.tiles[15*32+15]={terrain:'rock',stone:'granite',ore:'gold'};return world;}

test('every ring uses the identical shared pigment across stone/ore cell seams',()=>{
  const world=scene(),before=JSON.stringify(world),a=new Float32Array(ROCK_VERTICES*3),b=new Float32Array(ROCK_VERTICES*3);
  writeRockPigment(world,15,15,a,0);writeRockPigment(world,16,15,b,0);
  for(const ring of [0,4,8]){
    expect([...a.slice((ring+3)*3,(ring+4)*3)]).toEqual([...b.slice(ring*3,(ring+1)*3)]);
    expect([...a.slice((ring+2)*3,(ring+3)*3)]).toEqual([...b.slice((ring+1)*3,(ring+2)*3)]);
  }
  expect(new Set([...a].map(v=>Math.round(v*1000))).size).toBeGreaterThan(3);
  expect(JSON.stringify(world)).toBe(before);
});

test('boundary pigment blends occupied colours while empty and map-edge cells cannot contaminate a cliff',()=>{
  const world=scene(),mixed=rockCornerPigment(world,16,16);
  const gold={...world,tiles:world.tiles.map(t=>t.terrain==='rock'?{terrain:'rock' as const,ore:'gold' as const}:t)};
  const marble={...world,tiles:world.tiles.map(t=>t.terrain==='rock'?{terrain:'rock' as const,stone:'marble' as const}:t)};
  expect(mixed).not.toEqual(rockCornerPigment(gold,16,16));expect(mixed).not.toEqual(rockCornerPigment(marble,16,16));
  const edge=createWorld(42,32,32);edge.tiles=edge.tiles.map(()=>({terrain:'soil'}));edge.tiles[0]={terrain:'rock',stone:'slate'};
  const pigment=rockCornerPigment(edge,0,0);expect(pigment.every(v=>Number.isFinite(v)&&v>0)).toBe(true);
  edge.tiles[1]={terrain:'water'};edge.tiles[32]={terrain:'rich-soil'};expect(rockCornerPigment(edge,0,0)).toEqual(pigment);
  expect(rockCornerPigment(edge,20,20)).toEqual([0,0,0]);
});

test('sparse ore changes match full colour rebuild without touching topology or creating extra draws',()=>{
  const before=scene(),material=new THREE.MeshStandardNodeMaterial(),sparse=new RockLayer(material),full=new RockLayer(material);
  try{
    sparse.update(before,true);full.update(before,true);const geometry=sparse.mesh.geometry;
    const positions=Array.from(geometry.getAttribute('position').array),indices=Array.from(geometry.index!.array),children=(sparse.group.children[1] as THREE.Group).children.length;
    const after={...before,tiles:before.tiles.slice()};after.tiles[15*32+15]={terrain:'rock',stone:'granite',ore:'steel'};
    sparse.update(after,false,[15*32+15]);full.update(after);
    expect(sparse.stats.updatedCells).toBe(9);expect(sparse.mesh.geometry).toBe(geometry);
    expect(Array.from(geometry.getAttribute('position').array)).toEqual(positions);expect(Array.from(geometry.index!.array)).toEqual(indices);
    expect(Array.from(geometry.getAttribute('color').array)).toEqual(Array.from(full.mesh.geometry.getAttribute('color').array));
    expect((sparse.group.children[1] as THREE.Group).children).toHaveLength(children);
  }finally{sparse.dispose();full.dispose();material.dispose();}
});
