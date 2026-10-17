import {captureActorBeds256} from './actor-bed-local-256.ts';
import {validateStartingPetLinks256} from './starting-pet-state-256.ts';
import type {World} from './types.ts';
/** Resolve direct master/bond FKs against actual human originals, including
 * held, travelling and terminal owners, never identity-only knowledge. */
export function validateActualStartingPetLinks256(world:World):string[] {
 try {
  const capture=captureActorBeds256(world),animals=capture.actors.filter(a=>'species'in a);
  if(!animals.some(a=>Object.hasOwn(a,'startingPet')))return [];
  const humans=new Map(capture.actors.filter(a=>!('species'in a)).map(a=>[a.id,a]));
  return animals.every(a=>validateStartingPetLinks256(a,world.schemaVersion,id=>humans.get(id)))?[]:['Starting pet master/bond lacks its actual human original'];
 }catch{return ['Starting pet actual owner capture is unavailable'];}
}
