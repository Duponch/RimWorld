import type {MaterialPile,Pawn} from './types.ts';
import type {CommercialStockPile} from './commercial-state.ts';

/** Pure authority projections shared with the DOM; no UI/runtime dependency. */
export type GroupPanelAction='adopt'|'start'|'cancel'|'pause'|'route'|'return'|'buy'|'sell'|'unload';
export interface GroupActionPermission {ok:boolean;reason?:string}
export interface GroupMemberChoice extends GroupActionPermission {pawn:Pawn}
export interface GroupSourceChoice {pile:MaterialPile;reserved:number;available:number;reason?:string}
export interface GroupMassView {
  grams:number;capacityGrams:number;rations:number;
  byMember:readonly {pawnId:number;grams:number;capacityGrams:number}[];
}
export interface GroupTradeChoice {pile:MaterialPile|CommercialStockPile;available:number;unitPrice:number;reason?:string}
export interface GroupTradeView {
  negotiator:Pawn|null;refusal?:string;groupSilver:number;postSilver:number;
  buys:readonly GroupTradeChoice[];sells:readonly GroupTradeChoice[];
}
export interface GroupPermissionView {
  originTile:number;originLabel:string;maximumSources:number;
  mass:GroupMassView|null;confirmedRoute:readonly number[];
  actions:Readonly<Record<GroupPanelAction,GroupActionPermission>>;
  trade:GroupTradeView|null;
}
export type GroupFormationPreview=
  | {ok:true;route:readonly number[];mass:GroupMassView;carriers:readonly {pileId:number;pawnId:number;quantity:number}[]}
  | {ok:false;reason:string};
export type GroupRoutePreview={ok:true;route:readonly number[];durationCore:number}|{ok:false;reason:string};
export type GroupTradePreview={ok:true;signature:string;totalSilver:number;mass:GroupMassView}|{ok:false;reason:string};
