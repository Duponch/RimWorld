import { plantClimateFixture } from './plant-climate.ts';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials.ts';
import { reconcileTemperature } from '../../src/sim/temperature.ts';
import { newBuildingFuel } from '../../src/sim/fuel.ts';
import type { World,Structure } from '../../src/sim/types.ts';

/** Initial warm closed room, materials and healthy worker. No runtime state
 * injection: the actual building, hauling and air exchange follow commands. */
export function passiveCoolingFixture():World {
  const w=plantClimateFixture(35);w.resources=[];
  for(const s of [...w.structures,...w.pawns]){s.x+=12;s.z+=12;}
  w.thermal=undefined;
  w.roofing!.constructed=[];
  for(let z=15;z<=18;z++)for(let x=15;x<=18;x++)w.roofing!.constructed.push(z*w.width+x);
  w.pawns[0]!.priorities={mine:0,gather:0,build:1,haul:1,grow:0,cook:0,craft:0};
  addGroundMaterial(w,'wood',75,{x:18,z:18},'wood');addGroundMaterial(w,'food',10,{x:18,z:17},'rice');refreshStock(w);
  reconcileTemperature(w);w.thermal!.regions[0]!.temperature=35;return w;
}
export function fixtureCooler(w:World):Structure {
  const s:Structure={id:w.nextId++,kind:'passive-cooler',material:'wood',x:16,z:16,orientation:0,footprint:'standard',fuel:newBuildingFuel('passive-cooler')};
  w.structures.push(s);return s;
}
