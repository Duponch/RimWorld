import type {MedicalRecord} from './injury-types.ts';
/** Actual generated initial owners have not been in any ticking ThingOwner.
 * Rebase the existing initial dossier at its first real Spawn; no elapsed
 * interval, healing, tend, birthday or disappearance draw is manufactured. */
export function prepareStartingHeldClinicalResume256(record:MedicalRecord|undefined,atTick:number):MedicalRecord|undefined {
 if(!Number.isSafeInteger(atTick)||atTick<0)throw Error('Invalid actual starting spawn clock');if(!record)return;
 const keys=['tick','nextInjuryId','injuries','missing','bloodLoss','body','animalBirthTick','animalGrowth','ageAilments','animalAgeConditions','cryptosleepSickness'];
 if(record.tick!==0||Reflect.ownKeys(record).some(k=>typeof k!=='string'||!keys.includes(k)))throw Error('Initial held dossier has an unrepresented acquired clinical clock');
 if(record.injuries.some(i=>i.bornAt!==0||i.infection||i.tended!==undefined)||record.missing.some(i=>i.bornAt!==0||i.tended!==undefined)
  ||record.animalAgeConditions?.cases.some(c=>c.bornAt!==0||c.ageCore!==0)||record.cryptosleepSickness?.vomit)throw Error('Initial holder was advanced or treated before Spawn');
 const next=structuredClone(record);next.tick=atTick;
 for(const injury of next.injuries)injury.bornAt=atTick;for(const missing of next.missing)missing.bornAt=atTick;
 for(const condition of next.animalAgeConditions?.cases??[])condition.bornAt=atTick;
 if(next.animalBirthTick!==undefined){next.animalBirthTick+=atTick;if(!Number.isSafeInteger(next.animalBirthTick))throw Error('Initial animal birth clock exhausted');}
 return next;
}
