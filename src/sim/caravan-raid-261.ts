import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {retainRaidResult261} from './temp-map-raids-261.ts';
import {isColonist} from './affiliation.ts';
import {registeredCampaign} from './world-map-context.ts';
import {cancelMelee} from './melee-state.ts';
import {cancelShooting} from './shooting-state.ts';
import type {Pawn,World} from './types.ts';
/** This controller has no timeout/loss retreat and never consumes a Cassandra
 * opportunity. Physical combat, pathfinding and exits keep their existing owners. */
export function advanceCaravanRaid261(w:World):boolean {
 const calendar=w.raids,a=calendar?.active,source=a?.caravan261;
 if(!calendar||!a||!source)return false;
 if(source.kind==='pressure')return false;
 if((Number(w.schemaVersion)!==261&&(Number(w.schemaVersion)!==262&&!isSchema263OrLater(Number(w.schemaVersion))))||a.deadline!==null||a.lossPermille!==null)throw Error('Invalid real incident raid controller');
 const members=w.pawns.filter(p=>a.members.includes(p.id)),lost=(p:Pawn)=>p.state==='dead'||p.state==='downed'||!!p.prisoner||p.recruitment?.raidGroup===a.id;
 for(const p of members)if(lost(p)&&!a.lost.includes(p.id))a.lost.push(p.id);a.lost.sort((a,b)=>a-b);
 if(source.kind==='defend-caravan'&&a.phase==='assault'){
  const factions=registeredCampaign(w).worldFactions;
  const relation=factions?.relations.find(r=>r.aId===Math.min(source.factionId,factions.playerFactionId)&&r.bId===Math.max(source.factionId,factions.playerFactionId));
  if(!relation)throw Error('Missing defended caravan faction relation');
  const remaining=(id:number)=>members.some(p=>p.id===id&&!lost(p));
  const reason=relation.kind!=='hostile'?'non-hostile':!remaining(source.traderId)&&!source.guardIds.some(remaining)?'trader-lost':undefined;
  if(reason){a.phase='withdraw';a.reason=reason;for(const p of members)if(p.raid&&!p.prisoner){cancelMelee(p);cancelShooting(p);delete p.tactics;p.path=[];p.planCooldown=0;p.raid.exiting=true;p.raid.goal=null;}}
 }
 if(!members.some(p=>!lost(p)&&!isColonist(p))){
  const captured=members.filter(p=>p.state!=='dead'&&(p.prisoner||p.recruitment?.raidGroup===a.id)).length;
  const escaped=a.members.length-members.length;
  calendar.last={id:a.id,tick:w.tick,reason:escaped?'withdrawn':'defended',killed:members.filter(p=>p.state==='dead').length,downed:members.filter(p=>p.state==='downed'&&!p.prisoner&&!p.recruitment).length,escaped,...captured?{captured}:{},caravan261:source,memberCount261:a.members.length};
  for(const p of members)if(p.raid&&!p.prisoner){p.raid.exiting=true;p.raid.goal=null;}
  retainRaidResult261(w);calendar.completed++;delete calendar.active;calendar.nextCheck=null;
 }
 return true;
}
