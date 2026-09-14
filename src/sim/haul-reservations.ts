import { isHaulOrder, type QueuedOrder } from './order-types.ts';
import type { HaulTask, World } from './types.ts';

/** An actor's current task can exclude itself; its waiting orders still compete
 * for quantities and typed floor capacity, including with that same actor. */
export function haulReservations(world:World, exceptPawn?:number):HaulTask[] {
  const tasks:HaulTask[]=[];
  for(const pawn of world.pawns) {
    if(pawn.id!==exceptPawn&&pawn.haul)tasks.push(pawn.haul);
    const queue=pawn.orders?.queue;
    if(queue?.length)for(const order of queue)if(isHaulOrder(order))tasks.push(order);
  }
  return tasks;
}
export function withoutQueuedOrder(world:World, task:QueuedOrder):World {
  return {...world,pawns:world.pawns.map(p=>p.orders?.queue.includes(task)
    ? {...p,orders:{...p.orders,queue:p.orders.queue.filter(o=>o!==task)}}:p)};
}
