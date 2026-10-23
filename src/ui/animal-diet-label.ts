import {animalDietFlags256} from '../sim/animal-diet-v256';
import type {WildAnimal} from '../sim/wildlife-state';

/** The same food flags used by ingestion, independently of hunting behaviour.
 * The original seven keep their explicit historical food rules. */
export function animalDietLabel(animal:WildAnimal,version:number):string {
  const flags=animalDietFlags256(animal.species);
  if(flags===undefined){
    if(animal.species==='red-fox')return `viande et repas${version>=178?' · dépouilles fraîches':''}${version>=227?' · croquettes':''}`;
    return `végétaux et repas${version>=227?' · foin et croquettes':''}`;
  }
  const vegetable=(flags&1)!==0,meat=(flags&2)!==0;
  const label=vegetable&&meat?'omnivore':meat?(flags&0x100?'carnivore':'carnivore strict'):'végétarien';
  const foods:string[]=[];
  if(vegetable)foods.push('végétaux crus');
  if(meat)foods.push('viande');
  if(flags&0x100)foods.push('repas');
  if(flags&0x20)foods.push('produits animaux et œufs');
  if(flags&8)foods.push('dépouilles fraîches');
  if(flags&0x40)foods.push('plantes et foin');
  if(flags&0x800)foods.push('croquettes');
  return `${label} · ${foods.join(', ')}`;
}
