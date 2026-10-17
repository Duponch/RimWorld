/** Original post-terrain cave decisions. The caller supplies the same actual
 * post-terrain stream that subsequently reaches river/coast mutators. These
 * two seeds are consumed even when no eligible cave cell changes terrain. */
import {WorldGenerationRandom} from './world-generation-random.ts';
import {createWorldPerlin} from './world-coherent-noise.ts';
import {NATURAL_TERRAIN_DEFINITIONS_256,type NaturalTerrainId256} from './local-terrain-definitions-256.ts';
const f=Math.fround;
export interface LocalCaveTerrainPlan256 {readonly revision:1;readonly waterSeed:number;readonly gravelSeed:number}
export function localCaveTerrainPlan256(postTerrainRandom:WorldGenerationRandom):LocalCaveTerrainPlan256 {return {revision:1,waterSeed:postTerrainRandom.integerValue(),gravelSeed:postTerrainRandom.integerValue()};}
export interface LocalCaveTerrainInputs256 {
 onTerrainDecided?(cell:number,terrain:NaturalTerrainId256):void;
 readonly width:number;readonly height:number;readonly elevation:Float32Array;readonly caves:Float32Array;
 readonly terrain:readonly NaturalTerrainId256[];readonly plan:LocalCaveTerrainPlan256;
 /** Resolved actual biome-at-cell WaterShallow override or Core WaterShallow.
  * Required explicitly; the cave algorithm never substitutes a biome/terrain. */
 shallowFreshWaterAt(cell:number):NaturalTerrainId256;
}
export function applyLocalCaveTerrain256(input:LocalCaveTerrainInputs256):NaturalTerrainId256[] {
 const {width,height,elevation,caves,terrain,plan}=input,n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width>400||height>400||!(elevation instanceof Float32Array)||!(caves instanceof Float32Array)||elevation.length!==n||caves.length!==n||terrain.length!==n||elevation.some(v=>!Number.isFinite(v))||caves.some(v=>!Number.isFinite(v)||v<0)||terrain.some(id=>!Object.hasOwn(NATURAL_TERRAIN_DEFINITIONS_256,id))||!plan||plan.revision!==1||[plan.waterSeed,plan.gravelSeed].some(v=>!Number.isInteger(v)||v< -2147483648||v>2147483647)||typeof input.shallowFreshWaterAt!=='function')throw Error('Invalid actual cave terrain provenance');
 const noise=(frequency:number,seed:number)=>createWorldPerlin({frequency:f(frequency),lacunarity:2,persistence:.5,octaves:6,seed,quality:'medium'}),water=noise(.08,plan.waterSeed),gravel=noise(.16,plan.gravelSeed),result=[...terrain];
 for(let cell=0;cell<n;cell++){if(caves[cell]!<=0||elevation[cell]!<=0||NATURAL_TERRAIN_DEFINITIONS_256[terrain[cell]!].river)continue;const x=cell%width,z=Math.floor(cell/width),wet=f(water(x,0,z)),stone=f(gravel(x,0,z));
  if(wet>f(.93)){const actual=input.shallowFreshWaterAt(cell);if(!Object.hasOwn(NATURAL_TERRAIN_DEFINITIONS_256,actual))throw Error('Unresolved actual shallow fresh water terrain');result[cell]=actual;input.onTerrainDecided?.(cell,actual);}
  else if(stone>f(.55)){result[cell]='gravel';input.onTerrainDecided?.(cell,'gravel');}
 }return result;
}
