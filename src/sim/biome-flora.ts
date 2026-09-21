import type { ItemId } from './items.ts';
import type { Resource } from './types.ts';

export const BIOMES = ['temperate-forest','boreal-forest','arid-shrubland'] as const;
export type BiomeId = typeof BIOMES[number];

export const PLANT_SPECIES = [
  'grass','tall-grass','brambles','berry-bush','oak','poplar',
  'moss','pine','birch','agave','saguaro','drago',
] as const;
export type PlantSpecies = typeof PLANT_SPECIES[number];

export interface FloraDefinition {
  label:string;
  kind:'tree'|'berries'|'wild-plant';
  growDays:number;
  minFertility:number;
  sensitivity:number;
  harvestMinGrowth:number;
  yield:number;
  product:ItemId|null;
  persistent:boolean;
  nutrition:number;
  hitPoints:number;
  flammability:number;
  maxGrowthTemperature:58|75;
  coldLeafless:boolean;
  lifespanMultiplier:8|9|40;
}

/** Values are the resolved Core 1.6.4871 definitions. Lisiere keeps one
 * common growth curve and its 0/6/42/max interpolation; species still retain
 * their fertility, duration, physical yield, nutrition, HP and fire profile. */
export const FLORA_DEFINITIONS:Readonly<Record<PlantSpecies,FloraDefinition>>=Object.freeze({
  grass:{label:'Herbe',kind:'wild-plant',growDays:2.5,minFertility:.05,sensitivity:.3,harvestMinGrowth:1,yield:0,product:null,persistent:false,nutrition:.5,hitPoints:85,flammability:1.3,maxGrowthTemperature:75,coldLeafless:true,lifespanMultiplier:8},
  'tall-grass':{label:'Herbe haute',kind:'wild-plant',growDays:3,minFertility:.7,sensitivity:.7,harvestMinGrowth:1,yield:0,product:null,persistent:false,nutrition:.5,hitPoints:90,flammability:1.3,maxGrowthTemperature:75,coldLeafless:false,lifespanMultiplier:8},
  brambles:{label:'Ronces',kind:'wild-plant',growDays:3,minFertility:.7,sensitivity:.7,harvestMinGrowth:1,yield:0,product:null,persistent:false,nutrition:.5,hitPoints:100,flammability:1,maxGrowthTemperature:58,coldLeafless:true,lifespanMultiplier:8},
  'berry-bush':{label:'Buisson de baies',kind:'berries',growDays:6,minFertility:.5,sensitivity:.5,harvestMinGrowth:.65,yield:10,product:'berries',persistent:true,nutrition:.5,hitPoints:120,flammability:1,maxGrowthTemperature:58,coldLeafless:true,lifespanMultiplier:8},
  oak:{label:'Chene',kind:'tree',growDays:30,minFertility:.7,sensitivity:.5,harvestMinGrowth:.4,yield:46,product:'wood',persistent:false,nutrition:2,hitPoints:200,flammability:.8,maxGrowthTemperature:58,coldLeafless:true,lifespanMultiplier:9},
  poplar:{label:'Peuplier',kind:'tree',growDays:15.05,minFertility:.7,sensitivity:.5,harvestMinGrowth:.4,yield:27,product:'wood',persistent:false,nutrition:1.5,hitPoints:200,flammability:.8,maxGrowthTemperature:58,coldLeafless:true,lifespanMultiplier:9},
  moss:{label:'Mousse',kind:'wild-plant',growDays:4,minFertility:.05,sensitivity:0,harvestMinGrowth:1,yield:0,product:null,persistent:false,nutrition:.5,hitPoints:120,flammability:.6,maxGrowthTemperature:58,coldLeafless:true,lifespanMultiplier:8},
  pine:{label:'Pin',kind:'tree',growDays:20,minFertility:.7,sensitivity:.5,harvestMinGrowth:.4,yield:27,product:'wood',persistent:false,nutrition:2,hitPoints:200,flammability:.8,maxGrowthTemperature:58,coldLeafless:false,lifespanMultiplier:9},
  birch:{label:'Bouleau',kind:'tree',growDays:20,minFertility:.7,sensitivity:.5,harvestMinGrowth:.4,yield:27,product:'wood',persistent:false,nutrition:2,hitPoints:200,flammability:.8,maxGrowthTemperature:58,coldLeafless:true,lifespanMultiplier:9},
  agave:{label:'Agave',kind:'wild-plant',growDays:6,minFertility:.7,sensitivity:.5,harvestMinGrowth:.65,yield:10,product:'agave-fruit',persistent:false,nutrition:.2,hitPoints:120,flammability:1,maxGrowthTemperature:75,coldLeafless:false,lifespanMultiplier:8},
  saguaro:{label:'Saguaro',kind:'tree',growDays:5,minFertility:.05,sensitivity:0,harvestMinGrowth:.2,yield:15,product:'wood',persistent:false,nutrition:2,hitPoints:130,flammability:.8,maxGrowthTemperature:75,coldLeafless:true,lifespanMultiplier:40},
  drago:{label:'Drago',kind:'tree',growDays:15,minFertility:.7,sensitivity:.5,harvestMinGrowth:.4,yield:25,product:'wood',persistent:false,nutrition:2,hitPoints:200,flammability:.8,maxGrowthTemperature:75,coldLeafless:false,lifespanMultiplier:9},
});

export interface BiomeFloraProfile {
  plantDensity:number;
  regrowDays:number;
  totalCoreWeight:number;
  weights:Readonly<Partial<Record<PlantSpecies,number>>>;
}

/** Omitted Core species keep their share: implementedWeight / totalCoreWeight
 * reduces the physical population before selection among delivered species. */
export const BIOME_FLORA:Readonly<Record<BiomeId,BiomeFloraProfile>>=Object.freeze({
  'temperate-forest':{plantDensity:.65,regrowDays:20,totalCoreWeight:15.9,weights:{grass:5,'tall-grass':2,brambles:1,oak:.5,poplar:.5,'berry-bush':.05}},
  'boreal-forest':{plantDensity:.40,regrowDays:25,totalCoreWeight:44.22,weights:{grass:9,moss:4,brambles:2,pine:5,birch:1.5,poplar:1.2,'berry-bush':.16}},
  'arid-shrubland':{plantDensity:.24,regrowDays:27,totalCoreWeight:16.46,weights:{grass:7,agave:.2,saguaro:.26,drago:.2,'berry-bush':.1}},
});

export const isBiomeId=(value:unknown):value is BiomeId=>(BIOMES as readonly unknown[]).includes(value);
export const isPlantSpecies=(value:unknown):value is PlantSpecies=>(PLANT_SPECIES as readonly unknown[]).includes(value);
export const floraDefinition=(resource:Pick<Resource,'species'>):FloraDefinition|undefined=>resource.species?FLORA_DEFINITIONS[resource.species]:undefined;

const LEGACY_NUTRITION:Readonly<Record<string,number>>={berries:.35,rice:.18,potato:.25,corn:.4,cotton:.2};
export function plantNutrition(resource:Pick<Resource,'kind'|'species'>,growth:number):number {
  const perPlant=resource.species?FLORA_DEFINITIONS[resource.species].nutrition:LEGACY_NUTRITION[resource.kind]??0;
  return perPlant*Math.max(0,Math.min(1,growth));
}
export function grazingResult(resource:Pick<Resource,'kind'|'species'>,growth:number,requested:number):{nutrition:number;growthConsumed:number;removes:boolean} {
  const current=Math.max(0,Math.min(1,growth)),available=plantNutrition(resource,current),nutrition=Math.min(Math.max(0,requested),available);
  if(available<=0)return {nutrition:0,growthConsumed:0,removes:false};
  const growthConsumed=current*nutrition/available;
  return {nutrition,growthConsumed,removes:nutrition>=available-1e-12};
}

export function weightedSpecies(biome:BiomeId,roll:number):PlantSpecies {
  const weights=BIOME_FLORA[biome].weights,entries=Object.entries(weights) as [PlantSpecies,number][];
  const total=entries.reduce((sum,[,weight])=>sum+weight,0);let cursor=Math.max(0,Math.min(1-Number.EPSILON,roll))*total;
  for(const [species,weight] of entries){cursor-=weight;if(cursor<0)return species;}
  return entries.at(-1)![0];
}
