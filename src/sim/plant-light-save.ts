import { isPlant } from './plants.ts';
import type { Resource } from './types.ts';

/** An interval regime, never an assertion that a currently powered lamp exists. */
export function validPlantGrowthLight(resource:Partial<Resource>,version:number,tick:number):boolean {
  if(resource.growthLight===undefined)return true;
  return version>=177&&(resource.growthLight==='dark'||resource.growthLight==='artificial-full')&&isPlant(resource as Resource)
    &&typeof resource.growth==='number'&&Number.isFinite(resource.growth)&&resource.growth>=0&&resource.growth<=1
    &&Number.isSafeInteger(resource.growthTick)&&resource.growthTick!>=0&&resource.growthTick!<=tick;
}
