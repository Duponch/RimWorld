import { HEAT_UNIT,heatModifiers,heatStage } from './heat-severity.ts';

/** Human hypothermia, not insect hypothermic slowdown. Same stage boundaries
 * as heatstroke, with a separate manipulation penalty and linear exposure. */
export function coldModifiers(severity=0){
  const stage=heatStage(severity);
  return {...heatModifiers(severity),manipulationOffset:stage===1?-.08:stage===2?-.2:stage===3?-.5:0};
}
export function nextColdSeverity(severity:number,temperature:number,minimum:number,unspawned=false):number {
  if(unspawned){
    // Native captures firstHediff BEFORE adding exposure: a newly born hediff
    // has no decay on this call. An existing one gains then decays off-map.
    let next=temperature<minimum-10?Math.min(HEAT_UNIT,severity+Math.round(Math.max(.00075,(minimum-10-temperature)*.0000645)*HEAT_UNIT)):severity;
    if(next>=HEAT_UNIT)return next;
    return severity>0?Math.max(0,next-Math.round(Math.max(.0015,Math.min(.015,.027*next/HEAT_UNIT))*HEAT_UNIT)):next;
  }
  if(temperature<minimum-10)return Math.min(HEAT_UNIT,severity+Math.round(Math.max(.00075,(minimum-10-temperature)*.0000645)*HEAT_UNIT));
  if(temperature>minimum)return Math.max(0,severity-Math.round(Math.max(.0015,Math.min(.015,.027*severity/HEAT_UNIT))*HEAT_UNIT));
  return severity;
}
