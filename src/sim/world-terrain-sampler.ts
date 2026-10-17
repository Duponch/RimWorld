/** Ordered world-generation stream. Construction consumes all noise seeds and
 * two controls; subsequent increasing tile IDs share the remaining stream.
 * The caller owns generation/cancellation; no campaign state is touched. */
import {createWorldPerlin,createWorldRidged,type NoiseQuality} from './world-coherent-noise.ts';
import {WorldGenerationRandom,combineWorldSeed} from './world-generation-random.ts';
import {stableWorldSeedHash,validateWorldClimateSettings,type WorldClimateSettings} from './world-climate-settings.ts';
import {evaluateWorldEnvironment,type WorldTerrainSamples} from './world-climate-evaluation.ts';
import type {SurfaceVector} from './world-surface-mesh.ts';
export function createWorldTerrainSampler(seedText:string,sourceSettings:WorldClimateSettings){
 if(typeof seedText!=='string'||!validateWorldClimateSettings(sourceSettings))throw Error('Invalid world generation settings');
 const settings={...sourceSettings},rootSeed=stableWorldSeedHash(seedText),stepSeed=combineWorldSeed(rootSeed,83469557),random=new WorldGenerationRandom(stepSeed);
 const perlin=(frequency:number,octaves:number,persistence=.5,quality:NoiseQuality='high')=>createWorldPerlin({frequency:Math.fround(frequency),lacunarity:2,persistence:Math.fround(persistence),octaves,quality,seed:random.integer(0,2147483647)});
 const ridged=(frequency:number)=>createWorldRidged({frequency:Math.fround(frequency),lacunarity:2,octaves:6,quality:'high',seed:random.integer(0,2147483647)});
 const samplers:{[K in keyof WorldTerrainSamples]:(x:number,y:number,z:number)=>number}={
  elevationMicro:perlin(.035,6,.4),elevationRidged:ridged(.012),elevationMacroFactor:perlin(.12,5),continents:perlin(.01,5),
  // Assigned below to preserve the two interleaved control draws.
  temperatureOffset:undefined!,rainfall:undefined!,mountainLines:undefined!,mountainHoles:undefined!,hillMacro:undefined!,hillMicro:undefined!,swampMicro:undefined!,swampMacro:undefined!,
 };
 const controls={continentBlend:settings.coverage<.55?random.float(-.4,-.35):random.float(.15,.25),microRidgedBlend:random.float(.4,.6)};
 samplers.temperatureOffset=perlin(.018,6);samplers.rainfall=perlin(.015,6);samplers.mountainLines=perlin(.025,6);samplers.mountainHoles=perlin(.06,6);
 samplers.hillMacro=perlin(.032,5,.5,'medium');samplers.hillMicro=perlin(.19,6);samplers.swampMicro=perlin(.09,6,.4);samplers.swampMacro=ridged(.025);
 const entries=Object.entries(samplers) as [keyof WorldTerrainSamples,(x:number,y:number,z:number)=>number][];
 const samples={} as WorldTerrainSamples;let nextId=0;
 return {
  rootSeed,stepSeed,
  get randomState(){return random.state;},
  sample(tileId:number,center:SurfaceVector){
   if(tileId!==nextId||!Number.isSafeInteger(tileId)||!center.every(Number.isFinite)||Math.hypot(...center)===0)throw Error('Non-contiguous world terrain generation');
   for(const [key,noise] of entries)samples[key]=noise(...center);
   const result=evaluateWorldEnvironment(center,settings,samples,controls,random);nextId++;return result;
  },
 };
}
