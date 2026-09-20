import { isColonist } from '../sim/affiliation';
import { FILTH_DEFINITIONS } from '../sim/filth';
import type { Cell,Command,Pawn,World } from '../sim/types';

export function updateHygieneControls(panel:HTMLElement,world:World,cell:Cell|Pawn|undefined,send:(c:Command)=>void):void {
  let root=panel.querySelector<HTMLElement>('#hygiene-controls');
  if(!cell){if(root)root.hidden=true;return;}
  if(!root){root=document.createElement('section');root.id='hygiene-controls';root.className='hygiene-controls';
    const status=document.createElement('p');status.id='filth-description';root.append(status);
    const label=document.createElement('label');label.textContent='Nettoyer avec ';const choice=document.createElement('select');choice.id='cleaning-worker';label.append(choice);
    const button=document.createElement('button');button.id='clean-room';button.textContent='Nettoyer cette pièce';root.append(label,button);panel.append(root);
  }
  root.hidden='state' in cell&&cell.state==='dead';if(root.hidden)return;
  const filth=world.filth?.items.filter(f=>f.x===cell.x&&f.z===cell.z)??[];
  root.querySelector('#filth-description')!.textContent=filth.length?`Traces sur cette case : ${filth.map(f=>`${FILTH_DEFINITIONS[f.kind].label} ×${f.thickness}`).join(' · ')}`:'Aucune trace sur cette case.';
  const workers=world.pawns.filter(p=>isColonist(p)&&p.state!=='dead'&&p.state!=='downed'&&!p.prisoner),choice=root.querySelector<HTMLSelectElement>('#cleaning-worker')!;
  const key=workers.map(p=>`${p.id}:${p.name}`).join('|');
  if(choice.dataset.key!==key){const old=choice.value;choice.dataset.key=key;choice.replaceChildren(...workers.map(p=>{const o=document.createElement('option');o.value=String(p.id);o.textContent=p.name;return o;}));if(workers.some(p=>String(p.id)===old))choice.value=old;}
  if('id' in cell&&workers.some(p=>p.id===cell.id))choice.value=String(cell.id);
  const button=root.querySelector<HTMLButtonElement>('#clean-room')!;button.disabled=!choice.value;button.title='Ordre direct de Nettoyage ; les traces restent physiques jusqu’au travail. Le nettoyage automatique suit la zone de foyer.';
  button.onclick=()=>send({type:'clean-room',pawnId:Number(choice.value),x:cell.x,z:cell.z});
}
