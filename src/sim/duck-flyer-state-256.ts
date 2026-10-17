import type {Cell} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
export interface DuckExitFlight256 {revision:1;startedAtCore:number;readyAtCore:number}
interface DuckFlyerBase256 {revision:1;id:number;cell:Cell;startedAtCore:number;atCore:number;totalCore:number;remainingCore:number;personalTick:number;animal:WildAnimal}
/** A Thing holder owns the ORIGINAL unspawned animal, not a visual duplicate. */
export type DuckFlyer256=DuckFlyerBase256&({kind:'arrival';roofHit:boolean}|{kind:'leaving';flipped:boolean});
