import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {createWorld} from '../src/sim/engine';
import {EnvironmentLighting} from '../src/render/EnvironmentLighting';
import {RockLayer} from '../src/render/RockLayer';
import {rockCornerPigment} from '../src/render/rock-pigment';

function witness(){
 const w=createWorld(42,32,32);w.site={revision:3,tileId:0,mapSeed:w.seed,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','marble'],coastAngle:null,mutatorCode:0};w.exploration={revision:1};
 w.tiles=w.tiles.map(()=>({terrain:'soil-natural'}));
 for(let z=12;z<=16;z++)for(let x=12;x<=16;x++)w.tiles[z*w.width+x]={terrain:'rock',stone:'granite',...x>=14?{fogged:true as const}:{}};
 return w;
}
test('rock keeps opaque covers and shared geometry without owner buffers; ordinary props stay masked',()=>{
 const world=witness(),saved=structuredClone(world),lighting=new EnvironmentLighting(),prop=new THREE.MeshStandardNodeMaterial();lighting.configure(prop);
 const layer=new RockLayer(lighting.configure);layer.update(world,true);lighting.exploration.adopt(world,true,null);
 const g=layer.mesh.geometry,position=g.getAttribute('position');
 expect(g.getAttribute('explorationOwner')).toBeUndefined();
 for(const mesh of (layer.group.children[1] as THREE.Group).children as THREE.Mesh[])expect(mesh.geometry.getAttribute('position')).toBe(position);
 const textured=layer.mesh.material as THREE.MeshStandardNodeMaterial;layer.setTexturesEnabled(false);const plain=layer.mesh.material as THREE.MeshStandardNodeMaterial;
 for(const m of [plain,textured]){expect(m).not.toBe(prop);expect(m.side).toBe(THREE.FrontSide);expect(m.maskNode).toBeNull();expect(m.maskShadowNode).toBeNull();expect(m.outputNode).toBeTruthy();expect(m.depthWrite).toBe(true);expect(m.transparent).toBe(false);}
 expect(prop.maskNode).toBeTruthy();expect(prop.maskShadowNode).toBeTruthy();expect(world).toEqual(saved);
 layer.setDistant(true);expect(layer.mesh.geometry).toBe(g);expect(layer.mesh.geometry.getAttribute('position')).toBe(position);
 layer.dispose();prop.dispose();lighting.dispose();
});
test('hidden ore never contributes pigment to a known neighbour; real revelation refreshes local pigments without reallocating',()=>{
 const before=witness(),cell=14*32+14;before.tiles[cell]={...before.tiles[cell]!,ore:'gold'};
 const without=structuredClone(before);delete without.tiles[cell]!.ore;
 expect(rockCornerPigment(before,14,14)).toEqual(rockCornerPigment(without,14,14));
 const layer=new RockLayer();layer.update(before,true);const g=layer.mesh.geometry,indices=Array.from(g.index!.array),colors=Array.from(g.getAttribute('color').array);
 const revealed={...before,tiles:before.tiles.slice()};revealed.tiles[cell]={...before.tiles[cell]!};delete revealed.tiles[cell]!.fogged;
 layer.update(revealed,false,[cell]);expect(layer.stats.updatedCells).toBe(9);expect(layer.mesh.geometry).toBe(g);expect(Array.from(g.index!.array)).toEqual(indices);expect(Array.from(g.getAttribute('color').array)).not.toEqual(colors);
 const full=new RockLayer();full.update(revealed,true);expect(Array.from(g.getAttribute('color').array)).toEqual(Array.from(full.mesh.geometry.getAttribute('color').array));
 layer.dispose();full.dispose();
});


test('rock soft view shares authoritative bytes/ranges but keeps linear filtering independent of strict object visibility',()=>{
 const world=witness(),saved=structuredClone(world),lighting=new EnvironmentLighting(),mask=lighting.exploration;
 const nearest=mask.map,linear=mask.rockMap;
 expect(nearest).not.toBe(linear);expect(nearest.minFilter).toBe(THREE.NearestFilter);expect(linear.minFilter).toBe(THREE.LinearFilter);
 mask.adopt(world,true,null);expect(nearest.image.data).toBe(linear.image.data);expect(linear.image.data).toBe(mask.field.data);expect(nearest.updateRanges).toEqual(linear.updateRanges);
 nearest.onUpdate?.(nearest);linear.onUpdate?.(linear);expect(nearest.updateRanges).toEqual([]);expect(linear.updateRanges).toEqual([]);
 const versions=[nearest.version,linear.version];expect(mask.adopt(world,false,[])).toBe(false);expect([nearest.version,linear.version]).toEqual(versions);
 const cell=14*32+14,next={...world,tiles:world.tiles.slice()};next.tiles[cell]={...world.tiles[cell]!};delete next.tiles[cell]!.fogged;
 mask.adopt(next,false,[cell]);expect(mask.map).toBe(nearest);expect(mask.rockMap).toBe(linear);expect(nearest.image.data).toBe(linear.image.data);expect(nearest.updateRanges).toEqual([{start:cell*4,count:4}]);expect(linear.updateRanges).toEqual(nearest.updateRanges);expect(world).toEqual(saved);
 lighting.dispose();
});
test('known ore lends shared edge pigment; an entirely unknown corner uses neutral stone regardless of hidden ore/geology',()=>{
 const world=witness(),known=14*32+13,hidden=14*32+14;
 const plain=rockCornerPigment(world,14,14);world.tiles[known]={...world.tiles[known]!,ore:'gold'};
 expect(rockCornerPigment(world,14,14)).not.toEqual(plain);
 const knownGold=rockCornerPigment(world,14,14);world.tiles[hidden]={...world.tiles[hidden]!,ore:'uranium',stone:'slate'};expect(rockCornerPigment(world,14,14)).toEqual(knownGold);
 for(const tile of world.tiles)if(tile.terrain==='rock')tile.fogged=true;
 const neutral=rockCornerPigment(world,14,14);expect(neutral.every(value=>value>0)).toBe(true);
 delete world.tiles[known]!.ore;delete world.tiles[hidden]!.ore;world.tiles[known]!.stone='marble';world.tiles[hidden]!.stone='sandstone';expect(rockCornerPigment(world,14,14)).toEqual(neutral);
});
