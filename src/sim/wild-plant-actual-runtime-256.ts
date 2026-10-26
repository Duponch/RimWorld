import {isSchema256Or257} from './schema-compatibility-257.ts';
import type {World} from './types.ts';
import {createActualWildPlantMapReader256} from './wild-plant-runtime-map-256.ts';
import {advanceWildFlora256,createWildFloraState256} from './wild-plant-runtime-256.ts';
import {toxicFalloutActive294} from './toxic-fallout-state-294.ts';

/** Actual mutators retain factor1. The local active fallout suppresses only
 * spontaneous renewal; its separate cell owner handles existing plants. */
export function actualPlantDensity256(world:World):number {
 const site=world.site;
 if(!isSchema256Or257(world.schemaVersion)||site?.revision!==3||!Number.isInteger(site.mutatorCode)||site.mutatorCode<0||site.mutatorCode>15)throw Error('Missing actual plant-density definitions');
 return toxicFalloutActive294(world)?0:1;
}
export const actualWildPlantReader256=createActualWildPlantMapReader256(actualPlantDensity256);
export function initializeActualWildFlora256(world:World):void {
 if(world.flora!==undefined)throw Error('Initial wild flora already owned');
 world.flora=createWildFloraState256(world,actualWildPlantReader256);
}
export const advanceActualWildFlora256=(world:World):void=>advanceWildFlora256(world,actualWildPlantReader256);
