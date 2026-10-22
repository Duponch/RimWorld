import {isSchema280OrLater} from './schema-compatibility-257.ts';
import {biologicalYears} from './human-age.ts';
import {partMissing} from './injury-state.ts';
import {isWithinPart} from './injury-rules.ts';
import {isSurgicalLimb} from './surgery-anatomy.ts';
import {artificialPartInstallReason} from './artificial-parts.ts';
import {prisonBreakActive} from './prison-break-state.ts';
import {isColonist} from './affiliation.ts';
import type {Pawn} from './types.ts';

/** Existing operator authority, re-read during an engaged physical service. */
export const isFreeSurgeryDoctor280=(doctor:Pawn):boolean=>isColonist(doctor)&&!doctor.prisoner&&!doctor.visitor&&!doctor.podRescue;

/** Prospective therapeutic permission, not a second clinical/captivity schema.
 * Callers retain the real local Pawn and validate its actual captivity record.
 * Anesthesia is intentionally not excluded here: an ongoing operation and its
 * physical bed rest retain this classification after the first real dose. */
export function isTherapeuticCaptiveSurgery280(patient:Pawn,part:unknown,options:{version:number;implant?:unknown}):boolean {
  if(!isSchema280OrLater(options.version)||!patient.prisoner||patient.prisoner.releasedAt!==undefined
    ||patient.prisoner.escape||prisonBreakActive(patient)||patient.visitor||patient.podRescue
    ||patient.state==='dead'||patient.health?.death||patient.age&&biologicalYears(patient.age)<18)return false;
  const h=patient.health;
  if(!h||h.body!==undefined)return false;
  if(options.implant!==undefined){
    // MissingBodyPart must be directly on this selected root. An absent arm
    // below a healthy shoulder is not therapeutic shoulder replacement.
    return h.missing.some(m=>m.part===part)&&!artificialPartInstallReason(h,part,options.implant);
  }
  return isSurgicalLimb(part)&&!partMissing(h,part)
    &&!h.artificialParts?.some(p=>isWithinPart(p.part,part))
    &&!!h.infections?.cases.some(c=>c.part===part);
}
