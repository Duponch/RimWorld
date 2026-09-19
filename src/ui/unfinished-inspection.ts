import { productionWorkTotal } from '../sim/production-recipes';
import type { Command,MaterialPile,World } from '../sim/types';

export function updateUnfinishedInspection(panel:HTMLElement,world:World,pile:MaterialPile|undefined,send:(c:Command)=>void):void {
  let root=panel.querySelector<HTMLElement>('[data-unfinished]');
  if(!pile?.unfinished){root?.remove();return;}
  if(!root){root=document.createElement('section');root.dataset.unfinished='';root.innerHTML='<p></p><button class="secondary-action">Annuler la confection</button>';panel.append(root);}
  const u=pile.unfinished,author=world.pawns.find(p=>p.id===u.authorId);
  root.querySelector('p')!.textContent=`Tenue inachevée · ${Math.floor(100*u.progress/productionWorkTotal(u.recipe))} % · auteur : ${author?.name??'inconnu'} · ${u.cloth} tissus engagés. L’annulation récupère environ 75 % du tissu.`;
  root.querySelector('button')!.onclick=()=>send({type:'cancel-unfinished',itemId:pile.id});
}
