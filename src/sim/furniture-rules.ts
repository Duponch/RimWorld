import { reservedSource } from './materials.ts';
import { footprintCells } from './definitions.ts';
import { constructionObstruction, constructionSiteFree } from './construction-rules.ts';
import { deconstructionAvailable } from './deconstruction-rules.ts';
import type { Cell, Job, Pawn, Structure, World } from './types.ts';

export interface FurnitureTarget { structureId: number; kind: Structure['kind'] }
export interface PackedFurniture { building: Structure; owner: ({type:'ground'} & Cell) | {type:'pawn';pawnId:number} }
export const minifiable = (kind: string): boolean => ['heater','battery','fueled-stove','electric-stove','butcher-table','research-bench','tailor-bench','electric-tailor-bench','bed','table','table-square','table-long','stool','dining-chair','armchair','end-table','dresser','flower-pot','horseshoes','stonecutter','standing-lamp'].includes(kind);
export const packedAt = (world:World, cell:Cell) => world.packed?.find(p=>p.owner.type==='ground'&&p.owner.x===cell.x&&p.owner.z===cell.z);
export const furnitureObject = (world:World,id:number) => world.structures.find(s=>s.id===id)??world.packed?.find(p=>p.building.id===id)?.building;
export function furnitureWorkTarget(world:World,job:Job):Cell & {kind?:Job['kind']} {
  if(!job.furniture)return job;
  const source=world.structures.find(s=>s.id===job.furniture!.structureId);
  if(source)return source;
  const pack=world.packed?.find(p=>p.building.id===job.furniture!.structureId);
  return pack?.owner.type==='ground'?pack.owner:{...job,kind:job.furniture.kind};
}
export function furnitureDuration(world:World,job:Job):number {
  return world.structures.some(s=>s.id===job.furniture?.structureId)?Math.ceil(200/17):job.kind==='install'?1:12;
}
export function furnitureReady(world:World,job:Job,pawn:Pawn):boolean {
  const id=job.furniture?.structureId;if(!id)return false;
  const source=world.structures.find(s=>s.id===id),pack=world.packed?.find(p=>p.building.id===id);
  if(!source&&!pack||pack?.owner.type==='pawn'&&pack.owner.pawnId!==pawn.id||reservedSource(world,id,pawn.id)>0)return false;
  if(source&&!deconstructionAvailable(world,{...job,deconstruction:{structureId:id,kind:source.kind}},pawn.id))return false;
  if(job.kind==='install') {
    const obstruction=constructionObstruction(world,job);
    if(obstruction.plant||obstruction.pile)return false;
    if(obstruction.pack)return false;
    if(!constructionSiteFree(world,job,pawn.id,obstruction))return false;
  }
  return true;
}

/** Both the plan and its still physical source expose the same intent. */
export function furnitureSourceCells(world:World,job:Job):Cell[] {
  const id=job.furniture?.structureId;if(!id)return [];
  const source=world.structures.find(s=>s.id===id);if(source)return footprintCells(source);
  const pack=world.packed.find(p=>p.building.id===id);
  return pack?.owner.type==='ground'?[pack.owner]:[];
}
export function furnitureIntentAt(world:World,cell:Cell):Job|undefined {
  const pack=packedAt(world,cell),packedJob=pack&&world.jobs.find(j=>j.furniture?.structureId===pack.building.id);
  if(packedJob)return packedJob;
  const object=world.structures.find(s=>footprintCells(s).some(c=>c.x===cell.x&&c.z===cell.z));
  return object?world.jobs.find(j=>j.furniture?.structureId===object.id):undefined;
}
