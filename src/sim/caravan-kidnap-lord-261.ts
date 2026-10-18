import {hiveDoorFreePassage256} from './cave-hive-closewalk-256.ts';
import {raidGroup261,raidGroups261,raidKidnapSource261} from './temp-map-raids-261.ts';
import type {RaidGroup} from './raid-state.ts';
import {candidateAccess} from './candidate-access.ts';
import {blockedCells} from './pathfinding.ts';
import {RoomTopologyCache} from './room-topology.ts';
import {isPassageDoor} from './door-rules.ts';
import {distanceSquared} from './affiliation.ts';
import {pawnBody} from './health-rules.ts';
import {registeredCampaign} from './world-map-context.ts';
import {physicalKidnapReason261,kidnapping261,startPhysicalKidnap261} from './caravan-kidnap-261.ts';
import {cancelMelee} from './melee-state.ts';
import {cancelShooting} from './shooting-state.ts';
import type {World,Pawn} from './types.ts';

/** Prospective native Lord/Trigger data, never inferred from an old assault. */
export interface KidnapLord261 {revision:1;pawnCycleIndex:number;lastPawnHarmCore:number;phase:'assault'|'cover'|'take';enteredAtCore:number;kidnapDutyIds:number[];exitJobs:{pawnId:number;untilCore:number}[]}
export const bornKidnapLord261=(atCore:number):KidnapLord261=>({revision:1,pawnCycleIndex:0,lastPawnHarmCore:-99999,phase:'assault',enteredAtCore:atCore,kidnapDutyIds:[],exitJobs:[]});
const source=(w:World,p:Pawn)=>w.schemaVersion===261?raidKidnapSource261(raidGroup261(w,p.raid?.group)):undefined;
const caches=new WeakMap<World,RoomTopologyCache>();
/** Current room topology substitutes for Core's nine-region traversal inside
 * one room. Radius is strict12 and sleeping humans remain dangerous. This is
 * an explicit region-model adaptation, not a visibility or reachability proxy. */
export function kidnapDangerousCombat261(w:World,p:Pawn):boolean {
 let cache=caches.get(w);if(!cache){cache=new RoomTopologyCache();caches.set(w,cache);}const rooms=cache.read(w),room=rooms.at(p.x,p.z);
 if(room?.kind!=='space')return true;
 const factions=registeredCampaign(w).worldFactions,own=p.worldAffiliation259?.factionId;
 const hostile=(id:number|null|undefined)=>id!==undefined&&id!==null&&own!==undefined&&own!==null&&!!factions?.relations.some(r=>r.kind==='hostile'&&r.aId===Math.min(own,id)&&r.bId===Math.max(own,id));
 const nearby=(q:{x:number;z:number;state:string})=>q.state!=='dead'&&q.state!=='downed'&&distanceSquared(p,q)<144&&rooms.at(q.x,q.z)===room;
 return w.pawns.some(q=>q!==p&&nearby(q)&&(q.mental?.crisis?.kind==='berserk'||hostile(q.worldAffiliation259?.factionId)))||(w.wildlife?.animals??[]).some(q=>nearby(q)&&(!!q.manhunter||hostile(q.hive?.factionId??(q.domestic?factions?.playerFactionId:undefined))))||(w.mechanoids??[]).some(q=>nearby(q)&&hostile(q.worldFaction259?.factionId));
}
/** Actual no-pass-closed-doors candidate access, player faction and edge path.
 * Navigation snapshots are built once for this bounded probe, never per frame. */
export function findKidnapVictim261(w:World,p:Pawn,maxDistance:number,disallowed:ReadonlySet<number>=new Set()):Pawn|undefined {
 const factions=registeredCampaign(w).worldFactions,player=factions?.playerFactionId,own=p.worldAffiliation259?.factionId;
 if(!factions||player===undefined||own===undefined||own===null||!factions.relations.some(r=>r.kind==='hostile'&&r.aId===Math.min(player,own)&&r.bId===Math.max(player,own))||pawnBody(p).capacities.manipulation<=0)return;
 const candidates=w.pawns.filter(q=>q.worldAffiliation259?.factionId===player&&q.state==='downed'&&!disallowed.has(q.id)&&distanceSquared(p,q)<=maxDistance*maxDistance&&!physicalKidnapReason261(w,p,q));
 if(!candidates.length)return;
 const grid=blockedCells(w,true);for(const s of w.structures)if(isPassageDoor(s.kind)&&!hiveDoorFreePassage256(w,s))grid[s.z*w.width+s.x]=1;
 const reach=candidateAccess(w,p,grid,new Set(),true);
 let edge=false;for(let x=0;x<w.width&&!edge;x++)edge=reach.has(x)||reach.has((w.height-1)*w.width+x);for(let z=1;z<w.height-1&&!edge;z++)edge=reach.has(z*w.width)||reach.has(z*w.width+w.width-1);if(!edge)return;
 return candidates.sort((a,b)=>distanceSquared(p,a)-distanceSquared(p,b)||a.id-b.id).find(q=>reach.has(q.z*w.width+q.x));
}
function interruptDuty(p:Pawn):void {if(kidnapping261(p))return;cancelMelee(p);cancelShooting(p);delete p.tactics;p.path=[];p.planCooldown=0;if(p.raid)p.raid.goal=null;}
function duties(w:World,l:KidnapLord261,members:Pawn[],all:boolean):void {
 const taken=new Set<number>();
 for(const p of members){
  if(p.state==='dead'||p.state==='downed'||p.prisoner)continue;
  if(!all&&l.kidnapDutyIds.includes(p.id))continue;
  const carried=kidnapping261(p),victim=l.phase==='take'?undefined:carried?.phase==='carry'?w.pawns.find(q=>q.id===carried.patientId):findKidnapVictim261(w,p,8,taken);
  const admit=l.phase==='take'||!!victim&&!kidnapDangerousCombat261(w,p);
  if(admit){if(!l.kidnapDutyIds.includes(p.id)){l.kidnapDutyIds.push(p.id);interruptDuty(p);}if(victim)taken.add(victim.id);}
  else if(all){l.kidnapDutyIds=l.kidnapDutyIds.filter(id=>id!==p.id);interruptDuty(p);}
 }
}
/** Native120 trigger and181 cover cadence translated by crossed Core boundary
 * at scale10;1200 transition is relative to actual entry, not raid birth. */
export function advanceKidnapLord261(w:World):void {for(const a of raidGroups261(w))advanceLord(w,a);}
function advanceLord(w:World,a:RaidGroup):void {
 const s=w.schemaVersion===261?raidKidnapSource261(a):undefined,l=s?.kidnapLord261;if(!s||!l||a.phase!=='assault')return;
 // The trigger indexes the ordered owned roster before testing Downed.
 // Duty assignments retain their separate collection of mobile members.
 const core=w.tick*10,roster=a.members.flatMap(id=>{const p=w.pawns.find(p=>p.id===id&&p.raid?.group===a.id&&!p.prisoner&&p.state!=='dead');return p?[p]:[];}),members=roster.filter(p=>p.state!=='downed');
 l.kidnapDutyIds=l.kidnapDutyIds.filter(id=>members.some(p=>p.id===id));
 l.exitJobs=l.exitJobs.filter(job=>l.kidnapDutyIds.includes(job.pawnId));
 if(l.phase==='assault'){
  if(core%120!==0||core-l.lastPawnHarmCore<=300)return;
  l.pawnCycleIndex++;if(l.pawnCycleIndex>=roster.length)l.pawnCycleIndex=0;const p=roster[l.pawnCycleIndex];
  if(!p||p.state==='downed'||p.mental?.crisis||!findKidnapVictim261(w,p,8)||kidnapDangerousCombat261(w,p))return;
  l.phase='cover';l.enteredAtCore=core;duties(w,l,members,true);
  w.events.push({tick:w.tick,type:'command',message:'Les assaillants tentent d’enlever les personnes à terre et couvrent leur retrait.'});if(w.events.length>80)w.events.splice(0,w.events.length-80);
 }else if(l.phase==='cover'){
  if(core-l.enteredAtCore>=1200){l.phase='take';l.enteredAtCore=core;duties(w,l,members,true);}
  else if(Math.floor(core/181)!==Math.floor((core-10)/181))duties(w,l,members,false);
 }
}
/** Damage/loss/arrest producers call this on their actual adopted World. A
 * fresh object protects transaction drafts which share the old raid header. */
export function notifyKidnapLordHarm261(w:World,p:Pawn):void {
 const a=raidGroup261(w,p.raid?.group),s=source(w,p);if(!s?.kidnapLord261||!a?.members.includes(p.id))return;
 const data={...s,kidnapLord261:{...s.kidnapLord261,lastPawnHarmCore:w.tick*10}},next={...a,...a.tempIncident261?{tempIncident261:data as NonNullable<RaidGroup['tempIncident261']>}:{caravan261:data as NonNullable<RaidGroup['caravan261']>}};
 w.raids={...w.raids!,...w.raids!.active===a?{active:next}:{extraActive261:w.raids!.extraActive261!.map(g=>g===a?next:g)}};
}
/** Core JobGiver radius18 then the real DutyDef ExitMapBest200Core fallback.
 * The existing strategic exit route can breach only when necessary. */
export function processKidnapDuty261(w:World,p:Pawn):'exit'|'kidnap'|'none' {
 const l=source(w,p)?.kidnapLord261;if(!l||l.phase==='assault'||!l.kidnapDutyIds.includes(p.id))return 'none';
 if(kidnapping261(p))return 'kidnap';
 const exit=l.exitJobs.find(job=>job.pawnId===p.id);if(exit&&exit.untilCore>w.tick*10)return 'exit';
 if(exit){l.exitJobs=l.exitJobs.filter(job=>job!==exit);if(p.raid){p.raid.exiting=false;p.raid.goal=null;}p.path=[];}
 const victim=findKidnapVictim261(w,p,18);
 if(victim&&!kidnapDangerousCombat261(w,p)&&startPhysicalKidnap261(w,p,victim))return 'kidnap';
 // Do not end the captured edge just to renew the native exit job.
 if(p.raid)p.raid.exiting=true;l.exitJobs.push({pawnId:p.id,untilCore:w.tick*10+200});return 'exit';
}
