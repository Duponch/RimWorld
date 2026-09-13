import type { ItemId } from './items.ts';
export const SCHEMA_VERSION = 6 as const;
export const TICKS_PER_SECOND = 10;
export const TICKS_PER_DAY = 6000;

export type Terrain = 'grass' | 'soil' | 'water' | 'rock';
export type ResourceKind = 'tree' | 'berries' | 'rock';
export type MaterialKind = 'wood' | 'food';
export type StructureKind = 'wall' | 'bed' | 'table' | 'stool';
export type JobKind = 'chop' | 'harvest' | StructureKind;
export type WorkType = 'gather' | 'build' | 'haul';
export type Orientation = 0 | 1 | 2 | 3;
export type Footprint = 'standard' | 'legacy-single';
export type PawnState = 'idle' | 'moving' | 'working' | 'sleeping' | 'hungry' | 'eating';
export interface Cell { x: number; z: number }
export interface Tile { terrain: Terrain }
export interface Resource extends Cell { id: number; kind: ResourceKind; amount: number }
export interface Structure extends Cell { id: number; kind: StructureKind; orientation: Orientation; footprint: Footprint }
export interface Stock { wood: number; food: number }
export type MaterialOwner = ({ type: 'ground' } & Cell) | { type: 'pawn'; pawnId: number } | { type: 'job'; jobId: number };
export interface MaterialPile { id: number; kind: MaterialKind; item: ItemId; quantity: number; owner: MaterialOwner }
export interface StockpileCell extends Cell { id: number; filters: Record<MaterialKind, boolean>; priority: number; capacity: number }
export type HaulDestination = { type: 'stockpile'; stockpileId: number } | { type: 'job'; jobId: number };
export interface HaulTask {
  sourcePileId: number;
  quantity: number;
  phase: 'pickup' | 'deliver';
  destination: HaulDestination;
  carryPileId: number | null;
  /** Source position survives removal of the last units for pickup-facing. */
  pickupCell?: Cell;
}
export interface DiningPlace { target: Cell; seatId: number | null; tableId: number | null }
export interface Memory { kind: 'ate-without-table'; expiresAt: number }
export type NeedTask =
  | { kind: 'eat'; phase: 'pickup' | 'choose-spot' | 'travel' | 'ingest'; sourcePileId: number; carryPileId: number | null; quantity: number; progress: number; dining: DiningPlace | null }
  | { kind: 'sleep'; phase: 'travel' | 'sleep'; bedId: number | null; target: Cell };
export interface Job extends Cell {
  id: number;
  kind: JobKind;
  orientation: Orientation;
  footprint: Footprint;
  status: 'pending' | 'active';
  reservedBy: number | null;
  progress: number;
  escrow: Stock;
}
export interface Pawn extends Cell {
  id: number;
  name: string;
  hunger: number;
  rest: number;
  mood: number;
  comfort: number;
  memories: Memory[];
  jobId: number | null;
  haul: HaulTask | null;
  need: NeedTask | null;
  /** Persistent ownership, distinct from an active sleep reservation. */
  bedId: number | null;
  needCooldown: number;
  state: PawnState;
  priorities: Record<WorkType, number>;
  /** Serialized route and cadence make save/resume exactly reproducible. */
  path: Cell[];
  moveCooldown: number;
  /** Active edge and exact fractional arrival, saved independently of presentation. */
  motion?: import('./movement.ts').TravelSegment | null;
  planCooldown: number;
}
export interface WorldEvent { tick: number; type: 'job' | 'need' | 'command'; message: string }
export interface World {
  schemaVersion: typeof SCHEMA_VERSION;
  /** V1–V4 continuations retain their former nutrition economy explicitly. */
  foodRules: 'legacy' | 'adult';
  seed: number;
  rng: number;
  tick: number;
  width: number;
  height: number;
  /** Row-major: tiles[z * width + x]. */
  tiles: Tile[];
  pawns: Pawn[];
  resources: Resource[];
  structures: Structure[];
  jobs: Job[];
  piles: MaterialPile[];
  stockpiles: StockpileCell[];
  stock: Stock;
  events: WorldEvent[];
  nextId: number;
  /** Rotating bounded logistics search position, persisted for exact continuation. */
  logisticsCursor: number;
}
export type DesignateCommand = { type: 'designate'; kind: JobKind; orientation?: Orientation } & Cell;
export type AreaAction = 'chop' | 'harvest' | 'cancel' | 'stockpile' | 'remove-stockpile';
export interface StorageSettings { filters?: Record<MaterialKind, boolean>; priority?: number; capacity?: number }
export interface AreaCommand extends StorageSettings { type: 'area'; action: AreaAction; from: Cell; to: Cell }
export type Command =
  | DesignateCommand
  | AreaCommand
  | { type: 'assign-bed'; bedId: number; pawnId: number | null }
  | ({ type: 'cancel' } & Cell)
  | ({ type: 'stockpile'; enabled: boolean; filters?: Record<MaterialKind, boolean>; priority?: number; capacity?: number } & Cell)
  | { type: 'priority'; pawnId: number; work: WorkType; value: number };
export type RefusalCode = 'invalid-command' | 'out-of-bounds' | 'occupied' | 'incompatible-resource' | 'missing-target' | 'invalid-priority' | 'invalid-storage';
export interface CommandResult { ok: boolean; reason?: string; code?: RefusalCode; affected?: number; skipped?: number }
export interface JobDiagnostic { code: 'working' | 'ready' | 'delivering' | 'missing-materials' | 'waiting-worker'; reason: string; delivered: number; required: number }
