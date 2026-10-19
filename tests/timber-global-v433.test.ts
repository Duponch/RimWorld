import{expect,test}from'vitest';
import * as THREE from'three/webgpu';
import{createWorld}from'../src/sim/index';
import{TimberCladdingLayer,timberCladdingParts}from'../src/render/TimberCladdingLayer';
import{TimberCladdingLayer as GlobalV432,timberCladdingParts as partsV432}from'./fixtures/timber-global-unindexed-v432-v433';

const channels=['position','normal','color','uv']as const;
function wood(id:number,x:number,z:number){return{id,x,z,kind:'wall'as const,material:'wood'as const,orientation:0 as const,footprint:'legacy-single'as const};}
function fixture(){
  const world=createWorld(433,250,250);world.structures=[];let id=1;
  for(const[x,z]of[[0,0],[62,62],[64,64],[126,127],[128,128],[191,192],[246,246]]as const)
    for(let dz=0;dz<3;dz++)for(let dx=0;dx<3;dx++)if(dx!==1||dz!==1)world.structures.push(dx===1&&dz===0?{...wood(id++,x+dx,z+dz),kind:'door'}:wood(id++,x+dx,z+dz));
  world.structures.push({...wood(id++,66,63),material:'steel'},wood(id++,249,249));return world;
}
function words(attribute:THREE.BufferAttribute){const array=attribute.array as Float32Array;return new Uint32Array(array.buffer,array.byteOffset,array.length);}
function corners(geometry:THREE.BufferGeometry,name:typeof channels[number]){
  const attribute=geometry.getAttribute(name)as THREE.BufferAttribute,source=words(attribute),index=geometry.index;
  if(!index)return source;const result=new Uint32Array(index.count*attribute.itemSize);
  for(let corner=0;corner<index.count;corner++)for(let component=0;component<attribute.itemSize;component++)result[corner*attribute.itemSize+component]=source[index.getX(corner)*attribute.itemSize+component]!;
  return result;
}
function compare(reference:GlobalV432,candidate:TimberCladdingLayer){
  expect(candidate.group.children).toEqual([candidate.wallMesh,candidate.eaveMesh]);expect(candidate.group.children).toHaveLength(2);
  for(const[kind,native,mesh]of[['wall',reference.wallMesh,candidate.wallMesh],['eave',reference.eaveMesh,candidate.eaveMesh]]as const){
    expect(mesh.userData.timberChunk).toBe('0:0');expect(mesh.activeCount,kind).toBe(native.count);expect(mesh.geometry.instanceCount).toBe(native.count);expect(mesh.visible).toBe(native.visible);
    expect(mesh.castShadow).toBe(native.castShadow);expect(mesh.receiveShadow).toBe(native.receiveShadow);expect(mesh.boundingSphere).toEqual(native.boundingSphere);
    expect(mesh.instanceMatrix.array.slice(0,mesh.activeCount*16)).toEqual(native.instanceMatrix.array.slice(0,native.count*16));
    expect(mesh.colorBuffer.array.slice(0,mesh.activeCount*3)).toEqual(native.instanceColor?.array.slice(0,native.count*3)??new Float32Array());
    const ordinal=mesh.geometry.getAttribute('timberOrdinal');expect(Array.from(ordinal.array.slice(0,mesh.activeCount))).toEqual(Array.from({length:native.count},(_,i)=>i));
    expect(native.geometry.index).toBeNull();expect(mesh.geometry.index!.count).toBe(native.geometry.getAttribute('position').count);
    for(const name of channels)expect(corners(mesh.geometry,name),`${kind}/${name} in original triangle/corner order`).toEqual(corners(native.geometry,name));
    expect(Object.hasOwn(mesh,'instanceColor')).toBe(false);
  }
  expect(candidate.grain.image.data).toEqual(reference.grain.image.data);expect(candidate.material.flatShading).toBe(reference.material.flatShading);expect(candidate.plainMaterial.flatShading).toBe(reference.plainMaterial.flatShading);
}
test('exactly two global batches preserve independent V432 order, every unindexed triangle corner, normals, pigment, UV and global ordinal',()=>{
  const world=fixture(),reference=new GlobalV432(),candidate=new TimberCladdingLayer(),before=structuredClone(world);
  try{
    for(const cutaway of[false,true,false]){expect(timberCladdingParts(world,cutaway)).toEqual(partsV432(world,cutaway));reference.update(world,cutaway);candidate.update(world,cutaway);compare(reference,candidate);}
    expect(world).toEqual(before);
    world.structures.reverse();reference.update(world,false);candidate.update(world,false);compare(reference,candidate);
    world.structures.splice(0,19);reference.update(world,false);candidate.update(world,false);compare(reference,candidate);
  }finally{reference.dispose();candidate.dispose();}
});
test('stable adoption does not touch buffers/versions, while global preview restores exact active RGB across reorder and cutaway',()=>{
  const world=fixture(),reference=new GlobalV432(),candidate=new TimberCladdingLayer();
  try{
    reference.update(world,false);candidate.update(world,false);
    const objects=[candidate.wallMesh,candidate.eaveMesh],buffers=objects.map(mesh=>[mesh.geometry,mesh.instanceMatrix,mesh.colorBuffer,mesh.geometry.getAttribute('timberOrdinal')]);
    const versions=()=>objects.map(mesh=>[mesh.instanceMatrix.version,mesh.colorBuffer.version,(mesh.geometry.getAttribute('timberOrdinal')as THREE.InstancedBufferAttribute).version]);
    const initial=versions();world.tick+=60;reference.update(world,false);candidate.update(world,false);expect(versions()).toEqual(initial);
    expect(objects.map(mesh=>[mesh.geometry,mesh.instanceMatrix,mesh.colorBuffer,mesh.geometry.getAttribute('timberOrdinal')])).toEqual(buffers);compare(reference,candidate);
    const targets=new Set([1,9,25]);reference.setTargetPreview(targets);candidate.setTargetPreview(targets);compare(reference,candidate);
    world.structures.reverse();reference.update(world,true);candidate.update(world,true);compare(reference,candidate);
    reference.clearTargetPreview();candidate.clearTargetPreview();compare(reference,candidate);
    for(const enabled of[false,true]){reference.setTexturesEnabled(enabled);candidate.setTexturesEnabled(enabled);expect(objects.every(mesh=>mesh.material===(enabled?candidate.material:candidate.plainMaterial))).toBe(true);compare(reference,candidate);}
  }finally{reference.dispose();candidate.dispose();}
});
test('global256 to512 growth retains the same Mesh and exact active content; prepare cannot overwrite a version-colliding new buffer',()=>{
  const world=createWorld(434,32,32);world.structures=[];const reference=new GlobalV432(),candidate=new TimberCladdingLayer();
  try{
    reference.update(world,false);candidate.update(world,false);const wall=candidate.wallMesh,eave=candidate.eaveMesh,oldBuffer=wall.instanceMatrix,oldGeometry=wall.geometry,version=oldBuffer.version;
    let disposed=0;oldGeometry.addEventListener('dispose',()=>disposed++);
    const restore=candidate.prepareForCompile();expect([wall.activeCount,eave.activeCount]).toEqual([1,1]);
    world.structures=Array.from({length:257},(_,i)=>wood(i+1,i%32,Math.floor(i/32)));reference.update(world,false);candidate.update(world,false);
    expect(wall.instanceMatrix).not.toBe(oldBuffer);expect(wall.instanceMatrix.version).toBe(version);expect(disposed).toBe(1);restore();compare(reference,candidate);
    expect(candidate.wallMesh).toBe(wall);expect(candidate.eaveMesh).toBe(eave);expect(wall.instanceMatrix.count).toBe(512);expect(wall.activeCount).toBe(257);
    const geometry=wall.geometry,buffer=wall.instanceMatrix;
    world.structures=[];reference.update(world,false);candidate.update(world,false);compare(reference,candidate);
    const restoreEmpty=candidate.prepareForCompile();restoreEmpty();expect(wall.geometry).toBe(geometry);expect(wall.instanceMatrix).toBe(buffer);expect(wall.activeCount).toBe(0);
    const restoreChanged=candidate.prepareForCompile();world.structures=[wood(999,31,31)];reference.update(world,false);candidate.update(world,false);restoreChanged();compare(reference,candidate);expect(wall.geometry).toBe(geometry);
  }finally{reference.dispose();candidate.dispose();}
});
test('both global camera/shadow bounds and frustum results match V432 and enclose all transformed faces including map-edge eaves',()=>{
  const world=fixture(),reference=new GlobalV432(),candidate=new TimberCladdingLayer();
  try{
    reference.update(world,false);candidate.update(world,false);reference.group.updateMatrixWorld(true);candidate.group.updateMatrixWorld(true);compare(reference,candidate);
    const matrix=new THREE.Matrix4(),point=new THREE.Vector3();
    for(const mesh of[candidate.wallMesh,candidate.eaveMesh]){const positions=mesh.geometry.getAttribute('position');for(let slot=0;slot<mesh.activeCount;slot++){mesh.getMatrixAt(slot,matrix);for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(matrix);expect(point.distanceTo(mesh.boundingSphere.center)).toBeLessThanOrEqual(mesh.boundingSphere.radius+1e-5);}}}
    for(const camera of[new THREE.PerspectiveCamera(45,16/9,.1,600),new THREE.OrthographicCamera(-36,36,30,-30,.1,600)]){
      camera.coordinateSystem=THREE.WebGPUCoordinateSystem;camera.position.set(64,80,100);camera.lookAt(64,0,64);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
      const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),camera.coordinateSystem,camera.reversedDepth);
      expect(candidate.wallMesh.intersectsFrustum(frustum)).toBe(reference.wallMesh.intersectsFrustum(frustum));expect(candidate.eaveMesh.intersectsFrustum(frustum)).toBe(reference.eaveMesh.intersectsFrustum(frustum));
    }
  }finally{reference.dispose();candidate.dispose();}
});
test('both indexed model copies remain independent from global batch buffers and are released exactly once',()=>{
  const candidate=new TimberCladdingLayer(),bases=[candidate.wallGeometry,candidate.eaveGeometry],meshes=[candidate.wallMesh,candidate.eaveMesh];
  let disposed=0;for(const geometry of[...bases,...meshes.map(mesh=>mesh.geometry)])geometry.addEventListener('dispose',()=>disposed++);
  for(let i=0;i<2;i++){const mesh=meshes[i]!,base=bases[i]!;expect(mesh.geometry).not.toBe(base);expect(mesh.geometry.index).not.toBe(base.index);for(const name of channels){expect(mesh.geometry.getAttribute(name)).not.toBe(base.getAttribute(name));expect(words(mesh.geometry.getAttribute(name)as THREE.BufferAttribute)).toEqual(words(base.getAttribute(name)as THREE.BufferAttribute));}}
  candidate.dispose();expect(disposed).toBe(4);expect(candidate.group.children).toHaveLength(0);
});
