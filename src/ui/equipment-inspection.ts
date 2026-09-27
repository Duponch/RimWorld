import { comfortableTemperature,apparelInsulation } from '../sim/heat-rules';
import { wornApparel,apparelLabel,apparelDefinition,armorPiece } from '../sim/apparel-rules';
import { isColonist } from '../sim/affiliation';
import { equipmentProjection,equipmentDescription } from '../render/character-equipment';
import { ITEM_DEFINITIONS } from '../sim/items';
import { buildingLabels } from './building-labels';
import type { Pawn,World,Command } from '../sim/types';

export interface EquipmentInspectionView {
  comfort:string;
  primary:string;
  apparel:ReadonlyArray<{id:number;name:string;condition:string;protection:string;insulation:string}>;
  inventory:readonly string[];
  memory:string;
}

/** Displays only simulated possessions and statistics. There is no item-mass or
 * carrying-capacity system yet, so the dossier must not fabricate kilograms. */
export function equipmentInspectionView(world:World,pawn:Pawn):EquipmentInspectionView {
  const range=comfortableTemperature(world,pawn),primary=equipmentProjection(world).get(pawn.id);
  const apparel=wornApparel(world,pawn).map(piece=>{
    const definition=apparelDefinition(piece),rating=armorPiece(piece).ratings,insulation=apparelInsulation(piece);
    return {
      id:piece.id,
      name:apparelLabel(piece),
      condition:`${piece.apparel!.hitPoints}/${definition.hitPoints} PV`,
      protection:`Tranchant ${Math.round(rating.sharp*100)} % · Contondant ${Math.round(rating.blunt*100)} % · Chaleur ${Math.round(rating.heat*100)} %`,
      insulation:`Isolation froid ${insulation.cold.toFixed(1)} °C · chaleur ${insulation.heat.toFixed(1)} °C`,
    };
  });
  const inventory=world.piles.filter(p=>['pawn','inventory'].includes(p.owner.type)&&'pawnId' in p.owner&&p.owner.pawnId===pawn.id)
    .map(p=>`${ITEM_DEFINITIONS[p.item].label}${p.quantity>1?` ×${p.quantity}`:''}`);
  for(const packed of world.packed)if(packed.owner.type==='pawn'&&packed.owner.pawnId===pawn.id)inventory.push(buildingLabels[packed.building.kind]);
  if(pawn.rescue?.phase==='carry')inventory.push(pawn.rescue.capture?'Personne capturée transportée':'Personne secourue transportée');
  return {
    comfort:`Plage de températures confortables : ${range.min.toFixed(1)} °C à ${range.max.toFixed(1)} °C`,
    primary:equipmentDescription(primary,pawn),apparel,inventory,
    memory:pawn.droppedWeaponId!==undefined?'Arme perdue : récupération prévue lorsque le colon pourra la reprendre.':'',
  };
}

export function createEquipmentInspection(parent:HTMLElement,current:()=>{world:World;pawn:Pawn}|undefined,send:(c:Command)=>void):void {
  const details=document.createElement('details');details.id='equipment-details';
  details.innerHTML='<summary>Matériel</summary><div class="equipment-dossier"><p id="equipment-comfort"></p><section class="equipment-group"><h4>Équipement</h4><p id="equipment-primary"></p><button id="drop-equipment" class="secondary-action" type="button">Déposer l’arme</button><p id="equipment-memory"></p><button id="forget-equipment" class="secondary-action" type="button">Ne pas récupérer l’arme perdue</button></section><section class="equipment-group"><h4>Vêtements</h4><div id="equipment-apparel"></div></section><section class="equipment-group"><h4>Inventaire</h4><div id="equipment-cargo"></div></section></div>';
  details.querySelector<HTMLButtonElement>('#drop-equipment')!.onclick=()=>{const state=current();if(!state)return;const pile=equipmentProjection(state.world).get(state.pawn.id);if(pile)send({type:'order-equipment',pawnId:state.pawn.id,itemId:pile.id,action:'drop',queue:false});};
  details.querySelector<HTMLButtonElement>('#forget-equipment')!.onclick=()=>{const state=current();if(state)send({type:'forget-weapon',pawnId:state.pawn.id});};
  details.querySelector('#equipment-apparel')!.addEventListener('click',event=>{
    const id=Number((event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-apparel]')?.dataset.removeApparel),state=current();
    if(id&&state)send({type:'order-equipment',pawnId:state.pawn.id,itemId:id,action:'remove',queue:false});
  });
  parent.append(details);
}

export function updateEquipmentInspection(parent:HTMLElement,world:World,pawn:Pawn):void {
  const view=equipmentInspectionView(world,pawn),primary=equipmentProjection(world).get(pawn.id);
  parent.querySelector('#equipment-comfort')!.textContent=view.comfort;
  parent.querySelector('#equipment-primary')!.textContent=view.primary;
  const drop=parent.querySelector<HTMLButtonElement>('#drop-equipment')!;drop.hidden=!primary||!isColonist(pawn);drop.disabled=!!pawn.equipmentDropPending||pawn.state==='dead'||pawn.state==='downed';
  const clothing=parent.querySelector<HTMLElement>('#equipment-apparel')!;
  const signature=JSON.stringify([view.apparel,pawn.state,isColonist(pawn)]);
  if(clothing.dataset.signature!==signature){
    clothing.dataset.signature=signature;clothing.replaceChildren();
    if(!view.apparel.length){const empty=document.createElement('p');empty.textContent='Aucun vêtement équipé';clothing.append(empty);}
    for(const piece of view.apparel){
      const row=document.createElement('div');row.className='equipment-apparel-row';
      const line=document.createElement('div');line.className='equipment-apparel-line';
      const name=document.createElement('strong');name.textContent=piece.name;
      const condition=document.createElement('span');condition.textContent=piece.condition;
      line.append(name,condition);
      const stats=document.createElement('p');stats.className='equipment-apparel-stats';stats.textContent=`${piece.protection} · ${piece.insulation}`;
      const button=document.createElement('button');button.type='button';button.textContent='Retirer';button.dataset.removeApparel=String(piece.id);button.disabled=pawn.state==='dead'||pawn.state==='downed';button.hidden=!isColonist(pawn);
      row.append(line,stats,button);clothing.append(row);
    }
  }
  const cargo=parent.querySelector<HTMLElement>('#equipment-cargo')!,inventorySignature=JSON.stringify(view.inventory);
  if(cargo.dataset.signature!==inventorySignature){cargo.dataset.signature=inventorySignature;cargo.replaceChildren(...(view.inventory.length?view.inventory:['Aucun objet porté']).map(item=>{const p=document.createElement('p');p.textContent=item;return p;}));}
  parent.querySelector('#equipment-memory')!.textContent=view.memory;
  const forget=parent.querySelector<HTMLButtonElement>('#forget-equipment')!;forget.hidden=!isColonist(pawn)||pawn.droppedWeaponId===undefined;forget.disabled=pawn.state==='dead';
}
