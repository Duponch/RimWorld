import type {RoomRest} from './room-experience.ts';
import type {BedSlot} from './types.ts';

/** Personal, prospective facts. The cooldown uses the global Core clock;
 * it is never shifted with the active age of a suspended memory. */
export interface CoupleClock285 {
 revision:1;
 rng:number;
 lastAttemptAtCore?:number;
 nextAllowedAtCore?:number;
}

/** One real participant's task. Both tasks record the ONE duration drawn by
 * their initiator and refer to the same original bed and two distinct slots.
 * Presence starts only after the common lying-awake stage was entered. */
export interface CoupleTask285 {
 revision:1;
 otherId:number;
 initiatorId:number;
 bedId:number;
 slot:BedSlot;
 enteredAtCore:number;
 endsAtCore:number;
 /** Existing medical-rest mandate to resume, not a medical role for this bed. */
 medical?:'patient'|'bedrest';
 /** Moved from the previous physical bed use, never regenerated on transfer. */
 roomRest?:RoomRest;
}
