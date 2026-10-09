import { medicalCamp } from '../scenarios/health.ts';
import { fixturePower } from '../scenarios/power.ts';
import { addGroundMaterial } from '../../src/sim/materials.ts';
import { RESEARCH_SCALE } from '../../src/sim/research.ts';
import type { Structure,WorkType } from '../../src/sim/types.ts';

/** A prepared kitchen; hauling, retrieval and ingestion are still ordinary work. */
export function pasteCamp(units=12){
  const world=medicalCamp(2,32);
  world.resources=[];world.jobs=[];world.piles=[];world.structures=[];world.packed=[];world.stockpiles=[];
  world.research={points:0,project:null,nutrientPaste:{points:400*RESEARCH_SCALE,completedAt:2900}};
  for(const p of world.pawns){
    delete p.health;delete p.background;delete p.traits;
    p.hunger=100;p.rest=100;p.mood=90;p.recreation.level=100;p.needCooldown=0;p.planCooldown=0;
    for(const work of Object.keys(p.priorities) as WorkType[])p.priorities[work]=0;
    p.priorities.haul=1;p.skills.construction={level:8,xp:0,dailyXp:0,passion:0};
  }
  Object.assign(world.pawns[0]!,{x:8,z:13});Object.assign(world.pawns[1]!,{x:8,z:16});
  const generator=fixturePower(world,'wood-generator',11,11);
  const dispenser:Structure={id:world.nextId++,kind:'nutrient-paste-dispenser',x:14,z:13,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:generator.id}};
  const hopper:Structure={id:world.nextId++,kind:'hopper',x:12,z:13,orientation:0,footprint:'standard',material:'steel'};
  world.structures.push(dispenser,hopper);
  if(units)addGroundMaterial(world,'food',units,{x:9,z:13},'rice');
  world.events=[];
  return {world,dispenserId:dispenser.id,hopperId:hopper.id,generatorId:generator.id};
}
