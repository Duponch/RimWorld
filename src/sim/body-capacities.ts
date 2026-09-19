import { BODY_INDEX, BODY_PARENTS, HUMAN_BODY, type BodyPartId } from './body-definition.ts';

/** Input projected from health conditions, not a saved global health bar.
 * Pain is supplied by injury/disease rules; this module never invents its cause. */
export interface BodyAssessmentInput {
  readonly damage:readonly {readonly part:BodyPartId;readonly loss:number}[];
  readonly missing:readonly BodyPartId[];
  readonly pain:number;
  /** Condition modifiers apply after the physiological consciousness formula,
   * before its rounding and before capacities that consume consciousness. */
  readonly consciousnessOffset?:number;
  readonly consciousnessMax?:number;
  readonly movingOffset?:number;
}
export interface BodyCapacities {
  readonly consciousness:number; readonly moving:number; readonly manipulation:number;
  readonly sight:number; readonly hearing:number; readonly talking:number; readonly eating:number;
  readonly breathing:number; readonly bloodPumping:number; readonly bloodFiltration:number; readonly digestion:number;
}
export interface BodyAssessment {
  readonly capacities:BodyCapacities;
  readonly canBeAwake:boolean;
  readonly movingCapable:boolean;
  readonly painShock:boolean;
  /** Physiological failure only: death-on-downed, blood loss and damage threshold live elsewhere. */
  readonly vitalFailure:boolean;
}
export const HEALTHY_BODY_INPUT:BodyAssessmentInput=Object.freeze({damage:Object.freeze([]),missing:Object.freeze([]),pain:0});

/** Unity-style nearest even at the published hundredth boundary. JS doubles are
 * deterministic here; this is not an assertion of bit-identical C# float math. */
export function capacityRounded(value:number):number {
  return nearestEven(Math.max(0,value)*100)/100;
}
function nearestEven(value:number):number {
  const lower=Math.floor(value),fraction=value-lower;
  return fraction===.5 ? lower+(lower%2) : Math.round(value);
}
/** Allocate only while assessing changed health, never during movement frames. */
export function bodyEfficiencies(input:BodyAssessmentInput):Float64Array {
  const loss=new Float64Array(HUMAN_BODY.length),missing=new Uint8Array(HUMAN_BODY.length),efficiency=new Float64Array(HUMAN_BODY.length);
  for(const damage of input.damage)loss[BODY_INDEX[damage.part]]!+=damage.loss;
  for(const id of input.missing)missing[BODY_INDEX[id]]=1;
  for(let i=0;i<HUMAN_BODY.length;i++) {
    const part=HUMAN_BODY[i]!,parent=BODY_PARENTS[i]!;
    if(parent>=0&&missing[parent])missing[i]=1;
    if(missing[i])continue;
    const remaining=nearestEven(Math.max(part.destroyable?0:1,part.hp-loss[i]!))/part.hp;
    // Injury efficiency on outside non-root parts reaches zero at 10% HP.
    // This is unrelated to the separate rule for indestructible internal bones.
    efficiency[i]=part.depth==='outside'&&parent>=0 ? Math.max(0,(remaining-.1)/.9) : remaining;
  }
  return efficiency;
}

function calculate(input:BodyAssessmentInput):BodyAssessment {
  const efficiency=bodyEfficiencies(input),part=(id:BodyPartId)=>efficiency[BODY_INDEX[id]]!;
  const pair=(a:BodyPartId,b:BodyPartId)=>(part(a)+part(b))/2;
  const bestPair=(a:BodyPartId,b:BodyPartId)=>.75*Math.max(part(a),part(b))+.25*Math.min(part(a),part(b));
  const round=capacityRounded;
  const bloodPumping=round(part('heart'));
  const bloodFiltration=round(pair('left-kidney','right-kidney')*part('liver'));
  const breathing=round(pair('left-lung','right-lung')*part('neck')*pair('ribcage','sternum'));
  const digestion=round(pair('stomach','liver'));
  const painOffset=Math.min(.4,Math.max(0,(input.pain-.1)*(.4/.9)));
  const naturalConsciousness=(part('brain')-(painOffset>=.01?painOffset:0))*(.8+.2*bloodPumping)*(.8+.2*breathing)*(.9+.1*bloodFiltration);
  const consciousness=round(Math.min(input.consciousnessMax??Infinity,naturalConsciousness+(input.consciousnessOffset??0)));
  const canBeAwake=consciousness>=.3;
  let arms=0,legs=0,functionalLegs=0;
  for(const side of ['left','right'] as const) {
    const fingers=(['pinky','ring-finger','middle-finger','index-finger','thumb'] as const).reduce((sum,id)=>sum+part(`${side}-${id}`),0)/5;
    arms+=part(`${side}-arm`)*part(`${side}-shoulder`)*part(`${side}-clavicle`)*part(`${side}-humerus`)*part(`${side}-radius`)*part(`${side}-hand`)*(.2+.8*fingers);
    const toes=(['little-toe','fourth-toe','middle-toe','second-toe','big-toe'] as const).reduce((sum,id)=>sum+part(`${side}-${id}`),0)/5;
    const leg=part(`${side}-leg`)*part(`${side}-femur`)*part(`${side}-tibia`)*part(`${side}-foot`)*(.6+.4*toes);
    legs+=leg;if(leg>0)functionalLegs++;
  }
  const moving=canBeAwake&&functionalLegs>=1?round(legs/2*part('pelvis')*part('spine')*(.8+.2*breathing)*(.8+.2*bloodPumping)*Math.min(1,consciousness)+(input.movingOffset??0)):0;
  const capacities=Object.freeze({consciousness,moving,manipulation:canBeAwake?round(arms/2*consciousness):0,
    sight:round(bestPair('left-eye','right-eye')),hearing:round(bestPair('left-ear','right-ear')),
    talking:canBeAwake?round(part('jaw')*part('neck')*part('tongue')*consciousness):0,
    eating:canBeAwake?round(Math.max(.1,part('jaw')*part('neck')*(.5+.5*part('tongue'))*consciousness)):0,
    breathing,bloodPumping,bloodFiltration,digestion});
  return Object.freeze({capacities,canBeAwake,movingCapable:moving>.15,painShock:input.pain>=.8,
    vitalFailure:part('torso')<=.0001||[consciousness,breathing,bloodPumping,bloodFiltration,digestion].some(value=>value<=0)});
}
export const HEALTHY_BODY:BodyAssessment=calculate(HEALTHY_BODY_INPUT);
/** Caller supplies a current health projection. No cache keyed solely by pawn ID
 * or tick: in-place injury changes must be visible within the same tick. */
export function assessBody(input:BodyAssessmentInput=HEALTHY_BODY_INPUT):BodyAssessment {
  return input.damage.length===0&&input.missing.length===0&&input.pain===0&&!input.movingOffset&&!input.consciousnessOffset&&(input.consciousnessMax??1)>=1?HEALTHY_BODY:calculate(input);
}
