import {validNativeHumanNonSpatialPosition256} from './native-human-identity-256.ts';
import {validateAncientCasketPhysical256} from './ancient-casket-physical-256.ts';
import {validFilthFeet} from './filth-save.ts';
import {validatePawnHealthRecord} from './health-save.ts';
import type {NumericMembershipSink} from './numeric-membership.ts';
export {validAncientCasketState256,validAncientCasketField256,ancientCasketHumanOwners256} from './ancient-casket-state-256.ts';
import {validCryptosleepSicknessTransport256} from './cryptosleep-sickness-save-256.ts';
import {validateDetachedPawnRecordShape} from './pawn-record-save.ts';
import {validatePileRecordShape} from './material-record-save.ts';
import {ancientSuspensionBoundary256,ancientCasketClinicalClock256} from './ancient-casket-clock-256.ts';
import {isAncientCasket256,validAncientCasketState256,validAncientCasketField256,type AncientCasket256} from './ancient-casket-state-256.ts';
import type {World} from './types.ts';
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
/** Original contexts only; no bootstrap, synthetic map or ownership projection. */
export function validateAncientCasketOwners256(w:World):string[] {
 const errors:string[]=validateAncientCasketPhysical256(w),ids=new Set<number>();if(errors.length)return errors;
 const add=(id:number)=>{if(!integer(id,1,w.nextId-1)||ids.has(id))errors.push('Duplicate/invalid original casket Thing identity.');ids.add(id);};
 const all=w.structures.filter(isAncientCasket256) as unknown as AncientCasket256[];
 for(const c of all){
  if(!validAncientCasketField256(c,w.schemaVersion,w.tick)){errors.push('Invalid/future casket state.');continue;}
  const s=c.casket;add(c.id);
  const humans=new Set(s.humans.map(p=>p.id)),animals=new Set(s.animals.map(a=>a.id));
  for(const p of s.humans){
   if(!object(p)){errors.push('Contained human is not an original data record.');continue;}
   if(p.filthFeet!==undefined&&!validFilthFeet(p.filthFeet,w.schemaVersion))errors.push('Invalid original held filth tracker.');
   if(Object.hasOwn(p,'nativeHuman')&&!validNativeHumanNonSpatialPosition256(p,w.schemaVersion))errors.push('Invalid actual held native Position.');
   add(p.id);if(w.pawns.some(x=>x.id===p.id))errors.push('Contained human is also spawned.');
   try{errors.push(...validateDetachedPawnRecordShape(p as unknown as Record<string,unknown>,w,w.schemaVersion,s.heldAt));}catch{errors.push('Malformed original contained Pawn record.');}
   try{ancientCasketClinicalClock256(s,p);}catch{errors.push('Contained human medical clock differs from its actual holder.');}
   errors.push(...validatePawnHealthRecord(p,{schemaVersion:w.schemaVersion,tick:s.heldAt,width:w.width,height:w.height},true));
   if(!validCryptosleepSicknessTransport256(p,w.schemaVersion,s.heldAt))errors.push('Invalid original suspended cryptosleep clinical owner.');
   if((p.state==='dead'||p.health?.death)&&(!p.health?.death||p.state!=='dead'||p.body?.pileId===undefined||s.items.filter(i=>i.id===p.body!.pileId&&i.humanCorpse?.pawnId===p.id&&i.owner.type==='ancient-casket'&&i.owner.casketId===c.id).length!==1))errors.push('Contained dead human has no unique original contained corpse.');
  }
  // A partial handwritten animal guard is not equivalent to the common guard.
  // Keep this lane blocked until its real detached record guard is extracted.
  if(s.animals.length)errors.push('Original detached animal record guard is not yet composed; do not admit contained animals.');
  for(const a of s.animals){if(!object(a)){errors.push('Contained animal is not an original data record.');continue;}add(a.id);if(w.wildlife?.animals.some(x=>x.id===a.id)||a.health&&!a.health.death&&a.health.tick!==s.heldAt)errors.push('Invalid original contained animal owner/clock.');}
  for(const pile of s.items){
   if(!object(pile)){errors.push('Contained item is not an original data record.');continue;}
   add(pile.id);if(w.piles.some(p=>p.id===pile.id))errors.push('Contained item is also in map items.');
   if(pile.innerResource||pile.plantPack||pile.egg||pile.corpse||pile.mechCorpse||pile.unfinished)errors.push('This original contained nested holder/item clock is not composed; do not admit or erase it.');
   // The shared pile guard must admit the named owner before activation.
   try{errors.push(...validatePileRecordShape(pile as unknown as Record<string,unknown>,w,w.schemaVersion,s.heldAt,c.id));}catch{errors.push('Malformed original contained pile record.');}
   const o:unknown=pile.owner;
   if(!object(o))errors.push('Item has no data-only owner.');
   else if(o.type==='ancient-casket'?o.casketId!==c.id:typeof o.type!=='string'||!['inventory','equipment','apparel'].includes(o.type)||!integer(o.pawnId,1,w.nextId-1)||!humans.has(o.pawnId)&&!(o.type==='inventory'&&animals.has(o.pawnId)))errors.push('Item has no real direct/nested casket owner.');
  }
  if(!errors.length){const boundary=ancientSuspensionBoundary256(s);if(boundary)errors.push(boundary);}
 }
 return errors;
}
/** Integrate this occurrence stream into the common Thing registrar. It must
 * run alongside every other owner, never deduplicate globally before checking. */
export function ancientCasketThingOccurrences256(c:AncientCasket256):number[] {return [c.id,...c.casket.humans.map(p=>p.id),...c.casket.animals.map(a=>a.id),...c.casket.items.map(i=>i.id)];}

/** Structure itself was registered by the map pass. These are only the actual
 * contained originals; references and duplicates are never deduplicated. */
export function registerAncientCasketThingIds256(w:World,ids:NumericMembershipSink):string[]{
 const errors=validateAncientCasketOwners256(w);if(errors.length)return errors;
 for(const c of w.structures.filter(isAncientCasket256) as unknown as AncientCasket256[])for(const id of ancientCasketThingOccurrences256(c).slice(1)){
  if(ids.has(id))errors.push('Duplicate actual casket-owned Thing ID.');else ids.add(id);
 }return errors;
}
