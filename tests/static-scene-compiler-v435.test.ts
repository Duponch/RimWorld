import{describe,expect,it}from'vitest';
import * as THREE from'three/webgpu';
import{StaticSceneCompiler435}from'../src/render/StaticSceneCompiler435';
import{isSourceOwnedRenderHook435}from'../src/render/SourceOwnedRenderHooks435';

function mesh(x=0,material=new THREE.MeshLambertNodeMaterial()):THREE.Mesh<THREE.BufferGeometry,THREE.MeshLambertNodeMaterial>{
 const geometry=new THREE.BoxGeometry();geometry.translate(x,0,0);geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count*3).fill(.625),3));geometry.computeBoundingSphere();
 const result=new THREE.Mesh(geometry,material);result.castShadow=true;result.receiveShadow=true;result.matrixAutoUpdate=false;return result;
}
function fixture(){const scene=new THREE.Scene(),root=new THREE.Group(),material=new THREE.MeshLambertNodeMaterial(),a=mesh(0,material),b=mesh(10,material);root.add(a,b);scene.add(root);scene.updateMatrixWorld(true);const owner=new StaticSceneCompiler435(scene);return{scene,root,material,a,b,owner};}
function bits(a:THREE.BufferAttribute,vertex:number):number[]{return Array.from(new Uint32Array(a.array.buffer,a.array.byteOffset+vertex*a.itemSize*4,a.itemSize));}
function triangles(mesh:THREE.Mesh):number[][]{
 const g=mesh.geometry,index=g.index!,names=Object.keys(g.attributes).sort(),rows:number[][]=[];
 for(let i=g.drawRange.start;i<Math.min(index.count,g.drawRange.start+g.drawRange.count);i++){const vertex=index.getX(i);rows.push(names.flatMap(name=>bits(g.getAttribute(name) as THREE.BufferAttribute,vertex)));}return rows;
}
function dispose(f:ReturnType<typeof fixture>){f.owner.dispose();for(const object of[f.a,f.b])object.geometry.dispose();f.material.dispose();}

describe('private435 genuine static world geometry pages',()=>{
 it('one real indexed Mesh replaces two draws, retaining material, every corner bit, bounds and source arrays',()=>{
  const f=fixture();try{
   const expected=[...triangles(f.a),...triangles(f.b)],positions=f.a.geometry.getAttribute('position').array.slice(),material=f.material;
   f.owner.reconcile([f.root],[f.material]);const pages=f.owner.meshes();expect(pages).toHaveLength(1);expect(pages[0]).toBeInstanceOf(THREE.Mesh);expect(pages[0]).not.toBeInstanceOf(THREE.BatchedMesh);
   expect(pages[0]!.material).toBe(material);expect(triangles(pages[0]!)).toEqual(expected);expect(f.a.geometry.getAttribute('position').array).toEqual(positions);expect(f.a.layers.mask).toBe(0);expect(f.b.layers.mask).toBe(0);
   for(const source of[f.a,f.b])expect(pages[0]!.geometry.boundingSphere!.containsPoint(source.geometry.boundingSphere!.center)).toBe(true);
   expect(f.owner.snapshot().sourceActiveTriangles).toBe(24);expect(f.owner.snapshot().compiledActiveTriangles).toBe(24);
  }finally{dispose(f);}
 });
 it('shared global rock attribute owners compact active referenced vertices once, without duplicating global tails per view',()=>{
  const f=fixture();try{
   const position=new THREE.Float32BufferAttribute(new Float32Array(30000),3),normal=new THREE.Float32BufferAttribute(new Float32Array(30000).fill(1),3),color=new THREE.Float32BufferAttribute(new Float32Array(30000).fill(.5),3);
   for(const[source,indices]of[[f.a,[9000,9001,9002]],[f.b,[9002,9003,9000]]]as const){const g=new THREE.BufferGeometry();g.setAttribute('position',position);g.setAttribute('normal',normal);g.setAttribute('color',color);g.setIndex([...indices]);g.computeBoundingSphere();source.geometry.dispose();source.geometry=g;}
   f.owner.reconcile([f.root],[f.material]);const page=f.owner.meshes()[0]!,snapshot=f.owner.snapshot().pages[0]!;expect(snapshot.uniqueAttributeBlocks).toBe(1);expect(snapshot.vertices).toBe(4);expect(snapshot.vertexCapacity).toBe(4);expect(snapshot.sourceAttributeVertices).toBe(20000);expect(page.geometry.index!.count).toBe(8);expect(page.geometry.drawRange.count).toBe(6);expect(triangles(page)).toEqual([...triangles(f.a),...triangles(f.b)]);
   const before=f.owner.snapshot();position.setXYZ(9001,-0,.25,.75);position.needsUpdate=true;f.owner.patchAttribute(position,9001*3,3);
   expect(f.owner.snapshot().patchVertexVisits-before.patchVertexVisits).toBe(1);expect(f.owner.snapshot().copiedBytes-before.copiedBytes).toBe(12);expect(triangles(page)).toEqual([...triangles(f.a),...triangles(f.b)]);
   const used=f.owner.snapshot();position.setXYZ(123,7,8,9);position.needsUpdate=true;f.owner.patchAttribute(position,123*3,3);
   expect(f.owner.snapshot().patchVertexVisits-used.patchVertexVisits).toBe(1);expect(f.owner.snapshot().copiedBytes).toBe(used.copiedBytes);expect(triangles(page)).toEqual([...triangles(f.a),...triangles(f.b)]);
  }finally{dispose(f);}
 });
 it('unchanged adoption and100camera/visibility changes keep Mesh/geometry/buffers and copy counters stable',()=>{
  const f=fixture();try{
   f.owner.reconcile([f.root],[f.material]);const page=f.owner.meshes()[0]!,geometry=page.geometry,buffer=geometry.getAttribute('position'),before=f.owner.snapshot();
   for(let frame=0;frame<100;frame++){f.root.visible=!!(frame%2);f.owner.syncVisibility();}f.root.visible=true;f.owner.reconcile([f.root],[f.material]);
   expect(f.owner.meshes()[0]).toBe(page);expect(page.geometry).toBe(geometry);expect(page.geometry.getAttribute('position')).toBe(buffer);expect(f.owner.snapshot().rebuilds).toBe(before.rebuilds);expect(f.owner.snapshot().copiedBytes).toBe(before.copiedBytes);
  }finally{dispose(f);}
 });
 it('producer position/color range patches change exact corners without rebuilding; pending uploads coalesce',()=>{
  const f=fixture();try{
   f.owner.reconcile([f.root],[f.material]);const page=f.owner.meshes()[0]!,geometry=page.geometry,stamp=f.owner.snapshot().rebuilds;
   const position=f.a.geometry.getAttribute('position') as THREE.BufferAttribute,color=f.b.geometry.getAttribute('color') as THREE.BufferAttribute;
   position.setXYZ(0,-0,.25,.75);position.needsUpdate=true;f.owner.patchAttribute(position,0,3);color.setXYZ(2,.125,.25,.875);color.needsUpdate=true;f.owner.patchAttribute(color,6,3);
   expect(triangles(page)).toEqual([...triangles(f.a),...triangles(f.b)]);expect(page.geometry).toBe(geometry);expect(f.owner.snapshot().rebuilds).toBe(stamp);
   for(let i=0;i<10;i++){position.setY(1,i);position.needsUpdate=true;f.owner.patchAttribute(position,3,3);}expect((geometry.getAttribute('position') as THREE.BufferAttribute).updateRanges).toHaveLength(1);
   const bytes=f.owner.snapshot().copiedBytes;f.owner.reconcile([f.root],[f.material]);expect(f.owner.snapshot().copiedBytes).toBeGreaterThan(bytes);
   const adoptedBytes=f.owner.snapshot().copiedBytes;f.owner.reconcile([f.root],[f.material]);expect(f.owner.snapshot().copiedBytes).toBe(adoptedBytes);
  }finally{dispose(f);}
 });
 it('a notified partial write cannot acknowledge an earlier unnotified range of the same attribute',()=>{
  const f=fixture();try{
   f.owner.reconcile([f.root],[f.material]);const page=f.owner.meshes()[0]!,geometry=page.geometry,rebuilds=f.owner.snapshot().rebuilds;
   const position=f.a.geometry.getAttribute('position') as THREE.BufferAttribute;
   // resizeResources: a real range/version write, but no compiler callback.
   position.setXYZ(0,-0,.375,.625);position.addUpdateRange(0,3);position.needsUpdate=true;
   // poseTree: another region and version, with a synchronous partial callback.
   position.setXYZ(2,.875,-0,.125);position.addUpdateRange(6,3);position.needsUpdate=true;
   const before=f.owner.snapshot();f.owner.patchAttribute(position,6,3);
   expect(f.owner.snapshot().patchVertexVisits-before.patchVertexVisits).toBe(1);expect(f.owner.snapshot().copiedBytes-before.copiedBytes).toBe(12);
   expect(triangles(page)).not.toEqual([...triangles(f.a),...triangles(f.b)]);
   f.owner.reconcile([f.root],[f.material]);expect(triangles(page)).toEqual([...triangles(f.a),...triangles(f.b)]);expect(page.geometry).toBe(geometry);expect(f.owner.snapshot().rebuilds).toBe(rebuilds);
   const adopted=f.owner.snapshot();f.owner.reconcile([f.root],[f.material]);expect(f.owner.snapshot().copiedBytes).toBe(adopted.copiedBytes);expect(f.owner.snapshot().patchVertexVisits).toBe(adopted.patchVertexVisits);
  }finally{dispose(f);}
 });
 it('index removals/restore and a same-size source replacement retain page buffers and touch only the changed block',()=>{
  const f=fixture();try{
   f.owner.reconcile([f.root],[f.material]);const page=f.owner.meshes()[0]!,geometry=page.geometry;let disposals=0;geometry.addEventListener('dispose',()=>disposals++);
   f.a.geometry.setDrawRange(0,3);f.owner.reconcile([f.root],[f.material]);expect(page.geometry).toBe(geometry);expect(triangles(page)).toEqual([...triangles(f.a),...triangles(f.b)]);
   f.a.geometry.setDrawRange(0,Infinity);f.owner.reconcile([f.root],[f.material]);expect(page.geometry).toBe(geometry);
   const replacement=new THREE.BoxGeometry(2,2,2);replacement.translate(4,0,0);replacement.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(replacement.getAttribute('position').count*3).fill(.4),3));replacement.computeBoundingSphere();f.a.geometry.dispose();f.a.geometry=replacement;
   const before=f.owner.snapshot();f.owner.reconcile([f.root],[f.material]);expect(f.owner.meshes()[0]).toBe(page);expect(page.geometry).toBe(geometry);expect(disposals).toBe(0);expect(triangles(page)).toEqual([...triangles(f.a),...triangles(f.b)]);
   const sourceBytes=Object.values(replacement.attributes).reduce((n,a)=>n+a.array.byteLength,0),indexBytes=(f.a.geometry.drawRange.count===Infinity?f.a.geometry.index!.count:f.a.geometry.drawRange.count)+f.b.geometry.index!.count;
   expect(f.owner.snapshot().copiedBytes-before.copiedBytes).toBe(sourceBytes+indexBytes*4);expect(f.owner.snapshot().rebuilds).toBe(before.rebuilds);expect(f.owner.snapshot().indexSourceRemaps-before.indexSourceRemaps).toBe(1);
  }finally{dispose(f);}
 });
 it('preserves cast/receive/order/material/layout boundaries; unknown programs and transforms fall back; max8pages enforced',()=>{
  const f=fixture(),extra:THREE.Mesh[]=[];try{
   f.b.castShadow=false;f.owner.reconcile([f.root],[f.material]);expect(f.owner.meshes()).toHaveLength(0);expect(f.a.layers.mask).toBe(1);f.b.castShadow=true;
   const unknown=mesh(2,new THREE.MeshLambertNodeMaterial());extra.push(unknown);f.root.add(unknown);f.owner.reconcile([f.root],[f.material]);expect(f.owner.snapshot().rejected['unowned-material-program']).toBe(1);expect(unknown.layers.mask).toBe(1);
   f.a.position.x=1;f.a.updateMatrix();f.a.updateMatrixWorld();f.owner.reconcile([f.root],[f.material]);expect(f.owner.meshes()).toHaveLength(0);expect(f.a.layers.mask).toBe(1);
   f.a.position.x=0;f.a.updateMatrix();f.a.updateMatrixWorld();const mats:THREE.NodeMaterial[]=[f.material];for(let i=0;i<10;i++){const mat=new THREE.MeshLambertNodeMaterial();mats.push(mat);const a=mesh(i,mat),b=mesh(i+1,mat);extra.push(a,b);f.root.add(a,b);}f.owner.reconcile([f.root],mats);expect(f.owner.meshes()).toHaveLength(8);
  }finally{dispose(f);for(const mesh of extra){mesh.geometry.dispose();if(!Array.isArray(mesh.material))mesh.material.dispose();}}
 });
 it('only freshly produced page hooks are owned; discovered source callbacks stay unsupported',()=>{
  const f=fixture();try{
   f.owner.reconcile([f.root],[f.material]);const page=f.owner.meshes()[0]!;
   expect(isSourceOwnedRenderHook435(page.onBeforeRender)).toBe(true);expect(isSourceOwnedRenderHook435(THREE.Object3D.prototype.onBeforeRender)).toBe(false);
   const foreign=()=>{};f.a.onBeforeRender=foreign;expect(isSourceOwnedRenderHook435(foreign)).toBe(false);
   f.owner.reconcile([f.root],[f.material]);expect(f.owner.meshes()).toHaveLength(0);expect(f.owner.snapshot().rejected['custom-callback']).toBe(1);expect(isSourceOwnedRenderHook435(foreign)).toBe(false);expect(f.a.layers.mask).toBe(1);
  }finally{dispose(f);}
 });
 it('producer clearing does not dispose external pages; clear/dispose restores original source layer ownership',()=>{
  const f=fixture();try{
   f.owner.reconcile([f.root],[f.material]);const page=f.owner.meshes()[0]!;let disposed=0;page.geometry.addEventListener('dispose',()=>disposed++);expect(page.parent?.parent).toBe(f.scene);expect(f.root.children).toEqual([f.a,f.b]);
   f.root.remove(f.b);f.owner.reconcile([f.root],[f.material]);expect(f.owner.meshes()).toHaveLength(0);expect(disposed).toBe(1);expect(f.a.layers.mask).toBe(1);expect(f.b.layers.mask).toBe(1);
   f.root.add(f.b);f.owner.reconcile([f.root],[f.material]);f.owner.clear();expect(f.a.layers.mask).toBe(1);expect(f.b.layers.mask).toBe(1);expect(f.owner.meshes()).toHaveLength(0);
  }finally{dispose(f);}
 });
});
