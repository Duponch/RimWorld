import { assessBody,HEALTHY_BODY_INPUT,type BodyAssessment } from './body-capacities.ts';
import { mechanoidBodyModel } from './mechanoid-anatomy.ts';
import { isMechanoidKind,mechanoidDefinition,type MechanoidKind } from './mechanoid-definition.ts';
import { HP_UNIT } from './injury-rules.ts';
import { assessMedical,createMedicalRecord,medicalStatus,partMissing,reconcileMedicalDeath } from './injury-state.ts';
import { validateMechanoidMedicalRecord } from './injury-validation.ts';
import { cancelMelee } from './melee-state.ts';
import { cancelMechanoidRanged } from './mechanoid-ranged-state.ts';
import type { MedicalRecord } from './injury-types.ts';
import type { Mechanoid } from './mechanoid-state.ts';
import type { World } from './types.ts';

export type MechanicalBody={mechKind:MechanoidKind;health?:MedicalRecord};
const HEALTHY_MECHANICAL=Object.freeze({
  scyther:assessBody(HEALTHY_BODY_INPUT,mechanoidBodyModel('scyther')),
  lancer:assessBody(HEALTHY_BODY_INPUT,mechanoidBodyModel('lancer')),
  pikeman:assessBody(HEALTHY_BODY_INPUT,mechanoidBodyModel('pikeman')),
});
function ownerModel(owner:MechanicalBody){
  if(!isMechanoidKind(owner.mechKind)||owner.health&&owner.health.body!==owner.mechKind)throw Error('Mechanical owner and medical body disagree.');
  return mechanoidBodyModel(owner.mechKind);
}
export function createMechaMedicalRecord(tick=0,kind:MechanoidKind='scyther'):MedicalRecord {
  if(!isMechanoidKind(kind))throw Error('Unknown mechanical body.');
  return {...createMedicalRecord(tick),body:kind};
}
export function mechaAssessment(owner:MechanicalBody):BodyAssessment {
  ownerModel(owner);return owner.health?assessMedical(owner.health):HEALTHY_MECHANICAL[owner.mechKind];
}

/** SummaryHealthHandler product. Solid missing parts are never fresh
 * non-solid extremities, so only surviving injuries contribute to this score. */
export function mechaHealthScore(owner:MechanicalBody):number {
  ownerModel(owner);
  const record=owner.health;if(!record)return 1;if(record.death)return 0;
  let health=1;
  for(const i of record.injuries)health*=1-Math.min(i.severity/(75*mechanoidDefinition(owner.mechKind).healthScale*HP_UNIT),.95);
  return Math.max(.05,Math.min(1,health));
}
/** Injury alone never shrinks physical mass. Missing subtrees lose their
 * absolute residual coverage exactly once, including every descendant. */
export function mechaRemainingCoverage(owner:MechanicalBody):number {
  const model=ownerModel(owner);
  if(!owner.health?.missing.length)return 1;
  const record=owner.health;
  return Math.max(0,Math.min(1,model.parts.reduce((sum,p,i)=>sum+(partMissing(record,p.id)?0:model.coverage[i]!),0)));
}
export const mechaMass=(owner:MechanicalBody):number=>mechanoidDefinition(owner.mechKind).mass*mechaRemainingCoverage(owner);
export interface MechanoidImpactContext {externalViolence?:boolean}

/** The resolver owns a draft record and PRNG. Validate the whole result before
 * adopting either. Death-on-downed is probability one and consumes no draw;
 * captured travel and strike recovery remain physical after incapacitation. */
export function commitMechanoidImpact(w:World,m:Mechanoid,record:MedicalRecord,random:{rng:number},atCore:number,
  context:MechanoidImpactContext={}):boolean {
  if(w.schemaVersion<194||!w.mechanoids?.includes(m)||m.state==='dead'||m.health?.death
    ||!Number.isSafeInteger(atCore)||atCore<Math.max(0,(w.tick-1)*10)||atCore>w.tick*10
    ||!Number.isSafeInteger(random.rng)||random.rng<0||random.rng>0xffffffff
    ||context.externalViolence!==undefined&&typeof context.externalViolence!=='boolean'
    ||record.tick!==w.tick||validateMechanoidMedicalRecord(record,w.schemaVersion,m.mechKind))return false;
  const adopted=structuredClone(record);
  reconcileMedicalDeath(adopted);
  if(!adopted.death&&m.state!=='downed'&&medicalStatus(adopted)==='downed'&&(context.externalViolence??true))
    adopted.death={tick:adopted.tick,cause:'downed'};
  const status=medicalStatus(adopted),changed=m.state!==status;
  w.rng=random.rng;m.health=adopted;
  if(status!=='mobile'){
    m.state=status;m.path=[];if(m.raid)m.raid.goal=null;cancelMelee(m);cancelMechanoidRanged(m);delete m.stun;
    const group=w.raids?.mechActive;
    if(status==='dead'&&group?.members.includes(m.id)&&!group.lost.includes(m.id)){group.lost.push(m.id);group.lost.sort((a,b)=>a-b);}
    if(changed){w.events.push({tick:w.tick,type:'command',message:`${mechanoidDefinition(m.mechKind).label} ${m.id} ${status==='dead'?'est neutralisé':'est immobilisé'}.`});if(w.events.length>80)w.events.splice(0,w.events.length-80);}
  }else if(m.state==='downed'){m.state='idle';m.planCooldown=0;}
  return true;
}
