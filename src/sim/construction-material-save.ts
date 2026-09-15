import { constructionRecipe, validConstructionMaterial } from './construction-materials.ts';
import type { World } from './types.ts';

/** Runs after collection shapes, before any planner-based order validation. */
export function validateConstructionMaterials(world:World,version:number):string[] {
  const errors:string[]=[];
  for(const entity of [...world.jobs,...world.structures,...(world.packed??[]).map(p=>p.building)]) {
    if(entity.kind==='passive-cooler'&&(version<40||entity.material!=='wood'||entity.orientation!==0))errors.push('Passive cooler requires V40, wood and fixed orientation.');
    if(entity.kind==='door'&&(version<34||entity.material===undefined))errors.push('Door requires V34 and an explicit material.');
    if(entity.kind==='stonecutter'&&(version<31||entity.material===undefined))errors.push('Stonecutter requires V31 and an explicit material.');
    if(entity.material!==undefined&&(version<30||!validConstructionMaterial(entity.kind,entity.material,version)||entity.footprint==='legacy-single'))errors.push('Invalid or future construction material.');
  }
  // V2–V4 do not have ItemId; their kind/escrow checks remain in validateSchema.
  if(errors.length||version<5)return errors;
  const delivered=new Map<number,Map<string,number>>();
  for(const p of world.piles)if(p.owner.type==='job') {
    const amounts=delivered.get(p.owner.jobId)??new Map<string,number>();amounts.set(p.item,(amounts.get(p.item)??0)+p.quantity);delivered.set(p.owner.jobId,amounts);
  }
  for(const job of world.jobs)for(const [item,quantity] of delivered.get(job.id)??[]) {
    if(quantity>(constructionRecipe(job).ingredients.find(c=>c.item===item)?.quantity??0))errors.push('Unrequested or excess construction material.');
    if(job.construction==='blueprint')errors.push('Blueprint already contains construction materials.');
  }
  return errors;
}
