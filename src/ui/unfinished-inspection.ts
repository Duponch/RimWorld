import {artWorkTotal} from '../sim/art-rules';
import { productionWorkTotal } from '../sim/production-recipes';
import { unfinishedMaterial,unfinishedUnits } from '../sim/unfinished';
import { ITEM_DEFINITIONS } from '../sim/items';
import type { Command,MaterialPile,World } from '../sim/types';

function componentMaterials(work:NonNullable<MaterialPile['componentWork']>):string {
  if(work.recipe==='make-component')return `${work.parts.reduce((sum,part)=>sum+part,0)} acier`;
  return (['component','steel','plasteel','gold'] as const)
    .map(item=>`${work.parts.filter(part=>part.item===item).reduce((sum,part)=>sum+part.quantity,0)} ${ITEM_DEFINITIONS[item].label.toLowerCase()}`)
    .join(' · ');
}

function armorMaterials(work:NonNullable<MaterialPile['flakWork']>):string {
  const items=work.recipe==='make-recon-helmet'?['plasteel','advanced-component'] as const:
    work.recipe==='make-flak-helmet'?['steel','component','plasteel'] as const:['cloth','steel','component'] as const;
  return items.map(item=>`${work.parts.filter(part=>part.item===item).reduce((sum,part)=>sum+part.quantity,0)} ${ITEM_DEFINITIONS[item].label.toLowerCase()}`).join(' · ');
}

export function updateUnfinishedInspection(panel:HTMLElement,world:World,pile:MaterialPile|undefined,send:(c:Command)=>void):void {
  let root=panel.querySelector<HTMLElement>('[data-unfinished]');
  const u=pile?.artWork??pile?.gunWork??pile?.flakWork??pile?.componentWork??pile?.unfinished;
  if(!pile||!u){root?.remove();return;}
  if(!root){root=document.createElement('section');root.dataset.unfinished='';root.innerHTML='<p></p><button class="secondary-action">Annuler cet ouvrage</button>';panel.append(root);}
  const author=world.pawns.find(p=>p.id===u.authorId);
  const materials=pile.artWork?`${pile.artWork.parts.reduce((n,p)=>n+p,0)} ${ITEM_DEFINITIONS[pile.artWork.material].label.toLowerCase()}`:pile.gunWork?(['steel','component'] as const).map(item=>`${pile.gunWork!.parts.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0)} ${ITEM_DEFINITIONS[item].label.toLowerCase()}`).join(' · '):pile.flakWork?armorMaterials(pile.flakWork):pile.componentWork?componentMaterials(pile.componentWork):`${unfinishedUnits(pile.unfinished!)} ${ITEM_DEFINITIONS[unfinishedMaterial(pile.unfinished!)].label.toLowerCase()}`;
  root.querySelector('p')!.textContent=`${ITEM_DEFINITIONS[pile.item].label} · ${Math.floor(100*u.progress/(pile.artWork?artWorkTotal(pile.artWork.recipe,pile.artWork.material):productionWorkTotal(u.recipe)))} % · auteur : ${author?.name??'inconnu'} · ${materials} engagés. L’annulation récupère environ 75 % des matériaux.`;
  root.querySelector('button')!.onclick=()=>send({type:'cancel-unfinished',itemId:pile.id});
}
