import { roundYield } from './cooking-statistics.ts';
import { WEAPON_QUALITIES,isWeaponItem,weaponMaxHitPoints,type WeaponItem } from './equipment-rules.ts';
import { pawnBody } from './health-rules.ts';
import type { CookingBill,SmeltFilter } from './cooking-types.ts';
import type { MaterialPile,Pawn } from './types.ts';
import { isSmeltingRecipe } from './smelting-content.ts';
export { isSmeltingRecipe,SMELTING_WORK_TICKS,SMELTING_MAX_OUTPUT,SMELTING_WEAPONS,smeltingProduct,type SmeltingRecipe } from './smelting-content.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function validSmeltFilter(value:unknown):value is SmeltFilter {
  if(!record(value)||Object.keys(value).some(k=>!['hpMin','hpMax','qualityMin','qualityMax'].includes(k))
    ||!['hpMin','hpMax','qualityMin','qualityMax'].every(k=>Object.hasOwn(value,k)))return false;
  const min=WEAPON_QUALITIES.indexOf(value.qualityMin as SmeltFilter['qualityMin']),max=WEAPON_QUALITIES.indexOf(value.qualityMax as SmeltFilter['qualityMax']);
  return typeof value.hpMin==='number'&&Number.isInteger(value.hpMin)&&value.hpMin>=0
    &&typeof value.hpMax==='number'&&Number.isInteger(value.hpMax)&&value.hpMax<=100&&value.hpMin<=value.hpMax&&min>=0&&max>=min;
}
/** Core rounds the ratio to hundredths with midpoint-to-even before filtering. */
export function smeltingHitPointsPercent(hitPoints:number,maxHitPoints:number):number {
  const numerator=hitPoints*100,whole=Math.floor(numerator/maxHitPoints),remainder=numerator-whole*maxHitPoints;
  return Math.min(100,Math.max(0,whole+(remainder*2>maxHitPoints||remainder*2===maxHitPoints&&whole%2!==0?1:0)));
}
/** Ownership belongs to the caller: this same filter applies to ground and held stages. */
export function smeltingIngredientAllowed(bill:CookingBill,pile:MaterialPile):boolean {
  if(!isSmeltingRecipe(bill.recipe)||!validSmeltFilter(bill.smeltFilter)||!isWeaponItem(pile.item)
    ||pile.kind!=='weapon'||pile.quantity!==1||bill.filters[pile.item]!==true||!record(pile.weapon)
    ||!Object.hasOwn(pile.weapon,'quality')||!Object.hasOwn(pile.weapon,'hitPoints')
    ||Object.keys(pile.weapon).some(k=>!['quality','hitPoints','forbidden'].includes(k))||pile.weapon.forbidden!==undefined)return false;
  const weapon=pile.weapon,max=weaponMaxHitPoints(pile.item),quality=WEAPON_QUALITIES.indexOf(weapon.quality);
  if(!Number.isInteger(weapon.hitPoints)||weapon.hitPoints<=0||weapon.hitPoints>max||quality<0)return false;
  const hp=smeltingHitPointsPercent(weapon.hitPoints,max),filter=bill.smeltFilter;
  return hp>=filter.hpMin&&hp<=filter.hpMax&&quality>=WEAPON_QUALITIES.indexOf(filter.qualityMin)&&quality<=WEAPON_QUALITIES.indexOf(filter.qualityMax);
}
export function validSmeltingIngredients(parts:readonly {item:unknown;quantity:number}[]):boolean {
  return parts.length===1&&parts[0]!.quantity===1&&isWeaponItem(parts[0]!.item);
}
/** Smelting has no skill or learning; delivered WorkSpeedGlobal remains neutral. */
export function smeltingSpeed(pawn:Pawn):number {
  const c=pawnBody(pawn).capacities;
  return Math.max(.1,c.manipulation*(.7+.3*Math.min(1,c.sight)));
}
/** Intricate components are excluded before rounding. Even a whole yield draws once. */
export function smeltingYield(item:WeaponItem,random:()=>number):number {
  return roundYield((item==='bolt-action-rifle'?60:item==='emp-launcher'?75:30)*.25,random);
}
export function validSmeltingProduct(item:unknown,quantity:unknown):boolean {
  return typeof quantity==='number'&&Number.isInteger(quantity)&&quantity>=1&&(item==='steel'?quantity<=19:item==='plasteel'&&quantity<=8);
}
