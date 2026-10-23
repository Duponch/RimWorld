import {allowedAreaAllows,captureAllowedArea} from './allowed-area-state.ts';
import {calendarTick} from './calendar.ts';
import {candidateAccess} from './candidate-access.ts';
import {deconstructionReserved} from './deconstruction-rules.ts';
import {blockedCells,cellIndex,routeToCell} from './pathfinding.ts';
import {gainRecreation} from './recreation-rules.ts';
import {gatherActive,isGatherSpot} from './recreation-space.ts';
import {reservedServiceCells} from './service-reservations.ts';
import {carrierOf} from './rescue-state.ts';
import {hourOfDay} from './schedule.ts';
import {registeredMapId} from './world-map-context.ts';
import {preparePartyRelease292} from './party-release-292.ts';
import {capturePartySpace292,partyArea292,partyCells292,partyTaskSiteValid292,partyTopology292,type PartySpace292} from './party-space-292.ts';
import {PARTY_CHANCE292,PARTY_CHECK_CORE292,PARTY_COOLDOWN_CORE292,PARTY_JOY292,PARTY_MIN_REMAINING_CORE292,
 partyBusy292,partyCapable292,partyCivil292,partyDanger292,partyDepartureIds292,partyHome292,partyRoll292,partySeed292,partyThreshold292} from './party-rules-292.ts';
import {medicalBleed} from './injury-state.ts';
import type {BodyAssessment} from './body-capacities.ts';
import type {NeedContext} from './needs.ts';
import type {PartyActive292,PartyMember292} from './party-state-292.ts';
import type {RoomTopology} from './room-topology.ts';
import type {Cell,Pawn,World} from './types.ts';

const EMPTY_IDS:ReadonlySet<number>=new Set<number>();
/** Decision-local policy: the shared capture verifies map ownership once,
 * rather than once for each of the at-most-197 already bounded positions. */
function actorAllows(world:World,pawn:Pawn):(cell:Cell)=>boolean {
 const policy=captureAllowedArea(world,pawn);
 return policy?cell=>allowedAreaAllows(world,pawn,cell,policy):()=>true;
}
const memberIndices=new WeakMap<PartyActive292,{members:PartyMember292[];index:Map<number,PartyMember292>}>();
const openingPresence=new WeakMap<World,{tick:number;startedAtCore:number;ids:ReadonlySet<number>}>();
const departurePass=new WeakMap<World,{tick:number;ids:ReadonlySet<number>}>();
function departing(world:World):ReadonlySet<number> {
 let pass=departurePass.get(world);if(!pass||pass.tick!==world.tick){pass={tick:world.tick,ids:partyDepartureIds292(world)};departurePass.set(world,pass);}return pass.ids;
}
function membersOf(active:PartyActive292):Map<number,PartyMember292> {
 let cached=memberIndices.get(active);
 if(!cached||cached.members!==active.members){cached={members:active.members,index:new Map(active.members.map(m=>[m.pawnId,m]))};memberIndices.set(active,cached);}return cached.index;
}
interface PassSpace {tick:number;active:PartyActive292;topology:RoomTopology;structures:World['structures'];jobs:World['jobs'];structureCount:number;jobCount:number;space:PartySpace292}
const passSpaces=new WeakMap<World,PassSpace>();
function spaceFor(world:World,active:PartyActive292,topology?:RoomTopology):PartySpace292 {
 const rooms=partyTopology292(world,topology),old=passSpaces.get(world);
 // Membership copies do not invalidate geometry. Furniture changes do.
 if(old&&old.tick===world.tick&&old.active.site===active.site&&old.topology===rooms&&old.structures===world.structures&&old.jobs===world.jobs&&old.structureCount===world.structures.length&&old.jobCount===world.jobs.length)return old.space;
 const space=capturePartySpace292(world,active.site,rooms);
 passSpaces.set(world,{tick:world.tick,active,topology:rooms,structures:world.structures,jobs:world.jobs,structureCount:world.structures.length,jobCount:world.jobs.length,space});return space;
}
const actualTask=(p:Pawn,a:PartyActive292)=>p.recreation.task?.activity==='party'&&p.recreation.task.partyStartedAtCore===a.startedAtCore;
const atTarget=(world:World,p:Pawn)=>{const t=p.recreation.task;return !!t&&p.x===t.target.x&&p.z===t.target.z&&p.moveCooldown<=0&&(p.motion?.end??0)<=world.tick;};
function release(world:World,ids:ReadonlySet<number>,finish=false,death=false):void {
 preparePartyRelease292(world,ids,{finish,death}).commit();
}

/** Cheap clinical boundary. No map, hostiles, furniture or per-pawn member scan. */
export function reconcilePartyPawn292(world:World,pawn:Pawn,body?:BodyAssessment):void {
 const a=world.schemaVersion===292?world.party292?.active:undefined;if(!a)return;
 const member=membersOf(a).has(pawn.id),organizer=pawn.id===a.organizerId;
 if(!member&&!organizer)return;
 const dead=pawn.state==='dead'||!!pawn.health?.death;
 if(dead||!partyCapable292(world,pawn,body,organizer)||member&&(!actualTask(pawn,a)||partyBusy292(pawn,true)))
  release(world,new Set([pawn.id]),organizer,dead&&member);
}

/** Reconcile all current owners before dispatch or outcome. No presence credit. */
export function reconcileParty292(world:World,topology?:RoomTopology):void {
 const a=world.schemaVersion===292?world.party292?.active:undefined;if(!a)return;
 const opening=openingPresence.get(world);
 if(!opening||opening.tick!==world.tick||opening.startedAtCore!==a.startedAtCore){
  const ids=new Set<number>(),index=membersOf(a);
  // Coordinates may already store a future edge endpoint: use the previous
  // persisted watermark, not this pass's finishing instant, for arrival proof.
  for(const p of world.pawns)if(index.has(p.id)&&actualTask(p,a)&&p.recreation.task!.phase==='active'
   &&p.x===p.recreation.task!.target.x&&p.z===p.recreation.task!.target.z&&(p.motion?.end??0)<=a.advancedAtCore/10&&p.moveCooldown<=0)ids.add(p.id);
  openingPresence.set(world,{tick:world.tick,startedAtCore:a.startedAtCore,ids});
 }
 const people=new Map(world.pawns.map(p=>[p.id,p])),organizer=people.get(a.organizerId),space=spaceFor(world,a,topology);
 const removed=new Set<number>();let death=false;
 for(const m of a.members){
  const p=people.get(m.pawnId);
  if(!p||p.state==='dead'||p.health?.death){removed.add(m.pawnId);death=true;continue;}
  const task=p.recreation.task,allows=actorAllows(world,p);
  if(!actualTask(p,a)||!partyCapable292(world,p)||partyBusy292(p,true)||!task
   ||departing(world).has(p.id)||!allows(a.site)||!allows(task.target)
   ||!partyTaskSiteValid292(world,task,space.topology,space.standable))removed.add(m.pawnId);
 }
 const stop=!partyHome292(world)||!organizer||!partyCapable292(world,organizer,undefined,true)||partyDanger292(world)==='High'
  ||!space.standable(a.site)||space.topology.at(a.site.x,a.site.z)?.kind!=='space';
 if(removed.size||stop||death)release(world,removed,stop,death);
}

/** The rare starter shares one physical connectivity capture, never one flood
 * per destination/participant. Individual navigation remains authoritative at admission. */
function startingSite(world:World,organizer:Pawn,potential:readonly Pawn[],topology:RoomTopology,threshold:number):Cell|undefined {
 const space=capturePartySpace292(world,organizer,topology);
 const policies=new Map(potential.map(p=>[p.id,actorAllows(world,p)])),organizerAllows=policies.get(organizer.id)!;
 const gathers=world.structures.filter(s=>isGatherSpot(s)&&gatherActive(s)&&!deconstructionReserved(world,s.id))
  .sort((a,b)=>(a.x-organizer.x)**2+(a.z-organizer.z)**2-((b.x-organizer.x)**2+(b.z-organizer.z)**2)||a.id-b.id);
 const blocked=blockedCells(world),access=candidateAccess(world,organizer,blocked,EMPTY_IDS,true);
 // One nearest valid point per active gather, then the organizer's own area.
 // Sites do not retain any furniture identity after the start.
 for(const anchor of [...gathers,organizer]){
  const site=partyCells292(anchor).find(c=>space.standable(c)&&organizerAllows(c)&&topology.at(c.x,c.z)?.kind==='space'&&access.has(cellIndex(world,c.x,c.z)));
  if(!site)continue;
  const positions=partyCells292(site).filter(c=>space.standable(c)&&partyArea292(world,site,c,topology));
  let count=0;
  for(const p of potential){const allows=policies.get(p.id)!;if(access.has(cellIndex(world,p.x,p.z))&&positions.some(allows)&&allows(site))count++;}
  if(count>=threshold)return site;
 }
}
function tryStart(world:World,topology?:RoomTopology):void {
 const state=world.party292!,now=world.tick*10;
 if(state.active||!state.pending||state.lastStartedAtCore!==undefined&&now-state.lastStartedAtCore<PARTY_COOLDOWN_CORE292)return;
 const hour=hourOfDay(calendarTick(world));if(hour<4||hour>21||partyDanger292(world)!=='None')return;
 const civilians=world.pawns.filter(partyCivil292);
 if(civilians.length<4||civilians.some(p=>p.health&&medicalBleed(p.health)>0)||civilians.filter(p=>!!p.draft).length*2>=civilians.length)return;
 const departures=departing(world),potential=civilians.filter(p=>partyCapable292(world,p)&&!departures.has(p.id)&&!carrierOf(world,p.id)),threshold=partyThreshold292(civilians.length);
 if(potential.length<threshold)return;
 const rooms=partyTopology292(world,topology);
 // Choose a capable organizer, not an automatically admitted participant.
 const organizer=potential.find(p=>partyCapable292(world,p,undefined,true)&&!partyBusy292(p));if(!organizer)return;
 const site=startingSite(world,organizer,potential,rooms,threshold);if(!site)return;
 const roll=partyRoll292(state.rng);state.rng=roll.rng;state.pending=false;state.lastStartedAtCore=now;
 state.active={startedAtCore:now,durationCore:5000+Math.floor(roll.value*10001),advancedAtCore:now,organizerId:organizer.id,site,members:[]};
 world.events.push({tick:world.tick,type:'need',message:`${organizer.name} organise une fête.`});
 if(world.events.length>80)world.events.splice(0,world.events.length-80);
}

/** Fin de passe : occasion prospective, timeout AVANT crédit, un watermark. */
export function advanceParty292(world:World,topology?:RoomTopology):void {
 if(!partyHome292(world))return;
 const now=world.tick*10;
 if(!world.party292){world.party292={adoptedAtCore:now,nextCheckCore:now+PARTY_CHECK_CORE292,rng:partySeed292(world.seed,registeredMapId(world)),pending:false};return;}
 let state=world.party292;
 const checked=now>=state.nextCheckCore;
 if(checked){
  // Preserve cadence without replaying missed historical opportunities.
  state.nextCheckCore+=Math.floor((now-state.nextCheckCore)/PARTY_CHECK_CORE292+1)*PARTY_CHECK_CORE292;
  const roll=partyRoll292(state.rng);state.rng=roll.rng;if(roll.value<PARTY_CHANCE292)state.pending=true;
 }
 reconcileParty292(world,topology);state=world.party292!;
 const a=state.active;
 if(!a){if(checked)tryStart(world,topology);return;}
 if(now-a.startedAtCore>a.durationCore){release(world,EMPTY_IDS,true);return;}
 if(now<=a.advancedAtCore)return;
 const interval=Math.min(10,now-a.advancedAtCore),people=new Map(world.pawns.map(p=>[p.id,p])),space=spaceFor(world,a,topology);
 for(const m of a.members){
  const p=people.get(m.pawnId),task=p?.recreation.task;
  if(p&&task&&actualTask(p,a)&&task.phase==='active'&&task.elapsed>0&&openingPresence.get(world)?.ids.has(p.id)&&m.joinedAtCore<=a.advancedAtCore&&atTarget(world,p)
   &&partyArea292(world,a.site,p,space.topology)){
   m.presentCore+=interval;gainRecreation(p.recreation,'social',PARTY_JOY292*interval/10);
  }
 }
 a.advancedAtCore=now;
}

/** Runs after needs and player orders, before personal leisure/new work. */
export function processParty292(world:World,pawn:Pawn,context:NeedContext):boolean {
 const a=world.schemaVersion===292?world.party292?.active:undefined;if(!a)return false;
 const member=membersOf(a).has(pawn.id);
 if(member){
  reconcilePartyPawn292(world,pawn);const active=world.party292?.active;
  if(!active||!membersOf(active).has(pawn.id))return false;
  const task=pawn.recreation.task!,space=spaceFor(world,active,context.recreationTopology?.()),allows=actorAllows(world,pawn);
  if(!partyTaskSiteValid292(world,task,space.topology,space.standable)||!allows(active.site)||!allows(task.target)){
   release(world,new Set([pawn.id]));return false;
  }
  if(task.phase==='travel'){
   if(!atTarget(world,pawn)){context.move(task.target,true);return true;}
   task.phase='active';task.elapsed=0;pawn.path=[];pawn.state='recreating';
   context.event(`${pawn.name} rejoint la fête.`);return true;
  }
  if(!atTarget(world,pawn)){task.phase='travel';task.elapsed=0;return true;}
  task.elapsed++;pawn.state='recreating';return true;
 }
 if(!partyHome292(world)||!partyCapable292(world,pawn)||partyBusy292(pawn)||departing(world).has(pawn.id)||world.tick*10-a.startedAtCore>a.durationCore-PARTY_MIN_REMAINING_CORE292)return false;
 // Direct cargo with an otherwise orphaned task is still an actual owner.
 if(world.piles.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id)||world.packed.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id)||carrierOf(world,pawn.id))return false;
 const space=spaceFor(world,a,context.recreationTopology?.()),reserved=reservedServiceCells(world,pawn.id),allows=actorAllows(world,pawn);
 if(!allows(a.site))return false;
 const candidates=space.cells.filter(c=>!reserved.has(cellIndex(world,c.x,c.z))&&allows(c));
 if(!candidates.length)return false;
 const near=candidates.filter(c=>(c.x-a.site.x)**2+(c.z-a.site.z)**2<=9),goals=near.length?near:candidates;
 const reach=context.search(new Set(goals.map(c=>cellIndex(world,c.x,c.z))));
 if(!reach)return true; // Shared quota exhausted: defer, never mark inaccessible.
 const routes=candidates.flatMap(target=>{const path=routeToCell(world,target,reach);return path?[{target,path}]:[];});
 routes.sort((x,y)=>x.path.length-y.path.length||cellIndex(world,x.target.x,x.target.z)-cellIndex(world,y.target.x,y.target.z));
 const selected=routes[0];if(!selected)return false;
 const now=world.tick*10;
 a.members=[...a.members,{pawnId:pawn.id,joinedAtCore:now,presentCore:0}];if(pawn.id===a.organizerId)a.organizerJoined=true;
 pawn.recreation.task={activity:'party',partyStartedAtCore:a.startedAtCore,buildingId:null,target:selected.target,phase:'travel',elapsed:0};
 pawn.path=selected.path;pawn.planCooldown=0;pawn.state='moving';return true;
}
