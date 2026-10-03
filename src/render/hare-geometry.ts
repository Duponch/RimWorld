import * as THREE from 'three/webgpu';
import { animalCoreProfile,animalParts,type AnimalCoreRing } from './animal-shape';
import type { HarePart } from './hare-shape';
import { corpseVisualPartBit } from './corpse-presentation';
import { bodyBloodRegion } from './body-blood';
import type { BodyPartId } from '../sim/body-definition';

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
    const headWeight=(a.ring.headWeight+b.ring.headWeight+c.ring.headWeight+d.ring.headWeight)/4,z=(az+bz+cz+d.position[2])/4;
    const jawStart=species==='hare'||species==='snow-hare'?.365:species==='red-fox'?.55:core.rings[core.rings.length-2]!.z;
    const part:BodyPartId=species==='red-fox'&&z>.69?'nose':headWeight>=.75&&z>jawStart?'jaw':headWeight>=.75?'head':headWeight>0?'neck':species==='dromedary'&&ny>.3&&z>-.45&&z<.26?'hump':'torso';
    for(const point of [a,b,c,a,c,d]){
      const tint=new THREE.Color(point.ring.color),[x,y,z]=point.position;
      data.push(x,y,z,nx,ny,nz,tint.r,tint.g,tint.b,4+point.ring.headWeight,corpseVisualPartBit(part),bodyBloodRegion(part,true),-1,...core.headPivot);
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
  function part(size:number[],at:number[],bone:number,pivot:number[],color:number,taper?:HarePart['taper'],bodyPart:BodyPartId='torso',eye=-1,roll=0) {
    const g=new THREE.BoxGeometry(...size as [number,number,number]).toNonIndexed(),p=g.getAttribute('position'),c=new THREE.Color(color);
    if(taper){for(let i=0;i<p.count;i++){
      const top=p.getY(i)>0;
      p.setX(i,p.getX(i)*(top?taper[0]:taper[1]));
      p.setZ(i,p.getZ(i)*(top?taper[2]:taper[3]));
    }g.computeVertexNormals();}
    if(roll)g.rotateX(roll);
    const n=g.getAttribute('normal');
    for(let i=0;i<p.count;i++)data.push(p.getX(i)+at[0]!,p.getY(i)+at[1]!,p.getZ(i)+at[2]!,n.getX(i),n.getY(i),n.getZ(i),c.r,c.g,c.b,bone,corpseVisualPartBit(bodyPart),bodyBloodRegion(bodyPart,true),eye,...pivot);
    g.dispose();
  }
  for(const p of animalParts(species))if(!p.core){
    const bodyPart=p.bodyPart??'torso',eye=bodyPart.endsWith('-eye');
    if((species==='hare'||species==='snow-hare')&&bodyPart.endsWith('-leg')){
      // Split the existing box at the paw boundary without changing its outer
      // silhouette. A consumed paw can vanish independently of its upper leg.
      const foot=p.size[1]*.3,bottom=p.center[1]-p.size[1]/2;
      const taper=p.taper,midX=taper?taper[1]+(taper[0]-taper[1])*.3:1,midZ=taper?taper[3]+(taper[2]-taper[3])*.3:1;
      part([p.size[0],p.size[1]-foot,p.size[2]],[p.center[0],p.center[1]+foot/2,p.center[2]],p.bone,p.pivot,p.color,taper?[taper[0],midX,taper[2],midZ]:undefined,bodyPart);
      part([p.size[0],foot,p.size[2]],[p.center[0],bottom+foot/2,p.center[2]],p.bone,p.pivot,p.color,taper?[midX,taper[1],midZ,taper[3]]:undefined,bodyPart.replace('-leg','-paw') as BodyPartId);
    }else part(p.size,p.center,p.bone,p.pivot,p.color,p.taper,bodyPart,eye?0:-1);
    if(eye)for(const roll of [-Math.PI/4,Math.PI/4]){
      const length=Math.max(p.size[1],p.size[2])*1.6,side=Math.sign(p.center[0]);
      part([p.size[0]*.65,length,length*.18],[p.center[0]+side*p.size[0]*.6,p.center[1],p.center[2]],p.bone,p.pivot,p.color,undefined,bodyPart,1,roll);
    }
  }
  const g=new THREE.InstancedBufferGeometry(),v=new THREE.InterleavedBuffer(new Float32Array(data),16);
  for(const [name,size,offset] of [['position',3,0],['normal',3,3],['color',3,6],['boneId',1,9],['bindPivot',3,13],['corpsePartMask',1,10],['bloodRegion',1,11],['eyeMark',1,12]] as const)g.setAttribute(name,new THREE.InterleavedBufferAttribute(v,size,offset));
  // Metadata is packed into one shader input; CPU aliases retain the existing
  // anatomical/rig inspection contract without spending vertex locations.
  g.setAttribute('animalPart',new THREE.InterleavedBufferAttribute(v,4,9));
  // One resident instance buffer leaves space for coats, selection and flames
  // under WebGPU's eight vertex-buffer limit, independently of owner counts.
  const instances=new THREE.InstancedInterleavedBuffer(new Float32Array(capacity*33),33).setUsage(THREE.StaticDrawUsage);
  for(const [name,size,offset] of [['aFrom',4,0],['aTo',4,4],['aTravel',4,8],['aAnimal',4,12],['aScale',1,16],['aBodyBlood',1,17],['aAbsent',1,18],['aCarrier',4,19],['aCorpseHandoff',2,23],['aCorpseFrom',4,25],['aCorpseTo',4,29]] as const)g.setAttribute(name,new THREE.InterleavedBufferAttribute(instances,size,offset));
  g.setAttribute('aBiology',new THREE.InterleavedBufferAttribute(instances,3,16));
  g.instanceCount=0;return g;
}
