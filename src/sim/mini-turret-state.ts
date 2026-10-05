import type { Cell } from './types.ts';

/** Intrinsic gun state belongs to the installed Structure, never to a Pawn or item. */
export type TurretLivingKey = `pawn:${number}` | `animal:${number}` | `mech:${number}`;
export type BombInstigatorKey = TurretLivingKey | `structure:${number}`;
export interface TurretWick { startedAtCore:number; endCore:number; instigatorKey?:BombInstigatorKey }
export interface MiniTurretState {
  /** Quarter shots: each emission spends four, each physically serviced steel adds three. */
  ammoQ:number;
  autoReload:boolean;
  holdFire:boolean;
  targetKey:TurretLivingKey|null;
  warmup:{remainingCore:number;totalCore:number}|null;
  /** First shot commits immediately; only the remaining second shot is persisted. */
  burst:{targetKey:TurretLivingKey;shotsLeft:1;delayCore:number}|null;
  cooldownCore:number;
  wick?:TurretWick;
}
export interface BombRefuge { sourceId:number; target:Cell; endCore:number }
export type TurretCommand = {type:'turret-hold-fire';structureId:number;enabled:boolean}
  |{type:'turret-auto-reload';structureId:number;enabled:boolean};
export const newMiniTurretState=():MiniTurretState=>({ammoQ:240,autoReload:true,holdFire:false,targetKey:null,warmup:null,burst:null,cooldownCore:0});
