import {cancelToxicVomit256} from './toxic-buildup-256.ts';
import {groupPawnInterval256} from './group-core-cadence-256.ts';
import {animalConditionMtbEvent256} from './animal-age-condition-runtime-256.ts';
import {cancelAnimalLocalGroupIntents256} from './animal-local-contents-256.ts';
import {animalCarrier} from './animal-rest-state.ts';
import {stopAnimalWanderJob256,type ActualAnimalMind256,type AnimalConfusion256} from './animal-condition-mental-state-256.ts';
import type {InitialAnimalRandom256} from './initial-animal-age-256.ts';
import type {World} from './types.ts';
/** StopAll's local animal jobs. Intentions/reservations are cancelled by their
 * actual producer. A captured edge is not completed or rewound by this call.
 * Inventory, pregnancy, ownership of a bed and handling DESIGNATION survive. */
export function interruptAnimalConditionJob256(a:ActualAnimalMind256,ownerTick:number,keepLaying=false):void {
 if(!Number.isFinite(ownerTick)||ownerTick<0)throw Error('Invalid actual mental interruption owner clock');
 if(a.health)cancelToxicVomit256(a.health);
 stopAnimalWanderJob256(a);
 if(keepLaying&&a.state==='sleeping')return;
 delete a.animalThermalRefuge288;a.path=[];delete a.meal;delete a.predation;delete a.exiting;delete a.mating;delete a.eggLay;delete a.animalRest;
 if(a.state!=='dead'&&a.state!=='downed')a.state=a.motion&&a.motion.end>ownerTick?'moving':'idle';
}
/** Real spawned owner admission. A carried/skyfaller Pawn is not spawned;
 * caravan admission is handled separately by its actual owner, not a World. */
export function tryStartAnimalConfusionLocal256(w:World,a:ActualAnimalMind256,atCore:number):boolean {
 if(w.schemaVersion<256||!w.wildlife?.animals.includes(a)||animalCarrier(w,a.id)||a.state==='dead'||a.state==='downed'||a.state==='sleeping'||a.manhunter||a.confusion)return false;
 if(!a.wander)throw Error('Actual animal mind was not constructed');
 if(!Number.isSafeInteger(atCore)||atCore<=(w.tick-1)*10||atCore>w.tick*10)throw Error('Mental event is outside the actual owner frontier');
 cancelAnimalLocalGroupIntents256(w,a.id);interruptAnimalConditionJob256(a,w.tick);a.confusion={revision:1,ageCore:0};a.nextDecision=w.tick;return true;
}
export function tryStartAnimalConfusionCaravan256(a:ActualAnimalMind256):boolean {
 if(a.state==='dead'||a.state==='downed'||a.state==='sleeping'||a.manhunter||a.confusion)return false;
 if(!a.wander)throw Error('Actual caravan animal mind was not constructed');
 // No local job/path or local reservations are manufactured for a caravan.
 stopAnimalWanderJob256(a);a.confusion={revision:1,ageCore:0};return true;
}
/** ONE actual MentalStateHandler interval, after the health interval. No
 * elapsed wall time or age-derived phase is used. Held owners do not call it. */
export function advanceAnimalConfusion256(a:ActualAnimalMind256,atCore:number,deltaCore:number,random:InitialAnimalRandom256,spawned:boolean):void {
 const c=a.confusion;if(!c)return;
 const recover=()=>{delete a.confusion;if(spawned)interruptAnimalConditionJob256(a,atCore/10,true);};
 if(a.state==='dead'||a.health?.death||a.state==='downed'||a.manhunter){recover();return;}
 if(advanceAnimalConfusionState256(c,a.id,atCore,deltaCore,random))recover();
}
/** Pure episode transition also used inside an explosive animal's private
 * clinical outcome: its job/World mutation is committed only after preflight. */
export function advanceAnimalConfusionState256(c:AnimalConfusion256,id:number,atCore:number,deltaCore:number,random:InitialAnimalRandom256):boolean {
 if(!groupPawnInterval256(id,atCore,30,deltaCore))return false;c.ageCore+=30;
 return c.ageCore>=120000||c.ageCore>=3500&&animalConditionMtbEvent256(.2,30,random);
}
