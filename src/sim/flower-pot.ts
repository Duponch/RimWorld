import { TICKS_PER_DAY } from './types.ts';

export const CORE_TICKS_PER_LOCAL_TICK=10;
export const DAYLILY_DEFINITION=Object.freeze({
  beauty:18,maxHitPoints:85,sowWorkCore:540,minGlow:.3,growDays:1.5,lifespanDays:4.5,
  growCoreTicks:90_000,lifespanCoreTicks:270_000,dyingDamagePerCoreTick:.005,
});
export const DAYLILY_GROW_TICKS=DAYLILY_DEFINITION.growDays*TICKS_PER_DAY;
export const DAYLILY_LIFESPAN_TICKS=DAYLILY_DEFINITION.lifespanDays*TICKS_PER_DAY;

export interface DaylilyState {
  readonly species:'daylily';
  readonly sownAt:number;
  readonly lastTick:number;
  readonly growth:number;
  readonly ageCore:number;
  readonly unlitCore:number;
  readonly hitPoints:number;
}
export interface FlowerPotState {readonly allowSow:boolean;readonly plant?:DaylilyState}
export interface DaylilyEnvironment {
  /** Core combines fertility, temperature, light and seasonal factors. */
  readonly growthFactor:number;
  readonly glow:number;
}
export type DaylilyStatus='growing'|'mature'|'dying'|'dead';

export function createFlowerPotState(allowSow=true):FlowerPotState {return {allowSow};}
export function sowDaylily(tick:number):DaylilyState {
  if(!Number.isSafeInteger(tick)||tick<0)throw new RangeError('Invalid daylily sow tick.');
  return {species:'daylily',sownAt:tick,lastTick:tick,growth:.0001,ageCore:0,unlitCore:0,hitPoints:DAYLILY_DEFINITION.maxHitPoints};
}
export function daylilyStatus(plant:DaylilyState):DaylilyStatus {
  if(plant.hitPoints<=0)return 'dead';if(plant.ageCore>DAYLILY_DEFINITION.lifespanCoreTicks)return 'dying';return plant.growth>.999?'mature':'growing';
}
/** Beauty is a Thing stat in current Core and is not multiplied by growth. */
export const daylilyBeauty=(plant:DaylilyState|undefined):number=>plant&&daylilyStatus(plant)!=='dead'?DAYLILY_DEFINITION.beauty:0;

/** Pure projection. The central environment owns temperature/light curves and
 * supplies their already-composed growth factor. Age and senescence never
 * pause merely because growth does. */
export function advanceDaylily(plant:DaylilyState,toTick:number,environment:DaylilyEnvironment):DaylilyState {
  if(!Number.isSafeInteger(toTick)||toTick<plant.lastTick)throw new RangeError('Daylily time cannot move backwards.');
  if(!Number.isFinite(environment.growthFactor)||environment.growthFactor<0||!Number.isFinite(environment.glow)||environment.glow<0)throw new RangeError('Invalid daylily environment.');
  const elapsedCore=(toTick-plant.lastTick)*CORE_TICKS_PER_LOCAL_TICK;if(!elapsedCore)return plant;
  const lit=environment.glow>=DAYLILY_DEFINITION.minGlow,growth=lit?Math.min(1,plant.growth+elapsedCore/DAYLILY_DEFINITION.growCoreTicks*environment.growthFactor):plant.growth;
  const ageCore=plant.ageCore+elapsedCore,unlitCore=lit?0:plant.unlitCore+elapsedCore;
  // Current Core starts the same 0.005 damage/tick after age exceeds lifespan.
  // Keep a continuous projection; the engine may batch and ceil its actual hit.
  const oldExcess=Math.max(0,plant.ageCore-DAYLILY_DEFINITION.lifespanCoreTicks),newExcess=Math.max(0,ageCore-DAYLILY_DEFINITION.lifespanCoreTicks);
  const hitPoints=Math.max(0,plant.hitPoints-(newExcess-oldExcess)*DAYLILY_DEFINITION.dyingDamagePerCoreTick);
  return {species:'daylily',sownAt:plant.sownAt,lastTick:toTick,growth,ageCore,unlitCore,hitPoints};
}
export function advanceFlowerPot(state:FlowerPotState,toTick:number,environment:DaylilyEnvironment):FlowerPotState {
  return state.plant?{allowSow:state.allowSow,plant:advanceDaylily(state.plant,toTick,environment)}:state;
}
export const cutFlowerPotPlant=(state:FlowerPotState):FlowerPotState=>state.plant?{allowSow:state.allowSow}:state;
/** V90's conservative adaptation: a live or dead plant is cut before packing. */
export const flowerPotCanUninstall=(state:FlowerPotState):boolean=>state.plant===undefined;

const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const exactKeys=(value:Record<string,unknown>,allowed:readonly string[]):boolean=>Object.keys(value).every(key=>allowed.includes(key))&&allowed.filter(key=>key!=='plant').every(key=>Object.hasOwn(value,key));
export function validateDaylilyState(value:unknown,currentTick=Number.MAX_SAFE_INTEGER):string[] {
  const errors:string[]=[];
  if(!record(value)||!exactKeys(value,['species','sownAt','lastTick','growth','ageCore','unlitCore','hitPoints']))return ['Invalid daylily shape.'];
  if(value.species!=='daylily')errors.push('Invalid daylily species.');
  if(!Number.isSafeInteger(value.sownAt)||Number(value.sownAt)<0||!Number.isSafeInteger(value.lastTick)||Number(value.lastTick)<Number(value.sownAt)||Number(value.lastTick)>currentTick)errors.push('Invalid daylily chronology.');
  if(typeof value.growth!=='number'||!Number.isFinite(value.growth)||value.growth<.0001||value.growth>1)errors.push('Invalid daylily growth.');
  if(!Number.isSafeInteger(value.ageCore)||Number(value.ageCore)<0||!Number.isSafeInteger(value.unlitCore)||Number(value.unlitCore)<0)errors.push('Invalid daylily age.');
  if(typeof value.hitPoints!=='number'||!Number.isFinite(value.hitPoints)||value.hitPoints<0||value.hitPoints>DAYLILY_DEFINITION.maxHitPoints)errors.push('Invalid daylily hit points.');
  return errors;
}
export function validateFlowerPotState(value:unknown,currentTick=Number.MAX_SAFE_INTEGER):string[] {
  if(!record(value)||!exactKeys(value,['allowSow','plant']))return ['Invalid flower pot shape.'];
  const errors:string[]=[];if(typeof value.allowSow!=='boolean')errors.push('Invalid flower pot sow setting.');
  if(value.plant!==undefined)errors.push(...validateDaylilyState(value.plant,currentTick));return errors;
}
