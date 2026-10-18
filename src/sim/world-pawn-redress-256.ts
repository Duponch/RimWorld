import {nativeWorldPawnOrderCurrent256,commitNativeWorldPawnOrder256,orderedWorldPawnRows256} from './world-pawn-native-order-256.ts';
import {removeNativeWorldPawnOrder256} from './native-world-pawn-order-256.ts';
import {medicalBleed,partMissing} from './injury-state.ts';
import {medicalModel} from './body-model.ts';
import {animalNutritionMax} from './animal-life.ts';
import {prepareWorldPawnRemoval256} from './world-pawn-life-256.ts';
import {worldPawnSituation256,type ActualWorldPawnSituationReader256} from './world-pawn-capture-256.ts';
import {cancelWorldPawnGC256} from './world-pawn-gc-256.ts';
import type {InitialAnimalFact256} from './initial-animal-data-256.ts';
import type {InitialAnimalRandom256} from './initial-animal-age-256.ts';
import type {WorldPawnOwner256,WorldPawnsState256} from './world-pawn-state-256.ts';
import type {WildAnimal} from './wildlife-state.ts';
/** Read the REAL seen/relationship authorities. Undefined blocks the chosen
 * request; it never means unseen, unrelated, zero weight or permission to reroll. */
export type ActualWorldPawnSelectionWeight256=(original:WorldPawnOwner256)=>1|0.1|undefined;
export type WorldPawnSelection256={status:'fresh'}|{status:'selected';row:Extract<WorldPawnOwner256,{kind:'animal'}>}|{status:'blocked';reason:string};
const f=Math.fround;
export function worldPawnRedressChance256(freeCount:number):number {
 if(!Number.isSafeInteger(freeCount)||freeCount<0)throw Error('Invalid real Free owner count');return Math.min(f(f(.02)+f(f(.01)*f(f(freeCount)/f(10)))),f(.8));
}
/** Ordinary neutral wild request only (no forced, newborn or leader branch).
 * Candidate order is alive then mothballed, matching the actual WorldPawns
 * situation enumeration rather than ID sorting or old archive concatenation. */
export function selectWorldAnimalToRedress256(state:WorldPawnsState256,fact:InitialAnimalFact256,random:InitialAnimalRandom256,weight:ActualWorldPawnSelectionWeight256,situation:ActualWorldPawnSituationReader256):WorldPawnSelection256 {
 const resolved=orderedWorldPawnRows256(state).map(row=>({row,situation:worldPawnSituation256(row)??situation(row)}));if(resolved.some(r=>r.situation===undefined))return {status:'blocked',reason:'Actual Free count requires the missing situation authority'};
 const free=resolved.filter(r=>r.situation==='Free').map(r=>r.row);
 if(!(random.value()<worldPawnRedressChance256(free.length)))return {status:'fresh'};
 const ordered=[...free.filter(r=>r.mode==='active'),...free.filter(r=>r.mode==='mothballed')];
 let selected:Extract<WorldPawnOwner256,{kind:'animal'}>|undefined,total=0;
 for(const row of ordered){if(row.kind!=='animal'||row.actor.species!==fact.species||row.factionId!==null||row.actor.state==='downed')continue;
  const h=row.actor.health;if(h){const brain=medicalModel(h).parts.find(p=>p.nativeDefId==='Brain'||p.id==='brain');if(!brain)return {status:'blocked',reason:'Selected race has no resolved actual brain'};if(partMissing(h,brain.id))continue;
   // Existing bleed units do not expose the native low-rate epsilon. Never
   // exclude a possibly valid original to obtain a favorable fresh animal.
   if(medicalBleed(h)>0)return {status:'blocked',reason:'Redress low-rate bleeding admission needs actual native rate'};
  }
  const w=weight(row);if(w===undefined)return {status:'blocked',reason:'Actual seen/relationship selection weight is unavailable'};
  if(w!==1&&w!==.1)throw Error('Invalid actual WorldPawn selection weight');
  const actual=f(w);if(!selected){selected=row;total=actual;continue;}const next=f(total+actual);if(random.float(0,next)>=total)selected=row;total=next;
 }
 return selected?{status:'selected',row:selected}:{status:'fresh'};
}
export type PreparedWorldAnimalRedress256={ok:true;draft:WildAnimal;original:WildAnimal;current():boolean;adoptOriginal():WildAnimal;commit():WildAnimal}|{ok:false;reason:string};
/** This first closed redress path is a genuinely healthy neutral original.
 * An injured selected animal is blocked, not healed, skipped or rerolled: its
 * actual Hediff removeOnRedress curves and gear effects must be supplied first. */
export function prepareWorldAnimalRedress256(state:WorldPawnsState256,row:Extract<WorldPawnOwner256,{kind:'animal'}>,fact:InitialAnimalFact256,input:{tick:number;cell:{x:number;z:number};random:InitialAnimalRandom256;situation:ActualWorldPawnSituationReader256;version?:number}):PreparedWorldAnimalRedress256 {
 const nativeBefore=state.nativeOrder;if(!nativeWorldPawnOrderCurrent256(state,nativeBefore))return {ok:false,reason:'Actual native redress order is not mutable/admitted'};
 if(!state.owners.includes(row)||(worldPawnSituation256(row)??input.situation(row))!=='Free'||row.factionId!==null||row.actor.species!==fact.species||state.atCore!==input.tick*10)return {ok:false,reason:'Redress requires its actual current Free neutral owner'};
 const actor=row.actor,h=actor.health;
 if(h&&(h.injuries.length||h.missing.length||h.bloodLoss||Object.keys(h).some(k=>!['tick','nextInjuryId','injuries','missing','bloodLoss','body','animalBirthTick','animalGrowth'].includes(k))))return {ok:false,reason:'Chosen WorldPawn has actual clinical redress curves not yet represented'};
 if(row.items.length||row.packed.length||row.actor.domestic||row.actor.pregnancy||row.actor.manhunter||row.actor.confusion)return {ok:false,reason:'Chosen WorldPawn has actual held/mental/reproductive redress effects not yet represented'};
 // Core RedressPawn resets needs BEFORE RemovePawn's mothball remainder.
 // That new Food category is therefore the true growth hunger multiplier.
 const redressed=structuredClone(row),foodPercentage=input.random.float(.5,.9),rest=fact.needsRest?input.random.float(.9,1):1;
 redressed.actor.food=f(foodPercentage*animalNutritionMax(redressed.actor));redressed.actor.rest=rest;
 const removal=prepareWorldPawnRemoval256(redressed,state.atCore,input.version===263?{version:input.version,state,original:row}:undefined);if(!removal.ok)return removal;if(removal.draft.kind!=='animal')throw Error('Actual redress owner changed kind');
 // No MakeThing, sex/age/scar/chronological/growth initializer, gear or fresh
 // identity is replayed. Core neutral animal SetFaction is already null.
 const animal=removal.draft.actor;animal.x=input.cell.x;animal.z=input.cell.z;animal.path=[];animal.state='idle';animal.nextDecision=input.tick+1;
 // Notify_PawnRedressed changes only unrepresented human-meat/drug bookkeeping
 // for these neutral non-human originals; it does not Reset the mind again.
 const nativeAfter=nativeBefore?removeNativeWorldPawnOrder256(nativeBefore,row.actor.id):undefined;
 const atBefore=state.atCore,members=state.owners.slice(),before=JSON.stringify(row),prepared=JSON.stringify(animal);let used=false;
 const current=()=>!used&&state.atCore===atBefore&&row.actor===actor&&JSON.stringify(row)===before&&JSON.stringify(animal)===prepared&&Object.isExtensible(row.actor)&&Reflect.ownKeys(row.actor).every(k=>{const d=Object.getOwnPropertyDescriptor(row.actor,k)!;return Object.hasOwn(d,'value')&&d.configurable&&d.writable;});
 const adoptOriginal=()=>{if(!current())throw Error('Stale WorldPawn redress original');used=true;const original=actor;for(const k of Object.keys(original))delete (original as unknown as Record<string,unknown>)[k];Object.assign(original,animal);return original;};
 return {ok:true,draft:animal,original:actor,current,adoptOriginal,commit(){if(!current()||!nativeWorldPawnOrderCurrent256(state,nativeBefore)||state.owners.length!==members.length||state.owners.some((r,i)=>r!==members[i]))throw Error('Stale WorldPawn redress');cancelWorldPawnGC256(state);const original=adoptOriginal();state.owners=state.owners.filter(r=>r!==row);commitNativeWorldPawnOrder256(state,nativeBefore,nativeAfter);return original;}};
}
