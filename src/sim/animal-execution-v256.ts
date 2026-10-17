import {medicalModel} from './body-model.ts';
import {partMissing,remainingPartHealth} from './injury-state.ts';
import {HP_UNIT} from './injury-rules.ts';
import {isAnimalSpecies256} from './animal-core-v256.ts';
import type {MedicalRecord} from './injury-types.ts';
import type {BodyPartId} from './body-definition.ts';
export function animalExecutionCandidates256(record:MedicalRecord):readonly BodyPartId[] {
 const model=medicalModel(record),parts=model.parts.filter(part=>!partMissing(record,part.id));
 const best=parts.reduce((max,part)=>Math.max(max,part.nativeExecutionPriority??0),0);
 return parts.filter(part=>best<=0||(part.nativeExecutionPriority??0)===best).map(part=>part.id);
}
export function animalExecutionPart256(record:MedicalRecord,random:()=>number):BodyPartId {
 if(!isAnimalSpecies256(record.body)&&record.animalGrowth===undefined)return 'neck';
 const model=medicalModel(record),candidates=animalExecutionCandidates256(record);
 if(!candidates.length)throw Error('No remaining animal execution part.');
 if((model.byId[candidates[0]!].nativeExecutionPriority??0)>0)return candidates[0]!;
 // Only the no-priority fallback consumes a selection draw. Weight is
 // absolute coverage with children, not exclusive wound-selection coverage.
 const weights=candidates.map(id=>{let n=1;for(let p:BodyPartId|null=id;p!==null;p=model.byId[p].parent)n*=model.byId[p].coverage;return n;});
 const total=weights.reduce((a,b)=>a+b,0),u=random();if(!Number.isFinite(u)||u<0||u>=1||total<=0)throw Error('Invalid execution selection.');
 let cursor=u*total;for(let i=0;i<candidates.length;i++){cursor-=weights[i]!;if(cursor<0)return candidates[i]!;}return candidates.at(-1)!;
}
export function validAnimalExecutionProof256(record:MedicalRecord):boolean {
 return animalExecutionCandidates256(record).some(part=>record.injuries.some(i=>i.kind==='execution-cut'&&i.part===part&&i.bornAt===record.tick)||remainingPartHealth(record,part)<=HP_UNIT);
}
