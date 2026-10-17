import {validHumanHealthScaleHeader256} from './native-human-clinical-scale-256.ts';
import {clinicalConditionPartFacts256} from './clinical-condition-parts-256.ts';
import {isAnimalSpecies256} from './animal-core-v256.ts';
import {isAnimalSpecies} from './animal-species.ts';
import {createAnimalMedicalRecord256} from './animal-clinical-age-v256.ts';
import {medicalModel} from './body-model.ts';
import {ANIMAL_BIRTHDAY_KINDS_256,ANIMAL_AGE_CONDITION_DEFINITIONS_256 as definitions,animalBirthdayChance256,type AnimalBirthdayKind256,type AnimalAgeConditionKind256} from './animal-age-condition-data-256.ts';
import type {AnimalAgeConditionCase256,AnimalAgeMedical256} from './animal-age-condition-state-256.ts';
import type {InitialAnimalFact256} from './initial-animal-data-256.ts';
import type {InitialAnimalRandom256} from './initial-animal-age-256.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {BodyPartId} from './body-definition.ts';
const f=Math.fround;
type ActualOwner256=Pick<WildAnimal,'species'|'ageTicks'|'ageCoreRemainder'|'growthTracker'>;
export type AnimalBirthdayApplication256={status:'applied';added:AnimalAgeConditionCase256[]}|{status:'not-applied';reason:'no-eligible-part'}|{status:'blocked';reason:'legacy-anatomy'};
function covers(record:AnimalAgeMedical256,part:BodyPartId,ancestor:BodyPartId):boolean {const model=medicalModel(record);for(let p:BodyPartId|null=part;p!==null;p=model.byId[p]!.parent)if(p===ancestor)return true;return false;}
function eligiblePartTickets256(record:AnimalAgeMedical256,kind:AnimalAgeConditionKind256):{part:BodyPartId;weight:number}[] {
 const model=medicalModel(record),rows=clinicalConditionPartFacts256(model,record),def=definitions[kind],absolute=new Map<BodyPartId,number>(),tickets:{part:BodyPartId;weight:number}[]=[];
 for(const row of rows){const part=row.part,subtree=row.parent===null?1:f(absolute.get(row.parent)!*f(row.coverage));absolute.set(part,subtree);
  if(def.part!==undefined&&row.defId!==def.part||def.anyLive&&!row.alive||record.missing.some(m=>covers(record,part,m.part))||record.artificialParts?.some(p=>covers(record,part,p.part))||record.animalAgeConditions?.cases.some(c=>c.kind===kind&&c.part===part))continue;
  let rest=f(1);for(const child of rows)if(child.parent===row.part)rest=f(rest-f(child.coverage));if(Math.abs(rest)<f(.00001)||rest<=0)rest=0;
  tickets.push({part,weight:f(subtree*rest)});
 }
 return tickets;
}
function rollPart256(record:AnimalAgeMedical256,kind:AnimalAgeConditionKind256,random:InitialAnimalRandom256):BodyPartId|undefined {
 const tickets=eligiblePartTickets256(record,kind);
 if(!tickets.length)return;if(tickets.length===1)return tickets[0]!.part;
 let total=0;for(const ticket of tickets)total=f(total+ticket.weight);if(total<=0)throw Error('Selected birthday organs have zero coverage');
 const roll=f(random.value()*total);let accumulated=0;for(const ticket of tickets)if(ticket.weight>0){accumulated=f(accumulated+ticket.weight);if(accumulated>=roll)return ticket.part;}
 throw Error('Birthday organ roll outside actual coverage');
}
/** A true TryApply attempt. The caller owns a private generation transaction
 * or the real live record; no load/guard path calls this producer. */
export function tryApplyAnimalAgeCondition256(record:AnimalAgeMedical256,kind:AnimalAgeConditionKind256,random:InitialAnimalRandom256,afterInitialHumanAdd?:()=>boolean):AnimalBirthdayApplication256 {
 if(!Object.hasOwn(definitions,kind))throw Error('Unknown animal condition');
 const nativeHuman=record.body===undefined&&Object.hasOwn(record,'humanHealthScale')&&validHumanHealthScaleHeader256(record,256);
 if(record.body!==undefined&&!isAnimalSpecies(record.body)||kind!=='Dementia'&&kind!=='Carcinoma'&&!nativeHuman&&(!isAnimalSpecies(record.body)||!isAnimalSpecies256(record.body)&&record.animalGrowth===undefined))return {status:'blocked',reason:'legacy-anatomy'};
 if(afterInitialHumanAdd&&!nativeHuman)throw Error('Initial human health continuation requires its actual native projection');
 if(record.death)throw Error('A dead original cannot gain a birthday condition');
 const added:AnimalAgeConditionCase256[]=[],def=definitions[kind],actualCount=Math.min(def.count,eligiblePartTickets256(record,kind).length);
 if(!actualCount)return {status:'not-applied',reason:'no-eligible-part'};
 if(!Number.isSafeInteger((record.animalAgeConditions?.nextId??1)+actualCount))throw Error('Animal condition identities exhausted');
 for(let i=0;i<def.count;i++){
  const part=rollPart256(record,kind,random);if(part===undefined)break;
  const state=record.animalAgeConditions??{revision:1 as const,nextId:1,cases:[]};if(!Number.isSafeInteger(state.nextId+1))throw Error('Animal condition identities exhausted');
  const c:AnimalAgeConditionCase256={id:state.nextId,kind,part,bornAt:record.tick,ageCore:0,severity:f(def.initial),noPain:random.value()<f(def.noPainChance)};
  if(kind==='Dementia'&&!record.body)c.skillDecayRemainders={};
  if(kind==='Carcinoma'){c.tend={ticksLeft:-1,quality:0,totalQuality:0};c.growth={mode:random.integer(0,3) as 0|1|2,growingFactor:random.float(f(.45),f(1.65)),remissionFactor:random.float(f(.7),f(1.5))};}
  else if(kind==='Asthma')c.tend={ticksLeft:-1,quality:0,totalQuality:0};
  else if(kind==='HeartArteryBlockage')c.severityFactor=random.float(f(.5),f(3));
  else if(kind==='HeartAttack')c.intervalFactor=random.float(f(.1),f(2));
  record.animalAgeConditions=state;state.nextId++;state.cases.push(c);added.push(c);
  // Real initial Notify_HediffChanged must precede the next part or severity
  // simulation. Stop at actual missing terminal/downing effects; no reroll.
  if(afterInitialHumanAdd&&!afterInitialHumanAdd())break;
 }
 return added.length?{status:'applied',added}:{status:'not-applied',reason:'no-eligible-part'};
}
/** Initial severity simulation is NOT elapsed biological time and does not
 * evolve/tend a whole record or create a historical condition clock. */
export function simulateAnimalBirthdaySeverity256(c:AnimalAgeConditionCase256,actualAgeCore:number,gotAtYear:number,random:InitialAnimalRandom256,tryNotToKill:boolean):void {
 const def=definitions[c.kind];if(!def.pastSeverityPerDay)return;
 const years=f(f(actualAgeCore)/3600000),days=f(f(years-f(gotAtYear))*60);if(days<0)throw Error('Birthday cannot follow actual biological age');
 let severity=f(f(f(f(def.pastSeverityPerDay)*days)*random.float(f(.5),f(1.4)))+f(def.initial));
 if(tryNotToKill){const index=def.stages.findIndex(s=>s.lifeThreatening);if(index>=0){const boundary=index===0?f(def.stages[0]!.min):f(f(f(def.stages[index]!.min)+f(def.stages[index-1]!.min))/2);severity=Math.min(severity,boundary);}}
 c.severity=Math.max(f(def.min),Math.min(f(def.max),severity));
}
export type InitialAnimalBirthdayResult256={status:'represented';health?:AnimalAgeMedical256}|{status:'blocked';reason:'legacy-anatomy';defId:AnimalBirthdayKind256;year:number};
/** Same actual initial stream, scars already present, and original already
 * has its true growth. A rejected application continues without invented RNG. */
export function drawInitialAnimalBirthdays256(owner:ActualOwner256,health:AnimalAgeMedical256|undefined,fact:InitialAnimalFact256,tick:number,random:InitialAnimalRandom256):InitialAnimalBirthdayResult256 {
 if(owner.species!==fact.species||!Number.isSafeInteger(tick)||tick<0||!owner.growthTracker)throw Error('Initial birthday requires the actual prospective original');
 const ageCore=owner.ageTicks*10+(owner.ageCoreRemainder??0),years=Math.floor(ageCore/3600000);if(!Number.isSafeInteger(ageCore)||ageCore<0)throw Error('Invalid actual biological birthday age');
 let record=health;
 for(let year=1;year<years;year++)for(const kind of ANIMAL_BIRTHDAY_KINDS_256){const fraction=f(f(year)/f(fact.lifeExpectancy));if(!(random.value()<animalBirthdayChance256(kind,fraction)))continue;
  const candidate=record??createAnimalMedicalRecord256({tick,schemaVersion:256},owner),applied=tryApplyAnimalAgeCondition256(candidate,kind,random);
  if(applied.status==='blocked')return {status:'blocked',reason:applied.reason,defId:kind,year};
  if(applied.status==='applied'){record=candidate;for(const c of applied.added)simulateAnimalBirthdaySeverity256(c,ageCore,year,random,true);}
 }
 return {status:'represented',...(record?{health:record}:{})};
}
