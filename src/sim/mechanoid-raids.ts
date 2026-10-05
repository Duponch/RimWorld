import { captureStandability } from './furniture-travel.ts';
import { raidEntries,atMapEdge } from './raid-space.ts';
import { raidRandom } from './raid-state.ts';
import { TICKS_PER_DAY,type Cell,type World } from './types.ts';
import type { MechanoidRaidComposition,MechanoidRaidGroup } from './mechanoid-raid-state.ts';
import type { Mechanoid } from './mechanoid-state.ts';

export function enableMechanoidRaids(w:World):boolean {
  const s=w.raids;if(w.schemaVersion<194||!s||s.profile!=='cassandra-raids-v1')return false;
  s.mechanoid??={adoptedAt:w.tick,rng:((w.seed^0x2135ca7)>>>0)||1};return true;
}
export function mechFactionCommonality(points:number):number {
  const curve=[[300,0],[700,1],[1400,1.8],[2800,2.2],[4000,2.6]] as const;
  if(points<=300)return 0;
  for(let i=1;i<curve.length;i++)if(points<=curve[i]![0]){
    const [x,y]=curve[i]!,[px,py]=curve[i-1]!;return py+(y-py)*(points-px)/(x-px);
  }
  return 2.6;
}
export function mechMaxPawnCost(budget:number):number {
  let cap=200;
  if(budget>400)cap=budget<=900?200+(budget-400)*100/500:300+(Math.min(budget,100000)-900)*9700/99100;
  return Math.max(Math.min(cap,budget),132);
}
export function chooseMechanoidComposition(budget:number,random:{rng:number}):MechanoidRaidComposition|null {
  if(!Number.isFinite(budget)||budget<150||budget>10000||mechMaxPawnCost(budget)<150)return null;
  const envelope=budget<400?251:281,draw=raidRandom(random)*envelope;
  // all100/ranged80 are absent; only melee70 is implemented. No fallback.
  if(draw<180||draw>=250)return null;
  return {budget,roster:Array.from({length:Math.floor(budget/150)},()=> 'scyther' as const)};
}
/** Returns undefined for the historical branch, null for a consumed absent ticket. */
export function chooseMechanoidOpportunity(w:World,points:number,random:{rng:number}):MechanoidRaidComposition|null|undefined {
  const policy=w.raids?.mechanoid;
  if(w.schemaVersion<194||!policy||w.tick<45*TICKS_PER_DAY||points<=300)return undefined;
  const mech=mechFactionCommonality(points)*(policy.lastFaction==='mechanoid'?.4:1);
  const pirate=policy.lastFaction==='outlaws'?.4:1;
  if(raidRandom(random)*(mech+pirate)>=mech)return undefined;
  return chooseMechanoidComposition(points,random);
}
export function createMechanoidRaid(w:World,composition:MechanoidRaidComposition,random:{rng:number},sites=raidEntries(w,random.rng,composition.roster.length)):MechanoidRaidGroup|null {
  const s=w.raids,count=composition.roster.length;
  if(w.schemaVersion<194||!s?.mechanoid||s.profile!=='cassandra-raids-v1'||!Number.isSafeInteger(w.tick*10+14999)||s.active||s.mechActive||!sites||sites.length!==count
    ||!Number.isSafeInteger(count)||count<1||composition.roster.some(k=>k!=='scyther')
    ||!Number.isFinite(composition.budget)||composition.budget<150||composition.budget>10000
    ||count!==Math.floor(composition.budget/150)||mechMaxPawnCost(composition.budget)<150
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
  const generated:Mechanoid[]=sites.map((c,i)=>({id:w.nextId+i,mechKind:'scyther',...c,state:'idle',
    path:[],heading:0,moveCooldown:0,planCooldown:0,raid:{group:id,goal:null}}));
  const group:MechanoidRaidGroup={id,startedAt:w.tick,members:generated.map(m=>m.id),lost:[],phase:'staging',
    stage:{point:{...sites[0]!},activatedAtCore:w.tick*10,delayCore},composition:{budget:composition.budget,roster:[...composition.roster]}};
  w.nextId+=count;(w.mechanoids??=[]).push(...generated);s.serial=id;s.nextCheck=null;s.mechActive=group;
  s.mechanoid.rng=draft.rng;s.mechanoid.lastFaction='mechanoid';random.rng=draft.rng;
  w.events.push({tick:w.tick,type:'command',message:`${count} Scyther(s) arrivent et se préparent à attaquer. Leur défense est déjà active.`});
  if(w.events.length>80)w.events.splice(0,w.events.length-80);
  return group;
}
/** The ordinary agenda has already consumed its opportunity before this call. */
export function advanceMechanoidRaid(w:World,core=w.tick*10):boolean {
  const s=w.raids,g=s?.mechActive;if(!s||!g)return false;
  if(g.lost.length===g.members.length){
    s.last={id:g.id,tick:w.tick,reason:'defended',killed:g.members.length,downed:0,escaped:0,
      mechanoid:true,mechComposition:{budget:g.composition.budget,roster:[...g.composition.roster]}};
    s.completed++;delete s.mechActive;s.nextCheck=s.cassandra!.pending[0]!;
    w.events.push({tick:w.tick,type:'command',message:'Les Scythers sont neutralisés. Leurs carcasses peuvent être récupérées.'});
    if(w.events.length>80)w.events.splice(0,w.events.length-80);return true;
  }
  if(g.phase==='staging'&&(core>g.stage.activatedAtCore+g.stage.delayCore||g.lost.length*10>=g.members.length*3)){
    g.phase='assault';
    for(const m of w.mechanoids??[])if(m.raid?.group===g.id){m.planCooldown=0;m.raid.goal=null;}
    w.events.push({tick:w.tick,type:'command',message:'Les Scythers commencent leur assaut. Ils ne battent pas en retraite.'});
    if(w.events.length>80)w.events.splice(0,w.events.length-80);
  }
  return true;
}
