import { MAX_QUEUED_ORDERS } from './player-orders.ts';
import type { World } from './types.ts';

export function initializePlayerOrders(world:World):void {
  world.schemaVersion=17;
  for(const pawn of world.pawns)pawn.orders={active:null,queue:[]};
}
export function validatePlayerOrders(world:World,version:number):string[] {
  const errors:string[]=[],reserved=new Set<number>();
  const jobs=new Map(world.jobs.map(j=>[j.id,j]));
  for(const pawn of world.pawns) {
    const orders=pawn.orders;
    if(version<17){if(orders!==undefined)errors.push('Legacy save contains player orders.');continue;}
    if(!orders||typeof orders!=='object'||Array.isArray(orders)||!(orders.active===null||Number.isSafeInteger(orders.active)&&orders.active>0)
      ||!Array.isArray(orders.queue)||orders.queue.length>MAX_QUEUED_ORDERS||orders.queue.some(id=>!Number.isSafeInteger(id)||id<1)) {
      errors.push('Invalid player order state.');continue;
    }
    if(orders.active!==null&&orders.active!==pawn.jobId)errors.push('Active order has no matching job.');
    for(const id of orders.queue) {
      const job=jobs.get(id);
      if(reserved.has(id)||id===pawn.jobId)errors.push('Duplicate queued order reservation.');
      reserved.add(id);
      if(!job||job.reservedBy!==pawn.id||job.status!=='active')errors.push('Queued order reservation mismatch.');
    }
  }
  return errors;
}
