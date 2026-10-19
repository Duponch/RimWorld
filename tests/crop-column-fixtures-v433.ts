import type {CropVisualDelta,CropVisualUpsert,TypedCropVisualDelta,ObjectCropVisualDelta} from '../src/bridge/natural-appearance-values';

/** Test-only expansion; no JS rows are allocated by either product wire end. */
export function cropRows(value:CropVisualDelta):readonly CropVisualUpsert[]{
 if(!('format'in value))return value.upsert;
 return Array.from(value.ids,(id,i)=>({id,ordinal:value.ordinals[i]!,growth:value.growth[i]!,leafless:!!(value.flags[i]!&1),blighted:!!(value.flags[i]!&2),supported:!!(value.flags[i]!&4)}));
}
export function objectCrops(value:CropVisualDelta):ObjectCropVisualDelta {return{upsert:cropRows(value),removed:Array.from(value.removed)};}
export function editCropGrowth(value:CropVisualDelta,index:number,growth:number):()=>void {
 if('format'in value){const old=value.growth[index]!;value.growth[index]=growth;return()=>{value.growth[index]=old;};}
 const row=value.upsert[index] as {growth:number},old=row.growth;row.growth=growth;return()=>{row.growth=old;};
}
export function omitLastCrop(value:CropVisualDelta):CropVisualDelta {
 if(!('format'in value))return{upsert:value.upsert.slice(0,-1),removed:value.removed};
 return{...value,ids:value.ids.slice(0,-1),ordinals:value.ordinals.slice(0,-1),growth:value.growth.slice(0,-1),flags:value.flags.slice(0,-1)};
}
export const asColumns=(value:CropVisualDelta)=>value as TypedCropVisualDelta;
