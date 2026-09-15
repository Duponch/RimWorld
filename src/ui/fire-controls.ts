import type { Command, Structure } from '../sim/types';
import { WOOD_BURN_TICKS, fuelLimit } from '../sim/fuel';

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
  if(label&&fire.fuel)label.textContent=`${fire.kind==='passive-cooler'?(fire.fuel.ticks?'Alimenté':'Vide'):(fire.fuel.ticks?'Allumé':'Éteint')} · ${(fire.fuel.ticks/WOOD_BURN_TICKS).toFixed(1)} / ${fuelLimit(fire.kind)/WOOD_BURN_TICKS} bois · 10 bois/jour${fire.kind==='passive-cooler'?' · refroidit au-dessus de 17 °C, ne réfrigère pas les aliments':''}`;
}
