import { isPlant,plantGrowth } from './plants.ts';
import { isRoofed } from './roof-rules.ts';
import type { LightEnvironment,LightReader } from './light-environment.ts';
import type { Resource,World } from './types.ts';

/** Settle the captured light/thermal interval before changing either regime.
 * Roof producers still call this before mutating physical coverage. */
export function checkpointPlantGrowth(world:World,plant:Resource):void {
  if(!isPlant(plant))return;
  plant.growth=plantGrowth(world,plant);plant.growthTick=world.tick;
}

interface Binding {
  source:Resource[];
  plants:Resource[];
  artificial:Float32Array|undefined;
  hasCaptured:boolean;
  constructed:number[]|undefined;
  coverage:number[];
  width:number;
  height:number;
}
const bindings=new WeakMap<World,Binding>();
const sameCoverage=(previous:readonly number[],current:readonly number[]|undefined):boolean=>
  previous.length===(current?.length??0)&&previous.every((cell,i)=>cell===current![i]);

/** The light cache supplies a stable, immutable field. Sky and the temporary
 * roofs Set are deliberately excluded from the invalidation key. Stable calls
 * compare roof primitives but never walk the forest or copy the coverage.
 * Producers replace Resource[] when adding/removing/replacing plant objects. */
export function reconcilePlantLighting(world:World,provided:LightEnvironment|LightReader):void {
  let binding=bindings.get(world);
  if(!binding||binding.source!==world.resources) {
    const plants=world.resources.filter(isPlant);
    binding={source:world.resources,plants,hasCaptured:plants.some(p=>p.growthLight!==undefined),artificial:undefined,
      constructed:undefined,coverage:[],width:0,height:0};
    bindings.set(world,binding);
  }
  const hasLamp=world.structures.some(s=>s.kind==='sun-lamp');
  // Historical maps do not acquire new dark states or force a diffusion read.
  // With no sun lamp, all other glowers cap at .5 and cannot supply full light.
  if(!hasLamp&&!binding.hasCaptured)return;
  const artificial=hasLamp?(typeof provided==='function'?provided():provided).artificial:undefined;
  const constructed=world.roofing?.constructed;
  if(binding.artificial===artificial
    &&binding.constructed===constructed&&binding.width===world.width&&binding.height===world.height
    &&sameCoverage(binding.coverage,constructed))return;
  let hasCaptured=false;
  for(const plant of binding.plants) {
    const cell=plant.z*world.width+plant.x;
    const mode=(artificial?.[cell]??0)>=1?'artificial-full':isRoofed(world,cell)?'dark':undefined;
    hasCaptured||=mode!==undefined;
    if(plant.growthLight===mode)continue;
    checkpointPlantGrowth(world,plant);
    if(mode===undefined)delete plant.growthLight;else plant.growthLight=mode;
  }
  Object.assign(binding,{artificial,hasCaptured,constructed,coverage:[...(constructed??[])],width:world.width,height:world.height});
}
