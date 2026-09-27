import * as THREE from 'three/webgpu';
import { animalCoreProfile,animalParts,type AnimalCoreRing } from './animal-shape';
import type { HarePart } from './hare-shape';

/** One continuous, four-sided outer shell in the existing instanced rig.
 * As with RockSurface, neighboring sections share the silhouette and no
 * internal faces are emitted. The neck carries fractional head influence. */
export function hareGeometry(capacity:number,species='hare'):THREE.InstancedBufferGeometry {
  const data:number[]=[];
  const core=animalCoreProfile(species);
  type Corner={position:readonly [number,number,number];ring:AnimalCoreRing};
  const corner=(ring:AnimalCoreRing,index:number):Corner=>{
    const x=index===0||index===3?-ring.halfWidth:ring.halfWidth;
    return {position:[index<2?x*.92:x,index<2?ring.top:ring.bottom,ring.z],ring};
  };
  const quad=(a:Corner,b:Corner,c:Corner,d:Corner):void=>{
    const [ax,ay,az]=a.position,[bx,by,bz]=b.position,[cx,cy,cz]=c.position;
    const ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy=cy-ay,vz=cz-az;
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    const length=Math.hypot(nx,ny,nz)||1;nx/=length;ny/=length;nz/=length;
    for(const point of [a,b,c,a,c,d]){
      const tint=new THREE.Color(point.ring.color),[x,y,z]=point.position;
      data.push(x,y,z,nx,ny,nz,tint.r,tint.g,tint.b,4+point.ring.headWeight,...core.headPivot);
    }
  };
  const rings=core.rings;
  // Rear/front caps are the only ends. Every intermediate section is open to
  // its neighbor, so the back, hump, neck and head form one closed surface.
  const rear=rings[0]!,front=rings[rings.length-1]!;
  quad(corner(rear,0),corner(rear,1),corner(rear,2),corner(rear,3));
  for(let i=0;i<rings.length-1;i++)for(let side=0;side<4;side++){
    quad(corner(rings[i]!,side),corner(rings[i+1]!,side),corner(rings[i+1]!,((side+1)%4)),corner(rings[i]!,((side+1)%4)));
  }
  quad(corner(front,3),corner(front,2),corner(front,1),corner(front,0));
  function part(size:number[],at:number[],bone:number,pivot:number[],color:number,taper?:HarePart['taper']) {
    const g=new THREE.BoxGeometry(...size as [number,number,number]).toNonIndexed(),p=g.getAttribute('position'),c=new THREE.Color(color);
    if(taper){for(let i=0;i<p.count;i++){
      const top=p.getY(i)>0;
      p.setX(i,p.getX(i)*(top?taper[0]:taper[1]));
      p.setZ(i,p.getZ(i)*(top?taper[2]:taper[3]));
    }g.computeVertexNormals();}
    const n=g.getAttribute('normal');
    for(let i=0;i<p.count;i++)data.push(p.getX(i)+at[0]!,p.getY(i)+at[1]!,p.getZ(i)+at[2]!,n.getX(i),n.getY(i),n.getZ(i),c.r,c.g,c.b,bone,...pivot);
    g.dispose();
  }
  for(const p of animalParts(species))if(!p.core)part(p.size,p.center,p.bone,p.pivot,p.color,p.taper);
  const g=new THREE.InstancedBufferGeometry(),v=new THREE.InterleavedBuffer(new Float32Array(data),13);
  for(const [name,size,offset] of [['position',3,0],['normal',3,3],['color',3,6],['boneId',1,9],['bindPivot',3,10]] as const)g.setAttribute(name,new THREE.InterleavedBufferAttribute(v,size,offset));
  for(const name of ['aFrom','aTo','aTravel','aAnimal'])g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4).setUsage(THREE.StaticDrawUsage));
  g.setAttribute('aScale',new THREE.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(THREE.StaticDrawUsage));
  g.instanceCount=0;return g;
}
