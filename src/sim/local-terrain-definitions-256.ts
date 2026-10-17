/** Prospective natural terrain facts, Core1.6.4871. Legacy terrain identities
 * are not rewritten. In particular old `soil` is not ordinary Core Soil.
 * Physical movement and perceived route cost are deliberately separate.
 * No seasonal ice: the installed runtime gates water freezing on Odyssey. */
import type {CoreLocalTerrainDef256,LocalBiomeTerrainRole256} from './local-biome-rules-v256.ts';

export const NATURAL_TERRAIN_BINDINGS_256={
 Soil:'soil-natural',SoilRich:'rich-soil',Gravel:'gravel',Marsh:'marsh',MossyTerrain:'mossy-soil',MarshyTerrain:'marshy-soil',Mud:'mud',Sand:'sand',SoftSand:'soft-sand',Ice:'ice',Riverbank:'riverbank',
 WaterShallow:'water-shallow',WaterDeep:'water-deep',WaterOceanShallow:'ocean-shallow',WaterOceanDeep:'ocean-deep',WaterMovingShallow:'river-shallow',WaterMovingChestDeep:'river-chest-deep'
} as const satisfies Record<CoreLocalTerrainDef256,string>;
export type NaturalTerrainId256=typeof NATURAL_TERRAIN_BINDINGS_256[CoreLocalTerrainDef256]|'rough-stone';
export type TerrainAffordance256='Walkable'|'Light'|'Medium'|'Heavy'|'GrowSoil'|'Diggable'|'Bridgeable'|'ShallowWater'|'WaterproofConduitable'|'MovingFluid'|'SmoothableStone';
export interface NaturalTerrainDefinition256 {
 readonly fertility:number;readonly pathCostCore:number;readonly perceivedCivilCore:number;readonly perceivedDraftedCore:number;
 readonly affordances:readonly TerrainAffordance256[];readonly water:boolean;readonly river:boolean;readonly ice:boolean;
 readonly extinguishesFire:boolean;readonly holdsSnow:boolean;readonly acceptsUnnaturalFilth:boolean;readonly extraDeterioration:number;
 readonly stone:boolean;readonly supportsRock:boolean;
}
const LAND=['Walkable','Light','Medium','Heavy','GrowSoil','Diggable'] as const;
const SHALLOW=['ShallowWater','WaterproofConduitable','Bridgeable','Walkable'] as const;
function land(fertility:number,pathCostCore:number,affordances:readonly TerrainAffordance256[]=LAND):NaturalTerrainDefinition256 {
 return Object.freeze({fertility,pathCostCore,perceivedCivilCore:0,perceivedDraftedCore:0,affordances:Object.freeze([...affordances]),water:false,river:false,ice:false,extinguishesFire:false,holdsSnow:true,acceptsUnnaturalFilth:true,extraDeterioration:0,stone:false,supportsRock:true});
}
function water(pathCostCore:number,affordances:readonly TerrainAffordance256[],river=false):NaturalTerrainDefinition256 {
 return Object.freeze({fertility:0,pathCostCore,perceivedCivilCore:180,perceivedDraftedCore:18,affordances:Object.freeze([...affordances]),water:true,river,ice:false,extinguishesFire:true,holdsSnow:false,acceptsUnnaturalFilth:false,extraDeterioration:3,stone:false,supportsRock:true});
}
export const NATURAL_TERRAIN_DEFINITIONS_256:Readonly<Record<NaturalTerrainId256,NaturalTerrainDefinition256>>=Object.freeze({
 'soil-natural':land(1,2),'rich-soil':land(1.4,2),gravel:land(.7,2),
 'mossy-soil':land(1,3),'marshy-soil':land(1,14,['Walkable','Light','GrowSoil','Diggable','Bridgeable']),
 mud:land(0,14,['Walkable','Bridgeable','WaterproofConduitable']),sand:land(.1,4,['Walkable','Light','Medium','Heavy','Diggable']),
 'soft-sand':land(0,14,['Walkable','Light','Diggable']),ice:Object.freeze({...land(0,14,['Walkable','Light','Medium','Heavy','Diggable']),ice:true}),riverbank:land(1.4,4),
 marsh:water(30,SHALLOW),'water-shallow':water(30,SHALLOW),'water-deep':water(300,[]),'ocean-shallow':water(30,SHALLOW),'ocean-deep':water(300,[]),
 'river-shallow':water(30,[...SHALLOW,'MovingFluid'],true),'river-chest-deep':water(42,['Bridgeable','Walkable','MovingFluid'],true),
 // Rough natural stone is populated with its actual stone identity by the
 // local builder. Its generated terrain has path cost 2 and full supports.
 'rough-stone':Object.freeze({...land(0,2,['Walkable','Light','Medium','Heavy','SmoothableStone']),stone:true})
});
export const NATURAL_TERRAIN_DEFAULTS_256:Readonly<Record<LocalBiomeTerrainRole256,CoreLocalTerrainDef256>>=Object.freeze({
 coastalBeachTerrain:'Sand',lakeBeachTerrain:'Sand',riverbankTerrain:'Riverbank',mudTerrain:'Mud',gravelTerrain:'Gravel',waterShallowTerrain:'WaterShallow',waterDeepTerrain:'WaterDeep',oceanShallowTerrain:'WaterOceanShallow',oceanDeepTerrain:'WaterOceanDeep',waterMovingShallowTerrain:'WaterMovingShallow',waterMovingChestDeepTerrain:'WaterMovingChestDeep'
});
export function isNaturalTerrain256(value:unknown):value is NaturalTerrainId256 {return typeof value==='string'&&Object.hasOwn(NATURAL_TERRAIN_DEFINITIONS_256,value);}
export function naturalTerrainHas256(id:NaturalTerrainId256,affordance:TerrainAffordance256,bridge=false):boolean {
 const ground=NATURAL_TERRAIN_DEFINITIONS_256[id];if(bridge){if(!ground.affordances.includes('Bridgeable'))throw Error('Bridge on non-Bridgeable natural terrain');return affordance==='Walkable'||affordance==='Light';}
 return ground.affordances.includes(affordance);
}
