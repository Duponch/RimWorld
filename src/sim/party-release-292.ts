import {addPartyMemory292} from './party-memories-292.ts';
import {removalWritesMutable259,sealRemovalOriginal259,type MapRemovalWrite259} from './map-removal-writes-259.ts';
import type {Pawn,World} from './types.ts';
export interface PartyReleasePlan292 {readonly writes:readonly MapRemovalWrite259[];readonly people:readonly Pawn[];current():boolean;commit():void;project(pawn:Pawn):Pawn}
export function preparePartyRelease292(world:World,ids:ReadonlySet<number>,options:{finish?:boolean;death?:boolean;reason?:string}={}):PartyReleasePlan292 {
 const state=world.party292,active=state?.active,at=world.tick,version=world.schemaVersion,before=world.pawns,beforeEvents=world.events,writes:MapRemovalWrite259[]=[],people:Pawn[]=[];
 const put=(object:object,key:string,value:unknown,present=true)=>writes.push({object,key,present,...present?{value}:{}});
 if((Number(version)===292||Number(version)===293)&&active){
  const finish=options.finish===true||options.death===true||active.organizerJoined===true&&ids.has(active.organizerId);
  const remaining=active.members.filter(m=>!ids.has(m.pawnId));
  for(const member of active.members){
   if(!finish&&!ids.has(member.pawnId))continue;const pawn=before.find(p=>p.id===member.pawnId);if(!pawn)continue;people.push(pawn);
   if(finish&&!ids.has(pawn.id)&&pawn.state!=='dead'&&!pawn.health?.death&&pawn.cryptosleepHeldAt271===undefined&&pawn.shipCryptosleepHeldAt277===undefined&&member.presentCore>0){const draft={...pawn,...pawn.partyMemories292?{partyMemories292:pawn.partyMemories292.map(m=>({...m}))}:{}};
    addPartyMemory292(draft,Math.min(Math.fround(Math.fround(Math.fround(member.presentCore)/Math.fround(active.durationCore))+Math.fround(Math.fround(.5)/Math.fround(8))),1),at);put(pawn,'partyMemories292',draft.partyMemories292);
   }
   const task=pawn.recreation.task;if(task?.activity==='party'&&task.partyStartedAtCore===active.startedAtCore){put(pawn.recreation,'task',null);put(pawn,'path',[]);put(pawn,'planCooldown',0);put(pawn,'needCooldown',0);if(pawn.state==='recreating'||pawn.state==='moving')put(pawn,'state','idle');}
  }
  if(finish){const next={...state};delete next.active;put(world,'party292',next);put(world,'events',[...beforeEvents,{tick:at,type:'need',message:'La fête se termine.'}].slice(-80));}else if(remaining.length!==active.members.length)put(world,'party292',{...state,active:{...active,members:remaining}});
 }
 const seal=sealRemovalOriginal259({state,people,events:beforeEvents},writes,[]);let used=false;
 const current=()=>!used&&world.tick===at&&world.schemaVersion===version&&world.pawns===before&&world.events===beforeEvents&&world.party292===state&&removalWritesMutable259(writes)&&seal(0);
 if(!removalWritesMutable259(writes)||!seal(0))throw Error('Party release recipients are not mutable');
 return {writes,people,current,project(pawn){const copy=structuredClone(pawn);for(const w of writes){const target=w.object===pawn?copy:w.object===pawn.recreation?copy.recreation:undefined;if(target){if(w.present)Reflect.set(target,w.key,structuredClone(w.value));else Reflect.deleteProperty(target,w.key);}}return copy;},
  commit(){if(!current())throw Error('Stale party release');used=true;for(const w of writes){if(w.present){if(!Reflect.set(w.object,w.key,w.value))throw Error('Admitted party write failed');}else if(!Reflect.deleteProperty(w.object,w.key))throw Error('Admitted party deletion failed');}}
 };
}

/** Compose cold release writes with the existing owner's atomic release stage. */
export function combinePartyRelease292(world:World,ids:ReadonlySet<number>,base:PartyReleasePlan292):PartyReleasePlan292 {
 const party=preparePartyRelease292(world,ids,{finish:true}),writes=[...party.writes,...base.writes];let used=false;
 const current=()=>!used&&party.current()&&base.current()&&removalWritesMutable259(writes);
 return {writes,people:[...new Set([...base.people,...party.people])],current,
  project(p){const copy=base.project(p);for(const w of party.writes){const target=w.object===p?copy:w.object===p.recreation?copy.recreation:undefined;if(target){if(w.present)Reflect.set(target,w.key,structuredClone(w.value));else Reflect.deleteProperty(target,w.key);}}return copy;},
  commit(){if(!current())throw Error('Stale composed Party release');used=true;for(const w of writes){if(w.present){if(!Reflect.set(w.object,w.key,w.value))throw Error('Admitted composed Party write failed');}else if(!Reflect.deleteProperty(w.object,w.key))throw Error('Admitted composed Party deletion failed');}}
 };
}
