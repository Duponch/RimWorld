/** Core1.6.4871rev590, Metallic/Woody mace catalogue. Pure content shared by
 * production, equipment and presentation; no runtime item/recipe imports. */
export const MACE_MATERIALS_269=['wood','steel','plasteel','uranium','silver','gold'] as const;
export type MaceMaterial269=typeof MACE_MATERIALS_269[number];
export type MaceItem269=`${MaceMaterial269}-mace`;
export const MACE_ITEMS_269:readonly MaceItem269[]=Object.freeze(MACE_MATERIALS_269.map(m=>`${m}-mace` as const));
export const isMaceItem269=(value:unknown):value is MaceItem269=>typeof value==='string'&&(MACE_ITEMS_269 as readonly string[]).includes(value);
export const maceMaterial269=(item:MaceItem269):MaceMaterial269=>item.slice(0,-5) as MaceMaterial269;
export const maceItem269=(material:MaceMaterial269):MaceItem269=>`${material}-mace`;
export const MACE_DEFINITIONS_269=Object.freeze({
 wood:Object.freeze({label:'bois',color:0xa48762,hitPoints:65,units:50,workTicks:420,price:1.2,bluntMultiplier:.9,cooldownMultiplier:1,flammability:1}),
 steel:Object.freeze({label:'acier',color:0x87958f,hitPoints:100,units:50,workTicks:600,price:1.9,bluntMultiplier:1,cooldownMultiplier:1,flammability:.4}),
 plasteel:Object.freeze({label:'plastacier',color:0xa0b2b5,hitPoints:280,units:50,workTicks:1320,price:9,bluntMultiplier:.9,cooldownMultiplier:.8,flammability:0}),
 uranium:Object.freeze({label:'uranium',color:0x718c75,hitPoints:250,units:50,workTicks:1140,price:6,bluntMultiplier:1.5,cooldownMultiplier:1.1,flammability:0}),
 silver:Object.freeze({label:'argent',color:0xc5cbcd,hitPoints:70,units:500,workTicks:600,price:1,bluntMultiplier:1,cooldownMultiplier:1,flammability:.4}),
 gold:Object.freeze({label:'or',color:0xd5b66f,hitPoints:60,units:500,workTicks:540,price:10,bluntMultiplier:1,cooldownMultiplier:1,flammability:.4}),
});
export const maceLabel269=(item:MaceItem269):string=>`Masse en ${MACE_DEFINITIONS_269[maceMaterial269(item)].label}`;
export const maceColor269=(item:MaceItem269):number=>MACE_DEFINITIONS_269[maceMaterial269(item)].color;
export const maceMaxHitPoints269=(item:MaceItem269):number=>MACE_DEFINITIONS_269[maceMaterial269(item)].hitPoints;
export const maceUnits269=(material:MaceMaterial269):number=>MACE_DEFINITIONS_269[material].units;
export const maceWorkTicks269=(material:MaceMaterial269):number=>MACE_DEFINITIONS_269[material].workTicks;
export const maceWorkTotal269=(material:MaceMaterial269):number=>maceWorkTicks269(material)*10000;
/** Quality/HP and the final price rounding are applied by the caller. */
export const maceBaseValue269=(item:MaceItem269):number=>{const m=maceMaterial269(item);return maceUnits269(m)*MACE_DEFINITIONS_269[m].price+maceWorkTicks269(m)*10*.0036;};
export const MACE_ITEM_DEFINITIONS_269=Object.freeze(Object.fromEntries(MACE_ITEMS_269.map(item=>[item,Object.freeze({label:maceLabel269(item),kind:'weapon' as const,stackLimit:1,nutrition:0,maxIngest:0,color:maceColor269(item)})]))) as Readonly<Record<MaceItem269,Readonly<{label:string;kind:'weapon';stackLimit:1;nutrition:0;maxIngest:0;color:number}>>>;
