import { footprintCells, MAX_STACK } from './definitions.ts';
import { groundCapacity, groundPile } from './ground-placement.ts';
import { packedAt } from './furniture-rules.ts';
import { reservedSource } from './materials.ts';
import { validSowingClearance } from './sowing-clearance.ts';
import { storageOccupancyAllows } from './occupancy.ts';
import type { Cell, HaulDestination, HaulTask, World } from './types.ts';

export function furnitureHaulCell(world:World,d:HaulDestination):Cell|undefined {
  return d.type==='aside'?d:d.type==='stockpile'?world.stockpiles.find(z=>z.id===d.stockpileId):undefined;
}
/** A package owns the entire floor slot, including against incoming material. */
export function furnitureSlot(world:World,c:Cell,exceptPawn?:number):boolean {
  return !groundPile(world,c)&&!packedAt(world,c)&&groundCapacity(world,c,'wood',exceptPawn)===MAX_STACK;
}
export function furnitureAsideAllowed(world:World,c:Cell,exceptPawn?:number):boolean {
  if(world.resources.some(r=>r.x===c.x&&r.z===c.z)||world.growingZones.some(z=>z.cells.includes(c.z*world.width+c.x))
    ||world.jobs.some(j=>footprintCells(j).some(p=>p.x===c.x&&p.z===c.z)))return false;
  const zone=world.stockpiles.find(z=>z.x===c.x&&z.z===c.z);
  return (!zone||zone.filters.furniture===true&&storageOccupancyAllows(world,c))&&furnitureSlot(world,c,exceptPawn);
}
export function furnitureHaulValid(world:World,task:HaulTask,pawnId?:number):boolean {
  if(!task.whole||task.quantity!==1)return false;
  const pack=world.packed.find(p=>p.building.id===task.sourcePileId),d=task.destination,c=furnitureHaulCell(world,d);
  if(!pack||!c||world.jobs.some(j=>j.furniture?.structureId===pack.building.id))return false;
  if(task.phase==='pickup') {
    if(pack.owner.type!=='ground'||task.carryPileId!==null||reservedSource(world,pack.building.id,pawnId)>0||pack.owner.x===c.x&&pack.owner.z===c.z)return false;
  } else if(pack.owner.type!=='pawn'||pack.owner.pawnId!==pawnId||task.carryPileId!==pack.building.id)return false;
  if(d.type==='stockpile') {
    const zone=world.stockpiles.find(z=>z.id===d.stockpileId);
    return zone?.filters.furniture===true&&storageOccupancyAllows(world,c)&&furnitureSlot(world,c,pawnId);
  }
  if(d.type!=='aside'||!validSowingClearance(world,d)||d.constructionId!==undefined&&!world.jobs.some(j=>j.id===d.constructionId))return false;
  return furnitureAsideAllowed(world,c,pawnId);
}
