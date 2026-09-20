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
const costs:Record<StructureKind,number>={'fueled-stove':80,'electric-stove':80,'butcher-table':95,'butcher-spot':0,cooler:90,'research-bench':75,'tailor-bench':75,'crafting-spot':0,'wood-generator':100,'standing-lamp':20,'passive-cooler':50,door:25,stonecutter:75,wall:5,bed:45,table:28,stool:25,campfire:20,horseshoes:10};
const work:Record<StructureKind,number>={'fueled-stove':2000,'electric-stove':2000,'butcher-table':2000,'butcher-spot':0,cooler:1600,'research-bench':2800,'tailor-bench':2000,'crafting-spot':0,'wood-generator':2500,'standing-lamp':300,'passive-cooler':200,door:850,stonecutter:2000,wall:135,bed:800,table:750,stool:450,campfire:200,horseshoes:100};
const recipes=new Map<string,ConstructionRecipe>();
for(const kind of Object.keys(JOB_DURATION) as JobKind[]) {
  if(kind==='fueled-stove'||kind==='electric-stove'||kind==='butcher-table'){
    const material=kind==='butcher-table'?'wood':'steel';
    const ingredients:ConstructionCost[]=[{item:material,quantity:costs[kind]},...(kind==='electric-stove'?[{item:'component' as const,quantity:2}]:[])];
    const coreWork=work[kind]*BUILDING_MATERIALS[material].workFactor;
    recipes.set(`${kind}:${material}`,Object.freeze({ingredients:Object.freeze(ingredients.map(c=>Object.freeze(c))),work:coreWork/10,coreWork}));continue;
  }
  if(kind==='crafting-spot'||kind==='butcher-spot'){recipes.set(`${kind}:legacy`,Object.freeze({ingredients:[],work:0,coreWork:0}));continue;}
  if(kind==='cooler'||kind==='wood-generator'||kind==='standing-lamp') {
    const ingredients:readonly ConstructionCost[]=kind==='cooler'?[{item:'steel',quantity:90},{item:'component',quantity:3}]:kind==='wood-generator'?[{item:'steel',quantity:100},{item:'component',quantity:2}]:[{item:'steel',quantity:20}];
    recipes.set(`${kind}:steel`,Object.freeze({ingredients:Object.freeze(ingredients.map(c=>Object.freeze(c))),work:work[kind]/10,coreWork:work[kind]}));continue;
  }
  if(kind!=='research-bench'&&kind!=='tailor-bench'&&kind!=='stonecutter'&&kind!=='passive-cooler')recipes.set(`${kind}:legacy`,Object.freeze({ingredients:Object.freeze(JOB_WOOD_COST[kind]?[Object.freeze({item:'wood' as const,quantity:JOB_WOOD_COST[kind]})]:[]),work:JOB_DURATION[kind],coreWork:JOB_DURATION[kind]*10}));
  if(kind in STRUCTURE_DEFINITIONS)for(const material of CONSTRUCTION_MATERIALS) {
    if((kind==='campfire'||kind==='passive-cooler')&&material!=='wood'||(kind==='stonecutter'||kind==='tailor-bench')&&isBlockMaterial(material))continue;
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
export function validConstructionMaterial(kind:unknown,material:unknown,version=84):boolean {
  if(kind==='fueled-stove'||kind==='electric-stove'||kind==='butcher-table')return version>=84&&material===(kind==='butcher-table'?'wood':'steel');
  if(kind==='cooler')return version>=75&&material==='steel';
  if(kind==='research-bench'||kind==='tailor-bench')return version>=73&&typeof material==='string'&&recipes.has(`${kind}:${material}`);
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
