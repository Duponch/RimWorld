import type { Cell } from './types.ts';
import type { TradeLine } from './trade-state.ts';

export type OrbitalKind='bulk'|'exotic';
export interface OrbitalShip {id:number;kind:OrbitalKind;name:string;arrivedAt:number;departAt:number;announced:boolean}
/** Items live exclusively in World.piles, with the delivery owner. */
export interface OrbitalDelivery {id:number;shipId:number;negotiatorId:number;cell:Cell;createdAt:number;landAt:number;openAt:number}
export interface OrbitalTradeTask {shipId:number;consoleId:number;spot:Cell;phase:'approach'|'ready';startedAt:number}
export interface OrbitalState {
  profile:'orbital-v1';adoptedAt:number;rng:number;cycleStart:number;scheduledAt:number;nextCheckAt:number;
  ships:OrbitalShip[];pending:OrbitalDelivery[];
}
export type OrbitalCommand={type:'order-orbital-trade';pawnId:number;shipId:number;consoleId:number}
  |{type:'cancel-orbital-trade';pawnId:number}
  |{type:'orbital-trade-execute';pawnId:number;shipId:number;lines:TradeLine[];quote:string;acceptShortfall:boolean};
export const ORBITAL_SHIP_LIMIT=5;
export const ORBITAL_DELIVERY_LIMIT=128;
export const ORBITAL_LIFETIME=4000;
export const ORBITAL_CHECK=100;
export const ORBITAL_CYCLE=90000;
export const ORBITAL_ACTIVE_CHECKS=420;
export const ORBITAL_FALL_TICKS=6;
export const ORBITAL_OPEN_TICKS=4;
