import type { Cell } from './types.ts';
import { foodPoisonVomitChance,VOMIT_CHECK_INTERVAL,VOMIT_PULSE_INTERVAL,type FoodPoisoningState,type FoodPoisonRandom } from './food-poisoning.ts';

export interface FoodPoisonVomitContext {
  awake:boolean;position:Cell;foodLevel:number;foodMax:number;random:FoodPoisonRandom;
  canStand(cell:Cell):boolean;
  /** Integration must first settle a physical edge and conservatively interrupt
   * tasks/cargo. A refusal does not discard anything or start an episode. */
  start():boolean;
  /** Filth owns placement/dispersion; inability to place does not cure sickness. */
  deposit(cell:Cell):void;
}
const NEARBY:readonly Cell[]=[{x:0,z:0},{x:0,z:1},{x:1,z:0},{x:0,z:-1},{x:-1,z:0},{x:1,z:1},{x:1,z:-1},{x:-1,z:-1},{x:-1,z:1}];
/** One local tick. The caller gates living flesh and retains authority over
 * interrupted jobs, movement and hunger units (100 human; 1 hare). */
export function processFoodPoisoningVomit(state:FoodPoisoningState,tick:number,phase:number,context:FoodPoisonVomitContext):{active:boolean;foodLevel:number} {
  if(tick%VOMIT_CHECK_INTERVAL===phase%VOMIT_CHECK_INTERVAL){
    const chance=foodPoisonVomitChance(state);
    if(chance>0&&context.random()<chance&&context.awake&&(state.vomit||context.start())){
      const remainingCore=300+Math.floor(context.random()*600);
      let cell={...context.position};
      for(let i=0;i<13;i++){
        const d=NEARBY[Math.min(NEARBY.length-1,Math.floor(context.random()*NEARBY.length))]!;
        if(i===12)break;
        const candidate={x:context.position.x+d.x,z:context.position.z+d.z};
        if(context.canStand(candidate)){cell=candidate;break;}
      }
      state.vomit={remainingCore,cell};
    }
  }
  const vomiting=state.vomit;
  if(!vomiting)return {active:false,foodLevel:context.foodLevel};
  let foodLevel=context.foodLevel;
  if(tick%VOMIT_PULSE_INTERVAL===phase%VOMIT_PULSE_INTERVAL){
    context.deposit(vomiting.cell);
    if(foodLevel>context.foodMax*.1)foodLevel=Math.max(0,foodLevel-context.foodMax*.04);
  }
  vomiting.remainingCore-=10;
  if(vomiting.remainingCore<=0)delete state.vomit;
  return {active:true,foodLevel};
}
