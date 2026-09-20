import { RoomTopologyCache } from './room-topology.ts';
import { isGrowingTerrain } from './soil.ts';
import type { Cell,World } from './types.ts';

const caches=new WeakMap<World,RoomTopologyCache>();

/** Terrain-only cleanliness at the actual treatment location. Core's room
 * statistics require an enclosure, not a roof; a doorway is a separate space.
 * Object cleanliness and its proprietary 60-region cutoff remain unmodeled. */
export function infectionRoomFactor(world:World,cell:Cell):number {
  let cache=caches.get(world);
  if(!cache){cache=new RoomTopologyCache();caches.set(world,cache);}
  const topology=cache.read(world),room=topology.at(cell.x,cell.z);
  if(room?.kind!=='space'||room.touchesMapEdge)return 1000;
  const root=cell.z*world.width+cell.x,seen=new Set<number>([root]),queue=[root];
  let cleanliness=0;
  for(let head=0;head<queue.length;head++) {
    const i=queue[head]!,x=i%world.width,z=Math.floor(i/world.width);
    // Ordinary/rich soil and gravel are -1; exposed rock and ordinary water
    // have no cleanliness offset in the retained natural-terrain definitions.
    const terrain=world.tiles[i]!.terrain;
    cleanliness+=isGrowingTerrain(terrain)?-1:0;
    for(const c of [{x:x-1,z},{x:x+1,z},{x,z:z-1},{x,z:z+1}]) {
      const index=c.z*world.width+c.x,neighbor=topology.at(c.x,c.z);
      if(neighbor?.kind==='space'&&neighbor.id===room.id&&!seen.has(index)){seen.add(index);queue.push(index);}
    }
  }
  const average=cleanliness/queue.length;
  // InfectionChanceFactor curve (-5,1), (0,.5), (1,.2), clamped at endpoints.
  return Math.round(1000*(average<=-5?1:average<=0?.5-average*.1:average<=1?.5-average*.3:.2));
}
