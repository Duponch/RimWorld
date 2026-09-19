import { RoomTopologyCache } from './room-topology.ts';
import type { Cell,World } from './types.ts';

const caches=new WeakMap<World,RoomTopologyCache>();
/** Captured only inside one combat transaction. Bodies, furniture, water and
 * roofs do not seal sound; rock, walls and closed doors do. No navigation.
 * Connected air spaces replace the reference's proprietary region partition. */
export function impactSoundSpace(world:World):(from:Cell,to:Cell)=>boolean {
  let cache=caches.get(world);if(!cache){cache=new RoomTopologyCache();caches.set(world,cache);}
  const rooms=cache.read(world),open=new Set(world.structures.filter(s=>s.kind==='door'&&s.door?.open).map(s=>s.z*world.width+s.x));
  const links=new Map<number,number>();
  const root=(id:number):number=>{let r=id;while(links.has(r))r=links.get(r)!;return r;};
  const node=(c:Cell):number|undefined=>{const r=rooms.at(c.x,c.z);return r?.kind==='space'?r.id:r?.kind==='doorway'&&open.has(c.z*world.width+c.x)?-1-c.z*world.width-c.x:undefined;};
  for(const index of open){const x=index%world.width,z=Math.floor(index/world.width),a=-1-index;
    for(const c of [{x:x-1,z},{x:x+1,z},{x,z:z-1},{x,z:z+1}]){const b=node(c);if(b!==undefined){const ar=root(a),br=root(b);if(ar!==br)links.set(ar,br);}}
  }
  return (from,to)=>{const a=node(from),b=node(to);return a!==undefined&&b!==undefined&&root(a)===root(b);};
}
