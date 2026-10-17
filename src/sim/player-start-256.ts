import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Original bounded Core-only FindPlayerStartSpot, actual-map readers only. */
import {captureActualLocalDistricts256,type ActualStartMap256} from './actual-local-districts-256.ts';
import {assertLocalDimensions256,findLocalCentralCell256} from './local-cell-selection-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
export const PLAYER_START_SEED_PART_256=1187186631;
export interface ActualStartRect256 {readonly minX:number;readonly minZ:number;readonly width:number;readonly height:number}
export interface PlayerStartResult256 {readonly cell:number|null;readonly random:Readonly<{seed:number;counter:number}>;readonly reused:boolean}
/** ROOT owns the GenStep stream/SeedPart. Supply that SAME stream; this function
 * does not seed another PRNG, place people, change terrain or commit a World.
 * Rectangles are actual Layout containers / MapGenerator UsedRects. */
export function findPlayerStartSpot256(input:{map:ActualStartMap256;layoutRects:readonly ActualStartRect256[];usedRects:readonly ActualStartRect256[];existingStart?:number|null},random:WorldGenerationRandom):PlayerStartResult256 {
 const {map}=input;assertLocalDimensions256(map.width,map.height);if(map.tiles.length!==map.width*map.height)throw Error('Invalid actual start-map cell count');
 if(!isSchema256Or257(map.schemaVersion)||map.site?.revision!==3)throw Error('Player start requires an actual prospective Site3 map');
 const existing=input.existingStart;
 if(existing!==undefined&&existing!==null){
  if(!Number.isInteger(existing)||existing<0||existing>=map.width*map.height)throw Error('Invalid actual existing start');
  return {cell:existing,random:random.state,reused:true};
 }
 const readers=captureActualLocalDistricts256(map),rects=[...input.layoutRects,...input.usedRects];
 for(const rect of rects)if(![rect.minX,rect.minZ,rect.width,rect.height].every(Number.isSafeInteger)||!Number.isSafeInteger(rect.minX+rect.width)||!Number.isSafeInteger(rect.minZ+rect.height)||rect.width<0||rect.height<0)throw Error('Invalid actual Layout/Used rectangle');
 const extra=(cell:number)=>{
  if(!readers.capturedAnchorOpenAreaIncludes(cell))return false;
  const x=cell%map.width,z=Math.floor(cell/map.width);
  for(const rect of rects)if(x>=rect.minX&&x<rect.minX+rect.width&&z>=rect.minZ&&z<rect.minZ+rect.height)return false;
  return readers.heavy(cell)&&!readers.roofed(cell);
 };
 // Current GenStep is tightness7/minDistrict10, not tightness7 then10.
 // Its final exhausted-band fallback intentionally ignores extra/district.
 const cell=findLocalCentralCell256({width:map.width,height:map.height,tightness:7,minimumDistrictCells:10,readers:{standable:readers.standable,district:readers.district,extra}},random);
 return {cell,random:random.state,reused:false};
}
