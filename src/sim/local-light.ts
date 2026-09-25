import { lightSources } from './light-sources.ts';
import type { RoomTopology } from './room-topology.ts';
import type { World } from './types.ts';

const RADIUS = 12, SIDE = RADIUS * 2 + 1, AREA = SIDE * SIDE;
const directions = [[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]] as const;

/** A finite light path cannot cross outside these conservative source bounds.
 * Room IDs/connectivity may change far away without changing local opacity. */
function sameLightObstacles(sources:ReturnType<typeof lightSources>,before:RoomTopology,after:RoomTopology):boolean {
  if(before.width!==after.width||before.height!==after.height)return false;
  let minX=after.width,minZ=after.height,maxX=-1,maxZ=-1;
  for(const s of sources) {
    const x=s.cell%after.width,z=Math.floor(s.cell/after.width);
    minX=Math.min(minX,x-s.radius);maxX=Math.max(maxX,x+s.radius);
    minZ=Math.min(minZ,z-s.radius);maxZ=Math.max(maxZ,z+s.radius);
  }
  for(let z=Math.max(0,minZ);z<=Math.min(after.height-1,maxZ);z++)for(let x=Math.max(0,minX);x<=Math.min(after.width-1,maxX);x++)
    if((before.at(x,z)?.kind==='space')!==(after.at(x,z)?.kind==='space'))return false;
  return true;
}

/** Small integer-priority heap. Independent of movement costs/reservations. */
function push(heap:number[],value:number):void {
  let i=heap.length;heap.push(value);
  while(i>0){const parent=(i-1)>>1;if(heap[parent]!<=value)break;heap[i]=heap[parent]!;i=parent;}heap[i]=value;
}
function pop(heap:number[]):number {
  const result=heap[0]!,last=heap.pop()!;if(!heap.length)return result;
  let i=0;
  while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1]!<heap[child]!)child++;if(heap[child]!>=last)break;heap[i]=heap[child]!;i=child;}
  heap[i]=last;return result;
}

/** Warm-only worlds retain the original scalar fast path. A blue source can
 * make green or blue win after overlap, so those worlds sum quantized RGB
 * channels separately before taking their maximum. */
export class LocalLightCache {
  private topology?:RoomTopology;
  private emitters='';
  private light=new Float32Array(0);
  rebuilds=0;

  read(world:World,topology:RoomTopology):Float32Array {
    const sources=lightSources(world);
    const mixed=sources.some(s=>s.green>s.red||s.blue>s.red);
    const key=sources.map(s=>mixed?`${s.cell}:${s.radius}:${s.red}:${s.green}:${s.blue}`:`${s.cell}:${s.radius}:${s.red}`).join(',');
    if(this.topology===topology&&this.emitters===key)return this.light;
    if(this.topology&&this.emitters===key&&sameLightObstacles(sources,this.topology,topology)) {
      this.topology=topology;return this.light;
    }
    const sum=new Uint16Array(world.width*world.height),green=mixed?new Uint16Array(world.width*world.height):undefined,
      blue=mixed?new Uint16Array(world.width*world.height):undefined,distance=new Uint16Array(AREA);
    const blocked=(x:number,z:number)=>topology.at(x,z)?.kind!=='space';
    for(const {cell:source,radius,red,green:sourceGreen,blue:sourceBlue} of sources) {
      distance.fill(65535);
      const sx=source%world.width,sz=Math.floor(source/world.width),root=RADIUS*SIDE+RADIUS;
      const heap:number[]=[];distance[root]=100;push(heap,100*AREA+root);
      if(green&&blue)while(heap.length) {
        const entry=pop(heap),cost=Math.floor(entry/AREA),local=entry%AREA;
        if(distance[local]!==cost)continue;
        const x=sx+local%SIDE-RADIUS,z=sz+Math.floor(local/SIDE)-RADIUS,index=z*world.width+x;
        const d=cost/100,attenuation=.6*(1-d/radius)+.4/(d*d);
        sum[index]=Math.min(255,sum[index]!+Math.floor(red*attenuation));
        green[index]=Math.min(255,green[index]!+Math.floor(sourceGreen*attenuation));
        blue[index]=Math.min(255,blue[index]!+Math.floor(sourceBlue*attenuation));
        for(const [dx,dz] of directions) {
          const next=local+dx+dz*SIDE,nextCost=cost+(dx&&dz?141:100);
          if(nextCost>radius*100||blocked(x+dx,z+dz)||nextCost>=distance[next]!)continue;
          // Light can round a single corner. Two opaque sides close a diagonal.
          if(dx&&dz&&blocked(x+dx,z)&&blocked(x,z+dz))continue;
          distance[next]=nextCost;push(heap,nextCost*AREA+next);
        }
      } else while(heap.length) {
        const entry=pop(heap),cost=Math.floor(entry/AREA),local=entry%AREA;
        if(distance[local]!==cost)continue;
        const x=sx+local%SIDE-RADIUS,z=sz+Math.floor(local/SIDE)-RADIUS,index=z*world.width+x;
        const d=cost/100,attenuation=.6*(1-d/radius)+.4/(d*d);
        sum[index]=Math.min(255,sum[index]!+Math.floor(red*attenuation));
        for(const [dx,dz] of directions) {
          const next=local+dx+dz*SIDE,nextCost=cost+(dx&&dz?141:100);
          if(nextCost>radius*100||blocked(x+dx,z+dz)||nextCost>=distance[next]!)continue;
          if(dx&&dz&&blocked(x+dx,z)&&blocked(x,z+dz))continue;
          distance[next]=nextCost;push(heap,nextCost*AREA+next);
        }
      }
    }
    const light=new Float32Array(sum.length);
    if(green&&blue)for(let i=0;i<sum.length;i++)light[i]=Math.min(.5,Math.max(sum[i]!,green[i]!,blue[i]!)/255*3.6);
    else for(let i=0;i<sum.length;i++)light[i]=Math.min(.5,sum[i]!/255*3.6);
    this.topology=topology;this.emitters=key;this.light=light;this.rebuilds++;
    return light;
  }
}
