import type {World,Command,Cell,Orientation} from '../sim/types';
import type {CampaignSummary} from '../sim/world-map-state';
import type {Panel,Tool,ArchitectCategory} from '../ui/layout';
import type {SavedColony} from '../ui/game-session';
import type {MapObjectSelection} from '../ui/map-object-selection';
import type {ConstructionMaterial} from '../sim/construction-materials';
import type {BillWorkerOptions283} from '../sim/bill-worker-state-283';
import type {StorageControlSettings} from '../ui/storage-item-controls';
import type {CampEntryProgressMessage256,CaravanEncounterProgressMessage261} from '../bridge/protocol';
import type {WorldPhysicalSurface} from '../sim/world-surface-geography';
import type {WorldRoadLink} from '../sim/world-roads';

/** Renderer-neutral native interface. No element, HTML, CSS, browser layout or
 * synthetic click is an authority for a visible control. */
export interface NativeControl {
  id:string;
  label:string;
  icon?:string;
  color?:string;
  disabled?:boolean;
  active?:boolean;
  hint?:string;
  onActivate:()=>void|Promise<unknown>;
}
export interface NativeRow {
  id:string;
  label:string;
  value?:string;
  detail?:string;
  controls?:NativeControl[];
  /** Equal-width cells are used by work and schedule matrices. */
  compact?:boolean;
  input?:{
    value:string;placeholder?:string;maxLength?:number;kind?:'text'|'number';
    onCommit:(value:string)=>void|boolean|Promise<unknown>;
  };
}
export interface NativePage {
  id:string;
  title:string;
  subtitle?:string;
  color?:string;
  rows:NativeRow[];
  actions?:NativeControl[];
  onClose?:()=>void;
  /** True for front screens/confirmations. Captures world input until closed. */
  modal?:boolean;
  closable?:boolean;
  width?:number;
  visual?:{
    kind:'planet';surface:WorldPhysicalSurface;roads?:readonly (readonly WorldRoadLink[])[];
    selected:number|null;markers?:readonly {tile:number;label?:string;color?:number}[];
    onSelect:(tile:number)=>void;
  };
  portrait?:{url:string;label:string};
}
export interface NativeUiState {
  world?:World;
  epoch?:number;
  campaign?:CampaignSummary;
  panel:Panel;
  category:ArchitectCategory;
  tool:Tool;
  orientation:Orientation;
  selectedPawnIds:readonly number[];
  selectedCell?:Cell;
  selectedObjects:readonly MapObjectSelection[];
  constructionMaterial:ConstructionMaterial;
  creationStorage:StorageControlSettings;
  selectedAnimalId?:number;
  selectedMechanoidId?:number;
  lightLevel?:number;
  campProgress?:CampEntryProgressMessage256;
  caravanProgress?:CaravanEncounterProgressMessage261;
  speed:number;
  hasGame:boolean;
  busy:boolean;
  fault?:string;
  saves:readonly SavedColony[];
}
export interface NativeUiActions {
  command:(command:Command)=>Promise<unknown>;
  panel:(panel:Panel)=>void|Promise<unknown>;
  category:(category:ArchitectCategory)=>void;
  tool:(tool:Tool)=>void;
  selectPawn:(id:number)=>void;
  speed:(speed:number)=>void|Promise<unknown>;
  rotate:(direction:number)=>void;
  material:(material:ConstructionMaterial)=>void;
  creationStorage:(settings:StorageControlSettings)=>void;
  front:(page:'home'|'create'|'load')=>void|Promise<unknown>;
  save:()=>void|Promise<unknown>;
  exportSave:()=>void|Promise<unknown>;
  showPage:(page:NativePage)=>void;
  refresh:()=>void;
  clearSelection?:()=>void;
  selectObject?:(object:MapObjectSelection)=>void;
  placeFurniture?:(structureId:number)=>void;
  replant?:(pileId:number)=>void;
  readBillWorkers?:(structureId:number,billId:number)=>Promise<BillWorkerOptions283>;
  cancelCampEntry?:(id:number,groupId:number)=>Promise<unknown>;
  readState?:()=>NativeUiState;
  closePage?:()=>void;
  openVisitorTrade?:()=>void;
  openOrbitalTrade?:(consoleId?:number)=>void;
  resizeZone?:(kind:'stockpile'|'growing',id:number,shrink:boolean)=>void;
  paintAllowedArea?:(id:number,enabled:boolean)=>void;
}
