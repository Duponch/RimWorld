import { comfortableTemperature,apparelInsulation } from '../sim/heat-rules';
import { wornApparel,apparelLabel,apparelDefinition,armorPiece } from '../sim/apparel-rules';
import { isColonist } from '../sim/affiliation';
import { equipmentProjection,equipmentDescription } from '../render/character-equipment';
import { ITEM_DEFINITIONS } from '../sim/items';
import { buildingLabels } from './building-labels';
import type { Pawn,World,Command } from '../sim/types';
import { setTooltip } from './tooltip';
import { openObjectInformation } from './object-information';
import { itemInformation } from './item-information';

export interface EquipmentInspectionView {
  comfort:string;
  primary:string;
  apparel:ReadonlyArray<{id:number;name:string;condition:string;protection:string;insulation:string}>;
  inventory:readonly string[];
  memory:string;
}

/** Ordinary carrying and expedition mass are distinct. No universal carrying
 * capacity is inferred from the commercial expedition's admission limit. */
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
  details.innerHTML='<summary>Matériel</summary><div class="equipment-dossier"><p id="equipment-comfort" tabindex="0"></p><section class="equipment-group"><h4>Équipement</h4><div class="equipment-primary-line"><p id="equipment-primary" tabindex="0"></p><button id="primary-information" class="information-button" type="button" aria-label="Informations sur l’arme">i</button><button id="drop-equipment" class="secondary-action" type="button">Déposer</button></div><p id="equipment-memory"></p><button id="forget-equipment" class="secondary-action" type="button">Ne pas récupérer l’arme perdue</button></section><section class="equipment-group"><h4>Vêtements</h4><div id="equipment-apparel"></div></section><section class="equipment-group"><h4>Inventaire</h4><div id="equipment-inventory"></div></section><section class="equipment-group"><h4>Cargaison transportée</h4><div id="equipment-cargo"></div></section></div>';
  details.querySelector<HTMLButtonElement>('#primary-information')!.onclick=()=>{const state=current();if(!state)return;const pile=equipmentProjection(state.world).get(state.pawn.id);if(pile)openObjectInformation(itemInformation(pile));};
  details.querySelector<HTMLButtonElement>('#drop-equipment')!.onclick=()=>{const state=current();if(!state)return;const pile=equipmentProjection(state.world).get(state.pawn.id);if(pile)send({type:'order-equipment',pawnId:state.pawn.id,itemId:pile.id,action:'drop',queue:false});};
  details.querySelector<HTMLButtonElement>('#forget-equipment')!.onclick=()=>{const state=current();if(state)send({type:'forget-weapon',pawnId:state.pawn.id});};
  details.querySelector('#equipment-apparel')!.addEventListener('click',event=>{
    const target=event.target as HTMLElement,state=current();
    const informationId=Number(target.closest<HTMLButtonElement>('[data-apparel-information]')?.dataset.apparelInformation);
    if(informationId&&state){const piece=state.world.piles.find(p=>p.id===informationId);if(piece)openObjectInformation(itemInformation(piece));return;}
    const id=Number(target.closest<HTMLButtonElement>('[data-remove-apparel]')?.dataset.removeApparel);
    if(id&&state)send({type:'order-equipment',pawnId:state.pawn.id,itemId:id,action:'remove',queue:false});
  });
  parent.append(details);
}

export function updateEquipmentInspection(parent:HTMLElement,world:World,pawn:Pawn):void {
  const view=equipmentInspectionView(world,pawn),primary=equipmentProjection(world).get(pawn.id);
  parent.querySelector('#equipment-comfort')!.textContent=view.comfort;
  parent.querySelector('#equipment-primary')!.textContent=primary?view.primary.split(' · ')[0]!:view.primary;
  setTooltip(parent.querySelector<HTMLElement>('#equipment-primary')!,{title:'Arme équipée',body:view.primary});
  setTooltip(parent.querySelector<HTMLElement>('#equipment-comfort')!,{title:'Températures confortables',body:'La plage combine les limites de la personne et l’isolation réelle de ses vêtements.',rows:[{label:'Plage',value:view.comfort.split(' : ')[1]??view.comfort}]});
  parent.querySelector<HTMLElement>('#primary-information')!.hidden=!primary;
  const drop=parent.querySelector<HTMLButtonElement>('#drop-equipment')!;drop.hidden=!primary||!isColonist(pawn);drop.disabled=!!pawn.equipmentDropPending||pawn.state==='dead'||pawn.state==='downed';
  setTooltip(drop,{title:'Déposer l’arme',body:'Le colon dépose physiquement son arme équipée. Elle conserve son identité, sa qualité et ses points de vie.'});
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
      const stats=document.createElement('p');stats.className='equipment-apparel-stats';stats.textContent=`${piece.protection} · ${piece.insulation}`;stats.hidden=true;
      line.tabIndex=0;setTooltip(line,{title:piece.name,body:`${piece.protection}\n${piece.insulation}`,rows:[{label:'État',value:piece.condition}]});
      const info=document.createElement('button');info.type='button';info.className='information-button';info.textContent='i';info.dataset.apparelInformation=String(piece.id);info.setAttribute('aria-label',`Informations : ${piece.name}`);setTooltip(info,{title:'Informations',body:'Afficher les propriétés de ce vêtement.'});
      const button=document.createElement('button');button.type='button';button.textContent='Retirer';button.dataset.removeApparel=String(piece.id);button.disabled=pawn.state==='dead'||pawn.state==='downed';button.hidden=!isColonist(pawn);
      setTooltip(button,{title:`Retirer ${piece.name}`,body:'Retirer physiquement ce vêtement puis le déposer. La commande attend une personne capable d’agir.'});
      row.append(line,stats,info,button);clothing.append(row);
    }
  }
  const possessionOwners=world.piles.filter(p=>['pawn','inventory'].includes(p.owner.type)&&'pawnId' in p.owner&&p.owner.pawnId===pawn.id).map(p=>p.owner.type);
  for(const [selector,items,empty] of [
    ['#equipment-inventory',view.inventory.filter((_,index)=>possessionOwners[index]==='inventory'),'Inventaire vide'],
    ['#equipment-cargo',view.inventory.filter((_,index)=>possessionOwners[index]!=='inventory'),'Aucune cargaison'],
  ] as const){const host=parent.querySelector<HTMLElement>(selector)!,signature=JSON.stringify(items);if(host.dataset.signature!==signature){host.dataset.signature=signature;host.replaceChildren(...(items.length?items:[empty]).map(item=>{const line=document.createElement('p');line.textContent=item;return line;}));}}
  parent.querySelector('#equipment-memory')!.textContent=view.memory;
  const forget=parent.querySelector<HTMLButtonElement>('#forget-equipment')!;forget.hidden=!isColonist(pawn)||pawn.droppedWeaponId===undefined;forget.disabled=pawn.state==='dead';
}
