import type {Structure,World} from '../sim/types';
import {readSnapshotStructureChanges} from '../bridge/snapshot-changes';

// Literal tuple body from PresentationChanges.readStructures, including fuel
// truthiness, optional clocks and whole EMP / wick object values. A native
// tuple is serialized immediately; RAW keeps the original array expression.
function tuple(s:Structure):unknown[] {
  return [s.id,s.x,s.z,s.medical,s.prisoner,s.emp,s.fuel? s.fuel.ticks>0:undefined,s.door?.changedAt,s.door?.open,s.power?.on,s.power?.parentId,s.power?.switchOn,
    s.turret?[s.turret.ammoQ,s.turret.autoReload,s.turret.holdFire,s.turret.targetKey,!!s.turret.warmup,
      s.turret.burst?.targetKey,!!s.turret.burst,s.turret.cooldownCore>0,s.turret.wick]:undefined];
}

/** A string projection inside the private closed MAIN observer only. The
 * observer compares equality, and JSON encoding of this string is injective.
 * No authority follows from this exported helper or a confirmed journal alone.
 * RAW / Source never instantiate it and keep the literal tuple array. */
export class ConfirmedStructurePhaseReader {
  #world:World|undefined;
  #ids:number[]=[];
  #slots:string[]=[];
  #signature='[]';

  clear():void {this.#world=undefined;this.#ids=[];this.#slots=[];this.#signature='[]';}

  read(world:World):string {
    const previous=this.#world;
    const sameMap=previous&&previous.seed===world.seed&&previous.width===world.width&&previous.height===world.height;
    const changes=sameMap&&previous!==world&&this.#ids.length===world.structures.length
      ?readSnapshotStructureChanges(previous,world):undefined;
    let indices=changes?.structureIndices;
    if(indices)for(const i of indices){
      if(!Number.isSafeInteger(i)||i<0||i>=world.structures.length||this.#ids[i]!==world.structures[i]?.id){indices=undefined;break;}
    }
    // Never use a partly updated cache as the base after any consumer throw.
    // Tuples/IDs/strings are owned; no old World or graph is modified.
    this.#world=undefined;
    if(indices){
      let changed=false;
      for(const i of indices){
        const next=JSON.stringify(tuple(world.structures[i]!));
        if(next!==this.#slots[i]){this.#slots[i]=next;changed=true;}
      }
      if(changed)this.#signature='['+this.#slots.join(',')+']';
    }else{
      // Full, checkpoint, gap, membership/order, epoch, eviction, copied RAW
      // and same-World reads retain a complete literal projection.
      const tuples=world.structures.map(s=>tuple(s));
      const signature=JSON.stringify(tuples);
      const ids=world.structures.map(s=>s.id);
      // Native valid arrays are dense. Defensive hole/atypical admission never
      // reuses a sparse journal base, while the returned full JSON stays exact.
      for(let i=0;i<ids.length;i++)if(!Number.isSafeInteger(ids[i])||ids[i]!<1){
        this.#ids=[];this.#slots=[];this.#signature=signature;return signature;
      }
      this.#ids=ids;this.#slots=tuples.map(value=>JSON.stringify(value));this.#signature=signature;
    }
    this.#world=world;
    return this.#signature;
  }
}
