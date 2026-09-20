import { applyCommand,createWorld } from '../../src/sim/index';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials';
import { newBuildingFuel } from '../../src/sim/fuel';
import type { World,Structure } from '../../src/sim/types';

/** Controlled engineering fixture; supplied materials are explicit, not a new
 * colony or evidence of an autonomous food economy. */
export function foodWorkstationCamp():World {
  const w=createWorld(8410,32,32);w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.jobs=[];w.piles=[];w.structures=[];w.stockpiles=[];w.packed=[];delete w.wildlife;delete w.arrivals;delete w.raids;delete w.heatwaves;delete w.roofing;delete w.thermal;
  w.pawns=w.pawns.slice(0,1);const p=w.pawns[0]!;Object.assign(p,{x:4,z:4,hunger:100,rest:100});p.schedule.fill('work');
  for(const work of Object.keys(p.priorities))p.priorities[work as keyof typeof p.priorities]=0;
  p.skills.construction.level=8;p.skills.cooking={level:10,xp:0,dailyXp:0,passion:1};refreshStock(w);return w;
}
/** The three structures must still be delivered and built by the worker. */
export function foodWorkstationConstructionFixture():World {
  const w=foodWorkstationCamp(),p=w.pawns[0]!;p.priorities.build=1;p.priorities.haul=2;
  for(const [x,n] of [[4,75],[5,75],[6,10]])addGroundMaterial(w,'steel',n!,{x:x!,z:6},'steel');
  addGroundMaterial(w,'component',2,{x:7,z:6},'component');addGroundMaterial(w,'wood',75,{x:4,z:7},'wood');addGroundMaterial(w,'wood',20,{x:5,z:7},'wood');refreshStock(w);
  for(const [kind,x] of [['fueled-stove',10],['electric-stove',15],['butcher-table',20]] as const) {
    const result=applyCommand(w,{type:'designate',kind,x,z:10,orientation:1,material:kind==='butcher-table'?'wood':'steel'});
    if(!result.ok)throw Error(`Food workstation fixture: ${result.reason}`);
  }
  return w;
}
/** Synthetic station for isolated boundaries only; construction pilot above
 * and the colony pilot exercise actual player construction. */
export function fixtureFoodStation(w:World,kind:'fueled-stove'|'electric-stove'|'butcher-table',x=10,z=10):Structure {
  const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:kind==='butcher-table'?'wood':'steel',bills:[]};
  if(kind==='fueled-stove')s.fuel=newBuildingFuel(kind);
  if(kind==='electric-stove')s.power={on:false,parentId:null};
  w.structures.push(s);return s;
}
