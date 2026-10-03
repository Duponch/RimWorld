import { attribute, float, Fn, If, mix, sin, vec3, varying } from 'three/tsl';
import type { BodyPartId } from '../sim/body-definition';
import { medicalModel } from '../sim/body-model';
import { FRESH_MISSING_TICKS,HP_UNIT, INJURY_RULES, injuryPartRules, isWithinPart } from '../sim/injury-rules';
import type { MedicalRecord } from '../sim/injury-types';
import type Node from 'three/src/nodes/core/Node.js';

/** Six visible regions, two bits each. This is a snapshot projection, not a
 * persistent blood deposit or a new clinical rule. Internal bleeding alone
 * cannot paint the skin. Existing open wounds retain a dry mark after tending
 * and death; healed scars and consumed/absent parts do not. */
export function bodyBloodRegion(part:BodyPartId,animal=false):number {
  if(animal){
    if(part.includes('-front-'))return part.startsWith('left-')?2:3;
    if(part.includes('-rear-'))return part.startsWith('left-')?4:5;
  }else{
    if(/-(arm|shoulder|clavicle|humerus|radius|hand|finger)$/.test(part))return part.startsWith('left-')?2:3;
    if(/-(leg|femur|tibia|foot|toe)$/.test(part))return part.startsWith('left-')?4:5;
  }
  return /^(head|neck|skull|brain|jaw|nose|tongue)$/.test(part)||/-(eye|ear)$/.test(part)?1:0;
}
export function bodyBloodWord(record:MedicalRecord|undefined,absent?:(part:BodyPartId)=>boolean):number {
  if(!record)return 0;
  const model=medicalModel(record),regions=[0,0,0,0,0,0],rules=injuryPartRules(model);
  for(const injury of record.injuries){
    if(injury.severity<=0||injury.scar?.pain!==undefined||!model.byId[injury.part]||model.byId[injury.part].depth!=='outside'
      ||INJURY_RULES[injury.kind].bleedUnits===0||rules[injury.part].bleed===0
      ||absent?.(injury.part)||record.missing.some(m=>isWithinPart(injury.part,m.part,model)))continue;
    const region=bodyBloodRegion(injury.part,!!record.body);
    regions[region]=Math.max(regions[region]!,Math.min(3,Math.max(1,Math.ceil(injury.severity/(4*HP_UNIT*model.healthScale)))));
  }
  // A stump stains the parent silhouette, never the missing limb itself.
  for(const missing of record.missing){
    const part=model.byId[missing.part];
    if(!part||part.depth!=='outside'||rules[missing.part].bleed===0||record.tick-missing.bornAt>=FRESH_MISSING_TICKS)continue;
    const parent=part.parent;
    if(parent&&!absent?.(parent))regions[bodyBloodRegion(parent,!!record.body)]=Math.max(regions[bodyBloodRegion(parent,!!record.body)]!,2);
  }
  return regions.reduce((word,value,region)=>word+value*4**region,0);
}

/** Bind coordinates are explicitly carried into the fragment stage. Drawing
 * paint inside the existing material keeps marks attached through every rig
 * pose and requires neither a texture sample nor another draw. */
export function bodyBloodPigment(base:Node<'vec3'>,region:Node<'float'>,scale=1,eligible?:Node<'float'>,packedWord:Node<'float'>=attribute('aBodyBlood','float')) {
  return Fn(()=>{
    const pigment=base.toVar(),word=packedWord;
    If(word.greaterThan(0),()=>{
      const local=varying(attribute('position','vec3')).mul(scale),r=varying(region);
      const strength=word.div(float(4).pow(r)).floor().mod(4).div(3);
      const broad=sin(local.y.mul(7).add(local.z.mul(5)).add(r.mul(2.3)))
        .mul(sin(local.z.mul(6).sub(local.x.mul(8)).add(r))).mul(.5).add(.5);
      const scratches=sin(local.y.mul(61).add(local.x.mul(23)).add(r)).abs();
      const ink=broad.smoothstep(float(.80).sub(strength.mul(.32)),float(.91).sub(strength.mul(.22)))
        .mul(scratches.mul(.25).add(.75)).mul(strength.greaterThan(0).select(1,0)).mul(eligible??float(1));
      pigment.assign(mix(pigment,vec3(.30,.022,.032),ink.mul(.92)));
    });
    return pigment;
  })();
}
