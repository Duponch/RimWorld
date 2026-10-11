import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodeStoredSave} from '../../src/ui/save-storage-codec.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {canDesignate} from '../../src/sim/engine.ts';
import type {Cell} from '../../src/sim/types.ts';

export async function doubleBedAulnes(){
  const source='public/test-saves/v284/les-aulnes-integrees.json',raw=await readFile(new URL('../../'+source,import.meta.url),'utf8');
  const sha=createHash('sha256').update(raw).digest('hex');if(sha!=='6d75f98d4435e8b4569f11fce1969a71d31ba523fcf36ad864f35ba3191eedb1')throw Error('Historical Aulnes changed.');
  const world=deserializeWorld(await decodeStoredSave(raw));
  if(validateWorld(world).length||world.tick!==8434||world.width!==250||world.height!==250||world.pawns.length!==15)throw Error('Integrated village differs.');
  if(serializeWorld(deserializeWorld(serializeWorld(world)))!==serializeWorld(world))throw Error('Canonical Aulnes reload differs.');
  const candidates:Cell[]=[];
  for(let z=135;z<=155;z++)for(let x=118;x<=145;x++)if(canDesignate(world,{type:'designate',kind:'double-bed',material:'wood',x,z,orientation:0}).ok)candidates.push({x,z});
  candidates.sort((a,b)=>Math.hypot(a.x-126,a.z-145)-Math.hypot(b.x-126,b.z-145)||a.z-b.z||a.x-b.x);
  if(!candidates.length)throw Error('No real double-bed destination in the village.');
  return {world,source,sha,cell:candidates[0]!,declaredDotation:[]};
}
