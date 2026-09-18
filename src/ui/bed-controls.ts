import { isColonist } from '../sim/affiliation';
import { footprintCells } from '../sim/definitions.ts';
import type { Cell,Command,Structure,World } from '../sim/types.ts';

export function bedControls(panel:HTMLElement,world:()=>World|undefined,cell:()=>Cell|undefined,send:(c:Command)=>void):void {
  const root=document.createElement('div');root.id='cell-bed';root.hidden=true;
  const ownerLabel=document.createElement('label');ownerLabel.textContent='Propriétaire du lit ';
  const owner=document.createElement('select');owner.id='bed-owner';owner.setAttribute('aria-label','Propriétaire du lit');owner.append(new Option('Non attribué',''));
  for(const p of world()?.pawns??[])if(isColonist(p)&&p.state!=='dead')owner.append(new Option(p.name,String(p.id)));
  const bed=()=>world()?.structures.find(s=>s.kind==='bed'&&footprintCells(s).some(c=>c.x===cell()?.x&&c.z===cell()?.z));
  owner.onchange=()=>{const b=bed();if(b)send({type:'assign-bed',bedId:b.id,pawnId:owner.value?Number(owner.value):null});};
  ownerLabel.append(owner);
  const label=document.createElement('label');const medical=document.createElement('input');medical.type='checkbox';medical.id='bed-medical';medical.setAttribute('aria-label','Usage médical');
  medical.onchange=()=>{const b=bed();if(b)send({type:'medical-bed',bedId:b.id,enabled:medical.checked});};
  label.append(medical,' Usage médical');root.append(label,ownerLabel);panel.append(root);
}
export function updateBedControls(panel:HTMLElement,world:World,structure:Structure|undefined):void {
  const root=panel.querySelector<HTMLElement>('#cell-bed');if(!root)return;
  root.hidden=structure?.kind!=='bed';if(structure?.kind!=='bed')return;
  const owner=root.querySelector<HTMLSelectElement>('#bed-owner')!;
  owner.disabled=!!structure.medical;
  if(document.activeElement!==owner)owner.value=String(world.pawns.find(p=>p.bedId===structure.id)?.id??'');
  root.querySelector<HTMLInputElement>('#bed-medical')!.checked=!!structure.medical;
}
