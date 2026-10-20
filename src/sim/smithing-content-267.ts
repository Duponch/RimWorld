/** Pure Core smithing catalogue. No item/runtime imports: items and recipes
 * consume this authority without forming a production initialization cycle. */
export const SMITHING_MATERIALS_267=['wood','steel','plasteel','uranium','silver','gold'] as const;
export type SmithingMaterial267=typeof SMITHING_MATERIALS_267[number];
export type SmithingMetal267=Exclude<SmithingMaterial267,'wood'>;
export type SmithingRecipe267='make-plate-armor'|'make-simple-helmet'|'make-plasteel-knife';
export type SmithingProduct267=`${SmithingMaterial267}-plate-armor`|`${SmithingMetal267}-simple-helmet`;
export type SmithingOutput267=SmithingProduct267|'plasteel-knife';
export type SmithingWorkpiece267='unfinished-plate-armor'|'unfinished-simple-helmet'|'unfinished-knife';
const metals=SMITHING_MATERIALS_267.filter((m):m is SmithingMetal267=>m!=='wood');
export const SMITHING_PRODUCTS_267:readonly SmithingProduct267[]=Object.freeze([
 ...SMITHING_MATERIALS_267.map(m=>`${m}-plate-armor` as const),...metals.map(m=>`${m}-simple-helmet` as const),
]);
export const isSmithingRecipe267=(v:unknown):v is SmithingRecipe267=>v==='make-plate-armor'||v==='make-simple-helmet'||v==='make-plasteel-knife';
/** The knife's existing product predates V268; only its manufacture is new. */
export const smithingRecipeAvailable267=(recipe:SmithingRecipe267,version:number):boolean=>recipe==='make-plasteel-knife'?version===268:version===267||version===268;
export const isSmithingMaterial267=(v:unknown):v is SmithingMaterial267=>typeof v==='string'&&(SMITHING_MATERIALS_267 as readonly string[]).includes(v);
export const isSmithingProduct267=(v:unknown):v is SmithingProduct267=>typeof v==='string'&&(SMITHING_PRODUCTS_267 as readonly string[]).includes(v);
export const isSmithingWorkpiece267=(v:unknown):v is SmithingWorkpiece267=>v==='unfinished-plate-armor'||v==='unfinished-simple-helmet'||v==='unfinished-knife';
export const smithingMaterials267=(recipe:SmithingRecipe267):readonly SmithingMaterial267[]=>recipe==='make-plasteel-knife'?['plasteel']:recipe==='make-plate-armor'?SMITHING_MATERIALS_267:metals;
export const smithingMaterialAllowed267=(recipe:SmithingRecipe267,material:unknown):material is SmithingMaterial267=>isSmithingMaterial267(material)&&(recipe==='make-plasteel-knife'?material==='plasteel':recipe==='make-plate-armor'||material!=='wood');
export const smithingInitialMaterial267=(material:SmithingMaterial267,recipe?:SmithingRecipe267):boolean=>recipe==='make-plasteel-knife'?material==='plasteel':material==='wood'||material==='steel';
export const smithingWorkpiece267=(recipe:SmithingRecipe267):SmithingWorkpiece267=>recipe==='make-plasteel-knife'?'unfinished-knife':recipe==='make-plate-armor'?'unfinished-plate-armor':'unfinished-simple-helmet';
export const smithingUnits267=(recipe:SmithingRecipe267,material:SmithingMaterial267):number=>(recipe==='make-plasteel-knife'?30:recipe==='make-plate-armor'?170:40)*(material==='silver'||material==='gold'?10:1);
export const smithingStackLimit267=(material:SmithingMaterial267):number=>material==='silver'||material==='gold'?500:75;
/** All these material-adjusted Core work totals already round to five. */
export const smithingWorkTicks267=(recipe:SmithingRecipe267,material:SmithingMaterial267):number=>(recipe==='make-plasteel-knife'?180:recipe==='make-plate-armor'?3800:320)*({wood:.7,steel:1,plasteel:2.2,uranium:1.9,silver:1,gold:.9}[material]);
export const smithingWorkTotal267=(recipe:SmithingRecipe267,material:SmithingMaterial267):number=>Math.round(smithingWorkTicks267(recipe,material)*10000);
export function smithingProduct267(recipe:SmithingRecipe267,material:SmithingMaterial267):SmithingOutput267 {
 if(!smithingMaterialAllowed267(recipe,material))throw Error('Invalid smithing material');
 if(recipe==='make-plasteel-knife')return 'plasteel-knife';
 return `${material}-${recipe==='make-plate-armor'?'plate-armor':'simple-helmet'}` as SmithingProduct267;
}
export function smithingMaterialFromIngredients267(recipe:SmithingRecipe267,parts:readonly {item:string;quantity:number}[]):SmithingMaterial267|undefined {
 const material=parts[0]?.item;if(!smithingMaterialAllowed267(recipe,material)||!parts.length)return;
 return parts.every(p=>p.item===material&&Number.isSafeInteger(p.quantity)&&p.quantity>0)&&parts.reduce((n,p)=>n+p.quantity,0)===smithingUnits267(recipe,material)?material:undefined;
}
