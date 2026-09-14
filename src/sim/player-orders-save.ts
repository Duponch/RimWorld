import { MAX_QUEUED_ORDERS } from './player-orders.ts';
import type { World } from './types.ts';
import { CARRY_CAPACITY } from './definitions.ts';
import { queuedHaulReason } from './player-hauling.ts';

export function initializePlayerOrders(world:World):void {
  (world as {schemaVersion:number}).schemaVersion=17;
  for(const pawn of world.pawns)pawn.orders={active:null,queue:[]};
}
export function validatePlayerOrders(world:World,version:number,shapesOnly=false):string[] {
  const errors:string[]=[],reserved=new Set<number>();
  const jobs=new Map(world.jobs.map(j=>[j.id,j]));
  for(const pawn of world.pawns) {
    const orders=pawn.orders;
    if(version<17){if(orders!==undefined)errors.push('Legacy save contains player orders.');continue;}
    if(!orders||typeof orders!=='object'||Array.isArray(orders)||!(orders.active===null||typeof orders.active==='number'&&Number.isSafeInteger(orders.active)&&orders.active>0||version>=18&&orders.active==='haul')
      ||!Array.isArray(orders.queue)||orders.queue.length>MAX_QUEUED_ORDERS||orders.queue.some(id=>typeof id==='number'?!Number.isSafeInteger(id)||id<1:version<18||!validQueuedHaul(id))) {
      errors.push('Invalid player order state.');continue;
    }
    if(orders.active==='haul'?!pawn.haul||!['job','stockpile'].includes(pawn.haul.destination.type):orders.active!==null&&orders.active!==pawn.jobId)errors.push('Active order has no matching job.');
    for(const id of orders.queue) {
      if(typeof id!=='number')continue;
      const job=jobs.get(id);
      if(reserved.has(id)||id===pawn.jobId)errors.push('Duplicate queued order reservation.');
      reserved.add(id);
      if(!job||job.reservedBy!==pawn.id||job.status!=='active')errors.push('Queued order reservation mismatch.');
    }
  }
  // Only inspect cross-references after every queue has passed its shape check.
  if(!shapesOnly&&!errors.length&&version>=18)for(const pawn of world.pawns)for(const task of pawn.orders.queue)if(typeof task!=='number'&&queuedHaulReason(world,task))errors.push('Invalid queued haul reservation.');
  return errors;
}
function validQueuedHaul(value:unknown):boolean {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const t=value as Record<string,unknown>,d=t.destination as Record<string,unknown>;
  const id=(x:unknown)=>typeof x==='number'&&Number.isSafeInteger(x)&&x>0;
  if(Object.keys(t).some(k=>!['sourcePileId','quantity','phase','destination','carryPileId'].includes(k))||!id(t.sourcePileId)||!id(t.quantity)||(t.quantity as number)>CARRY_CAPACITY||t.phase!=='pickup'||t.carryPileId!==null||!d||typeof d!=='object'||Array.isArray(d))return false;
  return d.type==='stockpile'?id(d.stockpileId)&&Object.keys(d).every(k=>['type','stockpileId'].includes(k))
    :d.type==='job'&&id(d.jobId)&&(d.forConstruction===undefined||typeof d.forConstruction==='boolean')&&Object.keys(d).every(k=>['type','jobId','forConstruction'].includes(k));
}
