import { minifiable, packedAt } from '../sim/furniture-rules';
import { footprintCells } from '../sim/definitions';
import type { Cell, Command, World } from '../sim/types';

function objectAt(world:World,cell:Cell){const objects=world.structures.filter(s=>footprintCells(s).some(p=>p.x===cell.x&&p.z===cell.z));return objects.find(s=>s.kind!=='power-conduit')??objects[0];}

export function furnitureControls(panel:HTMLElement,world:()=>World|undefined,cell:()=>Cell|undefined,send:(command:Command)=>void,place:(id:number)=>void):void {
  for(const [id,label] of [['cell-uninstall','Désinstaller'],['cell-install','Réinstaller']]) {
    const button=document.createElement('button');button.id=id;button.textContent=label;button.className='secondary-action';button.hidden=true;
    button.onclick=()=>{
      const w=world(),c=cell();if(!w||!c)return;
      const installed=objectAt(w,c);
      const object=id==='cell-install'?packedAt(w,c)?.building??installed:installed;
      if(!object)return;
      if(id==='cell-install')place(object.id);else send({type:'designate',kind:'uninstall',targetId:object.id,x:c.x,z:c.z});
    };
    panel.append(button);
  }
}
export function updateFurnitureControls(panel:HTMLElement,world:World,cell:Cell):void {
  const object=objectAt(world,cell),pack=packedAt(world,cell),target=pack?.building??object;
  const busy=(id:number)=>world.jobs.some(j=>j.flick?.structureId===id||j.furniture?.structureId===id||j.deconstruction?.structureId===id);
  panel.querySelector<HTMLButtonElement>('#cell-uninstall')!.hidden=!object||!minifiable(object.kind)||busy(object.id);
  const install=panel.querySelector<HTMLButtonElement>('#cell-install')!;install.hidden=!target||!minifiable(target.kind)||busy(target.id);install.textContent=pack?'Installer':'Réinstaller';
}
