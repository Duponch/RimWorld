import { apparelInsulation } from '../sim/heat-rules';
import { wornApparel,apparelLabel,apparelDefinition,armorPiece } from '../sim/apparel-rules';
import { isColonist } from '../sim/affiliation';
import { equipmentProjection,equipmentDescription } from '../render/character-equipment';
import { ITEM_DEFINITIONS } from '../sim/items';
import type { Pawn,World,Command } from '../sim/types';

export function createEquipmentInspection(parent:HTMLElement,current:()=>{world:World;pawn:Pawn}|undefined,send:(c:Command)=>void):void {
  const details=document.createElement('details');details.id='equipment-details';
  details.innerHTML='<summary>Équipement</summary><p id="equipment-primary"></p><button id="drop-equipment" class="secondary-action">Déposer l’arme</button><p id="equipment-cargo"></p><p id="equipment-memory"></p><button id="forget-equipment" class="secondary-action">Ne pas récupérer l’arme perdue</button><div id="equipment-apparel"></div><p class="muted">Inventaire personnel et tenues automatiques : à venir. Le transport de travail reste séparé.</p>';
  details.querySelector<HTMLButtonElement>('#drop-equipment')!.onclick=()=>{const state=current();if(!state)return;const pile=equipmentProjection(state.world).get(state.pawn.id);if(pile)send({type:'order-equipment',pawnId:state.pawn.id,itemId:pile.id,action:'drop',queue:false});};
  details.querySelector<HTMLButtonElement>('#forget-equipment')!.onclick=()=>{const state=current();if(state)send({type:'forget-weapon',pawnId:state.pawn.id});};
  details.querySelector('#equipment-apparel')!.addEventListener('click',event=>{
    const id=Number((event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-apparel]')?.dataset.removeApparel),state=current();
    if(id&&state)send({type:'order-equipment',pawnId:state.pawn.id,itemId:id,action:'remove',queue:false});
  });
  parent.append(details);
}
export function updateEquipmentInspection(parent:HTMLElement,world:World,pawn:Pawn):void {
  const primary=equipmentProjection(world).get(pawn.id),cargo=world.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
  parent.querySelector('#equipment-primary')!.textContent=equipmentDescription(primary,pawn);
  const drop=parent.querySelector<HTMLButtonElement>('#drop-equipment')!;drop.hidden=!primary||!isColonist(pawn);drop.disabled=!!pawn.equipmentDropPending||pawn.state==='dead'||pawn.state==='downed';
  const clothing=parent.querySelector<HTMLElement>('#equipment-apparel')!,pieces=wornApparel(world,pawn);
  const signature=JSON.stringify([pieces.map(p=>[p.id,p.item,p.apparel]),pawn.state,isColonist(pawn)]);
  if(clothing.dataset.signature!==signature){
    clothing.dataset.signature=signature;clothing.replaceChildren();
    if(!pieces.length)clothing.textContent='Aucun vêtement équipé';
    for(const piece of pieces){const insulation=apparelInsulation(piece),row=document.createElement('p'),button=document.createElement('button'),ratings=armorPiece(piece).ratings;
      row.textContent=`${apparelLabel(piece)} · ${piece.apparel!.hitPoints}/${apparelDefinition(piece).hitPoints} PV · tranchant ${Math.round(ratings.sharp*100)} %, contondant ${Math.round(ratings.blunt*100)} % · froid −${insulation.cold.toFixed(1)} °C, chaleur +${insulation.heat.toFixed(1)} °C `;
      button.textContent='Retirer';button.dataset.removeApparel=String(piece.id);button.disabled=pawn.state==='dead'||pawn.state==='downed';button.hidden=!isColonist(pawn);row.append(button);clothing.append(row);
    }
  }
  parent.querySelector('#equipment-cargo')!.textContent=cargo?`Cargaison de travail : ${cargo.quantity} ${ITEM_DEFINITIONS[cargo.item].label}`:pawn.rescue?.phase==='carry'?'Transport : personne secourue':world.packed.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id)?'Cargaison : meuble entier':'Aucune cargaison';
  parent.querySelector('#equipment-memory')!.textContent=pawn.droppedWeaponId!==undefined?'Récupérera son arme perdue lorsque ses besoins et engagements le permettront.':'';
  parent.querySelector<HTMLButtonElement>('#forget-equipment')!.hidden=!isColonist(pawn)||pawn.droppedWeaponId===undefined;
}
