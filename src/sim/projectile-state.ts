import type { BulletArrival,BulletFlight } from './bullet-flight.ts';
import type { WeaponQuality } from './equipment-rules.ts';

/** Launch-time relation roster, until a real faction system supplies live
 * relations. IDs may outlive their actors; they are not ownership references. */
export interface ProjectileRelations { friendlyPawnIds:number[]; friendlyFireFactor:number }
export interface WorldProjectile {
  id:number;
  quality:WeaponQuality;
  emittedAtCore:number;
  advancedAtCore:number;
  flight:BulletFlight;
  relations:ProjectileRelations;
  /** Kept through the impact's local tick for snapshots/save continuation.
   * The record is inert after arrival, including unsupported object impacts. */
  arrival:(BulletArrival & {effect:'pawn'|'ground'|'exit'|'unsupported-object'})|null;
}
