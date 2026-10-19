import{describe,expect,it}from'vitest';
import * as THREE from'three/webgpu';
import{StaticSceneCompiler435,setStaticSceneSource435}from'../src/render/StaticSceneCompiler435';
import{StaticGeometryArena435}from'../src/render/StaticGeometryArena435';

function geometry(vertices:number,x=0):THREE.BufferGeometry{
 const g=new THREE.BufferGeometry(),position=new Float32Array(vertices*3),normal=new Float32Array(vertices*3),color=new Float32Array(vertices*3);
 for(let i=0;i<vertices;i++){position[i*3]=x+i*.01;position[i*3+1]=(i%3)*.1;position[i*3+2]=(i%2)*.1;normal[i*3+1]=1;color[i*3]=.5;color[i*3+1]=.625;color[i*3+2]=.75;}
 g.setAttribute('position',new THREE.BufferAttribute(position,3));g.setAttribute('normal',new THREE.BufferAttribute(normal,3));g.setAttribute('color',new THREE.BufferAttribute(color,3));g.setIndex(Array.from({length:Math.floor(vertices/3)*3},(_,i)=>i));g.computeBoundingSphere();return g;
}
function source(material:THREE.MeshLambertNodeMaterial,key:string,vertices:number,x=0,quadrant:0|1|2|3=0):THREE.Mesh{
 const mesh=new THREE.Mesh(geometry(vertices,x),material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;setStaticSceneSource435(mesh,key,quadrant);return mesh;
}
function cornerBits(meshes:readonly THREE.Mesh[]):number[][]{
 const rows:number[][]=[];for(const mesh of meshes){const g=mesh.geometry,index=g.index!,names=Object.keys(g.attributes).sort();for(let i=g.drawRange.start;i<Math.min(index.count,g.drawRange.start+g.drawRange.count);i++){const vertex=index.getX(i);rows.push(names.flatMap(name=>{const a=g.getAttribute(name);return Array.from(new Uint32Array(a.array.buffer,a.array.byteOffset+vertex*a.itemSize*4,a.itemSize));}));}}return rows;
}
function fixture(){const scene=new THREE.Scene(),root=new THREE.Group(),material=new THREE.MeshLambertNodeMaterial({vertexColors:true}),owner=new StaticSceneCompiler435(scene);scene.add(root);return{scene,root,material,owner};}
function dispose(f:ReturnType<typeof fixture>){f.owner.dispose();for(const mesh of f.root.children)if(mesh instanceof THREE.Mesh)mesh.geometry.dispose();f.material.dispose();}

describe('435 resident source block arenas',()=>{
 it('replacement objects reuse the producer key and allocation, copying only that source plus typed page indices',()=>{
  const f=fixture();try{
   const a=source(f.material,'chunk:0:body',21),b=source(f.material,'chunk:1:body',30,10);f.root.add(a,b);f.scene.updateMatrixWorld(true);f.owner.reconcile([f.root],[f.material]);
   const page=f.owner.meshes()[0]!,g=page.geometry,position=g.getAttribute('position'),before=f.owner.snapshot(),oldBlock=before.pages[0]!.blocks.find(block=>block.key==='owned:chunk:0:body')!;
   const replacement=source(f.material,'chunk:0:body',24,1);f.root.remove(a);f.root.children.unshift(replacement);replacement.parent=f.root;a.geometry.dispose();
   f.owner.reconcile([f.root],[f.material]);const after=f.owner.snapshot(),block=after.pages[0]!.blocks.find(block=>block.key==='owned:chunk:0:body')!;
   expect(f.owner.meshes()[0]).toBe(page);expect(page.geometry).toBe(g);expect(g.getAttribute('position')).toBe(position);expect(block.offset).toBe(oldBlock.offset);expect(block.capacity).toBe(oldBlock.capacity);
   expect(cornerBits([page])).toEqual(cornerBits([replacement,b]));expect(after.copiedBytes-before.copiedBytes).toBe(24*9*4+(24+30)*4);expect(after.indexSourceRemaps-before.indexSourceRemaps).toBe(1);expect(after.rebuilds).toBe(before.rebuilds);
   expect(a.layers.mask).toBe(1);expect(replacement.layers.mask).toBe(0);expect(after.blockReplacements-before.blockReplacements).toBe(1);
  }finally{dispose(f);}
 });
 it('index masks update cached source indices without copying vertices; removed source allocations are reusable',()=>{
  const f=fixture();try{
   const a=source(f.material,'a',24),b=source(f.material,'b',24,10),c=source(f.material,'c',24,20);f.root.add(a,b,c);f.scene.updateMatrixWorld(true);f.owner.reconcile([f.root],[f.material]);const page=f.owner.meshes()[0]!,g=page.geometry,before=f.owner.snapshot();
   a.geometry.setDrawRange(0,3);f.owner.reconcile([f.root],[f.material]);expect(f.owner.snapshot().copiedBytes-before.copiedBytes).toBe((3+24+24)*4);expect(f.owner.snapshot().indexSourceRemaps-before.indexSourceRemaps).toBe(1);expect(cornerBits([page])).toEqual(cornerBits([a,b,c]));
   f.root.remove(b);f.owner.reconcile([f.root],[f.material]);expect(page.geometry).toBe(g);const d=source(f.material,'d',24,30);f.root.add(d);f.owner.reconcile([f.root],[f.material]);expect(page.geometry).toBe(g);expect(cornerBits([page])).toEqual(cornerBits([a,c,d]));expect(f.owner.snapshot().pages[0]!.arena.vertexGrowths).toBe(0);b.geometry.dispose();
  }finally{dispose(f);}
 });
 it('four producer quadrants keep stable page identity and native conservative culling bounds across source replacement',()=>{
  const f=fixture();try{
   const sources:THREE.Mesh[]=[];for(const q of[0,1,2,3]as const)for(let i=0;i<2;i++)sources.push(source(f.material,`${q}:${i}`,24,(q%2)*100+i,q));f.root.add(...sources);f.scene.updateMatrixWorld(true);f.owner.reconcile([f.root],[f.material]);
   const pages=f.owner.meshes(),before=f.owner.snapshot();expect(pages).toHaveLength(4);expect(before.pages.map(p=>p.quadrant)).toEqual([0,1,2,3]);expect(before.sourceActiveTriangles).toBe(before.compiledActiveTriangles);
   for(let q=0;q<4;q++){const page=pages[q]!,rows=sources.slice(q*2,q*2+2);expect(cornerBits([page])).toEqual(cornerBits(rows));for(const mesh of rows){const s=mesh.geometry.boundingSphere!,p=page.geometry.boundingSphere!;expect(p.center.distanceTo(s.center)+s.radius).toBeLessThanOrEqual(p.radius+1e-6);}}
   const otherBuffers=pages.slice(1).map(page=>page.geometry.getAttribute('position').array.slice()),replacement=source(f.material,'0:0',27,2,0),old=sources[0]!;f.root.remove(old);f.root.add(replacement);old.geometry.dispose();f.owner.reconcile([f.root],[f.material]);expect(f.owner.meshes()).toEqual(pages);for(let q=1;q<4;q++)expect(pages[q]!.geometry.getAttribute('position').array).toEqual(otherBuffers[q-1]);expect(f.owner.snapshot().rebuilds).toBe(before.rebuilds);
   const stable=f.owner.snapshot();for(let frame=0;frame<100;frame++)f.owner.syncVisibility();expect(f.owner.snapshot().copiedBytes).toBe(stable.copiedBytes);expect(f.owner.snapshot().indexSourceRemaps).toBe(stable.indexSourceRemaps);
   const plane=new THREE.Plane(new THREE.Vector3(-1,0,0),50),frustum=new THREE.Frustum(plane,new THREE.Plane(new THREE.Vector3(1,0,0),1000),new THREE.Plane(new THREE.Vector3(0,1,0),1000),new THREE.Plane(new THREE.Vector3(0,-1,0),1000),new THREE.Plane(new THREE.Vector3(0,0,1),1000),new THREE.Plane(new THREE.Vector3(0,0,-1),1000));expect(frustum.intersectsObject(pages[0]!)).toBe(true);expect(frustum.intersectsObject(pages[1]!)).toBe(false);
  }finally{dispose(f);}
 });
 it('populating a new quadrant preserves the existing quadrant geometry and never creates a global intermediate page',()=>{
  const f=fixture();try{
   const a=source(f.material,'a',24,0,0),b=source(f.material,'b',24,1,0);f.root.add(a,b);f.scene.updateMatrixWorld(true);f.owner.reconcile([f.root],[f.material]);const page=f.owner.meshes()[0]!,geometry=page.geometry,before=f.owner.snapshot();expect(before.pages[0]!.quadrant).toBe(0);
   const c=source(f.material,'c',24,100,3),d=source(f.material,'d',24,101,3);f.root.add(c,d);f.owner.reconcile([f.root],[f.material]);expect(f.owner.meshes()).toHaveLength(2);expect(f.owner.meshes()[0]).toBe(page);expect(page.geometry).toBe(geometry);expect(cornerBits([page])).toEqual(cornerBits([a,b]));expect(f.owner.snapshot().copiedBytes-before.copiedBytes).toBe(48*9*4+48*4);expect(f.owner.snapshot().pages.every(p=>p.quadrant!==undefined)).toBe(true);
  }finally{dispose(f);}
 });
 it('keeps resource quadrants plus terrain halves and rock inside one seven-page/eight-page budget',()=>{
  const f=fixture(),terrainMaterial=new THREE.MeshLambertNodeMaterial(),rockMaterial=new THREE.MeshLambertNodeMaterial();try{
   for(const q of[0,1,2,3]as const)for(let i=0;i<2;i++)f.root.add(source(f.material,`resource:${q}:${i}`,24,q*100+i,q));
   for(const half of[0,1]as const)for(let i=0;i<2;i++){const mesh=source(terrainMaterial,`terrain:${half}:${i}`,24,half*100+i);setStaticSceneSource435(mesh,`terrain:${half}:${i}`,half,2);f.root.add(mesh);}
   for(let i=0;i<2;i++){const mesh=new THREE.Mesh(geometry(24,i*5),rockMaterial);mesh.castShadow=true;mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;f.root.add(mesh);}
   f.scene.updateMatrixWorld(true);f.owner.reconcile([f.root],[f.material,terrainMaterial,rockMaterial]);const snapshot=f.owner.snapshot();expect(snapshot.pageObjects).toBe(7);expect(snapshot.sourceObjects).toBe(14);expect(snapshot.sourceActiveTriangles).toBe(snapshot.compiledActiveTriangles);expect(snapshot.pages.filter(p=>p.material===f.material.uuid)).toHaveLength(4);expect(snapshot.pages.filter(p=>p.material===terrainMaterial.uuid)).toHaveLength(2);expect(snapshot.pages.filter(p=>p.material===rockMaterial.uuid)).toHaveLength(1);
  }finally{dispose(f);terrainMaterial.dispose();rockMaterial.dispose();}
 });
 it('coalesces all hidden source ranges conservatively at adoption, without losing an unnotified region',()=>{
  const f=fixture();try{
   const a=source(f.material,'a',24),b=source(f.material,'b',24,10);f.root.add(a,b);f.scene.updateMatrixWorld(true);f.owner.reconcile([f.root],[f.material]);const position=a.geometry.getAttribute('position') as THREE.BufferAttribute;
   for(let adopt=0;adopt<50;adopt++){position.setY(0,adopt*.01);position.addUpdateRange(0,3);position.needsUpdate=true;position.setZ(20,adopt*.02);position.addUpdateRange(60,3);position.needsUpdate=true;f.owner.patchAttribute(position,60,3);f.owner.reconcile([f.root],[f.material]);expect(position.updateRanges).toHaveLength(1);expect(position.updateRanges[0]).toEqual({start:0,count:63});expect(cornerBits(f.owner.meshes())).toEqual(cornerBits([a,b]));}
   expect(f.owner.snapshot().sourceRangeCoalesces).toBe(50);const bytes=f.owner.snapshot().copiedBytes;f.owner.reconcile([f.root],[f.material]);expect(f.owner.snapshot().copiedBytes).toBe(bytes);
  }finally{dispose(f);}
 });
 it('shared global Rock owners append newly referenced vertices without copying their complete global arrays',()=>{
  const f=fixture();try{
   const attributes={position:new THREE.BufferAttribute(new Float32Array(30000),3),normal:new THREE.BufferAttribute(new Float32Array(30000).fill(1),3),color:new THREE.BufferAttribute(new Float32Array(30000).fill(.5),3)},sources:THREE.Mesh[]=[];
   for(let vertex=9000;vertex<=9004;vertex++)attributes.position.setXYZ(vertex,vertex*.01,vertex%3,vertex%2);
   for(const indices of[[9000,9001,9002],[9002,9003,9000]]){const g=new THREE.BufferGeometry();for(const[name,a]of Object.entries(attributes))g.setAttribute(name,a);g.setIndex(indices);g.computeBoundingSphere();const mesh=new THREE.Mesh(g,f.material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;sources.push(mesh);f.root.add(mesh);}
   f.scene.updateMatrixWorld(true);f.owner.reconcile([f.root],[f.material]);const page=f.owner.meshes()[0]!,before=f.owner.snapshot();sources[1]!.geometry.index!.setX(1,9004);sources[1]!.geometry.index!.needsUpdate=true;f.owner.reconcile([f.root],[f.material]);
   expect(f.owner.meshes()[0]).toBe(page);expect(f.owner.snapshot().pages[0]!.uniqueAttributeBlocks).toBe(1);expect(f.owner.snapshot().pages[0]!.vertices).toBe(5);expect(f.owner.snapshot().copiedBytes-before.copiedBytes).toBeLessThan(1024);expect(cornerBits([page])).toEqual(cornerBits(sources));
  }finally{dispose(f);}
 });
 it('free-list allocation reuses slots; real page growth preserves all attribute bits and disposes the former geometry once',()=>{
  const arena=new StaticGeometryArena435([{name:'position',itemSize:3}],128,128);try{
   const a=arena.allocate(24),b=arena.allocate(24),geometry=arena.geometry,position=geometry.getAttribute('position');new Uint32Array(position.array.buffer).set([0x80000000,0x3f000000,0x3f800000],b.offset*3);let disposals=0;geometry.addEventListener('dispose',()=>disposals++);
   arena.release(a);const replacement=arena.allocate(30);expect(replacement.offset).toBe(a.offset);expect(arena.geometry).toBe(geometry);const grown=arena.allocate(200,b);expect(arena.geometry).not.toBe(geometry);expect(grown.capacity).toBeGreaterThanOrEqual(200);expect(disposals).toBe(1);expect(Array.from(new Uint32Array(arena.geometry.getAttribute('position').array.buffer,b.offset*3*4,3))).toEqual([0x80000000,0x3f000000,0x3f800000]);
   const before=arena.geometry;arena.ensureIndices(1025);expect(arena.geometry).not.toBe(before);expect(arena.indexCapacity).toBe(2048);expect(arena.stats.indexGrowths).toBe(1);
  }finally{arena.dispose();}
 });
});
