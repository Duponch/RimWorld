import {MACE_MATERIALS_269,MACE_DEFINITIONS_269} from './mace-content-269.ts';

/** Core1.6.4871rev590 facts. The six shared stuff properties retain their
 * existing authority; this family adds its own quota, work and sharp factor. */
export const LONGSWORD_MATERIALS_270=MACE_MATERIALS_269;
export type LongswordMaterial270=typeof LONGSWORD_MATERIALS_270[number];
export type LongswordItem270=`${LongswordMaterial270}-longsword`;
const sharp={wood:.4,steel:1,plasteel:1.1,uranium:1.1,silver:.85,gold:.75} as const;
export const LONGSWORD_DEFINITIONS_270=Object.freeze(Object.fromEntries(LONGSWORD_MATERIALS_270.map(material=>{
 const common=MACE_DEFINITIONS_269[material];
 return [material,Object.freeze({...common,units:common.units*2,workTicks:common.workTicks*3,sharpMultiplier:sharp[material]})];
}))) as Readonly<Record<LongswordMaterial270,Readonly<{label:string;color:number;hitPoints:number;units:number;workTicks:number;price:number;bluntMultiplier:number;sharpMultiplier:number;cooldownMultiplier:number;flammability:number}>>>;
export const LONGSWORD_ITEMS_270:readonly LongswordItem270[]=Object.freeze(LONGSWORD_MATERIALS_270.map(material=>`${material}-longsword` as const));
export const isLongswordItem270=(value:unknown):value is LongswordItem270=>typeof value==='string'&&(LONGSWORD_ITEMS_270 as readonly string[]).includes(value);
export const longswordMaterial270=(item:LongswordItem270):LongswordMaterial270=>item.slice(0,-10) as LongswordMaterial270;
export const longswordItem270=(material:LongswordMaterial270):LongswordItem270=>`${material}-longsword`;
export const longswordLabel270=(item:LongswordItem270):string=>`Épée longue en ${LONGSWORD_DEFINITIONS_270[longswordMaterial270(item)].label}`;
export const longswordColor270=(item:LongswordItem270):number=>LONGSWORD_DEFINITIONS_270[longswordMaterial270(item)].color;
export const longswordMaxHitPoints270=(item:LongswordItem270):number=>LONGSWORD_DEFINITIONS_270[longswordMaterial270(item)].hitPoints;
export const longswordUnits270=(material:LongswordMaterial270):number=>LONGSWORD_DEFINITIONS_270[material].units;
export const longswordWorkTicks270=(material:LongswordMaterial270):number=>LONGSWORD_DEFINITIONS_270[material].workTicks;
export const longswordWorkTotal270=(material:LongswordMaterial270):number=>longswordWorkTicks270(material)*10000;
export const longswordBaseValue270=(item:LongswordItem270):number=>{const m=LONGSWORD_DEFINITIONS_270[longswordMaterial270(item)];return m.units*m.price+m.workTicks*10*.0036;};
export const LONGSWORD_ITEM_DEFINITIONS_270=Object.freeze(Object.fromEntries(LONGSWORD_ITEMS_270.map(item=>[item,Object.freeze({label:longswordLabel270(item),kind:'weapon' as const,stackLimit:1,nutrition:0,maxIngest:0,color:longswordColor270(item)})]))) as Readonly<Record<LongswordItem270,Readonly<{label:string;kind:'weapon';stackLimit:1;nutrition:0;maxIngest:0;color:number}>>>;
