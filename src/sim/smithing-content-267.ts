/** Pure Core smithing catalogue. No item/runtime imports: items and recipes
 * consume this authority without forming a production initialization cycle. */
export const SMITHING_MATERIALS_267=['wood','steel','plasteel','uranium','silver','gold'] as const;
export type SmithingMaterial267=typeof SMITHING_MATERIALS_267[number];
export type SmithingMetal267=Exclude<SmithingMaterial267,'wood'>;
export type SmithingRecipe267='make-plate-armor'|'make-simple-helmet';
export type SmithingProduct267=`${SmithingMaterial267}-plate-armor`|`${SmithingMetal267}-simple-helmet`;
export type SmithingWorkpiece267='unfinished-plate-armor'|'unfinished-simple-helmet';
const metals=SMITHING_MATERIALS_267.filter((m):m is SmithingMetal267=>m!=='wood');
export const SMITHING_PRODUCTS_267:readonly SmithingProduct267[]=Object.freeze([
 ...SMITHING_MATERIALS_267.map(m=>`${m}-plate-armor` as const),...metals.map(m=>`${m}-simple-helmet` as const),
]);
export const isSmithingRecipe267=(v:unknown):v is SmithingRecipe267=>v==='make-plate-armor'||v==='make-simple-helmet';
export const isSmithingMaterial267=(v:unknown):v is SmithingMaterial267=>typeof v==='string'&&(SMITHING_MATERIALS_267 as readonly string[]).includes(v);
export const isSmithingProduct267=(v:unknown):v is SmithingProduct267=>typeof v==='string'&&(SMITHING_PRODUCTS_267 as readonly string[]).includes(v);
export const isSmithingWorkpiece267=(v:unknown):v is SmithingWorkpiece267=>v==='unfinished-plate-armor'||v==='unfinished-simple-helmet';
export const smithingMaterials267=(recipe:SmithingRecipe267):readonly SmithingMaterial267[]=>recipe==='make-plate-armor'?SMITHING_MATERIALS_267:metals;
export const smithingMaterialAllowed267=(recipe:SmithingRecipe267,material:unknown):material is SmithingMaterial267=>isSmithingMaterial267(material)&&(recipe==='make-plate-armor'||material!=='wood');
export const smithingInitialMaterial267=(material:SmithingMaterial267):boolean=>material==='wood'||material==='steel';
export const smithingWorkpiece267=(recipe:SmithingRecipe267):SmithingWorkpiece267=>recipe==='make-plate-armor'?'unfinished-plate-armor':'unfinished-simple-helmet';
export const smithingUnits267=(recipe:SmithingRecipe267,material:SmithingMaterial267):number=>(recipe==='make-plate-armor'?170:40)*(material==='silver'||material==='gold'?10:1);
export const smithingStackLimit267=(material:SmithingMaterial267):number=>material==='silver'||material==='gold'?500:75;
/** All these material-adjusted Core work totals already round to five. */
export const smithingWorkTicks267=(recipe:SmithingRecipe267,material:SmithingMaterial267):number=>(recipe==='make-plate-armor'?3800:320)*({wood:.7,steel:1,plasteel:2.2,uranium:1.9,silver:1,gold:.9}[material]);
export const smithingWorkTotal267=(recipe:SmithingRecipe267,material:SmithingMaterial267):number=>Math.round(smithingWorkTicks267(recipe,material)*10000);
export function smithingProduct267(recipe:SmithingRecipe267,material:SmithingMaterial267):SmithingProduct267 {
 if(!smithingMaterialAllowed267(recipe,material))throw Error('Invalid smithing material');
 return `${material}-${recipe==='make-plate-armor'?'plate-armor':'simple-helmet'}` as SmithingProduct267;
}
export function smithingMaterialFromIngredients267(recipe:SmithingRecipe267,parts:readonly {item:string;quantity:number}[]):SmithingMaterial267|undefined {
 const material=parts[0]?.item;if(!smithingMaterialAllowed267(recipe,material)||!parts.length)return;
 return parts.every(p=>p.item===material&&Number.isSafeInteger(p.quantity)&&p.quantity>0)&&parts.reduce((n,p)=>n+p.quantity,0)===smithingUnits267(recipe,material)?material:undefined;
}
