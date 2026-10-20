import {groupPawnInterval256} from './group-core-cadence-256.ts';
import {processVomit,type FoodPoisonVomitContext} from './food-poisoning-runtime.ts';
import type {MedicalRecord} from './injury-types.ts';
/** The shared physical job consumes a successful clinical trial exactly once.
 * Actual edge deferral follows the existing toxicity adapter's contract. */
export function processAlcoholVomit265(record:MedicalRecord,tick:number,id:number,context:FoodPoisonVomitContext,edge?:{startCore:number;endCore:number}):ReturnType<typeof processVomit>|undefined {
 const a=record.alcohol;if(!a)return;
 if(!context.awake){delete a.vomitRequestedAt;delete a.vomit;return;}
 const request=a.vomitRequestedAt;
 if(request!==undefined&&request<=(tick-1)*10&&!(edge&&edge.startCore<=request&&Math.ceil(edge.endCore/10)>=tick))delete a.vomitRequestedAt;
 let pulse=false;for(let core=Math.max(1,(tick-1)*10+1);core<=tick*10;core++)if(groupPawnInterval256(id,core,150,1)){pulse=true;break;}
 const phase=pulse?tick%60:(tick+1)%60,previous=a.vomit,accepted=a.vomitRequestedAt!==undefined;
 const start=()=>{if(!context.start())return false;for(const other of [record.foodPoisoning,record.flu,record.immuneDiseases?.malaria,record.cryptosleepSickness,record.toxicBuildup])if(other)delete other.vomit;return true;};
 const result=processVomit(a,tick,phase,{...context,start},0,accepted);
 if(a.vomit!==previous)delete a.vomitRequestedAt;
 return result;
}
