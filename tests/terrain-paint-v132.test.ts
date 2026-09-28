import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import { buildTerrain, createTerrainPaintTexture, patchTerrainPaintTexture, syncTerrainPaintUvs, terrainPaintEdge, terrainPaintPixelsPerCell } from '../src/render/TerrainLayer';
import { terrainSurfaceChanges } from '../src/render/terrain-state';
import { clearGroup } from '../src/render/primitives';

test('painted ground shares world UVs across cells and chunks without adding triangles', () => {
  const world=createWorld(132,66,8);
  world.tiles=world.tiles.map(()=>({terrain:'soil'}));
  const group=new THREE.Group(),plain=new THREE.MeshStandardNodeMaterial({vertexColors:true});
  const water=new THREE.MeshStandardNodeMaterial({vertexColors:true});
  plain.userData.rendererOwned=water.userData.rendererOwned=true;
  try {
    buildTerrain(world,group,plain,water,true);
    const meshes=group.children as THREE.Mesh[];
    expect(meshes).toHaveLength(2); // the 64-cell chunk boundary
    const perimeterBanks=2*(world.width+world.height);
    expect(meshes.reduce((sum,mesh)=>sum+mesh.geometry.index!.count,0)).toBe((world.width*world.height+perimeterBanks)*6);
    const matched=new Set<string>();
    for(const mesh of meshes){
      const positions=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');
      expect(uv.count).toBe(positions.count);
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),z=positions.getZ(i);
        expect(uv.getX(i)).toBeCloseTo((x+.5)/world.width,5);
        expect(uv.getY(i)).toBeCloseTo((z+.5)/world.height,5);
        if(x===63.5)matched.add(`${z}:${uv.getX(i).toFixed(6)}:${uv.getY(i).toFixed(6)}`);
      }
    }
    expect(matched.size).toBe(9);
    syncTerrainPaintUvs(world,group,plain,false);
    expect(meshes.every(mesh=>!mesh.geometry.getAttribute('uv'))).toBe(true);
    syncTerrainPaintUvs(world,group,plain,true);
    expect(meshes.every(mesh=>Boolean(mesh.geometry.getAttribute('uv')))).toBe(true);
  } finally {clearGroup(group);plain.dispose();water.dispose();}
});

test('painted borders bleed within a narrow band while centers retain biome color and stable chalk', () => {
  const world=createWorld(143,8,8);
  world.tiles=world.tiles.map((_,i)=>({terrain:i%8<2?'soil':'grass'}));
  const first=createTerrainPaintTexture(world),second=createTerrainPaintTexture(world);
  try {
    const pixels=first.image.data as Uint8Array,scale=terrainPaintPixelsPerCell(world);
    const rgb=(x:number,z:number)=>Array.from(pixels.slice((z*first.image.width+x)*4,(z*first.image.width+x)*4+3));
    const soil=rgb(scale,scale),grass=rgb(3*scale,scale);
    expect(soil).not.toEqual(grass);
    const boundary=rgb(2*scale-1,scale),inside=rgb(scale,scale);
    expect(boundary).not.toEqual(inside);
    expect(Array.from(first.image.data as Uint8Array)).toEqual(Array.from(second.image.data as Uint8Array));
    expect(first.magFilter).toBe(THREE.LinearFilter);
    expect(first.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    expect(first.image.width).toBe(8*scale);
    expect(terrainPaintPixelsPerCell({width:512,height:250})).toBe(4);
    expect(terrainPaintEdge(0,2,1.25,world.seed)).toBe(terrainPaintEdge(0,2,1.25,world.seed));
    expect(terrainPaintEdge(0,2,1.25,world.seed)).not.toBe(terrainPaintEdge(0,2,1.75,world.seed));
  } finally {first.dispose();second.dispose();}
});

test('a one-tile patch is byte-identical to a fresh bake, including neighboring bleed', () => {
  const world=createWorld(145,16,16);
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  const texture=createTerrainPaintTexture(world);
  const before={...world,tiles:world.tiles};
  world.tiles=world.tiles.map((tile,i)=>i===8*16+8?{terrain:'gravel'}:tile);
  const changed=terrainSurfaceChanges(before,world);
  const fresh=createTerrainPaintTexture(world);
  let edge:THREE.DataTexture|undefined;
  try {
    expect(changed).toEqual([8*16+8]);
    const painted=patchTerrainPaintTexture(texture,world,changed!);
    expect(painted).toBe(3*3*8*8);
    expect(Array.from(texture.image.data as Uint8Array)).toEqual(Array.from(fresh.image.data as Uint8Array));
    expect(texture.updateRanges.length).toBe(0);
    expect(texture.version).toBe(2);
    const next={...world,tiles:world.tiles.map((tile,i)=>i===0?{terrain:'soil'}:tile)} as typeof world;
    const edgeChanges=terrainSurfaceChanges(world,next);
    edge=createTerrainPaintTexture(next);
    expect(edgeChanges).toEqual([0]);
    expect(patchTerrainPaintTexture(texture,next,edgeChanges!)).toBe(2*2*8*8);
    expect(Array.from(texture.image.data as Uint8Array)).toEqual(Array.from(edge.image.data as Uint8Array));
  } finally {texture.dispose();fresh.dispose();edge?.dispose();}
});

test('deferred upload keeps the resident texture version while updating land and shore bytes', () => {
  const world=createWorld(146,16,16);
  world.tiles=world.tiles.map((_,index)=>({terrain:index%world.width===7?'water':'grass'}));
  const texture=createTerrainPaintTexture(world),version=texture.version;
  const changed=8*world.width+7;
  world.tiles[changed]={terrain:'soil'};
  const fresh=createTerrainPaintTexture(world);
  try {
    expect(patchTerrainPaintTexture(texture,world,[changed],true)).toBe(3*3*8*8);
    expect(texture.version).toBe(version);
    expect(texture.image.data).toEqual(fresh.image.data);
  } finally {texture.dispose();fresh.dispose();}
});

test('a full 250² world retains a bounded resident paint map', () => {
  const world=createWorld(144,250,250);
  const start=performance.now(),texture=createTerrainPaintTexture(world);
  try {
    const elapsed=performance.now()-start;
    const bytes=(texture.image.data as Uint8Array).byteLength;
    expect(texture.image.width).toBe(2000);
    expect(texture.image.height).toBe(2000);
    expect(bytes).toBe(16_000_000);
    console.info(`terrain paint 250²: ${elapsed.toFixed(0)} ms initial bake, ${bytes} bytes RGBA, ~${Math.ceil(bytes*4/3)} bytes with mipmaps`);
    const changed=125*world.width+125;
    world.tiles[changed]={terrain:world.tiles[changed]!.terrain==='soil'?'grass':'soil'};
    const patchStart=performance.now(),painted=patchTerrainPaintTexture(texture,world,[changed]);
    const patchMs=performance.now()-patchStart;
    expect(painted).toBe(576);
    expect(texture.updateRanges).toHaveLength(0); // Direct callers retain the full-upload fallback.
    console.info(`terrain paint 250² one-cell patch: ${patchMs.toFixed(2)} ms CPU, ${painted} pixels recomputed; direct texture update uploads full image`);
  } finally {texture.dispose();}
});
