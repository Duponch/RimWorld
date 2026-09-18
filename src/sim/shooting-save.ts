import { equippedWeapon } from './equipment-rules.ts';
import type { World } from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
export function validShootingShape(value:unknown,version:number,tick:number):boolean {
  if(value===undefined)return true;
  if(version<56||!record(value)||!keys(value,['order','stance'])||value.order===null&&value.stance===null)return false;
  if(value.order!==null&&(!record(value.order)||!keys(value.order,['targetId','weaponId','startedDowned'])||!integer(value.order.targetId,1)||!integer(value.order.weaponId,1)||typeof value.order.startedDowned!=='boolean'))return false;
  const s=value.stance;if(s===null)return value.order!==null;
  if(!record(s)||!keys(s,['phase','startedAtCore','endsAtCore',...(s.phase==='aim'?['targetStartedDowned']:[])])||!integer(s.startedAtCore,0,tick*10)||!integer(s.endsAtCore,tick*10+1))return false;
  return s.phase==='aim'?value.order!==null&&typeof s.targetStartedDowned==='boolean'&&s.endsAtCore-s.startedAtCore===18:s.phase==='cooldown'&&s.endsAtCore-s.startedAtCore===96;
}
export function validateShooting(world:World):string[] {
  const errors:string[]=[];
  for(const p of world.pawns)if(p.shooting) {
    const {order,stance}=p.shooting;
    if(p.state==='dead'||p.state==='downed'||p.jobId!==null||p.haul||p.cooking||p.equipmentTask||p.tend||p.feed||p.rescue||p.need||p.recreation.task||p.orders.active!==null||p.orders.queue.length||p.priorityWork)errors.push('Shooting conflicts with another activity.');
    if(order&&(!p.draft||p.draft.target||p.draft.queue.length||p.path.length||!world.pawns.some(t=>t.id===order.targetId&&t.id!==p.id)||equippedWeapon(world,p)?.id!==order.weaponId))errors.push('Invalid shooting order ownership.');
    if(stance&&(p.motion?.end??0)>world.tick)errors.push('Shooting stance during a captured edge.');
    if(!stance&&(!order||!p.motion||(p.motion.end<=world.tick)))errors.push('Shooting wait without active travel.');
  }
  return errors;
}
