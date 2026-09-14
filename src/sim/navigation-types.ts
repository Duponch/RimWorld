/** A weighted search may expose only finalized cells, or a complete field. */
export interface DistanceField {
  stops?:ReadonlySet<number>;
  parents: Int32Array;
  costs: Float64Array;
  start: number;
  visited: number;
  unreachedGroups: number;
  settled?: Uint8Array;
}

/** Connectivity is deliberately not a parent tree. Route requests incrementally
 * settle a separate weighted field, owned by this synchronous decision only. */
export interface CandidateAccess {
  stops?:ReadonlySet<number>;
  kind: 'candidate-access';
  start: number;
  has(index: number): boolean;
  resolve(goals: ReadonlySet<number>): DistanceField;
  costTo(index: number): number;
  readonly visited: number;
  readonly connectivityVisited: number;
  readonly unreachedGroups: number;
}
export type Reachability = DistanceField | CandidateAccess;
