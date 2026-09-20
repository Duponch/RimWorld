import { rotAge, rotRateAtTemperature } from './food-preservation.ts';
import { TemperatureView } from './temperature.ts';
import { pawnContentsLocation,updateHumanCorpseTemperatures } from './human-corpses.ts';
import type { World } from './types.ts';
import type { ThermalLayout } from './thermal-topology.ts';

/** Checkpoint the old rate before adopting temperature at the actual new owner.
 * Warm piles keep their anchors: no age mutations or geometry rebuild per tick. */
export function updateFoodTemperatures(world:World,layout?:ThermalLayout):void {
  updateHumanCorpseTemperatures(world,layout);
  if(!world.piles.some(p=>p.rot)&&!world.wildlife?.animals.some(a=>a.corpseRot))return;
  const view=new TemperatureView(world,layout),pawns=new Map(world.pawns.map(p=>[p.id,p])),jobs=new Map(world.jobs.map(j=>[j.id,j]));
  for(const pile of world.piles)if(pile.rot) {
    if(pile.humanCorpse)continue;
    const o=pile.owner,owner='pawnId' in o?pawns.get(o.pawnId):undefined;
    const contents=owner?.body?pawnContentsLocation(world,owner):null;
    const cell=o.type==='ground'?o:owner?(contents?.cell??(owner.body?null:owner)):o.type==='job'?jobs.get(o.jobId):null;
    if(!cell)continue;
    const rate=contents?.suspended?0:rotRateAtTemperature(view.at(world,cell));
    if(rate===(pile.rot.rate??1))continue;
    pile.rot={progress:rotAge(pile,world.tick),atTick:world.tick,...rate!==1?{rate}:{}};
  }
  // Retained bodies have the same thermal timeline as already transferable
  // corpses, including commands changing a room between simulation ticks.
  for(const a of world.wildlife?.animals??[])if(a.corpseRot){
    const rot=a.corpseRot,rate=rotRateAtTemperature(view.at(world,a));
    if(rate!==(rot.rate??1))a.corpseRot={progress:rot.progress+(world.tick-rot.atTick)*(rot.rate??1),atTick:world.tick,...rate!==1?{rate}:{}};
  }
}
