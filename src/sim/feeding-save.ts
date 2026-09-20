import { FEED_TICKS,feedingReason,feedingPlaceValid,feedingWork } from './feeding-rules.ts';
import { reservedSource } from './materials.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import type { World } from './types.ts';

export function validFeedShape(value:unknown,version:number,w:World):boolean {
  if(version<48||!value||typeof value!=='object'||Array.isArray(value))return false;
  const t=value as Record<string,unknown>,s=t.spot as Record<string,unknown>;
  const int=(n:unknown,min:number,max=Number.MAX_SAFE_INTEGER)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
  return Object.keys(t).every(k=>['patientId','spot','sourcePileId','carryPileId','quantity','phase','progress'].includes(k))&&int(t.patientId,1)
    &&!!s&&typeof s==='object'&&!Array.isArray(s)&&Object.keys(s).every(k=>k==='x'||k==='z')&&int(s.x,0,w.width-1)&&int(s.z,0,w.height-1)
    &&int(t.sourcePileId,1,w.nextId-1)&&int(t.quantity,1,75)&&typeof t.phase==='string'&&['pickup','deliver','feed'].includes(t.phase)
    &&(t.phase==='pickup'?t.carryPileId===null:int(t.carryPileId,1,w.nextId-1))&&int(t.progress,0,FEED_TICKS-1)&&(t.phase==='feed'||t.progress===0);
}
export function validateFeeding(w:World):string[] {
  const errors:string[]=[];
  for(const d of w.pawns)if(d.feed){
    const t=d.feed,p=w.pawns.find(p=>p.id===t.patientId),food=w.piles.find(p=>p.id===(t.phase==='pickup'?t.sourcePileId:t.carryPileId));
    if(feedingReason(w,d,p,true)||p&&d.priorities[feedingWork(p)]===0&&d.orders.active!=='feed')errors.push('Invalid feeding patient or reservation.');
    if(!p||!feedingPlaceValid(w,t,p))errors.push('Invalid feeding bedside.');
    if(!food||food.kind!=='food'||(t.phase==='pickup'?food.owner.type!=='ground'||reservedSource(w,food.id)>food.quantity:food.owner.type!=='pawn'||food.owner.pawnId!==d.id||food.quantity!==t.quantity))errors.push('Invalid feeding food ownership or quantity.');
    if(food&&t.quantity>ITEM_DEFINITIONS[food.item].maxIngest)errors.push('Feeding exceeds item ingestion limit.');
    if(t.phase==='feed'?(d.state!=='working'||d.moveCooldown>0||d.path.length||d.x!==t.spot.x||d.z!==t.spot.z):d.state!=='moving')errors.push('Invalid feeding phase or position.');
    if(d.ward||d.recreation.task||d.tend||d.rescue||d.need||d.haul||d.cooking||d.jobId!==null)errors.push('Feeding conflicts with another activity.');
  }
  return errors;
}
