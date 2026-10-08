import { footprintCells } from './definitions.ts';
import type { CommandResult,Resource,World } from './types.ts';

/** These are ordinary physical cut jobs. Existing designations remain owned by
 * their workers; neither a button nor the chain removes a plant immediately. */
export function designateBlightedCrops(world:World,root?:Resource):CommandResult {
  if(world.schemaVersion<205)return {ok:false,code:'invalid-command',reason:'Fléau absent de cet ancien schéma.'};
  const cell=(p:{x:number;z:number})=>p.z*world.width+p.x;
  const occupied=new Set(world.jobs.flatMap(j=>footprintCells(j).map(cell)));
  const plants=world.resources.filter(p=>!!p.blight&&!occupied.has(cell(p)));
  let selected=plants;
  if(root){
    // Core's flood fill starts at the cut plant and visits at most100 cells.
    const byCell=new Map(plants.map(p=>[cell(p),p])),queue=[root],seen=new Set([cell(root)]);
    selected=[];
    for(let cursor=0;cursor<queue.length&&seen.size<100;cursor++){
      const source=queue[cursor]!;
      for(const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0]] as const){
        const x=source.x+dx,z=source.z+dz;if(x<0||z<0||x>=world.width||z>=world.height)continue;
        const index=z*world.width+x,p=byCell.get(index);
        if(!p||seen.has(index))continue;
        seen.add(index);selected.push(p);queue.push(p);if(seen.size===100)break;
      }
    }
  }
  if(!selected.length)return {ok:false,code:'missing-target',reason:'Aucun plant malade sans ordre de travail.'};
  if(!Number.isSafeInteger(world.nextId+selected.length)||world.jobs.length+selected.length>32768)
    return {ok:false,code:'invalid-command',reason:'Limite des ordres de travail atteinte.'};
  for(const p of selected)world.jobs.push({id:world.nextId++,kind:'cut',x:p.x,z:p.z,orientation:0,
    footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});
  return {ok:true,affected:selected.length,skipped:world.resources.filter(p=>!!p.blight).length-selected.length};
}
