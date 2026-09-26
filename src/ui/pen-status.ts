import { penRegion } from '../sim/animal-pens';
import type { World } from '../sim/types';
import type { WildAnimal } from '../sim/wildlife-state';

/** Derived from the actual marker assignment and current physical perimeter. */
export function animalPenStatus(world:World,animal:WildAnimal,regions=new Map<number,ReturnType<typeof penRegion>>()):string|undefined {
  if(!animal.domestic||animal.species==='hare'||animal.species==='snow-hare')return undefined;
  const markerId=animal.domestic.penMarkerId;
  if(markerId===undefined)return 'Aucun enclos attribué';
  const marker=world.structures.find(s=>s.id===markerId&&s.kind==='pen-marker');
  if(!marker)return 'Marqueur d’enclos absent';
  let region=regions.get(markerId);
  if(!region){region=penRegion(world,markerId);regions.set(markerId,region);}
  if(!region)return 'Enclos introuvable';
  if(!region.closed)return 'Enclos ouvert · risque d’errance';
  if(!region.accessible)return 'Enclos fermé, sans accès de conduite';
  return region.cells.has(animal.z*world.width+animal.x)?`Dans l’enclos ${marker.x}, ${marker.z}`:`Hors de l’enclos ${marker.x}, ${marker.z}`;
}
