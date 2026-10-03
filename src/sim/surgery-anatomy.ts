import { HUMAN_MODEL } from './body-model.ts';
import { isWithinPart } from './injury-rules.ts';
import { partMissing,reconcileMedicalDeath } from './injury-state.ts';
import { removeInfectionsWithin } from './infection-state.ts';
import type { MedicalRecord } from './injury-types.ts';

export const SURGICAL_LIMBS=Object.freeze(['left-arm','right-arm','left-leg','right-leg'] as const);
export type SurgicalLimb=typeof SURGICAL_LIMBS[number];
export const isSurgicalLimb=(part:unknown):part is SurgicalLimb=>typeof part==='string'&&(SURGICAL_LIMBS as readonly string[]).includes(part);

/** Physiological success only. The world adapter owns permission, dose, bed,
 * contact, XP and outcome. Validate every guard before touching the record;
 * never route SurgicalCut through scar/exposure/violent-impact machinery. */
export function amputateSurgicalLimb(record:MedicalRecord,part:unknown):boolean {
  if(record.body!==undefined||record.death||!Number.isSafeInteger(record.tick)||record.tick<0||!isSurgicalLimb(part)||partMissing(record,part)||
    !record.infections?.cases.some(condition=>condition.part===part))return false;
  // An unreconciled lethal condition cannot be cured after its authoritative
  // deadline by deleting the selected infection. Do not mutate on this refusal.
  const checked={...record};reconcileMedicalDeath(checked);if(checked.death)return false;
  const injuries=record.injuries.filter(injury=>!isWithinPart(injury.part,part,HUMAN_MODEL));
  const missing=record.missing.filter(root=>!isWithinPart(root.part,part,HUMAN_MODEL));
  missing.push({part,bornAt:record.tick});
  record.injuries=injuries;record.missing=missing;removeInfectionsWithin(record,part);
  return true;
}
