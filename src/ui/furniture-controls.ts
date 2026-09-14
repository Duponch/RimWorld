import { minifiable, packedAt } from '../sim/furniture-rules';
import { footprintCells } from '../sim/definitions';
import type { Cell, Command, World } from '../sim/types';

export function furnitureControls(panel:HTMLElement,world:()=>World|undefined,cell:()=>Cell|undefined,send:(command:Command)=>void,place:(id:number)=>void):void {
  for(const [id,label] of [['cell-uninstall','Désinstaller'],['cell-install','Réinstaller']]) {
    const button=document.createElement('button');button.id=id;button.textContent=label;button.className='secondary-action';button.hidden=true;
    button.onclick=()=>{
      const w=world(),c=cell();if(!w||!c)return;
      const object=w.structures.find(s=>footprintCells(s).some(p=>p.x===c.x&&p.z===c.z))??packedAt(w,c)?.building;
      if(!object)return;
      if(id==='cell-install')place(object.id);else send({type:'designate',kind:'uninstall',x:c.x,z:c.z});
    };
    panel.append(button);
  }
}
export function updateFurnitureControls(panel:HTMLElement,world:World,cell:Cell):void {
  const object=world.structures.find(s=>footprintCells(s).some(p=>p.x===cell.x&&p.z===cell.z)),pack=packedAt(world,cell),id=object?.id??pack?.building.id;
  const busy=world.jobs.some(j=>j.furniture?.structureId===id||j.deconstruction?.structureId===id);
  panel.querySelector<HTMLButtonElement>('#cell-uninstall')!.hidden=!object||!minifiable(object.kind)||busy;
  const install=panel.querySelector<HTMLButtonElement>('#cell-install')!;install.hidden=(!object||!minifiable(object.kind))&&!pack||busy;install.textContent=pack?'Installer':'Réinstaller';
}
