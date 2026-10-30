/** Scalar Core4871 animal cost captured on edge commitment, never on SAVE/load.
 * No human4.6 calibration, World read, route decision, RNG or cache. */
export interface AnimalMoveCostInput297 {
 readonly speed:number;readonly moving:number;readonly stage:number;readonly weather:number;
 readonly diagonal:boolean;readonly walk:boolean;readonly terrainCore:number;readonly flight:number;
}
export const ANIMAL_MOVE_DIAGONAL297=1.41421;
const f=Math.fround;
/** Dividing by a rounded total/450 can produce the next Float32 above450.
 * This IEEE successor is a derived envelope, never an arbitrary tolerance. */
const paidLimitSuccessor297=(()=>{const view=new DataView(new ArrayBuffer(4));view.setFloat32(0,450);view.setUint32(0,view.getUint32(0)+1);return view.getFloat32(0);})();

/** CostIntoCell caps450 BEFORE Walk; flight belongs to payment AFTER urgency.
 * Health/stage are supplied by the existing admitted actor's current readers. */
export function animalMoveCostCore297(input:AnimalMoveCostInput297):number {
 const {speed,moving,stage,weather,diagonal,walk,terrainCore,flight}=input;
 if(![speed,moving,stage,weather,flight].every(v=>Number.isFinite(v)&&v>0)
  ||!Number.isFinite(terrainCore)||terrainCore<0||terrainCore>500)throw new RangeError('Invalid captured animal movement scalar');
 // Existing stage/capacity readers supply their current scalars. This local
 // composition does not claim every native StatWorker modifier is implemented.
 const stat=f(f(f(speed)*f(stage))*f(moving)),perTick=f(stat/60);
 let ticks=perTick===0?450:f(1/perTick);
 ticks=f(ticks/f(weather));if(diagonal)ticks=f(ticks*f(ANIMAL_MOVE_DIAGONAL297));
 ticks=Math.min(450,Math.max(1,ticks));
 let cost=Math.min(450,f(ticks+f(terrainCore)));
 if(walk)cost=Math.max(50,f(cost*2));
 cost=Math.max(1,cost);
 // Native CostToPayThisTick floors payment at total/450 EVEN without stagger.
 // The existing captured-duration/stagger curve preserves this same floor.
 const payment=Math.max(f(flight),f(cost/450));
 return f(cost/payment);
}

export interface AnimalMoveEncodingBoundsInput297 {
 readonly speed:number;readonly stageFactors:readonly number[];
 readonly weatherMinimum:number;readonly weatherMaximum:number;readonly flight:number;
}
/** Exact extrema of the prospective numeric codec. Monotonic positive scalar
 * operations permit stage/weather/health/terrain endpoints, for BOTH geometries
 * and urgencies. Legacy timing remains a separate union owned by its reader. */
export function animalMoveEncodingBounds297(input:AnimalMoveEncodingBoundsInput297):{minimum:number;maximum:number} {
 const {speed,stageFactors,weatherMinimum,weatherMaximum,flight}=input;
 if(!stageFactors.length||stageFactors.some(v=>!Number.isFinite(v)||v<=0)
  ||weatherMinimum>weatherMaximum)throw new RangeError('Invalid animal movement envelope');
 const stages=[Math.min(...stageFactors),Math.max(...stageFactors)];
 let minimum=Infinity,maximum=-Infinity;
 for(const diagonal of [false,true])for(const walk of [false,true])
 for(const moving of [.16,1])for(const stage of stages)
 for(const weather of [weatherMinimum,weatherMaximum])for(const terrainCore of [0,500]){
  const cost=animalMoveCostCore297({speed,moving,stage,weather,diagonal,walk,terrainCore,flight});
  const encoded=30*(diagonal?Math.SQRT2:1)/cost;
  minimum=Math.min(minimum,encoded);maximum=Math.max(maximum,encoded);
 }
 // Raw price is at most900 after Walk. A flight payment>=2 never enters the
 // variable total/450 branch. Otherwise guard its one-Float32 rounding peak.
 if(f(flight)<2)minimum=Math.min(minimum,30/paidLimitSuccessor297);
 return {minimum,maximum};
}
