import {expect,test} from 'vitest';
import type {InstancedBufferAttribute} from 'three/webgpu';
import type {FilthRecord} from '../src/sim/filth-rules';
import {FilthLayer} from '../src/render/FilthLayer';
import {FilthPresentationPieces} from '../src/render/filth-presentation-pieces';
import {filthDecal} from '../src/render/filth-appearance';
import {FILTH_SURFACE_OFFSET,FLOOR_SURFACE_Y,filthDecalBounds,filthSurfacePatches,type FilthSurface} from '../src/render/surface-height';

const surface=():FilthSurface=>({width:32,height:32,tiles:Array.from({length:1024},()=>({terrain:'soil'}))});
const item=(id:number,x:number,z:number):FilthRecord=>({id,x,z,kind:'blood',thickness:2,grownCore:1,expiresAfterCore:100,nextCheckCore:2});
const attribute=(layer:FilthLayer,name:string)=>layer.mesh.geometry.getAttribute(name) as InstancedBufferAttribute;
const names=['filthPose','filthShape','filthClip'];
function literal(items:readonly FilthRecord[],world?:FilthSurface){
 const pose:number[]=[],shape:number[]=[],clip:number[]=[];
 for(const f of items)for(let layer=0;layer<f.thickness;layer++){
  const d=filthDecal(f,layer),bounds=filthDecalBounds(d);
  for(const p of world?filthSurfacePatches(world,bounds):[{...bounds,height:FLOOR_SURFACE_Y}]){
   pose.push(d.x,p.height+FILTH_SURFACE_OFFSET,d.z,d.rotation);shape.push(d.width,d.height,d.tile,d.flip?1:0);clip.push(p.minX,p.minZ,p.maxX,p.maxZ);
  }
 }
 return [pose,shape,clip].map(values=>values.map(Math.fround));
}
function expectLiteral(layer:FilthLayer,items:readonly FilthRecord[],world?:FilthSurface):void {
 const expected=literal(items,world);expect(layer.mesh.geometry.instanceCount).toBe(expected[0]!.length/4);
 for(const [i,name]of names.entries())expect(Array.from(attribute(layer,name).array).slice(0,expected[i]!.length)).toEqual(expected[i]);
}

test('one stain mutation and one support edit retain every other identity and exact transparent piece order',()=>{
 const world=surface(),items=[item(1,4,4),item(2,12,12),item(3,24,24)],pieces=new FilthPresentationPieces(),layer=new FilthLayer();
 try{
  const a=pieces.read(items,false,world);layer.update(items,false,world);expectLiteral(layer,items,world);
  items[1]!.kind='vomit';const b=pieces.read(items,false,world);layer.update(items,false,world);expectLiteral(layer,items,world);
  expect(b.blocks[0]!.pieces).toBe(a.blocks[0]!.pieces);expect(b.blocks[2]!.pieces).toBe(a.blocks[2]!.pieces);expect(b.blocks[1]!.pieces).not.toBe(a.blocks[1]!.pieces);
  world.tiles[4*world.width+4]!.floor='steel-tile';const c=pieces.read(items,false,world);layer.update(items,false,world);expectLiteral(layer,items,world);
  expect(c.blocks[0]!.pieces).not.toBe(b.blocks[0]!.pieces);expect(c.blocks[1]!.pieces).toBe(b.blocks[1]!.pieces);expect(c.blocks[2]!.pieces).toBe(b.blocks[2]!.pieces);
  items.reverse();layer.update(items,false,world);expectLiteral(layer,items,world);
  items.splice(1,1);layer.update(items,false,world);expectLiteral(layer,items,world);
 }finally{layer.dispose();}
});

test('dirty filth uploads only its stable block and keeps all outstanding ranges until a draw',()=>{
 const world=surface(),items=[item(1,4,4),item(2,12,12),item(3,24,24)],layer=new FilthLayer();
 try{
  layer.update(items,false,world);for(const name of names)attribute(layer,name).clearUpdateRanges();
  const attrs=names.map(name=>attribute(layer,name)),versions=attrs.map(a=>a.version);
  items[1]!.grownCore++;layer.update(items,false,world);expect(attrs.map(a=>a.version)).toEqual(versions);
  items[1]!.kind='vomit';layer.update(items,false,world);
  for(const a of attrs)expect(a.updateRanges).toEqual([{start:8,count:8}]);
  items[2]!.kind='dirt';layer.update(items,false,world);
  for(const a of attrs)expect(a.updateRanges).toEqual([{start:8,count:16}]);
  expectLiteral(layer,items,world);
  world.tiles[30*world.width+30]!.floor='steel-tile';const stable=attrs.map(a=>a.version);layer.update(items,false,world);expect(attrs.map(a=>a.version)).toEqual(stable);
 }finally{layer.dispose();}
});

test('capacity growth, clipping, mutable dimensions and standalone support preserve literal fields and compilation restoration',()=>{
 const world=surface(),items=[item(1,4,4)],layer=new FilthLayer();
 try{
  layer.update([],false,world);const restore=layer.prepareForCompile();
  for(let i=2;i<25;i++)items.push(item(i,2+i,12));
  layer.update(items,false,world);restore();expectLiteral(layer,items,world);expect(layer.mesh.visible).toBe(true);
  for(const tile of world.tiles)tile.floor='marble-tile';items[0]!.kind='ash';items[0]!.thickness=4;layer.update(items,false,world);expectLiteral(layer,items,world);
  world.width=16;world.height=16;world.tiles=world.tiles.slice(0,256);layer.update(items,false,world);expectLiteral(layer,items,world);
  layer.update(items);expectLiteral(layer,items);
  layer.update(items,true,world);expectLiteral(layer,items,world);
  layer.update([],false,world);expect(layer.mesh.geometry.instanceCount).toBe(0);expect(layer.mesh.visible).toBe(false);
 }finally{layer.dispose();}
});
