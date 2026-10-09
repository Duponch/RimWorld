import type { Mechanoid } from './mechanoid-state.ts';

/** Last admitted hit, not the last resisted hit. Incapacitation can truncate
 * stunUntilCore while the independently running adaptation is retained. */
export interface EmpAdaptationState {lastAtCore:number;adaptedUntilCore:number;stunUntilCore:number}
/** Buildings do not adapt: repeated hits retain the earliest active start and
 * the maximum remaining stun. They retain their switch, connection and charge. */
export interface StructureEmpState {sinceCore:number;untilCore:number}
export const empStructureSupported=(kind:unknown):boolean=>kind==='chemfuel-generator'||kind==='mini-turret'||kind==='wood-generator'||kind==='solar-generator'||kind==='wind-turbine'||kind==='battery';
export const empStructureActive=(owner:{emp?:StructureEmpState},core:number):boolean=>!!owner.emp&&owner.emp.sinceCore<=core&&core<owner.emp.untilCore;
export const empMechanoidActive=(owner:Pick<Mechanoid,'emp'|'state'|'health'>,core:number):boolean=>
  owner.state!=='dead'&&owner.state!=='downed'&&!owner.health?.death&&!!owner.emp&&owner.emp.lastAtCore<=core&&core<owner.emp.stunUntilCore;
