import type {MedicalRecord} from '../sim/injury-types.ts';
/** Selected dossier only: no timer, health admission or world traversal. */
export function firefoamProtectionText290(health:MedicalRecord|undefined,frozen=false):string {
 const effect=health?.coveredInFirefoam290;if(!effect)return '';
 return `Couvert de mousse · ${(effect.remainingCore/60).toFixed(1).replace('.',',')} s restantes · ${frozen?'dossier suspendu':'nouvel allumage empêché'}`;
}
