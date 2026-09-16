import { BLOOD_UNIT,HEAL_INTERVAL,MEDICAL_INTERVAL,bloodStage } from './injury-rules.ts';
import { medicalBleedUnits,reconcileMedicalDeath,rollScarPain } from './injury-state.ts';
import type { Injury,MedicalContext,MedicalRandom,MedicalRecord } from './injury-types.ts';

function heal(record:MedicalRecord,injury:Injury,amount:number,random:MedicalRandom):void {
  injury.severity-=amount;
  if(injury.scar&&injury.severity<=injury.scar.threshold) {
    injury.severity=injury.scar.threshold;injury.scar.pain=rollScarPain(random);
  } else if(injury.severity<=0)record.injuries.splice(record.injuries.indexOf(injury),1);
}
function chosen(list:Injury[],random:MedicalRandom):Injury {return list[Math.floor(random()*list.length)]!;}

/** Physiological time only. Context is constant over this call; the World adapter
 * must split at hunger/posture changes and handle downing/death at their tick.
 * Mutates its owned record; snapshots and the PRNG remain the caller's concern. */
export function advanceMedical(record:MedicalRecord,ticks:number,context:MedicalContext,random:MedicalRandom):void {
  if(!Number.isSafeInteger(ticks)||ticks<0||ticks>100000||!Number.isSafeInteger(record.tick+ticks)||
    !Number.isInteger(context.phase)||context.phase<0||context.phase>=HEAL_INTERVAL||
    !['standing','ground','bed'].includes(context.posture)||typeof context.starving!=='boolean')throw new Error('Invalid medical interval');
  if(record.death)return;
  if(!record.injuries.length&&!record.missing.length&&!record.bloodLoss){record.tick+=ticks;return;}
  const end=record.tick+ticks;
  while(record.tick<end) {
    record.tick++;
    if(record.tick%MEDICAL_INTERVAL===context.phase%MEDICAL_INTERVAL) {
      const bleed=medicalBleedUnits(record);
      const previousStage=bloodStage(record.bloodLoss);
      // The code reference has a 0.1/day threshold; below it recovery applies.
      // This deliberately differs from the wiki's unqualified "any bleeding".
      record.bloodLoss=bleed>=BLOOD_UNIT/10000?Math.min(BLOOD_UNIT,record.bloodLoss+bleed):
        Math.max(0,record.bloodLoss-BLOOD_UNIT/3000);
      if(bloodStage(record.bloodLoss)!==previousStage)reconcileMedicalDeath(record);
      if(record.death)return;
    }
    if(record.tick%HEAL_INTERVAL!==context.phase||context.starving)continue;
    let eligible=record.injuries.filter(i=>i.scar?.pain===undefined);
    if(eligible.length)heal(record,chosen(eligible,random),context.posture==='standing'?80:context.posture==='ground'?120:160,random);
    eligible=record.injuries.filter(i=>i.tended!==undefined&&i.scar?.pain===undefined);
    if(eligible.length) {
      const injury=chosen(eligible,random);
      heal(record,injury,40+Math.round(Math.min(1000,injury.tended!)*.08),random);
    }
  }
}
