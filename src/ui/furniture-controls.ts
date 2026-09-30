import { minifiable } from '../sim/furniture-rules';
import { footprintCells } from '../sim/definitions';
import type { Cell, Command, World } from '../sim/types';

function selectedFurniture(world:World,cell:Cell,id:number|undefined){
  const object=world.structures.find(s=>s.id===id&&footprintCells(s).some(p=>p.x===cell.x&&p.z===cell.z));
  const pack=world.packed.find(p=>p.building.id===id&&p.owner.type==='ground'&&p.owner.x===cell.x&&p.owner.z===cell.z);
  return {object,pack,target:pack?.building??object};
}

export function furnitureControls(panel:HTMLElement,world:()=>World|undefined,cell:()=>Cell|undefined,selection:()=>number|undefined,send:(command:Command)=>void,place:(id:number)=>void):void {
  for(const [id,label] of [['cell-uninstall','Désinstaller'],['cell-install','Réinstaller']]) {
    const button=document.createElement('button');button.id=id;button.textContent=label;button.className='secondary-action';button.hidden=true;
    button.onclick=()=>{
      const w=world(),c=cell();if(!w||!c)return;
      const selected=selectedFurniture(w,c,selection());
      const object=id==='cell-install'?selected.target:selected.object;
      if(!object)return;
      if(id==='cell-install')place(object.id);else send({type:'designate',kind:'uninstall',targetId:object.id,x:c.x,z:c.z});
    };
    panel.append(button);
  }
}
export function updateFurnitureControls(panel:HTMLElement,world:World,cell:Cell,selection:number):void {
  const {object,pack,target}=selectedFurniture(world,cell,selection);
  const busy=(id:number)=>world.jobs.some(j=>j.flick?.structureId===id||j.furniture?.structureId===id||j.deconstruction?.structureId===id);
  const uninstall=panel.querySelector<HTMLButtonElement>('#cell-uninstall')!;
  uninstall.hidden=!object||!minifiable(object.kind)||busy(object.id);uninstall.dataset.furnitureId=object?String(object.id):'';
  const install=panel.querySelector<HTMLButtonElement>('#cell-install')!;install.hidden=!target||!minifiable(target.kind)||busy(target.id);install.textContent=pack?'Installer':'Réinstaller';install.dataset.furnitureId=target?String(target.id):'';
}
