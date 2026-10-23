import {captureStandability} from './furniture-travel.ts';
import {RoomTopologyCache,type RoomTopology} from './room-topology.ts';
import {isRoofed} from './roof-rules.ts';
import type {Cell,World} from './types.ts';
import type {RecreationTask} from './recreation-rules.ts';

const caches=new WeakMap<World,RoomTopologyCache>();
export function partyTopology292(world:World,topology?:RoomTopology):RoomTopology {
 if(topology)return topology;
 let cache=caches.get(world);if(!cache){cache=new RoomTopologyCache();caches.set(world,cache);}return cache.read(world);
}
/** At most 197 stationary positions, in stable nearest-first order. */
export function partyCells292(center:Cell):Cell[] {
 const cells:Cell[]=[];
 for(let z=-8;z<=8;z++)for(let x=-8;x<=8;x++)if(x*x+z*z<=64)cells.push({x:center.x+x,z:center.z+z});
 return cells.sort((a,b)=>(a.x-center.x)**2+(a.z-center.z)**2-((b.x-center.x)**2+(b.z-center.z)**2)||a.z-b.z||a.x-b.x);
}
export function partyArea292(world:World,site:Cell,target:Cell,topology:RoomTopology):boolean {
 const room=topology.at(site.x,site.z),other=topology.at(target.x,target.z);
 if(room?.kind!=='space'||other?.kind!=='space'||room.id!==other.id)return false;
 const smallInterior=!room.touchesMapEdge&&room.cellCount<=100&&isRoofed(world,site.z*world.width+site.x);
 return smallInterior||(site.x-target.x)**2+(site.z-target.z)**2<=18*18;
}
export interface PartySpace292 {topology:RoomTopology;standable:(cell:Cell)=>boolean;cells:Cell[]}
/** Pass-local only: no topology read or complete furniture capture per member. */
export function capturePartySpace292(world:World,site:Cell,topology?:RoomTopology):PartySpace292 {
 const rooms=partyTopology292(world,topology),standable=captureStandability(world);
 return {topology:rooms,standable,cells:partyCells292(site).filter(c=>standable(c)&&partyArea292(world,site,c,rooms))};
}
export function partyTaskSiteValid292(world:World,task:RecreationTask,topology?:RoomTopology,standable=captureStandability(world)):boolean {
 const active=world.party292?.active;
 return world.schemaVersion===292&&task.activity==='party'&&!!active&&task.partyStartedAtCore===active.startedAtCore
  &&task.buildingId===null&&standable(active.site)&&standable(task.target)&&partyArea292(world,active.site,task.target,partyTopology292(world,topology));
}
