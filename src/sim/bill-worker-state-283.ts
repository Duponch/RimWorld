/** Prospective admission preference, never an assigned task or human owner.
 * A named person bypasses this preferred range, not recipe requirements.
 * Absence preserves the unrestricted historical admission exactly. */
export interface BillWorkerPolicy283 {
  pawnId:number|null;
  skillMin:number;
  skillMax:number;
}

/** Read-only choice metadata from actual map owners, never saved as people. */
export interface BillWorkerOption283 {
  pawnId:number;
  name:string;
  level:number|null;
  description:string;
  enabled:boolean;
}
export interface BillWorkerOptions283 {
  structureId:number;
  billId:number;
  skill:import('./bill-worker-rules-283.ts').ProductionRecipeSkill283|null;
  candidates:BillWorkerOption283[];
  /** Existing references can be away; they are not new menu candidates. */
  selected?:BillWorkerOption283;
}
