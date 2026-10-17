import {isAncientGeneratedFloor256} from './ancient-generated-floor-state-256.ts';
/** Pure adaptation of the actual17 Core terrain definitions. No terrain
 * rewrite, map scan, owner, cadence or generic terrain registry is introduced. */
import {NATURAL_TERRAIN_DEFINITIONS_256 as DEFS,NATURAL_TERRAIN_BINDINGS_256 as BINDINGS,isNaturalTerrain256,type TerrainAffordance256} from './local-terrain-definitions-256.ts';
import type {Tile} from './types.ts';
import {PACKED_DIRT_256} from './road-ground-256.ts';
export const NATURAL_TERRAIN_RUNTIME_SCHEMA=256;
export interface TerrainRuntimeMetadata256 {schemaVersion?:number;site?:{revision:number}}
const historical=new Set(['grass','soil','water','rock','rough-stone','rich-soil','gravel','marsh','water-shallow']);
export function terrainAvailable256(terrain:unknown,version:number):boolean {return terrain==='grass'||terrain==='soil'||terrain==='water'||terrain==='rock'||terrain==='rough-stone'&&version>=28||(terrain==='rich-soil'||terrain==='gravel')&&version>=83||terrain==='marsh'&&version>=246||terrain==='water-shallow'&&version>=254||version>=256&&(terrain==='packed-dirt'||isNaturalTerrain256(terrain));}
export function terrainHasProspectiveRules256(terrain:unknown,w:TerrainRuntimeMetadata256):boolean {return (w.schemaVersion??255)>=256&&(terrain==='packed-dirt'||isNaturalTerrain256(terrain)&&(!historical.has(terrain)||w.site?.revision===3));}
export function terrainIsWater256(terrain:unknown):boolean {return isNaturalTerrain256(terrain)&&DEFS[terrain].water;}
export function terrainBridgeable256(terrain:unknown,version:number):boolean {return terrainAvailable256(terrain,version)&&isNaturalTerrain256(terrain)&&DEFS[terrain].affordances.includes('Bridgeable');}
export function terrainExtinguishesFire256(tile:Pick<Tile,'terrain'|'bridge'|'floor'>):boolean {return !tile.bridge&&!tile.floor&&(tile.terrain==='water'||isNaturalTerrain256(tile.terrain)&&DEFS[tile.terrain].extinguishesFire);}
export function terrainAcceptsFilth256(tile:Pick<Tile,'terrain'|'bridge'|'floor'>):boolean {if(tile.bridge||tile.floor)return true;if(isNaturalTerrain256(tile.terrain))return DEFS[tile.terrain].affordances.includes('Walkable')&&DEFS[tile.terrain].acceptsUnnaturalFilth;return tile.terrain!=='water'&&tile.terrain!=='rock';}
export function terrainHoldsSnow256(terrain:unknown,bridge=false):boolean {if(bridge)return true;return isNaturalTerrain256(terrain)?DEFS[terrain].holdsSnow:terrain!=='water'&&terrain!=='rock';}
export function terrainExtraDeterioration256(tile:Pick<Tile,'terrain'|'floor'|'bridge'>):number {return tile.bridge||tile.floor?0:tile.terrain==='water'?3:isNaturalTerrain256(tile.terrain)?DEFS[tile.terrain].extraDeterioration:0;}
/** Complete affordances apply only to newly introduced identities or a true
 * geographic site3. Neutral migrations keep old rough-stone graves literal. */
export function terrainSupportsAffordance256(tile:Pick<Tile,'terrain'|'bridge'|'floor'>&Partial<Pick<Tile,'mineable'>>,need:TerrainAffordance256,w:TerrainRuntimeMetadata256):boolean {
 if(!terrainAvailable256(tile.terrain,w.schemaVersion??255))return false;
 if(isAncientGeneratedFloor256(tile.floor))return (w.schemaVersion??255)>=256&&terrainSupportsFloor256(tile,w)&&['Walkable','Light','Medium','Heavy'].includes(need);
 if(tile.bridge)return terrainBridgeable256(tile.terrain,w.schemaVersion??255)&&(need==='Walkable'||need==='Light');
 if(tile.floor==='broken-asphalt')return (w.schemaVersion??255)>=256&&['Walkable','Light','Medium','Heavy'].includes(need);
 if(tile.terrain==='packed-dirt'&&!tile.floor)return PACKED_DIRT_256.affordances.includes(need);
 if(!terrainHasProspectiveRules256(tile.terrain,w))return tile.terrain!=='marsh'&&tile.terrain!=='water-shallow';
 if(tile.floor)return terrainSupportsAffordance256({terrain:tile.terrain},'Heavy',w)&&['Walkable','Light','Medium','Heavy'].includes(need);
 return isNaturalTerrain256(tile.terrain)&&DEFS[tile.terrain].affordances.includes(need);
}
/** Every delivered constructed floor inherits Core FloorBase Heavy. */
export function terrainSupportsFloor256(tile:Pick<Tile,'terrain'|'bridge'>&Partial<Pick<Tile,'floor'|'mineable'>>,w:TerrainRuntimeMetadata256):boolean {if(isAncientGeneratedFloor256(tile.floor))return (w.schemaVersion??255)>=256&&!tile.bridge&&(tile.terrain!=='rock'||tile.mineable!==undefined)&&terrainSupportsAffordance256({terrain:tile.mineable?.terrain??tile.terrain},'Heavy',w);if(tile.floor==='broken-asphalt')return (w.schemaVersion??255)>=256&&terrainAvailable256(tile.terrain,w.schemaVersion??255)&&tile.terrain!=='rock'&&!tile.bridge;return terrainHasProspectiveRules256(tile.terrain,w)?terrainSupportsAffordance256({terrain:tile.terrain,bridge:tile.bridge},'Heavy',w):terrainAvailable256(tile.terrain,w.schemaVersion??255)&&!['rock','water','marsh','water-shallow'].includes(tile.terrain);}
export function terrainGroundFertility256(tile:Pick<Tile,'terrain'|'bridge'|'floor'>):number {if(tile.floor||tile.bridge)return 0;return isNaturalTerrain256(tile.terrain)?DEFS[tile.terrain].fertility:tile.terrain==='grass'?1:tile.terrain==='soil'?.7:0;}
const coreIds=new Map<string,string>(Object.entries(BINDINGS).map(([core,id])=>[id,core]));
const soilTags=new Set(['soil-natural','rich-soil','gravel','mossy-soil','marshy-soil','riverbank']);
/** Real Core tags/def identity for the existing narrow flora profile guard. */
export function naturalPlantSubstrate256(tile:Pick<Tile,'terrain'|'bridge'|'floor'|'stone'>):{fertility:number;terrainDefId:string;tags:readonly string[]} {
 const t=tile.terrain,tags=soilTags.has(t)?['Soil']:t==='mud'?['Mud']:t==='marsh'?['Water','WaterMarshy']:t==='ice'?['Ice']:t==='river-shallow'?['Water','River','WaterFreshShallow','WaterFreshShallowMoving']:t==='river-chest-deep'?['Water','River']:t==='water-shallow'?['Water','WaterFreshShallow','WaterFreshShallowStill']:t==='ocean-shallow'||t==='ocean-deep'?['Water','Ocean']:t==='water-deep'?['Water']:[];
 const stone=tile.stone?tile.stone[0]!.toUpperCase()+tile.stone.slice(1)+'_Rough':undefined;return {fertility:terrainGroundFertility256(tile),terrainDefId:t==='packed-dirt'?'PackedDirt':coreIds.get(t)??(t==='rough-stone'&&stone?stone:t),tags:tile.bridge||tile.floor?[]:t==='packed-dirt'?['Road']:tags};
}
