import { JOB_DURATION, JOB_WOOD_COST, STRUCTURE_DEFINITIONS } from './definitions.ts';
import { reservedDestination } from './materials.ts';
import type { ItemId } from './items.ts';
import type { Job, JobKind, StructureKind, World } from './types.ts';
import { flooringRecipe,type FloorKind } from './flooring.ts';
import { FURNITURE_DEFINITIONS,isHabitatFurnitureKind } from './furniture-stats.ts';
import { powerConstructionSkill } from './power-construction.ts';

import { BUILDING_MATERIALS, CONSTRUCTION_MATERIALS, isBlockMaterial,isUpholsteryMaterial, type ConstructionMaterial } from './building-materials.ts';
export type { ConstructionMaterial } from './building-materials.ts';
export interface ConstructionCost { item: ItemId; quantity:number }
export interface ConstructionRecipe { ingredients:readonly ConstructionCost[]; work:number; coreWork:number }
type ConstructionObject={kind:JobKind;material?:ConstructionMaterial;floor?:FloorKind};
// Core base work before the stuff factor, in Core ticks. Absence of material
// deliberately keeps the V1–V29 historical recipe on existing objects.
const costs:Record<StructureKind,number>={grave:0,heater:50,'wind-turbine':100,'power-conduit':1,'power-switch':15,battery:70,'solar-generator':100,'fueled-stove':80,'electric-stove':80,'butcher-table':95,'butcher-spot':0,cooler:90,'research-bench':75,'tailor-bench':75,'electric-tailor-bench':75,'crafting-spot':0,'wood-generator':100,'standing-lamp':20,'passive-cooler':50,door:25,stonecutter:75,wall:5,bed:45,table:28,'table-square':50,'table-long':95,stool:25,'dining-chair':45,armchair:110,'end-table':30,dresser:50,'flower-pot':20,campfire:20,horseshoes:10};
const work:Record<StructureKind,number>={grave:800,heater:1000,'wind-turbine':3300,'power-conduit':35,'power-switch':200,battery:800,'solar-generator':2500,'fueled-stove':2000,'electric-stove':2000,'butcher-table':2000,'butcher-spot':0,cooler:1600,'research-bench':2800,'tailor-bench':2000,'electric-tailor-bench':2500,'crafting-spot':0,'wood-generator':2500,'standing-lamp':300,'passive-cooler':200,door:850,stonecutter:2000,wall:135,bed:800,table:750,'table-square':1500,'table-long':3000,stool:450,'dining-chair':8000,armchair:14000,'end-table':1000,dresser:2000,'flower-pot':250,campfire:200,horseshoes:100};
const recipes=new Map<string,ConstructionRecipe>();
for(const kind of Object.keys(JOB_DURATION) as JobKind[]) {
  if(kind==='lay-floor'||kind==='remove-floor')continue;
  if(kind==='grave'){recipes.set('grave:legacy',Object.freeze({ingredients:[],work:80,coreWork:800}));continue;}
  if(kind==='heater'||kind==='wind-turbine'||kind==='power-conduit'||kind==='power-switch'||kind==='battery'||kind==='solar-generator'){
    const components=kind==='heater'?1:kind==='wind-turbine'?2:kind==='power-switch'?1:kind==='battery'?2:kind==='solar-generator'?3:0;
    const ingredients:ConstructionCost[]=[{item:'steel',quantity:costs[kind]},...(components?[{item:'component' as const,quantity:components}]:[])];
    recipes.set(`${kind}:steel`,Object.freeze({ingredients:Object.freeze(ingredients.map(c=>Object.freeze(c))),work:work[kind]/10,coreWork:work[kind]}));continue;
  }
  if(kind==='fueled-stove'||kind==='electric-stove'||kind==='butcher-table'){
    const material=kind==='butcher-table'?'wood':'steel';
    const ingredients:ConstructionCost[]=[{item:material,quantity:costs[kind]},...(kind==='electric-stove'?[{item:'component' as const,quantity:2}]:[])];
    const coreWork=work[kind]*BUILDING_MATERIALS[material].workFactor;
    recipes.set(`${kind}:${material}`,Object.freeze({ingredients:Object.freeze(ingredients.map(c=>Object.freeze(c))),work:coreWork/10,coreWork}));continue;
  }
  if(kind==='electric-tailor-bench')for(const material of ['wood','steel'] as const){const amounts=new Map<ConstructionMaterial,number>([[material,75],['steel',50]]);const ingredients:ConstructionCost[]=[...amounts].map(([item,quantity])=>Object.freeze({item,quantity}));ingredients.push(Object.freeze({item:'component',quantity:2}));const stats=BUILDING_MATERIALS[material],coreWork=Math.round(work[kind]*stats.workFactor+stats.workOffset);recipes.set(`${kind}:${material}`,Object.freeze({ingredients:Object.freeze(ingredients),work:Math.ceil(coreWork/10),coreWork}));}
  if(kind==='crafting-spot'||kind==='butcher-spot'){recipes.set(`${kind}:legacy`,Object.freeze({ingredients:[],work:0,coreWork:0}));continue;}
  if(kind==='cooler'||kind==='wood-generator'||kind==='standing-lamp') {
    const ingredients:readonly ConstructionCost[]=kind==='cooler'?[{item:'steel',quantity:90},{item:'component',quantity:3}]:kind==='wood-generator'?[{item:'steel',quantity:100},{item:'component',quantity:2}]:[{item:'steel',quantity:20}];
    recipes.set(`${kind}:steel`,Object.freeze({ingredients:Object.freeze(ingredients.map(c=>Object.freeze(c))),work:work[kind]/10,coreWork:work[kind]}));continue;
  }
  if(kind!=='research-bench'&&kind!=='tailor-bench'&&kind!=='electric-tailor-bench'&&kind!=='stonecutter'&&kind!=='passive-cooler'&&kind!=='armchair')recipes.set(`${kind}:legacy`,Object.freeze({ingredients:Object.freeze(JOB_WOOD_COST[kind]?[Object.freeze({item:'wood' as const,quantity:JOB_WOOD_COST[kind]})]:[]),work:JOB_DURATION[kind],coreWork:JOB_DURATION[kind]*10}));
  if(kind in STRUCTURE_DEFINITIONS)for(const material of CONSTRUCTION_MATERIALS) {
    if(kind==='electric-tailor-bench'||kind==='armchair'&&!isUpholsteryMaterial(material)||kind!=='armchair'&&isUpholsteryMaterial(material)||(kind==='campfire'||kind==='passive-cooler')&&material!=='wood'||(kind==='stonecutter'||kind==='tailor-bench')&&isBlockMaterial(material)||kind==='dining-chair'&&isBlockMaterial(material))continue;
    const k=kind as StructureKind;
    const stats=BUILDING_MATERIALS[material];
    const coreWork=Math.round(k==='campfire'||k==='passive-cooler'?work[k]:work[k]*stats.workFactor+stats.workOffset);
    const amounts=new Map<ConstructionMaterial,number>([[material,costs[k]]]);
    if(k==='research-bench')amounts.set('steel',(amounts.get('steel')??0)+25);
    if(k==='stonecutter')amounts.set('steel',(amounts.get('steel')??0)+30);
    const ingredients=Object.freeze([...amounts].map(([item,quantity])=>Object.freeze({item,quantity})));
    recipes.set(`${kind}:${material}`,Object.freeze({ingredients,work:Math.ceil(coreWork/10),coreWork}));
  }
}
export function validConstructionMaterial(kind:unknown,material:unknown,version=90):boolean {
  if(kind==='grave'||kind==='lay-floor'||kind==='remove-floor')return version>=89&&material===undefined;
  if(kind==='heater'||kind==='wind-turbine')return version>=87&&material==='steel';
  if(kind==='power-conduit'||kind==='power-switch'||kind==='battery'||kind==='solar-generator')return version>=85&&material==='steel';
  if(kind==='fueled-stove'||kind==='electric-stove'||kind==='butcher-table')return version>=84&&material===(kind==='butcher-table'?'wood':'steel');
  if(kind==='cooler')return version>=75&&material==='steel';
  if(kind==='research-bench'||kind==='tailor-bench')return version>=73&&typeof material==='string'&&recipes.has(`${kind}:${material}`);
  if(kind==='electric-tailor-bench'||kind==='armchair'||kind==='dining-chair'||kind==='end-table'||kind==='dresser'||kind==='table-square'||kind==='table-long'||kind==='flower-pot')return version>=90&&typeof material==='string'&&recipes.has(`${kind}:${material}`);
  if(kind==='crafting-spot')return material===undefined;
  if(kind==='wood-generator'||kind==='standing-lamp')return version>=42&&material==='steel';
  if(kind==='passive-cooler')return version>=40&&material==='wood';
  return material===undefined||typeof kind==='string'&&typeof material==='string'&&(CONSTRUCTION_MATERIALS as readonly string[]).includes(material)&&(version>=33||!isBlockMaterial(material))&&recipes.has(`${kind}:${material}`);
}
export const constructionMaterials=(kind:string):readonly ConstructionMaterial[]=>CONSTRUCTION_MATERIALS.filter(material=>validConstructionMaterial(kind,material));
export const constructionSkillRequired=(kind:unknown):number=>kind==='cooler'?5:kind==='electric-stove'||kind==='electric-tailor-bench'?4:isHabitatFurnitureKind(kind)?FURNITURE_DEFINITIONS[kind].constructionSkill:powerConstructionSkill(kind as JobKind);
export function constructionRecipe(entity:ConstructionObject):ConstructionRecipe {
  if(entity.kind==='lay-floor'||entity.kind==='remove-floor')return flooringRecipe(entity.floor,entity.kind==='remove-floor');
  return recipes.get(`${entity.kind}:${entity.material??'legacy'}`)!;
}
export const requiredMaterial=(entity:ConstructionObject,item:ItemId):number=>constructionRecipe(entity).ingredients.find(c=>c.item===item)?.quantity??0;
export function deliveredMaterial(world:World,job:Job,item:ItemId):number {
  let amount=0;for(const pile of world.piles)if(pile.item===item&&pile.owner.type==='job'&&pile.owner.jobId===job.id)amount+=pile.quantity;
  return amount;
}
export function constructionSupplied(world:World,job:Job):boolean {
  return constructionRecipe(job).ingredients.every(c=>deliveredMaterial(world,job,c.item)===c.quantity);
}
export function constructionCapacity(world:World,job:Job,item:ItemId,exceptPawn?:number):number {
  return Math.max(0,requiredMaterial(job,item)-deliveredMaterial(world,job,item)-reservedDestination(world,{type:'job',jobId:job.id},exceptPawn,item));
}
