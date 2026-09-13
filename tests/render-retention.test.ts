import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { BoxBatches } from '../src/render/BoxBatches';
import { ResourceLayer } from '../src/render/ResourceLayer';
import { createWorld } from '../src/sim/index';

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
      const expected=data.ranges.filter(r=>alive.includes(r.id)).flatMap(r=>indices[i]!.slice(r.start,r.start+r.count));
      const count=Number.isFinite(mesh.geometry.drawRange.count)?mesh.geometry.drawRange.count:mesh.geometry.index!.count;
      expect(Array.from(mesh.geometry.index!.array).slice(0,count)).toEqual(expected);
    });
  }
  layer.setFoliageVisible(false); expect(meshes.filter(m=>m.name==='tree-canopy').every(m=>!m.visible)).toBe(true);
  world.resources=[...saved,{id:5,kind:'tree',x:13,z:15,amount:12}]; layer.update(world,false);
  expect(group.children[1]).toBe(chunks[1]); expect(disposed).toBe(2); // only changed chunk rebuilt
  layer.clear(); mat.dispose(); expect(group.children).toEqual([]);

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
});
