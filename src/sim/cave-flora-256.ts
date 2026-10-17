import type {FloraDefinition} from './biome-flora.ts';
import type {LightSource} from './light-sources.ts';
import type {Resource,World} from './types.ts';
export const CAVE_PLANT_SPECIES_256=['glowstool','agarilux','bryolux'] as const;
export type CavePlantSpecies256=typeof CAVE_PLANT_SPECIES_256[number];
export const isCavePlant256=(species:unknown,version=256):species is CavePlantSpecies256=>version>=256&&(CAVE_PLANT_SPECIES_256 as readonly unknown[]).includes(species);
/** Original catalogue: resolved scalar facts, original labels and pigments. */
export const CAVE_FLORA_DEFINITIONS_256:Readonly<Record<CavePlantSpecies256,FloraDefinition>>={
 glowstool:{label:'Champignon luisant',kind:'wild-plant',growDays:40,minFertility:.01,sensitivity:.15,harvestMinGrowth:.65,yield:20,product:'raw-fungus',persistent:false,nutrition:.5,hitPoints:100,flammability:1,maxGrowthTemperature:58,coldLeafless:true,lifespanMultiplier:8},
 agarilux:{label:'Agarilux',kind:'wild-plant',growDays:60,minFertility:.01,sensitivity:.15,harvestMinGrowth:.65,yield:35,product:'raw-fungus',persistent:false,nutrition:.75,hitPoints:150,flammability:1,maxGrowthTemperature:58,coldLeafless:true,lifespanMultiplier:8},
 bryolux:{label:'Bryolux',kind:'wild-plant',growDays:60,minFertility:.01,sensitivity:.15,harvestMinGrowth:.65,yield:0,product:null,persistent:false,nutrition:.3,hitPoints:100,flammability:1,maxGrowthTemperature:58,coldLeafless:true,lifespanMultiplier:8},
};
export const CAVE_PLANT_FACTS_256={glowstool:{pathCost:14,beauty:2,dieIfLeafless:true,radius:5.9,red:10,green:50,blue:64},agarilux:{pathCost:30,beauty:4,dieIfLeafless:false,radius:10,red:23,green:15,blue:30},bryolux:{pathCost:30,beauty:1,dieIfLeafless:true,radius:10,red:5,green:5,blue:25}} as const;
/** Only sunlight/artificial light excluding ALL cave glowers is supplied.
 * Ordinary darkness never harms these plants. Same2000Core individual phase. */
export function caveLightDamage256(glowWithoutCaves:number,elapsedCore=2000):number {
 if(!Number.isFinite(glowWithoutCaves)||glowWithoutCaves<0||glowWithoutCaves>1||!Number.isSafeInteger(elapsedCore)||elapsedCore<0)throw Error('Invalid real cave exposure');
 const low=Math.fround(.0001),high=Math.fround(.001),rate=Math.fround(low+Math.fround(Math.fround(high-low)*glowWithoutCaves));
 return glowWithoutCaves>0?Math.ceil(Math.fround(rate*elapsedCore)):0;
}
const lightBindings=new WeakMap<Resource[],{width:number;sources:readonly LightSource[]}>();
/** Producers replace Resource[] after add/remove/replant. Read only after
 * adoption/step; there is no frame scan or per-plant light object. */
export function caveLightSources256(world:Pick<World,'schemaVersion'|'resources'|'width'>):readonly LightSource[] {
 if(world.schemaVersion<256)return [];
 let binding=lightBindings.get(world.resources);if(binding&&binding.width===world.width)return binding.sources;
 const sources:LightSource[]=[];for(const r of world.resources)if(isCavePlant256(r.species,world.schemaVersion)){
  const d=CAVE_PLANT_FACTS_256[r.species];sources.push({cell:r.z*world.width+r.x,radius:d.radius,red:d.red,green:d.green,blue:d.blue});
 }sources.sort((a,b)=>a.cell-b.cell);binding={width:world.width,sources};lightBindings.set(world.resources,binding);return sources;
}
