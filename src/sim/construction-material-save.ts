import { constructionRecipe, validConstructionMaterial } from './construction-materials.ts';
import type { World } from './types.ts';

/** Runs after collection shapes, before any planner-based order validation. */
export function validateConstructionMaterials(world:World,version:number):string[] {
  const errors:string[]=[];
  for(const entity of [...world.jobs,...world.structures,...(world.packed??[]).map(p=>p.building)]) {
    if(['grave','lay-floor','remove-floor'].includes(entity.kind)&&(version<89||entity.material!==undefined))errors.push('Terrain work requires V89 without a building material.');
    if(['fueled-stove','electric-stove','butcher-table'].includes(entity.kind)&&(version<84||entity.material!==(entity.kind==='butcher-table'?'wood':'steel')||entity.footprint!=='standard'))errors.push('Food workstation requires V84 and its fixed material.');
    if(entity.kind==='cooler'&&(version<75||entity.material!=='steel'||entity.footprint!=='standard'))errors.push('Cooler requires V75 and steel.');
    if(entity.kind==='passive-cooler'&&(version<40||entity.material!=='wood'||entity.orientation!==0))errors.push('Passive cooler requires V40, wood and fixed orientation.');
    if(entity.kind==='door'&&(version<34||entity.material===undefined))errors.push('Door requires V34 and an explicit material.');
    if((entity.kind==='research-bench'||entity.kind==='tailor-bench')&&(version<73||entity.material===undefined))errors.push('Research and tailoring benches require V73 and explicit materials.');
    if(entity.kind==='machining-table'&&(version<101||entity.material!=='steel'))errors.push('Machining table requires V101 and steel.');
    if(entity.kind==='art-bench'&&(version<104||entity.material!=='wood'&&entity.material!=='steel'))errors.push('Art bench requires V104 and wood or steel.');
    if((entity.kind==='small-sculpture'||entity.kind==='large-sculpture')&&(version<104||!validConstructionMaterial(entity.kind,entity.material,version)||entity.orientation!==0||entity.footprint!=='standard'))errors.push('Sculpture requires V104, its material and fixed orientation.');
    if(entity.kind==='electric-tailor-bench'&&(version<90||entity.material===undefined))errors.push('Electric tailoring bench requires V90 and explicit materials.');
    if(entity.kind==='stonecutter'&&(version<31||entity.material===undefined))errors.push('Stonecutter requires V31 and an explicit material.');
    if(entity.material!==undefined&&(version<30||!validConstructionMaterial(entity.kind,entity.material,version)||entity.footprint==='legacy-single'))errors.push('Invalid or future construction material.');
  }
  if(world.jobs.some(job=>job.kind==='small-sculpture'||job.kind==='large-sculpture'))errors.push('Sculptures cannot be construction jobs.');
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
