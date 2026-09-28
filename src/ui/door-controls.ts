import { doorOpenness, isPassageDoor } from '../sim/door-rules';
import { isPowerActive } from '../sim/power-rules';
import type { Cell, Command, World } from '../sim/types';

export function doorControls(panel:HTMLElement,world:()=>World|undefined,cell:()=>Cell|undefined,send:(c:Command)=>void):void {
  const group=document.createElement('div');group.id='door-controls';group.hidden=true;
  for(const [setting,label] of [['holdOpen','Maintenir ouverte'],['forbidden','Interdire le passage']] as const) {
    const row=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.id=`door-${setting}`;
    input.onchange=()=>{const w=world(),c=cell(),s=w?.structures.find(s=>isPassageDoor(s.kind)&&s.x===c?.x&&s.z===c?.z);if(s)send({type:'door-policy',structureId:s.id,setting,value:input.checked});};
    row.style.display='block';row.append(input,label);group.append(row);
  }
  const state=document.createElement('p');state.id='door-state';group.append(state);panel.append(group);
}
export function updateDoorControls(panel:HTMLElement,world:World,cell:Cell):void {
  const group=panel.querySelector<HTMLElement>('#door-controls')!,s=world.structures.find(s=>isPassageDoor(s.kind)&&s.x===cell.x&&s.z===cell.z);
  group.hidden=!s;if(!s)return;
  for(const setting of ['holdOpen','forbidden'] as const)group.querySelector<HTMLInputElement>(`#door-${setting}`)!.checked=s.door![setting];
  const d=s.door!,fraction=doorOpenness(s,world.tick);
  const motion=s.kind==='autodoor'?` · ${s.breakdown?'Panne mécanique : ouverture manuelle jusqu’au remplacement du composant.':isPowerActive(s)?'Alimentée : ouverture rapide.':'Sans courant : ouverture ordinaire.'}`:'';
  group.querySelector('#door-state')!.textContent=`${d.open?fraction<1?'Ouverture…':'Ouverte':fraction>0?'Fermeture…':'Fermée'} · ${d.holdOpen?'Maintien après le prochain passage.':'Fermeture après passage ; les objets et occupants la bloquent.'}${motion}`;
}
