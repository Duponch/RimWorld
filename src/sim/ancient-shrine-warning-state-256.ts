import type {AncientRect256} from './local-ancient-placement-256.ts';
import type {Cell} from './types.ts';
/** A specific RectTrigger/SignalAction_Letter pair, never a generic signal bus.
 * IDs name the two original Things. Destroyed IDs are retained as notification
 * provenance only; live Things alone enter the physical identity namespace. */
export interface AncientShrineWarning256 {
 triggerId:number;actionId:number;rect:AncientRect256;center:Cell;
 triggerAlive:boolean;actionAlive:boolean;
 letter?:{tick:number;pawnId:number};
}
export interface AncientShrineWarnings256 {revision:1;pairs:AncientShrineWarning256[]}
