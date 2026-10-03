import { dismissTooltip,setTooltip } from './tooltip';
import './object-information.css';

export interface ObjectInformationRow {
  category:string;
  label:string;
  value:string;
  /** The caller supplies the real explanation and any available calculation. */
  description:string;
}
export interface ObjectInformationInput {
  title:string;
  description:string;
  rows:ReadonlyArray<ObjectInformationRow>;
}

/** Search is presentation-only: all fields came from the selected snapshot. */
export function filterObjectInformationRows(rows:ReadonlyArray<ObjectInformationRow>,query:string):ReadonlyArray<ObjectInformationRow> {
  const fold=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-FR');
  const words=fold(query).trim().split(/\s+/).filter(Boolean);
  return rows.filter(row=>{const text=fold(`${row.category} ${row.label} ${row.value} ${row.description}`);return words.every(word=>text.includes(word));});
}

interface InformationDialog {dialog:HTMLDialogElement;render:(input:ObjectInformationInput)=>void}
let information:InformationDialog|undefined;

function createInformationDialog():InformationDialog {
  const dialog=document.createElement('dialog');dialog.id='object-information';dialog.className='object-information';dialog.setAttribute('aria-labelledby','object-information-title');
  const heading=document.createElement('header');heading.className='object-information-heading';
  const title=document.createElement('h2');title.id='object-information-title';
  const close=document.createElement('button');close.type='button';close.className='object-information-close';close.textContent='×';close.setAttribute('aria-label','Fermer la fiche d’objet');close.onclick=()=>dialog.close();heading.append(title,close);
  const layout=document.createElement('div');layout.className='object-information-layout';
  const statistics=document.createElement('nav');statistics.className='object-information-statistics';statistics.setAttribute('aria-label','Statistiques de l’objet');
  const detail=document.createElement('section');detail.className='object-information-detail';detail.setAttribute('aria-labelledby','object-information-stat-title');
  const detailTitle=document.createElement('h3');detailTitle.id='object-information-stat-title';
  const explanation=document.createElement('p');explanation.id='object-information-explanation';detail.append(detailTitle,explanation);layout.append(statistics,detail);
  const footer=document.createElement('footer');footer.className='object-information-footer';
  const searchLabel=document.createElement('label');searchLabel.className='object-information-search';
  const search=document.createElement('input');search.type='search';search.id='object-information-search';search.placeholder='Rechercher';search.autofocus=true;search.setAttribute('aria-label','Rechercher une statistique');
  searchLabel.append('⌕',search);
  const finish=document.createElement('button');finish.type='button';finish.className='object-information-finish';finish.textContent='Fermer';finish.onclick=()=>dialog.close();footer.append(searchLabel,finish);
  dialog.append(heading,layout,footer);document.body.append(dialog);
  let current:ObjectInformationInput={title:'',description:'',rows:[]},selected:ObjectInformationRow|undefined;
  const showDescription=()=>{detailTitle.textContent='Description';explanation.textContent=current.description;};
  const select=(row:ObjectInformationRow,button:HTMLButtonElement)=>{
    selected=row;detailTitle.textContent=row.label;explanation.textContent=row.description;
    for(const entry of statistics.querySelectorAll<HTMLButtonElement>('button'))entry.setAttribute('aria-pressed',String(entry===button));
  };
  const rebuild=()=>{
    dismissTooltip();statistics.replaceChildren();
    const rows=filterObjectInformationRows(current.rows,search.value),categories=new Map<string,ObjectInformationRow[]>();
    for(const row of rows){const group=categories.get(row.category)??[];group.push(row);categories.set(row.category,group);}
    if(!rows.length){const empty=document.createElement('p');empty.className='object-information-empty';empty.textContent=search.value.trim()?'Aucune statistique correspondante.':'Aucune statistique disponible.';statistics.append(empty);}
    if(selected&&!rows.includes(selected)){selected=undefined;showDescription();}
    for(const [category,group] of categories){
      const section=document.createElement('section');section.className='object-information-category';
      const heading=document.createElement('h3');heading.textContent=category;section.append(heading);
      for(const row of group){
        const button=document.createElement('button');button.type='button';button.className='object-information-stat';button.setAttribute('aria-pressed',String(selected===row));
        const label=document.createElement('span');label.textContent=row.label;const value=document.createElement('span');value.textContent=row.value;value.className='object-information-stat-value';button.append(label,value);
        setTooltip(button,{title:row.label,body:row.description,rows:row.value?[{label:'Valeur actuelle',value:row.value}]:[]});
        button.onclick=()=>select(row,button);button.onpointerenter=()=>select(row,button);button.onfocus=()=>select(row,button);
        section.append(button);
      }
      statistics.append(section);
    }
  };
  search.oninput=rebuild;
  statistics.onkeydown=event=>{
    if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    const buttons=Array.from(statistics.querySelectorAll<HTMLButtonElement>('button')),index=buttons.indexOf(document.activeElement as HTMLButtonElement);if(index<0)return;
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(event.key==='ArrowUp'?-1:1)));buttons[next]?.focus();
  };
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dialog.close();}});
  dialog.addEventListener('close',dismissTooltip);
  return {dialog,render:input=>{
    current={title:input.title,description:input.description,rows:input.rows.map(row=>({...row}))};selected=undefined;title.textContent=input.title;search.value='';showDescription();rebuild();
  }};
}

/** A single reused native modal; simulation and commands remain with the caller.
 * Snapshot strings are displayed only via textContent, including formulas. */
export function openObjectInformation(input:ObjectInformationInput):void {
  dismissTooltip();
  information??=createInformationDialog();information.render(input);
  if(!information.dialog.open)information.dialog.showModal();
  information.dialog.querySelector<HTMLInputElement>('input')!.focus();
}
