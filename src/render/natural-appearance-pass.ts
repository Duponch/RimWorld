import {floraSize} from './flora-presentation';
import {plantLeafless} from '../sim/plant-life';
import {createPlantGrowthReader,harvestable,plantGrowth} from '../sim/plants';
import type {Resource,World} from '../sim/types';
import type {NaturalObservation} from './natural-presentation-events';

export interface NaturalAppearanceReader {
  read(resource:Resource):NaturalObservation;
  harvestable(resource:Resource):boolean;
}
type Appearance={size:number;ripe:boolean;leafless:boolean;growth?:number};

/** One synchronous projection pass, owned by NaturalResourcePresentation.
 * All layers consume the same exact visible numbers. This is neither an
 * admitted-World certificate nor a second persistent resource ledger: discard
 * the pass on every read/reset, and never use it after changing its World.
 * Forecast observations, when available, remain the existing numerical owner. */
export class NaturalAppearancePass implements NaturalAppearanceReader {
  private readonly observations=new Map<Resource,Appearance>();
  private readonly growth:(resource:Resource)=>number;
  constructor(readonly world:World,immutableSnapshot=false){
    this.growth=immutableSnapshot?createPlantGrowthReader(world):resource=>plantGrowth(world,resource);
  }
  private readGrowth(resource:Resource,value:Appearance):number {
    return value.growth??(value.growth=this.growth(resource));
  }
  read(resource:Resource,observed?:NaturalObservation):NaturalObservation {
    const old=this.observations.get(resource);if(old)return old;
    const value:Appearance=observed?{...observed}:{size:1,ripe:false,leafless:plantLeafless(this.world,resource)};
    if(!observed){
      const growth=()=>this.readGrowth(resource,value);
      value.size=floraSize(this.world,resource,growth);
      value.ripe=resource.kind==='berries'&&harvestable(this.world,resource,growth);
    }
    this.observations.set(resource,value);return value;
  }
  harvestable(resource:Resource):boolean {
    const value=this.read(resource) as Appearance;
    if(resource.kind==='berries')return value.ripe;
    return harvestable(this.world,resource,()=>this.readGrowth(resource,value));
  }
}
