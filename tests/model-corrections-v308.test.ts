import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {createWorld} from '../src/sim';
import {footprintCells} from '../src/sim/definitions';
import type {Structure,World} from '../src/sim/types';
import {habitatParts,habitatPartsForStructure} from '../src/render/habitat-parts';
import {doorParts,doorLeafParts} from '../src/render/door-parts';
import {timberCladdingParts} from '../src/render/TimberCladdingLayer';
import {penParts} from '../src/render/pen-parts';
import {animalParts,animalCoreProfile} from '../src/render/animal-shape';
import {createSandbagGeometry,sandbagParts,SANDBAG_HEIGHT} from '../src/render/sandbag-parts';
import {BoxBatches} from '../src/render/BoxBatches';
import {BoxMesh} from '../src/render/BoxMesh';
import {buildFurniture} from '../src/render/FurnitureLayer';
import {ConstructionPreviewLayer} from '../src/render/ConstructionPreviewLayer';
import {constructionPreviewParts,collectConstructionPreviewParts} from '../src/render/construction-preview-parts';

function camp():World {
  const world=createWorld(308,24,24);world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.structures=[];world.resources=[];world.packed=[];return world;
}
function structure(kind:Structure['kind'],id=1,x=10,z=10,material:Structure['material']='wood'):Structure {
  return {id,kind,x,z,orientation:0,footprint:'standard',material};
}

test('dresser drawers and handles face the long side in all four saved rotations and both shared authors',()=>{
  const world=camp();
  for(const orientation of [0,1,2,3] as const){
    const dresser={...structure('dresser'),orientation};world.structures=[dresser];
    const before=JSON.stringify(world),parts=habitatParts(world),cells=footprintCells(dresser);
    expect(parts).toEqual(habitatPartsForStructure(dresser));
    const centre={x:(Math.min(...cells.map(c=>c.x))+Math.max(...cells.map(c=>c.x)))/2,
      z:(Math.min(...cells.map(c=>c.z))+Math.max(...cells.map(c=>c.z)))/2};
    const cosine=Math.cos(orientation*Math.PI/2),sine=Math.sin(orientation*Math.PI/2);
    const local=(p:{x:number;z:number})=>({x:(p.x-centre.x)*cosine-(p.z-centre.z)*sine,z:(p.x-centre.x)*sine+(p.z-centre.z)*cosine});
    const drawers=parts.filter(p=>p.sy===.025),handles=parts.filter(p=>p.color===0xc4b794);
    expect(drawers).toHaveLength(3);expect(handles).toHaveLength(6);
    for(const drawer of drawers){expect(local(drawer).x).toBeGreaterThan(.43);expect(local(drawer).z).toBeCloseTo(0);expect(drawer.sz).toBeGreaterThan(1.5);expect(drawer.sx).toBeLessThan(.1);}
    for(const handle of handles){expect(local(handle).x).toBeGreaterThan(.45);expect(Math.abs(local(handle).z)).toBeGreaterThan(.3);}
    expect(JSON.stringify(world)).toBe(before);
  }
});

test('cutaway leaves a clear doorway in both axes and materials, including timber cladding and virtual construction',()=>{
  for(const kind of ['door','autodoor'] as const)for(const axis of [0,1] as const)for(const material of ['wood','steel','granite-blocks'] as const){
    const world=camp(),door=structure(kind,1,10,10,material);
    world.structures=[door,...[-1,1].map((side,index)=>structure('wall',2+index,10+(axis===0?side:0),10+(axis===1?side:0),material))];
    const before=JSON.stringify(world),cut=doorParts(world,true,[door]);
    expect(cut).toHaveLength(material==='wood'?4:2);
    // The remaining frame contributions are vertical jambs, never a spanning cap.
    for(const part of cut){expect(part.sx).toBeLessThan(.1);expect(part.sy).toBeGreaterThan(part.sx!);}
    const cladding=timberCladdingParts(world,true,[door]);expect(cladding.walls).toEqual([]);expect(cladding.eaves).toEqual([]);
    expect(doorLeafParts(world,true,[door])).toHaveLength(2);
    const preview=constructionPreviewParts(world,[{kind,x:10,z:10,material}],true);
    expect(preview.boxes).toHaveLength(cut.length+2);expect(preview.timberWalls).toEqual([]);expect(preview.timberEaves).toEqual([]);
    expect(JSON.stringify(world)).toBe(before);
  }
});

test('gate cutaway removes only the top crossbar, in finished and ghost models',()=>{
  for(const axis of [0,1] as const){
    const world=camp(),gate=structure('fence-gate');
    world.structures=[gate,...[-1,1].map((side,index)=>structure('fence',2+index,10+(axis===0?side:0),10+(axis===1?side:0)))];
    const frame=penParts(world,[gate],false),cut=penParts(world,[gate],true);
    expect(frame).toHaveLength(3);expect(cut).toEqual(frame.filter(p=>p.y!==1.04));
    expect(constructionPreviewParts(world,[{kind:'fence-gate',x:10,z:10}],true).boxes).toHaveLength(4);
  }
});

test('muffalo and gazelle horns grow ahead of and inside their ears while retaining the shared head rig',()=>{
  for(const species of ['muffalo','gazelle']){
    const parts=animalParts(species),horns=parts.filter(p=>p.color===0xd6c8a5),ears=parts.filter(p=>p.bodyPart?.endsWith('-ear'));
    expect(horns).toHaveLength(2);expect(ears).toHaveLength(2);
    for(const horn of horns){
      const ear=ears.find(p=>Math.sign(p.center[0])===Math.sign(horn.center[0]))!;
      expect(horn.center[2]-horn.size[2]/2).toBeGreaterThan(ear.center[2]+ear.size[2]/2);
      expect(Math.abs(horn.center[0])).toBeLessThan(Math.abs(ear.center[0]));
      expect(horn.bone).toBe(ear.bone);expect(horn.pivot).toEqual(ear.pivot);expect(horn.bodyPart).toBe('head');
      expect(horn.taper![0]).toBeLessThan(horn.taper![1]);
      const skull=animalCoreProfile(species).rings.filter(r=>r.headWeight===1);
      expect(horn.center[1]-horn.size[1]/2).toBeLessThanOrEqual(Math.max(...skull.map(r=>r.top))+.006);
    }
  }
});

test('sandbag geometry has a puffed faceted silhouette, outward unit normals and finite UVs',()=>{
  const geometry=createSandbagGeometry();
  try{
    const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
    expect(position.count).toBeGreaterThan(36);expect(normal.count).toBe(position.count);expect(uv.count).toBe(position.count);
    const crown:number[]=[],waist:number[]=[];
    for(let i=0;i<position.count;i++){
      const p=new THREE.Vector3().fromBufferAttribute(position,i),n=new THREE.Vector3().fromBufferAttribute(normal,i);
      expect(n.length()).toBeCloseTo(1);expect(p.dot(n)).toBeGreaterThan(0);
      expect([p.x,p.y,p.z,uv.getX(i),uv.getY(i)].every(Number.isFinite)).toBe(true);
      if(p.y===.5)crown.push(Math.abs(p.x));if(p.y===0)waist.push(Math.abs(p.x));
    }
    expect(Math.max(...crown)).toBeLessThan(Math.max(...waist));
    expect(geometry.boundingBox!.min.toArray()).toEqual([-.5,-.5,-.5]);expect(geometry.boundingBox!.max.toArray()).toEqual([.5,.5,.5]);
  }finally{geometry.dispose();}
});

test('sandbags form two staggered cloth courses within the cover cell and keep one shared construction author',()=>{
  const world=camp(),bag=structure('sandbags',1,10,10,'cloth');world.structures=[bag];
  const before=JSON.stringify(world),parts=sandbagParts(world),courses=new Map<number,number[]>();
  expect(parts).toHaveLength(5);
  for(const p of parts){
    expect(p.shape).toBe('sandbag');expect(p.targetId).toBe(bag.id);
    expect(p.x-p.sx!/2).toBeGreaterThanOrEqual(9.5);expect(p.x+p.sx!/2).toBeLessThanOrEqual(10.5);
    expect(p.z-p.sz!/2).toBeGreaterThanOrEqual(9.5);expect(p.z+p.sz!/2).toBeLessThanOrEqual(10.5);
    expect(p.y-p.sy!/2).toBeGreaterThanOrEqual(0);expect(p.y+p.sy!/2).toBeLessThanOrEqual(SANDBAG_HEIGHT);
    courses.set(p.y,[...(courses.get(p.y)??[]),p.x]);
  }
  expect(courses.size).toBe(2);const [lower,upper]=[...courses.values()];
  expect(lower).toHaveLength(2);expect(upper).toHaveLength(3);
  expect(upper!.some(x=>x>Math.min(...lower!)&&x<Math.max(...lower!))).toBe(true);
  const preview=collectConstructionPreviewParts(world,[{kind:'sandbags',x:10,z:10,material:'cloth'}]);
  expect(preview).toHaveLength(5);expect(preview.every(p=>p.geometry==='sandbag')).toBe(true);
  expect(preview.map(p=>({x:p.placement.x,y:p.placement.y,z:p.placement.z,sx:p.placement.sx,sy:p.placement.sy,sz:p.placement.sz,color:p.placement.color})))
    .toEqual(parts.map(({x,y,z,sx,sy,sz,color})=>({x,y,z,sx,sy,sz,color})));
  expect(JSON.stringify(world)).toBe(before);
});

test('dedicated sandbag batch stays resident through empty, growth and reload without changing the furniture atlas or patch stamp',()=>{
  const world=camp();world.structures=[structure('sandbags',1,10,10,'cloth'),structure('dresser',2,13,10)];
  const batches=new BoxBatches(),group=new THREE.Group();
  try{
    buildFurniture(world,group,false,batches);
    const furniture=group.children.find(m=>m.name==='furniture') as BoxMesh,bag=group.children.find(m=>m.name==='sandbags') as BoxMesh;
    expect(furniture).toBeDefined();expect(bag.activeCount).toBe(5);expect(furniture.itemShapeBuffer).toBeUndefined();expect(bag.itemShapeBuffer).toBeUndefined();
    expect(bag.geometry.getAttribute('position').count).toBeGreaterThan(furniture.geometry.getAttribute('position').count);
    expect(bag.material).toBe(furniture.material);const stamp=batches.furnitureStamp(),original=bag.geometry;
    batches.set(group,'sandbags',[]);expect(bag.activeCount).toBe(0);expect(bag.geometry).toBe(original);expect(batches.furnitureStamp()).toBe(stamp);
    const many=Array.from({length:60},(_,i)=>structure('sandbags',i+10,i%20,Math.floor(i/20),'cloth'));
    batches.set(group,'sandbags',sandbagParts({...world,structures:many}));expect(bag.activeCount).toBe(300);expect(bag.geometry).not.toBe(original);
    const grown=bag.geometry;batches.set(group,'sandbags',sandbagParts(world));expect(bag.activeCount).toBe(5);expect(bag.geometry).toBe(grown);expect(batches.furnitureStamp()).toBe(stamp);
    const textured=bag.material;batches.setTexturesEnabled(false);expect(bag.material).toBe(furniture.material);expect(bag.material).not.toBe(textured);
    batches.setTexturesEnabled(true);expect(bag.material).toBe(textured);
    batches.clear();expect(group.children).toEqual([]);buildFurniture(world,group,false,batches);expect((group.children.find(m=>m.name==='sandbags') as BoxMesh).activeCount).toBe(5);
  }finally{batches.dispose();}
});

test('construction sandbag mesh retains its faceted allocation, survives compile restoration and clears with other ghosts',()=>{
  const world=camp(),layer=new ConstructionPreviewLayer();
  try{
    layer.update(world,[{kind:'sandbags',x:10,z:10,material:'cloth'}],[],false);
    const boxes=layer.group.children[0] as BoxMesh,bag=layer.group.children[4] as BoxMesh;
    expect(boxes.activeCount).toBe(0);expect(bag.activeCount).toBe(5);
    const geometry=bag.geometry,restore=layer.prepareForCompile();restore();expect(bag.activeCount).toBe(5);
    layer.update(world,[],[{kind:'sandbags',x:12,z:10,material:'cloth'}],false);expect(bag.geometry).toBe(geometry);expect(bag.activeCount).toBe(5);
    layer.hide();expect(layer.group.children.every(m=>!(m as BoxMesh).activeCount)).toBe(true);
  }finally{layer.dispose();}
});
