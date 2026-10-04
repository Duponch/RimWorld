import {applyCommand} from '../../src/sim/index.ts';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials.ts';
import {PACKAGED_SURVIVAL_MEALS_RESEARCH_COST} from '../../src/sim/research.ts';
import type {World} from '../../src/sim/types.ts';
import {foodWorkstationCamp,fixtureFoodStation} from './food-workstations.ts';

export const packagedSurvivalUnits=(w:World):number=>w.piles.reduce((n,p)=>n+(p.item==='survival-meal'?p.quantity:0),0);
/** Prepared raw stocks and station; callers must execute real collection,
 * work and output before using these rations in their own scenarios. */
export function packagedSurvivalCamp(portions=1):World {
  const w=foodWorkstationCamp(),p=w.pawns[0]!,stove=fixtureFoodStation(w,'fueled-stove');
  w.research={project:null,points:0,packagedSurvivalMeals:{points:PACKAGED_SURVIVAL_MEALS_RESEARCH_COST,completedAt:0}};
  p.priorities.cook=1;stove.fuel!.ticks=12000;
  addGroundMaterial(w,'food',6*portions,{x:6,z:6},'milk');
  addGroundMaterial(w,'food',6*portions,{x:7,z:6},'rice');refreshStock(w);
  const result=applyCommand(w,{type:'bill-add',structureId:stove.id,recipe:'cook-survival-meal'});
  if(!result.ok)throw new Error(`Prepared packaged survival bill: ${result.reason}`);
  stove.bills![0]!.destination='drop';stove.bills![0]!.target=portions;
  return w;
}
