import { BODY_INDEX,BODY_PARTS,HUMAN_BODY } from './body-definition.ts';
import { isWithinPart } from './injury-rules.ts';
import { partMissing,reconcileMedicalDeath } from './injury-state.ts';
import { removeInfectionsWithin } from './infection-state.ts';
import { artificialPartCovering,isWoodenPartKind,isWoodenPartSite,WOODEN_PARTS } from './artificial-parts-rules.ts';
import type { MedicalRecord } from './injury-types.ts';
export { artificialPartCovering,artificialPartEfficiencies,isWoodenPartKind,isWoodenPartSite,WOODEN_PARTS } from './artificial-parts-rules.ts';
export type { ArtificialPart,WoodenPartKind,WoodenPartSite } from './artificial-parts-types.ts';

/** V210 intentionally restores missing sites only. Replacing a healthy limb,
 * replacing/removing an implant and organ harvesting are separate operations. */
export function woodenPartInstallReason(record:MedicalRecord|undefined,part:unknown,kind:unknown):string|undefined {
  if(!record||record.body!==undefined)return 'Cette prothèse est réservée à un corps humain.';
  if(record.death)return 'Cette personne est décédée.';
  if(!Number.isSafeInteger(record.tick)||record.tick<0)return 'Horloge médicale invalide.';
  if(!isWoodenPartKind(kind)||!isWoodenPartSite(part)||!WOODEN_PARTS[kind].sites.includes(part))return 'Cette prothèse ne correspond pas à cette partie du corps.';
  if(!record.missing.some(m=>m.part===part))return 'Cette partie doit être manquante pour recevoir une prothèse.';
  const parent=BODY_PARTS[part].parent;
  if(!parent||partMissing(record,parent)||artificialPartCovering(record,parent))return 'Le parent naturel de cette partie doit être présent.';
  if(record.artificialParts?.some(p=>isWithinPart(p.part,part)||isWithinPart(part,p.part)))return 'Une prothèse occupe déjà cette partie ou son parent.';
  const checked={...record};reconcileMedicalDeath(checked);
  if(checked.death)return 'Cette personne est décédée.';
  return undefined;
}
/** Physiological commit only; caller owns consent, wood, two medicines,
 * anesthesia, surgeon skill, elapsed work, failure and physical reservations. */
export function installWoodenPart(record:MedicalRecord,part:unknown,kind:unknown):boolean {
  if(woodenPartInstallReason(record,part,kind)||!isWoodenPartSite(part)||!isWoodenPartKind(kind))return false;
  record.injuries=record.injuries.filter(i=>!isWithinPart(i.part,part));
  record.missing=record.missing.filter(m=>!isWithinPart(m.part,part));
  removeInfectionsWithin(record,part);
  // Core AddedPart.PostAdd restores the root and makes its immediate natural
  // children missing. nonFresh suppresses artificial stumps without false dates.
  for(const child of HUMAN_BODY)if(child.parent===part)record.missing.push({part:child.id,bornAt:record.tick,nonFresh:true});
  const added=record.artificialParts??=[];added.push({part,kind,installedAt:record.tick});
  added.sort((a,b)=>BODY_INDEX[a.part]-BODY_INDEX[b.part]);
  return true;
}
