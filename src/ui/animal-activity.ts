import { animalSpecies } from '../sim/animal-species';
import type { WildAnimal } from '../sim/wildlife-state';
import type { World } from '../sim/types';

const labels:Readonly<Record<WildAnimal['state'],string>>={idle:'Se repose',moving:'Se déplace',eating:'Mange',sleeping:'Dort',hungry:'Cherche à manger',downed:'À terre',dead:'Mort'};
/** Shared activity for the list and inspector, published from confirmed state. */
export function animalActivity(world:World,animal:WildAnimal):string {
  if(animal.state==='dead'||animal.state==='downed')return labels[animal.state];
  if(animal.flee)return 'Fuit';
  if(animal.stun)return 'Étourdi';
  if(animal.manhunter){
    if(animal.manhunter.door)return 'En rage · frappe une porte';
    const target=world.pawns.find(pawn=>pawn.id===animal.manhunter!.targetId);
    return target?`En rage · ${animal.strike?'attaque':'poursuit'} ${target.name}`:'En rage · cherche un humain';
  }
  if(animal.meal?.kind==='pile'&&world.piles.some(p=>p.id===animal.meal!.id&&p.corpse))return animal.state==='eating'?'Mange une dépouille':'Rejoint une dépouille';
  if(animal.predation){
    const prey=world.wildlife?.animals.find(a=>a.id===animal.predation!.targetId);
    const target=prey?`${animalSpecies(prey.species).label} ${prey.id}`:'sa proie';
    return `${animal.strike?'Attaque':'Poursuit'} ${target}`;
  }
  if(animal.strike)return 'Riposte';
  if(animal.threat)return 'Se défend';
  if(animal.exiting)return 'Quitte la carte faute de nourriture';
  const state=animal.state==='moving'&&!animal.path.length&&!animal.meal&&(!animal.motion||animal.motion.end<=world.tick)?'idle':animal.state;
  return `${labels[state]}${animal.meal&&state==='moving'?' vers sa nourriture':''}`;
}
