import { assessBody,type BodyAssessment,type BodyAssessmentInput } from './body-capacities.ts';
import type { BodyModel } from './body-model.ts';
import type { MedicalRecord } from './injury-types.ts';

const assessments=new WeakMap<MedicalRecord,{input:BodyAssessmentInput;model:BodyModel;body:BodyAssessment}>();
/** Cache a freshly owned physiological projection, never a tick/actor ID.
 * All scalar inputs and every damage/missing entry are compared. Thus direct
 * in-place changes, fresh-amputation expiry and a second impact in the same
 * Core interval are visible immediately. The result is already immutable. */
export function projectedMedicalBody(record:MedicalRecord,input:BodyAssessmentInput,model:BodyModel):BodyAssessment {
  const old=assessments.get(record),previous=old?.input;
  if(old&&old.model===model&&previous&&Object.keys(input).length===Object.keys(previous).length&&
    (Object.keys(input) as (keyof BodyAssessmentInput)[]).every(k=>k==='damage'||k==='missing'||input[k]===previous[k])&&
    input.damage.length===previous.damage.length&&input.damage.every((d,i)=>d.part===previous.damage[i]!.part&&d.loss===previous.damage[i]!.loss)&&
    input.missing.length===previous.missing.length&&input.missing.every((id,i)=>id===previous.missing[i]))return old.body;
  const body=assessBody(input,model);assessments.set(record,{input,model,body});return body;
}
