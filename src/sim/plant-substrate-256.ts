import {WILD_PLANT_GENERATION_FACTS_256 as FACTS} from './wild-plant-generation-data-256.ts';
export interface PlantSubstrate256 {readonly fertility:number;readonly terrainDefId:string;readonly tags:readonly string[]}
// Immutable definition lookups only: no World, resource, terrain, clock or
// validation result is retained. Keep the original find-first/some-any
// semantics even if a future definition intentionally shares a species.
type PlantDefinition256=(typeof FACTS)[keyof typeof FACTS];
const firstDefinition:ReadonlyMap<unknown,PlantDefinition256>=(()=>{const rows=new Map<unknown,PlantDefinition256>();for(const d of Object.values(FACTS))if(!rows.has(d.species))rows.set(d.species,d);return rows;})();
const fertilityIndependent:ReadonlySet<unknown>=new Set(Object.values(FACTS).filter(d=>d.completelyIgnoreFertility).map(d=>d.species));
export function plantCompletelyIgnoresFertility256(species:unknown,version:number):boolean {
 return version>=256&&fertilityIndependent.has(species);
}
/** Undefined delegates an unhandled historical/crop contract to its existing
 * owner. A true result never creates a sowing permission, roof permission or
 * plant; it resolves only actual fertility/tags/blacklist for that species. */
export function plantSubstrateAllowed256(species:unknown,version:number,terrain:PlantSubstrate256):boolean|undefined {
 if(version<256)return;const def=firstDefinition.get(species);if(!def)return;
 if(!Number.isFinite(terrain.fertility)||terrain.fertility<0||typeof terrain.terrainDefId!=='string'||!Array.isArray(terrain.tags)||terrain.tags.some(t=>typeof t!=='string'))return false;
 return (def.completelyIgnoreFertility||terrain.fertility>=def.fertilityMin)&&(!def.wildTerrainTags.length||def.wildTerrainTags.some(t=>terrain.tags.includes(t)))&&!(def.terrainBlacklist as readonly string[]).includes(terrain.terrainDefId);
}
