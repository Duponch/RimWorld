import {prepareSuspendedHumanResume271,medicalCivilTick271,type SuspendedHumanResume271} from './suspended-human-clock-271.ts';
import {prepareCryptosleepPossessionsResume271} from './cryptosleep-transfer-271.ts';
import {shipCasketActor277,type ShipCasketOccupant277} from './ship-casket-state-277.ts';
import {cleanMapRemovedHumanRecord259} from './world-lost-owners.ts';
import type {Pawn} from './types.ts';
import {prepareAnestheticResume271} from './anesthetic.ts';

export const prepareShipCasketPossessionsResume277=prepareCryptosleepPossessionsResume271;

/** Actual terminal DeSpawn only. Unlike the old MapRemoved helper, spatial
 * casket loss is not a release/capture act: keep the original affiliation and
 * the same current/dormant prisoner dossier objects. The terminal owner, not
 * this cleanup, supplies destroyed/death authority. */
export function cleanShipCasketTerminalHuman277(p:Pawn,tick:number):void {
 const affiliation=p.worldAffiliation259,prisoner=p.prisoner,history=p.prisonerHistory259;
 cleanMapRemovedHumanRecord259(p,tick);
 if(affiliation)p.worldAffiliation259=affiliation;else delete p.worldAffiliation259;
 if(prisoner)p.prisoner=prisoner;else delete p.prisoner;
 if(history)p.prisonerHistory259=history;else delete p.prisonerHistory259;
 delete p.shipCasketTask277;delete p.shipCryptosleepHeldAt277;
}
type Write277={object:object;key:string;before:PropertyDescriptor|undefined;after:unknown};
/** Plans only actual owner-clock adoption. Biological/clinical ages, factual
 * injury/event dates, need levels and PRNG are never advanced by this plan. */
export function prepareShipCasketResume277(occupant:ShipCasketOccupant277,heldAt:number,tick:number):SuspendedHumanResume271 {
 if(!Number.isSafeInteger(heldAt)||heldAt<0||!Number.isSafeInteger(tick)||tick<heldAt||!Number.isSafeInteger(tick*10))throw Error('Invalid actual spatial casket suspension interval');
 const actor=shipCasketActor277({revision:1,heldAt,occupant,items:[],packed:[]})!,delta=tick-heldAt,writes:Write277[]=[],links:(()=>boolean)[]=[];
 if(actor.shipCryptosleepHeldAt277!==heldAt)throw Error('Spatial casket marker differs from its actual holder');
 const put=(object:object,key:string,after:unknown)=>{
  const before=Object.getOwnPropertyDescriptor(object,key);
  if(before?(!Object.hasOwn(before,'value')||!before.writable):!Object.isExtensible(object)||key in object)throw Error('Spatial casket clock is not mutable data');
  writes.push({object,key,before,after});
 };
 const add=(object:object,key:string,amount:number)=>{const old=(object as Record<string,unknown>)[key];if(typeof old!=='number'||!Number.isSafeInteger(old)||!Number.isSafeInteger(old+amount))throw Error('Spatial casket clock exhausted');put(object,key,old+amount);};
 const human=occupant.kind==='human'?prepareSuspendedHumanResume271(occupant.pawn,heldAt,tick):undefined;
 if(occupant.kind==='animal'){
  const a=occupant.animal,h=a.health;links.push(()=>a.health===h);
  if(!h||h.death||medicalCivilTick271(h)!==heldAt)throw Error('Held animal lacks its actual living clinical frontier');
  if(delta){const anesthetic=h.anesthetic,cadence=prepareAnestheticResume271(h,a.id%20,tick),stamp=anesthetic?JSON.stringify(anesthetic):undefined;links.push(()=>h.anesthetic===anesthetic&&(!anesthetic||JSON.stringify(anesthetic)===stamp));if(anesthetic&&cadence)put(anesthetic,'cadence271',cadence);put(h,'civilTick271',tick);}
  // These are remaining service deadlines, not birth/training event dates.
  if(a.domestic){const domestic=a.domestic;links.push(()=>a.domestic===domestic);if(delta)add(domestic,'nextDecay',delta);}
  if(a.sleepUntilCore!==undefined&&delta)add(a,'sleepUntilCore',delta*10);
  // Growth/egg/product/gestation values remain frozen. Native-style absolute
  // hash opportunities resume once; no missed growth pulse is replayed.
 }
 if(occupant.kind==='human'){
  const p=occupant.pawn,shooting=p.shooting,stance=shooting?.stance;links.push(()=>p.shooting===shooting&&shooting?.stance===stance);
  if(stance?.phase==='cooldown'&&delta){
   add(stance,'endsAtCore',delta*10);const clock=stance.clock;
   if(clock){links.push(()=>stance.clock===clock);add(clock,'pausedCore',delta*10);put(clock,'lastAdvancedAtCore',tick*10);}
   else put(stance,'clock',{lastAdvancedAtCore:tick*10,pausedCore:delta*10});
  }
 }
 const stagger=actor.stagger,stun=actor.stun;links.push(()=>actor.stagger===stagger&&actor.stun===stun);
 if(delta){if(stagger)add(stagger,'untilCore',delta*10);if(stun)add(stun,'untilCore',delta*10);}
 if(occupant.kind==='mechanical'){
  const mech=occupant.mech,emp=mech.emp,ranged=mech.ranged;links.push(()=>mech.emp===emp&&mech.ranged===ranged);
  if(emp&&delta){const old=emp.suspendedCore277??0;if(!Number.isSafeInteger(old+delta*10))throw Error('Mechanical EMP suspension clock exhausted');put(emp,'suspendedCore277',old+delta*10);}
  if(ranged?.stance?.phase==='cooldown')put(ranged.stance,'lastAdvancedAtCore',tick*10);
 }
 const melee=occupant.kind==='human'?occupant.pawn.melee:occupant.kind==='mechanical'?occupant.mech.melee:undefined;
 const strike=occupant.kind==='animal'?occupant.animal.strike:melee?.strike;
 links.push(()=>occupant.kind==='animal'?occupant.animal.strike===strike:occupant.kind==='human'?occupant.pawn.melee===melee&&melee?.strike===strike:occupant.mech.melee===melee&&melee?.strike===strike);
 if(occupant.kind==='mechanical'&&strike?.empPause){const pause=strike.empPause;links.push(()=>strike.empPause===pause);put(pause,'lastAtCore',tick*10);}
 if(strike&&delta){add(strike,'untilCore',delta*10);const old=strike.suspendedCore277??0;if(!Number.isSafeInteger(old+delta*10))throw Error('Melee suspension clock exhausted');put(strike,'suspendedCore277',old+delta*10);}
 let done=false;
 const current=()=>!done&&actor.shipCryptosleepHeldAt277===heldAt&&(!human||human.current())&&links.every(f=>f())&&writes.every(w=>{const d=Object.getOwnPropertyDescriptor(w.object,w.key);return w.before?!!d&&Object.hasOwn(d,'value')&&d.value===w.before.value&&d.writable===w.before.writable&&d.enumerable===w.before.enumerable&&d.configurable===w.before.configurable:d===undefined&&Object.isExtensible(w.object);});
 return {current,commit(){if(!current())return false;done=true;if(human&&!human.commit())throw Error('Spatial human clock changed in synchronous commit');for(const w of writes)(w.object as Record<string,unknown>)[w.key]=w.after;return true;}};
}
