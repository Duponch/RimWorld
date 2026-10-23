import {isSchema285OrLater} from './schema-compatibility-257.ts';
import {bedSlotCell} from './bed-slots.ts';
import {coupleBed285,coupleBedBurning285} from './couple-bed-285.ts';
import {addCoupleMemory285} from './couple-memories-285.ts';
import {coupleClockDraft285,coupleNormal285} from './couple-random-285.ts';
import {coupleBiologicalYears285,coupleCooldownCore285} from './couple-rules-285.ts';
import {COUPLE_EXCLUSIVE_FIELDS285} from './couple-save-285.ts';
import {finishRoomRest} from './room-experience.ts';
import {targetBuildingPlayerUse263} from './world-target-building-263.ts';
import {removalWritesMutable259,sealRemovalOriginal259,type MapRemovalWrite259} from './map-removal-writes-259.ts';
import type {Pawn,World} from './types.ts';

export interface CoupleReleasePlan285 {
 readonly writes:readonly MapRemovalWrite259[];
 readonly people:readonly Pawn[];
 /** Private own-record projection for the existing departure preflights. */
 project(pawn:Pawn):Pawn;
 current():boolean;
 commit():void;
}
export interface CoupleReleaseOptions285 {
 /** Natural completion resumes both continuous bed uses. A forced release
  * resumes only a partner who is not among the actual released IDs. */
 resumeAll?:boolean;
 /** Already admitted departure writes, read prospectively without adopting
  * them. The enclosing transaction seals/consumes both sets together. */
 priorWrites?:readonly MapRemovalWrite259[];
}

export function projectCouplePawn285(pawn:Pawn,writes:readonly MapRemovalWrite259[]):Pawn {
 const draft=structuredClone(pawn);
 for(const write of writes)if(write.object===pawn){
  if(write.present)Reflect.set(draft,write.key,structuredClone(write.value));
  else Reflect.deleteProperty(draft,write.key);
 }
 return draft;
}

/** Close only common stages that really entered, once per original person.
 * This cold boundary prepares both sides before a single real write. Personal
 * cooldown streams never advance world.rng or the social stream. */
export function prepareCoupleRelease285(world:World,releasedIds:ReadonlySet<number>,options:CoupleReleaseOptions285={}):CoupleReleasePlan285 {
 const prior=options.priorWrites??[],writes:MapRemovalWrite259[]=[],people:Pawn[]=[];
 const before=world.pawns,at=world.tick,seed=world.seed,version=world.schemaVersion;
 const byId=new Map(before.map(p=>[p.id,p])),drafts=new Map<Pawn,Pawn>();
 const view=(p:Pawn)=>{let d=drafts.get(p);if(!d){d=prior.some(w=>w.object===p)?projectCouplePawn285(p,prior):p;drafts.set(p,d);}return d;};
 const put=(p:Pawn,key:string,value:unknown,present=true)=>writes.push({object:p,key,present,...present?{value}:{}});
 const seen=new Set<number>(),beds:World['structures']=[],roomChecks:(()=>boolean)[]=[],resumeChecks:(()=>boolean)[]=[];
 if(isSchema285OrLater(version))for(const original of before){
  const task=view(original).coupleTask285;if(!task||seen.has(original.id)||!releasedIds.has(original.id)&&!releasedIds.has(task.otherId))continue;
  const other=byId.get(task.otherId),second=other&&view(other),reciprocal=second?.coupleTask285;
  if(!other||!second||!reciprocal||reciprocal.otherId!==original.id||reciprocal.initiatorId!==task.initiatorId
   ||reciprocal.bedId!==task.bedId||reciprocal.slot===task.slot||reciprocal.enteredAtCore!==task.enteredAtCore||reciprocal.endsAtCore!==task.endsAtCore)
   throw Error('Couple release requires the two original entered stages');
  const ordered=task.initiatorId===original.id?[original,other]:[other,original];
  for(const owner of ordered){
   if(seen.has(owner.id))continue;seen.add(owner.id);people.push(owner);
   const source=view(owner),active=source.coupleTask285!,age=coupleBiologicalYears285(source);
   if(age===undefined||age<18||!source.coupleClock285)throw Error('Couple release lost its adult personal clock');
   const clock=coupleClockDraft285(seed,owner.id,source.coupleClock285),span=coupleCooldownCore285(age,coupleNormal285(clock));
   if(span===undefined||!Number.isSafeInteger(at*10+span))throw Error('Couple cooldown clock exhausted');
   clock.nextAllowedAtCore=at*10+span;
   // A shallow memory list preserves the identities and dates of old events;
   // only eviction and this actual new event belong to the finish action.
   const draft:Pawn={...source,...source.coupleMemories285?{coupleMemories285:source.coupleMemories285.slice()}:{} };
   // Finalize the old LayDown observation at every job transition, including
   // continuous lying-down resumption. Its factual room clock is not reset.
   const oldRoom=draft.roomMemories;finishRoomRest(world,draft);
   if(draft.roomMemories!==oldRoom)put(owner,'roomMemories',draft.roomMemories,draft.roomMemories!==undefined);
   if(active.roomRest?.applied){
    const expected=JSON.stringify(draft.roomMemories);
    roomChecks.push(()=>{const check:Pawn={...source};finishRoomRest(world,check);return JSON.stringify(check.roomMemories)===expected;});
   }
   addCoupleMemory285(draft,active.otherId,at);
   put(owner,'coupleClock285',clock);put(owner,'coupleMemories285',draft.coupleMemories285);put(owner,'coupleTask285',undefined,false);
   const bed=coupleBed285(world,source),mayResume=options.resumeAll===true||!releasedIds.has(owner.id);
   const canResume=()=>!!bed&&coupleBed285(world,source)===bed&&targetBuildingPlayerUse263(world,bed)&&!coupleBedBurning285(world,bed)&&!source.health?.death&&source.state!=='dead'
    &&source.need===null&&source.orders.active===null&&!source.mental?.crisis&&!source.social?.fight
    &&source.jobId===null&&source.haul===null&&source.cooking===null&&source.recreation.task===null&&source.path.length===0
    &&!COUPLE_EXCLUSIVE_FIELDS285.some(k=>source[k]!==undefined)&&mayResume;
   const resume=canResume();
   // Fires and the player's authority live outside the sealed people/bed
   // records. Re-read this one decision at commit without sealing the map.
   resumeChecks.push(()=>canResume()===resume);
   if(bed&&!beds.includes(bed))beds.push(bed);
   if(resume){
    const target=bedSlotCell(bed!,active.slot)!;
    put(owner,'need',{kind:'sleep',phase:'sleep',bedId:bed!.id,target,
     ...active.medical?{medical:active.medical}:{},...active.roomRest?{roomRest:active.roomRest}:{}});
    put(owner,'state',source.state==='downed'?'downed':active.medical?'resting':'sleeping');
    put(owner,'path',[]);put(owner,'planCooldown',0);put(owner,'needCooldown',0);
   }
  }
 }
 const scope={people,beds},seal=sealRemovalOriginal259(scope,[...prior,...writes],[]);
 let used=false;
 const current=()=>!used&&world.schemaVersion===version&&world.tick===at&&world.seed===seed&&world.pawns===before
  &&people.every(p=>before.includes(p))&&beds.every(b=>world.structures.includes(b))&&removalWritesMutable259(writes)&&seal(0)&&roomChecks.every(check=>check())&&resumeChecks.every(check=>check());
 if(!removalWritesMutable259(writes)||!seal(0))throw Error('Couple release recipients are not mutable');
 return {writes,people,project:p=>projectCouplePawn285(p,[...prior,...writes]),current,
  commit(){if(prior.length)throw Error('Prospective couple writes require their enclosing transaction');if(!current())throw Error('Stale couple release');
   used=true;for(const write of writes){if(write.present){if(!Reflect.set(write.object,write.key,write.value))throw Error('Admitted couple write failed');}
    else if(!Reflect.deleteProperty(write.object,write.key))throw Error('Admitted couple deletion failed');}
  }};
}
