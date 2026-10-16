import {ANIMAL_MEAT_ITEMS,isAnimalMeat} from './biome-items.ts';

/** Core 1.6.4871, paraphrased facts. Each local input has .05 nutrition. */
export const PEMMICAN_SCHEMA_VERSION=248;
export const PEMMICAN_RECIPE='make-pemmican' as const;
export const PEMMICAN_GROUP_UNITS=5,PEMMICAN_INPUT_UNITS=10,PEMMICAN_OUTPUT_UNITS=16,PEMMICAN_WORK_TICKS=70;
export const PEMMICAN_VEGETABLE_INPUTS=['rice','berries','potato','corn','agave-fruit'] as const;
export const PEMMICAN_INPUTS=[...ANIMAL_MEAT_ITEMS,...PEMMICAN_VEGETABLE_INPUTS] as const;
export const isPemmicanRecipe=(value:unknown):value is typeof PEMMICAN_RECIPE=>value===PEMMICAN_RECIPE;
export function validPemmicanIngredients(parts:readonly {item:string;quantity:number}[]):boolean {
  let meat=0,vegetable=0;
  for(const part of parts){
    if(!part||!Number.isSafeInteger(part.quantity)||part.quantity<=0)return false;
    if(isAnimalMeat(part.item))meat+=part.quantity;
    else if((PEMMICAN_VEGETABLE_INPUTS as readonly string[]).includes(part.item))vegetable+=part.quantity;
    else return false;
  }
  return meat===PEMMICAN_GROUP_UNITS&&vegetable===PEMMICAN_GROUP_UNITS;
}
