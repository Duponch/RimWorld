import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodeStoredSave} from '../../src/ui/save-storage-codec.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {canDesignate} from '../../src/sim/engine.ts';
import {canStandAt} from '../../src/sim/furniture-travel.ts';
import type {Cell} from '../../src/sim/types.ts';
export async function spikeTrapAulnes(){
 const source='public/test-saves/v284/les-aulnes-integrees.json',raw=await readFile(new URL('../../'+source,import.meta.url),'utf8');
 const sha=createHash('sha256').update(raw).digest('hex');if(sha!=='6d75f98d4435e8b4569f11fce1969a71d31ba523fcf36ad864f35ba3191eedb1')throw Error('Historical Aulnes changed');
 const world=deserializeWorld(await decodeStoredSave(raw));if(validateWorld(world).length||world.tick!==8434||world.pawns.length!==15||world.width!==250||world.height!==250)throw Error('Original integrated village differs');
 if(serializeWorld(deserializeWorld(serializeWorld(world)))!==serializeWorld(world))throw Error('Canonical reload differs');
 const candidates:Cell[]=[];for(let z=130;z<=155;z++)for(let x=115;x<=144;x++){
  const c={x,z};if(canDesignate(world,{type:'designate',kind:'spike-trap',material:'wood',orientation:0,...c}).ok&&canStandAt(world,c)&&!world.resources.some(r=>r.x===x&&r.z===z)&&!world.piles.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z))candidates.push(c);
 }
 candidates.sort((a,b)=>Math.hypot(a.x-128,a.z-142)-Math.hypot(b.x-128,b.z-142)||a.z-b.z||a.x-b.x);
 const cell=candidates[0],destination=cell&&candidates.find(c=>Math.hypot(c.x-cell.x,c.z-cell.z)>=3&&Math.hypot(c.x-cell.x,c.z-cell.z)<=8);if(!cell||!destination)throw Error('No real pair of trap construction sites');
 return {world,source,sha,cell,destination,declaredDotation:[]};
}
