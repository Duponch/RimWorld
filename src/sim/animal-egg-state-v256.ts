import {ANIMAL_EGG_CONTENT_256,type EggSpecies256} from './animal-egg-content-v256.ts';
/** Runtime biological owners, never added by migration. The next consumer
 * supplies real context and commits physical spawn/conversion atomically. */
export interface AnimalEggLayer256 {progress:number;fertilizations:number;fatherId?:number}
export interface FertilizedEggState256 {
 progress:number;temperatureDamage:number;motherId?:number;fatherId?:number;faction:'player'|'wild';atTick:number;
}
export interface EggThermalContext256 {tick:number;temperature:number;suspended:boolean}
const finite=(v:number)=>Number.isFinite(v)&&v>=0;
const draw=(random:()=>number)=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw Error('Invalid animal egg draw.');return n;};
/** One genuine local tick or an already-confirmed repeat. No catch-up from a
 * former map, no World construction, and no second advancement of a held pile. */
export function evolveFertilizedEgg256(state:FertilizedEggState256,species:EggSpecies256,context:EggThermalContext256):{state:FertilizedEggState256;action:'none'|'ruin'|'hatch'} {
 if(!Number.isSafeInteger(context.tick)||context.tick<0||!Number.isFinite(context.temperature)||typeof context.suspended!=='boolean'||!Number.isSafeInteger(state.atTick)||context.tick<state.atTick||context.tick>state.atTick+1||!finite(state.progress)||!finite(state.temperatureDamage)||state.temperatureDamage>1)throw Error('Invalid egg biological frontier.');
 const def=ANIMAL_EGG_CONTENT_256[species];
 if(context.suspended)return {state:{...state,atTick:context.tick},action:'none'};
 if(state.atTick===context.tick)return {state:{...state},action:state.temperatureDamage>=1?'ruin':state.progress>1?'hatch':'none'};
 const next={...state,atTick:context.tick};
 // Ten Core substeps per local tick. Retain float32 accumulation and the
 // strict >1 hatch edge; waiting for physical capacity does not add growth.
 for(let core=0;core<10;core++){
  const excess=Math.max(0,def.minTemperature-context.temperature,context.temperature-def.maxTemperature);
  next.temperatureDamage=Math.min(1,Math.fround(next.temperatureDamage+Math.fround(excess*def.damagePerDegreeCoreTick)));
  if(next.temperatureDamage>=1)return {state:next,action:'ruin'};
  if(next.progress<=1)next.progress=Math.fround(next.progress+Math.fround(1/(def.hatchDays*60000)));
  if(next.progress>1)return {state:next,action:'hatch'};
 }
 return {state:next,action:'none'};
}
/** Source/destination quantity are captured before transfer. Parent/faction
 * stay destination-owned, exactly as the source hatcher/temperature comps. */
export function mergeFertilizedEgg256(target:FertilizedEggState256,targetQuantity:number,source:FertilizedEggState256,sourceQuantity:number):FertilizedEggState256 {
 if(!Number.isSafeInteger(targetQuantity)||targetQuantity<1||!Number.isSafeInteger(sourceQuantity)||sourceQuantity<1||!Number.isSafeInteger(targetQuantity+sourceQuantity)||target.atTick!==source.atTick||(target.temperatureDamage>=1)!==(source.temperatureDamage>=1))throw Error('Incompatible egg transfer.');
 const share=Math.fround(sourceQuantity/(targetQuantity+sourceQuantity)),weighted=(a:number,b:number)=>Math.fround(a+Math.fround(Math.fround(b-a)*share));
 return {...target,progress:weighted(target.progress,source.progress),temperatureDamage:weighted(target.temperatureDamage,source.temperatureDamage)};
}
export function drawEggQuantity256(species:EggSpecies256,random:()=>number):number {
 const [min,max]=ANIMAL_EGG_CONTENT_256[species].quantityRange;return min===max?min:min+Math.floor(draw(random)*(max-min+1));
}
export function fertilizeEggLayer256(layer:AnimalEggLayer256,species:EggSpecies256,fatherId:number):AnimalEggLayer256 {
 if(!Number.isSafeInteger(fatherId)||fatherId<1)throw Error('Invalid egg father.');return {...layer,fertilizations:ANIMAL_EGG_CONTENT_256[species].fertilizationMaximum,fatherId};
}
