import { ITEM_DEFINITIONS, type ItemId } from '../sim/items';
import type { Placement } from './primitives';
import { stonePileColor } from './stone-palette';
import { noise } from './StaticGeometry';
import { CHUNK_SMALL_MAX_SCALE, chunkContourPoints } from './chunk-shape';

export const CHUNK_ITEMS = ['granite-chunk','limestone-chunk','marble-chunk','sandstone-chunk','slate-chunk','legacy-chunk'] as const;
export const chunkCargoKind=(item:ItemId):number=>5+CHUNK_ITEMS.indexOf(item as typeof CHUNK_ITEMS[number]);
type Outline = readonly (readonly [number,number])[];

function outline(points: Outline): Outline {
  const ordered = [...points].sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
  const cross = (a:readonly number[],b:readonly number[],c:readonly number[]) =>
    (b[0]!-a[0]!)*(c[1]!-a[1]!)-(b[1]!-a[1]!)*(c[0]!-a[0]!);
  const half = (list: Outline) => {
    const hull: [number,number][] = [];
    for (const p of list) {
      while(hull.length>1 && cross(hull[hull.length-2]!,hull[hull.length-1]!,p)<=0) hull.pop();
      hull.push([p[0],p[1]]);
    }
    hull.pop(); return hull;
  };
  return [...half(ordered),...half([...ordered].reverse())];
}

/** First separating edge along the desired direction gives contact between
 * the real projected convex contours, rather than overlapping unit spheres.
 * A tiny gap absorbs float rounding and keeps the masses visually distinct. */
function contactDistance(a: Outline,b: Outline,dx:number,dz:number): number {
  let distance = Infinity;
  for (const hull of [a,b]) for (let i=0;i<hull.length;i++) {
    const p=hull[i]!,q=hull[(i+1)%hull.length]!;
    let nx=-(q[1]-p[1]),nz=q[0]-p[0],along=nx*dx+nz*dz;
    if(Math.abs(along)<1e-8)continue;
    if(along<0){nx=-nx;nz=-nz;along=-along;}
    const maxA=Math.max(...a.map(v=>v[0]*nx+v[1]*nz));
    const minB=Math.min(...b.map(v=>v[0]*nx+v[1]*nz));
    distance=Math.min(distance,(maxA-minB)/along);
  }
  return distance+.004;
}

/** Dominant boulder plus bounded satellites. Scale is isotropic; contour and
 * assembly variation are deterministic presentation choices, baked at adoption. */
export function chunkParts(x:number,z:number,item:ItemId):Placement[] {
  const color=ITEM_DEFINITIONS[item].color;
  const salt=77+Math.max(0,CHUNK_ITEMS.indexOf(item as typeof CHUNK_ITEMS[number]))*19;
  const n=(i:number)=>noise(x,z,salt+i),assembly=n(10);
  const count=assembly<.18?1:assembly<.69?2:assembly<.89?3:2;
  const parts: Placement[]=[],hulls: Outline[]=[];
  for(let i=0;i<count;i++){
    const size=i===0?.41+n(1)*.065:i===1&&assembly>=.89?.27+n(7)*.035:.18+n(7+i*3)*.055;
    const turn=n(i===0?0:9+i*3)*Math.PI*2;
    const key=Math.floor(n(20+i)*0x7fffffff)|(size<=CHUNK_SMALL_MAX_SCALE?0x80000000:0);
    const points=chunkContourPoints(key,size<=CHUNK_SMALL_MAX_SCALE),c=Math.cos(turn),s=Math.sin(turn);
    const hull=outline(points.map(p=>[(p[0]*c+p[2]*s)*size,(-p[0]*s+p[2]*c)*size]));
    let px=x,pz=z;
    if(i>0){
      const angle=n(5)*Math.PI*2+(i===2?2.05+n(6)*.6:0),dx=Math.cos(angle),dz=Math.sin(angle);
      const distance=contactDistance(hulls[0]!,hull,dx,dz);
      px+=dx*distance;pz+=dz*distance;
    }
    parts.push({x:px,z:pz,y:-Math.min(...points.map(p=>p[1]))*size+.0005,
      sx:size,sy:size,sz:size,ry:turn,key,color:stonePileColor(color,x,z,i),shape:'rounded-rock'});
    hulls.push(hull);
  }
  return parts;
}
