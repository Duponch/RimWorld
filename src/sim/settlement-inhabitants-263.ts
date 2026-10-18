import {prepareWorldPawnRemoval256} from './world-pawn-life-256.ts';
import {mutableWorldPawnOriginal256,terminalWorldPawn256,type WorldPawnsState256,type WorldPawnOwner256} from './world-pawn-state-256.ts';
import {nativeWorldPawnOrderCurrent256,commitNativeWorldPawnOrder256} from './world-pawn-native-order-256.ts';
import {removeNativeWorldPawnOrder256} from './native-world-pawn-order-256.ts';
import {cancelWorldPawnGC256} from './world-pawn-gc-256.ts';
import {isPerishable,rotAge} from './food-preservation.ts';
import {plainWorldPawnData256} from './world-pawn-save-256.ts';
import type {Pawn,MaterialPile} from './types.ts';
import type {PackedFurniture} from './furniture-rules.ts';

type HumanRow=Extract<WorldPawnOwner256,{kind:'human'}>;
/** Actual still-world inhabitants only. Dead, captured, changed-faction and
 * already spawned people are never resurrected or substituted. No current
 * name/age/equipment producer is called for a previously generated base. */
export function prepareSettlementInhabitants263(state:WorldPawnsState256,ids:readonly number[],factionId:number,tick:number,width:number,cells:readonly number[]){
 const nativeBefore=state.nativeOrder,ownersBefore=state.owners,beforeRows=ownersBefore.slice(),atCore=tick*10;
 if(state.atCore!==atCore||!nativeWorldPawnOrderCurrent256(state,nativeBefore))throw Error('Actual settlement WorldPawn clock/order unavailable');
 const chosen=ownersBefore.filter((r):r is HumanRow=>r.kind==='human'&&ids.includes(r.actor.id)&&!terminalWorldPawn256(r)&&r.factionId===factionId&&r.free===true&&!r.captivity261&&!r.actor.prisoner);
 if(chosen.length>cells.length)throw Error('Not enough real cells for retained inhabitants');
 const rows=chosen.map((row,i)=>{
  const removal=prepareWorldPawnRemoval256(row,atCore);if(!removal.ok)throw Error(removal.reason);
  if(removal.draft.kind!=='human'||removal.draft.clockCore!==atCore)throw Error('Retained human lacks its real current clock');
  const draft=removal.draft,cell=cells[i]!;draft.actor.x=cell%width;draft.actor.z=Math.floor(cell/width);
  draft.actor.path=[];draft.actor.moveCooldown=0;draft.actor.planCooldown=0;delete draft.actor.motion;
  draft.actor.state=draft.actor.state==='downed'?'downed':'idle';delete draft.actor.raid;
  for(const p of draft.items)if(isPerishable(p.item)&&p.rot)p.rot={progress:rotAge(p,tick),atTick:tick};
  return {row,draft,actor:row.actor,items:row.items,packed:row.packed,itemRefs:row.items.slice(),itemOwners:row.items.map(p=>p.owner),packedRefs:row.packed.slice(),packedBuildings:row.packed.map(p=>p.building),packedOwners:row.packed.map(p=>p.owner),before:JSON.stringify(row)};
 });
 const recipients=()=>Object.getOwnPropertyDescriptor(state,'owners')?.writable===true&&Object.getOwnPropertyDescriptor(state,'currentRate')?.writable===true&&rows.every(r=>mutableWorldPawnOriginal256(r.actor)&&r.items.every(p=>mutableWorldPawnOriginal256(p)));
 const rowCurrent=()=>rows.every(r=>plainWorldPawnData256(r.row)&&r.row.actor===r.actor&&r.row.items===r.items&&r.row.packed===r.packed&&r.items.length===r.itemRefs.length&&r.items.every((p,i)=>p===r.itemRefs[i]&&p.owner===r.itemOwners[i])&&r.packed.length===r.packedRefs.length&&r.packed.every((p,i)=>p===r.packedRefs[i]&&p.building===r.packedBuildings[i]&&p.owner===r.packedOwners[i])&&JSON.stringify(r.row)===r.before);
 let used=false,afterAnimals:WorldPawnsState256|undefined,nativeAfter:WorldPawnsState256['nativeOrder'];
 const current=()=>!used&&state.atCore===atCore&&state.owners===ownersBefore&&ownersBefore.length===beforeRows.length&&ownersBefore.every((r,i)=>r===beforeRows[i])&&nativeWorldPawnOrderCurrent256(state,nativeBefore)&&rowCurrent()&&recipients();
 return {
  get ids(){return rows.map(r=>r.actor.id);},get people():Pawn[]{return rows.map(r=>r.draft.actor);},get items():MaterialPile[]{return rows.flatMap(r=>r.draft.items);},get packed():PackedFurniture[]{return rows.flatMap(r=>r.draft.packed);},
  current,
  /** Compose onto the already prepared animal-removal candidate; never publish
   * either physical ownership prefix. Same original references remain inside. */
  candidate(after:WorldPawnsState256):WorldPawnsState256 {
   if(!current()||rows.some(r=>!after.owners.includes(r.row)))throw Error('Retained inhabitants changed during generation');
   afterAnimals=after;nativeAfter=after.nativeOrder;
   for(const r of rows)if(nativeAfter)nativeAfter=removeNativeWorldPawnOrder256(nativeAfter,r.actor.id);
   return {...after,owners:after.owners.filter(r=>!rows.some(h=>h.row===r)),...nativeAfter?{nativeOrder:nativeAfter}:{}};
  },
  /** Execute immediately after the existing animal-generation commit, before
   * map publication. No RNG, owner lookup, clinic catch-up or allocation here. */
  commitAfterAnimals():{people:Pawn[];items:MaterialPile[];packed:PackedFurniture[]} {
   if(used||!afterAnimals||state.atCore!==atCore||!rowCurrent()||!recipients()||state.owners.length!==afterAnimals.owners.length||state.owners.some((r,i)=>r!==afterAnimals!.owners[i])||!nativeWorldPawnOrderCurrent256(state,afterAnimals.nativeOrder))throw Error('Stale retained inhabitants commit');
   used=true;cancelWorldPawnGC256(state);
   for(const r of rows){for(const key of Object.keys(r.actor))delete (r.actor as unknown as Record<string,unknown>)[key];Object.assign(r.actor,r.draft.actor);for(let i=0;i<r.items.length;i++){const original=r.items[i]!,draft=r.draft.items[i]!;if(draft.rot)original.rot={...draft.rot};}}
   state.owners=state.owners.filter(r=>!rows.some(h=>h.row===r));commitNativeWorldPawnOrder256(state,afterAnimals.nativeOrder,nativeAfter);
   return {people:rows.map(r=>r.actor),items:rows.flatMap(r=>r.items),packed:rows.flatMap(r=>r.packed)};
  }
 };
}
