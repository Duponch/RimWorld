import { medicalCamp } from '../scenarios/health.ts';
import { fixturePower } from '../scenarios/power.ts';
import { adoptDeepResources,addDeepDeposit } from '../../src/sim/deep-resources.ts';
import { DEEP_DRILLING_RESEARCH_COST,GROUND_SCANNER_RESEARCH_COST,MICROELECTRONICS_RESEARCH_COST } from '../../src/sim/research.ts';
import type { Structure } from '../../src/sim/types.ts';

/** Physical, powered economy with no precommitted operator or production. */
export function deepDrillingCamp(size=32){
  const world=medicalCamp(2,size);world.resources=[];world.jobs=[];world.piles=[];world.structures=[];world.packed=[];
  world.research={points:0,project:null,microelectronics:{points:MICROELECTRONICS_RESEARCH_COST,completedAt:2900},
    deepDrilling:{points:DEEP_DRILLING_RESEARCH_COST,completedAt:2910},groundScanner:{points:GROUND_SCANNER_RESEARCH_COST,completedAt:2920}};
  const miner=world.pawns[0]!,researcher=world.pawns[1]!;
  for(const p of world.pawns){delete p.health;delete p.background;delete p.traits;
    p.hunger=100;p.rest=100;p.mood=90;p.recreation.level=100;p.skills.mining={level:8,xp:0,dailyXp:0,passion:1};p.skills.intellectual={level:8,xp:0,dailyXp:0,passion:1};}
  Object.assign(miner,{x:7,z:8});miner.priorities.mine=1;
  Object.assign(researcher,{x:8,z:8});researcher.priorities.research=1;
  const generator=fixturePower(world,'wood-generator',12,13);
  const drill:Structure={id:world.nextId++,kind:'deep-drill',x:16,z:16,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:generator.id}};
  const scanner:Structure={id:world.nextId++,kind:'ground-scanner',x:12,z:17,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:generator.id}};
  world.structures.push(drill,scanner);adoptDeepResources(world);addDeepDeposit(world,'steel',[drill]);world.events=[];
  return {world,minerId:miner.id,researcherId:researcher.id,drillId:drill.id,scannerId:scanner.id,generatorId:generator.id};
}
