import { HEALTHY_BODY,type BodyAssessment } from './body-capacities.ts';
import { assessMedical } from './injury-state.ts';
import type { Pawn } from './types.ts';

/** Read only at simulation actions/inspection, never from GPU pose updates. */
export const pawnBody=(pawn:Pawn):BodyAssessment=>pawn.health&&(pawn.health.injuries.length||pawn.health.missing.length||pawn.health.bloodLoss||pawn.health.heatstroke||pawn.health.hypothermia||pawn.health.infections?.cases.length)?assessMedical(pawn.health):HEALTHY_BODY;
export const medicallyStopped=(pawn:Pawn):boolean=>pawn.state==='downed'||pawn.state==='dead';
export function medicalWorkRefusal(pawn:Pawn):string|undefined {
  if(pawn.state==='dead')return 'Ce colon est décédé.';
  if(pawn.state==='downed')return 'Ce colon est à terre et ne peut pas travailler.';
  if(pawnBody(pawn).capacities.manipulation===0)return 'Ce colon ne peut pas manipuler les objets nécessaires au travail.';
  return undefined;
}
export function physicalWorkFactor(pawn:Pawn,kind:'build'|'plant'|'mine'|'craft'|'cook',body?:BodyAssessment):number {
  if(!pawn.health)return 1;
  const c=(body??pawnBody(pawn)).capacities,weight=kind==='build'?.2:kind==='plant'||kind==='cook'?.3:.5;
  return c.manipulation*(1-weight+weight*Math.min(1,c.sight));
}
export function physicalEatingFactor(pawn:Pawn):number {
  if(!pawn.health)return 1;
  const c=pawnBody(pawn).capacities;
  return Math.max(.15,(.05+.95*c.eating)*(.7+.3*c.manipulation));
}
