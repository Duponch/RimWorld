import { FRAME_SHOT_FILL,RESOURCE_SHOT_FILL,STRUCTURE_SHOT_FILL,itemShotFill } from './combat-content.ts';
import type { ShotCover,ShotGrid } from './combat-space.ts';
import { footprintCells } from './definitions.ts';
import type { Cell,World } from './types.ts';

export interface WorldShotGrid extends ShotGrid { readonly capturedAt:number }
const NATURAL_ROCK=0xffffffff;
const SOURCE_PREFIX=['','structure','frame','resource','pile','structure'] as const;

/** A read-only spatial snapshot, shared within a synchronous query batch only.
 * Recreate after ANY world mutation: door state, construction, harvest, hauling,
 * mining. No frame work, global cache, retained World or PRNG consumption.
 * Capture O(cells + objects/footprints), each subsequent point lookup O(1).
 * Cover records/keys are created on lookup, not for every plant on the map. */
export function captureWorldShotGrid(world:World):WorldShotGrid {
  const {width,height}=world,slots=new Uint32Array(width*height);
  const capacity=world.structures.length+world.jobs.length+world.resources.length+world.piles.length+1;
  const ids=new Float64Array(capacity),fills=new Float64Array(capacity),sources=new Uint8Array(capacity);
  const records=new Map<number,ShotCover>();let count=0;
  const valid=(x:number,z:number)=>Number.isInteger(x)&&Number.isInteger(z)&&x>=0&&z>=0&&x<width&&z<height;
  for(let i=0;i<slots.length;i++)if(world.tiles[i].terrain==='rock')slots[i]=NATURAL_ROCK;
  const append=(id:number,fill:number,source:number)=>{
    const slot=++count;ids[slot]=id;fills[slot]=fill;sources[slot]=source;return slot;
  };
  const put=(x:number,z:number,slot:number)=>{
    if(!valid(x,z))return;
    const i=z*width+x,prior=slots[i];if(prior===NATURAL_ROCK)return;
    // Raw fill wins, including an OPEN door. A low object in its cell must not
    // replace that door merely because the latter's effective cover is zero.
    // Equal fills use our persistent unique IDs, not transient array order.
    if(!prior||fills[slot]>fills[prior]||fills[slot]===fills[prior]&&ids[slot]<ids[prior])slots[i]=slot;
  };
  const footprint=(id:number,fill:number,source:number,cells:readonly Cell[])=>{
    if(fill<.01)return;const slot=append(id,fill,source);for(const c of cells)put(c.x,c.z,slot);
  };
  for(const s of world.structures)footprint(s.id,STRUCTURE_SHOT_FILL[s.kind],s.kind==='door'&&s.door?.open?5:1,footprintCells(s));
  for(const j of world.jobs)if(j.construction==='frame')footprint(j.id,FRAME_SHOT_FILL,2,footprintCells(j));
  for(const r of world.resources)if(RESOURCE_SHOT_FILL[r.kind]>0)put(r.x,r.z,append(r.id,RESOURCE_SHOT_FILL[r.kind],3));
  for(const p of world.piles)if(p.owner.type==='ground'&&itemShotFill(p.item)>0)put(p.owner.x,p.owner.z,append(p.id,itemShotFill(p.item),4));
  return Object.freeze({width,height,capturedAt:world.tick,
    blocksSight(x:number,z:number):boolean {
      if(!valid(x,z))return true;
      const slot=slots[z*width+x];if(slot===NATURAL_ROCK)return true;
      return fills[slot]>.99&&sources[slot]!==5;
    },
    coverAt(x:number,z:number):ShotCover|undefined {
      if(!valid(x,z))return;
      const i=z*width+x,slot=slots[i];
      if(!slot)return;
      const key=slot===NATURAL_ROCK?-i-1:slot;let record=records.get(key);
      if(!record) {
        record=slot===NATURAL_ROCK?Object.freeze({key:`rock:${i}`,fill:1,full:true}):
          Object.freeze({key:`${SOURCE_PREFIX[sources[slot]]}:${ids[slot]}`,fill:fills[slot],...fills[slot]>.99?{full:true}:{},...sources[slot]===5?{openDoor:true}:{}});
        records.set(key,record);
      }
      return record;
    },
  });
}
