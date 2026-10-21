import {validateStartingPetLinks256} from './starting-pet-state-256.ts';
import {captureCoreStartingAnimals256} from './starting-pod-state-256.ts';
/** Global ownership of the same bed originals. No map, claimant or history is
 * manufactured by validation. The shared capture is ephemeral. */
import {captureDuckFlyerOwners256} from './duck-owner-capture-256.ts';
import {validateDuckFlyers256} from './duck-flyer-save-256.ts';
import type {World} from './types.ts';
import type {CampaignState} from './world-map-state.ts';
import {captureActorBeds256} from './actor-bed-local-256.ts';
import {validActorMapBedField256,validActorMapBedBinding256,validBedReferences256,actualBedReferences256,type ActualBedReference256,type BedActor256} from './actor-map-bed-256.ts';
import {everyHumanPawnOwner} from './human-owners.ts';
export interface BedOwnershipCapture256 {readonly actors:readonly BedActor256[];readonly refs:readonly ActualBedReference256[];localMapFor(a:BedActor256):number|null}
export function validateActorBedCapture256(capture:BedOwnershipCapture256,version:number,nextId:number):string[] {
 const errors:string[]=[],claimed=new Map<string,number>();
 if(!validBedReferences256(capture.refs,nextId))return ['Invalid actual bed references.'];
 for(const actor of capture.actors){
  if(!validActorMapBedField256(actor,version,nextId)){errors.push('Invalid or future bed ownership field.');continue;}
  if(!actor.mapBed){
   const local=capture.localMapFor(actor),id='species'in actor?actor.domestic?.bedId??null:actor.bedId,slot='species'in actor?undefined:actor.bedSlot;
   if(id!==null&&local!==null){const key=id+':'+(slot??0),owner=claimed.get(key);if(owner!==undefined&&owner!==actor.id)errors.push('Historical local alias overlaps another original bed owner.');else claimed.set(key,actor.id);}
   continue;
  }
  if(actor.state==='dead'||actor.health?.death){errors.push('Dead original retains bed ownership.');continue;}
  const local=capture.localMapFor(actor);
  if(!validActorMapBedBinding256(actor,capture.refs,local,local!==null)){errors.push('Owned bed has no matching original or local alias.');continue;}
  const key=actor.mapBed.bedId+':'+(actor.mapBed.slot??0),owner=claimed.get(key);
  if(owner!==undefined&&owner!==actor.id)errors.push('Two originals own the same bed slot.');else claimed.set(key,actor.id);
 }
 if(capture.actors.some(a=>'species'in a&&Object.hasOwn(a,'startingPet'))){const humans=new Map(capture.actors.filter(a=>!('species'in a)).map(a=>[a.id,a]));for(const actor of capture.actors)if('species'in actor&&!validateStartingPetLinks256(actor,version,id=>humans.get(id)))errors.push('Starting pet link has no actual human original');}
 return errors;
}
export function validateCampaignActorBeds256(root:CampaignState):string[] {
 if(root.schemaVersion<256)return [];
 try{return validateActorBedCapture256(captureActorBeds256(root),root.schemaVersion,root.nextId);}catch{return ['Invalid physical bed/actor ownership capture.'];}
}
/** Inactive maps publish only reference metadata. Local originals are joined
 * back against it before per-actor aliases are admitted, never registered as
 * a second physical owner. Full RAW remains the complete-owner authority. */
export function validateProjectedActorBeds256(w:World,views:readonly {world:World;referencesOnly?:boolean}[],refs:readonly ActualBedReference256[],activeMapId:number|null,terminalAnimals:readonly import('./wildlife-state.ts').WildAnimal[]=[]):string[] {
 if(w.schemaVersion<256)return [];
 const actors:BedActor256[]=[],locations=new Map<BedActor256,number|null>(),byId=new Map<number,BedActor256>();
 const add=(actor:BedActor256,map:number|null)=>{const old=byId.get(actor.id);if(old&&old!==actor)throw Error('Projected actor has two owners');if(old){if(locations.get(old)!==map)throw Error('Contradictory projected actor map');return;}byId.set(actor.id,actor);locations.set(actor,map);actors.push(actor);};
 try{
  everyHumanPawnOwner(w,(p,kind)=>{add(p,kind==='map'||kind==='player-casket'?activeMapId:null);return true;});
  if(validateDuckFlyers256(w,w.schemaVersion).length)return ['Invalid actual held Duck owner.'];
  for(const a of w.wildlife?.animals??[])add(a,activeMapId);
  for(const a of captureCoreStartingAnimals256(w))add(a,null);
  for(const f of captureDuckFlyerOwners256(w))add(f.animal,null);
  for(const row of views)if(!row.referencesOnly){everyHumanPawnOwner(row.world,(p,kind)=>{add(p,kind==='map'||kind==='player-casket'?activeMapId:null);return true;});
   const group=row.world.group as typeof row.world.group&{animalOwners?:import('./group-animal-state-256.ts').GroupAnimalOwners256};for(const a of group?.animalOwners?.members??[])add(a,null);}
  for(const a of terminalAnimals)add(a,null);
  for(const row of w.worldPawns?.owners??[])if(row.kind!=='mechanical')add(row.actor,null);
  const expected=actualBedReferences256(activeMapId??0,w.structures,w.packed);
  for(const actual of expected){const row=refs.find(r=>r.id===actual.id);if(!row||row.mapId!==actual.mapId||row.slots!==actual.slots||row.animal!==actual.animal)return ['Projected bed metadata disagrees with the actual local original.'];}
  if(activeMapId!==null&&refs.some(ref=>ref.mapId===activeMapId&&!expected.some(actual=>actual.id===ref.id)))return ['Projected active bed has no local original.'];
  return validateActorBedCapture256({actors,refs,localMapFor:a=>locations.get(a)??null},w.schemaVersion,w.nextId);
 }catch{return ['Invalid projected bed/actor owner join.'];}
}
