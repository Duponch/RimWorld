import type {World} from '../../src/sim/types';
import {readSceneResourceFrame,type SceneResourceFrame} from '../../src/render/scene-resource-index';
import {isClusterPlantSpecies} from '../../src/render/flora-presentation';
import type {Owner} from './core.test';
// Exact V241 updateResources body. Added this annotation is erased; the
// source Core will become B and is never consulted as reference at runtime.
export function historicalResources(this:Owner,world: World, newMap: boolean,frame?:SceneResourceFrame): void {
    const view=this.naturalPresentation.read(world,newMap,this.immutableWorlds.has(world));if(!view)return;
    this.plants.update(view,newMap,this.naturalPresentation.changes);
    if(readSceneResourceFrame(frame,world)){
      this.resources.update(world,newMap,this.naturalPresentation.changes,frame);
      // Overview owns the same crop/cluster exclusion already; it can receive
      // the complete current World without a second global filtered array.
      this.overview.update(world,newMap,this.naturalPresentation.changes);return;
    }
    const visible={...view,resources:view.resources.filter(resource=>!isClusterPlantSpecies(resource.species))};
    this.resources.update(visible, newMap,this.naturalPresentation.changes); this.overview.update(visible,newMap,this.naturalPresentation.changes);
}
