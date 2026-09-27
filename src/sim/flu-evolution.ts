import { assessMedical,reconcileMedicalDeath } from './injury-state.ts';
import { FLU_INTERVAL,FLU_UNIT,fluImmunityPerDay,fluSeverityPerDay } from './flu-rules.ts';
import type { MedicalContext,MedicalRecord } from './injury-types.ts';

/** Local medical tick, with severity resolved before immunity just like wound
 * infection. Even a recovered episode retains fading immunity until zero. */
export function advanceFlu(record:MedicalRecord,context:MedicalContext):void {
  const flu=record.flu;if(!flu)return;
  if(flu.severity&&record.tick>flu.bornAt&&record.tick%FLU_INTERVAL===context.phase%FLU_INTERVAL) {
    flu.severity=Math.max(0,Math.min(FLU_UNIT,flu.severity+Math.round(fluSeverityPerDay(flu,record.tick)*FLU_UNIT/300)));
    if(!flu.severity)delete flu.tend;
    reconcileMedicalDeath(record);
    if(record.death)return;
  }
  const filtration=flu.severity?assessMedical(record).capacities.bloodFiltration:1;
  flu.immunity=Math.max(0,Math.min(FLU_UNIT,flu.immunity+Math.round(fluImmunityPerDay(record,context,filtration)*FLU_UNIT/6000)));
  if(!flu.severity&&!flu.immunity&&!flu.vomit)delete record.flu;
}
