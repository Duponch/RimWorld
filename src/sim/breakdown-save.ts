import { BREAKDOWN_CHECK_CORE_TICKS,breakdownEligible } from './breakdowns.ts';
import { footprintCells } from './definitions.ts';
import type { World } from './types.ts';

const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const int=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER):value is number=>Number.isSafeInteger(value)&&Number(value)>=min&&Number(value)<=max;
/** Historical saves are rejected before any neutral V143→V144 adoption. */
export function validateBreakdowns(world:World,version:number):string[] {
  const errors:string[]=[],raw:unknown=world.breakdown;
  if(version<144){
    if(raw!==undefined||[...world.structures,...(world.packed??[]).map(p=>p.building)].some(s=>s.breakdown!==undefined)||world.jobs.some(j=>j.fixBreakdown!==undefined||j.kind==='fix-breakdown'))errors.push('Future breakdown state in older schema.');
    return errors;
  }
  const coreTick=world.tick*10;
  if(!record(raw)||Object.keys(raw).some(k=>!['rng','nextCheckCore'].includes(k))||!int(raw.rng,1,0xffffffff)
    // Diagnostic tools may advance the confirmed tick without running the
    // scheduler. An overdue pulse is replayed on the next normal step.
    ||!int(raw.nextCheckCore,1)||raw.nextCheckCore>coreTick+BREAKDOWN_CHECK_CORE_TICKS
    ||raw.nextCheckCore%BREAKDOWN_CHECK_CORE_TICKS!==0)errors.push('Invalid mechanical breakdown calendar.');
  for(const s of [...world.structures,...(world.packed??[]).map(p=>p.building)])if(s.breakdown!==undefined){
    const state:unknown=s.breakdown;
    if(!breakdownEligible(s)||!record(state)||Object.keys(state).some(k=>k!=='brokenAt')||!int(state.brokenAt,0,world.tick)
      ||s.power?.on!==false||s.battery&&(s.battery.stored!==0||s.battery.half!==undefined))errors.push('Invalid mechanical breakdown.');
  }
  const seen=new Set<number>();
  for(const j of world.jobs){
    const target:unknown=j.fixBreakdown;
    if(j.kind!=='fix-breakdown'){if(target!==undefined)errors.push('Unexpected breakdown target.');continue;}
    if(!record(target)||Object.keys(target).some(k=>!['structureId','kind'].includes(k))||!int(target.structureId,1)||typeof target.kind!=='string'){
      errors.push('Invalid breakdown job.');continue;
    }
    const s=world.structures.find(s=>s.id===target.structureId);
    if(!s||!s.breakdown||seen.has(s.id)||target.kind!==s.kind||j.x!==s.x||j.z!==s.z||j.orientation!==s.orientation||j.footprint!==s.footprint
      ||j.material!==undefined||j.construction!==undefined||j.repair!==undefined||j.deconstruction!==undefined||j.flick!==undefined||j.furniture!==undefined||j.clearance!==undefined
      ||j.growingZoneId!==undefined||j.flowerPotId!==undefined||j.workRemainder!==undefined||!int(j.progress,0,99)||j.reservedBy===null&&j.progress!==0
      // A fire or full ground can temporarily suspend retirement after Home
      // changes; the planner still refuses work outside the eligible area.
      ||j.escrow.wood!==0||j.escrow.food!==0
      ||s&&footprintCells(j).length!==footprintCells(s).length)errors.push('Breakdown job does not match its building.');
    if(s)seen.add(s.id);
  }
  return errors;
}
