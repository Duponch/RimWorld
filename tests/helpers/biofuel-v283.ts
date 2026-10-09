import { medicalCamp } from '../scenarios/health.ts';
import { fixturePower } from '../scenarios/power.ts';
import { newBuildingFuel } from '../../src/sim/fuel.ts';
import { newPowerState } from '../../src/sim/power-rules.ts';
import { RESEARCH_SCALE } from '../../src/sim/research.ts';
import type { Structure,WorkType } from '../../src/sim/types.ts';

/** Prepared industrial camp; recipes, transport and power still execute normally. */
export function biofuelCamp(){
  const world=medicalCamp(2,32);
  world.resources=[];world.jobs=[];world.piles=[];world.structures=[];world.packed=[];world.stockpiles=[];
  world.research={points:0,project:null,biofuelRefining:{points:700*RESEARCH_SCALE,completedAt:2900}};
  for(const p of world.pawns){
    delete p.health;delete p.background;delete p.traits;
    p.hunger=100;p.rest=100;p.mood=90;p.recreation.level=100;p.needCooldown=0;p.planCooldown=0;
    for(const work of Object.keys(p.priorities) as WorkType[])p.priorities[work]=0;
    p.priorities.haul=1;p.skills.construction={level:8,xp:0,dailyXp:0,passion:0};
  }
  Object.assign(world.pawns[0]!,{x:8,z:13});Object.assign(world.pawns[1]!,{x:8,z:16});
  const start=fixturePower(world,'wood-generator',11,11);
  const refinery:Structure={id:world.nextId++,kind:'biofuel-refinery',x:14,z:13,orientation:0,footprint:'standard',material:'steel',power:newPowerState('biofuel-refinery'),bills:[]};
  refinery.power!.parentId=start.id;refinery.power!.on=true;
  const generator:Structure={id:world.nextId++,kind:'chemfuel-generator',x:19,z:13,orientation:0,footprint:'standard',material:'steel',power:newPowerState('chemfuel-generator'),fuel:newBuildingFuel('chemfuel-generator')};
  world.structures.push(refinery,generator);world.events=[];
  return {world,refineryId:refinery.id,generatorId:generator.id,startGeneratorId:start.id};
}
