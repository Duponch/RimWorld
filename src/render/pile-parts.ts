import {itemGeometry} from './item-presentation';
import type {PileSurface} from './pile-surfaces';
import type {ItemId} from '../sim/items';
import type {MaterialKind} from '../sim/types';
import {tagPlacementTargets,type Placement} from './primitives';
import type {CorpseStage} from './corpse-presentation';
import type {CorpseState} from '../sim/corpses';

export interface PileBundle {x:number;z:number;kind:MaterialKind;item:ItemId;quantity:number;supplied:boolean;surface?:PileSurface;corpseStage?:CorpseStage;facing?:number;corpse?:CorpseState;targetId?:number}

/** Rebuilt only at pile adoption. Resident shape batches draw the same authored
 * parts as portraits and carried cargo; bodies retain their dedicated rigs. */
export function pileParts(bundles:readonly PileBundle[]):Placement[] {
  const result:Placement[]=[];
  for(const bundle of bundles){
    const start=result.length,x=bundle.x+(bundle.supplied?(bundle.kind==='wood'?-.12:.2):0),z=bundle.z+(bundle.supplied?.16:0);
    for(const part of itemGeometry(bundle.item,bundle.quantity,{x:bundle.x,z:bundle.z})){
      const p={...part,x:part.x+x,z:part.z+z};
      if(bundle.surface){const surface=bundle.surface;
        p.x=bundle.x+(p.x-bundle.x)*surface.scale+surface.x;p.z=bundle.z+(p.z-bundle.z)*surface.scale+surface.z;
        p.y+=surface.y;p.sx=(p.sx??1)*surface.scale;p.sz=(p.sz??1)*surface.scale;
      }
      result.push(p);
    }
    if(bundle.targetId!==undefined)tagPlacementTargets(result,start,bundle.targetId);
  }
  return result;
}
