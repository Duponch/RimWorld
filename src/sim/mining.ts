import { STEEL_ORE, minedFloor } from './ore.ts';
import { PICK_DAMAGE, PICK_TICKS, CHUNK_CHANCE, rockMaxHP, chunkItem } from './mining-rules.ts';
import { addMaterial } from './materials.ts';
import { groundCapacity } from './ground-placement.ts';
import type { Job, Pawn, World } from './types.ts';

/** Returns true after excavation. Rock damage belongs to the tile, pick cadence
 * to the reserved job. Preview the RNG/drop before committing the final hit. */
export function advanceMining(world:World,pawn:Pawn,job:Job):boolean {
  const i=job.z*world.width+job.x,tile=world.tiles[i]!;
  if(tile.terrain!=='rock')return false;
  pawn.path=[];pawn.state='working';
  if(++job.progress<PICK_TICKS)return false;
  job.progress=0;
  const damage=(tile.miningDamage??0)+PICK_DAMAGE;
  if(damage<rockMaxHP(tile)){world.tiles[i]={...tile,miningDamage:damage};return false;}
  let rng=world.rng;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;rng>>>=0;
  const quantity=tile.ore ? STEEL_ORE.yield : rng/0x100000000<CHUNK_CHANCE?1:0;
  const item=tile.ore?'steel':chunkItem(tile),kind=tile.ore?'steel':'chunk';
  // A solid cell cannot contain an item. Validate the future floor in an isolated
  // one-cell view, retaining all live destination/service reservations.
  const floor=minedFloor(tile);
  if(quantity) {
    if(world.piles.length>=32768||!Number.isSafeInteger(world.nextId+1))return false;
    const tiles=world.tiles.slice();tiles[i]=floor;
    if(groundCapacity({...world,tiles},job,item)<quantity)return false;
  }
  world.tiles[i]=floor;world.rng=rng;
  if(quantity)addMaterial(world,kind,quantity,{type:'ground',x:job.x,z:job.z},item);
  return true;
}
