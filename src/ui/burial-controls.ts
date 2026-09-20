import { isColonist } from '../sim/affiliation';
import { corpseStage } from '../sim/corpses';
import { footprintCells } from '../sim/definitions';
import type { Cell,Command,Pawn,World } from '../sim/types';

export function bodyDescription(world:World,pawn:Pawn):string {
  if(pawn.body?.lostAt!==undefined)return 'Décédé · dépouille détruite';
  const pile=world.piles.find(p=>p.id===pawn.body?.pileId);
  if(pile?.owner.type==='grave')return 'Décédé · inhumé dans une tombe';
  const stage=pile?` · ${{fresh:'dépouille fraîche',rotting:'dépouille en décomposition',desiccated:'dépouille desséchée'}[corpseStage(pile,world.tick)]}`:'';
  return pile?.owner.type==='pawn'?`Décédé · porté par ${world.pawns.find(p=>pile.owner.type==='pawn'&&p.id===pile.owner.pawnId)?.name??'un colon'}${stage}`:`Décédé · dépouille sur place${stage}`;
}

/** Controls follow the physical corpse/grave, never manufacture a body for an
 * empty assignment. All player names enter the page through textContent. */
export function updateBurialControls(panel:HTMLElement,world:World,selection:Cell|Pawn|undefined,send:(c:Command)=>void):void {
  let root=panel.querySelector<HTMLElement>('#burial-controls');
  const grave=selection&&world.structures.find(s=>s.kind==='grave'&&footprintCells(s).some(c=>c.x===selection.x&&c.z===selection.z));
  const selectedPawn=selection&&'state' in selection?selection:undefined;
  const pile=selection&&!selectedPawn?world.piles.find(p=>p.humanCorpse&&p.owner.type==='ground'&&p.owner.x===selection.x&&p.owner.z===selection.z):undefined;
  const body=selectedPawn?.state==='dead'?selectedPawn:pile?world.pawns.find(p=>p.id===pile.humanCorpse!.pawnId):undefined;
  if(!grave&&!body){if(root)root.hidden=true;return;}
  if(!root){root=document.createElement('section');root.id='burial-controls';root.className='burial-controls';panel.append(root);}
  root.hidden=false;
  const key=`${grave?.id??''}:${body?.id??''}:${world.pawns.filter(isColonist).map(p=>`${p.id}:${p.name}:${p.state==='dead'}`).join('|')}:${world.structures.filter(s=>s.kind==='grave').map(s=>s.id).join(',')}`;
  if(root.dataset.key!==key){
    root.dataset.key=key;root.replaceChildren();
    const title=document.createElement('h3');title.textContent=grave?'Sépulture':'Dépouille humaine';root.append(title);
    const status=document.createElement('p');status.dataset.burialStatus='';root.append(status);
    if(grave){
      for(const [kind,label] of [['colonists','Colons'],['strangers','Étrangers']] as const){const field=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.graveFilter=kind;field.append(input,` ${label}`);root.append(field);}
      const label=document.createElement('label');label.textContent='Attribuer la tombe ';const choice=document.createElement('select');choice.id='grave-assignment';
      const none=document.createElement('option');none.value='';none.textContent='Aucune attribution';choice.append(none);
      for(const p of world.pawns.filter(isColonist)){const option=document.createElement('option');option.value=String(p.id);option.textContent=p.name+(p.state==='dead'?' · décédé':'');choice.append(option);}
      label.append(choice);root.append(label);
    }
    if(body){
      const label=document.createElement('label');label.textContent='Porteur ';const choice=document.createElement('select');choice.id='burial-carrier';
      for(const p of world.pawns.filter(p=>isColonist(p)&&p.state!=='dead'&&p.state!=='downed'&&!p.prisoner)){const option=document.createElement('option');option.value=String(p.id);option.textContent=p.name;choice.append(option);}
      label.append(choice);root.append(label);
      const destination=document.createElement('label');destination.textContent='Tombe ';const target=document.createElement('select');target.id='burial-target';
      const automatic=document.createElement('option');automatic.value='';automatic.textContent='Disponible et compatible';target.append(automatic);
      for(const g of world.structures.filter(s=>s.kind==='grave')){const option=document.createElement('option');option.value=String(g.id);option.textContent=`Tombe ${g.x}, ${g.z}`;target.append(option);}
      destination.append(target);const button=document.createElement('button');button.id='bury-body';button.textContent='Inhumer';root.append(destination,button);
    }
  }
  if(grave){
    const stored=world.piles.find(p=>p.id===grave.grave?.corpseId),occupant=stored?.humanCorpse&&world.pawns.find(p=>p.id===stored.humanCorpse!.pawnId);
    root.querySelector('[data-burial-status]')!.textContent=occupant?`Tombe occupée · ${occupant.name}`:'Tombe vide · un corps · transport et inhumation par un colon';
    for(const input of root.querySelectorAll<HTMLInputElement>('[data-grave-filter]')){
      input.checked=!!grave.grave?.[input.dataset.graveFilter as 'colonists'|'strangers'];
      input.disabled=grave.grave?.corpseId!==undefined;
      input.onchange=()=>send({type:'grave-policy',graveId:grave.id,colonists:root!.querySelector<HTMLInputElement>('[data-grave-filter="colonists"]')!.checked,strangers:root!.querySelector<HTMLInputElement>('[data-grave-filter="strangers"]')!.checked});
    }
    const choice=root.querySelector<HTMLSelectElement>('#grave-assignment')!;
    choice.disabled=grave.grave?.corpseId!==undefined;
    if(document.activeElement!==choice)choice.value=grave.grave?.assignedPawnId===undefined?'':String(grave.grave.assignedPawnId);
    choice.onchange=()=>send({type:'assign-grave',graveId:grave.id,pawnId:choice.value?Number(choice.value):null});
  }
  if(body){
    root.querySelector('[data-burial-status]')!.textContent=`${body.name} · ${bodyDescription(world,body)}`;
    const choice=root.querySelector<HTMLSelectElement>('#burial-carrier')!,button=root.querySelector<HTMLButtonElement>('#bury-body')!;
    const actual=world.piles.find(p=>p.id===body.body?.pileId);
    button.disabled=!choice.value||body.body?.lostAt!==undefined||actual?.owner.type==='grave'||actual?.owner.type==='pawn';
    button.onclick=()=>{const target=root!.querySelector<HTMLSelectElement>('#burial-target')!.value;send({type:'order-bury',pawnId:Number(choice.value),bodyPawnId:body.id,...target?{graveId:Number(target)}:{}});};
  }
}
