import type {World} from './types.ts';
import {actualPlantPhysicalMasks256} from './actual-plant-physical-masks-256.ts';
import {createWildPlantMapReader256} from './wild-plant-runtime-map-256.ts';
import {advanceWildFlora256,createWildFloraState256} from './wild-plant-runtime-256.ts';

/** Core4871: the four current surface mutators have no plant-density
 * override, and every currently represented active condition multiplies it
 * by1. This is the resolved bounded definition set, not a missing-data
 * fallback. A future condition such as ToxicFallout must extend this rule
 * when its real persistent definition and effects are introduced. */
export function actualPlantDensity256(world:World):number {
 const site=world.site;
 if(world.schemaVersion!==256||site?.revision!==3||!Number.isInteger(site.mutatorCode)||site.mutatorCode<0||site.mutatorCode>15)throw Error('Missing actual plant-density definitions');
 return 1;
}
export const actualWildPlantReader256=createWildPlantMapReader256(actualPlantPhysicalMasks256,actualPlantDensity256);
export function initializeActualWildFlora256(world:World):void {
 if(world.flora!==undefined)throw Error('Initial wild flora already owned');
 world.flora=createWildFloraState256(world,actualWildPlantReader256);
}
export const advanceActualWildFlora256=(world:World):void=>advanceWildFlora256(world,actualWildPlantReader256);
