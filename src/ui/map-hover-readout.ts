import { ITEM_DEFINITIONS } from '../sim/items';
import { FLOOR_DEFINITIONS } from '../sim/flooring';
import { terrainTravelDelay } from '../sim/furniture-travel';
import { LightEnvironmentCache, type LightEnvironment } from '../sim/light-environment';
import { soilFertility } from '../sim/soil';
import type { Cell, World } from '../sim/types';
import { TERRAIN_LABELS } from './terrain-inspection';
import { mapObjectsAt } from './map-object-selection';
import { buildingLabels } from './building-labels';
import { floraDefinition } from '../sim/biome-flora';
import { rockInspection } from './geology-inspection';
import { PLANT_DEFINITIONS } from '../sim/plants';
import type { CropKind } from '../sim/crops';

const lightCache=new LightEnvironmentCache();

/** Pointer movement may cross dozens of cells between simulation snapshots.
 * Reuse the same lighting solution within a short readout interval instead of
 * rescanning every map tile and light source for each pointer event. */
export class MapHoverLightCache {
  private readonly cache=new LightEnvironmentCache();
  private environment?:LightEnvironment;
  private lastAt=-Infinity;
  private lastTick=Infinity;
  private lastSeed?:number;
  private lastWidth=0;
  private lastHeight=0;
  lightAt(world:World,cell:Cell,now:number):number {
    if(!this.environment||now-this.lastAt>=250||world.tick<this.lastTick||world.seed!==this.lastSeed||world.width!==this.lastWidth||world.height!==this.lastHeight){
      this.environment=this.cache.read(world);
      this.lastAt=now;this.lastTick=world.tick;this.lastSeed=world.seed;this.lastWidth=world.width;this.lastHeight=world.height;
    }
    return this.environment.lightAt(cell);
  }
}

/** Mouseover information is independent from selection and has no map overlay. */
export function mapHoverLines(world:World,cell:Cell,lightLevel=lightCache.read(world).lightAt(cell)):string[] {
  const index=cell.z*world.width+cell.x,tile=world.tiles[index];
  if(!tile)return [];
  const label=tile.floor?FLOOR_DEFINITIONS[tile.floor].label:TERRAIN_LABELS[tile.terrain];
  const speed=tile.terrain==='rock'||tile.terrain==='water'?0:Math.round(300/(3+terrainTravelDelay(world,index)));
  const ground=`${label} (vitesse de déplacement ${speed} %, fertilité ${tile.floor?0:Math.round(soilFertility(tile.terrain)*100)} %)`;
  const light=Math.round(lightLevel*100);
  const objects=mapObjectsAt(world,cell).flatMap(selected=>{
    switch(selected.kind){
      case 'pile': {const pile=world.piles.find(p=>p.id===selected.id);return pile?[`${ITEM_DEFINITIONS[pile.item].label} ×${pile.quantity}`]:[];}
      case 'packed': {const packed=world.packed.find(p=>p.building.id===selected.id);return packed?[`Meuble emballé · ${buildingLabels[packed.building.kind]}`]:[];}
      case 'structure': {const structure=world.structures.find(s=>s.id===selected.id);return structure?[buildingLabels[structure.kind]]:[];}
      case 'resource': {const resource=world.resources.find(r=>r.id===selected.id);return resource?[rockInspection(tile,resource)?.title??floraDefinition(resource)?.label??((resource.kind in PLANT_DEFINITIONS)?PLANT_DEFINITIONS[resource.kind as CropKind].label:resource.kind)]:[];}
      case 'rock':return [rockInspection(tile)?.title??'Massif rocheux'];
      case 'job': {const job=world.jobs.find(j=>j.id===selected.id);return job?[`Ordre · ${job.kind}`]:[];}
      case 'growing':return ['Zone de culture'];
      case 'stockpile':return ['Réserve'];
    }
  });
  return [ground,`Lumière : ${light} %`,...objects,...(world.roofing?.constructed.includes(index)?['Toit']:[])];
}
