import {groupPawnInterval256} from './group-core-cadence-256.ts';
import {processVomit,type FoodPoisonVomitContext} from './food-poisoning-runtime.ts';
import type {MedicalRecord} from './injury-types.ts';
export function toxicVomitEngagement256(actor:{motion?:{start:number;end:number}|null;strike?:{atCore:number;untilCore:number}},tick:number):{startCore:number;endCore:number}|undefined {
 const motion=actor.motion;if(motion&&Math.ceil(motion.end)>=tick)return {startCore:motion.start*10,endCore:motion.end*10};
 const strike=actor.strike;if(strike&&Math.ceil(strike.untilCore/10)>=tick)return {startCore:strike.atCore,endCore:strike.untilCore};
 return;
}
/** One actual accepted Hediff trial is consumed by the existing physical
 * driver. This does not roll the trial twice, run two jobs or fabricate food
 * poisoning. Captured edge/contact deferral is the explicit local adaptation. */
export function processToxicVomit256(record:MedicalRecord,tick:number,id:number,context:FoodPoisonVomitContext,edge?:{startCore:number;endCore:number}):ReturnType<typeof processVomit>|undefined {
 const t=record.toxicBuildup;if(!t)return;
 if(!context.awake){delete t.vomitRequestedAt;delete t.vomit;return;}
 const request=t.vomitRequestedAt;
 if(request!==undefined&&request<=(tick-1)*10&&!(edge&&edge.startCore<=request&&Math.ceil(edge.endCore/10)>=tick))delete t.vomitRequestedAt;
 let pulse=false;for(let core=Math.max(1,(tick-1)*10+1);core<=tick*10;core++)if(groupPawnInterval256(id,core,150,1)){pulse=true;break;}
 // Select ONLY the old driver's pulse branch. Automatic trial chance is0;
 // an accepted actual clinical trial is supplied separately below.
 const phase=pulse?tick%60:(tick+1)%60,previous=t.vomit,accepted=t.vomitRequestedAt!==undefined;
 const start=()=>{if(!context.start())return false;
  // StartJob(Vomit, InterruptForced) replaces the previous physical episode,
  // retaining that other genuine illness and all possessions.
  if(record.foodPoisoning)delete record.foodPoisoning.vomit;
  if(record.flu)delete record.flu.vomit;
  if(record.immuneDiseases?.malaria)delete record.immuneDiseases.malaria.vomit;
  if(record.cryptosleepSickness)delete record.cryptosleepSickness.vomit;
  if(record.alcohol)delete record.alcohol.vomit;
  return true;
 };
 const result=processVomit(t,tick,phase,{...context,start},0,accepted);
 if(t.vomit!==previous)delete t.vomitRequestedAt;
 return result;
}
