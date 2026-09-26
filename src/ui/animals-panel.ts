import {animalSpecies} from '../sim/animal-species';
import {MEDICAL_CARE} from '../sim/medicine-rules';
import type {World} from '../sim/types';
import {animalBody} from '../sim/wildlife-health';

/** Owned animals remain physical wildlife actors. The panel is a filtered view
 * of those actual identities, not a separate counter or promised training UI. */
export function animalsPanelScaffold():string {
  return '<p class="muted" data-domestic-empty>Aucun animal domestique dans cette colonie. Un lièvre sauvage peut être désigné pour Apprivoiser depuis Faune ou son dossier.</p><div class="domestic-list" data-domestic-list></div>';
}

export function updateAnimalsPanel(root:HTMLElement,world:World,focus:(id:number)=>void):void {
  if(!root.querySelector('[data-domestic-list]'))root.innerHTML=animalsPanelScaffold();
  const animals=world.wildlife?.animals.filter(a=>!!a.domestic&&a.state!=='dead')??[];
  root.querySelector<HTMLElement>('[data-domestic-empty]')!.hidden=animals.length>0;
  const list=root.querySelector<HTMLElement>('[data-domestic-list]')!;
  const ids=animals.map(a=>`${a.id}:${a.species}`).join(',');
  if(list.dataset.ids!==ids){
    list.dataset.ids=ids;
    list.replaceChildren(...animals.map(a=>{
      const row=document.createElement('article');row.className='domestic-row';row.dataset.domesticAnimal=String(a.id);
      const locate=document.createElement('button');locate.dataset.domesticFocus=String(a.id);
      locate.onclick=()=>focus(a.id);
      const details=document.createElement('span');details.dataset.domesticDetails=String(a.id);
      row.append(locate,details);return row;
    }));
  }
  for(const a of animals){
    const species=animalSpecies(a.species);
    list.querySelector<HTMLButtonElement>(`[data-domestic-focus="${a.id}"]`)!.textContent=`Repérer ${species.label} ${a.id}`;
    const condition=a.state==='downed'?'À terre':a.state==='sleeping'?'Dort':a.flee?'Fuit':a.burning?'Brûle':a.state==='eating'?'Mange':a.state==='moving'?'Se déplace':'Libre';
    const mobility=Math.round(animalBody(a).capacities.moving*100);
    list.querySelector<HTMLElement>(`[data-domestic-details="${a.id}"]`)!.textContent=
      `${a.sex==='female'?'Femelle':'Mâle'} · ${condition} · ${a.x}, ${a.z} · Nourriture ${Math.round(100*a.food/species.nutrition)} % · Mobilité ${mobility} % · Soins : ${MEDICAL_CARE[a.domestic!.care]}`;
  }
}
