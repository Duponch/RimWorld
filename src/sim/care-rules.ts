import { BODY_PARTS,type BodyPartId } from './body-definition.ts';
import { pawnBody } from './health-rules.ts';
import { freshMissing,injuryBleed,medicalBleed } from './injury-state.ts';
import { BLOOD_UNIT,HP_UNIT,PART_INJURY_RULES } from './injury-rules.ts';
import type { Cell,Pawn } from './types.ts';
import { medicalCare,tendQuality,type TendMedicine } from './medicine-rules.ts';

export interface TendTask { patientId:number; spot:Cell; phase:'find-medicine'|'pickup'|'approach'|'tend'; progress:number; duration?:number; urgent?:true; useMedicine?:true; medicine?:TendMedicine }
export type TreatmentTarget={injuryId:number;part?:never}|{part:BodyPartId;injuryId?:never};
export type RankedTreatment=TreatmentTarget&{priority:number;severity:number};
export function treatmentTargets(p:Pawn):RankedTreatment[] {
  const h=p.health;if(!h||h.death||medicalCare(p)==='none')return [];
  const list:RankedTreatment[]=[];
  for(const i of h.injuries)if(i.tended===undefined&&i.scar?.pain===undefined)list.push({injuryId:i.id,priority:injuryBleed(h,i)*1.5,severity:i.severity});
  for(const m of h.missing)if(freshMissing(h,m))list.push({part:m.part,priority:BODY_PARTS[m.part].hp*.12*PART_INJURY_RULES[m.part].bleed*1.5,severity:HP_UNIT});
  return list.sort((a,b)=>b.priority-a.priority||b.severity-a.severity);
}
/** One medicine treats the first injury even above 20 HP, then fits later
 * injuries within 20 HP total. An oversized candidate does not end the scan. */
export function treatmentBatch(targets:readonly RankedTreatment[],medicine:boolean):RankedTreatment[] {
  const first=targets[0];if(!first)return [];
  const batch=[first];let severity=first.severity;
  if(medicine&&first.injuryId!==undefined)for(const next of targets.slice(1))if(next.injuryId!==undefined&&severity+next.severity<=20*HP_UNIT){batch.push(next);severity+=next.severity;}
  return batch;
}
export function medicineCount(targets:readonly RankedTreatment[]):number {
  let left=[...targets],count=0;
  while(left.length){const batch=new Set(treatmentBatch(left,true));left=left.filter(t=>!batch.has(t));count++;}
  return count;
}
/** Core ranks bleeding first, then severity. Deterministic ID/order breaks ties. */
export function treatmentTarget(p:Pawn):TreatmentTarget|undefined {
  const h=p.health;if(!h||h.death||medicalCare(p)==='none')return;
  let best:{target:TreatmentTarget;priority:number;severity:number}|undefined;
  const consider=(target:TreatmentTarget,priority:number,severity:number)=>{
    if(!best||priority>best.priority||priority===best.priority&&severity>best.severity)best={target,priority,severity};
  };
  for(const i of h.injuries)if(i.tended===undefined&&i.scar?.pain===undefined)consider({injuryId:i.id},injuryBleed(h,i)*1.5,i.severity);
  for(const m of h.missing)if(freshMissing(h,m))consider({part:m.part},BODY_PARTS[m.part].hp*.12*PART_INJURY_RULES[m.part].bleed*1.5,HP_UNIT);
  return best?.target;
}
export const healingInjury=(p:Pawn):boolean=>!!p.health?.injuries.some(i=>i.tended!==undefined&&i.scar?.pain===undefined);
export const urgentTreatment=(p:Pawn):boolean=>!!treatmentTarget(p)&&!!p.health&&medicalBleed(p.health)>0&&(1-p.health.bloodLoss/BLOOD_UNIT)/medicalBleed(p.health)<.75;
export function medicalTendSpeed(p:Pawn,light=1):number {
  const c=pawnBody(p).capacities;
  return Math.max(.1,(.4+.06*p.skills.medicine.level)*c.manipulation*(.2+.8*Math.min(1.3,c.sight))*light);
}
export function medicalTendQuality(p:Pawn):number {
  const c=pawnBody(p).capacities,v=(.2+.1*p.skills.medicine.level)*Math.min(1.4,c.manipulation)*(.3+.7*Math.min(1.4,c.sight));
  return v<=1?v:v<=2?1+(v-1)*.5:1.5+(v-2)*.25;
}
/** Additive variation, not a multiplicative +/-25%. Thousandths persisted. */
export const dryTendQuality=(stat:number,random:number,self=false):number=>tendQuality(stat,random,self);
