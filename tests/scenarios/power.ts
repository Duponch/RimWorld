import { miningCamp } from './mining.ts';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials.ts';
import { newBuildingFuel } from '../../src/sim/fuel.ts';
import { newPowerState } from '../../src/sim/power-rules.ts';
import type { World,Structure } from '../../src/sim/types.ts';

export function powerFixture():World {
  const w=miningCamp();w.tick=2000;
  w.pawns[0]!.priorities={ doctor:0,build:1,haul:2,mine:0,gather:0,grow:0,cook:0,craft:0};
  addGroundMaterial(w,'steel',75,{x:11,z:14},'steel');addGroundMaterial(w,'steel',45,{x:12,z:14},'steel');
  addGroundMaterial(w,'component',2,{x:13,z:14},'component');addGroundMaterial(w,'wood',75,{x:14,z:14},'wood');
  refreshStock(w);return w;
}
export function fixturePower(w:World,kind:'wood-generator'|'standing-lamp',x:number,z:number):Structure {
  const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'steel',power:newPowerState(kind)};
  if(kind==='wood-generator'){s.fuel=newBuildingFuel(kind);s.fuel.ticks=45000;}
  w.structures.push(s);return s;
}
