import { foodChainLoad,foodChainOutcomeErrors,foodChainSummary } from './food-chain-load.ts';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import { newBuildingFuel } from '../../src/sim/fuel.ts';
import { builtDoorState } from '../../src/sim/door-rules.ts';
import { reconcilePower } from '../../src/sim/power.ts';
import { reconcileTemperature,TemperatureView } from '../../src/sim/temperature.ts';
import { updateFoodTemperatures } from '../../src/sim/thermal-food.ts';
import { AIR_CONDITIONING_COST,BATTERIES_RESEARCH_COST,SOLAR_POWER_RESEARCH_COST } from '../../src/sim/research.ts';
import { BATTERY_ENERGY_SCALE,batteryWattDays } from '../../src/sim/power-battery.ts';
import { solarPowerOutput } from '../../src/sim/solar-rules.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import type { Structure,StructureKind,World } from '../../src/sim/types.ts';

export const ENERGY_START_TICK=2000;
export const ENERGY_PROTOCOL='Synthetic V85 load on a natural 250² map, retaining the V84 groups of six (two researchers, cook, grower, butcher, miner) and equally many wild hares. Every supplied stove is electric. Each work patch gains a prebuilt 4×4 solar panel, a battery starting at 120Wd, a fueled wood generator, a physical switch initially open with an ordinary close job, and cardinal conduits to a closed 3×3 cold store containing supplied rice. Growers also perform Basic work. Crops, corpses, material stocks, completed prerequisite research and battery charge are prepared inputs, not earned colony progress. Daylight charging and physical switching are measured; the separate natural colony journey proves nighttime drain, mining, research and construction. No wind, fire or weather fidelity is implied.';

/** Existing mixed work remains in place. Only benchmark preparation mutates
 * inputs; the timed interval calls the unmodified simulation/worker. */
export function energyLoad(count:number):World {
  const w=foodChainLoad(count),roofs=new Set(w.roofing?.constructed);
  w.research!.airConditioning={points:AIR_CONDITIONING_COST,completedAt:w.tick};
  w.research!.batteries={points:BATTERIES_RESEARCH_COST,completedAt:w.tick};
  w.research!.solarPower={points:SOLAR_POWER_RESEARCH_COST,completedAt:w.tick};
  const add=(kind:StructureKind,x:number,z:number):Structure=>{const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:kind==='wall'||kind==='door'?'wood':'steel'};w.structures.push(s);return s;};
  for(let group=0;group<Math.ceil(count/6);group++){
    const x=151+group%4*20,z=111+Math.floor(group/4)*15,stove=w.structures.find(s=>s.x===x&&s.z===z&&(s.kind==='fueled-stove'||s.kind==='electric-stove'))!;
    if(stove){stove.kind='electric-stove';delete stove.fuel;stove.power={on:false,parentId:null};}
    let generator=w.structures.find(s=>s.kind==='wood-generator'&&s.x===x+4&&s.z===z);
    if(!generator){generator=add('wood-generator',x+4,z);generator.power={on:true,parentId:null};generator.fuel={...newBuildingFuel('wood-generator'),ticks:45000,autoRefuel:false};}
    const solar=add('solar-generator',x,z+4);solar.power={on:true,parentId:null};
    const battery=add('battery',x+4,z+5);battery.power={on:false,parentId:null};battery.battery={stored:120*BATTERY_ENERGY_SCALE};
    const sw=add('power-switch',x+4,z+3);sw.power={on:false,parentId:null,switchOn:false};
    for(const c of [{x:x+4,z:z+2},...[4,5,6,7,8,9].map(dx=>({x:x+dx,z:z+4}))]){const wire=add('power-conduit',c.x,c.z);wire.power={on:false,parentId:null};}
    for(let dz=4;dz<=8;dz++)for(let dx=9;dx<=13;dx++){
      roofs.add((z+dz)*w.width+x+dx);
      if(dx>9&&dx<13&&dz>4&&dz<8)continue;
      const kind=dx===11&&dz===4?'cooler':dx===13&&dz===6?'door':'wall',s=add(kind,x+dx,z+dz);
      if(kind==='door')s.door=builtDoorState(w,s);
      if(kind==='cooler'){s.power={on:false,parentId:null};s.cooler={target:-5,high:true};}
    }
    addGroundMaterial(w,'food',50,{x:x+11,z:z+6},'rice');
    const grower=w.pawns[group*6+2];if(grower)grower.priorities.basic=1;
    const result=applyCommand(w,{type:'power-flick',structureId:sw.id,on:true});if(!result.ok)throw Error(`Energy switch: ${result.reason}`);
  }
  w.roofing={constructed:[...roofs].sort((a,b)=>a-b),build:[],remove:[],cursor:0};
  reconcilePower(w);const layout=reconcileTemperature(w);updateFoodTemperatures(w,layout);refreshStock(w);
  const errors=validateWorld(w);if(errors.length)throw Error(`Invalid energy load: ${errors.join('; ')}`);return w;
}
export function energyLoadSummary(w:World,initialCropIds:readonly number[]){
  const temperature=new TemperatureView(w);
  return {food:foodChainSummary(w,initialCropIds),batteries:w.structures.filter(s=>s.battery).map(s=>({id:s.id,storedWd:batteryWattDays(s.battery!)})),solar:w.structures.filter(s=>s.kind==='solar-generator').map(s=>({id:s.id,watts:solarPowerOutput(w,s)})),switches:w.structures.filter(s=>s.kind==='power-switch').map(s=>({id:s.id,on:s.power?.switchOn!==false,pending:w.jobs.some(j=>j.flick?.structureId===s.id)})),conduits:w.structures.filter(s=>s.kind==='power-conduit').length,coolers:w.structures.filter(s=>s.kind==='cooler').map(s=>({id:s.id,powered:s.power?.on===true,temperature:temperature.at(w,{x:s.x,z:s.z+2})}))};
}
export function energyLoadOutcomeErrors(w:World,initialCropIds:readonly number[]):string[]{
  const s=energyLoadSummary(w,initialCropIds),errors=foodChainOutcomeErrors(w,initialCropIds);
  if(s.batteries.some(b=>b.storedWd<=120))errors.push('A supplied solar battery did not gain stored energy');
  if(s.switches.some(q=>!q.on||q.pending))errors.push('An ordinary switch close job did not finish');
  if(s.coolers.some(q=>!q.powered||q.temperature>0))errors.push('A supplied cold store did not reach freezing');
  if(s.solar.some(q=>q.watts<=0))errors.push('A daylight solar panel has no potential output');
  return errors;
}
