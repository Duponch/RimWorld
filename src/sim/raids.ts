import { chooseMechanoidOpportunity,createMechanoidRaid,advanceMechanoidRaid } from './mechanoid-raids.ts';
import { isColonist } from './affiliation.ts';
import { carrierOf } from './rescue-state.ts';
import { consumeCassandraOpportunity,INTRO_RAID_TICK } from './cassandra-raids.ts';
import { raidEntries,atMapEdge } from './raid-space.ts';
import { RAID_ROLE_COST,pirateMaxPawnCost,raidRandom,type RaidComposition,type RaidRole } from './raid-state.ts';
import { createRaidGroup,RAID_ROLE_OPTIONS } from './raid-spawn.ts';
import { computeThreatPoints,summaryHealthPercent } from './threat-points.ts';
import { cancelShooting } from './shooting-state.ts';
import { cancelMelee } from './melee-state.ts';
import { TICKS_PER_DAY,type World,type Pawn } from './types.ts';

const log=(w:World,message:string)=>{w.events.push({tick:w.tick,type:'command',message});if(w.events.length>80)w.events.splice(0,w.events.length-80);};
/** Local projection of a Core pirate group, using only physical weapon types
 * Lisière implements. Weighted choices spend until no available role fits. */
export function chooseRaidComposition(budget:number,random:{rng:number}):RaidComposition {
  if(!Number.isFinite(budget)||budget<35||budget>10000)throw new RangeError('Invalid raid budget.');
  const roster:RaidRole[]=[],maxCost=pirateMaxPawnCost(budget);let remaining=budget;
  for(;;){
    const eligible=RAID_ROLE_OPTIONS.filter(option=>RAID_ROLE_COST[option.role]<=remaining&&RAID_ROLE_COST[option.role]<=maxCost);
    if(!eligible.length)break;
    const total=eligible.reduce((sum,option)=>sum+option.weight,0),draw=raidRandom(random)*total;
    let weight=0,selected=eligible.at(-1)!;
    for(const option of eligible){weight+=option.weight;if(draw<weight){selected=option;break;}}
    roster.push(selected.role);remaining-=RAID_ROLE_COST[selected.role];
  }
  return {budget,roster};
}
export function enableRaids(w:World):void {
  if(w.raids)return;const s=w.raids={profile:'camp-raids-v1' as const,rng:((w.seed^0x7a1d068)>>>0)||1,nextCheck:0,serial:0,completed:0,departed:[]};s.nextCheck=w.tick+Math.floor(TICKS_PER_DAY*(3.5+raidRandom(s)*.5));
}
export function stopRaidEngagement(p:Pawn):void {cancelShooting(p);cancelMelee(p);delete p.tactics;p.path=[];if(p.raid)p.raid.goal=null;p.planCooldown=0;}
/** Calendar and group outcomes, once per tick. Pawn controllers own movement. */
export function advanceRaids(w:World):void {
  const s=w.raids;if(!s)return;
  const cassandra=s.profile==='cassandra-raids-v1',opportunity=cassandra&&consumeCassandraOpportunity(w,s);
  if(s.mechActive){advanceMechanoidRaid(w);return;}
  const a=s.active;
  if(a){
    const members=w.pawns.filter(p=>a.members.includes(p.id));
    for(const p of members)if((p.state==='dead'||p.state==='downed'||p.prisoner||p.recruitment?.raidGroup===a.id)&&!a.lost.includes(p.id))a.lost.push(p.id);a.lost.sort((a,b)=>a-b);
    if(a.phase==='assault'){
      const reason=a.lost.length*1000>=a.members.length*a.lossPermille?'losses':w.tick>=a.deadline?'timeout':!w.pawns.some(p=>isColonist(p)&&p.state!=='dead'&&p.state!=='downed')?'colony-down':undefined;
      if(reason){a.phase='withdraw';a.reason=reason;for(const p of members)if(p.raid&&!p.prisoner){p.raid.exiting=true;stopRaidEngagement(p);}log(w,reason==='losses'?'Les assaillants battent en retraite après leurs pertes.':reason==='timeout'?'Les assaillants abandonnent et cherchent une sortie.':'La défense est tombée. Les assaillants se retirent ; les victimes restent sur place.');}
    }
    if(!members.some(p=>p.state!=='dead'&&p.state!=='downed'&&!p.prisoner&&!isColonist(p))){
      const captured=members.filter(p=>p.state!=='dead'&&(p.prisoner||p.recruitment?.raidGroup===a.id)).length;
      s.last={id:a.id,tick:w.tick,reason:a.reason==='colony-down'?'colony-down':s.departed.some(d=>a.members.includes(d.pawnId))?'withdrawn':'defended',killed:members.filter(p=>p.state==='dead').length,downed:members.filter(p=>p.state==='downed'&&!p.prisoner&&!p.recruitment).length,escaped:a.members.length-members.length,...captured?{captured}:{},...a.composition?{composition:a.composition}:{},...a.originQuestId!==undefined?{originQuestId:a.originQuestId}:{}};
      for(const p of members)if(p.raid&&!p.prisoner){p.raid.exiting=true;stopRaidEngagement(p);}
      s.completed++;delete s.active;s.nextCheck=cassandra?s.cassandra!.pending[0]!:w.tick+Math.floor(TICKS_PER_DAY*(6+raidRandom(s)*2));log(w,'Assaut terminé. Vérifiez les blessés, les stocks et les ouvrages endommagés.');
    }
    return;
  }
  if(cassandra?!opportunity||!w.pawns.some(p=>isColonist(p)&&p.state!=='dead'):s.nextCheck===null||w.tick<s.nextCheck)return;
  // Only adopted Cassandra colonies use the new wealth budget. The fixed
  // introductory raid and every legacy calendar retain their exact draws.
  const budgeted=cassandra&&w.tick!==INTRO_RAID_TICK&&!!w.economy;
  const random={rng:s.rng};
  const freeColonists=budgeted?w.pawns.filter(p=>isColonist(p)&&p.state!=='dead'&&!p.prisoner&&!p.visitor):[];
  const points=budgeted?computeThreatPoints({
    knownWealth:w.economy!.wealth.knownStorytellerWealth,
    freeColonists:freeColonists.length,
    colonistHealthSum:freeColonists.reduce((sum,p)=>sum+(p.health?summaryHealthPercent(p.health):1),0),
    elapsedDays:w.tick/TICKS_PER_DAY,
    adaptationDays:w.economy!.adaptationDays,
    seedBucket:Math.floor(w.tick/250),
  }).points:undefined;
  const mechRandom=s.mechanoid?{rng:s.mechanoid.rng}:undefined;
  const mech=points!==undefined&&mechRandom?chooseMechanoidOpportunity(w,points,mechRandom):undefined;
  if(mech!==undefined){
    if(mech===null){s.mechanoid!.rng=mechRandom!.rng;return;}
    createMechanoidRaid(w,mech,mechRandom!);return;
  }
  const composition=points!==undefined?chooseRaidComposition(points,random):undefined;
  const count=composition?.roster.length??(s.serial===0?1:2),sites=raidEntries(w,s.rng,count);
  if(!sites||!createRaidGroup(w,{count,sites,random,...(composition?{composition}:{})})){
    if(!cassandra)s.nextCheck=w.tick+TICKS_PER_DAY/4;
    return;
  }else if(mechRandom){s.mechanoid!.rng=mechRandom.rng;s.mechanoid!.lastFaction='outlaws';}
}
/** Remove only an actor physically at the boundary, after travel/recovery.
 * Export carried equipment with identity/quality/HP; ground loot stays here. */
export function exitRaider(w:World,p:Pawn):boolean {
  if(!w.pawns.includes(p))return false;
  if(isColonist(p)||p.prisoner&&!p.prisoner.escape||carrierOf(w,p.id))return false;
  if(!p.raid?.exiting||!atMapEdge(w,p)||p.moveCooldown>0||(p.motion?.end??0)>w.tick||p.melee?.strike||p.shooting?.stance||p.need||p.state==='sleeping'||(p.stun?.untilCore??0)>w.tick*10||p.state==='dead'||p.state==='downed')return false;
  const items=w.piles.filter(i=>(i.owner.type==='apparel'||i.owner.type==='equipment')&&i.owner.pawnId===p.id);
  if(w.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)||p.interruptedCargo||p.equipmentDropPending)return false;
  const released=p.prisoner?.releasedAt!==undefined?{reason:'released' as const,capturedAt:p.prisoner.capturedAt,releasedAt:p.prisoner.releasedAt}:{};
  w.raids!.departed.push({group:p.raid.group,pawnId:p.id,name:p.name,cell:{x:p.x,z:p.z},tick:w.tick,items,...released});w.piles=w.piles.filter(i=>!items.includes(i));w.pawns=w.pawns.filter(q=>q!==p);
  for(const q of w.pawns)if(q.shooting?.order?.targetId===p.id||q.melee?.order?.targetId===p.id||q.tactics?.targetId===p.id){stopRaidEngagement(q);if((q.motion?.end??0)<=w.tick&&q.state==='moving')q.state='idle';}
  log(w,p.prisoner?.releasedAt!==undefined?`${p.name} quitte librement la carte après sa libération, avec ses objets portés.`:p.prisoner?`${p.name} s'est échappé au bord de la carte avec ses objets portés.`:`${p.name} quitte la carte avec son équipement porté.`);return true;
}
