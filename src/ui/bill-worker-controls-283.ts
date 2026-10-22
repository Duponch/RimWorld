import {productionRecipeSkill283,readBillWorkerPolicy283,validBillWorkerPolicy283} from '../sim/bill-worker-rules-283';
import type {BillWorkerOption283,BillWorkerOptions283,BillWorkerPolicy283} from '../sim/bill-worker-state-283';
import type {CookingBill} from '../sim/cooking-types';
import type {Command} from '../sim/types';

export type BillWorkerOptionsReader283=(billId:number)=>Promise<BillWorkerOptions283>;
const skillLabels={cooking:'Cuisine',crafting:'Artisanat',artistic:'Artistique',intellectual:'Intellectuel'} as const;
const same=(a:Readonly<BillWorkerPolicy283>,b:Readonly<BillWorkerPolicy283>)=>a.pawnId===b.pawnId&&a.skillMin===b.skillMin&&a.skillMax===b.skillMax;

/** A separate draft: opening, fetching and confirmed snapshots send no command.
 * Choice metadata comes from the authority, never reconstructed local Pawns. */
export function billWorkerControls283(structureId:number,bill:CookingBill,send:(command:Command)=>void,readOptions?:BillWorkerOptionsReader283){
  const element=document.createElement('details'),heading=document.createElement('summary');
  element.dataset.billWorker=String(bill.id);element.hidden=true;heading.textContent='Exécutant';element.append(heading);
  const label=document.createElement('label'),choice=document.createElement('select');choice.dataset.billWorkerPawn=String(bill.id);label.append('Personne',choice);
  const range=document.createElement('div');range.dataset.billWorkerRange=String(bill.id);
  const minimum=document.createElement('input'),maximum=document.createElement('input');
  for(const [field,key,text] of [[minimum,'min','Niveau minimum'],[maximum,'max','Niveau maximum']] as const){
    field.type='number';field.min='0';field.max='20';field.step='1';field.dataset.billWorkerSkill=key;
    const row=document.createElement('label');row.append(text,field);range.append(row);
  }
  const rangeLabel=document.createElement('p');rangeLabel.className='muted';range.prepend(rangeLabel);
  const description=document.createElement('p');description.className='muted';description.dataset.billWorkerDescription=String(bill.id);
  const help=document.createElement('p');help.className='muted';help.textContent='Ce choix concerne les prochaines prises de travail. Les tâches et ordres déjà confirmés gardent leur engagement ; une nouvelle prise après interruption relit ce choix. Les minimums de la recette, les priorités et les accès restent nécessaires.';
  const status=document.createElement('p');status.dataset.billWorkerStatus=String(bill.id);status.setAttribute('role','status');
  const actions=document.createElement('div');actions.className='bill-actions';
  const apply=document.createElement('button'),cancel=document.createElement('button'),refresh=document.createElement('button');
  for(const button of [apply,cancel,refresh])button.type='button';
  apply.textContent='Appliquer l’exécutant';apply.dataset.applyBillWorker=String(bill.id);
  cancel.textContent='Annuler';cancel.dataset.cancelBillWorker=String(bill.id);
  refresh.textContent='Actualiser les personnes';refresh.dataset.refreshBillWorker=String(bill.id);
  actions.append(apply,cancel,refresh);element.append(label,range,description,help,status,actions);
  let confirmed={...readBillWorkerPolicy283(bill)},available=false,dirty=false,pending=false,loading=false,token=0;
  let metadata:BillWorkerOptions283|undefined,sent:BillWorkerPolicy283|undefined,feedback='';
  const skill=productionRecipeSkill283(bill.recipe);
  const value=():BillWorkerPolicy283=>({pawnId:choice.value===''?null:Number(choice.value),skillMin:minimum.value.trim()===''?NaN:Number(minimum.value),skillMax:maximum.value.trim()===''?NaN:Number(maximum.value)});
  const optionLabel=(option:BillWorkerOption283)=>`${option.name}${option.level===null?'':` · ${skill===null?'Niveau':skillLabels[skill]} ${option.level}`}${option.description?` · ${option.description}`:''}`;
  function rebuildChoices(selected=choice.value){
    const previous=[...choice.options].find(o=>o.value===selected)?.textContent;
    const any=document.createElement('option');any.value='';any.textContent='Toute personne admissible';
    const options=[any],seen=new Set<number>();
    for(const person of metadata?.candidates??[]){
      if(seen.has(person.pawnId))continue;seen.add(person.pawnId);
      const option=document.createElement('option');option.value=String(person.pawnId);option.textContent=optionLabel(person);option.disabled=!person.enabled;options.push(option);
    }
    for(const id of new Set([confirmed.pawnId,selected===''?null:Number(selected)]))if(id!==null&&!seen.has(id)){
      seen.add(id);const known=metadata?.selected?.pawnId===id?metadata.selected:undefined;
      const option=document.createElement('option');option.value=String(id);option.textContent=known?optionLabel(known):previous&&selected===String(id)?previous:'Personne confirmée absente de cette liste';
      // Only an existing confirmed reference can survive outside new choices.
      option.disabled=id!==confirmed.pawnId;options.push(option);
    }
    choice.replaceChildren(...options);choice.value=selected;
  }
  function restore(){minimum.value=String(confirmed.skillMin);maximum.value=String(confirmed.skillMax);rebuildChoices(confirmed.pawnId===null?'':String(confirmed.pawnId));dirty=false;}
  function render(){
    element.hidden=!available;
    const draft=value(),valid=validBillWorkerPolicy283(draft),locked=!available||pending||!!sent;
    const selectable=draft.pawnId===null||draft.pawnId===confirmed.pawnId||!!metadata?.candidates.some(p=>p.pawnId===draft.pawnId&&p.enabled);
    choice.disabled=locked;minimum.disabled=maximum.disabled=locked;
    range.hidden=skill===null||draft.pawnId!==null;
    rangeLabel.textContent=skill===null?'':`${skillLabels[skill]} · bornes inclusives de 0 à 20`;
    const person=metadata?.candidates.find(p=>p.pawnId===draft.pawnId)??(metadata?.selected?.pawnId===draft.pawnId?metadata.selected:undefined);
    description.textContent=draft.pawnId===null?skill===null?'Cette recette ne filtre aucune compétence.':'La plage choisie filtre la compétence de travail de cette recette.':`${person?.description??'Cette référence reste confirmée ; actualisez la liste pour connaître sa disponibilité.'} La plage mémorisée ne filtre pas une personne nommée ; les minimums de la recette restent requis.`;
    apply.disabled=locked||!dirty||!valid||!selectable;cancel.disabled=locked||!dirty;refresh.disabled=!available||loading||pending||!readOptions;
    status.textContent=!valid?'Choisissez des niveaux entiers de 0 à 20, avec minimum inférieur ou égal au maximum.':!selectable?'La personne du brouillon n’est plus un nouveau choix disponible. Choisissez une autre personne ou annulez.':sent?'Commande envoyée ; attente du choix confirmé.':feedback||(dirty?'Brouillon non appliqué.':'Choix confirmé.');
    element.setAttribute('aria-busy',String(loading||pending));
  }
  async function fetchOptions(){
    if(!available||!readOptions||loading)return;
    const current=++token,connected=element.isConnected;loading=true;render();
    try{
      const next=await readOptions(bill.id);
      if(current!==token||!available||connected&&!element.isConnected)return;
      if(next.structureId!==structureId||next.billId!==bill.id||next.skill!==skill){feedback='La liste reçue ne correspond plus à cette facture.';return;}
      metadata=next;rebuildChoices();feedback='';
    }catch(error){if(current===token&&available)feedback=error instanceof Error?error.message:String(error);}
    finally{if(current===token){loading=false;render();}}
  }
  function changed(){if(!available||pending||sent)return;dirty=!same(value(),confirmed);feedback='';render();}
  choice.addEventListener('change',changed);minimum.addEventListener('input',changed);minimum.addEventListener('change',changed);maximum.addEventListener('input',changed);maximum.addEventListener('change',changed);
  // These fields have their own apply/cancel; never dirty the general bill.
  element.addEventListener('input',event=>event.stopPropagation());element.addEventListener('change',event=>event.stopPropagation());
  element.addEventListener('keydown',event=>{if(event.key!=='Escape')event.stopPropagation();});
  element.addEventListener('toggle',()=>{if(element.open&&available)void fetchOptions();});
  choice.addEventListener('focus',()=>{if(!metadata)void fetchOptions();});
  refresh.onclick=()=>void fetchOptions();
  cancel.onclick=()=>{if(pending||sent)return;restore();feedback='Brouillon annulé. Le choix confirmé est conservé.';render();};
  apply.onclick=()=>{
    const policy=value();if(!available||pending||sent||!dirty||!validBillWorkerPolicy283(policy)||apply.disabled)return;
    sent={...policy};pending=true;feedback='';render();
    try{
      void Promise.resolve(send({type:'bill-worker-policy',structureId,billId:bill.id,policy})).catch(error=>{sent=undefined;feedback=error instanceof Error?error.message:String(error);}).finally(()=>{pending=false;render();});
    }catch(error){sent=undefined;pending=false;feedback=error instanceof Error?error.message:String(error);render();}
  };
  restore();render();
  return {element,sync(next:CookingBill,enabled:boolean){
    if(next.id!==bill.id||next.recipe!==bill.recipe)return;
    if(available&&!enabled){token++;loading=false;metadata=undefined;sent=undefined;pending=false;}
    available=enabled;confirmed={...readBillWorkerPolicy283(next)};
    if(sent&&same(sent,confirmed)){sent=undefined;restore();feedback='Exécutant confirmé. Les engagements déjà confirmés sont conservés.';}
    else if(!dirty&&!sent)restore();
    render();
  }};
}
