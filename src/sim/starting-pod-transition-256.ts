import {isSchema256Or257} from './schema-compatibility-257.ts';
import {registeredCampaign} from './world-map-context.ts';
import {CORE_STARTING_ARRIVAL_PROFILE_256} from './starting-pod-state-256.ts';
import {plainWorldPawnData256} from './world-pawn-save-256.ts';
import {unclaimDetachedActorBed256} from './actor-map-bed-256.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {Cell,Pawn,World} from './types.ts';
const equal=(a:unknown,b:unknown):boolean=>JSON.stringify(a)===JSON.stringify(b);
const cellKey=(c:Cell)=>`${c.x},${c.z}`;
function sameAnchors(actual:readonly Cell[],expected:readonly Cell[]):boolean {
 if(actual.length!==expected.length)return false;
 const counts=new Map<string,number>();for(const c of expected)counts.set(cellKey(c),(counts.get(cellKey(c))??0)+1);
 for(const c of actual){const key=cellKey(c),n=counts.get(key)??0;if(n===0)return false;counts.set(key,n-1);}return true;
}
/** Exact record-only cleanup performed by the actual contained Destroy path.
 * All identity, skills/traits, physiology and chronology otherwise survive.
 * No World is projected or mutated while checking an incoming snapshot. */
function destroyedActorOutcome(actor:Pawn|WildAnimal,clearMaster:boolean):Pawn|WildAnimal|null {
 const next=structuredClone(actor);unclaimDetachedActorBed256(next);
 if('species'in next){if(!next.wander)return null;delete next.wander.job;next.wander.nextMoveOrderIsWait=true;
  if(clearMaster&&next.startingPet)delete next.startingPet.masterId;
 }else {if(!next.mental?.wander)return null;next.mental.wander.nextMoveOrderIsWait=true;}
 return next;
}
/** Same-epoch monotone custody/timing. Global owner/namespace guards still run
 * BEFORE commit. Direct opening binds real local actors; later skipped
 * snapshots may legitimately move/consume those owners. The compact opened
 * receipt retains only destroyed actor references, no copied actors/items. */
export function validCoreStartingArrivalTransition256(previous:World,next:World):boolean {
 const a=previous.startingArrival,b=next.startingArrival;
 if(a?.profile!==CORE_STARTING_ARRIVAL_PROFILE_256)return b?.profile!==CORE_STARTING_ARRIVAL_PROFILE_256;
 if(b?.profile!==CORE_STARTING_ARRIVAL_PROFILE_256||!isSchema256Or257(next.schemaVersion)||next.tick<previous.tick||!plainWorldPawnData256(a)||!plainWorldPawnData256(b))return false;
 if(a.phase==='opened')return b.phase==='opened'&&equal(a,b);
 if(a.landAt!==b.landAt||a.openAt!==b.openAt||a.start!==b.start)return false;
 const remaining=b.phase==='opened'?[]:b.pods,opened=b.phase==='opened'?b.cells:b.openedCells;
 if(opened.length<a.openedCells.length||!a.openedCells.every((c,i)=>equal(c,opened[i])))return false;
 const beforeLost=a.destroyedPods??[],afterLost=b.destroyedPods??[];
 if(afterLost.length<beforeLost.length||!beforeLost.every((p,i)=>equal(p,afterLost[i])))return false;
 const newLost=afterLost.slice(beforeLost.length),removed=a.pods.filter(p=>!remaining.some(n=>n.id===p.id));
 for(let lostIndex=0;lostIndex<newLost.length;lostIndex++){const lost=newLost[lostIndex]!,pod=removed.find(p=>p.id===lost.id);
  if(!pod||!equal(pod.cell,lost.cell)||lost.humanId!==pod.pawn.id||!equal(lost.animalIds,pod.animals.map(p=>p.id))||lost.atTick<previous.tick||lost.atTick>next.tick||lost.atTick*10<pod.fallCore||pod.phase==='incoming'&&lost.atTick===previous.tick)return false;
  for(const actor of [pod.pawn,...pod.animals]){const owners=registeredCampaign(next).worldPawns?.owners.filter(r=>r.actor.id===actor.id)??[];
   // Same-pod animals are destroyed BEFORE that human; already Destroyed
   // animals do not lose Master when a later pod destroys their former master.
   const master='species'in actor?actor.startingPet?.masterId:undefined,clearMaster=master!==undefined&&newLost.slice(0,lostIndex).some(p=>p.humanId===master),expected=destroyedActorOutcome(actor,clearMaster);
   if(owners.length!==1||owners[0]!.kind!==('species'in actor?'animal':'human')||owners[0]!.destroyed!==true||owners[0]!.clockCore!==0||owners[0]!.mode!=='dead'||!expected||!equal(owners[0]!.actor,expected))return false;
  }
 }
 const openedPods=removed.filter(p=>!newLost.some(l=>l.id===p.id));
 if(!sameAnchors(opened.slice(a.openedCells.length),openedPods.map(p=>p.cell)))return false;
 const minimumDelay=openedPods.reduce((max,p)=>Math.max(max,p.phase==='landed'?111-p.ageCore:Math.max(1,p.remainingCore)+111),0);
 if(openedPods.length&&(next.tick<=previous.tick||(next.tick-previous.tick)*10<minimumDelay||openedPods.some(p=>next.tick*10<p.fallCore+111)))return false;
 // At the direct motor boundary, opening happens after local actor updates:
 // released humans and pet must be physical locals, never campaign knowledge.
 if(openedPods.length&&next.tick===previous.tick+1)for(const pod of openedPods){
  const humans=next.pawns.filter(p=>p.id===pod.pawn.id);
  if(humans.length!==1||humans[0]!.name!==pod.pawn.name)return false;
  for(const animal of pod.animals){const owners=next.wildlife?.animals.filter(p=>p.id===animal.id)??[];if(owners.length!==1||owners[0]!.species!==animal.species)return false;}
 }
 if(b.phase==='opened')return next.tick>=b.openedAt&&b.openedAt>=previous.tick&&(b.openedAt-previous.tick)*10>=minimumDelay&&b.cells.length+afterLost.length===3;
 if(b.atCore<a.atCore||b.pods.length>a.pods.length)return false;
 for(const pod of b.pods){
  const old=a.pods.find(p=>p.id===pod.id);if(!old||old.skyfallerId!==pod.skyfallerId||!equal(old.cell,pod.cell)||old.fallCore!==pod.fallCore||!equal(old.pawn,pod.pawn)||!equal(old.items,pod.items)||!equal(old.animals.map(animal=>{const p=animal.startingPet;if(p?.masterId!==undefined&&newLost.some(l=>l.humanId===p.masterId)){const next={...p};delete next.masterId;return {...animal,startingPet:next};}return animal;}),pod.animals)||!equal(old.order,pod.order))return false;
  if((pod.damage??0)<(old.damage??0)||old.phase==='landed'&&pod.phase!=='landed'||pod.remainingCore>old.remainingCore||pod.ageCore<old.ageCore||old.roofHit&&!pod.roofHit)return false;
 }
 return true;
}
