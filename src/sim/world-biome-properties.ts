/** Resolved scalar facts from installed Core4871 BiomeDefs. This is not the
 * flora/fauna catalogue or proof that every local biome has been delivered. */
import type {WorldBiome,WorldLandBiome} from './world-biome-selection.ts';
const SETTLEMENT_WEIGHTS:Readonly<Record<WorldLandBiome,number>>={
 'boreal-forest':.9,tundra:.32,'cold-bog':.17,'ice-sheet':.15,'sea-ice':.01,
 'temperate-forest':1,'temperate-swamp':.6,'tropical-rainforest':.7,'tropical-swamp':.4,'arid-shrubland':.95,desert:.65,'extreme-desert':.42,
};
const MOVEMENT:Readonly<Record<WorldLandBiome,number>>={
 'boreal-forest':1,tundra:1,'cold-bog':4,'ice-sheet':1.5,'sea-ice':1.5,
 'temperate-forest':1,'temperate-swamp':4,'tropical-rainforest':2,'tropical-swamp':4,'arid-shrubland':1,desert:1,'extreme-desert':1,
};
export function worldBiomeCanSettle(biome:WorldBiome):biome is WorldLandBiome{return biome!=='ocean'&&biome!=='lake';}
export function worldBiomeSettlementWeight(biome:WorldBiome):number{return worldBiomeCanSettle(biome)?Math.fround(SETTLEMENT_WEIGHTS[biome]):0;}
export function worldBiomeMovement(biome:WorldBiome):number{return worldBiomeCanSettle(biome)?MOVEMENT[biome]:1000;}
export function worldBiomeAllowsRivers(biome:WorldBiome):boolean{return !['ocean','lake','ice-sheet','sea-ice'].includes(biome);}
export const worldBiomeAllowsRoads=worldBiomeAllowsRivers;
