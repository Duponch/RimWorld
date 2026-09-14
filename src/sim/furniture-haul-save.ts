import { haulingWork } from './haul-aside.ts';
import { furnitureHaulValid } from './furniture-haul-rules.ts';
import type { Pawn, World } from './types.ts';

export function validateFurnitureHaul(world:World,pawn:Pawn):string[] {
  const task=pawn.haul!;
  if(!pawn.priorities[haulingWork(task.destination)]&&pawn.orders.active!=='haul')return ['Whole furniture haul has disabled work.'];
  if(task.quantity!==1||task.serviceProgress!==undefined||!['stockpile','aside'].includes(task.destination.type)
    ||!furnitureHaulValid(world,task,pawn.id))return ['Invalid whole furniture transport or reservation.'];
  return [];
}
