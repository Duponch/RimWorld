import { stepWorld } from '../../src/sim/index.ts';
import { newPowerState,isPowerActive } from '../../src/sim/power-rules.ts';
import { newBuildingFuel } from '../../src/sim/fuel.ts';
import { COMPLEX_FURNITURE_RESEARCH_COST,TUBE_TELEVISION_RESEARCH_COST } from '../../src/sim/research.ts';
import { RECREATION_KINDS } from '../../src/sim/recreation-rules.ts';
import { televisionWatchCells } from '../../src/sim/television-recreation.ts';
import type { Orientation,Structure,World } from '../../src/sim/types.ts';
import { deconstructionCamp,fixtureBuilding } from './deconstruction.ts';

export function unlockedTelevisionResearch(w:World):void {
  w.research={project:null,points:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:0},tubeTelevision:{points:TUBE_TELEVISION_RESEARCH_COST,completedAt:0}};
}
export function addTelevision(w:World,x=15,z=12,orientation:Orientation=0):Structure {
  const tv:Structure={id:w.nextId++,kind:'tube-television',material:'steel',x,z,orientation,footprint:'standard',power:newPowerState('tube-television')};
  w.structures.push(tv);return tv;
}
export function addTelevisionSeat(w:World,x:number,z:number,orientation:Orientation=2):Structure {
  const seat:Structure={...fixtureBuilding(w,'stool',x,z,orientation),material:'wood'};
  w.structures[w.structures.length-1]=seat;return seat;
}
/** Prepared engineering setup, not evidence of physical construction. The
 * power engine establishes supply before callers authorize any recreation. */
export function prepareTelevisionWorld(count=3,seatCount=count,powered=true,size=32):World {
  const w=deconstructionCamp(count,size);w.tick=3000;unlockedTelevisionResearch(w);
  w.stockpiles=[];w.growingZones=[];delete w.wildlife;delete w.arrivals;delete w.raids;
  delete w.heatwaves;delete w.roofing;delete w.thermal;
  for(const [i,p] of w.pawns.entries()){
    p.x=3+i%10;p.z=5+Math.floor(i/10)*2;p.schedule.fill('work');p.hunger=100;p.rest=100;
    for(const key of Object.keys(p.priorities))p.priorities[key as keyof typeof p.priorities]=0;
    for(const kind of RECREATION_KINDS){p.recreation.tolerance[kind]=kind==='television'?0:80;p.recreation.bored[kind]=kind!=='television';}
  }
  const tv=addTelevision(w);
  for(const cell of televisionWatchCells(tv).slice(0,seatCount))addTelevisionSeat(w,cell.x,cell.z);
  if(powered){
    const generator:Structure={id:w.nextId++,kind:'wood-generator',x:11,z:11,orientation:0,footprint:'standard',material:'steel',power:newPowerState('wood-generator'),fuel:newBuildingFuel('wood-generator')};
    generator.fuel!.ticks=45000;w.structures.push(generator);
    stepWorld(w,30);
    if(!isPowerActive(tv))throw new Error('Prepared TV supply did not start through the power engine.');
  }
  return w;
}
