import {ITEM_DEFINITIONS} from '../sim/items';
import {quoteMeetingTrade261,type MeetingTradeLine261} from '../sim/caravan-meeting-trade-261';
import type {CaravanCommand261} from '../sim/caravan-commands-261';
import type {World} from '../sim/types';
import type {CampaignSummary,CampaignGroupSummary,WorldGroupRecord} from '../sim/world-map-state';
import type {CaravanEncounterProgressMessage261} from '../bridge/protocol';
/** A true worker decision owns the pause. Closing a DOM panel cannot consume
 * the incident, invent an owner or resume its clock. All saved strings are text. */
export class CaravanEncounterDialog261 {
 readonly dialog=document.createElement('dialog');
 #state:World|CampaignSummary|undefined;#row:CampaignGroupSummary|undefined;
 #key='';#commerce=false;#busy=false;#progress:CaravanEncounterProgressMessage261|undefined;
 constructor(readonly send:(c:CaravanCommand261)=>Promise<unknown>){
  this.dialog.className='caravan-encounter-dialog';this.dialog.style.maxWidth='min(760px,92vw)';this.dialog.style.maxHeight='85vh';this.dialog.style.overflow='auto';
  this.dialog.addEventListener('cancel',event=>event.preventDefault());document.body.append(this.dialog);
 }
 update(state:World|CampaignSummary|undefined):void {
  this.#state=state;const rows=state&&('maps'in state?state.groups:state.campaignMap?.revision===2?state.campaignMap.groups:[]),row=rows?.find(r=>r.pending261);
  if(!row){this.#row=undefined;this.#key='';this.#progress=undefined;this.#commerce=false;if(this.dialog.open)this.dialog.close();return;}
  const key=JSON.stringify([row.id,row.pending261,row.state]);if(this.#row?.id!==row.id){this.#commerce=false;this.#progress=undefined;}
  this.#row=row;if(key!==this.#key){this.#key=key;this.render();}if(!this.dialog.open)this.dialog.showModal();
 }
 progress(message:CaravanEncounterProgressMessage261):void {if(message.groupId!==this.#row?.id)return;this.#progress=message;this.render();}
 private render():void {
  const row=this.#row,p=row?.pending261,state=this.#state;if(!row||!p||!state)return;
  this.dialog.replaceChildren();const title=document.createElement('h2');title.textContent=p.kind==='meeting'?'Rencontre de caravanes':p.kind==='demand'?'Demande de paiement':'Embuscade';this.dialog.append(title);
  const text=document.createElement('p');text.textContent=p.decision==='open'?'La caravane et ses interlocuteurs attendent votre décision. La simulation est en pause.':'Les mêmes voyageurs et adversaires préparent leur entrée sur le champ de bataille. La simulation est en pause.';this.dialog.append(text);
  if(p.kind==='demand'){
   const list=document.createElement('ul'),g=row.state;
   for(const line of p.demands){const li=document.createElement('li');let label='';
    if('members'in g){if(line.kind==='human')label=g.members.find(a=>a.id===line.id)?.name??`Personne ${line.id}`;
     else if(line.kind==='animal')label=g.animalOwners?.members.find(a=>a.id===line.id)?.species??`Animal ${line.id}`;
     else if(line.kind==='pile'){const pile=g.items.find(i=>i.id===line.id),holder=pile&&'pawnId'in pile.owner?pile.owner.pawnId:undefined,owner=g.members.find(a=>a.id===holder)?.name;label=`${line.quantity} ${pile?.item??'bien'}${owner?` · porté par ${owner}`:''}`;}
     else label=`Mobilier porté ${line.id}`;}
    li.textContent=label;list.append(li);
   }this.dialog.append(list);
  }
  const status=document.createElement('p');status.setAttribute('role','status');status.textContent=this.#progress?.reason??(this.#progress?.phase&&this.#progress.phase!=='complete'?`Préparation : ${this.#progress.phase}`:'');this.dialog.append(status);
  const button=(label:string,choice:'continue'|'give'|'attack'|'fight'|'retry')=>{const b=document.createElement('button');b.textContent=label;b.disabled=this.#busy;b.addEventListener('click',()=>void this.submit({type:'caravan-encounter-choice',groupId:row.id,choice}));this.dialog.append(b);};
  if(p.decision!=='open'){if(this.#progress?.phase==='refused')button('Réessayer cette entrée','retry');return;}
  if(p.kind==='meeting'){
   const b=document.createElement('button');b.textContent='Commerce';b.disabled=this.#busy;b.addEventListener('click',()=>{this.#commerce=!this.#commerce;this.render();});this.dialog.append(b);
   button('Attaquer','attack');button('Continuer','continue');if(this.#commerce)this.renderTrade(state,row,status);
  }else if(p.kind==='demand'){button('Donner','give');button('Combattre','fight');}
 }
 private renderTrade(state:World|CampaignSummary,row:CampaignGroupSummary,status:HTMLElement):void {
  const record:WorldGroupRecord={originMapId:row.originMapId,localMapId:row.localMapId,context:row.context,state:row.state,...row.encounters261?{encounters261:row.encounters261}:{},...row.pending261?{pending261:row.pending261}:{}};
  const q=quoteMeetingTrade261(state,record,[]);if(!q.ok){status.textContent=q.reason;return;}
  const inputs:{id:number;side:'buy'|'sell';input:HTMLInputElement}[]=[],table=document.createElement('table');
  const heading=document.createElement('caption');heading.textContent='Stocks réellement portés · quantité positive à acheter ou vendre';table.append(heading);
  for(const good of q.goods){const tr=document.createElement('tr'),label=document.createElement('td'),price=document.createElement('td'),cell=document.createElement('td'),input=document.createElement('input');
   label.textContent=`${good.side==='buy'?'Acheter':'Vendre'} ${ITEM_DEFINITIONS[good.item].label} · ${good.available} disponibles`;price.textContent=good.refusal??`${good.unitPrice} argent/unité`;
   input.type='number';input.min='0';input.max=String(good.available);input.step='1';input.value='0';input.disabled=!!good.refusal||this.#busy;input.setAttribute('aria-label',`${good.side==='buy'?'Acheter':'Vendre'} ${ITEM_DEFINITIONS[good.item].label}`);inputs.push({id:good.id,side:good.side,input});cell.append(input);tr.append(label,price,cell);table.append(tr);
  }
  const summary=document.createElement('p'),accept=document.createElement('input');accept.type='checkbox';const acceptLabel=document.createElement('label');acceptLabel.append(accept,document.createTextNode(' Accepter explicitement la part sans contrepartie si le marchand manque d’argent.'));
  const confirm=document.createElement('button');confirm.textContent='Confirmer le commerce';confirm.disabled=true;
  let lines:MeetingTradeLine261[]=[],signature='';
  const recalc=()=>{lines=inputs.filter(i=>Number(i.input.value)!==0).map(i=>({pileId:i.id,quantity:Number(i.input.value)*(i.side==='buy'?1:-1)}));const quote=quoteMeetingTrade261(state,record,lines);signature=quote.ok?quote.signature:'';summary.textContent=quote.ok?`Paiement : ${quote.paid} argent · part sans contrepartie : ${quote.forgone}`:quote.reason;confirm.disabled=this.#busy||!lines.length||!quote.ok||!!quote.forgone&&!accept.checked;};
  for(const i of inputs)i.input.addEventListener('input',recalc);accept.addEventListener('change',recalc);confirm.addEventListener('click',()=>void this.submit({type:'caravan-meeting-trade',groupId:row.id,lines,quote:signature,acceptShortfall:accept.checked}));this.dialog.append(table,summary,acceptLabel,confirm);recalc();
 }
 private async submit(c:CaravanCommand261):Promise<void>{if(this.#busy)return;this.#busy=true;this.render();try{await this.send(c);}catch(error){this.#progress={type:'caravan-encounter-progress',groupId:c.groupId,phase:'refused',reason:error instanceof Error?error.message:String(error)};}finally{this.#busy=false;this.#key='';this.render();}}
}
