import { isColonist } from '../sim/affiliation';
import { ALLOWED_AREA_LIMIT } from '../sim/allowed-area-state';
import { pictogramDataUrl } from './pictograms';
import type { AllowedAreaCommand, World } from '../sim/types';

export function allowedAreaLayout():string {
  return `<dialog id="allowed-area-dialog" class="allowed-area-dialog"><div class="panel-heading"><h2>Zones autorisées</h2><button id="allowed-area-close" aria-label="Fermer les zones autorisées">×</button></div>
    <p>Tracez les lieux où vos colons et les animaux concernés peuvent choisir leurs activités. Ils peuvent traverser le reste de la carte pour les rejoindre. Une zone vide équivaut à Sans restriction. Les animaux d’enclos gardent leur marqueur.</p>
    <div class="allowed-area-toolbar"><button id="allowed-area-new">Nouvelle zone</button><span id="allowed-area-count"></span></div>
    <div id="allowed-area-list" class="allowed-area-list"></div><p id="allowed-area-feedback" role="status"></p></dialog>`;
}
export function createAllowedAreaControls(root:HTMLElement,send:(command:AllowedAreaCommand)=>Promise<string|null>,paint:(id:number,enabled:boolean)=>void,show:(id:number|undefined)=>void) {
  const dialog=document.getElementById('allowed-area-dialog') as HTMLDialogElement;
  const list=document.getElementById('allowed-area-list')!;
  const feedback=document.getElementById('allowed-area-feedback')!;
  const newButton=document.getElementById('allowed-area-new') as HTMLButtonElement;
  const assignmentRows=new Map<number,HTMLSelectElement>();
  let world:World|undefined,listSignature='',choiceSignature='',pending=false,closingForPaint=false;
  const commit=async(command:AllowedAreaCommand)=>{
    if(pending)return;pending=true;dialog.setAttribute('aria-busy','true');
    try {const error=await send(command);feedback.textContent=error??'';root.querySelector<HTMLElement>('#assign-feedback')!.textContent=error??'';listSignature='';if(world)update(world);}
    finally {pending=false;dialog.removeAttribute('aria-busy');}
  };
  const open=()=>{if(!world)return;update(world);dialog.showModal();};
  const button=document.createElement('button');button.type='button';button.className='map-tool';button.dataset.allowedAreasOpen='';button.setAttribute('aria-label','Gérer les zones autorisées');button.title='Zones autorisées';
  const icon=document.createElement('span');icon.className='tool-icon';icon.style.backgroundImage=`url('${pictogramDataUrl('layers')}')`;icon.style.backgroundSize='contain';icon.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.textContent='Zones autorisées';button.append(icon,label);button.onclick=open;document.getElementById('zones-tools')!.append(button);
  const manage=document.createElement('button');manage.type='button';manage.textContent='Gérer les zones autorisées';manage.onclick=open;root.querySelector('.assignment-actions')!.append(manage);
  const table=root.querySelector('table')!;const heading=document.createElement('th');heading.textContent='Zone autorisée';table.querySelector('thead tr')!.insertBefore(heading,table.querySelector('thead th:last-child'));
  dialog.addEventListener('close',()=>{if(!closingForPaint)show(undefined);closingForPaint=false;});
  document.getElementById('allowed-area-close')!.onclick=()=>dialog.close();
  newButton.onclick=()=>void commit({type:'allowed-area-create'});
  function choices(select:HTMLSelectElement){
    select.replaceChildren(...[{id:0,label:'Illimité'},...(world?.allowedAreas??[])].map(area=>{const option=document.createElement('option');option.value=String(area.id);option.textContent=area.label;return option;}));
  }
  function update(next:World){
    world=next;
    const areas=next.allowedAreas??[];
    const optionsKey=areas.map(a=>`${a.id}:${a.label}`).join('|');
    if(!root.hidden){
      for(const pawn of next.pawns.filter(p=>isColonist(p)&&!p.prisoner)){
        const row=root.querySelector<HTMLTableRowElement>(`[data-assignment-pawn="${pawn.id}"]`);if(!row)continue;
        let select=assignmentRows.get(pawn.id);
        if(!select||!select.isConnected){
          select=document.createElement('select');select.dataset.allowedAreaPawn=String(pawn.id);select.setAttribute('aria-label',`Zone autorisée de ${pawn.name}`);
          select.onchange=()=>void commit({type:'assign-allowed-area',pawnId:pawn.id,areaId:Number(select!.value)||null});
          const cell=document.createElement('td');cell.className='assignment-area';cell.append(select);row.insertBefore(cell,row.lastElementChild);assignmentRows.set(pawn.id,select);choices(select);
        }
        if(optionsKey!==choiceSignature)choices(select);select.value=String(pawn.allowedAreaId??0);
        select.disabled=pawn.state==='dead'||!!(pawn.health?.death||pawn.visitor||pawn.raid||pawn.podRescue);
      }
      choiceSignature=optionsKey;
    }
    const signature=JSON.stringify(areas.map(a=>[a.id,a.label,a.color,a.cells.length]));
    if(signature===listSignature)return;listSignature=signature;
    newButton.disabled=areas.length>=ALLOWED_AREA_LIMIT;
    document.getElementById('allowed-area-count')!.textContent=`${areas.length} / ${ALLOWED_AREA_LIMIT} zones`;
    list.replaceChildren(...areas.map(area=>{
      const row=document.createElement('section');row.className='allowed-area-row';row.dataset.allowedAreaId=String(area.id);
      const name=document.createElement('input');name.value=area.label;name.maxLength=64;name.setAttribute('aria-label',`Nom de ${area.label}`);name.onchange=()=>void commit({type:'allowed-area-settings',areaId:area.id,label:name.value});
      const color=document.createElement('input');color.type='color';color.value=`#${area.color.toString(16).padStart(6,'0')}`;color.setAttribute('aria-label',`Couleur de ${area.label}`);color.onchange=()=>void commit({type:'allowed-area-settings',areaId:area.id,color:parseInt(color.value.slice(1),16)});
      const count=document.createElement('span');count.textContent=`${area.cells.length} case${area.cells.length===1?'':'s'}`;
      const actions=document.createElement('div');actions.className='allowed-area-row-actions';
      for(const [text,enabled]of [['Agrandir',true],['Réduire',false]] as const){const action=document.createElement('button');action.type='button';action.textContent=text;action.dataset.allowedAreaPaint=String(enabled);action.onclick=()=>{closingForPaint=true;dialog.close();paint(area.id,enabled);};actions.append(action);}
      const remove=document.createElement('button');remove.type='button';remove.textContent='Supprimer';remove.dataset.allowedAreaDelete='';remove.onclick=()=>void commit({type:'allowed-area-delete',areaId:area.id});actions.append(remove);
      row.onmouseenter=()=>{if(dialog.open)show(area.id);};row.onmouseleave=()=>{if(dialog.open)show(undefined);};row.addEventListener('focusin',()=>{if(dialog.open)show(area.id);});row.append(color,name,count,actions);return row;
    }));
  }
  return {update,open};
}
