import {HUMAN_CLINICAL_PART_FACTS_256,CORE_BODY_PART_ALIVE_256} from './human-clinical-part-facts-256.ts';
import type {BodyModel} from './body-model-compiler.ts';
import type {BodyPartId} from './body-definition.ts';
const human=new Map<string,{defId:string;alive:boolean}>(HUMAN_CLINICAL_PART_FACTS_256.map(p=>[p.id,p]));
/** Historical quadruped records retain their actual literal parts, topology
 * and coverage. These definition identities describe only represented parts;
 * no unrepresented organ or prospective native body is substituted. */
function legacyDef(id:BodyPartId):string|undefined {
 const fixed:Readonly<Record<string,string>>={torso:'Body',tail:'Tail',ribcage:'Ribcage',spine:'Spine',stomach:'Stomach',heart:'Heart',liver:'Liver',hump:'Hump',neck:'Neck',head:'Head',skull:'Skull',brain:'Brain',nose:'Nose',jaw:'Jaw'};
 if(fixed[id])return fixed[id];
 if(/^(left|right)-(lung|kidney|eye|ear)$/.test(id))return id.split('-').at(-1)!.replace(/^./,c=>c.toUpperCase());
 if(/^(left|right)-(front|rear)-leg$/.test(id))return 'Leg';
 if(/^(left|right)-(front|rear)-paw$/.test(id))return 'Paw';
 if(/^(left|right)-(front|rear)-hoof$/.test(id))return 'Hoof';
 return;
}
export function clinicalConditionPartFacts256(model:BodyModel,record?:object) {
 // Historical human/animal records keep their literal model order. Only the
 // parent-validated native Human projection uses its real Core record order.
 const parts=model.kind==='human'&&record&&Object.hasOwn(record,'humanHealthScale')?HUMAN_CLINICAL_PART_FACTS_256.map(row=>model.byId[row.id]):model.parts;
 return parts.map(p=>{
  const fact=p.nativeDefId?{defId:p.nativeDefId,alive:CORE_BODY_PART_ALIVE_256[p.nativeDefId]}:model.kind==='human'?human.get(p.id):undefined;
  const defId=fact?.defId??legacyDef(p.id),alive=fact?.alive??(defId===undefined?undefined:CORE_BODY_PART_ALIVE_256[defId]);
  if(!defId||alive===undefined)throw Error('Clinical condition part lacks represented primary facts: '+model.kind+'/'+p.id);
  return {part:p.id,defId,alive,parent:p.parent,coverage:p.coverage};
 });
}
