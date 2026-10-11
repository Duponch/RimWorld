import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { decodeStoredSave } from '../../src/ui/save-storage-codec';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization';
import { canDesignate } from '../../src/sim/engine';
import { footprintCells } from '../../src/sim/definitions';
import type { Cell,StructureKind } from '../../src/sim/types';

/** Immutable historical village; only candidate sites are derived here. */
export async function shelvesAulnes(){
  const source='public/test-saves/v284/les-aulnes-integrees.json',raw=await readFile(new URL('../../'+source,import.meta.url),'utf8');
  const sha=createHash('sha256').update(raw).digest('hex');if(sha!=='6d75f98d4435e8b4569f11fce1969a71d31ba523fcf36ad864f35ba3191eedb1')throw Error('Historical Aulnes changed');
  const world=deserializeWorld(await decodeStoredSave(raw));if(validateWorld(world).length||world.tick!==8434||world.width!==250||world.pawns.length!==15)throw Error('Historical village differs');
  const station=world.structures.find(s=>s.kind==='electric-stove')??world.structures.find(s=>s.kind==='fueled-stove');if(!station)throw Error('No historical cooking station');
  function site(kind:StructureKind,avoid:Cell[],minimum:number){
    const candidates:Cell[]=[];
    for(let z=station!.z-10;z<=station!.z+10;z++)for(let x=station!.x-10;x<=station!.x+10;x++){
      const c={x,z},command={type:'designate' as const,kind,material:'wood' as const,orientation:1 as const,...c};
      if(!canDesignate(world,command).ok)continue;
      const cells=footprintCells({...c,kind,orientation:1,footprint:'standard'});
      if(cells.some(cell=>world.resources.some(r=>r.x===cell.x&&r.z===cell.z)||world.piles.some(p=>p.owner.type==='ground'&&p.owner.x===cell.x&&p.owner.z===cell.z)))continue;
      if(avoid.some(a=>cells.some(c=>Math.hypot(c.x-a.x,c.z-a.z)<minimum)))continue;
      candidates.push(c);
    }
    candidates.sort((a,b)=>Math.hypot(a.x-station!.x,a.z-station!.z)-Math.hypot(b.x-station!.x,b.z-station!.z)||a.z-b.z||a.x-b.x);
    if(!candidates[0])throw Error('No ordinary shelf site');return candidates[0];
  }
  const small=site('small-shelf',[station],2),normal=site('shelf',[small],3),destination=site('small-shelf',[small,normal],4);
  return {world,source,sha,small,normal,destination,stationId:station.id,declaredDotation:[]};
}
