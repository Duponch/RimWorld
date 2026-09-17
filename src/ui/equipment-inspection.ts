import { equipmentProjection,equipmentDescription } from '../render/character-equipment';
import { ITEM_DEFINITIONS } from '../sim/items';
import type { Pawn,World,Command } from '../sim/types';

export function createEquipmentInspection(parent:HTMLElement,current:()=>{world:World;pawn:Pawn}|undefined,send:(c:Command)=>void):void {
  const details=document.createElement('details');details.id='equipment-details';
  details.innerHTML='<summary>Équipement</summary><p id="equipment-primary"></p><button id="drop-equipment" class="secondary-action">Déposer l’arme</button><p id="equipment-cargo"></p><p id="equipment-memory"></p><button id="forget-equipment" class="secondary-action">Ne pas récupérer l’arme perdue</button><p class="muted">Vêtements et inventaire personnel : à venir. Le transport de travail reste séparé.</p>';
  details.querySelector<HTMLButtonElement>('#drop-equipment')!.onclick=()=>{const state=current();if(!state)return;const pile=equipmentProjection(state.world).get(state.pawn.id);if(pile)send({type:'order-equipment',pawnId:state.pawn.id,itemId:pile.id,action:'drop',queue:false});};
  details.querySelector<HTMLButtonElement>('#forget-equipment')!.onclick=()=>{const state=current();if(state)send({type:'forget-weapon',pawnId:state.pawn.id});};
  parent.append(details);
}
export function updateEquipmentInspection(parent:HTMLElement,world:World,pawn:Pawn):void {
  const primary=equipmentProjection(world).get(pawn.id),cargo=world.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
  parent.querySelector('#equipment-primary')!.textContent=equipmentDescription(primary,pawn);
  const drop=parent.querySelector<HTMLButtonElement>('#drop-equipment')!;drop.hidden=!primary;drop.disabled=!!pawn.equipmentDropPending||pawn.state==='dead'||pawn.state==='downed';
  parent.querySelector('#equipment-cargo')!.textContent=cargo?`Cargaison de travail : ${cargo.quantity} ${ITEM_DEFINITIONS[cargo.item].label}`:pawn.rescue?.phase==='carry'?'Transport : personne secourue':world.packed.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id)?'Cargaison : meuble entier':'Aucune cargaison';
  parent.querySelector('#equipment-memory')!.textContent=pawn.droppedWeaponId!==undefined?'Récupérera son arme perdue lorsque ses besoins et engagements le permettront.':'';
  parent.querySelector<HTMLButtonElement>('#forget-equipment')!.hidden=pawn.droppedWeaponId===undefined;
}
