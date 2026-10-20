/** Finite Core armor variants, independent of textile families and runtime.
 * Reference/formulas: tmp/forge-v443/reference.md, Core1.6.4871, no DLC. */
import {apparelCoverage} from './armor.ts';
export const ARMOR_STUFFS267=['wood','steel','plasteel','uranium','silver','gold'] as const;
export type ArmorStuff267=typeof ARMOR_STUFFS267[number];
export type ArmorMetal267=Exclude<ArmorStuff267,'wood'>;
export type SmithingApparel267=`${ArmorStuff267}-plate-armor`|`${ArmorMetal267}-simple-helmet`;
const f=Math.fround;
export const ARMOR_STUFF_DEFINITIONS267=Object.freeze({
 wood:Object.freeze({label:'bois',color:0xa48762,sharp:.54,blunt:.54,heat:.4,cold:8,flammability:1,price:1.2,work:.7}),
 steel:Object.freeze({label:'acier',color:0x87958f,sharp:.9,blunt:.45,heat:.6,cold:3,flammability:.4,price:1.9,work:1}),
 plasteel:Object.freeze({label:'plastacier',color:0xa0b2b5,sharp:1.14,blunt:.55,heat:.65,cold:3,flammability:0,price:9,work:2.2}),
 uranium:Object.freeze({label:'uranium',color:0x718c75,sharp:1.08,blunt:.54,heat:.65,cold:3,flammability:0,price:6,work:1.9}),
 silver:Object.freeze({label:'argent',color:0xc5cbcd,sharp:.72,blunt:.36,heat:.36,cold:3,flammability:.4,price:1,work:1}),
 gold:Object.freeze({label:'or',color:0xd5b66f,sharp:.72,blunt:.36,heat:.36,cold:3,flammability:.4,price:10,work:.9}),
});
const plateHp:Readonly<Record<ArmorStuff267,number>>={wood:188,steel:290,plasteel:810,uranium:725,silver:205,gold:174};
const helmetHp:Readonly<Record<ArmorMetal267,number>>={steel:100,plasteel:280,uranium:250,silver:70,gold:60};
export const SMITHING_APPAREL_ITEMS267:readonly SmithingApparel267[]=Object.freeze(ARMOR_STUFFS267.flatMap(stuff=>[`${stuff}-plate-armor` as SmithingApparel267,...stuff==='wood'?[]:[`${stuff}-simple-helmet` as SmithingApparel267]]));
export const isSmithingApparel267=(value:unknown):value is SmithingApparel267=>typeof value==='string'&&(SMITHING_APPAREL_ITEMS267 as readonly string[]).includes(value);
export const smithingApparelStuff267=(item:SmithingApparel267):ArmorStuff267=>item.slice(0,item.endsWith('-plate-armor')?-12:-14) as ArmorStuff267;
export const smithingApparelUnits267=(item:SmithingApparel267):number=>(item.endsWith('-plate-armor')?170:40)*(['silver','gold'].includes(smithingApparelStuff267(item))?10:1);
export const smithingApparelWorkCore267=(item:SmithingApparel267):number=>(item.endsWith('-plate-armor')?38000:3200)*ARMOR_STUFF_DEFINITIONS267[smithingApparelStuff267(item)].work;
export const smithingApparelMass267=(item:SmithingApparel267):number=>item.endsWith('-plate-armor')?15000:2000;
/** Unrounded base: quality and HP price curves must precede round-to-five. */
export function smithingApparelBaseValue267(item:SmithingApparel267):number {
 const stuff=ARMOR_STUFF_DEFINITIONS267[smithingApparelStuff267(item)];
 return smithingApparelUnits267(item)*stuff.price+smithingApparelWorkCore267(item)*.0036;
}
function definition(item:SmithingApparel267){
 const stuff=smithingApparelStuff267(item),s=ARMOR_STUFF_DEFINITIONS267[stuff],plate=item.endsWith('-plate-armor'),factor=plate?.9:.5;
 return Object.freeze({label:`${plate?'Armure de plaques':'Casque simple'} en ${s.label}`,hitPoints:plate?plateHp[stuff]:helmetHp[stuff as ArmorMetal267],equipTicks:plate?90:9,color:s.color,
  coverage:plate?apparelCoverage(['middle','shell'],['torso','neck','shoulders','arms','legs']):apparelCoverage(['headgear'],['upper-head']),
  ratings:Object.freeze({sharp:f(f(s.sharp)*f(factor)),blunt:f(f(s.blunt)*f(factor)),heat:f(f(s.heat)*f(factor))}),moveOffset:plate?-.8:0,stuff,
  coldInsulation:plate?s.cold:f(f(s.cold)*f(.15)),heatInsulation:0});
}
export const SMITHING_APPAREL_DEFINITIONS267=Object.freeze(Object.fromEntries(SMITHING_APPAREL_ITEMS267.map(item=>[item,definition(item)]))) as Readonly<Record<SmithingApparel267,ReturnType<typeof definition>>>;
export const SMITHING_APPAREL_ITEM_DEFINITIONS267=Object.freeze(Object.fromEntries(SMITHING_APPAREL_ITEMS267.map(item=>[item,Object.freeze({label:SMITHING_APPAREL_DEFINITIONS267[item].label,kind:'apparel' as const,stackLimit:1,nutrition:0,maxIngest:0,color:SMITHING_APPAREL_DEFINITIONS267[item].color})]))) as Readonly<Record<SmithingApparel267,Readonly<{label:string;kind:'apparel';stackLimit:1;nutrition:0;maxIngest:0;color:number}>>>;
