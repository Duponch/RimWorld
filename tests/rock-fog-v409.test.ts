import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {createWorld} from '../src/sim/engine';
import {EnvironmentLighting} from '../src/render/EnvironmentLighting';
import {RockLayer} from '../src/render/RockLayer';
import {rockCornerPigment,ROCK_FOG_PIGMENT,writeRockPigment} from '../src/render/rock-pigment';
import {ROCK_VERTICES} from '../src/render/RockSurface';

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
 for(const m of [plain,textured]){expect(m).not.toBe(prop);expect(m.side).toBe(THREE.FrontSide);expect(m.maskNode).toBeNull();expect(m.maskShadowNode).toBeNull();expect(m.outputNode).toBe(prop.outputNode);expect(m.depthWrite).toBe(true);expect(m.transparent).toBe(false);}
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


test('one strict nearest field remains; rock shading has no separate texture or postprocessing path',()=>{
 const world=witness(),lighting=new EnvironmentLighting(),mask=lighting.exploration,nearest=mask.map;
 expect(nearest.minFilter).toBe(THREE.NearestFilter);expect(Object.hasOwn(mask,'rockMap')).toBe(false);expect(Object.hasOwn(Object.getPrototypeOf(mask),'opaqueRockOutput')).toBe(false);
 mask.adopt(world,true,null);nearest.onUpdate?.(nearest);const version=nearest.version;expect(mask.adopt(world,false,[])).toBe(false);expect(nearest.version).toBe(version);
 const cell=14*32+14,next={...world,tiles:world.tiles.slice()};next.tiles[cell]={...world.tiles[cell]!};delete next.tiles[cell]!.fogged;
 mask.adopt(next,false,[cell]);expect(mask.map).toBe(nearest);expect(nearest.updateRanges).toEqual([{start:cell*4,count:4}]);lighting.dispose();
});

test('fog participates with its original occupied-corner weight and shares the stone/ore colour stream',()=>{
 const world=witness();for(const tile of world.tiles)delete tile.fogged;
 const known=rockCornerPigment(world,14,14);world.tiles[14*32+14]!.fogged=true;
 const mixed=rockCornerPigment(world,14,14);expect(mixed).not.toEqual(known);for(let c=0;c<3;c++)expect(mixed[c]!).toBeLessThan(known[c]!);
 const a=new Float32Array(ROCK_VERTICES*3),b=new Float32Array(ROCK_VERTICES*3);writeRockPigment(world,13,14,a,0);writeRockPigment(world,14,14,b,0);
 for(const ring of [0,4,8])expect(Array.from(a.slice((ring+3)*3,(ring+4)*3))).toEqual(Array.from(b.slice(ring*3,(ring+1)*3)));
 for(const tile of world.tiles)if(tile.terrain==='rock')tile.fogged=true;
 const dark=rockCornerPigment(world,14,14),base=new THREE.Color(ROCK_FOG_PIGMENT);expect(dark[0]!/base.r).toBeCloseTo(dark[1]!/base.g,12);expect(dark[1]!/base.g).toBeCloseTo(dark[2]!/base.b,12);expect(dark.every(value=>value>0)).toBe(true);
 expect(rockCornerPigment(world,2,2)).toEqual([0,0,0]);
});

test('unknown ore/geology are never read by corner pigment or resident rock adoption',()=>{
 const world=witness(),hidden=14*32+14;
 Object.defineProperty(world.tiles[hidden]!,'ore',{get(){throw Error('undiscovered ore read');},configurable:true});
 Object.defineProperty(world.tiles[hidden]!,'stone',{get(){throw Error('undiscovered geology read');},configurable:true});
 expect(()=>rockCornerPigment(world,14,14)).not.toThrow();const layer=new RockLayer();expect(()=>layer.update(world,true)).not.toThrow();layer.dispose();
});
