import { hostileTo,isColonist } from './affiliation.ts';
import type { World } from './types.ts';

export function validAffiliationShape(p:Record<string,unknown>,version:number,world:World):boolean {
  if(version<58)return p.faction===undefined&&p.hostilityResponse===undefined&&p.flee===undefined;
  if(p.faction!==undefined&&p.faction!=='colony'&&p.faction!=='outlaws'||p.hostilityResponse!==undefined&&p.hostilityResponse!=='ignore'&&!(version>=60&&p.hostilityResponse==='attack'))return false;
  if(p.flee===undefined)return true;
  const f=p.flee as Record<string,unknown>,t=f?.target as Record<string,unknown>;
  const end=(p.motion as {end?:number}|undefined)?.end,latest=Math.ceil(Math.max(world.tick,typeof end==='number'&&Number.isFinite(end)?end:world.tick))+120;
  return !!f&&typeof f==='object'&&!Array.isArray(f)&&Object.keys(f).every(k=>['target','until'].includes(k))&&Number.isSafeInteger(f.until)&&(f.until as number)>=0&&(f.until as number)<=latest&&!!t&&Object.keys(t).length===2&&Number.isInteger(t.x)&&Number.isInteger(t.z)&&(t.x as number)>=0&&(t.x as number)<world.width&&(t.z as number)>=0&&(t.z as number)<world.height;
}
export function validateAffiliations(world:World):string[] {
  const errors:string[]=[];
  for(const p of world.pawns) {
    if(p.lastAttack&&(p.lastAttack.targetId===p.id||p.lastAttack.targetId>=world.nextId))errors.push('Invalid historical attack target.');
    if(!isColonist(p)&&(p.draft||p.flee||p.hostilityResponse||p.jobId!==null||p.orders.active!==null||p.orders.queue.length||p.haul||p.cooking||p.rescue||p.tend||p.feed||p.equipmentTask||p.bedId!==null||p.recreation.task||p.need&&!(p.need.kind==='sleep'&&p.need.bedId===null)))errors.push('Non-colonist owns a colony activity.');
    const recovering=world.schemaVersion>=79&&p.shooting?.order===null&&p.shooting.stance?.phase==='cooldown';
    if(p.flee&&(!isColonist(p)||p.draft||!['idle','moving','hungry'].includes(p.state)||p.shooting&&!recovering||p.need||p.jobId!==null||p.orders.active!==null||p.orders.queue.length||p.haul||p.cooking||p.rescue||p.tend||p.feed||p.equipmentTask||p.recreation.task))errors.push('Flee conflicts with another activity.');
    if(p.flee&&p.path.length&&(p.path.at(-1)!.x!==p.flee.target.x||p.path.at(-1)!.z!==p.flee.target.z))errors.push('Flee path misses its target.');
    // Collision is a permission at edge commitment, not a universal overlap
    // invariant: a downed hostile can recover beneath a passer-by. Preserve the
    // accepted edge rather than rejecting an otherwise legitimate continuation.
    if(p.shooting?.order&&!isColonist(p)&&!world.pawns.some(t=>t.id===p.shooting!.order!.targetId&&hostileTo(p,t)))errors.push('Sentry targets a non-hostile.');
  }
  return errors;
}
