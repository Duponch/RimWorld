export const ITEM_LABEL_VISIBILITY_KEY='lisiere.presentation.item-labels.min-cell-pixels.v1';
export const DEFAULT_ITEM_LABEL_MIN_CELL_PIXELS=96;
/** Projected cell size shares the order icons' zoom convention. Zero always
 * displays labels; it does not change quantities or the simulation. */
export function itemLabelMinCellPixels(value:unknown):number {
  if(value===null||value===undefined||value==='')return DEFAULT_ITEM_LABEL_MIN_CELL_PIXELS;
  const n=Number(value);
  return Number.isFinite(n)?Math.round(Math.max(0,Math.min(160,n))):DEFAULT_ITEM_LABEL_MIN_CELL_PIXELS;
}
export function itemLabelVisibilityLabel(value:number):string {return value===0?'Toujours visibles':`${value} px par case`;}
