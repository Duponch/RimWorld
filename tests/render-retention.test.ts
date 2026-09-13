import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { BoxBatches } from '../src/render/BoxBatches';
import { ResourceLayer } from '../src/render/ResourceLayer';
import { OverviewLayer } from '../src/render/OverviewLayer';
import { PawnLayer } from '../src/render/PawnLayer';
import { clearGroup } from '../src/render/primitives';
import { createWorld, addGroundMaterial, applyCommand, stepWorld, serializeWorld, deserializeWorld } from '../src/sim/index';

test('objets graphiques résidents : retrait/restauration, frontière de chunk, croissance et libération', () => {
  const world = createWorld(42,32,32); world.resources = [
    {id:1,kind:'tree',x:15,z:15,amount:12}, {id:2,kind:'tree',x:14,z:15,amount:12},
    {id:3,kind:'berries',x:15,z:14,amount:10}, {id:4,kind:'rock',x:16,z:15,amount:10},
  ];
  const group=new THREE.Group(), mat=new THREE.MeshStandardNodeMaterial(); mat.userData.rendererOwned=true;
  const layer=new ResourceLayer(group,mat); layer.update(world,true);
  const saved=[...world.resources], chunks=[...group.children], meshes:THREE.Mesh[]=[];
  group.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o);});
  const buffers=meshes.map(m=>m.geometry.getAttribute('position')), indices=meshes.map(m=>Array.from(m.geometry.index!.array));
  let disposed=0; for(const mesh of meshes)mesh.geometry.addEventListener('dispose',()=>disposed++);
  for (const alive of [[2,3,4],[3,4],[4],[],[1,2,3,4]]) {
    world.resources=saved.filter(r=>alive.includes(r.id)); layer.update(world,false);
    expect(group.children).toEqual(chunks); expect(disposed).toBe(0);
    meshes.forEach((mesh,i)=>{
      expect(mesh.geometry.getAttribute('position')).toBe(buffers[i]);
      const data=mesh.userData.resourceRanges as {ranges:{id:number;start:number;count:number}[]};
      const expected=data.ranges.filter(r=>alive.includes(Math.abs(r.id))).flatMap(r=>indices[i]!.slice(r.start,r.start+r.count));
      const count=Number.isFinite(mesh.geometry.drawRange.count)?mesh.geometry.drawRange.count:mesh.geometry.index!.count;
      expect(Array.from(mesh.geometry.index!.array).slice(0,count)).toEqual(expected);
    });
  }
  layer.setFoliageVisible(false); expect(meshes.filter(m=>m.name==='tree-canopy').every(m=>!m.visible)).toBe(true);
  world.resources=[...saved,{id:5,kind:'tree',x:13,z:15,amount:12}]; layer.update(world,false);
  expect(group.children[1]).toBe(chunks[1]); expect(disposed).toBe(2); // only changed chunk rebuilt
  layer.clear(); mat.dispose(); expect(group.children).toEqual([]);

  const overview=new OverviewLayer();world.resources=[...saved];overview.update(world,true);
  const vegetation=overview.group.children[1]!,trees=vegetation.children[0] as THREE.InstancedMesh;
  const matrixBuffer=trees.instanceMatrix,treeGeometry=trees.geometry;
  world.resources=saved.filter(r=>r.id!==1);overview.update(world,false);
  expect(trees.instanceMatrix).toBe(matrixBuffer);expect(trees.geometry).toBe(treeGeometry);
  world.resources=saved.map(r=>r.id===1?{...r,x:30,z:30}:r);overview.update(world,false);
  expect(trees.boundingSphere!.containsPoint(new THREE.Vector3(30,3,30))).toBe(true);
  overview.setFoliageVisible(false);expect(treeGeometry.drawRange.count).toBeGreaterThan(0);expect(treeGeometry.drawRange.count).toBeLessThan(treeGeometry.index!.count);
  overview.setFoliageVisible(true);expect(treeGeometry.drawRange.count).toBe(Infinity);
  world.resources=world.resources.map(r=>r.id===1?{...r,kind:'berries' as const}:r);overview.update(world,false);
  expect((vegetation.children[0] as THREE.InstancedMesh).count).toBe(1);expect((vegetation.children[1] as THREE.InstancedMesh).count).toBe(2);
  overview.dispose();

  const boxes=new BoxBatches(), boxGroup=new THREE.Group();
  const items=Array.from({length:700},(_,i)=>({x:i,y:1,z:i%3,sx:1,sy:2,sz:.5,color:0xff0000}));
  boxes.set(boxGroup,'test',items.slice(0,4));
  const mesh=boxGroup.children[0] as THREE.InstancedMesh, original=mesh.instanceMatrix;
  for(const n of [1,0,200,4]){boxes.set(boxGroup,'test',items.slice(0,n));expect(mesh.instanceMatrix).toBe(original);expect(mesh.count).toBe(n);}
  boxes.set(boxGroup,'test',items); expect(boxGroup.children[0]).toBe(mesh);expect(mesh.instanceMatrix.count).toBe(1024);
  const matrix=new THREE.Matrix4();mesh.getMatrixAt(699,matrix);expect(new THREE.Vector3().setFromMatrixPosition(matrix).x).toBe(699);
  expect(mesh.boundingSphere!.containsPoint(new THREE.Vector3(699,1,0))).toBe(true);
  boxes.clear();expect(boxGroup.children).toEqual([]);boxes.set(boxGroup,'test',items.slice(0,2));expect(boxGroup.children[0]).not.toBe(mesh);
  boxes.dispose();expect(boxGroup.children).toEqual([]);
  // A fully picked-up stack no longer exists, but its position still drives
  // both GPU pose endpoints after a save/reload, in all cardinal directions.
  for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]) {
    const w=createWorld(42,16,16);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.pawns=w.pawns.slice(0,1);
    Object.assign(w.pawns[0]!,{x:8,z:8,hunger:100,rest:100});
    const source={x:8+dx!,z:8+dz!};addGroundMaterial(w,'wood',10,source);
    const sourceId=w.piles[0]!.id;applyCommand(w,{type:'stockpile',enabled:true,x:14,z:14,priority:4});stepWorld(w);
    expect(w.piles.some(p=>p.id===sourceId)).toBe(false);expect(w.pawns[0]!.haul?.pickupCell).toEqual(source);
    const restored=deserializeWorld(serializeWorld(w)),actors=new PawnLayer();actors.update(restored,1,true);
    const mesh=actors.group.children[0] as THREE.Mesh;
    for(const attribute of ['aFrom','aTo'])expect(mesh.geometry.getAttribute(attribute).getW(0)).toBeCloseTo(Math.atan2(dx!,dz!),6);
    clearGroup(actors.group);
  }
});
