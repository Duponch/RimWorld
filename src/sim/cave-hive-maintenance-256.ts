/** Maintenance is an actual reserved animal job, not a remote heal. The
 * shared rotating wildlife quota owns route searches and movement. */
import type {World,Cell} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {ActualHive256} from './cave-hive-state-256.ts';
import {caveRadialPattern256} from './local-cave-radial-256.ts';
import {RoomTopologyCache} from './room-topology.ts';
import {hiveMaintenanceChance256,type HiveMaintenanceKey256,type HiveThinkData256} from './cave-hive-think-256.ts';
export type HiveMaintenanceJob256={kind:'maintain';hiveId:number;progressCore:number};
export interface HiveMaintenanceActor256 extends WildAnimal {hiveThink?:HiveThinkData256;hiveJob?:import('./cave-hive-lord-256.ts').HiveDutyJob256}
export interface HiveMaintenanceNavigation256 {free(c:Cell):boolean;route(a:WildAnimal,goals:Cell[]):Cell[]|null|undefined;move(a:WildAnimal):void;takeSearch():boolean}
const adjacent=(a:Cell,b:Cell)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.z-b.z))===1;
const contacts=(s:Cell):Cell[]=>{const out:Cell[]=[];for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)if(x||z)out.push({x:s.x+x,z:s.z+z});return out;};
/** Releasing intent never completes or discards an already captured edge. */
export function releaseHiveMaintenance256(w:World,a:HiveMaintenanceActor256):void {delete a.hiveJob;a.path=[];if(a.state!=='dead'&&a.state!=='downed')a.state=(a.motion?.end??0)>w.tick?'moving':'idle';a.nextDecision=w.tick;}
export function reconcileHiveMaintenance256(w:World,a:HiveMaintenanceActor256):void {
 if(a.hiveJob&&(!a.hive||a.hive.lordId===null||a.domestic||a.burning||a.flee||a.confusion||a.manhunter||a.state==='dead'||a.state==='downed'))releaseHiveMaintenance256(w,a);
}
export function processHiveMaintenance256(w:World,a:HiveMaintenanceActor256,nav:HiveMaintenanceNavigation256,key:HiveMaintenanceKey256,absoluteCore:number):boolean {
 if(!a.hive||a.hive.lordId===null||a.domestic||['dead','downed'].includes(a.state))return false;
 const lord=w.wildlife?.hiveLords?.find(l=>l.id===a.hive!.lordId);if(!lord||lord.phase!=='defend-expand')return false;
 if((a.motion?.end??0)>w.tick)return !!a.hiveJob;
 if(a.hiveJob?.kind==='attack')return false;
 if(a.hiveJob?.kind==='maintain'){
  const j=a.hiveJob,h=w.structures.find((s):s is ActualHive256=>s.kind==='insect-hive'&&s.id===j.hiveId);
  if(!h||h.factionId!==a.hive.factionId||h.caveHive.maintenanceCore<60000){releaseHiveMaintenance256(w,a);return false;}
  if(adjacent(a,h)&&nav.free(a)){a.path=[];a.state='idle';j.progressCore+=10;if(j.progressCore>=180){h.caveHive.maintenanceCore=0;releaseHiveMaintenance256(w,a);}return true;}
  // Wait progress is continuous only while touching, as FailOnCannotTouch.
  j.progressCore=0;
  if(!a.path.length){if(!nav.takeSearch())return true;const path=nav.route(a,contacts(h));if(!path){releaseHiveMaintenance256(w,a);return false;}a.path=path;}
  if(a.path.length)nav.move(a);return true;
 }
 if(!nav.takeSearch())return false;
 const data=a.hiveThink??{maintenanceLastTryCore:-99999},normal=hiveMaintenanceChance256(a.id,w.tick*10,absoluteCore,data,key);a.hiveThink=data;
 const topology=new RoomTopologyCache().read(w),room=topology.at(a.x,a.z),radial=caveRadialPattern256(7.9);
 // Primary scans GenRadial order first, then attempts that one job. A failed
 // path is not permission to select a later Hive in the same decision.
 for(let at=0;at<radial.count;at++){
  const [dx,dz]=radial.offsets[at]!,x=a.x+dx,z=a.z+dz;if(x<0||z<0||x>=w.width||z>=w.height||topology.at(x,z)!==room)continue;
  const hive=w.structures.find((s):s is ActualHive256=>s.kind==='insect-hive'&&s.x===x&&s.z===z);if(!hive||hive.caveHive.maintenanceCore<(normal?60000:120000)||w.wildlife!.animals.some(other=>{const j=other.hiveJob;return other!==a&&j?.kind==='maintain'&&j.hiveId===hive.id;}))continue;
  const path=nav.route(a,contacts(hive));if(!path)return false;
  a.hiveJob={kind:'maintain',hiveId:hive.id,progressCore:0};a.path=path;a.state=path.length?'moving':'idle';return true;
 }
 return false;
}
