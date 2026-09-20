import { nextColdSeverity } from './cold-rules.ts';
import { comfortableTemperature,heatStage,nextHeatSeverity } from './heat-rules.ts';
import { createMedicalRecord,reconcileMedicalDeath } from './injury-state.ts';
import { updatePawnHealth,reconcilePawnHealth } from './health.ts';
import type { Pawn,World } from './types.ts';

/** Called exactly once per pawn per world tick, before ordinary health/needs.
 * No retrospective exposure is invented when loading an older record. */
export function advanceHeatExposure(w:World,p:Pawn,temperature:()=>number):void {
  if(w.tick%6!==p.id%6||p.health?.death)return;
  const air=temperature(),range=comfortableTemperature(w,p),before=p.health?.heatstroke??0,after=nextHeatSeverity(before,air,range.max);
  const coldBefore=p.health?.hypothermia??0,coldAfter=nextColdSeverity(coldBefore,air,range.min);
  if(after===before&&coldAfter===coldBefore)return;
  if(!p.health||p.health.tick<w.tick)updatePawnHealth(w,p);
  if(p.health?.death)return;
  p.health??=createMedicalRecord(w.tick);
  if(after)p.health.heatstroke=after;else delete p.health.heatstroke;
  if(coldAfter)p.health.hypothermia=coldAfter;else delete p.health.hypothermia;
  if(heatStage(coldAfter)>heatStage(coldBefore)&&heatStage(coldAfter)>0){w.events.push({tick:w.tick,type:'need',message:`${p.name} souffre d’hypothermie. Réchauffez-le dans un abri confortable.`});if(w.events.length>80)w.events.splice(0,w.events.length-80);}
  reconcileMedicalDeath(p.health);reconcilePawnHealth(w,p);
  if(heatStage(after)>heatStage(before)&&heatStage(after)>0){w.events.push({tick:w.tick,type:'need',message:`${p.name} souffre d’un coup de chaleur. Un lieu plus frais est nécessaire ; les pansements ne le soignent pas.`});if(w.events.length>80)w.events.splice(0,w.events.length-80);}
}
