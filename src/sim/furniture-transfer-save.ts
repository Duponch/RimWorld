import { footprintCells } from './definitions.ts';
import { furnitureDuration, furnitureObject, minifiable } from './furniture-rules.ts';
import { groundOccupancyAllows } from './occupancy.ts';
import { deconstructionAvailable } from './deconstruction-rules.ts';
import type { World } from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0):v is number=>Number.isSafeInteger(v)&&Number(v)>=min;
export function validateFurniture(world:World,version:number,ids:Set<number>,shapesOnly=false):string[] {
  const errors:string[]=[];
  if(version<25) return world.packed!==undefined||world.jobs.some(j=>j.furniture!==undefined)?['Legacy save contains furniture transfers.']:[];
  if(!Array.isArray(world.packed)||world.packed.length>32768)return ['Invalid packed furniture collection.'];
  const cell=(v:Record<string,unknown>)=>integer(v.x)&&integer(v.z)&&v.x<world.width&&v.z<world.height;
  for(const pack of world.packed) {
    if(!record(pack)||!record(pack.building)||!record(pack.owner)) {errors.push('Invalid furniture package.');continue;}
    const b=pack.building,o:Record<string,unknown>=pack.owner;
    if(!integer(b.id,1)||b.id>=world.nextId||!minifiable(b.kind)||version<31&&b.kind==='stonecutter'||!cell(b)||!integer(b.orientation)||b.orientation>3||footprintCells(b).some(c=>!cell({x:c.x,z:c.z}))||!['standard','legacy-single'].includes(b.footprint)||b.footprint==='legacy-single'&&b.kind!=='bed'||b.fuel!==undefined||b.bills!==undefined)errors.push('Invalid packed building.');
    if(shapesOnly){if(ids.has(b.id))errors.push('Duplicate furniture identity.');ids.add(b.id);}
    if(Object.keys(pack).some(k=>!['building','owner'].includes(k))||Object.keys(o).some(k=>!(o.type==='ground'?['type','x','z']:['type','pawnId']).includes(k))||(o.type==='ground'?!cell(o):o.type==='pawn'?!integer(o.pawnId,1):true))errors.push('Invalid furniture owner.');
  }
  if(errors.length)return errors;
  const seen=new Set<number>();
  for(const job of world.jobs) {
    const f=job.furniture;
    if(job.installationWork!==undefined&&(version<26||job.kind!=='install'||!['build','haul'].includes(job.installationWork)||job.reservedBy===null))errors.push('Invalid installation work assignment.');
    if(!['install','uninstall'].includes(job.kind)){if(f!==undefined)errors.push('Unexpected furniture target.');continue;}
    if(!record(f)||!integer(f.structureId,1)||!minifiable(f.kind)||version<31&&f.kind==='stonecutter'||Object.keys(f).some(k=>!['structureId','kind'].includes(k))){errors.push('Invalid furniture target.');continue;}
    const source=furnitureObject(world,f.structureId);
    if(!source||source.kind!==f.kind||source.footprint!==job.footprint||seen.has(f.structureId)||job.deconstruction!==undefined||job.growingZoneId!==undefined||job.escrow.wood||job.escrow.food)errors.push('Invalid or duplicated furniture intent.');
    seen.add(f.structureId);
    if(job.kind==='install'&&job.construction!=='blueprint')errors.push('Installation must remain a blueprint.');
    if(job.kind==='uninstall'&&(!world.structures.includes(source!)||source!.x!==job.x||source!.z!==job.z||source!.orientation!==job.orientation))errors.push('Uninstall target moved.');
    if(job.progress>=furnitureDuration(world,job)||job.progress>0&&!world.pawns.some(p=>p.jobId===job.id))errors.push('Invalid furniture work progress.');
    if(!shapesOnly&&world.structures.includes(source!)&&job.reservedBy!==null&&!deconstructionAvailable(world,{...job,deconstruction:{structureId:source!.id,kind:source!.kind}},job.reservedBy))errors.push('Furniture transfer conflicts with usage.');
  }
  if(shapesOnly)return errors;
  const ground=new Set<number>(),carriers=new Set<number>();
  for(const pack of world.packed) {
    const o=pack.owner,id=pack.building.id;
    if(world.structures.some(s=>s.id===id)||world.jobs.some(j=>j.deconstruction?.structureId===id))errors.push('Packed furniture is also installed or deconstructed.');
    if(o.type==='ground') {
      const key=o.z*world.width+o.x;
      if(ground.has(key)||!groundOccupancyAllows(world,o)||world.piles.some(p=>p.owner.type==='ground'&&p.owner.x===o.x&&p.owner.z===o.z))errors.push('Furniture ground slot is occupied.');
      ground.add(key);
    } else {
      const pawn=world.pawns.find(p=>p.id===o.pawnId),job=world.jobs.find(j=>j.id===pawn?.jobId);
      if(carriers.has(o.pawnId)||!pawn||!(job?.kind==='install'&&job.furniture?.structureId===id||version>=26&&pawn?.haul?.whole&&pawn.haul.phase==='deliver'&&pawn.haul.carryPileId===id)||world.piles.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===o.pawnId))errors.push('Invalid furniture carrier.');
      carriers.add(o.pawnId);
    }
  }
  for(const j of world.jobs)if(j.kind==='install'&&world.resources.some(r=>r.kind==='rock'&&footprintCells(j).some(c=>c.x===r.x&&c.z===r.z)))errors.push('Installation overlaps a rock resource.');
  for(const j of world.jobs)if(j.kind==='install'&&world.structures.some(s=>s.id!==j.furniture?.structureId&&footprintCells(s).some(c=>footprintCells(j).some(d=>c.x===d.x&&c.z===d.z))))errors.push('Installation overlaps another building.');
  return errors;
}
