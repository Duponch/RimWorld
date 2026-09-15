import type { World } from './types.ts';

/** Membership is a saved air history, allowed to precede a topology transition.
 * Reconciliation remaps it before integration, without inventing past heat. */
export function validateTemperature(world:World,version:number):string[] {
  if(world.thermal===undefined)return [];
  if(version<38)return ['Legacy save contains thermal state.'];
  const state=world.thermal;
  if(!state||typeof state!=='object'||Object.keys(state).length!==1||!Array.isArray(state.regions)||!state.regions.length||state.regions.length>world.width*world.height)return ['Invalid thermal state.'];
  const cells=new Set<number>();let last=-1;
  for(const r of state.regions) {
    if(!r||typeof r!=='object'||Object.keys(r).length!==2||!Array.isArray(r.cells)||!r.cells.length||r.cells.length>world.width*world.height||typeof r.temperature!=='number'||!Number.isFinite(r.temperature)||r.temperature< -273.15||r.temperature>1000)return ['Invalid thermal region.'];
    if(r.cells[0]!<=last)return ['Unordered thermal regions.'];last=r.cells[0]!;
    let previous=-1;
    for(const i of r.cells){if(!Number.isSafeInteger(i)||i<=previous||i>=world.width*world.height||cells.has(i))return ['Invalid thermal membership.'];previous=i;cells.add(i);}
  }
  return [];
}
