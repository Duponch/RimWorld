import {freshMissing,injuryBleed} from './injury-state.ts';
import type {MedicalRecord} from './injury-types.ts';
import type {AncientCasketState256,AncientHeldPile256} from './ancient-casket-state-256.ts';
import {medicalCivilTick271,prepareSuspendedHumanResume271} from './suspended-human-clock-271.ts';
type NumberWrite={object:object;key:string;before:number;after:number};
export interface AncientResumeClock256 {readonly writes:readonly NumberWrite[];current():boolean;commit():boolean}
const add=(writes:NumberWrite[],object:object,key:string,delta:number)=>{
 const before=(object as Record<string,unknown>)[key];if(typeof before!=='number'||!Number.isSafeInteger(before)||!Number.isSafeInteger(before+delta))throw Error('Invalid actual suspended numeric clock');
 writes.push({object,key,before,after:before+delta});
};
/** No evolution, random draw, healing or date-of-origin rewrite. Only future
 * deadlines/clock anchors advance over the explicitly owned suspension span. */
function medical(writes:NumberWrite[],h:MedicalRecord|undefined,delta:number):void {
 if(!h||h.death)return;
 add(writes,h,'tick',delta);const core=delta*10;
 // These actual tend deadlines freeze; the physiological meters do not tick.
 for(const condition of [...(h.infections?.cases??[]),...(h.flu?[h.flu]:[]),...Object.values(h.immuneDiseases??{})])if(condition?.tend)add(writes,condition.tend,'expiresAtCore',core);
}
/** Real captured clinical owner: alive tick is heldAt; terminal tick is its
 * original death tick. No fallback to current map time is permitted. */
export function ancientCasketClinicalClock256(s:AncientCasketState256,p:import('./types.ts').Pawn):number {
 if(!s.humans.includes(p)||!Number.isSafeInteger(s.heldAt)||s.heldAt<0)throw Error('Missing actual suspended human owner');
 const h=p.health;if(!h)return s.heldAt;
 if(h.death){if(h.tick!==h.death.tick||h.tick>s.heldAt)throw Error('Invalid original suspended terminal clock');return h.tick;}
 if(h.tick!==s.heldAt)throw Error('Living clinical clock differs from actual holder');return h.tick;
}
/** Existing absolute clinical dates need their own completed suspension
 * reader before they can resume. Keep the real held record, never rewrite
 * bornAt, fabricate offsets, cure it, or replay the skipped physiology. */
export function ancientResumeBoundary256(s:AncientCasketState256,version=270):string|null {
 if(version>=271)return null;
 for(const p of s.humans){const h=p.health;if(!h||h.death)continue;
  if(h.anesthetic)return 'Actual anesthetic suspension pulse/deadline offsets are not installed; original held record retained.';
  if(h.injuries.some(i=>!!i.infection||injuryBleed(h,i)>0)||h.missing.some(m=>freshMissing(h,m)))return 'Actual wound/coagulation/fresh-missing suspension offsets are not installed; original held record retained.';
 }
 return null;
}
/** Conditions below own active physical actions or anchors outside this first
 * clock slice. Refuse their transfer/release rather than silently aging them. */
export function ancientSuspensionBoundary256(s:AncientCasketState256,version=270):string|null {
 if(s.animals.length)return 'Actual detached animal/growthTracker/animalGrowth suspension guards are not yet composed; original animal holder retained.';
 for(const p of s.humans){
  if(version<271&&(p.memories.length||p.roomMemories?.length||p.bereavement?.length||p.deathThoughts?.length||p.lastAttack||p.disturbance||p.familyBereavement?.length||p.romanceMemories?.length))return 'This human still owns dated psychological/combat history whose suspension adapter is outside the first slice.';
  if(!['idle','downed','dead'].includes(p.state)||p.moveCooldown!==0||p.motion||p.path.length||p.jobId!==null||p.need||p.haul||p.cooking||p.rescue||p.tend||p.feed||p.ward||p.surgery||p.research||p.recreation.task||p.orders.active!==null||p.orders.queue.length||p.interruptedCargo||p.equipmentDropPending||p.draft||p.burning||p.flee||p.mental?.crisis||p.shooting||p.melee||p.stun||p.bombRefuge||p.animalHandling||p.animalCare||p.animalFeed||p.animalRescue||p.cleaning||p.firefighting||p.burial||p.deepWork||p.trade||p.orbitalTrade||p.hunting||p.equipmentTask||p.priorityWork||Object.hasOwn(p,'openCasket'))return 'Contained human still owns a physical task/stance; finish its actual release before suspension.';
  if(p.health?.cryptosleepSickness?.vomit||p.health?.foodPoisoning?.vomit||p.health?.flu?.vomit||p.health?.immuneDiseases?.malaria?.vomit)return 'A physical vomiting episode must finish before this suspension slice.';
 }
 return null;
}
function rot(writes:NumberWrite[],pile:AncientHeldPile256,delta:number):void {
 if(pile.rot)add(writes,pile.rot,'atTick',delta);
 if(pile.humanCorpse?.nextBileTick!==undefined)add(writes,pile.humanCorpse,'nextBileTick',delta);
}
/** Original state must have been anchored at heldAt by the real producer or
 * entry transaction. It is not retrospectively made healthy or fresh here. */
export function prepareAncientResumeClock256(s:AncientCasketState256,tick:number,version=270):AncientResumeClock256 {
 if(!Number.isSafeInteger(tick)||tick<s.heldAt||!Number.isSafeInteger((tick-s.heldAt)*10))throw Error('Invalid actual casket suspension span');
 const refusal=ancientSuspensionBoundary256(s,version)??ancientResumeBoundary256(s,version);if(refusal)throw Error(refusal);
 for(const p of s.humans)if(version<271)ancientCasketClinicalClock256(s,p);else if(p.health&&!p.health.death&&medicalCivilTick271(p.health)!==s.heldAt)throw Error('Invalid original clinical/civil holder frontier');
 const resumed=version>=271?s.humans.map(p=>prepareSuspendedHumanResume271(p,s.heldAt,tick)):[];
 const writes:NumberWrite[]=[],delta=tick-s.heldAt,heldAt=s.heldAt,humans=s.humans,items=s.items;
 // A same-value replacement is still a different clinical/Thing owner. Do
 // not commit clocks into an orphaned object after a stale pure plan.
 const people=[...humans],things=[...items],links:(()=>boolean)[]=[];
 for(const pawn of humans){const h=pawn.health,age=pawn.age,body=pawn.body,bodyRot=body?.rot;links.push(()=>pawn.health===h&&pawn.age===age&&pawn.body===body&&body?.rot===bodyRot);
  if(h){const infections=h.infections,flu=h.flu,diseases=h.immuneDiseases,cases=infections?.cases,originalCases=cases?[...cases]:[];links.push(()=>h.infections===infections&&h.flu===flu&&h.immuneDiseases===diseases&&infections?.cases===cases&&(cases===undefined||cases.length===originalCases.length&&cases.every((c,i)=>c===originalCases[i])));
   for(const c of [...originalCases,...flu?[flu]:[],...Object.values(diseases??{})]){const tend=c?.tend;if(c)links.push(()=>c.tend===tend);}
  }
 }
 for(const pile of items){const rot=pile.rot,corpse=pile.humanCorpse;links.push(()=>pile.rot===rot&&pile.humanCorpse===corpse);}
 if(delta){
  for(const p of s.humans)if(version<271){medical(writes,p.health,delta);if(p.age)add(writes,p.age,'chronologicalTicks',delta);if(p.body?.rot)add(writes,p.body.rot,'atTick',delta);}
  for(const pile of s.items)rot(writes,pile,delta);
 }
 const current=()=>resumed.every(plan=>plan.current())&&s.heldAt===heldAt&&s.humans===humans&&s.items===items&&humans.length===people.length&&humans.every((v,i)=>v===people[i])&&items.length===things.length&&items.every((v,i)=>v===things[i])&&links.every(check=>check())&&writes.every(w=>Number.isNaN(w.before)?!Object.hasOwn(w.object,w.key):Object.is((w.object as Record<string,unknown>)[w.key],w.before));
 let done=false;
 return {writes,current,commit(){if(done||!current())return false;done=true;for(const plan of resumed)if(!plan.commit())throw Error('Actual suspended human changed during synchronous adoption');for(const w of writes)(w.object as Record<string,unknown>)[w.key]=w.after;return true;}};
}
