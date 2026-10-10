import type {AreaAction,Resource,World} from '../sim/types';
import {footprintCells} from '../sim/definitions';
import {choppable,harvestable,isPlant} from '../sim/plants';
import {furnitureSourceCells} from '../sim/furniture-rules';

export type OrderTargets={resources:Set<number>;structures:Set<number>;jobs:Set<number>;chunks:Set<number>;rocks:Set<number>};
/** Gesture-local lookup. Created only for model previews, never per frame.
 * Eligibility comes from queryArea; these buckets identify the actual models. */
export class OrderTargetIndex {
  private readonly resources=new Map<number,Resource[]>();
  private resourcesReady=false;
  private readonly structures=new Map<number,number[]>();
  private readonly jobs=new Map<number,World['jobs']>();
  constructor(private readonly world:World) {}
  private resourceIds():void {
    if(this.resourcesReady)return;this.resourcesReady=true;
    for(const r of this.world.resources){const cell=r.z*this.world.width+r.x,bucket=this.resources.get(cell);if(bucket)bucket.push(r);else this.resources.set(cell,[r]);}
  }
  private structureIds():void {
    if(this.structures.size)return;
    for(const s of this.world.structures)for(const c of footprintCells(s)){
      const cell=c.z*this.world.width+c.x,bucket=this.structures.get(cell);if(bucket)bucket.push(s.id);else this.structures.set(cell,[s.id]);
    }
  }
  private jobIds():void {
    if(this.jobs.size)return;
    for(const j of this.world.jobs)for(const c of [...footprintCells(j),...furnitureSourceCells(this.world,j)]){
      const cell=c.z*this.world.width+c.x,bucket=this.jobs.get(cell);if(bucket)bucket.push(j);else this.jobs.set(cell,[j]);
    }
  }
  select(action:AreaAction,cells:readonly number[]):OrderTargets {
    const out:OrderTargets={resources:new Set(),structures:new Set(),jobs:new Set(),chunks:new Set(),rocks:new Set()};
    if(action==='chop'||action==='cut'||action==='harvest'||action==='cancel')this.resourceIds();
    if(action==='deconstruct'||action==='cancel')this.structureIds();
    if(action==='cancel')this.jobIds();
    for(const cell of cells){
      if(action==='mine')out.rocks.add(cell);
      if(action==='haul-chunks')out.chunks.add(cell);
      if(action==='deconstruct')for(const id of this.structures.get(cell)??[])out.structures.add(id);
      if(action==='chop'||action==='cut'||action==='harvest')for(const r of this.resources.get(cell)??[]){
        if(action==='chop'?choppable(this.world,r):action==='harvest'?harvestable(this.world,r):isPlant(r))out.resources.add(r.id);
      }
      if(action==='cancel')for(const j of this.jobs.get(cell)??[]){
        out.jobs.add(j.id);
        if(j.kind==='mine')out.rocks.add(cell);
        if(j.deconstruction)out.structures.add(j.deconstruction.structureId);
        else if(j.kind==='deconstruct'||j.kind==='uninstall')for(const id of this.structures.get(cell)??[])out.structures.add(id);
        if(j.furniture)out.structures.add(j.furniture.structureId);
        if(j.kind==='chop'||j.kind==='harvest'||j.kind==='cut')for(const r of this.resources.get(cell)??[]){
          if(j.kind==='chop'?choppable(this.world,r):isPlant(r))out.resources.add(r.id);
        }
      }
    }
    return out;
  }
}
