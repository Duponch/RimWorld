import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {buildTerrain,createTerrainPaintTexture,patchTerrainPaintTexture,terrainPaintPixelsPerCell,TERRAIN_COLORS} from '../src/render/TerrainLayer.ts';
import {clearGroup} from '../src/render/primitives.ts';
import {terrainInspection,TERRAIN_LABELS} from '../src/ui/terrain-inspection.ts';
import {WORLD_SCALE} from '../src/world/scale.ts';
import type {Terrain,World} from '../src/sim/types.ts';

/** Render-only plain-data view; no generated colony, DOM or GPU is needed. */
const view=(width:number,height:number,terrain:Terrain='grass'):World=>({seed:385,width,height,tiles:Array.from({length:width*height},()=>({terrain}))} as World);

test('marsh uses the existing flat land surface and vertex pigment with textures disabled',()=>{
  const w=view(2,1,'marsh');w.tiles[1]={terrain:'water'};
  const group=new THREE.Group(),land=new THREE.MeshBasicMaterial({vertexColors:true}),water=new THREE.MeshBasicMaterial({vertexColors:true});
  land.userData.rendererOwned=water.userData.rendererOwned=true;const before=JSON.stringify(w);
  try{
    buildTerrain(w,group,land,water,false);const meshes=group.children as THREE.Mesh[];
    expect(meshes).toHaveLength(2);expect(meshes.filter(m=>m.material===land)).toHaveLength(1);expect(meshes.filter(m=>m.material===water)).toHaveLength(1);
    const ground=meshes.find(m=>m.material===land)!,p=ground.geometry.getAttribute('position'),n=ground.geometry.getAttribute('normal'),color=ground.geometry.getAttribute('color');
    let top=0;for(let i=0;i<p.count;i++)if(n.getY(i)>.99){top++;expect(p.getY(i)).toBeCloseTo(0,7);expect(p.getX(i)).toBeGreaterThanOrEqual(-.5);expect(p.getX(i)).toBeLessThanOrEqual(.5);expect(color.getX(i)+color.getY(i)+color.getZ(i)).toBeGreaterThan(0);}
    expect(top).toBe(4);expect(ground.geometry.getAttribute('uv')).toBeUndefined();
    const wet=meshes.find(m=>m.material===water)!.geometry.getAttribute('position');for(let i=0;i<wet.count;i++)expect(wet.getY(i)).toBeCloseTo(WORLD_SCALE.waterSurface,7);
    expect(TERRAIN_COLORS.marsh).not.toBe(TERRAIN_COLORS.water);expect(TERRAIN_COLORS.marsh).not.toBe(TERRAIN_COLORS.grass);expect(JSON.stringify(w)).toBe(before);
  }finally{clearGroup(group);land.dispose();water.dispose();}
});

test('marsh paint has no water foam and a local patch matches an independent full bake',()=>{
  const w=view(3,3),texture=createTerrainPaintTexture(w),scale=terrainPaintPixelsPerCell(w);
  try{
    w.tiles[4]={terrain:'marsh'};const before=JSON.stringify(w);patchTerrainPaintTexture(texture,w,[4]);const fresh=createTerrainPaintTexture(w);
    try{
      expect(texture.image.data).toEqual(fresh.image.data);const pixels=texture.image.data as Uint8Array,center=((scale+4)*texture.image.width+scale+4)*4;
      expect(pixels[center+3]).toBe(0);expect(pixels[center]!+pixels[center+1]!+pixels[center+2]!).toBeGreaterThan(0);expect(JSON.stringify(w)).toBe(before);
    }finally{fresh.dispose();}
  }finally{texture.dispose();}
});

test('hover identifies traversable marsh, zero fertility and its ordinary construction limits',()=>{
  const info=terrainInspection({terrain:'marsh'});expect(TERRAIN_LABELS.marsh).toBe('Marais');expect(info).toContain('Fertilité : 0 %');expect(info).toContain('Terrain non cultivable');
  expect(info).toContain('Déplacements ralentis');expect(info).toContain('Support de construction ordinaire absent');expect(info).toContain('Conduit électrique ordinaire incompatible');expect(info).not.toContain('infranchissable');
  expect(TERRAIN_LABELS.water).toBe('Eau infranchissable');
});