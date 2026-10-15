import type {BiomeId} from './biome-flora.ts';
/** Core 1.6.4871 competing worker scores on our FOUR delivered biomes only.
 * Original order below is an explicit subset adaptation; it does not claim
 * Core's complete Def database, desert/ice/bog coverage or world frequencies. */
export function prospectiveBiomeScores(temperature:number,rainfall:number):readonly (readonly [BiomeId,number])[]{
 return [['temperate-forest',temperature>=-10&&rainfall>=600?15+(temperature-7)+(rainfall-600)/180:0],
 ['boreal-forest',temperature>=-10&&rainfall>=600?15:0],
 ['arid-shrubland',temperature>=-10&&rainfall>=600&&rainfall<2000?22.5+2.2*(temperature-20)+(rainfall-600)/100:0],['tundra',-temperature]];
}
export function selectProspectiveBiome(temperature:number,rainfall:number):BiomeId {
 // The v2 generator restricts rainfall to600..1800. Reject an unsupported
 // climate instead of selecting a warm zero-score forest in a missing desert.
 if(!Number.isFinite(temperature)||!Number.isFinite(rainfall)||rainfall<600||rainfall>1800)throw Error('Unsupported prospective world climate');
 const entries=prospectiveBiomeScores(temperature,rainfall);let winner=entries[0]!;
 for(const entry of entries.slice(1))if(entry[1]>winner[1])winner=entry;
 return winner[0];
}
