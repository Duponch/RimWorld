import {foodWorkstationCamp} from './food-workstations.ts';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials.ts';
import {newPowerState} from '../../src/sim/power-rules.ts';
import {projectProgress,researchCost} from '../../src/sim/research.ts';
import {SHIP_REACTOR_CONSTRUCTION_275} from '../../src/sim/ship-reactor-content-275.ts';
import type {Structure} from '../../src/sim/types.ts';

export const SHIP_REACTOR_PREPARATION_275=Object.freeze({
 source:'foodWorkstationCamp/createWorld8410,32×32',
 prepared:'Discovered flat workshop, one healthy adult with Construction8, full initial needs, work schedule, Build1/Haul2; completed industrial and ship research; one normal wooden bed and one unpowered lamp already owned; finite350steel/280plasteel/70uranium/8advanced-components and80survival meals. No reactor, plan, hauling, progress, startup or PRNG outcome is prepared.',
 ingredients:SHIP_REACTOR_CONSTRUCTION_275.ingredients,
});
export const SHIP_REACTOR_PLAN_275=Object.freeze({type:'designate' as const,kind:'ship-reactor' as const,x:20,z:20,orientation:1 as const,material:'steel' as const});

/** One finite declared engineering fixture. Actual caller must designate,
 * carry and perform every construction tick; this helper never steps SIM. */
export function shipReactorWorkshop275(){
 const w=foodWorkstationCamp(),p=w.pawns[0]!;
 w.deterioration!.lastTick=w.tick;if(w.fires)w.fires.clockCore=w.tick*10;
 delete p.background;delete p.traits;p.recreation.level=100;p.skills.construction.level=8;p.priorities.build=1;p.priorities.haul=2;
 w.research={project:null,points:0};
 for(const id of ['smithing','machining','microelectronics','multi-analyzer','fabrication','advanced-fabrication','ship-basics','ship-reactor'] as const){
  const progress=projectProgress(w.research,id);progress.points=researchCost(id);progress.completedAt=w.tick;
 }
 const bed:Structure={id:w.nextId++,kind:'bed',x:6,z:6,orientation:0,footprint:'standard',material:'wood',quality:'normal'};
 const lamp:Structure={id:w.nextId++,kind:'standing-lamp',x:26,z:19,orientation:0,footprint:'standard',material:'steel',power:newPowerState('standing-lamp')};
 w.structures.push(bed,lamp);
 for(const [i,{item,quantity}] of SHIP_REACTOR_CONSTRUCTION_275.ingredients.entries())addGroundMaterial(w,item,quantity,{x:11+i,z:15},item);
 addGroundMaterial(w,'food',80,{x:4,z:5},'survival-meal');refreshStock(w);
 return {w,builderId:p.id,bedId:bed.id,lampId:lamp.id,plan:SHIP_REACTOR_PLAN_275};
}
