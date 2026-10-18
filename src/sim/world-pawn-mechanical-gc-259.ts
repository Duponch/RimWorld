import {captureMechanicalWorldPawnFacts259} from './world-pawn-mechanical-capture-259.ts';
import type {CampaignState} from './world-map-state.ts';
import type {WorldPawnGCReader256,WorldPawnGCFacts256} from './world-pawn-gc-256.ts';
import {mutableWorldPawnOriginal256,type WorldPawnOwner256,type DiscardedMechanical259} from './world-pawn-state-256.ts';
import {validMechanicalWorldPawn259} from './world-pawn-mechanical-259.ts';
/** Only the approved current closed mechanical model may prove absence.
 * Human/animal history remains Unknown. Capture is lazy at the true start of
 * an existing pass, not at every campaign tick or Core work unit. */
export function actualWorldPawnGCReader259(root:CampaignState):WorldPawnGCReader256 {
 let capture:ReturnType<typeof captureMechanicalWorldPawnFacts259>|undefined;
 const actual=()=>capture??=captureMechanicalWorldPawnFacts259(root);
 const facts=(row:WorldPawnOwner256):WorldPawnGCFacts256=>actual().facts(row);
 return {facts,current:()=>actual().current(),planDiscard(rows){
  const state=root.worldPawns;if(!state||(Number(root.schemaVersion)!==259&&Number(root.schemaVersion)!==260&&root.schemaVersion!==261))throw Error('Missing actual mechanical GC campaign owner');
  if(!rows.length)return {commit(){}};
  // No original or receipt changes until ALL actual retention and destruction
  // preflights succeeded. Generic GC owns final membership/native-slot removal.
  const before=state.discardedMechanical259,owners=state.owners.slice(),at=state.atCore;
  const writable=(o:object,k:string)=>{const d=Object.getOwnPropertyDescriptor(o,k);return d?Object.hasOwn(d,'value')&&d.writable===true:Object.isExtensible(o);};
  if(!writable(state,'owners')||!writable(state,'discardedMechanical259'))throw Error('Mechanical GC needs its mutable actual registry');
  const records:DiscardedMechanical259[]=[],seals=rows.map(row=>JSON.stringify(row));
  for(const row of rows){
   const f=facts(row);if(f.keep.length||f.unknown.length||f.relatedIds.length||f.memoryIds.length)throw Error('Mechanical GC requires proven absent actual retentions');
   if(row.kind!=='mechanical'||!state.owners.includes(row)||!validMechanicalWorldPawn259(row,root.schemaVersion,root.worldFactions)||row.originMapId===null||!root.worldMaps?.retired.some(m=>m.id===row.originMapId)||row.items.length||row.packed.length||!mutableWorldPawnOriginal256(row.actor)||!writable(row,'destroyed')||!writable(row,'mode')||Object.hasOwn(row,'free')&&!Object.getOwnPropertyDescriptor(row,'free')?.configurable||before?.some(r=>r.id===row.actor.id))throw Error('Mechanical GC destruction original/receipt preflight refused');
   records.push({id:row.actor.id,mechKind:row.actor.mechKind,factionId:row.factionId!,originMapId:row.originMapId,enteredAtAbsCore:row.enteredAtAbsCore,discardedAtCore:at});
  }
  let used=false;return {commit(){
   if(used||!writable(state,'owners')||!writable(state,'discardedMechanical259')||rows.some(r=>!writable(r,'destroyed')||!writable(r,'mode')||Object.hasOwn(r,'free')&&!Object.getOwnPropertyDescriptor(r,'free')?.configurable)||root.worldPawns!==state||root.tick*10!==at||state.atCore!==at||state.discardedMechanical259!==before||state.owners.length!==owners.length||state.owners.some((r,i)=>r!==owners[i])||rows.some((r,i)=>JSON.stringify(r)!==seals[i])||rows.some(r=>{const f=facts(r);return f.keep.length||f.unknown.length||f.relatedIds.length||f.memoryIds.length;}))throw Error('Stale actual mechanical GC destruction');
   used=true;
   // Thing.Destroy(Vanish) is the existing literal row.destroyed authority,
   // distinct from medical Kill. Discard drops that same payload in GC's
   // immediately following owner/slot removal; no corpse/salvage is produced.
   for(const row of rows){row.destroyed=true;row.mode='dead';delete row.free;}
   state.discardedMechanical259=[...(before??[]),...records];
  }};
 }};
}
