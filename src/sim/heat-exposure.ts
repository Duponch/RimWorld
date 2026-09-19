import { comfortableTemperature,heatStage,nextHeatSeverity } from './heat-rules.ts';
import { createMedicalRecord,reconcileMedicalDeath } from './injury-state.ts';
import { updatePawnHealth,reconcilePawnHealth } from './health.ts';
import type { Pawn,World } from './types.ts';

/** Called exactly once per pawn per world tick, before ordinary health/needs.
 * No retrospective exposure is invented when loading an older record. */
export function advanceHeatExposure(w:World,p:Pawn,temperature:()=>number):void {
  if(w.tick%6!==p.id%6||p.health?.death)return;
  const before=p.health?.heatstroke??0,after=nextHeatSeverity(before,temperature(),comfortableTemperature(w,p).max);
  if(after===before)return;
  if(p.health&&p.health.tick<w.tick)updatePawnHealth(w,p);
  if(p.health?.death)return;
  p.health??=createMedicalRecord(w.tick);
  if(after)p.health.heatstroke=after;else delete p.health.heatstroke;
  reconcileMedicalDeath(p.health);reconcilePawnHealth(w,p);
  if(heatStage(after)>heatStage(before)&&heatStage(after)>0){w.events.push({tick:w.tick,type:'need',message:`${p.name} souffre d’un coup de chaleur. Un lieu plus frais est nécessaire ; les pansements ne le soignent pas.`});if(w.events.length>80)w.events.splice(0,w.events.length-80);}
}
