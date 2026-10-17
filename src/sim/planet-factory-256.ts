import type {GeographicPlanetState} from './planet-state.ts';
import {isCampaignGeography256,type CampaignGeography256} from './world-geography-owner-256.ts';
import type {WorldFactionRegistry256} from './world-faction-state.ts';
import {planetFactionTargets256} from './planet-faction-targets-256.ts';
import {canPlaceWorldSettlement} from './world-settlement-placement.ts';
/** New-world construction only. No legacy planet upgrade, selector reroll,
 * invented post, tile drying or generation stage belongs to this factory. */
export function createGeographicPlanet256(input:{geography:CampaignGeography256;factions:WorldFactionRegistry256;homeTile:number;adoptedAt:number;nextGroupId:number}):GeographicPlanetState {
 const {geography,factions,homeTile,adoptedAt,nextGroupId}=input;
 if(!isCampaignGeography256(geography)||!Number.isSafeInteger(adoptedAt)||adoptedAt<0||!Number.isSafeInteger(nextGroupId)||nextGroupId<1||!Number.isSafeInteger(homeTile)||homeTile<0||!Number.isSafeInteger(factions.generatedAt)||factions.generatedAt<0||factions.generatedAt>adoptedAt)throw Error('Invalid new geographic planet input');
 const targets=planetFactionTargets256(factions,geography.surface.tiles);if(!targets||targets.initialForeignDefs.length!==geography.definition.factions.length||targets.initialForeignDefs.some((def,i)=>def!==geography.definition.factions[i]))throw Error('Generated factions disagree with the geographic draft');
 if(!canPlaceWorldSettlement(geography.surface.tiles,homeTile,{settlementTiles:targets.occupied}))throw Error('Selected starting tile does not admit a real settlement');
 return {revision:3,adoptedAt,generationSeed:geography.surface.generationSeed,geography:geography.definition,homeTile,civilianTile:targets.civilianTiles[0]??null,nextGroupId};
}
