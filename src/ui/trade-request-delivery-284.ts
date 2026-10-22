import {quoteTradeRequestFulfill284} from '../sim/trade-request-fulfill-284';
import {tradeRequestContent284} from '../sim/trade-request-content-284';
import {ITEM_DEFINITIONS} from '../sim/items';
import {QUALITY_LABELS} from '../sim/equipment-rules';
import type {TradeRequestCommand284,TradeRequestQuote284} from '../sim/trade-request-state-284';
import type {GroupPanelSnapshot} from './group-panel';

/** Dedicated physical handover, independent of the trade/negotiator panel. */
export function createTradeRequestDelivery284(host:HTMLElement,options:{send(command:TradeRequestCommand284):Promise<boolean>;pause?:()=>Promise<unknown>}) {
 const abort=new AbortController(),section=document.createElement('section'),heading=document.createElement('h3'),description=document.createElement('p'),status=document.createElement('p'),preview=document.createElement('p'),error=document.createElement('p'),prepare=document.createElement('button'),confirm=document.createElement('button'),cancel=document.createElement('button');
 heading.textContent='Remplir la demande';prepare.type=confirm.type=cancel.type='button';prepare.textContent='Préparer la remise';confirm.textContent='Confirmer la remise';cancel.textContent='Annuler';
 section.dataset.tradeRequestDelivery284='';error.setAttribute('role','status');section.append(heading,description,status,preview,error,prepare,confirm,cancel);host.append(section);
 let snapshot:GroupPanelSnapshot|undefined,blocked:string|undefined,hardBlocked:string|undefined,shown:TradeRequestQuote284|undefined,busy=false,generation=0,requestId:number|undefined;
 function quote(){if(!snapshot?.group||requestId===undefined)return;return quoteTradeRequestFulfill284(snapshot.world,requestId,snapshot.group.id);}
 function paint(){
  const g=snapshot?.group,request=g&&'members'in g?snapshot?.world.tradeRequests284?.entries.find(q=>q.status==='accepted'&&q.tile===g.tile):undefined;
  section.hidden=!request;requestId=request?.id;if(!request)return;
  description.textContent=`${request.settlementName} demande ${request.quantity} ${tradeRequestContent284(request.family)?.label??request.family}.`;
  const current=quote();if(shown&&(!current?.ok||current.quote!==shown.quote)){shown=undefined;error.textContent='La situation a changé. Vérifiez à nouveau la remise.';}
  status.textContent=current?.ok?`${current.required} objets admissibles seront remis depuis les inventaires de cette caravane.`:current?.reason??'La caravane est indisponible.';
  prepare.disabled=busy||!!blocked||!current?.ok||!options.pause;confirm.hidden=cancel.hidden=!shown;confirm.disabled=busy||!!blocked||!shown;cancel.disabled=busy;
  if(shown){
   const reward=shown.rewards.map(p=>`${p.quantity} ${ITEM_DEFINITIONS[p.item].label}${p.quality?` (${QUALITY_LABELS[p.quality]})`:''}`).join(', '),option=request.options.find(o=>o.id===request.selectedOptionId)!;
   preview.textContent=`Récompense : ${[reward,option.goodwill?`relations +${option.goodwill}`:''].filter(Boolean).join(' ; ')}. Bonus de livraison : relations +12.${shown.mass.grams>shown.mass.capacityGrams?' La récompense surchargera la caravane ; allégez-la avant de reprendre la marche.':''}`;
  }else preview.textContent=options.pause?'La préparation met le jeu en pause pour vérifier les marchandises et la récompense.':'La pause du jeu est indisponible ; la remise ne peut pas être préparée.';
 }
 prepare.addEventListener('click',()=>{void(async()=>{
  if(busy||blocked)return;const token=generation;busy=true;error.textContent='';paint();
  try{if(!options.pause)throw Error('La pause du jeu est indisponible.');await options.pause();if(token!==generation)return;if(blocked)throw Error(blocked);const q=quote();if(!q?.ok)throw Error(q?.reason??'La demande est indisponible.');shown=q;}
  catch(cause){if(token===generation)error.textContent=cause instanceof Error?cause.message:String(cause);}
  finally{if(token===generation){busy=false;paint();}}
 })();},{signal:abort.signal});
 confirm.addEventListener('click',()=>{void(async()=>{
  if(busy||blocked||!shown||!snapshot?.group)return;const token=generation,q=quote(),captured=shown;
  if(!q?.ok||q.quote!==captured.quote){shown=undefined;error.textContent='La remise a changé. Vérifiez-la à nouveau.';paint();return;}
  busy=true;error.textContent='';paint();
  try{const accepted=await options.send({type:'trade-request-fulfill',requestId:captured.requestId,groupId:captured.groupId,quote:captured.quote,confirm:true});if(token===generation&&accepted)shown=undefined;}
  catch(cause){if(token===generation)error.textContent=cause instanceof Error?cause.message:String(cause);}
  finally{if(token===generation){busy=false;paint();}}
 })();},{signal:abort.signal});
 cancel.addEventListener('click',()=>{if(busy)return;shown=undefined;error.textContent='';paint();},{signal:abort.signal});
 return {
  // The parent's own pause/send ACK has a soft waiting lock. External host,
  // stopped or modal locks revoke consent even if they disappear before ACK.
  update(next:GroupPanelSnapshot|undefined,reason?:string,external=true){const hard=external?reason:undefined;if(snapshot?.group?.id!==next?.group?.id||hard&&hard!==hardBlocked){generation++;shown=undefined;busy=false;error.textContent='';}snapshot=next;blocked=reason;hardBlocked=hard;paint();},
  reset(){generation++;shown=undefined;snapshot=undefined;busy=false;error.textContent='';paint();},
  dispose(){generation++;abort.abort();section.remove();},
 };
}
