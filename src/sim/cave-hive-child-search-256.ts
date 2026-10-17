/** The1120 producer really sets canSpawnHives=false. Core nevertheless runs
 * these random nearby searches before checking that flag. The subsequent
 * FindNoWipeSpawnLocNear is purely read-only (CellFinder734–818, no RNG) and
 * its result cannot be consumed by this disabled lane; no fictitious child
 * cell, placement, ID or spawn is returned here. */
import type {World} from './types.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {ActualHive256} from './cave-hive-state-256.ts';
import {captureHiveClosewalk256} from './cave-hive-closewalk-256.ts';
export function consumeDisabledHiveSearch256(w:World,hive:ActualHive256,random:Pick<WorldGenerationRandom,'value'|'integer'|'float'>):void {
 if(hive.caveHive.canSpawnHives!==false)throw Error('Enabled Hive reproduction is not the initial1120 producer');
 const capture=captureHiveClosewalk256(w),root=hive.z*w.width+hive.x;
 const allowed=(cell:number,min:number)=>{
  const x=cell%w.width,z=Math.floor(cell/w.width);
  if(!capture.physical.roofed(cell)||!capture.physical.normalWalkable(cell)||(x-hive.x)**2+(z-hive.z)**2<min*min||w.structures.some(s=>s.kind==='glow-pod'&&s.x===x&&s.z===z)||w.piles.some(p=>p.item==='insect-jelly'&&p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z))return false;
  return !w.structures.some(s=>s.kind==='insect-hive'&&Math.max(Math.abs(s.x-x),Math.abs(s.z-z))<=1);
 };
 // Try0 preferred3.5, Try1 no minimum. Try2 allowUnreachable=false
 // short-circuits before any random call. No artificial third search.
 if(capture.tryCell(root,10,random,c=>allowed(c,3.5))!==null)return;
 capture.tryCell(root,10,random,c=>allowed(c,0));
}
