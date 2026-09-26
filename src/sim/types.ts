import type { ItemId } from './items.ts';
export const SCHEMA_VERSION = 106 as const;
export const TICKS_PER_SECOND = 6;
export const TICKS_PER_DAY = 6000;

export type Terrain = 'grass' | 'soil' | 'water' | 'rock' | 'rough-stone' | 'rich-soil' | 'gravel';
export type ResourceKind = 'wild-plant' | 'potato' | 'corn' | 'tree' | 'berries' | 'rock' | 'rice' | 'cotton';
export type MaterialKind = 'silver' | 'corpse' | 'wood' | 'food' | 'chunk' | 'steel' | 'blocks' | 'component' | 'medicine' | 'weapon' | 'apparel' | 'textile' | 'unfinished';
export type StructureKind = 'art-bench' | 'small-sculpture' | 'large-sculpture' | 'machining-table' | 'grave' | 'heater' | 'wind-turbine' | 'power-conduit' | 'power-switch' | 'battery' | 'solar-generator' | 'fueled-stove' | 'electric-stove' | 'butcher-table' | 'butcher-spot' | 'cooler' | 'research-bench' | 'tailor-bench' | 'electric-tailor-bench' | 'crafting-spot' | 'wood-generator' | 'standing-lamp' | 'passive-cooler' | 'door' | 'wall' | 'bed' | 'table' | 'table-square' | 'table-long' | 'stool' | 'dining-chair' | 'armchair' | 'end-table' | 'dresser' | 'flower-pot' | 'campfire' | 'horseshoes' | 'stonecutter';
export type JobKind = 'lay-floor' | 'remove-floor' | 'flick' | 'repair' | 'build-roof' | 'remove-roof' | 'mine' | 'chop' | 'harvest' | 'cut' | 'sow' | 'deconstruct' | 'uninstall' | 'install' | StructureKind;
export type WorkType = 'handle' | 'art' | 'clean' | 'firefight' | 'warden' | 'basic' | 'hunt' | 'research' | 'patient' | 'bedrest' | 'doctor' | 'mine' | 'gather' | 'build' | 'haul' | 'grow' | 'cook' | 'craft';
export type Orientation = 0 | 1 | 2 | 3;
export type Footprint = 'standard' | 'legacy-single';
export type PawnState = 'idle' | 'moving' | 'working' | 'sleeping' | 'hungry' | 'eating' | 'recreating' | 'resting' | 'downed' | 'dead';
export interface Cell { x: number; z: number }
export interface Tile { floor?:import('./flooring.ts').FloorKind; ore?: 'steel' | 'machinery'; miningDamage?: number; terrain: Terrain; stone?: import('./geology.ts').StoneKind }
export interface Resource extends Cell { species?:import('./biome-flora.ts').PlantSpecies; plantLife?:import('./plant-life.ts').PlantLife; damage?:number; id: number; kind: ResourceKind; amount: number; growth?: number; growthTick?: number; growthThermalFactor?:number; stone?: import('./geology.ts').StoneKind }
export interface Structure extends Cell { art?:{authorId:number;createdAt:number}; flower?:import('./flower-pot.ts').FlowerPotState; quality?:import('./equipment-rules.ts').WeaponQuality; grave?:import('./burial.ts').GraveState; heater?:import('./heater.ts').HeaterState; wind?:import('./wind.ts').WindTurbineState; prisoner?:true; battery?:import('./power-battery.ts').BatteryState; cooler?:import('./cooler.ts').CoolerState; damage?:number; medical?:true; power?:import('./power-rules.ts').PowerState; door?:import('./door-rules.ts').DoorState; material?:import('./construction-materials.ts').ConstructionMaterial; bills?: import('./cooking-types.ts').CookingBill[]; fuel?: import('./fuel.ts').FuelState; id: number; kind: StructureKind; orientation: Orientation; footprint: Footprint }
export interface Stock { wood: number; food: number }
export type MaterialOwner = {type:'grave';graveId:number} | ({ type: 'ground' } & Cell) | { type: 'pawn'; pawnId: number } | {type:'inventory';pawnId:number} | {type:'equipment';pawnId:number} | {type:'apparel';pawnId:number} | { type: 'job'; jobId: number };
export interface MaterialPile { artWork?:import('./art-work.ts').ArtWork; gunWork?:import('./gun-work.ts').GunWork; humanCorpse?:import('./human-corpses.ts').HumanCorpseState; foodPoison?:import('./food-poisoning.ts').FoodContamination; damage?:number; corpse?:import('./corpses.ts').CorpseState; unfinished?:import('./unfinished.ts').UnfinishedState; apparel?:import('./apparel-rules.ts').ApparelState; weapon?:import('./equipment-rules.ts').WeaponState; haulRequested?: true; id: number; kind: MaterialKind; item: ItemId; quantity: number; owner: MaterialOwner; rot?: import('./food-preservation.ts').RotState }
export type StorageFilters = { silver?:boolean; corpse?:boolean; wood:boolean; food:boolean; unfinished?:boolean; textile?:boolean; chunk?:boolean; steel?:boolean; component?:boolean; medicine?:boolean; weapon?:boolean; apparel?:boolean; blocks?:boolean; furniture?:boolean };
export interface StockpileCell extends Cell { items?:Partial<Record<ItemId,boolean>>; id: number; filters: StorageFilters; priority: number; capacity: number }
export interface GrowingZone { id: number; cells: number[]; plant: 'rice' | 'cotton' | 'potato' | 'corn'; allowSow: boolean; allowCut: boolean }
export type HaulDestination = { type: 'fuel'; structureId: number; forced?: boolean; forCooking?: boolean } | { type: 'stockpile'; stockpileId: number; forHunting?: true } | { type: 'job'; jobId: number; forConstruction?: boolean } | ({ type: 'aside'; growingZoneId?: number; sowCell?: Cell; constructionId?: number; forConstruction?: boolean } & Cell);
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
  | { kind: 'eat'; phase: 'pickup' | 'choose-spot' | 'travel' | 'ingest'; sourcePileId: number; carryPileId: number | null; quantity: number; progress: number; workRemainder?:number; dining: DiningPlace | null }
  | { kind: 'sleep'; roomRest?:import('./room-experience.ts').RoomRest; medical?:'patient'|'bedrest'; phase: 'travel' | 'sleep'; bedId: number | null; target: Cell };
export interface Job extends Cell {
  floor?:import('./flooring.ts').FloorKind;
  flick?:{structureId:number;kind:StructureKind;on:boolean};
  repair?:import('./repairs.ts').RepairTarget;
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
  flowerPotId?:number;
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
  animalHandling?:import('./domestic-state.ts').AnimalHandlingTask;
  animalCare?:import('./domestic-state.ts').AnimalCareTask;
  roomMemories?:import('./room-experience.ts').RoomMemory[];
  body?:import('./human-corpses.ts').HumanBodyState;
  burial?:import('./burial.ts').BurialTask;
  cleaning?:import('./cleaning.ts').CleaningTask;
  filthFeet?:import('./filth.ts').FilthFeet;
  visitor?:import('./visitor-state.ts').VisitorState;
  trade?:import('./trade-state.ts').TradeTask;
  firefighting?:import('./fire-rules.ts').FirefightingTask;
  burning?:import('./fire-rules.ts').BurningReaction;
  prisoner?:import('./prisoner-state.ts').PrisonerState;
  recruitment?:{capturedAt:number;recruitedAt:number;fromFaction:'outlaws';raidGroup?:number};
  ward?:import('./prisoner-state.ts').WardTask;
  hunting?:import('./hunting-state.ts').HuntingTask;
  heatRefuge?:import('./heat-refuge.ts').HeatRefuge;
  research?:import('./research.ts').ResearchTask;
  social?:import('./social-state.ts').SocialState;
  raid?:import('./raid-state.ts').RaiderState;
  traits?: import('./traits.ts').TraitId[];
  mental?: import('./mental-state.ts').MentalState;
  faction?:import('./affiliation.ts').FactionId;
  hostilityResponse?:'ignore'|'attack';
  lastAttack?:import('./automatic-combat-state.ts').AttackMemory;
  disturbance?:import('./disturbance-state.ts').DisturbanceState;
  tactics?:import('./tactics-state.ts').TacticsState;
  flee?:import('./threats.ts').FleeState;
  melee?:import('./melee-state.ts').MeleeState;
  stun?:import('./stun.ts').StunState;
  shooting?:import('./shooting-state.ts').ShootingState;
  stagger?:import('./stagger.ts').StaggerState;
  draft?:import('./drafting-rules.ts').DraftState;
  equipmentTask?:import('./equipment-rules.ts').EquipmentTask;
  equipmentDropPending?:true;
  droppedWeaponId?:number;
  feed?: import('./feeding-rules.ts').FeedTask;
  tend?: import('./care-rules.ts').TendTask;
  careDisabled?:true;
  medicalCare?:import('./medicine-rules.ts').MedicalCare;
  selfTend?:true;
  rescue?: import('./rescue-state.ts').RescueTask;
  health?: import('./injury-types.ts').MedicalRecord;
  /** Actual sleep while incapacitated, separate from lying posture. */
  medicalSleep?:true;
  /** Interruption retained one undroppable/in-flight object, not an inventory. */
  interruptedCargo?: true;
  skills: import('./skills.ts').PawnSkills;
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
  beauty: number;
  apparelPolicyId?:number;
  apparelAutomation?:boolean;
  nextApparelCheckAt?:number;
  memories: Memory[];
  deniedJoining?:number[];
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
  economy?:import('./colony-economy.ts').ColonyEconomy;
  apparelWear?:import('./apparel-renewal.ts').ApparelWearState;
  apparelPolicies?:import('./apparel-policy.ts').ApparelPolicy[];
  nextApparelPolicyId?:number;
  filth?:import('./filth.ts').FilthState;
  visitors?:import('./visitor-state.ts').VisitorCalendar;
  trade?:import('./trade-state.ts').TradeLedger;
  climate?:import('./site-climate.ts').SiteClimate;
  wind?:import('./wind.ts').WindState;
  weather?:import('./weather.ts').WeatherState;
  fires?:import('./fire-rules.ts').FireState;
  prisonDepartures?:import('./prisoner-exit.ts').PrisonDeparture[];
  site?:import('./site.ts').LocalSite;
  gameProfile?:import('./game-profile.ts').GameProfile;
  scenario?:import('./scenario-definitions.ts').ScenarioStamp;
  hunting?:{targets:number[];completed:number};
  butchery?:{completed:number;meat:number;leather:number};
  flora?:import('./wild-flora.ts').WildFloraState;
  wildlife?:import('./wildlife-state.ts').WildlifeState;
  heatwaves?:import('./heatwave.ts').HeatwaveCalendar;
  research?:import('./research.ts').ResearchState;
  raids?:import('./raid-state.ts').RaidCalendar;
  home?:number[];
  destroyed?:import('./barriers.ts').DestructionLedger;
  arrivals?:import('./arrival-state.ts').ArrivalState;
  projectiles?:import('./projectile-state.ts').WorldProjectile[];
  roofing?: import('./roof-rules.ts').RoofingState;
  thermal?: import('./temperature.ts').ThermalState;
  packed: import('./furniture-rules.ts').PackedFurniture[];
  tailoring?:import('./unfinished.ts').TailoringLedger;
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
export type DesignateCommand = { type: 'designate'; kind: JobKind; targetId?:number; orientation?: Orientation; material?:import('./construction-materials.ts').ConstructionMaterial; floor?:import('./flooring.ts').FloorKind } & Cell;
export type AreaAction = 'lay-floor' | 'remove-floor' | 'home' | 'remove-home' | 'build-roof' | 'remove-roof' | 'ignore-roof' | 'mine' | 'haul-chunks' | 'deconstruct' | 'chop' | 'harvest' | 'cut' | 'cancel' | 'stockpile' | 'remove-stockpile' | 'growing' | 'remove-growing';
export interface StorageSettings { items?:Partial<Record<ItemId,boolean>>; filters?: StorageFilters; priority?: number; capacity?: number }
export interface AreaCommand extends StorageSettings { type: 'area'; action: AreaAction; from: Cell; to: Cell; floor?: import('./flooring.ts').FloorKind }
export type Command = import('./domestic-state.ts').DomesticCommand | import('./burial.ts').BurialCommand | import('./cleaning.ts').CommandCleaning | import('./trade-state.ts').TradeCommand | import('./hunting-state.ts').HuntingCommand
  | {type:'adopt-economy'}
  | {type:'climate-adopt'}
  | {type:'heater-adjust';structureId:number;offset:-10|-1|1|10|null}
  | {type:'wind-auto-cut';structureId:number;enabled:boolean}
  | {type:'order-extinguish';pawnId:number;fireId:number}
  | {type:'prison-bed';bedId:number;enabled:boolean}
  | {type:'prisoner-mode';patientId:number;mode:import('./prisoner-state.ts').PrisonerMode}
  | {type:'order-capture';pawnId:number;patientId:number;queue:boolean}
  | {type:'power-flick';structureId:number;on:boolean}
  | {type:'enable-wildlife'}
  | {type:'cancel-unfinished';itemId:number}
  | {type:'enable-raids'}
  | import('./arrival-state.ts').ArrivalCommand
  | {type:'hostility-response';pawnId:number;response:'flee'|'ignore'|'attack'}
  | import('./melee-state.ts').MeleeCommand
  | import('./shooting-state.ts').ShootingCommand
  | import('./drafting-rules.ts').DraftCommand
  | import('./equipment-rules.ts').EquipmentCommand
  | import('./medical-beds.ts').MedicalBedCommand
  | {type:'medical-care';pawnId:number;care:import('./medicine-rules.ts').MedicalCare}
  | {type:'medical-policy';pawnId:number;enabled:boolean}
  | {type:'order-feed';pawnId:number;patientId:number;queue:boolean}
  | {type:'order-tend';pawnId:number;patientId:number;queue:boolean}
  | {type:'self-tend-policy';pawnId:number;enabled:boolean}
  | {type:'order-rescue';pawnId:number;patientId:number;queue:boolean}
  | import('./doors.ts').DoorCommand
  | ({type:'install';structureId:number;orientation:Orientation} & Cell)
  | import('./player-orders.ts').OrderCommand
  | import('./food-policy.ts').FoodPolicyCommand
  | import('./apparel-system.ts').ApparelPolicyAssignmentCommand
  | import('./schedule.ts').ScheduleCommand
  | { type: 'bill-add';recipe?:import('./production-recipes.ts').ProductionRecipe; structureId: number }
  | { type: 'bill-update'; structureId: number; billId: number; settings: import('./cooking-types.ts').BillSettings }
  | { type: 'bill-remove'; structureId: number; billId: number }
  | { type: 'bill-move'; structureId: number; billId: number; direction: -1 | 1 }
  | DesignateCommand
  | AreaCommand
  | { type: 'refuel-policy'; structureId: number; enabled: boolean }
  | { type: 'growing-policy'; zoneId: number; plant?: GrowingZone['plant']; allowSow: boolean; allowCut: boolean }
  | { type: 'assign-bed'; bedId: number; pawnId: number | null }
  | ({ type: 'cancel' } & Cell)
  | ({ type: 'stockpile'; enabled: boolean; items?:Partial<Record<ItemId,boolean>>; filters?: StorageFilters; priority?: number; capacity?: number } & Cell)
  | {type:'enable-heatwaves'}
  | {type:'cooler-target';structureId:number;target:number}
  | {type:'cooler-adjust';structureId:number;offset:-10|-1|1|10|null}
  | {type:'research-project';project:import('./research.ts').ResearchProject|null}
  | { type: 'priority'; pawnId: number; work: WorkType; value: number };
export type RefusalCode = 'invalid-command' | 'out-of-bounds' | 'occupied' | 'incompatible-resource' | 'missing-target' | 'invalid-priority' | 'invalid-storage';
export interface CommandResult { ok: boolean; reason?: string; code?: RefusalCode; affected?: number; skipped?: number }
export interface JobDiagnostic { code: 'clearing' | 'blocked' | 'working' | 'ready' | 'delivering' | 'missing-materials' | 'waiting-worker'; reason: string; delivered: number; required: number }
