import type { World } from '../sim/types';
import { animalSpecies } from '../sim/animal-species';
import { canTameSpecies } from '../sim/animal-handling';
import './world-panels.css';

const labels={idle:'Se repose',moving:'Se déplace',eating:'Mange',sleeping:'Dort',hungry:'Cherche à manger',downed:'À terre',dead:'Mort'};
interface FaunaRow { hunt:HTMLInputElement; tame?:HTMLInputElement; activity:HTMLElement; position:HTMLElement }
const faunaRows=new WeakMap<HTMLElement,Map<number,FaunaRow>>();

export function wildlifePanelScaffold():string {
  return `<button class="fauna-enable" data-fauna-enable>Introduire la faune dans cette ancienne partie</button>
    <div class="fauna-combat" role="group" aria-label="Ordres du colon mobilisé">
      <label for="fauna-target-choice">Cible</label><select id="fauna-target-choice" data-fauna-target-choice aria-label="Animal ciblé"></select>
      <button data-fauna-shoot>Tirer</button><button data-fauna-melee>Attaquer au contact</button>
      <small data-fauna-combat-hint>Sélectionnez un colon mobilisé pour donner un ordre de combat.</small>
    </div>
    <div class="fauna-list fauna-table-wrap" data-fauna-list></div>`;
}

export function updateWildlifePanel(root:HTMLElement,world:World,focus:(id:number)=>void,enable:()=>void,selected:readonly number[]=[],shoot?:(id:number)=>void,melee?:(id:number)=>void,hunt?:(id:number,enabled:boolean)=>void,tame?:(id:number,enabled:boolean)=>void):void {
  if(!root.querySelector('[data-fauna-list]')){
    root.innerHTML=wildlifePanelScaffold();
    root.querySelector<HTMLButtonElement>('[data-fauna-enable]')!.onclick=enable;
  }
  root.querySelector<HTMLButtonElement>('[data-fauna-enable]')!.hidden=world.wildlife!==undefined;
  const list=root.querySelector<HTMLElement>('[data-fauna-list]')!,animals=world.wildlife?.animals.filter(a=>!a.domestic)??[];
  const signature=animals.map(a=>`${a.id}:${a.species}`).join(',');
  if(list.dataset.ids!==signature){
    list.dataset.ids=signature;
    const rows=new Map<number,FaunaRow>();
    const table=document.createElement('table');table.className='fauna-table';
    table.innerHTML='<caption class="visually-hidden">Faune sauvage</caption><thead><tr><th scope="col">Chasse</th><th scope="col">Animal</th><th scope="col">Sexe</th><th scope="col">Activité</th><th scope="col">Position</th><th scope="col">Apprivoiser</th></tr></thead><tbody></tbody>';
    const body=table.tBodies[0]!;
    for(const a of animals){
      const row=body.insertRow();row.className='fauna-row';row.dataset.animal=String(a.id);
      const huntCell=row.insertCell(),huntLabel=document.createElement('label'),huntCheck=document.createElement('input');
      huntCheck.type='checkbox';huntCheck.dataset.animalHunt=String(a.id);huntCheck.setAttribute('aria-label',`Chasser ${animalSpecies(a.species).label} ${a.id}`);huntLabel.append(huntCheck);huntCell.append(huntLabel);
      const nameCell=row.insertCell(),name=document.createElement('button');name.className='fauna-focus';name.textContent=`${animalSpecies(a.species).label} ${a.id}`;name.setAttribute('aria-label',`Repérer ${animalSpecies(a.species).label} ${a.id}`);name.onclick=()=>focus(a.id);nameCell.append(name);
      row.insertCell().textContent=a.sex==='female'?'Femelle':'Mâle';
      const activity=row.insertCell();activity.dataset.animalActivity=String(a.id);
      const position=row.insertCell();position.dataset.animalPosition=String(a.id);position.className='fauna-position';
      const tameCell=row.insertCell();
      let tameCheck:HTMLInputElement|undefined;
      if(canTameSpecies(a.species)){
        const tameLabel=document.createElement('label');tameCheck=document.createElement('input');
        tameCheck.type='checkbox';tameCheck.dataset.animalTame=String(a.id);tameCheck.setAttribute('aria-label',`Apprivoiser ${animalSpecies(a.species).label} ${a.id}`);tameLabel.append(tameCheck);tameCell.append(tameLabel);
      } else tameCell.textContent='—';
      rows.set(a.id,{hunt:huntCheck,tame:tameCheck,activity,position});
    }
    list.replaceChildren(table);
    faunaRows.set(list,rows);
    const target=root.querySelector<HTMLSelectElement>('[data-fauna-target-choice]')!;
    target.replaceChildren(...animals.map(a=>{const option=document.createElement('option');option.value=String(a.id);option.textContent=`${animalSpecies(a.species).label} ${a.id}`;return option;}));
  }
  const rows=faunaRows.get(list),huntTargets=new Set(world.hunting?.targets??[]);
  for(const a of animals){
    const row=rows?.get(a.id);if(!row)continue;
    const checkbox=row.hunt;checkbox.checked=huntTargets.has(a.id);checkbox.disabled=a.state==='dead'||!hunt;checkbox.onchange=()=>hunt?.(a.id,checkbox.checked);
    const tameCheck=row.tame;
    if(tameCheck){tameCheck.checked=!!a.taming?.designated;tameCheck.disabled=a.state==='dead'||!tame;tameCheck.onchange=()=>tame?.(a.id,tameCheck.checked);}
    const state=a.state==='moving'&&!a.path.length&&!a.meal&&(!a.motion||a.motion.end<=world.tick)?'idle':a.state;
    row.activity.textContent=`${a.strike?'Riposte':a.threat?'Se défend':a.flee?'Fuit':a.exiting?'Quitte la carte faute de nourriture':labels[state]}${a.meal&&state==='moving'?' vers sa nourriture':''}`;
    row.position.textContent=`${a.x}, ${a.z}`;
  }
  const targetChoice=root.querySelector<HTMLSelectElement>('[data-fauna-target-choice]')!;
  const target=animals.find(a=>String(a.id)===(root.dataset.targetId??targetChoice.value)&&a.state!=='dead')??animals.find(a=>a.state!=='dead');
  root.dataset.targetId=target?String(target.id):'';
  targetChoice.value=root.dataset.targetId;
  targetChoice.disabled=!target;
  targetChoice.onchange=()=>{root.dataset.targetId=targetChoice.value;updateWildlifePanel(root,world,focus,enable,selected,shoot,melee,hunt,tame);};
  const ready=!!target&&selected.length>0&&selected.every(id=>world.pawns.some(p=>p.id===id&&p.draft&&p.state!=='downed'&&p.state!=='dead'));
  const shootButton=root.querySelector<HTMLButtonElement>('[data-fauna-shoot]')!,meleeButton=root.querySelector<HTMLButtonElement>('[data-fauna-melee]')!;
  shootButton.disabled=!ready||!shoot;meleeButton.disabled=!ready||!melee;
  shootButton.onclick=()=>{if(target)shoot?.(target.id);};meleeButton.onclick=()=>{if(target)melee?.(target.id);};
  root.querySelector('[data-fauna-combat-hint]')!.textContent=!target?'Aucun animal sauvage vivant.':ready?'Ordre direct pour le colon mobilisé sélectionné.':'Sélectionnez un colon mobilisé pour donner un ordre de combat.';
}
