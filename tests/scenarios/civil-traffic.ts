import { applyCommand, createWorld } from '../../src/sim/engine.ts';
import { refreshStock } from '../../src/sim/materials.ts';
import type { World } from '../../src/sim/types.ts';

/** Synthetic one-cell corridor: two sleepers must exchange ends while a third
 * sleeps in the middle. Beds are fixtures; assignments use real commands. */
export function civilCrossingFixture(): World {
  const w=createWorld(42,16,16);w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'rock'}));
  w.resources=[];w.piles=[];w.structures=[];w.jobs=[];w.stockpiles=[];
  for(let x=1;x<=14;x++)w.tiles[8*w.width+x]={terrain:'grass'};
  for(const x of [1,8,14]) {
    w.tiles[9*w.width+x]={terrain:'grass'};
    w.structures.push({id:w.nextId++,kind:'bed',x,z:8,orientation:0,footprint:'standard'});
  }
  w.pawns.forEach((p,i)=>{
    Object.assign(p,{x:[2,13,8][i]!,z:8,hunger:100,rest:10,priorities:{gather:0,build:0,haul:0,grow:0,cook:0}});
    p.schedule.fill('anything');
    if(!applyCommand(w,{type:'assign-bed',bedId:w.structures[[2,0,1][i]!]!.id,pawnId:p.id}).ok)throw new Error('Invalid bed assignment fixture');
  });
  refreshStock(w);return w;
}
