import * as THREE from 'three/webgpu';
import { animalParts } from './animal-shape';

/** Small quadruped rig, four rigid bones in a single instanced draw. */
export function hareGeometry(capacity:number,species='hare'):THREE.InstancedBufferGeometry {
  const data:number[]=[];
  function part(size:number[],at:number[],bone:number,pivot:number[],color:number) {
    const g=new THREE.BoxGeometry(...size as [number,number,number]).toNonIndexed(),p=g.getAttribute('position'),n=g.getAttribute('normal'),c=new THREE.Color(color);
    for(let i=0;i<p.count;i++)data.push(p.getX(i)+at[0]!,p.getY(i)+at[1]!,p.getZ(i)+at[2]!,n.getX(i),n.getY(i),n.getZ(i),c.r,c.g,c.b,bone,...pivot);
    g.dispose();
  }
  for(const p of animalParts(species))part(p.size,p.center,p.bone,p.pivot,p.color);
  const g=new THREE.InstancedBufferGeometry(),v=new THREE.InterleavedBuffer(new Float32Array(data),13);
  for(const [name,size,offset] of [['position',3,0],['normal',3,3],['color',3,6],['boneId',1,9],['bindPivot',3,10]] as const)g.setAttribute(name,new THREE.InterleavedBufferAttribute(v,size,offset));
  for(const name of ['aFrom','aTo','aTravel','aAnimal'])g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4).setUsage(THREE.StaticDrawUsage));
  g.instanceCount=0;return g;
}
