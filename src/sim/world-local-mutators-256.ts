/** Actual Core-only local modifiers assigned prospectively at world step700.
 * Codes are saved, not rerolled on map entry. DLC lakeshore/delta/headwater/
 * islands/mixed biomes and landmark modifiers are not silently activated. */
import {WorldGenerationRandom,combineWorldSeed} from './world-generation-random.ts';
import {worldBiomeCanSettle} from './world-biome-properties.ts';
import {visibleWorldRivers} from './world-roads.ts';
import type {WorldSurfaceTile} from './world-surface-geography.ts';
export type CoreLocalMutator256='mountain'|'caves'|'river'|'coast';
export const CORE_LOCAL_MUTATOR_BITS_256={mountain:1,caves:2,river:4,coast:8} as const;
const ORDERED=['mountain','caves','river','coast'] as const;
export function orderedCoreLocalMutators256(code:number):readonly CoreLocalMutator256[]{if(!Number.isInteger(code)||code<0||code>15)throw Error('Invalid saved Core terrain modifiers');return ORDERED.filter(id=>(code&CORE_LOCAL_MUTATOR_BITS_256[id])!==0);}
function fixedMutators(tile:WorldSurfaceTile,tiles:readonly WorldSurfaceTile[]):number {
 let code=tile.hilliness==='mountainous'||tile.hilliness==='impassable'?1:0;
 if(worldBiomeCanSettle(tile.biome)&&tile.neighbours.some(id=>tiles[id]?.biome==='ocean'))code|=8;
 if(visibleWorldRivers(tile).length)code|=4;
 return code;
}
export function generateCoreWorldMutators256(tiles:readonly WorldSurfaceTile[],worldSeed:number):{revision:1;codes:number[];randomState:Readonly<{seed:number;counter:number}>} {
 if(!Number.isInteger(worldSeed)||worldSeed< -2147483648||worldSeed>0xffffffff||tiles.length<12||tiles.length>590492||tiles.some((tile,id)=>tile.id!==id))throw Error('Invalid modifier surface provenance');
 const random=new WorldGenerationRandom(combineWorldSeed(worldSeed,897213645)),codes:number[]=[];
 for(const tile of tiles){let code=fixedMutators(tile,tiles);if(tile.hilliness==='mountainous'?random.value()<.5:tile.hilliness==='large-hills'&&random.value()<.25)code|=2;codes.push(code);}
 return {revision:1,codes,randomState:random.state};
}
/** A save/load never consumes the assignment RNG. Validate required fixed
 * modifiers and whether a recorded cave was eligible, without inventing one. */
export function validCoreWorldMutators256(value:unknown,tiles:readonly WorldSurfaceTile[]):value is readonly number[] {
 if(!Array.isArray(value)||value.length!==tiles.length||Reflect.ownKeys(value).length!==value.length+1)return false;
 for(let id=0;id<tiles.length;id++){const d=Object.getOwnPropertyDescriptor(value,String(id));if(!d||!Object.hasOwn(d,'value'))return false;const code=d.value,tile=tiles[id]!;
  if(!Number.isInteger(code)||code<0||code>15||(code&13)!==fixedMutators(tile,tiles)||(code&2)!==0&&!['mountainous','large-hills'].includes(tile.hilliness))return false;
 }return true;
}
