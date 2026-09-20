import type { BodyPartId } from './body-definition.ts';

/** Shared disease immunity is separate from each local infected body part. */
export interface Infection {
  id:number; part:BodyPartId; bornAt:number;
  /** INFECTION_UNIT = severity 1. Integer nanounits, never anatomical HP. */
  severity:number;
  /** Stable millionths, 800_000..1_200_000; no world RNG during evolution. */
  luck:number;
  tend?:{quality:number;expiresAtCore:number};
}
export interface InfectionState {
  /** Retained even after every case and residual immunity have disappeared. */
  nextId:number; cases:Infection[]; immunity:number;
}
export interface InfectionRisk {dueCore:number;roomFactor:number}
