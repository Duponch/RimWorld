import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { decodeStoredSave } from '../../src/ui/save-storage-codec.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/serialization.ts';

export const ALLOWED_AREA_AULNES_SOURCE='public/test-saves/v284/les-aulnes-integrees.json';
export const ALLOWED_AREA_AULNES_SHA='6d75f98d4435e8b4569f11fce1969a71d31ba523fcf36ad864f35ba3191eedb1';
export async function allowedAreaAulnes(){
  const raw=await readFile(new URL('../../public/test-saves/v284/les-aulnes-integrees.json',import.meta.url),'utf8');
  const sha=createHash('sha256').update(raw).digest('hex');if(sha!==ALLOWED_AREA_AULNES_SHA)throw Error('Historical Aulnes changed.');
  const world=deserializeWorld(await decodeStoredSave(raw));if(validateWorld(world).length||world.tick!==8434||world.width!==250||world.height!==250||world.pawns.length!==15)throw Error('Unexpected integrated village.');
  if(serializeWorld(deserializeWorld(serializeWorld(world)))!==serializeWorld(world))throw Error('Aulnes canonical reload differs.');
  const pawnId=19869,from={x:126,z:145},to={x:127,z:145},pawn=world.pawns.find(p=>p.id===pawnId);
  if(!pawn||pawn.name!=='Ada'||pawn.x!==124||pawn.z!==145||!pawn.cooking||!pawn.motion||pawn.motion.end<=world.tick)throw Error('Ada historical work/edge changed.');
  return {world,pawnId,from,to,source:ALLOWED_AREA_AULNES_SOURCE,sha,declaredDotation:[]};
}
