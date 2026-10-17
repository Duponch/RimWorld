import {knownPile256,knownBuilding256} from './exploration-readers-256';
import { shelfFixedAccepts,shelfStorageCells,isShelfKind } from '../sim/shelf-storage';
import { ITEM_DEFINITIONS } from '../sim/items';
import { ANIMAL_SPECIES } from '../sim/animal-species';
import { bodySizeAtAge } from '../sim/animal-life';
import type { MaterialPile,Structure,World } from '../sim/types';
import type { StorageControlOptions } from './storage-item-controls';

export const SHELF_FIXED_EXPLANATION='Exclusions physiques : fragments, meubles emballés, corps humains et gros corps. Les petites dépouilles restent soumises aux filtres ; la taille de chaque corps dépend de son âge. Copier les réglages ne lie pas les stockages.';
export const shelfControlOptions:StorageControlOptions={fixedAllows:item=>item!=='furniture'&&(shelfFixedAccepts(item)||Object.values(ANIMAL_SPECIES).some(species=>species.corpseItem===item&&bodySizeAtAge(species.id,0)<.75)),fixedReason:'Exclusion physique de l’étagère, indépendante des réglages copiés.'};
export interface ShelfInspection { capacity:number;piles:MaterialPile[];cellIds:readonly number[] }
export function readShelfInspection(world:World,structure:Structure):ShelfInspection|undefined {
  if(!isShelfKind(structure.kind)||!structure.shelf||!knownBuilding256(world,structure))return;
  const cells=shelfStorageCells(structure),positions=new Set(cells.map(cell=>`${cell.x},${cell.z}`));
  return {capacity:cells.length*3,cellIds:[...structure.shelf.cells],piles:world.piles.filter(p=>knownPile256(world,p)&&p.owner.type==='ground'&&positions.has(`${p.owner.x},${p.owner.z}`)).sort((a,b)=>a.id-b.id)};
}
/** Keyed buttons retain focus across confirmed stock updates. */
export function updateShelfInspection(panel:HTMLElement,world:World,structure:Structure|undefined,onSelect:(pileId:number)=>void):void {
  let root=panel.querySelector<HTMLElement>('[data-shelf-contents]');
  const view=structure?readShelfInspection(world,structure):undefined;
  if(!view){root?.remove();return;}
  if(!root){root=document.createElement('section');root.dataset.shelfContents='';root.setAttribute('aria-label','Contenu de l’étagère');
    const status=document.createElement('p');status.dataset.shelfSlots='';
    const list=document.createElement('div');list.dataset.shelfPiles='';
    const explanation=document.createElement('small');explanation.textContent=SHELF_FIXED_EXPLANATION;
    root.append(status,list,explanation);panel.querySelector('.cell-card')?.append(root);
  }
  const slots=root.querySelector<HTMLElement>('[data-shelf-slots]')!,text=`${view.piles.length} / ${view.capacity} emplacements occupés`;
  if(slots.textContent!==text)slots.textContent=text;
  const list=root.querySelector<HTMLElement>('[data-shelf-piles]')!,ids=new Set(view.piles.map(p=>String(p.id)));
  for(const button of list.querySelectorAll<HTMLElement>('[data-shelf-pile]'))if(!ids.has(button.dataset.shelfPile!))button.remove();
  for(const [index,pile] of view.piles.entries()){
    let button=list.querySelector<HTMLButtonElement>(`[data-shelf-pile="${pile.id}"]`);
    if(!button){button=document.createElement('button');button.type='button';button.dataset.shelfPile=String(pile.id);button.onclick=()=>onSelect(pile.id);}
    const text=`${ITEM_DEFINITIONS[pile.item].label} × ${pile.quantity}`;if(button.textContent!==text)button.textContent=text;
    if(list.children[index]!==button)list.insertBefore(button,list.children[index]??null);
  }
}
