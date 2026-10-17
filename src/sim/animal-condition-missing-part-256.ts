import {clinicalConditionPartFacts256} from './clinical-condition-parts-256.ts';
import {medicalModel} from './body-model.ts';
import {partMissing,reconcileMedicalDeath} from './injury-state.ts';
import {removeInfectionsWithin} from './infection-state.ts';
import {removeAnimalConditionsWithin256,type AnimalAgeMedical256} from './animal-age-condition-state-256.ts';
import type {BodyPartId} from './body-definition.ts';
import type {InitialAnimalRandom256} from './initial-animal-age-256.ts';
/** The real MissingBodyPart transition used by a destroyPart hediff stage.
 * No injury is manufactured; no loot, hit-point damage or World is invented.
 * Core's fresh flag is false for this direct MakeHediff/AddHediff path. */
export function destroyAnimalConditionPart256(record:AnimalAgeMedical256,part:BodyPartId,atCore:number,random:InitialAnimalRandom256):boolean {
 if(record.death)return false;
 if(!record.animalAgeConditions||!Number.isSafeInteger(atCore)||atCore<0||atCore>record.tick*10||atCore<=(record.tick-1)*10)throw Error('Condition part loss requires the actual clinical frontier');
 const model=medicalModel(record),target=model.byId[part];if(!target)throw Error('Unknown actual animal part');
 // Hediff.TickInterval explicitly excludes the actual core part. Its disease
 // can still kill physiologically through efficiency; it does not amputate it.
 if(target.parent===null||partMissing(record,part))return false;
 const rows=clinicalConditionPartFacts256(model,record);
 const under=(id:BodyPartId)=>{for(let p:BodyPartId|null=id;p!==null;p=model.byId[p]!.parent)if(p===part)return true;return false;};
 const removed=rows.filter(row=>under(row.part));
 if(!removed.length||removed[0]&&removed[0].part!==part)throw Error('Native part order does not match its clinical original');
 // The root and every recursively made child have a real PostMake Value,
 // including children previously missing: RestorePartRecursive precedes them.
 for(const _row of removed)random.value();
 record.injuries=record.injuries.filter(i=>!under(i.part));record.missing=record.missing.filter(m=>!under(m.part));
 removeInfectionsWithin(record,part);removeAnimalConditionsWithin256(record,part,model);
 if(record.artificialParts){record.artificialParts=record.artificialParts.filter(p=>!under(p.part));if(!record.artificialParts.length)delete record.artificialParts;}
 record.missing.push({part,bornAt:record.tick,nonFresh:true});
 reconcileMedicalDeath(record);return true;
}
