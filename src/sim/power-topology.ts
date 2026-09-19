import { footprintCells } from './definitions.ts';
import { CONNECTION_RANGE } from './power-rules.ts';
import type { Cell, Structure, World } from './types.ts';

export interface PowerTopology {
  readonly cells:ReadonlyMap<number,number>;
  readonly sources:ReadonlyMap<number,Readonly<Cell>>;
  readonly groups:readonly (readonly number[])[];
  readonly netOf:ReadonlyMap<number,number>;
  readonly width:number;
  readonly height:number;
}
/** Transmitting buildings form cardinal components over their actual footprint.
 * No DOM, navigation or room dependency; a wall does not interrupt a wire. */
export class PowerTopologyCache {
  private key='';
  private topology?:PowerTopology;
  rebuilds=0;
  read(world:World):PowerTopology {
    const generators=world.structures.filter(s=>s.kind==='wood-generator');
    const key=`${world.width}:${world.height}|`+generators.map(s=>`${s.id}:${s.x}:${s.z}`).join('|');
    if(this.topology&&key===this.key)return this.topology;
    const cells=new Map<number,number>(),sources=new Map<number,Cell>(),adjacent=new Map<number,Set<number>>();
    for(const s of generators){sources.set(s.id,{x:s.x,z:s.z});adjacent.set(s.id,new Set());for(const c of footprintCells(s))cells.set(c.z*world.width+c.x,s.id);}
    for(const [i,id] of cells)for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const x=i%world.width+dx!,z=Math.floor(i/world.width)+dz!;
      if(x<0||z<0||x>=world.width||z>=world.height)continue;
      const other=cells.get(z*world.width+x);if(other!==undefined&&other!==id)adjacent.get(id)!.add(other);
    }
    const seen=new Set<number>(),groups:number[][]=[],netOf=new Map<number,number>();
    for(const id of [...sources.keys()].sort((a,b)=>a-b)) {
      if(seen.has(id))continue;
      const group=[id];seen.add(id);
      for(let i=0;i<group.length;i++)for(const next of adjacent.get(group[i]!)!)if(!seen.has(next)){seen.add(next);group.push(next);}
      group.sort((a,b)=>a-b);for(const member of group)netOf.set(member,id);groups.push(group);
    }
    this.key=key;this.rebuilds++;return this.topology={width:world.width,height:world.height,cells,sources,groups,netOf};
  }
}
export function validPowerParent(topology:PowerTopology,lamp:Cell,id:number):boolean {
  const source=topology.sources.get(id);if(!source)return false;
  // The search window intersects any occupied source cell; ranking uses its anchor.
  return source.x<=lamp.x+CONNECTION_RANGE&&source.x+1>=lamp.x-CONNECTION_RANGE
    &&source.z<=lamp.z+CONNECTION_RANGE&&source.z+1>=lamp.z-CONNECTION_RANGE;
}
export function bestPowerParent(topology:PowerTopology,lamp:Cell):number|null {
  let best:number|null=null,distance=Infinity;
  for(let z=Math.max(0,lamp.z-CONNECTION_RANGE);z<=Math.min(topology.height-1,lamp.z+CONNECTION_RANGE);z++)
    for(let x=Math.max(0,lamp.x-CONNECTION_RANGE);x<=Math.min(topology.width-1,lamp.x+CONNECTION_RANGE);x++) {
      const id=topology.cells.get(z*topology.width+x);if(id===undefined)continue;
      const source=topology.sources.get(id)!,d=(source.x-lamp.x)**2+(source.z-lamp.z)**2;
      if(d<distance){distance=d;best=id;}
    }
  return best;
}
export function connectedPowerGroups(world:World,topology:PowerTopology):Structure[][] {
  const byId=new Map(world.structures.map(s=>[s.id,s]));
  const groups=new Map(topology.groups.map(ids=>[ids[0]!,ids.map(id=>byId.get(id)!)]));
  for(const s of world.structures)if(s.kind!=='wood-generator'&&s.power?.parentId!=null) {
    const net=topology.netOf.get(s.power.parentId);if(net!==undefined)groups.get(net)!.push(s);
  }
  return [...groups.values()];
}
