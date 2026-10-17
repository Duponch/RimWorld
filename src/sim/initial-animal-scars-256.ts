import {nativeAnimalAnatomy256} from './native-animal-anatomy-256.ts';
import {trackedAnimalLifeStage256} from './animal-growth-runtime-256.ts';
/** Original prospective initial-scar producer. The private map transaction owns
 * the stream and clock. No damage worker, healing roll or infection is run. */
import {animalCore256,isAnimalSpecies256,animalLifeStageData256} from './animal-core-v256.ts';
import {CORE_ANIMAL_BODIES_256,type AnimalBodyDef256} from './animal-anatomy-data-v256.ts';
import {animalPartId256} from './animal-anatomy-v256.ts';
import {createAnimalMedicalRecord256} from './animal-clinical-age-v256.ts';
import {assessMedical,medicalStatus,remainingPartHealth,partMissing} from './injury-state.ts';
import {HP_UNIT,type InjuryKind,type ScarPain} from './injury-rules.ts';
import type {Injury,MedicalRecord} from './injury-types.ts';
import type {InitialAnimalFact256} from './initial-animal-data-256.ts';
import type {InitialAnimalRandom256} from './initial-animal-age-256.ts';
const f=Math.fround;
/** XML facts after inheritance; every amputable stays in the weighted pool,
 * including the solid claws whose permanent-injury factor is zero. */
const AMPUTABLE=new Set(['Finger','Toe','FrontClaw','RearClaw']);
type BodyRow=typeof CORE_ANIMAL_BODIES_256[AnimalBodyDef256][number];
type Ticket={row:BodyRow;weight:number};
const cached=new Map<AnimalBodyDef256,readonly Ticket[]>();
export function initialAnimalScarTickets256(body:AnimalBodyDef256):readonly Ticket[] {
 const hit=cached.get(body);if(hit)return hit;
 const rows:readonly BodyRow[]=CORE_ANIMAL_BODIES_256[body],absolute:number[]=[];
 const tickets:Ticket[]=[];
 for(const row of rows){
  // Subtract children in recorded order, rounding each arithmetic operation.
  // coverageAbs is the residual part, not coverageAbsWithChildren.
  const subtree=row.parent===null?1:f(absolute[row.parent]!*f(row.coverage));absolute[row.index]=subtree;
  let residual=f(1);for(const child of rows)if(child.parent===row.index)residual=f(residual-f(child.coverage));
  if(Math.abs(residual)<f(.00001)||residual<=0)residual=0;
  if(row.depth==='outside'&&(row.scarFactor!==0||AMPUTABLE.has(row.defId)))tickets.push(Object.freeze({row,weight:f(subtree*residual)}));
 }
 const result=Object.freeze(tickets);cached.set(body,result);return result;
}
function drawTicket(tickets:readonly Ticket[],random:InitialAnimalRandom256):Ticket|undefined {
 if(!tickets.length)return;
 let total=0;for(const ticket of tickets)total=f(total+ticket.weight);
 if(total<=0)throw Error('Initial scar has no positive anatomical coverage');
 if(tickets.length===1)return tickets[0];
 const roll=f(random.value()*total);let accumulated=0;
 for(const ticket of tickets)if(ticket.weight>0){accumulated=f(accumulated+ticket.weight);if(accumulated>=roll)return ticket;}
 throw Error('Initial scar coverage roll outside its recorded body');
}
function drawPain(random:InitialAnimalRandom256):ScarPain {
 const weights=[f(.5),f(.2),f(.2),f(.1)],pains=[0,1,3,6] as const;
 let total=0;for(const weight of weights)total=f(total+weight);
 const roll=f(random.value()*total);let accumulated=0;
 for(let i=0;i<weights.length;i++){accumulated=f(accumulated+weights[i]!);if(accumulated>=roll)return pains[i]!;}
 throw Error('Initial scar pain roll outside its weights');
}
export type InitialAnimalScars256=
 |{status:'represented';health?:MedicalRecord}
 |{status:'blocked';reason:'legacy-anatomy'|'clinical-stage-boundary'|'amputation-nonfresh'|'scar-part-loss'|'clinical-downing';partIndex?:number};
/** The fresh, natural no-DLC owner has no added parts or preexisting missing
 * parts. Accepted losses use the existing nonFresh missing-part representation;
 * a WouldDie rejection never replaces the selected ticket. Birthday givers remain
 * separate selection frontier. */
export function drawInitialAnimalScars256(fact:InitialAnimalFact256,ageCoreTicks:number,count:number,stageHealthFactor:number,tick:number,random:InitialAnimalRandom256,owner?:Pick<import('./wildlife-state.ts').WildAnimal,'species'|'ageTicks'|'ageCoreRemainder'|'growthTracker'>):InitialAnimalScars256 {
 if(!count)return {status:'represented'};
 if(!isAnimalSpecies256(fact.species)&&!owner?.growthTracker)return {status:'blocked',reason:'legacy-anatomy'};
 const ageTicks=Math.floor(ageCoreTicks/10),definition=nativeAnimalAnatomy256(fact.species),body=definition.body;
 // The persisted integer clinical clock must project the same true stage.
 // Never move the birth anchor to conceal an unrepresented epsilon boundary.
 if(owner?(owner.species!==fact.species||owner.ageTicks*10+(owner.ageCoreRemainder??0)!==ageCoreTicks||!owner.growthTracker||f(trackedAnimalLifeStage256(owner.species,owner.growthTracker).healthScaleFactor)!==f(stageHealthFactor)):f(animalLifeStageData256(fact.species as import('./animal-core-data-v256.ts').AnimalSpeciesId256,ageTicks).healthScaleFactor)!==f(stageHealthFactor))return {status:'blocked',reason:'clinical-stage-boundary'};
 let record=createAnimalMedicalRecord256({tick,schemaVersion:256},owner??{species:fact.species,ageTicks});
 const rows:readonly BodyRow[]=CORE_ANIMAL_BODIES_256[body],tickets=initialAnimalScarTickets256(body);
 const under=(index:number,ancestor:number)=>{for(let p:number|null=index;p!==null;p=rows[p]!.parent)if(p===ancestor)return true;return false;};
 for(let i=0;i<count;i++){
  const selected=drawTicket(tickets.filter(t=>!partMissing(record,animalPartId256(body,t.row.index))),random);if(!selected)continue;
  const row=selected.row,part=animalPartId256(body,row.index);
  // Animals are not ToolUser: the frostbite-vulnerable part does not add a
  // fifth damage type. Solid overrides resolve before the permanent gate.
  const damage=random.integer(0,4),kind:InjuryKind=row.solid&&damage!==0?'crack':(['gunshot','cut','bite','stab'] as const)[damage]!;
  if(AMPUTABLE.has(row.defId)&&random.value()<f(.3)){
   // MakeHediff(MissingBodyPart) has inherited initialSeverity0.5 and one
   // causesNoPain draw. WouldDie is a temporary append, not PostAdd.
   random.value();
   const candidate:MedicalRecord={...record,injuries:[...record.injuries],missing:[...record.missing,{part,bornAt:tick,nonFresh:true}]};
   if(remainingPartHealth(record,part)<=HP_UNIT/2)for(const child of rows)if(under(child.index,row.index))random.value();
   if(assessMedical(candidate).vitalFailure||f(candidate.injuries.reduce((sum,value)=>f(sum+f(value.severity/HP_UNIT)),0))>=f(150*f(f(definition.baseHealthScale)*f(stageHealthFactor))))continue;
   // The chosen Missing already exists. Its real PostAdd creates descendants
   // in body order; the clinical format stores only their common ancestor.
   for(const child of rows)if(child.index!==row.index&&under(child.index,row.index))random.value();
   record={...record,injuries:record.injuries.filter(i=>!under(rows.find(r=>animalPartId256(body,r.index)===i.part)!.index,row.index)),missing:record.missing.filter(m=>!under(rows.find(r=>animalPartId256(body,r.index)===m.part)!.index,row.index))};
   record.missing.push({part,bornAt:tick,nonFresh:true});
   if(medicalStatus(record)==='downed')return {status:'blocked',reason:'clinical-downing',partIndex:row.index};
   continue;
  }
  if(row.scarFactor<=0)continue;
  // Hediff.PostMake consumes causesNoPain even when its chance is zero.
  // TendDuration, Infecter and GetsPermanent have no extra CompPostMake RNG.
  random.value();
  const severity=random.integer(2,7)*HP_UNIT,pain=drawPain(random);
  const injury:Injury={id:record.nextInjuryId,part,kind,severity,bornAt:tick,scar:{threshold:severity,pain}};
  const candidate:MedicalRecord={...record,injuries:[...record.injuries,injury],missing:[...record.missing]};
  const losesPart=row.parent!==null&&severity>=remainingPartHealth(record,part);
  // WouldDie temporarily creates a MissingBodyPart for the chosen part AND
  // each descendant. Each constructor consumes causesNoPain, even when the
  // predicate ultimately rejects this injury. These temporary records never
  // enter the saved owner.
  if(losesPart)for(const child of rows)if(under(child.index,row.index)){random.value();candidate.missing.push({part:animalPartId256(body,child.index),bornAt:tick,nonFresh:true});}
  const scale=f(f(definition.baseHealthScale)*f(stageHealthFactor));
  const lethal=assessMedical(candidate).vitalFailure||f(candidate.injuries.reduce((sum,value)=>f(sum+f(value.severity/HP_UNIT)),0))>=f(150*scale);
  if(lethal)continue; // Actual tryNotToKill rejection, not a favorable reroll.
  if(losesPart){
   // The successful REAL AddHediff repeats Missing construction after the
   // temporary WouldDie records have gone. No temporary injury survives.
   for(const child of rows)if(under(child.index,row.index))random.value();
   record={...record,nextInjuryId:record.nextInjuryId+1,
    injuries:record.injuries.filter(i=>!under(rows.find(r=>animalPartId256(body,r.index)===i.part)!.index,row.index)),
    missing:record.missing.filter(m=>!under(rows.find(r=>animalPartId256(body,r.index)===m.part)!.index,row.index))};
   record.missing.push({part,bornAt:tick,nonFresh:true});
   if(medicalStatus(record)==='downed')return {status:'blocked',reason:'clinical-downing',partIndex:row.index};
   continue;
  }
  // Scratch maps to the existing Cut clinical category only after it has
  // become permanent. Both have the same permanent pain and nonmerging rule;
  // this never introduces an ordinary healable wound.
  record={...candidate,nextInjuryId:record.nextInjuryId+1};
  if(medicalStatus(record)==='downed')return {status:'blocked',reason:'clinical-downing',partIndex:row.index};
 }
 return record.injuries.length||record.missing.length?{status:'represented',health:record}:{status:'represented'};
}
