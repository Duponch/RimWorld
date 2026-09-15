import { doorOpenness } from '../sim/door-rules';
import type { Cell, Command, World } from '../sim/types';

export function doorControls(panel:HTMLElement,world:()=>World|undefined,cell:()=>Cell|undefined,send:(c:Command)=>void):void {
  const group=document.createElement('div');group.id='door-controls';group.hidden=true;
  for(const [setting,label] of [['holdOpen','Maintenir ouverte'],['forbidden','Interdire le passage']] as const) {
    const row=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.id=`door-${setting}`;
    input.onchange=()=>{const w=world(),c=cell(),s=w?.structures.find(s=>s.kind==='door'&&s.x===c?.x&&s.z===c?.z);if(s)send({type:'door-policy',structureId:s.id,setting,value:input.checked});};
    row.style.display='block';row.append(input,label);group.append(row);
  }
  const state=document.createElement('p');state.id='door-state';group.append(state);panel.append(group);
}
export function updateDoorControls(panel:HTMLElement,world:World,cell:Cell):void {
  const group=panel.querySelector<HTMLElement>('#door-controls')!,s=world.structures.find(s=>s.kind==='door'&&s.x===cell.x&&s.z===cell.z);
  group.hidden=!s;if(!s)return;
  for(const setting of ['holdOpen','forbidden'] as const)group.querySelector<HTMLInputElement>(`#door-${setting}`)!.checked=s.door![setting];
  const d=s.door!,fraction=doorOpenness(s,world.tick);
  group.querySelector('#door-state')!.textContent=`${d.open?fraction<1?'Ouverture…':'Ouverte':fraction>0?'Fermeture…':'Fermée'} · ${d.holdOpen?'Maintien après le prochain passage.':'Fermeture après passage ; les objets et occupants la bloquent.'}`;
}
