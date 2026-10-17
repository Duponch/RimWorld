/** Resolved Core1.6.4871 behavioural facts, independently implemented.
 * All terrestrial natural workers participate; Lake is a connected-component
 * postpass and Underground is not a natural surface candidate. */
export const WORLD_LAND_BIOMES=['boreal-forest','tundra','cold-bog','ice-sheet','sea-ice','temperate-forest','temperate-swamp','tropical-rainforest','tropical-swamp','arid-shrubland','desert','extreme-desert'] as const;
export type WorldLandBiome=typeof WORLD_LAND_BIOMES[number];
export type WorldBiome=WorldLandBiome|'ocean'|'lake';
export interface BiomeEnvironment {temperature:number;rainfall:number;swampiness:number;elevation:number;seaIceEligible:boolean}
/** Ordering reconstructed from the verified Core-only installation's actual
 * XML enumeration. It is fixed for this version, not assumed portable FS sort.
 * Runtime DefDatabase tie parity remains a separately recorded uncertainty. */
export const CORE_SURFACE_BIOME_ORDER:readonly Exclude<WorldBiome,'lake'>[]=[...WORLD_LAND_BIOMES,'ocean'];
const f=Math.fround;
/** Generation swampiness is not clamped; the old intuitive 0..1 bound was false. */
function check(e:BiomeEnvironment):void{
 if(!Number.isFinite(e.temperature)||!Number.isFinite(e.rainfall)||!Number.isFinite(e.swampiness)||!Number.isFinite(e.elevation)||e.rainfall<0||typeof e.seaIceEligible!=='boolean')throw Error('Invalid biome environment');
}
const iceScore=(t:number)=>f(-20-f(2*t));
const temperateScore=(t:number,r:number)=>f(f(15+f(t-7))+f(f(r-600)/180));
const tropicalScore=(t:number,r:number)=>f(f(28+f(f(t-20)*1.5))+f(f(r-600)/165));
function scoreUnchecked(biome:Exclude<WorldBiome,'lake'>,environment:BiomeEnvironment):number {
 const t=f(environment.temperature),r=f(environment.rainfall),s=f(environment.swampiness),water=environment.elevation<=0;
 if(biome==='ocean')return water?0:-100;
 if(biome==='sea-ice')return water&&environment.seaIceEligible?f(iceScore(t)-23):-100;
 if(water)return -100;
 switch(biome){
  case 'boreal-forest':return t>=-10&&r>=600?15:0;
  case 'temperate-forest':return t>=-10&&r>=600?temperateScore(t,r):0;
  case 'tropical-rainforest':return t>=15&&r>=2000?tropicalScore(t,r):0;
  case 'temperate-swamp':return t>=-10&&r>=600&&s>=.5?f(temperateScore(t,r)+f(s*3)):0;
  case 'tropical-swamp':return t>=15&&t<=55&&r>=2000&&s>=.5?f(tropicalScore(t,r)+f(s*3)):0;
  case 'cold-bog':return t>=-10&&s>=.5?f(f(-t+13)+f(s*8)):0;
  case 'tundra':return -t;
  case 'ice-sheet':return iceScore(t);
  case 'arid-shrubland':return t>=-10&&r>=600&&r<2000?f(f(22.5+f(f(t-20)*f(2.2)))+f(f(r-600)/100)):0;
  case 'desert':return r<600?f(t+f(.0001)):0;
  case 'extreme-desert':return r<340?f(f(f(t*f(2.7))-13)-f(r*f(.14))):0;
 }
}
export function worldBiomeScore(biome:Exclude<WorldBiome,'lake'>,environment:BiomeEnvironment):number {
 check(environment);return scoreUnchecked(biome,environment);
}
export function selectWorldBiome(environment:BiomeEnvironment):Exclude<WorldBiome,'lake'> {
 check(environment);let chosen=CORE_SURFACE_BIOME_ORDER[0]!,score=scoreUnchecked(chosen,environment);
 for(let i=1;i<CORE_SURFACE_BIOME_ORDER.length;i++){const biome=CORE_SURFACE_BIOME_ORDER[i]!,candidate=scoreUnchecked(biome,environment);if(candidate>score){chosen=biome;score=candidate;}}
 return chosen;
}
/** A lake is a small connected Ocean component, not a random independent tile
 * label. Read original Ocean membership throughout the pass; no mutation/RNG. */
export function resolveLakeComponents(tiles:readonly {biome:WorldBiome;neighbours:readonly number[]}[]):WorldBiome[] {
 const result=tiles.map(t=>t.biome),seen=new Uint8Array(tiles.length);
 for(let root=0;root<tiles.length;root++){
  if(seen[root]||tiles[root]!.biome!=='ocean')continue;
  const component=[root];seen[root]=1;
  for(let i=0;i<component.length;i++)for(const neighbour of tiles[component[i]!]!.neighbours){
   if(!Number.isInteger(neighbour)||neighbour<0||neighbour>=tiles.length)throw Error('Invalid ocean adjacency');
   if(!seen[neighbour]&&tiles[neighbour]!.biome==='ocean'){seen[neighbour]=1;component.push(neighbour);}
  }
  if(component.length<=15)for(const id of component)result[id]='lake';
 }
 return result;
}
