/** Acquired automatic pause belongs to this same bill, separately from the
 * player's manual suspension. Absence preserves the old target counter. */
export interface BillReservePause289 {
  enabled:boolean;
  resumeAt:number;
  paused:boolean;
}
export type BillReservePausePolicy289=Pick<BillReservePause289,'enabled'|'resumeAt'>;
