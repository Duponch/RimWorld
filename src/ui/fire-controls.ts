import type { Command, Structure } from '../sim/types';
import { FUEL_UNIT_TICKS, WOOD_BURN_TICKS, fuelItem, fuelLimit } from '../sim/fuel';

export function fireControls(fire: Structure, send: (command: Command) => void): HTMLElement {
  const section=document.createElement('div');section.className='storage-settings';
  const status=document.createElement('p');status.id='fire-fuel';section.append(status);
  const label=document.createElement('label'),toggle=document.createElement('input');
  toggle.type='checkbox';toggle.id='fire-auto-refuel';toggle.checked=!!fire.fuel?.autoRefuel;
  toggle.onchange=()=>send({type:'refuel-policy',structureId:fire.id,enabled:toggle.checked});
  label.append(toggle,'Ravitaillement automatique');section.append(label);
  updateFireControls(section,fire);return section;
}
export function updateFireControls(root: ParentNode, fire: Structure): void {
  const label=root.querySelector('#fire-fuel');
  if(label&&fire.fuel&&fuelItem(fire.kind)==='chemfuel'){
    label.textContent=`${fire.fuel.ticks?'Réservoir alimenté':'Réservoir vide'} · ${(fire.fuel.ticks/FUEL_UNIT_TICKS).toLocaleString('fr-FR',{maximumFractionDigits:2})} / ${fuelLimit(fire.kind)/FUEL_UNIT_TICKS} biocarburants · 4,5 unités/jour · débit arrêté par le commutateur ou une panne · livraison physique de biocarburant`;
    return;
  }
  if(label&&fire.fuel&&fire.kind==='fueled-stove'){
    label.textContent=`${fire.fuel.ticks?'Alimentée':'Vide'} · ${(fire.fuel.ticks/WOOD_BURN_TICKS).toFixed(1)} / ${fuelLimit(fire.kind)/WOOD_BURN_TICKS} bois · 160 bois/jour de préparation · aucune consommation au repos`;
    return;
  }
  if(label&&fire.fuel)label.textContent=`${fire.kind==='passive-cooler'||fire.kind==='wood-generator'?(fire.fuel.ticks?'Alimenté':'Vide'):(fire.fuel.ticks?'Allumé':'Éteint')} · ${(fire.fuel.ticks/WOOD_BURN_TICKS).toFixed(1)} / ${fuelLimit(fire.kind)/WOOD_BURN_TICKS} bois · ${fire.kind==='wood-generator'?22:10} bois/jour${fire.kind==='passive-cooler'?' · refroidit au-dessus de 17 °C, ne réfrigère pas les aliments':''}`;
}
