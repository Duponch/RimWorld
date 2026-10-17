/** Prospective LOCAL exploration authority. Absence preserves legacy maps. */
import type {World,Tile} from './types.ts';
export interface ExplorationState256 {revision:1}
export type ExploredTile256=Tile&{fogged?:true};
export type ExplorationMap256=Pick<World,'width'|'height'>&{schemaVersion:number;site?:{revision:number};tiles:ExploredTile256[];exploration?:ExplorationState256};
export const validExplorationCell256=(map:Pick<ExplorationMap256,'width'|'height'|'tiles'>,cell:number):boolean=>Number.isInteger(cell)&&cell>=0&&cell<map.width*map.height&&cell<map.tiles.length;
export function explorationEnabled256(map:ExplorationMap256):boolean {return map.schemaVersion===256&&map.site?.revision===3&&map.exploration?.revision===1;}
export function assertExplorationDimensions256(map:Pick<ExplorationMap256,'width'|'height'|'tiles'>):void {
 if(![map.width,map.height].every(v=>Number.isInteger(v)&&v>=1&&v<=400)||map.tiles.length!==map.width*map.height)throw Error('Invalid actual exploration dimensions');
}
/** Queries outside the map have no hidden Thing. Command callers still use
 * their separate in-bounds admission; this never makes fog an AI obstacle. */
export function foggedCell256(map:ExplorationMap256,cell:number):boolean {return explorationEnabled256(map)&&validExplorationCell256(map,cell)&&map.tiles[cell]!.fogged===true;}
/** Terrain replacement must preserve exploration until the real reveal hook.
 * This does not give a new/old map exploration it did not already own. */
export function retainExplorationCell256<T extends ExploredTile256>(before:ExploredTile256,after:T):T&{fogged?:true} {return before.fogged===true?{...after,fogged:true}:after;}
