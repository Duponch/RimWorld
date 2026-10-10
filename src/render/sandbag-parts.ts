import * as THREE from 'three/webgpu';
import type { World } from '../sim/types';
import type { Placement } from './primitives';

export const SANDBAG_HEIGHT=.66;

type Point=readonly [number,number,number];

/** One puffed cloth solid shared by all barricades and their construction
 * ghosts. Three octagonal rings bevel the corners and bow the sides; the flat
 * crown keeps the low-poly silhouette without additional seam boxes. */
export function createSandbagGeometry():THREE.BufferGeometry {
  const positions:number[]=[],normals:number[]=[],uvs:number[]=[];
  const outline:readonly (readonly [number,number])[]=[[-.38,-.5],[.38,-.5],[.5,-.36],[.5,.36],[.38,.5],[-.38,.5],[-.5,.36],[-.5,-.36]];
  const rings=[{y:-.5,scale:.76},{y:0,scale:1},{y:.5,scale:.78}].map(({y,scale})=>outline.map(([x,z]):Point=>[x*scale,y,z*scale]));
  const triangle=(a:Point,b:Point,c:Point,outward:Point):void=>{
    const normal=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).cross(new THREE.Vector3(c[0]-a[0],c[1]-a[1],c[2]-a[2]));
    if(normal.dot(new THREE.Vector3(...outward))<0){const swap=b;b=c;c=swap;normal.negate();}
    normal.normalize();
    for(const p of [a,b,c]){positions.push(...p);normals.push(normal.x,normal.y,normal.z);uvs.push(p[0]+.5,p[2]+.5);}
  };
  for(let ring=0;ring<rings.length-1;ring++)for(let side=0;side<outline.length;side++){
    const next=(side+1)%outline.length,a=rings[ring]![side]!,b=rings[ring]![next]!,c=rings[ring+1]![next]!,d=rings[ring+1]![side]!;
    const outward:Point=[outline[side]![0]+outline[next]![0],0,outline[side]![1]+outline[next]![1]];
    triangle(a,b,c,outward);triangle(a,c,d,outward);
  }
  for(const [ring,sign] of [[rings[0]!,-1],[rings[2]!,1]] as const)for(let side=0;side<outline.length;side++)
    triangle([0,sign*.5,0],ring[side]!,ring[(side+1)%outline.length]!,[0,sign,0]);
  const result=new THREE.BufferGeometry();
  result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  result.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  result.computeBoundingBox();result.computeBoundingSphere();
  return result;
}

/** Cloth uses the resident solid pipeline. The two staggered courses stay
 * within the fixed 1×1 cover; there is no per-object geometry or frame update. */
export function sandbagParts(world:World):Placement[] {
  const parts:Placement[]=[];
  for(const bag of world.structures){
    if(bag.kind!=='sandbags')continue;
    const add=(dx:number,y:number,dz:number,sx:number,sy:number,sz:number,color:number)=>
      parts.push({targetId:bag.id,key:bag.id,shape:'sandbag',x:bag.x+dx,y,z:bag.z+dz,sx,sy,sz,color});
    add(-.245,.17,-.025,.47,.32,.88,0xd6c8a5);
    add(.245,.17,-.025,.47,.32,.88,0xcabd98);
    // A central upper bag bridges the lower seam. Short end bags complete the
    // same course at the cell boundary, including a continuous neighbouring run.
    add(-.38,.49,.015,.23,.32,.84,0xcfc09a);
    add(0,.49,.015,.49,.32,.89,0xe0d1af);
    add(.38,.49,.015,.23,.32,.84,0xd5c6a2);
  }
  return parts;
}
