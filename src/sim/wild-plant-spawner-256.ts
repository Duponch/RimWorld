import type {WildPlantMapInput256,ExistingGenerationPlant256} from './wild-plant-generation-256.ts';
import {WILD_PLANT_GENERATION_FACTS_256 as FACTS,type WildPlantGenerationDef256 as Def} from './wild-plant-generation-data-256.ts';
import {createPlantGenerationRegions256,plantRegionsNear256,touchablePlantRegions256,type PlantGenerationRegions256,type PlantGenerationRegion256} from './wild-plant-regions-256.ts';
import {chooseInitialPlant256,globalPlantBias256,lerpPlant256,remapPlant256,clampPlant256} from './wild-plant-generation-math-256.ts';
const f=Math.fround;
export interface PlantChoiceRandom256 {value():number}
/** One bounded geometry entry per actual map owner. Compare copied primitive
 * region/base inputs, including in-place edits; never trust array identity.
 * No resource index or state survives save/load. */
export class PlantRegionCache256 {
 private width=0;private height=0;private types=new Uint8Array(0);private base=new Float32Array(0);private topology:PlantGenerationRegions256|undefined;
 read(width:number,height:number,types:ArrayLike<number>,base:ArrayLike<number>):PlantGenerationRegions256 {
  const same=this.topology&&width===this.width&&height===this.height&&types.length===this.types.length&&base.length===this.base.length&&this.types.every((v,i)=>v===types[i])&&this.base.every((v,i)=>Object.is(v,base[i]));
  if(same)return this.topology!;
  const topology=createPlantGenerationRegions256(width,height,types,base);
  this.width=width;this.height=height;this.types=Uint8Array.from(types);this.base=Float32Array.from(base);this.topology=topology;return topology;
 }
}

/** Same selection kernel for initial generation and actual ongoing renewal. */
export function createWildPlantSpawner256(input:WildPlantMapInput256,order:readonly Def[],cache?:PlantRegionCache256) {
 const n=input.width*input.height;
 const ordinaryWeights=new Map<Def,number>();for(const row of input.rules.wildPlants)ordinaryWeights.set(row.defId as Def,f(row.commonality*2));
 const ordinary=order.filter(d=>ordinaryWeights.has(d)),caves=order.filter(d=>FACTS[d].cavePlant);
 const all=[...new Set([...ordinary,...caves])],common=(d:Def)=>FACTS[d].cavePlant?FACTS[d].cavePlantWeight:ordinaryWeights.get(d)??0;
 let totalCommon=0,caveCommon=0;for(const d of order)if(all.includes(d))totalCommon=f(totalCommon+common(d));for(const d of caves)caveCommon=f(caveCommon+common(d));
 const pct=(d:Def)=>f(common(d)/(FACTS[d].cavePlant?caveCommon:totalCommon));
 const anyIgnores=all.some(d=>FACTS[d].completelyIgnoreFertility),base=new Float32Array(n);
 const multiplier=(c:number)=>f(f(input.rules.scalars.plantDensity*input.densityFactor)*(input.fertility[c]!<=0&&anyIgnores?1:input.fertility[c]!));
 let desired=0;
 for(let c=0;c<n;c++){let value=input.fertility[c]!;if(input.naturalRoof[c])value=f(value*.5);if(anyIgnores&&input.water[c]&&value<=0)value=f(.1);base[c]=value;desired=f(desired+Math.min(f(value*multiplier(c)),1));}
 const topology=cache?cache.read(input.width,input.height,input.regionTypes,base):createPlantGenerationRegions256(input.width,input.height,input.regionTypes,base),regionCounts=new Int32Array(topology.regions.length),regionSpecies=topology.regions.map(()=>new Map<string,number>()),globalSpecies=new Map<string,number>();
 const at=new Map<number,ExistingGenerationPlant256>();let totalPlants=0;
 const record=(plant:ExistingGenerationPlant256)=>{at.set(plant.cell,plant);if(!plant.nonStump)return;totalPlants++;globalSpecies.set(plant.defId,(globalSpecies.get(plant.defId)??0)+1);for(const r of touchablePlantRegions256(topology,plant.cell,input.walkableNoDoor)){regionCounts[r]++;const counts=regionSpecies[r]!;counts.set(plant.defId,(counts.get(plant.defId)??0)+1);}};
 for(const plant of input.existing)record(plant);
 const lowest=Math.min(...all.map(d=>FACTS[d].wildOrder)),maxCluster=Math.max(0,...all.map(d=>FACTS[d].wildClusterRadius));
 let radial20=0;for(let z=-20;z<=20;z++)for(let x=-20;x<=20;x++)if(x*x+z*z<=400)radial20++;
 const desiredIn=(region:PlantGenerationRegion256,c:number)=>Math.min(f(region.baseDesired*multiplier(c)),region.cells.length);
 const delta=(a:number,b:number)=>{const dx=a%input.width-b%input.width,dz=Math.floor(a/input.width)-Math.floor(b/input.width);return dx*dx+dz*dz;};
 const shoreWeight=(root:number)=>{
  if(!input.water[root])return 1;
  const queue=[root],seen=new Set(queue);for(let head=0;head<queue.length;head++){const c=queue[head]!;if(!input.baseWater[c])return clampPlant256(f(1-f(Math.sqrt(delta(c,root))/4)));
   const x=c%input.width,z=Math.floor(c/input.width);for(const next of [z>0?c-input.width:-1,x>0?c-1:-1,z+1<input.height?c+input.width:-1,x+1<input.width?c+1:-1])if(next>=0&&!seen.has(next)){seen.add(next);queue.push(next);}
  }return 0;
 };
 const canPlant=(d:Def,c:number)=>{const def=FACTS[d];return (def.completelyIgnoreFertility||input.fertility[c]!>=def.fertilityMin)&&
  input.tileMinTemperature<=def.maxGrowthTemperature&&input.tileMaxTemperature>=def.minGrowthTemperature&&
  (!def.wildTerrainTags.length||def.wildTerrainTags.some(t=>input.terrainTags[c]!.includes(t)))&&
  !(def.terrainBlacklist as readonly string[]).includes(input.terrainDefIds[c]!)&&!input.blocksPlanting[c];};

 const pick=(c:number,random:PlantChoiceRandom256,wholeDesired=desired,playing=false):Def|undefined=>{
  if(input.densityFactor<=0||at.has(c)||input.occupied[c]||(!anyIgnores&&input.fertility[c]!<=0)||input.snowDepth[c]!>=f(.2)||input.sandDepth[c]!>=f(.2))return;
  const local=new Map<number,readonly PlantGenerationRegion256[]>(),near=(radius:number)=>{let v=local.get(radius);if(!v){v=plantRegionsNear256(topology,c,radius);local.set(radius,v);}return v;};
  let saturated=false;
  if(f(wholeDesired*f(radial20/n))<=4||!input.rules.scalars.wildPlantsCareAboutLocalFertility)saturated=totalPlants>=wholeDesired;
  else {let count=0,wanted=0;for(const r of near(20)){count+=regionCounts[r.id]!;wanted=f(wanted+desiredIn(r,c));}saturated=count>=wanted;}
  if(!saturated){
   const candidates=(input.naturalRoof[c]?caves:ordinary).filter(d=>{
    const def=FACTS[d];if(def.deadPlant||!canPlant(d,c))return false;if(def.cavePlant||Math.abs(def.wildOrder-lowest)<=.000001)return true;
    const lower=ordinary.filter(other=>FACTS[other].wildOrder<def.wildOrder);let share=0;for(const other of lower)share=f(share+pct(other));
    let count=0,wanted=0;for(const r of near(Math.max(7,def.wildClusterRadius*1.5))){wanted=f(wanted+desiredIn(r,c));for(const other of lower)count+=regionSpecies[r.id]!.get(other)??0;}
    const lowerDesired=f(wanted*share);return lowerDesired<4||f(count/lowerDesired)>=f(.57);
   });
   if(candidates.length){
    const clusterDistances=new Map<Def,number[]>(),cx=c%input.width,cz=Math.floor(c/input.width),radius=maxCluster*2;
    for(let z=Math.max(0,cz-radius);z<=Math.min(input.height-1,cz+radius);z++)for(let x=Math.max(0,cx-radius);x<=Math.min(input.width-1,cx+radius);x++){
     const cell=z*input.width+x,plant=at.get(cell),def=plant&&Object.hasOwn(FACTS,plant.defId)?plant.defId as Def:undefined;if(!def||FACTS[def].wildClusterRadius<=0)continue;const distance=delta(c,cell);if(distance>radius*radius)continue;
     const distances=clusterDistances.get(def)??[];distances.push(distance);clusterDistances.set(def,distances);
    }
    const weights=candidates.map(d=>{
     const def=FACTS[d],share=f(pct(d)*(playing?def.plantRespawningCommonalityFactor:1)),ratio=f(f((globalSpecies.get(d)??0)/totalPlants)/share);let weight=f(common(d)*globalPlantBias256(ratio));
     if(def.wildClusterRadius>0&&ratio<f(1.1)){
      const commonality=common(d),sum=def.cavePlant?caveCommon:totalCommon,weighted=f(commonality*def.wildClusterWeight),clusterShare=f(weighted/f(f(sum-commonality)+weighted));
      const far=remapPlant256(share,1,1,f(1/f(f(Math.fround(Math.PI)*def.wildClusterRadius)*def.wildClusterRadius)),clusterShare),distances=clusterDistances.get(d);
      let factor=far;if(distances?.length){distances.sort((a,b)=>a-b);factor=remapPlant256(f(def.wildClusterRadius*.9),f(def.wildClusterRadius*1.1),def.wildClusterWeight,far,f(Math.sqrt(distances[Math.floor(distances.length/2)]!)));}weight=f(weight*factor);
     }
     if(def.wildEqualLocalDistribution){let r=f(f(Math.max(input.width,input.height)/f(Math.sqrt(f(wholeDesired*share))))*2);if(def.wildClusterRadius>0)r=Math.max(r,f(def.wildClusterRadius*1.6));r=Math.max(r,7);
      if(r<=25){let wanted=0,count=0,thisCount=0;for(const region of near(r)){wanted=f(wanted+desiredIn(region,c));count+=regionCounts[region.id]!;thisCount+=regionSpecies[region.id]!.get(d)??0;}
       if(f(wanted*share)>=2&&count>f(wanted*.5))weight=f(weight*lerpPlant256(7,1,f(f(thisCount/count)/share)));
      }
     }return weight;
    });
    const selected=chooseInitialPlant256(weights,random),d=selected===undefined?undefined:candidates[selected];
    const chance=(value:number)=>value>=1||value>0&&random.value()<value;
    if(d!==undefined&&(!FACTS[d].wildPlantUseDistanceToShore||chance(shoreWeight(c)))){
     return d;
    }
   }
  }

 };
 return {desiredPlants:desired,desiredAt:(c:number)=>Math.min(f(base[c]!*multiplier(c)),1),pick,record};
}
