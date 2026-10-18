import {actualMechanicalBirthFaction259} from './mechanoid-world-faction-259.ts';
import {mechRaidGroups261,multiRaid261,beginMechanicalMulti261} from './mechanical-raid-groups-261.ts';
import {retainRaidResult261} from './temp-map-raids-261.ts';
import {tempMapModern261} from './temp-map-incidents-261.ts';
import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import { captureStandability } from './furniture-travel.ts';
import { raidEntries,atMapEdge } from './raid-space.ts';
import { raidRandom } from './raid-state.ts';
import { TICKS_PER_DAY,type Cell,type World } from './types.ts';
import type { MechanoidRaidComposition,MechanoidRaidGroup } from './mechanoid-raid-state.ts';
import type { Mechanoid } from './mechanoid-state.ts';
import { mechanoidDefinition } from './mechanoid-definition.ts';
import { mechFactionCommonality,chooseMechanoidComposition,validMechanoidComposition } from './mechanoid-raid-composition.ts';
export { mechFactionCommonality,mechMaxPawnCost,mechanoidRaidCost,chooseMechanoidComposition,validMechanoidComposition } from './mechanoid-raid-composition.ts';

export function enableMechanoidRaids(w:World):boolean {
  const s=w.raids;if(w.schemaVersion<194||!s||s.profile!=='cassandra-raids-v1')return false;
  s.mechanoid??={adoptedAt:w.tick,rng:((w.seed^0x2135ca7)>>>0)||1};
  if(w.schemaVersion>=197)s.mechanoid.ranged??={adoptedAt:w.tick};return true;
}
/** Returns undefined for the historical branch, null for a consumed absent ticket. */
export function chooseMechanoidOpportunity(w:World,points:number,random:{rng:number}):MechanoidRaidComposition|null|undefined {
  const policy=w.raids?.mechanoid;
  if(w.schemaVersion<194||!policy||w.tick<45*TICKS_PER_DAY||points<=300)return undefined;
  const mech=mechFactionCommonality(points)*(policy.lastFaction==='mechanoid'?.4:1);
  const pirate=policy.lastFaction==='outlaws'?.4:1;
  if(raidRandom(random)*(mech+pirate)>=mech)return undefined;
  return chooseMechanoidComposition(points,random,w.schemaVersion>=197&&!!policy.ranged);
}
function adoptMechanoidRaid(w:World,composition:MechanoidRaidComposition,random:{rng:number},sites=raidEntries(w,random.rng,composition.roster.length),source260?:'camp-pressure'):MechanoidRaidGroup|null {
  const s=w.raids,count=composition.roster.length,prospective=source260!==undefined&&w.schemaVersion===261&&tempMapModern261(w),worldFaction259=(Number(w.schemaVersion)===259||Number(w.schemaVersion)===260||w.schemaVersion===261)?actualMechanicalBirthFaction259(w.worldFactions):undefined;
  if((Number(w.schemaVersion)===259||Number(w.schemaVersion)===260||w.schemaVersion===261)&&!worldFaction259)return null;
  if(w.schemaVersion<194||!s?.mechanoid||(source260?s.profile!=='camp-pressure-v1':s.profile!=='cassandra-raids-v1')||!Number.isSafeInteger(w.tick*10+14999)||!prospective&&(!!s.active||!!s.mechActive)||!sites||sites.length!==count
    ||!Number.isSafeInteger(count)||count<1||!validMechanoidComposition(composition,w.schemaVersion>=197&&!!s.mechanoid.ranged)
    ||!Number.isSafeInteger(s.serial+1)||!Number.isSafeInteger(w.nextId+count)
    ||(w.mechanoids?.length??0)+w.pawns.length+(w.wildlife?.animals.length??0)+count>w.width*w.height)return null;
  const stands=captureStandability(w),occupied=new Set<number>(),used=new Set<number>();
  for(const actor of [...w.pawns,...(w.wildlife?.animals??[]),...(w.mechanoids??[])]){
    occupied.add(actor.z*w.width+actor.x);
    if(actor.motion&&actor.motion.end>w.tick)occupied.add(actor.motion.from.z*w.width+actor.motion.from.x);
  }
  for(const c of sites){const key=c.z*w.width+c.x;
    if(!Number.isSafeInteger(c.x)||!Number.isSafeInteger(c.z)||c.x<0||c.z<0||c.x>=w.width||c.z>=w.height
      ||!atMapEdge(w,c)||!stands(c)||occupied.has(key)||used.has(key))return null;
    used.add(key);
  }
  const draft={rng:random.rng},delayCore=5000+Math.floor(raidRandom(draft)*10000),id=s.serial+1;
  const generated:Mechanoid[]=sites.map((c,i)=>({id:w.nextId+i,mechKind:composition.roster[i]!,...c,state:'idle',...worldFaction259?{worldFaction259:{...worldFaction259}}:{},
    path:[],heading:0,moveCooldown:0,planCooldown:0,raid:{group:id,goal:null}}));
  const group:MechanoidRaidGroup={...source260?{source260}:{},id,startedAt:w.tick,members:generated.map(m=>m.id),lost:[],phase:'staging',
    stage:{point:{...sites[0]!},activatedAtCore:w.tick*10,delayCore},composition:{budget:composition.budget,roster:[...composition.roster]}};
  w.nextId+=count;(w.mechanoids??=[]).push(...generated);s.serial=id;s.nextCheck=null;
  if(prospective&&(s.active||s.mechActive||multiRaid261(w)))beginMechanicalMulti261(w);
  if(s.mechActive)s.extraMechActive261!.push(group);else s.mechActive=group;
  if(!source260){s.mechanoid.rng=draft.rng;s.mechanoid.lastFaction='mechanoid';}random.rng=draft.rng;
  w.events.push({tick:w.tick,type:'command',message:composition.roster.every(k=>k==='scyther')?`${count} Scyther(s) arrivent et se préparent à attaquer. Leur défense est déjà active.`:
    `${count} mécanoïdes (${composition.roster.map(k=>mechanoidDefinition(k).label).join(', ')}) arrivent et se préparent à attaquer. Leur défense est déjà active.`});
  if(w.events.length>80)w.events.splice(0,w.events.length-80);
  return group;
}
export function createMechanoidRaid(w:World,composition:MechanoidRaidComposition,random:{rng:number},sites?:Cell[]):MechanoidRaidGroup|null {
 return adoptMechanoidRaid(w,composition,random,sites);
}
/** Forced actual player-Camp entry; no faction ticket, age gate or agenda RNG. */
export function createCampPressureMechanoidRaid260(w:World,points:number,random:{rng:number}):MechanoidRaidGroup|null {
 const root=registeredCampaign(w),mapId=registeredMapId(w),site=root.worldMaps?.sites.find(s=>s.id===mapId),factions=root.worldFactions;
 if((Number(w.schemaVersion)!==260&&w.schemaVersion!==261)||!(site?.kind==='camp'||w.schemaVersion===261&&site?.kind==='battlefield'&&site.battlefield261?.factionId===null)||!site.campPressure||!factions?.factions.some(f=>f.id===factions.playerFactionId&&(f.def==='PlayerColony'||f.def==='PlayerTribe'))||!factions.factions.some(f=>f.def==='Mechanoid')||w.raids?.profile!=='camp-pressure-v1'||!w.raids.mechanoid||!(w.schemaVersion===261&&tempMapModern261(w))&&(!!w.raids.active||!!w.raids.mechActive))return null;
 const draft={rng:random.rng},composition=chooseMechanoidComposition(points,draft,!!w.raids.mechanoid.ranged);if(!composition)return null;
 const result=adoptMechanoidRaid(w,composition,draft,undefined,'camp-pressure');if(result)random.rng=draft.rng;return result;
}
/** The ordinary agenda has already consumed its opportunity before this call. */
export function advanceMechanoidRaid(w:World,core=w.tick*10):boolean {
 const groups=mechRaidGroups261(w);for(const g of groups)advanceMechanicalGroup(w,g,core);return groups.length>0;
}
function advanceMechanicalGroup(w:World,g:MechanoidRaidGroup,core:number):boolean {
  const s=w.raids!;
  if(g.lost.length===g.members.length){
    s.last={id:g.id,tick:w.tick,reason:'defended',killed:g.members.length,downed:0,escaped:0,
      mechanoid:true,mechComposition:{budget:g.composition.budget,roster:[...g.composition.roster]}};
    retainRaidResult261(w);s.completed++;
    if(s.mechActive===g)delete s.mechActive;else s.extraMechActive261=s.extraMechActive261!.filter(row=>row!==g);
    if(!tempMapModern261(w)&&!s.active&&!mechRaidGroups261(w).length&&!s.extraActive261?.length)s.nextCheck=s.profile==='camp-pressure-v1'?null:s.cassandra!.pending[0]!;
    w.events.push({tick:w.tick,type:'command',message:g.composition.roster.every(k=>k==='scyther')?'Les Scythers sont neutralisés. Leurs carcasses peuvent être récupérées.':'Les mécanoïdes sont neutralisés. Leurs carcasses peuvent être récupérées.'});
    if(w.events.length>80)w.events.splice(0,w.events.length-80);return true;
  }
  if(g.phase==='staging'&&(core>g.stage.activatedAtCore+g.stage.delayCore||g.lost.length*10>=g.members.length*3)){
    g.phase='assault';
    for(const m of w.mechanoids??[])if(m.raid?.group===g.id){m.planCooldown=0;m.raid.goal=null;}
    w.events.push({tick:w.tick,type:'command',message:g.composition.roster.every(k=>k==='scyther')?'Les Scythers commencent leur assaut. Ils ne battent pas en retraite.':'Les mécanoïdes commencent leur assaut. Ils ne battent pas en retraite.'});
    if(w.events.length>80)w.events.splice(0,w.events.length-80);
  }
  return true;
}
