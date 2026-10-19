import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {createWorld} from '../src/sim/engine';
import {buildTerrain,createTerrainPaintTexture,patchTerrainPaintTexture,terrainPresentationType} from '../src/render/TerrainLayer';
import {terrainSurfaceChanges} from '../src/render/terrain-state';
import {ExplorationMask256,opaqueGroundExplorationMaterial256,solidExplorationMaterial256} from '../src/render/ExplorationMask256';
import {clearGroup} from '../src/render/primitives';
function witness(){
 const w=createWorld(436,8,8);
 w.site={revision:3,tileId:0,mapSeed:w.seed,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','marble'],coastAngle:null,mutatorCode:0};
 w.exploration={revision:1};w.tiles=w.tiles.map(()=>({terrain:'soil-natural',fogged:true}));return w;
}
test('unknown ground is the same ordinary painted land for hidden water, stone or soil, without reading their properties',()=>{
 const a=witness(),b=witness();b.tiles=b.tiles.map(()=>({fogged:true,get terrain():never{throw Error('hidden terrain');},get stone():never{throw Error('hidden stone');},get ore():never{throw Error('hidden ore');}}));
 const first=createTerrainPaintTexture(a),second=createTerrainPaintTexture(b),g1=new THREE.Group(),g2=new THREE.Group(),land=new THREE.MeshLambertNodeMaterial(),water=new THREE.MeshLambertNodeMaterial();
 try{
  expect(second.image.data).toEqual(first.image.data);buildTerrain(a,g1,land,water);buildTerrain(b,g2,land,water);
  expect(g2.children).toHaveLength(g1.children.length);
  for(let i=0;i<g1.children.length;i++)for(const key of ['position','color','normal'])expect((g2.children[i] as THREE.Mesh).geometry.getAttribute(key).array).toEqual((g1.children[i] as THREE.Mesh).geometry.getAttribute(key).array);
 }finally{first.dispose();second.dispose();clearGroup(g1);clearGroup(g2);land.dispose();water.dispose();}
});
test('same-tick reveal patches the original painted boundary exactly and restores real water geometry',()=>{
 const a=witness(),i=3*a.width+3;a.tiles[i]={terrain:'water-deep',fogged:true};const before=structuredClone(a),texture=createTerrainPaintTexture(before);
 const next={...a,tiles:[...a.tiles]};next.tiles[i]={terrain:'water-deep'};
 const fresh=createTerrainPaintTexture(next);
 try{
  expect(terrainPresentationType(before,i)).toBe('soil');expect(terrainPresentationType(next,i)).toBe('water-deep');
  const changed=terrainSurfaceChanges(before,next);expect(changed).toEqual([i]);patchTerrainPaintTexture(texture,next,changed!);
  expect(texture.image.data).toEqual(fresh.image.data);expect(next.tick).toBe(before.tick);
 }finally{texture.dispose();fresh.dispose();}
});
test('enabling or removing exploration invalidates the bake even when Tile identities do not change',()=>{
 const enabled=witness(),legacy={...enabled,exploration:undefined};
 expect(terrainSurfaceChanges(enabled,legacy,[])).toBeNull();expect(terrainSurfaceChanges(legacy,enabled,[])).toBeNull();
 const a=createTerrainPaintTexture(enabled),b=createTerrainPaintTexture(legacy);
 try{expect(a.image.data).not.toEqual(b.image.data);}finally{a.dispose();b.dispose();}
});
test('ground retains its original material masks and introduces no fog plane; solid props keep explicit masks',()=>{
 const fog=new ExplorationMask256(),ground=opaqueGroundExplorationMaterial256(new THREE.MeshLambertNodeMaterial()),wall=solidExplorationMaterial256(new THREE.MeshLambertNodeMaterial());
 try{
  fog.configure(ground);expect(ground.maskNode).toBeNull();expect(ground.maskShadowNode).toBeNull();expect('surface' in fog).toBe(false);
  fog.configure(wall);expect(wall.maskNode).toBeTruthy();expect(wall.maskShadowNode).toBeTruthy();
 }finally{fog.dispose();ground.dispose();wall.dispose();}
});
