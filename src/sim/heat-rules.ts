import { apparelInsulation } from './apparel-rules.ts';
export { apparelInsulation } from './apparel-rules.ts';
import type { Pawn,World } from './types.ts';

export const HEAT_UNIT=1_000_000_000;
export const HEAT_SERIOUS=.35*HEAT_UNIT;
export function comfortableTemperature(world:World,pawn:Pawn):{min:number;max:number} {
  let min=16,max=26;
  for(const p of world.piles)if(p.owner.type==='apparel'&&p.owner.pawnId===pawn.id){const n=apparelInsulation(p);min-=n.cold;max+=n.heat;}
  return {min,max};
}
export function heatStage(severity=0):number {return severity>=.62*HEAT_UNIT?4:severity>=HEAT_SERIOUS?3:severity>=.2*HEAT_UNIT?2:severity>=.04*HEAT_UNIT?1:0;}
export const HEAT_LABELS=['latent','initial','mineur','grave','extrême'] as const;
export function heatModifiers(severity=0):{pain:number;consciousnessOffset:number;consciousnessMax:number;movingOffset:number} {
  const s=heatStage(severity);return {pain:s===4?.3:s===3?.15:0,consciousnessOffset:s===1?-.05:s===2?-.1:s===3?-.2:0,consciousnessMax:s===4?.1:Infinity,movingOffset:s===2?-.1:s===3?-.3:0};
}
const curve=[[0,0],[25,25],[50,40],[100,60],[200,80],[400,100],[4000,1000]] as const;
export function heatExcess(value:number):number {
  for(let i=1;i<curve.length;i++){const a=curve[i-1]!,b=curve[i]!;if(value<=b[0])return a[1]+(b[1]-a[1])*(value-a[0])/(b[0]-a[0]);}
  return 1000;
}
/** One 60-Core-tick interval (six local ticks). The dead band is deliberate. */
export function nextHeatSeverity(severity:number,temperature:number,maximum:number):number {
  if(temperature>maximum+10)return Math.min(HEAT_UNIT,severity+Math.round(Math.max(.000375,heatExcess(temperature-maximum-10)*.0000645)*HEAT_UNIT));
  if(temperature<maximum)return Math.max(0,severity-Math.round(Math.max(.0015,Math.min(.015,.027*severity/HEAT_UNIT))*HEAT_UNIT));
  return severity;
}
