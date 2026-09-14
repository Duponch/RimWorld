import type { Command, Structure } from '../sim/types';
import { WOOD_BURN_TICKS } from '../sim/fuel';

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
  if(label&&fire.fuel)label.textContent=`${fire.fuel.ticks?'Allumé':'Éteint'} · ${(fire.fuel.ticks/WOOD_BURN_TICKS).toFixed(1)} / 20 bois · 10 bois/jour`;
}
