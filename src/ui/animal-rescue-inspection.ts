import { isColonist } from '../sim/affiliation';
import { animalRescueReason } from '../sim/animal-rescue';
import type { World } from '../sim/types';

type Rescue=(pawnId:number,animalId:number)=>void;
const callbacks=new WeakMap<HTMLElement,Rescue>();
export function mountAnimalRescueControls(root:HTMLElement,send?:Rescue):void {
  if(send)callbacks.set(root,send);
}
/** Admission text uses published state only. The command checks physical routes. */
export function updateAnimalRescueControls(root:HTMLElement,world:World,animalId:number):void {
  const animal=world.wildlife?.animals.find(a=>a.id===animalId);
  let container=root.querySelector<HTMLElement>('[data-animal-rescue-actions]');
  if(!container){
    const page=root.querySelector('[data-animal-panel="info"]');if(!page)return;
    container=document.createElement('section');container.dataset.animalRescueActions='';container.className='animal-rescue-actions';page.append(container);
  }
  container.hidden=world.schemaVersion<221||!animal?.domestic||animal.state!=='downed'||!!animal.health?.death;
  if(container.hidden)return;
  const send=callbacks.get(root),workers=world.pawns.filter(isColonist).map(p=>({id:p.id,name:p.name,reason:animalRescueReason(world,p,animal)}));
  const signature=JSON.stringify([animalId,!!send,workers]);if(container.dataset.signature===signature)return;
  container.dataset.signature=signature;container.replaceChildren();
  const title=document.createElement('h3');title.textContent='Secourir';
  const help=document.createElement('p');help.textContent='Un médecin disponible porte cet animal vers un emplacement de couchage libre.';
  container.append(title,help);
  for(const worker of workers){
    const button=document.createElement('button');button.type='button';button.className='secondary-action';button.dataset.animalRescue=String(worker.id);
    button.textContent=`Secourir · ${worker.name}`;button.disabled=!send||!!worker.reason;button.title=worker.reason??'Rejoindre l’animal puis le porter jusqu’à un couchage accessible.';
    button.onclick=()=>send?.(worker.id,animalId);container.append(button);
  }
  if(!workers.length){const empty=document.createElement('p');empty.textContent='Aucun colon présent.';container.append(empty);}
}
