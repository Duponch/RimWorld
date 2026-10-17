/** CompSpawnerPawn.Lord is a real region search, not a cached pointer on the
 * struck Hive. A nearby same-faction spawner may supply the actual Lord even
 * when this Hive has no live cohort. No RNG or persistent cache is involved. */
import type {World,Structure} from './types.ts';
import type {HiveLord256} from './cave-hive-state-256.ts';
import {captureHiveClosewalk256} from './cave-hive-closewalk-256.ts';
export function findActualHiveLord256(w:World,hive:Structure):HiveLord256|undefined {
 if(hive.kind!=='insect-hive'||!w.structures.includes(hive))return;
 const actors=w.wildlife?.animals??[],lords=w.wildlife?.hiveLords??[];
 if(!lords.length)return;
 const capture=captureHiveClosewalk256(w).reach,root=capture.regionAt(hive.z*w.width+hive.x);if(!root)return;
 const seen=new Set<number>([root.id]),queue=[root];let found:typeof actors[number]|undefined;
 for(let at=0;at<queue.length&&at<40;at++){
  const region=queue[at]!;
  for(const s of w.structures)if(s.kind==='insect-hive'&&s.factionId===hive.factionId&&capture.regionAt(s.z*w.width+s.x)===region){
   // List.Find overwrites the previous candidate even when this spawner has
   // no matching Pawn; retaining an earlier candidate changes Core's result.
   found=undefined;
   for(const id of s.caveHive!.spawnedPawnIds){const p=actors.find(a=>a.id===id);if(p?.hive?.lordId!==null&&p?.hive?.lordId!==undefined&&lords.some(l=>l.id===p.hive!.lordId)){found=p;break;}}
   if(found&&(found.x-hive.x)**2+(found.z-hive.z)**2<100)return lords.find(l=>l.id===found!.hive!.lordId);
  }
  // Core's entry predicate is true: doors/fences do not filter this search.
  for(const id of region.links)if(!seen.has(id)){seen.add(id);const next=capture.regions[id];if(next)queue.push(next);}
 }
 return found?lords.find(l=>l.id===found!.hive!.lordId):undefined;
}
