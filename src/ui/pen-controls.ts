import { animalSpecies, type AnimalSpeciesId } from '../sim/animal-species';
import { penRegion } from '../sim/animal-pens';
import type { Cell,Command,World } from '../sim/types';

const PEN_SPECIES:readonly AnimalSpeciesId[]=['deer','gazelle','muffalo','dromedary'];

/** Real marker policy controls; the selected marker is resolved again when a
 * checkbox is used, so replacing the world cannot target an old identity. */
export function penControls(panel:HTMLElement,world:()=>World|undefined,cell:()=>Cell|undefined,send:(command:Command)=>void):void {
  const group=document.createElement('div');group.id='pen-controls';group.hidden=true;
  const heading=document.createElement('h3');heading.textContent='Enclos';group.append(heading);
  const state=document.createElement('p');state.dataset.penState='';group.append(state);
  const species=document.createElement('fieldset');species.className='pen-species';
  const legend=document.createElement('legend');legend.textContent='Espèces acceptées';species.append(legend);
  for(const id of PEN_SPECIES){
    const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.penSpecies=id;
    input.onchange=()=>{
      const w=world(),c=cell(),marker=w?.structures.find(s=>s.kind==='pen-marker'&&s.x===c?.x&&s.z===c?.z);
      if(marker)send({type:'pen-species',markerId:marker.id,species:id,accepted:input.checked});
    };
    label.append(input,document.createTextNode(animalSpecies(id).label));species.append(label);
  }
  group.append(species);panel.append(group);
}

export function updatePenControls(panel:HTMLElement,world:World,cell:Cell):void {
  const group=panel.querySelector<HTMLElement>('#pen-controls');if(!group)return;
  const marker=world.structures.find(s=>s.kind==='pen-marker'&&s.x===cell.x&&s.z===cell.z);
  group.hidden=!marker;if(!marker)return;
  const region=penRegion(world,marker.id);
  group.querySelector<HTMLElement>('[data-pen-state]')!.textContent=!region
    ? 'Région d’enclos indisponible.'
    :!region.closed
    ? 'Périmètre ouvert · les herbivores peuvent s’éloigner.'
    :!region.accessible
      ? `Périmètre fermé · ${region.cells.size} cases · ajoutez un portillon accessible pour la conduite.`
      : `Périmètre fermé et accessible · ${region.cells.size} cases.`;
  for(const input of group.querySelectorAll<HTMLInputElement>('[data-pen-species]'))input.checked=!!marker.pen?.accepted.includes(input.dataset.penSpecies as AnimalSpeciesId);
}
