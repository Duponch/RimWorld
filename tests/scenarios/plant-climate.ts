import { createWorld, refreshStock } from '../../src/sim/index.ts';
import { reconcileTemperature } from '../../src/sim/temperature.ts';
import { updatePlantTemperatures } from '../../src/sim/thermal-plants.ts';

/** Synthetic cold air, not a player-buildable cooler. Three roof openings keep
 * a 16-cell room indoors, with natural light for the rice at (4,4). */
export function plantClimateFixture(temperature=3) {
  const w=createWorld(81,32,32);w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[];w.piles=[];w.jobs=[];
  w.pawns=w.pawns.slice(0,1);Object.assign(w.pawns[0]!,{x:3,z:4,hunger:100,rest:100});w.pawns[0]!.recreation.level=100;w.pawns[0]!.schedule.fill('anything');
  for(let z=2;z<=7;z++)for(let x=2;x<=7;x++)if(x===2||x===7||z===2||z===7)w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard'});
  const cells=[];for(let z=3;z<=6;z++)for(let x=3;x<=6;x++)if(!((z===4&&(x===4||x===5))||(z===5&&x===4)))cells.push(z*32+x);
  w.roofing={constructed:cells,build:[],remove:[],cursor:0};
  w.resources=[{id:w.nextId++,kind:'rice',x:4,z:4,amount:6,growth:.2,growthTick:w.tick}];
  refreshStock(w);const layout=reconcileTemperature(w);w.thermal!.regions[0]!.temperature=temperature;updatePlantTemperatures(w,layout);return w;
}
