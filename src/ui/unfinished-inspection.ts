import {artWorkTotal} from '../sim/art-rules';
import { productionWorkTotal } from '../sim/production-recipes';
import { unfinishedMaterial,unfinishedUnits } from '../sim/unfinished';
import { ITEM_DEFINITIONS } from '../sim/items';
import type { Command,MaterialPile,World } from '../sim/types';

export function updateUnfinishedInspection(panel:HTMLElement,world:World,pile:MaterialPile|undefined,send:(c:Command)=>void):void {
  let root=panel.querySelector<HTMLElement>('[data-unfinished]');
  const u=pile?.artWork??pile?.gunWork??pile?.unfinished;
  if(!pile||!u){root?.remove();return;}
  if(!root){root=document.createElement('section');root.dataset.unfinished='';root.innerHTML='<p></p><button class="secondary-action">Annuler cet ouvrage</button>';panel.append(root);}
  const author=world.pawns.find(p=>p.id===u.authorId);
  const materials=pile.artWork?`${pile.artWork.parts.reduce((n,p)=>n+p,0)} ${ITEM_DEFINITIONS[pile.artWork.material].label.toLowerCase()}`:pile.gunWork?(['steel','component'] as const).map(item=>`${pile.gunWork!.parts.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0)} ${ITEM_DEFINITIONS[item].label.toLowerCase()}`).join(' · '):`${unfinishedUnits(pile.unfinished!)} ${ITEM_DEFINITIONS[unfinishedMaterial(pile.unfinished!)].label.toLowerCase()}`;
  root.querySelector('p')!.textContent=`${ITEM_DEFINITIONS[pile.item].label} · ${Math.floor(100*u.progress/(pile.artWork?artWorkTotal(pile.artWork.recipe,pile.artWork.material):productionWorkTotal(u.recipe)))} % · auteur : ${author?.name??'inconnu'} · ${materials} engagés. L’annulation récupère environ 75 % des matériaux.`;
  root.querySelector('button')!.onclick=()=>send({type:'cancel-unfinished',itemId:pile.id});
}
