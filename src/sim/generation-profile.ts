import type { Terrain } from './types.ts';

/** Initial landscape calibration, not Core's total plant density translated
 * into trees. Only the available woody and edible species are represented. */
export type GenerationProfile='temperate-survivors-v1'|'temperate-crashlanded-v1';
export function temperateVegetation(density:number,wetness:number,ground:Terrain):{treeChance:number;berryChance:number} {
  return {
    treeChance:(.01+density*density*.16)*(ground==='soil'?.58:1),
    berryChance:.001+wetness*.003+(1-Math.abs(density-.48)*2)*.002,
  };
}
