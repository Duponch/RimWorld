import { APPAREL } from './apparel-rules.ts';
import { weaponMaxHitPoints } from './equipment-rules.ts';
import type { ItemId } from './items.ts';
import type { MaterialPile,Resource,Structure } from './types.ts';

/** Only shipped definitions. Missing/non-HP things are deliberately not fuels. */
const BUILDINGS:Readonly<Record<string,readonly [number,number,boolean]>>={
  wall:[300,1,false],door:[160,1,false],bed:[140,1,true],table:[75,1,true],stool:[75,1,true],horseshoes:[75,1,true],
  campfire:[80,0,false],'passive-cooler':[80,1,false],stonecutter:[180,1,true],'butcher-table':[180,1,true],
  'fueled-stove':[180,1,true],'electric-stove':[180,1,true],'tailor-bench':[180,1,true],'research-bench':[250,1,true],
  'electric-tailor-bench':[180,1,true],'table-square':[100,1,true],'table-long':[125,1,true],'dining-chair':[75,1,true],armchair:[120,1,true],'end-table':[60,1,true],dresser:[100,1,true],'flower-pot':[40,1,true],
  'wood-generator':[300,1,true],'standing-lamp':[50,1,false],cooler:[100,.7,true],battery:[100,1,true],
  'power-conduit':[80,.7,false],'power-switch':[120,.5,false],'solar-generator':[300,.7,true],heater:[100,.5,true],'wind-turbine':[150,.5,true],
};
const STUFF_HP:Readonly<Record<string,number>>={wood:.65,steel:1,'granite-blocks':1.7,'limestone-blocks':1.55,'marble-blocks':1.2,'sandstone-blocks':1.4,'slate-blocks':1.3};
const STUFF_BUILDINGS=new Set(['wall','door','bed','table','table-square','table-long','stool','dining-chair','end-table','dresser','flower-pot','horseshoes','stonecutter','butcher-table','fueled-stove','electric-stove','tailor-bench','electric-tailor-bench','research-bench']);
export const structureMaxHp=(s:Pick<Structure,'kind'|'material'>)=>Math.round((BUILDINGS[s.kind]?.[0]??0)*(STUFF_BUILDINGS.has(s.kind)?STUFF_HP[s.material??'wood']??1:1));
export const structureFlammability=(s:Pick<Structure,'kind'|'material'>)=>(BUILDINGS[s.kind]?.[1]??0)*(STUFF_BUILDINGS.has(s.kind)?s.material?.endsWith('-blocks')?0:s.material==='steel'?.4:1:1);
export const structureLeavesResources=(s:Pick<Structure,'kind'>)=>BUILDINGS[s.kind]?.[2]??false;
export const resourceMaxHp=(r:Pick<Resource,'kind'>)=>r.kind==='tree'?200:r.kind==='berries'?120:r.kind==='corn'?150:r.kind==='rock'?0:85;
export const resourceFlammability=(r:Pick<Resource,'kind'>)=>r.kind==='rock'?0:r.kind==='tree'?.8:1;
export function pileMaxHp(p:Pick<MaterialPile,'kind'|'item'>):number {
  if(p.kind==='apparel')return APPAREL[p.item as keyof typeof APPAREL]?.hitPoints??0;
  if(p.kind==='weapon')return weaponMaxHitPoints(p.item);if(p.kind==='corpse')return 100;
  if(p.kind==='food')return ['simple-meal','survival-meal','legacy-portion'].includes(p.item)?50:60;
  if(p.kind==='medicine')return 60;if(p.kind==='unfinished')return 50;
  return p.item==='wood'?150:p.item==='cloth'?80:p.item==='light-leather'?60:p.item==='component'?70:0;
}
export function pileFlammability(p:Pick<MaterialPile,'kind'|'item'>):number {
  if(p.kind==='apparel')return p.item==='flak-vest'?.6:1.2;
  if(p.kind==='weapon')return p.item==='plasteel-knife'?0:.5;if(p.kind==='corpse')return .7;if(p.kind==='food')return 1;
  if(p.kind==='medicine')return p.item==='herbal-medicine'?1.3:.7;
  // Unfinished apparel inherits the default zero stat; its embedded cloth is not a second ground pile.
  return p.item==='wood'?1:p.item==='cloth'?1.2:p.item==='light-leather'?1:p.item==='component'?.6:0;
}
export function pileDamage(p:MaterialPile):number {return p.apparel?pileMaxHp(p)-p.apparel.hitPoints:p.weapon?pileMaxHp(p)-p.weapon.hitPoints:p.damage??0;}
export function copyThingDamage(target:{damage?:number},source:{damage?:number}):void {if(source.damage)target.damage=source.damage;else delete target.damage;}
/** Call before adding quantity. Core stacks average surviving HP, rounding up. */
export function mergeThingDamage(target:Pick<MaterialPile,'item'|'kind'|'quantity'|'damage'>,quantity:number,sourceDamage=0,maxHp=pileMaxHp(target)):void {
  if(!maxHp||!quantity)return;const hp=Math.ceil(((maxHp-(target.damage??0))*target.quantity+(maxHp-sourceDamage)*quantity)/(target.quantity+quantity));
  if(hp<maxHp)target.damage=maxHp-hp;else delete target.damage;
}
export type FireItemLoss=Partial<Record<ItemId,number>>;

export const isRepairableStructure=(s:Pick<Structure,'kind'|'material'>):boolean=>structureMaxHp(s)>0;
