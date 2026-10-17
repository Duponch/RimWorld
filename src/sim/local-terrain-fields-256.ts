/** Original generation-only terrain composition. All noise uses the actual
 * step stream and row-major cells. Nothing here runs in a frame or sim tick. */
import {WorldGenerationRandom} from './world-generation-random.ts';
import {createWorldPerlin} from './world-coherent-noise.ts';
import {localGenerationStepSeed} from './world-site-geography.ts';
import {firstBiomeTerrainThreshold256,type BiomeTerrainPatch256,type BiomeTerrainThreshold256,type LocalBiomeRules256,type CoreLocalTerrainDef256} from './local-biome-rules-v256.ts';
import {NATURAL_TERRAIN_BINDINGS_256,NATURAL_TERRAIN_DEFINITIONS_256,type NaturalTerrainId256} from './local-terrain-definitions-256.ts';
const f=Math.fround;
function dimensions(width:number,height:number){if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width>400||height>400)throw Error('Invalid actual terrain dimensions');}

/** A patch's minimum size concerns the cardinal component of ANY admitted
 * threshold, independently of fertility and of the chosen terrain in that
 * component. Thus adjoining sand/deep/shallow rows are one patch, not three.
 * Values are a generation-local cache; no retained World index is installed. */
export function terrainPatchComponentSizes256(values:Float32Array,thresholds:readonly BiomeTerrainThreshold256[],width:number,height:number):Int32Array {
 dimensions(width,height);if(values.length!==width*height)throw Error('Invalid terrain patch field');
 const sizes=new Int32Array(values.length),queue=new Int32Array(values.length);
 for(let root=0;root<values.length;root++){
  if(sizes[root]!==0)continue;if(firstBiomeTerrainThreshold256(thresholds,values[root]!)===undefined){sizes[root]=-1;continue;}
  let head=0,tail=1;queue[0]=root;sizes[root]=-2;
  while(head<tail){const cell=queue[head++]!,x=cell%width;
   const visit=(other:number)=>{if(sizes[other]!==0)return;if(firstBiomeTerrainThreshold256(thresholds,values[other]!)===undefined){sizes[other]=-1;return;}sizes[other]=-2;queue[tail++]=other;};
   if(cell>=width)visit(cell-width);if(x+1<width)visit(cell+1);if(cell+width<values.length)visit(cell+width);if(x>0)visit(cell-1);
  }
  for(let j=0;j<tail;j++)sizes[queue[j]!]=tail;
 }
 return sizes;
}
interface PatchField {values:Float32Array;components?:Int32Array;seed:number}
export function createBiomePatchFields256(rules:LocalBiomeRules256,random:WorldGenerationRandom,width:number,height:number){
 dimensions(width,height);const fields=new Map<number,PatchField>();
 function field(index:number,patch:BiomeTerrainPatch256):PatchField {
  const existing=fields.get(index);if(existing)return existing;
  const seed=random.integer(0,2147483647),noise=createWorldPerlin({frequency:f(patch.perlinFrequency),lacunarity:f(patch.perlinLacunarity),persistence:f(patch.perlinPersistence),octaves:patch.perlinOctaves,seed,quality:'medium'}),values=new Float32Array(width*height);
  for(let z=0;z<height;z++)for(let x=0;x<width;x++)values[z*width+x]=f(noise(x,0,z));
  const next={seed,values,...(patch.minSize>0?{components:terrainPatchComponentSizes256(values,patch.thresholds,width,height)}:{})};fields.set(index,next);return next;
 }
 return {
  terrainAt(cell:number,fertility:number,flags:{preventPatches?:boolean;preventPonds?:boolean}={}):CoreLocalTerrainDef256|undefined {
   if(!Number.isInteger(cell)||cell<0||cell>=width*height||!Number.isFinite(fertility))throw Error('Invalid actual patch cell');
   if(flags.preventPatches)return undefined;
   for(let i=0;i<rules.terrainPatchMakers.length;i++){
    const patch=rules.terrainPatchMakers[i]!;if(fertility<f(patch.minFertility)||fertility>f(patch.maxFertility)||flags.preventPonds&&patch.isPond)continue;
    const sampled=field(i,patch),terrain=firstBiomeTerrainThreshold256(patch.thresholds,sampled.values[cell]!);
    if(terrain===undefined||patch.minSize>0&&sampled.components![cell]!<patch.minSize)continue;
    return terrain;
   }return undefined;
  },
  get initialized():readonly {patchIndex:number;seed:number}[]{return [...fields].map(([patchIndex,{seed}])=>({patchIndex,seed}));}
 };
}
export interface LocalTerrainInputs256 {
 onTerrainDecided?(cell:number,terrain:NaturalTerrainId256):void;
 readonly mapSeed:number;readonly width:number;readonly height:number;readonly rules:LocalBiomeRules256;
 readonly elevation:Float32Array;readonly fertility:Float32Array;
 /** Actual rock-edifice/cave grids from earlier steps, never a height guess. */
 readonly rockEdifices:Uint8Array;readonly caves:Float32Array;
 readonly preventPatches?:boolean;readonly preventPonds?:boolean;
}
export function generateLocalTerrain256(input:LocalTerrainInputs256):{terrain:NaturalTerrainId256[];patchSeeds:readonly {patchIndex:number;seed:number}[];randomState:Readonly<{seed:number;counter:number}>} {
 const {width,height,rules,elevation,fertility,rockEdifices,caves}=input;dimensions(width,height);
 if(!Number.isInteger(input.mapSeed)||input.mapSeed< -2147483648||input.mapSeed>0xffffffff||[elevation,fertility,rockEdifices,caves].some(grid=>grid.length!==width*height))throw Error('Invalid actual terrain provenance');
 const random=new WorldGenerationRandom(localGenerationStepSeed(input.mapSeed,262606459,0)),patches=createBiomePatchFields256(rules,random,width,height),terrain:NaturalTerrainId256[]=[];
 for(let cell=0;cell<width*height;cell++){
  const elevationAt=elevation[cell]!,fertilityAt=fertility[cell]!;if(!Number.isFinite(elevationAt)||!Number.isFinite(fertilityAt)||!Number.isFinite(caves[cell]!)||caves[cell]!<0||rockEdifices[cell]!>1)throw Error('Invalid terrain generation grid');
  let chosen:NaturalTerrainId256|undefined;const patch=patches.terrainAt(cell,fertilityAt,input);if(patch!==undefined)chosen=NATURAL_TERRAIN_BINDINGS_256[patch];
  if(chosen===undefined){if(elevationAt>f(.55)&&elevationAt<f(.61)&&!rules.scalars.noGravel)chosen=NATURAL_TERRAIN_BINDINGS_256[rules.terrainOverrides.gravelTerrain??'Gravel'];else if(elevationAt>=f(.61))chosen='rough-stone';}
  if(chosen===undefined){const threshold=firstBiomeTerrainThreshold256(rules.terrainsByFertility,fertilityAt);if(threshold!==undefined)chosen=NATURAL_TERRAIN_BINDINGS_256[threshold];}
  chosen??='sand';
  if((rockEdifices[cell]===1||caves[cell]!>0)&&NATURAL_TERRAIN_DEFINITIONS_256[chosen].supportsRock)chosen='rough-stone';
  input.onTerrainDecided?.(cell,chosen);terrain.push(chosen);
 }
 return {terrain,patchSeeds:patches.initialized,randomState:random.state};
}
