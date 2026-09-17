import { rotAge, rotRateAtTemperature } from './food-preservation.ts';
import { TemperatureView } from './temperature.ts';
import type { World } from './types.ts';
import type { ThermalLayout } from './thermal-topology.ts';

/** Checkpoint the old rate before adopting temperature at the actual new owner.
 * Warm piles keep their anchors: no age mutations or geometry rebuild per tick. */
export function updateFoodTemperatures(world:World,layout?:ThermalLayout):void {
  if(!world.piles.some(p=>p.rot))return;
  const view=new TemperatureView(world,layout),pawns=new Map(world.pawns.map(p=>[p.id,p])),jobs=new Map(world.jobs.map(j=>[j.id,j]));
  for(const pile of world.piles)if(pile.rot) {
    const o=pile.owner,cell=o.type==='ground'?o:o.type==='pawn'||o.type==='equipment'?pawns.get(o.pawnId):jobs.get(o.jobId);
    if(!cell)continue;
    const rate=rotRateAtTemperature(view.at(world,cell));
    if(rate===(pile.rot.rate??1))continue;
    pile.rot={progress:rotAge(pile,world.tick),atTick:world.tick,...rate!==1?{rate}:{}};
  }
}
