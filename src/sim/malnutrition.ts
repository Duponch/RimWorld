import type { MedicalRecord } from './injury-types.ts';

/** Severity in billionths. Core's 150-tick food interval is 15 local ticks. */
export const MALNUTRITION_UNIT=1_000_000_000,MALNUTRITION_INTERVAL=15;
export const MALNUTRITION_LABELS=['absente','débutante','légère','modérée','sévère','extrême'] as const;
export function malnutritionStage(value=0):number {return value>0?Math.min(5,1+Math.floor(value/(MALNUTRITION_UNIT/5))):0;}
/** Stable per identity, independent of the world's mutable random streams.
 * Same bounded distribution as Core, not its proprietary seeded generator. */
export function malnutritionRate(id:number):number {
  let n=(id^0x26ef7a)>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);n=(n^(n>>>16))>>>0;
  return 906000+Math.floor(n/0x100000000*453001);
}
export function malnutritionModifiers(value=0):{consciousnessOffset:number;consciousnessMax:number;hungerFactor:number} {
  const stage=malnutritionStage(value);
  return {consciousnessOffset:[0,-.05,-.1,-.2,-.3,0][stage]!,consciousnessMax:stage===5?.1:Infinity,hungerFactor:stage===0?1:stage===1?1.5:1.6};
}
/** Called at a reached medical tick, exactly once per food interval. */
export function advanceMalnutrition(record:MedicalRecord,starving:boolean,rate:number,phase:number):void {
  if(record.death||record.tick%MALNUTRITION_INTERVAL!==phase%MALNUTRITION_INTERVAL)return;
  const next=Math.max(0,Math.min(MALNUTRITION_UNIT,(record.malnutrition??0)+(starving?rate:-rate)));
  if(next)record.malnutrition=next;else delete record.malnutrition;
}
