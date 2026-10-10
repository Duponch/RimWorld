import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items';
import {ITEM_SHAPES,createItemGeometry} from '../src/render/item-geometry';
import {ITEM_VISUAL_IDS,itemGeometry,itemCargoKind} from '../src/render/item-presentation';
import {itemPortraitSvg,itemPortraitDataUrl,placementsPortraitSvg,geometryPortraitSvg,placementGeometry} from '../src/render/item-portrait';
import {pileParts} from '../src/render/pile-parts';
import {cargoGeometry,selectCargoGeometryKinds} from '../src/render/pawn-geometry';
import {chunkParts} from '../src/render/chunk-presentation';
import {BoxMesh} from '../src/render/BoxMesh';
import {BoxBatches} from '../src/render/BoxBatches';
import {ItemMeshAtlas} from '../src/render/item-mesh-atlas';
import {PawnLayer} from '../src/render/PawnLayer';
import {createWorld} from '../src/sim/engine';

test('every supported object has bounded physical parts; real corpse rigs remain separate',()=>{
  for(const item of Object.keys(ITEM_DEFINITIONS) as ItemId[]){
    const parts=itemGeometry(item);
    if(item.endsWith('-corpse')){expect(parts).toEqual([]);continue;}
    expect(parts.length,item).toBeGreaterThan(0);expect(parts.length,item).toBeLessThanOrEqual(16);
    for(const p of parts){expect([p.x,p.y,p.z,p.sx,p.sy,p.sz].every(Number.isFinite),item).toBe(true);expect(p.sy,item).toBeGreaterThan(0);}
  }
  expect(new Set(ITEM_VISUAL_IDS.map(itemCargoKind)).size).toBe(ITEM_VISUAL_IDS.length);
  expect(ITEM_VISUAL_IDS.every(id=>itemCargoKind(id)>=200)).toBe(true);
});

test('resident meshes supply normals and UVs within a fixed polygon budget',()=>{
  for(const shape of ITEM_SHAPES){
    const geometry=createItemGeometry(shape),positions=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
    expect(normal.count,shape).toBe(positions.count);expect(uv.count,shape).toBe(positions.count);
    expect((geometry.index?.count??positions.count)/3,shape).toBeLessThanOrEqual(80);
    for(let i=0;i<normal.count;i++)expect(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i)),shape).toBeCloseTo(1,4);
    geometry.dispose();
  }
});

test('pants leave an actual leg gap and shirt sleeves change the mesh outline',()=>{
  const pants=createItemGeometry('item-pants'),position=pants.getAttribute('position');
  const covers=(x:number,z:number)=>{
    for(let i=0;i<position.count;i+=3){
      if(position.getY(i)<0||position.getY(i+1)<0||position.getY(i+2)<0)continue;
      const cross=(a:number,b:number)=> (position.getX(b)-position.getX(a))*(z-position.getZ(a))-(position.getZ(b)-position.getZ(a))*(x-position.getX(a));
      const values=[cross(i,i+1),cross(i+1,i+2),cross(i+2,i)];if(values.every(n=>n>=-1e-7)||values.every(n=>n<=1e-7))return true;
    }return false;
  };
  expect(covers(0,.35)).toBe(false);expect(covers(.23,.35)).toBe(true);pants.dispose();
  const shirt=createItemGeometry('item-shirt'),vest=createItemGeometry('item-vest');
  expect(Array.from(shirt.getAttribute('position').array)).not.toEqual(Array.from(vest.getAttribute('position').array));shirt.dispose();vest.dispose();
});

test('wood is three natural logs, raw steel is irregular and quantities stay bounded',()=>{
  const wood=itemGeometry('wood');expect(wood.filter(p=>p.shape==='item-log'&&(p.sx??0)>.1)).toHaveLength(3);
  expect(itemGeometry('steel').every(p=>p.shape==='item-nugget')).toBe(true);
  for(const item of ['wood','rice','silver','component'] as const)expect(itemGeometry(item,100000).length).toBe(itemGeometry(item).length);
});

test('food and apparel portraits differ through their projected faces, independent of titles',()=>{
  const body=(item:ItemId)=>itemPortraitSvg(item).replace(/<title>.*?<\/title>/,'');
  for(const group of [['berries','rice','corn','potato','milk','agave-fruit'],['snow-hare-meat','red-fox-meat'],['simple-meal','fine-meal','vegetarian-fine-meal','carnivore-fine-meal','lavish-meal','nutrient-paste-meal','survival-meal'],['cloth-shirt','cloth-pants','cloth-duster','cloth-parka','cloth-tribalwear']] as const)
    expect(new Set(group.map(body)).size).toBe(group.length);
  expect(itemPortraitDataUrl('wood')).toBe(itemPortraitDataUrl('wood'));expect(itemPortraitDataUrl('wood')).toContain('data:image/svg+xml');
  expect(itemPortraitSvg('wood')).toBe(placementsPortraitSvg(itemGeometry('wood'),'wood'));
});

test('asymmetric authored geometry remains inside instance bounds after nonuniform transform and growth',()=>{
  const source=new THREE.BoxGeometry(1,1,1).translate(4,.2,-.4),material=new THREE.MeshBasicMaterial(),mesh=new BoxMesh(source,material,1);
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(3,5,-2),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.7),new THREE.Vector3(2,.6,1.3));
  for(const capacity of [1,8]){
    if(capacity>1)mesh.allocate(source,capacity);
    mesh.setMatrixAt(0,matrix);mesh.activeCount=1;mesh.computeBoundingSphere();
    const position=source.getAttribute('position'),point=new THREE.Vector3();
    for(let i=0;i<position.count;i++)expect(point.fromBufferAttribute(position,i).applyMatrix4(matrix).distanceTo(mesh.boundingSphere.center)).toBeLessThanOrEqual(mesh.boundingSphere.radius+1e-6);
  }
  mesh.dispose();source.dispose();material.dispose();
});

test('generic portraits retain actual vertex colors and rotate the supplied mesh',()=>{
  const geometry=new THREE.BoxGeometry(1,1,1),colors=new Float32Array(geometry.getAttribute('position').count*3);for(let i=0;i<colors.length;i+=3)colors[i]=1;
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const entry={geometry,placement:{x:0,y:0,z:0,sx:2,sy:1,sz:.4}};
  const svg=geometryPortraitSvg([entry]);expect(svg).toMatch(/fill="#[0-9a-f]{2}0000"/);
  expect(geometryPortraitSvg([{...entry,placement:{...entry.placement,rz:.4}}])).not.toBe(svg);geometry.dispose();
});

test('ground placement preserves supplied offsets, furniture surfaces and target ownership',()=>{
  const base=itemGeometry('cloth-shirt'),parts=pileParts([{x:3,z:5,kind:'apparel',item:'cloth-shirt',quantity:1,supplied:false,targetId:77,surface:{x:.1,z:-.2,y:.7,scale:.8}}]);
  expect(parts).toHaveLength(base.length);expect(parts[0]!.x).toBeCloseTo(3+base[0]!.x*.8+.1);expect(parts[0]!.y).toBeCloseTo(base[0]!.y+.7);expect(parts.every(p=>p.targetId===77)).toBe(true);
  const supplied=pileParts([{x:3,z:5,kind:'wood',item:'wood',quantity:75,supplied:true}]);expect(supplied[0]!.x).toBeCloseTo(3-.12+itemGeometry('wood')[0]!.x);
  const chunks=pileParts([{x:3,z:5,kind:'chunk',item:'granite-chunk',quantity:1,supplied:false}]);expect(chunks.map(p=>p.key)).toEqual(chunkParts(3,5,'granite-chunk').map(p=>p.key));
});

test('cargo uses the same meshes and all supported item kinds in resident geometry',()=>{
  const geometry=cargoGeometry(),kind=geometry.getAttribute('cargoKind'),position=geometry.getAttribute('position');
  const kinds=new Set<number>();for(let i=0;i<kind.count;i++)kinds.add(kind.getX(i));
  expect(kinds.has(4)).toBe(true);for(const item of ITEM_VISUAL_IDS)expect(kinds.has(itemCargoKind(item)),item).toBe(true);
  expect(position.count).toBeLessThan(90000);expect(geometry.getAttribute('color').count).toBe(position.count);
  const source=placementGeometry(itemGeometry('wood')[0]!);expect(source.getAttribute('position').count).toBeGreaterThan(0);geometry.dispose();
});

test('cargo ranges submit only selected models without rewriting vertices; cloned growth keeps ranges',()=>{
  const geometry=cargoGeometry(),position=geometry.getAttribute('position'),kind=geometry.getAttribute('cargoKind'),data=Array.from(position.array),selected=new Set([4,itemCargoKind('wood'),itemCargoKind('rice')]);
  selectCargoGeometryKinds(geometry,selected);
  expect(geometry.groups).toHaveLength(3);expect(geometry.groups.reduce((sum,group)=>sum+group.count,0)).toBeLessThan(position.count/4);
  for(const group of geometry.groups)for(let i=group.start;i<group.start+group.count;i++)expect(selected.has(kind.getX(i))).toBe(true);
  const groups=[...geometry.groups];selectCargoGeometryKinds(geometry,new Set([...selected].reverse()));expect(geometry.groups).toEqual(groups);expect(geometry.groups[0]).toBe(groups[0]);
  const clone=geometry.clone() as THREE.InstancedBufferGeometry;selectCargoGeometryKinds(clone,new Set([itemCargoKind('steel')]));expect(clone.groups).toHaveLength(1);
  for(let i=clone.groups[0]!.start;i<clone.groups[0]!.start+clone.groups[0]!.count;i++)expect(clone.getAttribute('cargoKind').getX(i)).toBe(itemCargoKind('steel'));
  // Three clones share userData. Changing the clone selection must not make
  // the source skip a subsequent request for that same kind.
  selectCargoGeometryKinds(geometry,new Set([itemCargoKind('steel')]));expect(geometry.groups).toHaveLength(1);expect(kind.getX(geometry.groups[0]!.start)).toBe(itemCargoKind('steel'));
  selectCargoGeometryKinds(geometry,new Set([0,-1,27]));expect(geometry.groups).toEqual([]);expect(Array.from(position.array)).toEqual(data);
  geometry.dispose();clone.dispose();
});

test('native cargo group selection keeps actor order and shared trajectories; ordinary clocks keep groups resident',()=>{
  const world=createWorld(42,32),first=world.pawns[0]!,second=world.pawns[1]!;world.piles=[
    {id:world.nextId++,item:'wood',kind:'wood',quantity:10,owner:{type:'pawn',pawnId:first.id}},
    {id:world.nextId++,item:'rice',kind:'food',quantity:10,owner:{type:'pawn',pawnId:second.id}},
  ];
  const original=JSON.stringify(world),layer=new PawnLayer();layer.update(world,1,true);
  const main=layer.group.children.find(object=>object.name==='Carried materials — shared GPU pawn poses') as THREE.Mesh;
  const actor=layer.group.children.find(object=>object instanceof THREE.Mesh&&object.geometry.hasAttribute('aEquipment')) as THREE.Mesh;
  const geometry=main.geometry as THREE.InstancedBufferGeometry,cargo=geometry.getAttribute('aCargo');
  expect(Array.isArray(main.material)).toBe(true);expect((main.material as THREE.Material[])).toHaveLength(1);expect(geometry.instanceCount).toBe(world.pawns.length);expect(geometry.groups).toHaveLength(2);
  expect(cargo.getX(0)).toBe(itemCargoKind('wood'));expect(cargo.getX(1)).toBe(itemCargoKind('rice'));expect(geometry.getAttribute('aFrom')).toBe(actor.geometry.getAttribute('aFrom'));
  const groups=[...geometry.groups];layer.presentCargo(world.tick+.2,world);expect(geometry.groups[0]).toBe(groups[0]);expect(geometry.groups[1]).toBe(groups[1]);expect(JSON.stringify(world)).toBe(original);
  world.piles=[];layer.update(world,1,false);expect(geometry.groups).toEqual([]);expect(geometry.instanceCount).toBe(world.pawns.length);layer.dispose();
});

test('primitive atlas preserves every authored face, normal and UV; padding is finite and degenerate',()=>{
  const atlas=new ItemMeshAtlas(),values=atlas.data.array;
  expect(atlas.shapes).toHaveLength(12);expect(atlas.verticesPerSlot).toBeLessThanOrEqual(240);
  expect(atlas.verticesPerSlot%3).toBe(0);
  for(const [slot,shape] of atlas.shapes.entries()){
    const source=shape?createItemGeometry(shape):new THREE.BoxGeometry(1,1,1),position=source.getAttribute('position'),normal=source.getAttribute('normal'),uv=source.getAttribute('uv');
    const count=source.index?.count??position.count;expect(atlas.vertexCounts[slot]).toBe(count);
    for(let i=0;i<atlas.verticesPerSlot;i++){
      const offset=(slot*atlas.verticesPerSlot+i)*8,data=Array.from(values.slice(offset,offset+8));
      expect(data.every(Number.isFinite)).toBe(true);
      if(i>=count){expect(data).toEqual([0,0,0,0,0,1,0,0]);continue;}
      const index=source.index?source.index.getX(i):i;
      expect(data).toEqual([position.getX(index),position.getY(index),position.getZ(index),uv.getX(index),normal.getX(index),normal.getY(index),normal.getZ(index),uv.getY(index)]);
      expect(Math.hypot(data[0]!,data[1]!,data[2]!)).toBeLessThanOrEqual(atlas.geometry.boundingSphere!.radius+1e-7);
    }
    source.dispose();
  }
  atlas.dispose();
});

test('small pile primitives share one retained batch and preserve per-shape texture phases and tint ownership',()=>{
  const batches=new BoxBatches(),group=new THREE.Group(),parts=[
    {x:1,y:.3,z:2,shape:'item-log' as const,color:0x795130,targetId:21},
    {x:2,y:.3,z:2,shape:'item-nugget' as const,color:0x6297bc,targetId:22},
    {x:3,y:.3,z:2,color:0x795130,targetId:21},
    {x:4,y:.3,z:2,shape:'item-log' as const,color:0x795130,targetId:21},
  ];
  batches.set(group,'pile:test',parts);
  const mesh=group.children.find(child=>child.name==='pile:test') as BoxMesh;
  expect(group.children.filter(child=>(child as BoxMesh).activeCount>0)).toEqual([mesh]);
  const slots=mesh.geometry.getAttribute('itemShape'),phases=mesh.geometry.getAttribute('itemPatternIndex');
  expect(slots.getX(0)).toBe(slots.getX(3));expect(slots.getX(1)).not.toBe(slots.getX(0));expect(slots.getX(2)).toBe(0);
  expect(Array.from({length:4},(_,i)=>phases.getX(i))).toEqual([0,0,0,1]);
  const originalColors=Array.from(mesh.colorBuffer.array),geometry=mesh.geometry,shapeBuffer=mesh.itemShapeBuffer;
  batches.setTargetPreview(group,new Set([21]));expect(Array.from(mesh.colorBuffer.array)).not.toEqual(originalColors);
  batches.clearTargetPreview(group);expect(Array.from(mesh.colorBuffer.array)).toEqual(originalColors);
  const textured=mesh.material;batches.setTexturesEnabled(false);expect(mesh.material).not.toBe(textured);
  batches.setTexturesEnabled(true);expect(mesh.material).toBe(textured);
  batches.set(group,'pile:test',[]);expect(mesh.visible).toBe(false);expect(mesh.geometry).toBe(geometry);expect(mesh.itemShapeBuffer).toBe(shapeBuffer);
  batches.set(group,'pile:test',Array.from({length:257},(_,i)=>({...parts[i%4]!,x:i})));
  expect(group.children.find(child=>child.name==='pile:test')).toBe(mesh);expect(mesh.geometry).not.toBe(geometry);expect(mesh.instanceMatrix.count).toBe(512);
  expect(mesh.itemShapeBuffer!.count).toBe(512);expect(mesh.activeCount).toBe(257);
  expect(mesh.geometry.drawRange).toEqual({start:0,count:96});
  expect(mesh.geometry.getAttribute('itemPatternIndex').getX(3)).toBe(1);
  batches.clear();expect(group.children).toHaveLength(0);batches.dispose();
});

test('small and complex ranges retain every real vertex and share the same material and atlas',()=>{
  const atlas=new ItemMeshAtlas();
  for(const shape of atlas.shapes){const count=atlas.vertexCounts[atlas.slot(shape)]!,geometry=atlas.isSmall(shape)?atlas.smallGeometry:atlas.geometry;expect(geometry.drawRange.count).toBeGreaterThanOrEqual(count);}
  expect(atlas.smallGeometry.getAttribute('position').count).toBe(atlas.verticesPerSlot);
  const batches=new BoxBatches(),group=new THREE.Group();
  batches.set(group,'pile:ranges',[{x:0,y:0,z:0,shape:'item-log',targetId:11},{x:1,y:0,z:0,shape:'item-coat',targetId:12}]);
  const meshes=group.children.filter(child=>(child as BoxMesh).activeCount>0) as BoxMesh[];
  expect(meshes).toHaveLength(2);expect(meshes[0]!.material).toBe(meshes[1]!.material);
  expect(meshes.map(mesh=>mesh.geometry.drawRange.count)).toEqual([96,Infinity]);
  const colors=meshes.map(mesh=>Array.from(mesh.colorBuffer.array));batches.setTargetPreview(group,new Set([11,12]));
  meshes.forEach((mesh,i)=>expect(Array.from(mesh.colorBuffer.array)).not.toEqual(colors[i]));
  batches.clearTargetPreview(group);meshes.forEach((mesh,i)=>expect(Array.from(mesh.colorBuffer.array)).toEqual(colors[i]));
  batches.set(group,'pile:ranges',[]);expect(meshes.every(mesh=>mesh.activeCount===0)).toBe(true);
  batches.dispose();atlas.dispose();
});

test('rock contours stay separate and ordinary decorative boxes keep their historical geometry',()=>{
  const batches=new BoxBatches(),group=new THREE.Group();
  batches.set(group,'pile:rocks',[...pileParts([{x:3,z:5,kind:'chunk',item:'granite-chunk',quantity:1,supplied:false}]),...itemGeometry('wood')]);
  const meshes=group.children.filter(child=>(child as BoxMesh).activeCount>0) as BoxMesh[];
  expect(meshes.filter(mesh=>mesh.itemShapeBuffer)).toHaveLength(1);
  expect(meshes.some(mesh=>mesh.geometry.hasAttribute('chunkContour')&&!mesh.itemShapeBuffer)).toBe(true);
  batches.set(group,'decor',[{x:0,y:0,z:0}]);
  const decor=group.children.find(child=>child.name==='decor') as BoxMesh;
  expect(decor.itemShapeBuffer).toBeUndefined();expect(decor.geometry.index!.count).toBe(36);
  const atlas=meshes.find(mesh=>mesh.itemShapeBuffer)!;batches.set(group,'pile:rocks',[]);
  expect(atlas.activeCount).toBe(0);expect(meshes.every(mesh=>mesh.activeCount===0)).toBe(true);
  batches.dispose();expect(group.children).toHaveLength(0);
});
