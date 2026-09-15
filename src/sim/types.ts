import type { ItemId } from './items.ts';
export const SCHEMA_VERSION = 41 as const;
export const TICKS_PER_SECOND = 10;
export const TICKS_PER_DAY = 6000;

export type Terrain = 'grass' | 'soil' | 'water' | 'rock' | 'rough-stone';
export type ResourceKind = 'tree' | 'berries' | 'rock' | 'rice';
export type MaterialKind = 'wood' | 'food' | 'chunk' | 'steel' | 'blocks' | 'component';
export type StructureKind = 'passive-cooler' | 'door' | 'wall' | 'bed' | 'table' | 'stool' | 'campfire' | 'horseshoes' | 'stonecutter';
export type JobKind = 'build-roof' | 'remove-roof' | 'mine' | 'chop' | 'harvest' | 'cut' | 'sow' | 'deconstruct' | 'uninstall' | 'install' | StructureKind;
export type WorkType = 'mine' | 'gather' | 'build' | 'haul' | 'grow' | 'cook' | 'craft';
export type Orientation = 0 | 1 | 2 | 3;
export type Footprint = 'standard' | 'legacy-single';
export type PawnState = 'idle' | 'moving' | 'working' | 'sleeping' | 'hungry' | 'eating' | 'recreating';
export interface Cell { x: number; z: number }
export interface Tile { ore?: 'steel' | 'machinery'; miningDamage?: number; terrain: Terrain; stone?: import('./geology.ts').StoneKind }
export interface Resource extends Cell { id: number; kind: ResourceKind; amount: number; growth?: number; growthTick?: number; growthThermalFactor?:number; stone?: import('./geology.ts').StoneKind }
export interface Structure extends Cell { door?:import('./door-rules.ts').DoorState; material?:import('./construction-materials.ts').ConstructionMaterial; bills?: import('./cooking-types.ts').CookingBill[]; fuel?: import('./fuel.ts').FuelState; id: number; kind: StructureKind; orientation: Orientation; footprint: Footprint }
export interface Stock { wood: number; food: number }
export type MaterialOwner = ({ type: 'ground' } & Cell) | { type: 'pawn'; pawnId: number } | { type: 'job'; jobId: number };
export interface MaterialPile { haulRequested?: true; id: number; kind: MaterialKind; item: ItemId; quantity: number; owner: MaterialOwner; rot?: import('./food-preservation.ts').RotState }
export type StorageFilters = { wood:boolean; food:boolean; chunk?:boolean; steel?:boolean; component?:boolean; blocks?:boolean; furniture?:boolean };
export interface StockpileCell extends Cell { id: number; filters: StorageFilters; priority: number; capacity: number }
export interface GrowingZone { id: number; cells: number[]; plant: 'rice'; allowSow: boolean; allowCut: boolean }
export type HaulDestination = { type: 'fuel'; structureId: number; forced?: boolean; forCooking?: boolean } | { type: 'stockpile'; stockpileId: number } | { type: 'job'; jobId: number; forConstruction?: boolean } | ({ type: 'aside'; growingZoneId?: number; sowCell?: Cell; constructionId?: number; forConstruction?: boolean } & Cell);
export interface HaulTask {
  /** A whole furniture identity, never a divisible material pile. */
  whole?: true;
  serviceProgress?: number;
  sourcePileId: number;
  quantity: number;
  phase: 'pickup' | 'deliver';
  destination: HaulDestination;
  carryPileId: number | null;
  /** Source position survives removal of the last units for pickup-facing. */
  pickupCell?: Cell;
}
export interface DiningPlace { target: Cell; seatId: number | null; tableId: number | null }
export interface Memory { kind: 'ate-without-table' | 'ate-raw-food'; expiresAt: number }
export type NeedTask =
  | { kind: 'eat'; phase: 'pickup' | 'choose-spot' | 'travel' | 'ingest'; sourcePileId: number; carryPileId: number | null; quantity: number; progress: number; dining: DiningPlace | null }
  | { kind: 'sleep'; phase: 'travel' | 'sleep'; bedId: number | null; target: Cell };
export interface Job extends Cell {
  /** Captured Core ticks for the current pick stroke; light changes affect the next. */
  pickTicks?:number;
  workRemainder?:number;
  material?:import('./construction-materials.ts').ConstructionMaterial;
  installationWork?: 'build' | 'haul';
  furniture?: import('./furniture-rules.ts').FurnitureTarget;
  deconstruction?: import('./deconstruction-rules.ts').DeconstructionTarget;
  construction?: 'blueprint' | 'frame';
  /** Plant clearing is work on the same construction intent, before delivery. */
  clearance?: {resourceId:number; progress:number; workRemainder?:number};
  /** Generated intention, rechecked against this zone while pending/active. */
  growingZoneId?: number;
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
  priorityWork?: import('./priority-work-state.ts').PriorityWork;
  /** A physical exit from furniture after interruption; retained across saves. */
  transitExit?: true;
  orders: import('./player-orders.ts').PlayerOrders;
  recreation: import('./recreation-rules.ts').RecreationNeed;
  foodPolicyId: number;
  schedule: import('./schedule.ts').ScheduleAssignment[];
  restZeroTicks: number;
  collapsePending: boolean;
  id: number;
  name: string;
  hunger: number;
  rest: number;
  mood: number;
  comfort: number;
  memories: Memory[];
  jobId: number | null;
  haul: HaulTask | null;
  cooking: import('./cooking-types.ts').CookingTask | null;
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
  roofing?: import('./roof-rules.ts').RoofingState;
  thermal?: import('./temperature.ts').ThermalState;
  packed: import('./furniture-rules.ts').PackedFurniture[];
  deconstructed: import('./deconstruction-rules.ts').DeconstructionLedger;
  foodPolicies: import('./food-policy.ts').FoodPolicy[];
  nextFoodPolicyId: number;
  restRules: 'legacy' | 'adult';
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
  growingZones: GrowingZone[];
  growingCursor: number;
  environment: 'temperate-equinox-v1';
  stock: Stock;
  spoiled: import('./food-preservation.ts').SpoiledFood;
  events: WorldEvent[];
  nextId: number;
  /** Rotating bounded logistics search position, persisted for exact continuation. */
  logisticsCursor: number;
}
export type DesignateCommand = { type: 'designate'; kind: JobKind; orientation?: Orientation; material?:import('./construction-materials.ts').ConstructionMaterial } & Cell;
export type AreaAction = 'build-roof' | 'remove-roof' | 'ignore-roof' | 'mine' | 'haul-chunks' | 'deconstruct' | 'chop' | 'harvest' | 'cut' | 'cancel' | 'stockpile' | 'remove-stockpile' | 'growing' | 'remove-growing';
export interface StorageSettings { filters?: StorageFilters; priority?: number; capacity?: number }
export interface AreaCommand extends StorageSettings { type: 'area'; action: AreaAction; from: Cell; to: Cell }
export type Command =
  | import('./doors.ts').DoorCommand
  | ({type:'install';structureId:number;orientation:Orientation} & Cell)
  | import('./player-orders.ts').OrderCommand
  | import('./food-policy.ts').FoodPolicyCommand
  | import('./schedule.ts').ScheduleCommand
  | { type: 'bill-add'; structureId: number }
  | { type: 'bill-update'; structureId: number; billId: number; settings: import('./cooking-types.ts').BillSettings }
  | { type: 'bill-remove'; structureId: number; billId: number }
  | { type: 'bill-move'; structureId: number; billId: number; direction: -1 | 1 }
  | DesignateCommand
  | AreaCommand
  | { type: 'refuel-policy'; structureId: number; enabled: boolean }
  | { type: 'growing-policy'; zoneId: number; allowSow: boolean; allowCut: boolean }
  | { type: 'assign-bed'; bedId: number; pawnId: number | null }
  | ({ type: 'cancel' } & Cell)
  | ({ type: 'stockpile'; enabled: boolean; filters?: StorageFilters; priority?: number; capacity?: number } & Cell)
  | { type: 'priority'; pawnId: number; work: WorkType; value: number };
export type RefusalCode = 'invalid-command' | 'out-of-bounds' | 'occupied' | 'incompatible-resource' | 'missing-target' | 'invalid-priority' | 'invalid-storage';
export interface CommandResult { ok: boolean; reason?: string; code?: RefusalCode; affected?: number; skipped?: number }
export interface JobDiagnostic { code: 'clearing' | 'blocked' | 'working' | 'ready' | 'delivering' | 'missing-materials' | 'waiting-worker'; reason: string; delivered: number; required: number }
