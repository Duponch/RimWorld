import {medicalCamp} from './health.ts';
import {prepareConstructionFlora} from './construction-flora-v348.ts';
import {fixtureBuilding} from './deconstruction.ts';
import {TREE_SOWING_COST_291} from '../../src/sim/forestry-content-291.ts';
import {refreshStock} from '../../src/sim/materials.ts';
import type {World} from '../../src/sim/types.ts';

/** Declared 32² fixture. The completed research option isolates paid sowing;
 * it is not evidence of played research, arrival or forest growth. */
export function forestryCamp471(research=true):World{
 const world=medicalCamp(1,32),pawn=world.pawns[0]!;
 prepareConstructionFlora(world);
 Object.assign(pawn,{x:9,z:10,name:'Salomé',hunger:100,rest:100,state:'idle',jobId:null,haul:null,need:null,path:[],planCooldown:0});
 pawn.skills.plants={level:8,xp:0,dailyXp:0,passion:0};pawn.priorities.grow=1;pawn.priorities.haul=2;pawn.schedule.fill('work');
 Object.assign(fixtureBuilding(world,'research-bench',8,14),{material:'steel' as const});
 world.growingZones=[{id:world.nextId++,plant:research?'poplar':'rice',cells:[10*32+12],allowSow:true,allowCut:true}];
 world.research={points:0,project:null,...(research?{treeSowing291:{points:TREE_SOWING_COST_291,completedAt:world.tick}}:{})};
 refreshStock(world);return world;
}
