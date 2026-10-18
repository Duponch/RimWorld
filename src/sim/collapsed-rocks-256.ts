import {markTerrainCellChanged} from './terrain-mutation-journal.ts';
import {terrainAvailable256} from './natural-terrain-runtime-256.ts';
import {invalidateAnimalPens} from './animal-pens.ts';
import type {Tile,Terrain,World} from './types.ts';
/** A real impassable mineable building represented on the existing rock lane.
 * Its one identity is independent of the persistent roof above. No ore/yield. */
export interface CollapsedRock256 {id:number;terrain:Terrain}
export const admittedRoofTerrain256=(v:unknown,version:number):v is Terrain=>typeof v==='string'&&terrainAvailable256(v as Terrain,version);
type CollapseTile=Tile&{collapsedRock?:CollapsedRock256};
export const collapsedRockAt256=(tile:Tile):CollapsedRock256|undefined=>(tile as CollapseTile).collapsedRock;
export const isNaturalRockTile256=(tile:Tile):boolean=>tile.terrain==='rock'&&!collapsedRockAt256(tile);
export function placeCollapsedRock256(world:World,index:number):void {
 const tile=world.tiles[index];
 if(world.schemaVersion<256||!tile||tile.terrain==='rock'||collapsedRockAt256(tile)||!Number.isSafeInteger(world.nextId+1))throw Error('Cannot create collapsed rock');
 const next:CollapseTile={...tile,terrain:'rock',collapsedRock:{id:world.nextId++,terrain:tile.terrain}};
 delete next.ore;delete next.miningDamage;delete next.miningYield;
 world.tiles[index]=next;markTerrainCellChanged(world.tiles,index);invalidateAnimalPens(world);
}
/** Restore the exact retained terrain; floor/bridge/stone/snow were never
 * replaced by a guessed stone floor. This creates neither chunk nor RNG draw. */
export function excavatedCollapsedRock256(tile:Tile):Tile {
 const marker=collapsedRockAt256(tile);if(!marker)throw Error('Not a collapsed rock');
 const next:CollapseTile={...tile,terrain:marker.terrain};delete next.collapsedRock;delete next.miningDamage;delete next.miningYield;delete next.ore;return next;
}
/** Structural primitive guard; the caller supplies its actual versioned
 * terrain admission, not a second catalogue. No accessors are evaluated. */
export function validCollapsedRock256(tile:object,version:number,nextId:number,validTerrain:(value:unknown)=>value is Terrain):boolean {
 const property=Object.getOwnPropertyDescriptor(tile,'collapsedRock');if(!property)return true;
 if(version<256||!Object.hasOwn(property,'value'))return false;
 const value=property.value;if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
 const keys=Reflect.ownKeys(value);if(keys.length!==2||!keys.includes('id')||!keys.includes('terrain'))return false;
 const id=Object.getOwnPropertyDescriptor(value,'id'),terrain=Object.getOwnPropertyDescriptor(value,'terrain');
 const data=(key:string)=>Object.getOwnPropertyDescriptor(tile,key);
 return !!id&&Object.hasOwn(id,'value')&&Number.isSafeInteger(id.value)&&id.value>0&&id.value<nextId
  &&!!terrain&&Object.hasOwn(terrain,'value')&&validTerrain(terrain.value)&&terrain.value!=='rock'
  &&data('terrain')?.value==='rock'&&!Object.hasOwn(tile,'ore')&&!Object.hasOwn(tile,'miningYield');
}
/** Cold RAW/full/delta candidate census only, including both actual maps.
 * Do not call this scan from rendering or an unchanged local tick. */
export function registerCollapsedRockIdentities256(tiles:readonly Tile[],ids:{has(id:number):boolean;add(id:number):unknown}):boolean {
 for(const tile of tiles){const marker=collapsedRockAt256(tile);if(!marker)continue;if(ids.has(marker.id))return false;ids.add(marker.id);}return true;
}
