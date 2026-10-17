import {heldCasketGCUnknown259} from './world-pawn-casket-membership-259.ts';
import {nativeWorldPawnOrderCurrent256,commitNativeWorldPawnOrder256,orderedWorldPawnRows256} from './world-pawn-native-order-256.ts';
import {removeNativeWorldPawnOrder256} from './native-world-pawn-order-256.ts';
import {WorldGenerationRandom} from './world-generation-random.ts';
import {terminalWorldPawn256,type WorldPawnsState256,type WorldPawnOwner256} from './world-pawn-state-256.ts';
/** Runtime facts from actual authorities, never persisted negative history.
 * Missing bond/tale/log/source/quest authority MUST occur in unknown. */
export interface WorldPawnGCFacts256 {keep:readonly string[];unknown:readonly string[];relatedIds:readonly number[];memoryIds:readonly number[]}
export interface WorldPawnGCReader256 {
 facts(row:WorldPawnOwner256):WorldPawnGCFacts256;
 /** Ordinary reference changes cancel/restart the existing pass before discard. */
 current?():boolean;
 /** Prepare all reference/held-item destruction first; commit cannot yield. */
 planDiscard(rows:readonly WorldPawnOwner256[]):{commit():void};
}
interface Pass256 {iterator:Generator<void,boolean,void>;snapshot:readonly WorldPawnOwner256[]}
const passes=new WeakMap<WorldPawnsState256,Pass256>();
/** Same membership mutation boundary as AddPawn/RemovePawn, not every tick. */
export function cancelWorldPawnGC256(state:WorldPawnsState256):void {
 const pass=passes.get(state);if(!pass)return;pass.iterator.return(false);passes.delete(state);state.currentRate=Math.min(state.currentRate*2,16777216);
}
function same(state:WorldPawnsState256,snapshot:readonly WorldPawnOwner256[]):boolean{return state.owners.length===snapshot.length&&state.owners.every((r,i)=>r===snapshot[i]);}
function* makePass(state:WorldPawnsState256,snapshot:readonly WorldPawnOwner256[],reader:WorldPawnGCReader256):Generator<void,boolean,void>{
 if(!nativeWorldPawnOrderCurrent256(state,state.nativeOrder))throw Error('Actual native GC order is not mutable/admitted');
 const ordered=orderedWorldPawnRows256(state),kept=new Set<number>(),facts=new Map<number,WorldPawnGCFacts256>();
 // These participants retain their one true holder. Its unresolved political/
 // terminal authority is Unknown, never KeepForever or a fabricated Free row.
 for(const [id,f] of heldCasketGCUnknown259(state)){facts.set(id,f);kept.add(id);}
 for(const row of ordered){const f=reader.facts(row);facts.set(row.actor.id,f);if(row.keepForever||row.everColonist||f.keep.length||f.unknown.length)kept.add(row.actor.id);}
 let additional=0;
 for(const row of ordered)if(row.kind==='human'&&!terminalWorldPawn256(row)&&!kept.has(row.actor.id)&&new WorldGenerationRandom(row.actor.id^0x3a73ecfd).value()<Math.fround(.25)){kept.add(row.actor.id);if(++additional===10)break;}
 // Freeze critical roots BEFORE adding their dependencies. No invented
 // transitive closure. Reader supplies only relationships/memories Core admits.
 const roots=[...kept];for(const id of roots){for(const n of facts.get(id)!.relatedIds)kept.add(n);yield;}
 for(const id of roots){for(const n of facts.get(id)!.memoryIds)kept.add(n);yield;}
 if(!same(state,snapshot))throw Error('WorldPawn GC membership changed');
 // Only pertinent reference changes are ordinary cancellations. No error,
 // successful cadence stamp, destruction or favorable random retry occurs.
 if(reader.current&&!reader.current())return false;
 const discarded=ordered.filter(r=>!kept.has(r.actor.id)),nativeBefore=state.nativeOrder;if(!nativeWorldPawnOrderCurrent256(state,nativeBefore))throw Error('Actual native GC terminal order is not mutable/admitted');let nativeAfter=nativeBefore;if(nativeAfter)for(const row of discarded)nativeAfter=removeNativeWorldPawnOrder256(nativeAfter,row.actor.id);
 const plan=reader.planDiscard(discarded);
 if(!same(state,snapshot)||!nativeWorldPawnOrderCurrent256(state,nativeBefore))throw Error('WorldPawn GC source changed during preflight');
 plan.commit();
 // The destruction plan removes owned things/references; this owner retires
 // only the exact original rows after that successful physical preflight.
 const remove=new Set(discarded);state.owners=state.owners.filter(r=>!remove.has(r));commitNativeWorldPawnOrder256(state,nativeBefore,nativeAfter);return true;
}
/** Default preserves the existing one-Core API. The confirmed campaign may
 * pay a bounded batch at its current local frontier after life.commit. No
 * interpolation of past mutations or second clinical/calendar loop occurs. */
export function stepWorldPawnGC256(state:WorldPawnsState256,atCore:number,reader:WorldPawnGCReader256,budgetCore=1):void {
 if(!Number.isSafeInteger(atCore)||atCore<state.atCore)throw Error('Invalid WorldPawn GC clock');
 if(!Number.isInteger(budgetCore)||budgetCore<0||budgetCore>10)throw Error('Invalid WorldPawn GC Core budget');
 if(budgetCore===0)return;
 if(state.lastSuccessfulCore>=Math.floor(atCore/15000)*15000)return;
 let pass=passes.get(state);if(pass&&!same(state,pass.snapshot)){cancelWorldPawnGC256(state);pass=undefined;}
 if(!pass){const snapshot=state.owners.slice();pass={snapshot,iterator:makePass(state,snapshot,reader)};passes.set(state,pass);}
 try {for(let n=0;n<state.currentRate*budgetCore;n++){const result=pass.iterator.next();if(result.done){if(result.value===false)cancelWorldPawnGC256(state);else {state.lastSuccessfulCore=atCore;state.currentRate=1;passes.delete(state);}break;}}}
 catch(error){passes.delete(state);throw error;} // A closed failed iterator is never successful on the next tick.
}
