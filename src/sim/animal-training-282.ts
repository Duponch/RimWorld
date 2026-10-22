import {animalCore256,isAnimalSpecies256} from './animal-core-v256.ts';
import {PEN_ANIMALS_256} from './animal-domestic-v256.ts';
import {animalBodySize} from './animal-life.ts';
import {animalBody} from './wildlife-health.ts';
import {ITEM_DEFINITIONS,type ItemId} from './items.ts';
import {isSchema282OrLater} from './schema-compatibility-257.ts';
import type {CommandResult,World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
import {ANIMAL_TRAINING_SKILLS_282,ANIMAL_TRAINING_STEPS_282,ANIMAL_TRAINING_INTERVAL_CORE_282,ANIMAL_TRAINING_MIN_BODY_SIZE_282,isAnimalTrainingSkill282,type AnimalTrainingSkill282,type AnimalTrainingRead282,type AnimalTrainingState282,type AnimalTrainingAdvance282} from './animal-training-state-282.ts';

export {ANIMAL_TRAINING_SKILLS_282,ANIMAL_TRAINING_LABELS_282,ANIMAL_TRAINING_STEPS_282,ANIMAL_TRAINING_INTERVAL_CORE_282,ANIMAL_TRAINING_RARE_CORE_282,ANIMAL_TRAINING_CONVERSATION_CORE_282,ANIMAL_TRAINING_FINAL_CORE_282,ANIMAL_HAUL_CHECK_CORE_282,ANIMAL_HAUL_CHANCE_282,ANIMAL_TRAINING_MIN_BODY_SIZE_282,isAnimalTrainingSkill282} from './animal-training-state-282.ts';
export type {AnimalTrainingSkill282,AnimalTrainable282,AnimalTrainingState282,AnimalTrainingProgress282,AnimalTrainingRead282,AnimalTrainingAdvance282} from './animal-training-state-282.ts';

const f=Math.fround;
const unchanged=():AnimalTrainingAdvance282=>({becameWild:false});
const even=(value:number):number=>{const n=Math.floor(value),fraction=value-n;return fraction<.5?n:fraction>.5?n+1:n%2===0?n:n+1;};
const full=(a:WildAnimal,skill:AnimalTrainingSkill282):boolean=>{const state=readAnimalTraining282(a,skill);return state.learned&&state.steps===state.maxSteps;};
const wildness=(a:WildAnimal):number|undefined=>isAnimalSpecies256(a.species)?animalCore256(a.species).stats.Wildness:a.species==='hare'?.75:undefined;
/** RoundToEven(SimpleCurve[(0,12),(1,6)](Wildness)*60000f).
 * Only the admitted Core profiles and the already-attested historical hare
 * have a new tracker; other legacy species retain their old pathway. */
export function animalTrainingDecayPeriodCore282(a:WildAnimal):number|undefined {
 const value=wildness(a);return value===undefined?undefined:even(f(f(f(12)+f(f(-6)*f(value)))*f(60000)));
}
export function readAnimalTraining282(a:WildAnimal,skill:AnimalTrainingSkill282):AnimalTrainingRead282 {
 const maxSteps=ANIMAL_TRAINING_STEPS_282[skill];
 if(skill==='tameness')return {steps:a.domestic?.tameness??0,learned:!!a.domestic,wanted:a.training?.tamenessWanted??!!a.domestic,maxSteps};
 const explicit=a.training?.[skill];if(explicit)return {...explicit,maxSteps};
 // The receipt is initial evidence, never a repair for a later explicit zero.
 if(skill==='obedience'&&a.startingPet?.obedience)return {steps:3,learned:true,wanted:true,maxSteps};
 return {steps:0,learned:false,wanted:false,maxSteps};
}

/** Refusal of ASSIGNMENT, not of the next lesson. Incomplete prerequisites,
 * cooldown and sleep do not prevent requesting their future training. The
 * command producer below resolves the actual local original by ID. */
export function trainingRefusal282(w:Pick<World,'schemaVersion'>,a:WildAnimal,skill:AnimalTrainingSkill282):string|undefined {
 if(!isSchema282OrLater(w.schemaVersion))return 'Ce dressage exige une sauvegarde actuelle.';
 if(!isAnimalTrainingSkill282(skill))return 'Aptitude animale inconnue.';
 if(!a.domestic)return 'Cet animal n’appartient pas à la colonie.';
 if(a.state==='dead')return 'Cet animal est mort.';
 if(a.shipCryptosleepHeldAt277!==undefined)return 'Cet animal est dans un caisson.';
 if(!isAnimalSpecies256(a.species))return skill==='tameness'&&a.species==='hare'?undefined:'Ce profil historique ne dispose pas de cette voie de dressage.';
 const intelligence=animalCore256(a.species).race.trainability;
 if(skill==='obedience'&&intelligence!=='Intermediate'&&intelligence!=='Advanced'||skill==='haul'&&intelligence!=='Advanced')return 'La trainabilité de cette espèce ne permet pas cette aptitude.';
 if(animalBodySize(a)<ANIMAL_TRAINING_MIN_BODY_SIZE_282[skill])return 'Cet animal est encore trop petit pour cette aptitude.';
}

/** Only a REAL changed player intent adopts the prospective tracker. No load,
 * no-op checkbox or migration grants progress or resets an existing deadline. */
export function setAnimalTrainingWanted282(w:World,animalId:number,skill:AnimalTrainingSkill282,wanted:boolean):CommandResult {
 if(!Number.isSafeInteger(animalId)||animalId<=0||!isAnimalTrainingSkill282(skill)||typeof wanted!=='boolean')return {ok:false,reason:'Demande de dressage invalide.'};
 const a=w.wildlife?.animals.find(value=>value.id===animalId);if(!a)return {ok:false,reason:'Animal local introuvable.'};
 const reason=trainingRefusal282(w,a,skill);if(reason)return {ok:false,reason};
 const current=readAnimalTraining282(a,skill);
 if(current.wanted===wanted)return {ok:true,affected:0};
 const now=w.tick*10,period=animalTrainingDecayPeriodCore282(a),deadline=a.domestic!.nextDecay*10,lastAttempt=a.domestic!.lastTraining;
 if(!Number.isSafeInteger(now)||now<0||period===undefined||!Number.isSafeInteger(now+period)||!Number.isSafeInteger(deadline)||deadline<0||lastAttempt!==undefined&&(!Number.isSafeInteger(lastAttempt*10)||lastAttempt<0||lastAttempt>w.tick))return {ok:false,reason:'Horloge de dressage indisponible.'};
 let state=a.training;
 if(!state){
  const obedience=readAnimalTraining282(a,'obedience'),haul=readAnimalTraining282(a,'haul');
  state={revision:1,sinceCore:now,lastLocalCore:now,nextDecayCore:deadline,tamenessWanted:true,
   obedience:{steps:obedience.steps,learned:obedience.learned,wanted:obedience.wanted},haul:{steps:haul.steps,learned:haul.learned,wanted:haul.wanted},
   ...(lastAttempt===undefined?{}:{lastAttemptCore:lastAttempt*10}),...(a.startingPet?.masterId===undefined?{}:{masterId:a.startingPet.masterId})};
 }
 // Work on a fresh shape until all intent changes are known; acquired steps
 // are untouched. The dependency chain is fixed and bounded to three skills.
 const obedience=readAnimalTraining282(a,'obedience'),haul=readAnimalTraining282(a,'haul');
 const next:AnimalTrainingState282={...state,
  obedience:{steps:obedience.steps,learned:obedience.learned,wanted:obedience.wanted},
  haul:{steps:haul.steps,learned:haul.learned,wanted:haul.wanted}};
 const index=ANIMAL_TRAINING_SKILLS_282.indexOf(skill);
 for(let i=0;i<ANIMAL_TRAINING_SKILLS_282.length;i++)if(wanted?i<=index:i>=index){
  const entry=ANIMAL_TRAINING_SKILLS_282[i]!;if(entry==='tameness')next.tamenessWanted=wanted;else next[entry]!.wanted=wanted;
 }
 a.training=next;return {ok:true,affected:1};
}

function lessonAvailable(w:World,a:WildAnimal):boolean {
 return isSchema282OrLater(w.schemaVersion)&&!!a.training&&!!a.domestic&&!['dead','downed','sleeping','eating'].includes(a.state)
  &&a.shipCryptosleepHeldAt277===undefined&&!a.manhunter&&!a.confusion&&!a.stun&&!a.burning&&!a.flee&&!a.exiting
  &&!(a.health?.foodPoisoning?.vomit||a.health?.cryptosleepSickness?.vomit||a.health?.toxicBuildup?.vomit||a.health?.toxicBuildup?.vomitRequestedAt!==undefined)
  &&(a.training.lastAttemptCore===undefined||w.tick*10>=a.training.lastAttemptCore+ANIMAL_TRAINING_INTERVAL_CORE_282)
  &&animalBody(a).canBeAwake;
}
/** Wanted priority follows Tameness -> Obedience -> Haul. A prerequisite must
 * still be learned AND maintained to its full steps before a new lesson. */
export function nextTrainable282(w:World,a:WildAnimal):AnimalTrainingSkill282|undefined {
 if(!lessonAvailable(w,a))return;
 for(const skill of ANIMAL_TRAINING_SKILLS_282){
  const state=readAnimalTraining282(a,skill);if(!state.wanted||state.steps>=state.maxSteps||trainingRefusal282(w,a,skill))continue;
  if(skill==='obedience'&&!full(a,'tameness')||skill==='haul'&&(!full(a,'tameness')||!full(a,'obedience')))continue;
  return skill;
 }
}

/** The service calls ONCE at the real final interaction, after XP/stat/draw.
 * success is supplied by that producer: this module never consumes RNG.
 * true means a real attempt was accepted (even if its success was false). */
export function completeAnimalTraining282(w:World,a:WildAnimal,skill:AnimalTrainingSkill282,success:boolean,trainerId?:number):boolean {
 if(typeof success!=='boolean'||!isAnimalTrainingSkill282(skill)||!w.wildlife?.animals.includes(a)||nextTrainable282(w,a)!==skill)return false;
 if(trainerId!==undefined&&(!Number.isSafeInteger(trainerId)||trainerId<=0||!w.pawns.some(p=>p.id===trainerId)))return false;
 const now=w.tick*10,period=animalTrainingDecayPeriodCore282(a);if(period===undefined||!Number.isSafeInteger(now+period))return false;
 const previous=readAnimalTraining282(a,skill),state=a.training!;
 state.lastAttemptCore=now;
 if(!success)return true;
 const steps=Math.min(previous.maxSteps,previous.steps+1),learned=previous.learned||steps===previous.maxSteps;
 if(skill==='tameness')a.domestic!.tameness=steps;
 else state[skill]={steps,learned,wanted:previous.wanted};
 if(!previous.learned&&learned){
  state.nextDecayCore=now+period;
  if(skill==='obedience'&&state.masterId===undefined&&trainerId!==undefined)state.masterId=trainerId;
 }
 return true;
}

/** Sparse local caller. Missing calls mean actual absence: compensate only
 * the absent gap, so caisson/group callers MUST NOT separately shift this
 * deadline. No catch-up loop and no artificial lesson is ever replayed. */
export function advanceAnimalTraining282(w:World,a:WildAnimal):AnimalTrainingAdvance282 {
 const state=a.training;if(!state||!isSchema282OrLater(w.schemaVersion)||a.state==='dead'||a.shipCryptosleepHeldAt277!==undefined)return unchanged();
 const now=w.tick*10;if(now<=state.lastLocalCore)return unchanged();
 const period=animalTrainingDecayPeriodCore282(a);if(period===undefined)return unchanged();
 const gap=now-state.lastLocalCore,next=state.nextDecayCore+Math.max(0,gap-10);
 if(!Number.isSafeInteger(now)||!Number.isSafeInteger(next)||!Number.isSafeInteger(now+period))throw Error('Animal training clock exhausted');
 state.nextDecayCore=next;state.lastLocalCore=now;
 if(w.tick%25!==a.id%25)return unchanged();
 if(!a.domestic){state.nextDecayCore=now+period;return unchanged();}
 if(now<state.nextDecayCore)return unchanged();
 // Only one leaf exists in this delivered chain. Unimplemented native
 // trainables are not invented, and no unrelated global RNG is consumed.
 const leaf:AnimalTrainingSkill282=readAnimalTraining282(a,'haul').steps>0?'haul':readAnimalTraining282(a,'obedience').steps>0?'obedience':'tameness';
 state.nextDecayCore=now+period;
 if(leaf==='tameness'){
  const exempt=isAnimalSpecies256(a.species)?animalCore256(a.species).stats.Wildness<=f(.101)||PEN_ANIMALS_256.includes(a.species):false;
  if(exempt)return unchanged();
  a.domestic.tameness--;
  if(a.domestic.tameness<=0){delete a.domestic;delete a.taming;return {becameWild:true,decayed:leaf};}
 } else {
  const previous=readAnimalTraining282(a,leaf),steps=previous.steps-1;
  state[leaf]={steps,learned:steps>0&&previous.learned,wanted:previous.wanted};
 }
 return {becameWild:false,decayed:leaf};
}

/** Learned behavior is independent of wanted. Urgent needs, claims and
 * physical storage selection are composed by the actual wildlife caller. */
export function canAnimalHaul282(w:Pick<World,'schemaVersion'>,a:WildAnimal):boolean {
 if(!isSchema282OrLater(w.schemaVersion)||!a.domestic||!readAnimalTraining282(a,'haul').learned||!a.training
  ||['dead','downed','sleeping','eating'].includes(a.state)||a.shipCryptosleepHeldAt277!==undefined||a.manhunter||a.confusion||a.stun||a.burning||a.flee||a.exiting||a.flight||a.exitFlight)return false;
 const body=animalBody(a);return body.canBeAwake&&body.movingCapable&&body.capacities.manipulation>0;
}
/** Local CarryTracker capacity is VOLUME, not caravan pack mass. The two
 * precious-metal item defs alone have smallVolume=.1; other current items
 * use1 (legacy-portion/chunk are declared compatibility adaptations). */
export function animalCarryLimit282(a:WildAnimal,item:ItemId):number {
 if(!Object.hasOwn(ITEM_DEFINITIONS,item)||a.state==='dead'||a.state==='downed')return 0;
 const body=animalBody(a);if(!body.canBeAwake||body.capacities.manipulation<=0)return 0;
 const capacity=Math.max(1,f(f(f(75)*f(animalBodySize(a)))*f(body.capacities.manipulation)));
 const volume=item==='silver'||item==='gold'?f(.1):1;
 return Math.min(ITEM_DEFINITIONS[item].stackLimit,Math.max(0,even(f(capacity/volume))));
}
