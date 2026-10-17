/** Captured successful Core-only ConstructComponents frontier. A label is
 * not a certificate: require the actual RNG and the closed GasGrid result.
 * Validation consumes no caller stream and never mutates the input. */
import {WorldGenerationRandom,worldCounterHash} from './world-generation-random.ts';
import type {LocalCompositionInputs256} from './local-composition-256.ts';
export type CapturedGeographicMapInit256=LocalCompositionInputs256['init']&{readonly gasDiffusionCycleIndex:number};
export function validateCapturedGeographicMapInit256(init:CapturedGeographicMapInit256,mapSeed:number,width:number,height:number):void {
 if(!Number.isInteger(mapSeed)||mapSeed< -2147483648||mapSeed>0xffffffff||!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width>400||height>400)throw Error('Invalid actual map Init dimensions/seed');
 const p=init?.provenance,seed=mapSeed>>>0,cycleCount=Math.floor(width*height/2),first=Math.abs(worldCounterHash(seed,0)%cycleCount);
 if(!(init?.random instanceof WorldGenerationRandom)||!p||p.revision!==1||p.mapSeed!==mapSeed||p.seed!==seed||p.counter!==1||typeof p.source!=='string'||!p.source.trim()||init.random.state.seed!==seed||init.random.state.counter!==1||init.gasDiffusionCycleIndex!==first)throw Error('Captured map Init is not the closed Core-only pre-mutator frontier');
}
