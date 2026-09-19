import { JOB_DURATION, JOB_WOOD_COST, STRUCTURE_DEFINITIONS } from './definitions.ts';
import { reservedDestination } from './materials.ts';
import type { ItemId } from './items.ts';
import type { Job, JobKind, StructureKind, World } from './types.ts';

import { BUILDING_MATERIALS, CONSTRUCTION_MATERIALS, isBlockMaterial, type ConstructionMaterial } from './building-materials.ts';
export type { ConstructionMaterial } from './building-materials.ts';
export interface ConstructionCost { item: ItemId; quantity:number }
export interface ConstructionRecipe { ingredients:readonly ConstructionCost[]; work:number; coreWork:number }
type ConstructionObject={kind:JobKind;material?:ConstructionMaterial};
// Core base work before the stuff factor, in Core ticks. Absence of material
// deliberately keeps the V1–V29 historical recipe on existing objects.
const costs:Record<StructureKind,number>={'crafting-spot':0,'wood-generator':100,'standing-lamp':20,'passive-cooler':50,door:25,stonecutter:75,wall:5,bed:45,table:28,stool:25,campfire:20,horseshoes:10};
const work:Record<StructureKind,number>={'crafting-spot':0,'wood-generator':2500,'standing-lamp':300,'passive-cooler':200,door:850,stonecutter:2000,wall:135,bed:800,table:750,stool:450,campfire:200,horseshoes:100};
const recipes=new Map<string,ConstructionRecipe>();
for(const kind of Object.keys(JOB_DURATION) as JobKind[]) {
  if(kind==='crafting-spot'){recipes.set('crafting-spot:legacy',Object.freeze({ingredients:[],work:0,coreWork:0}));continue;}
  if(kind==='wood-generator'||kind==='standing-lamp') {
    const ingredients:readonly ConstructionCost[]=kind==='wood-generator'?[{item:'steel',quantity:100},{item:'component',quantity:2}]:[{item:'steel',quantity:20}];
    recipes.set(`${kind}:steel`,Object.freeze({ingredients:Object.freeze(ingredients.map(c=>Object.freeze(c))),work:work[kind]/10,coreWork:work[kind]}));continue;
  }
  if(kind!=='stonecutter'&&kind!=='passive-cooler')recipes.set(`${kind}:legacy`,Object.freeze({ingredients:Object.freeze(JOB_WOOD_COST[kind]?[Object.freeze({item:'wood' as const,quantity:JOB_WOOD_COST[kind]})]:[]),work:JOB_DURATION[kind],coreWork:JOB_DURATION[kind]*10}));
  if(kind in STRUCTURE_DEFINITIONS)for(const material of CONSTRUCTION_MATERIALS) {
    if((kind==='campfire'||kind==='passive-cooler')&&material!=='wood'||kind==='stonecutter'&&isBlockMaterial(material))continue;
    const k=kind as StructureKind;
    const stats=BUILDING_MATERIALS[material];
    const coreWork=Math.round(k==='campfire'||k==='passive-cooler'?work[k]:work[k]*stats.workFactor+stats.workOffset);
    const amounts=new Map<ConstructionMaterial,number>([[material,costs[k]]]);
    if(k==='stonecutter')amounts.set('steel',(amounts.get('steel')??0)+30);
    const ingredients=Object.freeze([...amounts].map(([item,quantity])=>Object.freeze({item,quantity})));
    recipes.set(`${kind}:${material}`,Object.freeze({ingredients,work:Math.ceil(coreWork/10),coreWork}));
  }
}
export function validConstructionMaterial(kind:unknown,material:unknown,version=42):boolean {
  if(kind==='crafting-spot')return material===undefined;
  if(kind==='wood-generator'||kind==='standing-lamp')return version>=42&&material==='steel';
  if(kind==='passive-cooler')return version>=40&&material==='wood';
  return material===undefined||typeof kind==='string'&&typeof material==='string'&&(CONSTRUCTION_MATERIALS as readonly string[]).includes(material)&&(version>=33||!isBlockMaterial(material))&&recipes.has(`${kind}:${material}`);
}
export const constructionMaterials=(kind:string):readonly ConstructionMaterial[]=>CONSTRUCTION_MATERIALS.filter(material=>validConstructionMaterial(kind,material));
export function constructionRecipe(entity:ConstructionObject):ConstructionRecipe {
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
