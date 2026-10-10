import { ConfirmedStructurePresentationSignature } from './ConfirmedStructurePresentationSignature';
import type { Structure, World } from '../sim/types';
import { doorOrientations, isRoomDoor } from '../sim/door-rules';
import { penBoundaryAxes } from './pen-parts';
import { readSnapshotStructureChanges } from '../bridge/snapshot-changes';

type Capture = { id:number; kind:Structure['kind']; x:number; z:number; effect:boolean };
const effectKinds=new Set<string>(['mini-turret','autodoor','machining-table','fabrication-bench','electric-stove',
  'fueled-stove','hi-tech-research-bench','multi-analyzer','battery','biofuel-refinery','chemfuel-generator',
  'wood-generator','campfire']);
const effect=(s:Structure)=>effectKinds.has(s.kind)||!!s.breakdown||!!s.emp;
const capture=(s:Structure):Capture=>({id:s.id,kind:s.kind,x:s.x,z:s.z,effect:effect(s)});

/** Projection owned by the closed MAIN renderer, never an admission capability.
 * The journal proves which ordinals changed, not that arbitrary Worlds are
 * immutable. The caller must own all readers for this instance's lifetime. */
export class SceneStructurePreparation {
  readonly signature=new ConfirmedStructurePresentationSignature();
  #world:World|undefined;
  #captures:Capture[]=[];
  #doors:number[]=[];
  #effects:number[]=[];
  #jobs='';
  #axes:ReadonlyMap<number,0|1>=new Map();
  #gateAxes:ReadonlyMap<number,0|1>=new Map();
  #axesKey='';

  clear():void {
    this.#world=undefined;this.#captures=[];this.#doors=[];this.#effects=[];
    this.#jobs='';this.#axes=new Map();this.#gateAxes=new Map();this.#axesKey='';
  }

  read(world:World,reset=false) {
    const previous=this.#world;
    const sameMap=previous&&previous.seed===world.seed&&previous.width===world.width&&previous.height===world.height;
    const changes=!reset&&sameMap&&previous!==world&&this.#captures.length===world.structures.length
      ?readSnapshotStructureChanges(previous,world):undefined;
    let indices=changes?.structureIndices;
    if(indices)for(const i of indices)if(this.#captures[i]?.id!==world.structures[i]?.id){indices=undefined;break;}
    // Mark invalid before the first consumer read. A throw never leaves an old
    // World as the base for partially updated captures.
    this.#world=undefined;
    let topology=!indices,subjects=!indices;
    if(indices){
      for(const i of indices){
        const s=world.structures[i]!,old=this.#captures[i]!,next=capture(s);
        if(old.kind!==next.kind||old.x!==next.x||old.z!==next.z)topology=true;
        if(old.kind!==next.kind||old.effect!==next.effect)subjects=true;
        this.#captures[i]=next;
      }
    }else this.#captures=world.structures.map(capture);
    if(subjects){
      this.#doors=[];this.#effects=[];
      for(let i=0;i<this.#captures.length;i++){
        const c=this.#captures[i]!;
        if(isRoomDoor(c.kind)||c.kind==='fence-gate')this.#doors.push(i);
        if(c.effect)this.#effects.push(i);
      }
    }
    // Jobs can change axes without any building replacement. Only their exact
    // kind/coordinate sequence matters; read this small dynamic input every time.
    const jobs=world.jobs.filter(j=>j.kind==='wall'||isRoomDoor(j.kind)).map(j=>`${j.kind}:${j.x}:${j.z}`).join('|');
    if(topology||jobs!==this.#jobs||!changes||changes.tileIndices.length){
      this.#axes=doorOrientations(world);
      this.#axesKey=[...this.#axes].join(':');
    }
    if(topology)this.#gateAxes=penBoundaryAxes(world);
    this.#jobs=jobs;this.#world=world;
    return {
      world,indices,axes:this.#axes,axesKey:this.#axesKey,gateAxes:this.#gateAxes,
      doors:this.#doors.map(i=>world.structures[i]!),effects:this.#effects.map(i=>world.structures[i]!),
    };
  }
}
