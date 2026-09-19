import { barrierMaxHp,isBarrier } from './barriers.ts';
import { CONSTRUCTION_MATERIALS } from './building-materials.ts';
import { repairWanted } from './repairs.ts';
import type { World } from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
export function validateBarriers(world:World,version:number):string[] {
  const errors:string[]=[],size=world.width*world.height;
  if(world.home!==undefined&&(version<67||!Array.isArray(world.home)||!world.home.length||world.home.length>size||!world.home.every((i,n)=>integer(i,0,size-1)&&(n===0||i>world.home![n-1]!))))errors.push('Invalid home area.');
  const ledger:unknown=world.destroyed;
  if(ledger!==undefined&&(version<67||!object(ledger)||Object.keys(ledger).some(k=>!['count','lost'].includes(k))||!integer(ledger.count,1)||!object(ledger.lost)||!Object.keys(ledger.lost).length||Object.entries(ledger.lost).some(([k,v])=>!(CONSTRUCTION_MATERIALS.includes(k as never)||version>=75&&k==='component')||!integer(v,1))))errors.push('Invalid destroyed building ledger.');
  for(const s of [...world.structures,...(world.packed??[]).map(p=>p.building)])if(s.damage!==undefined&&(version<67||!isBarrier(s)||!integer(s.damage,1,barrierMaxHp(s)-1)))errors.push('Invalid barrier damage.');
  for(const j of world.jobs){
    const r:unknown=j.repair;
    if(j.kind!=='repair'){if(r!==undefined)errors.push('Unexpected repair target.');continue;}
    if(version<67||!object(r)||Object.keys(r).some(k=>!['structureId','warmed'].includes(k))||!integer(r.structureId,1)||r.warmed!==undefined&&r.warmed!==true){errors.push('Invalid repair job.');continue;}
    const s=world.structures.find(s=>s.id===r.structureId);
    if(!s||!isBarrier(s)||s.x!==j.x||s.z!==j.z||s.orientation!==j.orientation||s.footprint!==j.footprint||j.material!==undefined||j.deconstruction||j.construction||j.furniture||j.clearance||j.growingZoneId!==undefined||j.escrow.wood||j.escrow.food)errors.push('Repair does not match its building.');
    if(!errors.length&&!repairWanted(world,j))errors.push('Repair outside home, undamaged or marked for removal.');
    if(j.reservedBy===null&&(j.progress!==0||j.workRemainder!==undefined||r.warmed))errors.push('Interrupted repair kept work.');
  }
  return errors;
}
