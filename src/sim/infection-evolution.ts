import type { MedicalContext,MedicalRandom,MedicalRecord } from './injury-types.ts';
import { assessMedical,reconcileMedicalDeath } from './injury-state.ts';
import { INFECTION_INITIAL,INFECTION_INTERVAL,INFECTION_UNIT,infectionAcquisitionFactor,infectionContractAllowed,infectionImmunityPerDay,infectionLuck,infectionSeverityPerDay } from './infection-rules.ts';

/** Once per local medical tick. Wound clocks are observed at the first local
 * tick past their Core deadline; no fresh random delay at a save boundary. */
export function advanceInfections(record:MedicalRecord,context:MedicalContext,random:MedicalRandom):void {
  for(const injury of record.injuries) {
    if(!injury.infection||injury.infection.dueCore>record.tick*10)continue;
    const factor=infectionAcquisitionFactor(injury)*(context.infectionChanceFactor??1),allowed=infectionContractAllowed(record,injury.part);
    // Even rejection closes the original exposure. Healed wounds disappear
    // with their clocks; an acquired condition no longer depends on its wound.
    delete injury.infection;
    if(!allowed||random()>=factor)continue;
    const state=record.infections??={nextId:1,cases:[],immunity:0};
    const id=state.nextId++;
    state.cases.push({id,part:injury.part,bornAt:record.tick,severity:INFECTION_INITIAL,luck:infectionLuck(context.infectionSeed??0,id)});
  }
  const state=record.infections;if(!state)return;
  if(record.tick%INFECTION_INTERVAL===context.phase%INFECTION_INTERVAL) {
    for(const condition of state.cases) {
      if(condition.bornAt===record.tick)continue;
      condition.severity=Math.max(0,Math.min(INFECTION_UNIT,condition.severity+Math.round(infectionSeverityPerDay(record,condition)*INFECTION_UNIT/300)));
    }
    state.cases=state.cases.filter(c=>c.severity>0);
    reconcileMedicalDeath(record);
    if(record.death)return; // Severity wins a simultaneous immunity threshold.
  }
}
/** Called after all severity, blood loss and wound healing for this tick. */
export function advanceInfectionImmunity(record:MedicalRecord,context:MedicalContext):void {
  const state=record.infections;
  if(state&&!record.death&&(state.cases.length||state.immunity)) {
    const filtration=state.cases.length?assessMedical(record).capacities.bloodFiltration:1;
    state.immunity=Math.max(0,Math.min(INFECTION_UNIT,state.immunity+Math.round(infectionImmunityPerDay(record,context,filtration)*INFECTION_UNIT/6000)));
  }
}
