import {MACE_MATERIALS_269,MACE_DEFINITIONS_269} from './mace-content-269.ts';
import {LONGSWORD_DEFINITIONS_270} from './longsword-content-270.ts';

/** Core 1.6.4871 rev590: 75 stuff, 12000 work; shared stuff factors retain
 * their existing authority. Precious stuff consumes ten physical units. */
export const SPEAR_MATERIALS_272=MACE_MATERIALS_269;
export type SpearMaterial272=typeof SPEAR_MATERIALS_272[number];
export type SpearItem272=`${SpearMaterial272}-spear`;
export const SPEAR_DEFINITIONS_272=Object.freeze(Object.fromEntries(SPEAR_MATERIALS_272.map(material=>{
 const common=MACE_DEFINITIONS_269[material];
 return [material,Object.freeze({...common,units:common.units*1.5,workTicks:common.workTicks*2,sharpMultiplier:LONGSWORD_DEFINITIONS_270[material].sharpMultiplier})];
}))) as Readonly<Record<SpearMaterial272,Readonly<{label:string;color:number;hitPoints:number;units:number;workTicks:number;price:number;bluntMultiplier:number;sharpMultiplier:number;cooldownMultiplier:number;flammability:number}>>>;
export const SPEAR_ITEMS_272:readonly SpearItem272[]=Object.freeze(SPEAR_MATERIALS_272.map(material=>`${material}-spear` as const));
export const isSpearItem272=(value:unknown):value is SpearItem272=>typeof value==='string'&&(SPEAR_ITEMS_272 as readonly string[]).includes(value);
export const spearMaterial272=(item:SpearItem272):SpearMaterial272=>item.slice(0,-6) as SpearMaterial272;
export const spearItem272=(material:SpearMaterial272):SpearItem272=>`${material}-spear`;
export const spearLabel272=(item:SpearItem272):string=>`Lance en ${SPEAR_DEFINITIONS_272[spearMaterial272(item)].label}`;
export const spearColor272=(item:SpearItem272):number=>SPEAR_DEFINITIONS_272[spearMaterial272(item)].color;
export const spearMaxHitPoints272=(item:SpearItem272):number=>SPEAR_DEFINITIONS_272[spearMaterial272(item)].hitPoints;
export const spearUnits272=(material:SpearMaterial272):number=>SPEAR_DEFINITIONS_272[material].units;
export const spearWorkTicks272=(material:SpearMaterial272):number=>SPEAR_DEFINITIONS_272[material].workTicks;
export const spearWorkTotal272=(material:SpearMaterial272):number=>spearWorkTicks272(material)*10000;
export const spearBaseValue272=(item:SpearItem272):number=>{const m=SPEAR_DEFINITIONS_272[spearMaterial272(item)];return m.units*m.price+m.workTicks*10*.0036;};
export const SPEAR_ITEM_DEFINITIONS_272=Object.freeze(Object.fromEntries(SPEAR_ITEMS_272.map(item=>[item,Object.freeze({label:spearLabel272(item),kind:'weapon' as const,stackLimit:1,nutrition:0,maxIngest:0,color:spearColor272(item)})]))) as Readonly<Record<SpearItem272,Readonly<{label:string;kind:'weapon';stackLimit:1;nutrition:0;maxIngest:0;color:number}>>>;
