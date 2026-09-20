import { footprintCells } from './definitions.ts';
import { CONNECTION_RANGE } from './power-rules.ts';
import { allowsWireConnection, isPowerConnector, transmitsPowerNow } from './power-grid.ts';
import type { Cell, Structure, World } from './types.ts';

interface PowerFootprint { readonly minX:number;readonly maxX:number;readonly minZ:number;readonly maxZ:number }

export interface PowerTopology {
  readonly cells:ReadonlyMap<number,number>;
  readonly sources:ReadonlyMap<number,Readonly<Cell>>;
  readonly footprints:ReadonlyMap<number,PowerFootprint>;
  readonly wireParents:ReadonlySet<number>;
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
    const transmitters=world.structures.filter(transmitsPowerNow);
    const key=`${world.width}:${world.height}|`+transmitters.map(s=>`${s.id}:${s.kind}:${s.x}:${s.z}:${s.orientation}:${s.footprint}`).join('|');
    if(this.topology&&key===this.key)return this.topology;
    const cells=new Map<number,number>(),sources=new Map<number,Cell>(),adjacent=new Map<number,Set<number>>();
    const footprints=new Map<number,PowerFootprint>(),wireParents=new Set<number>();
    for(const s of transmitters) {
      sources.set(s.id,{x:s.x,z:s.z});adjacent.set(s.id,new Set());
      if(allowsWireConnection(s.kind))wireParents.add(s.id);
      const footprint=footprintCells(s);
      footprints.set(s.id,{minX:Math.min(...footprint.map(c=>c.x)),maxX:Math.max(...footprint.map(c=>c.x)),minZ:Math.min(...footprint.map(c=>c.z)),maxZ:Math.max(...footprint.map(c=>c.z))});
      for(const c of footprint)cells.set(c.z*world.width+c.x,s.id);
    }
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
    this.key=key;this.rebuilds++;return this.topology={width:world.width,height:world.height,cells,sources,footprints,wireParents,groups,netOf};
  }
}
export function validPowerParent(topology:PowerTopology,lamp:Cell,id:number):boolean {
  const bounds=topology.footprints.get(id);if(!bounds||!topology.wireParents.has(id))return false;
  // The search window intersects any occupied source cell; ranking uses its anchor.
  return bounds.minX<=lamp.x+CONNECTION_RANGE&&bounds.maxX>=lamp.x-CONNECTION_RANGE
    &&bounds.minZ<=lamp.z+CONNECTION_RANGE&&bounds.maxZ>=lamp.z-CONNECTION_RANGE;
}
export function bestPowerParent(topology:PowerTopology,lamp:Cell,disallowedNets?:ReadonlySet<number>):number|null {
  let best:number|null=null,distance=Infinity;
  for(let z=Math.max(0,lamp.z-CONNECTION_RANGE);z<=Math.min(topology.height-1,lamp.z+CONNECTION_RANGE);z++)
    for(let x=Math.max(0,lamp.x-CONNECTION_RANGE);x<=Math.min(topology.width-1,lamp.x+CONNECTION_RANGE);x++) {
      const id=topology.cells.get(z*topology.width+x);if(id===undefined||!topology.wireParents.has(id)||disallowedNets?.has(topology.netOf.get(id)!))continue;
      const source=topology.sources.get(id)!,d=(source.x-lamp.x)**2+(source.z-lamp.z)**2;
      if(d<distance){distance=d;best=id;}
    }
  return best;
}
export function connectedPowerGroups(world:World,topology:PowerTopology):Structure[][] {
  const byId=new Map(world.structures.map(s=>[s.id,s]));
  const groups=new Map(topology.groups.map(ids=>[ids[0]!,ids.map(id=>byId.get(id)!)]));
  for(const s of world.structures)if(isPowerConnector(s.kind)&&s.power?.parentId!=null) {
    const net=topology.netOf.get(s.power.parentId);if(net!==undefined)groups.get(net)!.push(s);
  }
  return [...groups.values()];
}
