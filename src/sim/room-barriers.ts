import {isShipPartKind276} from './ship-part-content-276.ts';
import {isRoomDoor} from './door-rules.ts';
import {footprintCells} from './definitions.ts';
import type {Cell,Structure} from './types.ts';

const volume=(kind:Structure['kind']):boolean=>kind==='electric-crematorium'||isShipPartKind276(kind)||kind==='geothermal-generator';

/** Enclosure/light barriers, not movement, roof or thermal classification.
 * Shared by exhaustive RoomTopologyCache and its confirmed sparse observer. */
export function roomBarrierValue(kind:Structure['kind']):0|1|2 {
 return kind==='wall'||kind==='cooler'||kind==='vent'||volume(kind)?1:isRoomDoor(kind)?2:0;
}

/** Preserve native input order and the historical single-cell exceptions.
 * Call only after roomBarrierValue returned a nonzero value. */
export function roomBarrierCells(structure:Structure):readonly Cell[] {
 return volume(structure.kind)?footprintCells(structure):[structure];
}
