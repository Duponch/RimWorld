import {validMapDimension,validMapDimensionForSchema} from './map-config.ts';
/** Exact ordinary Core choices. TestMapSizes is not a product preference:
 *350/400 stay absent. Legacy save bounds are deliberately unchanged. */
export const GEOGRAPHIC_CREATION_SIZES_262=[200,225,250,275,300,325] as const;
export type GeographicCreationSize262=typeof GEOGRAPHIC_CREATION_SIZES_262[number];
/** Core advanced menu choices, distinct from permanent biome season labels. */
export const GEOGRAPHIC_CREATION_SEASONS_262=['auto','spring','summer','fall','winter'] as const;
export type GeographicCreationSeason262=typeof GEOGRAPHIC_CREATION_SEASONS_262[number];
/** Non-starting settlement: actual campaign dimensions are a construction
 * authority, never a fallback or a new persisted field. Historical owners
 * retain their exact250 branch;262 requires the captured square choice. */
export function validGeographicSettlementDimensions262(version:number,width:unknown,height:unknown,expected?:Readonly<{width:number;height:number}>):boolean {
 if((Number(version)===262||Number(version)===263))return !!expected&&validGeographicCreationSize262(expected.width)&&expected.height===expected.width&&width===expected.width&&height===expected.height;
 return (version===259||version===260||version===261)&&width===250&&height===250;
}
export interface GeographicCreationOptions262 {size:GeographicCreationSize262;season:GeographicCreationSeason262}
export const validGeographicCreationSize262=(v:unknown):v is GeographicCreationSize262=>typeof v==='number'&&(GEOGRAPHIC_CREATION_SIZES_262 as readonly number[]).includes(v);
export const geographicCreationSizeWarns262=(v:unknown):boolean=>validGeographicCreationSize262(v)&&v>280;
/** Only the new262 boundary consumes the existing prospective400 dimension
 * domain. Every older schema retains the literal250 guard before migration. */
export const validGeographicMapDimension262=(v:unknown,version:number):v is number=>(Number(version)===262||Number(version)===263)?validMapDimensionForSchema(v,version):validMapDimension(v);
export const validGeographicCreationSeason262=(v:unknown):v is GeographicCreationSeason262=>typeof v==='string'&&(GEOGRAPHIC_CREATION_SEASONS_262 as readonly string[]).includes(v);
