import { foodWorkstationCamp } from './food-workstations';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials';
import { newPowerState } from '../../src/sim/power-rules';
import { reconcilePower } from '../../src/sim/power';
import { reconcileTemperature } from '../../src/sim/temperature';
import { startFire } from '../../src/sim/fire';
import { BATTERY_ENERGY_SCALE } from '../../src/sim/power-battery';
import { BATTERIES_RESEARCH_COST } from '../../src/sim/research';
import { newDoorState } from '../../src/sim/door-rules';
import type { Cell, Structure, World } from '../../src/sim/types';

/** Short, explicit engineering checkpoint: the room, wire and charged battery
 * already exist. Heater and turbine must be paid for and built by a colon.
 * A deliberately ignited isolated pile tests the rare firefighting interaction;
 * this is not a natural colony, an observed storm or a completed winter. */
export function environmentUiFixture(): {world:World; actorId:number; batteryId:number; treeId:number; fireId:number; heater:Cell; turbine:Cell} {
  const world = foodWorkstationCamp(), actor = world.pawns[0]!;
  actor.name = 'Technicienne'; actor.x = 14; actor.z = 18;
  actor.priorities.build = 1; actor.priorities.basic = 1; actor.priorities.gather = 2; actor.priorities.haul = 3;
  delete world.home;
  const add = (kind:Structure['kind'], x:number, z:number):Structure => {
    const structure:Structure = {id:world.nextId++,kind,x,z,orientation:0,footprint:'standard',material:kind==='wall'||kind==='door'?'wood':'steel'};
    world.structures.push(structure); return structure;
  };
  for(let z=8;z<=12;z++)for(let x=5;x<=9;x++)if(x===5||x===9||z===8||z===12){
    const s=add(x===9&&z===10?'door':'wall',x,z);
    if(s.kind==='door')s.door=newDoorState(world.tick);
  }
  world.roofing={constructed:Array.from({length:5},(_,dz)=>Array.from({length:5},(_,dx)=>(8+dz)*world.width+5+dx)).flat().sort((a,b)=>a-b),build:[],remove:[],cursor:0};
  const battery=add('battery',10,12);battery.power=newPowerState('battery');battery.battery={stored:200*BATTERY_ENERGY_SCALE};
  world.research={project:null,points:0,batteries:{points:BATTERIES_RESEARCH_COST,completedAt:world.tick}};
  for(let x=11;x<=17;x++){const cable=add('power-conduit',x,12);cable.power=newPowerState('power-conduit');}
  const tree={id:world.nextId++,kind:'tree' as const,x:22,z:12,amount:12};world.resources.push(tree);
  addGroundMaterial(world,'steel',75,{x:13,z:16},'steel');addGroundMaterial(world,'steel',75,{x:14,z:16},'steel');
  addGroundMaterial(world,'component',3,{x:15,z:16},'component');addGroundMaterial(world,'food',8,{x:16,z:16},'survival-meal');
  addGroundMaterial(world,'wood',20,{x:14,z:20},'wood');
  if(!startFire(world,{x:14,z:20},.2))throw Error('Environment fixture ignition failed.');
  reconcileTemperature(world);for(const room of world.thermal?.regions??[])room.temperature=0;
  reconcilePower(world);refreshStock(world);
  return {world,actorId:actor.id,batteryId:battery.id,treeId:tree.id,fireId:world.fires!.items[0]!.id,heater:{x:7,z:10},turbine:{x:18,z:12}};
}
