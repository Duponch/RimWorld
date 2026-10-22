import {captureShipCasketAnimals277} from './ship-casket-state-277.ts';
/** Owner adapter invoked after raw owners validate, reusing their capture. */
import type {World} from './types.ts';
import type {HumanOwnershipCapture} from './human-owners.ts';
import type {TreeOwnerOccurrence} from './tree-transfer-state.ts';
import {hasTreePayload} from './tree-transfer-save.ts';
/** Every array occurrence remains an occurrence: deduplicating a shared object
 * here would hide illegal dual custody from the domain validator. */
export function captureTreeOccurrences(world:World,people:HumanOwnershipCapture):TreeOwnerOccurrence[]|undefined {
  const result:TreeOwnerOccurrence[]=[];
  for(const pile of world.piles)result.push({pile,ownerKey:'map-piles',clock:world.tick,active:true});
  // Local possessions above include every map-owned ground/held/orbital pile.
  // Human capture contains foreign individual possessions, including archives.
  for(const slot of people.slots){
    if(slot.kind==='map'||slot.kind==='starting-pod')continue;
    for(const pile of slot.items)result.push({pile,ownerKey:`${slot.kind}:${slot.id}`,clock:slot.validationTick,active:slot.simulation==='world'});
  }
  for(const held of captureShipCasketAnimals277(world))for(const pile of held.items)result.push({pile,ownerKey:`ship-casket-animal:${held.animal.id}`,clock:held.validationTick,active:false});
  const arrival=world.startingArrival;
  if(arrival&&arrival.phase!=='opened')for(const pod of arrival.pods)
    for(const pile of pod.items)result.push({pile,ownerKey:`starting-pod:${pod.id}`,clock:arrival.personalTick,active:false});
  // Civilian market permits only its closed market catalogue. Do not mint an
  // inventory owner just to make a forged boxed tree look like a valid stock.
  if(world.civilianPost?.stock.some(hasTreePayload))return;
  return result;
}
/** Full/delta call after ordinary marker detection. Shared shape+domain guard
 * validates retained+updated candidate BEFORE precommit, returning no adoption
 * side effects. Exceptions from malformed foreign captures are resync reasons. */
export function safeTreeCandidate<T>(read:()=>T):T|undefined {
  try{return read();}catch{return undefined;}
}