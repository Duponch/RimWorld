import type {Cell,Structure} from './types.ts';

/** Installed/packed barrel owns this scalar content. No parallel wort pile. */
export interface FermentationState265 {wort:number;progress:number;ruin:number}
export interface BarrelExtractionTask265 {barrelId:number;spot:Cell;progress:number}
export const FERMENTING_CAPACITY_265=25;
export const FERMENTING_DURATION_CORE_265=360000;
export const FERMENTING_SERVICE_TICKS_265=20;
export const newFermentationState265=():FermentationState265=>({wort:0,progress:0,ruin:0});
export const fermentationSpeed265=(temperature:number):number=>temperature>=7?1:temperature<=-1?.1:.1+(temperature+1)/8*.9;
export function validFermentationState265(v:unknown):v is FermentationState265 {
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Reflect.ownKeys(v).length!==3)return false;
  const o=v as Record<string,unknown>;
  if(!['wort','progress','ruin'].every(k=>{const d=Object.getOwnPropertyDescriptor(v,k);return d?.enumerable&&Object.hasOwn(d,'value');}))return false;
  return Number.isSafeInteger(o.wort)&&Number(o.wort)>=0&&Number(o.wort)<=25&&typeof o.progress==='number'&&Number.isFinite(o.progress)&&o.progress>=0&&o.progress<=1&&typeof o.ruin==='number'&&Number.isFinite(o.ruin)&&o.ruin>=0&&o.ruin<=1&&(o.wort!==0||o.progress===0)&&(o.ruin!==1||o.wort===0);
}
export function fermentationContents265(s:Pick<Structure,'kind'|'fermentation'>):{item:'wort'|'beer';quantity:number}|undefined {
  const state=s.fermentation;
  return s.kind==='fermenting-barrel'&&state&&state.wort>0?{item:state.progress>=1?'beer':'wort',quantity:state.wort}:undefined;
}
