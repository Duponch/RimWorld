export const DESIGNATION_VISIBILITY_KEY='lisiere.presentation.designations.min-cell-pixels.v1';
export const DEFAULT_DESIGNATION_MIN_CELL_PIXELS=32;
export function designationMinCellPixels(value:unknown):number {
  if(value===null || value===undefined || value==='')return DEFAULT_DESIGNATION_MIN_CELL_PIXELS;
  const n=Number(value);
  return Number.isFinite(n)?Math.round(Math.max(0,Math.min(96,n))):DEFAULT_DESIGNATION_MIN_CELL_PIXELS;
}
export function designationVisibilityLabel(value:number):string {
  return value===0?'Toujours visibles':`${value} px par case`;
}
