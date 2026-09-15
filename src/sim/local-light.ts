import type { RoomTopology } from './room-topology.ts';
import type { World } from './types.ts';

const RADIUS = 10, SIDE = RADIUS * 2 + 1, AREA = SIDE * SIDE;
const directions = [[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]] as const;

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

/** Current emitters all share the campfire's RGB, so its red channel is the
 * maximum after combination. New coloured/overlit emitters need RGB storage.
 * No light is additive with the sky; ordinary emitters never exceed 50%. */
export class LocalLightCache {
  private topology?:RoomTopology;
  private emitters='';
  private light=new Float32Array(0);
  rebuilds=0;

  read(world:World,topology:RoomTopology):Float32Array {
    const sources=world.structures.filter(s=>s.kind==='campfire'&&(s.fuel?.ticks??0)>0)
      .map(s=>s.z*world.width+s.x).sort((a,b)=>a-b);
    const key=sources.join(',');
    if(this.topology===topology&&this.emitters===key)return this.light;
    const sum=new Uint16Array(world.width*world.height),distance=new Uint16Array(AREA);
    const blocked=(x:number,z:number)=>topology.at(x,z)?.kind!=='space';
    for(const source of sources) {
      distance.fill(65535);
      const sx=source%world.width,sz=Math.floor(source/world.width),root=RADIUS*SIDE+RADIUS;
      const heap:number[]=[];distance[root]=100;push(heap,100*AREA+root);
      while(heap.length) {
        const entry=pop(heap),cost=Math.floor(entry/AREA),local=entry%AREA;
        if(distance[local]!==cost)continue;
        const x=sx+local%SIDE-RADIUS,z=sz+Math.floor(local/SIDE)-RADIUS,index=z*world.width+x;
        const d=cost/100,attenuation=.6*(1-d/RADIUS)+.4/(d*d);
        sum[index]=Math.min(255,sum[index]!+Math.floor(252*attenuation));
        for(const [dx,dz] of directions) {
          const next=local+dx+dz*SIDE,nextCost=cost+(dx&&dz?141:100);
          if(nextCost>RADIUS*100||blocked(x+dx,z+dz)||nextCost>=distance[next]!)continue;
          // Light can round a single corner. Two opaque sides close a diagonal.
          if(dx&&dz&&blocked(x+dx,z)&&blocked(x,z+dz))continue;
          distance[next]=nextCost;push(heap,nextCost*AREA+next);
        }
      }
    }
    const light=new Float32Array(sum.length);
    for(let i=0;i<sum.length;i++)light[i]=Math.min(.5,sum[i]!/255*3.6);
    this.topology=topology;this.emitters=key;this.light=light;this.rebuilds++;
    return light;
  }
}
