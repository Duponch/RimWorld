import {isSchema256Or257} from './schema-compatibility-257.ts';
import type {LocalBiomeRules256} from './local-biome-rules-v256.ts';
import {WILD_PLANT_GENERATION_FACTS_256 as FACTS,type WildPlantGenerationDef256 as Def} from './wild-plant-generation-data-256.ts';
import {WorldGenerationRandom} from './world-generation-random.ts';
import {createWildPlantSpawner256} from './wild-plant-spawner-256.ts';
import {clampPlant256,plantCellOrder256} from './wild-plant-generation-math-256.ts';

const f=Math.fround;
export const INITIAL_PLANTS_SEED_PART_256=578415222;
type Fact=typeof FACTS[Def];
export interface ExistingGenerationPlant256 {readonly cell:number;readonly defId:string;readonly nonStump:boolean}
/** All grids describe the same actual map AFTER rocks/terrain/roof generation.
 * fertility is the actual FertilityGrid, never the Perlin terrain selector.
 * Region type:0 absent,1 walkable,2 door,3 fence,4 free-air impassable.
 * Natural roofs are distinct from built roofs. Blocks masks include real
 * thing occupants; no facade World, artificial room or default terrain. */
export interface WildPlantMapInput256 {
 readonly schemaVersion:number;readonly width:number;readonly height:number;
 readonly rules:LocalBiomeRules256;readonly densityFactor:number;
 readonly tileMinTemperature:number;readonly tileMaxTemperature:number;
 readonly fertility:ArrayLike<number>;readonly naturalRoof:ArrayLike<number>;
 readonly water:ArrayLike<number>;readonly baseWater:ArrayLike<number>;
 readonly terrainDefIds:readonly string[];readonly terrainTags:readonly (readonly string[])[];
 readonly regionTypes:ArrayLike<number>;readonly walkableNoDoor:ArrayLike<number>;readonly occupied:ArrayLike<number>;readonly blocksPlanting:ArrayLike<number>;
 readonly snowDepth:ArrayLike<number>;readonly sandDepth:ArrayLike<number>;
 readonly existing:readonly ExistingGenerationPlant256[];
 /** Must resolve concrete adopted species. All required definitions are checked
  * before any draws; no missing species receives another species' weight. */
 readonly hasDefinition:(def:Def,species:Fact['species'])=>boolean;
 /** Versioned explicit order; default is our original source-record order.
  * Current Core runtime DefDatabase order/seed parity is not certified. */
 readonly definitionOrder?:readonly Def[];
}
export interface InitialWildPlantsInput256 extends WildPlantMapInput256 {readonly stepSeed:number;readonly worldSeed:number;readonly tileHash:number}
export interface GeneratedInitialPlant256 {readonly cell:number;readonly defId:Def;readonly species:Fact['species'];readonly growth:number;readonly initialAgeCore:number}
export interface InitialWildPlantsResult256 {readonly plants:readonly GeneratedInitialPlant256[];readonly desiredPlants:number;readonly stepState:Readonly<{seed:number;counter:number}>;readonly cellOrderState:Readonly<{seed:number;counter:number}>}
export interface InitialWildPlantsProgress256 {readonly phase:'plants';readonly visited:number;readonly total:number;readonly placed:number}

export function validatePlantMap256(input:WildPlantMapInput256):readonly Def[] {
 const n=input.width*input.height;
 if(!isSchema256Or257(input.schemaVersion)||![input.width,input.height].every(v=>Number.isSafeInteger(v)&&v>0&&v<=400)||
 !Number.isFinite(input.densityFactor)||input.densityFactor<0||!Number.isFinite(input.tileMinTemperature)||!Number.isFinite(input.tileMaxTemperature)||input.tileMinTemperature>input.tileMaxTemperature)throw Error('Invalid initial plant map authority');
 const arrays=[input.fertility,input.naturalRoof,input.water,input.baseWater,input.terrainDefIds,input.terrainTags,input.regionTypes,input.walkableNoDoor,input.occupied,input.blocksPlanting,input.snowDepth,input.sandDepth];
 if(arrays.some(a=>a.length!==n))throw Error('Plant generation grids differ from the real map');
 for(let c=0;c<n;c++){
  if(![input.fertility[c],input.snowDepth[c],input.sandDepth[c]].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0)||
   ![input.naturalRoof[c],input.water[c],input.baseWater[c],input.walkableNoDoor[c],input.occupied[c],input.blocksPlanting[c]].every(v=>v===0||v===1)||
   typeof input.terrainDefIds[c]!=='string'||!Array.isArray(input.terrainTags[c])||!input.terrainTags[c]!.every(t=>typeof t==='string'))throw Error('Invalid initial plant cell');
 }
 const order=input.definitionOrder??Object.keys(FACTS) as Def[];
 if(order.length!==Object.keys(FACTS).length||new Set(order).size!==order.length||order.some(d=>!Object.hasOwn(FACTS,d)))throw Error('Incomplete initial plant definition order');
 const required=new Set<Def>();
 for(const row of input.rules.wildPlants){if(!Object.hasOwn(FACTS,row.defId)||!Number.isFinite(row.commonality)||row.commonality<=0)throw Error(`Unresolved initial plant ${row.defId}`);required.add(row.defId as Def);}
 for(const def of order)if(FACTS[def].cavePlant)required.add(def);
 for(const def of required)if(!input.hasDefinition(def,FACTS[def].species))throw Error(`Missing concrete initial plant ${def}`);
 const occupied=new Set<number>();for(const plant of input.existing){if(!Number.isSafeInteger(plant.cell)||plant.cell<0||plant.cell>=n||occupied.has(plant.cell)||typeof plant.defId!=='string'||typeof plant.nonStump!=='boolean')throw Error('Invalid existing initial plant');occupied.add(plant.cell);}
 return order;
}

/** Initial generation only; isolated planning remains independent of w.rng. */
export function* generateInitialWildPlants256(input:InitialWildPlantsInput256):Generator<InitialWildPlantsProgress256,InitialWildPlantsResult256> {
 if(![input.stepSeed,input.worldSeed,input.tileHash].every(v=>Number.isInteger(v)&&v>=-2147483648&&v<=4294967295))throw Error('Invalid initial plant seeds');
 const order=validatePlantMap256(input),n=input.width*input.height,random=new WorldGenerationRandom(input.stepSeed),spawner=createWildPlantSpawner256(input,order);
 const cellOrder=plantCellOrder256(n,input.worldSeed,input.tileHash),placed:GeneratedInitialPlant256[]=[];
 for(let visited=0;visited<n;visited++){
  const c=cellOrder.cells[visited]!;
  const d=random.value()<f(.001)?undefined:spawner.pick(c,random);
  if(d!==undefined){const def=FACTS[d],growth=clampPlant256(random.float(.15,1.5)),lifespan=Math.trunc(f(f(def.growDays*def.lifespanDaysPerGrowDays)*60000)),initialAgeCore=random.integer(0,Math.max(lifespan-50,0));
   placed.push({cell:c,defId:d,species:def.species,growth,initialAgeCore});spawner.record({cell:c,defId:d,nonStump:true});
  }
  if((visited+1)%256===0)yield {phase:'plants',visited:visited+1,total:n,placed:placed.length};
 }
 return {plants:placed,desiredPlants:spawner.desiredPlants,stepState:random.state,cellOrderState:cellOrder.state};
}
