import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodeStoredSave} from '../../src/ui/save-storage-codec.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {canDesignate} from '../../src/sim/engine.ts';
import {isElectrical} from '../../src/sim/power-rules.ts';
import {cookingPlaceFree,cookingSpot,ingredientPlaceFree} from '../../src/sim/cooking-bills.ts';
import {canStandAt} from '../../src/sim/furniture-travel.ts';
import type {Cell} from '../../src/sim/types.ts';

export async function cremationAulnes(){
  const source='public/test-saves/v284/les-aulnes-integrees.json',raw=await readFile(new URL('../../'+source,import.meta.url),'utf8');
  const sha=createHash('sha256').update(raw).digest('hex');if(sha!=='6d75f98d4435e8b4569f11fce1969a71d31ba523fcf36ad864f35ba3191eedb1')throw Error('Historical Aulnes changed.');
  const world=deserializeWorld(await decodeStoredSave(raw));
  if(validateWorld(world).length||world.tick!==8434||world.width!==250||world.height!==250||world.pawns.length!==15)throw Error('Integrated village differs.');
  if(serializeWorld(deserializeWorld(serializeWorld(world)))!==serializeWorld(world))throw Error('Canonical Aulnes reload differs.');
  const candidates:Cell[]=[];
  for(let z=135;z<=157;z++)for(let x=118;x<=145;x++){
    const spec={kind:'electric-crematorium' as const,x,z,orientation:0 as const},spot=cookingSpot({...spec,id:0,footprint:'standard'});
    if(canDesignate(world,{type:'designate',...spec,material:'granite-blocks'}).ok&&cookingPlaceFree(world,spot)&&[[1,0],[-1,0],[0,-1]].some(([dx,dz])=>{const c={x:spot.x+dx!,z:spot.z+dz!};return ingredientPlaceFree(world,c,spot,'cremate-corpse')&&canStandAt(world,c);})&&world.structures.some(s=>isElectrical(s.kind)&&Math.hypot(s.x-x,s.z-z)<=5))candidates.push({x,z});
  }
  candidates.sort((a,b)=>Math.hypot(a.x-126,a.z-145)-Math.hypot(b.x-126,b.z-145)||a.z-b.z||a.x-b.x);
  if(!candidates.length)throw Error('No real crematorium destination near the village network.');
  const owned=world.wildlife!.animals.filter(a=>a.domestic&&!a.health?.death&&a.state!=='downed');
  owned.sort((a,b)=>Number(a.species!=='hare')-Number(b.species!=='hare')||a.id-b.id);if(owned.length<2)throw Error('A real owned animal and living witness are required.');
  return {world,source,sha,cell:candidates[0]!,animalId:owned[0]!.id,witnessId:owned[1]!.id,declaredDotation:[]};
}
