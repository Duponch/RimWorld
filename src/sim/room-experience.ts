import {memoryExpiry271,validSuspendedMemory271,memoryReadTick271} from './suspended-memory-271.ts';
import { isBedKind } from './bed-kinds.ts';
import { bedSlotCell,pawnBedSlot } from './bed-slots.ts';
import {coupleBed285} from './couple-bed-285.ts';
import { captureRoomQuality } from './room-quality.ts';
import { IMPRESSION_LABELS,ROOM_MEMORY_DURATION,ROOM_MEMORY_OFFSETS } from './room-impressiveness.ts';
import { healthRandom } from './health.ts';
import type { MoodThought } from './mood.ts';
import type { Pawn,World } from './types.ts';

export type RoomMemoryKind=keyof typeof ROOM_MEMORY_OFFSETS;
export interface RoomMemory {kind:RoomMemoryKind;stage:number;expiresAt:number;suspendedTicks?:number}
export interface RoomRest {nextAt:number;applied:boolean}
const labels:Record<RoomMemoryKind,string>={bedroom:'Chambre',barracks:'Dortoir',dining:'Salle du dernier repas',recreation:'Salle du dernier loisir'};
const admitted=(w:World,p:Pawn)=>w.schemaVersion>=103&&(p.faction??'colony')==='colony'&&!p.visitor&&!p.prisoner&&p.state!=='dead';
type RoomRestTask285=Extract<NonNullable<Pawn['need']>,{kind:'sleep'}>|NonNullable<Pawn['coupleTask285']>;
/** The acquired room clock moves with actual continuous lying-down use.
 * The common historical sleep path still borrows its original task directly. */
function roomRestTask285(w:World,p:Pawn):RoomRestTask285|undefined {
 if(p.need?.kind==='sleep'&&p.need.phase==='sleep')return p.need;
 return w.schemaVersion===285&&p.coupleTask285&&coupleBed285(w,p)?p.coupleTask285:undefined;
}

function remember(w:World,p:Pawn,kind:RoomMemoryKind,stage:number):void {
  if(ROOM_MEMORY_OFFSETS[kind][stage]==null)return;
  p.roomMemories=[...(p.roomMemories??[]).filter(m=>m.kind!==kind),{kind,stage,expiresAt:w.tick+ROOM_MEMORY_DURATION}];
}
/** Called only after an actual ingestion or supported indoor leisure use. A
 * room name, table reservation or unfinished action alone cannot create it. */
export function rememberRoomUse(w:World,p:Pawn,kind:'dining'|'recreation'):void {
  if(!admitted(w,p))return;
  const room=captureRoomQuality(w).room(p);if(room)remember(w,p,kind,room.stage);
}
function applyBedroomMemory(w:World,p:Pawn):void {
  p.roomMemories=p.roomMemories?.filter(m=>m.kind!=='bedroom'&&m.kind!=='barracks');
  if(!p.roomMemories?.length)delete p.roomMemories;
  const task=roomRestTask285(w,p);if(!task||task.bedId===null||task.bedId!==p.bedId)return;
  const bed=w.structures.find(s=>s.id===task.bedId&&isBedKind(s.kind));
  if(!bed||bed.medical||bed.prisoner)return;
  if(bed.kind==='double-bed'){
    const slot=pawnBedSlot(p,bed),cell=slot===undefined?undefined:bedSlotCell(bed,slot);
    const target='target'in task?task.target:cell;
    if(!cell||!target||p.x!==cell.x||p.z!==cell.z||target.x!==cell.x||target.z!==cell.z||(p.motion?.end??0)>w.tick)return;
  }else if(p.x!==bed.x||p.z!==bed.z)return;
  const room=captureRoomQuality(w).room(p);if(room?.beds)remember(w,p,room.beds===1?'bedroom':'barracks',room.stage);
}
/** The first observation is delayed 1–4 hours after lying down, then daily.
 * Store the deadline so loading never redraws or grants an earlier benefit. */
export function advanceRoomRest(w:World,p:Pawn):void {
  const task=roomRestTask285(w,p);if(!admitted(w,p)||!task||p.moveCooldown>0)return;
  if('target'in task&&(p.x!==task.target.x||p.z!==task.target.z))return;
  if(!task.roomRest){
    task.roomRest={nextAt:w.tick+250+Math.floor(healthRandom(w)*751),applied:false};
    if(task.bedId!==p.bedId&&p.roomMemories){p.roomMemories=p.roomMemories.filter(m=>m.kind!=='bedroom'||(ROOM_MEMORY_OFFSETS.bedroom[m.stage]??0)<=0);if(!p.roomMemories.length)delete p.roomMemories;}
  }
  if(w.tick>=task.roomRest.nextAt){applyBedroomMemory(w,p);task.roomRest.applied=true;task.roomRest.nextAt=w.tick+ROOM_MEMORY_DURATION;}
}
/** Finishing or interrupting the physical rest repeats only an observation
 * that already occurred, never grants a thought for a brief bed visit. */
export function finishRoomRest(w:World,p:Pawn):void {
  if(!admitted(w,p)||!roomRestTask285(w,p)?.roomRest?.applied)return;
  applyBedroomMemory(w,p);
}
export function expireRoomMemories(w:World,p:Pawn):void {expireRoomMemoriesAt(p,w.tick);}
export function expireRoomMemoriesAt(p:Pawn,tick:number):void {
  if((p.cryptosleepHeldAt271!==undefined||p.shipCryptosleepHeldAt277!==undefined))return;
  if(p.roomMemories?.some(m=>memoryExpiry271(m,m.expiresAt)<=tick)){
    p.roomMemories=p.roomMemories.filter(m=>memoryExpiry271(m,m.expiresAt)>tick);if(!p.roomMemories.length)delete p.roomMemories;
  }
}
export function roomMoodThoughts(w:World,p:Pawn):MoodThought[]{return roomMoodThoughtsAt(p,w.tick);}
export function roomMoodThoughtsAt(p:Pawn,tick:number):MoodThought[]{
  tick=memoryReadTick271(p,tick);
  return (p.roomMemories??[]).filter(m=>memoryExpiry271(m,m.expiresAt)>tick).map(m=>({id:`room-${m.kind}`,label:`${labels[m.kind]} · ${IMPRESSION_LABELS[m.stage]}`,offset:ROOM_MEMORY_OFFSETS[m.kind][m.stage]!,kind:'memory',expiresAt:memoryExpiry271(m,m.expiresAt),description:'Souvenir d’un usage réel de cette pièce, durant un jour. La pièce actuelle ne remplace pas le lieu de ce souvenir.'}));
}

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max:number):boolean=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
/** Basic pawn shape is validated by the central save reader first. */
export function validRoomExperience(p:Record<string,unknown>,version:number,tick:number,civilTick=tick):boolean {
  const memories=p.roomMemories,need=p.need,rest=record(need)?need.roomRest:undefined;
  if(version<103)return memories===undefined&&rest===undefined;
  if(memories!==undefined){
    if(!Array.isArray(memories)||!memories.length||memories.length>3)return false;
    const kinds=new Set<string>();let bedroom=false;
    for(const m of memories){
      if(!record(m)||Object.keys(m).some(k=>!['kind','stage','expiresAt','suspendedTicks'].includes(k))||typeof m.kind!=='string'||!Object.hasOwn(ROOM_MEMORY_OFFSETS,m.kind)||!integer(m.stage,0,9)||!validSuspendedMemory271(m,version,tick,Number(m.expiresAt)-ROOM_MEMORY_DURATION)||!integer(memoryExpiry271(m,Number(m.expiresAt)),(civilTick===tick?tick:Math.max(tick,Number(m.expiresAt)-ROOM_MEMORY_DURATION))+1,(civilTick===tick?tick:Math.max(tick,Number(m.expiresAt)-ROOM_MEMORY_DURATION))+ROOM_MEMORY_DURATION)||civilTick!==tick&&!integer(Number(m.expiresAt)-ROOM_MEMORY_DURATION,0,civilTick)||ROOM_MEMORY_OFFSETS[m.kind as RoomMemoryKind][Number(m.stage)]==null||kinds.has(m.kind))return false;
      kinds.add(m.kind);if(m.kind==='bedroom'||m.kind==='barracks'){if(bedroom)return false;bedroom=true;}
    }
  }
  if(rest!==undefined&&(!record(need)||need.kind!=='sleep'||need.phase!=='sleep'||!record(rest)||Object.keys(rest).some(k=>!['nextAt','applied'].includes(k))||typeof rest.applied!=='boolean'||!integer(rest.nextAt,tick+1,tick+(rest.applied?ROOM_MEMORY_DURATION:1000))))return false;
  return true;
}
