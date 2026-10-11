import { animalSpecies } from '../sim/animal-species';
import type { Command,Structure,World } from '../sim/types';

export function updateAnimalSpotControls(root:HTMLElement,world:World,spot:Structure|undefined,send:(command:Command)=>void):void {
  let container=root.querySelector<HTMLElement>('[data-animal-spot]');
  if(spot?.kind!=='animal-sleeping-spot'){container?.remove();return;}
  if(!container){
    container=document.createElement('section');container.className='animal-spot-controls';
    container.innerHTML='<label><input type="checkbox" data-animal-spot-medical> Usage médical</label><p data-animal-spot-occupancy></p>';
    (root.querySelector('.cell-card')??root).append(container);
  }
  container.dataset.animalSpot=String(spot.id);
  const checkbox=container.querySelector<HTMLInputElement>('[data-animal-spot-medical]')!;checkbox.checked=!!spot.medical;
  checkbox.onchange=()=>send({type:'animal-spot-medical',spotId:spot.id,enabled:checkbox.checked});
  const occupant=world.wildlife?.animals.find(a=>a.animalRest?.spotId===spot.id&&a.animalRest.phase==='sleep');
  const owner=world.wildlife?.animals.find(a=>a.domestic?.bedId===spot.id),carrier=world.pawns.find(p=>p.animalRescue?.spotId===spot.id);
  const name=(a:NonNullable<typeof occupant>)=>`${animalSpecies(a.species).label} ${a.id}`;
  container.querySelector('[data-animal-spot-occupancy]')!.textContent=occupant?`Occupé : ${name(occupant)}`:carrier?`Secours en cours · ${carrier.name}`:owner?`Affecté : ${name(owner)}`:spot.medical?'Disponible pour les animaux nécessitant des soins.':'Disponible · affectation au premier usage.';
}
