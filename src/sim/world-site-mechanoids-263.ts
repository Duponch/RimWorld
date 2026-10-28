import {effectiveCore297,validationCore297} from './core-phase-297.ts';
import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {actualMechanicalBirthFaction259} from './mechanoid-world-faction-259.ts';
import {mechMaxPawnCost,mechanoidRaidCost} from './mechanoid-raid-composition.ts';
import {isMechanoidKind,type MechanoidKind} from './mechanoid-definition.ts';
import {raidRandom} from './raid-state.ts';
import {prepareSiteThreatPlacements263} from './world-site-threat-placement-263.ts';
import {captureActualLocalDistricts256} from './actual-local-districts-256.ts';
import {actualPlayerOwner259} from './world-affiliation-259.ts';
import {captureWorldShotGrid} from './combat-world.ts';
import {clearShotSegment} from './combat-space.ts';
import {footprintCells} from './definitions.ts';
import {isPassageDoor} from './door-rules.ts';
import type {World,Cell} from './types.ts';
import type {Mechanoid} from './mechanoid-state.ts';
import type {ItemStash263} from './world-sites-state-263.ts';
import type {AncientRect256} from './local-ancient-placement-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';

/** Site mandate over original mechanical owners. No raid, Temple or new Lord.
 * releaseAtCore gates the Hidden waiting passage; it never wakes a sleeper. */
export interface SiteMechDuty263 {revision:1;siteId:number;bornAtCore:number;releaseAtCore:number;awakeAtCore:number|null;wakeIfClose:boolean;goal:Cell|null}
export interface SiteMechOptions263 {sleeping:boolean;wakeIfClose:boolean;releaseAtCore:number;bornAtCore?:number}
const pool:readonly MechanoidKind[]=['scyther','lancer','pikeman'];
const rngValid=(v:number)=>Number.isSafeInteger(v)&&v>=0&&v<=0xffffffff;
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;

/** Declared current-PNJ roster adaptation: equal selection weights among the
 * three existing affordable bodies. Actual combatPower/cap spend the budget.
 * No missing native class is selected and rerolled; old raid selection stays
 * literal. Empty affordable pool is a real empty outcome, not a retry. */
export function draftSiteMechanoidRoster263(points:number,rng:number):{roster:MechanoidKind[];nextRng:number}|undefined {
 if(!Number.isFinite(points)||points<=0||points>10000||!rngValid(rng))return;
 const random={rng},roster:MechanoidKind[]=[],cap=mechMaxPawnCost(points);let remaining=points;
 for(;;){const choices=pool.filter(k=>mechanoidRaidCost(k)<=remaining&&mechanoidRaidCost(k)<=cap);if(!choices.length)break;
  const kind=choices[Math.min(choices.length-1,Math.floor(raidRandom(random)*choices.length))]!;roster.push(kind);remaining-=mechanoidRaidCost(kind);
 }
 return {roster,nextRng:random.rng};
}
/** Physical placements are already selected by the real Site placement
 * authority. Never publish a prefix, consume IDs or change campaign RNG here. */
export function assembleSiteMechanoids263(w:World,roster:readonly MechanoidKind[],rng:number,cells:readonly Cell[],siteId:number,options:SiteMechOptions263):{mechanoids:Mechanoid[];nextId:number;rng:number}|undefined {
 const bornAtCore=options.bornAtCore??w.tick*10;
 if(!isSchema263OrLater(Number(w.schemaVersion))||!rngValid(rng)||!int(siteId,1)||!int(bornAtCore,Math.max(0,(w.tick-1)*10),w.tick*10)||!int(options.releaseAtCore,bornAtCore)||options.releaseAtCore!==bornAtCore&&options.releaseAtCore!==bornAtCore+120||typeof options.sleeping!=='boolean'||typeof options.wakeIfClose!=='boolean'||roster.length!==cells.length||roster.length>90||!roster.every(isMechanoidKind)||!int(w.nextId,1,Number.MAX_SAFE_INTEGER-roster.length))return;
 const site=w.worldSites263?.entries.find(s=>s.id===siteId);if(!site||site.kind!=='item-stash'||site.closed)return;
 const faction=actualMechanicalBirthFaction259(w.worldFactions);if(!faction)return;
 const physical=captureActualLocalDistricts256(w),occupied=new Set([...w.pawns,...w.wildlife?.animals??[],...w.mechanoids??[]].filter(m=>m.state!=='dead').map(m=>m.z*w.width+m.x)),seen=new Set<number>();
 for(const c of cells){if(!int(c.x,0,w.width-1)||!int(c.z,0,w.height-1))return;const at=c.z*w.width+c.x;if(!physical.standable(at)||occupied.has(at)||seen.has(at))return;seen.add(at);}
 return {mechanoids:roster.map((mechKind,i)=>({id:w.nextId+i,mechKind,...cells[i]!,worldFaction259:{...faction},state:'idle',path:[],heading:0,moveCooldown:0,planCooldown:0,site263:{revision:1,siteId,bornAtCore,releaseAtCore:options.releaseAtCore,awakeAtCore:options.sleeping?null:bornAtCore,wakeIfClose:options.wakeIfClose,goal:null}})),nextId:w.nextId+roster.length,rng};
}
/** Convenience for a caller holding an actual candidate-cell pool. Each birth
 * removes its selected cell; composition precedes physical draws exactly once. */
export function draftSiteMechanoids263(w:World,points:number,rng:number,cells:readonly Cell[],siteId:number,options:SiteMechOptions263){
 const draft=draftSiteMechanoidRoster263(points,rng);if(!draft||draft.roster.length>cells.length)return;
 const random={rng:draft.nextRng},available=[...cells],selected:Cell[]=[];
 for(const _kind of draft.roster){const i=Math.min(available.length-1,Math.floor(raidRandom(random)*available.length));selected.push(available[i]!);available[i]=available[available.length-1]!;available.pop();}
 return assembleSiteMechanoids263(w,draft.roster,random.rng,selected,siteId,options);
}
export const sleepingSiteMech263=(m:Mechanoid):boolean=>m.site263?.awakeAtCore===null;
export function siteMechanicalDuty263(w:World,m:Mechanoid):{phase:'assault'}|undefined {
 const d=m.site263;return isSchema263OrLater(Number(w.schemaVersion))&&d&&d.awakeAtCore!==null&&w.tick*10>=d.releaseAtCore?{phase:'assault'}:undefined;
}
/** LordJob_SleepThenAssaultColony: one genuine DormancyWakeup or actual
 * ExternalViolence wakes the whole Site group. No fog/inspection wake. */
export function wakeSiteMechGroup263(w:World,member:Mechanoid,atCore:number):void {
 const d=member.site263;if(!d||d.awakeAtCore!==null)return;
 if(!isSchema263OrLater(Number(w.schemaVersion))||!w.mechanoids?.includes(member)||!int(atCore,Math.max(d.bornAtCore,(w.tick-1)*10,0),w.tick*10))throw Error('Invalid actual Site mechanical wake');
 for(const m of w.mechanoids)if(m.site263?.siteId===d.siteId&&m.site263.awakeAtCore===null){m.site263={...m.site263,awakeAtCore:atCore,goal:null};m.path=[];m.planCooldown=0;}
 w.events.push({tick:w.tick,type:'command',message:'Les mécanoïdes du site s’éveillent et commencent leur assaut.'});if(w.events.length>80)w.events.splice(0,w.events.length-80);
}
/** CompWakeUpDormant checks at ID-hashed250 Core passages. Mech XML radius30,
 * ForColonist + real LOS; construction radius3 uses actual reachable player
 * buildings. Defaults wakeUpWithDelay=false. Reveal alone never wakes a Site.
 * One bounded capture per due mechanical group, no frame/update-panel scan. */
export function advanceSiteMechanoids263(w:World):void {
 if(!isSchema263OrLater(Number(w.schemaVersion))||!w.worldFactions)return;
 let grid:ReturnType<typeof captureWorldShotGrid>|undefined,components:Int32Array|undefined;
 // One decision-local connectivity capture, created only if a due sleeper
 // actually has a nearby player building. Reused by every due original in
 // this call; no maintained index and no global flood per mechanical owner.
 const connectivity=()=>{
  if(components)return components;
  const physical=captureActualLocalDistricts256(w),n=w.width*w.height,closed=new Set(w.structures.filter(b=>isPassageDoor(b.kind)&&!b.door?.open).flatMap(b=>footprintCells(b).map(c=>c.z*w.width+c.x))),ids=new Int32Array(n),queue=new Int32Array(n);ids.fill(-1);let group=0;
  for(let root=0;root<n;root++){
   if(ids[root]!==-1||closed.has(root)||!physical.normalWalkable(root))continue;
   let head=0,tail=1;queue[0]=root;ids[root]=group;
   const visit=(next:number)=>{if(ids[next]===-1&&!closed.has(next)&&physical.normalWalkable(next)){ids[next]=group;queue[tail++]=next;}};
   while(head<tail){const c=queue[head++]!,x=c%w.width;if(c>=w.width)visit(c-w.width);if(c+w.width<n)visit(c+w.width);if(x)visit(c-1);if(x+1<w.width)visit(c+1);}
   group++;
  }
  return components=ids;
 };
 const player=w.worldFactions.playerFactionId;
 for(let core=Math.max(1,(w.tick-1)*10+1);core<=w.tick*10;core++)for(const m of w.mechanoids??[]){
  const d=m.site263;if(!d||d.awakeAtCore!==null||m.state==='dead'||m.state==='downed'||core<d.bornAtCore||(core%250+m.id%250)%250!==0)continue;
  if(d.wakeIfClose&&w.pawns.some(p=>actualPlayerOwner259(p,player)&&(p.x-m.x)**2+(p.z-m.z)**2<=900&&clearShotSegment(grid??=captureWorldShotGrid(w),m,p))){wakeSiteMechGroup263(w,m,core);continue;}
  const nearby=w.structures.filter(b=>(Object.hasOwn(b,'factionId')?b.factionId===player:true)&&footprintCells(b).some(c=>(c.x-m.x)**2+(c.z-m.z)**2<=9));if(!nearby.length)continue;
  const ids=connectivity(),group=ids[m.z*w.width+m.x]!;
  if(group>=0&&nearby.some(b=>footprintCells(b).some(c=>ids[c.z*w.width+c.x]===group)))wakeSiteMechGroup263(w,m,core);
 }
}
export function constructDirectSiteSleepingMechanoids263(w:World,site:ItemStash263,storage:AncientRect256,_usedRects:AncientRect256[],random:WorldGenerationRandom):void {
 if(!isSchema263OrLater(Number(w.schemaVersion))||site.threat.kind!=='sleeping-mechanoids'||!w.worldSites263?.entries.includes(site))throw Error('Actual SleepingMechanoids1600 frontier required');
 const roster=draftSiteMechanoidRoster263(site.threat.points,(random.integerValue()>>>0)||1);if(!roster)throw Error('Actual Site mechanical budget refused');
 if(!roster.roster.length)return;
 const placement=prepareSiteThreatPlacements263(w,roster.roster.length,roster.nextRng,{kind:'around',rect:storage});if(!placement)throw Error('Actual SleepingMechanoids1600 placements refused');
 // The single native Bool applies to every member of this one generated group.
 const wakeIfClose=random.boolean(),made=assembleSiteMechanoids263(w,roster.roster,placement.rng,placement.cells,site.id,{sleeping:true,wakeIfClose,releaseAtCore:w.tick*10});
 if(!made)throw Error('Actual SleepingMechanoids1600 original owners refused');
 (w.mechanoids??=[]).push(...made.mechanoids);w.nextId=made.nextId;
}

function plain(v:unknown,names:readonly string[]):v is Record<string,unknown>{return !!v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).length===names.length&&names.every(k=>{const d=Object.getOwnPropertyDescriptor(v,k);return !!d?.enumerable&&Object.hasOwn(d,'value');});}
export function validSiteMechField263(v:unknown,version:number,tick:number,coreNow297?:number):boolean {
 const core=validationCore297(version,tick,coreNow297);if(version===297&&!Number.isSafeInteger(core))return false;
 if(!v||typeof v!=='object')return false;const property=Object.getOwnPropertyDescriptor(v,'site263');if(!property)return !('site263'in v);
 if(!isSchema263OrLater(version)||!property.enumerable||!Object.hasOwn(property,'value')||!plain(property.value,['revision','siteId','bornAtCore','releaseAtCore','awakeAtCore','wakeIfClose','goal']))return false;
 const d=property.value,m=v as Mechanoid;if(d.revision!==1||!int(d.siteId,1)||!int(d.bornAtCore,0,core)||!int(d.releaseAtCore,d.bornAtCore)||d.releaseAtCore!==d.bornAtCore&&d.releaseAtCore!==d.bornAtCore+120||typeof d.wakeIfClose!=='boolean'||!(d.awakeAtCore===null||int(d.awakeAtCore,d.bornAtCore,core))||'raid'in v||'temple'in v)return false;
 if(d.goal!==null&&(!plain(d.goal,['x','z'])||!int(d.goal.x)||!int(d.goal.z)))return false;
 return d.awakeAtCore!==null&&d.releaseAtCore<=core||Array.isArray(m.path)&&!m.path.length&&!m.motion&&!m.melee&&!m.ranged&&['idle','dead','downed'].includes(m.state)&&d.goal===null;
}
export function validateSiteMechGroups263(w:World):string[]{
 const groups=new Map<number,SiteMechDuty263>();
 for(const m of w.mechanoids??[]){if(!validSiteMechField263(m,w.schemaVersion,w.tick,Number(w.schemaVersion)===297?effectiveCore297(w):undefined))return ['Invalid actual Site mechanical mandate'];const d=m.site263;if(!d)continue;
  const site=w.worldSites263?.entries.find(s=>s.id===d.siteId);if(!site||site.kind!=='item-stash'||w.site?.revision!==3||site.tile!==w.site.tileId||d.goal&&(d.goal.x>=w.width||d.goal.z>=w.height))return ['Invalid actual Site mechanical binding'];
  const prior=groups.get(d.siteId);if(prior&&(prior.bornAtCore!==d.bornAtCore||prior.releaseAtCore!==d.releaseAtCore||prior.awakeAtCore!==d.awakeAtCore||prior.wakeIfClose!==d.wakeIfClose))return ['Inconsistent actual Site mechanical group'];groups.set(d.siteId,d);
 }return [];
}
