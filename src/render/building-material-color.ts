import type { ConstructionMaterial } from '../sim/building-materials';
import { ITEM_DEFINITIONS } from '../sim/items';

/** Shared solid-part tint; preserve established wood and bedding palettes. */
export function buildingMaterialColor(material:ConstructionMaterial|undefined,wood?:number):number|undefined {
  return !material||material==='wood'?wood:material==='steel'?0x89999e:ITEM_DEFINITIONS[material].color;
}
