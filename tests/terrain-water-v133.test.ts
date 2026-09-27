import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import { buildTerrain, createTerrainPaintTexture, patchTerrainPaintTexture, terrainPaintEdge, terrainPaintPixelsPerCell } from '../src/render/TerrainLayer';
import { clearGroup } from '../src/render/primitives';

test('shore pigment is irregular, locally foamy, and deterministic under a water patch',()=>{
  const world=createWorld(133,8,8);
  world.tiles=world.tiles.map((_,index)=>({terrain:index%8>=3?'water':'grass'}));
  const scale=terrainPaintPixelsPerCell(world),texture=createTerrainPaintTexture(world);
  const alpha=(x:number,z:number)=>(texture.image.data as Uint8Array)[(z*texture.image.width+x)*4+3]!;
  try {
    expect(alpha(3*scale,3*scale+3)).toBeGreaterThan(alpha(5*scale,3*scale+3));
    expect(alpha(5*scale,3*scale+3)).toBe(0);
    expect(alpha(scale,3*scale+3)).toBe(0);
    const push=Array.from({length:64},(_,i)=>Math.abs(terrainPaintEdge(0,3,i/64,world.seed)));
    expect(Math.max(...push)).toBeGreaterThan(.16);
    world.tiles[3*8+2]={terrain:'water'};
    patchTerrainPaintTexture(texture,world,[3*8+2]);
    const fresh=createTerrainPaintTexture(world);
    try {expect(texture.image.data).toEqual(fresh.image.data);} finally {fresh.dispose();}
  } finally {texture.dispose();}
});

test('painted water and land reuse original cell triangles with continuous UVs',()=>{
  const world=createWorld(133,65,8);
  world.tiles=world.tiles.map((_,i)=>({terrain:i%world.width>31?'water':'grass'}));
  const group=new THREE.Group(),land=new THREE.MeshStandardNodeMaterial(),water=new THREE.MeshStandardNodeMaterial();
  land.userData.rendererOwned=water.userData.rendererOwned=true;
  try {
    buildTerrain(world,group,land,water,true);
    const meshes=group.children as THREE.Mesh[];
    expect(meshes.filter(mesh=>mesh.material===water)).toHaveLength(2);
    const waterIndices=meshes.filter(mesh=>mesh.material===water).reduce((sum,mesh)=>sum+mesh.geometry.index!.count,0);
    expect(waterIndices).toBe(world.height*(world.width-32)*6);
    for(const mesh of meshes.filter(mesh=>mesh.material===water)){
      const position=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');
      expect(uv.count).toBe(position.count);
      for(let i=0;i<uv.count;i++){
        expect(uv.getX(i)).toBeCloseTo((position.getX(i)+.5)/world.width,5);
        expect(uv.getY(i)).toBeCloseTo((position.getZ(i)+.5)/world.height,5);
      }
    }
  } finally {clearGroup(group);land.dispose();water.dispose();}
});
