import type { Cell } from './types.ts';
import type { MedicalRecord } from './injury-types.ts';
import type { MeleeState } from './melee-state.ts';
import type { TravelSegment } from './travel-timing.ts';
import type { StaggerState } from './stagger.ts';
import type { StunState } from './stun.ts';

/** Mechanical map owner. No human or animal needs, skills or inventory. */
export interface Mechanoid extends Cell {
  id:number;mechKind:'scyther';
  state:'idle'|'moving'|'working'|'downed'|'dead';
  /** Absence is the healthy mechanical body; first impact installs the record. */
  health?:MedicalRecord;
  path:Cell[];motion?:TravelSegment;heading:number;moveCooldown:number;planCooldown:number;
  raid?:{group:number;goal:Cell|null};
  melee?:MeleeState;
  stagger?:StaggerState;stun?:StunState;
}
